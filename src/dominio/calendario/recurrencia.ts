import { aNumeroDeDia, compararFechas, desdeNumeroDeDia, diaEnMes, sumarDias, validarFecha, type Fecha } from './fecha'

/** Frecuencia de un pago, un cobro o una producción (§4). diaSemana: 0 = lunes … 6 = domingo. */
export type Recurrencia =
  | { tipo: 'diaria' }
  | { tipo: 'cadaNDias'; n: number; primera: Fecha }
  | { tipo: 'semanal'; diaSemana: number } // 0 = lunes
  | { tipo: 'quincenal'; primera: Fecha } // cada 14 días
  | { tipo: 'mensual'; diaMes: number } // 1–31; último día si no existe
  | { tipo: 'cadaNMeses'; n: number; diaMes: number; primera: Fecha }
  | { tipo: 'trimestral'; diaMes: number; primera: Fecha }
  | { tipo: 'anual'; mes: number; diaMes: number }
  | { tipo: 'unica'; fecha: Fecha }

/**
 * Las nueve frecuencias reducidas a tres cálculos, sin mirar la primera vez (eso lo hace primeraVez):
 * - dias: ocurre cada `cada` días; `inicial` es el número de día de una ocurrencia, real o teórica;
 * - meses: ocurre cada `cada` meses, el día `diaMes` o el último del mes; `inicial` es el índice de mes de una ocurrencia;
 * - unica: solo en `fecha`.
 */
type Patron =
  | { clase: 'dias'; cada: number; inicial: number }
  | { clase: 'meses'; cada: number; inicial: number; diaMes: number }
  | { clase: 'unica'; fecha: Fecha }

/** El número de día 0, el 1 de enero de 1970, fue jueves: el 3 en diaDeLaSemana. */
const DIA_SEMANA_DEL_DIA_0 = 3

/** Resto de 0 a divisor − 1, también con dividendos negativos (en JavaScript, −3 % 7 da −3). */
function modulo(dividendo: number, divisor: number): number {
  return ((dividendo % divisor) + divisor) % divisor
}

/** Meses contados desde enero del año 0: anio × 12 + mes − 1. */
function indiceDeMes(f: Fecha): number {
  return f.anio * 12 + f.mes - 1
}

/** El día diaMes del mes con ese índice, o el último día si el mes no lo tiene. */
function fechaDelMes(indice: number, diaMes: number): Fecha {
  const anio = Math.floor(indice / 12)
  return diaEnMes(anio, indice - anio * 12 + 1, diaMes)
}

function patron(r: Recurrencia): Patron {
  switch (r.tipo) {
    case 'diaria':
      return { clase: 'dias', cada: 1, inicial: 0 }
    case 'cadaNDias':
      return { clase: 'dias', cada: r.n, inicial: aNumeroDeDia(r.primera) }
    case 'semanal':
      // El día número diaSemana − 3 cae en ese día de la semana, porque el día 0 fue jueves (3).
      return { clase: 'dias', cada: 7, inicial: r.diaSemana - DIA_SEMANA_DEL_DIA_0 }
    case 'quincenal':
      return { clase: 'dias', cada: 14, inicial: aNumeroDeDia(r.primera) }
    case 'mensual':
      return { clase: 'meses', cada: 1, inicial: 0, diaMes: r.diaMes }
    case 'cadaNMeses':
      return { clase: 'meses', cada: r.n, inicial: indiceDeMes(r.primera), diaMes: r.diaMes }
    case 'trimestral':
      return { clase: 'meses', cada: 3, inicial: indiceDeMes(r.primera), diaMes: r.diaMes }
    case 'anual':
      // El mes elegido del año 0, y de ahí cada 12 meses.
      return { clase: 'meses', cada: 12, inicial: r.mes - 1, diaMes: r.diaMes }
    case 'unica':
      return { clase: 'unica', fecha: r.fecha }
  }
}

/** La primera vez de cadaNDias, quincenal, cadaNMeses y trimestral; null en los tipos que no la tienen. */
function primeraVez(r: Recurrencia): Fecha | null {
  return 'primera' in r ? r.primera : null
}

/**
 * true si la recurrencia ocurre el día f; nunca antes de la primera vez (§6.4 y §6.5).
 * Supone una recurrencia válida (validarRecurrencia sin errores).
 */
export function ocurreEl(r: Recurrencia, f: Fecha): boolean {
  const primera = primeraVez(r)
  if (primera !== null && compararFechas(f, primera) < 0) {
    return false
  }
  const p = patron(r)
  switch (p.clase) {
    case 'dias':
      return modulo(aNumeroDeDia(f) - p.inicial, p.cada) === 0
    case 'meses': {
      const indice = indiceDeMes(f)
      return modulo(indice - p.inicial, p.cada) === 0 && compararFechas(f, fechaDelMes(indice, p.diaMes)) === 0
    }
    case 'unica':
      return compararFechas(f, p.fecha) === 0
  }
}

