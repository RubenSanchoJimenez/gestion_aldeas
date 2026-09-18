import * as z from 'zod'
import { ANIO_MAXIMO, validarFecha, type Fecha } from '../calendario/fecha'
import { validarRecurrencia } from '../calendario/recurrencia'
import { validarEquivalencias } from '../dinero/monedas'

/**
 * Identificador de un registro (§8). En la app es `crypto.randomUUID()`; las opciones de los catálogos y los
 * registros del ejemplo llevan ids fijos y legibles con prefijo y guiones («cat.alojamiento», «defensa.torre-de-vigia»,
 * «dom.tharan»), decisión 8. Se limita a letras, cifras, punto, guion y guion bajo para que un id no pueda
 * traer caracteres raros desde una copia.
 */
export const EsquemaId = z.string().regex(/^[A-Za-z0-9._-]{1,64}$/, 'El identificador no es válido')
export type Id = z.infer<typeof EsquemaId>

/** Momento real del sistema en ISO 8601 UTC, tal como lo da `new Date().toISOString()` (decisión 18). */
export const EsquemaInstante = z.iso.datetime()
export type Instante = z.infer<typeof EsquemaInstante>

/** «Año-mes» de LocalComercial.cobradoHasta y de las producciones anotadas por mes (§8, decisión 18). */
export const EsquemaAnioMes = z.object({
  anio: z.int().min(1).max(ANIO_MAXIMO),
  mes: z.int().min(1).max(12),
})
export type AnioMes = z.infer<typeof EsquemaAnioMes>

/** Añade como error cada mensaje que devuelve un validador del dominio (fase 1). */
export function conErroresDe<T>(validar: (valor: T) => string[]) {
  return (ctx: z.core.ParsePayload<T>) => {
    for (const mensaje of validar(ctx.value)) {
      ctx.issues.push({ code: 'custom', message: mensaje, input: ctx.value })
    }
  }
}

/** Añade un error con un mensaje fijo si la condición no se cumple. */
export function exige<T>(condicion: (valor: T) => boolean, mensaje: string) {
  return (ctx: z.core.ParsePayload<T>) => {
    if (!condicion(ctx.value)) {
      ctx.issues.push({ code: 'custom', message: mensaje, input: ctx.value })
    }
  }
}

/**
 * Comprueba que un número no trae más decimales de los permitidos
 * (§3: las cantidades por habitante se guardan con hasta 4 decimales; los porcentajes, con 2).
 * Redondea y compara en vez de mirar el texto del número, porque la notación exponencial («1e-7»)
 * no lleva punto decimal y se colaba por esa puerta.
 */
export function decimalesComoMucho(decimales: number) {
  return (ctx: z.core.ParsePayload<number>) => {
    if (Number(ctx.value.toFixed(decimales)) !== ctx.value) {
      ctx.issues.push({ code: 'custom', message: `Usa como mucho ${decimales} decimales`, input: ctx.value })
    }
  }
}

/** Las siete monedas de MERP (§3). Espejo de Moneda: lo ata la prueba de igualdad de tipos. */
export const EsquemaMoneda = z.enum(['mm', 'mo', 'mp', 'mb', 'mc', 'me', 'mh'])

/** Equivalencias de la partida (§3). Enteros ≥ 2 y 1 mm ≤ 1.000.000.000 mh: lo comprueba la fase 1. */
export const EsquemaEquivalencias = z
  .object({
    mmEnMo: z.int(),
    moEnMp: z.int(),
    mpEnMb: z.int(),
    mbEnMc: z.int(),
    mcEnMe: z.int(),
    meEnMh: z.int(),
  })
  .check(conErroresDe(validarEquivalencias))

/**
 * Importe con signo: `base` es un entero seguro en hierro (mh) y `introducido` es lo que tecleó el jugador,
 * vacío en los importes calculados o agrupados y en la bolsa inicial de varias filas (§3).
 * `z.int()` rechaza NaN, Infinity y lo que se sale del rango entero seguro.
 * Solo `Movimiento.importe` usa este esquema: es el único importe con signo (decisión 18).
 */
export const EsquemaImporte = z.object({
  base: z.int(),
  introducido: z
    .object({
      cantidad: z.string().regex(/^\d+(?:[.,]\d{1,6})?$/, 'La cantidad tecleada no es válida'),
      moneda: EsquemaMoneda,
    })
    .optional(),
})

/** Importe de una regla o de un registro: magnitud, nunca negativa (decisión 18). El signo lo da tipo, sentido u operacion. */
export const EsquemaImporteMagnitud = EsquemaImporte.check(
  exige((i) => i.base >= 0, 'El importe no puede ser negativo'),
)

/** Importe que además tiene que ser mayor que 0: precios de mercado y precios por unidad (§6.6, «precio mayor que 0»). */
export const EsquemaImportePositivo = EsquemaImporte.check(
  exige((i) => i.base > 0, 'El precio debe ser mayor que 0'),
)

