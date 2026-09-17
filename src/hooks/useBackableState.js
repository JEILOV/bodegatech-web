import { useEffect, useRef } from 'react'

/**
 * Sincroniza un estado local "abierto/cerrado" (una pantalla, un modal,
 * un panel, etc.) con el historial de navegación del navegador, para que
 * el botón/gesto "Atrás" nativo del celular cierre esa capa en vez de
 * salir de la app o refrescar la página.
 *
 * Cómo funciona (arquitectura 100% online, sin router):
 * - Cuando `isOpen` pasa de `false` a `true`, se hace
 *   `window.history.pushState(...)`: esto agrega UNA entrada al
 *   historial del navegador, representando esa capa.
 * - Si el usuario cierra la capa desde la UI (ej. botón "X" o "Volver"),
 *   `isOpen` pasa a `false` y el hook consume esa entrada llamando a
 *   `window.history.back()`, para no dejar entradas "fantasma" que
 *   descalibren el conteo de Atrás.
 * - Si el usuario presiona el botón/gesto "Atrás" del celular, el
 *   navegador dispara `popstate` (SIN recargar ni salir del sitio). El
 *   hook detecta que la entrada que se acaba de "gastar" era la suya y
 *   llama a `onClose()` para que React cierre esa misma capa —sin volver
 *   a tocar el historial, porque el navegador ya lo hizo.
 *
 * Se puede usar tanto para pantallas completas (Ventas, Inventario,
 * Fiados, Cierre de Caja) como para modales dentro de esas pantallas
 * (Detalle de Venta, Detalle de Cliente, Nuevo Producto, etc.). Al ser
 * apilable, si hay una pantalla Y un modal abiertos, cada uno tiene su
 * propia entrada de historial: el primer "Atrás" cierra el modal, el
 * segundo regresa a Home.
 *
 * @param {boolean} isOpen - si la capa (pantalla/modal) está abierta.
 * @param {() => void} onClose - función que cierra la capa (setState a
 *   su valor "cerrado"). Se invoca SOLO cuando el cierre viene del botón
 *   Atrás del navegador/celular; los cierres manuales desde la UI ya los
 *   maneja quien llama al hook con su propio onClick.
 */
export function useBackableState(isOpen, onClose) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // true mientras la entrada "en la punta" del historial del navegador
  // sea la que empujamos nosotros para esta capa.
  const entradaPropiaRef = useRef(false)

  useEffect(() => {
    if (isOpen && !entradaPropiaRef.current) {
      // Se abrió la capa desde la UI: dejamos "marcado" el historial.
      window.history.pushState({ appLayer: true }, '')
      entradaPropiaRef.current = true
      return
    }

    if (!isOpen && entradaPropiaRef.current) {
      // Se cerró desde la UI (no desde Atrás): consumimos la entrada
      // para que el historial quede sincronizado con el estado real.
      entradaPropiaRef.current = false
      window.history.back()
    }
  }, [isOpen])

  // Si el componente se desmonta mientras la capa seguía "abierta" en el
  // historial (ej. la pantalla padre navega a otro lado sin pasar por
  // onClose), igual liberamos esa entrada para no descalibrar el conteo
  // de "Atrás" de capas futuras.
  useEffect(() => {
    return () => {
      if (entradaPropiaRef.current) {
        entradaPropiaRef.current = false
        window.history.back()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function manejarPopState() {
      // Solo reaccionamos si la entrada que el navegador acaba de
      // "gastar" con Atrás era la nuestra. Si no, no es nuestro turno.
      if (!entradaPropiaRef.current) return
      entradaPropiaRef.current = false
      onCloseRef.current?.()
    }

    window.addEventListener('popstate', manejarPopState)
    return () => window.removeEventListener('popstate', manejarPopState)
  }, [])
}