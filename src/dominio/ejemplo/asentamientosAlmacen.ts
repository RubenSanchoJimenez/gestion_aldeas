import { RECURSO, idDeOpcion } from '../catalogo/inicial'
import type {
  AjusteExistencias,
  EntradaAlmacen,
  Existencia,
  Poblacion,
  ProduccionRealizada,
} from '../modelo/almacen'
import type { Animal, Defensa, Edificio, ObjetoArmeria, Obra } from '../modelo/asentamiento'
import type { Caravana, Mercado, Ruta } from '../modelo/comercio'
import type { EventoNarrativo } from '../modelo/eventos'
import {
  AJUSTE_EXISTENCIAS,
  ANIMAL,
  ARMERIA,
  AVANCE,
  CAMBIO_POBLACION,
  CARAVANA,
  CONSUMO,
  DEFENSA,
  DOM,
  EDIFICIO,
  EVENTO,
  IMPUESTO,
  MERCADO,
  MOV_ARCHET,
  MOV_BREE,
  OBRA,
  PRODUCCION,
  PRODUCCION_REALIZADA,
} from './ids'

/** El 1 de abril de 1640: el día en que arrancan también las producciones de los edificios (decisión 2). */
const PRIMERO_DE_ABRIL = { anio: 1640, mes: 4, dia: 1 }

/**
 * Las dos poblaciones (§6.3, A4). Bree tiene 1.214 habitantes iniciales y tres cambios que suman +26, así que
 * el 12 de abril son 1.240. Los víveres no son un consumo guardado: salen de la ración (`diasPorSaco`).
 */
export const POBLACIONES: Poblacion[] = [
  {
    dominioId: DOM.bree,
    habitantesIniciales: 1214,
    cambios: [
      {
        id: CAMBIO_POBLACION.fiebres,
        fecha: { anio: 1640, mes: 2, dia: 14 },
        delta: -6,
        motivo: 'Fiebres de invierno',
      },
      {
        id: CAMBIO_POBLACION.hobbits,
        fecha: { anio: 1640, mes: 3, dia: 2 },
        delta: 20,
        motivo: 'Se instalan hobbits de la Comarca',
      },
      {
        id: CAMBIO_POBLACION.cardolan,
        fecha: PRIMERO_DE_ABRIL,
        delta: 12,
        motivo: 'Llegan familias huidas de Cardolan',
      },
    ],
    consumos: [
      { id: CONSUMO.cerveza, nombre: 'Cerveza', recursoId: RECURSO.cerveza, porHabitante: 0.003 },
      { id: CONSUMO.lena, nombre: 'Leña', recursoId: RECURSO.madera, porHabitante: 0.008 },
    ],
  },
  {
    dominioId: DOM.archet,
    habitantesIniciales: 310,
    cambios: [],
    consumos: [],
  },
]

/** El almacén de Bree (7 filas con capacidad) y el de Archet (víveres sin capacidad) (§6.3, A8). */
export const EXISTENCIAS: Existencia[] = [
  { dominioId: DOM.bree, recursoId: RECURSO.viveres, cantidad: 310, capacidad: 1200 },
  { dominioId: DOM.bree, recursoId: RECURSO.madera, cantidad: 420, capacidad: 600 },
  { dominioId: DOM.bree, recursoId: RECURSO.piedra, cantidad: 180, capacidad: 400 },
  { dominioId: DOM.bree, recursoId: RECURSO.arcilla, cantidad: 150, capacidad: 300 },
  { dominioId: DOM.bree, recursoId: RECURSO.hierro, cantidad: 64, capacidad: 200 },
  { dominioId: DOM.bree, recursoId: RECURSO.cerveza, cantidad: 90, capacidad: 150 },
  { dominioId: DOM.bree, recursoId: RECURSO.lana, cantidad: 35, capacidad: 100 },
  { dominioId: DOM.archet, recursoId: RECURSO.viveres, cantidad: 900 },
]

