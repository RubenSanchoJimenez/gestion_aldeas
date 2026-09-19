import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM, EVENTO, IMPUESTO } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { EfectoEvento, EventoNarrativo } from '../modelo/eventos'
import {
  conEfecto,
  eventoActivoEl,
  eventosConEfectosEl,
  pctDeCostes,
  pctDeConsumo,
  pctDeIngresos,
  pctDeProduccion,
} from './efectos'

/** Atajo para escribir fechas de 1640: dia(15, 4) es el 15 de abril. */
function dia(d: number, m: number): Fecha {
  return { anio: 1640, mes: m, dia: d }
}

/** Los cuatro eventos del ejemplo: lluvias (8/4, 14 días), feria (15/4, 3), bandidos (20/3, 5) y mensajero (1/4, 1). */
function eventosDelEjemplo(): EventoNarrativo[] {
  return documentoDeEjemplo().eventos
}

/** Un evento de un asentamiento, activo del 1 al 30 de abril, con los efectos que se le pasen. */
function evento(id: string, dominioId: string, efectos: EfectoEvento[]): EventoNarrativo {
  return { id, dominioId, nombre: 'Evento de prueba', inicio: dia(1, 4), duracionDias: 30, efectos }
}

describe('eventoActivoEl', () => {
  it('la feria de primavera (15 de abril, 3 días) está activa del 15 al 17, y no el 14 ni el 18 (§8)', () => {
    const feria = eventosDelEjemplo().find((e) => e.id === EVENTO.feria)
    if (feria === undefined) {
      throw new Error('El ejemplo no tiene la feria')
    }
    expect([14, 15, 16, 17, 18].map((d) => eventoActivoEl(feria, dia(d, 4)))).toEqual([false, true, true, true, false])
  })
})

describe('eventosConEfectosEl', () => {
  it('el 15 de abril cuenta la feria y las lluvias, de cualquier ámbito', () => {
    expect(eventosConEfectosEl(eventosDelEjemplo(), dia(15, 4)).map((e) => e.id)).toEqual([
      EVENTO.lluvias,
      EVENTO.feria,
    ])
  })

  it('el 12 de abril solo las lluvias, y el 22 de marzo los bandidos del peaje', () => {
    expect(eventosConEfectosEl(eventosDelEjemplo(), dia(12, 4)).map((e) => e.id)).toEqual([EVENTO.lluvias])
    expect(eventosConEfectosEl(eventosDelEjemplo(), dia(22, 3)).map((e) => e.id)).toEqual([EVENTO.bandidos])
  })

  it('el mensajero real, sin efectos, nunca cuenta aunque esté activo', () => {
    expect(eventosConEfectosEl(eventosDelEjemplo(), dia(1, 4)).map((e) => e.id)).not.toContain(EVENTO.mensajero)
  })

  it('un evento de partida no cuenta, aunque traiga efectos (EsquemaEventoNarrativo no lo deja guardar)', () => {
    const dePartida: EventoNarrativo = {
      id: 'ev.partida',
      nombre: 'Invierno largo',
      inicio: dia(1, 4),
      duracionDias: 30,
      efectos: [{ ambito: 'costes', objetivo: { tipo: 'todos' }, pct: 50 }],
    }
    expect(eventosConEfectosEl([dePartida], dia(15, 4))).toEqual([])
  })
})

describe('pctDeProduccion', () => {
  it('suma los % de «todos» y los de ese edificio (§7 l.1116)', () => {
    const activos = [
      evento('ev.a', DOM.bree, [{ ambito: 'produccion', objetivo: { tipo: 'todos' }, pct: -10 }]),
      evento('ev.b', DOM.bree, [
        { ambito: 'produccion', objetivo: { tipo: 'edificio', id: 'edificio.granjas' }, pct: -20 },
      ]),
    ]
    expect(pctDeProduccion(activos, DOM.bree, 'edificio.granjas')).toBe(-30)
    expect(pctDeProduccion(activos, DOM.bree, 'edificio.cantera')).toBe(-10)
  })

  it('no suma los efectos de otro asentamiento ni los de consumo', () => {
    const activos = [
      evento('ev.a', DOM.archet, [{ ambito: 'produccion', objetivo: { tipo: 'todos' }, pct: 50 }]),
      evento('ev.b', DOM.bree, [{ ambito: 'consumo', objetivo: { tipo: 'todos' }, pct: 50 }]),
    ]
    expect(pctDeProduccion(activos, DOM.bree, 'edificio.granjas')).toBe(0)
  })
})

