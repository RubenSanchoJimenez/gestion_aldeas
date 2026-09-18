import { describe, expect, it } from 'vitest'
import type {
  CatalogoApp,
  CatalogosEnCopia,
  OpcionCatalogo,
  OpcionEnCopia,
  RecursoCatalogo,
  RecursoEnCopia,
} from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { DocumentoPartida, EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { fusionarCatalogos, lineasDeFusion, remapearCatalogos, type ResumenFusion } from './fusion'
import { catalogosUsados } from './sobre'

/** Ids nuevos y predecibles: id.nuevo.1, id.nuevo.2… En la app los da nuevoId() (tarea 9). */
function idsDePrueba(): () => Id {
  let cuantos = 0
  return () => {
    cuantos += 1
    return `id.nuevo.${cuantos}`
  }
}

/** Los catálogos que acompañan a una copia. */
function catalogosDeLaCopia(opciones: OpcionEnCopia[], recursos: RecursoEnCopia[] = []): CatalogosEnCopia {
  return { opciones, recursos }
}

/** El catálogo de esta tablet. */
function catalogoDeLaTablet(opciones: OpcionCatalogo[], recursos: RecursoCatalogo[] = []): CatalogoApp {
  return { opciones, recursos }
}

/** Una categoría tal como viaja en la copia (§6.1): sin `borrada` ni `protegida`. */
function categoriaEnCopia(id: Id, nombre: string, propia = false): OpcionEnCopia {
  return { id, nombre, propia, lista: 'categorias', grupo: propia ? 'tuyas' : 'gastosPersonaje' }
}

/** Una categoría del catálogo de esta tablet. */
function categoriaEnLaTablet(id: Id, nombre: string, extra: { propia?: boolean; borrada?: boolean } = {}): OpcionCatalogo {
  const propia = extra.propia ?? false
  return {
    id,
    nombre,
    propia,
    lista: 'categorias',
    grupo: propia ? 'tuyas' : 'gastosPersonaje',
    borrada: extra.borrada ?? false,
  }
}

/** Un oficio tal como viaja en la copia: es la única lista que guarda plural (§6.5 n.º 22). */
function oficioEnCopia(id: Id, nombre: string, plural: string, propia = false): OpcionEnCopia {
  return { id, nombre, plural, propia, lista: 'oficios', grupo: 'oficios' }
}

/** Un oficio del catálogo de esta tablet. */
function oficioEnLaTablet(id: Id, nombre: string, plural: string): OpcionCatalogo {
  return { id, nombre, plural, propia: false, lista: 'oficios', grupo: 'oficios', borrada: false }
}

/** Un recurso tal como viaja en la copia (§6.1): sin `borrada` ni `protegido`. */
function recursoEnCopia(
  id: Id,
  nombre: string,
  unidadSingular: string,
  unidadPlural: string,
  propia = false,
): RecursoEnCopia {
  return { id, nombre, unidadSingular, unidadPlural, propia }
}

/** Un recurso del catálogo de esta tablet. */
function recursoEnLaTablet(
  id: Id,
  nombre: string,
  unidadSingular: string,
  unidadPlural: string,
  extra: { propia?: boolean; borrada?: boolean; protegido?: 'viveres' | 'reserva' } = {},
): RecursoCatalogo {
  return {
    id,
    nombre,
    unidadSingular,
    unidadPlural,
    propia: extra.propia ?? false,
    borrada: extra.borrada ?? false,
    protegido: extra.protegido,
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
function estadoDelSnapshot(documento: DocumentoPartida): EstadoPartida {
  const { avances, ...estado } = documento
  void avances
  return estado
}

/**
 * Un documento con un registro de cada uno de los 20 campos de catálogo (`contrato-datos.md` §2.9) y con un
 * snapshotPrevio que usa una categoría que el estado no usa.
 */
function documentoConCatalogos(): DocumentoPartida {
  const documento = documentoMinimo()
  documento.movimientos = [{ ...movimientoBase('mov.1', 'dom.bree'), categoriaId: 'cat.impuestos' }]
  documento.recurrentes = [
    {
      id: 'rec.1',
      dominioId: 'dom.bree',
      tipo: 'gasto',
      concepto: 'Aceite de las lámparas',
      importe: { base: 20000 },
      categoriaId: 'cat.gastos-recurrentes',
      cuentaId: 'dom.bree',
      recurrencia: { tipo: 'mensual', diaMes: 1 },
      activo: true,
    },
  ]
  documento.impuestosRentas = [
    {
      id: 'imp.1',
      dominioId: 'dom.bree',
      sentido: 'ingreso',
      concepto: 'Renta de la herrería',
      base: 'fija',
      importe: { base: 100000 },
      categoriaId: 'cat.rentas-y-alquileres',
      recurrencia: { tipo: 'mensual', diaMes: 1 },
    },
  ]
  documento.trabajadores = [
    {
      id: 'trab.1',
      dominioId: 'dom.bree',
      oficioId: 'oficio.herrero',
      numero: 2,
      salario: { base: 30000 },
      recurrencia: { tipo: 'mensual', diaMes: 1 },
    },
  ]
  documento.edificios = [
    {
      id: 'ed.cerveceria',
      dominioId: 'dom.bree',
      tipoId: 'edificio.cerveceria',
      nombre: 'Cervecería del Poney',
      estado: 'activo',
      trabajadoresNecesarios: 2,
      producciones: [
        {
          id: 'prod.1',
          recursoId: 'recurso.cerveza',
          cantidad: 4,
          recurrencia: { tipo: 'semanal', diaSemana: 0 },
          acumulado: { desde: { anio: 1640, mes: 4, dia: 1 }, sumaFactores: 0 },
        },
      ],
    },
  ]
  documento.unidadesGuarnicion = [
    {
      id: 'uni.1',
      dominioId: 'dom.bree',
      tipoId: 'unidad.guardia',
      nombre: 'Guardia del portón',
      numero: 6,
      soldada: { base: 20000 },
      recurrencia: { tipo: 'mensual', diaMes: 1 },
    },
  ]
  documento.defensas = [
    { id: 'def.1', dominioId: 'dom.bree', tipoId: 'defensa.empalizada', nombre: 'Empalizada del norte', estado: 'buena' },
  ]
  documento.animales = [{ id: 'ani.1', dominioId: 'dom.bree', tipoId: 'animal.vaca', cantidad: 12, genero: 'hembra' }]
  documento.obras = [
    {
      id: 'obra.granero',
      dominioId: 'dom.bree',
      nombre: 'Granero nuevo',
      estado: 'programada',
      coste: { base: 500000 },
      materiales: { 'recurso.madera': 30, 'recurso.piedra': 12 },
      inicio: { anio: 1640, mes: 4, dia: 20 },
      diasTotales: 20,
      efecto: { tipo: 'crearEdificio', tipoId: 'edificio.granero' },
    },
    {
      id: 'obra.almacen',
      dominioId: 'dom.bree',
      nombre: 'Ampliar el almacén de tela',
      estado: 'programada',
      coste: { base: 200000 },
      materiales: {},
      inicio: { anio: 1640, mes: 4, dia: 25 },
      diasTotales: 10,
      efecto: { tipo: 'ampliarAlmacen', recursoId: 'recurso.tela', valor: 50 },
    },
  ]
  documento.poblaciones[0].consumos = [{ id: 'cons.1', nombre: 'Leña', recursoId: 'recurso.lena', porHabitante: 0.02 }]
  documento.existencias = [
    { dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 },
    { dominioId: 'dom.bree', recursoId: 'recurso.cerveza', cantidad: 30 },
    { dominioId: 'dom.bree', recursoId: 'recurso.sal', cantidad: 12 },
    { dominioId: 'dom.bree', recursoId: 'recurso.hierro', cantidad: 20 },
    { dominioId: 'dom.bree', recursoId: 'recurso.carbon', cantidad: 8 },
  ]
  documento.ajustesExistencias = [
    {
      id: 'aj.1',
      dominioId: 'dom.bree',
      recursoId: 'recurso.sal',
      fecha: { anio: 1640, mes: 4, dia: 2 },
      delta: -3,
      motivo: 'Se echó a perder con la humedad',
    },
  ]
  documento.entradasAlmacen = [
    {
      id: 'ent.1',
      dominioId: 'dom.bree',
      recursoId: 'recurso.hierro',
      cantidad: 10,
      operacion: 'recepcion',
      fecha: { anio: 1640, mes: 4, dia: 3 },
      aplicada: true,
    },
  ]
  documento.produccionesRealizadas = [
    {
      id: 'pr.1',
      fecha: { anio: 1640, mes: 4, dia: 8 },
      edificioId: 'ed.cerveceria',
      produccionId: 'prod.1',
      recursoId: 'recurso.cerveza',
      cantidad: 4,
      perdida: 0,
      avanceId: 'av.1',
    },
  ]
  documento.mercados[0].precios = [{ recursoId: 'recurso.vino', importe: { base: 90000 } }]
  documento.caravanas = [
    {
      id: 'car.1',
      dominioId: 'dom.bree',
      operacion: 'compra',
      mercadoId: 'mer.bree',
      carga: { recursoId: 'recurso.carbon', cantidad: 8 },
      precioUnidad: { base: 5000 },
      importe: { base: 40000 },
      salida: { anio: 1640, mes: 4, dia: 8 },
      vuelta: { anio: 1640, mes: 4, dia: 10 },
      estado: 'terminada',
    },
  ]
  documento.eventos = [
    {
      id: 'ev.1',
      dominioId: 'dom.bree',
      nombre: 'Invierno largo',
      inicio: { anio: 1640, mes: 4, dia: 1 },
      duracionDias: 10,
      efectos: [
        { ambito: 'consumo', objetivo: { tipo: 'recurso', id: 'recurso.lena' }, pct: 20 },
        { ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'salarios' }, pct: 10 },
      ],
    },
  ]
  const snapshot = estadoDelSnapshot(documento)
  snapshot.movimientos = [{ ...movimientoBase('mov.viejo', 'dom.bree'), categoriaId: 'cat.comercio' }]
  documento.avances = [{ ...documento.avances[0], snapshotPrevio: snapshot }]
  return documento
}

/** Un remapeo que le cambia el final a todos los ids de catálogo que usa el documento. */
function remapeoDeTodo(documento: DocumentoPartida): Record<Id, Id> {
  const usados = catalogosUsados(documento)
  const remapeo: Record<Id, Id> = {}
  for (const id of [...usados.opciones, ...usados.recursos]) {
    remapeo[id] = `${id}.tablet`
  }
  return remapeo
}

describe('fusionarCatalogos: las opciones de la app', () => {
  it('se casan por id: manda el nombre de esta tablet y el resumen lo dice', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([categoriaEnCopia('cat.alojamiento', 'Hospedaje')]),
      catalogoDeLaTablet([categoriaEnLaTablet('cat.alojamiento', 'Alojamiento')]),
      idsDePrueba(),
    )
    expect(fusion.remapeo).toEqual({})
    expect(fusion.cambios).toEqual({
      opcionesNuevas: [],
      recursosNuevos: [],
      opcionesReactivadas: [],
      recursosReactivados: [],
    })
    expect(fusion.resumen.nombresConservados).toEqual([
      { id: 'cat.alojamiento', lista: 'categorias', enLaCopia: 'Hospedaje', enLaTablet: 'Alojamiento' },
    ])
  })

  it('una opción borrada en esta tablet se reactiva (decisión 7)', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([categoriaEnCopia('cat.comercio', 'Comercio')]),
      catalogoDeLaTablet([categoriaEnLaTablet('cat.comercio', 'Comercio', { borrada: true })]),
      idsDePrueba(),
    )
    expect(fusion.cambios.opcionesReactivadas).toEqual(['cat.comercio'])
    expect(fusion.resumen.reactivadas).toEqual([{ id: 'cat.comercio', lista: 'categorias', nombre: 'Comercio' }])
    expect(fusion.resumen.nombresConservados).toEqual([])
    expect(fusion.remapeo).toEqual({})
  })

  it('una opción de la app que esta tablet no conoce se crea tal cual, con su id', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([categoriaEnCopia('cat.peajes', 'Peajes')]),
      catalogoDeLaTablet([]),
      idsDePrueba(),
    )
    expect(fusion.cambios.opcionesNuevas).toEqual([
      {
        id: 'cat.peajes',
        nombre: 'Peajes',
        propia: false,
        lista: 'categorias',
        grupo: 'gastosPersonaje',
        borrada: false,
      },
    ])
    expect(fusion.resumen.creadas).toEqual([
      { id: 'cat.peajes', lista: 'categorias', nombre: 'Peajes', propia: false },
    ])
    expect(fusion.remapeo).toEqual({})
  })
})

