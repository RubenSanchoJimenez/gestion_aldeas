import { describe, expect, it } from 'vitest'
import { RECURSO } from '../../catalogo/inicial'
import { DOM } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import { filaEn, flujoDe } from '../almacen'
import { pasoEventos } from '../bucle'
import { crearContexto } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, conFila, congelar, diaDe, estadoMinimo, recorrerPasos } from '../pruebas/constructores'
import type { OpcionesSimulacion } from '../tipos'
import { pasoConsumo } from './consumo'

function opciones(): OpcionesSimulacion {
  return { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** El ejemplo el 12 de abril, sin avances y congelado. */
function ejemplo(): EstadoPartida {
  return congelar(estadoDe(documentoDeEjemplo()))
}

describe('pasoConsumo', () => {
  it('el 13 de abril: víveres 268,667, cerveza 86,28 y madera 410,08 en Bree; víveres 889,667 en Archet', () => {
    const ctx = crearContexto(ejemplo(), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    expect(filaEn(ctx, DOM.bree, RECURSO.viveres)?.cantidad).toBeCloseTo(268.667, 3)
    expect(filaEn(ctx, DOM.bree, RECURSO.cerveza)?.cantidad).toBeCloseTo(86.28, 3)
    expect(filaEn(ctx, DOM.bree, RECURSO.madera)?.cantidad).toBeCloseTo(410.08, 3)
    expect(filaEn(ctx, DOM.archet, RECURSO.viveres)?.cantidad).toBeCloseTo(889.667, 3)
  })

  it('para en 0 y anota consumoTeorico y consumido: lo que falta es consumoTeorico − consumido', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 300,
    })
    const estado = conFila(conAldea, { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 5 })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    // 300 ÷ 30 = 10 al día; solo hay 5: sirve 5 y para en 0.
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBe(0)
    const flujo = flujoDe(ctx, diaDe({ anio: 1640, mes: 4, dia: 13 }), 'dom.aldea', RECURSO.viveres)
    expect(flujo.consumoTeorico).toBeCloseTo(10, 3)
    expect(flujo.consumido).toBe(5)
  })

  it('un cambio de población de +60 el 20 de abril cuenta desde ese día: 1.300 ÷ 30 = 43,333 al día', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 1240,
    })
    const conCambio: EstadoPartida = {
      ...conAldea,
      poblaciones: [
        {
          ...conAldea.poblaciones[0],
          cambios: [{ id: 'camb.mas60', fecha: { anio: 1640, mes: 4, dia: 20 }, delta: 60, motivo: 'Refugiados' }],
        },
      ],
    }
    const estado = conFila(conCambio, { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 100000 })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 20 }, opciones())
    recorrerPasos(ctx, 8, [pasoEventos, pasoConsumo])
    const antes = 100000 - 7 * (1240 / 30) - 43.333333333333336
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBeCloseTo(antes, 2)
  })

  it('un evento de consumo −50 % sobre los víveres reduce el pedido a la mitad', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 300,
    })
    const estado: EstadoPartida = {
      ...conFila(conAldea, { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 1000 }),
      eventos: [
        {
          id: 'ev.escasez',
          dominioId: 'dom.aldea',
          nombre: 'Racionamiento',
          inicio: { anio: 1640, mes: 4, dia: 13 },
          duracionDias: 1,
          efectos: [{ ambito: 'consumo', objetivo: { tipo: 'recurso', id: RECURSO.viveres }, pct: -50 }],
        },
      ],
    }
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    // 300 ÷ 30 = 10, con −50 % da 5.
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBe(995)
  })

  it('un evento de consumo −50 % sobre «todos» también afecta a los víveres', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 300,
    })
    const estado: EstadoPartida = {
      ...conFila(conAldea, { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 1000 }),
      eventos: [
        {
          id: 'ev.abundancia',
          dominioId: 'dom.aldea',
          nombre: 'Buena cosecha',
          inicio: { anio: 1640, mes: 4, dia: 13 },
          duracionDias: 1,
          efectos: [{ ambito: 'consumo', objetivo: { tipo: 'todos' }, pct: -50 }],
        },
      ],
    }
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBe(995)
  })

  it('dos consumos del mismo recurso se sirven en el orden de la lista (D-060)', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 100,
    })
    const conConsumos: EstadoPartida = {
      ...conAldea,
      poblaciones: [
        {
          ...conAldea.poblaciones[0],
          consumos: [
            { id: 'cons.primero', nombre: 'Primero', recursoId: RECURSO.madera, porHabitante: 0.5 },
            { id: 'cons.segundo', nombre: 'Segundo', recursoId: RECURSO.madera, porHabitante: 0.5 },
          ],
        },
      ],
    }
    // Pide 50 (primero) y 50 (segundo); solo hay 70: el primero se sirve entero y el segundo se queda en 20.
    const estado = conFila(conConsumos, { dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 70 })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.madera)?.cantidad).toBe(0)
    // No hay flujo por consumo individual (un solo flujo por fila y día), pero el consumoTeorico suma los dos pedidos.
    const flujo = flujoDe(ctx, diaDe({ anio: 1640, mes: 4, dia: 13 }), 'dom.aldea', RECURSO.madera)
    expect(flujo.consumoTeorico).toBeCloseTo(100, 3)
    expect(flujo.consumido).toBe(70)
  })

  it('sin habitantes no anota ningún flujo', () => {
    const estado = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
    })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    expect(ctx.flujos).toHaveLength(0)
  })

  it('sobre una fila que no existe hay 0 y el consumo cuenta como falta entera, sin crearla', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 100,
    })
    const estado: EstadoPartida = {
      ...conAldea,
      poblaciones: [
        {
          ...conAldea.poblaciones[0],
          consumos: [{ id: 'cons.cerveza', nombre: 'Cerveza', recursoId: RECURSO.cerveza, porHabitante: 0.003 }],
        },
      ],
    }
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.cerveza)).toBeUndefined()
    const flujo = flujoDe(ctx, diaDe({ anio: 1640, mes: 4, dia: 13 }), 'dom.aldea', RECURSO.cerveza)
    expect(flujo.consumido).toBe(0)
    expect(flujo.consumoTeorico).toBeCloseTo(0.3, 3)
  })

  it('un resto por debajo de TOLERANCIA cuenta servido entero (TC1)', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 300,
    })
    // 300 ÷ 30 = 10 al día; la fila tiene 10 menos 1e-13, muy por debajo de la tolerancia (1e-6).
    const estado = conFila(conAldea, { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 10 - 1e-13 })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBe(0)
  })
})
