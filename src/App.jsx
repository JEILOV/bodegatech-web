import { useEffect, useRef, useState } from 'react'
import { observarEstadoAuth, cerrarSesion } from './services/authService'
import { iniciarSincronizacionEnTiempoReal } from './services/syncService'
import { limpiarBaseDatosLocal } from './db/dexie'
import { useBackableState } from './hooks/useBackableState'
import { AuthPage } from './features/auth/AuthPage'
import { HomeScreen } from './features/home/HomeScreen'
import { VentasPage } from './features/ventas/VentasPage'
import { CierreCajaPage } from './features/ventas/CierreCajaPage'
import { FiadosPage } from './features/fiados/FiadosPage'
import { InventarioPage } from './features/inventario/InventarioPage'

// Tiempo máximo que esperamos la primera descarga de Firestore antes de
// continuar igual con lo que haya en Dexie (por ejemplo, sin internet).
const TIEMPO_MAXIMO_ESPERA_NUBE_MS = 4000

/**
 * Spinner + mensaje, reutilizado por los dos estados de carga bloqueantes
 * (verificando sesión / hidratando desde la nube). Nunca deja pasar a
 * HomeScreen (y por lo tanto a MetricsHeader) mientras está visible.
 */
function PantallaDeCarga({ mensaje }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
      <div
        className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-primary animate-spin"
        role="status"
        aria-label="Cargando"
      />
      <p className="text-sm text-dark-text-muted">{mensaje}</p>
    </div>
  )
}

