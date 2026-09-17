import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import { formatCurrency } from '../../utils/formatCurrency'
import { obtenerInfoMetodoPago } from '../../utils/metodoPago'
import { formatearCantidadItem } from '../../utils/granel'
import { DetalleVentaModal } from './components/DetalleVentaModal'

/** Convierte un objeto Date a formato "YYYY-MM-DD" (el que usan los <input type="date">). */
function formatearInputDate(fecha) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/** Formatea una fecha ISO guardada en Dexie a "DD/MM/YYYY - HH:mm". */
function formatearFechaHora(fechaISO) {
  const fecha = new Date(fechaISO)
  const dia = String(fecha.getDate()).padStart(2, '0')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const anio = fecha.getFullYear()
  const horas = String(fecha.getHours()).padStart(2, '0')
  const minutos = String(fecha.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${anio} - ${horas}:${minutos}`
}

/**
 * Resumen breve de los productos de una venta, para la tarjeta de la
 * lista (ej. "2 productos: Aceite Primor 1L, Inka Kola..." o, con un
 * producto a granel, "1 producto: 1.5 kg Carne de res"). Muestra los
 * primeros 2 ítems y agrega "..." si hay más.
 */
function resumirItems(items) {
  if (!items || items.length === 0) return 'Sin productos'
  const cantidad = items.length
  const etiquetaCantidad = `${cantidad} producto${cantidad === 1 ? '' : 's'}`
  const nombres = items
    .slice(0, 2)
    .map((item) => (item.esGranel ? `${formatearCantidadItem(item)} ${item.nombre}` : item.nombre))
  const sufijo = cantidad > 2 ? '...' : ''
  return `${etiquetaCantidad}: ${nombres.join(', ')}${sufijo}`
}

const HOY = new Date()

/** Rangos rápidos: solo devuelven fechas en formato "YYYY-MM-DD" para llenar los inputs. */
const FILTROS_RAPIDOS = {
  hoy: () => {
    const texto = formatearInputDate(HOY)
    return { fechaInicio: texto, fechaFin: texto }
  },
  semana: () => {
    const diaDeLaSemana = HOY.getDay() // 0 = domingo, 1 = lunes...
    const diasDesdeElLunes = diaDeLaSemana === 0 ? 6 : diaDeLaSemana - 1
    const inicioDeSemana = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate())
    inicioDeSemana.setDate(inicioDeSemana.getDate() - diasDesdeElLunes)
    return { fechaInicio: formatearInputDate(inicioDeSemana), fechaFin: formatearInputDate(HOY) }
  },
  mes: () => {
    const inicioDeMes = new Date(HOY.getFullYear(), HOY.getMonth(), 1)
    return { fechaInicio: formatearInputDate(inicioDeMes), fechaFin: formatearInputDate(HOY) }
  },
}

/**
 * Convierte el rango de inputs (strings "YYYY-MM-DD") al rango ISO real
 * que se compara contra el índice `fecha` de Dexie: desde las 00:00:00.000
 * del día de inicio hasta las 23:59:59.999 del día de fin.
 */
function obtenerRangoISO(fechaInicioStr, fechaFinStr) {
  const [anioI, mesI, diaI] = fechaInicioStr.split('-').map(Number)
  const [anioF, mesF, diaF] = fechaFinStr.split('-').map(Number)

  const inicio = new Date(anioI, mesI - 1, diaI, 0, 0, 0, 0)
  const fin = new Date(anioF, mesF - 1, diaF, 23, 59, 59, 999)

  return { inicio: inicio.toISOString(), fin: fin.toISOString() }
}

export function CierreCajaPage({ onVolver }) {
  const [fechaInicio, setFechaInicio] = useState(() => formatearInputDate(HOY))
  const [fechaFin, setFechaFin] = useState(() => formatearInputDate(HOY))
  const [cierre, setCierre] = useState(null)
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null)

  const clientes = useLiveQuery(() => db.customers.toArray(), [])

  const nombrePorClienteId = useMemo(() => {
    const mapa = {}
    for (const cliente of clientes || []) {
      mapa[cliente.id] = cliente.nombre
    }
    return mapa
  }, [clientes])

  function aplicarFiltroRapido(clave) {
    const { fechaInicio: inicio, fechaFin: fin } = FILTROS_RAPIDOS[clave]()
    setFechaInicio(inicio)
    setFechaFin(fin)
    setCierre(null)
  }

  function manejarCambioFecha(setter, valor) {
    setter(valor)
    setCierre(null)
  }

  const esRangoValido = fechaInicio && fechaFin && fechaInicio <= fechaFin

  const datos = useLiveQuery(async () => {
    if (!esRangoValido) return { ventas: [], totalEfectivo: 0, totalFiado: 0, totalGeneral: 0 }

    const { inicio, fin } = obtenerRangoISO(fechaInicio, fechaFin)
    const ventas = await db.sales.where('fecha').between(inicio, fin, true, true).toArray()

    // Más recientes primero. El formato ISO ordena igual como texto que como fecha.
    ventas.sort((a, b) => b.fecha.localeCompare(a.fecha))

    const totales = ventas.reduce(
      (acumulado, venta) => {
        if (venta.tipoPago === 'efectivo') {
          acumulado.totalEfectivo += venta.total
        } else if (venta.tipoPago === 'fiado') {
          acumulado.totalFiado += venta.total
        }
        acumulado.totalGeneral += venta.total
        return acumulado
      },
      { totalEfectivo: 0, totalFiado: 0, totalGeneral: 0 }
    )

    return { ventas, ...totales }
  }, [fechaInicio, fechaFin, esRangoValido])

  const filtroRapidoActivo = useMemo(() => {
    for (const [clave, obtenerRango] of Object.entries(FILTROS_RAPIDOS)) {
      const rango = obtenerRango()
      if (rango.fechaInicio === fechaInicio && rango.fechaFin === fechaFin) return clave
    }
    return null
  }, [fechaInicio, fechaFin])

  const esHoy = filtroRapidoActivo === 'hoy'

  function realizarCierreDeCaja() {
    if (!datos) return
    setCierre({
      totalEfectivo: datos.totalEfectivo,
      totalFiado: datos.totalFiado,
      totalGeneral: datos.totalGeneral,
      cantidadVentas: datos.ventas.length,
      hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-primary px-5 py-5 flex items-center gap-3">
        <button onClick={onVolver} className="text-white text-xl">
          ←
        </button>
        <h1 className="text-white font-bold text-lg">Reporte de Ventas</h1>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Filtros rápidos */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { clave: 'hoy', etiqueta: 'Hoy' },
            { clave: 'semana', etiqueta: 'Esta Semana' },
            { clave: 'mes', etiqueta: 'Este Mes' },
          ].map((opcion) => (
            <button
              key={opcion.clave}
              onClick={() => aplicarFiltroRapido(opcion.clave)}
              className={`py-3 rounded-xl font-semibold text-sm border transition-colors ${
                filtroRapidoActivo === opcion.clave
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-dark-text border-slate-200'
              }`}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>

        {/* Calendario libre */}
        <section className="card space-y-3">
          <h2 className="text-sm font-bold text-dark-text uppercase tracking-wide">
            Rango de fechas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dark-text-muted mb-1 block">Fecha inicio</label>
              <input
                type="date"
                value={fechaInicio}
                max={fechaFin}
                onChange={(evento) => manejarCambioFecha(setFechaInicio, evento.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-dark-text-muted mb-1 block">Fecha fin</label>
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio}
                onChange={(evento) => manejarCambioFecha(setFechaFin, evento.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>
          {!esRangoValido && (
            <p className="text-xs text-warning font-medium">
              La fecha de inicio no puede ser posterior a la fecha fin.
            </p>
          )}
        </section>

        {/* Totales del periodo */}
        <section className="card space-y-3">
          <h2 className="text-sm font-bold text-dark-text uppercase tracking-wide">
            Resumen del periodo
          </h2>

          {datos === undefined && <p className="text-sm text-dark-text-muted">Cargando...</p>}

          {datos !== undefined && (
            <>
              <div className="flex items-center justify-between bg-success/10 rounded-lg px-3 py-3">
                <span className="text-sm font-medium text-dark-text">💵 Total en efectivo</span>
                <span className="text-lg font-bold text-success">
                  {formatCurrency(datos.totalEfectivo)}
                </span>
              </div>

              <div className="flex items-center justify-between bg-warning/10 rounded-lg px-3 py-3">
                <span className="text-sm font-medium text-dark-text">📒 Total fiado</span>
                <span className="text-lg font-bold text-warning">
                  {formatCurrency(datos.totalFiado)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-sm font-semibold text-dark-text-muted">
                  Total vendido ({datos.ventas.length}{' '}
                  {datos.ventas.length === 1 ? 'venta' : 'ventas'})
                </span>
                <span className="text-xl font-bold text-dark-text">
                  {formatCurrency(datos.totalGeneral)}
                </span>
              </div>
            </>
          )}
        </section>

        {/* Cierre de caja: solo si el rango seleccionado es exactamente "Hoy" */}
        {esHoy && (
          <section className="space-y-3">
            {!cierre && (
              <button
                onClick={realizarCierreDeCaja}
                disabled={!datos}
                className="btn-primary w-full text-lg flex items-center justify-center gap-2"
              >
                🧮 Realizar Cierre de Caja
              </button>
            )}

            {cierre && (
              <div className="card border-2 border-primary space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-dark-text uppercase tracking-wide">
                    Cierre de caja — {cierre.hora}
                  </h3>
                  <span className="text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded-full">
                    Realizado
                  </span>
                </div>

                <div className="bg-primary/5 rounded-xl p-4 space-y-1">
                  <p className="text-xs text-dark-text-muted">
                    Dinero físico que debería haber en el cajón
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(cierre.totalEfectivo)}
                  </p>
                </div>

                <p className="text-sm text-dark-text-muted">
                  Adicionalmente, hoy se fiaron{' '}
                  <span className="font-bold text-warning">
                    {formatCurrency(cierre.totalFiado)}
                  </span>{' '}
                  (dinero pendiente de cobro, no está en el cajón).
                </p>

                <button
                  onClick={() => setCierre(null)}
                  className="text-sm font-semibold text-dark-text-muted underline"
                >
                  Rehacer cierre
                </button>
              </div>
            )}
          </section>
        )}

        {/* Detalle de ventas del periodo */}
        <section className="card space-y-3">
          <h2 className="text-sm font-bold text-dark-text uppercase tracking-wide">
            Detalle de ventas
          </h2>

          {datos === undefined && <p className="text-sm text-dark-text-muted">Cargando...</p>}

          {datos?.ventas.length === 0 && (
            <p className="text-sm text-dark-text-muted">
              No hay ventas registradas en este periodo.
            </p>
          )}

          {datos?.ventas.length > 0 && (
            // Mobile-first: una columna con áreas de toque amplias. Desde
            // `sm:` en adelante (tablet/PC) pasa a 2 columnas con más
            // espaciado, sin perder legibilidad ni resolución.
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[32rem] overflow-y-auto p-0.5 -m-0.5">
              {datos.ventas.map((venta) => {
                const infoMetodoPago = obtenerInfoMetodoPago(venta.tipoPago)
                const nombreCliente =
                  venta.tipoPago === 'fiado'
                    ? nombrePorClienteId[venta.clienteId] || 'Cliente eliminado'
                    : 'Cliente general'

                return (
                  <li key={venta.id}>
                    <button
                      onClick={() => setVentaSeleccionada(venta)}
                      className="w-full text-left bg-white border border-slate-200 rounded-xl p-3.5
                                 flex flex-col gap-1.5 active:scale-[0.98] hover:border-primary/40
                                 hover:shadow-sm transition-all duration-100"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-dark-text truncate">
                            {formatearFechaHora(venta.fecha)}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${infoMetodoPago.clases}`}
                          >
                            {infoMetodoPago.icono} {infoMetodoPago.etiqueta}
                          </span>
                        </div>
                        <span className="text-base font-bold text-dark-text whitespace-nowrap flex-shrink-0">
                          {formatCurrency(venta.total)}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-dark-text-muted truncate">
                        {nombreCliente}
                      </p>
                      <p className="text-xs text-dark-text-muted truncate">
                        {resumirItems(venta.items)}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      {ventaSeleccionada && (
        <DetalleVentaModal
          venta={ventaSeleccionada}
          clienteNombre={
            ventaSeleccionada.tipoPago === 'fiado'
              ? nombrePorClienteId[ventaSeleccionada.clienteId] || 'Cliente eliminado'
              : null
          }
          onCerrar={() => setVentaSeleccionada(null)}
        />
      )}
    </div>
  )
}

export default CierreCajaPage