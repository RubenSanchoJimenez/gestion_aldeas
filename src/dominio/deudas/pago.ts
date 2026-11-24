import { saldosPorDominio } from '../dinero/saldo'
import type { Id } from '../modelo/comunes'
import type { AplicarPagoA, Deuda } from '../modelo/deudas'
import type { EstadoPartida } from '../modelo/documento'
import { estadoDeDeuda, interesDelPeriodo } from './pendiente'

/** Cómo se reparte un pago entre intereses y capital, en mh. */
export interface RepartoPago {
  aIntereses: number
  aCapital: number
  /** Lo que pasa de lo pendiente y no se aplica a nada. */
  sobra: number
}

/** Lo que J4b enseña antes de registrar un pago: capital e intereses antes y después, saldo y próximo interés. */
export interface VistaPreviaPago extends RepartoPago {
  capitalAntes: number
  interesesAntes: number
  pendienteAntes: number
  capitalDespues: number
  interesesDespues: number
  pendienteDespues: number
  /** El interés del próximo periodo con el capital que queda; 0 si la deuda queda saldada o no tiene interés. */
  proximoInteres: number
  /** Saldo de la cuenta elegida antes y después; vacíos con «Ninguno: solo anotar la deuda». */
  saldoAntes?: number
  saldoDespues?: number
  saldaLaDeuda: boolean
}

/** Qué pide J4b: el importe en mh, cómo se aplica y de qué cuenta sale o en qué cuenta entra. */
export interface DatosPago {
  importe: number
  aplicarA: AplicarPagoA
  cuentaId?: Id
}

/**
 * Reparte un pago sobre lo que queda de la deuda, según «Se aplica a» (§7 l.1161): «intereses y capital» cubre
 * primero los intereses pendientes; «solo capital» y «solo intereses» van a lo suyo y lo que sobre pasa a la otra
 * parte. Lo que pase de lo pendiente queda en `sobra`.
 */
export function repartirPago(deuda: Deuda, importe: number, aplicarA: AplicarPagoA): RepartoPago {
  const { capital, interesesPendientes } = estadoDeDeuda(deuda)
  let resto = Math.max(0, importe)
  let aIntereses = 0
  let aCapital = 0
  const cubrirIntereses = (): void => {
    const puesto = Math.min(resto, interesesPendientes - aIntereses)
    aIntereses += puesto
    resto -= puesto
  }
  const cubrirCapital = (): void => {
    const puesto = Math.min(resto, capital - aCapital)
    aCapital += puesto
    resto -= puesto
  }
  if (aplicarA === 'soloCapital') {
    cubrirCapital()
    cubrirIntereses()
  } else {
    cubrirIntereses()
    cubrirCapital()
  }
  return { aIntereses, aCapital, sobra: resto }
}

/** Busca una deuda del estado por su id. */
function deudaDe(estado: EstadoPartida, deudaId: Id): Deuda {
  const deuda = estado.deudas.find((d) => d.id === deudaId)
  if (deuda === undefined) {
    throw new Error('No hay ninguna deuda con el id «' + deudaId + '»')
  }
  return deuda
}

/**
 * Lo que J4b muestra para un pago que todavía no se ha registrado: el reparto, el capital y los intereses antes y
 * después, el saldo de la cuenta y el interés del próximo periodo con el capital que quedaría. No toca el estado.
 */
export function vistaPreviaDePago(estado: EstadoPartida, deudaId: Id, datos: DatosPago): VistaPreviaPago {
  const deuda = deudaDe(estado, deudaId)
  const antes = estadoDeDeuda(deuda)
  const reparto = repartirPago(deuda, datos.importe, datos.aplicarA)
  const capitalDespues = antes.capital - reparto.aCapital
  const interesesDespues = antes.interesesPendientes - reparto.aIntereses
  const pendienteDespues = capitalDespues + interesesDespues
  // El próximo interés se calcula sobre el capital que quedaría, con la misma deuda ya pagada en parte.
  const comoQueda: Deuda = {
    ...deuda,
    estado: pendienteDespues === 0 ? 'saldada' : deuda.estado,
    pagos: [
      ...deuda.pagos,
      { id: 'previa', fecha: estado.partida.fechaActual, importe: { base: reparto.aIntereses + reparto.aCapital }, aplicarA: datos.aplicarA, movimientoId: 'previa' },
    ],
  }
  const previa: VistaPreviaPago = {
    ...reparto,
    capitalAntes: antes.capital,
    interesesAntes: antes.interesesPendientes,
    pendienteAntes: antes.pendiente,
    capitalDespues,
    interesesDespues,
    pendienteDespues,
    proximoInteres: interesDelPeriodo(comoQueda),
    saldaLaDeuda: pendienteDespues === 0,
  }
  if (datos.cuentaId === undefined) {
    return previa
  }
  // Pagar una deuda saca dinero de la cuenta; cobrar un préstamo que te deben lo mete.
  const signo = deuda.sentido === 'debo' ? -1 : 1
  const saldoAntes = saldosPorDominio(estado)[datos.cuentaId] ?? 0
  const movido = reparto.aIntereses + reparto.aCapital
  return { ...previa, saldoAntes, saldoDespues: saldoAntes + signo * movido }
}
