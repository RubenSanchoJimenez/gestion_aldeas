import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Caja } from '../modelo/dominios'
import type { Movimiento } from '../modelo/movimientos'
import { aBase } from './importe'
import type { Equivalencias, Moneda } from './monedas'

/**
 * Saldo de una bolsa o caja en mh: saldo inicial + sus movimientos no programados (§7, §8).
 * Suma `importe.base`, que ya lleva el signo (decisión 18), de los movimientos de su mismo `dominioId`. No mira
 * `tipo` ni la fecha: un movimiento con fecha pasada que el avance todavía no ha aplicado sigue programado.
 */
export function saldoDeCaja(caja: Caja, movimientos: readonly Movimiento[]): number {
  return movimientos.reduce(
    (saldo, m) => (m.dominioId === caja.dominioId && !m.programado ? saldo + m.importe.base : saldo),
    caja.saldoInicial.base,
  )
}

/** Saldo de cada dominio de la partida, por dominioId; la caja que no tiene movimientos da su saldo inicial (§7). */
export function saldosPorDominio(estado: EstadoPartida): Record<Id, number> {
  const saldos: Record<Id, number> = {}
  for (const caja of estado.cajas) {
    saldos[caja.dominioId] = saldoDeCaja(caja, estado.movimientos)
  }
  return saldos
}

/** Una fila de la bolsa inicial de P1b: cantidad tecleada y moneda. */
export interface FilaMoneda {
  cantidad: string
  moneda: Moneda
}

/**
 * Suma en mh las filas de la bolsa inicial: 38 mo + 25 mp + 40 mb + 18 mc = 4.091.800 mh (§3, P1b).
 * Cada fila se redondea al mh por separado, como hace aBase; la bolsa de varias filas no guarda «introducido» (§3).
 */
export function sumarBolsaInicial(filas: readonly FilaMoneda[], eq: Equivalencias): number {
  return filas.reduce((total, fila) => total + aBase(fila.cantidad, fila.moneda, eq), 0)
}
