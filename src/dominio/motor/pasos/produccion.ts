import { esCero } from '../../almacen/cantidades'
import { cantidadDeOcurrencia, diasDelPeriodo, factorDiario } from '../../almacen/produccion'
import { aNumeroDeDia, sumarDias } from '../../calendario/fecha'
import { ocurreEl } from '../../calendario/recurrencia'
import { pctDeProduccion } from '../../eventos/efectos'
import { sumarAlAlmacen } from '../almacen'
import type { Contexto, Dia } from '../contexto'

/**
 * Paso 4 · producción (§7 l.1110-1138; §9 l.1298-1302). Por cada edificio con producciones, un factor diario;
 * por cada producción, primero se suma el día al acumulado y después se mira la ocurrencia: si toca, se produce
 * con el acumulado ya sumado y el acumulado se reinicia para el día siguiente.
 */
export function pasoProduccion(ctx: Contexto, dia: Dia): void {
  for (const edificio of ctx.edificios) {
    if (edificio.producciones.length === 0) {
      continue
    }
    const factor = factorDiario(
      edificio,
      ctx.asignados.get(edificio.id) ?? 0,
      pctDeProduccion(dia.eventos, edificio.dominioId, edificio.id),
    )
    for (const produccion of edificio.producciones) {
      const acumulado = ctx.acumulados.get(produccion.id)
      if (acumulado === undefined) {
        continue
      }
      const primerDia = ctx.primerDiaQueCuenta.get(produccion.id) ?? -Infinity
      const cuenta = dia.numero >= Math.max(aNumeroDeDia(acumulado.desde), primerDia)
      const sumaFactores = cuenta ? acumulado.sumaFactores + factor : acumulado.sumaFactores
      if (!ocurreEl(produccion.recurrencia, dia.fecha)) {
        if (cuenta) {
          ctx.acumulados.set(produccion.id, { desde: acumulado.desde, sumaFactores })
        }
        continue
      }
      const cantidad = cantidadDeOcurrencia(
        produccion.cantidad,
        sumaFactores,
        diasDelPeriodo(produccion.recurrencia, dia.fecha),
      )
      if (!esCero(cantidad)) {
        const { entra, perdida } = sumarAlAlmacen(ctx, dia, edificio.dominioId, produccion.recursoId, cantidad)
        ctx.produccionesRealizadas.push({
          id: ctx.opciones.nuevoId(),
          fecha: dia.fecha,
          edificioId: edificio.id,
          produccionId: produccion.id,
          recursoId: produccion.recursoId,
          cantidad: entra,
          perdida,
          avanceId: ctx.opciones.avanceId,
        })
      }
      ctx.acumulados.set(produccion.id, { desde: sumarDias(dia.fecha, 1), sumaFactores: 0 })
    }
  }
}
