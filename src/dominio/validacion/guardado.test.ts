import { describe, expect, it } from 'vitest'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { problemaAlGuardar } from './guardado'

describe('problemaAlGuardar', () => {
  it('la partida de ejemplo se puede guardar', () => {
    expect(problemaAlGuardar(documentoDeEjemplo(), catalogosDeEjemplo())).toBeNull()
  })

  it('un movimiento futuro sin programar no se puede guardar', () => {
    const documento = documentoDeEjemplo()
    documento.movimientos[0] = { ...documento.movimientos[0], fecha: { anio: 1641, mes: 1, dia: 1 } }
    expect(problemaAlGuardar(documento, catalogosDeEjemplo())).toContain('programado')
  })
})
