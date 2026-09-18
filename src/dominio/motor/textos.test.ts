import { describe, expect, it } from 'vitest'
import { formatearOro } from '../dinero/formato'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Dominio } from '../modelo/dominios'
import {
  ajustarTexto,
  avisoImpago,
  avisoPagoNoCubierto,
  avisoSaldoNegativo,
  conceptoBeneficio,
  conceptoDiario,
  conceptoLocales,
  conceptoSalarios,
  conceptoSoldadas,
  conceptoVentaCaravana,
  contraparteDeSalarios,
  contraparteDeSoldadas,
  hechoCaravanaDeVuelta,
  hechoLocalesCobrados,
  hechoTributoPagado,
  laCajaDe,
  nombreDeContraparte,
  nombreDeOficio,
  nombreDeRecurso,
} from './textos'

const EQ = EQUIVALENCIAS_POR_DEFECTO

const THARAN: Dominio = { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' }
const BREE: Dominio = {
  id: 'dom.bree',
  tipo: 'asentamiento',
  nombre: 'Bree',
  categoria: 'pueblo',
  alta: { anio: 1640, mes: 1, dia: 1 },
}
const ARCHET: Dominio = { ...BREE, id: 'dom.archet', nombre: 'Archet', categoria: 'aldea' }

describe('ajustarTexto', () => {
  it('deja igual lo que cabe y corta lo que no con «…», justo al máximo (T26)', () => {
    expect(ajustarTexto('Posada', 6)).toBe('Posada')
    expect(ajustarTexto('Posada El Poney Pisador', 10)).toBe('Posada El…')
    expect(ajustarTexto('x'.repeat(130), 120)).toHaveLength(120)
    expect(ajustarTexto('x'.repeat(130), 120).endsWith('x…')).toBe(true)
  })
})

describe('conceptos de los movimientos del avance (apartado 3.1)', () => {
  it('diarios: «· 7 noches» con la unidad de la regla y «· 7 días» sin ella (§9 l.1285, D-030)', () => {
    expect(conceptoDiario('Posada El Poney Pisador', 7, 'noches')).toBe('Posada El Poney Pisador · 7 noches')
    expect(conceptoDiario('Establo del poni', 7)).toBe('Establo del poni · 7 días')
    expect(conceptoDiario('Peaje del camino', 2)).toBe('Peaje del camino · 2 días')
  })

  it('diarios con un solo día: «1 noche» y «1 día», sin la «s» final (D-030)', () => {
    expect(conceptoDiario('Posada El Poney Pisador', 1, 'noches')).toBe('Posada El Poney Pisador · 1 noche')
    expect(conceptoDiario('Peaje del camino', 1)).toBe('Peaje del camino · 1 día')
  })

  it('un diario corta el concepto de la regla a 120 y nunca el sufijo (T26)', () => {
    const concepto = conceptoDiario('P'.repeat(120), 366, 'noches')
    expect(concepto).toHaveLength(120)
    expect(concepto.endsWith('P… · 366 noches')).toBe(true)
  })

  it('salarios: «Salarios de 14 trabajadores», «Salarios de 1 trabajador» y, diarios, con los días (D-029, D-031)', () => {
    expect(conceptoSalarios(14)).toBe('Salarios de 14 trabajadores')
    expect(conceptoSalarios(1)).toBe('Salarios de 1 trabajador')
    expect(conceptoSalarios(3, 7)).toBe('Salarios de 3 trabajadores · 7 días')
    expect(conceptoSalarios(1, 1)).toBe('Salarios de 1 trabajador · 1 día')
  })

  it('soldadas: «Soldada de la guarnición», sin número, y con los días si son diarias (D-031)', () => {
    expect(conceptoSoldadas()).toBe('Soldada de la guarnición')
    expect(conceptoSoldadas(7)).toBe('Soldada de la guarnición · 7 días')
    expect(conceptoSoldadas(1)).toBe('Soldada de la guarnición · 1 día')
  })

  it('locales: los meses cobrados y cuántos locales pagan, con el año solo si cruzan de año (§9 l.1288, D-031)', () => {
    expect(conceptoLocales([{ anio: 1640, mes: 4 }], 4)).toBe('Impuestos de locales · abril (4)')
    const marzoYAbril = [
      { anio: 1640, mes: 3 },
      { anio: 1640, mes: 4 },
    ]
    expect(conceptoLocales(marzoYAbril, 4)).toBe('Impuestos de locales · marzo y abril (4)')
    const primerTrimestre = [
      { anio: 1640, mes: 1 },
      { anio: 1640, mes: 2 },
      { anio: 1640, mes: 3 },
    ]
    expect(conceptoLocales(primerTrimestre, 2)).toBe('Impuestos de locales · enero, febrero y marzo (2)')
    const cruzanDeAnio = [
      { anio: 1639, mes: 12 },
      { anio: 1640, mes: 1 },
    ]
    expect(conceptoLocales(cruzanDeAnio, 1)).toBe('Impuestos de locales · diciembre de 1639 y enero de 1640 (1)')
  })

  it('locales: muchos meses caben en 120 sin cortar el número de locales (T26)', () => {
    // De febrero de 1639 a enero de 1640: doce meses que cruzan de año, cada uno con el suyo.
    const meses = Array.from({ length: 12 }, (_, i) => (i < 11 ? { anio: 1639, mes: i + 2 } : { anio: 1640, mes: 1 }))
    const concepto = conceptoLocales(meses, 3)
    expect(concepto).toHaveLength(120)
    expect(concepto.startsWith('Impuestos de locales · febrero de 1639, marzo de 1639')).toBe(true)
    expect(concepto.endsWith('… (3)')).toBe(true)
  })

  it('beneficio y vuelta de una venta: «Beneficio de …» y «Caravana: venta de cerveza en Fornost» (D-031, T27)', () => {
    expect(conceptoBeneficio('Barcaza del Brandivino')).toBe('Beneficio de Barcaza del Brandivino')
    expect(conceptoVentaCaravana('Cerveza', 'Fornost')).toBe('Caravana: venta de cerveza en Fornost')
    expect(conceptoVentaCaravana('mercancía', 'Tharbad')).toBe('Caravana: venta de mercancía en Tharbad')
    const largo = conceptoVentaCaravana('R'.repeat(40), 'M'.repeat(60))
    expect(largo).toHaveLength(120)
    expect(largo.startsWith('Caravana: venta de rRRR')).toBe(true)
  })
})

describe('nombres del catálogo', () => {
  it('el oficio va en singular con 1 y en plural con más (§6.3 l.579, T9)', () => {
    const catalogo = catalogosDeEjemplo()
    expect(nombreDeOficio(catalogo, 'oficio.pastor', 1)).toBe('Pastor')
    expect(nombreDeOficio(catalogo, 'oficio.pastor', 3)).toBe('Pastores')
    expect(nombreDeOficio(catalogo, 'oficio.granjero', 6)).toBe('Granjeros')
  })

  it('sin la opción en el catálogo: «Trabajador(es)» y «mercancía»; con ella, el nombre del recurso (T28)', () => {
    const catalogo = catalogosDeEjemplo()
    expect(nombreDeOficio(catalogo, 'oficio.inventado', 1)).toBe('Trabajador')
    expect(nombreDeOficio(catalogo, 'oficio.inventado', 2)).toBe('Trabajadores')
    expect(nombreDeOficio(catalogo, 'cat.salarios', 2)).toBe('Trabajadores')
    expect(nombreDeRecurso(catalogo, 'recurso.cerveza')).toBe('Cerveza')
    expect(nombreDeRecurso(catalogo, 'recurso.inventado')).toBe('mercancía')
  })
})

describe('contrapartes de los impagos (apartado 3.2)', () => {
  it('salarios y soldadas: «Trabajadores de Bree» y «Guarnición de Bree» (§9 l.1294)', () => {
    expect(contraparteDeSalarios('Bree')).toBe('Trabajadores de Bree')
    expect(contraparteDeSoldadas('Bree')).toBe('Guarnición de Bree')
  })

  it('un nombre de más de 60 se queda en los primeros 59 y «…»; uno válido no cambia (D-023)', () => {
    const largo = contraparteDeSalarios('A'.repeat(60))
    expect(largo).toHaveLength(76)
    const cortado = nombreDeContraparte(largo)
    expect(cortado).toHaveLength(60)
    expect(cortado).toBe(`Trabajadores de ${'A'.repeat(43)}…`)
    expect(nombreDeContraparte('Corona de Arthedain')).toBe('Corona de Arthedain')
    expect(nombreDeContraparte('Posada El Poney Pisador')).toBe('Posada El Poney Pisador')
  })

  it('uno de una letra o reservado por los filtros gana « (impago)» (D-023)', () => {
    expect(nombreDeContraparte('X')).toBe('X (impago)')
    expect(nombreDeContraparte('Todos')).toBe('Todos (impago)')
    expect(nombreDeContraparte('Todas las categorías')).toBe('Todas las categorías (impago)')
  })
})

describe('hechos del avance (apartado 3.3)', () => {
  it('tributo pagado, locales cobrados y caravana de vuelta, con el día que se les pase (D-032)', () => {
    expect(hechoTributoPagado('Archet', '19')).toBe('Tributo de Archet pagado · 19')
    expect(hechoLocalesCobrados('Bree', '1')).toBe('Impuestos de locales de Bree cobrados · 1')
    expect(hechoCaravanaDeVuelta('Fornost', '18')).toBe('Caravana de Fornost de vuelta · 18')
    expect(hechoTributoPagado('Archet', '19 de abril de 1641')).toBe('Tributo de Archet pagado · 19 de abril de 1641')
  })
})

describe('avisos de dinero (apartado 3.4)', () => {
  it('la bolsa es la del personaje y la caja, la de un asentamiento (§6.4 l.808)', () => {
    expect(laCajaDe(THARAN)).toBe('La bolsa de Tharan')
    expect(laCajaDe(BREE)).toBe('La caja de Bree')
  })

  it('saldo negativo: «La bolsa de Tharan está en negativo: −3,482 mo» (§6.4 l.808)', () => {
    expect(avisoSaldoNegativo(THARAN, formatearOro(-348200, EQ))).toBe('La bolsa de Tharan está en negativo: −3,482 mo')
    expect(avisoSaldoNegativo(BREE, formatearOro(-60000, EQ))).toBe('La caja de Bree está en negativo: −0,6 mo')
  })

  it('impago: «… no pudo pagar a Trabajadores de Bree: 1,2 mo pendientes» (D-024)', () => {
    expect(avisoImpago(BREE, 'Trabajadores de Bree', formatearOro(120000, EQ))).toBe(
      'La caja de Bree no pudo pagar a Trabajadores de Bree: 1,2 mo pendientes',
    )
    expect(avisoImpago(ARCHET, 'Corona de Arthedain', formatearOro(1880000, EQ))).toBe(
      'La caja de Archet no pudo pagar a Corona de Arthedain: 18,8 mo pendientes',
    )
  })

  it('pago no cubierto: el tributo, los salarios, la soldada o «concepto» (§9 l.1354, D-025)', () => {
    expect(avisoPagoNoCubierto(ARCHET, { clase: 'tributo' }, formatearOro(6000000, EQ), '19 de julio')).toBe(
      'La caja de Archet no cubre el tributo de 60 mo del 19 de julio',
    )
    expect(avisoPagoNoCubierto(ARCHET, { clase: 'salarios' }, formatearOro(320000, EQ), '26 de julio')).toBe(
      'La caja de Archet no cubre los salarios de 3,2 mo del 26 de julio',
    )
    expect(avisoPagoNoCubierto(BREE, { clase: 'soldadas' }, formatearOro(420000, EQ), '20 de abril')).toBe(
      'La caja de Bree no cubre la soldada de 4,2 mo del 20 de abril',
    )
    const posada = { clase: 'concepto', concepto: 'Posada El Poney Pisador' } as const
    expect(avisoPagoNoCubierto(THARAN, posada, formatearOro(10000, EQ), '20 de abril')).toBe(
      'La bolsa de Tharan no cubre «Posada El Poney Pisador» de 0,1 mo del 20 de abril',
    )
  })

  it('pago no cubierto: un concepto de 120 se corta para que el aviso quepa en 200 (T26)', () => {
    const texto = avisoPagoNoCubierto(
      { ...BREE, nombre: 'B'.repeat(60) },
      { clase: 'concepto', concepto: 'C'.repeat(120) },
      formatearOro(123456789, EQ),
      '19 de septiembre de 1641',
    )
    expect(texto).toHaveLength(200)
    expect(texto.endsWith('C…» de 1.234,56789 mo del 19 de septiembre de 1641')).toBe(true)
  })
})
