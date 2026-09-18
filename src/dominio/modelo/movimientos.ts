import * as z from 'zod'
import {
  CAMPOS_REGISTRO,
  EsquemaAnioMes,
  EsquemaConcepto,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporte,
  EsquemaImporteMagnitud,
  EsquemaNombreLibre,
  EsquemaNotas,
  EsquemaRecurrencia,
  EsquemaUbicacionObjeto,
  exige,
} from './comunes'

/** Registro del que sale un movimiento vinculado; se edita desde ese registro (§8, l. 1211). */
export const EsquemaVinculo = z.object({
  tipo: z.enum([
    'transferencia',
    'venta',
    'altaDeuda',
    'pagoDeuda',
    'capitalInversion',
    'retiradaInversion',
    'obra',
    'caravana',
    'entradaAlmacen',
    'pergamino',
  ]),
  id: EsquemaId,
})
export type Vinculo = z.infer<typeof EsquemaVinculo>

/**
 * Regla recurrente que creó el movimiento; no es un vínculo y cada ocurrencia se edita suelta con J2c (§8).
 * `salarios`, `soldadas` y `locales` apuntan al dominioId del asentamiento, porque el motor agrupa por
 * asentamiento y día (§9 y decisión 16).
 */
export const EsquemaReglaOrigen = z.object({
  tipo: z.enum(['salarios', 'soldadas', 'tributo', 'impuesto', 'recurrente', 'beneficio', 'locales']),
  id: EsquemaId,
})
export type ReglaOrigen = z.infer<typeof EsquemaReglaOrigen>

/** Una entrada por local y mes cobrado, en el cobro agrupado de impuestos de locales (§8, §7). */
export const EsquemaDetalleLocal = z.object({
  localId: EsquemaId.optional(),
  nombre: EsquemaNombreLibre,
  mes: EsquemaAnioMes,
  produccion: EsquemaImporteMagnitud,
  anotada: z.boolean(),
  impuesto: EsquemaImporteMagnitud,
})
export type DetalleLocal = z.infer<typeof EsquemaDetalleLocal>

/** Una entrada por trabajador o por unidad, en el pago agrupado de salarios o de soldadas (decisión 16). */
export const EsquemaDetalleTrabajo = z.object({
  origenId: EsquemaId.optional(),
  nombre: EsquemaNombreLibre,
  numero: z.int().min(1),
  importe: EsquemaImporteMagnitud,
})
export type DetalleTrabajo = z.infer<typeof EsquemaDetalleTrabajo>

/**
 * Objeto que un gasto programado con «Añadir también al inventario» creará al aplicarse (§7, l. 1173).
 * Decisión propia 9: §8 no tiene dónde guardarlo.
 */
export const EsquemaObjetoPendiente = z.object({
  nombre: EsquemaNombreLibre,
  cantidad: z.int().min(1),
  valorUnitario: EsquemaImporteMagnitud,
  ubicacion: EsquemaUbicacionObjeto,
  notas: EsquemaNotas.optional(),
})
export type ObjetoPendiente = z.infer<typeof EsquemaObjetoPendiente>

/** Una fila del libro de una bolsa o de una caja (§8). Es el único importe con signo del modelo (decisión 18). */
export const EsquemaMovimiento = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    fecha: EsquemaFecha,
    tipo: z.enum(['gasto', 'ingreso', 'transferencia']),
    importe: EsquemaImporte,
    categoriaId: EsquemaId,
    concepto: EsquemaConcepto,
    origen: z.enum(['manual', 'avance']),
    avanceId: EsquemaId.optional(),
    vinculo: EsquemaVinculo.optional(),
    regla: EsquemaReglaOrigen.optional(),
    inversionId: EsquemaId.optional(),
    detalleLocales: z.array(EsquemaDetalleLocal).min(1).optional(),
    detalleTrabajo: z.array(EsquemaDetalleTrabajo).min(1).optional(),
    objetoPendiente: EsquemaObjetoPendiente.optional(),
    programado: z.boolean(),
  })
  .check(
    exige((m) => m.origen !== 'avance' || m.avanceId !== undefined, 'Un movimiento del avance guarda su avanceId'),
    exige((m) => m.tipo !== 'gasto' || m.importe.base <= 0, 'El importe de un gasto no puede ser positivo'),
    exige((m) => m.tipo !== 'ingreso' || m.importe.base >= 0, 'El importe de un ingreso no puede ser negativo'),
    exige(
      (m) => (m.tipo === 'transferencia') === (m.vinculo?.tipo === 'transferencia'),
      'Solo un movimiento de transferencia lleva el vínculo «transferencia», y al revés',
    ),
    exige((m) => m.vinculo === undefined || m.regla === undefined, 'Un movimiento vinculado no sale de una regla'),
    exige(
      (m) => m.detalleLocales === undefined || m.regla?.tipo === 'locales',
      'El detalle por local solo va en el cobro agrupado de impuestos de locales',
    ),
    exige(
      (m) => m.detalleTrabajo === undefined || m.regla?.tipo === 'salarios' || m.regla?.tipo === 'soldadas',
      'El detalle por trabajador solo va en el pago agrupado de salarios o de soldadas',
    ),
    exige(
      (m) => (m.inversionId !== undefined) === (m.regla?.tipo === 'beneficio'),
      'Los beneficios de una inversión guardan su inversionId',
    ),
    exige(
      (m) => m.objetoPendiente === undefined || (m.tipo === 'gasto' && m.programado),
      'El objeto pendiente solo va en un gasto programado',
    ),
  )
export type Movimiento = z.infer<typeof EsquemaMovimiento>

/** Las dos caras de una transferencia entre dos dominios (§8). Cada lado guarda su concepto en su movimiento. */
export const EsquemaTransferencia = z
  .object({
    ...CAMPOS_REGISTRO,
    fecha: EsquemaFecha,
    importe: EsquemaImporteMagnitud,
    saleDeId: EsquemaId,
    entraEnId: EsquemaId,
    movimientoSaleId: EsquemaId,
    movimientoEntraId: EsquemaId,
  })
  .check(
    exige((t) => t.saleDeId !== t.entraEnId, '«Sale de» y «Entra en» deben ser distintos'),
    exige((t) => t.movimientoSaleId !== t.movimientoEntraId, 'Los dos movimientos de una transferencia son distintos'),
  )
export type Transferencia = z.infer<typeof EsquemaTransferencia>

/**
 * Gasto o ingreso recurrente del personaje (J5, §8). `notas` es la segunda línea que muestra J5 y `unidadDiaria`
 * es la palabra de los conceptos diarios («7 noches» frente a «7 días», §9): decisiones propias 10 y 11.
 */
export const EsquemaRecurrenteDinero = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  tipo: z.enum(['gasto', 'ingreso']),
  concepto: EsquemaConcepto,
  importe: EsquemaImporteMagnitud,
  categoriaId: EsquemaId,
  cuentaId: EsquemaId,
  recurrencia: EsquemaRecurrencia,
  activo: z.boolean(),
  notas: EsquemaNotas.optional(),
  unidadDiaria: z.string().min(1).max(20).optional(),
})
export type RecurrenteDinero = z.infer<typeof EsquemaRecurrenteDinero>
