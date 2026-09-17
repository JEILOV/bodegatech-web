import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { collection, count, getAggregateFromServer, query, sum, where } from 'firebase/firestore'
import { db } from '../../../db/dexie'
import { dbCloud } from '../../../services/firebase'
import { formatCurrency } from '../../../utils/formatCurrency'
import { obtenerRangoDeHoy } from '../../../utils/fechas'

// Mientras el panel está abierto, refrescamos la foto de Firestore sola
// para que si tienes la PC y el celular abiertos a la vez con el panel
// visible, los números remotos se actualicen sin que nadie toque nada.
const INTERVALO_REFRESCO_REMOTO_MS = 5000

/**
 * Botón flotante "Estado de la nube" + modal de diagnóstico.
 *
 * El lado LOCAL usa useLiveQuery sobre Dexie: es reactivo de verdad, se
 * actualiza solo apenas cambia cualquier tabla (venta nueva, abono,
 * restock, o un registro que llega por el listener de syncService).
 *
 * El lado REMOTO consulta Firestore directamente con agregaciones del
 * propio servidor (`getAggregateFromServer` + `count()`/`sum()`), NO
 * pasando por Dexie. Así el número remoto es 100% independiente de
 * cualquier bug de caché local: si algo se desfasó, este panel lo va a
 * mostrar en vez de ocultarlo repitiendo el mismo dato dos veces.
 *
 * Cloud Directo: ya no existe una cola de "cambios pendientes de subir"
 * que contar (cada venta/abono/restock se escribe directo en Firestore
 * al momento). Lo único que puede impedir guardar es no tener internet,
 * así que el indicador refleja eso: conectividad real del dispositivo.
 */
