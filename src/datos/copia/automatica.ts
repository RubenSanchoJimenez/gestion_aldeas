import type { Id, Instante } from '../../dominio/modelo/comunes'
import type { BaseDeDatos } from '../baseDeDatos'
import { prepararCopia } from './exportar'

export type EstadoPermiso = 'granted' | 'denied' | 'prompt'

/** Lo que se usa de un FileSystemFileHandle del navegador. */
export interface ArchivoVinculado {
  readonly name: string
  queryPermission(opciones: { mode: 'readwrite' }): Promise<EstadoPermiso>
  requestPermission(opciones: { mode: 'readwrite' }): Promise<EstadoPermiso>
  createWritable(): Promise<{ write(texto: string): Promise<void>; close(): Promise<void> }>
}

export type EstadoCopia =
  | { tipo: 'sinArchivo' }
  | { tipo: 'alDia'; nombre: string; cuando: Instante }
  | { tipo: 'sinPermiso'; nombre: string }
  | { tipo: 'error'; nombre: string; mensaje: string }

const ESCRIBIR = { mode: 'readwrite' } as const

/** El archivo es de este dispositivo: va en la tabla de ajustes, fuera de la partida y de sus copias. */
const clave = (id: Id): string => `archivoCopia:${id}`

/** Lo elegido en esta sesión; entre sesiones se recupera de IndexedDB, que sabe guardar el archivo elegido. */
const enMemoria = new WeakMap<BaseDeDatos, Map<Id, ArchivoVinculado>>()

function memoria(db: BaseDeDatos): Map<Id, ArchivoVinculado> {
  let mapa = enMemoria.get(db)
  if (mapa === undefined) {
    mapa = new Map()
    enMemoria.set(db, mapa)
  }
  return mapa
}

async function archivoDe(db: BaseDeDatos, id: Id): Promise<ArchivoVinculado | undefined> {
  const recordado = memoria(db).get(id)
  if (recordado !== undefined) {
    return recordado
  }
  const guardado = (await db.ajustes.get(clave(id)))?.valor as ArchivoVinculado | undefined
  if (guardado !== undefined) {
    memoria(db).set(id, guardado)
  }
  return guardado
}

export async function vincularArchivo(db: BaseDeDatos, id: Id, archivo: ArchivoVinculado): Promise<void> {
  memoria(db).set(id, archivo)
  await db.ajustes.put({ clave: clave(id), valor: archivo })
}

export async function desvincularArchivo(db: BaseDeDatos, id: Id): Promise<void> {
  memoria(db).delete(id)
  await db.ajustes.delete(clave(id))
}

/** Vuelve a pedir permiso para escribir. El navegador solo lo muestra tras un toque del usuario. */
export async function permitirArchivo(db: BaseDeDatos, id: Id): Promise<boolean> {
  const archivo = await archivoDe(db, id)
  return archivo !== undefined && (await archivo.requestPermission(ESCRIBIR)) === 'granted'
}

async function escribir(db: BaseDeDatos, id: Id, ahora: Instante): Promise<EstadoCopia> {
  const archivo = await archivoDe(db, id)
  if (archivo === undefined) {
    return { tipo: 'sinArchivo' }
  }
  const nombre = archivo.name
  try {
    if ((await archivo.queryPermission(ESCRIBIR)) !== 'granted') {
      return { tipo: 'sinPermiso', nombre }
    }
    const { texto } = await prepararCopia(db, id, ahora)
    // El navegador escribe aparte y sustituye el archivo al cerrar: un corte no lo deja a medias.
    const salida = await archivo.createWritable()
    await salida.write(texto)
    await salida.close()
    return { tipo: 'alDia', nombre, cuando: ahora }
  } catch (error) {
    return { tipo: 'error', nombre, mensaje: error instanceof Error ? error.message : String(error) }
  }
}

/** Las escrituras van de una en una: la última en pedirse es la que queda en el archivo. */
let cola: Promise<unknown> = Promise.resolve()

export function actualizarCopiaAutomatica(db: BaseDeDatos, id: Id, ahora: Instante): Promise<EstadoCopia> {
  const turno = cola.then(() => escribir(db, id, ahora))
  cola = turno.catch(() => undefined)
  return turno
}
