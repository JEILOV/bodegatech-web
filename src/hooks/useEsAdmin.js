import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { dbCloud } from '../services/firebase'

/**
 * Indica si la cuenta autenticada es administradora, consultando UNA vez
 * su documento `admins/{uid}` (las reglas solo dejan leer el propio).
 *
 * Devuelve `undefined` mientras consulta, y luego `true` / `false`. Sin
 * conexión (o si la consulta falla) devuelve `false`: ante la duda no se
 * muestra el panel. Esto solo decide qué ve la persona; quien realmente
 * protege los datos son las reglas de Firestore (`esAdmin()`).
 *
 * @param {string | null | undefined} uid
 * @returns {boolean | undefined}
 */
export function useEsAdmin(uid) {
  const [esAdmin, setEsAdmin] = useState(undefined)

  useEffect(() => {
    if (!uid) return undefined

    let cancelado = false
    getDoc(doc(dbCloud, 'admins', uid))
      .then((snapshot) => {
        if (!cancelado) setEsAdmin(snapshot.exists())
      })
      .catch((error) => {
        console.warn('[useEsAdmin] No se pudo verificar si la cuenta es administradora:', error)
        if (!cancelado) setEsAdmin(false)
      })

    return () => {
      cancelado = true
    }
  }, [uid])

  return esAdmin
}

export default useEsAdmin