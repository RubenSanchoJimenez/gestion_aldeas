import { aBase } from '../../dominio/dinero/importe'
import type { Equivalencias, Moneda } from '../../dominio/dinero/monedas'

export interface ValorImporte {
  cantidad: string
  moneda: Moneda
}

export type LecturaImporte = { tipo: 'vacio' } | { tipo: 'valido'; base: number } | { tipo: 'invalido'; error: string }

/** Lo tecleado en un campo de importe, ya en hierro (admite coma o punto y «,6»). */
export function leerImporte(v: ValorImporte, eq: Equivalencias): LecturaImporte {
  if (v.cantidad.trim() === '') {
    return { tipo: 'vacio' }
  }
  try {
    return { tipo: 'valido', base: aBase(v.cantidad, v.moneda, eq) }
  } catch {
    return { tipo: 'invalido', error: 'La cantidad tecleada no es válida' }
  }
}