export function CloudStatusPanel() {
  const [abierto, setAbierto] = useState(false)
  const [remoto, setRemoto] = useState(null)
  const [cargandoRemoto, setCargandoRemoto] = useState(false)
  const [errorRemoto, setErrorRemoto] = useState(null)
  const [enLinea, setEnLinea] = useState(navigator.onLine)

  // ---------- Local (Dexie), en tiempo real ----------
  const totalProductosLocal = useLiveQuery(() => db.products.count(), [])

  const stockTotalLocal = useLiveQuery(
    () =>
      db.products
        .toArray()
        .then((productos) => productos.reduce((acumulado, p) => acumulado + (p.stock || 0), 0)),
    []
  )

  const totalClientesLocal = useLiveQuery(() => db.customers.count(), [])

  const deudaTotalLocal = useLiveQuery(
    () =>
      db.customers
        .toArray()
        .then((clientes) => clientes.reduce((acumulado, c) => acumulado + (c.deudaTotal || 0), 0)),
    []
  )

  const ventasHoyLocal = useLiveQuery(async () => {
    const { inicio, fin } = obtenerRangoDeHoy()
    const ventas = await db.sales.where('fecha').between(inicio, fin, true, false).toArray()
    return {
      cantidad: ventas.length,
      monto: ventas.reduce((acumulado, v) => acumulado + v.total, 0),
    }
  }, [])

  // Conectividad real del dispositivo: en Cloud Directo, sin internet
  // ninguna escritura puede completarse (no hay cola local que la guarde
  // para después), así que esto es lo único relevante que mostrar acá.
  useEffect(() => {
    function actualizarEstadoConexion() {
      setEnLinea(navigator.onLine)
    }
    window.addEventListener('online', actualizarEstadoConexion)
    window.addEventListener('offline', actualizarEstadoConexion)
    return () => {
      window.removeEventListener('online', actualizarEstadoConexion)
      window.removeEventListener('offline', actualizarEstadoConexion)
    }
  }, [])

  // ---------- Remoto (Firestore), bajo demanda ----------
  async function cargarEstadoRemoto() {
    setCargandoRemoto(true)
    setErrorRemoto(null)
    try {
      const { inicio, fin } = obtenerRangoDeHoy()

      const [productosSnap, clientesSnap, ventasHoySnap] = await Promise.all([
        getAggregateFromServer(collection(dbCloud, 'products'), {
          total: count(),
          stock: sum('stock'),
        }),
        getAggregateFromServer(collection(dbCloud, 'customers'), {
          total: count(),
          deuda: sum('deudaTotal'),
        }),
        getAggregateFromServer(
          query(
            collection(dbCloud, 'sales'),
            where('fecha', '>=', inicio),
            where('fecha', '<', fin)
          ),
          { total: count(), monto: sum('total') }
        ),
      ])

      setRemoto({
        productos: { total: productosSnap.data().total, stock: productosSnap.data().stock || 0 },
        clientes: { total: clientesSnap.data().total, deuda: clientesSnap.data().deuda || 0 },
        ventasHoy: { total: ventasHoySnap.data().total, monto: ventasHoySnap.data().monto || 0 },
        actualizadoEn: new Date(),
      })
    } catch (error) {
      console.error('[CloudStatusPanel] Error consultando agregados de Firestore:', error)
      setErrorRemoto('No se pudo consultar la nube. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setCargandoRemoto(false)
    }
  }

  useEffect(() => {
    if (!abierto) return

    // fetch inicial intencional al abrir el panel (mismo patrón ya usado
    // en App.jsx para esperar la primera carga de la nube); el intervalo
    // de abajo hace lo mismo en cada tick mientras el panel sigue abierto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarEstadoRemoto()
    const intervalo = setInterval(cargarEstadoRemoto, INTERVALO_REFRESCO_REMOTO_MS)
    return () => clearInterval(intervalo)
  }, [abierto])

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-4 left-4 z-40 bg-white border border-slate-200 rounded-full
                   shadow-md pl-3 pr-4 py-2 flex items-center gap-2 active:scale-95
                   transition-transform duration-100"
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            enLinea ? 'bg-success' : 'bg-warning animate-pulse'
          }`}
        />
        <span className="text-sm font-semibold text-dark-text">Estado de la nube</span>
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-dark-text text-lg">🔍 Diagnóstico de la nube</h3>
              <button
                onClick={() => setAbierto(false)}
                className="text-dark-text-muted text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            {/* 5. Estado de conexión (Cloud Directo: sin internet no se puede guardar) */}
            <div
              className={`rounded-xl p-3 flex items-center gap-3 ${
                enLinea ? 'bg-success/10' : 'bg-warning/10'
              }`}
            >
              <span
                className={`h-3 w-3 rounded-full flex-shrink-0 ${
                  enLinea ? 'bg-success' : 'bg-warning animate-pulse'
                }`}
              />
              <p className={`text-sm font-bold ${enLinea ? 'text-success' : 'text-warning'}`}>
                {enLinea
                  ? 'Conectado a la nube'
                  : 'Sin conexión: los cambios no se guardarán hasta reconectar'}
              </p>
            </div>

            {/* Encabezado de columnas */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-dark-text-muted uppercase tracking-wide">
                Métrica
              </span>
              <span className="text-xs font-semibold text-dark-text-muted uppercase tracking-wide">
                Este dispositivo / Nube
              </span>
            </div>

            {/* 1-4. Comparativa local vs. remoto */}
            <div className="space-y-1">
              <FilaComparativa
                etiqueta="Productos en catálogo"
                local={totalProductosLocal}
                remoto={remoto?.productos.total}
                cargandoRemoto={cargandoRemoto}
              />
              <FilaComparativa
                etiqueta="Stock físico total"
                local={stockTotalLocal}
                remoto={remoto?.productos.stock}
                cargandoRemoto={cargandoRemoto}
              />
              <FilaComparativa
                etiqueta="Clientes registrados"
                local={totalClientesLocal}
                remoto={remoto?.clientes.total}
                cargandoRemoto={cargandoRemoto}
              />
              <FilaComparativa
                etiqueta="Deuda total por cobrar"
                local={deudaTotalLocal}
                remoto={remoto?.clientes.deuda}
                cargandoRemoto={cargandoRemoto}
                formato={formatCurrency}
              />
              <FilaComparativa
                etiqueta="Ventas de hoy (cantidad)"
                local={ventasHoyLocal?.cantidad}
                remoto={remoto?.ventasHoy.total}
                cargandoRemoto={cargandoRemoto}
              />
              <FilaComparativa
                etiqueta="Ventas de hoy (monto)"
                local={ventasHoyLocal?.monto}
                remoto={remoto?.ventasHoy.monto}
                cargandoRemoto={cargandoRemoto}
                formato={formatCurrency}
              />
            </div>

            {errorRemoto && <p className="text-xs text-red-600">{errorRemoto}</p>}

            <p className="text-[11px] text-dark-text-muted leading-snug">
              Nota: si la nube tiene productos con <code>codigoBarras</code> vacío o
              duplicado, este dispositivo consolida cada duplicado en un solo producto (el
              más reciente). Por diseño, el conteo local de productos puede entonces ser
              menor al de la nube sin que eso sea un desfase real.
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <p className="text-xs text-dark-text-muted pt-3">
                {remoto
                  ? `Nube actualizada: ${remoto.actualizadoEn.toLocaleTimeString('es-PE')}`
                  : 'Consultando la nube...'}
              </p>
              <button
                onClick={cargarEstadoRemoto}
                disabled={cargandoRemoto}
                className="text-xs font-semibold text-primary disabled:opacity-50 pt-3"
              >
                {cargandoRemoto ? 'Actualizando...' : '↻ Actualizar ahora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Una fila "Etiqueta: local / remoto", con un sello de ✓/⚠ que compara
 * ambos números al céntimo. Sirve exactamente para el caso de uso que
 * pediste: abrir PC y celular a la vez, presionar el botón, y ver de un
 * vistazo si algo quedó desfasado en vez de tener que comparar a ojo.
 */
function FilaComparativa({ etiqueta, local, remoto, cargandoRemoto, formato }) {
  const formatear = formato || ((valor) => String(valor))
  const localListo = local !== undefined
  const remotoListo = remoto !== undefined && remoto !== null

  const coincide =
    localListo && remotoListo && Number(local).toFixed(2) === Number(remoto).toFixed(2)

  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
      <span className="text-sm text-dark-text-muted pr-2">{etiqueta}</span>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-dark-text whitespace-nowrap">
          {localListo ? formatear(local) : '...'}
          <span className="text-dark-text-muted font-normal"> / </span>
          {remotoListo ? formatear(remoto) : cargandoRemoto ? '...' : '—'}
        </p>
        {localListo && remotoListo && (
          <p className={`text-[10px] font-semibold ${coincide ? 'text-success' : 'text-red-600'}`}>
            {coincide ? '✓ Coincide' : '⚠ Desfasado'}
          </p>
        )}
      </div>
    </div>
  )
}

export default CloudStatusPanel