import { cantidadDeRecurso, TOLERANCIA } from '../almacen/cantidades'
import { compararFechas } from '../calendario/fecha'
import { formatearOro } from '../dinero/formato'
import { redondearMitadArriba } from '../dinero/importe'
import { saldosPorDominio } from '../dinero/saldo'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { EstadoPartida } from '../modelo/documento'
import type { AvisoConFecha } from '../motor/tipos'
import {
  avisoCaravanaQueNoPudoSalir,
  avisoCompraQueNoPudoHacerse,
  avisoEdificioTerminado,
  avisoMejoraTerminada,
  avisoObraQueNoPudoEmpezar,
  faltaDeDinero,
  nombreDeRecurso,
  recursoDelCatalogo,
} from '../motor/textos'

/** Lo que le falta hoy a una fila del almacén de un material o una carga, o null si hay bastante. */
function faltaDeMaterial(
  estado: EstadoPartida,
  catalogo: CatalogosEnCopia,
  dominioId: string,
  recursoId: string,
  cantidad: number,
): string | null {
  const fila = estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
  const disponible = fila?.cantidad ?? 0
  const falta = cantidad - disponible
  if (falta <= TOLERANCIA) {
    return null
  }
  return cantidadDeRecurso(falta, recursoDelCatalogo(catalogo, recursoId))
}

/** Lo que le falta hoy a una caja para un pago: null si el saldo llega o no hace falta pagar nada. */
function faltaDeCaja(estado: EstadoPartida, dominioId: string, importe: number): string | null {
  if (importe <= 0) {
    return null
  }
  const saldo = saldosPorDominio(estado)[dominioId] ?? 0
  if (importe <= saldo) {
    return null
  }
  return faltaDeDinero(formatearOro(importe - saldo, estado.partida.equivalencias))
}

/**
 * Obras programadas con inicio ≤ hoy, caravanas programadas con salida ≤ hoy y compras del mercado local sin
 * aplicar con fecha ≤ hoy, con lo que les falta hoy (D-047). Rojos: obraQueNoPudoEmpezar, caravanaQueNoPudoSalir
 * (también las compras).
 */
