import type { Fecha } from '../../dominio/calendario/fecha'
import { formatearDiaMes, formatearFecha } from '../../dominio/calendario/formatoFecha'
import { formatearOro } from '../../dominio/dinero/formato'
import { importeDesde, type Importe } from '../../dominio/dinero/importe'
import type { Equivalencias } from '../../dominio/dinero/monedas'
import { leerImporte, type ValorImporte } from '../comunes/leerImporte'

/** El valor inicial de un campo de importe: lo que se tecleó, o el total en oro. */
export function valorDe(importe: Importe | undefined, eq: Equivalencias): ValorImporte {
  if (importe === undefined) {
    return { cantidad: '', moneda: 'mo' }
  }
  if (importe.introducido !== undefined) {
    return { cantidad: importe.introducido.cantidad, moneda: importe.introducido.moneda }
  }
  const enOro = formatearOro(Math.abs(importe.base), eq).replace(' mo', '').replace(/\./g, '')
  return { cantidad: enOro, moneda: 'mo' }
}

/** El importe tecleado, con lo que se escribió; lanza si está vacío, mal escrito o por debajo del mínimo. */
export function importeDe(valor: ValorImporte, eq: Equivalencias, minimo = 1): Importe {
  const lectura = leerImporte(valor, eq)
  if (lectura.tipo !== 'valido') {
    throw new Error(lectura.tipo === 'vacio' ? 'Escribe el importe' : lectura.error)
  }
  if (lectura.base < minimo) {
    throw new Error('El importe tiene que ser mayor que 0')
  }
  return importeDesde(valor.cantidad, valor.moneda, eq)
}

/** Un entero tecleado, o un error con el nombre del campo. */
export function enteroDe(texto: string, campo: string, minimo = 1, maximo = 1_000_000): number {
  const numero = /^\d+$/.test(texto.trim()) ? Number(texto) : Number.NaN
  if (!(numero >= minimo && numero <= maximo)) {
    throw new Error(`${campo}: escribe un número entero de ${minimo} a ${maximo}`)
  }
  return numero
}

/** Un decimal con coma o punto, o un error con el nombre del campo. */
export function decimalDe(texto: string, campo: string, minimo = 0, maximo = 1_000_000_000): number {
  const limpio = texto.trim().replace(',', '.')
  const numero = /^-?\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : Number.NaN
  if (!(numero >= minimo && numero <= maximo)) {
    throw new Error(`${campo}: escribe un número de ${minimo} a ${maximo}`)
  }
  return numero
}

/** «12 de abril», con el año solo si no es el de la partida. */
export function fechaCorta(fecha: Fecha, hoy: Fecha): string {
  return fecha.anio === hoy.anio ? formatearDiaMes(fecha) : formatearFecha(fecha)
}

/** El conteo de intentos de J1 y J7. */
export function conteoTexto(buenos: number, malos: number): string {
  return `✓ ${buenos} · ✗ ${malos}`
}
