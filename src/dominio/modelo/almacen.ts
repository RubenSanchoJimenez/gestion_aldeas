import * as z from 'zod'
import {
  CAMPOS_EDICION,
  CAMPOS_REGISTRO,
  EsquemaCantidadRecurso,
  EsquemaConcepto,
  EsquemaFecha,
  EsquemaId,
  EsquemaImportePositivo,
  EsquemaNombreLibre,
  decimalesComoMucho,
  exige,
} from './comunes'

// ---- Población (A4) -------------------------------------------------------

/** Un cambio de población con fecha y motivo (§6.4). Los habitantes son los iniciales más los cambios hasta el día (§7). */
export const EsquemaCambioPoblacion = z
  .object({
    ...CAMPOS_REGISTRO,
    fecha: EsquemaFecha,
    delta: z.int(),
    motivo: EsquemaConcepto,
  })
  .check(exige((c) => c.delta !== 0, 'El cambio de población no puede ser 0'))
export type CambioPoblacion = z.infer<typeof EsquemaCambioPoblacion>

/** Consumo por habitante y día de un recurso que no son los víveres (§6.4, §7). Hasta 4 decimales (§3). */
export const EsquemaConsumoPorHabitante = z.object({
  ...CAMPOS_REGISTRO,
  nombre: EsquemaNombreLibre,
  recursoId: EsquemaId,
  porHabitante: z.number().gt(0).check(decimalesComoMucho(4)),
})
export type ConsumoPorHabitante = z.infer<typeof EsquemaConsumoPorHabitante>

/** La población de un asentamiento, una por dominio (§8). */
export const EsquemaPoblacion = z.object({
  ...CAMPOS_EDICION,
  dominioId: EsquemaId,
  habitantesIniciales: z.int().min(0),
  cambios: z.array(EsquemaCambioPoblacion),
  consumos: z.array(EsquemaConsumoPorHabitante),
})
export type Poblacion = z.infer<typeof EsquemaPoblacion>

// ---- Almacén (A8) ---------------------------------------------------------

/** Lo que hay de un recurso en el almacén de un asentamiento (§8). Sin capacidad, no hay límite. */
export const EsquemaExistencia = z
  .object({
    ...CAMPOS_EDICION,
    dominioId: EsquemaId,
    recursoId: EsquemaId,
    cantidad: EsquemaCantidadRecurso,
    capacidad: z.number().gt(0).optional(),
  })
  .check(
    exige(
      (e) => e.capacidad === undefined || e.cantidad <= e.capacidad,
      'Las existencias no pueden superar la capacidad',
    ),
  )
export type Existencia = z.infer<typeof EsquemaExistencia>

/** Ajuste a mano de las existencias, siempre con motivo (§6.4, §8). Nunca deja la cantidad por debajo de 0 (§6.4). */
export const EsquemaAjusteExistencias = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    recursoId: EsquemaId,
    fecha: EsquemaFecha,
    delta: z.number(),
    motivo: EsquemaConcepto,
  })
  .check(exige((a) => a.delta !== 0, 'El ajuste no puede ser 0'))
export type AjusteExistencias = z.infer<typeof EsquemaAjusteExistencias>

/** Periodo del campo «Durante» al añadir víveres (selector n.º 30): días, semanas (7), meses (30) y años (365). */
export const EsquemaPeriodoViveres = z.enum(['dias', 'semanas', 'meses', 'anios'])
export type PeriodoViveres = z.infer<typeof EsquemaPeriodoViveres>

/**
 * Compra o recepción sin coste de existencias (§8, A8b). `aplicada` distingue una recepción futura que aún no
 * entró (no tiene movimiento que lo diga) y `durante`/`periodo` guardan «Durante 1 · Meses» para poder reabrir
 * A8b igual: decisión propia 16.
 */
export const EsquemaEntradaAlmacen = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    recursoId: EsquemaId,
    cantidad: z.number().gt(0),
    personas: z.int().min(1).optional(),
    durante: z.int().min(1).optional(),
    periodo: EsquemaPeriodoViveres.optional(),
    operacion: z.enum(['compra', 'recepcion']),
    mercadoId: EsquemaId.optional(),
    precioUnidad: EsquemaImportePositivo.optional(),
    movimientoId: EsquemaId.optional(),
    caravanaId: EsquemaId.optional(),
    fecha: EsquemaFecha,
    aplicada: z.boolean(),
  })
  .check(
    exige(
      (e) => e.operacion !== 'compra' || (e.mercadoId !== undefined && e.precioUnidad !== undefined),
      'Una compra guarda su mercado y su precio por unidad',
    ),
    exige(
      (e) =>
        e.operacion !== 'recepcion' ||
        (e.mercadoId === undefined &&
          e.precioUnidad === undefined &&
          e.movimientoId === undefined &&
          e.caravanaId === undefined),
      'Una recepción sin coste no tiene mercado, precio, movimiento ni caravana',
    ),
    exige(
      (e) =>
        (e.personas === undefined) === (e.durante === undefined) &&
        (e.durante === undefined) === (e.periodo === undefined),
      '«Por personas» guarda a la vez personas, durante y periodo',
    ),
    exige(
      (e) => e.movimientoId === undefined || e.caravanaId === undefined,
      'Una compra se paga en el mercado local o sale en caravana, no las dos cosas',
    ),
  )
export type EntradaAlmacen = z.infer<typeof EsquemaEntradaAlmacen>

// ---- Producción ya ocurrida (P3) ------------------------------------------

/**
 * Una ocurrencia de producción ya ocurrida, con lo que entró y lo que se perdió por capacidad (decisión 1).
 * La crea el motor en la fase 4 y el formato 1 la incluye desde ya. No se edita (§6.1, P3: «si es pasada,
 * no se edita: lo producido se corrige con un ajuste»), así que no lleva `editadoEl`: decisión propia 18.
 * `edificioId` y `produccionId` apuntan a `edificios[]` y a `edificios[].producciones[]`, que viven en
 * `asentamiento.ts`; aquí solo se guardan los ids, así que no hay import entre los dos archivos.
 */
export const EsquemaProduccionRealizada = z.object({
  id: EsquemaId,
  fecha: EsquemaFecha,
  edificioId: EsquemaId,
  produccionId: EsquemaId,
  recursoId: EsquemaId,
  cantidad: EsquemaCantidadRecurso,
  perdida: EsquemaCantidadRecurso,
  avanceId: EsquemaId,
})
export type ProduccionRealizada = z.infer<typeof EsquemaProduccionRealizada>
