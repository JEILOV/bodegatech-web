import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import { usePerfilBodega } from '../../hooks/usePerfilBodega'
import { MetricsHeader } from './components/MetricsHeader'
import { QuickActions } from './components/QuickActions'
import { CloudStatusPanel } from './components/CloudStatusPanel'
import { IconAlerta, IconTienda, IconCerrarSesion } from './NavIcons'

const STOCK_BAJO_UMBRAL = 5

/**
 * @param {object} props
 * @param {import('firebase/auth').User} props.usuario - usuario autenticado (Firebase Auth)
 * @param {() => void} props.onCerrarSesion
 */
export function HomeScreen({ usuario, onCerrarSesion, onNuevaVenta, onVerFiados, onVerInventario, onVerCierre }) {
  // Perfil de la bodega (users/{uid} en Firestore): nombreBodega,
  // nombreAdministrador. `undefined` = cargando, `null` = no existe
  // (cuenta creada antes de que se guardara este perfil).
  const perfilBodega = usePerfilBodega(usuario?.uid)

  // Prioridad para el nombre mostrado en el encabezado:
  // 1) nombreBodega guardado en Firestore al registrarse
  // 2) displayName del usuario en Firebase Auth (nombre del administrador)
  // 3) "Mi Bodega" como último recurso
  const nombreEncabezado =
    perfilBodega === undefined
      ? null // aún cargando: no mostrar nada que después tenga que "saltar"
      : perfilBodega?.nombreBodega || usuario?.displayName || 'Mi Bodega'

  // Mismo patrón que en MetricsHeader: valor por defecto ([]) para que la
  // sección nunca dependa de que la primera ejecución de la consulta
  // coincida exactamente con el momento en que `seedDatabase()` terminó de
  // insertar productos. Ahora que main.jsx espera la siembra antes de
  // montar la app, esta consulta ya arranca con datos reales; el
  // try/catch + default es una segunda capa de seguridad para que un
  // error puntual no deje la sección "congelada". Al venir de Dexie, ya
  // está filtrada por la bodega activa (ver syncService.js), y App.jsx
  // remonta HomeScreen por completo (key={usuario.uid}) al cambiar de
  // cuenta, así que este estado nunca arrastra datos de la sesión anterior.
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
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-purple-600 px-5 pt-8 pb-7 rounded-b-3xl shadow-lg shadow-primary-600/20">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
              <IconTienda className="w-6 h-6" />
            </span>
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-medium">Bienvenido de vuelta a</p>
              {nombreEncabezado === null ? (
                <span className="mt-1 inline-block h-6 w-40 rounded bg-white/20 animate-pulse" />
              ) : (
                <h1 className="text-white text-xl font-bold leading-tight truncate">{nombreEncabezado}</h1>
              )}
            </div>
          </div>

          <button
            onClick={onCerrarSesion}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white
                       active:scale-90 transition-transform duration-100 hover:bg-white/25"
          >
            <IconCerrarSesion className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-4 -mt-4 space-y-5">
        <MetricsHeader />

        <QuickActions
          onNuevaVenta={onNuevaVenta}
          onVerFiados={onVerFiados}
          onVerInventario={onVerInventario}
          onVerCierre={onVerCierre}
        />

        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-dark-text uppercase tracking-wide mb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-warning-50 text-warning-600">
              <IconAlerta className="w-3.5 h-3.5" />
            </span>
            Alertas de stock bajo
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
                  className="flex items-center justify-between bg-warning-50 rounded-xl px-3 py-2.5"
                >
                  <span className="text-sm font-medium text-dark-text">{producto.nombre}</span>
                  <span className="text-xs font-bold text-warning-600">
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