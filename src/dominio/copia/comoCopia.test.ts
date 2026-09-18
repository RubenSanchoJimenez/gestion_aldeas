import { describe, expect, it } from 'vitest'
import type { DocumentoPartida, EstadoPartida } from '../modelo/documento'
import { comoCopia, nombreDeCopia } from './comoCopia'

/** Un documento válido y mínimo: el personaje, un asentamiento y lo que la validación exige de cada asentamiento. */
function documentoMinimo(): DocumentoPartida {
  return {
    partida: {
      id: 'p.sombra-del-este',
      nombre: 'La Sombra del Este',
      edad: 'tercera',
      equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 3, dia: 31 },
      fechaActual: { anio: 1640, mes: 4, dia: 12 },
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T09:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [
      { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
      {
        id: 'dom.bree',
        tipo: 'asentamiento',
        nombre: 'Bree',
        categoria: 'pueblo',
        alta: { anio: 1640, mes: 3, dia: 31 },
      },
    ],
    cajas: [
      { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } },
      { dominioId: 'dom.bree', saldoInicial: { base: 34000000 } },
    ],
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
    poblaciones: [{ dominioId: 'dom.bree', habitantesIniciales: 1214, cambios: [], consumos: [] }],
    existencias: [{ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 }],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [{ id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
    avances: [
      {
        id: 'av.1',
        desde: { anio: 1640, mes: 3, dia: 31 },
        hasta: { anio: 1640, mes: 4, dia: 12 },
        aplicadoEl: '2026-09-17T09:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ],
  }
}

/** El estado que guarda un snapshotPrevio: el documento sin su lista de avances (§8, decisión 4). */
function estadoDelSnapshot(documento: DocumentoPartida): EstadoPartida {
  const { avances, ...estado } = documento
  void avances
  return estado
}

/** El documento con el snapshotPrevio puesto en su último avance (decisión 4). */
function documentoConSnapshot(): DocumentoPartida {
  const documento = documentoMinimo()
  documento.avances = [{ ...documento.avances[0], snapshotPrevio: estadoDelSnapshot(documentoMinimo()) }]
  return documento
}

describe('comoCopia', () => {
  it('cambia el id y el nombre de la partida, también en el snapshot, y no toca nada más', () => {
    const original = documentoConSnapshot()
    const copia = comoCopia(original, 'p.copia-1', 'La Sombra del Este (copia)')
    expect(copia.partida.id).toBe('p.copia-1')
    expect(copia.partida.nombre).toBe('La Sombra del Este (copia)')
    expect(copia.avances[0].snapshotPrevio?.partida.id).toBe('p.copia-1')
    expect(copia.avances[0].snapshotPrevio?.partida.nombre).toBe('La Sombra del Este (copia)')
    expect(copia.dominios.map((dominio) => dominio.id)).toEqual(['dom.tharan', 'dom.bree'])
    expect(copia.avances.map((avance) => avance.id)).toEqual(['av.1'])
    expect(copia.mercados[0].id).toBe('mer.bree')
    expect(copia.partida.creada).toBe('2026-09-17T08:00:00.000Z')
    expect(copia.partida.actualizada).toBe('2026-09-17T09:00:00.000Z')
    expect(original.partida.id).toBe('p.sombra-del-este')
    expect(original.partida.nombre).toBe('La Sombra del Este')
    expect(original.avances[0].snapshotPrevio?.partida.id).toBe('p.sombra-del-este')
  })
})

describe('nombreDeCopia', () => {
  it('da «(copia)» y, si ya existe, «(copia 2)» y «(copia 3)», comparando sin mayúsculas ni tildes', () => {
    expect(nombreDeCopia('La Sombra del Este', [])).toBe('La Sombra del Este (copia)')
    expect(nombreDeCopia('La Sombra del Este', ['La Sombra del Este', 'La Sombra del Este (copia)'])).toBe(
      'La Sombra del Este (copia 2)',
    )
    expect(
      nombreDeCopia('La Sombra del Este', [
        'La Sombra del Este',
        'La Sombra del Este (copia)',
        'La Sombra del Este (copia 2)',
      ]),
    ).toBe('La Sombra del Este (copia 3)')
    expect(nombreDeCopia('La Sombra del Este', ['  la sombra del este (COPIA)  '])).toBe(
      'La Sombra del Este (copia 2)',
    )
  })

  it('recorta el nombre para que la copia quepa en los 60 caracteres del campo', () => {
    const largo = 'A'.repeat(60)
    const primera = nombreDeCopia(largo, [])
    expect(primera).toHaveLength(60)
    expect(primera.endsWith(' (copia)')).toBe(true)
    const segunda = nombreDeCopia(largo, [primera])
    expect(segunda).toHaveLength(60)
    expect(segunda.endsWith(' (copia 2)')).toBe(true)
  })
})
