import { CATEGORIA, idDeOpcion } from '../catalogo/inicial'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import type { Ubicacion, PersonaEntidad } from '../modelo/catalogos'
import type { Deuda } from '../modelo/deudas'
import type { Caja, Dominio } from '../modelo/dominios'
import type { Movimiento, RecurrenteDinero } from '../modelo/movimientos'
import { VERSION_FORMATO, type Partida } from '../modelo/partida'
import type { Hechizo, IntentoAprendizaje, Inversion, ObjetoInventario, Pergamino, Venta } from '../modelo/personaje'
import {
  AVANCE,
  DEUDA,
  DOM,
  HECHIZO,
  INTENTO,
  INVERSION,
  MOV_THARAN,
  OBJETO,
  PAGO,
  PARTIDA_ID,
  PERGAMINO,
  PERSONA,
  RECURRENTE,
  TRANSFERENCIA,
  UBICACION,
} from './ids'

/**
 * Las cinco categorías de fábrica que usa el ejemplo y que no están en `CATEGORIA`, que solo lleva las 16
 * protegidas (§6.5 n.º 6). Se piden a `idDeOpcion` para no copiar el id a mano (decisión 8).
 */
const CAT_ALOJAMIENTO = idDeOpcion('categorias', 'Alojamiento')
const CAT_MONTURA = idDeOpcion('categorias', 'Montura')
const CAT_RECOMPENSAS = idDeOpcion('categorias', 'Recompensas')
const CAT_HIERBAS = idDeOpcion('categorias', 'Hierbas y curación')
const CAT_VIAJES = idDeOpcion('categorias', 'Viajes y peajes')

/** El 1 de enero de 1640 T.E., domingo: la fecha inicial de la partida (§4, P1). */
export const FECHA_INICIAL = { anio: 1640, mes: 1, dia: 1 }

/** El 12 de abril de 1640 T.E., jueves: la fecha actual, antes del avance del 12 al 19 (§12). */
export const FECHA_ACTUAL = { anio: 1640, mes: 4, dia: 12 }

/**
 * «La Sombra del Este» tal como está guardada el 12 de abril de 1640 (§8). Las equivalencias son las de
 * por defecto (1 mo = 100.000 mh) y la ración es fija: 1 saco de 30 kg por persona y mes (§6.1).
 */
export const PARTIDA: Partida = {
  id: PARTIDA_ID,
  nombre: 'La Sombra del Este',
  edad: 'tercera',
  equivalencias: EQUIVALENCIAS_POR_DEFECTO,
  kgPorSaco: 30,
  diasPorSaco: 30,
  fechaInicial: FECHA_INICIAL,
  fechaActual: FECHA_ACTUAL,
  creada: '2026-06-15T17:20:00.000Z',
  actualizada: '2026-09-08T19:45:00.000Z',
  versionFormato: VERSION_FORMATO,
  cambiosDesdeUltimoAvance: 0,
}

/** El personaje y los dos asentamientos, en el orden del menú: Tharan, Bree y Archet (§5). */
export const DOMINIOS: Dominio[] = [
  { id: DOM.tharan, tipo: 'personaje', nombre: 'Tharan', descripcion: 'Montaraz dúnadan' },
  { id: DOM.bree, tipo: 'asentamiento', nombre: 'Bree', categoria: 'pueblo', alta: FECHA_INICIAL },
  { id: DOM.archet, tipo: 'asentamiento', nombre: 'Archet', categoria: 'aldea', alta: FECHA_INICIAL },
]

/**
 * La bolsa de Tharan: 38 mo + 25 mp + 40 mb + 18 mc = 4.091.800 mh = 40,918 mo (§3, P1b).
 * La bolsa de varias filas no guarda «introducido»: solo se guarda el total en oro (§3).
 */
export const CAJA_THARAN: Caja = {
  dominioId: DOM.tharan,
  saldoInicial: { base: 4091800 },
}

