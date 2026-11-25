import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { leerCatalogo } from '../datos/catalogos'
import { listarPartidas, leerPartida } from '../datos/repositorio'
import App from './app/App'
import { renderConServicios } from './pruebas/servicios'

const boton = (nombre: string | RegExp) => screen.getByRole('button', { name: nombre })
const esperarBoton = (nombre: string | RegExp) => screen.findByRole('button', { name: nombre })

describe('entregable de la fase 6a', () => {
  it('con la tablet vacía enseña el selector y siembra el catálogo', async () => {
    const { servicios } = renderConServicios(<App />)
    expect(await screen.findByText('Todavía no tienes ninguna partida.')).toBeInTheDocument()
    expect((await leerCatalogo(servicios.db)).opciones.length).toBeGreaterThan(100)
  })

  it('abre el ejemplo, exporta, importa como copia y borra', async () => {
    const usuario = userEvent.setup()
    const { servicios } = renderConServicios(<App />)

    await usuario.click(await esperarBoton('Probar con la partida de ejemplo'))
    expect(await screen.findByText('12 de abril de 1640 T.E.')).toBeInTheDocument()
    expect(screen.getByText('Jueves')).toBeInTheDocument()
    const menu = screen.getByRole('navigation', { name: 'Menú de la partida' })
    expect(within(menu).getByRole('button', { name: /Bree/ })).toHaveTextContent('pueblo')

    await usuario.click(boton('Ir a Ajustes y copias'))
    expect(await screen.findByText('Jueves, 12 de abril de 1640 T.E.')).toBeInTheDocument()
    await usuario.click(boton('Exportar copia'))
    expect(await screen.findByText('18 de septiembre de 2026')).toBeInTheDocument()
    expect(servicios.descargados[0].nombre).toContain('gestion-aldeas-la-sombra-del-este-')

    await usuario.click(boton('Cambiar de partida'))
    await esperarBoton('Continuar')
    const archivo = new File([servicios.descargados[0].texto], 'copia.json', { type: 'application/json' })
    await usuario.upload(screen.getByLabelText('Archivo de la copia'), archivo)
    await usuario.click(await esperarBoton('Importar como copia'))
    expect(await screen.findByText('Copia importada')).toBeInTheDocument()
    await usuario.click(boton('Aceptar'))
    expect(await screen.findByRole('article', { name: 'La Sombra del Este (copia)' })).toBeInTheDocument()
    expect(await listarPartidas(servicios.db)).toHaveLength(2)

    await usuario.click(within(screen.getByRole('article', { name: 'La Sombra del Este (copia)' })).getByRole('button', { name: 'Editar partida' }))
    await usuario.click(boton('Eliminar partida'))
    await usuario.click(screen.getByRole('checkbox', { name: 'Sé que esto no se puede deshacer' }))
    await usuario.click(boton('Eliminar definitivamente'))
    await screen.findByRole('article', { name: 'La Sombra del Este' })
    await expect.poll(async () => (await listarPartidas(servicios.db)).length).toBe(1)
  })

  it('crea una partida nueva en dos pasos y la abre', async () => {
    const usuario = userEvent.setup()
    const { servicios } = renderConServicios(<App />)
    await usuario.click(await esperarBoton('Nueva partida'))
    expect(boton('Siguiente: personaje')).toBeDisabled()
    await usuario.type(screen.getByLabelText('Nombre de la partida'), 'Aldric')
    await usuario.type(screen.getByLabelText('Año'), '2980')
    await usuario.click(boton('Siguiente: personaje'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Aldric')
    await usuario.type(screen.getByLabelText('Cantidad de la fila 1'), '12')
    await usuario.click(boton('Crear partida'))
    expect(await screen.findByText('1 de enero de 2980 T.E.')).toBeInTheDocument()
    const [resumen] = await listarPartidas(servicios.db)
    const documento = await leerPartida(servicios.db, resumen.id)
    expect(documento?.cajas[0].saldoInicial.base).toBe(1200000)
    expect(resumen.dominios).toEqual(['Aldric'])
  })
})
