import { describe, it, expect } from 'vitest'
import { aNumeroDeDia, desdeNumeroDeDia, diaDeLaSemana, diaEnMes, diasEntre, sumarDias, type Fecha } from './fecha'
import {
  anteriorOcurrencia,
  ocurreEl,
  ocurrenciasEntre,
  siguienteOcurrencia,
  validarRecurrencia,
  type Recurrencia,
} from './recurrencia'

/** Atajo para escribir fechas en las pruebas: f(1640, 4, 12) es el 12 de abril de 1640. */
function f(anio: number, mes: number, dia: number): Fecha {
  return { anio, mes, dia }
}

const DIARIA: Recurrencia = { tipo: 'diaria' }
const DOMINGOS: Recurrencia = { tipo: 'semanal', diaSemana: 6 }
const VIERNES: Recurrencia = { tipo: 'semanal', diaSemana: 4 }
const SABADOS: Recurrencia = { tipo: 'semanal', diaSemana: 5 }
const CADA_10_DIAS: Recurrencia = { tipo: 'cadaNDias', n: 10, primera: f(1640, 4, 20) }
const QUINCENAL_10_ABRIL: Recurrencia = { tipo: 'quincenal', primera: f(1640, 4, 10) }
const MENSUAL_DIA_1: Recurrencia = { tipo: 'mensual', diaMes: 1 }
const MENSUAL_DIA_30: Recurrencia = { tipo: 'mensual', diaMes: 30 }
const MENSUAL_DIA_31: Recurrencia = { tipo: 'mensual', diaMes: 31 }
/** Día 31 cada 2 meses desde el 31 de enero de 1641: marzo, mayo… Noviembre y septiembre de 1640 solo son anteriores teóricas. */
const CADA_2_MESES_DIA_31: Recurrencia = { tipo: 'cadaNMeses', n: 2, diaMes: 31, primera: f(1641, 1, 31) }
/** Día 31 cada 3 meses desde el 30 de noviembre de 1640 (noviembre no tiene 31). */
const TRIMESTRAL_DIA_31: Recurrencia = { tipo: 'trimestral', diaMes: 31, primera: f(1640, 11, 30) }
const ANUAL_29_FEBRERO: Recurrencia = { tipo: 'anual', mes: 2, diaMes: 29 }
const UNICA_12_ABRIL: Recurrencia = { tipo: 'unica', fecha: f(1640, 4, 12) }

