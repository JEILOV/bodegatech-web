import { useState } from 'react'
import { loginUsuario, registrarUsuario } from '../../services/authService'

/**
 * Traduce los códigos de error de Firebase Auth a mensajes amigables
 * en español, tanto para inicio de sesión como para registro.
 */
const MENSAJES_ERROR_FIREBASE = {
  'auth/invalid-email': 'El correo ingresado no es válido.',
  'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
  'auth/user-not-found': 'No existe una cuenta con este correo.',
  'auth/wrong-password': 'La contraseña es incorrecta.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos fallidos. Espera unos minutos.',
  'auth/email-already-in-use': 'El correo ya está registrado. Intenta iniciar sesión.',
  'auth/weak-password': 'La contraseña debe tener un mínimo de 6 caracteres.',
  'auth/operation-not-allowed': 'El registro con correo y contraseña no está habilitado.',
  'auth/network-request-failed': 'Sin conexión a internet. Verifica tu red e intenta de nuevo.',
}

function mensajeDeError(error) {
  return MENSAJES_ERROR_FIREBASE[error?.code] || 'Ocurrió un error inesperado. Intenta de nuevo.'
}

/* Clases compartidas: sobrias, sin colores de marca saturados. */
const CLASE_LABEL = 'block text-sm font-medium text-slate-700'
const CLASE_INPUT =
  'input-field rounded-lg border-slate-300 placeholder:text-slate-400 ' +
  'focus:border-slate-900 focus:ring-slate-900/10'
const CLASE_BOTON_PRINCIPAL =
  'w-full rounded-lg bg-slate-900 text-white text-sm font-semibold py-3 shadow-sm ' +
  'hover:bg-slate-800 active:bg-slate-950 transition-colors duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:pointer-events-none'

/**
 * Isotipo vectorial de BodegaTech: cuadrado grafito con una "B"
 * geométrica de trazo continuo (dos paneles apilados, como un estante).
 */
function IsotipoBodegaTech({ className = 'w-10 h-10' }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} role="img" aria-label="BodegaTech">
      <rect width="40" height="40" rx="10" fill="#0F172A" />
      <path
        d="M14 11v20M14 11h5a5 5 0 010 10h-5M14 21h6a5 5 0 010 10h-6"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Ícono de ojo (mostrar/ocultar contraseña), sin dependencias externas. */
