import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM, LOCAL, TIPO_LOCAL } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { LocalComercial, TipoLocal } from '../modelo/asentamiento'
import {
  abiertoAlgunDia,
  compararMeses,
  diaDeCobro,
  equivalenteMensualLocales,
  estadoDelLocalEl,
  estadoVigenteDelLocal,
  impuestoDeLocal,
  mesAnterior,
  mesDe,
  mesesPorCobrar,
  mesSiguiente,
  produccionDelMes,
} from './impuesto'

/** Atajo para escribir fechas de 1640: dia(1, 5) es el 1 de mayo. */
function dia(d: number, m: number): Fecha {
  return { anio: 1640, mes: m, dia: d }
}

/** Un local del ejemplo por su id. */
function localDelEjemplo(id: string): LocalComercial {
  const local = documentoDeEjemplo().localesComerciales.find((l) => l.id === id)
  if (local === undefined) {
    throw new Error(`El ejemplo no tiene el local «${id}»`)
  }
  return local
}

/** Un tipo de local del ejemplo por su id. */
function tipoDelEjemplo(id: string): TipoLocal {
  const tipo = documentoDeEjemplo().tiposLocal.find((t) => t.id === id)
  if (tipo === undefined) {
    throw new Error(`El ejemplo no tiene el tipo «${id}»`)
  }
  return tipo
}

/** La Herrería 1 del ejemplo (alta el 1 de marzo, abierta, cobrada hasta marzo) con otros tramos de estado. */
function herreriaCon(cambiosEstado: LocalComercial['cambiosEstado']): LocalComercial {
  return { ...localDelEjemplo(LOCAL.herreria1), cambiosEstado }
}

describe('meses', () => {
  it('mesDe, compararMeses, mesSiguiente y mesAnterior; diciembre y enero cruzan de año', () => {
    expect(mesDe(dia(12, 4))).toEqual({ anio: 1640, mes: 4 })
    expect(compararMeses({ anio: 1640, mes: 3 }, { anio: 1640, mes: 4 })).toBeLessThan(0)
    expect(compararMeses({ anio: 1640, mes: 4 }, { anio: 1640, mes: 4 })).toBe(0)
    expect(compararMeses({ anio: 1641, mes: 1 }, { anio: 1640, mes: 12 })).toBeGreaterThan(0)
    expect(mesSiguiente({ anio: 1640, mes: 4 })).toEqual({ anio: 1640, mes: 5 })
    expect(mesSiguiente({ anio: 1640, mes: 12 })).toEqual({ anio: 1641, mes: 1 })
    expect(mesAnterior({ anio: 1640, mes: 5 })).toEqual({ anio: 1640, mes: 4 })
    expect(mesAnterior({ anio: 1640, mes: 1 })).toEqual({ anio: 1639, mes: 12 })
  })
})

