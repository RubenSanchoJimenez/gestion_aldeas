import { describe, expect, it } from 'vitest'
import { claveExistencia } from '../../almacen/cantidades'
import { CATEGORIA, RECURSO } from '../../catalogo/inicial'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import { DOM, OBRA } from '../../ejemplo/ids'
import type { Caravana } from '../../modelo/comercio'
import type { EntradaAlmacen, Existencia } from '../../modelo/almacen'
import type { Obra } from '../../modelo/asentamiento'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import type { Fecha } from '../../calendario/fecha'
import { filaEn } from '../almacen'
import { crearContexto, type Contexto } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, diaDe, estadoMinimo, recorrerPasos } from '../pruebas/constructores'
import type { OpcionesSimulacion } from '../tipos'
import { pasoInicio } from './inicio'

/** El 12 de abril de 1640: la fecha actual del ejemplo y de estadoMinimo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

function fecha(dia: number, mes = 4): Fecha {
  return { anio: 1640, mes, dia }
}

/** Opciones de una simulación de prueba: ids en serie «sim.1»… y el catálogo del ejemplo. */
function opciones(): OpcionesSimulacion {
  return { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** Un contexto sobre `estado`, simulando hasta `hasta`. */
function contexto(estado: EstadoPartida, hasta: Fecha): Contexto {
  return crearContexto(estado, hasta, opciones())
}

describe('pasoInicio: obras', () => {
  it('empieza el 14 con sus materiales y su gasto programado: madera 360, piedra 150, caja −45 mo (ejemplo)', () => {
    const base = estadoDe(documentoDeEjemplo())
    const estado: EstadoPartida = {
      ...base,
      obras: base.obras.map((o) =>
        o.id === OBRA.cerveceria
          ? { ...o, estado: 'programada', inicio: fecha(14), movimientoId: 'mov.prueba.cerveceria' }
          : o,
      ),
      movimientos: [
        ...base.movimientos,
        {
          id: 'mov.prueba.cerveceria',
          dominioId: DOM.bree,
          fecha: fecha(14),
          tipo: 'gasto',
          importe: { base: -4500000, introducido: { cantidad: '45', moneda: 'mo' } },
          categoriaId: CATEGORIA.obras,
          concepto: 'Obra: ampliar la cervecería',
          origen: 'manual',
          vinculo: { tipo: 'obra', id: OBRA.cerveceria },
          programado: true,
        },
      ],
    }
    const ctx = contexto(estado, fecha(14))
    const saldoAntes = ctx.saldosAntes[DOM.bree]
    recorrerPasos(ctx, 2, [pasoInicio])
    expect(filaEn(ctx, DOM.bree, RECURSO.madera)?.cantidad).toBe(360)
    expect(filaEn(ctx, DOM.bree, RECURSO.piedra)?.cantidad).toBe(150)
    expect(saldoAntes - (ctx.saldos.get(DOM.bree) ?? 0)).toBe(4500000)
    const movimiento = ctx.movimientos.find((m) => m.id === 'mov.prueba.cerveceria')
    expect(movimiento).toMatchObject({ fecha: fecha(14), programado: false, avanceId: 'sim' })
    const obra = ctx.obras.find((o) => o.id === OBRA.cerveceria)
    expect(obra).toMatchObject({ estado: 'enCurso', inicio: fecha(14) })
  })

  /** Una obra mínima en el dominio dado, con esos materiales y ese coste (0 = sin movimiento, D-045). */
  function obraDePrueba(datos: {
    dominioId: string
    materiales: Record<string, number>
    inicio: Fecha
    coste?: number
    movimientoId?: string
  }): Obra {
    return {
      id: 'obra.prueba',
      dominioId: datos.dominioId,
      nombre: 'Obra de prueba',
      estado: 'programada',
      coste: { base: datos.coste ?? 0 },
      materiales: datos.materiales,
      inicio: datos.inicio,
      diasTotales: 10,
      efecto: { tipo: 'repararEdificio', objetivoId: 'ed.inexistente' },
      movimientoId: datos.movimientoId,
    }
  }

  it('sin materiales no empieza; lo reintenta y empieza el día que llegan, con ese día de inicio', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [obraDePrueba({ dominioId: 'dom.aldea', materiales: { [RECURSO.madera]: 10 }, inicio: fecha(13) })],
    }
    const ctx = contexto(estado, fecha(14))
    pasoInicio(ctx, diaDe(fecha(13)))
    expect(ctx.obras[0].estado).toBe('programada')
    // Los materiales llegan el 14, un día después de lo programado.
    ctx.existencias.set(claveExistencia('dom.aldea', RECURSO.madera), {
      dominioId: 'dom.aldea',
      recursoId: RECURSO.madera,
      cantidad: 10,
    })
    pasoInicio(ctx, diaDe(fecha(14)))
    expect(ctx.obras[0]).toMatchObject({ estado: 'enCurso', inicio: fecha(14) })
    expect(filaEn(ctx, 'dom.aldea', RECURSO.madera)?.cantidad).toBe(0)
  })

  it('sin dinero no empieza, y no crea impago ni deuda', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [
        obraDePrueba({
          dominioId: 'dom.aldea',
          materiales: {},
          inicio: fecha(13),
          coste: 500000,
          movimientoId: 'mov.prueba.obra',
        }),
      ],
      movimientos: [
        {
          id: 'mov.prueba.obra',
          dominioId: 'dom.aldea',
          fecha: fecha(13),
          tipo: 'gasto',
          importe: { base: -500000 },
          categoriaId: CATEGORIA.obras,
          concepto: 'Obra: obra de prueba',
          origen: 'manual',
          vinculo: { tipo: 'obra', id: 'obra.prueba' },
          programado: true,
        },
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.obras[0].estado).toBe('programada')
    expect(ctx.deudas).toEqual([])
    expect(ctx.movimientos.find((m) => m.id === 'mov.prueba.obra')?.programado).toBe(true)
    expect(ctx.saldos.get('dom.aldea')).toBe(0)
  })

  it('una obra programada con fecha ya pasada empieza el primer día del avance', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [obraDePrueba({ dominioId: 'dom.aldea', materiales: {}, inicio: fecha(1) })],
    }
    const ctx = contexto(estado, fecha(20))
    recorrerPasos(ctx, 1, [pasoInicio])
    // ctx.primerDia es el 13 de abril: el día siguiente a la fecha actual (el 12).
    expect(ctx.obras[0]).toMatchObject({ estado: 'enCurso', inicio: fecha(13) })
  })

  it('dos obras compiten por la misma caja el mismo día: gana la primera de la lista', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 500000 })
    const movimiento = (id: string, base: number) => ({
      id,
      dominioId: 'dom.aldea',
      fecha: fecha(13),
      tipo: 'gasto' as const,
      importe: { base },
      categoriaId: CATEGORIA.obras,
      concepto: 'Obra',
      origen: 'manual' as const,
      vinculo: { tipo: 'obra' as const, id },
      programado: true,
    })
    const estado: EstadoPartida = {
      ...base,
      obras: [
        obraDePrueba({ dominioId: 'dom.aldea', materiales: {}, inicio: fecha(13), coste: 500000, movimientoId: 'mov.1' }),
        { ...obraDePrueba({ dominioId: 'dom.aldea', materiales: {}, inicio: fecha(13), coste: 500000, movimientoId: 'mov.2' }), id: 'obra.prueba.2' },
      ].map((o, i) => (i === 0 ? { ...o, id: 'obra.prueba.1' } : o)),
      movimientos: [movimiento('mov.1', -500000), movimiento('mov.2', -500000)],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.obras.find((o) => o.id === 'obra.prueba.1')?.estado).toBe('enCurso')
    expect(ctx.obras.find((o) => o.id === 'obra.prueba.2')?.estado).toBe('programada')
    expect(ctx.saldos.get('dom.aldea')).toBe(0)
  })
})

