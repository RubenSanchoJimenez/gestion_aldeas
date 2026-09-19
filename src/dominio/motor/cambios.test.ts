import { describe, expect, it } from 'vitest'
import { sumarDias, type Fecha } from '../calendario/fecha'
import type { Recurrencia } from '../calendario/recurrencia'
import { CATEGORIA } from '../catalogo/inicial'
import { AVANCES, SNAPSHOT_10_ABRIL } from '../ejemplo/avances'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { ImpuestoRenta } from '../modelo/asentamiento'
import type { CambioAvance } from '../modelo/avance'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { recorrerDias } from './bucle'
import { cambiosDelAvance } from './cambios'
import { idsEnSerie } from './ids'
import { conAsentamiento, estadoMinimo } from './pruebas/constructores'

/** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** Recorre `dias` días desde la fecha actual y devuelve los cambios del avance «sim». */
function cambiosTras(estado: EstadoPartida, dias: number): CambioAvance[] {
  const desde = estado.partida.fechaActual
  const hasta = sumarDias(desde, dias)
  const recorrido = recorrerDias(estado, hasta, {
    avanceId: 'sim',
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
  return cambiosDelAvance(estado, recorrido, 'sim', sumarDias(desde, 1), hasta)
}

/** Solo los textos de los hechos, en su orden. */
function hechos(cambios: readonly CambioAvance[]): string[] {
  return cambios.flatMap((c) => (c.tipo === 'hecho' ? [c.texto] : []))
}

/** Un tributo de 1.000 mh de la aldea de prueba. */
function tributo(id: string, concepto: string, recurrencia: Recurrencia): ImpuestoRenta {
  return {
    id,
    dominioId: 'dom.aldea',
    sentido: 'tributo',
    concepto,
    base: 'fija',
    importe: { base: 1000 },
    categoriaId: CATEGORIA.tributos,
    recurrencia,
  }
}

describe('cambiosDelAvance: filas «saldo»', () => {
  it('da una fila por dominio en el orden de los dominios, también sin movimientos, como AVANCES[3]', () => {
    const cambios = cambiosTras(SNAPSHOT_10_ABRIL, 2)
    expect(cambios).toEqual(AVANCES[3].cambios.filter((c) => c.tipo === 'saldo'))
    expect(cambios.map((c) => (c.tipo === 'saldo' ? c.movimientos : -1))).toEqual([2, 1, 0])
  })

  it('P4: las tres filas «saldo» y los dos hechos del 12 al 19 de abril', () => {
    expect(cambiosTras(estadoDe(documentoDeEjemplo()), 7)).toEqual([
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4651800, despues: 4717800, movimientos: 3 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 34060000, despues: 38050000, movimientos: 4 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 2500000, movimientos: 1 },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Caravana de Fornost de vuelta · 18' },
      { tipo: 'hecho', dominioId: DOM.archet, texto: 'Tributo de Archet pagado · 19' },
    ])
  })
})

describe('cambiosDelAvance: hechos', () => {
  it('escribe el mes si el avance cruza de mes: del 12 de abril al 1 de mayo', () => {
    expect(hechos(cambiosTras(estadoDe(documentoDeEjemplo()), 19))).toEqual([
      'Caravana de Fornost de vuelta · 18 de abril',
      'Tributo de Archet pagado · 19 de abril',
      'Caravana de Tharbad de vuelta · 25 de abril',
      'Tributo de Bree pagado · 30 de abril',
      'Impuestos de locales de Bree cobrados · 1 de mayo',
    ])
  })

  it('escribe el año si el avance cruza de año, y un tributo pagado a medias no es un hecho', () => {
    const delAnio = hechos(cambiosTras(estadoDe(documentoDeEjemplo()), 366))
    expect(delAnio).toContain('Tributo de Archet pagado · 19 de abril de 1640')
    expect(delAnio).toContain('Tributo de Bree pagado · 28 de febrero de 1641')
    expect(delAnio.filter((t) => t.startsWith('Tributo de Archet'))).toEqual([
      'Tributo de Archet pagado · 19 de abril de 1640',
    ])
  })

  it('dos tributos del mismo día dan un solo hecho, y un tributo «Cada día» no da ninguno', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 1000000 })
    const estado: EstadoPartida = {
      ...base,
      impuestosRentas: [
        tributo('imp.peaje-al-senor', 'Peaje al señor', { tipo: 'diaria' }),
        tributo('imp.diezmo', 'Diezmo', { tipo: 'semanal', diaSemana: 0 }),
        tributo('imp.censo', 'Censo', { tipo: 'semanal', diaSemana: 0 }),
      ],
    }
    expect(hechos(cambiosTras(estado, 7))).toEqual(['Tributo de Aldea pagado · 16'])
  })
})
