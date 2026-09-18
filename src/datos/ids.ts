import type { Id } from '../dominio/modelo/comunes'

/**
 * Identificador nuevo de un registro (decisión 8). En la tablet es `crypto.randomUUID()`; si el navegador no lo
 * trae, se arma un UUID versión 4 con `crypto.getRandomValues` y, en último extremo, con `Math.random()`.
 * Vive en `src/datos` y no en el dominio porque `crypto` es una API del navegador.
 */
export function nuevoId(): Id {
  const cripto: Crypto | undefined = globalThis.crypto
  if (typeof cripto?.randomUUID === 'function') {
    return cripto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof cripto?.getRandomValues === 'function') {
    cripto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
