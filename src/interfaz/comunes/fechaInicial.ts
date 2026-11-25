import { validarFecha, type Fecha } from '../../dominio/calendario/fecha'
import type { Edad } from '../../dominio/calendario/formatoFecha'
import { validarEquivalencias, type Equivalencias } from '../../dominio/dinero/monedas'

export interface ValorFechaInicial {
  dia: string
  mes: number
  anio: string
  edad: Edad
}

const entero = (texto: string): number => (/^\d{1,4}$/.test(texto.trim()) ? Number(texto) : Number.NaN)

/** La fecha escrita en P1 o en «Editar partida», con su error si no existe. */
export function leerFechaInicial(v: ValorFechaInicial): { fecha: Fecha; error: string | null } {
  const fecha = { anio: entero(v.anio), mes: v.mes, dia: entero(v.dia) }
  return { fecha, error: validarFecha(fecha) }
}

export type TextosEquivalencias = Record<keyof Equivalencias, string>

export function textosDe(eq: Equivalencias): TextosEquivalencias {
  return Object.fromEntries(Object.entries(eq).map(([k, v]) => [k, String(v)])) as TextosEquivalencias
}

export function leerEquivalencias(t: TextosEquivalencias): { equivalencias: Equivalencias; errores: string[] } {
  const equivalencias = Object.fromEntries(
    Object.entries(t).map(([k, v]) => [k, /^\d+$/.test(v) ? Number(v) : Number.NaN]),
  ) as unknown as Equivalencias
  return { equivalencias, errores: validarEquivalencias(equivalencias) }
}
