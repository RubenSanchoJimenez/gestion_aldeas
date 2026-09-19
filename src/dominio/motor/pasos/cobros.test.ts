import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, compararFechas, type Fecha } from '../../calendario/fecha'
import { CATEGORIA } from '../../catalogo/inicial'
import { eventosConEfectosEl } from '../../eventos/efectos'
import { DOM, IMPUESTO, INVERSION, RECURRENTE } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import type { Movimiento } from '../../modelo/movimientos'
import { crearContexto, type Contexto, type Dia } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, congelar, estadoMinimo } from '../pruebas/constructores'
import { pasoCobros } from './cobros'

/** El avance de prueba: todo lo que crea o aplica lleva este avanceId. */
const AVANCE_PRUEBA = 'av.prueba'

/** Un día de abril de 1640, o del mes que se pida. */
function fecha(dia: number, mes = 4): Fecha {
  return { anio: 1640, mes, dia }
}

/** La partida de ejemplo del 12 de abril, sin la lista de avances. */
function ejemplo(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

/** Un contexto sobre la entrada congelada: si el paso escribiera en ella, la prueba lanzaría. */
function contexto(estado: EstadoPartida, hasta: Fecha): Contexto {
  return crearContexto(congelar(estado), hasta, {
    avanceId: AVANCE_PRUEBA,
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
}

/** El día tal como lo deja el paso 1: con los eventos de dinero activos. */
function diaDe(ctx: Contexto, f: Fecha): Dia {
  return {
    fecha: f,
    numero: aNumeroDeDia(f),
    primero: compararFechas(f, ctx.primerDia) === 0,
    eventos: eventosConEfectosEl(ctx.estado.eventos, f),
  }
}

/** Los movimientos que el avance de prueba ha creado o aplicado. */
function delAvance(ctx: Contexto): Movimiento[] {
  return ctx.movimientos.filter((m) => m.avanceId === AVANCE_PRUEBA)
}

/** El movimiento del avance que sale de una regla. */
function deLaRegla(ctx: Contexto, reglaId: string): Movimiento | undefined {
  return delAvance(ctx).find((m) => m.regla?.id === reglaId)
}

describe('pasoCobros: impuestos y rentas', () => {
  it('un impuesto por habitante cobra 1.000 mh × 1.240 habitantes el 1 de mayo, sin lo introducido', () => {
    const ctx = contexto(ejemplo(), fecha(1, 5))
    pasoCobros(ctx, diaDe(ctx, fecha(1, 5)))
    expect(deLaRegla(ctx, IMPUESTO.hogar)).toEqual({
      id: expect.any(String),
      dominioId: DOM.bree,
      fecha: fecha(1, 5),
      tipo: 'ingreso',
      importe: { base: 1240000 },
      categoriaId: CATEGORIA.impuestos,
      concepto: 'Impuesto por hogar',
      origen: 'avance',
      avanceId: AVANCE_PRUEBA,
      regla: { tipo: 'impuesto', id: IMPUESTO.hogar },
      programado: false,
    })
  })

  it('los aranceles del 15 de abril, con la feria (+500 %), cobran 1.800.000 sin lo introducido y con el concepto de la regla', () => {
    const ctx = contexto(ejemplo(), fecha(15))
    pasoCobros(ctx, diaDe(ctx, fecha(15)))
    const aranceles = deLaRegla(ctx, IMPUESTO.aranceles)
    expect(aranceles?.importe).toEqual({ base: 1800000 })
    expect(aranceles?.concepto).toBe('Aranceles del mercado')
    expect(aranceles?.categoriaId).toBe(CATEGORIA.aranceles)
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000 + 1800000 + 30000)
  })

  it('los aranceles del 22 de abril, sin evento, cobran su base con lo introducido: «3 mo» (T8)', () => {
    const ctx = contexto(ejemplo(), fecha(22))
    pasoCobros(ctx, diaDe(ctx, fecha(22)))
    expect(deLaRegla(ctx, IMPUESTO.aranceles)?.importe).toEqual({
      base: 300000,
      introducido: { cantidad: '3', moneda: 'mo' },
    })
  })

  it('un evento de −100 % sobre todos los ingresos deja los impuestos en 0: ni cobro ni movimiento (D-022)', () => {
    const base = ejemplo()
    const estado: EstadoPartida = {
      ...base,
      eventos: [
        ...base.eventos,
        {
          id: 'ev.prueba.cierre',
          dominioId: DOM.bree,
          nombre: 'Cierre del camino',
          inicio: fecha(22),
          duracionDias: 1,
          efectos: [{ ambito: 'ingresos', objetivo: { tipo: 'todos' }, pct: -100 }],
        },
      ],
    }
    const ctx = contexto(estado, fecha(22))
    pasoCobros(ctx, diaDe(ctx, fecha(22)))
    expect(delAvance(ctx)).toEqual([])
    expect(ctx.diarios.size).toBe(0)
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000)
  })

  it('un impuesto «Cada día» cobra ya, pero va al acumulado del avance y no crea movimiento ese día (§9 l.1285)', () => {
    const ctx = contexto(ejemplo(), fecha(13))
    pasoCobros(ctx, diaDe(ctx, fecha(13)))
    expect(deLaRegla(ctx, IMPUESTO.peaje)).toBeUndefined()
    const peaje = ctx.diarios.get(`impuesto|${IMPUESTO.peaje}`)
    expect(peaje?.importe).toBe(30000)
    expect(peaje?.dias).toBe(1)
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000 + 30000)
  })
})

