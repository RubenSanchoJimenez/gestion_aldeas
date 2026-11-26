import { describe, expect, it } from 'vitest'
import { OPCIONES_INICIALES, RECURSOS_INICIALES } from '../catalogo/inicial'
import type { CatalogoApp } from '../modelo/catalogos'
import type { DocumentoPartida, EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import {
  EsquemaSobreCopia,
  MARCA_COPIA,
  armarCopia,
  catalogosUsados,
  nombreDeArchivo,
  serializarCopia,
  type SobreCopia,
} from './sobre'

/** El instante de la exportación en las pruebas: el archivo lleva su fecha, «2026-09-17». */
const EXPORTADA_EL = '2026-09-17T18:30:00.000Z'

/** El catálogo de este dispositivo: las 145 opciones y los 21 recursos de fábrica, con `borrada` y `protegida`. */
function catalogoDeLaTablet(): CatalogoApp {
  return { opciones: [...OPCIONES_INICIALES], recursos: [...RECURSOS_INICIALES] }
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

describe('catalogosUsados', () => {
  it('recoge los 20 campos de catálogo del estado y del snapshotPrevio, sin repetir y en orden', () => {
    expect(catalogosUsados(documentoConCatalogos())).toEqual({
      opciones: [
        'animal.vaca',
        'cat.comercio',
        'cat.gastos-recurrentes',
        'cat.impuestos',
        'cat.rentas-y-alquileres',
        'defensa.empalizada',
        'edificio.cerveceria',
        'edificio.granero',
        'oficio.herrero',
        'unidad.guardia',
      ],
      recursos: [
        'recurso.carbon',
        'recurso.cerveza',
        'recurso.hierro',
        'recurso.lena',
        'recurso.madera',
        'recurso.piedra',
        'recurso.sal',
        'recurso.tela',
        'recurso.vino',
        'recurso.viveres',
      ],
    })
  })

  it('no recoge la clave fija de una categoría de coste, que no es una opción de catálogo', () => {
    const usados = catalogosUsados(documentoConCatalogos())
    expect(usados.opciones).not.toContain('salarios')
    expect(usados.recursos).not.toContain('salarios')
  })
})

describe('armarCopia', () => {
  it('lleva solo las opciones y los recursos que usan sus registros, sin borrada ni protegida', () => {
    const sobre = armarCopia(documentoConCatalogos(), catalogoDeLaTablet(), EXPORTADA_EL)
    expect(sobre.catalogos.opciones).toHaveLength(10)
    expect(sobre.catalogos.recursos).toHaveLength(10)
    expect(sobre.catalogos.opciones.every((opcion) => !('borrada' in opcion) && !('protegida' in opcion))).toBe(true)
    expect(sobre.catalogos.recursos.every((recurso) => !('borrada' in recurso) && !('protegido' in recurso))).toBe(true)
    expect(sobre.catalogos.opciones[0]).toEqual({
      id: 'cat.comercio',
      nombre: 'Comercio',
      propia: false,
      lista: 'categorias',
      grupo: 'asentamientos',
    })
    expect(sobre.catalogos.recursos[0]).toEqual({
      id: 'recurso.carbon',
      nombre: 'Carbón',
      unidadSingular: 'saco',
      unidadPlural: 'sacos',
      propia: false,
    })
  })

  it('ordena las opciones por lista y después por id, y los recursos por id', () => {
    const sobre = armarCopia(documentoConCatalogos(), catalogoDeLaTablet(), EXPORTADA_EL)
    expect(sobre.catalogos.opciones.map((opcion) => opcion.id)).toEqual([
      'cat.comercio',
      'cat.gastos-recurrentes',
      'cat.impuestos',
      'cat.rentas-y-alquileres',
      'oficio.herrero',
      'animal.vaca',
      'defensa.empalizada',
      'edificio.cerveceria',
      'edificio.granero',
      'unidad.guardia',
    ])
    expect(sobre.catalogos.recursos.map((recurso) => recurso.id)).toEqual([
      'recurso.carbon',
      'recurso.cerveza',
      'recurso.hierro',
      'recurso.lena',
      'recurso.madera',
      'recurso.piedra',
      'recurso.sal',
      'recurso.tela',
      'recurso.vino',
      'recurso.viveres',
    ])
  })

  it('arma un sobre que pasa EsquemaSobreCopia, con la marca y la versión del formato', () => {
    const sobre = armarCopia(documentoMinimo(), catalogoDeLaTablet(), EXPORTADA_EL)
    expect(sobre.app).toBe(MARCA_COPIA)
    expect(sobre.app).toBe('gestion-aldeas')
    expect(sobre.versionFormato).toBe(1)
    expect(sobre.exportadaEl).toBe(EXPORTADA_EL)
    expect(sobre.partida.partida.nombre).toBe('La Sombra del Este')
    expect(sobre.catalogos.opciones).toEqual([])
    expect(sobre.catalogos.recursos.map((recurso) => recurso.id)).toEqual(['recurso.viveres'])
    expect(EsquemaSobreCopia.safeParse(sobre).success).toBe(true)
  })
})

describe('serializarCopia', () => {
  it('da el mismo texto con el mismo estado, aunque las claves y las colecciones vengan en otro orden', () => {
    const sobre = armarCopia(documentoConCatalogos(), catalogoDeLaTablet(), EXPORTADA_EL)
    expect(serializarCopia(sobre)).toBe(serializarCopia(sobre))
    expect(serializarCopia(sobre).startsWith('{"app":"gestion-aldeas","versionFormato":1,"exportadaEl":')).toBe(true)
    expect(serializarCopia(JSON.parse(serializarCopia(sobre)) as SobreCopia)).toBe(serializarCopia(sobre))
    const desordenado: SobreCopia = {
      catalogos: {
        opciones: [...sobre.catalogos.opciones].reverse(),
        recursos: [...sobre.catalogos.recursos].reverse(),
      },
      partida: {
        ...sobre.partida,
        existencias: [...sobre.partida.existencias].reverse(),
        obras: [...sobre.partida.obras].reverse(),
      },
      exportadaEl: sobre.exportadaEl,
      versionFormato: sobre.versionFormato,
      app: sobre.app,
    }
    expect(serializarCopia(desordenado)).toBe(serializarCopia(sobre))
  })
})

describe('nombreDeArchivo', () => {
  it('da «gestion-aldeas-la-sombra-del-este-2026-09-17.json»', () => {
    expect(nombreDeArchivo(documentoMinimo().partida, EXPORTADA_EL)).toBe(
      'gestion-aldeas-la-sombra-del-este-2026-09-17.json',
    )
  })
})
