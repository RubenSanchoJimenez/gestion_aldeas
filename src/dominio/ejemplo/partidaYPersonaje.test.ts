import { describe, expect, it } from 'vitest'
import { compararFechas, type Fecha } from '../calendario/fecha'
import { OPCIONES_INICIALES } from '../catalogo/inicial'
import { formatearOro } from '../dinero/formato'
import { aBase } from '../dinero/importe'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { saldoDeCaja } from '../dinero/saldo'
import { EsquemaDeuda } from '../modelo/deudas'
import { EsquemaCaja, EsquemaDominio } from '../modelo/dominios'
import { EsquemaMovimiento, EsquemaRecurrenteDinero } from '../modelo/movimientos'
import { EsquemaPartida, hayAvances } from '../modelo/partida'
import {
  EsquemaHechizo,
  EsquemaIntentoAprendizaje,
  EsquemaInversion,
  EsquemaObjetoInventario,
  EsquemaPergamino,
} from '../modelo/personaje'
import { INVERSION, MOV_THARAN } from './ids'
import {
  CAJA_THARAN,
  DEUDAS_THARAN,
  DOMINIOS,
  HECHIZOS,
  INTENTOS,
  INVERSIONES,
  MOVIMIENTOS_THARAN,
  OBJETOS,
  PARTIDA,
  PERGAMINOS,
  PERSONAS,
  RECURRENTES_THARAN,
  UBICACIONES,
} from './partidaYPersonaje'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** El 15 de marzo de 1640: el día del movimiento más antiguo de la partida (decisión 2). */
const ARRANQUE_DEL_HISTORIAL: Fecha = { anio: 1640, mes: 3, dia: 15 }

/** El 31 de marzo de 1640: ninguna regla recurrente puede empezar ese día ni antes (decisión 2). */
const FIN_DE_MARZO: Fecha = { anio: 1640, mes: 3, dia: 31 }

/** La primera fecha de una recurrencia, que unos tipos llaman `primera` y otros `inicio` (§8). */
function primeraFecha(recurrencia: { primera?: Fecha; inicio?: Fecha; fecha?: Fecha }): Fecha | undefined {
  return recurrencia.primera ?? recurrencia.inicio ?? recurrencia.fecha
}

describe('la partida y sus dominios', () => {
  it('va del 1 de enero al 12 de abril de 1640, con las equivalencias por defecto (§4, §12)', () => {
    expect(EsquemaPartida.safeParse(PARTIDA).success).toBe(true)
    expect(PARTIDA.fechaInicial).toEqual({ anio: 1640, mes: 1, dia: 1 })
    expect(PARTIDA.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 12 })
    expect(PARTIDA.edad).toBe('tercera')
    expect(PARTIDA.equivalencias).toEqual(EQ)
    expect(PARTIDA.versionFormato).toBe(1)
  })

  it('ya tuvo avances y su ración es fija: 1 saco de 30 kg al mes (§6.1, §7)', () => {
    expect(hayAvances(PARTIDA)).toBe(true)
    expect(PARTIDA.kgPorSaco).toBe(30)
    expect(PARTIDA.diasPorSaco).toBe(30)
    expect(PARTIDA.cambiosDesdeUltimoAvance).toBe(0)
  })

  it('tiene un solo personaje y dos asentamientos, en el orden del menú (§5)', () => {
    expect(DOMINIOS.map((d) => d.nombre)).toEqual(['Tharan', 'Bree', 'Archet'])
    expect(DOMINIOS.filter((d) => d.tipo === 'personaje')).toHaveLength(1)
    for (const dominio of DOMINIOS) {
      expect(EsquemaDominio.safeParse(dominio).success).toBe(true)
    }
  })
})

describe('la bolsa de Tharan', () => {
  it('parte de la bolsa inicial de P1b: 4.091.800 mh, sin «introducido» (§3, P1b)', () => {
    expect(EsquemaCaja.safeParse(CAJA_THARAN).success).toBe(true)
    expect(CAJA_THARAN.saldoInicial.base).toBe(4091800)
    expect(CAJA_THARAN.saldoInicial.introducido).toBeUndefined()
    expect(formatearOro(CAJA_THARAN.saldoInicial.base, EQ)).toBe('40,918 mo')
  })

  it('con sus 13 movimientos da 4.651.800 mh, que se escribe «46,518 mo» (§7, J2)', () => {
    expect(MOVIMIENTOS_THARAN).toHaveLength(13)
    expect(MOVIMIENTOS_THARAN.reduce((total, m) => total + m.importe.base, 0)).toBe(560000)
    const bolsa = saldoDeCaja(CAJA_THARAN, MOVIMIENTOS_THARAN)
    expect(bolsa).toBe(4651800)
    expect(formatearOro(bolsa, EQ)).toBe('46,518 mo')
  })

  it('todos sus movimientos pasan el esquema y ninguno está programado (§8)', () => {
    for (const movimiento of MOVIMIENTOS_THARAN) {
      expect(EsquemaMovimiento.safeParse(movimiento).success).toBe(true)
      expect(movimiento.programado).toBe(false)
      expect(movimiento.dominioId).toBe('dom.tharan')
    }
  })

  it('lo tecleado cuadra con el importe guardado en las equivalencias de la partida (§3)', () => {
    for (const movimiento of MOVIMIENTOS_THARAN) {
      const introducido = movimiento.importe.introducido
      if (introducido !== undefined) {
        expect(aBase(introducido.cantidad, introducido.moneda, PARTIDA.equivalencias)).toBe(
          Math.abs(movimiento.importe.base),
        )
      }
    }
  })

  it('el beneficio del Tonel del 1 de abril lleva lo tecleado en su inversión: «3 mo» (§3)', () => {
    const beneficio = MOVIMIENTOS_THARAN.find((m) => m.id === MOV_THARAN.beneficioTonel)
    const tonel = INVERSIONES.find((i) => i.id === INVERSION.tonelDorado)
    expect(beneficio?.importe).toEqual({ base: 300000, introducido: { cantidad: '3', moneda: 'mo' } })
    expect(beneficio?.importe).toEqual(tonel?.beneficio)
  })
})

