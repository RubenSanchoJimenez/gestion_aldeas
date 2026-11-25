import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { ObjetoInventario } from '../modelo/personaje'
import { sinVacios } from './opcionales'
import { pergaminoDeObjeto } from './pergaminoObjeto'
import { quitarPergamino } from './pergaminos'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide el formulario «Objeto» (J3). */
export interface DatosObjeto {
  dominioId: Id
  nombre: string
  cantidad: number
  valorUnitario: ObjetoInventario['valorUnitario']
  ubicacion: ObjetoInventario['ubicacion']
  notas?: string
}

/** Lanza si faltan el nombre o la cantidad. */
function exigeValido(datos: Pick<DatosObjeto, 'nombre' | 'cantidad'>, minimo: number): void {
  if (datos.nombre.trim() === '') {
    throw new Error('Escribe un nombre')
  }
  if (!Number.isInteger(datos.cantidad) || datos.cantidad < minimo) {
    throw new Error(`La cantidad tiene que ser un número entero desde ${minimo}`)
  }
}

/** «Añadir objeto» (J3). */
export function crearObjeto<E extends EstadoPartida>(estado: E, datos: DatosObjeto, sello: Sello): Creado<E> {
  exigeValido(datos, 1)
  const id = sello.nuevoId()
  const objeto: ObjetoInventario = sinVacios({ id, ...datos })
  return { estado: { ...estado, objetos: [...estado.objetos, objeto] }, id }
}

/** Edita un objeto; el de un pergamino tiene siempre 1 unidad (§6.6). */
export function editarObjeto<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: Omit<DatosObjeto, 'dominioId'>,
  sello: Sello,
): E {
  const actual = buscarPorId(estado.objetos, id)
  const archivado = actual.archivado !== undefined
  exigeValido(datos, archivado ? 0 : 1)
  if (!archivado && datos.cantidad !== 1 && pergaminoDeObjeto(estado.pergaminos, id) !== undefined) {
    throw new Error('El objeto de un pergamino tiene siempre 1 unidad')
  }
  const copia = [...estado.objetos]
  const objetos = reemplazarPorId(copia, sinVacios({ ...actual, ...datos, notas: datos.notas }), sello.ahora)
  return objetos === copia ? estado : { ...estado, objetos }
}

/**
 * Elimina un objeto: sus ventas conservan el nombre y el valor, y si es de un pergamino se borra también el
 * pergamino (§6.4, «Al eliminar»). El movimiento que lo compró se conserva en el libro.
 */
export function eliminarObjeto<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.objetos, id)
  const pergamino = pergaminoDeObjeto(estado.pergaminos, id)
  if (pergamino !== undefined) {
    return quitarPergamino(estado, pergamino.id)
  }
  const ventas = estado.ventas.map((v) => {
    if (v.objetoId !== id) {
      return v
    }
    const suelta = { ...v }
    delete suelta.objetoId
    return suelta
  })
  return { ...estado, ventas, objetos: quitarPorId(estado.objetos, id) }
}
