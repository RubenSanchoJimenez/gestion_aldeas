import { describe, it, expect } from 'vitest'
import {
  EQUIVALENCIAS_POR_DEFECTO,
  MONEDAS,
  NOMBRE_MONEDA,
  validarEquivalencias,
  valorEnBase,
  type Equivalencias,
} from './monedas'

/** Equivalencias personalizadas: 1 mm = 50 mo y 1 mo = 12 mp; el resto, por defecto. */
const PERSONALIZADAS: Equivalencias = {
  mmEnMo: 50,
  moEnMp: 12,
  mpEnMb: 10,
  mbEnMc: 10,
  mcEnMe: 10,
  meEnMh: 10,
}

describe('monedas', () => {
  it('ordena las monedas de la más valiosa al hierro', () => {
    expect(MONEDAS).toEqual(['mm', 'mo', 'mp', 'mb', 'mc', 'me', 'mh'])
  })

  it('da el nombre de cada moneda', () => {
    expect(NOMBRE_MONEDA).toEqual({
      mm: 'Mithril',
      mo: 'Oro',
      mp: 'Plata',
      mb: 'Bronce',
      mc: 'Cobre',
      me: 'Estaño',
      mh: 'Hierro',
    })
  })

  it('usa las equivalencias por defecto de la especificación (§3)', () => {
    expect(EQUIVALENCIAS_POR_DEFECTO).toEqual({
      mmEnMo: 100,
      moEnMp: 10,
      mpEnMb: 10,
      mbEnMc: 10,
      mcEnMe: 10,
      meEnMh: 10,
    })
  })
})

describe('valorEnBase', () => {
  it('da el valor de 1 unidad en hierro con las equivalencias por defecto', () => {
    expect(valorEnBase('mm', EQUIVALENCIAS_POR_DEFECTO)).toBe(10000000)
    expect(valorEnBase('mo', EQUIVALENCIAS_POR_DEFECTO)).toBe(100000)
    expect(valorEnBase('mp', EQUIVALENCIAS_POR_DEFECTO)).toBe(10000)
    expect(valorEnBase('mb', EQUIVALENCIAS_POR_DEFECTO)).toBe(1000)
    expect(valorEnBase('mc', EQUIVALENCIAS_POR_DEFECTO)).toBe(100)
    expect(valorEnBase('me', EQUIVALENCIAS_POR_DEFECTO)).toBe(10)
    expect(valorEnBase('mh', EQUIVALENCIAS_POR_DEFECTO)).toBe(1)
  })

  it('multiplica las equivalencias de la partida desde la moneda hasta el hierro', () => {
    expect(valorEnBase('mm', PERSONALIZADAS)).toBe(6000000)
    expect(valorEnBase('mo', PERSONALIZADAS)).toBe(120000)
    expect(valorEnBase('mp', PERSONALIZADAS)).toBe(10000)
    expect(valorEnBase('mh', PERSONALIZADAS)).toBe(1)
  })
})

describe('validarEquivalencias', () => {
  it('acepta las equivalencias por defecto y las personalizadas', () => {
    expect(validarEquivalencias(EQUIVALENCIAS_POR_DEFECTO)).toEqual([])
    expect(validarEquivalencias(PERSONALIZADAS)).toEqual([])
  })

  it('acepta 2, el mínimo', () => {
    expect(
      validarEquivalencias({ mmEnMo: 2, moEnMp: 2, mpEnMb: 2, mbEnMc: 2, mcEnMe: 2, meEnMh: 2 }),
    ).toEqual([])
  })

  it('rechaza una equivalencia menor que 2', () => {
    expect(validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, mmEnMo: 1 })).toEqual([
      'La equivalencia de mithril debe ser un número entero de 2 o más',
    ])
    expect(validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, meEnMh: 0 })).toEqual([
      'La equivalencia de estaño debe ser un número entero de 2 o más',
    ])
    expect(validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, mbEnMc: -10 })).toEqual([
      'La equivalencia de bronce debe ser un número entero de 2 o más',
    ])
  })

  it('rechaza una equivalencia que no es un número entero', () => {
    expect(validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, moEnMp: 2.5 })).toEqual([
      'La equivalencia de oro debe ser un número entero de 2 o más',
    ])
    expect(validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, mpEnMb: Number.NaN })).toEqual([
      'La equivalencia de plata debe ser un número entero de 2 o más',
    ])
    expect(
      validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, mcEnMe: Number.POSITIVE_INFINITY }),
    ).toEqual(['La equivalencia de cobre debe ser un número entero de 2 o más'])
  })

  it('devuelve todos los errores en el orden de las monedas', () => {
    expect(
      validarEquivalencias({ mmEnMo: 100, moEnMp: 1, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 1.5 }),
    ).toEqual([
      'La equivalencia de oro debe ser un número entero de 2 o más',
      'La equivalencia de estaño debe ser un número entero de 2 o más',
    ])
  })

  it('acepta unas equivalencias que llevan 1 mithril justo al límite de hierro', () => {
    expect(validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, mmEnMo: 10000 })).toEqual([])
  })

  it('rechaza unas equivalencias que llevan 1 mithril justo por encima del límite de hierro', () => {
    expect(validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, mmEnMo: 10001 })).toEqual([
      'Con estas equivalencias, 1 mithril vale demasiado hierro (más de 1.000.000.000 mh); reduce alguna equivalencia',
    ])
  })

  it('rechaza equivalencias que, sin exceder el límite cada una por separado, se disparan al multiplicarse', () => {
    expect(
      validarEquivalencias({ mmEnMo: 1000, moEnMp: 1000, mpEnMb: 1000, mbEnMc: 1000, mcEnMe: 1000, meEnMh: 1000 }),
    ).toEqual([
      'Con estas equivalencias, 1 mithril vale demasiado hierro (más de 1.000.000.000 mh); reduce alguna equivalencia',
    ])
  })
})
