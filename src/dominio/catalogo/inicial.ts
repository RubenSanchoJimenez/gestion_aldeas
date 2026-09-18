import type { ListaCatalogo, OpcionCatalogo, RecursoCatalogo } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'

/** Versión del catálogo de fábrica: sube cuando se añaden o cambian opciones de la app (§6.6). */
export const VERSION_CATALOGO = 1

/** Prefijo del id fijo de cada lista (decisión 8). No es la clave de la lista: «tiposDefensa» da «defensa.». */
const PREFIJO_LISTA: Readonly<Record<ListaCatalogo, string>> = {
  categorias: 'cat',
  oficios: 'oficio',
  tiposEdificio: 'edificio',
  tiposUnidad: 'unidad',
  tiposDefensa: 'defensa',
  tiposAnimal: 'animal',
}

/** Marcas diacríticas que la descomposición NFD separa de su letra (de U+0300 a U+036F). */
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g

/** Cada tramo que no es letra sin tilde ni cifra: se convierte en un guion. */
const TRAMOS_NO_ALFANUMERICOS = /[^a-z0-9]+/g

/** Guiones sobrantes al principio y al final del cuerpo del id. */
const GUIONES_DE_LOS_EXTREMOS = /^-+|-+$/g

/**
 * Cuerpo del id fijo (decisión 8): el nombre en minúsculas, sin tildes ni diéresis, con la eñe convertida en
 * «n» y cada tramo que no sea letra o número convertido en un guion. Aquí la eñe **sí** se convierte en «n»,
 * al revés que en normalizarNombre (§6.6), que la conserva porque «la ñ no equivale a la n» al comparar.
 */
function cuerpoDeId(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .toLowerCase()
    .replace(TRAMOS_NO_ALFANUMERICOS, '-')
    .replace(GUIONES_DE_LOS_EXTREMOS, '')
}

/** Id fijo de una opción de la app: idDeOpcion('tiposDefensa', 'Torre de vigía') === 'defensa.torre-de-vigia'. */
export function idDeOpcion(lista: ListaCatalogo, nombre: string): Id {
  return `${PREFIJO_LISTA[lista]}.${cuerpoDeId(nombre)}`
}

/** Id fijo de un recurso de la app: idDeRecurso('Oro en bruto') === 'recurso.oro-en-bruto' (decisión 8). */
export function idDeRecurso(nombre: string): Id {
  return `recurso.${cuerpoDeId(nombre)}`
}

type Categoria = Extract<OpcionCatalogo, { lista: 'categorias' }>
type Oficio = Extract<OpcionCatalogo, { lista: 'oficios' }>
type TipoEdificio = Extract<OpcionCatalogo, { lista: 'tiposEdificio' }>
type TipoUnidad = Extract<OpcionCatalogo, { lista: 'tiposUnidad' }>
type TipoDefensa = Extract<OpcionCatalogo, { lista: 'tiposDefensa' }>
type TipoAnimal = Extract<OpcionCatalogo, { lista: 'tiposAnimal' }>

/** Una categoría de fábrica. `protegida` es el candado de P7: se renombra, pero no se elimina (§6.6). */
function categoria(id: Id, nombre: string, grupo: Categoria['grupo'], protegida: boolean): Categoria {
  return { id, nombre, lista: 'categorias', grupo, propia: false, borrada: false, protegida }
}

/** Un oficio de fábrica. Es la única lista que guarda plural (§6.5 n.º 22). */
function oficio(id: Id, nombre: string, plural: string, grupo: Oficio['grupo']): Oficio {
  return { id, nombre, lista: 'oficios', grupo, plural, propia: false, borrada: false, protegida: false }
}

/** Un tipo de edificio de fábrica (§6.5 n.º 20). «El tipo no trae producción». */
function tipoEdificio(id: Id, nombre: string, grupo: TipoEdificio['grupo']): TipoEdificio {
  return { id, nombre, lista: 'tiposEdificio', grupo, propia: false, borrada: false, protegida: false }
}

