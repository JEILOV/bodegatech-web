import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import { formatCurrency } from '../../utils/formatCurrency'
import { construirEnlaceRecordatorioWhatsApp } from '../../utils/whatsapp'
import { NuevoClienteModal } from './components/NuevoClienteModal'
import { AbonoModal } from './components/AbonoModal'
import { HistorialAbonos } from './components/HistorialAbonos'
import { DetalleClienteModal } from './components/DetalleClienteModal'

const TABS = [
  { id: 'activos', etiqueta: 'Deudores Activos' },
  { id: 'historial', etiqueta: 'Historial / Saldados' },
]

export function FiadosPage({ onVolver }) {
  const [tabActiva, setTabActiva] = useState('activos')
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)
  const [clienteParaAbono, setClienteParaAbono] = useState(null)
  const [clienteParaDetalle, setClienteParaDetalle] = useState(null)
  const [clienteConHistorialAbierto, setClienteConHistorialAbierto] = useState(null)

  const clientes = useLiveQuery(() => db.customers.toArray(), [])

  // Primer cargo (venta fiada) por cliente: se usa como aproximación de
  // "desde hace X días" en el recordatorio de cobro por WhatsApp.
  const primerCargoPorCliente = useLiveQuery(async () => {
    const cargos = await db.movements.where('tipo').equals('cargo').toArray()
    const mapa = {}
    for (const cargo of cargos) {
      const actual = mapa[cargo.customerId]
      if (!actual || new Date(cargo.fecha) < new Date(actual)) {
        mapa[cargo.customerId] = cargo.fecha
      }
    }
    return mapa
  }, [])

  const totalFiados = clientes?.reduce((acumulado, cliente) => acumulado + (cliente.deudaTotal || 0), 0) ?? 0

  const { deudoresActivos, historialSaldados } = useMemo(() => {
    const activos = []
    const saldados = []
    for (const cliente of clientes || []) {
      if ((cliente.deudaTotal || 0) > 0) {
        activos.push(cliente)
      } else {
        saldados.push(cliente)
      }
    }
    // Deudores activos: mayor deuda primero, para priorizar a quién cobrar.
    activos.sort((a, b) => (b.deudaTotal || 0) - (a.deudaTotal || 0))
    return { deudoresActivos: activos, historialSaldados: saldados }
  }, [clientes])

  const clientesEnVista = tabActiva === 'activos' ? deudoresActivos : historialSaldados

  function alternarHistorial(clienteId, evento) {
    evento.stopPropagation()
    setClienteConHistorialAbierto((actual) => (actual === clienteId ? null : clienteId))
  }

  function manejarRecordatorioWhatsApp(cliente, evento) {
    evento.stopPropagation()
    const enlace = construirEnlaceRecordatorioWhatsApp(cliente, primerCargoPorCliente?.[cliente.id])
    if (!enlace) {
      alert('Este cliente no tiene un teléfono registrado. Agrégalo desde su detalle para poder recordarle por WhatsApp.')
      return
    }
    window.open(enlace, '_blank', 'noopener,noreferrer')
  }

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

        {/* Pestañas: Deudores Activos / Historial-Saldados. Un cliente que
            queda en S/ 0.00 pasa automáticamente a "Historial" porque el
            filtro se recalcula en vivo desde `deudaTotal` (useLiveQuery). */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 rounded-xl p-1">
          {TABS.map((tab) => {
            const cantidad = tab.id === 'activos' ? deudoresActivos.length : historialSaldados.length
            return (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  tabActiva === tab.id
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-dark-text-muted'
                }`}
              >
                {tab.etiqueta} {clientes !== undefined && `(${cantidad})`}
              </button>
            )
          })}
        </div>

        {clientes === undefined && (
          <p className="text-sm text-dark-text-muted text-center py-6">Cargando...</p>
        )}

        {clientes !== undefined && clientesEnVista.length === 0 && (
          <div className="card text-center py-6">
            <p className="text-sm text-dark-text-muted">
              {tabActiva === 'activos'
                ? 'No tienes deudores activos en este momento. 🎉'
                : 'Todavía no tienes clientes con historial saldado.'}
            </p>
          </div>
        )}

        <ul className="space-y-2">
          {clientesEnVista.map((cliente) => {
            const historialAbierto = clienteConHistorialAbierto === cliente.id
            const tieneDeuda = (cliente.deudaTotal || 0) > 0

            return (
              <li
                key={cliente.id}
                className="card cursor-pointer active:scale-[0.99] transition-transform duration-100"
                onClick={() => setClienteParaDetalle(cliente)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-dark-text truncate">{cliente.nombre}</p>
                    {cliente.telefono && (
                      <p className="text-xs text-dark-text-muted">{cliente.telefono}</p>
                    )}
                    <p
                      className={`text-sm font-bold mt-1 ${
                        tieneDeuda ? 'text-warning' : 'text-success'
                      }`}
                    >
                      {formatCurrency(cliente.deudaTotal)}
                    </p>
                  </div>

                  <button
                    onClick={(evento) => {
                      evento.stopPropagation()
                      setClienteParaAbono(cliente)
                    }}
                    disabled={!tieneDeuda}
                    className="bg-success text-white text-sm font-semibold px-4 py-2 rounded-lg
                               active:scale-95 transition-transform duration-100 disabled:opacity-40
                               flex-shrink-0"
                  >
                    Registrar abono
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={(evento) => alternarHistorial(cliente.id, evento)}
                    className="text-xs font-semibold text-primary"
                  >
                    {historialAbierto ? 'Ocultar historial ▲' : 'Ver historial de abonos ▼'}
                  </button>

                  {tieneDeuda && (
                    <button
                      onClick={(evento) => manejarRecordatorioWhatsApp(cliente, evento)}
                      className="flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-semibold
                                 px-3 py-1.5 rounded-lg active:scale-95 transition-transform duration-100"
                    >
                      <span className="text-sm leading-none">📲</span>
                      Recordar por WhatsApp
                    </button>
                  )}
                </div>

                {historialAbierto && (
                  <div
                    className="mt-2 border-t border-slate-100 pt-2"
                    onClick={(evento) => evento.stopPropagation()}
                  >
                    <HistorialAbonos clienteId={cliente.id} />
                  </div>
                )}
              </li>
            )
          })}
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

      {clienteParaDetalle && (
        <DetalleClienteModal
          cliente={clienteParaDetalle}
          onCerrar={() => setClienteParaDetalle(null)}
        />
      )}
    </div>
  )
}

export default FiadosPage