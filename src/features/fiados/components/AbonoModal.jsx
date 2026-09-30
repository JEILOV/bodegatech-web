import { useState } from 'react'
import { registrarAbonoEnNube } from '../../../services/firestoreDataService'
import { formatCurrency } from '../../../utils/formatCurrency'
import { IconoMetodoPago } from '../../../components/MetodosPago'
import { IconCerrar } from '../../home/NavIcons'

const MEDIOS_PAGO = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'yape', etiqueta: 'Yape' },
  { valor: 'plin', etiqueta: 'Plin' },
]

export function AbonoModal({ cliente, onCerrar, onAbonoRegistrado }) {
  const [monto, setMonto] = useState('')
  const [tipoPago, setTipoPago] = useState('efectivo')
  const [guardando, setGuardando] = useState(false)

  const montoNumero = Number(monto)
  const montoInvalido = !monto || Number.isNaN(montoNumero) || montoNumero <= 0
  const excedeDeuda = !montoInvalido && montoNumero > cliente.deudaTotal
  const puedeConfirmar = !montoInvalido && !excedeDeuda && !guardando

  async function manejarConfirmar() {
    if (montoInvalido) {
      alert('Ingresa un monto válido mayor a S/ 0.00.')
      return
    }

    if (excedeDeuda) {
      alert('El abono no puede superar la deuda total del cliente.')
      return
    }

    setGuardando(true)
    const fecha = new Date().toISOString()

    try {
      // Cloud Directo: movimiento de abono + nueva deuda, juntos y
      // directo en Firestore (writeBatch), sin pasar por Dexie.
      await registrarAbonoEnNube({
        movimiento: {
          id: `mov-${Date.now()}`,
          customerId: cliente.id,
          fecha,
          tipo: 'abono',
          monto: montoNumero,
          tipoPago,
        },
        clienteId: cliente.id,
        nuevaDeuda: Math.max(cliente.deudaTotal - montoNumero, 0),
      })

      onAbonoRegistrado?.()
      onCerrar()
    } catch (error) {
      console.error('Error al registrar abono:', error)
      alert('Ocurrió un error al registrar el abono. Verifica tu conexión a internet.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-lg tracking-tight">Registrar abono</h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500
                       hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <IconCerrar className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-sm text-dark-text-muted">{cliente.nombre}</p>
          <p className="text-lg font-bold text-warning">
            Deuda actual: {formatCurrency(cliente.deudaTotal)}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-dark-text-muted">Monto a abonar</label>
          <input
            type="number"
            inputMode="decimal"
            value={monto}
            onChange={(evento) => setMonto(evento.target.value)}
            placeholder="S/ 0.00"
            className="input-field mt-1"
            autoFocus
          />
          {excedeDeuda && (
            <p className="text-xs text-warning mt-1">
              El monto supera la deuda actual del cliente.
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-dark-text-muted">Medio de pago</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {MEDIOS_PAGO.map((medio) => (
              <button
                key={medio.valor}
                type="button"
                onClick={() => setTipoPago(medio.valor)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2
                  ${
                    tipoPago === medio.valor
                      ? 'border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
              >
                <IconoMetodoPago metodo={medio.valor} className="w-6 h-6" />
                {medio.etiqueta}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={manejarConfirmar}
          disabled={!puedeConfirmar}
          className="w-full rounded-xl bg-slate-900 text-white font-semibold py-3 shadow-sm
                     hover:bg-slate-800 active:bg-slate-950 transition-colors duration-150
                     disabled:opacity-50 disabled:pointer-events-none
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          {guardando ? 'Guardando...' : 'Confirmar abono'}
        </button>
      </div>
    </div>
  )
}

export default AbonoModal