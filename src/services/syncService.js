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
 * Cloud-first en tiempo real: suscribe products, sales, customers y
 * movements a `onSnapshot`. El PRIMER snapshot de cada colección ya trae
 * el estado completo actual de Firestore (esa es nuestra "carga inicial
 * obligatoria"); los snapshots siguientes son los cambios en vivo, así que
 * no hace falta un `getDocs` aparte que podría desincronizarse del propio
 * listener.
 *
 * Cada cambio remoto se aplica a Dexie con `put`/`delete`. Cada página ya
 * usa `useLiveQuery`, así que la UI se actualiza sola en cuanto Dexie
 * cambia — sin recargar, sin navegar a otra pantalla.
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

    const cancelar = onSnapshot(
      collection(dbCloud, coleccionRemota),
      async (snapshot) => {
        for (const cambio of snapshot.docChanges()) {
          try {
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
          } catch (error) {
            console.error(
              `[sync] Error aplicando cambio en tiempo real de "${coleccionRemota}":`,
              error
            )
          }
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