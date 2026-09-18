import { describe, expect, it } from 'vitest'
import {
  EsquemaHechizo,
  EsquemaIntentoAprendizaje,
  EsquemaInversion,
  EsquemaMotivoArchivado,
  EsquemaObjetoInventario,
  EsquemaPergamino,
  EsquemaVenta,
  type Hechizo,
  type IntentoAprendizaje,
  type Inversion,
  type ObjetoInventario,
  type Pergamino,
  type Venta,
} from './personaje'

/** La espada de Tharan: 1 unidad de 18 mo, encima (J3). */
const ESPADA: ObjetoInventario = {
  id: 'obj.espada',
  dominioId: 'dom.tharan',
  nombre: 'Espada larga dúnadan',
  cantidad: 1,
  valorUnitario: { base: 1800000, introducido: { cantidad: '18', moneda: 'mo' } },
  ubicacion: { tipo: 'encima' },
  notas: 'Forjada en Fornost',
}

/** El Tonel Dorado: 50 mo de capital, 25 % de participación y 3 mo el día 1 de cada mes (J6). */
const TONEL: Inversion = {
  id: 'inv.tonel-dorado',
  dominioId: 'dom.tharan',
  negocio: 'El Tonel Dorado',
  descripcion: 'Posada en Archet',
  capital: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
  participacionPct: 25,
  beneficio: { base: 300000, introducido: { cantidad: '3', moneda: 'mo' } },
  recurrencia: { tipo: 'mensual', diaMes: 1 },
  cuentaBeneficiosId: 'dom.tharan',
  estado: 'activa',
}

/** «Luz de Elbereth», en estudio (J7). */
const LUZ: Hechizo = {
  id: 'hech.luz-de-elbereth',
  dominioId: 'dom.tharan',
  nombre: 'Luz de Elbereth',
  lista: 'Caminos de la luz',
  reino: 'esencia',
  nivel: 3,
  estado: 'enEstudio',
}

describe('EsquemaObjetoInventario', () => {
  it('acepta la espada del inventario de Tharan', () => {
    expect(EsquemaObjetoInventario.parse(ESPADA)).toEqual(ESPADA)
  })

  it('admite los cuatro motivos de archivado (decisión 13)', () => {
    expect(EsquemaMotivoArchivado.options).toEqual(['vendido', 'consumido', 'perdido', 'eliminado'])
    for (const archivado of EsquemaMotivoArchivado.options) {
      expect(EsquemaObjetoInventario.safeParse({ ...ESPADA, cantidad: 0, archivado }).success).toBe(true)
    }
    expect(EsquemaObjetoInventario.safeParse({ ...ESPADA, archivado: 'regalado' }).success).toBe(false)
  })

  it('exige al menos 1 unidad mientras el objeto no está archivado', () => {
    const vacio = EsquemaObjetoInventario.safeParse({ ...ESPADA, cantidad: 0 })
    expect(vacio.success).toBe(false)
    expect(vacio.error?.issues.map((i) => i.message)).toEqual(['Un objeto sin archivar tiene al menos 1 unidad'])
    expect(EsquemaObjetoInventario.safeParse({ ...ESPADA, cantidad: -1 }).success).toBe(false)
  })

  it('guarda las cuatro ubicaciones posibles de un objeto', () => {
    expect(EsquemaObjetoInventario.safeParse({ ...ESPADA, ubicacion: { tipo: 'encima' } }).success).toBe(true)
    expect(
      EsquemaObjetoInventario.safeParse({ ...ESPADA, ubicacion: { tipo: 'caja', dominioId: 'dom.bree' } }).success,
    ).toBe(true)
    expect(
      EsquemaObjetoInventario.safeParse({ ...ESPADA, ubicacion: { tipo: 'almacen', dominioId: 'dom.bree' } }).success,
    ).toBe(true)
    expect(
      EsquemaObjetoInventario.safeParse({ ...ESPADA, ubicacion: { tipo: 'propia', ubicacionId: 'ubi.posada' } })
        .success,
    ).toBe(true)
    expect(EsquemaObjetoInventario.safeParse({ ...ESPADA, ubicacion: { tipo: 'bolsa' } }).success).toBe(false)
    expect(EsquemaObjetoInventario.safeParse({ ...ESPADA, ubicacion: { tipo: 'caja' } }).success).toBe(false)
  })
})

