import { describe, expect, it } from 'vitest'
import { formatearCantidad } from './cantidades'
import { cantidadDeOcurrencia } from './produccion'
import { diasDeReserva, preverAlmacen, resumirFilas } from './prevision'
import type { Fecha } from '../calendario/fecha'
import { sumarDias } from '../calendario/fecha'
import { RECURSO, idDeOpcion } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { DOM, OBRA } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { progresoDeObra } from './progreso'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { congelar, estadoMinimo, conAsentamiento } from '../motor/pruebas/constructores'
import { recursoDelCatalogo } from '../motor/textos'
import { simular } from '../motor/simular'
import type { OpcionesSimulacion } from '../motor/tipos'

/** Opciones de simulación del ejemplo: ids en serie «sim.1», «sim.2»… y su catálogo. */
function opciones(prefijo = 'sim'): OpcionesSimulacion {
  return { avanceId: 'av.entregable', nuevoId: idsEnSerie(prefijo), catalogo: catalogosDeEjemplo() }
}

/** La fila de un dominio y recurso; lanza si no existe (las pruebas la esperan siempre). */
function fila(estado: EstadoPartida, dominioId: Id, recursoId: Id): { cantidad: number; capacidad?: number } {
  const f = estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
  if (f === undefined) {
    throw new Error(`No existe la fila «${dominioId}|${recursoId}»`)
  }
  return f
}

describe('P5 · el almacén tras el avance del 12 al 19 de abril (O1)', () => {
  it('93 sacos, 386 haces, 197 carretadas, 84 barriles, 47 fardos; arcilla y hierro no cambian; Archet 828 sacos', () => {
    const resultado = simular(documentoDeEjemplo(), 7, opciones())
    const catalogo = catalogosDeEjemplo()
    const texto = (dominioId: Id, recursoId: Id): string =>
      formatearCantidad(fila(resultado.estadoNuevo, dominioId, recursoId).cantidad, recursoDelCatalogo(catalogo, recursoId))

    expect(texto(DOM.bree, RECURSO.viveres)).toBe('93 sacos')
    expect(texto(DOM.bree, RECURSO.madera)).toBe('386 haces')
    expect(texto(DOM.bree, RECURSO.piedra)).toBe('197 carretadas')
    expect(texto(DOM.bree, RECURSO.cerveza)).toBe('84 barriles')
    expect(texto(DOM.bree, RECURSO.lana)).toBe('47 fardos')
    expect(fila(resultado.estadoNuevo, DOM.bree, RECURSO.arcilla).cantidad).toBeCloseTo(150, 3)
    expect(fila(resultado.estadoNuevo, DOM.bree, RECURSO.hierro).cantidad).toBeCloseTo(64, 3)
    expect(texto(DOM.archet, RECURSO.viveres)).toBe('828 sacos')
  })
})

