import type { CatalogosEnCopia } from '../modelo/catalogos'
import { OPCIONES_INICIALES, RECURSOS_INICIALES } from '../catalogo/inicial'
import type { DocumentoPartida } from '../modelo/documento'
import {
  ANIMALES,
  AJUSTES_EXISTENCIAS,
  ARMERIA_BREE,
  CARAVANAS,
  DEFENSAS,
  EDIFICIOS,
  ENTRADAS_ALMACEN,
  EVENTOS,
  EXISTENCIAS,
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
import { AVANCES } from './avances'
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

/**
 * «La Sombra del Este» entera, tal como está guardada el 12 de abril de 1640 T.E.: las 34 claves del estado
 * más la lista de avances (decisión 6). Devuelve una copia propia y completa en cada llamada, para que una prueba
 * que toque una colección o el snapshotPrevio no ensucie a la siguiente.
 */
export function documentoDeEjemplo(): DocumentoPartida {
  return structuredClone({
    partida: PARTIDA,
    dominios: [...DOMINIOS],
    cajas: [CAJA_THARAN, ...CAJAS_ASENTAMIENTOS],
    movimientos: [...MOVIMIENTOS_THARAN, ...MOVIMIENTOS_BREE, ...MOVIMIENTOS_ARCHET],
    transferencias: [...TRANSFERENCIAS],
    deudas: [...DEUDAS_THARAN, ...DEUDAS_ASENTAMIENTOS],
    recurrentes: [...RECURRENTES_THARAN],
    objetos: [...OBJETOS],
    ventas: [...VENTAS],
    inversiones: [...INVERSIONES],
    hechizos: [...HECHIZOS],
    intentos: [...INTENTOS],
    pergaminos: [...PERGAMINOS],
    poblaciones: [...POBLACIONES],
    existencias: [...EXISTENCIAS],
    ajustesExistencias: [...AJUSTES_EXISTENCIAS],
    entradasAlmacen: [...ENTRADAS_ALMACEN],
    edificios: [...EDIFICIOS],
    produccionesRealizadas: [...PRODUCCIONES_REALIZADAS],
    trabajadores: [...TRABAJADORES],
    obras: [...OBRAS],
    impuestosRentas: [...IMPUESTOS_RENTAS],
    tiposLocal: [...TIPOS_LOCAL],
    localesComerciales: [...LOCALES_COMERCIALES],
    mercados: [...MERCADOS],
    rutas: [...RUTAS],
    caravanas: [...CARAVANAS],
    unidadesGuarnicion: [...UNIDADES_GUARNICION],
    defensas: [...DEFENSAS],
    animales: [...ANIMALES],
    armeria: [...ARMERIA_BREE],
    eventos: [...EVENTOS],
    ubicaciones: [...UBICACIONES],
    personas: [...PERSONAS],
    avances: [...AVANCES],
  })
}

/** El catálogo de fábrica en la forma en la que viaja en una copia: el ejemplo no usa ninguna opción propia. */
export function catalogosDeEjemplo(): CatalogosEnCopia {
  return structuredClone({ opciones: [...OPCIONES_INICIALES], recursos: [...RECURSOS_INICIALES] })
}
