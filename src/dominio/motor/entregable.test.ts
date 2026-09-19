import { describe, expect, it } from 'vitest'
import { aplicarAvance } from '../avance/aplicar'
import { deshacerUltimoAvance, puedeDeshacer } from '../avance/deshacer'
import { avisosEn } from '../avisos/avisos'
import { sumarDias, type Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { balanceMensual } from '../dinero/balance'
import { formatearOro, formatearOroProrrateado } from '../dinero/formato'
import { alMes, sumarAlMes } from '../dinero/prorrateo'
import { saldosPorDominio } from '../dinero/saldo'
import { SNAPSHOT_10_ABRIL } from '../ejemplo/avances'
import {
  CARAVANA,
  DOM,
  IMPUESTO,
  INVERSION,
  LOCAL,
  MOV_BREE,
  MOV_THARAN,
  PERSONA,
  RECURRENTE,
  TRABAJADOR,
} from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Id, Instante } from '../modelo/comunes'
import type { Deuda } from '../modelo/deudas'
import { EsquemaDocumentoPartida, estadoDe, type EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { validarCopia } from '../validacion/coherencia'
import { recorrerDias } from './bucle'
import { idsEnSerie } from './ids'
import { congelar } from './pruebas/constructores'
import { simular } from './simular'
import type { OpcionesSimulacion, ResultadoSimulacion } from './tipos'

/** El id del avance de estas pruebas y la hora en que se aplica: posterior al último avance del ejemplo (aviso 23). */
const AVANCE_ID = 'av.entregable'
const AHORA: Instante = '2026-09-18T12:00:00.000Z'

/** Fechas de 1640 T.E. escritas cortas: F(19, 4) es el 19 de abril de 1640. */
function F(dia: number, mes: number, anio = 1640): Fecha {
  return { anio, mes, dia }
}

/** Opciones nuevas en cada llamada: ids en serie que no se comparten entre simulaciones (aviso 9). */
function opciones(prefijo = 'sim', avanceId: Id = AVANCE_ID): OpcionesSimulacion {
  return { avanceId, nuevoId: idsEnSerie(prefijo), catalogo: catalogosDeEjemplo() }
}

/** `simular` sobre una copia propia de «La Sombra del Este», tal como está el 12 de abril de 1640. */
function avanzarEjemplo(dias: number): ResultadoSimulacion {
  return simular(documentoDeEjemplo(), dias, opciones())
}

/** Los movimientos que creó o aplicó el avance de estas pruebas. */
function delAvance(resultado: ResultadoSimulacion): Movimiento[] {
  return resultado.estadoNuevo.movimientos.filter((m) => m.avanceId === resultado.avanceId)
}

/** El movimiento sin su id, que sale de `nuevoId` y no se compara (aviso 11). */
function sinId(movimiento: Movimiento): Omit<Movimiento, 'id'> {
  const copia: Partial<Movimiento> = { ...movimiento }
  delete copia.id
  return copia as Omit<Movimiento, 'id'>
}

/** Orden de comparación por contenido: fecha, dominio y concepto (aviso 11; técnica 10). */
function porContenido(a: Omit<Movimiento, 'id'>, b: Omit<Movimiento, 'id'>): number {
  const clave = (m: Omit<Movimiento, 'id'>): string =>
    `${m.fecha.anio}-${String(m.fecha.mes).padStart(2, '0')}-${String(m.fecha.dia).padStart(2, '0')}|${m.dominioId}|${m.concepto}`
  return clave(a).localeCompare(clave(b))
}

/** Las deudas de impago del estado, que son las que crea el motor. */
function deudasDeImpago(estado: EstadoPartida): Deuda[] {
  return estado.deudas.filter((d) => d.impago)
}

/** Los ocho movimientos de P4 (contrato, apartado 4.1; gen l.502-542), ya en el orden de `porContenido`. */
const MOVIMIENTOS_P4: Omit<Movimiento, 'id'>[] = [
  {
    dominioId: DOM.bree,
    fecha: F(13, 4),
    tipo: 'gasto',
    importe: { base: -420000 },
    categoriaId: CATEGORIA.salarios,
    concepto: 'Salarios de 14 trabajadores',
    origen: 'avance',
    avanceId: AVANCE_ID,
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
  {
    dominioId: DOM.bree,
    fecha: F(15, 4),
    tipo: 'ingreso',
    importe: { base: 1800000 },
    categoriaId: CATEGORIA.aranceles,
    concepto: 'Aranceles del mercado',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'impuesto', id: IMPUESTO.aranceles },
    programado: false,
  },
  {
    dominioId: DOM.tharan,
    fecha: F(15, 4),
    tipo: 'ingreso',
    importe: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
    categoriaId: CATEGORIA.beneficiosDeInversiones,
    concepto: 'Beneficio de Barcaza del Brandivino',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'beneficio', id: INVERSION.barcaza },
    inversionId: INVERSION.barcaza,
    programado: false,
  },
  {
    dominioId: DOM.bree,
    fecha: F(18, 4),
    tipo: 'ingreso',
    importe: { base: 2400000, introducido: { cantidad: '24', moneda: 'mo' } },
    categoriaId: CATEGORIA.comercio,
    concepto: 'Caravana: venta de cerveza en Fornost',
    origen: 'avance',
    avanceId: AVANCE_ID,
    vinculo: { tipo: 'caravana', id: CARAVANA.ventaCervezaFornost },
    programado: false,
  },
  {
    dominioId: DOM.archet,
    fecha: F(19, 4),
    tipo: 'gasto',
    importe: { base: -6000000, introducido: { cantidad: '60', moneda: 'mo' } },
    categoriaId: CATEGORIA.tributos,
    concepto: 'Tributo a la Corona',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'tributo', id: IMPUESTO.tributoArchet },
    programado: false,
  },
  {
    dominioId: DOM.bree,
    fecha: F(19, 4),
    tipo: 'ingreso',
    importe: { base: 210000 },
    categoriaId: CATEGORIA.impuestos,
    concepto: 'Peaje del camino · 7 días',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'impuesto', id: IMPUESTO.peaje },
    programado: false,
  },
  {
    dominioId: DOM.tharan,
    fecha: F(19, 4),
    tipo: 'gasto',
    importe: { base: -14000 },
    categoriaId: 'cat.montura',
    concepto: 'Establo del poni · 7 días',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'recurrente', id: RECURRENTE.establo },
    programado: false,
  },
  {
    dominioId: DOM.tharan,
    fecha: F(19, 4),
    tipo: 'gasto',
    importe: { base: -70000 },
    categoriaId: 'cat.alojamiento',
    concepto: 'Posada El Poney Pisador · 7 noches',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'recurrente', id: RECURRENTE.posada },
    programado: false,
  },
]

