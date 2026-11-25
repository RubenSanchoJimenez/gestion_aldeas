import { compararFechas } from '../calendario/fecha'
import type { Dominio, DominioAsentamiento } from '../modelo/dominios'

/** Separa los asentamientos del personaje sin perder el tipo de cada uno. */
function esAsentamiento(dominio: Dominio): dominio is DominioAsentamiento {
  return dominio.tipo === 'asentamiento'
}

/** El personaje primero; después los asentamientos por su alta y, si empatan, en el orden del documento (D-080, §5). */
export function ordenarDominios(dominios: readonly Dominio[]): Dominio[] {
  const personaje = dominios.filter((d) => !esAsentamiento(d))
  // Array.prototype.sort es estable: dos asentamientos con la misma alta conservan el orden del documento.
  const asentamientos = dominios.filter(esAsentamiento).sort((a, b) => compararFechas(a.alta, b.alta))
  return [...personaje, ...asentamientos]
}