describe('estado de un local', () => {
  it('estadoDelLocalEl: cerrado antes del primer tramo; después, el del último tramo que ya empezó', () => {
    const herreria = herreriaCon([
      { desde: dia(1, 3), estado: 'abierto' },
      { desde: dia(10, 4), estado: 'cerrado' },
      { desde: dia(20, 4), estado: 'abierto' },
    ])
    expect(estadoDelLocalEl(herreria, dia(28, 2))).toBe('cerrado')
    expect(estadoDelLocalEl(herreria, dia(1, 3))).toBe('abierto')
    expect(estadoDelLocalEl(herreria, dia(9, 4))).toBe('abierto')
    expect(estadoDelLocalEl(herreria, dia(10, 4))).toBe('cerrado')
    expect(estadoDelLocalEl(herreria, dia(19, 4))).toBe('cerrado')
    expect(estadoDelLocalEl(herreria, dia(20, 4))).toBe('abierto')
  })

  it('estadoVigenteDelLocal: el del último tramo, aunque empiece mañana (D-028)', () => {
    const cerradaDesdeManana = herreriaCon([
      { desde: dia(1, 3), estado: 'abierto' },
      { desde: dia(13, 4), estado: 'cerrado' },
    ])
    expect(estadoDelLocalEl(cerradaDesdeManana, dia(12, 4))).toBe('abierto')
    expect(estadoVigenteDelLocal(cerradaDesdeManana)).toBe('cerrado')
    expect(estadoVigenteDelLocal(localDelEjemplo(LOCAL.posada))).toBe('abierto')
  })

  it('abiertoAlgunDia: un solo día abierto basta para que el mes pague (§7, «Estado»)', () => {
    const abreElUltimoDia = herreriaCon([{ desde: dia(30, 4), estado: 'abierto' }])
    expect(abiertoAlgunDia(abreElUltimoDia, { anio: 1640, mes: 4 })).toBe(true)
    const cierraElDia2 = herreriaCon([
      { desde: dia(1, 3), estado: 'abierto' },
      { desde: dia(2, 4), estado: 'cerrado' },
    ])
    expect(abiertoAlgunDia(cierraElDia2, { anio: 1640, mes: 4 })).toBe(true)
  })

  it('abiertoAlgunDia: cerrado todo el mes no paga, ni un mes anterior a su primer tramo', () => {
    const cerradaEnAbril = herreriaCon([
      { desde: dia(1, 3), estado: 'abierto' },
      { desde: dia(31, 3), estado: 'cerrado' },
      { desde: dia(1, 5), estado: 'abierto' },
    ])
    expect(abiertoAlgunDia(cerradaEnAbril, { anio: 1640, mes: 3 })).toBe(true)
    expect(abiertoAlgunDia(cerradaEnAbril, { anio: 1640, mes: 4 })).toBe(false)
    expect(abiertoAlgunDia(cerradaEnAbril, { anio: 1640, mes: 5 })).toBe(true)
    expect(abiertoAlgunDia(cerradaEnAbril, { anio: 1640, mes: 2 })).toBe(false)
  })
})

describe('producción e impuesto', () => {
  it('produccionDelMes: la anotada si la hay; si no, la habitual (§7 l.1067)', () => {
    const tienda = localDelEjemplo(LOCAL.tiendaDeTelas)
    expect(produccionDelMes(tienda, { anio: 1640, mes: 4 })).toEqual({ importe: 150000, anotada: true })
    expect(produccionDelMes(tienda, { anio: 1640, mes: 3 })).toEqual({ importe: 600000, anotada: false })
  })

  it('produccionDelMes: anotar 0 es «no produjo»: cuenta como anotada y paga el mínimo (§7 l.1067)', () => {
    const herreria: LocalComercial = {
      ...localDelEjemplo(LOCAL.herreria1),
      producciones: [{ mes: { anio: 1640, mes: 4 }, importe: { base: 0 } }],
    }
    const produccion = produccionDelMes(herreria, { anio: 1640, mes: 4 })
    expect(produccion).toEqual({ importe: 0, anotada: true })
    expect(impuestoDeLocal(produccion.importe, tipoDelEjemplo(TIPO_LOCAL.herreria))).toBe(20000)
  })

  it('impuestoDeLocal: Herrería 1 con 10 mo paga 1 mo; con 1 mo, el mínimo de 2 mp (§7 l.1069-1072)', () => {
    const herreria = tipoDelEjemplo(TIPO_LOCAL.herreria)
    expect(impuestoDeLocal(1000000, herreria)).toBe(100000)
    expect(impuestoDeLocal(100000, herreria)).toBe(20000)
  })

  it('impuestoDeLocal: la tienda de telas con 1,5 mo anotados paga el mínimo, 0,1 mo; la posada, 3,2 mo', () => {
    expect(impuestoDeLocal(150000, tipoDelEjemplo(TIPO_LOCAL.tienda))).toBe(10000)
    expect(impuestoDeLocal(4000000, tipoDelEjemplo(TIPO_LOCAL.posada))).toBe(320000)
    // 5 % de 250.010 mh = 12.500,5 mh → 12.501, con las mitades hacia arriba.
    expect(impuestoDeLocal(250010, tipoDelEjemplo(TIPO_LOCAL.tienda))).toBe(12501)
  })
})

