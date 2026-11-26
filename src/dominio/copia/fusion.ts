import type { EfectoObra, Obra } from '../modelo/asentamiento'
import {
  ARTICULO_LISTA,
  NOMBRE_LISTA,
  type CambiosCatalogo,
  type CatalogoApp,
  type CatalogosEnCopia,
  type ListaCatalogo,
  type OpcionCatalogo,
  type OpcionEnCopia,
  type RecursoCatalogo,
  type RecursoEnCopia,
} from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { DocumentoPartida, EstadoPartida } from '../modelo/documento'
import type { EfectoEvento } from '../modelo/eventos'
import { normalizarNombre } from '../texto/normalizar'

/** Las seis listas de opciones más los recursos: lo que nombra cada línea del resumen (§6.1). */
export type ListaFusionada = ListaCatalogo | 'recursos'

/** Nombre en singular de cada lista y de los recursos, para los mensajes: «La categoría …», «El recurso …». */
const NOMBRE_FUSIONADA: Readonly<Record<ListaFusionada, string>> = { ...NOMBRE_LISTA, recursos: 'recurso' }

/** Artículo de cada lista y de los recursos: «La» para categoría, «El» para las demás. */
const ARTICULO_FUSIONADA: Readonly<Record<ListaFusionada, 'La' | 'El'>> = { ...ARTICULO_LISTA, recursos: 'El' }

/** Lo que la fusión cambió, en datos, para armar las líneas del resumen y las pruebas (§6.1, decisión 7). */
export interface ResumenFusion {
  nombresConservados: { id: Id; lista: ListaFusionada; enLaCopia: string; enLaTablet: string }[]
  reactivadas: { id: Id; lista: ListaFusionada; nombre: string }[]
  unidasPorNombre: { idEnLaCopia: Id; id: Id; lista: ListaFusionada; nombre: string }[]
  creadas: { id: Id; lista: ListaFusionada; nombre: string; propia: boolean }[]
  unidadesConservadas: { id: Id; nombre: string; enLaCopia: string; enLaTablet: string }[]
}

/** Resultado de casar los catálogos de la copia con los de este dispositivo. */
export interface ResultadoFusion {
  cambios: CambiosCatalogo
  remapeo: Record<Id, Id>
  resumen: ResumenFusion
}

/** Una opción de la copia con el id que le toca en este dispositivo, lista para escribirse (decisión 7). */
function opcionParaLaTablet(opcion: OpcionEnCopia, id: Id): OpcionCatalogo {
  switch (opcion.lista) {
    case 'categorias':
      return {
        id,
        nombre: opcion.nombre,
        propia: opcion.propia,
        lista: 'categorias',
        grupo: opcion.grupo,
        borrada: false,
      }
    case 'oficios':
      return {
        id,
        nombre: opcion.nombre,
        propia: opcion.propia,
        lista: 'oficios',
        grupo: opcion.grupo,
        plural: opcion.plural,
        borrada: false,
      }
    case 'tiposEdificio':
      return {
        id,
        nombre: opcion.nombre,
        propia: opcion.propia,
        lista: 'tiposEdificio',
        grupo: opcion.grupo,
        borrada: false,
      }
    case 'tiposUnidad':
      return {
        id,
        nombre: opcion.nombre,
        propia: opcion.propia,
        lista: 'tiposUnidad',
        grupo: opcion.grupo,
        borrada: false,
      }
    case 'tiposDefensa':
      return { id, nombre: opcion.nombre, propia: opcion.propia, lista: 'tiposDefensa', borrada: false }
    case 'tiposAnimal':
      return {
        id,
        nombre: opcion.nombre,
        propia: opcion.propia,
        lista: 'tiposAnimal',
        grupo: opcion.grupo,
        borrada: false,
      }
  }
}

