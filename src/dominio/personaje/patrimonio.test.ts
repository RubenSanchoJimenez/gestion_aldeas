import { describe, expect, it } from 'vitest'
import { formatearOro } from '../dinero/formato'
import { DEUDA, DOM, INVERSION, OBJETO } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { patrimonioDelPersonaje } from './patrimonio'

/** El estado del ejemplo, con un cambio encima si se pide. */
function estadoCon(cambiar?: (estado: EstadoPartida) => EstadoPartida): EstadoPartida {
  const estado = estadoDe(documentoDeEjemplo())
  return cambiar === undefined ? estado : cambiar(estado)
}

describe('patrimonioDelPersonaje (O2)', () => {
  it('el desglose de J1 con el ejemplo, fila a fila', () => {
    expect(patrimonioDelPersonaje(estadoCon())).toEqual({
      bolsa: 4651800,
      inventario: 8160000,
      inversiones: 7000000,
      teDeben: 1500000,
      debes: 4600000,
      neto: 16711800,
    })
  })

  it('el neto del ejemplo son 167,118 mo (O2)', () => {
    const patrimonio = patrimonioDelPersonaje(estadoCon())
    expect(formatearOro(patrimonio.neto, estadoCon().partida.equivalencias)).toBe('167,118 mo')
  })

  it('un objeto archivado no cuenta en el inventario (esp l.1056)', () => {
    const patrimonio = patrimonioDelPersonaje(
      estadoCon((estado) => ({
        ...estado,
        objetos: estado.objetos.map((o) => (o.id === OBJETO.espada ? { ...o, archivado: 'vendido' as const } : o)),
      })),
    )
    const espada = estadoCon().objetos.find((o) => o.id === OBJETO.espada)
    const valor = (espada?.valorUnitario.base ?? 0) * (espada?.cantidad ?? 0)
    expect(valor).toBeGreaterThan(0)
    expect(patrimonio.inventario).toBe(8160000 - valor)
  })

  it('una inversión retirada no cuenta, aunque guarde su capital (esp l.1056)', () => {
    const patrimonio = patrimonioDelPersonaje(
      estadoCon((estado) => ({
        ...estado,
        inversiones: estado.inversiones.map((i) =>
          i.id === INVERSION.tonelDorado
            ? {
                ...i,
                estado: 'retirada' as const,
                retirada: { fecha: { anio: 1640, mes: 4, dia: 10 }, importe: { base: 5000000 }, movimientoId: 'mov.x' },
              }
            : i,
        ),
      })),
    )
    expect(patrimonio.inversiones).toBe(2000000)
  })

  it('cuenta el capital completo de la inversión, no la participación (esp l.423)', () => {
    const inversiones = estadoCon().inversiones.filter((i) => i.estado === 'activa')
    expect(inversiones.some((i) => i.participacionPct > 0 && i.participacionPct < 100)).toBe(true)
    expect(patrimonioDelPersonaje(estadoCon()).inversiones).toBe(
      inversiones.reduce((total, i) => total + i.capital.base, 0),
    )
  })

  it('las deudas de un asentamiento no entran (decidido por el usuario el 2026-09-16)', () => {
    const bree = estadoCon().deudas.find((d) => d.id === DEUDA.gremioBree)
    expect(bree?.dominioId).toBe(DOM.bree)
    expect(patrimonioDelPersonaje(estadoCon()).debes).toBe(4600000)
  })

  it('«debes» cuenta el pendiente con sus intereses, no el principal', () => {
    // El Gremio debe 42 mo (capital 40 + 2 de intereses) y Hobart 4 mo: 46 mo en total.
    expect(patrimonioDelPersonaje(estadoCon()).debes).toBe(4200000 + 400000)
  })

  it('una deuda saldada no cuenta ni en «debes» ni en «te deben»', () => {
    const patrimonio = patrimonioDelPersonaje(
      estadoCon((estado) => ({
        ...estado,
        deudas: estado.deudas.map((d) => (d.dominioId === DOM.tharan ? { ...d, estado: 'saldada' as const } : d)),
      })),
    )
    expect(patrimonio.debes).toBe(0)
    expect(patrimonio.teDeben).toBe(0)
    expect(patrimonio.neto).toBe(4651800 + 8160000 + 7000000)
  })

  it('una deuda de impago del personaje sí cuenta en «debes» (§9)', () => {
    const patrimonio = patrimonioDelPersonaje(
      estadoCon((estado) => ({
        ...estado,
        deudas: [
          ...estado.deudas,
          {
            id: 'deuda.impago',
            dominioId: DOM.tharan,
            sentido: 'debo' as const,
            contraparteId: 'persona.hobart',
            fecha: { anio: 1640, mes: 4, dia: 10 },
            principal: { base: 100000 },
            interesPct: 0,
            estado: 'abierta' as const,
            impago: true,
            origenImpago: { tipo: 'recurrente' as const, id: 'rec.x' },
            cargos: [{ fecha: { anio: 1640, mes: 4, dia: 10 }, importe: { base: 100000 }, avanceId: 'av.x' }],
            pagos: [],
            devengos: [],
          },
        ],
      })),
    )
    expect(patrimonio.debes).toBe(4700000)
  })
})
