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
  // --- Ventas de hoy ---
  const ventasHoy = useLiveQuery(async () => {
    const { inicio, fin } = obtenerRangoDeHoy()
    const ventas = await db.sales
      .where('fecha')
      .between(inicio, fin, true, false)
      .toArray()

    return ventas.reduce((acumulado, venta) => acumulado + venta.total, 0)
  }, [])

  // --- Total por cobrar en fiados ---
  const totalFiados = useLiveQuery(async () => {
    const clientes = await db.customers.toArray()
    return clientes.reduce((acumulado, cliente) => acumulado + (cliente.deudaTotal || 0), 0)
  }, [])

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card border-l-4 border-l-success">
        <p className="text-xs font-medium text-dark-text-muted uppercase tracking-wide">
          Ventas de hoy
        </p>
        <p className="text-2xl font-bold text-success mt-1">
          {ventasHoy === undefined ? '...' : formatCurrency(ventasHoy)}
        </p>
      </div>

      <div className="card border-l-4 border-l-warning">
        <p className="text-xs font-medium text-dark-text-muted uppercase tracking-wide">
          Por cobrar (fiados)
        </p>
        <p className="text-2xl font-bold text-warning mt-1">
          {totalFiados === undefined ? '...' : formatCurrency(totalFiados)}
        </p>
      </div>
    </div>
  )
}

export default MetricsHeader