import { compararFechas } from '../../calendario/fecha'
import { CATEGORIA } from '../../catalogo/inicial'
import {
  abiertoAlgunDia,
  compararMeses,
  diaDeCobro,
  impuestoDeLocal,
  mesAnterior,
  mesDe,
  mesesPorCobrar,
  produccionDelMes,
} from '../../locales/impuesto'
import type { TipoLocal } from '../../modelo/asentamiento'
import type { AnioMes, Id } from '../../modelo/comunes'
import type { DetalleLocal } from '../../modelo/movimientos'
import { cobrar } from '../caja'
import { anadirMovimiento, type Contexto, type Dia } from '../contexto'
import { conceptoLocales } from '../textos'

/** Cobra los locales del día: un movimiento por asentamiento con su detalle, y cobradoHasta al día (§7; §9 l.1303-1313). */
export function cobrarLocales(ctx: Contexto, dia: Dia): void {
  // Los tipos cuyo día de cobro (o el último del mes, si no lo tiene) es hoy; casi todos los días no hay ninguno.
  const tiposQueCobran = new Map<Id, TipoLocal>()
  for (const tipo of ctx.estado.tiposLocal) {
    if (compararFechas(diaDeCobro(tipo, dia.fecha.anio, dia.fecha.mes), dia.fecha) === 0) {
      tiposQueCobran.set(tipo.id, tipo)
    }
  }
  if (tiposQueCobran.size === 0) {
    return
  }
  for (const dominio of ctx.estado.dominios) {
    if (dominio.tipo === 'asentamiento') {
      cobrarLocalesDe(ctx, dia, dominio.id, tiposQueCobran)
    }
  }
}

/** Los locales de un asentamiento cuyo tipo cobra hoy, en el orden del array (§9 l.1303-1313; T30). */
function cobrarLocalesDe(ctx: Contexto, dia: Dia, dominioId: Id, tiposQueCobran: ReadonlyMap<Id, TipoLocal>): void {
  const detalle: DetalleLocal[] = []
  ctx.localesComerciales.forEach((local, indice) => {
    const tipo = tiposQueCobran.get(local.tipoId)
    if (local.dominioId !== dominioId || tipo === undefined) {
      return
    }
    const meses = mesesPorCobrar(local, dia.fecha)
    if (meses.length === 0) {
      return
    }
    for (const mes of meses) {
      if (!abiertoAlgunDia(local, mes)) {
        continue
      }
      const produccion = produccionDelMes(local, mes)
      const impuesto = impuestoDeLocal(produccion.importe, tipo)
      if (impuesto === 0) {
        continue
      }
      detalle.push({
        localId: local.id,
        nombre: local.nombre,
        mes,
        produccion: { base: produccion.importe },
        anotada: produccion.anotada,
        impuesto: { base: impuesto },
      })
    }
    // Pague o no, el mes anterior al cobro queda cobrado; con meses por cobrar, siempre es posterior (T30).
    ctx.localesComerciales[indice] = { ...local, cobradoHasta: mesAnterior(mesDe(dia.fecha)) }
  })
  if (detalle.length === 0) {
    return
  }
  const total = detalle.reduce((suma, entrada) => suma + entrada.impuesto.base, 0)
  const locales = new Set(detalle.map((entrada) => entrada.localId)).size
  cobrar(ctx, dominioId, total)
  anadirMovimiento(ctx, {
    dominioId,
    fecha: dia.fecha,
    tipo: 'ingreso',
    importe: { base: total },
    categoriaId: CATEGORIA.impuestos,
    concepto: conceptoLocales(mesesDelDetalle(detalle), locales),
    regla: { tipo: 'locales', id: dominioId },
    detalleLocales: detalle,
  })
  ctx.sucesos.push({ tipo: 'cobroLocales', dominioId, fecha: dia.fecha })
}

/** Los meses distintos del detalle, de más antiguo a más reciente: «marzo y abril» (§9 l.1288). */
function mesesDelDetalle(detalle: readonly DetalleLocal[]): AnioMes[] {
  const meses: AnioMes[] = []
  for (const entrada of detalle) {
    if (!meses.some((mes) => compararMeses(mes, entrada.mes) === 0)) {
      meses.push(entrada.mes)
    }
  }
  return meses.sort(compararMeses)
}
