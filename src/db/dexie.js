import Dexie from 'dexie'

/**
 * Instancia principal de la base de datos local (IndexedDB).
 *
 * Modelo Cloud Directo: Dexie ya NO origina escrituras propias. Es
 * únicamente un caché de lectura ultrarrápida, mantenido al día por los
 * listeners `onSnapshot` de syncService.js. Toda creación/edición real
 * ocurre directo en Firestore (ver firestoreDataService.js).
 */
export const db = new Dexie('BodegaTechDB')

// v1: histórico. Existía un campo `synced` indexado para sostener una
// cola de sincronización diferida (ya retirada). Se conserva esta
// definición para que los dispositivos que ya crearon su IndexedDB en
// v1 puedan migrar a v2 sin perder datos; Dexie hace esa migración solo.
db.version(1).stores({
  products: 'id, &codigoBarras, nombre, categoria, precioVenta, stock, synced',
  sales: 'id, fecha, total, tipoPago, clienteId, synced',
  customers: 'id, nombre, telefono, deudaTotal, synced',
  movements: 'id, customerId, fecha, tipo, monto, synced',
  alerts: 'id, tipo, productId, leido, fechaCreacion',
})

// v2: Cloud Directo. Se quita `synced` de los índices: ya no hace falta
// filtrar por "pendiente de subir" porque nada se guarda local-only.
db.version(2).stores({
  // '&codigoBarras' -> índice único, permite buscar por escaneo al instante
  products: 'id, &codigoBarras, nombre, categoria, precioVenta, stock',

  // 'clienteId' indexado para listar ventas fiadas de un cliente rápido
  sales: 'id, fecha, total, tipoPago, clienteId',

  customers: 'id, nombre, telefono, deudaTotal',

  // 'customerId' indexado para el historial de abonos/cargos por cliente.
  // Esta tabla ya cumple el rol de "payments"/abonos: cada registro con
  // tipo: 'abono' es un pago parcial de un fiado, con `tipoPago`
  // (efectivo | yape | plin) para saber el medio usado en cada abono.
  movements: 'id, customerId, fecha, tipo, monto',

  // 'productId' indexado para saber qué alertas pertenecen a qué producto
  alerts: 'id, tipo, productId, leido, fechaCreacion',
})

export default db

/**
 * Vacía por completo el caché local (Dexie/IndexedDB) de las tablas que
 * `syncService.js` mantiene en espejo desde Firestore, más `alerts`
 * (generadas localmente a partir de `products`).
 *
 * Por qué existe: al cerrar sesión, iniciar sesión con OTRA cuenta o
 * registrar una cuenta nueva, Dexie puede seguir teniendo los productos,
 * ventas, clientes y movimientos del usuario anterior (Dexie es solo un
 * caché de lectura; nunca se limpia solo). Sin este paso, el nuevo
 * usuario vería —aunque sea un instante, u offline indefinidamente—
 * datos que no le pertenecen, antes de que `onSnapshot` alcance a
 * reemplazarlos.
 *
 * Se usa `clear()` por tabla (en paralelo) en vez de `db.delete()`
 * porque `db.delete()` borra y cierra la base completa: cualquier
 * transacción o listener de Dexie que siga abierto en ese instante
 * quedaría apuntando a una conexión inválida. Vaciar cada tabla logra
 * el mismo resultado (cero registros locales) sin ese riesgo, y sin
 * tener que reabrir la conexión a mano.
 *
 * Llamar SIEMPRE antes de establecer la nueva sesión (login/registro) o
 * inmediatamente antes de cerrar la actual (logout), para que nunca
 * quede una ventana en la que la UI pueda leer datos ajenos.
 *
 * @returns {Promise<void>}
 */
export async function limpiarBaseDatosLocal() {
  await Promise.all([
    db.products.clear(),
    db.sales.clear(),
    db.customers.clear(),
    db.movements.clear(),
    db.alerts.clear(),
  ])
}