import { describe, expect, it } from 'vitest'
import { RECURSO } from '../catalogo/inicial'
import { AJUSTE_EXISTENCIAS, DOM, EDIFICIO } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { validarCopia } from '../validacion/coherencia'
import {
  asegurarFila,
  bloqueoAlEliminarFila,
  editarExistencia,
  eliminarAjuste,
  eliminarFila,
} from './existencias'
import type { Sello } from './registros'

function catalogo() {
  return catalogosDeEjemplo()
}

function ejemplo(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

/** Un sello de prueba: ids en serie y una hora fija. */
function sello(): Sello {
  let ultimo = 0
  return { ahora: '2026-09-18T12:00:00.000Z', nuevoId: () => `sim.${(ultimo += 1)}` }
}

function filaDe(estado: EstadoPartida, dominioId: string, recursoId: string) {
  return estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
}

describe('asegurarFila', () => {
  it('crea la fila con 0 y sin capacidad si no está (D-056)', () => {
    const estado = asegurarFila(ejemplo(), DOM.bree, 'recurso.sal')
    const fila = filaDe(estado, DOM.bree, 'recurso.sal')
    expect(fila).toEqual({ dominioId: DOM.bree, recursoId: 'recurso.sal', cantidad: 0 })
  })

  it('la misma referencia si la fila ya estaba', () => {
    const entrada = ejemplo()
    const salida = asegurarFila(entrada, DOM.bree, RECURSO.viveres)
    expect(salida).toBe(entrada)
  })
})

describe('editarExistencia (O13)', () => {
  it('víveres de Bree a 300 con motivo: ajuste con delta −10', () => {
    const estado = editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { cantidad: 300, motivo: 'Ratas en el granero' }, sello(), catalogo())
    expect(filaDe(estado, DOM.bree, RECURSO.viveres)?.cantidad).toBe(300)
    const ajuste = estado.ajustesExistencias.find((a) => a.motivo === 'Ratas en el granero')
    expect(ajuste).toMatchObject({ dominioId: DOM.bree, recursoId: RECURSO.viveres, delta: -10 })
  })

  it('cantidad cambiada sin motivo lanza «El ajuste necesita un motivo»', () => {
    expect(() => editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { cantidad: 300 }, sello(), catalogo())).toThrow(
      'El ajuste necesita un motivo',
    )
  })

  it('por debajo de 0 lanza «Las existencias no pueden quedar por debajo de 0»', () => {
    expect(() =>
      editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { cantidad: -1, motivo: 'x' }, sello(), catalogo()),
    ).toThrow('Las existencias no pueden quedar por debajo de 0')
  })

  it('a 1.300 (capacidad 1.200): «Caben 890 sacos más»', () => {
    expect(() =>
      editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { cantidad: 1300, motivo: 'Cosecha' }, sello(), catalogo()),
    ).toThrow('Caben 890 sacos más')
  })

  it('bajar solo la capacidad por debajo de las existencias: «Las existencias no pueden superar la capacidad»', () => {
    expect(() =>
      editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { capacidad: 100 }, sello(), catalogo()),
    ).toThrow('Las existencias no pueden superar la capacidad')
  })

  it('sin cambios, la misma referencia', () => {
    const entrada = ejemplo()
    const salida = editarExistencia(entrada, DOM.bree, RECURSO.viveres, {}, sello(), catalogo())
    expect(salida).toBe(entrada)
    const salida2 = editarExistencia(entrada, DOM.bree, RECURSO.viveres, { cantidad: 310, capacidad: 1200 }, sello(), catalogo())
    expect(salida2).toBe(entrada)
  })

  it('capacidad a null quita el límite', () => {
    const estado = editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { capacidad: null }, sello(), catalogo())
    expect(filaDe(estado, DOM.bree, RECURSO.viveres)?.capacidad).toBeUndefined()
    expect(estado.ajustesExistencias).toHaveLength(1) // el de la madera podrida, sin uno nuevo (no cambió la cantidad)
  })

  it('asegura la fila si el recurso no la tenía (D-056)', () => {
    const estado = editarExistencia(ejemplo(), DOM.bree, 'recurso.sal', { cantidad: 20, motivo: 'Compra' }, sello(), catalogo())
    expect(filaDe(estado, DOM.bree, 'recurso.sal')?.cantidad).toBe(20)
  })

  it('el resultado pasa validarCopia', () => {
    const estado = editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { cantidad: 300, motivo: 'Ratas' }, sello(), catalogo())
    expect(validarCopia({ ...estado, avances: documentoDeEjemplo().avances }, catalogo())).toEqual([])
  })
})

