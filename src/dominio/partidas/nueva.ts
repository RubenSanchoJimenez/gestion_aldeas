import type { Fecha } from '../calendario/fecha'
import type { Edad } from '../calendario/formatoFecha'
import type { Equivalencias } from '../dinero/monedas'
import { sumarBolsaInicial, type FilaMoneda } from '../dinero/saldo'
import type { Id, Instante } from '../modelo/comunes'
import { EsquemaDocumentoPartida, EsquemaEstadoPartida, type DocumentoPartida } from '../modelo/documento'
import { VERSION_FORMATO } from '../modelo/partida'

/** Lo que se escribe en P1 y P1b (§6.1). */
export interface DatosPartidaNueva {
  nombre: string
  edad: Edad
  fechaInicial: Fecha
  equivalencias: Equivalencias
  personaje: { nombre: string; descripcion: string }
  /** Solo las filas con cantidad (D-087). */
  bolsa: readonly FilaMoneda[]
}

export interface IdsPartidaNueva {
  partida: Id
  personaje: Id
}

/** El documento de una partida recién creada. Lanza si los datos no son válidos. */
export function documentoDePartidaNueva(
  datos: DatosPartidaNueva,
  ids: IdsPartidaNueva,
  ahora: Instante,
): DocumentoPartida {
  // Todas las colecciones del estado, vacías: salen del propio esquema, así una colección nueva no se olvida.
  const vacias = Object.fromEntries(Object.keys(EsquemaEstadoPartida.shape).map((clave) => [clave, []]))
  const descripcion = datos.personaje.descripcion.trim()
  return EsquemaDocumentoPartida.parse({
    ...vacias,
    partida: {
      id: ids.partida,
      nombre: datos.nombre.trim(),
      edad: datos.edad,
      equivalencias: datos.equivalencias,
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: datos.fechaInicial,
      fechaActual: datos.fechaInicial,
      creada: ahora,
      actualizada: ahora,
      versionFormato: VERSION_FORMATO,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [
      {
        id: ids.personaje,
        tipo: 'personaje',
        nombre: datos.personaje.nombre.trim(),
        ...(descripcion === '' ? {} : { descripcion }),
      },
    ],
    cajas: [
      {
        dominioId: ids.personaje,
        saldoInicial: { base: sumarBolsaInicial(datos.bolsa, datos.equivalencias) },
      },
    ],
    avances: [],
  })
}
