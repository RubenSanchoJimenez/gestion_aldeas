import { describe, it, expect } from 'vitest'
import {
  aNumeroDeDia,
  compararFechas,
  desdeNumeroDeDia,
  diaDeLaSemana,
  diaEnMes,
  diasDelMes,
  diasEntre,
  esBisiesto,
  sumarDias,
  sumarMeses,
  validarFecha,
  type Fecha,
} from './fecha'

/** Atajo para escribir fechas en las pruebas: f(1640, 4, 12) es el 12 de abril de 1640. */
function f(anio: number, mes: number, dia: number): Fecha {
  return { anio, mes, dia }
}

describe('esBisiesto', () => {
  it('1640 es bisiesto y 1641 no (múltiplo de 4 y no de 100)', () => {
    expect(esBisiesto(1640)).toBe(true)
    expect(esBisiesto(1641)).toBe(false)
  })

  it('1700, 1800 y 1900 no son bisiestos (múltiplos de 100 y no de 400)', () => {
    expect(esBisiesto(1700)).toBe(false)
    expect(esBisiesto(1800)).toBe(false)
    expect(esBisiesto(1900)).toBe(false)
  })

  it('1600 y 2000 son bisiestos (múltiplos de 400)', () => {
    expect(esBisiesto(1600)).toBe(true)
    expect(esBisiesto(2000)).toBe(true)
  })

  it('el año 4 es bisiesto y el año 1 no', () => {
    expect(esBisiesto(4)).toBe(true)
    expect(esBisiesto(1)).toBe(false)
  })
})

describe('diasDelMes', () => {
  it('da la duración de los doce meses de 1641, año no bisiesto', () => {
    const duraciones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => diasDelMes(1641, mes))
    expect(duraciones).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])
  })

  it('febrero tiene 29 días en 1640, 1600 y 2000, y 28 en 1700', () => {
    expect(diasDelMes(1640, 2)).toBe(29)
    expect(diasDelMes(1600, 2)).toBe(29)
    expect(diasDelMes(2000, 2)).toBe(29)
    expect(diasDelMes(1700, 2)).toBe(28)
  })
})

describe('validarFecha', () => {
  it('acepta fechas que existen', () => {
    expect(validarFecha(f(1640, 4, 12))).toBeNull()
    expect(validarFecha(f(1640, 4, 30))).toBeNull()
    expect(validarFecha(f(1640, 12, 31))).toBeNull()
    expect(validarFecha(f(1, 1, 1))).toBeNull()
  })

  it('acepta el 29 de febrero de los años bisiestos 1640, 1600 y 2000', () => {
    expect(validarFecha(f(1640, 2, 29))).toBeNull()
    expect(validarFecha(f(1600, 2, 29))).toBeNull()
    expect(validarFecha(f(2000, 2, 29))).toBeNull()
  })

  it('rechaza el 29 de febrero de un año no bisiesto', () => {
    expect(validarFecha(f(1641, 2, 29))).toBe('Febrero de 1641 tiene 28 días')
    expect(validarFecha(f(1700, 2, 29))).toBe('Febrero de 1700 tiene 28 días')
  })

  it('rechaza el 31 de abril y el 30 de febrero', () => {
    expect(validarFecha(f(1640, 4, 31))).toBe('Abril de 1640 tiene 30 días')
    expect(validarFecha(f(1640, 2, 30))).toBe('Febrero de 1640 tiene 29 días')
  })

  it('rechaza el día 0, el 32 y los días con decimales', () => {
    expect(validarFecha(f(1640, 4, 0))).toBe('Abril de 1640 tiene 30 días')
    expect(validarFecha(f(1640, 1, 32))).toBe('Enero de 1640 tiene 31 días')
    expect(validarFecha(f(1640, 4, 12.5))).toBe('Abril de 1640 tiene 30 días')
  })

  it('rechaza el año 0, los años negativos y los años con decimales', () => {
    expect(validarFecha(f(0, 1, 1))).toBe('El año debe estar entre 1 y 9999')
    expect(validarFecha(f(-5, 1, 1))).toBe('El año debe estar entre 1 y 9999')
    expect(validarFecha(f(1640.5, 1, 1))).toBe('El año debe estar entre 1 y 9999')
  })

  it('el año es como mucho 9999', () => {
    expect(validarFecha(f(9999, 12, 31))).toBeNull()
    expect(validarFecha(f(10000, 1, 1))).toBe('El año debe estar entre 1 y 9999')
    expect(validarFecha(f(1e17, 1, 1))).toBe('El año debe estar entre 1 y 9999')
  })

  it('rechaza el mes 0, el 13 y los meses con decimales', () => {
    expect(validarFecha(f(1640, 0, 1))).toBe('El mes debe estar entre 1 y 12')
    expect(validarFecha(f(1640, 13, 1))).toBe('El mes debe estar entre 1 y 12')
    expect(validarFecha(f(1640, 2.5, 1))).toBe('El mes debe estar entre 1 y 12')
  })

  it('con varios errores, da primero el del año y después el del mes', () => {
    expect(validarFecha(f(0, 13, 40))).toBe('El año debe estar entre 1 y 9999')
    expect(validarFecha(f(1640, 13, 40))).toBe('El mes debe estar entre 1 y 12')
  })
})

