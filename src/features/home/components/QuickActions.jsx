export function QuickActions({ onNuevaVenta, onVerFiados, onVerInventario }) {
  return (
    <div className="space-y-3">
      {/* Acción principal: pensada para pulgar único, uso con una mano */}
      <button
        onClick={onNuevaVenta}
        className="w-full bg-primary text-white font-bold text-lg py-5 rounded-2xl
                   shadow-md active:scale-95 transition-transform duration-100
                   flex items-center justify-center gap-2"
      >
        <span className="text-2xl">🛒</span>
        NUEVA VENTA / ESCANEAR
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onVerFiados}
          className="bg-white border border-slate-200 text-dark-text font-semibold py-4
                     rounded-xl shadow-sm active:scale-95 transition-transform duration-100
                     flex flex-col items-center gap-1"
        >
          <span className="text-xl">📒</span>
          <span className="text-sm">Clientes Fiados</span>
        </button>

        <button
          onClick={onVerInventario}
          className="bg-white border border-slate-200 text-dark-text font-semibold py-4
                     rounded-xl shadow-sm active:scale-95 transition-transform duration-100
                     flex flex-col items-center gap-1"
        >
          <span className="text-xl">📦</span>
          <span className="text-sm">Ver Inventario</span>
        </button>
      </div>
    </div>
  )
}

export default QuickActions