describe('eliminarAjuste (O13)', () => {
  it('deshace la cantidad: madera vuelve a 425', () => {
    const estado = eliminarAjuste(ejemplo(), AJUSTE_EXISTENCIAS.maderaPodrida, catalogo())
    expect(filaDe(estado, DOM.bree, RECURSO.madera)?.cantidad).toBe(425)
    expect(estado.ajustesExistencias.find((a) => a.id === AJUSTE_EXISTENCIAS.maderaPodrida)).toBeUndefined()
  })

  it('bloquea si deshacerlo bajaría de 0 o pasaría de la capacidad', () => {
    const base = ejemplo()
    const conPoco = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.madera ? { ...e, cantidad: 2 } : e)),
    }
    expect(() => eliminarAjuste(conPoco, AJUSTE_EXISTENCIAS.maderaPodrida, catalogo())).not.toThrow()
    const conCasiNada = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.madera ? { ...e, cantidad: 1 } : e)),
      ajustesExistencias: base.ajustesExistencias.map((a) =>
        a.id === AJUSTE_EXISTENCIAS.maderaPodrida ? { ...a, delta: 5 } : a,
      ),
    }
    expect(() => eliminarAjuste(conCasiNada, AJUSTE_EXISTENCIAS.maderaPodrida, catalogo())).toThrow(
      'Las existencias no pueden quedar por debajo de 0',
    )
  })

  it('si la fila ya no existe, solo borra el ajuste', () => {
    const base = ejemplo()
    const sinFila = {
      ...base,
      existencias: base.existencias.filter((e) => e.recursoId !== RECURSO.madera),
    }
    const estado = eliminarAjuste(sinFila, AJUSTE_EXISTENCIAS.maderaPodrida, catalogo())
    expect(estado.ajustesExistencias.find((a) => a.id === AJUSTE_EXISTENCIAS.maderaPodrida)).toBeUndefined()
    expect(filaDe(estado, DOM.bree, RECURSO.madera)).toBeUndefined()
  })
})

