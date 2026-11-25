import { cantidadDeRecurso, esUnaUnidad, formatearCantidad } from '../almacen/cantidades'
import { enumerar, formatearMeses } from '../calendario/formatoFecha'
import { RECURSO } from '../catalogo/inicial'
import type { CatalogosEnCopia, RecursoEnCopia } from '../modelo/catalogos'
import type { Caravana } from '../modelo/comercio'
import type { AnioMes, Id, RecurrenciaProduccion } from '../modelo/comunes'
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

/** «Oro en bruto» → «oro en bruto» (la usa también conceptoVentaCaravana, T27). */
export function minusculaInicial(texto: string): string {
  return texto.length === 0 ? texto : `${texto.charAt(0).toLowerCase()}${texto.slice(1)}`
}

/** «Caravana: venta de cerveza en Fornost», con el recurso en minúscula inicial (D-031, T27). */
export function conceptoVentaCaravana(recurso: string, mercado: string): string {
  return ajustarTexto(`Caravana: venta de ${minusculaInicial(recurso)} en ${mercado}`, MAXIMO_CONCEPTO)
}

/** «Obra: nuevo granero», con el nombre de la obra en minúscula inicial (D-066). */
export function conceptoObra(obra: string): string {
  return ajustarTexto(`Obra: ${minusculaInicial(obra)}`, MAXIMO_CONCEPTO)
}

/** «Caravana: compra de víveres en Tharbad», con el recurso en minúscula inicial (D-066). */
export function conceptoCompraCaravana(recurso: string, mercado: string): string {
  return ajustarTexto(`Caravana: compra de ${minusculaInicial(recurso)} en ${mercado}`, MAXIMO_CONCEPTO)
}

