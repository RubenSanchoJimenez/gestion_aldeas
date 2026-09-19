import { claveExistencia, TOLERANCIA } from '../almacen/cantidades'
import type { Existencia } from '../modelo/almacen'
import type { Id } from '../modelo/comunes'
import type { Contexto, Dia } from './contexto'
import type { FlujoAlmacen } from './tipos'

/** La fila viva; undefined si el almacén no la tiene. */
export function filaEn(ctx: Contexto, dominioId: Id, recursoId: Id): Existencia | undefined {
  return ctx.existencias.get(claveExistencia(dominioId, recursoId))
}

/** El flujo de ese día y fila; lo crea a 0 (cantidad = la de la fila, o 0) la primera vez. */
export function flujoDe(ctx: Contexto, dia: Dia, dominioId: Id, recursoId: Id): FlujoAlmacen {
  const clave = `${dia.numero}|${claveExistencia(dominioId, recursoId)}`
  const indice = ctx.indiceFlujo.get(clave)
  if (indice !== undefined) {
    return ctx.flujos[indice]
  }
  const flujo: FlujoAlmacen = {
    dominioId,
    recursoId,
    fecha: dia.fecha,
    entradas: 0,
    perdido: 0,
    consumido: 0,
    sacado: 0,
    consumoTeorico: 0,
    cantidad: filaEn(ctx, dominioId, recursoId)?.cantidad ?? 0,
  }
  ctx.indiceFlujo.set(clave, ctx.flujos.length)
  ctx.flujos.push(flujo)
  return flujo
}

/**
 * Suma al almacén con la capacidad (§7 l.1107): crea la fila si falta (0, sin capacidad; TC10); lo que pasa de la
 * capacidad se pierde y la fila queda en la capacidad exacta. Anota entradas y perdido. Devuelve lo que entró y lo
 * perdido.
 */
export function sumarAlAlmacen(
  ctx: Contexto,
  dia: Dia,
  dominioId: Id,
  recursoId: Id,
  cantidad: number,
): { entra: number; perdida: number } {
  const clave = claveExistencia(dominioId, recursoId)
  const fila = ctx.existencias.get(clave)
  const actual = fila?.cantidad ?? 0
  const capacidad = fila?.capacidad
  let entra: number
  let perdida: number
  let nueva: number
  if (capacidad === undefined) {
    entra = cantidad
    perdida = 0
    nueva = actual + cantidad
  } else {
    const hueco = Math.max(0, capacidad - actual)
    if (cantidad <= hueco) {
      entra = cantidad
      perdida = 0
      nueva = actual + cantidad
    } else {
      entra = hueco
      perdida = cantidad - hueco
      nueva = capacidad
    }
  }
  ctx.existencias.set(clave, fila === undefined ? { dominioId, recursoId, cantidad: nueva } : { ...fila, cantidad: nueva })
  const flujo = flujoDe(ctx, dia, dominioId, recursoId)
  flujo.entradas += entra
  flujo.perdido += perdida
  flujo.cantidad = nueva
  return { entra, perdida }
}

/**
 * Consumo de la población (§9 l.1297): sirve lo que haya y para en 0; si lo que falta no llega a TOLERANCIA, cuenta
 * servido entero. Anota consumoTeorico y consumido. No crea la fila. Devuelve lo servido. Precondición: pedido > 0.
 */
export function consumirDelAlmacen(ctx: Contexto, dia: Dia, dominioId: Id, recursoId: Id, pedido: number): number {
  const clave = claveExistencia(dominioId, recursoId)
  const fila = ctx.existencias.get(clave)
  const actual = fila?.cantidad ?? 0
  const servido = pedido - actual < TOLERANCIA ? pedido : actual
  let nueva = actual - servido
  if (Math.abs(nueva) < TOLERANCIA) {
    nueva = 0
  }
  if (fila !== undefined) {
    ctx.existencias.set(clave, { ...fila, cantidad: nueva })
  }
  const flujo = flujoDe(ctx, dia, dominioId, recursoId)
  flujo.consumoTeorico += pedido
  flujo.consumido += servido
  flujo.cantidad = nueva
  return servido
}

/** Si hay de cada recurso al menos lo pedido (menos TOLERANCIA). */
export function hayDeTodo(ctx: Contexto, dominioId: Id, cantidades: Readonly<Record<Id, number>>): boolean {
  return Object.entries(cantidades).every(([recursoId, cantidad]) => {
    const disponible = filaEn(ctx, dominioId, recursoId)?.cantidad ?? 0
    return disponible - cantidad > -TOLERANCIA
  })
}

/** Saca entero (materiales o carga) y anota sacado; si no hay bastante, no saca nada y devuelve false. */
export function sacarDelAlmacen(ctx: Contexto, dia: Dia, dominioId: Id, recursoId: Id, cantidad: number): boolean {
  const clave = claveExistencia(dominioId, recursoId)
  const fila = ctx.existencias.get(clave)
  const actual = fila?.cantidad ?? 0
  if (actual - cantidad < -TOLERANCIA) {
    return false
  }
  let nueva = actual - cantidad
  if (Math.abs(nueva) < TOLERANCIA) {
    nueva = 0
  }
  if (fila !== undefined) {
    ctx.existencias.set(clave, { ...fila, cantidad: nueva })
  }
  const flujo = flujoDe(ctx, dia, dominioId, recursoId)
  flujo.sacado += cantidad
  flujo.cantidad = nueva
  return true
}
