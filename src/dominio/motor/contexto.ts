import { aNumeroDeDia, sumarDias, type Fecha } from '../calendario/fecha'
import { saldosPorDominio } from '../dinero/saldo'
import type { LocalComercial } from '../modelo/asentamiento'
import type { PersonaEntidad } from '../modelo/catalogos'
import type { Caravana } from '../modelo/comercio'
import type { Id } from '../modelo/comunes'
import type { Deuda } from '../modelo/deudas'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import type { EventoNarrativo } from '../modelo/eventos'
import type { DetalleTrabajo, Movimiento, ReglaOrigen } from '../modelo/movimientos'
import type { ObjetoInventario } from '../modelo/personaje'
import type { OpcionesSimulacion, Suceso } from './tipos'

/** Un día del recorrido (§9). */
export interface Dia {
  fecha: Fecha
  /** aNumeroDeDia(fecha). */
  numero: number
  /** El primer día recoge lo que ya había vencido (§9 l.1321, T14). */
  primero: boolean
  /** Los eventos de dinero activos ese día; lo rellena el paso 1. */
  eventos: EventoNarrativo[]
}

/** Lo que lleva sumado un concepto diario en este avance (§9 l.1285). */
export interface AcumuladoDiario {
  clase: 'regla' | 'salarios' | 'soldadas'
  regla: ReglaOrigen
  dominioId: Id
  tipo: 'gasto' | 'ingreso'
  categoriaId: Id
  /** El de la regla; en salarios y soldadas se arma al cerrar. */
  concepto: string
  unidadDiaria?: string
  /** Un beneficio «Cada día». */
  inversionId?: Id
  /** Magnitud sumada, en mh. */
  importe: number
  /** Días con importe mayor que 0 (D-021). */
  dias: number
  /** El último día contado (aNumeroDeDia): varias filas de salarios del mismo día cuentan un solo día. */
  ultimoDia: number
  /** Salarios y soldadas diarios, por fila (origenId). */
  detalle: Map<Id, DetalleTrabajo>
}

/** Un cargo de impago que abrió un diario en este avance, para sumarle los días siguientes (D-021). */
export interface CargoAbierto {
  deudaId: Id
  indice: number
}

/** Un movimiento que crea el avance, antes de ponerle id, origen, avanceId y programado. */
export type MovimientoDelAvance = Omit<Movimiento, 'id' | 'origen' | 'avanceId' | 'programado'>

/** El estado de trabajo de una simulación: nunca muta lo que recibe (T29). */
export interface Contexto {
  /** El de entrada, solo lectura: reglas, eventos, poblaciones… */
  readonly estado: EstadoPartida
  readonly opciones: OpcionesSimulacion
  readonly primerDia: Fecha
  readonly hasta: Fecha
  /** saldosPorDominio(estado), calculado una sola vez. */
  readonly saldosAntes: Record<Id, number>
  /** Saldo vivo por dominio. */
  readonly saldos: Map<Id, number>
  /** Copia: los de entrada (los programados aplicados, reemplazados) y los nuevos. */
  readonly movimientos: Movimiento[]
  /** Posición de cada movimiento en `movimientos`. */
  readonly indiceMovimiento: Map<Id, number>
  /** Programados sin vínculo por número de día; los de fecha pasada, en el primer día (T14). */
  readonly programadosPorDia: Map<number, Id[]>
  readonly deudas: Deuda[]
  readonly personas: PersonaEntidad[]
  readonly localesComerciales: LocalComercial[]
  readonly caravanas: Caravana[]
  readonly objetos: ObjetoInventario[]
  readonly personasNuevas: PersonaEntidad[]
  readonly sucesos: Suceso[]
  /** Clave `${regla.tipo}|${regla.id}`. */
  readonly diarios: Map<string, AcumuladoDiario>
  readonly cargosDiarios: Map<string, CargoAbierto>
}

