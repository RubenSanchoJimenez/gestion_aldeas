import { describe, expect, it } from 'vitest'
import { sacosPorPersonas } from '../almacen/cantidades'
import { CATEGORIA, RECURSO } from '../catalogo/inicial'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { validarCopia } from '../validacion/coherencia'
import { crearEntradaAlmacen, eliminarEntradaAlmacen, type DatosEntrada } from './entradas'
import type { Sello } from './registros'

function catalogo() {
  return catalogosDeEjemplo()
}

function ejemplo(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

function sello(): Sello {
  let ultimo = 0
  return { ahora: '2026-09-18T12:00:00.000Z', nuevoId: () => `sim.${(ultimo += 1)}` }
}

function filaDe(estado: EstadoPartida, dominioId: string, recursoId: string) {
  return estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
}

describe('crearEntradaAlmacen (O13)', () => {
  it('compra de hoy de 100 sacos a 0,4 mo: gasto de 4.000.000 mh en «Víveres del almacén» y víveres a 410', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 100,
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    const { estado, id } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    expect(filaDe(estado, DOM.bree, RECURSO.viveres)?.cantidad).toBe(410)
    const entrada = estado.entradasAlmacen.find((e) => e.id === id)
    expect(entrada).toMatchObject({ aplicada: true, cantidad: 100, operacion: 'compra' })
    const gasto = estado.movimientos.find((m) => m.vinculo?.tipo === 'entradaAlmacen' && m.vinculo.id === id)
    expect(gasto).toMatchObject({
      dominioId: DOM.bree,
      tipo: 'gasto',
      importe: { base: -4000000 },
      categoriaId: CATEGORIA.viveresDelAlmacen,
      concepto: 'Compra de víveres en Bree',
      programado: false,
    })
    expect(entrada?.movimientoId).toBe(gasto?.id)
  })

  it('«Por personas» 100 × 1 mes: 100 sacos', () => {
    const cantidad = sacosPorPersonas(100, 1, 'meses', 30)
    expect(cantidad).toBe(100)
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad,
      porPersonas: { personas: 100, durante: 1, periodo: 'meses' },
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    const { estado, id } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    const entrada = estado.entradasAlmacen.find((e) => e.id === id)
    expect(entrada).toMatchObject({ cantidad: 100, personas: 100, durante: 1, periodo: 'meses' })
  })

  it('1.000 sacos hoy: «Caben 890 sacos más»', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 1000,
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    expect(() => crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())).toThrow('Caben 890 sacos más')
  })

  it('una recepción de hoy entra sin coste ni movimiento', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'recepcion',
      cantidad: 50,
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    const { estado, id } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    expect(filaDe(estado, DOM.bree, RECURSO.viveres)?.cantidad).toBe(360)
    const entrada = estado.entradasAlmacen.find((e) => e.id === id)
    expect(entrada).toMatchObject({ aplicada: true })
    expect(estado.movimientos.some((m) => m.vinculo?.tipo === 'entradaAlmacen')).toBe(false)
  })

  it('una compra futura queda sin aplicar y con su gasto programado; el motor la aplica el día señalado', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 50,
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 20 },
    }
    const { estado, id } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    const entrada = estado.entradasAlmacen.find((e) => e.id === id)
    expect(entrada?.aplicada).toBe(false)
    const gasto = estado.movimientos.find((m) => m.vinculo?.tipo === 'entradaAlmacen' && m.vinculo.id === id)
    expect(gasto?.programado).toBe(true)
    // El motor la aplica al llegar el día (paso 3, T11): comparado con no tener la entrada, hay 50 sacos más.
    const opciones = { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogo() }
    const recorrido = recorrerDias(estado, { anio: 1640, mes: 4, dia: 21 }, opciones)
    const sinEntrada = recorrerDias(ejemplo(), { anio: 1640, mes: 4, dia: 21 }, opciones)
    const entradaAplicada = recorrido.estadoNuevo.entradasAlmacen.find((e) => e.id === id)
    expect(entradaAplicada).toMatchObject({ aplicada: true, fecha: { anio: 1640, mes: 4, dia: 20 } })
    const conEntrada = filaDe(recorrido.estadoNuevo, DOM.bree, RECURSO.viveres)?.cantidad ?? 0
    const sinEntradaCantidad = filaDe(sinEntrada.estadoNuevo, DOM.bree, RECURSO.viveres)?.cantidad ?? 0
    expect(conEntrada - sinEntradaCantidad).toBeCloseTo(50, 6)
  })

  it('una compra de otro recurso va a Comercio', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.hierro,
      operacion: 'compra',
      cantidad: 10,
      precioUnidad: { base: 100000 },
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    const { estado, id } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    const gasto = estado.movimientos.find((m) => m.vinculo?.tipo === 'entradaAlmacen' && m.vinculo.id === id)
    expect(gasto?.categoriaId).toBe(CATEGORIA.comercio)
    expect(gasto?.concepto).toBe('Compra de hierro en Bree')
  })

  it('crea la fila de un recurso que el almacén no tenía', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: 'recurso.sal',
      operacion: 'recepcion',
      cantidad: 30,
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    const { estado } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    expect(filaDe(estado, DOM.bree, 'recurso.sal')?.cantidad).toBe(30)
  })

  it('el resultado pasa validarCopia', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 100,
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    const { estado } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    expect(validarCopia({ ...estado, avances: documentoDeEjemplo().avances }, catalogo())).toEqual([])
  })
})

