import { describe, expect, it } from 'vitest'
import { RECURSO } from '../catalogo/inicial'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Existencia } from '../modelo/almacen'
import { consumirDelAlmacen, filaEn, flujoDe, hayDeTodo, sacarDelAlmacen, sumarAlAlmacen } from './almacen'
import { crearContexto, type Contexto } from './contexto'
import { idsEnSerie } from './ids'
import { conAsentamiento, conFila, congelar, diaDe, estadoMinimo } from './pruebas/constructores'

const HOY = { anio: 1640, mes: 4, dia: 12 }
const DIA = diaDe({ anio: 1640, mes: 4, dia: 13 }, true)

/** Bree con las filas del almacén que se le pidan (§6.3, A8). */
function contexto(filas: readonly Omit<Existencia, 'dominioId'>[] = []): Contexto {
  let estado = conAsentamiento(estadoMinimo(HOY), { id: 'dom.bree', nombre: 'Bree', caja: 0 })
  for (const fila of filas) {
    estado = conFila(estado, { ...fila, dominioId: 'dom.bree' })
  }
  return crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 19 }, {
    avanceId: 'av.prueba',
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
}

describe('filaEn', () => {
  it('la fila viva; undefined si el almacén no la tiene', () => {
    const ctx = contexto([{ recursoId: RECURSO.viveres, cantidad: 310, capacidad: 1200 }])
    expect(filaEn(ctx, 'dom.bree', RECURSO.viveres)).toEqual({
      dominioId: 'dom.bree',
      recursoId: RECURSO.viveres,
      cantidad: 310,
      capacidad: 1200,
    })
    expect(filaEn(ctx, 'dom.bree', RECURSO.hierro)).toBeUndefined()
  })
})

describe('flujoDe', () => {
  it('crea el flujo la primera vez, con la cantidad de la fila, y devuelve el mismo objeto después', () => {
    const ctx = contexto([{ recursoId: RECURSO.lana, cantidad: 35 }])
    const flujo1 = flujoDe(ctx, DIA, 'dom.bree', RECURSO.lana)
    expect(flujo1).toEqual({
      dominioId: 'dom.bree',
      recursoId: RECURSO.lana,
      fecha: DIA.fecha,
      entradas: 0,
      perdido: 0,
      consumido: 0,
      sacado: 0,
      consumoTeorico: 0,
      cantidad: 35,
    })
    expect(ctx.flujos).toHaveLength(1)
    const flujo2 = flujoDe(ctx, DIA, 'dom.bree', RECURSO.lana)
    expect(flujo2).toBe(flujo1)
    expect(ctx.flujos).toHaveLength(1)
  })

  it('un día distinto crea un flujo distinto para la misma fila (un flujo por día y fila)', () => {
    const ctx = contexto([{ recursoId: RECURSO.lana, cantidad: 35 }])
    flujoDe(ctx, DIA, 'dom.bree', RECURSO.lana)
    const otroDia = diaDe({ anio: 1640, mes: 4, dia: 14 })
    flujoDe(ctx, otroDia, 'dom.bree', RECURSO.lana)
    expect(ctx.flujos).toHaveLength(2)
  })

  it('sin fila, el flujo nace con cantidad 0', () => {
    const ctx = contexto([])
    expect(flujoDe(ctx, DIA, 'dom.bree', RECURSO.hierro).cantidad).toBe(0)
  })
})

describe('sumarAlAlmacen', () => {
  it('con capacidad: lo que no cabe se pierde y la fila queda en la capacidad exacta (lana 95/100 + 12)', () => {
    const ctx = contexto([{ recursoId: RECURSO.lana, cantidad: 95, capacidad: 100 }])
    expect(sumarAlAlmacen(ctx, DIA, 'dom.bree', RECURSO.lana, 12)).toEqual({ entra: 5, perdida: 7 })
    expect(filaEn(ctx, 'dom.bree', RECURSO.lana)?.cantidad).toBe(100)
    expect(flujoDe(ctx, DIA, 'dom.bree', RECURSO.lana)).toMatchObject({ entradas: 5, perdido: 7, cantidad: 100 })
  })

  it('todo perdido si la fila ya está llena', () => {
    const ctx = contexto([{ recursoId: RECURSO.lana, cantidad: 100, capacidad: 100 }])
    expect(sumarAlAlmacen(ctx, DIA, 'dom.bree', RECURSO.lana, 12)).toEqual({ entra: 0, perdida: 12 })
    expect(filaEn(ctx, 'dom.bree', RECURSO.lana)?.cantidad).toBe(100)
  })

  it('sin capacidad no hay límite: entra todo y no se pierde nada', () => {
    const ctx = contexto([{ recursoId: RECURSO.piedra, cantidad: 180 }])
    expect(sumarAlAlmacen(ctx, DIA, 'dom.bree', RECURSO.piedra, 1000)).toEqual({ entra: 1000, perdida: 0 })
    expect(filaEn(ctx, 'dom.bree', RECURSO.piedra)?.cantidad).toBe(1180)
  })

  it('crea la fila si falta, a 0 y sin capacidad (TC10)', () => {
    const ctx = contexto([])
    expect(filaEn(ctx, 'dom.bree', RECURSO.hierro)).toBeUndefined()
    expect(sumarAlAlmacen(ctx, DIA, 'dom.bree', RECURSO.hierro, 20)).toEqual({ entra: 20, perdida: 0 })
    expect(filaEn(ctx, 'dom.bree', RECURSO.hierro)).toEqual({ dominioId: 'dom.bree', recursoId: RECURSO.hierro, cantidad: 20 })
    expect('capacidad' in (filaEn(ctx, 'dom.bree', RECURSO.hierro) ?? {})).toBe(false)
  })
})

