import { VERSION_FORMATO } from '../modelo/partida'

/** Lo que hace una migración: recibe el contenido de un formato y devuelve el del formato siguiente. */
export type Migracion = (datos: unknown) => unknown

/** MIGRACIONES[n] convierte el contenido del formato n al n + 1; el formato 1 es el primero, así que está vacía (§6.1). */
export const MIGRACIONES: Readonly<Record<number, Migracion>> = {}

/** El objeto de un valor desconocido, o undefined si no es un objeto llano: lo que llega de un archivo no tiene tipo. */
function comoObjeto(valor: unknown): Record<string, unknown> | undefined {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : undefined
}

/** Aplica una migración al sobre y, aparte, a cada avances[].snapshotPrevio, que es una partida completa. */
function aplicar(datos: unknown, migracion: Migracion): unknown {
  const migrado = migracion(datos)
  const sobre = comoObjeto(migrado)
  if (sobre === undefined) {
    return migrado
  }
  const documento = comoObjeto(sobre.partida)
  if (documento === undefined || !Array.isArray(documento.avances)) {
    return migrado
  }
  const avances = documento.avances.map((valor) => {
    const avance = comoObjeto(valor)
    if (avance === undefined || avance.snapshotPrevio === undefined) {
      return valor
    }
    return { ...avance, snapshotPrevio: migracion(avance.snapshotPrevio) }
  })
  return { ...sobre, partida: { ...documento, avances } }
}

/** La partida con su versionFormato puesto; vale para la cabecera del documento y para la del snapshot. */
function conVersionDeLaPartida(valor: unknown, version: number): unknown {
  const partida = comoObjeto(valor)
  return partida === undefined ? valor : { ...partida, versionFormato: version }
}

/** El avance con la versionFormato puesta dentro de su snapshotPrevio, si lo lleva. */
function conVersionDelAvance(valor: unknown, version: number): unknown {
  const avance = comoObjeto(valor)
  if (avance === undefined || avance.snapshotPrevio === undefined) {
    return valor
  }
  const snapshot = comoObjeto(avance.snapshotPrevio)
  if (snapshot === undefined) {
    return valor
  }
  return { ...avance, snapshotPrevio: { ...snapshot, partida: conVersionDeLaPartida(snapshot.partida, version) } }
}

/** Pone la versión del formato en los tres sitios donde vive: el sobre, la partida y cada snapshotPrevio (§6.1). */
function conVersionFormato(datos: unknown, version: number): unknown {
  const sobre = comoObjeto(datos)
  if (sobre === undefined) {
    return datos
  }
  const documento = comoObjeto(sobre.partida)
  if (documento === undefined) {
    return { ...sobre, versionFormato: version }
  }
  const avances = Array.isArray(documento.avances)
    ? documento.avances.map((avance) => conVersionDelAvance(avance, version))
    : documento.avances
  return {
    ...sobre,
    versionFormato: version,
    partida: { ...documento, partida: conVersionDeLaPartida(documento.partida, version), avances },
  }
}

/** Aplica en cadena las migraciones desde desdeVersion hasta VERSION_FORMATO, también dentro de snapshotPrevio (§6.1). */
export function migrar(datos: unknown, desdeVersion: number): unknown {
  let contenido = datos
  for (let version = desdeVersion; version < VERSION_FORMATO; version += 1) {
    const migracion = MIGRACIONES[version]
    if (migracion === undefined) {
      throw new Error(`No hay ninguna migración del formato ${version} al ${version + 1}`)
    }
    contenido = aplicar(contenido, migracion)
  }
  return conVersionFormato(contenido, VERSION_FORMATO)
}
