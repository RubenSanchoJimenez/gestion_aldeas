import { describe, expect, it } from 'vitest'
import { RECURSO } from '../catalogo/inicial'
import { DOM, MERCADO } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Caravana, Mercado } from '../modelo/comercio'
import type { Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Sello } from './registros'
import { bloqueoAlEliminarMercado, diasDeViaje, eliminarMercado, guardarPrecio, guardarRuta } from './mercados'

const AHORA: Instante = '2026-09-18T10:00:00.000Z'
const catalogo = catalogosDeEjemplo()

function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

/** Un mercado nuevo, sin ruta desde Bree ni caravanas: «Cavada Grande» (D-067, ejemplo de mensaje). */
const CAVADA_GRANDE: Mercado = { id: 'mer.cavada-grande', nombre: 'Cavada Grande', precios: [] }

describe('diasDeViaje', () => {
  it('da los días guardados y null si no hay ruta', () => {
    const documento = ejemplo()
    expect(diasDeViaje(documento, DOM.bree, { tipo: 'mercado', id: MERCADO.fornost })).toBe(4)
    const conCavada: DocumentoPartida = { ...documento, mercados: [...documento.mercados, CAVADA_GRANDE] }
    expect(diasDeViaje(conCavada, DOM.bree, { tipo: 'mercado', id: CAVADA_GRANDE.id })).toBeNull()
  })

  it('entre dos asentamientos vale en los dos sentidos', () => {
    const documento = ejemplo()
    const conRuta = guardarRuta(documento, DOM.bree, { tipo: 'asentamiento', id: DOM.archet }, 6, sello())
    expect(diasDeViaje(conRuta, DOM.bree, { tipo: 'asentamiento', id: DOM.archet })).toBe(6)
    expect(diasDeViaje(conRuta, DOM.archet, { tipo: 'asentamiento', id: DOM.bree })).toBe(6)
  })
})

describe('guardarRuta', () => {
  it('crea una ruta nueva', () => {
    const documento = ejemplo()
    const estado = guardarRuta(documento, DOM.bree, { tipo: 'asentamiento', id: DOM.archet }, 6, sello())
    expect(estado.rutas.at(-1)).toEqual({ origenId: DOM.bree, destino: { tipo: 'asentamiento', id: DOM.archet }, diasViaje: 6 })
  })

  it('cambia los días de una ruta existente y sella editadoEl', () => {
    const documento = ejemplo()
    const estado = guardarRuta(documento, DOM.bree, { tipo: 'mercado', id: MERCADO.fornost }, 5, sello())
    const ruta = estado.rutas.find((r) => r.destino.tipo === 'mercado' && r.destino.id === MERCADO.fornost)!
    expect(ruta.diasViaje).toBe(5)
    expect(ruta.editadoEl).toBe(AHORA)
  })

  it('con diasViaje null quita la ruta', () => {
    const documento = ejemplo()
    const estado = guardarRuta(documento, DOM.bree, { tipo: 'mercado', id: MERCADO.fornost }, null, sello())
    expect(estado.rutas.some((r) => r.destino.tipo === 'mercado' && r.destino.id === MERCADO.fornost)).toBe(false)
  })
})

describe('guardarPrecio', () => {
  it('crea el precio de un recurso que el mercado no tenía', () => {
    const documento = ejemplo()
    const estado = guardarPrecio(documento, MERCADO.archet, RECURSO.viveres, { base: 35000 }, sello())
    const mercado = estado.mercados.find((m) => m.id === MERCADO.archet)!
    expect(mercado.precios).toEqual([{ recursoId: RECURSO.viveres, importe: { base: 35000 } }])
  })

  it('«Guardar como precio de Fornost»: cambia un precio existente', () => {
    const documento = ejemplo()
    const estado = guardarPrecio(documento, MERCADO.fornost, RECURSO.viveres, { base: 32000 }, sello())
    const mercado = estado.mercados.find((m) => m.id === MERCADO.fornost)!
    expect(mercado.precios.find((p) => p.recursoId === RECURSO.viveres)!.importe).toEqual({ base: 32000 })
  })
})

