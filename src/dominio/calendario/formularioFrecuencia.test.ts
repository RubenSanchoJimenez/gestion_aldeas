import { describe, expect, it } from 'vitest'
import { conDiaMes, conN, erroresDeFrecuencia, frecuenciaInicial, proximaFecha } from './formularioFrecuencia'

const HOY = { anio: 1640, mes: 4, dia: 12 }
const f = (dia: number, mes: number, anio = 1640) => ({ anio, mes, dia })

describe('formulario de frecuencia', () => {
  it('valores de partida', () => {
    expect(frecuenciaInicial('cadaNDias', HOY)).toEqual({ tipo: 'cadaNDias', n: 2, primera: f(14, 4) })
    expect(frecuenciaInicial('trimestral', HOY)).toEqual({ tipo: 'trimestral', diaMes: 12, primera: f(12, 7) })
    expect(frecuenciaInicial('semanal', HOY)).toEqual({ tipo: 'semanal', diaSemana: 3 })
    expect(frecuenciaInicial('unica', HOY)).toEqual({ tipo: 'unica', fecha: f(13, 4) })
    expect(frecuenciaInicial('trimestral', f(31, 1))).toMatchObject({ primera: f(30, 4) })
  })

  it('conserva el día del mes y recalcula «Primera vez»', () => {
    const cada2 = conDiaMes(frecuenciaInicial('cadaNMeses', HOY), 15, HOY)
    expect(cada2).toMatchObject({ primera: f(15, 6) })
    expect(frecuenciaInicial('mensual', HOY, cada2)).toEqual({ tipo: 'mensual', diaMes: 15 })
    expect(conN(frecuenciaInicial('cadaNDias', HOY), 30, HOY)).toMatchObject({ primera: f(12, 5) })
  })

  it('reparte los errores por campo', () => {
    expect(erroresDeFrecuencia({ tipo: 'cadaNMeses', n: 13, diaMes: 15, primera: f(15, 6) }, HOY, 'tercera').n).toBe(
      'N debe ser un número entero de 2 a 12',
    )
    expect(erroresDeFrecuencia({ tipo: 'anual', mes: 4, diaMes: 31 }, HOY, 'tercera').diaMes).toBe(
      'Abril no tiene 31 días',
    )
    expect(erroresDeFrecuencia({ tipo: 'unica', fecha: HOY }, HOY, 'tercera')).toEqual({
      fecha: 'Tiene que ser posterior al 12 de abril de 1640 T.E.',
    })
  })

  it('lo ya guardado no exige fecha posterior', () => {
    const guardada = { tipo: 'unica' as const, fecha: HOY }
    expect(erroresDeFrecuencia(guardada, HOY, 'tercera', guardada)).toEqual({})
  })

  it('próxima fecha', () => {
    expect(proximaFecha({ tipo: 'semanal', diaSemana: 5 }, HOY)).toEqual(f(14, 4))
    expect(proximaFecha({ tipo: 'unica', fecha: f(1, 4) }, HOY)).toBeNull()
    expect(proximaFecha({ tipo: 'anual', mes: 12, diaMes: 31 }, f(31, 12, 9999))).toBeNull()
  })
})
