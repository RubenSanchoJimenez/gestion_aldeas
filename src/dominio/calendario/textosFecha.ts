import { diaDeLaSemana, type Fecha } from './fecha'
import { formatearFecha, NOMBRES_DIA, type Edad } from './formatoFecha'

/** «jueves» → «Jueves» (vistas: barra superior y P6). */
export function conMayuscula(texto: string): string {
  return texto === '' ? '' : texto[0].toUpperCase() + texto.slice(1)
}

/** «domingo 1 de enero de 1640 T.E.»: el día de la semana sin coma (aviso de P1). */
export function formatearFechaConDia(f: Fecha, edad?: Edad): string {
  return `${NOMBRES_DIA[diaDeLaSemana(f)]} ${formatearFecha(f, edad === undefined ? {} : { edad })}`
}

/** «Jueves»: el día de la semana con mayúscula (barra superior). */
export function nombreDelDia(f: Fecha): string {
  return conMayuscula(NOMBRES_DIA[diaDeLaSemana(f)])
}

/** «19/04/1640» → la fecha; null si no tiene la forma d/m/a. No la valida: eso es validarFecha. */
export function leerFechaEscrita(texto: string): Fecha | null {
  const partes = /^(\d{1,2})\/(\d{1,2})\/(\d{1,4})$/.exec(texto.trim())
  return partes === null ? null : { anio: Number(partes[3]), mes: Number(partes[2]), dia: Number(partes[1]) }
}
