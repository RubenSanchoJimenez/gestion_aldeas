import { describe, expect, it } from 'vitest'
import { OPCIONES_INICIALES, RECURSOS_INICIALES } from '../catalogo/inicial'
import type { CatalogoApp } from '../modelo/catalogos'
import type { DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { analizarCopia } from './analizar'
import { armarCopia, serializarCopia } from './sobre'

/** El instante de la exportación en las pruebas. */
const EXPORTADA_EL = '2026-09-17T18:30:00.000Z'

/** El catálogo de esta tablet: las 145 opciones y los 21 recursos de fábrica. */
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
    categoriaId: 'cat.impuestos',
    concepto: 'Peaje del puente',
    origen: 'manual',
    programado: false,
  }
}

/** El texto de una copia válida de «La Sombra del Este», tal como lo escribiría exportarCopia. */
function textoDeCopia(): string {
  return serializarCopia(armarCopia(documentoMinimo(), catalogoDeLaTablet(), EXPORTADA_EL))
}

/** El texto de una copia válida con un retoque a mano, que es como llegan los archivos rotos. */
function textoRetocado(retocar: (sobre: Record<string, unknown>) => void): string {
  const sobre = JSON.parse(textoDeCopia()) as Record<string, unknown>
  retocar(sobre)
  return JSON.stringify(sobre)
}

describe('analizarCopia', () => {
  it('acepta una copia del formato actual y dice que no ha hecho falta migrarla', () => {
    const resultado = analizarCopia(textoDeCopia())
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) {
      return
    }
    expect(resultado.migrada).toBe(false)
    expect(resultado.desdeVersion).toBe(1)
    expect(resultado.copia.partida.partida.id).toBe('p.sombra-del-este')
    expect(resultado.copia.catalogos.recursos.map((recurso) => recurso.id)).toEqual(['recurso.viveres'])
  })

  it('un texto que no es JSON no es una copia', () => {
    const resultado = analizarCopia('esto no es un archivo de la app')
    expect(resultado).toEqual({
      ok: false,
      motivo: 'noEsCopia',
      mensaje: 'Este archivo no es una copia de Gestión de Aldeas',
    })
  })

  it('un JSON sin la marca de la app tampoco es una copia', () => {
    expect(analizarCopia(JSON.stringify({ partidas: [] }))).toEqual({
      ok: false,
      motivo: 'noEsCopia',
      mensaje: 'Este archivo no es una copia de Gestión de Aldeas',
    })
    expect(analizarCopia(JSON.stringify({ app: 'otra-app', versionFormato: 1 }))).toEqual({
      ok: false,
      motivo: 'noEsCopia',
      mensaje: 'Este archivo no es una copia de Gestión de Aldeas',
    })
  })

  it('una copia de una versión más nueva se rechaza con el mensaje de la especificación', () => {
    const texto = textoRetocado((sobre) => {
      sobre.versionFormato = 2
    })
    expect(analizarCopia(texto)).toEqual({
      ok: false,
      motivo: 'versionMasNueva',
      mensaje: 'Esta copia es de una versión más nueva de la app',
    })
  })

  it('una fecha imposible la pilla el esquema, con el detalle en castellano', () => {
    const texto = textoRetocado((sobre) => {
      const documento = sobre.partida as Record<string, unknown>
      documento.movimientos = [{ ...movimientoBase('mov.1', 'dom.bree'), fecha: { anio: 1640, mes: 4, dia: 31 } }]
    })
    const resultado = analizarCopia(texto)
    expect(resultado.ok).toBe(false)
    if (resultado.ok) {
      return
    }
    expect(resultado.motivo).toBe('daniada')
    expect(resultado.mensaje).toBe('La copia está dañada')
    expect(resultado.detalle).toContain('✖ Abril de 1640 tiene 30 días')
    expect(resultado.detalle).toContain('→ en partida.movimientos[0].fecha')
    expect(resultado.detalle).not.toContain('→ at')
  })

  it('una categoría que no viaja en la copia la pillan los validadores, con su ruta dentro del documento', () => {
    const texto = textoRetocado((sobre) => {
      const documento = sobre.partida as Record<string, unknown>
      documento.movimientos = [{ ...movimientoBase('mov.1', 'dom.bree'), categoriaId: 'cat.posadas' }]
    })
    const resultado = analizarCopia(texto)
    expect(resultado.ok).toBe(false)
    if (resultado.ok) {
      return
    }
    expect(resultado.motivo).toBe('daniada')
    expect(resultado.mensaje).toBe('La copia está dañada')
    expect(resultado.detalle).toBe('✖ No existe la categoría «cat.posadas»\n  → en movimientos[0].categoriaId')
  })

  it('los campos desconocidos se descartan y la copia se acepta (decisión 14)', () => {
    const texto = textoRetocado((sobre) => {
      sobre.desconocido = 'lo que traiga una versión futura'
      const documento = sobre.partida as Record<string, unknown>
      const partida = documento.partida as Record<string, unknown>
      partida.apodo = 'La Sombra'
    })
    const resultado = analizarCopia(texto)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) {
      return
    }
    expect('desconocido' in resultado.copia).toBe(false)
    expect('apodo' in resultado.copia.partida.partida).toBe(false)
  })
})
