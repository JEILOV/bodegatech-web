import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import { usePerfilBodega } from '../../hooks/usePerfilBodega'
import { MetricsHeader } from './components/MetricsHeader'
import { QuickActions } from './components/QuickActions'
import { CloudStatusPanel } from './components/CloudStatusPanel'
import { IconAlerta, IconTienda, IconCerrarSesion, IconChevron, IconImprimir, IconCheckCirculo } from './NavIcons'

const STOCK_BAJO_UMBRAL = 5

// A partir de esta cantidad de ítems, la lista de alertas arranca
// colapsada por defecto: evita que HomeScreen se vuelva interminable en
// bodegas con muchos productos en stock crítico a la vez.
const UMBRAL_COLAPSO_AUTOMATICO = 4

/**
 * Arma el HTML de una vista imprimible con la lista consolidada de
 * productos a reponer (nombre, stock actual y unidad de medida), lista
 * para imprimir o guardar como PDF desde el diálogo nativo del
 * navegador ("Guardar como PDF" en el selector de impresora).
 */
function construirHtmlListaReposicion(productos, nombreBodega) {
  const fecha = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const filas = productos
    .map(
      (producto) => `
        <tr>
          <td>${producto.nombre}</td>
          <td>${producto.categoria || '-'}</td>
          <td class="centro">${producto.stock}</td>
          <td class="centro">${producto.unidadMedida || 'unid.'}</td>
        </tr>
      `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Lista de reposición</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #1E293B; padding: 32px; }
          h1 { font-size: 20px; margin-bottom: 2px; }
          p.subtitulo { color: #64748B; font-size: 13px; margin-top: 0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { text-align: left; background: #F1F5F9; padding: 8px 10px; border-bottom: 2px solid #CBD5E1; }
          td { padding: 8px 10px; border-bottom: 1px solid #E2E8F0; }
          td.centro, th.centro { text-align: center; }
          .pie { margin-top: 24px; font-size: 11px; color: #94A3B8; }
        </style>
      </head>
      <body>
        <h1>Lista de reposición — ${nombreBodega}</h1>
        <p class="subtitulo">Generada el ${fecha} · ${productos.length} producto${productos.length === 1 ? '' : 's'} con stock bajo</p>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th class="centro">Stock actual</th>
              <th class="centro">Unidad</th>
            </tr>
          </thead>
          <tbody>
            ${filas}
          </tbody>
        </table>
        <p class="pie">BodegaTech POS — Lista generada automáticamente a partir del inventario con stock ≤ ${STOCK_BAJO_UMBRAL} unidades.</p>
      </body>
    </html>
  `
}

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
  // sección nunca quede "congelada" si una consulta puntual falla (ver
  // try/catch). App.jsx ya espera la primera descarga de Firestore antes
  // de montar esta pantalla, así que esta consulta arranca con datos
  // reales (o genuinamente vacíos, si la cuenta es nueva — ya no hay
  // siembra automática, ver db/seed.js). Al venir de Dexie, ya está
  // filtrada por la bodega activa (ver syncService.js), y App.jsx remonta
  // HomeScreen por completo (key={usuario.uid}) al cambiar de cuenta, así
  // que este estado nunca arrastra datos de la sesión anterior.
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

  // Distingue "no hay NINGÚN producto registrado todavía" (cuenta nueva,
  // 100% vacía) de "hay productos pero ninguno con stock bajo" (todo
  // saludable). Sin esta consulta, una cuenta recién creada mostraría
  // "Todo el inventario está en niveles saludables", lo cual es falso:
  // no hay inventario que evaluar, simplemente no existe.
  const totalProductos = useLiveQuery(
    async () => {
      try {
        return await db.products.count()
      } catch (error) {
        console.error('[HomeScreen] Error contando productos:', error)
        return 0
      }
    },
    [],
    0
  )

  // La lista arranca colapsada automáticamente cuando hay muchos ítems
  // (evita una pantalla interminable al primer vistazo), pero el
  // bodeguero puede expandirla/ocultarla libremente en todo momento.
  const [listaExpandidaManual, setListaExpandidaManual] = useState(null)
  const listaExpandida =
    listaExpandidaManual !== null
      ? listaExpandidaManual
      : productosStockBajo.length <= UMBRAL_COLAPSO_AUTOMATICO

  const productosOrdenados = useMemo(
    () => [...productosStockBajo].sort((a, b) => a.stock - b.stock),
    [productosStockBajo]
  )

  /**
   * Abre una pestaña nueva con la lista de reposición ya formateada y
   * dispara el diálogo de impresión del navegador. Desde ahí, el
   * bodeguero puede imprimir en papel o elegir "Guardar como PDF" para
   * enviarla al proveedor. No depende de ninguna librería de PDF: usa
   * el motor de impresión nativo del navegador.
   */
  function manejarImprimirListaReposicion() {
    if (productosOrdenados.length === 0) return
    const nombreBodega = perfilBodega?.nombreBodega || usuario?.displayName || 'Mi Bodega'
    const html = construirHtmlListaReposicion(productosOrdenados, nombreBodega)

    const ventana = window.open('', '_blank')
    if (!ventana) {
      alert('El navegador bloqueó la ventana de impresión. Habilita las ventanas emergentes para este sitio.')
      return
    }
    ventana.document.write(html)
    ventana.document.close()
    ventana.focus()
    // Pequeño margen para que la ventana termine de pintar antes de
    // abrir el diálogo de impresión (evita imprimir una página en blanco).
    setTimeout(() => ventana.print(), 250)
  }

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
          <div className="flex items-center justify-between gap-2 mb-1">
            <h2 className="flex items-center gap-2 text-sm font-bold text-dark-text uppercase tracking-wide">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-warning-50 text-warning-600">
                <IconAlerta className="w-3.5 h-3.5" />
              </span>
              Alertas de stock bajo
            </h2>

            {productosOrdenados.length > 0 && (
              <button
                onClick={manejarImprimirListaReposicion}
                title="Imprimir / Exportar lista de reposición"
                className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50
                           hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors duration-150
                           active:scale-95"
              >
                <IconImprimir className="w-4 h-4" />
                <span className="hidden xs:inline">Imprimir lista</span>
              </button>
            )}
          </div>

          {totalProductos === 0 && (
            <p className="text-sm text-dark-text-muted mt-2">
              No hay productos registrados aún.
            </p>
          )}

          {totalProductos > 0 && productosOrdenados.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-dark-text-muted mt-2">
              <IconCheckCirculo className="w-4 h-4 text-success shrink-0" />
              Todo el inventario está en niveles saludables.
            </p>
          )}

          {totalProductos > 0 && productosOrdenados.length > 0 && (
            <>
              {/* Resumen + control de acordeón: evita que la pantalla se
                  vuelva infinitamente larga cuando hay muchos productos
                  en stock crítico. */}
              <button
                onClick={() => setListaExpandidaManual(!listaExpandida)}
                className="w-full flex items-center justify-between gap-2 mt-2 py-1.5 text-left"
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-warning-600">
                  <IconAlerta className="w-3.5 h-3.5 shrink-0" />
                  {productosOrdenados.length}{' '}
                  {productosOrdenados.length === 1 ? 'producto requiere' : 'productos requieren'} reposición
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-primary-700 shrink-0">
                  {listaExpandida ? 'Ocultar' : 'Ver lista'}
                  <IconChevron
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      listaExpandida ? 'rotate-180' : ''
                    }`}
                  />
                </span>
              </button>

              {listaExpandida && (
                <ul className="space-y-2 mt-2 max-h-80 overflow-y-auto pr-0.5">
                  {productosOrdenados.map((producto) => (
                    <li
                      key={producto.id}
                      className="flex items-center justify-between bg-warning-50 rounded-xl px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-dark-text block truncate">
                          {producto.nombre}
                        </span>
                        {producto.categoria && (
                          <span className="text-[11px] text-warning-600/80">{producto.categoria}</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-warning-600 shrink-0 pl-2">
                        Quedan {producto.stock} {producto.tipoVenta === 'granel' ? producto.unidadMedida : 'unid.'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </main>

      <CloudStatusPanel />
    </div>
  )
}

export default HomeScreen