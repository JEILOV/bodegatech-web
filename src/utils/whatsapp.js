import { diasDesde } from './fechas'

const NOMBRE_NEGOCIO = 'Bodega Don Pedro'
const CODIGO_PAIS = '51' // Perú

/**
 * Deja solo dígitos en el teléfono (quita espacios, guiones, "+", etc.)
 * para que quede compatible con el formato que espera `wa.me`.
 *
 * @param {string} telefono
 * @returns {string}
 */
function limpiarTelefono(telefono) {
  return (telefono || '').replace(/\D/g, '')
}

/**
 * Arma el mensaje predeterminado de recordatorio de cobro, cordial y con
 * los datos del cliente ya reemplazados.
 *
 * @param {{ nombre: string, deudaTotal: number, dias: number }} datos
 * @returns {string}
 */
export function construirMensajeRecordatorio({ nombre, deudaTotal, dias }) {
  const montoFormateado = Number(deudaTotal || 0).toFixed(2)
  const textoDias = dias === 1 ? '1 día' : `${dias} días`
  return (
    `Hola ${nombre}, te saludamos de ${NOMBRE_NEGOCIO}. Te recordamos amablemente ` +
    `que tienes un saldo pendiente de S/ ${montoFormateado} desde hace ${textoDias}. ` +
    `¡Gracias por tu preferencia!`
  )
}

/**
 * Construye el enlace directo de WhatsApp (`https://wa.me/...`) con el
 * mensaje de recordatorio de cobro ya cargado, listo para abrir en una
 * pestaña nueva.
 *
 * @param {object} cliente - documento de `customers` (nombre, telefono, deudaTotal)
 * @param {string} [fechaDeudaDesde] - fecha ISO desde la que se cuenta la deuda (ej. primer cargo pendiente)
 * @returns {string|null} el enlace, o null si el cliente no tiene teléfono registrado
 */
export function construirEnlaceRecordatorioWhatsApp(cliente, fechaDeudaDesde) {
  const telefonoLimpio = limpiarTelefono(cliente?.telefono)
  if (!telefonoLimpio) return null

  const mensaje = construirMensajeRecordatorio({
    nombre: cliente.nombre,
    deudaTotal: cliente.deudaTotal,
    dias: diasDesde(fechaDeudaDesde),
  })

  return `https://wa.me/${CODIGO_PAIS}${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`
}

export default construirEnlaceRecordatorioWhatsApp