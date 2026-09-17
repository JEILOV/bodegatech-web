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

export default obtenerRangoDeHoy