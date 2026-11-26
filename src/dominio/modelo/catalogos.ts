import * as z from 'zod'
import { CAMPOS_REGISTRO, EsquemaId, EsquemaNombreCorto, EsquemaNombreLargo, type Id } from './comunes'

/** Las seis listas de opciones de la app (decisión 17). Es el índice `lista` de la tabla `opcionesCatalogo` de Dexie. */
export const EsquemaListaCatalogo = z.enum([
  'categorias',
  'oficios',
  'tiposEdificio',
  'tiposUnidad',
  'tiposDefensa',
  'tiposAnimal',
])
export type ListaCatalogo = z.infer<typeof EsquemaListaCatalogo>

/**
 * Campos que una opción lleva **también en la copia**: los que nombra §6.1 («{ id, nombre, grupo, plural o
 * unidades, propia }»). Las de la app llevan id fijo («cat.alojamiento»).
 */
const CAMPOS_OPCION_EN_COPIA = {
  id: EsquemaId,
  nombre: EsquemaNombreCorto,
  propia: z.boolean(),
}

/**
 * Campos que solo existen en este dispositivo y **no viajan en la copia** (§6.1): al importar mandan los de aquí,
 * y una opción borrada se reactiva (decisión 7).
 */
const CAMPOS_OPCION_EN_LA_TABLET = {
  borrada: z.boolean(),
  protegida: z.boolean().optional(),
}

/**
 * El grupo de cada lista, como clave y no como rótulo: los rótulos que se pintan salen de la interfaz
 * (decisión propia 31). Los tipos de defensa no tienen grupos (selector n.º 24).
 */
const GRUPO_CATEGORIAS = z.enum(['gastosPersonaje', 'ingresosPersonaje', 'asentamientos', 'otros', 'tuyas'])
const GRUPO_OFICIOS = z.enum(['campo', 'materiasPrimas', 'oficios', 'servicios'])
const GRUPO_TIPOS_EDIFICIO = z.enum(['alimentos', 'materiasPrimas', 'artesania', 'almacenaje', 'servicios'])
const GRUPO_TIPOS_UNIDAD = z.enum(['tropa', 'mandos'])
const GRUPO_TIPOS_ANIMAL = z.enum([
  'bovino',
  'caballar',
  'ovinoYCaprino',
  'porcino',
  'avesDeCorral',
  'perrosYGatos',
  'cetreria',
  'pequeniosAnimales',
  'cargaExotica',
  'estanques',
  'enCercado',
])

/**
 * Una opción tal como viaja en la copia (§6.1, decisión 6): sin `borrada` ni `protegida`.
 * El plural solo se guarda en los oficios (§8, «oficios (con plural)»): en los tipos se propone con la regla
 * de §6.6 y no se guarda (decisión propia 21).
 */
export const EsquemaOpcionEnCopia = z.discriminatedUnion('lista', [
  z.object({ ...CAMPOS_OPCION_EN_COPIA, lista: z.literal('categorias'), grupo: GRUPO_CATEGORIAS }),
  z.object({ ...CAMPOS_OPCION_EN_COPIA, lista: z.literal('oficios'), grupo: GRUPO_OFICIOS, plural: EsquemaNombreCorto }),
  z.object({ ...CAMPOS_OPCION_EN_COPIA, lista: z.literal('tiposEdificio'), grupo: GRUPO_TIPOS_EDIFICIO }),
  z.object({ ...CAMPOS_OPCION_EN_COPIA, lista: z.literal('tiposUnidad'), grupo: GRUPO_TIPOS_UNIDAD }),
  z.object({ ...CAMPOS_OPCION_EN_COPIA, lista: z.literal('tiposDefensa') }),
  z.object({ ...CAMPOS_OPCION_EN_COPIA, lista: z.literal('tiposAnimal'), grupo: GRUPO_TIPOS_ANIMAL }),
])
export type OpcionEnCopia = z.infer<typeof EsquemaOpcionEnCopia>

