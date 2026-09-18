import { ocurreEl, type Recurrencia } from '../../calendario/recurrencia'
import { CATEGORIA } from '../../catalogo/inicial'
import type { Importe } from '../../dinero/importe'
import { conEfecto, pctDeCostes } from '../../eventos/efectos'
import { anadirObjetoComprado } from '../../inventario/compra'
import type { ImpuestoRenta } from '../../modelo/asentamiento'
import type { Id } from '../../modelo/comunes'
import type { DominioAsentamiento } from '../../modelo/dominios'
import type { DetalleTrabajo, Movimiento, ObjetoPendiente } from '../../modelo/movimientos'
import { habitantesDe } from '../../poblacion/habitantes'
import { pagarHasta } from '../caja'
import { anadirMovimiento, aplicarProgramado, type Contexto, type Dia } from '../contexto'
import { acumularDiario } from '../diarios'
import { registrarImpago, sumarAlCargo, type Impago } from '../impagos'
import {
  conceptoSalarios,
  conceptoSoldadas,
  contraparteDeSalarios,
  contraparteDeSoldadas,
  nombreDeOficio,
} from '../textos'
import { programadosDelDia } from './cobros'

/** Paso 9: salarios, soldadas, tributos, gastos recurrentes y pagos programados, por filas y sin dejar cajas en negativo (§9). */
export function pasoPagos(ctx: Contexto, dia: Dia): void {
  const asentamientos = ctx.estado.dominios.filter((d): d is DominioAsentamiento => d.tipo === 'asentamiento')
  const salarios = filasDelDia(ctx.estado.trabajadores, dia)
  for (const asentamiento of asentamientos) {
    const filas = (salarios.get(asentamiento.id) ?? []).map((trabajador) => ({
      id: trabajador.id,
      nombre: nombreDeOficio(ctx.opciones.catalogo, trabajador.oficioId, trabajador.numero),
      numero: trabajador.numero,
      porCabeza: trabajador.salario.base,
      diaria: trabajador.recurrencia.tipo === 'diaria',
    }))
    pagarPlantilla(ctx, dia, asentamiento, 'salarios', filas)
  }
  const soldadas = filasDelDia(ctx.estado.unidadesGuarnicion, dia)
  for (const asentamiento of asentamientos) {
    const filas = (soldadas.get(asentamiento.id) ?? []).map((unidad) => ({
      id: unidad.id,
      nombre: unidad.nombre,
      numero: unidad.numero,
      porCabeza: unidad.soldada.base,
      diaria: unidad.recurrencia.tipo === 'diaria',
    }))
    pagarPlantilla(ctx, dia, asentamiento, 'soldadas', filas)
  }
  pagarTributos(ctx, dia)
  pagarGastosRecurrentes(ctx, dia, new Set(asentamientos.map((asentamiento) => asentamiento.id)))
  pagarProgramados(ctx, dia)
}

/** Una fila de trabajadores o una unidad lista para pagar: lo que cobra cada uno y su nombre en el detalle. */
interface FilaDePlantilla {
  id: Id
  nombre: string
  numero: number
  porCabeza: number
  diaria: boolean
}

/** Las filas que cobran ese día, agrupadas por asentamiento y en el orden del array. */
function filasDelDia<T extends { dominioId: Id; recurrencia: Recurrencia }>(
  filas: readonly T[],
  dia: Dia,
): Map<Id, T[]> {
  const grupos = new Map<Id, T[]>()
  for (const fila of filas) {
    if (!ocurreEl(fila.recurrencia, dia.fecha)) {
      continue
    }
    const grupo = grupos.get(fila.dominioId)
    if (grupo === undefined) {
      grupos.set(fila.dominioId, [fila])
    } else {
      grupo.push(fila)
    }
  }
  return grupos
}

/** El importe de un pago: con lo introducido de su origen solo si se pagó exactamente esa base (T8). */
function gastoDe(pagado: number, origen: Importe, exacto: boolean): Importe {
  return exacto && origen.introducido !== undefined
    ? { base: -pagado, introducido: { ...origen.introducido } }
    : { base: -pagado }
}

