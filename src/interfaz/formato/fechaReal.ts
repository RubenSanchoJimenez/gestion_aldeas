import { NOMBRES_MES } from '../../dominio/calendario/formatoFecha'
import type { Instante } from '../../dominio/modelo/comunes'

/** «8 de septiembre de 2026»: el día del Instante en la hora de la tablet (D-093). */
export function fechaReal(instante: Instante): string {
  const f = new Date(instante)
  return `${f.getDate()} de ${NOMBRES_MES[f.getMonth()]} de ${f.getFullYear()}`
}

/** fechaReal, o «Nunca» si no hay (D-093). */
export function fechaRealONunca(instante: Instante | undefined): string {
  return instante === undefined ? 'Nunca' : fechaReal(instante)
}