describe('pasoCobros: beneficios e ingresos recurrentes', () => {
  it('el beneficio de la Barcaza del 15 de abril entra en la bolsa con su regla, su inversionId y «1,5 mo»', () => {
    const ctx = contexto(ejemplo(), fecha(15))
    pasoCobros(ctx, diaDe(ctx, fecha(15)))
    expect(deLaRegla(ctx, INVERSION.barcaza)).toEqual({
      id: expect.any(String),
      dominioId: DOM.tharan,
      fecha: fecha(15),
      tipo: 'ingreso',
      importe: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
      categoriaId: CATEGORIA.beneficiosDeInversiones,
      concepto: 'Beneficio de Barcaza del Brandivino',
      origen: 'avance',
      avanceId: AVANCE_PRUEBA,
      regla: { tipo: 'beneficio', id: INVERSION.barcaza },
      inversionId: INVERSION.barcaza,
      programado: false,
    })
    expect(ctx.saldos.get(DOM.tharan)).toBe(4651800 + 150000)
  })

  it('un ingreso de J5 activo entra en su cuentaId, aunque la regla sea del personaje', () => {
    const base = ejemplo()
    const estado: EstadoPartida = {
      ...base,
      recurrentes: base.recurrentes.map((r) =>
        r.id === RECURRENTE.alquilerCasaArchet ? { ...r, activo: true, cuentaId: DOM.bree } : r,
      ),
    }
    const ctx = contexto(estado, fecha(1, 5))
    pasoCobros(ctx, diaDe(ctx, fecha(1, 5)))
    const alquiler = deLaRegla(ctx, RECURRENTE.alquilerCasaArchet)
    expect(alquiler?.dominioId).toBe(DOM.bree)
    expect(alquiler?.importe).toEqual({ base: 50000, introducido: { cantidad: '0,5', moneda: 'mo' } })
    expect(alquiler?.categoriaId).toBe(CATEGORIA.rentasYAlquileres)
    expect(alquiler?.regla).toEqual({ tipo: 'recurrente', id: RECURRENTE.alquilerCasaArchet })
  })

  it('un ingreso de J5 en pausa no cobra', () => {
    const ctx = contexto(ejemplo(), fecha(1, 5))
    pasoCobros(ctx, diaDe(ctx, fecha(1, 5)))
    expect(deLaRegla(ctx, RECURRENTE.alquilerCasaArchet)).toBeUndefined()
    expect(ctx.saldos.get(DOM.tharan)).toBe(4651800 + 300000)
  })
})

