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
 */
async function reemplazarTablaDeFormaAtomica(tablaLocal, coleccionRemota, snapshot) {
  await db.transaction('rw', tablaLocal, async () => {
    const registrosLocales = await tablaLocal.toArray()
    const idsPendientes = new Set(
      registrosLocales.filter((registro) => registro.synced === false).map((r) => r.id)
    )

    const idsRemotos = new Set()
    const registrosParaEscribir = []

    for (const documento of snapshot.docs) {
      idsRemotos.add(documento.id)
      if (idsPendientes.has(documento.id)) {
        // Edición local sin subir todavía: la nube probablemente está
        // desactualizada respecto a este registro. La dejamos tal cual.
        continue
      }
      registrosParaEscribir.push({ ...documento.data(), id: documento.id, synced: true })
    }

    if (registrosParaEscribir.length > 0) {
      await tablaLocal.bulkPut(registrosParaEscribir)
    }

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
            // Actualizaciones en vivo posteriores: aplicar solo lo que cambió.
            for (const cambio of snapshot.docChanges()) {
              if (cambio.type === 'removed') {
                await tablaLocal.delete(cambio.doc.id)
                continue
              }

              const registroRemoto = { ...cambio.doc.data(), id: cambio.doc.id, synced: true }
              const registroLocal = await tablaLocal.get(cambio.doc.id)

              if (registroLocal && registroLocal.synced === false) {
                // Hay una edición local pendiente de subir: no la pisamos.
                continue
              }

              await tablaLocal.put(registroRemoto)
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