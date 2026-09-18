// NuevoProductoModal.jsx
import { useEffect, useState } from 'react'
import { crearProductoEnNube } from '../../../services/firestoreDataService'
import { buscarProductoEnFirestorePorCodigo, aportarAlCatalogoGlobal } from '../../../services/firestoreProductsService'
import { db } from '../../../db/dexie'
import { MASTER_PRODUCTS } from '../../../db/masterCatalog'
import { buscarProductoPorCodigo } from '../../../services/openFoodFactsApi'
import { ScannerModal } from '../../ventas/components/ScannerModal'
import { UNIDADES_MEDIDA_GRANEL } from '../../../utils/granel'
import { IconCamara, IconBuscar, IconCerrar, IconCaja, IconBalanza, IconCheckCirculo } from '../../home/NavIcons'

const CATEGORIA_POR_DEFECTO = 'Abarrotes'

/**
 * Consulta el inventario REAL de la bodega activa en el caché local
 * (Dexie/IndexedDB) por código de barras — 0ms, funciona sin internet,
 * y es la fuente de verdad más confiable: si ya existe, trae precio y
 * stock ACTUALES de esta bodega, no una sugerencia genérica.
 *
 * `codigoBarras` es un índice único (`&codigoBarras`) en la tabla
 * `products`, así que a lo sumo hay una coincidencia.
 */
async function buscarEnInventarioDeBodega(codigoBarras) {
  try {
    const producto = await db.products.where('codigoBarras').equals(codigoBarras).first()
    return producto || null
  } catch (error) {
    console.warn('No se pudo consultar el inventario local (Dexie):', error)
    return null
  }
}