/** Las dos ubicaciones propias de la partida; «Encima», las cajas y los almacenes no se guardan (§8). */
export const UBICACIONES: Ubicacion[] = [
  { id: UBICACION.posada, nombre: 'Posada El Poney Pisador' },
  { id: UBICACION.establoDeBree, nombre: 'Establo de Bree' },
]

/** Las seis personas y entidades: contrapartes, titulares, destinatarios y compradores (§8). */
export const PERSONAS: PersonaEntidad[] = [
  { id: PERSONA.gremioBree, nombre: 'Gremio de mercaderes de Bree' },
  { id: PERSONA.hobart, nombre: 'Hobart Brezal, herrero' },
  { id: PERSONA.dalen, nombre: 'Dalen, mercader de Esgaroth' },
  { id: PERSONA.joyeroBree, nombre: 'Joyero de Bree' },
  { id: PERSONA.corona, nombre: 'Corona de Arthedain' },
  { id: PERSONA.barnabas, nombre: 'Barnabás Mantecona, posadero' },
]

/**
 * El libro de la bolsa de Tharan: 13 movimientos, todos aplicados (§6.2, J2). Suman +560.000 mh, así que
 * la bolsa queda en 4.091.800 + 560.000 = 4.651.800 mh = 46,518 mo.
 * El historial arranca el 15 de marzo de 1640 (decisión 2): no hay nada anterior.
 */
