import { vueltaDeCaravana } from '../almacen/progreso'
import { formatearCantidad } from '../almacen/cantidades'
import { dominioDe } from '../avisos/dinero'
import { CATEGORIA } from '../catalogo/inicial'
import { redondearMitadArriba, type Importe } from '../dinero/importe'
import type { CargaCaravana, Caravana } from '../modelo/comercio'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import { compararFechas, type Fecha } from '../calendario/fecha'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { conceptoCompraCaravana, conceptoVentaCaravana, recursoDelCatalogo } from '../motor/textos'
import { asegurarFila } from './existencias'
import { diasDeViaje } from './mercados'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide el formulario «Caravana» (A10b, §6.4). */
export interface DatosCaravana {
  dominioId: Id
  operacion: Caravana['operacion']
  /** Compra y venta. */
  mercadoId?: Id
  /** Traslado. */
  destinoId?: Id
  carga: CargaCaravana
  /** Compra y venta. */
  precioUnidad?: Importe
  salida: Fecha
}

/** La fila del almacén, si existe. */
function cantidadEnFila(estado: EstadoPartida, dominioId: Id, recursoId: Id): number {
  return estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)?.cantidad ?? 0
}

/** Saca la carga de la fila de origen; lanza si no llega (§6.4). */
function sacarCarga<E extends EstadoPartida>(estado: E, dominioId: Id, carga: CargaCaravana, catalogo: CatalogosEnCopia): E {
  const disponible = cantidadEnFila(estado, dominioId, carga.recursoId)
  if (disponible < carga.cantidad) {
    const recurso = recursoDelCatalogo(catalogo, carga.recursoId)
    throw new Error(`La carga no puede superar las existencias: hay ${formatearCantidad(disponible, recurso)}`)
  }
  return {
    ...estado,
    existencias: estado.existencias.map((e) =>
      e.dominioId === dominioId && e.recursoId === carga.recursoId ? { ...e, cantidad: e.cantidad - carga.cantidad } : e,
    ),
  }
}

/** Suma la carga de vuelta a la fila de origen (D-058: bloquea si no cabe). */
function devolverCarga<E extends EstadoPartida>(estado: E, dominioId: Id, carga: CargaCaravana, catalogo: CatalogosEnCopia): E {
  const fila = estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === carga.recursoId)
  if (fila?.capacidad !== undefined && fila.cantidad + carga.cantidad > fila.capacidad + 1e-6) {
    const recurso = recursoDelCatalogo(catalogo, carga.recursoId)
    const caben = Math.max(0, Math.floor(fila.capacidad - fila.cantidad))
    const unidad = caben === 1 ? recurso.unidadSingular : recurso.unidadPlural
    const verbo = caben === 1 ? 'Cabe' : 'Caben'
    throw new Error(`${verbo} ${caben} ${unidad} más`)
  }
  return {
    ...estado,
    existencias: estado.existencias.map((e) =>
      e.dominioId === dominioId && e.recursoId === carga.recursoId ? { ...e, cantidad: e.cantidad + carga.cantidad } : e,
    ),
  }
}

function quitarMovimiento<E extends EstadoPartida>(estado: E, movimientoId: Id): E {
  return { ...estado, movimientos: estado.movimientos.filter((m) => m.id !== movimientoId) }
}

/** Deja el movimiento sin vínculo, como un gasto o ingreso suelto. */
function soltarVinculo<E extends EstadoPartida>(estado: E, movimientoId: Id): E {
  return {
    ...estado,
    movimientos: estado.movimientos.map((m) => {
      if (m.id !== movimientoId) {
        return m
      }
      const { vinculo: _vinculo, ...resto } = m
      return resto
    }),
  }
}

/** El movimiento de pago de una compra (§3.14). */
function pagoDeCompra(movimientoId: Id, caravanaId: Id, dominioId: Id, fecha: Fecha, importe: number, concepto: string, programado: boolean): Movimiento {
  return {
    id: movimientoId,
    dominioId,
    fecha,
    tipo: 'gasto',
    importe: { base: -importe },
    categoriaId: CATEGORIA.comercio,
    concepto,
    origen: 'manual',
    vinculo: { tipo: 'caravana', id: caravanaId },
    programado,
  }
}

/** El movimiento de cobro de una venta local, que se paga al momento (D-019). */
function cobroDeVenta(movimientoId: Id, caravanaId: Id, dominioId: Id, fecha: Fecha, importe: number, concepto: string): Movimiento {
  return {
    id: movimientoId,
    dominioId,
    fecha,
    tipo: 'ingreso',
    importe: { base: importe },
    categoriaId: CATEGORIA.comercio,
    concepto,
    origen: 'manual',
    vinculo: { tipo: 'caravana', id: caravanaId },
    programado: false,
  }
}

