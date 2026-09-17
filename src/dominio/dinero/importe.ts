import { valorEnBase, type Equivalencias, type Moneda } from './monedas'

/** Importe guardado: base entera en hierro (mh), con signo, y lo que tecleó el jugador, si lo tecleó (§3 y §8). */
export interface Importe {
  base: number
  introducido?: { cantidad: string; moneda: Moneda }
}

/** Decimales que admite una cantidad tecleada. */
const MAX_DECIMALES = 6

/** Parte entera y decimales de una cantidad sin signo, con coma o punto decimal. */
const PATRON_CANTIDAD = /^(\d*)(?:[.,](\d*))?$/

/** Redondeo al entero más cercano; las mitades, hacia arriba (+∞): 2,5 → 3; −2,5 → −2. (§3) */
export function redondearMitadArriba(valor: number): number {
  // Math.round ya lleva las mitades hacia +∞; el `+ 0` convierte −0 en 0.
  return Math.round(valor) + 0
}

/** numerador ÷ denominador (denominador > 0), redondeado al entero más cercano con las mitades hacia arriba (+∞), sin coma flotante. */
function dividirMitadArriba(numerador: bigint, denominador: bigint): bigint {
  const n = 2n * numerador + denominador
  const d = 2n * denominador
  const cociente = n / d
  // La división de BigInt corta hacia 0; con resto negativo, se baja uno para redondear hacia abajo.
  return n % d < 0n ? cociente - 1n : cociente
}

/**
 * Convierte el texto tecleado («6», «0,6», «12,345») en unidades base. Admite coma o punto decimal y como mucho
 * 6 decimales; sin signo; redondea al mh con las mitades hacia arriba. Error si el texto no es un número válido
 * o si el resultado no cabe exacto en un número de JavaScript: lanza Error('Cantidad no válida').
 *
 * Precondición: eq son equivalencias válidas (validarEquivalencias).
 */
export function aBase(cantidadTexto: string, moneda: Moneda, eq: Equivalencias): number {
  const partes = PATRON_CANTIDAD.exec(cantidadTexto.trim())
  if (partes === null) {
    throw new Error('Cantidad no válida')
  }
  const entera = partes[1]
  const decimales = partes[2] ?? ''
  if (entera.length + decimales.length === 0 || decimales.length > MAX_DECIMALES) {
    throw new Error('Cantidad no válida')
  }
  // «12,345» son 12345000 millonésimas; × valor de la moneda ÷ 1000000 = mh.
  const millonesimas = BigInt(entera + decimales.padEnd(MAX_DECIMALES, '0'))
  const base = dividirMitadArriba(millonesimas * BigInt(valorEnBase(moneda, eq)), 10n ** BigInt(MAX_DECIMALES))
  if (base > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Cantidad no válida')
  }
  return Number(base)
}

/** Importe con la base en mh y lo introducido, con la cantidad tal como se tecleó (sin espacios alrededor). */
export function importeDesde(cantidadTexto: string, moneda: Moneda, eq: Equivalencias): Importe {
  return {
    base: aBase(cantidadTexto, moneda, eq),
    introducido: { cantidad: cantidadTexto.trim(), moneda },
  }
}

/**
 * pct en tanto por ciento (10 = 10 %), con hasta 6 decimales; resultado redondeado al mh con las mitades hacia
 * arriba. (§7, impuestos de locales, intereses)
 *
 * Precondiciones: base es un entero en mh dentro de los enteros seguros (Number.isSafeInteger); pct es un número
 * finito, con hasta 6 decimales. Con porcentajes de 100 o menos, el resultado no supera la base.
 */
export function porcentajeDe(base: number, pct: number): number {
  // pct en millonésimas de punto: 12,25 % → 12250000. base × millonésimas ÷ (100 × 1000000).
  const millonesimas = BigInt(Math.round(pct * 1000000))
  return Number(dividirMitadArriba(BigInt(base) * millonesimas, 100000000n))
}
