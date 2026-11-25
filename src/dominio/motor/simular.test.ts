import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { ImpuestoRenta, Trabajador } from '../modelo/asentamiento'
import { EsquemaEstadoPartida, type EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { idsEnSerie } from './ids'
import { conAsentamiento, congelar, estadoMinimo } from './pruebas/constructores'
import { simular } from './simular'
import type { OpcionesSimulacion } from './tipos'

/** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** Opciones de una simulación de prueba: ids en serie «sim.1», «sim.2»… y el catálogo del ejemplo. */
function opciones(): OpcionesSimulacion {
  return { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** Un día de abril de 1640. */
function abril(dia: number): Fecha {
  return { anio: 1640, mes: 4, dia }
}

/** 5 asentamientos con 60 reglas cada uno (300 en total) y 5.000 movimientos ya aplicados (§9, técnica 15). */
function partidaGrande(): EstadoPartida {
  let estado = estadoMinimo(HOY)
  for (let n = 1; n <= 5; n++) {
    estado = conAsentamiento(estado, { id: `dom.aldea-${n}`, nombre: `Aldea ${n}`, caja: 100000000, habitantes: 500 })
  }
  const trabajadores: Trabajador[] = []
  const impuestosRentas: ImpuestoRenta[] = []
  const movimientos: Movimiento[] = []
  for (let n = 1; n <= 5; n++) {
    const dominioId = `dom.aldea-${n}`
    for (let i = 0; i < 20; i++) {
      trabajadores.push({
        id: `trab.${n}.${i}`,
        dominioId,
        oficioId: 'oficio.granjero',
        numero: 2,
        salario: { base: 1000 },
        recurrencia: { tipo: 'semanal', diaSemana: i % 7 },
      })
      impuestosRentas.push({
        id: `imp.${n}.${i}`,
        dominioId,
        sentido: 'ingreso',
        concepto: `Impuesto ${i}`,
        base: i % 2 === 0 ? 'fija' : 'porHabitante',
        importe: { base: 1000 },
        categoriaId: CATEGORIA.impuestos,
        recurrencia: { tipo: 'diaria' },
      })
      impuestosRentas.push({
        id: `trib.${n}.${i}`,
        dominioId,
        sentido: 'tributo',
        concepto: `Tributo ${i}`,
        base: 'fija',
        importe: { base: 5000 },
        categoriaId: CATEGORIA.tributos,
        recurrencia: { tipo: 'mensual', diaMes: i + 1 },
      })
    }
    for (let i = 0; i < 1000; i++) {
      movimientos.push({
        id: `mov.${n}.${i}`,
        dominioId,
        fecha: HOY,
        tipo: 'ingreso',
        importe: { base: 100 },
        categoriaId: CATEGORIA.otros,
        concepto: 'Venta en el mercado',
        origen: 'manual',
        programado: false,
      })
    }
  }
  return { ...estado, trabajadores, impuestosRentas, movimientos }
}

describe('simular: P4 del 12 al 19 de abril', () => {
  it('avanza 7 días y crea los 8 movimientos de la vista previa (gen l.502-542)', () => {
    const resultado = simular(documentoDeEjemplo(), 7, opciones())
    expect(resultado.avanceId).toBe('sim')
    expect(resultado.desde).toEqual(HOY)
    expect(resultado.hasta).toEqual(abril(19))
    expect(resultado.estadoNuevo.partida.fechaActual).toEqual(abril(19))
    const nuevos = resultado.estadoNuevo.movimientos.filter((m) => m.avanceId === 'sim')
    expect(nuevos).toHaveLength(8)
    expect(nuevos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dominioId: DOM.bree,
          fecha: abril(13),
          importe: { base: -420000 },
          concepto: 'Salarios de 14 trabajadores',
        }),
        expect.objectContaining({
          dominioId: DOM.bree,
          fecha: abril(15),
          importe: { base: 1800000 },
          concepto: 'Aranceles del mercado',
        }),
        expect.objectContaining({
          dominioId: DOM.tharan,
          fecha: abril(15),
          importe: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
          concepto: 'Beneficio de Barcaza del Brandivino',
        }),
        expect.objectContaining({
          dominioId: DOM.bree,
          fecha: abril(18),
          importe: { base: 2400000, introducido: { cantidad: '24', moneda: 'mo' } },
          concepto: 'Caravana: venta de cerveza en Fornost',
        }),
        expect.objectContaining({
          dominioId: DOM.archet,
          fecha: abril(19),
          importe: { base: -6000000, introducido: { cantidad: '60', moneda: 'mo' } },
          concepto: 'Tributo a la Corona',
        }),
        expect.objectContaining({
          dominioId: DOM.bree,
          fecha: abril(19),
          importe: { base: 210000 },
          concepto: 'Peaje del camino · 7 días',
        }),
        expect.objectContaining({
          dominioId: DOM.tharan,
          fecha: abril(19),
          importe: { base: -70000 },
          concepto: 'Posada El Poney Pisador · 7 noches',
        }),
        expect.objectContaining({
          dominioId: DOM.tharan,
          fecha: abril(19),
          importe: { base: -14000 },
          concepto: 'Establo del poni · 7 días',
        }),
      ]),
    )
    expect(resultado.cambios.filter((c) => c.tipo === 'saldo')).toEqual([
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4651800, despues: 4717800, movimientos: 3 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 34060000, despues: 38050000, movimientos: 4 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 2500000, movimientos: 1 },
    ])
  })

  it('devuelve los avisos de O10 (19 de abril) sin fecha y sin personas nuevas', () => {
    const resultado = simular(documentoDeEjemplo(), 7, opciones())
    expect(resultado.avisos).toEqual([
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 23 de abril y la caravana de Tharbad no vuelve hasta el 25 de abril',
      },
      {
        tipo: 'deudaQueVence',
        color: 'ambar',
        dominioId: DOM.tharan,
        texto: 'Mañana vence la deuda de 4 mo con Hobart Brezal, herrero',
      },
      {
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Se perderán 7 fardos de lana en Bree el 19 de mayo',
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de julio',
      },
    ])
    expect(resultado.personasNuevas).toEqual([])
  })

  it('a los 105 días añade «Trabajadores de Archet» a Personas y entidades (§9 l.1295)', () => {
    const resultado = simular(documentoDeEjemplo(), 105, opciones())
    expect(resultado.personasNuevas).toEqual([{ id: expect.any(String), nombre: 'Trabajadores de Archet' }])
    expect(resultado.estadoNuevo.personas).toContainEqual(resultado.personasNuevas[0])
  })

  it('a 98 días trae la falta de víveres de Bree del 23 de abril, con lo que faltó (T19)', () => {
    const resultado = simular(documentoDeEjemplo(), 98, opciones())
    expect(resultado.avisos).toContainEqual({
      tipo: 'faltaDeRecurso',
      color: 'rojo',
      dominioId: DOM.bree,
      texto: 'Los víveres de Bree se agotaron el 23 de abril: faltaron 2.217 sacos',
    })
    expect(resultado.flujos.length).toBeGreaterThan(0)
  })
})

