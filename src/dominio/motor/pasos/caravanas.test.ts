import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, compararFechas, type Fecha } from '../../calendario/fecha'
import { CATEGORIA, RECURSO } from '../../catalogo/inicial'
import { eventosConEfectosEl } from '../../eventos/efectos'
import { CARAVANA, DOM, MERCADO } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import type { Caravana } from '../../modelo/comercio'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import type { Movimiento } from '../../modelo/movimientos'
import { filaEn } from '../almacen'
import { crearContexto, type Contexto, type Dia } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, congelar, estadoMinimo } from '../pruebas/constructores'
import { pasoLlegadaDeCaravanas, pasoVueltaDeVentas } from './caravanas'

/** El avance de prueba: todo lo que crea lleva este avanceId. */
const AVANCE_PRUEBA = 'av.prueba'

/** Un día de abril de 1640. */
function fecha(dia: number): Fecha {
  return { anio: 1640, mes: 4, dia }
}

/** La partida de ejemplo del 12 de abril, con la caravana de Fornost cambiada si la prueba lo pide. */
function ejemplo(cambiarFornost: (caravana: Caravana) => Caravana = (caravana) => caravana): EstadoPartida {
  const base = estadoDe(documentoDeEjemplo())
  return {
    ...base,
    caravanas: base.caravanas.map((c) => (c.id === CARAVANA.ventaCervezaFornost ? cambiarFornost(c) : c)),
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
    eventos: eventosConEfectosEl(ctx.estado.eventos, f),
  }
}

/** Los movimientos que ha creado el avance de prueba. */
function delAvance(ctx: Contexto): Movimiento[] {
  return ctx.movimientos.filter((m) => m.avanceId === AVANCE_PRUEBA)
}

/** La caravana de ese id tal como la deja el paso. */
function caravana(ctx: Contexto, id: string): Caravana | undefined {
  return ctx.caravanas.find((c) => c.id === id)
}

