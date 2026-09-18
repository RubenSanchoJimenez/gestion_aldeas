import { compararFechas } from '../calendario/fecha'
import type { Instante } from '../modelo/comunes'
import { estadoDe, type Avance, type DocumentoPartida } from '../modelo/documento'
import type { ResultadoSimulacion } from '../motor/tipos'

/** El avance sin su copia: se rehace sin la clave `snapshotPrevio`, nunca con `undefined`, que IndexedDB guardaría (D-008). */
function sinCopia(avance: Avance): Avance {
  return {
    id: avance.id,
    desde: avance.desde,
    hasta: avance.hasta,
    aplicadoEl: avance.aplicadoEl,
    cambios: avance.cambios,
    avisos: avance.avisos,
  }
}

/** El documento con el resultado aplicado: estado nuevo, contador a 0 y el Avance con la copia del estado anterior (§9; D-008; T12). */
export function aplicarAvance(
  documento: DocumentoPartida,
  resultado: ResultadoSimulacion,
  ahora: Instante,
): DocumentoPartida {
  const partida = documento.partida
  if (compararFechas(resultado.desde, partida.fechaActual) !== 0 || resultado.estadoNuevo.partida.id !== partida.id) {
    throw new Error('La partida cambió después de la vista previa: vuelve a calcularla')
  }
  const anteriores = documento.avances
  const ultimo = anteriores[anteriores.length - 1]
  // Los instantes ISO en UTC se ordenan como texto: si el reloj de la tablet va hacia atrás, se queda el del último (T12).
  const aplicadoEl = ultimo !== undefined && ultimo.aplicadoEl > ahora ? ultimo.aplicadoEl : ahora
  const nuevo: Avance = {
    id: resultado.avanceId,
    desde: resultado.desde,
    hasta: resultado.hasta,
    aplicadoEl,
    cambios: resultado.cambios,
    avisos: resultado.avisos,
    snapshotPrevio: estadoDe(documento),
  }
  const estado = estadoDe(resultado.estadoNuevo)
  return {
    ...estado,
    partida: { ...estado.partida, cambiosDesdeUltimoAvance: 0 },
    avances: [...anteriores.map(sinCopia), nuevo],
  }
}
