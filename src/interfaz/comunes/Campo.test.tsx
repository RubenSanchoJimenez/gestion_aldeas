import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CampoTexto } from './Campo'
import { useTocados } from './tocados'

describe('CampoTexto', () => {
  it('la etiqueta da nombre al campo', () => {
    render(<CampoTexto etiqueta="Nombre de la partida" valor="" alCambiar={() => {}} />)
    expect(screen.getByRole('textbox', { name: 'Nombre de la partida' })).toBeInTheDocument()
  })

  it('teclear llama a alCambiar', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<CampoTexto etiqueta="Nombre" valor="" alCambiar={alCambiar} />)
    await usuario.type(screen.getByRole('textbox', { name: 'Nombre' }), 'T')
    expect(alCambiar).toHaveBeenCalledWith('T')
  })

  it('un error da aria-invalid y el mensaje con su icono', () => {
    render(<CampoTexto etiqueta="Nombre" valor="" alCambiar={() => {}} error="Escribe un nombre" />)
    const campo = screen.getByRole('textbox', { name: 'Nombre' })
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    const mensaje = screen.getByText('Escribe un nombre')
    expect(mensaje.closest('p')?.querySelector('svg')).toBeInTheDocument()
  })

  it('maximo pone maxLength', () => {
    render(<CampoTexto etiqueta="Nombre" valor="" alCambiar={() => {}} maximo={60} />)
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveAttribute('maxLength', '60')
  })
})

describe('useTocados', () => {
  /** Un nombre vacío con su error, mostrado solo tras salir del campo: el patrón que usan las pantallas. */
  function CampoDePrueba() {
    const [valor, establecerValor] = useState('')
    const { tocado, tocar } = useTocados<'nombre'>()
    const error = valor.trim() === '' ? 'Escribe un nombre' : null
    return (
      <CampoTexto
        etiqueta="Nombre"
        valor={valor}
        alCambiar={establecerValor}
        alSalir={() => tocar('nombre')}
        error={tocado('nombre') ? error : null}
      />
    )
  }

  it('solo enseña el error tras alSalir', async () => {
    const usuario = userEvent.setup()
    render(<CampoDePrueba />)
    const campo = screen.getByRole('textbox', { name: 'Nombre' })
    expect(screen.queryByText('Escribe un nombre')).not.toBeInTheDocument()

    await usuario.click(campo)
    await usuario.tab()
    expect(screen.getByText('Escribe un nombre')).toBeInTheDocument()
  })
})
