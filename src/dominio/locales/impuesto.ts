import { compararFechas, diaEnMes, type Fecha } from '../calendario/fecha'
import { porcentajeDe } from '../dinero/importe'
import type { CambioEstadoLocal, LocalComercial, TipoLocal } from '../modelo/asentamiento'
import type { AnioMes, Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'

/** Abierto o cerrado. */
export type EstadoLocal = CambioEstadoLocal['estado']

/** El mes de una fecha. */
export function mesDe(f: Fecha): AnioMes {
  return { anio: f.anio, mes: f.mes }
}

/** Negativo si a es anterior a b, 0 si es el mismo mes y positivo si es posterior. */
export function compararMeses(a: AnioMes, b: AnioMes): number {
  return a.anio * 12 + a.mes - (b.anio * 12 + b.mes)
}

/** El mes siguiente; diciembre pasa a enero del año siguiente. */
export function mesSiguiente(m: AnioMes): AnioMes {
  return m.mes === 12 ? { anio: m.anio + 1, mes: 1 } : { anio: m.anio, mes: m.mes + 1 }
}

/** El mes anterior; enero pasa a diciembre del año anterior. */
export function mesAnterior(m: AnioMes): AnioMes {
  return m.mes === 1 ? { anio: m.anio - 1, mes: 12 } : { anio: m.anio, mes: m.mes - 1 }
}

/**
 * Estado de un local un día: el del último tramo con desde ≤ día; antes del primer tramo, cerrado (§7; decisión 13
 * de la fase 2). Los tramos van en orden de fecha (lo exige EsquemaLocalComercial).
 */
export function estadoDelLocalEl(local: LocalComercial, dia: Fecha): EstadoLocal {
  let estado: EstadoLocal = 'cerrado'
  for (const tramo of local.cambiosEstado) {
    if (compararFechas(tramo.desde, dia) > 0) {
      break
    }
    estado = tramo.estado
  }
  return estado
}

/** El estado que eligió el jugador por última vez: el del último tramo, aunque empiece mañana (D-028). */
export function estadoVigenteDelLocal(local: LocalComercial): EstadoLocal {
  return local.cambiosEstado[local.cambiosEstado.length - 1].estado
}

/** Si el local estuvo abierto algún día de ese mes (§7, «Estado»; §9 l.1308). */
export function abiertoAlgunDia(local: LocalComercial, mes: AnioMes): boolean {
  const primero: Fecha = { anio: mes.anio, mes: mes.mes, dia: 1 }
  const ultimo = diaEnMes(mes.anio, mes.mes, 31)
  if (estadoDelLocalEl(local, primero) === 'abierto') {
    return true
  }
  return local.cambiosEstado.some(
    (tramo) =>
      tramo.estado === 'abierto' && compararFechas(tramo.desde, primero) > 0 && compararFechas(tramo.desde, ultimo) <= 0,
  )
}

/** Producción de un mes: la anotada o, si no hay, la habitual vigente (§7 l.1067 y l.1077). */
export function produccionDelMes(local: LocalComercial, mes: AnioMes): { importe: number; anotada: boolean } {
  const anotacion = local.producciones.find((p) => compararMeses(p.mes, mes) === 0)
  return anotacion === undefined
    ? { importe: local.produccionHabitual.base, anotada: false }
    : { importe: anotacion.importe.base, anotada: true }
}

/** máx(porcentaje × producción redondeado al mh, mínimo) (§7 l.1069-1070; §9 l.1319). */
export function impuestoDeLocal(produccion: number, tipo: TipoLocal): number {
  return Math.max(porcentajeDe(produccion, tipo.pct), tipo.minimo.base)
}

/** El día de cobro de un tipo en un mes: su día o el último del mes (§7 l.1065). */
export function diaDeCobro(tipo: TipoLocal, anio: number, mes: number): Fecha {
  return diaEnMes(anio, mes, tipo.diaCobro)
}

/**
 * Los meses que cobra un local un día de cobro: de cobradoHasta + 1 al mes anterior a ese día (§7 l.1074; §9 l.1304).
 * Nunca antes del mes del alta, que se cobra entero: «los meses anteriores al alta no se cobran» (§9 l.1306).
 */
export function mesesPorCobrar(local: LocalComercial, dia: Fecha): AnioMes[] {
  const desdeCobro = mesSiguiente(local.cobradoHasta)
  const delAlta = mesDe(local.alta)
  const hasta = mesAnterior(mesDe(dia))
  const meses: AnioMes[] = []
  for (
    let mes = compararMeses(desdeCobro, delAlta) >= 0 ? desdeCobro : delAlta;
    compararMeses(mes, hasta) <= 0;
    mes = mesSiguiente(mes)
  ) {
    meses.push(mes)
  }
  return meses
}

/**
 * Σ, por local abierto (último tramo), de máx(% × habitual, mínimo); los cerrados cuentan 0 (§7 l.1086-1087):
 * Bree 470.000. Usa solo la producción habitual, nunca la anotada (§9, «Previsiones»).
 */
export function equivalenteMensualLocales(estado: EstadoPartida, dominioId: Id): number {
  const tipos = new Map(estado.tiposLocal.map((t) => [t.id, t]))
  let total = 0
  for (const local of estado.localesComerciales) {
    if (local.dominioId !== dominioId || estadoVigenteDelLocal(local) !== 'abierto') {
      continue
    }
    const tipo = tipos.get(local.tipoId)
    if (tipo !== undefined) {
      total += impuestoDeLocal(local.produccionHabitual.base, tipo)
    }
  }
  return total
}
