import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/dexie'
import { actualizarClienteEnNube } from '../../../services/firestoreDataService'
import { formatCurrency } from '../../../utils/formatCurrency'
import { formatearFechaCorta } from '../../../utils/fechas'
import { IconCerrar, IconEditar, IconCaja } from '../../home/NavIcons'

const ICONOS_MEDIO_PAGO = {
  efectivo: '💵',
  yape: '📱',
  plin: '📲',
}

/**
 * Modal de detalle de un cliente fiado. Se abre al tocar su tarjeta desde
 * FiadosPage. Permite:
 *  1. Editar nombre y teléfono, guardando directo en Firestore con
 *     `actualizarClienteEnNube()` (nunca toca `deudaTotal` desde acá).
 *  2. Ver el desglose cronológico de sus transacciones: compras fiadas
 *     (`db.sales` con `clienteId`) mezcladas con abonos/pagos
 *     (`db.movements` tipo 'abono'), ordenado de más reciente a más
 *     antiguo.
 */
export function DetalleClienteModal({ cliente, onCerrar }) {
  const [nombre, setNombre] = useState(cliente.nombre)
  const [telefono, setTelefono] = useState(cliente.telefono || '')
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState(false)

  const comprasFiadas = useLiveQuery(
    () => db.sales.where('clienteId').equals(cliente.id).toArray(),
    [cliente.id]
  )

  const abonos = useLiveQuery(
    () =>
      db.movements
        .where('customerId')
        .equals(cliente.id)
        .and((movimiento) => movimiento.tipo === 'abono')
        .toArray(),
    [cliente.id]
  )

  const transacciones = useMemo(() => {
    const listaCompras = (comprasFiadas || []).map((venta) => ({
      id: venta.id,
      tipo: 'compra',
      fecha: venta.fecha,
      monto: venta.total,
      items: venta.items,
    }))

    const listaAbonos = (abonos || []).map((abono) => ({
      id: abono.id,
      tipo: 'abono',
      fecha: abono.fecha,
      monto: abono.monto,
      tipoPago: abono.tipoPago,
    }))

    return [...listaCompras, ...listaAbonos].sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha)
    )
  }, [comprasFiadas, abonos])

  const cargando = comprasFiadas === undefined || abonos === undefined
  const huboCambios = nombre.trim() !== cliente.nombre || telefono.trim() !== (cliente.telefono || '')

  async function manejarGuardar() {
    if (!nombre.trim()) {
      alert('El nombre no puede estar vacío.')
      return
    }

    setGuardando(true)
    try {
      await actualizarClienteEnNube(cliente.id, {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
      })
      setEditando(false)
    } catch (error) {
      console.error('Error al actualizar cliente:', error)
      alert('Ocurrió un error al guardar los cambios. Verifica tu conexión a internet.')
    } finally {
      setGuardando(false)
    }
  }

  function cancelarEdicion() {
    setNombre(cliente.nombre)
    setTelefono(cliente.telefono || '')
    setEditando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Encabezado con gradiente, en sintonía con AuthPage/HomeScreen */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-purple-600 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
          <h3 className="relative font-bold text-white text-lg">Detalle del cliente</h3>
          <button
            onClick={onCerrar}
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white
                       hover:bg-white/25 active:scale-90 transition-all duration-150"
          >
            <IconCerrar className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 p-5">
          {/* Datos personales */}
          <section className="space-y-3">
            {editando ? (
              <>
                <div>
                  <label className="text-xs font-medium text-dark-text-muted">Nombre</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(evento) => setNombre(evento.target.value)}
                    className="input-field mt-1"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-dark-text-muted">Teléfono</label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(evento) => setTelefono(evento.target.value)}
                    placeholder="Ej: 987654321"
                    className="input-field mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={cancelarEdicion}
                    disabled={guardando}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-dark-text-muted font-semibold text-sm
                               hover:border-slate-300 transition-colors duration-150"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={manejarGuardar}
                    disabled={guardando || !huboCambios}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white
                               font-semibold text-sm shadow-sm active:scale-95 transition-all duration-150
                               disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-slate-50 rounded-xl p-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-dark-text truncate">{cliente.nombre}</p>
                  <p className="text-xs text-dark-text-muted">
                    {cliente.telefono || 'Sin teléfono registrado'}
                  </p>
                  <p
                    className={`text-sm font-bold mt-1 ${
                      cliente.deudaTotal > 0 ? 'text-warning-600' : 'text-success-600'
                    }`}
                  >
                    Deuda actual: {formatCurrency(cliente.deudaTotal)}
                  </p>
                </div>
                <button
                  onClick={() => setEditando(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary-700 flex-shrink-0 px-2 py-1
                             hover:text-primary-800 transition-colors duration-150"
                >
                  <IconEditar className="w-3.5 h-3.5" /> Editar
                </button>
              </div>
            )}
          </section>

          {/* Desglose cronológico */}
          <section>
            <h4 className="text-xs font-bold text-dark-text-muted uppercase tracking-wide mb-2">
              Historial de transacciones
            </h4>

            {cargando && (
              <p className="text-xs text-dark-text-muted py-2">Cargando historial...</p>
            )}

            {!cargando && transacciones.length === 0 && (
              <p className="text-xs text-dark-text-muted py-2">
                Este cliente todavía no tiene compras fiadas ni abonos registrados.
              </p>
            )}

            <ul className="divide-y divide-slate-100">
              {transacciones.map((transaccion) => (
                <li key={`${transaccion.tipo}-${transaccion.id}`} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-dark-text-muted">
                        {transaccion.tipo === 'compra' ? (
                          <IconCaja className="w-3.5 h-3.5" />
                        ) : (
                          <span className="text-sm leading-none">
                            {ICONOS_MEDIO_PAGO[transaccion.tipoPago] || '💰'}
                          </span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-dark-text font-medium truncate">
                          {transaccion.tipo === 'compra' ? 'Compra fiada' : 'Abono / pago'}
                        </p>
                        <p className="text-xs text-dark-text-muted">
                          {formatearFechaCorta(transaccion.fecha)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-semibold flex-shrink-0 ${
                        transaccion.tipo === 'compra' ? 'text-warning-600' : 'text-success-600'
                      }`}
                    >
                      {transaccion.tipo === 'compra' ? '+' : '−'} {formatCurrency(transaccion.monto)}
                    </span>
                  </div>

                  {transaccion.tipo === 'compra' && transaccion.items?.length > 0 && (
                    <ul className="mt-1.5 ml-9 space-y-0.5">
                      {transaccion.items.map((item) => (
                        <li key={item.productId} className="text-xs text-dark-text-muted flex justify-between">
                          <span className="truncate pr-2">
                            {item.cantidad} × {item.nombre}
                          </span>
                          <span className="flex-shrink-0">
                            {formatCurrency(item.precioUnitario * item.cantidad)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

export default DetalleClienteModal