/** Un tipo de unidad de guarnición de fábrica (§6.5 n.º 23). El nombre de la unidad va en la unidad. */
function tipoUnidad(id: Id, nombre: string, grupo: TipoUnidad['grupo']): TipoUnidad {
  return { id, nombre, lista: 'tiposUnidad', grupo, propia: false, borrada: false, protegida: false }
}

/** Un tipo de defensa de fábrica (§6.5 n.º 24). Es la única lista sin grupos. */
function tipoDefensa(id: Id, nombre: string): TipoDefensa {
  return { id, nombre, lista: 'tiposDefensa', propia: false, borrada: false, protegida: false }
}

/** Un tipo de animal de fábrica (§6.5 n.º 34). */
function tipoAnimal(id: Id, nombre: string, grupo: TipoAnimal['grupo']): TipoAnimal {
  return { id, nombre, lista: 'tiposAnimal', grupo, propia: false, borrada: false, protegida: false }
}

/** Un recurso de fábrica, con su unidad en singular y en plural (§6.5 n.º 18, decisión 10). */
function recurso(
  id: Id,
  nombre: string,
  unidadSingular: string,
  unidadPlural: string,
  protegido?: 'viveres' | 'reserva',
): RecursoCatalogo {
  return { id, nombre, unidadSingular, unidadPlural, propia: false, borrada: false, protegido }
}

/** Las 27 categorías de movimiento de fábrica (§6.5 n.º 6). Las 16 protegidas son las que elige la app sola. */
const CATEGORIAS: readonly Categoria[] = [
  categoria('cat.alojamiento', 'Alojamiento', 'gastosPersonaje', false),
  categoria('cat.comida-y-bebida', 'Comida y bebida', 'gastosPersonaje', false),
  categoria('cat.montura', 'Montura', 'gastosPersonaje', false),
  categoria('cat.equipo', 'Equipo', 'gastosPersonaje', false),
  categoria('cat.armas-y-armaduras', 'Armas y armaduras', 'gastosPersonaje', false),
  categoria('cat.hierbas-y-curacion', 'Hierbas y curación', 'gastosPersonaje', false),
  categoria('cat.pergaminos-y-estudio', 'Pergaminos y estudio', 'gastosPersonaje', true),
  categoria('cat.viajes-y-peajes', 'Viajes y peajes', 'gastosPersonaje', false),
  categoria('cat.sobornos-y-regalos', 'Sobornos y regalos', 'gastosPersonaje', false),
  categoria('cat.gastos-recurrentes', 'Gastos recurrentes', 'gastosPersonaje', false),
  categoria('cat.recompensas', 'Recompensas', 'ingresosPersonaje', false),
  categoria('cat.venta-de-objetos', 'Venta de objetos', 'ingresosPersonaje', true),
  categoria('cat.beneficios-de-inversiones', 'Beneficios de inversiones', 'ingresosPersonaje', true),
  categoria('cat.prestamos-y-deudas', 'Préstamos y deudas', 'ingresosPersonaje', true),
  categoria('cat.impuestos', 'Impuestos', 'asentamientos', true),
  categoria('cat.rentas-y-alquileres', 'Rentas y alquileres', 'asentamientos', true),
  categoria('cat.aranceles', 'Aranceles', 'asentamientos', true),
  categoria('cat.salarios', 'Salarios', 'asentamientos', true),
  categoria('cat.soldadas', 'Soldadas', 'asentamientos', true),
  categoria('cat.tributos', 'Tributos', 'asentamientos', true),
  categoria('cat.obras', 'Obras', 'asentamientos', true),
  categoria('cat.comercio', 'Comercio', 'asentamientos', true),
  categoria('cat.viveres-del-almacen', 'Víveres del almacén', 'asentamientos', true),
  categoria('cat.transferencias', 'Transferencias', 'otros', true),
  categoria('cat.inversiones', 'Inversiones', 'otros', true),
  categoria('cat.ajustes', 'Ajustes', 'otros', false),
  categoria('cat.otros', 'Otros', 'otros', true),
]

