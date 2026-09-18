import { describe, expect, it } from 'vitest'
import { esNombreReservado, mismoNombre, NOMBRES_RESERVADOS, normalizarNombre } from './normalizar'

/** Los ejemplos del contrato: entrada y salida esperada. */
const EJEMPLOS: readonly [string, string][] = [
  ['Alojamiento', 'alojamiento'],
  ['  Posada   El  Poney Pisador ', 'posada el poney pisador'],
  ['Canalización', 'canalizacion'],
  ['Torre de vigía', 'torre de vigia'],
  ['Víveres', 'viveres'],
  ['MÜLLER', 'muller'],
  ['Cabaña', 'cabaña'],
  ['Cabana', 'cabana'],
  ['Añil', 'añil'],
  ['Anil', 'anil'],
  ['ALMACÉN DE BREE', 'almacen de bree'],
  ['Gremio de mercaderes de Bree', 'gremio de mercaderes de bree'],
  ['Todas', 'todas'],
]

describe('normalizarNombre', () => {
  it('quita las mayúsculas', () => {
    expect(normalizarNombre('Alojamiento')).toBe('alojamiento')
    expect(normalizarNombre('ALOJAMIENTO')).toBe('alojamiento')
    expect(normalizarNombre('alojamiento')).toBe('alojamiento')
  })

  it('colapsa los espacios repetidos y quita los de los extremos', () => {
    expect(normalizarNombre('  Posada   El  Poney Pisador ')).toBe('posada el poney pisador')
    expect(normalizarNombre('\tAlmacén\nde  Bree ')).toBe('almacen de bree')
    expect(normalizarNombre('   ')).toBe('')
    expect(normalizarNombre('')).toBe('')
  })

  it('quita las tildes y las diéresis', () => {
    expect(normalizarNombre('Canalización')).toBe('canalizacion')
    expect(normalizarNombre('Torre de vigía')).toBe('torre de vigia')
    expect(normalizarNombre('MÜLLER')).toBe('muller')
  })

  it('conserva la ñ, que no equivale a la n', () => {
    expect(normalizarNombre('Cabaña')).toBe('cabaña')
    expect(normalizarNombre('Cabana')).toBe('cabana')
    expect(normalizarNombre('Cabaña')).not.toBe(normalizarNombre('Cabana'))
    expect(normalizarNombre('Añil')).not.toBe(normalizarNombre('Anil'))
  })

  it('da la salida esperada en los trece ejemplos del contrato', () => {
    for (const [entrada, salida] of EJEMPLOS) {
      expect(normalizarNombre(entrada)).toBe(salida)
    }
  })

  it('es idempotente: normalizar lo ya normalizado no cambia nada', () => {
    for (const [entrada, salida] of EJEMPLOS) {
      expect(normalizarNombre(salida)).toBe(salida)
      expect(normalizarNombre(normalizarNombre(entrada))).toBe(salida)
    }
  })

  it('trata igual un nombre tecleado y el mismo nombre descompuesto (NFD)', () => {
    const compuesto = 'Canalización'
    const descompuesto = compuesto.normalize('NFD')
    expect(descompuesto).not.toBe(compuesto)
    expect(normalizarNombre(descompuesto)).toBe('canalizacion')
    expect(normalizarNombre('Cabaña'.normalize('NFD'))).toBe('cabaña')
  })
})

describe('mismoNombre', () => {
  it('dice que sí cuando solo cambian mayúsculas, tildes o espacios', () => {
    expect(mismoNombre('Alojamiento', ' alojamiento ')).toBe(true)
    expect(mismoNombre('Pingüino', 'pinguino')).toBe(true)
    expect(mismoNombre('Posada  El Poney', 'posada el poney')).toBe(true)
  })

  it('dice que no cuando cambia la ñ o el nombre es otro', () => {
    expect(mismoNombre('Año', 'Ano')).toBe(false)
    expect(mismoNombre('Cabaña', 'Cabana')).toBe(false)
    expect(mismoNombre('Alojamiento', 'Alojamientos')).toBe(false)
  })
})

describe('nombres reservados', () => {
  it('guarda los cinco nombres de los filtros, ya normalizados', () => {
    expect(NOMBRES_RESERVADOS).toEqual([
      'todas',
      'todos',
      'todas las categorias',
      'todas las ubicaciones',
      'todos los tipos',
    ])
    for (const reservado of NOMBRES_RESERVADOS) {
      expect(normalizarNombre(reservado)).toBe(reservado)
    }
  })

  it('reconoce el nombre reservado venga como venga, y solo ese', () => {
    expect(esNombreReservado('Todas')).toBe(true)
    expect(esNombreReservado('  TODOS  ')).toBe(true)
    expect(esNombreReservado('Todas las categorías')).toBe(true)
    expect(esNombreReservado('Todas las ubicaciones')).toBe(true)
    expect(esNombreReservado('Todas las posadas')).toBe(false)
    expect(esNombreReservado('Alojamiento')).toBe(false)
  })
})
