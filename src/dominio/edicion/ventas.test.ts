import { describe, expect, it } from 'vitest'
import { saldosPorDominio } from '../dinero/saldo'
import { DOM, OBJETO, PERGAMINO } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { patrimonioDelPersonaje } from '../personaje/patrimonio'
import type { Sello } from './registros'
import { editarVenta, eliminarVenta, venderObjeto, vistaPreviaDeVenta, type DatosVenta } from './ventas'

const sello = (): Sello => ({ ahora: '2026-11-25T10:00:00.000Z', nuevoId: idsEnSerie('ed') })
const estado = (): EstadoPartida => estadoDe(documentoDeEjemplo())
const datos = (cambios: Partial<DatosVenta> = {}): DatosVenta => ({
  cantidad: 1,
  precioUnitario: { base: 1100000 },
  cuentaId: DOM.tharan,
  fecha: { anio: 1640, mes: 4, dia: 12 },
  ...cambios,
})
const objetoDe = (e: EstadoPartida, id: string) => e.objetos.find((o) => o.id === id)

describe('venderObjeto (J3b, O4)', () => {
  it('vender una esmeralda a 11 mo deja 57,518 mo en la bolsa y 166,118 mo de patrimonio', () => {
    expect(vistaPreviaDeVenta(estado(), OBJETO.esmeraldas, datos())).toEqual({
      total: 1100000,
      diferencia: -100000,
      saldoDespues: 5751800,
      patrimonioDespues: 16611800,
    })
    const { estado: nuevo, id } = venderObjeto(estado(), OBJETO.esmeraldas, datos(), sello())
    expect(saldosPorDominio(nuevo)[DOM.tharan]).toBe(5751800)
    expect(patrimonioDelPersonaje(nuevo).neto).toBe(16611800)
    expect(objetoDe(nuevo, OBJETO.esmeraldas)?.cantidad).toBe(1)
    expect(nuevo.movimientos.find((m) => m.vinculo?.id === id)).toMatchObject({
      tipo: 'ingreso',
      categoriaId: 'cat.venta-de-objetos',
      concepto: 'Venta de Esmeralda tallada',
    })
    expect(nuevo.partida.cambiosDesdeUltimoAvance).toBe(estado().partida.cambiosDesdeUltimoAvance + 1)
  })

  it('no deja vender más de lo que hay, ni 0, ni con fecha futura', () => {
    expect(() => venderObjeto(estado(), OBJETO.esmeraldas, datos({ cantidad: 3 }), sello())).toThrow('Solo tienes 2')
    expect(() => venderObjeto(estado(), OBJETO.esmeraldas, datos({ cantidad: 0 }), sello())).toThrow('al menos 1')
    const manana = datos({ fecha: { anio: 1640, mes: 4, dia: 13 } })
    expect(() => venderObjeto(estado(), OBJETO.esmeraldas, manana, sello())).toThrow('fecha futura')
  })

  it('vender todas archiva el objeto como «vendido»; eliminar la venta lo restaura y borra el cobro', () => {
    const s = sello()
    const { estado: vendido, id } = venderObjeto(estado(), OBJETO.esmeraldas, datos({ cantidad: 2 }), s)
    expect(objetoDe(vendido, OBJETO.esmeraldas)).toMatchObject({ cantidad: 0, archivado: 'vendido' })
    expect(vendido.ventas[0]).toMatchObject({ nombre: 'Esmeralda tallada', valorAnotado: { base: 1200000 } })
    expect(vendido.movimientos.at(-1)?.concepto).toBe('Venta de 2 × Esmeralda tallada')
    const vuelta = eliminarVenta(vendido, id, s)
    expect(objetoDe(vuelta, OBJETO.esmeraldas)?.cantidad).toBe(2)
    expect(objetoDe(vuelta, OBJETO.esmeraldas)?.archivado).toBeUndefined()
    expect(vuelta.ventas).toEqual([])
    expect(vuelta.movimientos).toEqual(estado().movimientos)
  })

  it('el objeto de un pergamino lo marca «vendido», y eliminar la venta lo devuelve a «poseído»', () => {
    const s = sello()
    const { estado: vendido, id } = venderObjeto(estado(), OBJETO.pergaminoLuz, datos(), s)
    expect(vendido.pergaminos.find((p) => p.id === PERGAMINO.luzDeElbereth)?.estado).toBe('vendido')
    const vuelta = eliminarVenta(vendido, id, s)
    expect(vuelta.pergaminos.find((p) => p.id === PERGAMINO.luzDeElbereth)?.estado).toBe('poseido')
    expect(objetoDe(vuelta, OBJETO.pergaminoLuz)).toMatchObject({ cantidad: 1 })
  })

  it('editar la venta ajusta unidades y cobro; sin cambios devuelve el mismo estado', () => {
    const s = sello()
    const { estado: vendido, id } = venderObjeto(estado(), OBJETO.esmeraldas, datos(), s)
    expect(editarVenta(vendido, id, datos(), s)).toBe(vendido)
    const editado = editarVenta(vendido, id, datos({ cantidad: 2, precioUnitario: { base: 1000000 } }), s)
    expect(objetoDe(editado, OBJETO.esmeraldas)?.archivado).toBe('vendido')
    expect(saldosPorDominio(editado)[DOM.tharan]).toBe(4651800 + 2000000)
    expect(() => editarVenta(vendido, id, datos({ cantidad: 3 }), s)).toThrow('Solo tienes 2')
  })
})