/** Los 23 oficios de fábrica, con su plural (§6.5 n.º 22). */
const OFICIOS: readonly Oficio[] = [
  oficio('oficio.granjero', 'Granjero', 'Granjeros', 'campo'),
  oficio('oficio.hortelano', 'Hortelano', 'Hortelanos', 'campo'),
  oficio('oficio.pastor', 'Pastor', 'Pastores', 'campo'),
  oficio('oficio.pescador', 'Pescador', 'Pescadores', 'campo'),
  oficio('oficio.cazador', 'Cazador', 'Cazadores', 'campo'),
  oficio('oficio.lenador', 'Leñador', 'Leñadores', 'materiasPrimas'),
  oficio('oficio.cantero', 'Cantero', 'Canteros', 'materiasPrimas'),
  oficio('oficio.minero', 'Minero', 'Mineros', 'materiasPrimas'),
  oficio('oficio.molinero', 'Molinero', 'Molineros', 'oficios'),
  oficio('oficio.panadero', 'Panadero', 'Panaderos', 'oficios'),
  oficio('oficio.cervecero', 'Cervecero', 'Cerveceros', 'oficios'),
  oficio('oficio.herrero', 'Herrero', 'Herreros', 'oficios'),
  oficio('oficio.carpintero', 'Carpintero', 'Carpinteros', 'oficios'),
  oficio('oficio.albanil', 'Albañil', 'Albañiles', 'oficios'),
  oficio('oficio.tejedor', 'Tejedor', 'Tejedores', 'oficios'),
  oficio('oficio.curtidor', 'Curtidor', 'Curtidores', 'oficios'),
  oficio('oficio.alfarero', 'Alfarero', 'Alfareros', 'oficios'),
  oficio('oficio.posadero', 'Posadero', 'Posaderos', 'servicios'),
  oficio('oficio.mercader', 'Mercader', 'Mercaderes', 'servicios'),
  oficio('oficio.carretero', 'Carretero', 'Carreteros', 'servicios'),
  oficio('oficio.criado', 'Criado', 'Criados', 'servicios'),
  oficio('oficio.escriba', 'Escriba', 'Escribas', 'servicios'),
  oficio('oficio.sanador', 'Sanador', 'Sanadores', 'servicios'),
]

/** Los 24 tipos de edificio de fábrica (§6.5 n.º 20). «Horno» va en Alimentos, como dice §6.6. */
const TIPOS_EDIFICIO: readonly TipoEdificio[] = [
  tipoEdificio('edificio.granja', 'Granja', 'alimentos'),
  tipoEdificio('edificio.huerto', 'Huerto', 'alimentos'),
  tipoEdificio('edificio.redil', 'Redil', 'alimentos'),
  tipoEdificio('edificio.establo', 'Establo', 'alimentos'),
  tipoEdificio('edificio.molino', 'Molino', 'alimentos'),
  tipoEdificio('edificio.horno', 'Horno', 'alimentos'),
  tipoEdificio('edificio.panaderia', 'Panadería', 'alimentos'),
  tipoEdificio('edificio.cerveceria', 'Cervecería', 'alimentos'),
  tipoEdificio('edificio.aserradero', 'Aserradero', 'materiasPrimas'),
  tipoEdificio('edificio.cantera', 'Cantera', 'materiasPrimas'),
  tipoEdificio('edificio.mina', 'Mina', 'materiasPrimas'),
  tipoEdificio('edificio.herreria', 'Herrería', 'artesania'),
  tipoEdificio('edificio.carpinteria', 'Carpintería', 'artesania'),
  tipoEdificio('edificio.telar', 'Telar', 'artesania'),
  tipoEdificio('edificio.curtiduria', 'Curtiduría', 'artesania'),
  tipoEdificio('edificio.alfareria', 'Alfarería', 'artesania'),
  tipoEdificio('edificio.granero', 'Granero', 'almacenaje'),
  tipoEdificio('edificio.almacen', 'Almacén', 'almacenaje'),
  tipoEdificio('edificio.mercado', 'Mercado', 'servicios'),
  tipoEdificio('edificio.posada', 'Posada', 'servicios'),
  tipoEdificio('edificio.taberna', 'Taberna', 'servicios'),
  tipoEdificio('edificio.santuario', 'Santuario', 'servicios'),
  tipoEdificio('edificio.casa-del-concejo', 'Casa del concejo', 'servicios'),
  tipoEdificio('edificio.muelle', 'Muelle', 'servicios'),
]

