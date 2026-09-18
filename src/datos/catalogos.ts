import { OPCIONES_INICIALES, RECURSOS_INICIALES, VERSION_CATALOGO } from '../dominio/catalogo/inicial'
import type {
  CambiosCatalogo,
  CatalogoApp,
  ListaCatalogo,
  OpcionCatalogo,
  RecursoCatalogo,
} from '../dominio/modelo/catalogos'
import type { Id } from '../dominio/modelo/comunes'
import { normalizarNombre } from '../dominio/texto/normalizar'
import { guardarAjuste } from './ajustes'
import type { BaseDeDatos } from './baseDeDatos'

/** Qué añadió la siembra; la app la llama en cada arranque, no solo al crear la base (§6.6). */
export interface ResumenSiembra {
  opcionesAnadidas: number
  recursosAnadidos: number
  versionCatalogo: number
}

/** Orden de los selectores: por el nombre normalizado, que no depende de la configuración regional (§6.6). */
function porNombre(a: { nombre: string }, b: { nombre: string }): number {
  const nombreA = normalizarNombre(a.nombre)
  const nombreB = normalizarNombre(b.nombre)
  if (nombreA < nombreB) {
    return -1
  }
  if (nombreA > nombreB) {
    return 1
  }
  return 0
}

/**
 * Inserta por id lo que falte del catálogo de fábrica y refresca protegida/protegido; nunca toca nombre, grupo,
 * plural, unidades ni borrada, para que un renombrado o un borrado del jugador sobrevivan (§6.6).
 */
export async function sembrarCatalogo(db: BaseDeDatos): Promise<ResumenSiembra> {
  return db.transaction('rw', db.opcionesCatalogo, db.recursosCatalogo, db.ajustes, async () => {
    const opcionesGuardadas = await db.opcionesCatalogo.bulkGet(OPCIONES_INICIALES.map((opcion) => opcion.id))
    const opcionesNuevas = OPCIONES_INICIALES.filter((_, i) => opcionesGuardadas[i] === undefined)
    const idsDeOpciones = OPCIONES_INICIALES.filter((_, i) => opcionesGuardadas[i] !== undefined).map(
      (opcion) => opcion.id,
    )
    if (opcionesNuevas.length > 0) {
      await db.opcionesCatalogo.bulkAdd(opcionesNuevas)
    }
    if (idsDeOpciones.length > 0) {
      const protegidaDeFabrica = new Map<Id, boolean>(
        OPCIONES_INICIALES.map((opcion) => [opcion.id, opcion.protegida === true]),
      )
      await db.opcionesCatalogo
        .where('id')
        .anyOf(idsDeOpciones)
        .modify((opcion) => {
          opcion.protegida = protegidaDeFabrica.get(opcion.id) === true
        })
    }

    const recursosGuardados = await db.recursosCatalogo.bulkGet(RECURSOS_INICIALES.map((recurso) => recurso.id))
    const recursosNuevos = RECURSOS_INICIALES.filter((_, i) => recursosGuardados[i] === undefined)
    const idsDeRecursos = RECURSOS_INICIALES.filter((_, i) => recursosGuardados[i] !== undefined).map(
      (recurso) => recurso.id,
    )
    if (recursosNuevos.length > 0) {
      await db.recursosCatalogo.bulkAdd(recursosNuevos)
    }
    if (idsDeRecursos.length > 0) {
      const protegidoDeFabrica = new Map<Id, RecursoCatalogo['protegido']>(
        RECURSOS_INICIALES.map((recurso) => [recurso.id, recurso.protegido]),
      )
      await db.recursosCatalogo
        .where('id')
        .anyOf(idsDeRecursos)
        .modify((recurso) => {
          recurso.protegido = protegidoDeFabrica.get(recurso.id)
        })
    }

    await guardarAjuste(db, 'versionCatalogo', VERSION_CATALOGO)
    return {
      opcionesAnadidas: opcionesNuevas.length,
      recursosAnadidos: recursosNuevos.length,
      versionCatalogo: VERSION_CATALOGO,
    }
  })
}

/** Las opciones no borradas de una lista, ordenadas por nombre: lo que ven los selectores y P7 (§6.5). */
export async function leerOpciones(db: BaseDeDatos, lista: ListaCatalogo): Promise<OpcionCatalogo[]> {
  const opciones = await db.opcionesCatalogo.where('lista').equals(lista).toArray()
  return opciones.filter((opcion) => !opcion.borrada).sort(porNombre)
}

/** Los recursos no borrados, ordenados por nombre (§6.5 n.º 18). */
export async function leerRecursos(db: BaseDeDatos): Promise<RecursoCatalogo[]> {
  const recursos = await db.recursosCatalogo.toArray()
  return recursos.filter((recurso) => !recurso.borrada).sort(porNombre)
}

/** El catálogo entero, también lo borrado: lo que necesitan la fusión al importar y la resolución de ids. */
export async function leerCatalogo(db: BaseDeDatos): Promise<CatalogoApp> {
  const opciones = await db.opcionesCatalogo.toArray()
  const recursos = await db.recursosCatalogo.toArray()
  return { opciones, recursos }
}

/** Escribe altas y reactivaciones del catálogo; la usa la importación dentro de su transacción (decisión 7). */
export async function escribirCatalogo(db: BaseDeDatos, cambios: CambiosCatalogo): Promise<void> {
  await db.transaction('rw', db.opcionesCatalogo, db.recursosCatalogo, async () => {
    if (cambios.opcionesNuevas.length > 0) {
      await db.opcionesCatalogo.bulkPut(cambios.opcionesNuevas)
    }
    if (cambios.recursosNuevos.length > 0) {
      await db.recursosCatalogo.bulkPut(cambios.recursosNuevos)
    }
    if (cambios.opcionesReactivadas.length > 0) {
      await db.opcionesCatalogo
        .where('id')
        .anyOf(cambios.opcionesReactivadas)
        .modify((opcion) => {
          opcion.borrada = false
        })
    }
    if (cambios.recursosReactivados.length > 0) {
      await db.recursosCatalogo
        .where('id')
        .anyOf(cambios.recursosReactivados)
        .modify((recurso) => {
          recurso.borrada = false
        })
    }
  })
}
