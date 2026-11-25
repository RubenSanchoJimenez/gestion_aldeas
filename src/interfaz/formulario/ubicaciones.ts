import type { UbicacionObjeto } from '../../dominio/modelo/comunes'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import { ordenarDominios } from '../../dominio/partidas/orden'

/** La clave de texto de una ubicación, para usarla como valor de un selector. */
export function claveDeUbicacion(u: UbicacionObjeto): string {
  return u.tipo === 'encima' ? 'encima' : u.tipo === 'propia' ? `propia|${u.ubicacionId}` : `${u.tipo}|${u.dominioId}`
}

export function ubicacionDeClave(clave: string): UbicacionObjeto {
  const [tipo, id = ''] = clave.split('|')
  if (tipo === 'propia') {
    return { tipo, ubicacionId: id }
  }
  return tipo === 'caja' || tipo === 'almacen' ? { tipo, dominioId: id } : { tipo: 'encima' }
}

/** Las ubicaciones posibles: encima, cajas, almacenes y las propias. */
export function ubicaciones(documento: DocumentoPartida): { valor: string; texto: string }[] {
  const asentamientos = ordenarDominios(documento.dominios).filter((d) => d.tipo === 'asentamiento')
  return [
    { valor: 'encima', texto: 'Encima' },
    ...asentamientos.flatMap((d) => [
      { valor: `caja|${d.id}`, texto: `Caja de ${d.nombre}` },
      { valor: `almacen|${d.id}`, texto: `Almacén de ${d.nombre}` },
    ]),
    ...documento.ubicaciones.map((u) => ({ valor: `propia|${u.id}`, texto: u.nombre })),
  ]
}
