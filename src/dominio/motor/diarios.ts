import { aNumeroDeDia, type Fecha } from '../calendario/fecha'
import type { Id } from '../modelo/comunes'
import type { DetalleTrabajo, ReglaOrigen } from '../modelo/movimientos'
import { anadirMovimiento, type AcumuladoDiario, type Contexto } from './contexto'
import { conceptoDiario, conceptoSalarios, conceptoSoldadas } from './textos'

/** Lo cobrado o pagado un día por una regla «Cada día» (§9 l.1285). */
export interface EntradaDiaria {
  clase: AcumuladoDiario['clase']
  regla: ReglaOrigen
  dominioId: Id
  tipo: 'gasto' | 'ingreso'
  categoriaId: Id
  concepto: string
  unidadDiaria?: string
  inversionId?: Id
  /** El día del cobro o del pago: varias filas de salarios del mismo día cuentan un solo día. */
  fecha: Fecha
  /** Lo cobrado o pagado de verdad ese día, en mh; con 0 no cuenta. */
  importe: number
  /** Salarios y soldadas: la fila con lo pagado ese día. */
  fila?: DetalleTrabajo
}

/** Suma el día a su acumulado (clave `${regla.tipo}|${regla.id}`) y cuenta el día (§9 l.1285, D-021). */
export function acumularDiario(ctx: Contexto, entrada: EntradaDiaria): void {
  // Un día sin dinero no suma ni cuenta: «· 7 noches» cuenta solo los días que se pagaron (D-021).
  if (entrada.importe <= 0) {
    return
  }
  const clave = `${entrada.regla.tipo}|${entrada.regla.id}`
  let acumulado = ctx.diarios.get(clave)
  if (acumulado === undefined) {
    acumulado = {
      clase: entrada.clase,
      regla: { ...entrada.regla },
      dominioId: entrada.dominioId,
      tipo: entrada.tipo,
      categoriaId: entrada.categoriaId,
      concepto: entrada.concepto,
      unidadDiaria: entrada.unidadDiaria,
      inversionId: entrada.inversionId,
      importe: 0,
      dias: 0,
      ultimoDia: Number.NEGATIVE_INFINITY,
      detalle: new Map(),
    }
    ctx.diarios.set(clave, acumulado)
  }
  acumulado.importe += entrada.importe
  const numero = aNumeroDeDia(entrada.fecha)
  if (numero !== acumulado.ultimoDia) {
    acumulado.dias += 1
    acumulado.ultimoDia = numero
  }
  const fila = entrada.fila
  if (fila !== undefined) {
    const claveFila = fila.origenId ?? fila.nombre
    const anterior = acumulado.detalle.get(claveFila)
    const base = (anterior?.importe.base ?? 0) + fila.importe.base
    acumulado.detalle.set(claveFila, { ...(anterior ?? fila), importe: { base } })
  }
}

/** El concepto del movimiento de un acumulado: «· 7 noches», «Salarios de 5 trabajadores · 7 días»… (D-029, D-030). */
function conceptoDe(acumulado: AcumuladoDiario, detalle: readonly DetalleTrabajo[]): string {
  switch (acumulado.clase) {
    case 'regla':
      return conceptoDiario(acumulado.concepto, acumulado.dias, acumulado.unidadDiaria)
    case 'salarios':
      return conceptoSalarios(detalle.reduce((total, fila) => total + fila.numero, 0), acumulado.dias)
    case 'soldadas':
      return conceptoSoldadas(acumulado.dias)
  }
}

/** Un movimiento por acumulado con importe > 0, fechado el último día, sin introducido (§9 l.1285, D-022, D-029). */
export function cerrarDiarios(ctx: Contexto): void {
  for (const acumulado of ctx.diarios.values()) {
    if (acumulado.importe <= 0) {
      continue
    }
    const detalle = [...acumulado.detalle.values()]
    anadirMovimiento(ctx, {
      dominioId: acumulado.dominioId,
      fecha: { ...ctx.hasta },
      tipo: acumulado.tipo,
      importe: { base: acumulado.tipo === 'gasto' ? -acumulado.importe : acumulado.importe },
      categoriaId: acumulado.categoriaId,
      concepto: conceptoDe(acumulado, detalle),
      regla: acumulado.regla,
      inversionId: acumulado.inversionId,
      detalleTrabajo: detalle.length > 0 ? detalle : undefined,
    })
  }
}
