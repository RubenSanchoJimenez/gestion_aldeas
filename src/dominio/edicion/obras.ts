import { compararFechas, type Fecha } from '../calendario/fecha'
import { cabenMas, textoCaben, TOLERANCIA, type RecursoConNombre } from '../almacen/cantidades'
import { CATEGORIA } from '../catalogo/inicial'
import type { Importe } from '../dinero/importe'
import type { EfectoObra, Obra } from '../modelo/asentamiento'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Existencia } from '../modelo/almacen'
import type { Movimiento } from '../modelo/movimientos'
import { conceptoObra, recursoDelCatalogo, textoFaltan } from '../motor/textos'
import { asegurarFila } from './existencias'
import { buscarPorId, mismoRegistro, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide el formulario «Obra» (§6.4). */
export interface DatosObra {
  dominioId: Id
  nombre: string
  coste: Importe
  materiales: Record<Id, number>
  diasTotales: number
  efecto: EfectoObra
}

/** La fila del almacén, si existe. */
function filaExistencia(estado: EstadoPartida, dominioId: Id, recursoId: Id): Existencia | undefined {
  return estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
}

/** Asegura las filas de los materiales y, si el efecto amplía el almacén, la de su recurso (D-056). */
function asegurarFilasDeObra<E extends EstadoPartida>(estado: E, dominioId: Id, datos: Pick<DatosObra, 'materiales' | 'efecto'>): E {
  let nuevo = Object.keys(datos.materiales).reduce((acc, recursoId) => asegurarFila(acc, dominioId, recursoId), estado)
  if (datos.efecto.tipo === 'ampliarAlmacen') {
    nuevo = asegurarFila(nuevo, dominioId, datos.efecto.recursoId)
  }
  return nuevo
}

/** Los materiales que faltan para empezar, con su cantidad y su recurso del catálogo. */
function materialesQueFaltan(
  estado: EstadoPartida,
  dominioId: Id,
  materiales: Record<Id, number>,
  catalogo: CatalogosEnCopia,
): { cantidad: number; recurso: RecursoConNombre }[] {
  const faltas: { cantidad: number; recurso: RecursoConNombre }[] = []
  for (const [recursoId, cantidad] of Object.entries(materiales)) {
    const disponible = filaExistencia(estado, dominioId, recursoId)?.cantidad ?? 0
    const falta = cantidad - disponible
    if (falta > TOLERANCIA) {
      faltas.push({ cantidad: falta, recurso: recursoDelCatalogo(catalogo, recursoId) })
    }
  }
  return faltas
}

/** Saca los materiales del almacén (las filas ya están aseguradas). */
function sacarMateriales<E extends EstadoPartida>(estado: E, dominioId: Id, materiales: Record<Id, number>): E {
  return Object.entries(materiales).reduce(
    (acc, [recursoId, cantidad]) => ({
      ...acc,
      existencias: acc.existencias.map((e) =>
        e.dominioId === dominioId && e.recursoId === recursoId ? { ...e, cantidad: e.cantidad - cantidad } : e,
      ),
    }),
    estado,
  )
}

/** «Caben 10 haces más» si algún material no cabe entero al devolverlo (D-058); null si todos caben. */
function bloqueoAlDevolverMateriales(
  estado: EstadoPartida,
  dominioId: Id,
  materiales: Record<Id, number>,
  catalogo: CatalogosEnCopia,
): string | null {
  for (const [recursoId, cantidad] of Object.entries(materiales)) {
    const fila = filaExistencia(estado, dominioId, recursoId)
    if (fila?.capacidad === undefined) {
      continue
    }
    if (fila.cantidad + cantidad > fila.capacidad + TOLERANCIA) {
      return textoCaben(cabenMas(fila) ?? 0, recursoDelCatalogo(catalogo, recursoId))
    }
  }
  return null
}

/** Suma los materiales de vuelta a sus filas. */
function devolverMateriales<E extends EstadoPartida>(estado: E, dominioId: Id, materiales: Record<Id, number>): E {
  return Object.entries(materiales).reduce(
    (acc, [recursoId, cantidad]) => ({
      ...acc,
      existencias: acc.existencias.map((e) =>
        e.dominioId === dominioId && e.recursoId === recursoId ? { ...e, cantidad: e.cantidad + cantidad } : e,
      ),
    }),
    estado,
  )
}

/** El importe con el signo del gasto, conservando lo tecleado si lo había. */
function importeDelGasto(coste: Importe): Importe {
  return coste.introducido === undefined ? { base: -coste.base } : { base: -coste.base, introducido: coste.introducido }
}

/** El gasto de una obra (§3.14): concepto, categoría y vínculo fijos. */
function gastoDeObra(movimientoId: Id, obraId: Id, dominioId: Id, fecha: Fecha, coste: Importe, nombre: string, programado: boolean): Movimiento {
  return {
    id: movimientoId,
    dominioId,
    fecha,
    tipo: 'gasto',
    importe: importeDelGasto(coste),
    categoriaId: CATEGORIA.obras,
    concepto: conceptoObra(nombre),
    origen: 'manual',
    vinculo: { tipo: 'obra', id: obraId },
    programado,
  }
}

function quitarMovimiento<E extends EstadoPartida>(estado: E, movimientoId: Id): E {
  return { ...estado, movimientos: estado.movimientos.filter((m) => m.id !== movimientoId) }
}

/** Deja el movimiento sin vínculo, como un gasto suelto. */
function soltarVinculo<E extends EstadoPartida>(estado: E, movimientoId: Id): E {
  return {
    ...estado,
    movimientos: estado.movimientos.map((m) => {
      if (m.id !== movimientoId) {
        return m
      }
      const { vinculo: _vinculo, ...resto } = m
      return resto
    }),
  }
}

/** Corrige el importe (y, solo en una programada, el concepto) del movimiento de la obra. */
function corregirGastoDeObra<E extends EstadoPartida>(
  estado: E,
  movimientoId: Id,
  coste: Importe,
  nombre: string,
  rehacerConcepto: boolean,
): E {
  return {
    ...estado,
    movimientos: estado.movimientos.map((m) =>
      m.id === movimientoId
        ? { ...m, importe: importeDelGasto(coste), concepto: rehacerConcepto ? conceptoObra(nombre) : m.concepto }
        : m,
    ),
  }
}

/** Sin inicio: planificada. Con inicio: como empezarObra. Asegura las filas de materiales y de ampliarAlmacen. */
export function crearObra<E extends EstadoPartida>(
  estado: E,
  datos: DatosObra,
  inicio: Fecha | undefined,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): Creado<E> {
  const conFilas = asegurarFilasDeObra(estado, datos.dominioId, datos)
  const id = sello.nuevoId()
  const obra: Obra = {
    id,
    dominioId: datos.dominioId,
    nombre: datos.nombre,
    estado: 'planificada',
    coste: datos.coste,
    materiales: datos.materiales,
    diasTotales: datos.diasTotales,
    efecto: datos.efecto,
  }
  const conObra: E = { ...conFilas, obras: [...conFilas.obras, obra] }
  if (inicio === undefined) {
    return { estado: conObra, id }
  }
  return { estado: empezarObra(conObra, id, inicio, sello, catalogo), id }
}

/**
 * «Empezar obra» de una planificada o programada (una programada rehace su programado). inicio > hoy: programada,
 * con su gasto programado si coste > 0. inicio ≤ hoy: exige los materiales, los saca y crea su gasto; la caja
 * puede quedar en negativo. Otra obra → «Esta obra ya ha empezado».
 */
export function empezarObra<E extends EstadoPartida>(
  estado: E,
  id: Id,
  inicio: Fecha,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): E {
  const obra = buscarPorId(estado.obras, id)
  if (obra.estado === 'enCurso' || obra.estado === 'terminada') {
    throw new Error('Esta obra ya ha empezado')
  }
  const sinProgramado = obra.movimientoId === undefined ? estado : quitarMovimiento(estado, obra.movimientoId)
  const hoy = sinProgramado.partida.fechaActual

  if (compararFechas(inicio, hoy) > 0) {
    let nuevoEstado: E = sinProgramado
    let obraNueva: Obra = {
      id: obra.id,
      dominioId: obra.dominioId,
      nombre: obra.nombre,
      estado: 'programada',
      coste: obra.coste,
      materiales: obra.materiales,
      inicio,
      diasTotales: obra.diasTotales,
      efecto: obra.efecto,
    }
    if (obra.coste.base > 0) {
      const movimientoId = sello.nuevoId()
      const gasto = gastoDeObra(movimientoId, obra.id, obra.dominioId, inicio, obra.coste, obra.nombre, true)
      nuevoEstado = { ...nuevoEstado, movimientos: [...nuevoEstado.movimientos, gasto] }
      obraNueva = { ...obraNueva, movimientoId }
    }
    const obras = reemplazarPorId(nuevoEstado.obras, obraNueva, sello.ahora)
    return { ...nuevoEstado, obras }
  }

  const faltas = materialesQueFaltan(sinProgramado, obra.dominioId, obra.materiales, catalogo)
  if (faltas.length > 0) {
    throw new Error(textoFaltan(faltas as any))
  }
  let nuevoEstado = sacarMateriales(sinProgramado, obra.dominioId, obra.materiales)
  let obraNueva: Obra = {
    id: obra.id,
    dominioId: obra.dominioId,
    nombre: obra.nombre,
    estado: 'enCurso',
    coste: obra.coste,
    materiales: obra.materiales,
    inicio,
    diasTotales: obra.diasTotales,
    efecto: obra.efecto,
  }
  if (obra.coste.base > 0) {
    const movimientoId = sello.nuevoId()
    const gasto = gastoDeObra(movimientoId, obra.id, obra.dominioId, inicio, obra.coste, obra.nombre, false)
    nuevoEstado = { ...nuevoEstado, movimientos: [...nuevoEstado.movimientos, gasto] }
    obraNueva = { ...obraNueva, movimientoId }
  }
  const obras = reemplazarPorId(nuevoEstado.obras, obraNueva, sello.ahora)
  return { ...nuevoEstado, obras }
}

/** «Guardar como planificada» de una programada: quita inicio y su gasto programado. */
export function planificarObra<E extends EstadoPartida>(estado: E, id: Id, sello: Sello): E {
  const obra = buscarPorId(estado.obras, id)
  const sinProgramado = obra.movimientoId === undefined ? estado : quitarMovimiento(estado, obra.movimientoId)
  const obraNueva: Obra = {
    id: obra.id,
    dominioId: obra.dominioId,
    nombre: obra.nombre,
    estado: 'planificada',
    coste: obra.coste,
    materiales: obra.materiales,
    diasTotales: obra.diasTotales,
    efecto: obra.efecto,
  }
  const obras = reemplazarPorId(sinProgramado.obras, obraNueva, sello.ahora)
  return { ...sinProgramado, obras }
}

/**
 * D-065: planificada y programada cambian entera; en curso y terminada, solo lo pendiente; el coste corrige su gasto.
 * `_catalogo` se recibe por la misma firma que crearObra, empezarObra y eliminarObra (TC17), aunque editarObra no
 * necesita nombrar ningún recurso: los mensajes de «solo cambia…» son fijos (huecos, tarea 25).
 */
export function editarObra<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: Omit<DatosObra, 'dominioId'>,
  sello: Sello,
  _catalogo: CatalogosEnCopia,
): E {
  const obra = buscarPorId(estado.obras, id)

  if (obra.estado === 'planificada') {
    const conFilas = asegurarFilasDeObra(estado, obra.dominioId, datos)
    const obraNueva: Obra = {
      id: obra.id,
      dominioId: obra.dominioId,
      nombre: datos.nombre,
      estado: 'planificada',
      coste: datos.coste,
      materiales: datos.materiales,
      diasTotales: datos.diasTotales,
      efecto: datos.efecto,
    }
    const obras = reemplazarPorId(conFilas.obras, obraNueva, sello.ahora)
    return obras === conFilas.obras ? conFilas : { ...conFilas, obras }
  }

  if (obra.estado === 'programada') {
    const conFilas = asegurarFilasDeObra(estado, obra.dominioId, datos)
    let nuevoEstado = conFilas
    let movimientoId = obra.movimientoId
    if (movimientoId !== undefined) {
      nuevoEstado = corregirGastoDeObra(nuevoEstado, movimientoId, datos.coste, datos.nombre, true)
    } else if (datos.coste.base > 0) {
      movimientoId = sello.nuevoId()
      const gasto = gastoDeObra(
        movimientoId,
        obra.id,
        obra.dominioId,
        obra.inicio ?? nuevoEstado.partida.fechaActual,
        datos.coste,
        datos.nombre,
        true,
      )
      nuevoEstado = { ...nuevoEstado, movimientos: [...nuevoEstado.movimientos, gasto] }
    }
    const obraNueva: Obra = {
      id: obra.id,
      dominioId: obra.dominioId,
      nombre: datos.nombre,
      estado: 'programada',
      coste: datos.coste,
      materiales: datos.materiales,
      inicio: obra.inicio,
      diasTotales: datos.diasTotales,
      efecto: datos.efecto,
      ...(movimientoId === undefined ? {} : { movimientoId }),
    }
    const obras = reemplazarPorId(nuevoEstado.obras, obraNueva, sello.ahora)
    return obras === nuevoEstado.obras ? nuevoEstado : { ...nuevoEstado, obras }
  }

  if (obra.estado === 'enCurso') {
    if (!mismoRegistro(datos.materiales, obra.materiales)) {
      throw new Error('En una obra en curso solo cambian el nombre, la duración, el resultado y el coste')
    }
    let nuevoEstado: E = estado
    if (obra.movimientoId !== undefined) {
      nuevoEstado = corregirGastoDeObra(nuevoEstado, obra.movimientoId, datos.coste, datos.nombre, false)
    }
    if (datos.efecto.tipo === 'ampliarAlmacen') {
      nuevoEstado = asegurarFila(nuevoEstado, obra.dominioId, datos.efecto.recursoId)
    }
    const obraNueva: Obra = {
      id: obra.id,
      dominioId: obra.dominioId,
      nombre: datos.nombre,
      estado: 'enCurso',
      coste: datos.coste,
      materiales: obra.materiales,
      inicio: obra.inicio,
      diasTotales: datos.diasTotales,
      efecto: datos.efecto,
      ...(obra.movimientoId === undefined ? {} : { movimientoId: obra.movimientoId }),
    }
    const obras = reemplazarPorId(nuevoEstado.obras, obraNueva, sello.ahora)
    return obras === nuevoEstado.obras ? nuevoEstado : { ...nuevoEstado, obras }
  }

  // terminada: solo el nombre y el coste.
  if (
    datos.diasTotales !== obra.diasTotales ||
    !mismoRegistro(datos.efecto, obra.efecto) ||
    !mismoRegistro(datos.materiales, obra.materiales)
  ) {
    throw new Error('En una obra terminada solo cambian el nombre y el coste')
  }
  let nuevoEstado: E = estado
  if (obra.movimientoId !== undefined) {
    nuevoEstado = corregirGastoDeObra(nuevoEstado, obra.movimientoId, datos.coste, datos.nombre, false)
  }
  const obraNueva: Obra = {
    id: obra.id,
    dominioId: obra.dominioId,
    nombre: datos.nombre,
    estado: 'terminada',
    coste: datos.coste,
    materiales: obra.materiales,
    inicio: obra.inicio,
    diasTotales: obra.diasTotales,
    efecto: obra.efecto,
    ...(obra.movimientoId === undefined ? {} : { movimientoId: obra.movimientoId }),
  }
  const obras = reemplazarPorId(nuevoEstado.obras, obraNueva, sello.ahora)
  return obras === nuevoEstado.obras ? nuevoEstado : { ...nuevoEstado, obras }
}

