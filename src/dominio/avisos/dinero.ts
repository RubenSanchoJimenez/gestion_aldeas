import { formatearOro } from '../dinero/formato'
import { saldosPorDominio } from '../dinero/saldo'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Dominio } from '../modelo/dominios'
import { avisoImpago, avisoSaldoNegativo } from '../motor/textos'
import type { AvisoConFecha } from '../motor/tipos'

/** El dominio con ese id; si no existe, es un error de programación (la copia ya se validó). */
export function dominioDe(estado: EstadoPartida, id: Id): Dominio {
  const dominio = estado.dominios.find((d) => d.id === id)
  if (dominio === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  return dominio
}

/** Un aviso rojo por bolsa o caja por debajo de 0 en la fecha actual (§9, tabla; §6.4 l.808). */
export function avisosDeSaldoNegativo(estado: EstadoPartida): AvisoConFecha[] {
  const saldos = saldosPorDominio(estado)
  const eq = estado.partida.equivalencias
  const avisos: AvisoConFecha[] = []
  for (const dominio of estado.dominios) {
    const saldo = saldos[dominio.id] ?? 0
    if (saldo < 0) {
      avisos.push({
        tipo: 'saldoNegativo',
        color: 'rojo',
        dominioId: dominio.id,
        texto: avisoSaldoNegativo(dominio, formatearOro(saldo, eq)),
        fecha: estado.partida.fechaActual,
      })
    }
  }
  return avisos
}

/** Un aviso rojo por deuda de impago con algo pendiente; fecha = la del último cargo (§9; D-024; T17). */
export function avisosDeImpago(estado: EstadoPartida): AvisoConFecha[] {
  const eq = estado.partida.equivalencias
  const avisos: AvisoConFecha[] = []
  for (const deuda of estado.deudas) {
    const ultimoCargo = deuda.cargos?.[deuda.cargos.length - 1]
    if (!deuda.impago || deuda.estado === 'saldada' || ultimoCargo === undefined) {
      continue
    }
    const pendiente = deuda.principal.base - deuda.pagos.reduce((total, p) => total + p.importe.base, 0)
    if (pendiente <= 0) {
      continue
    }
    const contraparte = estado.personas.find((p) => p.id === deuda.contraparteId)
    if (contraparte === undefined) {
      throw new Error(`No existe «${deuda.contraparteId}»`)
    }
    avisos.push({
      tipo: 'impago',
      color: 'rojo',
      dominioId: deuda.dominioId,
      texto: avisoImpago(dominioDe(estado, deuda.dominioId), contraparte.nombre, formatearOro(pendiente, eq)),
      fecha: ultimoCargo.fecha,
    })
  }
  return avisos
}