describe('ocurreEl', () => {
  it('diaria: ocurre todos los días', () => {
    expect(ocurreEl(DIARIA, f(1640, 4, 12))).toBe(true)
    expect(ocurreEl(DIARIA, f(1640, 2, 29))).toBe(true)
  })

  it('semanal: ocurre el día de la semana elegido (0 = lunes … 6 = domingo)', () => {
    expect(ocurreEl(DOMINGOS, f(1640, 4, 1))).toBe(true)
    expect(ocurreEl(DOMINGOS, f(1640, 4, 2))).toBe(false)
    expect(ocurreEl(VIERNES, f(1640, 4, 13))).toBe(true)
    expect(ocurreEl(VIERNES, f(1640, 4, 12))).toBe(false)
  })

  it('cada N días y quincenal: en la primera vez y cada periodo después; nunca antes de la primera vez', () => {
    expect(ocurreEl(CADA_10_DIAS, f(1640, 4, 20))).toBe(true)
    expect(ocurreEl(CADA_10_DIAS, f(1640, 4, 30))).toBe(true)
    expect(ocurreEl(CADA_10_DIAS, f(1640, 4, 10))).toBe(false)
    expect(ocurreEl(CADA_10_DIAS, f(1640, 4, 15))).toBe(false)
    expect(ocurreEl(QUINCENAL_10_ABRIL, f(1640, 4, 10))).toBe(true)
    expect(ocurreEl(QUINCENAL_10_ABRIL, f(1640, 4, 24))).toBe(true)
    expect(ocurreEl(QUINCENAL_10_ABRIL, f(1640, 3, 27))).toBe(false)
    expect(ocurreEl(QUINCENAL_10_ABRIL, f(1640, 4, 17))).toBe(false)
  })

  it('mensual día 30: el 30 de abril, el 29 de febrero de 1640 y el 28 de febrero de 1641', () => {
    expect(ocurreEl(MENSUAL_DIA_30, f(1640, 4, 30))).toBe(true)
    expect(ocurreEl(MENSUAL_DIA_30, f(1640, 2, 29))).toBe(true)
    expect(ocurreEl(MENSUAL_DIA_30, f(1641, 2, 28))).toBe(true)
    expect(ocurreEl(MENSUAL_DIA_30, f(1640, 2, 28))).toBe(false)
    expect(ocurreEl(MENSUAL_DIA_30, f(1640, 3, 31))).toBe(false)
  })

  it('cada N meses y trimestral: el día elegido, o el último del mes, en los meses del periodo desde la primera vez', () => {
    expect(ocurreEl(CADA_2_MESES_DIA_31, f(1641, 1, 31))).toBe(true)
    expect(ocurreEl(CADA_2_MESES_DIA_31, f(1641, 3, 31))).toBe(true)
    expect(ocurreEl(CADA_2_MESES_DIA_31, f(1640, 11, 30))).toBe(false)
    expect(ocurreEl(CADA_2_MESES_DIA_31, f(1641, 2, 28))).toBe(false)
    expect(ocurreEl(CADA_2_MESES_DIA_31, f(1641, 3, 30))).toBe(false)
    expect(ocurreEl(TRIMESTRAL_DIA_31, f(1640, 11, 30))).toBe(true)
    expect(ocurreEl(TRIMESTRAL_DIA_31, f(1641, 2, 28))).toBe(true)
    expect(ocurreEl(TRIMESTRAL_DIA_31, f(1641, 5, 31))).toBe(true)
    expect(ocurreEl(TRIMESTRAL_DIA_31, f(1640, 8, 31))).toBe(false)
    expect(ocurreEl(TRIMESTRAL_DIA_31, f(1641, 5, 28))).toBe(false)
  })

  it('anual 29 de febrero: el 29 en los años bisiestos y el 28 en los demás', () => {
    expect(ocurreEl(ANUAL_29_FEBRERO, f(1640, 2, 29))).toBe(true)
    expect(ocurreEl(ANUAL_29_FEBRERO, f(1640, 2, 28))).toBe(false)
    expect(ocurreEl(ANUAL_29_FEBRERO, f(1641, 2, 28))).toBe(true)
    expect(ocurreEl(ANUAL_29_FEBRERO, f(1641, 3, 1))).toBe(false)
  })

  it('una sola vez: solo en su fecha', () => {
    expect(ocurreEl(UNICA_12_ABRIL, f(1640, 4, 12))).toBe(true)
    expect(ocurreEl(UNICA_12_ABRIL, f(1640, 4, 13))).toBe(false)
    expect(ocurreEl(UNICA_12_ABRIL, f(1641, 4, 12))).toBe(false)
  })

  it('semanal: para cada día de la semana, ocurre exactamente cuando diaDeLaSemana coincide (4 semanas de 1640)', () => {
    const inicio = f(1640, 4, 1)
    for (let diaSemana = 0; diaSemana <= 6; diaSemana++) {
      const r: Recurrencia = { tipo: 'semanal', diaSemana }
      for (let i = 0; i < 28; i++) {
        const dia = sumarDias(inicio, i)
        expect(ocurreEl(r, dia)).toBe(diaDeLaSemana(dia) === diaSemana)
      }
    }
  })
})

describe('siguienteOcurrencia', () => {
  it('mensual día 1: después del 12 de abril, el 1 de mayo', () => {
    expect(siguienteOcurrencia(MENSUAL_DIA_1, f(1640, 4, 12))).toEqual(f(1640, 5, 1))
  })

  it('semanal viernes: el 12 de abril, el próximo pago de los salarios de Bree es el viernes 13 (A5)', () => {
    expect(siguienteOcurrencia(VIERNES, f(1640, 4, 12))).toEqual(f(1640, 4, 13))
  })

  it('es estrictamente posterior: después de una ocurrencia da la siguiente', () => {
    expect(siguienteOcurrencia(MENSUAL_DIA_1, f(1640, 4, 1))).toEqual(f(1640, 5, 1))
    expect(siguienteOcurrencia(VIERNES, f(1640, 4, 13))).toEqual(f(1640, 4, 20))
    expect(siguienteOcurrencia(DIARIA, f(1640, 12, 31))).toEqual(f(1641, 1, 1))
  })

  it('mensual día 30 y 31: el último día en los meses cortos, sin perder el día elegido después', () => {
    expect(siguienteOcurrencia(MENSUAL_DIA_30, f(1640, 1, 30))).toEqual(f(1640, 2, 29))
    expect(siguienteOcurrencia(MENSUAL_DIA_30, f(1640, 2, 29))).toEqual(f(1640, 3, 30))
    expect(siguienteOcurrencia(MENSUAL_DIA_30, f(1641, 1, 30))).toEqual(f(1641, 2, 28))
    expect(siguienteOcurrencia(MENSUAL_DIA_31, f(1640, 4, 30))).toEqual(f(1640, 5, 31))
  })

  it('cada N días y quincenal: cuenta desde la primera vez; antes de ella, la siguiente es la primera vez', () => {
    expect(siguienteOcurrencia(CADA_10_DIAS, f(1640, 4, 12))).toEqual(f(1640, 4, 20))
    expect(siguienteOcurrencia(CADA_10_DIAS, f(1640, 4, 1))).toEqual(f(1640, 4, 20))
    expect(siguienteOcurrencia(CADA_10_DIAS, f(1640, 4, 20))).toEqual(f(1640, 4, 30))
    expect(siguienteOcurrencia(QUINCENAL_10_ABRIL, f(1640, 4, 10))).toEqual(f(1640, 4, 24))
    expect(siguienteOcurrencia(QUINCENAL_10_ABRIL, f(1640, 1, 1))).toEqual(f(1640, 4, 10))
  })

  it('cada N meses y trimestral: cada fecha sale de la primera vez, sin encadenar los meses acortados', () => {
    expect(siguienteOcurrencia(CADA_2_MESES_DIA_31, f(1640, 10, 1))).toEqual(f(1641, 1, 31))
    expect(siguienteOcurrencia(CADA_2_MESES_DIA_31, f(1641, 1, 31))).toEqual(f(1641, 3, 31))
    expect(siguienteOcurrencia(CADA_2_MESES_DIA_31, f(1641, 2, 15))).toEqual(f(1641, 3, 31))
    expect(siguienteOcurrencia(TRIMESTRAL_DIA_31, f(1640, 11, 30))).toEqual(f(1641, 2, 28))
    expect(siguienteOcurrencia(TRIMESTRAL_DIA_31, f(1641, 2, 28))).toEqual(f(1641, 5, 31))
  })

  it('anual 29 de febrero: el 28 en los años que no son bisiestos', () => {
    expect(siguienteOcurrencia(ANUAL_29_FEBRERO, f(1640, 4, 12))).toEqual(f(1641, 2, 28))
    expect(siguienteOcurrencia(ANUAL_29_FEBRERO, f(1641, 2, 28))).toEqual(f(1642, 2, 28))
    expect(siguienteOcurrencia(ANUAL_29_FEBRERO, f(1643, 3, 1))).toEqual(f(1644, 2, 29))
  })

  it('una sola vez: su fecha si aún no ha llegado; null si ya pasó o es ese mismo día', () => {
    expect(siguienteOcurrencia(UNICA_12_ABRIL, f(1640, 4, 1))).toEqual(f(1640, 4, 12))
    expect(siguienteOcurrencia(UNICA_12_ABRIL, f(1640, 4, 19))).toBeNull()
    expect(siguienteOcurrencia(UNICA_12_ABRIL, f(1640, 4, 12))).toBeNull()
  })
})