describe('EsquemaVenta', () => {
  it('acepta una venta con su objeto y otra sin objetoId, de un objeto ya eliminado (§6.4)', () => {
    const venta: Venta = {
      id: 'venta.capa',
      objetoId: 'obj.capa',
      nombre: 'Capa élfica',
      valorAnotado: { base: 1200000 },
      cantidad: 1,
      precioUnitario: { base: 1400000, introducido: { cantidad: '14', moneda: 'mo' } },
      compradorId: 'persona.gremio-bree',
      movimientoId: 'mov.venta.capa',
    }
    expect(EsquemaVenta.parse(venta)).toEqual(venta)

    const sinObjeto: Venta = {
      id: 'venta.daga',
      nombre: 'Daga de Fornost',
      valorAnotado: { base: 300000 },
      cantidad: 2,
      precioUnitario: { base: 200000 },
      movimientoId: 'mov.venta.daga',
    }
    expect(EsquemaVenta.parse(sinObjeto)).toEqual(sinObjeto)
    expect(EsquemaVenta.safeParse({ ...sinObjeto, cantidad: 0 }).success).toBe(false)
  })
})

describe('EsquemaInversion', () => {
  it('acepta una inversión activa', () => {
    expect(EsquemaInversion.parse(TONEL)).toEqual(TONEL)
  })

  it('acepta una inversión retirada con su fecha, su importe y su movimiento', () => {
    const merceria: Inversion = {
      ...TONEL,
      id: 'inv.merceria-staddle',
      negocio: 'Mercería de Staddle',
      descripcion: 'Mercería en Staddle',
      capital: { base: 1000000, introducido: { cantidad: '10', moneda: 'mo' } },
      participacionPct: 5,
      beneficio: { base: 0 },
      estado: 'retirada',
      retirada: {
        fecha: { anio: 1640, mes: 2, dia: 3 },
        importe: { base: 900000, introducido: { cantidad: '9', moneda: 'mo' } },
        movimientoId: 'mov.retirada.merceria',
      },
    }
    expect(EsquemaInversion.parse(merceria)).toEqual(merceria)
  })

  it('rechaza una inversión retirada sin su retirada y un estado desconocido', () => {
    expect(EsquemaInversion.safeParse({ ...TONEL, estado: 'retirada' }).success).toBe(false)
    expect(EsquemaInversion.safeParse({ ...TONEL, estado: 'cerrada' }).success).toBe(false)
    expect(EsquemaInversion.safeParse({ ...TONEL, participacionPct: 25.125 }).success).toBe(false)
  })
})

describe('EsquemaHechizo', () => {
  it('acepta un hechizo en estudio y uno aprendido con su fecha', () => {
    expect(EsquemaHechizo.parse(LUZ)).toEqual(LUZ)
    const aprendido: Hechizo = {
      ...LUZ,
      id: 'hech.hablar-con-los-animales',
      nombre: 'Hablar con los animales',
      estado: 'aprendido',
      aprendidoEl: { anio: 1640, mes: 2, dia: 5 },
    }
    expect(EsquemaHechizo.parse(aprendido)).toEqual(aprendido)
  })

  it('ata «Aprendido el» al estado del hechizo', () => {
    const enEstudioConFecha = EsquemaHechizo.safeParse({ ...LUZ, aprendidoEl: { anio: 1640, mes: 2, dia: 5 } })
    expect(enEstudioConFecha.success).toBe(false)
    expect(enEstudioConFecha.error?.issues.map((i) => i.message)).toEqual([
      '«Aprendido el» es obligatorio con «Aprendido» y se borra al volver a «En estudio»',
    ])

    const aprendidoSinFecha = EsquemaHechizo.safeParse({ ...LUZ, estado: 'aprendido' })
    expect(aprendidoSinFecha.success).toBe(false)
    expect(aprendidoSinFecha.error?.issues.map((i) => i.message)).toEqual([
      '«Aprendido el» es obligatorio con «Aprendido» y se borra al volver a «En estudio»',
    ])
    expect(EsquemaHechizo.safeParse({ ...LUZ, nivel: 51 }).success).toBe(false)
  })
})

