import { formatCurrency } from '../../../utils/formatCurrency'

export function CartItemList({ items, onIncrementar, onDecrementar, onEliminar }) {
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
              {formatCurrency(item.precioUnitario)} c/u
            </p>
          </div>

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