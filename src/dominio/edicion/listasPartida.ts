import type { Id, UbicacionObjeto } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { esNombreReservado, mismoNombre } from '../texto/normalizar'
import { buscarPorId, quitarPorId, reemplazarPorId, type Sello } from './registros'

type Lista = 'personas' | 'ubicaciones'

/** Renombra una persona o una ubicación: los registros guardan el id, así que todos cambian (§6.6, patrón 5). */
export function renombrarDeLista<E extends EstadoPartida>(
  estado: E,
  lista: Lista,
  id: Id,
  nombre: string,
  sello: Sello,
): E {
  const limpio = nombre.trim()
  if (limpio.length < 2 || limpio.length > 60) {
    throw new Error('El nombre tiene que tener de 2 a 60 caracteres')
  }
  if (esNombreReservado(limpio)) {
    throw new Error('Ese nombre lo usa el filtro')
  }
  if (estado[lista].some((r) => r.id !== id && mismoNombre(r.nombre, limpio))) {
    throw new Error(`Ya existe «${limpio}»`)
  }
  const copia = [...estado[lista]]
  const nueva = reemplazarPorId(copia, { ...buscarPorId(copia, id), nombre: limpio }, sello.ahora)
  return nueva === copia ? estado : { ...estado, [lista]: nueva }
}

/** Cuántos registros usan a una persona: los que la necesitan y los que la llevan como dato opcional. */
export function usosDePersona(estado: EstadoPartida, id: Id): { obligatorios: number; opcionales: number } {
  return {
    obligatorios: estado.deudas.filter((d) => d.contraparteId === id).length,
    opcionales:
      estado.ventas.filter((v) => v.compradorId === id).length +
      estado.impuestosRentas.filter((i) => i.destinatarioId === id).length +
      estado.localesComerciales.filter((l) => l.titularId === id).length,
  }
}

/** Pone otra persona donde estaba esa, o quita el dato opcional si no hay reemplazo. */
function conPersona<T>(registro: T, campo: keyof T, id: Id, reemplazo: Id | undefined): T {
  if (registro[campo] !== id) {
    return registro
  }
  const nuevo = { ...registro }
  if (reemplazo === undefined) {
    delete nuevo[campo]
  } else {
    nuevo[campo] = reemplazo as T[keyof T]
  }
  return nuevo
}

/** Elimina una persona. Con deudas, el reemplazo es obligatorio. */
export function eliminarPersona<E extends EstadoPartida>(estado: E, id: Id, reemplazo: Id | undefined): E {
  if (usosDePersona(estado, id).obligatorios > 0 && reemplazo === undefined) {
    throw new Error('Elige a quién pasan sus deudas')
  }
  return {
    ...estado,
    personas: quitarPorId(estado.personas, id),
    deudas: estado.deudas.map((d) => conPersona(d, 'contraparteId', id, reemplazo)),
    ventas: estado.ventas.map((v) => conPersona(v, 'compradorId', id, reemplazo)),
    impuestosRentas: estado.impuestosRentas.map((i) => conPersona(i, 'destinatarioId', id, reemplazo)),
    localesComerciales: estado.localesComerciales.map((l) => conPersona(l, 'titularId', id, reemplazo)),
  }
}

const estaEn = (u: UbicacionObjeto, id: Id): boolean => u.tipo === 'propia' && u.ubicacionId === id

export function usosDeUbicacion(estado: EstadoPartida, id: Id): number {
  return (
    estado.objetos.filter((o) => estaEn(o.ubicacion, id)).length +
    estado.movimientos.filter((m) => m.objetoPendiente !== undefined && estaEn(m.objetoPendiente.ubicacion, id)).length
  )
}

/** Elimina una ubicación; si tiene objetos, hay que decir dónde pasan. El patrimonio no cambia. */
export function eliminarUbicacion<E extends EstadoPartida>(
  estado: E,
  id: Id,
  destino: UbicacionObjeto | undefined,
): E {
  if (usosDeUbicacion(estado, id) > 0 && destino === undefined) {
    throw new Error('Elige dónde pasan sus objetos')
  }
  const mover = (u: UbicacionObjeto): UbicacionObjeto => (estaEn(u, id) && destino !== undefined ? destino : u)
  return {
    ...estado,
    ubicaciones: quitarPorId(estado.ubicaciones, id),
    objetos: estado.objetos.map((o) => (estaEn(o.ubicacion, id) ? { ...o, ubicacion: mover(o.ubicacion) } : o)),
    movimientos: estado.movimientos.map((m) =>
      m.objetoPendiente !== undefined && estaEn(m.objetoPendiente.ubicacion, id)
        ? { ...m, objetoPendiente: { ...m.objetoPendiente, ubicacion: mover(m.objetoPendiente.ubicacion) } }
        : m,
    ),
  }
}