describe('aNumeroDeDia y desdeNumeroDeDia', () => {
  it('el 1 de enero de 1970 es el día 0 y la víspera, el día −1', () => {
    expect(aNumeroDeDia(f(1970, 1, 1))).toBe(0)
    expect(aNumeroDeDia(f(1969, 12, 31))).toBe(-1)
    expect(desdeNumeroDeDia(0)).toEqual(f(1970, 1, 1))
    expect(desdeNumeroDeDia(-1)).toEqual(f(1969, 12, 31))
  })

  it('da los números de día de fechas conocidas', () => {
    expect(aNumeroDeDia(f(1, 1, 1))).toBe(-719162)
    expect(aNumeroDeDia(f(1600, 2, 29))).toBe(-135081)
    expect(aNumeroDeDia(f(1640, 1, 1))).toBe(-120530)
    expect(aNumeroDeDia(f(1640, 4, 12))).toBe(-120428)
    expect(aNumeroDeDia(f(2000, 3, 1))).toBe(11017)
    expect(aNumeroDeDia(f(9999, 12, 31))).toBe(2932896)
  })

  it.each([
    f(1, 1, 1),
    f(1, 12, 31),
    f(4, 2, 29),
    f(100, 3, 1),
    f(400, 2, 29),
    f(1600, 2, 29),
    f(1640, 1, 1),
    f(1640, 4, 12),
    f(1700, 2, 28),
    f(1700, 3, 1),
    f(1969, 12, 31),
    f(1970, 1, 1),
    f(2000, 2, 29),
    f(9999, 12, 31),
  ])('ida y vuelta: $dia/$mes/$anio', (fecha) => {
    expect(desdeNumeroDeDia(aNumeroDeDia(fecha))).toEqual(fecha)
  })

  it('el día anterior al 1 de enero del año 1 es el 31 de diciembre del año 0, sin romper el cálculo', () => {
    expect(desdeNumeroDeDia(-719163)).toEqual(f(0, 12, 31))
    expect(aNumeroDeDia(f(0, 12, 31))).toBe(-719163)
  })

  it('recorre día a día del 1 de enero del año 1 al 1 de enero de 2401 sin saltos ni repeticiones', () => {
    const inicio = aNumeroDeDia(f(1, 1, 1))
    const fin = aNumeroDeDia(f(2401, 1, 1))
    expect(fin - inicio).toBe(876582) // 6 ciclos de 400 años × 146.097 días

    let esperada = f(1, 1, 1)
    let primerError: string | null = null
    for (let n = inicio; n <= fin; n++) {
      const obtenida = desdeNumeroDeDia(n)
      // Object.is distingue 0 de −0, igual que toEqual.
      const coincide =
        Object.is(obtenida.anio, esperada.anio) &&
        Object.is(obtenida.mes, esperada.mes) &&
        Object.is(obtenida.dia, esperada.dia)
      if (primerError === null && (!coincide || aNumeroDeDia(esperada) !== n)) {
        primerError = `día ${n}: ${JSON.stringify(obtenida)}, se esperaba ${JSON.stringify(esperada)}`
      }
      // Fecha siguiente calculada a mano: día + 1, o primero del mes siguiente, o 1 de enero.
      if (esperada.dia < diasDelMes(esperada.anio, esperada.mes)) {
        esperada = f(esperada.anio, esperada.mes, esperada.dia + 1)
      } else if (esperada.mes < 12) {
        esperada = f(esperada.anio, esperada.mes + 1, 1)
      } else {
        esperada = f(esperada.anio + 1, 1, 1)
      }
    }
    expect(primerError).toBeNull()
  })
})

