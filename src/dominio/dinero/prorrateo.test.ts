import { describe, it, expect } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import type { Recurrencia } from '../calendario/recurrencia'
import { formatearOroProrrateado } from './formato'
import { aBase } from './importe'
import { EQUIVALENCIAS_POR_DEFECTO } from './monedas'
import { alMes, factorMensual, sumarAlMes, type PartidaMensual } from './prorrateo'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** Oro tecleado → hierro: mo('4,2') = 420000 mh. */
function mo(cantidad: string): number {
  return aBase(cantidad, 'mo', EQ)
}

/** Fecha para las recurrencias que piden primera vez: el prorrateo no depende de ella. */
const PRIMERA: Fecha = { anio: 1640, mes: 4, dia: 13 }

// Frecuencias de las reglas de Bree. El día elegido no cambia el prorrateo: se usa el viernes de los salarios (A5)
// y el día 1 de los impuestos de locales (A3b).
const CADA_DIA: Recurrencia = { tipo: 'diaria' }
const SEMANAL: Recurrencia = { tipo: 'semanal', diaSemana: 4 }
const CADA_DOS_SEMANAS: Recurrencia = { tipo: 'quincenal', primera: PRIMERA }
const MENSUAL: Recurrencia = { tipo: 'mensual', diaMes: 1 }

describe('factorMensual', () => {
  it('pasa cada frecuencia a 30 días con la tabla de la especificación (§3)', () => {
    expect(factorMensual({ tipo: 'diaria' })).toBe(30)
    expect(factorMensual({ tipo: 'cadaNDias', n: 10, primera: PRIMERA })).toBe(3)
    expect(factorMensual({ tipo: 'cadaNDias', n: 45, primera: PRIMERA })).toBe(30 / 45)
    expect(factorMensual({ tipo: 'semanal', diaSemana: 4 })).toBe(30 / 7)
    expect(factorMensual({ tipo: 'quincenal', primera: PRIMERA })).toBe(30 / 14)
    expect(factorMensual({ tipo: 'mensual', diaMes: 1 })).toBe(1)
    expect(factorMensual({ tipo: 'cadaNMeses', n: 2, diaMes: 13, primera: PRIMERA })).toBe(1 / 2)
    expect(factorMensual({ tipo: 'trimestral', diaMes: 13, primera: PRIMERA })).toBe(1 / 3)
    expect(factorMensual({ tipo: 'anual', mes: 4, diaMes: 13 })).toBe(1 / 12)
    expect(factorMensual({ tipo: 'unica', fecha: PRIMERA })).toBe(0)
  })

  it('no depende del día elegido ni de la primera vez', () => {
    expect(factorMensual({ tipo: 'semanal', diaSemana: 0 })).toBe(30 / 7)
    expect(factorMensual({ tipo: 'mensual', diaMes: 31 })).toBe(1)
    expect(factorMensual({ tipo: 'quincenal', primera: { anio: 1, mes: 1, dia: 1 } })).toBe(30 / 14)
  })
})

