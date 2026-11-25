import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Boton, BotonIcono, Enlace, type VarianteBoton } from './Boton'

const VARIANTES: VarianteBoton[] = ['principal', 'secundario', 'fantasma', 'peligro', 'peligroLleno']

describe('Boton', () => {
  it('da nombre accesible al botón', () => {
    render(<Boton>Crear partida</Boton>)
    expect(screen.getByRole('button', { name: 'Crear partida' })).toBeInTheDocument()
  })

  it('marca cada una de las cinco variantes en data-variante', () => {
    for (const variante of VARIANTES) {
      const { unmount } = render(<Boton variante={variante}>Texto</Boton>)
      expect(screen.getByRole('button')).toHaveAttribute('data-variante', variante)
      unmount()
    }
  })

  it('usa secundario por defecto', () => {
    render(<Boton>Texto</Boton>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variante', 'secundario')
  })

  it('desactivado no llama a alPulsar y lleva disabled', async () => {
    const usuario = userEvent.setup()
    const alPulsar = vi.fn()
    render(
      <Boton desactivado alPulsar={alPulsar}>
        Texto
      </Boton>,
    )
    const boton = screen.getByRole('button')
    expect(boton).toBeDisabled()
    await usuario.click(boton)
    expect(alPulsar).not.toHaveBeenCalled()
  })

  it('acepta tipo submit', () => {
    render(<Boton tipo="submit">Texto</Boton>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})

describe('BotonIcono', () => {
  it('tiene como nombre accesible su etiqueta', () => {
    render(<BotonIcono icono="editar" etiqueta="Editar partida" />)
    expect(screen.getByRole('button', { name: 'Editar partida' })).toBeInTheDocument()
  })
})

describe('Enlace', () => {
  it('llama a alPulsar al tocarlo', async () => {
    const usuario = userEvent.setup()
    const alPulsar = vi.fn()
    render(<Enlace alPulsar={alPulsar}>Editar equivalencias</Enlace>)
    await usuario.click(screen.getByRole('button', { name: 'Editar equivalencias' }))
    expect(alPulsar).toHaveBeenCalledOnce()
  })
})
