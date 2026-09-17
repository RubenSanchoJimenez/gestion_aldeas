import * as z from 'zod'
import {
  CAMPOS_EDICION,
  CAMPOS_REGISTRO,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporteMagnitud,
  EsquemaNombreLibre,
  EsquemaNotas,
} from './comunes'

/** El personaje de la partida: solo hay uno (§8). */
export const EsquemaDominioPersonaje = z.object({
  ...CAMPOS_REGISTRO,
  tipo: z.literal('personaje'),
  nombre: EsquemaNombreLibre,
  descripcion: EsquemaNotas.optional(),
})

/** Un asentamiento (§6.3). `alta` es la fecha actual al crearlo, y en P1 la fecha inicial (decisión propia 8). */
export const EsquemaDominioAsentamiento = z.object({
  ...CAMPOS_REGISTRO,
  tipo: z.literal('asentamiento'),
  nombre: EsquemaNombreLibre,
  categoria: z.enum(['aldea', 'pueblo', 'ciudad']),
  alta: EsquemaFecha,
})

export const EsquemaDominio = z.discriminatedUnion('tipo', [EsquemaDominioPersonaje, EsquemaDominioAsentamiento])
export type Dominio = z.infer<typeof EsquemaDominio>
export type DominioPersonaje = z.infer<typeof EsquemaDominioPersonaje>
export type DominioAsentamiento = z.infer<typeof EsquemaDominioAsentamiento>

/** Bolsa del personaje o caja de un asentamiento, una por dominio (§8). El saldo se calcula y no se guarda (§7). */
export const EsquemaCaja = z.object({
  ...CAMPOS_EDICION,
  dominioId: EsquemaId,
  saldoInicial: EsquemaImporteMagnitud,
})
export type Caja = z.infer<typeof EsquemaCaja>
