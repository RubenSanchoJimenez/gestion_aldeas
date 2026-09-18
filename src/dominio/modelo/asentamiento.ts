import * as z from 'zod'
import { compararFechas } from '../calendario/fecha'
import {
  CAMPOS_REGISTRO,
  EsquemaAnioMes,
  EsquemaConcepto,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporteMagnitud,
  EsquemaNombreCorto,
  EsquemaNombreLibre,
  EsquemaNotas,
  EsquemaPorcentaje,
  EsquemaRecurrencia,
  EsquemaRecurrenciaProduccion,
  decimalesComoMucho,
  exige,
} from './comunes'

// ---- Edificios y producción (A7, A7b) -------------------------------------

/** Lo acumulado del periodo en curso de una producción (§7, §8). */
export const EsquemaAcumuladoProduccion = z.object({
  desde: EsquemaFecha,
  sumaFactores: z.number().min(0),
})
export type AcumuladoProduccion = z.infer<typeof EsquemaAcumuladoProduccion>

/** Una producción de un edificio: recurso, cantidad base y frecuencia (§8). Cantidad > 0 con hasta 2 decimales (§6.4). */
export const EsquemaProduccionEdificio = z.object({
  id: EsquemaId,
  recursoId: EsquemaId,
  cantidad: z.number().gt(0).check(decimalesComoMucho(2)),
  recurrencia: EsquemaRecurrenciaProduccion,
  acumulado: EsquemaAcumuladoProduccion,
})
export type ProduccionEdificio = z.infer<typeof EsquemaProduccionEdificio>

/** Aviso ámbar que dura «hasta guardar el edificio en A7b» (§7, tabla de avisos de §9): decisión propia 17. */
export const EsquemaAvisoPendienteEdificio = z.object({
  tipo: z.enum(['terminadoSinProduccion', 'mejoraTerminada']),
  obraId: EsquemaId,
})
export type AvisoPendienteEdificio = z.infer<typeof EsquemaAvisoPendienteEdificio>

/** Un edificio del asentamiento (§8). Alquilado conserva ocultas sus producciones y su acumulado (§7). */
export const EsquemaEdificio = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  tipoId: EsquemaId,
  nombre: EsquemaNombreLibre,
  estado: z.enum(['activo', 'daniado', 'inactivo', 'alquilado']),
  trabajadoresNecesarios: z.int().min(0),
  producciones: z.array(EsquemaProduccionEdificio),
  avisoPendiente: EsquemaAvisoPendienteEdificio.optional(),
})
export type Edificio = z.infer<typeof EsquemaEdificio>

// ---- Trabajadores y obras (A5, A9) ----------------------------------------

/** Una fila de trabajadores contratados (§8). El salario es por trabajador (A5): decisión propia 19. */
export const EsquemaTrabajador = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  oficioId: EsquemaId,
  numero: z.int().min(1),
  salario: EsquemaImporteMagnitud,
  recurrencia: EsquemaRecurrencia,
  edificioId: EsquemaId.optional(),
})
export type Trabajador = z.infer<typeof EsquemaTrabajador>

/** Qué deja hecha una obra al terminar (§8, selector n.º 19). La unión fija qué campo usa cada resultado. */
export const EsquemaEfectoObra = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('crearEdificio'), tipoId: EsquemaId }),
  z.object({ tipo: z.literal('mejorarEdificio'), objetivoId: EsquemaId }),
  z.object({ tipo: z.literal('ampliarAlmacen'), recursoId: EsquemaId, valor: z.number().gt(0) }),
  z.object({ tipo: z.literal('crearDefensa'), tipoId: EsquemaId }),
  z.object({ tipo: z.literal('repararDefensa'), objetivoId: EsquemaId }),
  z.object({ tipo: z.literal('repararEdificio'), objetivoId: EsquemaId }),
])
export type EfectoObra = z.infer<typeof EsquemaEfectoObra>

/** Una obra (§7, §8). Fin = inicio + diasTotales − 1. `materiales` se queda como { recursoId: cantidad } (decisión 13). */
export const EsquemaObra = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    nombre: EsquemaNombreLibre,
    estado: z.enum(['planificada', 'programada', 'enCurso', 'terminada']),
    coste: EsquemaImporteMagnitud,
    materiales: z.record(EsquemaId, z.number().gt(0)),
    inicio: EsquemaFecha.optional(),
    diasTotales: z.int().min(1),
    efecto: EsquemaEfectoObra,
    movimientoId: EsquemaId.optional(),
  })
  .check(
    exige(
      (o) => (o.estado === 'planificada') === (o.inicio === undefined),
      'Solo una obra planificada no tiene fecha de inicio',
    ),
    exige(
      (o) => o.estado !== 'planificada' || o.movimientoId === undefined,
      'Una obra planificada no ha descontado nada todavía',
    ),
  )
export type Obra = z.infer<typeof EsquemaObra>

// ---- Impuestos, rentas y locales comerciales (A3, A3b, A3c) ---------------

/**
 * Ingreso, renta o tributo recurrente de un asentamiento (§8). `categoriaId` es lo único que reproduce las tres
 * categorías que A2 muestra en sus movimientos automáticos: Impuestos, Rentas y alquileres y Aranceles
 * (decisión 3). Valor inicial: cat.impuestos (ingreso), cat.rentas-y-alquileres (ingreso con edificioId) y
 * cat.tributos (tributo); editable en el formulario «Ingreso o tributo».
 */
