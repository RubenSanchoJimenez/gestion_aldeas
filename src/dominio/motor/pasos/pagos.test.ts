import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, compararFechas, type Fecha } from '../../calendario/fecha'
import { CATEGORIA } from '../../catalogo/inicial'
import { eventosConEfectosEl } from '../../eventos/efectos'
import { DOM, IMPUESTO, PERSONA, TRABAJADOR, UNIDAD } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import type { Deuda } from '../../modelo/deudas'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import type { Movimiento, RecurrenteDinero } from '../../modelo/movimientos'
import { crearContexto, type Contexto, type Dia } from '../contexto'
import { cerrarDiarios } from '../diarios'
import { idsEnSerie } from '../ids'
import { conAsentamiento, congelar, estadoMinimo } from '../pruebas/constructores'
import { pasoPagos } from './pagos'

/** El avance de prueba: todo lo que crea o aplica lleva este avanceId. */
const AVANCE_PRUEBA = 'av.prueba'

/** Un día de abril de 1640. */
function fecha(dia: number): Fecha {
  return { anio: 1640, mes: 4, dia }
}

/** El 12 de abril de 1640, la fecha actual de todas las pruebas. */
const HOY = fecha(12)

/** El id del personaje de una partida mínima: el primer dominio. */
const THARAN = estadoMinimo(HOY).dominios[0].id

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

/** Los movimientos del avance que salen de una regla de ese tipo. */
function deLaRegla(ctx: Contexto, tipo: string, id: string): Movimiento[] {
  return delAvance(ctx).filter((m) => m.regla?.tipo === tipo && m.regla.id === id)
}

/** Las deudas de impago que ha creado o tocado el avance de prueba. */
function impagos(ctx: Contexto): Deuda[] {
  return ctx.deudas.filter((d) => d.impago)
}

/** El nombre de la persona o entidad de una deuda. */
function contraparte(ctx: Contexto, deuda: Deuda): string | undefined {
  return ctx.personas.find((p) => p.id === deuda.contraparteId)?.nombre
}

/** Un gasto recurrente de J5 de Tharan, mensual el día 20, que se paga desde `cuentaId`. */
function gastoMensual(id: string, concepto: string, base: number, cuentaId: string): RecurrenteDinero {
  return {
    id,
    dominioId: DOM.tharan,
    tipo: 'gasto',
    concepto,
    importe: { base, introducido: { cantidad: String(base / 100000), moneda: 'mo' } },
    categoriaId: CATEGORIA.otros,
    cuentaId,
    recurrencia: { tipo: 'mensual', diaMes: 20 },
    activo: true,
  }
}

/** Un pago programado suelto de la bolsa del personaje de la partida mínima. */
function pagoProgramado(id: string, concepto: string, base: number, extra: Partial<Movimiento> = {}): Movimiento {
  return {
    id,
    dominioId: THARAN,
    fecha: fecha(20),
    tipo: 'gasto',
    importe: { base: -base, introducido: { cantidad: String(base / 100000), moneda: 'mo' } },
    categoriaId: CATEGORIA.otros,
    concepto,
    origen: 'manual',
    programado: true,
    ...extra,
  }
}