describe('ocurrenciasEntre', () => {
  it('semanal domingo en abril de 1640: 1, 8, 15, 22 y 29', () => {
    expect(ocurrenciasEntre(DOMINGOS, f(1640, 4, 1), f(1640, 4, 30))).toEqual([
      f(1640, 4, 1),
      f(1640, 4, 8),
      f(1640, 4, 15),
      f(1640, 4, 22),
      f(1640, 4, 29),
    ])
  })

  it('semanal viernes en abril de 1640: 6, 13, 20 y 27', () => {
    expect(ocurrenciasEntre(VIERNES, f(1640, 4, 1), f(1640, 4, 30))).toEqual([
      f(1640, 4, 6),
      f(1640, 4, 13),
      f(1640, 4, 20),
      f(1640, 4, 27),
    ])
  })

  it('semanal sábado del 13 de abril al 12 de mayo: 14, 21 y 28 de abril, 5 y 12 de mayo (§9)', () => {
    expect(ocurrenciasEntre(SABADOS, f(1640, 4, 13), f(1640, 5, 12))).toEqual([
      f(1640, 4, 14),
      f(1640, 4, 21),
      f(1640, 4, 28),
      f(1640, 5, 5),
      f(1640, 5, 12),
    ])
  })

  it('quincenal desde el 10 de abril: 10 y 24 de abril y 8 de mayo, y nada antes de la primera vez', () => {
    expect(ocurrenciasEntre(QUINCENAL_10_ABRIL, f(1640, 3, 1), f(1640, 5, 8))).toEqual([
      f(1640, 4, 10),
      f(1640, 4, 24),
      f(1640, 5, 8),
    ])
  })

  it('mensual día 30 de enero de 1640 a marzo de 1641: el 29 y el 28 de febrero, y el 30 los demás meses', () => {
    expect(ocurrenciasEntre(MENSUAL_DIA_30, f(1640, 1, 1), f(1641, 3, 31))).toEqual([
      f(1640, 1, 30),
      f(1640, 2, 29),
      f(1640, 3, 30),
      f(1640, 4, 30),
      f(1640, 5, 30),
      f(1640, 6, 30),
      f(1640, 7, 30),
      f(1640, 8, 30),
      f(1640, 9, 30),
      f(1640, 10, 30),
      f(1640, 11, 30),
      f(1640, 12, 30),
      f(1641, 1, 30),
      f(1641, 2, 28),
      f(1641, 3, 30),
    ])
  })

  it('trimestral día 31 desde el 30 de noviembre de 1640: nada antes; luego 28 de febrero, 31 de mayo y 31 de agosto', () => {
    expect(ocurrenciasEntre(TRIMESTRAL_DIA_31, f(1640, 8, 1), f(1641, 8, 31))).toEqual([
      f(1640, 11, 30),
      f(1641, 2, 28),
      f(1641, 5, 31),
      f(1641, 8, 31),
    ])
  })

  it('incluye las dos fechas límite; lista vacía si no hay ocurrencias o si desde es posterior a hasta', () => {
    expect(ocurrenciasEntre(DIARIA, f(1640, 4, 12), f(1640, 4, 12))).toEqual([f(1640, 4, 12)])
    expect(ocurrenciasEntre(MENSUAL_DIA_1, f(1640, 4, 2), f(1640, 4, 30))).toEqual([])
    expect(ocurrenciasEntre(DIARIA, f(1640, 4, 19), f(1640, 4, 12))).toEqual([])
    expect(ocurrenciasEntre(UNICA_12_ABRIL, f(1640, 4, 1), f(1640, 4, 30))).toEqual([f(1640, 4, 12)])
    expect(ocurrenciasEntre(UNICA_12_ABRIL, f(1640, 4, 13), f(1640, 12, 31))).toEqual([])
  })
})

