import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { analizarCopia } from '../dominio/copia/analizar'
import type { SobreCopia } from '../dominio/copia/sobre'
import { formatearOro } from '../dominio/dinero/formato'
import { saldosPorDominio } from '../dominio/dinero/saldo'
import { documentoDeEjemplo } from '../dominio/ejemplo/sombraDelEste'
import type { OpcionCatalogo } from '../dominio/modelo/catalogos'
import type { Id, Instante } from '../dominio/modelo/comunes'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import type { BaseDeDatos } from './baseDeDatos'
import { sembrarCatalogo } from './catalogos'
import { exportarCopia } from './copia/exportar'
import { examinarDestino, importarCopia } from './copia/importar'
import { baseDePrueba } from './pruebas/baseDePrueba'
import { crearPartida, leerPartida, listarPartidas } from './repositorio'

/** Instantes fijos y en orden: ninguna prueba depende del reloj. */
const SESION_ORIGEN: Instante = '2026-09-17T10:00:00.000Z'
const EXPORTACION: Instante = '2026-09-17T11:00:00.000Z'
const SESION_DESTINO: Instante = '2026-09-17T12:00:00.000Z'

/** Ids fijos y legibles de «La Sombra del Este» (decisión 8); los escriben las tareas 18 a 20. */
const PARTIDA = 'p.sombra-del-este'
const THARAN = 'dom.tharan'
const BREE = 'dom.bree'

/** Las dos cifras del entregable de la fase, en mh: «46,518 mo» y «340,6 mo» (hoja de ruta, §7). */
const BOLSA_THARAN = 4651800
const CAJA_BREE = 34060000

/** La categoría del jugador que esta tablet ya tiene, con su id de aquí (§6.6, patrón 2, y J2e). */
const MI_CATEGORIA: OpcionCatalogo = {
  id: 'cat.propia-posadas',
  nombre: 'Posadas del camino',
  lista: 'categorias',
  grupo: 'tuyas',
  propia: true,
  borrada: false,
}

/** El id que esa misma categoría tiene en la tablet que exportó la copia: el que hay que remapear. */
const CATEGORIA_EN_LA_COPIA = 'cat.posadas-del-camino'

let origen: BaseDeDatos
let destino: BaseDeDatos

beforeEach(async () => {
  origen = baseDePrueba('gestion-aldeas-origen')
  destino = baseDePrueba('gestion-aldeas-destino')
  await sembrarCatalogo(origen)
  await sembrarCatalogo(destino)
})

afterEach(() => {
  origen.close()
  destino.close()
})

/** Ids nuevos fijos y en orden: el dominio no toca crypto, recibe la función (contrato §2.8). */
function idsNuevos(): () => Id {
  let n = 0
  return () => {
    n += 1
    return `id-nuevo-${n}`
  }
}

/** Guarda la partida de ejemplo en la tablet de origen, como hace P1 al crearla. */
async function guardarEjemplo(): Promise<DocumentoPartida> {
  const documento = documentoDeEjemplo()
  await crearPartida(origen, documento, SESION_ORIGEN)
  return documento
}

/** Lee una partida guardada y falla con el mensaje del contrato en vez de devolver undefined. */
async function leerGuardada(db: BaseDeDatos, id: Id): Promise<DocumentoPartida> {
  const documento = await leerPartida(db, id)
  if (documento === undefined) {
    throw new Error(`No hay ninguna partida con el id «${id}»`)
  }
  return documento
}

/** Analiza el texto de una copia y, si se rechaza, falla enseñando el motivo y el detalle en castellano. */
function copiaValida(texto: string): SobreCopia {
  const resultado = analizarCopia(texto)
  if (!resultado.ok) {
    throw new Error(`${resultado.mensaje}\n${resultado.detalle ?? ''}`)
  }
  expect(resultado.migrada).toBe(false)
  expect(resultado.desdeVersion).toBe(1)
  return resultado.copia
}

/** Guarda, exporta y valida: el punto de partida de todas las pruebas de importación. */
async function copiaDelEjemplo(): Promise<SobreCopia> {
  await guardarEjemplo()
  const archivo = await exportarCopia(origen, PARTIDA, EXPORTACION)
  return copiaValida(archivo.texto)
}

/** La copia, con una categoría del jugador y el primer movimiento apuntando a ella: eso ejercita la fusión. */
function conCategoriaPropia(copia: SobreCopia): SobreCopia {
  const sobre = structuredClone(copia)
  sobre.catalogos.opciones.push({
    id: CATEGORIA_EN_LA_COPIA,
    nombre: 'Posadas del camino',
    lista: 'categorias',
    grupo: 'tuyas',
    propia: true,
  })
  sobre.partida.movimientos[0].categoriaId = CATEGORIA_EN_LA_COPIA
  return sobre
}