/** Los 8 tipos de unidad de fábrica (§6.5 n.º 23). «Tropa» es el grupo inicial de una unidad nueva. */
const TIPOS_UNIDAD: readonly TipoUnidad[] = [
  tipoUnidad('unidad.guardia', 'Guardia', 'tropa'),
  tipoUnidad('unidad.arquero', 'Arquero', 'tropa'),
  tipoUnidad('unidad.lancero', 'Lancero', 'tropa'),
  tipoUnidad('unidad.jinete', 'Jinete', 'tropa'),
  tipoUnidad('unidad.explorador', 'Explorador', 'tropa'),
  tipoUnidad('unidad.milicia', 'Milicia', 'tropa'),
  tipoUnidad('unidad.sargento', 'Sargento', 'mandos'),
  tipoUnidad('unidad.capitan', 'Capitán', 'mandos'),
]

/** Los 6 tipos de defensa de fábrica (§6.5 n.º 24). P7 los muestra sin grupo. */
const TIPOS_DEFENSA: readonly TipoDefensa[] = [
  tipoDefensa('defensa.empalizada', 'Empalizada'),
  tipoDefensa('defensa.muralla', 'Muralla'),
  tipoDefensa('defensa.puerta', 'Puerta'),
  tipoDefensa('defensa.torre-de-vigia', 'Torre de vigía'),
  tipoDefensa('defensa.atalaya', 'Atalaya'),
  tipoDefensa('defensa.foso', 'Foso'),
]

