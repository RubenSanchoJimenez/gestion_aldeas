import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { EfectoEvento, EventoNarrativo } from '../modelo/eventos'
import type { DetalleTrabajo, Movimiento, ReglaOrigen } from '../modelo/movimientos'
import { buscarPorId, quitarPorId, reemplazarPorId, type Sello } from './registros'

/**
 * Quita la regla a los movimientos que cumplen `deLaRegla`: quedan como gasto o ingreso suelto (§6.4 l.782).
 * Es un efecto del borrado, así que no pone editadoEl (T31). La misma lista si no había ninguno.
 */
function soltarMovimientos(movimientos: Movimiento[], deLaRegla: (regla: ReglaOrigen) => boolean): Movimiento[] {
  const apunta = (m: Movimiento): boolean => m.regla !== undefined && deLaRegla(m.regla)
  if (!movimientos.some(apunta)) {
    return movimientos
  }
  return movimientos.map((m) => {
    if (!apunta(m)) {
      return m
    }
    const suelto = { ...m }
    delete suelto.regla
    return suelto
  })
}

/**
 * Quita el origenId de la fila borrada en los pagos agrupados de salarios o de soldadas: la entrada conserva su
 * nombre, su número y lo pagado, y el movimiento sigue siendo del asentamiento (D-035; T31, sin editadoEl).
 */
function soltarDetalle(movimientos: Movimiento[], tipo: 'salarios' | 'soldadas', origenId: Id): Movimiento[] {
  const deLaFila = (d: DetalleTrabajo): boolean => d.origenId === origenId
  const apunta = (m: Movimiento): boolean => m.regla?.tipo === tipo && (m.detalleTrabajo ?? []).some(deLaFila)
  if (!movimientos.some(apunta)) {
    return movimientos
  }
  return movimientos.map((m) => {
    if (!apunta(m) || m.detalleTrabajo === undefined) {
      return m
    }
    const detalleTrabajo = m.detalleTrabajo.map((d) => {
      if (!deLaFila(d)) {
        return d
      }
      const sinOrigen = { ...d }
      delete sinOrigen.origenId
      return sinOrigen
    })
    return { ...m, detalleTrabajo }
  })
}

/** Si un efecto de evento apunta a ese impuesto o renta. */
function apuntaAlImpuesto(efecto: EfectoEvento, impuestoId: Id): boolean {
  return efecto.objetivo.tipo === 'impuesto' && efecto.objetivo.id === impuestoId
}

/**
 * Quita de los eventos los efectos que apuntan a un impuesto borrado, como se hace con los de un edificio
 * (§6.4, «Al eliminar»). El evento se queda, con sus demás efectos (T31, sin editadoEl).
 */
function sinEfectosSobre(eventos: EventoNarrativo[], impuestoId: Id): EventoNarrativo[] {
  const apunta = (e: EventoNarrativo): boolean => e.efectos.some((ef) => apuntaAlImpuesto(ef, impuestoId))
  if (!eventos.some(apunta)) {
    return eventos
  }
  return eventos.map((e) =>
    apunta(e) ? { ...e, efectos: e.efectos.filter((ef) => !apuntaAlImpuesto(ef, impuestoId)) } : e,
  )
}

/** Interruptor «Activo / En pausa» de J5: guarda al instante y pone editadoEl (§6.4 l.849; D-037). */
export function cambiarActivo<E extends EstadoPartida>(estado: E, recurrenteId: Id, activo: boolean, sello: Sello): E {
  const actual = buscarPorId(estado.recurrentes, recurrenteId)
  const recurrentes = reemplazarPorId(estado.recurrentes, { ...actual, activo }, sello.ahora)
  return recurrentes === estado.recurrentes ? estado : { ...estado, recurrentes }
}

/** Elimina un gasto o ingreso recurrente: sus movimientos quedan sueltos, sin regla (§6.4 l.782). */
export function eliminarRecurrente<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.recurrentes, id)
  return {
    ...estado,
    movimientos: soltarMovimientos(estado.movimientos, (r) => r.tipo === 'recurrente' && r.id === id),
    recurrentes: quitarPorId(estado.recurrentes, id),
  }
}

/**
 * Elimina un impuesto, renta o tributo: sus movimientos quedan sueltos, sin regla (§6.4 l.782; D-036), y los
 * eventos pierden los efectos que lo apuntaban. Sus deudas de impago se quedan (T5).
 */
export function eliminarImpuestoRenta<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.impuestosRentas, id)
  return {
    ...estado,
    movimientos: soltarMovimientos(
      estado.movimientos,
      (r) => (r.tipo === 'impuesto' || r.tipo === 'tributo') && r.id === id,
    ),
    impuestosRentas: quitarPorId(estado.impuestosRentas, id),
    eventos: sinEfectosSobre(estado.eventos, id),
  }
}

/** Elimina una fila de trabajadores: su entrada en los pagos agrupados pierde origenId y conserva el nombre (D-035). */
export function eliminarTrabajador<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.trabajadores, id)
  return {
    ...estado,
    movimientos: soltarDetalle(estado.movimientos, 'salarios', id),
    trabajadores: quitarPorId(estado.trabajadores, id),
  }
}

/** Elimina una unidad de la guarnición, igual que un trabajador (D-035). */
export function eliminarUnidadGuarnicion<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.unidadesGuarnicion, id)
  return {
    ...estado,
    movimientos: soltarDetalle(estado.movimientos, 'soldadas', id),
    unidadesGuarnicion: quitarPorId(estado.unidadesGuarnicion, id),
  }
}
