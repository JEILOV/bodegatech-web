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

/** Lupa: buscadores de productos/clientes. */
export function IconBuscar({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19.5 19.5l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** Signo "+" dentro de un contorno: crear registros nuevos. */
export function IconMas({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Cámara: escaneo de código de barras / entrada de mercadería. */
export function IconCamara({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 8.5A1.5 1.5 0 015.5 7h2l1-1.6A1.5 1.5 0 019.8 4.7h4.4a1.5 1.5 0 011.3.7L16.5 7h2A1.5 1.5 0 0120 8.5v9A1.5 1.5 0 0118.5 19h-13A1.5 1.5 0 014 17.5v-9z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

/** Impresora: imprimir tickets y listas de reposición. */
export function IconImprimir({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M7 8.5V4.5a1 1 0 011-1h8a1 1 0 011 1v4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <rect x="4" y="8.5" width="16" height="8" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 15.5h10v4a1 1 0 01-1 1H8a1 1 0 01-1-1v-4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7.2 11.5h1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

/** Flecha hacia una bandeja: descargar/exportar archivos (CSV, PDF). */
export function IconDescargar({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3.5v11M8 11l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4.5 16v2.5A1.5 1.5 0 006 20h12a1.5 1.5 0 001.5-1.5V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Burbuja de chat: recordatorios / mensajes (WhatsApp, compartir). */
export function IconChat({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 12.4C4 7.8 7.8 4 12.4 4s8.4 3.8 8.4 8.4-3.8 8.4-8.4 8.4c-1.3 0-2.6-.3-3.7-.9L4 21l1.1-4.4c-.7-1.2-1.1-2.6-1.1-4.2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8.7 12.2c.3 2 2.2 3.9 4.2 4.2.9.1 1.1-.5 1-1.1l-.2-.8c0-.3.1-.5.4-.6l1-.3c.5-.1.9.1 1 .5l.2 1c.1.5-.1 1-.6 1.2-1.1.5-2.9.4-4.7-1-1.8-1.4-2.6-3.1-2.7-4.3 0-.5.4-.9.9-1l1-.1c.4 0 .7.2.8.6l.2 1c.1.3 0 .5-.2.7l-.6.6" fill="currentColor" />
    </svg>
  )
}

/** Lápiz: editar un registro existente. */
export function IconEditar({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M15.7 4.3a1.7 1.7 0 012.4 0l1.6 1.6a1.7 1.7 0 010 2.4L8.5 19.5l-4.5 1 1-4.5L15.7 4.3z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M13.8 6.2l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

/** Balanza: productos vendidos a granel/por peso. */
export function IconBalanza({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 4v16M8.5 20h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5 6.5h14M5 6.5L2.5 12a2.5 2.5 0 005 0L5 6.5zM19 6.5L16.5 12a2.5 2.5 0 005 0L19 6.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

/** Caja cerrada con cinta: registrar producto por unidad. */
export function IconCaja({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="8" width="16" height="11" rx="1.2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M4 12h16M12 8v11" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 8l1.8-3.5h3.4L15.5 8" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

/** Chevron doble: expandir/colapsar una lista. */
export function IconChevron({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Palomita dentro de un círculo: confirmación / todo saludable. */
export function IconCheckCirculo({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 12.3l2.6 2.6L16.3 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Ticket/recibo: comprobante de venta. */
export function IconTicket({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3v-17z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** X dentro de un círculo suave: cerrar modales. */
export function IconCerrar({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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