describe('guardar la partida de ejemplo', () => {
  it('P0 la lista con su nombre, su fecha en juego, sus dominios y su última sesión', async () => {
    await guardarEjemplo()

    const filas = await listarPartidas(origen)
    expect(filas).toHaveLength(1)
    expect(filas[0].id).toBe(PARTIDA)
    expect(filas[0].nombre).toBe('La Sombra del Este')
    expect(filas[0].edad).toBe('tercera')
    expect(filas[0].fechaInicial).toEqual({ anio: 1640, mes: 1, dia: 1 })
    expect(filas[0].fechaActual).toEqual({ anio: 1640, mes: 4, dia: 12 })
    // El personaje va primero y después los asentamientos (contrato del modelo §2.12).
    expect(filas[0].dominios[0]).toBe('Tharan')
    expect([...filas[0].dominios].sort()).toEqual(['Archet', 'Bree', 'Tharan'])
    expect(filas[0].hayAvances).toBe(true)
    expect(filas[0].abiertaEl).toBe(SESION_ORIGEN)
    expect(filas[0].exportadaEl).toBeUndefined()
  })

  it('la bolsa de Tharan son 46,518 mo y la caja de Bree, 340,6 mo', async () => {
    await guardarEjemplo()

    const documento = await leerGuardada(origen, PARTIDA)
    const saldos = saldosPorDominio(documento)
    expect(saldos[THARAN]).toBe(BOLSA_THARAN)
    expect(saldos[BREE]).toBe(CAJA_BREE)
    expect(formatearOro(saldos[THARAN], documento.partida.equivalencias)).toBe('46,518 mo')
    expect(formatearOro(saldos[BREE], documento.partida.equivalencias)).toBe('340,6 mo')
  })
})

describe('exportar la copia', () => {
  it('el archivo lleva el nombre del día y un sobre con la marca de la app', async () => {
    await guardarEjemplo()

    const archivo = await exportarCopia(origen, PARTIDA, EXPORTACION)
    expect(archivo.nombre).toBe('gestion-aldeas-la-sombra-del-este-2026-09-17.json')
    expect(archivo.sobre.app).toBe('gestion-aldeas')
    expect(archivo.sobre.versionFormato).toBe(1)
    expect(archivo.sobre.exportadaEl).toBe(EXPORTACION)
    expect(archivo.sobre.partida.partida.id).toBe(PARTIDA)
    expect(archivo.texto).toBe(JSON.stringify(JSON.parse(archivo.texto)))
  })

  it('los catálogos de la copia no llevan lo que es de esta tablet', async () => {
    await guardarEjemplo()

    const archivo = await exportarCopia(origen, PARTIDA, EXPORTACION)
    const catalogos = archivo.sobre.catalogos
    expect(catalogos.opciones.length).toBeGreaterThan(0)
    expect(catalogos.recursos.length).toBeGreaterThan(0)
    for (const opcion of catalogos.opciones) {
      expect(opcion).not.toHaveProperty('borrada')
      expect(opcion).not.toHaveProperty('protegida')
      expect(opcion.propia).toBe(false)
    }
    for (const recurso of catalogos.recursos) {
      expect(recurso).not.toHaveProperty('borrada')
      expect(recurso).not.toHaveProperty('protegido')
    }
  })

  it('exportar anota «Última copia exportada» y no cuenta como un cambio de la partida', async () => {
    await guardarEjemplo()
    const antes = (await listarPartidas(origen))[0]

    await exportarCopia(origen, PARTIDA, EXPORTACION)

    const despues = (await listarPartidas(origen))[0]
    expect(despues.exportadaEl).toBe(EXPORTACION)
    expect(despues.actualizada).toBe(antes.actualizada)
    expect(despues.abiertaEl).toBe(antes.abiertaEl)
    const documento = await leerGuardada(origen, PARTIDA)
    expect(documento.partida.actualizada).toBe(antes.actualizada)
    expect(documento.partida.cambiosDesdeUltimoAvance).toBe(0)
  })
})