describe('fusionarCatalogos: las opciones propias', () => {
  it('se unen por nombre normalizado a la de esta tablet y el registro se remapea', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([categoriaEnCopia('cat.copia.posadas', 'Posadas del camino', true)]),
      catalogoDeLaTablet([categoriaEnLaTablet('cat.mias.posadas', 'Posadas del Camino', { propia: true })]),
      idsDePrueba(),
    )
    expect(fusion.remapeo).toEqual({ 'cat.copia.posadas': 'cat.mias.posadas' })
    expect(fusion.cambios.opcionesNuevas).toEqual([])
    expect(fusion.resumen.unidasPorNombre).toEqual([
      {
        idEnLaCopia: 'cat.copia.posadas',
        id: 'cat.mias.posadas',
        lista: 'categorias',
        nombre: 'Posadas del Camino',
      },
    ])
  })

  it('sin coincidencia se crean con nuevoId(), conservando grupo y plural', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([oficioEnCopia('oficio.copia.cetrero', 'Cetrero', 'Cetreros', true)]),
      catalogoDeLaTablet([]),
      idsDePrueba(),
    )
    expect(fusion.cambios.opcionesNuevas).toEqual([
      {
        id: 'id.nuevo.1',
        nombre: 'Cetrero',
        plural: 'Cetreros',
        propia: true,
        lista: 'oficios',
        grupo: 'oficios',
        borrada: false,
      },
    ])
    expect(fusion.remapeo).toEqual({ 'oficio.copia.cetrero': 'id.nuevo.1' })
    expect(fusion.resumen.creadas).toEqual([
      { id: 'id.nuevo.1', lista: 'oficios', nombre: 'Cetrero', propia: true },
    ])
  })

  it('dos propias con el mismo nombre acaban en la misma opción: la que crea la propia fusión', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([
        categoriaEnCopia('cat.copia.posadas', 'Posadas del camino', true),
        categoriaEnCopia('cat.copia.posadas-2', 'posadas del camino', true),
      ]),
      catalogoDeLaTablet([]),
      idsDePrueba(),
    )
    expect(fusion.cambios.opcionesNuevas).toHaveLength(1)
    expect(fusion.remapeo).toEqual({ 'cat.copia.posadas': 'id.nuevo.1', 'cat.copia.posadas-2': 'id.nuevo.1' })
    expect(fusion.resumen.unidasPorNombre).toEqual([
      {
        idEnLaCopia: 'cat.copia.posadas-2',
        id: 'id.nuevo.1',
        lista: 'categorias',
        nombre: 'Posadas del camino',
      },
    ])
  })

  it('la búsqueda por nombre no mira las borradas ni las de otra lista', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([categoriaEnCopia('cat.copia.herrero', 'Herrero', true)]),
      catalogoDeLaTablet([
        categoriaEnLaTablet('cat.mias.herrero', 'Herrero', { propia: true, borrada: true }),
        oficioEnLaTablet('oficio.herrero', 'Herrero', 'Herreros'),
      ]),
      idsDePrueba(),
    )
    expect(fusion.remapeo).toEqual({ 'cat.copia.herrero': 'id.nuevo.1' })
    expect(fusion.resumen.unidasPorNombre).toEqual([])
    expect(fusion.resumen.creadas).toEqual([
      { id: 'id.nuevo.1', lista: 'categorias', nombre: 'Herrero', propia: true },
    ])
  })

  it('el remapeo solo lleva las entradas cuyo id cambia', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([
        categoriaEnCopia('cat.alojamiento', 'Alojamiento'),
        categoriaEnCopia('cat.mias.posadas', 'Posadas del camino', true),
      ]),
      catalogoDeLaTablet([
        categoriaEnLaTablet('cat.alojamiento', 'Alojamiento'),
        categoriaEnLaTablet('cat.mias.posadas', 'Posadas del camino', { propia: true }),
      ]),
      idsDePrueba(),
    )
    expect(fusion.remapeo).toEqual({})
    expect(fusion.resumen.unidasPorNombre).toEqual([
      {
        idEnLaCopia: 'cat.mias.posadas',
        id: 'cat.mias.posadas',
        lista: 'categorias',
        nombre: 'Posadas del camino',
      },
    ])
  })
})

