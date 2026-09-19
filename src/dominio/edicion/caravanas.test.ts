import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { RECURSO } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { CARAVANA, DOM, MERCADO, MOV_BREE } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Mercado } from '../modelo/comercio'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import { guardarRuta } from './mercados'
import type { Sello } from './registros'
import { crearCaravana, editarCaravana, eliminarCaravana, type DatosCaravana } from './caravanas'

const AHORA: Instante = '2026-09-18T10:00:00.000Z'
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }
const catalogo = catalogosDeEjemplo()

function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

function existencia(documento: DocumentoPartida, dominioId: Id, recursoId: Id): number {
  return documento.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)?.cantidad ?? 0
}

function caravana(documento: DocumentoPartida, id: Id) {
  const c = documento.caravanas.find((x) => x.id === id)
  if (c === undefined) {
    throw new Error(`No está «${id}»`)
  }
  return c
}

const CAVADA_GRANDE: Mercado = { id: 'mer.cavada-grande', nombre: 'Cavada Grande', precios: [] }

describe('crearCaravana', () => {
  it('compra de 100 sacos en Fornost a 0,3 mo con salida hoy: vuelta el 20, gasto de 3.000.000 mh (O13)', () => {
    const documento = ejemplo()
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: MERCADO.fornost,
      carga: { recursoId: RECURSO.viveres, cantidad: 100 },
      precioUnidad: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
      salida: HOY,
    }
    const { estado, id } = crearCaravana(documento, datos, sello(), catalogo)
    const c = caravana(estado, id)
    expect(c.vuelta).toEqual({ anio: 1640, mes: 4, dia: 20 })
    expect(c.estado).toBe('enRuta')
    const gasto = estado.movimientos.find((m) => m.id === c.movimientoSalidaId)!
    expect(gasto.importe.base).toBe(-3000000)
    expect(gasto.concepto).toBe('Caravana: compra de víveres en Fornost')
  })

  it('venta de 10 barriles de cerveza en Bree (mercado local): cerveza 80, cobro de 400.000 mh, terminada (O13)', () => {
    const documento = ejemplo()
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'venta',
      mercadoId: MERCADO.bree,
      carga: { recursoId: RECURSO.cerveza, cantidad: 10 },
      precioUnidad: { base: 40000 },
      salida: HOY,
    }
    const { estado, id } = crearCaravana(documento, datos, sello(), catalogo)
    expect(existencia(estado, DOM.bree, RECURSO.cerveza)).toBe(80)
    const c = caravana(estado, id)
    expect(c.estado).toBe('terminada')
    expect(c.vuelta).toEqual(HOY)
    const cobro = estado.movimientos.find((m) => m.id === c.movimientoVueltaId)!
    expect(cobro.importe.base).toBe(400000)
    expect(cobro.concepto).toBe('Caravana: venta de cerveza en Bree')
    expect(cobro.categoriaId).toBe('cat.comercio')
  })

  it('vender 100 barriles → «La carga no puede superar las existencias: hay 90 barriles»', () => {
    const documento = ejemplo()
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'venta',
      mercadoId: MERCADO.bree,
      carga: { recursoId: RECURSO.cerveza, cantidad: 100 },
      precioUnidad: { base: 40000 },
      salida: HOY,
    }
    expect(() => crearCaravana(documento, datos, sello(), catalogo)).toThrow(
      'La carga no puede superar las existencias: hay 90 barriles',
    )
  })

  it('una caravana de 100 sacos a 0,28 mo en Cavada Grande (5 días) cuesta 28 mo, deja la caja en 312,6 mo y vuelve el 22 (O9)', () => {
    const documento = ejemplo()
    const conCavada: DocumentoPartida = { ...documento, mercados: [...documento.mercados, CAVADA_GRANDE] }
    const conRuta = guardarRuta(conCavada, DOM.bree, { tipo: 'mercado', id: CAVADA_GRANDE.id }, 5, sello())
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: CAVADA_GRANDE.id,
      carga: { recursoId: RECURSO.viveres, cantidad: 100 },
      precioUnidad: { base: 28000, introducido: { cantidad: '0,28', moneda: 'mo' } },
      salida: HOY,
    }
    const { estado, id } = crearCaravana(conRuta, datos, sello(), catalogo)
    expect(caravana(estado, id).vuelta).toEqual({ anio: 1640, mes: 4, dia: 22 })
    expect(saldosPorDominio(estado)[DOM.bree]).toBe(31260000)
  })

  it('con salida futura queda programada, con su gasto programado', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: MERCADO.fornost,
      carga: { recursoId: RECURSO.viveres, cantidad: 50 },
      precioUnidad: { base: 30000 },
      salida: futuro,
    }
    const { estado, id } = crearCaravana(documento, datos, sello(), catalogo)
    const c = caravana(estado, id)
    expect(c.estado).toBe('programada')
    expect(estado.movimientos.find((m) => m.id === c.movimientoSalidaId)!.programado).toBe(true)
    expect(existencia(estado, DOM.bree, RECURSO.viveres)).toBe(310)
  })

  it('una venta a un mercado con ruta queda en ruta (no cobra hasta volver)', () => {
    const documento = ejemplo()
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'venta',
      mercadoId: MERCADO.fornost,
      carga: { recursoId: RECURSO.piedra, cantidad: 20 },
      precioUnidad: { base: 15000 },
      salida: HOY,
    }
    const { estado, id } = crearCaravana(documento, datos, sello(), catalogo)
    const c = caravana(estado, id)
    expect(c.estado).toBe('enRuta')
    expect(c.movimientoVueltaId).toBeUndefined()
    expect(existencia(estado, DOM.bree, RECURSO.piedra)).toBe(160)
  })

  it('un traslado, con la ruta Bree–Archet guardada antes, crea la fila de destino y saca la carga de origen', () => {
    const documento = ejemplo()
    const conRuta = guardarRuta(documento, DOM.bree, { tipo: 'asentamiento', id: DOM.archet }, 6, sello())
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'traslado',
      destinoId: DOM.archet,
      carga: { recursoId: RECURSO.piedra, cantidad: 15 },
      salida: HOY,
    }
    const { estado, id } = crearCaravana(conRuta, datos, sello(), catalogo)
    const c = caravana(estado, id)
    expect(c.estado).toBe('enRuta')
    expect(c.vuelta).toEqual({ anio: 1640, mes: 4, dia: 18 })
    expect(existencia(estado, DOM.bree, RECURSO.piedra)).toBe(165)
    expect(estado.existencias.some((e) => e.dominioId === DOM.archet && e.recursoId === RECURSO.piedra)).toBe(true)
  })

  it('una compra en el mercado local lanza «Las compras en el mercado local se anotan con «Añadir existencias»» (D-054)', () => {
    const documento = ejemplo()
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: MERCADO.bree,
      carga: { recursoId: RECURSO.viveres, cantidad: 10 },
      precioUnidad: { base: 40000 },
      salida: HOY,
    }
    expect(() => crearCaravana(documento, datos, sello(), catalogo)).toThrow(
      'Las compras en el mercado local se anotan con «Añadir existencias»',
    )
  })

  it('sin ruta lanza «Faltan los días de viaje de Bree a Cavada Grande»', () => {
    const documento = ejemplo()
    const conCavada: DocumentoPartida = { ...documento, mercados: [...documento.mercados, CAVADA_GRANDE] }
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: CAVADA_GRANDE.id,
      carga: { recursoId: RECURSO.viveres, cantidad: 10 },
      precioUnidad: { base: 30000 },
      salida: HOY,
    }
    expect(() => crearCaravana(conCavada, datos, sello(), catalogo)).toThrow('Faltan los días de viaje de Bree a Cavada Grande')
  })
})