export const MOVIMIENTOS_THARAN: Movimiento[] = [
  {
    id: MOV_THARAN.pagoGremio1,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 3, dia: 15 },
    tipo: 'gasto',
    importe: { base: -1000000, introducido: { cantidad: '10', moneda: 'mo' } },
    categoriaId: CATEGORIA.prestamosYDeudas,
    concepto: 'Pago al Gremio de mercaderes de Bree',
    origen: 'manual',
    vinculo: { tipo: 'pagoDeuda', id: PAGO.gremio1 },
    programado: false,
  },
  {
    id: MOV_THARAN.compraPergamino,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 3, dia: 20 },
    tipo: 'gasto',
    importe: { base: -736000, introducido: { cantidad: '7,36', moneda: 'mo' } },
    categoriaId: CATEGORIA.pergaminosYEstudio,
    concepto: 'Compra del pergamino «Paso sin rastro»',
    origen: 'manual',
    programado: false,
  },
  {
    id: MOV_THARAN.pagoGremio2,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 3, dia: 25 },
    tipo: 'gasto',
    importe: { base: -1000000, introducido: { cantidad: '10', moneda: 'mo' } },
    categoriaId: CATEGORIA.prestamosYDeudas,
    concepto: 'Pago al Gremio de mercaderes de Bree',
    origen: 'manual',
    vinculo: { tipo: 'pagoDeuda', id: PAGO.gremio2 },
    programado: false,
  },
  {
    id: MOV_THARAN.beneficioTonel,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 1 },
    tipo: 'ingreso',
    importe: { base: 300000 },
    categoriaId: CATEGORIA.beneficiosDeInversiones,
    concepto: 'Beneficio de El Tonel Dorado',
    origen: 'avance',
    avanceId: AVANCE.hasta6Abril,
    regla: { tipo: 'beneficio', id: INVERSION.tonelDorado },
    inversionId: INVERSION.tonelDorado,
    programado: false,
  },
  {
    id: MOV_THARAN.posada6Abril,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    tipo: 'gasto',
    importe: { base: -60000 },
    categoriaId: CAT_ALOJAMIENTO,
    concepto: 'Posada El Poney Pisador · 6 noches',
    origen: 'avance',
    avanceId: AVANCE.hasta6Abril,
    regla: { tipo: 'recurrente', id: RECURRENTE.posada },
    programado: false,
  },
  {
    id: MOV_THARAN.establo6Abril,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    tipo: 'gasto',
    importe: { base: -12000 },
    categoriaId: CAT_MONTURA,
    concepto: 'Establo del poni · 6 días',
    origen: 'avance',
    avanceId: AVANCE.hasta6Abril,
    regla: { tipo: 'recurrente', id: RECURRENTE.establo },
    programado: false,
  },
  {
    id: MOV_THARAN.transferencia,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    tipo: 'transferencia',
    importe: { base: 2000000, introducido: { cantidad: '20', moneda: 'mo' } },
    categoriaId: CATEGORIA.transferencias,
    concepto: 'Transferencia desde Bree',
    origen: 'manual',
    vinculo: { tipo: 'transferencia', id: TRANSFERENCIA.breeATharan },
    programado: false,
  },
  {
    id: MOV_THARAN.posada10Abril,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    tipo: 'gasto',
    importe: { base: -40000 },
    categoriaId: CAT_ALOJAMIENTO,
    concepto: 'Posada El Poney Pisador · 4 noches',
    origen: 'avance',
    avanceId: AVANCE.hasta10Abril,
    regla: { tipo: 'recurrente', id: RECURRENTE.posada },
    programado: false,
  },
  {
    id: MOV_THARAN.establo10Abril,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    tipo: 'gasto',
    importe: { base: -8000 },
    categoriaId: CAT_MONTURA,
    concepto: 'Establo del poni · 4 días',
    origen: 'avance',
    avanceId: AVANCE.hasta10Abril,
    regla: { tipo: 'recurrente', id: RECURRENTE.establo },
    programado: false,
  },
  {
    id: MOV_THARAN.recompensa,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    tipo: 'ingreso',
    importe: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
    categoriaId: CAT_RECOMPENSAS,
    concepto: 'Recompensa de la guardia de Bree',
    origen: 'manual',
    programado: false,
  },
  {
    id: MOV_THARAN.athelas,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    tipo: 'gasto',
    importe: { base: -60000, introducido: { cantidad: '6', moneda: 'mp' } },
    categoriaId: CAT_HIERBAS,
    concepto: 'Compra de athelas (3)',
    origen: 'manual',
    programado: false,
  },
  {
    id: MOV_THARAN.posada12Abril,
    dominioId: DOM.tharan,
    fecha: FECHA_ACTUAL,
    tipo: 'gasto',
    importe: { base: -20000 },
    categoriaId: CAT_ALOJAMIENTO,
    concepto: 'Posada El Poney Pisador · 2 noches',
    origen: 'avance',
    avanceId: AVANCE.hasta12Abril,
    regla: { tipo: 'recurrente', id: RECURRENTE.posada },
    programado: false,
  },
  {
    id: MOV_THARAN.establo12Abril,
    dominioId: DOM.tharan,
    fecha: FECHA_ACTUAL,
    tipo: 'gasto',
    importe: { base: -4000 },
    categoriaId: CAT_MONTURA,
    concepto: 'Establo del poni · 2 días',
    origen: 'avance',
    avanceId: AVANCE.hasta12Abril,
    regla: { tipo: 'recurrente', id: RECURRENTE.establo },
    programado: false,
  },
]

