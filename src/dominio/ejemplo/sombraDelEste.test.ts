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

describe('copia propia en cada llamada', () => {
  it('no comparte ni los objetos de las colecciones ni el snapshotPrevio (decisión 6)', () => {
    const primero = documentoDeEjemplo()
    const segundo = documentoDeEjemplo()
    expect(segundo).toEqual(primero)
    expect(segundo.partida).not.toBe(primero.partida)
    expect(segundo.movimientos[0]).not.toBe(primero.movimientos[0])
    expect(segundo.existencias[0]).not.toBe(primero.existencias[0])
    const ultimo = primero.avances.length - 1
    expect(primero.avances[ultimo].snapshotPrevio).toBeDefined()
    expect(segundo.avances[ultimo].snapshotPrevio).not.toBe(primero.avances[ultimo].snapshotPrevio)
  })

  it('mutar lo que devolvió la primera llamada no toca a la segunda', () => {
    const primero = documentoDeEjemplo()
    const conceptoOriginal = primero.movimientos[0].concepto
    const cantidadOriginal = primero.existencias[0].cantidad
    primero.movimientos[0].concepto = 'tocado por una prueba'
    primero.existencias[0].cantidad = cantidadOriginal + 1000
    const ultimo = primero.avances.length - 1
    const snapshot = primero.avances[ultimo].snapshotPrevio
    expect(snapshot).toBeDefined()
    snapshot!.movimientos.length = 0

    const segundo = documentoDeEjemplo()
    expect(segundo.movimientos[0].concepto).toBe(conceptoOriginal)
    expect(segundo.existencias[0].cantidad).toBe(cantidadOriginal)
    expect(segundo.avances[ultimo].snapshotPrevio?.movimientos.length).toBeGreaterThan(0)
  })

  it('catalogosDeEjemplo también devuelve opciones y recursos propios', () => {
    const primero = catalogosDeEjemplo()
    const segundo = catalogosDeEjemplo()
    expect(segundo).toEqual(primero)
    expect(segundo.opciones[0]).not.toBe(primero.opciones[0])
    expect(segundo.recursos[0]).not.toBe(primero.recursos[0])
  })
})
