import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ContextoNivelDialogo } from './nivelDialogo'
import { SelectorConBuscador, type GrupoSelector, type OpcionSelector } from './SelectorConBuscador'

type Valor = string

const SUSTANTIVO = { singular: 'categoría', plural: 'categorías' }

const GRUPOS: readonly GrupoSelector<Valor>[] = [
  {
    nombre: 'Habituales',
    opciones: [
      { valor: 'alojamiento', texto: 'Alojamiento' },
      { valor: 'comida', texto: 'Comida y bebida' },
      { valor: 'piedra', texto: 'Piedra', detalle: '180 carretadas' },
    ],
  },
  {
    nombre: 'Otras',
    opciones: [
      { valor: 'alamo', texto: 'Álamo' },
      { valor: 'senor', texto: 'Señor' },
    ],
  },
]

function opciones(cantidad: number): OpcionSelector<Valor>[] {
  return Array.from({ length: cantidad }, (_, indice) => ({ valor: `op${indice}`, texto: `Opción ${indice + 1}` }))
}

describe('SelectorConBuscador', () => {
  it('el campo cerrado enseña la opción elegida o textoSinValor', () => {
    const { rerender } = render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor="alojamiento"
        textoSinValor="Elige una categoría"
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
      />,
    )
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveTextContent('Alojamiento')

    rerender(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        textoSinValor="Elige una categoría"
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
      />,
    )
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveTextContent('Elige una categoría')
  })

  it('al tocarlo se abre el listbox con las etiquetas de grupo', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador etiqueta="Categoría" valor={null} grupos={GRUPOS} alCambiar={vi.fn()} sustantivo={SUSTANTIVO} />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    expect(screen.getByRole('listbox', { name: 'Categoría' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Habituales' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Otras' })).toBeInTheDocument()
  })

  it('con 7 opciones el buscador no tiene el foco', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador
        etiqueta="Moneda"
        valor={null}
        grupos={[{ opciones: opciones(7) }]}
        alCambiar={vi.fn()}
        sustantivo={{ singular: 'moneda', plural: 'monedas' }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Moneda' }))
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).not.toHaveFocus()
  })

  it('con 13 opciones sí lo tiene', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador
        etiqueta="Moneda"
        valor={null}
        grupos={[{ opciones: opciones(13) }]}
        alCambiar={vi.fn()}
        sustantivo={{ singular: 'moneda', plural: 'monedas' }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Moneda' }))
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveFocus()
  })

  it('el contador: «7 monedas», «1 moneda» y «5 de 27» al buscar', async () => {
    const usuario = userEvent.setup()
    const veintisiete = [
      ...Array.from({ length: 22 }, (_, indice) => ({ valor: `c${indice}`, texto: `Categoría ${indice + 1}` })),
      ...Array.from({ length: 5 }, (_, indice) => ({ valor: `e${indice}`, texto: `Especial ${indice + 1}` })),
    ]
    const { unmount } = render(
      <SelectorConBuscador
        etiqueta="Moneda"
        valor={null}
        grupos={[{ opciones: opciones(7) }]}
        alCambiar={vi.fn()}
        sustantivo={{ singular: 'moneda', plural: 'monedas' }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Moneda' }))
    expect(screen.getByText('7 monedas')).toBeInTheDocument()
    unmount()

    const segundo = render(
      <SelectorConBuscador
        etiqueta="Moneda"
        valor={null}
        grupos={[{ opciones: opciones(1) }]}
        alCambiar={vi.fn()}
        sustantivo={{ singular: 'moneda', plural: 'monedas' }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Moneda' }))
    expect(screen.getByText('1 moneda')).toBeInTheDocument()
    segundo.unmount()

    render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        grupos={[{ opciones: veintisiete }]}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    expect(screen.getByText('27 categorías')).toBeInTheDocument()
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'esp')
    expect(screen.getByText('5 de 27')).toBeInTheDocument()
  })

  it('la búsqueda no distingue mayúsculas ni tildes y mira también el detalle («180»)', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador etiqueta="Categoría" valor={null} grupos={GRUPOS} alCambiar={vi.fn()} sustantivo={SUSTANTIVO} />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'ALAMO')
    expect(screen.getByRole('option', { name: /Álamo/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Alojamiento/ })).not.toBeInTheDocument()

    await userEvent.setup().clear(screen.getByRole('searchbox', { name: 'Buscar' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), '180')
    expect(screen.getByRole('option', { name: /Piedra/ })).toBeInTheDocument()
  })

  it('resaltado: «ala» sobre «Álamo» deja <strong>Ála</strong>mo', async () => {
    const usuario = userEvent.setup()
    const { container } = render(
      <SelectorConBuscador etiqueta="Categoría" valor={null} grupos={GRUPOS} alCambiar={vi.fn()} sustantivo={SUSTANTIVO} />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'ala')
    const opcion = container.querySelector('[data-valor="alamo"]')
    expect(opcion).not.toBeNull()
    const fuerte = opcion?.querySelector('strong')
    expect(fuerte).toHaveTextContent('Ála')
    expect(fuerte?.nextSibling?.textContent).toBe('mo')
  })

  it('sin resultados salen los dos textos', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador etiqueta="Categoría" valor={null} grupos={GRUPOS} alCambiar={vi.fn()} sustantivo={SUSTANTIVO} />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'zzz')
    expect(screen.getByText('Nada coincide con “zzz”')).toBeInTheDocument()
    expect(screen.getByText('Busca en todas las categorías y grupos.')).toBeInTheDocument()
  })

  it('elegir llama a alCambiar y cierra', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(
      <SelectorConBuscador etiqueta="Categoría" valor={null} grupos={GRUPOS} alCambiar={alCambiar} sustantivo={SUSTANTIVO} />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await usuario.click(screen.getByRole('option', { name: 'Comida y bebida' }))
    expect(alCambiar).toHaveBeenCalledOnce()
    expect(alCambiar).toHaveBeenCalledWith('comida')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('la opción actual está aria-selected y lleva check', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador etiqueta="Categoría" valor="comida" grupos={GRUPOS} alCambiar={vi.fn()} sustantivo={SUSTANTIVO} />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    const elegida = screen.getByRole('option', { name: /Comida y bebida/ })
    expect(elegida).toHaveAttribute('aria-selected', 'true')
    expect(elegida.querySelector('svg')).toHaveAttribute('data-nombre', 'check')
    expect(screen.getByRole('option', { name: 'Alojamiento' })).toHaveAttribute('aria-selected', 'false')
  })

  it('«Recientes» sale arriba (hasta 5) y no con búsqueda', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
        recientes={['senor', 'piedra']}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    const recientes = screen.getByRole('group', { name: 'Recientes' })
    expect(recientes).toBeInTheDocument()
    const opcionesRecientes = recientes.querySelectorAll('[role="option"]')
    expect(opcionesRecientes).toHaveLength(2)
    expect(opcionesRecientes[0]).toHaveTextContent('Señor')
    expect(opcionesRecientes[1]).toHaveTextContent('Piedra')

    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'a')
    expect(screen.queryByRole('group', { name: 'Recientes' })).not.toBeInTheDocument()
  })

  it('el modo filtro pone «Todas» primero y no tiene pie aunque haya alta', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
        filtro={{ todas: { valor: 'todas', texto: 'Todas' } }}
        alta={{ texto: 'Nueva categoría', alPedir: vi.fn() }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    const lista = screen.getByRole('listbox', { name: 'Categoría' })
    const primeraOpcion = lista.querySelector('[role="option"]')
    expect(primeraOpcion).toHaveTextContent('Todas')
    expect(screen.queryByText('Nueva categoría')).not.toBeInTheDocument()
  })

  it('pie: «Nueva categoría», «Nueva categoría “posada”» y el recorte a 16 + «…»; alPedir con la búsqueda y el valor sin cambiar', async () => {
    const usuario = userEvent.setup()
    const alPedir = vi.fn()
    const alCambiar = vi.fn()
    render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        grupos={GRUPOS}
        alCambiar={alCambiar}
        sustantivo={SUSTANTIVO}
        alta={{ texto: 'Nueva categoría', alPedir }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    expect(screen.getByRole('button', { name: 'Nueva categoría' })).toBeInTheDocument()

    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'posada')
    expect(screen.getByRole('button', { name: 'Nueva categoría “posada”' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Nueva categoría “posada”' }))
    expect(alPedir).toHaveBeenCalledOnce()
    expect(alPedir).toHaveBeenCalledWith('posada')
    expect(alCambiar).not.toHaveBeenCalled()

    render(
      <SelectorConBuscador
        etiqueta="Otra"
        valor={null}
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
        alta={{ texto: 'Nueva categoría', alPedir: vi.fn() }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Otra' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'una cadena de mas de dieciseis letras')
    expect(screen.getByText('Nueva categoría “una cadena de ma…”')).toBeInTheDocument()
  })

  it('sin resultados, el pie es un botón principal', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
        alta={{ texto: 'Nueva categoría', alPedir: vi.fn() }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'posada')
    const boton = screen.getByRole('button', { name: 'Nueva categoría “posada”' })
    expect(boton).toHaveAttribute('data-variante', 'principal')
  })

  it('coincidencia exacta: «"Alojamiento" ya existe», sin botón', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
        alta={{ texto: 'Nueva categoría', alPedir: vi.fn() }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'Alojamiento')
    expect(screen.getByText('“Alojamiento” ya existe')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Nueva categoría/ })).not.toBeInTheDocument()
  })

  it('Esc y tocar fuera cierran; dentro de un diálogo apilado (nivel 2) no hay pie', async () => {
    const usuario = userEvent.setup()
    render(
      <>
        <div data-testid="fuera">Fuera</div>
        <SelectorConBuscador etiqueta="Categoría" valor={null} grupos={GRUPOS} alCambiar={vi.fn()} sustantivo={SUSTANTIVO} />
      </>,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveFocus()

    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await usuario.click(screen.getByTestId('fuera'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    render(
      <ContextoNivelDialogo.Provider value={2}>
        <SelectorConBuscador
          etiqueta="Segunda"
          valor={null}
          grupos={GRUPOS}
          alCambiar={vi.fn()}
          sustantivo={SUSTANTIVO}
          alta={{ texto: 'Nueva categoría', alPedir: vi.fn() }}
        />
      </ContextoNivelDialogo.Provider>,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Segunda' }))
    expect(screen.queryByText('Nueva categoría')).not.toBeInTheDocument()
  })
})
