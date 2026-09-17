import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import { formatCurrency } from '../../utils/formatCurrency'
import { useBackableState } from '../../hooks/useBackableState'
import { EditarStockModal } from './components/EditarStockModal'
import { NuevoProductoModal } from './components/NuevoProductoModal'
import { EntradaMercaderiaModal } from './components/EntradaMercaderiaModal'
import { IconCamara, IconMas, IconBuscar, IconInventario, IconAlerta } from '../home/NavIcons'

const STOCK_CRITICO_UMBRAL = 5

export function InventarioPage({ onVolver }) {
  const [busqueda, setBusqueda] = useState('')
  const [productoParaEditar, setProductoParaEditar] = useState(null)
  const [mostrarNuevoProducto, setMostrarNuevoProducto] = useState(false)
  const [mostrarEntradaMercaderia, setMostrarEntradaMercaderia] = useState(false)
  const [codigoParaNuevoProducto, setCodigoParaNuevoProducto] = useState(null)

  // Botón/gesto "Atrás" del celular: primero cierra el modal abierto
  // (Editar stock, Nuevo producto o Entrada de mercadería) en vez de
  // salir de la pantalla de Inventario.
  useBackableState(Boolean(productoParaEditar), () => setProductoParaEditar(null))
  useBackableState(mostrarNuevoProducto, cerrarNuevoProducto)
  useBackableState(mostrarEntradaMercaderia, () => setMostrarEntradaMercaderia(false))

  const productos = useLiveQuery(() => db.products.toArray(), [])

  // La Entrada de Mercadería no encontró el código en Dexie ni en Firestore:
  // se cierra ese flujo y se abre el de registro manual, con el código ya listo.
  function manejarProductoNoEncontrado(codigo) {
    setMostrarEntradaMercaderia(false)
    setCodigoParaNuevoProducto(codigo)
    setMostrarNuevoProducto(true)
  }

  function cerrarNuevoProducto() {
    setMostrarNuevoProducto(false)
    setCodigoParaNuevoProducto(null)
  }

  const productosFiltrados = useMemo(() => {
    if (!productos) return []
    const termino = busqueda.trim().toLowerCase()
    if (termino === '') return productos

    return productos.filter(
      (producto) =>
        producto.nombre.toLowerCase().includes(termino) ||
        producto.codigoBarras?.includes(termino)
    )
  }, [productos, busqueda])

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Encabezado premium: gradiente azul/morado, en sintonía con AuthPage/HomeScreen */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-purple-600 px-5 pt-8 pb-7 rounded-b-3xl shadow-lg shadow-primary-600/20">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex items-center gap-3">
          <button
            onClick={onVolver}
            aria-label="Volver"
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white
                       active:scale-90 transition-transform duration-100 hover:bg-white/25"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
              <IconInventario className="w-5 h-5" />
            </span>
            <h1 className="text-white font-bold text-lg truncate">Inventario</h1>
          </div>
        </div>
      </header>

      <main className="px-4 -mt-4 space-y-4">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMostrarEntradaMercaderia(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600
                         text-white font-semibold py-3 shadow-md shadow-primary-600/20 active:scale-95
                         transition-all duration-150"
            >
              <IconCamara className="w-[18px] h-[18px]" /> Entrada de Mercadería
            </button>
            <button
              onClick={() => setMostrarNuevoProducto(true)}
              className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-dark-text
                         font-semibold py-3 rounded-xl active:scale-95 hover:border-primary-200 hover:shadow-sm
                         transition-all duration-150"
            >
              <IconMas className="w-4 h-4 text-primary-600" /> Registrar producto
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <IconBuscar className="w-[18px] h-[18px]" />
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por nombre o código de barras..."
              className="input-field pl-10"
            />
          </div>
        </div>

        {productos === undefined && (
          <p className="text-sm text-dark-text-muted text-center py-6">Cargando...</p>
        )}

        {productos && productosFiltrados.length === 0 && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm text-center py-6">
            <p className="text-sm text-dark-text-muted">
              No se encontraron productos con ese criterio.
            </p>
          </div>
        )}

        <ul className="space-y-2.5">
          {productosFiltrados.map((producto) => {
            const stockCritico = producto.stock <= STOCK_CRITICO_UMBRAL

            return (
              <li
                key={producto.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-slate-200
                           shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-150 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-dark-text truncate">{producto.nombre}</p>
                  <p className="text-xs text-dark-text-muted">{producto.categoria}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-bold text-primary-600">
                      {formatCurrency(producto.precioVenta)}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        stockCritico
                          ? 'bg-warning-50 text-warning-600'
                          : 'bg-success-50 text-success-600'
                      }`}
                    >
                      {stockCritico && <IconAlerta className="w-3 h-3" />}
                      Stock: {producto.stock}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setProductoParaEditar(producto)}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-xl
                             active:scale-95 transition-all duration-150 flex-shrink-0 shadow-sm"
                >
                  Editar stock
                </button>
              </li>
            )
          })}
        </ul>
      </main>

      {productoParaEditar && (
        <EditarStockModal
          producto={productoParaEditar}
          onCerrar={() => setProductoParaEditar(null)}
        />
      )}

      {mostrarNuevoProducto && (
        <NuevoProductoModal
          codigoInicial={codigoParaNuevoProducto}
          onCerrar={cerrarNuevoProducto}
        />
      )}

      {mostrarEntradaMercaderia && (
        <EntradaMercaderiaModal
          onCerrar={() => setMostrarEntradaMercaderia(false)}
          onProductoNoEncontrado={manejarProductoNoEncontrado}
        />
      )}
    </div>
  )
}

export default InventarioPage