describe('sumarDias', () => {
  it('12 de abril de 1640 + 7 días = 19 de abril de 1640', () => {
    expect(sumarDias(f(1640, 4, 12), 7)).toEqual(f(1640, 4, 19))
  })

  it('sumar 0 días da la misma fecha', () => {
    expect(sumarDias(f(1640, 4, 12), 0)).toEqual(f(1640, 4, 12))
  })

  it('cruza meses y años, con el 29 de febrero de los bisiestos', () => {
    expect(sumarDias(f(1640, 1, 1), 102)).toEqual(f(1640, 4, 12))
    expect(sumarDias(f(1640, 2, 28), 1)).toEqual(f(1640, 2, 29))
    expect(sumarDias(f(1641, 2, 28), 1)).toEqual(f(1641, 3, 1))
    expect(sumarDias(f(1640, 12, 31), 1)).toEqual(f(1641, 1, 1))
    expect(sumarDias(f(1700, 2, 28), 1)).toEqual(f(1700, 3, 1))
  })

  it('resta días con un número negativo', () => {
    expect(sumarDias(f(1640, 3, 1), -1)).toEqual(f(1640, 2, 29))
    expect(sumarDias(f(1640, 4, 19), -7)).toEqual(f(1640, 4, 12))
  })
})

describe('diasEntre', () => {
  it('del 1 de enero al 12 de abril de 1640 hay 102 días, y al revés −102', () => {
    expect(diasEntre(f(1640, 1, 1), f(1640, 4, 12))).toBe(102)
    expect(diasEntre(f(1640, 4, 12), f(1640, 1, 1))).toBe(-102)
  })

  it('del 1 de abril al 1 de mayo de 1640 hay 30 días', () => {
    expect(diasEntre(f(1640, 4, 1), f(1640, 5, 1))).toBe(30)
  })

  it('1640 tiene 366 días y 1641 tiene 365', () => {
    expect(diasEntre(f(1640, 1, 1), f(1641, 1, 1))).toBe(366)
    expect(diasEntre(f(1641, 1, 1), f(1642, 1, 1))).toBe(365)
  })

  it('entre una fecha y ella misma hay 0 días', () => {
    expect(diasEntre(f(1640, 4, 12), f(1640, 4, 12))).toBe(0)
  })
})

describe('compararFechas', () => {
  it('es negativo si a es anterior, 0 si son iguales y positivo si a es posterior', () => {
    expect(compararFechas(f(1640, 4, 12), f(1640, 4, 19))).toBeLessThan(0)
    expect(compararFechas(f(1640, 4, 12), f(1640, 4, 12))).toBe(0)
    expect(compararFechas(f(1640, 4, 19), f(1640, 4, 12))).toBeGreaterThan(0)
  })

  it('el año pesa más que el mes y el mes más que el día', () => {
    expect(compararFechas(f(1639, 12, 31), f(1640, 1, 1))).toBeLessThan(0)
    expect(compararFechas(f(1640, 3, 31), f(1640, 4, 1))).toBeLessThan(0)
  })

  it('sirve para ordenar fechas con sort', () => {
    const fechas = [f(1640, 4, 19), f(1639, 12, 31), f(1640, 4, 12), f(1640, 1, 1)]
    expect([...fechas].sort(compararFechas)).toEqual([
      f(1639, 12, 31),
      f(1640, 1, 1),
      f(1640, 4, 12),
      f(1640, 4, 19),
    ])
  })
})

describe('diaDeLaSemana (0 = lunes … 6 = domingo)', () => {
  it('el 1 de enero y el 1 de abril de 1640 son domingo', () => {
    expect(diaDeLaSemana(f(1640, 1, 1))).toBe(6)
    expect(diaDeLaSemana(f(1640, 4, 1))).toBe(6)
  })

  it('el 12 y el 19 de abril de 1640 son jueves', () => {
    expect(diaDeLaSemana(f(1640, 4, 12))).toBe(3)
    expect(diaDeLaSemana(f(1640, 4, 19))).toBe(3)
  })

  it('el 2 de abril de 1640 es lunes', () => {
    expect(diaDeLaSemana(f(1640, 4, 2))).toBe(0)
  })

  it('el 1 de enero de 1970 es jueves, el 31 de diciembre de 1969 miércoles y el 1 de enero del año 1 lunes', () => {
    expect(diaDeLaSemana(f(1970, 1, 1))).toBe(3)
    expect(diaDeLaSemana(f(1969, 12, 31))).toBe(2)
    expect(diaDeLaSemana(f(1, 1, 1))).toBe(0)
  })

  it('del año 1 al 2400 avanza de uno en uno y vuelve a 0 tras el domingo, sin salir de 0 a 6', () => {
    const inicio = aNumeroDeDia(f(1, 1, 1))
    const fin = aNumeroDeDia(f(2401, 1, 1))
    let esperado = 0 // el 1 de enero del año 1 fue lunes
    let primerError: string | null = null
    for (let n = inicio; n <= fin; n++) {
      const obtenido = diaDeLaSemana(desdeNumeroDeDia(n))
      // Object.is distingue 0 de −0: un −0 fallaría en las comparaciones de las pruebas.
      if (primerError === null && !Object.is(obtenido, esperado)) {
        primerError = `día ${n}: ${Object.is(obtenido, -0) ? '−0' : obtenido}, se esperaba ${esperado}`
      }
      esperado = (esperado + 1) % 7
    }
    expect(primerError).toBeNull()
  })
})

