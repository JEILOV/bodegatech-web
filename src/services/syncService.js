import { doc, setDoc } from 'firebase/firestore'
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

export default sincronizarDatosLocales