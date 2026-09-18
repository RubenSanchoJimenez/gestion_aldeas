import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import { EsquemaMovimiento } from '../modelo/movimientos'
import { crearContexto, type Contexto } from './contexto'
import { acumularDiario, cerrarDiarios, type EntradaDiaria } from './diarios'
import { idsEnSerie } from './ids'
import { conAsentamiento, congelar, estadoMinimo } from './pruebas/constructores'

/** El 19 de abril de 1640: el último día del avance de P4, que se simula del 13 al 19. */
const HASTA: Fecha = { anio: 1640, mes: 4, dia: 19 }

/** El día `dia` de abril de 1640. */
function abril(dia: number): Fecha {
  return { anio: 1640, mes: 4, dia }
}

/** Tharan y Bree, sin reglas: los diarios reciben lo cobrado o pagado ya calculado por los pasos. */
function contexto(): Contexto {
  const estado = congelar(conAsentamiento(estadoMinimo(), { id: 'dom.bree', nombre: 'Bree', caja: 5000000 }))
  return crearContexto(estado, HASTA, { avanceId: 'av.prueba', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() })
}

/** Lo que paga un día la posada de Tharan (0,1 mo por noche). */
function posada(dia: number, importe = 10000): EntradaDiaria {
  return {
    clase: 'regla',
    regla: { tipo: 'recurrente', id: 'rec.posada' },
    dominioId: 'dom.tharan',
    tipo: 'gasto',
    categoriaId: 'cat.alojamiento',
    concepto: 'Posada El Poney Pisador',
    unidadDiaria: 'noches',
    fecha: abril(dia),
    importe,
  }
}

/** Lo que cobra un día el peaje de Bree (0,3 mo). */
function peaje(dia: number): EntradaDiaria {
  return {
    clase: 'regla',
    regla: { tipo: 'impuesto', id: 'imp.peaje' },
    dominioId: 'dom.bree',
    tipo: 'ingreso',
    categoriaId: CATEGORIA.impuestos,
    concepto: 'Peaje del camino',
    fecha: abril(dia),
    importe: 30000,
  }
}

/** Lo pagado un día a una fila de trabajadores diarios de Bree. */
function salario(dia: number, origenId: string, nombre: string, numero: number, importe: number): EntradaDiaria {
  return {
    clase: 'salarios',
    regla: { tipo: 'salarios', id: 'dom.bree' },
    dominioId: 'dom.bree',
    tipo: 'gasto',
    categoriaId: CATEGORIA.salarios,
    concepto: '',
    fecha: abril(dia),
    importe,
    fila: { origenId, nombre, numero, importe: { base: importe } },
  }
}

