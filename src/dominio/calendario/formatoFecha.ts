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

/** «a», «a y b», «a, b y c»: una lista escrita como se lee. */
function enumerar(partes: readonly string[]): string {
  if (partes.length === 0) {
    return ''
  }
  if (partes.length === 1) {
    return partes[0]
  }
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}

/** «abril», «marzo y abril», «enero, febrero y marzo»; si cruzan de año, cada mes con el suyo (§9 l.1288, D-031). */
export function formatearMeses(meses: readonly { anio: number; mes: number }[]): string {
  const cruzanDeAnio = meses.some((m) => m.anio !== meses[0].anio)
  const nombres = meses.map((m) => {
    const nombre = NOMBRES_MES[m.mes - 1]
    return cruzanDeAnio ? `${nombre} de ${m.anio}` : nombre
  })
  return enumerar(nombres)
}

/** «19 de julio», o «19 de enero de 1641» si el año no es el de `hoy` (D-025). */
export function formatearDiaCercano(f: Fecha, hoy: Fecha): string {
  return f.anio === hoy.anio ? formatearDiaMes(f) : formatearFecha(f)
}

/**
 * El día de un hecho: «19» si el avance cae en un mes; «19 de abril» si cae en un año; si no, con el año
 * (D-032, T18). primerDia y ultimoDia son el primer y el último día simulados.
 */
export function formatearDiaDelAvance(f: Fecha, primerDia: Fecha, ultimoDia: Fecha): string {
  if (primerDia.anio !== ultimoDia.anio) {
    return formatearFecha(f)
  }
  if (primerDia.mes !== ultimoDia.mes) {
    return formatearDiaMes(f)
  }
  return String(f.dia)
}
