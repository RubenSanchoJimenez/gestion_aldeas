import * as z from 'zod'
import {
  EsquemaAjusteExistencias,
  EsquemaEntradaAlmacen,
  EsquemaExistencia,
  EsquemaPoblacion,
  EsquemaProduccionRealizada,
} from './almacen'
import {
  EsquemaAnimal,
  EsquemaDefensa,
  EsquemaEdificio,
  EsquemaImpuestoRenta,
  EsquemaLocalComercial,
  EsquemaObjetoArmeria,
  EsquemaObra,
  EsquemaTipoLocal,
  EsquemaTrabajador,
  EsquemaUnidadGuarnicion,
} from './asentamiento'
import { EsquemaAvanceRegistrado } from './avance'
import { EsquemaPersonaEntidad, EsquemaUbicacion } from './catalogos'
import { EsquemaCaravana, EsquemaMercado, EsquemaRuta } from './comercio'
import { EsquemaCaja, EsquemaDominio } from './dominios'
import { EsquemaDeuda } from './deudas'
import { EsquemaEventoNarrativo } from './eventos'
import { EsquemaMovimiento, EsquemaRecurrenteDinero, EsquemaTransferencia } from './movimientos'
import { EsquemaPartida } from './partida'
import {
  EsquemaHechizo,
  EsquemaIntentoAprendizaje,
  EsquemaInversion,
  EsquemaObjetoInventario,
  EsquemaPergamino,
  EsquemaVenta,
} from './personaje'

/**
 * El estado completo de una partida: lo que recibe simular(estado, dias) (§9) y lo que copia snapshotPrevio
 * (§8, decisión 4). No lleva la lista de avances ni los catálogos de la app, que viven fuera de la partida (§6.5).
 * El orden de las claves de este objeto es el orden canónico de la exportación (decisión propia 28).
 */
export const EsquemaEstadoPartida = z.object({
  partida: EsquemaPartida,
  // Dinero (personaje y asentamientos)
  dominios: z.array(EsquemaDominio),
  cajas: z.array(EsquemaCaja),
  movimientos: z.array(EsquemaMovimiento),
  transferencias: z.array(EsquemaTransferencia),
  deudas: z.array(EsquemaDeuda),
  recurrentes: z.array(EsquemaRecurrenteDinero),
  // Personaje
  objetos: z.array(EsquemaObjetoInventario),
  ventas: z.array(EsquemaVenta),
  inversiones: z.array(EsquemaInversion),
  hechizos: z.array(EsquemaHechizo),
  intentos: z.array(EsquemaIntentoAprendizaje),
  pergaminos: z.array(EsquemaPergamino),
  // Asentamientos
  poblaciones: z.array(EsquemaPoblacion),
  existencias: z.array(EsquemaExistencia),
  ajustesExistencias: z.array(EsquemaAjusteExistencias),
  entradasAlmacen: z.array(EsquemaEntradaAlmacen),
  edificios: z.array(EsquemaEdificio),
  produccionesRealizadas: z.array(EsquemaProduccionRealizada),
  trabajadores: z.array(EsquemaTrabajador),
  obras: z.array(EsquemaObra),
  impuestosRentas: z.array(EsquemaImpuestoRenta),
  tiposLocal: z.array(EsquemaTipoLocal),
  localesComerciales: z.array(EsquemaLocalComercial),
  mercados: z.array(EsquemaMercado),
  rutas: z.array(EsquemaRuta),
  caravanas: z.array(EsquemaCaravana),
  unidadesGuarnicion: z.array(EsquemaUnidadGuarnicion),
  defensas: z.array(EsquemaDefensa),
  animales: z.array(EsquemaAnimal),
  armeria: z.array(EsquemaObjetoArmeria),
  // Partida
  eventos: z.array(EsquemaEventoNarrativo),
  ubicaciones: z.array(EsquemaUbicacion),
  personas: z.array(EsquemaPersonaEntidad),
})
export type EstadoPartida = z.infer<typeof EsquemaEstadoPartida>

/**
 * Un avance con su copia de la partida (§8). Solo el último la lleva (decisión 4): «Deshacer avance» solo
 * deshace el último (§9), así que no hace falta más de un snapshot.
 */
export const EsquemaAvance = EsquemaAvanceRegistrado.extend({
  snapshotPrevio: EsquemaEstadoPartida.optional(),
})
export type Avance = z.infer<typeof EsquemaAvance>

/** Lo que guarda una fila de la tabla `partidas` de Dexie, con clave primaria `partida.id` (decisión 6). */
export const EsquemaDocumentoPartida = EsquemaEstadoPartida.extend({
  avances: z.array(EsquemaAvance),
})
export type DocumentoPartida = z.infer<typeof EsquemaDocumentoPartida>
