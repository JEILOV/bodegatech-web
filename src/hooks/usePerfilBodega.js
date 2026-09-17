import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { dbCloud } from '../services/firebase'

/**
 * Se suscribe en tiempo real al documento `users/{uid}` (creado en
 * `authService.registrarUsuario()`), que guarda `nombreBodega` y
 * `nombreAdministrador`.
 *
 * Devuelve:
 * - `undefined` mientras no ha llegado el primer snapshot (evita
 *   mostrar un nombre por defecto que luego "salta" al real).
 * - `null` si el documento no existe (cuentas creadas antes de este
 *   perfil, o algún caso borde).
 * - El objeto del documento si existe.
 *
 * Se reinicia a `undefined` cada vez que cambia el `uid` (incluido
 * pasar a `null`), para que al cambiar de cuenta el header nunca
 * llegue a mostrar, ni por un instante, el nombre de la bodega anterior.
 *
 * @param {string | null | undefined} uid
 */
export function usePerfilBodega(uid) {
  const [perfil, setPerfil] = useState(undefined)

  useEffect(() => {
    setPerfil(undefined)

    if (!uid) {
      setPerfil(null)
      return
    }

    const cancelar = onSnapshot(
      doc(dbCloud, 'users', uid),
      (snapshot) => setPerfil(snapshot.exists() ? snapshot.data() : null),
      (error) => {
        console.error('[usePerfilBodega] No se pudo leer el perfil de la bodega:', error)
        setPerfil(null)
      }
    )

    return cancelar
  }, [uid])

  return perfil
}

export default usePerfilBodega