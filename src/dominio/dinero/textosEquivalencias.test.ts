import { describe, expect, it } from 'vitest'
import { EQUIVALENCIAS_POR_DEFECTO } from './monedas'
import { cadenaDeEquivalencias, equivalenciasDesdeOro } from './textosEquivalencias'

describe('textos de las equivalencias', () => {
  it('cadenaDeEquivalencias encadena las seis, con las equivalencias por defecto', () => {
    expect(cadenaDeEquivalencias(EQUIVALENCIAS_POR_DEFECTO)).toBe(
      '1 mm = 100 mo · 1 mo = 10 mp · 1 mp = 10 mb · 1 mb = 10 mc · 1 mc = 10 me · 1 me = 10 mh',
    )
  })

  it('equivalenciasDesdeOro acumula desde el oro hasta el cobre, con las equivalencias por defecto', () => {
    expect(equivalenciasDesdeOro(EQUIVALENCIAS_POR_DEFECTO)).toBe('1 mo = 10 mp = 100 mb = 1.000 mc')
  })

  it('con moEnMp a 12 cambian las dos cadenas', () => {
    const eq = { ...EQUIVALENCIAS_POR_DEFECTO, moEnMp: 12 }
    expect(equivalenciasDesdeOro(eq)).toBe('1 mo = 12 mp = 120 mb = 1.200 mc')
    expect(cadenaDeEquivalencias(eq)).toBe(
      '1 mm = 100 mo · 1 mo = 12 mp · 1 mp = 10 mb · 1 mb = 10 mc · 1 mc = 10 me · 1 me = 10 mh',
    )
  })

  it('pone el punto de los miles desde 1.000, con mmEnMo a 1000', () => {
    const eq = { ...EQUIVALENCIAS_POR_DEFECTO, mmEnMo: 1000 }
    expect(cadenaDeEquivalencias(eq)).toBe(
      '1 mm = 1.000 mo · 1 mo = 10 mp · 1 mp = 10 mb · 1 mb = 10 mc · 1 mc = 10 me · 1 me = 10 mh',
    )
  })
})
