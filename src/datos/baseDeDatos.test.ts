import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dominio/dinero/monedas'
import type { OpcionCatalogo } from '../dominio/modelo/catalogos'
import type { Id, Instante } from '../dominio/modelo/comunes'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import { VERSION_FORMATO } from '../dominio/modelo/partida'
import type { ResumenPartida } from '../dominio/modelo/resumen'
import { type BaseDeDatos, VERSION_BASE } from './baseDeDatos'
import { baseDePrueba } from './pruebas/baseDePrueba'

/** Instante fijo para que las pruebas no dependan del reloj. */
const CREADA: Instante = '2026-09-17T09:00:00.000Z'

/**
 * Documento mínimo y completo: la cabecera de la partida, un personaje con su bolsa y las 32 colecciones
 * restantes vacías. Son las 34 claves de EsquemaEstadoPartida más `avances` (tarea 6).
 */
function documentoDePrueba(id: Id, nombre: string): DocumentoPartida {
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
    avances: [],
  }
}

/** Fila de P0 escrita a mano: quien la arma de verdad es resumenDePartida, en la tarea 10. */
function resumenDePrueba(id: Id, nombre: string, abiertaEl: Instante): ResumenPartida {
  return {
    id,
    nombre,
    edad: 'tercera',
    fechaInicial: { anio: 1640, mes: 1, dia: 1 },
    fechaActual: { anio: 1640, mes: 1, dia: 1 },
    dominios: ['Tharan'],
    creada: CREADA,
    actualizada: CREADA,
    abiertaEl,
    hayAvances: false,
  }
}

/** Una categoría de catálogo, con los campos que lleva en este dispositivo (tarea 6). */
function categoria(id: Id, nombre: string): OpcionCatalogo {
  return { id, nombre, lista: 'categorias', grupo: 'gastosPersonaje', propia: false, borrada: false, protegida: false }
}

/** Un oficio, que es la única lista que guarda plural. */
function oficio(id: Id, nombre: string, plural: string): OpcionCatalogo {
  return {
    id,
    nombre,
    lista: 'oficios',
    grupo: 'campo',
    plural,
    propia: false,
    borrada: false,
    protegida: false,
  }
}

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('estructura de la base', () => {
  it('abre con la versión 1 y sus cinco tablas, cada una con su clave primaria', async () => {
    await db.open()
    expect(db.verno).toBe(VERSION_BASE)
    expect(db.tables.map((tabla) => tabla.name).sort()).toEqual([
      'ajustes',
      'opcionesCatalogo',
      'partidas',
      'recursosCatalogo',
      'resumenes',
    ])
    expect(db.partidas.schema.primKey.keyPath).toBe('partida.id')
    expect(db.resumenes.schema.primKey.keyPath).toBe('id')
    expect(db.opcionesCatalogo.schema.primKey.keyPath).toBe('id')
    expect(db.recursosCatalogo.schema.primKey.keyPath).toBe('id')
    expect(db.ajustes.schema.primKey.keyPath).toBe('clave')
    expect(db.resumenes.schema.indexes.map((indice) => indice.name)).toEqual(['abiertaEl', 'actualizada'])
    expect(db.opcionesCatalogo.schema.indexes.map((indice) => indice.name)).toEqual(['lista'])
  })

  it('guarda y lee un documento de partida por su clave anidada partida.id', async () => {
    const documento = documentoDePrueba('p.sombra-del-este', 'La Sombra del Este')
    await db.partidas.put(documento)
    expect(await db.partidas.get('p.sombra-del-este')).toEqual(documento)
    expect(await db.partidas.get('p.no-existe')).toBeUndefined()
  })

  it('los índices ordenan los resúmenes por abiertaEl y filtran las opciones por lista', async () => {
    await db.resumenes.bulkPut([
      resumenDePrueba('p.sombra-del-este', 'La Sombra del Este', '2026-09-16T20:00:00.000Z'),
      resumenDePrueba('p.senderos-del-norte', 'Los Senderos del Norte', '2026-09-17T08:30:00.000Z'),
    ])
    const porSesion = await db.resumenes.orderBy('abiertaEl').reverse().toArray()
    expect(porSesion.map((resumen) => resumen.id)).toEqual(['p.senderos-del-norte', 'p.sombra-del-este'])

    await db.opcionesCatalogo.bulkPut([
      categoria('cat.alojamiento', 'Alojamiento'),
      categoria('cat.montura', 'Montura'),
      oficio('oficio.granjero', 'Granjero', 'Granjeros'),
    ])
    const categorias = await db.opcionesCatalogo.where('lista').equals('categorias').toArray()
    expect(categorias.map((opcion) => opcion.id).sort()).toEqual(['cat.alojamiento', 'cat.montura'])
  })
})

describe('transacciones', () => {
  it('una excepción dentro de una transacción rw deja las dos tablas como estaban', async () => {
    await expect(
      db.transaction('rw', db.partidas, db.resumenes, async () => {
        await db.partidas.put(documentoDePrueba('p.sombra-del-este', 'La Sombra del Este'))
        await db.resumenes.put(resumenDePrueba('p.sombra-del-este', 'La Sombra del Este', CREADA))
        throw new Error('algo va mal a mitad de la escritura')
      }),
    ).rejects.toThrow('algo va mal a mitad de la escritura')
    expect(await db.partidas.count()).toBe(0)
    expect(await db.resumenes.count()).toBe(0)
  })
})

describe('ajustes de la app', () => {
  it('guardan cualquier valor por su clave y conservan las propiedades con valor undefined', async () => {
    await db.ajustes.put({ clave: 'versionCatalogo', valor: { numero: 1, notas: undefined } })
    const fila = await db.ajustes.get('versionCatalogo')
    expect(fila).toEqual({ clave: 'versionCatalogo', valor: { numero: 1, notas: undefined } })
    // IndexedDB guarda con structured clone y conserva las claves con valor undefined; JSON las quita.
    // Por eso las pruebas de src/datos comparan con toEqual y nunca con toStrictEqual.
    expect(Object.hasOwn(fila?.valor as object, 'notas')).toBe(true)
  })
})
