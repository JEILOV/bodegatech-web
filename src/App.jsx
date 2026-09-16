import { useEffect, useState } from 'react'
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

function App() {
  const [pantalla, setPantalla] = useState('home')
  const [usuario, setUsuario] = useState(null)
  const [verificandoSesion, setVerificandoSesion] = useState(true)
  const [hidratandoNube, setHidratandoNube] = useState(true)

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
      setHidratandoNube(true)
      return
    }

    let cancelado = false
    let detenerSincronizacion = () => {}

    async function hidratarYSuscribirse() {
      const { cancelarTodo, listoParaUsar } = iniciarSincronizacionEnTiempoReal()
      detenerSincronizacion = cancelarTodo

      // Esperamos la primera descarga real de cada colección (con un tope
      // de 4s si no hay internet) antes de decidir si sembramos datos de
      // demo. Así seedDatabase() nunca se ejecuta "encima" de una cuenta
      // que ya tiene productos/clientes/ventas reales en la nube.
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
      if (totalProductos === 0 && totalClientes === 0 && totalVentas === 0) {
        try {
          await seedDatabase()
        } catch (error) {
          console.error('[seed] No se pudo completar la siembra inicial:', error)
        }
      }

      if (!cancelado) setHidratandoNube(false)
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

  // Evita el "parpadeo" mostrando LoginScreen antes de saber si ya hay sesión activa
  if (verificandoSesion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-dark-text-muted">Cargando...</p>
      </div>
    )
  }

  if (!usuario) {
    return <LoginScreen />
  }

  if (hidratandoNube) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-dark-text-muted">Sincronizando con la nube...</p>
      </div>
    )
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