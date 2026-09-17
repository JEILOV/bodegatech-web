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