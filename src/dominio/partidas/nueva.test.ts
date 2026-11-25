import { describe, expect, it } from 'vitest'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { resumenDePartida } from '../modelo/resumen'
import { validarCoherenciaInterna } from '../validacion/coherencia'
import { aplicarDatosDePartida, MENSAJE_FECHA_FUERA, MENSAJE_SOLO_ANTES_DEL_AVANCE } from './datos'
import { documentoDePartidaNueva, type DatosPartidaNueva } from './nueva'

const AHORA = '2026-11-25T10:00:00.000Z'
const datos: DatosPartidaNueva = {
  nombre: '  Prueba  ',
  edad: 'tercera',
  fechaInicial: { anio: 1640, mes: 1, dia: 1 },
  equivalencias: EQUIVALENCIAS_POR_DEFECTO,
  personaje: { nombre: ' Tharan ', descripcion: '   ' },
  bolsa: [],
}
const nuevo = () => documentoDePartidaNueva(datos, { partida: 'p.1', personaje: 'dom.1' }, AHORA)

describe('documentoDePartidaNueva', () => {
  it('es coherente, recorta nombres, no guarda una descripción vacía y empieza sin avances', () => {
    const documento = nuevo()
    expect(validarCoherenciaInterna(documento)).toEqual([])
    expect(documento.partida.nombre).toBe('Prueba')
    expect(documento.dominios).toEqual([{ id: 'dom.1', tipo: 'personaje', nombre: 'Tharan' }])
    expect(documento.cajas[0].saldoInicial).toEqual({ base: 0 })
    expect(resumenDePartida(documento, { abiertaEl: AHORA })).toMatchObject({ dominios: ['Tharan'], hayAvances: false })
  })
})

describe('aplicarDatosDePartida', () => {
  const base = { nombre: 'Prueba', edad: 'tercera' as const, fechaInicial: datos.fechaInicial }

  it('sin cambios devuelve el mismo documento', () => {
    const documento = nuevo()
    expect(aplicarDatosDePartida(documento, { ...base, nombre: ' Prueba ' })).toEqual({
      ok: true,
      documento,
      cambio: false,
    })
  })

  it('rechaza un nombre vacío o una fecha que no existe', () => {
    expect(aplicarDatosDePartida(nuevo(), { ...base, nombre: ' ' })).toMatchObject({ ok: false })
    expect(aplicarDatosDePartida(nuevo(), { ...base, fechaInicial: { anio: 1640, mes: 4, dia: 31 } })).toMatchObject({
      ok: false,
    })
  })

  it('cambiar la fecha mueve la fecha actual', () => {
    const resultado = aplicarDatosDePartida(nuevo(), { ...base, fechaInicial: { anio: 1640, mes: 2, dia: 3 } })
    expect(resultado.ok && resultado.documento.partida.fechaActual).toEqual({ anio: 1640, mes: 2, dia: 3 })
  })

  it('con avances solo deja cambiar el nombre', () => {
    const ejemplo = documentoDeEjemplo()
    const { edad, fechaInicial } = ejemplo.partida
    expect(aplicarDatosDePartida(ejemplo, { nombre: 'Otro', edad, fechaInicial })).toMatchObject({ ok: true })
    expect(aplicarDatosDePartida(ejemplo, { nombre: 'Otro', edad, fechaInicial: { anio: 1639, mes: 1, dia: 1 } })).toEqual({
      ok: false,
      error: MENSAJE_SOLO_ANTES_DEL_AVANCE,
    })
  })

  it('no deja una fecha que saque registros de la partida', () => {
    const documento = nuevo()
    documento.movimientos = [
      {
        id: 'mov.1',
        dominioId: 'dom.1',
        fecha: datos.fechaInicial,
        tipo: 'gasto',
        importe: { base: -1 },
        categoriaId: 'cat.otros',
        concepto: 'x',
        origen: 'manual',
        programado: false,
      },
    ]
    expect(aplicarDatosDePartida(documento, { ...base, fechaInicial: { anio: 1639, mes: 1, dia: 1 } })).toEqual({
      ok: false,
      error: MENSAJE_FECHA_FUERA,
    })
  })
})
