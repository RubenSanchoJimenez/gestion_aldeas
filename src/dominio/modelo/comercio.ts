import * as z from 'zod'
import { compararFechas } from '../calendario/fecha'
import {
  CAMPOS_EDICION,
  CAMPOS_REGISTRO,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporteMagnitud,
  EsquemaImportePositivo,
  EsquemaNombreLargo,
  exige,
} from './comunes'

/** Precio de un recurso en un mercado (§8). Un recurso no repite fila y el precio es mayor que 0 (§6.6). */
export const EsquemaPrecioMercado = z.object({
  recursoId: EsquemaId,
  importe: EsquemaImportePositivo,
})
export type PrecioMercado = z.infer<typeof EsquemaPrecioMercado>

/**
 * Un mercado de la partida (§8). `localDe` es el asentamiento del mercado local, que lleva su nombre, lo crea A0
 * sin precios y no se elimina. El nombre se guarda siempre, también en el local, y la coherencia con el nombre
 * del asentamiento se comprueba aparte (apartado 4): decisión propia 20.
 */
export const EsquemaMercado = z.object({
  ...CAMPOS_REGISTRO,
  nombre: EsquemaNombreLargo,
  localDe: EsquemaId.optional(),
  precios: z.array(EsquemaPrecioMercado),
})
export type Mercado = z.infer<typeof EsquemaMercado>

/** Destino de una ruta, con discriminador (decisión 13). §8 solo tenía `destinoId`, sin decir de qué era. */
export const EsquemaDestinoRuta = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('mercado'), id: EsquemaId }),
  z.object({ tipo: z.literal('asentamiento'), id: EsquemaId }),
])
export type DestinoRuta = z.infer<typeof EsquemaDestinoRuta>

/**
 * Días de viaje entre un asentamiento y un mercado o entre dos asentamientos (§8). Solo de ida, de 1 a 365 (§6.6).
 * Sin id: la clave es el par (origenId, destino). Una ruta entre dos asentamientos vale en los dos sentidos.
 */
export const EsquemaRuta = z.object({
  ...CAMPOS_EDICION,
  origenId: EsquemaId,
  destino: EsquemaDestinoRuta,
  diasViaje: z.int().min(1).max(365),
})
export type Ruta = z.infer<typeof EsquemaRuta>

/** Lo que lleva una caravana (§8). Un solo recurso por caravana. */
export const EsquemaCargaCaravana = z.object({
  recursoId: EsquemaId,
  cantidad: z.number().gt(0),
})
export type CargaCaravana = z.infer<typeof EsquemaCargaCaravana>

/** Una caravana de compra, venta o traslado (§7, §8). En un traslado, `vuelta` es la llegada. */
export const EsquemaCaravana = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    operacion: z.enum(['compra', 'venta', 'traslado']),
    mercadoId: EsquemaId.optional(),
    destinoId: EsquemaId.optional(),
    carga: EsquemaCargaCaravana,
    precioUnidad: EsquemaImportePositivo.optional(),
    importe: EsquemaImporteMagnitud.optional(),
    salida: EsquemaFecha,
    vuelta: EsquemaFecha,
    estado: z.enum(['programada', 'enRuta', 'terminada']),
    movimientoSalidaId: EsquemaId.optional(),
    movimientoVueltaId: EsquemaId.optional(),
  })
  .check(
    exige(
      (c) =>
        c.operacion === 'traslado' ||
        (c.mercadoId !== undefined && c.precioUnidad !== undefined && c.importe !== undefined),
      'Una compra o una venta guardan su mercado, su precio por unidad y su importe',
    ),
    exige(
      (c) =>
        c.operacion !== 'traslado' ||
        (c.destinoId !== undefined &&
          c.mercadoId === undefined &&
          c.precioUnidad === undefined &&
          c.importe === undefined &&
          c.movimientoSalidaId === undefined &&
          c.movimientoVueltaId === undefined),
      'Un traslado guarda su asentamiento de destino y no mueve dinero',
    ),
    exige(
      (c) => c.operacion === 'traslado' || c.destinoId === undefined,
      'Solo un traslado tiene asentamiento de destino',
    ),
    exige((c) => c.destinoId !== c.dominioId, 'Un traslado no puede ir al mismo asentamiento del que sale'),
    exige((c) => compararFechas(c.salida, c.vuelta) <= 0, 'La vuelta no puede ser anterior a la salida'),
  )
export type Caravana = z.infer<typeof EsquemaCaravana>
