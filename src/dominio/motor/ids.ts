import type { NuevoId } from './tipos'

/** Ids en serie, válidos para EsquemaId: idsEnSerie('sim') da «sim.1», «sim.2»… (T1). */
export function idsEnSerie(prefijo: string): NuevoId {
  let ultimo = 0
  return () => {
    ultimo += 1
    return `${prefijo}.${ultimo}`
  }
}
