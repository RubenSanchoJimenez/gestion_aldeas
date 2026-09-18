import { comoCopia, nombreDeCopia } from '../../dominio/copia/comoCopia'
import {
  fusionarCatalogos,
  lineasDeFusion,
  remapearCatalogos,
  type ResumenFusion,
} from '../../dominio/copia/fusion'
import type { SobreCopia } from '../../dominio/copia/sobre'
import type { Id, Instante } from '../../dominio/modelo/comunes'
import { VERSION_FORMATO } from '../../dominio/modelo/partida'
import { resumenDePartida } from '../../dominio/modelo/resumen'
import type { BaseDeDatos } from '../baseDeDatos'
import { escribirCatalogo, leerCatalogo } from '../catalogos'
import { listarPartidas } from '../repositorio'

/** Desde dónde se importa: P0 añade o pregunta; P6 solo admite copias de la partida abierta (§6.1). */
export type OrigenImportacion = 'selector' | 'ajustes'

/** Qué se hace con la copia. */
export type ModoImportacion = 'nueva' | 'reemplazar' | 'comoCopia'

/** Desde P6, una copia de otra partida no se importa (contrato §3.1: §6.1 no redacta el mensaje). */
const MENSAJE_OTRA_PARTIDA = 'Esta copia es de otra partida'

/** Qué puede hacer la app con esta copia, para plantear la pregunta de P0 o el rechazo de P6. */
export interface DestinoImportacion {
  yaExiste: boolean
  nombreExistente?: string
  modos: ModoImportacion[]
  rechazo?: { motivo: 'otraPartida'; mensaje: string }
}

/** Mira si la partida de la copia ya está guardada y devuelve los modos que se pueden ofrecer (§6.1). */
export async function examinarDestino(
  db: BaseDeDatos,
  copia: SobreCopia,
  origen: OrigenImportacion,
  partidaActualId?: Id,
): Promise<DestinoImportacion> {
  const id = copia.partida.partida.id
  const guardada = await db.resumenes.get(id)
  const yaExiste = guardada !== undefined
  if (origen === 'ajustes') {
    if (id !== partidaActualId) {
      return {
        yaExiste,
        nombreExistente: guardada?.nombre,
        modos: [],
        rechazo: { motivo: 'otraPartida', mensaje: MENSAJE_OTRA_PARTIDA },
      }
    }
    return { yaExiste, nombreExistente: guardada?.nombre, modos: ['reemplazar'] }
  }
  if (yaExiste) {
    return { yaExiste, nombreExistente: guardada?.nombre, modos: ['reemplazar', 'comoCopia'] }
  }
  return { yaExiste, modos: ['nueva'] }
}

/** Lo que hay que pasarle a la importación; nuevoId se inyecta para que el dominio no toque crypto. */
export interface OpcionesImportacion {
  modo: ModoImportacion
  ahora: Instante
  nuevoId: () => Id
  migrada?: boolean
  desdeVersion?: number
}

/** Lo que cuenta la app al terminar de importar (§6.1, «el resumen lo dice»). */
export interface ResumenImportacion {
  partidaId: Id
  nombre: string
  modo: ModoImportacion
  migrada: boolean
  desdeVersion?: number
  fusion: ResumenFusion
  lineas: string[]
}

/** La línea del modo, la de la migración (si la hubo) y las de la fusión, en ese orden (contrato §3.4). */
function lineasDeLaImportacion(nombre: string, opciones: OpcionesImportacion, fusion: ResumenFusion): string[] {
  const lineas: string[] = []
  if (opciones.modo === 'comoCopia') {
    lineas.push(`Se ha importado como copia: «${nombre}».`)
  } else if (opciones.modo === 'reemplazar') {
    lineas.push(`Se ha reemplazado la partida «${nombre}».`)
  } else {
    lineas.push(`Se ha añadido la partida «${nombre}».`)
  }
  if (opciones.migrada === true && opciones.desdeVersion !== undefined) {
    lineas.push(
      `La copia venía en el formato ${opciones.desdeVersion} y se ha actualizado al formato ${VERSION_FORMATO}.`,
    )
  }
  return [...lineas, ...lineasDeFusion(fusion)]
}

/**
 * Fusiona los catálogos, remapea los ids y escribe la partida y el catálogo en una sola transacción (§6.1,
 * decisión 14). La copia llega ya validada por analizarCopia (tarea 15): aquí no se vuelve a validar.
 */
export async function importarCopia(
  db: BaseDeDatos,
  copia: SobreCopia,
  opciones: OpcionesImportacion,
): Promise<ResumenImportacion> {
  const catalogo = await leerCatalogo(db)
  const fusion = fusionarCatalogos(copia.catalogos, catalogo, opciones.nuevoId)
  let documento = remapearCatalogos(copia.partida, fusion.remapeo)
  if (opciones.modo === 'comoCopia') {
    const nombres = (await listarPartidas(db)).map((resumen) => resumen.nombre)
    documento = comoCopia(documento, opciones.nuevoId(), nombreDeCopia(documento.partida.nombre, nombres))
  }
  // El resumen se arma fuera: dentro de la transacción solo pueden ir operaciones de IndexedDB.
  const resumen = resumenDePartida(documento, { abiertaEl: opciones.ahora })
  const guardado = documento
  await db.transaction('rw', db.partidas, db.resumenes, db.opcionesCatalogo, db.recursosCatalogo, async () => {
    await escribirCatalogo(db, fusion.cambios)
    await db.partidas.put(guardado)
    await db.resumenes.put(resumen)
  })
  return {
    partidaId: guardado.partida.id,
    nombre: guardado.partida.nombre,
    modo: opciones.modo,
    migrada: opciones.migrada ?? false,
    desdeVersion: opciones.desdeVersion,
    fusion: fusion.resumen,
    lineas: lineasDeLaImportacion(guardado.partida.nombre, opciones, fusion.resumen),
  }
}
