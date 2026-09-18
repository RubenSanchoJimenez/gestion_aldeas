import { describe, expect, it } from 'vitest'
import { saldosPorDominio } from '../dinero/saldo'
import {
  AVANCE,
  DOM,
  EVENTO,
  IMPUESTO,
  MOV_BREE,
  MOV_THARAN,
  PERSONA,
  RECURRENTE,
  TRABAJADOR,
  UNIDAD,
} from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Id, Instante } from '../modelo/comunes'
import type { Deuda } from '../modelo/deudas'
import type { DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import {
  cambiarActivo,
  eliminarImpuestoRenta,
  eliminarRecurrente,
  eliminarTrabajador,
  eliminarUnidadGuarnicion,
} from './reglas'
import type { Sello } from './registros'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** Un sello nuevo en cada prueba. */
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

describe('cambiarActivo', () => {
  it('el interruptor de J5 guarda al instante con editadoEl, y no cambia nada si ya estaba así (§6.4; D-037)', () => {
    const documento = ejemplo()
    const pausada = cambiarActivo(documento, RECURRENTE.posada, false, sello())
    expect(pausada.recurrentes[0]).toEqual({ ...documento.recurrentes[0], activo: false, editadoEl: AHORA })
    expect(pausada.recurrentes[1]).toBe(documento.recurrentes[1])
    expect(validarCopia(pausada, catalogosDeEjemplo())).toEqual([])

    expect(cambiarActivo(documento, RECURRENTE.posada, true, sello())).toBe(documento)

    const reanudada = cambiarActivo(documento, RECURRENTE.escolta, true, sello())
    expect(reanudada.recurrentes[2].activo).toBe(true)
    expect(reanudada.recurrentes[2].recurrencia).toEqual(documento.recurrentes[2].recurrencia)
  })
})

describe('eliminarRecurrente', () => {
  it('quita la regla y sus movimientos pasados se quedan sueltos, sin regla ni editadoEl (§6.4, «Al eliminar»)', () => {
    const documento = ejemplo()
    const estado = eliminarRecurrente(documento, RECURRENTE.posada)
    expect(estado.recurrentes.map((r) => r.id)).toEqual([
      RECURRENTE.establo,
      RECURRENTE.escolta,
      RECURRENTE.alquilerCasaArchet,
    ])
    for (const id of [MOV_THARAN.posada6Abril, MOV_THARAN.posada10Abril, MOV_THARAN.posada12Abril]) {
      const suelto = movimiento(estado, id)
      expect(suelto).not.toHaveProperty('regla')
      expect(suelto).not.toHaveProperty('editadoEl')
      expect(suelto?.concepto).toBe(movimiento(documento, id)?.concepto)
    }
    expect(movimiento(estado, MOV_THARAN.establo12Abril)).toBe(movimiento(documento, MOV_THARAN.establo12Abril))
    expect(saldosPorDominio(estado)).toEqual(saldosPorDominio(documento))
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })
})

describe('eliminarImpuestoRenta', () => {
  it('eliminar el tributo de Archet deja válida su deuda de impago abierta (T5)', () => {
    const impago: Deuda = {
      id: 'deuda.impago-tributo-archet',
      dominioId: DOM.archet,
      sentido: 'debo',
      contraparteId: PERSONA.corona,
      fecha: { anio: 1640, mes: 4, dia: 12 },
      principal: { base: 1880000 },
      interesPct: 0,
      estado: 'abierta',
      impago: true,
      origenImpago: { tipo: 'tributo', id: IMPUESTO.tributoArchet },
      cargos: [{ fecha: { anio: 1640, mes: 4, dia: 12 }, importe: { base: 1880000 }, avanceId: AVANCE.hasta12Abril }],
      pagos: [],
      devengos: [],
    }
    const documento = congelar({ ...documentoDeEjemplo(), deudas: [...documentoDeEjemplo().deudas, impago] })
    expect(validarCopia(documento, catalogosDeEjemplo())).toEqual([])
    const estado = eliminarImpuestoRenta(documento, IMPUESTO.tributoArchet)
    expect(estado.impuestosRentas.some((i) => i.id === IMPUESTO.tributoArchet)).toBe(false)
    expect(estado.deudas.at(-1)).toBe(impago)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('eliminar los aranceles suelta sus movimientos y quita el efecto de la feria que los apuntaba', () => {
    const documento = ejemplo()
    const estado = eliminarImpuestoRenta(documento, IMPUESTO.aranceles)
    expect(movimiento(estado, MOV_BREE.aranceles1Abril)).not.toHaveProperty('regla')
    expect(movimiento(estado, MOV_BREE.aranceles8Abril)).not.toHaveProperty('regla')
    expect(movimiento(estado, MOV_BREE.peaje12Abril)).toBe(movimiento(documento, MOV_BREE.peaje12Abril))
    const feria = estado.eventos.find((e) => e.id === EVENTO.feria)
    expect(feria?.efectos).toEqual([])
    expect(feria).not.toHaveProperty('editadoEl')
    expect(estado.eventos.find((e) => e.id === EVENTO.bandidos)).toBe(
      documento.eventos.find((e) => e.id === EVENTO.bandidos),
    )
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('eliminar la renta del molino deja el edificio alquilado sin renta, y es válido (D-036)', () => {
    const estado = eliminarImpuestoRenta(ejemplo(), IMPUESTO.alquilerMolino)
    expect(estado.edificios.find((e) => e.nombre === 'Molino')?.estado).toBe('alquilado')
    expect(movimiento(estado, MOV_BREE.alquilerMolino)).not.toHaveProperty('regla')
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })
})

describe('eliminarTrabajador y eliminarUnidadGuarnicion', () => {
  it('eliminar los pastores deja su entrada del pago agrupado con el nombre y sin origenId (D-035)', () => {
    const documento = ejemplo()
    const estado = eliminarTrabajador(documento, TRABAJADOR.pastores)
    expect(estado.trabajadores.some((t) => t.id === TRABAJADOR.pastores)).toBe(false)
    const salarios = movimiento(estado, MOV_BREE.salarios6Abril)
    expect(salarios?.regla).toEqual({ tipo: 'salarios', id: DOM.bree })
    expect(salarios?.importe).toEqual({ base: -420000 })
    expect(salarios).not.toHaveProperty('editadoEl')
    expect(salarios?.detalleTrabajo?.[4]).toEqual({ nombre: 'Pastor', numero: 1, importe: { base: 10000 } })
    expect(salarios?.detalleTrabajo?.slice(0, 4)).toEqual(
      movimiento(documento, MOV_BREE.salarios6Abril)?.detalleTrabajo?.slice(0, 4),
    )
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('eliminar una unidad hace lo mismo con el pago agrupado de soldadas (D-035)', () => {
    const documento = ejemplo()
    const estado = eliminarUnidadGuarnicion(documento, UNIDAD.capitan)
    expect(estado.unidadesGuarnicion.map((u) => u.id)).toEqual([UNIDAD.guardias, UNIDAD.arqueros])
    const soldadas = movimiento(estado, MOV_BREE.soldadas10Abril)
    expect(soldadas?.regla).toEqual({ tipo: 'soldadas', id: DOM.bree })
    expect(soldadas?.detalleTrabajo?.[2]).toEqual({ nombre: 'Capitán de la guardia', numero: 1, importe: { base: 200000 } })
    expect(soldadas?.detalleTrabajo?.[0]).toEqual(movimiento(documento, MOV_BREE.soldadas10Abril)?.detalleTrabajo?.[0])
    expect(movimiento(estado, MOV_BREE.salarios6Abril)).toBe(movimiento(documento, MOV_BREE.salarios6Abril))
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('eliminar un trabajador sin pagos no toca el libro', () => {
    const documento = ejemplo()
    const estado = eliminarTrabajador(documento, TRABAJADOR.albanilesArchet)
    expect(estado.movimientos).toBe(documento.movimientos)
    expect(estado.trabajadores).toHaveLength(documento.trabajadores.length - 1)
  })
})

describe('ids que no existen', () => {
  it('las cinco lanzan «No existe «…»»: es un error de programación', () => {
    const documento = ejemplo()
    expect(() => cambiarActivo(documento, 'rec.no-existe', true, sello())).toThrow('No existe «rec.no-existe»')
    expect(() => eliminarRecurrente(documento, 'rec.no-existe')).toThrow('No existe «rec.no-existe»')
    expect(() => eliminarImpuestoRenta(documento, 'imp.no-existe')).toThrow('No existe «imp.no-existe»')
    expect(() => eliminarTrabajador(documento, 'trab.no-existe')).toThrow('No existe «trab.no-existe»')
    expect(() => eliminarUnidadGuarnicion(documento, 'uni.no-existe')).toThrow('No existe «uni.no-existe»')
  })
})