describe('importar la copia', () => {
  it('en una tablet vacía se añade sin preguntar y da las mismas cifras', async () => {
    const ejemplo = documentoDeEjemplo()
    const copia = await copiaDelEjemplo()

    const destinoPosible = await examinarDestino(destino, copia, 'selector')
    expect(destinoPosible).toEqual({ yaExiste: false, modos: ['nueva'] })

    const resumen = await importarCopia(destino, copia, {
      modo: 'nueva',
      ahora: SESION_DESTINO,
      nuevoId: idsNuevos(),
    })
    expect(resumen.partidaId).toBe(PARTIDA)
    expect(resumen.nombre).toBe('La Sombra del Este')
    expect(resumen.migrada).toBe(false)
    expect(resumen.lineas[0]).toBe('Se ha añadido la partida «La Sombra del Este».')

    const documento = await leerGuardada(destino, PARTIDA)
    const saldos = saldosPorDominio(documento)
    expect(formatearOro(saldos[THARAN], documento.partida.equivalencias)).toBe('46,518 mo')
    expect(formatearOro(saldos[BREE], documento.partida.equivalencias)).toBe('340,6 mo')
    expect(documento.movimientos).toHaveLength(ejemplo.movimientos.length)
    expect(documento.avances).toHaveLength(ejemplo.avances.length)
    expect(documento.avances[documento.avances.length - 1].snapshotPrevio).toBeDefined()
  })

  it('la misma copia importada otra vez como copia deja dos partidas con nombres distintos', async () => {
    const copia = await copiaDelEjemplo()
    const nuevoId = idsNuevos()
    await importarCopia(destino, copia, { modo: 'nueva', ahora: SESION_DESTINO, nuevoId })

    const destinoPosible = await examinarDestino(destino, copia, 'selector')
    expect(destinoPosible.yaExiste).toBe(true)
    expect(destinoPosible.nombreExistente).toBe('La Sombra del Este')
    expect(destinoPosible.modos).toEqual(['reemplazar', 'comoCopia'])

    const resumen = await importarCopia(destino, copia, { modo: 'comoCopia', ahora: SESION_DESTINO, nuevoId })
    expect(resumen.partidaId).not.toBe(PARTIDA)
    expect(resumen.nombre).toBe('La Sombra del Este (copia)')
    expect(resumen.lineas[0]).toBe('Se ha importado como copia: «La Sombra del Este (copia)».')

    const filas = await listarPartidas(destino)
    expect(filas).toHaveLength(2)
    expect(filas.map((fila) => fila.nombre).sort()).toEqual(['La Sombra del Este', 'La Sombra del Este (copia)'])
    const copiada = await leerGuardada(destino, resumen.partidaId)
    expect(copiada.partida.nombre).toBe('La Sombra del Este (copia)')
    expect(saldosPorDominio(copiada)[THARAN]).toBe(BOLSA_THARAN)
  })

  it('«Reemplazar» deja una sola partida y conserva las cifras', async () => {
    const copia = await copiaDelEjemplo()
    const nuevoId = idsNuevos()
    await importarCopia(destino, copia, { modo: 'nueva', ahora: SESION_DESTINO, nuevoId })

    const resumen = await importarCopia(destino, copia, { modo: 'reemplazar', ahora: SESION_DESTINO, nuevoId })
    expect(resumen.partidaId).toBe(PARTIDA)
    expect(resumen.lineas[0]).toBe('Se ha reemplazado la partida «La Sombra del Este».')

    const filas = await listarPartidas(destino)
    expect(filas).toHaveLength(1)
    const documento = await leerGuardada(destino, PARTIDA)
    expect(saldosPorDominio(documento)[BREE]).toBe(CAJA_BREE)
  })

  it('una categoría tuya de la copia se une a la de esta tablet y su movimiento la sigue', async () => {
    await destino.opcionesCatalogo.add(MI_CATEGORIA)
    const copia = conCategoriaPropia(await copiaDelEjemplo())
    const movimientoId = copia.partida.movimientos[0].id

    const resumen = await importarCopia(destino, copiaValida(JSON.stringify(copia)), {
      modo: 'nueva',
      ahora: SESION_DESTINO,
      nuevoId: idsNuevos(),
    })

    expect(resumen.fusion.unidasPorNombre).toEqual([
      { idEnLaCopia: CATEGORIA_EN_LA_COPIA, id: MI_CATEGORIA.id, lista: 'categorias', nombre: 'Posadas del camino' },
    ])
    expect(resumen.fusion.creadas).toEqual([])
    expect(resumen.lineas).toContain(
      'La categoría «Posadas del camino» de la copia se ha unido a la tuya con el mismo nombre.',
    )
    // El catálogo no crece: las 145 de fábrica y la del jugador, que ya estaba.
    expect(await destino.opcionesCatalogo.count()).toBe(146)

    const documento = await leerGuardada(destino, PARTIDA)
    const movimiento = documento.movimientos.find((m) => m.id === movimientoId)
    expect(movimiento?.categoriaId).toBe(MI_CATEGORIA.id)
  })

  it('los sumaFactores no enteros (10/3 y 22/3) vuelven iguales tras pasar por JSON', async () => {
    const copia = await copiaDelEjemplo()
    await importarCopia(destino, copia, { modo: 'nueva', ahora: SESION_DESTINO, nuevoId: idsNuevos() })

    const documento = await leerGuardada(destino, PARTIDA)
    const conDecimales = documento.edificios
      .flatMap((edificio) => edificio.producciones)
      .map((produccion) => produccion.acumulado.sumaFactores)
      .filter((suma) => !Number.isInteger(suma))
      .sort((a, b) => a - b)
    expect(conDecimales).toEqual([10 / 3, 22 / 3])
    expect(conDecimales[0]).toBe(3.3333333333333335)
    expect(conDecimales[1]).toBe(7.333333333333333)
  })
})
