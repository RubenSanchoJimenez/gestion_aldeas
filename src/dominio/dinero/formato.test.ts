import { describe, it, expect } from 'vitest'
import { formatearIntroducido, formatearNumero, formatearOro, formatearOroProrrateado } from './formato'
import { aBase } from './importe'
import { EQUIVALENCIAS_POR_DEFECTO, type Equivalencias } from './monedas'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** 1 mm = 50 mo y 1 mo = 12 mp: 1 mo vale 120000 mh y 1 mh es 1/120000 mo. */
const PERSONALIZADAS: Equivalencias = {
  mmEnMo: 50,
  moEnMp: 12,
  mpEnMb: 10,
  mbEnMc: 10,
  mcEnMe: 10,
  meEnMh: 10,
}

describe('formatearNumero', () => {
  it('separa los miles con punto siempre desde 1.000', () => {
    expect(formatearNumero(999, 0)).toBe('999')
    expect(formatearNumero(1000, 0)).toBe('1.000')
    expect(formatearNumero(1240, 0)).toBe('1.240')
    expect(formatearNumero(1234567.891, 2)).toBe('1.234.567,89')
  })

  it('usa coma decimal y quita los ceros finales', () => {
    expect(formatearNumero(3.72, 1)).toBe('3,7')
    expect(formatearNumero(2.5, 4)).toBe('2,5')
    expect(formatearNumero(2, 4)).toBe('2')
    expect(formatearNumero(9.99, 1)).toBe('10')
    expect(formatearNumero(41.333, 0)).toBe('41')
  })

  it('usa el signo menos tipográfico (U+2212)', () => {
    expect(formatearNumero(-3.72, 1)).toBe('−3,7')
    expect(formatearNumero(-3.72, 1).codePointAt(0)).toBe(0x2212)
    expect(formatearNumero(-1240, 0)).toBe('−1.240')
  })

  it('no pone signo a lo que se redondea a 0', () => {
    expect(formatearNumero(-0.04, 1)).toBe('0')
    expect(formatearNumero(-0, 1)).toBe('0')
    expect(formatearNumero(0.4, 0)).toBe('0')
  })

  it('redondea las mitades de la cifra escrita hacia arriba, sin errores de coma flotante', () => {
    expect((1.005).toFixed(2)).toBe('1.00')
    expect(formatearNumero(1.005, 2)).toBe('1,01')
    expect(formatearNumero(1.15, 1)).toBe('1,2')
    expect(formatearNumero(-1.15, 1)).toBe('−1,2')
  })

  it('escribe entero lo que JavaScript expresa con exponente', () => {
    expect(formatearNumero(0.0000005, 7)).toBe('0,0000005')
    expect(formatearNumero(1e21, 0)).toBe('1.000.000.000.000.000.000.000')
    expect(formatearNumero(1.5e-7, 8)).toBe('0,00000015')
  })
})

