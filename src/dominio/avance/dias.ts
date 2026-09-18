import { ANIO_MAXIMO, compararFechas, diasEntre, sumarDias, type Fecha } from '../calendario/fecha'

/** Los días de un avance van de 1 a 366 (§9 l.1323). */
export const DIAS_MAXIMOS_DE_AVANCE = 366

/** Por encima de 90 días, P4 muestra un aviso ámbar (§9 l.1323; lo pinta la fase 6). */
export const DIAS_CON_AVISO = 90

/** El último día que la app sabe representar (§4, D-001). */
export const FECHA_MAXIMA: Fecha = { anio: ANIO_MAXIMO, mes: 12, dia: 31 }

/** El error del campo de días, o null (§9 l.1323-1324; D-041). */
export function errorDeDiasDeAvance(fechaActual: Fecha, dias: number): string | null {
  if (!Number.isInteger(dias) || dias < 1 || dias > DIAS_MAXIMOS_DE_AVANCE) {
    return 'Los días de un avance van de 1 a 366'
  }
  if (compararFechas(sumarDias(fechaActual, dias), FECHA_MAXIMA) > 0) {
    return 'No se puede avanzar más allá del 31 de diciembre de 9999'
  }
  return null
}

/** Días desde la fecha actual hasta una fecha de destino («Otro…», §6.1 P4; T22). */
export function diasHasta(fechaActual: Fecha, destino: Fecha): number {
  return diasEntre(fechaActual, destino)
}

/** Los días de una previsión, recortados para no pasar del 31 de diciembre de 9999 (§9 l.1322; D-001). */
export function diasQueCaben(fechaActual: Fecha, dias: number): number {
  return Math.max(0, Math.min(dias, diasEntre(fechaActual, FECHA_MAXIMA)))
}
