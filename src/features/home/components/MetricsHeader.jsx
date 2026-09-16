import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/dexie'
import { formatCurrency } from '../../../utils/formatCurrency'

/**
 * Devuelve el rango [inicioDeHoy, finDeHoy] en formato ISO
 * para filtrar ventas del día actual.
 */
function obtenerRangoDeHoy() {
  const ahora = new Date()
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 1)
  return { inicio: inicio.toISOString(), fin: fin.toISOString() }
}

export function MetricsHeader() {
  // El tercer argumento de useLiveQuery es el valor por defecto que se
  // muestra mientras la consulta resuelve por primera vez (y si llegara a
  // fallar). Antes no se pasaba ninguno, así que el componente se quedaba
  // en "..." para siempre si la primera ejecución coincidía con el
  // arranque/siembra de Dexie y esa ejecución puntual fallaba o tardaba:
  // al no recibir un valor, useLiveQuery seguía devolviendo `undefined` y
  // nunca más se reintentaba solo. Con el default en 0, la métrica se ve
  // como "S/ 0.00" de inmediato y se actualiza sola en cuanto la consulta
  // real resuelve o en cuanto cambian los datos (venta nueva, abono, etc.).
  const ventasHoy = useLiveQuery(
    async () => {
      try {
        const { inicio, fin } = obtenerRangoDeHoy()
        const ventas = await db.sales.where('fecha').between(inicio, fin, true, false).toArray()
        return ventas.reduce((acumulado, venta) => acumulado + venta.total, 0)
      } catch (error) {
        console.error('[MetricsHeader] Error calculando ventas de hoy:', error)
        return 0
      }
    },
    [],
    0
  )

  const totalFiados = useLiveQuery(
    async () => {
      try {
        const clientes = await db.customers.toArray()
        return clientes.reduce((acumulado, cliente) => acumulado + (cliente.deudaTotal || 0), 0)
      } catch (error) {
        console.error('[MetricsHeader] Error calculando total de fiados:', error)
        return 0
      }
    },
    [],
    0
  )

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card border-l-4 border-l-success">
        <p className="text-xs font-medium text-dark-text-muted uppercase tracking-wide">
          Ventas de hoy
        </p>
        <p className="text-2xl font-bold text-success mt-1">{formatCurrency(ventasHoy)}</p>
      </div>

      <div className="card border-l-4 border-l-warning">
        <p className="text-xs font-medium text-dark-text-muted uppercase tracking-wide">
          Por cobrar (fiados)
        </p>
        <p className="text-2xl font-bold text-warning mt-1">{formatCurrency(totalFiados)}</p>
      </div>
    </div>
  )
}

export default MetricsHeader