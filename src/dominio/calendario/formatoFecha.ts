import { diaDeLaSemana, type Fecha } from './fecha'

/** Edad de la partida: solo una etiqueta que acompaña al año (§4). */
export type Edad = 'segunda' | 'tercera' | 'cuarta'

export const ABREVIATURA_EDAD: Readonly<Record<Edad, string>> = {
  segunda: 'S.E.',
  tercera: 'T.E.',
  cuarta: 'C.E.',
}

/** NOMBRES_MES[0] es enero: el índice es mes − 1. */
export const NOMBRES_MES: readonly string[] = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** NOMBRES_DIA[0] es lunes: el índice es el de diaDeLaSemana. */
export const NOMBRES_DIA: readonly string[] = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
]

/** «12 de abril». Precondición: f es una fecha válida (validarFecha). */
export function formatearDiaMes(f: Fecha): string {
  return `${f.dia} de ${NOMBRES_MES[f.mes - 1]}`
}

/**
 * «12 de abril de 1640 T.E.»; sin edad: «12 de abril de 1640»; con diaSemana: «jueves, 12 de abril de 1640 T.E.».
 * Precondición: f es una fecha válida (validarFecha).
 */
export function formatearFecha(f: Fecha, opciones: { edad?: Edad; diaSemana?: boolean } = {}): string {
  // El año va tal cual, sin separador de miles: es un año, no una cantidad.
  let texto = `${formatearDiaMes(f)} de ${f.anio}`
  if (opciones.edad !== undefined) {
    texto = `${texto} ${ABREVIATURA_EDAD[opciones.edad]}`
  }
  if (opciones.diaSemana === true) {
    texto = `${NOMBRES_DIA[diaDeLaSemana(f)]}, ${texto}`
  }
  return texto
}