describe('anteriorOcurrencia', () => {
  it('mensual día 1: antes del 1 de mayo, el 1 de abril; el periodo del 2 de abril al 1 de mayo tiene 30 días (§7)', () => {
    const anterior = anteriorOcurrencia(MENSUAL_DIA_1, f(1640, 5, 1))
    expect(anterior).toEqual(f(1640, 4, 1))
    expect(diasEntre(anterior!, f(1640, 5, 1))).toBe(30)
  })

  it('es estrictamente anterior: antes de una ocurrencia da la anterior', () => {
    expect(anteriorOcurrencia(MENSUAL_DIA_1, f(1640, 4, 12))).toEqual(f(1640, 4, 1))
    expect(anteriorOcurrencia(SABADOS, f(1640, 4, 14))).toEqual(f(1640, 4, 7))
    expect(anteriorOcurrencia(DIARIA, f(1641, 1, 1))).toEqual(f(1640, 12, 31))
  })

  it('cada N días y quincenal: antes de la primera vez sigue hacia atrás (la primera vez menos un periodo)', () => {
    expect(anteriorOcurrencia(CADA_10_DIAS, f(1640, 4, 20))).toEqual(f(1640, 4, 10))
    expect(anteriorOcurrencia(CADA_10_DIAS, f(1640, 4, 10))).toEqual(f(1640, 3, 31))
    expect(anteriorOcurrencia(QUINCENAL_10_ABRIL, f(1640, 4, 10))).toEqual(f(1640, 3, 27))
    expect(anteriorOcurrencia(QUINCENAL_10_ABRIL, f(1640, 1, 3))).toEqual(f(1639, 12, 20))
  })

  it('cada N meses y trimestral: hacia atrás desde la primera vez, sin encadenar los meses acortados', () => {
    expect(anteriorOcurrencia(CADA_2_MESES_DIA_31, f(1641, 1, 31))).toEqual(f(1640, 11, 30))
    expect(anteriorOcurrencia(CADA_2_MESES_DIA_31, f(1640, 11, 30))).toEqual(f(1640, 9, 30))
    expect(anteriorOcurrencia(CADA_2_MESES_DIA_31, f(1640, 9, 30))).toEqual(f(1640, 7, 31))
    expect(anteriorOcurrencia(TRIMESTRAL_DIA_31, f(1640, 11, 30))).toEqual(f(1640, 8, 31))
    expect(anteriorOcurrencia(TRIMESTRAL_DIA_31, f(1640, 5, 31))).toEqual(f(1640, 2, 29))
    expect(anteriorOcurrencia(TRIMESTRAL_DIA_31, f(1640, 2, 29))).toEqual(f(1639, 11, 30))
  })

  it('anual 29 de febrero: el 28 en los años que no son bisiestos', () => {
    expect(anteriorOcurrencia(ANUAL_29_FEBRERO, f(1641, 3, 1))).toEqual(f(1641, 2, 28))
    expect(anteriorOcurrencia(ANUAL_29_FEBRERO, f(1641, 2, 28))).toEqual(f(1640, 2, 29))
  })

  it('una sola vez: su fecha si ya pasó; null si es ese mismo día o aún no ha llegado', () => {
    expect(anteriorOcurrencia(UNICA_12_ABRIL, f(1640, 4, 19))).toEqual(f(1640, 4, 12))
    expect(anteriorOcurrencia(UNICA_12_ABRIL, f(1640, 4, 12))).toBeNull()
    expect(anteriorOcurrencia(UNICA_12_ABRIL, f(1640, 4, 1))).toBeNull()
  })
})

/**
 * La misma recurrencia con la primera vez siglos antes, en una fecha del mismo patrón. De 1639 a 1642 sus ocurrencias
 * son las teóricas de r, también las anteriores a la primera vez. Las recurrencias sin primera vez no cambian.
 */
