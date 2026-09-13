import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import { formatCurrency } from '../../utils/formatCurrency'
import { ScannerModal } from './components/ScannerModal'
import { CartItemList } from './components/CartItemList'

const DENOMINACIONES_SUGERIDAS = [10, 20, 50]

export function VentasPage({ onVentaFinalizada }) {
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState([])
  const [mostrarScanner, setMostrarScanner] = useState(false)
  const [modoPago, setModoPago] = useState(null) // 'efectivo' | 'fiado' | null
  const [montoRecibido, setMontoRecibido] = useState(0)
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('')
  const [guardando, setGuardando] = useState(false)

  const productos = useLiveQuery(() => db.products.toArray(), [])
  const clientes = useLiveQuery(() => db.customers.toArray(), [])

  const resultadosBusqueda = useMemo(() => {
    if (!productos || busqueda.trim().length === 0) return []
    const termino = busqueda.trim().toLowerCase()
    return productos.filter(
      (producto) =>
        producto.nombre.toLowerCase().includes(termino) ||
        producto.codigoBarras === busqueda.trim()
    )
  }, [productos, busqueda])

  const total = useMemo(
    () => carrito.reduce((acumulado, item) => acumulado + item.precioUnitario * item.cantidad, 0),
    [carrito]
  )

  const vuelto = modoPago === 'efectivo' ? Math.max(montoRecibido - total, 0) : 0

  function agregarProductoAlCarrito(producto) {
    setCarrito((carritoActual) => {
      const yaExiste = carritoActual.find((item) => item.productId === producto.id)
      if (yaExiste) {
        return carritoActual.map((item) =>
          item.productId === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      }
      // Se congela nombre y precio del producto al momento de agregarlo
      return [
        ...carritoActual,
        {
          productId: producto.id,
          nombre: producto.nombre,
          precioUnitario: producto.precioVenta,
          cantidad: 1,
        },
      ]
    })
    setBusqueda('')
  }

  function manejarCodigoEscaneado(codigo) {
    const producto = productos?.find((p) => p.codigoBarras === codigo)
    if (producto) {
      agregarProductoAlCarrito(producto)
    } else {
      alert(`No se encontró ningún producto con el código ${codigo}`)
    }
    setMostrarScanner(false)
  }

  function manejarBusquedaEnter(evento) {
    if (evento.key !== 'Enter') return
    // Soporta lector USB: escribe el código y envía Enter automáticamente
    const productoPorCodigo = productos?.find((p) => p.codigoBarras === busqueda.trim())
    if (productoPorCodigo) {
      agregarProductoAlCarrito(productoPorCodigo)
    } else if (resultadosBusqueda.length === 1) {
      agregarProductoAlCarrito(resultadosBusqueda[0])
    }
  }

  function incrementarCantidad(productId) {
    setCarrito((actual) =>
      actual.map((item) =>
        item.productId === productId ? { ...item, cantidad: item.cantidad + 1 } : item
      )
    )
  }

  function decrementarCantidad(productId) {
    setCarrito((actual) =>
      actual
        .map((item) =>
          item.productId === productId ? { ...item, cantidad: item.cantidad - 1 } : item
        )
        .filter((item) => item.cantidad > 0)
    )
  }

  function eliminarDelCarrito(productId) {
    setCarrito((actual) => actual.filter((item) => item.productId !== productId))
  }

  async function finalizarVenta() {
    if (carrito.length === 0) return
    if (modoPago === 'fiado' && !clienteSeleccionadoId) {
      alert('Selecciona un cliente para registrar la venta al fiado.')
      return
    }
    if (modoPago === 'efectivo' && montoRecibido < total) {
      alert('El monto recibido es menor al total de la venta.')
      return
    }

    setGuardando(true)
    const ventaId = `sale-${Date.now()}`
    const fecha = new Date().toISOString()

    try {
      await db.transaction('rw', db.sales, db.products, db.customers, db.movements, async () => {
        // 1. Registrar la venta (con items desnormalizados: nombre y precio congelados)
        await db.sales.add({
          id: ventaId,
          fecha,
          total,
          tipoPago: modoPago,
          clienteId: modoPago === 'fiado' ? clienteSeleccionadoId : null,
          synced: false,
          items: carrito.map((item) => ({
            productId: item.productId,
            nombre: item.nombre,
            precioUnitario: item.precioUnitario,
            cantidad: item.cantidad,
          })),
        })

        // 2. Descontar stock de cada producto vendido
        for (const item of carrito) {
          const producto = await db.products.get(item.productId)
          if (producto) {
            await db.products.update(item.productId, {
              stock: Math.max(producto.stock - item.cantidad, 0),
              synced: false,
            })
          }
        }

        // 3. Si es fiado, registrar el movimiento y aumentar la deuda del cliente
        if (modoPago === 'fiado') {
          await db.movements.add({
            id: `mov-${Date.now()}`,
            customerId: clienteSeleccionadoId,
            fecha,
            tipo: 'cargo',
            monto: total,
            synced: false,
          })

          const cliente = await db.customers.get(clienteSeleccionadoId)
          if (cliente) {
            await db.customers.update(clienteSeleccionadoId, {
              deudaTotal: (cliente.deudaTotal || 0) + total,
              synced: false,
            })
          }
        }
      })

      // Reiniciar estado y volver al Home
      setCarrito([])
      setModoPago(null)
      setMontoRecibido(0)
      setClienteSeleccionadoId('')
      onVentaFinalizada?.()
    } catch (error) {
      console.error('Error al registrar la venta:', error)
      alert('Ocurrió un error al guardar la venta. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <header className="bg-primary px-5 py-5 flex items-center gap-3">
        <button onClick={onVentaFinalizada} className="text-white text-xl">
          ←
        </button>
        <h1 className="text-white font-bold text-lg">Nueva Venta</h1>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Búsqueda manual / lector USB */}
        <div className="relative">
          <input
            type="text"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            onKeyDown={manejarBusquedaEnter}
            placeholder="Buscar por nombre o código de barras..."
            className="input-field"
          />

          {resultadosBusqueda.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-md max-h-60 overflow-y-auto">
              {resultadosBusqueda.map((producto) => (
                <li key={producto.id}>
                  <button
                    onClick={() => agregarProductoAlCarrito(producto)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex justify-between"
                  >
                    <span className="text-sm text-dark-text">{producto.nombre}</span>
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(producto.precioVenta)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Botón de escáner */}
        <button
          onClick={() => setMostrarScanner(true)}
          className="w-full bg-primary text-white font-bold text-lg py-5 rounded-2xl
                     shadow-md active:scale-95 transition-transform duration-100
                     flex items-center justify-center gap-2"
        >
          <span className="text-2xl">📷</span>
          ESCANEAR PRODUCTO
        </button>

        {/* Carrito */}
        <section>
          <h2 className="text-sm font-bold text-dark-text uppercase tracking-wide mb-2">
            Carrito
          </h2>
          <CartItemList
            items={carrito}
            onIncrementar={incrementarCantidad}
            onDecrementar={decrementarCantidad}
            onEliminar={eliminarDelCarrito}
          />
        </section>

        {/* Selección de forma de pago */}
        {carrito.length > 0 && (
          <section className="card space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-dark-text-muted">Total a pagar</span>
              <span className="text-2xl font-bold text-dark-text">{formatCurrency(total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setModoPago('efectivo')}
                className={`py-3 rounded-xl font-semibold border ${
                  modoPago === 'efectivo'
                    ? 'bg-success text-white border-success'
                    : 'bg-white text-dark-text border-slate-200'
                }`}
              >
                💵 Efectivo
              </button>
              <button
                onClick={() => setModoPago('fiado')}
                className={`py-3 rounded-xl font-semibold border ${
                  modoPago === 'fiado'
                    ? 'bg-warning text-white border-warning'
                    : 'bg-white text-dark-text border-slate-200'
                }`}
              >
                📒 Fiado
              </button>
            </div>

            {modoPago === 'efectivo' && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-dark-text-muted">¿Con cuánto paga?</p>
                <div className="flex gap-2">
                  {DENOMINACIONES_SUGERIDAS.map((billete) => (
                    <button
                      key={billete}
                      onClick={() => setMontoRecibido(billete)}
                      className="flex-1 py-2 rounded-lg bg-slate-100 font-semibold text-dark-text active:scale-95"
                    >
                      S/ {billete}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={montoRecibido}
                  onChange={(evento) => setMontoRecibido(Number(evento.target.value))}
                  placeholder="Otro monto recibido"
                  className="input-field"
                />
                {montoRecibido > 0 && (
                  <p className="text-sm text-dark-text">
                    Vuelto: <span className="font-bold text-success">{formatCurrency(vuelto)}</span>
                  </p>
                )}
              </div>
            )}

            {modoPago === 'fiado' && (
              <select
                value={clienteSeleccionadoId}
                onChange={(evento) => setClienteSeleccionadoId(evento.target.value)}
                className="input-field"
              >
                <option value="">Selecciona un cliente...</option>
                {clientes?.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={finalizarVenta}
              disabled={!modoPago || guardando}
              className="btn-success w-full text-lg"
            >
              {guardando ? 'Guardando...' : 'CONFIRMAR VENTA'}
            </button>
          </section>
        )}
      </main>

      {mostrarScanner && (
        <ScannerModal
          onCodigoEscaneado={manejarCodigoEscaneado}
          onCerrar={() => setMostrarScanner(false)}
        />
      )}
    </div>
  )
}

export default VentasPage