import type { Id } from '../modelo/comunes'
import type { Contexto } from './contexto'

/** El saldo vivo de una caja; una caja que no existe es un error de programación. */
function saldoDe(ctx: Contexto, dominioId: Id): number {
  const saldo = ctx.saldos.get(dominioId)
  if (saldo === undefined) {
    throw new Error(`No existe «${dominioId}»`)
  }
  return saldo
}

/** Suma un cobro al saldo vivo (§9, paso 8). */
export function cobrar(ctx: Contexto, dominioId: Id, importe: number): void {
  ctx.saldos.set(dominioId, saldoDe(ctx, dominioId) + importe)
}

/** Paga sin bajar de 0 (si ya está en negativo, nada) y devuelve lo pagado (§9 l.1292-1293). */
export function pagarHasta(ctx: Contexto, dominioId: Id, importe: number): number {
  const saldo = saldoDe(ctx, dominioId)
  // Math.max(0, …) devuelve +0 también cuando el mínimo es −0: lo pagado nunca es −0.
  const pagado = Math.max(0, Math.min(importe, saldo))
  ctx.saldos.set(dominioId, saldo - pagado)
  return pagado
}

/** Paga entero si el saldo llega y devuelve true; si no, no toca nada y devuelve false (TC8; D-045). Con 0, true. */
export function pagarEntero(ctx: Contexto, dominioId: Id, importe: number): boolean {
  if (importe === 0) {
    return true
  }
  const saldo = saldoDe(ctx, dominioId)
  if (importe > saldo) {
    return false
  }
  ctx.saldos.set(dominioId, saldo - importe)
  return true
}

/** La magnitud en mh del movimiento programado con ese id, o 0 si no hay id, no existe o ya no está programado. */
export function pagoProgramado(ctx: Contexto, movimientoId: Id | undefined): number {
  if (movimientoId === undefined) {
    return 0
  }
  const indice = ctx.indiceMovimiento.get(movimientoId)
  if (indice === undefined) {
    return 0
  }
  const movimiento = ctx.movimientos[indice]
  return movimiento.programado ? Math.abs(movimiento.importe.base) : 0
}
