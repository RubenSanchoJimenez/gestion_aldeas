import { compararFechas, diaDeLaSemana, type Fecha } from './fecha'

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
export function enumerar(partes: readonly string[]): string {
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

/**
 * Los días de un tramo en un hecho del avance (D-052): si desde = hasta, formatearDiaDelAvance(desde, …). Si el
 * avance y el tramo caen en el mismo mes y año: «15 al 17». Si caen en el mismo año: «15 al 17 de abril» (mismo
 * mes) o «28 de abril al 2 de mayo». Si no: «8 al 21 de abril de 1640» (mismo mes y año del tramo), «28 de abril
 * al 2 de mayo de 1640» (mismo año del tramo) o «28 de diciembre de 1640 al 2 de enero de 1641».
 *
 * «Mismo mes y año» exige que coincidan las cuatro fechas; «mismo año», que coincidan los cuatro años.
 */
export function formatearTramoDelAvance(desde: Fecha, hasta: Fecha, primerDia: Fecha, ultimoDia: Fecha): string {
  if (compararFechas(desde, hasta) === 0) {
    return formatearDiaDelAvance(desde, primerDia, ultimoDia)
  }
  const mismoMesYAnio =
    desde.anio === hasta.anio &&
    desde.anio === primerDia.anio &&
    desde.anio === ultimoDia.anio &&
    desde.mes === hasta.mes &&
    desde.mes === primerDia.mes &&
    desde.mes === ultimoDia.mes
  if (mismoMesYAnio) {
    return `${desde.dia} al ${hasta.dia}`
  }
  const mismoAnio = desde.anio === hasta.anio && desde.anio === primerDia.anio && desde.anio === ultimoDia.anio
  if (mismoAnio) {
    return desde.mes === hasta.mes
      ? `${desde.dia} al ${hasta.dia} de ${NOMBRES_MES[desde.mes - 1]}`
      : `${formatearDiaMes(desde)} al ${formatearDiaMes(hasta)}`
  }
  if (desde.anio === hasta.anio) {
    return desde.mes === hasta.mes
      ? `${desde.dia} al ${hasta.dia} de ${NOMBRES_MES[desde.mes - 1]} de ${desde.anio}`
      : `${formatearDiaMes(desde)} al ${formatearDiaMes(hasta)} de ${desde.anio}`
  }
  return `${formatearFecha(desde)} al ${formatearFecha(hasta)}`
}
