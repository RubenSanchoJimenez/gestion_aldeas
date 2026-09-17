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

/**
 * Cota superior para el valor de 1 mithril en hierro (P1, validación de equivalencias), decidida por
 * el usuario el 2026-09-17. Sin ella, seis equivalencias de 1000 cada una ya llevan
 * valorEnBase('mm', eq) a 1e18, muy por encima de Number.MAX_SAFE_INTEGER (≈9.007e15), y con eso los
 * saldos guardados en hierro dejan de ser enteros exactos. 1.000.000.000 deja margen amplio a los
 * saldos de la partida sin acercarse a MAX_SAFE_INTEGER.
 *
 * El mensaje de error de validarEquivalencias repite esta cifra en formato español («1.000.000.000»): si cambias
 * este valor, actualiza también ese mensaje para que no se desincronicen.
 */
const VALOR_MAXIMO_MM_EN_MH = 1_000_000_000

/** Valor de 1 unidad de la moneda en hierro (mh), entero si las equivalencias son válidas (validarEquivalencias). Por defecto: mo = 100000, mm = 10000000, mh = 1. */
export function valorEnBase(moneda: Moneda, eq: Equivalencias): number {
  let valor = 1
  for (let i = MONEDAS.indexOf(moneda); i < CAMPOS.length; i++) {
    valor *= eq[CAMPOS[i]]
  }
  return valor
}

/**
 * Errores de validación (P1): cada equivalencia es un entero ≥ 2, y combinadas no pueden llevar 1
 * mithril por encima de VALOR_MAXIMO_MM_EN_MH hierro. Lista vacía si todo es válido.
 */
export function validarEquivalencias(eq: Equivalencias): string[] {
  const errores: string[] = []
  CAMPOS.forEach((campo, i) => {
    const valor = eq[campo]
    if (!Number.isInteger(valor) || valor < 2) {
      const nombre = NOMBRE_MONEDA[MONEDAS[i]].toLowerCase()
      errores.push(`La equivalencia de ${nombre} debe ser un número entero de 2 o más`)
    }
  })
  if (errores.length === 0 && valorEnBase('mm', eq) > VALOR_MAXIMO_MM_EN_MH) {
    errores.push(
      'Con estas equivalencias, 1 mithril vale demasiado hierro (más de 1.000.000.000 mh); reduce alguna equivalencia',
    )
  }
  return errores
}
