import { doc, writeBatch } from 'firebase/firestore'
import { db } from './dexie'
import { dbCloud } from '../services/firebase'
import { MASTER_PRODUCTS } from './masterCatalog'

/**
 * Siembra datos de demo SOLO si, tras la primera descarga de Firestore,
 * las tablas relevantes siguen vacías (ver App.jsx). Cloud Directo: esto
 * escribe directo en Firestore con un `writeBatch` (no en Dexie); el
 * listener de syncService.js se encarga de reflejarlo en el caché local
 * al instante, igual que cualquier otra escritura de la app.
 */
export async function seedDatabase() {
  const [totalProductos, totalClientes, totalVentas] = await Promise.all([
    db.products.count(),
    db.customers.count(),
    db.sales.count(),
  ])

  const hoy = new Date().toISOString()
  const batch = writeBatch(dbCloud)
  let huboCambios = false

  // --- Productos: se precarga el Catálogo Maestro completo ---
  // Stock inicial en 0 porque el bodeguero aún no ha contado su inventario real;
  // el precio queda editable, precioSugerido solo es una referencia de partida.
  if (totalProductos === 0) {
    MASTER_PRODUCTS.forEach((producto, indice) => {
      const id = `prod-catalogo-${indice + 1}`
      batch.set(doc(dbCloud, 'products', id), {
        id,
        codigoBarras: producto.codigoBarras,
        nombre: producto.nombre,
        categoria: producto.categoria,
        precioVenta: producto.precioSugerido,
        stock: 0,
      })
    })
    huboCambios = true
  }

  // --- Cliente fiado ---
  let clienteId = 'cust-001'
  if (totalClientes === 0) {
    batch.set(doc(dbCloud, 'customers', clienteId), {
      id: clienteId,
      nombre: 'Juan Pérez',
      telefono: '987654321',
      deudaTotal: 45.0,
    })
    huboCambios = true
  } else {
    const clienteExistente = await db.customers.toArray()
    clienteId = clienteExistente[0]?.id ?? clienteId
  }

  // --- Ventas de prueba ---
  if (totalVentas === 0) {
    batch.set(doc(dbCloud, 'sales', 'sale-001'), {
      id: 'sale-001',
      fecha: hoy,
      total: 70.0,
      tipoPago: 'efectivo',
      clienteId: null,
    })
    batch.set(doc(dbCloud, 'sales', 'sale-002'), {
      id: 'sale-002',
      fecha: hoy,
      total: 50.0,
      tipoPago: 'fiado',
      clienteId,
    })
    huboCambios = true
  }

  if (huboCambios) {
    await batch.commit()
    console.log('[seed] Datos de demo sembrados en Firestore (se reflejan en Dexie vía onSnapshot).')
  } else {
    console.log('[seed] Nada que sembrar: ya hay datos.')
  }
}

export default seedDatabase