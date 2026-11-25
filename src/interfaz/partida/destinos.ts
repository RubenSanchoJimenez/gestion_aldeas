import type { TipoAviso } from '../../dominio/modelo/avance'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import type { Pantalla, SeccionAsentamiento, SeccionPersonaje } from '../app/navegacion'

/** A qué pantalla lleva cada aviso (§9, tabla de avisos): una sección para el personaje y otra para un asentamiento. */
const DESTINOS: Record<TipoAviso, [SeccionPersonaje, SeccionAsentamiento]> = {
  faltaDeRecurso: ['resumen', 'comercio'],
  faltaPrevista: ['resumen', 'comercio'],
  impago: ['deudas', 'tesoreria'],
  deudaVencida: ['deudas', 'tesoreria'],
  deudaQueVence: ['deudas', 'tesoreria'],
  pagoNoCubierto: ['gastos', 'tesoreria'],
  saldoNegativo: ['bolsa', 'tesoreria'],
  obraQueNoPudoEmpezar: ['resumen', 'produccion'],
  caravanaQueNoPudoSalir: ['resumen', 'comercio'],
  edificioTerminadoSinProduccion: ['resumen', 'produccion'],
  mejoraTerminada: ['resumen', 'produccion'],
  recursoPerdido: ['resumen', 'comercio'],
}

export function destinoDeAviso(documento: DocumentoPartida, tipo: TipoAviso, dominioId?: string): Pantalla {
  const dominio = documento.dominios.find((d) => d.id === dominioId)
  if (dominio === undefined) {
    return { tipo: 'inicio' }
  }
  return { tipo: 'dominio', dominioId: dominio.id, seccion: DESTINOS[tipo][dominio.tipo === 'personaje' ? 0 : 1] }
}