/** Fecha del calendario gregoriano proléptico (§4). Las reglas y los mensajes son los de validarFecha. */
export const EsquemaFecha = z
  .object({ anio: z.int(), mes: z.int(), dia: z.int() })
  .check(
    conErroresDe((f: Fecha) => {
      const error = validarFecha(f)
      return error === null ? [] : [error]
    }),
  )

/** Las ocho frecuencias que admite una producción de edificio: todas menos «Una sola vez» (§6.4, A7b). */
const OPCIONES_RECURRENCIA_SIN_UNICA = [
  z.object({ tipo: z.literal('diaria'), inicio: EsquemaFecha.optional() }),
  z.object({ tipo: z.literal('cadaNDias'), n: z.int(), primera: EsquemaFecha }),
  z.object({ tipo: z.literal('semanal'), diaSemana: z.int(), inicio: EsquemaFecha.optional() }),
  z.object({ tipo: z.literal('quincenal'), primera: EsquemaFecha }),
  z.object({ tipo: z.literal('mensual'), diaMes: z.int(), inicio: EsquemaFecha.optional() }),
  z.object({ tipo: z.literal('cadaNMeses'), n: z.int(), diaMes: z.int(), primera: EsquemaFecha }),
  z.object({ tipo: z.literal('trimestral'), diaMes: z.int(), primera: EsquemaFecha }),
  z.object({ tipo: z.literal('anual'), mes: z.int(), diaMes: z.int(), inicio: EsquemaFecha.optional() }),
] as const

/** La novena: «Una sola vez». */
const OPCION_RECURRENCIA_UNICA = z.object({ tipo: z.literal('unica'), fecha: EsquemaFecha })

/** Las nueve frecuencias (§4 y §8). Rangos y mensajes: los de validarRecurrencia. */
export const EsquemaRecurrencia = z
  .discriminatedUnion('tipo', [...OPCIONES_RECURRENCIA_SIN_UNICA, OPCION_RECURRENCIA_UNICA])
  .check(conErroresDe(validarRecurrencia))

/** Frecuencia de una producción: sin «Una sola vez» (§6.4, «La frecuencia no ofrece «Una sola vez»»). */
export const EsquemaRecurrenciaProduccion = z
  .discriminatedUnion('tipo', [...OPCIONES_RECURRENCIA_SIN_UNICA])
  .check(conErroresDe(validarRecurrencia))
export type RecurrenciaProduccion = z.infer<typeof EsquemaRecurrenciaProduccion>

/** Edad de la partida (§4). Espejo de Edad. */
export const EsquemaEdad = z.enum(['segunda', 'tercera', 'cuarta'])

/** Campos que llevan todos los registros editables: id y «editadoEl», que se muestra (§8). */
export const CAMPOS_REGISTRO = {
  id: EsquemaId,
  editadoEl: EsquemaInstante.optional(),
}

/** Campos de los registros sin id propio (Caja, Poblacion, Existencia, Ruta), que también guardan editadoEl (§8). */
export const CAMPOS_EDICION = {
  editadoEl: EsquemaInstante.optional(),
}

/** Nombre libre de un registro: obligatorio, de 1 a 60 caracteres, sin unicidad (decisión propia 6). */
export const EsquemaNombreLibre = z.string().min(1).max(60)

/** Nombre sujeto a las reglas comunes de §6.6 con longitud de 2 a 60: ubicaciones, personas, hechizos, mercados y negocios. */
export const EsquemaNombreLargo = z.string().min(2).max(60)

/** Nombre sujeto a las reglas comunes de §6.6 con longitud de 2 a 40: catálogos, recursos y tipos de local. */
export const EsquemaNombreCorto = z.string().min(2).max(40)

/** Concepto de un movimiento o motivo de un cambio: «Impuestos de locales · abril (4)» (§9). */
export const EsquemaConcepto = z.string().min(1).max(120)

/** Notas y descripciones: texto libre opcional. */
export const EsquemaNotas = z.string().max(1000)

/** Porcentaje de 0 a 100 con hasta 2 decimales, como el impuesto de un tipo de local (§7). */
export const EsquemaPorcentaje = z.number().min(0).max(100).check(decimalesComoMucho(2))

/** Cantidad de un recurso: con decimales y nunca negativa (§3, «se calculan con decimales»). */
export const EsquemaCantidadRecurso = z.number().min(0)

/**
 * Dónde está un objeto (§8). La unión discriminada impide combinaciones inválidas. La bolsa no es ubicación.
 * Vive aquí, y no en `personaje.ts`, porque también lo usa `Movimiento.objetoPendiente` y `movimientos.ts`
 * se escribe antes que `personaje.ts` (decisión propia 36).
 */
export const EsquemaUbicacionObjeto = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('encima') }),
  z.object({ tipo: z.literal('caja'), dominioId: EsquemaId }),
  z.object({ tipo: z.literal('almacen'), dominioId: EsquemaId }),
  z.object({ tipo: z.literal('propia'), ubicacionId: EsquemaId }),
])
export type UbicacionObjeto = z.infer<typeof EsquemaUbicacionObjeto>