describe('alMes', () => {
  it('aranceles de Bree: 3 mo cada semana = 1285714 mh al mes, «+12,9 mo»', () => {
    const aranceles = alMes(mo('3'), SEMANAL)
    expect(aranceles).toBe(1285714)
    expect(formatearOroProrrateado(aranceles, EQ, { signo: true })).toBe('+12,9 mo')
  })

  it('salarios de Bree: 4,2 mo cada semana = 1800000 mh al mes, «18 mo»', () => {
    const salarios = alMes(mo('4,2'), SEMANAL)
    expect(salarios).toBe(1800000)
    expect(formatearOroProrrateado(salarios, EQ)).toBe('18 mo')
  })

  it('soldada de Bree: 5,8 mo cada dos semanas = 1242857 mh al mes', () => {
    expect(alMes(mo('5,8'), CADA_DOS_SEMANAS)).toBe(1242857)
  })

  it('peaje de Bree: 0,3 mo cada día = 900000 mh al mes', () => {
    expect(alMes(mo('0,3'), CADA_DIA)).toBe(900000)
  })

  it('mensual: el mismo importe (impuesto por hogar, alquiler del molino y diezmo de Bree)', () => {
    expect(alMes(mo('12,4'), MENSUAL)).toBe(1240000)
    expect(alMes(mo('5'), MENSUAL)).toBe(500000)
    expect(alMes(mo('25'), MENSUAL)).toBe(2500000)
  })

  it('cada N días, cada N meses, trimestral y anual', () => {
    expect(alMes(mo('2'), { tipo: 'cadaNDias', n: 10, primera: PRIMERA })).toBe(600000)
    expect(alMes(mo('12'), { tipo: 'cadaNMeses', n: 2, diaMes: 13, primera: PRIMERA })).toBe(600000)
    expect(alMes(mo('10'), { tipo: 'trimestral', diaMes: 13, primera: PRIMERA })).toBe(333333)
    expect(alMes(mo('1'), { tipo: 'anual', mes: 4, diaMes: 13 })).toBe(8333)
  })

  it('una sola vez no cuenta: 0', () => {
    expect(alMes(mo('100'), { tipo: 'unica', fecha: PRIMERA })).toBe(0)
  })

  it('redondea al mh con las mitades hacia arriba, también en negativo, y sin −0', () => {
    // 1 mh cada 4 días = 7,5 mh al mes; 18 mh al año = 1,5 mh al mes.
    expect(alMes(1, { tipo: 'cadaNDias', n: 4, primera: PRIMERA })).toBe(8)
    expect(alMes(-1, { tipo: 'cadaNDias', n: 4, primera: PRIMERA })).toBe(-7)
    expect(alMes(18, { tipo: 'anual', mes: 4, diaMes: 13 })).toBe(2)
    expect(alMes(-18, { tipo: 'anual', mes: 4, diaMes: 13 })).toBe(-1)
    // 6 mh cada semana = 25,714… mh al mes.
    expect(alMes(6, SEMANAL)).toBe(26)
    expect(alMes(-6, SEMANAL)).toBe(-26)
    expect(alMes(-mo('3'), SEMANAL)).toBe(-1285714)
    // −1 mh al año = −0,083 mh al mes → 0, y no −0 (toBe distingue 0 de −0).
    expect(alMes(-1, { tipo: 'anual', mes: 4, diaMes: 13 })).toBe(0)
  })

  it('es exacto donde la coma flotante falla', () => {
    // 11 mh cada 44 días = 7,5 mh al mes, pero en coma flotante 11 × (30 / 44) queda por debajo de 7,5.
    expect(11 * (30 / 44)).toBe(7.499999999999999)
    expect(alMes(11, { tipo: 'cadaNDias', n: 44, primera: PRIMERA })).toBe(8)
    // El mayor entero seguro × 30 pasa de Number.MAX_SAFE_INTEGER, y la coma flotante sube 1 mh.
    expect(Math.round((Number.MAX_SAFE_INTEGER * 30) / 90)).toBe(3002399751580331)
    expect(alMes(Number.MAX_SAFE_INTEGER, { tipo: 'cadaNDias', n: 90, primera: PRIMERA })).toBe(3002399751580330)
  })
})

