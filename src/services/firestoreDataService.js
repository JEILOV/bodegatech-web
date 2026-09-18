import { doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { dbCloud } from './firebase'
import { auth } from './authService'

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
 *
 * MULTI-TENANT: cada documento que se CREA en `products`, `sales`,
 * `customers` o `movements` lleva el campo `bodegaId` con el uid del
 * usuario autenticado. `firestore.rules` exige que `bodegaId` en el
 * documento coincida con `request.auth.uid` para poder leerlo o
 * escribirlo, así que un documento creado sin este campo (o con el uid
 * de otra bodega) sería rechazado por las reglas antes de llegar a
 * guardarse.
 */

/**
 * Uid de la bodega (cuenta) actualmente autenticada. Lanza un error
 * explícito si se llama sin sesión activa, en vez de dejar que
 * Firestore falle más abajo con un mensaje de permisos genérico y
 * difícil de diagnosticar — esta función nunca debería invocarse antes
 * de iniciar sesión, porque toda la UI que llama a estas funciones vive
 * detrás de AuthPage en App.jsx.
 *
 * @returns {string}
 */
function obtenerBodegaIdActual() {
  const uid = auth.currentUser?.uid
  if (!uid) {
    throw new Error(
      '[firestoreDataService] No hay sesión activa: no se puede escribir en Firestore sin bodegaId.'
    )
  }
  return uid
}

/**
 * Métodos de pago que puede tener una VENTA. Debe coincidir con la lista
 * `tipoPago in [...]` de la regla `match /sales/{saleId}` en
 * firestore.rules: si se agrega uno acá, hay que agregarlo allá también
 * (y viceversa). Validarlo antes de llegar a Firestore convierte un
 * genérico "Missing or insufficient permissions" en un error claro.
 */
const TIPOS_PAGO_VENTA = ['efectivo', 'yape', 'plin', 'fiado']

export function crearProductoEnNube(producto) {
  const bodegaId = obtenerBodegaIdActual()
  return setDoc(doc(dbCloud, 'products', producto.id), { ...producto, bodegaId })
}

export function actualizarProductoEnNube(id, cambios) {
  return updateDoc(doc(dbCloud, 'products', id), cambios)
}

export function crearClienteEnNube(cliente) {
  const bodegaId = obtenerBodegaIdActual()
  return setDoc(doc(dbCloud, 'customers', cliente.id), { ...cliente, bodegaId })
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
 * @param {object} params.venta - documento a crear en `sales`: { id, fecha (ISO string), total,
 *   tipoPago: 'efectivo' | 'yape' | 'plin' | 'fiado', clienteId, items[] }. `bodegaId` lo agrega esta función.
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
  const bodegaId = obtenerBodegaIdActual()

  if (!TIPOS_PAGO_VENTA.includes(venta.tipoPago)) {
    throw new Error(
      `[firestoreDataService] tipoPago inválido: "${venta.tipoPago}". Permitidos: ${TIPOS_PAGO_VENTA.join(', ')}.`
    )
  }

  // Documento final de la venta. `bodegaId` va AL FINAL del spread para
  // que siempre gane el uid de la sesión activa, aunque `venta` traiga
  // otro valor. `clienteId` se normaliza a null cuando no hay cliente
  // (efectivo / yape / plin) para que el campo exista siempre.
  const ventaDoc = {
    ...venta,
    clienteId: venta.clienteId || null,
    bodegaId,
  }

  const batch = writeBatch(dbCloud)

  batch.set(doc(dbCloud, 'sales', venta.id), ventaDoc)

  for (const { productId, nuevoStock } of itemsStock) {
    batch.update(doc(dbCloud, 'products', productId), { stock: nuevoStock })
  }

  if (movimientoFiado) {
    batch.set(doc(dbCloud, 'movements', movimientoFiado.id), { ...movimientoFiado, bodegaId })
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
  const bodegaId = obtenerBodegaIdActual()
  const batch = writeBatch(dbCloud)
  batch.set(doc(dbCloud, 'movements', movimiento.id), { ...movimiento, bodegaId })
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