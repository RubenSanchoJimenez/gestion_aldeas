import { useState } from 'react'

/** Qué campos ha tocado ya el jugador (D-094): el error de un campo solo se enseña en los que ya se tocaron. */
export function useTocados<C extends string>(): {
  tocado: (campo: C) => boolean
  tocar: (campo: C) => void
  tocarTodos: (campos: readonly C[]) => void
} {
  const [tocados, establecerTocados] = useState<ReadonlySet<C>>(new Set())

  function tocado(campo: C): boolean {
    return tocados.has(campo)
  }

  function tocar(campo: C): void {
    if (!tocados.has(campo)) {
      establecerTocados(new Set(tocados).add(campo))
    }
  }

  function tocarTodos(campos: readonly C[]): void {
    establecerTocados(new Set([...tocados, ...campos]))
  }

  return { tocado, tocar, tocarTodos }
}
