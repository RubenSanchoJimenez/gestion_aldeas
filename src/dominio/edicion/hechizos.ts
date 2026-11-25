import { compararFechas, type Fecha } from '../calendario/fecha'
import { formatearDiaCercano } from '../calendario/formatoFecha'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Hechizo, IntentoAprendizaje, ObjetoInventario, Pergamino } from '../modelo/personaje'
import { mismoNombre } from '../texto/normalizar'
import { sinVacios } from './opcionales'
import { conEstadoDePergamino, nombreDeObjetoPergamino, objetoSegunPergamino } from './pergaminoObjeto'
import { buscarPorId, contarCambio, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide el formulario «Hechizo» (§6.6). */
export interface DatosHechizo {
  dominioId: Id
  nombre: string
  lista?: string
  reino?: Hechizo['reino']
  nivel?: number
  estado: Hechizo['estado']
  aprendidoEl?: Fecha
  notas?: string
}

/** Cuántos intentos buenos y malos lleva un hechizo, y la fecha del último (J1, J7). */
export interface ConteoDeIntentos {
  buenos: number
  malos: number
  ultimo?: Fecha
}

export function conteoDeIntentos(estado: EstadoPartida, hechizoId: Id): ConteoDeIntentos {
  const conteo: ConteoDeIntentos = { buenos: 0, malos: 0 }
  for (const intento of estado.intentos) {
    if (intento.hechizoId !== hechizoId) {
      continue
    }
    if (intento.resultado === 'bueno') {
      conteo.buenos += 1
    } else {
      conteo.malos += 1
    }
    if (conteo.ultimo === undefined || compararFechas(intento.fecha, conteo.ultimo) > 0) {
      conteo.ultimo = intento.fecha
    }
  }
  return conteo
}

/** Las reglas del formulario: nombre único y las tres de «Aprendido el» (§7, «Estudio»). */
function exigeValido(estado: EstadoPartida, datos: Omit<DatosHechizo, 'dominioId'>, propio?: Id): string {
  const nombre = datos.nombre.trim()
  if (nombre.length < 2 || nombre.length > 60) {
    throw new Error('El nombre tiene que tener de 2 a 60 caracteres')
  }
  const otro = estado.hechizos.find((h) => h.id !== propio && mismoNombre(h.nombre, nombre))
  if (otro !== undefined) {
    throw new Error(
      `Ya existe «${otro.nombre}». Si es de otra lista, añádela al nombre: «Luz (Caminos de la luz)».`,
    )
  }
  if (datos.estado === 'aprendido') {
    const hoy = estado.partida.fechaActual
    if (datos.aprendidoEl === undefined) {
      throw new Error('Indica cuándo lo aprendió')
    }
    if (compararFechas(datos.aprendidoEl, hoy) > 0) {
      throw new Error('«Aprendido el» no puede ser posterior a hoy')
    }
    const ultimo = propio === undefined ? undefined : conteoDeIntentos(estado, propio).ultimo
    if (ultimo !== undefined && compararFechas(datos.aprendidoEl, ultimo) < 0) {
      throw new Error(`El último intento es del ${formatearDiaCercano(ultimo, hoy)}`)
    }
  }
  return nombre
}

/** Lo que se guarda: «Aprendido el» solo con «Aprendido». */
function registro(id: Id, dominioId: Id, nombre: string, datos: Omit<DatosHechizo, 'dominioId'>): Hechizo {
  return sinVacios({
    id,
    dominioId,
    nombre,
    lista: datos.lista,
    reino: datos.reino,
    nivel: datos.nivel,
    estado: datos.estado,
    aprendidoEl: datos.estado === 'aprendido' ? datos.aprendidoEl : undefined,
    notas: datos.notas,
  })
}

export function crearHechizo<E extends EstadoPartida>(estado: E, datos: DatosHechizo, sello: Sello): Creado<E> {
  const nombre = exigeValido(estado, datos)
  const id = sello.nuevoId()
  const hechizo = registro(id, datos.dominioId, nombre, datos)
  return { estado: contarCambio({ ...estado, hechizos: [...estado.hechizos, hechizo] }), id }
}

/** Edita un hechizo; al renombrarlo cambian sus pergaminos y los objetos que aún llevan el nombre viejo (§7). */
export function editarHechizo<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: Omit<DatosHechizo, 'dominioId'>,
  sello: Sello,
): E {
  const actual = buscarPorId(estado.hechizos, id)
  const nombre = exigeValido(estado, datos, id)
  const nuevo: Hechizo = {
    ...registro(id, actual.dominioId, nombre, datos),
    ...(actual.editadoEl === undefined ? {} : { editadoEl: actual.editadoEl }),
  }
  const copia = [...estado.hechizos]
  const hechizos = reemplazarPorId(copia, nuevo, sello.ahora)
  if (hechizos === copia) {
    return estado
  }
  let pergaminos = estado.pergaminos
  let objetos = estado.objetos
  if (nombre !== actual.nombre) {
    for (const pergamino of estado.pergaminos.filter((p) => p.hechizoId === id)) {
      pergaminos = reemplazarPorId(pergaminos, { ...pergamino, nombre }, sello.ahora)
      const objeto = objetos.find((o) => o.id === pergamino.objetoInventarioId)
      if (objeto !== undefined && objeto.nombre === nombreDeObjetoPergamino(pergamino.nombre)) {
        objetos = reemplazarPorId(objetos, { ...objeto, nombre: nombreDeObjetoPergamino(nombre) }, sello.ahora)
      }
    }
  }
  return contarCambio({ ...estado, hechizos, pergaminos, objetos })
}

