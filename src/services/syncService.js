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
    const pendientes = await tablaLocal.where('synced').equals(false).toArray()

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