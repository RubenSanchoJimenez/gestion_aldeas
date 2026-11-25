import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CabeceraPantalla, Nota, Panel } from './Panel'

describe('Panel', () => {
  it('es una región con el nombre de su título y pinta su acción', () => {
    render(
      <Panel titulo="Monedas" accion={<button type="button">Editar equivalencias</button>}>
        Cuerpo del panel
      </Panel>,
    )
    expect(screen.getByRole('region', { name: 'Monedas' })).toBeInTheDocument()
    expect(screen.getByText('Cuerpo del panel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar equivalencias' })).toBeInTheDocument()
  })
})

describe('CabeceraPantalla', () => {
  it('tiene un h1 y un subtítulo', () => {
    render(<CabeceraPantalla titulo="Ajustes" subtitulo="La Sombra del Este" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument()
    expect(screen.getByText('La Sombra del Este')).toBeInTheDocument()
  })
})

describe('Nota', () => {
  it('lleva info por defecto y el icono que se le pase', () => {
    const { container, rerender } = render(<Nota>Ayuda por defecto</Nota>)
    // el trazo de 'info' (trazos.ts): circle central y el punto de la i
    expect(container.querySelector('svg')?.innerHTML).toContain('M12 11v5M12 8h.01')

    rerender(<Nota icono="calendario">Otra ayuda</Nota>)
    // el trazo de 'calendario': el rectángulo de la hoja
    expect(container.querySelector('svg')?.innerHTML).toContain('width="18" height="16" rx="2"')
  })
})
