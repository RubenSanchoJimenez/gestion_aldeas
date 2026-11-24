import { compararFechas } from '../../calendario/fecha'
import { ocurreEl } from '../../calendario/recurrencia'
import { estadoDeDeuda, interesDelPeriodo } from '../../deudas/pendiente'
import type { Deuda } from '../../modelo/deudas'
import type { Contexto, Dia } from '../contexto'

/** Una deuda de impago o saldada no devenga intereses ni vence (§9 l.1296; §7 l.1166). */
function corre(deuda: Deuda): boolean {
  return !deuda.impago && deuda.estado !== 'saldada'
}

/**
 * Paso 10: primero el interés del día y después el vencimiento (§9 l.1282, l.1320). El interés se calcula sobre el
 * capital pendiente y queda como devengo con su fecha y su avance; al vencer, la deuda pasa a «vencida» y no se
 * paga nada: solo avisa. Una deuda vencida sigue devengando hasta que se registra el pago (§7 l.1163).
 */
export function pasoDeudas(ctx: Contexto, dia: Dia): void {
  ctx.deudas.forEach((deuda, indice) => {
    if (!corre(deuda)) {
      return
    }
    let nueva = deuda
    if (deuda.recurrenciaInteres !== undefined && ocurreEl(deuda.recurrenciaInteres, dia.fecha)) {
      const importe = interesDelPeriodo(deuda)
      if (importe > 0) {
        nueva = { ...nueva, devengos: [...nueva.devengos, { fecha: dia.fecha, importe: { base: importe }, avanceId: ctx.opciones.avanceId }] }
      }
    }
    if (nueva.estado === 'abierta' && nueva.vencimiento !== undefined && compararFechas(nueva.vencimiento, dia.fecha) <= 0) {
      // Vence después del interés del día, y solo si queda algo pendiente.
      if (estadoDeDeuda(nueva).pendiente > 0) {
        nueva = { ...nueva, estado: 'vencida' }
      }
    }
    if (nueva !== deuda) {
      ctx.deudas[indice] = nueva
    }
  })
}
