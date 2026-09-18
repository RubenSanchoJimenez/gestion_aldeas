import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dominio/dinero/monedas'
import type { Id, Instante } from '../dominio/modelo/comunes'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import { VERSION_FORMATO } from '../dominio/modelo/partida'
import type { BaseDeDatos } from './baseDeDatos'
import { baseDePrueba } from './pruebas/baseDePrueba'
import {
  abrirPartida,
  borrarPartida,
  crearPartida,
  guardarPartida,
  leerPartida,
  listarPartidas,
  ultimaPartidaUsada,
} from './repositorio'

/** Instantes fijos, en orden, para que las pruebas no dependan del reloj. */
const CREADA: Instante = '2026-09-17T09:00:00.000Z'
const SESION_1: Instante = '2026-09-17T10:00:00.000Z'
const SESION_2: Instante = '2026-09-17T11:00:00.000Z'
const GUARDADO: Instante = '2026-09-17T12:00:00.000Z'
const EXPORTACION: Instante = '2026-09-17T13:00:00.000Z'

/**
 * Documento mínimo y completo: la cabecera de la partida, un personaje con su bolsa y las 32 colecciones
 * restantes vacías. Son las 34 claves de EsquemaEstadoPartida más `avances` (tarea 6).
 */
function documentoDePrueba(id: Id, nombre: string, personaje: string): DocumentoPartida {
  return {
    partida: {
      id,
      nombre,
      edad: 'tercera',
      equivalencias: EQUIVALENCIAS_POR_DEFECTO,
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 1, dia: 1 },
      fechaActual: { anio: 1640, mes: 1, dia: 1 },
      creada: CREADA,
      actualizada: CREADA,
      versionFormato: VERSION_FORMATO,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [{ id: 'dom.personaje', tipo: 'personaje', nombre: personaje }],
    cajas: [{ dominioId: 'dom.personaje', saldoInicial: { base: 4091800 } }],
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
}

/** La Sombra del Este, la partida del ejemplo de la especificación. */
function sombraDelEste(): DocumentoPartida {
  return documentoDePrueba('p.sombra-del-este', 'La Sombra del Este', 'Tharan')
}

/** Una segunda partida, para las pruebas de orden y de borrado. */
function senderosDelNorte(): DocumentoPartida {
  return documentoDePrueba('p.senderos-del-norte', 'Los Senderos del Norte', 'Elwen')
}

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('listar partidas', () => {
  it('en una base vacía no devuelve ninguna y no hay última usada', async () => {
    expect(await listarPartidas(db)).toEqual([])
    expect(await ultimaPartidaUsada(db)).toBeUndefined()
  })

  it('devuelve los resúmenes de la sesión más reciente a la más antigua', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    await crearPartida(db, senderosDelNorte(), SESION_2)
    const partidas = await listarPartidas(db)
    expect(partidas.map((resumen) => resumen.nombre)).toEqual(['Los Senderos del Norte', 'La Sombra del Este'])
  })

  it('la última usada es la de abiertaEl más reciente, y abrir otra la cambia', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    await crearPartida(db, senderosDelNorte(), SESION_2)
    expect((await ultimaPartidaUsada(db))?.id).toBe('p.senderos-del-norte')

    await abrirPartida(db, 'p.sombra-del-este', '2026-09-17T14:00:00.000Z')
    expect((await ultimaPartidaUsada(db))?.id).toBe('p.sombra-del-este')
    expect((await listarPartidas(db)).map((r) => r.id)).toEqual(['p.sombra-del-este', 'p.senderos-del-norte'])
  })
})

describe('crear una partida', () => {
  it('guarda el documento y su resumen y devuelve la fila de P0', async () => {
    const resumen = await crearPartida(db, sombraDelEste(), SESION_1)
    expect(resumen).toEqual({
      id: 'p.sombra-del-este',
      nombre: 'La Sombra del Este',
      edad: 'tercera',
      fechaInicial: { anio: 1640, mes: 1, dia: 1 },
      fechaActual: { anio: 1640, mes: 1, dia: 1 },
      dominios: ['Tharan'],
      creada: CREADA,
      actualizada: CREADA,
      abiertaEl: SESION_1,
      exportadaEl: undefined,
      hayAvances: false,
    })
    expect(await db.partidas.count()).toBe(1)
    expect(await db.resumenes.count()).toBe(1)
  })

  it('con un id repetido lanza y no toca lo que ya estaba guardado', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    const repetida = documentoDePrueba('p.sombra-del-este', 'Otra partida', 'Otro')
    await expect(crearPartida(db, repetida, SESION_2)).rejects.toThrow(
      'Ya hay una partida con el id «p.sombra-del-este»',
    )
    expect((await db.partidas.get('p.sombra-del-este'))?.partida.nombre).toBe('La Sombra del Este')
    expect((await db.resumenes.get('p.sombra-del-este'))?.abiertaEl).toBe(SESION_1)
    expect(await db.partidas.count()).toBe(1)
  })

  it('conserva el error de la base en «cause» al traducir el ConstraintError', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    const repetida = documentoDePrueba('p.sombra-del-este', 'Otra partida', 'Otro')
    const error = await crearPartida(db, repetida, SESION_2).then(
      () => undefined,
      (fallo: unknown) => fallo,
    )
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('Ya hay una partida con el id «p.sombra-del-este»')
    expect((error as Error).cause).toBeInstanceOf(Error)
    expect(((error as Error).cause as Error).name).toBe('ConstraintError')
  })
})

