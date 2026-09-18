import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import type { EstadoPartida } from '../modelo/documento'
import type { Caja } from '../modelo/dominios'
import type { Movimiento } from '../modelo/movimientos'
import { formatearOro } from './formato'
import { aBase } from './importe'
import { EQUIVALENCIAS_POR_DEFECTO, type Equivalencias } from './monedas'
import { saldoDeCaja, saldosPorDominio, sumarBolsaInicial, type FilaMoneda } from './saldo'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** El 12 de abril de 1640, la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** Oro tecleado → hierro: mo('0,6') = 60000 mh. */
function mo(cantidad: string): number {
  return aBase(cantidad, 'mo', EQ)
}

/** Una caja con su saldo inicial en mh. */
function caja(dominioId: string, saldoInicial: number): Caja {
  return { dominioId, saldoInicial: { base: saldoInicial } }
}

/** Un movimiento suelto: el signo va en `base` y `programado` decide si cuenta en el saldo (§7). */
function movimiento(
  id: string,
  dominioId: string,
  base: number,
  extra: { programado?: boolean; fecha?: Fecha } = {},
): Movimiento {
  return {
    id,
    dominioId,
    fecha: extra.fecha ?? HOY,
    tipo: base < 0 ? 'gasto' : 'ingreso',
    importe: { base },
    categoriaId: 'cat.otros',
    concepto: 'Prueba',
    origen: 'manual',
    programado: extra.programado ?? false,
  }
}

