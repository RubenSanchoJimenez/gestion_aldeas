import * as z from 'zod'
import type { Id } from '../modelo/comunes'
import { EsquemaEstadoPartida, type EstadoPartida } from '../modelo/documento'
import { sinVacios } from './opcionales'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Las colecciones de registros sueltos: se dan de alta, se editan y se borran sin tocar nada más. */
export type Coleccion =
  | 'trabajadores'
  | 'unidadesGuarnicion'
  | 'defensas'
  | 'animales'
  | 'armeria'
  | 'impuestosRentas'
  | 'tiposLocal'
  | 'localesComerciales'
  | 'eventos'
  | 'mercados'

export type Registro<C extends Coleccion> = EstadoPartida[C][number]
export type DatosRegistro<C extends Coleccion> = Omit<Registro<C>, 'id' | 'editadoEl'>

/** Comprueba el registro con su esquema y lanza el primer problema, ya en castellano si lo trae. */
function exigeValido<C extends Coleccion>(coleccion: C, registro: unknown): Registro<C> {
  const resultado = (EsquemaEstadoPartida.shape[coleccion].element as z.ZodType).safeParse(registro)
  if (!resultado.success) {
    const problema = resultado.error.issues[0]
    const campo = problema.path.join('.')
    throw new Error(problema.code === 'custom' ? problema.message : `Revisa el campo «${campo}»`)
  }
  return registro as Registro<C>
}

export function crearRegistro<E extends EstadoPartida, C extends Coleccion>(
  estado: E,
  coleccion: C,
  datos: DatosRegistro<C>,
  sello: Sello,
): Creado<E> {
  const id = sello.nuevoId()
  const registro = exigeValido(coleccion, sinVacios({ id, ...datos }))
  return { estado: { ...estado, [coleccion]: [...estado[coleccion], registro] }, id }
}

/** Edita un registro; sin cambios devuelve el mismo estado. */
export function editarRegistro<E extends EstadoPartida, C extends Coleccion>(
  estado: E,
  coleccion: C,
  id: Id,
  datos: Partial<DatosRegistro<C>>,
  sello: Sello,
): E {
  const lista = estado[coleccion] as Registro<C>[]
  const actual = buscarPorId(lista, id)
  const nuevo = exigeValido(coleccion, sinVacios({ ...actual, ...datos }))
  const copia = [...lista]
  const siguiente = reemplazarPorId(copia, nuevo, sello.ahora)
  return siguiente === copia ? estado : { ...estado, [coleccion]: siguiente }
}

/** Borra un registro sin efectos sobre los demás: defensas, animales y armería. */
export function quitarRegistro<E extends EstadoPartida>(
  estado: E,
  coleccion: 'defensas' | 'animales' | 'armeria',
  id: Id,
): E {
  return { ...estado, [coleccion]: quitarPorId(estado[coleccion] as { id: Id }[], id) }
}
