import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import { cobrar, pagarEntero, pagarHasta, pagoProgramado } from './caja'
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

/** El mismo contexto, con un gasto programado de 4,5 mo (obra) y uno ya aplicado, para pagoProgramado (T8). */
function contextoConProgramados(): Contexto {
  const conBree = conAsentamiento(estadoMinimo(), { id: 'dom.bree', nombre: 'Bree', caja: 300000 })
  const estado = congelar({
    ...conBree,
    movimientos: [
      {
        id: 'mov.obraProgramada',
        dominioId: 'dom.bree',
        fecha: { anio: 1640, mes: 4, dia: 15 },
        tipo: 'gasto' as const,
        importe: { base: -4500000 },
        categoriaId: CATEGORIA.obras,
        concepto: 'Obra: ampliar la cervecería',
        origen: 'avance' as const,
        avanceId: 'av.anterior',
        programado: true,
        vinculo: { tipo: 'obra' as const, id: 'obra.cerveceria' },
      },
      {
        id: 'mov.yaAplicado',
        dominioId: 'dom.bree',
        fecha: { anio: 1640, mes: 4, dia: 10 },
        tipo: 'gasto' as const,
        importe: { base: -100000 },
        categoriaId: CATEGORIA.otros,
        concepto: 'Ya se pagó',
        origen: 'avance' as const,
        avanceId: 'av.anterior',
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

describe('pagarEntero', () => {
  it('si la caja llega, paga entero y devuelve true (TC8; D-045)', () => {
    const ctx = contexto()
    expect(pagarEntero(ctx, 'dom.bree', 180000)).toBe(true)
    expect(ctx.saldos.get('dom.bree')).toBe(120000)
  })

  it('si no llega, no toca nada y devuelve false: ni pagos a medias ni impagos (D-045)', () => {
    const ctx = contexto()
    expect(pagarEntero(ctx, 'dom.bree', 420000)).toBe(false)
    expect(ctx.saldos.get('dom.bree')).toBe(300000)
  })

  it('con 0 siempre da true, aunque la caja esté en negativo', () => {
    const ctx = contexto()
    expect(pagarEntero(ctx, 'dom.tharan', 0)).toBe(true)
    expect(ctx.saldos.get('dom.tharan')).toBe(-60000)
  })
})

describe('pagoProgramado', () => {
  it('la magnitud en mh del movimiento programado, en positivo', () => {
    const ctx = contextoConProgramados()
    expect(pagoProgramado(ctx, 'mov.obraProgramada')).toBe(4500000)
  })

  it('0 sin id, con un id que no existe o con un movimiento que ya no está programado', () => {
    const ctx = contextoConProgramados()
    expect(pagoProgramado(ctx, undefined)).toBe(0)
    expect(pagoProgramado(ctx, 'mov.inventado')).toBe(0)
    expect(pagoProgramado(ctx, 'mov.yaAplicado')).toBe(0)
  })
})
