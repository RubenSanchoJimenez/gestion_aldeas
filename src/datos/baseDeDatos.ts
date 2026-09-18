import { Dexie, type DexieOptions, type EntityTable, type Table } from 'dexie'
import type { OpcionCatalogo, RecursoCatalogo } from '../dominio/modelo/catalogos'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import type { ResumenPartida } from '../dominio/modelo/resumen'

/** Nombre de la base de IndexedDB de la app. */
export const NOMBRE_BASE = 'gestion-aldeas'

/** Versión de la estructura de la base (tablas e índices); no es versionFormato, que es la del contenido (§6.1). */
export const VERSION_BASE = 1

/** Fila de la tabla de ajustes de la app: clave y valor sueltos, fuera de toda partida. */
export interface Ajuste {
  clave: string
  valor: unknown
}

/**
 * Una sola base con cinco tablas: una transacción puede tocar a la vez partidas y catálogos (importar una copia y,
 * en la fase 9, reasignar una opción en todas las partidas). Las transacciones de IndexedDB no abarcan dos bases.
 */
export class BaseDeDatos extends Dexie {
  declare partidas: Table<DocumentoPartida, string>
  declare resumenes: EntityTable<ResumenPartida, 'id'>
  declare opcionesCatalogo: EntityTable<OpcionCatalogo, 'id'>
  declare recursosCatalogo: EntityTable<RecursoCatalogo, 'id'>
  declare ajustes: EntityTable<Ajuste, 'clave'>

  /** En la app: new BaseDeDatos(). En las pruebas: baseDePrueba(), que inyecta una IDBFactory nueva. */
  constructor(nombre: string = NOMBRE_BASE, opciones?: DexieOptions) {
    super(nombre, opciones)
    this.version(VERSION_BASE).stores({
      partidas: 'partida.id',
      resumenes: 'id, abiertaEl, actualizada',
      opcionesCatalogo: 'id, lista',
      recursosCatalogo: 'id',
      ajustes: 'clave',
    })
  }
}
