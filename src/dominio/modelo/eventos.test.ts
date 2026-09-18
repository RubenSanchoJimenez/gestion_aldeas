import { describe, expect, it } from 'vitest'
import { EsquemaEfectoEvento, EsquemaEventoNarrativo, type EventoNarrativo } from './eventos'

/** «Lluvias de primavera»: del 8 al 21 de abril, con las Granjas del Oeste al −20 % (A11). */
const LLUVIAS: EventoNarrativo = {
  id: 'evt.lluvias-de-primavera',
  dominioId: 'dom.bree',
  nombre: 'Lluvias de primavera',
  inicio: { anio: 1640, mes: 4, dia: 8 },
  duracionDias: 14,
  efectos: [
    { ambito: 'produccion', objetivo: { tipo: 'edificio', id: 'ed.granjas-del-oeste' }, pct: -20 },
  ],
  notas: 'El máster anuncia lluvias intensas: los campos del oeste se encharcan.',
}

describe('EsquemaEventoNarrativo', () => {
  it('acepta las lluvias de primavera con su efecto de producción del −20 %', () => {
    expect(EsquemaEventoNarrativo.parse(LLUVIAS)).toEqual(LLUVIAS)
    expect(EsquemaEventoNarrativo.safeParse({ ...LLUVIAS, duracionDias: 0 }).success).toBe(false)

    const dePartida = { ...LLUVIAS, id: 'evt.feria', dominioId: undefined, nombre: 'Feria de primavera', efectos: [] }
    expect(EsquemaEventoNarrativo.parse(dePartida)).toEqual(dePartida)

    const dePartidaConEfectos = EsquemaEventoNarrativo.safeParse({ ...LLUVIAS, dominioId: undefined })
    expect(dePartidaConEfectos.success).toBe(false)
    expect(dePartidaConEfectos.error?.issues.map((i) => i.message)).toEqual([
      'Un evento de partida no tiene efectos económicos',
    ])
  })

  it('fija por ámbito qué objetivos admite cada efecto (selectores n.º 28 y 29)', () => {
    const efectos = [
      { ambito: 'produccion', objetivo: { tipo: 'todos' }, pct: -20 },
      { ambito: 'produccion', objetivo: { tipo: 'edificio', id: 'ed.cantera' }, pct: 15.5 },
      { ambito: 'consumo', objetivo: { tipo: 'recurso', id: 'recurso.viveres' }, pct: 10 },
      { ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'salarios' }, pct: -100 },
      { ambito: 'ingresos', objetivo: { tipo: 'impuesto', id: 'imp.peaje' }, pct: -100 },
    ]
    for (const efecto of efectos) {
      expect(EsquemaEfectoEvento.parse(efecto)).toEqual(efecto)
    }

    expect(
      EsquemaEfectoEvento.safeParse({ ambito: 'produccion', objetivo: { tipo: 'recurso', id: 'recurso.viveres' }, pct: 5 })
        .success,
    ).toBe(false)
    expect(
      EsquemaEfectoEvento.safeParse({ ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'obras' }, pct: 5 })
        .success,
    ).toBe(false)
    expect(
      EsquemaEfectoEvento.safeParse({ ambito: 'produccion', objetivo: { tipo: 'todos' }, pct: -100.5 }).success,
    ).toBe(false)
    const tresDecimales = EsquemaEfectoEvento.safeParse({
      ambito: 'produccion',
      objetivo: { tipo: 'todos' },
      pct: 12.125,
    })
    expect(tresDecimales.success).toBe(false)
    expect(tresDecimales.error?.issues.map((i) => i.message)).toEqual(['Usa como mucho 2 decimales'])
  })
})
