import { describe, expect, it } from 'vitest'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { validarReferencias } from './referencias'

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

describe('validarReferencias', () => {
  it('el documento mínimo no da ningún problema', () => {
    expect(validarReferencias(documentoMinimo(), catalogosMinimos())).toEqual([])
  })

  it('un categoriaId que no está en el catálogo da el problema literal del contrato', () => {
    const documento = documentoMinimo()
    documento.movimientos = [{ ...movimientoBase('mov.1', 'dom.bree'), categoriaId: 'cat.posadas' }]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      { ruta: 'movimientos[0].categoriaId', mensaje: 'No existe la categoría «cat.posadas»' },
    ])
  })

  it('no son error las referencias históricas que la decisión 14 admite', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      {
        ...movimientoBase('mov.1', 'dom.bree'),
        origen: 'avance',
        avanceId: 'av.borrado',
        regla: { tipo: 'locales', id: 'dom.bree' },
        detalleLocales: [
          {
            nombre: 'Herrería de Bree',
            mes: { anio: 1640, mes: 3 },
            produccion: { base: 100000 },
            anotada: true,
            impuesto: { base: 60000 },
          },
        ],
      },
      { ...movimientoBase('mov.venta', 'dom.tharan'), vinculo: { tipo: 'venta', id: 'venta.1' } },
    ]
    documento.ventas = [
      {
        id: 'venta.1',
        nombre: 'Daga élfica',
        valorAnotado: { base: 50000 },
        cantidad: 1,
        precioUnitario: { base: 60000 },
        movimientoId: 'mov.venta',
      },
    ]
    documento.hechizos = [{ id: 'hec.luz', dominioId: 'dom.tharan', nombre: 'Luz', estado: 'enEstudio' }]
    documento.intentos = [
      {
        id: 'int.1',
        hechizoId: 'hec.luz',
        fecha: { anio: 1640, mes: 4, dia: 10 },
        resultado: 'malo',
        pergaminoConsumido: false,
        pergaminoEliminado: true,
      },
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([])
  })

  it('un vínculo que no apunta a su registro da el mensaje de su tipo', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      { ...movimientoBase('mov.1', 'dom.tharan'), vinculo: { tipo: 'venta', id: 'venta.borrada' } },
      { ...movimientoBase('mov.2', 'dom.tharan'), vinculo: { tipo: 'pagoDeuda', id: 'pago.borrado' } },
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      { ruta: 'movimientos[0].vinculo.id', mensaje: 'No existe la venta «venta.borrada»' },
      { ruta: 'movimientos[1].vinculo.id', mensaje: 'No existe el pago de deuda «pago.borrado»' },
    ])
  })

  it('un registro del personaje que apunta a un asentamiento lo dice', () => {
    const documento = documentoMinimo()
    documento.hechizos = [{ id: 'hec.luz', dominioId: 'dom.bree', nombre: 'Luz', estado: 'enEstudio' }]
    expect(validarReferencias(documento, catalogosMinimos())).toContainEqual({
      ruta: 'hechizos[0].dominioId',
      mensaje: 'Este registro es del personaje y apunta a otro dominio',
    })
  })

  it('el consumo de víveres no se anota: sale de la ración', () => {
    const documento = documentoMinimo()
    documento.poblaciones[0].consumos = [
      { id: 'cons.1', nombre: 'Víveres', recursoId: 'recurso.viveres', porHabitante: 1 },
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      {
        ruta: 'poblaciones[0].consumos[0].recursoId',
        mensaje: 'El consumo de víveres sale de la ración y no se anota',
      },
    ])
  })

  it('cada dominio tiene una caja, y cada asentamiento su población, sus víveres y su mercado local', () => {
    const documento = documentoMinimo()
    documento.cajas = [
      { dominioId: 'dom.tharan', saldoInicial: { base: 0 } },
      { dominioId: 'dom.tharan', saldoInicial: { base: 0 } },
    ]
    documento.poblaciones = []
    documento.existencias = []
    documento.mercados = []
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      { ruta: 'cajas', mensaje: 'Hay dos cajas de «dom.tharan»' },
      { ruta: 'cajas', mensaje: 'Falta la caja de «dom.bree»' },
      { ruta: 'poblaciones', mensaje: 'Falta la población de «dom.bree»' },
      { ruta: 'existencias', mensaje: 'Falta la fila de víveres del almacén de «dom.bree»' },
      { ruta: 'mercados', mensaje: 'Falta el mercado local de «dom.bree»' },
    ])
  })

  it('un edificio de otro asentamiento no vale ni para un trabajador ni para un impuesto', () => {
    const documento = documentoMinimo()
    documento.dominios.push({
      id: 'dom.archet',
      tipo: 'asentamiento',
      nombre: 'Archet',
      categoria: 'aldea',
      alta: { anio: 1640, mes: 3, dia: 31 },
    })
    documento.cajas.push({ dominioId: 'dom.archet', saldoInicial: { base: 0 } })
    documento.poblaciones.push({ dominioId: 'dom.archet', habitantesIniciales: 26, cambios: [], consumos: [] })
    documento.existencias.push({ dominioId: 'dom.archet', recursoId: 'recurso.viveres', cantidad: 10 })
    documento.mercados.push({ id: 'mer.archet', nombre: 'Archet', localDe: 'dom.archet', precios: [] })
    documento.edificios = [
      {
        id: 'ed.molino',
        dominioId: 'dom.bree',
        tipoId: 'edificio.molino',
        nombre: 'Molino',
        estado: 'activo',
        trabajadoresNecesarios: 1,
        producciones: [],
      },
    ]
    documento.trabajadores = [
      {
        id: 'tra.1',
        dominioId: 'dom.archet',
        oficioId: 'oficio.molinero',
        numero: 1,
        salario: { base: 30000 },
        recurrencia: { tipo: 'semanal', diaSemana: 4 },
        edificioId: 'ed.molino',
      },
    ]
    const catalogos = catalogosMinimos()
    catalogos.opciones.push(
      { id: 'edificio.molino', nombre: 'Molino', propia: false, lista: 'tiposEdificio', grupo: 'alimentos' },
      {
        id: 'oficio.molinero',
        nombre: 'Molinero',
        plural: 'Molineros',
        propia: false,
        lista: 'oficios',
        grupo: 'oficios',
      },
    )
    expect(validarReferencias(documento, catalogos)).toEqual([
      { ruta: 'trabajadores[0].edificioId', mensaje: 'No existe el edificio «ed.molino» en este asentamiento' },
    ])
  })

  it('una producción realizada apunta a una producción que su edificio tiene', () => {
    const documento = documentoMinimo()
    documento.edificios = [
      {
        id: 'ed.granjas',
        dominioId: 'dom.bree',
        tipoId: 'edificio.granja',
        nombre: 'Granjas del oeste',
        estado: 'activo',
        trabajadoresNecesarios: 6,
        producciones: [
          {
            id: 'prod.trigo',
            recursoId: 'recurso.viveres',
            cantidad: 12,
            recurrencia: { tipo: 'mensual', diaMes: 1 },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 1 }, sumaFactores: 0 },
          },
        ],
      },
    ]
    documento.produccionesRealizadas = [
      {
        id: 'pr.1',
        fecha: { anio: 1640, mes: 4, dia: 1 },
        edificioId: 'ed.granjas',
        produccionId: 'prod.cebada',
        recursoId: 'recurso.viveres',
        cantidad: 12,
        perdida: 0,
        avanceId: 'av.1',
      },
    ]
    const catalogos = catalogosMinimos()
    catalogos.opciones.push({
      id: 'edificio.granja',
      nombre: 'Granja',
      propia: false,
      lista: 'tiposEdificio',
      grupo: 'alimentos',
    })
    expect(validarReferencias(documento, catalogos)).toEqual([
      {
        ruta: 'produccionesRealizadas[0].produccionId',
        mensaje: 'El edificio «ed.granjas» no tiene la producción «prod.cebada»',
      },
    ])
  })
})
