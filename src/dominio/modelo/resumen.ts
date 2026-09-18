import { compararFechas, type Fecha } from '../calendario/fecha'
import type { Edad } from '../calendario/formatoFecha'
import type { Id, Instante } from './comunes'
import type { DocumentoPartida } from './documento'
import type { Dominio, DominioAsentamiento } from './dominios'
import { hayAvances } from './partida'

/** Lo que P0 enseña de cada partida sin cargar el documento, más los datos de esta tablet que no viajan (§6.1). */
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

/** Compara dos cadenas con `<`, sin localeCompare, que depende de la configuración regional (§3.4 del contrato). */
function compararTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Separa los asentamientos del personaje sin perder el tipo de cada uno. */
function esAsentamiento(dominio: Dominio): dominio is DominioAsentamiento {
  return dominio.tipo === 'asentamiento'
}

/** Arma la fila de P0 con el documento y los datos de sesión de esta tablet (§6.1, decisión 9). */
export function resumenDePartida(
  documento: DocumentoPartida,
  sesion: { abiertaEl: Instante; exportadaEl?: Instante },
): ResumenPartida {
  const personaje = documento.dominios.filter((d) => !esAsentamiento(d))
  const asentamientos = documento.dominios
    .filter(esAsentamiento)
    .slice()
    .sort((a, b) => compararFechas(a.alta, b.alta) || compararTexto(a.id, b.id))
  return {
    id: documento.partida.id,
    nombre: documento.partida.nombre,
    edad: documento.partida.edad,
    fechaInicial: documento.partida.fechaInicial,
    fechaActual: documento.partida.fechaActual,
    dominios: [...personaje, ...asentamientos].map((d) => d.nombre),
    creada: documento.partida.creada,
    actualizada: documento.partida.actualizada,
    abiertaEl: sesion.abiertaEl,
    exportadaEl: sesion.exportadaEl,
    hayAvances: hayAvances(documento.partida),
  }
}