describe('P4 · flujos y producción realizada del 12 al 19 de abril (O2)', () => {
  it('entradas 72/35/17/20/12, consumido 289/26/69, Archet 72; cinco ProduccionRealizada del 14 sin pérdida', () => {
    const inicial = documentoDeEjemplo()
    const resultado = simular(inicial, 7, opciones())
    const resumen = resumirFilas(inicial.existencias, resultado.estadoNuevo.existencias, resultado.flujos)
    const de = (dominioId: Id, recursoId: Id) => resumen.find((r) => r.dominioId === dominioId && r.recursoId === recursoId)!

    expect(de(DOM.bree, RECURSO.viveres).entradas).toBeCloseTo(72, 3)
    expect(de(DOM.bree, RECURSO.madera).entradas).toBeCloseTo(35, 3)
    expect(de(DOM.bree, RECURSO.piedra).entradas).toBeCloseTo(16.667, 3)
    expect(de(DOM.bree, RECURSO.cerveza).entradas).toBeCloseTo(20, 3)
    expect(de(DOM.bree, RECURSO.lana).entradas).toBeCloseTo(12, 3)
    expect(de(DOM.bree, RECURSO.viveres).consumido).toBeCloseTo(289.333, 3)
    expect(de(DOM.bree, RECURSO.cerveza).consumido).toBeCloseTo(26.04, 3)
    expect(de(DOM.bree, RECURSO.madera).consumido).toBeCloseTo(69.44, 3)
    expect(de(DOM.archet, RECURSO.viveres).consumido).toBeCloseTo(72.333, 3)
    // Formateadas, las mismas cifras del contrato («72», «289», etc.).
    expect(formatearCantidad(de(DOM.bree, RECURSO.piedra).entradas, { unidadSingular: 'carretada', unidadPlural: 'carretadas' })).toBe(
      '17 carretadas',
    )
    expect(formatearCantidad(de(DOM.bree, RECURSO.viveres).consumido, { unidadSingular: 'saco', unidadPlural: 'sacos' })).toBe('289 sacos')
    expect(formatearCantidad(de(DOM.bree, RECURSO.cerveza).consumido, { unidadSingular: 'barril', unidadPlural: 'barriles' })).toBe(
      '26 barriles',
    )
    expect(formatearCantidad(de(DOM.bree, RECURSO.madera).consumido, { unidadSingular: 'haz', unidadPlural: 'haces' })).toBe('69 haces')
    expect(formatearCantidad(de(DOM.archet, RECURSO.viveres).consumido, { unidadSingular: 'saco', unidadPlural: 'sacos' })).toBe(
      '72 sacos',
    )

    const nuevas = resultado.estadoNuevo.produccionesRealizadas.filter((p) => p.avanceId === 'av.entregable')
    expect(nuevas).toHaveLength(5)
    const catorceDeAbril: Fecha = { anio: 1640, mes: 4, dia: 14 }
    for (const p of nuevas) {
      expect(p.fecha).toEqual(catorceDeAbril)
      expect(p.perdida).toBe(0)
    }
    const cantidades = nuevas.map((p) => Math.round(p.cantidad * 1000) / 1000).sort((a, b) => a - b)
    expect(cantidades).toEqual([12, 16.667, 20, 35, 72])

    // Obras: granero 8 % → 25 % y molino 60 % → 78 % (O2, gen l.529-532).
    const graneroAntes = progresoDeObra(inicial.obras.find((o) => o.id === OBRA.granero)!, inicial.partida.fechaActual)
    const graneroDespues = progresoDeObra(resultado.estadoNuevo.obras.find((o) => o.id === OBRA.granero)!, resultado.hasta)
    const molinoAntes = progresoDeObra(inicial.obras.find((o) => o.id === OBRA.molinoArchet)!, inicial.partida.fechaActual)
    const molinoDespues = progresoDeObra(
      resultado.estadoNuevo.obras.find((o) => o.id === OBRA.molinoArchet)!,
      resultado.hasta,
    )
    expect(graneroAntes.pct).toBe(8)
    expect(graneroDespues.pct).toBe(25)
    expect(molinoAntes.pct).toBe(60)
    expect(molinoDespues.pct).toBe(78)
  })
})

