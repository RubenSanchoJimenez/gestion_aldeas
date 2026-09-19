import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { RECURSO } from '../catalogo/inicial'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { conAsentamiento, conFila, estadoMinimo } from '../motor/pruebas/constructores'
import { avisosDeAlmacen } from './almacen'

/** El 12 de abril de 1640: la fecha actual del ejemplo y la de `estadoMinimo`. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

function F(dia: number, mes: number, anio = 1640): Fecha {
  return { anio, mes, dia }
}

const catalogo: CatalogosEnCopia = catalogosDeEjemplo()

function estadoEjemplo(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

/** Avanza `dias` días sin guardar y devuelve el estado nuevo y sus flujos («lo ocurrido»). */
function avanzar(estado: EstadoPartida, dias: number, hasta: Fecha) {
  const recorrido = recorrerDias(estado, hasta, { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo })
  void dias
  return recorrido
}

/** Un asentamiento de prueba con `habitantes` personas y `cantidad` sacos de víveres, sin capacidad. */
function estadoConVivres(habitantes: number, cantidad: number): EstadoPartida {
  const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.prueba', nombre: 'Prueba', caja: 0, habitantes })
  return conFila(base, { dominioId: 'dom.prueba', recursoId: RECURSO.viveres, cantidad })
}

describe('avisosDeAlmacen: O10, 12 de abril (previsión a 30 días, sin lo ocurrido)', () => {
  it('un solo aviso ámbar: los víveres de Bree se agotan el 23 de abril', () => {
    expect(avisosDeAlmacen(estadoEjemplo(), catalogo)).toEqual([
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: DOM.bree,
        fecha: F(23, 4),
        texto: 'Los víveres de Bree se agotan el 23 de abril',
      },
    ])
  })
})

describe('avisosDeAlmacen: O10 y D-050, 19 de abril (7 días después, sin guardar)', () => {
  const alos19 = avanzar(estadoEjemplo(), 7, F(19, 4)).estadoNuevo

  it('rojo con la caravana de Tharbad, que no vuelve hasta el 25 (dentro de los 7 días)', () => {
    const avisos = avisosDeAlmacen(alos19, catalogo)
    const falta = avisos.find((a) => a.tipo === 'faltaDeRecurso')
    expect(falta).toEqual({
      tipo: 'faltaDeRecurso',
      color: 'rojo',
      dominioId: DOM.bree,
      fecha: F(23, 4),
      texto: 'Los víveres de Bree se agotan el 23 de abril y la caravana de Tharbad no vuelve hasta el 25 de abril',
    })
  })

  it('ámbar: se perderán 7 fardos de lana en Bree el 19 de mayo (D-050: justo a 30 días de hoy)', () => {
    const avisos = avisosDeAlmacen(alos19, catalogo)
    const perdida = avisos.find((a) => a.dominioId === DOM.bree && a.tipo === 'recursoPerdido')
    expect(perdida).toEqual({
      tipo: 'recursoPerdido',
      color: 'ambar',
      dominioId: DOM.bree,
      fecha: F(19, 5),
      texto: 'Se perderán 7 fardos de lana en Bree el 19 de mayo',
    })
  })
})

describe('avisosDeAlmacen: lo ocurrido manda sobre lo previsto (O10, 19 de julio con simular(…, 98))', () => {
  const al19Julio = avanzar(estadoEjemplo(), 98, F(19, 7))
  const avisos = avisosDeAlmacen(al19Julio.estadoNuevo, catalogo, al19Julio.flujos)

  it('faltas ocurridas: víveres de Bree (2.217 sacos) y de Archet (113 sacos), y madera de Bree (62 haces)', () => {
    const porTexto = avisos.filter((a) => a.tipo === 'faltaDeRecurso').map((a) => a.texto)
    expect(porTexto).toContain('Los víveres de Bree se agotaron el 23 de abril: faltaron 2.217 sacos')
    expect(porTexto).toContain('Los víveres de Archet se agotaron el 9 de julio: faltaron 113 sacos')
    expect(porTexto).toContain('Bree se quedó sin madera el 6 de julio: faltaron 62 haces')
  })

  it('la cerveza de Bree todavía no ha faltado en esos 98 días: sale con la falta prevista, rojo (7 días)', () => {
    const cerveza = avisos.find((a) => a.tipo === 'faltaDeRecurso' && a.texto.includes('cerveza'))
    expect(cerveza?.texto).toBe('Bree se queda sin cerveza el 26 de julio')
  })

  it('como mucho un aviso de falta por fila: la lista no repite Bree víveres', () => {
    const deVideres = avisos.filter((a) => a.tipo === 'faltaDeRecurso' && a.texto.includes('víveres de Bree'))
    expect(deVideres).toHaveLength(1)
  })

  it('pérdidas ocurridas: 103 fardos de lana desde el 19 de mayo y 13 carretadas de piedra el 14 de julio', () => {
    const porTexto = avisos.filter((a) => a.tipo === 'recursoPerdido').map((a) => a.texto)
    expect(porTexto).toContain('Se perdieron 103 fardos de lana en Bree desde el 19 de mayo')
    expect(porTexto).toContain('Se perdieron 13 carretadas de piedra en Bree el 14 de julio')
  })
})

