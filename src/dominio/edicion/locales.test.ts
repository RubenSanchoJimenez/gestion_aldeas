import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM, LOCAL, MOV_BREE, PERSONA, TIPO_LOCAL } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { LocalComercial } from '../modelo/asentamiento'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import {
  altaDeLocal,
  anotarProduccion,
  bloqueoAlEliminarTipoLocal,
  cambiarEstadoDeLocal,
  eliminarLocalComercial,
  eliminarTipoLocal,
  mesesParaAnotar,
  quitarProduccion,
  type DatosLocal,
} from './locales'
import type { Sello } from './registros'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** La fecha actual del ejemplo y el día siguiente. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }
const MANANA: Fecha = { anio: 1640, mes: 4, dia: 13 }

/** Los meses que usan estas pruebas. */
const MARZO = { anio: 1640, mes: 3 }
const ABRIL = { anio: 1640, mes: 4 }
const MAYO = { anio: 1640, mes: 5 }

/** Un sello nuevo en cada prueba: los ids salen «nuevo.1», «nuevo.2»… */
function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

/** La partida de ejemplo congelada: si una función escribe en su entrada, la prueba falla. */
function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

/** El local con ese id, que tiene que estar. */
function local(documento: DocumentoPartida, id: Id): LocalComercial {
  const encontrado = documento.localesComerciales.find((l) => l.id === id)
  if (encontrado === undefined) {
    throw new Error(`Falta el local ${id}`)
  }
  return encontrado
}

/** Una herrería nueva de Bree, con titular y notas. */
const HERRERIA_2: DatosLocal = {
  dominioId: DOM.bree,
  nombre: 'Herrería 2',
  tipoId: TIPO_LOCAL.herreria,
  titularId: PERSONA.hobart,
  produccionHabitual: { base: 800000, introducido: { cantidad: '8', moneda: 'mo' } },
  estado: 'abierto',
  notas: 'Junto a la puerta del sur',
}

describe('altaDeLocal', () => {
  it('da de alta el local hoy, con cobradoHasta en el mes anterior y el primer tramo desde hoy (§7)', () => {
    const documento = ejemplo()
    const { estado, id } = altaDeLocal(documento, HERRERIA_2, sello())
    expect(id).toBe('nuevo.1')
    expect(local(estado, id)).toEqual({
      id: 'nuevo.1',
      dominioId: DOM.bree,
      nombre: 'Herrería 2',
      tipoId: TIPO_LOCAL.herreria,
      titularId: PERSONA.hobart,
      produccionHabitual: { base: 800000, introducido: { cantidad: '8', moneda: 'mo' } },
      cambiosEstado: [{ desde: HOY, estado: 'abierto' }],
      alta: HOY,
      cobradoHasta: MARZO,
      notas: 'Junto a la puerta del sur',
      producciones: [],
    })
    expect(estado.localesComerciales).toHaveLength(5)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('sin titular ni notas no guarda esos campos, y en enero cobradoHasta es diciembre del año anterior', () => {
    const sinOpcionales: DatosLocal = {
      dominioId: DOM.bree,
      nombre: 'Herrería 2',
      tipoId: TIPO_LOCAL.herreria,
      produccionHabitual: { base: 800000 },
      estado: 'cerrado',
    }
    const { estado, id } = altaDeLocal(ejemplo(), sinOpcionales, sello())
    const nuevo = local(estado, id)
    expect(nuevo).not.toHaveProperty('titularId')
    expect(nuevo).not.toHaveProperty('notas')
    expect(nuevo.cambiosEstado).toEqual([{ desde: HOY, estado: 'cerrado' }])
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])

    const documento = documentoDeEjemplo()
    const enEnero = { ...documento, partida: { ...documento.partida, fechaActual: { anio: 1641, mes: 1, dia: 5 } } }
    const creado = altaDeLocal(enEnero, HERRERIA_2, sello())
    expect(local(creado.estado, creado.id).cobradoHasta).toEqual({ anio: 1640, mes: 12 })
  })
})

