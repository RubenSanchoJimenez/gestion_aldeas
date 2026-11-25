import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListaPares, Tabla } from './Tabla'

const COLUMNAS = [{ titulo: 'Moneda' }, { titulo: 'Abrev.' }, { titulo: 'Equivale a', derecha: true }]
const FILAS = [
  ['Oro', 'mo', '10 mp'],
  ['Plata', 'mp', '10 mb'],
]

describe('Tabla', () => {
  it('las cabeceras se leen como columnheader', () => {
    render(<Tabla etiqueta="Monedas" columnas={COLUMNAS} filas={FILAS} />)
    expect(screen.getByRole('columnheader', { name: 'Moneda' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Abrev.' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Equivale a' })).toBeInTheDocument()
  })

  it('pinta las filas y sus celdas, con data-derecha en la columna de importes', () => {
    render(<Tabla etiqueta="Monedas" columnas={COLUMNAS} filas={FILAS} />)
    const filas = screen.getAllByRole('row')
    const filaOro = filas[1]
    expect(within(filaOro).getByText('Oro')).toBeInTheDocument()
    expect(within(filaOro).getByText('mo')).toBeInTheDocument()
    expect(within(filaOro).getByText('10 mp')).toHaveAttribute('data-derecha')
  })

  it('pinta la fila total con filete doble', () => {
    render(<Tabla etiqueta="Monedas" columnas={COLUMNAS} filas={FILAS} total={['Total', '', '20 mp']} />)
    const filas = screen.getAllByRole('row')
    const filaTotal = filas[filas.length - 1]
    expect(filaTotal).toHaveAttribute('data-total', 'true')
    expect(within(filaTotal).getByText('Total')).toBeInTheDocument()
  })
})

describe('ListaPares', () => {
  it('enseña cada par', () => {
    render(
      <ListaPares
        filas={[
          { etiqueta: 'Calendario', valor: 'Actual, con los meses de hoy' },
          { etiqueta: 'Fecha actual', valor: 'Jueves, 12 de abril de 1640 T.E.', sub: 'Domingo, 1 de enero' },
        ]}
      />,
    )
    expect(screen.getByText('Calendario')).toBeInTheDocument()
    expect(screen.getByText('Actual, con los meses de hoy')).toBeInTheDocument()
    expect(screen.getByText('Fecha actual')).toBeInTheDocument()
    expect(screen.getByText('Jueves, 12 de abril de 1640 T.E.')).toBeInTheDocument()
    expect(screen.getByText('Domingo, 1 de enero')).toBeInTheDocument()
  })
})
