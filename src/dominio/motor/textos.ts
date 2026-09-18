import { formatearMeses } from '../calendario/formatoFecha'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { AnioMes, Id } from '../modelo/comunes'
import type { Dominio } from '../modelo/dominios'
import { esNombreReservado } from '../texto/normalizar'
import type { QuePago } from './tipos'

/** Largo máximo del concepto de un movimiento (EsquemaConcepto). */
const MAXIMO_CONCEPTO = 120

/** Largo máximo del texto de un aviso o de un hecho (EsquemaAvisoAvance y EsquemaCambioAvance). */
const MAXIMO_TEXTO = 200

/** Largo máximo y mínimo del nombre de una persona o entidad (EsquemaNombreLargo). */
const MAXIMO_NOMBRE = 60
const MINIMO_NOMBRE = 2

/** Cómo nombra cada pago un aviso «Pago no cubierto», salvo los que van por su concepto (§9 l.1354, D-025). */
const QUE_SE_PAGA: Readonly<Record<Exclude<QuePago['clase'], 'concepto'>, string>> = {
  tributo: 'el tributo',
  salarios: 'los salarios',
  soldadas: 'la soldada',
}

/** Corta un texto a `maximo` caracteres con «…» al final (T26). */
export function ajustarTexto(texto: string, maximo: number): string {
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo - 1)}…`
}

/** Pega un sufijo que nunca se corta: si no cabe, se corta lo de delante con «…» (T26). */
function conSufijo(texto: string, sufijo: string, maximo: number): string {
  return `${ajustarTexto(texto, maximo - sufijo.length)}${sufijo}`
}

/** «7 noches», «1 noche», «1 día»: con 1, la unidad pierde la «s» final (D-030). */
function cuenta(numero: number, unidad: string): string {
  return numero === 1 && unidad.endsWith('s') ? `1 ${unidad.slice(0, -1)}` : `${numero} ${unidad}`
}

/** « · 7 días» detrás de un pago agrupado diario, o nada si no es diario (D-029). */
function sufijoDeDias(dias?: number): string {
  return dias === undefined ? '' : ` · ${cuenta(dias, 'días')}`
}

/** «Posada El Poney Pisador · 7 noches», «Peaje del camino · 1 día»; corta el concepto, nunca el sufijo (§9 l.1285, D-030). */
export function conceptoDiario(concepto: string, dias: number, unidadDiaria?: string): string {
  return conSufijo(concepto, ` · ${cuenta(dias, unidadDiaria ?? 'días')}`, MAXIMO_CONCEPTO)
}

/** «Salarios de 14 trabajadores», «Salarios de 1 trabajador»; con días: «… · 7 días» (§9 l.1287, D-029, D-031). */
export function conceptoSalarios(trabajadores: number, dias?: number): string {
  const quienes = trabajadores === 1 ? '1 trabajador' : `${trabajadores} trabajadores`
  return `Salarios de ${quienes}${sufijoDeDias(dias)}`
}

/** «Soldada de la guarnición»; con días: «Soldada de la guarnición · 7 días» (gen l.986, D-031). */
export function conceptoSoldadas(dias?: number): string {
  return `Soldada de la guarnición${sufijoDeDias(dias)}`
}

/** «Impuestos de locales · abril (4)», «… · marzo y abril (4)» (§9 l.1288, D-031). */
export function conceptoLocales(meses: readonly AnioMes[], locales: number): string {
  return conSufijo(`Impuestos de locales · ${formatearMeses(meses)}`, ` (${locales})`, MAXIMO_CONCEPTO)
}

/** «Beneficio de Barcaza del Brandivino» (como «Beneficio de El Tonel Dorado» del ejemplo). */
export function conceptoBeneficio(negocio: string): string {
  return ajustarTexto(`Beneficio de ${negocio}`, MAXIMO_CONCEPTO)
}

/** «Caravana: venta de cerveza en Fornost», con el recurso en minúscula inicial (D-031, T27). */
export function conceptoVentaCaravana(recurso: string, mercado: string): string {
  const carga = `${recurso.charAt(0).toLowerCase()}${recurso.slice(1)}`
  return ajustarTexto(`Caravana: venta de ${carga} en ${mercado}`, MAXIMO_CONCEPTO)
}

/**
 * El oficio en singular con 1 y en plural con más; «Trabajador(es)» si no está en el catálogo (§6.3 l.579, T28).
 * El catálogo es pequeño y no crece con la partida: buscar en él no depende del tamaño del estado.
 */
export function nombreDeOficio(catalogo: CatalogosEnCopia, oficioId: Id, numero: number): string {
  const oficio = catalogo.opciones.find((o) => o.id === oficioId)
  if (oficio === undefined || oficio.lista !== 'oficios') {
    return numero === 1 ? 'Trabajador' : 'Trabajadores'
  }
  return numero === 1 ? oficio.nombre : oficio.plural
}

/** El nombre de un recurso del catálogo; «mercancía» si no está (T28). */
export function nombreDeRecurso(catalogo: CatalogosEnCopia, recursoId: Id): string {
  return catalogo.recursos.find((r) => r.id === recursoId)?.nombre ?? 'mercancía'
}

/** «Trabajadores de Bree» (§9 l.1294). */
export function contraparteDeSalarios(asentamiento: string): string {
  return `Trabajadores de ${asentamiento}`
}

/** «Guarnición de Bree» (§9 l.1294). */
export function contraparteDeSoldadas(asentamiento: string): string {
  return `Guarnición de ${asentamiento}`
}

/** Deja el nombre válido para Personas y entidades: ≤ 60 con «…» y « (impago)» si queda corto o reservado (D-023). */
export function nombreDeContraparte(nombre: string): string {
  const cabe = ajustarTexto(nombre, MAXIMO_NOMBRE)
  return cabe.length < MINIMO_NOMBRE || esNombreReservado(cabe) ? `${cabe} (impago)` : cabe
}

/** «Tributo de Archet pagado · 19» (P5, gen l.586; D-032). Con los nombres de 60 como mucho, cabe en 200. */
export function hechoTributoPagado(asentamiento: string, dia: string): string {
  return `Tributo de ${asentamiento} pagado · ${dia}`
}

/** «Impuestos de locales de Bree cobrados · 1» (D-032). Con los nombres de 60 como mucho, cabe en 200. */
export function hechoLocalesCobrados(asentamiento: string, dia: string): string {
  return `Impuestos de locales de ${asentamiento} cobrados · ${dia}`
}

/** «Caravana de Fornost de vuelta · 18» (P5, gen l.585; D-032). Con los nombres de 60 como mucho, cabe en 200. */
export function hechoCaravanaDeVuelta(mercado: string, dia: string): string {
  return `Caravana de ${mercado} de vuelta · ${dia}`
}

/** «La bolsa de Tharan» o «La caja de Bree»: la bolsa es la del personaje (§6.4 l.808). */
export function laCajaDe(dominio: Dominio): string {
  return dominio.tipo === 'personaje' ? `La bolsa de ${dominio.nombre}` : `La caja de ${dominio.nombre}`
}

/** «La bolsa de Tharan está en negativo: −3,482 mo» (§6.4 l.808). */
export function avisoSaldoNegativo(dominio: Dominio, saldo: string): string {
  return `${laCajaDe(dominio)} está en negativo: ${saldo}`
}

/** «La caja de Bree no pudo pagar a Trabajadores de Bree: 1,2 mo pendientes» (D-024). Cabe en 200. */
export function avisoImpago(dominio: Dominio, contraparte: string, pendiente: string): string {
  return `${laCajaDe(dominio)} no pudo pagar a ${contraparte}: ${pendiente} pendientes`
}

/** «La caja de Archet no cubre el tributo de 60 mo del 19 de julio» (§9 l.1354, D-025); corta el concepto a 200 (T26). */
export function avisoPagoNoCubierto(dominio: Dominio, que: QuePago, importe: string, fecha: string): string {
  const antes = `${laCajaDe(dominio)} no cubre `
  const despues = ` de ${importe} del ${fecha}`
  if (que.clase !== 'concepto') {
    return `${antes}${QUE_SE_PAGA[que.clase]}${despues}`
  }
  const hueco = MAXIMO_TEXTO - antes.length - despues.length - '«»'.length
  return `${antes}«${ajustarTexto(que.concepto, hueco)}»${despues}`
}