describe('diaEnMes', () => {
  it('el 31 de abril de 1640 no existe: da el 30', () => {
    expect(diaEnMes(1640, 4, 31)).toEqual(f(1640, 4, 30))
  })

  it('si el día existe, lo deja igual', () => {
    expect(diaEnMes(1640, 4, 12)).toEqual(f(1640, 4, 12))
    expect(diaEnMes(1640, 1, 31)).toEqual(f(1640, 1, 31))
  })

  it('en febrero da el 29 en año bisiesto y el 28 si no lo es', () => {
    expect(diaEnMes(1640, 2, 31)).toEqual(f(1640, 2, 29))
    expect(diaEnMes(1641, 2, 30)).toEqual(f(1641, 2, 28))
    expect(diaEnMes(1641, 2, 29)).toEqual(f(1641, 2, 28))
  })
})

describe('sumarMeses', () => {
  it('31 de enero de 1641 + 1 mes = 28 de febrero de 1641', () => {
    expect(sumarMeses(f(1641, 1, 31), 1)).toEqual(f(1641, 2, 28))
  })

  it('en años bisiestos da el 29 de febrero: 1640, 1600 y 2000, pero no 1700', () => {
    expect(sumarMeses(f(1640, 1, 31), 1)).toEqual(f(1640, 2, 29))
    expect(sumarMeses(f(1600, 1, 31), 1)).toEqual(f(1600, 2, 29))
    expect(sumarMeses(f(2000, 1, 31), 1)).toEqual(f(2000, 2, 29))
    expect(sumarMeses(f(1700, 1, 31), 1)).toEqual(f(1700, 2, 28))
  })

  it('31 de marzo de 1640 + 1 mes = 30 de abril', () => {
    expect(sumarMeses(f(1640, 3, 31), 1)).toEqual(f(1640, 4, 30))
  })

  it('si el día existe, lo conserva, también al cambiar de año', () => {
    expect(sumarMeses(f(1640, 4, 12), 1)).toEqual(f(1640, 5, 12))
    expect(sumarMeses(f(1640, 11, 15), 3)).toEqual(f(1641, 2, 15))
    expect(sumarMeses(f(1640, 12, 31), 2)).toEqual(f(1641, 2, 28))
    expect(sumarMeses(f(1640, 4, 12), 0)).toEqual(f(1640, 4, 12))
  })

  it('29 de febrero de 1640 + 12 meses = 28 de febrero de 1641; + 48 meses = 29 de febrero de 1644', () => {
    expect(sumarMeses(f(1640, 2, 29), 12)).toEqual(f(1641, 2, 28))
    expect(sumarMeses(f(1640, 2, 29), 48)).toEqual(f(1644, 2, 29))
  })

  it('resta meses con un número negativo', () => {
    expect(sumarMeses(f(1641, 3, 31), -1)).toEqual(f(1641, 2, 28))
    expect(sumarMeses(f(1640, 1, 15), -1)).toEqual(f(1639, 12, 15))
    expect(sumarMeses(f(1640, 4, 12), -28)).toEqual(f(1637, 12, 12))
  })

  it('encadenar meses acortados pierde el día elegido; sumar desde la fecha original, no', () => {
    const febrero = sumarMeses(f(1641, 1, 31), 1)
    expect(sumarMeses(febrero, 1)).toEqual(f(1641, 3, 28))
    expect(sumarMeses(f(1641, 1, 31), 2)).toEqual(f(1641, 3, 31))
  })
})