describe('pasoInicio: caravanas', () => {
  function caravanaDePrueba(datos: Partial<Caravana> & Pick<Caravana, 'operacion' | 'dominioId' | 'carga'>): Caravana {
    return {
      id: 'car.prueba',
      salida: fecha(12),
      vuelta: fecha(20),
      estado: 'programada',
      ...datos,
    }
  }

  it('una compra programada con salida el 12 (hoy) sale el 13 y vuelve el 21, en vez del 20', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 3000000 })
    const estado: EstadoPartida = {
      ...base,
      mercados: [...base.mercados, { id: 'mer.prueba', nombre: 'Fornost', precios: [] }],
      caravanas: [
        caravanaDePrueba({
          operacion: 'compra',
          dominioId: 'dom.aldea',
          carga: { recursoId: RECURSO.madera, cantidad: 100 },
          mercadoId: 'mer.prueba',
          movimientoSalidaId: 'mov.salida',
        }),
      ],
      movimientos: [
        {
          id: 'mov.salida',
          dominioId: 'dom.aldea',
          fecha: fecha(12),
          tipo: 'gasto',
          importe: { base: -3000000 },
          categoriaId: CATEGORIA.comercio,
          concepto: 'Caravana: compra de madera en Fornost',
          origen: 'manual',
          vinculo: { tipo: 'caravana', id: 'car.prueba' },
          programado: true,
        },
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    const caravana = ctx.caravanas[0]
    expect(caravana).toMatchObject({ estado: 'enRuta', salida: fecha(13), vuelta: fecha(21) })
    expect(ctx.movimientos.find((m) => m.id === 'mov.salida')).toMatchObject({ programado: false, fecha: fecha(13) })
    expect(ctx.saldos.get('dom.aldea')).toBe(0)
  })

  it('una venta programada saca su carga del almacén', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.cerveza, cantidad: 90 }],
      caravanas: [
        caravanaDePrueba({
          operacion: 'venta',
          dominioId: 'dom.aldea',
          carga: { recursoId: RECURSO.cerveza, cantidad: 40 },
          salida: fecha(13),
        }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.caravanas[0].estado).toBe('enRuta')
    expect(filaEn(ctx, 'dom.aldea', RECURSO.cerveza)?.cantidad).toBe(50)
  })

  it('una venta sin carga suficiente no sale', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.cerveza, cantidad: 10 }],
      caravanas: [
        caravanaDePrueba({
          operacion: 'venta',
          dominioId: 'dom.aldea',
          carga: { recursoId: RECURSO.cerveza, cantidad: 40 },
          salida: fecha(13),
        }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.caravanas[0].estado).toBe('programada')
    expect(filaEn(ctx, 'dom.aldea', RECURSO.cerveza)?.cantidad).toBe(10)
  })

  it('un traslado saca la carga del asentamiento de origen', () => {
    const base = conAsentamiento(
      conAsentamiento(estadoMinimo(HOY), { id: 'dom.origen', nombre: 'Origen', caja: 0 }),
      { id: 'dom.destino', nombre: 'Destino', caja: 0 },
    )
    const estado: EstadoPartida = {
      ...base,
      existencias: [
        ...base.existencias,
        { dominioId: 'dom.origen', recursoId: RECURSO.madera, cantidad: 50 },
      ],
      caravanas: [
        caravanaDePrueba({
          operacion: 'traslado',
          dominioId: 'dom.origen',
          destinoId: 'dom.destino',
          carga: { recursoId: RECURSO.madera, cantidad: 20 },
          salida: fecha(13),
        }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.caravanas[0].estado).toBe('enRuta')
    expect(filaEn(ctx, 'dom.origen', RECURSO.madera)?.cantidad).toBe(30)
    // El traslado no entra en el destino hasta el paso 7 (T13): sin fila todavía.
    expect(filaEn(ctx, 'dom.destino', RECURSO.madera)).toBeUndefined()
  })

  it('una compra sin dinero suficiente no sale', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      mercados: [...base.mercados, { id: 'mer.prueba', nombre: 'Fornost', precios: [] }],
      caravanas: [
        caravanaDePrueba({
          operacion: 'compra',
          dominioId: 'dom.aldea',
          carga: { recursoId: RECURSO.madera, cantidad: 100 },
          mercadoId: 'mer.prueba',
          movimientoSalidaId: 'mov.salida',
          salida: fecha(13),
        }),
      ],
      movimientos: [
        {
          id: 'mov.salida',
          dominioId: 'dom.aldea',
          fecha: fecha(13),
          tipo: 'gasto',
          importe: { base: -3000000 },
          categoriaId: CATEGORIA.comercio,
          concepto: 'Caravana: compra de madera en Fornost',
          origen: 'manual',
          vinculo: { tipo: 'caravana', id: 'car.prueba' },
          programado: true,
        },
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.caravanas[0].estado).toBe('programada')
    expect(ctx.movimientos.find((m) => m.id === 'mov.salida')?.programado).toBe(true)
  })
})

