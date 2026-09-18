import * as z from 'zod'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import type { Edad } from '../calendario/formatoFecha'
import type { Recurrencia } from '../calendario/recurrencia'
import type { Importe } from '../dinero/importe'
import { EQUIVALENCIAS_POR_DEFECTO, type Equivalencias, type Moneda } from '../dinero/monedas'
import {
  CAMPOS_EDICION,
  CAMPOS_REGISTRO,
  EsquemaAnioMes,
  EsquemaCantidadRecurso,
  EsquemaConcepto,
  EsquemaEdad,
  EsquemaEquivalencias,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporte,
  EsquemaImporteMagnitud,
  EsquemaImportePositivo,
  EsquemaInstante,
  EsquemaMoneda,
  EsquemaNombreCorto,
  EsquemaNombreLargo,
  EsquemaNombreLibre,
  EsquemaNotas,
  EsquemaPorcentaje,
  EsquemaRecurrencia,
  EsquemaRecurrenciaProduccion,
  EsquemaUbicacionObjeto,
} from './comunes'

/** Los mensajes de un intento fallido, en orden. */
function mensajes(resultado: z.ZodSafeParseResult<unknown>): string[] {
  return resultado.success ? [] : resultado.error.issues.map((problema) => problema.message)
}

describe('tipos de apoyo', () => {
  it('EsquemaId acepta los ids legibles y los UUID, y rechaza los caracteres raros', () => {
    expect(EsquemaId.safeParse('cat.salarios').success).toBe(true)
    expect(EsquemaId.safeParse('defensa.torre-de-vigia').success).toBe(true)
    expect(EsquemaId.safeParse('0f4a1c7e-1f2b-4a3c-9d8e-2b6f0a1c7e4d').success).toBe(true)
    expect(mensajes(EsquemaId.safeParse('cat salarios'))).toEqual(['El identificador no es válido'])
    expect(mensajes(EsquemaId.safeParse(''))).toEqual(['El identificador no es válido'])
    expect(mensajes(EsquemaId.safeParse('a'.repeat(65)))).toEqual(['El identificador no es válido'])
  })

  it('EsquemaInstante acepta un instante ISO 8601 UTC y rechaza lo que no lo es', () => {
    expect(EsquemaInstante.safeParse('2026-09-17T20:15:00.000Z').success).toBe(true)
    expect(EsquemaInstante.safeParse('2026-09-17').success).toBe(false)
    expect(EsquemaInstante.safeParse('12 de abril de 1640').success).toBe(false)
    expect(EsquemaInstante.safeParse('2026-09-17T20:15:00.000+02:00').success).toBe(false)
    expect(EsquemaInstante.safeParse('2026-09-17T20:15:00.000-05:00').success).toBe(false)
    expect(EsquemaInstante.safeParse('2026-09-17T20:15:00.000').success).toBe(false)
  })

  it('EsquemaAnioMes acepta un año y un mes, y rechaza el mes 13', () => {
    expect(EsquemaAnioMes.parse({ anio: 1640, mes: 4 })).toEqual({ anio: 1640, mes: 4 })
    expect(EsquemaAnioMes.safeParse({ anio: 1640, mes: 13 }).success).toBe(false)
    expect(EsquemaAnioMes.safeParse({ anio: 1640, mes: 4.5 }).success).toBe(false)
    expect(EsquemaAnioMes.safeParse({ anio: 9999, mes: 12 }).success).toBe(true)
    expect(EsquemaAnioMes.safeParse({ anio: 10000, mes: 1 }).success).toBe(false)
  })

  it('los campos desconocidos se descartan en vez de viajar en el estado', () => {
    expect(EsquemaAnioMes.parse({ anio: 1640, mes: 4, sobra: 'lo que sea' })).toEqual({ anio: 1640, mes: 4 })
    expect(EsquemaEquivalencias.parse({ ...EQUIVALENCIAS_POR_DEFECTO, mxEnMy: 7 })).toEqual(EQUIVALENCIAS_POR_DEFECTO)
  })

  it('EsquemaUbicacionObjeto admite las cuatro formas y rechaza las demás', () => {
    expect(EsquemaUbicacionObjeto.safeParse({ tipo: 'encima' }).success).toBe(true)
    expect(EsquemaUbicacionObjeto.safeParse({ tipo: 'caja', dominioId: 'dom.bree' }).success).toBe(true)
    expect(EsquemaUbicacionObjeto.safeParse({ tipo: 'almacen', dominioId: 'dom.bree' }).success).toBe(true)
    expect(EsquemaUbicacionObjeto.safeParse({ tipo: 'propia', ubicacionId: 'ubi.casa' }).success).toBe(true)
    expect(EsquemaUbicacionObjeto.safeParse({ tipo: 'caja' }).success).toBe(false)
    expect(EsquemaUbicacionObjeto.safeParse({ tipo: 'bolsa' }).success).toBe(false)
  })

  it('los nombres, el concepto y las notas respetan sus longitudes', () => {
    expect(EsquemaNombreLibre.safeParse('A').success).toBe(true)
    expect(EsquemaNombreLibre.safeParse('').success).toBe(false)
    expect(EsquemaNombreLibre.safeParse('A'.repeat(61)).success).toBe(false)
    expect(EsquemaNombreLargo.safeParse('Posada El Poney Pisador').success).toBe(true)
    expect(EsquemaNombreLargo.safeParse('A').success).toBe(false)
    expect(EsquemaNombreCorto.safeParse('Alojamiento').success).toBe(true)
    expect(EsquemaNombreCorto.safeParse('A'.repeat(41)).success).toBe(false)
    expect(EsquemaConcepto.safeParse('Impuestos de locales · abril (4)').success).toBe(true)
    expect(EsquemaConcepto.safeParse('A'.repeat(121)).success).toBe(false)
    expect(EsquemaNotas.safeParse('Adelanto para el granero').success).toBe(true)
    expect(EsquemaNotas.safeParse('A'.repeat(1001)).success).toBe(false)
  })

  it('EsquemaPorcentaje admite 2 decimales y EsquemaCantidadRecurso no admite negativos', () => {
    expect(EsquemaPorcentaje.safeParse(12.25).success).toBe(true)
    expect(mensajes(EsquemaPorcentaje.safeParse(12.345))).toEqual(['Usa como mucho 2 decimales'])
    expect(EsquemaPorcentaje.safeParse(101).success).toBe(false)
    // La notación exponencial no lleva punto decimal: se colaba mirando solo el texto del número.
    expect(mensajes(EsquemaPorcentaje.safeParse(1e-7))).toEqual(['Usa como mucho 2 decimales'])
    expect(EsquemaPorcentaje.safeParse(0.6).success).toBe(true)
    expect(EsquemaPorcentaje.safeParse(1e2).success).toBe(true)
    expect(EsquemaCantidadRecurso.safeParse(8.3333).success).toBe(true)
    expect(EsquemaCantidadRecurso.safeParse(-1).success).toBe(false)
  })

  it('EsquemaMoneda y EsquemaEdad solo admiten sus valores', () => {
    expect(EsquemaMoneda.safeParse('mo').success).toBe(true)
    expect(EsquemaMoneda.safeParse('euros').success).toBe(false)
    expect(EsquemaEdad.safeParse('tercera').success).toBe(true)
    expect(EsquemaEdad.safeParse('quinta').success).toBe(false)
  })

  it('CAMPOS_REGISTRO trae id y editadoEl, y CAMPOS_EDICION solo editadoEl', () => {
    const conRegistro = z.object({ ...CAMPOS_REGISTRO, nombre: EsquemaNombreLibre })
    expect(conRegistro.safeParse({ id: 'dom.tharan', nombre: 'Tharan' }).success).toBe(true)
    expect(
      conRegistro.safeParse({ id: 'dom.tharan', nombre: 'Tharan', editadoEl: '2026-09-17T20:15:00.000Z' }).success,
    ).toBe(true)
    expect(conRegistro.safeParse({ nombre: 'Tharan' }).success).toBe(false)
    const conEdicion = z.object({ ...CAMPOS_EDICION, dominioId: EsquemaId })
    expect(conEdicion.safeParse({ dominioId: 'dom.bree' }).success).toBe(true)
  })
})

