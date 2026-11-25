import { describe, expect, it } from 'vitest'
import { DEUDA } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Deuda } from '../modelo/deudas'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { avisosDeDeudas } from './deudas'

/** El estado del ejemplo, con las deudas cambiadas si se pide. */
function estadoCon(cambiar?: (deudas: Deuda[]) => Deuda[]): EstadoPartida {
  const estado = estadoDe(documentoDeEjemplo())
  return cambiar === undefined ? estado : { ...estado, deudas: cambiar([...estado.deudas]) }
}

/** Cambia una deuda del ejemplo. */
function cambiando(id: string, parche: Partial<Deuda>) {
  return (deudas: Deuda[]): Deuda[] => deudas.map((d) => (d.id === id ? { ...d, ...parche } : d))
}

describe('avisosDeDeudas', () => {
  it('el 12 de abril solo avisa Hobart, en ámbar, con su fecha de vencimiento (esp l.1353)', () => {
    const avisos = avisosDeDeudas(estadoCon())
    expect(avisos).toEqual([
      {
        tipo: 'deudaQueVence',
        color: 'ambar',
        dominioId: 'dom.tharan',
        texto: 'La deuda de 4 mo con Hobart Brezal, herrero vence el 20 de abril',
        fecha: { anio: 1640, mes: 4, dia: 20 },
      },
    ])
  })

  it('el día antes del vencimiento el texto es «Mañana vence…» (esp l.1354)', () => {
    const estado = estadoCon()
    const avisos = avisosDeDeudas({
      ...estado,
      partida: { ...estado.partida, fechaActual: { anio: 1640, mes: 4, dia: 19 } },
    })
    expect(avisos.map((a) => a.texto)).toEqual(['Mañana vence la deuda de 4 mo con Hobart Brezal, herrero'])
  })

  it('a 11 días o más todavía no avisa: el Gremio vence el 1 de mayo (esp l.1163)', () => {
    const avisos = avisosDeDeudas(estadoCon())
    expect(avisos.some((a) => a.texto.includes('Gremio'))).toBe(false)
  })

  it('una deuda vencida avisa en rojo con lo que queda pendiente (esp l.1163)', () => {
    const avisos = avisosDeDeudas(estadoCon(cambiando(DEUDA.hobart, { estado: 'vencida' })))
    expect(avisos).toEqual([
      {
        tipo: 'deudaVencida',
        color: 'rojo',
        dominioId: 'dom.tharan',
        texto: 'Venció la deuda con Hobart Brezal, herrero: 4 mo pendientes',
        fecha: { anio: 1640, mes: 4, dia: 20 },
      },
    ])
  })

  it('un préstamo vencido que te deben avisa con el otro texto (esp l.1163)', () => {
    const avisos = avisosDeDeudas(
      estadoCon(cambiando(DEUDA.dalen, { estado: 'vencida' })),
    )
    expect(avisos.map((a) => a.texto)).toContain('Dalen, mercader de Esgaroth no ha devuelto 15 mo')
  })

  it('un préstamo que te deben a punto de vencer avisa como préstamo (D-100)', () => {
    const avisos = avisosDeDeudas(
      estadoCon(cambiando(DEUDA.dalen, { vencimiento: { anio: 1640, mes: 4, dia: 18 } })),
    )
    expect(avisos.map((a) => a.texto)).toContain('El préstamo de 15 mo a Dalen, mercader de Esgaroth vence el 18 de abril')
  })

  it('una deuda saldada no avisa, ni aunque esté vencida', () => {
    const avisos = avisosDeDeudas(estadoCon(cambiando(DEUDA.hobart, { estado: 'saldada' })))
    expect(avisos).toEqual([])
  })

  it('una deuda vencida pero ya pagada del todo no avisa', () => {
    const avisos = avisosDeDeudas(
      estadoCon(
        cambiando(DEUDA.hobart, {
          estado: 'vencida',
          pagos: [
            {
              id: 'pago.todo',
              fecha: { anio: 1640, mes: 4, dia: 12 },
              importe: { base: 400000 },
              aplicarA: 'interesesYCapital',
              movimientoId: 'mov.x',
            },
          ],
        }),
      ),
    )
    expect(avisos).toEqual([])
  })

  it('una deuda de impago no sale aquí: la lleva avisosDeImpago (D-024)', () => {
    const avisos = avisosDeDeudas(
      estadoCon(
        cambiando(DEUDA.hobart, {
          impago: true,
          vencimiento: undefined,
          origenImpago: { tipo: 'salarios', id: 'dom.bree' },
          cargos: [{ fecha: { anio: 1640, mes: 4, dia: 10 }, importe: { base: 400000 }, avanceId: 'av.x' }],
        }),
      ),
    )
    expect(avisos).toEqual([])
  })

  it('una deuda sin vencimiento no avisa de que vence', () => {
    const avisos = avisosDeDeudas(estadoCon(cambiando(DEUDA.hobart, { vencimiento: undefined })))
    expect(avisos).toEqual([])
  })

  it('el aviso de vencimiento cuenta el pendiente, no el principal', () => {
    const avisos = avisosDeDeudas(
      estadoCon(
        cambiando(DEUDA.hobart, {
          pagos: [
            {
              id: 'pago.mitad',
              fecha: { anio: 1640, mes: 4, dia: 10 },
              importe: { base: 100000 },
              aplicarA: 'interesesYCapital',
              movimientoId: 'mov.x',
            },
          ],
        }),
      ),
    )
    expect(avisos.map((a) => a.texto)).toEqual(['La deuda de 3 mo con Hobart Brezal, herrero vence el 20 de abril'])
  })
})
