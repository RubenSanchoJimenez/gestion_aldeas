import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { archivoDePrueba } from '../datos/pruebas/archivoDePrueba'
import App from './app/App'
import { renderConServicios, serviciosDePrueba } from './pruebas/servicios'

const boton = (nombre: string | RegExp) => screen.getByRole('button', { name: nombre })
const dialogo = () => within(screen.getAllByRole('dialog').at(-1)!)
const menu = () => within(screen.getByRole('navigation', { name: 'Menú de la partida' }))

async function abrirAjustes(cambios: Parameters<typeof serviciosDePrueba>[0] = {}) {
  const usuario = userEvent.setup()
  renderConServicios(<App />, serviciosDePrueba(cambios))
  await usuario.click(await screen.findByRole('button', { name: 'Probar con la partida de ejemplo' }))
  await screen.findByRole('navigation', { name: 'Menú de la partida' })
  await usuario.click(menu().getByRole('button', { name: 'Ajustes y copias' }))
  return usuario
}

async function anadirObjeto(usuario: ReturnType<typeof userEvent.setup>, nombre: string) {
  await usuario.click(menu().getByRole('button', { name: /Tharan/ }))
  await usuario.click(menu().getByRole('button', { name: 'Inventario' }))
  await usuario.click(boton('Añadir objeto'))
  await usuario.type(dialogo().getByLabelText('Nombre'), nombre)
  // La segunda «Cantidad» es la del importe del valor.
  await usuario.type(dialogo().getAllByLabelText('Cantidad').at(-1)!, '2')
  await usuario.click(dialogo().getByRole('button', { name: 'Guardar' }))
}

describe('copia automática en un archivo', () => {
  it('si el navegador no sabe, lo dice', async () => {
    await abrirAjustes()
    expect(screen.getByText(/Este navegador no permite/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Elegir archivo' })).not.toBeInTheDocument()
  })

  it('elegir el archivo lo escribe, y cada cambio lo actualiza', async () => {
    const archivo = archivoDePrueba('mesa.json')
    const usuario = await abrirAjustes({ elegirArchivo: async () => archivo })
    await usuario.click(boton('Elegir archivo'))
    expect(await screen.findByText('mesa.json')).toBeInTheDocument()
    await expect.poll(() => archivo.contenido).toContain('La Sombra del Este')
    await anadirObjeto(usuario, 'Cuerda de seda gris')
    await expect.poll(() => archivo.contenido).toContain('Cuerda de seda gris')
  })

  it('dejar de actualizar quita el archivo', async () => {
    const usuario = await abrirAjustes({ elegirArchivo: async () => archivoDePrueba('mesa.json') })
    await usuario.click(boton('Elegir archivo'))
    await usuario.click(await screen.findByRole('button', { name: 'Dejar de actualizarlo' }))
    expect(await screen.findByRole('button', { name: 'Elegir archivo' })).toBeInTheDocument()
  })

  it('sin permiso avisa en cualquier pantalla y se reactiva con un toque', async () => {
    const archivo = archivoDePrueba('mesa.json', 'prompt')
    const usuario = await abrirAjustes({ elegirArchivo: async () => archivo })
    await usuario.click(boton('Elegir archivo'))
    await screen.findByRole('button', { name: 'Reactivar la copia' })
    await usuario.click(menu().getByRole('button', { name: 'Inicio' }))
    await usuario.click(boton('Reactivar la copia'))
    await expect.poll(() => archivo.contenido).toContain('La Sombra del Este')
    await expect.poll(() => screen.queryByRole('button', { name: 'Reactivar la copia' })).toBeNull()
  })
})
