import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, Timestamp, updateDoc } from 'firebase/firestore'
import { dbCloud } from '../../services/firebase'
import { DIAS_PLAN_PRO, PLAN_FREE, PLAN_PRO } from '../../config/planes'
import {
  aFecha,
  calcularEstadoPlan,
  calcularNuevoVencimiento,
  formatearFechaLarga,
  normalizarTexto,
} from '../../utils/plan'
import { IconBuscar, IconCerrar, IconTienda } from '../home/NavIcons'
import { IconEscudo, IconFlechaIzquierda, IconInfo } from './IconosSuscripcion'
import { useSuscripcion } from './useSuscripcion'

const FILTROS = [
  { id: 'todos', etiqueta: 'Todas' },
  { id: 'pro', etiqueta: 'Pro' },
  { id: 'free', etiqueta: 'Gratuitas' },
  { id: 'vencido', etiqueta: 'Vencidas' },
]

const ESTILOS_AVISO = {
  ok: 'bg-success-50 border-success-100 text-success-700',
  error: 'bg-red-50 border-red-100 text-red-700',
}

/** Etiqueta de estado y línea de vencimiento de una bodega. */
function describirEstado(estado) {
  if (estado.esPro) {
    if (!estado.fechaVencimiento) {
      return { insignia: 'Pro', clases: 'bg-success-50 text-success-700', detalle: 'Sin fecha de vencimiento' }
    }
    const dias = estado.diasRestantes === 1 ? 'queda 1 día' : `quedan ${estado.diasRestantes} días`
    return {
      insignia: 'Pro',
      clases: 'bg-success-50 text-success-700',
      detalle: `Vence el ${formatearFechaLarga(estado.fechaVencimiento)} (${dias})`,
    }
  }
  if (estado.vencido) {
    return {
      insignia: 'Vencido',
      clases: 'bg-warning-50 text-warning-700',
      detalle: `Venció el ${formatearFechaLarga(estado.fechaVencimiento)}`,
    }
  }
  return { insignia: 'Gratuito', clases: 'bg-slate-100 text-dark-text-light', detalle: 'Plan gratuito' }
}

/**
 * Panel de administración de planes: lista las bodegas registradas
 * (`users`) y permite activar 1 mes de Plan Pro o volver a gratuito, sin
 * entrar a la consola de Firebase.
 *
 * Flujo típico: la bodega paga por Yape/Plin y envía el comprobante por
 * WhatsApp (nombre de bodega y correo vienen en el mensaje) -> se busca
 * aquí por correo o nombre -> "Activar 1 mes Pro". La bodega ve el cambio
 * en su app al instante, porque su perfil se escucha en tiempo real.
 *
 * Seguridad: esta pantalla solo se muestra a cuentas con documento en
 * `admins/{uid}`, pero eso es únicamente comodidad de interfaz. Lo que
 * impide que otra cuenta lea o cambie planes son las reglas de Firestore
 * (`esAdmin()` en firestore.rules).
 *
 * @param {object} props
 * @param {() => void} props.onVolver
 */
