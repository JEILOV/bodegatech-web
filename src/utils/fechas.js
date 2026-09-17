/**
 * Devuelve el rango [inicioDeHoy, finDeHoy] en formato ISO, según la hora
 * LOCAL del dispositivo, para filtrar registros (ventas, movimientos) del
 * día actual.
 *
 * Centralizado aquí porque más de un componente necesita el mismo rango
 * exacto (MetricsHeader y CloudStatusPanel): si cada uno calculara el
 * rango por su cuenta y uno quedara desalineado con el otro, los números
 * "ventas de hoy" locales vs. remotos podrían no coincidir por una simple
 * diferencia de milisegundos, no por un problema real de sincronización.
 */
export function obtenerRangoDeHoy() {
  const ahora = new Date()
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 1)
  return { inicio: inicio.toISOString(), fin: fin.toISOString() }
}

/**
 * Cantidad de días completos transcurridos desde `fechaIso` hasta ahora.
 * Se usa, por ejemplo, para armar el mensaje de recordatorio de cobro por
 * WhatsApp ("...pendiente desde hace X días").
 *
 * @param {string} fechaIso
 * @returns {number}
 */
export function diasDesde(fechaIso) {
  if (!fechaIso) return 0
  const fecha = new Date(fechaIso)
  if (Number.isNaN(fecha.getTime())) return 0
  const diferenciaMs = Date.now() - fecha.getTime()
  return Math.max(Math.floor(diferenciaMs / (1000 * 60 * 60 * 24)), 0)
}

/**
 * Formatea una fecha ISO a un string corto legible ("15 sep, 03:45 p.m."),
 * usado en el desglose cronológico de transacciones del cliente.
 *
 * @param {string} fechaIso
 * @returns {string}
 */
export function formatearFechaCorta(fechaIso) {
  return new Date(fechaIso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default obtenerRangoDeHoy