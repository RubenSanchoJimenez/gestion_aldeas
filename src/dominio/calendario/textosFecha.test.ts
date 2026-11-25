import { describe, expect, it } from 'vitest'
import { conMayuscula, formatearFechaConDia, leerFechaEscrita, nombreDelDia } from './textosFecha'

describe('textos de fecha', () => {
  it('día de la semana sin coma, con y sin edad', () => {
    expect(formatearFechaConDia({ anio: 1640, mes: 1, dia: 1 }, 'tercera')).toBe('domingo 1 de enero de 1640 T.E.')
    expect(formatearFechaConDia({ anio: 1640, mes: 1, dia: 1 })).toBe('domingo 1 de enero de 1640')
  })

  it('el día con mayúscula', () => {
    expect(nombreDelDia({ anio: 1640, mes: 4, dia: 12 })).toBe('Jueves')
    expect(conMayuscula('')).toBe('')
  })

  it('lee una fecha escrita sin validarla', () => {
    expect(leerFechaEscrita(' 1/4/1640 ')).toEqual({ anio: 1640, mes: 4, dia: 1 })
    expect(leerFechaEscrita('31/04/1640')).toEqual({ anio: 1640, mes: 4, dia: 31 })
    for (const mal of ['19-04-1640', 'hola', '', '1/1/12345']) {
      expect(leerFechaEscrita(mal)).toBeNull()
    }
  })
})
