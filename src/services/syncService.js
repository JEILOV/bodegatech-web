import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../db/dexie'
import { dbCloud } from './firebase'

/**
 * MODELO CLOUD DIRECTO: Firestore es la única fuente de escritura de la
 * app (ver firestoreDataService.js). Este archivo YA NO sube nada: solo
 * mantiene Dexie como un caché de lectura ultrarrápida, alimentado en
 * tiempo real por `onSnapshot`. No existe cola de sincronización, ni
 * campo `synced`, ni estado "pendiente de subir": todo lo que hay en
 * Dexie es, por definición, un reflejo de lo que ya está confirmado en
 * Firestore.
 */
const TABLAS_CACHEADAS = [
  { tablaLocal: db.products, coleccionRemota: 'products' },
  { tablaLocal: db.sales, coleccionRemota: 'sales' },
  { tablaLocal: db.customers, coleccionRemota: 'customers' },
  { tablaLocal: db.movements, coleccionRemota: 'movements' },
]

/**
 * `codigoBarras` es el único campo con índice único (`&codigoBarras`) en
 * Dexie (ver db/dexie.js). Todo lo que vaya a escribirse en `products`
 * tiene que pasar por acá antes de tocar la tabla.
 */
function normalizarCodigoBarras(codigoBarras) {
  if (typeof codigoBarras !== 'string') return ''
  return codigoBarras.trim()
}

/**
 * Entre dos productos de la nube con el mismo codigoBarras, decide cuál
 * conservar. Preferimos el que tenga `actualizadoEn` más reciente; si
 * ninguno lo tiene, o solo uno lo tiene, ese criterio decide; en último
 * caso (ninguno tiene fecha) se conserva el primero que se vio, de forma
 * determinística.
 */
function elegirMasReciente(actual, candidato) {
  const fechaActual = actual.actualizadoEn ? Date.parse(actual.actualizadoEn) : NaN
  const fechaCandidato = candidato.actualizadoEn ? Date.parse(candidato.actualizadoEn) : NaN

  if (!Number.isNaN(fechaActual) && !Number.isNaN(fechaCandidato)) {
    return fechaCandidato > fechaActual ? candidato : actual
  }
  if (Number.isNaN(fechaActual) && !Number.isNaN(fechaCandidato)) return candidato
  return actual
}

/**
 * Sanea y deduplica un lote de productos venidos de Firestore ANTES de
 * tocar Dexie, para nunca violar la restricción única `&codigoBarras`:
 *
 * 1. `codigoBarras` vacío/nulo/no-string -> se reemplaza por un código
 *    sintético único (`SIN-CODIGO-<id del documento>`). No se descarta el
 *    producto: perderlo del catálogo es peor que mostrarlo sin código de
 *    barras escaneable, y el bodeguero puede corregirlo luego desde
 *    Inventario.
 * 2. Dos o más productos con el MISMO codigoBarras -> colisión real (dato
 *    corrupto/duplicado en la nube). Se conserva solo el más reciente
 *    (`elegirMasReciente`) y se deja constancia en consola de cuáles se
 *    descartaron, para que alguien pueda revisar/limpiar esos documentos
 *    directamente en Firestore si hace falta.
 */
function sanearProductosParaDexie(productos) {
  const porCodigo = new Map()

  for (const producto of productos) {
    const codigo = normalizarCodigoBarras(producto.codigoBarras)
    const codigoFinal = codigo || `SIN-CODIGO-${producto.id}`
    const productoSaneado = { ...producto, codigoBarras: codigoFinal }

    const existente = porCodigo.get(codigoFinal)
    if (!existente) {
      porCodigo.set(codigoFinal, productoSaneado)
      continue
    }

    const ganador = elegirMasReciente(existente, productoSaneado)
    const perdedor = ganador === existente ? productoSaneado : existente
    console.warn(
      `[sync] Producto con codigoBarras duplicado "${codigoFinal}": se conserva ` +
        `"${ganador.id}" y se descarta "${perdedor.id}" (revisar en Firestore).`
    )
    porCodigo.set(codigoFinal, ganador)
  }

  return Array.from(porCodigo.values())
}

/**
 * Saneadores por colección remota. Por ahora solo `products` tiene un
 * índice único que sanear; el resto de tablas pasa tal cual.
 */
const SANEADORES_POR_COLECCION = {
  products: sanearProductosParaDexie,
}

function sanearRegistros(coleccionRemota, registros) {
  const saneador = SANEADORES_POR_COLECCION[coleccionRemota]
  return saneador ? saneador(registros) : registros
}

/**
 * Escribe un lote en Dexie con `bulkPut`, pero de forma resiliente: si
 * ALGÚN registro sigue violando una restricción única (por ejemplo, un
 * duplicado que se nos escapó del saneo), Dexie lanza un
 * `Dexie.BulkError` que, sin manejar, tira abajo el resto de la
 * escritura y ensucia la consola con el stack completo.
 *
 * Acá lo atrapamos, y para cada registro que falló lo reintentamos con
 * un `put()` individual; si vuelve a fallar, se descarta ese registro
 * puntual (se loguea) sin afectar a los demás ni relanzar la excepción.
 */
async function escribirEnLoteConResiliencia(tablaLocal, registros) {
  if (registros.length === 0) return

  try {
    await tablaLocal.bulkPut(registros)
  } catch (error) {
    if (error.name !== 'BulkError') throw error

    const indicesFallidos = Object.keys(error.failures || {}).map(Number)
    console.warn(
      `[sync] bulkPut() tuvo ${indicesFallidos.length} fallas en "${tablaLocal.name}"; ` +
        'reintentando esos registros de forma individual:',
      error.failures
    )

    for (const indice of indicesFallidos) {
      const registro = registros[indice]
      if (!registro) continue

      try {
        await tablaLocal.put(registro)
      } catch (errorIndividual) {
        console.error(
          `[sync] Se descarta el registro "${registro.id}" de "${tablaLocal.name}": sigue ` +
            'violando una restricción única incluso después del saneo.',
          errorIndividual
        )
      }
    }
  }
}

