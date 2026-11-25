import { compararFechas, type Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { estadoDeDeuda } from '../deudas/pendiente'
import type { Id } from '../modelo/comunes'
import type { AplicarPagoA, Deuda, PagoDeuda } from '../modelo/deudas'
import type { EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { conceptoAltaDeuda, conceptoPagoDeuda } from '../motor/textos'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide el formulario de «Deuda o préstamo» (§6.6, n.º 664). */
export interface DatosDeuda {
  dominioId: Id
  sentido: 'debo' | 'meDeben'
  contraparteId: Id
  fecha: Fecha
  principal: Deuda['principal']
  interesPct: number
  recurrenciaInteres?: Deuda['recurrenciaInteres']
  vencimiento?: Fecha
  notas?: string
  /** «El dinero entra en / sale de»; sin ella, «Ninguno: solo anotar la deuda» (esp l.1164). */
  cuentaId?: Id
}

/** Lo que se puede cambiar de una deuda ya creada. */
export type CambiosDeuda = Partial<Omit<DatosDeuda, 'cuentaId' | 'dominioId'>>

/** Lo que pide J4b: el importe, cómo se aplica, la fecha y de qué cuenta sale o en qué cuenta entra. */
export interface DatosPagoDeuda {
  importe: PagoDeuda['importe']
  aplicarA: AplicarPagoA
  fecha: Fecha
  cuentaId: Id
}

/** Lo que J4b deja cambiar de un pago ya registrado. */
export type CambiosPagoDeuda = Partial<DatosPagoDeuda>

/** El nombre de una persona o entidad del documento. */
function nombreDe(estado: EstadoPartida, id: Id): string {
  const persona = estado.personas.find((p) => p.id === id)
  if (persona === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  return persona.nombre
}

/**
 * El estado que le toca a una deuda después de tocar sus pagos: saldada si no queda nada, vencida si su
 * vencimiento ya pasó y queda algo, y abierta en los demás casos (§7 l.1166, l.1163).
 */
function estadoSegunPendiente(deuda: Deuda, hoy: Fecha): Deuda['estado'] {
  if (estadoDeDeuda(deuda).pendiente === 0) {
    return 'saldada'
  }
  return deuda.vencimiento !== undefined && compararFechas(deuda.vencimiento, hoy) <= 0 ? 'vencida' : 'abierta'
}

/** La deuda con sus pagos nuevos y el estado que le toca. */
function conPagos(deuda: Deuda, pagos: readonly PagoDeuda[], hoy: Fecha): Deuda {
  const nueva = { ...deuda, pagos: [...pagos] }
  return { ...nueva, estado: estadoSegunPendiente(nueva, hoy) }
}

/** El movimiento del dinero de una deuda: al deber entra y al prestar sale (esp l.1164). */
function movimientoDeDinero(
  id: Id,
  datos: { dominioId: Id; fecha: Fecha; importe: number; concepto: string; entra: boolean },
  vinculo: Movimiento['vinculo'],
): Movimiento {
  return {
    id,
    dominioId: datos.dominioId,
    fecha: datos.fecha,
    tipo: datos.entra ? 'ingreso' : 'gasto',
    importe: { base: datos.entra ? datos.importe : -datos.importe },
    categoriaId: CATEGORIA.prestamosYDeudas,
    concepto: datos.concepto,
    origen: 'manual',
    vinculo,
    // Un movimiento vinculado a una deuda no queda programado (D-033).
    programado: false,
  }
}

/**
 * Alta de una deuda o un préstamo (§6.6, n.º 664). Con cuenta, crea el movimiento vinculado de «Préstamos y
 * deudas»: al deber el dinero entra y al prestar sale. Con «Ninguno: solo anotar la deuda», no mueve dinero.
 */
export function crearDeuda<E extends EstadoPartida>(estado: E, datos: DatosDeuda, sello: Sello): Creado<E> {
  const id = sello.nuevoId()
  const deuda: Deuda = {
    id,
    dominioId: datos.dominioId,
    sentido: datos.sentido,
    contraparteId: datos.contraparteId,
    fecha: datos.fecha,
    principal: datos.principal,
    interesPct: datos.interesPct,
    ...(datos.recurrenciaInteres === undefined ? {} : { recurrenciaInteres: datos.recurrenciaInteres }),
    ...(datos.vencimiento === undefined ? {} : { vencimiento: datos.vencimiento }),
    ...(datos.notas === undefined ? {} : { notas: datos.notas }),
    estado: 'abierta',
    impago: false,
    pagos: [],
    devengos: [],
  }
  const conEstado: Deuda = { ...deuda, estado: estadoSegunPendiente(deuda, estado.partida.fechaActual) }
  let movimientos = estado.movimientos
  let guardada = conEstado
  if (datos.cuentaId !== undefined) {
    const movimiento = movimientoDeDinero(
      sello.nuevoId(),
      {
        dominioId: datos.cuentaId,
        fecha: datos.fecha,
        importe: datos.principal.base,
        concepto: conceptoAltaDeuda(datos.sentido, nombreDe(estado, datos.contraparteId), datos.notas),
        entra: datos.sentido === 'debo',
      },
      { tipo: 'altaDeuda', id },
    )
    movimientos = [...movimientos, movimiento]
    guardada = { ...conEstado, cuentaAltaId: datos.cuentaId }
  }
  return { estado: { ...estado, movimientos, deudas: [...estado.deudas, guardada] }, id }
}

/**
 * Edita una deuda (§6.6, n.º 664): sus datos y, si tiene movimiento de alta, el importe, la fecha y el concepto
 * de ese movimiento. Los pagos y los devengos no se tocan aquí.
 */
export function editarDeuda<E extends EstadoPartida>(estado: E, id: Id, cambios: CambiosDeuda, sello: Sello): E {
  const actual = buscarPorId(estado.deudas, id)
  if (actual.impago) {
    throw new Error('Una deuda de impago la lleva el motor')
  }
  const cambiada: Deuda = { ...actual, ...cambios }
  const nueva: Deuda = { ...cambiada, estado: estadoSegunPendiente(cambiada, estado.partida.fechaActual) }
  // reemplazarPorId devuelve la lista que recibe si nada cambia, así que se compara con la copia, no con la original.
  const copiaDeudas = [...estado.deudas]
  const deudas = reemplazarPorId(copiaDeudas, nueva, sello.ahora)
  const copiaMovimientos = [...estado.movimientos]
  let movimientos: typeof copiaMovimientos = copiaMovimientos
  const movimiento = estado.movimientos.find((m) => m.vinculo?.tipo === 'altaDeuda' && m.vinculo.id === id)
  if (movimiento !== undefined) {
    const entra = nueva.sentido === 'debo'
    movimientos = reemplazarPorId(
      copiaMovimientos,
      {
        ...movimiento,
        fecha: nueva.fecha,
        tipo: entra ? 'ingreso' : 'gasto',
        importe: { base: entra ? nueva.principal.base : -nueva.principal.base },
        concepto: conceptoAltaDeuda(nueva.sentido, nombreDe(estado, nueva.contraparteId), nueva.notas),
      },
      sello.ahora,
    )
  }
  if (deudas === copiaDeudas && movimientos === copiaMovimientos) {
    return estado
  }
  return { ...estado, deudas, movimientos }
}

/** Borra una deuda con sus pagos, el movimiento de cada pago y el del alta (§6.4, tabla de vinculados). */
export function eliminarDeuda<E extends EstadoPartida>(estado: E, id: Id): E {
  const deuda = buscarPorId(estado.deudas, id)
  const aBorrar = new Set(deuda.pagos.map((p) => p.movimientoId))
  const movimientos = estado.movimientos.filter(
    (m) => !aBorrar.has(m.id) && !(m.vinculo?.tipo === 'altaDeuda' && m.vinculo.id === id),
  )
  return { ...estado, deudas: quitarPorId([...estado.deudas], id), movimientos }
}

/**
 * Registra un pago o un cobro (J4b): crea su movimiento vinculado de «Préstamos y deudas» y recalcula el estado
 * de la deuda. Los devengos ya sumados no cambian (§7 l.1162).
 */
export function registrarPagoDeuda<E extends EstadoPartida>(
  estado: E,
  deudaId: Id,
  datos: DatosPagoDeuda,
  sello: Sello,
): Creado<E> {
  const deuda = buscarPorId(estado.deudas, deudaId)
  const id = sello.nuevoId()
  const movimientoId = sello.nuevoId()
  const movimiento = movimientoDeDinero(
    movimientoId,
    {
      dominioId: datos.cuentaId,
      fecha: datos.fecha,
      importe: datos.importe.base,
      concepto: conceptoPagoDeuda(deuda.sentido, nombreDe(estado, deuda.contraparteId)),
      entra: deuda.sentido === 'meDeben',
    },
    { tipo: 'pagoDeuda', id },
  )
  const pago: PagoDeuda = {
    id,
    fecha: datos.fecha,
    importe: datos.importe,
    aplicarA: datos.aplicarA,
    movimientoId,
  }
  const nueva = conPagos(deuda, [...deuda.pagos, pago], estado.partida.fechaActual)
  return {
    estado: {
      ...estado,
      deudas: reemplazarPorId([...estado.deudas], nueva, sello.ahora),
      movimientos: [...estado.movimientos, movimiento],
    },
    id,
  }
}

/** Edita un pago (J4b desde la lista de Pagos): recalcula la deuda y su movimiento. */
export function editarPagoDeuda<E extends EstadoPartida>(
  estado: E,
  deudaId: Id,
  pagoId: Id,
  cambios: CambiosPagoDeuda,
  sello: Sello,
): E {
  const deuda = buscarPorId(estado.deudas, deudaId)
  const pago = buscarPorId(deuda.pagos, pagoId)
  const cambiado: PagoDeuda = {
    ...pago,
    ...(cambios.importe === undefined ? {} : { importe: cambios.importe }),
    ...(cambios.aplicarA === undefined ? {} : { aplicarA: cambios.aplicarA }),
    ...(cambios.fecha === undefined ? {} : { fecha: cambios.fecha }),
  }
  const copiaPagos = [...deuda.pagos]
  const pagos = reemplazarPorId(copiaPagos, cambiado, sello.ahora)
  const movimiento = buscarPorId(estado.movimientos, pago.movimientoId)
  const entra = deuda.sentido === 'meDeben'
  const copiaMovimientos = [...estado.movimientos]
  const movimientos = reemplazarPorId(
    copiaMovimientos,
    {
      ...movimiento,
      dominioId: cambios.cuentaId ?? movimiento.dominioId,
      fecha: cambiado.fecha,
      // Sin importe nuevo, el movimiento se queda con el suyo: así conserva lo que escribiste («10 mo»).
      ...(cambios.importe === undefined
        ? {}
        : { importe: { base: entra ? cambios.importe.base : -cambios.importe.base } }),
    },
    sello.ahora,
  )
  if (pagos === copiaPagos && movimientos === copiaMovimientos) {
    return estado
  }
  const nueva = conPagos(deuda, pagos, estado.partida.fechaActual)
  return {
    ...estado,
    deudas: reemplazarPorId([...estado.deudas], nueva, sello.ahora),
    movimientos,
  }
}

/** Borra un pago con su movimiento y recalcula la deuda; los devengos no cambian (§6.4, tabla de vinculados). */
export function eliminarPagoDeuda<E extends EstadoPartida>(estado: E, deudaId: Id, pagoId: Id, sello: Sello): E {
  const deuda = buscarPorId(estado.deudas, deudaId)
  const pago = buscarPorId(deuda.pagos, pagoId)
  const nueva = conPagos(
    deuda,
    deuda.pagos.filter((p) => p.id !== pagoId),
    estado.partida.fechaActual,
  )
  return {
    ...estado,
    deudas: reemplazarPorId([...estado.deudas], nueva, sello.ahora),
    movimientos: quitarPorId([...estado.movimientos], pago.movimientoId),
  }
}
