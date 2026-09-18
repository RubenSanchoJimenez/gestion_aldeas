import { aplicarAvance } from '../dominio/avance/aplicar'
import { deshacerUltimoAvance } from '../dominio/avance/deshacer'
import type { Instante } from '../dominio/modelo/comunes'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import type { ResultadoSimulacion } from '../dominio/motor/tipos'
import type { BaseDeDatos } from './baseDeDatos'
import { guardarPartida } from './repositorio'

/**
 * Guarda el avance de la vista previa: aplicarAvance y guardarPartida, que ya escribe documento y resumen en una
 * transacción (§9). Lo puro se calcula antes, fuera de la transacción; si la vista previa ya no vale, lanza y no
 * escribe nada. No pasa por guardarEdicion: aplicar pone el contador a 0 (D-038).
 */
export async function guardarAvance(
  db: BaseDeDatos,
  documento: DocumentoPartida,
  resultado: ResultadoSimulacion,
  ahora: Instante,
): Promise<DocumentoPartida> {
  const aplicado = aplicarAvance(documento, resultado, ahora)
  return guardarPartida(db, aplicado, ahora)
}

/**
 * Deshace el último avance y lo guarda (§9 l.1325-1330). El contador vuelve al de la copia, así que tampoco pasa
 * por guardarEdicion.
 */
export async function deshacerAvanceGuardado(
  db: BaseDeDatos,
  documento: DocumentoPartida,
  ahora: Instante,
): Promise<DocumentoPartida> {
  const deshecho = deshacerUltimoAvance(documento)
  return guardarPartida(db, deshecho, ahora)
}
