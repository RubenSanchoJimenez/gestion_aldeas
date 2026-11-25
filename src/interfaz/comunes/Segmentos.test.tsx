import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Segmentos, type OpcionSegmento } from './Segmentos'

const OPCIONES: readonly OpcionSegmento<'dia' | 'semana' | 'mes'>[] = [
  { valor: 'dia', texto: 'Día' },
  { valor: 'semana', texto: 'Semana' },
  { valor: 'mes', texto: 'Mes' },
]

describe('Segmentos', () => {
  it('es un radiogroup con el nombre de su etiqueta (§6.7)', () => {
    render(<Segmentos etiqueta="Vista" opciones={OPCIONES} valor="dia" alCambiar={vi.fn()} />)
    expect(screen.getByRole('radiogroup', { name: 'Vista' })).toBeInTheDocument()
  })

  it('la opción activa está checked y las demás no', () => {
    render(<Segmentos etiqueta="Vista" opciones={OPCIONES} valor="semana" alCambiar={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'Día' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: 'Semana' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Mes' })).toHaveAttribute('aria-checked', 'false')
  })

  it('tocar una opción llama a alCambiar con su valor', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<Segmentos etiqueta="Vista" opciones={OPCIONES} valor="dia" alCambiar={alCambiar} />)
    await usuario.click(screen.getByRole('radio', { name: 'Mes' }))
    expect(alCambiar).toHaveBeenCalledOnce()
    expect(alCambiar).toHaveBeenCalledWith('mes')
  })

  it('la flecha derecha pasa a la siguiente opción, y de la última vuelve a la primera', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    const primero = render(<Segmentos etiqueta="Vista" opciones={OPCIONES} valor="dia" alCambiar={alCambiar} />)
    screen.getByRole('radio', { name: 'Día' }).focus()
    await usuario.keyboard('{ArrowRight}')
    expect(alCambiar).toHaveBeenLastCalledWith('semana')
    primero.unmount()

    alCambiar.mockClear()
    render(<Segmentos etiqueta="Vista" opciones={OPCIONES} valor="mes" alCambiar={alCambiar} />)
    screen.getByRole('radio', { name: 'Mes' }).focus()
    await usuario.keyboard('{ArrowRight}')
    expect(alCambiar).toHaveBeenLastCalledWith('dia')
  })

  it('desactivado no llama a alCambiar al tocarlo', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<Segmentos etiqueta="Vista" opciones={OPCIONES} valor="dia" alCambiar={alCambiar} desactivado />)
    await usuario.click(screen.getByRole('radio', { name: 'Mes' }))
    expect(alCambiar).not.toHaveBeenCalled()
  })
})
