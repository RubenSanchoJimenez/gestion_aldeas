import { describe, expect, it } from 'vitest'
import { compararFechas, sumarDias } from '../calendario/fecha'
import { RECURSO, RECURSOS_INICIALES } from '../catalogo/inicial'
import { formatearOro } from '../dinero/formato'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { EsquemaExistencia, EsquemaPoblacion, EsquemaProduccionRealizada } from '../modelo/almacen'
import { EsquemaAnimal, EsquemaEdificio, EsquemaObjetoArmeria, EsquemaObra } from '../modelo/asentamiento'
import { EsquemaCaravana, EsquemaMercado, EsquemaRuta } from '../modelo/comercio'
import { EsquemaEventoNarrativo } from '../modelo/eventos'
import {
  AJUSTES_EXISTENCIAS,
  ANIMALES,
  ARMERIA_BREE,
  CARAVANAS,
  DEFENSAS,
  EDIFICIOS,
  ENTRADAS_ALMACEN,
  EVENTOS,
  EXISTENCIAS,
  MERCADOS,
  OBRAS,
  POBLACIONES,
  PRODUCCIONES_REALIZADAS,
  RUTAS,
} from './asentamientosAlmacen'
import { MOV_ARCHET, MOV_BREE, DOM, EDIFICIO, OBRA } from './ids'
import { PARTIDA } from './partidaYPersonaje'

const EQ = EQUIVALENCIAS_POR_DEFECTO

describe('población y almacén', () => {
  it('Bree tiene 1.240 habitantes y 7 filas de almacén; Archet, 310 y una sola fila (§7, A4 y A8)', () => {
    expect(POBLACIONES).toHaveLength(2)
    for (const poblacion of POBLACIONES) {
      expect(EsquemaPoblacion.safeParse(poblacion).success).toBe(true)
    }
    const bree = POBLACIONES[0]
    expect(bree.habitantesIniciales).toBe(1214)
    expect(bree.cambios.reduce((suma, c) => suma + c.delta, 0)).toBe(26)
    expect(bree.habitantesIniciales + bree.cambios.reduce((suma, c) => suma + c.delta, 0)).toBe(1240)
    expect(bree.consumos.map((c) => c.recursoId)).toEqual([RECURSO.cerveza, RECURSO.madera])
    expect(POBLACIONES[1].habitantesIniciales).toBe(310)
    expect(POBLACIONES[1].consumos).toEqual([])

    for (const existencia of EXISTENCIAS) {
      expect(EsquemaExistencia.safeParse(existencia).success).toBe(true)
    }
    const deBree = EXISTENCIAS.filter((e) => e.dominioId === DOM.bree)
    expect(deBree).toHaveLength(7)
    const viveres = deBree[0]
    expect(viveres.recursoId).toBe(RECURSO.viveres)
    expect(viveres.cantidad).toBe(310)
    expect((viveres.capacidad ?? 0) - viveres.cantidad).toBe(890)
    const deArchet = EXISTENCIAS.filter((e) => e.dominioId === DOM.archet)
    expect(deArchet).toHaveLength(1)
    expect(deArchet[0].cantidad).toBe(900)
    expect(deArchet[0].capacidad).toBeUndefined()
    expect(AJUSTES_EXISTENCIAS).toHaveLength(1)
    expect(ENTRADAS_ALMACEN).toEqual([])
    const recursos = new Set(RECURSOS_INICIALES.map((r) => r.id))
    for (const existencia of EXISTENCIAS) {
      expect(recursos.has(existencia.recursoId)).toBe(true)
    }
  })
})

describe('edificios y producción', () => {
  it('los seis edificios de Bree tienen seis producciones con sus acumulados del 12 de abril (§6.3, A7)', () => {
    expect(EDIFICIOS).toHaveLength(6)
    for (const edificio of EDIFICIOS) {
      expect(EsquemaEdificio.safeParse(edificio).success).toBe(true)
      expect(edificio.dominioId).toBe(DOM.bree)
    }
    const producciones = EDIFICIOS.flatMap((e) => e.producciones)
    expect(producciones).toHaveLength(6)
    for (const produccion of producciones) {
      expect(produccion.recurrencia.tipo === 'semanal' || produccion.recurrencia.tipo === 'mensual').toBe(true)
      expect(compararFechas(produccion.acumulado.desde, PARTIDA.fechaActual)).toBeLessThan(0)
    }
    const cantera = EDIFICIOS.find((e) => e.id === EDIFICIO.cantera)
    expect(cantera?.producciones.map((p) => p.acumulado.sumaFactores)).toEqual([10 / 3, 22 / 3])
    const molino = EDIFICIOS.find((e) => e.id === EDIFICIO.molino)
    expect(molino?.estado).toBe('alquilado')
    expect(molino?.producciones).toEqual([])
  })

  it('las seis producciones ya ocurridas apuntan a su edificio y a su producción (decisión 1)', () => {
    expect(PRODUCCIONES_REALIZADAS).toHaveLength(6)
    const porEdificio = new Map(EDIFICIOS.map((e) => [e.id, e]))
    for (const realizada of PRODUCCIONES_REALIZADAS) {
      expect(EsquemaProduccionRealizada.safeParse(realizada).success).toBe(true)
      const edificio = porEdificio.get(realizada.edificioId)
      expect(edificio).toBeDefined()
      const produccion = edificio?.producciones.find((p) => p.id === realizada.produccionId)
      expect(produccion).toBeDefined()
      expect(produccion?.recursoId).toBe(realizada.recursoId)
      expect(realizada.perdida).toBe(0)
      expect(compararFechas(realizada.fecha, PARTIDA.fechaActual)).toBeLessThan(0)
    }
    expect(PRODUCCIONES_REALIZADAS.filter((p) => p.fecha.dia === 7)).toHaveLength(5)
  })
})