describe('pasoInicio: entradas del almacén', () => {
  function entradaDePrueba(datos: Partial<EntradaAlmacen> & Pick<EntradaAlmacen, 'dominioId' | 'recursoId' | 'cantidad' | 'operacion'>): EntradaAlmacen {
    return {
      id: 'ea.prueba',
      fecha: fecha(13),
      aplicada: false,
      ...datos,
    }
  }

  it('una compra local programada paga y entra', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 300000 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 0 }],
      entradasAlmacen: [
        entradaDePrueba({
          dominioId: 'dom.aldea',
          recursoId: RECURSO.madera,
          cantidad: 30,
          operacion: 'compra',
          mercadoId: 'mercado.dom.aldea',
          precioUnidad: { base: 10000 },
          movimientoId: 'mov.compra',
        }),
      ],
      movimientos: [
        {
          id: 'mov.compra',
          dominioId: 'dom.aldea',
          fecha: fecha(13),
          tipo: 'gasto',
          importe: { base: -300000 },
          categoriaId: CATEGORIA.viveresDelAlmacen,
          concepto: 'Compra de madera en Aldea',
          origen: 'manual',
          vinculo: { tipo: 'entradaAlmacen', id: 'ea.prueba' },
          programado: true,
        },
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.madera)?.cantidad).toBe(30)
    expect(ctx.entradasAlmacen[0]).toMatchObject({ aplicada: true, fecha: fecha(13) })
    expect(ctx.movimientos.find((m) => m.id === 'mov.compra')).toMatchObject({ programado: false, fecha: fecha(13) })
  })

  it('una recepción sin coste programada entra sin pagar nada', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 0 }],
      entradasAlmacen: [
        entradaDePrueba({ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 30, operacion: 'recepcion' }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.madera)?.cantidad).toBe(30)
    expect(ctx.entradasAlmacen[0]).toMatchObject({ aplicada: true, fecha: fecha(13) })
    expect(ctx.saldos.get('dom.aldea')).toBe(0)
  })

  it('una recepción de 1.000 sacos con solo 890 de hueco: entran 890 y se pierden 110', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const fila: Existencia = { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 310, capacidad: 1200 }
    const estado: EstadoPartida = {
      ...base,
      existencias: [fila],
      entradasAlmacen: [
        entradaDePrueba({ dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 1000, operacion: 'recepcion' }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBe(1200)
    const flujo = ctx.flujos.find((f) => f.dominioId === 'dom.aldea' && f.recursoId === RECURSO.viveres)
    expect(flujo?.entradas).toBeCloseTo(890, 6)
    expect(flujo?.perdido).toBeCloseTo(110, 6)
  })

  it('una compra sin movimiento de pago lanza un error', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 300000 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 0 }],
      entradasAlmacen: [
        entradaDePrueba({
          dominioId: 'dom.aldea',
          recursoId: RECURSO.madera,
          cantidad: 30,
          operacion: 'compra',
          mercadoId: 'mercado.dom.aldea',
          precioUnidad: { base: 10000 },
        }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    expect(() => recorrerPasos(ctx, 1, [pasoInicio])).toThrow('La compra de Madera no tiene su movimiento de pago')
  })

  it('una entrada con caravanaId no se toca en este paso (TC18)', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 0 }],
      entradasAlmacen: [
        entradaDePrueba({
          dominioId: 'dom.aldea',
          recursoId: RECURSO.viveres,
          cantidad: 100,
          operacion: 'compra',
          caravanaId: 'car.prueba',
        }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.entradasAlmacen[0].aplicada).toBe(false)
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBe(0)
  })
})
