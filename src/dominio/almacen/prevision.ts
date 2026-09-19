import { diasQueCaben } from '../avance/dias'
import { ANIO_MAXIMO, aNumeroDeDia, compararFechas, diasEntre, sumarDias, type Fecha } from '../calendario/fecha'
import { siguienteOcurrencia } from '../calendario/recurrencia'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Existencia, ProduccionRealizada } from '../modelo/almacen'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import type { FlujoAlmacen } from '../motor/tipos'
import { claveExistencia, esCero, TOLERANCIA } from './cantidades'

/** La previsión a 30 días de A8 y de los avisos (§7 l.1105). */
export const DIAS_DE_PREVISION = 30

/** Hasta dónde se buscan los días de reserva (D-062). */
export const HORIZONTE_DE_RESERVA = 366

/** Una simulación sin guardar desde la fecha actual (§9 l.1322; TC14). */
export interface PrevisionAlmacen {
  hoy: Fecha
  /** El último día simulado (hoy si no cabe ninguno). */
  hasta: Fecha
  inicial: Existencia[]
  final: Existencia[]
  flujos: FlujoAlmacen[]
  /** Las producciones que ocurrirían (avanceId 'prev'). */
  producciones: ProduccionRealizada[]
}

/** recorrerDias(estado, hoy + diasQueCaben(hoy, dias), { avanceId: 'prev', nuevoId: idsEnSerie('prev'), catalogo }). */
export function preverAlmacen(estado: EstadoPartida, catalogo: CatalogosEnCopia, dias: number): PrevisionAlmacen {
  const hoy = estado.partida.fechaActual
  const hasta = sumarDias(hoy, diasQueCaben(hoy, dias))
  const recorrido = recorrerDias(estado, hasta, { avanceId: 'prev', nuevoId: idsEnSerie('prev'), catalogo })
  return {
    hoy,
    hasta: recorrido.estadoNuevo.partida.fechaActual,
    inicial: estado.existencias,
    final: recorrido.estadoNuevo.existencias,
    flujos: recorrido.flujos,
    producciones: recorrido.estadoNuevo.produccionesRealizadas.filter((p) => p.avanceId === 'prev'),
  }
}

/** Lo que pasa en una fila durante una previsión o un avance (A8, P4, avisos). */
export interface ResumenFila {
  dominioId: Id
  recursoId: Id
  inicial: number
  final: number
  entradas: number
  perdido: number
  consumido: number
  sacado: number
  consumoTeorico: number
  /** consumoTeorico − consumido; 0 si no llega a TOLERANCIA. */
  falta: number
  /** Días seguidos con falta (> TOLERANCIA), en orden. */
  tramosDeFalta: { desde: Fecha; hasta: Fecha }[]
  primeraPerdida?: { fecha: Fecha; cantidad: number }
  diasConPerdida: number
}