function conPrimeraLejana(r: Recurrencia): Recurrencia {
  switch (r.tipo) {
    case 'cadaNDias':
      return { ...r, primera: sumarDias(r.primera, -r.n * Math.ceil(100000 / r.n)) }
    case 'quincenal':
      return { ...r, primera: sumarDias(r.primera, -14 * Math.ceil(100000 / 14)) }
    case 'cadaNMeses':
      // 100 × n años son 1.200 × n meses, un número entero de periodos.
      return { ...r, primera: diaEnMes(r.primera.anio - 100 * r.n, r.primera.mes, r.diaMes) }
    case 'trimestral':
      return { ...r, primera: diaEnMes(r.primera.anio - 300, r.primera.mes, r.diaMes) }
    default:
      return r
  }
}

describe('coherencia de las cuatro funciones, día a día de 1639 a 1642', () => {
  const INICIO = f(1639, 1, 1)
  const FIN = f(1642, 12, 31)

  it.each<[string, Recurrencia]>([
    ['diaria', DIARIA],
    ['semanal lunes', { tipo: 'semanal', diaSemana: 0 }],
    ['semanal domingo', DOMINGOS],
    ['cada 10 días', CADA_10_DIAS],
    ['cada 366 días', { tipo: 'cadaNDias', n: 366, primera: f(1640, 2, 29) }],
    ['quincenal', QUINCENAL_10_ABRIL],
    ['mensual día 1', MENSUAL_DIA_1],
    ['mensual día 29', { tipo: 'mensual', diaMes: 29 }],
    ['mensual día 31', MENSUAL_DIA_31],
    ['cada 2 meses día 31', CADA_2_MESES_DIA_31],
    ['cada 12 meses día 29', { tipo: 'cadaNMeses', n: 12, diaMes: 29, primera: f(1641, 2, 28) }],
    ['trimestral día 31', TRIMESTRAL_DIA_31],
    ['anual 29 de febrero', ANUAL_29_FEBRERO],
    ['anual 31 de diciembre', { tipo: 'anual', mes: 12, diaMes: 31 }],
    ['una sola vez', UNICA_12_ABRIL],
  ])('%s', (_nombre, r) => {
    const inicio = aNumeroDeDia(INICIO)
    const fin = aNumeroDeDia(FIN)
    const lejana = conPrimeraLejana(r)

    // Listas de referencia: los números de día en que ocurreEl dice que sí, con r (reales) y con lejana (teóricas).
    const ocurrencias: number[] = []
    const teoricas: number[] = []
    for (let n = inicio; n <= fin; n++) {
      if (ocurreEl(r, desdeNumeroDeDia(n))) {
        ocurrencias.push(n)
      }
      if (ocurreEl(lejana, desdeNumeroDeDia(n))) {
        teoricas.push(n)
      }
    }
    expect(ocurrencias.length).toBeGreaterThan(0)
    expect(ocurrenciasEntre(r, INICIO, FIN)).toEqual(ocurrencias.map(desdeNumeroDeDia))
    // Las reales son las teóricas desde la primera vez: nada antes de ella.
    const primera = 'primera' in r ? aNumeroDeDia(r.primera) : -Infinity
    expect(ocurrencias).toEqual(teoricas.filter((n) => n >= primera))

    let primerError: string | null = null
    let posteriores = 0 // índice en `ocurrencias` de la primera ocurrencia posterior al día n
    let anteriores = 0 // cuántas teóricas son anteriores al día n
    for (let n = inicio; n <= fin && primerError === null; n++) {
      while (posteriores < ocurrencias.length && ocurrencias[posteriores] <= n) {
        posteriores++
      }
      while (anteriores < teoricas.length && teoricas[anteriores] < n) {
        anteriores++
      }
      // La siguiente sale de las reales; la anterior, de las teóricas (§6.4 y §6.5: la primera vez menos un periodo).
      const siguienteEsperada: number | undefined = ocurrencias[posteriores]
      const anteriorEsperada: number | undefined = teoricas[anteriores - 1]

      const dia = desdeNumeroDeDia(n)
      const siguiente = siguienteOcurrencia(r, dia)
      const anterior = anteriorOcurrencia(r, dia)

      // Fuera del rango recorrido no hay lista de referencia: basta con que caiga fuera y sea ocurrencia (teórica, la
      // anterior). Solo «una sola vez» puede no tener siguiente o anterior.
      const siguienteBien =
        siguienteEsperada !== undefined
          ? siguiente !== null && aNumeroDeDia(siguiente) === siguienteEsperada
          : r.tipo === 'unica'
            ? siguiente === null
            : siguiente !== null && aNumeroDeDia(siguiente) > fin && ocurreEl(r, siguiente)
      const anteriorBien =
        anteriorEsperada !== undefined
          ? anterior !== null && aNumeroDeDia(anterior) === anteriorEsperada
          : r.tipo === 'unica'
            ? anterior === null
            : anterior !== null && aNumeroDeDia(anterior) < inicio && ocurreEl(lejana, anterior)

      if (!siguienteBien || !anteriorBien) {
        primerError = `${JSON.stringify(dia)}: siguiente ${JSON.stringify(siguiente)}, anterior ${JSON.stringify(anterior)}`
      }
    }
    expect(primerError).toBeNull()
  })
})

