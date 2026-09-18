import { describe, expect, it } from 'vitest'
import {
  EsquemaAnimal,
  EsquemaDefensa,
  EsquemaEdificio,
  EsquemaEfectoObra,
  EsquemaImpuestoRenta,
  EsquemaLocalComercial,
  EsquemaObjetoArmeria,
  EsquemaObra,
  EsquemaProduccionEdificio,
  EsquemaTipoLocal,
  EsquemaTrabajador,
  EsquemaUnidadGuarnicion,
  type Edificio,
  type ImpuestoRenta,
  type LocalComercial,
  type Obra,
  type Trabajador,
} from './asentamiento'

/** Las Granjas del Oeste de Bree: 6 granjeros y 90 sacos de víveres cada sábado (A7, A7b). */
const GRANJAS: Edificio = {
  id: 'ed.granjas-del-oeste',
  dominioId: 'dom.bree',
  tipoId: 'edificio.granja',
  nombre: 'Granjas del Oeste',
  estado: 'activo',
  trabajadoresNecesarios: 6,
  producciones: [
    {
      id: 'prod.granjas.viveres',
      recursoId: 'recurso.viveres',
      cantidad: 90,
      recurrencia: { tipo: 'semanal', diaSemana: 5 },
      acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 4 },
    },
  ],
}

/** El nuevo granero de Bree: obra programada de 20 días con 40 haces de madera y 20 lingotes de hierro (A9). */
const GRANERO: Obra = {
  id: 'obra.nuevo-granero',
  dominioId: 'dom.bree',
  nombre: 'Nuevo granero',
  estado: 'programada',
  coste: { base: 4500000, introducido: { cantidad: '45', moneda: 'mo' } },
  materiales: { 'recurso.madera': 40, 'recurso.hierro': 20 },
  inicio: { anio: 1640, mes: 4, dia: 10 },
  diasTotales: 20,
  efecto: { tipo: 'crearEdificio', tipoId: 'edificio.granero' },
  movimientoId: 'mov.obra.granero',
}

