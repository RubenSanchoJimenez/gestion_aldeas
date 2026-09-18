import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM, IMPUESTO, PERSONA, RECURRENTE } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { EsquemaDeuda } from '../modelo/deudas'
import { estadoDe } from '../modelo/documento'
import { crearContexto, type Contexto } from './contexto'
import { idsEnSerie } from './ids'
import { personaPara, registrarImpago, sumarAlCargo, type Impago } from './impagos'
import { congelar } from './pruebas/constructores'

const HASTA: Fecha = { anio: 1640, mes: 7, dia: 26 }
const DIA_19_JULIO: Fecha = { anio: 1640, mes: 7, dia: 19 }
const DIA_26_JULIO: Fecha = { anio: 1640, mes: 7, dia: 26 }

/** El ejemplo del 12 de abril, congelado, con un avance hasta el 26 de julio. */
function contexto(): Contexto {
  const estado = congelar(estadoDe(documentoDeEjemplo()))
  return crearContexto(estado, HASTA, { avanceId: 'av.prueba', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() })
}

/** El tributo de Archet del 19 de julio que la caja no cubre: faltan 18,8 mo (apartado 4.1, impago natural). */
const TRIBUTO_19_JULIO: Impago = {
  origen: { tipo: 'tributo', id: IMPUESTO.tributoArchet },
  dominioId: DOM.archet,
  contraparte: 'Corona de Arthedain',
  fecha: DIA_19_JULIO,
  importe: 1880000,
}

/** Los salarios de Archet del 26 de julio, sin nada en la caja: 3,2 mo con «Trabajadores de Archet». */
const SALARIOS_26_JULIO: Impago = {
  origen: { tipo: 'salarios', id: DOM.archet },
  dominioId: DOM.archet,
  contraparte: 'Trabajadores de Archet',
  fecha: DIA_26_JULIO,
  importe: 320000,
}

describe('personaPara', () => {
  it('reutiliza la persona con el mismo nombre normalizado, sin crear ninguna (§9 l.1295)', () => {
    const ctx = contexto()
    expect(personaPara(ctx, '  corona de ARTHÉDAIN ')).toBe(PERSONA.corona)
    expect(ctx.personasNuevas).toEqual([])
    expect(ctx.personas).toHaveLength(6)
  })

  it('crea la que falta, la apunta en personasNuevas y la reutiliza después', () => {
    const ctx = contexto()
    const id = personaPara(ctx, 'Trabajadores de Archet')
    expect(id).toBe('sim.1')
    expect(ctx.personasNuevas).toEqual([{ id: 'sim.1', nombre: 'Trabajadores de Archet' }])
    expect(ctx.personas).toHaveLength(7)
    expect(personaPara(ctx, 'trabajadores de archet')).toBe('sim.1')
    expect(ctx.personasNuevas).toHaveLength(1)
  })
})

