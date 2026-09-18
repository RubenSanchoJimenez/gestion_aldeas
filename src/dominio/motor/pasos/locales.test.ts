import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, compararFechas, type Fecha } from '../../calendario/fecha'
import { CATEGORIA } from '../../catalogo/inicial'
import { eventosDeDineroEl } from '../../eventos/efectos'
import { DOM, IMPUESTO, INVERSION, LOCAL } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import type { LocalComercial, TipoLocal } from '../../modelo/asentamiento'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import type { Movimiento } from '../../modelo/movimientos'
import { crearContexto, type Contexto, type Dia } from '../contexto'
import { idsEnSerie } from '../ids'
import { congelar } from '../pruebas/constructores'
import { pasoCobros } from './cobros'
import { cobrarLocales } from './locales'

/** El avance de prueba: todo lo que crea lleva este avanceId. */
const AVANCE_PRUEBA = 'av.prueba'

/** El 1 de mayo de 1640: el primer cobro de locales después del 12 de abril. */
const PRIMERO_DE_MAYO: Fecha = { anio: 1640, mes: 5, dia: 1 }

/** Un día de 1640. */
function fecha(dia: number, mes: number): Fecha {
  return { anio: 1640, mes, dia }
}

/** La partida de ejemplo del 12 de abril, con los cambios que pida cada prueba en sus locales o en sus tipos. */
function ejemplo(
  cambiarLocal: (local: LocalComercial) => LocalComercial = (local) => local,
  cambiarTipo: (tipo: TipoLocal) => TipoLocal = (tipo) => tipo,
): EstadoPartida {
  const base = estadoDe(documentoDeEjemplo())
  return {
    ...base,
    localesComerciales: base.localesComerciales.map(cambiarLocal),
    tiposLocal: base.tiposLocal.map(cambiarTipo),
  }
}

