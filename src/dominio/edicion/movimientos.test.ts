import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { idDeOpcion } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { DOM, MOV_BREE, MOV_THARAN, OBJETO } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import { crearMovimiento, editarMovimiento, eliminarMovimiento, esVinculado, type DatosMovimiento } from './movimientos'
import type { Sello } from './registros'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** La fecha actual del ejemplo y un día futuro. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }
const DIA_20: Fecha = { anio: 1640, mes: 4, dia: 20 }

/** La bolsa de Tharan el 12 de abril: 46,518 mo. */
const BOLSA_THARAN = 4651800

const CAT_EQUIPO = idDeOpcion('categorias', 'Equipo')

/** Un sello nuevo en cada prueba: los ids salen «nuevo.1», «nuevo.2»… */
function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

/** La partida de ejemplo congelada: si una función escribe en su entrada, la prueba falla. */
function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

/** El movimiento con ese id, si está. */
function movimiento(documento: DocumentoPartida, id: Id): Movimiento | undefined {
  return documento.movimientos.find((m) => m.id === id)
}

/** La capa élfica de J2b: 120 mp = 12 mo de la bolsa de Tharan. */
function capa(fecha: Fecha): DatosMovimiento {
  return {
    dominioId: DOM.tharan,
    tipo: 'gasto',
    importe: { base: 1200000, introducido: { cantidad: '120', moneda: 'mp' } },
    categoriaId: CAT_EQUIPO,
    concepto: 'Capa élfica',
    fecha,
  }
}

