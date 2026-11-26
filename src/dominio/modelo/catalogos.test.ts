import { describe, expect, it } from 'vitest'
import {
  ARTICULO_LISTA,
  EsquemaCatalogosEnCopia,
  EsquemaListaCatalogo,
  EsquemaOpcionCatalogo,
  EsquemaOpcionEnCopia,
  EsquemaPersonaEntidad,
  EsquemaRecursoCatalogo,
  EsquemaRecursoEnCopia,
  EsquemaUbicacion,
  NOMBRE_LISTA,
  type CatalogoApp,
  type CatalogosEnCopia,
  type OpcionCatalogo,
  type RecursoCatalogo,
} from './catalogos'

/** La categoría «Alojamiento», de la app, tal como vive en este dispositivo. */
const ALOJAMIENTO: OpcionCatalogo = {
  id: 'cat.alojamiento',
  nombre: 'Alojamiento',
  propia: false,
  borrada: false,
  lista: 'categorias',
  grupo: 'gastosPersonaje',
}

/** El recurso «Víveres», protegido: ni se renombra ni se elimina (§6.6). */
const VIVERES: RecursoCatalogo = {
  id: 'recurso.viveres',
  nombre: 'Víveres',
  unidadSingular: 'saco',
  unidadPlural: 'sacos',
  propia: false,
  borrada: false,
  protegido: 'viveres',
}

describe('EsquemaOpcionCatalogo', () => {
  it('exige la lista en plural y el grupo de esa lista (decisión 17)', () => {
    expect(EsquemaListaCatalogo.options).toEqual([
      'categorias',
      'oficios',
      'tiposEdificio',
      'tiposUnidad',
      'tiposDefensa',
      'tiposAnimal',
    ])
    expect(EsquemaOpcionCatalogo.parse(ALOJAMIENTO)).toEqual(ALOJAMIENTO)
    expect(EsquemaOpcionCatalogo.safeParse({ ...ALOJAMIENTO, lista: 'categoria' }).success).toBe(false)
    expect(EsquemaOpcionCatalogo.safeParse({ ...ALOJAMIENTO, grupo: 'tropa' }).success).toBe(false)
    expect(EsquemaOpcionCatalogo.safeParse({ ...ALOJAMIENTO, grupo: undefined }).success).toBe(false)

    const granjero: OpcionCatalogo = {
      id: 'oficio.granjero',
      nombre: 'Granjero',
      propia: false,
      borrada: false,
      lista: 'oficios',
      grupo: 'campo',
      plural: 'Granjeros',
    }
    expect(EsquemaOpcionCatalogo.parse(granjero)).toEqual(granjero)
    expect(EsquemaOpcionCatalogo.safeParse({ ...granjero, plural: undefined }).success).toBe(false)

    const torre: OpcionCatalogo = {
      id: 'defensa.torre-de-vigia',
      nombre: 'Torre de vigía',
      propia: false,
      borrada: false,
      lista: 'tiposDefensa',
    }
    expect(EsquemaOpcionCatalogo.parse(torre)).toEqual(torre)
  })

  it('deja fuera de la copia «borrada» y «protegida» (§6.1)', () => {
    const enCopia = EsquemaOpcionEnCopia.parse({ ...ALOJAMIENTO, protegida: true })
    expect(enCopia).toEqual({
      id: 'cat.alojamiento',
      nombre: 'Alojamiento',
      propia: false,
      lista: 'categorias',
      grupo: 'gastosPersonaje',
    })
    expect('borrada' in enCopia).toBe(false)
    expect('protegida' in enCopia).toBe(false)

    const recursoEnCopia = EsquemaRecursoEnCopia.parse(VIVERES)
    expect(recursoEnCopia).toEqual({
      id: 'recurso.viveres',
      nombre: 'Víveres',
      unidadSingular: 'saco',
      unidadPlural: 'sacos',
      propia: false,
    })
    expect('protegido' in recursoEnCopia).toBe(false)
  })

  it('un CatalogoApp vale como CatalogosEnCopia, que es lo que validan las tres validaciones', () => {
    expect(EsquemaRecursoCatalogo.parse(VIVERES)).toEqual(VIVERES)
    expect(EsquemaRecursoCatalogo.safeParse({ ...VIVERES, protegido: 'reserva' }).success).toBe(true)
    expect(EsquemaRecursoCatalogo.safeParse({ ...VIVERES, protegido: 'ninguno' }).success).toBe(false)
    expect(EsquemaRecursoCatalogo.safeParse({ ...VIVERES, unidadSingular: '' }).success).toBe(false)

    const enLaTablet: CatalogoApp = { opciones: [ALOJAMIENTO], recursos: [VIVERES] }
    const comoCopia: CatalogosEnCopia = enLaTablet
    expect(EsquemaCatalogosEnCopia.parse(comoCopia)).toEqual({
      opciones: [{ id: 'cat.alojamiento', nombre: 'Alojamiento', propia: false, lista: 'categorias', grupo: 'gastosPersonaje' }],
      recursos: [
        { id: 'recurso.viveres', nombre: 'Víveres', unidadSingular: 'saco', unidadPlural: 'sacos', propia: false },
      ],
    })
  })
})

describe('listas, ubicaciones y personas de la partida', () => {
  it('nombra las seis listas con su artículo y guarda ubicaciones y personas', () => {
    expect(NOMBRE_LISTA).toEqual({
      categorias: 'categoría',
      oficios: 'oficio',
      tiposEdificio: 'tipo de edificio',
      tiposUnidad: 'tipo de unidad',
      tiposDefensa: 'tipo de defensa',
      tiposAnimal: 'tipo de animal',
    })
    expect(ARTICULO_LISTA).toEqual({
      categorias: 'La',
      oficios: 'El',
      tiposEdificio: 'El',
      tiposUnidad: 'El',
      tiposDefensa: 'El',
      tiposAnimal: 'El',
    })

    const posada = { id: 'ubi.posada', nombre: 'Posada El Poney Pisador' }
    expect(EsquemaUbicacion.parse(posada)).toEqual(posada)
    const gremio = { id: 'persona.gremio-bree', nombre: 'Gremio de mercaderes de Bree' }
    expect(EsquemaPersonaEntidad.parse(gremio)).toEqual(gremio)
    expect(EsquemaUbicacion.safeParse({ id: 'ubi.x', nombre: 'A' }).success).toBe(false)
  })
})
