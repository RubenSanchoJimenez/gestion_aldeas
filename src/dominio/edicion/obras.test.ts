import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { RECURSO, idDeOpcion } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { DOM, EDIFICIO, MOV_BREE, OBRA } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import type { Sello } from './registros'
import {
  crearObra,
  editarObra,
  eliminarObra,
  empezarObra,
  planificarObra,
  type DatosObra,
} from './obras'

const AHORA: Instante = '2026-09-18T10:00:00.000Z'
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }
const catalogo = catalogosDeEjemplo()

function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

function existencia(documento: DocumentoPartida, dominioId: Id, recursoId: Id): number {
  return documento.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)?.cantidad ?? 0
}

function obra(documento: DocumentoPartida, id: Id) {
  const o = documento.obras.find((x) => x.id === id)
  if (o === undefined) {
    throw new Error(`No está «${id}»`)
  }
  return o
}

describe('crearObra', () => {
  it('empezar hoy «Horno comunal» (35 mo, sin materiales) deja la caja de Bree en 305,6 mo (O9)', () => {
    const documento = ejemplo()
    const datos: DatosObra = {
      dominioId: DOM.bree,
      nombre: 'Horno comunal',
      coste: { base: 3500000, introducido: { cantidad: '35', moneda: 'mo' } },
      materiales: {},
      diasTotales: 10,
      efecto: { tipo: 'crearEdificio', tipoId: idDeOpcion('tiposEdificio', 'Horno') },
    }
    const { estado } = crearObra(documento, datos, HOY, sello(), catalogo)
    expect(saldosPorDominio(estado)[DOM.bree]).toBe(30560000)
  })

  it('«Horno comunal» con 170 carretadas de arcilla hoy → «Faltan 20 carretadas de arcilla» (O13)', () => {
    const documento = ejemplo()
    const datos: DatosObra = {
      dominioId: DOM.bree,
      nombre: 'Horno comunal',
      coste: { base: 3500000, introducido: { cantidad: '35', moneda: 'mo' } },
      materiales: { [RECURSO.arcilla]: 170 },
      diasTotales: 10,
      efecto: { tipo: 'crearEdificio', tipoId: idDeOpcion('tiposEdificio', 'Horno') },
    }
    expect(() => crearObra(documento, datos, HOY, sello(), catalogo)).toThrow('Faltan 20 carretadas de arcilla')
  })

  it('sin inicio queda planificada, sin movimiento y con las filas de sus materiales aseguradas', () => {
    const documento = ejemplo()
    const datos: DatosObra = {
      dominioId: DOM.bree,
      nombre: 'Taller nuevo',
      coste: { base: 1000000, introducido: { cantidad: '10', moneda: 'mo' } },
      materiales: { 'recurso.oro-en-bruto': 2 },
      diasTotales: 5,
      efecto: { tipo: 'crearDefensa', tipoId: idDeOpcion('tiposDefensa', 'Empalizada') },
    }
    const { estado, id } = crearObra(documento, datos, undefined, sello(), catalogo)
    expect(obra(estado, id).estado).toBe('planificada')
    expect(obra(estado, id).movimientoId).toBeUndefined()
  })

  it('asegura la fila de un material que el almacén no tenía', () => {
    const documento = ejemplo()
    const datos: DatosObra = {
      dominioId: DOM.bree,
      nombre: 'Taller de vidrio',
      coste: { base: 500000 },
      materiales: { 'recurso.vidrio': 3 },
      diasTotales: 8,
      efecto: { tipo: 'crearDefensa', tipoId: idDeOpcion('tiposDefensa', 'Torre') },
    }
    const { estado } = crearObra(documento, datos, undefined, sello(), catalogo)
    expect(estado.existencias.some((e) => e.dominioId === DOM.bree && e.recursoId === 'recurso.vidrio')).toBe(true)
  })

  it('con fecha futura queda programada sin exigir materiales (D-046), con su gasto programado', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 25 }
    const datos: DatosObra = {
      dominioId: DOM.bree,
      nombre: 'Muralla nueva',
      coste: { base: 2000000, introducido: { cantidad: '20', moneda: 'mo' } },
      materiales: { [RECURSO.piedra]: 9999 },
      diasTotales: 30,
      efecto: { tipo: 'crearDefensa', tipoId: idDeOpcion('tiposDefensa', 'Muralla') },
    }
    const { estado, id } = crearObra(documento, datos, futuro, sello(), catalogo)
    const o = obra(estado, id)
    expect(o.estado).toBe('programada')
    expect(o.inicio).toEqual(futuro)
    const gasto = estado.movimientos.find((m) => m.id === o.movimientoId)!
    expect(gasto.programado).toBe(true)
    expect(gasto.importe.base).toBe(-2000000)
  })
})

