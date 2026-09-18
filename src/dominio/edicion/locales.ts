import { compararFechas, sumarDias, type Fecha } from '../calendario/fecha'
import type { Importe } from '../dinero/importe'
import { compararMeses, estadoDelLocalEl, mesAnterior, mesDe, mesSiguiente, type EstadoLocal } from '../locales/impuesto'
import type { LocalComercial, ProduccionMesLocal } from '../modelo/asentamiento'
import type { AnioMes, Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { DetalleLocal, Movimiento } from '../modelo/movimientos'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide el formulario «Local comercial» (§6.4 l.675). */
export interface DatosLocal {
  dominioId: Id
  nombre: string
  tipoId: Id
  titularId?: Id
  produccionHabitual: Importe
  estado: EstadoLocal
  notas?: string
}

/** Sustituye el local en el estado; el mismo estado si no cambió nada. */
function conLocal<E extends EstadoPartida>(estado: E, local: LocalComercial, sello: Sello): E {
  const localesComerciales = reemplazarPorId(estado.localesComerciales, local, sello.ahora)
  return localesComerciales === estado.localesComerciales ? estado : { ...estado, localesComerciales }
}

/** Lanza si el mes no está entre los que A3c deja anotar (§7 l.1085; D-041). */
function exigeMesAnotable(local: LocalComercial, mes: AnioMes, fechaActual: Fecha): void {
  if (!mesesParaAnotar(local, fechaActual).some((m) => compararMeses(m, mes) === 0)) {
    throw new Error('Ese mes no se puede anotar: ya está cobrado o todavía no ha llegado')
  }
}

/** Alta de un local: alta = hoy, cobradoHasta = mes anterior y primer tramo desde hoy (§7 l.1066). */
export function altaDeLocal<E extends EstadoPartida>(estado: E, datos: DatosLocal, sello: Sello): Creado<E> {
  const hoy = estado.partida.fechaActual
  const id = sello.nuevoId()
  const local: LocalComercial = {
    id,
    dominioId: datos.dominioId,
    nombre: datos.nombre,
    tipoId: datos.tipoId,
    produccionHabitual: datos.produccionHabitual,
    cambiosEstado: [{ desde: hoy, estado: datos.estado }],
    alta: hoy,
    cobradoHasta: mesAnterior(mesDe(hoy)),
    producciones: [],
  }
  if (datos.titularId !== undefined) {
    local.titularId = datos.titularId
  }
  if (datos.notas !== undefined) {
    local.notas = datos.notas
  }
  return { estado: { ...estado, localesComerciales: [...estado.localesComerciales, local] }, id }
}

/**
 * Abre o cierra un local desde mañana: añade, cambia o quita el tramo de mañana (§6.4 l.675). Si el estado
 * elegido es el que tiene hoy, el tramo de mañana sobra y se quita.
 */
export function cambiarEstadoDeLocal<E extends EstadoPartida>(
  estado: E,
  localId: Id,
  nuevo: EstadoLocal,
  sello: Sello,
): E {
  const hoy = estado.partida.fechaActual
  const local = buscarPorId(estado.localesComerciales, localId)
  const hastaHoy = local.cambiosEstado.filter((t) => compararFechas(t.desde, hoy) <= 0)
  const cambiosEstado =
    estadoDelLocalEl(local, hoy) === nuevo ? hastaHoy : [...hastaHoy, { desde: sumarDias(hoy, 1), estado: nuevo }]
  return conLocal(estado, { ...local, cambiosEstado }, sello)
}

/** Meses que A3c deja anotar: de cobradoHasta + 1 (nunca antes del alta) al mes actual, el actual primero (§7 l.1085). */
export function mesesParaAnotar(local: LocalComercial, fechaActual: Fecha): AnioMes[] {
  const siguiente = mesSiguiente(local.cobradoHasta)
  const delAlta = mesDe(local.alta)
  const actual = mesDe(fechaActual)
  const meses: AnioMes[] = []
  let mes = compararMeses(siguiente, delAlta) >= 0 ? siguiente : delAlta
  while (compararMeses(mes, actual) <= 0) {
    meses.unshift(mes)
    mes = mesSiguiente(mes)
  }
  return meses
}

/** Anota o cambia la producción de un mes sin cobrar (A3c; §6.4 l.677). */
export function anotarProduccion<E extends EstadoPartida>(
  estado: E,
  localId: Id,
  anotacion: ProduccionMesLocal,
  sello: Sello,
): E {
  const local = buscarPorId(estado.localesComerciales, localId)
  exigeMesAnotable(local, anotacion.mes, estado.partida.fechaActual)
  const delMes = (p: ProduccionMesLocal): boolean => compararMeses(p.mes, anotacion.mes) === 0
  const producciones = local.producciones.some(delMes)
    ? local.producciones.map((p) => (delMes(p) ? anotacion : p))
    : [...local.producciones, anotacion]
  return conLocal(estado, { ...local, producciones }, sello)
}

/** «Usar la habitual»: quita la anotación de ese mes (A3c; §6.4 l.677). */
export function quitarProduccion<E extends EstadoPartida>(estado: E, localId: Id, mes: AnioMes, sello: Sello): E {
  const local = buscarPorId(estado.localesComerciales, localId)
  exigeMesAnotable(local, mes, estado.partida.fechaActual)
  const producciones = local.producciones.filter((p) => compararMeses(p.mes, mes) !== 0)
  return conLocal(estado, { ...local, producciones }, sello)
}

/** Quita el localId de las entradas de ese local en los cobros de locales; sin editadoEl (§6.4 l.784; T31). */
function soltarDetalle(movimientos: Movimiento[], localId: Id): Movimiento[] {
  const delLocal = (d: DetalleLocal): boolean => d.localId === localId
  const apunta = (m: Movimiento): boolean => (m.detalleLocales ?? []).some(delLocal)
  if (!movimientos.some(apunta)) {
    return movimientos
  }
  return movimientos.map((m) => {
    if (!apunta(m) || m.detalleLocales === undefined) {
      return m
    }
    const detalleLocales = m.detalleLocales.map((d) => {
      if (!delLocal(d)) {
        return d
      }
      const sinLocal = { ...d }
      delete sinLocal.localId
      return sinLocal
    })
    return { ...m, detalleLocales }
  })
}

/** Elimina un local: sus producciones se van con él y sus cobros pasados conservan el nombre, sin localId (§6.4 l.784). */
export function eliminarLocalComercial<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.localesComerciales, id)
  return {
    ...estado,
    movimientos: soltarDetalle(estado.movimientos, id),
    localesComerciales: quitarPorId(estado.localesComerciales, id),
  }
}

/** «Herrería tiene 1 local: cámbialo de tipo antes», o null si el tipo no tiene locales (§6.4 l.783; D-041). */
export function bloqueoAlEliminarTipoLocal(estado: EstadoPartida, tipoId: Id): string | null {
  const tipo = buscarPorId(estado.tiposLocal, tipoId)
  const locales = estado.localesComerciales.filter((l) => l.tipoId === tipoId).length
  if (locales === 0) {
    return null
  }
  return locales === 1
    ? `${tipo.nombre} tiene 1 local: cámbialo de tipo antes`
    : `${tipo.nombre} tiene ${locales} locales: cámbialos de tipo antes`
}

/** Elimina un tipo de local sin locales; si tiene, lanza el texto del bloqueo (§6.4 l.783). */
export function eliminarTipoLocal<E extends EstadoPartida>(estado: E, tipoId: Id): E {
  const bloqueo = bloqueoAlEliminarTipoLocal(estado, tipoId)
  if (bloqueo !== null) {
    throw new Error(bloqueo)
  }
  return { ...estado, tiposLocal: quitarPorId(estado.tiposLocal, tipoId) }
}