describe('A8 · previsión a 30 días, del 13 de abril al 12 de mayo (O3)', () => {
  it('resumirFilas del ejemplo: inicial, entradas, consumido, falta y final de cada fila', () => {
    const catalogo = catalogosDeEjemplo()
    const prevision = preverAlmacen(documentoDeEjemplo(), catalogo, 30)
    const resumen = resumirFilas(prevision.inicial, prevision.final, prevision.flujos)
    const r3 = (n: number): number => Math.round(n * 1000) / 1000
    const de = (dominioId: Id, recursoId: Id) => {
      const f = resumen.find((x) => x.dominioId === dominioId && x.recursoId === recursoId)!
      return { ...f, inicial: r3(f.inicial), entradas: r3(f.entradas), consumido: r3(f.consumido), falta: r3(f.falta), final: r3(f.final) }
    }

    expect(de(DOM.bree, RECURSO.viveres)).toMatchObject({ inicial: 310, entradas: 714, consumido: 975.333, consumoTeorico: 1240, falta: 264.667, final: 48.667 })
    expect(de(DOM.bree, RECURSO.viveres).tramosDeFalta).toEqual([
      { desde: { anio: 1640, mes: 4, dia: 23 }, hasta: { anio: 1640, mes: 4, dia: 25 } },
      { desde: { anio: 1640, mes: 5, dia: 7 }, hasta: { anio: 1640, mes: 5, dia: 11 } },
    ])
    expect(de(DOM.bree, RECURSO.madera)).toMatchObject({ inicial: 420, entradas: 175, consumido: 297.6, falta: 0, final: 297.4 })
    expect(de(DOM.bree, RECURSO.piedra)).toMatchObject({ inicial: 180, entradas: 83.333, consumido: 0, final: 263.333 })
    expect(de(DOM.bree, RECURSO.arcilla)).toMatchObject({ inicial: 150, entradas: 6.667, consumido: 0, final: 156.667 })
    expect(de(DOM.bree, RECURSO.hierro)).toMatchObject({ inicial: 64, entradas: 0, consumido: 0, final: 64 })
    expect(de(DOM.bree, RECURSO.cerveza)).toMatchObject({ inicial: 90, entradas: 100, consumido: 111.6, falta: 0, final: 78.4 })
    expect(de(DOM.bree, RECURSO.lana)).toMatchObject({ inicial: 35, entradas: 60, consumido: 0, final: 95 })
    expect(de(DOM.archet, RECURSO.viveres)).toMatchObject({ inicial: 900, entradas: 0, consumido: 310, consumoTeorico: 310, falta: 0, final: 590 })

    // Nada perdido ni sacado en el plazo, y el mínimo de la madera (11 de mayo) no llega a faltar (§6).
    for (const f of resumen) {
      expect(f.perdido).toBeCloseTo(0, 3)
      expect(f.sacado).toBeCloseTo(0, 3)
    }

    // Los textos que cita el contrato: «+714», «−975», «faltan 265», «quedan 49» (esp l.615-616).
    const viveresBree = de(DOM.bree, RECURSO.viveres)
    const unidadesViveres = { unidadSingular: 'saco', unidadPlural: 'sacos' }
    const conSigno = (n: number): string => `${n >= 0 ? '+' : '−'}${Math.round(Math.abs(n))}`
    expect(conSigno(viveresBree.entradas)).toBe('+714')
    expect(conSigno(-viveresBree.consumido)).toBe('−975')
    expect(`faltan ${formatearCantidad(viveresBree.falta, unidadesViveres)}`).toBe('faltan 265 sacos')
    expect(`quedan ${formatearCantidad(viveresBree.final, unidadesViveres)}`).toBe('quedan 49 sacos')
  })
})

describe('días de reserva (O4)', () => {
  it('Bree: víveres 11, madera 85, cerveza 105; sin consumo las demás; Archet víveres 88', () => {
    const reservas = diasDeReserva(documentoDeEjemplo(), catalogosDeEjemplo())
    const de = (dominioId: Id, recursoId: Id) => reservas.find((r) => r.dominioId === dominioId && r.recursoId === recursoId)!.reserva

    expect(de(DOM.bree, RECURSO.viveres)).toEqual({ tipo: 'dias', dias: 11, fecha: { anio: 1640, mes: 4, dia: 23 } })
    expect(de(DOM.bree, RECURSO.madera)).toEqual({ tipo: 'dias', dias: 85, fecha: { anio: 1640, mes: 7, dia: 6 } })
    expect(de(DOM.bree, RECURSO.cerveza)).toEqual({ tipo: 'dias', dias: 105, fecha: { anio: 1640, mes: 7, dia: 26 } })
    expect(de(DOM.bree, RECURSO.piedra)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.bree, RECURSO.arcilla)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.bree, RECURSO.hierro)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.bree, RECURSO.lana)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.archet, RECURSO.viveres)).toEqual({ tipo: 'dias', dias: 88, fecha: { anio: 1640, mes: 7, dia: 9 } })
  })

  it('sinFalta: una fila consumida que en 366 días no llega a faltar', () => {
    const base = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), { id: 'dom.aldea', nombre: 'Aldea', caja: 0, habitantes: 100 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [
        { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 1000000 },
        { dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 1000, capacidad: 2000 },
      ],
      edificios: [],
    }
    const reservas = diasDeReserva(estado, catalogosDeEjemplo())
    const viveres = reservas.find((r) => r.dominioId === 'dom.aldea' && r.recursoId === RECURSO.viveres)!.reserva
    expect(viveres).toEqual({ tipo: 'sinFalta' })
  })
})

