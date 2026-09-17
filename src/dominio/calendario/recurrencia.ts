import {
  aNumeroDeDia,
  compararFechas,
  desdeNumeroDeDia,
  diaEnMes,
  diasDelMes,
  nombreDeMesEnMensaje,
  sumarDias,
  validarFecha,
  type Fecha,
} from './fecha'

/**
 * Frecuencia de un pago, un cobro o una producción (§4). diaSemana: 0 = lunes … 6 = domingo.
 *
 * `primera` (cadaNDias, quincenal, cadaNMeses y trimestral) es una ocurrencia: ancla la cuenta de los periodos, y las
 * demás ocurrencias salen de contar periodos completos desde ella. `inicio` (diaria, semanal, mensual y anual) solo
 * impide ocurrencias anteriores a esa fecha: no tiene que caer en el día elegido, y sin él todo funciona igual que
 * antes.
 */
export type Recurrencia =
  | { tipo: 'diaria'; inicio?: Fecha }
  | { tipo: 'cadaNDias'; n: number; primera: Fecha }
  | { tipo: 'semanal'; diaSemana: number; inicio?: Fecha } // 0 = lunes
  | { tipo: 'quincenal'; primera: Fecha } // cada 14 días
  | { tipo: 'mensual'; diaMes: number; inicio?: Fecha } // 1–31; último día si no existe
  | { tipo: 'cadaNMeses'; n: number; diaMes: number; primera: Fecha }
  | { tipo: 'trimestral'; diaMes: number; primera: Fecha }
  | { tipo: 'anual'; mes: number; diaMes: number; inicio?: Fecha }
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

/** La fecha de inicio opcional de diaria, semanal, mensual y anual; null si no la tiene o no está puesta. */
function inicioDe(r: Recurrencia): Fecha | null {
  return 'inicio' in r && r.inicio !== undefined ? r.inicio : null
}

/**
 * true si la recurrencia ocurre el día f; nunca antes de la primera vez (§6.4 y §6.5) ni antes de la fecha de
 * inicio, si la tiene. Supone una recurrencia válida (validarRecurrencia sin errores).
 */
export function ocurreEl(r: Recurrencia, f: Fecha): boolean {
  const primera = primeraVez(r)
  if (primera !== null && compararFechas(f, primera) < 0) {
    return false
  }
  const inicio = inicioDe(r)
  if (inicio !== null && compararFechas(f, inicio) < 0) {
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

/**
 * Primera ocurrencia estrictamente posterior a `despuesDe`, o null (única ya pasada). Antes de `primera`, `primera`.
 * Si hay `inicio` y `despuesDe` es anterior a su víspera, calcula como si `despuesDe` fuera esa víspera: así `inicio`
 * mismo entra en el resultado cuando es ocurrencia.
 */
export function siguienteOcurrencia(r: Recurrencia, despuesDe: Fecha): Fecha | null {
  const primera = primeraVez(r)
  if (primera !== null && compararFechas(despuesDe, primera) < 0) {
    // Nada antes de la primera vez, que es una ocurrencia: validarRecurrencia comprueba que cae en el día del mes.
    return { ...primera }
  }
  const inicio = inicioDe(r)
  const visperaDeInicio = inicio !== null ? sumarDias(inicio, -1) : null
  const desde = visperaDeInicio !== null && compararFechas(despuesDe, visperaDeInicio) < 0 ? visperaDeInicio : despuesDe
  const p = patron(r)
  switch (p.clase) {
    case 'dias': {
      const numero = aNumeroDeDia(desde)
      // Lo que falta para completar el periodo en curso; si desde es ocurrencia, un periodo entero.
      return desdeNumeroDeDia(numero + p.cada - modulo(numero - p.inicial, p.cada))
    }
    case 'meses': {
      const indice = indiceDeMes(desde)
      // Último mes del periodo que no es posterior al mes de desde.
      const mes = indice - modulo(indice - p.inicial, p.cada)
      const candidata = fechaDelMes(mes, p.diaMes)
      return compararFechas(candidata, desde) > 0 ? candidata : fechaDelMes(mes + p.cada, p.diaMes)
    }
    case 'unica':
      return compararFechas(p.fecha, desde) > 0 ? { ...p.fecha } : null
  }
}

/** Ocurrencias con desde ≤ fecha ≤ hasta, en orden; ninguna anterior a `primera` ni a `inicio` (los dos, si los hay). */
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
 * vez menos uno o más periodos, §6.4 y §6.5). Ignora `inicio`, igual que ignora `primera`: la ocurrencia teórica sirve
 * para los periodos de producción (§7). null solo con 'unica', si su fecha no es anterior.
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

/** Año bisiesto usado como referencia: así el mes de la frecuencia anual tiene sus 29 días de febrero. */
const ANIO_BISIESTO_DE_REFERENCIA = 2000

/** Error de la frecuencia anual si el mes y el día ya son válidos: el día debe existir en el mes en algún año. */
function errorDiaDelMesAnual(mes: number, diaMes: number): string | null {
  const diasEnAnioBisiesto = diasDelMes(ANIO_BISIESTO_DE_REFERENCIA, mes)
  return diaMes > diasEnAnioBisiesto ? `${nombreDeMesEnMensaje(mes)} no tiene ${diaMes} días` : null
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

/** Añade el error de validarFecha(inicio) tras `errores`, si la recurrencia tiene una fecha de inicio puesta. */
function conInicio(errores: (string | null)[], inicio: Fecha | undefined): (string | null)[] {
  return inicio === undefined ? errores : [...errores, validarFecha(inicio)]
}

/**
 * Errores: n entero ≥ 2 (cadaNDias ≤ 366, cadaNMeses ≤ 12), diaMes 1–31, diaSemana 0–6, mes 1–12, fechas válidas,
 * en cadaNMeses y trimestral la primera vez en el día del mes elegido, en anual que el mes tenga ese día en algún
 * año (el 29 de febrero se admite) y, si hay fecha de inicio (diaria, semanal, mensual y anual), que sea válida.
 * Lista vacía si todo es válido.
 */
export function validarRecurrencia(r: Recurrencia): string[] {
  let errores: (string | null)[]
  switch (r.tipo) {
    case 'diaria':
      errores = conInicio([], r.inicio)
      break
    case 'cadaNDias':
      errores = [esEnteroEntre(r.n, 2, 366) ? null : 'N debe ser un número entero de 2 a 366', validarFecha(r.primera)]
      break
    case 'semanal':
      errores = conInicio(
        [esEnteroEntre(r.diaSemana, 0, 6) ? null : 'El día de la semana debe estar entre lunes y domingo'],
        r.inicio,
      )
      break
    case 'quincenal':
      errores = [validarFecha(r.primera)]
      break
    case 'mensual':
      errores = conInicio([errorDiaMes(r.diaMes)], r.inicio)
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
    case 'anual': {
      const errorMes = esEnteroEntre(r.mes, 1, 12) ? null : 'El mes debe estar entre 1 y 12'
      const errorDia = errorDiaMes(r.diaMes)
      const erroresPropios =
        errorMes !== null || errorDia !== null ? [errorMes, errorDia] : [errorDiaDelMesAnual(r.mes, r.diaMes)]
      errores = conInicio(erroresPropios, r.inicio)
      break
    }
    case 'unica':
      errores = [validarFecha(r.fecha)]
      break
  }
  return errores.filter((error): error is string => error !== null)
}
