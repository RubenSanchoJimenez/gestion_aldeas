import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmacionEliminar } from './ConfirmacionEliminar'

const RESUMEN = [
  { etiqueta: 'Partida', valor: 'La Sombra del Este' },
  { etiqueta: 'Dominios', valor: '3' },
]

describe('ConfirmacionEliminar (J2d)', () => {
  it('enseña el título, el subtítulo y el resumen', () => {
    render(
      <ConfirmacionEliminar
        titulo="¿Eliminar «La Sombra del Este»?"
        subtitulo="Partida · 12 de abril de 1640 T.E."
        resumen={RESUMEN}
        abierto
        alCancelar={vi.fn()}
        alEliminar={vi.fn()}
      />,
    )
    expect(screen.getByRole('dialog', { name: '¿Eliminar «La Sombra del Este»?' })).toBeInTheDocument()
    expect(screen.getByText('Partida · 12 de abril de 1640 T.E.')).toBeInTheDocument()
    expect(screen.getByText('La Sombra del Este')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('«Eliminar definitivamente» está desactivado hasta marcar la casilla; después llama a alEliminar', async () => {
    const usuario = userEvent.setup()
    const alEliminar = vi.fn()
    render(
      <ConfirmacionEliminar
        titulo="¿Eliminar «La Sombra del Este»?"
        subtitulo="Partida · 12 de abril de 1640 T.E."
        resumen={RESUMEN}
        abierto
        alCancelar={vi.fn()}
        alEliminar={alEliminar}
      />,
    )
    const boton = screen.getByRole('button', { name: 'Eliminar definitivamente' })
    expect(boton).toBeDisabled()
    await usuario.click(screen.getByRole('checkbox', { name: 'Sé que esto no se puede deshacer' }))
    expect(boton).toBeEnabled()
    await usuario.click(boton)
    expect(alEliminar).toHaveBeenCalledOnce()
  })

  it('«Cancelar» llama a alCancelar y no a alEliminar', async () => {
    const usuario = userEvent.setup()
    const alCancelar = vi.fn()
    const alEliminar = vi.fn()
    render(
      <ConfirmacionEliminar
        titulo="¿Eliminar «La Sombra del Este»?"
        subtitulo="Partida · 12 de abril de 1640 T.E."
        resumen={RESUMEN}
        abierto
        alCancelar={alCancelar}
        alEliminar={alEliminar}
      />,
    )
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(alCancelar).toHaveBeenCalledOnce()
    expect(alEliminar).not.toHaveBeenCalled()
  })

  it('al reabrirlo, la casilla vuelve a estar sin marcar', async () => {
    const usuario = userEvent.setup()

    function Envoltorio() {
      const [abierto, establecerAbierto] = useState(true)
      return (
        <>
          <button type="button" onClick={() => establecerAbierto(true)}>
            Reabrir
          </button>
          <ConfirmacionEliminar
            titulo="¿Eliminar «La Sombra del Este»?"
            subtitulo="Partida · 12 de abril de 1640 T.E."
            resumen={RESUMEN}
            abierto={abierto}
            alCancelar={() => establecerAbierto(false)}
            alEliminar={vi.fn()}
          />
        </>
      )
    }

    render(<Envoltorio />)
    await usuario.click(screen.getByRole('checkbox', { name: 'Sé que esto no se puede deshacer' }))
    expect(screen.getByRole('checkbox', { name: 'Sé que esto no se puede deshacer' })).toBeChecked()
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    await usuario.click(screen.getByRole('button', { name: 'Reabrir' }))
    expect(screen.getByRole('checkbox', { name: 'Sé que esto no se puede deshacer' })).not.toBeChecked()
  })

  it('con avisoAvance sale un aviso de data-tono="oro"', () => {
    render(
      <ConfirmacionEliminar
        titulo="¿Eliminar «Cada día»?"
        subtitulo="Movimiento recurrente"
        resumen={RESUMEN}
        avisoAvance="Hay 2 movimientos programados que no se generarán."
        abierto
        alCancelar={vi.fn()}
        alEliminar={vi.fn()}
      />,
    )
    const aviso = screen.getByText('Hay 2 movimientos programados que no se generarán.').closest('[role="status"]')
    expect(aviso).toHaveAttribute('data-tono', 'oro')
  })
})