/** Un contexto sobre la entrada congelada: si el paso escribiera en ella, la prueba lanzaría. */
function contexto(estado: EstadoPartida, hasta: Fecha): Contexto {
  return crearContexto(congelar(estado), hasta, {
    avanceId: AVANCE_PRUEBA,
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
}

/** El día tal como lo deja el paso 1: con los eventos de dinero activos. */
function diaDe(ctx: Contexto, f: Fecha): Dia {
  return {
    fecha: f,
    numero: aNumeroDeDia(f),
    primero: compararFechas(f, ctx.primerDia) === 0,
    eventos: eventosDeDineroEl(ctx.estado.eventos, f),
  }
}

/** Los cobros de locales que ha creado el avance de prueba. */
function cobrosDeLocales(ctx: Contexto): Movimiento[] {
  return ctx.movimientos.filter((m) => m.avanceId === AVANCE_PRUEBA && m.regla?.tipo === 'locales')
}

/** Hasta qué mes está cobrado cada local, en el orden del array. */
function cobradoHasta(ctx: Contexto): string[] {
  return ctx.localesComerciales.map((l) => `${l.cobradoHasta.anio}-${l.cobradoHasta.mes}`)
}

describe('cobrarLocales', () => {
  it('el 1 de mayo cobra abril a los cuatro locales de Bree: +450.000, «Impuestos de locales · abril (4)» y su detalle', () => {
    const ctx = contexto(ejemplo(), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    const abril = { anio: 1640, mes: 4 }
    expect(cobrosDeLocales(ctx)).toEqual([
      {
        id: 'sim.1',
        dominioId: DOM.bree,
        fecha: PRIMERO_DE_MAYO,
        tipo: 'ingreso',
        importe: { base: 450000 },
        categoriaId: CATEGORIA.impuestos,
        concepto: 'Impuestos de locales · abril (4)',
        origen: 'avance',
        avanceId: AVANCE_PRUEBA,
        regla: { tipo: 'locales', id: DOM.bree },
        detalleLocales: [
          {
            localId: LOCAL.herreria1,
            nombre: 'Herrería 1',
            mes: abril,
            produccion: { base: 1000000 },
            anotada: false,
            impuesto: { base: 100000 },
          },
          {
            localId: LOCAL.posada,
            nombre: 'Posada El Poney Pisador',
            mes: abril,
            produccion: { base: 4000000 },
            anotada: false,
            impuesto: { base: 320000 },
          },
          {
            localId: LOCAL.tiendaDeTelas,
            nombre: 'Tienda de telas',
            mes: abril,
            produccion: { base: 150000 },
            anotada: true,
            impuesto: { base: 10000 },
          },
          {
            localId: LOCAL.ultramarinos,
            nombre: 'Ultramarinos del camino',
            mes: abril,
            produccion: { base: 400000 },
            anotada: false,
            impuesto: { base: 20000 },
          },
        ],
        programado: false,
      },
    ])
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000 + 450000)
    expect(cobradoHasta(ctx)).toEqual(['1640-4', '1640-4', '1640-4', '1640-4'])
    expect(ctx.sucesos).toEqual([{ tipo: 'cobroLocales', dominioId: DOM.bree, fecha: PRIMERO_DE_MAYO }])
  })

  it('sin la producción anotada de la Tienda de telas cobra la habitual: 470.000 (§7 l.1067)', () => {
    const ctx = contexto(ejemplo((l) => ({ ...l, producciones: [] })), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    expect(cobrosDeLocales(ctx)[0].importe).toEqual({ base: 470000 })
  })

  it('un local cerrado todo abril no entra en el detalle ni en el número, pero su cobradoHasta avanza igual (T30)', () => {
    const cerrada = (l: LocalComercial): LocalComercial =>
      l.id === LOCAL.herreria1
        ? { ...l, cambiosEstado: [...l.cambiosEstado, { desde: fecha(1, 4), estado: 'cerrado' }] }
        : l
    const ctx = contexto(ejemplo(cerrada), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    const [cobro] = cobrosDeLocales(ctx)
    expect(cobro.importe).toEqual({ base: 350000 })
    expect(cobro.concepto).toBe('Impuestos de locales · abril (3)')
    expect(cobro.detalleLocales?.map((d) => d.localId)).not.toContain(LOCAL.herreria1)
    expect(cobradoHasta(ctx)).toEqual(['1640-4', '1640-4', '1640-4', '1640-4'])
  })

  it('un local con dos meses sin cobrar paga marzo y abril, cada uno con su entrada: «marzo y abril (4)»', () => {
    const atrasada = (l: LocalComercial): LocalComercial =>
      l.id === LOCAL.herreria1 ? { ...l, cobradoHasta: { anio: 1640, mes: 2 } } : l
    const ctx = contexto(ejemplo(atrasada), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    const [cobro] = cobrosDeLocales(ctx)
    expect(cobro.concepto).toBe('Impuestos de locales · marzo y abril (4)')
    expect(cobro.importe).toEqual({ base: 550000 })
    expect(cobro.detalleLocales?.map((d) => `${d.nombre} · ${d.mes.mes}`)).toEqual([
      'Herrería 1 · 3',
      'Herrería 1 · 4',
      'Posada El Poney Pisador · 4',
      'Tienda de telas · 4',
      'Ultramarinos del camino · 4',
    ])
    expect(cobradoHasta(ctx)).toEqual(['1640-4', '1640-4', '1640-4', '1640-4'])
  })

  it('un local con impuesto 0 no cuenta en el cobro ni en el número entre paréntesis (§9 l.1309)', () => {
    const tiendaGratis = (t: TipoLocal): TipoLocal => (t.nombre === 'Tienda' ? { ...t, pct: 0, minimo: { base: 0 } } : t)
    const ctx = contexto(ejemplo(undefined, tiendaGratis), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    const [cobro] = cobrosDeLocales(ctx)
    expect(cobro.concepto).toBe('Impuestos de locales · abril (2)')
    expect(cobro.importe).toEqual({ base: 420000 })
    expect(cobradoHasta(ctx)).toEqual(['1640-4', '1640-4', '1640-4', '1640-4'])
  })

  it('si ningún local paga, no hay movimiento ni suceso, y cobradoHasta avanza igual (§9 l.1309; T30)', () => {
    const gratis = (t: TipoLocal): TipoLocal => ({ ...t, pct: 0, minimo: { base: 0 } })
    const ctx = contexto(ejemplo(undefined, gratis), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    expect(cobrosDeLocales(ctx)).toEqual([])
    expect(ctx.sucesos).toEqual([])
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000)
    expect(cobradoHasta(ctx)).toEqual(['1640-4', '1640-4', '1640-4', '1640-4'])
  })

  it('con el día de cobro cambiado al 15 no cobra marzo otra vez el 15 de abril y cobra abril el 15 de mayo (§9 l.1305)', () => {
    const alQuince = (t: TipoLocal): TipoLocal => ({ ...t, diaCobro: 15 })
    const ctx = contexto(ejemplo(undefined, alQuince), fecha(15, 5))
    cobrarLocales(ctx, diaDe(ctx, fecha(15, 4)))
    expect(cobrosDeLocales(ctx)).toEqual([])
    expect(cobradoHasta(ctx)).toEqual(['1640-3', '1640-3', '1640-3', '1640-3'])
    cobrarLocales(ctx, diaDe(ctx, fecha(15, 5)))
    const [cobro] = cobrosDeLocales(ctx)
    expect(cobro.fecha).toEqual(fecha(15, 5))
    expect(cobro.concepto).toBe('Impuestos de locales · abril (4)')
    expect(cobradoHasta(ctx)).toEqual(['1640-4', '1640-4', '1640-4', '1640-4'])
  })

  it('cobradoHasta nunca retrocede: un local ya cobrado hasta mayo no paga el 1 de mayo y se queda en mayo (aviso 14)', () => {
    const adelantada = (l: LocalComercial): LocalComercial =>
      l.id === LOCAL.herreria1 ? { ...l, cobradoHasta: { anio: 1640, mes: 5 } } : l
    const ctx = contexto(ejemplo(adelantada), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    const [cobro] = cobrosDeLocales(ctx)
    expect(cobro.concepto).toBe('Impuestos de locales · abril (3)')
    expect(cobradoHasta(ctx)).toEqual(['1640-5', '1640-4', '1640-4', '1640-4'])
  })
})

describe('pasoCobros con los locales', () => {
  it('el 1 de mayo cobra los locales después de los impuestos y antes de los beneficios (§9 l.1280)', () => {
    const ctx = contexto(ejemplo(), PRIMERO_DE_MAYO)
    pasoCobros(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    expect(
      ctx.movimientos
        .filter((m) => m.avanceId === AVANCE_PRUEBA)
        .map((m) => [m.regla?.tipo, m.regla?.id, m.importe.base]),
    ).toEqual([
      ['impuesto', IMPUESTO.hogar, 1240000],
      ['locales', DOM.bree, 450000],
      ['beneficio', INVERSION.tonelDorado, 300000],
    ])
  })
})
