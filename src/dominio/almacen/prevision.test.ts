import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { RECURSO } from '../catalogo/inicial'
import { DOM, EDIFICIO } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { cabenElDia, diasDeReserva, preverAlmacen, proximasProducciones, resumirFilas } from './prevision'

/** Fechas de 1640 T.E. escritas cortas: F(19, 4) es el 19 de abril de 1640. */
function F(dia: number, mes: number, anio = 1640): Fecha {
  return { anio, mes, dia }
}

const catalogo = catalogosDeEjemplo()

function estadoEjemplo(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

/** El resumen de una fila del almacén de la previsión, redondeado a 3 decimales. */
function redondeaResumen(estado: EstadoPartida, dias: number, dominioId: string, recursoId: string) {
  const prevision = preverAlmacen(estado, catalogo, dias)
  const resumen = resumirFilas(estado.existencias, prevision.final, prevision.flujos)
  const fila = resumen.find((f) => f.dominioId === dominioId && f.recursoId === recursoId)
  if (fila === undefined) {
    return undefined
  }
  const redondea = (n: number) => Math.round(n * 1000) / 1000
  return {
    inicial: redondea(fila.inicial),
    final: redondea(fila.final),
    entradas: redondea(fila.entradas),
    perdido: redondea(fila.perdido),
    consumido: redondea(fila.consumido),
    consumoTeorico: redondea(fila.consumoTeorico),
    falta: redondea(fila.falta),
    tramosDeFalta: fila.tramosDeFalta,
  }
}

describe('preverAlmacen', () => {
  it('no toca el estado de entrada (una previsión no guarda nada)', () => {
    const estado = estadoEjemplo()
    const antes = JSON.stringify(estado.existencias)
    preverAlmacen(estado, catalogo, 30)
    expect(JSON.stringify(estado.existencias)).toBe(antes)
  })

  it('recorta en el 31 de diciembre de 9999: hasta = hoy si no cabe ningún día', () => {
    const estado = { ...estadoEjemplo(), partida: { ...estadoEjemplo().partida, fechaActual: F(31, 12, 9999) } }
    const prevision = preverAlmacen(estado, catalogo, 30)
    expect(prevision.hasta).toEqual(F(31, 12, 9999))
    expect(prevision.flujos).toEqual([])
  })
})

describe('resumirFilas: O3 (previsión a 30 días, del 13 de abril al 12 de mayo)', () => {
  const estado = estadoEjemplo()
  const prevision = preverAlmacen(estado, catalogo, 30)
  const resumen = resumirFilas(estado.existencias, prevision.final, prevision.flujos)

  it('Bree víveres: 310 inicial, 714 entradas, 975 consumido, 1.240 teórico, 265 de falta, 49 final, dos tramos de falta', () => {
    const fila = resumen.find((f) => f.dominioId === DOM.bree && f.recursoId === RECURSO.viveres)
    expect(fila).toBeDefined()
    expect(fila?.inicial).toBe(310)
    expect(fila?.entradas).toBeCloseTo(714, 3)
    expect(fila?.consumido).toBeCloseTo(975.333, 3)
    expect(fila?.consumoTeorico).toBeCloseTo(1240, 3)
    expect(fila?.falta).toBeCloseTo(264.667, 3)
    expect(fila?.final).toBeCloseTo(48.667, 3)
    expect(fila?.tramosDeFalta.map((t) => `${t.desde.dia}-${t.hasta.dia}`)).toEqual(['23-25', '7-11'])
  })

  it('Bree madera, piedra, arcilla, hierro, cerveza y lana, y Archet víveres (O3)', () => {
    expect(redondeaResumen(estado, 30, DOM.bree, RECURSO.madera)).toMatchObject({
      inicial: 420,
      entradas: 175,
      consumido: 297.6,
      falta: 0,
      final: 297.4,
    })
    expect(redondeaResumen(estado, 30, DOM.bree, RECURSO.piedra)).toMatchObject({
      inicial: 180,
      entradas: 83.333,
      consumido: 0,
      final: 263.333,
    })
    expect(redondeaResumen(estado, 30, DOM.bree, RECURSO.arcilla)).toMatchObject({
      inicial: 150,
      entradas: 6.667,
      final: 156.667,
    })
    expect(redondeaResumen(estado, 30, DOM.bree, RECURSO.hierro)).toMatchObject({ inicial: 64, entradas: 0, final: 64 })
    expect(redondeaResumen(estado, 30, DOM.bree, RECURSO.cerveza)).toMatchObject({
      inicial: 90,
      entradas: 100,
      consumido: 111.6,
      final: 78.4,
    })
    expect(redondeaResumen(estado, 30, DOM.bree, RECURSO.lana)).toMatchObject({ inicial: 35, entradas: 60, final: 95 })
    expect(redondeaResumen(estado, 30, DOM.archet, RECURSO.viveres)).toMatchObject({
      inicial: 900,
      entradas: 0,
      consumido: 310,
      final: 590,
    })
  })

  it('perdido y sacado son 0 en todas las filas del plazo', () => {
    for (const fila of resumen) {
      expect(fila.perdido).toBeCloseTo(0, 3)
      expect(fila.sacado).toBeCloseTo(0, 3)
    }
  })

  it('filas nuevas (D-056) y filas que solo salen en los flujos, detrás de las de `final`', () => {
    const claves = resumen.map((f) => `${f.dominioId}|${f.recursoId}`)
    // Las 8 filas de EXISTENCIAS van primero, en su orden (TC10).
    expect(claves.slice(0, 8)).toEqual([
      'dom.bree|recurso.viveres',
      'dom.bree|recurso.madera',
      'dom.bree|recurso.piedra',
      'dom.bree|recurso.arcilla',
      'dom.bree|recurso.hierro',
      'dom.bree|recurso.cerveza',
      'dom.bree|recurso.lana',
      'dom.archet|recurso.viveres',
    ])
  })
})

describe('diasDeReserva: O4 (12 de abril)', () => {
  const estado = estadoEjemplo()
  const reservas = diasDeReserva(estado, catalogo)
  const de = (dominioId: string, recursoId: string) =>
    reservas.find((r) => r.dominioId === dominioId && r.recursoId === recursoId)?.reserva

  it('Bree víveres 11 días (23 de abril), madera 85 (6 de julio) y cerveza 105 (26 de julio)', () => {
    expect(de(DOM.bree, RECURSO.viveres)).toEqual({ tipo: 'dias', dias: 11, fecha: F(23, 4) })
    expect(de(DOM.bree, RECURSO.madera)).toEqual({ tipo: 'dias', dias: 85, fecha: F(6, 7) })
    expect(de(DOM.bree, RECURSO.cerveza)).toEqual({ tipo: 'dias', dias: 105, fecha: F(26, 7) })
  })

  it('Archet víveres 88 días (9 de julio)', () => {
    expect(de(DOM.archet, RECURSO.viveres)).toEqual({ tipo: 'dias', dias: 88, fecha: F(9, 7) })
  })

  it('piedra, arcilla, hierro y lana: sin consumo', () => {
    expect(de(DOM.bree, RECURSO.piedra)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.bree, RECURSO.arcilla)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.bree, RECURSO.hierro)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.bree, RECURSO.lana)).toEqual({ tipo: 'sinConsumo' })
  })

  it('una fila que se consume pero no llega a faltar en 366 días da «sinFalta»', () => {
    // La cervecería de Bree con un almacén de cerveza sin límite: nunca falta ni se llena.
    const sinLimite: EstadoPartida = {
      ...estado,
      existencias: estado.existencias.map((e) =>
        e.dominioId === DOM.bree && e.recursoId === RECURSO.cerveza ? { ...e, cantidad: 1000000, capacidad: undefined } : e,
      ),
    }
    expect(diasDeReserva(sinLimite, catalogo).find((r) => r.dominioId === DOM.bree && r.recursoId === RECURSO.cerveza)?.reserva).toEqual({
      tipo: 'sinFalta',
    })
  })
})

