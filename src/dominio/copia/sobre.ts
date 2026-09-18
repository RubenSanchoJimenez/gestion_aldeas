import * as z from 'zod'
import {
  EsquemaCatalogosEnCopia,
  type CatalogoApp,
  type OpcionCatalogo,
  type OpcionEnCopia,
  type RecursoCatalogo,
  type RecursoEnCopia,
} from '../modelo/catalogos'
import { EsquemaInstante, type Id, type Instante } from '../modelo/comunes'
import { EsquemaDocumentoPartida, type DocumentoPartida, type EstadoPartida } from '../modelo/documento'
import { VERSION_FORMATO, type Partida } from '../modelo/partida'

/** Marca de la app dentro del sobre: distingue una copia de cualquier otro JSON (decisión 6). */
export const MARCA_COPIA = 'gestion-aldeas'

/**
 * Lo mínimo que se lee antes de validar nada: sirve para distinguir «no es una copia» de «es de una versión más
 * nueva» (§6.1). `z.object` descarta lo demás, así que una copia futura con campos nuevos llega hasta aquí.
 */
export const EsquemaVersionDeCopia = z.object({
  app: z.literal(MARCA_COPIA),
  versionFormato: z.int().min(1),
})

/** Sobre de la copia: la partida completa con su versión de formato y los catálogos que usan sus registros (§6.1). */
export const EsquemaSobreCopia = z.object({
  app: z.literal(MARCA_COPIA),
  versionFormato: z.literal(VERSION_FORMATO),
  exportadaEl: EsquemaInstante,
  partida: EsquemaDocumentoPartida,
  catalogos: EsquemaCatalogosEnCopia,
})
export type SobreCopia = z.infer<typeof EsquemaSobreCopia>

/** Compara dos cadenas con `<`, sin localeCompare, que depende de la configuración regional (§3.4 del contrato). */
function compararTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Los 20 campos de catálogo de un estado (`contrato-datos.md` §2.9), anotados en sus dos conjuntos. */
function anotarCatalogosDe(estado: EstadoPartida, opciones: Set<Id>, recursos: Set<Id>): void {
  for (const movimiento of estado.movimientos) {
    opciones.add(movimiento.categoriaId)
  }
  for (const recurrente of estado.recurrentes) {
    opciones.add(recurrente.categoriaId)
  }
  for (const impuesto of estado.impuestosRentas) {
    opciones.add(impuesto.categoriaId)
  }
  for (const trabajador of estado.trabajadores) {
    opciones.add(trabajador.oficioId)
  }
  for (const edificio of estado.edificios) {
    opciones.add(edificio.tipoId)
    for (const produccion of edificio.producciones) {
      recursos.add(produccion.recursoId)
    }
  }
  for (const unidad of estado.unidadesGuarnicion) {
    opciones.add(unidad.tipoId)
  }
  for (const defensa of estado.defensas) {
    opciones.add(defensa.tipoId)
  }
  for (const animal of estado.animales) {
    opciones.add(animal.tipoId)
  }
  for (const obra of estado.obras) {
    const efecto = obra.efecto
    if (efecto.tipo === 'crearEdificio' || efecto.tipo === 'crearDefensa') {
      opciones.add(efecto.tipoId)
    }
    if (efecto.tipo === 'ampliarAlmacen') {
      recursos.add(efecto.recursoId)
    }
    for (const recursoId of Object.keys(obra.materiales)) {
      recursos.add(recursoId)
    }
  }
  for (const poblacion of estado.poblaciones) {
    for (const consumo of poblacion.consumos) {
      recursos.add(consumo.recursoId)
    }
  }
  for (const existencia of estado.existencias) {
    recursos.add(existencia.recursoId)
  }
  for (const ajuste of estado.ajustesExistencias) {
    recursos.add(ajuste.recursoId)
  }
  for (const entrada of estado.entradasAlmacen) {
    recursos.add(entrada.recursoId)
  }
  for (const produccion of estado.produccionesRealizadas) {
    recursos.add(produccion.recursoId)
  }
  for (const mercado of estado.mercados) {
    for (const precio of mercado.precios) {
      recursos.add(precio.recursoId)
    }
  }
  for (const caravana of estado.caravanas) {
    recursos.add(caravana.carga.recursoId)
  }
  for (const evento of estado.eventos) {
    for (const efecto of evento.efectos) {
      // «categoriaCoste» no se anota: su id es una clave fija (salarios, soldadas, tributos o gastos), no una opción.
      if (efecto.ambito === 'consumo' && efecto.objetivo.tipo === 'recurso') {
        recursos.add(efecto.objetivo.id)
      }
    }
  }
}