/** Los 57 tipos de animal de fábrica, en los 11 grupos que enumera §6.5 n.º 34. */
const TIPOS_ANIMAL: readonly TipoAnimal[] = [
  tipoAnimal('animal.vaca', 'Vaca', 'bovino'),
  tipoAnimal('animal.toro', 'Toro', 'bovino'),
  tipoAnimal('animal.buey', 'Buey', 'bovino'),
  tipoAnimal('animal.ternero', 'Ternero', 'bovino'),
  tipoAnimal('animal.ternera', 'Ternera', 'bovino'),
  tipoAnimal('animal.vaquilla', 'Vaquilla', 'bovino'),
  tipoAnimal('animal.caballo-de-tiro', 'Caballo de tiro', 'caballar'),
  tipoAnimal('animal.caballo-de-silla', 'Caballo de silla', 'caballar'),
  tipoAnimal('animal.caballo-de-guerra', 'Caballo de guerra', 'caballar'),
  tipoAnimal('animal.caballo-de-los-rohirrim', 'Caballo de los Rohirrim', 'caballar'),
  tipoAnimal('animal.yegua', 'Yegua', 'caballar'),
  tipoAnimal('animal.potro', 'Potro', 'caballar'),
  tipoAnimal('animal.poni', 'Poni', 'caballar'),
  tipoAnimal('animal.poni-de-la-comarca', 'Poni de la Comarca', 'caballar'),
  tipoAnimal('animal.mula', 'Mula', 'caballar'),
  tipoAnimal('animal.asno', 'Asno', 'caballar'),
  tipoAnimal('animal.oveja', 'Oveja', 'ovinoYCaprino'),
  tipoAnimal('animal.carnero', 'Carnero', 'ovinoYCaprino'),
  tipoAnimal('animal.cordero', 'Cordero', 'ovinoYCaprino'),
  tipoAnimal('animal.cabra', 'Cabra', 'ovinoYCaprino'),
  tipoAnimal('animal.macho-cabrio', 'Macho cabrío', 'ovinoYCaprino'),
  tipoAnimal('animal.cabrito', 'Cabrito', 'ovinoYCaprino'),
  tipoAnimal('animal.cerdo', 'Cerdo', 'porcino'),
  tipoAnimal('animal.cerda', 'Cerda', 'porcino'),
  tipoAnimal('animal.verraco', 'Verraco', 'porcino'),
  tipoAnimal('animal.lechon', 'Lechón', 'porcino'),
  tipoAnimal('animal.gallina', 'Gallina', 'avesDeCorral'),
  tipoAnimal('animal.gallo', 'Gallo', 'avesDeCorral'),
  tipoAnimal('animal.pollo', 'Pollo', 'avesDeCorral'),
  tipoAnimal('animal.capon', 'Capón', 'avesDeCorral'),
  tipoAnimal('animal.pato', 'Pato', 'avesDeCorral'),
  tipoAnimal('animal.oca', 'Oca', 'avesDeCorral'),
  tipoAnimal('animal.pavo', 'Pavo', 'avesDeCorral'),
  tipoAnimal('animal.paloma', 'Paloma', 'avesDeCorral'),
  tipoAnimal('animal.codorniz', 'Codorniz', 'avesDeCorral'),
  tipoAnimal('animal.faisan', 'Faisán', 'avesDeCorral'),
  tipoAnimal('animal.pavo-real', 'Pavo real', 'avesDeCorral'),
  tipoAnimal('animal.cisne', 'Cisne', 'avesDeCorral'),
  tipoAnimal('animal.perro-pastor', 'Perro pastor', 'perrosYGatos'),
  tipoAnimal('animal.perro-de-caza', 'Perro de caza', 'perrosYGatos'),
  tipoAnimal('animal.mastin', 'Mastín', 'perrosYGatos'),
  tipoAnimal('animal.lebrel', 'Lebrel', 'perrosYGatos'),
  tipoAnimal('animal.perro-guardian', 'Perro guardián', 'perrosYGatos'),
  tipoAnimal('animal.gato', 'Gato', 'perrosYGatos'),
  tipoAnimal('animal.halcon', 'Halcón', 'cetreria'),
  tipoAnimal('animal.azor', 'Azor', 'cetreria'),
  tipoAnimal('animal.huron', 'Hurón', 'cetreria'),
  tipoAnimal('animal.conejo', 'Conejo', 'pequeniosAnimales'),
  tipoAnimal('animal.colmena-de-abejas', 'Colmena de abejas', 'pequeniosAnimales'),
  tipoAnimal('animal.gusanos-de-seda', 'Gusanos de seda', 'pequeniosAnimales'),
  tipoAnimal('animal.camello', 'Camello', 'cargaExotica'),
  tipoAnimal('animal.olifante', 'Olifante', 'cargaExotica'),
  tipoAnimal('animal.carpa', 'Carpa', 'estanques'),
  tipoAnimal('animal.trucha', 'Trucha', 'estanques'),
  tipoAnimal('animal.ciervo', 'Ciervo', 'enCercado'),
  tipoAnimal('animal.jabali', 'Jabalí', 'enCercado'),
  tipoAnimal('animal.oso-amaestrado', 'Oso amaestrado', 'enCercado'),
]

/** Las 145 opciones de fábrica: 27 categorías, 23 oficios, 24 tipos de edificio, 8 de unidad, 6 de defensa y 57 de animal (§6.5). */
export const OPCIONES_INICIALES: readonly OpcionCatalogo[] = [
  ...CATEGORIAS,
  ...OFICIOS,
  ...TIPOS_EDIFICIO,
  ...TIPOS_UNIDAD,
  ...TIPOS_DEFENSA,
  ...TIPOS_ANIMAL,
]

