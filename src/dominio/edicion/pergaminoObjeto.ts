import type { Fecha } from '../calendario/fecha'
import type { Id } from '../modelo/comunes'
import type { ObjetoInventario, Pergamino } from '../modelo/personaje'

/** El nombre del objeto del inventario de un pergamino (§7, «Inventario y pergaminos»); cabe en 60 letras. */
export function nombreDeObjetoPergamino(nombre: string): string {
  const texto = `Pergamino «${nombre}»`
  return texto.length <= 60 ? texto : `${texto.slice(0, 58)}…»`
}

/** El pergamino con otro estado; «consumidoEl» va solo si queda consumido. */
export function conEstadoDePergamino(pergamino: Pergamino, estado: Pergamino['estado'], consumidoEl?: Fecha): Pergamino {
  const nuevo: Pergamino = { ...pergamino, estado }
  if (estado === 'consumido' && consumidoEl !== undefined) {
    nuevo.consumidoEl = consumidoEl
  } else {
    delete nuevo.consumidoEl
  }
  return nuevo
}

/**
 * El objeto de un pergamino tal como le toca estar: consumido, perdido o vendido lo archivan con ese motivo;
 * «poseído» lo restaura con 1 unidad (§7; §6.4, tabla «Al eliminar»).
 */
export function objetoSegunPergamino(objeto: ObjetoInventario, estado: Pergamino['estado']): ObjetoInventario {
  const nuevo: ObjetoInventario = { ...objeto }
  if (estado === 'poseido') {
    delete nuevo.archivado
    nuevo.cantidad = 1
  } else {
    nuevo.archivado = estado
  }
  return nuevo
}

/** El pergamino cuyo objeto es ese, si lo hay. */
export function pergaminoDeObjeto(pergaminos: readonly Pergamino[], objetoId: Id): Pergamino | undefined {
  return pergaminos.find((p) => p.objetoInventarioId === objetoId)
}
