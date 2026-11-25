import { compararFechas, type Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import type { ObjetoInventario, Venta } from '../modelo/personaje'
import { conceptoVenta } from '../motor/textos'
import { patrimonioDelPersonaje } from '../personaje/patrimonio'
import { conEstadoDePergamino, objetoSegunPergamino, pergaminoDeObjeto } from './pergaminoObjeto'
import {
  buscarPorId,
  mismoRegistro,
  quitarPorId,
  reemplazarPorId,
  type Creado,
  type Sello,
} from './registros'

/** Lo que pide J3b: cuántas unidades, a qué precio, en qué cuenta entra, a quién y cuándo. */
export interface DatosVenta {
  cantidad: number
  precioUnitario: Venta['precioUnitario']
  cuentaId: Id
  compradorId?: Id
  fecha: Fecha
}

/** Lo que J3b enseña antes de guardar, en mh. */
export interface VistaPreviaVenta {
  total: number
  /** Lo cobrado menos el valor anotado de lo que sale: es lo que cambia el patrimonio. */
  diferencia: number
  saldoDespues: number
  patrimonioDespues: number
}

/** Lanza si la venta no se puede hacer: de más, de menos o con fecha futura (§7; D-102). */
function exigeVentaValida(estado: EstadoPartida, disponibles: number, datos: DatosVenta): void {
  if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1) {
    throw new Error('Vende al menos 1 unidad')
  }
  if (datos.cantidad > disponibles) {
    throw new Error(`Solo tienes ${disponibles}`)
  }
  if (compararFechas(datos.fecha, estado.partida.fechaActual) > 0) {
    throw new Error('La venta no puede tener fecha futura')
  }
}

/** Lo que cambiaría al vender: cobro, diferencia con el valor anotado, saldo y patrimonio (J3b). */
export function vistaPreviaDeVenta(estado: EstadoPartida, objetoId: Id, datos: DatosVenta): VistaPreviaVenta {
  const objeto = buscarPorId(estado.objetos, objetoId)
  const total = datos.precioUnitario.base * datos.cantidad
  const diferencia = total - objeto.valorUnitario.base * datos.cantidad
  return {
    total,
    diferencia,
    saldoDespues: (saldosPorDominio(estado)[datos.cuentaId] ?? 0) + total,
    patrimonioDespues: patrimonioDelPersonaje(estado).neto + diferencia,
  }
}

/** El ingreso vinculado de una venta (§6.4, tabla de vinculados). */
function movimientoDeVenta(id: Id, ventaId: Id, nombre: string, datos: DatosVenta): Movimiento {
  return {
    id,
    dominioId: datos.cuentaId,
    fecha: datos.fecha,
    tipo: 'ingreso',
    importe: { base: datos.precioUnitario.base * datos.cantidad },
    categoriaId: CATEGORIA.ventaDeObjetos,
    concepto: conceptoVenta(nombre, datos.cantidad),
    origen: 'manual',
    vinculo: { tipo: 'venta', id: ventaId },
    programado: false,
  }
}

/** Saca (o devuelve, con cantidad negativa) unidades de un objeto y deja al día su pergamino, si lo tiene. */
function sacarUnidades<E extends EstadoPartida>(estado: E, objetoId: Id, cantidad: number, ahora: Sello['ahora']): E {
  const objeto = buscarPorId(estado.objetos, objetoId)
  const quedan = objeto.cantidad - cantidad
  let nuevo: ObjetoInventario = { ...objeto, cantidad: quedan }
  if (quedan === 0) {
    nuevo.archivado = 'vendido'
  } else if (nuevo.archivado === 'vendido') {
    delete nuevo.archivado
  }
  let pergaminos = estado.pergaminos
  const pergamino = pergaminoDeObjeto(estado.pergaminos, objetoId)
  if (pergamino !== undefined) {
    if (quedan > 0) {
      nuevo = objetoSegunPergamino(nuevo, 'poseido')
    }
    const comoQueda = conEstadoDePergamino(pergamino, quedan === 0 ? 'vendido' : 'poseido')
    pergaminos = reemplazarPorId(pergaminos, comoQueda, ahora)
  }
  return { ...estado, objetos: reemplazarPorId(estado.objetos, nuevo, ahora), pergaminos }
}

