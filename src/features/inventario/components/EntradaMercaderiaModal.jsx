import { useState } from 'react'
import { db } from '../../../db/dexie'
import { buscarProductoEnFirestorePorCodigo } from '../../../services/firestoreProductsService'
import {
  crearProductoEnNube,
  actualizarProductoEnNube,
} from '../../../services/firestoreDataService'
import { ScannerModal } from '../../ventas/components/ScannerModal'

/**
 * Carga rápida de stock optimizada para escáner: se busca el código
 * en cascada (Dexie local → red de Firestore) y, si el producto existe,
 * solo pide la cantidad a sumar y vuelve a dejar la cámara lista para
 * el siguiente código, sin cerrar el modal.
 *
 * Nota de diseño: Open Food Facts (paso "c" de la cascada) no se
 * consulta aquí directamente. A diferencia de Dexie y Firestore, no
 * trae precio de venta, así que un producto encontrado solo ahí nunca
 * podría pasar al flujo de "solo sumar cantidad" sin antes pedirle un
 * precio al bodeguero. Por eso, cuando no aparece en Dexie ni en
 * Firestore, se delega directamente a NuevoProductoModal —que ya
 * consulta Open Food Facts internamente para prellenar los datos—
 * en vez de duplicar esa lógica acá.
 */
