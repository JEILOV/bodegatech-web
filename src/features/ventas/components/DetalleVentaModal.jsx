import { formatCurrency } from '../../../utils/formatCurrency'
import { obtenerInfoMetodoPago } from '../../../utils/metodoPago'
import { formatearCantidadItem } from '../../../utils/granel'

const NOMBRE_NEGOCIO = 'Bodega Don Pedro'

/** Formatea una fecha ISO a "DD/MM/YYYY" y "HH:mm" por separado, para la cabecera del ticket. */
function formatearFechaHoraTicket(fechaISO) {
  const fecha = new Date(fechaISO)
  const fechaTexto = fecha.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const horaTexto = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  return { fechaTexto, horaTexto }
}

/**
 * Deriva un código de ticket corto y legible a partir del id de la venta
 * (`sale-<timestamp>`), tomando los últimos 6 dígitos del timestamp.
 */
function obtenerCodigoTicket(ventaId) {
  const soloDigitos = (ventaId || '').replace(/\D/g, '')
  return soloDigitos.slice(-6).padStart(6, '0')
}

/** Arma el texto plano del ticket, reutilizado para compartir por WhatsApp. */
function construirTextoTicket({ venta, clienteNombre }) {
  const { fechaTexto, horaTexto } = formatearFechaHoraTicket(venta.fecha)
  const infoMetodoPago = obtenerInfoMetodoPago(venta.tipoPago)
  const codigoTicket = obtenerCodigoTicket(venta.id)

  const lineas = [
    `🧾 ${NOMBRE_NEGOCIO}`,
    `Ticket #${codigoTicket}`,
    `${fechaTexto} - ${horaTexto}`,
    `Pago: ${infoMetodoPago.etiqueta}`,
  ]

  if (venta.tipoPago === 'fiado') {
    lineas.push(`Cliente: ${clienteNombre}`)
  }

  lineas.push('------------------------------')

  for (const item of venta.items) {
    const subtotal = item.precioUnitario * item.cantidad
    lineas.push(
      item.nombre,
      `   ${formatearCantidadItem(item)} x ${formatCurrency(item.precioUnitario)}${item.esGranel ? '' : ' c/u'} = ${formatCurrency(subtotal)}`
    )
  }

  lineas.push('------------------------------')
  lineas.push(`TOTAL: ${formatCurrency(venta.total)}`)
  lineas.push('', `¡Gracias por tu compra en ${NOMBRE_NEGOCIO}!`)

  return lineas.join('\n')
}

/**
 * Modal estilo ticket/recibo con el desglose completo de una venta ya
 * registrada. Se alimenta 100% de lo que ya está en Dexie (reflejo en
 * vivo de Firestore vía syncService.js): no hace ninguna escritura, solo
 * lectura y presentación.
 */
export function DetalleVentaModal({ venta, clienteNombre, onCerrar }) {
  const { fechaTexto, horaTexto } = formatearFechaHoraTicket(venta.fecha)
  const infoMetodoPago = obtenerInfoMetodoPago(venta.tipoPago)
  const codigoTicket = obtenerCodigoTicket(venta.id)

  // El subtotal se calcula desde los ítems (no desde `venta.total`) para
  // que el ticket sea auditable: si algún día se suman descuentos o
  // recargos, este desglose seguirá mostrando de dónde sale cada cifra.
  const subtotal = venta.items.reduce(
    (acumulado, item) => acumulado + item.precioUnitario * item.cantidad,
    0
  )

  function manejarCompartirWhatsApp() {
    const texto = construirTextoTicket({ venta, clienteNombre })
    // Sin número fijo: usando el endpoint genérico de WhatsApp, el
    // bodeguero elige a quién enviárselo (al cliente, a sí mismo, etc.)
    const enlace = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`
    window.open(enlace, '_blank', 'noopener,noreferrer')
  }

  function manejarImprimir() {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4 print:bg-white print:static print:px-0">
      {/* Estilos de impresión: al imprimir, solo se ve el ticket. Se
          incluyen acá para que el componente sea autosuficiente y no
          dependa de tocar CSS global de otras páginas. */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #ticket-imprimible, #ticket-imprimible * { visibility: visible; }
          #ticket-imprimible {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            box-shadow: none !important;
            border: none !important;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      <div
        id="ticket-imprimible"
        className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 max-h-[90vh] flex flex-col print:max-h-none print:rounded-none"
      >
        <div className="flex items-start justify-between flex-shrink-0 print:hidden">
          <h3 className="font-bold text-dark-text text-lg">Comprobante de venta</h3>
          <button onClick={onCerrar} className="text-dark-text-muted text-xl font-bold px-2 -mt-1">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-0.5">
          {/* Cabecera tipo ticket */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <p className="font-bold text-dark-text">{NOMBRE_NEGOCIO}</p>
            <p className="text-xs text-dark-text-muted mt-0.5">Ticket #{codigoTicket}</p>
            <p className="text-xs text-dark-text-muted">
              {fechaTexto} — {horaTexto}
            </p>
            <span
              className={`inline-flex items-center gap-1 mt-2 text-xs font-bold px-2.5 py-1 rounded-full ${infoMetodoPago.clases}`}
            >
              {infoMetodoPago.icono} {infoMetodoPago.etiqueta}
            </span>
            {venta.tipoPago === 'fiado' && (
              <p className="text-sm text-dark-text mt-2">
                Cliente: <span className="font-semibold">{clienteNombre}</span>
              </p>
            )}
          </div>

          {/* Detalle de productos */}
          <div>
            <div className="grid grid-cols-[1fr,auto,auto] gap-x-2 text-xs font-bold text-dark-text-muted uppercase tracking-wide pb-1.5 border-b border-slate-100">
              <span>Producto</span>
              <span className="text-right">P. Unit.</span>
              <span className="text-right">Subt.</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {venta.items.map((item) => (
                <li
                  key={item.productId}
                  className="grid grid-cols-[1fr,auto,auto] gap-x-2 py-2 text-sm items-start"
                >
                  <div className="min-w-0">
                    <p className="text-dark-text truncate">{item.nombre}</p>
                    <p className="text-xs text-dark-text-muted">
                      {item.esGranel ? formatearCantidadItem(item) : `x${item.cantidad}`}
                    </p>
                  </div>
                  <span className="text-right text-dark-text-muted whitespace-nowrap">
                    {formatCurrency(item.precioUnitario)}
                    {item.esGranel && <span className="text-xs">/{item.unidadMedida}</span>}
                  </span>
                  <span className="text-right font-semibold text-dark-text whitespace-nowrap">
                    {formatCurrency(item.precioUnitario * item.cantidad)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Desglose final */}
          <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-dark-text-muted">Subtotal</span>
              <span className="text-dark-text font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-text-muted">Método de pago</span>
              <span className="text-dark-text font-medium">{infoMetodoPago.etiqueta}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
              <span className="font-bold text-dark-text">TOTAL</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(venta.total)}</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 flex-shrink-0 print:hidden">
          <button
            onClick={manejarImprimir}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-dark-text font-semibold text-sm active:scale-95 transition-transform duration-100"
          >
            🖨️ Imprimir
          </button>
          <button
            onClick={manejarCompartirWhatsApp}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold text-sm active:scale-95 transition-transform duration-100"
          >
            📲 Compartir
          </button>
        </div>

        <button onClick={onCerrar} className="btn-primary w-full flex-shrink-0 print:hidden">
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default DetalleVentaModal