/** J3b: apunta la venta, cobra en la cuenta elegida y saca las unidades; vender todas archiva el objeto. */
export function venderObjeto<E extends EstadoPartida>(
  estado: E,
  objetoId: Id,
  datos: DatosVenta,
  sello: Sello,
): Creado<E> {
  const objeto = buscarPorId(estado.objetos, objetoId)
  exigeVentaValida(estado, objeto.archivado === undefined ? objeto.cantidad : 0, datos)
  const id = sello.nuevoId()
  const movimientoId = sello.nuevoId()
  const venta: Venta = {
    id,
    objetoId,
    nombre: objeto.nombre,
    valorAnotado: objeto.valorUnitario,
    cantidad: datos.cantidad,
    precioUnitario: datos.precioUnitario,
    ...(datos.compradorId === undefined ? {} : { compradorId: datos.compradorId }),
    movimientoId,
  }
  const base = sacarUnidades(estado, objetoId, datos.cantidad, sello.ahora)
  return {
    estado: {
      ...base,
      ventas: [...base.ventas, venta],
      movimientos: [...base.movimientos, movimientoDeVenta(movimientoId, id, objeto.nombre, datos)],
    },
    id,
  }
}

/** Editar la venta desde el libro (J3b con los datos cargados): ajusta las unidades y el cobro. */
export function editarVenta<E extends EstadoPartida>(estado: E, id: Id, datos: DatosVenta, sello: Sello): E {
  const venta = buscarPorId(estado.ventas, id)
  const movimiento = buscarPorId(estado.movimientos, venta.movimientoId)
  const nueva: Venta = { ...venta, cantidad: datos.cantidad, precioUnitario: datos.precioUnitario }
  if (datos.compradorId === undefined) {
    delete nueva.compradorId
  } else {
    nueva.compradorId = datos.compradorId
  }
  const movimientoNuevo: Movimiento = {
    ...movimientoDeVenta(movimiento.id, id, venta.nombre, datos),
    ...(movimiento.editadoEl === undefined ? {} : { editadoEl: movimiento.editadoEl }),
  }
  if (mismoRegistro(venta, nueva) && mismoRegistro(movimiento, movimientoNuevo)) {
    return estado
  }
  let base = estado
  if (venta.objetoId !== undefined) {
    const objeto = buscarPorId(estado.objetos, venta.objetoId)
    exigeVentaValida(estado, objeto.cantidad + venta.cantidad, datos)
    if (datos.cantidad !== venta.cantidad) {
      base = sacarUnidades(estado, venta.objetoId, datos.cantidad - venta.cantidad, sello.ahora)
    }
  } else if (datos.cantidad !== venta.cantidad) {
    throw new Error('El objeto ya no existe: no se puede cambiar la cantidad')
  }
  return {
    ...base,
    ventas: reemplazarPorId(base.ventas, nueva, sello.ahora),
    movimientos: reemplazarPorId(base.movimientos, movimientoNuevo, sello.ahora),
  }
}

/** Borra la venta y su ingreso y devuelve las unidades; el objeto archivado se restaura (§6.4, «Al eliminar»). */
export function eliminarVenta<E extends EstadoPartida>(estado: E, id: Id, sello: Sello): E {
  const venta = buscarPorId(estado.ventas, id)
  const base =
    venta.objetoId === undefined ? estado : sacarUnidades(estado, venta.objetoId, -venta.cantidad, sello.ahora)
  return {
    ...base,
    ventas: quitarPorId(base.ventas, id),
    movimientos: quitarPorId(base.movimientos, venta.movimientoId),
  }
}
