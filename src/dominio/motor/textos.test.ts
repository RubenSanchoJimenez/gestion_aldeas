import { describe, expect, it } from 'vitest'
import { RECURSO } from '../catalogo/inicial'
import { formatearOro } from '../dinero/formato'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import type { RecursoEnCopia } from '../modelo/catalogos'
import type { RecurrenciaProduccion } from '../modelo/comunes'
import type { Dominio } from '../modelo/dominios'
import {
  ajustarTexto,
  avisoCaravanaQueNoPudoSalir,
  avisoCompraQueNoPudoHacerse,
  avisoEdificioTerminado,
  avisoFaltaOcurrida,
  avisoFaltaPrevista,
  avisoImpago,
  avisoMejoraTerminada,
  avisoObraQueNoPudoEmpezar,
  avisoPagoNoCubierto,
  avisoPerdidaOcurrida,
  avisoPerdidaPrevista,
  avisoSaldoNegativo,
  conceptoBeneficio,
  conceptoCompraAlmacen,
  conceptoCompraCaravana,
  conceptoDiario,
  conceptoLocales,
  conceptoObra,
  conceptoSalarios,
  conceptoSoldadas,
  conceptoVentaCaravana,
  contraparteDeSalarios,
  contraparteDeSoldadas,
  faltaDeDinero,
  hechoCaravanaDeVuelta,
  hechoEventoTerminado,
  hechoLocalesCobrados,
  hechoObraTerminada,
  hechoTrasladoLlegado,
  hechoTributoPagado,
  laCajaDe,
  minusculaInicial,
  nombreDeContraparte,
  nombreDeFrecuencia,
  nombreDeOficio,
  nombreDeRecurso,
  recursoDelCatalogo,
  textoFaltan,
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

const VIVERES: RecursoEnCopia = { id: RECURSO.viveres, nombre: 'Víveres', unidadSingular: 'saco', unidadPlural: 'sacos', propia: false }
const MADERA: RecursoEnCopia = { id: RECURSO.madera, nombre: 'Madera', unidadSingular: 'haz', unidadPlural: 'haces', propia: false }
const PIEDRA: RecursoEnCopia = { id: RECURSO.piedra, nombre: 'Piedra', unidadSingular: 'carretada', unidadPlural: 'carretadas', propia: false }
const CERVEZA: RecursoEnCopia = { id: RECURSO.cerveza, nombre: 'Cerveza', unidadSingular: 'barril', unidadPlural: 'barriles', propia: false }
const LANA: RecursoEnCopia = { id: RECURSO.lana, nombre: 'Lana', unidadSingular: 'fardo', unidadPlural: 'fardos', propia: false }
const HIERRO: RecursoEnCopia = { id: RECURSO.hierro, nombre: 'Hierro', unidadSingular: 'lingote', unidadPlural: 'lingotes', propia: false }
const CAL: RecursoEnCopia = { id: 'recurso.cal', nombre: 'Cal', unidadSingular: 'carretada', unidadPlural: 'carretadas', propia: true }

describe('minusculaInicial', () => {
  it('«Oro en bruto» → «oro en bruto»; una cadena vacía se queda vacía', () => {
    expect(minusculaInicial('Oro en bruto')).toBe('oro en bruto')
    expect(minusculaInicial('')).toBe('')
  })
})

describe('conceptos del almacén (D-066)', () => {
  it('conceptoObra: «Obra: nuevo granero» y «Obra: reparación de la puerta del sur»', () => {
    expect(conceptoObra('Nuevo granero')).toBe('Obra: nuevo granero')
    expect(conceptoObra('Reparación de la puerta del sur')).toBe('Obra: reparación de la puerta del sur')
  })

  it('conceptoCompraCaravana: «Caravana: compra de víveres en Tharbad»', () => {
    expect(conceptoCompraCaravana('Víveres', 'Tharbad')).toBe('Caravana: compra de víveres en Tharbad')
  })

  it('conceptoCompraAlmacen: «Compra de víveres en Bree»', () => {
    expect(conceptoCompraAlmacen('Víveres', 'Bree')).toBe('Compra de víveres en Bree')
  })
})

describe('hechos del almacén (D-052)', () => {
  it('hechoObraTerminada: «Obra «Reparación de la puerta del sur» terminada · 17»', () => {
    expect(hechoObraTerminada('Reparación de la puerta del sur', '17')).toBe(
      'Obra «Reparación de la puerta del sur» terminada · 17',
    )
  })

  it('hechoEventoTerminado: «Feria de primavera · 15 al 17» y «Lluvias de primavera · 8 al 21 de abril»', () => {
    expect(hechoEventoTerminado('Feria de primavera', '15 al 17')).toBe('Feria de primavera · 15 al 17')
    expect(hechoEventoTerminado('Lluvias de primavera', '8 al 21 de abril')).toBe(
      'Lluvias de primavera · 8 al 21 de abril',
    )
  })

  it('hechoTrasladoLlegado: «Caravana de Bree llegada a Archet · 25»', () => {
    expect(hechoTrasladoLlegado('Bree', 'Archet', '25')).toBe('Caravana de Bree llegada a Archet · 25')
  })
})

describe('avisoFaltaPrevista', () => {
  it('víveres: «Los víveres de Bree se agotan el 23 de abril», y con una caravana que no llega a tiempo', () => {
    expect(avisoFaltaPrevista('Bree', VIVERES, '23 de abril')).toBe('Los víveres de Bree se agotan el 23 de abril')
    expect(
      avisoFaltaPrevista('Bree', VIVERES, '23 de abril', { de: 'Tharbad', operacion: 'compra', fecha: '25 de abril' }),
    ).toBe('Los víveres de Bree se agotan el 23 de abril y la caravana de Tharbad no vuelve hasta el 25 de abril')
    expect(
      avisoFaltaPrevista('Bree', VIVERES, '23 de abril', { de: 'Archet', operacion: 'traslado', fecha: '25 de abril' }),
    ).toBe('Los víveres de Bree se agotan el 23 de abril y la caravana de Archet no llega hasta el 25 de abril')
  })

  it('otro recurso: «Bree se queda sin cerveza el 26 de julio»', () => {
    expect(avisoFaltaPrevista('Bree', CERVEZA, '26 de julio')).toBe('Bree se queda sin cerveza el 26 de julio')
  })
})

describe('avisoFaltaOcurrida', () => {
  it('víveres y madera en plural, y «faltó 1 saco» en singular', () => {
    expect(avisoFaltaOcurrida('Bree', VIVERES, '23 de abril', 2216.667)).toBe(
      'Los víveres de Bree se agotaron el 23 de abril: faltaron 2.217 sacos',
    )
    expect(avisoFaltaOcurrida('Bree', MADERA, '6 de julio', 62.16)).toBe(
      'Bree se quedó sin madera el 6 de julio: faltaron 62 haces',
    )
    expect(avisoFaltaOcurrida('Archet', VIVERES, '9 de julio', 1)).toBe(
      'Los víveres de Archet se agotaron el 9 de julio: faltó 1 saco',
    )
  })
})

describe('avisoPerdidaPrevista', () => {
  it('plural con 7 y singular con 1', () => {
    expect(avisoPerdidaPrevista('Bree', LANA, 7, '19 de mayo')).toBe(
      'Se perderán 7 fardos de lana en Bree el 19 de mayo',
    )
    expect(avisoPerdidaPrevista('Bree', LANA, 1, '19 de mayo')).toBe('Se perderá 1 fardo de lana en Bree el 19 de mayo')
  })
})

describe('avisoPerdidaOcurrida', () => {
  it('«desde el» con varios días y «el» con uno solo', () => {
    expect(avisoPerdidaOcurrida('Bree', LANA, 103, '19 de mayo', true)).toBe(
      'Se perdieron 103 fardos de lana en Bree desde el 19 de mayo',
    )
    expect(avisoPerdidaOcurrida('Bree', PIEDRA, 13.333, '14 de julio', false)).toBe(
      'Se perdieron 13 carretadas de piedra en Bree el 14 de julio',
    )
  })
})

describe('avisoObraQueNoPudoEmpezar', () => {
  it('con faltas y sin faltas', () => {
    expect(avisoObraQueNoPudoEmpezar('Horno comunal', ['20 carretadas de cal', '12 mo en la caja'])).toBe(
      'La obra «Horno comunal» no pudo empezar por falta de 20 carretadas de cal y 12 mo en la caja',
    )
    expect(avisoObraQueNoPudoEmpezar('Horno comunal', [])).toBe('La obra «Horno comunal» no pudo empezar')
  })
})

describe('avisoCaravanaQueNoPudoSalir', () => {
  it('compra, venta y traslado', () => {
    expect(avisoCaravanaQueNoPudoSalir('compra', 'Fornost', ['12 mo en la caja'])).toBe(
      'La caravana de compra a Fornost no pudo salir por falta de 12 mo en la caja',
    )
    expect(avisoCaravanaQueNoPudoSalir('venta', 'Fornost', ['10 barriles de cerveza'])).toBe(
      'La caravana de venta a Fornost no pudo salir por falta de 10 barriles de cerveza',
    )
    expect(avisoCaravanaQueNoPudoSalir('traslado', 'Archet', [])).toBe(
      'La caravana de traslado a Archet no pudo salir',
    )
  })
})

describe('avisoCompraQueNoPudoHacerse', () => {
  it('«La compra de víveres en Bree no pudo hacerse por falta de 12 mo en la caja»', () => {
    expect(avisoCompraQueNoPudoHacerse('Víveres', 'Bree', ['12 mo en la caja'])).toBe(
      'La compra de víveres en Bree no pudo hacerse por falta de 12 mo en la caja',
    )
  })
})

describe('edificio y mejora terminados', () => {
  it('avisoEdificioTerminado: «Horno comunal está terminado: anota su producción y sus trabajadores»', () => {
    expect(avisoEdificioTerminado('Horno comunal')).toBe(
      'Horno comunal está terminado: anota su producción y sus trabajadores',
    )
  })

  it('avisoMejoraTerminada: «La mejora de Cantera está terminada: anota su producción»', () => {
    expect(avisoMejoraTerminada('Cantera')).toBe('La mejora de Cantera está terminada: anota su producción')
  })
})

describe('faltaDeDinero', () => {
  it('«12 mo en la caja»', () => {
    expect(faltaDeDinero('12 mo')).toBe('12 mo en la caja')
  })
})

describe('textoFaltan', () => {
  it('«Faltan 20 carretadas de cal», «Falta 1 lingote de hierro» y las dos juntas', () => {
    expect(textoFaltan([{ cantidad: 20, recurso: CAL }])).toBe('Faltan 20 carretadas de cal')
    expect(textoFaltan([{ cantidad: 1, recurso: HIERRO }])).toBe('Falta 1 lingote de hierro')
    expect(textoFaltan([{ cantidad: 20, recurso: CAL }, { cantidad: 5, recurso: MADERA }])).toBe(
      'Faltan 20 carretadas de cal y 5 haces de madera',
    )
  })
})

describe('nombreDeFrecuencia', () => {
  it('las ocho formas de recurrencia de producción', () => {
    const casos: [RecurrenciaProduccion, string][] = [
      [{ tipo: 'diaria' }, 'cada día'],
      [{ tipo: 'cadaNDias', n: 3, primera: { anio: 1640, mes: 4, dia: 1 } }, 'cada 3 días'],
      [{ tipo: 'semanal', diaSemana: 5 }, 'semanal'],
      [{ tipo: 'quincenal', primera: { anio: 1640, mes: 4, dia: 1 } }, 'cada dos semanas'],
      [{ tipo: 'mensual', diaMes: 1 }, 'mensual'],
      [{ tipo: 'cadaNMeses', n: 2, diaMes: 15, primera: { anio: 1640, mes: 6, dia: 15 } }, 'cada 2 meses'],
      [{ tipo: 'trimestral', diaMes: 1, primera: { anio: 1640, mes: 4, dia: 1 } }, 'trimestral'],
      [{ tipo: 'anual', mes: 4, diaMes: 1 }, 'anual'],
    ]
    for (const [recurrencia, esperado] of casos) {
      expect(nombreDeFrecuencia(recurrencia)).toBe(esperado)
    }
  })
})

describe('recursoDelCatalogo', () => {
  it('el recurso del catálogo, y el genérico «mercancía» con un id que no está', () => {
    const catalogo = catalogosDeEjemplo()
    expect(recursoDelCatalogo(catalogo, RECURSO.viveres)).toMatchObject({
      id: RECURSO.viveres,
      nombre: 'Víveres',
      unidadSingular: 'saco',
      unidadPlural: 'sacos',
    })
    expect(recursoDelCatalogo(catalogo, 'recurso.que-no-existe')).toEqual({
      id: 'recurso.que-no-existe',
      nombre: 'mercancía',
      unidadSingular: 'unidad',
      unidadPlural: 'unidades',
      propia: false,
    })
  })
})
