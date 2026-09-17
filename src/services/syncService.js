import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../db/dexie'
import { dbCloud } from './firebase'

/**
 * Mapa de tablas locales (Dexie) a colecciones remotas (Firestore).
 * Mantenerlo centralizado evita errores de "copiar y pegar" el nombre
 * de la colección al agregar una tabla nueva en el futuro.
 */
const TABLAS_SINCRONIZABLES = [
  { tablaLocal: db.products, coleccionRemota: 'products' },
  { tablaLocal: db.sales, coleccionRemota: 'sales' },
  { tablaLocal: db.customers, coleccionRemota: 'customers' },
  { tablaLocal: db.movements, coleccionRemota: 'movements' },
]

/**
 * Obtiene los registros pendientes (synced === false) de una tabla.
 *
 * IMPORTANTE: no usamos `.where('synced').equals(false)` porque IndexedDB
 * (versión previa a la 2ª edición del spec) no soporta booleanos como
 * claves de índice, y algunos navegadores (Safari/iOS, versiones antiguas
 * de Chrome/Android) lanzan un DexieError al evaluarlo. En vez de eso,
 * recorremos la tabla completa con `.filter()`, que no toca el índice
 * y funciona igual en todos los navegadores. Para el volumen de datos
 * de una bodega (cientos, no millones de registros) el costo es mínimo.
 */
async function obtenerPendientes(tablaLocal) {
  return tablaLocal.filter((registro) => registro.synced === false).toArray()
}

/**
 * Busca en Dexie todos los registros pendientes (synced === false)
 * en products, sales, customers y movements; los sube a Firestore
 * y, tras confirmar cada escritura, los marca como synced: true en local.
 *
 * Segura de llamar repetidamente: si no hay conexión o falla un registro,
 * simplemente queda pendiente para el siguiente intento.
 */
export async function sincronizarDatosLocales() {
  let totalSincronizados = 0
  let totalFallidos = 0

  for (const { tablaLocal, coleccionRemota } of TABLAS_SINCRONIZABLES) {
    const pendientes = await obtenerPendientes(tablaLocal)

    for (const registro of pendientes) {
      try {
        // Se sube el registro tal cual, sin el campo 'synced' local
        const { synced, ...datosParaSubir } = registro

        await setDoc(doc(dbCloud, coleccionRemota, String(registro.id)), {
          ...datosParaSubir,
          actualizadoEn: new Date().toISOString(),
        })

        await tablaLocal.update(registro.id, { synced: true })
        totalSincronizados += 1
      } catch (error) {
        console.warn(
          `[sync] No se pudo sincronizar el registro ${registro.id} de "${coleccionRemota}":`,
          error
        )
        totalFallidos += 1
      }
    }
  }

  if (totalSincronizados > 0 || totalFallidos > 0) {
    console.log(
      `[sync] Sincronización completada: ${totalSincronizados} subidos, ${totalFallidos} pendientes.`
    )
  }

  return { totalSincronizados, totalFallidos }
}

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
 * conservar. Preferimos el que tenga `actualizadoEn` más reciente (lo
 * escribe syncService al subir cambios); si ninguno lo tiene, o solo uno
 * lo tiene, ese criterio decide; en último caso (ninguno tiene fecha) se
 * conserva el primero que se vio, de forma determinística.
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
 * duplicado que se nos escapó del saneo, o una colisión contra un
 * registro que YA existía en Dexie antes de este snapshot), Dexie lanza
 * un `Dexie.BulkError` que, sin manejar, tira abajo el resto de la
 * escritura y ensucia la consola con el stack completo.
 *
 * Acá lo atrapamos, y para cada registro que falló lo reintentamos con
 * un `put()` individual; si vuelve a fallar, se descarta ese registro
 * puntual (se loguea) sin afectar a los demás ni relanzar la excepción.
 * Así el conteo final en Dexie queda igual al de los productos válidos
 * de la nube, y jamás vuelve a aparecer un BulkError sin manejar en
 * consola.
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
 * completo de la tabla local: si Firestore tiene documentos, la tabla de
 * Dexie queda exactamente igual a la nube (ni un registro viejo/huérfano
 * se queda atrás). Todo ocurre dentro de una única transacción de Dexie,
 * así la UI (vía useLiveQuery) nunca ve un estado a medio sincronizar
 * (por ejemplo, un instante con clientes pero sin sus ventas).
 *
 * Se respetan los registros locales con una edición pendiente de subir
 * (`synced: false`): esos no se tocan, para no perder un abono o una
 * venta hecha offline que todavía no llegó a Firestore.
 *
 * Antes de escribir, cada lote pasa por `sanearRegistros` (deduplica
 * `codigoBarras` en products) y luego por `escribirEnLoteConResiliencia`
 * (nunca deja un `Dexie.BulkError` sin manejar).
 */