/** Las dos deudas y el préstamo de Tharan (§6.2, J4). El concepto vive en `notas` (decisión 12). */
export const DEUDAS_THARAN: Deuda[] = [
  {
    id: DEUDA.gremioTharan,
    dominioId: DOM.tharan,
    sentido: 'debo',
    contraparteId: PERSONA.gremioBree,
    fecha: { anio: 1640, mes: 3, dia: 2 },
    principal: { base: 6000000, introducido: { cantidad: '60', moneda: 'mo' } },
    interesPct: 5,
    recurrenciaInteres: { tipo: 'mensual', diaMes: 1, inicio: { anio: 1640, mes: 4, dia: 1 } },
    vencimiento: { anio: 1640, mes: 5, dia: 1 },
    estado: 'abierta',
    impago: false,
    pagos: [
      {
        id: PAGO.gremio1,
        fecha: { anio: 1640, mes: 3, dia: 15 },
        importe: { base: 1000000, introducido: { cantidad: '10', moneda: 'mo' } },
        aplicarA: 'soloCapital',
        movimientoId: MOV_THARAN.pagoGremio1,
      },
      {
        id: PAGO.gremio2,
        fecha: { anio: 1640, mes: 3, dia: 25 },
        importe: { base: 1000000, introducido: { cantidad: '10', moneda: 'mo' } },
        aplicarA: 'soloCapital',
        movimientoId: MOV_THARAN.pagoGremio2,
      },
    ],
    devengos: [
      { fecha: { anio: 1640, mes: 4, dia: 1 }, importe: { base: 200000 }, avanceId: AVANCE.hasta6Abril },
    ],
  },
  {
    id: DEUDA.hobart,
    dominioId: DOM.tharan,
    sentido: 'debo',
    contraparteId: PERSONA.hobart,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    principal: { base: 400000, introducido: { cantidad: '4', moneda: 'mo' } },
    interesPct: 0,
    vencimiento: { anio: 1640, mes: 4, dia: 20 },
    notas: 'Arreglo de la espada',
    estado: 'abierta',
    impago: false,
    pagos: [],
    devengos: [],
  },
  {
    id: DEUDA.dalen,
    dominioId: DOM.tharan,
    sentido: 'meDeben',
    contraparteId: PERSONA.dalen,
    fecha: { anio: 1640, mes: 3, dia: 5 },
    principal: { base: 1500000, introducido: { cantidad: '15', moneda: 'mo' } },
    interesPct: 0,
    vencimiento: { anio: 1640, mes: 6, dia: 5 },
    estado: 'abierta',
    impago: false,
    pagos: [],
    devengos: [],
  },
]

/**
 * Los cuatro gastos e ingresos recurrentes de Tharan (§6.2, J5). Los dos diarios están activos y son los que
 * crea el motor en cada avance; la escolta y el alquiler están en pausa. Todos empiezan el 1 de abril de 1640
 * (decisión 2: ninguna regla es anterior al 31 de marzo).
 */
export const RECURRENTES_THARAN: RecurrenteDinero[] = [
  {
    id: RECURRENTE.posada,
    dominioId: DOM.tharan,
    tipo: 'gasto',
    concepto: 'Posada El Poney Pisador',
    importe: { base: 10000, introducido: { cantidad: '1', moneda: 'mp' } },
    categoriaId: CAT_ALOJAMIENTO,
    cuentaId: DOM.tharan,
    recurrencia: { tipo: 'diaria', inicio: { anio: 1640, mes: 4, dia: 1 } },
    activo: true,
    notas: 'habitación individual',
    unidadDiaria: 'noches',
  },
  {
    id: RECURRENTE.establo,
    dominioId: DOM.tharan,
    tipo: 'gasto',
    concepto: 'Establo del poni',
    importe: { base: 2000, introducido: { cantidad: '2', moneda: 'mb' } },
    categoriaId: CAT_MONTURA,
    cuentaId: DOM.tharan,
    recurrencia: { tipo: 'diaria', inicio: { anio: 1640, mes: 4, dia: 1 } },
    activo: true,
    notas: 'paja y cuidados',
  },
  {
    id: RECURRENTE.escolta,
    dominioId: DOM.tharan,
    tipo: 'gasto',
    concepto: 'Escolta de dos guardias',
    importe: { base: 200000, introducido: { cantidad: '2', moneda: 'mo' } },
    categoriaId: CAT_VIAJES,
    cuentaId: DOM.tharan,
    recurrencia: { tipo: 'semanal', diaSemana: 6, inicio: { anio: 1640, mes: 4, dia: 1 } },
    activo: false,
    notas: 'para viajar por el Camino del Este',
  },
  {
    id: RECURRENTE.alquilerCasaArchet,
    dominioId: DOM.tharan,
    tipo: 'ingreso',
    concepto: 'Alquiler de la casa de Archet',
    importe: { base: 50000, introducido: { cantidad: '0,5', moneda: 'mo' } },
    categoriaId: CATEGORIA.rentasYAlquileres,
    cuentaId: DOM.tharan,
    recurrencia: { tipo: 'mensual', diaMes: 1, inicio: { anio: 1640, mes: 4, dia: 1 } },
    activo: false,
    notas: 'sin inquilino desde marzo',
  },
]