/**
 * Anota lo que no se pudo pagar. Un pago que no es diario abre un cargo ese día; los diarios, un solo cargo por
 * avance y origen, con la fecha del primer día sin dinero, al que se suman los días siguientes (§9 l.1296; D-021).
 */
function anotarImpago(ctx: Contexto, impago: Impago, diario: boolean): void {
  if (impago.importe <= 0) {
    return
  }
  if (!diario) {
    registrarImpago(ctx, impago)
    return
  }
  const clave = `${impago.origen.tipo}|${impago.origen.id}`
  const abierto = ctx.cargosDiarios.get(clave)
  if (abierto === undefined) {
    ctx.cargosDiarios.set(clave, registrarImpago(ctx, impago))
  } else {
    sumarAlCargo(ctx, abierto, impago.importe)
  }
}

/**
 * Salarios o soldadas de un asentamiento un día, fila a fila (§9 l.1287 y l.1292). Las filas pagadas que no son
 * diarias forman un movimiento con su detalle; las «Cada día» van al acumulado del avance (D-029). Deja un suceso por
 * asentamiento y día con el total, que es lo que avisa «Pago no cubierto» (T21).
 */
function pagarPlantilla(
  ctx: Contexto,
  dia: Dia,
  asentamiento: DominioAsentamiento,
  clase: 'salarios' | 'soldadas',
  filas: readonly FilaDePlantilla[],
): void {
  const pct = pctDeCostes(dia.eventos, asentamiento.id, clase)
  const regla = { tipo: clase, id: asentamiento.id } as const
  const categoriaId = clase === 'salarios' ? CATEGORIA.salarios : CATEGORIA.soldadas
  const detalle: DetalleTrabajo[] = []
  let debidoTotal = 0
  let pagadoTotal = 0
  let impagoDelDia = 0
  let impagoDiario = 0
  let todasDiarias = true
  for (const fila of filas) {
    const debido = conEfecto(fila.numero * fila.porCabeza, pct)
    if (debido === 0) {
      continue
    }
    const pagado = pagarHasta(ctx, asentamiento.id, debido)
    debidoTotal += debido
    pagadoTotal += pagado
    if (fila.diaria) {
      impagoDiario += debido - pagado
    } else {
      impagoDelDia += debido - pagado
      todasDiarias = false
    }
    if (pagado === 0) {
      continue
    }
    const entrada: DetalleTrabajo = {
      origenId: fila.id,
      nombre: fila.nombre,
      numero: fila.numero,
      importe: { base: pagado },
    }
    if (fila.diaria) {
      acumularDiario(ctx, {
        clase,
        regla,
        dominioId: asentamiento.id,
        tipo: 'gasto',
        categoriaId,
        concepto: clase === 'salarios' ? conceptoSalarios(fila.numero) : conceptoSoldadas(),
        fecha: dia.fecha,
        importe: pagado,
        fila: entrada,
      })
    } else {
      detalle.push(entrada)
    }
  }
  if (debidoTotal === 0) {
    return
  }
  if (detalle.length > 0) {
    const trabajadores = detalle.reduce((suma, entrada) => suma + entrada.numero, 0)
    anadirMovimiento(ctx, {
      dominioId: asentamiento.id,
      fecha: dia.fecha,
      tipo: 'gasto',
      importe: { base: -detalle.reduce((suma, entrada) => suma + entrada.importe.base, 0) },
      categoriaId,
      concepto: clase === 'salarios' ? conceptoSalarios(trabajadores) : conceptoSoldadas(),
      regla,
      detalleTrabajo: detalle,
    })
  }
  const origen = { tipo: clase, id: asentamiento.id } as const
  const contraparte =
    clase === 'salarios' ? contraparteDeSalarios(asentamiento.nombre) : contraparteDeSoldadas(asentamiento.nombre)
  anotarImpago(ctx, { origen, dominioId: asentamiento.id, contraparte, fecha: dia.fecha, importe: impagoDelDia }, false)
  anotarImpago(ctx, { origen, dominioId: asentamiento.id, contraparte, fecha: dia.fecha, importe: impagoDiario }, true)
  ctx.sucesos.push({
    tipo: 'pago',
    origen,
    dominioId: asentamiento.id,
    fecha: dia.fecha,
    debido: debidoTotal,
    pagado: pagadoTotal,
    que: { clase },
    diario: todasDiarias,
  })
}

