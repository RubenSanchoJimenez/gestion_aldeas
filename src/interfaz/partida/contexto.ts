import { createContext, useContext } from 'react'
import type { Sello } from '../../dominio/edicion/registros'
import type { CatalogosEnCopia } from '../../dominio/modelo/catalogos'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import type { Pantalla } from '../app/navegacion'

/** Lo que cualquier pantalla de una partida abierta puede leer y hacer. */
export interface ContextoDePartida {
  documento: DocumentoPartida
  catalogo: CatalogosEnCopia
  /**
   * Aplica una edición y la guarda. Si la edición devuelve el mismo documento, no escribe ni cuenta nada
   * (D-038). Lo que lance la edición sale tal cual, para que el formulario lo enseñe.
   */
  editar: (cambio: (documento: DocumentoPartida, sello: Sello) => DocumentoPartida) => Promise<void>
  /** Sustituye el documento por uno ya guardado (avanzar, deshacer o importar). */
  reemplazar: (documento: DocumentoPartida) => void
  /** Relee la partida y los catálogos de la tablet: tras cambiar un catálogo. */
  recargar: () => Promise<void>
  navegar: (pantalla: Pantalla) => void
}

export const ContextoPartida = createContext<ContextoDePartida | null>(null)

export function usePartida(): ContextoDePartida {
  const partida = useContext(ContextoPartida)
  if (partida === null) {
    throw new Error('Falta la partida abierta')
  }
  return partida
}