/** El único ajuste a mano del ejemplo (§6.4). El ajuste es solo el registro: la cantidad ya está guardada. */
export const AJUSTES_EXISTENCIAS: AjusteExistencias[] = [
  {
    id: AJUSTE_EXISTENCIAS.maderaPodrida,
    dominioId: DOM.bree,
    recursoId: RECURSO.madera,
    fecha: { anio: 1640, mes: 4, dia: 2 },
    delta: -5,
    motivo: 'Haces podridos por la humedad',
  },
]

/** El ejemplo no tiene compras ni recepciones directas de almacén: los víveres llegan en caravana (§6.3). */
export const ENTRADAS_ALMACEN: EntradaAlmacen[] = []

/**
 * Los seis edificios de Bree y sus seis producciones (§6.3, A7 y A7b). El molino está alquilado y por eso no
 * produce: su renta es el `ImpuestoRenta` «Alquiler del molino». Los acumulados son los del 12 de abril, que
 * ya está procesado: las granjas llevan 5 días con las lluvias (5 × 0,8 = 4) y la cantera, 2 canteros de 3.
 */
export const EDIFICIOS: Edificio[] = [
  {
    id: EDIFICIO.granjas,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposEdificio', 'Granja'),
    nombre: 'Granjas del Oeste',
    estado: 'activo',
    trabajadoresNecesarios: 6,
    producciones: [
      {
        id: PRODUCCION.granjasViveres,
        recursoId: RECURSO.viveres,
        cantidad: 90,
        recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: PRIMERO_DE_ABRIL },
        acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 4 },
      },
    ],
  },
  {
    id: EDIFICIO.aserradero,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposEdificio', 'Aserradero'),
    nombre: 'Aserradero',
    estado: 'activo',
    trabajadoresNecesarios: 3,
    producciones: [
      {
        id: PRODUCCION.aserraderoMadera,
        recursoId: RECURSO.madera,
        cantidad: 35,
        recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: PRIMERO_DE_ABRIL },
        acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 5 },
      },
    ],
  },
  {
    id: EDIFICIO.cerveceria,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposEdificio', 'Cervecería'),
    nombre: 'Cervecería',
    estado: 'activo',
    trabajadoresNecesarios: 2,
    producciones: [
      {
        id: PRODUCCION.cerveceriaCerveza,
        recursoId: RECURSO.cerveza,
        cantidad: 20,
        recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: PRIMERO_DE_ABRIL },
        acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 5 },
      },
    ],
  },
  {
    id: EDIFICIO.cantera,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposEdificio', 'Cantera'),
    nombre: 'Cantera',
    estado: 'activo',
    trabajadoresNecesarios: 3,
    producciones: [
      {
        id: PRODUCCION.canteraPiedra,
        recursoId: RECURSO.piedra,
        cantidad: 25,
        recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: PRIMERO_DE_ABRIL },
        acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 10 / 3 },
      },
      {
        id: PRODUCCION.canteraArcilla,
        recursoId: RECURSO.arcilla,
        cantidad: 10,
        recurrencia: { tipo: 'mensual', diaMes: 1, inicio: PRIMERO_DE_ABRIL },
        acumulado: { desde: { anio: 1640, mes: 4, dia: 2 }, sumaFactores: 22 / 3 },
      },
    ],
  },
  {
    id: EDIFICIO.redil,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposEdificio', 'Redil'),
    nombre: 'Redil',
    estado: 'activo',
    trabajadoresNecesarios: 1,
    producciones: [
      {
        id: PRODUCCION.redilLana,
        recursoId: RECURSO.lana,
        cantidad: 12,
        recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: PRIMERO_DE_ABRIL },
        acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 5 },
      },
    ],
  },
  {
    id: EDIFICIO.molino,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposEdificio', 'Molino'),
    nombre: 'Molino',
    estado: 'alquilado',
    trabajadoresNecesarios: 0,
    producciones: [],
  },
]

/**
 * Las seis producciones que ya ocurrieron y que el motor dejó anotadas (decisión 1): la arcilla del 1 de abril,
 * del periodo de un solo día que va del inicio de la regla a su primera ocurrencia, y las cinco semanales del
 * sábado 7 de abril, de un periodo de 7 días completo.
 */
