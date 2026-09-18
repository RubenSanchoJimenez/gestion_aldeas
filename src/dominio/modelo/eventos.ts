import * as z from 'zod'
import { CAMPOS_REGISTRO, EsquemaFecha, EsquemaId, EsquemaNombreLibre, EsquemaNotas, decimalesComoMucho, exige } from './comunes'

/** Porcentaje de un efecto de evento (§7). Puede ser negativo, nunca por debajo de −100 (decisión propia 5). */
export const EsquemaPctEvento = z.number().min(-100).check(decimalesComoMucho(2))

/**
 * Efecto de un evento narrativo (§8, selectores n.º 28 y 29). La unión por ámbito fija qué objetivos admite cada
 * uno; «costes» no apunta a ningún registro, sino a una de las cuatro categorías de coste de n.º 29.
 * Los locales comerciales no son objetivo (§7).
 */
export const EsquemaEfectoEvento = z.discriminatedUnion('ambito', [
  z.object({
    ambito: z.literal('produccion'),
    objetivo: z.discriminatedUnion('tipo', [
      z.object({ tipo: z.literal('todos') }),
      z.object({ tipo: z.literal('edificio'), id: EsquemaId }),
    ]),
    pct: EsquemaPctEvento,
  }),
  z.object({
    ambito: z.literal('consumo'),
    objetivo: z.discriminatedUnion('tipo', [
      z.object({ tipo: z.literal('todos') }),
      z.object({ tipo: z.literal('recurso'), id: EsquemaId }),
    ]),
    pct: EsquemaPctEvento,
  }),
  z.object({
    ambito: z.literal('costes'),
    objetivo: z.discriminatedUnion('tipo', [
      z.object({ tipo: z.literal('todos') }),
      z.object({ tipo: z.literal('categoriaCoste'), id: z.enum(['salarios', 'soldadas', 'tributos', 'gastos']) }),
    ]),
    pct: EsquemaPctEvento,
  }),
  z.object({
    ambito: z.literal('ingresos'),
    objetivo: z.discriminatedUnion('tipo', [
      z.object({ tipo: z.literal('todos') }),
      z.object({ tipo: z.literal('impuesto'), id: EsquemaId }),
    ]),
    pct: EsquemaPctEvento,
  }),
])
export type EfectoEvento = z.infer<typeof EsquemaEfectoEvento>

/** Un evento narrativo, de un asentamiento o de la partida (§8). Fin = inicio + duracionDias − 1. */
export const EsquemaEventoNarrativo = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId.optional(),
    nombre: EsquemaNombreLibre,
    inicio: EsquemaFecha,
    duracionDias: z.int().min(1),
    efectos: z.array(EsquemaEfectoEvento),
    notas: EsquemaNotas.optional(),
  })
  .check(
    exige(
      (e) => e.dominioId !== undefined || e.efectos.length === 0,
      'Un evento de partida no tiene efectos económicos',
    ),
  )
export type EventoNarrativo = z.infer<typeof EsquemaEventoNarrativo>
