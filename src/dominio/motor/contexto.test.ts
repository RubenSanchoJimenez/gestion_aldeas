import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, type Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { DOM, MOV_THARAN, RECURRENTE } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { EsquemaEstadoPartida, estadoDe, type EstadoPartida } from '../modelo/documento'
import { EsquemaMovimiento, type Movimiento } from '../modelo/movimientos'
import { anadirMovimiento, aplicarProgramado, crearContexto, estadoFinal } from './contexto'
import { idsEnSerie } from './ids'
import { congelar, estadoMinimo } from './pruebas/constructores'
import type { OpcionesSimulacion } from './tipos'

/** El 19 de abril de 1640: el último día del avance de P4. */
const HASTA: Fecha = { anio: 1640, mes: 4, dia: 19 }

function opciones(): OpcionesSimulacion {
  return { avanceId: 'av.prueba', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** El ejemplo el 12 de abril, sin avances y congelado: el motor no puede tocarlo. */
function ejemplo(): EstadoPartida {
  return congelar(estadoDe(documentoDeEjemplo()))
}

/** Un movimiento manual y programado de la bolsa de Tharan; el signo va en `base`. */
function programado(id: string, fecha: Fecha, base: number, extra: Partial<Movimiento> = {}): Movimiento {
  return {
    id,
    dominioId: DOM.tharan,
    fecha,
    tipo: base < 0 ? 'gasto' : 'ingreso',
    importe: { base },
    categoriaId: CATEGORIA.otros,
    concepto: 'Prueba',
    origen: 'manual',
    programado: true,
    ...extra,
  }
}

describe('crearContexto', () => {
  it('empieza el día siguiente a la fecha actual, con los saldos de saldosPorDominio (§9)', () => {
    const estado = ejemplo()
    const ctx = crearContexto(estado, HASTA, opciones())
    expect(ctx.primerDia).toEqual({ anio: 1640, mes: 4, dia: 13 })
    expect(ctx.hasta).toEqual(HASTA)
    expect(ctx.saldosAntes).toEqual({ [DOM.tharan]: 4651800, [DOM.bree]: 34060000, [DOM.archet]: 8500000 })
    expect(ctx.saldosAntes).toEqual(saldosPorDominio(estado))
    expect(Object.fromEntries(ctx.saldos)).toEqual(ctx.saldosAntes)
    expect(ctx.estado).toBe(estado)
  })

  it('copia las colecciones que escribe el motor y empieza sin nada sumado (T29)', () => {
    const estado = ejemplo()
    const ctx = crearContexto(estado, HASTA, opciones())
    expect(ctx.movimientos).toEqual(estado.movimientos)
    expect(ctx.movimientos).not.toBe(estado.movimientos)
    expect(ctx.deudas).not.toBe(estado.deudas)
    expect(ctx.personas).not.toBe(estado.personas)
    expect(ctx.localesComerciales).not.toBe(estado.localesComerciales)
    expect(ctx.caravanas).not.toBe(estado.caravanas)
    expect(ctx.objetos).not.toBe(estado.objetos)
    expect(ctx.caravanas).toEqual(estado.caravanas)
    const posada = estado.movimientos.findIndex((m) => m.id === MOV_THARAN.posada12Abril)
    expect(ctx.indiceMovimiento.get(MOV_THARAN.posada12Abril)).toBe(posada)
    expect(ctx.indiceMovimiento.size).toBe(estado.movimientos.length)
    expect(ctx.programadosPorDia.size).toBe(0)
    expect([ctx.personasNuevas, ctx.sucesos]).toEqual([[], []])
    expect([ctx.diarios.size, ctx.cargosDiarios.size]).toEqual([0, 0])
  })

  it('indexa por día los programados sin vínculo del avance; los de fecha pasada, en el primer día (T14)', () => {
    const estado = congelar({
      ...estadoMinimo(),
      movimientos: [
        programado('p.dia15', { anio: 1640, mes: 4, dia: 15 }, -10000),
        programado('p.pasado', { anio: 1640, mes: 4, dia: 10 }, -20000),
        programado('p.obra', { anio: 1640, mes: 4, dia: 15 }, -30000, { vinculo: { tipo: 'obra', id: 'obra.x' } }),
        programado('p.hoy', { anio: 1640, mes: 4, dia: 12 }, 40000),
        programado('p.dia15b', { anio: 1640, mes: 4, dia: 15 }, 50000),
        programado('p.aplicado', { anio: 1640, mes: 4, dia: 15 }, 60000, { programado: false }),
        programado('p.despues', { anio: 1640, mes: 4, dia: 20 }, -70000),
      ],
    })
    const ctx = crearContexto(estado, HASTA, opciones())
    expect(ctx.programadosPorDia.size).toBe(2)
    expect(ctx.programadosPorDia.get(aNumeroDeDia({ anio: 1640, mes: 4, dia: 13 }))).toEqual(['p.pasado', 'p.hoy'])
    expect(ctx.programadosPorDia.get(aNumeroDeDia({ anio: 1640, mes: 4, dia: 15 }))).toEqual(['p.dia15', 'p.dia15b'])
    expect(ctx.saldos.get(DOM.tharan)).toBe(60000)
  })
})

describe('anadirMovimiento', () => {
  it('añade un movimiento del avance con un id nuevo, sin claves vacías y sin tocar los saldos', () => {
    const ctx = crearContexto(ejemplo(), HASTA, opciones())
    const id = anadirMovimiento(ctx, {
      dominioId: DOM.tharan,
      fecha: HASTA,
      tipo: 'gasto',
      importe: { base: -70000 },
      categoriaId: 'cat.alojamiento',
      concepto: 'Posada El Poney Pisador · 7 noches',
      regla: { tipo: 'recurrente', id: RECURRENTE.posada },
      inversionId: undefined,
    })
    expect(id).toBe('sim.1')
    const movimiento = ctx.movimientos[ctx.movimientos.length - 1]
    expect(movimiento).toEqual({
      id: 'sim.1',
      dominioId: DOM.tharan,
      fecha: HASTA,
      tipo: 'gasto',
      importe: { base: -70000 },
      categoriaId: 'cat.alojamiento',
      concepto: 'Posada El Poney Pisador · 7 noches',
      regla: { tipo: 'recurrente', id: RECURRENTE.posada },
      origen: 'avance',
      avanceId: 'av.prueba',
      programado: false,
    })
    expect('inversionId' in movimiento).toBe(false)
    expect(EsquemaMovimiento.safeParse(movimiento).success).toBe(true)
    expect(ctx.indiceMovimiento.get('sim.1')).toBe(ctx.movimientos.length - 1)
    expect(Object.fromEntries(ctx.saldos)).toEqual(ctx.saldosAntes)
  })
})

describe('aplicarProgramado', () => {
  it('deja el programado aplicado con el avanceId y los cambios, y quita las claves que llegan vacías (§6.4 l.768)', () => {
    const capa = programado('p.capa', { anio: 1640, mes: 4, dia: 15 }, -1200000, {
      importe: { base: -1200000, introducido: { cantidad: '12', moneda: 'mo' } },
      objetoPendiente: {
        nombre: 'Capa élfica',
        cantidad: 1,
        valorUnitario: { base: 1200000 },
        ubicacion: { tipo: 'encima' },
      },
    })
    const estado = congelar({ ...estadoMinimo(), movimientos: [capa] })
    const ctx = crearContexto(estado, HASTA, opciones())
    aplicarProgramado(ctx, 'p.capa', { importe: { base: -600000 }, objetoPendiente: undefined })
    expect(ctx.movimientos[0]).toEqual({
      id: 'p.capa',
      dominioId: DOM.tharan,
      fecha: { anio: 1640, mes: 4, dia: 15 },
      tipo: 'gasto',
      importe: { base: -600000 },
      categoriaId: CATEGORIA.otros,
      concepto: 'Prueba',
      origen: 'manual',
      programado: false,
      avanceId: 'av.prueba',
    })
    expect('objetoPendiente' in ctx.movimientos[0]).toBe(false)
    expect(EsquemaMovimiento.safeParse(ctx.movimientos[0]).success).toBe(true)
    expect(estado.movimientos[0]).toBe(capa)
    expect(capa.programado).toBe(true)
    expect(() => aplicarProgramado(ctx, 'p.inventado', {})).toThrow('No existe «p.inventado»')
  })
})

describe('estadoFinal', () => {
  it('pone la fecha actual en hasta, lleva lo que escribió el motor y comparte el resto con la entrada', () => {
    const estado = ejemplo()
    const ctx = crearContexto(estado, HASTA, opciones())
    anadirMovimiento(ctx, {
      dominioId: DOM.bree,
      fecha: HASTA,
      tipo: 'ingreso',
      importe: { base: 210000 },
      categoriaId: CATEGORIA.impuestos,
      concepto: 'Peaje del camino · 7 días',
    })
    const final = estadoFinal(ctx)
    expect(final.partida).toEqual({ ...estado.partida, fechaActual: HASTA })
    expect(final.movimientos).toBe(ctx.movimientos)
    expect(final.movimientos).toHaveLength(estado.movimientos.length + 1)
    const escritas = ['partida', 'movimientos', 'deudas', 'personas', 'localesComerciales', 'caravanas', 'objetos']
    for (const clave of Object.keys(estado) as (keyof EstadoPartida)[]) {
      if (!escritas.includes(clave)) {
        expect(final[clave]).toBe(estado[clave])
      }
    }
    expect(EsquemaEstadoPartida.safeParse(final).success).toBe(true)
  })

  it('no arrastra los avances aunque reciba un DocumentoPartida (T12)', () => {
    const documento = congelar(documentoDeEjemplo())
    const final = estadoFinal(crearContexto(documento, HASTA, opciones()))
    expect('avances' in final).toBe(false)
    expect(Object.keys(final)).toHaveLength(34)
  })
})
