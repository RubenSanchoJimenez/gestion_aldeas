import { describe, expect, it } from 'vitest'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { EsquemaDocumentoPartida, estadoDe, type DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { simular } from '../motor/simular'
import type { OpcionesSimulacion } from '../motor/tipos'
import { validarCopia } from '../validacion/coherencia'
import { aplicarAvance } from './aplicar'

/** Un instante posterior al último avance del ejemplo («2026-09-08T19:45:00.000Z»). */
const AHORA = '2026-09-18T12:00:00.000Z'

/** Opciones de una simulación de prueba, con su prefijo: dos avances seguidos no pueden repetir ids. */
function opciones(prefijo = 'sim'): OpcionesSimulacion {
  return { avanceId: prefijo, nuevoId: idsEnSerie(prefijo), catalogo: catalogosDeEjemplo() }
}

/** El ejemplo avanzado `dias` días y aplicado. */
function avanzado(dias: number): DocumentoPartida {
  const documento = documentoDeEjemplo()
  return aplicarAvance(documento, simular(documento, dias, opciones()), AHORA)
}

describe('aplicarAvance', () => {
  it('añade el avance con la copia del estado del 12 y quita la copia del anterior (D-008)', () => {
    const documento = documentoDeEjemplo()
    const resultado = simular(documento, 7, opciones())
    const aplicado = aplicarAvance(documento, resultado, AHORA)
    expect(aplicado.avances).toHaveLength(5)
    expect(aplicado.avances.map((a) => 'snapshotPrevio' in a)).toEqual([false, false, false, false, true])
    expect(aplicado.avances.slice(0, 4).map((a) => a.id)).toEqual(documento.avances.map((a) => a.id))
    expect(aplicado.avances[4]).toEqual({
      id: 'sim',
      desde: { anio: 1640, mes: 4, dia: 12 },
      hasta: { anio: 1640, mes: 4, dia: 19 },
      aplicadoEl: AHORA,
      cambios: resultado.cambios,
      avisos: resultado.avisos,
      snapshotPrevio: estadoDe(documentoDeEjemplo()),
    })
  })

  it('el estado es el de la vista previa con el contador a 0; la copia guarda el contador de antes', () => {
    const documento = documentoDeEjemplo()
    documento.partida.cambiosDesdeUltimoAvance = 2
    const resultado = simular(documento, 7, opciones())
    const aplicado = aplicarAvance(documento, resultado, AHORA)
    expect(estadoDe(aplicado)).toEqual({
      ...resultado.estadoNuevo,
      partida: { ...resultado.estadoNuevo.partida, cambiosDesdeUltimoAvance: 0 },
    })
    expect(aplicado.avances[4].snapshotPrevio?.partida.cambiosDesdeUltimoAvance).toBe(2)
  })

  it('aplicadoEl nunca va hacia atrás: si el reloj marca antes que el último avance, se queda el del último (T12)', () => {
    const documento = documentoDeEjemplo()
    const aplicado = aplicarAvance(documento, simular(documento, 7, opciones()), '2026-09-01T10:00:00.000Z')
    expect(aplicado.avances[4].aplicadoEl).toBe('2026-09-08T19:45:00.000Z')
  })

  it('rechaza un resultado calculado sobre otra fecha o sobre otra partida (D-041)', () => {
    const documento = documentoDeEjemplo()
    const resultado = simular(documento, 7, opciones())
    const yaAplicado = aplicarAvance(documento, resultado, AHORA)
    expect(() => aplicarAvance(yaAplicado, resultado, AHORA)).toThrowError(
      'La partida cambió después de la vista previa: vuelve a calcularla',
    )
    const otra: DocumentoPartida = { ...documento, partida: { ...documento.partida, id: 'p.otra' } }
    expect(() => aplicarAvance(otra, resultado, AHORA)).toThrowError(
      'La partida cambió después de la vista previa: vuelve a calcularla',
    )
  })

  it('deja un documento válido, también con un impago y una persona nueva (7 y 105 días)', () => {
    for (const dias of [7, 105]) {
      const aplicado = avanzado(dias)
      expect(EsquemaDocumentoPartida.safeParse(aplicado).success).toBe(true)
      expect(validarCopia(aplicado, catalogosDeEjemplo())).toEqual([])
    }
  })

  it('encadena dos avances, cada uno con sus ids, y solo el último guarda la copia', () => {
    const primero = avanzado(7)
    const segundo = aplicarAvance(primero, simular(primero, 7, opciones('sim2')), '2026-09-18T12:05:00.000Z')
    expect(segundo.partida.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 26 })
    expect(segundo.avances.map((a) => a.id).slice(-2)).toEqual(['sim', 'sim2'])
    expect(segundo.avances.map((a) => 'snapshotPrevio' in a)).toEqual([false, false, false, false, false, true])
    expect(estadoDe(segundo.avances[5].snapshotPrevio ?? primero)).toEqual(estadoDe(primero))
    expect(validarCopia(segundo, catalogosDeEjemplo())).toEqual([])
  })

  it('no toca el documento ni el resultado que recibe', () => {
    const documento = congelar(documentoDeEjemplo())
    const resultado = congelar(simular(documento, 7, opciones()))
    aplicarAvance(documento, resultado, AHORA)
    expect(documento).toEqual(documentoDeEjemplo())
  })
})
