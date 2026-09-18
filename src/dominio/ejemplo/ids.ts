import type { Id } from '../modelo/comunes'

/** Id de la partida de ejemplo (decisión 8: ids legibles y permanentes). */
export const PARTIDA_ID: Id = 'p.sombra-del-este'

/** Los tres dominios: el personaje y los dos asentamientos (§8). */
export const DOM = {
  tharan: 'dom.tharan',
  bree: 'dom.bree',
  archet: 'dom.archet',
} as const

/** Las seis personas y entidades de la partida (§6.5 n.º 15). */
export const PERSONA = {
  gremioBree: 'persona.gremio-de-mercaderes-de-bree',
  hobart: 'persona.hobart-brezal',
  dalen: 'persona.dalen-de-esgaroth',
  joyeroBree: 'persona.joyero-de-bree',
  corona: 'persona.corona-de-arthedain',
  barnabas: 'persona.barnabas-mantecona',
} as const

/** Las dos ubicaciones propias de la partida (§6.5 n.º 14). */
export const UBICACION = {
  posada: 'ubi.posada-el-poney-pisador',
  establoDeBree: 'ubi.establo-de-bree',
} as const

/** Los cuatro avances del ejemplo, nombrados por su fecha de fin (decisión 5). */
export const AVANCE = {
  hasta31Marzo: 'av.hasta-31-marzo',
  hasta6Abril: 'av.hasta-6-abril',
  hasta10Abril: 'av.hasta-10-abril',
  hasta12Abril: 'av.hasta-12-abril',
} as const

/** Los movimientos del libro de Tharan (§6.2, J2). */
export const MOV_THARAN = {
  pagoGremio1: 'mov.tharan.pago-gremio-1',
  compraPergamino: 'mov.tharan.compra-pergamino',
  pagoGremio2: 'mov.tharan.pago-gremio-2',
  beneficioTonel: 'mov.tharan.beneficio-tonel-1-abril',
  posada6Abril: 'mov.tharan.posada-6-abril',
  establo6Abril: 'mov.tharan.establo-6-abril',
  transferencia: 'mov.tharan.transferencia-desde-bree',
  posada10Abril: 'mov.tharan.posada-10-abril',
  establo10Abril: 'mov.tharan.establo-10-abril',
  recompensa: 'mov.tharan.recompensa',
  athelas: 'mov.tharan.athelas',
  posada12Abril: 'mov.tharan.posada-12-abril',
  establo12Abril: 'mov.tharan.establo-12-abril',
} as const

/** Los movimientos de la tesorería de Bree (§6.3, A2). */
export const MOV_BREE = {
  adelantoGranero: 'mov.bree.adelanto-granero',
  impuestoHogar: 'mov.bree.impuesto-por-hogar-1-abril',
  locales: 'mov.bree.locales-1-abril',
  aranceles1Abril: 'mov.bree.aranceles-1-abril',
  caravanaTharbad: 'mov.bree.caravana-tharbad',
  peaje6Abril: 'mov.bree.peaje-6-abril',
  salarios6Abril: 'mov.bree.salarios-6-abril',
  transferencia: 'mov.bree.transferencia-a-tharan',
  obraPuerta: 'mov.bree.obra-puerta',
  aranceles8Abril: 'mov.bree.aranceles-8-abril',
  soldadas10Abril: 'mov.bree.soldadas-10-abril',
  alquilerMolino: 'mov.bree.alquiler-molino-10-abril',
  obraGranero: 'mov.bree.obra-granero',
  peaje10Abril: 'mov.bree.peaje-10-abril',
  peaje12Abril: 'mov.bree.peaje-12-abril',
} as const

/** El único movimiento de la caja de Archet (§6.3). */
export const MOV_ARCHET = {
  obraMolino: 'mov.archet.obra-molino',
} as const

/** La transferencia de Bree a Tharan del 6 de abril (§6.2). */
export const TRANSFERENCIA = {
  breeATharan: 'tr.bree-tharan-6-abril',
} as const

/** Las cuatro deudas de la partida y los dos pagos anotados (§6.2 J4, §6.3 A2b). */
export const DEUDA = {
  gremioTharan: 'deuda.gremio-tharan',
  hobart: 'deuda.hobart',
  dalen: 'deuda.dalen',
  gremioBree: 'deuda.gremio-bree',
} as const

