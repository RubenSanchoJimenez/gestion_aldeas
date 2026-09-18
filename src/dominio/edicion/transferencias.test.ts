import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { formatearOro } from '../dinero/formato'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { saldosPorDominio } from '../dinero/saldo'
import { DOM, MOV_BREE, MOV_THARAN, TRANSFERENCIA } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import type { Sello } from './registros'
import {
  crearTransferencia,
  editarTransferencia,
  eliminarTransferencia,
  type DatosTransferencia,
} from './transferencias'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** La fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** La transferencia del 6 de abril: 20 mo de la caja de Bree a la bolsa de Tharan. */
const SEIS_DE_ABRIL: DatosTransferencia = {
  saleDeId: DOM.bree,
  entraEnId: DOM.tharan,
  importe: { base: 2000000, introducido: { cantidad: '20', moneda: 'mo' } },
  fecha: { anio: 1640, mes: 4, dia: 6 },
}

/** El ejemplo de J2f: 50 mo de la bolsa de Tharan a la caja de Bree el 12 de abril (§6.2). */
const CINCUENTA_A_BREE: DatosTransferencia = {
  saleDeId: DOM.tharan,
  entraEnId: DOM.bree,
  importe: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
  fecha: HOY,
}

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

describe('crearTransferencia', () => {
  it('crea la transferencia y sus dos movimientos, con los conceptos propuestos (§6.2, J2f)', () => {
    const documento = ejemplo()
    const { estado, id } = crearTransferencia(documento, CINCUENTA_A_BREE, sello())
    expect(id).toBe('nuevo.1')
    expect(estado.transferencias.at(-1)).toEqual({
      id: 'nuevo.1',
      fecha: HOY,
      importe: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
      saleDeId: DOM.tharan,
      entraEnId: DOM.bree,
      movimientoSaleId: 'nuevo.2',
      movimientoEntraId: 'nuevo.3',
    })
    expect(estado.movimientos.slice(-2)).toEqual([
      {
        id: 'nuevo.2',
        dominioId: DOM.tharan,
        fecha: HOY,
        tipo: 'transferencia',
        importe: { base: -5000000, introducido: { cantidad: '50', moneda: 'mo' } },
        categoriaId: CATEGORIA.transferencias,
        concepto: 'Transferencia a Bree',
        origen: 'manual',
        vinculo: { tipo: 'transferencia', id: 'nuevo.1' },
        programado: false,
      },
      {
        id: 'nuevo.3',
        dominioId: DOM.bree,
        fecha: HOY,
        tipo: 'transferencia',
        importe: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
        categoriaId: CATEGORIA.transferencias,
        concepto: 'Transferencia desde Tharan',
        origen: 'manual',
        vinculo: { tipo: 'transferencia', id: 'nuevo.1' },
        programado: false,
      },
    ])
    const saldos = saldosPorDominio(estado)
    expect(formatearOro(saldos[DOM.tharan], EQUIVALENCIAS_POR_DEFECTO)).toBe('−3,482 mo')
    expect(formatearOro(saldos[DOM.bree], EQUIVALENCIAS_POR_DEFECTO)).toBe('390,6 mo')
    expect(estado.avances).toBe(documento.avances)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('respeta los conceptos que se escriben a mano', () => {
    const { estado } = crearTransferencia(
      ejemplo(),
      { ...CINCUENTA_A_BREE, conceptoSale: 'Ayuda para el granero', conceptoEntra: 'Ayuda de Tharan' },
      sello(),
    )
    expect(estado.movimientos.slice(-2).map((m) => m.concepto)).toEqual(['Ayuda para el granero', 'Ayuda de Tharan'])
  })

  it('no admite una fecha futura ni el mismo dominio a los dos lados, ni al crear ni al editar (D-033)', () => {
    const documento = ejemplo()
    const manana = { ...CINCUENTA_A_BREE, fecha: { anio: 1640, mes: 4, dia: 13 } }
    const aSiMismo = { ...CINCUENTA_A_BREE, entraEnId: DOM.tharan }
    expect(() => crearTransferencia(documento, manana, sello())).toThrow('Una transferencia no puede tener fecha futura')
    expect(() => crearTransferencia(documento, aSiMismo, sello())).toThrow('«Sale de» y «Entra en» deben ser distintos')
    expect(() => editarTransferencia(documento, TRANSFERENCIA.breeATharan, manana, sello())).toThrow(
      'Una transferencia no puede tener fecha futura',
    )
    expect(() => editarTransferencia(documento, TRANSFERENCIA.breeATharan, aSiMismo, sello())).toThrow(
      '«Sale de» y «Entra en» deben ser distintos',
    )
    const atrasada = crearTransferencia(documento, { ...CINCUENTA_A_BREE, fecha: { anio: 1640, mes: 4, dia: 10 } }, sello())
    expect(validarCopia(atrasada.estado, catalogosDeEjemplo())).toEqual([])
  })
})

describe('editarTransferencia', () => {
  it('guardar los mismos datos devuelve el mismo estado (regla pendiente 1)', () => {
    const documento = ejemplo()
    expect(editarTransferencia(documento, TRANSFERENCIA.breeATharan, SEIS_DE_ABRIL, sello())).toBe(documento)
  })

  it('cambia el importe de la transferencia y de sus dos lados a la vez (§6.4, «Movimientos vinculados»)', () => {
    const documento = ejemplo()
    const veinticinco = { base: 2500000, introducido: { cantidad: '25', moneda: 'mo' as const } }
    const estado = editarTransferencia(documento, TRANSFERENCIA.breeATharan, { ...SEIS_DE_ABRIL, importe: veinticinco }, sello())
    expect(estado.transferencias[0]).toEqual({ ...documento.transferencias[0], importe: veinticinco, editadoEl: AHORA })
    expect(movimiento(estado, MOV_BREE.transferencia)).toEqual({
      ...movimiento(documento, MOV_BREE.transferencia),
      importe: { base: -2500000, introducido: { cantidad: '25', moneda: 'mo' } },
      editadoEl: AHORA,
    })
    expect(movimiento(estado, MOV_THARAN.transferencia)).toEqual({
      ...movimiento(documento, MOV_THARAN.transferencia),
      importe: veinticinco,
      editadoEl: AHORA,
    })
    const saldos = saldosPorDominio(estado)
    expect(saldos[DOM.bree]).toBe(34060000 - 500000)
    expect(saldos[DOM.tharan]).toBe(4651800 + 500000)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('si cambia un lado, mueve su movimiento y vuelve a proponer el concepto del otro', () => {
    const documento = ejemplo()
    const estado = editarTransferencia(documento, TRANSFERENCIA.breeATharan, { ...SEIS_DE_ABRIL, saleDeId: DOM.archet }, sello())
    const sale = movimiento(estado, MOV_BREE.transferencia)
    expect(sale?.dominioId).toBe(DOM.archet)
    expect(sale?.concepto).toBe('Transferencia a Tharan')
    expect(movimiento(estado, MOV_THARAN.transferencia)?.concepto).toBe('Transferencia desde Archet')
    expect(estado.transferencias[0].saleDeId).toBe(DOM.archet)
    const saldos = saldosPorDominio(estado)
    expect(saldos[DOM.bree]).toBe(34060000 + 2000000)
    expect(saldos[DOM.archet]).toBe(8500000 - 2000000)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('un concepto escrito a mano se conserva aunque cambie el otro lado', () => {
    const creada = crearTransferencia(ejemplo(), { ...CINCUENTA_A_BREE, conceptoSale: 'Ayuda para el granero' }, sello())
    const estado = editarTransferencia(creada.estado, creada.id, { ...CINCUENTA_A_BREE, entraEnId: DOM.archet }, sello())
    const [sale, entra] = estado.movimientos.slice(-2)
    expect(sale.concepto).toBe('Ayuda para el granero')
    expect(entra.dominioId).toBe(DOM.archet)
    expect(entra.concepto).toBe('Transferencia desde Tharan')
  })
})

describe('eliminarTransferencia', () => {
  it('borra la transferencia y sus dos movimientos, y los saldos vuelven (§6.4, «Al eliminar»)', () => {
    const documento = ejemplo()
    const estado = eliminarTransferencia(documento, TRANSFERENCIA.breeATharan)
    expect(estado.transferencias).toEqual([])
    expect(movimiento(estado, MOV_BREE.transferencia)).toBeUndefined()
    expect(movimiento(estado, MOV_THARAN.transferencia)).toBeUndefined()
    expect(estado.movimientos).toHaveLength(documento.movimientos.length - 2)
    const saldos = saldosPorDominio(estado)
    expect(saldos[DOM.bree]).toBe(34060000 + 2000000)
    expect(saldos[DOM.tharan]).toBe(4651800 - 2000000)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('editar o eliminar una transferencia que no existe lanza', () => {
    const documento = ejemplo()
    expect(() => eliminarTransferencia(documento, 'tr.no-existe')).toThrow('No existe «tr.no-existe»')
    expect(() => editarTransferencia(documento, 'tr.no-existe', SEIS_DE_ABRIL, sello())).toThrow('No existe «tr.no-existe»')
  })
})
