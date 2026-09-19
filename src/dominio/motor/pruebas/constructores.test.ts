import { describe, expect, it } from 'vitest'
import { aNumeroDeDia } from '../../calendario/fecha'
import { RECURSO } from '../../catalogo/inicial'
import { saldosPorDominio } from '../../dinero/saldo'
import { catalogosDeEjemplo } from '../../ejemplo/sombraDelEste'
import { EsquemaEstadoPartida } from '../../modelo/documento'
import { validarCopia } from '../../validacion/coherencia'
import { crearContexto } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, conFila, congelar, diaDe, estadoMinimo, recorrerPasos } from './constructores'

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

describe('conFila', () => {
  it('añade la fila si no estaba, y la sustituye entera si ya estaba (mismo dominio y recurso)', () => {
    const conBree = conAsentamiento(estadoMinimo(), { id: 'dom.bree', nombre: 'Bree', caja: 0 })
    const conMadera = conFila(conBree, { dominioId: 'dom.bree', recursoId: RECURSO.madera, cantidad: 420, capacidad: 600 })
    expect(conMadera.existencias).toEqual([
      { dominioId: 'dom.bree', recursoId: RECURSO.viveres, cantidad: 0 },
      { dominioId: 'dom.bree', recursoId: RECURSO.madera, cantidad: 420, capacidad: 600 },
    ])
    const sustituida = conFila(conMadera, { dominioId: 'dom.bree', recursoId: RECURSO.viveres, cantidad: 90 })
    expect(sustituida.existencias).toEqual([
      { dominioId: 'dom.bree', recursoId: RECURSO.viveres, cantidad: 90 },
      { dominioId: 'dom.bree', recursoId: RECURSO.madera, cantidad: 420, capacidad: 600 },
    ])
    expect(conBree.existencias).toHaveLength(1)
  })
})

describe('diaDe', () => {
  it('un Dia con numero = aNumeroDeDia(fecha), sin eventos, y primero solo si se pide', () => {
    const fecha = { anio: 1640, mes: 4, dia: 12 }
    expect(diaDe(fecha)).toEqual({ fecha, numero: aNumeroDeDia(fecha), primero: false, eventos: [] })
    expect(diaDe(fecha, true)).toEqual({ fecha, numero: aNumeroDeDia(fecha), primero: true, eventos: [] })
  })
})

describe('recorrerPasos', () => {
  it('llama a cada paso una vez por día, en orden, desde ctx.primerDia', () => {
    const estado = congelar(estadoMinimo())
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 15 }, {
      avanceId: 'av.prueba',
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    const vistos: Array<{ numero: number; primero: boolean; paso: string }> = []
    recorrerPasos(ctx, 3, [
      (_ctx, dia) => vistos.push({ numero: dia.numero, primero: dia.primero, paso: 'a' }),
      (_ctx, dia) => vistos.push({ numero: dia.numero, primero: dia.primero, paso: 'b' }),
    ])
    expect(vistos).toEqual([
      { numero: aNumeroDeDia({ anio: 1640, mes: 4, dia: 13 }), primero: true, paso: 'a' },
      { numero: aNumeroDeDia({ anio: 1640, mes: 4, dia: 13 }), primero: true, paso: 'b' },
      { numero: aNumeroDeDia({ anio: 1640, mes: 4, dia: 14 }), primero: false, paso: 'a' },
      { numero: aNumeroDeDia({ anio: 1640, mes: 4, dia: 14 }), primero: false, paso: 'b' },
      { numero: aNumeroDeDia({ anio: 1640, mes: 4, dia: 15 }), primero: false, paso: 'a' },
      { numero: aNumeroDeDia({ anio: 1640, mes: 4, dia: 15 }), primero: false, paso: 'b' },
    ])
  })
})
