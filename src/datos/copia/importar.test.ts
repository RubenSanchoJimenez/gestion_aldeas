import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MARCA_COPIA, type SobreCopia } from '../../dominio/copia/sobre'
import type { CatalogosEnCopia, OpcionCatalogo } from '../../dominio/modelo/catalogos'
import type { Id } from '../../dominio/modelo/comunes'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import type { Movimiento } from '../../dominio/modelo/movimientos'
import { VERSION_FORMATO } from '../../dominio/modelo/partida'
import type { BaseDeDatos } from '../baseDeDatos'
import { sembrarCatalogo } from '../catalogos'
import { baseDePrueba } from '../pruebas/baseDePrueba'
import { crearPartida } from '../repositorio'
import { examinarDestino, importarCopia } from './importar'

/** Cuándo se exportó la copia y cuándo se importa. */
const EXPORTADA_EL = '2026-09-17T18:30:00.000Z'
const AHORA = '2026-09-18T07:00:00.000Z'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

/** Ids nuevos y predecibles: id.nuevo.1, id.nuevo.2… En la app los da nuevoId() (tarea 9). */
function idsDePrueba(): () => Id {
  let cuantos = 0
  return () => {
    cuantos += 1
    return `id.nuevo.${cuantos}`
  }
}

/** Un movimiento suelto, para colgarle la categoría de cada prueba. */
function movimientoBase(id: string, dominioId: string): Movimiento {
  return {
    id,
    dominioId,
    fecha: { anio: 1640, mes: 4, dia: 12 },
    tipo: 'ingreso',
    importe: { base: 60000 },
    categoriaId: 'cat.impuestos',
    concepto: 'Posada del camino · 7 noches',
    origen: 'manual',
    programado: false,
  }
}

