/**
 * Formatea un número a Soles Peruanos.
 * Ej: formatCurrency(4.5) -> "S/ 4.50"
 *
 * @param {number} amount - Monto a formatear
 * @returns {string} Monto formateado con símbolo de Soles
 */
export function formatCurrency(amount) {
  const numero = Number(amount)

  if (Number.isNaN(numero)) {
    return 'S/ 0.00'
  }

  return `S/ ${numero.toFixed(2)}`
}

export default formatCurrency