export const PRODUCCIONES_REALIZADAS: ProduccionRealizada[] = [
  {
    id: PRODUCCION_REALIZADA.arcilla1Abril,
    fecha: PRIMERO_DE_ABRIL,
    edificioId: EDIFICIO.cantera,
    produccionId: PRODUCCION.canteraArcilla,
    recursoId: RECURSO.arcilla,
    cantidad: 2 / 9,
    perdida: 0,
    avanceId: AVANCE.hasta6Abril,
  },
  {
    id: PRODUCCION_REALIZADA.viveres7Abril,
    fecha: { anio: 1640, mes: 4, dia: 7 },
    edificioId: EDIFICIO.granjas,
    produccionId: PRODUCCION.granjasViveres,
    recursoId: RECURSO.viveres,
    cantidad: 90,
    perdida: 0,
    avanceId: AVANCE.hasta10Abril,
  },
  {
    id: PRODUCCION_REALIZADA.madera7Abril,
    fecha: { anio: 1640, mes: 4, dia: 7 },
    edificioId: EDIFICIO.aserradero,
    produccionId: PRODUCCION.aserraderoMadera,
    recursoId: RECURSO.madera,
    cantidad: 35,
    perdida: 0,
    avanceId: AVANCE.hasta10Abril,
  },
  {
    id: PRODUCCION_REALIZADA.cerveza7Abril,
    fecha: { anio: 1640, mes: 4, dia: 7 },
    edificioId: EDIFICIO.cerveceria,
    produccionId: PRODUCCION.cerveceriaCerveza,
    recursoId: RECURSO.cerveza,
    cantidad: 20,
    perdida: 0,
    avanceId: AVANCE.hasta10Abril,
  },
  {
    id: PRODUCCION_REALIZADA.piedra7Abril,
    fecha: { anio: 1640, mes: 4, dia: 7 },
    edificioId: EDIFICIO.cantera,
    produccionId: PRODUCCION.canteraPiedra,
    recursoId: RECURSO.piedra,
    cantidad: 50 / 3,
    perdida: 0,
    avanceId: AVANCE.hasta10Abril,
  },
  {
    id: PRODUCCION_REALIZADA.lana7Abril,
    fecha: { anio: 1640, mes: 4, dia: 7 },
    edificioId: EDIFICIO.redil,
    produccionId: PRODUCCION.redilLana,
    recursoId: RECURSO.lana,
    cantidad: 12,
    perdida: 0,
    avanceId: AVANCE.hasta10Abril,
  },
]

/** Las cuatro obras: dos en curso y una planificada en Bree, y el molino de Archet (§6.3, A9). */
export const OBRAS: Obra[] = [
  {
    id: OBRA.puerta,
    dominioId: DOM.bree,
    nombre: 'Reparación de la puerta del sur',
    estado: 'enCurso',
    coste: { base: 3000000, introducido: { cantidad: '30', moneda: 'mo' } },
    materiales: { [RECURSO.madera]: 40, [RECURSO.hierro]: 20 },
    inicio: { anio: 1640, mes: 4, dia: 6 },
    diasTotales: 12,
    efecto: { tipo: 'repararDefensa', objetivoId: DEFENSA.puerta },
    movimientoId: MOV_BREE.obraPuerta,
  },
  {
    id: OBRA.granero,
    dominioId: DOM.bree,
    nombre: 'Nuevo granero',
    estado: 'enCurso',
    coste: { base: 8500000, introducido: { cantidad: '85', moneda: 'mo' } },
    materiales: { [RECURSO.madera]: 120, [RECURSO.piedra]: 60 },
    inicio: { anio: 1640, mes: 4, dia: 10 },
    diasTotales: 40,
    efecto: { tipo: 'ampliarAlmacen', recursoId: RECURSO.viveres, valor: 800 },
    movimientoId: MOV_BREE.obraGranero,
  },
  {
    id: OBRA.cerveceria,
    dominioId: DOM.bree,
    nombre: 'Ampliar la cervecería',
    estado: 'planificada',
    coste: { base: 4500000, introducido: { cantidad: '45', moneda: 'mo' } },
    materiales: { [RECURSO.madera]: 60, [RECURSO.piedra]: 30 },
    diasTotales: 20,
    efecto: { tipo: 'mejorarEdificio', objetivoId: EDIFICIO.cerveceria },
  },
  {
    id: OBRA.molinoArchet,
    dominioId: DOM.archet,
    nombre: 'Molino',
    estado: 'enCurso',
    coste: { base: 4000000, introducido: { cantidad: '40', moneda: 'mo' } },
    materiales: {},
    inicio: { anio: 1640, mes: 3, dia: 20 },
    diasTotales: 40,
    efecto: { tipo: 'crearEdificio', tipoId: idDeOpcion('tiposEdificio', 'Molino') },
    movimientoId: MOV_ARCHET.obraMolino,
  },
]

