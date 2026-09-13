import { db } from './dexie'

/**
 * Inyecta datos de prueba locales SOLO si las tablas
 * relevantes están vacías. Seguro de llamar en cada arranque
 * de la app (no duplica datos).
 */
export async function seedDatabase() {
  const [totalProductos, totalClientes, totalVentas] = await Promise.all([
    db.products.count(),
    db.customers.count(),
    db.sales.count(),
  ])

  const hoy = new Date().toISOString()

  // --- Productos ---
  if (totalProductos === 0) {
    await db.products.bulkAdd([
      {
        id: 'prod-001',
        codigoBarras: '7750243004018',
        nombre: 'Leche Gloria 400g',
        categoria: 'Lácteos',
        precioVenta: 4.00,
        stock: 24,
        synced: false,
      },
      {
        id: 'prod-002',
        codigoBarras: '7751271011012',
        nombre: 'Aceite Primor 1L',
        categoria: 'Abarrotes',
        precioVenta: 9.50,
        stock: 12,
        synced: false,
      },
      {
        id: 'prod-003',
        codigoBarras: '7751150300201',
        nombre: 'Galletas Soda Field',
        categoria: 'Snacks',
        precioVenta: 2.50,
        stock: 40,
        synced: false,
      },
    ])
  }

  // --- Cliente fiado ---
  let clienteId = 'cust-001'
  if (totalClientes === 0) {
    await db.customers.add({
      id: clienteId,
      nombre: 'Juan Pérez',
      telefono: '987654321',
      deudaTotal: 45.00,
      synced: false,
    })
  } else {
    const clienteExistente = await db.customers.toArray()
    clienteId = clienteExistente[0]?.id ?? clienteId
  }

  // --- Ventas de prueba ---
  if (totalVentas === 0) {
    await db.sales.bulkAdd([
      {
        id: 'sale-001',
        fecha: hoy,
        total: 70.00,
        tipoPago: 'efectivo',
        clienteId: null,
        synced: false,
      },
      {
        id: 'sale-002',
        fecha: hoy,
        total: 50.00,
        tipoPago: 'fiado',
        clienteId,
        synced: false,
      },
    ])
  }

  console.log('[seed] Base de datos local verificada/poblada correctamente.')
}

export default seedDatabase