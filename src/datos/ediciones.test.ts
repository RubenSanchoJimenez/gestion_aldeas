import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cambiosQueSePerderan } from '../dominio/avance/deshacer'
import { cambiarActivo } from '../dominio/edicion/reglas'
import { editarMovimiento, eliminarMovimiento } from '../dominio/edicion/movimientos'
import type { Sello } from '../dominio/edicion/registros'
import { crearTransferencia } from '../dominio/edicion/transferencias'
import { DOM, MOV_THARAN, RECURRENTE } from '../dominio/ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../dominio/ejemplo/sombraDelEste'
import type { Id, Instante } from '../dominio/modelo/comunes'
import { estadoDe, type DocumentoPartida } from '../dominio/modelo/documento'
import { idsEnSerie } from '../dominio/motor/ids'
import { simular } from '../dominio/motor/simular'
import { deshacerAvanceGuardado, guardarAvance } from './avances'
import type { BaseDeDatos } from './baseDeDatos'
import { guardarEdicion } from './ediciones'
import { baseDePrueba } from './pruebas/baseDePrueba'
import { crearPartida, leerPartida, listarPartidas } from './repositorio'

/** Instantes fijos y en orden: ninguna prueba depende del reloj. */
const SESION: Instante = '2026-09-18T09:00:00.000Z'
const PRIMERA: Instante = '2026-09-18T10:00:00.000Z'
const SEGUNDA: Instante = '2026-09-18T11:00:00.000Z'
const TERCERA: Instante = '2026-09-18T12:00:00.000Z'
const CUARTA: Instante = '2026-09-18T13:00:00.000Z'

/** La partida de ejemplo, que se guardó por última vez el 8 de septiembre. */
const PARTIDA: Id = 'p.sombra-del-este'
const ACTUALIZADA_DEL_EJEMPLO: Instante = '2026-09-08T19:45:00.000Z'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

/** El sello de una edición hecha en ese instante. */
function sello(ahora: Instante): Sello {
  return { ahora, nuevoId: idsEnSerie('nuevo') }
}

/** Guarda la partida de ejemplo, como hace P1 al crearla, y la devuelve. */
async function guardarEjemplo(): Promise<DocumentoPartida> {
  const documento = documentoDeEjemplo()
  await crearPartida(db, documento, SESION)
  return documento
}

describe('guardarEdicion', () => {
  it('si nada cambió no escribe: ni actualizada ni la fila de P0 se mueven (regla pendiente 1)', async () => {
    const documento = await guardarEjemplo()
    const siguiente = cambiarActivo(documento, RECURRENTE.posada, true, sello(PRIMERA))
    expect(siguiente).toBe(documento)
    expect(await guardarEdicion(db, documento, siguiente, PRIMERA)).toBe(documento)
    expect((await leerPartida(db, PARTIDA))?.partida.actualizada).toBe(ACTUALIZADA_DEL_EJEMPLO)
    expect((await listarPartidas(db))[0].actualizada).toBe(ACTUALIZADA_DEL_EJEMPLO)
  })

  it('con un cambio guarda el documento con actualizada = ahora y suma 1 al contador (D-038)', async () => {
    const documento = await guardarEjemplo()
    const siguiente = cambiarActivo(documento, RECURRENTE.posada, false, sello(PRIMERA))
    const guardado = await guardarEdicion(db, documento, siguiente, PRIMERA)
    expect(guardado.partida.cambiosDesdeUltimoAvance).toBe(1)
    expect(guardado.partida.actualizada).toBe(PRIMERA)
    expect(guardado.recurrentes[0].activo).toBe(false)
    expect(await leerPartida(db, PARTIDA)).toEqual(guardado)
    expect((await listarPartidas(db))[0].actualizada).toBe(PRIMERA)
  })

  it('una transferencia cuenta un cambio aunque toque tres registros, y cada guardado suma uno (D-038)', async () => {
    const documento = await guardarEjemplo()
    const { estado } = crearTransferencia(
      documento,
      {
        saleDeId: DOM.tharan,
        entraEnId: DOM.bree,
        importe: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
        fecha: { anio: 1640, mes: 4, dia: 12 },
      },
      sello(PRIMERA),
    )
    const primero = await guardarEdicion(db, documento, estado, PRIMERA)
    expect(primero.partida.cambiosDesdeUltimoAvance).toBe(1)
    const editado = editarMovimiento(primero, MOV_THARAN.recompensa, { concepto: 'Recompensa del alcalde' }, sello(SEGUNDA))
    const segundo = await guardarEdicion(db, primero, editado, SEGUNDA)
    expect(segundo.partida.cambiosDesdeUltimoAvance).toBe(2)
    expect((await leerPartida(db, PARTIDA))?.partida.cambiosDesdeUltimoAvance).toBe(2)
  })

  it('un avance pone el contador a 0 y deshacerlo pierde lo editado después (§9, «Deshacer avance»)', async () => {
    const documento = await guardarEjemplo()
    const antes = editarMovimiento(documento, MOV_THARAN.athelas, { concepto: 'Compra de athelas (tres)' }, sello(PRIMERA))
    const editado = await guardarEdicion(db, documento, antes, PRIMERA)
    const resultado = simular(estadoDe(editado), 7, {
      avanceId: 'av.prueba',
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    const avanzado = await guardarAvance(db, editado, resultado, SEGUNDA)
    expect(avanzado.partida.cambiosDesdeUltimoAvance).toBe(0)

    const conCambio = await guardarEdicion(db, avanzado, eliminarMovimiento(avanzado, MOV_THARAN.recompensa), TERCERA)
    expect(cambiosQueSePerderan(conCambio)).toBe(1)

    const deshecho = await deshacerAvanceGuardado(db, conCambio, CUARTA)
    expect(deshecho.partida.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 12 })
    expect(deshecho.partida.cambiosDesdeUltimoAvance).toBe(1)
    expect(deshecho.movimientos.find((m) => m.id === MOV_THARAN.athelas)?.concepto).toBe('Compra de athelas (tres)')
    expect(deshecho.movimientos.some((m) => m.id === MOV_THARAN.recompensa)).toBe(true)
  })
})
