import { PLAN_FREE, PLAN_PRO } from '../config/planes'

const MS_POR_DIA = 24 * 60 * 60 * 1000

/**
 * Convierte a `Date` cualquier formato en que pueda venir
 * `fechaVencimientoPro`:
 *   - Timestamp de Firestore (lo que guarda la consola al elegir fecha)
 *   - string ISO ("2026-10-30T23:59:00Z")
 *   - string "YYYY-MM-DD" (se toma como FIN de ese día en hora local:
 *     `new Date("2026-10-30")` sería medianoche UTC, o sea las 7 p. m.
 *     del día anterior en Perú, y el plan vencería un día antes)
 *   - número (milisegundos) o `Date`
 *
 * @returns {Date | null} null si no hay fecha o no es interpretable.
 */
export function aFecha(valor) {
  if (valor === null || valor === undefined || valor === '') return null

  if (typeof valor?.toDate === 'function') return valor.toDate()
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor

  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [anio, mes, dia] = valor.split('-').map(Number)
    return new Date(anio, mes - 1, dia, 23, 59, 59, 999)
  }

  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

/**
 * Estado efectivo del plan a partir del documento `users/{uid}`.
 *
 * - Sin campo `plan` (cuentas anteriores a este módulo) => gratuito.
 * - `plan: 'pro'` sin `fechaVencimientoPro` => Pro sin vencimiento.
 * - `plan: 'pro'` con fecha pasada => se trata como gratuito y se marca
 *   `vencido` para poder invitar a renovar.
 *
 * @param {object | null | undefined} perfil
 * @param {number} [ahora] - ms epoch; inyectable para pruebas.
 * @returns {{
 *   plan: 'free' | 'pro',
 *   esPro: boolean,
 *   vencido: boolean,
 *   fechaVencimiento: Date | null,
 *   diasRestantes: number | null,
 * }}
 */
export function calcularEstadoPlan(perfil, ahora = Date.now()) {
  const marcadoPro = perfil?.plan === PLAN_PRO
  const fechaVencimiento = marcadoPro ? aFecha(perfil?.fechaVencimientoPro) : null

  if (!marcadoPro) {
    return { plan: PLAN_FREE, esPro: false, vencido: false, fechaVencimiento: null, diasRestantes: null }
  }

  if (fechaVencimiento && fechaVencimiento.getTime() <= ahora) {
    return { plan: PLAN_FREE, esPro: false, vencido: true, fechaVencimiento, diasRestantes: 0 }
  }

  return {
    plan: PLAN_PRO,
    esPro: true,
    vencido: false,
    fechaVencimiento,
    diasRestantes: fechaVencimiento
      ? Math.max(1, Math.ceil((fechaVencimiento.getTime() - ahora) / MS_POR_DIA))
      : null,
  }
}

/** "30 de octubre de 2026" */
export function formatearFechaLarga(fecha) {
  return fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
}