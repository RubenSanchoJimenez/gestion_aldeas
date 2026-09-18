import type { Id, Instante } from '../dominio/modelo/comunes'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import { resumenDePartida, type ResumenPartida } from '../dominio/modelo/resumen'
import type { BaseDeDatos } from './baseDeDatos'

/** Dexie lanza un error con nombre ConstraintError cuando `add` choca con una clave que ya existe. */
function esClaveRepetida(error: unknown): boolean {
  return error instanceof Error && error.name === 'ConstraintError'
}

/** Resúmenes de P0, de la sesión más reciente a la más antigua (§6.1, «última sesión»). */
export async function listarPartidas(db: BaseDeDatos): Promise<ResumenPartida[]> {
  return db.resumenes.orderBy('abiertaEl').reverse().toArray()
}

/** La última partida usada, la de abiertaEl más reciente, o undefined si no hay ninguna (§5, decisión 9). */
export async function ultimaPartidaUsada(db: BaseDeDatos): Promise<ResumenPartida | undefined> {
  return db.resumenes.orderBy('abiertaEl').last()
}

/** Guarda un documento nuevo y su resumen en una transacción; lanza si ya hay una partida con ese id (§6.1). */
export async function crearPartida(
  db: BaseDeDatos,
  documento: DocumentoPartida,
  ahora: Instante,
): Promise<ResumenPartida> {
  const resumen = resumenDePartida(documento, { abiertaEl: ahora })
  try {
    await db.transaction('rw', db.partidas, db.resumenes, async () => {
      await db.partidas.add(documento)
      await db.resumenes.add(resumen)
    })
  } catch (error) {
    if (esClaveRepetida(error)) {
      throw new Error(`Ya hay una partida con el id «${documento.partida.id}»`, { cause: error })
    }
    throw error
  }
  return resumen
}

/** Lee el documento y anota la sesión (abiertaEl = ahora, que no toca el estado); undefined si no existe (decisión 9). */
export async function abrirPartida(
  db: BaseDeDatos,
  id: Id,
  ahora: Instante,
): Promise<DocumentoPartida | undefined> {
  return db.transaction('rw', db.partidas, db.resumenes, async () => {
    const documento = await db.partidas.get(id)
    if (documento === undefined) {
      return undefined
    }
    await db.resumenes.update(id, { abiertaEl: ahora })
    return documento
  })
}

/** Lee el documento sin anotar la sesión, para exportar o comprobar; undefined si no existe. */
export async function leerPartida(db: BaseDeDatos, id: Id): Promise<DocumentoPartida | undefined> {
  return db.partidas.get(id)
}

/** Reemplaza el documento y su resumen con actualizada = ahora, y devuelve el documento tal como quedó guardado. */
export async function guardarPartida(
  db: BaseDeDatos,
  documento: DocumentoPartida,
  ahora: Instante,
): Promise<DocumentoPartida> {
  const guardado: DocumentoPartida = { ...documento, partida: { ...documento.partida, actualizada: ahora } }
  await db.transaction('rw', db.partidas, db.resumenes, async () => {
    const anterior = await db.resumenes.get(guardado.partida.id)
    await db.partidas.put(guardado)
    await db.resumenes.put(
      resumenDePartida(guardado, { abiertaEl: anterior?.abiertaEl ?? ahora, exportadaEl: anterior?.exportadaEl }),
    )
  })
  return guardado
}

/** Borra el documento y su resumen en una transacción; no falla si no existe (§6.1, «Eliminar partida»). */
export async function borrarPartida(db: BaseDeDatos, id: Id): Promise<void> {
  await db.transaction('rw', db.partidas, db.resumenes, async () => {
    await db.partidas.delete(id)
    await db.resumenes.delete(id)
  })
}
