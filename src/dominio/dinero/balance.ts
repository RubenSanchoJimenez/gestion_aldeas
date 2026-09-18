import { equivalenteMensualLocales } from '../locales/impuesto'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { habitantesDe } from '../poblacion/habitantes'
import { sumarAlMes, type PartidaMensual } from './prorrateo'

/** Las cifras al mes de un asentamiento, en mh (§7 l.1057-1062). */
export interface BalanceMensual {
  /** Impuestos y rentas de ingreso + locales con la habitual; Bree 4.395.714 («+44 mo»). */
  entran: number
  /** Salarios + soldadas + tributos; Bree 5.542.857 («55,4 mo»). */
  salen: number
  /** Solo los tributos; Bree 2.500.000 («−25 mo al mes», A3). */
  tributos: number
  /** entran − salen; Bree −1.147.143 («−11,5 mo»). */
  balance: number
  /** entran − tributos; Bree 1.895.714 («+19 mo»). */
  resultadoFiscal: number
}

/**
 * Balance y resultado fiscal con los habitantes de la fecha actual, sin eventos ni recurrentes del personaje
 * (§7 l.1057-1062; D-027; técnica 2). Cada total (entran, salen y tributos) es una suma exacta de fracciones con
 * un solo redondeo al mh; balance y resultado se restan con esos totales ya redondeados, como hace §7 l.1057.
 * Los locales entran con su equivalente mensual: la producción habitual y el estado del último tramo (D-028).
 */
export function balanceMensual(estado: EstadoPartida, dominioId: Id): BalanceMensual {
  const habitantes = habitantesDe(estado, dominioId, estado.partida.fechaActual)
  const ingresos: PartidaMensual[] = []
  const tributos: PartidaMensual[] = []
  for (const regla of estado.impuestosRentas) {
    if (regla.dominioId !== dominioId) {
      continue
    }
    const base = regla.base === 'porHabitante' ? regla.importe.base * habitantes : regla.importe.base
    const partida: PartidaMensual = { base, recurrencia: regla.recurrencia }
    if (regla.sentido === 'ingreso') {
      ingresos.push(partida)
    } else {
      tributos.push(partida)
    }
  }
  const pagos: PartidaMensual[] = [
    ...estado.trabajadores
      .filter((t) => t.dominioId === dominioId)
      .map((t) => ({ base: t.numero * t.salario.base, recurrencia: t.recurrencia })),
    ...estado.unidadesGuarnicion
      .filter((u) => u.dominioId === dominioId)
      .map((u) => ({ base: u.numero * u.soldada.base, recurrencia: u.recurrencia })),
    ...tributos,
  ]
  const entran = sumarAlMes(ingresos) + equivalenteMensualLocales(estado, dominioId)
  const salen = sumarAlMes(pagos)
  const deTributos = sumarAlMes(tributos)
  return {
    entran,
    salen,
    tributos: deTributos,
    balance: entran - salen,
    resultadoFiscal: entran - deTributos,
  }
}