/** Las tres defensas de Bree; la puerta del sur está dañada y en reparación hasta el 17 (§6.3, A6). */
export const DEFENSAS: Defensa[] = [
  {
    id: DEFENSA.empalizada,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposDefensa', 'Empalizada'),
    nombre: 'Empalizada norte',
    estado: 'buena',
  },
  {
    id: DEFENSA.puerta,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposDefensa', 'Puerta'),
    nombre: 'Puerta del sur',
    estado: 'daniada',
  },
  {
    id: DEFENSA.torre,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposDefensa', 'Torre de vigía'),
    nombre: 'Torre de vigía',
    estado: 'buena',
  },
]

/** Los cuatro mercados: los dos locales, que llevan el nombre de su asentamiento, y Fornost y Tharbad (§6.3, A10). */
export const MERCADOS: Mercado[] = [
  {
    id: MERCADO.bree,
    nombre: 'Bree',
    localDe: DOM.bree,
    precios: [
      { recursoId: RECURSO.viveres, importe: { base: 40000, introducido: { cantidad: '4', moneda: 'mp' } } },
      { recursoId: RECURSO.madera, importe: { base: 10000 } },
      { recursoId: RECURSO.hierro, importe: { base: 100000 } },
      { recursoId: RECURSO.cerveza, importe: { base: 40000 } },
      { recursoId: RECURSO.piedra, importe: { base: 15000 } },
      { recursoId: RECURSO.arcilla, importe: { base: 10000 } },
    ],
  },
  { id: MERCADO.archet, nombre: 'Archet', localDe: DOM.archet, precios: [] },
  {
    id: MERCADO.fornost,
    nombre: 'Fornost',
    precios: [
      { recursoId: RECURSO.viveres, importe: { base: 30000, introducido: { cantidad: '3', moneda: 'mp' } } },
      { recursoId: RECURSO.madera, importe: { base: 15000 } },
      { recursoId: RECURSO.hierro, importe: { base: 80000 } },
      { recursoId: RECURSO.cerveza, importe: { base: 60000 } },
      { recursoId: RECURSO.piedra, importe: { base: 25000 } },
      { recursoId: RECURSO.arcilla, importe: { base: 15000 } },
    ],
  },
  {
    id: MERCADO.tharbad,
    nombre: 'Tharbad',
    precios: [
      { recursoId: RECURSO.viveres, importe: { base: 25000 } },
      { recursoId: RECURSO.madera, importe: { base: 10000 } },
      { recursoId: RECURSO.hierro, importe: { base: 120000 } },
      { recursoId: RECURSO.cerveza, importe: { base: 50000 } },
      { recursoId: RECURSO.piedra, importe: { base: 30000 } },
      { recursoId: RECURSO.arcilla, importe: { base: 8000 } },
    ],
  },
]

/** Las dos rutas de Bree; desde Archet no hay ninguna, y por eso no ve el mercado de Cavada Grande (§6.3). */
export const RUTAS: Ruta[] = [
  { origenId: DOM.bree, destino: { tipo: 'mercado', id: MERCADO.fornost }, diasViaje: 4 },
  { origenId: DOM.bree, destino: { tipo: 'mercado', id: MERCADO.tharbad }, diasViaje: 12 },
]

