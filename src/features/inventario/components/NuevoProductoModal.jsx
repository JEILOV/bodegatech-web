import { useEffect, useState } from 'react'
import { crearProductoEnNube } from '../../../services/firestoreDataService'
import { MASTER_PRODUCTS } from '../../../db/masterCatalog'
import { buscarProductoPorCodigo } from '../../../services/openFoodFactsApi'
import { ScannerModal } from '../../ventas/components/ScannerModal'
import { UNIDADES_MEDIDA_GRANEL } from '../../../utils/granel'

const CATEGORIA_POR_DEFECTO = 'Abarrotes'

/**
 * Búsqueda instantánea (0ms) en el catálogo maestro local,
 * antes de recurrir a la API externa.
 */
function buscarEnCatalogoMaestro(codigoBarras) {
  return MASTER_PRODUCTS.find((producto) => producto.codigoBarras === codigoBarras) || null
}

/**
 * `codigoInicial`: cuando este modal se abre desde la "Entrada de
 * Mercadería" porque el código escaneado no se encontró en ningún lado,
 * llega prellenado acá y se consulta automáticamente al montar el
 * componente, para que el bodeguero no tenga que volver a escribirlo.
 */
export function NuevoProductoModal({ onCerrar, onProductoCreado, codigoInicial }) {
  const [codigoBarras, setCodigoBarras] = useState(codigoInicial || '')
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState(CATEGORIA_POR_DEFECTO)
  const [imagen, setImagen] = useState(null)
  const [precioVenta, setPrecioVenta] = useState('')
  const [stock, setStock] = useState('')
  const [tipoVenta, setTipoVenta] = useState('unidad') // 'unidad' | 'granel'
  const [unidadMedida, setUnidadMedida] = useState(UNIDADES_MEDIDA_GRANEL[0])
  const [mostrarScanner, setMostrarScanner] = useState(false)
  const [consultando, setConsultando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensajeApi, setMensajeApi] = useState('')

  async function consultarCodigo(codigo) {
    setCodigoBarras(codigo)
    setConsultando(true)
    setMensajeApi('')
    setImagen(null)

    // 1º Catálogo Maestro local (instantáneo, 0ms, funciona sin internet)
    const productoLocal = buscarEnCatalogoMaestro(codigo)
    if (productoLocal) {
      setNombre(productoLocal.nombre)
      setCategoria(productoLocal.categoria)
      setPrecioVenta(String(productoLocal.precioSugerido))
      setMensajeApi('✅ Producto encontrado en el Catálogo Maestro (offline)')
      setConsultando(false)
      return
    }

    // 2º Open Food Facts (requiere internet)
    const resultadoApi = await buscarProductoPorCodigo(codigo)
    if (resultadoApi) {
      setNombre(resultadoApi.nombre)
      setCategoria(resultadoApi.categoria)
      setImagen(resultadoApi.imagen)
      setMensajeApi('✅ Producto encontrado en Open Food Facts')
      setConsultando(false)
      return
    }

    // 3º Registro manual
    setMensajeApi('No se encontró información. Completa los datos manualmente.')
    setConsultando(false)
  }

  useEffect(() => {
    // Se ejecuta una sola vez al montar, con el código ya escaneado desde afuera.
    if (codigoInicial) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      consultarCodigo(codigoInicial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function manejarCodigoEscaneado(codigo) {
    setMostrarScanner(false)
    consultarCodigo(codigo)
  }

  async function manejarConsultaManual() {
    if (!codigoBarras.trim()) {
      alert('Ingresa o escanea un código de barras primero.')
      return
    }
    await consultarCodigo(codigoBarras)
  }

  async function manejarGuardar() {
    if (!nombre.trim()) {
      alert('Ingresa el nombre del producto.')
      return
    }
    const precioNumero = Number(precioVenta)
    const stockNumero = Number(stock)

    if (!precioNumero || precioNumero <= 0) {
      alert('Ingresa un precio de venta válido.')
      return
    }
    if (stock === '' || Number.isNaN(stockNumero) || stockNumero < 0) {
      alert('Ingresa un stock inicial válido.')
      return
    }

    setGuardando(true)
    try {
      const nuevoProductoId = `prod-${Date.now()}`

      // Código de barras 100% opcional: los productos a granel (carne,
      // pollo, arroz suelto, etc.) casi nunca tienen uno propio. Si se
      // deja vacío, se genera uno sintético y único a partir del id del
      // producto, para nunca chocar con el índice único `&codigoBarras`
      // de Dexie (misma convención que usa syncService.js al sanear
      // productos que llegan sin código desde la nube).
      const codigoBarrasFinal = codigoBarras.trim() || `SIN-CODIGO-${nuevoProductoId}`

      await crearProductoEnNube({
        id: nuevoProductoId,
        codigoBarras: codigoBarrasFinal,
        nombre: nombre.trim(),
        categoria: categoria.trim() || CATEGORIA_POR_DEFECTO,
        precioVenta: precioNumero,
        stock: stockNumero,
        imagen: imagen || null,
        tipoVenta,
        unidadMedida: tipoVenta === 'granel' ? unidadMedida : null,
      })
      onProductoCreado?.(nuevoProductoId)
      onCerrar()
    } catch (error) {
      console.error('Error al guardar producto:', error)
      alert('Ocurrió un error al guardar el producto. Verifica tu conexión a internet.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-dark-text text-lg">Registrar producto</h3>
          <button onClick={onCerrar} className="text-dark-text-muted text-xl font-bold px-2">
            ✕
          </button>
        </div>

        {imagen && (
          <img src={imagen} alt={nombre} className="w-20 h-20 object-contain mx-auto rounded-lg" />
        )}

        <div>
          <label className="text-xs font-medium text-dark-text-muted">
            Código de barras <span className="font-normal">(opcional)</span>
          </label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={codigoBarras}
              onChange={(evento) => setCodigoBarras(evento.target.value)}
              placeholder="Ej: 7750243004018 — déjalo vacío si no tiene"
              className="input-field flex-1"
            />
            <button
              onClick={manejarConsultaManual}
              disabled={consultando}
              className="bg-slate-100 text-dark-text font-semibold px-3 rounded-xl text-sm"
            >
              🔍
            </button>
          </div>
          <p className="text-xs text-dark-text-muted mt-1">
            Útil para productos sin empaque propio (carne, pollo, arroz suelto...): si lo
            dejas vacío, el sistema le asigna un código interno automático.
          </p>
        </div>

        <button
          onClick={() => setMostrarScanner(true)}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl
                     active:scale-95 transition-transform duration-100 flex items-center justify-center gap-2"
        >
          <span>📷</span> Escanear / Consultar
        </button>

        {consultando && (
          <p className="text-xs text-dark-text-muted text-center">Buscando producto...</p>
        )}
        {mensajeApi && !consultando && (
          <p className="text-xs text-dark-text-muted text-center">{mensajeApi}</p>
        )}

        <div>
          <label className="text-xs font-medium text-dark-text-muted">Nombre del producto</label>
          <input
            type="text"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            placeholder="Ej: Leche Gloria 400g"
            className="input-field mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-dark-text-muted">Categoría</label>
          <input
            type="text"
            value={categoria}
            onChange={(evento) => setCategoria(evento.target.value)}
            className="input-field mt-1"
          />
        </div>

        {/* Tipo de venta: por unidad (default) o a granel/peso. Productos
            como carne, pollo, arroz o azúcar sueltos se venden por
            fracción (kg/gr) o por monto directo, no por unidades enteras. */}
        <div>
          <label className="text-xs font-medium text-dark-text-muted">Tipo de venta</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => setTipoVenta('unidad')}
              className={`py-2.5 rounded-xl text-sm font-semibold border ${
                tipoVenta === 'unidad'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-dark-text border-slate-200'
              }`}
            >
              📦 Por Unidad
            </button>
            <button
              type="button"
              onClick={() => setTipoVenta('granel')}
              className={`py-2.5 rounded-xl text-sm font-semibold border ${
                tipoVenta === 'granel'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-dark-text border-slate-200'
              }`}
            >
              ⚖️ A Granel / Peso
            </button>
          </div>
        </div>

        {tipoVenta === 'granel' && (
          <div>
            <label className="text-xs font-medium text-dark-text-muted">Unidad de medida</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {UNIDADES_MEDIDA_GRANEL.map((unidad) => (
                <button
                  key={unidad}
                  type="button"
                  onClick={() => setUnidadMedida(unidad)}
                  className={`py-2 rounded-xl text-sm font-semibold border uppercase ${
                    unidadMedida === unidad
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-dark-text border-slate-200'
                  }`}
                >
                  {unidad}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-dark-text-muted">
              {tipoVenta === 'granel' ? `Precio por ${unidadMedida} (S/)` : 'Precio (S/)'}
            </label>
            <input
              type="number"
              step={tipoVenta === 'granel' ? '0.01' : '1'}
              value={precioVenta}
              onChange={(evento) => setPrecioVenta(evento.target.value)}
              placeholder="0.00"
              className="input-field mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-dark-text-muted">
              {tipoVenta === 'granel' ? `Stock inicial (${unidadMedida})` : 'Stock inicial'}
            </label>
            <input
              type="number"
              step={tipoVenta === 'granel' ? '0.001' : '1'}
              value={stock}
              onChange={(evento) => setStock(evento.target.value)}
              placeholder="0"
              className="input-field mt-1"
            />
          </div>
        </div>

        <button onClick={manejarGuardar} disabled={guardando} className="btn-success w-full">
          {guardando ? 'Guardando...' : 'Guardar producto'}
        </button>
      </div>

      {mostrarScanner && (
        <ScannerModal
          onCodigoEscaneado={manejarCodigoEscaneado}
          onCerrar={() => setMostrarScanner(false)}
        />
      )}
    </div>
  )
}

export default NuevoProductoModal