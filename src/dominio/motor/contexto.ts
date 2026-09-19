import { claveExistencia } from '../almacen/cantidades'
import { asignadosPorEdificio, primerDiaQueCuenta as primerDiaDeRecurrencia } from '../almacen/produccion'
import { aNumeroDeDia, sumarDias, type Fecha } from '../calendario/fecha'
import { saldosPorDominio } from '../dinero/saldo'
import type { EntradaAlmacen, Existencia, ProduccionRealizada } from '../modelo/almacen'
import type { AcumuladoProduccion, Defensa, Edificio, LocalComercial, Obra } from '../modelo/asentamiento'
import type { PersonaEntidad } from '../modelo/catalogos'
import type { Caravana } from '../modelo/comercio'
import type { Id } from '../modelo/comunes'
import type { Deuda } from '../modelo/deudas'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import type { EventoNarrativo } from '../modelo/eventos'
import type { DetalleTrabajo, Movimiento, ReglaOrigen } from '../modelo/movimientos'
import type { ObjetoInventario } from '../modelo/personaje'
import type { FlujoAlmacen, OpcionesSimulacion, Suceso } from './tipos'

/** Un día del recorrido (§9). */
export interface Dia {
  fecha: Fecha
  /** aNumeroDeDia(fecha). */
  numero: number
  /** El primer día recoge lo que ya había vencido (§9 l.1321, T14). */
  primero: boolean
  /** Los eventos de asentamiento activos ese día con algún efecto; lo rellena el paso 1. */
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
  /** Filas vivas por claveExistencia, en el orden de estado.existencias; las nuevas, al final (TC7). Nunca se mutan: se sustituyen. */
  readonly existencias: Map<string, Existencia>
  /** Copias propias del acumulado de cada producción, por su id (TC7). */
  readonly acumulados: Map<Id, AcumuladoProduccion>
  /** asignadosPorEdificio(estado.trabajadores): no cambian durante un recorrido. */
  readonly asignados: Map<Id, number>
  /** Caché de aNumeroDeDia(primerDiaQueCuenta(r)) por id de producción; −Infinity si no hay límite. */
  readonly primerDiaQueCuenta: Map<Id, number>
  readonly edificios: Edificio[]
  readonly obras: Obra[]
  readonly defensas: Defensa[]
  readonly entradasAlmacen: EntradaAlmacen[]
  readonly produccionesRealizadas: ProduccionRealizada[]
  readonly flujos: FlujoAlmacen[]
  /** Posición en `flujos` por `${dia.numero}|${clave}`. */
  readonly indiceFlujo: Map<string, number>
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
  const existencias = new Map<string, Existencia>()
  for (const fila of estado.existencias) {
    existencias.set(claveExistencia(fila.dominioId, fila.recursoId), fila)
  }
  const acumulados = new Map<Id, AcumuladoProduccion>()
  const primerDiaQueCuenta = new Map<Id, number>()
  for (const edificio of estado.edificios) {
    for (const produccion of edificio.producciones) {
      acumulados.set(produccion.id, {
        desde: { ...produccion.acumulado.desde },
        sumaFactores: produccion.acumulado.sumaFactores,
      })
      const primero = primerDiaDeRecurrencia(produccion.recurrencia)
      primerDiaQueCuenta.set(produccion.id, primero === null ? -Infinity : aNumeroDeDia(primero))
    }
  }
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
    existencias,
    acumulados,
    asignados: asignadosPorEdificio(estado.trabajadores),
    primerDiaQueCuenta,
    edificios: [...estado.edificios],
    obras: [...estado.obras],
    defensas: [...estado.defensas],
    entradasAlmacen: [...estado.entradasAlmacen],
    produccionesRealizadas: [...estado.produccionesRealizadas],
    flujos: [],
    indiceFlujo: new Map(),
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

/** Un edificio con el acumulado vivo de ctx.acumulados en cada una de sus producciones (TC7). */
function edificioConAcumulados(ctx: Contexto, edificio: Edificio): Edificio {
  return {
    ...edificio,
    producciones: edificio.producciones.map((produccion) => {
      const acumulado = ctx.acumulados.get(produccion.id)
      return acumulado === undefined ? produccion : { ...produccion, acumulado }
    }),
  }
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
    existencias: [...ctx.existencias.values()],
    edificios: ctx.edificios.map((edificio) => edificioConAcumulados(ctx, edificio)),
    obras: ctx.obras,
    defensas: ctx.defensas,
    entradasAlmacen: ctx.entradasAlmacen,
    produccionesRealizadas: ctx.produccionesRealizadas,
  }
}
