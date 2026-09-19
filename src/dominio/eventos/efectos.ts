import { aNumeroDeDia, type Fecha } from '../calendario/fecha'
import { porcentajeDe } from '../dinero/importe'
import type { Id } from '../modelo/comunes'
import type { EventoNarrativo } from '../modelo/eventos'

/** Las cuatro categorías de coste de un efecto (§6.5 n.º 29). */
export type CategoriaCoste = 'salarios' | 'soldadas' | 'tributos' | 'gastos'

/** Si el evento está activo ese día: inicio ≤ día ≤ inicio + duracionDias − 1 (§8; modelo/eventos.ts l.48). */
export function eventoActivoEl(evento: EventoNarrativo, dia: Fecha): boolean {
  const inicio = aNumeroDeDia(evento.inicio)
  const numero = aNumeroDeDia(dia)
  return inicio <= numero && numero <= inicio + evento.duracionDias - 1
}

/**
 * Los eventos de asentamiento activos ese día con algún efecto, de cualquier ámbito (§9 l.1273; TC5). Sustituye a
 * eventosDeDineroEl, que se borra. Un evento de partida no cuenta aunque una copia lo trajera con efectos.
 */
export function eventosConEfectosEl(eventos: readonly EventoNarrativo[], dia: Fecha): EventoNarrativo[] {
  return eventos.filter((e) => e.dominioId !== undefined && e.efectos.length > 0 && eventoActivoEl(e, dia))
}

/** Suma de los % de producción de ese asentamiento: los de «todos» y los de ese edificio (§7 l.1116). */
export function pctDeProduccion(activos: readonly EventoNarrativo[], dominioId: Id, edificioId: Id): number {
  let pct = 0
  for (const evento of activos) {
    if (evento.dominioId !== dominioId) {
      continue
    }
    for (const efecto of evento.efectos) {
      if (efecto.ambito === 'produccion' && (efecto.objetivo.tipo === 'todos' || efecto.objetivo.id === edificioId)) {
        pct += efecto.pct
      }
    }
  }
  return pct
}

/** Suma de los % de consumo de ese asentamiento: los de «todos» y los de ese recurso, víveres incluidos (§7 l.1139). */
export function pctDeConsumo(activos: readonly EventoNarrativo[], dominioId: Id, recursoId: Id): number {
  let pct = 0
  for (const evento of activos) {
    if (evento.dominioId !== dominioId) {
      continue
    }
    for (const efecto of evento.efectos) {
      if (efecto.ambito === 'consumo' && (efecto.objetivo.tipo === 'todos' || efecto.objetivo.id === recursoId)) {
        pct += efecto.pct
      }
    }
  }
  return pct
}

/** Suma de los % de costes de un asentamiento sobre una categoría: los de «todos» y los de esa categoría (§7 l.1139). */
export function pctDeCostes(activos: readonly EventoNarrativo[], dominioId: Id, categoria: CategoriaCoste): number {
  let pct = 0
  for (const evento of activos) {
    if (evento.dominioId !== dominioId) {
      continue
    }
    for (const efecto of evento.efectos) {
      if (efecto.ambito === 'costes' && (efecto.objetivo.tipo === 'todos' || efecto.objetivo.id === categoria)) {
        pct += efecto.pct
      }
    }
  }
  return pct
}

/**
 * Suma de los % de ingresos de un asentamiento sobre un impuesto o renta: «todos» y ese impuesto (§7 l.1139, D-026).
 * «Todos los ingresos» son sus impuestos y rentas: los locales no cambian con un evento (§7).
 */
export function pctDeIngresos(activos: readonly EventoNarrativo[], dominioId: Id, impuestoId: Id): number {
  let pct = 0
  for (const evento of activos) {
    if (evento.dominioId !== dominioId) {
      continue
    }
    for (const efecto of evento.efectos) {
      if (efecto.ambito === 'ingresos' && (efecto.objetivo.tipo === 'todos' || efecto.objetivo.id === impuestoId)) {
        pct += efecto.pct
      }
    }
  }
  return pct
}

/**
 * base × máx(0, 1 + pct / 100), redondeado al mh con las mitades hacia arriba: porcentajeDe(base, máx(0, 100 + pct))
 * (§9, «Fórmulas»). La suma de varios eventos puede bajar de −100 %: el importe se queda en 0, nunca negativo.
 */
export function conEfecto(base: number, pct: number): number {
  return porcentajeDe(base, Math.max(0, 100 + pct))
}
