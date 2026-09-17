/** Fecha del calendario gregoriano proléptico (el actual, extendido hacia atrás). mes y dia empiezan en 1. (§4) */
export interface Fecha {
  anio: number
  mes: number
  dia: number
}

/**
 * Todas las funciones de este módulo, salvo validarFecha, dan por hecho que la fecha es válida (validarFecha sin
 * error). aNumeroDeDia, compararFechas y diasEntre no comprueban que la fecha exista: el 29 de febrero de 1641 (que
 * no existe, 1641 no es bisiesto) da el mismo número de día que el 1 de marzo de 1641, así que no sirven para
 * validar una fecha.
 */

/** Nombres de los meses con mayúscula inicial, para empezar mensajes de error (validarFecha, recurrencia.ts). */
const MESES_EN_MENSAJE = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

/** Días de cada mes en un año no bisiesto; febrero se corrige en diasDelMes. */
const DIAS_POR_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Nombre del mes con mayúscula inicial; mes debe ser un entero de 1 (enero) a 12 (diciembre). */
export function nombreDeMesEnMensaje(mes: number): string {
  return MESES_EN_MENSAJE[mes - 1]
}

/** Bisiesto gregoriano: múltiplo de 4, salvo los múltiplos de 100 que no lo son de 400. */
export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
}

export function diasDelMes(anio: number, mes: number): number {
  if (mes === 2 && esBisiesto(anio)) {
    return 29
  }
  return DIAS_POR_MES[mes - 1]
}

/** null si es válida; si no, el mensaje: «El año debe estar entre 1 y 9999», «El mes debe estar entre 1 y 12», «Abril de 1640 tiene 30 días». */
export function validarFecha(f: Fecha): string | null {
  if (!Number.isInteger(f.anio) || f.anio < 1 || f.anio > 9999) {
    return 'El año debe estar entre 1 y 9999'
  }
  if (!Number.isInteger(f.mes) || f.mes < 1 || f.mes > 12) {
    return 'El mes debe estar entre 1 y 12'
  }
  const dias = diasDelMes(f.anio, f.mes)
  if (!Number.isInteger(f.dia) || f.dia < 1 || f.dia > dias) {
    return `${nombreDeMesEnMensaje(f.mes)} de ${f.anio} tiene ${dias} días`
  }
  return null
}

/** Días entre el 1 de marzo del año 0 y el 1 de enero de 1970. */
const DIAS_DESDE_1_MARZO_ANIO_0_A_1970 = 719468
/** Días de un ciclo gregoriano completo de 400 años. */
const DIAS_POR_CICLO_400 = 146097

/** Número de día absoluto (algoritmo days_from_civil de Howard Hinnant); 1 de enero de 1970 = 0. */
export function aNumeroDeDia(f: Fecha): number {
  // El año empieza el 1 de marzo: así el 29 de febrero, si existe, es el último día del año.
  const anio = f.mes <= 2 ? f.anio - 1 : f.anio
  const ciclo = Math.floor(anio / 400)
  const anioDelCiclo = anio - ciclo * 400 // 0 a 399
  const mesDesdeMarzo = f.mes > 2 ? f.mes - 3 : f.mes + 9 // marzo = 0 … febrero = 11
  const diaDelAnio = Math.floor((153 * mesDesdeMarzo + 2) / 5) + f.dia - 1 // 0 a 365
  const diaDelCiclo =
    anioDelCiclo * 365 +
    Math.floor(anioDelCiclo / 4) -
    Math.floor(anioDelCiclo / 100) +
    diaDelAnio // 0 a 146096
  return ciclo * DIAS_POR_CICLO_400 + diaDelCiclo - DIAS_DESDE_1_MARZO_ANIO_0_A_1970
}

/** Inversa de aNumeroDeDia (algoritmo civil_from_days de Howard Hinnant). */
export function desdeNumeroDeDia(n: number): Fecha {
  const z = n + DIAS_DESDE_1_MARZO_ANIO_0_A_1970
  const ciclo = Math.floor(z / DIAS_POR_CICLO_400)
  const diaDelCiclo = z - ciclo * DIAS_POR_CICLO_400 // 0 a 146096
  const anioDelCiclo = Math.floor(
    (diaDelCiclo -
      Math.floor(diaDelCiclo / 1460) +
      Math.floor(diaDelCiclo / 36524) -
      Math.floor(diaDelCiclo / 146096)) /
      365,
  ) // 0 a 399
  const diaDelAnio =
    diaDelCiclo -
    (365 * anioDelCiclo + Math.floor(anioDelCiclo / 4) - Math.floor(anioDelCiclo / 100)) // 0 a 365
  const mesDesdeMarzo = Math.floor((5 * diaDelAnio + 2) / 153) // marzo = 0 … febrero = 11
  const dia = diaDelAnio - Math.floor((153 * mesDesdeMarzo + 2) / 5) + 1
  const mes = mesDesdeMarzo < 10 ? mesDesdeMarzo + 3 : mesDesdeMarzo - 9
  const anio = anioDelCiclo + ciclo * 400 + (mes <= 2 ? 1 : 0)
  return { anio, mes, dia }
}

export function sumarDias(f: Fecha, dias: number): Fecha {
  return desdeNumeroDeDia(aNumeroDeDia(f) + dias)
}

/** hasta − desde, en días. */
export function diasEntre(desde: Fecha, hasta: Fecha): number {
  return aNumeroDeDia(hasta) - aNumeroDeDia(desde)
}

/** Negativo si a es anterior a b, 0 si son la misma fecha y positivo si a es posterior. */
export function compararFechas(a: Fecha, b: Fecha): number {
  return aNumeroDeDia(a) - aNumeroDeDia(b)
}

/** 0 = lunes … 6 = domingo (semana de lunes a domingo, §4). */
export function diaDeLaSemana(f: Fecha): number {
  // El día 0 (1 de enero de 1970) fue jueves, que es el 3. En JavaScript, % da restos negativos
  // (y −0) antes de 1970: sumar 7 y volver a hacer % 7 deja siempre un número de 0 a 6.
  return (((aNumeroDeDia(f) + 3) % 7) + 7) % 7
}

/** El día pedido, o el último del mes si no existe: diaEnMes(1640, 4, 31) → { 1640, 4, 30 }. */
export function diaEnMes(anio: number, mes: number, dia: number): Fecha {
  return { anio, mes, dia: Math.min(dia, diasDelMes(anio, mes)) }
}

/** Suma meses; si el día no existe en el mes destino, usa el último día (§4). */
export function sumarMeses(f: Fecha, meses: number): Fecha {
  const mesesDesdeElAnio0 = f.anio * 12 + (f.mes - 1) + meses
  const anio = Math.floor(mesesDesdeElAnio0 / 12)
  const mes = mesesDesdeElAnio0 - anio * 12 + 1
  return diaEnMes(anio, mes, f.dia)
}
