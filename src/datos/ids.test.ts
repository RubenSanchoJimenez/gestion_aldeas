import { afterEach, describe, expect, it, vi } from 'vitest'
import { nuevoId } from './ids'

/** Forma de un UUID versión 4 con variante 10xx: 8-4-4-4-12 en hexadecimal. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('nuevoId', () => {
  it('da un identificador distinto cada vez', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => nuevoId()))
    expect(ids.size).toBe(1000)
  })

  it('tiene la forma de un UUID versión 4', () => {
    expect(nuevoId()).toMatch(UUID_V4)
  })

  it('sigue dando un UUID cuando el navegador no trae randomUUID', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0xab)
        return bytes
      },
    })
    expect(nuevoId()).toBe('abababab-abab-4bab-abab-abababababab')

    vi.stubGlobal('crypto', undefined)
    expect(nuevoId()).toMatch(UUID_V4)
  })
})
