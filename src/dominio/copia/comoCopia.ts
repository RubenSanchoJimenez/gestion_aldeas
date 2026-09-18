import type { Id } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { normalizarNombre } from '../texto/normalizar'

/** Lo que admite el nombre de una partida (EsquemaNombreLibre, §8): de 1 a 60 caracteres. */
const LARGO_MAXIMO_NOMBRE = 60

/** Copia el documento con id de partida nuevo y nombre nuevo, también dentro de snapshotPrevio (§6.1). */
export function comoCopia(documento: DocumentoPartida, idNuevo: Id, nombreNuevo: string): DocumentoPartida {
  return {
    ...documento,
    partida: { ...documento.partida, id: idNuevo, nombre: nombreNuevo },
    avances: documento.avances.map((avance) =>
      avance.snapshotPrevio === undefined
        ? avance
        : {
            ...avance,
            snapshotPrevio: {
              ...avance.snapshotPrevio,
              partida: { ...avance.snapshotPrevio.partida, id: idNuevo, nombre: nombreNuevo },
            },
          },
    ),
  }
}

/** El nombre con su sufijo, recortado para que no pase de los 60 caracteres del campo. */
function conSufijo(nombre: string, sufijo: string): string {
  const base = nombre.slice(0, Math.max(1, LARGO_MAXIMO_NOMBRE - sufijo.length)).trimEnd()
  return `${base}${sufijo}`
}

/** «La Sombra del Este» → «La Sombra del Este (copia)», y «(copia 2)», «(copia 3)»… si ya existen. */
export function nombreDeCopia(nombre: string, existentes: readonly string[]): string {
  const tomados = new Set(existentes.map(normalizarNombre))
  let candidato = conSufijo(nombre, ' (copia)')
  let numero = 1
  while (tomados.has(normalizarNombre(candidato))) {
    numero += 1
    candidato = conSufijo(nombre, ` (copia ${numero})`)
  }
  return candidato
}
