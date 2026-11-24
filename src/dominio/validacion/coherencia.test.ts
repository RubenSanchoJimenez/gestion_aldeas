import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { DocumentoPartida, EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { detalleDeProblemas, problemasDeZod, validarCoherenciaInterna, validarCopia } from './coherencia'

/** Un esquema con la misma forma que los del modelo, para provocar errores de Zod de verdad. */
const EsquemaFechaDePrueba = z.object({ anio: z.int(), mes: z.int(), dia: z.int() }).check((ctx) => {
  if (ctx.value.mes === 4 && ctx.value.dia > 30) {
    ctx.issues.push({ code: 'custom', message: `Abril de ${ctx.value.anio} tiene 30 días`, input: ctx.value })
  }
})

const EsquemaDePrueba = z.object({
  partida: z.object({ nombre: z.string() }),
  movimientos: z.array(z.object({ id: z.string(), fecha: EsquemaFechaDePrueba })),
})

/** Un documento con una fecha imposible en el segundo movimiento. */
function conFechaImposible(): unknown {
  return {
    partida: { nombre: 'La Sombra del Este' },
    movimientos: [
      { id: 'mov.1', fecha: { anio: 1640, mes: 4, dia: 12 } },
      { id: 'mov.2', fecha: { anio: 1640, mes: 4, dia: 31 } },
    ],
  }
}

/** Los catálogos mínimos que acompañan a una copia: una categoría y el recurso protegido «Víveres». */
function catalogosMinimos(): CatalogosEnCopia {
  return {
    opciones: [{ id: 'cat.otros', nombre: 'Otros', propia: false, lista: 'categorias', grupo: 'otros' }],
    recursos: [
      { id: 'recurso.viveres', nombre: 'Víveres', unidadSingular: 'saco', unidadPlural: 'sacos', propia: false },
    ],
  }
}

/** Un documento válido y mínimo: el personaje, un asentamiento y lo que la validación exige de cada asentamiento. */
function documentoMinimo(): DocumentoPartida {
  return {
    partida: {
      id: 'p.sombra-del-este',
      nombre: 'La Sombra del Este',
      edad: 'tercera',
      equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 3, dia: 31 },
      fechaActual: { anio: 1640, mes: 4, dia: 12 },
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T09:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [
      { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
      {
        id: 'dom.bree',
        tipo: 'asentamiento',
        nombre: 'Bree',
        categoria: 'pueblo',
        alta: { anio: 1640, mes: 3, dia: 31 },
      },
    ],
    cajas: [
      { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } },
      { dominioId: 'dom.bree', saldoInicial: { base: 34000000 } },
    ],
    movimientos: [],
    transferencias: [],
    deudas: [],
    recurrentes: [],
    objetos: [],
    ventas: [],
    inversiones: [],
    hechizos: [],
    intentos: [],
    pergaminos: [],
    poblaciones: [{ dominioId: 'dom.bree', habitantesIniciales: 1214, cambios: [], consumos: [] }],
    existencias: [{ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 }],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [{ id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
    avances: [
      {
        id: 'av.1',
        desde: { anio: 1640, mes: 3, dia: 31 },
        hasta: { anio: 1640, mes: 4, dia: 12 },
        aplicadoEl: '2026-09-17T09:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ],
  }
}

/** Un movimiento suelto, para colgarle lo que cada prueba necesite. */
function movimientoBase(id: string, dominioId: string): Movimiento {
  return {
    id,
    dominioId,
    fecha: { anio: 1640, mes: 4, dia: 12 },
    tipo: 'ingreso',
    importe: { base: 60000 },
    categoriaId: 'cat.otros',
    concepto: 'Peaje del puente',
    origen: 'manual',
    programado: false,
  }
}

/** El estado que guarda un snapshotPrevio: el documento sin su lista de avances (§8, decisión 4). */
function estadoDelSnapshot(): EstadoPartida {
  const { avances, ...estado } = documentoMinimo()
  void avances
  return estado
}

describe('la forma de los errores de Zod 4.6.5', () => {
  it('issue.path es un array de claves y de índices, e issue.code dice qué falló', () => {
    const resultado = EsquemaDePrueba.safeParse(conFechaImposible())
    expect(resultado.success).toBe(false)
    if (resultado.success) {
      return
    }
    expect(resultado.error.issues).toHaveLength(1)
    const issue = resultado.error.issues[0]
    expect(issue.path).toEqual(['movimientos', 1, 'fecha'])
    expect(issue.path.map((tramo) => typeof tramo)).toEqual(['string', 'number', 'string'])
    expect(issue.code).toBe('custom')
    expect(issue.message).toBe('Abril de 1640 tiene 30 días')
  })

  it('un error de la raíz trae el path vacío y el código invalid_type', () => {
    const resultado = EsquemaDePrueba.safeParse('esto no es un objeto')
    expect(resultado.success).toBe(false)
    if (resultado.success) {
      return
    }
    expect(resultado.error.issues[0].path).toEqual([])
    expect(resultado.error.issues[0].code).toBe('invalid_type')
  })

  it('z.prettifyError escribe «→ at», en inglés: por eso el detalle no lo usa', () => {
    const resultado = EsquemaDePrueba.safeParse(conFechaImposible())
    if (resultado.success) {
      throw new Error('el esquema debía rechazarlo')
    }
    expect(z.prettifyError(resultado.error)).toContain('→ at movimientos[1].fecha')
  })
})

describe('problemasDeZod y detalleDeProblemas', () => {
  it('arma la ruta con puntos e índices y escribe las dos líneas en castellano', () => {
    const resultado = EsquemaDePrueba.safeParse(conFechaImposible())
    if (resultado.success) {
      throw new Error('el esquema debía rechazarlo')
    }
    const problemas = problemasDeZod(resultado.error)
    expect(problemas).toEqual([{ ruta: 'movimientos[1].fecha', mensaje: 'Abril de 1640 tiene 30 días' }])
    expect(detalleDeProblemas(problemas)).toBe('✖ Abril de 1640 tiene 30 días\n  → en movimientos[1].fecha')
    const raiz = EsquemaDePrueba.safeParse('esto no es un objeto')
    if (raiz.success) {
      throw new Error('el esquema debía rechazarlo')
    }
    expect(problemasDeZod(raiz.error)[0].ruta).toBe('la copia')
    expect(
      detalleDeProblemas([
        { ruta: 'movimientos[3].categoriaId', mensaje: 'No existe la categoría «cat.posadas»' },
        { ruta: 'edificios[0].producciones[1].recursoId', mensaje: 'No existe el recurso «recurso.cal»' },
      ]),
    ).toBe(
      '✖ No existe la categoría «cat.posadas»\n  → en movimientos[3].categoriaId\n' +
        '✖ No existe el recurso «recurso.cal»\n  → en edificios[0].producciones[1].recursoId',
    )
  })
})

describe('validarCoherenciaInterna', () => {
  it('pilla lo tecleado que no cuadra con el importe guardado, con las equivalencias de la partida', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      // 6 mp son 60.000 mh con las equivalencias por defecto, no 70.000.
      {
        ...movimientoBase('mov.1', 'dom.bree'),
        importe: { base: 70000, introducido: { cantidad: '6', moneda: 'mp' } },
      },
      {
        ...movimientoBase('mov.2', 'dom.bree'),
        importe: { base: 60000, introducido: { cantidad: '0,6', moneda: 'mo' } },
      },
      // En un gasto se compara el valor absoluto: −0,6 mo también cuadra.
      {
        ...movimientoBase('mov.3', 'dom.bree'),
        tipo: 'gasto',
        importe: { base: -60000, introducido: { cantidad: '0,6', moneda: 'mo' } },
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([
      { ruta: 'movimientos[0].importe', mensaje: 'Lo tecleado («6 mp») no cuadra con el importe guardado' },
    ])
  })

  it('pilla la fecha actual que no cuadra con los avances y el snapshot que no es del último', () => {
    const documento = documentoMinimo()
    const snapshot = estadoDelSnapshot()
    documento.avances = [
      { ...documento.avances[0], id: 'av.1', snapshotPrevio: snapshot },
      {
        id: 'av.2',
        desde: { anio: 1640, mes: 4, dia: 12 },
        hasta: { anio: 1640, mes: 4, dia: 20 },
        aplicadoEl: '2026-09-17T10:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([
      { ruta: 'partida.fechaActual', mensaje: 'La fecha actual no cuadra con los avances' },
      { ruta: 'avances[0].snapshotPrevio', mensaje: 'Solo el último avance guarda la copia de la partida' },
    ])
  })

  it('pilla los estados y las fechas que no cuadran con la fecha actual', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      { ...movimientoBase('mov.futuro', 'dom.bree'), fecha: { anio: 1640, mes: 5, dia: 1 }, programado: false },
    ]
    documento.obras = [
      {
        id: 'obra.granero',
        dominioId: 'dom.bree',
        nombre: 'Granero nuevo',
        estado: 'terminada',
        coste: { base: 1000000 },
        materiales: { 'recurso.viveres': 10 },
        inicio: { anio: 1640, mes: 4, dia: 10 },
        diasTotales: 30,
        efecto: { tipo: 'ampliarAlmacen', recursoId: 'recurso.viveres', valor: 100 },
      },
    ]
    documento.personas = [{ id: 'persona.gremio-bree', nombre: 'Gremio de mercaderes de Bree' }]
    documento.deudas = [
      {
        id: 'deuda.gremio',
        dominioId: 'dom.tharan',
        sentido: 'debo',
        contraparteId: 'persona.gremio-bree',
        fecha: { anio: 1640, mes: 4, dia: 1 },
        principal: { base: 4200000 },
        interesPct: 0,
        vencimiento: { anio: 1640, mes: 6, dia: 1 },
        estado: 'vencida',
        impago: false,
        pagos: [],
        devengos: [],
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([
      { ruta: 'movimientos[0].programado', mensaje: 'Un movimiento con fecha futura tiene que estar programado' },
      { ruta: 'obras[0]', mensaje: 'El estado de la obra «obra.granero» no cuadra con sus fechas' },
      {
        ruta: 'deudas[0].vencimiento',
        mensaje: 'La deuda con «persona.gremio-bree» está marcada vencida y no ha vencido',
      },
    ])
  })

  it('una deuda que vence hoy puede estar ya vencida: el paso 10 la marca ese mismo día', () => {
    const documento = documentoMinimo()
    documento.personas = [{ id: 'persona.gremio-bree', nombre: 'Gremio de mercaderes de Bree' }]
    documento.deudas = [
      {
        id: 'deuda.gremio',
        dominioId: 'dom.tharan',
        sentido: 'debo',
        contraparteId: 'persona.gremio-bree',
        fecha: { anio: 1640, mes: 4, dia: 1 },
        principal: { base: 4200000 },
        interesPct: 0,
        vencimiento: documento.partida.fechaActual,
        estado: 'vencida',
        impago: false,
        pagos: [],
        devengos: [],
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([])
  })

  it('admite obras y caravanas programadas con la fecha ya pasada, y las entradas sin aplicar (D-018)', () => {
    const documento = documentoMinimo()
    documento.obras = [
      {
        id: 'obra.granero',
        dominioId: 'dom.bree',
        nombre: 'Granero nuevo',
        estado: 'programada',
        coste: { base: 1000000 },
        materiales: { 'recurso.viveres': 10 },
        inicio: { anio: 1640, mes: 4, dia: 5 },
        diasTotales: 30,
        efecto: { tipo: 'ampliarAlmacen', recursoId: 'recurso.viveres', valor: 100 },
      },
      {
        id: 'obra.muralla',
        dominioId: 'dom.bree',
        nombre: 'Muralla',
        estado: 'enCurso',
        coste: { base: 2000000 },
        materiales: { 'recurso.viveres': 5 },
        inicio: { anio: 1640, mes: 4, dia: 1 },
        diasTotales: 3,
        efecto: { tipo: 'ampliarAlmacen', recursoId: 'recurso.viveres', valor: 50 },
      },
    ]
    documento.caravanas = [
      {
        id: 'car.viveres',
        dominioId: 'dom.bree',
        operacion: 'compra',
        mercadoId: 'mer.bree',
        carga: { recursoId: 'recurso.viveres', cantidad: 30 },
        precioUnidad: { base: 25000 },
        importe: { base: 750000 },
        salida: { anio: 1640, mes: 4, dia: 5 },
        vuelta: { anio: 1640, mes: 4, dia: 20 },
        estado: 'programada',
      },
    ]
    documento.entradasAlmacen = [
      {
        id: 'ent.1',
        dominioId: 'dom.bree',
        recursoId: 'recurso.viveres',
        cantidad: 30,
        operacion: 'recepcion',
        fecha: { anio: 1640, mes: 4, dia: 1 },
        aplicada: false,
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([])
  })

  it('sigue pillando una obra en curso que no ha empezado y una caravana en ruta que no ha salido', () => {
    const documento = documentoMinimo()
    documento.obras = [
      {
        id: 'obra.granero',
        dominioId: 'dom.bree',
        nombre: 'Granero nuevo',
        estado: 'enCurso',
        coste: { base: 1000000 },
        materiales: { 'recurso.viveres': 10 },
        inicio: { anio: 1640, mes: 5, dia: 1 },
        diasTotales: 30,
        efecto: { tipo: 'ampliarAlmacen', recursoId: 'recurso.viveres', valor: 100 },
      },
    ]
    documento.caravanas = [
      {
        id: 'car.viveres',
        dominioId: 'dom.bree',
        operacion: 'compra',
        mercadoId: 'mer.bree',
        carga: { recursoId: 'recurso.viveres', cantidad: 30 },
        precioUnidad: { base: 25000 },
        importe: { base: 750000 },
        salida: { anio: 1640, mes: 5, dia: 1 },
        vuelta: { anio: 1640, mes: 5, dia: 20 },
        estado: 'enRuta',
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([
      { ruta: 'obras[0]', mensaje: 'El estado de la obra «obra.granero» no cuadra con sus fechas' },
      { ruta: 'caravanas[0]', mensaje: 'El estado de la caravana «car.viveres» no cuadra con sus fechas' },
    ])
  })

  it('pilla una transferencia cuyos dos movimientos no cuadran con ella', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      {
        ...movimientoBase('mov.sale', 'dom.tharan'),
        tipo: 'transferencia',
        importe: { base: -60000 },
        vinculo: { tipo: 'transferencia', id: 'tr.1' },
      },
      {
        ...movimientoBase('mov.entra', 'dom.bree'),
        tipo: 'transferencia',
        importe: { base: 50000 },
        vinculo: { tipo: 'transferencia', id: 'tr.1' },
      },
    ]
    documento.transferencias = [
      {
        id: 'tr.1',
        fecha: { anio: 1640, mes: 4, dia: 12 },
        importe: { base: 60000 },
        saleDeId: 'dom.tharan',
        entraEnId: 'dom.bree',
        movimientoSaleId: 'mov.sale',
        movimientoEntraId: 'mov.entra',
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([
      { ruta: 'transferencias[0]', mensaje: 'La transferencia «tr.1» no cuadra con sus movimientos' },
    ])
  })

  it('pilla una caravana terminada cuya vuelta todavía no ha llegado', () => {
    const documento = documentoMinimo()
    documento.caravanas = [
      {
        id: 'car.viveres',
        dominioId: 'dom.bree',
        operacion: 'compra',
        mercadoId: 'mer.bree',
        carga: { recursoId: 'recurso.viveres', cantidad: 30 },
        precioUnidad: { base: 25000 },
        importe: { base: 750000 },
        salida: { anio: 1640, mes: 4, dia: 5 },
        vuelta: { anio: 1640, mes: 4, dia: 20 },
        estado: 'terminada',
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([
      { ruta: 'caravanas[0]', mensaje: 'El estado de la caravana «car.viveres» no cuadra con sus fechas' },
    ])
  })

  it('pilla un local cobrado hasta el mes en curso: el mes se cobra cuando ha terminado', () => {
    const documento = documentoMinimo()
    documento.tiposLocal = [
      {
        id: 'tipo.taberna',
        dominioId: 'dom.bree',
        nombre: 'Taberna',
        pct: 10,
        minimo: { base: 10000 },
        diaCobro: 1,
      },
    ]
    const local = {
      id: 'local.pony',
      dominioId: 'dom.bree',
      nombre: 'El Poney Pisador',
      tipoId: 'tipo.taberna',
      produccionHabitual: { base: 200000 },
      cambiosEstado: [{ desde: { anio: 1640, mes: 3, dia: 31 }, estado: 'abierto' as const }],
      alta: { anio: 1640, mes: 3, dia: 31 },
      cobradoHasta: { anio: 1640, mes: 3 },
      producciones: [],
    }
    documento.localesComerciales = [local]
    expect(validarCoherenciaInterna(documento)).toEqual([])

    documento.localesComerciales = [{ ...local, cobradoHasta: { anio: 1640, mes: 4 } }]
    expect(validarCoherenciaInterna(documento)).toEqual([
      { ruta: 'localesComerciales[0]', mensaje: 'El estado o el cobro de «local.pony» no cuadran con su alta' },
    ])
  })
})

describe('validarCopia', () => {
  it('no da nada con el documento mínimo y prefija los problemas del snapshot del último avance', () => {
    expect(validarCopia(documentoMinimo(), catalogosMinimos())).toEqual([])
    expect(validarCoherenciaInterna(documentoMinimo())).toEqual([])
    const documento = documentoMinimo()
    const snapshot = estadoDelSnapshot()
    snapshot.movimientos = [{ ...movimientoBase('mov.1', 'dom.bree'), categoriaId: 'cat.posadas' }]
    documento.avances = [{ ...documento.avances[0], snapshotPrevio: snapshot }]
    expect(validarCopia(documento, catalogosMinimos())).toEqual([
      {
        ruta: 'avances[0].snapshotPrevio.movimientos[0].categoriaId',
        mensaje: 'No existe la categoría «cat.posadas»',
      },
    ])
  })

  it('no duplica los problemas del catálogo al validar el snapshot: los catálogos van fuera de la partida', () => {
    const catalogos = catalogosMinimos()
    catalogos.opciones.push({ id: 'cat.otros', nombre: 'Otros (bis)', propia: true, lista: 'categorias', grupo: 'otros' })
    const documento = documentoMinimo()
    documento.avances = [{ ...documento.avances[0], snapshotPrevio: estadoDelSnapshot() }]
    expect(validarCopia(documento, catalogos)).toEqual([
      { ruta: 'catalogos.opciones[1].id', mensaje: 'El identificador «cat.otros» está repetido' },
    ])
  })
})

describe('lo que la fase 3 necesita de la validación (técnicas 4 y 6)', () => {
  /** El cobro de locales del 1 de abril en Bree: 4,7 mo, con dos locales en el detalle que suman eso. */
  function cobroDeLocales(): Movimiento {
    return {
      ...movimientoBase('mov.locales', 'dom.bree'),
      fecha: { anio: 1640, mes: 4, dia: 1 },
      importe: { base: 470000 },
      concepto: 'Impuestos de locales · marzo (2)',
      origen: 'avance',
      avanceId: 'av.1',
      regla: { tipo: 'locales', id: 'dom.bree' },
      detalleLocales: [
        {
          localId: 'loc.herreria',
          nombre: 'Herrería 1',
          mes: { anio: 1640, mes: 3 },
          produccion: { base: 1500000 },
          anotada: false,
          impuesto: { base: 150000 },
        },
        {
          localId: 'loc.posada',
          nombre: 'Posada El Poney Pisador',
          mes: { anio: 1640, mes: 3 },
          produccion: { base: 4000000 },
          anotada: false,
          impuesto: { base: 320000 },
        },
      ],
    }
  }

  /** Los salarios del 6 de abril en Bree: −4,2 mo, con dos filas en el detalle que suman eso. */
  function pagoDeSalarios(): Movimiento {
    return {
      ...movimientoBase('mov.salarios', 'dom.bree'),
      fecha: { anio: 1640, mes: 4, dia: 6 },
      tipo: 'gasto',
      importe: { base: -420000 },
      concepto: 'Salarios de 14 trabajadores',
      origen: 'avance',
      avanceId: 'av.1',
      regla: { tipo: 'salarios', id: 'dom.bree' },
      detalleTrabajo: [
        { origenId: 'trab.granjeros', nombre: 'Granjeros', numero: 6, importe: { base: 180000 } },
        { origenId: 'trab.lenadores', nombre: 'Leñadores', numero: 8, importe: { base: 240000 } },
      ],
    }
  }

  it('sigue pillando el detalle que no cuadra con el total cuando nadie lo ha editado', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      { ...cobroDeLocales(), importe: { base: 500000 } },
      { ...pagoDeSalarios(), importe: { base: -400000 } },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([
      { ruta: 'movimientos[0].detalleLocales', mensaje: 'El cobro de locales «mov.locales» no cuadra con su detalle' },
      { ruta: 'movimientos[1].detalleTrabajo', mensaje: 'El pago agrupado «mov.salarios» no cuadra con su detalle' },
    ])
  })

  it('admite el total corregido con J2c: con editadoEl ya no se compara con el detalle (técnica 4)', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      { ...cobroDeLocales(), importe: { base: 500000 }, editadoEl: '2026-09-18T10:00:00.000Z' },
      { ...pagoDeSalarios(), importe: { base: -400000 }, editadoEl: '2026-09-18T10:05:00.000Z' },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([])
  })

  it('admite un edificio alquilado sin renta: la renta es un ingreso aparte (D-036, técnica 6)', () => {
    const documento = documentoMinimo()
    documento.edificios = [
      {
        id: 'ed.molino',
        dominioId: 'dom.bree',
        tipoId: 'tipoed.molino',
        nombre: 'Molino',
        estado: 'alquilado',
        trabajadoresNecesarios: 0,
        producciones: [],
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([])
  })
})
