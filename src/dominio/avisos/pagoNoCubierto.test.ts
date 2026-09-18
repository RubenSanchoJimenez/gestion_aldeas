import { describe, expect, it } from 'vitest'
import { sumarDias, type Fecha } from '../calendario/fecha'
import type { Recurrencia } from '../calendario/recurrencia'
import { CATEGORIA } from '../catalogo/inicial'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import type { RecurrenteDinero } from '../modelo/movimientos'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { conAsentamiento, estadoMinimo } from '../motor/pruebas/constructores'
import { avisosDePagoNoCubierto } from './pagoNoCubierto'

/** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** La posada de Tharan: 1 mp cada noche desde su bolsa. */
function posada(estado: EstadoPartida, recurrencia: Recurrencia, activo = true): RecurrenteDinero {
  const tharan = estado.dominios[0].id
  return {
    id: 'rec.posada',
    dominioId: tharan,
    tipo: 'gasto',
    concepto: 'Posada El Poney Pisador',
    importe: { base: 10000 },
    categoriaId: CATEGORIA.otros,
    cuentaId: tharan,
    recurrencia,
    activo,
  }
}

/** Los textos de los avisos, para leerlos de un vistazo. */
function textos(estado: EstadoPartida): string[] {
  return avisosDePagoNoCubierto(estado, catalogosDeEjemplo()).map((a) => a.texto)
}

describe('avisosDePagoNoCubierto con el ejemplo', () => {
  it('el 12 de abril no avisa: Archet cubre el tributo del 19 con 85 mo', () => {
    expect(avisosDePagoNoCubierto(estadoDe(documentoDeEjemplo()), catalogosDeEjemplo())).toEqual([])
  })

  it('el 19 de abril avisa del tributo de Archet del 19 de julio (§9 l.1354)', () => {
    const recorrido = recorrerDias(estadoDe(documentoDeEjemplo()), { anio: 1640, mes: 4, dia: 19 }, {
      avanceId: 'sim',
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    expect(avisosDePagoNoCubierto(recorrido.estadoNuevo, catalogosDeEjemplo())).toEqual([
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de julio',
        fecha: { anio: 1640, mes: 7, dia: 19 },
      },
    ])
  })
})

describe('avisosDePagoNoCubierto por origen', () => {
  it('los salarios de un día avisan juntos, con el total: «los salarios de 4,2 mo del 20 de abril» (D-025)', () => {
    const trece: Fecha = { anio: 1640, mes: 4, dia: 13 }
    const base = conAsentamiento(estadoMinimo(trece), { id: DOM.bree, nombre: 'Bree', caja: 300000 })
    const trabajadores = documentoDeEjemplo().trabajadores.filter((t) => t.dominioId === DOM.bree)
    expect(textos({ ...base, trabajadores })).toEqual([
      'La caja de Bree no cubre los salarios de 4,2 mo del 20 de abril',
    ])
  })

  it('con la caja justa para el pago entero no avisa', () => {
    const trece: Fecha = { anio: 1640, mes: 4, dia: 13 }
    const base = conAsentamiento(estadoMinimo(trece), { id: DOM.bree, nombre: 'Bree', caja: 420000 })
    const trabajadores = documentoDeEjemplo().trabajadores.filter((t) => t.dominioId === DOM.bree)
    expect(textos({ ...base, trabajadores })).toEqual([])
  })

  it('las soldadas de las tres unidades dicen «la soldada»', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: DOM.bree, nombre: 'Bree', caja: 0 })
    const unidadesGuarnicion = documentoDeEjemplo().unidadesGuarnicion
    expect(textos({ ...base, unidadesGuarnicion })).toEqual([
      'La caja de Bree no cubre la soldada de 5,8 mo del 24 de abril',
    ])
  })

  it('un gasto de J5 en pausa no avisa; activo, avisa de su primer día con el concepto entre comillas', () => {
    const base = estadoMinimo(HOY)
    expect(textos({ ...base, recurrentes: [posada(base, { tipo: 'diaria' }, false)] })).toEqual([])
    expect(textos({ ...base, recurrentes: [posada(base, { tipo: 'diaria' })] })).toEqual([
      'La bolsa de Tharan no cubre «Posada El Poney Pisador» de 0,1 mo del 13 de abril',
    ])
  })

  it('un pago programado que no se cubre avisa con su concepto y su fecha', () => {
    const base = estadoMinimo(HOY)
    const estado: EstadoPartida = {
      ...base,
      movimientos: [
        {
          id: 'mov.capa',
          dominioId: base.dominios[0].id,
          fecha: { anio: 1640, mes: 4, dia: 20 },
          tipo: 'gasto',
          importe: { base: -50000 },
          categoriaId: CATEGORIA.otros,
          concepto: 'Capa élfica',
          origen: 'manual',
          programado: true,
        },
      ],
    }
    expect(textos(estado)).toEqual(['La bolsa de Tharan no cubre «Capa élfica» de 0,5 mo del 20 de abril'])
  })
})

describe('avisosDePagoNoCubierto: horizonte', () => {
  it('mira como mucho 366 días; si el pago cae en otro año, la fecha lleva el año', () => {
    const base = estadoMinimo(HOY)
    const alAnio = { ...base, recurrentes: [posada(base, { tipo: 'unica', fecha: sumarDias(HOY, 366) })] }
    const despues = { ...base, recurrentes: [posada(base, { tipo: 'unica', fecha: sumarDias(HOY, 367) })] }
    expect(textos(alAnio)).toEqual([
      'La bolsa de Tharan no cubre «Posada El Poney Pisador» de 0,1 mo del 13 de abril de 1641',
    ])
    expect(textos(despues)).toEqual([])
  })

  it('no pasa del 31 de diciembre de 9999', () => {
    const vispera = estadoMinimo({ anio: 9999, mes: 12, dia: 30 })
    const ultimo = estadoMinimo({ anio: 9999, mes: 12, dia: 31 })
    expect(textos({ ...vispera, recurrentes: [posada(vispera, { tipo: 'diaria' })] })).toEqual([
      'La bolsa de Tharan no cubre «Posada El Poney Pisador» de 0,1 mo del 31 de diciembre',
    ])
    expect(textos({ ...ultimo, recurrentes: [posada(ultimo, { tipo: 'diaria' })] })).toEqual([])
  })
})
