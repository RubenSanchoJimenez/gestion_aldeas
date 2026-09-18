import { describe, expect, it } from 'vitest'
import { compararFechas } from '../calendario/fecha'
import { saldoDeCaja } from '../dinero/saldo'
import { EsquemaAvance, EsquemaEstadoPartida } from '../modelo/documento'
import { AVANCES, SNAPSHOT_10_ABRIL } from './avances'
import { CAJAS_ASENTAMIENTOS, MOVIMIENTOS_ARCHET, MOVIMIENTOS_BREE } from './asentamientosDinero'
import { AVANCE, DOM, MOV_BREE, MOV_THARAN } from './ids'
import { CAJA_THARAN, MOVIMIENTOS_THARAN, PARTIDA } from './partidaYPersonaje'

describe('los cuatro avances', () => {
  it('van de la fecha inicial a la fecha actual, en orden y sin solaparse (decisión 5, §4.4)', () => {
    expect(AVANCES).toHaveLength(4)
    expect(AVANCES.map((a) => a.id)).toEqual([
      AVANCE.hasta31Marzo,
      AVANCE.hasta6Abril,
      AVANCE.hasta10Abril,
      AVANCE.hasta12Abril,
    ])
    expect(AVANCES[0].desde).toEqual(PARTIDA.fechaInicial)
    expect(AVANCES[3].hasta).toEqual(PARTIDA.fechaActual)
    for (const avance of AVANCES) {
      expect(EsquemaAvance.safeParse(avance).success).toBe(true)
      expect(compararFechas(avance.desde, avance.hasta)).toBeLessThan(0)
    }
    for (let i = 1; i < AVANCES.length; i += 1) {
      expect(compararFechas(AVANCES[i - 1].hasta, AVANCES[i].desde)).toBeLessThanOrEqual(0)
      expect(AVANCES[i - 1].aplicadoEl <= AVANCES[i].aplicadoEl).toBe(true)
    }
    expect(AVANCES.map((a) => `${a.hasta.dia}/${a.hasta.mes}`)).toEqual(['31/3', '6/4', '10/4', '12/4'])
  })

  it('solo el último guarda snapshotPrevio, y es el estado del 10 de abril (decisión 4)', () => {
    expect(AVANCES.filter((a) => a.snapshotPrevio !== undefined)).toHaveLength(1)
    expect(AVANCES[3].snapshotPrevio).toBe(SNAPSHOT_10_ABRIL)
    expect(EsquemaEstadoPartida.safeParse(SNAPSHOT_10_ABRIL).success).toBe(true)
    expect(Object.keys(SNAPSHOT_10_ABRIL)).toHaveLength(34)
    expect(Object.keys(SNAPSHOT_10_ABRIL)).not.toContain('avances')
    expect(SNAPSHOT_10_ABRIL.partida.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 10 })
    expect(SNAPSHOT_10_ABRIL.partida.cambiosDesdeUltimoAvance).toBe(3)
  })

  it('los saldos «antes» y «después» de cada avance cuadran con el libro (§P5)', () => {
    const ultimo = AVANCES[3]
    const saldos = ultimo.cambios.filter((c) => c.tipo === 'saldo')
    expect(saldos).toHaveLength(3)
    const todos = [...MOVIMIENTOS_THARAN, ...MOVIMIENTOS_BREE, ...MOVIMIENTOS_ARCHET]
    expect(saldos.find((c) => c.tipo === 'saldo' && c.dominioId === DOM.tharan)).toMatchObject({
      antes: 4675800,
      despues: saldoDeCaja(CAJA_THARAN, todos),
      movimientos: 2,
    })
    expect(saldos.find((c) => c.tipo === 'saldo' && c.dominioId === DOM.bree)).toMatchObject({
      antes: 34000000,
      despues: saldoDeCaja(CAJAS_ASENTAMIENTOS[0], todos),
      movimientos: 1,
    })
    expect(saldos.find((c) => c.tipo === 'saldo' && c.dominioId === DOM.archet)).toMatchObject({
      antes: 8500000,
      despues: saldoDeCaja(CAJAS_ASENTAMIENTOS[1], todos),
      movimientos: 0,
    })
    expect(ultimo.avisos).toEqual([
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 23 de abril',
      },
    ])
  })

  it('el snapshot no tiene los tres movimientos del último avance y su almacén es el del 10 (decisión 4)', () => {
    expect(SNAPSHOT_10_ABRIL.movimientos).toHaveLength(26)
    const ids = SNAPSHOT_10_ABRIL.movimientos.map((m) => m.id)
    expect(ids).not.toContain(MOV_THARAN.posada12Abril)
    expect(ids).not.toContain(MOV_THARAN.establo12Abril)
    expect(ids).not.toContain(MOV_BREE.peaje12Abril)
    expect(saldoDeCaja(CAJA_THARAN, SNAPSHOT_10_ABRIL.movimientos)).toBe(4675800)
    expect(saldoDeCaja(CAJAS_ASENTAMIENTOS[0], SNAPSHOT_10_ABRIL.movimientos)).toBe(34000000)
    const viveresDeBree = SNAPSHOT_10_ABRIL.existencias[0]
    expect(viveresDeBree.cantidad).toBeCloseTo(392.6667, 4)
    expect(SNAPSHOT_10_ABRIL.existencias[7].cantidad).toBeCloseTo(920.6667, 4)
    expect(SNAPSHOT_10_ABRIL.edificios[0].producciones[0].acumulado.sumaFactores).toBe(2.4)
  })
})
