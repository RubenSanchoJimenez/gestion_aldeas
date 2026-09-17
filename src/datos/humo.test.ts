import { Dexie } from 'dexie'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

/** Una fila de la tabla de la prueba; la base de verdad llega en la tarea 9. */
interface Nota {
  id: string
  texto: string
}

/** Base de una sola tabla sobre una IDBFactory nueva: cada llamada parte de una base vacía. */
function baseDeHumo(): Dexie {
  const db = new Dexie('humo', { indexedDB: new IDBFactory(), IDBKeyRange })
  db.version(1).stores({ notas: 'id' })
  return db
}

let db: Dexie

beforeEach(() => {
  db = baseDeHumo()
})

afterEach(() => {
  db.close()
})

describe('humo: Dexie sobre una IDBFactory falsa', () => {
  it('escribe y lee un registro', async () => {
    const notas = db.table<Nota, string>('notas')
    await notas.put({ id: 'n1', texto: 'La Sombra del Este' })
    expect(await notas.get('n1')).toEqual({ id: 'n1', texto: 'La Sombra del Este' })
    expect(await notas.count()).toBe(1)
  })

  it('cada IDBFactory nueva es una base vacía, sin estado compartido', async () => {
    await db.table<Nota, string>('notas').put({ id: 'n1', texto: 'La Sombra del Este' })
    const otra = baseDeHumo()
    try {
      expect(await otra.table<Nota, string>('notas').count()).toBe(0)
    } finally {
      otra.close()
    }
  })

  it('no hay variables globales de IndexedDB: la fábrica se inyecta', () => {
    expect(typeof globalThis.indexedDB).toBe('undefined')
  })
})