describe('formatearOro', () => {
  it('muestra los importes del ejemplo en oro', () => {
    expect(formatearOro(4651800, EQ)).toBe('46,518 mo')
    expect(formatearOro(120000000, EQ)).toBe('1.200 mo')
    expect(formatearOro(1800000, EQ)).toBe('18 mo')
  })

  it('muestra 6 mp como 0,6 mo', () => {
    expect(formatearOro(aBase('6', 'mp', EQ), EQ)).toBe('0,6 mo')
  })

  it('muestra la bolsa inicial del ejemplo: 40,918 mo', () => {
    const bolsa = aBase('38', 'mo', EQ) + aBase('25', 'mp', EQ) + aBase('40', 'mb', EQ) + aBase('18', 'mc', EQ)
    expect(formatearOro(bolsa, EQ)).toBe('40,918 mo')
  })

  it('muestra todos los decimales hasta el mh', () => {
    expect(formatearOro(1, EQ)).toBe('0,00001 mo')
    expect(formatearOro(4651801, EQ)).toBe('46,51801 mo')
  })

  it('pone signo solo si se pide, y nunca al cero', () => {
    expect(formatearOro(-60000, EQ, { signo: true })).toBe('−0,6 mo')
    expect(formatearOro(1200000, EQ, { signo: true })).toBe('+12 mo')
    expect(formatearOro(0, EQ, { signo: true })).toBe('0 mo')
    expect(formatearOro(1200000, EQ)).toBe('12 mo')
  })

  it('muestra siempre el menos de un importe negativo', () => {
    expect(formatearOro(-60000, EQ)).toBe('−0,6 mo')
  })

  it('omite la unidad si se pide', () => {
    expect(formatearOro(4651800, EQ, { conUnidad: false })).toBe('46,518')
    expect(formatearOro(-60000, EQ, { signo: true, conUnidad: false })).toBe('−0,6')
  })

  it('es exacto con el mayor entero seguro', () => {
    expect(formatearOro(Number.MAX_SAFE_INTEGER, EQ)).toBe('90.071.992.547,40991 mo')
    expect(formatearOro(6907618817547915, EQ)).toBe('69.076.188.175,47915 mo')
  })

  it('con equivalencias en las que 1 mh no es un decimal exacto, usa los decimales que distinguen cada mh', () => {
    expect(formatearOro(60000, PERSONALIZADAS)).toBe('0,5 mo')
    expect(formatearOro(10000, PERSONALIZADAS)).toBe('0,083333 mo')
    expect(formatearOro(1, PERSONALIZADAS)).toBe('0,000008 mo')
    expect(formatearOro(2, PERSONALIZADAS)).toBe('0,000017 mo')
  })
})

describe('formatearOroProrrateado', () => {
  it('muestra las cifras prorrateadas de Bree con 1 decimal como mucho', () => {
    expect(formatearOroProrrateado(1285714, EQ, { signo: true })).toBe('+12,9 mo')
    expect(formatearOroProrrateado(1800000, EQ)).toBe('18 mo')
    expect(formatearOroProrrateado(3925714, EQ)).toBe('39,3 mo')
    expect(formatearOroProrrateado(4395714, EQ, { signo: true })).toBe('+44 mo')
    expect(formatearOroProrrateado(-1147143, EQ, { signo: true })).toBe('−11,5 mo')
  })

  it('redondea las mitades de la cifra hacia arriba, con el mismo tamaño en positivo y en negativo', () => {
    expect(formatearOroProrrateado(115000, EQ)).toBe('1,2 mo')
    expect(formatearOroProrrateado(-115000, EQ)).toBe('−1,2 mo')
  })

  it('no pone signo a lo que se redondea a 0', () => {
    expect(formatearOroProrrateado(4000, EQ, { signo: true })).toBe('0 mo')
    expect(formatearOroProrrateado(-4000, EQ, { signo: true })).toBe('0 mo')
    expect(formatearOroProrrateado(0, EQ, { signo: true })).toBe('0 mo')
  })
})

describe('formatearIntroducido', () => {
  it('muestra la cantidad tecleada y la abreviatura', () => {
    expect(formatearIntroducido({ cantidad: '6', moneda: 'mp' })).toBe('6 mp')
    expect(formatearIntroducido({ cantidad: '0,5', moneda: 'mo' })).toBe('0,5 mo')
    expect(formatearIntroducido({ cantidad: '12,345', moneda: 'mo' })).toBe('12,345 mo')
  })

  it('cambia el punto decimal por coma', () => {
    expect(formatearIntroducido({ cantidad: '0.5', moneda: 'mo' })).toBe('0,5 mo')
  })

  it('conserva los decimales tecleados, también los ceros finales', () => {
    expect(formatearIntroducido({ cantidad: '0,50', moneda: 'mo' })).toBe('0,50 mo')
    expect(formatearIntroducido({ cantidad: '1234,5', moneda: 'mo' })).toBe('1.234,5 mo')
  })

  it('separa los miles y quita los ceros de la izquierda y el separador sin decimales', () => {
    expect(formatearIntroducido({ cantidad: '1200', moneda: 'mp' })).toBe('1.200 mp')
    expect(formatearIntroducido({ cantidad: '007', moneda: 'mb' })).toBe('7 mb')
    expect(formatearIntroducido({ cantidad: ',5', moneda: 'mo' })).toBe('0,5 mo')
    expect(formatearIntroducido({ cantidad: '6,', moneda: 'mp' })).toBe('6 mp')
  })
})