/** Los 21 recursos de fábrica, con sus unidades en singular y plural (§6.5 n.º 18, decisión 10). */
export const RECURSOS_INICIALES: readonly RecursoCatalogo[] = [
  recurso('recurso.viveres', 'Víveres', 'saco', 'sacos', 'viveres'),
  recurso('recurso.madera', 'Madera', 'haz', 'haces', 'reserva'),
  recurso('recurso.piedra', 'Piedra', 'carretada', 'carretadas', 'reserva'),
  recurso('recurso.arcilla', 'Arcilla', 'carretada', 'carretadas', 'reserva'),
  recurso('recurso.hierro', 'Hierro', 'lingote', 'lingotes'),
  recurso('recurso.cerveza', 'Cerveza', 'barril', 'barriles', 'reserva'),
  recurso('recurso.lana', 'Lana', 'fardo', 'fardos'),
  recurso('recurso.sal', 'Sal', 'saco', 'sacos'),
  recurso('recurso.carbon', 'Carbón', 'saco', 'sacos'),
  recurso('recurso.lena', 'Leña', 'haz', 'haces'),
  recurso('recurso.cuero', 'Cuero', 'fardo', 'fardos'),
  recurso('recurso.tela', 'Tela', 'fardo', 'fardos'),
  recurso('recurso.herramientas', 'Herramientas', 'caja', 'cajas'),
  recurso('recurso.armas', 'Armas', 'caja', 'cajas'),
  recurso('recurso.vino', 'Vino', 'barril', 'barriles'),
  recurso('recurso.pescado', 'Pescado', 'barril', 'barriles'),
  recurso('recurso.carne', 'Carne', 'barril', 'barriles'),
  recurso('recurso.hierbas', 'Hierbas', 'fardo', 'fardos'),
  recurso('recurso.cera', 'Cera', 'pan', 'panes'),
  recurso('recurso.vidrio', 'Vidrio', 'caja', 'cajas'),
  recurso('recurso.oro-en-bruto', 'Oro en bruto', 'lingote', 'lingotes'),
]

/** Ids fijos de las categorías que usa el motor: CATEGORIA.salarios === 'cat.salarios' (§9). Son las 16 protegidas. */
export const CATEGORIA: Readonly<
  Record<
    | 'salarios'
    | 'soldadas'
    | 'tributos'
    | 'impuestos'
    | 'rentasYAlquileres'
    | 'aranceles'
    | 'beneficiosDeInversiones'
    | 'prestamosYDeudas'
    | 'ventaDeObjetos'
    | 'viveresDelAlmacen'
    | 'comercio'
    | 'obras'
    | 'transferencias'
    | 'inversiones'
    | 'pergaminosYEstudio'
    | 'otros',
    Id
  >
> = {
  salarios: 'cat.salarios',
  soldadas: 'cat.soldadas',
  tributos: 'cat.tributos',
  impuestos: 'cat.impuestos',
  rentasYAlquileres: 'cat.rentas-y-alquileres',
  aranceles: 'cat.aranceles',
  beneficiosDeInversiones: 'cat.beneficios-de-inversiones',
  prestamosYDeudas: 'cat.prestamos-y-deudas',
  ventaDeObjetos: 'cat.venta-de-objetos',
  viveresDelAlmacen: 'cat.viveres-del-almacen',
  comercio: 'cat.comercio',
  obras: 'cat.obras',
  transferencias: 'cat.transferencias',
  inversiones: 'cat.inversiones',
  pergaminosYEstudio: 'cat.pergaminos-y-estudio',
  otros: 'cat.otros',
}

/** Ids fijos de los recursos que usa el motor: RECURSO.viveres === 'recurso.viveres' (§7). */
export const RECURSO: Readonly<Record<'viveres' | 'cerveza' | 'madera' | 'piedra' | 'arcilla' | 'hierro' | 'lana', Id>> =
  {
    viveres: 'recurso.viveres',
    cerveza: 'recurso.cerveza',
    madera: 'recurso.madera',
    piedra: 'recurso.piedra',
    arcilla: 'recurso.arcilla',
    hierro: 'recurso.hierro',
    lana: 'recurso.lana',
  }
