import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { guardarAjuste, leerAjuste, leerAjustes } from './ajustes'
import type { BaseDeDatos } from './baseDeDatos'
import { baseDePrueba } from './pruebas/baseDePrueba'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('leerAjuste y guardarAjuste', () => {
  it('en una base nueva no hay ningún ajuste guardado', async () => {
    expect(await leerAjuste(db, 'versionCatalogo')).toBeUndefined()
    expect(await leerAjustes(db)).toEqual({})
  })

  it('guarda un valor y lo devuelve tal cual', async () => {
    await guardarAjuste(db, 'versionCatalogo', 1)
    expect(await leerAjuste(db, 'versionCatalogo')).toBe(1)
  })

  it('guardar dos veces la misma clave reemplaza el valor y no deja dos filas', async () => {
    await guardarAjuste(db, 'versionCatalogo', 1)
    await guardarAjuste(db, 'versionCatalogo', 2)
    expect(await leerAjuste(db, 'versionCatalogo')).toBe(2)
    expect(await db.ajustes.count()).toBe(1)
  })

  it('descarta un valor guardado con otro tipo, como ya hace leerAjustes', async () => {
    // Una versión futura de la app puede haber dejado ahí otra cosa; leerAjuste no se la cree.
    await db.ajustes.put({ clave: 'versionCatalogo', valor: 'uno' })
    expect(await leerAjuste(db, 'versionCatalogo')).toBeUndefined()
  })
})

describe('leerAjustes', () => {
  it('devuelve los ajustes guardados', async () => {
    await guardarAjuste(db, 'versionCatalogo', 3)
    expect(await leerAjustes(db)).toEqual({ versionCatalogo: 3 })
  })

  it('no se rompe con una clave que todavía no conoce ni con un valor de otro tipo', async () => {
    // Los «Recientes» de los selectores llegan en la fase 9; hoy la tabla puede traerlos de una versión futura.
    await db.ajustes.put({ clave: 'recientesCategorias', valor: ['cat.alojamiento'] })
    await db.ajustes.put({ clave: 'versionCatalogo', valor: 'uno' })
    expect(await leerAjustes(db)).toEqual({})
  })
})
