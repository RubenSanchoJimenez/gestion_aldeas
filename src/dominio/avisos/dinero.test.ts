import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Deuda } from '../modelo/deudas'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { conAsentamiento, estadoMinimo } from '../motor/pruebas/constructores'
import { avisosDeImpago, avisosDeSaldoNegativo } from './dinero'

/** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** Un gasto suelto ya aplicado, para dejar una caja en negativo como lo haría una acción manual (§6.4). */
function gasto(id: string, dominioId: string, base: number): Movimiento {
  return {
    id,
    dominioId,
    fecha: HOY,
    tipo: 'gasto',
    importe: { base: -base },
    categoriaId: CATEGORIA.otros,
    concepto: 'Compra de urgencia',
    origen: 'manual',
    programado: false,
  }
}

/** Una deuda de impago de la aldea de prueba con la persona «Molineros de Aldea». */
function deudaDeImpago(cambios: Partial<Deuda>): Deuda {
  return {
    id: 'deuda.impago',
    dominioId: 'dom.aldea',
    sentido: 'debo',
    contraparteId: 'persona.molineros',
    fecha: { anio: 1640, mes: 4, dia: 5 },
    principal: { base: 300000 },
    interesPct: 0,
    estado: 'abierta',
    impago: true,
    origenImpago: { tipo: 'recurrente', id: 'rec.molienda' },
    cargos: [
      { fecha: { anio: 1640, mes: 4, dia: 5 }, importe: { base: 100000 }, avanceId: 'av.1' },
      { fecha: { anio: 1640, mes: 4, dia: 10 }, importe: { base: 200000 }, avanceId: 'av.2' },
    ],
    pagos: [],
    devengos: [],
    ...cambios,
  }
}

/** La aldea de prueba con la persona de la deuda y la deuda que se pase. */
function conDeuda(deuda: Deuda): EstadoPartida {
  const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 1000000 })
  return { ...base, personas: [{ id: 'persona.molineros', nombre: 'Molineros de Aldea' }], deudas: [deuda] }
}

describe('avisosDeSaldoNegativo', () => {
  it('avisa en rojo de la bolsa en negativo con el texto de §6.4: «−3,482 mo»', () => {
    const base = estadoMinimo(HOY)
    const tharan = base.dominios[0].id
    const estado: EstadoPartida = { ...base, movimientos: [gasto('mov.1', tharan, 348200)] }
    expect(avisosDeSaldoNegativo(estado)).toEqual([
      {
        tipo: 'saldoNegativo',
        color: 'rojo',
        dominioId: tharan,
        texto: 'La bolsa de Tharan está en negativo: −3,482 mo',
        fecha: HOY,
      },
    ])
  })

  it('una caja de asentamiento dice «La caja de»; una caja a 0 o en positivo no avisa', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = { ...base, movimientos: [gasto('mov.1', 'dom.aldea', 100000)] }
    expect(avisosDeSaldoNegativo(estado).map((a) => a.texto)).toEqual(['La caja de Aldea está en negativo: −1 mo'])
    expect(avisosDeSaldoNegativo(base)).toEqual([])
    expect(avisosDeSaldoNegativo(estadoDe(documentoDeEjemplo()))).toEqual([])
  })
})

describe('avisosDeImpago', () => {
  it('avisa del impago de Archet del 19 de julio mientras quede algo pendiente (D-024)', () => {
    const recorrido = recorrerDias(estadoDe(documentoDeEjemplo()), { anio: 1640, mes: 7, dia: 19 }, {
      avanceId: 'sim',
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    expect(avisosDeImpago(recorrido.estadoNuevo)).toEqual([
      {
        tipo: 'impago',
        color: 'rojo',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no pudo pagar a Corona de Arthedain: 18,8 mo pendientes',
        fecha: { anio: 1640, mes: 7, dia: 19 },
      },
    ])
  })

  it('lo pendiente es el principal menos lo pagado, y la fecha, la del último cargo (T17)', () => {
    const pago = {
      id: 'pago.1',
      fecha: { anio: 1640, mes: 4, dia: 11 },
      importe: { base: 50000 },
      aplicarA: 'soloCapital' as const,
      movimientoId: 'mov.pago',
    }
    expect(avisosDeImpago(conDeuda(deudaDeImpago({ pagos: [pago] })))).toEqual([
      {
        tipo: 'impago',
        color: 'rojo',
        dominioId: 'dom.aldea',
        texto: 'La caja de Aldea no pudo pagar a Molineros de Aldea: 2,5 mo pendientes',
        fecha: { anio: 1640, mes: 4, dia: 10 },
      },
    ])
  })

  it('no avisa de una deuda de impago saldada, pagada entera o que no es de impago', () => {
    const pagadaEntera = {
      id: 'pago.1',
      fecha: { anio: 1640, mes: 4, dia: 11 },
      importe: { base: 300000 },
      aplicarA: 'soloCapital' as const,
      movimientoId: 'mov.pago',
    }
    expect(avisosDeImpago(conDeuda(deudaDeImpago({ estado: 'saldada' })))).toEqual([])
    expect(avisosDeImpago(conDeuda(deudaDeImpago({ pagos: [pagadaEntera] })))).toEqual([])
    const normal = deudaDeImpago({ impago: false, origenImpago: undefined, cargos: undefined })
    expect(avisosDeImpago(conDeuda(normal))).toEqual([])
  })
})
