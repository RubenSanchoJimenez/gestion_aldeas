import { describe, expect, it } from 'vitest'
import { CATEGORIA } from '../catalogo/inicial'
import { DOM, LOCAL } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { EstadoPartida } from '../modelo/documento'
import { balanceMensual } from './balance'
import { formatearOroProrrateado } from './formato'
import { EQUIVALENCIAS_POR_DEFECTO } from './monedas'
import { alMes } from './prorrateo'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** El balance de Bree del ejemplo el 12 de abril (§7 l.1057-1062; A1 y A3). */
const BREE = {
  entran: 4395714,
  salen: 5542857,
  tributos: 2500000,
  balance: -1147143,
  resultadoFiscal: 1895714,
}

/** El ejemplo con otra fecha actual; el balance solo la usa para contar los habitantes. */
function ejemploEl(dia: number, mes: number): EstadoPartida {
  const estado = documentoDeEjemplo()
  estado.partida = { ...estado.partida, fechaActual: { anio: 1640, mes, dia } }
  return estado
}

describe('balanceMensual', () => {
  it('Bree: entran 4.395.714, salen 5.542.857 y tributos 2.500.000; balance −1.147.143 y resultado +1.895.714', () => {
    expect(balanceMensual(documentoDeEjemplo(), DOM.bree)).toEqual(BREE)
  })

  it('los textos de A1 y A3: «−11,5 mo», «+44 mo», «55,4 mo», «−25 mo» y «+19 mo» (§7 l.1057-1062)', () => {
    const bree = balanceMensual(documentoDeEjemplo(), DOM.bree)
    expect(formatearOroProrrateado(bree.balance, EQ, { signo: true })).toBe('−11,5 mo')
    expect(formatearOroProrrateado(bree.entran, EQ, { signo: true })).toBe('+44 mo')
    expect(formatearOroProrrateado(bree.salen, EQ)).toBe('55,4 mo')
    expect(formatearOroProrrateado(-bree.tributos, EQ, { signo: true })).toBe('−25 mo')
    expect(formatearOroProrrateado(bree.resultadoFiscal, EQ, { signo: true })).toBe('+19 mo')
  })

  it('suma exacta y un solo redondeo: fila a fila con alMes, las soldadas darían 1.242.856 (técnica 2)', () => {
    const estado = documentoDeEjemplo()
    const soldadasFilaAFila = estado.unidadesGuarnicion.reduce(
      (total, u) => total + alMes(u.numero * u.soldada.base, u.recurrencia),
      0,
    )
    expect(soldadasFilaAFila).toBe(1242856)
    // Salarios 1.800.000 + soldadas 1.242.857,14… + diezmo 2.500.000, redondeado una sola vez.
    expect(balanceMensual(estado, DOM.bree).salen).toBe(1800000 + 1242857 + 2500000)
  })

  it('Archet: entran 860.000, salen 2.320.000 y balance −1.460.000, «−14,6 mo»', () => {
    const archet = balanceMensual(documentoDeEjemplo(), DOM.archet)
    expect(archet).toEqual({
      entran: 860000,
      salen: 2320000,
      tributos: 2000000,
      balance: -1460000,
      resultadoFiscal: -1140000,
    })
    expect(formatearOroProrrateado(archet.balance, EQ, { signo: true })).toBe('−14,6 mo')
  })

  it('no mira los eventos: con la feria activa (16 de abril) y un +100 % en los costes, igual; y el 19 también (D-027)', () => {
    const conFeria = ejemploEl(16, 4)
    conFeria.eventos = [
      ...conFeria.eventos,
      {
        id: 'ev.subida',
        dominioId: DOM.bree,
        nombre: 'Subida de jornales',
        inicio: { anio: 1640, mes: 4, dia: 13 },
        duracionDias: 30,
        efectos: [{ ambito: 'costes', objetivo: { tipo: 'todos' }, pct: 100 }],
      },
    ]
    expect(balanceMensual(conFeria, DOM.bree)).toEqual(BREE)
    expect(balanceMensual(ejemploEl(19, 4), DOM.bree)).toEqual(BREE)
  })

  it('un gasto o un ingreso de J5 que usa la caja de Bree no cuenta (D-027)', () => {
    const estado = documentoDeEjemplo()
    estado.recurrentes = [
      ...estado.recurrentes,
      {
        id: 'rec.donativo',
        dominioId: DOM.tharan,
        tipo: 'gasto',
        concepto: 'Donativo al templo',
        importe: { base: 1000000 },
        categoriaId: CATEGORIA.otros,
        cuentaId: DOM.bree,
        recurrencia: { tipo: 'mensual', diaMes: 1 },
        activo: true,
      },
    ]
    expect(balanceMensual(estado, DOM.bree)).toEqual(BREE)
  })

  it('el impuesto por habitante usa los habitantes de la fecha actual, no los de un cambio futuro (§3)', () => {
    const estado = documentoDeEjemplo()
    estado.poblaciones = estado.poblaciones.map((p) =>
      p.dominioId === DOM.bree
        ? {
            ...p,
            cambios: [
              ...p.cambios,
              { id: 'camb.bree.feria', fecha: { anio: 1640, mes: 4, dia: 20 }, delta: 100, motivo: 'Se quedan feriantes' },
            ],
          }
        : p,
    )
    expect(balanceMensual(estado, DOM.bree).entran).toBe(4395714)
    estado.partida = { ...estado.partida, fechaActual: { anio: 1640, mes: 4, dia: 20 } }
    // 100 habitantes más × 0,01 mo al mes = +1 mo.
    expect(balanceMensual(estado, DOM.bree).entran).toBe(4495714)
  })

  it('un local que cierras hoy deja de contar ya, aunque el cierre valga desde mañana (D-028)', () => {
    const estado = documentoDeEjemplo()
    estado.localesComerciales = estado.localesComerciales.map((l) =>
      l.id === LOCAL.posada
        ? {
            ...l,
            cambiosEstado: [...l.cambiosEstado, { desde: { anio: 1640, mes: 4, dia: 13 }, estado: 'cerrado' as const }],
          }
        : l,
    )
    const bree = balanceMensual(estado, DOM.bree)
    expect(bree.entran).toBe(4395714 - 320000)
    expect(bree.balance).toBe(-1147143 - 320000)
  })
})