describe('obras, comercio, animales y eventos', () => {
  it('las cuatro obras cuadran con sus fechas y con sus movimientos (§7, A9)', () => {
    expect(OBRAS).toHaveLength(4)
    for (const obra of OBRAS) {
      expect(EsquemaObra.safeParse(obra).success).toBe(true)
    }
    const puerta = OBRAS.find((o) => o.id === OBRA.puerta)
    expect(puerta?.movimientoId).toBe(MOV_BREE.obraPuerta)
    expect(sumarDias(puerta?.inicio ?? PARTIDA.fechaActual, (puerta?.diasTotales ?? 1) - 1)).toEqual({
      anio: 1640,
      mes: 4,
      dia: 17,
    })
    const granero = OBRAS.find((o) => o.id === OBRA.granero)
    expect(granero?.efecto).toEqual({ tipo: 'ampliarAlmacen', recursoId: RECURSO.viveres, valor: 800 })
    expect(granero?.movimientoId).toBe(MOV_BREE.obraGranero)
    const cerveceria = OBRAS.find((o) => o.id === OBRA.cerveceria)
    expect(cerveceria?.estado).toBe('planificada')
    expect(cerveceria?.inicio).toBeUndefined()
    expect(cerveceria?.movimientoId).toBeUndefined()
    const molino = OBRAS.find((o) => o.id === OBRA.molinoArchet)
    expect(molino?.dominioId).toBe(DOM.archet)
    expect(molino?.movimientoId).toBe(MOV_ARCHET.obraMolino)
    expect(sumarDias(molino?.inicio ?? PARTIDA.fechaActual, (molino?.diasTotales ?? 1) - 1)).toEqual({
      anio: 1640,
      mes: 4,
      dia: 28,
    })
    expect(DEFENSAS).toHaveLength(3)
  })

  it('los cuatro mercados, las dos rutas y las dos caravanas en ruta (§6.3, A10)', () => {
    expect(MERCADOS).toHaveLength(4)
    for (const mercado of MERCADOS) {
      expect(EsquemaMercado.safeParse(mercado).success).toBe(true)
    }
    expect(MERCADOS.filter((m) => m.localDe !== undefined).map((m) => m.nombre)).toEqual(['Bree', 'Archet'])
    expect(RUTAS).toHaveLength(2)
    for (const ruta of RUTAS) {
      expect(EsquemaRuta.safeParse(ruta).success).toBe(true)
      expect(ruta.origenId).toBe(DOM.bree)
    }
    expect(RUTAS.map((r) => r.diasViaje)).toEqual([4, 12])
    expect(CARAVANAS).toHaveLength(2)
    for (const caravana of CARAVANAS) {
      expect(EsquemaCaravana.safeParse(caravana).success).toBe(true)
      expect(caravana.estado).toBe('enRuta')
    }
    expect(CARAVANAS[1].movimientoSalidaId).toBe(MOV_BREE.caravanaTharbad)
    expect(CARAVANAS[0].movimientoSalidaId).toBeUndefined()
  })

  it('11 filas de animales (178 cabezas, 473,6 mo), 9 de armería (104 piezas, 230,4 mo) y 4 eventos', () => {
    expect(ANIMALES).toHaveLength(11)
    for (const animal of ANIMALES) {
      expect(EsquemaAnimal.safeParse(animal).success).toBe(true)
    }
    expect(ANIMALES.reduce((suma, a) => suma + a.cantidad, 0)).toBe(178)
    const valorAnimales = ANIMALES.reduce((suma, a) => suma + a.cantidad * (a.valorUnitario?.base ?? 0), 0)
    expect(valorAnimales).toBe(47360000)
    expect(formatearOro(valorAnimales, EQ)).toBe('473,6 mo')

    expect(ARMERIA_BREE).toHaveLength(9)
    for (const objeto of ARMERIA_BREE) {
      expect(EsquemaObjetoArmeria.safeParse(objeto).success).toBe(true)
    }
    expect(ARMERIA_BREE.reduce((suma, o) => suma + o.cantidad, 0)).toBe(104)
    const valorArmeria = ARMERIA_BREE.reduce((suma, o) => suma + o.cantidad * o.valorUnitario.base, 0)
    expect(valorArmeria).toBe(23040000)
    expect(formatearOro(valorArmeria, EQ)).toBe('230,4 mo')

    expect(EVENTOS).toHaveLength(4)
    for (const evento of EVENTOS) {
      expect(EsquemaEventoNarrativo.safeParse(evento).success).toBe(true)
      expect(evento.dominioId).toBe(DOM.bree)
    }
    expect(EVENTOS.filter((e) => e.efectos.length === 0)).toHaveLength(1)
  })
})
