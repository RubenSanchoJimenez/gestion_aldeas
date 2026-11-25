import type { CatalogosEnCopia } from '../modelo/catalogos'
import { EsquemaDocumentoPartida, type DocumentoPartida } from '../modelo/documento'
import { problemasDeZod, validarCopia } from './coherencia'

/**
 * null si la partida se puede guardar, o el primer problema. Es la misma vara que al importar una copia: así
 * ningún formulario puede dejar guardada una partida que después se rechazaría (D-123).
 */
export function problemaAlGuardar(documento: DocumentoPartida, catalogo: CatalogosEnCopia): string | null {
  const esquema = EsquemaDocumentoPartida.safeParse(documento)
  const problemas = esquema.success ? validarCopia(documento, catalogo) : problemasDeZod(esquema.error)
  return problemas[0]?.mensaje ?? null
}
