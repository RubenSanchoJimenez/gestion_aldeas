import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import { cobrar, pagarHasta } from './caja'
import { crearContexto, type Contexto } from './contexto'
import { idsEnSerie } from './ids'
import { conAsentamiento, congelar, estadoMinimo } from './pruebas/constructores'

const HASTA: Fecha = { anio: 1640, mes: 4, dia: 19 }

/** Bree con 3 mo en la caja y la bolsa de Tharan en −0,6 mo por un gasto manual (§6.4: se permite con aviso). */
function contexto(): Contexto {
  const conBree = conAsentamiento(estadoMinimo(), { id: 'dom.bree', nombre: 'Bree', caja: 300000 })
  const estado = congelar({
    ...conBree,
    movimientos: [
      {
        id: 'mov.gasto',
        dominioId: 'dom.tharan',
        fecha: { anio: 1640, mes: 4, dia: 12 },
        tipo: 'gasto' as const,
        importe: { base: -60000 },
        categoriaId: CATEGORIA.otros,
        concepto: 'Gasto manual',
        origen: 'manual' as const,
        programado: false,
      },
    ],
  })
  return crearContexto(estado, HASTA, { avanceId: 'av.prueba', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() })
}

describe('cobrar', () => {
  it('suma el cobro al saldo vivo de su caja, también si estaba en negativo (§9, paso 8)', () => {
    const ctx = contexto()
    cobrar(ctx, 'dom.bree', 150000)
    cobrar(ctx, 'dom.tharan', 100000)
    expect(ctx.saldos.get('dom.bree')).toBe(450000)
    expect(ctx.saldos.get('dom.tharan')).toBe(40000)
  })
})

describe('pagarHasta', () => {
  it('paga entero si la caja llega y devuelve lo pagado', () => {
    const ctx = contexto()
    expect(pagarHasta(ctx, 'dom.bree', 180000)).toBe(180000)
    expect(ctx.saldos.get('dom.bree')).toBe(120000)
  })

  it('paga lo que hay y deja la caja en 0: el resto es impago (§9 l.1292)', () => {
    const ctx = contexto()
    expect(pagarHasta(ctx, 'dom.bree', 420000)).toBe(300000)
    expect(ctx.saldos.get('dom.bree')).toBe(0)
    const nada = pagarHasta(ctx, 'dom.bree', 60000)
    expect(Object.is(nada, 0)).toBe(true)
    expect(Object.is(ctx.saldos.get('dom.bree'), 0)).toBe(true)
  })

  it('con la caja en negativo no paga nada ni la mueve, y nunca da −0 (§9 l.1293)', () => {
    const ctx = contexto()
    const pagado = pagarHasta(ctx, 'dom.tharan', 10000)
    expect(Object.is(pagado, 0)).toBe(true)
    expect(ctx.saldos.get('dom.tharan')).toBe(-60000)
  })

  it('un dominio sin caja es un error de programación: lanza «No existe «…»»', () => {
    const ctx = contexto()
    expect(() => pagarHasta(ctx, 'dom.inventado', 1)).toThrow('No existe «dom.inventado»')
    expect(() => cobrar(ctx, 'dom.inventado', 1)).toThrow('No existe «dom.inventado»')
  })
})
