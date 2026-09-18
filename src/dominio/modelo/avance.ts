import * as z from 'zod'
import { EsquemaCantidadRecurso, EsquemaFecha, EsquemaId, EsquemaInstante } from './comunes'

/**
 * Un cambio que el avance dejó y que P5 vuelve a pintar al reabrir el resumen desde P2 (decisión 4).
 * P5 enseña: los saldos antes y después por dominio con su número de movimientos, los almacenes antes y
 * después y los hechos destacados («Feria de primavera celebrada · 15 al 17»).
 */
export const EsquemaCambioAvance = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('saldo'),
    dominioId: EsquemaId,
    antes: z.int(),
    despues: z.int(),
    movimientos: z.int().min(0),
  }),
  z.object({
    tipo: z.literal('almacen'),
    dominioId: EsquemaId,
    recursoId: EsquemaId,
    antes: EsquemaCantidadRecurso,
    despues: EsquemaCantidadRecurso,
  }),
  z.object({
    tipo: z.literal('hecho'),
    dominioId: EsquemaId.optional(),
    texto: z.string().min(1).max(200),
  }),
])
export type CambioAvance = z.infer<typeof EsquemaCambioAvance>

/** Los doce tipos de aviso de la tabla de §9, en el mismo orden. */
export const EsquemaTipoAviso = z.enum([
  'faltaDeRecurso',
  'faltaPrevista',
  'impago',
  'deudaVencida',
  'deudaQueVence',
  'pagoNoCubierto',
  'saldoNegativo',
  'obraQueNoPudoEmpezar',
  'caravanaQueNoPudoSalir',
  'edificioTerminadoSinProduccion',
  'mejoraTerminada',
  'recursoPerdido',
])
export type TipoAviso = z.infer<typeof EsquemaTipoAviso>

/** Un aviso guardado con el avance, tal como lo pinta P5 (decisión 4). Sigue vigente hasta el avance siguiente. */
export const EsquemaAvisoAvance = z.object({
  tipo: EsquemaTipoAviso,
  color: z.enum(['rojo', 'ambar']),
  dominioId: EsquemaId.optional(),
  texto: z.string().min(1).max(200),
})
export type AvisoAvance = z.infer<typeof EsquemaAvisoAvance>

/** Un avance ya aplicado, sin su snapshot (§8, decisión 4). El snapshot lo añade documento.ts, solo en el último. */
export const EsquemaAvanceRegistrado = z.object({
  id: EsquemaId,
  desde: EsquemaFecha,
  hasta: EsquemaFecha,
  aplicadoEl: EsquemaInstante,
  cambios: z.array(EsquemaCambioAvance),
  avisos: z.array(EsquemaAvisoAvance),
})
export type AvanceRegistrado = z.infer<typeof EsquemaAvanceRegistrado>
