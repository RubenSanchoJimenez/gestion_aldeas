import { describe, expect, it } from 'vitest'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { validarUnicidades } from './unicidades'

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

describe('validarUnicidades', () => {
  it('el documento mínimo no da ningún problema', () => {
    expect(validarUnicidades(documentoMinimo(), catalogosMinimos())).toEqual([])
  })

  it('dos registros con el mismo id, con la ruta del segundo', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      movimientoBase('mov.posada.12abril', 'dom.tharan'),
      movimientoBase('mov.posada.12abril', 'dom.tharan'),
    ]
    expect(validarUnicidades(documento, catalogosMinimos())).toEqual([
      { ruta: 'movimientos[1].id', mensaje: 'El identificador «mov.posada.12abril» está repetido' },
    ])
  })

  it('cuenta también los ids de las listas de dentro (decisión propia 24)', () => {
    const documento = documentoMinimo()
    documento.personas = [{ id: 'persona.gremio-bree', nombre: 'Gremio de mercaderes de Bree' }]
    documento.movimientos = [
      { ...movimientoBase('mov.pago', 'dom.tharan'), vinculo: { tipo: 'pagoDeuda', id: 'mov.pago' } },
    ]
    documento.deudas = [
      {
        id: 'deuda.gremio',
        dominioId: 'dom.tharan',
        sentido: 'debo',
        contraparteId: 'persona.gremio-bree',
        fecha: { anio: 1640, mes: 4, dia: 1 },
        principal: { base: 4200000 },
        interesPct: 0,
        estado: 'abierta',
        impago: false,
        pagos: [
          {
            id: 'mov.pago',
            fecha: { anio: 1640, mes: 4, dia: 10 },
            importe: { base: 1500000 },
            aplicarA: 'interesesYCapital',
            movimientoId: 'mov.pago',
          },
        ],
        devengos: [],
      },
    ]
    expect(validarUnicidades(documento, catalogosMinimos())).toEqual([
      { ruta: 'deudas[0].pagos[0].id', mensaje: 'El identificador «mov.pago» está repetido' },
    ])
  })

  it('las ubicaciones no se repiten y no chocan con «Almacén de Bree» ni con «Encima»', () => {
    const documento = documentoMinimo()
    documento.ubicaciones = [
      { id: 'ubi.1', nombre: 'Posada El Poney Pisador' },
      { id: 'ubi.2', nombre: '  posada   el  poney pisador ' },
      { id: 'ubi.3', nombre: 'ALMACÉN DE BREE' },
      { id: 'ubi.4', nombre: 'Encima' },
    ]
    expect(validarUnicidades(documento, catalogosMinimos())).toEqual([
      { ruta: 'ubicaciones[1].nombre', mensaje: 'Ya existe la ubicación «  posada   el  poney pisador »' },
      { ruta: 'ubicaciones[2].nombre', mensaje: 'Ya existe la ubicación «ALMACÉN DE BREE»' },
      { ruta: 'ubicaciones[3].nombre', mensaje: 'Ya existe la ubicación «Encima»' },
    ])
  })

  it('personas, hechizos y mercados tienen cada uno su mensaje', () => {
    const documento = documentoMinimo()
    documento.personas = [
      { id: 'persona.1', nombre: 'Gremio de mercaderes de Bree' },
      { id: 'persona.2', nombre: 'gremio de mercaderes de bree' },
    ]
    documento.hechizos = [
      { id: 'hec.1', dominioId: 'dom.tharan', nombre: 'Luz', estado: 'enEstudio' },
      { id: 'hec.2', dominioId: 'dom.tharan', nombre: 'luz', estado: 'enEstudio' },
    ]
    documento.mercados.push({ id: 'mer.otro', nombre: 'Bree', precios: [] })
    expect(validarUnicidades(documento, catalogosMinimos())).toEqual([
      { ruta: 'personas[1].nombre', mensaje: 'Ya existe «gremio de mercaderes de bree» en Personas y entidades' },
      { ruta: 'hechizos[1].nombre', mensaje: 'Ya tienes el hechizo «luz»' },
      { ruta: 'mercados[1].nombre', mensaje: 'Ya existe el mercado «Bree»' },
    ])
  })

  it('dos animales del mismo tipo y género y dos filas del mismo recurso en un almacén', () => {
    const documento = documentoMinimo()
    documento.animales = [
      { id: 'ani.1', dominioId: 'dom.bree', tipoId: 'animal.vaca', cantidad: 12, genero: 'hembra' },
      { id: 'ani.2', dominioId: 'dom.bree', tipoId: 'animal.vaca', cantidad: 3, genero: 'hembra' },
    ]
    documento.existencias.push({ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 5 })
    expect(validarUnicidades(documento, catalogosMinimos())).toEqual([
      { ruta: 'animales[1]', mensaje: '«dom.bree» ya tiene una fila de ese tipo y ese género' },
      { ruta: 'existencias[1]', mensaje: 'El almacén de «dom.bree» repite la fila de «recurso.viveres»' },
    ])
  })

  it('una ruta no se repite, tampoco en el sentido inverso entre dos asentamientos (decisión propia 32)', () => {
    const documento = documentoMinimo()
    documento.dominios.push({
      id: 'dom.archet',
      tipo: 'asentamiento',
      nombre: 'Archet',
      categoria: 'aldea',
      alta: { anio: 1640, mes: 3, dia: 31 },
    })
    documento.cajas.push({ dominioId: 'dom.archet', saldoInicial: { base: 0 } })
    documento.rutas = [
      { origenId: 'dom.bree', destino: { tipo: 'asentamiento', id: 'dom.archet' }, diasViaje: 1 },
      { origenId: 'dom.archet', destino: { tipo: 'asentamiento', id: 'dom.bree' }, diasViaje: 1 },
      { origenId: 'dom.bree', destino: { tipo: 'mercado', id: 'mer.fornost' }, diasViaje: 4 },
      { origenId: 'dom.bree', destino: { tipo: 'mercado', id: 'mer.fornost' }, diasViaje: 4 },
    ]
    expect(validarUnicidades(documento, catalogosMinimos())).toEqual([
      { ruta: 'rutas[1]', mensaje: 'Ya hay una ruta entre «dom.archet» y «dom.bree»' },
      { ruta: 'rutas[3]', mensaje: 'Ya hay una ruta entre «dom.bree» y «mer.fornost»' },
    ])
  })

  it('el catálogo: ids repetidos, nombres iguales en una lista, «víveres» y los nombres del filtro', () => {
    const catalogos = catalogosMinimos()
    catalogos.opciones.push(
      { id: 'cat.otros', nombre: 'Peajes', propia: true, lista: 'categorias', grupo: 'tuyas' },
      { id: 'cat.otros-2', nombre: 'otros', propia: true, lista: 'categorias', grupo: 'tuyas' },
      { id: 'cat.todas', nombre: 'Todas', propia: true, lista: 'categorias', grupo: 'tuyas' },
      { id: 'oficio.otros', nombre: 'Otros', propia: true, lista: 'oficios', grupo: 'oficios', plural: 'Otros' },
    )
    catalogos.recursos.push({
      id: 'recurso.provisiones',
      nombre: 'víveres',
      unidadSingular: 'saco',
      unidadPlural: 'sacos',
      propia: true,
    })
    expect(validarUnicidades(documentoMinimo(), catalogos)).toEqual([
      { ruta: 'catalogos.opciones[1].id', mensaje: 'El identificador «cat.otros» está repetido' },
      { ruta: 'catalogos.opciones[2].nombre', mensaje: 'Ya existe «otros» en esta lista' },
      { ruta: 'catalogos.opciones[4].plural', mensaje: 'Ya existe «Otros» en esta lista' },
      { ruta: 'catalogos.recursos[1].nombre', mensaje: 'Ya existe el recurso «víveres»' },
      { ruta: 'catalogos.recursos[1].nombre', mensaje: '«Víveres» lo crea la partida con su ración' },
      { ruta: 'catalogos.opciones[3].nombre', mensaje: 'Ese nombre lo usa el filtro' },
    ])
  })
})
