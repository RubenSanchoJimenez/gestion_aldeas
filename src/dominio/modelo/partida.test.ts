import { describe, expect, it } from 'vitest'
import { EsquemaPartida, VERSION_FORMATO, hayAvances, type Partida } from './partida'

/** La cabecera de «La Sombra del Este» el 12 de abril de 1640 T.E., que usan todas las vistas. */
const SOMBRA_DEL_ESTE: Partida = {
  id: 'p.sombra-del-este',
  nombre: 'La Sombra del Este',
  edad: 'tercera',
  equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
  kgPorSaco: 30,
  diasPorSaco: 30,
  fechaInicial: { anio: 1640, mes: 1, dia: 1 },
  fechaActual: { anio: 1640, mes: 4, dia: 12 },
  creada: '2026-09-15T10:00:00.000Z',
  actualizada: '2026-09-17T18:30:00.000Z',
  versionFormato: VERSION_FORMATO,
  cambiosDesdeUltimoAvance: 0,
}

describe('EsquemaPartida', () => {
  it('acepta la cabecera de la partida de ejemplo', () => {
    expect(VERSION_FORMATO).toBe(1)
    expect(EsquemaPartida.parse(SOMBRA_DEL_ESTE)).toEqual(SOMBRA_DEL_ESTE)
  })

  it('rechaza las fechas y los literales que no cuadran', () => {
    const alReves = EsquemaPartida.safeParse({
      ...SOMBRA_DEL_ESTE,
      fechaActual: { anio: 1639, mes: 12, dia: 31 },
    })
    expect(alReves.success).toBe(false)
    expect(alReves.error?.issues.map((i) => i.message)).toEqual([
      'La fecha actual no puede ser anterior a la fecha inicial',
    ])

    const imposible = EsquemaPartida.safeParse({
      ...SOMBRA_DEL_ESTE,
      fechaInicial: { anio: 1641, mes: 2, dia: 29 },
    })
    expect(imposible.success).toBe(false)
    expect(imposible.error?.issues.map((i) => i.message)).toContain('Febrero de 1641 tiene 28 días')

    expect(EsquemaPartida.safeParse({ ...SOMBRA_DEL_ESTE, kgPorSaco: 25 }).success).toBe(false)
    expect(EsquemaPartida.safeParse({ ...SOMBRA_DEL_ESTE, diasPorSaco: 45 }).success).toBe(false)
    expect(EsquemaPartida.safeParse({ ...SOMBRA_DEL_ESTE, versionFormato: 2 }).success).toBe(false)
    expect(EsquemaPartida.safeParse({ ...SOMBRA_DEL_ESTE, cambiosDesdeUltimoAvance: -1 }).success).toBe(false)
  })
})

describe('hayAvances', () => {
  it('es false en una partida recién creada y true cuando la fecha actual ya se ha movido', () => {
    expect(hayAvances({ ...SOMBRA_DEL_ESTE, fechaActual: { anio: 1640, mes: 1, dia: 1 } })).toBe(false)
    expect(hayAvances(SOMBRA_DEL_ESTE)).toBe(true)
  })
})
