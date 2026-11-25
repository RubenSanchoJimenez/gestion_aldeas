import { compararFechas, type Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import type { ObjetoInventario, Pergamino } from '../modelo/personaje'
import { conEstadoDePergamino, nombreDeObjetoPergamino, objetoSegunPergamino } from './pergaminoObjeto'
import { sinVacios } from './opcionales'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** «Lo he comprado»: de qué cuenta sale y cuándo (§6.6, formulario «Pergamino»). */
export interface CompraPergamino {
  cuentaId: Id
  fecha: Fecha
}

/** Lo que pide el formulario «Pergamino». El precio de la compra es su valor (D-104). */
export interface DatosPergamino {
  dominioId: Id
  hechizoId?: Id
  /** Solo sin hechizo: con hechizo, el nombre se copia de él. */
  nombre?: string
  nivel?: number
  /** A mano solo se elige entre poseído y perdido (§7). */
  estado: 'poseido' | 'perdido'
  valor: ObjetoInventario['valorUnitario']
  ubicacion: ObjetoInventario['ubicacion']
  compra?: CompraPergamino
}

/** El nombre que le toca: el del hechizo o el escrito. */
function nombreDe(estado: EstadoPartida, datos: Pick<DatosPergamino, 'hechizoId' | 'nombre'>): string {
  if (datos.hechizoId !== undefined) {
    return buscarPorId(estado.hechizos, datos.hechizoId).nombre
  }
  const nombre = datos.nombre?.trim() ?? ''
  if (nombre.length < 2) {
    throw new Error('Escribe el nombre del pergamino')
  }
  return nombre
}

/** El gasto vinculado de «Pergaminos y estudio» de una compra. */
function movimientoDeCompra(
  id: Id,
  pergaminoId: Id,
  nombre: string,
  importe: number,
  compra: CompraPergamino,
  hoy: Fecha,
): Movimiento {
  if (compararFechas(compra.fecha, hoy) > 0) {
    throw new Error('La compra no puede tener fecha futura')
  }
  return {
    id,
    dominioId: compra.cuentaId,
    fecha: compra.fecha,
    tipo: 'gasto',
    importe: { base: -importe },
    categoriaId: CATEGORIA.pergaminosYEstudio,
    concepto: nombreDeObjetoPergamino(nombre),
    origen: 'manual',
    vinculo: { tipo: 'pergamino', id: pergaminoId },
    programado: false,
  }
}

/** Crea el pergamino con su objeto de 1 unidad y, si lo has comprado, su gasto. */
export function crearPergamino<E extends EstadoPartida>(estado: E, datos: DatosPergamino, sello: Sello): Creado<E> {
  const id = sello.nuevoId()
  const objetoId = sello.nuevoId()
  const nombre = nombreDe(estado, datos)
  const objeto = objetoSegunPergamino(
    {
      id: objetoId,
      dominioId: datos.dominioId,
      nombre: nombreDeObjetoPergamino(nombre),
      cantidad: 1,
      valorUnitario: datos.valor,
      ubicacion: datos.ubicacion,
    },
    datos.estado,
  )
  let movimientos = estado.movimientos
  let movimientoCompraId: Id | undefined
  if (datos.compra !== undefined) {
    movimientoCompraId = sello.nuevoId()
    const gasto = movimientoDeCompra(
      movimientoCompraId,
      id,
      nombre,
      datos.valor.base,
      datos.compra,
      estado.partida.fechaActual,
    )
    movimientos = [...movimientos, gasto]
  }
  const pergamino: Pergamino = sinVacios({
    id,
    dominioId: datos.dominioId,
    hechizoId: datos.hechizoId,
    nombre,
    nivel: datos.nivel,
    estado: datos.estado,
    objetoInventarioId: objetoId,
    movimientoCompraId,
  })
  return {
    estado: {
      ...estado,
      objetos: [...estado.objetos, objeto],
      pergaminos: [...estado.pergaminos, pergamino],
      movimientos,
    },
    id,
  }
}

/** Lo que cambia al editar: el formulario entero, sin el dominio. `compra` sin definir quita su gasto. */
export type CambiosPergamino = Omit<DatosPergamino, 'dominioId' | 'estado'> & { estado: Pergamino['estado'] }

/** Edita el pergamino, su objeto y su gasto de compra. «Vendido» y «consumido» no se cambian a mano. */
export function editarPergamino<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: CambiosPergamino,
  sello: Sello,
): E {
  const actual = buscarPorId(estado.pergaminos, id)
  const aMano = (e: Pergamino['estado']): boolean => e === 'poseido' || e === 'perdido'
  if (datos.estado !== actual.estado && !(aMano(datos.estado) && aMano(actual.estado))) {
    throw new Error('«Vendido» lo pone una venta y «consumido», un intento')
  }
  const nombre = nombreDe(estado, datos)
  const comoQueda = conEstadoDePergamino(actual, datos.estado, actual.consumidoEl)
  const nuevo: Pergamino = sinVacios({ ...comoQueda, hechizoId: datos.hechizoId, nombre, nivel: datos.nivel })

  const copiaMovimientos = [...estado.movimientos]
  let movimientos: Movimiento[] = copiaMovimientos
  if (datos.compra === undefined) {
    if (actual.movimientoCompraId !== undefined) {
      movimientos = quitarPorId(copiaMovimientos, actual.movimientoCompraId)
      delete nuevo.movimientoCompraId
    }
  } else {
    const movimientoId = actual.movimientoCompraId ?? sello.nuevoId()
    const anterior = estado.movimientos.find((m) => m.id === movimientoId)
    const gasto = movimientoDeCompra(movimientoId, id, nombre, datos.valor.base, datos.compra, estado.partida.fechaActual)
    // El concepto de un movimiento ya registrado no cambia (§7).
    movimientos =
      anterior === undefined
        ? [...copiaMovimientos, gasto]
        : reemplazarPorId(
            copiaMovimientos,
            { ...gasto, concepto: anterior.concepto, editadoEl: anterior.editadoEl },
            sello.ahora,
          )
    nuevo.movimientoCompraId = movimientoId
  }

  const copiaObjetos = [...estado.objetos]
  let objetos: ObjetoInventario[] = copiaObjetos
  if (actual.objetoInventarioId !== undefined) {
    const objeto = buscarPorId(estado.objetos, actual.objetoInventarioId)
    const seLlamabaIgual = objeto.nombre === nombreDeObjetoPergamino(actual.nombre)
    const editado: ObjetoInventario = {
      ...objeto,
      nombre: seLlamabaIgual ? nombreDeObjetoPergamino(nombre) : objeto.nombre,
      valorUnitario: datos.valor,
      ubicacion: datos.ubicacion,
    }
    objetos = reemplazarPorId(
      copiaObjetos,
      aMano(datos.estado) ? objetoSegunPergamino(editado, datos.estado) : editado,
      sello.ahora,
    )
  }
  const copiaPergaminos = [...estado.pergaminos]
  const pergaminos = reemplazarPorId(copiaPergaminos, nuevo, sello.ahora)
  if (pergaminos === copiaPergaminos && objetos === copiaObjetos && movimientos === copiaMovimientos) {
    return estado
  }
  return { ...estado, pergaminos, objetos, movimientos }
}