describe('simular: entrada y días', () => {
  it('lanza RangeError con el mensaje del campo de días si no valen (§9 l.1323-1324)', () => {
    const vispera = estadoMinimo({ anio: 9999, mes: 12, dia: 30 })
    const casos: [EstadoPartida, number, string][] = [
      [documentoDeEjemplo(), 0, 'Los días de un avance van de 1 a 366'],
      [documentoDeEjemplo(), 367, 'Los días de un avance van de 1 a 366'],
      [vispera, 2, 'No se puede avanzar más allá del 31 de diciembre de 9999'],
    ]
    for (const [estado, dias, mensaje] of casos) {
      expect(() => simular(estado, dias, opciones())).toThrowError(RangeError)
      expect(() => simular(estado, dias, opciones())).toThrowError(mensaje)
    }
  })

  it('con un DocumentoPartida no arrastra `avances`: el estado nuevo tiene las 34 claves (T12)', () => {
    const resultado = simular(documentoDeEjemplo(), 1, opciones())
    expect(Object.keys(resultado.estadoNuevo).sort()).toEqual(Object.keys(EsquemaEstadoPartida.shape).sort())
    expect('avances' in resultado.estadoNuevo).toBe(false)
  })

  it('con los mismos ids da el mismo resultado (T1)', () => {
    expect(simular(documentoDeEjemplo(), 30, opciones())).toEqual(simular(documentoDeEjemplo(), 30, opciones()))
  })

  it('no toca la entrada: simula sobre un documento congelado (T29)', () => {
    const entrada = congelar(documentoDeEjemplo())
    simular(entrada, 30, opciones())
    expect(entrada).toEqual(documentoDeEjemplo())
  })

  it('prueba de humo: 5 asentamientos, 300 reglas y 5.000 movimientos durante 366 días en menos de 1 s', () => {
    const estado = partidaGrande()
    const inicio = performance.now()
    const resultado = simular(estado, 366, opciones())
    const duracion = performance.now() - inicio
    expect(resultado.hasta).toEqual({ anio: 1641, mes: 4, dia: 13 })
    expect(resultado.estadoNuevo.movimientos.length).toBeGreaterThan(5000)
    expect(duracion).toBeLessThan(1000)
  })
})
