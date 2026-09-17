/**
 * Info visual (etiqueta, ícono y clases Tailwind) por cada método de pago
 * que puede tener una venta. Centralizado acá para que la tarjeta de la
 * lista y el ticket del modal de detalle usen exactamente el mismo badge.
 *
 * 'yape' y 'plin' ya están contempladas (morado) aunque VentasPage hoy
 * solo genera 'efectivo' | 'fiado': así el badge queda listo sin cambios
 * el día que se sume Yape/Plin como forma de pago directa de una venta.
 */
const METODOS_PAGO = {
  efectivo: {
    etiqueta: 'Efectivo',
    icono: '💵',
    clases: 'bg-success/10 text-success',
  },
  fiado: {
    etiqueta: 'Fiado',
    icono: '📒',
    clases: 'bg-warning/10 text-warning',
  },
  yape: {
    etiqueta: 'Yape',
    icono: '📱',
    clases: 'bg-purple-100 text-purple-700',
  },
  plin: {
    etiqueta: 'Plin',
    icono: '📲',
    clases: 'bg-purple-100 text-purple-700',
  },
}

const METODO_DESCONOCIDO = {
  etiqueta: 'Otro',
  icono: '💳',
  clases: 'bg-slate-100 text-dark-text-muted',
}

/**
 * @param {string} tipoPago
 * @returns {{ etiqueta: string, icono: string, clases: string }}
 */
export function obtenerInfoMetodoPago(tipoPago) {
  return METODOS_PAGO[tipoPago] || METODO_DESCONOCIDO
}

export default obtenerInfoMetodoPago