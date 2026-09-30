import { createContext } from 'react'

/**
 * Contexto del módulo de suscripción. El valor lo entrega
 * `SuscripcionProvider` y se consume con `useSuscripcion()`.
 */
export const SuscripcionContext = createContext(null)