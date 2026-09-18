import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Poblacion } from '../modelo/almacen'
import { habitantesDe, habitantesEl } from './habitantes'

/** Atajo para escribir fechas de 1640: dia(12, 4) es el 12 de abril. */
function dia(d: number, m: number): Fecha {
  return { anio: 1640, mes: m, dia: d }
}

/** La población de Bree del ejemplo: 1.214 iniciales, −6 el 14 de febrero, +20 el 2 de marzo y +12 el 1 de abril. */
function poblacionDeBree(): Poblacion {
  const poblacion = documentoDeEjemplo().poblaciones.find((p) => p.dominioId === DOM.bree)
  if (poblacion === undefined) {
    throw new Error('El ejemplo no tiene la población de Bree')
  }
  return poblacion
}

describe('habitantesEl', () => {
  it('Bree tiene 1.240 habitantes el 1 de abril: el cambio de ese mismo día ya cuenta (§7)', () => {
    expect(habitantesEl(poblacionDeBree(), dia(1, 4))).toBe(1240)
    expect(habitantesEl(poblacionDeBree(), dia(12, 4))).toBe(1240)
  })

  it('el 31 de marzo todavía son 1.228, y antes del primer cambio, los 1.214 iniciales', () => {
    expect(habitantesEl(poblacionDeBree(), dia(31, 3))).toBe(1228)
    expect(habitantesEl(poblacionDeBree(), dia(1, 1))).toBe(1214)
  })

  it('nunca baja de 0, aunque los cambios resten más que los iniciales (técnica 33)', () => {
    const poblacion: Poblacion = {
      dominioId: 'dom.aldea',
      habitantesIniciales: 10,
      cambios: [{ id: 'camb.1', fecha: dia(5, 4), delta: -25, motivo: 'Se marchan todos' }],
      consumos: [],
    }
    expect(habitantesEl(poblacion, dia(4, 4))).toBe(10)
    expect(habitantesEl(poblacion, dia(5, 4))).toBe(0)
  })
})

describe('habitantesDe', () => {
  it('busca la población del asentamiento: Bree 1.240 y Archet 310 el 12 de abril', () => {
    const estado = documentoDeEjemplo()
    expect(habitantesDe(estado, DOM.bree, dia(12, 4))).toBe(1240)
    expect(habitantesDe(estado, DOM.archet, dia(12, 4))).toBe(310)
  })

  it('un dominio sin población tiene 0 habitantes: la bolsa de Tharan', () => {
    expect(habitantesDe(documentoDeEjemplo(), DOM.tharan, dia(12, 4))).toBe(0)
  })
})
