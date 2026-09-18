import { describe, expect, it } from 'vitest'
import { AVANCES, SNAPSHOT_10_ABRIL } from '../ejemplo/avances'
import { AVANCE, MOV_THARAN } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe, type DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { simular } from '../motor/simular'
import { aplicarAvance } from './aplicar'
import { avanceDelMovimiento, cambiosQueSePerderan, deshacerUltimoAvance, puedeDeshacer } from './deshacer'

/** Un instante posterior al último avance del ejemplo («2026-09-08T19:45:00.000Z»). */
const AHORA = '2026-09-18T12:00:00.000Z'

/** El ejemplo con el avance del 12 al 19 ya aplicado. */
function avanzadoAl19(): DocumentoPartida {
  const documento = documentoDeEjemplo()
  const opciones = { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
  return aplicarAvance(documento, simular(documento, 7, opciones), AHORA)
}

/** Un movimiento del ejemplo por su id. */
function movimiento(documento: DocumentoPartida, id: string): Movimiento {
  const encontrado = documento.movimientos.find((m) => m.id === id)
  if (encontrado === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  return encontrado
}

describe('puedeDeshacer y cambiosQueSePerderan', () => {
  it('solo se puede deshacer si el último avance guarda su copia (§9 l.1326)', () => {
    expect(puedeDeshacer(documentoDeEjemplo())).toBe(true)
    expect(puedeDeshacer({ ...documentoDeEjemplo(), avances: [] })).toBe(false)
    expect(puedeDeshacer({ ...documentoDeEjemplo(), avances: AVANCES.slice(0, 3) })).toBe(false)
  })

  it('cuenta los cambios hechos después del avance: «Se perderán 3 cambios» (§9 l.1327)', () => {
    const documento = documentoDeEjemplo()
    expect(cambiosQueSePerderan(documento)).toBe(0)
    documento.partida.cambiosDesdeUltimoAvance = 3
    expect(cambiosQueSePerderan(documento)).toBe(3)
    expect(cambiosQueSePerderan(avanzadoAl19())).toBe(0)
  })
})

describe('deshacerUltimoAvance', () => {
  it('restaura la copia del 10 de abril y quita el último avance, sin tocar la entrada', () => {
    const documento = congelar(documentoDeEjemplo())
    const deshecho = deshacerUltimoAvance(documento)
    expect(estadoDe(deshecho)).toEqual(SNAPSHOT_10_ABRIL)
    expect(deshecho.partida.cambiosDesdeUltimoAvance).toBe(3)
    expect(deshecho.avances.map((a) => a.id)).toEqual([AVANCE.hasta31Marzo, AVANCE.hasta6Abril, AVANCE.hasta10Abril])
    expect(documento).toEqual(documentoDeEjemplo())
  })

  it('deshacer lo que se acaba de aplicar devuelve el estado del 12 y los 4 avances de antes', () => {
    const deshecho = deshacerUltimoAvance(avanzadoAl19())
    expect(estadoDe(deshecho)).toEqual(estadoDe(documentoDeEjemplo()))
    expect(deshecho.avances.map((a) => a.id)).toEqual(documentoDeEjemplo().avances.map((a) => a.id))
    expect(deshecho.avances.map((a) => 'snapshotPrevio' in a)).toEqual([false, false, false, false])
  })

  it('después de deshacer ya no se puede deshacer otra vez (D-039), y sin avances lanza', () => {
    const deshecho = deshacerUltimoAvance(documentoDeEjemplo())
    expect(puedeDeshacer(deshecho)).toBe(false)
    expect(() => deshacerUltimoAvance(deshecho)).toThrowError('No hay ningún avance que deshacer')
    expect(() => deshacerUltimoAvance({ ...documentoDeEjemplo(), avances: [] })).toThrowError(
      'No hay ningún avance que deshacer',
    )
  })
})

describe('avanceDelMovimiento', () => {
  it('da el avance que creó el movimiento solo si es el último y se puede deshacer (§9 l.1328-1329)', () => {
    const documento = documentoDeEjemplo()
    expect(avanceDelMovimiento(documento, movimiento(documento, MOV_THARAN.posada12Abril))?.id).toBe(
      AVANCE.hasta12Abril,
    )
    expect(avanceDelMovimiento(documento, movimiento(documento, MOV_THARAN.posada10Abril))).toBeUndefined()
    expect(avanceDelMovimiento(documento, movimiento(documento, MOV_THARAN.athelas))).toBeUndefined()

    const avanzado = avanzadoAl19()
    const delAvance = avanzado.movimientos.find((m) => m.avanceId === 'sim')
    expect(delAvance).toBeDefined()
    expect(avanceDelMovimiento(avanzado, delAvance ?? movimiento(avanzado, MOV_THARAN.athelas))?.id).toBe('sim')
    expect(avanceDelMovimiento(avanzado, movimiento(avanzado, MOV_THARAN.posada12Abril))).toBeUndefined()
  })
})
