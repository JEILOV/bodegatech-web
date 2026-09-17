import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import firebaseApp, { dbCloud } from './firebase'
import { limpiarBaseDatosLocal } from '../db/dexie'

/**
 * Instancia de Firebase Auth, basada en la misma app inicializada
 * en firebase.js (comparte configuración con Firestore).
 */
export const auth = getAuth(firebaseApp)

/**
 * Inicia sesión con correo y contraseña.
 * Lanza el error de Firebase si las credenciales son inválidas,
 * para que AuthPage lo capture y muestre un mensaje amigable.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function loginUsuario(email, password) {
  // Se limpia el caché local ANTES de autenticar para que, si la sesión
  // anterior era de otra cuenta, el nuevo usuario nunca llegue a ver (ni
  // por un instante, ni offline) productos/ventas/clientes ajenos
  // mientras espera el primer snapshot de Firestore.
  await limpiarBaseDatosLocal()
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

/**
 * Crea una cuenta nueva (correo + contraseña), guarda el nombre del
 * administrador en el perfil de Firebase Auth (displayName) y persiste
 * el nombre de la bodega en Firestore, en `users/{uid}`.
 *
 * Si la escritura en Firestore fallara (por ejemplo, sin conexión), la
 * cuenta de Auth ya quedó creada igual: no se revierte el alta para no
 * dejar al usuario sin poder reintentar el registro con el mismo correo.
 *
 * @param {{ nombreBodega: string, nombreAdministrador: string, email: string, password: string }} datos
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function registrarUsuario({ nombreBodega, nombreAdministrador, email, password }) {
  // Mismo motivo que en loginUsuario(): garantizar tablas locales vacías
  // antes de que la cuenta nueva empiece a sincronizar desde Firestore.
  await limpiarBaseDatosLocal()

  const credencial = await createUserWithEmailAndPassword(auth, email.trim(), password)

  await updateProfile(credencial.user, { displayName: nombreAdministrador.trim() })

  try {
    await setDoc(doc(dbCloud, 'users', credencial.user.uid), {
      nombreBodega: nombreBodega.trim(),
      nombreAdministrador: nombreAdministrador.trim(),
      email: email.trim(),
      creadoEn: serverTimestamp(),
    })
  } catch (error) {
    console.error('[authService] No se pudo guardar el perfil de la bodega en Firestore:', error)
  }

  return credencial
}

/**
 * Cierra la sesión activa del usuario actual.
 */
export async function cerrarSesion() {
  // Se limpia ANTES de cerrar sesión: en cuanto signOut() resuelve,
  // App.jsx muestra AuthPage, pero si otra pestaña/dispositivo llega a
  // leer Dexie en el medio, no debe encontrar datos de la cuenta que se
  // está cerrando.
  await limpiarBaseDatosLocal()
  return signOut(auth)
}

/**
 * Devuelve el usuario autenticado en este momento (o null), sin
 * suscribirse a cambios futuros. Útil para chequeos puntuales.
 *
 * @returns {import('firebase/auth').User | null}
 */
export function obtenerUsuarioActual() {
  return auth.currentUser
}

/**
 * Se suscribe a los cambios de estado de autenticación
 * (usuario que inicia sesión, cierra sesión, o token que expira).
 * Usado por App.jsx para decidir entre AuthPage y la app normal.
 *
 * @param {(usuario: import('firebase/auth').User | null) => void} callback
 * @returns {() => void} Función para cancelar la suscripción
 */
export function observarEstadoAuth(callback) {
  return onAuthStateChanged(auth, callback)
}

export default auth