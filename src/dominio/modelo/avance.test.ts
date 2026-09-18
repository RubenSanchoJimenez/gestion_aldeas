import { describe, expect, it } from 'vitest'
import {
  EsquemaAvanceRegistrado,
  EsquemaAvisoAvance,
  EsquemaCambioAvance,
  EsquemaTipoAviso,
  type AvanceRegistrado,
} from './avance'

/** El último avance del ejemplo: del 10 al 12 de abril de 1640 (P5). */
const DEL_10_AL_12: AvanceRegistrado = {
  id: 'av.10-12abr',
  desde: { anio: 1640, mes: 4, dia: 10 },
  hasta: { anio: 1640, mes: 4, dia: 12 },
  aplicadoEl: '2026-09-17T18:30:00.000Z',
  cambios: [
    { tipo: 'saldo', dominioId: 'dom.bree', antes: 34000000, despues: 34060000, movimientos: 1 },
    { tipo: 'almacen', dominioId: 'dom.bree', recursoId: 'recurso.viveres', antes: 920, despues: 890 },
    { tipo: 'hecho', dominioId: 'dom.bree', texto: 'Feria de primavera celebrada · 15 al 17' },
  ],
  avisos: [{ tipo: 'faltaPrevista', color: 'ambar', dominioId: 'dom.bree', texto: 'Víveres para 11 días' }],
}

describe('EsquemaAvanceRegistrado', () => {
  it('acepta el avance del 10 al 12 de abril con sus cambios y sus avisos', () => {
    expect(EsquemaAvanceRegistrado.parse(DEL_10_AL_12)).toEqual(DEL_10_AL_12)
    expect(EsquemaAvanceRegistrado.parse({ ...DEL_10_AL_12, snapshotPrevio: { partida: {} } })).toEqual(DEL_10_AL_12)
    expect(EsquemaAvanceRegistrado.safeParse({ ...DEL_10_AL_12, aplicadoEl: '17/09/2026' }).success).toBe(false)
  })

  it('tipa los tres cambios de P5 y los doce avisos de la tabla de §9', () => {
    expect(EsquemaTipoAviso.options).toEqual([
      'faltaDeRecurso',
      'faltaPrevista',
      'impago',
      'deudaVencida',
      'deudaQueVence',
      'pagoNoCubierto',
      'saldoNegativo',
      'obraQueNoPudoEmpezar',
      'caravanaQueNoPudoSalir',
      'edificioTerminadoSinProduccion',
      'mejoraTerminada',
      'recursoPerdido',
    ])
    for (const cambio of DEL_10_AL_12.cambios) {
      expect(EsquemaCambioAvance.parse(cambio)).toEqual(cambio)
    }
    expect(EsquemaCambioAvance.safeParse({ tipo: 'poblacion', dominioId: 'dom.bree', antes: 1, despues: 2 }).success).toBe(
      false,
    )
    expect(EsquemaCambioAvance.safeParse({ tipo: 'hecho', texto: 'Sin dominio' }).success).toBe(true)
    expect(EsquemaCambioAvance.safeParse({ tipo: 'hecho', texto: '' }).success).toBe(false)

    const rojo = { tipo: 'saldoNegativo' as const, color: 'rojo' as const, texto: 'La caja de Archet se ha quedado a 0' }
    expect(EsquemaAvisoAvance.parse(rojo)).toEqual(rojo)
    expect(EsquemaAvisoAvance.safeParse({ ...rojo, color: 'verde' }).success).toBe(false)
  })
})