describe('registrarImpago', () => {
  it('crea la deuda de impago con los campos de T25 y la contraparte que ya existe', () => {
    const ctx = contexto()
    const cargo = registrarImpago(ctx, TRIBUTO_19_JULIO)
    expect(cargo).toEqual({ deudaId: 'sim.1', indice: 0 })
    const deuda = ctx.deudas[ctx.deudas.length - 1]
    expect(deuda).toEqual({
      id: 'sim.1',
      dominioId: DOM.archet,
      sentido: 'debo',
      contraparteId: PERSONA.corona,
      fecha: DIA_19_JULIO,
      principal: { base: 1880000 },
      interesPct: 0,
      estado: 'abierta',
      impago: true,
      origenImpago: { tipo: 'tributo', id: IMPUESTO.tributoArchet },
      cargos: [{ fecha: DIA_19_JULIO, importe: { base: 1880000 }, avanceId: 'av.prueba' }],
      pagos: [],
      devengos: [],
    })
    expect(EsquemaDeuda.safeParse(deuda).success).toBe(true)
    expect(ctx.personasNuevas).toEqual([])
  })

  it('crea la contraparte que falta, ya ajustada: «Trabajadores de Archet», «Todos (impago)» (§9 l.1295, D-023)', () => {
    const ctx = contexto()
    const cargo = registrarImpago(ctx, SALARIOS_26_JULIO)
    const deuda = ctx.deudas.find((d) => d.id === cargo.deudaId)
    expect(ctx.personasNuevas).toEqual([{ id: deuda?.contraparteId, nombre: 'Trabajadores de Archet' }])
    expect(deuda?.origenImpago).toEqual({ tipo: 'salarios', id: DOM.archet })
    expect(deuda?.principal).toEqual({ base: 320000 })
    registrarImpago(ctx, {
      origen: { tipo: 'recurrente', id: RECURRENTE.escolta },
      dominioId: DOM.tharan,
      contraparte: 'Todos',
      fecha: DIA_19_JULIO,
      importe: 50000,
    })
    expect(ctx.personasNuevas.map((p) => p.nombre)).toEqual(['Trabajadores de Archet', 'Todos (impago)'])
  })

  it('suma el cargo a la deuda abierta del mismo origen, y no a la de otro (§9 l.1296)', () => {
    const ctx = contexto()
    const primero = registrarImpago(ctx, TRIBUTO_19_JULIO)
    registrarImpago(ctx, SALARIOS_26_JULIO)
    const segundo = registrarImpago(ctx, { ...TRIBUTO_19_JULIO, fecha: DIA_26_JULIO, importe: 100000 })
    expect(segundo).toEqual({ deudaId: primero.deudaId, indice: 1 })
    const deImpago = ctx.deudas.filter((d) => d.impago)
    expect(deImpago).toHaveLength(2)
    const tributo = deImpago.find((d) => d.id === primero.deudaId)
    expect(tributo?.fecha).toEqual(DIA_19_JULIO)
    expect(tributo?.principal).toEqual({ base: 1980000 })
    expect(tributo?.cargos).toEqual([
      { fecha: DIA_19_JULIO, importe: { base: 1880000 }, avanceId: 'av.prueba' },
      { fecha: DIA_26_JULIO, importe: { base: 100000 }, avanceId: 'av.prueba' },
    ])
    expect(EsquemaDeuda.safeParse(tributo).success).toBe(true)
  })

  it('una deuda de impago saldada ya no recibe cargos: se abre otra', () => {
    const ctx = contexto()
    const vieja = registrarImpago(ctx, TRIBUTO_19_JULIO)
    const indice = ctx.deudas.findIndex((d) => d.id === vieja.deudaId)
    ctx.deudas[indice] = { ...ctx.deudas[indice], estado: 'saldada' }
    const nueva = registrarImpago(ctx, { ...TRIBUTO_19_JULIO, fecha: DIA_26_JULIO })
    expect(nueva.deudaId).not.toBe(vieja.deudaId)
    expect(nueva.indice).toBe(0)
    expect(ctx.deudas.filter((d) => d.impago)).toHaveLength(2)
  })
})

describe('sumarAlCargo', () => {
  it('suma al cargo que abrió un diario y al principal de su deuda (D-021)', () => {
    const ctx = contexto()
    registrarImpago(ctx, TRIBUTO_19_JULIO)
    const posada = registrarImpago(ctx, {
      origen: { tipo: 'recurrente', id: RECURRENTE.posada },
      dominioId: DOM.tharan,
      contraparte: 'Posada El Poney Pisador',
      fecha: DIA_19_JULIO,
      importe: 10000,
    })
    sumarAlCargo(ctx, posada, 10000)
    sumarAlCargo(ctx, posada, 10000)
    const deuda = ctx.deudas.find((d) => d.id === posada.deudaId)
    expect(deuda?.principal).toEqual({ base: 30000 })
    expect(deuda?.cargos).toEqual([{ fecha: DIA_19_JULIO, importe: { base: 30000 }, avanceId: 'av.prueba' }])
    expect(() => sumarAlCargo(ctx, { deudaId: 'deuda.inventada', indice: 0 }, 1)).toThrow('No existe «deuda.inventada»')
  })
})
