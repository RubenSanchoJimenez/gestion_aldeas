import { describe, expect, it } from 'vitest'
import {
  EsquemaAjusteExistencias,
  EsquemaCambioPoblacion,
  EsquemaConsumoPorHabitante,
  EsquemaEntradaAlmacen,
  EsquemaExistencia,
  EsquemaPoblacion,
  EsquemaProduccionRealizada,
  type EntradaAlmacen,
  type Existencia,
  type Poblacion,
  type ProduccionRealizada,
} from './almacen'

/** La población de Bree: 1.214 iniciales y +26 desde enero (A4). */
const POBLACION_BREE: Poblacion = {
  dominioId: 'dom.bree',
  habitantesIniciales: 1214,
  cambios: [
    { id: 'pob.enero', fecha: { anio: 1640, mes: 1, dia: 15 }, delta: 12, motivo: 'Llegada de colonos' },
    { id: 'pob.febrero', fecha: { anio: 1640, mes: 2, dia: 10 }, delta: 20, motivo: 'Nacimientos del invierno' },
    { id: 'pob.marzo', fecha: { anio: 1640, mes: 3, dia: 22 }, delta: -6, motivo: 'Incursión de bandidos' },
  ],
  consumos: [
    { id: 'cons.lenia', nombre: 'Leña', recursoId: 'recurso.madera', porHabitante: 0.0125 },
    { id: 'cons.cerveza', nombre: 'Cerveza', recursoId: 'recurso.cerveza', porHabitante: 0.0104 },
  ],
}

/** La compra de víveres del 1 de abril en el mercado local de Bree. */
const COMPRA_VIVERES: EntradaAlmacen = {
  id: 'ent.viveres.1abril',
  dominioId: 'dom.bree',
  recursoId: 'recurso.viveres',
  cantidad: 714,
  operacion: 'compra',
  mercadoId: 'mer.bree',
  precioUnidad: { base: 20000, introducido: { cantidad: '0,2', moneda: 'mo' } },
  movimientoId: 'mov.viveres.1abril',
  fecha: { anio: 1640, mes: 4, dia: 1 },
  aplicada: true,
}

describe('EsquemaPoblacion', () => {
  it('acepta la población de Bree con sus cambios y sus consumos', () => {
    expect(EsquemaPoblacion.parse(POBLACION_BREE)).toEqual(POBLACION_BREE)
    expect(EsquemaPoblacion.safeParse({ ...POBLACION_BREE, habitantesIniciales: -1 }).success).toBe(false)
  })

  it('no admite un cambio de población de 0 habitantes', () => {
    const cambio = { id: 'pob.cero', fecha: { anio: 1640, mes: 1, dia: 15 }, delta: 0, motivo: 'Sin novedad' }
    const cero = EsquemaCambioPoblacion.safeParse(cambio)
    expect(cero.success).toBe(false)
    expect(cero.error?.issues.map((i) => i.message)).toEqual(['El cambio de población no puede ser 0'])
    expect(EsquemaCambioPoblacion.safeParse({ ...cambio, delta: -6 }).success).toBe(true)
  })

  it('guarda el consumo por habitante con hasta 4 decimales y mayor que 0 (§3)', () => {
    const consumo = { id: 'cons.lenia', nombre: 'Leña', recursoId: 'recurso.madera', porHabitante: 0.0125 }
    expect(EsquemaConsumoPorHabitante.parse(consumo)).toEqual(consumo)
    const cincoDecimales = EsquemaConsumoPorHabitante.safeParse({ ...consumo, porHabitante: 0.01255 })
    expect(cincoDecimales.success).toBe(false)
    expect(cincoDecimales.error?.issues.map((i) => i.message)).toEqual(['Usa como mucho 4 decimales'])
    expect(EsquemaConsumoPorHabitante.safeParse({ ...consumo, porHabitante: 0 }).success).toBe(false)
  })
})