describe('O5 · la mina: cantidadDeOcurrencia y dos simulaciones con la edición de los trabajadores en medio', () => {
  it('cantidadDeOcurrencia(10, 25, 30) = 8,333; con el motor, subir de 2 a 3 mineros a mitad de camino da 8,333 el 1 de mayo', () => {
    expect(cantidadDeOcurrencia(10, 25, 30)).toBeCloseTo(8.333, 3)

    const primeroDeAbril: Fecha = { anio: 1640, mes: 4, dia: 1 }
    const base = conAsentamiento(estadoMinimo(primeroDeAbril), { id: 'dom.mina', nombre: 'Mina', caja: 0, habitantes: 50 })
    const edificioId = 'ed.mina'
    const produccionId = 'prod.mina'
    const estado0: EstadoPartida = {
      ...base,
      edificios: [
        {
          id: edificioId,
          dominioId: 'dom.mina',
          tipoId: idDeOpcion('tiposEdificio', 'Cantera'),
          nombre: 'Mina',
          estado: 'activo',
          trabajadoresNecesarios: 3,
          producciones: [
            {
              id: produccionId,
              recursoId: RECURSO.piedra,
              cantidad: 10,
              recurrencia: { tipo: 'mensual', diaMes: 1 },
              acumulado: { desde: { anio: 1640, mes: 4, dia: 2 }, sumaFactores: 0 },
            },
          ],
        },
      ],
      trabajadores: [
        {
          id: 'trab.mineros',
          dominioId: 'dom.mina',
          oficioId: idDeOpcion('oficios', 'Minero'),
          numero: 2,
          salario: { base: 1000 },
          recurrencia: { tipo: 'mensual', diaMes: 1 },
          edificioId,
        },
      ],
    }

    const primerTramo = simular(estado0, 15, opciones('mina1'))
    // Mensual · día 1: no hay ocurrencia en los primeros 15 días, así que sigue acumulando desde el 2 de abril.
    const acumuladoTrasQuince = primerTramo.estadoNuevo.edificios.find((e) => e.id === edificioId)?.producciones[0].acumulado
    expect(acumuladoTrasQuince?.desde).toEqual({ anio: 1640, mes: 4, dia: 2 })
    expect(acumuladoTrasQuince?.sumaFactores).toBeCloseTo(10, 3) // 15 días × 2/3
    const conTresMineros: EstadoPartida = {
      ...primerTramo.estadoNuevo,
      trabajadores: primerTramo.estadoNuevo.trabajadores.map((t) => (t.id === 'trab.mineros' ? { ...t, numero: 3 } : t)),
    }
    const segundoTramo = simular(conTresMineros, 15, opciones('mina2'))
    const elUnoDeMayo = segundoTramo.estadoNuevo.produccionesRealizadas.find(
      (p) => p.produccionId === produccionId && p.fecha.mes === 5 && p.fecha.dia === 1,
    )
    expect(elUnoDeMayo).toBeDefined()
    expect(elUnoDeMayo?.cantidad).toBeCloseTo(8.333, 3)
  })
})

