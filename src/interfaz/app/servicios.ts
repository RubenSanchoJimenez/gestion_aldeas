import { createContext, useContext } from 'react'
import type { BaseDeDatos } from '../../datos/baseDeDatos'
import type { Id, Instante } from '../../dominio/modelo/comunes'

export interface ArchivoParaDescargar {
  nombre: string
  texto: string
}

/** Lo que la app necesita del mundo exterior; en las pruebas se sustituye entero. */
export interface Servicios {
  db: BaseDeDatos
  ahora: () => Instante
  nuevoId: () => Id
  descargar: (archivo: ArchivoParaDescargar) => void
}

export const ContextoServicios = createContext<Servicios | null>(null)

export function useServicios(): Servicios {
  const servicios = useContext(ContextoServicios)
  if (servicios === null) {
    throw new Error('Faltan los servicios de la app')
  }
  return servicios
}

/** El texto de un error, sea lo que sea. */
export function textoDeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
