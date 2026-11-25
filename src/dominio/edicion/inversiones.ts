import { compararFechas, type Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import type { Inversion } from '../modelo/personaje'
import { conceptoCapitalInversion, conceptoRetiradaInversion } from '../motor/textos'
import { sinVacios } from './opcionales'
import { buscarPorId, contarCambio, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide el formulario «Inversión» (J6). */
export interface DatosInversion {
  dominioId: Id
  negocio: string
  descripcion?: string
  capital: Inversion['capital']
  participacionPct: number
  beneficio: Inversion['beneficio']
  recurrencia: Inversion['recurrencia']
  /** «El capital sale de»; sin ella, «Ninguno: ya invertido». */
  cuentaCapitalId?: Id
  cuentaBeneficiosId: Id
}

/** Lo que pide «Retirar inversión». */
export interface DatosRetirada {
  importe: Inversion['capital']
  cuentaId: Id
  fecha: Fecha
}

/** El movimiento vinculado del capital (sale) o de la retirada (entra), en «Inversiones». */
function movimientoDeInversion(
  id: Id,
  datos: { cuentaId: Id; fecha: Fecha; importe: number; concepto: string },
  vinculo: Movimiento['vinculo'],
): Movimiento {
  const sale = vinculo?.tipo === 'capitalInversion'
  return {
    id,
    dominioId: datos.cuentaId,
    fecha: datos.fecha,
    tipo: sale ? 'gasto' : 'ingreso',
    importe: { base: sale ? -datos.importe : datos.importe },
    categoriaId: CATEGORIA.inversiones,
    concepto: datos.concepto,
    origen: 'manual',
    vinculo,
    programado: false,
  }
}

/** El movimiento vinculado de ese tipo de una inversión, si lo tiene. */
function vinculadoDe(
  estado: EstadoPartida,
  id: Id,
  tipo: 'capitalInversion' | 'retiradaInversion',
): Movimiento | undefined {
  return estado.movimientos.find((m) => m.vinculo?.tipo === tipo && m.vinculo.id === id)
}

/** «Nueva inversión». El capital sale con la fecha de hoy de la partida (D-105). */
export function crearInversion<E extends EstadoPartida>(estado: E, datos: DatosInversion, sello: Sello): Creado<E> {
  const id = sello.nuevoId()
  const inversion: Inversion = sinVacios({ id, ...datos, estado: 'activa' as const })
  let movimientos = estado.movimientos
  if (datos.cuentaCapitalId !== undefined) {
    const capital = movimientoDeInversion(
      sello.nuevoId(),
      {
        cuentaId: datos.cuentaCapitalId,
        fecha: estado.partida.fechaActual,
        importe: datos.capital.base,
        concepto: conceptoCapitalInversion(datos.negocio),
      },
      { tipo: 'capitalInversion', id },
    )
    movimientos = [...movimientos, capital]
  }
  return {
    estado: contarCambio({ ...estado, movimientos, inversiones: [...estado.inversiones, inversion] }),
    id,
  }
}

/** Edita una inversión y el movimiento de su capital, que conserva su fecha y su concepto. */
export function editarInversion<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: Omit<DatosInversion, 'dominioId'>,
  sello: Sello,
): E {
  const actual = buscarPorId(estado.inversiones, id)
  const nueva: Inversion = sinVacios({
    ...actual,
    ...datos,
    descripcion: datos.descripcion,
    cuentaCapitalId: datos.cuentaCapitalId,
  })
  const copiaInversiones = [...estado.inversiones]
  const inversiones = reemplazarPorId(copiaInversiones, nueva, sello.ahora)
  if (inversiones === copiaInversiones) {
    return estado
  }
  const anterior = vinculadoDe(estado, id, 'capitalInversion')
  let movimientos = estado.movimientos
  if (datos.cuentaCapitalId === undefined) {
    if (anterior !== undefined) {
      movimientos = quitarPorId(movimientos, anterior.id)
    }
  } else {
    const capital = movimientoDeInversion(
      anterior?.id ?? sello.nuevoId(),
      {
        cuentaId: datos.cuentaCapitalId,
        fecha: anterior?.fecha ?? estado.partida.fechaActual,
        importe: datos.capital.base,
        concepto: anterior?.concepto ?? conceptoCapitalInversion(datos.negocio),
      },
      { tipo: 'capitalInversion', id },
    )
    movimientos =
      anterior === undefined
        ? [...movimientos, capital]
        : reemplazarPorId(movimientos, { ...capital, editadoEl: anterior.editadoEl }, sello.ahora)
  }
  return contarCambio({ ...estado, inversiones, movimientos })
}

/** «Retirar inversión»: cobra lo recuperado y la saca del patrimonio. */
export function retirarInversion<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: DatosRetirada,
  sello: Sello,
): E {
  const actual = buscarPorId(estado.inversiones, id)
  if (actual.estado === 'retirada') {
    throw new Error('Esa inversión ya está retirada')
  }
  if (compararFechas(datos.fecha, estado.partida.fechaActual) > 0) {
    throw new Error('La retirada no puede tener fecha futura')
  }
  const movimientoId = sello.nuevoId()
  const cobro = movimientoDeInversion(
    movimientoId,
    {
      cuentaId: datos.cuentaId,
      fecha: datos.fecha,
      importe: datos.importe.base,
      concepto: conceptoRetiradaInversion(actual.negocio),
    },
    { tipo: 'retiradaInversion', id },
  )
  const retirada: Inversion = {
    ...actual,
    estado: 'retirada',
    retirada: { fecha: datos.fecha, importe: datos.importe, movimientoId },
  }
  return contarCambio({
    ...estado,
    inversiones: reemplazarPorId(estado.inversiones, retirada, sello.ahora),
    movimientos: [...estado.movimientos, cobro],
  })
}

/** Revierte la retirada (se hace editando la inversión): borra su cobro y vuelve a estar activa. */
export function reactivarInversion<E extends EstadoPartida>(estado: E, id: Id, sello: Sello): E {
  const actual = buscarPorId(estado.inversiones, id)
  if (actual.estado !== 'retirada') {
    return estado
  }
  const { retirada, ...resto } = actual
  const activa: Inversion = { ...resto, estado: 'activa' }
  return contarCambio({
    ...estado,
    inversiones: reemplazarPorId(estado.inversiones, activa, sello.ahora),
    movimientos: quitarPorId(estado.movimientos, retirada.movimientoId),
  })
}

/**
 * Borra la inversión con los movimientos de su capital y su retirada; los beneficios cobrados se conservan
 * sueltos, sin regla ni inversiónId (§6.4, «Al eliminar»).
 */
export function eliminarInversion<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.inversiones, id)
  const movimientos = estado.movimientos
    .filter(
      (m) =>
        !((m.vinculo?.tipo === 'capitalInversion' || m.vinculo?.tipo === 'retiradaInversion') && m.vinculo.id === id),
    )
    .map((m) => {
      const esSuyo = m.inversionId === id || (m.regla?.tipo === 'beneficio' && m.regla.id === id)
      if (!esSuyo) {
        return m
      }
      const suelto = { ...m }
      delete suelto.inversionId
      delete suelto.regla
      return suelto
    })
  return contarCambio({ ...estado, movimientos, inversiones: quitarPorId(estado.inversiones, id) })
}