async function reemplazarTablaDeFormaAtomica(tablaLocal, coleccionRemota, snapshot) {
  await db.transaction('rw', tablaLocal, async () => {
    const registrosLocales = await tablaLocal.toArray()
    const idsPendientes = new Set(
      registrosLocales.filter((registro) => registro.synced === false).map((r) => r.id)
    )

    const idsRemotos = new Set()
    const registrosCrudos = []

    for (const documento of snapshot.docs) {
      idsRemotos.add(documento.id)
      if (idsPendientes.has(documento.id)) {
        // Edición local sin subir todavía: la nube probablemente está
        // desactualizada respecto a este registro. La dejamos tal cual.
        continue
      }
      registrosCrudos.push({ ...documento.data(), id: documento.id, synced: true })
    }

    const registrosParaEscribir = sanearRegistros(coleccionRemota, registrosCrudos)
    await escribirEnLoteConResiliencia(tablaLocal, registrosParaEscribir)

    // Cualquier registro local YA sincronizado que ya no exista en la
    // nube (borrado desde otro dispositivo mientras este estaba
    // desconectado) se elimina para que ambos lados queden idénticos.
    const idsAEliminar = registrosLocales
      .filter((registro) => registro.synced !== false && !idsRemotos.has(registro.id))
      .map((registro) => registro.id)

    if (idsAEliminar.length > 0) {
      await tablaLocal.bulkDelete(idsAEliminar)
    }
  }).catch((error) => {
    console.error(`[sync] Error en el reemplazo atómico inicial de "${coleccionRemota}":`, error)
    throw error
  })
}

/**
 * Cloud-first en tiempo real: suscribe products, sales, customers y
 * movements a `onSnapshot`. El PRIMER snapshot de cada colección se
 * aplica con `reemplazarTablaDeFormaAtomica` (ver arriba): así cumplimos
 * que, si la nube tiene documentos, la tabla local quede sincronizada de
 * forma atómica ANTES de que `listoParaUsar` se resuelva y App.jsx quite
 * la pantalla de carga. Los snapshots siguientes son cambios en vivo y se
 * aplican de forma incremental con `docChanges()` — no hace falta
 * reescribir toda la tabla en cada actualización.
 *
 * Cada página ya usa `useLiveQuery`, así que la UI se actualiza sola en
 * cuanto Dexie cambia — sin recargar, sin navegar a otra pantalla.
 *
 * Salvaguarda de conflictos: si un registro local tiene una edición
 * pendiente de subir (`synced: false`, por ejemplo un abono hecho offline
 * que todavía no llegó a Firestore), NO lo pisamos con la versión remota
 * -probablemente más vieja-. Dejamos que `sincronizarDatosLocales` la suba
 * y que este mismo listener la confirme después con `synced: true`.
 *
 * @returns {{ cancelarTodo: () => void, listoParaUsar: Promise<void[]> }}
 */
export function iniciarSincronizacionEnTiempoReal() {
  const cancelaciones = []
  const primerasCargas = []

  for (const { tablaLocal, coleccionRemota } of TABLAS_SINCRONIZABLES) {
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
                { ...cambio.doc.data(), id: cambio.doc.id, synced: true },
              ])

              const registroLocal = await tablaLocal.get(cambio.doc.id)

              if (registroLocal && registroLocal.synced === false) {
                // Hay una edición local pendiente de subir: no la pisamos.
                continue
              }

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

export default sincronizarDatosLocales