/** Los dos pagos anotados en la deuda del Gremio (§6.2, J4b). */
export const PAGO = {
  gremio1: 'pago.gremio-15-marzo',
  gremio2: 'pago.gremio-25-marzo',
} as const

/** Los gastos e ingresos recurrentes de Tharan (§6.2, J5). */
export const RECURRENTE = {
  posada: 'rec.posada-el-poney-pisador',
  establo: 'rec.establo-del-poni',
  escolta: 'rec.escolta-de-dos-guardias',
  alquilerCasaArchet: 'rec.alquiler-de-la-casa-de-archet',
} as const

/** Los siete objetos del inventario de Tharan, uno de ellos archivado (§6.2, J3). */
export const OBJETO = {
  espada: 'obj.espada-larga-dunadan',
  cota: 'obj.cota-de-malla',
  esmeraldas: 'obj.esmeralda-tallada',
  athelas: 'obj.athelas',
  pergaminoLuz: 'obj.pergamino-luz-de-elbereth',
  poni: 'obj.poni-castano',
  pergaminoPaso: 'obj.pergamino-paso-sin-rastro',
} as const

/** Las dos inversiones activas de Tharan (§6.2, J6). */
export const INVERSION = {
  tonelDorado: 'inv.el-tonel-dorado',
  barcaza: 'inv.barcaza-del-brandivino',
} as const

/** Los tres hechizos de Tharan (§6.2, J7). */
export const HECHIZO = {
  pasoSinRastro: 'hech.paso-sin-rastro',
  luzDeElbereth: 'hech.luz-de-elbereth',
  hablarConLosAnimales: 'hech.hablar-con-los-animales',
} as const

/** Los cinco intentos de aprendizaje (§6.2, J7). */
export const INTENTO = {
  hablar20Enero: 'int.hablar-20-enero',
  hablar3Febrero: 'int.hablar-3-febrero',
  luz25Marzo: 'int.luz-25-marzo',
  paso28Marzo: 'int.paso-28-marzo',
  paso10Abril: 'int.paso-10-abril',
} as const

/** Los dos pergaminos (§6.2, J7). */
export const PERGAMINO = {
  luzDeElbereth: 'perg.luz-de-elbereth',
  pasoSinRastro: 'perg.paso-sin-rastro',
} as const

/** Los cambios de población y los consumos por habitante de Bree (§6.3, A4). */
export const CAMBIO_POBLACION = {
  fiebres: 'camb.bree.fiebres-de-invierno',
  hobbits: 'camb.bree.hobbits-de-la-comarca',
  cardolan: 'camb.bree.familias-de-cardolan',
} as const

/** Los dos consumos por habitante de Bree (§6.3, A4). */
export const CONSUMO = {
  cerveza: 'cons.bree.cerveza',
  lena: 'cons.bree.lena',
} as const

/** El único ajuste de existencias del ejemplo (§6.3, A8). */
export const AJUSTE_EXISTENCIAS = {
  maderaPodrida: 'aj.bree.madera-2-abril',
} as const

/** Los seis edificios de Bree (§6.3, A7). */
export const EDIFICIO = {
  granjas: 'ed.granjas-del-oeste',
  aserradero: 'ed.aserradero',
  cerveceria: 'ed.cerveceria',
  cantera: 'ed.cantera',
  redil: 'ed.redil',
  molino: 'ed.molino',
} as const

/** Las seis producciones de esos edificios (§6.3, A7b). */
export const PRODUCCION = {
  granjasViveres: 'prod.granjas-viveres',
  aserraderoMadera: 'prod.aserradero-madera',
  cerveceriaCerveza: 'prod.cerveceria-cerveza',
  canteraPiedra: 'prod.cantera-piedra',
  canteraArcilla: 'prod.cantera-arcilla',
  redilLana: 'prod.redil-lana',
} as const

/** Las seis producciones ya ocurridas que dejó el motor (decisión 1). */
export const PRODUCCION_REALIZADA = {
  arcilla1Abril: 'pr.arcilla-1-abril',
  viveres7Abril: 'pr.viveres-7-abril',
  madera7Abril: 'pr.madera-7-abril',
  cerveza7Abril: 'pr.cerveza-7-abril',
  piedra7Abril: 'pr.piedra-7-abril',
  lana7Abril: 'pr.lana-7-abril',
} as const

