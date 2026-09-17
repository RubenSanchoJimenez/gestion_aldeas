import type { Recurrencia } from '../calendario/recurrencia'
import { redondearMitadArriba } from './importe'

/** Factor mensual de §3 como fracción exacta de enteros: numerador ÷ denominador. */
function fraccionMensual(r: Recurrencia): { numerador: number; denominador: number } {
  switch (r.tipo) {
    case 'diaria':
      return { numerador: 30, denominador: 1 }
    case 'cadaNDias':
      return { numerador: 30, denominador: r.n }
    case 'semanal':
      return { numerador: 30, denominador: 7 }
    case 'quincenal':
      return { numerador: 30, denominador: 14 }
    case 'mensual':
      return { numerador: 1, denominador: 1 }
    case 'cadaNMeses':
      return { numerador: 1, denominador: r.n }
    case 'trimestral':
      return { numerador: 1, denominador: 3 }
    case 'anual':
      return { numerador: 1, denominador: 12 }
    case 'unica':
      return { numerador: 0, denominador: 1 }
  }
}

/** Factor para pasar a 30 días (§3): diaria 30; cadaNDias 30/n; semanal 30/7; quincenal 30/14; mensual 1; cadaNMeses 1/n; trimestral 1/3; anual 1/12; unica 0. */
export function factorMensual(r: Recurrencia): number {
  const { numerador, denominador } = fraccionMensual(r)
  return numerador / denominador
}

/**
 * Importe equivalente al mes, en mh, redondeado con redondearMitadArriba: base × factor. Multiplica y divide con
 * BigInt la fracción exacta del factor, sin coma flotante. Supone una recurrencia válida (validarRecurrencia).
 *
 * Precondiciones: base es un entero en mh; el resultado debe caber en los enteros seguros (Number.isSafeInteger).
 */
export function alMes(base: number, r: Recurrencia): number {
  const { numerador, denominador } = fraccionMensual(r)
  const producto = BigInt(base) * BigInt(numerador)
  const divisor = BigInt(denominador)
  // La división de BigInt corta hacia 0, y el resto lleva el signo del producto: −30 ÷ 4 da −7 y resto −2.
  const entero = producto / divisor
  const resto = producto % divisor
  // resto ÷ denominador está entre −1 y 1, y redondearMitadArriba lo deja en −1, 0 o 1: −2 ÷ 4 = −0,5 → 0, así que
  // −7,5 → −7. Las mitades son exactas en coma flotante.
  return Number(entero) + redondearMitadArriba(Number(resto) / denominador)
}
