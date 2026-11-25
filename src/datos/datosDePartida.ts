import type { Id, Instante } from '../dominio/modelo/comunes'
import { aplicarDatosDePartida, type DatosDePartida, type ResultadoDatosDePartida } from '../dominio/partidas/datos'
import type { BaseDeDatos } from './baseDeDatos'
import { guardarPartida, leerPartida } from './repositorio'

/**
 * «Editar partida»: lee el documento, aplica los datos (aplicarDatosDePartida) y, si algo cambió, suma 1 a
 * cambiosDesdeUltimoAvance (D-038) y guarda con guardarPartida. Sin cambios no escribe nada. Lanza
 * «No hay ninguna partida con el id «…»» si no existe. Al fusionar la fase 3, la 6b lo reescribe sobre guardarEdicion.
 */
export async function guardarDatosDePartida(
  db: BaseDeDatos,
  id: Id,
  datos: DatosDePartida,
  ahora: Instante,
): Promise<ResultadoDatosDePartida> {
  const documento = await leerPartida(db, id)
  if (documento === undefined) {
    throw new Error(`No hay ninguna partida con el id «${id}»`)
  }
  const resultado = aplicarDatosDePartida(documento, datos)
  if (!resultado.ok || !resultado.cambio) {
    return resultado
  }
  const conContador = {
    ...resultado.documento,
    partida: {
      ...resultado.documento.partida,
      cambiosDesdeUltimoAvance: resultado.documento.partida.cambiosDesdeUltimoAvance + 1,
    },
  }
  const guardado = await guardarPartida(db, conContador, ahora)
  return { ok: true, documento: guardado, cambio: true }
}