describe('espejos de los valores de la fase 1', () => {
  it('EsquemaFecha acepta el 12 de abril de 1640', () => {
    expect(EsquemaFecha.parse({ anio: 1640, mes: 4, dia: 12 })).toEqual({ anio: 1640, mes: 4, dia: 12 })
  })

  it('EsquemaFecha rechaza el 29 de febrero de 1641 con el mensaje del dominio', () => {
    expect(mensajes(EsquemaFecha.safeParse({ anio: 1641, mes: 2, dia: 29 }))).toEqual([
      'Febrero de 1641 tiene 28 días',
    ])
    expect(mensajes(EsquemaFecha.safeParse({ anio: 1640, mes: 13, dia: 1 }))).toEqual([
      'El mes debe estar entre 1 y 12',
    ])
  })

  it('EsquemaEquivalencias acepta las de la partida y rechaza una equivalencia de 1', () => {
    expect(EsquemaEquivalencias.parse(EQUIVALENCIAS_POR_DEFECTO)).toEqual(EQUIVALENCIAS_POR_DEFECTO)
    expect(mensajes(EsquemaEquivalencias.safeParse({ ...EQUIVALENCIAS_POR_DEFECTO, mmEnMo: 1 }))).toEqual([
      'La equivalencia de mithril debe ser un número entero de 2 o más',
    ])
  })

  it('EsquemaImporte rechaza NaN, Infinity, 2 ** 53 y una cantidad mal tecleada', () => {
    expect(EsquemaImporte.safeParse({ base: -60000 }).success).toBe(true)
    expect(EsquemaImporte.safeParse({ base: 60000, introducido: { cantidad: '0,6', moneda: 'mo' } }).success).toBe(true)
    expect(EsquemaImporte.safeParse({ base: Number.NaN }).success).toBe(false)
    expect(EsquemaImporte.safeParse({ base: Number.POSITIVE_INFINITY }).success).toBe(false)
    expect(EsquemaImporte.safeParse({ base: 2 ** 53 }).success).toBe(false)
    expect(EsquemaImporte.safeParse({ base: 1.5 }).success).toBe(false)
    expect(mensajes(EsquemaImporte.safeParse({ base: 60000, introducido: { cantidad: '6 mp', moneda: 'mp' } }))).toEqual(
      ['La cantidad tecleada no es válida'],
    )
  })

  it('EsquemaImporteMagnitud rechaza los negativos y EsquemaImportePositivo también el 0', () => {
    expect(EsquemaImporteMagnitud.safeParse({ base: 0 }).success).toBe(true)
    expect(mensajes(EsquemaImporteMagnitud.safeParse({ base: -1 }))).toEqual(['El importe no puede ser negativo'])
    expect(EsquemaImportePositivo.safeParse({ base: 1 }).success).toBe(true)
    expect(mensajes(EsquemaImportePositivo.safeParse({ base: 0 }))).toEqual(['El precio debe ser mayor que 0'])
  })

  it('EsquemaRecurrencia acepta las nueve frecuencias', () => {
    const nueve: Recurrencia[] = [
      { tipo: 'diaria' },
      { tipo: 'cadaNDias', n: 10, primera: { anio: 1640, mes: 4, dia: 1 } },
      { tipo: 'semanal', diaSemana: 0 },
      { tipo: 'quincenal', primera: { anio: 1640, mes: 4, dia: 1 } },
      { tipo: 'mensual', diaMes: 1 },
      { tipo: 'cadaNMeses', n: 2, diaMes: 15, primera: { anio: 1640, mes: 4, dia: 15 } },
      { tipo: 'trimestral', diaMes: 1, primera: { anio: 1640, mes: 4, dia: 1 } },
      { tipo: 'anual', mes: 6, diaMes: 24 },
      { tipo: 'unica', fecha: { anio: 1640, mes: 4, dia: 20 } },
    ]
    for (const recurrencia of nueve) {
      expect(EsquemaRecurrencia.safeParse(recurrencia).success).toBe(true)
    }
  })

  it('EsquemaRecurrencia rechaza N = 1 con el mensaje del dominio y un tipo que no existe', () => {
    expect(
      mensajes(EsquemaRecurrencia.safeParse({ tipo: 'cadaNDias', n: 1, primera: { anio: 1640, mes: 4, dia: 1 } })),
    ).toEqual(['N debe ser un número entero de 2 a 366'])
    expect(mensajes(EsquemaRecurrencia.safeParse({ tipo: 'bisemanal' }))).toHaveLength(1)
  })

  it('EsquemaRecurrenciaProduccion no admite «Una sola vez»', () => {
    expect(EsquemaRecurrenciaProduccion.safeParse({ tipo: 'mensual', diaMes: 1 }).success).toBe(true)
    expect(
      EsquemaRecurrenciaProduccion.safeParse({ tipo: 'unica', fecha: { anio: 1640, mes: 4, dia: 20 } }).success,
    ).toBe(false)
  })

  it('cada esquema da exactamente el tipo de la fase 1 (lo comprueba npx tsc -b)', () => {
    expectTypeOf<z.infer<typeof EsquemaMoneda>>().toEqualTypeOf<Moneda>()
    expectTypeOf<z.infer<typeof EsquemaEquivalencias>>().toEqualTypeOf<Equivalencias>()
    expectTypeOf<z.infer<typeof EsquemaImporte>>().toEqualTypeOf<Importe>()
    expectTypeOf<z.infer<typeof EsquemaFecha>>().toEqualTypeOf<Fecha>()
    expectTypeOf<z.infer<typeof EsquemaRecurrencia>>().toEqualTypeOf<Recurrencia>()
    expectTypeOf<z.infer<typeof EsquemaEdad>>().toEqualTypeOf<Edad>()
    expect(true).toBe(true)
  })
})
