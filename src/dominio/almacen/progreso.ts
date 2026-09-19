import { compararFechas, diasEntre, sumarDias, type Fecha } from '../calendario/fecha'
import { redondearMitadArriba } from '../dinero/importe'
import type { Obra } from '../modelo/asentamiento'
import type { Caravana } from '../modelo/comercio'

/** inicio + diasTotales − 1; null en una obra planificada, que no tiene inicio (§8 l.1250). */
export function finDeObra(obra: Pick<Obra, 'inicio' | 'diasTotales'>): Fecha | null {
  return obra.inicio === undefined ? null : sumarDias(obra.inicio, obra.diasTotales - 1)
}

/** «Día 7 de 12 · quedan 5 días» y el % (D-063). */
export interface ProgresoDeObra {
  dia: number
  dias: number
  quedan: number
  pct: number
}

/**
 * Terminada: dia = dias y 100 %. Sin inicio o antes de él: dia 0 y 0 %. Si no: dia = mín(dias, diasEntre(inicio,
 * hoy) + 1), quedan = dias − dia, pct = redondearMitadArriba(100 × dia ÷ dias) (D-063).
 */
export function progresoDeObra(obra: Pick<Obra, 'estado' | 'inicio' | 'diasTotales'>, hoy: Fecha): ProgresoDeObra {
  const dias = obra.diasTotales
  if (obra.estado === 'terminada') {
    return { dia: dias, dias, quedan: 0, pct: 100 }
  }
  if (obra.inicio === undefined || compararFechas(hoy, obra.inicio) < 0) {
    return { dia: 0, dias, quedan: dias, pct: 0 }
  }
  const dia = Math.min(dias, diasEntre(obra.inicio, hoy) + 1)
  return { dia, dias, quedan: dias - dia, pct: redondearMitadArriba((100 * dia) / dias) }
}

/** salida + diasViaje (traslado) o salida + 2 × diasViaje (compra y venta); con 0 días, la misma salida (§7 l.1154-1157). */
export function vueltaDeCaravana(salida: Fecha, diasViaje: number, operacion: Caravana['operacion']): Fecha {
  return sumarDias(salida, operacion === 'traslado' ? diasViaje : diasViaje * 2)
}

/**
 * redondearMitadArriba(100 × (hoy − salida) ÷ (vuelta − salida)), entre 0 y 100; con vuelta = salida, 0 antes y
 * 100 desde ese día (D-063).
 */
export function progresoDeCaravana(caravana: Pick<Caravana, 'salida' | 'vuelta'>, hoy: Fecha): number {
  const total = diasEntre(caravana.salida, caravana.vuelta)
  if (total === 0) {
    return compararFechas(hoy, caravana.salida) < 0 ? 0 : 100
  }
  const transcurridos = diasEntre(caravana.salida, hoy)
  return Math.max(0, Math.min(100, redondearMitadArriba((100 * transcurridos) / total)))
}
