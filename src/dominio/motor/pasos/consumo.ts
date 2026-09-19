import { conEfectoCantidad } from '../../almacen/cantidades'
import { RECURSO } from '../../catalogo/inicial'
import { pctDeConsumo } from '../../eventos/efectos'
import { habitantesEl } from '../../poblacion/habitantes'
import { consumirDelAlmacen } from '../almacen'
import type { Contexto, Dia } from '../contexto'

/**
 * Paso 5 · consumo (§7 l.1094, l.1100; §9 l.1277). Víveres, de la ración; después, cada consumo de la población
 * en su orden (D-060). Un pedido de 0 (o sin habitantes) no anota nada.
 */
export function pasoConsumo(ctx: Contexto, dia: Dia): void {
  for (const poblacion of ctx.estado.poblaciones) {
    const habitantes = habitantesEl(poblacion, dia.fecha)
    if (habitantes === 0) {
      continue
    }
    const pctViveres = pctDeConsumo(dia.eventos, poblacion.dominioId, RECURSO.viveres)
    const pedidoViveres = conEfectoCantidad(habitantes / ctx.estado.partida.diasPorSaco, pctViveres)
    if (pedidoViveres > 0) {
      consumirDelAlmacen(ctx, dia, poblacion.dominioId, RECURSO.viveres, pedidoViveres)
    }
    for (const consumo of poblacion.consumos) {
      const pct = pctDeConsumo(dia.eventos, poblacion.dominioId, consumo.recursoId)
      const pedido = conEfectoCantidad(habitantes * consumo.porHabitante, pct)
      if (pedido > 0) {
        consumirDelAlmacen(ctx, dia, poblacion.dominioId, consumo.recursoId, pedido)
      }
    }
  }
}