describe('empezarObra', () => {
  it('«Empezar obra» de la cervecería el 12 de abril: madera 360, piedra 150, gasto de 4.500.000 mh (O13)', () => {
    const documento = ejemplo()
    const estado = empezarObra(documento, OBRA.cerveceria, HOY, sello(), catalogo)
    expect(existencia(estado, DOM.bree, RECURSO.madera)).toBe(360)
    expect(existencia(estado, DOM.bree, RECURSO.piedra)).toBe(150)
    const o = obra(estado, OBRA.cerveceria)
    const gasto = estado.movimientos.find((m) => m.id === o.movimientoId)!
    expect(gasto.importe.base).toBe(-4500000)
    expect(gasto.concepto).toBe('Obra: ampliar la cervecería')
    expect(o.estado).toBe('enCurso')
  })

  it('con el 20 de abril, la cervecería queda programada con su gasto programado (O13)', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const estado = empezarObra(documento, OBRA.cerveceria, futuro, sello(), catalogo)
    const o = obra(estado, OBRA.cerveceria)
    expect(o.estado).toBe('programada')
    expect(estado.movimientos.find((m) => m.id === o.movimientoId)!.programado).toBe(true)
    // No se tocan los materiales todavía.
    expect(existencia(estado, DOM.bree, RECURSO.madera)).toBe(420)
  })

  it('«Esta obra ya ha empezado» si ya está en curso o terminada', () => {
    const documento = ejemplo()
    expect(() => empezarObra(documento, OBRA.granero, HOY, sello(), catalogo)).toThrow('Esta obra ya ha empezado')
  })
})

describe('planificarObra', () => {
  it('«Guardar como planificada» quita inicio y su gasto programado', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const programada = empezarObra(documento, OBRA.cerveceria, futuro, sello(), catalogo)
    const movimientoId = obra(programada, OBRA.cerveceria).movimientoId!
    const estado = planificarObra(programada, OBRA.cerveceria, sello())
    const o = obra(estado, OBRA.cerveceria)
    expect(o.estado).toBe('planificada')
    expect(o.inicio).toBeUndefined()
    expect(o.movimientoId).toBeUndefined()
    expect(estado.movimientos.some((m) => m.id === movimientoId)).toBe(false)
  })
})

describe('editarObra', () => {
  it('planificada cambia entera', () => {
    const documento = ejemplo()
    const datos: Omit<DatosObra, 'dominioId'> = {
      nombre: 'Ampliar la cervecería (revisado)',
      coste: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
      materiales: { [RECURSO.madera]: 70, [RECURSO.piedra]: 35 },
      diasTotales: 25,
      efecto: { tipo: 'mejorarEdificio' as const, objetivoId: EDIFICIO.cerveceria },
    }
    const estado = editarObra(documento, OBRA.cerveceria, datos, sello(), catalogo)
    expect(obra(estado, OBRA.cerveceria).nombre).toBe('Ampliar la cervecería (revisado)')
    expect(obra(estado, OBRA.cerveceria).diasTotales).toBe(25)
  })

  it('programada cambia entera, incluidos los materiales', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const programada = empezarObra(documento, OBRA.cerveceria, futuro, sello(), catalogo)
    const datos: Omit<DatosObra, 'dominioId'> = {
      nombre: 'Ampliar la cervecería',
      coste: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
      materiales: { [RECURSO.madera]: 80, [RECURSO.piedra]: 40 },
      diasTotales: 22,
      efecto: { tipo: 'mejorarEdificio' as const, objetivoId: EDIFICIO.cerveceria },
    }
    const estado = editarObra(programada, OBRA.cerveceria, datos, sello(), catalogo)
    const o = obra(estado, OBRA.cerveceria)
    expect(o.materiales).toEqual({ [RECURSO.madera]: 80, [RECURSO.piedra]: 40 })
    expect(estado.movimientos.find((m) => m.id === o.movimientoId)!.importe.base).toBe(-5000000)
  })

  it('en curso: nombre, duración, resultado y coste cambian; los materiales no', () => {
    const documento = ejemplo()
    const datos: Omit<DatosObra, 'dominioId'> = {
      nombre: 'Nuevo granero (más grande)',
      coste: { base: 9000000, introducido: { cantidad: '90', moneda: 'mo' } },
      materiales: { [RECURSO.madera]: 120, [RECURSO.piedra]: 60 },
      diasTotales: 45,
      efecto: { tipo: 'ampliarAlmacen' as const, recursoId: RECURSO.viveres, valor: 900 },
    }
    const estado = editarObra(documento, OBRA.granero, datos, sello(), catalogo)
    const o = obra(estado, OBRA.granero)
    expect(o.nombre).toBe('Nuevo granero (más grande)')
    expect(o.diasTotales).toBe(45)
    expect((o.efecto as { valor: number }).valor).toBe(900)
    const gasto = estado.movimientos.find((m) => m.id === o.movimientoId)!
    expect(gasto.importe.base).toBe(-9000000)
  })

  it('en curso: cambiar los materiales lanza «En una obra en curso solo cambian el nombre, la duración, el resultado y el coste»', () => {
    const documento = ejemplo()
    const datos: Omit<DatosObra, 'dominioId'> = {
      nombre: obra(documento, OBRA.granero).nombre,
      coste: obra(documento, OBRA.granero).coste,
      materiales: { [RECURSO.madera]: 999 },
      diasTotales: obra(documento, OBRA.granero).diasTotales,
      efecto: obra(documento, OBRA.granero).efecto,
    }
    expect(() => editarObra(documento, OBRA.granero, datos, sello(), catalogo)).toThrow(
      'En una obra en curso solo cambian el nombre, la duración, el resultado y el coste',
    )
  })

  it('terminada: solo el nombre y el coste cambian', () => {
    const documento = ejemplo()
    const terminada = { ...obra(documento, OBRA.puerta), estado: 'terminada' as const }
    const conTerminada: DocumentoPartida = { ...documento, obras: documento.obras.map((o) => (o.id === terminada.id ? terminada : o)) }
    const datos: Omit<DatosObra, 'dominioId'> = {
      nombre: 'Puerta del sur (reparada)',
      coste: { base: 3200000, introducido: { cantidad: '32', moneda: 'mo' } },
      materiales: terminada.materiales,
      diasTotales: terminada.diasTotales,
      efecto: terminada.efecto,
    }
    const estado = editarObra(conTerminada, OBRA.puerta, datos, sello(), catalogo)
    const o = obra(estado, OBRA.puerta)
    expect(o.nombre).toBe('Puerta del sur (reparada)')
    const gasto = estado.movimientos.find((m) => m.id === o.movimientoId)!
    expect(gasto.importe.base).toBe(-3200000)
  })

  it('terminada: cambiar la duración lanza «En una obra terminada solo cambian el nombre y el coste»', () => {
    const documento = ejemplo()
    const terminada = { ...obra(documento, OBRA.puerta), estado: 'terminada' as const }
    const conTerminada: DocumentoPartida = { ...documento, obras: documento.obras.map((o) => (o.id === terminada.id ? terminada : o)) }
    const datos: Omit<DatosObra, 'dominioId'> = {
      nombre: terminada.nombre,
      coste: terminada.coste,
      materiales: terminada.materiales,
      diasTotales: terminada.diasTotales + 1,
      efecto: terminada.efecto,
    }
    expect(() => editarObra(conTerminada, OBRA.puerta, datos, sello(), catalogo)).toThrow(
      'En una obra terminada solo cambian el nombre y el coste',
    )
  })
})

