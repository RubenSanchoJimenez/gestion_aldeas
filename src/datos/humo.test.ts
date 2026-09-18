import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type BaseDeDatos, NOMBRE_BASE } from './baseDeDatos'
import { baseDePrueba } from './pruebas/baseDePrueba'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('humo: Dexie sobre una IDBFactory falsa', () => {
  it('escribe y lee un registro', async () => {
    await db.ajustes.put({ clave: 'versionCatalogo', valor: 1 })
    expect(await db.ajustes.get('versionCatalogo')).toEqual({ clave: 'versionCatalogo', valor: 1 })
  })

  it('cada base de prueba parte vacía, sin estado compartido entre pruebas', async () => {
    await db.ajustes.put({ clave: 'versionCatalogo', valor: 1 })
    const otra = baseDePrueba()
    expect(await otra.ajustes.count()).toBe(0)
    otra.close()
  })

  it('no hay indexedDB global: el entorno de las pruebas es node y el dominio sigue sin navegador', () => {
    expect(typeof globalThis.indexedDB).toBe('undefined')
    expect(db.name).toBe(NOMBRE_BASE)
  })
})
