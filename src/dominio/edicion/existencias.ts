import { cabenMas, esCero, formatearCantidad, textoCaben } from '../almacen/cantidades'
import { formatearDiaCercano } from '../calendario/formatoFecha'
import { RECURSO } from '../catalogo/inicial'
import type { AjusteExistencias, Existencia } from '../modelo/almacen'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { minusculaInicial, recursoDelCatalogo } from '../motor/textos'
import type { Sello } from './registros'

/** Cómo se nombra el estado de un edificio que no está activo, en «Cantera produce piedra (estado: …)». */
const ESTADO_EDIFICIO_TEXTO: Readonly<Record<'daniado' | 'inactivo' | 'alquilado', string>> = {
  daniado: 'Dañado',
  inactivo: 'Inactivo',
  alquilado: 'Alquilado',
}

/** La fila, o undefined si el almacén no la tiene. */
function filaEn(estado: EstadoPartida, dominioId: Id, recursoId: Id): Existencia | undefined {
  return estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
}

/** La fila, creada con cantidad 0 y sin capacidad si no está (D-056); el mismo estado si ya estaba. */
export function asegurarFila<E extends EstadoPartida>(estado: E, dominioId: Id, recursoId: Id): E {
  if (filaEn(estado, dominioId, recursoId) !== undefined) {
    return estado
  }
  return { ...estado, existencias: [...estado.existencias, { dominioId, recursoId, cantidad: 0 }] }
}

/** Lo que cambia el formulario «Recurso y ajuste de existencias» (§6.4 l.685). */
export interface CambiosExistencia {
  /** Si cambia, se anota un AjusteExistencias con la diferencia, la fecha de hoy y el motivo. */
  cantidad?: number
  /** null = sin capacidad. */
  capacidad?: number | null
  motivo?: string
}

/** La fila con los cambios aplicados, sin la clave `capacidad` si queda sin límite (§4). */
function filaConCambios(anterior: Existencia, cantidad: number, capacidad: number | undefined, ahora: string): Existencia {
  const base = { dominioId: anterior.dominioId, recursoId: anterior.recursoId, cantidad, editadoEl: ahora }
  return capacidad === undefined ? base : { ...base, capacidad }
}

/**
 * Cambia la cantidad, la capacidad o el motivo de una fila (asegurándola primero, D-056). cantidad < 0 → «Las
 * existencias no pueden quedar por debajo de 0»; cantidad cambiada sin motivo → «El ajuste necesita un motivo»;
 * si la cantidad nueva pasa de la capacidad (la nueva, o la de antes si no cambia): si cambió la cantidad,
 * textoCaben(cabenMas(fila de antes)); si solo bajó la capacidad, «Las existencias no pueden superar la
 * capacidad». Sin cambios, la misma referencia.
 */
export function editarExistencia<E extends EstadoPartida>(
  estado: E,
  dominioId: Id,
  recursoId: Id,
  cambios: CambiosExistencia,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): E {
  const base = asegurarFila(estado, dominioId, recursoId)
  const anterior = filaEn(base, dominioId, recursoId)
  if (anterior === undefined) {
    throw new Error(`No existe «${dominioId}|${recursoId}»`)
  }

  const cantidadCambia = cambios.cantidad !== undefined && cambios.cantidad !== anterior.cantidad
  const nuevaCantidad = cambios.cantidad ?? anterior.cantidad
  if (nuevaCantidad < 0) {
    throw new Error('Las existencias no pueden quedar por debajo de 0')
  }
  if (cantidadCambia && (cambios.motivo === undefined || cambios.motivo.trim() === '')) {
    throw new Error('El ajuste necesita un motivo')
  }

  const nuevaCapacidad = cambios.capacidad === undefined ? anterior.capacidad : (cambios.capacidad ?? undefined)
  const capacidadCambia = nuevaCapacidad !== anterior.capacidad

  if (nuevaCapacidad !== undefined && nuevaCantidad > nuevaCapacidad) {
    if (cantidadCambia) {
      throw new Error(textoCaben(cabenMas(anterior) ?? 0, recursoDelCatalogo(catalogo, recursoId)))
    }
    throw new Error('Las existencias no pueden superar la capacidad')
  }

  if (!cantidadCambia && !capacidadCambia) {
    return base
  }

  const nuevaFila = filaConCambios(anterior, nuevaCantidad, nuevaCapacidad, sello.ahora)
  const existencias = base.existencias.map((e) => (e.dominioId === dominioId && e.recursoId === recursoId ? nuevaFila : e))

  let ajustesExistencias = base.ajustesExistencias
  if (cantidadCambia) {
    const ajuste: AjusteExistencias = {
      id: sello.nuevoId(),
      dominioId,
      recursoId,
      fecha: base.partida.fechaActual,
      delta: nuevaCantidad - anterior.cantidad,
      motivo: cambios.motivo as string,
    }
    ajustesExistencias = [...ajustesExistencias, ajuste]
  }

  return { ...base, existencias, ajustesExistencias }
}

