import { useEffect, useRef, useState } from 'react'
import {
  LIMITES_FREE,
  MENSAJES_MOTIVO,
  PAGO,
  PRECIO_PRO_MENSUAL,
  construirEnlaceComprobante,
} from '../../config/planes'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatearFechaLarga } from '../../utils/plan'
import { IconChat } from '../home/NavIcons'
import { IconCheck, IconCopiar, IconFlechaIzquierda, IconInfo } from './IconosSuscripcion'

const BENEFICIOS_FREE = [
  'Ventas al contado, Yape, Plin y fiado',
  `Hasta ${LIMITES_FREE.productos} productos en tu catálogo`,
  `Hasta ${LIMITES_FREE.clientes} clientes con fiado`,
  'Alertas de stock bajo en tu pantalla de inicio',
  'Cierre de caja y reporte de ventas en pantalla',
]

const BENEFICIOS_PRO = [
  'Todo lo del plan gratuito, sin topes',
  'Clientes con fiado ilimitados',
  'Reportes en Excel y PDF',
  'Lista de reposición para tus proveedores',
  'Catálogo de productos ilimitado',
]

const PASOS_PAGO = [
  `Escanea el QR desde Yape o Plin, o paga al número de arriba: ${formatCurrency(PRECIO_PRO_MENSUAL)}.`,
  'Toma una captura del comprobante.',
  'Toca el botón verde: se abre WhatsApp con el mensaje listo. Adjunta la captura y envía.',
]

/**
 * Aviso de arriba: explica por qué se abrió la pantalla (función Pro que
 * intentó usar) o informa el estado del plan si ya tiene/tuvo Pro.
 */
function construirAviso({ motivo, estado }) {
  if (estado.vencido && estado.fechaVencimiento) {
    return {
      tono: 'alerta',
      texto: `Tu Plan Pro venció el ${formatearFechaLarga(estado.fechaVencimiento)}. Renuévalo para recuperar reportes y límites sin tope.`,
    }
  }

  if (estado.esPro) {
    const hasta = estado.fechaVencimiento
      ? ` hasta el ${formatearFechaLarga(estado.fechaVencimiento)} (${
          estado.diasRestantes === 1 ? 'queda 1 día' : `quedan ${estado.diasRestantes} días`
        })`
      : ''
    return { tono: 'ok', texto: `Tu Plan Pro está activo${hasta}.` }
  }

  const mensaje = MENSAJES_MOTIVO[motivo]
  if (mensaje) {
    return {
      tono: 'alerta',
      texto: `${mensaje} Cierra esta pantalla cuando quieras: tu trabajo sigue donde lo dejaste.`,
    }
  }

  return null
}

const ESTILOS_AVISO = {
  alerta: 'bg-warning-50 border-warning-100 text-warning-700',
  ok: 'bg-success-50 border-success-100 text-success-700',
}

/**
 * Pantalla de planes (Gratuito vs. Bodega Pro) y cobro semimanual por
 * Yape/Plin. Se muestra como capa a pantalla completa por encima de la
 * pantalla actual (la abre `SuscripcionProvider`), así quien la cierra
 * vuelve exactamente a lo que estaba haciendo.
 *
 * Flujo: "planes" -> [Activar Plan Pro] -> "pago" (QR, número, titular y
 * botón de WhatsApp para enviar el comprobante). La activación la hace
 * una persona: edita `plan` y `fechaVencimientoPro` en `users/{uid}`.
 *
 * @param {object} props
 * @param {string | null} props.motivo - función que disparó la apertura
 * @param {ReturnType<typeof import('../../utils/plan').calcularEstadoPlan>} props.estado
 * @param {string} props.nombreBodega
 * @param {string} props.correo
 * @param {() => void} props.onCerrar
 */