describe('coherencia con fecha de inicio, día a día de 1639 a 1642', () => {
  const INICIO = f(1639, 1, 1)
  const FIN = f(1642, 12, 31)

  it.each<[string, Recurrencia]>([
    ['semanal viernes con inicio', { tipo: 'semanal', diaSemana: 4, inicio: f(1640, 4, 16) }],
    ['mensual día 31 con inicio', { tipo: 'mensual', diaMes: 31, inicio: f(1640, 4, 15) }],
    ['anual 29 de febrero con inicio', { tipo: 'anual', mes: 2, diaMes: 29, inicio: f(1640, 3, 1) }],
    ['diaria con inicio', { tipo: 'diaria', inicio: f(1640, 4, 14) }],
  ])('%s', (_nombre, r) => {
    const inicio = aNumeroDeDia(INICIO)
    const fin = aNumeroDeDia(FIN)

    // Lista de referencia: los números de día en que ocurreEl dice que sí.
    const ocurrencias: number[] = []
    for (let n = inicio; n <= fin; n++) {
      if (ocurreEl(r, desdeNumeroDeDia(n))) {
        ocurrencias.push(n)
      }
    }
    expect(ocurrencias.length).toBeGreaterThan(0)
    expect(ocurrenciasEntre(r, INICIO, FIN)).toEqual(ocurrencias.map(desdeNumeroDeDia))

    // siguienteOcurrencia de cada día del rango es la primera de `ocurrencias` posterior a él, si la hay en el rango
    // (anteriorOcurrencia se deja fuera a propósito: ignora `inicio`).
    let posteriores = 0
    for (let n = inicio; n <= fin; n++) {
      while (posteriores < ocurrencias.length && ocurrencias[posteriores] <= n) {
        posteriores++
      }
      const siguienteEsperada: number | undefined = ocurrencias[posteriores]
      if (siguienteEsperada !== undefined) {
        const siguiente = siguienteOcurrencia(r, desdeNumeroDeDia(n))
        expect(siguiente).not.toBeNull()
        expect(aNumeroDeDia(siguiente as Fecha)).toBe(siguienteEsperada)
      }
    }
  })
})