describe('fusionarCatalogos: los recursos', () => {
  it('un recurso propio llamado «víveres» se une al recurso de la partida (§6.6)', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([], [recursoEnCopia('recurso.copia.viveres', 'víveres', 'saco', 'sacos', true)]),
      catalogoDeLaTablet(
        [],
        [recursoEnLaTablet('recurso.viveres', 'Víveres', 'saco', 'sacos', { protegido: 'viveres' })],
      ),
      idsDePrueba(),
    )
    expect(fusion.remapeo).toEqual({ 'recurso.copia.viveres': 'recurso.viveres' })
    expect(fusion.cambios.recursosNuevos).toEqual([])
    expect(fusion.resumen.unidasPorNombre).toEqual([
      { idEnLaCopia: 'recurso.copia.viveres', id: 'recurso.viveres', lista: 'recursos', nombre: 'Víveres' },
    ])
  })

  it('un recurso con otras unidades conserva las de esta tablet y lo anota', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([], [recursoEnCopia('recurso.sal', 'Sal', 'fardo', 'fardos')]),
      catalogoDeLaTablet([], [recursoEnLaTablet('recurso.sal', 'Sal', 'saco', 'sacos')]),
      idsDePrueba(),
    )
    expect(fusion.cambios.recursosNuevos).toEqual([])
    expect(fusion.resumen.unidadesConservadas).toEqual([
      { id: 'recurso.sal', nombre: 'Sal', enLaCopia: 'fardo / fardos', enLaTablet: 'saco / sacos' },
    ])
  })
})

