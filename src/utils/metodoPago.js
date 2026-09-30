/**
 * Info visual (etiqueta y clases Tailwind del badge) por cada método de
 * pago que puede tener una venta. Centralizado acá para que la tarjeta de
 * la lista y el ticket del modal de detalle usen exactamente el mismo
 * badge. El ícono vive en components/MetodosPago.jsx (<IconoMetodoPago />
 * y <BadgeMetodoPago />), porque este archivo no puede contener JSX.
 *
 * Yape, Plin y Efectivo comparten un badge neutro: el color lo aportan
 * los logos. Fiado conserva un tono ámbar porque señala una deuda.
 *
 * 'yape' y 'plin' ya están contempladas aunque VentasPage hoy solo genera
 * 'efectivo' | 'yape' | 'fiado': el badge queda listo sin cambios.
 */
const BADGE_NEUTRO = 'bg-slate-100 text-slate-800 border border-slate-200'

const METODOS_PAGO = {
  efectivo: { etiqueta: 'Efectivo', clases: BADGE_NEUTRO },
  fiado: {
    etiqueta: 'Fiado',
    clases: 'bg-warning-50 text-warning-700 border border-warning-100',
  },
  yape: { etiqueta: 'Yape', clases: BADGE_NEUTRO },
  plin: { etiqueta: 'Plin', clases: BADGE_NEUTRO },
}

const METODO_DESCONOCIDO = { etiqueta: 'Otro', clases: BADGE_NEUTRO }

/**
 * @param {string} tipoPago
 * @returns {{ etiqueta: string, clases: string }}
 */
export function obtenerInfoMetodoPago(tipoPago) {
  return METODOS_PAGO[tipoPago] || METODO_DESCONOCIDO
}

export default obtenerInfoMetodoPago