import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/dexie'
import { formatCurrency } from '../../../utils/formatCurrency'
import { obtenerRangoDeHoy } from '../../../utils/fechas'

export function MetricsHeader() {
  // OJO: este componente solo se monta cuando App.jsx ya bajó la pantalla
  // de "Sincronizando con la nube...", así que Dexie YA debería tener los
  // datos reales. Aun así, una consulta a IndexedDB sigue siendo
  // asíncrona: `useLiveQuery` pinta el valor por defecto en el primer
  // render y recién en el siguiente microtask entrega el real.
  //
  // Antes el valor por defecto era `0`, así que cada vez que este
  // componente se montaba desde cero (típicamente tras un F5 completo en
  // el celular) el usuario veía un "S/ 0.00" REAL, indistinguible de un
  // dato correcto, durante ese primer instante — exactamente el síntoma
  // reportado ("al refrescar la página vuelve a quedar en S/ 0.00 de la
  // nada"). Usamos `undefined` como centinela de "todavía cargando" y
  // mostramos un placeholder neutro en su lugar, para no mentirle nunca
  // al usuario con un cero que no es real.
  const ventasHoy = useLiveQuery(async () => {
    try {
      const { inicio, fin } = obtenerRangoDeHoy()
      const ventas = await db.sales.where('fecha').between(inicio, fin, true, false).toArray()
      return ventas.reduce((acumulado, venta) => acumulado + venta.total, 0)
    } catch (error) {
      console.error('[MetricsHeader] Error calculando ventas de hoy:', error)
      return 0
    }
  }, [])

  const totalFiados = useLiveQuery(async () => {
    try {
      const clientes = await db.customers.toArray()
      return clientes.reduce((acumulado, cliente) => acumulado + (cliente.deudaTotal || 0), 0)
    } catch (error) {
      console.error('[MetricsHeader] Error calculando total de fiados:', error)
      return 0
    }
  }, [])

  const cargandoVentas = ventasHoy === undefined
  const cargandoFiados = totalFiados === undefined

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card border-l-4 border-l-success">
        <p className="text-xs font-medium text-dark-text-muted uppercase tracking-wide">
          Ventas de hoy
        </p>
        <p className="text-2xl font-bold text-success mt-1">
          {cargandoVentas ? (
            <span className="inline-block h-6 w-20 rounded bg-success/10 animate-pulse align-middle" />
          ) : (
            formatCurrency(ventasHoy)
          )}
        </p>
      </div>

      <div className="card border-l-4 border-l-warning">
        <p className="text-xs font-medium text-dark-text-muted uppercase tracking-wide">
          Por cobrar (fiados)
        </p>
        <p className="text-2xl font-bold text-warning mt-1">
          {cargandoFiados ? (
            <span className="inline-block h-6 w-20 rounded bg-warning/10 animate-pulse align-middle" />
          ) : (
            formatCurrency(totalFiados)
          )}
        </p>
      </div>
    </div>
  )
}

export default MetricsHeader