import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Emblema } from './Emblema'
import { Icono } from './Icono'
import { ICONOS } from './trazos'

describe('ICONOS', () => {
  it('tiene 42 claves', () => {
    expect(Object.keys(ICONOS)).toHaveLength(42)
  })
})

describe('Icono', () => {
  it('va oculto a la accesibilidad y con 20 px por defecto', () => {
    const { container } = render(<Icono nombre="casa" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(svg).toHaveAttribute('width', '20')
    expect(svg).toHaveAttribute('height', '20')
  })

  it('aplica tamano y color', () => {
    const { container } = render(<Icono nombre="check" tamano={32} color="red" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '32')
    expect(svg).toHaveAttribute('height', '32')
    expect(svg).toHaveAttribute('stroke', 'red')
  })
})

describe('Emblema', () => {
  it('lleva el círculo relleno', () => {
    const { container } = render(<Emblema tamano={24} />)
    const circulo = container.querySelector('circle')
    expect(circulo).toHaveAttribute('fill', 'var(--oro)')
  })
})
