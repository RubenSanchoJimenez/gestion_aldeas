import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, sumarDias, type Fecha } from '../calendario/fecha'
import type { Recurrencia } from '../calendario/recurrencia'
import { CATEGORIA, RECURSO } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { AVANCE, DOM, EVENTO } from '../ejemplo/ids'
import { SNAPSHOT_10_ABRIL } from '../ejemplo/avances'
import { EDIFICIOS, EXISTENCIAS } from '../ejemplo/asentamientosAlmacen'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Existencia } from '../modelo/almacen'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import type { RecurrenteDinero } from '../modelo/movimientos'
import { PASOS_DEL_DIA, pasoEventos, recorrerDias } from './bucle'
import { crearContexto, type Dia } from './contexto'
import { idsEnSerie } from './ids'
import { conAsentamiento, congelar, estadoMinimo } from './pruebas/constructores'
import type { OpcionesSimulacion } from './tipos'

/** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** Opciones de una simulación de prueba: ids en serie «sim.1», «sim.2»… y el catálogo del ejemplo. */
function opciones(): OpcionesSimulacion {
  return { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** Un ingreso de J5 de 1.000 mh en la bolsa del personaje de estadoMinimo. */
function ingreso(estado: EstadoPartida, id: string, concepto: string, recurrencia: Recurrencia): RecurrenteDinero {
  const personaje = estado.dominios[0].id
  return {
    id,
    dominioId: personaje,
    tipo: 'ingreso',
    concepto,
    importe: { base: 1000 },
    categoriaId: CATEGORIA.otros,
    cuentaId: personaje,
    recurrencia,
    activo: true,
  }
}

describe('PASOS_DEL_DIA y pasoEventos', () => {
  it('lleva los pasos del almacén y del dinero de §9, con los números en orden y sin bajar nunca', () => {
    expect(PASOS_DEL_DIA.map((p) => p.numero)).toEqual([1, 3, 4, 5, 6, 7, 7, 8, 9])
    expect(PASOS_DEL_DIA.map((p) => p.nombre)).toEqual([
      'eventos',
      'inicio',
      'produccion',
      'consumo',
      'obras',
      'vueltaDeVentas',
      'llegadaDeCaravanas',
      'cobros',
      'pagos',
    ])
  })

  it('pone en el día los eventos activos con algún efecto, de cualquier ámbito', () => {
    const estado = estadoDe(documentoDeEjemplo())
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 19 }, opciones())
    const diaDe = (fecha: Fecha): Dia => ({ fecha, numero: aNumeroDeDia(fecha), primero: false, eventos: [] })

    const dia15 = diaDe({ anio: 1640, mes: 4, dia: 15 })
    pasoEventos(ctx, dia15)
    expect(dia15.eventos.map((e) => e.id)).toEqual([EVENTO.lluvias, EVENTO.feria])

    const dia22 = diaDe({ anio: 1640, mes: 4, dia: 22 })
    pasoEventos(ctx, dia22)
    expect(dia22.eventos).toEqual([])
  })
})