/** Ids de catálogo que usan el estado y el snapshotPrevio del último avance, ordenados y sin repetir (§6.1). */
export function catalogosUsados(documento: DocumentoPartida): { opciones: Id[]; recursos: Id[] } {
  const opciones = new Set<Id>()
  const recursos = new Set<Id>()
  anotarCatalogosDe(documento, opciones, recursos)
  for (const avance of documento.avances) {
    if (avance.snapshotPrevio !== undefined) {
      anotarCatalogosDe(avance.snapshotPrevio, opciones, recursos)
    }
  }
  return {
    opciones: [...opciones].sort(compararTexto),
    recursos: [...recursos].sort(compararTexto),
  }
}

/** Una opción tal como viaja en la copia: sin `borrada` ni `protegida` (§6.1, decisión 7). */
function opcionEnCopia(opcion: OpcionCatalogo): OpcionEnCopia {
  switch (opcion.lista) {
    case 'categorias':
      return { id: opcion.id, nombre: opcion.nombre, propia: opcion.propia, lista: 'categorias', grupo: opcion.grupo }
    case 'oficios':
      return {
        id: opcion.id,
        nombre: opcion.nombre,
        propia: opcion.propia,
        lista: 'oficios',
        grupo: opcion.grupo,
        plural: opcion.plural,
      }
    case 'tiposEdificio':
      return { id: opcion.id, nombre: opcion.nombre, propia: opcion.propia, lista: 'tiposEdificio', grupo: opcion.grupo }
    case 'tiposUnidad':
      return { id: opcion.id, nombre: opcion.nombre, propia: opcion.propia, lista: 'tiposUnidad', grupo: opcion.grupo }
    case 'tiposDefensa':
      return { id: opcion.id, nombre: opcion.nombre, propia: opcion.propia, lista: 'tiposDefensa' }
    case 'tiposAnimal':
      return { id: opcion.id, nombre: opcion.nombre, propia: opcion.propia, lista: 'tiposAnimal', grupo: opcion.grupo }
  }
}

/** Un recurso tal como viaja en la copia: sin `borrada` ni `protegido` (§6.1). */
function recursoEnCopia(recurso: RecursoCatalogo): RecursoEnCopia {
  return {
    id: recurso.id,
    nombre: recurso.nombre,
    unidadSingular: recurso.unidadSingular,
    unidadPlural: recurso.unidadPlural,
    propia: recurso.propia,
  }
}

/** Arma el sobre con el documento y solo las opciones y recursos que usan sus registros (§6.1). */
export function armarCopia(documento: DocumentoPartida, catalogo: CatalogoApp, exportadaEl: Instante): SobreCopia {
  const usados = catalogosUsados(documento)
  const opcionesUsadas = new Set(usados.opciones)
  const recursosUsados = new Set(usados.recursos)
  const opciones = catalogo.opciones
    .filter((opcion) => opcionesUsadas.has(opcion.id))
    .map(opcionEnCopia)
    .sort((a, b) => compararTexto(a.lista, b.lista) || compararTexto(a.id, b.id))
  const recursos = catalogo.recursos
    .filter((recurso) => recursosUsados.has(recurso.id))
    .map(recursoEnCopia)
    .sort((a, b) => compararTexto(a.id, b.id))
  return {
    app: MARCA_COPIA,
    versionFormato: VERSION_FORMATO,
    exportadaEl,
    partida: documento,
    catalogos: { opciones, recursos },
  }
}

/** Una colección ordenada por una clave de texto, sin tocar la original. */
function ordenarPor<T>(lista: readonly T[], clave: (registro: T) => string): T[] {
  return [...lista].sort((a, b) => compararTexto(clave(a), clave(b)))
}

