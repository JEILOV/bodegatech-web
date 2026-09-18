import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import { registrarVentaEnNube } from '../../services/firestoreDataService'
import { formatCurrency } from '../../utils/formatCurrency'
import { obtenerInfoMetodoPago } from '../../utils/metodoPago'
import { useBackableState } from '../../hooks/useBackableState'
import { ScannerModal } from './components/ScannerModal'
import { CartItemList } from './components/CartItemList'
import { SelectorClienteModal } from './components/SelectorClienteModal.jsx'
import { CantidadGranelModal } from './components/CantidadGranelModal'

const DENOMINACIONES_SUGERIDAS = [10, 20, 50]

export function VentasPage({ onVentaFinalizada }) {
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState([])
  const [mostrarScanner, setMostrarScanner] = useState(false)
  const [modoPago, setModoPago] = useState(null) // 'efectivo' | 'yape' | 'fiado' | null
  const [montoRecibido, setMontoRecibido] = useState(0)
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mostrarSelectorCliente, setMostrarSelectorCliente] = useState(false)
  // Producto a granel pendiente de que el bodeguero confirme peso/monto
  // antes de entrar al carrito, o item del carrito que se está corrigiendo:
  // { producto, cantidadInicial? }
  const [granelEnEdicion, setGranelEnEdicion] = useState(null)

  // Botón/gesto "Atrás" del celular: cierra el modal abierto (Escáner o
  // Cantidad a granel) en vez de salir de la pantalla de Venta.
  //
  // El Selector de cliente NO se registra acá a propósito. Cuando un modal
  // registrado con useBackableState se cierra desde la UI, el hook llama a
  // `window.history.back()`; ese `popstate` también lo recibe el hook de
  // App.jsx (el de la pantalla completa) y lo interpreta como un "Atrás"
  // del usuario: manda a Home, desmonta VentasPage y la venta al fiado
  // nunca llega a guardarse. Sin entrada propia en el historial, elegir un
  // cliente solo cambia estado local y la pantalla de venta se mantiene.
  useBackableState(mostrarScanner, () => setMostrarScanner(false))
  useBackableState(Boolean(granelEnEdicion), () => setGranelEnEdicion(null))

  const productos = useLiveQuery(() => db.products.toArray(), [])
  const clientes = useLiveQuery(() => db.customers.toArray(), [])

  const clienteSeleccionado = clientes?.find((cliente) => cliente.id === clienteSeleccionadoId)
  // Un cliente recién creado desde el selector puede tardar un instante en
  // llegar a Dexie (viaja por Firestore -> onSnapshot); el id ya es válido
  // aunque `clienteSeleccionado` todavía sea undefined.
  const hayClienteAsignado = Boolean(clienteSeleccionadoId)
  const ventaFiadaSinCliente = modoPago === 'fiado' && !hayClienteAsignado

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
  const infoYape = obtenerInfoMetodoPago('yape')

  /**
   * Handler del Selector de cliente. Hace EXACTAMENTE dos cosas: asigna el
   * cliente a la venta y cierra únicamente ese modal. No guarda, no navega
   * y no toca el historial: el guardado ocurre solo cuando el bodeguero
   * presiona "CONFIRMAR VENTA FIADA" (`finalizarVenta`).
   *
   * Recibe el id (no el objeto) porque así lo reporta SelectorClienteModal,
   * tanto al elegir de la lista como al crear un cliente nuevo al vuelo.
   */
  function manejarClienteSeleccionado(clienteId) {
    setClienteSeleccionadoId(clienteId)
    setMostrarSelectorCliente(false)
  }

  function agregarProductoAlCarrito(producto) {
    // Producto a granel: nunca se agrega directo con cantidad 1 (no tiene
    // sentido para algo que se vende por kg/gr/lt o por monto). Se abre el
    // input rápido y recién al confirmar entra al carrito. Si ya estaba en
    // el carrito, se reabre en modo edición (prefilled) en vez de crear
    // una segunda línea duplicada para el mismo producto.
    if (producto.tipoVenta === 'granel') {
      const itemExistente = carrito.find((item) => item.productId === producto.id)
      setGranelEnEdicion({
        producto,
        cantidadInicial: itemExistente?.cantidad,
        esEdicion: Boolean(itemExistente),
      })
      setBusqueda('')
      return
    }

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

  /**
   * Confirma la cantidad calculada por `CantidadGranelModal` (ya sea por
   * peso/fracción o por monto fijo) y la aplica al carrito: agrega un
   * ítem nuevo, o actualiza la cantidad si ya se estaba corrigiendo uno
   * que estaba en el carrito (`granelEnEdicion.esEdicion`).
   */
  function confirmarCantidadGranel(cantidad) {
    const { producto, esEdicion } = granelEnEdicion

    setCarrito((carritoActual) => {
      if (esEdicion) {
        return carritoActual.map((item) =>
          item.productId === producto.id ? { ...item, cantidad } : item
        )
      }
      return [
        ...carritoActual,
        {
          productId: producto.id,
          nombre: producto.nombre,
          precioUnitario: producto.precioVenta,
          cantidad,
          esGranel: true,
          unidadMedida: producto.unidadMedida,
        },
      ]
    })
  }

  /** Reabre el input rápido de granel para corregir un ítem ya agregado al carrito. */
  async function editarCantidadGranelEnCarrito(productId) {
    const item = carrito.find((itemCarrito) => itemCarrito.productId === productId)
    if (!item) return

    // El precio/unidad y la unidad de medida se toman de Dexie (fuente de
    // verdad más reciente); si cambiaron desde que se agregó al carrito,
    // el modal ya calcula con el precio vigente.
    const producto = (await db.products.get(productId)) || {
      id: productId,
      nombre: item.nombre,
      precioVenta: item.precioUnitario,
      unidadMedida: item.unidadMedida,
    }

    setGranelEnEdicion({ producto, cantidadInicial: item.cantidad, esEdicion: true })
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
    if (guardando) return // evita doble toque mientras Firestore responde
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
      // Lecturas rápidas desde el caché local (Dexie) para calcular los
      // valores finales; la escritura real ocurre toda junta en Firestore.
      const itemsStock = []
      for (const item of carrito) {
        const producto = await db.products.get(item.productId)
        if (producto) {
          itemsStock.push({
            productId: item.productId,
            nuevoStock: Math.max(producto.stock - item.cantidad, 0),
          })
        }
      }

      let movimientoFiado = null
      let clienteActualizado = null
      if (modoPago === 'fiado') {
        movimientoFiado = {
          id: `mov-${Date.now()}`,
          customerId: clienteSeleccionadoId,
          fecha,
          tipo: 'cargo',
          monto: total,
        }

        const cliente = await db.customers.get(clienteSeleccionadoId)
        clienteActualizado = {
          id: clienteSeleccionadoId,
          deudaTotal: (cliente?.deudaTotal || 0) + total,
        }
      }

      // Cloud Directo: la venta, el descuento de stock y (si aplica) el
      // cargo al fiado se escriben JUNTOS y directo en Firestore. El
      // `await` es deliberado: el carrito, el cliente y la pantalla NO se
      // tocan hasta que el lote se confirme. Si falla, se cae al `catch`
      // con todo intacto para que el bodeguero pueda reintentar. Con
      // Yape/Plin no hay cargo a un cliente ni cambio que calcular: la
      // venta simplemente se registra con tipoPago: 'yape' para que el
      // Cierre de Caja la totalice por separado del efectivo.
      await registrarVentaEnNube({
        venta: {
          id: ventaId,
          fecha,
          total,
          tipoPago: modoPago,
          clienteId: modoPago === 'fiado' ? clienteSeleccionadoId : null,
          items: carrito.map((item) => ({
            productId: item.productId,
            nombre: item.nombre,
            precioUnitario: item.precioUnitario,
            cantidad: item.cantidad,
            esGranel: item.esGranel || false,
            unidadMedida: item.unidadMedida || null,
          })),
        },
        itemsStock,
        movimientoFiado,
        clienteActualizado,
      })

      // Solo llegamos acá si la transacción terminó con éxito:
      // ahora sí se limpia el estado y se vuelve al Home.
      setCarrito([])
      setModoPago(null)
      setMontoRecibido(0)
      setClienteSeleccionadoId('')
      onVentaFinalizada?.()
    } catch (error) {
      console.error('Error al registrar la venta:', error)
      alert('Ocurrió un error al guardar la venta. Verifica tu conexión a internet e intenta de nuevo.')
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
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      {formatCurrency(producto.precioVenta)}
                      {producto.tipoVenta === 'granel' ? ` / ${producto.unidadMedida}` : ''}
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
            onEditarGranel={editarCantidadGranelEnCarrito}
          />
        </section>

        {/* Selección de forma de pago */}
        {carrito.length > 0 && (
          <section className="card space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-dark-text-muted">Total a pagar</span>
              <span className="text-2xl font-bold text-dark-text">{formatCurrency(total)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setModoPago('efectivo')}
                className={`py-3 rounded-xl font-semibold border text-sm ${
                  modoPago === 'efectivo'
                    ? 'bg-success text-white border-success'
                    : 'bg-white text-dark-text border-slate-200'
                }`}
              >
                💵 Efectivo
              </button>
              <button
                onClick={() => setModoPago('yape')}
                className={`py-3 rounded-xl font-semibold border text-sm ${
                  modoPago === 'yape'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-dark-text border-slate-200'
                }`}
              >
                {infoYape.icono} Yape / Plin
              </button>
              <button
                onClick={() => setModoPago('fiado')}
                className={`py-3 rounded-xl font-semibold border text-sm ${
                  modoPago === 'fiado'
                    ? 'bg-warning text-white border-warning'
                    : 'bg-white text-dark-text border-slate-200'
                }`}
              >
                📒 Fiado
              </button>
            </div>

            {modoPago === 'yape' && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium ${infoYape.clases}`}>
                <span className="text-lg leading-none">{infoYape.icono}</span>
                Confirma cuando veas la notificación de pago en tu app de Yape o Plin.
              </div>
            )}

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
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setMostrarSelectorCliente(true)}
                  disabled={guardando}
                  className="input-field flex items-center justify-between text-left"
                >
                  <span className={hayClienteAsignado ? 'text-dark-text font-medium' : 'text-dark-text-muted'}>
                    {hayClienteAsignado
                      ? clienteSeleccionado?.nombre || 'Cliente seleccionado'
                      : 'Selecciona un cliente...'}
                  </span>
                  <span className="text-dark-text-muted text-sm">
                    {hayClienteAsignado ? 'Cambiar ▾' : '▾'}
                  </span>
                </button>

                {hayClienteAsignado && (
                  <p className="text-xs text-dark-text-muted">
                    Se sumarán <span className="font-semibold text-dark-text">{formatCurrency(total)}</span> a la
                    deuda de {clienteSeleccionado?.nombre || 'este cliente'} al confirmar la venta.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={finalizarVenta}
              disabled={!modoPago || guardando || ventaFiadaSinCliente}
              className="btn-success w-full text-lg"
            >
              {guardando
                ? 'Guardando...'
                : modoPago === 'fiado'
                  ? 'CONFIRMAR VENTA FIADA'
                  : 'CONFIRMAR VENTA'}
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

      {mostrarSelectorCliente && (
        <SelectorClienteModal
          clientes={clientes}
          clienteSeleccionadoId={clienteSeleccionadoId}
          onSeleccionar={manejarClienteSeleccionado}
          onCerrar={() => setMostrarSelectorCliente(false)}
        />
      )}

      {granelEnEdicion && (
        <CantidadGranelModal
          producto={granelEnEdicion.producto}
          cantidadInicial={granelEnEdicion.cantidadInicial}
          onConfirmar={confirmarCantidadGranel}
          onCerrar={() => setGranelEnEdicion(null)}
        />
      )}
    </div>
  )
}

export default VentasPage