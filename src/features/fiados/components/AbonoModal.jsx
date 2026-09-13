import { useState } from 'react'
import { db } from '../../../db/dexie'
import { formatCurrency } from '../../../utils/formatCurrency'

export function AbonoModal({ cliente, onCerrar, onAbonoRegistrado }) {
  const [monto, setMonto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const montoNumero = Number(monto)
  const excedeDeuda = montoNumero > cliente.deudaTotal

  async function manejarConfirmar() {
    if (!montoNumero || montoNumero <= 0) {
      alert('Ingresa un monto válido.')
      return
    }

    setGuardando(true)
    const fecha = new Date().toISOString()

    try {
      await db.transaction('rw', db.customers, db.movements, async () => {
        await db.movements.add({
          id: `mov-${Date.now()}`,
          customerId: cliente.id,
          fecha,
          tipo: 'abono',
          monto: montoNumero,
          synced: false,
        })

        await db.customers.update(cliente.id, {
          deudaTotal: Math.max(cliente.deudaTotal - montoNumero, 0),
          synced: false,
        })
      })

      onAbonoRegistrado?.()
      onCerrar()
    } catch (error) {
      console.error('Error al registrar abono:', error)
      alert('Ocurrió un error al registrar el abono.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-dark-text text-lg">Registrar abono</h3>
          <button onClick={onCerrar} className="text-dark-text-muted text-xl font-bold px-2">
            ✕
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-sm text-dark-text-muted">{cliente.nombre}</p>
          <p className="text-lg font-bold text-warning">
            Deuda actual: {formatCurrency(cliente.deudaTotal)}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-dark-text-muted">Monto del abono</label>
          <input
            type="number"
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

        <button onClick={manejarConfirmar} disabled={guardando} className="btn-success w-full">
          {guardando ? 'Guardando...' : 'Confirmar abono'}
        </button>
      </div>
    </div>
  )
}

export default AbonoModal