/** El estado con las claves de EsquemaEstadoPartida en su orden y cada colección ordenada por su clave (§3.4). */
function ordenarEstado(estado: EstadoPartida): EstadoPartida {
  return {
    partida: estado.partida,
    dominios: ordenarPor(estado.dominios, (dominio) => dominio.id),
    cajas: ordenarPor(estado.cajas, (caja) => caja.dominioId),
    movimientos: ordenarPor(estado.movimientos, (movimiento) => movimiento.id),
    transferencias: ordenarPor(estado.transferencias, (transferencia) => transferencia.id),
    deudas: ordenarPor(estado.deudas, (deuda) => deuda.id),
    recurrentes: ordenarPor(estado.recurrentes, (recurrente) => recurrente.id),
    objetos: ordenarPor(estado.objetos, (objeto) => objeto.id),
    ventas: ordenarPor(estado.ventas, (venta) => venta.id),
    inversiones: ordenarPor(estado.inversiones, (inversion) => inversion.id),
    hechizos: ordenarPor(estado.hechizos, (hechizo) => hechizo.id),
    intentos: ordenarPor(estado.intentos, (intento) => intento.id),
    pergaminos: ordenarPor(estado.pergaminos, (pergamino) => pergamino.id),
    poblaciones: ordenarPor(estado.poblaciones, (poblacion) => poblacion.dominioId),
    existencias: [...estado.existencias].sort(
      (a, b) => compararTexto(a.dominioId, b.dominioId) || compararTexto(a.recursoId, b.recursoId),
    ),
    ajustesExistencias: ordenarPor(estado.ajustesExistencias, (ajuste) => ajuste.id),
    entradasAlmacen: ordenarPor(estado.entradasAlmacen, (entrada) => entrada.id),
    edificios: ordenarPor(estado.edificios, (edificio) => edificio.id),
    produccionesRealizadas: ordenarPor(estado.produccionesRealizadas, (produccion) => produccion.id),
    trabajadores: ordenarPor(estado.trabajadores, (trabajador) => trabajador.id),
    obras: ordenarPor(estado.obras, (obra) => obra.id),
    impuestosRentas: ordenarPor(estado.impuestosRentas, (impuesto) => impuesto.id),
    tiposLocal: ordenarPor(estado.tiposLocal, (tipo) => tipo.id),
    localesComerciales: ordenarPor(estado.localesComerciales, (local) => local.id),
    mercados: ordenarPor(estado.mercados, (mercado) => mercado.id),
    rutas: [...estado.rutas].sort(
      (a, b) =>
        compararTexto(a.origenId, b.origenId) ||
        compararTexto(a.destino.tipo, b.destino.tipo) ||
        compararTexto(a.destino.id, b.destino.id),
    ),
    caravanas: ordenarPor(estado.caravanas, (caravana) => caravana.id),
    unidadesGuarnicion: ordenarPor(estado.unidadesGuarnicion, (unidad) => unidad.id),
    defensas: ordenarPor(estado.defensas, (defensa) => defensa.id),
    animales: ordenarPor(estado.animales, (animal) => animal.id),
    armeria: ordenarPor(estado.armeria, (objeto) => objeto.id),
    eventos: ordenarPor(estado.eventos, (evento) => evento.id),
    ubicaciones: ordenarPor(estado.ubicaciones, (ubicacion) => ubicacion.id),
    personas: ordenarPor(estado.personas, (persona) => persona.id),
  }
}

/** El documento en orden canónico, con `avances` al final y el snapshotPrevio ordenado como un estado más (§3.4). */
function ordenarDocumento(documento: DocumentoPartida): DocumentoPartida {
  const avances = [...documento.avances]
    .sort((a, b) => compararTexto(a.aplicadoEl, b.aplicadoEl) || compararTexto(a.id, b.id))
    .map((avance) =>
      avance.snapshotPrevio === undefined
        ? avance
        : { ...avance, snapshotPrevio: ordenarEstado(avance.snapshotPrevio) },
    )
  return { ...ordenarEstado(documento), avances }
}

/** Texto JSON del sobre, con las claves en orden fijo: dos exportaciones del mismo estado dan el mismo archivo. */
export function serializarCopia(sobre: SobreCopia): string {
  const canonico: SobreCopia = {
    app: sobre.app,
    versionFormato: sobre.versionFormato,
    exportadaEl: sobre.exportadaEl,
    partida: ordenarDocumento(sobre.partida),
    catalogos: {
      opciones: [...sobre.catalogos.opciones].sort(
        (a, b) => compararTexto(a.lista, b.lista) || compararTexto(a.id, b.id),
      ),
      recursos: ordenarPor(sobre.catalogos.recursos, (recurso) => recurso.id),
    },
  }
  return JSON.stringify(canonico)
}

/** Marcas diacríticas que la descomposición NFD separa de su letra (de U+0300 a U+036F). */
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g

/** Cada tramo que no es letra sin tilde ni cifra: se convierte en un guion. */
const TRAMOS_NO_ALFANUMERICOS = /[^a-z0-9]+/g

/** Guiones sobrantes al principio y al final del nombre del archivo. */
const GUIONES_DE_LOS_EXTREMOS = /^-+|-+$/g

/** Nombre del archivo: «gestion-aldeas-la-sombra-del-este-2026-09-17.json». */
export function nombreDeArchivo(partida: Partida, exportadaEl: Instante): string {
  const cuerpo = partida.nombre
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .toLowerCase()
    .replace(TRAMOS_NO_ALFANUMERICOS, '-')
    .replace(GUIONES_DE_LOS_EXTREMOS, '')
  // Un nombre que solo tenga signos deja el cuerpo vacío: el archivo se llama «partida».
  return `gestion-aldeas-${cuerpo === '' ? 'partida' : cuerpo}-${exportadaEl.slice(0, 10)}.json`
}
