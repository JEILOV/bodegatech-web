import { useState } from 'react'
import { crearClienteEnNube } from '../../../services/firestoreDataService'
import { IconCerrar } from '../../home/NavIcons'

export function NuevoClienteModal({ onCerrar, onClienteCreado }) {
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
        {/* Encabezado con gradiente, en sintonía con AuthPage/HomeScreen */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-purple-600 px-5 py-4 flex items-center justify-between">
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
          <h3 className="relative font-bold text-white text-lg">Nuevo cliente</h3>
          <button
            onClick={onCerrar}
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white
                       hover:bg-white/25 active:scale-90 transition-all duration-150"
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
            className="w-full bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold py-3.5
                       rounded-xl shadow-md shadow-primary-600/20 active:scale-95 transition-all duration-150
                       disabled:opacity-50 disabled:pointer-events-none"
          >
            {guardando ? 'Guardando...' : 'Guardar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NuevoClienteModal