export function QuickActions({ onNuevaVenta, onVerFiados, onVerInventario, onVerCierre }) {
  return (
    <div className="space-y-3">
      {/* Botón principal */}
      <button
        onClick={onNuevaVenta}
        className="w-full bg-primary text-white font-bold text-lg py-5 rounded-2xl
                   shadow-md active:scale-95 transition-transform duration-100
                   flex items-center justify-center gap-2"
      >
        <span className="text-2xl">🛒</span>
        NUEVA VENTA / ESCANEAR
      </button>

      <div className="grid grid-cols-3 gap-3">
        {/* Botón Clientes Fiados */}
        <button
          onClick={onVerFiados}
          className="bg-white border border-slate-200 text-dark-text font-semibold py-4
                     rounded-xl shadow-sm active:scale-95 transition-transform duration-100
                     flex flex-col items-center gap-1 cursor-pointer"
        >
          <span className="text-xl">📒</span>
          <span className="text-xs text-center">Clientes Fiados</span>
        </button>

        {/* Botón Ver Inventario */}
        <button
          onClick={onVerInventario}
          className="bg-white border border-slate-200 text-dark-text font-semibold py-4
                     rounded-xl shadow-sm active:scale-95 transition-transform duration-100
                     flex flex-col items-center gap-1 cursor-pointer"
        >
          <span className="text-xl">📦</span>
          <span className="text-xs text-center">Ver Inventario</span>
        </button>

        {/* Botón Cierre de Caja */}
        <button
          onClick={onVerCierre}
          className="bg-white border border-slate-200 text-dark-text font-semibold py-4
                     rounded-xl shadow-sm active:scale-95 transition-transform duration-100
                     flex flex-col items-center gap-1 cursor-pointer"
        >
          <span className="text-xl">🧮</span>
          <span className="text-xs text-center">Cierre de Caja</span>
        </button>
      </div>
    </div>
  )
}

export default QuickActions