describe('P4: el avance del 12 al 19 de abril de 1640', () => {
  it('crea los ocho movimientos de la vista previa, con su fecha, su categoría, su concepto y su origen', () => {
    const resultado = avanzarEjemplo(7)

    const creados = delAvance(resultado).map(sinId).sort(porContenido)
    expect(creados).toEqual([...MOVIMIENTOS_P4].sort(porContenido))
  })

  it('deja la bolsa de Tharan en 47,178 mo, la caja de Bree en 380,5 mo y la de Archet en 25 mo', () => {
    const resultado = avanzarEjemplo(7)
    const eq = resultado.estadoNuevo.partida.equivalencias

    expect(resultado.desde).toEqual(F(12, 4))
    expect(resultado.hasta).toEqual(F(19, 4))
    expect(resultado.estadoNuevo.partida.fechaActual).toEqual(F(19, 4))
    const saldos = saldosPorDominio(resultado.estadoNuevo)
    expect(saldos).toEqual({ [DOM.tharan]: 4717800, [DOM.bree]: 38050000, [DOM.archet]: 2500000 })
    expect(formatearOro(saldos[DOM.tharan], eq)).toBe('47,178 mo')
    expect(formatearOro(saldos[DOM.bree], eq)).toBe('380,5 mo')
    expect(formatearOro(saldos[DOM.archet], eq)).toBe('25 mo')
    // Las tres cifras de la hoja de ruta (l.66): Tharan +0,66 mo, Bree +39,9 mo y Archet −60 mo.
    expect(formatearOro(saldos[DOM.tharan] - 4651800, eq, { signo: true })).toBe('+0,66 mo')
    expect(formatearOro(saldos[DOM.bree] - 34060000, eq, { signo: true })).toBe('+39,9 mo')
    expect(formatearOro(saldos[DOM.archet] - 8500000, eq, { signo: true })).toBe('−60 mo')
  })

  it('resume el avance con una fila de saldo por dominio, las filas «almacen» de P4 y los cuatro hechos de P5 (O1, O11, T15)', () => {
    const resultado = avanzarEjemplo(7)

    expect(resultado.cambios.filter((c) => c.tipo === 'saldo')).toEqual([
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4651800, despues: 4717800, movimientos: 3 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 34060000, despues: 38050000, movimientos: 4 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 2500000, movimientos: 1 },
    ])
    const almacenes = resultado.cambios.filter((c) => c.tipo === 'almacen')
    const redondeadas = almacenes.map((a) =>
      a.tipo === 'almacen'
        ? { dominioId: a.dominioId, recursoId: a.recursoId, antes: a.antes, despues: Math.round(a.despues * 1000) / 1000 }
        : a,
    )
    expect(redondeadas).toEqual([
      { dominioId: DOM.bree, recursoId: 'recurso.viveres', antes: 310, despues: 92.667 },
      { dominioId: DOM.bree, recursoId: 'recurso.madera', antes: 420, despues: 385.56 },
      { dominioId: DOM.bree, recursoId: 'recurso.piedra', antes: 180, despues: 196.667 },
      { dominioId: DOM.bree, recursoId: 'recurso.cerveza', antes: 90, despues: 83.96 },
      { dominioId: DOM.bree, recursoId: 'recurso.lana', antes: 35, despues: 47 },
      { dominioId: DOM.archet, recursoId: 'recurso.viveres', antes: 900, despues: 827.667 },
    ])
    expect(resultado.cambios.filter((c) => c.tipo === 'hecho')).toEqual([
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Feria de primavera · 15 al 17' },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Obra «Reparación de la puerta del sur» terminada · 17' },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Caravana de Fornost de vuelta · 18' },
      { tipo: 'hecho', dominioId: DOM.archet, texto: 'Tributo de Archet pagado · 19' },
    ])
  })

  it('el 19 solo avisa de que Archet no cubrirá el tributo de julio, y el 12 no había ningún aviso de dinero', () => {
    const resultado = avanzarEjemplo(7)

    expect(resultado.avisos).toEqual([
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de julio',
      },
    ])
    expect(resultado.personasNuevas).toEqual([])
    expect(avisosEn(estadoDe(documentoDeEjemplo()), catalogosDeEjemplo())).toEqual([])
  })

  it('la caravana de Fornost queda terminada con su cobro y los locales siguen cobrados hasta marzo', () => {
    const resultado = avanzarEjemplo(7)

    const venta = resultado.estadoNuevo.caravanas.find((c) => c.id === CARAVANA.ventaCervezaFornost)
    const cobro = delAvance(resultado).find((m) => m.vinculo?.id === CARAVANA.ventaCervezaFornost)
    expect(venta?.estado).toBe('terminada')
    expect(cobro).toBeDefined()
    expect(venta?.movimientoVueltaId).toBe(cobro?.id)
    // La compra de Tharbad no es una venta: sigue en ruta hasta la fase 4 (aviso 16).
    expect(resultado.estadoNuevo.caravanas.find((c) => c.id === CARAVANA.compraViveresTharbad)?.estado).toBe('enRuta')
    expect(resultado.estadoNuevo.localesComerciales.map((l) => l.cobradoHasta)).toEqual([
      { anio: 1640, mes: 3 },
      { anio: 1640, mes: 3 },
      { anio: 1640, mes: 3 },
      { anio: 1640, mes: 3 },
    ])
  })
})