/**
 * Búsqueda instantánea (0ms) en el catálogo maestro local, antes de
 * recurrir a la nube o a la API externa.
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
  const [yaExisteEnBodega, setYaExisteEnBodega] = useState(false)

  async function consultarCodigo(codigo) {
    setCodigoBarras(codigo)
    setConsultando(true)
    setMensajeApi('')
    setImagen(null)
    setYaExisteEnBodega(false)

    // 1º Inventario real de la propia bodega (Dexie, caché local — 0ms,
    // funciona sin internet). Si el producto ya está registrado en ESTA
    // bodega, autocompletamos con sus datos reales y avisamos, porque
    // seguir con "Guardar" crearía un duplicado (el índice `&codigoBarras`
    // de Dexie es único).
    const productoBodega = await buscarEnInventarioDeBodega(codigo)
    if (productoBodega) {
      setNombre(productoBodega.nombre)
      setCategoria(productoBodega.categoria)
      setPrecioVenta(String(productoBodega.precioVenta))
      setStock(String(productoBodega.stock))
      setImagen(productoBodega.imagen || null)
      setMensajeApi('Producto encontrado: ya está en tu inventario')
      setYaExisteEnBodega(true)
      setConsultando(false)
      return
    }

    // 2º Catálogo Maestro local (instantáneo, 0ms, funciona sin internet)
    const productoLocal = buscarEnCatalogoMaestro(codigo)
    if (productoLocal) {
      setNombre(productoLocal.nombre)
      setCategoria(productoLocal.categoria)
      setPrecioVenta(String(productoLocal.precioSugerido))
      setMensajeApi('Producto encontrado en el Catálogo Maestro (offline)')
      setConsultando(false)
      return
    }

    // 3º Catálogo Colaborativo en la nube (masterCatalog en Firestore):
    // si OTRO bodeguero en otra cuenta ya registró este código, lo
    // autocompletamos sin tener que consultar una API externa.
    const productoColaborativo = await buscarProductoEnFirestorePorCodigo(codigo)
    if (productoColaborativo) {
      setNombre(productoColaborativo.nombre)
      setCategoria(productoColaborativo.categoria)
      if (productoColaborativo.precioVenta) {
        setPrecioVenta(String(productoColaborativo.precioVenta))
      }
      setImagen(productoColaborativo.imagen)
      setMensajeApi('Producto encontrado en el Catálogo Colaborativo (otros bodegueros)')
      setConsultando(false)
      return
    }

    // 4º Open Food Facts (requiere internet)
    const resultadoApi = await buscarProductoPorCodigo(codigo)
    if (resultadoApi) {
      setNombre(resultadoApi.nombre)
      setCategoria(resultadoApi.categoria)
      setImagen(resultadoApi.imagen)
      setMensajeApi('Producto encontrado en Open Food Facts')
      setConsultando(false)
      return
    }

    // 5º Registro manual
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

    // El código de barras ya pertenece a un producto de ESTA bodega
    // (detectado en el paso 1 de consultarCodigo): guardar chocaría con
    // el índice único `&codigoBarras` de Dexie y, peor, duplicaría el
    // producto en Firestore. Cortamos acá con un mensaje claro en vez
    // de dejar que falle la escritura más abajo.
    if (yaExisteEnBodega) {
      alert('Este código de barras ya pertenece a un producto de tu inventario. Edítalo desde la lista de productos en vez de crear uno nuevo.')
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
      const tieneCodigoReal = Boolean(codigoBarras.trim())
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

      // Aporte al Catálogo Colaborativo: solo si el producto tiene un
      // código de barras real (no uno sintético "SIN-CODIGO-..."), para
      // no ensuciar 'masterCatalog' con códigos que no le sirven a
      // ningún otro bodeguero. Se dispara sin `await` a propósito: es
      // un aporte de "mejor esfuerzo" que nunca debe demorar ni hacer
      // fallar el guardado del producto para el usuario actual.
      if (tieneCodigoReal) {
        aportarAlCatalogoGlobal(
          codigoBarrasFinal,
          nombre.trim(),
          categoria.trim() || CATEGORIA_POR_DEFECTO,
          imagen || null
        )
      }

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
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Encabezado con gradiente, en sintonía con AuthPage/HomeScreen */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-purple-600 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
          <h3 className="relative font-bold text-white text-lg">Registrar producto</h3>
          <button
            onClick={onCerrar}
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white
                       hover:bg-white/25 active:scale-90 transition-all duration-150"
          >
            <IconCerrar className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
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
                aria-label="Buscar código"
                className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-dark-text
                           font-semibold px-3.5 rounded-xl transition-colors duration-150"
              >
                <IconBuscar className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-dark-text-muted mt-1">
              Útil para productos sin empaque propio (carne, pollo, arroz suelto...): si lo
              dejas vacío, el sistema le asigna un código interno automático.
            </p>
          </div>

          <button
            onClick={() => setMostrarScanner(true)}
            className="w-full bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold py-3
                       rounded-xl shadow-md shadow-primary-600/20 active:scale-95 transition-all duration-150
                       flex items-center justify-center gap-2"
          >
            <IconCamara className="w-4 h-4" /> Escanear / Consultar
          </button>

          {consultando && (
            <p className="text-xs text-dark-text-muted text-center">Buscando producto...</p>
          )}
          {mensajeApi && !consultando && (
            <p
              className={`flex items-center justify-center gap-1.5 text-xs text-center ${
                yaExisteEnBodega ? 'text-amber-600 font-medium' : 'text-dark-text-muted'
              }`}
            >
              {mensajeApi.startsWith('Producto encontrado') && !yaExisteEnBodega && (
                <IconCheckCirculo className="w-3.5 h-3.5 text-success-600 shrink-0" />
              )}
              {mensajeApi}
            </p>
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
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-colors duration-150 ${
                  tipoVenta === 'unidad'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-dark-text border-slate-200 hover:border-primary-200'
                }`}
              >
                <IconCaja className="w-4 h-4" /> Por Unidad
              </button>
              <button
                type="button"
                onClick={() => setTipoVenta('granel')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-colors duration-150 ${
                  tipoVenta === 'granel'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-dark-text border-slate-200 hover:border-primary-200'
                }`}
              >
                <IconBalanza className="w-4 h-4" /> A Granel / Peso
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
                    className={`py-2 rounded-xl text-sm font-semibold border uppercase transition-colors duration-150 ${
                      unidadMedida === unidad
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-dark-text border-slate-200 hover:border-primary-200'
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
        </div>

        <div className="p-5 pt-0 flex-shrink-0">
          <button
            onClick={manejarGuardar}
            disabled={guardando || yaExisteEnBodega}
            className="w-full bg-success-500 hover:bg-success-600 text-white font-semibold py-3.5
                       rounded-xl shadow-md shadow-success-500/20 active:scale-95 transition-all duration-150
                       disabled:opacity-50 disabled:pointer-events-none"
          >
            {guardando ? 'Guardando...' : yaExisteEnBodega ? 'Ya está en tu inventario' : 'Guardar producto'}
          </button>
        </div>
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