describe('cabenElDia: O7', () => {
  it('hoy (12 de abril): 890 sacos de víveres caben en Bree', () => {
    const estado = estadoEjemplo()
    expect(cabenElDia(estado, catalogo, DOM.bree, RECURSO.viveres, F(12, 4))).toBe(890)
  })

  it('el 20 de abril, día en que volvería una compra de Fornost salida hoy (4 días de ruta), caben 1.148 sacos (esp l.633)', () => {
    // cabenElDia mira el hueco que quedaría ese día ANTES de la caravana que se está creando en el formulario:
    // se llama sobre el documento tal cual, sin añadir esa caravana todavía.
    const estado = estadoEjemplo()
    expect(cabenElDia(estado, catalogo, DOM.bree, RECURSO.viveres, F(20, 4))).toBe(1148)
  })

  it('sin capacidad, null', () => {
    const estado = estadoEjemplo()
    const sinLimite: EstadoPartida = {
      ...estado,
      existencias: estado.existencias.map((e) => (e.recursoId === RECURSO.hierro ? { ...e, capacidad: undefined } : e)),
    }
    expect(cabenElDia(sinLimite, catalogo, DOM.bree, RECURSO.hierro, F(1, 5))).toBeNull()
  })
})

describe('proximasProducciones: O6 (cantera, 12 de abril)', () => {
  it('piedra el 14 de abril (16,667) y arcilla el 1 de mayo (6,667)', () => {
    const estado = estadoEjemplo()
    const proximas = proximasProducciones(estado, catalogo, EDIFICIO.cantera)
    const piedra = proximas.find((p) => p.recursoId === RECURSO.piedra)
    const arcilla = proximas.find((p) => p.recursoId === RECURSO.arcilla)
    expect(piedra?.fecha).toEqual(F(14, 4))
    expect(piedra?.cantidad).toBeCloseTo(16.667, 3)
    expect(piedra?.perdida).toBeCloseTo(0, 3)
    expect(arcilla?.fecha).toEqual(F(1, 5))
    expect(arcilla?.cantidad).toBeCloseTo(6.667, 3)
  })

  it('un edificio que no existe da una lista vacía', () => {
    const estado = estadoEjemplo()
    expect(proximasProducciones(estado, catalogo, 'ed.no-existe')).toEqual([])
  })

  it('una producción cuya siguiente ocurrencia cae a más de 366 días no lleva cantidad ni pérdida', () => {
    const estado = estadoEjemplo()
    const conProduccionLejana: EstadoPartida = {
      ...estado,
      edificios: estado.edificios.map((e) =>
        e.id === EDIFICIO.redil
          ? {
              ...e,
              producciones: e.producciones.map((p) => ({
                ...p,
                recurrencia: { tipo: 'cadaNMeses', n: 12, diaMes: 1, primera: F(1, 1, 1650) },
                acumulado: { desde: F(1, 1, 1650), sumaFactores: 0 },
              })),
            }
          : e,
      ),
    }
    const proximas = proximasProducciones(conProduccionLejana, catalogo, EDIFICIO.redil)
    expect(proximas).toHaveLength(1)
    expect(proximas[0].fecha).toEqual(F(1, 1, 1650))
    expect('cantidad' in proximas[0]).toBe(false)
    expect('perdida' in proximas[0]).toBe(false)
  })
})