/** Una fila por cada fila de `final`, en su orden, y detrás las que solo salen en los flujos (TC10); inicial/final 0 si faltan. */
export function resumirFilas(
  inicial: readonly Existencia[],
  final: readonly Existencia[],
  flujos: readonly FlujoAlmacen[],
): ResumenFila[] {
  const claves: string[] = []
  const vistos = new Set<string>()
  const idsPorClave = new Map<string, { dominioId: Id; recursoId: Id }>()
  for (const fila of final) {
    const clave = claveExistencia(fila.dominioId, fila.recursoId)
    if (!vistos.has(clave)) {
      vistos.add(clave)
      claves.push(clave)
      idsPorClave.set(clave, { dominioId: fila.dominioId, recursoId: fila.recursoId })
    }
  }
  for (const flujo of flujos) {
    const clave = claveExistencia(flujo.dominioId, flujo.recursoId)
    if (!vistos.has(clave)) {
      vistos.add(clave)
      claves.push(clave)
      idsPorClave.set(clave, { dominioId: flujo.dominioId, recursoId: flujo.recursoId })
    }
  }
  const inicialPorClave = new Map(inicial.map((e) => [claveExistencia(e.dominioId, e.recursoId), e.cantidad]))
  const finalPorClave = new Map(final.map((e) => [claveExistencia(e.dominioId, e.recursoId), e.cantidad]))

  return claves.map((clave) => {
    const { dominioId, recursoId } = idsPorClave.get(clave) as { dominioId: Id; recursoId: Id }
    const filaFlujos = flujos
      .filter((f) => claveExistencia(f.dominioId, f.recursoId) === clave)
      .sort((a, b) => aNumeroDeDia(a.fecha) - aNumeroDeDia(b.fecha))
    let entradas = 0
    let perdido = 0
    let consumido = 0
    let sacado = 0
    let consumoTeorico = 0
    const tramosDeFalta: { desde: Fecha; hasta: Fecha; numeroHasta: number }[] = []
    let primeraPerdida: { fecha: Fecha; cantidad: number } | undefined
    let diasConPerdida = 0
    for (const flujo of filaFlujos) {
      entradas += flujo.entradas
      perdido += flujo.perdido
      consumido += flujo.consumido
      sacado += flujo.sacado
      consumoTeorico += flujo.consumoTeorico
      const numero = aNumeroDeDia(flujo.fecha)
      const faltaDia = flujo.consumoTeorico - flujo.consumido
      if (!esCero(faltaDia)) {
        const ultimo = tramosDeFalta[tramosDeFalta.length - 1]
        if (ultimo !== undefined && numero === ultimo.numeroHasta + 1) {
          ultimo.hasta = flujo.fecha
          ultimo.numeroHasta = numero
        } else {
          tramosDeFalta.push({ desde: flujo.fecha, hasta: flujo.fecha, numeroHasta: numero })
        }
      }
      if (!esCero(flujo.perdido)) {
        diasConPerdida += 1
        if (primeraPerdida === undefined) {
          primeraPerdida = { fecha: flujo.fecha, cantidad: flujo.perdido }
        }
      }
    }
    const falta = consumoTeorico - consumido
    return {
      dominioId,
      recursoId,
      inicial: inicialPorClave.get(clave) ?? 0,
      final: finalPorClave.get(clave) ?? 0,
      entradas,
      perdido,
      consumido,
      sacado,
      consumoTeorico,
      falta: esCero(falta) ? 0 : falta,
      tramosDeFalta: tramosDeFalta.map(({ desde, hasta }) => ({ desde, hasta })),
      primeraPerdida,
      diasConPerdida,
    }
  })
}

export type Reserva = { tipo: 'sinConsumo' } | { tipo: 'sinFalta' } | { tipo: 'dias'; dias: number; fecha: Fecha }
export interface ReservaDeFila {
  dominioId: Id
  recursoId: Id
  reserva: Reserva
}

/** Con una previsión de HORIZONTE_DE_RESERVA: sin consumo teórico → sinConsumo; con falta → días hasta el primer día con falta; si no, sinFalta (§7 l.1104; D-062). */
export function diasDeReserva(estado: EstadoPartida, catalogo: CatalogosEnCopia): ReservaDeFila[] {
  const prevision = preverAlmacen(estado, catalogo, HORIZONTE_DE_RESERVA)
  const resumen = resumirFilas(estado.existencias, prevision.final, prevision.flujos)
  return resumen.map((fila): ReservaDeFila => {
    if (esCero(fila.consumoTeorico)) {
      return { dominioId: fila.dominioId, recursoId: fila.recursoId, reserva: { tipo: 'sinConsumo' } }
    }
    if (fila.tramosDeFalta.length === 0) {
      return { dominioId: fila.dominioId, recursoId: fila.recursoId, reserva: { tipo: 'sinFalta' } }
    }
    const fecha = fila.tramosDeFalta[0].desde
    const dias = diasEntre(estado.partida.fechaActual, fecha)
    return { dominioId: fila.dominioId, recursoId: fila.recursoId, reserva: { tipo: 'dias', dias, fecha } }
  })
}

