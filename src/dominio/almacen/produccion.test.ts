import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { EDIFICIO } from '../ejemplo/ids'
import { EDIFICIOS } from '../ejemplo/asentamientosAlmacen'
import { TRABAJADORES } from '../ejemplo/asentamientosDinero'
import type { RecurrenciaProduccion } from '../modelo/comunes'
import {
  asignadosPorEdificio,
  cantidadDeOcurrencia,
  diasAcumulados,
  diasDelPeriodo,
  factorDiario,
  primerDiaQueCuenta,
} from './produccion'

/** Atajo para escribir fechas en las pruebas: f(1640, 4, 12) es el 12 de abril de 1640. */
function f(anio: number, mes: number, dia: number): Fecha {
  return { anio, mes, dia }
}

describe('asignadosPorEdificio', () => {
  it('suma numero de los trabajadores con ese edificioId: la cantera del ejemplo tiene 2 canteros', () => {
    const asignados = asignadosPorEdificio(TRABAJADORES)
    expect(asignados.get(EDIFICIO.cantera)).toBe(2)
    expect(asignados.get(EDIFICIO.granjas)).toBe(6)
  })

  it('un trabajador sin edificioId no cuenta en ningún edificio', () => {
    const asignados = asignadosPorEdificio(TRABAJADORES)
    // Los albañiles de Archet no tienen edificioId (obras, no un edificio).
    let total = 0
    for (const numero of asignados.values()) total += numero
    const sumaConEdificio = TRABAJADORES.filter((t) => t.edificioId !== undefined).reduce((s, t) => s + t.numero, 0)
    expect(total).toBe(sumaConEdificio)
  })
})

describe('factorDiario', () => {
  const cantera = EDIFICIOS.find((e) => e.id === EDIFICIO.cantera)!

  it('activo con necesarios > 0: mín(1, asignados / necesarios) — la cantera con 2 de 3 da 2/3', () => {
    expect(factorDiario(cantera, 2, 0)).toBeCloseTo(2 / 3, 6)
  })

  it('dañado, inactivo o alquilado dan 0, aunque haya asignados y eventos favorables', () => {
    expect(factorDiario({ estado: 'daniado', trabajadoresNecesarios: 3 }, 3, 50)).toBe(0)
    expect(factorDiario({ estado: 'inactivo', trabajadoresNecesarios: 3 }, 3, 50)).toBe(0)
    expect(factorDiario({ estado: 'alquilado', trabajadoresNecesarios: 3 }, 3, 50)).toBe(0)
  })

  it('sin necesarios (0), el factor de trabajadores vale 1 aunque no haya nadie asignado', () => {
    expect(factorDiario({ estado: 'activo', trabajadoresNecesarios: 0 }, 0, 0)).toBe(1)
  })

  it('más asignados que necesarios no pasa de 1 (mín(1, …))', () => {
    expect(factorDiario({ estado: 'activo', trabajadoresNecesarios: 2 }, 5, 0)).toBe(1)
  })

  it('los eventos aplican conEfectoCantidad: −20 % da 0,8 y −150 % da 0, nunca negativo', () => {
    expect(factorDiario({ estado: 'activo', trabajadoresNecesarios: 0 }, 0, -20)).toBeCloseTo(0.8, 6)
    expect(factorDiario({ estado: 'activo', trabajadoresNecesarios: 0 }, 0, -150)).toBe(0)
  })
})

describe('primerDiaQueCuenta', () => {
  it('semanal sin inicio: sin primera ocurrencia, null', () => {
    const r: RecurrenciaProduccion = { tipo: 'semanal', diaSemana: 5 }
    expect(primerDiaQueCuenta(r)).toBeNull()
  })

  it('«Cada 2 meses · día 15» con primera el 15 de junio: el día siguiente a la teórica de abril, 16 de abril', () => {
    const r: RecurrenciaProduccion = { tipo: 'cadaNMeses', n: 2, diaMes: 15, primera: f(1640, 6, 15) }
    expect(primerDiaQueCuenta(r)).toEqual(f(1640, 4, 16))
  })

  it('«Mensual · día 1» con inicio el 1 de julio: el día siguiente a la teórica de junio, 2 de junio', () => {
    const r: RecurrenciaProduccion = { tipo: 'mensual', diaMes: 1, inicio: f(1640, 7, 1) }
    expect(primerDiaQueCuenta(r)).toEqual(f(1640, 6, 2))
  })

  it('semanal del ejemplo (sábados) con inicio el 1 de abril: 1 de abril', () => {
    const r: RecurrenciaProduccion = { tipo: 'semanal', diaSemana: 5, inicio: f(1640, 4, 1) }
    expect(primerDiaQueCuenta(r)).toEqual(f(1640, 4, 1))
  })
})

describe('diasDelPeriodo', () => {
  it('mensual: el 1 de mayo cierra un periodo de 30 días (abril)', () => {
    const r: RecurrenciaProduccion = { tipo: 'mensual', diaMes: 1, inicio: f(1640, 4, 1) }
    expect(diasDelPeriodo(r, f(1640, 5, 1))).toBe(30)
  })

  it('semanal: un periodo dura siempre 7 días', () => {
    const r: RecurrenciaProduccion = { tipo: 'semanal', diaSemana: 5, inicio: f(1640, 4, 1) }
    expect(diasDelPeriodo(r, f(1640, 4, 7))).toBe(7)
  })
})

describe('cantidadDeOcurrencia', () => {
  it('la mina de O5: 10 × (15 × 2/3 + 15 × 1) ÷ 30 = 8,333', () => {
    expect(cantidadDeOcurrencia(10, 15 * (2 / 3) + 15 * 1, 30)).toBeCloseTo(8.333, 3)
  })

  it('la cantera con 2 de 3: 25 × (2/3 × 7) ÷ 7 = 16,667', () => {
    expect(cantidadDeOcurrencia(25, (2 / 3) * 7, 7)).toBeCloseTo(16.667, 3)
  })
})

describe('diasAcumulados', () => {
  const cantera = EDIFICIOS.find((e) => e.id === EDIFICIO.cantera)!
  const arcilla = cantera.producciones.find((p) => p.id === 'prod.cantera-arcilla')!
  const piedra = cantera.producciones.find((p) => p.id === 'prod.cantera-piedra')!

  it('el 12 de abril: la arcilla (desde el 2 de abril) lleva 11 días', () => {
    expect(diasAcumulados(arcilla, f(1640, 4, 12))).toBe(11)
  })

  it('el 12 de abril: la piedra (desde el 8 de abril) lleva 5 días', () => {
    expect(diasAcumulados(piedra, f(1640, 4, 12))).toBe(5)
  })

  it('un acumulado recién reiniciado para mañana lleva 0 días hoy', () => {
    const produccion = { recurrencia: piedra.recurrencia, acumulado: { desde: f(1640, 4, 13), sumaFactores: 0 } }
    expect(diasAcumulados(produccion, f(1640, 4, 12))).toBe(0)
  })
})
