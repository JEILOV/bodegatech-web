import { DIAS_PLAN_PRO, PLAN_FREE, PLAN_PRO } from '../config/planes'

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

/**
 * Nuevo vencimiento al activar "1 mes Pro" desde el panel de administración.
 *
 * - Bodega gratuita o con Pro vencido: 30 días desde hoy.
 * - Bodega con Pro vigente y fecha: 30 días desde ESA fecha, para que quien
 *   renueva antes de tiempo no pierda los días que ya pagó.
 *
 * Siempre queda al final del día (23:59:59 hora local) para que el plan
 * rija todo ese día y la fecha mostrada coincida con la esperada.
 *
 * @param {ReturnType<typeof calcularEstadoPlan>} estado
 * @param {Date} [ahora]
 * @returns {Date}
 */
export function calcularNuevoVencimiento(estado, ahora = new Date()) {
  const base =
    estado.esPro && estado.fechaVencimiento ? new Date(estado.fechaVencimiento) : new Date(ahora)
  base.setDate(base.getDate() + DIAS_PLAN_PRO)
  base.setHours(23, 59, 59, 999)
  return base
}

/** Minúsculas y sin tildes, para que "Peña" se encuentre escribiendo "pena". */
export function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}