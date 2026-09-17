import { formatearCantidadItem } from './granel'
import { obtenerInfoMetodoPago } from './metodoPago'

/**
 * Envuelve un valor en comillas dobles si contiene coma, comillas o salto
 * de línea (regla estándar de CSV), duplicando las comillas internas.
 * Sin esto, un nombre de cliente o producto con una coma rompería las
 * columnas al abrir el archivo en Excel/Sheets.
 *
 * @param {string|number} valor
 * @returns {string}
 */
function escaparCeldaCSV(valor) {
  const texto = String(valor ?? '')
  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

/** Detalle completo (sin truncar) de los ítems de una venta, para el CSV. */
function detallarItems(items) {
  if (!items || items.length === 0) return 'Sin productos'
  return items
    .map((item) =>
      item.esGranel
        ? `${formatearCantidadItem(item)} ${item.nombre}`
        : `${item.cantidad}x ${item.nombre}`
    )
    .join('; ')
}

/**
 * Construye el contenido CSV (con BOM UTF-8, para que Excel muestre bien
 * tildes/ñ) del reporte de ventas de un periodo.
 *
 * @param {object[]} ventas - ventas ya filtradas por el rango del Cierre de Caja
 * @param {Record<string, string>} nombrePorClienteId
 * @returns {string}
 */
export function construirCsvCierreDeCaja(ventas, nombrePorClienteId) {
  const ENCABEZADOS = ['Fecha', 'Hora', 'Método de Pago', 'Cliente', 'Ítems Vendidos', 'Monto Total (S/)']

  const filas = ventas.map((venta) => {
    const fechaObj = new Date(venta.fecha)
    const fecha = fechaObj.toLocaleDateString('es-PE')
    const hora = fechaObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    const metodoPago = obtenerInfoMetodoPago(venta.tipoPago).etiqueta
    const cliente =
      venta.tipoPago === 'fiado'
        ? nombrePorClienteId[venta.clienteId] || 'Cliente eliminado'
        : 'Cliente general'

    return [fecha, hora, metodoPago, cliente, detallarItems(venta.items), venta.total.toFixed(2)]
  })

  const lineas = [ENCABEZADOS, ...filas].map((fila) => fila.map(escaparCeldaCSV).join(','))

  // BOM (\uFEFF) al inicio: sin esto, Excel en Windows suele mostrar mal
  // los acentos y la "ñ" al abrir un CSV en UTF-8.
  return '\uFEFF' + lineas.join('\r\n')
}

/**
 * Genera el CSV del periodo y dispara la descarga en el navegador
 * (sin backend: se crea un Blob local y se "clickea" un link temporal).
 *
 * @param {object[]} ventas
 * @param {Record<string, string>} nombrePorClienteId
 * @param {{ fechaInicio: string, fechaFin: string }} rango - strings "YYYY-MM-DD" para el nombre del archivo
 */
export function descargarCsvCierreDeCaja(ventas, nombrePorClienteId, rango) {
  const csv = construirCsvCierreDeCaja(ventas, nombrePorClienteId)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const nombreArchivo = `cierre-caja_${rango.fechaInicio}_a_${rango.fechaFin}.csv`

  const enlaceTemporal = document.createElement('a')
  enlaceTemporal.href = url
  enlaceTemporal.download = nombreArchivo
  document.body.appendChild(enlaceTemporal)
  enlaceTemporal.click()
  document.body.removeChild(enlaceTemporal)
  URL.revokeObjectURL(url)
}

export default { construirCsvCierreDeCaja, descargarCsvCierreDeCaja }