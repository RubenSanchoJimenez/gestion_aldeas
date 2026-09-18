import { describe, expect, it } from 'vitest'
import {
  EsquemaAvance,
  EsquemaDocumentoPartida,
  EsquemaEstadoPartida,
  type DocumentoPartida,
  type EstadoPartida,
} from './documento'
import { VERSION_FORMATO, type Partida } from './partida'

/** La cabecera de «La Sombra del Este» el 12 de abril de 1640 T.E. */
const PARTIDA: Partida = {
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
  cambiosDesdeUltimoAvance: 0,
}

/** El estado con la cabecera y las 33 colecciones vacías: el esqueleto que usa esta prueba. */
const ESTADO_VACIO: EstadoPartida = {
  partida: PARTIDA,
  dominios: [{ id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' }],
  cajas: [{ dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } }],
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
}

/** Los dos avances del ejemplo reducidos a lo imprescindible; solo el último lleva snapshotPrevio (decisión 4). */
const DOCUMENTO: DocumentoPartida = {
  ...ESTADO_VACIO,
  avances: [
    {
      id: 'av.6-10abr',
      desde: { anio: 1640, mes: 4, dia: 6 },
      hasta: { anio: 1640, mes: 4, dia: 10 },
      aplicadoEl: '2026-09-16T09:00:00.000Z',
      cambios: [],
      avisos: [],
    },
    {
      id: 'av.10-12abr',
      desde: { anio: 1640, mes: 4, dia: 10 },
      hasta: { anio: 1640, mes: 4, dia: 12 },
      aplicadoEl: '2026-09-17T18:30:00.000Z',
      cambios: [],
      avisos: [],
      snapshotPrevio: ESTADO_VACIO,
    },
  ],
}

describe('EsquemaEstadoPartida', () => {
  it('tiene 34 claves: la partida y sus 33 colecciones, con produccionesRealizadas (decisión 1)', () => {
    const estado = EsquemaEstadoPartida.parse(ESTADO_VACIO)
    const claves = Object.keys(estado)
    expect(claves.length).toBe(34)
    expect(claves[0]).toBe('partida')
    expect(claves).toContain('produccionesRealizadas')
    expect(claves).not.toContain('avances')
    expect(claves).not.toContain('opciones')
    expect(claves).not.toContain('recursos')
  })

  it('no tiene id de primer nivel ni partidaId dentro, y descarta lo desconocido (decisión 6)', () => {
    const conRuido = EsquemaDocumentoPartida.parse({
      ...DOCUMENTO,
      id: 'p.sombra-del-este',
      partidaId: 'p.sombra-del-este',
      colorFavorito: 'azul',
    })
    expect(conRuido).toEqual(DOCUMENTO)
    expect('id' in conRuido).toBe(false)
    expect('partidaId' in conRuido).toBe(false)
    expect(Object.keys(conRuido).length).toBe(35)
  })
})

describe('EsquemaAvance y EsquemaDocumentoPartida', () => {
  it('lleva el snapshot solo donde lo hay, y el snapshot no guarda avances ni catálogos (decisión 4)', () => {
    expect(EsquemaDocumentoPartida.parse(DOCUMENTO)).toEqual(DOCUMENTO)

    const sinSnapshot = EsquemaAvance.parse(DOCUMENTO.avances[0])
    expect(sinSnapshot.snapshotPrevio).toBeUndefined()

    const conSnapshot = EsquemaAvance.parse(DOCUMENTO.avances[1])
    expect(Object.keys(conSnapshot.snapshotPrevio ?? {}).length).toBe(34)
    expect(conSnapshot.snapshotPrevio).not.toHaveProperty('avances')
    expect(conSnapshot.snapshotPrevio).not.toHaveProperty('catalogos')

    const snapshotConAvances = EsquemaAvance.parse({
      ...DOCUMENTO.avances[1],
      snapshotPrevio: { ...ESTADO_VACIO, avances: [] },
    })
    expect(snapshotConAvances.snapshotPrevio).not.toHaveProperty('avances')

    expect(EsquemaDocumentoPartida.safeParse({ ...DOCUMENTO, avances: undefined }).success).toBe(false)
    expect(EsquemaDocumentoPartida.safeParse({ ...DOCUMENTO, produccionesRealizadas: undefined }).success).toBe(false)
  })
})