describe('pasoPagos: salarios y soldadas', () => {
  it('los salarios del 13 de abril: un movimiento de −420.000 con las 5 filas y «Salarios de 14 trabajadores»', () => {
    const ctx = contexto(ejemplo(), fecha(13))
    pasoPagos(ctx, diaDe(ctx, fecha(13)))
    expect(deLaRegla(ctx, 'salarios', DOM.bree)).toEqual([
      {
        id: expect.any(String),
        dominioId: DOM.bree,
        fecha: fecha(13),
        tipo: 'gasto',
        importe: { base: -420000 },
        categoriaId: CATEGORIA.salarios,
        concepto: 'Salarios de 14 trabajadores',
        origen: 'avance',
        avanceId: AVANCE_PRUEBA,
        regla: { tipo: 'salarios', id: DOM.bree },
        detalleTrabajo: [
          { origenId: TRABAJADOR.granjeros, nombre: 'Granjeros', numero: 6, importe: { base: 180000 } },
          { origenId: TRABAJADOR.lenadores, nombre: 'Leñadores', numero: 3, importe: { base: 90000 } },
          { origenId: TRABAJADOR.cerveceros, nombre: 'Cerveceros', numero: 2, importe: { base: 80000 } },
          { origenId: TRABAJADOR.canteros, nombre: 'Canteros', numero: 2, importe: { base: 60000 } },
          { origenId: TRABAJADOR.pastores, nombre: 'Pastor', numero: 1, importe: { base: 10000 } },
        ],
        programado: false,
      },
    ])
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000 - 420000)
    expect(ctx.sucesos).toContainEqual({
      tipo: 'pago',
      origen: { tipo: 'salarios', id: DOM.bree },
      dominioId: DOM.bree,
      fecha: fecha(13),
      debido: 420000,
      pagado: 420000,
      que: { clase: 'salarios' },
      diario: false,
    })
    expect(impagos(ctx)).toEqual([])
  })

  it('con 3 mo en la caja frente a 4,2 mo paga las filas por orden, la frontera a medias, y 1,2 mo quedan como impago (§9 l.1292)', () => {
    const ctx = contexto(ejemplo(), fecha(13))
    ctx.saldos.set(DOM.bree, 300000)
    pasoPagos(ctx, diaDe(ctx, fecha(13)))
    const [salarios] = deLaRegla(ctx, 'salarios', DOM.bree)
    expect(salarios.importe).toEqual({ base: -300000 })
    expect(salarios.concepto).toBe('Salarios de 11 trabajadores')
    expect(salarios.detalleTrabajo).toEqual([
      { origenId: TRABAJADOR.granjeros, nombre: 'Granjeros', numero: 6, importe: { base: 180000 } },
      { origenId: TRABAJADOR.lenadores, nombre: 'Leñadores', numero: 3, importe: { base: 90000 } },
      { origenId: TRABAJADOR.cerveceros, nombre: 'Cerveceros', numero: 2, importe: { base: 30000 } },
    ])
    expect(ctx.saldos.get(DOM.bree)).toBe(0)
    const [deuda] = impagos(ctx)
    expect(deuda).toEqual({
      id: expect.any(String),
      dominioId: DOM.bree,
      sentido: 'debo',
      contraparteId: expect.any(String),
      fecha: fecha(13),
      principal: { base: 120000 },
      interesPct: 0,
      estado: 'abierta',
      impago: true,
      origenImpago: { tipo: 'salarios', id: DOM.bree },
      cargos: [{ fecha: fecha(13), importe: { base: 120000 }, avanceId: AVANCE_PRUEBA }],
      pagos: [],
      devengos: [],
    })
    expect(contraparte(ctx, deuda)).toBe('Trabajadores de Bree')
    expect(ctx.personasNuevas.map((p) => p.nombre)).toEqual(['Trabajadores de Bree'])
  })

  it('una caja que ya está en negativo no paga nada: todo es impago y no hay movimiento (§9 l.1293)', () => {
    const ctx = contexto(ejemplo(), fecha(13))
    ctx.saldos.set(DOM.bree, -1000000)
    pasoPagos(ctx, diaDe(ctx, fecha(13)))
    expect(deLaRegla(ctx, 'salarios', DOM.bree)).toEqual([])
    expect(ctx.saldos.get(DOM.bree)).toBe(-1000000)
    expect(impagos(ctx).map((d) => d.principal.base)).toEqual([420000])
    expect(ctx.sucesos).toContainEqual(expect.objectContaining({ tipo: 'pago', debido: 420000, pagado: 0 }))
  })

  it('las soldadas del 24 de abril: «Soldada de la guarnición» con una fila por unidad y su nombre', () => {
    const ctx = contexto(ejemplo(), fecha(24))
    pasoPagos(ctx, diaDe(ctx, fecha(24)))
    const [soldadas] = deLaRegla(ctx, 'soldadas', DOM.bree)
    expect(soldadas.importe).toEqual({ base: -580000 })
    expect(soldadas.concepto).toBe('Soldada de la guarnición')
    expect(soldadas.categoriaId).toBe(CATEGORIA.soldadas)
    expect(soldadas.detalleTrabajo).toEqual([
      { origenId: UNIDAD.guardias, nombre: 'Guardias de la puerta', numero: 6, importe: { base: 180000 } },
      { origenId: UNIDAD.arqueros, nombre: 'Arqueros de la empalizada', numero: 4, importe: { base: 200000 } },
      { origenId: UNIDAD.capitan, nombre: 'Capitán de la guardia', numero: 1, importe: { base: 200000 } },
    ])
  })

  it('las soldadas que no se pagan quedan como impago con «Guarnición de Bree»', () => {
    const ctx = contexto(ejemplo(), fecha(24))
    ctx.saldos.set(DOM.bree, 0)
    pasoPagos(ctx, diaDe(ctx, fecha(24)))
    expect(deLaRegla(ctx, 'soldadas', DOM.bree)).toEqual([])
    const [deuda] = impagos(ctx)
    expect(deuda.origenImpago).toEqual({ tipo: 'soldadas', id: DOM.bree })
    expect(deuda.principal).toEqual({ base: 580000 })
    expect(contraparte(ctx, deuda)).toBe('Guarnición de Bree')
  })
})

