import { useEffect, useRef } from 'react'

/**
 * Sincroniza un estado local "abierto/cerrado" (pantalla, modal, panel...)
 * con el historial del navegador, para que el botón/gesto "Atrás" del
 * celular cierre esa capa en vez de salir de la app.
 *
 * ── Qué se corrigió ────────────────────────────────────────────────────
 * Antes, cada instancia del hook escuchaba `popstate` por su cuenta. Al
 * cerrar un modal desde la UI (botón "X", elegir una opción...) el hook
 * llamaba a `history.back()`, el navegador disparaba `popstate` y TODAS
 * las instancias lo interpretaban como "el usuario presionó Atrás": la de
 * App.jsx mandaba a Home y desmontaba la pantalla actual.
 *
 * Ahora hay UN solo listener global de `popstate` y una PILA de capas
 * abiertas:
 *
 * - Cierre desde la UI (isOpen pasa a false o el componente se desmonta):
 *   se saca la capa de la pila, se consume su entrada del historial con
 *   `history.back()` y el `popstate` resultante se marca como
 *   "programático" y se IGNORA. Nadie recibe onClose, así que App.jsx no
 *   se entera y el usuario se queda en la pantalla actual.
 *
 * - Botón "Atrás" real: llega un `popstate` no marcado; se cierra
 *   ÚNICAMENTE la capa de arriba de la pila (el modal si hay uno abierto;
 *   si no, la pantalla). Antes, con pantalla + modal abiertos, un solo
 *   Atrás cerraba ambos.
 *
 * Los retrocesos programáticos que ocurren en el mismo ciclo (por ejemplo
 * al desmontar una pantalla con un modal abierto) se agrupan en un solo
 * `history.go(-n)`, que dispara un único `popstate`.
 *
 * @param {boolean} isOpen - si la capa está abierta.
 * @param {() => void} onClose - cierra la capa (setState a "cerrado").
 *   Se invoca SOLO cuando el cierre viene del botón Atrás del sistema; los
 *   cierres desde la UI los maneja quien llama con su propio onClick.
 */

// ── Estado global compartido por todas las instancias del hook ──────────
const pilaDeCapas = []
let popstatesAIgnorar = 0
let retrocesosPendientes = 0
let retrocesoProgramado = false
let temporizadorSeguridad = null

function limpiarBanderaIgnorar() {
  popstatesAIgnorar = 0
  clearTimeout(temporizadorSeguridad)
  temporizadorSeguridad = null
}

/**
 * Consume `n` entradas del historial sin que el resto de la app lo note.
 * Agrupa varias llamadas del mismo ciclo en un único history.go(-n).
 */
function retrocederSilenciosamente() {
  retrocesosPendientes += 1
  if (retrocesoProgramado) return
  retrocesoProgramado = true

  queueMicrotask(() => {
    retrocesoProgramado = false
    const cantidad = retrocesosPendientes
    retrocesosPendientes = 0
    if (cantidad === 0) return

    popstatesAIgnorar += 1
    // Seguro anti-bloqueo: si por algún motivo el navegador no emite el
    // popstate esperado, no dejamos la bandera "pegada" y así no se
    // traga un Atrás real del usuario.
    clearTimeout(temporizadorSeguridad)
    temporizadorSeguridad = setTimeout(limpiarBanderaIgnorar, 1000)

    window.history.go(-cantidad)
  })
}

function manejarPopState() {
  // Fue un retroceso provocado por nosotros (cierre desde la UI): se
  // ignora por completo, sin cerrar ninguna capa ni propagar nada.
  if (popstatesAIgnorar > 0) {
    popstatesAIgnorar -= 1
    if (popstatesAIgnorar === 0) limpiarBanderaIgnorar()
    return
  }

  // Atrás real del usuario: cierra solo la capa más reciente.
  const capa = pilaDeCapas.pop()
  capa?.cerrar()
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', manejarPopState)
}

export function useBackableState(isOpen, onClose) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return undefined

    const capa = { cerrar: () => onCloseRef.current?.() }
    pilaDeCapas.push(capa)
    window.history.pushState({ appLayer: true }, '')

    // Se ejecuta cuando isOpen vuelve a false o el componente se desmonta.
    return () => {
      const indice = pilaDeCapas.indexOf(capa)
      // Si ya no está en la pila, la cerró el botón Atrás real y el
      // navegador ya consumió su entrada: no hay nada más que hacer.
      if (indice === -1) return

      // Cierre desde la UI: la sacamos de la pila y consumimos su entrada
      // del historial sin que el popstate llegue a otras capas.
      pilaDeCapas.splice(indice, 1)
      retrocederSilenciosamente()
    }
  }, [isOpen])
}