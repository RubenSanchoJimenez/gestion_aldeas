import type { Id } from '../dominio/modelo/comunes'
import type { ResumenPartida } from '../dominio/modelo/resumen'
import type { BaseDeDatos } from './baseDeDatos'

/** La fila de P0 de una partida (para «Última copia exportada» en P6 y J2d), o undefined si no existe (§5.10). */
export async function leerResumen(db: BaseDeDatos, id: Id): Promise<ResumenPartida | undefined> {
  return db.resumenes.get(id)
}
