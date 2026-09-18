import { contarCambio } from '../dominio/edicion/registros'
import type { Instante } from '../dominio/modelo/comunes'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import type { BaseDeDatos } from './baseDeDatos'
import { guardarPartida } from './repositorio'

/**
 * Guarda una edición solo si cambió algo (siguiente !== anterior) y la cuenta con contarCambio (regla pendiente 1;
 * D-038). Las funciones de edición devuelven la misma referencia cuando nada cambia, así que «Guardar» sin tocar
 * nada no mueve «última modificación». Un guardado cuenta 1, toque los registros que toque.
 */
export async function guardarEdicion(
  db: BaseDeDatos,
  anterior: DocumentoPartida,
  siguiente: DocumentoPartida,
  ahora: Instante,
): Promise<DocumentoPartida> {
  if (siguiente === anterior) {
    return anterior
  }
  return guardarPartida(db, contarCambio(siguiente), ahora)
}
