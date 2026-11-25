import type { ArchivoParaDescargar } from './servicios'

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
