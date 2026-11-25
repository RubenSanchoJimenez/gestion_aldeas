import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { leerPartida } from '../datos/repositorio'
import { saldosPorDominio } from '../dominio/dinero/saldo'
import { DEUDA, DOM, PARTIDA_ID } from '../dominio/ejemplo/ids'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import { validarCoherenciaInterna } from '../dominio/validacion/coherencia'
import App from './app/App'
import { renderConServicios } from './pruebas/servicios'

const boton = (nombre: string | RegExp) => screen.getByRole('button', { name: nombre })
const dialogo = () => within(screen.getByRole('dialog'))

/** Abre el ejemplo y va a una sección del personaje. */
async function irA(seccion: string) {
  const usuario = userEvent.setup()
  const { servicios } = renderConServicios(<App />)
  await usuario.click(await screen.findByRole('button', { name: 'Probar con la partida de ejemplo' }))
  const menu = within(await screen.findByRole('navigation', { name: 'Menú de la partida' }))
  await usuario.click(menu.getByRole('button', { name: /Tharan/ }))
  await usuario.click(menu.getByRole('button', { name: seccion }))
  const guardado = async (): Promise<DocumentoPartida> => (await leerPartida(servicios.db, PARTIDA_ID))!
  return { usuario, guardado }
}

describe('pantallas del personaje (fase 7)', () => {
  it('J1 enseña el desglose del patrimonio', async () => {
    await irA('Resumen')
    expect(screen.getByText('Desglose del patrimonio')).toBeInTheDocument()
    expect(screen.getAllByText('167,118 mo').length).toBeGreaterThan(0)
  })

  it('J2: un movimiento nuevo cambia el saldo y cuenta un cambio', async () => {
    const { usuario, guardado } = await irA('Bolsa y movimientos')
    await usuario.click(boton('Nuevo movimiento'))
    await usuario.type(dialogo().getByLabelText('Cantidad'), '2')
    await usuario.type(dialogo().getByLabelText('Concepto'), 'Cena en la posada')
    await usuario.click(dialogo().getByRole('combobox', { name: 'Categoría' }))
    await usuario.click(dialogo().getByRole('option', { name: /Comida y bebida/ }))
    await usuario.click(dialogo().getByRole('button', { name: 'Guardar' }))
    await expect.poll(async () => saldosPorDominio(await guardado())[DOM.tharan]).toBe(4451800)
    expect((await guardado()).partida.cambiosDesdeUltimoAvance).toBe(1)
    expect(validarCoherenciaInterna(await guardado())).toEqual([])
  })

  it('J3b: vender una esmeralda', async () => {
    const { usuario, guardado } = await irA('Inventario')
    const fila = screen.getByRole('row', { name: /Esmeralda tallada/ })
    await usuario.click(within(fila).getByRole('button', { name: 'Vender' }))
    await usuario.click(dialogo().getByRole('button', { name: 'Vender' }))
    await expect.poll(async () => (await guardado()).ventas.length).toBe(1)
    expect(validarCoherenciaInterna(await guardado())).toEqual([])
  })

  it('J4b: pagar la deuda con Hobart la deja saldada', async () => {
    const { usuario, guardado } = await irA('Deudas y préstamos')
    const pagos = screen.getAllByRole('button', { name: 'Registrar pago' })
    await usuario.click(pagos[1])
    await usuario.type(dialogo().getByLabelText('Cantidad'), '4')
    await usuario.click(dialogo().getByRole('button', { name: 'Registrar pago' }))
    await expect
      .poll(async () => (await guardado()).deudas.find((d) => d.id === DEUDA.hobart)?.estado)
      .toBe('saldada')
  })

  it('J8: registrar un intento', async () => {
    const { usuario, guardado } = await irA('Hechizos')
    await usuario.click(boton('Registrar intento'))
    await usuario.click(dialogo().getByRole('button', { name: 'Guardar' }))
    await expect.poll(async () => (await guardado()).intentos.length).toBe(6)
  })

  it('J5 y J6 se ven, y un interruptor guarda al instante', async () => {
    const { usuario, guardado } = await irA('Gastos e ingresos')
    const antes = (await guardado()).recurrentes.filter((r) => r.activo).length
    await usuario.click(screen.getAllByRole('button', { name: 'Activo' })[0])
    await expect.poll(async () => (await guardado()).recurrentes.filter((r) => r.activo).length).toBe(antes - 1)
    await usuario.click(
      within(screen.getByRole('navigation', { name: 'Menú de la partida' })).getByRole('button', { name: 'Inversiones' }),
    )
    expect(screen.getByText('El Tonel Dorado')).toBeInTheDocument()
  })
})