/**
 * El inventario de Tharan: 6 objetos en el patrimonio (81,6 mo) y el pergamino consumido, archivado y fuera
 * del patrimonio (§6.2, J3; decisión 13).
 */
export const OBJETOS: ObjetoInventario[] = [
  {
    id: OBJETO.espada,
    dominioId: DOM.tharan,
    nombre: 'Espada larga dúnadan',
    cantidad: 1,
    valorUnitario: { base: 1800000, introducido: { cantidad: '18', moneda: 'mo' } },
    ubicacion: { tipo: 'encima' },
    notas: 'Forjada en Fornost',
  },
  {
    id: OBJETO.cota,
    dominioId: DOM.tharan,
    nombre: 'Cota de malla',
    cantidad: 1,
    valorUnitario: { base: 2500000, introducido: { cantidad: '25', moneda: 'mo' } },
    ubicacion: { tipo: 'encima' },
  },
  {
    id: OBJETO.esmeraldas,
    dominioId: DOM.tharan,
    nombre: 'Esmeralda tallada',
    cantidad: 2,
    valorUnitario: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
    ubicacion: { tipo: 'caja', dominioId: DOM.bree },
  },
  {
    id: OBJETO.athelas,
    dominioId: DOM.tharan,
    nombre: 'Athelas',
    cantidad: 3,
    valorUnitario: { base: 20000, introducido: { cantidad: '2', moneda: 'mp' } },
    ubicacion: { tipo: 'encima' },
    movimientoCompraId: MOV_THARAN.athelas,
  },
  {
    id: OBJETO.pergaminoLuz,
    dominioId: DOM.tharan,
    nombre: 'Pergamino «Luz de Elbereth»',
    cantidad: 1,
    valorUnitario: { base: 800000, introducido: { cantidad: '8', moneda: 'mo' } },
    ubicacion: { tipo: 'propia', ubicacionId: UBICACION.posada },
  },
  {
    id: OBJETO.poni,
    dominioId: DOM.tharan,
    nombre: 'Poni «Castaño»',
    cantidad: 1,
    valorUnitario: { base: 600000, introducido: { cantidad: '6', moneda: 'mo' } },
    ubicacion: { tipo: 'propia', ubicacionId: UBICACION.establoDeBree },
  },
  {
    id: OBJETO.pergaminoPaso,
    dominioId: DOM.tharan,
    nombre: 'Pergamino «Paso sin rastro»',
    cantidad: 1,
    valorUnitario: { base: 736000, introducido: { cantidad: '7,36', moneda: 'mo' } },
    ubicacion: { tipo: 'encima' },
    movimientoCompraId: MOV_THARAN.compraPergamino,
    archivado: 'consumido',
  },
]

/** Tharan no ha vendido nada: J3 muestra sus 6 objetos y el total es el de los 6 (§6.2). */
export const VENTAS: Venta[] = []

/** Las dos inversiones activas: 70 mo de capital y +4,5 mo al mes (§6.2, J6). */
export const INVERSIONES: Inversion[] = [
  {
    id: INVERSION.tonelDorado,
    dominioId: DOM.tharan,
    negocio: 'El Tonel Dorado',
    descripcion: 'Posada en Archet',
    capital: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
    participacionPct: 25,
    beneficio: { base: 300000, introducido: { cantidad: '3', moneda: 'mo' } },
    recurrencia: { tipo: 'mensual', diaMes: 1, inicio: { anio: 1640, mes: 4, dia: 1 } },
    cuentaBeneficiosId: DOM.tharan,
    estado: 'activa',
  },
  {
    id: INVERSION.barcaza,
    dominioId: DOM.tharan,
    negocio: 'Barcaza del Brandivino',
    descripcion: 'Transporte de mercancías por el río',
    capital: { base: 2000000, introducido: { cantidad: '20', moneda: 'mo' } },
    participacionPct: 10,
    beneficio: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
    recurrencia: { tipo: 'mensual', diaMes: 15, inicio: { anio: 1640, mes: 4, dia: 1 } },
    cuentaBeneficiosId: DOM.tharan,
    estado: 'activa',
  },
]

