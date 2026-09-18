import { VERSION_FORMATO } from '../modelo/partida'
import { detalleDeProblemas, problemasDeZod, validarCopia } from '../validacion/coherencia'
import { migrar } from './migraciones'
import { EsquemaSobreCopia, EsquemaVersionDeCopia, type SobreCopia } from './sobre'

/** Por qué se rechaza una copia (§6.1, decisión 14). */
export type MotivoRechazo = 'noEsCopia' | 'versionMasNueva' | 'daniada'

export type ResultadoAnalisis =
  | { ok: true; copia: SobreCopia; migrada: boolean; desdeVersion: number }
  | { ok: false; motivo: MotivoRechazo; mensaje: string; detalle?: string }

/** El archivo no es una copia de esta app: ni es JSON, ni trae la marca y la versión (decisión 14). */
const MENSAJE_NO_ES_COPIA = 'Este archivo no es una copia de Gestión de Aldeas'

/** La copia es de un formato que esta app todavía no conoce (§6.1, literal de la especificación). */
const MENSAJE_VERSION_MAS_NUEVA = 'Esta copia es de una versión más nueva de la app'

/** Falla el esquema, las referencias o las unicidades. La interfaz escribe «La copia está dañada: <detalle>». */
const MENSAJE_DANIADA = 'La copia está dañada'

/** El rechazo de una copia dañada, con su detalle técnico ya formateado. */
function daniada(detalle: string): ResultadoAnalisis {
  return { ok: false, motivo: 'daniada', mensaje: MENSAJE_DANIADA, detalle }
}

/**
 * Lee el texto de un archivo y devuelve la copia validada y migrada, o el motivo del rechazo (§6.1, decisión 14).
 * Los siete pasos van en el orden del contrato (`contrato-datos.md` §2.7) y cada uno corta.
 */
export function analizarCopia(texto: string): ResultadoAnalisis {
  let datos: unknown
  try {
    datos = JSON.parse(texto)
  } catch {
    return { ok: false, motivo: 'noEsCopia', mensaje: MENSAJE_NO_ES_COPIA }
  }

  const version = EsquemaVersionDeCopia.safeParse(datos)
  if (!version.success) {
    return { ok: false, motivo: 'noEsCopia', mensaje: MENSAJE_NO_ES_COPIA }
  }
  const desdeVersion = version.data.versionFormato
  if (desdeVersion > VERSION_FORMATO) {
    return { ok: false, motivo: 'versionMasNueva', mensaje: MENSAJE_VERSION_MAS_NUEVA }
  }

  const migrada = desdeVersion < VERSION_FORMATO
  let contenido: unknown = datos
  if (migrada) {
    try {
      contenido = migrar(datos, desdeVersion)
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se ha podido actualizar la copia'
      return daniada(detalleDeProblemas([{ ruta: 'la copia', mensaje }]))
    }
  }

  // z.object descarta los campos desconocidos: una copia con campos de más se acepta (decisión 14).
  const sobre = EsquemaSobreCopia.safeParse(contenido)
  if (!sobre.success) {
    return daniada(detalleDeProblemas(problemasDeZod(sobre.error)))
  }

  const problemas = validarCopia(sobre.data.partida, sobre.data.catalogos)
  if (problemas.length > 0) {
    return daniada(detalleDeProblemas(problemas))
  }

  return { ok: true, copia: sobre.data, migrada, desdeVersion }
}
