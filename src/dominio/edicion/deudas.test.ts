import { describe, expect, it } from 'vitest'
import { estadoDeDeuda } from '../deudas/pendiente'
import { DEUDA, DOM, PAGO, PERSONA } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { EsquemaDeuda } from '../modelo/deudas'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { EsquemaMovimiento, type Movimiento } from '../modelo/movimientos'
import { idsEnSerie } from '../motor/ids'
import {
  crearDeuda,
  editarDeuda,
  editarPagoDeuda,
  eliminarDeuda,
  eliminarPagoDeuda,
  registrarPagoDeuda,
  type DatosDeuda,
} from './deudas'
import type { Sello } from './registros'

const AHORA = '2026-11-25T10:00:00.000Z'

/** Un sello de prueba con ids en serie. */
function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('ed') }
}

/** El estado del ejemplo (12 de abril de 1640). */
function estado(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

/** Los datos de una deuda nueva de 10 mo a Hobart, sin interés. */
function datos(cambios: Partial<DatosDeuda> = {}): DatosDeuda {
  return {
    dominioId: DOM.tharan,
    sentido: 'debo',
    contraparteId: PERSONA.hobart,
    fecha: { anio: 1640, mes: 4, dia: 12 },
    principal: { base: 1000000, introducido: { cantidad: '10', moneda: 'mo' } },
    interesPct: 0,
    ...cambios,
  }
}

/** El movimiento vinculado de esa deuda o ese pago. */
function vinculadoA(estadoNuevo: EstadoPartida, tipo: 'altaDeuda' | 'pagoDeuda', id: string): Movimiento | undefined {
  return estadoNuevo.movimientos.find((m) => m.vinculo?.tipo === tipo && m.vinculo.id === id)
}

/** La deuda con ese id. */
function deudaDe(estadoNuevo: EstadoPartida, id: string) {
  const deuda = estadoNuevo.deudas.find((d) => d.id === id)
  if (deuda === undefined) {
    throw new Error('no existe ' + id)
  }
  return deuda
}

describe('crearDeuda', () => {
  it('con cuenta crea el movimiento vinculado de «Préstamos y deudas», y el dinero entra (esp l.1164)', () => {
    const { estado: nuevo, id } = crearDeuda(estado(), datos({ cuentaId: DOM.tharan }), sello())
    const deuda = deudaDe(nuevo, id)
    expect(deuda.cuentaAltaId).toBe(DOM.tharan)
    expect(deuda.estado).toBe('abierta')
    expect(EsquemaDeuda.safeParse(deuda).success).toBe(true)
    const movimiento = vinculadoA(nuevo, 'altaDeuda', id)
    expect(movimiento).toMatchObject({
      dominioId: DOM.tharan,
      tipo: 'ingreso',
      importe: { base: 1000000 },
      categoriaId: 'cat.prestamos-y-deudas',
      concepto: 'Préstamo de Hobart Brezal, herrero',
      origen: 'manual',
      programado: false,
    })
    expect(EsquemaMovimiento.safeParse(movimiento).success).toBe(true)
    expect(nuevo.partida.cambiosDesdeUltimoAvance).toBe(estado().partida.cambiosDesdeUltimoAvance + 1)
  })

  it('un préstamo que te deben saca el dinero de la cuenta', () => {
    const { estado: nuevo, id } = crearDeuda(
      estado(),
      datos({ sentido: 'meDeben', contraparteId: PERSONA.dalen, cuentaId: DOM.tharan }),
      sello(),
    )
    expect(vinculadoA(nuevo, 'altaDeuda', id)).toMatchObject({
      tipo: 'gasto',
      importe: { base: -1000000 },
      concepto: 'Préstamo a Dalen, mercader de Esgaroth',
    })
  })

  it('con «Ninguno: solo anotar la deuda» no mueve dinero (esp l.1164)', () => {
    const { estado: nuevo, id } = crearDeuda(estado(), datos(), sello())
    expect(deudaDe(nuevo, id).cuentaAltaId).toBeUndefined()
    expect(nuevo.movimientos).toEqual(estado().movimientos)
  })

  it('las notas mandan sobre el concepto del movimiento (D-101)', () => {
    const { estado: nuevo, id } = crearDeuda(
      estado(),
      datos({ cuentaId: DOM.tharan, notas: 'Arreglo de la espada' }),
      sello(),
    )
    expect(vinculadoA(nuevo, 'altaDeuda', id)?.concepto).toBe('Arreglo de la espada')
  })

  it('un alta con vencimiento ya pasado nace vencida (§7 l.1163)', () => {
    const { estado: nuevo, id } = crearDeuda(
      estado(),
      datos({ fecha: { anio: 1640, mes: 4, dia: 1 }, vencimiento: { anio: 1640, mes: 4, dia: 10 } }),
      sello(),
    )
    expect(deudaDe(nuevo, id).estado).toBe('vencida')
  })

  it('una deuda de un asentamiento se crea igual, con su caja (A2b)', () => {
    const { estado: nuevo, id } = crearDeuda(
      estado(),
      datos({ dominioId: DOM.bree, cuentaId: DOM.bree }),
      sello(),
    )
    expect(deudaDe(nuevo, id).dominioId).toBe(DOM.bree)
    expect(vinculadoA(nuevo, 'altaDeuda', id)?.dominioId).toBe(DOM.bree)
  })
})

describe('editarDeuda', () => {
  it('cambia el principal y arrastra el importe y el concepto de su movimiento de alta', () => {
    const { estado: conDeuda, id } = crearDeuda(estado(), datos({ cuentaId: DOM.tharan }), sello())
    const nuevo = editarDeuda(conDeuda, id, { principal: { base: 2000000 }, notas: 'Otra cosa' }, sello())
    expect(deudaDe(nuevo, id).principal).toEqual({ base: 2000000 })
    expect(vinculadoA(nuevo, 'altaDeuda', id)).toMatchObject({
      importe: { base: 2000000 },
      concepto: 'Otra cosa',
    })
    expect(vinculadoA(nuevo, 'altaDeuda', id)?.editadoEl).toBe(AHORA)
  })

  it('poner un vencimiento ya pasado deja la deuda vencida', () => {
    const nuevo = editarDeuda(estado(), DEUDA.gremioTharan, { vencimiento: { anio: 1640, mes: 4, dia: 1 } }, sello())
    expect(deudaDe(nuevo, DEUDA.gremioTharan).estado).toBe('vencida')
  })

  it('guardar sin cambiar nada devuelve el mismo estado y no cuenta cambio', () => {
    const actual = estado()
    expect(editarDeuda(actual, DEUDA.hobart, {}, sello())).toBe(actual)
  })

  it('una deuda de impago no se edita a mano (§9)', () => {
    const actual = estado()
    const conImpago: EstadoPartida = {
      ...actual,
      deudas: actual.deudas.map((d) =>
        d.id === DEUDA.hobart
          ? {
              ...d,
              impago: true,
              vencimiento: undefined,
              origenImpago: { tipo: 'salarios' as const, id: DOM.bree },
              cargos: [{ fecha: { anio: 1640, mes: 4, dia: 1 }, importe: { base: 400000 }, avanceId: 'av.x' }],
            }
          : d,
      ),
    }
    expect(() => editarDeuda(conImpago, DEUDA.hobart, { interesPct: 5 }, sello())).toThrow(
      'Una deuda de impago la lleva el motor',
    )
  })
})

describe('registrarPagoDeuda (J4b)', () => {
  it('crea su movimiento y recalcula el pendiente: 15 mo al Gremio dejan 27 de capital (O3)', () => {
    const { estado: nuevo, id } = registrarPagoDeuda(
      estado(),
      DEUDA.gremioTharan,
      {
        importe: { base: 1500000, introducido: { cantidad: '15', moneda: 'mo' } },
        aplicarA: 'interesesYCapital',
        fecha: { anio: 1640, mes: 4, dia: 12 },
        cuentaId: DOM.tharan,
      },
      sello(),
    )
    const deuda = deudaDe(nuevo, DEUDA.gremioTharan)
    const pago = deuda.pagos.find((p) => p.id === id)
    expect(pago).toMatchObject({ importe: { base: 1500000 }, aplicarA: 'interesesYCapital' })
    const cuentas = estadoDeDeuda(deuda)
    expect(cuentas.capital).toBe(2700000)
    expect(cuentas.interesesPendientes).toBe(0)
    expect(cuentas.pendiente).toBe(2700000)
    const movimiento = vinculadoA(nuevo, 'pagoDeuda', DEUDA.gremioTharan)
    expect(movimiento).toMatchObject({
      dominioId: DOM.tharan,
      tipo: 'gasto',
      importe: { base: -1500000 },
      categoriaId: 'cat.prestamos-y-deudas',
      concepto: 'Pago de la deuda con Gremio de mercaderes de Bree',
      programado: false,
    })
    expect(EsquemaMovimiento.safeParse(movimiento).success).toBe(true)
  })

  it('cobrar un préstamo que te deben mete el dinero en la cuenta', () => {
    const { estado: nuevo } = registrarPagoDeuda(
      estado(),
      DEUDA.dalen,
      {
        importe: { base: 1500000 },
        aplicarA: 'interesesYCapital',
        fecha: { anio: 1640, mes: 4, dia: 12 },
        cuentaId: DOM.tharan,
      },
      sello(),
    )
    expect(vinculadoA(nuevo, 'pagoDeuda', DEUDA.dalen)).toMatchObject({
      tipo: 'ingreso',
      importe: { base: 1500000 },
      concepto: 'Cobro del préstamo a Dalen, mercader de Esgaroth',
    })
  })

  it('un pago que cubre todo lo pendiente pasa la deuda a «saldada» (§7 l.1166)', () => {
    const { estado: nuevo } = registrarPagoDeuda(
      estado(),
      DEUDA.hobart,
      {
        importe: { base: 400000 },
        aplicarA: 'interesesYCapital',
        fecha: { anio: 1640, mes: 4, dia: 12 },
        cuentaId: DOM.tharan,
      },
      sello(),
    )
    expect(deudaDe(nuevo, DEUDA.hobart).estado).toBe('saldada')
  })

  it('un pago que no cubre todo y con el vencimiento pasado deja la deuda vencida', () => {
    const actual = estado()
    const vencida: EstadoPartida = {
      ...actual,
      partida: { ...actual.partida, fechaActual: { anio: 1640, mes: 5, dia: 2 } },
    }
    const { estado: nuevo } = registrarPagoDeuda(
      vencida,
      DEUDA.gremioTharan,
      {
        importe: { base: 100000 },
        aplicarA: 'interesesYCapital',
        fecha: { anio: 1640, mes: 5, dia: 2 },
        cuentaId: DOM.tharan,
      },
      sello(),
    )
    expect(deudaDe(nuevo, DEUDA.gremioTharan).estado).toBe('vencida')
  })

  it('los devengos no cambian al registrar un pago (§7 l.1162)', () => {
    const { estado: nuevo } = registrarPagoDeuda(
      estado(),
      DEUDA.gremioTharan,
      {
        importe: { base: 100000 },
        aplicarA: 'soloCapital',
        fecha: { anio: 1640, mes: 3, dia: 20 },
        cuentaId: DOM.tharan,
      },
      sello(),
    )
    expect(deudaDe(nuevo, DEUDA.gremioTharan).devengos).toEqual(
      estado().deudas.find((d) => d.id === DEUDA.gremioTharan)?.devengos,
    )
  })
})

describe('editarPagoDeuda y eliminarPagoDeuda', () => {
  it('editar el importe de un pago recalcula la deuda y su movimiento', () => {
    const nuevo = editarPagoDeuda(
      estado(),
      DEUDA.gremioTharan,
      PAGO.gremio1,
      { importe: { base: 1500000 } },
      sello(),
    )
    const deuda = deudaDe(nuevo, DEUDA.gremioTharan)
    expect(estadoDeDeuda(deuda).capitalPagado).toBe(2500000)
    const pago = deuda.pagos.find((p) => p.id === PAGO.gremio1)
    expect(pago?.editadoEl).toBe(AHORA)
    const movimiento = nuevo.movimientos.find((m) => m.id === pago?.movimientoId)
    expect(movimiento?.importe).toEqual({ base: -1500000 })
  })

  it('editar un pago sin cambiar nada devuelve el mismo estado', () => {
    const actual = estado()
    expect(editarPagoDeuda(actual, DEUDA.gremioTharan, PAGO.gremio1, {}, sello())).toBe(actual)
  })

  it('borrar un pago borra su movimiento y devuelve el pendiente, sin tocar los devengos', () => {
    const antes = estado()
    const pago = antes.deudas.find((d) => d.id === DEUDA.gremioTharan)?.pagos.find((p) => p.id === PAGO.gremio1)
    const nuevo = eliminarPagoDeuda(antes, DEUDA.gremioTharan, PAGO.gremio1, sello())
    const deuda = deudaDe(nuevo, DEUDA.gremioTharan)
    expect(deuda.pagos.map((p) => p.id)).toEqual([PAGO.gremio2])
    expect(estadoDeDeuda(deuda).pendiente).toBe(5200000)
    expect(deuda.devengos).toHaveLength(1)
    expect(nuevo.movimientos.some((m) => m.id === pago?.movimientoId)).toBe(false)
  })

  it('borrar el último pago de una deuda saldada la devuelve a «abierta»', () => {
    const { estado: conPago, id } = registrarPagoDeuda(
      estado(),
      DEUDA.hobart,
      {
        importe: { base: 400000 },
        aplicarA: 'interesesYCapital',
        fecha: { anio: 1640, mes: 4, dia: 12 },
        cuentaId: DOM.tharan,
      },
      sello(),
    )
    const nuevo = eliminarPagoDeuda(conPago, DEUDA.hobart, id, sello())
    expect(deudaDe(nuevo, DEUDA.hobart).estado).toBe('abierta')
    expect(deudaDe(nuevo, DEUDA.hobart).pagos).toEqual([])
  })
})

describe('eliminarDeuda', () => {
  it('borra la deuda, los movimientos de sus pagos y el de su alta', () => {
    const { estado: conDeuda, id } = crearDeuda(estado(), datos({ cuentaId: DOM.tharan }), sello())
    const { estado: conPago, id: pagoId } = registrarPagoDeuda(
      conDeuda,
      id,
      {
        importe: { base: 100000 },
        aplicarA: 'interesesYCapital',
        fecha: { anio: 1640, mes: 4, dia: 12 },
        cuentaId: DOM.tharan,
      },
      sello(),
    )
    const movimientoDelPago = conPago.deudas
      .find((d) => d.id === id)
      ?.pagos.find((p) => p.id === pagoId)?.movimientoId
    const nuevo = eliminarDeuda(conPago, id)
    expect(nuevo.deudas.some((d) => d.id === id)).toBe(false)
    expect(vinculadoA(nuevo, 'altaDeuda', id)).toBeUndefined()
    expect(nuevo.movimientos.some((m) => m.id === movimientoDelPago)).toBe(false)
    expect(nuevo.movimientos).toHaveLength(estado().movimientos.length)
  })

  it('borrar una deuda del ejemplo deja los movimientos de sus pagos fuera del libro', () => {
    const antes = estado()
    const pagos = antes.deudas.find((d) => d.id === DEUDA.gremioTharan)?.pagos ?? []
    const nuevo = eliminarDeuda(antes, DEUDA.gremioTharan)
    expect(pagos).toHaveLength(2)
    for (const pago of pagos) {
      expect(nuevo.movimientos.some((m) => m.id === pago.movimientoId)).toBe(false)
    }
  })
})