export function avisosDeObrasYCaravanas(estado: EstadoPartida, catalogo: CatalogosEnCopia): AvisoConFecha[] {
  const hoy = estado.partida.fechaActual
  const avisos: AvisoConFecha[] = []
  const nombres = new Map(estado.dominios.map((d) => [d.id, d.nombre]))
  const mercados = new Map(estado.mercados.map((m) => [m.id, m.nombre]))

  for (const obra of estado.obras) {
    if (obra.estado !== 'programada' || obra.inicio === undefined || compararFechas(obra.inicio, hoy) > 0) {
      continue
    }
    const faltas: string[] = []
    for (const [recursoId, cantidad] of Object.entries(obra.materiales)) {
      const falta = faltaDeMaterial(estado, catalogo, obra.dominioId, recursoId, cantidad)
      if (falta !== null) {
        faltas.push(falta)
      }
    }
    const importe = pagoDeObra(estado, obra)
    const dineroFalta = faltaDeCaja(estado, obra.dominioId, importe)
    if (dineroFalta !== null) {
      faltas.push(dineroFalta)
    }
    avisos.push({
      tipo: 'obraQueNoPudoEmpezar',
      color: 'rojo',
      dominioId: obra.dominioId,
      fecha: hoy,
      texto: avisoObraQueNoPudoEmpezar(obra.nombre, faltas),
    })
  }

  for (const caravana of estado.caravanas) {
    if (caravana.estado !== 'programada' || compararFechas(caravana.salida, hoy) > 0) {
      continue
    }
    const faltas: string[] = []
    let destino: string
    if (caravana.operacion === 'compra') {
      const importe = caravana.importe?.base ?? 0
      const dineroFalta = faltaDeCaja(estado, caravana.dominioId, importe)
      if (dineroFalta !== null) {
        faltas.push(dineroFalta)
      }
      destino = caravana.mercadoId === undefined ? '' : (mercados.get(caravana.mercadoId) ?? caravana.mercadoId)
    } else if (caravana.operacion === 'venta') {
      const falta = faltaDeMaterial(estado, catalogo, caravana.dominioId, caravana.carga.recursoId, caravana.carga.cantidad)
      if (falta !== null) {
        faltas.push(falta)
      }
      destino = caravana.mercadoId === undefined ? '' : (mercados.get(caravana.mercadoId) ?? caravana.mercadoId)
    } else {
      const falta = faltaDeMaterial(estado, catalogo, caravana.dominioId, caravana.carga.recursoId, caravana.carga.cantidad)
      if (falta !== null) {
        faltas.push(falta)
      }
      destino = caravana.destinoId === undefined ? '' : (nombres.get(caravana.destinoId) ?? caravana.destinoId)
    }
    avisos.push({
      tipo: 'caravanaQueNoPudoSalir',
      color: 'rojo',
      dominioId: caravana.dominioId,
      fecha: hoy,
      texto: avisoCaravanaQueNoPudoSalir(caravana.operacion, destino, faltas),
    })
  }

  for (const entrada of estado.entradasAlmacen) {
    if (
      entrada.operacion !== 'compra' ||
      entrada.aplicada ||
      entrada.caravanaId !== undefined ||
      compararFechas(entrada.fecha, hoy) > 0
    ) {
      continue
    }
    const importe = precioTotal(entrada)
    const dineroFalta = faltaDeCaja(estado, entrada.dominioId, importe)
    if (dineroFalta === null) {
      continue
    }
    const mercado = entrada.mercadoId === undefined ? '' : (mercados.get(entrada.mercadoId) ?? entrada.mercadoId)
    avisos.push({
      tipo: 'caravanaQueNoPudoSalir',
      color: 'rojo',
      dominioId: entrada.dominioId,
      fecha: hoy,
      texto: avisoCompraQueNoPudoHacerse(nombreDeRecurso(catalogo, entrada.recursoId), mercado, [dineroFalta]),
    })
  }

  return avisos
}

/** El importe pendiente de una obra programada: el de su movimiento vinculado si sigue programado, o 0. */
function pagoDeObra(estado: EstadoPartida, obra: EstadoPartida['obras'][number]): number {
  if (obra.movimientoId === undefined) {
    return 0
  }
  const movimiento = estado.movimientos.find((m) => m.id === obra.movimientoId)
  return movimiento !== undefined && movimiento.programado ? Math.abs(movimiento.importe.base) : 0
}

/** El precio de una entrada del almacén (compra): precioUnidad × cantidad, redondeado como en T22. */
function precioTotal(entrada: EstadoPartida['entradasAlmacen'][number]): number {
  if (entrada.precioUnidad === undefined) {
    return 0
  }
  return redondearMitadArriba(entrada.precioUnidad.base * entrada.cantidad)
}

/** Un aviso ámbar por edificio con avisoPendiente (§7 l.1145-1146). */
export function avisosDeEdificios(estado: EstadoPartida): AvisoConFecha[] {
  const hoy = estado.partida.fechaActual
  const avisos: AvisoConFecha[] = []
  for (const edificio of estado.edificios) {
    if (edificio.avisoPendiente === undefined) {
      continue
    }
    const texto =
      edificio.avisoPendiente.tipo === 'terminadoSinProduccion'
        ? avisoEdificioTerminado(edificio.nombre)
        : avisoMejoraTerminada(edificio.nombre)
    avisos.push({
      tipo: edificio.avisoPendiente.tipo === 'terminadoSinProduccion' ? 'edificioTerminadoSinProduccion' : 'mejoraTerminada',
      color: 'ambar',
      dominioId: edificio.dominioId,
      fecha: hoy,
      texto,
    })
  }
  return avisos
}
