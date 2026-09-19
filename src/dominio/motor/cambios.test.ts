import { describe, expect, it } from 'vitest'
import { sumarDias, type Fecha } from '../calendario/fecha'
import type { Recurrencia } from '../calendario/recurrencia'
import { CATEGORIA, RECURSO } from '../catalogo/inicial'
import { AVANCES, SNAPSHOT_10_ABRIL } from '../ejemplo/avances'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Edificio, ImpuestoRenta } from '../modelo/asentamiento'
import type { CambioAvance } from '../modelo/avance'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { recorrerDias } from './bucle'
import { cambiosDelAvance } from './cambios'
import { idsEnSerie } from './ids'
import { conAsentamiento, conFila, estadoMinimo } from './pruebas/constructores'

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
  it('da una fila por dominio en el orden de los dominios, también sin movimientos, como AVANCES[3] (T15: y las cuatro filas «almacen»)', () => {
    const cambios = cambiosTras(SNAPSHOT_10_ABRIL, 2)
    const esperados = AVANCES[3].cambios
    const saldos = cambios.filter((c) => c.tipo === 'saldo')
    expect(saldos).toEqual(esperados.filter((c) => c.tipo === 'saldo'))
    expect(saldos.map((c) => (c.tipo === 'saldo' ? c.movimientos : -1))).toEqual([2, 1, 0])
    // Regresión 10 → 12 (O11): las cuatro filas «almacen» vuelven a las cantidades ya guardadas en el ejemplo,
    // con el ruido de coma flotante que avisa TC1 (310,00000000000006 no es 310: toBeCloseTo, no toEqual).
    const almacenes = cambios.filter((c) => c.tipo === 'almacen')
    const almacenesEsperados = esperados.filter((c) => c.tipo === 'almacen')
    expect(almacenes).toHaveLength(almacenesEsperados.length)
    almacenes.forEach((a, i) => {
      if (a.tipo !== 'almacen') return
      const e = almacenesEsperados[i]
      if (e.tipo !== 'almacen') return
      expect(a.dominioId).toBe(e.dominioId)
      expect(a.recursoId).toBe(e.recursoId)
      expect(a.antes).toBeCloseTo(e.antes, 3)
      expect(a.despues).toBeCloseTo(e.despues, 3)
    })
  })

  it('P4: las tres filas «saldo», las cinco filas «almacen» de Bree y de Archet, y los cuatro hechos del 12 al 19 de abril (O1, O11)', () => {
    const cambios = cambiosTras(estadoDe(documentoDeEjemplo()), 7)
    expect(cambios.slice(0, 3)).toEqual([
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4651800, despues: 4717800, movimientos: 3 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 34060000, despues: 38050000, movimientos: 4 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 2500000, movimientos: 1 },
    ])
    const almacenes = cambios.filter((c) => c.tipo === 'almacen')
    expect(almacenes).toHaveLength(6)
    const redondeadas = almacenes.map((a) =>
      a.tipo === 'almacen' ? { dominioId: a.dominioId, recursoId: a.recursoId, antes: a.antes, despues: Math.round(a.despues * 1000) / 1000 } : a,
    )
    expect(redondeadas).toEqual([
      { dominioId: DOM.bree, recursoId: 'recurso.viveres', antes: 310, despues: 92.667 },
      { dominioId: DOM.bree, recursoId: 'recurso.madera', antes: 420, despues: 385.56 },
      { dominioId: DOM.bree, recursoId: 'recurso.piedra', antes: 180, despues: 196.667 },
      { dominioId: DOM.bree, recursoId: 'recurso.cerveza', antes: 90, despues: 83.96 },
      { dominioId: DOM.bree, recursoId: 'recurso.lana', antes: 35, despues: 47 },
      { dominioId: DOM.archet, recursoId: 'recurso.viveres', antes: 900, despues: 827.667 },
    ])
    expect(hechos(cambios)).toEqual([
      'Feria de primavera · 15 al 17',
      'Obra «Reparación de la puerta del sur» terminada · 17',
      'Caravana de Fornost de vuelta · 18',
      'Tributo de Archet pagado · 19',
    ])
  })

  it('una fila nueva del almacén sale con `antes: 0` (TC11, D-056)', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.prueba', nombre: 'Prueba', caja: 0 })
    const edificio: Edificio = {
      id: 'ed.prueba',
      dominioId: 'dom.prueba',
      tipoId: 'tipo.edificio',
      nombre: 'Cantera de prueba',
      estado: 'activo',
      trabajadoresNecesarios: 0,
      producciones: [
        {
          id: 'prod.prueba',
          recursoId: RECURSO.piedra,
          cantidad: 10,
          recurrencia: { tipo: 'diaria' },
          acumulado: { desde: sumarDias(HOY, 1), sumaFactores: 0 },
        },
      ],
    }
    const estado: EstadoPartida = { ...base, edificios: [edificio] }
    const cambios = cambiosTras(estado, 1)
    expect(cambios.filter((c) => c.tipo === 'almacen')).toEqual([
      { tipo: 'almacen', dominioId: 'dom.prueba', recursoId: RECURSO.piedra, antes: 0, despues: 10 },
    ])
  })

  it('solo las filas que cambian, en el orden de dominios y, dentro, de existencias', () => {
    const conA = conAsentamiento(estadoMinimo(HOY), { id: 'dom.a', nombre: 'A', caja: 0 })
    const conB = conAsentamiento(conA, { id: 'dom.b', nombre: 'B', caja: 0 })
    const conVideresDeA = conFila(conB, { dominioId: 'dom.a', recursoId: RECURSO.viveres, cantidad: 100 })
    const estado: EstadoPartida = {
      ...conFila(conFila(conVideresDeA, { dominioId: 'dom.a', recursoId: RECURSO.piedra, cantidad: 5 }), {
        dominioId: 'dom.b',
        recursoId: RECURSO.madera,
        cantidad: 5,
      }),
      poblaciones: [
        { dominioId: 'dom.a', habitantesIniciales: 30, cambios: [], consumos: [] },
        { dominioId: 'dom.b', habitantesIniciales: 0, cambios: [], consumos: [] },
      ],
    }
    // Solo víveres de A cambia (consumo de la ración); la piedra de A y la madera de B se quedan igual.
    const cambios = cambiosTras(estado, 1)
    const almacenes = cambios.filter((c) => c.tipo === 'almacen')
    expect(almacenes).toHaveLength(1)
    expect(almacenes[0]).toMatchObject({ tipo: 'almacen', dominioId: 'dom.a', recursoId: RECURSO.viveres })
  })
})

