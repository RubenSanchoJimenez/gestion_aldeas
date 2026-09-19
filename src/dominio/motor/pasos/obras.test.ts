import { describe, expect, it } from 'vitest'
import { filaEn } from '../almacen'
import { diasEntre, type Fecha } from '../../calendario/fecha'
import { RECURSO } from '../../catalogo/inicial'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import { DEFENSA, DOM, OBRA } from '../../ejemplo/ids'
import type { Obra } from '../../modelo/asentamiento'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import { crearContexto, type Contexto } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, estadoMinimo, recorrerPasos } from '../pruebas/constructores'
import type { OpcionesSimulacion } from '../tipos'
import { pasoInicio } from './inicio'
import { pasoObras } from './obras'

/** El 12 de abril de 1640: la fecha actual del ejemplo y de estadoMinimo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

function fecha(dia: number, mes = 4): Fecha {
  return { anio: 1640, mes, dia }
}

function opciones(): OpcionesSimulacion {
  return { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** Contexto que recorre pasoObras desde el primer día hasta `hasta`, incluido. */
function recorrer(estado: EstadoPartida, hasta: Fecha): Contexto {
  const ctx = crearContexto(estado, hasta, opciones())
  recorrerPasos(ctx, diasEntre(ctx.primerDia, hasta) + 1, [pasoObras])
  return ctx
}

describe('pasoObras: O8, el ejemplo', () => {
  it('la puerta termina el 17: la defensa pasa a buena y se empuja el suceso', () => {
    const ctx = recorrer(estadoDe(documentoDeEjemplo()), fecha(17))
    const puerta = ctx.obras.find((o) => o.id === OBRA.puerta)
    expect(puerta?.estado).toBe('terminada')
    const defensa = ctx.defensas.find((d) => d.id === DEFENSA.puerta)
    expect(defensa?.estado).toBe('buena')
    expect(ctx.sucesos).toContainEqual({
      tipo: 'obraTerminada',
      dominioId: DOM.bree,
      fecha: fecha(17),
      nombre: 'Reparación de la puerta del sur',
    })
  })

  it('el granero termina el 19 de mayo: la capacidad de víveres de Bree pasa de 1.200 a 2.000', () => {
    const ctx = recorrer(estadoDe(documentoDeEjemplo()), fecha(19, 5))
    const granero = ctx.obras.find((o) => o.id === OBRA.granero)
    expect(granero?.estado).toBe('terminada')
    expect(filaEn(ctx, DOM.bree, RECURSO.viveres)?.capacidad).toBe(2000)
  })

  it('el molino de Archet termina el 28 de abril: nace el edificio, inactivo y con el aviso pendiente', () => {
    const ctx = recorrer(estadoDe(documentoDeEjemplo()), fecha(28))
    const molino = ctx.obras.find((o) => o.id === OBRA.molinoArchet)
    expect(molino?.estado).toBe('terminada')
    const nuevo = ctx.edificios.find((e) => e.dominioId === DOM.archet)
    expect(nuevo).toMatchObject({
      dominioId: DOM.archet,
      nombre: 'Molino',
      estado: 'inactivo',
      trabajadoresNecesarios: 0,
      producciones: [],
      avisoPendiente: { tipo: 'terminadoSinProduccion', obraId: OBRA.molinoArchet },
    })
    expect(ctx.sucesos).toContainEqual({
      tipo: 'obraTerminada',
      dominioId: DOM.archet,
      fecha: fecha(28),
      nombre: 'Molino',
    })
  })
})