describe('EsquemaIntentoAprendizaje', () => {
  it('acepta un intento con un pergamino que se consume', () => {
    const intento: IntentoAprendizaje = {
      id: 'int.paso-sin-rastro.28mar',
      hechizoId: 'hech.paso-sin-rastro',
      fecha: { anio: 1640, mes: 3, dia: 28 },
      resultado: 'malo',
      pergaminoId: 'perg.paso-sin-rastro',
      pergaminoConsumido: true,
    }
    expect(EsquemaIntentoAprendizaje.parse(intento)).toEqual(intento)
  })

  it('acepta un intento con un pergamino eliminado y sin pergaminoId (decisión propia 14)', () => {
    const intento: IntentoAprendizaje = {
      id: 'int.luz.25mar',
      hechizoId: 'hech.luz-de-elbereth',
      fecha: { anio: 1640, mes: 3, dia: 25 },
      resultado: 'bueno',
      pergaminoConsumido: false,
      pergaminoEliminado: true,
    }
    expect(EsquemaIntentoAprendizaje.parse(intento)).toEqual(intento)

    const conLosDos = EsquemaIntentoAprendizaje.safeParse({ ...intento, pergaminoId: 'perg.luz-de-elbereth' })
    expect(conLosDos.success).toBe(false)
    expect(conLosDos.error?.issues.map((i) => i.message)).toEqual([
      'Un intento con un pergamino eliminado ya no guarda su pergaminoId',
    ])
  })

  it('solo marca «El pergamino se consume» con un pergamino elegido', () => {
    const sinPergamino = EsquemaIntentoAprendizaje.safeParse({
      id: 'int.luz.3feb',
      hechizoId: 'hech.luz-de-elbereth',
      fecha: { anio: 1640, mes: 2, dia: 3 },
      resultado: 'malo',
      pergaminoConsumido: true,
    })
    expect(sinPergamino.success).toBe(false)
    expect(sinPergamino.error?.issues.map((i) => i.message)).toEqual([
      'Solo se marca «El pergamino se consume» con un pergamino elegido',
    ])
  })
})

describe('EsquemaPergamino', () => {
  it('acepta un pergamino poseído sin hechizoId, con solo su nombre', () => {
    const suelto: Pergamino = {
      id: 'perg.mano-firme',
      dominioId: 'dom.tharan',
      nombre: 'Mano firme',
      estado: 'poseido',
    }
    expect(EsquemaPergamino.parse(suelto)).toEqual(suelto)

    const deLuz: Pergamino = {
      id: 'perg.luz-de-elbereth',
      dominioId: 'dom.tharan',
      hechizoId: 'hech.luz-de-elbereth',
      nombre: 'Luz de Elbereth',
      nivel: 3,
      estado: 'poseido',
      objetoInventarioId: 'obj.pergamino-luz',
    }
    expect(EsquemaPergamino.parse(deLuz)).toEqual(deLuz)
  })

  it('ata la fecha de consumo al estado «consumido»', () => {
    const consumido: Pergamino = {
      id: 'perg.paso-sin-rastro',
      dominioId: 'dom.tharan',
      hechizoId: 'hech.paso-sin-rastro',
      nombre: 'Paso sin rastro',
      nivel: 2,
      estado: 'consumido',
      consumidoEl: { anio: 1640, mes: 3, dia: 28 },
      objetoInventarioId: 'obj.pergamino-paso',
    }
    expect(EsquemaPergamino.parse(consumido)).toEqual(consumido)

    const sinFecha = EsquemaPergamino.safeParse({ ...consumido, consumidoEl: undefined })
    expect(sinFecha.success).toBe(false)
    expect(sinFecha.error?.issues.map((i) => i.message)).toEqual([
      'La fecha de consumo va si y solo si el pergamino está consumido',
    ])
    expect(EsquemaPergamino.safeParse({ ...consumido, estado: 'perdido' }).success).toBe(false)
  })
})
