import { afterEach, describe, expect, it } from 'vitest'
import { VERSION_FORMATO } from '../modelo/partida'
import { MIGRACIONES, migrar } from './migraciones'

/** La tabla sin el `Readonly` de su tipo: solo las pruebas inyectan migraciones, y las quitan al terminar. */
const tabla = MIGRACIONES as Record<number, (datos: unknown) => unknown>

afterEach(() => {
  delete tabla[0]
})

/** Baja por un dato sin tipar: lo que llega de un archivo no tiene tipo hasta que pasa el esquema. */
function como(valor: unknown): Record<string, unknown> {
  return valor as Record<string, unknown>
}

/** La lista de objetos que hay en una clave. */
function lista(valor: unknown): Record<string, unknown>[] {
  return valor as Record<string, unknown>[]
}

/** Un sobre de la versión que se le pida, con un movimiento y un avance con snapshotPrevio. */
function sobreDeFormato(version: number): unknown {
  return {
    app: 'gestion-aldeas',
    versionFormato: version,
    exportadaEl: '2026-09-17T18:30:00.000Z',
    partida: {
      partida: { id: 'p.sombra-del-este', nombre: 'La Sombra del Este', versionFormato: version },
      movimientos: [{ id: 'mov.peaje', concepto: 'Peaje del puente' }],
      avances: [
        {
          id: 'av.1',
          snapshotPrevio: {
            partida: { id: 'p.sombra-del-este', nombre: 'La Sombra del Este', versionFormato: version },
            movimientos: [{ id: 'mov.viejo', concepto: 'Cobro de locales' }],
          },
        },
      ],
    },
    catalogos: { opciones: [], recursos: [] },
  }
}

/**
 * Una migración de mentira: marca los movimientos que encuentra. Los del sobre están en `partida.movimientos`
 * y los del snapshot, en `movimientos`, así que mira los dos sitios.
 */
function marcarMovimientos(datos: unknown): unknown {
  const objeto = { ...como(datos) }
  if (Array.isArray(objeto.movimientos)) {
    objeto.movimientos = lista(objeto.movimientos).map((movimiento) => ({ ...movimiento, migrado: true }))
  }
  const documento = objeto.partida === undefined ? undefined : como(objeto.partida)
  if (documento !== undefined && Array.isArray(documento.movimientos)) {
    objeto.partida = {
      ...documento,
      movimientos: lista(documento.movimientos).map((movimiento) => ({ ...movimiento, migrado: true })),
    }
  }
  return objeto
}

describe('MIGRACIONES', () => {
  it('en el formato 1 la tabla está vacía y migrar deja los datos como están', () => {
    expect(VERSION_FORMATO).toBe(1)
    expect(Object.keys(MIGRACIONES)).toEqual([])
    expect(migrar(sobreDeFormato(VERSION_FORMATO), VERSION_FORMATO)).toEqual(sobreDeFormato(VERSION_FORMATO))
  })
})

describe('migrar', () => {
  it('aplica la migración al sobre y a avances[].snapshotPrevio, y deja la versión puesta en los tres sitios', () => {
    tabla[0] = marcarMovimientos
    const migrado = como(migrar(sobreDeFormato(0), 0))
    const documento = como(migrado.partida)
    const snapshot = como(lista(documento.avances)[0].snapshotPrevio)
    expect(lista(documento.movimientos)[0].migrado).toBe(true)
    expect(lista(snapshot.movimientos)[0].migrado).toBe(true)
    expect(migrado.versionFormato).toBe(VERSION_FORMATO)
    expect(como(documento.partida).versionFormato).toBe(VERSION_FORMATO)
    expect(como(snapshot.partida).versionFormato).toBe(VERSION_FORMATO)
  })

  it('lanza si falta la migración de un tramo de la cadena', () => {
    expect(() => migrar(sobreDeFormato(0), 0)).toThrow('No hay ninguna migración del formato 0 al 1')
  })
})
