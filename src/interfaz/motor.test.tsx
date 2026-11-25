import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { leerPartida } from '../datos/repositorio'
import { PARTIDA_ID } from '../dominio/ejemplo/ids'
import App from './app/App'
import { renderConServicios } from './pruebas/servicios'

const boton = (nombre: string | RegExp) => screen.getByRole('button', { name: nombre })

async function abrirEjemplo() {
  const usuario = userEvent.setup()
  const { servicios } = renderConServicios(<App />)
  await usuario.click(await screen.findByRole('button', { name: 'Probar con la partida de ejemplo' }))
  await screen.findByRole('button', { name: 'Avanzar días' })
  return { usuario, servicios }
}

describe('pantallas del motor (fase 6b)', () => {
  it('Inicio enseña los avisos del 12 de abril y las tarjetas de los dominios', async () => {
    await abrirEjemplo()
    expect(screen.getAllByText('Los víveres de Bree se agotan el 23 de abril').length).toBeGreaterThan(0)
    expect(screen.getByText('46,518 mo')).toBeInTheDocument()
    expect(screen.getByText('340,6 mo')).toBeInTheDocument()
    expect(screen.getByText('167,118 mo')).toBeInTheDocument()
    expect(screen.getByText('−11,5 mo')).toBeInTheDocument()
  })

  it('avanza 7 días, enseña el resumen y deshace el avance', async () => {
    const { usuario, servicios } = await abrirEjemplo()
    await usuario.click(boton('Avanzar días'))
    const previa = screen.getByRole('dialog')
    expect(within(previa).getByRole('table', { name: 'Saldos' })).toBeInTheDocument()
    await usuario.click(within(previa).getByRole('button', { name: 'Avanzar' }))
    expect(await screen.findByText('Resumen del avance')).toBeInTheDocument()
    expect((await leerPartida(servicios.db, PARTIDA_ID))?.partida.fechaActual.dia).toBe(19)
    await usuario.click(boton('Deshacer avance'))
    await usuario.click(boton('Deshacer avance'))
    await expect.poll(async () => (await leerPartida(servicios.db, PARTIDA_ID))?.partida.fechaActual.dia).toBe(12)
    expect(await screen.findByText('12 de abril de 1640 T.E.')).toBeInTheDocument()
  })

  it('el calendario enseña el mes y el detalle del día elegido', async () => {
    const { usuario } = await abrirEjemplo()
    await usuario.click(boton('Calendario'))
    expect(screen.getByRole('table', { name: 'Mes' })).toBeInTheDocument()
    await usuario.click(boton('20 de abril de 1640'))
    expect(screen.getByText('Vence · 4 mo pendientes')).toBeInTheDocument()
  })
})
