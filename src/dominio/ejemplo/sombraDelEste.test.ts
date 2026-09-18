import { describe, expect, it } from 'vitest'
import { EsquemaDocumentoPartida } from '../modelo/documento'
import { saldosPorDominio } from '../dinero/saldo'
import { detalleDeProblemas, validarCoherenciaInterna, validarCopia } from '../validacion/coherencia'
import { validarReferencias } from '../validacion/referencias'
import { validarUnicidades } from '../validacion/unicidades'
import { DOM } from './ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from './sombraDelEste'

describe('documentoDeEjemplo', () => {
  it('junta las 34 claves del estado y la lista de avances, y devuelve un objeto nuevo (decisión 6)', () => {
    const documento = documentoDeEjemplo()
    expect(Object.keys(documento)).toHaveLength(35)
    expect(Object.keys(documento)[0]).toBe('partida')
    expect(Object.keys(documento).at(-1)).toBe('avances')
    expect(documento).not.toHaveProperty('id')
    expect(documento).not.toHaveProperty('partidaId')
    expect(documento.movimientos).toHaveLength(29)
    expect(documentoDeEjemplo()).not.toBe(documento)
    expect(documentoDeEjemplo().movimientos).not.toBe(documento.movimientos)
    expect(saldosPorDominio(documento)).toEqual({
      [DOM.tharan]: 4651800,
      [DOM.bree]: 34060000,
      [DOM.archet]: 8500000,
    })
  })

  it('pasa EsquemaDocumentoPartida y sobrevive a una vuelta por JSON (§6.1)', () => {
    const documento = documentoDeEjemplo()
    const analisis = EsquemaDocumentoPartida.safeParse(documento)
    expect(analisis.error).toBeUndefined()
    expect(analisis.success).toBe(true)
    const ida = JSON.parse(JSON.stringify(documento))
    expect(ida).toEqual(documento)
    expect(EsquemaDocumentoPartida.safeParse(ida).success).toBe(true)
  })

  it('no deja ni un problema en las tres validaciones, ni en el estado ni en el snapshot (§6.1)', () => {
    const documento = documentoDeEjemplo()
    const catalogos = catalogosDeEjemplo()
    expect(detalleDeProblemas(validarReferencias(documento, catalogos))).toBe('')
    expect(detalleDeProblemas(validarUnicidades(documento, catalogos))).toBe('')
    expect(detalleDeProblemas(validarCoherenciaInterna(documento))).toBe('')
    expect(detalleDeProblemas(validarCopia(documento, catalogos))).toBe('')
    expect(validarCopia(documento, catalogos)).toEqual([])
  })
})