export function EntradaMercaderiaModal({ onCerrar, onProductoNoEncontrado }) {
  const [vista, setVista] = useState('escaneando') // 'escaneando' | 'manual' | 'buscando' | 'encontrado'
  const [codigoManual, setCodigoManual] = useState('')
  const [productoEncontrado, setProductoEncontrado] = useState(null)
  const [cantidad, setCantidad] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensajeError, setMensajeError] = useState('')
  const [historialSesion, setHistorialSesion] = useState([])

  async function buscarProducto(codigo) {
    const codigoLimpio = codigo.trim()
    if (!codigoLimpio) return

    setVista('buscando')
    setMensajeError('')

    // a) Base de datos local (Dexie) — instantáneo y funciona sin internet
    const productoLocal = await db.products.where('codigoBarras').equals(codigoLimpio).first()
    if (productoLocal) {
      setProductoEncontrado({
        id: productoLocal.id,
        nombre: productoLocal.nombre,
        stockActual: productoLocal.stock,
        esNuevoEnLocal: false,
      })
      setVista('encontrado')
      return
    }

    // b) Red colaborativa (Firestore): se reutilizan los datos descriptivos
    // que otro bodeguero ya cargó. El stock siempre parte en 0 porque es
    // específico de cada bodega, nunca se copia el de otro negocio.
    const productoRemoto = await buscarProductoEnFirestorePorCodigo(codigoLimpio)
    if (productoRemoto) {
      const nuevoId = `prod-${Date.now()}`
      try {
        // Cloud Directo: se crea directo en Firestore; el listener de
        // syncService.js lo reflejará solo en el caché local (Dexie).
        await crearProductoEnNube({
          id: nuevoId,
          codigoBarras: codigoLimpio,
          nombre: productoRemoto.nombre,
          categoria: productoRemoto.categoria,
          precioVenta: productoRemoto.precioVenta,
          imagen: productoRemoto.imagen,
          stock: 0,
        })
      } catch (error) {
        console.error('Error al agregar producto encontrado en la red:', error)
        setMensajeError('No se pudo agregar el producto. Verifica tu conexión a internet.')
        setVista('manual')
        return
      }
      setProductoEncontrado({
        id: nuevoId,
        nombre: productoRemoto.nombre,
        stockActual: 0,
        esNuevoEnLocal: true,
      })
      setVista('encontrado')
      return
    }

    // c) No existe en ningún lado conocido localmente: se delega la creación
    onProductoNoEncontrado(codigoLimpio)
  }

  function manejarCodigoEscaneado(codigo) {
    buscarProducto(codigo)
  }

  function manejarBusquedaManual() {
    buscarProducto(codigoManual)
  }

  async function confirmarSumaStock() {
    const cantidadNumero = Number(cantidad)
    if (!cantidad.trim() || Number.isNaN(cantidadNumero) || cantidadNumero <= 0) {
      setMensajeError('Ingresa una cantidad válida (mayor a 0).')
      return
    }

    setGuardando(true)
    try {
      await actualizarProductoEnNube(productoEncontrado.id, {
        stock: productoEncontrado.stockActual + cantidadNumero,
      })

      setHistorialSesion((actual) => [
        { nombre: productoEncontrado.nombre, cantidad: cantidadNumero },
        ...actual,
      ])

      // Deja todo listo para escanear el siguiente producto, sin cerrar el modal
      setProductoEncontrado(null)
      setCantidad('')
      setCodigoManual('')
      setVista('escaneando')
    } catch (error) {
      console.error('Error al sumar stock:', error)
      setMensajeError('Ocurrió un error al actualizar el stock. Verifica tu conexión a internet.')
    } finally {
      setGuardando(false)
    }
  }

  function cancelarProductoEncontrado() {
    setProductoEncontrado(null)
    setCantidad('')
    setMensajeError('')
    setVista('escaneando')
  }

  // Vista de cámara: pantalla completa (sin el marco de tarjeta de las demás vistas)
  if (vista === 'escaneando') {
    return (
      <ScannerModal
        onCodigoEscaneado={manejarCodigoEscaneado}
        onCerrar={() => setVista('manual')}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-dark-text text-lg">Entrada de Mercadería</h3>
          <button onClick={onCerrar} className="text-dark-text-muted text-xl font-bold px-2">
            ✕
          </button>
        </div>

        {vista === 'manual' && (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={codigoManual}
                onChange={(evento) => setCodigoManual(evento.target.value)}
                onKeyDown={(evento) => evento.key === 'Enter' && manejarBusquedaManual()}
                placeholder="Escribe el código de barras"
                autoFocus
                className="input-field flex-1"
              />
              <button
                onClick={manejarBusquedaManual}
                className="bg-slate-100 text-dark-text font-semibold px-3 rounded-xl text-sm"
              >
                🔍
              </button>
            </div>

            <button
              onClick={() => setVista('escaneando')}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl
                         active:scale-95 transition-transform duration-100 flex items-center justify-center gap-2"
            >
              <span>📷</span> Usar cámara
            </button>
          </>
        )}

        {vista === 'buscando' && (
          <p className="text-sm text-dark-text-muted text-center py-6">Buscando producto...</p>
        )}

        {vista === 'encontrado' && productoEncontrado && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="font-semibold text-dark-text">{productoEncontrado.nombre}</p>
              <p className="text-sm text-dark-text-muted">
                Stock actual:{' '}
                <span className="font-bold text-dark-text">{productoEncontrado.stockActual}</span>
              </p>
              {productoEncontrado.esNuevoEnLocal && (
                <p className="text-xs text-primary font-medium mt-1">
                  ✅ Encontrado en la red de bodegueros y agregado a tu inventario
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-dark-text-muted">Cantidad a sumar</label>
              <input
                type="number"
                value={cantidad}
                onChange={(evento) => setCantidad(evento.target.value)}
                onKeyDown={(evento) => evento.key === 'Enter' && confirmarSumaStock()}
                placeholder="Ej: 12"
                autoFocus
                className="input-field mt-1 text-lg font-bold"
              />
            </div>

            {mensajeError && <p className="text-xs text-warning font-medium">{mensajeError}</p>}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={cancelarProductoEncontrado}
                className="bg-white border border-slate-200 text-dark-text font-semibold py-3 rounded-xl"
              >
                Cancelar
              </button>
              <button onClick={confirmarSumaStock} disabled={guardando} className="btn-success">
                {guardando ? 'Guardando...' : `Sumar +${cantidad || '0'}`}
              </button>
            </div>
          </div>
        )}

        {historialSesion.length > 0 && (
          <div className="border-t border-slate-100 pt-3 space-y-1">
            <p className="text-xs font-bold text-dark-text-muted uppercase tracking-wide">
              Cargado en esta sesión
            </p>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {historialSesion.map((item, indice) => (
                <li key={indice} className="flex justify-between text-sm">
                  <span className="text-dark-text truncate mr-2">{item.nombre}</span>
                  <span className="font-bold text-success flex-shrink-0">+{item.cantidad}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default EntradaMercaderiaModal