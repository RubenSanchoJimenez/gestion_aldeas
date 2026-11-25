import { describe, expect, it } from 'vitest'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Dominio } from '../modelo/dominios'
import { ordenarDominios } from './orden'

/** Dos asentamientos con la misma alta y uno con una posterior, para comprobar el desempate (D-080). */
const DOMINIOS: Dominio[] = [
  { id: 'dom.personaje', tipo: 'personaje', nombre: 'Aldric' },
  { id: 'dom.zarcero', tipo: 'asentamiento', nombre: 'Zarcero', categoria: 'aldea', alta: { anio: 1640, mes: 1, dia: 1 } },
  { id: 'dom.bree', tipo: 'asentamiento', nombre: 'Bree', categoria: 'pueblo', alta: { anio: 1640, mes: 1, dia: 1 } },
  { id: 'dom.archet', tipo: 'asentamiento', nombre: 'Archet', categoria: 'aldea', alta: { anio: 1640, mes: 2, dia: 20 } },
]

describe('ordenarDominios', () => {
  it('con el ejemplo, da Tharan, Bree y Archet', () => {
    const documento = documentoDeEjemplo()
    expect(ordenarDominios(documento.dominios).map((d) => d.nombre)).toEqual(['Tharan', 'Bree', 'Archet'])
  })

  it('un empate conserva el orden del documento', () => {
    expect(ordenarDominios(DOMINIOS).map((d) => d.nombre)).toEqual(['Aldric', 'Zarcero', 'Bree', 'Archet'])
  })

  it('el alta posterior va después aunque esté antes en el documento', () => {
    const conArchetPrimero: Dominio[] = [DOMINIOS[3], DOMINIOS[1], DOMINIOS[2], DOMINIOS[0]]
    expect(ordenarDominios(conArchetPrimero).map((d) => d.nombre)).toEqual(['Aldric', 'Zarcero', 'Bree', 'Archet'])
  })

  it('no muta la entrada', () => {
    const copia = [...DOMINIOS]
    ordenarDominios(DOMINIOS)
    expect(DOMINIOS).toEqual(copia)
  })
})
