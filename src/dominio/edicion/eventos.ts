import { diasEntre } from '../calendario/fecha'
import { eventoActivoEl } from '../eventos/efectos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { buscarPorId, quitarPorId, reemplazarPorId, type Sello } from './registros'

/** «Terminar hoy» (§6.3 l.644): duracionDias = diasEntre(inicio, hoy) + 1; solo en un evento activo hoy. */
export function terminarEventoHoy<E extends EstadoPartida>(estado: E, id: Id, sello: Sello): E {
  const actual = buscarPorId(estado.eventos, id)
  const hoy = estado.partida.fechaActual
  if (!eventoActivoEl(actual, hoy)) {
    throw new Error('Solo se puede terminar hoy un evento activo')
  }
  const evento = { ...actual, duracionDias: diasEntre(actual.inicio, hoy) + 1 }
  const eventos = reemplazarPorId(estado.eventos, evento, sello.ahora)
  return eventos === estado.eventos ? estado : { ...estado, eventos }
}

/** Se borra: sus efectos futuros desaparecen y lo ya aplicado no se recalcula (§6.4 l.794). */
export function eliminarEvento<E extends EstadoPartida>(estado: E, id: Id): E {
  const eventos = quitarPorId(estado.eventos, id)
  return eventos === estado.eventos ? estado : { ...estado, eventos }
}
