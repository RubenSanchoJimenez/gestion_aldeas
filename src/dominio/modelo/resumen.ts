import type { Fecha } from '../calendario/fecha'
import type { Edad } from '../calendario/formatoFecha'
import { ordenarDominios } from '../partidas/orden'
import type { Id, Instante } from './comunes'
import type { DocumentoPartida } from './documento'
import { hayAvances } from './partida'

/** Lo que P0 enseña de cada partida sin cargar el documento, más los datos de este dispositivo que no viajan (§6.1). */
export interface ResumenPartida {
  id: Id
  nombre: string
  edad: Edad
  fechaInicial: Fecha
  fechaActual: Fecha
  dominios: string[]
  creada: Instante
  actualizada: Instante
  abiertaEl: Instante
  exportadaEl?: Instante
  hayAvances: boolean
}

/** Arma la fila de P0 con el documento y los datos de sesión de este dispositivo (§6.1, decisión 9). */
export function resumenDePartida(
  documento: DocumentoPartida,
  sesion: { abiertaEl: Instante; exportadaEl?: Instante },
): ResumenPartida {
  return {
    id: documento.partida.id,
    nombre: documento.partida.nombre,
    edad: documento.partida.edad,
    fechaInicial: documento.partida.fechaInicial,
    fechaActual: documento.partida.fechaActual,
    dominios: ordenarDominios(documento.dominios).map((d) => d.nombre),
    creada: documento.partida.creada,
    actualizada: documento.partida.actualizada,
    abiertaEl: sesion.abiertaEl,
    exportadaEl: sesion.exportadaEl,
    hayAvances: hayAvances(documento.partida),
  }
}
