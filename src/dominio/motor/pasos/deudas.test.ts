import { describe, expect, it } from 'vitest'
import { sumarDias } from '../../calendario/fecha'
import { estadoDeDeuda } from '../../deudas/pendiente'
import { DEUDA, DOM } from '../../ejemplo/ids'
import { documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import type { Deuda } from '../../modelo/deudas'
import { estadoDe } from '../../modelo/documento'
import { recorrerDias } from '../bucle'
import { idsEnSerie } from '../ids'

/** Recorre `dias` días desde la fecha actual del ejemplo y devuelve el estado nuevo. */
function avanzar(dias: number, cambiar?: (deudas: Deuda[]) => Deuda[]) {
  const estado = estadoDe(documentoDeEjemplo())
  const conCambios = cambiar === undefined ? estado : { ...estado, deudas: cambiar([...estado.deudas]) }
  const hasta = sumarDias(estado.partida.fechaActual, dias)
  return recorrerDias(conCambios, hasta, { avanceId: 'av.prueba', nuevoId: idsEnSerie('sim'), catalogo: { opciones: [], recursos: [] } })
}

function deudaDe(estado: { deudas: readonly Deuda[] }, id: string): Deuda {
  const deuda = estado.deudas.find((d) => d.id === id)
  if (deuda === undefined) {
    throw new Error('no existe la deuda ' + id)
  }
  return deuda
}

describe('pasoDeudas (paso 10)', () => {
  it('no devenga nada en los 7 días del ejemplo: el interés del Gremio es mensual, día 1', () => {
    const recorrido = avanzar(7)
    expect(deudaDe(recorrido.estadoNuevo, DEUDA.gremioTharan).devengos).toHaveLength(1)
  })

  it('el 1 de mayo suma el interés sobre el capital pendiente y, ese mismo día, vence (O5)', () => {
    // Del 12 de abril al 1 de mayo son 19 días.
    const gremio = deudaDe(avanzar(19).estadoNuevo, DEUDA.gremioTharan)
    expect(gremio.devengos).toHaveLength(2)
    expect(gremio.devengos[1]).toEqual({
      fecha: { anio: 1640, mes: 5, dia: 1 },
      importe: { base: 200000 },
      avanceId: 'av.prueba',
    })
    expect(estadoDeDeuda(gremio).pendiente).toBe(4400000)
    expect(gremio.estado).toBe('vencida')
  })

  it('el interés se calcula sobre el capital pendiente, no sobre el principal', () => {
    const gremio = deudaDe(
      avanzar(19, (deudas) =>
        deudas.map((d) =>
          d.id === DEUDA.gremioTharan
            ? {
                ...d,
                pagos: [
                  ...d.pagos,
                  { id: 'pago.extra', fecha: { anio: 1640, mes: 4, dia: 12 }, importe: { base: 2000000 }, aplicarA: 'soloCapital' as const, movimientoId: 'mov.x' },
                ],
              }
            : d,
        ),
      ).estadoNuevo,
      DEUDA.gremioTharan,
    )
    // Capital 20 mo: el interés del 1 de mayo es 1 mo, no 2.
    expect(gremio.devengos[1]?.importe.base).toBe(100000)
  })

  it('el vencimiento de Hobart, sin interés, solo cambia el estado', () => {
    const hobart = deudaDe(avanzar(8).estadoNuevo, DEUDA.hobart)
    expect(hobart.estado).toBe('vencida')
    expect(hobart.devengos).toEqual([])
  })

  it('una deuda ya vencida sigue devengando intereses hasta que se paga (esp l.1163)', () => {
    const recorrido = avanzar(50, (deudas) => deudas.map((d) => (d.id === DEUDA.gremioTharan ? { ...d, estado: 'vencida' as const } : d)))
    // 1 de mayo y 1 de junio.
    expect(deudaDe(recorrido.estadoNuevo, DEUDA.gremioTharan).devengos).toHaveLength(3)
  })

  it('una deuda saldada no devenga ni vence', () => {
    const recorrido = avanzar(19, (deudas) =>
      deudas.map((d) => (d.id === DEUDA.gremioTharan ? { ...d, estado: 'saldada' as const } : d)),
    )
    const gremio = deudaDe(recorrido.estadoNuevo, DEUDA.gremioTharan)
    expect(gremio.devengos).toHaveLength(1)
    expect(gremio.estado).toBe('saldada')
  })

  it('una deuda de impago no devenga ni vence (§9 l.1296)', () => {
    // El ejemplo no tiene impagos, así que se marca como tal la deuda de Bree, con interés y vencimiento ya pasado.
    const recorrido = avanzar(60, (deudas) =>
      deudas.map((d) =>
        d.id === DEUDA.gremioBree
          ? { ...d, impago: true, origenImpago: { tipo: 'salarios' as const, id: DOM.bree }, cargos: [], interesPct: 10, recurrenciaInteres: { tipo: 'mensual' as const, diaMes: 1 } }
          : d,
      ),
    )
    const impago = deudaDe(recorrido.estadoNuevo, DEUDA.gremioBree)
    expect(impago.devengos).toEqual([])
    expect(impago.estado).toBe('abierta')
  })

  it('el paso no crea movimientos: al vencer no se paga nada (esp l.1320)', () => {
    const antes = estadoDe(documentoDeEjemplo())
    const recorrido = avanzar(19)
    const nuevos = recorrido.estadoNuevo.movimientos.filter((m) => !antes.movimientos.some((a) => a.id === m.id))
    expect(nuevos.some((m) => m.categoriaId === 'cat.prestamos-y-deudas')).toBe(false)
  })

  it('un avance de un día en un día cualquiera no toca las deudas', () => {
    const antes = estadoDe(documentoDeEjemplo())
    const recorrido = avanzar(1)
    expect(recorrido.estadoNuevo.deudas).toEqual(antes.deudas)
  })

  it('las deudas de un asentamiento también devengan y vencen', () => {
    const recorrido = avanzar(50, (deudas) =>
      deudas.map((d) =>
        d.id === DEUDA.gremioBree
          ? { ...d, dominioId: DOM.bree, impago: false, origenImpago: undefined, cargos: undefined, interesPct: 10, recurrenciaInteres: { tipo: 'mensual' as const, diaMes: 1 }, vencimiento: { anio: 1640, mes: 5, dia: 10 } }
          : d,
      ),
    )
    const bree = deudaDe(recorrido.estadoNuevo, DEUDA.gremioBree)
    expect(bree.devengos.length).toBeGreaterThan(0)
    expect(bree.estado).toBe('vencida')
  })
})
