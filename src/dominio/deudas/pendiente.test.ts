import { describe, expect, it } from 'vitest'
import { DEUDA } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Deuda } from '../modelo/deudas'
import { estadoDeDeuda, estaSaldada, interesDelPeriodo, pendienteDe } from './pendiente'

/** Las tres deudas del ejemplo, tal como están el 12 de abril de 1640. */
function deudaDelEjemplo(id: string): Deuda {
  const deudas = documentoDeEjemplo().deudas
  const deuda = deudas.find((d) => d.id === id)
  if (deuda === undefined) {
    throw new Error('no existe la deuda ' + id)
  }
  return deuda
}

describe('estadoDeDeuda', () => {
  it('el préstamo del Gremio: 60 mo menos dos pagos de 10 a capital, más el interés del 1 de abril (O1)', () => {
    const estado = estadoDeDeuda(deudaDelEjemplo(DEUDA.gremioTharan))
    expect(estado).toEqual({
      capital: 4000000,
      interesesDevengados: 200000,
      interesesPagados: 0,
      capitalPagado: 2000000,
      interesesPendientes: 200000,
      pendiente: 4200000,
      saldada: false,
    })
  })

  it('una deuda sin intereses ni pagos: todo el principal queda pendiente', () => {
    expect(estadoDeDeuda(deudaDelEjemplo(DEUDA.hobart))).toMatchObject({
      capital: 400000,
      interesesDevengados: 0,
      interesesPendientes: 0,
      pendiente: 400000,
      saldada: false,
    })
  })

  it('un préstamo que te deben se calcula igual: el sentido no cambia las cifras', () => {
    const dalen = deudaDelEjemplo(DEUDA.dalen)
    expect(dalen.sentido).toBe('meDeben')
    expect(pendienteDe(dalen)).toBe(1500000)
  })

  it('reparte cada pago según su «Se aplica a»: primero intereses y después capital', () => {
    const deuda: Deuda = {
      ...deudaDelEjemplo(DEUDA.gremioTharan),
      pagos: [
        {
          id: 'pago.mixto',
          fecha: { anio: 1640, mes: 4, dia: 10 },
          importe: { base: 1500000 },
          aplicarA: 'interesesYCapital',
          movimientoId: 'mov.x',
        },
      ],
    }
    // 15 mo: 2 a los intereses devengados y 13 al capital de 60 mo.
    expect(estadoDeDeuda(deuda)).toMatchObject({
      capital: 4700000,
      interesesPagados: 200000,
      capitalPagado: 1300000,
      interesesPendientes: 0,
      pendiente: 4700000,
    })
  })

  it('«solo intereses» no toca el capital, y lo que sobra de los intereses no se pierde: pasa al capital', () => {
    const base = deudaDelEjemplo(DEUDA.gremioTharan)
    const soloIntereses: Deuda = {
      ...base,
      pagos: [
        {
          id: 'pago.int',
          fecha: { anio: 1640, mes: 4, dia: 10 },
          importe: { base: 100000 },
          aplicarA: 'soloIntereses',
          movimientoId: 'mov.x',
        },
      ],
    }
    expect(estadoDeDeuda(soloIntereses)).toMatchObject({ capital: 6000000, interesesPagados: 100000, interesesPendientes: 100000 })

    const deMas: Deuda = {
      ...base,
      pagos: [
        {
          id: 'pago.int',
          fecha: { anio: 1640, mes: 4, dia: 10 },
          importe: { base: 500000 },
          aplicarA: 'soloIntereses',
          movimientoId: 'mov.x',
        },
      ],
    }
    expect(estadoDeDeuda(deMas)).toMatchObject({ interesesPagados: 200000, capitalPagado: 300000, interesesPendientes: 0 })
  })

  it('nunca deja cifras negativas: un pago mayor que lo pendiente la deja saldada', () => {
    const deuda: Deuda = {
      ...deudaDelEjemplo(DEUDA.hobart),
      pagos: [
        {
          id: 'pago.todo',
          fecha: { anio: 1640, mes: 4, dia: 10 },
          importe: { base: 900000 },
          aplicarA: 'interesesYCapital',
          movimientoId: 'mov.x',
        },
      ],
    }
    expect(estadoDeDeuda(deuda)).toMatchObject({ capital: 0, pendiente: 0, saldada: true })
    expect(estaSaldada(deuda)).toBe(true)
  })

  it('un pago con fecha anterior a un devengo no lo recalcula: los devengos están ya sumados (esp l.1162)', () => {
    const deuda: Deuda = {
      ...deudaDelEjemplo(DEUDA.gremioTharan),
      pagos: [
        {
          id: 'pago.antiguo',
          fecha: { anio: 1640, mes: 3, dia: 20 },
          importe: { base: 2000000 },
          aplicarA: 'soloCapital',
          movimientoId: 'mov.x',
        },
      ],
    }
    expect(estadoDeDeuda(deuda)).toMatchObject({ capital: 4000000, interesesDevengados: 200000, pendiente: 4200000 })
  })

  it('la deuda de impago de un asentamiento: su principal es la suma de sus cargos', () => {
    const bree = deudaDelEjemplo(DEUDA.gremioBree)
    expect(pendienteDe(bree)).toBe(bree.principal.base)
  })
})

describe('interesDelPeriodo', () => {
  it('el 5 % del capital pendiente del Gremio: 40 mo → 2 mo', () => {
    expect(interesDelPeriodo(deudaDelEjemplo(DEUDA.gremioTharan))).toBe(200000)
  })

  it('sin interés o saldada, 0', () => {
    expect(interesDelPeriodo(deudaDelEjemplo(DEUDA.hobart))).toBe(0)
    const saldada: Deuda = { ...deudaDelEjemplo(DEUDA.gremioTharan), estado: 'saldada' }
    expect(interesDelPeriodo(saldada)).toBe(0)
  })

  it('redondea al hierro con las mitades hacia arriba', () => {
    const deuda: Deuda = {
      ...deudaDelEjemplo(DEUDA.gremioTharan),
      principal: { base: 4500001 },
      pagos: [],
      interesPct: 0.01,
    }
    // 0,01 % de 4.500.001 mh = 450,0001 → 450.
    expect(interesDelPeriodo(deuda)).toBe(450)
  })
})