/** Días de viaje de la ruta de esta caravana; lanza «Faltan los días de viaje de X a Y» si no hay ruta (§6.4). */
function diasDeLaRuta(estado: EstadoPartida, dominioId: Id, mercadoLocal: boolean, datos: DatosCaravana): number {
  const origen = dominioDe(estado, dominioId).nombre
  if (datos.operacion === 'traslado') {
    const dias = diasDeViaje(estado, dominioId, { tipo: 'asentamiento', id: datos.destinoId! })
    if (dias === null) {
      throw new Error(`Faltan los días de viaje de ${origen} a ${dominioDe(estado, datos.destinoId!).nombre}`)
    }
    return dias
  }
  if (mercadoLocal) {
    return 0
  }
  const dias = diasDeViaje(estado, dominioId, { tipo: 'mercado', id: datos.mercadoId! })
  if (dias === null) {
    const mercado = buscarPorId(estado.mercados, datos.mercadoId!)
    throw new Error(`Faltan los días de viaje de ${origen} a ${mercado.nombre}`)
  }
  return dias
}

/**
 * A10b (§7 l.1151-1159): días de la ruta (0 en el mercado local; si no hay ruta, lanza), vuelta con vueltaDeCaravana,
 * importe = redondearMitadArriba(precio × cantidad) sin introducido (TC19). Asegura la fila de origen y, en un
 * traslado, la de destino. salida > hoy: programada (compra: gasto programado). salida ≤ hoy: compra paga y sale;
 * venta y traslado sacan la carga (bloqueo si no llega); venta en el mercado local cobra al momento y queda terminada.
 */
export function crearCaravana<E extends EstadoPartida>(
  estado: E,
  datos: DatosCaravana,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): Creado<E> {
  const id = sello.nuevoId()
  return { estado: construirCaravana(estado, id, datos, sello, catalogo), id }
}

/** Lo que hacen crearCaravana y, con el mismo id, la rehecha de editarCaravana en una programada. */
function construirCaravana<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: DatosCaravana,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): E {
  const hoy = estado.partida.fechaActual
  const mercado = datos.operacion === 'traslado' ? undefined : buscarPorId(estado.mercados, datos.mercadoId!)
  const mercadoLocal = mercado !== undefined && mercado.localDe === datos.dominioId
  if (datos.operacion === 'compra' && mercadoLocal) {
    throw new Error('Las compras en el mercado local se anotan con «Añadir existencias»')
  }
  const diasViaje = diasDeLaRuta(estado, datos.dominioId, mercadoLocal, datos)
  const vuelta = vueltaDeCaravana(datos.salida, diasViaje, datos.operacion)
  const importeBase: number | undefined =
    datos.operacion === 'traslado' ? undefined : redondearMitadArriba(datos.precioUnidad!.base * datos.carga.cantidad)

  let conFilas = asegurarFila(estado, datos.dominioId, datos.carga.recursoId)
  if (datos.operacion === 'traslado') {
    conFilas = asegurarFila(conFilas, datos.destinoId!, datos.carga.recursoId)
  }

  const programada = compararFechas(datos.salida, hoy) > 0
  const recurso = mercado === undefined ? undefined : recursoDelCatalogo(catalogo, datos.carga.recursoId).nombre

  const base: Omit<Caravana, 'movimientoSalidaId' | 'movimientoVueltaId'> = {
    id,
    dominioId: datos.dominioId,
    operacion: datos.operacion,
    ...(datos.operacion === 'traslado' ? { destinoId: datos.destinoId! } : { mercadoId: datos.mercadoId! }),
    carga: datos.carga,
    ...(datos.operacion === 'traslado' ? {} : { precioUnidad: datos.precioUnidad!, importe: { base: importeBase! } }),
    salida: datos.salida,
    vuelta,
    estado: 'programada',
  } as Omit<Caravana, 'movimientoSalidaId' | 'movimientoVueltaId'>

  if (programada) {
    let nuevoEstado = conFilas
    let caravana: Caravana = { ...base, estado: 'programada' } as Caravana
    if (datos.operacion === 'compra') {
      const movimientoId = sello.nuevoId()
      const concepto = conceptoCompraCaravana(recurso!, mercado!.nombre)
      const gasto = pagoDeCompra(movimientoId, id, datos.dominioId, datos.salida, importeBase!, concepto, true)
      nuevoEstado = { ...nuevoEstado, movimientos: [...nuevoEstado.movimientos, gasto] }
      caravana = { ...caravana, movimientoSalidaId: movimientoId }
    }
    return { ...nuevoEstado, caravanas: [...nuevoEstado.caravanas, caravana] }
  }

  // salida ≤ hoy.
  if (datos.operacion === 'compra') {
    const movimientoId = sello.nuevoId()
    const concepto = conceptoCompraCaravana(recurso!, mercado!.nombre)
    const gasto = pagoDeCompra(movimientoId, id, datos.dominioId, datos.salida, importeBase!, concepto, false)
    const caravana: Caravana = { ...base, estado: 'enRuta', movimientoSalidaId: movimientoId } as Caravana
    return { ...conFilas, movimientos: [...conFilas.movimientos, gasto], caravanas: [...conFilas.caravanas, caravana] }
  }

  // venta o traslado: sacan la carga (bloqueo si no llega).
  const conCargaFuera = sacarCarga(conFilas, datos.dominioId, datos.carga, catalogo)
  if (datos.operacion === 'traslado') {
    const caravana: Caravana = { ...base, estado: 'enRuta' } as Caravana
    return { ...conCargaFuera, caravanas: [...conCargaFuera.caravanas, caravana] }
  }
  // venta.
  if (mercadoLocal) {
    const movimientoId = sello.nuevoId()
    const concepto = conceptoVentaCaravana(recurso!, mercado!.nombre)
    const cobro = cobroDeVenta(movimientoId, id, datos.dominioId, hoy, importeBase!, concepto)
    const caravana: Caravana = { ...base, estado: 'terminada', movimientoVueltaId: movimientoId } as Caravana
    return {
      ...conCargaFuera,
      movimientos: [...conCargaFuera.movimientos, cobro],
      caravanas: [...conCargaFuera.caravanas, caravana],
    }
  }
  const caravana: Caravana = { ...base, estado: 'enRuta' } as Caravana
  return { ...conCargaFuera, caravanas: [...conCargaFuera.caravanas, caravana] }
}