describe('editarCaravana', () => {
  it('programada: se rehace entera con el mismo id', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const { estado: conProgramada, id } = crearCaravana(
      documento,
      {
        dominioId: DOM.bree,
        operacion: 'compra',
        mercadoId: MERCADO.fornost,
        carga: { recursoId: RECURSO.viveres, cantidad: 50 },
        precioUnidad: { base: 30000 },
        salida: futuro,
      },
      sello(),
      catalogo,
    )
    const viejoMovimiento = caravana(conProgramada, id).movimientoSalidaId!
    const nuevos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: MERCADO.tharbad,
      carga: { recursoId: RECURSO.viveres, cantidad: 80 },
      precioUnidad: { base: 25000 },
      salida: futuro,
    }
    const estado = editarCaravana(conProgramada, id, nuevos, sello(), catalogo)
    const c = caravana(estado, id)
    expect(c.id).toBe(id)
    expect(c.mercadoId).toBe(MERCADO.tharbad)
    expect(c.carga.cantidad).toBe(80)
    expect(estado.movimientos.some((m) => m.id === viejoMovimiento)).toBe(false)
    expect(c.editadoEl).toBe(AHORA)
  })

  it('en ruta: solo cambia el precio, que corrige su pago', () => {
    const documento = ejemplo()
    const nuevoPrecio: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: MERCADO.tharbad,
      carga: { recursoId: RECURSO.viveres, cantidad: 300 },
      precioUnidad: { base: 27000, introducido: { cantidad: '0,27', moneda: 'mo' } },
      salida: caravana(documento, CARAVANA.compraViveresTharbad).salida,
    }
    const estado = editarCaravana(documento, CARAVANA.compraViveresTharbad, nuevoPrecio, sello(), catalogo)
    const c = caravana(estado, CARAVANA.compraViveresTharbad)
    expect(c.precioUnidad).toEqual({ base: 27000, introducido: { cantidad: '0,27', moneda: 'mo' } })
    expect(c.importe).toEqual({ base: 8100000 })
    const gasto = estado.movimientos.find((m) => m.id === MOV_BREE.caravanaTharbad)!
    expect(gasto.importe.base).toBe(-8100000)
  })

  it('en ruta: sin precio nuevo lanza «En una caravana en ruta solo cambia el precio»', () => {
    const documento = ejemplo()
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: MERCADO.tharbad,
      carga: { recursoId: RECURSO.viveres, cantidad: 300 },
      salida: caravana(documento, CARAVANA.compraViveresTharbad).salida,
    }
    expect(() => editarCaravana(documento, CARAVANA.compraViveresTharbad, datos, sello(), catalogo)).toThrow(
      'En una caravana en ruta solo cambia el precio',
    )
  })

  it('terminada: solo cambia el precio, que corrige su cobro', () => {
    const documento = ejemplo()
    const terminada = {
      ...caravana(documento, CARAVANA.ventaCervezaFornost),
      estado: 'terminada' as const,
      movimientoVueltaId: 'mov.cobro-fornost',
    }
    const conMovimiento: DocumentoPartida = {
      ...documento,
      caravanas: documento.caravanas.map((c) => (c.id === terminada.id ? terminada : c)),
      movimientos: [
        ...documento.movimientos,
        {
          id: 'mov.cobro-fornost',
          dominioId: DOM.bree,
          fecha: terminada.vuelta,
          tipo: 'ingreso' as const,
          importe: { base: 2400000 },
          categoriaId: 'cat.comercio',
          concepto: 'Caravana: venta de cerveza en Fornost',
          origen: 'manual' as const,
          vinculo: { tipo: 'caravana' as const, id: terminada.id },
          programado: false,
        },
      ],
    }
    const nuevoPrecio: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'venta',
      mercadoId: MERCADO.fornost,
      carga: terminada.carga,
      precioUnidad: { base: 65000 },
      salida: terminada.salida,
    }
    const estado = editarCaravana(conMovimiento, terminada.id, nuevoPrecio, sello(), catalogo)
    const cobro = estado.movimientos.find((m) => m.id === 'mov.cobro-fornost')!
    expect(cobro.importe.base).toBe(2600000)
  })
})

