/** Marcas diacríticas que la descomposición NFD separa de su letra (de U+0300 a U+036F). */
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g

/** Hueco donde se aparta la ñ mientras se quitan las tildes; no es un carácter que se pueda teclear. */
const HUECO_ENIE = '\u0001'

/** El hueco, para devolver la ñ a su sitio al final. */
const REGEX_HUECO_ENIE = new RegExp(HUECO_ENIE, 'g')

/**
 * Nombre en la forma en la que se comparan los duplicados (§6.6): sin mayúsculas, sin tildes ni diéresis,
 * con los espacios colapsados en uno y sin espacios al principio ni al final. La ñ se conserva, porque
 * «no equivale a la n».
 */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFC')
    .toLowerCase()
    .replace(/ñ/g, HUECO_ENIE)
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .replace(REGEX_HUECO_ENIE, 'ñ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Si dos nombres son el mismo a efectos de duplicado (§6.6). */
export function mismoNombre(a: string, b: string): boolean {
  return normalizarNombre(a) === normalizarNombre(b)
}

/** Nombres que usan los filtros y que ninguna lista puede repetir (§6.6, «Reservados»). */
export const NOMBRES_RESERVADOS: readonly string[] = [
  'todas',
  'todos',
  'todas las categorias',
  'todas las ubicaciones',
  'todos los tipos',
]

/** Si un nombre choca con los que usan los filtros (§6.6): «Ese nombre lo usa el filtro». */
export function esNombreReservado(nombre: string): boolean {
  return NOMBRES_RESERVADOS.includes(normalizarNombre(nombre))
}
