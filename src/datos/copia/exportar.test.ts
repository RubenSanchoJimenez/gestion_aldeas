import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { serializarCopia } from '../../dominio/copia/sobre'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import type { BaseDeDatos } from '../baseDeDatos'
import { sembrarCatalogo } from '../catalogos'
import { baseDePrueba } from '../pruebas/baseDePrueba'
import { crearPartida } from '../repositorio'
import { exportarCopia } from './exportar'

/** El instante de la exportación en las pruebas: el archivo lleva su fecha, «2026-09-17». */
const EXPORTADA_EL = '2026-09-17T18:30:00.000Z'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

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
    movimientos: [
      {
        id: 'mov.peaje',
        dominioId: 'dom.bree',
        fecha: { anio: 1640, mes: 4, dia: 12 },
        tipo: 'ingreso',
        importe: { base: 60000 },
        categoriaId: 'cat.impuestos',
        concepto: 'Peaje del puente',
        origen: 'manual',
        programado: false,
      },
    ],
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

/** Deja la base como la tendría la app: el catálogo de fábrica sembrado y la partida guardada. */
async function basePreparada(): Promise<void> {
  await sembrarCatalogo(db)
  await crearPartida(db, documentoMinimo(), '2026-09-17T09:30:00.000Z')
}

describe('exportarCopia', () => {
  it('da el archivo con su nombre, su texto y el sobre de la partida guardada', async () => {
    await basePreparada()
    const archivo = await exportarCopia(db, 'p.sombra-del-este', EXPORTADA_EL)
    expect(archivo.nombre).toBe('gestion-aldeas-la-sombra-del-este-2026-09-17.json')
    expect(archivo.sobre.app).toBe('gestion-aldeas')
    expect(archivo.sobre.versionFormato).toBe(1)
    expect(archivo.sobre.exportadaEl).toBe(EXPORTADA_EL)
    expect(archivo.sobre.partida.partida.id).toBe('p.sombra-del-este')
    expect(archivo.texto).toBe(serializarCopia(archivo.sobre))
  })

  it('lleva solo los catálogos que usan sus registros, sin borrada ni protegida', async () => {
    await basePreparada()
    const archivo = await exportarCopia(db, 'p.sombra-del-este', EXPORTADA_EL)
    expect(archivo.sobre.catalogos.opciones).toEqual([
      { id: 'cat.impuestos', nombre: 'Impuestos', propia: false, lista: 'categorias', grupo: 'asentamientos' },
    ])
    expect(archivo.sobre.catalogos.recursos).toEqual([
      {
        id: 'recurso.viveres',
        nombre: 'Víveres',
        unidadSingular: 'saco',
        unidadPlural: 'sacos',
        propia: false,
      },
    ])
  })

  it('anota exportadaEl en el resumen y no toca la partida (decisión 9)', async () => {
    await basePreparada()
    await exportarCopia(db, 'p.sombra-del-este', EXPORTADA_EL)
    const resumen = await db.resumenes.get('p.sombra-del-este')
    expect(resumen?.exportadaEl).toBe(EXPORTADA_EL)
    expect(resumen?.abiertaEl).toBe('2026-09-17T09:30:00.000Z')
    expect(resumen?.actualizada).toBe('2026-09-17T09:00:00.000Z')
    const guardado = await db.partidas.get('p.sombra-del-este')
    expect(guardado?.partida.actualizada).toBe('2026-09-17T09:00:00.000Z')
    expect(guardado?.partida.cambiosDesdeUltimoAvance).toBe(0)
  })

  it('exportar una partida que no existe lanza el error de programación del contrato', async () => {
    await sembrarCatalogo(db)
    await expect(exportarCopia(db, 'p.no-existe', EXPORTADA_EL)).rejects.toThrow(
      'No hay ninguna partida con el id «p.no-existe»',
    )
  })
})
