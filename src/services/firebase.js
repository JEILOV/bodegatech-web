import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const firebaseApp = initializeApp(firebaseConfig)

/**
 * Instancia de Firestore usada para respaldar en la nube
 * los datos que viven localmente en Dexie (IndexedDB).
 *
 * IMPORTANTE (raíz de la desincronización PC/móvil):
 * `getFirestore()` a secas usa un caché EN MEMORIA. Ese caché se pierde
 * por completo en cada `F5`/recarga, así que cada refresh forzaba una
 * ida y vuelta completa a la red antes de que `onSnapshot` entregara su
 * primer valor. En una conexión móvil lenta, eso empujaba a la app hacia
 * el timeout de `TIEMPO_MAXIMO_ESPERA_NUBE_MS` en App.jsx, mostrando la
 * pantalla con datos aún no confirmados.
 *
 * Con `persistentLocalCache` el propio SDK de Firestore guarda su caché
 * en IndexedDB (separado de nuestras tablas de Dexie). Así, al recargar,
 * `onSnapshot` puede resolver su primer evento casi instantáneo desde
 * ese caché local (sin esperar red), y luego se actualiza solo cuando
 * llega la confirmación del servidor. `persistentMultipleTabManager`
 * evita que se rompa si el usuario tiene la PWA abierta en más de una
 * pestaña/instancia a la vez.
 *
 * Si el navegador no soporta IndexedDB persistente (algunos modos
 * privados) caemos de vuelta a `getFirestore()` normal en memoria para
 * no romper la app.
 */
let dbCloud
try {
  dbCloud = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  })
} catch (error) {
  console.warn(
    '[firebase] No se pudo habilitar el caché local persistente de Firestore, usando caché en memoria:',
    error
  )
  dbCloud = getFirestore(firebaseApp)
}

export { dbCloud }
export default firebaseApp