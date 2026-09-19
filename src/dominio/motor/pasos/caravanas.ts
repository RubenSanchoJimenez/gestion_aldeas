import { compararFechas } from '../../calendario/fecha'
import { CATEGORIA, RECURSO } from '../../catalogo/inicial'
import type { Importe } from '../../dinero/importe'
import { sumarAlAlmacen } from '../almacen'
import { cobrar } from '../caja'
import { anadirMovimiento, type Contexto, type Dia } from '../contexto'
import { conceptoVentaCaravana, nombreDeRecurso } from '../textos'

/** Paso 7, solo dinero: una venta en ruta que vuelve (o ya volvió) cobra su importe y queda terminada (§7 l.1153, l.1159; D-019). */
export function pasoVueltaDeVentas(ctx: Contexto, dia: Dia): void {
  ctx.caravanas.forEach((caravana, indice) => {
    // Las compras, los traslados y las ventas programadas esperan a la fase 4 (T27).
    if (caravana.operacion !== 'venta' || caravana.estado !== 'enRuta') {
      return
    }
    if (caravana.importe === undefined || caravana.mercadoId === undefined) {
      return
    }
    // Vuelve hoy o, el primer día del avance, ya había vuelto antes (§7 l.1159; §9 l.1321).
    const vuelta = compararFechas(caravana.vuelta, dia.fecha)
    if (vuelta > 0 || (vuelta < 0 && !dia.primero)) {
      return
    }
    const mercadoId = caravana.mercadoId
    const mercado = ctx.estado.mercados.find((m) => m.id === mercadoId)
    if (mercado === undefined) {
      throw new Error(`No existe «${mercadoId}»`)
    }
    cobrar(ctx, caravana.dominioId, caravana.importe.base)
    const importe: Importe =
      caravana.importe.introducido === undefined
        ? { base: caravana.importe.base }
        : { base: caravana.importe.base, introducido: { ...caravana.importe.introducido } }
    const movimientoId = anadirMovimiento(ctx, {
      dominioId: caravana.dominioId,
      fecha: dia.fecha,
      tipo: 'ingreso',
      importe,
      // D-011: la venta de víveres va a «Víveres del almacén»; la de cualquier otro recurso, a «Comercio».
      categoriaId: caravana.carga.recursoId === RECURSO.viveres ? CATEGORIA.viveresDelAlmacen : CATEGORIA.comercio,
      concepto: conceptoVentaCaravana(nombreDeRecurso(ctx.opciones.catalogo, caravana.carga.recursoId), mercado.nombre),
      vinculo: { tipo: 'caravana', id: caravana.id },
    })
    ctx.caravanas[indice] = { ...caravana, estado: 'terminada', movimientoVueltaId: movimientoId }
    ctx.sucesos.push({ tipo: 'vueltaCaravana', dominioId: caravana.dominioId, fecha: dia.fecha, mercadoId })
  })
}

/**
 * Paso 7, mercancía: una caravana de compra o de traslado en ruta con vuelta ≤ día entra en el almacén de
 * destino y queda terminada (§7 l.1152-1154; §9 l.1279). Las entradas que esperaban a esta caravana (TC18)
 * se marcan aplicadas. Las ventas no las toca esta función: las cobra `pasoVueltaDeVentas`, que no cambia.
 */
export function pasoLlegadaDeCaravanas(ctx: Contexto, dia: Dia): void {
  ctx.caravanas.forEach((caravana, indice) => {
    if (caravana.operacion === 'venta' || caravana.estado !== 'enRuta') {
      return
    }
    if (compararFechas(caravana.vuelta, dia.fecha) > 0) {
      return
    }
    const destino = caravana.operacion === 'compra' ? caravana.dominioId : caravana.destinoId
    if (destino === undefined) {
      throw new Error(`No existe destino para «${caravana.id}»`)
    }
    sumarAlAlmacen(ctx, dia, destino, caravana.carga.recursoId, caravana.carga.cantidad)
    ctx.caravanas[indice] = { ...caravana, estado: 'terminada' }
    ctx.entradasAlmacen.forEach((entrada, indiceEntrada) => {
      if (entrada.caravanaId === caravana.id) {
        ctx.entradasAlmacen[indiceEntrada] = { ...entrada, aplicada: true }
      }
    })
    if (caravana.operacion === 'compra') {
      if (caravana.mercadoId === undefined) {
        throw new Error(`No existe mercado para «${caravana.id}»`)
      }
      ctx.sucesos.push({ tipo: 'vueltaCaravana', dominioId: caravana.dominioId, fecha: dia.fecha, mercadoId: caravana.mercadoId })
    } else {
      ctx.sucesos.push({ tipo: 'llegadaTraslado', dominioId: caravana.dominioId, fecha: dia.fecha, destinoId: destino })
    }
  })
}
