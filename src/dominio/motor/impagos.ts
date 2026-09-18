import type { Fecha } from '../calendario/fecha'
import type { Id } from '../modelo/comunes'
import type { CargoImpago, Deuda, OrigenImpago } from '../modelo/deudas'
import { mismoNombre } from '../texto/normalizar'
import type { CargoAbierto, Contexto } from './contexto'
import { nombreDeContraparte } from './textos'

/** Un impago que hay que anotar (§9 l.1291-1296). */
export interface Impago {
  origen: OrigenImpago
  /** La caja que no llegó (la cuentaId en un gasto de J5). */
  dominioId: Id
  /** Nombre sin ajustar: registrarImpago le pasa nombreDeContraparte. */
  contraparte: string
  fecha: Fecha
  /** Lo que faltó, en mh; mayor que 0. */
  importe: number
}

/**
 * Reutiliza la persona con el mismo nombre normalizado o la crea y la apunta en personasNuevas (§9 l.1295).
 * Solo se llama cuando hay un impago, así que buscar en la lista no pesa en el bucle.
 */
export function personaPara(ctx: Contexto, nombre: string): Id {
  const existente = ctx.personas.find((p) => mismoNombre(p.nombre, nombre))
  if (existente !== undefined) {
    return existente.id
  }
  const persona = { id: ctx.opciones.nuevoId(), nombre }
  ctx.personas.push(persona)
  ctx.personasNuevas.push(persona)
  return persona.id
}

/** Si una deuda es la de impago abierta de ese origen: solo hay una por origen (unicidades.ts). */
function esAbiertaDe(deuda: Deuda, origen: OrigenImpago): boolean {
  return (
    deuda.impago &&
    deuda.estado !== 'saldada' &&
    deuda.origenImpago?.tipo === origen.tipo &&
    deuda.origenImpago.id === origen.id
  )
}

/** Suma un cargo a la deuda de impago abierta de ese origen o la crea (§9 l.1296, T25); devuelve dónde quedó. */
export function registrarImpago(ctx: Contexto, impago: Impago): CargoAbierto {
  const cargo: CargoImpago = {
    fecha: { ...impago.fecha },
    importe: { base: impago.importe },
    avanceId: ctx.opciones.avanceId,
  }
  const indice = ctx.deudas.findIndex((d) => esAbiertaDe(d, impago.origen))
  if (indice >= 0) {
    const abierta = ctx.deudas[indice]
    const cargos = [...(abierta.cargos ?? []), cargo]
    // El principal de una deuda de impago es la suma de sus cargos, sin «introducido» (T25).
    ctx.deudas[indice] = { ...abierta, principal: { base: abierta.principal.base + impago.importe }, cargos }
    return { deudaId: abierta.id, indice: cargos.length - 1 }
  }
  const contraparteId = personaPara(ctx, nombreDeContraparte(impago.contraparte))
  const deuda: Deuda = {
    id: ctx.opciones.nuevoId(),
    dominioId: impago.dominioId,
    sentido: 'debo',
    contraparteId,
    fecha: { ...impago.fecha },
    principal: { base: impago.importe },
    interesPct: 0,
    estado: 'abierta',
    impago: true,
    origenImpago: { ...impago.origen },
    cargos: [cargo],
    pagos: [],
    devengos: [],
  }
  ctx.deudas.push(deuda)
  return { deudaId: deuda.id, indice: 0 }
}

/** Suma más impago a un cargo ya abierto en este avance y al principal de su deuda (D-021). */
export function sumarAlCargo(ctx: Contexto, cargo: CargoAbierto, importe: number): void {
  const indice = ctx.deudas.findIndex((d) => d.id === cargo.deudaId)
  const deuda = ctx.deudas[indice]
  const cargos = deuda?.cargos ?? []
  if (deuda === undefined || cargos[cargo.indice] === undefined) {
    throw new Error(`No existe «${cargo.deudaId}»`)
  }
  ctx.deudas[indice] = {
    ...deuda,
    principal: { base: deuda.principal.base + importe },
    cargos: cargos.map((c, i) => (i === cargo.indice ? { ...c, importe: { base: c.importe.base + importe } } : c)),
  }
}
