import { compararFechas } from '../calendario/fecha'
import { CATEGORIA, RECURSO } from '../catalogo/inicial'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id, UbicacionObjeto } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { DominioAsentamiento } from '../modelo/dominios'
import type { Movimiento } from '../modelo/movimientos'
import type { CambioPoblacion, ConsumoPorHabitante } from '../modelo/almacen'
import { esNombreReservado, mismoNombre } from '../texto/normalizar'
import { eliminarCaravana } from './caravanas'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide A0 y «Editar asentamiento». */
export interface DatosAsentamiento {
  nombre: string
  categoria: DominioAsentamiento['categoria']
  habitantes: number
  cajaInicial: { base: number }
}

/** Lanza si el nombre no vale: de 2 a 60 letras, no reservado y sin repetir asentamiento ni mercado (§6.6). */
function exigeNombre(estado: EstadoPartida, nombre: string, propio?: Id): string {
  const limpio = nombre.trim()
  if (limpio.length < 2 || limpio.length > 60) {
    throw new Error('El nombre tiene que tener de 2 a 60 caracteres')
  }
  if (esNombreReservado(limpio)) {
    throw new Error(`«${limpio}» es un nombre reservado`)
  }
  const repetido =
    estado.dominios.some((d) => d.id !== propio && mismoNombre(d.nombre, limpio)) ||
    estado.mercados.some((m) => m.localDe !== propio && mismoNombre(m.nombre, limpio))
  if (repetido) {
    throw new Error(`Ya existe «${limpio}»`)
  }
  return limpio
}

function exigeEnteroNoNegativo(numero: number): void {
  if (!Number.isInteger(numero) || numero < 0) {
    throw new Error('Los habitantes son un número entero de 0 o más')
  }
}

/**
 * A0: el asentamiento nace vacío, sin plantillas, con su caja, su población, la fila de víveres sin límite y el
 * mercado local sin precios, que lleva su nombre.
 */
export function crearAsentamiento<E extends EstadoPartida>(
  estado: E,
  datos: DatosAsentamiento,
  sello: Sello,
): Creado<E> {
  const nombre = exigeNombre(estado, datos.nombre)
  exigeEnteroNoNegativo(datos.habitantes)
  const id = sello.nuevoId()
  return {
    estado: {
      ...estado,
      dominios: [
        ...estado.dominios,
        { id, tipo: 'asentamiento', nombre, categoria: datos.categoria, alta: estado.partida.fechaActual },
      ],
      cajas: [...estado.cajas, { dominioId: id, saldoInicial: datos.cajaInicial }],
      poblaciones: [
        ...estado.poblaciones,
        { dominioId: id, habitantesIniciales: datos.habitantes, cambios: [], consumos: [] },
      ],
      existencias: [...estado.existencias, { dominioId: id, recursoId: RECURSO.viveres, cantidad: 0 }],
      mercados: [...estado.mercados, { id: sello.nuevoId(), nombre, localDe: id, precios: [] }],
    },
    id,
  }
}

/** «Editar asentamiento»: nombre (y el de su mercado local), tipo, habitantes iniciales y caja inicial. */
export function editarAsentamiento<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: DatosAsentamiento,
  sello: Sello,
): E {
  const actual = buscarPorId(estado.dominios, id)
  if (actual.tipo !== 'asentamiento') {
    throw new Error('Ese dominio no es un asentamiento')
  }
  const nombre = exigeNombre(estado, datos.nombre, id)
  exigeEnteroNoNegativo(datos.habitantes)
  const copia = [...estado.dominios]
  const dominios = reemplazarPorId(copia, { ...actual, nombre, categoria: datos.categoria }, sello.ahora)
  const caja = estado.cajas.find((c) => c.dominioId === id)
  const poblacion = estado.poblaciones.find((p) => p.dominioId === id)
  const cambiaCaja = caja !== undefined && caja.saldoInicial.base !== datos.cajaInicial.base
  const cambiaGente = poblacion !== undefined && poblacion.habitantesIniciales !== datos.habitantes
  if (dominios === copia && !cambiaCaja && !cambiaGente) {
    return estado
  }
  return {
    ...estado,
    dominios,
    cajas: cambiaCaja
      ? estado.cajas.map((c) =>
          c.dominioId === id ? { ...c, saldoInicial: datos.cajaInicial, editadoEl: sello.ahora } : c,
        )
      : estado.cajas,
    poblaciones: cambiaGente
      ? estado.poblaciones.map((p) =>
          p.dominioId === id ? { ...p, habitantesIniciales: datos.habitantes, editadoEl: sello.ahora } : p,
        )
      : estado.poblaciones,
    mercados: estado.mercados.map((m) => (m.localDe === id && m.nombre !== nombre ? { ...m, nombre } : m)),
  }
}

