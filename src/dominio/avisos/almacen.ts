import { claveExistencia } from '../almacen/cantidades'
import { DIAS_DE_PREVISION, preverAlmacen, resumirFilas, type ResumenFila } from '../almacen/prevision'
import { compararFechas, diasEntre, type Fecha } from '../calendario/fecha'
import { formatearDiaCercano } from '../calendario/formatoFecha'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { AvisoConFecha, FlujoAlmacen } from '../motor/tipos'
import { avisoFaltaOcurrida, avisoFaltaPrevista, avisoPerdidaOcurrida, avisoPerdidaPrevista, recursoDelCatalogo, type CaravanaQueTarda } from '../motor/textos'

/** El primer día de una tanda de faltas ocurridas o previstas (§9, tabla; D-048, D-049, D-051). */
function primerDiaDeFalta(fila: ResumenFila): Fecha | undefined {
  return fila.tramosDeFalta[0]?.desde
}

/**
 * La caravana de vuelta más temprana que llega después del primer día de falta: una compra a este dominio o un
 * traslado a este dominio, del mismo recurso, en ruta o programada (§3.12).
 */
function caravanaQueTarda(
  estado: EstadoPartida,
  dominioId: Id,
  recursoId: Id,
  primerDiaFalta: Fecha,
  hoy: Fecha,
  nombres: ReadonlyMap<Id, string>,
  mercados: ReadonlyMap<Id, string>,
): CaravanaQueTarda | undefined {
  let mejor: { vuelta: Fecha; de: string; operacion: 'compra' | 'traslado' } | undefined
  for (const caravana of estado.caravanas) {
    if (caravana.estado !== 'enRuta' && caravana.estado !== 'programada') {
      continue
    }
    if (caravana.carga.recursoId !== recursoId) {
      continue
    }
    let de: string | undefined
    let operacion: 'compra' | 'traslado' | undefined
    if (caravana.operacion === 'compra' && caravana.dominioId === dominioId) {
      de = caravana.mercadoId === undefined ? undefined : (mercados.get(caravana.mercadoId) ?? caravana.mercadoId)
      operacion = 'compra'
    } else if (caravana.operacion === 'traslado' && caravana.destinoId === dominioId) {
      de = nombres.get(caravana.dominioId) ?? caravana.dominioId
      operacion = 'traslado'
    } else {
      continue
    }
    if (de === undefined || operacion === undefined) {
      continue
    }
    if (compararFechas(caravana.vuelta, primerDiaFalta) <= 0) {
      continue
    }
    if (mejor === undefined || compararFechas(caravana.vuelta, mejor.vuelta) < 0) {
      mejor = { vuelta: caravana.vuelta, de, operacion }
    }
  }
  return mejor === undefined ? undefined : { de: mejor.de, operacion: mejor.operacion, fecha: formatearDiaCercano(mejor.vuelta, hoy) }
}

/**
 * Faltas y pérdidas (§9, tabla; D-048, D-049, D-051): una previsión de DIAS_DE_PREVISION y, si se pasa, lo
 * ocurrido en el avance. Por fila (en el orden de estado.existencias y después las que solo salen en los
 * flujos), como mucho un aviso de falta y uno de pérdida: lo ocurrido manda sobre lo previsto.
 */
