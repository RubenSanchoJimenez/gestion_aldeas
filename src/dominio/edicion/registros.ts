import type { Id, Instante } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { NuevoId } from '../motor/tipos'

/** Lo que necesita una edición del mundo exterior: la hora y los ids nuevos (T13). */
export interface Sello {
  ahora: Instante
  nuevoId: NuevoId
}

/** Lo que devuelve un alta: el estado nuevo y el id creado. */
export interface Creado<E> {
  estado: E
  id: Id
}

/**
 * Igualdad a fondo de los valores del documento (objetos, listas y valores sueltos). Un campo que no está y uno
 * con `undefined` cuentan igual, porque un campo opcional puede llegar de las dos formas.
 */
function iguales(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => iguales(v, b[i]))
  }
  const x = a as Record<string, unknown>
  const y = b as Record<string, unknown>
  const claves = new Set([...Object.keys(x), ...Object.keys(y)])
  for (const clave of claves) {
    if (!iguales(x[clave], y[clave])) {
      return false
    }
  }
  return true
}

/** El registro sin su `editadoEl`; lo que no es un objeto, tal cual. */
function sinEditadoEl(valor: unknown): unknown {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return valor
  }
  const copia: Record<string, unknown> = { ...(valor as Record<string, unknown>) }
  delete copia.editadoEl
  return copia
}

/** Si dos registros son iguales sin mirar editadoEl (regla pendiente 1 de la fase 2). */
export function mismoRegistro(a: unknown, b: unknown): boolean {
  return iguales(sinEditadoEl(a), sinEditadoEl(b))
}

/** El registro con ese id; lanza «No existe «id»» si no está, que es un error de programación. */
export function buscarPorId<T extends { id: Id }>(lista: readonly T[], id: Id): T {
  const registro = lista.find((r) => r.id === id)
  if (registro === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  return registro
}

/** Sustituye por id: si no cambia nada devuelve la misma lista; si cambia, sella editadoEl = ahora. */
export function reemplazarPorId<T extends { id: Id; editadoEl?: Instante }>(lista: T[], nuevo: T, ahora: Instante): T[] {
  const anterior = buscarPorId(lista, nuevo.id)
  if (mismoRegistro(anterior, nuevo)) {
    return lista
  }
  return lista.map((r) => (r === anterior ? { ...nuevo, editadoEl: ahora } : r))
}

/** Quita por id; la misma lista si no estaba. */
export function quitarPorId<T extends { id: Id }>(lista: T[], id: Id): T[] {
  return lista.some((r) => r.id === id) ? lista.filter((r) => r.id !== id) : lista
}

/** Suma 1 a cambiosDesdeUltimoAvance: una vez por guardado que cambia algo (D-038). */
export function contarCambio<E extends EstadoPartida>(estado: E): E {
  return {
    ...estado,
    partida: { ...estado.partida, cambiosDesdeUltimoAvance: estado.partida.cambiosDesdeUltimoAvance + 1 },
  }
}
