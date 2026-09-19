import { aNumeroDeDia, desdeNumeroDeDia, type Fecha } from '../calendario/fecha'
import { eventosConEfectosEl } from '../eventos/efectos'
import type { PersonaEntidad } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { crearContexto, estadoFinal, type Contexto, type Dia } from './contexto'
import { cerrarDiarios } from './diarios'
import { pasoVueltaDeVentas } from './pasos/caravanas'
import { pasoCobros } from './pasos/cobros'
import { pasoPagos } from './pasos/pagos'
import type { FlujoAlmacen, OpcionesSimulacion, Suceso } from './tipos'

/** Un paso del día con su número en la lista de §9 l.1272-1282. */
export interface PasoDelDia {
  numero: number
  nombre: string
  paso: (ctx: Contexto, dia: Dia) => void
}

/** Paso 1: los eventos de asentamiento activos ese día con algún efecto, de cualquier ámbito (§9 l.1273). */
export function pasoEventos(ctx: Contexto, dia: Dia): void {
  dia.eventos = eventosConEfectosEl(ctx.estado.eventos, dia.fecha)
}

/** Los pasos que ya tiene el motor, en el orden de §9: 1 eventos, 7 vueltaDeVentas, 8 cobros y 9 pagos (T15). */
export const PASOS_DEL_DIA: readonly PasoDelDia[] = [
  { numero: 1, nombre: 'eventos', paso: pasoEventos },
  { numero: 7, nombre: 'vueltaDeVentas', paso: pasoVueltaDeVentas },
  { numero: 8, nombre: 'cobros', paso: pasoCobros },
  { numero: 9, nombre: 'pagos', paso: pasoPagos },
]

/** Lo que deja un recorrido, sin cambios ni avisos. */
export interface Recorrido {
  estadoNuevo: EstadoPartida
  saldosAntes: Record<Id, number>
  saldosDespues: Record<Id, number>
  personasNuevas: PersonaEntidad[]
  sucesos: Suceso[]
  flujos: FlujoAlmacen[]
}

/** Recorre del día siguiente a fechaActual hasta `hasta`, paso a paso; sin avisos, para que las previsiones lo usen (§9, T16). */
export function recorrerDias(estado: EstadoPartida, hasta: Fecha, opciones: OpcionesSimulacion): Recorrido {
  const ctx = crearContexto(estado, hasta, opciones)
  const primero = aNumeroDeDia(ctx.primerDia)
  const ultimo = aNumeroDeDia(hasta)
  for (let numero = primero; numero <= ultimo; numero++) {
    const dia: Dia = { fecha: desdeNumeroDeDia(numero), numero, primero: numero === primero, eventos: [] }
    for (const { paso } of PASOS_DEL_DIA) {
      paso(ctx, dia)
    }
  }
  cerrarDiarios(ctx)
  return {
    estadoNuevo: estadoFinal(ctx),
    saldosAntes: ctx.saldosAntes,
    saldosDespues: Object.fromEntries(ctx.saldos),
    personasNuevas: ctx.personasNuevas,
    sucesos: ctx.sucesos,
    flujos: ctx.flujos,
  }
}
