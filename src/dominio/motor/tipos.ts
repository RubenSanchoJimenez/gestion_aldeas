import type { Fecha } from '../calendario/fecha'
import type { AvisoAvance, CambioAvance } from '../modelo/avance'
import type { CatalogosEnCopia, PersonaEntidad } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { OrigenImpago } from '../modelo/deudas'
import type { EstadoPartida } from '../modelo/documento'

/** Generador de ids nuevos: nuevoId de src/datos/ids.ts en la app; idsEnSerie en pruebas y previsiones (T1). */
export type NuevoId = () => Id

/** Lo que simular necesita además del estado (T1). */
export interface OpcionesSimulacion {
  avanceId: Id
  nuevoId: NuevoId
  catalogo: CatalogosEnCopia
}

/** Qué pago nombra un aviso «Pago no cubierto» (D-025). */
export type QuePago =
  | { clase: 'tributo' }
  | { clase: 'salarios' }
  | { clase: 'soldadas' }
  | { clase: 'concepto'; concepto: string }

/** Lo que pasó durante un recorrido y alimenta los hechos y los avisos (§9). */
export type Suceso =
  | {
      tipo: 'pago'
      /** Salarios y soldadas: { tipo, id: dominioId }; tributo, recurrente y programado: su id. */
      origen: OrigenImpago
      /** La caja que paga. */
      dominioId: Id
      fecha: Fecha
      /** Lo que tocaba pagar ese día, con eventos; mayor que 0. */
      debido: number
      pagado: number
      que: QuePago
      /** Regla «Cada día»: no da hecho (T18). */
      diario: boolean
    }
  | { tipo: 'cobroLocales'; dominioId: Id; fecha: Fecha }
  | { tipo: 'vueltaCaravana'; dominioId: Id; fecha: Fecha; mercadoId: Id }

/** Un aviso en memoria, con la fecha que sirve para ordenarlo; se guarda sin ella (T11). */
export interface AvisoConFecha extends AvisoAvance {
  fecha: Fecha
}

/** Lo que devuelve simular: lo que pide §9 l.1271 y lo que necesitan P4 y aplicarAvance. */
export interface ResultadoSimulacion {
  avanceId: Id
  /** La fechaActual de partida: Avance.desde. */
  desde: Fecha
  /** El último día simulado: Avance.hasta y la fechaActual nueva. */
  hasta: Fecha
  estadoNuevo: EstadoPartida
  cambios: CambioAvance[]
  /** Ya ordenados, sin fecha. */
  avisos: AvisoAvance[]
  /** P4: «Se añadirá «Trabajadores de Bree» a Personas y entidades» (§9 l.1295). */
  personasNuevas: PersonaEntidad[]
}