/** La contraparte de un tributo: su destinatario o, si no tiene, su concepto (§9 l.1294). Solo se busca si hay impago. */
function contraparteDeTributo(ctx: Contexto, tributo: ImpuestoRenta): string {
  const destinatario = ctx.personas.find((persona) => persona.id === tributo.destinatarioId)
  return destinatario === undefined ? tributo.concepto : destinatario.nombre
}

/** Tributos: fijos o por habitante, con los eventos de costes «tributos» (§9 l.1281; §7 l.1139). */
function pagarTributos(ctx: Contexto, dia: Dia): void {
  for (const tributo of ctx.estado.impuestosRentas) {
    if (tributo.sentido !== 'tributo' || !ocurreEl(tributo.recurrencia, dia.fecha)) {
      continue
    }
    const base =
      tributo.base === 'fija'
        ? tributo.importe.base
        : tributo.importe.base * habitantesDe(ctx.estado, tributo.dominioId, dia.fecha)
    const debido = conEfecto(base, pctDeCostes(dia.eventos, tributo.dominioId, 'tributos'))
    if (debido === 0) {
      continue
    }
    const pagado = pagarHasta(ctx, tributo.dominioId, debido)
    const diaria = tributo.recurrencia.tipo === 'diaria'
    const regla = { tipo: 'tributo', id: tributo.id } as const
    if (pagado > 0 && diaria) {
      acumularDiario(ctx, {
        clase: 'regla',
        regla,
        dominioId: tributo.dominioId,
        tipo: 'gasto',
        categoriaId: tributo.categoriaId,
        concepto: tributo.concepto,
        fecha: dia.fecha,
        importe: pagado,
      })
    } else if (pagado > 0) {
      anadirMovimiento(ctx, {
        dominioId: tributo.dominioId,
        fecha: dia.fecha,
        tipo: 'gasto',
        importe: gastoDe(pagado, tributo.importe, tributo.base === 'fija' && pagado === tributo.importe.base),
        categoriaId: tributo.categoriaId,
        concepto: tributo.concepto,
        regla,
      })
    }
    const origen = { tipo: 'tributo', id: tributo.id } as const
    if (pagado < debido) {
      const contraparte = contraparteDeTributo(ctx, tributo)
      const impago = { origen, dominioId: tributo.dominioId, contraparte, fecha: dia.fecha, importe: debido - pagado }
      anotarImpago(ctx, impago, diaria)
    }
    ctx.sucesos.push({
      tipo: 'pago',
      origen,
      dominioId: tributo.dominioId,
      fecha: dia.fecha,
      debido,
      pagado,
      que: { clase: 'tributo' },
      diario: diaria,
    })
  }
}

/**
 * Gastos recurrentes activos de J5, desde su cuentaId. Un evento de costes «gastos» solo los cambia si esa cuenta es
 * la caja de un asentamiento: la bolsa del personaje nunca cambia con un evento (D-026). El impago va a la cuentaId (T25).
 */