/** Lo que se hace con el coste y los materiales al eliminar una obra en curso. */
export interface OpcionesAlEliminarObra {
  devolverCoste: boolean
  devolverMateriales: boolean
}

/** §6.4 y D-058, D-059: cada estado de la obra se deshace de una forma distinta. */
export function eliminarObra<E extends EstadoPartida>(
  estado: E,
  id: Id,
  opciones: OpcionesAlEliminarObra,
  catalogo: CatalogosEnCopia,
): E {
  const obra = buscarPorId(estado.obras, id)
  let nuevoEstado: E = estado

  if (obra.estado === 'programada' && obra.movimientoId !== undefined) {
    nuevoEstado = quitarMovimiento(nuevoEstado, obra.movimientoId)
  } else if (obra.estado === 'enCurso') {
    if (opciones.devolverMateriales) {
      const bloqueo = bloqueoAlDevolverMateriales(nuevoEstado, obra.dominioId, obra.materiales, catalogo)
      if (bloqueo !== null) {
        throw new Error(bloqueo)
      }
      nuevoEstado = devolverMateriales(nuevoEstado, obra.dominioId, obra.materiales)
    }
    if (obra.movimientoId !== undefined) {
      nuevoEstado = opciones.devolverCoste
        ? quitarMovimiento(nuevoEstado, obra.movimientoId)
        : soltarVinculo(nuevoEstado, obra.movimientoId)
    }
  } else if (obra.estado === 'terminada' && obra.movimientoId !== undefined) {
    nuevoEstado = soltarVinculo(nuevoEstado, obra.movimientoId)
  }

  return { ...nuevoEstado, obras: quitarPorId(nuevoEstado.obras, id) }
}
