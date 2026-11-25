import { describe, expect, it } from 'vitest'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe } from '../modelo/documento'
import { congelar } from '../motor/pruebas/constructores'
import { marcasDelCalendario } from './marcas'

const abril = (dia: number) => ({ anio: 1640, mes: 4, dia })
const marcas = (desde: number, hasta: number) =>
  marcasDelCalendario(congelar(estadoDe(documentoDeEjemplo())), catalogosDeEjemplo(), abril(desde), abril(hasta))
const textos = (desde: number, hasta: number, dia: number) =>
  marcas(desde, hasta)
    .filter((m) => m.fecha.dia === dia)
    .map((m) => m.texto)

describe('marcasDelCalendario (P3)', () => {
  it('marca el vencimiento de Hobart el 20, como aviso sin signo', () => {
    const vence = marcas(13, 30).find((m) => m.fecha.dia === 20 && m.texto.startsWith('Vence deuda'))
    expect(vence).toMatchObject({ tipo: 'aviso', detalle: 'Vence · 4 mo pendientes' })
  })

  it('marca la falta prevista de víveres de Bree el 23', () => {
    expect(textos(13, 30, 23)).toContain('Sin víveres')
  })

  it('el día 1 pasado tiene la salida de la caravana, la producción y los impuestos de locales', () => {
    const del1 = textos(1, 12, 1)
    expect(del1).toContain('Impuesto locales')
    expect(del1.some((t) => t.startsWith('Sale caravana'))).toBe(true)
    expect(del1.some((t) => t.startsWith('Producción de'))).toBe(true)
  })

  it('respeta el rango pedido y va ordenado', () => {
    const lista = marcas(13, 19)
    expect(lista.every((m) => m.fecha.dia >= 13 && m.fecha.dia <= 19)).toBe(true)
    expect(lista.map((m) => m.fecha.dia)).toEqual([...lista.map((m) => m.fecha.dia)].sort((a, b) => a - b))
  })
})
