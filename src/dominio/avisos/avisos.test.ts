import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe } from '../modelo/documento'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import type { AvisoConFecha } from '../motor/tipos'
import { avisosEn, ordenarAvisos, sinFecha } from './avisos'

/** Los avisos del ejemplo tras recorrer hasta `hasta`. */
function avisosTras(hasta: Fecha): AvisoConFecha[] {
  const recorrido = recorrerDias(estadoDe(documentoDeEjemplo()), hasta, {
    avanceId: 'sim',
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
  return avisosEn(recorrido.estadoNuevo, catalogosDeEjemplo())
}

/** Un aviso de prueba: solo importan su color, su fecha, su tipo y su dominio. */
function aviso(texto: string, datos: Omit<AvisoConFecha, 'texto'>): AvisoConFecha {
  return { ...datos, texto }
}

describe('avisosEn (O10)', () => {
  it('el 12 de abril: solo la falta prevista de víveres de Bree, en ámbar (a 11 días)', () => {
    expect(avisosEn(estadoDe(documentoDeEjemplo()), catalogosDeEjemplo())).toEqual([
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 23 de abril',
        fecha: { anio: 1640, mes: 4, dia: 23 },
      },
    ])
  })

  it('el 19 de julio, sin lo ocurrido: los diez avisos de O10, por color, fecha, tipo y dominio', () => {
    expect(avisosTras({ anio: 1640, mes: 7, dia: 19 })).toEqual([
      {
        tipo: 'impago',
        color: 'rojo',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no pudo pagar a Corona de Arthedain: 18,8 mo pendientes',
        fecha: { anio: 1640, mes: 7, dia: 19 },
      },
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 20 de julio',
        fecha: { anio: 1640, mes: 7, dia: 20 },
      },
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Bree se queda sin madera el 20 de julio',
        fecha: { anio: 1640, mes: 7, dia: 20 },
      },
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.archet,
        texto: 'Los víveres de Archet se agotan el 20 de julio',
        fecha: { anio: 1640, mes: 7, dia: 20 },
      },
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Bree se queda sin cerveza el 26 de julio',
        fecha: { anio: 1640, mes: 7, dia: 26 },
      },
      {
        tipo: 'edificioTerminadoSinProduccion',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'Molino está terminado: anota su producción y sus trabajadores',
        fecha: { anio: 1640, mes: 7, dia: 19 },
      },
      {
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Se perderán 17 carretadas de piedra en Bree el 21 de julio',
        fecha: { anio: 1640, mes: 7, dia: 21 },
      },
      {
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Se perderán 12 fardos de lana en Bree el 21 de julio',
        fecha: { anio: 1640, mes: 7, dia: 21 },
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre los salarios de 3,2 mo del 26 de julio',
        fecha: { anio: 1640, mes: 7, dia: 26 },
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de octubre',
        fecha: { anio: 1640, mes: 10, dia: 19 },
      },
    ])
  })
})

describe('avisosEn con `ocurrido`', () => {
  it('a 98 días, una fila con falta ocurrida y prevista da un solo aviso (lo ocurrido manda)', () => {
    const recorrido = recorrerDias(estadoDe(documentoDeEjemplo()), { anio: 1640, mes: 7, dia: 19 }, {
      avanceId: 'sim',
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    const avisos = avisosEn(recorrido.estadoNuevo, catalogosDeEjemplo(), recorrido.flujos)
    const deViveresDeBree = avisos.filter((a) => a.dominioId === DOM.bree && a.texto.includes('víveres'))
    expect(deViveresDeBree).toHaveLength(1)
    expect(deViveresDeBree[0].texto).toBe('Los víveres de Bree se agotaron el 23 de abril: faltaron 2.217 sacos')
  })
})

describe('ordenarAvisos y sinFecha', () => {
  it('pone los rojos primero y después ordena por fecha, por tipo (orden de §9) y por dominio (T11)', () => {
    const dominios = documentoDeEjemplo().dominios
    const dia = (d: number): Fecha => ({ anio: 1640, mes: 4, dia: d })
    const desordenados = [
      aviso('ámbar del 20', { tipo: 'pagoNoCubierto', color: 'ambar', dominioId: DOM.bree, fecha: dia(20) }),
      aviso('rojo del 25', { tipo: 'saldoNegativo', color: 'rojo', dominioId: DOM.tharan, fecha: dia(25) }),
      aviso('rojo del 19, Archet', { tipo: 'saldoNegativo', color: 'rojo', dominioId: DOM.archet, fecha: dia(19) }),
      aviso('rojo del 19, Bree', { tipo: 'saldoNegativo', color: 'rojo', dominioId: DOM.bree, fecha: dia(19) }),
      aviso('rojo del 19, impago', { tipo: 'impago', color: 'rojo', dominioId: DOM.archet, fecha: dia(19) }),
      aviso('ámbar del 13', { tipo: 'pagoNoCubierto', color: 'ambar', dominioId: DOM.archet, fecha: dia(13) }),
    ]
    expect(ordenarAvisos(desordenados, dominios).map((a) => a.texto)).toEqual([
      'rojo del 19, impago',
      'rojo del 19, Bree',
      'rojo del 19, Archet',
      'rojo del 25',
      'ámbar del 13',
      'ámbar del 20',
    ])
  })

  it('guarda el aviso sin su fecha, y sin dominioId si no lo tiene (formato 1): los tres avisos de O10 a 19 de abril', () => {
    const fecha: Fecha = { anio: 1640, mes: 7, dia: 19 }
    expect(avisosTras({ anio: 1640, mes: 4, dia: 19 }).map(sinFecha)).toEqual([
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 23 de abril y la caravana de Tharbad no vuelve hasta el 25 de abril',
      },
      {
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Se perderán 7 fardos de lana en Bree el 19 de mayo',
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de julio',
      },
    ])
    const sinDominio = sinFecha({ tipo: 'impago', color: 'rojo', texto: 'Aviso de partida', fecha })
    expect(sinDominio).toEqual({ tipo: 'impago', color: 'rojo', texto: 'Aviso de partida' })
    expect(Object.keys(sinDominio)).toEqual(['tipo', 'color', 'texto'])
  })
})
