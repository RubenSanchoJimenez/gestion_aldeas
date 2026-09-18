import { describe, expect, it } from 'vitest'
import { compararFechas, type Fecha } from '../calendario/fecha'
import { CATEGORIA, OPCIONES_INICIALES } from '../catalogo/inicial'
import { formatearOro } from '../dinero/formato'
import { aBase } from '../dinero/importe'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { saldoDeCaja } from '../dinero/saldo'
import {
  EsquemaImpuestoRenta,
  EsquemaLocalComercial,
  EsquemaTipoLocal,
  EsquemaTrabajador,
  EsquemaUnidadGuarnicion,
} from '../modelo/asentamiento'
import { EsquemaDeuda } from '../modelo/deudas'
import { EsquemaMovimiento, EsquemaTransferencia } from '../modelo/movimientos'
import {
  CAJAS_ASENTAMIENTOS,
  DEUDAS_ASENTAMIENTOS,
  IMPUESTOS_RENTAS,
  LOCALES_COMERCIALES,
  MOVIMIENTOS_ARCHET,
  MOVIMIENTOS_BREE,
  TIPOS_LOCAL,
  TRABAJADORES,
  TRANSFERENCIAS,
  UNIDADES_GUARNICION,
} from './asentamientosDinero'
import { DOM, LOCAL, MOV_BREE, MOV_THARAN } from './ids'
import { MOVIMIENTOS_THARAN, PARTIDA } from './partidaYPersonaje'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** El libro entero de la partida: el saldo de una caja mira los movimientos de todos los dominios (§7). */
const TODOS_LOS_MOVIMIENTOS = [...MOVIMIENTOS_THARAN, ...MOVIMIENTOS_BREE, ...MOVIMIENTOS_ARCHET]

/** El 20 de marzo de 1640: el día del movimiento más antiguo de los asentamientos (decisión 2). */
const ARRANQUE_DE_LOS_ASENTAMIENTOS: Fecha = { anio: 1640, mes: 3, dia: 20 }

/** El 31 de marzo de 1640: ninguna regla de los asentamientos empieza ese día ni antes (decisión 2). */
const FIN_DE_MARZO: Fecha = { anio: 1640, mes: 3, dia: 31 }

/** La primera fecha de una recurrencia, que unos tipos llaman `primera` y otros `inicio` (§8). */
function primeraFecha(recurrencia: { primera?: Fecha; inicio?: Fecha; fecha?: Fecha }): Fecha | undefined {
  return recurrencia.primera ?? recurrencia.inicio ?? recurrencia.fecha
}

describe('las cajas de Bree y de Archet', () => {
  it('la caja de Bree da 34.060.000 mh, que se escribe «340,6 mo» (§7, A2)', () => {
    const caja = CAJAS_ASENTAMIENTOS[0]
    expect(caja.dominioId).toBe(DOM.bree)
    expect(caja.saldoInicial.base).toBe(49890000)
    expect(MOVIMIENTOS_BREE.reduce((total, m) => total + m.importe.base, 0)).toBe(-15830000)
    const saldo = saldoDeCaja(caja, TODOS_LOS_MOVIMIENTOS)
    expect(saldo).toBe(34060000)
    expect(formatearOro(saldo, EQ)).toBe('340,6 mo')
  })

  it('la caja de Archet da 8.500.000 mh, que se escribe «85 mo» (§7, Inicio)', () => {
    const caja = CAJAS_ASENTAMIENTOS[1]
    expect(caja.dominioId).toBe(DOM.archet)
    expect(caja.saldoInicial.base).toBe(12500000)
    const saldo = saldoDeCaja(caja, TODOS_LOS_MOVIMIENTOS)
    expect(saldo).toBe(8500000)
    expect(formatearOro(saldo, EQ)).toBe('85 mo')
  })
})