/** Lo que cabe al acabar ese día (A10b: «Caben 1.148 más el día de llegada»); null sin capacidad. Con fecha ≤ hoy, cabenMas de hoy. */
export function cabenElDia(
  estado: EstadoPartida,
  catalogo: CatalogosEnCopia,
  dominioId: Id,
  recursoId: Id,
  fecha: Fecha,
): number | null {
  const hoy = estado.partida.fechaActual
  if (compararFechas(fecha, hoy) <= 0) {
    const fila = estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
    return cabenMasDe(fila)
  }
  const dias = diasEntre(hoy, fecha)
  const prevision = preverAlmacen(estado, catalogo, dias)
  const fila = prevision.final.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
  return cabenMasDe(fila)
}

function cabenMasDe(fila: Pick<Existencia, 'cantidad' | 'capacidad'> | undefined): number | null {
  if (fila === undefined) {
    return null
  }
  if (fila.capacidad === undefined) {
    return null
  }
  return Math.max(0, Math.floor(fila.capacidad - fila.cantidad + TOLERANCIA))
}

/** La próxima vez de cada producción de un edificio, con lo que produciría y lo que no cabría (A7, A7b; §7 l.1137-1138). */
export interface ProximaProduccion {
  produccionId: Id
  recursoId: Id
  /** siguienteOcurrencia desde hoy; null si pasa del 31 de diciembre de 9999. */
  fecha: Fecha | null
  /** Producido (entra + se pierde); sin la clave si la fecha cae a más de 366 días (D-004). */
  cantidad?: number
  perdida?: number
}

/**
 * Simula una sola vez hasta la más lejana de sus fechas que quepa en 366 días y lee las `producciones` de la
 * previsión con ese `produccionId` y esa fecha; si no hay ninguna (produjo 0), `cantidad: 0, perdida: 0`.
 */
export function proximasProducciones(estado: EstadoPartida, catalogo: CatalogosEnCopia, edificioId: Id): ProximaProduccion[] {
  const edificio = estado.edificios.find((e) => e.id === edificioId)
  if (edificio === undefined) {
    return []
  }
  const hoy = estado.partida.fechaActual
  const fechas = new Map<Id, Fecha | null>()
  let maxDias = 0
  for (const produccion of edificio.producciones) {
    let fecha = siguienteOcurrencia(produccion.recurrencia, hoy)
    if (fecha !== null && fecha.anio > ANIO_MAXIMO) {
      fecha = null
    }
    fechas.set(produccion.id, fecha)
    if (fecha !== null) {
      const dias = diasEntre(hoy, fecha)
      if (dias <= HORIZONTE_DE_RESERVA && dias > maxDias) {
        maxDias = dias
      }
    }
  }
  const prevision = preverAlmacen(estado, catalogo, maxDias)
  return edificio.producciones.map((produccion): ProximaProduccion => {
    const fecha = fechas.get(produccion.id) ?? null
    if (fecha === null) {
      return { produccionId: produccion.id, recursoId: produccion.recursoId, fecha: null }
    }
    const dias = diasEntre(hoy, fecha)
    if (dias > HORIZONTE_DE_RESERVA) {
      return { produccionId: produccion.id, recursoId: produccion.recursoId, fecha }
    }
    const encontrada = prevision.producciones.find(
      (p) => p.produccionId === produccion.id && compararFechas(p.fecha, fecha) === 0,
    )
    return {
      produccionId: produccion.id,
      recursoId: produccion.recursoId,
      fecha,
      cantidad: (encontrada?.cantidad ?? 0) + (encontrada?.perdida ?? 0),
      perdida: encontrada?.perdida ?? 0,
    }
  })
}