describe('pasoCobros: cobros programados', () => {
  /** El ejemplo con un cobro programado en la bolsa de Tharan y un pago programado el mismo día. */
  function conProgramados(fechaCobro: Fecha): EstadoPartida {
    const base = ejemplo()
    return {
      ...base,
      movimientos: [
        ...base.movimientos,
        {
          id: 'mov.prueba.cobro',
          dominioId: DOM.tharan,
          fecha: fechaCobro,
          tipo: 'ingreso',
          importe: { base: 200000, introducido: { cantidad: '2', moneda: 'mo' } },
          categoriaId: CATEGORIA.otros,
          concepto: 'Pago de Barnabás por la escolta',
          origen: 'manual',
          programado: true,
        },
        {
          id: 'mov.prueba.pago',
          dominioId: DOM.tharan,
          fecha: fecha(13),
          tipo: 'gasto',
          importe: { base: -100000 },
          categoriaId: CATEGORIA.otros,
          concepto: 'Cuerda élfica',
          origen: 'manual',
          programado: true,
        },
      ],
    }
  }

  it('el cobro programado del día entra entero y se aplica con el avanceId, sin cambiar su id, su origen ni su importe', () => {
    const ctx = contexto(conProgramados(fecha(20)), fecha(20))
    pasoCobros(ctx, diaDe(ctx, fecha(20)))
    expect(ctx.movimientos.find((m) => m.id === 'mov.prueba.cobro')).toEqual({
      id: 'mov.prueba.cobro',
      dominioId: DOM.tharan,
      fecha: fecha(20),
      tipo: 'ingreso',
      importe: { base: 200000, introducido: { cantidad: '2', moneda: 'mo' } },
      categoriaId: CATEGORIA.otros,
      concepto: 'Pago de Barnabás por la escolta',
      origen: 'manual',
      avanceId: AVANCE_PRUEBA,
      programado: false,
    })
    expect(ctx.saldos.get(DOM.tharan)).toBe(4651800 + 200000)
  })

  it('un cobro programado con la fecha ya pasada se aplica el primer día; el pago programado se queda para el paso 9 (T14)', () => {
    const ctx = contexto(conProgramados(fecha(10)), fecha(19))
    pasoCobros(ctx, diaDe(ctx, fecha(13)))
    expect(ctx.movimientos.find((m) => m.id === 'mov.prueba.cobro')?.programado).toBe(false)
    expect(ctx.movimientos.find((m) => m.id === 'mov.prueba.pago')?.programado).toBe(true)
    expect(ctx.saldos.get(DOM.tharan)).toBe(4651800 + 200000)
  })
})

describe('pasoCobros: el orden de §9 l.1280', () => {
  it('crea los movimientos en el orden de §9: impuestos y rentas, beneficios e ingresos recurrentes, y aplica los programados (T10)', () => {
    const inicio = fecha(12)
    const base = conAsentamiento(estadoMinimo(inicio), { id: 'dom.aldea', nombre: 'Aldea', caja: 0, habitantes: 50 })
    const tharan = base.dominios[0].id
    const cadaDia20 = { tipo: 'mensual', diaMes: 20 } as const
    const estado: EstadoPartida = {
      ...base,
      movimientos: [
        {
          id: 'mov.prueba.cobro',
          dominioId: tharan,
          fecha: fecha(20),
          tipo: 'ingreso',
          importe: { base: 40000 },
          categoriaId: CATEGORIA.otros,
          concepto: 'Deuda de un amigo',
          origen: 'manual',
          programado: true,
        },
      ],
      recurrentes: [
        {
          id: 'rec.prueba.alquiler',
          dominioId: tharan,
          tipo: 'ingreso',
          concepto: 'Alquiler del establo',
          importe: { base: 30000 },
          categoriaId: CATEGORIA.rentasYAlquileres,
          cuentaId: tharan,
          recurrencia: cadaDia20,
          activo: true,
        },
      ],
      inversiones: [
        {
          id: 'inv.prueba.molino',
          dominioId: tharan,
          negocio: 'Molino del río',
          capital: { base: 1000000 },
          participacionPct: 10,
          beneficio: { base: 20000 },
          recurrencia: cadaDia20,
          cuentaBeneficiosId: tharan,
          estado: 'activa',
        },
      ],
      impuestosRentas: [
        {
          id: 'imp.prueba.mercado',
          dominioId: 'dom.aldea',
          sentido: 'ingreso',
          concepto: 'Puestos del mercado',
          base: 'fija',
          importe: { base: 10000 },
          categoriaId: CATEGORIA.impuestos,
          recurrencia: cadaDia20,
        },
      ],
    }
    const ctx = contexto(estado, fecha(20))
    pasoCobros(ctx, diaDe(ctx, fecha(20)))
    // Los nuevos van al final del libro, en el orden en que se crean; el programado se aplica en su sitio.
    const nuevos = delAvance(ctx).filter((m) => m.origen === 'avance')
    expect(nuevos.map((m) => [m.id, m.concepto])).toEqual([
      ['sim.1', 'Puestos del mercado'],
      ['sim.2', 'Beneficio de Molino del río'],
      ['sim.3', 'Alquiler del establo'],
    ])
    expect(ctx.movimientos[0]).toMatchObject({ id: 'mov.prueba.cobro', programado: false, avanceId: AVANCE_PRUEBA })
    expect(ctx.saldos.get(tharan)).toBe(20000 + 30000 + 40000)
    expect(ctx.saldos.get('dom.aldea')).toBe(10000)
  })
})
