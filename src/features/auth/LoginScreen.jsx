import { useState } from 'react'
import { iniciarSesion } from '../../services/authService'

const MENSAJES_ERROR_FIREBASE = {
  'auth/invalid-email': 'El correo ingresado no es válido.',
  'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
  'auth/user-not-found': 'No existe una cuenta con este correo.',
  'auth/wrong-password': 'La contraseña es incorrecta.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos fallidos. Espera unos minutos.',
}

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState('')
  const [ingresando, setIngresando] = useState(false)

  async function manejarSubmit(evento) {
    evento.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña.')
      return
    }

    setIngresando(true)
    try {
      await iniciarSesion(email.trim(), password)
      // No hace falta redirigir manualmente:
      // App.jsx reacciona al cambio de estado vía observarEstadoAuth
    } catch (err) {
      const mensaje = MENSAJES_ERROR_FIREBASE[err.code] || 'Ocurrió un error al iniciar sesión.'
      setError(mensaje)
    } finally {
      setIngresando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-md mx-auto">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-dark-text">BodegaTech</h1>
          <p className="text-sm text-dark-text-muted">Inicia sesión para gestionar tu bodega</p>
        </div>

        <form onSubmit={manejarSubmit} className="card space-y-4">
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

          <div>
            <label className="text-xs font-medium text-dark-text-muted">Contraseña</label>
            <div className="relative mt-1">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                placeholder="••••••••"
                className="input-field pr-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((actual) => !actual)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-text-muted text-sm"
              >
                {mostrarPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button type="submit" disabled={ingresando} className="btn-primary w-full">
            {ingresando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginScreen