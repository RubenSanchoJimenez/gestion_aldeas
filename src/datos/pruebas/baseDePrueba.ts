import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { BaseDeDatos, NOMBRE_BASE } from '../baseDeDatos'

/** Base vacía sobre una IDBFactory nueva: solo la usan las pruebas; el código de la app nunca la importa. */
export function baseDePrueba(nombre: string = NOMBRE_BASE): BaseDeDatos {
  return new BaseDeDatos(nombre, { indexedDB: new IDBFactory(), IDBKeyRange })
}