describe('consumirDelAlmacen', () => {
  it('sirve lo que haya y para en 0; anota consumoTeorico y consumido', () => {
    const ctx = contexto([{ recursoId: RECURSO.viveres, cantidad: 10 }])
    expect(consumirDelAlmacen(ctx, DIA, 'dom.bree', RECURSO.viveres, 15)).toBe(10)
    expect(filaEn(ctx, 'dom.bree', RECURSO.viveres)?.cantidad).toBe(0)
    expect(flujoDe(ctx, DIA, 'dom.bree', RECURSO.viveres)).toMatchObject({ consumoTeorico: 15, consumido: 10 })
  })

  it('un resto por debajo de TOLERANCIA cuenta servido entero (TC1)', () => {
    const ctx = contexto([{ recursoId: RECURSO.viveres, cantidad: 10 - 1e-13 }])
    expect(consumirDelAlmacen(ctx, DIA, 'dom.bree', RECURSO.viveres, 10)).toBe(10)
    expect(filaEn(ctx, 'dom.bree', RECURSO.viveres)?.cantidad).toBe(0)
  })

  it('sobre una fila que no existe hay 0 y el consumo cuenta como falta entera, sin crearla (TC10)', () => {
    const ctx = contexto([])
    expect(consumirDelAlmacen(ctx, DIA, 'dom.bree', RECURSO.cerveza, 5)).toBe(0)
    expect(filaEn(ctx, 'dom.bree', RECURSO.cerveza)).toBeUndefined()
    expect(flujoDe(ctx, DIA, 'dom.bree', RECURSO.cerveza)).toMatchObject({ consumoTeorico: 5, consumido: 0 })
  })
})

describe('sacarDelAlmacen', () => {
  it('saca entero si hay bastante y anota sacado', () => {
    const ctx = contexto([{ recursoId: RECURSO.madera, cantidad: 360 }])
    expect(sacarDelAlmacen(ctx, DIA, 'dom.bree', RECURSO.madera, 40)).toBe(true)
    expect(filaEn(ctx, 'dom.bree', RECURSO.madera)?.cantidad).toBe(320)
    expect(flujoDe(ctx, DIA, 'dom.bree', RECURSO.madera).sacado).toBe(40)
  })

  it('si no hay bastante, no saca nada y devuelve false', () => {
    const ctx = contexto([{ recursoId: RECURSO.madera, cantidad: 10 }])
    expect(sacarDelAlmacen(ctx, DIA, 'dom.bree', RECURSO.madera, 40)).toBe(false)
    expect(filaEn(ctx, 'dom.bree', RECURSO.madera)?.cantidad).toBe(10)
  })
})

describe('hayDeTodo', () => {
  it('true si hay de cada recurso al menos lo pedido, con tolerancia', () => {
    const ctx = contexto([
      { recursoId: RECURSO.madera, cantidad: 40 },
      { recursoId: RECURSO.piedra, cantidad: 20 },
    ])
    expect(hayDeTodo(ctx, 'dom.bree', { [RECURSO.madera]: 40, [RECURSO.piedra]: 20 })).toBe(true)
    expect(hayDeTodo(ctx, 'dom.bree', { [RECURSO.madera]: 40.0000001 })).toBe(true)
  })

  it('false si a alguno le falta, o si su fila no existe', () => {
    const ctx = contexto([{ recursoId: RECURSO.madera, cantidad: 40 }])
    expect(hayDeTodo(ctx, 'dom.bree', { [RECURSO.madera]: 41 })).toBe(false)
    expect(hayDeTodo(ctx, 'dom.bree', { [RECURSO.hierro]: 1 })).toBe(false)
  })
})
