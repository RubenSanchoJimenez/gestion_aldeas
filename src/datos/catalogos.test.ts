import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OPCIONES_INICIALES, RECURSOS_INICIALES, VERSION_CATALOGO } from '../dominio/catalogo/inicial'
import type { OpcionCatalogo, RecursoCatalogo } from '../dominio/modelo/catalogos'
import { leerAjuste } from './ajustes'
import type { BaseDeDatos } from './baseDeDatos'
import { escribirCatalogo, leerCatalogo, leerOpciones, leerRecursos, sembrarCatalogo } from './catalogos'
import { baseDePrueba } from './pruebas/baseDePrueba'

/** Una categoría del jugador, como la «Posadas del camino» que J2e crea en el ejemplo (§6.6, patrón 2). */
const CATEGORIA_PROPIA: OpcionCatalogo = {
  id: 'cat.propia-posadas',
  nombre: 'Posadas del camino',
  lista: 'categorias',
  grupo: 'tuyas',
  propia: true,
  borrada: false,
}

/** Un recurso del jugador, para comprobar que escribirCatalogo también da de alta recursos. */
const RECURSO_PROPIO: RecursoCatalogo = {
  id: 'recurso.propio-especias',
  nombre: 'Especias',
  unidadSingular: 'saco',
  unidadPlural: 'sacos',
  propia: true,
  borrada: false,
}

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('sembrarCatalogo', () => {
  it('en una base vacía deja las 145 opciones y los 21 recursos de fábrica', async () => {
    const resumen = await sembrarCatalogo(db)
    expect(resumen).toEqual({ opcionesAnadidas: 145, recursosAnadidos: 21, versionCatalogo: VERSION_CATALOGO })
    expect(await db.opcionesCatalogo.count()).toBe(OPCIONES_INICIALES.length)
    expect(await db.recursosCatalogo.count()).toBe(RECURSOS_INICIALES.length)
  })

  it('sembrar dos veces no duplica nada ni añade nada la segunda vez', async () => {
    await sembrarCatalogo(db)
    const resumen = await sembrarCatalogo(db)
    expect(resumen).toEqual({ opcionesAnadidas: 0, recursosAnadidos: 0, versionCatalogo: VERSION_CATALOGO })
    expect(await db.opcionesCatalogo.count()).toBe(145)
    expect(await db.recursosCatalogo.count()).toBe(21)
  })

  it('no pisa lo que el jugador cambió: un renombrado, un borrado y unas unidades siguen igual', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.alojamiento')
      .modify((opcion) => {
        opcion.nombre = 'Hospedaje'
      })
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.montura')
      .modify((opcion) => {
        opcion.borrada = true
      })
    await db.recursosCatalogo.update('recurso.sal', { unidadSingular: 'fardo', unidadPlural: 'fardos' })

    const resumen = await sembrarCatalogo(db)
    expect(resumen.opcionesAnadidas).toBe(0)
    expect((await db.opcionesCatalogo.get('cat.alojamiento'))?.nombre).toBe('Hospedaje')
    expect((await db.opcionesCatalogo.get('cat.montura'))?.borrada).toBe(true)
    expect((await db.recursosCatalogo.get('recurso.sal'))?.unidadPlural).toBe('fardos')
  })

  it('añade lo que falta del catálogo de fábrica, que es lo que hace una versión nueva de la app', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo.delete('cat.montura')
    await db.recursosCatalogo.delete('recurso.sal')

    const resumen = await sembrarCatalogo(db)
    expect(resumen).toEqual({ opcionesAnadidas: 1, recursosAnadidos: 1, versionCatalogo: VERSION_CATALOGO })
    expect((await db.opcionesCatalogo.get('cat.montura'))?.nombre).toBe('Montura')
    expect((await db.recursosCatalogo.get('recurso.sal'))?.nombre).toBe('Sal')
    expect(await db.opcionesCatalogo.count()).toBe(145)
  })

  it('devuelve el candado a su sitio sin tocar el nombre', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.salarios')
      .modify((opcion) => {
        opcion.nombre = 'Pagas'
        opcion.protegida = false
      })
    await db.recursosCatalogo.update('recurso.viveres', { nombre: 'Provisiones', protegido: undefined })

    await sembrarCatalogo(db)
    const salarios = await db.opcionesCatalogo.get('cat.salarios')
    expect(salarios?.nombre).toBe('Pagas')
    expect(salarios?.protegida).toBe(true)
    const viveres = await db.recursosCatalogo.get('recurso.viveres')
    expect(viveres?.nombre).toBe('Provisiones')
    expect(viveres?.protegido).toBe('viveres')
  })

  it('guarda la versión del catálogo en los ajustes de la app', async () => {
    expect(await leerAjuste(db, 'versionCatalogo')).toBeUndefined()
    await sembrarCatalogo(db)
    expect(await leerAjuste(db, 'versionCatalogo')).toBe(VERSION_CATALOGO)
  })
})