/** Los tres hechizos: 2 en estudio y 1 aprendido (§6.2, J7). */
export const HECHIZOS: Hechizo[] = [
  {
    id: HECHIZO.pasoSinRastro,
    dominioId: DOM.tharan,
    nombre: 'Paso sin rastro',
    lista: 'Sendas del bosque',
    reino: 'canalizacion',
    nivel: 2,
    estado: 'enEstudio',
  },
  {
    id: HECHIZO.luzDeElbereth,
    dominioId: DOM.tharan,
    nombre: 'Luz de Elbereth',
    lista: 'Caminos de la luz',
    reino: 'esencia',
    nivel: 3,
    estado: 'enEstudio',
  },
  {
    id: HECHIZO.hablarConLosAnimales,
    dominioId: DOM.tharan,
    nombre: 'Hablar con los animales',
    lista: 'Voces de la naturaleza',
    reino: 'canalizacion',
    nivel: 1,
    estado: 'aprendido',
    aprendidoEl: { anio: 1640, mes: 2, dia: 5 },
  },
]

/** Los cinco intentos de aprendizaje, del más antiguo al más reciente (§6.2, J7). */
export const INTENTOS: IntentoAprendizaje[] = [
  {
    id: INTENTO.hablar20Enero,
    hechizoId: HECHIZO.hablarConLosAnimales,
    fecha: { anio: 1640, mes: 1, dia: 20 },
    resultado: 'malo',
    pergaminoConsumido: false,
  },
  {
    id: INTENTO.hablar3Febrero,
    hechizoId: HECHIZO.hablarConLosAnimales,
    fecha: { anio: 1640, mes: 2, dia: 3 },
    resultado: 'bueno',
    pergaminoConsumido: false,
  },
  {
    id: INTENTO.luz25Marzo,
    hechizoId: HECHIZO.luzDeElbereth,
    fecha: { anio: 1640, mes: 3, dia: 25 },
    resultado: 'bueno',
    pergaminoConsumido: false,
  },
  {
    id: INTENTO.paso28Marzo,
    hechizoId: HECHIZO.pasoSinRastro,
    fecha: { anio: 1640, mes: 3, dia: 28 },
    resultado: 'malo',
    pergaminoId: PERGAMINO.pasoSinRastro,
    pergaminoConsumido: true,
  },
  {
    id: INTENTO.paso10Abril,
    hechizoId: HECHIZO.pasoSinRastro,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    resultado: 'malo',
    pergaminoConsumido: false,
  },
]

/** Los dos pergaminos: uno poseído y otro consumido el 28 de marzo (§6.2, J7). */
export const PERGAMINOS: Pergamino[] = [
  {
    id: PERGAMINO.luzDeElbereth,
    dominioId: DOM.tharan,
    hechizoId: HECHIZO.luzDeElbereth,
    nombre: 'Luz de Elbereth',
    nivel: 3,
    estado: 'poseido',
    objetoInventarioId: OBJETO.pergaminoLuz,
  },
  {
    id: PERGAMINO.pasoSinRastro,
    dominioId: DOM.tharan,
    hechizoId: HECHIZO.pasoSinRastro,
    nombre: 'Paso sin rastro',
    nivel: 2,
    estado: 'consumido',
    consumidoEl: { anio: 1640, mes: 3, dia: 28 },
    objetoInventarioId: OBJETO.pergaminoPaso,
    movimientoCompraId: MOV_THARAN.compraPergamino,
  },
]
