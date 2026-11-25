import { describe, expect, it } from 'vitest'
import { buscarEn } from './buscar'

describe('buscarEn', () => {
  it('encuentra una palabra sin la tilde del texto', () => {
    expect(buscarEn('Álamo', 'ala')).toEqual({ inicio: 0, fin: 3 })
  })

  it('busca también en el dato secundario, tras el separador', () => {
    expect(buscarEn('Piedra · 180 carretadas', '180')).toEqual({ inicio: 9, fin: 12 })
  })

  it('no distingue mayúsculas', () => {
    expect(buscarEn('Comida y bebida', 'BEBIDA')).toEqual({ inicio: 9, fin: 15 })
  })

  it('colapsa dos espacios del texto en uno solo de la búsqueda', () => {
    expect(buscarEn('Hobart  Brezal', 'hobart brezal')).toEqual({ inicio: 0, fin: 14 })
  })

  it('la ñ no equivale a la n', () => {
    expect(buscarEn('Señor', 'senor')).toBeNull()
  })

  it('encuentra la ñ tal cual', () => {
    expect(buscarEn('Señor', 'SEÑ')).toEqual({ inicio: 0, fin: 3 })
  })

  it('une una marca diacrítica suelta al carácter anterior (texto ya en NFD)', () => {
    expect(buscarEn('Cafe\u0301 solo', 'cafe')).toEqual({ inicio: 0, fin: 5 })
  })

  it('una búsqueda que queda vacía al normalizarla no encuentra nada', () => {
    expect(buscarEn('cualquiera', '   ')).toBeNull()
  })
})
