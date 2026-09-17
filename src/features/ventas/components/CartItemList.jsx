import { formatCurrency } from '../../../utils/formatCurrency'
import { formatearCantidadItem } from '../../../utils/granel'

export function CartItemList({ items, onIncrementar, onDecrementar, onEliminar, onEditarGranel }) {
  if (items.length === 0) {
    return (
      <div className="card text-center py-6">
        <p className="text-sm text-dark-text-muted">
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
          className="card flex items-center justify-between gap-3 py-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-dark-text truncate">
              {item.nombre}
            </p>
            <p className="text-xs text-dark-text-muted">
              {formatCurrency(item.precioUnitario)} {item.esGranel ? `/ ${item.unidadMedida}` : 'c/u'}
            </p>
          </div>

          {item.esGranel ? (
            // Producto a granel: no tiene sentido sumar/restar de a 1, así
            // que la cantidad se toca para reabrir el input rápido
            // (CantidadGranelModal) y corregir peso o monto.
            <button
              onClick={() => onEditarGranel(item.productId)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 text-dark-text font-semibold text-sm active:scale-95 whitespace-nowrap"
            >
              {formatearCantidadItem(item)} ✏️
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onDecrementar(item.productId)}
                className="w-8 h-8 rounded-lg bg-slate-100 text-dark-text font-bold active:scale-95"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold text-dark-text">
                {item.cantidad}
              </span>
              <button
                onClick={() => onIncrementar(item.productId)}
                className="w-8 h-8 rounded-lg bg-slate-100 text-dark-text font-bold active:scale-95"
              >
                +
              </button>
            </div>
          )}

          <p className="w-16 text-right text-sm font-bold text-dark-text">
            {formatCurrency(item.precioUnitario * item.cantidad)}
          </p>

          <button
            onClick={() => onEliminar(item.productId)}
            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 font-bold active:scale-95 flex-shrink-0"
            aria-label="Eliminar producto"
          >
            🗑
          </button>
        </li>
      ))}
    </ul>
  )
}

export default CartItemList