export function AdminPlanesPage({ onVolver }) {
  const { esAdmin, cargandoAdmin } = useSuscripcion()

  const [bodegas, setBodegas] = useState(undefined) // undefined = cargando
  const [errorCarga, setErrorCarga] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [procesandoId, setProcesandoId] = useState(null)
  const [aviso, setAviso] = useState(null) // { tipo: 'ok' | 'error', texto }

  // Lista en vivo de todas las bodegas. Solo se abre si la cuenta es admin:
  // para cualquier otra, las reglas la rechazarían igualmente.
  useEffect(() => {
    if (!esAdmin) return undefined

    const cancelar = onSnapshot(
      collection(dbCloud, 'users'),
      (snapshot) => {
        setErrorCarga(null)
        setBodegas(snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() })))
      },
      (error) => {
        console.error('[AdminPlanesPage] No se pudo leer la lista de bodegas:', error)
        setErrorCarga(
          error.code === 'permission-denied'
            ? 'Firestore rechazó la lectura. Revisa que las reglas estén publicadas y que exista tu documento en la colección admins.'
            : 'No se pudo cargar la lista. Revisa tu conexión a internet.'
        )
        setBodegas([])
      }
    )

    return cancelar
  }, [esAdmin])

  // El aviso de resultado se oculta solo.
  useEffect(() => {
    if (!aviso) return undefined
    const temporizador = setTimeout(() => setAviso(null), 6000)
    return () => clearTimeout(temporizador)
  }, [aviso])

  // Cada bodega con su estado ya calculado. Más recientes primero: quien
  // acaba de registrarse y pagar queda arriba, sin necesidad de buscar.
  const filas = useMemo(() => {
    return (bodegas || [])
      .map((bodega) => ({
        ...bodega,
        estado: calcularEstadoPlan(bodega),
        creadoMs: aFecha(bodega.creadoEn)?.getTime() ?? 0,
      }))
      .sort((a, b) => b.creadoMs - a.creadoMs)
  }, [bodegas])

  const conteos = useMemo(
    () => ({
      todos: filas.length,
      pro: filas.filter((fila) => fila.estado.esPro).length,
      free: filas.filter((fila) => !fila.estado.esPro && !fila.estado.vencido).length,
      vencido: filas.filter((fila) => fila.estado.vencido).length,
    }),
    [filas]
  )

  const filasVisibles = useMemo(() => {
    const termino = normalizarTexto(busqueda)
    return filas.filter((fila) => {
      if (filtro === 'pro' && !fila.estado.esPro) return false
      if (filtro === 'free' && (fila.estado.esPro || fila.estado.vencido)) return false
      if (filtro === 'vencido' && !fila.estado.vencido) return false
      if (!termino) return true
      return (
        normalizarTexto(fila.email).includes(termino) ||
        normalizarTexto(fila.nombreBodega).includes(termino) ||
        normalizarTexto(fila.nombreAdministrador).includes(termino)
      )
    })
  }, [filas, filtro, busqueda])

  async function actualizarPlan(fila, cambios, mensajeExito) {
    setProcesandoId(fila.id)
    try {
      await updateDoc(doc(dbCloud, 'users', fila.id), cambios)
      setAviso({ tipo: 'ok', texto: mensajeExito })
    } catch (error) {
      console.error('[AdminPlanesPage] No se pudo actualizar el plan:', error)
      setAviso({
        tipo: 'error',
        texto:
          error.code === 'permission-denied'
            ? 'Firestore rechazó el cambio. Revisa que las reglas estén publicadas y que tu cuenta esté en la colección admins.'
            : 'No se pudo guardar el cambio. Revisa tu conexión a internet e inténtalo de nuevo.',
      })
    } finally {
      setProcesandoId(null)
    }
  }

  function activarUnMes(fila) {
    // Un Pro sin fecha no vence nunca: fijarle vencimiento lo acortaría.
    if (
      fila.estado.esPro &&
      !fila.estado.fechaVencimiento &&
      !window.confirm(
        `${fila.nombreBodega || fila.email} tiene un Plan Pro sin vencimiento. ¿Fijarle un vencimiento de ${DIAS_PLAN_PRO} días?`
      )
    ) {
      return
    }

    const nuevoVencimiento = calcularNuevoVencimiento(fila.estado)
    actualizarPlan(
      fila,
      { plan: PLAN_PRO, fechaVencimientoPro: Timestamp.fromDate(nuevoVencimiento) },
      `Plan Pro activo para ${fila.nombreBodega || fila.email} hasta el ${formatearFechaLarga(nuevoVencimiento)}.`
    )
  }

  function desactivarPro(fila) {
    if (
      !window.confirm(
        `¿Devolver ${fila.nombreBodega || fila.email} al plan gratuito? Perderá los beneficios Pro de inmediato.`
      )
    ) {
      return
    }
    actualizarPlan(
      fila,
      { plan: PLAN_FREE, fechaVencimientoPro: null },
      `${fila.nombreBodega || fila.email} volvió al plan gratuito.`
    )
  }

  const encabezado = (
    <header className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-purple-600 px-5 pt-8 pb-7 rounded-b-3xl shadow-lg shadow-primary-600/20">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
      <div className="relative flex items-center gap-3">
        <button
          onClick={onVolver}
          aria-label="Volver"
          className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white
                     active:scale-90 transition-transform duration-100 hover:bg-white/25"
        >
          <IconFlechaIzquierda />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
            <IconEscudo className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-lg truncate">Administrar planes</h1>
            {esAdmin && bodegas !== undefined && (
              <p className="text-white/70 text-xs">
                {conteos.pro} con Pro · {conteos.todos} bodegas
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  )

  // Verificando si la cuenta es administradora (una consulta breve).
  if (cargandoAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 pb-8">
        {encabezado}
        <p className="text-sm text-dark-text-muted text-center py-10">Verificando permisos...</p>
      </div>
    )
  }

  if (!esAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 pb-8">
        {encabezado}
        <main className="px-4 -mt-4">
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 text-center space-y-3">
            <p className="font-bold text-dark-text">Acceso restringido</p>
            <p className="text-sm text-dark-text-muted">
              Esta sección es solo para administradores de BodegaTech.
            </p>
            <button onClick={onVolver} className="btn-primary">
              Volver al inicio
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {encabezado}

      <main className="px-4 -mt-4 space-y-4">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <IconBuscar className="w-[18px] h-[18px]" />
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por correo o nombre de bodega..."
              aria-label="Buscar bodega por correo o nombre"
              className="input-field pl-10 pr-10"
              autoComplete="off"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                aria-label="Borrar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center
                           rounded-full text-slate-400 hover:bg-slate-100"
              >
                <IconCerrar className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1 bg-slate-100 rounded-xl p-1" role="tablist" aria-label="Filtrar por plan">
            {FILTROS.map((opcion) => (
              <button
                key={opcion.id}
                role="tab"
                aria-selected={filtro === opcion.id}
                onClick={() => setFiltro(opcion.id)}
                className={`py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  filtro === opcion.id
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-dark-text-muted hover:text-dark-text'
                }`}
              >
                {opcion.etiqueta}
                {bodegas !== undefined && ` (${conteos[opcion.id]})`}
              </button>
            ))}
          </div>
        </div>

        {aviso && (
          <div
            role="status"
            className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium ${ESTILOS_AVISO[aviso.tipo]}`}
          >
            <IconInfo className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{aviso.texto}</p>
          </div>
        )}

        {errorCarga && (
          <div role="alert" className={`rounded-2xl border px-4 py-3 text-sm font-medium ${ESTILOS_AVISO.error}`}>
            {errorCarga}
          </div>
        )}

        {bodegas === undefined && (
          <p className="text-sm text-dark-text-muted text-center py-6">Cargando bodegas...</p>
        )}

        {bodegas !== undefined && !errorCarga && filasVisibles.length === 0 && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm text-center py-6 px-4">
            <p className="text-sm text-dark-text-muted">
              {busqueda
                ? 'Ninguna bodega coincide con esa búsqueda.'
                : 'No hay bodegas en esta categoría.'}
            </p>
          </div>
        )}

        <ul className="space-y-2.5">
          {filasVisibles.map((fila) => {
            const { insignia, clases, detalle } = describirEstado(fila.estado)
            const ocupada = procesandoId === fila.id
            const puedeDesactivar = fila.estado.esPro || fila.estado.vencido || fila.plan === PLAN_PRO
            const etiquetaActivar = fila.estado.esPro ? 'Renovar 1 mes' : 'Activar 1 mes Pro'

            return (
              <li key={fila.id} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <IconTienda className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-dark-text truncate">
                        {fila.nombreBodega || 'Bodega sin nombre'}
                      </p>
                      <p className="text-xs text-dark-text-muted truncate">{fila.email || 'Sin correo registrado'}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${clases}`}>{insignia}</span>
                </div>

                <p className="mt-2.5 text-xs text-dark-text-muted">{detalle}</p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => activarUnMes(fila)}
                    disabled={ocupada}
                    className="flex-1 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 py-2.5 text-sm
                               font-semibold text-white shadow-sm active:scale-95 transition-all duration-150
                               disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {ocupada ? 'Guardando...' : etiquetaActivar}
                  </button>
                  {puedeDesactivar && (
                    <button
                      onClick={() => desactivarPro(fila)}
                      disabled={ocupada}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold
                                 text-dark-text-light hover:border-warning-100 hover:text-warning-700 active:scale-95
                                 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Desactivar Pro
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}

export default AdminPlanesPage