describe('avisosDeAlmacen: rojo con 7 días, ámbar con 8 y 30, nada con 31 o más', () => {
  it('primer día de falta a 7 días: rojo, sin caravana', () => {
    const avisos = avisosDeAlmacen(estadoConVivres(30, 6), catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: F(19, 4),
        texto: 'Los víveres de Prueba se agotan el 19 de abril',
      },
    ])
  })

  it('primer día de falta a 8 días: ámbar', () => {
    const avisos = avisosDeAlmacen(estadoConVivres(30, 7), catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: 'dom.prueba',
        fecha: F(20, 4),
        texto: 'Los víveres de Prueba se agotan el 20 de abril',
      },
    ])
  })

  it('primer día de falta a 30 días: todavía ámbar', () => {
    const avisos = avisosDeAlmacen(estadoConVivres(30, 29), catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: 'dom.prueba',
        fecha: F(12, 5),
        texto: 'Los víveres de Prueba se agotan el 12 de mayo',
      },
    ])
  })

  it('primer día de falta a 31 días, fuera de los 30 de la previsión: sin aviso', () => {
    expect(avisosDeAlmacen(estadoConVivres(30, 30), catalogo)).toEqual([])
  })
})

describe('avisosDeAlmacen: un recurso que no es víveres', () => {
  it('«Prueba se queda sin madera el …», sin «Los … se agotan»', () => {
    // Víveres con existencias de sobra (100.000, nunca falta en 30 días): así el único aviso es el de la madera.
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.prueba', nombre: 'Prueba', caja: 0, habitantes: 1 })
    const poblacion = {
      ...base.poblaciones[0],
      consumos: [{ id: 'cons.madera', nombre: 'Madera', recursoId: RECURSO.madera, porHabitante: 1 }],
    }
    const conConsumo: EstadoPartida = {
      ...conFila(conFila(base, { dominioId: 'dom.prueba', recursoId: RECURSO.viveres, cantidad: 100000 }), {
        dominioId: 'dom.prueba',
        recursoId: RECURSO.madera,
        cantidad: 6,
      }),
      poblaciones: [poblacion],
    }
    const avisos = avisosDeAlmacen(conConsumo, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: F(19, 4),
        texto: 'Prueba se queda sin madera el 19 de abril',
      },
    ])
  })
})

describe('avisosDeAlmacen: la frase de un traslado que llega después dice «no llega»', () => {
  it('caravana de traslado con vuelta posterior a la falta', () => {
    const conOrigen = conAsentamiento(estadoMinimo(HOY), { id: 'dom.origen', nombre: 'Origen', caja: 0, habitantes: 0 })
    const base = conAsentamiento(conOrigen, { id: 'dom.destino', nombre: 'Destino', caja: 0, habitantes: 30 })
    const estado: EstadoPartida = {
      ...conFila(base, { dominioId: 'dom.destino', recursoId: RECURSO.viveres, cantidad: 6 }),
      caravanas: [
        {
          id: 'car.prueba-traslado',
          dominioId: 'dom.origen',
          operacion: 'traslado',
          destinoId: 'dom.destino',
          carga: { recursoId: RECURSO.viveres, cantidad: 50 },
          salida: F(15, 4),
          vuelta: F(26, 4),
          estado: 'enRuta',
        },
      ],
    }
    const avisos = avisosDeAlmacen(estado, catalogo)
    expect(avisos.find((a) => a.tipo === 'faltaDeRecurso')?.texto).toBe(
      'Los víveres de Destino se agotan el 19 de abril y la caravana de Origen no llega hasta el 26 de abril',
    )
  })
})