describe('lineasDeFusion', () => {
  it('da los textos literales del contrato, en orden', () => {
    const resumen: ResumenFusion = {
      nombresConservados: [
        { id: 'cat.alojamiento', lista: 'categorias', enLaCopia: 'Hospedaje', enLaTablet: 'Alojamiento' },
      ],
      reactivadas: [
        { id: 'cat.comercio', lista: 'categorias', nombre: 'Comercio' },
        { id: 'oficio.molinero', lista: 'oficios', nombre: 'Molinero' },
      ],
      unidasPorNombre: [
        {
          idEnLaCopia: 'cat.copia.posadas',
          id: 'cat.mias.posadas',
          lista: 'categorias',
          nombre: 'Posadas del camino',
        },
      ],
      creadas: [
        { id: 'id.nuevo.1', lista: 'categorias', nombre: 'Posadas del camino', propia: true },
        { id: 'cat.peajes', lista: 'categorias', nombre: 'Peajes', propia: false },
        { id: 'recurso.cal', lista: 'recursos', nombre: 'Cal', propia: false },
      ],
      unidadesConservadas: [
        { id: 'recurso.sal', nombre: 'Sal', enLaCopia: 'fardo / fardos', enLaTablet: 'saco / sacos' },
      ],
    }
    expect(lineasDeFusion(resumen)).toEqual([
      'La categoría «Alojamiento» se llama «Hospedaje» en la copia: se conserva el nombre de esta tablet.',
      'Se ha recuperado la categoría «Comercio», que estaba eliminada.',
      'Se ha recuperado el oficio «Molinero», que estaba eliminado.',
      'La categoría «Posadas del camino» de la copia se ha unido a la tuya con el mismo nombre.',
      'Se ha añadido tu categoría «Posadas del camino».',
      'Se ha añadido la categoría «Peajes», que esta tablet no tenía.',
      'Se ha añadido el recurso «Cal», que esta tablet no tenía.',
      'El recurso «Sal» se mide aquí en «saco / sacos» y en la copia en «fardo / fardos»: se conservan las unidades de esta tablet.',
    ])
  })
})