/** Las filas de trabajadores de Bree y de Archet (§6.3, A5). */
export const TRABAJADOR = {
  granjeros: 'trab.bree.granjeros',
  lenadores: 'trab.bree.lenadores',
  cerveceros: 'trab.bree.cerveceros',
  canteros: 'trab.bree.canteros',
  pastores: 'trab.bree.pastores',
  albanilesArchet: 'trab.archet.albaniles',
} as const

/** Las obras de los dos asentamientos (§6.3, A9). */
export const OBRA = {
  puerta: 'obra.reparacion-de-la-puerta-del-sur',
  granero: 'obra.nuevo-granero',
  cerveceria: 'obra.ampliar-la-cerveceria',
  molinoArchet: 'obra.molino-de-archet',
} as const

/** Los impuestos, rentas y tributos de los dos asentamientos (§6.3, A3). */
export const IMPUESTO = {
  hogar: 'imp.bree.impuesto-por-hogar',
  aranceles: 'imp.bree.aranceles-del-mercado',
  alquilerMolino: 'imp.bree.alquiler-del-molino',
  peaje: 'imp.bree.peaje-del-camino',
  diezmo: 'imp.bree.diezmo-a-fornost',
  tributoArchet: 'imp.archet.tributo-a-la-corona',
  rentasArchet: 'imp.archet.rentas-de-las-tierras',
} as const

/** Los tres tipos de local de Bree (§6.3, A3b). */
export const TIPO_LOCAL = {
  herreria: 'tipoloc.bree.herreria',
  posada: 'tipoloc.bree.posada',
  tienda: 'tipoloc.bree.tienda',
} as const

/** Los cuatro locales comerciales de Bree (§6.3, A3b). */
export const LOCAL = {
  herreria1: 'loc.bree.herreria-1',
  posada: 'loc.bree.posada-el-poney-pisador',
  tiendaDeTelas: 'loc.bree.tienda-de-telas',
  ultramarinos: 'loc.bree.ultramarinos-del-camino',
} as const

/** Los cuatro mercados de la partida (§6.3, A10). */
export const MERCADO = {
  bree: 'mer.bree',
  archet: 'mer.archet',
  fornost: 'mer.fornost',
  tharbad: 'mer.tharbad',
} as const

/** Las dos caravanas en ruta (§6.3, A10). */
export const CARAVANA = {
  ventaCervezaFornost: 'car.venta-de-cerveza-en-fornost',
  compraViveresTharbad: 'car.compra-de-viveres-en-tharbad',
} as const

/** Las tres unidades de la guarnición de Bree (§6.3, A6). */
export const UNIDAD = {
  guardias: 'uni.guardias-de-la-puerta',
  arqueros: 'uni.arqueros-de-la-empalizada',
  capitan: 'uni.capitan-de-la-guardia',
} as const

/** Las tres defensas de Bree (§6.3, A6). */
export const DEFENSA = {
  empalizada: 'def.empalizada-norte',
  puerta: 'def.puerta-del-sur',
  torre: 'def.torre-de-vigia',
} as const

/** Las once filas de animales de Bree (§6.3, A12). */
export const ANIMAL = {
  vacas: 'ani.bree.vacas',
  toro: 'ani.bree.toro',
  bueyes: 'ani.bree.bueyes',
  caballosDeTiro: 'ani.bree.caballos-de-tiro',
  ponis: 'ani.bree.ponis',
  ovejas: 'ani.bree.ovejas',
  carneros: 'ani.bree.carneros',
  cerdos: 'ani.bree.cerdos',
  gallinas: 'ani.bree.gallinas',
  gallos: 'ani.bree.gallos',
  perrosPastores: 'ani.bree.perros-pastores',
} as const

/** Las nueve filas de la armería de Bree (§6.3, A6b). */
export const ARMERIA = {
  lanzas: 'arm.bree.lanzas',
  arcos: 'arm.bree.arcos-largos',
  flechas: 'arm.bree.flechas',
  espadas: 'arm.bree.espadas-cortas',
  escudos: 'arm.bree.escudos-redondos',
  cotas: 'arm.bree.cotas-de-malla',
  yelmos: 'arm.bree.yelmos-de-hierro',
  jubones: 'arm.bree.jubones-de-cuero',
  ballestas: 'arm.bree.ballestas',
} as const

/** Los cuatro eventos narrativos de Bree (§6.3, A11). */
export const EVENTO = {
  lluvias: 'ev.lluvias-de-primavera',
  feria: 'ev.feria-de-primavera',
  bandidos: 'ev.incursion-de-bandidos',
  mensajero: 'ev.visita-del-mensajero-real',
} as const
