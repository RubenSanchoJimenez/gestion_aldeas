import { describe, expect, it } from 'vitest'
import { EsquemaDeuda, type Deuda } from './deudas'

/** La deuda de Tharan con el Gremio de mercaderes de Bree: 42 mo al 4,5 % trimestral (J4). */
const GREMIO: Deuda = {
  id: 'deuda.gremio',
  dominioId: 'dom.tharan',
  sentido: 'debo',
  contraparteId: 'persona.gremio-bree',
  fecha: { anio: 1640, mes: 4, dia: 1 },
  principal: { base: 4200000, introducido: { cantidad: '42', moneda: 'mo' } },
  interesPct: 4.5,
  recurrenciaInteres: { tipo: 'trimestral', diaMes: 1, primera: { anio: 1640, mes: 7, dia: 1 } },
  vencimiento: { anio: 1641, mes: 4, dia: 1 },
  notas: 'Adelanto para el granero',
  estado: 'abierta',
  impago: false,
  pagos: [
    {
      id: 'pago.gremio.1',
      fecha: { anio: 1640, mes: 4, dia: 10 },
      importe: { base: 1500000, introducido: { cantidad: '15', moneda: 'mo' } },
      aplicarA: 'interesesYCapital',
      movimientoId: 'mov.pago.gremio.1',
    },
  ],
  devengos: [{ fecha: { anio: 1640, mes: 4, dia: 1 }, importe: { base: 189000 }, avanceId: 'av.31mar-6abr' }],
}

describe('EsquemaDeuda', () => {
  it('acepta la deuda del Gremio con su interés, sus pagos y sus devengos', () => {
    expect(EsquemaDeuda.parse(GREMIO)).toEqual(GREMIO)
  })

  it('no tiene campo «concepto» y deja sin frecuencia las deudas sin interés (decisión 12)', () => {
    const sinInteres = {
      ...GREMIO,
      id: 'deuda.espada',
      interesPct: 0,
      recurrenciaInteres: undefined,
      vencimiento: undefined,
      notas: 'Arreglo de la espada',
      pagos: [],
      devengos: [],
    }
    const leida = EsquemaDeuda.parse(sinInteres)
    expect(leida).toEqual(sinInteres)
    expect('concepto' in leida).toBe(false)
    expect(EsquemaDeuda.parse({ ...sinInteres, concepto: 'Arreglo de la espada' })).toEqual(sinInteres)

    const conFrecuencia = EsquemaDeuda.safeParse({
      ...sinInteres,
      recurrenciaInteres: { tipo: 'trimestral', diaMes: 1, primera: { anio: 1640, mes: 7, dia: 1 } },
    })
    expect(conFrecuencia.success).toBe(false)
    expect(conFrecuencia.error?.issues.map((i) => i.message)).toEqual([
      'La frecuencia del interés va si y solo si el interés es mayor que 0',
    ])
  })

  it('exige origen y cargos en una deuda de impago, y los prohíbe en las demás', () => {
    const impago: Deuda = {
      ...GREMIO,
      id: 'deuda.impago.salarios',
      dominioId: 'dom.archet',
      contraparteId: 'persona.trabajadores-archet',
      interesPct: 0,
      recurrenciaInteres: undefined,
      vencimiento: undefined,
      notas: undefined,
      impago: true,
      origenImpago: { tipo: 'salarios', id: 'dom.archet' },
      cargos: [{ fecha: { anio: 1640, mes: 4, dia: 10 }, importe: { base: 420000 }, avanceId: 'av.6-10abr' }],
      pagos: [],
      devengos: [],
    }
    expect(EsquemaDeuda.parse(impago)).toEqual(impago)

    const sinOrigen = EsquemaDeuda.safeParse({ ...impago, origenImpago: undefined })
    expect(sinOrigen.success).toBe(false)
    expect(sinOrigen.error?.issues.map((i) => i.message)).toEqual(['Una deuda de impago guarda su origen'])

    const sinCargos = EsquemaDeuda.safeParse({ ...impago, cargos: [] })
    expect(sinCargos.success).toBe(false)
    expect(sinCargos.error?.issues.map((i) => i.message)).toEqual(['Una deuda de impago guarda sus cargos'])

    const normalConCargos = EsquemaDeuda.safeParse({ ...impago, impago: false, interesPct: 0 })
    expect(normalConCargos.success).toBe(false)
    expect(normalConCargos.error?.issues.map((i) => i.message)).toEqual([
      'Solo las deudas de impago llevan origen y cargos',
    ])
  })
})
