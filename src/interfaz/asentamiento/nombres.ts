import { cantidadDeRecurso, formatearCantidad } from '../../dominio/almacen/cantidades'
import type { CatalogosEnCopia } from '../../dominio/modelo/catalogos'
import { recursoDelCatalogo } from '../../dominio/motor/textos'

/** El nombre de una opción de catálogo. */
export function nombreDeOpcion(catalogo: CatalogosEnCopia, id: string): string {
  return catalogo.opciones.find((o) => o.id === id)?.nombre ?? ''
}

export function nombreDelRecurso(catalogo: CatalogosEnCopia, id: string): string {
  return recursoDelCatalogo(catalogo, id).nombre
}

/** «380 sacos». */
export function conUnidad(catalogo: CatalogosEnCopia, id: string, cantidad: number): string {
  return cantidadDeRecurso(cantidad, recursoDelCatalogo(catalogo, id))
}

/** «380», sin la unidad. */
export function soloCantidad(catalogo: CatalogosEnCopia, id: string, cantidad: number): string {
  return formatearCantidad(cantidad, recursoDelCatalogo(catalogo, id))
}