describe('regresión: el avance del 10 al 12 de abril, desde su copia', () => {
  it('reproduce los tres movimientos y las tres filas de saldo del último avance del ejemplo', () => {
    const ejemplo = documentoDeEjemplo()
    const copia = congelar(structuredClone(SNAPSHOT_10_ABRIL))

    const resultado = simular(copia, 2, opciones())

    const esperados = [MOV_THARAN.posada12Abril, MOV_THARAN.establo12Abril, MOV_BREE.peaje12Abril].map((id) => {
      const movimiento = ejemplo.movimientos.find((m) => m.id === id)
      if (movimiento === undefined) throw new Error(`No existe «${id}»`)
      return sinId({ ...movimiento, avanceId: AVANCE_ID })
    })
    expect(delAvance(resultado).map(sinId).sort(porContenido)).toEqual(esperados.sort(porContenido))
    expect(resultado.hasta).toEqual(F(12, 4))
    expect(resultado.cambios.filter((c) => c.tipo === 'saldo')).toEqual(
      ejemplo.avances[3].cambios.filter((c) => c.tipo === 'saldo'),
    )
  })
})

describe('balance mensual y resultado fiscal (§7)', () => {
  it('Bree: entran 44 mo, salen 55,4 mo, el balance es −11,5 mo y el resultado fiscal +19 mo', () => {
    const estado = estadoDe(documentoDeEjemplo())
    const eq = estado.partida.equivalencias

    const bree = balanceMensual(estado, DOM.bree)
    expect(bree).toEqual({
      entran: 4395714,
      salen: 5542857,
      tributos: 2500000,
      balance: -1147143,
      resultadoFiscal: 1895714,
    })
    expect(formatearOroProrrateado(bree.entran, eq, { signo: true })).toBe('+44 mo')
    expect(formatearOroProrrateado(bree.salen, eq)).toBe('55,4 mo')
    expect(formatearOroProrrateado(bree.balance, eq, { signo: true })).toBe('−11,5 mo')
    expect(formatearOroProrrateado(bree.resultadoFiscal, eq, { signo: true })).toBe('+19 mo')
    expect(formatearOroProrrateado(-bree.tributos, eq, { signo: true })).toBe('−25 mo')
    // Contraejemplo (técnica 2): fila a fila con alMes, las tres soldadas de Bree darían 1 mh menos.
    const soldadas = estado.unidadesGuarnicion
      .filter((u) => u.dominioId === DOM.bree)
      .map((u) => ({ base: u.numero * u.soldada.base, recurrencia: u.recurrencia }))
    expect(soldadas.reduce((suma, p) => suma + alMes(p.base, p.recurrencia), 0)).toBe(1242856)
    expect(sumarAlMes(soldadas)).toBe(1242857)
  })

  it('Archet: el balance es −14,6 mo, y los dos balances son iguales el 12 y el 19', () => {
    const estado = estadoDe(documentoDeEjemplo())
    const eq = estado.partida.equivalencias

    const archet = balanceMensual(estado, DOM.archet)
    expect(archet.entran).toBe(860000)
    expect(archet.salen).toBe(2320000)
    expect(archet.balance).toBe(-1460000)
    expect(formatearOroProrrateado(archet.balance, eq, { signo: true })).toBe('−14,6 mo')
    const dia19 = avanzarEjemplo(7).estadoNuevo
    expect(balanceMensual(dia19, DOM.bree)).toEqual(balanceMensual(estado, DOM.bree))
    expect(balanceMensual(dia19, DOM.archet)).toEqual(archet)
  })
})