describe('validarRecurrencia', () => {
  it('acepta recurrencias válidas de todos los tipos, con los valores límite', () => {
    const validas: Recurrencia[] = [
      DIARIA,
      { tipo: 'cadaNDias', n: 2, primera: f(1640, 4, 12) },
      { tipo: 'cadaNDias', n: 366, primera: f(1640, 2, 29) },
      { tipo: 'semanal', diaSemana: 0 },
      DOMINGOS,
      QUINCENAL_10_ABRIL,
      MENSUAL_DIA_1,
      MENSUAL_DIA_31,
      CADA_2_MESES_DIA_31,
      { tipo: 'cadaNMeses', n: 12, diaMes: 1, primera: f(1640, 5, 1) },
      TRIMESTRAL_DIA_31,
      { tipo: 'anual', mes: 1, diaMes: 1 },
      { tipo: 'anual', mes: 12, diaMes: 31 },
      UNICA_12_ABRIL,
    ]
    expect(validas.map(validarRecurrencia)).toEqual(validas.map(() => []))
  })

  it('cada N días: N es un número entero de 2 a 366', () => {
    const primera = f(1640, 4, 12)
    const error = ['N debe ser un número entero de 2 a 366']
    expect(validarRecurrencia({ tipo: 'cadaNDias', n: 1, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'cadaNDias', n: 367, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'cadaNDias', n: 2.5, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'cadaNDias', n: Number.NaN, primera })).toEqual(error)
  })

  it('cada N meses: N es un número entero de 2 a 12', () => {
    const primera = f(1640, 5, 1)
    const error = ['N debe ser un número entero de 2 a 12']
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 1, diaMes: 1, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 13, diaMes: 1, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 1.5, diaMes: 1, primera })).toEqual(error)
  })

  it('semanal: el día de la semana es un entero de 0 (lunes) a 6 (domingo)', () => {
    const error = ['El día de la semana debe estar entre lunes y domingo']
    expect(validarRecurrencia({ tipo: 'semanal', diaSemana: -1 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'semanal', diaSemana: 7 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'semanal', diaSemana: 0.5 })).toEqual(error)
  })

  it('mensual, cada N meses, trimestral y anual: el día del mes es un entero de 1 a 31', () => {
    const error = ['El día del mes debe estar entre 1 y 31']
    const primera = f(1640, 4, 12)
    expect(validarRecurrencia({ tipo: 'mensual', diaMes: 0 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'mensual', diaMes: 32 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'mensual', diaMes: 1.5 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 2, diaMes: 32, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'trimestral', diaMes: 0, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'anual', mes: 4, diaMes: 32 })).toEqual(error)
  })

  it('anual: el mes es un entero de 1 a 12', () => {
    const error = ['El mes debe estar entre 1 y 12']
    expect(validarRecurrencia({ tipo: 'anual', mes: 0, diaMes: 1 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'anual', mes: 13, diaMes: 1 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'anual', mes: 2.5, diaMes: 1 })).toEqual(error)
  })

  it('anual: rechaza los días que el mes no tiene nunca y admite el 29 de febrero', () => {
    expect(validarRecurrencia({ tipo: 'anual', mes: 4, diaMes: 31 })).toEqual(['Abril no tiene 31 días'])
    expect(validarRecurrencia({ tipo: 'anual', mes: 2, diaMes: 30 })).toEqual(['Febrero no tiene 30 días'])
    expect(validarRecurrencia({ tipo: 'anual', mes: 2, diaMes: 31 })).toEqual(['Febrero no tiene 31 días'])
    expect(validarRecurrencia({ tipo: 'anual', mes: 2, diaMes: 29 })).toEqual([])
    expect(validarRecurrencia({ tipo: 'anual', mes: 12, diaMes: 31 })).toEqual([])
    expect(validarRecurrencia({ tipo: 'anual', mes: 4, diaMes: 32 })).toEqual([
      'El día del mes debe estar entre 1 y 31',
    ])
    expect(validarRecurrencia({ tipo: 'mensual', diaMes: 31 })).toEqual([])
  })

  it('las fechas deben existir, con el mensaje de validarFecha', () => {
    expect(validarRecurrencia({ tipo: 'cadaNDias', n: 10, primera: f(1640, 4, 31) })).toEqual([
      'Abril de 1640 tiene 30 días',
    ])
    expect(validarRecurrencia({ tipo: 'quincenal', primera: f(0, 4, 10) })).toEqual([
      'El año debe estar entre 1 y 9999',
    ])
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 2, diaMes: 1, primera: f(1640, 13, 1) })).toEqual([
      'El mes debe estar entre 1 y 12',
    ])
    expect(validarRecurrencia({ tipo: 'trimestral', diaMes: 29, primera: f(1641, 2, 29) })).toEqual([
      'Febrero de 1641 tiene 28 días',
    ])
    expect(validarRecurrencia({ tipo: 'unica', fecha: f(1641, 2, 29) })).toEqual(['Febrero de 1641 tiene 28 días'])
  })

  it('cada N meses y trimestral: la primera vez cae en el día del mes elegido o, si el mes no lo tiene, en el último', () => {
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 2, diaMes: 31, primera: f(1640, 4, 30) })).toEqual([])
    expect(validarRecurrencia({ tipo: 'trimestral', diaMes: 30, primera: f(1641, 2, 28) })).toEqual([])
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 2, diaMes: 15, primera: f(1640, 4, 12) })).toEqual([
      'La primera vez debe caer el día 15 del mes',
    ])
    expect(validarRecurrencia({ tipo: 'trimestral', diaMes: 28, primera: f(1641, 2, 27) })).toEqual([
      'La primera vez debe caer el día 28 del mes',
    ])
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 2, diaMes: 29, primera: f(1641, 2, 27) })).toEqual([
      'La primera vez debe caer el día 29 del mes o, si no lo tiene, el último',
    ])
    expect(validarRecurrencia({ tipo: 'trimestral', diaMes: 31, primera: f(1640, 4, 29) })).toEqual([
      'La primera vez debe caer el día 31 del mes o, si no lo tiene, el último',
    ])
  })

  it('da todos los errores en el orden de los campos', () => {
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 1, diaMes: 0, primera: f(1640, 4, 31) })).toEqual([
      'N debe ser un número entero de 2 a 12',
      'El día del mes debe estar entre 1 y 31',
      'Abril de 1640 tiene 30 días',
    ])
    expect(validarRecurrencia({ tipo: 'cadaNDias', n: 0, primera: f(0, 1, 1) })).toEqual([
      'N debe ser un número entero de 2 a 366',
      'El año debe estar entre 1 y 9999',
    ])
    expect(validarRecurrencia({ tipo: 'anual', mes: 13, diaMes: 0 })).toEqual([
      'El mes debe estar entre 1 y 12',
      'El día del mes debe estar entre 1 y 31',
    ])
  })
})

