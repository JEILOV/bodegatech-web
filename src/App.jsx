import { useEffect, useState } from 'react'
import { observarEstadoAuth, cerrarSesion } from './services/authService'
import { useSyncOffline } from './hooks/useSyncOffline'
import { LoginScreen } from './features/auth/LoginScreen'
import { HomeScreen } from './features/home/HomeScreen'
import { VentasPage } from './features/ventas/VentasPage'
import { CierreCajaPage } from './features/ventas/CierreCajaPage'
import { FiadosPage } from './features/fiados/FiadosPage'
import { InventarioPage } from './features/inventario/InventarioPage'

function App() {
  const [pantalla, setPantalla] = useState('home')
  const [usuario, setUsuario] = useState(null)
  const [verificandoSesion, setVerificandoSesion] = useState(true)

  useSyncOffline()

  useEffect(() => {
    const cancelarSuscripcion = observarEstadoAuth((usuarioActual) => {
      setUsuario(usuarioActual)
      setVerificandoSesion(false)
    })

    return cancelarSuscripcion
  }, [])

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