describe('eliminarCaravana', () => {
  it('programada: se borra con su movimiento programado', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const { estado: conProgramada, id } = crearCaravana(
      documento,
      {
        dominioId: DOM.bree,
        operacion: 'compra',
        mercadoId: MERCADO.fornost,
        carga: { recursoId: RECURSO.viveres, cantidad: 50 },
        precioUnidad: { base: 30000 },
        salida: futuro,
      },
      sello(),
      catalogo,
    )
    const movimientoId = caravana(conProgramada, id).movimientoSalidaId!
    const estado = eliminarCaravana(conProgramada, id, { devolver: false }, catalogo)
    expect(estado.caravanas.some((c) => c.id === id)).toBe(false)
    expect(estado.movimientos.some((m) => m.id === movimientoId)).toBe(false)
  })

  it('en ruta, compra, con devolver: true → sin el gasto de 75 mo (O13, Tharbad)', () => {
    const documento = ejemplo()
    const estado = eliminarCaravana(documento, CARAVANA.compraViveresTharbad, { devolver: true }, catalogo)
    expect(estado.movimientos.some((m) => m.id === MOV_BREE.caravanaTharbad)).toBe(false)
  })

  it('en ruta, compra, con devolver: false → el gasto se queda suelto', () => {
    const documento = ejemplo()
    const estado = eliminarCaravana(documento, CARAVANA.compraViveresTharbad, { devolver: false }, catalogo)
    const gasto = estado.movimientos.find((m) => m.id === MOV_BREE.caravanaTharbad)!
    expect(gasto.vinculo).toBeUndefined()
  })

  it('en ruta, venta, con devolver: true → la carga vuelve a la fila de origen', () => {
    const documento = ejemplo()
    const estado = eliminarCaravana(documento, CARAVANA.ventaCervezaFornost, { devolver: true }, catalogo)
    expect(existencia(estado, DOM.bree, RECURSO.cerveza)).toBe(130)
  })

  it('terminada: los movimientos se quedan sin vínculo', () => {
    const documento = ejemplo()
    const terminada = {
      ...caravana(documento, CARAVANA.ventaCervezaFornost),
      estado: 'terminada' as const,
      movimientoVueltaId: 'mov.cobro-fornost',
    }
    const conMovimiento: DocumentoPartida = {
      ...documento,
      caravanas: documento.caravanas.map((c) => (c.id === terminada.id ? terminada : c)),
      movimientos: [
        ...documento.movimientos,
        {
          id: 'mov.cobro-fornost',
          dominioId: DOM.bree,
          fecha: terminada.vuelta,
          tipo: 'ingreso' as const,
          importe: { base: 2400000 },
          categoriaId: 'cat.comercio',
          concepto: 'Caravana: venta de cerveza en Fornost',
          origen: 'manual' as const,
          vinculo: { tipo: 'caravana' as const, id: terminada.id },
          programado: false,
        },
      ],
    }
    const estado = eliminarCaravana(conMovimiento, terminada.id, { devolver: false }, catalogo)
    const cobro = estado.movimientos.find((m) => m.id === 'mov.cobro-fornost')!
    expect(cobro.vinculo).toBeUndefined()
  })

  it('las entradas del almacén con su caravanaId lo pierden, y la copia sigue siendo válida', () => {
    const documento = ejemplo()
    const entrada = {
      id: 'entrada.de-tharbad',
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      cantidad: 300,
      operacion: 'compra' as const,
      mercadoId: MERCADO.tharbad,
      precioUnidad: { base: 25000 },
      caravanaId: CARAVANA.compraViveresTharbad,
      fecha: { anio: 1640, mes: 4, dia: 25 },
      aplicada: false,
    }
    const conEntrada: DocumentoPartida = { ...documento, entradasAlmacen: [...documento.entradasAlmacen, entrada] }
    const estado = eliminarCaravana(conEntrada, CARAVANA.compraViveresTharbad, { devolver: false }, catalogo)
    const e = estado.entradasAlmacen.find((x) => x.id === entrada.id)!
    expect(e.caravanaId).toBeUndefined()
    expect(validarCopia(estado, catalogo)).toEqual([])
  })
})
