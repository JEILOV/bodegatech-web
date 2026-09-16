import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

/**
 * La siembra inicial (seedDatabase) ya NO se dispara aquí.
 *
 * Antes se llamaba en el arranque de la app, sin depender de sesión ni de
 * la nube. Eso funcionaba mientras cada dispositivo vivía aislado, pero
 * ahora que Firestore es la fuente de la verdad (ver App.jsx), sembrar
 * demasiado pronto es peligroso: un dispositivo nuevo de una cuenta que
 * YA tiene datos reales en la nube podía insertar datos de demo
 * (cliente/ventas de prueba, catálogo con stock en 0) que luego se subían
 * y pisaban el estado real compartido entre dispositivos.
 *
 * Ahora la decisión de sembrar vive en App.jsx: solo ocurre después de
 * autenticarse y de intentar traer todo de Firestore, y solo si las
 * tablas siguen genuinamente vacías (cuenta nueva de verdad).
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)