/**
 * Las dos caravanas en ruta (§6.3, A10). La de venta cobra al volver, así que todavía no tiene movimiento;
 * la de compra pagó al salir y su movimiento es el del 1 de abril.
 */
export const CARAVANAS: Caravana[] = [
  {
    id: CARAVANA.ventaCervezaFornost,
    dominioId: DOM.bree,
    operacion: 'venta',
    mercadoId: MERCADO.fornost,
    carga: { recursoId: RECURSO.cerveza, cantidad: 40 },
    precioUnidad: { base: 60000, introducido: { cantidad: '0,6', moneda: 'mo' } },
    importe: { base: 2400000, introducido: { cantidad: '24', moneda: 'mo' } },
    salida: { anio: 1640, mes: 4, dia: 10 },
    vuelta: { anio: 1640, mes: 4, dia: 18 },
    estado: 'enRuta',
  },
  {
    id: CARAVANA.compraViveresTharbad,
    dominioId: DOM.bree,
    operacion: 'compra',
    mercadoId: MERCADO.tharbad,
    carga: { recursoId: RECURSO.viveres, cantidad: 300 },
    precioUnidad: { base: 25000, introducido: { cantidad: '0,25', moneda: 'mo' } },
    importe: { base: 7500000, introducido: { cantidad: '75', moneda: 'mo' } },
    salida: PRIMERO_DE_ABRIL,
    vuelta: { anio: 1640, mes: 4, dia: 25 },
    estado: 'enRuta',
    movimientoSalidaId: MOV_BREE.caravanaTharbad,
  },
]

/** Las once filas de animales de Bree: 178 cabezas y 47.360.000 mh (473,6 mo) de valor anotado (§6.3, A12). */
export const ANIMALES: Animal[] = [
  {
    id: ANIMAL.vacas,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Vaca'),
    cantidad: 24,
    genero: 'hembra',
    valorUnitario: { base: 600000, introducido: { cantidad: '6', moneda: 'mo' } },
  },
  {
    id: ANIMAL.toro,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Toro'),
    cantidad: 1,
    genero: 'macho',
    valorUnitario: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
  },
  {
    id: ANIMAL.bueyes,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Buey'),
    cantidad: 6,
    genero: 'macho',
    valorUnitario: { base: 800000, introducido: { cantidad: '8', moneda: 'mo' } },
  },
  {
    id: ANIMAL.caballosDeTiro,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Caballo de tiro'),
    cantidad: 8,
    genero: 'mixto',
    valorUnitario: { base: 1500000, introducido: { cantidad: '15', moneda: 'mo' } },
  },
  {
    id: ANIMAL.ponis,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Poni'),
    cantidad: 5,
    genero: 'mixto',
    valorUnitario: { base: 600000, introducido: { cantidad: '6', moneda: 'mo' } },
  },
  {
    id: ANIMAL.ovejas,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Oveja'),
    cantidad: 60,
    genero: 'hembra',
    valorUnitario: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
  },
  {
    id: ANIMAL.carneros,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Carnero'),
    cantidad: 4,
    genero: 'macho',
    valorUnitario: { base: 200000, introducido: { cantidad: '2', moneda: 'mo' } },
  },
  {
    id: ANIMAL.cerdos,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Cerdo'),
    cantidad: 18,
    genero: 'mixto',
    valorUnitario: { base: 120000, introducido: { cantidad: '1,2', moneda: 'mo' } },
  },
  { id: ANIMAL.gallinas, dominioId: DOM.bree, tipoId: idDeOpcion('tiposAnimal', 'Gallina'), cantidad: 45, genero: 'hembra' },
  { id: ANIMAL.gallos, dominioId: DOM.bree, tipoId: idDeOpcion('tiposAnimal', 'Gallo'), cantidad: 3, genero: 'macho' },
  {
    id: ANIMAL.perrosPastores,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Perro pastor'),
    cantidad: 4,
    genero: 'mixto',
  },
]