describe('sumarAlMes', () => {
  /** Las tres unidades de la guarnición de Bree (A6): 6 × 0,3 mo, 4 × 0,5 mo y 1 × 2 mo cada dos semanas. */
  const SOLDADAS_BREE: PartidaMensual[] = [
    { base: 6 * mo('0,3'), recurrencia: CADA_DOS_SEMANAS },
    { base: 4 * mo('0,5'), recurrencia: CADA_DOS_SEMANAS },
    { base: 1 * mo('2'), recurrencia: CADA_DOS_SEMANAS },
  ]

  /** Las cinco filas de trabajadores de Bree (A5), cada viernes: 6 × 0,3, 3 × 0,3, 2 × 0,4, 2 × 0,3 y 1 × 0,1 mo. */
  const SALARIOS_BREE: PartidaMensual[] = [
    { base: 6 * mo('0,3'), recurrencia: SEMANAL },
    { base: 3 * mo('0,3'), recurrencia: SEMANAL },
    { base: 2 * mo('0,4'), recurrencia: SEMANAL },
    { base: 2 * mo('0,3'), recurrencia: SEMANAL },
    { base: 1 * mo('0,1'), recurrencia: SEMANAL },
  ]

  /** El diezmo de Bree, su único tributo (A3): 25 mo el día 1 de cada mes. */
  const DIEZMO_BREE: PartidaMensual = { base: mo('25'), recurrencia: MENSUAL }

  it('sin partidas da 0', () => {
    expect(sumarAlMes([])).toBe(0)
  })

  it('con una sola partida da lo mismo que alMes, también con mitades, negativos y sin −0', () => {
    const casos: PartidaMensual[] = [
      { base: mo('3'), recurrencia: SEMANAL },
      { base: mo('5,8'), recurrencia: CADA_DOS_SEMANAS },
      { base: 1, recurrencia: { tipo: 'cadaNDias', n: 4, primera: PRIMERA } },
      { base: -1, recurrencia: { tipo: 'cadaNDias', n: 4, primera: PRIMERA } },
      { base: 11, recurrencia: { tipo: 'cadaNDias', n: 44, primera: PRIMERA } },
      { base: -6, recurrencia: SEMANAL },
      { base: -1, recurrencia: { tipo: 'anual', mes: 4, diaMes: 13 } },
    ]
    for (const partida of casos) {
      expect(sumarAlMes([partida])).toBe(alMes(partida.base, partida.recurrencia))
    }
    expect(sumarAlMes([{ base: -1, recurrencia: { tipo: 'anual', mes: 4, diaMes: 13 } }])).toBe(0)
  })

  it('las tres soldadas de Bree suman 1.242.857 al mes, con un solo redondeo; fila a fila serían 1.242.856', () => {
    expect(sumarAlMes(SOLDADAS_BREE)).toBe(1242857)
    const filaAFila = SOLDADAS_BREE.reduce((suma, p) => suma + alMes(p.base, p.recurrencia), 0)
    expect(filaAFila).toBe(1242856)
  })

  it('lo que sale de Bree al mes: salarios, soldadas y diezmo = 5.542.857, «55,4 mo» (§7)', () => {
    const salen = sumarAlMes([...SALARIOS_BREE, ...SOLDADAS_BREE, DIEZMO_BREE])
    expect(salen).toBe(5542857)
    expect(formatearOroProrrateado(salen, EQ)).toBe('55,4 mo')
    expect(sumarAlMes(SALARIOS_BREE)).toBe(1800000)
    expect(sumarAlMes([DIEZMO_BREE])).toBe(2500000)
  })

  it('«Una sola vez» no cuenta: suma 0', () => {
    const unica: PartidaMensual = { base: mo('100'), recurrencia: { tipo: 'unica', fecha: PRIMERA } }
    expect(sumarAlMes([unica])).toBe(0)
    expect(sumarAlMes([unica, DIEZMO_BREE])).toBe(2500000)
  })
})

describe('balance mensual de Bree (§7)', () => {
  it('entran 44 · salen 55,4 → balance −11,5 mo', () => {
    // Ingresos recurrentes (A3): impuesto por hogar, aranceles, alquiler del molino y peaje.
    const impuestoPorHogar = alMes(mo('12,4'), MENSUAL)
    const aranceles = alMes(mo('3'), SEMANAL)
    const alquilerDelMolino = alMes(mo('5'), MENSUAL)
    const peaje = alMes(mo('0,3'), CADA_DIA)
    expect([impuestoPorHogar, aranceles, alquilerDelMolino, peaje]).toEqual([1240000, 1285714, 500000, 900000])
    const ingresosSinLocales = impuestoPorHogar + aranceles + alquilerDelMolino + peaje
    expect(ingresosSinLocales).toBe(3925714)

    // Impuestos de los cuatro locales con la producción habitual (A3b): 1 + 3,2 + 0,3 + 0,2 mo el día 1 de cada mes.
    const locales = alMes(mo('1') + mo('3,2') + mo('0,3') + mo('0,2'), MENSUAL)
    expect(locales).toBe(470000)
    const ingresos = ingresosSinLocales + locales
    expect(ingresos).toBe(4395714)

    // Gastos recurrentes: salarios (A5), soldada (A6) y el diezmo, que es un tributo (A3).
    const salarios = alMes(mo('4,2'), SEMANAL)
    const soldada = alMes(mo('5,8'), CADA_DOS_SEMANAS)
    const diezmo = alMes(mo('25'), MENSUAL)
    expect([salarios, soldada, diezmo]).toEqual([1800000, 1242857, 2500000])
    const gastos = salarios + soldada + diezmo
    expect(gastos).toBe(5542857)

    const balance = ingresos - gastos
    expect(balance).toBe(-1147143)

    // A1: balance «−11,5 mo», con «entran 44 · salen 55,4».
    expect(formatearOroProrrateado(ingresos, EQ, { signo: true })).toBe('+44 mo')
    expect(formatearOroProrrateado(gastos, EQ)).toBe('55,4 mo')
    expect(formatearOroProrrateado(balance, EQ, { signo: true })).toBe('−11,5 mo')

    // A3: «−25 mo al mes» en Tributos y «Resultado fiscal: +19 mo al mes» (ingresos menos tributos).
    expect(formatearOroProrrateado(-diezmo, EQ, { signo: true })).toBe('−25 mo')
    expect(formatearOroProrrateado(ingresos - diezmo, EQ, { signo: true })).toBe('+19 mo')
  })
})
