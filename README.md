# 🏪 BodegaTech POS

**BodegaTech** es un Sistema de Punto de Venta (POS) moderno, bajo el modelo SaaS, diseñado para digitalizar y profesionalizar la gestión de bodegas independientes y minimarkets. Construido con una arquitectura *Offline-First* y un catálogo de productos colaborativo (Crowdsourcing).

## 🚀 Características Principales

### 🛒 Módulo de Ventas (Punto de Venta)
- **Escaneo Ultrarrápido:** Soporte nativo para lectores de códigos de barras físicos y escaneo por cámara móvil. Captura automática de eventos para ingresos en ráfaga.
- **Venta a Granel:** Soporte para venta fraccionada (peso/litros) o monto exacto, calculando el precio y descontando el stock automáticamente.
- **Múltiples Métodos de Pago:** Transacciones atómicas soportando Efectivo, Yape, Plin y Fiado.
- **Protección de Navegación:** Manejo avanzado del `History API` para evitar que cierres accidentales de modales borren el carrito de compras en curso.

### 📦 Inventario Inteligente (Red Colaborativa)
- **Catálogo Global (Crowdsourcing):** Si una bodega registra un producto nuevo en la nube, el resto de la red lo autocompleta al escanearlo, reduciendo el *Data Entry*.
- **Cascada de Búsqueda (0ms a Nube):** El motor busca primero en la base de datos local (Dexie.js), luego en el catálogo maestro, nube colaborativa (Firestore) y finalmente en una API externa (OpenFoodFacts).
- **Alertas de Reposición:** Panel inteligente de stock bajo con exportación directa a tabla imprimible/PDF para pedidos a proveedores.

### 👥 Módulo de Fiados (Fidelización y Créditos)
- **Gestión de Deudas:** Asignación de deuda y descuento de inventario en una sola transacción atómica (`writeBatch`).
- **Recordatorios por WhatsApp:** Generación de enlaces dinámicos para enviar estados de cuenta directamente al WhatsApp del cliente con el nombre de la bodega.

### 🔐 Arquitectura y Seguridad
- **Multi-Tenant:** Aislamiento estricto de datos por `bodegaId`. Es matemáticamente imposible acceder a inventarios o clientes de otras cuentas.
- **Offline-First:** Persistencia local instantánea con IndexedDB y sincronización en segundo plano con Firebase cuando hay conexión.

---

## 🛠️ Stack Tecnológico

- **Frontend:** React.js (Vite)
- **Estilos:** Tailwind CSS (Diseño SaaS premium, íconos SVG vectoriales)
- **Base de Datos Local:** Dexie.js (IndexedDB)
- **Base de Datos Nube / BaaS:** Firebase (Auth, Firestore)
- **Lectura QR/Barras:** html5-qrcode