/** Cambia la población de un asentamiento con una función y sella la edición. */
function conPoblacion<E extends EstadoPartida>(
  estado: E,
  dominioId: Id,
  cambio: (p: EstadoPartida['poblaciones'][number]) => EstadoPartida['poblaciones'][number],
  sello: Sello,
): E {
  return {
    ...estado,
    poblaciones: estado.poblaciones.map((p) =>
      p.dominioId === dominioId ? { ...cambio(p), editadoEl: sello.ahora } : p,
    ),
  }
}

/** Añade o edita un cambio de población (A4). Sin id, es nuevo. */
export function guardarCambioDePoblacion<E extends EstadoPartida>(
  estado: E,
  dominioId: Id,
  datos: Pick<CambioPoblacion, 'fecha' | 'delta' | 'motivo'>,
  id: Id | undefined,
  sello: Sello,
): E {
  if (!Number.isInteger(datos.delta) || datos.delta === 0) {
    throw new Error('El cambio es un número entero distinto de 0')
  }
  if (datos.motivo.trim() === '') {
    throw new Error('Escribe el motivo')
  }
  const siguiente = conPoblacion(
    estado,
    dominioId,
    (p) => ({
      ...p,
      cambios:
        id === undefined
          ? [...p.cambios, { id: sello.nuevoId(), ...datos }]
          : p.cambios.map((c) => (c.id === id ? { ...c, ...datos, editadoEl: sello.ahora } : c)),
    }),
    sello,
  )
  // Un cambio cuenta desde su día en adelante: ningún tramo de la serie puede quedar por debajo de 0.
  const poblacion = siguiente.poblaciones.find((p) => p.dominioId === dominioId)!
  let gente = poblacion.habitantesIniciales
  const enNegativo = [...poblacion.cambios]
    .sort((x, y) => compararFechas(x.fecha, y.fecha))
    .some((c) => (gente += c.delta) < 0)
  if (enNegativo) {
    throw new Error('Los habitantes no pueden quedar por debajo de 0')
  }
  return siguiente
}

export function eliminarCambioDePoblacion<E extends EstadoPartida>(
  estado: E,
  dominioId: Id,
  id: Id,
  sello: Sello,
): E {
  return conPoblacion(estado, dominioId, (p) => ({ ...p, cambios: quitarPorId(p.cambios, id) }), sello)
}

/** Añade o edita un consumo por habitante (A4). El de víveres sale de la ración y no se anota. */
export function guardarConsumo<E extends EstadoPartida>(
  estado: E,
  dominioId: Id,
  datos: Pick<ConsumoPorHabitante, 'nombre' | 'recursoId' | 'porHabitante'>,
  id: Id | undefined,
  sello: Sello,
): E {
  if (datos.recursoId === RECURSO.viveres) {
    throw new Error('El consumo de víveres sale de la ración y no se anota')
  }
  if (!(datos.porHabitante > 0)) {
    throw new Error('El consumo por habitante tiene que ser mayor que 0')
  }
  return conPoblacion(
    estado,
    dominioId,
    (p) => ({
      ...p,
      consumos:
        id === undefined
          ? [...p.consumos, { id: sello.nuevoId(), ...datos }]
          : p.consumos.map((c) => (c.id === id ? { ...c, ...datos, editadoEl: sello.ahora } : c)),
    }),
    sello,
  )
}

