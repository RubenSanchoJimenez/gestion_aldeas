import { diasEntre } from '../calendario/fecha'
import { formatearDiaCercano } from '../calendario/formatoFecha'
import { pendienteDe } from '../deudas/pendiente'
import { formatearOro } from '../dinero/formato'
import type { EstadoPartida } from '../modelo/documento'
import { avisoDeudaQueVence, avisoDeudaVencida } from '../motor/textos'
import type { AvisoConFecha } from '../motor/tipos'

/** Días a partir de los cuales una deuda todavía no avisa de su vencimiento (§9, tabla de avisos). */
const DIAS_DE_AVISO = 10

/**
 * Un aviso rojo por cada deuda en estado «Vencida» con algo pendiente y uno ámbar por cada deuda que vence en
 * 10 días o menos (§9, tabla; esp l.1163). Las deudas de impago las lleva `avisosDeImpago` (D-024).
 */
export function avisosDeDeudas(estado: EstadoPartida): AvisoConFecha[] {
  const hoy = estado.partida.fechaActual
  const eq = estado.partida.equivalencias
  const nombres = new Map(estado.personas.map((p) => [p.id, p.nombre]))
  const avisos: AvisoConFecha[] = []

  for (const deuda of estado.deudas) {
    if (deuda.impago || deuda.estado === 'saldada' || deuda.vencimiento === undefined) {
      continue
    }
    const pendiente = pendienteDe(deuda)
    if (pendiente <= 0) {
      continue
    }
    const contraparte = nombres.get(deuda.contraparteId)
    if (contraparte === undefined) {
      throw new Error(`No existe «${deuda.contraparteId}»`)
    }
    const importe = formatearOro(pendiente, eq)
    if (deuda.estado === 'vencida') {
      avisos.push({
        tipo: 'deudaVencida',
        color: 'rojo',
        dominioId: deuda.dominioId,
        texto: avisoDeudaVencida(deuda.sentido, contraparte, importe),
        fecha: deuda.vencimiento,
      })
      continue
    }
    const dias = diasEntre(hoy, deuda.vencimiento)
    if (dias < 0 || dias > DIAS_DE_AVISO) {
      continue
    }
    avisos.push({
      tipo: 'deudaQueVence',
      color: 'ambar',
      dominioId: deuda.dominioId,
      texto: avisoDeudaQueVence(
        deuda.sentido,
        contraparte,
        importe,
        formatearDiaCercano(deuda.vencimiento, hoy),
        dias === 1,
      ),
      fecha: deuda.vencimiento,
    })
  }
  return avisos
}
