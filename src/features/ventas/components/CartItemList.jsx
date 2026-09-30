import { formatCurrency } from '../../../utils/formatCurrency'
import { formatearCantidadItem } from '../../../utils/granel'
import { IconEditar } from '../../home/NavIcons'

const CLASES_TARJETA = 'rounded-2xl bg-white border border-slate-200 shadow-sm p-4'

function IconPapelera({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CartItemList({ items, onIncrementar, onDecrementar, onEliminar, onEditarGranel }) {
  if (items.length === 0) {
    return (
      <div className={`${CLASES_TARJETA} text-center py-6`}>
        <p className="text-sm text-slate-500">
          El carrito está vacío. Escanea o busca un producto para empezar.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.productId}
          className={`${CLASES_TARJETA} flex items-center justify-between gap-3 py-3`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {item.nombre}
            </p>
            <p className="text-xs text-slate-500">
              {formatCurrency(item.precioUnitario)} {item.esGranel ? `/ ${item.unidadMedida}` : 'c/u'}
            </p>
          </div>

          {item.esGranel ? (
            // Producto a granel: no tiene sentido sumar/restar de a 1, así
            // que la cantidad se toca para reabrir el input rápido
            // (CantidadGranelModal) y corregir peso o monto.
            <button
              onClick={() => onEditarGranel(item.productId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800
                         font-semibold text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors duration-150 whitespace-nowrap"
            >
              {formatearCantidadItem(item)}
              <IconEditar className="w-3.5 h-3.5 text-slate-500" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onDecrementar(item.productId)}
                aria-label="Quitar una unidad"
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 active:bg-slate-300 transition-colors duration-150"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold text-slate-900">
                {item.cantidad}
              </span>
              <button
                onClick={() => onIncrementar(item.productId)}
                aria-label="Agregar una unidad"
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 active:bg-slate-300 transition-colors duration-150"
              >
                +
              </button>
            </div>
          )}

          <p className="w-16 text-right text-sm font-bold text-slate-900">
            {formatCurrency(item.precioUnitario * item.cantidad)}
          </p>

          <button
            onClick={() => onEliminar(item.productId)}
            className="flex w-8 h-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500
                       hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-colors duration-150 flex-shrink-0"
            aria-label="Eliminar producto"
          >
            <IconPapelera className="w-4 h-4" />
          </button>
        </li>
      ))}
    </ul>
  )
}

export default CartItemList