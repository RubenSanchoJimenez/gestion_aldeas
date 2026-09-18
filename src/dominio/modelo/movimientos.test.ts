import { describe, expect, it } from 'vitest'
import {
  EsquemaMovimiento,
  EsquemaRecurrenteDinero,
  EsquemaTransferencia,
  type Movimiento,
  type RecurrenteDinero,
  type Transferencia,
} from './movimientos'

/** El peaje del camino del 12 de abril de 1640: +0,6 mo agrupados por el avance del 10 al 12 (A2). */
const PEAJE: Movimiento = {
  id: 'mov.peaje.12abril',
  dominioId: 'dom.bree',
  fecha: { anio: 1640, mes: 4, dia: 12 },
  tipo: 'ingreso',
  importe: { base: 60000 },
  categoriaId: 'cat.impuestos',
  concepto: 'Peaje del camino · 2 días',
  origen: 'avance',
  avanceId: 'av.10-12abr',
  regla: { tipo: 'impuesto', id: 'imp.peaje' },
  programado: false,
}

describe('EsquemaMovimiento', () => {
  it('acepta el peaje del 12 de abril del ejemplo', () => {
    expect(EsquemaMovimiento.parse(PEAJE)).toEqual(PEAJE)
  })

  it('rechaza un tipo que no está en la enumeración y un origen desconocido', () => {
    expect(EsquemaMovimiento.safeParse({ ...PEAJE, tipo: 'donacion' }).success).toBe(false)
    expect(EsquemaMovimiento.safeParse({ ...PEAJE, origen: 'motor' }).success).toBe(false)
    expect(EsquemaMovimiento.safeParse({ ...PEAJE, id: 'mov peaje' }).success).toBe(false)
  })

  it('exige avanceId cuando el movimiento lo creó un avance', () => {
    const sinAvance = EsquemaMovimiento.safeParse({ ...PEAJE, avanceId: undefined })
    expect(sinAvance.success).toBe(false)
    expect(sinAvance.error?.issues.map((i) => i.message)).toEqual(['Un movimiento del avance guarda su avanceId'])
    expect(EsquemaMovimiento.safeParse({ ...PEAJE, origen: 'manual', avanceId: undefined }).success).toBe(true)
  })

  it('ata el signo del importe al tipo del movimiento', () => {
    const gasto = EsquemaMovimiento.safeParse({ ...PEAJE, tipo: 'gasto', importe: { base: 60000 } })
    expect(gasto.success).toBe(false)
    expect(gasto.error?.issues.map((i) => i.message)).toEqual(['El importe de un gasto no puede ser positivo'])

    const ingreso = EsquemaMovimiento.safeParse({ ...PEAJE, importe: { base: -60000 } })
    expect(ingreso.success).toBe(false)
    expect(ingreso.error?.issues.map((i) => i.message)).toEqual(['El importe de un ingreso no puede ser negativo'])

    const suelto = EsquemaMovimiento.safeParse({ ...PEAJE, tipo: 'transferencia' })
    expect(suelto.success).toBe(false)
    expect(suelto.error?.issues.map((i) => i.message)).toEqual([
      'Solo un movimiento de transferencia lleva el vínculo «transferencia», y al revés',
    ])
  })

  it('admite un detalle de local sin localId, pero solo en el cobro agrupado de locales', () => {
    const detalleLocales = [
      {
        nombre: 'Herrería de Bree',
        mes: { anio: 1640, mes: 3 },
        produccion: { base: 3000000 },
        anotada: false,
        impuesto: { base: 450000 },
      },
    ]
    const cobro = {
      ...PEAJE,
      id: 'mov.locales.1abril',
      concepto: 'Impuestos de locales · marzo (1)',
      categoriaId: 'cat.impuestos',
      regla: { tipo: 'locales' as const, id: 'dom.bree' },
      detalleLocales,
    }
    expect(EsquemaMovimiento.parse(cobro)).toEqual(cobro)

    const sinRegla = EsquemaMovimiento.safeParse({ ...cobro, regla: { tipo: 'impuesto', id: 'imp.peaje' } })
    expect(sinRegla.success).toBe(false)
    expect(sinRegla.error?.issues.map((i) => i.message)).toEqual([
      'El detalle por local solo va en el cobro agrupado de impuestos de locales',
    ])
    expect(EsquemaMovimiento.safeParse({ ...cobro, detalleLocales: [] }).success).toBe(false)
  })

  it('admite el detalle por trabajador solo en salarios o en soldadas (decisión 16)', () => {
    const detalleTrabajo = [
      { origenId: 'trab.granjeros', nombre: 'Granjeros', numero: 6, importe: { base: 180000 } },
      { nombre: 'Pastor', numero: 1, importe: { base: 30000 } },
    ]
    const salarios = {
      ...PEAJE,
      id: 'mov.salarios.13abril',
      tipo: 'gasto' as const,
      importe: { base: -210000 },
      categoriaId: 'cat.salarios',
      concepto: 'Salarios · Bree',
      regla: { tipo: 'salarios' as const, id: 'dom.bree' },
      detalleTrabajo,
    }
    expect(EsquemaMovimiento.parse(salarios)).toEqual(salarios)
    expect(
      EsquemaMovimiento.safeParse({ ...salarios, regla: { tipo: 'soldadas', id: 'dom.bree' } }).success,
    ).toBe(true)

    const mal = EsquemaMovimiento.safeParse({ ...salarios, regla: { tipo: 'recurrente', id: 'rec.posada' } })
    expect(mal.success).toBe(false)
    expect(mal.error?.issues.map((i) => i.message)).toEqual([
      'El detalle por trabajador solo va en el pago agrupado de salarios o de soldadas',
    ])
  })

  it('guarda las transferencias y las reglas recurrentes del personaje', () => {
    const transferencia: Transferencia = {
      id: 'trf.bree-archet.6abril',
      fecha: { anio: 1640, mes: 4, dia: 6 },
      importe: { base: 6000000, introducido: { cantidad: '60', moneda: 'mo' } },
      saleDeId: 'dom.bree',
      entraEnId: 'dom.archet',
      movimientoSaleId: 'mov.trf.sale',
      movimientoEntraId: 'mov.trf.entra',
    }
    expect(EsquemaTransferencia.parse(transferencia)).toEqual(transferencia)

    const mismoDominio = EsquemaTransferencia.safeParse({ ...transferencia, entraEnId: 'dom.bree' })
    expect(mismoDominio.success).toBe(false)
    expect(mismoDominio.error?.issues.map((i) => i.message)).toEqual([
      '«Sale de» y «Entra en» deben ser distintos',
    ])

    const posada: RecurrenteDinero = {
      id: 'rec.posada',
      dominioId: 'dom.tharan',
      tipo: 'gasto',
      concepto: 'Posada El Poney Pisador',
      importe: { base: 20000, introducido: { cantidad: '0,2', moneda: 'mo' } },
      categoriaId: 'cat.alojamiento',
      cuentaId: 'dom.tharan',
      recurrencia: { tipo: 'diaria', inicio: { anio: 1640, mes: 4, dia: 1 } },
      activo: true,
      unidadDiaria: 'noches',
    }
    expect(EsquemaRecurrenteDinero.parse(posada)).toEqual(posada)

    const frecuenciaMala = EsquemaRecurrenteDinero.safeParse({
      ...posada,
      recurrencia: { tipo: 'cadaNDias', n: 1, primera: { anio: 1640, mes: 4, dia: 1 } },
    })
    expect(frecuenciaMala.success).toBe(false)
    expect(frecuenciaMala.error?.issues.map((i) => i.message)).toEqual([
      'N debe ser un número entero de 2 a 366',
    ])
  })
})