describe('pasoPagos: tributos', () => {
  it('el tributo de Archet del 19 de abril se paga entero: −6.000.000 con «60 mo» (T8)', () => {
    const ctx = contexto(ejemplo(), fecha(19))
    pasoPagos(ctx, diaDe(ctx, fecha(19)))
    const [tributo] = deLaRegla(ctx, 'tributo', IMPUESTO.tributoArchet)
    expect(tributo.dominioId).toBe(DOM.archet)
    expect(tributo.importe).toEqual({ base: -6000000, introducido: { cantidad: '60', moneda: 'mo' } })
    expect(tributo.categoriaId).toBe(CATEGORIA.tributos)
    expect(tributo.concepto).toBe('Tributo a la Corona')
    expect(ctx.saldos.get(DOM.archet)).toBe(2500000)
    expect(ctx.sucesos).toContainEqual({
      tipo: 'pago',
      origen: { tipo: 'tributo', id: IMPUESTO.tributoArchet },
      dominioId: DOM.archet,
      fecha: fecha(19),
      debido: 6000000,
      pagado: 6000000,
      que: { clase: 'tributo' },
      diario: false,
    })
  })

  it('un tributo pagado a medias va sin lo introducido y su impago es con el destinatario, que ya existe', () => {
    const ctx = contexto(ejemplo(), fecha(19))
    ctx.saldos.set(DOM.archet, 5000000)
    pasoPagos(ctx, diaDe(ctx, fecha(19)))
    expect(deLaRegla(ctx, 'tributo', IMPUESTO.tributoArchet)[0].importe).toEqual({ base: -5000000 })
    const [deuda] = impagos(ctx)
    expect(deuda.origenImpago).toEqual({ tipo: 'tributo', id: IMPUESTO.tributoArchet })
    expect(deuda.dominioId).toBe(DOM.archet)
    expect(deuda.principal).toEqual({ base: 1000000 })
    expect(deuda.contraparteId).toBe(PERSONA.corona)
    expect(ctx.personasNuevas).toEqual([])
  })

  it('un tributo sin destinatario que no se paga tiene por contraparte su concepto (§9 l.1294)', () => {
    const base = ejemplo()
    const estado: EstadoPartida = {
      ...base,
      impuestosRentas: base.impuestosRentas.map((i) =>
        i.id === IMPUESTO.tributoArchet ? { ...i, destinatarioId: undefined } : i,
      ),
    }
    const ctx = contexto(estado, fecha(19))
    ctx.saldos.set(DOM.archet, 0)
    pasoPagos(ctx, diaDe(ctx, fecha(19)))
    expect(deLaRegla(ctx, 'tributo', IMPUESTO.tributoArchet)).toEqual([])
    const [deuda] = impagos(ctx)
    expect(deuda.principal).toEqual({ base: 6000000 })
    expect(contraparte(ctx, deuda)).toBe('Tributo a la Corona')
    expect(ctx.personasNuevas.map((p) => p.nombre)).toEqual(['Tributo a la Corona'])
  })
})