export function avisosDeAlmacen(
  estado: EstadoPartida,
  catalogo: CatalogosEnCopia,
  ocurrido?: readonly FlujoAlmacen[],
): AvisoConFecha[] {
  const hoy = estado.partida.fechaActual
  const prevision = preverAlmacen(estado, catalogo, DIAS_DE_PREVISION)
  const previstas = resumirFilas(estado.existencias, prevision.final, prevision.flujos)
  // `estado.existencias` ya es el estado posterior al avance (avisosDeAlmacen recibe estadoNuevo): al pasarlo
  // como inicial y como final, esas dos columnas de `ocurridas` no son las cantidades reales de antes/después
  // del avance, sino ambas el mismo valor posterior. Solo se usan aquí `falta`, `perdido`, `tramosDeFalta` y
  // `primeraPerdida`, que no dependen de inicial/final: no uses `ocurridas[…].inicial` ni `.final` para nada más.
  const ocurridas = ocurrido === undefined ? undefined : resumirFilas(estado.existencias, estado.existencias, ocurrido)

  const previstasPorClave = new Map(previstas.map((f) => [claveExistencia(f.dominioId, f.recursoId), f]))
  const ocurridasPorClave = new Map((ocurridas ?? []).map((f) => [claveExistencia(f.dominioId, f.recursoId), f]))
  const claves: string[] = []
  const vistos = new Set<string>()
  for (const fila of previstas) {
    const clave = claveExistencia(fila.dominioId, fila.recursoId)
    vistos.add(clave)
    claves.push(clave)
  }
  for (const fila of ocurridas ?? []) {
    const clave = claveExistencia(fila.dominioId, fila.recursoId)
    if (!vistos.has(clave)) {
      vistos.add(clave)
      claves.push(clave)
    }
  }

  const nombres = new Map(estado.dominios.map((d) => [d.id, d.nombre]))
  const mercados = new Map(estado.mercados.map((m) => [m.id, m.nombre]))
  const avisos: AvisoConFecha[] = []

  for (const clave of claves) {
    const previsto = previstasPorClave.get(clave)
    const ocurrida = ocurridasPorClave.get(clave)
    const referencia = previsto ?? ocurrida
    if (referencia === undefined) {
      continue
    }
    const { dominioId, recursoId } = referencia
    const asentamiento = nombres.get(dominioId) ?? dominioId
    const recurso = recursoDelCatalogo(catalogo, recursoId)

    // Falta: lo ocurrido manda sobre lo previsto.
    const primerDiaOcurrida = ocurrida === undefined ? undefined : primerDiaDeFalta(ocurrida)
    if (ocurrida !== undefined && primerDiaOcurrida !== undefined) {
      avisos.push({
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId,
        fecha: primerDiaOcurrida,
        texto: avisoFaltaOcurrida(asentamiento, recurso, formatearDiaCercano(primerDiaOcurrida, hoy), ocurrida.falta),
      })
    } else if (previsto !== undefined) {
      const primerDiaPrevista = primerDiaDeFalta(previsto)
      if (primerDiaPrevista !== undefined) {
        const d = diasEntre(hoy, primerDiaPrevista)
        if (d <= 7) {
          const caravana = caravanaQueTarda(estado, dominioId, recursoId, primerDiaPrevista, hoy, nombres, mercados)
          avisos.push({
            tipo: 'faltaDeRecurso',
            color: 'rojo',
            dominioId,
            fecha: primerDiaPrevista,
            texto: avisoFaltaPrevista(asentamiento, recurso, formatearDiaCercano(primerDiaPrevista, hoy), caravana),
          })
        } else if (d <= 30) {
          avisos.push({
            tipo: 'faltaPrevista',
            color: 'ambar',
            dominioId,
            fecha: primerDiaPrevista,
            texto: avisoFaltaPrevista(asentamiento, recurso, formatearDiaCercano(primerDiaPrevista, hoy)),
          })
        }
      }
    }

    // Pérdida: lo ocurrido manda sobre lo previsto.
    if (ocurrida !== undefined && ocurrida.primeraPerdida !== undefined) {
      const { fecha } = ocurrida.primeraPerdida
      avisos.push({
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId,
        fecha,
        texto: avisoPerdidaOcurrida(
          asentamiento,
          recurso,
          ocurrida.perdido,
          formatearDiaCercano(fecha, hoy),
          ocurrida.diasConPerdida > 1,
        ),
      })
    } else if (previsto !== undefined && previsto.primeraPerdida !== undefined) {
      const { fecha, cantidad } = previsto.primeraPerdida
      avisos.push({
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId,
        fecha,
        texto: avisoPerdidaPrevista(asentamiento, recurso, cantidad, formatearDiaCercano(fecha, hoy)),
      })
    }
  }
  return avisos
}