describe('el cobro de los impuestos de locales del 1 de mayo', () => {
  it('cobra 4,5 mo con la producción anotada de la tienda y deja los cuatro locales cobrados hasta abril', () => {
    const resultado = avanzarEjemplo(19)

    const cobros = delAvance(resultado).filter((m) => m.regla?.tipo === 'locales')
    expect(cobros.map(sinId)).toEqual([
      {
        dominioId: DOM.bree,
        fecha: F(1, 5),
        tipo: 'ingreso',
        importe: { base: 450000 },
        categoriaId: CATEGORIA.impuestos,
        concepto: 'Impuestos de locales · abril (4)',
        origen: 'avance',
        avanceId: AVANCE_ID,
        regla: { tipo: 'locales', id: DOM.bree },
        detalleLocales: [
          {
            localId: LOCAL.herreria1,
            nombre: 'Herrería 1',
            mes: { anio: 1640, mes: 4 },
            produccion: { base: 1000000 },
            anotada: false,
            impuesto: { base: 100000 },
          },
          {
            localId: LOCAL.posada,
            nombre: 'Posada El Poney Pisador',
            mes: { anio: 1640, mes: 4 },
            produccion: { base: 4000000 },
            anotada: false,
            impuesto: { base: 320000 },
          },
          {
            localId: LOCAL.tiendaDeTelas,
            nombre: 'Tienda de telas',
            mes: { anio: 1640, mes: 4 },
            produccion: { base: 150000 },
            anotada: true,
            impuesto: { base: 10000 },
          },
          {
            localId: LOCAL.ultramarinos,
            nombre: 'Ultramarinos del camino',
            mes: { anio: 1640, mes: 4 },
            produccion: { base: 400000 },
            anotada: false,
            impuesto: { base: 20000 },
          },
        ],
        programado: false,
      },
    ])
    expect(formatearOro(cobros[0].importe.base, resultado.estadoNuevo.partida.equivalencias)).toBe('4,5 mo')
    expect(resultado.estadoNuevo.localesComerciales.map((l) => l.cobradoHasta)).toEqual([
      { anio: 1640, mes: 4 },
      { anio: 1640, mes: 4 },
      { anio: 1640, mes: 4 },
      { anio: 1640, mes: 4 },
    ])
  })

  it('el 1 de mayo las cajas suman 18 movimientos, y sin la anotación de la tienda el cobro sería de 4,7 mo', () => {
    const resultado = avanzarEjemplo(19)

    expect(saldosPorDominio(resultado.estadoNuevo)).toEqual({
      [DOM.tharan]: 4873800,
      [DOM.bree]: 36780000,
      [DOM.archet]: 2180000,
    })
    expect(resultado.cambios.filter((c) => c.tipo === 'saldo').map((c) => c.movimientos)).toEqual([4, 12, 2])
    expect(delAvance(resultado)).toHaveLength(18)

    const sinAnotar = documentoDeEjemplo()
    sinAnotar.localesComerciales = sinAnotar.localesComerciales.map((l) => ({ ...l, producciones: [] }))
    const conLaHabitual = simular(sinAnotar, 19, opciones())
    const cobro = delAvance(conLaHabitual).find((m) => m.regla?.tipo === 'locales')
    expect(cobro?.importe).toEqual({ base: 470000 })
  })
})

