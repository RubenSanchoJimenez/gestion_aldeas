import { normalizarNombre } from './normalizar'

/** Tramo [inicio, fin) del texto ORIGINAL que coincide con la búsqueda. */
export interface Coincidencia {
  inicio: number
  fin: number
}

/** Marcas diacríticas que la descomposición NFD separa de su letra (de U+0300 a U+036F), con escape: un carácter de control invisible en el código fuente es una trampa para quien lo lea o lo copie. */
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g

/** El texto normalizado letra a letra, con el tramo [inicio, fin) del ORIGINAL que corresponde a cada carácter. */
interface TextoNormalizado {
  normalizado: string
  inicios: number[]
  fines: number[]
}

/**
 * Normaliza `texto` con el mismo criterio que normalizarNombre (minúsculas, sin tildes, ñ aparte, espacios
 * colapsados sin los del principio), recorriendo unidad UTF-16 a unidad UTF-16 para poder traducir cada
 * carácter del resultado a su tramo en el texto ORIGINAL. Una marca diacrítica suelta (el texto ya venía en
 * NFD) se salta y alarga el fin del carácter anterior.
 */
function normalizarConIndices(texto: string): TextoNormalizado {
  let normalizado = ''
  const inicios: number[] = []
  const fines: number[] = []
  let enEspacio = true

  for (let i = 0; i < texto.length; i += 1) {
    const original = texto[i]
    if (/\s/.test(original)) {
      enEspacio = true
      continue
    }
    const letra =
      original === 'ñ' || original === 'Ñ'
        ? 'ñ'
        : original.toLowerCase().normalize('NFD').replace(MARCAS_DIACRITICAS, '')
    if (letra === '') {
      // Marca diacrítica suelta: el texto ya venía en NFD. Se pega al carácter anterior.
      if (fines.length > 0) {
        fines[fines.length - 1] = i + 1
      }
      continue
    }
    if (enEspacio && normalizado.length > 0) {
      normalizado += ' '
      inicios.push(i)
      fines.push(i)
    }
    enEspacio = false
    for (const caracter of letra) {
      normalizado += caracter
      inicios.push(i)
      fines.push(i + 1)
    }
  }
  return { normalizado, inicios, fines }
}

/**
 * Primera coincidencia sin mayúsculas ni tildes y con los espacios colapsados (§6.5, espec. L862; mismo criterio
 * que normalizarNombre, con la ñ aparte). null si no hay, o si la búsqueda queda vacía al normalizarla.
 */
export function buscarEn(texto: string, busqueda: string): Coincidencia | null {
  const busquedaNormalizada = normalizarNombre(busqueda)
  if (busquedaNormalizada === '') {
    return null
  }
  const { normalizado, inicios, fines } = normalizarConIndices(texto)
  const posicion = normalizado.indexOf(busquedaNormalizada)
  if (posicion === -1) {
    return null
  }
  return { inicio: inicios[posicion], fin: fines[posicion + busquedaNormalizada.length - 1] }
}
