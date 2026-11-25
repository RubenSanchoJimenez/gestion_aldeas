import { porcentajeDe } from '../dinero/importe'
import type { Deuda } from '../modelo/deudas'

/** Lo que se debe de una deuda, en hierro (mh), ya repartido entre capital e intereses (§7 l.1160-1166). */
export interface EstadoDeuda {
  /** Principal menos lo pagado a capital; nunca baja de 0. */
  capital: number
  /** Suma de los devengos: todos los intereses que el motor ya ha sumado. */
  interesesDevengados: number
  /** Lo que los pagos han puesto en los intereses. */
  interesesPagados: number
  /** Lo que los pagos han puesto en el capital. */
  capitalPagado: number
  /** Devengados menos pagados; nunca baja de 0. */
  interesesPendientes: number
  /** Capital más intereses pendientes: lo que falta por pagar. */
  pendiente: number
  /** true cuando no queda nada pendiente (§7 l.1166). */
  saldada: boolean
}

/**
 * Reparte los pagos de una deuda y devuelve lo que queda. Cada pago se aplica según su «Se aplica a» (§7 l.1161):
 * «intereses y capital» cubre primero los intereses pendientes y el resto va al capital; «solo intereses» y «solo
 * capital» van a lo suyo, y lo que sobre pasa a la otra parte en vez de perderse. Los devengos ya sumados no se
 * recalculan, así que la fecha del pago no importa (§7 l.1162).
 */
export function estadoDeDeuda(deuda: Deuda): EstadoDeuda {
  const principal = deuda.principal.base
  const interesesDevengados = deuda.devengos.reduce((suma, devengo) => suma + devengo.importe.base, 0)
  let interesesPagados = 0
  let capitalPagado = 0
  for (const pago of deuda.pagos) {
    let resto = pago.importe.base
    const alCapital = (cantidad: number): void => {
      const puesto = Math.min(cantidad, Math.max(0, principal - capitalPagado))
      capitalPagado += puesto
      resto -= puesto
    }
    const aIntereses = (cantidad: number): void => {
      const puesto = Math.min(cantidad, Math.max(0, interesesDevengados - interesesPagados))
      interesesPagados += puesto
      resto -= puesto
    }
    if (pago.aplicarA === 'soloCapital') {
      alCapital(resto)
      aIntereses(resto)
    } else {
      aIntereses(resto)
      alCapital(resto)
    }
  }
  const capital = Math.max(0, principal - capitalPagado)
  const interesesPendientes = Math.max(0, interesesDevengados - interesesPagados)
  const pendiente = capital + interesesPendientes
  return {
    capital,
    interesesDevengados,
    interesesPagados,
    capitalPagado,
    interesesPendientes,
    pendiente,
    saldada: pendiente === 0,
  }
}

/** Lo que falta por pagar de una deuda, en mh. */
export function pendienteDe(deuda: Deuda): number {
  return estadoDeDeuda(deuda).pendiente
}

/** true si no queda nada pendiente; es lo que lleva la deuda al grupo «Saldadas» (§7 l.1166). */
export function estaSaldada(deuda: Deuda): boolean {
  return estadoDeDeuda(deuda).saldada
}

/**
 * El interés de un periodo: el porcentaje sobre el capital pendiente (§7 l.1162), redondeado al hierro con las
 * mitades hacia arriba. Una deuda saldada, sin interés o de impago no devenga nada.
 */
export function interesDelPeriodo(deuda: Deuda): number {
  if (deuda.estado === 'saldada' || deuda.impago || deuda.interesPct === 0) {
    return 0
  }
  return porcentajeDe(estadoDeDeuda(deuda).capital, deuda.interesPct)
}
