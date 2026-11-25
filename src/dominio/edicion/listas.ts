import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { errorDeNombre } from '../partidas/textos'
import { esNombreReservado, mismoNombre } from '../texto/normalizar'
import { buscarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Un nombre de las listas de la partida: de 2 a 60 letras y no reservado (§6.6, reglas comunes). */
function exigeNombreDeLista(nombre: string): string {
  const limpio = nombre.trim()
  if (limpio.length < 2 || limpio.length > 60) {
    throw new Error('El nombre tiene que tener de 2 a 60 caracteres')
  }
  if (esNombreReservado(limpio)) {
    throw new Error(`«${limpio}» es un nombre reservado`)
  }
  return limpio
}

/** El id de la persona o entidad con ese nombre; si no existe, la crea (§6.6, «nombre nuevo en el campo»). */
export function personaPorNombre<E extends EstadoPartida>(estado: E, nombre: string, sello: Sello): Creado<E> {
  const existente = estado.personas.find((p) => mismoNombre(p.nombre, nombre))
  if (existente !== undefined) {
    return { estado, id: existente.id }
  }
  const limpio = exigeNombreDeLista(nombre)
  const id = sello.nuevoId()
  return { estado: { ...estado, personas: [...estado.personas, { id, nombre: limpio }] }, id }
}

/** El id de la ubicación propia con ese nombre; si no existe, la crea. */
export function ubicacionPorNombre<E extends EstadoPartida>(estado: E, nombre: string, sello: Sello): Creado<E> {
  const existente = estado.ubicaciones.find((u) => mismoNombre(u.nombre, nombre))
  if (existente !== undefined) {
    return { estado, id: existente.id }
  }
  const limpio = exigeNombreDeLista(nombre)
  const id = sello.nuevoId()
  return { estado: { ...estado, ubicaciones: [...estado.ubicaciones, { id, nombre: limpio }] }, id }
}

/** «Editar» personaje (J1): nombre y descripción. */
export function editarPersonaje<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: { nombre: string; descripcion: string },
  sello: Sello,
): E {
  const actual = buscarPorId(estado.dominios, id)
  if (actual.tipo !== 'personaje') {
    throw new Error('Ese dominio no es el personaje')
  }
  const error = errorDeNombre(datos.nombre)
  if (error !== null) {
    throw new Error(error)
  }
  const descripcion = datos.descripcion.trim()
  const nuevo = { ...actual, nombre: datos.nombre.trim() }
  if (descripcion === '') {
    delete nuevo.descripcion
  } else {
    nuevo.descripcion = descripcion
  }
  const copia = [...estado.dominios]
  const dominios = reemplazarPorId(copia, nuevo, sello.ahora)
  return dominios === copia ? estado : { ...estado, dominios }
}