describe('pasoVueltaDeVentas', () => {
  it('la cerveza de Fornost vuelve el 18: cobra +2.400.000 con «24 mo» y la caravana queda terminada', () => {
    const ctx = contexto(ejemplo(), fecha(19))
    pasoVueltaDeVentas(ctx, diaDe(ctx, fecha(18)))
    expect(delAvance(ctx)).toEqual([
      {
        id: 'sim.1',
        dominioId: DOM.bree,
        fecha: fecha(18),
        tipo: 'ingreso',
        importe: { base: 2400000, introducido: { cantidad: '24', moneda: 'mo' } },
        categoriaId: CATEGORIA.comercio,
        concepto: 'Caravana: venta de cerveza en Fornost',
        origen: 'avance',
        avanceId: AVANCE_PRUEBA,
        vinculo: { tipo: 'caravana', id: CARAVANA.ventaCervezaFornost },
        programado: false,
      },
    ])
    expect(caravana(ctx, CARAVANA.ventaCervezaFornost)).toMatchObject({
      estado: 'terminada',
      movimientoVueltaId: 'sim.1',
    })
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000 + 2400000)
    expect(ctx.sucesos).toEqual([
      { tipo: 'vueltaCaravana', dominioId: DOM.bree, fecha: fecha(18), mercadoId: MERCADO.fornost },
    ])
  })

  it('una venta cuya vuelta ya pasó cobra el primer día del avance, con la fecha de ese día (§7 l.1159)', () => {
    const ctx = contexto(
      ejemplo((c) => ({ ...c, salida: fecha(2), vuelta: fecha(10) })),
      fecha(19),
    )
    pasoVueltaDeVentas(ctx, diaDe(ctx, fecha(13)))
    const [vuelta] = delAvance(ctx)
    expect(vuelta.fecha).toEqual(fecha(13))
    expect(vuelta.importe.base).toBe(2400000)
    expect(caravana(ctx, CARAVANA.ventaCervezaFornost)?.estado).toBe('terminada')
  })

  it('antes de su vuelta no cobra, y una vuelta pasada solo se cobra el primer día', () => {
    const aTiempo = contexto(ejemplo(), fecha(19))
    pasoVueltaDeVentas(aTiempo, diaDe(aTiempo, fecha(17)))
    expect(delAvance(aTiempo)).toEqual([])
    expect(caravana(aTiempo, CARAVANA.ventaCervezaFornost)?.estado).toBe('enRuta')

    const atrasada = contexto(
      ejemplo((c) => ({ ...c, salida: fecha(2), vuelta: fecha(10) })),
      fecha(19),
    )
    pasoVueltaDeVentas(atrasada, diaDe(atrasada, fecha(14)))
    expect(delAvance(atrasada)).toEqual([])
  })

  it('una venta de víveres va a «Víveres del almacén» y nombra el recurso en minúscula (D-011, T27)', () => {
    const ctx = contexto(
      ejemplo((c) => ({ ...c, carga: { recursoId: RECURSO.viveres, cantidad: 40 } })),
      fecha(19),
    )
    pasoVueltaDeVentas(ctx, diaDe(ctx, fecha(18)))
    const [vuelta] = delAvance(ctx)
    expect(vuelta.categoriaId).toBe(CATEGORIA.viveresDelAlmacen)
    expect(vuelta.concepto).toBe('Caravana: venta de víveres en Fornost')
  })

  it('no toca la compra en ruta de Tharbad ni una venta programada, aunque llegue su vuelta (T27)', () => {
    const tharbad = contexto(ejemplo(), fecha(25))
    pasoVueltaDeVentas(tharbad, diaDe(tharbad, fecha(25)))
    expect(delAvance(tharbad)).toEqual([])
    expect(caravana(tharbad, CARAVANA.compraViveresTharbad)?.estado).toBe('enRuta')

    const programada = contexto(
      ejemplo((c) => ({ ...c, estado: 'programada' })),
      fecha(19),
    )
    pasoVueltaDeVentas(programada, diaDe(programada, fecha(18)))
    expect(delAvance(programada)).toEqual([])
    expect(caravana(programada, CARAVANA.ventaCervezaFornost)?.estado).toBe('programada')
    expect(programada.saldos.get(DOM.bree)).toBe(34060000)
  })
})