describe('pasoPagos: gastos recurrentes de J5', () => {
  it('un gasto pagado desde la caja de Bree cambia con un evento de «gastos»; el de la bolsa, nunca (D-026)', () => {
    const base = ejemplo()
    const estado: EstadoPartida = {
      ...base,
      recurrentes: [
        ...base.recurrentes,
        gastoMensual('rec.prueba.forraje', 'Forraje del establo de Bree', 100000, DOM.bree),
        gastoMensual('rec.prueba.herrero', 'Herraduras del poni', 100000, DOM.tharan),
      ],
      eventos: [
        ...base.eventos,
        {
          id: 'ev.prueba.escasez',
          dominioId: DOM.bree,
          nombre: 'Escasez de forraje',
          inicio: fecha(20),
          duracionDias: 1,
          efectos: [{ ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'gastos' }, pct: 50 }],
        },
      ],
    }
    const ctx = contexto(estado, fecha(20))
    pasoPagos(ctx, diaDe(ctx, fecha(20)))
    const [forraje] = deLaRegla(ctx, 'recurrente', 'rec.prueba.forraje')
    expect(forraje.dominioId).toBe(DOM.bree)
    expect(forraje.importe).toEqual({ base: -150000 })
    const [herraduras] = deLaRegla(ctx, 'recurrente', 'rec.prueba.herrero')
    expect(herraduras.dominioId).toBe(DOM.tharan)
    expect(herraduras.importe).toEqual({ base: -100000, introducido: { cantidad: '1', moneda: 'mo' } })
  })

  it('un gasto de J5 que no se paga deja la deuda en su cuentaId, con su concepto como contraparte (T25)', () => {
    const base = ejemplo()
    const estado: EstadoPartida = {
      ...base,
      recurrentes: [...base.recurrentes, gastoMensual('rec.prueba.diezmo', 'Diezmo al templo', 100000, DOM.archet)],
    }
    const ctx = contexto(estado, fecha(20))
    ctx.saldos.set(DOM.archet, 0)
    pasoPagos(ctx, diaDe(ctx, fecha(20)))
    expect(deLaRegla(ctx, 'recurrente', 'rec.prueba.diezmo')).toEqual([])
    const [deuda] = impagos(ctx)
    expect(deuda.dominioId).toBe(DOM.archet)
    expect(deuda.origenImpago).toEqual({ tipo: 'recurrente', id: 'rec.prueba.diezmo' })
    expect(contraparte(ctx, deuda)).toBe('Diezmo al templo')
  })
})

describe('pasoPagos: pagos programados', () => {
  it('un pago programado que se paga entero se aplica con su importe y lo introducido', () => {
    const estado: EstadoPartida = {
      ...estadoMinimo(HOY),
      movimientos: [pagoProgramado('mov.prueba.cuerda', 'Cuerda élfica', 100000)],
    }
    const ctx = contexto(estado, fecha(20))
    ctx.saldos.set(THARAN, 200000)
    pasoPagos(ctx, diaDe(ctx, fecha(20)))
    expect(ctx.movimientos).toEqual([
      { ...pagoProgramado('mov.prueba.cuerda', 'Cuerda élfica', 100000), programado: false, avanceId: AVANCE_PRUEBA },
    ])
    expect(ctx.saldos.get(THARAN)).toBe(100000)
    expect(impagos(ctx)).toEqual([])
  })

  it('pagado a medias guarda lo pagado sin lo introducido; sin nada pagado se queda con 0, nunca −0 (D-020)', () => {
    const estado: EstadoPartida = {
      ...estadoMinimo(HOY),
      movimientos: [
        pagoProgramado('mov.prueba.cuerda', 'Cuerda élfica', 100000),
        pagoProgramado('mov.prueba.botas', 'Botas de viaje', 50000),
      ],
    }
    const ctx = contexto(estado, fecha(20))
    ctx.saldos.set(THARAN, 40000)
    pasoPagos(ctx, diaDe(ctx, fecha(20)))
    const [cuerda, botas] = ctx.movimientos
    expect(cuerda).toMatchObject({ importe: { base: -40000 }, programado: false, avanceId: AVANCE_PRUEBA })
    expect(cuerda.importe.introducido).toBeUndefined()
    expect(botas).toMatchObject({ programado: false, avanceId: AVANCE_PRUEBA })
    expect(Object.is(botas.importe.base, 0)).toBe(true)
    expect(impagos(ctx).map((d) => [d.origenImpago?.id, d.principal.base, contraparte(ctx, d)])).toEqual([
      ['mov.prueba.cuerda', 60000, 'Cuerda élfica'],
      ['mov.prueba.botas', 50000, 'Botas de viaje'],
    ])
  })

  it('un pago programado con objeto pendiente crea el objeto aunque no se pague y el movimiento lo pierde (D-034)', () => {
    const pendiente = {
      nombre: 'Cuerda élfica',
      cantidad: 2,
      valorUnitario: { base: 50000 },
      ubicacion: { tipo: 'encima' as const },
    }
    const estado: EstadoPartida = {
      ...estadoMinimo(HOY),
      movimientos: [pagoProgramado('mov.prueba.cuerda', 'Cuerda élfica', 100000, { objetoPendiente: pendiente })],
    }
    const ctx = contexto(estado, fecha(20))
    pasoPagos(ctx, diaDe(ctx, fecha(20)))
    expect(ctx.objetos).toEqual([
      {
        id: expect.any(String),
        dominioId: THARAN,
        nombre: 'Cuerda élfica',
        cantidad: 2,
        valorUnitario: { base: 50000 },
        ubicacion: { tipo: 'encima' },
        movimientoCompraId: 'mov.prueba.cuerda',
      },
    ])
    const [cuerda] = ctx.movimientos
    expect('objetoPendiente' in cuerda).toBe(false)
    expect(cuerda.programado).toBe(false)
    expect(impagos(ctx).map((d) => d.principal.base)).toEqual([100000])
  })
})

