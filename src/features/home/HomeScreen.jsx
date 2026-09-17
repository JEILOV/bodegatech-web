import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import { MetricsHeader } from './components/MetricsHeader'
import { QuickActions } from './components/QuickActions'
import { CloudStatusPanel } from './components/CloudStatusPanel'

const STOCK_BAJO_UMBRAL = 5

export function HomeScreen({ onNuevaVenta, onVerFiados, onVerInventario, onVerCierre }) {
  // Mismo patrón que en MetricsHeader: valor por defecto ([]) para que la
  // sección nunca dependa de que la primera ejecución de la consulta
  // coincida exactamente con el momento en que `seedDatabase()` terminó de
  // insertar productos. Ahora que main.jsx espera la siembra antes de
  // montar la app, esta consulta ya arranca con datos reales; el
  // try/catch + default es una segunda capa de seguridad para que un
  // error puntual no deje la sección "congelada".
  const productosStockBajo = useLiveQuery(
    async () => {
      try {
        return await db.products.filter((producto) => producto.stock <= STOCK_BAJO_UMBRAL).toArray()
      } catch (error) {
        console.error('[HomeScreen] Error obteniendo productos con stock bajo:', error)
        return []
      }
    },
    [],
    []
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-primary px-5 pt-8 pb-6 rounded-b-3xl shadow-md">
        <p className="text-primary-100 text-sm">Bienvenido de vuelta a</p>
        <h1 className="text-white text-2xl font-bold">Bodega Don Pedro</h1>
      </header>

      <main className="px-4 -mt-4 space-y-5">
        <MetricsHeader />

        <QuickActions
          onNuevaVenta={onNuevaVenta}
          onVerFiados={onVerFiados}
          onVerInventario={onVerInventario}
          onVerCierre={onVerCierre}
        />

        <section className="card">
          <h2 className="text-sm font-bold text-dark-text uppercase tracking-wide mb-3">
            ⚠️ Alertas de stock bajo
          </h2>

          {productosStockBajo.length === 0 && (
            <p className="text-sm text-dark-text-muted">
              Todo el inventario está en niveles saludables.
            </p>
          )}

          {productosStockBajo.length > 0 && (
            <ul className="space-y-2">
              {productosStockBajo.map((producto) => (
                <li
                  key={producto.id}
                  className="flex items-center justify-between bg-warning/10 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-medium text-dark-text">{producto.nombre}</span>
                  <span className="text-xs font-bold text-warning">
                    Quedan {producto.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <CloudStatusPanel />
    </div>
  )
}

export default HomeScreen