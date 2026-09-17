import { IconCarrito, IconFiados, IconInventario, IconCalculadora } from '../../../components/icons/NavIcons'

const ACCIONES_SECUNDARIAS_BASE = 'flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white py-4 shadow-sm active:scale-95 transition-all duration-150 hover:border-primary-200 hover:shadow-md'

function AccionSecundaria({ onClick, icono: Icono, colorClases, etiqueta }) {
  return (
    <button onClick={onClick} className={ACCIONES_SECUNDARIAS_BASE}>
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorClases}`}>
        <Icono className="w-5 h-5" />
      </span>
      <span className="text-xs font-semibold text-dark-text text-center leading-tight px-1">{etiqueta}</span>
    </button>
  )
}

export function QuickActions({ onNuevaVenta, onVerFiados, onVerInventario, onVerCierre }) {
  return (
    <div className="space-y-3">
      {/* Botón principal */}
      <button
        onClick={onNuevaVenta}
        className="w-full rounded-2xl bg-gradient-to-r from-primary-600 to-purple-600 text-white
                   font-bold text-base py-4.5 shadow-lg shadow-primary-600/25 active:scale-[0.98]
                   transition-all duration-150 flex items-center justify-center gap-2.5"
      >
        <IconCarrito className="w-6 h-6" />
        Nueva venta / Escanear
      </button>

      <div className="grid grid-cols-3 gap-3">
        <AccionSecundaria
          onClick={onVerFiados}
          icono={IconFiados}
          colorClases="bg-warning-50 text-warning-600"
          etiqueta="Clientes fiados"
        />
        <AccionSecundaria
          onClick={onVerInventario}
          icono={IconInventario}
          colorClases="bg-primary-50 text-primary-600"
          etiqueta="Ver inventario"
        />
        <AccionSecundaria
          onClick={onVerCierre}
          icono={IconCalculadora}
          colorClases="bg-success-50 text-success-600"
          etiqueta="Cierre de caja"
        />
      </div>
    </div>
  )
}

export default QuickActions