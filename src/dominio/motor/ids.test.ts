import { describe, expect, it } from 'vitest'
import { EsquemaId } from '../modelo/comunes'
import { idsEnSerie } from './ids'

describe('idsEnSerie', () => {
  it('da «sim.1», «sim.2», «sim.3»… en orden (T1)', () => {
    const nuevoId = idsEnSerie('sim')
    expect([nuevoId(), nuevoId(), nuevoId()]).toEqual(['sim.1', 'sim.2', 'sim.3'])
  })

  it('cada serie lleva su propio contador y sus ids valen para EsquemaId', () => {
    const sim = idsEnSerie('sim')
    const prev = idsEnSerie('prev')
    const ids = [sim(), sim(), prev(), sim(), prev()]
    expect(ids).toEqual(['sim.1', 'sim.2', 'prev.1', 'sim.3', 'prev.2'])
    for (const id of ids) {
      expect(EsquemaId.safeParse(id).success).toBe(true)
    }
  })
})
