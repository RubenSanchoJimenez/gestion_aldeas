import { errorDeDiasDeAvance } from '../avance/dias'
import { avisosEn, sinFecha } from '../avisos/avisos'
import { sumarDias } from '../calendario/fecha'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { recorrerDias } from './bucle'
import { cambiosDelAvance } from './cambios'
import type { OpcionesSimulacion, ResultadoSimulacion } from './tipos'

/** Avanza `dias` días desde fechaActual sin guardar nada; si los días no valen, lanza RangeError con el texto de errorDeDiasDeAvance (§9). */
export function simular(estado: EstadoPartida, dias: number, opciones: OpcionesSimulacion): ResultadoSimulacion {
  const desde = estado.partida.fechaActual
  const error = errorDeDiasDeAvance(desde, dias)
  if (error !== null) {
    throw new RangeError(error)
  }
  const entrada = estadoDe(estado)
  const hasta = sumarDias(desde, dias)
  const recorrido = recorrerDias(entrada, hasta, opciones)
  return {
    avanceId: opciones.avanceId,
    desde,
    hasta,
    estadoNuevo: recorrido.estadoNuevo,
    cambios: cambiosDelAvance(entrada, recorrido, opciones.avanceId, sumarDias(desde, 1), hasta),
    avisos: avisosEn(recorrido.estadoNuevo, opciones.catalogo).map(sinFecha),
    personasNuevas: recorrido.personasNuevas,
  }
}