function pagarGastosRecurrentes(ctx: Contexto, dia: Dia, asentamientos: ReadonlySet<Id>): void {
  for (const gasto of ctx.estado.recurrentes) {
    if (gasto.tipo !== 'gasto' || !gasto.activo || !ocurreEl(gasto.recurrencia, dia.fecha)) {
      continue
    }
    const pct = asentamientos.has(gasto.cuentaId) ? pctDeCostes(dia.eventos, gasto.cuentaId, 'gastos') : 0
    const debido = conEfecto(gasto.importe.base, pct)
    if (debido === 0) {
      continue
    }
    const pagado = pagarHasta(ctx, gasto.cuentaId, debido)
    const diaria = gasto.recurrencia.tipo === 'diaria'
    const regla = { tipo: 'recurrente', id: gasto.id } as const
    if (pagado > 0 && diaria) {
      acumularDiario(ctx, {
        clase: 'regla',
        regla,
        dominioId: gasto.cuentaId,
        tipo: 'gasto',
        categoriaId: gasto.categoriaId,
        concepto: gasto.concepto,
        unidadDiaria: gasto.unidadDiaria,
        fecha: dia.fecha,
        importe: pagado,
      })
    } else if (pagado > 0) {
      anadirMovimiento(ctx, {
        dominioId: gasto.cuentaId,
        fecha: dia.fecha,
        tipo: 'gasto',
        importe: gastoDe(pagado, gasto.importe, pagado === gasto.importe.base),
        categoriaId: gasto.categoriaId,
        concepto: gasto.concepto,
        regla,
      })
    }
    const origen = { tipo: 'recurrente', id: gasto.id } as const
    const impago = {
      origen,
      dominioId: gasto.cuentaId,
      contraparte: gasto.concepto,
      fecha: dia.fecha,
      importe: debido - pagado,
    }
    anotarImpago(ctx, impago, diaria)
    ctx.sucesos.push({
      tipo: 'pago',
      origen,
      dominioId: gasto.cuentaId,
      fecha: dia.fecha,
      debido,
      pagado,
      que: { clase: 'concepto', concepto: gasto.concepto },
      diario: diaria,
    })
  }
}

/**
 * Pagos programados del día. El movimiento se aplica siempre (D-020): con su importe si se pagó entero y, si no, con
 * lo pagado y sin lo introducido. Si llevaba objeto pendiente, el objeto se crea aunque no se pague entero (D-034).
 */
function pagarProgramados(ctx: Contexto, dia: Dia): void {
  for (const movimiento of programadosDelDia(ctx, dia, 'gasto')) {
    const debido = -movimiento.importe.base
    const pagado = pagarHasta(ctx, movimiento.dominioId, debido)
    if (movimiento.objetoPendiente !== undefined) {
      pasarAlInventario(ctx, movimiento, movimiento.objetoPendiente)
    }
    aplicarProgramado(ctx, movimiento.id, pagado === debido ? {} : { importe: { base: pagado === 0 ? 0 : -pagado } })
    if (debido === 0) {
      continue
    }
    const origen = { tipo: 'programado', id: movimiento.id } as const
    const impago = {
      origen,
      dominioId: movimiento.dominioId,
      contraparte: movimiento.concepto,
      fecha: dia.fecha,
      importe: debido - pagado,
    }
    anotarImpago(ctx, impago, false)
    ctx.sucesos.push({
      tipo: 'pago',
      origen,
      dominioId: movimiento.dominioId,
      fecha: dia.fecha,
      debido,
      pagado,
      que: { clase: 'concepto', concepto: movimiento.concepto },
      diario: false,
    })
  }
}

/** Crea o suma el objeto pendiente en el inventario del personaje y lo quita del movimiento (§7 l.1173; D-034; T19). */
function pasarAlInventario(ctx: Contexto, movimiento: Movimiento, pendiente: ObjetoPendiente): void {
  const personaje = ctx.estado.dominios.find((dominio) => dominio.tipo === 'personaje')
  if (personaje === undefined) {
    throw new Error('No existe «personaje»')
  }
  const indice = ctx.indiceMovimiento.get(movimiento.id)
  if (indice === undefined) {
    throw new Error(`No existe «${movimiento.id}»`)
  }
  const objetos = anadirObjetoComprado(ctx.objetos, pendiente, {
    personajeId: personaje.id,
    movimientoId: movimiento.id,
    nuevoId: ctx.opciones.nuevoId,
  })
  ctx.objetos.splice(0, ctx.objetos.length, ...objetos)
  // Sin la clave: un gasto que deja de estar programado no puede llevar objeto pendiente (movimientos.ts).
  const sinPendiente: Movimiento = { ...movimiento }
  delete sinPendiente.objetoPendiente
  ctx.movimientos[indice] = sinPendiente
}