/** Un documento válido y mínimo: el personaje, un asentamiento y lo que la validación exige de cada asentamiento. */
function documentoMinimo(id: Id = 'p.sombra-del-este', nombre = 'La Sombra del Este'): DocumentoPartida {
  return {
    partida: {
      id,
      nombre,
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

/** El documento de la copia, con un movimiento de la categoría que se le diga. */
function documentoCon(categoriaId: Id): DocumentoPartida {
  const documento = documentoMinimo()
  documento.movimientos = [{ ...movimientoBase('mov.posada', 'dom.bree'), categoriaId }]
  return documento
}

/** El recurso de la partida, que viaja en toda copia porque el almacén tiene su fila (§6.6). */
function viveresEnCopia(): CatalogosEnCopia['recursos'][number] {
  return { id: 'recurso.viveres', nombre: 'Víveres', unidadSingular: 'saco', unidadPlural: 'sacos', propia: false }
}

/** Los catálogos de una copia que solo usa opciones de la app. */
function catalogosDeLaApp(): CatalogosEnCopia {
  return {
    opciones: [
      { id: 'cat.impuestos', nombre: 'Impuestos', propia: false, lista: 'categorias', grupo: 'asentamientos' },
    ],
    recursos: [viveresEnCopia()],
  }
}

/** Los catálogos de una copia con la categoría propia «Posadas del camino» (decisión 7, J2e). */
function catalogosConCategoriaPropia(): CatalogosEnCopia {
  return {
    opciones: [
      { id: 'cat.copia.posadas', nombre: 'Posadas del camino', propia: true, lista: 'categorias', grupo: 'tuyas' },
    ],
    recursos: [viveresEnCopia()],
  }
}

/** Un sobre armado a mano: así cada prueba controla exactamente qué catálogos viajan. */
function sobreDe(documento: DocumentoPartida, catalogos: CatalogosEnCopia): SobreCopia {
  return {
    app: MARCA_COPIA,
    versionFormato: VERSION_FORMATO,
    exportadaEl: EXPORTADA_EL,
    partida: documento,
    catalogos,
  }
}

describe('examinarDestino', () => {
  it('en una base vacía, desde el selector, solo se puede añadir', async () => {
    await sembrarCatalogo(db)
    const destino = await examinarDestino(db, sobreDe(documentoMinimo(), catalogosDeLaApp()), 'selector')
    expect(destino).toEqual({ yaExiste: false, modos: ['nueva'] })
  })

  it('con la partida ya guardada, desde el selector, ofrece reemplazar o importar como copia', async () => {
    await sembrarCatalogo(db)
    await crearPartida(db, documentoMinimo(), '2026-09-17T09:30:00.000Z')
    const destino = await examinarDestino(db, sobreDe(documentoMinimo(), catalogosDeLaApp()), 'selector')
    expect(destino).toEqual({
      yaExiste: true,
      nombreExistente: 'La Sombra del Este',
      modos: ['reemplazar', 'comoCopia'],
    })
  })

  it('desde ajustes, la copia de la partida abierta solo puede reemplazarla (§6.1)', async () => {
    await sembrarCatalogo(db)
    await crearPartida(db, documentoMinimo(), '2026-09-17T09:30:00.000Z')
    const copia = sobreDe(documentoMinimo(), catalogosDeLaApp())
    const destino = await examinarDestino(db, copia, 'ajustes', 'p.sombra-del-este')
    expect(destino).toEqual({ yaExiste: true, nombreExistente: 'La Sombra del Este', modos: ['reemplazar'] })
  })

  it('desde ajustes, la copia de otra partida se rechaza con el mensaje del contrato', async () => {
    await sembrarCatalogo(db)
    const copia = sobreDe(documentoMinimo(), catalogosDeLaApp())
    const destino = await examinarDestino(db, copia, 'ajustes', 'p.otra-partida')
    expect(destino).toEqual({
      yaExiste: false,
      modos: [],
      rechazo: { motivo: 'otraPartida', mensaje: 'Esta copia es de otra partida' },
    })
  })
})

describe('importarCopia', () => {
  it('en una base vacía guarda la partida, su resumen con abiertaEl y la línea del modo', async () => {
    await sembrarCatalogo(db)
    const copia = sobreDe(documentoCon('cat.impuestos'), catalogosDeLaApp())
    const resultado = await importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() })
    expect(resultado.partidaId).toBe('p.sombra-del-este')
    expect(resultado.lineas).toEqual(['Se ha añadido la partida «La Sombra del Este».'])
    const guardada = await db.partidas.get('p.sombra-del-este')
    expect(guardada?.movimientos[0].categoriaId).toBe('cat.impuestos')
    const resumen = await db.resumenes.get('p.sombra-del-este')
    expect(resumen?.abiertaEl).toBe(AHORA)
    expect(resumen?.actualizada).toBe('2026-09-17T09:00:00.000Z')
    expect(resumen?.dominios).toEqual(['Tharan', 'Bree'])
  })

  it('«Reemplazar» deja una sola partida, con el estado de la copia', async () => {
    await sembrarCatalogo(db)
    await crearPartida(db, documentoMinimo(), '2026-09-17T09:30:00.000Z')
    const copia = sobreDe(documentoCon('cat.impuestos'), catalogosDeLaApp())
    const resultado = await importarCopia(db, copia, { modo: 'reemplazar', ahora: AHORA, nuevoId: idsDePrueba() })
    expect(resultado.lineas[0]).toBe('Se ha reemplazado la partida «La Sombra del Este».')
    expect(await db.partidas.count()).toBe(1)
    const guardada = await db.partidas.get('p.sombra-del-este')
    expect(guardada?.movimientos).toHaveLength(1)
    const resumen = await db.resumenes.get('p.sombra-del-este')
    expect(resumen?.abiertaEl).toBe(AHORA)
    expect(resumen?.exportadaEl).toBeUndefined()
  })

  it('«Importar como copia» deja dos partidas, con id y nombre nuevos', async () => {
    await sembrarCatalogo(db)
    await crearPartida(db, documentoMinimo(), '2026-09-17T09:30:00.000Z')
    const copia = sobreDe(documentoCon('cat.impuestos'), catalogosDeLaApp())
    const resultado = await importarCopia(db, copia, { modo: 'comoCopia', ahora: AHORA, nuevoId: idsDePrueba() })
    expect(resultado.partidaId).toBe('id.nuevo.1')
    expect(resultado.nombre).toBe('La Sombra del Este (copia)')
    expect(resultado.lineas[0]).toBe('Se ha importado como copia: «La Sombra del Este (copia)».')
    expect(await db.partidas.count()).toBe(2)
    const nueva = await db.partidas.get('id.nuevo.1')
    expect(nueva?.partida.nombre).toBe('La Sombra del Este (copia)')
    expect(nueva?.partida.creada).toBe('2026-09-17T08:00:00.000Z')
    const vieja = await db.partidas.get('p.sombra-del-este')
    expect(vieja?.partida.nombre).toBe('La Sombra del Este')
  })

  it('la categoría propia de la copia se crea con id nuevo y el movimiento importado la sigue', async () => {
    await sembrarCatalogo(db)
    const copia = sobreDe(documentoCon('cat.copia.posadas'), catalogosConCategoriaPropia())
    const resultado = await importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() })
    const creada = await db.opcionesCatalogo.get('id.nuevo.1')
    expect(creada).toEqual({
      id: 'id.nuevo.1',
      nombre: 'Posadas del camino',
      propia: true,
      lista: 'categorias',
      grupo: 'tuyas',
      borrada: false,
    })
    const guardada = await db.partidas.get('p.sombra-del-este')
    expect(guardada?.movimientos[0].categoriaId).toBe('id.nuevo.1')
    expect(resultado.lineas).toContain('Se ha añadido tu categoría «Posadas del camino».')
  })

  it('la categoría propia se une a la de este dispositivo por nombre normalizado y no se duplica', async () => {
    await sembrarCatalogo(db)
    const posadasDeLaTablet: OpcionCatalogo = {
      id: 'cat.mias.posadas',
      nombre: 'Posadas del Camino',
      propia: true,
      lista: 'categorias',
      grupo: 'tuyas',
      borrada: false,
    }
    await db.opcionesCatalogo.put(posadasDeLaTablet)
    const antes = await db.opcionesCatalogo.count()
    const copia = sobreDe(documentoCon('cat.copia.posadas'), catalogosConCategoriaPropia())
    const resultado = await importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() })
    expect(await db.opcionesCatalogo.count()).toBe(antes)
    const guardada = await db.partidas.get('p.sombra-del-este')
    expect(guardada?.movimientos[0].categoriaId).toBe('cat.mias.posadas')
    expect(resultado.lineas).toContain(
      'La categoría «Posadas del Camino» de la copia se ha unido a la tuya con el mismo nombre.',
    )
  })

  it('una opción de la app que estaba eliminada se reactiva (decisión 7)', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.impuestos')
      .modify((opcion) => {
        opcion.borrada = true
      })
    const copia = sobreDe(documentoCon('cat.impuestos'), catalogosDeLaApp())
    const resultado = await importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() })
    expect((await db.opcionesCatalogo.get('cat.impuestos'))?.borrada).toBe(false)
    expect(resultado.lineas).toContain('Se ha recuperado la categoría «Impuestos», que estaba eliminada.')
  })

  it('las líneas van en orden: el modo, la migración y la fusión', async () => {
    await sembrarCatalogo(db)
    const copia = sobreDe(documentoCon('cat.copia.posadas'), catalogosConCategoriaPropia())
    const resultado = await importarCopia(db, copia, {
      modo: 'nueva',
      ahora: AHORA,
      nuevoId: idsDePrueba(),
      migrada: true,
      desdeVersion: 0,
    })
    expect(resultado.lineas).toEqual([
      'Se ha añadido la partida «La Sombra del Este».',
      'La copia venía en el formato 0 y se ha actualizado al formato 1.',
      'Se ha añadido tu categoría «Posadas del camino».',
    ])
  })

  it('el resumen dice qué partida se ha importado, con qué modo y sin migración', async () => {
    await sembrarCatalogo(db)
    const copia = sobreDe(documentoCon('cat.copia.posadas'), catalogosConCategoriaPropia())
    const resultado = await importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() })
    expect(resultado.partidaId).toBe('p.sombra-del-este')
    expect(resultado.nombre).toBe('La Sombra del Este')
    expect(resultado.modo).toBe('nueva')
    expect(resultado.migrada).toBe(false)
    expect(resultado.desdeVersion).toBeUndefined()
    expect(resultado.fusion.creadas).toEqual([
      { id: 'id.nuevo.1', lista: 'categorias', nombre: 'Posadas del camino', propia: true },
    ])
  })

  it('si la escritura falla a mitad, la transacción deja el catálogo como estaba', async () => {
    await sembrarCatalogo(db)
    const opcionesAntes = await db.opcionesCatalogo.count()
    const copia = sobreDe(documentoCon('cat.copia.posadas'), catalogosConCategoriaPropia())
    // Una función no se puede clonar en IndexedDB: el put de la partida falla después de escribir el catálogo.
    const partida = copia.partida.partida as unknown as Record<string, unknown>
    partida.creada = () => '2026-09-17T08:00:00.000Z'
    await expect(
      importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() }),
    ).rejects.toThrow()
    expect(await db.partidas.count()).toBe(0)
    expect(await db.resumenes.count()).toBe(0)
    expect(await db.opcionesCatalogo.count()).toBe(opcionesAntes)
    expect(await db.opcionesCatalogo.get('id.nuevo.1')).toBeUndefined()
  })

  it('no toca las demás partidas guardadas', async () => {
    await sembrarCatalogo(db)
    await crearPartida(db, documentoMinimo('p.otra', 'Los Puertos Grises'), '2026-09-17T09:30:00.000Z')
    const copia = sobreDe(documentoCon('cat.impuestos'), catalogosDeLaApp())
    await importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() })
    expect(await db.partidas.count()).toBe(2)
    const otra = await db.partidas.get('p.otra')
    expect(otra?.partida.nombre).toBe('Los Puertos Grises')
    const resumen = await db.resumenes.get('p.otra')
    expect(resumen?.abiertaEl).toBe('2026-09-17T09:30:00.000Z')
  })
})