function IconoOjo({ visible }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <path
          d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 4.24A9.77 9.77 0 0112 4c5 0 9 4 10 8a13.4 13.4 0 01-2.29 3.88M6.6 6.6C4.6 8 3.2 10 2 12c1 4 5 8 10 8 1.5 0 2.9-.32 4.16-.9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path
        d="M2 12c1-4 5-8 10-8s9 4 10 8c-1 4-5 8-10 8s-9-4-10-8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

/** Campo de contraseña reutilizable, con botón de ojo integrado. */
function CampoPassword({ label, value, onChange, autoComplete, placeholder = '••••••••' }) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label className={CLASE_LABEL}>{label}</label>
      <div className="relative mt-1.5">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${CLASE_INPUT} pr-12`}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setVisible((actual) => !actual)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600
                     transition-colors"
          tabIndex={-1}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <IconoOjo visible={visible} />
        </button>
      </div>
    </div>
  )
}

/** Alerta visual de error, con ícono, para ambos formularios. */
function AlertaError({ mensaje }) {
  if (!mensaje) return null
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 mt-0.5 shrink-0">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span>{mensaje}</span>
    </div>
  )
}

function FormularioLogin({ onExito }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function manejarSubmit(evento) {
    evento.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña.')
      return
    }

    setCargando(true)
    try {
      await loginUsuario(email, password)
      onExito?.()
      // No hace falta redirigir manualmente:
      // App.jsx reacciona al cambio de estado vía observarEstadoAuth
    } catch (error) {
      setError(mensajeDeError(error))
    } finally {
      setCargando(false)
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="space-y-4">
      <div>
        <label className={CLASE_LABEL}>Correo electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          placeholder="tucorreo@ejemplo.com"
          className={`${CLASE_INPUT} mt-1.5`}
          autoComplete="email"
          autoFocus
        />
      </div>

      <CampoPassword
        label="Contraseña"
        value={password}
        onChange={(evento) => setPassword(evento.target.value)}
        autoComplete="current-password"
      />

      <AlertaError mensaje={error} />

      <button
        type="submit"
        disabled={cargando}
        className={CLASE_BOTON_PRINCIPAL}
      >
        {cargando ? 'Ingresando...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}

function FormularioRegistro({ onExito }) {
  const [nombreBodega, setNombreBodega] = useState('')
  const [nombreAdministrador, setNombreAdministrador] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function manejarSubmit(evento) {
    evento.preventDefault()
    setError('')

    if (
      !nombreBodega.trim() ||
      !nombreAdministrador.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmarPassword.trim()
    ) {
      setError('Completa todos los campos para crear tu cuenta.')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener un mínimo de 6 caracteres.')
      return
    }

    if (password !== confirmarPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setCargando(true)
    try {
      await registrarUsuario({ nombreBodega, nombreAdministrador, email, password })
      onExito?.()
      // No hace falta redirigir manualmente:
      // App.jsx reacciona al cambio de estado vía observarEstadoAuth
    } catch (error) {
      setError(mensajeDeError(error))
    } finally {
      setCargando(false)
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="space-y-4">
      <div>
        <label className={CLASE_LABEL}>Nombre de la bodega</label>
        <input
          type="text"
          value={nombreBodega}
          onChange={(evento) => setNombreBodega(evento.target.value)}
          placeholder="Bodega Don Pedro"
          className={`${CLASE_INPUT} mt-1.5`}
          autoComplete="organization"
          autoFocus
        />
      </div>

      <div>
        <label className={CLASE_LABEL}>Nombre del administrador</label>
        <input
          type="text"
          value={nombreAdministrador}
          onChange={(evento) => setNombreAdministrador(evento.target.value)}
          placeholder="Pedro Ramírez"
          className={`${CLASE_INPUT} mt-1.5`}
          autoComplete="name"
        />
      </div>

      <div>
        <label className={CLASE_LABEL}>Correo electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          placeholder="tucorreo@ejemplo.com"
          className={`${CLASE_INPUT} mt-1.5`}
          autoComplete="email"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CampoPassword
          label="Contraseña"
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          autoComplete="new-password"
        />
        <CampoPassword
          label="Confirmar contraseña"
          value={confirmarPassword}
          onChange={(evento) => setConfirmarPassword(evento.target.value)}
          autoComplete="new-password"
        />
      </div>

      <AlertaError mensaje={error} />

      <button
        type="submit"
        disabled={cargando}
        className={CLASE_BOTON_PRINCIPAL}
      >
        {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  )
}

const TABS = [
  { id: 'login', etiqueta: 'Iniciar sesión' },
  { id: 'registro', etiqueta: 'Crear cuenta' },
]

/**
 * Pantalla de autenticación: fondo neutro, tarjeta blanca con borde sutil
 * y selector por pestañas entre "Iniciar sesión" y "Crear cuenta".
 * Reemplaza a LoginScreen.jsx.
 *
 * App.jsx la muestra en solitario mientras no haya sesión activa; en
 * cuanto loginUsuario()/registrarUsuario() resuelven, observarEstadoAuth()
 * dispara el cambio de pantalla solo, sin redirección manual aquí.
 */
export function AuthPage() {
  const [tab, setTab] = useState('login')

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Isotipo + nombre de marca */}
        <div className="text-center mb-8">
          <IsotipoBodegaTech className="w-11 h-11 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">BodegaTech</h1>
          <p className="text-sm text-slate-500 mt-1">
            Punto de venta, inventario y fiados para tu bodega
          </p>
        </div>

        {/* Tarjeta */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-md shadow-slate-900/5 p-6 sm:p-8">
          {/* Pestañas con subrayado */}
          <div role="tablist" className="grid grid-cols-2 border-b border-slate-200 mb-6">
            {TABS.map(({ id, etiqueta }) => {
              const activa = tab === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={activa}
                  aria-controls={`panel-${id}`}
                  onClick={() => setTab(id)}
                  className={`-mb-px pb-3 text-sm font-medium border-b-2 transition-colors duration-150
                              focus-visible:outline-none focus-visible:text-slate-900 ${
                    activa
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {etiqueta}
                </button>
              )
            })}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'login' ? <FormularioLogin /> : <FormularioRegistro />}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Gestiona tu bodega desde cualquier dispositivo.
        </p>
      </div>
    </div>
  )
}

export default AuthPage