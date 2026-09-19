import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { RECURSO } from '../catalogo/inicial'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Caravana } from '../modelo/comercio'
import type { Edificio, Obra } from '../modelo/asentamiento'
import type { EstadoPartida } from '../modelo/documento'
import { conAsentamiento, conFila, estadoMinimo } from '../motor/pruebas/constructores'
import { avisosDeEdificios, avisosDeObrasYCaravanas } from './pendientes'

/** El 12 de abril de 1640: la fecha actual de `estadoMinimo`. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

function F(dia: number, mes: number, anio = 1640): Fecha {
  return { anio, mes, dia }
}

const catalogo: CatalogosEnCopia = catalogosDeEjemplo()

/** Un asentamiento de prueba con caja y, si se pide, una fila de piedra. */
function base(caja: number, piedra = 0): EstadoPartida {
  const estado = conAsentamiento(estadoMinimo(HOY), { id: 'dom.prueba', nombre: 'Prueba', caja })
  return conFila(estado, { dominioId: 'dom.prueba', recursoId: RECURSO.piedra, cantidad: piedra })
}

function conObra(estado: EstadoPartida, obra: Partial<Obra> & Pick<Obra, 'estado' | 'materiales'>): EstadoPartida {
  const completa: Obra = {
    id: 'obra.prueba',
    dominioId: 'dom.prueba',
    nombre: 'Horno comunal',
    coste: { base: 0 },
    diasTotales: 10,
    efecto: { tipo: 'crearDefensa', tipoId: 'tipo.defensa' },
    ...obra,
  }
  return { ...estado, obras: [...estado.obras, completa] }
}

function conCaravana(estado: EstadoPartida, caravana: Partial<Caravana> & Pick<Caravana, 'operacion' | 'carga' | 'salida' | 'vuelta'>): EstadoPartida {
  const completa: Caravana = {
    id: 'car.prueba',
    dominioId: 'dom.prueba',
    estado: 'programada',
    ...caravana,
  }
  return { ...estado, caravanas: [...estado.caravanas, completa] }
}

describe('avisosDeObrasYCaravanas: obras', () => {
  it('programada con la fecha pasada, sin materiales ni dinero: «por falta de 20 carretadas de cal y 12 mo en la caja»', () => {
    const estado = conObra(base(0, 0), {
      estado: 'programada',
      inicio: F(10, 4),
      materiales: { 'recurso.piedra': 20 },
      movimientoId: 'mov.prueba',
    })
    const conMovimiento: EstadoPartida = {
      ...estado,
      movimientos: [
        {
          id: 'mov.prueba',
          dominioId: 'dom.prueba',
          fecha: F(10, 4),
          tipo: 'gasto',
          importe: { base: -1200000 },
          categoriaId: 'cat.obras',
          concepto: 'Obra: horno comunal',
          origen: 'manual',
          programado: true,
        },
      ],
    }
    const avisos = avisosDeObrasYCaravanas(conMovimiento, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'obraQueNoPudoEmpezar',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La obra «Horno comunal» no pudo empezar por falta de 20 carretadas de piedra y 12 mo en la caja',
      },
    ])
  })

  it('una programada con inicio futuro no avisa', () => {
    const estado = conObra(base(0, 0), { estado: 'programada', inicio: F(20, 4), materiales: {} })
    expect(avisosDeObrasYCaravanas(estado, catalogo)).toEqual([])
  })

  it('sin faltas (dinero y materiales de sobra), sin «por falta de»', () => {
    const estado = conObra(base(10000000, 100), {
      estado: 'programada',
      inicio: F(12, 4),
      materiales: { 'recurso.piedra': 20 },
    })
    const avisos = avisosDeObrasYCaravanas(estado, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'obraQueNoPudoEmpezar',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La obra «Horno comunal» no pudo empezar',
      },
    ])
  })
})

