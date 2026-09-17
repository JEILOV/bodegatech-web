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
      <label className="text-xs font-medium text-dark-text-muted">{label}</label>
      <div className="relative mt-1">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="input-field pr-12"
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
    <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-3 py-2.5">
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
        <label className="text-xs font-medium text-dark-text-muted">Correo electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          placeholder="tucorreo@ejemplo.com"
          className="input-field mt-1"
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
        className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white
                   font-semibold py-3.5 shadow-lg shadow-primary-600/25 active:scale-[0.98]
                   transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none"
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
        <label className="text-xs font-medium text-dark-text-muted">Nombre de la bodega</label>
        <input
          type="text"
          value={nombreBodega}
          onChange={(evento) => setNombreBodega(evento.target.value)}
          placeholder="Bodega Don Pedro"
          className="input-field mt-1"
          autoComplete="organization"
          autoFocus
        />
      </div>

      <div>
        <label className="text-xs font-medium text-dark-text-muted">Nombre del administrador</label>
        <input
          type="text"
          value={nombreAdministrador}
          onChange={(evento) => setNombreAdministrador(evento.target.value)}
          placeholder="Pedro Ramírez"
          className="input-field mt-1"
          autoComplete="name"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-dark-text-muted">Correo electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          placeholder="tucorreo@ejemplo.com"
          className="input-field mt-1"
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
        className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white
                   font-semibold py-3.5 shadow-lg shadow-primary-600/25 active:scale-[0.98]
                   transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none"
      >
        {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  )
}

/**
 * Pantalla de autenticación premium: fondo con gradiente azul/morado,
 * tarjeta flotante centrada y selector por pestañas entre
 * "Iniciar Sesión" y "Crear Cuenta". Reemplaza a LoginScreen.jsx.
 *
 * App.jsx la muestra en solitario mientras no haya sesión activa; en
 * cuanto loginUsuario()/registrarUsuario() resuelven, observarEstadoAuth()
 * dispara el cambio de pantalla solo, sin redirección manual aquí.
 */
export function AuthPage() {
  const [tab, setTab] = useState('login')

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10 relative overflow-hidden bg-slate-950">
      {/* Fondo con gradiente azul/morado + resplandores suaves */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-purple-700" />
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-400/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-primary-300/30 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo + nombre de marca */}
        <div className="text-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl bg-white/95 flex items-center justify-center
                       shadow-xl shadow-black/20 mx-auto mb-4"
          >
            <span className="text-2xl font-extrabold bg-gradient-to-br from-primary-600 to-purple-600
                              bg-clip-text text-transparent">
              B
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">BodegaTech</h1>
          <p className="text-sm text-white/70 mt-1">Punto de venta, inventario y fiados para tu bodega</p>
        </div>

        {/* Tarjeta flotante */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/30 border border-white/40 p-6 sm:p-8">
          {/* Selector por pestañas */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                tab === 'login'
                  ? 'bg-white text-dark-text shadow-sm'
                  : 'text-dark-text-muted hover:text-dark-text'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setTab('registro')}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                tab === 'registro'
                  ? 'bg-white text-dark-text shadow-sm'
                  : 'text-dark-text-muted hover:text-dark-text'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {tab === 'login' ? <FormularioLogin /> : <FormularioRegistro />}
        </div>

        <p className="text-center text-xs text-white/60 mt-6">
          BodegaTech POS · Gestiona tu bodega desde cualquier dispositivo
        </p>
      </div>
    </div>
  )
}

export default AuthPage