import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import type { Obra } from '../modelo/asentamiento'
import type { Caravana } from '../modelo/comercio'
import { finDeObra, progresoDeCaravana, progresoDeObra, vueltaDeCaravana } from './progreso'

function f(anio: number, mes: number, dia: number): Fecha {
  return { anio, mes, dia }
}

describe('finDeObra', () => {
  it('inicio + diasTotales − 1: la puerta (6 abril, 12 días), el granero (10 abril, 40 días) y el molino de Archet (20 marzo, 40 días)', () => {
    expect(finDeObra({ inicio: f(1640, 4, 6), diasTotales: 12 })).toEqual(f(1640, 4, 17))
    expect(finDeObra({ inicio: f(1640, 4, 10), diasTotales: 40 })).toEqual(f(1640, 5, 19))
    expect(finDeObra({ inicio: f(1640, 3, 20), diasTotales: 40 })).toEqual(f(1640, 4, 28))
  })

  it('una obra planificada, sin inicio, no tiene fin', () => {
    expect(finDeObra({ inicio: undefined, diasTotales: 20 })).toBeNull()
  })
})

describe('progresoDeObra', () => {
  it('la puerta del sur: «Día 7 de 12 · quedan 5 días», 58 % el 12 de abril', () => {
    const obra: Pick<Obra, 'estado' | 'inicio' | 'diasTotales'> = {
      estado: 'enCurso',
      inicio: f(1640, 4, 6),
      diasTotales: 12,
    }
    expect(progresoDeObra(obra, f(1640, 4, 12))).toEqual({ dia: 7, dias: 12, quedan: 5, pct: 58 })
  })

  it('el granero: 8 % el 12 de abril y 25 % el 19 de abril (O2)', () => {
    const obra: Pick<Obra, 'estado' | 'inicio' | 'diasTotales'> = {
      estado: 'enCurso',
      inicio: f(1640, 4, 10),
      diasTotales: 40,
    }
    expect(progresoDeObra(obra, f(1640, 4, 12)).pct).toBe(8)
    expect(progresoDeObra(obra, f(1640, 4, 19)).pct).toBe(25)
  })

  it('el molino de Archet: 60 % el 12 de abril y 78 % el 19 de abril (O2)', () => {
    const obra: Pick<Obra, 'estado' | 'inicio' | 'diasTotales'> = {
      estado: 'enCurso',
      inicio: f(1640, 3, 20),
      diasTotales: 40,
    }
    expect(progresoDeObra(obra, f(1640, 4, 12)).pct).toBe(60)
    expect(progresoDeObra(obra, f(1640, 4, 19)).pct).toBe(78)
  })

  it('una obra planificada da día 0 y 0 %', () => {
    const obra: Pick<Obra, 'estado' | 'inicio' | 'diasTotales'> = { estado: 'planificada', diasTotales: 20 }
    expect(progresoDeObra(obra, f(1640, 4, 12))).toEqual({ dia: 0, dias: 20, quedan: 20, pct: 0 })
  })

  it('una obra terminada da el total de días y 100 %, aunque hoy sea mucho después del fin', () => {
    const obra: Pick<Obra, 'estado' | 'inicio' | 'diasTotales'> = {
      estado: 'terminada',
      inicio: f(1640, 4, 6),
      diasTotales: 12,
    }
    expect(progresoDeObra(obra, f(1640, 4, 30))).toEqual({ dia: 12, dias: 12, quedan: 0, pct: 100 })
  })
})

describe('vueltaDeCaravana', () => {
  it('una compra o una venta van y vuelven: salida + 2 × días de viaje (Fornost, 4 días, del 10 al 18)', () => {
    expect(vueltaDeCaravana(f(1640, 4, 10), 4, 'venta')).toEqual(f(1640, 4, 18))
    expect(vueltaDeCaravana(f(1640, 4, 1), 12, 'compra')).toEqual(f(1640, 4, 25))
  })

  it('un traslado solo va una vez: salida + días de viaje, sin doblar', () => {
    expect(vueltaDeCaravana(f(1640, 4, 10), 3, 'traslado')).toEqual(f(1640, 4, 13))
  })

  it('el mercado local, con 0 días de viaje, vuelve el mismo día', () => {
    expect(vueltaDeCaravana(f(1640, 4, 12), 0, 'compra')).toEqual(f(1640, 4, 12))
  })
})

describe('progresoDeCaravana', () => {
  it('la venta de Fornost (10 al 18) y la compra de Tharbad (1 al 25) del ejemplo: 25 % y 46 % el 12 de abril', () => {
    const fornost: Pick<Caravana, 'salida' | 'vuelta'> = { salida: f(1640, 4, 10), vuelta: f(1640, 4, 18) }
    const tharbad: Pick<Caravana, 'salida' | 'vuelta'> = { salida: f(1640, 4, 1), vuelta: f(1640, 4, 25) }
    expect(progresoDeCaravana(fornost, f(1640, 4, 12))).toBe(25)
    expect(progresoDeCaravana(tharbad, f(1640, 4, 12))).toBe(46)
  })

  it('con 0 días de viaje (mercado local): 0 % antes de salir y 100 % desde que sale', () => {
    const local: Pick<Caravana, 'salida' | 'vuelta'> = { salida: f(1640, 4, 12), vuelta: f(1640, 4, 12) }
    expect(progresoDeCaravana(local, f(1640, 4, 11))).toBe(0)
    expect(progresoDeCaravana(local, f(1640, 4, 12))).toBe(100)
    expect(progresoDeCaravana(local, f(1640, 4, 13))).toBe(100)
  })
})
