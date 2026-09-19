import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM, EDIFICIO, EVENTO, IMPUESTO, OBRA, PRODUCCION, TRABAJADOR } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { RECURSO, idDeOpcion } from '../catalogo/inicial'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import type { Sello } from './registros'
import { bloqueoAlEliminarEdificio, crearEdificio, eliminarEdificio, guardarEdificio, type DatosEdificio } from './edificios'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** La fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }
const MANANA: Fecha = { anio: 1640, mes: 4, dia: 13 }

/** Un sello nuevo en cada prueba: los ids salen «nuevo.1», «nuevo.2»… */
function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

/** La partida de ejemplo congelada: si una función escribe en su entrada, la prueba falla. */
function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

/** El edificio con ese id, tal y como queda en el estado. */
function edificio(documento: DocumentoPartida, id: Id) {
  const e = documento.edificios.find((x) => x.id === id)
  if (e === undefined) {
    throw new Error(`No está «${id}»`)
  }
  return e
}

const catalogo = catalogosDeEjemplo()

describe('guardarEdificio', () => {
  it('la producción con el mismo id, recurso y frecuencia conserva su acumulado (O13, cantera: piedra 25 → 30)', () => {
    const documento = ejemplo()
    const cantera = edificio(documento, EDIFICIO.cantera)
    const datos = {
      tipoId: cantera.tipoId,
      nombre: cantera.nombre,
      estado: cantera.estado,
      trabajadoresNecesarios: cantera.trabajadoresNecesarios,
      producciones: [
        { id: PRODUCCION.canteraPiedra, recursoId: RECURSO.piedra, cantidad: 30, recurrencia: cantera.producciones[0].recurrencia },
        cantera.producciones[1],
      ],
    }
    const estado = guardarEdificio(documento, EDIFICIO.cantera, datos, sello(), catalogo)
    const nueva = edificio(estado, EDIFICIO.cantera).producciones.find((p) => p.id === PRODUCCION.canteraPiedra)!
    expect(nueva.cantidad).toBe(30)
    expect(nueva.acumulado).toEqual({ desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 10 / 3 })
  })

  it('cambiar la frecuencia reinicia el acumulado a mañana (O13, cantera: arcilla a «Mensual · día 15»)', () => {
    const documento = ejemplo()
    const cantera = edificio(documento, EDIFICIO.cantera)
    const datos = {
      tipoId: cantera.tipoId,
      nombre: cantera.nombre,
      estado: cantera.estado,
      trabajadoresNecesarios: cantera.trabajadoresNecesarios,
      producciones: [
        cantera.producciones[0],
        { id: PRODUCCION.canteraArcilla, recursoId: RECURSO.arcilla, cantidad: 10, recurrencia: { tipo: 'mensual' as const, diaMes: 15 } },
      ],
    }
    const estado = guardarEdificio(documento, EDIFICIO.cantera, datos, sello(), catalogo)
    const nueva = edificio(estado, EDIFICIO.cantera).producciones.find((p) => p.id === PRODUCCION.canteraArcilla)!
    expect(nueva.acumulado).toEqual({ desde: MANANA, sumaFactores: 0 })
  })

  it('dos producciones del mismo recurso y la misma frecuencia lanza «Ya produce piedra semanal: cambia su cantidad»', () => {
    const documento = ejemplo()
    const cantera = edificio(documento, EDIFICIO.cantera)
    const datos = {
      tipoId: cantera.tipoId,
      nombre: cantera.nombre,
      estado: cantera.estado,
      trabajadoresNecesarios: cantera.trabajadoresNecesarios,
      producciones: [
        { recursoId: RECURSO.piedra, cantidad: 25, recurrencia: { tipo: 'semanal' as const, diaSemana: 5 as const, inicio: HOY } },
        { recursoId: RECURSO.piedra, cantidad: 10, recurrencia: { tipo: 'semanal' as const, diaSemana: 5 as const, inicio: HOY } },
      ],
    }
    expect(() => guardarEdificio(documento, EDIFICIO.cantera, datos, sello(), catalogo)).toThrow(
      'Ya produce piedra semanal: cambia su cantidad',
    )
  })

  it('un producto nuevo asegura su fila y arranca a 0 desde mañana', () => {
    const documento = ejemplo()
    const cantera = edificio(documento, EDIFICIO.cantera)
    const datos = {
      tipoId: cantera.tipoId,
      nombre: cantera.nombre,
      estado: cantera.estado,
      trabajadoresNecesarios: cantera.trabajadoresNecesarios,
      producciones: [
        ...cantera.producciones,
        { recursoId: RECURSO.hierro, cantidad: 5, recurrencia: { tipo: 'mensual' as const, diaMes: 1 } },
      ],
    }
    const estado = guardarEdificio(documento, EDIFICIO.cantera, datos, sello(), catalogo)
    const nueva = edificio(estado, EDIFICIO.cantera).producciones.at(-1)!
    expect(nueva.recursoId).toBe(RECURSO.hierro)
    expect(nueva.acumulado).toEqual({ desde: MANANA, sumaFactores: 0 })
    expect(estado.existencias.some((e) => e.dominioId === DOM.bree && e.recursoId === RECURSO.hierro)).toBe(true)
  })

  it('un producto que no viene en los datos se quita', () => {
    const documento = ejemplo()
    const cantera = edificio(documento, EDIFICIO.cantera)
    const datos = {
      tipoId: cantera.tipoId,
      nombre: cantera.nombre,
      estado: cantera.estado,
      trabajadoresNecesarios: cantera.trabajadoresNecesarios,
      producciones: [cantera.producciones[0]],
    }
    const estado = guardarEdificio(documento, EDIFICIO.cantera, datos, sello(), catalogo)
    expect(edificio(estado, EDIFICIO.cantera).producciones).toHaveLength(1)
    expect(edificio(estado, EDIFICIO.cantera).producciones[0].id).toBe(PRODUCCION.canteraPiedra)
  })

  it('sin cambios pero con avisoPendiente, lo quita', () => {
    const documento = ejemplo()
    const conAviso: DocumentoPartida = {
      ...documento,
      edificios: documento.edificios.map((e) =>
        e.id === EDIFICIO.molino ? { ...e, avisoPendiente: { tipo: 'terminadoSinProduccion' as const, obraId: OBRA.molinoArchet } } : e,
      ),
    }
    const molino = edificio(conAviso, EDIFICIO.molino)
    const datos = {
      tipoId: molino.tipoId,
      nombre: molino.nombre,
      estado: molino.estado,
      trabajadoresNecesarios: molino.trabajadoresNecesarios,
      producciones: [],
    }
    const estado = guardarEdificio(conAviso, EDIFICIO.molino, datos, sello(), catalogo)
    expect(edificio(estado, EDIFICIO.molino).avisoPendiente).toBeUndefined()
  })

  it('sin aviso y sin cambios, la misma referencia', () => {
    const documento = ejemplo()
    const molino = edificio(documento, EDIFICIO.molino)
    const datos = {
      tipoId: molino.tipoId,
      nombre: molino.nombre,
      estado: molino.estado,
      trabajadoresNecesarios: molino.trabajadoresNecesarios,
      producciones: [],
    }
    const estado = guardarEdificio(documento, EDIFICIO.molino, datos, sello(), catalogo)
    expect(estado).toBe(documento)
  })
})

