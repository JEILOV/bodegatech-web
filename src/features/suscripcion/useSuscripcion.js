import { useContext } from 'react'
import { SuscripcionContext } from './SuscripcionContext'

/**
 * Acceso al estado del plan y a las funciones de bloqueo suave.
 *
 * Uso típico en una función Pro:
 *
 *   const { verificarPro } = useSuscripcion()
 *
 *   function exportar() {
 *     if (!verificarPro('reportes')) return   // free: abre PlanesPage
 *     ...                                     // pro: continúa normal
 *   }
 *
 * Para límites por cantidad (plan gratuito con tope):
 *
 *   if (!verificarLimite('productos', totalActual)) return
 *
 * @returns {{
 *   plan: 'free' | 'pro',
 *   esPro: boolean,
 *   esFree: boolean,
 *   vencido: boolean,
 *   fechaVencimiento: Date | null,
 *   diasRestantes: number | null,
 *   cargandoPlan: boolean,
 *   abrirPlanes: (motivo?: string | null) => void,
 *   verificarPro: (motivo?: string) => boolean,
 *   verificarLimite: (motivo: string, cantidadActual: number) => boolean,
 * }}
 */
export function useSuscripcion() {
  const valor = useContext(SuscripcionContext)
  if (!valor) {
    throw new Error('useSuscripcion debe usarse dentro de <SuscripcionProvider>.')
  }
  return valor
}

export default useSuscripcion