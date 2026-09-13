import { useState } from 'react'
import { useSyncOffline } from './hooks/useSyncOffline'
import { HomeScreen } from './features/home/HomeScreen'
import { VentasPage } from './features/ventas/VentasPage'
import { FiadosPage } from './features/fiados/FiadosPage'
import { InventarioPage } from './features/inventario/InventarioPage'

function App() {
  const [pantalla, setPantalla] = useState('home')

  useSyncOffline()

  if (pantalla === 'ventas') {
    return <VentasPage onVentaFinalizada={() => setPantalla('home')} />
  }

  if (pantalla === 'fiados') {
    return <FiadosPage onVolver={() => setPantalla('home')} />
  }

  if (pantalla === 'inventario') {
    return <InventarioPage onVolver={() => setPantalla('home')} />
  }

  return (
    <HomeScreen
      onNuevaVenta={() => setPantalla('ventas')}
      onVerFiados={() => setPantalla('fiados')}
      onVerInventario={() => setPantalla('inventario')}
    />
  )
}

export default App