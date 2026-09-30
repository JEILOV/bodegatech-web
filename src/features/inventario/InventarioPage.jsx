import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import { formatCurrency } from '../../utils/formatCurrency'
import { useBackableState } from '../../hooks/useBackableState'
import { useSuscripcion } from '../suscripcion/useSuscripcion'
import { EditarStockModal } from './components/EditarStockModal'
import { NuevoProductoModal } from './components/NuevoProductoModal'
import { EntradaMercaderiaModal } from './components/EntradaMercaderiaModal'
import { IconCamara, IconMas, IconBuscar, IconInventario, IconAlerta } from '../home/NavIcons'

const STOCK_CRITICO_UMBRAL = 5

export function InventarioPage({ onVolver }) {
  const { verificarLimite } = useSuscripcion()
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

  // Bloqueo suave del límite del plan gratuito: se verifica ANTES de abrir
  // el formulario para que nadie llene un registro que no podrá guardar.
  // Si ya llegó al tope se abre PlanesPage encima y esta pantalla sigue igual.
  function abrirNuevoProducto() {
    if (!verificarLimite('productos', productos?.length ?? 0)) return
    setMostrarNuevoProducto(true)
  }

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
      {/* Encabezado sobrio: fondo blanco y borde sutil, igual que HomeScreen */}
      <header className="bg-white border-b border-slate-200 px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onVolver}
            aria-label="Volver"
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white
                       text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <IconInventario className="w-5 h-5" />
            </span>
            <h1 className="text-slate-900 font-semibold text-lg tracking-tight truncate">Inventario</h1>
          </div>
        </div>
      </header>

      <main className="px-4 pt-5 space-y-4">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMostrarEntradaMercaderia(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white font-semibold py-3
                         shadow-sm hover:bg-slate-800 active:bg-slate-950 transition-colors duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <IconCamara className="w-[18px] h-[18px]" /> Entrada de Mercadería
            </button>
            <button
              onClick={abrirNuevoProducto}
              className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-900
                         font-semibold py-3 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100
                         transition-colors duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <IconMas className="w-4 h-4 text-slate-700" /> Registrar producto
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
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm text-center py-6">
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
                           shadow-sm hover:border-slate-300 transition-colors duration-150 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-dark-text truncate">{producto.nombre}</p>
                  <p className="text-xs text-dark-text-muted">{producto.categoria}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-bold text-slate-900">
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
                  className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-xl
                             active:bg-slate-950 transition-colors duration-150 flex-shrink-0 shadow-sm"
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