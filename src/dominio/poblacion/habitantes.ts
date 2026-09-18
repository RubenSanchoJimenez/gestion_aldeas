import { compararFechas, type Fecha } from '../calendario/fecha'
import type { Poblacion } from '../modelo/almacen'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'

/**
 * Habitantes de un día: iniciales + cambios con fecha hasta ese día incluido, nunca menos de 0 (§7, técnica 33).
 * Un cambio del mismo día ya cuenta: el paso 2 del motor (población) va antes que el 8 (cobros), §9.
 */
export function habitantesEl(poblacion: Poblacion, dia: Fecha): number {
  const habitantes = poblacion.cambios.reduce(
    (total, cambio) => (compararFechas(cambio.fecha, dia) <= 0 ? total + cambio.delta : total),
    poblacion.habitantesIniciales,
  )
  return Math.max(0, habitantes)
}

/** Habitantes de un asentamiento un día; 0 si no tiene población («habitantes el día del cobro», §6.5 n.º 26). */
export function habitantesDe(estado: EstadoPartida, dominioId: Id, dia: Fecha): number {
  const poblacion = estado.poblaciones.find((p) => p.dominioId === dominioId)
  return poblacion === undefined ? 0 : habitantesEl(poblacion, dia)
}
