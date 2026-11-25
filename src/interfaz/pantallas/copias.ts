import type { BaseDeDatos } from '../../datos/baseDeDatos'
import { examinarDestino, type DestinoImportacion, type OrigenImportacion } from '../../datos/copia/importar'
import { listarPartidas } from '../../datos/repositorio'
import { analizarCopia } from '../../dominio/copia/analizar'
import { nombreDeCopia } from '../../dominio/copia/comoCopia'
import type { SobreCopia } from '../../dominio/copia/sobre'
import type { Id } from '../../dominio/modelo/comunes'

export type Preparacion =
  | { tipo: 'rechazo'; mensaje: string }
  | {
      tipo: 'lista'
      copia: SobreCopia
      migrada: boolean
      desdeVersion: number
      destino: DestinoImportacion
      nombreComoCopia: string
    }

/** Analiza el texto de un archivo y mira qué se puede hacer con él, antes de escribir nada. */
export async function prepararImportacion(
  db: BaseDeDatos,
  texto: string,
  origen: OrigenImportacion,
  partidaActualId?: Id,
): Promise<Preparacion> {
  const analisis = analizarCopia(texto)
  if (!analisis.ok) {
    const detalle = 'detalle' in analisis && analisis.detalle !== undefined ? `: ${analisis.detalle}` : ''
    return { tipo: 'rechazo', mensaje: `${analisis.mensaje}${detalle}` }
  }
  const destino = await examinarDestino(db, analisis.copia, origen, partidaActualId)
  if (destino.rechazo !== undefined) {
    return { tipo: 'rechazo', mensaje: destino.rechazo.mensaje }
  }
  const nombres = (await listarPartidas(db)).map((r) => r.nombre)
  return {
    tipo: 'lista',
    copia: analisis.copia,
    migrada: analisis.migrada,
    desdeVersion: analisis.desdeVersion,
    destino,
    nombreComoCopia: nombreDeCopia(analisis.copia.partida.partida.nombre, nombres),
  }
}
