import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import { formatCurrency } from '../../utils/formatCurrency'
import { EditarStockModal } from './components/EditarStockModal'
import { NuevoProductoModal } from './components/NuevoProductoModal'
import { EntradaMercaderiaModal } from './components/EntradaMercaderiaModal'

const STOCK_CRITICO_UMBRAL = 5

export function InventarioPage({ onVolver }) {
  const [busqueda, setBusqueda] = useState('')
  const [productoParaEditar, setProductoParaEditar] = useState(null)
  const [mostrarNuevoProducto, setMostrarNuevoProducto] = useState(false)
  const [mostrarEntradaMercaderia, setMostrarEntradaMercaderia] = useState(false)
  const [codigoParaNuevoProducto, setCodigoParaNuevoProducto] = useState(null)

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
      <header className="bg-primary px-5 py-5 flex items-center gap-3">
        <button onClick={onVolver} className="text-white text-xl">
          ←
        </button>
        <h1 className="text-white font-bold text-lg">Inventario</h1>
      </header>

      <main className="px-4 pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMostrarEntradaMercaderia(true)}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <span>📷</span> Entrada de Mercadería
          </button>
          <button
            onClick={() => setMostrarNuevoProducto(true)}
            className="bg-white border border-slate-200 text-dark-text font-semibold py-3
                       rounded-xl active:scale-95 transition-transform duration-100"
          >
            + Registrar producto
          </button>
        </div>

        <input
          type="text"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre o código de barras..."
          className="input-field"
        />

        {productos === undefined && (
          <p className="text-sm text-dark-text-muted text-center py-6">Cargando...</p>
        )}

        {productos && productosFiltrados.length === 0 && (
          <div className="card text-center py-6">
            <p className="text-sm text-dark-text-muted">
              No se encontraron productos con ese criterio.
            </p>
          </div>
        )}

        <ul className="space-y-2">
          {productosFiltrados.map((producto) => {
            const stockCritico = producto.stock <= STOCK_CRITICO_UMBRAL

            return (
              <li key={producto.id} className="card flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-dark-text truncate">{producto.nombre}</p>
                  <p className="text-xs text-dark-text-muted">{producto.categoria}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-bold text-primary">
                      {formatCurrency(producto.precioVenta)}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        stockCritico
                          ? 'bg-warning/10 text-warning'
                          : 'bg-success/10 text-success'
                      }`}
                    >
                      {stockCritico ? `⚠️ Stock: ${producto.stock}` : `Stock: ${producto.stock}`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setProductoParaEditar(producto)}
                  className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg
                             active:scale-95 transition-transform duration-100 flex-shrink-0"
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