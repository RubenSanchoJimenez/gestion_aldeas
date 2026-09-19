import { compararFechas, diasEntre, sumarDias } from '../../calendario/fecha'
import { hayDeTodo, sacarDelAlmacen, sumarAlAlmacen } from '../almacen'
import { pagarEntero, pagoProgramado } from '../caja'
import { aplicarProgramado, type Contexto, type Dia } from '../contexto'

/**
 * Paso 3: inicio de obras, salida de caravanas y entrada de compras y recepciones del almacén (§9 l.1275;
 * D-044, D-045, D-046, D-053). Una obra, una caravana o una compra que no puede empezar hoy no hace nada:
 * lo reintenta mañana, sin `pagarHasta` ni `registrarImpago` (TC8).
 */
export function pasoInicio(ctx: Contexto, dia: Dia): void {
  iniciarObras(ctx, dia)
  salirCaravanas(ctx, dia)
  entrarAlmacen(ctx, dia)
}

/** 1. Obras programadas con inicio ≤ día: con materiales y dinero, empiezan; si no, nada (D-044, D-046). */
function iniciarObras(ctx: Contexto, dia: Dia): void {
  ctx.obras.forEach((obra, indice) => {
    if (obra.estado !== 'programada' || obra.inicio === undefined || compararFechas(obra.inicio, dia.fecha) > 0) {
      return
    }
    if (!hayDeTodo(ctx, obra.dominioId, obra.materiales)) {
      return
    }
    if (!pagarEntero(ctx, obra.dominioId, pagoProgramado(ctx, obra.movimientoId))) {
      return
    }
    for (const [recursoId, cantidad] of Object.entries(obra.materiales)) {
      sacarDelAlmacen(ctx, dia, obra.dominioId, recursoId, cantidad)
    }
    if (obra.movimientoId !== undefined) {
      aplicarProgramado(ctx, obra.movimientoId, { fecha: dia.fecha })
    }
    ctx.obras[indice] = { ...obra, estado: 'enCurso', inicio: dia.fecha }
  })
}

/** 2. Caravanas programadas con salida ≤ día: compra paga; venta y traslado sacan su carga (D-044). */
function salirCaravanas(ctx: Contexto, dia: Dia): void {
  ctx.caravanas.forEach((caravana, indice) => {
    if (caravana.estado !== 'programada' || compararFechas(caravana.salida, dia.fecha) > 0) {
      return
    }
    const sale =
      caravana.operacion === 'compra'
        ? pagarEntero(ctx, caravana.dominioId, pagoProgramado(ctx, caravana.movimientoSalidaId))
        : sacarDelAlmacen(ctx, dia, caravana.dominioId, caravana.carga.recursoId, caravana.carga.cantidad)
    if (!sale) {
      return
    }
    if (caravana.operacion === 'compra' && caravana.movimientoSalidaId !== undefined) {
      aplicarProgramado(ctx, caravana.movimientoSalidaId, { fecha: dia.fecha })
    }
    const retraso = diasEntre(caravana.salida, dia.fecha)
    ctx.caravanas[indice] = {
      ...caravana,
      estado: 'enRuta',
      salida: dia.fecha,
      vuelta: sumarDias(caravana.vuelta, retraso),
    }
  })
}

/** 3. Entradas del almacén sin caravana, con fecha ≤ día y sin aplicar: compra paga; la recepción entra siempre (D-053). */
function entrarAlmacen(ctx: Contexto, dia: Dia): void {
  ctx.entradasAlmacen.forEach((entrada, indice) => {
    if (entrada.aplicada || entrada.caravanaId !== undefined || compararFechas(entrada.fecha, dia.fecha) > 0) {
      return
    }
    if (entrada.operacion === 'compra') {
      if (!pagarEntero(ctx, entrada.dominioId, pagoProgramado(ctx, entrada.movimientoId))) {
        return
      }
      if (entrada.movimientoId !== undefined) {
        aplicarProgramado(ctx, entrada.movimientoId, { fecha: dia.fecha })
      }
    }
    sumarAlAlmacen(ctx, dia, entrada.dominioId, entrada.recursoId, entrada.cantidad)
    ctx.entradasAlmacen[indice] = { ...entrada, aplicada: true, fecha: dia.fecha }
  })
}
