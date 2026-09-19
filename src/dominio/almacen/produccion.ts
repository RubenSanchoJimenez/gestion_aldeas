import { compararFechas, diasEntre, sumarDias, type Fecha } from '../calendario/fecha'
import { anteriorOcurrencia, siguienteOcurrencia, type Recurrencia } from '../calendario/recurrencia'
import type { Id, RecurrenciaProduccion } from '../modelo/comunes'
import type { Edificio, ProduccionEdificio, Trabajador } from '../modelo/asentamiento'
import { conEfectoCantidad } from './cantidades'

/** Asignados por edificio: suma de `numero` de los trabajadores con ese edificioId (§7 l.1115). */
export function asignadosPorEdificio(trabajadores: readonly Trabajador[]): Map<Id, number> {
  const asignados = new Map<Id, number>()
  for (const trabajador of trabajadores) {
    if (trabajador.edificioId === undefined) {
      continue
    }
    asignados.set(trabajador.edificioId, (asignados.get(trabajador.edificioId) ?? 0) + trabajador.numero)
  }
  return asignados
}

/**
 * Factor diario = estado × trabajadores × eventos (§7 l.1113-1116; §9 l.1316): 1 si activo y 0 si no; mín(1,
 * asignados ÷ necesarios) o 1 si necesarios = 0; máx(0, 1 + pctEventos ÷ 100).
 */
export function factorDiario(
  edificio: Pick<Edificio, 'estado' | 'trabajadoresNecesarios'>,
  asignados: number,
  pctEventos: number,
): number {
  const factorEstado = edificio.estado === 'activo' ? 1 : 0
  const factorTrabajadores =
    edificio.trabajadoresNecesarios === 0 ? 1 : Math.min(1, asignados / edificio.trabajadoresNecesarios)
  const factorEventos = conEfectoCantidad(1, pctEventos)
  return factorEstado * factorTrabajadores * factorEventos
}

/** Las cuatro frecuencias de RecurrenciaProduccion que anclan sus ocurrencias con `primera`. */
function tienePrimera(r: RecurrenciaProduccion): r is Extract<RecurrenciaProduccion, { primera: Fecha }> {
  return r.tipo === 'cadaNDias' || r.tipo === 'quincenal' || r.tipo === 'cadaNMeses' || r.tipo === 'trimestral'
}

/**
 * El primer día que cuenta en el acumulado: el siguiente a la ocurrencia teórica anterior a la primera ocurrencia
 * (§7 l.1125-1127). La primera ocurrencia es `primera` (cadaNDias, quincenal, cadaNMeses, trimestral) o la primera
 * ocurrencia desde `inicio` (siguienteOcurrencia(r, víspera de inicio)); null si no tiene ninguna de las dos.
 */
export function primerDiaQueCuenta(r: RecurrenciaProduccion): Fecha | null {
  const primeraOcurrencia = tienePrimera(r)
    ? r.primera
    : r.inicio !== undefined
      ? siguienteOcurrencia(r as Recurrencia, sumarDias(r.inicio, -1))
      : null
  if (primeraOcurrencia === null) {
    return null
  }
  const anterior = anteriorOcurrencia(r as Recurrencia, primeraOcurrencia)
  // anteriorOcurrencia solo da null con 'unica', que RecurrenciaProduccion no admite.
  return sumarDias(anterior as Fecha, 1)
}

/** Días del periodo de una ocurrencia: diasEntre(anteriorOcurrencia(r, ocurrencia), ocurrencia) (§7 l.1123). */
export function diasDelPeriodo(r: RecurrenciaProduccion, ocurrencia: Fecha): number {
  const anterior = anteriorOcurrencia(r as Recurrencia, ocurrencia) as Fecha
  return diasEntre(anterior, ocurrencia)
}

/** base × sumaFactores ÷ diasDelPeriodo (§7 l.1119; §9 l.1317). */
export function cantidadDeOcurrencia(base: number, sumaFactores: number, diasDelPeriodo: number): number {
  return (base * sumaFactores) / diasDelPeriodo
}

/** Días que lleva sumados: máx(0, diasEntre(máx(desde, primerDiaQueCuenta), hoy) + 1) (A7b: «11 días acumulados»). */
export function diasAcumulados(
  produccion: Pick<ProduccionEdificio, 'recurrencia' | 'acumulado'>,
  hoy: Fecha,
): number {
  const primero = primerDiaQueCuenta(produccion.recurrencia)
  const desde =
    primero !== null && compararFechas(primero, produccion.acumulado.desde) > 0 ? primero : produccion.acumulado.desde
  return Math.max(0, diasEntre(desde, hoy) + 1)
}