/** Borra el hechizo y sus intentos; sus pergaminos se conservan sin hechizo (decidido por el usuario). */
export function eliminarHechizo<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.hechizos, id)
  const pergaminos = estado.pergaminos.map((p) => {
    if (p.hechizoId !== id) {
      return p
    }
    const suelto = { ...p }
    delete suelto.hechizoId
    return suelto
  })
  return contarCambio({
    ...estado,
    pergaminos,
    intentos: estado.intentos.filter((i) => i.hechizoId !== id),
    hechizos: quitarPorId(estado.hechizos, id),
  })
}

/** Lo que pide J8. */
export interface DatosIntento {
  hechizoId: Id
  fecha: Fecha
  resultado: IntentoAprendizaje['resultado']
  pergaminoId?: Id
  pergaminoConsumido: boolean
  notas?: string
}

/** Pone un pergamino como consumido en esa fecha, o lo devuelve a «poseído», con su objeto. */
function ponerConsumido<E extends EstadoPartida>(
  estado: E,
  pergaminoId: Id,
  consumidoEl: Fecha | undefined,
  sello: Sello,
): E {
  const actual = buscarPorId(estado.pergaminos, pergaminoId)
  const estadoNuevo: Pergamino['estado'] = consumidoEl === undefined ? 'poseido' : 'consumido'
  const pergaminos = reemplazarPorId(
    estado.pergaminos,
    conEstadoDePergamino(actual, estadoNuevo, consumidoEl),
    sello.ahora,
  )
  let objetos: ObjetoInventario[] = estado.objetos
  if (actual.objetoInventarioId !== undefined) {
    const objeto = buscarPorId(estado.objetos, actual.objetoInventarioId)
    objetos = reemplazarPorId(objetos, objetoSegunPergamino(objeto, estadoNuevo), sello.ahora)
  }
  return { ...estado, pergaminos, objetos }
}

/** Las reglas de J8: fecha de hoy o antes y, con el hechizo aprendido, no posterior a «Aprendido el». */
function exigeIntentoValido(estado: EstadoPartida, datos: DatosIntento, anterior?: IntentoAprendizaje): void {
  const hechizo = buscarPorId(estado.hechizos, datos.hechizoId)
  if (compararFechas(datos.fecha, estado.partida.fechaActual) > 0) {
    throw new Error('La fecha del intento no puede ser posterior a hoy')
  }
  if (hechizo.estado === 'aprendido') {
    if (anterior?.hechizoId !== datos.hechizoId) {
      throw new Error(`«${hechizo.nombre}» está aprendido`)
    }
    if (hechizo.aprendidoEl !== undefined && compararFechas(datos.fecha, hechizo.aprendidoEl) > 0) {
      throw new Error('La fecha no puede ser posterior a «Aprendido el»')
    }
  }
}

/** Consume el pergamino de un intento nuevo o editado, si así se pide. */
function aplicarPergamino<E extends EstadoPartida>(estado: E, datos: DatosIntento, sello: Sello): E {
  if (!datos.pergaminoConsumido) {
    return estado
  }
  if (datos.pergaminoId === undefined) {
    throw new Error('Elige el pergamino que se consume')
  }
  if (buscarPorId(estado.pergaminos, datos.pergaminoId).estado !== 'poseido') {
    throw new Error('Ese pergamino no está en tu poder')
  }
  return ponerConsumido(estado, datos.pergaminoId, datos.fecha, sello)
}

/** Devuelve a «poseído» el pergamino que consumió un intento. */
function devolverPergamino<E extends EstadoPartida>(estado: E, intento: IntentoAprendizaje, sello: Sello): E {
  return intento.pergaminoConsumido && intento.pergaminoId !== undefined
    ? ponerConsumido(estado, intento.pergaminoId, undefined, sello)
    : estado
}

export function registrarIntento<E extends EstadoPartida>(estado: E, datos: DatosIntento, sello: Sello): Creado<E> {
  exigeIntentoValido(estado, datos)
  const id = sello.nuevoId()
  const base = aplicarPergamino(estado, datos, sello)
  const intento: IntentoAprendizaje = sinVacios({ id, ...datos })
  return { estado: contarCambio({ ...base, intentos: [...base.intentos, intento] }), id }
}

/** Edita un intento (J8): primero deshace lo que consumió y después aplica lo nuevo. */
export function editarIntento<E extends EstadoPartida>(estado: E, id: Id, datos: DatosIntento, sello: Sello): E {
  const actual = buscarPorId(estado.intentos, id)
  exigeIntentoValido(estado, datos, actual)
  const nuevo: IntentoAprendizaje = sinVacios({ ...actual, ...datos, pergaminoId: datos.pergaminoId, notas: datos.notas })
  if (nuevo.pergaminoId !== undefined) {
    delete nuevo.pergaminoEliminado
  }
  const copia = [...estado.intentos]
  const intentos = reemplazarPorId(copia, nuevo, sello.ahora)
  if (intentos === copia) {
    return estado
  }
  const base = aplicarPergamino(devolverPergamino(estado, actual, sello), datos, sello)
  return contarCambio({ ...base, intentos })
}

export function eliminarIntento<E extends EstadoPartida>(estado: E, id: Id, sello: Sello): E {
  const actual = buscarPorId(estado.intentos, id)
  const base = devolverPergamino(estado, actual, sello)
  return contarCambio({ ...base, intentos: quitarPorId(base.intentos, id) })
}