/** La herrería de Bree: 15 % de la producción, mínimo 1 mo, se cobra el día 1 (A3b). */
const HERRERIA: LocalComercial = {
  id: 'loc.herreria-1',
  dominioId: 'dom.bree',
  nombre: 'Herrería de Bree',
  tipoId: 'tipoloc.herreria',
  titularId: 'persona.hamfast',
  produccionHabitual: { base: 3000000, introducido: { cantidad: '30', moneda: 'mo' } },
  cambiosEstado: [{ desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' }],
  alta: { anio: 1640, mes: 3, dia: 1 },
  cobradoHasta: { anio: 1640, mes: 2 },
  producciones: [{ mes: { anio: 1640, mes: 3 }, importe: { base: 2800000 }, nota: 'Mes flojo' }],
}

describe('EsquemaEdificio', () => {
  it('acepta las Granjas del Oeste con su producción semanal y su acumulado', () => {
    expect(EsquemaEdificio.parse(GRANJAS)).toEqual(GRANJAS)
    expect(EsquemaEdificio.safeParse({ ...GRANJAS, estado: 'daniado' }).success).toBe(true)
    expect(EsquemaEdificio.safeParse({ ...GRANJAS, estado: 'dañado' }).success).toBe(false)
    expect(
      EsquemaEdificio.safeParse({
        ...GRANJAS,
        avisoPendiente: { tipo: 'terminadoSinProduccion', obraId: 'obra.nuevo-granero' },
      }).success,
    ).toBe(true)
  })

  it('no admite la frecuencia «Una sola vez» en una producción (§6.4, A7b)', () => {
    const unica = EsquemaProduccionEdificio.safeParse({
      ...GRANJAS.producciones[0],
      recurrencia: { tipo: 'unica', fecha: { anio: 1640, mes: 4, dia: 8 } },
    })
    expect(unica.success).toBe(false)

    expect(EsquemaProduccionEdificio.safeParse({ ...GRANJAS.producciones[0], cantidad: 0 }).success).toBe(false)
    const tresDecimales = EsquemaProduccionEdificio.safeParse({ ...GRANJAS.producciones[0], cantidad: 8.333 })
    expect(tresDecimales.success).toBe(false)
    expect(tresDecimales.error?.issues.map((i) => i.message)).toEqual(['Usa como mucho 2 decimales'])
  })
})

describe('EsquemaTrabajador', () => {
  it('acepta los seis granjeros con su salario por trabajador y su edificio', () => {
    const granjeros: Trabajador = {
      id: 'trab.granjeros',
      dominioId: 'dom.bree',
      oficioId: 'oficio.granjero',
      numero: 6,
      salario: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
      recurrencia: { tipo: 'mensual', diaMes: 13 },
      edificioId: 'ed.granjas-del-oeste',
    }
    expect(EsquemaTrabajador.parse(granjeros)).toEqual(granjeros)
    expect(EsquemaTrabajador.safeParse({ ...granjeros, numero: 0 }).success).toBe(false)
    expect(EsquemaTrabajador.safeParse({ ...granjeros, salario: { base: -1 } }).success).toBe(false)
  })
})

describe('EsquemaObra', () => {
  it('acepta el nuevo granero con sus materiales como { recursoId: cantidad } y ata inicio y movimiento al estado', () => {
    expect(EsquemaObra.parse(GRANERO)).toEqual(GRANERO)
    expect(EsquemaObra.parse({ ...GRANERO, materiales: {} }).materiales).toEqual({})
    expect(EsquemaObra.safeParse({ ...GRANERO, materiales: { 'recurso.madera': 0 } }).success).toBe(false)
    expect(EsquemaObra.safeParse({ ...GRANERO, materiales: { 'recurso madera': 40 } }).success).toBe(false)

    const planificada = {
      ...GRANERO,
      id: 'obra.muralla',
      estado: 'planificada' as const,
      inicio: undefined,
      movimientoId: undefined,
    }
    expect(EsquemaObra.parse(planificada)).toEqual(planificada)

    const planificadaConInicio = EsquemaObra.safeParse({ ...planificada, inicio: { anio: 1640, mes: 5, dia: 1 } })
    expect(planificadaConInicio.success).toBe(false)
    expect(planificadaConInicio.error?.issues.map((i) => i.message)).toEqual([
      'Solo una obra planificada no tiene fecha de inicio',
    ])

    const planificadaConMovimiento = EsquemaObra.safeParse({ ...planificada, movimientoId: 'mov.obra.muralla' })
    expect(planificadaConMovimiento.success).toBe(false)
    expect(planificadaConMovimiento.error?.issues.map((i) => i.message)).toEqual([
      'Una obra planificada no ha descontado nada todavía',
    ])
  })

  it('admite los seis resultados de una obra, cada uno con su campo (selector n.º 19)', () => {
    const efectos = [
      { tipo: 'crearEdificio', tipoId: 'edificio.granero' },
      { tipo: 'mejorarEdificio', objetivoId: 'ed.granjas-del-oeste' },
      { tipo: 'ampliarAlmacen', recursoId: 'recurso.viveres', valor: 500 },
      { tipo: 'crearDefensa', tipoId: 'defensa.torre-de-vigia' },
      { tipo: 'repararDefensa', objetivoId: 'def.empalizada' },
      { tipo: 'repararEdificio', objetivoId: 'ed.aserradero' },
    ]
    for (const efecto of efectos) {
      expect(EsquemaEfectoObra.parse(efecto)).toEqual(efecto)
    }
    expect(EsquemaEfectoObra.safeParse({ tipo: 'crearEdificio', objetivoId: 'ed.aserradero' }).success).toBe(false)
    expect(EsquemaEfectoObra.safeParse({ tipo: 'derribarEdificio', objetivoId: 'ed.aserradero' }).success).toBe(false)
  })
})

describe('EsquemaImpuestoRenta', () => {
  it('exige categoriaId y coloca destinatario y edificio en su sentido (decisión 3)', () => {
    const peaje: ImpuestoRenta = {
      id: 'imp.peaje',
      dominioId: 'dom.bree',
      sentido: 'ingreso',
      concepto: 'Peaje del camino',
      base: 'fija',
      importe: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
      categoriaId: 'cat.impuestos',
      recurrencia: { tipo: 'diaria' },
    }
    expect(EsquemaImpuestoRenta.parse(peaje)).toEqual(peaje)
    expect(EsquemaImpuestoRenta.safeParse({ ...peaje, categoriaId: undefined }).success).toBe(false)

    const conDestinatario = EsquemaImpuestoRenta.safeParse({ ...peaje, destinatarioId: 'persona.rey' })
    expect(conDestinatario.success).toBe(false)
    expect(conDestinatario.error?.issues.map((i) => i.message)).toEqual(['El destinatario solo va en los tributos'])

    const tributoConEdificio = EsquemaImpuestoRenta.safeParse({
      ...peaje,
      sentido: 'tributo',
      categoriaId: 'cat.tributos',
      edificioId: 'ed.casa-archet',
    })
    expect(tributoConEdificio.success).toBe(false)
    expect(tributoConEdificio.error?.issues.map((i) => i.message)).toEqual([
      'El edificio alquilado solo va en los ingresos',
    ])
  })
})

describe('EsquemaTipoLocal y EsquemaLocalComercial', () => {
  it('acepta el tipo «Herrería» y su local con cambiosEstado[] (decisión 13)', () => {
    const tipo = {
      id: 'tipoloc.herreria',
      dominioId: 'dom.bree',
      nombre: 'Herrería',
      pct: 15,
      minimo: { base: 100000, introducido: { cantidad: '1', moneda: 'mo' } },
      diaCobro: 1,
    }
    expect(EsquemaTipoLocal.parse(tipo)).toEqual(tipo)
    expect(EsquemaTipoLocal.safeParse({ ...tipo, diaCobro: 32 }).success).toBe(false)
    expect(EsquemaTipoLocal.safeParse({ ...tipo, pct: 100.5 }).success).toBe(false)

    expect(EsquemaLocalComercial.parse(HERRERIA)).toEqual(HERRERIA)
    expect(EsquemaLocalComercial.safeParse({ ...HERRERIA, cambiosEstado: [] }).success).toBe(false)
  })

  it('exige que los tramos de estado vayan en orden y alternando abierto y cerrado', () => {
    const desordenados = EsquemaLocalComercial.safeParse({
      ...HERRERIA,
      cambiosEstado: [
        { desde: { anio: 1640, mes: 4, dia: 1 }, estado: 'cerrado' },
        { desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' },
      ],
    })
    expect(desordenados.success).toBe(false)
    expect(desordenados.error?.issues.map((i) => i.message)).toEqual([
      'Los cambios de estado del local van en orden y sin repetir fecha',
    ])

    const repetidos = EsquemaLocalComercial.safeParse({
      ...HERRERIA,
      cambiosEstado: [
        { desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' },
        { desde: { anio: 1640, mes: 4, dia: 1 }, estado: 'abierto' },
      ],
    })
    expect(repetidos.success).toBe(false)
    expect(repetidos.error?.issues.map((i) => i.message)).toEqual([
      'Dos tramos seguidos de un local no pueden tener el mismo estado',
    ])
  })
})

describe('guarnición, defensas, animales y armería', () => {
  it('acepta una unidad, una defensa, una fila de animales y una de la armería', () => {
    const unidad = {
      id: 'uni.guardia-bree',
      dominioId: 'dom.bree',
      tipoId: 'unidad.guardia',
      nombre: 'Guardia de Bree',
      numero: 12,
      soldada: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
      recurrencia: { tipo: 'mensual' as const, diaMes: 10 },
    }
    expect(EsquemaUnidadGuarnicion.parse(unidad)).toEqual(unidad)

    const defensa = {
      id: 'def.empalizada',
      dominioId: 'dom.bree',
      tipoId: 'defensa.empalizada',
      nombre: 'Empalizada del norte',
      estado: 'buena' as const,
    }
    expect(EsquemaDefensa.parse(defensa)).toEqual(defensa)
    expect(EsquemaDefensa.safeParse({ ...defensa, estado: 'daniada' }).success).toBe(true)
    expect(EsquemaDefensa.safeParse({ ...defensa, estado: 'rota' }).success).toBe(false)

    const animales = {
      id: 'ani.vacas',
      dominioId: 'dom.bree',
      tipoId: 'animal.vaca',
      cantidad: 24,
      genero: 'hembra' as const,
      valorUnitario: { base: 500000, introducido: { cantidad: '5', moneda: 'mo' } },
    }
    expect(EsquemaAnimal.parse(animales)).toEqual(animales)
    expect(EsquemaAnimal.safeParse({ ...animales, genero: 'mixto' }).success).toBe(true)
    expect(EsquemaAnimal.safeParse({ ...animales, cantidad: 0 }).success).toBe(false)

    const armeria = {
      id: 'arm.lanzas',
      dominioId: 'dom.bree',
      nombre: 'Lanzas',
      cantidad: 30,
      valorUnitario: { base: 50000 },
    }
    expect(EsquemaObjetoArmeria.parse(armeria)).toEqual(armeria)
  })
})
