import { aNumeroDeDia, type Fecha } from '../calendario/fecha'
import { formatearDiaDelAvance } from '../calendario/formatoFecha'
import type { CambioAvance } from '../modelo/avance'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Recorrido } from './bucle'
import { hechoCaravanaDeVuelta, hechoLocalesCobrados, hechoTributoPagado } from './textos'

/** Un hecho con lo que sirve para ordenarlo: el número de su día y la posición de su dominio. */
interface HechoConOrden {
  numero: number
  posicion: number
  cambio: CambioAvance
}

/** Una fila «saldo» por dominio (en el orden de estado.dominios) y los hechos de dinero por fecha (§6.1 P5; D-032). */
export function cambiosDelAvance(
  estado: EstadoPartida,
  recorrido: Recorrido,
  avanceId: Id,
  primerDia: Fecha,
  hasta: Fecha,
): CambioAvance[] {
  // «3 · 4 · 1» de P5: los movimientos de cada dominio con este avanceId, nuevos o programados aplicados.
  const movimientosPorDominio = new Map<Id, number>()
  for (const m of recorrido.estadoNuevo.movimientos) {
    if (m.avanceId === avanceId) {
      movimientosPorDominio.set(m.dominioId, (movimientosPorDominio.get(m.dominioId) ?? 0) + 1)
    }
  }
  const saldos: CambioAvance[] = estado.dominios.map((d) => ({
    tipo: 'saldo',
    dominioId: d.id,
    antes: recorrido.saldosAntes[d.id] ?? 0,
    despues: recorrido.saldosDespues[d.id] ?? 0,
    movimientos: movimientosPorDominio.get(d.id) ?? 0,
  }))

  const posiciones = new Map(estado.dominios.map((d, i) => [d.id, i]))
  const nombres = new Map(estado.dominios.map((d) => [d.id, d.nombre]))
  const mercados = new Map(estado.mercados.map((m) => [m.id, m.nombre]))
  const dia = (f: Fecha): string => formatearDiaDelAvance(f, primerDia, hasta)
  const hechos: HechoConOrden[] = []
  const tributosPagados = new Set<string>()
  for (const suceso of recorrido.sucesos) {
    const numero = aNumeroDeDia(suceso.fecha)
    const nombre = nombres.get(suceso.dominioId) ?? suceso.dominioId
    let texto: string
    if (suceso.tipo === 'pago') {
      // Solo un tributo que no es «Cada día» y se pagó entero, y uno por asentamiento y día (T18).
      const clave = `${suceso.dominioId}|${numero}`
      const esHecho =
        suceso.que.clase === 'tributo' && !suceso.diario && suceso.pagado === suceso.debido && !tributosPagados.has(clave)
      if (!esHecho) {
        continue
      }
      tributosPagados.add(clave)
      texto = hechoTributoPagado(nombre, dia(suceso.fecha))
    } else if (suceso.tipo === 'cobroLocales') {
      texto = hechoLocalesCobrados(nombre, dia(suceso.fecha))
    } else if (suceso.tipo === 'vueltaCaravana') {
      texto = hechoCaravanaDeVuelta(mercados.get(suceso.mercadoId) ?? suceso.mercadoId, dia(suceso.fecha))
    } else {
      // obraTerminada y llegadaTraslado: sus hechos los pinta la T15.
      continue
    }
    hechos.push({
      numero,
      posicion: posiciones.get(suceso.dominioId) ?? posiciones.size,
      cambio: { tipo: 'hecho', dominioId: suceso.dominioId, texto },
    })
  }
  // Por fecha y dominio; dentro de un mismo día y dominio, en el orden en que pasaron (sort es estable).
  hechos.sort((a, b) => a.numero - b.numero || a.posicion - b.posicion)
  return [...saldos, ...hechos.map((h) => h.cambio)]
}