describe('el impago de Archet que anuncia P4', () => {
  it('a 98 días, el 19 de julio, Archet paga 41,2 mo del tributo y el resto queda como deuda con la Corona', () => {
    const resultado = avanzarEjemplo(98)

    expect(resultado.hasta).toEqual(F(19, 7))
    expect(saldosPorDominio(resultado.estadoNuevo)).toEqual({
      [DOM.tharan]: 4975800,
      [DOM.bree]: 34270000,
      [DOM.archet]: 0,
    })
    const tributo = delAvance(resultado).find(
      (m) => m.regla?.tipo === 'tributo' && m.regla.id === IMPUESTO.tributoArchet && m.fecha.mes === 7,
    )
    // Pagado a medias: sin «introducido», porque el importe ya no es el de la regla (técnica 8).
    expect(tributo?.importe).toEqual({ base: -4120000 })
    expect(deudasDeImpago(resultado.estadoNuevo)).toEqual([
      {
        id: expect.any(String),
        dominioId: DOM.archet,
        sentido: 'debo',
        contraparteId: PERSONA.corona,
        fecha: F(19, 7),
        principal: { base: 1880000 },
        interesPct: 0,
        estado: 'abierta',
        impago: true,
        origenImpago: { tipo: 'tributo', id: IMPUESTO.tributoArchet },
        cargos: [{ fecha: F(19, 7), importe: { base: 1880000 }, avanceId: AVANCE_ID }],
        pagos: [],
        devengos: [],
      },
    ])
    // La Corona de Arthedain ya existía: no se añade a Personas y entidades.
    expect(resultado.personasNuevas).toEqual([])
  })

  it('a 98 días avisa del impago en rojo y, en ámbar, de los salarios del 26 de julio y del tributo de octubre', () => {
    const resultado = avanzarEjemplo(98)

    expect(resultado.avisos).toEqual([
      {
        tipo: 'impago',
        color: 'rojo',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no pudo pagar a Corona de Arthedain: 18,8 mo pendientes',
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre los salarios de 3,2 mo del 26 de julio',
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de octubre',
      },
    ])
  })

  it('a 105 días no se pagan los albañiles: nace «Trabajadores de Archet» con su deuda de salarios', () => {
    const resultado = avanzarEjemplo(105)

    expect(resultado.hasta).toEqual(F(26, 7))
    expect(resultado.personasNuevas).toEqual([{ id: expect.any(String), nombre: 'Trabajadores de Archet' }])
    const persona = resultado.personasNuevas[0]
    expect(resultado.estadoNuevo.personas).toContainEqual(persona)
    const salarios = deudasDeImpago(resultado.estadoNuevo).find((d) => d.origenImpago?.tipo === 'salarios')
    expect(salarios).toEqual({
      id: expect.any(String),
      dominioId: DOM.archet,
      sentido: 'debo',
      contraparteId: persona.id,
      fecha: F(26, 7),
      principal: { base: 320000 },
      interesPct: 0,
      estado: 'abierta',
      impago: true,
      origenImpago: { tipo: 'salarios', id: DOM.archet },
      cargos: [{ fecha: F(26, 7), importe: { base: 320000 }, avanceId: AVANCE_ID }],
      pagos: [],
      devengos: [],
    })
    expect(resultado.avisos.filter((a) => a.tipo === 'impago').map((a) => a.texto)).toEqual([
      'La caja de Archet no pudo pagar a Corona de Arthedain: 18,8 mo pendientes',
      'La caja de Archet no pudo pagar a Trabajadores de Archet: 3,2 mo pendientes',
    ])
  })
})