/** Un recurso de la copia con el id que le toca en este dispositivo. `protegido` es de la app y no viaja (§6.1). */
function recursoParaLaTablet(recurso: RecursoEnCopia, id: Id): RecursoCatalogo {
  return {
    id,
    nombre: recurso.nombre,
    unidadSingular: recurso.unidadSingular,
    unidadPlural: recurso.unidadPlural,
    propia: recurso.propia,
    borrada: false,
  }
}

/** Las unidades de un recurso tal como se escriben en el resumen: «saco / sacos». */
function unidadesDe(recurso: { unidadSingular: string; unidadPlural: string }): string {
  return `${recurso.unidadSingular} / ${recurso.unidadPlural}`
}

/** Anota que las unidades de la copia difieren: mandan las de este dispositivo, y las cantidades dependen de ellas. */
function anotarUnidades(enLaTablet: RecursoCatalogo, enLaCopia: RecursoEnCopia, resumen: ResumenFusion): void {
  if (
    enLaTablet.unidadSingular !== enLaCopia.unidadSingular ||
    enLaTablet.unidadPlural !== enLaCopia.unidadPlural
  ) {
    resumen.unidadesConservadas.push({
      id: enLaTablet.id,
      nombre: enLaTablet.nombre,
      enLaCopia: unidadesDe(enLaCopia),
      enLaTablet: unidadesDe(enLaTablet),
    })
  }
}

/**
 * Casa las opciones de la app por id y las tuyas por nombre normalizado en su lista, crea las que falten y
 * remapea (§6.1, decisión 7). `nuevoId` se recibe porque `crypto` es del navegador y el dominio es puro.
 */