describe('pasoLlegadaDeCaravanas', () => {
  it('la compra de Tharbad llega el 25: +300 víveres en Bree, terminada y suceso vueltaCaravana', () => {
    const ctx = contexto(ejemplo(), fecha(25))
    pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(25)))
    expect(filaEn(ctx, DOM.bree, RECURSO.viveres)?.cantidad).toBe(610)
    expect(caravana(ctx, CARAVANA.compraViveresTharbad)?.estado).toBe('terminada')
    expect(ctx.sucesos).toContainEqual({
      tipo: 'vueltaCaravana',
      dominioId: DOM.bree,
      fecha: fecha(25),
      mercadoId: MERCADO.tharbad,
    })
  })

  it('llega con el almacén lleno y pierde lo que no cabe', () => {
    const base = conAsentamiento(estadoMinimo(fecha(12)), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 90, capacidad: 100 }],
      caravanas: [
        {
          id: 'car.prueba',
          dominioId: 'dom.aldea',
          operacion: 'compra',
          mercadoId: 'mercado.dom.aldea',
          carga: { recursoId: RECURSO.madera, cantidad: 30 },
          precioUnidad: { base: 10000 },
          importe: { base: 300000 },
          salida: fecha(1),
          vuelta: fecha(13),
          estado: 'enRuta',
        },
      ],
    }
    const ctx = crearContexto(estado, fecha(13), {
      avanceId: AVANCE_PRUEBA,
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(13)))
    expect(filaEn(ctx, 'dom.aldea', RECURSO.madera)?.cantidad).toBe(100)
    const flujo = ctx.flujos.find((f) => f.dominioId === 'dom.aldea' && f.recursoId === RECURSO.madera)
    expect(flujo).toMatchObject({ entradas: 10, perdido: 20 })
  })

  it('un traslado entra en el destino, crea la fila si falta, y empuja llegadaTraslado', () => {
    const base = conAsentamiento(
      conAsentamiento(estadoMinimo(fecha(12)), { id: 'dom.origen', nombre: 'Origen', caja: 0 }),
      { id: 'dom.destino', nombre: 'Destino', caja: 0 },
    )
    const estado: EstadoPartida = {
      ...base,
      caravanas: [
        {
          id: 'car.traslado',
          dominioId: 'dom.origen',
          operacion: 'traslado',
          destinoId: 'dom.destino',
          carga: { recursoId: RECURSO.madera, cantidad: 20 },
          salida: fecha(11),
          vuelta: fecha(13),
          estado: 'enRuta',
        },
      ],
    }
    const ctx = crearContexto(estado, fecha(13), {
      avanceId: AVANCE_PRUEBA,
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    expect(filaEn(ctx, 'dom.destino', RECURSO.madera)).toBeUndefined()
    pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(13)))
    expect(filaEn(ctx, 'dom.destino', RECURSO.madera)?.cantidad).toBe(20)
    expect(caravana(ctx, 'car.traslado')?.estado).toBe('terminada')
    expect(ctx.sucesos).toContainEqual({
      tipo: 'llegadaTraslado',
      dominioId: 'dom.origen',
      fecha: fecha(13),
      destinoId: 'dom.destino',
    })
  })

  it('una vuelta ya pasada se cobra el primer día del avance', () => {
    // La compra de Tharbad vuelve, en este estado, el 10 en vez del 25: ya había pasado cuando arranca el avance.
    const estado: EstadoPartida = {
      ...estadoDe(documentoDeEjemplo()),
      caravanas: estadoDe(documentoDeEjemplo()).caravanas.map((c) =>
        c.id === CARAVANA.compraViveresTharbad ? { ...c, vuelta: fecha(10) } : c,
      ),
    }
    const ctx = contexto(estado, fecha(19))
    pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(13)))
    expect(caravana(ctx, CARAVANA.compraViveresTharbad)?.estado).toBe('terminada')
    const flujo = ctx.flujos.find((f) => f.dominioId === DOM.bree && f.recursoId === RECURSO.viveres)
    expect(flujo?.fecha).toEqual(fecha(13))
  })

  it('las ventas no las toca: sigue esperando a pasoVueltaDeVentas', () => {
    const ctx = contexto(ejemplo(), fecha(19))
    pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(18)))
    expect(caravana(ctx, CARAVANA.ventaCervezaFornost)?.estado).toBe('enRuta')
    expect(ctx.sucesos).toEqual([])
  })

  it('marca aplicada la entrada del almacén que esperaba a esta caravana (TC18)', () => {
    const base = conAsentamiento(estadoMinimo(fecha(12)), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      entradasAlmacen: [
        {
          id: 'ea.prueba',
          dominioId: 'dom.aldea',
          recursoId: RECURSO.madera,
          cantidad: 20,
          operacion: 'compra',
          fecha: fecha(1),
          caravanaId: 'car.prueba',
          aplicada: false,
        },
      ],
      caravanas: [
        {
          id: 'car.prueba',
          dominioId: 'dom.aldea',
          operacion: 'compra',
          mercadoId: 'mercado.dom.aldea',
          carga: { recursoId: RECURSO.madera, cantidad: 20 },
          precioUnidad: { base: 10000 },
          importe: { base: 200000 },
          salida: fecha(1),
          vuelta: fecha(13),
          estado: 'enRuta',
        },
      ],
    }
    const ctx = crearContexto(estado, fecha(13), {
      avanceId: AVANCE_PRUEBA,
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(13)))
    expect(ctx.entradasAlmacen[0].aplicada).toBe(true)
  })
})