describe('los libros de los asentamientos', () => {
  it('los 16 movimientos pasan el esquema, no están programados y lo tecleado cuadra (§3, §8)', () => {
    expect(MOVIMIENTOS_BREE).toHaveLength(15)
    expect(MOVIMIENTOS_ARCHET).toHaveLength(1)
    for (const movimiento of [...MOVIMIENTOS_BREE, ...MOVIMIENTOS_ARCHET]) {
      expect(EsquemaMovimiento.safeParse(movimiento).success).toBe(true)
      expect(movimiento.programado).toBe(false)
      const introducido = movimiento.importe.introducido
      if (introducido !== undefined) {
        expect(aBase(introducido.cantidad, introducido.moneda, PARTIDA.equivalencias)).toBe(
          Math.abs(movimiento.importe.base),
        )
      }
    }
  })

  it('los movimientos agrupados cuadran con su detalle (§9, decisión 16)', () => {
    const locales = MOVIMIENTOS_BREE.find((m) => m.id === MOV_BREE.locales)
    expect(locales?.detalleLocales).toHaveLength(4)
    expect(locales?.detalleLocales?.reduce((suma, d) => suma + d.impuesto.base, 0)).toBe(470000)
    expect(locales?.importe.base).toBe(470000)

    const salarios = MOVIMIENTOS_BREE.find((m) => m.id === MOV_BREE.salarios6Abril)
    expect(salarios?.detalleTrabajo).toHaveLength(5)
    expect(salarios?.detalleTrabajo?.reduce((suma, d) => suma + d.importe.base, 0)).toBe(420000)
    expect(salarios?.importe.base).toBe(-420000)

    const soldadas = MOVIMIENTOS_BREE.find((m) => m.id === MOV_BREE.soldadas10Abril)
    expect(soldadas?.detalleTrabajo).toHaveLength(3)
    expect(soldadas?.detalleTrabajo?.reduce((suma, d) => suma + d.importe.base, 0)).toBe(580000)
    expect(soldadas?.importe.base).toBe(-580000)
  })

  it('el detalle de los salarios nombra el oficio en singular con 1 y en plural con más: «Pastor» (§6.3)', () => {
    const salarios = MOVIMIENTOS_BREE.find((m) => m.id === MOV_BREE.salarios6Abril)
    expect(salarios?.detalleTrabajo?.map((d) => [d.nombre, d.numero])).toEqual([
      ['Granjeros', 6],
      ['Leñadores', 3],
      ['Cerveceros', 2],
      ['Canteros', 2],
      ['Pastor', 1],
    ])
  })

  it('la transferencia del 6 de abril tiene sus dos movimientos, uno en cada dominio (§8)', () => {
    expect(TRANSFERENCIAS).toHaveLength(1)
    const transferencia = TRANSFERENCIAS[0]
    expect(EsquemaTransferencia.safeParse(transferencia).success).toBe(true)
    expect(transferencia.saleDeId).toBe(DOM.bree)
    expect(transferencia.entraEnId).toBe(DOM.tharan)
    const sale = MOVIMIENTOS_BREE.find((m) => m.id === transferencia.movimientoSaleId)
    const entra = MOVIMIENTOS_THARAN.find((m) => m.id === transferencia.movimientoEntraId)
    expect(sale?.importe.base).toBe(-2000000)
    expect(entra?.importe.base).toBe(2000000)
    expect(sale?.tipo).toBe('transferencia')
    expect(entra?.tipo).toBe('transferencia')
    expect(entra?.id).toBe(MOV_THARAN.transferencia)
  })

  it('la compra de víveres usa «Víveres del almacén» y nadie más (decisión 11)', () => {
    const conViveres = MOVIMIENTOS_BREE.filter((m) => m.categoriaId === CATEGORIA.viveresDelAlmacen)
    expect(conViveres.map((m) => m.id)).toEqual([MOV_BREE.caravanaTharbad])
    expect(conViveres[0].importe.base).toBe(-7500000)
  })

  it('no hay movimientos anteriores al 20 de marzo ni reglas anteriores al 31 de marzo (decisión 2)', () => {
    for (const movimiento of [...MOVIMIENTOS_BREE, ...MOVIMIENTOS_ARCHET]) {
      expect(compararFechas(movimiento.fecha, ARRANQUE_DE_LOS_ASENTAMIENTOS)).toBeGreaterThanOrEqual(0)
    }
    const recurrencias = [
      ...IMPUESTOS_RENTAS.map((i) => i.recurrencia),
      ...TRABAJADORES.map((t) => t.recurrencia),
      ...UNIDADES_GUARNICION.map((u) => u.recurrencia),
    ]
    expect(recurrencias).toHaveLength(16)
    for (const recurrencia of recurrencias) {
      const primera = primeraFecha(recurrencia)
      expect(primera).toBeDefined()
      expect(compararFechas(primera as Fecha, FIN_DE_MARZO)).toBeGreaterThan(0)
    }
  })
})