export function fusionarCatalogos(
  enLaCopia: CatalogosEnCopia,
  enLaTablet: CatalogoApp,
  nuevoId: () => Id,
): ResultadoFusion {
  const cambios: CambiosCatalogo = {
    opcionesNuevas: [],
    recursosNuevos: [],
    opcionesReactivadas: [],
    recursosReactivados: [],
  }
  const remapeo: Record<Id, Id> = {}
  const resumen: ResumenFusion = {
    nombresConservados: [],
    reactivadas: [],
    unidasPorNombre: [],
    creadas: [],
    unidadesConservadas: [],
  }

  const opcionesPorId = new Map<Id, OpcionCatalogo>(enLaTablet.opciones.map((opcion) => [opcion.id, opcion]))
  // Candidatas a unirse por nombre: las no borradas de cada lista, más las que cree esta misma fusión.
  const opcionesPorNombre = new Map<ListaCatalogo, Map<string, Id>>()
  const indiceDe = (lista: ListaCatalogo): Map<string, Id> => {
    const indice = opcionesPorNombre.get(lista) ?? new Map<string, Id>()
    opcionesPorNombre.set(lista, indice)
    return indice
  }
  for (const opcion of enLaTablet.opciones) {
    if (!opcion.borrada) {
      indiceDe(opcion.lista).set(normalizarNombre(opcion.nombre), opcion.id)
    }
  }

  for (const opcion of enLaCopia.opciones) {
    if (!opcion.propia) {
      const enLaTabletPorId = opcionesPorId.get(opcion.id)
      if (enLaTabletPorId === undefined) {
        const creada = opcionParaLaTablet(opcion, opcion.id)
        cambios.opcionesNuevas.push(creada)
        opcionesPorId.set(creada.id, creada)
        indiceDe(creada.lista).set(normalizarNombre(creada.nombre), creada.id)
        resumen.creadas.push({ id: creada.id, lista: creada.lista, nombre: creada.nombre, propia: false })
        continue
      }
      if (normalizarNombre(enLaTabletPorId.nombre) !== normalizarNombre(opcion.nombre)) {
        resumen.nombresConservados.push({
          id: opcion.id,
          lista: opcion.lista,
          enLaCopia: opcion.nombre,
          enLaTablet: enLaTabletPorId.nombre,
        })
      }
      if (enLaTabletPorId.borrada) {
        cambios.opcionesReactivadas.push(opcion.id)
        resumen.reactivadas.push({ id: opcion.id, lista: opcion.lista, nombre: enLaTabletPorId.nombre })
        indiceDe(enLaTabletPorId.lista).set(normalizarNombre(enLaTabletPorId.nombre), enLaTabletPorId.id)
      }
      continue
    }
    const indice = indiceDe(opcion.lista)
    const clave = normalizarNombre(opcion.nombre)
    const idEnLaTablet = indice.get(clave)
    if (idEnLaTablet !== undefined) {
      const unida = opcionesPorId.get(idEnLaTablet)
      resumen.unidasPorNombre.push({
        idEnLaCopia: opcion.id,
        id: idEnLaTablet,
        lista: opcion.lista,
        nombre: unida === undefined ? opcion.nombre : unida.nombre,
      })
      if (idEnLaTablet !== opcion.id) {
        remapeo[opcion.id] = idEnLaTablet
      }
      continue
    }
    const id = nuevoId()
    const creada = opcionParaLaTablet(opcion, id)
    cambios.opcionesNuevas.push(creada)
    opcionesPorId.set(id, creada)
    indice.set(clave, id)
    resumen.creadas.push({ id, lista: creada.lista, nombre: creada.nombre, propia: true })
    if (id !== opcion.id) {
      remapeo[opcion.id] = id
    }
  }

  const recursosPorId = new Map<Id, RecursoCatalogo>(enLaTablet.recursos.map((recurso) => [recurso.id, recurso]))
  const recursosPorNombre = new Map<string, Id>()
  for (const recurso of enLaTablet.recursos) {
    if (!recurso.borrada) {
      recursosPorNombre.set(normalizarNombre(recurso.nombre), recurso.id)
    }
  }

  for (const recurso of enLaCopia.recursos) {
    if (!recurso.propia) {
      const enLaTabletPorId = recursosPorId.get(recurso.id)
      if (enLaTabletPorId === undefined) {
        const creado = recursoParaLaTablet(recurso, recurso.id)
        cambios.recursosNuevos.push(creado)
        recursosPorId.set(creado.id, creado)
        recursosPorNombre.set(normalizarNombre(creado.nombre), creado.id)
        resumen.creadas.push({ id: creado.id, lista: 'recursos', nombre: creado.nombre, propia: false })
        continue
      }
      if (normalizarNombre(enLaTabletPorId.nombre) !== normalizarNombre(recurso.nombre)) {
        resumen.nombresConservados.push({
          id: recurso.id,
          lista: 'recursos',
          enLaCopia: recurso.nombre,
          enLaTablet: enLaTabletPorId.nombre,
        })
      }
      anotarUnidades(enLaTabletPorId, recurso, resumen)
      if (enLaTabletPorId.borrada) {
        cambios.recursosReactivados.push(recurso.id)
        resumen.reactivadas.push({ id: recurso.id, lista: 'recursos', nombre: enLaTabletPorId.nombre })
        recursosPorNombre.set(normalizarNombre(enLaTabletPorId.nombre), enLaTabletPorId.id)
      }
      continue
    }
    const clave = normalizarNombre(recurso.nombre)
    const idEnLaTablet = recursosPorNombre.get(clave)
    if (idEnLaTablet !== undefined) {
      const unido = recursosPorId.get(idEnLaTablet)
      resumen.unidasPorNombre.push({
        idEnLaCopia: recurso.id,
        id: idEnLaTablet,
        lista: 'recursos',
        nombre: unido === undefined ? recurso.nombre : unido.nombre,
      })
      if (unido !== undefined) {
        anotarUnidades(unido, recurso, resumen)
      }
      if (idEnLaTablet !== recurso.id) {
        remapeo[recurso.id] = idEnLaTablet
      }
      continue
    }
    const id = nuevoId()
    const creado = recursoParaLaTablet(recurso, id)
    cambios.recursosNuevos.push(creado)
    recursosPorId.set(id, creado)
    recursosPorNombre.set(clave, id)
    resumen.creadas.push({ id, lista: 'recursos', nombre: creado.nombre, propia: true })
    if (id !== recurso.id) {
      remapeo[recurso.id] = id
    }
  }

  return { cambios, remapeo, resumen }
}

