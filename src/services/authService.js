import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import firebaseApp from './firebase'

/**
 * Instancia de Firebase Auth, basada en la misma app inicializada
 * en firebase.js (comparte configuración con Firestore).
 */
export const auth = getAuth(firebaseApp)

/**
 * Inicia sesión con correo y contraseña.
 * Lanza el error de Firebase si las credenciales son inválidas,
 * para que la pantalla de login lo capture y muestre un mensaje.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function iniciarSesion(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

/**
 * Cierra la sesión activa del usuario actual.
 */
export async function cerrarSesion() {
  return signOut(auth)
}

/**
 * Se suscribe a los cambios de estado de autenticación
 * (usuario que inicia sesión, cierra sesión, o token que expira).
 *
 * @param {(usuario: import('firebase/auth').User | null) => void} callback
 * @returns {() => void} Función para cancelar la suscripción
 */
export function observarEstadoAuth(callback) {
  return onAuthStateChanged(auth, callback)
}

export default auth