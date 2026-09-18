// firestoreProductsService.js
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore'
import { dbCloud } from './firebase'

function mapearDocumentoACatalogo(datos) {
  return {
    nombre: datos.nombre || 'Producto sin nombre',
    categoria: datos.categoria || 'Abarrotes',
    precioVenta: Number(datos.precioVenta) || 0,
    imagen: datos.imagen || null,
  }
}

/**
 * Busca en la colección colaborativa `masterCatalog` de Firestore un
 * producto por su código de barras. Es la "red colaborativa": si OTRO
 * bodeguero ya aportó ese código (nombre, categoría, imagen), este
 * bodeguero no tiene que tipearlo desde cero.
 *
 * El documento usa el propio código de barras como id (ver
 * `aportarAlCatalogoGlobal`), así que primero se intenta una lectura
 * directa por id (más barata que una query) y, como red de seguridad
 * ante datos legados que no sigan esa convención, se hace un fallback
 * con `where('codigoBarras', '==', ...)`.
 *
 * Requiere internet. Si falla (sin conexión, permisos, etc.) devuelve
 * `null` en vez de lanzar, para no romper la cascada de búsqueda local.
 *
 * @param {string} codigoBarras
 * @returns {Promise<{ nombre: string, categoria: string, precioVenta: number, imagen: string|null } | null>}
 */
export async function buscarProductoEnFirestorePorCodigo(codigoBarras) {
  if (!codigoBarras || codigoBarras.trim() === '') return null
  const codigo = codigoBarras.trim()

  try {
    // 1) Lectura directa por id: el id del documento ES el código de barras.
    const referenciaDocumento = doc(dbCloud, 'masterCatalog', codigo)
    const snapshotDirecto = await getDoc(referenciaDocumento)
    if (snapshotDirecto.exists()) {
      return mapearDocumentoACatalogo(snapshotDirecto.data())
    }

    // 2) Fallback por si algún documento antiguo no usa el código como id.
    const consulta = query(
      collection(dbCloud, 'masterCatalog'),
      where('codigoBarras', '==', codigo),
      limit(1)
    )
    const resultado = await getDocs(consulta)
    if (resultado.empty) return null

    return mapearDocumentoACatalogo(resultado.docs[0].data())
  } catch (error) {
    console.warn('No se pudo consultar Firestore por código de barras:', error)
    return null
  }
}

/**
 * Aporta (o completa) un producto en el catálogo colaborativo global
 * `masterCatalog`, para que otros bodegueros que escaneen el mismo
 * código de barras lo encuentren autocompletado.
 *
 * No pisa datos ya existentes salvo que falten (nombre, categoría o
 * imagen vacíos): así un aporte más pobre —por ejemplo sin foto— no
 * degrada un registro previo más completo hecho por otro bodeguero.
 *
 * Es "mejor esfuerzo": nunca lanza. Se invoca de forma asíncrona
 * después de guardar el producto en la bodega del usuario y no debe
 * bloquear ni hacer fallar esa operación principal.
 *
 * @param {string} codigoBarras
 * @param {string} nombre
 * @param {string} categoria
 * @param {string|null} [imagenUrl]
 */
export async function aportarAlCatalogoGlobal(codigoBarras, nombre, categoria, imagenUrl = null) {
  if (!codigoBarras || codigoBarras.trim() === '') return
  const codigo = codigoBarras.trim()

  try {
    const referenciaDocumento = doc(dbCloud, 'masterCatalog', codigo)
    const snapshotExistente = await getDoc(referenciaDocumento)

    if (snapshotExistente.exists()) {
      const datosExistentes = snapshotExistente.data()
      const faltaNombre = !datosExistentes.nombre
      const faltaCategoria = !datosExistentes.categoria
      const faltaImagen = !datosExistentes.imagen && !!imagenUrl

      // Ya existe y está completo: no lo pisamos.
      if (!faltaNombre && !faltaCategoria && !faltaImagen) return

      await setDoc(
        referenciaDocumento,
        {
          codigoBarras: codigo,
          nombre: faltaNombre ? nombre : datosExistentes.nombre,
          categoria: faltaCategoria ? categoria : datosExistentes.categoria,
          imagen: faltaImagen ? imagenUrl : datosExistentes.imagen || null,
        },
        { merge: true }
      )
      return
    }

    // No existe todavía: lo creamos con lo que tengamos.
    await setDoc(referenciaDocumento, {
      codigoBarras: codigo,
      nombre: nombre || '',
      categoria: categoria || 'Abarrotes',
      imagen: imagenUrl || null,
    })
  } catch (error) {
    // Mejor esfuerzo: si falla (sin internet, permisos, etc.) no debe
    // afectar el flujo principal de guardado del producto.
    console.warn('No se pudo aportar al catálogo global:', error)
  }
}

export default buscarProductoEnFirestorePorCodigo