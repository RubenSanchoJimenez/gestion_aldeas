import type { Id, UbicacionObjeto } from '../modelo/comunes'
import type { ObjetoPendiente } from '../modelo/movimientos'
import type { ObjetoInventario } from '../modelo/personaje'
import type { NuevoId } from '../motor/tipos'
import { mismoNombre } from '../texto/normalizar'

/** Una clave que es igual si y solo si las dos ubicaciones son la misma: «encima», «caja|dom.bree»… */
function claveDeUbicacion(ubicacion: UbicacionObjeto): string {
  switch (ubicacion.tipo) {
    case 'encima':
      return 'encima'
    case 'caja':
    case 'almacen':
      return `${ubicacion.tipo}|${ubicacion.dominioId}`
    case 'propia':
      return `propia|${ubicacion.ubicacionId}`
  }
}

/**
 * Crea el objeto de un gasto con «Añadir también al inventario» o lo suma a una fila igual (§7 l.1173, D-034, T19).
 * Una fila es igual si no está archivada y tiene el mismo nombre normalizado, la misma ubicación y el mismo valor por
 * unidad; la fila sumada conserva su movimientoCompraId. No muta la lista que recibe.
 */
export function anadirObjetoComprado(
  objetos: readonly ObjetoInventario[],
  pendiente: ObjetoPendiente,
  datos: { personajeId: Id; movimientoId: Id; nuevoId: NuevoId },
): ObjetoInventario[] {
  const ubicacion = claveDeUbicacion(pendiente.ubicacion)
  const indice = objetos.findIndex(
    (o) =>
      o.archivado === undefined &&
      mismoNombre(o.nombre, pendiente.nombre) &&
      claveDeUbicacion(o.ubicacion) === ubicacion &&
      o.valorUnitario.base === pendiente.valorUnitario.base,
  )
  if (indice >= 0) {
    return objetos.map((o, i) => (i === indice ? { ...o, cantidad: o.cantidad + pendiente.cantidad } : o))
  }
  const nuevo: ObjetoInventario = {
    id: datos.nuevoId(),
    dominioId: datos.personajeId,
    nombre: pendiente.nombre,
    cantidad: pendiente.cantidad,
    valorUnitario: pendiente.valorUnitario,
    ubicacion: pendiente.ubicacion,
    ...(pendiente.notas === undefined ? {} : { notas: pendiente.notas }),
    movimientoCompraId: datos.movimientoId,
  }
  return [...objetos, nuevo]
}
