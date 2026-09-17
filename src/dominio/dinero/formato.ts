import { valorEnBase, type Equivalencias, type Moneda } from './monedas'

/** Signo menos de presentación (U+2212), no el guion. */
const SIGNO_MENOS = '−'

/** «1240» → «1.240»: separa los miles de una cadena de dígitos con punto, siempre desde 1.000. */
function agruparMiles(digitos: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Presenta numerador ÷ denominador (denominador > 0) con miles, coma decimal, hasta maxDecimales sin ceros finales
 * y «−» si es negativo. Todo en BigInt, sin coma flotante. Redondea la cifra sin signo con las mitades hacia arriba,
 * así +1,15 y −1,15 se ven igual de grandes («1,2» y «−1,2»). Lo que se redondea a 0 no lleva signo.
 */
function formatearFraccion(numerador: bigint, denominador: bigint, maxDecimales: number): string {
  const negativo = numerador < 0n
  const magnitud = negativo ? -numerador : numerador
  const escala = 10n ** BigInt(maxDecimales)
  const escalado = (2n * magnitud * escala + denominador) / (2n * denominador)
  const entera = agruparMiles((escalado / escala).toString())
  const decimales = (escalado % escala).toString().padStart(maxDecimales, '0').replace(/0+$/, '')
  const cifra = decimales === '' ? entera : `${entera},${decimales}`
  return negativo && escalado !== 0n ? `${SIGNO_MENOS}${cifra}` : cifra
}

/** Añade «+» a una cifra positiva; el cero y las negativas se quedan igual. */
function ponerMas(cifra: string, signo: boolean | undefined): string {
  return signo === true && cifra !== '0' && !cifra.startsWith(SIGNO_MENOS) ? `+${cifra}` : cifra
}

/** «46,518 mo», «0,6 mo», «1.200 mo». Todos los decimales necesarios, hasta la precisión del mh, sin ceros finales. Con signo: «+12 mo», «−0,6 mo»; el cero no lleva signo. */
export function formatearOro(
  base: number,
  eq: Equivalencias,
  opciones: { signo?: boolean; conUnidad?: boolean } = {},
): string {
  const valorOro = BigInt(valorEnBase('mo', eq))
  // Decimales para distinguir 1 mh: 100000 mh por mo → 5; 120000 → 6.
  const decimales = (valorOro - 1n).toString().length
  const cifra = ponerMas(formatearFraccion(BigInt(base), valorOro, decimales), opciones.signo)
  return opciones.conUnidad === false ? cifra : `${cifra} mo`
}

/** Cifras prorrateadas (al mes, balance): 1 decimal como mucho y sin ceros finales: «+12,9 mo», «−11,5 mo», «+44 mo». (§3) */
export function formatearOroProrrateado(base: number, eq: Equivalencias, opciones: { signo?: boolean } = {}): string {
  const valorOro = BigInt(valorEnBase('mo', eq))
  return `${ponerMas(formatearFraccion(BigInt(base), valorOro, 1), opciones.signo)} mo`
}

/** «6 mp», «0,5 mo»: la cantidad tal como se tecleó (con coma) y la abreviatura. */
export function formatearIntroducido(introducido: { cantidad: string; moneda: Moneda }): string {
  const [entera, decimales = ''] = introducido.cantidad.trim().split(/[.,]/)
  const enteraSinCeros = entera.replace(/^0+/, '') || '0'
  const cifra = agruparMiles(enteraSinCeros) + (decimales === '' ? '' : `,${decimales}`)
  return `${cifra} ${introducido.moneda}`
}

/**
 * Formato de número español: miles con «.» siempre desde 1.000, decimales con «,», «−» como signo; hasta maxDecimales,
 * sin ceros finales. Es la misma presentación que la de los importes (formatearFraccion), para números que no son dinero.
 */
export function formatearNumero(valor: number, maxDecimales: number): string {
  // Se parte de la cifra que escribe JavaScript («1.005», «5e-7»), no del binario de la coma flotante.
  const [mantisa, exponente = '0'] = Math.abs(valor).toString().split('e')
  const [entera, fraccion = ''] = mantisa.split('.')
  const digitos = BigInt(entera + fraccion) * (valor < 0 ? -1n : 1n)
  const decimalesEscritos = fraccion.length - Number(exponente)
  return decimalesEscritos >= 0
    ? formatearFraccion(digitos, 10n ** BigInt(decimalesEscritos), maxDecimales)
    : formatearFraccion(digitos * 10n ** BigInt(-decimalesEscritos), 1n, maxDecimales)
}