describe('acumularDiario y cerrarDiarios', () => {
  it('siete noches de posada dan «· 7 noches» por −70.000, fechado el último día y sin introducido (§9 l.1285)', () => {
    const ctx = contexto()
    for (let dia = 13; dia <= 19; dia++) {
      acumularDiario(ctx, posada(dia))
    }
    expect(ctx.movimientos).toHaveLength(0)
    cerrarDiarios(ctx)
    expect(ctx.movimientos).toEqual([
      {
        id: 'sim.1',
        dominioId: 'dom.tharan',
        fecha: HASTA,
        tipo: 'gasto',
        importe: { base: -70000 },
        categoriaId: 'cat.alojamiento',
        concepto: 'Posada El Poney Pisador · 7 noches',
        regla: { tipo: 'recurrente', id: 'rec.posada' },
        origen: 'avance',
        avanceId: 'av.prueba',
        programado: false,
      },
    ])
    expect(EsquemaMovimiento.safeParse(ctx.movimientos[0]).success).toBe(true)
    expect(Object.fromEntries(ctx.saldos)).toEqual(ctx.saldosAntes)
  })

  it('una regla que empieza a mitad del avance cuenta solo sus días: «Peaje del camino · 3 días»', () => {
    const ctx = contexto()
    for (let dia = 17; dia <= 19; dia++) {
      acumularDiario(ctx, peaje(dia))
    }
    cerrarDiarios(ctx)
    expect(ctx.movimientos).toHaveLength(1)
    expect(ctx.movimientos[0].concepto).toBe('Peaje del camino · 3 días')
    expect(ctx.movimientos[0].importe).toEqual({ base: 90000 })
    expect(ctx.movimientos[0].tipo).toBe('ingreso')
  })

  it('los días sin dinero no cuentan ni suman: «· 5 noches» por −50.000 (D-021)', () => {
    const ctx = contexto()
    for (const dia of [13, 14, 15, 18, 19]) {
      acumularDiario(ctx, posada(dia))
    }
    acumularDiario(ctx, posada(16, 0))
    acumularDiario(ctx, posada(17, 0))
    cerrarDiarios(ctx)
    expect(ctx.movimientos.map((m) => [m.concepto, m.importe.base])).toEqual([
      ['Posada El Poney Pisador · 5 noches', -50000],
    ])
  })

  it('salarios diarios: cada día cuenta una vez aunque paguen varias filas, con el detalle por fila (D-029)', () => {
    const ctx = contexto()
    for (let dia = 13; dia <= 19; dia++) {
      acumularDiario(ctx, salario(dia, 'trab.pastores', 'Pastores', 3, 30000))
      if (dia < 19) {
        acumularDiario(ctx, salario(dia, 'trab.granjeros', 'Granjeros', 2, 20000))
      }
    }
    cerrarDiarios(ctx)
    expect(ctx.movimientos).toHaveLength(1)
    const [movimiento] = ctx.movimientos
    expect(movimiento.concepto).toBe('Salarios de 5 trabajadores · 7 días')
    expect(movimiento.importe).toEqual({ base: -(7 * 30000 + 6 * 20000) })
    expect(movimiento.regla).toEqual({ tipo: 'salarios', id: 'dom.bree' })
    expect(movimiento.categoriaId).toBe(CATEGORIA.salarios)
    expect(movimiento.detalleTrabajo).toEqual([
      { origenId: 'trab.pastores', nombre: 'Pastores', numero: 3, importe: { base: 210000 } },
      { origenId: 'trab.granjeros', nombre: 'Granjeros', numero: 2, importe: { base: 120000 } },
    ])
    expect(EsquemaMovimiento.safeParse(movimiento).success).toBe(true)
  })

  it('soldadas diarias: «Soldada de la guarnición · 2 días» con su detalle', () => {
    const ctx = contexto()
    for (const dia of [18, 19]) {
      acumularDiario(ctx, {
        clase: 'soldadas',
        regla: { tipo: 'soldadas', id: 'dom.bree' },
        dominioId: 'dom.bree',
        tipo: 'gasto',
        categoriaId: CATEGORIA.soldadas,
        concepto: '',
        fecha: abril(dia),
        importe: 40000,
        fila: { origenId: 'unidad.guardias', nombre: 'Guardias de la puerta', numero: 4, importe: { base: 40000 } },
      })
    }
    cerrarDiarios(ctx)
    expect(ctx.movimientos[0].concepto).toBe('Soldada de la guarnición · 2 días')
    expect(ctx.movimientos[0].detalleTrabajo).toEqual([
      { origenId: 'unidad.guardias', nombre: 'Guardias de la puerta', numero: 4, importe: { base: 80000 } },
    ])
    expect(EsquemaMovimiento.safeParse(ctx.movimientos[0]).success).toBe(true)
  })

  it('cierra en el orden en que se abrieron, y un beneficio diario lleva su inversionId (T10)', () => {
    const ctx = contexto()
    for (let dia = 13; dia <= 14; dia++) {
      acumularDiario(ctx, {
        clase: 'regla',
        regla: { tipo: 'beneficio', id: 'inv.barcaza' },
        dominioId: 'dom.tharan',
        tipo: 'ingreso',
        categoriaId: CATEGORIA.beneficiosDeInversiones,
        concepto: 'Beneficio de Barcaza del Brandivino',
        inversionId: 'inv.barcaza',
        fecha: abril(dia),
        importe: 5000,
      })
      acumularDiario(ctx, posada(dia))
    }
    cerrarDiarios(ctx)
    expect(ctx.movimientos.map((m) => m.concepto)).toEqual([
      'Beneficio de Barcaza del Brandivino · 2 días',
      'Posada El Poney Pisador · 2 noches',
    ])
    expect(ctx.movimientos[0].inversionId).toBe('inv.barcaza')
    expect('inversionId' in ctx.movimientos[1]).toBe(false)
    expect(EsquemaMovimiento.safeParse(ctx.movimientos[0]).success).toBe(true)
  })

  it('sin nada que acumular, o con todo a 0, no crea ningún movimiento (D-022)', () => {
    const vacio = contexto()
    cerrarDiarios(vacio)
    expect(vacio.movimientos).toEqual([])
    const aCero = contexto()
    acumularDiario(aCero, posada(13, 0))
    cerrarDiarios(aCero)
    expect(aCero.movimientos).toEqual([])
    expect(aCero.diarios.size).toBe(0)
  })
})