describe('cambiarEstadoDeLocal', () => {
  it('cerrar hoy un local abierto añade un tramo cerrado desde mañana (§6.4, «Local comercial»)', () => {
    const documento = ejemplo()
    const estado = cambiarEstadoDeLocal(documento, LOCAL.herreria1, 'cerrado', sello())
    const herreria = local(estado, LOCAL.herreria1)
    expect(herreria.cambiosEstado).toEqual([
      { desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' },
      { desde: MANANA, estado: 'cerrado' },
    ])
    expect(herreria.editadoEl).toBe(AHORA)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('cerrar y reabrir el mismo día lo deja como estaba, y abrir uno abierto no cambia nada', () => {
    const documento = ejemplo()
    const cerrado = cambiarEstadoDeLocal(documento, LOCAL.herreria1, 'cerrado', sello())
    const reabierto = cambiarEstadoDeLocal(cerrado, LOCAL.herreria1, 'abierto', sello())
    expect(local(reabierto, LOCAL.herreria1).cambiosEstado).toEqual(local(documento, LOCAL.herreria1).cambiosEstado)
    expect(validarCopia(reabierto, catalogosDeEjemplo())).toEqual([])
    expect(cambiarEstadoDeLocal(documento, LOCAL.herreria1, 'abierto', sello())).toBe(documento)
  })

  it('un local dado de alta hoy cerrado se abre desde mañana', () => {
    const creado = altaDeLocal(ejemplo(), { ...HERRERIA_2, estado: 'cerrado' }, sello())
    const estado = cambiarEstadoDeLocal(creado.estado, creado.id, 'abierto', sello())
    expect(local(estado, creado.id).cambiosEstado).toEqual([
      { desde: HOY, estado: 'cerrado' },
      { desde: MANANA, estado: 'abierto' },
    ])
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })
})

describe('mesesParaAnotar', () => {
  it('ofrece de cobradoHasta + 1 al mes actual, el actual primero, nunca antes del alta (§7; A3c)', () => {
    const documento = ejemplo()
    const tienda = local(documento, LOCAL.tiendaDeTelas)
    expect(mesesParaAnotar(tienda, HOY)).toEqual([ABRIL])
    expect(mesesParaAnotar(tienda, { anio: 1640, mes: 5, dia: 1 })).toEqual([MAYO, ABRIL])
    expect(mesesParaAnotar({ ...tienda, cobradoHasta: { anio: 1640, mes: 1 } }, HOY)).toEqual([ABRIL, MARZO])
    expect(mesesParaAnotar({ ...tienda, cobradoHasta: { anio: 1640, mes: 1 }, alta: { anio: 1640, mes: 4, dia: 1 } }, HOY)).toEqual([
      ABRIL,
    ])
  })
})

describe('anotarProduccion y quitarProduccion', () => {
  it('anota la producción de abril de la herrería (A3c)', () => {
    const documento = ejemplo()
    const anotacion = { mes: ABRIL, importe: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' as const } } }
    const estado = anotarProduccion(documento, LOCAL.herreria1, anotacion, sello())
    const herreria = local(estado, LOCAL.herreria1)
    expect(herreria.producciones).toEqual([anotacion])
    expect(herreria.editadoEl).toBe(AHORA)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('cambia en su sitio la anotación de un mes, y anotar lo mismo no cambia nada', () => {
    const documento = ejemplo()
    const cero = { mes: ABRIL, importe: { base: 0, introducido: { cantidad: '0', moneda: 'mo' as const } }, nota: 'Cerró por las lluvias' }
    const estado = anotarProduccion(documento, LOCAL.tiendaDeTelas, cero, sello())
    expect(local(estado, LOCAL.tiendaDeTelas).producciones).toEqual([cero])
    const igual = { ...local(documento, LOCAL.tiendaDeTelas).producciones[0] }
    expect(anotarProduccion(documento, LOCAL.tiendaDeTelas, igual, sello())).toBe(documento)
  })

  it('un mes ya cobrado o que no ha llegado no se anota ni se quita', () => {
    const documento = ejemplo()
    const error = 'Ese mes no se puede anotar: ya está cobrado o todavía no ha llegado'
    const importe = { base: 100000 }
    expect(() => anotarProduccion(documento, LOCAL.herreria1, { mes: MARZO, importe }, sello())).toThrow(error)
    expect(() => anotarProduccion(documento, LOCAL.herreria1, { mes: MAYO, importe }, sello())).toThrow(error)
    expect(() => quitarProduccion(documento, LOCAL.tiendaDeTelas, MARZO, sello())).toThrow(error)
  })

  it('«Usar la habitual» quita la anotación de ese mes, y sin anotación no cambia nada (A3c)', () => {
    const documento = ejemplo()
    const estado = quitarProduccion(documento, LOCAL.tiendaDeTelas, ABRIL, sello())
    const tienda = local(estado, LOCAL.tiendaDeTelas)
    expect(tienda.producciones).toEqual([])
    expect(tienda.editadoEl).toBe(AHORA)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
    expect(quitarProduccion(documento, LOCAL.herreria1, ABRIL, sello())).toBe(documento)
  })
})

describe('eliminarLocalComercial', () => {
  it('se van sus producciones y su cobro pasado conserva el nombre, sin localId (§6.4, «Al eliminar»)', () => {
    const documento = ejemplo()
    const estado = eliminarLocalComercial(documento, LOCAL.tiendaDeTelas)
    expect(estado.localesComerciales.map((l) => l.id)).toEqual([LOCAL.herreria1, LOCAL.posada, LOCAL.ultramarinos])
    const cobro = estado.movimientos.find((m) => m.id === MOV_BREE.locales)
    const antes = documento.movimientos.find((m) => m.id === MOV_BREE.locales)
    expect(cobro?.detalleLocales?.[2]).toEqual({
      nombre: 'Tienda de telas',
      mes: MARZO,
      produccion: { base: 600000 },
      anotada: false,
      impuesto: { base: 30000 },
    })
    expect(cobro?.detalleLocales?.[0]).toEqual(antes?.detalleLocales?.[0])
    expect(cobro?.importe).toEqual(antes?.importe)
    expect(cobro).not.toHaveProperty('editadoEl')
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })
})

describe('bloqueoAlEliminarTipoLocal y eliminarTipoLocal', () => {
  it('un tipo con locales no se elimina: «cámbialo de tipo antes» (§6.4; D-041)', () => {
    const documento = ejemplo()
    expect(bloqueoAlEliminarTipoLocal(documento, TIPO_LOCAL.herreria)).toBe('Herrería tiene 1 local: cámbialo de tipo antes')
    expect(bloqueoAlEliminarTipoLocal(documento, TIPO_LOCAL.tienda)).toBe('Tienda tiene 2 locales: cámbialos de tipo antes')
    expect(() => eliminarTipoLocal(documento, TIPO_LOCAL.tienda)).toThrow('Tienda tiene 2 locales: cámbialos de tipo antes')
  })

  it('un tipo sin locales no tiene bloqueo y se elimina', () => {
    const sinHerreria = eliminarLocalComercial(ejemplo(), LOCAL.herreria1)
    expect(bloqueoAlEliminarTipoLocal(sinHerreria, TIPO_LOCAL.herreria)).toBeNull()
    const estado = eliminarTipoLocal(sinHerreria, TIPO_LOCAL.herreria)
    expect(estado.tiposLocal.map((t) => t.id)).toEqual([TIPO_LOCAL.posada, TIPO_LOCAL.tienda])
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })
})
