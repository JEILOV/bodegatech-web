import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePerfilBodega } from '../../hooks/usePerfilBodega'
import { useEsAdmin } from '../../hooks/useEsAdmin'
import { useBackableState } from '../../hooks/useBackableState'
import { LIMITES_FREE } from '../../config/planes'
import { calcularEstadoPlan } from '../../utils/plan'
import { SuscripcionContext } from './SuscripcionContext'
import { PlanesPage } from './PlanesPage'

// setTimeout no admite esperas mayores a 2^31-1 ms (~24,8 días): si el
// vencimiento está más lejos, se vuelve a armar el temporizador al dispararse.
const ESPERA_MAXIMA_MS = 2 ** 31 - 1

/**
 * Entrega el plan de la bodega (`users/{uid}.plan` y `fechaVencimientoPro`)
 * a toda la app y monta el modal de planes.
 *
 * Bloqueo suave: `verificarPro` / `verificarLimite` NO lanzan errores ni
 * navegan a otra pantalla. Si el usuario es gratuito abren `PlanesPage`
 * encima de lo que estaba haciendo (los formularios y modales de abajo
 * siguen montados con sus datos) y devuelven `false` para que quien llama
 * simplemente corte esa acción.
 *
 * La decisión de bloquear se calcula con la hora del momento del clic
 * (no con la del último render), así un plan vencido nunca se cuela por
 * una pantalla que lleva días abierta.
 *
 * Importante: esto es una barrera de experiencia, no de seguridad. Lo que
 * impide que un usuario se ponga `plan: 'pro'` a sí mismo son las reglas
 * de Firestore (ver `match /users/{userId}` en firestore.rules).
 *
 * @param {object} props
 * @param {import('firebase/auth').User} props.usuario
 */
export function SuscripcionProvider({ usuario, children }) {
  const perfil = usePerfilBodega(usuario?.uid)
  const cargandoPlan = perfil === undefined

  // Administrador (documento `admins/{uid}`): habilita el acceso al panel
  // de planes. Vive acá para que Home y el panel lo lean del mismo lugar.
  const estadoAdmin = useEsAdmin(usuario?.uid)

  const [ahora, setAhora] = useState(() => Date.now())
  const [planesAbierto, setPlanesAbierto] = useState(false)
  const [motivo, setMotivo] = useState(null)

  const estado = useMemo(() => calcularEstadoPlan(perfil, ahora), [perfil, ahora])

  // Si el Plan Pro vence con la app abierta (PWA que se deja prendida en
  // el mostrador), refresca el estado justo después del vencimiento.
  useEffect(() => {
    if (!estado.esPro || !estado.fechaVencimiento) return undefined
    const espera = estado.fechaVencimiento.getTime() - Date.now() + 1000
    const temporizador = setTimeout(
      () => setAhora(Date.now()),
      Math.min(Math.max(espera, 0), ESPERA_MAXIMA_MS)
    )
    return () => clearTimeout(temporizador)
  }, [estado.esPro, estado.fechaVencimiento])

  const cerrarPlanes = useCallback(() => setPlanesAbierto(false), [])

  const abrirPlanes = useCallback((motivoApertura = null) => {
    setMotivo(motivoApertura)
    setPlanesAbierto(true)
  }, [])

  // Botón/gesto "Atrás" del celular: cierra el modal de planes primero.
  useBackableState(planesAbierto, cerrarPlanes)

  // Mientras llega el primer snapshot del perfil no se bloquea nada: un
  // usuario Pro no debe ver el muro de pago por unos milisegundos de carga.
  const esProAhora = useCallback(
    () => cargandoPlan || calcularEstadoPlan(perfil, Date.now()).esPro,
    [cargandoPlan, perfil]
  )

  const verificarPro = useCallback(
    (motivoBloqueo = null) => {
      if (esProAhora()) return true
      abrirPlanes(motivoBloqueo)
      return false
    },
    [esProAhora, abrirPlanes]
  )

  const verificarLimite = useCallback(
    (recurso, cantidadActual) => {
      const limite = LIMITES_FREE[recurso]
      if (limite === undefined) return true
      if (esProAhora()) return true
      if (cantidadActual < limite) return true
      abrirPlanes(recurso)
      return false
    },
    [esProAhora, abrirPlanes]
  )

  const nombreBodega = perfil?.nombreBodega || usuario?.displayName || 'Mi Bodega'
  const correo = usuario?.email || perfil?.email || ''

  const valor = useMemo(
    () => ({
      ...estado,
      esFree: !cargandoPlan && !estado.esPro,
      cargandoPlan,
      esAdmin: estadoAdmin === true,
      cargandoAdmin: estadoAdmin === undefined,
      abrirPlanes,
      cerrarPlanes,
      verificarPro,
      verificarLimite,
    }),
    [estado, cargandoPlan, estadoAdmin, abrirPlanes, cerrarPlanes, verificarPro, verificarLimite]
  )

  return (
    <SuscripcionContext.Provider value={valor}>
      {children}
      {planesAbierto && (
        <PlanesPage
          motivo={motivo}
          estado={estado}
          nombreBodega={nombreBodega}
          correo={correo}
          onCerrar={cerrarPlanes}
        />
      )}
    </SuscripcionContext.Provider>
  )
}

export default SuscripcionProvider