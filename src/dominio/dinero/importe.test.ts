import { describe, it, expect } from 'vitest'
import { aBase, importeDesde, porcentajeDe, redondearMitadArriba } from './importe'
import { EQUIVALENCIAS_POR_DEFECTO, type Equivalencias } from './monedas'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** 1 mm = 50 mo y 1 mo = 12 mp: 1 mo vale 120000 mh. */
const PERSONALIZADAS: Equivalencias = {
  mmEnMo: 50,
  moEnMp: 12,
  mpEnMb: 10,
  mbEnMc: 10,
  mcEnMe: 10,
  meEnMh: 10,
}

describe('redondearMitadArriba', () => {
  it('redondea al entero más cercano', () => {
    expect(redondearMitadArriba(2.4)).toBe(2)
    expect(redondearMitadArriba(2.6)).toBe(3)
    expect(redondearMitadArriba(-2.4)).toBe(-2)
    expect(redondearMitadArriba(-2.6)).toBe(-3)
    expect(redondearMitadArriba(1285714.2857142857)).toBe(1285714)
  })

  it('lleva las mitades hacia arriba, también en negativo', () => {
    expect(redondearMitadArriba(2.5)).toBe(3)
    expect(redondearMitadArriba(-2.5)).toBe(-2)
    expect(redondearMitadArriba(0.5)).toBe(1)
  })

  it('no sube el número de coma flotante más cercano a 0,5 por debajo', () => {
    expect(redondearMitadArriba(0.49999999999999994)).toBe(0)
  })

  it('devuelve 0 y no −0', () => {
    expect(redondearMitadArriba(-0.4)).toBe(0)
  })
})

describe('aBase', () => {
  it('convierte lo tecleado en hierro (mh)', () => {
    expect(aBase('6', 'mp', EQ)).toBe(60000)
    expect(aBase('12,345', 'mo', EQ)).toBe(1234500)
    expect(aBase('1', 'mm', EQ)).toBe(10000000)
    expect(aBase('18', 'mc', EQ)).toBe(1800)
    expect(aBase('7', 'mh', EQ)).toBe(7)
    expect(aBase('0', 'mo', EQ)).toBe(0)
  })

  it('admite punto decimal además de coma', () => {
    expect(aBase('12.345', 'mo', EQ)).toBe(1234500)
    expect(aBase('0.6', 'mo', EQ)).toBe(60000)
  })

  it('admite espacios alrededor, un separador sin decimales y decimales sin parte entera', () => {
    expect(aBase(' 6 ', 'mp', EQ)).toBe(60000)
    expect(aBase('6,', 'mp', EQ)).toBe(60000)
    expect(aBase(',5', 'mo', EQ)).toBe(50000)
  })

  it('redondea al mh más cercano, con las mitades hacia arriba', () => {
    expect(aBase('0,000015', 'mo', EQ)).toBe(2)
    expect(aBase('0,000014', 'mo', EQ)).toBe(1)
    expect(aBase('0,5', 'mh', EQ)).toBe(1)
    expect(aBase('0,4', 'mh', EQ)).toBe(0)
  })

  it('admite 6 decimales', () => {
    expect(aBase('1,000001', 'mm', EQ)).toBe(10000010)
    expect(aBase('0,000001', 'mo', EQ)).toBe(0)
  })

  it('suma la bolsa inicial del ejemplo: 38 mo + 25 mp + 40 mb + 18 mc = 4091800 mh', () => {
    const bolsa = aBase('38', 'mo', EQ) + aBase('25', 'mp', EQ) + aBase('40', 'mb', EQ) + aBase('18', 'mc', EQ)
    expect(bolsa).toBe(4091800)
  })

  it('suma sin errores de coma flotante', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(aBase('0,1', 'mo', EQ) + aBase('0,2', 'mo', EQ)).toBe(30000)
  })

  it('usa las equivalencias de la partida', () => {
    expect(aBase('1', 'mo', PERSONALIZADAS)).toBe(120000)
    expect(aBase('0,5', 'mm', PERSONALIZADAS)).toBe(3000000)
  })

  it('llega exacto hasta el mayor entero seguro y rechaza lo que pasa de ahí', () => {
    expect(aBase('90071992547,40991', 'mo', EQ)).toBe(Number.MAX_SAFE_INTEGER)
    expect(() => aBase('90071992547,40992', 'mo', EQ)).toThrow('Cantidad no válida')
  })

  it.each([
    '',
    '   ',
    ',',
    'abc',
    '6 mp',
    '1,2,3',
    '1.234,5',
    '-5',
    '+5',
    '1e3',
    '12,3456789',
    '0,0000001',
  ])('rechaza «%s»', (texto) => {
    expect(() => aBase(texto, 'mo', EQ)).toThrow('Cantidad no válida')
  })
})

describe('importeDesde', () => {
  it('guarda la base en mh y lo introducido', () => {
    expect(importeDesde('6', 'mp', EQ)).toEqual({
      base: 60000,
      introducido: { cantidad: '6', moneda: 'mp' },
    })
  })

  it('guarda la cantidad tal como se tecleó, sin los espacios de alrededor', () => {
    expect(importeDesde(' 0.5 ', 'mo', EQ)).toEqual({
      base: 50000,
      introducido: { cantidad: '0.5', moneda: 'mo' },
    })
  })

  it('lanza el error de aBase si la cantidad no es válida', () => {
    expect(() => importeDesde('seis', 'mp', EQ)).toThrow('Cantidad no válida')
  })
})

describe('porcentajeDe', () => {
  it('calcula el impuesto de la Herrería 1: 10 % de 10 mo = 1 mo', () => {
    expect(porcentajeDe(1000000, 10)).toBe(100000)
  })

  it('calcula el 5 % de 1,5 mo = 0,075 mo', () => {
    expect(porcentajeDe(150000, 5)).toBe(7500)
  })

  it('admite porcentajes con decimales', () => {
    expect(porcentajeDe(1000000, 12.25)).toBe(122500)
    expect(porcentajeDe(100000000, 0.000001)).toBe(1)
  })

  it('redondea al mh con las mitades hacia arriba', () => {
    expect(porcentajeDe(5, 10)).toBe(1)
    expect(porcentajeDe(4, 10)).toBe(0)
    expect(porcentajeDe(-25, 10)).toBe(-2)
    expect(porcentajeDe(-26, 10)).toBe(-3)
    expect(porcentajeDe(-24, 10)).toBe(-2)
  })

  it('es exacto donde la coma flotante falla', () => {
    // 375 × 9,2 % = 34,5 mh, pero en coma flotante da 34,49999999999999.
    expect((375 * 9.2) / 100).not.toBe(34.5)
    expect(porcentajeDe(375, 9.2)).toBe(35)
    // 9007199254740991 × 99,99 % = 9006298534815516,9009 mh.
    expect(porcentajeDe(9007199254740991, 99.99)).toBe(9006298534815517)
  })

  it('devuelve 0 con base 0 o porcentaje 0', () => {
    expect(porcentajeDe(0, 10)).toBe(0)
    expect(porcentajeDe(1000000, 0)).toBe(0)
  })
})