/**
 * Aplica el PRIMER snapshot de una colección como un reemplazo atómico y
 * completo de la tabla local: se vacía por completo (`clear()`) y se
 * reescribe con lo que hay en Firestore en ese momento. Como Dexie ya no
 * origina ninguna escritura propia (modelo Cloud Directo), no existe
 * ningún registro "pendiente" que preservar: todo lo local es
 * prescindible y se puede reconstruir 1:1 desde la nube sin perder nada.
 * Esto también evita de raíz cualquier ConstraintError contra el índice
 * único `&codigoBarras` por residuos de una carga anterior.
 *
 * Todo ocurre dentro de una única transacción de Dexie, así la UI (vía
 * useLiveQuery) nunca ve un estado a medio sincronizar.
 *
 * Antes de escribir, el lote pasa por `sanearRegistros` (deduplica
 * `codigoBarras` en products) y luego por `escribirEnLoteConResiliencia`
 * (nunca deja un `Dexie.BulkError` sin manejar).
 */
async function reemplazarTablaDeFormaAtomica(tablaLocal, coleccionRemota, snapshot) {
  await db.transaction('rw', tablaLocal, async () => {
    await tablaLocal.clear()

    const registrosCrudos = snapshot.docs.map((documento) => ({
      ...documento.data(),
      id: documento.id,
    }))

    const registrosParaEscribir = sanearRegistros(coleccionRemota, registrosCrudos)
    await escribirEnLoteConResiliencia(tablaLocal, registrosParaEscribir)
  }).catch((error) => {
    console.error(`[sync] Error en el reemplazo atómico inicial de "${coleccionRemota}":`, error)
    throw error
  })
}

/**
 * Cloud-first en tiempo real: suscribe products, sales, customers y
 * movements a `onSnapshot`. El PRIMER snapshot de cada colección se
 * aplica con `reemplazarTablaDeFormaAtomica` (ver arriba): así, si la
 * nube tiene documentos, la tabla local queda sincronizada de forma
 * atómica ANTES de que `listoParaUsar` se resuelva y App.jsx quite la
 * pantalla de carga. Los snapshots siguientes son cambios en vivo y se
 * aplican de forma incremental con `docChanges()`.
 *
 * Cada página ya usa `useLiveQuery`, así que la UI se actualiza sola en
 * cuanto Dexie cambia — sin recargar, sin navegar a otra pantalla.
 *
 * @returns {{ cancelarTodo: () => void, listoParaUsar: Promise<void[]> }}
 */
export function iniciarSincronizacionEnTiempoReal() {
  const cancelaciones = []
  const primerasCargas = []

  for (const { tablaLocal, coleccionRemota } of TABLAS_CACHEADAS) {
    let resolverPrimeraCarga
    primerasCargas.push(
      new Promise((resolve) => {
        resolverPrimeraCarga = resolve
      })
    )

    let primeraCargaAplicada = false

    const cancelar = onSnapshot(
      collection(dbCloud, coleccionRemota),
      async (snapshot) => {
        try {
          if (!primeraCargaAplicada) {
            // Carga inicial: reemplazo atómico completo, sea el snapshot
            // de red o el que ya trae el caché local persistente de
            // Firestore (ver firebase.js) al recargar la página.
            await reemplazarTablaDeFormaAtomica(tablaLocal, coleccionRemota, snapshot)
            primeraCargaAplicada = true
          } else {
            // Actualizaciones en vivo posteriores: aplicar solo lo que
            // cambió. Un solo `put()` no puede desatar un BulkError (ese
            // solo existe para operaciones en lote), pero SÍ puede fallar
            // con un ConstraintError normal si, por ejemplo, este cambio
            // trae un codigoBarras que ya usa otro producto existente.
            // Lo saneamos igual y envolvemos el put en try/catch para no
            // dejar caer todo el snapshot por un solo registro corrupto.
            for (const cambio of snapshot.docChanges()) {
              if (cambio.type === 'removed') {
                await tablaLocal.delete(cambio.doc.id)
                continue
              }

              const [registroRemoto] = sanearRegistros(coleccionRemota, [
                { ...cambio.doc.data(), id: cambio.doc.id },
              ])

              try {
                await tablaLocal.put(registroRemoto)
              } catch (errorPut) {
                console.error(
                  `[sync] No se pudo aplicar el cambio en tiempo real del registro ` +
                    `"${registroRemoto.id}" de "${coleccionRemota}" (posible codigoBarras ` +
                    'duplicado contra otro producto ya guardado):',
                  errorPut
                )
              }
            }
          }
        } catch (error) {
          console.error(
            `[sync] Error aplicando snapshot en tiempo real de "${coleccionRemota}":`,
            error
          )
        }

        resolverPrimeraCarga()
      },
      (error) => {
        console.error(`[sync] Listener de "${coleccionRemota}" falló:`, error)
        // No bloqueamos el arranque de la app si un listener falla (ej. sin internet).
        resolverPrimeraCarga()
      }
    )

    cancelaciones.push(cancelar)
  }

  return {
    cancelarTodo: () => cancelaciones.forEach((cancelar) => cancelar()),
    listoParaUsar: Promise.all(primerasCargas),
  }
}

export default iniciarSincronizacionEnTiempoReal