/** Una opción de catálogo tal como vive en la tabla `opcionesCatalogo` de este dispositivo (§6.5, decisión 17). */
export const EsquemaOpcionCatalogo = z.discriminatedUnion('lista', [
  z.object({
    ...CAMPOS_OPCION_EN_COPIA,
    ...CAMPOS_OPCION_EN_LA_TABLET,
    lista: z.literal('categorias'),
    grupo: GRUPO_CATEGORIAS,
  }),
  z.object({
    ...CAMPOS_OPCION_EN_COPIA,
    ...CAMPOS_OPCION_EN_LA_TABLET,
    lista: z.literal('oficios'),
    grupo: GRUPO_OFICIOS,
    plural: EsquemaNombreCorto,
  }),
  z.object({
    ...CAMPOS_OPCION_EN_COPIA,
    ...CAMPOS_OPCION_EN_LA_TABLET,
    lista: z.literal('tiposEdificio'),
    grupo: GRUPO_TIPOS_EDIFICIO,
  }),
  z.object({
    ...CAMPOS_OPCION_EN_COPIA,
    ...CAMPOS_OPCION_EN_LA_TABLET,
    lista: z.literal('tiposUnidad'),
    grupo: GRUPO_TIPOS_UNIDAD,
  }),
  z.object({
    ...CAMPOS_OPCION_EN_COPIA,
    ...CAMPOS_OPCION_EN_LA_TABLET,
    lista: z.literal('tiposDefensa'),
  }),
  z.object({
    ...CAMPOS_OPCION_EN_COPIA,
    ...CAMPOS_OPCION_EN_LA_TABLET,
    lista: z.literal('tiposAnimal'),
    grupo: GRUPO_TIPOS_ANIMAL,
  }),
])
export type OpcionCatalogo = z.infer<typeof EsquemaOpcionCatalogo>

/** Un recurso tal como viaja en la copia (§6.1): sin `borrada` ni `protegido`. */
export const EsquemaRecursoEnCopia = z.object({
  id: EsquemaId,
  nombre: EsquemaNombreCorto,
  unidadSingular: z.string().min(1).max(20),
  unidadPlural: z.string().min(1).max(20),
  propia: z.boolean(),
})
export type RecursoEnCopia = z.infer<typeof EsquemaRecursoEnCopia>

/**
 * Un recurso del catálogo de la app (§8). Todos los recursoId apuntan aquí.
 * `protegido`: «viveres» ni se renombra ni se elimina; «reserva» (Cerveza, Madera, Piedra y Arcilla) se renombra
 * pero no se elimina (§6.6, patrón 5).
 */
export const EsquemaRecursoCatalogo = EsquemaRecursoEnCopia.extend({
  borrada: z.boolean(),
  protegido: z.enum(['viveres', 'reserva']).optional(),
})
export type RecursoCatalogo = z.infer<typeof EsquemaRecursoCatalogo>

/** Los catálogos que acompañan a una copia (§6.1, decisión 6). La copia no lleva lo que es de este dispositivo. */
export const EsquemaCatalogosEnCopia = z.object({
  opciones: z.array(EsquemaOpcionEnCopia),
  recursos: z.array(EsquemaRecursoEnCopia),
})
export type CatalogosEnCopia = z.infer<typeof EsquemaCatalogosEnCopia>

/** El catálogo de la app tal como está en este dispositivo (opciones y recursos, borrados incluidos). */
export interface CatalogoApp {
  opciones: OpcionCatalogo[]
  recursos: RecursoCatalogo[]
}

/** Altas y reactivaciones que hay que escribir en el catálogo tras fusionar una copia (decisión 7). */
export interface CambiosCatalogo {
  opcionesNuevas: OpcionCatalogo[]
  recursosNuevos: RecursoCatalogo[]
  opcionesReactivadas: Id[]
  recursosReactivados: Id[]
}

/** Nombre en singular de cada lista, para los mensajes: «La categoría …», «El tipo de edificio …». */
export const NOMBRE_LISTA: Readonly<Record<ListaCatalogo, string>> = {
  categorias: 'categoría',
  oficios: 'oficio',
  tiposEdificio: 'tipo de edificio',
  tiposUnidad: 'tipo de unidad',
  tiposDefensa: 'tipo de defensa',
  tiposAnimal: 'tipo de animal',
}

/** Artículo de cada lista en los mensajes: «La» para categoría, «El» para las demás. */
export const ARTICULO_LISTA: Readonly<Record<ListaCatalogo, 'La' | 'El'>> = {
  categorias: 'La',
  oficios: 'El',
  tiposEdificio: 'El',
  tiposUnidad: 'El',
  tiposDefensa: 'El',
  tiposAnimal: 'El',
}

/** Una ubicación propia de la partida (§8). «Encima», «Caja de X» y «Almacén de X» salen de los dominios y no se guardan. */
export const EsquemaUbicacion = z.object({
  ...CAMPOS_REGISTRO,
  nombre: EsquemaNombreLargo,
})
export type Ubicacion = z.infer<typeof EsquemaUbicacion>

/** Una persona o entidad de la partida (§8): contrapartes, compradores, destinatarios y titulares de locales. */
export const EsquemaPersonaEntidad = z.object({
  ...CAMPOS_REGISTRO,
  nombre: EsquemaNombreLargo,
})
export type PersonaEntidad = z.infer<typeof EsquemaPersonaEntidad>
