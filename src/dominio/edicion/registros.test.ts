import { describe, expect, it } from 'vitest'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { RECURRENTE } from '../ejemplo/ids'
import type { Instante } from '../modelo/comunes'
import type { RecurrenteDinero } from '../modelo/movimientos'
import { congelar } from '../motor/pruebas/constructores'
import { buscarPorId, contarCambio, mismoRegistro, quitarPorId, reemplazarPorId } from './registros'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** Los cuatro recurrentes de Tharan, congelados: ninguna función puede escribir en ellos. */
function recurrentes(): RecurrenteDinero[] {
  return congelar(documentoDeEjemplo().recurrentes)
}

describe('mismoRegistro', () => {
  it('compara a fondo sin mirar editadoEl, y un campo ausente vale lo mismo que uno sin valor', () => {
    const posada = recurrentes()[0]
    expect(mismoRegistro(posada, { ...posada, editadoEl: AHORA })).toBe(true)
    expect(mismoRegistro({ id: 'rec.a', notas: undefined }, { id: 'rec.a' })).toBe(true)
    expect(mismoRegistro(posada, { ...posada, notas: undefined })).toBe(false)
    expect(mismoRegistro(posada, { ...posada, importe: { base: 10000 } })).toBe(false)
    expect(mismoRegistro(posada, { ...posada, recurrencia: { tipo: 'diaria', inicio: { anio: 1640, mes: 4, dia: 2 } } })).toBe(false)
    expect(mismoRegistro([1, 2], [2, 1])).toBe(false)
  })
})

describe('reemplazarPorId', () => {
  it('devuelve la misma lista si el registro no cambia, aunque traiga otro editadoEl', () => {
    const lista = recurrentes()
    expect(reemplazarPorId(lista, { ...lista[1] }, AHORA)).toBe(lista)
    expect(reemplazarPorId(lista, { ...lista[1], editadoEl: '2026-01-01T00:00:00.000Z' }, AHORA)).toBe(lista)
  })

  it('si cambia, sella editadoEl = ahora en esa fila y deja las demás como estaban', () => {
    const lista = recurrentes()
    const nueva = reemplazarPorId(lista, { ...lista[2], activo: true }, AHORA)
    expect(nueva).not.toBe(lista)
    expect(nueva[2]).toEqual({ ...lista[2], activo: true, editadoEl: AHORA })
    expect(nueva[0]).toBe(lista[0])
    expect(nueva[3]).toBe(lista[3])
    expect(lista[2].activo).toBe(false)
  })

  it('lanza si el id no existe: es un error de programación', () => {
    const lista = recurrentes()
    expect(() => reemplazarPorId(lista, { ...lista[0], id: 'rec.no-existe' }, AHORA)).toThrow(
      'No existe «rec.no-existe»',
    )
  })
})

describe('quitarPorId y buscarPorId', () => {
  it('quitarPorId quita la fila y devuelve la misma lista si no estaba', () => {
    const lista = recurrentes()
    expect(quitarPorId(lista, RECURRENTE.escolta).map((r) => r.id)).toEqual([
      RECURRENTE.posada,
      RECURRENTE.establo,
      RECURRENTE.alquilerCasaArchet,
    ])
    expect(quitarPorId(lista, 'rec.no-existe')).toBe(lista)
    expect(lista).toHaveLength(4)
  })

  it('buscarPorId devuelve el registro y lanza si no está', () => {
    const lista = recurrentes()
    expect(buscarPorId(lista, RECURRENTE.establo)).toBe(lista[1])
    expect(() => buscarPorId(lista, 'rec.no-existe')).toThrow('No existe «rec.no-existe»')
  })
})

describe('contarCambio', () => {
  it('suma 1 a cambiosDesdeUltimoAvance, conserva los avances y no toca la entrada (D-038)', () => {
    const documento = congelar(documentoDeEjemplo())
    const una = contarCambio(documento)
    const dos = contarCambio(una)
    expect(una.partida.cambiosDesdeUltimoAvance).toBe(1)
    expect(dos.partida.cambiosDesdeUltimoAvance).toBe(2)
    expect(dos.avances).toBe(documento.avances)
    expect(dos.movimientos).toBe(documento.movimientos)
    expect(documento.partida.cambiosDesdeUltimoAvance).toBe(0)
  })
})
