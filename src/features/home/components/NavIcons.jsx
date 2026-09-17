/**
 * Set de íconos de línea (SVG, sin dependencias externas) para la
 * navegación y las métricas de HomeScreen. Reemplazan a los emojis
 * (🛒 📒 📦 🧮 ⚠️) que se veían informales/inconsistentes entre
 * dispositivos y sistemas operativos.
 *
 * Todos aceptan `className` para heredar color (currentColor) y tamaño
 * desde Tailwind, igual que cualquier ícono de una librería como
 * lucide-react — así el resto de la app puede seguir el mismo patrón.
 */

export function IconCarrito({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 4h2l2.4 12.2a2 2 0 002 1.8h8.2a2 2 0 002-1.6L20 8H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
    </svg>
  )
}

/** Libreta de fiados: representa el cuaderno de cuentas por cobrar. */
export function IconFiados({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 3.5h11a1.5 1.5 0 011.5 1.5v14a1 1 0 01-1.4.9L14 18.4l-3.1 1.5a1 1 0 01-.9 0L7 18.4l-1.1.5A1 1 0 014 18V6a2.5 2.5 0 012-2.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8.5 8h7M8.5 11.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** Caja de inventario. */
export function IconInventario({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3.5 8.5l8.5-4 8.5 4v7l-8.5 4-8.5-4v-7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 8.5L12 12.5l8.5-4M12 12.5V20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Calculadora: cierre de caja. */
export function IconCalculadora({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 7.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.9" fill="currentColor" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
      <circle cx="16" cy="12" r="0.9" fill="currentColor" />
      <circle cx="8" cy="15.5" r="0.9" fill="currentColor" />
      <circle cx="12" cy="15.5" r="0.9" fill="currentColor" />
      <circle cx="16" cy="15.5" r="0.9" fill="currentColor" />
    </svg>
  )
}

/** Triángulo de alerta: stock bajo. */
export function IconAlerta({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M10.6 4.3a1.6 1.6 0 012.8 0l8 14.2a1.6 1.6 0 01-1.4 2.4H4a1.6 1.6 0 01-1.4-2.4l8-14.2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 9.5v4.2M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** Flecha hacia arriba dentro de un círculo: ventas del día. */
export function IconTendencia({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 15l5-5 3.5 3.5L19 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14.5 7H19v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Reloj con signo de moneda: por cobrar / fiados. */
export function IconPorCobrar({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M11 8.5v7M9.3 13.7c.3.7 1 1.1 1.9 1.1 1.1 0 2-.6 2-1.6 0-2.2-3.9-1.2-3.9-3.4 0-1 .9-1.6 2-1.6.9 0 1.6.4 1.9 1.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Puerta con flecha de salida: cerrar sesión. */
export function IconCerrarSesion({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M9 4.5H6a1.5 1.5 0 00-1.5 1.5v12A1.5 1.5 0 006 19.5h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 8l4 4-4 4M9.5 12h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Tienda/bodega: avatar del encabezado. */
export function IconTienda({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 9.5l1-4.5h14l1 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 9.5a2.3 2.3 0 004.4 1 2.3 2.3 0 004.6 0 2.3 2.3 0 004.6 0 2.3 2.3 0 004.4-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 11v7A1.5 1.5 0 007 19.5h10a1.5 1.5 0 001.5-1.5v-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 19.5V15a1 1 0 011-1h2a1 1 0 011 1v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}