export function PlanesPage({ motivo = null, estado, nombreBodega, correo, onCerrar }) {
  const [paso, setPaso] = useState('planes') // 'planes' | 'pago'
  const [copiado, setCopiado] = useState(false)
  const [qrNoCargo, setQrNoCargo] = useState(false)

  const contenedorRef = useRef(null)
  const botonNavegarRef = useRef(null)

  const aviso = construirAviso({ motivo, estado })
  const esRenovacion = estado.esPro || estado.vencido
  const enPago = paso === 'pago'

  // Foco inicial en el botón de volver/cerrar (accesibilidad con teclado
  // y lector de pantalla) y cierre con Escape.
  useEffect(() => {
    botonNavegarRef.current?.focus()

    function manejarTecla(evento) {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', manejarTecla)
    return () => window.removeEventListener('keydown', manejarTecla)
  }, [onCerrar])

  // Al cambiar de paso, vuelve al inicio de la capa (en el celular el
  // paso "pago" es más corto que "planes" y quedaría mal posicionado).
  useEffect(() => {
    contenedorRef.current?.scrollTo({ top: 0 })
  }, [paso])

  // El texto "Copiado" vuelve a "Copiar" solo, tras un momento.
  useEffect(() => {
    if (!copiado) return undefined
    const temporizador = setTimeout(() => setCopiado(false), 2000)
    return () => clearTimeout(temporizador)
  }, [copiado])

  async function copiarNumero() {
    const soloDigitos = PAGO.numero.replace(/\D/g, '')
    try {
      await navigator.clipboard.writeText(soloDigitos)
      setCopiado(true)
    } catch (error) {
      // Sin permiso de portapapeles (HTTP, navegador antiguo...): el
      // número sigue visible en pantalla para copiarlo a mano.
      console.warn('[PlanesPage] No se pudo copiar el número al portapapeles:', error)
    }
  }

  function manejarNavegar() {
    if (enPago) {
      setPaso('planes')
    } else {
      onCerrar()
    }
  }

  return (
    <div
      ref={contenedorRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="planes-titulo"
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-slate-50"
    >
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-purple-600 px-5 pt-8 pb-16 rounded-b-3xl shadow-lg shadow-primary-600/20">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

        <div className="relative mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <button
              ref={botonNavegarRef}
              onClick={manejarNavegar}
              aria-label={enPago ? 'Volver a los planes' : 'Cerrar y volver a lo que estabas haciendo'}
              className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white
                         active:scale-90 transition-transform duration-100 hover:bg-white/25
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <IconFlechaIzquierda />
            </button>
            <h1 id="planes-titulo" className="text-white font-bold text-xl">
              {enPago ? 'Activar Plan Pro' : 'Planes de BodegaTech'}
            </h1>
          </div>

          <p className="mt-3 max-w-md text-sm text-white/80">
            {enPago
              ? 'Paga con Yape o Plin y envíanos el comprobante por WhatsApp.'
              : 'Empieza gratis. Pasa a Pro cuando tu bodega necesite más.'}
          </p>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 -mt-9 pb-12 space-y-4">
        {aviso && (
          <div
            role="status"
            className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium ${ESTILOS_AVISO[aviso.tono]}`}
          >
            <IconInfo className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{aviso.texto}</p>
          </div>
        )}

        {!enPago && (
          <>
            {/* En el celular el Plan Pro va primero (order-1): es lo que se
                quiere ver sin hacer scroll. En pantallas anchas se
                respeta el orden natural gratuito -> Pro. */}
            <div className="grid gap-5 pt-3 md:grid-cols-2 md:items-stretch">
              <section
                aria-labelledby="plan-free-titulo"
                className="order-2 md:order-1 flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 id="plan-free-titulo" className="font-bold text-dark-text text-lg">
                    Plan gratuito
                  </h2>
                  {!estado.esPro && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-dark-text-light">
                      Tu plan actual
                    </span>
                  )}
                </div>

                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-dark-text">{formatCurrency(0)}</span>
                  <span className="text-sm text-dark-text-muted">sin costo</span>
                </p>

                <ul className="mt-5 space-y-3 flex-1">
                  {BENEFICIOS_FREE.map((beneficio) => (
                    <li key={beneficio} className="flex items-start gap-2.5 text-sm text-dark-text-light">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-600">
                        <IconCheck />
                      </span>
                      {beneficio}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onCerrar}
                  className="mt-6 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold
                             text-dark-text hover:border-primary-200 active:scale-95 transition-all duration-150"
                >
                  {estado.esPro ? 'Volver' : 'Seguir con el plan gratuito'}
                </button>
              </section>

              <section
                aria-labelledby="plan-pro-titulo"
                className="order-1 md:order-2 relative flex flex-col rounded-2xl bg-gradient-to-br from-primary-600 to-purple-600
                           p-5 text-white shadow-xl shadow-primary-600/25"
              >
                <span className="absolute -top-3 left-5 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950 shadow-md">
                  Recomendado
                </span>
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                  <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
                </div>

                <h2 id="plan-pro-titulo" className="relative mt-1 font-bold text-lg">
                  Plan Bodega Pro
                </h2>

                <p className="relative mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold">{formatCurrency(PRECIO_PRO_MENSUAL)}</span>
                  <span className="text-sm text-white/75">/ mes</span>
                </p>

                <ul className="relative mt-5 space-y-3 flex-1">
                  {BENEFICIOS_PRO.map((beneficio) => (
                    <li key={beneficio} className="flex items-start gap-2.5 text-sm text-white/95">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                        <IconCheck />
                      </span>
                      {beneficio}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setPaso('pago')}
                  className="relative mt-6 w-full rounded-xl bg-white py-3.5 text-base font-bold text-primary-700
                             shadow-md active:scale-95 transition-transform duration-100
                             focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {esRenovacion ? 'Renovar Plan Pro' : 'Activar Plan Pro'}
                </button>
                <p className="relative mt-2 text-center text-xs text-white/75">
                  Pagas por Yape o Plin. Activamos tu plan manualmente.
                </p>
              </section>
            </div>
          </>
        )}

        {enPago && (
          <section
            aria-label="Pago del Plan Pro"
            className="mx-auto max-w-md space-y-5 rounded-2xl bg-white border border-slate-100 shadow-sm p-5"
          >
            <div>
              <h2 className="text-lg font-bold text-dark-text">
                Paga {formatCurrency(PRECIO_PRO_MENSUAL)} con Yape o Plin
              </h2>
              <p className="mt-0.5 text-sm text-dark-text-muted">Plan Bodega Pro, 1 mes</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3">
                {qrNoCargo ? (
                  <p className="text-center text-sm text-dark-text-muted">
                    No pudimos cargar el QR. Paga al número que aparece abajo.
                  </p>
                ) : (
                  <img
                    src={PAGO.qrSrc}
                    alt="Código QR de Yape y Plin para pagar el Plan Pro"
                    className="h-full w-full object-contain"
                    onError={() => setQrNoCargo(true)}
                  />
                )}
              </div>
              <p className="text-xs text-dark-text-muted">Escanéalo desde Yape o Plin</p>
            </div>

            <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="text-dark-text-muted">Número</dt>
                <dd className="flex items-center gap-2 font-bold text-dark-text tabular-nums">
                  {PAGO.numero}
                  <button
                    onClick={copiarNumero}
                    aria-label="Copiar número de Yape y Plin"
                    className="flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-1 text-xs font-semibold
                               text-primary-700 hover:bg-primary-100 active:scale-95 transition-all duration-150"
                  >
                    <IconCopiar className="h-3.5 w-3.5" />
                    {copiado ? 'Copiado' : 'Copiar'}
                  </button>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="text-dark-text-muted">Titular</dt>
                <dd className="text-right font-bold text-dark-text">{PAGO.titular}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="text-dark-text-muted">Monto</dt>
                <dd className="font-bold text-dark-text tabular-nums">{formatCurrency(PRECIO_PRO_MENSUAL)}</dd>
              </div>
            </dl>

            <p aria-live="polite" className="sr-only">
              {copiado ? 'Número copiado al portapapeles' : ''}
            </p>

            <ol className="space-y-3">
              {PASOS_PAGO.map((texto, indice) => (
                <li key={texto} className="flex items-start gap-3 text-sm text-dark-text-light">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">
                    {indice + 1}
                  </span>
                  <span className="pt-0.5">{texto}</span>
                </li>
              ))}
            </ol>

            <a
              href={construirEnlaceComprobante({ nombreBodega, correo })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-base
                         font-bold text-white shadow-md active:scale-95 transition-transform duration-100"
            >
              <IconChat className="h-5 w-5" />
              Enviar comprobante por WhatsApp
            </a>

            <p className="text-center text-xs text-dark-text-muted">
              El mensaje incluye el nombre de tu bodega y tu correo para que podamos ubicar tu cuenta.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

export default PlanesPage