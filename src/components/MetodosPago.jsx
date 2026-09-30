import { useId } from 'react'
import { obtenerInfoMetodoPago } from '../utils/metodoPago'

/**
 * Íconos vectoriales de métodos de pago (reemplazan a los emojis 💵 📱 📲 📒 💳).
 *
 * - Yape y Plin usan sus colores de marca (#731085 / #0033A0 → #00D2FF).
 * - Efectivo, Fiado y Otro usan `currentColor`, así heredan el color del
 *   badge donde se coloquen (text-success, text-warning, etc.).
 * - Todos escalan con `className` (por defecto w-5 h-5).
 *
 * Nota: son marcas simplificadas trazadas a mano. Para uso comercial
 * definitivo, sustituye los paths de Yape/Plin por los SVG del kit de marca.
 */

/** Yape: cuadrado morado con una "y" geométrica blanca. */
export function LogoYape({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} role="img" aria-label="Yape">
      <rect width="32" height="32" rx="8" fill="#731085" />
      <path
        d="M9.5 9l6.9 10.5M22.5 9l-9 15.5"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Plin: cuadrado con degradado cian → azul y una "p" geométrica blanca. */
export function LogoPlin({ className = 'w-5 h-5' }) {
  // useId genera ids con ":" que rompen url(#…) en algunos navegadores.
  const idGradiente = `plin-${useId().replace(/:/g, '')}`

  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} role="img" aria-label="Plin">
      <defs>
        <linearGradient id={idGradiente} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00D2FF" />
          <stop offset="1" stopColor="#0033A0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${idGradiente})`} />
      <path
        d="M12 24V9h5a5.5 5.5 0 010 11h-5"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Efectivo: billete de trazo fino. Hereda el color del texto. */
export function IconoEfectivo({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} role="img" aria-label="Efectivo">
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 10v.01M18 14v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Fiado: libreta de cuentas. Hereda el color del texto. */
export function IconoFiado({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} role="img" aria-label="Fiado">
      <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9 8.5h6M9 12h6M9 15.5h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Otro método: tarjeta genérica. Hereda el color del texto. */
export function IconoOtroPago({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} role="img" aria-label="Otro método de pago">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 10h19M6 14.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const ICONOS = {
  yape: LogoYape,
  plin: LogoPlin,
  efectivo: IconoEfectivo,
  fiado: IconoFiado,
}

/**
 * Selector por clave: <IconoMetodoPago metodo="yape" className="w-4 h-4" />
 * Las claves son las mismas que usa venta.tipoPago / abono.medio.
 */
export function IconoMetodoPago({ metodo, className = 'w-5 h-5' }) {
  const Icono = ICONOS[metodo] || IconoOtroPago
  return <Icono className={className} />
}

/**
 * Badge de método de pago (logo + etiqueta) con el estilo definido en
 * utils/metodoPago.js. `className` sirve para márgenes (mt-1, mt-2...).
 */
export function BadgeMetodoPago({ metodo, className = '' }) {
  const { etiqueta, clases } = obtenerInfoMetodoPago(metodo)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${clases} ${className}`}
    >
      <IconoMetodoPago metodo={metodo} className="w-4 h-4" />
      {etiqueta}
    </span>
  )
}

export default IconoMetodoPago