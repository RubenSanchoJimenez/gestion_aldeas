import { pendienteDe } from '../deudas/pendiente'
import { saldosPorDominio } from '../dinero/saldo'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'

/** El desglose del patrimonio que enseña J1, en mh. «debes» y «neto» ya llevan los intereses (esp l.1056). */
export interface Patrimonio {
  bolsa: number
  inventario: number
  inversiones: number
  teDeben: number
  debes: number
  /** bolsa + inventario + inversiones + teDeben − debes. */
  neto: number
}

/** El id del personaje: el único dominio de tipo personaje (§8). */
function personajeDe(estado: EstadoPartida): Id {
  const personaje = estado.dominios.find((d) => d.tipo === 'personaje')
  if (personaje === undefined) {
    throw new Error('No existe «personaje»')
  }
  return personaje.id
}

/**
 * Patrimonio = bolsa + inventario (sin los objetos archivados) + inversiones activas (el capital completo, no la
 * participación) + lo que te deben − lo que debes, con los intereses (esp l.1056, l.423). Solo cuenta las deudas
 * del personaje: las de un asentamiento van en A2b (decidido por el usuario el 2026-09-16).
 */
export function patrimonioDelPersonaje(estado: EstadoPartida): Patrimonio {
  const personaje = personajeDe(estado)
  const bolsa = saldosPorDominio(estado)[personaje] ?? 0

  const inventario = estado.objetos
    .filter((o) => o.dominioId === personaje && o.archivado === undefined)
    .reduce((total, o) => total + o.valorUnitario.base * o.cantidad, 0)

  const inversiones = estado.inversiones
    .filter((i) => i.dominioId === personaje && i.estado === 'activa')
    .reduce((total, i) => total + i.capital.base, 0)

  let teDeben = 0
  let debes = 0
  for (const deuda of estado.deudas) {
    if (deuda.dominioId !== personaje || deuda.estado === 'saldada') {
      continue
    }
    const pendiente = pendienteDe(deuda)
    if (deuda.sentido === 'meDeben') {
      teDeben += pendiente
    } else {
      debes += pendiente
    }
  }

  return { bolsa, inventario, inversiones, teDeben, debes, neto: bolsa + inventario + inversiones + teDeben - debes }
}