/** El mismo registro sin las claves que valen undefined: así no llegan a IndexedDB ni a la copia. */
function sinClavesVacias<T extends object>(registro: T): T {
  return Object.fromEntries(Object.entries(registro).filter(([, valor]) => valor !== undefined)) as T
}

/** Prepara el contexto: saldos vivos, copias de lo que escribe el motor e índice de programados (§9). */
export function crearContexto(estado: EstadoPartida, hasta: Fecha, opciones: OpcionesSimulacion): Contexto {
  const primerDia = sumarDias(estado.partida.fechaActual, 1)
  const numeroPrimerDia = aNumeroDeDia(primerDia)
  const numeroHasta = aNumeroDeDia(hasta)
  const saldosAntes = saldosPorDominio(estado)
  const movimientos = [...estado.movimientos]
  const indiceMovimiento = new Map<Id, number>()
  const programadosPorDia = new Map<number, Id[]>()
  movimientos.forEach((m, indice) => {
    indiceMovimiento.set(m.id, indice)
    // Los vinculados (obras, caravanas y compras) los aplican sus propios pasos, en la fase 4.
    if (!m.programado || m.vinculo !== undefined) {
      return
    }
    const numero = Math.max(aNumeroDeDia(m.fecha), numeroPrimerDia)
    if (numero > numeroHasta) {
      return
    }
    const delDia = programadosPorDia.get(numero)
    if (delDia === undefined) {
      programadosPorDia.set(numero, [m.id])
    } else {
      delDia.push(m.id)
    }
  })
  return {
    estado,
    opciones,
    primerDia,
    hasta: { ...hasta },
    saldosAntes,
    saldos: new Map(Object.entries(saldosAntes)),
    movimientos,
    indiceMovimiento,
    programadosPorDia,
    deudas: [...estado.deudas],
    personas: [...estado.personas],
    localesComerciales: [...estado.localesComerciales],
    caravanas: [...estado.caravanas],
    objetos: [...estado.objetos],
    personasNuevas: [],
    sucesos: [],
    diarios: new Map(),
    cargosDiarios: new Map(),
  }
}

/** Añade un movimiento del avance (origen «avance», programado false, avanceId) con un id nuevo; no toca saldos. */
export function anadirMovimiento(ctx: Contexto, datos: MovimientoDelAvance): Id {
  const id = ctx.opciones.nuevoId()
  const movimiento = sinClavesVacias<Movimiento>({
    id,
    ...datos,
    origen: 'avance',
    avanceId: ctx.opciones.avanceId,
    programado: false,
  })
  ctx.indiceMovimiento.set(id, ctx.movimientos.length)
  ctx.movimientos.push(movimiento)
  return id
}

/**
 * Aplica un movimiento programado: programado false, avanceId y los cambios que se pasen (§6.4 l.768).
 * Conserva su id y su origen; una clave que llega con undefined en `cambios` se quita.
 */
export function aplicarProgramado(ctx: Contexto, id: Id, cambios: Partial<Movimiento>): void {
  const indice = ctx.indiceMovimiento.get(id)
  if (indice === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  ctx.movimientos[indice] = sinClavesVacias<Movimiento>({
    ...ctx.movimientos[indice],
    ...cambios,
    programado: false,
    avanceId: ctx.opciones.avanceId,
  })
}

/** El EstadoPartida final: fechaActual = hasta, las colecciones escritas y el resto compartido con la entrada. */
export function estadoFinal(ctx: Contexto): EstadoPartida {
  const entrada = estadoDe(ctx.estado)
  return {
    ...entrada,
    partida: { ...entrada.partida, fechaActual: { ...ctx.hasta } },
    movimientos: ctx.movimientos,
    deudas: ctx.deudas,
    personas: ctx.personas,
    localesComerciales: ctx.localesComerciales,
    caravanas: ctx.caravanas,
    objetos: ctx.objetos,
  }
}