export function eliminarConsumo<E extends EstadoPartida>(estado: E, dominioId: Id, id: Id, sello: Sello): E {
  return conPoblacion(estado, dominioId, (p) => ({ ...p, consumos: quitarPorId(p.consumos, id) }), sello)
}

/**
 * Elimina un asentamiento con todo lo suyo (§6.4, «Al eliminar»). La otra parte de sus transferencias se conserva
 * suelta, los traslados en ruta hacia él se cancelan devolviendo la carga, y lo del personaje que apuntaba a él
 * pasa a «Encima» o a la bolsa.
 */
export function eliminarAsentamiento<E extends EstadoPartida>(
  estado: E,
  id: Id,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): E {
  const dominio = buscarPorId(estado.dominios, id)
  if (dominio.tipo !== 'asentamiento') {
    throw new Error('Ese dominio no es un asentamiento')
  }
  const personaje = estado.dominios.find((d) => d.tipo === 'personaje')!.id

  let base = estado
  for (const caravana of estado.caravanas) {
    if (caravana.destinoId === id && caravana.estado !== 'terminada') {
      base = eliminarCaravana(base, caravana.id, { devolver: true }, catalogo)
    }
  }

  const transferencias = base.transferencias.filter((t) => t.saleDeId === id || t.entraEnId === id)
  const idsTransferencias = new Set(transferencias.map((t) => t.id))
  const otraParte = (m: Movimiento): Movimiento => {
    if (m.vinculo?.tipo !== 'transferencia' || !idsTransferencias.has(m.vinculo.id)) {
      return m
    }
    const suelto: Movimiento = {
      ...m,
      tipo: m.importe.base < 0 ? 'gasto' : 'ingreso',
      categoriaId: CATEGORIA.transferencias,
      concepto: `Transferencia (${dominio.nombre} eliminado)`,
      editadoEl: sello.ahora,
    }
    delete suelto.vinculo
    return suelto
  }

  const suyos = <T extends { dominioId?: Id }>(lista: T[]): T[] => lista.filter((r) => r.dominioId !== id)
  const edificios = new Set(base.edificios.filter((e) => e.dominioId === id).map((e) => e.id))
  const deudasFuera = base.deudas.filter((d) => d.dominioId === id)
  const movimientosDeDeudas = new Set(deudasFuera.flatMap((d) => d.pagos.map((p) => p.movimientoId)))
  const idsDeudas = new Set(deudasFuera.map((d) => d.id))
  const idsCaravanas = new Set(base.caravanas.filter((c) => c.dominioId === id).map((c) => c.id))
  const mercadoLocal = base.mercados.find((m) => m.localDe === id)?.id

  /** Los movimientos que sobreviven (los de otras cuentas) sin vínculos ni reglas que apunten a algo borrado. */
  const limpiar = (m: Movimiento): Movimiento => {
    const vinculoRoto =
      m.vinculo !== undefined &&
      (((m.vinculo.tipo === 'altaDeuda' || m.vinculo.tipo === 'pagoDeuda') && idsDeudas.has(m.vinculo.id)) ||
        (m.vinculo.tipo === 'caravana' && idsCaravanas.has(m.vinculo.id)))
    const reglaRota =
      m.regla !== undefined &&
      (m.regla.id === id ||
        base.impuestosRentas.some((r) => r.dominioId === id && r.id === m.regla!.id))
    if (!vinculoRoto && !reglaRota) {
      return m
    }
    const suelto = { ...m }
    if (vinculoRoto) {
      delete suelto.vinculo
    }
    if (reglaRota) {
      delete suelto.regla
    }
    return suelto
  }

  const aEncima = (u: UbicacionObjeto): UbicacionObjeto =>
    (u.tipo === 'caja' || u.tipo === 'almacen') && u.dominioId === id ? { tipo: 'encima' } : u
  const aBolsa = (cuenta: Id): Id => (cuenta === id ? personaje : cuenta)

  return {
    ...base,
    dominios: quitarPorId(base.dominios, id),
    cajas: base.cajas.filter((c) => c.dominioId !== id),
    movimientos: base.movimientos
      .filter((m) => m.dominioId !== id && !movimientosDeDeudas.has(m.id))
      .map(otraParte)
      .map(limpiar)
      .map((m) =>
        m.objetoPendiente === undefined
          ? m
          : { ...m, objetoPendiente: { ...m.objetoPendiente, ubicacion: aEncima(m.objetoPendiente.ubicacion) } },
      ),
    transferencias: base.transferencias.filter((t) => !idsTransferencias.has(t.id)),
    deudas: suyos(base.deudas).map((d) => {
      if (d.cuentaAltaId !== id) {
        return d
      }
      const sin = { ...d }
      delete sin.cuentaAltaId
      return sin
    }),
    recurrentes: suyos(base.recurrentes).map((r) => ({ ...r, cuentaId: aBolsa(r.cuentaId) })),
    inversiones: base.inversiones.map((i) => {
      const nueva = { ...i, cuentaBeneficiosId: aBolsa(i.cuentaBeneficiosId) }
      if (nueva.cuentaCapitalId === id) {
        delete nueva.cuentaCapitalId
      }
      return nueva
    }),
    objetos: base.objetos.map((o) => ({ ...o, ubicacion: aEncima(o.ubicacion) })),
    poblaciones: suyos(base.poblaciones),
    existencias: suyos(base.existencias),
    ajustesExistencias: suyos(base.ajustesExistencias),
    entradasAlmacen: suyos(base.entradasAlmacen).map((e) => {
      if (e.mercadoId === undefined || e.mercadoId !== mercadoLocal) {
        return e
      }
      const sin = { ...e }
      delete sin.mercadoId
      return sin
    }),
    edificios: suyos(base.edificios),
    produccionesRealizadas: base.produccionesRealizadas.filter((p) => !edificios.has(p.edificioId)),
    trabajadores: suyos(base.trabajadores),
    obras: suyos(base.obras),
    impuestosRentas: suyos(base.impuestosRentas),
    tiposLocal: suyos(base.tiposLocal),
    localesComerciales: suyos(base.localesComerciales),
    mercados: base.mercados.filter((m) => m.localDe !== id),
    rutas: base.rutas.filter(
      (r) =>
        r.origenId !== id &&
        !(r.destino.tipo === 'asentamiento' && r.destino.id === id) &&
        !(r.destino.tipo === 'mercado' && r.destino.id === mercadoLocal),
    ),
    caravanas: suyos(base.caravanas),
    unidadesGuarnicion: suyos(base.unidadesGuarnicion),
    defensas: suyos(base.defensas),
    animales: suyos(base.animales),
    armeria: suyos(base.armeria),
    eventos: suyos(base.eventos),
  }
}

/** Para la confirmación J2d: cuántos registros se borran con el asentamiento. */
export function resumenAlEliminarAsentamiento(estado: EstadoPartida, id: Id): { etiqueta: string; valor: number }[] {
  const cuantos = (lista: { dominioId?: Id }[]): number => lista.filter((r) => r.dominioId === id).length
  return [
    { etiqueta: 'Movimientos', valor: cuantos(estado.movimientos) },
    { etiqueta: 'Edificios', valor: cuantos(estado.edificios) },
    { etiqueta: 'Obras y caravanas', valor: cuantos(estado.obras) + cuantos(estado.caravanas) },
    { etiqueta: 'Deudas', valor: cuantos(estado.deudas) },
  ]
}