describe('bloqueoAlEliminarFila (O13)', () => {
  it('los víveres no se pueden quitar', () => {
    expect(bloqueoAlEliminarFila(ejemplo(), DOM.bree, RECURSO.viveres, catalogo())).toBe(
      'Los víveres no se pueden quitar del almacén',
    )
  })

  it('con existencias, dice cuántas quedan', () => {
    expect(bloqueoAlEliminarFila(ejemplo(), DOM.bree, RECURSO.hierro, catalogo())).toBe(
      'Solo se quita una fila sin existencias: quedan 64 lingotes',
    )
  })

  it('un edificio que la produce lo bloquea, con el estado si no está activo', () => {
    const base = ejemplo()
    // Arcilla a 0 sigue bloqueada porque la cantera la produce.
    const conArcillaA0 = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.arcilla ? { ...e, cantidad: 0 } : e)),
    }
    expect(bloqueoAlEliminarFila(conArcillaA0, DOM.bree, RECURSO.arcilla, catalogo())).toBe('Cantera produce arcilla')
  })

  it('un edificio alquilado añade el estado', () => {
    const base = ejemplo()
    const conHarina = {
      ...base,
      edificios: [
        ...base.edificios,
        {
          id: 'ed.molino2',
          dominioId: DOM.bree,
          tipoId: 'edificio.molino',
          nombre: 'Molino',
          estado: 'alquilado' as const,
          trabajadoresNecesarios: 0,
          producciones: [
            {
              id: 'prod.harina',
              recursoId: 'recurso.harina',
              cantidad: 10,
              recurrencia: { tipo: 'mensual' as const, diaMes: 1 },
              acumulado: { desde: base.partida.fechaActual, sumaFactores: 0 },
            },
          ],
        },
      ],
    }
    const catalogoConHarina = catalogo()
    catalogoConHarina.recursos.push({
      id: 'recurso.harina',
      nombre: 'Harina',
      unidadSingular: 'saco',
      unidadPlural: 'sacos',
      propia: false,
    })
    expect(bloqueoAlEliminarFila(conHarina, DOM.bree, 'recurso.harina', catalogoConHarina)).toBe(
      'Molino produce harina (estado: Alquilado)',
    )
  })

  it('un consumo por habitante lo bloquea (sin el edificio que también la produce)', () => {
    const base = ejemplo()
    const conCervezaA0 = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.cerveza ? { ...e, cantidad: 0 } : e)),
      edificios: base.edificios.filter((e) => e.id !== EDIFICIO.cerveceria),
    }
    expect(bloqueoAlEliminarFila(conCervezaA0, DOM.bree, RECURSO.cerveza, catalogo())).toBe(
      'El consumo «Cerveza» descuenta de esta fila',
    )
  })

  it('una obra sin terminar que necesita el material lo bloquea (sin el edificio que también lo produce)', () => {
    const base = ejemplo()
    const conPiedraA0 = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.piedra ? { ...e, cantidad: 0 } : e)),
      edificios: base.edificios.filter((e) => e.id !== EDIFICIO.cantera),
    }
    expect(bloqueoAlEliminarFila(conPiedraA0, DOM.bree, RECURSO.piedra, catalogo())).toBe(
      'La obra «Nuevo granero» necesita esta fila',
    )
  })

  it('una caravana sin terminar que lleva el recurso lo bloquea', () => {
    const base = ejemplo()
    const conLanaA0 = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.lana ? { ...e, cantidad: 0 } : e)),
      obras: [],
      poblaciones: base.poblaciones.map((p) => ({ ...p, consumos: [] })),
      edificios: base.edificios.filter((e) => e.id !== EDIFICIO.redil),
      caravanas: [
        ...base.caravanas,
        {
          id: 'car.lana',
          dominioId: DOM.bree,
          operacion: 'compra' as const,
          mercadoId: 'mer.fornost',
          carga: { recursoId: RECURSO.lana, cantidad: 20 },
          precioUnidad: { base: 30000 },
          importe: { base: 600000 },
          salida: { anio: 1640, mes: 4, dia: 12 },
          vuelta: { anio: 1640, mes: 4, dia: 20 },
          estado: 'enRuta' as const,
        },
      ],
    }
    expect(bloqueoAlEliminarFila(conLanaA0, DOM.bree, RECURSO.lana, catalogo())).toBe(
      'La caravana de compra a Fornost necesita esta fila',
    )
  })

  it('una entrada sin aplicar lo bloquea (sin las obras que también necesitan el recurso)', () => {
    const base = ejemplo()
    const conEntrada = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.hierro ? { ...e, cantidad: 0 } : e)),
      obras: [],
      entradasAlmacen: [
        {
          id: 'ent.x',
          dominioId: DOM.bree,
          recursoId: RECURSO.hierro,
          cantidad: 10,
          operacion: 'recepcion' as const,
          fecha: { anio: 1640, mes: 4, dia: 20 },
          aplicada: false,
        },
      ],
    }
    expect(bloqueoAlEliminarFila(conEntrada, DOM.bree, RECURSO.hierro, catalogo())).toBe(
      'La compra o recepción del 20 de abril necesita esta fila',
    )
  })

  it('sin ningún motivo, null', () => {
    const base = ejemplo()
    const conHierroA0 = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.hierro ? { ...e, cantidad: 0 } : e)),
      obras: [],
    }
    expect(bloqueoAlEliminarFila(conHierroA0, DOM.bree, RECURSO.hierro, catalogo())).toBeNull()
  })
})

describe('eliminarFila', () => {
  it('quita la fila cuando no hay bloqueo', () => {
    const base = ejemplo()
    const conHierroA0 = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.hierro ? { ...e, cantidad: 0 } : e)),
      obras: [],
    }
    const estado = eliminarFila(conHierroA0, DOM.bree, RECURSO.hierro, catalogo())
    expect(filaDe(estado, DOM.bree, RECURSO.hierro)).toBeUndefined()
  })

  it('lanza el bloqueo si lo hay', () => {
    expect(() => eliminarFila(ejemplo(), DOM.bree, RECURSO.viveres, catalogo())).toThrow(
      'Los víveres no se pueden quitar del almacén',
    )
  })
})
