import { compararFechas, type Fecha } from '../calendario/fecha'
import type { Importe } from '../dinero/importe'
import { anadirObjetoComprado } from '../inventario/compra'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import type { ObjetoInventario } from '../modelo/personaje'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide J2b para un gasto o un ingreso suelto (§6.2). El importe es una magnitud: el signo lo pone el tipo. */
export interface DatosMovimiento {
  dominioId: Id
  tipo: 'gasto' | 'ingreso'
  importe: Importe
  categoriaId: Id
  concepto: string
  fecha: Fecha
}

/** Lo que J2c deja cambiar: todo menos el tipo (§6.2 l.348). */
export type CambiosMovimiento = Partial<Omit<DatosMovimiento, 'tipo'>>

/** Si el movimiento sale de otro registro y se edita desde allí (§6.4 l.751). */
export function esVinculado(movimiento: Movimiento): boolean {
  return movimiento.vinculo !== undefined
}

/** El importe con el signo de su tipo (decisión 18); un gasto de 0 guarda 0, nunca −0. */
function conSigno(importe: Importe, tipo: 'gasto' | 'ingreso'): Importe {
  const base = tipo === 'gasto' && importe.base !== 0 ? -importe.base : importe.base
  return importe.introducido === undefined ? { base } : { base, introducido: importe.introducido }
}

/** Con fecha posterior a la fecha actual queda programado (§7, «Programados»). */
function esFutura(estado: EstadoPartida, fecha: Fecha): boolean {
  return compararFechas(fecha, estado.partida.fechaActual) > 0
}

/** El id del personaje: el único dominio de tipo personaje (§8). */
function personajeDe(estado: EstadoPartida): Id {
  const personaje = estado.dominios.find((d) => d.tipo === 'personaje')
  if (personaje === undefined) {
    throw new Error('No existe «personaje»')
  }
  return personaje.id
}

/** Lanza si el movimiento es vinculado: su botón editar abre el formulario de su origen (§6.4 l.751). */
function exigeSuelto(movimiento: Movimiento): void {
  if (esVinculado(movimiento)) {
    throw new Error('Este movimiento se edita desde su origen')
  }
}

/** Si los cambios tocan algo que no es el importe: en un cobro de locales solo se edita el total (§6.2 l.385). */
function cambiaAlgoMasQueElImporte(actual: Movimiento, cambios: CambiosMovimiento): boolean {
  return (
    (cambios.dominioId !== undefined && cambios.dominioId !== actual.dominioId) ||
    (cambios.categoriaId !== undefined && cambios.categoriaId !== actual.categoriaId) ||
    (cambios.concepto !== undefined && cambios.concepto !== actual.concepto) ||
    (cambios.fecha !== undefined && compararFechas(cambios.fecha, actual.fecha) !== 0)
  )
}

/** Crea un movimiento suelto; con fecha futura queda programado (§6.2 J2b; §7 l.1199). */
export function crearMovimiento<E extends EstadoPartida>(estado: E, datos: DatosMovimiento, sello: Sello): Creado<E> {
  const id = sello.nuevoId()
  const movimiento: Movimiento = {
    id,
    dominioId: datos.dominioId,
    fecha: datos.fecha,
    tipo: datos.tipo,
    importe: conSigno(datos.importe, datos.tipo),
    categoriaId: datos.categoriaId,
    concepto: datos.concepto,
    origen: 'manual',
    programado: esFutura(estado, datos.fecha),
  }
  return { estado: { ...estado, movimientos: [...estado.movimientos, movimiento] }, id }
}

/**
 * Edita un movimiento suelto (J2c): recalcula programado y, en un cobro de locales, solo deja el importe
 * (§6.2 l.385; T14; T32). Si un programado pasa a hoy o antes, se aplica al guardar y crea su objeto pendiente.
 */
export function editarMovimiento<E extends EstadoPartida>(estado: E, id: Id, cambios: CambiosMovimiento, sello: Sello): E {
  const actual = buscarPorId(estado.movimientos, id)
  exigeSuelto(actual)
  if (actual.regla?.tipo === 'locales' && cambiaAlgoMasQueElImporte(actual, cambios)) {
    throw new Error('En un cobro de impuestos de locales solo se cambia el importe total')
  }
  const tipo = actual.tipo === 'gasto' ? 'gasto' : 'ingreso'
  const fecha = cambios.fecha ?? actual.fecha
  const editado: Movimiento = {
    ...actual,
    dominioId: cambios.dominioId ?? actual.dominioId,
    fecha,
    importe: cambios.importe === undefined ? actual.importe : conSigno(cambios.importe, tipo),
    categoriaId: cambios.categoriaId ?? actual.categoriaId,
    concepto: cambios.concepto ?? actual.concepto,
    programado: esFutura(estado, fecha),
  }
  let objetos: ObjetoInventario[] = estado.objetos
  if (actual.objetoPendiente !== undefined && !editado.programado) {
    objetos = anadirObjetoComprado(estado.objetos, actual.objetoPendiente, {
      personajeId: personajeDe(estado),
      movimientoId: id,
      nuevoId: sello.nuevoId,
    })
    delete editado.objetoPendiente
  }
  const movimientos = reemplazarPorId(estado.movimientos, editado, sello.ahora)
  if (movimientos === estado.movimientos) {
    return estado
  }
  return { ...estado, movimientos, objetos }
}

/** Elimina un movimiento suelto; su objeto comprado se queda sin movimientoCompraId (§6.4 l.775; T31). */
export function eliminarMovimiento<E extends EstadoPartida>(estado: E, id: Id): E {
  exigeSuelto(buscarPorId(estado.movimientos, id))
  const movimientos = quitarPorId(estado.movimientos, id)
  if (!estado.objetos.some((o) => o.movimientoCompraId === id)) {
    return { ...estado, movimientos }
  }
  const objetos = estado.objetos.map((o) => {
    if (o.movimientoCompraId !== id) {
      return o
    }
    const suelto = { ...o }
    delete suelto.movimientoCompraId
    return suelto
  })
  return { ...estado, movimientos, objetos }
}
