import { useState } from 'react'
import { formatCurrency } from '../../../utils/formatCurrency'
import {
  calcularCantidadPorMonto,
  calcularTotalPorCantidad,
  formatearCantidadGranel,
} from '../../../utils/granel'
import { IconCerrar } from '../../home/NavIcons'

/**
 * Input rápido para productos a granel/peso (carne, arroz, azúcar,
 * pollo...), con dos modos intercambiables:
 *
 *  a) "Por Peso/Fracción": el bodeguero digita la cantidad (ej. 1.5 kg)
 *     y el total se calcula como cantidad × precio/unidad.
 *  b) "Por Monto Fijo (S/)": el bodeguero digita cuánto va a pagar el
 *     cliente (ej. S/ 5.00) y la cantidad equivalente sale de
 *     monto ÷ precio/unidad.
 *
 * Se usa tanto para agregar un producto a granel al carrito por primera
 * vez como para editar la cantidad de uno que ya está en el carrito
 * (`cantidadInicial`).
 */
export function CantidadGranelModal({ producto, cantidadInicial, onConfirmar, onCerrar }) {
  const [modo, setModo] = useState('peso') // 'peso' | 'monto'
  const [valorPeso, setValorPeso] = useState(cantidadInicial ? String(cantidadInicial) : '')
  const [valorMonto, setValorMonto] = useState('')

  const precioPorUnidad = producto.precioVenta

  const cantidadCalculada =
    modo === 'peso'
      ? Number(valorPeso) || 0
      : calcularCantidadPorMonto(Number(valorMonto) || 0, precioPorUnidad)

  const totalCalculado =
    modo === 'peso'
      ? calcularTotalPorCantidad(Number(valorPeso) || 0, precioPorUnidad)
      : Number(valorMonto) || 0

  const esValido = cantidadCalculada > 0

  function manejarConfirmar() {
    if (!esValido) {
      alert(`Ingresa una cantidad o un monto mayor a cero.`)
      return
    }
    onConfirmar(cantidadCalculada)
    onCerrar()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-lg tracking-tight">Producto a granel</h3>
          <button onClick={onCerrar} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500
                       hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900">
            <IconCerrar className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-sm font-semibold text-slate-900">{producto.nombre}</p>
          <p className="text-xs text-dark-text-muted">
            {formatCurrency(precioPorUnidad)} por {producto.unidadMedida}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setModo('peso')}
            className={`py-2.5 rounded-xl text-sm font-semibold border ${
              modo === 'peso'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            Por Peso
          </button>
          <button
            type="button"
            onClick={() => setModo('monto')}
            className={`py-2.5 rounded-xl text-sm font-semibold border ${
              modo === 'monto'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            Por Monto (S/)
          </button>
        </div>

        {modo === 'peso' ? (
          <div>
            <label className="text-xs font-medium text-dark-text-muted">
              Cantidad ({producto.unidadMedida})
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              value={valorPeso}
              onChange={(evento) => setValorPeso(evento.target.value)}
              placeholder={`Ej: 1.5`}
              className="input-field mt-1"
              autoFocus
            />
          </div>
        ) : (
          <div>
            <label className="text-xs font-medium text-dark-text-muted">Monto a pagar (S/)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={valorMonto}
              onChange={(evento) => setValorMonto(evento.target.value)}
              placeholder="Ej: 5.00"
              className="input-field mt-1"
              autoFocus
            />
          </div>
        )}

        {/* Resultado calculado en vivo, en ambos modos */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-dark-text-muted">
            {modo === 'peso' ? 'Total a cobrar' : 'Cantidad equivalente'}
          </span>
          <span className="text-lg font-bold text-slate-900">
            {modo === 'peso'
              ? formatCurrency(totalCalculado)
              : `${formatearCantidadGranel(cantidadCalculada)} ${producto.unidadMedida}`}
          </span>
        </div>

        <button
          onClick={manejarConfirmar}
          disabled={!esValido}
          className="w-full rounded-xl bg-slate-900 text-white font-semibold py-3 shadow-sm
                     hover:bg-slate-800 active:bg-slate-950 transition-colors duration-150
                     disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          {cantidadInicial ? 'Actualizar cantidad' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  )
}

export default CantidadGranelModal