/** Un EstadoPartida con las 34 claves y todo vacío; cada prueba rellena lo que necesita. */
function estadoVacio(): EstadoPartida {
  return {
    partida: {
      id: 'p.prueba',
      nombre: 'Partida de prueba',
      edad: 'tercera',
      equivalencias: EQ,
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: HOY,
      fechaActual: HOY,
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T08:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [],
    cajas: [],
    movimientos: [],
    transferencias: [],
    deudas: [],
    recurrentes: [],
    objetos: [],
    ventas: [],
    inversiones: [],
    hechizos: [],
    intentos: [],
    pergaminos: [],
    poblaciones: [],
    existencias: [],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
  }
}

describe('saldoDeCaja', () => {
  it('una caja sin movimientos da su saldo inicial (§7)', () => {
    expect(saldoDeCaja(caja('dom.bree', 34000000), [])).toBe(34000000)
  })

  it('suma los movimientos no programados de su dominio (§7)', () => {
    const cuenta = caja('dom.tharan', mo('40,918'))
    const movimientos = [
      movimiento('mov.1', 'dom.tharan', mo('6')),
      movimiento('mov.2', 'dom.tharan', -mo('0,6')),
      movimiento('mov.3', 'dom.tharan', mo('0,2')),
    ]
    expect(saldoDeCaja(cuenta, movimientos)).toBe(4091800 + 600000 - 60000 + 20000)
  })

  it('no cuenta un movimiento programado, aunque su fecha ya haya pasado (§7)', () => {
    const cuenta = caja('dom.bree', 1000000)
    const pasadoSinAplicar = movimiento('mov.caravana', 'dom.bree', mo('12'), {
      programado: true,
      fecha: { anio: 1640, mes: 4, dia: 10 },
    })
    const pasadoAplicado = movimiento('mov.peaje', 'dom.bree', mo('0,3'), {
      fecha: { anio: 1640, mes: 4, dia: 10 },
    })
    expect(saldoDeCaja(cuenta, [pasadoSinAplicar, pasadoAplicado])).toBe(1030000)
  })

  it('no cuenta los movimientos de otro dominio', () => {
    const cuenta = caja('dom.bree', 1000000)
    const movimientos = [movimiento('mov.1', 'dom.archet', mo('50')), movimiento('mov.2', 'dom.bree', mo('1'))]
    expect(saldoDeCaja(cuenta, movimientos)).toBe(1100000)
  })

  it('no mira el tipo ni la fecha: el signo ya está en importe.base (decisión 18)', () => {
    const cuenta = caja('dom.tharan', 0)
    const futuroAplicado = movimiento('mov.futuro', 'dom.tharan', mo('3'), {
      fecha: { anio: 1640, mes: 12, dia: 31 },
    })
    expect(saldoDeCaja(cuenta, [futuroAplicado])).toBe(300000)
    expect(saldoDeCaja(cuenta, [movimiento('mov.gasto', 'dom.tharan', -mo('3'))])).toBe(-300000)
  })

  it('admite un saldo negativo, que una acción manual puede dejar (§6.4)', () => {
    const cuenta = caja('dom.archet', mo('85'))
    expect(saldoDeCaja(cuenta, [movimiento('mov.1', 'dom.archet', -mo('145'))])).toBe(-6000000)
  })
})

describe('saldosPorDominio', () => {
  it('da una entrada por caja, con el saldo de cada una', () => {
    const estado = estadoVacio()
    estado.cajas = [caja('dom.tharan', mo('40,918')), caja('dom.bree', mo('340'))]
    estado.movimientos = [movimiento('mov.1', 'dom.tharan', mo('5,6')), movimiento('mov.2', 'dom.bree', mo('0,6'))]
    expect(saldosPorDominio(estado)).toEqual({ 'dom.tharan': 4651800, 'dom.bree': 34060000 })
  })

  it('reparte los dos lados de una transferencia, cada uno en su dominio', () => {
    const estado = estadoVacio()
    estado.cajas = [caja('dom.bree', mo('100')), caja('dom.archet', mo('100'))]
    estado.movimientos = [
      { ...movimiento('mov.sale', 'dom.bree', -mo('60')), tipo: 'transferencia' },
      { ...movimiento('mov.entra', 'dom.archet', mo('60')), tipo: 'transferencia' },
    ]
    expect(saldosPorDominio(estado)).toEqual({ 'dom.bree': 4000000, 'dom.archet': 16000000 })
  })

  it('un estado sin cajas da un objeto vacío', () => {
    expect(saldosPorDominio(estadoVacio())).toEqual({})
  })
})

describe('sumarBolsaInicial', () => {
  it('suma las cuatro filas de P1b: 38 mo + 25 mp + 40 mb + 18 mc = 4.091.800 mh, «40,918 mo»', () => {
    const filas: FilaMoneda[] = [
      { cantidad: '38', moneda: 'mo' },
      { cantidad: '25', moneda: 'mp' },
      { cantidad: '40', moneda: 'mb' },
      { cantidad: '18', moneda: 'mc' },
    ]
    const total = sumarBolsaInicial(filas, EQ)
    expect(total).toBe(4091800)
    expect(formatearOro(total, EQ)).toBe('40,918 mo')
  })

  it('una sola fila da esa fila, y la lista vacía da 0', () => {
    expect(sumarBolsaInicial([{ cantidad: '0,6', moneda: 'mo' }], EQ)).toBe(60000)
    expect(sumarBolsaInicial([], EQ)).toBe(0)
  })

  it('usa las equivalencias de la partida, no las de por defecto', () => {
    const eq: Equivalencias = { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 2 }
    const filas: FilaMoneda[] = [
      { cantidad: '38', moneda: 'mo' },
      { cantidad: '25', moneda: 'mp' },
      { cantidad: '40', moneda: 'mb' },
      { cantidad: '18', moneda: 'mc' },
    ]
    // Con 1 me = 2 mh, 1 mo vale 20000 mh: 760000 + 50000 + 8000 + 360.
    expect(sumarBolsaInicial(filas, eq)).toBe(818360)
  })
})

describe('las cifras del entregable de la fase', () => {
  it('la bolsa de Tharan da 46,518 mo y la caja de Bree, 340,6 mo', () => {
    const bolsaInicial = sumarBolsaInicial(
      [
        { cantidad: '38', moneda: 'mo' },
        { cantidad: '25', moneda: 'mp' },
        { cantidad: '40', moneda: 'mb' },
        { cantidad: '18', moneda: 'mc' },
      ],
      EQ,
    )
    const bolsaDeTharan = saldoDeCaja(caja('dom.tharan', bolsaInicial), [movimiento('mov.1', 'dom.tharan', mo('5,6'))])
    expect(bolsaDeTharan).toBe(4651800)
    expect(formatearOro(bolsaDeTharan, EQ)).toBe('46,518 mo')

    const cajaDeBree = saldoDeCaja(caja('dom.bree', 34000000), [movimiento('mov.2', 'dom.bree', mo('0,6'))])
    expect(cajaDeBree).toBe(34060000)
    expect(formatearOro(cajaDeBree, EQ)).toBe('340,6 mo')
  })
})
