export const UNIDADES_MEDIDA_GRANEL = ['kg', 'gr', 'lt']

/**
 * Cantidad de decimales a conservar al formatear una cantidad a granel
 * para mostrar en pantalla. 3 decimales alcanza para gramos exactos
 * cuando la unidad base es "kg" (ej. 0.250 kg = 250 g).
 */
const DECIMALES_CANTIDAD_GRANEL = 3

/**
 * Redondea una cantidad a granel a un número razonable de decimales y
 * quita ceros sobrantes (1.500 -> "1.5", 1.000 -> "1").
 *
 * @param {number} cantidad
 * @returns {string}
 */
export function formatearCantidadGranel(cantidad) {
  const numero = Number(cantidad) || 0
  return Number(numero.toFixed(DECIMALES_CANTIDAD_GRANEL)).toString()
}

/**
 * Texto de cantidad listo para mostrar en carrito, tarjetas de venta y
 * tickets, ya sea un producto por unidad ("x3") o a granel ("1.5 kg").
 *
 * @param {{ cantidad: number, esGranel?: boolean, unidadMedida?: string }} item
 * @returns {string}
 */
export function formatearCantidadItem(item) {
  if (item.esGranel) {
    return `${formatearCantidadGranel(item.cantidad)} ${item.unidadMedida}`
  }
  return `${item.cantidad}`
}

/**
 * Modo "por peso/fracción": el bodeguero digita la cantidad directamente
 * (ej. 1.5 kg) y el total se calcula multiplicando por el precio/unidad.
 *
 * @param {number} cantidad
 * @param {number} precioPorUnidad
 * @returns {number}
 */
export function calcularTotalPorCantidad(cantidad, precioPorUnidad) {
  return Number(cantidad || 0) * Number(precioPorUnidad || 0)
}

/**
 * Modo "por monto fijo": el bodeguero digita cuánto va a pagar el
 * cliente (ej. S/ 5.00) y la cantidad equivalente se calcula dividiendo
 * entre el precio/unidad.
 *
 * @param {number} monto
 * @param {number} precioPorUnidad
 * @returns {number}
 */
export function calcularCantidadPorMonto(monto, precioPorUnidad) {
  if (!precioPorUnidad) return 0
  return Number(monto || 0) / Number(precioPorUnidad)
}

export default {
  UNIDADES_MEDIDA_GRANEL,
  formatearCantidadGranel,
  formatearCantidadItem,
  calcularTotalPorCantidad,
  calcularCantidadPorMonto,
}