describe('cobro', () => {
  it('diaDeCobro: el día del tipo o, si el mes no lo tiene, el último (§7 l.1065)', () => {
    const tipo: TipoLocal = { ...tipoDelEjemplo(TIPO_LOCAL.posada), diaCobro: 31 }
    expect(diaDeCobro(tipo, 1640, 4)).toEqual(dia(30, 4))
    expect(diaDeCobro(tipo, 1640, 5)).toEqual(dia(31, 5))
    expect(diaDeCobro(tipo, 1640, 2)).toEqual(dia(29, 2))
    expect(diaDeCobro(tipoDelEjemplo(TIPO_LOCAL.posada), 1640, 5)).toEqual(dia(1, 5))
  })

  it('mesesPorCobrar el 1 de mayo: [abril]; cobrado hasta febrero, [marzo, abril]; ya cobrado, [] (§7 l.1074)', () => {
    const herreria = localDelEjemplo(LOCAL.herreria1)
    expect(mesesPorCobrar(herreria, dia(1, 5))).toEqual([{ anio: 1640, mes: 4 }])
    expect(mesesPorCobrar({ ...herreria, cobradoHasta: { anio: 1640, mes: 2 } }, dia(1, 5))).toEqual([
      { anio: 1640, mes: 3 },
      { anio: 1640, mes: 4 },
    ])
    expect(mesesPorCobrar({ ...herreria, cobradoHasta: { anio: 1640, mes: 4 } }, dia(1, 5))).toEqual([])
    expect(mesesPorCobrar(herreria, dia(15, 4))).toEqual([])
  })

  it('mesesPorCobrar: el mes del alta se cobra entero y los anteriores al alta no (§9 l.1306)', () => {
    const nuevo: LocalComercial = {
      ...localDelEjemplo(LOCAL.herreria1),
      alta: dia(20, 4),
      cambiosEstado: [{ desde: dia(20, 4), estado: 'abierto' }],
      cobradoHasta: { anio: 1640, mes: 3 },
    }
    expect(mesesPorCobrar(nuevo, dia(25, 4))).toEqual([])
    expect(mesesPorCobrar(nuevo, dia(1, 5))).toEqual([{ anio: 1640, mes: 4 }])
    expect(abiertoAlgunDia(nuevo, { anio: 1640, mes: 4 })).toBe(true)
    // Aunque cobradoHasta se hubiera quedado atrás, nunca cobra meses anteriores al alta.
    expect(mesesPorCobrar({ ...nuevo, cobradoHasta: { anio: 1640, mes: 1 } }, dia(1, 5))).toEqual([
      { anio: 1640, mes: 4 },
    ])
  })
})

describe('equivalenteMensualLocales', () => {
  it('Bree: 470.000 mh (+4,7 mo) con la producción habitual, sin la anotación de abril (§7 l.1086)', () => {
    expect(equivalenteMensualLocales(documentoDeEjemplo(), DOM.bree)).toBe(470000)
  })

  it('un local cerrado cuenta 0, aunque cierre mañana; un asentamiento sin locales da 0 (§7 l.1087, D-028)', () => {
    const estado = documentoDeEjemplo()
    estado.localesComerciales = estado.localesComerciales.map((l) =>
      l.id === LOCAL.posada
        ? {
            ...l,
            cambiosEstado: [
              { desde: dia(1, 3), estado: 'abierto' as const },
              { desde: dia(13, 4), estado: 'cerrado' as const },
            ],
          }
        : l,
    )
    expect(equivalenteMensualLocales(estado, DOM.bree)).toBe(150000)
    expect(equivalenteMensualLocales(estado, DOM.archet)).toBe(0)
  })
})