describe('cambiosDelAvance: hechos', () => {
  it('escribe el mes si el avance cruza de mes: del 12 de abril al 1 de mayo (O11: 19 días, con las obras y la caravana de Tharbad)', () => {
    expect(hechos(cambiosTras(estadoDe(documentoDeEjemplo()), 19))).toEqual([
      'Lluvias de primavera · 8 al 21 de abril',
      'Feria de primavera · 15 al 17 de abril',
      'Obra «Reparación de la puerta del sur» terminada · 17 de abril',
      'Caravana de Fornost de vuelta · 18 de abril',
      'Tributo de Archet pagado · 19 de abril',
      'Caravana de Tharbad de vuelta · 25 de abril',
      'Obra «Molino» terminada · 28 de abril',
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

  it('hechos de traslado y de un evento de partida, este último sin `dominioId` (D-052)', () => {
    const conOrigen = conAsentamiento(estadoMinimo(HOY), { id: 'dom.origen', nombre: 'Origen', caja: 0 })
    const base = conAsentamiento(conOrigen, { id: 'dom.destino', nombre: 'Destino', caja: 0 })
    const manana = sumarDias(HOY, 1)
    const estado: EstadoPartida = {
      ...base,
      caravanas: [
        {
          id: 'car.prueba',
          dominioId: 'dom.origen',
          operacion: 'traslado',
          destinoId: 'dom.destino',
          carga: { recursoId: RECURSO.madera, cantidad: 10 },
          salida: HOY,
          vuelta: manana,
          estado: 'enRuta',
        },
      ],
      eventos: [{ id: 'evt.mensajero', nombre: 'Visita del mensajero real', inicio: manana, duracionDias: 1, efectos: [] }],
    }
    const cambios = cambiosTras(estado, 1)
    expect(hechos(cambios)).toEqual(['Caravana de Origen llegada a Destino · 13', 'Visita del mensajero real · 13'])
    const hechoEvento = cambios.find((c) => c.tipo === 'hecho' && c.texto === 'Visita del mensajero real · 13')
    expect(hechoEvento && 'dominioId' in hechoEvento).toBe(false)
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
