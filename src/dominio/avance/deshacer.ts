import { estadoDe, type Avance, type DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'

/** El último avance, si guarda su copia: el único que se puede deshacer (D-008). */
function ultimoConCopia(documento: DocumentoPartida): Avance | undefined {
  const ultimo = documento.avances[documento.avances.length - 1]
  return ultimo?.snapshotPrevio === undefined ? undefined : ultimo
}

/** Si el último avance guarda su copia y se puede deshacer (§9 l.1326; D-039). */
export function puedeDeshacer(documento: DocumentoPartida): boolean {
  return ultimoConCopia(documento) !== undefined
}

/** Los cambios que se perderán: «Se perderán 3 cambios hechos después del avance» (§9 l.1327; D-038). */
export function cambiosQueSePerderan(documento: DocumentoPartida): number {
  return documento.partida.cambiosDesdeUltimoAvance
}

/** Restaura la copia del último avance y lo quita de la lista; lanza si no se puede (§9 l.1325-1330). */
export function deshacerUltimoAvance(documento: DocumentoPartida): DocumentoPartida {
  const ultimo = ultimoConCopia(documento)
  if (ultimo?.snapshotPrevio === undefined) {
    throw new Error('No hay ningún avance que deshacer')
  }
  return { ...estadoDe(ultimo.snapshotPrevio), avances: documento.avances.slice(0, -1) }
}

/** El avance que creó o aplicó un movimiento, si es el último y se puede deshacer: para los avisos de J2c y J2d (§9 l.1328-1329). */
export function avanceDelMovimiento(documento: DocumentoPartida, movimiento: Movimiento): Avance | undefined {
  const ultimo = ultimoConCopia(documento)
  return ultimo !== undefined && movimiento.avanceId === ultimo.id ? ultimo : undefined
}
