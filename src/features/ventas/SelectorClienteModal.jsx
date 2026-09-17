import { useMemo, useState } from 'react'
import { NuevoClienteModal } from '../../fiados/components/NuevoClienteModal'

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
            <h3 className="font-bold text-dark-text text-lg">Selecciona un cliente</h3>
            <button onClick={onCerrar} className="text-dark-text-muted text-xl font-bold px-2">
              ✕
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
                       border-2 border-dashed border-primary text-primary font-semibold
                       active:scale-95 transition-transform duration-100 flex-shrink-0"
          >
            <span className="text-lg leading-none">+</span>
            Crear nuevo cliente
          </button>

          <ul className="divide-y divide-slate-100 overflow-y-auto -mx-5 px-5">
            {clientesFiltrados.length === 0 && (
              <li className="text-sm text-dark-text-muted text-center py-6">
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
                    ${cliente.id === clienteSeleccionadoId ? 'bg-primary/10' : 'hover:bg-slate-50'}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-dark-text truncate">{cliente.nombre}</p>
                    {cliente.telefono && (
                      <p className="text-xs text-dark-text-muted">{cliente.telefono}</p>
                    )}
                  </div>
                  {cliente.id === clienteSeleccionadoId && (
                    <span className="text-primary font-bold flex-shrink-0">✓</span>
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