describe('crearMovimiento', () => {
  it('un gasto de hoy resta de la bolsa, guarda lo tecleado y no lleva editadoEl (§6.2, J2b)', () => {
    const documento = ejemplo()
    const { estado, id } = crearMovimiento(documento, capa(HOY), sello())
    expect(id).toBe('nuevo.1')
    expect(movimiento(estado, id)).toEqual({
      id: 'nuevo.1',
      dominioId: DOM.tharan,
      fecha: HOY,
      tipo: 'gasto',
      importe: { base: -1200000, introducido: { cantidad: '120', moneda: 'mp' } },
      categoriaId: CAT_EQUIPO,
      concepto: 'Capa élfica',
      origen: 'manual',
      programado: false,
    })
    expect(saldosPorDominio(estado)[DOM.tharan]).toBe(BOLSA_THARAN - 1200000)
    expect(estado.avances).toBe(documento.avances)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('con fecha futura queda programado y no cuenta en el saldo (§7, «Programados»)', () => {
    const { estado, id } = crearMovimiento(ejemplo(), capa(DIA_20), sello())
    expect(movimiento(estado, id)?.programado).toBe(true)
    expect(saldosPorDominio(estado)[DOM.tharan]).toBe(BOLSA_THARAN)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('el signo lo pone el tipo: un ingreso suma y un gasto de 0 guarda 0, nunca −0', () => {
    const ingreso = crearMovimiento(ejemplo(), { ...capa(HOY), tipo: 'ingreso', concepto: 'Venta de pieles' }, sello())
    expect(movimiento(ingreso.estado, ingreso.id)?.importe.base).toBe(1200000)
    const gratis = crearMovimiento(ejemplo(), { ...capa(HOY), importe: { base: 0 } }, sello())
    expect(Object.is(movimiento(gratis.estado, gratis.id)?.importe.base, 0)).toBe(true)
  })
})

describe('editarMovimiento', () => {
  it('guardar sin cambiar nada devuelve el mismo estado (regla pendiente 1)', () => {
    const documento = ejemplo()
    expect(editarMovimiento(documento, MOV_THARAN.recompensa, {}, sello())).toBe(documento)
    const iguales = {
      concepto: 'Recompensa de la guardia de Bree',
      importe: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' as const } },
      fecha: { anio: 1640, mes: 4, dia: 10 },
    }
    expect(editarMovimiento(documento, MOV_THARAN.recompensa, iguales, sello())).toBe(documento)
  })

  it('cambiar el importe y el concepto sella editadoEl y recalcula el saldo (J2c, §7)', () => {
    const documento = ejemplo()
    const estado = editarMovimiento(
      documento,
      MOV_THARAN.recompensa,
      { importe: { base: 1500000, introducido: { cantidad: '15', moneda: 'mo' } }, concepto: 'Recompensa del alcalde' },
      sello(),
    )
    expect(movimiento(estado, MOV_THARAN.recompensa)).toEqual({
      ...movimiento(documento, MOV_THARAN.recompensa),
      importe: { base: 1500000, introducido: { cantidad: '15', moneda: 'mo' } },
      concepto: 'Recompensa del alcalde',
      editadoEl: AHORA,
    })
    expect(saldosPorDominio(estado)[DOM.tharan]).toBe(BOLSA_THARAN + 300000)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('llevarlo a una fecha futura lo programa y devolverlo a hoy lo aplica (T14)', () => {
    const programado = editarMovimiento(ejemplo(), MOV_THARAN.recompensa, { fecha: DIA_20 }, sello())
    expect(movimiento(programado, MOV_THARAN.recompensa)?.programado).toBe(true)
    expect(saldosPorDominio(programado)[DOM.tharan]).toBe(BOLSA_THARAN - 1200000)
    expect(validarCopia(programado, catalogosDeEjemplo())).toEqual([])

    const aplicado = editarMovimiento(programado, MOV_THARAN.recompensa, { fecha: HOY }, sello())
    expect(movimiento(aplicado, MOV_THARAN.recompensa)?.programado).toBe(false)
    expect(saldosPorDominio(aplicado)[DOM.tharan]).toBe(BOLSA_THARAN)
  })

  it('un programado con objeto pendiente que pasa a hoy se aplica y crea el objeto (T14, D-034)', () => {
    const creado = crearMovimiento(ejemplo(), capa(DIA_20), sello())
    const conObjeto: DocumentoPartida = {
      ...creado.estado,
      movimientos: creado.estado.movimientos.map((m) =>
        m.id === creado.id
          ? {
              ...m,
              objetoPendiente: {
                nombre: 'Capa élfica',
                cantidad: 1,
                valorUnitario: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
                ubicacion: { tipo: 'encima' },
              },
            }
          : m,
      ),
    }
    expect(validarCopia(conObjeto, catalogosDeEjemplo())).toEqual([])

    const estado = editarMovimiento(conObjeto, creado.id, { fecha: HOY }, { ahora: AHORA, nuevoId: idsEnSerie('obj') })
    const aplicado = movimiento(estado, creado.id)
    expect(aplicado?.programado).toBe(false)
    expect(aplicado?.editadoEl).toBe(AHORA)
    expect(aplicado).not.toHaveProperty('objetoPendiente')
    expect(estado.objetos).toHaveLength(conObjeto.objetos.length + 1)
    expect(estado.objetos.at(-1)).toEqual({
      id: 'obj.1',
      dominioId: DOM.tharan,
      nombre: 'Capa élfica',
      cantidad: 1,
      valorUnitario: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
      ubicacion: { tipo: 'encima' },
      movimientoCompraId: creado.id,
    })
    expect(saldosPorDominio(estado)[DOM.tharan]).toBe(BOLSA_THARAN - 1200000)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('un movimiento vinculado se edita y se elimina desde su origen (§6.4, «Movimientos vinculados»)', () => {
    const documento = ejemplo()
    const transferencia = movimiento(documento, MOV_BREE.transferencia)
    const recompensa = movimiento(documento, MOV_THARAN.recompensa)
    expect(transferencia !== undefined && esVinculado(transferencia)).toBe(true)
    expect(recompensa !== undefined && esVinculado(recompensa)).toBe(false)
    expect(() => editarMovimiento(documento, MOV_BREE.transferencia, { concepto: 'Otra cosa' }, sello())).toThrow(
      'Este movimiento se edita desde su origen',
    )
    expect(() => eliminarMovimiento(documento, MOV_BREE.obraPuerta)).toThrow('Este movimiento se edita desde su origen')
  })

  it('en un cobro de impuestos de locales solo se cambia el importe total (§6.2, J2c; T4)', () => {
    const documento = ejemplo()
    const estado = editarMovimiento(
      documento,
      MOV_BREE.locales,
      { importe: { base: 480000, introducido: { cantidad: '4,8', moneda: 'mo' } }, concepto: 'Impuestos de locales · marzo (4)' },
      sello(),
    )
    const cobro = movimiento(estado, MOV_BREE.locales)
    expect(cobro?.importe).toEqual({ base: 480000, introducido: { cantidad: '4,8', moneda: 'mo' } })
    expect(cobro?.detalleLocales).toEqual(movimiento(documento, MOV_BREE.locales)?.detalleLocales)
    expect(cobro?.editadoEl).toBe(AHORA)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])

    const error = 'En un cobro de impuestos de locales solo se cambia el importe total'
    expect(() => editarMovimiento(documento, MOV_BREE.locales, { concepto: 'Locales de marzo' }, sello())).toThrow(error)
    expect(() =>
      editarMovimiento(documento, MOV_BREE.locales, { fecha: { anio: 1640, mes: 4, dia: 2 } }, sello()),
    ).toThrow(error)
  })

  it('un pago agrupado de salarios se edita como uno suelto y su detalle no cambia (T32; T4)', () => {
    const documento = ejemplo()
    const estado = editarMovimiento(
      documento,
      MOV_BREE.salarios6Abril,
      { importe: { base: 400000, introducido: { cantidad: '4', moneda: 'mo' } } },
      sello(),
    )
    const salarios = movimiento(estado, MOV_BREE.salarios6Abril)
    expect(salarios?.importe).toEqual({ base: -400000, introducido: { cantidad: '4', moneda: 'mo' } })
    expect(salarios?.regla).toEqual({ tipo: 'salarios', id: DOM.bree })
    expect(salarios?.detalleTrabajo).toEqual(movimiento(documento, MOV_BREE.salarios6Abril)?.detalleTrabajo)
    expect(salarios?.origen).toBe('avance')
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })
})

describe('eliminarMovimiento', () => {
  it('quita el movimiento, recalcula el saldo y su objeto se queda sin movimientoCompraId (§6.4; T31)', () => {
    const documento = ejemplo()
    const estado = eliminarMovimiento(documento, MOV_THARAN.athelas)
    expect(movimiento(estado, MOV_THARAN.athelas)).toBeUndefined()
    expect(saldosPorDominio(estado)[DOM.tharan]).toBe(BOLSA_THARAN + 60000)
    const athelas = estado.objetos.find((o) => o.id === OBJETO.athelas)
    expect(athelas?.cantidad).toBe(3)
    expect(athelas).not.toHaveProperty('movimientoCompraId')
    expect(athelas).not.toHaveProperty('editadoEl')
    expect(estado.objetos[0]).toBe(documento.objetos[0])
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('un movimiento sin objeto no toca el inventario, y un id que no existe lanza', () => {
    const documento = ejemplo()
    const estado = eliminarMovimiento(documento, MOV_THARAN.recompensa)
    expect(estado.movimientos).toHaveLength(documento.movimientos.length - 1)
    expect(estado.objetos).toBe(documento.objetos)
    expect(() => eliminarMovimiento(documento, 'mov.no-existe')).toThrow('No existe «mov.no-existe»')
  })
})
