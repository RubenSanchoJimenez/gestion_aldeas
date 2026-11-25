import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { documentoDeEjemplo } from '../dominio/ejemplo/sombraDelEste'
import type { Instante } from '../dominio/modelo/comunes'
import type { BaseDeDatos } from './baseDeDatos'
import { guardarDatosDePartida } from './datosDePartida'
import { baseDePrueba } from './pruebas/baseDePrueba'
import { crearPartida, leerPartida } from './repositorio'
import { leerResumen } from './resumenes'

const AHORA: Instante = '2026-09-17T10:00:00.000Z'
const GUARDADO: Instante = '2026-09-17T11:00:00.000Z'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('guardarDatosDePartida', () => {
  it('renombrar el ejemplo cambia el resumen de P0 y sube el contador a 1', async () => {
    const documento = documentoDeEjemplo()
    await crearPartida(db, documento, AHORA)

    const resultado = await guardarDatosDePartida(
      db,
      documento.partida.id,
      { nombre: 'La Sombra del Este II', edad: documento.partida.edad, fechaInicial: documento.partida.fechaInicial },
      GUARDADO,
    )

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) {
      return
    }
    expect(resultado.cambio).toBe(true)
    expect(resultado.documento.partida.cambiosDesdeUltimoAvance).toBe(1)
    const resumen = await leerResumen(db, documento.partida.id)
    expect(resumen?.nombre).toBe('La Sombra del Este II')
  })

  it('sin cambios no cambia actualizada', async () => {
    const documento = documentoDeEjemplo()
    await crearPartida(db, documento, AHORA)

    const resultado = await guardarDatosDePartida(
      db,
      documento.partida.id,
      { nombre: documento.partida.nombre, edad: documento.partida.edad, fechaInicial: documento.partida.fechaInicial },
      GUARDADO,
    )

    expect(resultado).toEqual({ ok: true, documento, cambio: false })
    const guardado = await leerPartida(db, documento.partida.id)
    expect(guardado?.partida.actualizada).toBe(documento.partida.actualizada)
  })

  it('un error no escribe nada', async () => {
    const documento = documentoDeEjemplo()
    await crearPartida(db, documento, AHORA)

    const resultado = await guardarDatosDePartida(
      db,
      documento.partida.id,
      { nombre: '', edad: documento.partida.edad, fechaInicial: documento.partida.fechaInicial },
      GUARDADO,
    )

    expect(resultado).toEqual({ ok: false, error: 'Escribe un nombre' })
    const resumen = await leerResumen(db, documento.partida.id)
    expect(resumen?.nombre).toBe(documento.partida.nombre)
  })

  it('un id que no existe lanza', async () => {
    await expect(
      guardarDatosDePartida(
        db,
        'p.no-existe',
        { nombre: 'X', edad: 'tercera', fechaInicial: { anio: 1640, mes: 1, dia: 1 } },
        GUARDADO,
      ),
    ).rejects.toThrow('No hay ninguna partida con el id «p.no-existe»')
  })
})
