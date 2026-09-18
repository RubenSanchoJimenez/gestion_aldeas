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
