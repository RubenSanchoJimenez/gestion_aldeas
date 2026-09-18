import { describe, expect, it } from 'vitest'
import {
  EsquemaCaravana,
  EsquemaMercado,
  EsquemaPrecioMercado,
  EsquemaRuta,
  type Caravana,
  type Mercado,
  type Ruta,
} from './comercio'

/** El mercado de Fornost, a 4 días de Bree (A10, A10c). */
const FORNOST: Mercado = {
  id: 'mer.fornost',
  nombre: 'Fornost',
  precios: [
    { recursoId: 'recurso.piedra', importe: { base: 25000, introducido: { cantidad: '0,25', moneda: 'mo' } } },
    { recursoId: 'recurso.cerveza', importe: { base: 60000, introducido: { cantidad: '0,6', moneda: 'mo' } } },
  ],
}

/** La caravana que vende 40 barriles de cerveza en Fornost y vuelve el 18 de abril (A10b). */
const CARAVANA_FORNOST: Caravana = {
  id: 'car.fornost.abril',
  dominioId: 'dom.bree',
  operacion: 'venta',
  mercadoId: 'mer.fornost',
  carga: { recursoId: 'recurso.cerveza', cantidad: 40 },
  precioUnidad: { base: 60000, introducido: { cantidad: '0,6', moneda: 'mo' } },
  importe: { base: 2400000, introducido: { cantidad: '24', moneda: 'mo' } },
  salida: { anio: 1640, mes: 4, dia: 10 },
  vuelta: { anio: 1640, mes: 4, dia: 18 },
  estado: 'enRuta',
}

describe('EsquemaMercado', () => {
  it('acepta el mercado local de Bree, sin precios, y el de Fornost con los suyos', () => {
    expect(EsquemaMercado.parse(FORNOST)).toEqual(FORNOST)

    const local: Mercado = { id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }
    expect(EsquemaMercado.parse(local)).toEqual(local)
    expect(EsquemaMercado.safeParse({ ...local, nombre: 'B' }).success).toBe(false)
  })

  it('exige que el precio de un recurso sea mayor que 0 (§6.6)', () => {
    const cero = EsquemaPrecioMercado.safeParse({ recursoId: 'recurso.piedra', importe: { base: 0 } })
    expect(cero.success).toBe(false)
    expect(cero.error?.issues.map((i) => i.message)).toEqual(['El precio debe ser mayor que 0'])
    expect(EsquemaMercado.safeParse({ ...FORNOST, precios: [{ recursoId: 'recurso.piedra', importe: { base: -1 } }] }).success).toBe(
      false,
    )
  })
})

describe('EsquemaRuta', () => {
  it('guarda el destino con discriminador y los días de viaje de 1 a 365 (decisión 13)', () => {
    const aFornost: Ruta = {
      origenId: 'dom.bree',
      destino: { tipo: 'mercado', id: 'mer.fornost' },
      diasViaje: 4,
    }
    expect(EsquemaRuta.parse(aFornost)).toEqual(aFornost)

    const aArchet: Ruta = {
      origenId: 'dom.bree',
      destino: { tipo: 'asentamiento', id: 'dom.archet' },
      diasViaje: 1,
    }
    expect(EsquemaRuta.parse(aArchet)).toEqual(aArchet)

    expect(EsquemaRuta.safeParse({ ...aFornost, destino: { tipo: 'aldea', id: 'dom.archet' } }).success).toBe(false)
    expect(EsquemaRuta.safeParse({ ...aFornost, destino: { id: 'mer.fornost' } }).success).toBe(false)
    expect(EsquemaRuta.safeParse({ ...aFornost, diasViaje: 0 }).success).toBe(false)
    expect(EsquemaRuta.safeParse({ ...aFornost, diasViaje: 366 }).success).toBe(false)
  })
})

describe('EsquemaCaravana', () => {
  it('acepta la venta de cerveza en Fornost con su mercado, su precio y su importe', () => {
    expect(EsquemaCaravana.parse(CARAVANA_FORNOST)).toEqual(CARAVANA_FORNOST)

    const sinPrecio = EsquemaCaravana.safeParse({ ...CARAVANA_FORNOST, precioUnidad: undefined })
    expect(sinPrecio.success).toBe(false)
    expect(sinPrecio.error?.issues.map((i) => i.message)).toEqual([
      'Una compra o una venta guardan su mercado, su precio por unidad y su importe',
    ])

    const conDestino = EsquemaCaravana.safeParse({ ...CARAVANA_FORNOST, destinoId: 'dom.archet' })
    expect(conDestino.success).toBe(false)
    expect(conDestino.error?.issues.map((i) => i.message)).toEqual(['Solo un traslado tiene asentamiento de destino'])
  })

  it('acepta un traslado, que no mueve dinero, y exige que la vuelta no sea anterior a la salida', () => {
    const traslado: Caravana = {
      id: 'car.traslado.archet',
      dominioId: 'dom.bree',
      operacion: 'traslado',
      destinoId: 'dom.archet',
      carga: { recursoId: 'recurso.viveres', cantidad: 120 },
      salida: { anio: 1640, mes: 4, dia: 11 },
      vuelta: { anio: 1640, mes: 4, dia: 12 },
      estado: 'programada',
    }
    expect(EsquemaCaravana.parse(traslado)).toEqual(traslado)

    const conDinero = EsquemaCaravana.safeParse({ ...traslado, importe: { base: 100000 } })
    expect(conDinero.success).toBe(false)
    expect(conDinero.error?.issues.map((i) => i.message)).toEqual([
      'Un traslado guarda su asentamiento de destino y no mueve dinero',
    ])

    const alMismoSitio = EsquemaCaravana.safeParse({ ...traslado, destinoId: 'dom.bree' })
    expect(alMismoSitio.success).toBe(false)
    expect(alMismoSitio.error?.issues.map((i) => i.message)).toEqual([
      'Un traslado no puede ir al mismo asentamiento del que sale',
    ])

    const alReves = EsquemaCaravana.safeParse({ ...traslado, vuelta: { anio: 1640, mes: 4, dia: 10 } })
    expect(alReves.success).toBe(false)
    expect(alReves.error?.issues.map((i) => i.message)).toEqual(['La vuelta no puede ser anterior a la salida'])
  })
})
