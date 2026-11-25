import { compararFechas, diaDeLaSemana, diaEnMes, sumarDias, sumarMeses, type Fecha } from './fecha'
import { formatearFecha, type Edad } from './formatoFecha'
import { siguienteOcurrencia, validarRecurrencia, type Recurrencia } from './recurrencia'

export type TipoRecurrencia = Recurrencia['tipo']

/** Último día que la app sabe representar (§4, D-001). */
export const FECHA_MAXIMA: Fecha = { anio: 9999, mes: 12, dia: 31 }

/** Textos de los tipos (§6.5, n.º 13). */
export const TEXTO_TIPO: Readonly<Record<TipoRecurrencia, string>> = {
  diaria: 'Cada día',
  cadaNDias: 'Cada N días',
  semanal: 'Semanal',
  quincenal: 'Cada dos semanas',
  mensual: 'Mensual',
  cadaNMeses: 'Cada N meses',
  trimestral: 'Trimestral',
  anual: 'Anual',
  unica: 'Una sola vez',
}

/** Grupos del selector de frecuencia (D-095). */
export const GRUPOS_TIPO: readonly { nombre: string; tipos: readonly TipoRecurrencia[] }[] = [
  { nombre: 'Habituales', tipos: ['diaria', 'semanal', 'quincenal', 'mensual', 'trimestral', 'anual'] },
  { nombre: 'Personalizadas', tipos: ['cadaNDias', 'cadaNMeses', 'unica'] },
]

/** La fecha, o el 31/12/9999 si lo pasa (D-096). */
export function recortarAFechaMaxima(f: Fecha): Fecha {
  return compararFechas(f, FECHA_MAXIMA) > 0 ? FECHA_MAXIMA : f
}

/** El día `diaMes` del mes que cae `meses` después del de hoy. */
function primeraDelMes(hoy: Fecha, meses: number, diaMes: number): Fecha {
  const mes = sumarMeses({ ...hoy, dia: 1 }, meses)
  return recortarAFechaMaxima(diaEnMes(mes.anio, mes.mes, diaMes))
}

/** hoy + n días, sin pasar de la fecha máxima. */
function dentroDe(hoy: Fecha, dias: number): Fecha {
  return recortarAFechaMaxima(sumarDias(hoy, dias))
}

/** El valor al elegir un tipo (D-095); conserva el día del mes (y el mes, en anual) si ya lo había. */
export function frecuenciaInicial(tipo: TipoRecurrencia, hoy: Fecha, anterior?: Recurrencia): Recurrencia {
  const diaMes = anterior !== undefined && 'diaMes' in anterior ? anterior.diaMes : hoy.dia
  switch (tipo) {
    case 'diaria':
      return { tipo }
    case 'cadaNDias':
      return { tipo, n: 2, primera: dentroDe(hoy, 2) }
    case 'semanal':
      return { tipo, diaSemana: diaDeLaSemana(hoy) }
    case 'quincenal':
      return { tipo, primera: dentroDe(hoy, 14) }
    case 'mensual':
      return { tipo, diaMes }
    case 'cadaNMeses':
      return { tipo, n: 2, diaMes, primera: primeraDelMes(hoy, 2, diaMes) }
    case 'trimestral':
      return { tipo, diaMes, primera: primeraDelMes(hoy, 3, diaMes) }
    case 'anual':
      return { tipo, mes: anterior?.tipo === 'anual' ? anterior.mes : hoy.mes, diaMes }
    case 'unica':
      return { tipo, fecha: dentroDe(hoy, 1) }
  }
}

const esEntero = (n: number, minimo: number, maximo: number): boolean =>
  Number.isInteger(n) && n >= minimo && n <= maximo

/** Cambia N y, si vale, recalcula «Primera vez» (D-095). */
export function conN(r: Recurrencia, n: number, hoy: Fecha): Recurrencia {
  if (r.tipo === 'cadaNDias') {
    return { ...r, n, primera: esEntero(n, 2, 366) ? dentroDe(hoy, n) : r.primera }
  }
  if (r.tipo === 'cadaNMeses') {
    return { ...r, n, primera: esEntero(n, 2, 12) ? primeraDelMes(hoy, n, r.diaMes) : r.primera }
  }
  return r
}

/** Cambia el día del mes y, en «Cada N meses» y «Trimestral», recalcula «Primera vez». */
export function conDiaMes(r: Recurrencia, diaMes: number, hoy: Fecha): Recurrencia {
  const vale = esEntero(diaMes, 1, 31)
  if (r.tipo === 'cadaNMeses') {
    return { ...r, diaMes, primera: vale && esEntero(r.n, 2, 12) ? primeraDelMes(hoy, r.n, diaMes) : r.primera }
  }
  if (r.tipo === 'trimestral') {
    return { ...r, diaMes, primera: vale ? primeraDelMes(hoy, 3, diaMes) : r.primera }
  }
  if (r.tipo === 'mensual' || r.tipo === 'anual') {
    return { ...r, diaMes }
  }
  return r
}

export interface ErroresFrecuencia {
  n?: string
  diaSemana?: string
  diaMes?: string
  mes?: string
  fecha?: string
}

/** A qué campo pertenece un mensaje de validarRecurrencia. */
export function campoDelMensaje(mensaje: string, r: Recurrencia): keyof ErroresFrecuencia {
  if (mensaje.startsWith('N debe ser')) {
    return 'n'
  }
  if (mensaje.startsWith('El día de la semana')) {
    return 'diaSemana'
  }
  if (mensaje.startsWith('El día del mes') || (r.tipo === 'anual' && /no tiene \d+ días$/.test(mensaje))) {
    return 'diaMes'
  }
  if (mensaje === 'El mes debe estar entre 1 y 12' && r.tipo === 'anual') {
    return 'mes'
  }
  return 'fecha'
}

/** La fecha escrita en el campo, si ese tipo tiene una. */
export function fechaDelCampo(r: Recurrencia): Fecha | undefined {
  if (r.tipo === 'unica') {
    return r.fecha
  }
  return 'primera' in r ? r.primera : r.inicio
}

/**
 * Errores por campo. La fecha tiene que ser posterior a hoy, salvo que la frecuencia sea la que ya estaba
 * guardada (D-003, D-095).
 */
export function erroresDeFrecuencia(r: Recurrencia, hoy: Fecha, edad: Edad, guardada?: Recurrencia): ErroresFrecuencia {
  const errores: ErroresFrecuencia = {}
  for (const mensaje of validarRecurrencia(r)) {
    errores[campoDelMensaje(mensaje, r)] ??= mensaje
  }
  const fecha = fechaDelCampo(r)
  const sinCambios = guardada !== undefined && JSON.stringify(guardada) === JSON.stringify(r)
  if (!sinCambios && fecha !== undefined && errores.fecha === undefined && compararFechas(fecha, hoy) <= 0) {
    errores.fecha = `Tiene que ser posterior al ${formatearFecha(hoy, { edad })}`
  }
  return errores
}

export function hayErroresDeFrecuencia(errores: ErroresFrecuencia): boolean {
  return Object.keys(errores).length > 0
}

/** La próxima ocurrencia posterior a hoy, o null. */
export function proximaFecha(r: Recurrencia, hoy: Fecha): Fecha | null {
  if (validarRecurrencia(r).length > 0 || compararFechas(hoy, FECHA_MAXIMA) >= 0) {
    return null
  }
  const proxima = siguienteOcurrencia(r, hoy)
  return proxima === null || compararFechas(proxima, FECHA_MAXIMA) > 0 ? null : proxima
}
