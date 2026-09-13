import { useEffect } from 'react'
import { sincronizarDatosLocales } from '../services/syncService'

/**
 * Escucha la conectividad del navegador. Al detectar que vuelve
 * la conexión a internet, dispara la sincronización de forma
 * automática y silenciosa (sin bloquear ni notificar a la UI).
 *
 * Uso: llamar useSyncOffline() una sola vez, típicamente en App.jsx.
 */
export function useSyncOffline() {
  useEffect(() => {
    function manejarReconexion() {
      sincronizarDatosLocales().catch((error) => {
        console.warn('[sync] Error durante la sincronización automática:', error)
      })
    }

    window.addEventListener('online', manejarReconexion)

    // Si la app se abre ya con internet, intenta sincronizar pendientes al iniciar
    if (navigator.onLine) {
      manejarReconexion()
    }

    return () => {
      window.removeEventListener('online', manejarReconexion)
    }
  }, [])
}

export default useSyncOffline