import { createContext, useContext } from 'react'

/** Como mucho hay dos diálogos visibles a la vez (espec. L219, §5). */
export const MAXIMO_DIALOGOS = 2

/** Nivel del diálogo que envuelve al componente actual: 0 fuera de todo diálogo (§6.8). */
export const ContextoNivelDialogo = createContext(0)

/** El nivel del Dialogo más cercano, o 0 si no hay ninguno alrededor. */
export function useNivelDialogo(): number {
  return useContext(ContextoNivelDialogo)
}
