import { render, type RenderResult } from '@testing-library/react'
import { createElement, type ReactElement } from 'react'
import { baseDePrueba } from '../../datos/pruebas/baseDePrueba'
import type { Instante } from '../../dominio/modelo/comunes'
import { ContextoServicios, type ArchivoParaDescargar, type Servicios } from '../app/servicios'

/** El 18 de septiembre de 2026 en cualquier zona horaria. */
export const AHORA_DE_PRUEBA: Instante = new Date(2026, 8, 18, 12).toISOString()

let bases = 0

export function serviciosDePrueba(
  cambios: Partial<Servicios> = {},
): Servicios & { descargados: ArchivoParaDescargar[] } {
  const descargados: ArchivoParaDescargar[] = []
  let serie = 0
  bases += 1
  return {
    db: baseDePrueba(`prueba-interfaz-${bases}`),
    ahora: () => AHORA_DE_PRUEBA,
    nuevoId: () => `id-${++serie}`,
    descargar: (archivo) => descargados.push(archivo),
    descargados,
    ...cambios,
  }
}

export function renderConServicios(
  ui: ReactElement,
  servicios = serviciosDePrueba(),
): RenderResult & { servicios: ReturnType<typeof serviciosDePrueba> } {
  const resultado = render(createElement(ContextoServicios, { value: servicios }, ui))
  return { ...resultado, servicios }
}
