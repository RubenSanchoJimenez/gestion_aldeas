import { compararFechas, validarFecha, type Fecha } from '../calendario/fecha'
import type { Edad } from '../calendario/formatoFecha'
import type { DocumentoPartida } from '../modelo/documento'
import { hayAvances } from '../modelo/partida'
import { validarCoherenciaInterna } from '../validacion/coherencia'
import { errorDeNombre } from './textos'

/** Lo que cambia «Editar partida» (§6.1). */
export interface DatosDePartida {
  nombre: string
  edad: Edad
  fechaInicial: Fecha
}

export type ResultadoDatosDePartida =
  | { ok: true; documento: DocumentoPartida; cambio: boolean }
  | { ok: false; error: string }

/** Ayuda bajo la fecha y la Edad, y error si se intentan cambiar con avances (D-089). */
export const MENSAJE_SOLO_ANTES_DEL_AVANCE = 'Solo se pueden cambiar antes del primer avance.'

/** La fecha nueva dejaría algún registro fuera de la partida (D-089). */
export const MENSAJE_FECHA_FUERA = 'La fecha inicial no se puede cambiar: algún registro quedaría fuera de la partida'

export function aplicarDatosDePartida(documento: DocumentoPartida, datos: DatosDePartida): ResultadoDatosDePartida {
  const nombre = datos.nombre.trim()
  const error = errorDeNombre(nombre) ?? validarFecha(datos.fechaInicial)
  if (error !== null) {
    return { ok: false, error }
  }
  const partida = documento.partida
  const cambiaFecha = compararFechas(datos.fechaInicial, partida.fechaInicial) !== 0
  const cambiaEdad = datos.edad !== partida.edad
  if (hayAvances(partida) && (cambiaFecha || cambiaEdad)) {
    return { ok: false, error: MENSAJE_SOLO_ANTES_DEL_AVANCE }
  }
  if (!cambiaFecha && !cambiaEdad && nombre === partida.nombre) {
    return { ok: true, documento, cambio: false }
  }
  const siguiente: DocumentoPartida = {
    ...documento,
    partida: { ...partida, nombre, edad: datos.edad },
  }
  if (cambiaFecha) {
    siguiente.partida.fechaInicial = datos.fechaInicial
    siguiente.partida.fechaActual = datos.fechaInicial
    siguiente.dominios = documento.dominios.map((d) =>
      d.tipo === 'asentamiento' ? { ...d, alta: datos.fechaInicial } : d,
    )
    if (validarCoherenciaInterna(siguiente).length > 0) {
      return { ok: false, error: MENSAJE_FECHA_FUERA }
    }
  }
  return { ok: true, documento: siguiente, cambio: true }
}