/** Primera ocurrencia estrictamente posterior a `despuesDe`, o null (única ya pasada). Antes de `primera`, `primera`. */
export function siguienteOcurrencia(r: Recurrencia, despuesDe: Fecha): Fecha | null {
  const primera = primeraVez(r)
  if (primera !== null && compararFechas(despuesDe, primera) < 0) {
    // Nada antes de la primera vez, que es una ocurrencia: validarRecurrencia comprueba que cae en el día del mes.
    return { ...primera }
  }
  const p = patron(r)
  switch (p.clase) {
    case 'dias': {
      const numero = aNumeroDeDia(despuesDe)
      // Lo que falta para completar el periodo en curso; si despuesDe es ocurrencia, un periodo entero.
      return desdeNumeroDeDia(numero + p.cada - modulo(numero - p.inicial, p.cada))
    }
    case 'meses': {
      const indice = indiceDeMes(despuesDe)
      // Último mes del periodo que no es posterior al mes de despuesDe.
      const mes = indice - modulo(indice - p.inicial, p.cada)
      const candidata = fechaDelMes(mes, p.diaMes)
      return compararFechas(candidata, despuesDe) > 0 ? candidata : fechaDelMes(mes + p.cada, p.diaMes)
    }
    case 'unica':
      return compararFechas(p.fecha, despuesDe) > 0 ? { ...p.fecha } : null
  }
}

/** Ocurrencias con desde ≤ fecha ≤ hasta, en orden; ninguna anterior a `primera`. */
export function ocurrenciasEntre(r: Recurrencia, desde: Fecha, hasta: Fecha): Fecha[] {
  const fechas: Fecha[] = []
  // Empezar en la víspera de desde incluye desde si es ocurrencia.
  let fecha = siguienteOcurrencia(r, sumarDias(desde, -1))
  while (fecha !== null && compararFechas(fecha, hasta) <= 0) {
    fechas.push(fecha)
    fecha = siguienteOcurrencia(r, fecha)
  }
  return fechas
}

/**
 * Ocurrencia teórica estrictamente anterior a `antesDe` (puede ser anterior a `primera`, contando hacia atrás: la primera
 * vez menos uno o más periodos, §6.4 y §6.5). null solo con 'unica', si su fecha no es anterior. Sirve para los periodos
 * de producción (§7).
 */
export function anteriorOcurrencia(r: Recurrencia, antesDe: Fecha): Fecha | null {
  const p = patron(r)
  switch (p.clase) {
    case 'dias': {
      // La víspera, o la ocurrencia más reciente antes de ella.
      const vispera = aNumeroDeDia(antesDe) - 1
      return desdeNumeroDeDia(vispera - modulo(vispera - p.inicial, p.cada))
    }
    case 'meses': {
      const indice = indiceDeMes(antesDe)
      const mes = indice - modulo(indice - p.inicial, p.cada)
      const candidata = fechaDelMes(mes, p.diaMes)
      return compararFechas(candidata, antesDe) < 0 ? candidata : fechaDelMes(mes - p.cada, p.diaMes)
    }
    case 'unica':
      return compararFechas(p.fecha, antesDe) < 0 ? { ...p.fecha } : null
  }
}

function esEnteroEntre(valor: number, minimo: number, maximo: number): boolean {
  return Number.isInteger(valor) && valor >= minimo && valor <= maximo
}

function errorDiaMes(diaMes: number): string | null {
  return esEnteroEntre(diaMes, 1, 31) ? null : 'El día del mes debe estar entre 1 y 31'
}

/** Día del mes, primera vez y, si los dos son válidos, que la primera vez caiga en ese día (o el último del mes). */
function erroresDiaMesYPrimera(diaMes: number, primera: Fecha): (string | null)[] {
  const errorDia = errorDiaMes(diaMes)
  const errorPrimera = validarFecha(primera)
  if (errorDia !== null || errorPrimera !== null) {
    return [errorDia, errorPrimera]
  }
  if (primera.dia === diaEnMes(primera.anio, primera.mes, diaMes).dia) {
    return []
  }
  // Todos los meses tienen 28 días; del 29 al 31, algún mes usa el último día.
  return [
    diaMes > 28
      ? `La primera vez debe caer el día ${diaMes} del mes o, si no lo tiene, el último`
      : `La primera vez debe caer el día ${diaMes} del mes`,
  ]
}

/**
 * Errores: n entero ≥ 2 (cadaNDias ≤ 366, cadaNMeses ≤ 12), diaMes 1–31, diaSemana 0–6, mes 1–12, fechas válidas y,
 * en cadaNMeses y trimestral, la primera vez en el día del mes elegido. Lista vacía si todo es válido.
 */
export function validarRecurrencia(r: Recurrencia): string[] {
  let errores: (string | null)[]
  switch (r.tipo) {
    case 'diaria':
      errores = []
      break
    case 'cadaNDias':
      errores = [esEnteroEntre(r.n, 2, 366) ? null : 'N debe ser un número entero de 2 a 366', validarFecha(r.primera)]
      break
    case 'semanal':
      errores = [esEnteroEntre(r.diaSemana, 0, 6) ? null : 'El día de la semana debe estar entre lunes y domingo']
      break
    case 'quincenal':
      errores = [validarFecha(r.primera)]
      break
    case 'mensual':
      errores = [errorDiaMes(r.diaMes)]
      break
    case 'cadaNMeses':
      errores = [
        esEnteroEntre(r.n, 2, 12) ? null : 'N debe ser un número entero de 2 a 12',
        ...erroresDiaMesYPrimera(r.diaMes, r.primera),
      ]
      break
    case 'trimestral':
      errores = erroresDiaMesYPrimera(r.diaMes, r.primera)
      break
    case 'anual':
      errores = [esEnteroEntre(r.mes, 1, 12) ? null : 'El mes debe estar entre 1 y 12', errorDiaMes(r.diaMes)]
      break
    case 'unica':
      errores = [validarFecha(r.fecha)]
      break
  }
  return errores.filter((error): error is string => error !== null)
}