/** «Compra de víveres en Bree», con el recurso en minúscula inicial (D-066). */
export function conceptoCompraAlmacen(recurso: string, mercado: string): string {
  return ajustarTexto(`Compra de ${minusculaInicial(recurso)} en ${mercado}`, MAXIMO_CONCEPTO)
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

/** El recurso del catálogo; si no está: { id, nombre: 'mercancía', unidadSingular: 'unidad', unidadPlural: 'unidades' }. */
export function recursoDelCatalogo(catalogo: CatalogosEnCopia, recursoId: Id): RecursoEnCopia {
  const recurso = catalogo.recursos.find((r) => r.id === recursoId)
  if (recurso !== undefined) {
    return recurso
  }
  return { id: recursoId, nombre: 'mercancía', unidadSingular: 'unidad', unidadPlural: 'unidades', propia: false }
}

/** «cada día», «cada 3 días», «semanal», «cada dos semanas», «mensual», «cada 2 meses», «trimestral», «anual» (D-067). */
export function nombreDeFrecuencia(r: RecurrenciaProduccion): string {
  switch (r.tipo) {
    case 'diaria':
      return 'cada día'
    case 'cadaNDias':
      return `cada ${r.n} días`
    case 'semanal':
      return 'semanal'
    case 'quincenal':
      return 'cada dos semanas'
    case 'mensual':
      return 'mensual'
    case 'cadaNMeses':
      return `cada ${r.n} meses`
    case 'trimestral':
      return 'trimestral'
    case 'anual':
      return 'anual'
  }
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

/** «Obra «Reparación de la puerta del sur» terminada · 17» (D-052). */
export function hechoObraTerminada(obra: string, dia: string): string {
  return ajustarTexto(`Obra «${obra}» terminada · ${dia}`, MAXIMO_TEXTO)
}

/** «Feria de primavera · 15 al 17» (D-052); `dias` ya llega escrito (formatearTramoDelAvance). */
export function hechoEventoTerminado(evento: string, dias: string): string {
  return ajustarTexto(`${evento} · ${dias}`, MAXIMO_TEXTO)
}

/** «Caravana de Bree llegada a Archet · 25» (D-052). */
export function hechoTrasladoLlegado(origen: string, destino: string, dia: string): string {
  return ajustarTexto(`Caravana de ${origen} llegada a ${destino} · ${dia}`, MAXIMO_TEXTO)
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

/** Una caravana que llega después de que empiece la falta: se añade « y la caravana de X …» (D-051). */
export interface CaravanaQueTarda {
  de: string
  operacion: 'compra' | 'traslado'
  fecha: string
}

/** «Los víveres de Bree se agotan el 23 de abril», con la caravana que tarda si la hay (D-051). */
export function avisoFaltaPrevista(
  asentamiento: string,
  recurso: RecursoEnCopia,
  fecha: string,
  caravana?: CaravanaQueTarda,
): string {
  const base =
    recurso.id === RECURSO.viveres
      ? `Los víveres de ${asentamiento} se agotan el ${fecha}`
      : `${asentamiento} se queda sin ${minusculaInicial(recurso.nombre)} el ${fecha}`
  if (caravana === undefined) {
    return ajustarTexto(base, MAXIMO_TEXTO)
  }
  const verbo = caravana.operacion === 'compra' ? 'no vuelve hasta' : 'no llega hasta'
  return ajustarTexto(`${base} y la caravana de ${caravana.de} ${verbo} el ${caravana.fecha}`, MAXIMO_TEXTO)
}

/** «Los víveres de Bree se agotaron el 23 de abril: faltaron 2.217 sacos» (D-051). */
export function avisoFaltaOcurrida(asentamiento: string, recurso: RecursoEnCopia, fecha: string, faltaron: number): string {
  const cantidad = formatearCantidad(faltaron, recurso)
  const verbo = esUnaUnidad(cantidad) ? 'faltó' : 'faltaron'
  const base =
    recurso.id === RECURSO.viveres
      ? `Los víveres de ${asentamiento} se agotaron el ${fecha}`
      : `${asentamiento} se quedó sin ${minusculaInicial(recurso.nombre)} el ${fecha}`
  return ajustarTexto(`${base}: ${verbo} ${cantidad}`, MAXIMO_TEXTO)
}

/** «Se perderán 7 fardos de lana en Bree el 19 de mayo» (D-051; §7 l.1107). */
export function avisoPerdidaPrevista(asentamiento: string, recurso: RecursoEnCopia, cantidad: number, fecha: string): string {
  const texto = cantidadDeRecurso(cantidad, recurso)
  const verbo = esUnaUnidad(texto) ? 'Se perderá' : 'Se perderán'
  return ajustarTexto(`${verbo} ${texto} en ${asentamiento} el ${fecha}`, MAXIMO_TEXTO)
}

/** «Se perdieron 103 fardos de lana en Bree desde el 19 de mayo» («el 14 de julio» si fue un solo día, D-051). */
export function avisoPerdidaOcurrida(
  asentamiento: string,
  recurso: RecursoEnCopia,
  cantidad: number,
  fecha: string,
  variosDias: boolean,
): string {
  const texto = cantidadDeRecurso(cantidad, recurso)
  const verbo = esUnaUnidad(texto) ? 'Se perdió' : 'Se perdieron'
  const cuando = variosDias ? `desde el ${fecha}` : `el ${fecha}`
  return ajustarTexto(`${verbo} ${texto} en ${asentamiento} ${cuando}`, MAXIMO_TEXTO)
}

/** «La obra «Horno comunal» no pudo empezar por falta de 20 carretadas de cal y 12 mo en la caja» (D-047, D-051). */
export function avisoObraQueNoPudoEmpezar(obra: string, faltas: readonly string[]): string {
  const base = `La obra «${obra}» no pudo empezar`
  return ajustarTexto(faltas.length === 0 ? base : `${base} por falta de ${enumerar(faltas)}`, MAXIMO_TEXTO)
}

/** «La caravana de compra a Fornost no pudo salir por falta de 12 mo en la caja» (D-051). */
export function avisoCaravanaQueNoPudoSalir(
  operacion: Caravana['operacion'],
  destino: string,
  faltas: readonly string[],
): string {
  const base = `La caravana de ${operacion} a ${destino} no pudo salir`
  return ajustarTexto(faltas.length === 0 ? base : `${base} por falta de ${enumerar(faltas)}`, MAXIMO_TEXTO)
}

/** «La compra de víveres en Bree no pudo hacerse por falta de 12 mo en la caja» (D-051). */
export function avisoCompraQueNoPudoHacerse(recurso: string, mercado: string, faltas: readonly string[]): string {
  const base = `La compra de ${minusculaInicial(recurso)} en ${mercado} no pudo hacerse`
  return ajustarTexto(faltas.length === 0 ? base : `${base} por falta de ${enumerar(faltas)}`, MAXIMO_TEXTO)
}

/** «Horno comunal está terminado: anota su producción y sus trabajadores» (§7 l.1145). */
export function avisoEdificioTerminado(edificio: string): string {
  return ajustarTexto(`${edificio} está terminado: anota su producción y sus trabajadores`, MAXIMO_TEXTO)
}

/** «La mejora de Cantera está terminada: anota su producción» (§7 l.1146). */
export function avisoMejoraTerminada(edificio: string): string {
  return ajustarTexto(`La mejora de ${edificio} está terminada: anota su producción`, MAXIMO_TEXTO)
}

/** Lo que falta de dinero en una falta de obra, caravana o compra: «12 mo en la caja». */
export function faltaDeDinero(importe: string): string {
  return `${importe} en la caja`
}

/** «Faltan 20 carretadas de cal», «Falta 1 lingote de hierro», «Faltan 20 carretadas de cal y 5 haces de madera» (D-067). */
export function textoFaltan(faltas: readonly { cantidad: number; recurso: RecursoEnCopia }[]): string {
  const partes = faltas.map((f) => cantidadDeRecurso(f.cantidad, f.recurso))
  const verbo = faltas.length === 1 && esUnaUnidad(partes[0]) ? 'Falta' : 'Faltan'
  return `${verbo} ${enumerar(partes)}`
}

/** «Venció la deuda con Hobart: 4 mo pendientes»; si te deben, «Dalen no ha devuelto 15 mo» (esp l.1163). */
export function avisoDeudaVencida(sentido: 'debo' | 'meDeben', contraparte: string, pendiente: string): string {
  const texto =
    sentido === 'debo'
      ? `Venció la deuda con ${contraparte}: ${pendiente} pendientes`
      : `${contraparte} no ha devuelto ${pendiente}`
  return ajustarTexto(texto, MAXIMO_TEXTO)
}

/**
 * «La deuda de 4 mo con Hobart vence el 20 de abril» y, el día antes, «Mañana vence la deuda de 4 mo con Hobart»
 * (esp l.1163, l.1354). Un préstamo que te deben se nombra como préstamo (D-100).
 */
export function avisoDeudaQueVence(
  sentido: 'debo' | 'meDeben',
  contraparte: string,
  pendiente: string,
  fecha: string,
  manana: boolean,
): string {
  const que =
    sentido === 'debo'
      ? `la deuda de ${pendiente} con ${contraparte}`
      : `el préstamo de ${pendiente} a ${contraparte}`
  const texto = manana ? `Mañana vence ${que}` : `${que[0].toUpperCase()}${que.slice(1)} vence el ${fecha}`
  return ajustarTexto(texto, MAXIMO_TEXTO)
}

/**
 * Concepto del movimiento del alta de una deuda: «Préstamo del Gremio de mercaderes de Bree» cuando el dinero
 * entra y «Préstamo a Dalen» cuando sale. Con notas, manda la nota (D-101).
 */
export function conceptoAltaDeuda(sentido: 'debo' | 'meDeben', contraparte: string, notas?: string): string {
  const texto = notas ?? (sentido === 'debo' ? `Préstamo de ${contraparte}` : `Préstamo a ${contraparte}`)
  return ajustarTexto(texto, MAXIMO_CONCEPTO)
}

/** Concepto del movimiento de un pago o un cobro de deuda: «Pago de la deuda con Hobart» (D-101). */
export function conceptoPagoDeuda(sentido: 'debo' | 'meDeben', contraparte: string): string {
  const texto =
    sentido === 'debo' ? `Pago de la deuda con ${contraparte}` : `Cobro del préstamo a ${contraparte}`
  return ajustarTexto(texto, MAXIMO_CONCEPTO)
}

/** Concepto del cobro de una venta: «Venta de Cota de malla», «Venta de 2 × Esmeralda tallada» (D-102). */
export function conceptoVenta(nombre: string, cantidad: number): string {
  const texto = cantidad === 1 ? `Venta de ${nombre}` : `Venta de ${cantidad} × ${nombre}`
  return ajustarTexto(texto, MAXIMO_CONCEPTO)
}
