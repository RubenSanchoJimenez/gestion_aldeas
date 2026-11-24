import * as z from 'zod'
import {
  CAMPOS_REGISTRO,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporteMagnitud,
  EsquemaNotas,
  EsquemaPorcentaje,
  EsquemaRecurrencia,
  exige,
} from './comunes'

/** «Se aplica a» de un pago: los tres segmentos de J4b (selector n.º 11, §6.5). */
export const EsquemaAplicarPagoA = z.enum(['interesesYCapital', 'soloCapital', 'soloIntereses'])
export type AplicarPagoA = z.infer<typeof EsquemaAplicarPagoA>

/** Un pago o cobro anotado en una deuda (J4b, §8). La cuenta es el dominioId de su movimiento. */
export const EsquemaPagoDeuda = z.object({
  ...CAMPOS_REGISTRO,
  fecha: EsquemaFecha,
  importe: EsquemaImporteMagnitud,
  aplicarA: EsquemaAplicarPagoA,
  movimientoId: EsquemaId,
})
export type PagoDeuda = z.infer<typeof EsquemaPagoDeuda>

/** Un interés ya sumado, con el avance que lo sumó (§7). Un pago con fecha anterior no lo recalcula. */
export const EsquemaDevengo = z.object({
  fecha: EsquemaFecha,
  importe: EsquemaImporteMagnitud,
  avanceId: EsquemaId,
})
export type Devengo = z.infer<typeof EsquemaDevengo>

/**
 * Un impago sumado a una deuda automática: «acumula los impagos sucesivos mientras esté abierta» (§9).
 * Decisión propia 12: §8 solo tiene `principal` y no guarda cada impago.
 */
export const EsquemaCargoImpago = z.object({
  fecha: EsquemaFecha,
  importe: EsquemaImporteMagnitud,
  avanceId: EsquemaId,
})
export type CargoImpago = z.infer<typeof EsquemaCargoImpago>

/** Qué dejó de pagarse (§9). Hay una deuda de impago abierta por origen (decisión propia 12). */
export const EsquemaOrigenImpago = z.object({
  tipo: z.enum(['salarios', 'soldadas', 'tributo', 'recurrente', 'programado']),
  id: EsquemaId,
})
export type OrigenImpago = z.infer<typeof EsquemaOrigenImpago>

/** Deuda o préstamo del personaje (J4) o de un asentamiento (A2b) (§8). */
export const EsquemaDeuda = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    sentido: z.enum(['debo', 'meDeben']),
    contraparteId: EsquemaId,
    fecha: EsquemaFecha,
    principal: EsquemaImporteMagnitud,
    interesPct: EsquemaPorcentaje,
    recurrenciaInteres: EsquemaRecurrencia.optional(),
    vencimiento: EsquemaFecha.optional(),
    notas: EsquemaNotas.optional(),
    estado: z.enum(['abierta', 'vencida', 'saldada']),
    impago: z.boolean(),
    origenImpago: EsquemaOrigenImpago.optional(),
    cargos: z.array(EsquemaCargoImpago).optional(),
    cuentaAltaId: EsquemaId.optional(),
    pagos: z.array(EsquemaPagoDeuda),
    devengos: z.array(EsquemaDevengo),
  })
  .check(
    exige(
      (d) => (d.interesPct > 0) === (d.recurrenciaInteres !== undefined),
      'La frecuencia del interés va si y solo si el interés es mayor que 0',
    ),
    exige((d) => !d.impago || d.origenImpago !== undefined, 'Una deuda de impago guarda su origen'),
    exige((d) => !d.impago || d.interesPct === 0, 'Una deuda de impago no tiene interés'),
    exige((d) => !d.impago || d.vencimiento === undefined, 'Una deuda de impago no tiene vencimiento'),
    exige((d) => !d.impago || (d.cargos !== undefined && d.cargos.length > 0), 'Una deuda de impago guarda sus cargos'),
    exige(
      (d) => d.impago || (d.origenImpago === undefined && d.cargos === undefined),
      'Solo las deudas de impago llevan origen y cargos',
    ),
    exige((d) => d.estado !== 'vencida' || d.vencimiento !== undefined, 'Una deuda vencida guarda su vencimiento'),
  )
export type Deuda = z.infer<typeof EsquemaDeuda>
