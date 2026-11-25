import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Enlace } from './Boton'
import { Aviso } from './Aviso'

describe('Aviso', () => {
  it('lleva su tono en data-tono, en los cuatro (§6.6)', () => {
    render(
      <>
        <Aviso tono="lacre">Uno</Aviso>
        <Aviso tono="oro">Dos</Aviso>
        <Aviso tono="bosque">Tres</Aviso>
        <Aviso tono="neutro">Cuatro</Aviso>
      </>,
    )
    expect(screen.getByText('Uno').closest('[role="status"]')).toHaveAttribute('data-tono', 'lacre')
    expect(screen.getByText('Dos').closest('[role="status"]')).toHaveAttribute('data-tono', 'oro')
    expect(screen.getByText('Tres').closest('[role="status"]')).toHaveAttribute('data-tono', 'bosque')
    expect(screen.getByText('Cuatro').closest('[role="status"]')).toHaveAttribute('data-tono', 'neutro')
  })

  it('lleva el icono alerta en lacre y reloj en los demás tonos, por defecto (mjs L185)', () => {
    render(
      <>
        <Aviso tono="lacre">Uno</Aviso>
        <Aviso tono="oro">Dos</Aviso>
        <Aviso tono="bosque">Tres</Aviso>
        <Aviso tono="neutro">Cuatro</Aviso>
      </>,
    )
    expect(screen.getByText('Uno').closest('[role="status"]')?.querySelector('svg')).toHaveAttribute(
      'data-nombre',
      'alerta',
    )
    expect(screen.getByText('Dos').closest('[role="status"]')?.querySelector('svg')).toHaveAttribute(
      'data-nombre',
      'reloj',
    )
    expect(screen.getByText('Tres').closest('[role="status"]')?.querySelector('svg')).toHaveAttribute(
      'data-nombre',
      'reloj',
    )
    expect(screen.getByText('Cuatro').closest('[role="status"]')?.querySelector('svg')).toHaveAttribute(
      'data-nombre',
      'reloj',
    )
  })

  it('el icono se puede forzar, como el «calendario» de P1', () => {
    render(
      <Aviso tono="oro" icono="calendario">
        La partida empieza el domingo 1 de enero de 1640 T.E.
      </Aviso>,
    )
    expect(screen.getByRole('status').querySelector('svg')).toHaveAttribute('data-nombre', 'calendario')
  })

  it('pinta la acción, a la derecha', async () => {
    const usuario = userEvent.setup()
    const alPulsar = vi.fn()
    render(
      <Aviso tono="neutro" accion={<Enlace alPulsar={alPulsar}>Deshacer</Enlace>}>
        Se ha borrado el movimiento.
      </Aviso>,
    )
    await usuario.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(alPulsar).toHaveBeenCalledOnce()
  })
})