describe('eliminarEntradaAlmacen', () => {
  function conEntradaAplicada(): { estado: EstadoPartida; id: string } {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 100,
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    return crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
  }

  it('aplicada: saca sus unidades y borra su movimiento', () => {
    const { estado, id } = conEntradaAplicada()
    const gastoAntes = estado.movimientos.find((m) => m.vinculo?.tipo === 'entradaAlmacen' && m.vinculo.id === id)
    expect(gastoAntes).toBeDefined()
    const final = eliminarEntradaAlmacen(estado, id, catalogo())
    expect(filaDe(final, DOM.bree, RECURSO.viveres)?.cantidad).toBe(310)
    expect(final.movimientos.find((m) => m.id === gastoAntes?.id)).toBeUndefined()
    expect(final.entradasAlmacen.find((e) => e.id === id)).toBeUndefined()
  })

  it('aplicada: si bajaría de 0, bloquea', () => {
    const { estado, id } = conEntradaAplicada()
    const conPocosViveres: EstadoPartida = {
      ...estado,
      existencias: estado.existencias.map((e) => (e.recursoId === RECURSO.viveres ? { ...e, cantidad: 50 } : e)),
    }
    expect(() => eliminarEntradaAlmacen(conPocosViveres, id, catalogo())).toThrow(
      'Las existencias no pueden quedar por debajo de 0',
    )
  })

  it('una compra sin precioUnidad lanza «La compra necesita un precio por unidad»', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 100,
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    expect(() => crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())).toThrow(
      'La compra necesita un precio por unidad',
    )
  })

  it('sin aplicar: borra la entrada con su programado', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 50,
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 20 },
    }
    const { estado, id } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    const gastoAntes = estado.movimientos.find((m) => m.vinculo?.tipo === 'entradaAlmacen' && m.vinculo.id === id)
    const final = eliminarEntradaAlmacen(estado, id, catalogo())
    expect(final.entradasAlmacen.find((e) => e.id === id)).toBeUndefined()
    expect(final.movimientos.find((m) => m.id === gastoAntes?.id)).toBeUndefined()
    expect(filaDe(final, DOM.bree, RECURSO.viveres)?.cantidad).toBe(310)
  })

  it('con caravanaId, lanza «Esta compra se edita desde su caravana»', () => {
    const base = ejemplo()
    const conEntradaDeCaravana: EstadoPartida = {
      ...base,
      entradasAlmacen: [
        {
          id: 'ent.caravana',
          dominioId: DOM.bree,
          recursoId: RECURSO.viveres,
          cantidad: 300,
          operacion: 'compra',
          mercadoId: 'mer.tharbad',
          precioUnidad: { base: 25000 },
          caravanaId: 'car.tharbad',
          fecha: { anio: 1640, mes: 4, dia: 25 },
          aplicada: false,
        },
      ],
    }
    expect(() => eliminarEntradaAlmacen(conEntradaDeCaravana, 'ent.caravana', catalogo())).toThrow(
      'Esta compra se edita desde su caravana',
    )
  })
})
