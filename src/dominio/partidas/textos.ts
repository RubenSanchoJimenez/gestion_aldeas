/** Nombre de la partida y del personaje: de 1 a 60 caracteres (EsquemaNombreLibre, comunes.ts L150; D-014). */
export const LARGO_MAXIMO_NOMBRE = 60

/** null o el error del nombre ya recortado: «Escribe un nombre» (J2e, espec. L1452) o «El nombre no puede pasar de 60 letras» (D-088). */
export function errorDeNombre(nombre: string): string | null {
  const recortado = nombre.trim()
  if (recortado === '') {
    return 'Escribe un nombre'
  }
  if (recortado.length > LARGO_MAXIMO_NOMBRE) {
    return 'El nombre no puede pasar de 60 letras'
  }
  return null
}

/** «Tharan, Bree y Archet»; «Aldric, sin asentamientos»; «Tharan y Bree»; '' si no hay ninguno (P0, mjs L321-322). */
export function textoDominios(nombres: readonly string[]): string {
  if (nombres.length === 0) {
    return ''
  }
  if (nombres.length === 1) {
    return `${nombres[0]}, sin asentamientos`
  }
  const ultimo = nombres[nombres.length - 1]
  const anteriores = nombres.slice(0, -1).join(', ')
  return `${anteriores} y ${ultimo}`
}
