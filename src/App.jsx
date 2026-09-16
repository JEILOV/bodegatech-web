import { useEffect, useRef, useState } from 'react'
import { observarEstadoAuth, cerrarSesion } from './services/authService'
import { iniciarSincronizacionEnTiempoReal } from './services/syncService'
import { useSyncOffline } from './hooks/useSyncOffline'
import { seedDatabase } from './db/seed'
import { db } from './db/dexie'
import { LoginScreen } from './features/auth/LoginScreen'
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
  // seedDatabase()/Dexie de nuevo) cuando Firebase Auth emite un usuario
  // con la MISMA sesión pero una referencia de objeto distinta (por
  // ejemplo al refrescar el ID token en segundo plano). Solo nos importa
  // reaccionar cuando el UID realmente cambia (login/logout).
  const uidHidratadoRef = useRef(null)

  useSyncOffline()

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
    // disparar seedDatabase() ni reabrir los listeners de Firestore.
    if (uidHidratadoRef.current === usuario.uid) {
      return
    }

    let cancelado = false
    let detenerSincronizacion = () => {}

    async function hidratarYSuscribirse() {
      setHidratandoNube(true)

      const { cancelarTodo, listoParaUsar } = iniciarSincronizacionEnTiempoReal()
      detenerSincronizacion = cancelarTodo

      // Esperamos la primera descarga real de cada colección (con un tope
      // de 4s si no hay internet ni caché local de Firestore disponible)
      // antes de decidir si sembramos datos de demo. Así seedDatabase()
      // nunca se ejecuta "encima" de una cuenta que ya tiene
      // productos/clientes/ventas reales en la nube, y nunca tocamos
      // Dexie antes de que Auth + la primera descarga de Firestore hayan
      // terminado.
      await Promise.race([
        listoParaUsar,
        new Promise((resolve) => setTimeout(resolve, TIEMPO_MAXIMO_ESPERA_NUBE_MS)),
      ])

      if (cancelado) return

      const [totalProductos, totalClientes, totalVentas] = await Promise.all([
        db.products.count(),
        db.customers.count(),
        db.sales.count(),
      ])

      // Solo sembramos si, después de intentar traer todo de Firestore,
      // las 3 tablas siguen vacías: eso significa que es una cuenta
      // genuinamente nueva, no un dispositivo nuevo de una cuenta existente.
      // Si el usuario ya tenía sesión y datos (locales o recién bajados de
      // la nube), seedDatabase() jamás se ejecuta.
      if (totalProductos === 0 && totalClientes === 0 && totalVentas === 0) {
        try {
          await seedDatabase()
        } catch (error) {
          console.error('[seed] No se pudo completar la siembra inicial:', error)
        }
      }

      if (!cancelado) {
        uidHidratadoRef.current = usuario.uid
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
    return <LoginScreen />
  }

  // Cubre el punto 4: mientras el primer snapshot de Firestore no haya
  // llegado (o el timeout de red no se haya cumplido), tampoco se renderiza
  // HomeScreen/MetricsHeader.
  if (hidratandoNube) {
    return <PantallaDeCarga mensaje="Sincronizando con la nube..." />
  }

  if (pantalla === 'ventas') {
    return <VentasPage onVentaFinalizada={() => setPantalla('home')} />
  }

  if (pantalla === 'fiados') {
    return <FiadosPage onVolver={() => setPantalla('home')} />
  }

  if (pantalla === 'cierre') {
    return <CierreCajaPage onVolver={() => setPantalla('home')} />
  }

  if (pantalla === 'inventario') {
    return <InventarioPage onVolver={() => setPantalla('home')} />
  }

  return (
    <div>
      <HomeScreen
        onNuevaVenta={() => setPantalla('ventas')}
        onVerFiados={() => setPantalla('fiados')}
        onVerInventario={() => setPantalla('inventario')}
        onVerCierre={() => setPantalla('cierre')}
      />
      <button
        onClick={manejarCerrarSesion}
        className="fixed bottom-4 right-4 bg-white border border-slate-200 text-sm font-semibold
                   text-dark-text px-4 py-2 rounded-full shadow-md active:scale-95
                   transition-transform duration-100"
      >
        Cerrar sesión
      </button>
    </div>
  )
}

export default App