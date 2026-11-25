import { describe, expect, it } from 'vitest'
import { DOM, PERSONA, RECURRENTE } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { editarPersonaje, personaPorNombre, ubicacionPorNombre } from './listas'
import { crearRecurrente, editarRecurrente } from './recurrentes'
import type { Sello } from './registros'

const sello = (): Sello => ({ ahora: '2026-11-25T10:00:00.000Z', nuevoId: idsEnSerie('ed') })
const estado = () => congelar(estadoDe(documentoDeEjemplo()))

describe('listas de la partida', () => {
  it('reutiliza la persona con el mismo nombre normalizado y crea la que falta', () => {
    const actual = estado()
    expect(personaPorNombre(actual, '  hobart brezal, HERRERO ', sello())).toEqual({
      estado: actual,
      id: PERSONA.hobart,
    })
    const nueva = personaPorNombre(actual, 'Beorn', sello())
    expect(nueva.estado.personas.at(-1)).toEqual({ id: nueva.id, nombre: 'Beorn' })
    expect(() => personaPorNombre(actual, 'B', sello())).toThrow('de 2 a 60')
    expect(ubicacionPorNombre(actual, 'Cueva', sello()).estado.ubicaciones).toHaveLength(3)
  })

  it('edita el personaje y no cambia nada si no hay cambios', () => {
    const actual = estado()
    const personaje = actual.dominios.find((d) => d.id === DOM.tharan)!
    const descripcion = personaje.tipo === 'personaje' ? (personaje.descripcion ?? '') : ''
    expect(editarPersonaje(actual, DOM.tharan, { nombre: personaje.nombre, descripcion }, sello())).toBe(actual)
    expect(() => editarPersonaje(actual, DOM.tharan, { nombre: ' ', descripcion }, sello())).toThrow('nombre')
  })

  it('crea y edita una regla recurrente', () => {
    const actual = estado()
    const regla = actual.recurrentes.find((r) => r.id === RECURRENTE.posada) ?? actual.recurrentes[0]
    const { id: _id, editadoEl: _e, ...datos } = regla
    expect(editarRecurrente(actual, regla.id, datos, sello())).toBe(actual)
    expect(crearRecurrente(actual, datos, sello()).estado.recurrentes).toHaveLength(actual.recurrentes.length + 1)
    expect(() => crearRecurrente(actual, { ...datos, concepto: ' ' }, sello())).toThrow('concepto')
  })
})
