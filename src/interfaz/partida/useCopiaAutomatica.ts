import { useCallback, useEffect, useState } from 'react'
import {
  actualizarCopiaAutomatica,
  desvincularArchivo,
  permitirArchivo,
  vincularArchivo,
  type EstadoCopia,
} from '../../datos/copia/automatica'
import { nombreDeCopiaAutomatica } from '../../dominio/copia/sobre'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import { textoDeError, useServicios } from '../app/servicios'

export interface CopiaAutomatica {
  /** Si este navegador deja elegir un archivo y reescribirlo. */
  disponible: boolean
  /** null mientras se averigua. */
  estado: EstadoCopia | null
  fallo: string | null
  elegir: () => Promise<void>
  reactivar: () => Promise<void>
  dejar: () => Promise<void>
}

/** Mantiene al día el archivo elegido: lo reescribe cada vez que cambia la partida abierta. */
export function useCopiaAutomatica(documento: DocumentoPartida): CopiaAutomatica {
  const { db, ahora, elegirArchivo } = useServicios()
  const [estado, setEstado] = useState<EstadoCopia | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const { id, nombre } = documento.partida

  const actualizar = useCallback(async () => {
    setEstado(await actualizarCopiaAutomatica(db, id, ahora()))
  }, [db, id, ahora])

  useEffect(() => {
    actualizarCopiaAutomatica(db, id, ahora()).then(setEstado, (error: unknown) => setFallo(textoDeError(error)))
  }, [db, id, ahora, documento])

  const intentar = async (accion: () => Promise<void>): Promise<void> => {
    setFallo(null)
    try {
      await accion()
    } catch (error) {
      setFallo(textoDeError(error))
    }
  }

  return {
    disponible: elegirArchivo !== undefined,
    estado,
    fallo,
    elegir: () =>
      intentar(async () => {
        const archivo = await elegirArchivo?.(nombreDeCopiaAutomatica(nombre))
        if (archivo != null) {
          await vincularArchivo(db, id, archivo)
          await actualizar()
        }
      }),
    reactivar: () =>
      intentar(async () => {
        await permitirArchivo(db, id)
        await actualizar()
      }),
    dejar: () =>
      intentar(async () => {
        await desvincularArchivo(db, id)
        await actualizar()
      }),
  }
}
