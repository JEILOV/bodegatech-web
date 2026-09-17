import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/dexie'
import { formatCurrency } from '../../../utils/formatCurrency'

const ICONOS_MEDIO_PAGO = {
  efectivo: '💵',
  yape: '📱',
  plin: '📲',
}

function formatearFecha(fechaIso) {
  return new Date(fechaIso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Historial reciente de abonos (pagos parciales) de un cliente fiado.
 * Lee directamente de `db.movements` (tipo: 'abono'), que es la misma
 * tabla donde `AbonoModal` registra cada pago.
 */
export function HistorialAbonos({ clienteId, limite = 5 }) {
  const abonos = useLiveQuery(async () => {
    const movimientos = await db.movements
      .where('customerId')
      .equals(clienteId)
      .and((movimiento) => movimiento.tipo === 'abono')
      .toArray()

    return movimientos
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, limite)
  }, [clienteId, limite])

  if (abonos === undefined) {
    return <p className="text-xs text-dark-text-muted py-2">Cargando historial...</p>
  }

  if (abonos.length === 0) {
    return <p className="text-xs text-dark-text-muted py-2">Aún no hay abonos registrados.</p>
  }

  return (
    <ul className="divide-y divide-slate-100">
      {abonos.map((abono) => (
        <li key={abono.id} className="flex items-center justify-between py-2 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{ICONOS_MEDIO_PAGO[abono.tipoPago] || '💰'}</span>
            <div className="min-w-0">
              <p className="text-xs text-dark-text-muted truncate">
                {formatearFecha(abono.fecha)}
              </p>
            </div>
          </div>
          <span className="font-semibold text-success flex-shrink-0">
            + {formatCurrency(abono.monto)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default HistorialAbonos