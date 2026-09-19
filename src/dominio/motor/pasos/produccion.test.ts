import { describe, expect, it } from 'vitest'
import { aNumeroDeDia } from '../../calendario/fecha'
import { RECURSO } from '../../catalogo/inicial'
import { DOM, PRODUCCION } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import type { Edificio } from '../../modelo/asentamiento'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import { filaEn } from '../almacen'
import { pasoEventos } from '../bucle'
import { crearContexto } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, conFila, congelar, estadoMinimo, recorrerPasos } from '../pruebas/constructores'
import type { OpcionesSimulacion } from '../tipos'
import { pasoProduccion } from './produccion'

function opciones(): OpcionesSimulacion {
  return { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** El ejemplo el 12 de abril, sin avances y congelado. */
function ejemplo(): EstadoPartida {
  return congelar(estadoDe(documentoDeEjemplo()))
}

/** Un asentamiento nuevo con un solo edificio y su producción (§7 l.1120). */
function conEdificio(edificio: Edificio, fechaInicial = { anio: 1640, mes: 4, dia: 1 }): EstadoPartida {
  const base = conAsentamiento(estadoMinimo(fechaInicial), { id: edificio.dominioId, nombre: 'Prueba', caja: 0 })
  return congelar({ ...base, edificios: [edificio] })
}

describe('pasoProduccion', () => {
  it('el 14 de abril entran las cinco producciones semanales del ejemplo, con su ProduccionRealizada', () => {
    const ctx = crearContexto(ejemplo(), { anio: 1640, mes: 4, dia: 14 }, opciones())
    recorrerPasos(ctx, 2, [pasoEventos, pasoProduccion])
    expect(filaEn(ctx, DOM.bree, RECURSO.viveres)?.cantidad).toBeCloseTo(310 + 72, 3)
    expect(filaEn(ctx, DOM.bree, RECURSO.madera)?.cantidad).toBeCloseTo(420 + 35, 3)
    expect(filaEn(ctx, DOM.bree, RECURSO.cerveza)?.cantidad).toBeCloseTo(90 + 20, 3)
    expect(filaEn(ctx, DOM.bree, RECURSO.piedra)?.cantidad).toBeCloseTo(180 + 16.667, 3)
    expect(filaEn(ctx, DOM.bree, RECURSO.lana)?.cantidad).toBeCloseTo(35 + 12, 3)
    const nuevas = ctx.produccionesRealizadas.filter((p) => p.avanceId === 'sim')
    expect(nuevas).toHaveLength(5)
    for (const realizada of nuevas) {
      expect(realizada.fecha).toEqual({ anio: 1640, mes: 4, dia: 14 })
      expect(realizada.perdida).toBe(0)
    }
    for (const id of [
      PRODUCCION.granjasViveres,
      PRODUCCION.aserraderoMadera,
      PRODUCCION.cerveceriaCerveza,
      PRODUCCION.canteraPiedra,
      PRODUCCION.redilLana,
    ]) {
      expect(ctx.acumulados.get(id)).toEqual({ desde: { anio: 1640, mes: 4, dia: 15 }, sumaFactores: 0 })
    }
  })

  it('los días antes de la primera ocurrencia cuentan 0 (primera el 15 de junio: el 30 de abril lleva 15)', () => {
    const estado = conEdificio({
      id: 'ed.mina',
      dominioId: 'dom.mina',
      tipoId: 'tipoed.mina',
      nombre: 'Mina',
      estado: 'activo',
      trabajadoresNecesarios: 0,
      producciones: [
        {
          id: 'prod.mina',
          recursoId: RECURSO.hierro,
          cantidad: 10,
          recurrencia: { tipo: 'cadaNMeses', n: 2, diaMes: 15, primera: { anio: 1640, mes: 6, dia: 15 } },
          acumulado: { desde: { anio: 1640, mes: 4, dia: 2 }, sumaFactores: 0 },
        },
      ],
    })
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 30 }, opciones())
    // primerDiaQueCuenta de «Cada 2 meses · día 15» con primera el 15 de junio es el 16 de abril (T5).
    expect(ctx.primerDiaQueCuenta.get('prod.mina')).toBe(aNumeroDeDia({ anio: 1640, mes: 4, dia: 16 }))
    recorrerPasos(ctx, 29, [pasoEventos, pasoProduccion])
    // Sin necesarios (factor 1), los 15 días del 16 al 30 son los que cuentan: 15 de sumaFactores.
    expect(ctx.acumulados.get('prod.mina')?.sumaFactores).toBe(15)
    expect(ctx.produccionesRealizadas).toHaveLength(0)
  })

  it('con inicio el 1 de julio no suma nada en abril (primerDiaQueCuenta posterior)', () => {
    const estado = conEdificio({
      id: 'ed.mina',
      dominioId: 'dom.mina',
      tipoId: 'tipoed.mina',
      nombre: 'Mina',
      estado: 'activo',
      trabajadoresNecesarios: 0,
      producciones: [
        {
          id: 'prod.mina',
          recursoId: RECURSO.hierro,
          cantidad: 10,
          recurrencia: { tipo: 'mensual', diaMes: 1, inicio: { anio: 1640, mes: 7, dia: 1 } },
          acumulado: { desde: { anio: 1640, mes: 4, dia: 2 }, sumaFactores: 0 },
        },
      ],
    })
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 30 }, opciones())
    recorrerPasos(ctx, 29, [pasoEventos, pasoProduccion])
    expect(ctx.acumulados.get('prod.mina')?.sumaFactores).toBe(0)
  })

  it('alquilado desde hoy: el 14 entran 90 × 4/7 = 51,429 y el 21 nada ni registro', () => {
    const estado = conEdificio(
      {
        id: 'ed.granja',
        dominioId: 'dom.granja',
        tipoId: 'tipoed.granja',
        nombre: 'Granja',
        estado: 'alquilado',
        trabajadoresNecesarios: 0,
        producciones: [
          {
            id: 'prod.granja',
            recursoId: RECURSO.viveres,
            cantidad: 90,
            recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: { anio: 1640, mes: 4, dia: 1 } },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 4 },
          },
        ],
      },
      { anio: 1640, mes: 4, dia: 10 },
    )
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 21 }, opciones())
    recorrerPasos(ctx, 11, [pasoEventos, pasoProduccion])
    // El 14: sumaFactores sigue en 4 (alquilado da factor 0 todos los días) → 90 × 4/7 = 51,429.
    const el14 = ctx.produccionesRealizadas.find((p) => p.fecha.dia === 14)
    expect(el14?.cantidad).toBeCloseTo(51.429, 3)
    // El 21: el acumulado se reinició a 0 el 14, y sigue en 0 (alquilado): produce 0 y no anota registro.
    const el21 = ctx.produccionesRealizadas.find((p) => p.fecha.dia === 21)
    expect(el21).toBeUndefined()
    expect(ctx.produccionesRealizadas).toHaveLength(1)
    expect(filaEn(ctx, 'dom.granja', RECURSO.viveres)?.cantidad).toBeCloseTo(51.429, 3)
  })

  it('capacidad: lana 95/100 + 12 → entra 5, pierde 7, con {cantidad: 5, perdida: 7}', () => {
    const sinFila = conEdificio(
      {
        id: 'ed.redil',
        dominioId: 'dom.redil',
        tipoId: 'tipoed.redil',
        nombre: 'Redil',
        estado: 'activo',
        trabajadoresNecesarios: 0,
        producciones: [
          {
            id: 'prod.lana',
            recursoId: RECURSO.lana,
            cantidad: 12,
            recurrencia: { tipo: 'diaria' },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 14 }, sumaFactores: 0 },
          },
        ],
      },
      { anio: 1640, mes: 4, dia: 13 },
    )
    const estado = conFila(sinFila, { dominioId: 'dom.redil', recursoId: RECURSO.lana, cantidad: 95, capacidad: 100 })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 14 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoProduccion])
    expect(filaEn(ctx, 'dom.redil', RECURSO.lana)?.cantidad).toBe(100)
    const realizada = ctx.produccionesRealizadas.find((p) => p.produccionId === 'prod.lana')
    expect(realizada).toMatchObject({ cantidad: 5, perdida: 7 })
  })

  it('todo perdido: la fila llena da {cantidad: 0, perdida: 12}', () => {
    const sinFila = conEdificio(
      {
        id: 'ed.redil',
        dominioId: 'dom.redil',
        tipoId: 'tipoed.redil',
        nombre: 'Redil',
        estado: 'activo',
        trabajadoresNecesarios: 0,
        producciones: [
          {
            id: 'prod.lana',
            recursoId: RECURSO.lana,
            cantidad: 12,
            recurrencia: { tipo: 'diaria' },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 14 }, sumaFactores: 0 },
          },
        ],
      },
      { anio: 1640, mes: 4, dia: 13 },
    )
    const estado = conFila(sinFila, { dominioId: 'dom.redil', recursoId: RECURSO.lana, cantidad: 100, capacidad: 100 })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 14 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoProduccion])
    const realizada = ctx.produccionesRealizadas.find((p) => p.produccionId === 'prod.lana')
    expect(realizada).toMatchObject({ cantidad: 0, perdida: 12 })
  })

  it('producción 0 no anota registro y el acumulado se reinicia igual (D-057)', () => {
    const estado = conEdificio(
      {
        id: 'ed.mina',
        dominioId: 'dom.mina',
        tipoId: 'tipoed.mina',
        nombre: 'Mina',
        estado: 'inactivo',
        trabajadoresNecesarios: 0,
        producciones: [
          {
            id: 'prod.mina',
            recursoId: RECURSO.hierro,
            cantidad: 10,
            recurrencia: { tipo: 'diaria' },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 14 }, sumaFactores: 0 },
          },
        ],
      },
      { anio: 1640, mes: 4, dia: 13 },
    )
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 14 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoProduccion])
    expect(ctx.produccionesRealizadas).toHaveLength(0)
    expect(ctx.acumulados.get('prod.mina')).toEqual({ desde: { anio: 1640, mes: 4, dia: 15 }, sumaFactores: 0 })
  })

  it('un evento +50 % de producción da 135 en vez de 90', () => {
    const sinEvento = conEdificio(
      {
        id: 'ed.granja',
        dominioId: 'dom.granja',
        tipoId: 'tipoed.granja',
        nombre: 'Granja',
        estado: 'activo',
        trabajadoresNecesarios: 0,
        producciones: [
          {
            id: 'prod.granja',
            recursoId: RECURSO.viveres,
            cantidad: 90,
            recurrencia: { tipo: 'diaria' },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 14 }, sumaFactores: 0 },
          },
        ],
      },
      { anio: 1640, mes: 4, dia: 13 },
    )
    const estado: EstadoPartida = {
      ...sinEvento,
      eventos: [
        {
          id: 'ev.bendicion',
          dominioId: 'dom.granja',
          nombre: 'Bendición de la cosecha',
          inicio: { anio: 1640, mes: 4, dia: 14 },
          duracionDias: 1,
          efectos: [{ ambito: 'produccion', objetivo: { tipo: 'edificio', id: 'ed.granja' }, pct: 50 }],
        },
      ],
    }
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 14 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoProduccion])
    const realizada = ctx.produccionesRealizadas.find((p) => p.produccionId === 'prod.granja')
    expect(realizada?.cantidad).toBeCloseTo(135, 3)
  })

  it('crea la fila de un recurso sin fila (TC10)', () => {
    const estado = conEdificio(
      {
        id: 'ed.mina',
        dominioId: 'dom.mina',
        tipoId: 'tipoed.mina',
        nombre: 'Mina',
        estado: 'activo',
        trabajadoresNecesarios: 0,
        producciones: [
          {
            id: 'prod.mina',
            recursoId: RECURSO.hierro,
            cantidad: 8.333,
            recurrencia: { tipo: 'diaria' },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 14 }, sumaFactores: 0 },
          },
        ],
      },
      { anio: 1640, mes: 4, dia: 13 },
    )
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 14 }, opciones())
    expect(filaEn(ctx, 'dom.mina', RECURSO.hierro)).toBeUndefined()
    recorrerPasos(ctx, 1, [pasoEventos, pasoProduccion])
    expect(filaEn(ctx, 'dom.mina', RECURSO.hierro)?.cantidad).toBeCloseTo(8.333, 3)
  })

  it('la mina de O5: 10 × (15 × 2/3 + 15 × 1) ÷ 30 = 8,333', () => {
    const base = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 1 }), { id: 'dom.mina', nombre: 'Mina', caja: 0 })
    const conDosMineros: EstadoPartida = {
      ...base,
      trabajadores: [
        {
          id: 'trab.mineros',
          dominioId: 'dom.mina',
          oficioId: 'oficio.minero',
          numero: 2,
          salario: { base: 0 },
          recurrencia: { tipo: 'diaria' },
          edificioId: 'ed.mina',
        },
      ],
      edificios: [
        {
          id: 'ed.mina',
          dominioId: 'dom.mina',
          tipoId: 'tipoed.mina',
          nombre: 'Mina',
          estado: 'activo',
          trabajadoresNecesarios: 3,
          producciones: [
            {
              id: 'prod.mina',
              recursoId: RECURSO.hierro,
              cantidad: 10,
              recurrencia: { tipo: 'mensual', diaMes: 1, inicio: { anio: 1640, mes: 4, dia: 1 } },
              acumulado: { desde: { anio: 1640, mes: 4, dia: 2 }, sumaFactores: 0 },
            },
          ],
        },
      ],
    }
    const ctx = crearContexto(congelar(conDosMineros), { anio: 1640, mes: 5, dia: 1 }, opciones())
    // 15 días (2 al 16 de abril) con 2 mineros de 3 (factor 2/3) y, desde el 17, la fila de mineros pasa a 3
    // (factor 1) hasta el 1 de mayo, la ocurrencia: otros 15 días. 15 × 2/3 + 15 × 1 = 25; 10 × 25 ÷ 30 = 8,333.
    recorrerPasos(ctx, 15, [pasoEventos, pasoProduccion])
    ctx.asignados.set('ed.mina', 3)
    recorrerPasos({ ...ctx, primerDia: { anio: 1640, mes: 4, dia: 17 } }, 15, [pasoEventos, pasoProduccion])
    const realizada = ctx.produccionesRealizadas.find((p) => p.produccionId === 'prod.mina')
    expect(realizada?.cantidad).toBeCloseTo(8.333, 3)
  })

  it('el 0,444 de O6: de semanal a «Mensual · día 1» con 2 de 3 y base 10 da 0,444 el 1 de mayo', () => {
    const base = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 29 }), { id: 'dom.mina', nombre: 'Mina', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      trabajadores: [
        {
          id: 'trab.mineros',
          dominioId: 'dom.mina',
          oficioId: 'oficio.minero',
          numero: 2,
          salario: { base: 0 },
          recurrencia: { tipo: 'diaria' },
          edificioId: 'ed.mina',
        },
      ],
      edificios: [
        {
          id: 'ed.mina',
          dominioId: 'dom.mina',
          tipoId: 'tipoed.mina',
          nombre: 'Mina',
          estado: 'activo',
          trabajadoresNecesarios: 3,
          producciones: [
            {
              id: 'prod.mina',
              recursoId: RECURSO.hierro,
              cantidad: 10,
              recurrencia: { tipo: 'mensual', diaMes: 1, inicio: { anio: 1640, mes: 5, dia: 1 } },
              acumulado: { desde: { anio: 1640, mes: 4, dia: 30 }, sumaFactores: 0 },
            },
          ],
        },
      ],
    }
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 5, dia: 1 }, opciones())
    recorrerPasos(ctx, 2, [pasoEventos, pasoProduccion])
    const realizada = ctx.produccionesRealizadas.find((p) => p.produccionId === 'prod.mina')
    expect(realizada?.cantidad).toBeCloseTo(0.444, 3)
  })
})