describe('O12 · un año entero, 366 días (al 13 de abril de 1641)', () => {
  it('los saldos no cambian (sin obras ni caravanas programadas), y las existencias y producciones finales', () => {
    const resultado = simular(documentoDeEjemplo(), 366, opciones())
    expect(saldosPorDominio(resultado.estadoNuevo)).toEqual({
      [DOM.tharan]: 5659800,
      [DOM.bree]: 23700000,
      [DOM.archet]: 2260000,
    })

    const de = (dominioId: Id, recursoId: Id): number => fila(resultado.estadoNuevo, dominioId, recursoId).cantidad
    expect(de(DOM.bree, RECURSO.viveres)).toBeCloseTo(48.667, 3)
    expect(fila(resultado.estadoNuevo, DOM.bree, RECURSO.viveres).capacidad).toBe(2000)
    expect(de(DOM.bree, RECURSO.madera)).toBeCloseTo(25.08, 3)
    expect(de(DOM.bree, RECURSO.piedra)).toBeCloseTo(400, 3)
    expect(de(DOM.bree, RECURSO.arcilla)).toBeCloseTo(230, 3)
    expect(de(DOM.bree, RECURSO.hierro)).toBeCloseTo(64, 3)
    expect(de(DOM.bree, RECURSO.cerveza)).toBeCloseTo(16.28, 3)
    expect(de(DOM.bree, RECURSO.lana)).toBeCloseTo(100, 3)
    expect(de(DOM.archet, RECURSO.viveres)).toBeCloseTo(0, 3)

    const nuevas = resultado.estadoNuevo.produccionesRealizadas.filter((p) => p.avanceId === 'av.entregable')
    expect(nuevas).toHaveLength(277)
    const conPerdida = nuevas.filter((p) => p.perdida > 0)
    expect(conPerdida).toHaveLength(88)
    expect(conPerdida.filter((p) => p.cantidad === 0)).toHaveLength(86)
  })

  it('avanzar de uno en uno da las mismas existencias y los mismos acumulados que un avance de 366 días', () => {
    const redondearFilas = (estado: EstadoPartida) =>
      estado.existencias
        .map((e) => ({ ...e, cantidad: Math.round(e.cantidad * 1000) / 1000 }))
        .sort((a, b) => `${a.dominioId}|${a.recursoId}`.localeCompare(`${b.dominioId}|${b.recursoId}`))
    const redondearAcumulados = (estado: EstadoPartida) =>
      estado.edificios
        .flatMap((e) => e.producciones.map((p) => ({ id: p.id, desde: p.acumulado.desde, sumaFactores: Math.round(p.acumulado.sumaFactores * 1000) / 1000 })))
        .sort((a, b) => a.id.localeCompare(b.id))

    const deUnaVez = recorrerDias(documentoDeEjemplo(), sumarDias(documentoDeEjemplo().partida.fechaActual, 366), opciones('junto')).estadoNuevo

    let unoAUno: EstadoPartida = documentoDeEjemplo()
    const nuevoId = idsEnSerie('unoAUno')
    for (let dia = 0; dia < 366; dia += 1) {
      unoAUno = recorrerDias(unoAUno, sumarDias(unoAUno.partida.fechaActual, 1), {
        avanceId: 'av.dia',
        nuevoId,
        catalogo: catalogosDeEjemplo(),
      }).estadoNuevo
    }

    expect(redondearFilas(unoAUno)).toEqual(redondearFilas(deUnaVez))
    expect(redondearAcumulados(unoAUno)).toEqual(redondearAcumulados(deUnaVez))
  })
})