describe('pasoObras: efectos sueltos', () => {
  function obraDePrueba(datos: Partial<Obra> & Pick<Obra, 'efecto'>): Obra {
    return {
      id: 'obra.prueba',
      dominioId: 'dom.aldea',
      nombre: 'Obra de prueba',
      estado: 'enCurso',
      coste: { base: 0 },
      materiales: {},
      inicio: fecha(13),
      diasTotales: 1,
      ...datos,
    }
  }

  it('mejorarEdificio pone el aviso pendiente «mejoraTerminada» en el edificio objetivo', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      edificios: [
        {
          id: 'ed.prueba',
          dominioId: 'dom.aldea',
          tipoId: 'tipo.prueba',
          nombre: 'Molino',
          estado: 'activo',
          trabajadoresNecesarios: 0,
          producciones: [],
        },
      ],
      obras: [obraDePrueba({ efecto: { tipo: 'mejorarEdificio', objetivoId: 'ed.prueba' } })],
    }
    const ctx = recorrer(estado, fecha(13))
    const edificio = ctx.edificios.find((e) => e.id === 'ed.prueba')
    expect(edificio?.avisoPendiente).toEqual({ tipo: 'mejoraTerminada', obraId: 'obra.prueba' })
  })

  it('mejorarEdificio sobre un edificio que ya no existe no hace nada', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [obraDePrueba({ efecto: { tipo: 'mejorarEdificio', objetivoId: 'ed.inexistente' } })],
    }
    const ctx = recorrer(estado, fecha(13))
    expect(ctx.obras[0].estado).toBe('terminada')
    expect(ctx.edificios).toEqual([])
  })

  it('crearDefensa añade una defensa nueva en estado «buena»', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [obraDePrueba({ nombre: 'Nueva muralla', efecto: { tipo: 'crearDefensa', tipoId: 'tipo.muralla' } })],
    }
    const ctx = recorrer(estado, fecha(13))
    expect(ctx.defensas).toEqual([
      { id: expect.any(String), dominioId: 'dom.aldea', tipoId: 'tipo.muralla', nombre: 'Nueva muralla', estado: 'buena' },
    ])
  })

  it('repararEdificio pasa el edificio objetivo a «activo»', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      edificios: [
        {
          id: 'ed.prueba',
          dominioId: 'dom.aldea',
          tipoId: 'tipo.prueba',
          nombre: 'Molino',
          estado: 'daniado',
          trabajadoresNecesarios: 0,
          producciones: [],
        },
      ],
      obras: [obraDePrueba({ efecto: { tipo: 'repararEdificio', objetivoId: 'ed.prueba' } })],
    }
    const ctx = recorrer(estado, fecha(13))
    expect(ctx.edificios.find((e) => e.id === 'ed.prueba')?.estado).toBe('activo')
  })

  it('una obra en curso con fin ya pasado se aplica el primer día del avance', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [obraDePrueba({ inicio: fecha(1), diasTotales: 3, efecto: { tipo: 'crearDefensa', tipoId: 'tipo.torre' } })],
    }
    const ctx = recorrer(estado, fecha(20))
    // ctx.primerDia es el 13 de abril: el fin (3 de abril) ya había pasado.
    expect(ctx.obras[0].estado).toBe('terminada')
    expect(ctx.sucesos).toContainEqual({ tipo: 'obraTerminada', dominioId: 'dom.aldea', fecha: fecha(13), nombre: 'Obra de prueba' })
  })

  it('ampliarAlmacen en un recurso sin capacidad lo deja sin límite (D-056)', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 40 }],
      obras: [obraDePrueba({ efecto: { tipo: 'ampliarAlmacen', recursoId: RECURSO.madera, valor: 100 } })],
    }
    const ctx = recorrer(estado, fecha(13))
    expect(filaEn(ctx, 'dom.aldea', RECURSO.madera)).toEqual({ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 40 })
  })

  it('ampliarAlmacen de un recurso sin fila la crea con 0 y sin capacidad (D-056)', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [obraDePrueba({ efecto: { tipo: 'ampliarAlmacen', recursoId: RECURSO.piedra, valor: 100 } })],
    }
    const ctx = recorrer(estado, fecha(13))
    expect(filaEn(ctx, 'dom.aldea', RECURSO.piedra)).toEqual({ dominioId: 'dom.aldea', recursoId: RECURSO.piedra, cantidad: 0 })
  })

  it('una obra de 1 día que empieza hoy también termina hoy (pasos 3 y 6 el mismo día)', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [
        {
          id: 'obra.prueba',
          dominioId: 'dom.aldea',
          nombre: 'Obra rápida',
          estado: 'programada',
          coste: { base: 0 },
          materiales: {},
          inicio: fecha(13),
          diasTotales: 1,
          efecto: { tipo: 'crearDefensa', tipoId: 'tipo.torre' },
        },
      ],
    }
    const ctx = crearContexto(estado, fecha(13), opciones())
    // El paso 3 la empieza hoy (sin materiales ni coste) y el paso 6, en el mismo día, la termina.
    recorrerPasos(ctx, 1, [pasoInicio, pasoObras])
    expect(ctx.obras[0].estado).toBe('terminada')
    expect(ctx.defensas).toHaveLength(1)
  })
})
