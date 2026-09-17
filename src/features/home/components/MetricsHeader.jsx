import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/dexie'
import { formatCurrency } from '../../../utils/formatCurrency'
import { obtenerRangoDeHoy } from '../../../utils/fechas'
import { IconTendencia, IconPorCobrar } from '../../../components/icons/NavIcons'

export function MetricsHeader() {
  // OJO: este componente solo se monta cuando App.jsx ya bajó la pantalla
  // de "Sincronizando con la nube...", así que Dexie YA debería tener los
  // datos reales (y, desde la segmentación multi-tenant, solo los de la
  // bodega autenticada: syncService.js filtra cada listener por
  // `bodegaId`, así que estas consultas nunca ven registros ajenos). Aun
  // así, una consulta a IndexedDB sigue siendo asíncrona: `useLiveQuery`
  // pinta el valor por defecto en el primer render y recién en el
  // siguiente microtask entrega el real.
  //
  // Antes el valor por defecto era `0`, así que cada vez que este
  // componente se montaba desde cero (típicamente tras un F5 completo en
  // el celular, o al cambiar de cuenta —ver el `key` en App.jsx—) el
  // usuario veía un "S/ 0.00" REAL, indistinguible de un dato correcto,
  // durante ese primer instante. Usamos `undefined` como centinela de
  // "todavía cargando" y mostramos un placeholder neutro en su lugar,
  // para no mentirle nunca al usuario con un cero que no es real.
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
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-50 text-success-600">
            <IconTendencia />
          </span>
          <p className="text-xs font-semibold text-dark-text-muted uppercase tracking-wide">
            Ventas de hoy
          </p>
        </div>
        <p className="text-2xl font-bold text-success">
          {cargandoVentas ? (
            <span className="inline-block h-6 w-20 rounded bg-success-50 animate-pulse align-middle" />
          ) : (
            formatCurrency(ventasHoy)
          )}
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
            <IconPorCobrar />
          </span>
          <p className="text-xs font-semibold text-dark-text-muted uppercase tracking-wide">
            Por cobrar
          </p>
        </div>
        <p className="text-2xl font-bold text-warning">
          {cargandoFiados ? (
            <span className="inline-block h-6 w-20 rounded bg-warning-50 animate-pulse align-middle" />
          ) : (
            formatCurrency(totalFiados)
          )}
        </p>
      </div>
    </div>
  )
}

export default MetricsHeader