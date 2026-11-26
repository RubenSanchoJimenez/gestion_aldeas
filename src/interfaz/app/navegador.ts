import type { ArchivoVinculado } from '../../datos/copia/automatica'
import type { ArchivoParaDescargar, Servicios } from './servicios'

/** Guarda un archivo en las descargas de la tablet. */
export function descargarArchivo(archivo: ArchivoParaDescargar): void {
  const url = URL.createObjectURL(new Blob([archivo.texto], { type: 'application/json' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = archivo.nombre
  enlace.click()
  URL.revokeObjectURL(url)
}

/** Pide al navegador que no borre los datos (D-098); false si no puede. */
export async function pedirAlmacenamientoPersistente(): Promise<boolean> {
  return (await navigator.storage?.persist?.()) ?? false
}

type SelectorDeGuardado = (opciones: {
  suggestedName: string
  types: { description: string; accept: Record<string, string[]> }[]
}) => Promise<ArchivoVinculado>

/** El selector de «guardar como» que permite reescribir luego el archivo; undefined donde no existe. */
export function selectorDeArchivo(): Servicios['elegirArchivo'] {
  const mostrar = (window as unknown as { showSaveFilePicker?: SelectorDeGuardado }).showSaveFilePicker
  if (mostrar === undefined) {
    return undefined
  }
  return async (nombreSugerido) => {
    try {
      return await mostrar.call(window, {
        suggestedName: nombreSugerido,
        types: [{ description: 'Copia de Gestión de Aldeas', accept: { 'application/json': ['.json'] } }],
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null
      }
      throw error
    }
  }
}
