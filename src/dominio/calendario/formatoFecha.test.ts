import { describe, it, expect } from 'vitest'
import type { Fecha } from './fecha'
import {
  ABREVIATURA_EDAD,
  formatearDiaCercano,
  formatearDiaDelAvance,
  formatearDiaMes,
  formatearFecha,
  formatearMeses,
  formatearTramoDelAvance,
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

describe('formatearMeses', () => {
  it('un mes: «abril»', () => {
    expect(formatearMeses([{ anio: 1640, mes: 4 }])).toBe('abril')
  })

  it('dos meses: «marzo y abril» (§9)', () => {
    expect(formatearMeses([{ anio: 1640, mes: 3 }, { anio: 1640, mes: 4 }])).toBe('marzo y abril')
  })

  it('tres o más: «enero, febrero y marzo»', () => {
    const tres = [
      { anio: 1640, mes: 1 },
      { anio: 1640, mes: 2 },
      { anio: 1640, mes: 3 },
    ]
    expect(formatearMeses(tres)).toBe('enero, febrero y marzo')
    expect(formatearMeses([...tres, { anio: 1640, mes: 4 }])).toBe('enero, febrero, marzo y abril')
  })

  it('si cruzan de año, cada mes con el suyo: «diciembre de 1639 y enero de 1640»', () => {
    expect(formatearMeses([{ anio: 1639, mes: 12 }, { anio: 1640, mes: 1 }])).toBe('diciembre de 1639 y enero de 1640')
    expect(
      formatearMeses([
        { anio: 1639, mes: 11 },
        { anio: 1639, mes: 12 },
        { anio: 1640, mes: 1 },
      ]),
    ).toBe('noviembre de 1639, diciembre de 1639 y enero de 1640')
  })

  it('un mes suelto de otro año va sin el año, y sin meses el texto queda vacío', () => {
    expect(formatearMeses([{ anio: 1639, mes: 12 }])).toBe('diciembre')
    expect(formatearMeses([])).toBe('')
  })
})

describe('formatearDiaCercano', () => {
  it('«19 de julio» si es del año de hoy (§9: «del 19 de julio»)', () => {
    expect(formatearDiaCercano(f(1640, 7, 19), f(1640, 4, 12))).toBe('19 de julio')
    expect(formatearDiaCercano(f(1640, 4, 12), f(1640, 4, 12))).toBe('12 de abril')
  })

  it('«19 de enero de 1641» si es de otro año, antes o después', () => {
    expect(formatearDiaCercano(f(1641, 1, 19), f(1640, 4, 12))).toBe('19 de enero de 1641')
    expect(formatearDiaCercano(f(1639, 12, 20), f(1640, 4, 12))).toBe('20 de diciembre de 1639')
  })
})

describe('formatearDiaDelAvance', () => {
  it('si el avance cae en un mes, solo el día: «19» (P5)', () => {
    expect(formatearDiaDelAvance(f(1640, 4, 19), f(1640, 4, 13), f(1640, 4, 19))).toBe('19')
    expect(formatearDiaDelAvance(f(1640, 4, 13), f(1640, 4, 13), f(1640, 4, 19))).toBe('13')
  })

  it('si cae en un año pero en varios meses, el día y el mes: «19 de mayo»', () => {
    expect(formatearDiaDelAvance(f(1640, 5, 19), f(1640, 4, 13), f(1640, 7, 19))).toBe('19 de mayo')
    expect(formatearDiaDelAvance(f(1640, 4, 18), f(1640, 4, 13), f(1640, 5, 1))).toBe('18 de abril')
  })

  it('si cruza de año, con el año: «19 de abril de 1641»', () => {
    expect(formatearDiaDelAvance(f(1641, 4, 19), f(1640, 4, 20), f(1641, 4, 20))).toBe('19 de abril de 1641')
    expect(formatearDiaDelAvance(f(1640, 12, 25), f(1640, 4, 20), f(1641, 4, 20))).toBe('25 de diciembre de 1640')
  })
})

describe('formatearTramoDelAvance', () => {
  it('un día (desde = hasta): usa formatearDiaDelAvance, «17»', () => {
    expect(formatearTramoDelAvance(f(1640, 4, 17), f(1640, 4, 17), f(1640, 4, 13), f(1640, 4, 19))).toBe('17')
  })

  it('mismo mes y año en las cuatro fechas: «15 al 17»', () => {
    expect(formatearTramoDelAvance(f(1640, 4, 15), f(1640, 4, 17), f(1640, 4, 13), f(1640, 4, 19))).toBe('15 al 17')
  })

  it('mismo año y mes del tramo, pero el avance cae en varios meses: «15 al 17 de abril»', () => {
    expect(formatearTramoDelAvance(f(1640, 4, 15), f(1640, 4, 17), f(1640, 4, 13), f(1640, 5, 1))).toBe(
      '15 al 17 de abril',
    )
  })

  it('mismo año, meses distintos del tramo: «28 de abril al 2 de mayo»', () => {
    expect(formatearTramoDelAvance(f(1640, 4, 28), f(1640, 5, 2), f(1640, 4, 13), f(1640, 5, 2))).toBe(
      '28 de abril al 2 de mayo',
    )
  })

  it('un tramo que empezó el mes anterior a un avance de un solo mes: «25 de abril al 3 de mayo»', () => {
    expect(formatearTramoDelAvance(f(1640, 4, 25), f(1640, 5, 3), f(1640, 5, 1), f(1640, 5, 31))).toBe(
      '25 de abril al 3 de mayo',
    )
  })

  it('el avance cruza de año: «8 al 21 de abril de 1640» y «28 de diciembre de 1640 al 2 de enero de 1641»', () => {
    expect(formatearTramoDelAvance(f(1640, 4, 8), f(1640, 4, 21), f(1640, 4, 20), f(1641, 4, 20))).toBe(
      '8 al 21 de abril de 1640',
    )
    expect(formatearTramoDelAvance(f(1640, 12, 28), f(1641, 1, 2), f(1640, 4, 20), f(1641, 4, 20))).toBe(
      '28 de diciembre de 1640 al 2 de enero de 1641',
    )
  })
})
