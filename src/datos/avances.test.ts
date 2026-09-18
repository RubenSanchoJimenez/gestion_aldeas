import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { analizarCopia } from '../dominio/copia/analizar'
import { saldosPorDominio } from '../dominio/dinero/saldo'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../dominio/ejemplo/sombraDelEste'
import type { Id, Instante } from '../dominio/modelo/comunes'
import { estadoDe, type DocumentoPartida } from '../dominio/modelo/documento'
import { idsEnSerie } from '../dominio/motor/ids'
import { simular } from '../dominio/motor/simular'
import type { ResultadoSimulacion } from '../dominio/motor/tipos'
import { deshacerAvanceGuardado, guardarAvance } from './avances'
import type { BaseDeDatos } from './baseDeDatos'
import { sembrarCatalogo } from './catalogos'
import { exportarCopia } from './copia/exportar'
import { importarCopia } from './copia/importar'
import { baseDePrueba } from './pruebas/baseDePrueba'
import { crearPartida, leerPartida, listarPartidas } from './repositorio'

/** Instantes fijos y en orden, todos posteriores al último avance del ejemplo: ninguna prueba depende del reloj. */
const SESION: Instante = '2026-09-18T09:00:00.000Z'
const AVANCE_GUARDADO: Instante = '2026-09-18T10:00:00.000Z'
const DESHECHO: Instante = '2026-09-18T11:00:00.000Z'
const MAS_TARDE: Instante = '2026-09-18T12:00:00.000Z'

/** La partida de ejemplo y las fechas del avance de P4. */
const PARTIDA: Id = 'p.sombra-del-este'
const DOCE_DE_ABRIL = { anio: 1640, mes: 4, dia: 12 }
const DIECINUEVE_DE_ABRIL = { anio: 1640, mes: 4, dia: 19 }

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

/** La vista previa de P4: simular sin guardar, con ids en serie y el catálogo del ejemplo (T1). */
function vistaPrevia(documento: DocumentoPartida, dias: number): ResultadoSimulacion {
  return simular(estadoDe(documento), dias, {
    avanceId: 'av.prueba',
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
}

/** Guarda la partida de ejemplo, como hace P1 al crearla, y la devuelve. */
async function guardarEjemplo(): Promise<DocumentoPartida> {
  const documento = documentoDeEjemplo()
  await crearPartida(db, documento, SESION)
  return documento
}

describe('guardarAvance', () => {
  it('guarda el documento aplicado: fecha nueva, contador a 0, actualizada = ahora y cinco avances (§9)', async () => {
    const documento = await guardarEjemplo()
    const guardado = await guardarAvance(db, documento, vistaPrevia(documento, 7), AVANCE_GUARDADO)
    expect(guardado.partida.fechaActual).toEqual(DIECINUEVE_DE_ABRIL)
    expect(guardado.partida.actualizada).toBe(AVANCE_GUARDADO)
    expect(guardado.partida.cambiosDesdeUltimoAvance).toBe(0)
    expect(guardado.avances.map((a) => a.id)).toEqual([...documento.avances.map((a) => a.id), 'av.prueba'])
    expect(guardado.avances[4].snapshotPrevio).toEqual(estadoDe(documento))
    expect(guardado.avances[3]).not.toHaveProperty('snapshotPrevio')
    expect(await leerPartida(db, PARTIDA)).toEqual(guardado)
  })

  it('el resumen de P0 pasa a la fecha nueva y conserva la sesión', async () => {
    const documento = await guardarEjemplo()
    await guardarAvance(db, documento, vistaPrevia(documento, 7), AVANCE_GUARDADO)
    const [fila] = await listarPartidas(db)
    expect(fila.fechaActual).toEqual(DIECINUEVE_DE_ABRIL)
    expect(fila.actualizada).toBe(AVANCE_GUARDADO)
    expect(fila.abiertaEl).toBe(SESION)
    expect(fila.hayAvances).toBe(true)
  })

  it('una vista previa que ya no corresponde a la partida no se guarda', async () => {
    const documento = await guardarEjemplo()
    const resultado = vistaPrevia(documento, 7)
    const avanzado = await guardarAvance(db, documento, resultado, AVANCE_GUARDADO)
    await expect(guardarAvance(db, avanzado, resultado, MAS_TARDE)).rejects.toThrow(
      'La partida cambió después de la vista previa: vuelve a calcularla',
    )
    expect((await leerPartida(db, PARTIDA))?.partida.actualizada).toBe(AVANCE_GUARDADO)
  })
})

describe('deshacerAvanceGuardado', () => {
  it('restaura el estado del 12 de abril con cuatro avances, y ya no se puede deshacer otro (§9; D-039)', async () => {
    const documento = await guardarEjemplo()
    const avanzado = await guardarAvance(db, documento, vistaPrevia(documento, 7), AVANCE_GUARDADO)
    const deshecho = await deshacerAvanceGuardado(db, avanzado, DESHECHO)
    expect(estadoDe(deshecho)).toEqual({
      ...estadoDe(documento),
      partida: { ...documento.partida, actualizada: DESHECHO },
    })
    expect(deshecho.avances.map((a) => a.id)).toEqual(documento.avances.map((a) => a.id))
    expect(deshecho.avances[3]).not.toHaveProperty('snapshotPrevio')
    expect(await leerPartida(db, PARTIDA)).toEqual(deshecho)
    expect((await listarPartidas(db))[0].fechaActual).toEqual(DOCE_DE_ABRIL)
    await expect(deshacerAvanceGuardado(db, deshecho, MAS_TARDE)).rejects.toThrow('No hay ningún avance que deshacer')
  })
})

describe('la partida avanzada viaja en una copia', () => {
  it('se exporta, pasa la validación y se importa en otra tablet con las mismas cifras (§6.1)', async () => {
    await sembrarCatalogo(db)
    const documento = await guardarEjemplo()
    const avanzado = await guardarAvance(db, documento, vistaPrevia(documento, 19), AVANCE_GUARDADO)
    const archivo = await exportarCopia(db, PARTIDA, DESHECHO)
    const analisis = analizarCopia(archivo.texto)
    if (!analisis.ok) {
      throw new Error(`${analisis.mensaje}\n${analisis.detalle ?? ''}`)
    }
    const otra = baseDePrueba('gestion-aldeas-otra-tablet')
    try {
      await sembrarCatalogo(otra)
      await importarCopia(otra, analisis.copia, { modo: 'nueva', ahora: MAS_TARDE, nuevoId: idsEnSerie('imp') })
      const importada = await leerPartida(otra, PARTIDA)
      if (importada === undefined) {
        throw new Error(`No hay ninguna partida con el id «${PARTIDA}»`)
      }
      // La copia ordena cada colección por su id (decisión propia 28): se comparan las cifras, no el orden.
      expect(importada.partida.fechaActual).toEqual({ anio: 1640, mes: 5, dia: 1 })
      expect(saldosPorDominio(importada)).toEqual(saldosPorDominio(avanzado))
      expect(importada.movimientos).toHaveLength(avanzado.movimientos.length)
      expect(importada.avances.map((a) => a.id)).toEqual(avanzado.avances.map((a) => a.id))
      expect(importada.avances[4].snapshotPrevio?.partida.fechaActual).toEqual(DOCE_DE_ABRIL)
    } finally {
      otra.close()
    }
  })
})