describe('un año entero: 366 días, hasta el 13 de abril de 1641', () => {
  it('solo Archet deja impagos: nueve cargos en dos deudas', () => {
    const resultado = avanzarEjemplo(366)

    expect(resultado.hasta).toEqual(F(13, 4, 1641))
    expect(saldosPorDominio(resultado.estadoNuevo)).toEqual({
      [DOM.tharan]: 5659800,
      [DOM.bree]: 23700000,
      [DOM.archet]: 2260000,
    })
    const deudas = deudasDeImpago(resultado.estadoNuevo)
    expect(deudas.map((d) => d.dominioId)).toEqual([DOM.archet, DOM.archet])
    expect(deudas.flatMap((d) => d.cargos ?? [])).toHaveLength(9)
    const tributo = deudas.find((d) => d.origenImpago?.tipo === 'tributo')
    expect(tributo?.cargos?.map((c) => [c.fecha, c.importe.base])).toEqual([
      [F(19, 7), 1880000],
      [F(19, 10), 3740000],
      [F(19, 1, 1641), 3740000],
    ])
    expect(tributo?.principal).toEqual({ base: 9360000 })
    const salarios = deudas.find((d) => d.origenImpago?.tipo === 'salarios')
    expect(salarios?.cargos?.map((c) => c.importe.base)).toEqual([320000, 320000, 320000, 320000, 320000, 320000])
    expect(salarios?.principal).toEqual({ base: 1920000 })
  })

  it('día a día, Tharan nunca baja de 45,858 mo, Bree de 218,9 mo ni Archet de 0', () => {
    let estado = estadoDe(documentoDeEjemplo())
    const minimos: Record<Id, number> = saldosPorDominio(estado)

    for (let dia = 1; dia <= 366; dia++) {
      const recorrido = recorrerDias(
        estado,
        sumarDias(estado.partida.fechaActual, 1),
        opciones(`dia${dia}`, `av.dia-${dia}`),
      )
      for (const [dominioId, saldo] of Object.entries(recorrido.saldosDespues)) {
        minimos[dominioId] = Math.min(minimos[dominioId], saldo)
      }
      estado = recorrido.estadoNuevo
    }

    expect(minimos).toEqual({ [DOM.tharan]: 4585800, [DOM.bree]: 21890000, [DOM.archet]: 0 })
    // Avanzar de uno en uno llega a las mismas cajas que un solo avance de 366 días.
    expect(saldosPorDominio(estado)).toEqual(saldosPorDominio(avanzarEjemplo(366).estadoNuevo))
  })
})

