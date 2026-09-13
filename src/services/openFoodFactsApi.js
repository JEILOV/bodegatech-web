const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org/api/v0/product'
const TIMEOUT_MS = 6000

/**
 * Consulta la API pública de Open Food Facts por código de barras.
 * Devuelve un objeto listo para precargar el formulario de nuevo producto,
 * o `null` si el producto no existe, la respuesta es inválida o falla la conexión.
 *
 * @param {string} codigoBarras
 * @returns {Promise<{ nombre: string, categoria: string, imagen: string|null, codigoBarras: string } | null>}
 */
export async function buscarProductoPorCodigo(codigoBarras) {
  if (!codigoBarras || codigoBarras.trim() === '') return null

  const controlador = new AbortController()
  const idTimeout = setTimeout(() => controlador.abort(), TIMEOUT_MS)

  try {
    const respuesta = await fetch(
      `${OPEN_FOOD_FACTS_BASE_URL}/${codigoBarras.trim()}.json`,
      { signal: controlador.signal }
    )

    if (!respuesta.ok) {
      return null
    }

    const datos = await respuesta.json()

    // status === 0 significa que Open Food Facts no encontró el producto
    if (!datos || datos.status !== 1 || !datos.product) {
      return null
    }

    const producto = datos.product

    const nombre =
      producto.product_name_es?.trim() ||
      producto.product_name?.trim() ||
      'Producto sin nombre'

    const categoria =
      producto.categories_tags?.[0]
        ?.replace('en:', '')
        ?.replace('es:', '')
        ?.replaceAll('-', ' ')
        ?.trim() || 'Abarrotes'

    const imagen = producto.image_front_url || producto.image_url || null

    return {
      nombre,
      categoria: capitalizarPrimeraLetra(categoria),
      imagen,
      codigoBarras: codigoBarras.trim(),
    }
  } catch (error) {
    // Incluye errores de red, timeout (AbortError) y JSON inválido
    console.warn('No se pudo consultar Open Food Facts:', error)
    return null
  } finally {
    clearTimeout(idTimeout)
  }
}

function capitalizarPrimeraLetra(texto) {
  if (!texto) return texto
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default buscarProductoPorCodigo