describe('leer el catálogo', () => {
  it('leerOpciones da las de su lista, sin las borradas y por nombre', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.alojamiento')
      .modify((opcion) => {
        opcion.borrada = true
      })
    const categorias = await leerOpciones(db, 'categorias')
    expect(categorias).toHaveLength(26)
    expect(categorias.every((opcion) => opcion.lista === 'categorias')).toBe(true)
    expect(categorias.slice(0, 3).map((opcion) => opcion.nombre)).toEqual([
      'Ajustes',
      'Aranceles',
      'Armas y armaduras',
    ])
    expect(categorias.at(-1)?.nombre).toBe('Víveres del almacén')
    expect(await leerOpciones(db, 'tiposDefensa')).toHaveLength(6)
  })

  it('leerRecursos da los no borrados, por nombre y sin depender de las tildes', async () => {
    await sembrarCatalogo(db)
    await db.recursosCatalogo.update('recurso.armas', { borrada: true })
    const recursos = await leerRecursos(db)
    expect(recursos).toHaveLength(20)
    expect(recursos.slice(0, 3).map((recurso) => recurso.nombre)).toEqual(['Arcilla', 'Carbón', 'Carne'])
    expect(recursos.at(-1)?.nombre).toBe('Víveres')
  })

  it('leerCatalogo lo devuelve todo, también lo borrado y lo del jugador', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.montura')
      .modify((opcion) => {
        opcion.borrada = true
      })
    await db.opcionesCatalogo.add(CATEGORIA_PROPIA)

    const catalogo = await leerCatalogo(db)
    expect(catalogo.opciones).toHaveLength(146)
    expect(catalogo.recursos).toHaveLength(21)
    expect(catalogo.opciones.some((opcion) => opcion.id === 'cat.montura' && opcion.borrada)).toBe(true)
    expect(catalogo.opciones.some((opcion) => opcion.id === 'cat.propia-posadas' && opcion.propia)).toBe(true)
  })
})

describe('escribirCatalogo', () => {
  it('da de alta lo nuevo y reactiva lo borrado', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.comercio')
      .modify((opcion) => {
        opcion.borrada = true
      })
    await db.recursosCatalogo.update('recurso.lana', { borrada: true })

    await escribirCatalogo(db, {
      opcionesNuevas: [CATEGORIA_PROPIA],
      recursosNuevos: [RECURSO_PROPIO],
      opcionesReactivadas: ['cat.comercio'],
      recursosReactivados: ['recurso.lana'],
    })

    expect(await db.opcionesCatalogo.count()).toBe(146)
    expect(await db.recursosCatalogo.count()).toBe(22)
    expect((await db.opcionesCatalogo.get('cat.propia-posadas'))?.nombre).toBe('Posadas del camino')
    expect((await db.recursosCatalogo.get('recurso.propio-especias'))?.nombre).toBe('Especias')
    expect((await db.opcionesCatalogo.get('cat.comercio'))?.borrada).toBe(false)
    expect((await db.recursosCatalogo.get('recurso.lana'))?.borrada).toBe(false)
  })
})
