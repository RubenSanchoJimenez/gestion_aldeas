import { claveExistencia, TOLERANCIA } from '../almacen/cantidades'
import { aNumeroDeDia, compararFechas, sumarDias, type Fecha } from '../calendario/fecha'
import { formatearDiaDelAvance, formatearTramoDelAvance } from '../calendario/formatoFecha'
import type { CambioAvance } from '../modelo/avance'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Recorrido } from './bucle'
import {
  hechoCaravanaDeVuelta,
  hechoEventoTerminado,
  hechoLocalesCobrados,
  hechoObraTerminada,
  hechoTrasladoLlegado,
  hechoTributoPagado,
} from './textos'

/** Un hecho con lo que sirve para ordenarlo: el número de su día y la posición de su dominio. */
interface HechoConOrden {
  numero: number
  posicion: number
  cambio: CambioAvance
}

/**
 * Filas «saldo» por dominio (en el orden de estado.dominios), filas «almacen» (TC11) y hechos (D-032, D-052,
 * TC12): en ese orden, [...saldos, ...almacenes, ...hechos] (§3.10).
 */
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

  // Almacenes (TC11): para cada dominio y, dentro, cada fila de recorrido.estadoNuevo.existencias de ese
  // dominio, en su orden; solo si |despues − antes| > TOLERANCIA.
  const cantidadesAntes = new Map<string, number>()
  for (const e of estado.existencias) {
    cantidadesAntes.set(claveExistencia(e.dominioId, e.recursoId), e.cantidad)
  }
  const almacenes: CambioAvance[] = []
  for (const dominio of estado.dominios) {
    for (const fila of recorrido.estadoNuevo.existencias) {
      if (fila.dominioId !== dominio.id) {
        continue
      }
      const antes = cantidadesAntes.get(claveExistencia(fila.dominioId, fila.recursoId)) ?? 0
      const despues = fila.cantidad
      if (Math.abs(despues - antes) > TOLERANCIA) {
        almacenes.push({ tipo: 'almacen', dominioId: fila.dominioId, recursoId: fila.recursoId, antes, despues })
      }
    }
  }

  const posiciones = new Map(estado.dominios.map((d, i) => [d.id, i]))
  const nombres = new Map(estado.dominios.map((d) => [d.id, d.nombre]))
  const mercados = new Map(estado.mercados.map((m) => [m.id, m.nombre]))
  const dia = (f: Fecha): string => formatearDiaDelAvance(f, primerDia, hasta)
  const hechos: HechoConOrden[] = []
  const tributosPagados = new Set<string>()
  for (const suceso of recorrido.sucesos) {
    const numero = aNumeroDeDia(suceso.fecha)
    if (suceso.tipo === 'pago') {
      // Solo un tributo que no es «Cada día» y se pagó entero, y uno por asentamiento y día.
      const clave = `${suceso.dominioId}|${numero}`
      const esHecho =
        suceso.que.clase === 'tributo' && !suceso.diario && suceso.pagado === suceso.debido && !tributosPagados.has(clave)
      if (!esHecho) {
        continue
      }
      tributosPagados.add(clave)
      const nombre = nombres.get(suceso.dominioId) ?? suceso.dominioId
      hechos.push({
        numero,
        posicion: posiciones.get(suceso.dominioId) ?? posiciones.size,
        cambio: { tipo: 'hecho', dominioId: suceso.dominioId, texto: hechoTributoPagado(nombre, dia(suceso.fecha)) },
      })
      continue
    }
    if (suceso.tipo === 'cobroLocales') {
      const nombre = nombres.get(suceso.dominioId) ?? suceso.dominioId
      hechos.push({
        numero,
        posicion: posiciones.get(suceso.dominioId) ?? posiciones.size,
        cambio: { tipo: 'hecho', dominioId: suceso.dominioId, texto: hechoLocalesCobrados(nombre, dia(suceso.fecha)) },
      })
      continue
    }
    if (suceso.tipo === 'vueltaCaravana') {
      const mercado = mercados.get(suceso.mercadoId) ?? suceso.mercadoId
      hechos.push({
        numero,
        posicion: posiciones.get(suceso.dominioId) ?? posiciones.size,
        cambio: { tipo: 'hecho', dominioId: suceso.dominioId, texto: hechoCaravanaDeVuelta(mercado, dia(suceso.fecha)) },
      })
      continue
    }
    if (suceso.tipo === 'obraTerminada') {
      hechos.push({
        numero,
        posicion: posiciones.get(suceso.dominioId) ?? posiciones.size,
        cambio: {
          tipo: 'hecho',
          dominioId: suceso.dominioId,
          texto: hechoObraTerminada(suceso.nombre, dia(suceso.fecha)),
        },
      })
      continue
    }
    // suceso.tipo === 'llegadaTraslado'
    const origen = nombres.get(suceso.dominioId) ?? suceso.dominioId
    const destino = nombres.get(suceso.destinoId) ?? suceso.destinoId
    hechos.push({
      numero,
      posicion: posiciones.get(suceso.dominioId) ?? posiciones.size,
      cambio: {
        tipo: 'hecho',
        dominioId: suceso.dominioId,
        texto: hechoTrasladoLlegado(origen, destino, dia(suceso.fecha)),
      },
    })
  }
  // Los eventos que acaban dentro del avance (D-052): fin = inicio + duracionDias − 1, entre primerDia y hasta.
  for (const evento of estado.eventos) {
    const fin = sumarDias(evento.inicio, evento.duracionDias - 1)
    if (compararFechas(fin, primerDia) < 0 || compararFechas(fin, hasta) > 0) {
      continue
    }
    const texto = hechoEventoTerminado(evento.nombre, formatearTramoDelAvance(evento.inicio, fin, primerDia, hasta))
    const cambio: CambioAvance =
      evento.dominioId === undefined
        ? { tipo: 'hecho', texto }
        : { tipo: 'hecho', dominioId: evento.dominioId, texto }
    hechos.push({
      numero: aNumeroDeDia(evento.inicio),
      posicion: evento.dominioId === undefined ? posiciones.size : (posiciones.get(evento.dominioId) ?? posiciones.size),
      cambio,
    })
  }
  // Por fecha y dominio; dentro de un mismo día y dominio, en el orden en que se añadieron (sort es estable).
  hechos.sort((a, b) => a.numero - b.numero || a.posicion - b.posicion)
  return [...saldos, ...almacenes, ...hechos.map((h) => h.cambio)]
}
