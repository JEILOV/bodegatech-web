import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import { formatCurrency } from '../../utils/formatCurrency'
import { NuevoClienteModal } from './components/NuevoClienteModal'
import { AbonoModal } from './components/AbonoModal'

export function FiadosPage({ onVolver }) {
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)
  const [clienteParaAbono, setClienteParaAbono] = useState(null)

  const clientes = useLiveQuery(() => db.customers.toArray(), [])

  const totalFiados = clientes?.reduce((acumulado, cliente) => acumulado + (cliente.deudaTotal || 0), 0) ?? 0

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-primary px-5 py-5 flex items-center gap-3">
        <button onClick={onVolver} className="text-white text-xl">
          ←
        </button>
        <div>
          <h1 className="text-white font-bold text-lg">Clientes Fiados</h1>
          <p className="text-primary-100 text-xs">
            Total por cobrar: {formatCurrency(totalFiados)}
          </p>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        <button onClick={() => setMostrarNuevoCliente(true)} className="btn-primary w-full">
          + Nuevo cliente
        </button>

        {clientes === undefined && (
          <p className="text-sm text-dark-text-muted text-center py-6">Cargando...</p>
        )}

        {clientes?.length === 0 && (
          <div className="card text-center py-6">
            <p className="text-sm text-dark-text-muted">
              Aún no tienes clientes fiados registrados.
            </p>
          </div>
        )}

        <ul className="space-y-2">
          {clientes?.map((cliente) => (
            <li key={cliente.id} className="card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-dark-text truncate">{cliente.nombre}</p>
                {cliente.telefono && (
                  <p className="text-xs text-dark-text-muted">{cliente.telefono}</p>
                )}
                <p
                  className={`text-sm font-bold mt-1 ${
                    cliente.deudaTotal > 0 ? 'text-warning' : 'text-success'
                  }`}
                >
                  {formatCurrency(cliente.deudaTotal)}
                </p>
              </div>

              <button
                onClick={() => setClienteParaAbono(cliente)}
                disabled={cliente.deudaTotal <= 0}
                className="bg-success text-white text-sm font-semibold px-4 py-2 rounded-lg
                           active:scale-95 transition-transform duration-100 disabled:opacity-40
                           flex-shrink-0"
              >
                Registrar abono
              </button>
            </li>
          ))}
        </ul>
      </main>

      {mostrarNuevoCliente && (
        <NuevoClienteModal onCerrar={() => setMostrarNuevoCliente(false)} />
      )}

      {clienteParaAbono && (
        <AbonoModal
          cliente={clienteParaAbono}
          onCerrar={() => setClienteParaAbono(null)}
        />
      )}
    </div>
  )
}

export default FiadosPage