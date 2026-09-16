import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { seedDatabase } from './db/seed'

/**
 * Antes, `seedDatabase()` se llamaba "fire-and-forget" (sin await) y React
 * montaba HomeScreen/MetricsHeader en paralelo. En un celular real, sobre
 * todo justo después de limpiar datos, la siembra inicial (bulkAdd de todo
 * el catálogo maestro) puede tardar lo suficiente como para que el primer
 * montaje de esas pantallas lea Dexie a medio poblar, dejando las alertas
 * de stock desincronizadas.
 *
 * Ahora se espera explícitamente a que la siembra termine (o falle) antes
 * de renderizar la app, para que ningún componente pueda montarse y leer
 * las tablas de Dexie mientras todavía se están insertando datos.
 */
async function iniciarApp() {
  try {
    await seedDatabase()
  } catch (error) {
    console.error('[seed] No se pudo completar la siembra inicial:', error)
    // Continuamos igual: la app debe poder abrir aunque la siembra falle
    // (por ejemplo, si el usuario ya tiene datos reales y no es su primera vez).
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

iniciarApp()