/** El efecto de una obra con sus ids de catálogo remapeados; los objetivoId son de registros y no se tocan. */
function remapearEfectoObra(efecto: EfectoObra, cambiar: (id: Id) => Id): EfectoObra {
  switch (efecto.tipo) {
    case 'crearEdificio':
      return { tipo: 'crearEdificio', tipoId: cambiar(efecto.tipoId) }
    case 'crearDefensa':
      return { tipo: 'crearDefensa', tipoId: cambiar(efecto.tipoId) }
    case 'ampliarAlmacen':
      return { tipo: 'ampliarAlmacen', recursoId: cambiar(efecto.recursoId), valor: efecto.valor }
    default:
      return efecto
  }
}

/** El efecto de un evento; solo el objetivo «recurso» es de catálogo: «categoriaCoste» es una clave fija. */
function remapearEfectoEvento(efecto: EfectoEvento, cambiar: (id: Id) => Id): EfectoEvento {
  if (efecto.ambito !== 'consumo' || efecto.objetivo.tipo !== 'recurso') {
    return efecto
  }
  return { ambito: 'consumo', objetivo: { tipo: 'recurso', id: cambiar(efecto.objetivo.id) }, pct: efecto.pct }
}

/** Los materiales de una obra, que llevan el recurso en la **clave** del objeto (decisión 13). */
function remapearMateriales(materiales: Obra['materiales'], cambiar: (id: Id) => Id): Obra['materiales'] {
  const remapeados: Record<Id, number> = {}
  for (const [recursoId, cantidad] of Object.entries(materiales)) {
    if (cantidad !== undefined) {
      remapeados[cambiar(recursoId)] = cantidad
    }
  }
  return remapeados
}

/** Los 20 campos de catálogo de un estado, con sus ids cambiados (`contrato-datos.md` §2.9). */
function remapearEstado(estado: EstadoPartida, cambiar: (id: Id) => Id): EstadoPartida {
  return {
    ...estado,
    movimientos: estado.movimientos.map((movimiento) => ({
      ...movimiento,
      categoriaId: cambiar(movimiento.categoriaId),
    })),
    recurrentes: estado.recurrentes.map((recurrente) => ({
      ...recurrente,
      categoriaId: cambiar(recurrente.categoriaId),
    })),
    impuestosRentas: estado.impuestosRentas.map((impuesto) => ({
      ...impuesto,
      categoriaId: cambiar(impuesto.categoriaId),
    })),
    trabajadores: estado.trabajadores.map((trabajador) => ({
      ...trabajador,
      oficioId: cambiar(trabajador.oficioId),
    })),
    edificios: estado.edificios.map((edificio) => ({
      ...edificio,
      tipoId: cambiar(edificio.tipoId),
      producciones: edificio.producciones.map((produccion) => ({
        ...produccion,
        recursoId: cambiar(produccion.recursoId),
      })),
    })),
    unidadesGuarnicion: estado.unidadesGuarnicion.map((unidad) => ({ ...unidad, tipoId: cambiar(unidad.tipoId) })),
    defensas: estado.defensas.map((defensa) => ({ ...defensa, tipoId: cambiar(defensa.tipoId) })),
    animales: estado.animales.map((animal) => ({ ...animal, tipoId: cambiar(animal.tipoId) })),
    obras: estado.obras.map((obra) => ({
      ...obra,
      materiales: remapearMateriales(obra.materiales, cambiar),
      efecto: remapearEfectoObra(obra.efecto, cambiar),
    })),
    poblaciones: estado.poblaciones.map((poblacion) => ({
      ...poblacion,
      consumos: poblacion.consumos.map((consumo) => ({ ...consumo, recursoId: cambiar(consumo.recursoId) })),
    })),
    existencias: estado.existencias.map((existencia) => ({
      ...existencia,
      recursoId: cambiar(existencia.recursoId),
    })),
    ajustesExistencias: estado.ajustesExistencias.map((ajuste) => ({
      ...ajuste,
      recursoId: cambiar(ajuste.recursoId),
    })),
    entradasAlmacen: estado.entradasAlmacen.map((entrada) => ({
      ...entrada,
      recursoId: cambiar(entrada.recursoId),
    })),
    produccionesRealizadas: estado.produccionesRealizadas.map((produccion) => ({
      ...produccion,
      recursoId: cambiar(produccion.recursoId),
    })),
    mercados: estado.mercados.map((mercado) => ({
      ...mercado,
      precios: mercado.precios.map((precio) => ({ ...precio, recursoId: cambiar(precio.recursoId) })),
    })),
    caravanas: estado.caravanas.map((caravana) => ({
      ...caravana,
      carga: { ...caravana.carga, recursoId: cambiar(caravana.carga.recursoId) },
    })),
    eventos: estado.eventos.map((evento) => ({
      ...evento,
      efectos: evento.efectos.map((efecto) => remapearEfectoEvento(efecto, cambiar)),
    })),
  }
}

