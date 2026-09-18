import { describe, expect, it } from 'vitest'
import { RECURSO } from '../../catalogo/inicial'
import { saldosPorDominio } from '../../dinero/saldo'
import { catalogosDeEjemplo } from '../../ejemplo/sombraDelEste'
import { EsquemaEstadoPartida } from '../../modelo/documento'
import { validarCopia } from '../../validacion/coherencia'
import { conAsentamiento, congelar, estadoMinimo } from './constructores'

describe('estadoMinimo', () => {
  it('es una partida válida: pasa EsquemaEstadoPartida y validarCopia, con la fecha que se le pida', () => {
    const estado = estadoMinimo()
    expect(EsquemaEstadoPartida.safeParse(estado).success).toBe(true)
    expect(validarCopia({ ...estado, avances: [] }, catalogosDeEjemplo())).toEqual([])
    expect(estado.partida.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 12 })
    expect(estado.partida.fechaInicial).toEqual(estado.partida.fechaActual)
    expect(estado.dominios).toEqual([{ id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' }])
    expect(saldosPorDominio(estado)).toEqual({ 'dom.tharan': 0 })

    const alFinal = estadoMinimo({ anio: 9999, mes: 12, dia: 30 })
    expect(alFinal.partida.fechaActual).toEqual({ anio: 9999, mes: 12, dia: 30 })
    expect(alFinal.partida.fechaInicial).toEqual({ anio: 9999, mes: 12, dia: 30 })
    expect(validarCopia({ ...alFinal, avances: [] }, catalogosDeEjemplo())).toEqual([])
  })
})

describe('conAsentamiento', () => {
  it('añade el asentamiento con su caja, su población, sus víveres y su mercado local, sin tocar la entrada', () => {
    const inicial = congelar(estadoMinimo())
    const estado = conAsentamiento(inicial, { id: 'dom.bree', nombre: 'Bree', caja: 300000, habitantes: 1240 })
    expect(estado.dominios.map((d) => d.id)).toEqual(['dom.tharan', 'dom.bree'])
    expect(saldosPorDominio(estado)).toEqual({ 'dom.tharan': 0, 'dom.bree': 300000 })
    expect(estado.poblaciones).toEqual([{ dominioId: 'dom.bree', habitantesIniciales: 1240, cambios: [], consumos: [] }])
    expect(estado.existencias).toEqual([{ dominioId: 'dom.bree', recursoId: RECURSO.viveres, cantidad: 0 }])
    expect(estado.mercados).toEqual([{ id: 'mercado.dom.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }])
    expect(validarCopia({ ...estado, avances: [] }, catalogosDeEjemplo())).toEqual([])
    expect(inicial.dominios).toHaveLength(1)

    const conDos = conAsentamiento(estado, { id: 'dom.archet', nombre: 'Archet', caja: 0 })
    expect(conDos.poblaciones[1].habitantesIniciales).toBe(0)
    expect(validarCopia({ ...conDos, avances: [] }, catalogosDeEjemplo())).toEqual([])
  })
})

describe('congelar', () => {
  it('congela a fondo: cualquier escritura lanza y devuelve el mismo objeto', () => {
    const estado = estadoMinimo()
    const congelado = congelar(estado)
    expect(congelado).toBe(estado)
    expect(() => {
      congelado.partida.fechaActual.dia = 13
    }).toThrow(TypeError)
    expect(() => {
      congelado.movimientos.push(congelado.movimientos[0])
    }).toThrow(TypeError)
    expect(() => {
      congelado.cajas[0].saldoInicial.base = 1
    }).toThrow(TypeError)
    expect(congelar(7)).toBe(7)
  })
})
