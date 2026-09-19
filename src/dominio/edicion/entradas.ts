import { cabenMas, textoCaben } from '../almacen/cantidades'
import { compararFechas, type Fecha } from '../calendario/fecha'
import { CATEGORIA, RECURSO } from '../catalogo/inicial'
import { redondearMitadArriba } from '../dinero/importe'
import type { Importe } from '../dinero/importe'
import type { EntradaAlmacen, PeriodoViveres } from '../modelo/almacen'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { conceptoCompraAlmacen, recursoDelCatalogo } from '../motor/textos'
import { asegurarFila } from './existencias'
import { buscarPorId, quitarPorId, type Creado, type Sello } from './registros'

export interface DatosEntrada {
  dominioId: Id
  recursoId: Id
  operacion: 'compra' | 'recepcion'
  /** Unidades; con «Por personas», las de sacosPorPersonas. */
  cantidad: number
  porPersonas?: { personas: number; durante: number; periodo: PeriodoViveres }
  /** Solo en una compra: precio por unidad en el mercado local. */
  precioUnidad?: Importe
  fecha: Fecha
}

/** La fila viva de un almacén; undefined si no la tiene. */
function filaEn(estado: EstadoPartida, dominioId: Id, recursoId: Id) {
  return estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
}

/**
 * Compra en el mercado local (el de localDe = dominioId) o recepción sin coste (§7 l.1097; D-053, D-054). Asegura
 * la fila. fecha ≤ hoy: entra ya (bloquea con textoCaben si no cabe) y la compra crea su gasto vinculado; fecha
 * > hoy: aplicada false y el gasto, programado.
 */
export function crearEntradaAlmacen<E extends EstadoPartida>(
  estado: E,
  datos: DatosEntrada,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): Creado<E> {
  const conFila = asegurarFila(estado, datos.dominioId, datos.recursoId)
  const id = sello.nuevoId()
  const hoy = conFila.partida.fechaActual
  const entraYa = compararFechas(datos.fecha, hoy) <= 0

  let movimientos = conFila.movimientos
  let movimientoId: Id | undefined
  let mercadoId: Id | undefined
  if (datos.operacion === 'compra') {
    const mercado = conFila.mercados.find((m) => m.localDe === datos.dominioId)
    if (mercado === undefined) {
      throw new Error(`No existe «mercado local de ${datos.dominioId}»`)
    }
    mercadoId = mercado.id
    const precio = datos.precioUnidad as Importe
    const importe = redondearMitadArriba(precio.base * datos.cantidad)
    const recurso = recursoDelCatalogo(catalogo, datos.recursoId)
    movimientoId = sello.nuevoId()
    const gasto: Movimiento = {
      id: movimientoId,
      dominioId: datos.dominioId,
      fecha: datos.fecha,
      tipo: 'gasto',
      importe: { base: -importe },
      categoriaId: datos.recursoId === RECURSO.viveres ? CATEGORIA.viveresDelAlmacen : CATEGORIA.comercio,
      concepto: conceptoCompraAlmacen(recurso.nombre, mercado.nombre),
      origen: 'manual',
      vinculo: { tipo: 'entradaAlmacen', id },
      programado: !entraYa,
    }
    movimientos = [...movimientos, gasto]
  }

  let existencias = conFila.existencias
  let aplicada = false
  if (entraYa) {
    const fila = filaEn(conFila, datos.dominioId, datos.recursoId)
    if (fila === undefined) {
      throw new Error(`No existe «${datos.dominioId}|${datos.recursoId}»`)
    }
    if (fila.capacidad !== undefined) {
      const caben = cabenMas(fila) ?? 0
      if (datos.cantidad > caben) {
        throw new Error(textoCaben(caben, recursoDelCatalogo(catalogo, datos.recursoId)))
      }
    }
    existencias = conFila.existencias.map((e) => (e === fila ? { ...fila, cantidad: fila.cantidad + datos.cantidad } : e))
    aplicada = true
  }

  const entrada: EntradaAlmacen = {
    id,
    dominioId: datos.dominioId,
    recursoId: datos.recursoId,
    cantidad: datos.cantidad,
    operacion: datos.operacion,
    fecha: datos.fecha,
    aplicada,
    ...(mercadoId === undefined ? {} : { mercadoId }),
    ...(datos.precioUnidad === undefined ? {} : { precioUnidad: datos.precioUnidad }),
    ...(movimientoId === undefined ? {} : { movimientoId }),
    ...(datos.porPersonas === undefined
      ? {}
      : { personas: datos.porPersonas.personas, durante: datos.porPersonas.durante, periodo: datos.porPersonas.periodo }),
  }

  return {
    estado: { ...conFila, existencias, movimientos, entradasAlmacen: [...conFila.entradasAlmacen, entrada] },
    id,
  }
}

/**
 * Aplicada: saca sus unidades (bloquea bajo 0) y borra su movimiento; sin aplicar: la borra con su programado
 * (§6.4 l.792). Con caravanaId, lanza.
 */
export function eliminarEntradaAlmacen<E extends EstadoPartida>(estado: E, id: Id, _catalogo: CatalogosEnCopia): E {
  const entrada = buscarPorId(estado.entradasAlmacen, id)
  if (entrada.caravanaId !== undefined) {
    throw new Error('Esta compra se edita desde su caravana')
  }
  const entradasAlmacen = quitarPorId(estado.entradasAlmacen, id)
  const movimientos = entrada.movimientoId === undefined ? estado.movimientos : quitarPorId(estado.movimientos, entrada.movimientoId)

  if (!entrada.aplicada) {
    return { ...estado, entradasAlmacen, movimientos }
  }

  const fila = filaEn(estado, entrada.dominioId, entrada.recursoId)
  const disponible = fila?.cantidad ?? 0
  if (disponible < entrada.cantidad) {
    throw new Error('Las existencias no pueden quedar por debajo de 0')
  }
  const existencias = estado.existencias.map((e) =>
    e === fila ? { ...fila, cantidad: disponible - entrada.cantidad } : e,
  )
  return { ...estado, entradasAlmacen, movimientos, existencias }
}