/** Aplica el remapeo a todos los campos de catálogo del documento y de su snapshotPrevio (§6.1). */
export function remapearCatalogos(documento: DocumentoPartida, remapeo: Record<Id, Id>): DocumentoPartida {
  if (Object.keys(remapeo).length === 0) {
    return documento
  }
  const cambiar = (id: Id): Id => remapeo[id] ?? id
  const avances = documento.avances.map((avance) =>
    avance.snapshotPrevio === undefined
      ? avance
      : { ...avance, snapshotPrevio: remapearEstado(avance.snapshotPrevio, cambiar) },
  )
  return { ...remapearEstado(documento, cambiar), avances }
}

/** Las líneas del resumen de importación, en castellano y en orden fijo (§6.1, `contrato-datos.md` §3.4). */
export function lineasDeFusion(resumen: ResumenFusion): string[] {
  const lineas: string[] = []
  for (const conservado of resumen.nombresConservados) {
    const lista = `${ARTICULO_FUSIONADA[conservado.lista]} ${NOMBRE_FUSIONADA[conservado.lista]}`
    lineas.push(
      `${lista} «${conservado.enLaTablet}» se llama «${conservado.enLaCopia}» en la copia: ` +
        'se conserva el nombre de este dispositivo.',
    )
  }
  for (const reactivada of resumen.reactivadas) {
    const articulo = ARTICULO_FUSIONADA[reactivada.lista]
    const lista = `${articulo.toLowerCase()} ${NOMBRE_FUSIONADA[reactivada.lista]}`
    // «la categoría … eliminada», «el oficio … eliminado».
    const terminacion = articulo === 'La' ? 'a' : 'o'
    lineas.push(`Se ha recuperado ${lista} «${reactivada.nombre}», que estaba eliminad${terminacion}.`)
  }
  for (const unida of resumen.unidasPorNombre) {
    const lista = `${ARTICULO_FUSIONADA[unida.lista]} ${NOMBRE_FUSIONADA[unida.lista]}`
    lineas.push(`${lista} «${unida.nombre}» de la copia se ha unido a la tuya con el mismo nombre.`)
  }
  for (const creada of resumen.creadas) {
    const nombreDeLista = NOMBRE_FUSIONADA[creada.lista]
    if (creada.propia) {
      lineas.push(`Se ha añadido tu ${nombreDeLista} «${creada.nombre}».`)
    } else {
      const articulo = ARTICULO_FUSIONADA[creada.lista].toLowerCase()
      lineas.push(`Se ha añadido ${articulo} ${nombreDeLista} «${creada.nombre}», que este dispositivo no tenía.`)
    }
  }
  for (const unidades of resumen.unidadesConservadas) {
    lineas.push(
      `El recurso «${unidades.nombre}» se mide aquí en «${unidades.enLaTablet}» y en la copia en ` +
        `«${unidades.enLaCopia}»: se conservan las unidades de este dispositivo.`,
    )
  }
  return lineas
}
