/** Abreviaturas de las monedas de MERP, de la más valiosa a la unidad base (§3). */
export type Moneda = 'mm' | 'mo' | 'mp' | 'mb' | 'mc' | 'me' | 'mh'

export const MONEDAS: readonly Moneda[] = ['mm', 'mo', 'mp', 'mb', 'mc', 'me', 'mh']

export const NOMBRE_MONEDA: Record<Moneda, string> = {
  mm: 'Mithril',
  mo: 'Oro',
  mp: 'Plata',
  mb: 'Bronce',
  mc: 'Cobre',
  me: 'Estaño',
  mh: 'Hierro',
}

/** Cuántas unidades de la moneda siguiente vale 1 unidad. El mithril se expresa en oro. */
export interface Equivalencias {
  mmEnMo: number
  moEnMp: number
  mpEnMb: number
  mbEnMc: number
  mcEnMe: number
  meEnMh: number
}

export const EQUIVALENCIAS_POR_DEFECTO: Equivalencias = {
  mmEnMo: 100,
  moEnMp: 10,
  mpEnMb: 10,
  mbEnMc: 10,
  mcEnMe: 10,
  meEnMh: 10,
}

/** Campo de cada moneda, en el orden de MONEDAS: CAMPOS[i] dice cuánto vale MONEDAS[i] en MONEDAS[i + 1]. */
const CAMPOS: readonly (keyof Equivalencias)[] = ['mmEnMo', 'moEnMp', 'mpEnMb', 'mbEnMc', 'mcEnMe', 'meEnMh']

/** Valor de 1 unidad de la moneda en hierro (mh), entero. Por defecto: mo = 100000, mm = 10000000, mh = 1. */
export function valorEnBase(moneda: Moneda, eq: Equivalencias): number {
  let valor = 1
  for (let i = MONEDAS.indexOf(moneda); i < CAMPOS.length; i++) {
    valor *= eq[CAMPOS[i]]
  }
  return valor
}

/** Errores de validación (P1): cada equivalencia es un entero ≥ 2. Lista vacía si todo es válido. */
export function validarEquivalencias(eq: Equivalencias): string[] {
  const errores: string[] = []
  CAMPOS.forEach((campo, i) => {
    const valor = eq[campo]
    if (!Number.isInteger(valor) || valor < 2) {
      const nombre = NOMBRE_MONEDA[MONEDAS[i]].toLowerCase()
      errores.push(`La equivalencia de ${nombre} debe ser un número entero de 2 o más`)
    }
  })
  return errores
}
