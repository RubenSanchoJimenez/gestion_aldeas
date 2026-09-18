import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import {
  DIAS_CON_AVISO,
  DIAS_MAXIMOS_DE_AVANCE,
  FECHA_MAXIMA,
  diasHasta,
  diasQueCaben,
  errorDeDiasDeAvance,
} from './dias'

/** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** El penúltimo y el último día que la app sabe representar. */
const PENULTIMO: Fecha = { anio: 9999, mes: 12, dia: 30 }
const ULTIMO: Fecha = { anio: 9999, mes: 12, dia: 31 }

describe('constantes de avance/dias', () => {
  it('van de 1 a 366 días, avisan por encima de 90 y acaban el 31 de diciembre de 9999', () => {
    expect(DIAS_MAXIMOS_DE_AVANCE).toBe(366)
    expect(DIAS_CON_AVISO).toBe(90)
    expect(FECHA_MAXIMA).toEqual(ULTIMO)
  })
})

describe('errorDeDiasDeAvance', () => {
  it('admite de 1 a 366 días', () => {
    expect(errorDeDiasDeAvance(HOY, 1)).toBeNull()
    expect(errorDeDiasDeAvance(HOY, 90)).toBeNull()
    expect(errorDeDiasDeAvance(HOY, 366)).toBeNull()
  })

  it('rechaza 0, los negativos y más de 366 (§9 l.1323)', () => {
    for (const dias of [0, -1, 367, 1000]) {
      expect(errorDeDiasDeAvance(HOY, dias)).toBe('Los días de un avance van de 1 a 366')
    }
  })

  it('rechaza lo que no es un número entero de días', () => {
    for (const dias of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(errorDeDiasDeAvance(HOY, dias)).toBe('Los días de un avance van de 1 a 366')
    }
  })

  it('no deja pasar del 31 de diciembre de 9999 (§9 l.1324)', () => {
    expect(errorDeDiasDeAvance(PENULTIMO, 1)).toBeNull()
    expect(errorDeDiasDeAvance(PENULTIMO, 2)).toBe('No se puede avanzar más allá del 31 de diciembre de 9999')
    expect(errorDeDiasDeAvance(ULTIMO, 1)).toBe('No se puede avanzar más allá del 31 de diciembre de 9999')
  })
})

describe('diasHasta y diasQueCaben', () => {
  it('diasHasta da los días hasta la fecha de destino de «Otro…» (T22)', () => {
    expect(diasHasta(HOY, { anio: 1640, mes: 4, dia: 19 })).toBe(7)
    expect(diasHasta(HOY, { anio: 1641, mes: 4, dia: 13 })).toBe(366)
    expect(diasHasta(HOY, HOY)).toBe(0)
    expect(errorDeDiasDeAvance(HOY, diasHasta(HOY, HOY))).toBe('Los días de un avance van de 1 a 366')
  })

  it('diasQueCaben no recorta una previsión que cabe', () => {
    expect(diasQueCaben(HOY, 7)).toBe(7)
    expect(diasQueCaben(HOY, 366)).toBe(366)
  })

  it('diasQueCaben recorta en el 31 de diciembre de 9999 (§9 l.1322)', () => {
    expect(diasQueCaben(PENULTIMO, 366)).toBe(1)
    expect(diasQueCaben(ULTIMO, 7)).toBe(0)
  })
})
