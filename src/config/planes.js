/**
 * Configuración central del módulo de suscripción (Freemium / Plan Pro).
 *
 * Todo lo que puedas querer cambiar sin tocar componentes vive acá:
 * precios, límites del plan gratuito y los datos de cobro por Yape/Plin.
 *
 * ⚠️ ANTES DE PUBLICAR: reemplaza los datos de `PAGO` por los reales.
 *   - `numero`   → número que recibe los pagos de Yape/Plin.
 *   - `titular`  → nombre que aparece en Yape/Plin al pagar.
 *   - `whatsapp` → número al que llegan los comprobantes, con código de
 *                  país y solo dígitos (Perú = 51). Puede ser el mismo.
 *   - `qrSrc`    → coloca la imagen de tu QR en `public/qr-yape-plin.png`.
 */

export const PLAN_FREE = 'free'
export const PLAN_PRO = 'pro'

export const PRECIO_PRO_MENSUAL = 29.9

/** Días que suma cada activación del Plan Pro ("1 mes"). */
export const DIAS_PLAN_PRO = 30

/**
 * Límites del plan gratuito. El Plan Pro no tiene límites (ver
 * `verificarLimite` en SuscripcionProvider.jsx). Las claves coinciden
 * con el `motivo` que se le pasa a `verificarLimite`.
 */
export const LIMITES_FREE = {
  productos: 50,
  clientes: 10,
}

export const PAGO = {
  numero: '999 999 999',
  titular: 'Nombre del titular',
  whatsapp: '51999999999',
  qrSrc: '/qr-yape-plin.png',
}

/**
 * Qué se le explica al usuario según la función que intentó usar.
 * Las claves son los `motivo` que reciben `verificarPro` y
 * `verificarLimite`. Un motivo desconocido simplemente no muestra aviso.
 */
export const MENSAJES_MOTIVO = {
  reportes: 'Exportar reportes es parte del Plan Pro.',
  productos: `Llegaste al límite de ${LIMITES_FREE.productos} productos del plan gratuito.`,
  clientes: `El plan gratuito permite hasta ${LIMITES_FREE.clientes} clientes con fiado.`,
  whatsapp: 'Los mensajes masivos por WhatsApp son parte del Plan Pro.',
}

/**
 * Mensaje prellenado para enviar el comprobante por WhatsApp.
 *
 * @param {{ nombreBodega: string, correo: string }} datos
 */
export function construirMensajeComprobante({ nombreBodega, correo }) {
  return `Hola, adjunto mi comprobante de Yape/Plin para activar el Plan Pro en mi bodega: ${nombreBodega} (${correo}).`
}

/** Enlace `wa.me` con el mensaje del comprobante ya cargado. */
export function construirEnlaceComprobante({ nombreBodega, correo }) {
  const texto = encodeURIComponent(construirMensajeComprobante({ nombreBodega, correo }))
  return `https://wa.me/${PAGO.whatsapp}?text=${texto}`
}