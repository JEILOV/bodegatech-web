import { useState } from 'react'
import { HomeScreen } from './features/home/HomeScreen'
import { VentasPage } from './features/ventas/VentasPage'

function App() {
  const [pantalla, setPantalla] = useState('home')

  if (pantalla === 'ventas') {
    return <VentasPage onVentaFinalizada={() => setPantalla('home')} />
  }

  return <HomeScreen onNuevaVenta={() => setPantalla('ventas')} />
}

export default App