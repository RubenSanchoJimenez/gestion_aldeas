import { describe, expect, it } from 'vitest'
import { errorDeNombre, textoDominios } from './textos'

describe('errorDeNombre', () => {
  it('vacío o solo espacios da «Escribe un nombre»', () => {
    expect(errorDeNombre('')).toBe('Escribe un nombre')
    expect(errorDeNombre('   ')).toBe('Escribe un nombre')
  })

  it('60 letras es válido', () => {
    expect(errorDeNombre('a'.repeat(60))).toBeNull()
  })

  it('61 letras da el error', () => {
    expect(errorDeNombre('a'.repeat(61))).toBe('El nombre no puede pasar de 60 letras')
  })
})

describe('textoDominios', () => {
  it('con 1 nombre', () => {
    expect(textoDominios(['Aldric'])).toBe('Aldric, sin asentamientos')
  })

  it('con 2 nombres', () => {
    expect(textoDominios(['Tharan', 'Bree'])).toBe('Tharan y Bree')
  })

  it('con 3 nombres', () => {
    expect(textoDominios(['Tharan', 'Bree', 'Archet'])).toBe('Tharan, Bree y Archet')
  })

  it('con ninguno', () => {
    expect(textoDominios([])).toBe('')
  })
})
