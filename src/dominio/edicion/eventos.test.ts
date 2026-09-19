import { describe, expect, it } from 'vitest'
import { EVENTO } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import { eliminarEvento, terminarEventoHoy } from './eventos'
import type { Sello } from './registros'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** Un sello nuevo en cada prueba: los ids salen «nuevo.1», «nuevo.2»… */
function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

/** La partida de ejemplo congelada: si una función escribe en su entrada, la prueba falla. */
function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

describe('terminarEventoHoy', () => {
  it('O13: las lluvias del 12 de abril quedan en 5 días (§6.3 l.644)', () => {
    const estado = terminarEventoHoy(ejemplo(), EVENTO.lluvias, sello())
    const lluvias = estado.eventos.find((e) => e.id === EVENTO.lluvias)
    expect(lluvias?.duracionDias).toBe(5)
    expect(lluvias?.editadoEl).toBe(AHORA)
    expect(estado.eventos).not.toBe(ejemplo().eventos)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('O13: la feria, que todavía no ha empezado, no se puede terminar hoy', () => {
    expect(() => terminarEventoHoy(ejemplo(), EVENTO.feria, sello())).toThrow('Solo se puede terminar hoy un evento activo')
  })

  it('no toca nada más: ni los edificios ni sus acumulados de producción', () => {
    const base = ejemplo()
    const estado = terminarEventoHoy(base, EVENTO.lluvias, sello())
    expect(estado.edificios).toBe(base.edificios)
    expect(estado.existencias).toBe(base.existencias)
  })

  it('lanza si el evento no existe', () => {
    expect(() => terminarEventoHoy(ejemplo(), 'ev.inventado', sello())).toThrow('No existe «ev.inventado»')
  })
})

describe('eliminarEvento', () => {
  it('borra el evento; los demás siguen igual', () => {
    const base = ejemplo()
    const estado = eliminarEvento(base, EVENTO.mensajero)
    expect(estado.eventos.map((e) => e.id)).not.toContain(EVENTO.mensajero)
    expect(estado.eventos).toHaveLength(base.eventos.length - 1)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('la misma lista si el evento ya no estaba (quitarPorId)', () => {
    const base = ejemplo()
    const estado = eliminarEvento(base, 'ev.inventado')
    expect(estado.eventos).toBe(base.eventos)
  })
})
