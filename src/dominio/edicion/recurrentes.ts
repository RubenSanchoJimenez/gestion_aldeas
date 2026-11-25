import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { RecurrenteDinero } from '../modelo/movimientos'
import { sinVacios } from './opcionales'
import { buscarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide el formulario «Gasto e ingreso recurrente» (J5). */
export type DatosRecurrente = Omit<RecurrenteDinero, 'id' | 'editadoEl'>

export function crearRecurrente<E extends EstadoPartida>(estado: E, datos: DatosRecurrente, sello: Sello): Creado<E> {
  if (datos.concepto.trim() === '') {
    throw new Error('Escribe un concepto')
  }
  const id = sello.nuevoId()
  const regla: RecurrenteDinero = sinVacios({ id, ...datos, concepto: datos.concepto.trim() })
  return { estado: { ...estado, recurrentes: [...estado.recurrentes, regla] }, id }
}

/** Edita una regla: cambia las próximas ocurrencias; lo ya cobrado o pagado no se toca (§6.4). */
export function editarRecurrente<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: DatosRecurrente,
  sello: Sello,
): E {
  const actual = buscarPorId(estado.recurrentes, id)
  if (datos.concepto.trim() === '') {
    throw new Error('Escribe un concepto')
  }
  const nueva: RecurrenteDinero = sinVacios({
    ...actual,
    ...datos,
    concepto: datos.concepto.trim(),
    notas: datos.notas,
    unidadDiaria: datos.unidadDiaria,
  })
  const copia = [...estado.recurrentes]
  const recurrentes = reemplazarPorId(copia, nueva, sello.ahora)
  return recurrentes === copia ? estado : { ...estado, recurrentes }
}
