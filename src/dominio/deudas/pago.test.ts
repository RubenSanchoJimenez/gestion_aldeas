import { describe, expect, it } from 'vitest'
import { DEUDA, DOM } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Deuda } from '../modelo/deudas'
import type { EstadoPartida } from '../modelo/documento'
import { estadoDe } from '../modelo/documento'
import { repartirPago, vistaPreviaDePago } from './pago'

function ejemplo(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

function deuda(estado: EstadoPartida, id: string): Deuda {
  const encontrada = estado.deudas.find((d) => d.id === id)
  if (encontrada === undefined) {
    throw new Error('no existe la deuda ' + id)
  }
  return encontrada
}

describe('repartirPago', () => {
  it('«intereses y capital» cubre primero los intereses: 15 mo al Gremio son 2 de intereses y 13 de capital (O3)', () => {
    expect(repartirPago(deuda(ejemplo(), DEUDA.gremioTharan), 1500000, 'interesesYCapital')).toEqual({
      aIntereses: 200000,
      aCapital: 1300000,
      sobra: 0,
    })
  })

  it('«solo capital» y «solo intereses» van a lo suyo, y lo que sobra pasa a la otra parte', () => {
    const gremio = deuda(ejemplo(), DEUDA.gremioTharan)
    expect(repartirPago(gremio, 1500000, 'soloCapital')).toEqual({ aIntereses: 0, aCapital: 1500000, sobra: 0 })
    expect(repartirPago(gremio, 100000, 'soloIntereses')).toEqual({ aIntereses: 100000, aCapital: 0, sobra: 0 })
    expect(repartirPago(gremio, 500000, 'soloIntereses')).toEqual({ aIntereses: 200000, aCapital: 300000, sobra: 0 })
  })

  it('lo que pasa de lo pendiente queda en «sobra» y no se aplica', () => {
    expect(repartirPago(deuda(ejemplo(), DEUDA.hobart), 900000, 'interesesYCapital')).toEqual({
      aIntereses: 0,
      aCapital: 400000,
      sobra: 500000,
    })
  })
})

describe('vistaPreviaDePago', () => {
  it('el pago de 15 mo al Gremio: capital 27 mo, próximo interés 1,35 mo y la bolsa en 31,518 mo (O3)', () => {
    const estado = ejemplo()
    expect(vistaPreviaDePago(estado, DEUDA.gremioTharan, { importe: 1500000, aplicarA: 'interesesYCapital', cuentaId: DOM.tharan })).toEqual({
      aIntereses: 200000,
      aCapital: 1300000,
      sobra: 0,
      capitalAntes: 4000000,
      interesesAntes: 200000,
      pendienteAntes: 4200000,
      capitalDespues: 2700000,
      interesesDespues: 0,
      pendienteDespues: 2700000,
      proximoInteres: 135000,
      saldoAntes: 4651800,
      saldoDespues: 3151800,
      saldaLaDeuda: false,
    })
  })

  it('un pago que cubre todo lo pendiente salda la deuda y deja el próximo interés en 0', () => {
    const estado = ejemplo()
    const previa = vistaPreviaDePago(estado, DEUDA.gremioTharan, { importe: 4200000, aplicarA: 'interesesYCapital', cuentaId: DOM.tharan })
    expect(previa).toMatchObject({ pendienteDespues: 0, proximoInteres: 0, saldaLaDeuda: true })
  })

  it('en un préstamo que te deben, el dinero entra en la cuenta elegida', () => {
    const estado = ejemplo()
    const previa = vistaPreviaDePago(estado, DEUDA.dalen, { importe: 1500000, aplicarA: 'interesesYCapital', cuentaId: DOM.tharan })
    expect(previa).toMatchObject({ saldoAntes: 4651800, saldoDespues: 6151800, pendienteDespues: 0, saldaLaDeuda: true })
  })

  it('sin cuenta («solo anotar»), no hay saldo antes ni después', () => {
    const estado = ejemplo()
    const previa = vistaPreviaDePago(estado, DEUDA.hobart, { importe: 400000, aplicarA: 'interesesYCapital' })
    expect(previa.saldoAntes).toBeUndefined()
    expect(previa.saldoDespues).toBeUndefined()
    expect(previa.saldaLaDeuda).toBe(true)
  })

  it('una deuda de otro dominio usa la caja de ese dominio', () => {
    const estado = ejemplo()
    const previa = vistaPreviaDePago(estado, DEUDA.gremioBree, { importe: 1000000, aplicarA: 'soloCapital', cuentaId: DOM.bree })
    expect(previa.saldoAntes).toBe(34060000)
    expect(previa.saldoDespues).toBe(33060000)
  })

  it('no muta el estado que recibe', () => {
    const estado = ejemplo()
    const antes = JSON.stringify(estado.deudas)
    vistaPreviaDePago(estado, DEUDA.gremioTharan, { importe: 1500000, aplicarA: 'interesesYCapital', cuentaId: DOM.tharan })
    expect(JSON.stringify(estado.deudas)).toBe(antes)
  })
})