describe('las reglas de los asentamientos', () => {
  it('los siete ingresos y tributos llevan su categoriaId (decisión 3)', () => {
    expect(IMPUESTOS_RENTAS).toHaveLength(7)
    const categorias = new Set(OPCIONES_INICIALES.filter((o) => o.lista === 'categorias').map((o) => o.id))
    for (const impuesto of IMPUESTOS_RENTAS) {
      expect(EsquemaImpuestoRenta.safeParse(impuesto).success).toBe(true)
      expect(categorias.has(impuesto.categoriaId)).toBe(true)
    }
    expect(IMPUESTOS_RENTAS.map((i) => i.categoriaId)).toEqual([
      CATEGORIA.impuestos,
      CATEGORIA.aranceles,
      CATEGORIA.rentasYAlquileres,
      CATEGORIA.impuestos,
      CATEGORIA.tributos,
      CATEGORIA.tributos,
      CATEGORIA.rentasYAlquileres,
    ])
  })

  it('los cuatro locales se dan de alta en marzo y solo han cobrado el 1 de abril (decisión 2)', () => {
    expect(TIPOS_LOCAL).toHaveLength(3)
    for (const tipo of TIPOS_LOCAL) {
      expect(EsquemaTipoLocal.safeParse(tipo).success).toBe(true)
      expect(tipo.diaCobro).toBe(1)
    }
    expect(LOCALES_COMERCIALES).toHaveLength(4)
    for (const local of LOCALES_COMERCIALES) {
      expect(EsquemaLocalComercial.safeParse(local).success).toBe(true)
      expect(local.alta).toEqual({ anio: 1640, mes: 3, dia: 1 })
      expect(local.cobradoHasta).toEqual({ anio: 1640, mes: 3 })
      expect(local.cambiosEstado).toEqual([{ desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' }])
    }
    const telas = LOCALES_COMERCIALES.find((l) => l.id === LOCAL.tiendaDeTelas)
    expect(telas?.producciones).toHaveLength(1)
    expect(telas?.producciones[0].mes).toEqual({ anio: 1640, mes: 4 })
  })

  it('Bree paga 4,2 mo a 14 trabajadores y 5,8 mo a 11 soldados (§6.3, A5 y A6)', () => {
    const deBree = TRABAJADORES.filter((t) => t.dominioId === DOM.bree)
    expect(deBree).toHaveLength(5)
    expect(deBree.reduce((suma, t) => suma + t.numero, 0)).toBe(14)
    expect(deBree.reduce((suma, t) => suma + t.numero * t.salario.base, 0)).toBe(420000)
    for (const trabajador of TRABAJADORES) {
      expect(EsquemaTrabajador.safeParse(trabajador).success).toBe(true)
    }
    expect(UNIDADES_GUARNICION.reduce((suma, u) => suma + u.numero, 0)).toBe(11)
    expect(UNIDADES_GUARNICION.reduce((suma, u) => suma + u.numero * u.soldada.base, 0)).toBe(580000)
    for (const unidad of UNIDADES_GUARNICION) {
      expect(EsquemaUnidadGuarnicion.safeParse(unidad).success).toBe(true)
    }
  })

  it('la única deuda de Bree es el adelanto del Gremio, con su movimiento de alta (§6.3, A2b)', () => {
    expect(DEUDAS_ASENTAMIENTOS).toHaveLength(1)
    const deuda = DEUDAS_ASENTAMIENTOS[0]
    expect(EsquemaDeuda.safeParse(deuda).success).toBe(true)
    expect(deuda.principal.base).toBe(3000000)
    expect(deuda.cuentaAltaId).toBe(DOM.bree)
    const alta = MOVIMIENTOS_BREE.find((m) => m.id === MOV_BREE.adelantoGranero)
    expect(alta?.vinculo).toEqual({ tipo: 'altaDeuda', id: deuda.id })
    expect(alta?.importe.base).toBe(3000000)
  })
})
