import type { ArchivoVinculado, EstadoPermiso } from '../copia/automatica'

/** Un archivo del dispositivo de mentira: guarda en memoria lo último que se cerró bien. */
export function archivoDePrueba(name: string, permisoInicial: EstadoPermiso = 'granted') {
  let permiso = permisoInicial
  let abiertos = 0
  // Los métodos van en el prototipo para que IndexedDB pueda clonar el objeto, como un archivo de verdad.
  class Archivo implements ArchivoVinculado {
    name = name
    contenido = ''
    fallo = ''
    maximoAbiertos = 0
    async queryPermission() {
      return permiso
    }
    async requestPermission() {
      permiso = 'granted'
      return permiso
    }
    async createWritable() {
      abiertos++
      this.maximoAbiertos = Math.max(this.maximoAbiertos, abiertos)
      let pendiente = ''
      return {
        write: async (texto: string) => {
          if (this.fallo !== '') {
            abiertos--
            throw new Error(this.fallo)
          }
          pendiente = texto
        },
        close: async () => {
          this.contenido = pendiente
          abiertos--
        },
      }
    }
  }
  return new Archivo()
}
