import { describe, expect, it } from 'vitest'
import {
  cabenMas,
  cantidadDeRecurso,
  claveExistencia,
  conEfectoCantidad,
  esCero,
  esUnaUnidad,
  formatearCantidad,
  sacosPorPersonas,
  textoCaben,
  TOLERANCIA,
} from './cantidades'

const SACOS = { unidadSingular: 'saco', unidadPlural: 'sacos' }
const CARRETADAS = { unidadSingular: 'carretada', unidadPlural: 'carretadas' }

describe('TOLERANCIA', () => {
  it('es 1e-6', () => {
    expect(TOLERANCIA).toBe(1e-6)
  })
})

describe('esCero', () => {
  it('dice que sí por debajo de la tolerancia y que no por encima', () => {
    expect(esCero(0)).toBe(true)
    expect(esCero(5e-7)).toBe(true)
    expect(esCero(-5e-7)).toBe(true)
    expect(esCero(2e-6)).toBe(false)
    expect(esCero(0.444)).toBe(false)
  })
})

describe('claveExistencia', () => {
  it('junta dominioId y recursoId con una barra vertical', () => {
    expect(claveExistencia('dominio.bree', 'recurso.viveres')).toBe('dominio.bree|recurso.viveres')
  })
})

describe('conEfectoCantidad', () => {
  it('aplica el % sobre la base, sin bajar de 0', () => {
    expect(conEfectoCantidad(90, -20)).toBeCloseTo(72, 6)
    expect(conEfectoCantidad(90, -150)).toBe(0)
  })
})

describe('formatearCantidad', () => {
  it('en plural, con el punto de los miles: «93 sacos» y «1.149 sacos»', () => {
    expect(formatearCantidad(92.667, SACOS)).toBe('93 sacos')
    expect(formatearCantidad(1148.67, SACOS)).toBe('1.149 sacos')
  })

  it('en singular con exactamente 1: «1 saco»', () => {
    expect(formatearCantidad(1, SACOS)).toBe('1 saco')
  })

  it('«menos de 1 …» cuando no es 0 pero redondea a 0', () => {
    expect(formatearCantidad(0.444, CARRETADAS)).toBe('menos de 1 carretada')
  })

  it('«0 sacos», en plural, cuando la cantidad es 0', () => {
    expect(formatearCantidad(0, SACOS)).toBe('0 sacos')
  })

  it('redondea las mitades hacia arriba: 2,5 → «3 sacos»', () => {
    expect(formatearCantidad(2.5, SACOS)).toBe('3 sacos')
  })
})

describe('cantidadDeRecurso', () => {
  it('formatearCantidad + « de » + el nombre en minúscula inicial', () => {
    expect(cantidadDeRecurso(20, { nombre: 'Cal', unidadSingular: 'carretada', unidadPlural: 'carretadas' })).toBe(
      '20 carretadas de cal',
    )
    expect(cantidadDeRecurso(12, { nombre: 'Víveres', unidadSingular: 'saco', unidadPlural: 'sacos' })).toBe(
      '12 sacos de víveres',
    )
  })
})

describe('esUnaUnidad', () => {
  it('reconoce «1 …» y «menos de 1 …», y descarta el resto', () => {
    expect(esUnaUnidad('1 saco')).toBe(true)
    expect(esUnaUnidad('menos de 1 saco')).toBe(true)
    expect(esUnaUnidad('2 sacos')).toBe(false)
    expect(esUnaUnidad('11 sacos')).toBe(false)
    expect(esUnaUnidad('1.149 sacos')).toBe(false)
  })
})

describe('cabenMas', () => {
  it('con capacidad: lo que queda hacia abajo', () => {
    expect(cabenMas({ cantidad: 51.333, capacidad: 1200 })).toBe(1148)
  })

  it('sin capacidad: null', () => {
    expect(cabenMas({ cantidad: 51.333, capacidad: undefined })).toBeNull()
  })
})

describe('textoCaben', () => {
  it('«Caben 890 sacos más» en plural', () => {
    expect(textoCaben(890, SACOS)).toBe('Caben 890 sacos más')
  })

  it('«Cabe 1 saco más» en singular', () => {
    expect(textoCaben(1, SACOS)).toBe('Cabe 1 saco más')
  })

  it('«El almacén está lleno» con 0', () => {
    expect(textoCaben(0, SACOS)).toBe('El almacén está lleno')
  })
})

describe('sacosPorPersonas', () => {
  it('redondea hacia arriba sin arrastrar decimales de la coma flotante', () => {
    expect(sacosPorPersonas(100, 1, 'meses', 30)).toBe(100)
    expect(sacosPorPersonas(7, 1, 'semanas', 30)).toBe(2)
    expect(sacosPorPersonas(1, 1, 'dias', 30)).toBe(1)
  })
})
