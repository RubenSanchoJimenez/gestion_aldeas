import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { leerPartida } from '../datos/repositorio'
import { saldosPorDominio } from '../dominio/dinero/saldo'
import { DOM, PARTIDA_ID } from '../dominio/ejemplo/ids'
import { catalogosDeEjemplo } from '../dominio/ejemplo/sombraDelEste'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import { validarCopia } from '../dominio/validacion/coherencia'
import App from './app/App'
import { renderConServicios } from './pruebas/servicios'

const boton = (nombre: string | RegExp) => screen.getByRole('button', { name: nombre })
const dialogo = () => within(screen.getByRole('dialog'))
const menu = () => within(screen.getByRole('navigation', { name: 'Menú de la partida' }))

async function abrirEjemplo() {
  const usuario = userEvent.setup()
  const { servicios } = renderConServicios(<App />)
  await usuario.click(await screen.findByRole('button', { name: 'Probar con la partida de ejemplo' }))
  await screen.findByRole('navigation', { name: 'Menú de la partida' })
  const guardado = async (): Promise<DocumentoPartida> => (await leerPartida(servicios.db, PARTIDA_ID))!
  const exigeValida = async (): Promise<void> => {
    expect(validarCopia(await guardado(), catalogosDeEjemplo())).toEqual([])
  }
  return { usuario, guardado, exigeValida }
}

const SECCIONES = ['Resumen', 'Tesorería', 'Población', 'Personal', 'Producción', 'Animales', 'Comercio', 'Eventos']
const PESTANAS: Record<string, string[]> = {
  Tesorería: ['Impuestos y rentas', 'Locales comerciales', 'Deudas'],
  Personal: ['Guarnición', 'Armería'],
  Producción: ['Almacén', 'Obras'],
}

describe('pantallas de los asentamientos (fase 8)', () => {
  it.each(['Bree', 'Archet'])(
    'todas las secciones y pestañas de %s se abren',
    async (nombre) => {
      const { usuario } = await abrirEjemplo()
      await usuario.click(menu().getByRole('button', { name: new RegExp(nombre) }))
      for (const seccion of SECCIONES) {
        await usuario.click(menu().getByRole('button', { name: seccion }))
        expect(screen.getByRole('main')).not.toBeEmptyDOMElement()
        for (const pestana of PESTANAS[seccion] ?? []) {
          await usuario.click(screen.getByRole('radio', { name: pestana }))
          expect(screen.getByRole('main')).not.toBeEmptyDOMElement()
        }
      }
    },
    30_000,
  )

  it('A0: crea un asentamiento vacío y después lo elimina', async () => {
    const { usuario, guardado, exigeValida } = await abrirEjemplo()
    await usuario.click(menu().getByRole('button', { name: 'Añadir asentamiento' }))
    await usuario.type(dialogo().getByLabelText('Nombre'), 'Combe')
    await usuario.type(dialogo().getByLabelText('Habitantes'), '80')
    await usuario.click(dialogo().getByRole('button', { name: 'Crear asentamiento' }))
    await expect.poll(async () => (await guardado()).dominios.length).toBe(4)
    await exigeValida()
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }))
    await usuario.click(dialogo().getByRole('button', { name: 'Eliminar' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Sé que esto no se puede deshacer' }))
    await usuario.click(boton('Eliminar definitivamente'))
    await expect.poll(async () => (await guardado()).dominios.length).toBe(3)
    await exigeValida()
  })

  it('A8b: comprar víveres cuesta dinero y llena el almacén', async () => {
    const { usuario, guardado, exigeValida } = await abrirEjemplo()
    await usuario.click(menu().getByRole('button', { name: /Bree/ }))
    await usuario.click(menu().getByRole('button', { name: 'Producción' }))
    await usuario.click(screen.getByRole('radio', { name: 'Almacén' }))
    await usuario.click(boton('Añadir víveres'))
    await usuario.type(dialogo().getByLabelText('Sacos'), '10')
    await usuario.type(dialogo().getByLabelText('Cantidad'), '0,1')
    await usuario.click(dialogo().getByRole('button', { name: 'Guardar' }))
    await expect.poll(async () => saldosPorDominio(await guardado())[DOM.bree]).toBe(34060000 - 100000)
    await exigeValida()
  })

  it('A6b: añadir a la armería', async () => {
    const { usuario, guardado, exigeValida } = await abrirEjemplo()
    await usuario.click(menu().getByRole('button', { name: /Bree/ }))
    await usuario.click(menu().getByRole('button', { name: 'Personal' }))
    await usuario.click(screen.getByRole('radio', { name: 'Armería' }))
    const antes = (await guardado()).armeria.length
    await usuario.click(boton('Añadir'))
    await usuario.type(dialogo().getByLabelText('Nombre'), 'Escudos')
    const [unidades, valor] = dialogo().getAllByLabelText('Cantidad')
    await usuario.clear(unidades)
    await usuario.type(unidades, '2')
    await usuario.type(valor, '3')
    await usuario.click(dialogo().getByRole('button', { name: 'Guardar' }))
    await expect.poll(async () => (await guardado()).armeria.length).toBe(antes + 1)
    await exigeValida()
  })
})
