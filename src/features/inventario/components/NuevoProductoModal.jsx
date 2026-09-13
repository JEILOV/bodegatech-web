import { useState } from 'react'
import { db } from '../../../db/dexie'
import { buscarProductoPorCodigo } from '../../../services/openFoodFactsApi'
import { ScannerModal } from '../../ventas/components/ScannerModal'

const CATEGORIA_POR_DEFECTO = 'Abarrotes'

export function NuevoProductoModal({ onCerrar, onProductoCreado }) {
  const [codigoBarras, setCodigoBarras] = useState('')
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState(CATEGORIA_POR_DEFECTO)
  const [imagen, setImagen] = useState(null)
  const [precioVenta, setPrecioVenta] = useState('')
  const [stock, setStock] = useState('')
  const [mostrarScanner, setMostrarScanner] = useState(false)
  const [consultando, setConsultando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensajeApi, setMensajeApi] = useState('')

  async function consultarCodigo(codigo) {
    setCodigoBarras(codigo)
    setConsultando(true)
    setMensajeApi('')

    const resultado = await buscarProductoPorCodigo(codigo)

    if (resultado) {
      setNombre(resultado.nombre)
      setCategoria(resultado.categoria)
      setImagen(resultado.imagen)
      setMensajeApi('✅ Producto encontrado en Open Food Facts')
    } else {
      setMensajeApi('No se encontró información. Completa los datos manualmente.')
    }

    setConsultando(false)
  }

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
      await db.products.add({
        id: nuevoProductoId,
        codigoBarras: codigoBarras.trim() || null,
        nombre: nombre.trim(),
        categoria: categoria.trim() || CATEGORIA_POR_DEFECTO,
        precioVenta: precioNumero,
        stock: stockNumero,
        imagen: imagen || null,
        synced: false,
      })
      onProductoCreado?.(nuevoProductoId)
      onCerrar()
    } catch (error) {
      console.error('Error al guardar producto:', error)
      alert('Ocurrió un error al guardar el producto. Verifica que el código de barras no esté repetido.')
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
          <label className="text-xs font-medium text-dark-text-muted">Código de barras</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={codigoBarras}
              onChange={(evento) => setCodigoBarras(evento.target.value)}
              placeholder="Ej: 7750243004018"
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
        </div>

        <button
          onClick={() => setMostrarScanner(true)}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl
                     active:scale-95 transition-transform duration-100 flex items-center justify-center gap-2"
        >
          <span>📷</span> Escanear / Consultar API
        </button>

        {consultando && (
          <p className="text-xs text-dark-text-muted text-center">Consultando Open Food Facts...</p>
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-dark-text-muted">Precio (S/)</label>
            <input
              type="number"
              value={precioVenta}
              onChange={(evento) => setPrecioVenta(evento.target.value)}
              placeholder="0.00"
              className="input-field mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-dark-text-muted">Stock inicial</label>
            <input
              type="number"
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