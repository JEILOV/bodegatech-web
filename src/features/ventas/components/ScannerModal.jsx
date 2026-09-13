import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const SCANNER_ELEMENT_ID = 'bodegatech-scanner-region'

/**
 * Reproduce un "bip" corto usando Web Audio API,
 * sin necesidad de cargar ningún archivo de audio externo.
 */
function reproducirBip() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const contexto = new AudioContextClass()
    const oscilador = contexto.createOscillator()
    const ganancia = contexto.createGain()

    oscilador.type = 'square'
    oscilador.frequency.value = 1046.5 // Nota C6, sonido de "bip" de caja registradora
    ganancia.gain.value = 0.15

    oscilador.connect(ganancia)
    ganancia.connect(contexto.destination)

    oscilador.start()
    oscilador.stop(contexto.currentTime + 0.12)

    oscilador.onended = () => contexto.close()
  } catch (error) {
    console.warn('No se pudo reproducir el sonido de escaneo:', error)
  }
}

export function ScannerModal({ onCodigoEscaneado, onCerrar }) {
  const escanerRef = useRef(null)
  const escaneandoRef = useRef(false)

  useEffect(() => {
    const escaner = new Html5Qrcode(SCANNER_ELEMENT_ID)
    escanerRef.current = escaner

    escaner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (codigoDecodificado) => {
          // Evita disparos múltiples del mismo frame mientras se procesa
          if (escaneandoRef.current) return
          escaneandoRef.current = true

          reproducirBip()
          onCodigoEscaneado(codigoDecodificado)
        },
        () => {
          // Se ignoran errores de "no se detectó código en este frame"
        }
      )
      .catch((error) => {
        console.error('No se pudo iniciar la cámara:', error)
      })

    return () => {
      if (escanerRef.current) {
        escanerRef.current
          .stop()
          .then(() => escanerRef.current.clear())
          .catch(() => {})
      }
    }
  }, [onCodigoEscaneado])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <h3 className="font-bold text-dark-text">Escanear producto</h3>
          <button
            onClick={onCerrar}
            className="text-dark-text-muted text-xl font-bold px-2"
          >
            ✕
          </button>
        </div>

        <div id={SCANNER_ELEMENT_ID} className="w-full aspect-square bg-black" />

        <p className="text-center text-xs text-dark-text-muted p-3">
          Apunta la cámara al código de barras del producto
        </p>
      </div>
    </div>
  )
}

export default ScannerModal