/** D-065: programada, se rehace entera con el mismo id; en ruta o terminada solo cambia el precio, que corrige su movimiento. */
export function editarCaravana<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: DatosCaravana,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): E {
  const caravana = buscarPorId(estado.caravanas, id)

  if (caravana.estado === 'programada') {
    const sinMovimiento =
      caravana.movimientoSalidaId === undefined ? estado : quitarMovimiento(estado, caravana.movimientoSalidaId)
    const sinCaravana: E = { ...sinMovimiento, caravanas: quitarPorId(sinMovimiento.caravanas, id) }
    const rehecho = construirCaravana(sinCaravana, id, datos, sello, catalogo)
    return {
      ...rehecho,
      caravanas: rehecho.caravanas.map((c) => (c.id === id ? { ...c, editadoEl: sello.ahora } : c)),
    }
  }

  if (caravana.operacion === 'traslado') {
    throw new Error(
      caravana.estado === 'enRuta' ? 'En una caravana en ruta solo cambia el precio' : 'En una caravana terminada solo cambia el precio',
    )
  }
  if (datos.precioUnidad === undefined) {
    throw new Error(caravana.estado === 'enRuta' ? 'En una caravana en ruta solo cambia el precio' : 'En una caravana terminada solo cambia el precio')
  }
  const importe = redondearMitadArriba(datos.precioUnidad.base * caravana.carga.cantidad)
  let nuevoEstado: E = estado
  const movimientoId = caravana.operacion === 'compra' ? caravana.movimientoSalidaId : caravana.movimientoVueltaId
  if (movimientoId !== undefined) {
    nuevoEstado = {
      ...nuevoEstado,
      movimientos: nuevoEstado.movimientos.map((m) =>
        m.id === movimientoId ? { ...m, importe: { base: caravana.operacion === 'compra' ? -importe : importe } } : m,
      ),
    }
  }
  const caravanaNueva: Caravana = { ...caravana, precioUnidad: datos.precioUnidad, importe: { base: importe } }
  const caravanas = reemplazarPorId(nuevoEstado.caravanas, caravanaNueva, sello.ahora)
  return caravanas === nuevoEstado.caravanas ? nuevoEstado : { ...nuevoEstado, caravanas }
}

/** §6.4 y D-058, D-059: programada con su programado; en ruta, `devolver` devuelve pago o carga; terminada, movimientos sin vínculo. */
export function eliminarCaravana<E extends EstadoPartida>(
  estado: E,
  id: Id,
  opciones: { devolver: boolean },
  catalogo: CatalogosEnCopia,
): E {
  const caravana = buscarPorId(estado.caravanas, id)
  let nuevoEstado: E = estado

  if (caravana.estado === 'programada') {
    if (caravana.movimientoSalidaId !== undefined) {
      nuevoEstado = quitarMovimiento(nuevoEstado, caravana.movimientoSalidaId)
    }
  } else if (caravana.estado === 'enRuta') {
    if (opciones.devolver) {
      if (caravana.operacion === 'compra' && caravana.movimientoSalidaId !== undefined) {
        nuevoEstado = quitarMovimiento(nuevoEstado, caravana.movimientoSalidaId)
      } else if (caravana.operacion !== 'compra') {
        nuevoEstado = devolverCarga(nuevoEstado, caravana.dominioId, caravana.carga, catalogo)
      }
    } else if (caravana.movimientoSalidaId !== undefined) {
      nuevoEstado = soltarVinculo(nuevoEstado, caravana.movimientoSalidaId)
    }
  } else {
    if (caravana.movimientoSalidaId !== undefined) {
      nuevoEstado = soltarVinculo(nuevoEstado, caravana.movimientoSalidaId)
    }
    if (caravana.movimientoVueltaId !== undefined) {
      nuevoEstado = soltarVinculo(nuevoEstado, caravana.movimientoVueltaId)
    }
  }

  const entradasAlmacen = nuevoEstado.entradasAlmacen.map((e) => {
    if (e.caravanaId !== id) {
      return e
    }
    const { caravanaId: _caravanaId, ...resto } = e
    return resto
  })

  return { ...nuevoEstado, entradasAlmacen, caravanas: quitarPorId(nuevoEstado.caravanas, id) }
}