describe('crearEdificio', () => {
  it('empieza sus producciones a 0 desde mañana y asegura las filas', () => {
    const documento = ejemplo()
    const datos: DatosEdificio = {
      dominioId: DOM.bree,
      tipoId: idDeOpcion('tiposEdificio', 'Herrería'),
      nombre: 'Forja nueva',
      estado: 'activo',
      trabajadoresNecesarios: 2,
      producciones: [{ recursoId: RECURSO.hierro, cantidad: 8, recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: HOY } }],
    }
    const { estado, id } = crearEdificio(documento, datos, sello(), catalogo)
    expect(id).toBe('nuevo.1')
    const nuevo = edificio(estado, 'nuevo.1')
    expect(nuevo.nombre).toBe('Forja nueva')
    expect(nuevo.producciones[0].acumulado).toEqual({ desde: MANANA, sumaFactores: 0 })
    expect(estado.existencias.some((e) => e.dominioId === DOM.bree && e.recursoId === RECURSO.hierro)).toBe(true)
  })
})

describe('bloqueoAlEliminarEdificio', () => {
  it('«Antes, termina o elimina la obra «Ampliar la cervecería»» (O13)', () => {
    const documento = ejemplo()
    expect(bloqueoAlEliminarEdificio(documento, EDIFICIO.cerveceria)).toBe(
      'Antes, termina o elimina la obra «Ampliar la cervecería»',
    )
  })

  it('null cuando ninguna obra sin terminar lo mejora ni lo repara', () => {
    const documento = ejemplo()
    expect(bloqueoAlEliminarEdificio(documento, EDIFICIO.molino)).toBeNull()
  })
})

describe('eliminarEdificio', () => {
  it('el molino de Bree: la renta «Alquiler del molino» pierde edificioId (O13)', () => {
    const documento = ejemplo()
    const estado = eliminarEdificio(documento, EDIFICIO.molino)
    const renta = estado.impuestosRentas.find((i) => i.id === IMPUESTO.alquilerMolino)!
    expect(renta.edificioId).toBeUndefined()
  })

  it('la cantera: los canteros pierden edificioId y la producción de piedra del 7 de abril se queda (O13)', () => {
    const documento = ejemplo()
    const estado = eliminarEdificio(documento, EDIFICIO.cantera)
    const canteros = estado.trabajadores.find((t) => t.id === TRABAJADOR.canteros)!
    expect(canteros.edificioId).toBeUndefined()
    expect(estado.produccionesRealizadas.some((p) => p.edificioId === EDIFICIO.cantera)).toBe(true)
    expect(estado.edificios.some((e) => e.id === EDIFICIO.cantera)).toBe(false)
  })

  it('quita el efecto de un evento que lo apuntaba (las granjas de las lluvias)', () => {
    const documento = ejemplo()
    const estado = eliminarEdificio(documento, EDIFICIO.granjas)
    const lluvias = estado.eventos.find((e) => e.id === EVENTO.lluvias)
    expect(lluvias?.efectos).toEqual([])
  })

  it('la partida resultante sigue siendo válida (validarCopia, depende de la tarea 20)', () => {
    const documento = ejemplo()
    const estado = eliminarEdificio(documento, EDIFICIO.cantera)
    expect(validarCopia(estado, catalogo)).toEqual([])
  })
})