/** Deshace su cantidad (D-059) con los bloqueos de D-058; si la fila ya no existe, solo borra el ajuste. */
export function eliminarAjuste<E extends EstadoPartida>(estado: E, id: Id, catalogo: CatalogosEnCopia): E {
  const ajuste = estado.ajustesExistencias.find((a) => a.id === id)
  if (ajuste === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  const ajustesExistencias = estado.ajustesExistencias.filter((a) => a.id !== id)
  const fila = filaEn(estado, ajuste.dominioId, ajuste.recursoId)
  if (fila === undefined) {
    return { ...estado, ajustesExistencias }
  }
  const nuevaCantidad = fila.cantidad - ajuste.delta
  if (nuevaCantidad < 0) {
    throw new Error('Las existencias no pueden quedar por debajo de 0')
  }
  if (fila.capacidad !== undefined && nuevaCantidad > fila.capacidad) {
    throw new Error(textoCaben(cabenMas(fila) ?? 0, recursoDelCatalogo(catalogo, ajuste.recursoId)))
  }
  const existencias = estado.existencias.map((e) => (e === fila ? { ...fila, cantidad: nuevaCantidad } : e))
  return { ...estado, existencias, ajustesExistencias }
}

/** El primer motivo, en este orden: víveres, existencias, producción, consumo, obra sin terminar, caravana sin terminar, entrada sin aplicar; o null (§6.4 l.791; D-059). */
export function bloqueoAlEliminarFila(
  estado: EstadoPartida,
  dominioId: Id,
  recursoId: Id,
  catalogo: CatalogosEnCopia,
): string | null {
  if (recursoId === RECURSO.viveres) {
    return 'Los víveres no se pueden quitar del almacén'
  }
  const fila = filaEn(estado, dominioId, recursoId)
  if (fila !== undefined && !esCero(fila.cantidad)) {
    return `Solo se quita una fila sin existencias: quedan ${formatearCantidad(fila.cantidad, recursoDelCatalogo(catalogo, recursoId))}`
  }
  const edificioQueProduce = estado.edificios.find(
    (e) => e.dominioId === dominioId && e.producciones.some((p) => p.recursoId === recursoId),
  )
  if (edificioQueProduce !== undefined) {
    const sufijo =
      edificioQueProduce.estado === 'activo' ? '' : ` (estado: ${ESTADO_EDIFICIO_TEXTO[edificioQueProduce.estado]})`
    const nombreRecurso = minusculaInicial(recursoDelCatalogo(catalogo, recursoId).nombre)
    return `${edificioQueProduce.nombre} produce ${nombreRecurso}${sufijo}`
  }
  for (const poblacion of estado.poblaciones) {
    if (poblacion.dominioId !== dominioId) {
      continue
    }
    const consumo = poblacion.consumos.find((c) => c.recursoId === recursoId)
    if (consumo !== undefined) {
      return `El consumo «${consumo.nombre}» descuenta de esta fila`
    }
  }
  const obraQueNecesita = estado.obras.find(
    (o) =>
      o.dominioId === dominioId &&
      o.estado !== 'terminada' &&
      (Object.hasOwn(o.materiales, recursoId) ||
        (o.efecto.tipo === 'ampliarAlmacen' && o.efecto.recursoId === recursoId)),
  )
  if (obraQueNecesita !== undefined) {
    return `La obra «${obraQueNecesita.nombre}» necesita esta fila`
  }
  const caravanaQueNecesita = estado.caravanas.find(
    (c) =>
      c.estado !== 'terminada' &&
      c.carga.recursoId === recursoId &&
      (c.dominioId === dominioId || c.destinoId === dominioId),
  )
  if (caravanaQueNecesita !== undefined) {
    const destino =
      caravanaQueNecesita.operacion === 'traslado'
        ? (estado.dominios.find((d) => d.id === caravanaQueNecesita.destinoId)?.nombre ?? (caravanaQueNecesita.destinoId ?? ''))
        : (estado.mercados.find((m) => m.id === caravanaQueNecesita.mercadoId)?.nombre ?? (caravanaQueNecesita.mercadoId ?? ''))
    return `La caravana de ${caravanaQueNecesita.operacion} a ${destino} necesita esta fila`
  }
  const entradaQueNecesita = estado.entradasAlmacen.find(
    (e) => !e.aplicada && e.dominioId === dominioId && e.recursoId === recursoId,
  )
  if (entradaQueNecesita !== undefined) {
    return `La compra o recepción del ${formatearDiaCercano(entradaQueNecesita.fecha, estado.partida.fechaActual)} necesita esta fila`
  }
  return null
}

/** Quita la fila si no hay bloqueo (§6.4 l.791); lanza el bloqueo si lo hay. */
export function eliminarFila<E extends EstadoPartida>(estado: E, dominioId: Id, recursoId: Id, catalogo: CatalogosEnCopia): E {
  const bloqueo = bloqueoAlEliminarFila(estado, dominioId, recursoId, catalogo)
  if (bloqueo !== null) {
    throw new Error(bloqueo)
  }
  const existencias = estado.existencias.filter((e) => !(e.dominioId === dominioId && e.recursoId === recursoId))
  return { ...estado, existencias }
}