export const EsquemaImpuestoRenta = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    sentido: z.enum(['ingreso', 'tributo']),
    concepto: EsquemaConcepto,
    base: z.enum(['fija', 'porHabitante']),
    importe: EsquemaImporteMagnitud,
    categoriaId: EsquemaId,
    recurrencia: EsquemaRecurrencia,
    destinatarioId: EsquemaId.optional(),
    edificioId: EsquemaId.optional(),
  })
  .check(
    exige((i) => i.destinatarioId === undefined || i.sentido === 'tributo', 'El destinatario solo va en los tributos'),
    exige((i) => i.edificioId === undefined || i.sentido === 'ingreso', 'El edificio alquilado solo va en los ingresos'),
  )
export type ImpuestoRenta = z.infer<typeof EsquemaImpuestoRenta>

/** Regla común de un grupo de locales comerciales (§7, §8). Todos los locales del tipo la usan. */
export const EsquemaTipoLocal = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  nombre: EsquemaNombreCorto,
  pct: EsquemaPorcentaje,
  minimo: EsquemaImporteMagnitud,
  diaCobro: z.int().min(1).max(31),
})
export type TipoLocal = z.infer<typeof EsquemaTipoLocal>

/**
 * Un tramo de estado de un local, desde una fecha (decisión 13, que sustituye `estado` y `estadoDesde`).
 * El primer tramo nace con el alta; cada cambio cuenta desde el día siguiente a la fecha actual (§7).
 */
export const EsquemaCambioEstadoLocal = z.object({
  desde: EsquemaFecha,
  estado: z.enum(['abierto', 'cerrado']),
})
export type CambioEstadoLocal = z.infer<typeof EsquemaCambioEstadoLocal>

/** Producción anotada de un mes concreto de un local (§7, A3c). Vacío = la habitual; 0 = no produjo y paga el mínimo. */
export const EsquemaProduccionMesLocal = z.object({
  mes: EsquemaAnioMes,
  importe: EsquemaImporteMagnitud,
  nota: EsquemaNotas.optional(),
})
export type ProduccionMesLocal = z.infer<typeof EsquemaProduccionMesLocal>

/** Un local comercial del asentamiento (§7, §8). */
export const EsquemaLocalComercial = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    nombre: EsquemaNombreLibre,
    tipoId: EsquemaId,
    titularId: EsquemaId.optional(),
    produccionHabitual: EsquemaImporteMagnitud,
    cambiosEstado: z.array(EsquemaCambioEstadoLocal).min(1),
    alta: EsquemaFecha,
    cobradoHasta: EsquemaAnioMes,
    notas: EsquemaNotas.optional(),
    producciones: z.array(EsquemaProduccionMesLocal),
  })
  .check(
    exige(
      (l) => l.cambiosEstado.every((c, i) => i === 0 || compararFechas(l.cambiosEstado[i - 1].desde, c.desde) < 0),
      'Los cambios de estado del local van en orden y sin repetir fecha',
    ),
    exige(
      (l) => l.cambiosEstado.every((c, i) => i === 0 || l.cambiosEstado[i - 1].estado !== c.estado),
      'Dos tramos seguidos de un local no pueden tener el mismo estado',
    ),
  )
export type LocalComercial = z.infer<typeof EsquemaLocalComercial>

// ---- Guarnición, defensas, animales y armería (A6, A6b, A12) --------------

/** Una unidad de la guarnición (§8). El tipo es genérico y el nombre propio va aquí. La soldada es por soldado (A6). */
export const EsquemaUnidadGuarnicion = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  tipoId: EsquemaId,
  nombre: EsquemaNombreLibre,
  numero: z.int().min(1),
  soldada: EsquemaImporteMagnitud,
  recurrencia: EsquemaRecurrencia,
})
export type UnidadGuarnicion = z.infer<typeof EsquemaUnidadGuarnicion>

/** Una defensa del asentamiento (§8). Una defensa nueva nace «Buena» (§6.6). */
export const EsquemaDefensa = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  tipoId: EsquemaId,
  nombre: EsquemaNombreLibre,
  estado: z.enum(['buena', 'daniada', 'enRuinas']),
})
export type Defensa = z.infer<typeof EsquemaDefensa>

/** Una fila de animales (§8). Tipo y género son únicos por asentamiento. */
export const EsquemaAnimal = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  tipoId: EsquemaId,
  cantidad: z.int().min(1),
  genero: z.enum(['hembra', 'macho', 'mixto']),
  valorUnitario: EsquemaImporteMagnitud.optional(),
  notas: EsquemaNotas.optional(),
})
export type Animal = z.infer<typeof EsquemaAnimal>

/** Una fila de la armería (§8). El valor total se calcula y no se guarda. */
export const EsquemaObjetoArmeria = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  nombre: EsquemaNombreLibre,
  cantidad: z.int().min(1),
  valorUnitario: EsquemaImporteMagnitud,
})
export type ObjetoArmeria = z.infer<typeof EsquemaObjetoArmeria>
