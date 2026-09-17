/**
 * SIEMBRA DE DEMO DESACTIVADA A PROPÓSITO.
 *
 * Antes, esta función precargaba cada cuenta NUEVA con:
 *   - todo el Catálogo Maestro como productos en stock 0,
 *   - un cliente fiado de prueba ("Juan Pérez") con S/ 45.00 de deuda,
 *   - dos ventas de prueba (S/ 70.00 + S/ 50.00 = S/ 120.00 del día).
 *
 * Esos eran exactamente los números fantasma que aparecían en
 * MetricsHeader ("Ventas de hoy" S/ 120.00, "Por cobrar" S/ 45.00) y las
 * alertas de "Quedan 0" en HomeScreen, en cuentas donde el bodeguero
 * nunca registró nada. Cada bodega es distinta: no existe un catálogo
 * "universal" válido para todas, así que ya no se siembra nada
 * automáticamente. Una cuenta nueva debe arrancar 100% vacía (0
 * productos, 0 clientes, 0 ventas) y así se queda hasta que el
 * bodeguero registre sus propios datos.
 *
 * Se conserva esta función (como no-op) en vez de borrarla y quitar
 * también su importación/llamada en App.jsx, para que si en el futuro
 * alguien la vuelve a invocar por error (o queda algún import viejo),
 * no se escriba nada en Firestore ni en Dexie.
 */
export async function seedDatabase() {
  console.log('[seed] Siembra automática desactivada: las cuentas nuevas inician vacías.')
}

export default seedDatabase