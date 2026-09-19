import type { Importe } from '../dinero/importe'
import type { DestinoRuta, Mercado, Ruta } from '../modelo/comercio'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { buscarPorId, reemplazarPorId, type Sello } from './registros'

/** El mismo destino de ruta (mismo tipo y mismo id). */
function mismoDestino(a: DestinoRuta, b: DestinoRuta): boolean {
  return a.tipo === b.tipo && a.id === b.id
}

/** El destino «al revés» de un origen y un destino de asentamiento, para buscar la ruta en los dos sentidos. */
function destinoInverso(origenId: Id, destino: DestinoRuta): DestinoRuta | null {
  return destino.tipo === 'asentamiento' ? { tipo: 'asentamiento', id: origenId } : null
}

/** Busca la ruta entre origenId y destino; entre dos asentamientos, también en el sentido contrario. */
function buscarRuta(rutas: readonly Ruta[], origenId: Id, destino: DestinoRuta): Ruta | undefined {
  const directa = rutas.find((r) => r.origenId === origenId && mismoDestino(r.destino, destino))
  if (directa !== undefined) {
    return directa
  }
  const inverso = destinoInverso(origenId, destino)
  if (inverso === null) {
    return undefined
  }
  return rutas.find((r) => r.origenId === destino.id && mismoDestino(r.destino, inverso))
}

/** Días de viaje de ida; entre asentamientos vale en los dos sentidos; null si no hay ruta. */
export function diasDeViaje(estado: EstadoPartida, origenId: Id, destino: DestinoRuta): number | null {
  return buscarRuta(estado.rutas, origenId, destino)?.diasViaje ?? null
}

/** Crea, cambia (editadoEl) o, con null, quita la ruta; entre asentamientos la busca en los dos sentidos. */
export function guardarRuta<E extends EstadoPartida>(
  estado: E,
  origenId: Id,
  destino: DestinoRuta,
  diasViaje: number | null,
  sello: Sello,
): E {
  const existente = buscarRuta(estado.rutas, origenId, destino)
  if (diasViaje === null) {
    if (existente === undefined) {
      return estado
    }
    return { ...estado, rutas: estado.rutas.filter((r) => r !== existente) }
  }
  if (existente === undefined) {
    const ruta: Ruta = { origenId, destino, diasViaje }
    return { ...estado, rutas: [...estado.rutas, ruta] }
  }
  if (existente.diasViaje === diasViaje) {
    return estado
  }
  const rutas = estado.rutas.map((r) => (r === existente ? { ...existente, diasViaje, editadoEl: sello.ahora } : r))
  return { ...estado, rutas }
}

/** «Guardar como precio de Fornost»: crea o cambia el precio del recurso en el mercado. */
export function guardarPrecio<E extends EstadoPartida>(
  estado: E,
  mercadoId: Id,
  recursoId: Id,
  importe: Importe,
  sello: Sello,
): E {
  const mercado = buscarPorId(estado.mercados, mercadoId)
  const precios = mercado.precios.some((p) => p.recursoId === recursoId)
    ? mercado.precios.map((p) => (p.recursoId === recursoId ? { recursoId, importe } : p))
    : [...mercado.precios, { recursoId, importe }]
  const nuevo: Mercado = { ...mercado, precios }
  const mercados = reemplazarPorId(estado.mercados, nuevo, sello.ahora)
  return mercados === estado.mercados ? estado : { ...estado, mercados }
}

/** Caravanas de ese mercado que aún no han terminado (programadas o en ruta). */
function caravanasSinTerminar(estado: EstadoPartida, mercadoId: Id): number {
  return estado.caravanas.filter((c) => c.mercadoId === mercadoId && c.estado !== 'terminada').length
}

/** El local no se elimina; tampoco con caravanas en ruta o programadas (§6.4; D-059). */
export function bloqueoAlEliminarMercado(estado: EstadoPartida, id: Id): string | null {
  const mercado = buscarPorId(estado.mercados, id)
  if (mercado.localDe !== undefined) {
    return 'El mercado local no se puede eliminar'
  }
  const n = caravanasSinTerminar(estado, id)
  if (n === 0) {
    return null
  }
  return n === 1
    ? `${mercado.nombre} tiene 1 caravana sin terminar: espera a que vuelva o elimínala antes`
    : `${mercado.nombre} tiene ${n} caravanas sin terminar: espera a que vuelvan o elimínalas antes`
}

/** Borra el mercado, con sus precios, y sus rutas; las caravanas y entradas terminadas conservan el mercadoId. */
export function eliminarMercado<E extends EstadoPartida>(estado: E, id: Id): E {
  const bloqueo = bloqueoAlEliminarMercado(estado, id)
  if (bloqueo !== null) {
    throw new Error(bloqueo)
  }
  return {
    ...estado,
    mercados: estado.mercados.filter((m) => m.id !== id),
    rutas: estado.rutas.filter((r) => !(r.destino.tipo === 'mercado' && r.destino.id === id)),
  }
}
