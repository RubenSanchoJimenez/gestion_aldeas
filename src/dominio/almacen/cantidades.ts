import { formatearNumero } from '../dinero/formato'
import { redondearMitadArriba } from '../dinero/importe'
import type { Existencia, PeriodoViveres } from '../modelo/almacen'
import type { Id } from '../modelo/comunes'

/** Por debajo, una falta, una pérdida o un resto cuentan 0 (TC1). */
export const TOLERANCIA = 1e-6

/** Cómo se escribe la unidad de un recurso (RecursoEnCopia la tiene). */
export interface UnidadesDeRecurso {
  unidadSingular: string
  unidadPlural: string
}

/** Lo que hace falta para «20 carretadas de cal». */
export interface RecursoConNombre extends UnidadesDeRecurso {
  nombre: string
}

/**
 * El nombre con minúscula inicial, para meterlo dentro de una frase. Es una copia diminuta de la que expone
 * motor/textos.ts (minusculaInicial): este módulo no puede importar de motor/*, así que se repite aquí.
 */
function conMinusculaInicial(texto: string): string {
  return texto.length === 0 ? texto : texto[0].toLowerCase() + texto.slice(1)
}

/** |cantidad| < TOLERANCIA. */
export function esCero(cantidad: number): boolean {
  return Math.abs(cantidad) < TOLERANCIA
}

/** `${dominioId}|${recursoId}`: la clave de una fila del almacén (sale de validacion/referencias.ts, TC16). */
export function claveExistencia(dominioId: Id, recursoId: Id): string {
  return `${dominioId}|${recursoId}`
}

/** base × máx(0, 1 + pct ÷ 100), en coma flotante (TC6; §7 l.1139). */
export function conEfectoCantidad(base: number, pct: number): number {
  return base * Math.max(0, 1 + pct / 100)
}

/**
 * «93 sacos», «1 saco», «1.148 sacos», «0 sacos» y «menos de 1 carretada» (§3 l.125; D-063). Redondea con
 * redondearMitadArriba(cantidad + TOLERANCIA); una cantidad que no es 0 (esCero) y redondea a 0 es «menos de 1».
 */
export function formatearCantidad(cantidad: number, unidades: UnidadesDeRecurso): string {
  const redondeada = redondearMitadArriba(cantidad + TOLERANCIA)
  if (redondeada === 0) {
    return esCero(cantidad) ? `0 ${unidades.unidadPlural}` : `menos de 1 ${unidades.unidadSingular}`
  }
  const unidad = redondeada === 1 ? unidades.unidadSingular : unidades.unidadPlural
  return `${formatearNumero(redondeada, 0)} ${unidad}`
}

/** «20 carretadas de cal», «12 sacos de víveres»: formatearCantidad + « de » + el nombre con minúscula inicial. */
export function cantidadDeRecurso(cantidad: number, recurso: RecursoConNombre): string {
  return `${formatearCantidad(cantidad, recurso)} de ${conMinusculaInicial(recurso.nombre)}`
}

/** Si una cantidad ya escrita va con el verbo en singular: «1 saco» y «menos de 1 saco» sí (D-051). */
export function esUnaUnidad(textoDeCantidad: string): boolean {
  return /^1 /.test(textoDeCantidad) || textoDeCantidad.startsWith('menos de 1 ')
}

/** Lo que cabe todavía, hacia abajo: máx(0, ⌊capacidad − cantidad + TOLERANCIA⌋); null sin capacidad (D-063). */
export function cabenMas(existencia: Pick<Existencia, 'cantidad' | 'capacidad'>): number | null {
  if (existencia.capacidad === undefined) {
    return null
  }
  return Math.max(0, Math.floor(existencia.capacidad - existencia.cantidad + TOLERANCIA))
}

/** «Caben 890 sacos más», «Cabe 1 saco más» y, con 0, «El almacén está lleno» (D-067). */
export function textoCaben(caben: number, unidades: UnidadesDeRecurso): string {
  if (caben === 0) {
    return 'El almacén está lleno'
  }
  const cantidad = formatearCantidad(caben, unidades)
  return `${esUnaUnidad(cantidad) ? 'Cabe' : 'Caben'} ${cantidad} más`
}

/** Días de «Durante» (§7 l.1095): días 1, semanas 7, meses 30, años 365. */
export const DIAS_DEL_PERIODO: Readonly<Record<PeriodoViveres, number>> = {
  dias: 1,
  semanas: 7,
  meses: 30,
  anios: 365,
}

/** ⌈personas × durante × días del periodo ÷ díasPorSaco⌉ en enteros: 100 personas × 1 mes = 100 sacos (§7 l.1095). */
export function sacosPorPersonas(personas: number, durante: number, periodo: PeriodoViveres, diasPorSaco: number): number {
  const dias = durante * DIAS_DEL_PERIODO[periodo]
  return Math.floor((personas * dias + diasPorSaco - 1) / diasPorSaco)
}
