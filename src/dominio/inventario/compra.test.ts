import { describe, expect, it } from 'vitest'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { DOM, MOV_THARAN, OBJETO } from '../ejemplo/ids'
import type { ObjetoPendiente } from '../modelo/movimientos'
import { EsquemaObjetoInventario, type ObjetoInventario } from '../modelo/personaje'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { anadirObjetoComprado } from './compra'

/** Los 7 objetos de Tharan, congelados: la función no puede tocarlos. */
function objetosDeTharan(): ObjetoInventario[] {
  return congelar(documentoDeEjemplo().objetos)
}

/** Lo que el pago programado pide añadir: 2 athelas encima, a 2 mp cada una, como la fila del ejemplo. */
function athelas(cambios: Partial<ObjetoPendiente> = {}): ObjetoPendiente {
  return {
    nombre: 'Athelas',
    cantidad: 2,
    valorUnitario: { base: 20000, introducido: { cantidad: '2', moneda: 'mp' } },
    ubicacion: { tipo: 'encima' },
    ...cambios,
  }
}

const DATOS = { personajeId: DOM.tharan, movimientoId: 'mov.capa' }

describe('anadirObjetoComprado', () => {
  it('crea una fila nueva del personaje con el movimiento que la compró (§7 l.1173, D-034)', () => {
    const objetos = objetosDeTharan()
    const capa: ObjetoPendiente = {
      nombre: 'Capa élfica',
      cantidad: 1,
      valorUnitario: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
      ubicacion: { tipo: 'encima' },
      notas: 'Regalo para Barnabás',
    }
    const resultado = anadirObjetoComprado(objetos, capa, { ...DATOS, nuevoId: idsEnSerie('sim') })
    expect(resultado).toHaveLength(8)
    expect(resultado.slice(0, 7)).toEqual(objetos)
    expect(resultado[7]).toEqual({
      id: 'sim.1',
      dominioId: DOM.tharan,
      nombre: 'Capa élfica',
      cantidad: 1,
      valorUnitario: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
      ubicacion: { tipo: 'encima' },
      notas: 'Regalo para Barnabás',
      movimientoCompraId: 'mov.capa',
    })
    expect(EsquemaObjetoInventario.safeParse(resultado[7]).success).toBe(true)
  })

  it('sin notas, la fila nueva no lleva la clave', () => {
    const resultado = anadirObjetoComprado([], athelas({ ubicacion: { tipo: 'caja', dominioId: DOM.bree } }), {
      ...DATOS,
      nuevoId: idsEnSerie('sim'),
    })
    expect(resultado).toHaveLength(1)
    expect('notas' in resultado[0]).toBe(false)
  })

  it('suma a la fila con el mismo nombre normalizado, ubicación y valor, y conserva su movimientoCompraId (T19)', () => {
    const objetos = objetosDeTharan()
    const nuevoId = idsEnSerie('sim')
    const resultado = anadirObjetoComprado(objetos, athelas({ nombre: '  ATHELAS ' }), { ...DATOS, nuevoId })
    expect(resultado).toHaveLength(7)
    const fila = resultado.find((o) => o.id === OBJETO.athelas)
    expect(fila?.cantidad).toBe(5)
    expect(fila?.nombre).toBe('Athelas')
    expect(fila?.movimientoCompraId).toBe(MOV_THARAN.athelas)
    expect(nuevoId()).toBe('sim.1')
  })

  it('no suma a una fila archivada: crea otra', () => {
    const objetos = objetosDeTharan()
    const pergamino: ObjetoPendiente = {
      nombre: 'Pergamino «Paso sin rastro»',
      cantidad: 1,
      valorUnitario: { base: 736000, introducido: { cantidad: '7,36', moneda: 'mo' } },
      ubicacion: { tipo: 'encima' },
    }
    const resultado = anadirObjetoComprado(objetos, pergamino, { ...DATOS, nuevoId: idsEnSerie('sim') })
    expect(resultado).toHaveLength(8)
    expect(resultado[7].id).toBe('sim.1')
    expect(resultado.find((o) => o.id === OBJETO.pergaminoPaso)?.cantidad).toBe(1)
  })

  it('no suma con otro valor por unidad ni con otra ubicación', () => {
    const objetos = objetosDeTharan()
    const nuevoId = idsEnSerie('sim')
    const otroValor = anadirObjetoComprado(objetos, athelas({ valorUnitario: { base: 25000 } }), { ...DATOS, nuevoId })
    expect(otroValor).toHaveLength(8)
    const otraUbicacion = anadirObjetoComprado(objetos, athelas({ ubicacion: { tipo: 'caja', dominioId: DOM.bree } }), {
      ...DATOS,
      nuevoId,
    })
    expect(otraUbicacion).toHaveLength(8)
    const esmeraldaEnArchet = anadirObjetoComprado(
      objetos,
      {
        nombre: 'Esmeralda tallada',
        cantidad: 1,
        valorUnitario: { base: 1200000 },
        ubicacion: { tipo: 'caja', dominioId: DOM.archet },
      },
      { ...DATOS, nuevoId },
    )
    expect(esmeraldaEnArchet).toHaveLength(8)
    expect(esmeraldaEnArchet.find((o) => o.id === OBJETO.esmeraldas)?.cantidad).toBe(2)
  })

  it('no muta la entrada: devuelve una lista nueva y la fila sumada es otro objeto', () => {
    const objetos = objetosDeTharan()
    const resultado = anadirObjetoComprado(objetos, athelas(), { ...DATOS, nuevoId: idsEnSerie('sim') })
    expect(resultado).not.toBe(objetos)
    expect(objetos.find((o) => o.id === OBJETO.athelas)?.cantidad).toBe(3)
    expect(resultado.find((o) => o.id === OBJETO.athelas)).not.toBe(objetos.find((o) => o.id === OBJETO.athelas))
    expect(resultado.find((o) => o.id === OBJETO.espada)).toBe(objetos.find((o) => o.id === OBJETO.espada))
  })
})
