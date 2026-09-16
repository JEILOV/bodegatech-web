import Dexie from 'dexie'

/**
 * Instancia principal de la base de datos local (IndexedDB).
 * Todas las tablas incluyen el campo `synced` para controlar
 * qué registros ya fueron enviados a Firebase.
 */
export const db = new Dexie('BodegaTechDB')

db.version(1).stores({
  // '&codigoBarras' -> índice único, permite buscar por escaneo al instante
  products: 'id, &codigoBarras, nombre, categoria, precioVenta, stock, synced',

  // 'clienteId' indexado para listar ventas fiadas de un cliente rápido
  sales: 'id, fecha, total, tipoPago, clienteId, synced',

  customers: 'id, nombre, telefono, deudaTotal, synced',

  // 'customerId' indexado para el historial de abonos/cargos por cliente.
  // Esta tabla ya cumple el rol de "payments"/abonos: cada registro con
  // tipo: 'abono' es un pago parcial de un fiado. Se le agrega el campo
  // `tipoPago` (efectivo | yape | plin) para saber el medio usado en cada
  // abono. Al no ser un campo indexado, no requiere una nueva versión del
  // esquema de Dexie: basta con guardarlo en el objeto al hacer `.add()`.
  movements: 'id, customerId, fecha, tipo, monto, synced',

  // 'productId' indexado para saber qué alertas pertenecen a qué producto
  alerts: 'id, tipo, productId, leido, fechaCreacion',
})

export default db