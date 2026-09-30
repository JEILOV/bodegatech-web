import { useState } from 'react'
import { crearClienteEnNube } from '../../../services/firestoreDataService'
import { db } from '../../../db/dexie'
import { useSuscripcion } from '../../suscripcion/useSuscripcion'
import { IconCerrar } from '../../home/NavIcons'

export function NuevoClienteModal({ onCerrar, onClienteCreado }) {
  const { verificarLimite } = useSuscripcion()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function manejarGuardar() {
    if (!nombre.trim()) {
      alert('Ingresa el nombre del cliente.')
      return
    }

    setGuardando(true)
    try {
      // Bloqueo suave del límite de clientes con fiado del plan gratuito.
      // Se verifica acá (y no en cada botón "Nuevo cliente") porque este
      // modal se abre desde Fiados y desde el selector de clientes de Ventas.
      // PlanesPage se abre encima: el nombre y teléfono ya escritos se conservan.
      const totalClientes = await db.customers.count()
      if (!verificarLimite('clientes', totalClientes)) return

      const nuevoClienteId = `cust-${Date.now()}`
      await crearClienteEnNube({
        id: nuevoClienteId,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        deudaTotal: 0,
      })
      onClienteCreado?.(nuevoClienteId)
      onCerrar()
    } catch (error) {
      console.error('Error al crear cliente:', error)
      alert('Ocurrió un error al guardar el cliente. Verifica tu conexión a internet.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Encabezado sobrio: fondo blanco y borde inferior sutil */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-lg tracking-tight">Nuevo cliente</h3>
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

        <div className="p-5 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-dark-text-muted">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                placeholder="Ej: Juan Pérez"
                className="input-field mt-1"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-medium text-dark-text-muted">Teléfono (opcional)</label>
              <input
                type="tel"
                value={telefono}
                onChange={(evento) => setTelefono(evento.target.value)}
                placeholder="Ej: 987654321"
                className="input-field mt-1"
              />
            </div>
          </div>

          <button
            onClick={manejarGuardar}
            disabled={guardando}
            className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold py-3.5
                       rounded-xl shadow-sm transition-colors duration-150
                       disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            {guardando ? 'Guardando...' : 'Guardar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NuevoClienteModal