describe('eliminarObra', () => {
  it('programada: se borra con su movimiento programado', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const programada = empezarObra(documento, OBRA.cerveceria, futuro, sello(), catalogo)
    const movimientoId = obra(programada, OBRA.cerveceria).movimientoId!
    const estado = eliminarObra(programada, OBRA.cerveceria, { devolverCoste: false, devolverMateriales: false }, catalogo)
    expect(estado.obras.some((o) => o.id === OBRA.cerveceria)).toBe(false)
    expect(estado.movimientos.some((m) => m.id === movimientoId)).toBe(false)
  })

  it('en curso sin marcar ninguna casilla: el gasto se queda suelto y los materiales no vuelven', () => {
    const documento = ejemplo()
    const estado = eliminarObra(documento, OBRA.granero, { devolverCoste: false, devolverMateriales: false }, catalogo)
    const gasto = estado.movimientos.find((m) => m.id === MOV_BREE.obraGranero)!
    expect(gasto.vinculo).toBeUndefined()
    expect(existencia(estado, DOM.bree, RECURSO.madera)).toBe(420)
  })

  it('en curso con las dos casillas: madera 540, piedra 240 y sin el gasto de 85 mo (O13)', () => {
    const documento = ejemplo()
    const estado = eliminarObra(documento, OBRA.granero, { devolverCoste: true, devolverMateriales: true }, catalogo)
    expect(existencia(estado, DOM.bree, RECURSO.madera)).toBe(540)
    expect(existencia(estado, DOM.bree, RECURSO.piedra)).toBe(240)
    expect(estado.movimientos.some((m) => m.id === MOV_BREE.obraGranero)).toBe(false)
  })

  it('devolver materiales que no caben: «Caben 10 haces más» con la madera en 590', () => {
    const documento = ejemplo()
    const conMaderaCasiLlena: DocumentoPartida = {
      ...documento,
      existencias: documento.existencias.map((e) => (e.dominioId === DOM.bree && e.recursoId === RECURSO.madera ? { ...e, cantidad: 590 } : e)),
    }
    expect(() => eliminarObra(conMaderaCasiLlena, OBRA.granero, { devolverCoste: false, devolverMateriales: true }, catalogo)).toThrow(
      'Caben 10 haces más',
    )
  })

  it('terminada: el gasto se queda sin vínculo y el efecto no se deshace', () => {
    const documento = ejemplo()
    const terminada = { ...obra(documento, OBRA.puerta), estado: 'terminada' as const }
    const conTerminada: DocumentoPartida = { ...documento, obras: documento.obras.map((o) => (o.id === terminada.id ? terminada : o)) }
    const estado = eliminarObra(conTerminada, OBRA.puerta, { devolverCoste: false, devolverMateriales: false }, catalogo)
    expect(estado.obras.some((o) => o.id === OBRA.puerta)).toBe(false)
    const gasto = estado.movimientos.find((m) => m.id === MOV_BREE.obraPuerta)!
    expect(gasto.vinculo).toBeUndefined()
  })
})