describe('abrir y leer una partida', () => {
  it('abrir devuelve el documento y anota la sesión sin tocar actualizada', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    const documento = await abrirPartida(db, 'p.sombra-del-este', SESION_2)
    expect(documento?.partida.nombre).toBe('La Sombra del Este')
    expect(documento?.partida.actualizada).toBe(CREADA)
    const resumen = await db.resumenes.get('p.sombra-del-este')
    expect(resumen?.abiertaEl).toBe(SESION_2)
    expect(resumen?.actualizada).toBe(CREADA)
  })

  it('abrir una partida que no existe devuelve undefined y no crea nada', async () => {
    expect(await abrirPartida(db, 'p.no-existe', SESION_1)).toBeUndefined()
    expect(await db.resumenes.count()).toBe(0)
  })

  it('leer no anota la sesión', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    const documento = await leerPartida(db, 'p.sombra-del-este')
    expect(documento?.partida.id).toBe('p.sombra-del-este')
    expect((await db.resumenes.get('p.sombra-del-este'))?.abiertaEl).toBe(SESION_1)
    expect(await leerPartida(db, 'p.no-existe')).toBeUndefined()
  })
})

describe('guardar una partida', () => {
  it('sobre una base vacía guarda el documento y estrena el resumen con abiertaEl = ahora', async () => {
    const guardado = await guardarPartida(db, sombraDelEste(), GUARDADO)
    expect(guardado.partida.actualizada).toBe(GUARDADO)
    expect(await db.partidas.count()).toBe(1)
    const resumen = await db.resumenes.get('p.sombra-del-este')
    expect(resumen?.abiertaEl).toBe(GUARDADO)
    expect(resumen?.actualizada).toBe(GUARDADO)
    expect(resumen?.exportadaEl).toBeUndefined()
  })

  it('pone actualizada y no muta el documento que recibe', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    const documento = sombraDelEste()
    const guardado = await guardarPartida(db, documento, GUARDADO)
    expect(documento.partida.actualizada).toBe(CREADA)
    expect(guardado.partida.actualizada).toBe(GUARDADO)
    expect((await db.partidas.get('p.sombra-del-este'))?.partida.actualizada).toBe(GUARDADO)
  })

  it('refresca el resumen y conserva abiertaEl y exportadaEl', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    await db.resumenes.update('p.sombra-del-este', { exportadaEl: EXPORTACION })
    const documento = sombraDelEste()
    const conAvance: DocumentoPartida = {
      ...documento,
      partida: { ...documento.partida, fechaActual: { anio: 1640, mes: 4, dia: 12 } },
    }
    await guardarPartida(db, conAvance, GUARDADO)
    const resumen = await db.resumenes.get('p.sombra-del-este')
    expect(resumen?.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 12 })
    expect(resumen?.hayAvances).toBe(true)
    expect(resumen?.actualizada).toBe(GUARDADO)
    expect(resumen?.abiertaEl).toBe(SESION_1)
    expect(resumen?.exportadaEl).toBe(EXPORTACION)
  })
})

describe('borrar una partida', () => {
  it('quita el documento y su resumen y deja las demás', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    await crearPartida(db, senderosDelNorte(), SESION_2)
    await borrarPartida(db, 'p.sombra-del-este')
    expect(await db.partidas.count()).toBe(1)
    expect(await db.resumenes.count()).toBe(1)
    expect((await listarPartidas(db)).map((resumen) => resumen.id)).toEqual(['p.senderos-del-norte'])
  })

  it('borrar una partida que no existe no falla', async () => {
    await expect(borrarPartida(db, 'p.no-existe')).resolves.toBeUndefined()
  })
})
