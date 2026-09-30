import { IconCarrito, IconFiados, IconInventario, IconCalculadora } from '../NavIcons'

function AccionSecundaria({ onClick, icono: Icono, etiqueta }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white py-4 shadow-sm
                 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 transition-colors duration-150
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700
                       group-hover:bg-slate-200 transition-colors duration-150">
        <Icono className="w-5 h-5" />
      </span>
      <span className="text-xs font-semibold text-slate-800 text-center leading-tight px-1">{etiqueta}</span>
    </button>
  )
}

export function QuickActions({ onNuevaVenta, onVerFiados, onVerInventario, onVerCierre }) {
  return (
    <div className="space-y-3">
      {/* Botón principal */}
      <button
        onClick={onNuevaVenta}
        className="w-full rounded-xl bg-slate-900 text-white font-semibold text-base py-4 shadow-sm
                   hover:bg-slate-800 active:bg-slate-950 transition-colors duration-150
                   flex items-center justify-center gap-2.5
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
      >
        <IconCarrito className="w-6 h-6" />
        Nueva venta / Escanear
      </button>

      <div className="grid grid-cols-3 gap-3">
        <AccionSecundaria onClick={onVerFiados} icono={IconFiados} etiqueta="Clientes fiados" />
        <AccionSecundaria onClick={onVerInventario} icono={IconInventario} etiqueta="Ver inventario" />
        <AccionSecundaria onClick={onVerCierre} icono={IconCalculadora} etiqueta="Cierre de caja" />
      </div>
    </div>
  )
}

export default QuickActions