import { describe, expect, it } from 'vitest'
import { DOM } from '../ejemplo/ids'
import { saldosPorDominio } from '../dinero/saldo'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { EsquemaDocumentoPartida, estadoDe, type EstadoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import {
  crearAsentamiento,
  editarAsentamiento,
  eliminarAsentamiento,
  guardarCambioDePoblacion,
  guardarConsumo,
} from './asentamientos'
import type { Sello } from './registros'
import { crearRegistro, editarRegistro } from './simples'

const sello = (): Sello => ({ ahora: '2026-11-25T10:00:00.000Z', nuevoId: idsEnSerie('as') })
const estado = () => congelar(estadoDe(documentoDeEjemplo()))

function exigeValida(nuevo: EstadoPartida): void {
  const documento = { ...documentoDeEjemplo(), ...nuevo }
  expect(EsquemaDocumentoPartida.safeParse(documento).error?.issues ?? []).toEqual([])
  expect(validarCopia(documento, catalogosDeEjemplo())).toEqual([])
}

const datos = { nombre: 'Combe', categoria: 'aldea' as const, habitantes: 80, cajaInicial: { base: 500000 } }

describe('asentamientos', () => {
  it('A0: nace vacío, con caja, víveres y mercado local, y la partida sigue valiendo', () => {
    const { estado: nuevo, id } = crearAsentamiento(estado(), datos, sello())
    exigeValida(nuevo)
    expect(saldosPorDominio(nuevo)[id]).toBe(500000)
    expect(nuevo.mercados.find((m) => m.localDe === id)?.nombre).toBe('Combe')
    expect(() => crearAsentamiento(nuevo, datos, sello())).toThrow('Ya existe')
  })

  it('editar cambia también el nombre del mercado local; sin cambios, el mismo estado', () => {
    const s = sello()
    const { estado: creado, id } = crearAsentamiento(estado(), datos, s)
    expect(editarAsentamiento(creado, id, datos, s)).toBe(creado)
    const nuevo = editarAsentamiento(creado, id, { ...datos, nombre: 'Combe Alto' }, s)
    exigeValida(nuevo)
    expect(nuevo.mercados.find((m) => m.localDe === id)?.nombre).toBe('Combe Alto')
  })

  it.each([DOM.bree, DOM.archet])('eliminar %s deja una partida válida', (id) => {
    const nuevo = eliminarAsentamiento(estado(), id, sello(), catalogosDeEjemplo())
    exigeValida(nuevo)
    expect(nuevo.dominios.some((d) => d.id === id)).toBe(false)
    expect(nuevo.movimientos.some((m) => m.dominioId === id)).toBe(false)
  })

  it('al eliminar Bree la transferencia a Tharan queda suelta y la bolsa no cambia', () => {
    const nuevo = eliminarAsentamiento(estado(), DOM.bree, sello(), catalogosDeEjemplo())
    expect(nuevo.movimientos.some((m) => m.concepto === 'Transferencia (Bree eliminado)')).toBe(true)
    expect(saldosPorDominio(nuevo)[DOM.tharan]).toBe(4651800)
  })

  it('población y consumos', () => {
    const s = sello()
    const cambio = { fecha: { anio: 1640, mes: 4, dia: 12 }, delta: 5, motivo: 'Llegan colonos' }
    exigeValida(guardarCambioDePoblacion(estado(), DOM.bree, cambio, undefined, s))
    expect(() =>
      guardarCambioDePoblacion(estado(), DOM.bree, { ...cambio, delta: -100000 }, undefined, s),
    ).toThrow('por debajo de 0')
    const consumo = { nombre: 'Velas', recursoId: 'recurso.cera', porHabitante: 0.01 }
    expect(guardarConsumo(estado(), DOM.bree, consumo, undefined, s).poblaciones).toHaveLength(2)
  })

  it('las altas sencillas validan con el esquema', () => {
    const s = sello()
    const defensa = { dominioId: DOM.bree, tipoId: 'x', nombre: 'Torre', estado: 'buena' as const }
    const { estado: nuevo, id } = crearRegistro(estado(), 'defensas', defensa, s)
    expect(editarRegistro(nuevo, 'defensas', id, defensa, s)).toBe(nuevo)
    expect(() => crearRegistro(estado(), 'defensas', { ...defensa, nombre: '' }, s)).toThrow('nombre')
  })
})
