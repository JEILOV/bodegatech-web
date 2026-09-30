import { IconDestello } from './IconosSuscripcion'

/**
 * Sello "Pro" para marcar, junto a un botón, que esa función es del
 * Plan Pro. Solo se dibuja cuando el usuario está en el plan gratuito
 * (el llamador decide con `esFree`).
 */
export function InsigniaPro({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5
                  text-[10px] font-bold leading-none text-amber-950 ${className}`}
    >
      <IconDestello className="w-2.5 h-2.5" />
      Pro
    </span>
  )
}

export default InsigniaPro