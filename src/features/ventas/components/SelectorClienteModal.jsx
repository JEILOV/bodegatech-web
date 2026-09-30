import { useMemo, useState } from 'react'
import { NuevoClienteModal } from '../../fiados/components/NuevoClienteModal'
import { IconCerrar, IconMas, IconCheckCirculo } from '../../home/NavIcons'

/**
 * Modal para elegir el cliente de una venta al fiado, sin perder el
 * carrito ni el resto del flujo de venta: vive montado encima de
 * VentasPage y solo reporta hacia arriba el id elegido.
 *
 * Incluye el botón "+ Crear nuevo cliente", que abre `NuevoClienteModal`
 * (el mismo que usa el Módulo de Fiados) apilado sobre este selector. Al
 * guardar, el cliente recién creado queda automáticamente seleccionado y
 * ambos modales se cierran, devolviendo el control a VentasPage con el
 * carrito intacto.
 */
export function SelectorClienteModal({ clientes, clienteSeleccionadoId, onSeleccionar, onCerrar }) {
  const [busqueda, setBusqueda] = useState('')
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)

  const clientesFiltrados = useMemo(() => {
    if (!clientes) return []
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return clientes
    return clientes.filter(
      (cliente) =>
        cliente.nombre.toLowerCase().includes(termino) ||
        (cliente.telefono || '').includes(termino)
    )
  }, [clientes, busqueda])

  function manejarClienteCreado(nuevoClienteId) {
    onSeleccionar(nuevoClienteId)
    onCerrar()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center px-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-lg tracking-tight">Selecciona un cliente</h3>
            <button onClick={onCerrar} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500
                       hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900">
              <IconCerrar className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="input-field"
            autoFocus
          />

          {/* Crear cliente al vuelo: no se pierde el carrito, este modal
              solo se apila encima del selector. */}
          <button
            onClick={() => setMostrarNuevoCliente(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                       border border-dashed border-slate-300 bg-white text-slate-700 font-semibold
                       hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100
                       transition-colors duration-150 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <IconMas className="w-4 h-4" />
            Crear nuevo cliente
          </button>

          <ul className="divide-y divide-slate-100 overflow-y-auto -mx-5 px-5">
            {clientesFiltrados.length === 0 && (
              <li className="text-sm text-slate-500 text-center py-6">
                No se encontraron clientes.
              </li>
            )}
            {clientesFiltrados.map((cliente) => (
              <li key={cliente.id}>
                <button
                  onClick={() => {
                    onSeleccionar(cliente.id)
                    onCerrar()
                  }}
                  className={`w-full text-left px-2 py-3 flex items-center justify-between gap-2 rounded-lg
                    ${cliente.id === clienteSeleccionadoId ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{cliente.nombre}</p>
                    {cliente.telefono && (
                      <p className="text-xs text-slate-500">{cliente.telefono}</p>
                    )}
                  </div>
                  {cliente.id === clienteSeleccionadoId && (
                    <IconCheckCirculo className="w-5 h-5 text-slate-900 flex-shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {mostrarNuevoCliente && (
        <NuevoClienteModal
          onCerrar={() => setMostrarNuevoCliente(false)}
          onClienteCreado={manejarClienteCreado}
        />
      )}
    </>
  )
}

export default SelectorClienteModal