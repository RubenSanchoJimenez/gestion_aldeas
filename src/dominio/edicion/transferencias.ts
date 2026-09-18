import { compararFechas, type Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import type { Importe } from '../dinero/importe'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Movimiento, Transferencia } from '../modelo/movimientos'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide J2f (§6.2 l.396-402); sin conceptos, se proponen «Transferencia a …» y «Transferencia desde …». */
export interface DatosTransferencia {
  saleDeId: Id
  entraEnId: Id
  importe: Importe
  fecha: Fecha
  conceptoSale?: string
  conceptoEntra?: string
}

/** «Transferencia a Bree»: el concepto propuesto del lado que sale (§6.2, J2f). */
function propuestoSale(estado: EstadoPartida, entraEnId: Id): string {
  return `Transferencia a ${buscarPorId(estado.dominios, entraEnId).nombre}`
}

/** «Transferencia desde Tharan»: el concepto propuesto del lado que entra (§6.2, J2f). */
function propuestoEntra(estado: EstadoPartida, saleDeId: Id): string {
  return `Transferencia desde ${buscarPorId(estado.dominios, saleDeId).nombre}`
}

/** Las dos reglas de J2f: fecha de hoy o anterior (D-033) y dos dominios distintos (EsquemaTransferencia). */
function exigeValida(estado: EstadoPartida, datos: DatosTransferencia): void {
  if (compararFechas(datos.fecha, estado.partida.fechaActual) > 0) {
    throw new Error('Una transferencia no puede tener fecha futura')
  }
  if (datos.saleDeId === datos.entraEnId) {
    throw new Error('«Sale de» y «Entra en» deben ser distintos')
  }
}

/** Lo tecleado con el signo de un lado: negativo el que sale, positivo el que entra; nunca −0. */
function importeDelLado(importe: Importe, sale: boolean): Importe {
  const base = sale && importe.base !== 0 ? -importe.base : importe.base
  return importe.introducido === undefined ? { base } : { base, introducido: importe.introducido }
}

/** Un lado de la transferencia: un movimiento manual vinculado, de la categoría Transferencias (§8). */
function lado(
  id: Id,
  transferenciaId: Id,
  dominioId: Id,
  datos: DatosTransferencia,
  sale: boolean,
  concepto: string,
): Movimiento {
  return {
    id,
    dominioId,
    fecha: datos.fecha,
    tipo: 'transferencia',
    importe: importeDelLado(datos.importe, sale),
    categoriaId: CATEGORIA.transferencias,
    concepto,
    origen: 'manual',
    vinculo: { tipo: 'transferencia', id: transferenciaId },
    programado: false,
  }
}

/**
 * El concepto de un lado al editar: el escrito, si lo hay; si no, el que tenía, salvo que fuera el propuesto
 * para el otro lado de antes, que se vuelve a proponer con el de ahora.
 */
function conceptoAlEditar(escrito: string | undefined, actual: string, propuestoAntes: string, propuestoAhora: string): string {
  if (escrito !== undefined) {
    return escrito
  }
  return actual === propuestoAntes ? propuestoAhora : actual
}

/** Crea la transferencia y sus dos movimientos vinculados, con fecha de hoy o anterior (§6.4 l.755; D-033). */
export function crearTransferencia<E extends EstadoPartida>(estado: E, datos: DatosTransferencia, sello: Sello): Creado<E> {
  exigeValida(estado, datos)
  const id = sello.nuevoId()
  const saleId = sello.nuevoId()
  const entraId = sello.nuevoId()
  const transferencia: Transferencia = {
    id,
    fecha: datos.fecha,
    importe: datos.importe,
    saleDeId: datos.saleDeId,
    entraEnId: datos.entraEnId,
    movimientoSaleId: saleId,
    movimientoEntraId: entraId,
  }
  const sale = lado(saleId, id, datos.saleDeId, datos, true, datos.conceptoSale ?? propuestoSale(estado, datos.entraEnId))
  const entra = lado(entraId, id, datos.entraEnId, datos, false, datos.conceptoEntra ?? propuestoEntra(estado, datos.saleDeId))
  return {
    estado: {
      ...estado,
      movimientos: [...estado.movimientos, sale, entra],
      transferencias: [...estado.transferencias, transferencia],
    },
    id,
  }
}

/** Cambia la transferencia y sus dos lados a la vez (§6.4, tabla de vinculados). */
export function editarTransferencia<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: DatosTransferencia,
  sello: Sello,
): E {
  const actual = buscarPorId(estado.transferencias, id)
  exigeValida(estado, datos)
  const saleActual = buscarPorId(estado.movimientos, actual.movimientoSaleId)
  const entraActual = buscarPorId(estado.movimientos, actual.movimientoEntraId)
  const transferencia: Transferencia = {
    ...actual,
    fecha: datos.fecha,
    importe: datos.importe,
    saleDeId: datos.saleDeId,
    entraEnId: datos.entraEnId,
  }
  const conceptoSale = conceptoAlEditar(
    datos.conceptoSale,
    saleActual.concepto,
    propuestoSale(estado, actual.entraEnId),
    propuestoSale(estado, datos.entraEnId),
  )
  const conceptoEntra = conceptoAlEditar(
    datos.conceptoEntra,
    entraActual.concepto,
    propuestoEntra(estado, actual.saleDeId),
    propuestoEntra(estado, datos.saleDeId),
  )
  const sale: Movimiento = { ...saleActual, ...lado(saleActual.id, id, datos.saleDeId, datos, true, conceptoSale) }
  const entra: Movimiento = {
    ...entraActual,
    ...lado(entraActual.id, id, datos.entraEnId, datos, false, conceptoEntra),
  }
  const transferencias = reemplazarPorId(estado.transferencias, transferencia, sello.ahora)
  const movimientos = reemplazarPorId(reemplazarPorId(estado.movimientos, sale, sello.ahora), entra, sello.ahora)
  if (transferencias === estado.transferencias && movimientos === estado.movimientos) {
    return estado
  }
  return { ...estado, movimientos, transferencias }
}

/** Borra la transferencia y sus dos movimientos (§6.4 l.776). */
export function eliminarTransferencia<E extends EstadoPartida>(estado: E, id: Id): E {
  const actual = buscarPorId(estado.transferencias, id)
  return {
    ...estado,
    movimientos: quitarPorId(quitarPorId(estado.movimientos, actual.movimientoSaleId), actual.movimientoEntraId),
    transferencias: quitarPorId(estado.transferencias, id),
  }
}
