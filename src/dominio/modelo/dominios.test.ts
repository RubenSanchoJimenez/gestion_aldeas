import { describe, expect, it } from 'vitest'
import {
  EsquemaCaja,
  EsquemaDominio,
  type Caja,
  type DominioAsentamiento,
  type DominioPersonaje,
} from './dominios'

/** El personaje de «La Sombra del Este». */
const THARAN: DominioPersonaje = {
  id: 'dom.tharan',
  tipo: 'personaje',
  nombre: 'Tharan',
  descripcion: 'Explorador del Norte',
}

/** Bree, el pueblo del ejemplo. */
const BREE: DominioAsentamiento = {
  id: 'dom.bree',
  tipo: 'asentamiento',
  nombre: 'Bree',
  categoria: 'pueblo',
  alta: { anio: 1640, mes: 1, dia: 1 },
}

describe('EsquemaDominio', () => {
  it('acepta el personaje y el asentamiento del ejemplo', () => {
    expect(EsquemaDominio.parse(THARAN)).toEqual(THARAN)
    expect(EsquemaDominio.parse(BREE)).toEqual(BREE)
  })

  it('rechaza un tipo de dominio y una categoría que no existen', () => {
    expect(EsquemaDominio.safeParse({ ...BREE, tipo: 'reino' }).success).toBe(false)
    expect(EsquemaDominio.safeParse({ ...BREE, categoria: 'aldehuela' }).success).toBe(false)
    expect(EsquemaDominio.safeParse({ ...THARAN, alta: { anio: 1640, mes: 1, dia: 1 } }).success).toBe(true)
  })
})

describe('EsquemaCaja', () => {
  it('acepta la bolsa de Tharan y rechaza un saldo inicial negativo', () => {
    const bolsa: Caja = { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } }
    expect(EsquemaCaja.parse(bolsa)).toEqual(bolsa)

    const negativa = EsquemaCaja.safeParse({ dominioId: 'dom.bree', saldoInicial: { base: -1 } })
    expect(negativa.success).toBe(false)
    expect(negativa.error?.issues.map((i) => i.message)).toEqual(['El importe no puede ser negativo'])
  })
})
