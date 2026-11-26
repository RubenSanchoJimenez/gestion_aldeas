import { armarCopia, nombreDeArchivo, serializarCopia, type SobreCopia } from '../../dominio/copia/sobre'
import type { Id, Instante } from '../../dominio/modelo/comunes'
import type { BaseDeDatos } from '../baseDeDatos'
import { leerCatalogo } from '../catalogos'
import { leerPartida } from '../repositorio'

/** El archivo listo para descargar, con su nombre y su texto. */
export interface ArchivoCopia {
  nombre: string
  texto: string
  sobre: SobreCopia
}

/**
 * Lee la partida y el catálogo, arma la copia y anota exportadaEl en el resumen; lanza si la partida no existe
 * (§6.1, P6). Dentro de la transacción solo se lee: armar y serializar se hace fuera (`tecnica.md` §6.2).
 */
export async function exportarCopia(db: BaseDeDatos, id: Id, exportadaEl: Instante): Promise<ArchivoCopia> {
  const leido = await db.transaction('r', db.partidas, db.opcionesCatalogo, db.recursosCatalogo, async () => {
    const documento = await leerPartida(db, id)
    if (documento === undefined) {
      return undefined
    }
    return { documento, catalogo: await leerCatalogo(db) }
  })
  if (leido === undefined) {
    throw new Error(`No hay ninguna partida con el id «${id}»`)
  }
  const sobre = armarCopia(leido.documento, leido.catalogo, exportadaEl)
  const archivo: ArchivoCopia = {
    nombre: nombreDeArchivo(leido.documento.partida, exportadaEl),
    texto: serializarCopia(sobre),
    sobre,
  }
  // Exportar no cambia el estado: solo la fila del resumen, que es de este dispositivo (decisión 9).
  await db.resumenes.update(id, { exportadaEl })
  return archivo
}
