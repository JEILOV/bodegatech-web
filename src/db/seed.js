import { doc, writeBatch } from 'firebase/firestore'
import { db } from './dexie'
import { dbCloud } from '../services/firebase'
import { auth } from '../services/authService'
import { MASTER_PRODUCTS } from './masterCatalog'

/**
 * Siembra datos de demo SOLO si, tras la primera descarga de Firestore,
 * las tablas relevantes siguen vacías (ver App.jsx). Cloud Directo: esto
 * escribe directo en Firestore con un `writeBatch` (no en Dexie); el
 * listener de syncService.js se encarga de reflejarlo en el caché local
 * al instante, igual que cualquier otra escritura de la app.
 *
 * MULTI-TENANT: cada documento sembrado lleva `bodegaId` (uid de la
 * cuenta recién creada), y sus IDs se prefijan con ese mismo uid. Antes,
 * los IDs eran fijos ("prod-catalogo-1", "cust-001", "sale-001"...), lo
 * que significaba que la SEGUNDA bodega que se registrara reescribiría
 * los documentos de la PRIMERA (mismo ID = mismo documento en
 * Firestore), robándole silenciosamente su catálogo de demo. Con el uid
 * como prefijo, cada bodega siembra en documentos que solo ella puede
 * llegar a tener.
 */
export async function seedDatabase() {
  const bodegaId = auth.currentUser?.uid
  if (!bodegaId) {
    throw new Error('[seed] No hay sesión activa: no se puede sembrar sin bodegaId.')
  }

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
      const id = `prod-catalogo-${bodegaId}-${indice + 1}`
      batch.set(doc(dbCloud, 'products', id), {
        id,
        bodegaId,
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
  let clienteId = `cust-${bodegaId}-001`
  if (totalClientes === 0) {
    batch.set(doc(dbCloud, 'customers', clienteId), {
      id: clienteId,
      bodegaId,
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
    batch.set(doc(dbCloud, 'sales', `sale-${bodegaId}-001`), {
      id: `sale-${bodegaId}-001`,
      bodegaId,
      fecha: hoy,
      total: 70.0,
      tipoPago: 'efectivo',
      clienteId: null,
    })
    batch.set(doc(dbCloud, 'sales', `sale-${bodegaId}-002`), {
      id: `sale-${bodegaId}-002`,
      bodegaId,
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