describe('avisosDeObrasYCaravanas: caravanas', () => {
  it('compra programada sin dinero: «no pudo salir por falta de … en la caja»', () => {
    const estado = conCaravana(base(0), {
      operacion: 'compra',
      mercadoId: 'mercado.fornost',
      carga: { recursoId: RECURSO.viveres, cantidad: 100 },
      importe: { base: 3000000 },
      movimientoSalidaId: 'mov.compra',
      salida: F(10, 4),
      vuelta: F(14, 4),
    })
    const estadoConNombre: EstadoPartida = {
      ...estado,
      mercados: [{ id: 'mercado.fornost', nombre: 'Fornost', precios: [] }],
      movimientos: [
        {
          id: 'mov.compra',
          dominioId: 'dom.prueba',
          fecha: F(10, 4),
          tipo: 'gasto',
          importe: { base: -3000000 },
          categoriaId: 'cat.comercio',
          concepto: 'Caravana: compra de víveres en Fornost',
          origen: 'manual',
          programado: true,
        },
      ],
    }
    const avisos = avisosDeObrasYCaravanas(estadoConNombre, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'caravanaQueNoPudoSalir',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La caravana de compra a Fornost no pudo salir por falta de 30 mo en la caja',
      },
    ])
  })

  it('venta programada sin carga: «no pudo salir por falta de … barriles de cerveza»', () => {
    const estado = conCaravana(base(0), {
      operacion: 'venta',
      mercadoId: 'mercado.fornost',
      carga: { recursoId: RECURSO.cerveza, cantidad: 10 },
      importe: { base: 400000 },
      salida: F(10, 4),
      vuelta: F(14, 4),
    })
    const estadoConNombre: EstadoPartida = { ...estado, mercados: [{ id: 'mercado.fornost', nombre: 'Fornost', precios: [] }] }
    const avisos = avisosDeObrasYCaravanas(estadoConNombre, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'caravanaQueNoPudoSalir',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La caravana de venta a Fornost no pudo salir por falta de 10 barriles de cerveza',
      },
    ])
  })

  it('traslado programado sin carga: «no pudo salir por falta de … » con el asentamiento de destino', () => {
    const conDestino = conAsentamiento(base(0), { id: 'dom.destino', nombre: 'Destino', caja: 0 })
    const estado = conCaravana(conDestino, {
      operacion: 'traslado',
      destinoId: 'dom.destino',
      carga: { recursoId: RECURSO.madera, cantidad: 30 },
      salida: F(10, 4),
      vuelta: F(13, 4),
    })
    const avisos = avisosDeObrasYCaravanas(estado, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'caravanaQueNoPudoSalir',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La caravana de traslado a Destino no pudo salir por falta de 30 haces de madera',
      },
    ])
  })

  it('compra del mercado local sin aplicar y sin dinero: avisoCompraQueNoPudoHacerse', () => {
    const estado: EstadoPartida = {
      ...base(0),
      mercados: [{ id: 'mercado.prueba', nombre: 'Prueba', localDe: 'dom.prueba', precios: [] }],
      entradasAlmacen: [
        {
          id: 'entrada.prueba',
          dominioId: 'dom.prueba',
          recursoId: RECURSO.viveres,
          cantidad: 100,
          operacion: 'compra',
          mercadoId: 'mercado.prueba',
          precioUnidad: { base: 40000 },
          movimientoId: 'mov.entrada',
          fecha: F(10, 4),
          aplicada: false,
        },
      ],
      movimientos: [
        {
          id: 'mov.entrada',
          dominioId: 'dom.prueba',
          fecha: F(10, 4),
          tipo: 'gasto',
          importe: { base: -4000000 },
          categoriaId: 'cat.viveres-del-almacen',
          concepto: 'Compra de víveres en Prueba',
          origen: 'manual',
          programado: true,
        },
      ],
    }
    const avisos = avisosDeObrasYCaravanas(estado, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'caravanaQueNoPudoSalir',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La compra de víveres en Prueba no pudo hacerse por falta de 40 mo en la caja',
      },
    ])
  })
})

describe('avisosDeEdificios', () => {
  it('edificioTerminadoSinProduccion y mejoraTerminada, ámbar, fecha actual', () => {
    const edificioNuevo: Edificio = {
      id: 'ed.nuevo',
      dominioId: 'dom.prueba',
      tipoId: 'tipo.edificio',
      nombre: 'Molino',
      estado: 'inactivo',
      trabajadoresNecesarios: 0,
      producciones: [],
      avisoPendiente: { tipo: 'terminadoSinProduccion', obraId: 'obra.molino' },
    }
    const edificioMejorado: Edificio = {
      id: 'ed.mejorado',
      dominioId: 'dom.prueba',
      tipoId: 'tipo.edificio',
      nombre: 'Cantera',
      estado: 'activo',
      trabajadoresNecesarios: 3,
      producciones: [],
      avisoPendiente: { tipo: 'mejoraTerminada', obraId: 'obra.cantera' },
    }
    const estado: EstadoPartida = { ...base(0), edificios: [edificioNuevo, edificioMejorado] }
    expect(avisosDeEdificios(estado)).toEqual([
      {
        tipo: 'edificioTerminadoSinProduccion',
        color: 'ambar',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'Molino está terminado: anota su producción y sus trabajadores',
      },
      {
        tipo: 'mejoraTerminada',
        color: 'ambar',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La mejora de Cantera está terminada: anota su producción',
      },
    ])
  })

  it('un edificio sin avisoPendiente no avisa', () => {
    const edificio: Edificio = {
      id: 'ed.normal',
      dominioId: 'dom.prueba',
      tipoId: 'tipo.edificio',
      nombre: 'Aserradero',
      estado: 'activo',
      trabajadoresNecesarios: 3,
      producciones: [],
    }
    const estado: EstadoPartida = { ...base(0), edificios: [edificio] }
    expect(avisosDeEdificios(estado)).toEqual([])
  })
})