describe('bloqueoAlEliminarMercado', () => {
  it('el mercado local no se puede eliminar', () => {
    const documento = ejemplo()
    expect(bloqueoAlEliminarMercado(documento, MERCADO.bree)).toBe('El mercado local no se puede eliminar')
  })

  it('«Fornost tiene 1 caravana sin terminar…» con una caravana en ruta', () => {
    const documento = ejemplo()
    expect(bloqueoAlEliminarMercado(documento, MERCADO.fornost)).toBe(
      'Fornost tiene 1 caravana sin terminar: espera a que vuelva o elimínala antes',
    )
  })

  it('cuenta también una caravana programada', () => {
    const documento = ejemplo()
    const conCavada: DocumentoPartida = { ...documento, mercados: [...documento.mercados, CAVADA_GRANDE] }
    const programada: Caravana = {
      id: 'car.prueba',
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: CAVADA_GRANDE.id,
      carga: { recursoId: RECURSO.viveres, cantidad: 10 },
      precioUnidad: { base: 28000 },
      importe: { base: 280000 },
      salida: { anio: 1640, mes: 4, dia: 20 },
      vuelta: { anio: 1640, mes: 4, dia: 30 },
      estado: 'programada',
    }
    const conCaravana: DocumentoPartida = { ...conCavada, caravanas: [...conCavada.caravanas, programada] }
    expect(bloqueoAlEliminarMercado(conCaravana, CAVADA_GRANDE.id)).toBe(
      'Cavada Grande tiene 1 caravana sin terminar: espera a que vuelva o elimínala antes',
    )
  })

  it('null si no hay nada pendiente', () => {
    const documento = ejemplo()
    const conCavada: DocumentoPartida = { ...documento, mercados: [...documento.mercados, CAVADA_GRANDE] }
    expect(bloqueoAlEliminarMercado(conCavada, CAVADA_GRANDE.id)).toBeNull()
  })
})

describe('eliminarMercado', () => {
  it('borra el mercado con sus precios y sus rutas', () => {
    const documento = ejemplo()
    const conCavada: DocumentoPartida = { ...documento, mercados: [...documento.mercados, CAVADA_GRANDE] }
    const conRuta = guardarRuta(conCavada, DOM.bree, { tipo: 'mercado', id: CAVADA_GRANDE.id }, 5, sello())
    const estado = eliminarMercado(conRuta, CAVADA_GRANDE.id)
    expect(estado.mercados.some((m) => m.id === CAVADA_GRANDE.id)).toBe(false)
    expect(estado.rutas.some((r) => r.destino.tipo === 'mercado' && r.destino.id === CAVADA_GRANDE.id)).toBe(false)
  })

  it('una caravana terminada conserva su mercadoId aunque el mercado se borre, y la copia sigue siendo válida', () => {
    const documento = ejemplo()
    const terminada: Caravana = {
      id: 'car.terminada-cavada',
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: CAVADA_GRANDE.id,
      carga: { recursoId: RECURSO.viveres, cantidad: 10 },
      precioUnidad: { base: 28000 },
      importe: { base: 280000 },
      salida: { anio: 1640, mes: 3, dia: 1 },
      vuelta: { anio: 1640, mes: 3, dia: 10 },
      estado: 'terminada',
    }
    const conCavada: DocumentoPartida = {
      ...documento,
      mercados: [...documento.mercados, CAVADA_GRANDE],
      caravanas: [...documento.caravanas, terminada],
    }
    const estado = eliminarMercado(conCavada, CAVADA_GRANDE.id)
    expect(estado.mercados.some((m) => m.id === CAVADA_GRANDE.id)).toBe(false)
    expect(estado.caravanas.find((c) => c.id === terminada.id)!.mercadoId).toBe(CAVADA_GRANDE.id)
    expect(validarCopia(estado, catalogo)).toEqual([])
  })
})
