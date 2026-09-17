import { useState } from 'react'
import { actualizarProductoEnNube } from '../../../services/firestoreDataService'

export function EditarStockModal({ producto, onCerrar, onStockActualizado }) {
  const [modo, setModo] = useState('ajustar') // 'ajustar' | 'establecer'
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)

  const valorNumero = Number(valor)

  const nuevoStockCalculado =
    modo === 'ajustar'
      ? Math.max(producto.stock + (valorNumero || 0), 0)
      : Math.max(valorNumero || 0, 0)

  async function manejarGuardar() {
    if (valor.trim() === '' || Number.isNaN(valorNumero)) {
      alert('Ingresa un valor válido.')
      return
    }

    setGuardando(true)
    try {
      await actualizarProductoEnNube(producto.id, { stock: nuevoStockCalculado })
      onStockActualizado?.()
      onCerrar()
    } catch (error) {
      console.error('Error al actualizar stock:', error)
      alert('Ocurrió un error al actualizar el stock. Verifica tu conexión a internet.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-dark-text text-lg">Editar stock</h3>
          <button onClick={onCerrar} className="text-dark-text-muted text-xl font-bold px-2">
            ✕
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-sm text-dark-text-muted">{producto.nombre}</p>
          <p className="text-lg font-bold text-dark-text">Stock actual: {producto.stock}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setModo('ajustar')}
            className={`py-2 rounded-lg text-sm font-semibold border ${
              modo === 'ajustar'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-dark-text border-slate-200'
            }`}
          >
            Sumar / Restar
          </button>
          <button
            onClick={() => setModo('establecer')}
            className={`py-2 rounded-lg text-sm font-semibold border ${
              modo === 'establecer'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-dark-text border-slate-200'
            }`}
          >
            Nuevo valor
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-dark-text-muted">
            {modo === 'ajustar'
              ? 'Cantidad a sumar (o negativa para restar)'
              : 'Nuevo stock exacto'}
          </label>
          <input
            type="number"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
            placeholder={modo === 'ajustar' ? 'Ej: -3 o 10' : 'Ej: 20'}
            className="input-field mt-1"
            autoFocus
          />
        </div>

        {valor.trim() !== '' && !Number.isNaN(valorNumero) && (
          <p className="text-sm text-dark-text-muted">
            Stock resultante: <span className="font-bold text-dark-text">{nuevoStockCalculado}</span>
          </p>
        )}

        <button onClick={manejarGuardar} disabled={guardando} className="btn-primary w-full">
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

export default EditarStockModal