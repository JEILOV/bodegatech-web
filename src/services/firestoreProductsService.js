import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { dbCloud } from './firebase'

/**
 * Busca en la colección remota `products` de Firestore un producto
 * por su código de barras. Permite aprovechar la "red colaborativa":
 * si OTRO bodeguero ya registró ese producto (nombre, categoría, precio,
 * imagen), no hace falta que este bodeguero lo vuelva a tipear desde cero.
 *
 * Requiere internet. Si falla (sin conexión, permisos, etc.) devuelve
 * `null` en vez de lanzar, para no romper la cascada de búsqueda local.
 *
 * @param {string} codigoBarras
 * @returns {Promise<{ nombre: string, categoria: string, precioVenta: number, imagen: string|null } | null>}
 */
export async function buscarProductoEnFirestorePorCodigo(codigoBarras) {
  if (!codigoBarras || codigoBarras.trim() === '') return null

  try {
    const consulta = query(
      collection(dbCloud, 'products'),
      where('codigoBarras', '==', codigoBarras.trim()),
      limit(1)
    )
    const resultado = await getDocs(consulta)
    if (resultado.empty) return null

    const datos = resultado.docs[0].data()
    return {
      nombre: datos.nombre || 'Producto sin nombre',
      categoria: datos.categoria || 'Abarrotes',
      precioVenta: Number(datos.precioVenta) || 0,
      imagen: datos.imagen || null,
    }
  } catch (error) {
    console.warn('No se pudo consultar Firestore por código de barras:', error)
    return null
  }
}

export default buscarProductoEnFirestorePorCodigo