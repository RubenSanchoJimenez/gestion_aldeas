import type { Fecha } from '../../calendario/fecha'
import { RECURSO } from '../../catalogo/inicial'
import { EQUIVALENCIAS_POR_DEFECTO } from '../../dinero/monedas'
import type { Id } from '../../modelo/comunes'
import type { EstadoPartida } from '../../modelo/documento'
import { VERSION_FORMATO } from '../../modelo/partida'

/** El 12 de abril de 1640 T.E., la fecha actual del ejemplo: la de partida de las pruebas del motor. */
const FECHA_DE_PRUEBA: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** Una partida mínima y válida: Tharan con la bolsa a 0, sin nada más; fechaInicial = fechaActual. */
export function estadoMinimo(fechaActual: Fecha = FECHA_DE_PRUEBA): EstadoPartida {
  return {
    partida: {
      id: 'p.prueba',
      nombre: 'Partida de prueba',
      edad: 'tercera',
      equivalencias: { ...EQUIVALENCIAS_POR_DEFECTO },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { ...fechaActual },
      fechaActual: { ...fechaActual },
      creada: '2026-09-18T08:00:00.000Z',
      actualizada: '2026-09-18T08:00:00.000Z',
      versionFormato: VERSION_FORMATO,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [{ id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' }],
    cajas: [{ dominioId: 'dom.tharan', saldoInicial: { base: 0 } }],
    movimientos: [],
    transferencias: [],
    deudas: [],
    recurrentes: [],
    objetos: [],
    ventas: [],
    inversiones: [],
    hechizos: [],
    intentos: [],
    pergaminos: [],
    poblaciones: [],
    existencias: [],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
  }
}

/**
 * Añade un asentamiento con su caja (saldo inicial en mh, 0 o más) y su población, y lo que la validación exige de
 * cada asentamiento: la fila de víveres del almacén y el mercado local con su nombre. El alta es la fecha inicial.
 */
export function conAsentamiento(
  estado: EstadoPartida,
  datos: { id: Id; nombre: string; caja: number; habitantes?: number },
): EstadoPartida {
  return {
    ...estado,
    dominios: [
      ...estado.dominios,
      { id: datos.id, tipo: 'asentamiento', nombre: datos.nombre, categoria: 'aldea', alta: { ...estado.partida.fechaInicial } },
    ],
    cajas: [...estado.cajas, { dominioId: datos.id, saldoInicial: { base: datos.caja } }],
    poblaciones: [
      ...estado.poblaciones,
      { dominioId: datos.id, habitantesIniciales: datos.habitantes ?? 0, cambios: [], consumos: [] },
    ],
    existencias: [...estado.existencias, { dominioId: datos.id, recursoId: RECURSO.viveres, cantidad: 0 }],
    mercados: [...estado.mercados, { id: `mercado.${datos.id}`, nombre: datos.nombre, localDe: datos.id, precios: [] }],
  }
}

/** Congela a fondo un valor: cualquier escritura lanza (las pruebas del motor congelan la entrada). */
export function congelar<T>(valor: T): T {
  if (typeof valor !== 'object' || valor === null || Object.isFrozen(valor)) {
    return valor
  }
  Object.freeze(valor)
  for (const hijo of Object.values(valor)) {
    congelar(hijo)
  }
  return valor
}
