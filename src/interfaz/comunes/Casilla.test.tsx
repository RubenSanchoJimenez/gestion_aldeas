import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Casilla } from './Casilla'

describe('Casilla', () => {
  it('tiene rol checkbox con su nombre', () => {
    render(<Casilla etiqueta="Entiendo que esto no se puede deshacer" marcada={false} alCambiar={() => {}} />)
    expect(screen.getByRole('checkbox', { name: 'Entiendo que esto no se puede deshacer' })).toBeInTheDocument()
  })

  it('tocar cambia el valor', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<Casilla etiqueta="Casilla" marcada={false} alCambiar={alCambiar} />)
    await usuario.click(screen.getByRole('checkbox', { name: 'Casilla' }))
    expect(alCambiar).toHaveBeenCalledWith(true)
  })

  it('desactivada no cambia', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<Casilla etiqueta="Casilla" marcada={false} alCambiar={alCambiar} desactivada />)
    const casilla = screen.getByRole('checkbox', { name: 'Casilla' })
    expect(casilla).toBeDisabled()
    await usuario.click(casilla)
    expect(alCambiar).not.toHaveBeenCalled()
  })
})
