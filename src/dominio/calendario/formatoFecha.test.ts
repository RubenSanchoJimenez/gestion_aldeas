import { describe, it, expect } from 'vitest'
import type { Fecha } from './fecha'
import {
  ABREVIATURA_EDAD,
  formatearDiaMes,
  formatearFecha,
  NOMBRES_DIA,
  NOMBRES_MES,
} from './formatoFecha'

/** Atajo para escribir fechas en las pruebas: f(1640, 4, 12) es el 12 de abril de 1640. */
function f(anio: number, mes: number, dia: number): Fecha {
  return { anio, mes, dia }
}

describe('nombres y abreviaturas', () => {
  it('abrevia las tres Edades como S.E., T.E. y C.E.', () => {
    expect(ABREVIATURA_EDAD).toEqual({ segunda: 'S.E.', tercera: 'T.E.', cuarta: 'C.E.' })
  })

  it('nombra los doce meses en minúscula, de enero a diciembre', () => {
    expect(NOMBRES_MES).toEqual([
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ])
  })

  it('nombra los siete días en minúscula y con tildes, de lunes a domingo', () => {
    expect(NOMBRES_DIA).toEqual(['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'])
  })
})

describe('formatearFecha', () => {
  it('«12 de abril de 1640 T.E.» con la Edad', () => {
    expect(formatearFecha(f(1640, 4, 12), { edad: 'tercera' })).toBe('12 de abril de 1640 T.E.')
  })

  it('«jueves, 12 de abril de 1640 T.E.» con la Edad y el día de la semana', () => {
    expect(formatearFecha(f(1640, 4, 12), { edad: 'tercera', diaSemana: true })).toBe(
      'jueves, 12 de abril de 1640 T.E.',
    )
  })

  it('«12 de abril de 1640» sin opciones, con opciones vacías o con diaSemana false', () => {
    expect(formatearFecha(f(1640, 4, 12))).toBe('12 de abril de 1640')
    expect(formatearFecha(f(1640, 4, 12), {})).toBe('12 de abril de 1640')
    expect(formatearFecha(f(1640, 4, 12), { diaSemana: false })).toBe('12 de abril de 1640')
  })

  it('«jueves, 12 de abril de 1640» con el día de la semana y sin Edad', () => {
    expect(formatearFecha(f(1640, 4, 12), { diaSemana: true })).toBe('jueves, 12 de abril de 1640')
  })

  it('la fecha inicial del ejemplo: «domingo, 1 de enero de 1640 T.E.»', () => {
    expect(formatearFecha(f(1640, 1, 1), { edad: 'tercera', diaSemana: true })).toBe(
      'domingo, 1 de enero de 1640 T.E.',
    )
  })

  it('usa la abreviatura de la Segunda y de la Cuarta Edad', () => {
    expect(formatearFecha(f(3441, 10, 5), { edad: 'segunda' })).toBe('5 de octubre de 3441 S.E.')
    expect(formatearFecha(f(1, 3, 1), { edad: 'cuarta' })).toBe('1 de marzo de 1 C.E.')
  })

  it('el día va sin cero delante y el año sin separador de miles', () => {
    expect(formatearFecha(f(1640, 5, 1))).toBe('1 de mayo de 1640')
    expect(formatearFecha(f(2000, 2, 29))).toBe('29 de febrero de 2000')
  })

  it.each([
    [9, 'lunes'],
    [10, 'martes'],
    [11, 'miércoles'],
    [12, 'jueves'],
    [13, 'viernes'],
    [14, 'sábado'],
    [15, 'domingo'],
  ])('el %i de abril de 1640 es %s', (dia, nombre) => {
    expect(formatearFecha(f(1640, 4, dia), { diaSemana: true })).toBe(`${nombre}, ${dia} de abril de 1640`)
  })
})

describe('formatearDiaMes', () => {
  it('«12 de abril», sin año ni Edad', () => {
    expect(formatearDiaMes(f(1640, 4, 12))).toBe('12 de abril')
  })

  it('«1 de mayo», «29 de febrero» y «31 de diciembre»', () => {
    expect(formatearDiaMes(f(1640, 5, 1))).toBe('1 de mayo')
    expect(formatearDiaMes(f(1640, 2, 29))).toBe('29 de febrero')
    expect(formatearDiaMes(f(1640, 12, 31))).toBe('31 de diciembre')
  })
})
