import * as z from 'zod'
import { compararFechas } from '../calendario/fecha'
import {
  EsquemaEdad,
  EsquemaEquivalencias,
  EsquemaFecha,
  EsquemaId,
  EsquemaInstante,
  EsquemaNombreLibre,
  exige,
} from './comunes'

/** Versión del formato del documento y de la copia (§6.1). El formato 1 ya usa Hechizo, TipoLocal y LocalComercial. */
export const VERSION_FORMATO = 1

/** Cabecera de la partida (§8). Va en la raíz del documento; la clave de Dexie es `partida.id` (decisión 6). */
export const EsquemaPartida = z
  .object({
    id: EsquemaId,
    nombre: EsquemaNombreLibre,
    edad: EsquemaEdad,
    equivalencias: EsquemaEquivalencias,
    kgPorSaco: z.literal(30),
    diasPorSaco: z.literal(30),
    fechaInicial: EsquemaFecha,
    fechaActual: EsquemaFecha,
    creada: EsquemaInstante,
    actualizada: EsquemaInstante,
    versionFormato: z.literal(VERSION_FORMATO),
    cambiosDesdeUltimoAvance: z.int().min(0),
  })
  .check(
    exige(
      (p) => compararFechas(p.fechaActual, p.fechaInicial) >= 0,
      'La fecha actual no puede ser anterior a la fecha inicial',
    ),
  )
export type Partida = z.infer<typeof EsquemaPartida>

/** true si la partida ya tuvo algún avance: solo un avance mueve fechaActual (§4, §6.1). */
export function hayAvances(partida: Partida): boolean {
  return compararFechas(partida.fechaActual, partida.fechaInicial) !== 0
}