describe('recorrerDias', () => {
  it('simula del día siguiente a la fecha actual hasta `hasta`, los dos incluidos', () => {
    const base = estadoMinimo(HOY)
    const estado: EstadoPartida = {
      ...base,
      recurrentes: [
        ingreso(base, 'rec.hoy', 'Hoy', { tipo: 'unica', fecha: HOY }),
        ingreso(base, 'rec.manana', 'Mañana', { tipo: 'unica', fecha: sumarDias(HOY, 1) }),
        ingreso(base, 'rec.ultimo', 'Último día', { tipo: 'unica', fecha: sumarDias(HOY, 3) }),
        ingreso(base, 'rec.despues', 'Después', { tipo: 'unica', fecha: sumarDias(HOY, 4) }),
      ],
    }
    const recorrido = recorrerDias(estado, sumarDias(HOY, 3), opciones())
    const nuevos = recorrido.estadoNuevo.movimientos
    expect(nuevos.map((m) => [m.concepto, m.fecha.dia])).toEqual([
      ['Mañana', 13],
      ['Último día', 15],
    ])
    expect(recorrido.saldosDespues[base.dominios[0].id]).toBe(2000)
  })

  it('cierra los diarios después del último día y deja la fecha actual en `hasta`', () => {
    const base = estadoMinimo(HOY)
    const estado: EstadoPartida = {
      ...base,
      recurrentes: [ingreso(base, 'rec.paga', 'Paga de la guardia', { tipo: 'diaria' })],
    }
    const hasta = sumarDias(HOY, 3)
    const recorrido = recorrerDias(estado, hasta, opciones())
    expect(recorrido.estadoNuevo.partida.fechaActual).toEqual(hasta)
    expect(recorrido.estadoNuevo.movimientos).toEqual([
      {
        id: expect.any(String),
        dominioId: base.dominios[0].id,
        fecha: hasta,
        tipo: 'ingreso',
        importe: { base: 3000 },
        categoriaId: CATEGORIA.otros,
        concepto: 'Paga de la guardia · 3 días',
        origen: 'avance',
        avanceId: 'sim',
        regla: { tipo: 'recurrente', id: 'rec.paga' },
        programado: false,
      },
    ])
  })

  it('reproduce el avance del 10 al 12 de abril del ejemplo desde su copia (regresión)', () => {
    const entrada = congelar(structuredClone(SNAPSHOT_10_ABRIL))
    const recorrido = recorrerDias(entrada, HOY, opciones())
    const delEjemplo = documentoDeEjemplo().movimientos.filter((m) => m.avanceId === AVANCE.hasta12Abril)
    const nuevos = recorrido.estadoNuevo.movimientos.filter((m) => m.avanceId === 'sim')
    expect(nuevos).toHaveLength(3)
    expect(nuevos).toEqual(
      expect.arrayContaining(delEjemplo.map((m) => ({ ...m, id: expect.any(String), avanceId: 'sim' }))),
    )
    expect(recorrido.saldosAntes).toEqual({ 'dom.tharan': 4675800, 'dom.bree': 34000000, 'dom.archet': 8500000 })
    expect(recorrido.saldosDespues).toEqual({ 'dom.tharan': 4651800, 'dom.bree': 34060000, 'dom.archet': 8500000 })
    expect(recorrido.saldosDespues).toEqual(saldosPorDominio(recorrido.estadoNuevo))
  })

  it('no toca la entrada: recorre una copia congelada del ejemplo durante 19 días', () => {
    const entrada = congelar(structuredClone(estadoDe(documentoDeEjemplo())))
    const recorrido = recorrerDias(entrada, { anio: 1640, mes: 5, dia: 1 }, opciones())
    expect(entrada).toEqual(estadoDe(documentoDeEjemplo()))
    expect(recorrido.estadoNuevo.partida.fechaActual).toEqual({ anio: 1640, mes: 5, dia: 1 })
    expect(recorrido.estadoNuevo.movimientos.filter((m) => m.avanceId === 'sim')).toHaveLength(18)
  })

  it('un evento que empezó antes de hoy solo cuenta sus días posteriores a la fecha actual (T23)', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      impuestosRentas: [
        {
          id: 'imp.portazgo',
          dominioId: 'dom.aldea',
          sentido: 'ingreso',
          concepto: 'Portazgo',
          base: 'fija',
          importe: { base: 1000 },
          categoriaId: CATEGORIA.impuestos,
          recurrencia: { tipo: 'diaria' },
        },
      ],
      eventos: [
        {
          id: 'ev.mercado',
          dominioId: 'dom.aldea',
          nombre: 'Mercado de primavera',
          inicio: sumarDias(HOY, -2),
          duracionDias: 4,
          efectos: [{ ambito: 'ingresos', objetivo: { tipo: 'todos' }, pct: 100 }],
        },
      ],
    }
    const recorrido = recorrerDias(estado, sumarDias(HOY, 3), opciones())
    const portazgo = recorrido.estadoNuevo.movimientos.find((m) => m.regla?.id === 'imp.portazgo')
    expect(portazgo?.concepto).toBe('Portazgo · 3 días')
    expect(portazgo?.importe).toEqual({ base: 2000 + 1000 + 1000 })
  })

  /** La fila de `existencias` de ese dominio y recurso. */
  function filaDe(existencias: readonly Existencia[], dominioId: string, recursoId: string): Existencia | undefined {
    return existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
  }

  it('los números de PASOS_DEL_DIA no bajan nunca', () => {
    const numeros = PASOS_DEL_DIA.map((p) => p.numero)
    for (let i = 1; i < numeros.length; i++) {
      expect(numeros[i]).toBeGreaterThanOrEqual(numeros[i - 1])
    }
  })

  it('el ejemplo a 7 días (12 al 19 de abril) da las existencias de O1', () => {
    const recorrido = recorrerDias(estadoDe(documentoDeEjemplo()), sumarDias(HOY, 7), opciones())
    const existencias = recorrido.estadoNuevo.existencias
    expect(filaDe(existencias, DOM.bree, RECURSO.viveres)?.cantidad).toBeCloseTo(92.667, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.madera)?.cantidad).toBeCloseTo(385.56, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.piedra)?.cantidad).toBeCloseTo(196.667, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.cerveza)?.cantidad).toBeCloseTo(83.96, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.lana)?.cantidad).toBe(47)
    expect(filaDe(existencias, DOM.bree, RECURSO.arcilla)?.cantidad).toBe(150)
    expect(filaDe(existencias, DOM.bree, RECURSO.hierro)?.cantidad).toBe(64)
    expect(filaDe(existencias, DOM.archet, RECURSO.viveres)?.cantidad).toBeCloseTo(827.667, 3)
  })

  it('a 30 días (13 de abril al 12 de mayo), da las cantidades finales de O3', () => {
    const recorrido = recorrerDias(estadoDe(documentoDeEjemplo()), sumarDias(HOY, 30), opciones())
    const existencias = recorrido.estadoNuevo.existencias
    expect(filaDe(existencias, DOM.bree, RECURSO.viveres)?.cantidad).toBeCloseTo(48.667, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.madera)?.cantidad).toBeCloseTo(297.4, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.piedra)?.cantidad).toBeCloseTo(263.333, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.arcilla)?.cantidad).toBeCloseTo(156.667, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.hierro)?.cantidad).toBe(64)
    expect(filaDe(existencias, DOM.bree, RECURSO.cerveza)?.cantidad).toBeCloseTo(78.4, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.lana)?.cantidad).toBe(95)
    expect(filaDe(existencias, DOM.archet, RECURSO.viveres)?.cantidad).toBeCloseTo(590, 3)
  })

  it('la regresión 10 → 12 de abril da las existencias y los acumulados de O11', () => {
    const entrada = congelar(structuredClone(SNAPSHOT_10_ABRIL))
    const recorrido = recorrerDias(entrada, HOY, opciones())
    const existencias = recorrido.estadoNuevo.existencias
    for (const fila of EXISTENCIAS) {
      expect(filaDe(existencias, fila.dominioId, fila.recursoId)?.cantidad).toBeCloseTo(fila.cantidad, 3)
    }
    const acumulados = new Map(
      recorrido.estadoNuevo.edificios.flatMap((e) => e.producciones.map((p) => [p.id, p.acumulado.sumaFactores])),
    )
    for (const edificio of EDIFICIOS) {
      for (const produccion of edificio.producciones) {
        expect(acumulados.get(produccion.id)).toBeCloseTo(produccion.acumulado.sumaFactores, 6)
      }
    }
  })
})
