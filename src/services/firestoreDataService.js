import { doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { dbCloud } from './firebase'

/**
 * Modelo "Cloud Directo": toda escritura de la app (ventas, abonos,
 * productos, inventario) va DIRECTO a Firestore desde aquí, sin pasar
 * antes por Dexie ni marcar nada como `synced: false`. Dexie sigue
 * existiendo únicamente como caché de lectura ultrarrápida, alimentado
 * en tiempo real por los listeners `onSnapshot` de syncService.js.
 *
 * Consecuencia directa: la app necesita internet para guardar. Cada
 * función de acá puede rechazar (sin conexión, permisos, etc.); los
 * componentes que las llaman deben mostrarle ese error al bodeguero en
 * vez de guardar "en cola" para más tarde.
 */

export function crearProductoEnNube(producto) {
  return setDoc(doc(dbCloud, 'products', producto.id), producto)
}

export function actualizarProductoEnNube(id, cambios) {
  return updateDoc(doc(dbCloud, 'products', id), cambios)
}

export function crearClienteEnNube(cliente) {
  return setDoc(doc(dbCloud, 'customers', cliente.id), cliente)
}

/**
 * Actualiza datos personales de un cliente (nombre, teléfono, etc.) directo
 * en Firestore. NO se usa para tocar `deudaTotal`: esa cifra solo cambia a
 * través de `registrarVentaEnNube` / `registrarAbonoEnNube`, que la
 * escriben junto con su movimiento correspondiente en la misma transacción
 * atómica. Mezclar ambos caminos podría desincronizar la deuda del cliente
 * de su historial de movimientos.
 */
export function actualizarClienteEnNube(id, cambios) {
  return updateDoc(doc(dbCloud, 'customers', id), cambios)
}

/**
 * Registra una venta completa como UNA sola escritura atómica en
 * Firestore (`writeBatch`): la venta, el descuento de stock de cada
 * producto vendido y, si es al fiado, el movimiento de cargo y el
 * incremento de la deuda del cliente. O se aplica todo, o no se aplica
 * nada (por ejemplo, si se corta la conexión a mitad de camino) — así
 * nunca queda una venta registrada sin su descuento de stock, o viceversa.
 *
 * @param {object} params
 * @param {object} params.venta - documento completo a crear en `sales`
 * @param {{ productId: string, nuevoStock: number }[]} params.itemsStock
 * @param {object|null} params.movimientoFiado - documento a crear en `movements`, o null si no es fiado
 * @param {{ id: string, deudaTotal: number }|null} params.clienteActualizado
 */
export async function registrarVentaEnNube({
  venta,
  itemsStock,
  movimientoFiado,
  clienteActualizado,
}) {
  const batch = writeBatch(dbCloud)

  batch.set(doc(dbCloud, 'sales', venta.id), venta)

  for (const { productId, nuevoStock } of itemsStock) {
    batch.update(doc(dbCloud, 'products', productId), { stock: nuevoStock })
  }

  if (movimientoFiado) {
    batch.set(doc(dbCloud, 'movements', movimientoFiado.id), movimientoFiado)
  }

  if (clienteActualizado) {
    batch.update(doc(dbCloud, 'customers', clienteActualizado.id), {
      deudaTotal: clienteActualizado.deudaTotal,
    })
  }

  await batch.commit()
}

/**
 * Registra un abono (pago parcial de un fiado): crea el movimiento de
 * tipo 'abono' y descuenta la deuda del cliente, en una sola escritura
 * atómica.
 *
 * @param {object} params
 * @param {object} params.movimiento - documento completo a crear en `movements`
 * @param {string} params.clienteId
 * @param {number} params.nuevaDeuda
 */
export async function registrarAbonoEnNube({ movimiento, clienteId, nuevaDeuda }) {
  const batch = writeBatch(dbCloud)
  batch.set(doc(dbCloud, 'movements', movimiento.id), movimiento)
  batch.update(doc(dbCloud, 'customers', clienteId), { deudaTotal: nuevaDeuda })
  await batch.commit()
}

export default {
  crearProductoEnNube,
  actualizarProductoEnNube,
  crearClienteEnNube,
  actualizarClienteEnNube,
  registrarVentaEnNube,
  registrarAbonoEnNube,
}