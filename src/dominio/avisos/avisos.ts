import { compararFechas } from '../calendario/fecha'
import { EsquemaTipoAviso, type AvisoAvance } from '../modelo/avance'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { EstadoPartida } from '../modelo/documento'
import type { Dominio } from '../modelo/dominios'
import type { AvisoConFecha } from '../motor/tipos'
import { avisosDeImpago, avisosDeSaldoNegativo } from './dinero'
import { avisosDePagoNoCubierto } from './pagoNoCubierto'

/** Los avisos de dinero vigentes en la fecha actual del estado, ya ordenados (§9, tabla de avisos). */
export function avisosEn(estado: EstadoPartida, catalogo: CatalogosEnCopia): AvisoConFecha[] {
  return ordenarAvisos(
    [...avisosDeSaldoNegativo(estado), ...avisosDeImpago(estado), ...avisosDePagoNoCubierto(estado, catalogo)],
    estado.dominios,
  )
}

/** Rojos primero; después por fecha, por tipo en el orden de EsquemaTipoAviso y por dominio (T11). */
export function ordenarAvisos(avisos: readonly AvisoConFecha[], dominios: readonly Dominio[]): AvisoConFecha[] {
  const tipos: readonly string[] = EsquemaTipoAviso.options
  const posiciones = new Map(dominios.map((d, i) => [d.id, i]))
  const posicion = (a: AvisoConFecha): number =>
    a.dominioId === undefined ? dominios.length : (posiciones.get(a.dominioId) ?? dominios.length)
  const color = (a: AvisoConFecha): number => (a.color === 'rojo' ? 0 : 1)
  return [...avisos].sort(
    (a, b) =>
      color(a) - color(b) ||
      compararFechas(a.fecha, b.fecha) ||
      tipos.indexOf(a.tipo) - tipos.indexOf(b.tipo) ||
      posicion(a) - posicion(b),
  )
}

/** El aviso tal como se guarda en el avance: sin la fecha (formato 1). */
export function sinFecha(aviso: AvisoConFecha): AvisoAvance {
  return aviso.dominioId === undefined
    ? { tipo: aviso.tipo, color: aviso.color, texto: aviso.texto }
    : { tipo: aviso.tipo, color: aviso.color, dominioId: aviso.dominioId, texto: aviso.texto }
}
