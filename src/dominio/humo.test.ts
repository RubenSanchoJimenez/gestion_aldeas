import { describe, it, expect } from 'vitest'

describe('prueba de humo del entorno de pruebas', () => {
  it('Vitest ejecuta las pruebas del dominio', () => {
    expect(1 + 1).toBe(2)
  })

  it('las pruebas del dominio se ejecutan en node, sin navegador', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })

  it('BigInt multiplica importes grandes sin perder precisión', () => {
    expect(BigInt(Number.MAX_SAFE_INTEGER) * 10n).toBe(90071992547409910n)
  })
})
