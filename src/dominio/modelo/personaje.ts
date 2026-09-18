import * as z from 'zod'
import {
  CAMPOS_REGISTRO,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporteMagnitud,
  EsquemaNombreLargo,
  EsquemaNombreLibre,
  EsquemaNotas,
  EsquemaPorcentaje,
  EsquemaRecurrencia,
  EsquemaUbicacionObjeto,
  exige,
} from './comunes'

/**
 * Por qué un objeto está archivado y fuera del patrimonio (decisión 13). El filtro «Vendidos» de J3 muestra
 * solo «vendido»; «consumido» y «perdido» los ponen los pergaminos; «eliminado» queda reservado para el objeto
 * que el jugador quita del inventario y se conserva archivado porque una venta o un intento lo nombra
 * (decisión propia 13).
 */
export const EsquemaMotivoArchivado = z.enum(['vendido', 'consumido', 'perdido', 'eliminado'])
export type MotivoArchivado = z.infer<typeof EsquemaMotivoArchivado>

/** Una fila del inventario del personaje (§8). */
export const EsquemaObjetoInventario = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    nombre: EsquemaNombreLibre,
    cantidad: z.int().min(0),
    valorUnitario: EsquemaImporteMagnitud,
    ubicacion: EsquemaUbicacionObjeto,
    notas: EsquemaNotas.optional(),
    movimientoCompraId: EsquemaId.optional(),
    archivado: EsquemaMotivoArchivado.optional(),
  })
  .check(exige((o) => o.archivado !== undefined || o.cantidad >= 1, 'Un objeto sin archivar tiene al menos 1 unidad'))
export type ObjetoInventario = z.infer<typeof EsquemaObjetoInventario>

/** Venta de unidades de un objeto (§8). Si el objeto se elimina, la venta conserva su nombre y su valor (§6.4). */
export const EsquemaVenta = z.object({
  ...CAMPOS_REGISTRO,
  objetoId: EsquemaId.optional(),
  nombre: EsquemaNombreLibre,
  valorAnotado: EsquemaImporteMagnitud,
  cantidad: z.int().min(1),
  precioUnitario: EsquemaImporteMagnitud,
  compradorId: EsquemaId.optional(),
  movimientoId: EsquemaId,
})
export type Venta = z.infer<typeof EsquemaVenta>

/** Campos comunes de una inversión (§8). El negocio se comparte por nombre normalizado (§6.6, patrón 4). */
const CAMPOS_INVERSION = {
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  negocio: EsquemaNombreLargo,
  descripcion: EsquemaNotas.optional(),
  capital: EsquemaImporteMagnitud,
  participacionPct: EsquemaPorcentaje,
  beneficio: EsquemaImporteMagnitud,
  recurrencia: EsquemaRecurrencia,
  cuentaCapitalId: EsquemaId.optional(),
  cuentaBeneficiosId: EsquemaId,
}

/** Inversión activa o retirada (§8). Los beneficios cobrados son los movimientos con su inversionId. */
export const EsquemaInversion = z.discriminatedUnion('estado', [
  z.object({ ...CAMPOS_INVERSION, estado: z.literal('activa') }),
  z.object({
    ...CAMPOS_INVERSION,
    estado: z.literal('retirada'),
    retirada: z.object({ fecha: EsquemaFecha, importe: EsquemaImporteMagnitud, movimientoId: EsquemaId }),
  }),
])
export type Inversion = z.infer<typeof EsquemaInversion>

/** Un hechizo del personaje (§7, §8). El nombre es único en el personaje. */
export const EsquemaHechizo = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    nombre: EsquemaNombreLargo,
    lista: z.string().min(1).max(60).optional(),
    reino: z.enum(['esencia', 'canalizacion', 'mentalismo', 'hibrido']).optional(),
    nivel: z.int().min(1).max(50).optional(),
    estado: z.enum(['enEstudio', 'aprendido']),
    aprendidoEl: EsquemaFecha.optional(),
    notas: EsquemaNotas.optional(),
  })
  .check(
    exige(
      (h) => (h.estado === 'aprendido') === (h.aprendidoEl !== undefined),
      '«Aprendido el» es obligatorio con «Aprendido» y se borra al volver a «En estudio»',
    ),
  )
export type Hechizo = z.infer<typeof EsquemaHechizo>

/**
 * Un intento de aprendizaje (§7, §8). `pergaminoEliminado` guarda «con un pergamino eliminado» (§6.4):
 * decisión propia 14.
 */
export const EsquemaIntentoAprendizaje = z
  .object({
    ...CAMPOS_REGISTRO,
    hechizoId: EsquemaId,
    fecha: EsquemaFecha,
    resultado: z.enum(['bueno', 'malo']),
    pergaminoId: EsquemaId.optional(),
    pergaminoConsumido: z.boolean(),
    pergaminoEliminado: z.boolean().optional(),
    notas: EsquemaNotas.optional(),
  })
  .check(
    exige(
      (i) => !i.pergaminoConsumido || i.pergaminoId !== undefined,
      'Solo se marca «El pergamino se consume» con un pergamino elegido',
    ),
    exige(
      (i) => i.pergaminoEliminado !== true || i.pergaminoId === undefined,
      'Un intento con un pergamino eliminado ya no guarda su pergaminoId',
    ),
  )
export type IntentoAprendizaje = z.infer<typeof EsquemaIntentoAprendizaje>

/** Un pergamino (§7, §8). El valor y la ubicación viven en su objeto del inventario. */
export const EsquemaPergamino = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    hechizoId: EsquemaId.optional(),
    nombre: EsquemaNombreLargo,
    nivel: z.int().min(1).max(50).optional(),
    estado: z.enum(['poseido', 'consumido', 'perdido', 'vendido']),
    consumidoEl: EsquemaFecha.optional(),
    objetoInventarioId: EsquemaId.optional(),
    movimientoCompraId: EsquemaId.optional(),
  })
  .check(
    exige(
      (p) => (p.estado === 'consumido') === (p.consumidoEl !== undefined),
      'La fecha de consumo va si y solo si el pergamino está consumido',
    ),
  )
export type Pergamino = z.infer<typeof EsquemaPergamino>
