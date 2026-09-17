import { useState } from 'react'
import { crearClienteEnNube } from '../../../services/firestoreDataService'

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
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-dark-text text-lg">Nuevo cliente</h3>
          <button onClick={onCerrar} className="text-dark-text-muted text-xl font-bold px-2">
            ✕
          </button>
        </div>

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

        <button onClick={manejarGuardar} disabled={guardando} className="btn-primary w-full">
          {guardando ? 'Guardando...' : 'Guardar cliente'}
        </button>
      </div>
    </div>
  )
}

export default NuevoClienteModal