describe('invariantes del almacén con 1, 7, 19, 98 y 366 días', () => {
  it.each([1, 7, 19, 98, 366])('a %i días: 0 ≤ cantidad ≤ capacidad en todas las filas, y acumulados ≥ 0', (dias) => {
    const resultado = simular(documentoDeEjemplo(), dias, opciones(`inv${dias}`))
    for (const f of resultado.estadoNuevo.existencias) {
      expect(f.cantidad).toBeGreaterThanOrEqual(0)
      if (f.capacidad !== undefined) {
        expect(f.cantidad).toBeLessThanOrEqual(f.capacidad + 1e-9)
      }
    }
    for (const edificio of resultado.estadoNuevo.edificios) {
      for (const p of edificio.producciones) {
        expect(p.acumulado.sumaFactores).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it.each([1, 7, 19, 98, 366])('a %i días: el mismo resultado con los mismos ids (determinismo)', (dias) => {
    const a = simular(documentoDeEjemplo(), dias, opciones('det'))
    const b = simular(documentoDeEjemplo(), dias, opciones('det'))
    expect(a.estadoNuevo).toEqual(b.estadoNuevo)
    expect(a.avisos).toEqual(b.avisos)
    expect(a.cambios).toEqual(b.cambios)
  })

  it('no toca la entrada congelada, en ningún plazo', () => {
    for (const dias of [1, 7, 19, 98, 366]) {
      expect(() => simular(congelar(documentoDeEjemplo()), dias, opciones(`frozen${dias}`))).not.toThrow()
    }
  })
})

describe('prueba de humo del almacén', () => {
  it('5 asentamientos, 20 edificios con 2 producciones cada uno, 2 consumos, 5 obras y 5 caravanas programadas por asentamiento, 366 días, en menos de 1 s', () => {
    const recursos = [RECURSO.madera, RECURSO.piedra, RECURSO.cerveza, RECURSO.lana] as const
    const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }
    let estado: EstadoPartida = estadoMinimo(HOY)
    const asentamientos = [0, 1, 2, 3, 4].map((i) => `dom.humo${i}`)
    for (const [i, id] of asentamientos.entries()) {
      estado = conAsentamiento(estado, { id, nombre: `Humo ${i}`, caja: 1000000, habitantes: 200 })
    }
    estado = {
      ...estado,
      poblaciones: estado.poblaciones.map((p) =>
        asentamientos.includes(p.dominioId)
          ? {
              ...p,
              consumos: [
                { id: `${p.dominioId}.c1`, nombre: 'Madera', recursoId: RECURSO.madera, porHabitante: 0.005 },
                { id: `${p.dominioId}.c2`, nombre: 'Piedra', recursoId: RECURSO.piedra, porHabitante: 0.002 },
              ],
            }
          : p,
      ),
      existencias: [
        ...estado.existencias,
        ...asentamientos.flatMap((id) => recursos.map((r) => ({ dominioId: id, recursoId: r, cantidad: 500, capacidad: 5000 }))),
      ],
      edificios: asentamientos.flatMap((id, ai) =>
        [0, 1, 2, 3].map((ei) => ({
          id: `${id}.ed${ei}`,
          dominioId: id,
          tipoId: idDeOpcion('tiposEdificio', 'Cantera'),
          nombre: `Edificio ${ai}.${ei}`,
          estado: 'activo' as const,
          trabajadoresNecesarios: 0,
          producciones: [0, 1].map((pi) => ({
            id: `${id}.ed${ei}.p${pi}`,
            recursoId: recursos[(ei + pi) % recursos.length],
            cantidad: 10,
            recurrencia: { tipo: 'semanal' as const, diaSemana: (ei + pi) % 7 },
            acumulado: { desde: sumarDias(HOY, 1), sumaFactores: 0 },
          })),
        })),
      ),
      obras: asentamientos.map((id, ai) => ({
        id: `${id}.obra`,
        dominioId: id,
        nombre: `Obra ${ai}`,
        estado: 'programada' as const,
        coste: { base: 0 },
        materiales: {},
        inicio: sumarDias(HOY, 40),
        diasTotales: 10,
        efecto: { tipo: 'ampliarAlmacen' as const, recursoId: RECURSO.madera, valor: 50 },
      })),
      caravanas: asentamientos.map((id, ai) => ({
        id: `${id}.caravana`,
        dominioId: id,
        operacion: 'traslado' as const,
        destinoId: asentamientos[(ai + 1) % asentamientos.length],
        carga: { recursoId: RECURSO.madera, cantidad: 10 },
        salida: sumarDias(HOY, 50),
        vuelta: sumarDias(HOY, 53),
        estado: 'programada' as const,
      })),
    }

    const inicio = performance.now()
    const resultado = simular(estado, 366, opciones('humo'))
    const duracion = performance.now() - inicio

    expect(resultado.estadoNuevo.edificios).toHaveLength(20)
    expect(resultado.estadoNuevo.edificios.flatMap((e) => e.producciones)).toHaveLength(40)
    expect(resultado.estadoNuevo.obras.every((o) => o.estado === 'terminada')).toBe(true)
    expect(resultado.estadoNuevo.caravanas.every((c) => c.estado === 'terminada')).toBe(true)
    for (const f of resultado.estadoNuevo.existencias) {
      expect(f.cantidad).toBeGreaterThanOrEqual(0)
      if (f.capacidad !== undefined) {
        expect(f.cantidad).toBeLessThanOrEqual(f.capacidad + 1e-9)
      }
    }
    expect(duracion).toBeLessThan(1000)
  })
})
