import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dialogo, DialogoMensaje } from './Dialogo'

describe('Dialogo', () => {
  it('abre con open y con el nombre de su título', () => {
    render(
      <Dialogo titulo="Borrar categoría" ancho={480} abierto alCancelar={vi.fn()}>
        Cuerpo
      </Dialogo>,
    )
    const dialogo = screen.getByRole('dialog', { name: 'Borrar categoría' })
    expect(dialogo).toHaveAttribute('open')
  })

  it('la x llama a alCancelar', async () => {
    const usuario = userEvent.setup()
    const alCancelar = vi.fn()
    render(
      <Dialogo titulo="Borrar categoría" ancho={480} abierto alCancelar={alCancelar}>
        Cuerpo
      </Dialogo>,
    )
    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(alCancelar).toHaveBeenCalledOnce()
  })

  it('cancel (Esc) llama a alCancelar y no cierra solo', () => {
    const alCancelar = vi.fn()
    render(
      <Dialogo titulo="Borrar categoría" ancho={480} abierto alCancelar={alCancelar}>
        Cuerpo
      </Dialogo>,
    )
    const dialogo = screen.getByRole('dialog', { name: 'Borrar categoría' })
    fireEvent(dialogo, new Event('cancel', { cancelable: true }))
    expect(alCancelar).toHaveBeenCalledOnce()
    expect(dialogo).toHaveAttribute('open')
  })

  it('con abierto={false} no pinta nada', () => {
    const { container } = render(
      <Dialogo titulo="Borrar categoría" ancho={480} abierto={false} alCancelar={vi.fn()}>
        Cuerpo
      </Dialogo>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('un Dialogo dentro de otro lleva data-apilado y el de abajo no', () => {
    render(
      <Dialogo titulo="Editar partida" ancho={520} abierto alCancelar={vi.fn()}>
        <Dialogo titulo="¿Eliminar «La Sombra del Este»?" ancho={620} abierto alCancelar={vi.fn()}>
          Confirmación
        </Dialogo>
      </Dialogo>,
    )
    expect(screen.getByRole('dialog', { name: 'Editar partida' })).not.toHaveAttribute('data-apilado')
    expect(screen.getByRole('dialog', { name: '¿Eliminar «La Sombra del Este»?' })).toHaveAttribute(
      'data-apilado',
      'true',
    )
  })

  it('al cerrar el de arriba, el de abajo conserva lo escrito en su campo', async () => {
    const usuario = userEvent.setup()

    function DosNiveles() {
      const [texto, establecerTexto] = useState('')
      const [segundoAbierto, establecerSegundoAbierto] = useState(true)
      return (
        <Dialogo titulo="Editar partida" ancho={520} abierto alCancelar={vi.fn()}>
          <input aria-label="Nombre" value={texto} onChange={(evento) => establecerTexto(evento.target.value)} />
          <Dialogo
            titulo="¿Eliminar «La Sombra del Este»?"
            ancho={620}
            abierto={segundoAbierto}
            alCancelar={() => establecerSegundoAbierto(false)}
          >
            Confirmación
          </Dialogo>
        </Dialogo>
      )
    }

    render(<DosNiveles />)
    await usuario.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Bree')
    const segundo = screen.getByRole('dialog', { name: '¿Eliminar «La Sombra del Este»?' })
    await usuario.click(within(segundo).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: '¿Eliminar «La Sombra del Este»?' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Bree')
  })

  it('un tercer nivel lanza', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <Dialogo titulo="Uno" ancho={480} abierto alCancelar={vi.fn()}>
          <Dialogo titulo="Dos" ancho={480} abierto alCancelar={vi.fn()}>
            <Dialogo titulo="Tres" ancho={480} abierto alCancelar={vi.fn()}>
              Cuerpo
            </Dialogo>
          </Dialogo>
        </Dialogo>,
      ),
    ).toThrow('Como mucho hay dos diálogos visibles (§5)')
    consola.mockRestore()
  })

  it('DialogoMensaje enseña las líneas y Aceptar llama a alAceptar', async () => {
    const usuario = userEvent.setup()
    const alAceptar = vi.fn()
    render(
      <DialogoMensaje
        titulo="Copia importada"
        lineas={['Se añadió Archet.', 'El formato se actualizó.']}
        abierto
        alAceptar={alAceptar}
      />,
    )
    expect(screen.getByText('Se añadió Archet.')).toBeInTheDocument()
    expect(screen.getByText('El formato se actualizó.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(alAceptar).toHaveBeenCalledOnce()
  })
})