describe('remapearCatalogos', () => {
  it('alcanza los 20 campos de catálogo del estado', () => {
    const documento = documentoConCatalogos()
    const remapeado = remapearCatalogos(documento, remapeoDeTodo(documento))
    expect(remapeado.movimientos[0].categoriaId).toBe('cat.impuestos.tablet')
    expect(remapeado.recurrentes[0].categoriaId).toBe('cat.gastos-recurrentes.tablet')
    expect(remapeado.impuestosRentas[0].categoriaId).toBe('cat.rentas-y-alquileres.tablet')
    expect(remapeado.trabajadores[0].oficioId).toBe('oficio.herrero.tablet')
    expect(remapeado.edificios[0].tipoId).toBe('edificio.cerveceria.tablet')
    expect(remapeado.edificios[0].producciones[0].recursoId).toBe('recurso.cerveza.tablet')
    expect(remapeado.unidadesGuarnicion[0].tipoId).toBe('unidad.guardia.tablet')
    expect(remapeado.defensas[0].tipoId).toBe('defensa.empalizada.tablet')
    expect(remapeado.animales[0].tipoId).toBe('animal.vaca.tablet')
    expect(remapeado.obras[0].efecto).toEqual({ tipo: 'crearEdificio', tipoId: 'edificio.granero.tablet' })
    expect(remapeado.obras[1].efecto).toEqual({
      tipo: 'ampliarAlmacen',
      recursoId: 'recurso.tela.tablet',
      valor: 50,
    })
    expect(Object.keys(remapeado.obras[0].materiales)).toEqual(['recurso.madera.tablet', 'recurso.piedra.tablet'])
    expect(remapeado.poblaciones[0].consumos[0].recursoId).toBe('recurso.lena.tablet')
    expect(remapeado.existencias.map((existencia) => existencia.recursoId)).toEqual([
      'recurso.viveres.tablet',
      'recurso.cerveza.tablet',
      'recurso.sal.tablet',
      'recurso.hierro.tablet',
      'recurso.carbon.tablet',
    ])
    expect(remapeado.ajustesExistencias[0].recursoId).toBe('recurso.sal.tablet')
    expect(remapeado.entradasAlmacen[0].recursoId).toBe('recurso.hierro.tablet')
    expect(remapeado.produccionesRealizadas[0].recursoId).toBe('recurso.cerveza.tablet')
    expect(remapeado.mercados[0].precios[0].recursoId).toBe('recurso.vino.tablet')
    expect(remapeado.caravanas[0].carga.recursoId).toBe('recurso.carbon.tablet')
  })

  it('alcanza el snapshotPrevio y no toca la clave fija de una categoría de coste', () => {
    const documento = documentoConCatalogos()
    const remapeado = remapearCatalogos(documento, remapeoDeTodo(documento))
    expect(remapeado.avances[0].snapshotPrevio?.movimientos[0].categoriaId).toBe('cat.comercio.tablet')
    expect(remapeado.eventos[0].efectos).toEqual([
      { ambito: 'consumo', objetivo: { tipo: 'recurso', id: 'recurso.lena.tablet' }, pct: 20 },
      { ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'salarios' }, pct: 10 },
    ])
    expect(documento.movimientos[0].categoriaId).toBe('cat.impuestos')
  })

  it('con un remapeo vacío devuelve el mismo documento', () => {
    const documento = documentoConCatalogos()
    expect(remapearCatalogos(documento, {})).toBe(documento)
  })

  it('recorre los mismos campos que catalogosUsados: después no queda ningún id viejo', () => {
    const documento = documentoConCatalogos()
    const usados = catalogosUsados(documento)
    const remapeado = remapearCatalogos(documento, remapeoDeTodo(documento))
    const despues = catalogosUsados(remapeado)
    expect(despues.opciones).toEqual(usados.opciones.map((id) => `${id}.tablet`))
    expect(despues.recursos).toEqual(usados.recursos.map((id) => `${id}.tablet`))
    const texto = JSON.stringify(remapeado)
    for (const id of [...usados.opciones, ...usados.recursos]) {
      expect(texto).not.toContain(`"${id}"`)
    }
  })
})
