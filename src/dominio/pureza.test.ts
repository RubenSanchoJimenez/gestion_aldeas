import { describe, expect, it } from 'vitest'

/** Código de cada módulo del dominio, sin las pruebas, leído por Vite como texto. */
const MODULOS = import.meta.glob<string>(['./**/*.ts', '!./**/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** Los siete módulos de la fase 1: si el glob no los ve, la prueba no está comprobando nada. */
const MODULOS_FASE_1 = [
  './calendario/fecha.ts',
  './calendario/formatoFecha.ts',
  './calendario/recurrencia.ts',
  './dinero/formato.ts',
  './dinero/importe.ts',
  './dinero/monedas.ts',
  './dinero/prorrateo.ts',
]

/** Lo único que el dominio puede importar además de sus propios archivos (decisión 15: Zod es del modelo). */
const IMPORTS_PERMITIDOS = ['zod']

/** APIs del navegador que el dominio no puede usar (plan de la fase 1: «sin React ni navegador»). */
const APIS_DEL_NAVEGADOR = /\b(indexedDB|localStorage|sessionStorage|window|document|navigator|crypto|fetch)\b/

/** Quita el JSDoc y los comentarios de línea: la pureza es del código, no de lo que cuentan los comentarios. */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/** De qué módulos importa un archivo: lo que va entre comillas después de `from`. */
function importados(codigo: string): string[] {
  return [...codigo.matchAll(/\bfrom '([^']+)'/g)].map((coincidencia) => coincidencia[1])
}

describe('el dominio es puro', () => {
  it('lee los módulos de src/dominio, con los siete de la fase 1', () => {
    const rutas = Object.keys(MODULOS)
    expect(rutas).toEqual(expect.arrayContaining(MODULOS_FASE_1))
    expect(rutas.length).toBeGreaterThanOrEqual(MODULOS_FASE_1.length)
  })

  it.each(Object.entries(MODULOS))('%s solo importa rutas relativas y Zod, y no toca el navegador', (_ruta, codigo) => {
    const prohibidos = importados(codigo).filter((m) => !m.startsWith('.') && !IMPORTS_PERMITIDOS.includes(m))
    expect(prohibidos).toEqual([])
    expect(sinComentarios(codigo)).not.toMatch(APIS_DEL_NAVEGADOR)
  })

  it('las pruebas del dominio se ejecutan sin IndexedDB ni navegador', () => {
    expect(typeof globalThis.indexedDB).toBe('undefined')
    expect(typeof globalThis.window).toBe('undefined')
    expect(typeof globalThis.localStorage).toBe('undefined')
  })
})