/**
 * Quita el pergamino, su objeto y su gasto de compra; los intentos que lo usaron dicen «con un pergamino
 * eliminado» (§6.4, «Al eliminar»). 
 */
export function quitarPergamino<E extends EstadoPartida>(estado: E, id: Id): E {
  const pergamino = buscarPorId(estado.pergaminos, id)
  const intentos = estado.intentos.map((i) => {
    if (i.pergaminoId !== id) {
      return i
    }
    const sin = { ...i, pergaminoConsumido: false, pergaminoEliminado: true }
    delete sin.pergaminoId
    return sin
  })
  let objetos = estado.objetos
  let ventas = estado.ventas
  const objetoId = pergamino.objetoInventarioId
  if (objetoId !== undefined) {
    objetos = quitarPorId(objetos, objetoId)
    // Las ventas conservan el nombre y el valor, sin apuntar al objeto.
    ventas = ventas.map((v) => {
      if (v.objetoId !== objetoId) {
        return v
      }
      const suelta = { ...v }
      delete suelta.objetoId
      return suelta
    })
  }
  return {
    ...estado,
    intentos,
    objetos,
    ventas,
    pergaminos: quitarPorId(estado.pergaminos, id),
    movimientos:
      pergamino.movimientoCompraId === undefined
        ? estado.movimientos
        : quitarPorId(estado.movimientos, pergamino.movimientoCompraId),
  }
}

/** Elimina un pergamino (§6.4). */
export function eliminarPergamino<E extends EstadoPartida>(estado: E, id: Id): E {
  return quitarPergamino(estado, id)
}