describe('fecha de inicio (no antes de)', () => {
  it('semanal viernes con inicio el viernes 20 de abril: nada antes, y ocurre ese mismo día', () => {
    const r: Recurrencia = { tipo: 'semanal', diaSemana: 4, inicio: f(1640, 4, 20) }
    expect(ocurreEl(r, f(1640, 4, 13))).toBe(false)
    expect(ocurreEl(r, f(1640, 4, 20))).toBe(true)
    expect(siguienteOcurrencia(r, f(1640, 4, 12))).toEqual(f(1640, 4, 20))
    expect(ocurrenciasEntre(r, f(1640, 4, 1), f(1640, 4, 30))).toEqual([f(1640, 4, 20), f(1640, 4, 27)])
  })

  it('semanal viernes con inicio un lunes: como no cae en el día elegido, la primera ocurrencia es la siguiente', () => {
    const r: Recurrencia = { tipo: 'semanal', diaSemana: 4, inicio: f(1640, 4, 16) }
    expect(ocurreEl(r, f(1640, 4, 16))).toBe(false)
    expect(siguienteOcurrencia(r, f(1640, 4, 12))).toEqual(f(1640, 4, 20))
  })

  it('mensual día 1 con inicio el 15 de abril: la primera ocurrencia es el 1 de mayo', () => {
    const r: Recurrencia = { tipo: 'mensual', diaMes: 1, inicio: f(1640, 4, 15) }
    expect(ocurreEl(r, f(1640, 4, 1))).toBe(false)
    expect(siguienteOcurrencia(r, f(1640, 4, 12))).toEqual(f(1640, 5, 1))
    expect(ocurrenciasEntre(r, f(1640, 4, 1), f(1640, 6, 30))).toEqual([f(1640, 5, 1), f(1640, 6, 1)])
  })

  it('diaria con inicio el 14 de abril: nada antes de esa fecha', () => {
    const r: Recurrencia = { tipo: 'diaria', inicio: f(1640, 4, 14) }
    expect(siguienteOcurrencia(r, f(1640, 4, 12))).toEqual(f(1640, 4, 14))
    expect(ocurrenciasEntre(r, f(1640, 4, 12), f(1640, 4, 16))).toEqual([
      f(1640, 4, 14),
      f(1640, 4, 15),
      f(1640, 4, 16),
    ])
  })

  it('anual 1 de mayo con inicio el 2 de mayo: la primera ocurrencia es la del año siguiente', () => {
    const r: Recurrencia = { tipo: 'anual', mes: 5, diaMes: 1, inicio: f(1640, 5, 2) }
    expect(siguienteOcurrencia(r, f(1640, 4, 12))).toEqual(f(1641, 5, 1))
  })

  it('después de la fecha de inicio no cambia nada', () => {
    const r: Recurrencia = { tipo: 'semanal', diaSemana: 4, inicio: f(1640, 4, 20) }
    expect(siguienteOcurrencia(r, f(1640, 4, 20))).toEqual(f(1640, 4, 27))
  })

  it('anteriorOcurrencia ignora la fecha de inicio, igual que ya ignora la primera vez', () => {
    const r: Recurrencia = { tipo: 'semanal', diaSemana: 4, inicio: f(1640, 4, 20) }
    expect(anteriorOcurrencia(r, f(1640, 4, 20))).toEqual(f(1640, 4, 13))
  })

  it('validarRecurrencia: añade el error de la fecha de inicio después de los errores propios del tipo', () => {
    expect(validarRecurrencia({ tipo: 'semanal', diaSemana: 4, inicio: f(1640, 2, 30) })).toEqual([
      'Febrero de 1640 tiene 29 días',
    ])
    expect(validarRecurrencia({ tipo: 'diaria', inicio: f(10000, 1, 1) })).toEqual([
      'El año debe estar entre 1 y 9999',
    ])
    expect(validarRecurrencia({ tipo: 'mensual', diaMes: 1, inicio: f(1640, 4, 15) })).toEqual([])
    expect(validarRecurrencia({ tipo: 'semanal', diaSemana: 7, inicio: f(1640, 2, 30) })).toEqual([
      'El día de la semana debe estar entre lunes y domingo',
      'Febrero de 1640 tiene 29 días',
    ])
    expect(validarRecurrencia({ tipo: 'anual', mes: 4, diaMes: 31, inicio: f(0, 1, 1) })).toEqual([
      'Abril no tiene 31 días',
      'El año debe estar entre 1 y 9999',
    ])
  })
})

describe('campos sobrantes: la recurrencia decide por r.tipo, no por si el campo existe', () => {
  it('un campo `primera` sobrante en una recurrencia sin primera vez se ignora', () => {
    // Objeto con un campo `primera` que 'semanal' no tiene, como al copiar con spread desde otro tipo.
    const r = { tipo: 'semanal', diaSemana: 4, primera: f(1640, 4, 16) } as Recurrencia
    expect(siguienteOcurrencia(r, f(1640, 4, 12))).toEqual(f(1640, 4, 13))
    expect(ocurreEl(r, f(1640, 4, 13))).toBe(true)
  })

  it('un campo `inicio` sobrante en una recurrencia sin fecha de inicio se ignora', () => {
    // Objeto con un campo `inicio` que 'cadaNDias' no tiene.
    const r = { tipo: 'cadaNDias', n: 10, primera: f(1640, 4, 20), inicio: f(1640, 6, 1) } as Recurrencia
    expect(siguienteOcurrencia(r, f(1640, 4, 25))).toEqual(f(1640, 4, 30))
    expect(ocurreEl(r, f(1640, 4, 30))).toBe(true)
  })
})
