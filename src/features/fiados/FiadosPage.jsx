import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import { formatCurrency } from '../../utils/formatCurrency'
import { construirEnlaceRecordatorioWhatsApp } from '../../utils/whatsapp'
import { useBackableState } from '../../hooks/useBackableState'
import { NuevoClienteModal } from './components/NuevoClienteModal'
import { AbonoModal } from './components/AbonoModal'
import { HistorialAbonos } from './components/HistorialAbonos'
import { DetalleClienteModal } from './components/DetalleClienteModal'
import { IconMas, IconFiados, IconChat, IconChevron, IconCheckCirculo } from '../home/NavIcons'

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

  // Botón/gesto "Atrás" del celular: primero cierra el modal abierto
  // (Nuevo cliente, Registrar abono o Detalle de cliente) en vez de
  // salir de la pantalla de Fiados.
  useBackableState(mostrarNuevoCliente, () => setMostrarNuevoCliente(false))
  useBackableState(Boolean(clienteParaAbono), () => setClienteParaAbono(null))
  useBackableState(Boolean(clienteParaDetalle), () => setClienteParaDetalle(null))

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
      {/* Encabezado premium: gradiente azul/morado, en sintonía con AuthPage/HomeScreen */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-purple-600 px-5 pt-8 pb-7 rounded-b-3xl shadow-lg shadow-primary-600/20">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex items-center gap-3">
          <button
            onClick={onVolver}
            aria-label="Volver"
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white
                       active:scale-90 transition-transform duration-100 hover:bg-white/25"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
              <IconFiados className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-lg truncate">Clientes Fiados</h1>
              <p className="text-white/70 text-xs">
                Total por cobrar: {formatCurrency(totalFiados)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 -mt-4 space-y-4">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 space-y-4">
          <button
            onClick={() => setMostrarNuevoCliente(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600
                       to-purple-600 text-white font-semibold py-3 shadow-md shadow-primary-600/20 active:scale-95
                       transition-all duration-150"
          >
            <IconMas className="w-4 h-4" /> Nuevo cliente
          </button>

          {/* Pestañas: Deudores Activos / Historial-Saldados. Un cliente que
              queda en S/ 0.00 pasa automáticamente a "Historial" porque el
              filtro se recalcula en vivo desde `deudaTotal` (useLiveQuery). */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-1">
            {TABS.map((tab) => {
              const cantidad = tab.id === 'activos' ? deudoresActivos.length : historialSaldados.length
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    tabActiva === tab.id
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-dark-text-muted hover:text-dark-text'
                  }`}
                >
                  {tab.etiqueta} {clientes !== undefined && `(${cantidad})`}
                </button>
              )
            })}
          </div>
        </div>

        {clientes === undefined && (
          <p className="text-sm text-dark-text-muted text-center py-6">Cargando...</p>
        )}

        {clientes !== undefined && clientesEnVista.length === 0 && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm text-center py-6">
            <p className="flex items-center justify-center gap-2 text-sm text-dark-text-muted">
              {tabActiva === 'activos' && <IconCheckCirculo className="w-4 h-4 text-success shrink-0" />}
              {tabActiva === 'activos'
                ? 'No tienes deudores activos en este momento.'
                : 'Todavía no tienes clientes con historial saldado.'}
            </p>
          </div>
        )}

        <ul className="space-y-2.5">
          {clientesEnVista.map((cliente) => {
            const historialAbierto = clienteConHistorialAbierto === cliente.id
            const tieneDeuda = (cliente.deudaTotal || 0) > 0

            return (
              <li
                key={cliente.id}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md
                           hover:border-primary-200 cursor-pointer active:scale-[0.99]
                           transition-all duration-150 p-4"
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
                        tieneDeuda ? 'text-warning-600' : 'text-success-600'
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
                    className="bg-success-500 hover:bg-success-600 text-white text-sm font-semibold px-4 py-2
                               rounded-xl active:scale-95 transition-all duration-150 disabled:opacity-40
                               disabled:pointer-events-none flex-shrink-0 shadow-sm"
                  >
                    Registrar abono
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={(evento) => alternarHistorial(cliente.id, evento)}
                    className="flex items-center gap-1 text-xs font-semibold text-primary-700"
                  >
                    {historialAbierto ? 'Ocultar historial' : 'Ver historial de abonos'}
                    <IconChevron
                      className={`w-3.5 h-3.5 transition-transform duration-150 ${
                        historialAbierto ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {tieneDeuda && (
                    <button
                      onClick={(evento) => manejarRecordatorioWhatsApp(cliente, evento)}
                      className="flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-semibold
                                 px-3 py-1.5 rounded-lg active:scale-95 transition-transform duration-100 shadow-sm"
                    >
                      <IconChat className="w-3.5 h-3.5" />
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