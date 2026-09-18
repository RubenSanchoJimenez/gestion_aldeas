import { RECURSO } from '../catalogo/inicial'
import type { Existencia } from '../modelo/almacen'
import type { Edificio } from '../modelo/asentamiento'
import type { Avance, EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import {
  ANIMALES,
  AJUSTES_EXISTENCIAS,
  ARMERIA_BREE,
  CARAVANAS,
  DEFENSAS,
  EDIFICIOS,
  ENTRADAS_ALMACEN,
  EVENTOS,
  MERCADOS,
  OBRAS,
  POBLACIONES,
  PRODUCCIONES_REALIZADAS,
  RUTAS,
} from './asentamientosAlmacen'
import {
  CAJAS_ASENTAMIENTOS,
  DEUDAS_ASENTAMIENTOS,
  IMPUESTOS_RENTAS,
  LOCALES_COMERCIALES,
  MOVIMIENTOS_ARCHET,
  MOVIMIENTOS_BREE,
  TIPOS_LOCAL,
  TRABAJADORES,
  TRANSFERENCIAS,
  UNIDADES_GUARNICION,
} from './asentamientosDinero'
import { AVANCE, DOM, MOV_BREE, MOV_THARAN, PRODUCCION } from './ids'
import {
  CAJA_THARAN,
  DEUDAS_THARAN,
  DOMINIOS,
  HECHIZOS,
  INTENTOS,
  INVERSIONES,
  MOVIMIENTOS_THARAN,
  OBJETOS,
  PARTIDA,
  PERGAMINOS,
  PERSONAS,
  RECURRENTES_THARAN,
  UBICACIONES,
  VENTAS,
} from './partidaYPersonaje'

/** El 10 de abril de 1640: la fecha actual que guarda el snapshot del último avance. */
const DIEZ_DE_ABRIL = { anio: 1640, mes: 4, dia: 10 }

/** Los tres movimientos que creó el avance del 10 al 12 y que el snapshot todavía no tiene. */
const MOVIMIENTOS_DEL_ULTIMO_AVANCE: readonly string[] = [
  MOV_THARAN.posada12Abril,
  MOV_THARAN.establo12Abril,
  MOV_BREE.peaje12Abril,
]

/** Consumo diario de víveres de un asentamiento: habitantes ÷ diasPorSaco (§7). */
function viveresAlDia(habitantes: number): number {
  return habitantes / PARTIDA.diasPorSaco
}

/**
 * El almacén tal como estaba al cierre del 10 de abril: dos días de consumo más que el 12, sin producción
 * (el 11 es miércoles y el 12, jueves) y sin llegadas de caravanas.
 */
const EXISTENCIAS_10_ABRIL: Existencia[] = [
  { dominioId: DOM.bree, recursoId: RECURSO.viveres, cantidad: 310 + 2 * viveresAlDia(1240), capacidad: 1200 },
  { dominioId: DOM.bree, recursoId: RECURSO.madera, cantidad: 420 + 2 * (1240 * 0.008), capacidad: 600 },
  { dominioId: DOM.bree, recursoId: RECURSO.piedra, cantidad: 180, capacidad: 400 },
  { dominioId: DOM.bree, recursoId: RECURSO.arcilla, cantidad: 150, capacidad: 300 },
  { dominioId: DOM.bree, recursoId: RECURSO.hierro, cantidad: 64, capacidad: 200 },
  { dominioId: DOM.bree, recursoId: RECURSO.cerveza, cantidad: 90 + 2 * (1240 * 0.003), capacidad: 150 },
  { dominioId: DOM.bree, recursoId: RECURSO.lana, cantidad: 35, capacidad: 100 },
  { dominioId: DOM.archet, recursoId: RECURSO.viveres, cantidad: 900 + 2 * viveresAlDia(310) },
]

/** Lo que valía cada acumulado al cierre del 10 de abril: dos días menos que el 12. */
const ACUMULADO_10_ABRIL: Readonly<Record<string, number>> = {
  [PRODUCCION.granjasViveres]: 2.4,
  [PRODUCCION.aserraderoMadera]: 3,
  [PRODUCCION.cerveceriaCerveza]: 3,
  [PRODUCCION.canteraPiedra]: 2,
  [PRODUCCION.canteraArcilla]: 6,
  [PRODUCCION.redilLana]: 3,
}

/** Los mismos seis edificios, con el acumulado que tenían el 10 de abril. */
const EDIFICIOS_10_ABRIL: Edificio[] = EDIFICIOS.map((edificio) => ({
  ...edificio,
  producciones: edificio.producciones.map((produccion) => ({
    ...produccion,
    acumulado: { ...produccion.acumulado, sumaFactores: ACUMULADO_10_ABRIL[produccion.id] },
  })),
}))

/** Los movimientos que ya existían el 10 de abril: todos menos los tres del último avance. */
const MOVIMIENTOS_10_ABRIL: Movimiento[] = [
  ...MOVIMIENTOS_THARAN,
  ...MOVIMIENTOS_BREE,
  ...MOVIMIENTOS_ARCHET,
].filter((movimiento) => !MOVIMIENTOS_DEL_ULTIMO_AVANCE.includes(movimiento.id))

/**
 * La copia de la partida que guarda el último avance: el estado completo al cierre del 10 de abril, con los
 * tres registros manuales de ese día ya dentro (decisión 4). No lleva la lista de avances ni los catálogos.
 */
export const SNAPSHOT_10_ABRIL: EstadoPartida = {
  partida: {
    ...PARTIDA,
    fechaActual: DIEZ_DE_ABRIL,
    actualizada: '2026-09-08T19:30:00.000Z',
    cambiosDesdeUltimoAvance: 3,
  },
  dominios: DOMINIOS,
  cajas: [CAJA_THARAN, ...CAJAS_ASENTAMIENTOS],
  movimientos: MOVIMIENTOS_10_ABRIL,
  transferencias: TRANSFERENCIAS,
  deudas: [...DEUDAS_THARAN, ...DEUDAS_ASENTAMIENTOS],
  recurrentes: RECURRENTES_THARAN,
  objetos: OBJETOS,
  ventas: VENTAS,
  inversiones: INVERSIONES,
  hechizos: HECHIZOS,
  intentos: INTENTOS,
  pergaminos: PERGAMINOS,
  poblaciones: POBLACIONES,
  existencias: EXISTENCIAS_10_ABRIL,
  ajustesExistencias: AJUSTES_EXISTENCIAS,
  entradasAlmacen: ENTRADAS_ALMACEN,
  edificios: EDIFICIOS_10_ABRIL,
  produccionesRealizadas: PRODUCCIONES_REALIZADAS,
  trabajadores: TRABAJADORES,
  obras: OBRAS,
  impuestosRentas: IMPUESTOS_RENTAS,
  tiposLocal: TIPOS_LOCAL,
  localesComerciales: LOCALES_COMERCIALES,
  mercados: MERCADOS,
  rutas: RUTAS,
  caravanas: CARAVANAS,
  unidadesGuarnicion: UNIDADES_GUARNICION,
  defensas: DEFENSAS,
  animales: ANIMALES,
  armeria: ARMERIA_BREE,
  eventos: EVENTOS,
  ubicaciones: UBICACIONES,
  personas: PERSONAS,
}

/**
 * Los cuatro avances de la partida (decisión 5): … → 31/3, 31/3 → 6/4, 6/4 → 10/4 y 10/4 → 12/4.
 * El primero va desde la fecha inicial y no crea nada, porque todas las reglas empiezan el 1 de abril
 * (decisión 2). Solo el último guarda `snapshotPrevio` (decisión 4).
 */
export const AVANCES: Avance[] = [
  {
    id: AVANCE.hasta31Marzo,
    desde: PARTIDA.fechaInicial,
    hasta: { anio: 1640, mes: 3, dia: 31 },
    aplicadoEl: '2026-08-30T17:05:00.000Z',
    cambios: [
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4091800, despues: 4091800, movimientos: 0 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 49890000, despues: 49890000, movimientos: 0 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 12500000, despues: 12500000, movimientos: 0 },
      { tipo: 'hecho', texto: 'Sin movimientos: todas las reglas de la partida empiezan el 1 de abril.' },
    ],
    avisos: [],
  },
  {
    id: AVANCE.hasta6Abril,
    desde: { anio: 1640, mes: 3, dia: 31 },
    hasta: { anio: 1640, mes: 4, dia: 6 },
    aplicadoEl: '2026-09-05T18:10:00.000Z',
    cambios: [
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 1355800, despues: 1583800, movimientos: 3 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 52890000, despues: 47160000, movimientos: 6 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 8500000, movimientos: 0 },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Cobrados los impuestos de los cuatro locales por marzo.' },
      { tipo: 'hecho', dominioId: DOM.tharan, texto: 'El Gremio devengó 2 mo de interés el 1 de abril.' },
    ],
    avisos: [],
  },
  {
    id: AVANCE.hasta10Abril,
    desde: { anio: 1640, mes: 4, dia: 6 },
    hasta: DIEZ_DE_ABRIL,
    aplicadoEl: '2026-09-08T18:40:00.000Z',
    cambios: [
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 3583800, despues: 3535800, movimientos: 2 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 42160000, despues: 34000000, movimientos: 5 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 8500000, movimientos: 0 },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Producción del sábado 7 de abril en los cinco edificios activos.' },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Pagada la soldada de la guarnición y empezada la obra del granero.' },
    ],
    avisos: [],
  },
  {
    id: AVANCE.hasta12Abril,
    desde: DIEZ_DE_ABRIL,
    hasta: PARTIDA.fechaActual,
    aplicadoEl: '2026-09-08T19:45:00.000Z',
    cambios: [
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4675800, despues: 4651800, movimientos: 2 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 34000000, despues: 34060000, movimientos: 1 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 8500000, movimientos: 0 },
      {
        tipo: 'almacen',
        dominioId: DOM.bree,
        recursoId: RECURSO.viveres,
        antes: 310 + 2 * viveresAlDia(1240),
        despues: 310,
      },
      {
        tipo: 'almacen',
        dominioId: DOM.bree,
        recursoId: RECURSO.madera,
        antes: 420 + 2 * (1240 * 0.008),
        despues: 420,
      },
      {
        tipo: 'almacen',
        dominioId: DOM.bree,
        recursoId: RECURSO.cerveza,
        antes: 90 + 2 * (1240 * 0.003),
        despues: 90,
      },
      {
        tipo: 'almacen',
        dominioId: DOM.archet,
        recursoId: RECURSO.viveres,
        antes: 900 + 2 * viveresAlDia(310),
        despues: 900,
      },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'La reparación de la puerta del sur pasa del 42 % al 58 %.' },
      { tipo: 'hecho', dominioId: DOM.archet, texto: 'La obra del molino pasa del 55 % al 60 %.' },
    ],
    avisos: [
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 23 de abril',
      },
    ],
    snapshotPrevio: SNAPSHOT_10_ABRIL,
  },
]
