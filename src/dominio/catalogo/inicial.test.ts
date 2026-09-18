import { describe, expect, it } from 'vitest'
import {
  EsquemaOpcionCatalogo,
  EsquemaRecursoCatalogo,
  type ListaCatalogo,
  type OpcionCatalogo,
} from '../modelo/catalogos'
import { normalizarNombre } from '../texto/normalizar'
import {
  CATEGORIA,
  OPCIONES_INICIALES,
  RECURSO,
  RECURSOS_INICIALES,
  VERSION_CATALOGO,
  idDeOpcion,
  idDeRecurso,
} from './inicial'

/** Las seis listas de opciones de la app (decisión 17). */
const LISTAS: readonly ListaCatalogo[] = [
  'categorias',
  'oficios',
  'tiposEdificio',
  'tiposUnidad',
  'tiposDefensa',
  'tiposAnimal',
]

/** Las opciones de una lista, ya con el tipo de esa lista: así se puede leer `grupo` o `plural`. */
function deLista<L extends ListaCatalogo>(lista: L): Extract<OpcionCatalogo, { lista: L }>[] {
  return OPCIONES_INICIALES.filter((o): o is Extract<OpcionCatalogo, { lista: L }> => o.lista === lista)
}

describe('catálogo inicial de la app', () => {
  it('trae 145 opciones y 21 recursos de fábrica, en la versión 1', () => {
    expect(VERSION_CATALOGO).toBe(1)
    expect(OPCIONES_INICIALES).toHaveLength(145)
    expect(RECURSOS_INICIALES).toHaveLength(21)
  })

  it('reparte las opciones en las seis listas con los recuentos de P7', () => {
    expect(deLista('categorias')).toHaveLength(27)
    expect(deLista('oficios')).toHaveLength(23)
    expect(deLista('tiposEdificio')).toHaveLength(24)
    expect(deLista('tiposUnidad')).toHaveLength(8)
    expect(deLista('tiposDefensa')).toHaveLength(6)
    expect(deLista('tiposAnimal')).toHaveLength(57)
  })

  it('no repite ningún id entre las 166 entradas', () => {
    const ids = [...OPCIONES_INICIALES.map((o) => o.id), ...RECURSOS_INICIALES.map((r) => r.id)]
    expect(ids).toHaveLength(166)
    expect(new Set(ids).size).toBe(166)
  })

  it('da a cada entrada el id fijo que le toca por la convención (decisión 8)', () => {
    for (const opcion of OPCIONES_INICIALES) {
      expect(opcion.id).toBe(idDeOpcion(opcion.lista, opcion.nombre))
    }
    for (const recurso of RECURSOS_INICIALES) {
      expect(recurso.id).toBe(idDeRecurso(recurso.nombre))
    }
  })

  it('arma el id de una opción con el prefijo de su lista', () => {
    expect(idDeOpcion('categorias', 'Alojamiento')).toBe('cat.alojamiento')
    expect(idDeOpcion('categorias', 'Hierbas y curación')).toBe('cat.hierbas-y-curacion')
    expect(idDeOpcion('oficios', 'Leñador')).toBe('oficio.lenador')
    expect(idDeOpcion('tiposEdificio', 'Casa del concejo')).toBe('edificio.casa-del-concejo')
    expect(idDeOpcion('tiposUnidad', 'Capitán')).toBe('unidad.capitan')
    expect(idDeOpcion('tiposDefensa', 'Torre de vigía')).toBe('defensa.torre-de-vigia')
    expect(idDeOpcion('tiposAnimal', 'Caballo de los Rohirrim')).toBe('animal.caballo-de-los-rohirrim')
  })

  it('arma el id de un recurso y no deja guiones sueltos en los extremos', () => {
    expect(idDeRecurso('Víveres')).toBe('recurso.viveres')
    expect(idDeRecurso('Carbón')).toBe('recurso.carbon')
    expect(idDeRecurso('Oro en bruto')).toBe('recurso.oro-en-bruto')
    expect(idDeRecurso('  Cal  ')).toBe('recurso.cal')
  })

  it('no repite ningún nombre normalizado dentro de una lista (§6.6)', () => {
    for (const lista of LISTAS) {
      const nombres = OPCIONES_INICIALES.filter((o) => o.lista === lista).map((o) => normalizarNombre(o.nombre))
      expect(new Set(nombres).size).toBe(nombres.length)
    }
    const recursos = RECURSOS_INICIALES.map((r) => normalizarNombre(r.nombre))
    expect(new Set(recursos).size).toBe(recursos.length)
  })

  it('protege 16 categorías, que son exactamente las de CATEGORIA', () => {
    const protegidas = deLista('categorias').filter((o) => o.protegida === true)
    expect(protegidas).toHaveLength(16)
    expect(protegidas.map((o) => o.id).sort()).toEqual(Object.values(CATEGORIA).sort())
    expect(CATEGORIA.salarios).toBe('cat.salarios')
    expect(CATEGORIA.viveresDelAlmacen).toBe('cat.viveres-del-almacen')
    expect(CATEGORIA.otros).toBe('cat.otros')
  })

  it('nombra en RECURSO los siete recursos del almacén de Bree', () => {
    expect(RECURSO).toEqual({
      viveres: 'recurso.viveres',
      cerveza: 'recurso.cerveza',
      madera: 'recurso.madera',
      piedra: 'recurso.piedra',
      arcilla: 'recurso.arcilla',
      hierro: 'recurso.hierro',
      lana: 'recurso.lana',
    })
    const ids = RECURSOS_INICIALES.map((r) => r.id)
    for (const id of Object.values(RECURSO)) {
      expect(ids).toContain(id)
    }
  })

  it('protege «Víveres» y las cuatro reservas del almacén', () => {
    expect(RECURSOS_INICIALES.filter((r) => r.protegido !== undefined).map((r) => r.id)).toEqual([
      'recurso.viveres',
      'recurso.madera',
      'recurso.piedra',
      'recurso.arcilla',
      'recurso.cerveza',
    ])
    expect(RECURSOS_INICIALES.find((r) => r.id === RECURSO.viveres)?.protegido).toBe('viveres')
    expect(RECURSOS_INICIALES.find((r) => r.id === RECURSO.madera)?.protegido).toBe('reserva')
    expect(RECURSOS_INICIALES.find((r) => r.id === RECURSO.hierro)?.protegido).toBeUndefined()
  })

  it('da a los 21 recursos las unidades de la decisión 10', () => {
    const unidades: Record<string, string> = {}
    for (const recurso of RECURSOS_INICIALES) {
      unidades[recurso.nombre] = `${recurso.unidadSingular} / ${recurso.unidadPlural}`
    }
    expect(unidades).toEqual({
      'Víveres': 'saco / sacos',
      'Madera': 'haz / haces',
      'Piedra': 'carretada / carretadas',
      'Arcilla': 'carretada / carretadas',
      'Hierro': 'lingote / lingotes',
      'Cerveza': 'barril / barriles',
      'Lana': 'fardo / fardos',
      'Sal': 'saco / sacos',
      'Carbón': 'saco / sacos',
      'Leña': 'haz / haces',
      'Cuero': 'fardo / fardos',
      'Tela': 'fardo / fardos',
      'Herramientas': 'caja / cajas',
      'Armas': 'caja / cajas',
      'Vino': 'barril / barriles',
      'Pescado': 'barril / barriles',
      'Carne': 'barril / barriles',
      'Hierbas': 'fardo / fardos',
      'Cera': 'pan / panes',
      'Vidrio': 'caja / cajas',
      'Oro en bruto': 'lingote / lingotes',
    })
  })

  it('da su plural a los 23 oficios (§6.5 n.º 22)', () => {
    const oficios = deLista('oficios')
    expect(oficios).toHaveLength(23)
    for (const oficio of oficios) {
      expect(oficio.plural.length).toBeGreaterThanOrEqual(2)
      expect(oficio.plural).not.toBe(oficio.nombre)
    }
    expect(oficios.map((o) => o.plural).slice(0, 5)).toEqual([
      'Granjeros',
      'Hortelanos',
      'Pastores',
      'Pescadores',
      'Cazadores',
    ])
    expect(oficios.find((o) => o.id === 'oficio.albanil')?.plural).toBe('Albañiles')
  })

  it('agrupa cada opción en un grupo de su lista', () => {
    expect(new Set(deLista('categorias').map((o) => o.grupo))).toEqual(
      new Set(['gastosPersonaje', 'ingresosPersonaje', 'asentamientos', 'otros']),
    )
    expect(new Set(deLista('oficios').map((o) => o.grupo))).toEqual(
      new Set(['campo', 'materiasPrimas', 'oficios', 'servicios']),
    )
    expect(new Set(deLista('tiposEdificio').map((o) => o.grupo))).toEqual(
      new Set(['alimentos', 'materiasPrimas', 'artesania', 'almacenaje', 'servicios']),
    )
    expect(new Set(deLista('tiposUnidad').map((o) => o.grupo))).toEqual(new Set(['tropa', 'mandos']))
    expect(new Set(deLista('tiposAnimal').map((o) => o.grupo)).size).toBe(11)
    expect(deLista('tiposAnimal').filter((o) => o.grupo === 'bovino')).toHaveLength(6)
    expect(deLista('tiposAnimal').filter((o) => o.grupo === 'avesDeCorral')).toHaveLength(12)
  })

  it('no trae nada propio ni borrado', () => {
    expect(OPCIONES_INICIALES.every((o) => o.propia === false && o.borrada === false)).toBe(true)
    expect(RECURSOS_INICIALES.every((r) => r.propia === false && r.borrada === false)).toBe(true)
  })

  it('cada opción y cada recurso pasan su esquema', () => {
    for (const opcion of OPCIONES_INICIALES) {
      expect(EsquemaOpcionCatalogo.safeParse(opcion).success).toBe(true)
    }
    for (const recurso of RECURSOS_INICIALES) {
      expect(EsquemaRecursoCatalogo.safeParse(recurso).success).toBe(true)
    }
  })
})
