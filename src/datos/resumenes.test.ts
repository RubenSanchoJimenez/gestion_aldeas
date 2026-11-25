import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { documentoDeEjemplo } from '../dominio/ejemplo/sombraDelEste'
import type { Instante } from '../dominio/modelo/comunes'
import type { BaseDeDatos } from './baseDeDatos'
import { baseDePrueba } from './pruebas/baseDePrueba'
import { crearPartida } from './repositorio'
import { leerResumen } from './resumenes'

const AHORA: Instante = '2026-09-17T10:00:00.000Z'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('leerResumen', () => {
  it('lee el resumen del ejemplo guardado', async () => {
    const documento = documentoDeEjemplo()
    await crearPartida(db, documento, AHORA)
    const resumen = await leerResumen(db, documento.partida.id)
    expect(resumen?.nombre).toBe('La Sombra del Este')
    expect(resumen?.dominios).toEqual(['Tharan', 'Bree', 'Archet'])
  })

  it('da undefined si no existe', async () => {
    expect(await leerResumen(db, 'p.no-existe')).toBeUndefined()
  })
})