describe('el historial corto de la decisión 2', () => {
  it('no hay ningún movimiento anterior al 15 de marzo de 1640', () => {
    for (const movimiento of MOVIMIENTOS_THARAN) {
      expect(compararFechas(movimiento.fecha, ARRANQUE_DEL_HISTORIAL)).toBeGreaterThanOrEqual(0)
    }
    expect(MOVIMIENTOS_THARAN[0].fecha).toEqual(ARRANQUE_DEL_HISTORIAL)
  })

  it('ninguna regla recurrente empieza el 31 de marzo de 1640 ni antes', () => {
    const recurrencias = [
      ...RECURRENTES_THARAN.map((r) => r.recurrencia),
      ...INVERSIONES.map((i) => i.recurrencia),
      ...DEUDAS_THARAN.flatMap((d) => (d.recurrenciaInteres === undefined ? [] : [d.recurrenciaInteres])),
    ]
    expect(recurrencias).toHaveLength(7)
    for (const recurrencia of recurrencias) {
      const primera = primeraFecha(recurrencia)
      expect(primera).toBeDefined()
      expect(compararFechas(primera as Fecha, FIN_DE_MARZO)).toBeGreaterThan(0)
    }
  })
})

describe('lo que el personaje referencia', () => {
  it('sus categorías son del catálogo de fábrica y sus ubicaciones y personas existen (§6.5)', () => {
    const categorias = new Set(OPCIONES_INICIALES.filter((o) => o.lista === 'categorias').map((o) => o.id))
    for (const movimiento of MOVIMIENTOS_THARAN) {
      expect(categorias.has(movimiento.categoriaId)).toBe(true)
    }
    for (const recurrente of RECURRENTES_THARAN) {
      expect(EsquemaRecurrenteDinero.safeParse(recurrente).success).toBe(true)
      expect(categorias.has(recurrente.categoriaId)).toBe(true)
    }
    const ubicaciones = new Set(UBICACIONES.map((u) => u.id))
    for (const objeto of OBJETOS) {
      if (objeto.ubicacion.tipo === 'propia') {
        expect(ubicaciones.has(objeto.ubicacion.ubicacionId)).toBe(true)
      }
    }
    const personas = new Set(PERSONAS.map((p) => p.id))
    for (const deuda of DEUDAS_THARAN) {
      expect(personas.has(deuda.contraparteId)).toBe(true)
    }
  })

  it('el inventario suma 81,6 mo en 6 objetos y el pergamino consumido queda archivado (§6.2, decisión 13)', () => {
    for (const objeto of OBJETOS) {
      expect(EsquemaObjetoInventario.safeParse(objeto).success).toBe(true)
    }
    const enElPatrimonio = OBJETOS.filter((o) => o.archivado === undefined)
    expect(enElPatrimonio).toHaveLength(6)
    const total = enElPatrimonio.reduce((suma, o) => suma + o.cantidad * o.valorUnitario.base, 0)
    expect(total).toBe(8160000)
    expect(formatearOro(total, EQ)).toBe('81,6 mo')
    expect(OBJETOS.filter((o) => o.archivado === 'consumido')).toHaveLength(1)
  })

  it('las deudas, las inversiones y los hechizos cuadran con lo que muestran J4, J6 y J7', () => {
    for (const deuda of DEUDAS_THARAN) {
      expect(EsquemaDeuda.safeParse(deuda).success).toBe(true)
    }
    const gremio = DEUDAS_THARAN[0]
    expect(gremio.pagos.reduce((suma, p) => suma + p.importe.base, 0)).toBe(2000000)
    expect(gremio.devengos.reduce((suma, d) => suma + d.importe.base, 0)).toBe(200000)
    expect(gremio.principal.base - 2000000 + 200000).toBe(4200000)
    for (const inversion of INVERSIONES) {
      expect(EsquemaInversion.safeParse(inversion).success).toBe(true)
    }
    expect(INVERSIONES.reduce((suma, i) => suma + i.capital.base, 0)).toBe(7000000)
    for (const hechizo of HECHIZOS) {
      expect(EsquemaHechizo.safeParse(hechizo).success).toBe(true)
    }
    expect(HECHIZOS.filter((h) => h.estado === 'enEstudio')).toHaveLength(2)
    for (const intento of INTENTOS) {
      expect(EsquemaIntentoAprendizaje.safeParse(intento).success).toBe(true)
    }
    for (const pergamino of PERGAMINOS) {
      expect(EsquemaPergamino.safeParse(pergamino).success).toBe(true)
    }
  })
})
