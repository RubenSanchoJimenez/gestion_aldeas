import { describe, expect, it } from 'vitest'
import type { DocumentoPartida } from './documento'
import { VERSION_FORMATO } from './partida'
import { resumenDePartida } from './resumen'

/** Un documento con el personaje y dos asentamientos, para comprobar el orden de `dominios`. */
const DOCUMENTO: DocumentoPartida = {
  partida: {
    id: 'p.sombra-del-este',
    nombre: 'La Sombra del Este',
    edad: 'tercera',
    equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
    kgPorSaco: 30,
    diasPorSaco: 30,
    fechaInicial: { anio: 1640, mes: 1, dia: 1 },
    fechaActual: { anio: 1640, mes: 4, dia: 12 },
    creada: '2026-09-15T10:00:00.000Z',
    actualizada: '2026-09-17T18:30:00.000Z',
    versionFormato: VERSION_FORMATO,
    cambiosDesdeUltimoAvance: 3,
  },
  dominios: [
    { id: 'dom.zarcero', tipo: 'asentamiento', nombre: 'Zarcero', categoria: 'aldea', alta: { anio: 1640, mes: 1, dia: 1 } },
    { id: 'dom.bree', tipo: 'asentamiento', nombre: 'Bree', categoria: 'pueblo', alta: { anio: 1640, mes: 1, dia: 1 } },
    { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
    { id: 'dom.archet', tipo: 'asentamiento', nombre: 'Archet', categoria: 'aldea', alta: { anio: 1640, mes: 2, dia: 20 } },
  ],
  cajas: [],
  movimientos: [],
  transferencias: [],
  deudas: [],
  recurrentes: [],
  objetos: [],
  ventas: [],
  inversiones: [],
  hechizos: [],
  intentos: [],
  pergaminos: [],
  poblaciones: [],
  existencias: [],
  ajustesExistencias: [],
  entradasAlmacen: [],
  edificios: [],
  produccionesRealizadas: [],
  trabajadores: [],
  obras: [],
  impuestosRentas: [],
  tiposLocal: [],
  localesComerciales: [],
  mercados: [],
  rutas: [],
  caravanas: [],
  unidadesGuarnicion: [],
  defensas: [],
  animales: [],
  armeria: [],
  eventos: [],
  ubicaciones: [],
  personas: [],
  avances: [],
}

describe('resumenDePartida', () => {
  it('pone el personaje primero y los asentamientos por su alta y, si empatan, en el orden del documento', () => {
    const resumen = resumenDePartida(DOCUMENTO, { abiertaEl: '2026-09-17T19:00:00.000Z' })
    expect(resumen.dominios).toEqual(['Tharan', 'Zarcero', 'Bree', 'Archet'])
    expect(resumen.id).toBe('p.sombra-del-este')
    expect(resumen.nombre).toBe('La Sombra del Este')
    expect(resumen.edad).toBe('tercera')
    expect(resumen.fechaInicial).toEqual({ anio: 1640, mes: 1, dia: 1 })
    expect(resumen.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 12 })
    expect(resumen.creada).toBe('2026-09-15T10:00:00.000Z')
    expect(resumen.actualizada).toBe('2026-09-17T18:30:00.000Z')
  })

  it('copia abiertaEl y exportadaEl de la sesión y calcula hayAvances (decisión 9)', () => {
    const conCopia = resumenDePartida(DOCUMENTO, {
      abiertaEl: '2026-09-17T19:00:00.000Z',
      exportadaEl: '2026-09-17T18:45:00.000Z',
    })
    expect(conCopia.abiertaEl).toBe('2026-09-17T19:00:00.000Z')
    expect(conCopia.exportadaEl).toBe('2026-09-17T18:45:00.000Z')
    expect(conCopia.hayAvances).toBe(true)

    const reciencreada = resumenDePartida(
      { ...DOCUMENTO, partida: { ...DOCUMENTO.partida, fechaActual: { anio: 1640, mes: 1, dia: 1 } } },
      { abiertaEl: '2026-09-17T19:00:00.000Z' },
    )
    expect(reciencreada.exportadaEl).toBeUndefined()
    expect(reciencreada.hayAvances).toBe(false)
  })
})
