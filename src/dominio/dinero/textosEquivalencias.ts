import { formatearNumero } from './formato'
import { MONEDAS, type Equivalencias, type Moneda } from './monedas'

/** Campo que convierte cada moneda de MONEDAS en la siguiente, en el mismo orden (espejo del privado de monedas.ts). */
const CAMPOS: readonly (keyof Equivalencias)[] = ['mmEnMo', 'moEnMp', 'mpEnMb', 'mbEnMc', 'mcEnMe', 'meEnMh']

/** «1 mm = 100 mo · 1 mo = 10 mp · 1 mp = 10 mb · 1 mb = 10 mc · 1 mc = 10 me · 1 me = 10 mh» (P1, mjs L353). */
export function cadenaDeEquivalencias(eq: Equivalencias): string {
  return CAMPOS.map((campo, i) => `1 ${MONEDAS[i]} = ${formatearNumero(eq[campo], 0)} ${MONEDAS[i + 1]}`).join(' · ')
}

/** Las cuatro monedas de equivalenciasDesdeOro, del oro al cobre. */
const DESDE_ORO: readonly Moneda[] = ['mo', 'mp', 'mb', 'mc']

/** «1 mo = 10 mp = 100 mb = 1.000 mc»: valores acumulados desde el oro hasta el cobre (P1b, mjs L215). */
export function equivalenciasDesdeOro(eq: Equivalencias): string {
  let acumulado = 1
  const partes = [`1 ${DESDE_ORO[0]}`]
  for (let i = 1; i < DESDE_ORO.length; i += 1) {
    acumulado *= eq[CAMPOS[i]]
    partes.push(`${formatearNumero(acumulado, 0)} ${DESDE_ORO[i]}`)
  }
  return partes.join(' = ')
}
