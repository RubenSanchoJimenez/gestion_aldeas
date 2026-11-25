import { remapearCatalogos } from '../dominio/copia/fusion'
import {
  EsquemaOpcionCatalogo,
  type ListaCatalogo,
  type OpcionCatalogo,
  type RecursoCatalogo,
} from '../dominio/modelo/catalogos'
import type { Id } from '../dominio/modelo/comunes'
import { estadoDe, type DocumentoPartida } from '../dominio/modelo/documento'
import { esNombreReservado, mismoNombre } from '../dominio/texto/normalizar'
import type { BaseDeDatos } from './baseDeDatos'
import { leerCatalogo } from './catalogos'

/** El nombre limpio de una opción o un recurso, sin repetir en su lista (§6.6, reglas comunes). */
function exigeNombre(nombre: string, hermanos: readonly { id: Id; nombre: string }[], propio?: Id): string {
  const limpio = nombre.trim()
  if (limpio === '') {
    throw new Error('Escribe un nombre')
  }
  if (limpio.length < 2) {
    throw new Error('Usa al menos 2 letras')
  }
  if (limpio.length > 40) {
    throw new Error('El nombre no puede pasar de 40 letras')
  }
  if (esNombreReservado(limpio)) {
    throw new Error('Ese nombre lo usa el filtro')
  }
  if (hermanos.some((h) => h.id !== propio && mismoNombre(h.nombre, limpio))) {
    throw new Error(`Ya existe «${limpio}»`)
  }
  return limpio
}

export interface DatosOpcion {
  nombre: string
  /** El grupo de la lista; las categorías propias van a «Tus categorías» y las defensas no tienen. */
  grupo?: string
  /** Solo los oficios. */
  plural?: string
}

export async function crearOpcion(
  db: BaseDeDatos,
  lista: ListaCatalogo,
  datos: DatosOpcion,
  nuevoId: () => Id,
): Promise<OpcionCatalogo> {
  const { opciones } = await leerCatalogo(db)
  const hermanos = opciones.filter((o) => o.lista === lista && !o.borrada)
  const nombre = exigeNombre(datos.nombre, hermanos)
  const opcion = EsquemaOpcionCatalogo.parse({
    id: nuevoId(),
    nombre,
    lista,
    propia: true,
    borrada: false,
    ...(lista === 'categorias' ? { grupo: datos.grupo ?? 'tuyas' } : {}),
    ...(lista !== 'categorias' && lista !== 'tiposDefensa' ? { grupo: datos.grupo } : {}),
    ...(lista === 'oficios' ? { plural: datos.plural?.trim() || `${nombre}s` } : {}),
  })
  await db.opcionesCatalogo.put(opcion)
  return opcion
}

export async function renombrarOpcion(db: BaseDeDatos, id: Id, nombre: string): Promise<void> {
  const { opciones } = await leerCatalogo(db)
  const actual = opciones.find((o) => o.id === id)
  if (actual === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  const hermanos = opciones.filter((o) => o.lista === actual.lista && !o.borrada)
  await db.opcionesCatalogo.put({ ...actual, nombre: exigeNombre(nombre, hermanos, id) })
}

/** Las veces que un id de catálogo aparece en el estado de una partida (sin contar la copia para deshacer). */
export function usosEnPartida(documento: DocumentoPartida, id: Id): number {
  const marca = JSON.stringify(id)
  return JSON.stringify(estadoDe(documento)).split(marca).length - 1
}

export async function usosTotales(db: BaseDeDatos, id: Id): Promise<number> {
  const partidas = await db.partidas.toArray()
  return partidas.reduce((suma, p) => suma + usosEnPartida(p, id), 0)
}

/** Si dos filas de animales quedan con el mismo tipo y género, se suman y sus notas se unen. */
function unirAnimales(documento: DocumentoPartida): DocumentoPartida {
  const unidos = new Map<string, DocumentoPartida['animales'][number]>()
  for (const animal of documento.animales) {
    const clave = `${animal.dominioId}|${animal.tipoId}|${animal.genero}`
    const previo = unidos.get(clave)
    if (previo === undefined) {
      unidos.set(clave, animal)
      continue
    }
    const notas = [previo.notas, animal.notas].filter(Boolean).join(' · ')
    unidos.set(clave, {
      ...previo,
      cantidad: previo.cantidad + animal.cantidad,
      ...(notas === '' ? {} : { notas }),
    })
  }
  return unidos.size === documento.animales.length ? documento : { ...documento, animales: [...unidos.values()] }
}

/**
 * Elimina una opción (P7b): queda marcada como borrada y, si algo la usa, sus registros pasan a `reemplazo` en
 * todas las partidas y en la copia que guarda cada una para deshacer. No rellena editadoEl (§6.6, patrón 5).
 */
export async function eliminarOpcion(db: BaseDeDatos, id: Id, reemplazo: Id | undefined): Promise<void> {
  await db.transaction('rw', db.partidas, db.opcionesCatalogo, async () => {
    const opcion = await db.opcionesCatalogo.get(id)
    if (opcion === undefined) {
      throw new Error(`No existe «${id}»`)
    }
    if (opcion.protegida === true) {
      throw new Error(`«${opcion.nombre}» la pone la app: puedes renombrarla, pero no eliminarla.`)
    }
    const partidas = await db.partidas.toArray()
    const usada = partidas.some((p) => usosEnPartida(p, id) > 0)
    if (usada && reemplazo === undefined) {
      throw new Error('Elige a qué opción pasan sus registros')
    }
    if (reemplazo !== undefined) {
      for (const partida of partidas) {
        const cambiada = unirAnimales(remapearCatalogos(partida, { [id]: reemplazo }))
        await db.partidas.put(cambiada)
      }
    }
    await db.opcionesCatalogo.put({ ...opcion, borrada: true })
  })
}

export interface DatosRecurso {
  nombre: string
  unidadSingular: string
  unidadPlural: string
}

/** Crea o edita un recurso del catálogo. Víveres ni se renombra. */
export async function guardarRecurso(
  db: BaseDeDatos,
  id: Id | undefined,
  datos: DatosRecurso,
  nuevoId: () => Id,
): Promise<void> {
  const { recursos } = await leerCatalogo(db)
  const actual = recursos.find((r) => r.id === id)
  if (actual?.protegido === 'viveres') {
    throw new Error('Víveres lo pone la app y no se cambia')
  }
  const nombre = exigeNombre(datos.nombre, recursos.filter((r) => !r.borrada), id)
  const unidadSingular = datos.unidadSingular.trim()
  const unidadPlural = datos.unidadPlural.trim()
  if (unidadSingular === '' || unidadPlural === '') {
    throw new Error('Escribe la unidad en singular y en plural')
  }
  const recurso: RecursoCatalogo = {
    ...(actual ?? { id: nuevoId(), propia: true, borrada: false }),
    nombre,
    unidadSingular,
    unidadPlural,
  }
  await db.recursosCatalogo.put(recurso)
}

/** Elimina un recurso que no usa ninguna partida. */
export async function eliminarRecurso(db: BaseDeDatos, id: Id): Promise<void> {
  const recurso = await db.recursosCatalogo.get(id)
  if (recurso === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  if (recurso.protegido !== undefined) {
    throw new Error(`«${recurso.nombre}» lo pone la app y no se elimina`)
  }
  if ((await usosTotales(db, id)) > 0) {
    throw new Error(`«${recurso.nombre}» se usa en alguna partida: quita esos registros antes de eliminarlo`)
  }
  await db.recursosCatalogo.put({ ...recurso, borrada: true })
}
