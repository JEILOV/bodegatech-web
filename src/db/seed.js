import { db } from './dexie'
import { MASTER_PRODUCTS } from './masterCatalog'

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

  // --- Productos: se precarga el Catálogo Maestro completo ---
  // Stock inicial en 0 porque el bodeguero aún no ha contado su inventario real;
  // el precio queda editable, precioSugerido solo es una referencia de partida.
  if (totalProductos === 0) {
    await db.products.bulkAdd(
      MASTER_PRODUCTS.map((producto, indice) => ({
        id: `prod-catalogo-${indice + 1}`,
        codigoBarras: producto.codigoBarras,
        nombre: producto.nombre,
        categoria: producto.categoria,
        precioVenta: producto.precioSugerido,
        stock: 0,
        synced: false,
      }))
    )
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