function App() {
  const [pantalla, setPantalla] = useState('home')
  const [usuario, setUsuario] = useState(null)
  const [verificandoSesion, setVerificandoSesion] = useState(true)
  const [hidratandoNube, setHidratandoNube] = useState(true)

  // Evita relanzar toda la hidratación (y, con ella, el riesgo de tocar
  // Dexie de nuevo) cuando Firebase Auth emite un usuario con la MISMA
  // sesión pero una referencia de objeto distinta (por ejemplo al
  // refrescar el ID token en segundo plano). Solo nos importa reaccionar
  // cuando el UID realmente cambia (login/logout).
  const uidHidratadoRef = useRef(null)

  // Guarda el UID de la última sesión que efectivamente llegó a
  // hidratarse, para poder distinguir "cambio real de cuenta" (uid
  // anterior != null y distinto del nuevo) de un primer login (uid
  // anterior === null). Es independiente de `uidHidratadoRef`: ese se
  // resetea a null en cada logout, mientras que este conserva el último
  // uid conocido incluso mientras `usuario` es null, para poder
  // comparar en cuanto llega el siguiente.
  const uidAnteriorRef = useRef(null)

  // Navegación resiliente al botón/gesto "Atrás" nativo del celular:
  // cada vez que `pantalla` deja de ser 'home' (Ventas, Inventario,
  // Fiados, Cierre de Caja), se agrega una entrada al historial del
  // navegador. Si el usuario presiona Atrás, en vez de salir de la app
  // o refrescar la página, el hook detecta el `popstate` y nos regresa
  // a Home mediante el mismo setState que ya usan los botones "←" de
  // cada pantalla (`onVolver`).
  useBackableState(pantalla !== 'home', () => setPantalla('home'))

  useEffect(() => {
    const cancelarSuscripcion = observarEstadoAuth((usuarioActual) => {
      setUsuario(usuarioActual)
      setVerificandoSesion(false)
    })

    return cancelarSuscripcion
  }, [])

  // Cloud-first: en cuanto hay un usuario autenticado, Firestore pasa a ser
  // la fuente de la verdad. Nos suscribimos en tiempo real a products,
  // sales, customers y movements; cualquier venta, abono o restock hecho
  // desde OTRO dispositivo llega aquí solo, sin recargar ni borrar caché.
  useEffect(() => {
    if (!usuario) {
      uidHidratadoRef.current = null
      setHidratandoNube(true)
      return
    }

    // Ya hidratamos esta misma sesión (mismo UID); un cambio de
    // referencia de `usuario` por refresco de token no debe volver a
    // reabrir los listeners de Firestore.
    if (uidHidratadoRef.current === usuario.uid) {
      return
    }

    let cancelado = false
    let detenerSincronizacion = () => {}

    async function hidratarYSuscribirse() {
      setHidratandoNube(true)

      // Red de seguridad ADEMÁS de la limpieza que ya hace authService
      // (login/registro/logout): si el uid que estamos por hidratar es
      // distinto al último que esta pestaña hidrató (cambio real de
      // cuenta, no un primer login ni un refresco de token), forzamos
      // igual `limpiarBaseDatosLocal()` antes de reabrir los listeners.
      // Así, aunque el borrado de authService no haya corrido en esta
      // pestaña (por ejemplo, sesión cerrada/iniciada desde otra
      // pestaña/dispositivo), nunca se reabren los listeners de
      // syncService.js sobre una tabla que todavía tenga datos de la
      // cuenta anterior.
      const esCambioRealDeCuenta =
        uidAnteriorRef.current !== null && uidAnteriorRef.current !== usuario.uid

      if (esCambioRealDeCuenta) {
        await limpiarBaseDatosLocal()
      }

      const { cancelarTodo, listoParaUsar } = iniciarSincronizacionEnTiempoReal(usuario.uid)
      detenerSincronizacion = cancelarTodo

      // Esperamos la primera descarga real de cada colección (con un tope
      // de 4s si no hay internet ni caché local de Firestore disponible)
      // antes de dejar pasar a HomeScreen. Ya NO se decide aquí si se
      // siembran datos de demo: las cuentas nuevas quedan 100% vacías
      // (0 productos, 0 clientes, 0 ventas) hasta que el bodeguero
      // registre sus propios datos (ver db/seed.js).
      await Promise.race([
        listoParaUsar,
        new Promise((resolve) => setTimeout(resolve, TIEMPO_MAXIMO_ESPERA_NUBE_MS)),
      ])

      if (cancelado) return

      if (!cancelado) {
        uidHidratadoRef.current = usuario.uid
        uidAnteriorRef.current = usuario.uid
        setHidratandoNube(false)
      }
    }

    hidratarYSuscribirse()

    return () => {
      cancelado = true
      detenerSincronizacion()
    }
  }, [usuario])

  async function manejarCerrarSesion() {
    await cerrarSesion()
    setPantalla('home')
  }

  // Evita el "parpadeo" mostrando LoginScreen antes de saber si ya hay sesión activa.
  // Cubre el punto 4: mientras onAuthStateChanged no haya resuelto, jamás se
  // renderiza HomeScreen/MetricsHeader (ni por lo tanto un S/ 0.00 prematuro).
  if (verificandoSesion) {
    return <PantallaDeCarga mensaje="Cargando..." />
  }

  if (!usuario) {
    return <AuthPage />
  }

  // Cubre el punto 4: mientras el primer snapshot de Firestore no haya
  // llegado (o el timeout de red no se haya cumplido), tampoco se renderiza
  // HomeScreen/MetricsHeader.
  if (hidratandoNube) {
    return <PantallaDeCarga mensaje="Sincronizando con la nube..." />
  }

  if (pantalla === 'ventas') {
    return <VentasPage key={usuario.uid} onVentaFinalizada={() => setPantalla('home')} />
  }

  if (pantalla === 'fiados') {
    return <FiadosPage key={usuario.uid} onVolver={() => setPantalla('home')} />
  }

  if (pantalla === 'cierre') {
    return <CierreCajaPage key={usuario.uid} onVolver={() => setPantalla('home')} />
  }

  if (pantalla === 'inventario') {
    return <InventarioPage key={usuario.uid} onVolver={() => setPantalla('home')} />
  }

  return (
    <HomeScreen
      // `key={usuario.uid}` fuerza un remount COMPLETO de HomeScreen (y de
      // MetricsHeader, QuickActions, CloudStatusPanel dentro de él) cada
      // vez que cambia la cuenta autenticada. Sin esto, si React decidiera
      // reutilizar la misma instancia del componente entre una cuenta y
      // otra, los `useLiveQuery` podrían quedar mostrando, aunque sea un
      // instante, el último valor calculado para la bodega anterior en
      // vez de arrancar limpios junto con el Dexie ya filtrado por
      // `bodegaId` (ver syncService.js). Se aplica igual en las demás
      // pantallas de arriba, por la misma razón.
      key={usuario.uid}
      usuario={usuario}
      onCerrarSesion={manejarCerrarSesion}
      onNuevaVenta={() => setPantalla('ventas')}
      onVerFiados={() => setPantalla('fiados')}
      onVerInventario={() => setPantalla('inventario')}
      onVerCierre={() => setPantalla('cierre')}
    />
  )
}

export default App