/** Las nueve filas de la armería de Bree: 104 piezas y 23.040.000 mh (230,4 mo) (§6.3, A6b). */
export const ARMERIA_BREE: ObjetoArmeria[] = [
  {
    id: ARMERIA.lanzas,
    dominioId: DOM.bree,
    nombre: 'Lanzas',
    cantidad: 20,
    valorUnitario: { base: 80000, introducido: { cantidad: '0,8', moneda: 'mo' } },
  },
  {
    id: ARMERIA.arcos,
    dominioId: DOM.bree,
    nombre: 'Arcos largos',
    cantidad: 6,
    valorUnitario: { base: 200000, introducido: { cantidad: '2', moneda: 'mo' } },
  },
  {
    id: ARMERIA.flechas,
    dominioId: DOM.bree,
    nombre: 'Flechas · haz de 20',
    cantidad: 30,
    valorUnitario: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
  },
  {
    id: ARMERIA.espadas,
    dominioId: DOM.bree,
    nombre: 'Espadas cortas',
    cantidad: 8,
    valorUnitario: { base: 300000, introducido: { cantidad: '3', moneda: 'mo' } },
  },
  {
    id: ARMERIA.escudos,
    dominioId: DOM.bree,
    nombre: 'Escudos redondos',
    cantidad: 12,
    valorUnitario: { base: 120000, introducido: { cantidad: '1,2', moneda: 'mo' } },
  },
  {
    id: ARMERIA.cotas,
    dominioId: DOM.bree,
    nombre: 'Cotas de malla',
    cantidad: 4,
    valorUnitario: { base: 2500000, introducido: { cantidad: '25', moneda: 'mo' } },
  },
  {
    id: ARMERIA.yelmos,
    dominioId: DOM.bree,
    nombre: 'Yelmos de hierro',
    cantidad: 10,
    valorUnitario: { base: 250000, introducido: { cantidad: '2,5', moneda: 'mo' } },
  },
  {
    id: ARMERIA.jubones,
    dominioId: DOM.bree,
    nombre: 'Jubones de cuero',
    cantidad: 12,
    valorUnitario: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
  },
  {
    id: ARMERIA.ballestas,
    dominioId: DOM.bree,
    nombre: 'Ballestas',
    cantidad: 2,
    valorUnitario: { base: 600000, introducido: { cantidad: '6', moneda: 'mo' } },
  },
]

/** Los cuatro eventos narrativos de Bree: uno activo, uno próximo y dos pasados (§6.3, A11). */
export const EVENTOS: EventoNarrativo[] = [
  {
    id: EVENTO.lluvias,
    dominioId: DOM.bree,
    nombre: 'Lluvias de primavera',
    inicio: { anio: 1640, mes: 4, dia: 8 },
    duracionDias: 14,
    efectos: [
      { ambito: 'produccion', objetivo: { tipo: 'edificio', id: EDIFICIO.granjas }, pct: -20 },
    ],
    notas: 'El máster anuncia lluvias intensas: los campos del oeste se encharcan.',
  },
  {
    id: EVENTO.feria,
    dominioId: DOM.bree,
    nombre: 'Feria de primavera',
    inicio: { anio: 1640, mes: 4, dia: 15 },
    duracionDias: 3,
    efectos: [{ ambito: 'ingresos', objetivo: { tipo: 'impuesto', id: IMPUESTO.aranceles }, pct: 500 }],
  },
  {
    id: EVENTO.bandidos,
    dominioId: DOM.bree,
    nombre: 'Incursión de bandidos en el camino',
    inicio: { anio: 1640, mes: 3, dia: 20 },
    duracionDias: 5,
    efectos: [{ ambito: 'ingresos', objetivo: { tipo: 'impuesto', id: IMPUESTO.peaje }, pct: -100 }],
  },
  {
    id: EVENTO.mensajero,
    dominioId: DOM.bree,
    nombre: 'Visita del mensajero real',
    inicio: PRIMERO_DE_ABRIL,
    duracionDias: 1,
    efectos: [],
  },
]
