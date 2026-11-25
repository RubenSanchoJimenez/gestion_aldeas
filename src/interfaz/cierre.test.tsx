import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { leerCatalogo } from '../datos/catalogos'
import { leerPartida } from '../datos/repositorio'
import { PARTIDA_ID } from '../dominio/ejemplo/ids'
import App from './app/App'
import { renderConServicios } from './pruebas/servicios'

const boton = (nombre: string | RegExp) => screen.getByRole('button', { name: nombre })
const dialogo = () => within(screen.getAllByRole('dialog').at(-1)!)
const menu = () => within(screen.getByRole('navigation', { name: 'Menú de la partida' }))

async function abrirEjemplo() {
  const usuario = userEvent.setup()
  const { servicios } = renderConServicios(<App />)
  await usuario.click(await screen.findByRole('button', { name: 'Probar con la partida de ejemplo' }))
  await screen.findByRole('navigation', { name: 'Menú de la partida' })
  return { usuario, servicios }
}

describe('listas, altas y cierre (fase 9)', () => {
  it('P7: añade una categoría y sale marcada como tuya', async () => {
    const { usuario, servicios } = await abrirEjemplo()
    await usuario.click(menu().getByRole('button', { name: 'Ajustes y copias' }))
    await usuario.click(boton('Gestionar listas'))
    await usuario.click(boton('Añadir'))
    await usuario.type(dialogo().getByLabelText('Nombre'), 'Posadas del camino')
    await usuario.click(dialogo().getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('row', { name: /Posadas del camino.*Tuya/ })).toBeInTheDocument()
    expect((await leerCatalogo(servicios.db)).opciones.some((o) => o.nombre === 'Posadas del camino')).toBe(true)
  })

  it('J2e: «Nueva categoría» desde el desplegable la crea y la elige', async () => {
    const { usuario, servicios } = await abrirEjemplo()
    await usuario.click(menu().getByRole('button', { name: /Tharan/ }))
    await usuario.click(menu().getByRole('button', { name: 'Bolsa y movimientos' }))
    await usuario.click(boton('Nuevo movimiento'))
    await usuario.click(dialogo().getByRole('combobox', { name: 'Categoría' }))
    await usuario.click(screen.getByRole('button', { name: /Nueva categoría/ }))
    await usuario.type(dialogo().getByLabelText('Nombre de la categoría'), 'Juglares')
    await usuario.click(dialogo().getByRole('button', { name: 'Crear y elegir' }))
    await expect.poll(() => screen.getByRole('combobox', { name: 'Categoría' }).textContent).toContain('Juglares')
    expect((await leerCatalogo(servicios.db)).opciones.some((o) => o.nombre === 'Juglares')).toBe(true)
  })

  it('cerrar con cambios sin guardar pregunta antes de perderlos', async () => {
    const { usuario, servicios } = await abrirEjemplo()
    await usuario.click(menu().getByRole('button', { name: /Tharan/ }))
    await usuario.click(menu().getByRole('button', { name: 'Inventario' }))
    await usuario.click(boton('Añadir objeto'))
    await usuario.type(dialogo().getByLabelText('Nombre'), 'Cuerda')
    await usuario.click(dialogo().getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Hay cambios sin guardar')).toBeInTheDocument()
    await usuario.click(boton('Seguir editando'))
    expect(dialogo().getByLabelText('Nombre')).toHaveValue('Cuerda')
    await usuario.click(dialogo().getByRole('button', { name: 'Cancelar' }))
    await usuario.click(boton('Descartar'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await leerPartida(servicios.db, PARTIDA_ID))?.partida.cambiosDesdeUltimoAvance).toBe(0)
  })

  it('una sesión de juego con una partida nueva: aldea, tributo, avance y copia', async () => {
    const usuario = userEvent.setup()
    const { servicios } = renderConServicios(<App />)
    await usuario.click(await screen.findByRole('button', { name: 'Nueva partida' }))
    await usuario.type(screen.getByLabelText('Nombre de la partida'), 'Prueba de mesa')
    await usuario.type(screen.getByLabelText('Año'), '1640')
    await usuario.click(boton('Siguiente: personaje'))
    await usuario.type(screen.getByLabelText('Nombre'), 'Aldric')
    await usuario.type(screen.getByLabelText('Cantidad de la fila 1'), '100')
    await usuario.click(boton('Crear partida'))
    await screen.findByRole('navigation', { name: 'Menú de la partida' })

    await usuario.click(menu().getByRole('button', { name: 'Añadir asentamiento' }))
    await usuario.type(dialogo().getByLabelText('Nombre'), 'Combe')
    await usuario.type(dialogo().getByLabelText('Habitantes'), '30')
    await usuario.type(dialogo().getByLabelText('Cantidad'), '20')
    await usuario.click(dialogo().getByRole('button', { name: 'Crear asentamiento' }))

    await usuario.click(await screen.findByRole('button', { name: 'Avanzar días' }))
    await usuario.click(dialogo().getByRole('button', { name: 'Avanzar' }))
    expect(await screen.findByText('Resumen del avance')).toBeInTheDocument()
    await usuario.click(dialogo().getAllByRole('button', { name: 'Cerrar' }).at(-1)!)

    await usuario.click(menu().getByRole('button', { name: 'Ajustes y copias' }))
    await usuario.click(boton('Exportar copia'))
    await expect.poll(() => servicios.descargados.length).toBe(1)
    expect(servicios.descargados[0].texto).toContain('Combe')
  }, 30_000)
})