describe('pasoPagos: por filas y en el orden de la tabla', () => {
  it('con 5 mo paga salarios y soldadas, el tributo a medias y nada del gasto de J5 (§9 l.1281 y l.1292)', () => {
    const inicio = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 500000 })
    const dia20 = { tipo: 'mensual', diaMes: 20 } as const
    const estado: EstadoPartida = {
      ...inicio,
      trabajadores: [
        {
          id: 'trab.prueba.albaniles',
          dominioId: 'dom.aldea',
          oficioId: 'oficio.albanil',
          numero: 2,
          salario: { base: 100000 },
          recurrencia: dia20,
        },
      ],
      unidadesGuarnicion: [
        {
          id: 'uni.prueba.guardia',
          dominioId: 'dom.aldea',
          tipoId: 'unidad.guardia',
          nombre: 'Guardia del puente',
          numero: 1,
          soldada: { base: 200000 },
          recurrencia: dia20,
        },
      ],
      impuestosRentas: [
        {
          id: 'imp.prueba.tributo',
          dominioId: 'dom.aldea',
          sentido: 'tributo',
          concepto: 'Tributo al señor',
          base: 'fija',
          importe: { base: 200000 },
          categoriaId: CATEGORIA.tributos,
          recurrencia: dia20,
        },
      ],
      recurrentes: [{ ...gastoMensual('rec.prueba.farol', 'Aceite del farol', 100000, 'dom.aldea'), dominioId: THARAN }],
    }
    const ctx = contexto(estado, fecha(20))
    pasoPagos(ctx, diaDe(ctx, fecha(20)))
    expect(
      ctx.sucesos.map((s) => (s.tipo === 'pago' ? [s.origen.tipo, s.debido, s.pagado] : [s.tipo])),
    ).toEqual([
      ['salarios', 200000, 200000],
      ['soldadas', 200000, 200000],
      ['tributo', 200000, 100000],
      ['recurrente', 100000, 0],
    ])
    expect(delAvance(ctx).map((m) => [m.concepto, m.importe.base])).toEqual([
      ['Salarios de 2 trabajadores', -200000],
      ['Soldada de la guarnición', -200000],
      ['Tributo al señor', -100000],
    ])
    expect(delAvance(ctx)[0].detalleTrabajo?.[0].nombre).toBe('Albañiles')
    expect(ctx.saldos.get('dom.aldea')).toBe(0)
  })
})

describe('pasoPagos: gastos diarios sin dinero', () => {
  it('la posada que se queda sin dinero a mitad: «· 3 noches» con lo pagado y un solo cargo desde el primer día sin dinero (D-021)', () => {
    const estado: EstadoPartida = {
      ...estadoMinimo(HOY),
      recurrentes: [
        {
          id: 'rec.prueba.posada',
          dominioId: THARAN,
          tipo: 'gasto',
          concepto: 'Posada El Poney Pisador',
          importe: { base: 10000, introducido: { cantidad: '1', moneda: 'mp' } },
          categoriaId: CATEGORIA.otros,
          cuentaId: THARAN,
          recurrencia: { tipo: 'diaria' },
          activo: true,
          unidadDiaria: 'noches',
        },
      ],
    }
    const ctx = contexto(estado, fecha(19))
    ctx.saldos.set(THARAN, 25000)
    for (let dia = 13; dia <= 19; dia++) {
      pasoPagos(ctx, diaDe(ctx, fecha(dia)))
    }
    cerrarDiarios(ctx)
    expect(delAvance(ctx)).toEqual([
      {
        id: expect.any(String),
        dominioId: THARAN,
        fecha: fecha(19),
        tipo: 'gasto',
        importe: { base: -25000 },
        categoriaId: CATEGORIA.otros,
        concepto: 'Posada El Poney Pisador · 3 noches',
        origen: 'avance',
        avanceId: AVANCE_PRUEBA,
        regla: { tipo: 'recurrente', id: 'rec.prueba.posada' },
        programado: false,
      },
    ])
    const [deuda] = impagos(ctx)
    expect(deuda.fecha).toEqual(fecha(15))
    expect(deuda.cargos).toEqual([{ fecha: fecha(15), importe: { base: 45000 }, avanceId: AVANCE_PRUEBA }])
    expect(deuda.principal).toEqual({ base: 45000 })
    expect(ctx.saldos.get(THARAN)).toBe(0)
  })
})