describe('invariantes con 1, 7, 19, 98 y 366 días', () => {
  const DIAS = [1, 7, 19, 98, 366]

  it('las filas de saldo cuadran con las cajas del estado nuevo y ninguna caja acaba por debajo de mín(0, antes)', () => {
    const inicial = estadoDe(documentoDeEjemplo())
    const antes = saldosPorDominio(inicial)

    for (const dias of DIAS) {
      const resultado = avanzarEjemplo(dias)
      const despues = saldosPorDominio(resultado.estadoNuevo)
      const recorrido = recorrerDias(inicial, resultado.hasta, opciones())
      expect(recorrido.saldosAntes).toEqual(antes)
      expect(recorrido.saldosDespues).toEqual(despues)
      expect(resultado.estadoNuevo.partida.fechaActual).toEqual(sumarDias(F(12, 4), dias))
      for (const cambio of resultado.cambios) {
        if (cambio.tipo !== 'saldo') continue
        expect(cambio.antes).toBe(antes[cambio.dominioId])
        expect(cambio.despues).toBe(despues[cambio.dominioId])
        expect(cambio.movimientos).toBe(delAvance(resultado).filter((m) => m.dominioId === cambio.dominioId).length)
        expect(cambio.despues).toBeGreaterThanOrEqual(Math.min(0, cambio.antes))
      }
    }
  })

  it('no toca la partida que recibe, aunque llegue congelada', () => {
    for (const dias of DIAS) {
      const entrada = congelar(structuredClone(documentoDeEjemplo()))

      const resultado = simular(entrada, dias, opciones())
      aplicarAvance(entrada, resultado, AHORA)

      expect(entrada).toEqual(documentoDeEjemplo())
    }
  })

  it('la partida aplicada pasa el esquema y la validación de copias, y deshacer devuelve la del 12 de abril', () => {
    const catalogos = catalogosDeEjemplo()

    for (const dias of DIAS) {
      const documento = documentoDeEjemplo()
      const resultado = simular(documento, dias, opciones())

      const aplicado = aplicarAvance(documento, resultado, AHORA)
      const forma = EsquemaDocumentoPartida.safeParse(aplicado)
      expect(forma.success ? [] : forma.error.issues).toEqual([])
      expect(validarCopia(aplicado, catalogos)).toEqual([])
      expect(aplicado.avances).toHaveLength(5)
      expect(aplicado.avances.filter((a) => a.snapshotPrevio !== undefined)).toHaveLength(1)
      expect(aplicado.avances[4].snapshotPrevio).toEqual(estadoDe(documento))
      expect(aplicado.partida.cambiosDesdeUltimoAvance).toBe(0)

      const deshecho = deshacerUltimoAvance(aplicado)
      expect(estadoDe(deshecho)).toEqual(estadoDe(documentoDeEjemplo()))
      expect(deshecho.avances).toHaveLength(4)
      expect(deshecho.avances[3]).not.toHaveProperty('snapshotPrevio')
      expect(puedeDeshacer(deshecho)).toBe(false)
    }
  })
})