describe('EsquemaExistencia y EsquemaAjusteExistencias', () => {
  it('acepta una fila del almacén y un ajuste a mano, y no deja pasar de la capacidad', () => {
    const viveres: Existencia = {
      dominioId: 'dom.bree',
      recursoId: 'recurso.viveres',
      cantidad: 890,
      capacidad: 1000,
    }
    expect(EsquemaExistencia.parse(viveres)).toEqual(viveres)
    expect(EsquemaExistencia.safeParse({ ...viveres, capacidad: undefined, cantidad: 12000 }).success).toBe(true)

    const pasada = EsquemaExistencia.safeParse({ ...viveres, cantidad: 1001 })
    expect(pasada.success).toBe(false)
    expect(pasada.error?.issues.map((i) => i.message)).toEqual(['Las existencias no pueden superar la capacidad'])
    expect(EsquemaExistencia.safeParse({ ...viveres, cantidad: -1 }).success).toBe(false)

    const ajuste = {
      id: 'aj.viveres.5abril',
      dominioId: 'dom.bree',
      recursoId: 'recurso.viveres',
      fecha: { anio: 1640, mes: 4, dia: 5 },
      delta: -12.5,
      motivo: 'Sacos mojados por las lluvias',
    }
    expect(EsquemaAjusteExistencias.parse(ajuste)).toEqual(ajuste)
    const cero = EsquemaAjusteExistencias.safeParse({ ...ajuste, delta: 0 })
    expect(cero.success).toBe(false)
    expect(cero.error?.issues.map((i) => i.message)).toEqual(['El ajuste no puede ser 0'])
  })
})

describe('EsquemaEntradaAlmacen', () => {
  it('acepta una compra con su mercado y su precio, y una recepción sin coste', () => {
    expect(EsquemaEntradaAlmacen.parse(COMPRA_VIVERES)).toEqual(COMPRA_VIVERES)

    const recepcion: EntradaAlmacen = {
      id: 'ent.donacion',
      dominioId: 'dom.archet',
      recursoId: 'recurso.viveres',
      cantidad: 40,
      operacion: 'recepcion',
      fecha: { anio: 1640, mes: 4, dia: 20 },
      aplicada: false,
    }
    expect(EsquemaEntradaAlmacen.parse(recepcion)).toEqual(recepcion)

    const sinMercado = EsquemaEntradaAlmacen.safeParse({ ...COMPRA_VIVERES, mercadoId: undefined })
    expect(sinMercado.success).toBe(false)
    expect(sinMercado.error?.issues.map((i) => i.message)).toEqual([
      'Una compra guarda su mercado y su precio por unidad',
    ])

    const recepcionConPrecio = EsquemaEntradaAlmacen.safeParse({ ...recepcion, precioUnidad: { base: 20000 } })
    expect(recepcionConPrecio.success).toBe(false)
    expect(recepcionConPrecio.error?.issues.map((i) => i.message)).toEqual([
      'Una recepción sin coste no tiene mercado, precio, movimiento ni caravana',
    ])
  })

  it('guarda «Por personas» con sus tres campos, o con ninguno', () => {
    const porPersonas = { ...COMPRA_VIVERES, personas: 1240, durante: 1, periodo: 'meses' as const }
    expect(EsquemaEntradaAlmacen.parse(porPersonas)).toEqual(porPersonas)

    const aMedias = EsquemaEntradaAlmacen.safeParse({ ...porPersonas, periodo: undefined })
    expect(aMedias.success).toBe(false)
    expect(aMedias.error?.issues.map((i) => i.message)).toEqual([
      '«Por personas» guarda a la vez personas, durante y periodo',
    ])

    const dosPagos = EsquemaEntradaAlmacen.safeParse({ ...COMPRA_VIVERES, caravanaId: 'car.tharbad' })
    expect(dosPagos.success).toBe(false)
    expect(dosPagos.error?.issues.map((i) => i.message)).toEqual([
      'Una compra se paga en el mercado local o sale en caravana, no las dos cosas',
    ])
  })
})

describe('EsquemaProduccionRealizada', () => {
  it('guarda lo producido y lo perdido con el avance que lo anotó (decisión 1)', () => {
    const produccion: ProduccionRealizada = {
      id: 'prod.granjas.7abril',
      fecha: { anio: 1640, mes: 4, dia: 7 },
      edificioId: 'ed.granjas-del-oeste',
      produccionId: 'prod.granjas.viveres',
      recursoId: 'recurso.viveres',
      cantidad: 72,
      perdida: 0,
      avanceId: 'av.6-10abr',
    }
    expect(EsquemaProduccionRealizada.parse(produccion)).toEqual(produccion)
    expect(EsquemaProduccionRealizada.parse({ ...produccion, editadoEl: '2026-09-17T18:30:00.000Z' })).toEqual(
      produccion,
    )
    expect(EsquemaProduccionRealizada.safeParse({ ...produccion, perdida: -1 }).success).toBe(false)
    expect(EsquemaProduccionRealizada.safeParse({ ...produccion, avanceId: undefined }).success).toBe(false)
  })
})
