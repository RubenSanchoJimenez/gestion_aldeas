import { ocurreEl } from '../../calendario/recurrencia'
import { CATEGORIA } from '../../catalogo/inicial'
import type { Importe } from '../../dinero/importe'
import { conEfecto, pctDeIngresos } from '../../eventos/efectos'
import type { Movimiento } from '../../modelo/movimientos'
import { habitantesDe } from '../../poblacion/habitantes'
import { cobrar } from '../caja'
import { anadirMovimiento, aplicarProgramado, type Contexto, type Dia } from '../contexto'
import { acumularDiario } from '../diarios'
import { conceptoBeneficio } from '../textos'

/** Paso 8 sin los locales: impuestos y rentas, beneficios, ingresos recurrentes y cobros programados, en ese orden (§9 l.1280). */
export function pasoCobros(ctx: Contexto, dia: Dia): void {
  cobrarImpuestosYRentas(ctx, dia)
  cobrarBeneficios(ctx, dia)
  cobrarIngresosRecurrentes(ctx, dia)
  cobrarProgramados(ctx, dia)
}

/**
 * Los movimientos programados de un tipo que tocan ese día, en el orden del libro. El índice del contexto ya pone
 * los de fecha pasada en el primer día y deja fuera los vinculados, que esperan a la fase 4 (T14). Lo usa también
 * el paso 9.
 */
export function programadosDelDia(ctx: Contexto, dia: Dia, tipo: 'gasto' | 'ingreso'): Movimiento[] {
  const programados: Movimiento[] = []
  for (const id of ctx.programadosPorDia.get(dia.numero) ?? []) {
    const indice = ctx.indiceMovimiento.get(id)
    if (indice === undefined) {
      throw new Error(`No existe «${id}»`)
    }
    const movimiento = ctx.movimientos[indice]
    if (movimiento.programado && movimiento.tipo === tipo) {
      programados.push(movimiento)
    }
  }
  return programados
}

/** El importe de un cobro: con lo introducido de su origen solo si cobra exactamente esa base (T8). */
function ingresoDe(importe: number, origen: Importe, exacto: boolean): Importe {
  return exacto && origen.introducido !== undefined
    ? { base: importe, introducido: { ...origen.introducido } }
    : { base: importe }
}

/** Impuestos y rentas de ingreso: fijos o por habitante, con los eventos de ingresos del día (§7 l.1139; D-022; D-026). */
function cobrarImpuestosYRentas(ctx: Contexto, dia: Dia): void {
  for (const impuesto of ctx.estado.impuestosRentas) {
    if (impuesto.sentido !== 'ingreso' || !ocurreEl(impuesto.recurrencia, dia.fecha)) {
      continue
    }
    const base =
      impuesto.base === 'fija'
        ? impuesto.importe.base
        : impuesto.importe.base * habitantesDe(ctx.estado, impuesto.dominioId, dia.fecha)
    const importe = conEfecto(base, pctDeIngresos(dia.eventos, impuesto.dominioId, impuesto.id))
    if (importe === 0) {
      continue
    }
    cobrar(ctx, impuesto.dominioId, importe)
    const regla = { tipo: 'impuesto', id: impuesto.id } as const
    if (impuesto.recurrencia.tipo === 'diaria') {
      acumularDiario(ctx, {
        clase: 'regla',
        regla,
        dominioId: impuesto.dominioId,
        tipo: 'ingreso',
        categoriaId: impuesto.categoriaId,
        concepto: impuesto.concepto,
        fecha: dia.fecha,
        importe,
      })
      continue
    }
    anadirMovimiento(ctx, {
      dominioId: impuesto.dominioId,
      fecha: dia.fecha,
      tipo: 'ingreso',
      importe: ingresoDe(importe, impuesto.importe, impuesto.base === 'fija' && importe === impuesto.importe.base),
      categoriaId: impuesto.categoriaId,
      concepto: impuesto.concepto,
      regla,
    })
  }
}

/** Beneficios de las inversiones activas, en su cuenta de beneficios y sin eventos (D-019; D-026). */
function cobrarBeneficios(ctx: Contexto, dia: Dia): void {
  for (const inversion of ctx.estado.inversiones) {
    if (inversion.estado !== 'activa' || !ocurreEl(inversion.recurrencia, dia.fecha)) {
      continue
    }
    const importe = inversion.beneficio.base
    if (importe === 0) {
      continue
    }
    cobrar(ctx, inversion.cuentaBeneficiosId, importe)
    const regla = { tipo: 'beneficio', id: inversion.id } as const
    const concepto = conceptoBeneficio(inversion.negocio)
    if (inversion.recurrencia.tipo === 'diaria') {
      acumularDiario(ctx, {
        clase: 'regla',
        regla,
        dominioId: inversion.cuentaBeneficiosId,
        tipo: 'ingreso',
        categoriaId: CATEGORIA.beneficiosDeInversiones,
        concepto,
        inversionId: inversion.id,
        fecha: dia.fecha,
        importe,
      })
      continue
    }
    anadirMovimiento(ctx, {
      dominioId: inversion.cuentaBeneficiosId,
      fecha: dia.fecha,
      tipo: 'ingreso',
      importe: ingresoDe(importe, inversion.beneficio, true),
      categoriaId: CATEGORIA.beneficiosDeInversiones,
      concepto,
      regla,
      inversionId: inversion.id,
    })
  }
}

/** Ingresos recurrentes activos de J5, en su cuentaId y sin eventos (§7 l.1200; D-026). */
function cobrarIngresosRecurrentes(ctx: Contexto, dia: Dia): void {
  for (const recurrente of ctx.estado.recurrentes) {
    if (recurrente.tipo !== 'ingreso' || !recurrente.activo || !ocurreEl(recurrente.recurrencia, dia.fecha)) {
      continue
    }
    const importe = recurrente.importe.base
    if (importe === 0) {
      continue
    }
    cobrar(ctx, recurrente.cuentaId, importe)
    const regla = { tipo: 'recurrente', id: recurrente.id } as const
    if (recurrente.recurrencia.tipo === 'diaria') {
      acumularDiario(ctx, {
        clase: 'regla',
        regla,
        dominioId: recurrente.cuentaId,
        tipo: 'ingreso',
        categoriaId: recurrente.categoriaId,
        concepto: recurrente.concepto,
        unidadDiaria: recurrente.unidadDiaria,
        fecha: dia.fecha,
        importe,
      })
      continue
    }
    anadirMovimiento(ctx, {
      dominioId: recurrente.cuentaId,
      fecha: dia.fecha,
      tipo: 'ingreso',
      importe: ingresoDe(importe, recurrente.importe, true),
      categoriaId: recurrente.categoriaId,
      concepto: recurrente.concepto,
      regla,
    })
  }
}

/** Cobros programados del día: entran enteros y el movimiento se aplica con el avanceId (§6.4 l.768; T14). */
function cobrarProgramados(ctx: Contexto, dia: Dia): void {
  for (const movimiento of programadosDelDia(ctx, dia, 'ingreso')) {
    cobrar(ctx, movimiento.dominioId, movimiento.importe.base)
    aplicarProgramado(ctx, movimiento.id, {})
  }
}