describe('pctDeConsumo', () => {
  it('suma los % de «todos» y los de ese recurso, víveres incluidos (§7 l.1139)', () => {
    const activos = [
      evento('ev.a', DOM.bree, [{ ambito: 'consumo', objetivo: { tipo: 'todos' }, pct: -50 }]),
      evento('ev.b', DOM.bree, [{ ambito: 'consumo', objetivo: { tipo: 'recurso', id: 'recurso.viveres' }, pct: 10 }]),
    ]
    expect(pctDeConsumo(activos, DOM.bree, 'recurso.viveres')).toBe(-40)
    expect(pctDeConsumo(activos, DOM.bree, 'recurso.cerveza')).toBe(-50)
  })

  it('no suma los efectos de otro asentamiento ni los de producción', () => {
    const activos = [
      evento('ev.a', DOM.archet, [{ ambito: 'consumo', objetivo: { tipo: 'todos' }, pct: 50 }]),
      evento('ev.b', DOM.bree, [{ ambito: 'produccion', objetivo: { tipo: 'todos' }, pct: 50 }]),
    ]
    expect(pctDeConsumo(activos, DOM.bree, 'recurso.viveres')).toBe(0)
  })
})

describe('pctDeIngresos', () => {
  it('suma los % de «todos los ingresos» y los de ese impuesto (§7 l.1139, D-026)', () => {
    const activos = [
      evento('ev.a', DOM.bree, [{ ambito: 'ingresos', objetivo: { tipo: 'todos' }, pct: 10 }]),
      evento('ev.b', DOM.bree, [
        { ambito: 'ingresos', objetivo: { tipo: 'impuesto', id: IMPUESTO.aranceles }, pct: 500 },
      ]),
    ]
    expect(pctDeIngresos(activos, DOM.bree, IMPUESTO.aranceles)).toBe(510)
    expect(pctDeIngresos(activos, DOM.bree, IMPUESTO.peaje)).toBe(10)
  })

  it('no suma los efectos de costes ni los de otro asentamiento', () => {
    const activos = [
      evento('ev.a', DOM.bree, [{ ambito: 'costes', objetivo: { tipo: 'todos' }, pct: 30 }]),
      evento('ev.b', DOM.archet, [{ ambito: 'ingresos', objetivo: { tipo: 'todos' }, pct: -50 }]),
    ]
    expect(pctDeIngresos(activos, DOM.bree, IMPUESTO.aranceles)).toBe(0)
  })
})

describe('pctDeCostes', () => {
  it('suma los % de «todos los costes» y los de esa categoría (§6.5 n.º 29)', () => {
    const activos = [
      evento('ev.a', DOM.bree, [
        { ambito: 'costes', objetivo: { tipo: 'todos' }, pct: -20 },
        { ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'salarios' }, pct: 50 },
      ]),
    ]
    expect(pctDeCostes(activos, DOM.bree, 'salarios')).toBe(30)
    expect(pctDeCostes(activos, DOM.bree, 'soldadas')).toBe(-20)
  })

  it('no suma otra categoría, ni los de otro asentamiento, ni los de ingresos', () => {
    const activos = [
      evento('ev.a', DOM.bree, [{ ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'tributos' }, pct: 40 }]),
      evento('ev.b', DOM.archet, [{ ambito: 'costes', objetivo: { tipo: 'todos' }, pct: 25 }]),
      evento('ev.c', DOM.bree, [{ ambito: 'ingresos', objetivo: { tipo: 'todos' }, pct: 60 }]),
    ]
    expect(pctDeCostes(activos, DOM.bree, 'gastos')).toBe(0)
    expect(pctDeCostes(activos, DOM.bree, 'tributos')).toBe(40)
  })
})

describe('conEfecto', () => {
  it('base × (1 + pct / 100): los aranceles con la feria, 3 mo y +500 %, dan 18 mo (§9)', () => {
    expect(conEfecto(300000, 500)).toBe(1800000)
    expect(conEfecto(420000, -25)).toBe(315000)
    expect(conEfecto(420000, 0)).toBe(420000)
  })

  it('nunca da menos de 0: −100 % y −150 % dejan 0; y redondea al mh con las mitades hacia arriba', () => {
    expect(conEfecto(300000, -100)).toBe(0)
    expect(conEfecto(300000, -150)).toBe(0)
    expect(conEfecto(5, -50)).toBe(3)
  })
})
