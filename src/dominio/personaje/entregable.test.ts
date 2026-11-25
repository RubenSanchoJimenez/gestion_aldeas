import { describe, expect, it } from 'vitest'
import { estadoDeDeuda } from '../deudas/pendiente'
import { vistaPreviaDePago } from '../deudas/pago'
import { saldosPorDominio } from '../dinero/saldo'
import { eliminarDeuda, registrarPagoDeuda } from '../edicion/deudas'
import {
  conteoDeIntentos,
  crearHechizo,
  editarHechizo,
  editarIntento,
  eliminarHechizo,
  eliminarIntento,
  registrarIntento,
  type DatosIntento,
} from '../edicion/hechizos'
import {
  crearInversion,
  editarInversion,
  eliminarInversion,
  reactivarInversion,
  retirarInversion,
  type DatosInversion,
} from '../edicion/inversiones'
import { crearObjeto, editarObjeto, eliminarObjeto } from '../edicion/objetos'
import { crearPergamino, editarPergamino, eliminarPergamino, type DatosPergamino } from '../edicion/pergaminos'
import type { Sello } from '../edicion/registros'
import { venderObjeto } from '../edicion/ventas'
import { DEUDA, DOM, HECHIZO, INTENTO, INVERSION, OBJETO, PERGAMINO } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { EsquemaDocumentoPartida, estadoDe, type EstadoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import { patrimonioDelPersonaje } from './patrimonio'

/** Un sello que no repite ids en toda la prueba. */
function nuevoSello(): Sello {
  return { ahora: '2026-11-25T12:00:00.000Z', nuevoId: idsEnSerie('fase5') }
}

/** El ejemplo del 12 de abril, congelado: ninguna operación puede tocarlo. */
function ejemplo(): EstadoPartida {
  return congelar(estadoDe(documentoDeEjemplo()))
}

/** La partida entera sigue siendo válida: esquema, referencias, unicidades y coherencia. */
function exigeValida(estado: EstadoPartida): EstadoPartida {
  const documento = { ...documentoDeEjemplo(), ...estado }
  const esquema = EsquemaDocumentoPartida.safeParse(documento)
  expect(esquema.error?.issues ?? []).toEqual([])
  expect(validarCopia(documento, catalogosDeEjemplo())).toEqual([])
  return congelar(estado)
}

const HOY = { anio: 1640, mes: 4, dia: 12 }

describe('Entregable de la fase 5', () => {
  it('J1, J4b y J3b: 167,118 mo; capital 27 mo y próximo interés 1,35 mo; bolsa 57,518 mo', () => {
    expect(patrimonioDelPersonaje(ejemplo()).neto).toBe(16711800)
    const previa = vistaPreviaDePago(ejemplo(), DEUDA.gremioTharan, {
      importe: 1500000,
      aplicarA: 'interesesYCapital',
      cuentaId: DOM.tharan,
    })
    expect(previa).toMatchObject({ capitalDespues: 2700000, proximoInteres: 135000, saldoDespues: 3151800 })
    const venta = venderObjeto(
      ejemplo(),
      OBJETO.esmeraldas,
      { cantidad: 1, precioUnitario: { base: 1100000 }, cuentaId: DOM.tharan, fecha: HOY },
      nuevoSello(),
    )
    exigeValida(venta.estado)
    expect(saldosPorDominio(venta.estado)[DOM.tharan]).toBe(5751800)
    expect(patrimonioDelPersonaje(venta.estado).neto).toBe(16611800)
  })

  it('J7: los conteos de intentos del ejemplo', () => {
    expect(conteoDeIntentos(ejemplo(), HECHIZO.pasoSinRastro)).toEqual({
      buenos: 0,
      malos: 2,
      ultimo: { anio: 1640, mes: 4, dia: 10 },
    })
    expect(conteoDeIntentos(ejemplo(), HECHIZO.luzDeElbereth)).toMatchObject({ buenos: 1, malos: 0 })
    expect(conteoDeIntentos(ejemplo(), HECHIZO.hablarConLosAnimales)).toMatchObject({ buenos: 1, malos: 1 })
  })

  it('un pago y el borrado de la deuda dejan la partida válida', () => {
    const s = nuevoSello()
    const { estado: pagado } = registrarPagoDeuda(
      ejemplo(),
      DEUDA.gremioTharan,
      { importe: { base: 1500000 }, aplicarA: 'interesesYCapital', fecha: HOY, cuentaId: DOM.tharan },
      s,
    )
    exigeValida(pagado)
    const deuda = pagado.deudas.find((d) => d.id === DEUDA.gremioTharan)
    expect(deuda && estadoDeDeuda(deuda).capital).toBe(2700000)
    exigeValida(eliminarDeuda(pagado, DEUDA.gremioTharan))
  })

  it('objetos: crear, editar y borrar; borrar el de un pergamino borra el pergamino', () => {
    const s = nuevoSello()
    const datos = {
      dominioId: DOM.tharan,
      nombre: 'Capa élfica',
      cantidad: 1,
      valorUnitario: { base: 1200000 },
      ubicacion: { tipo: 'encima' as const },
    }
    const { estado: creado, id } = crearObjeto(ejemplo(), datos, s)
    exigeValida(creado)
    expect(patrimonioDelPersonaje(creado).neto).toBe(16711800 + 1200000)
    expect(editarObjeto(creado, id, datos, s)).toBe(creado)
    exigeValida(editarObjeto(creado, id, { ...datos, cantidad: 3 }, s))
    const sinPergamino = exigeValida(eliminarObjeto(ejemplo(), OBJETO.pergaminoPaso))
    expect(sinPergamino.pergaminos.map((p) => p.id)).toEqual([PERGAMINO.luzDeElbereth])
    const intento = sinPergamino.intentos.find((i) => i.id === INTENTO.paso28Marzo)
    expect(intento).toMatchObject({ pergaminoEliminado: true, pergaminoConsumido: false })
    expect(() => editarObjeto(ejemplo(), OBJETO.pergaminoLuz, { ...datos, cantidad: 2 }, s)).toThrow('1 unidad')
  })

  it('un objeto vendido y después borrado deja la venta con su nombre y su valor', () => {
    const s = nuevoSello()
    const { estado: vendido } = venderObjeto(
      ejemplo(),
      OBJETO.esmeraldas,
      { cantidad: 1, precioUnitario: { base: 1100000 }, cuentaId: DOM.tharan, fecha: HOY },
      s,
    )
    const sin = exigeValida(eliminarObjeto(vendido, OBJETO.esmeraldas))
    expect(sin.ventas[0]).toMatchObject({ nombre: 'Esmeralda tallada', valorAnotado: { base: 1200000 } })
    expect(sin.ventas[0].objetoId).toBeUndefined()
  })

  it('inversiones: crear, editar, retirar, reactivar y borrar', () => {
    const s = nuevoSello()
    const datos: DatosInversion = {
      dominioId: DOM.tharan,
      negocio: 'Molino de Combe',
      capital: { base: 1000000 },
      participacionPct: 20,
      beneficio: { base: 50000 },
      recurrencia: { tipo: 'mensual', diaMes: 1 },
      cuentaCapitalId: DOM.tharan,
      cuentaBeneficiosId: DOM.tharan,
    }
    const { estado: creada, id } = crearInversion(ejemplo(), datos, s)
    exigeValida(creada)
    // El capital pasa de la bolsa a la inversión: el patrimonio no cambia.
    expect(patrimonioDelPersonaje(creada).neto).toBe(16711800)
    expect(editarInversion(creada, id, datos, s)).toBe(creada)
    const subida = exigeValida(editarInversion(creada, id, { ...datos, capital: { base: 2000000 } }, s))
    expect(saldosPorDominio(subida)[DOM.tharan]).toBe(4651800 - 2000000)
    const retirada = exigeValida(
      retirarInversion(subida, id, { importe: { base: 1500000 }, cuentaId: DOM.tharan, fecha: HOY }, s),
    )
    expect(patrimonioDelPersonaje(retirada).inversiones).toBe(7000000)
    const activa = exigeValida(reactivarInversion(retirada, id, s))
    expect(saldosPorDominio(activa)[DOM.tharan]).toBe(4651800 - 2000000)
    const borrada = exigeValida(eliminarInversion(activa, id))
    expect(saldosPorDominio(borrada)[DOM.tharan]).toBe(4651800)
  })

  it('borrar una inversión del ejemplo deja sus beneficios sueltos', () => {
    const antes = ejemplo()
    const despues = exigeValida(eliminarInversion(antes, INVERSION.tonelDorado))
    expect(despues.movimientos.some((m) => m.regla?.id === INVERSION.tonelDorado)).toBe(false)
    expect(despues.movimientos.some((m) => m.inversionId === INVERSION.tonelDorado)).toBe(false)
  })

  it('hechizos: nombre único, «Aprendido» y sus fechas, y renombrar arrastra pergaminos y objetos', () => {
    const s = nuevoSello()
    const base = { dominioId: DOM.tharan, nombre: ' paso sin RASTRO ', estado: 'enEstudio' as const }
    expect(() => crearHechizo(ejemplo(), base, s)).toThrow('añádela al nombre')
    const { estado: creado } = crearHechizo(ejemplo(), { ...base, nombre: 'Luz' }, s)
    exigeValida(creado)
    const aprendido = { nombre: 'Paso sin rastro', estado: 'aprendido' as const }
    expect(() => editarHechizo(ejemplo(), HECHIZO.pasoSinRastro, aprendido, s)).toThrow('cuándo')
    expect(() =>
      editarHechizo(ejemplo(), HECHIZO.pasoSinRastro, { ...aprendido, aprendidoEl: { anio: 1640, mes: 4, dia: 13 } }, s),
    ).toThrow('posterior a hoy')
    expect(() =>
      editarHechizo(ejemplo(), HECHIZO.pasoSinRastro, { ...aprendido, aprendidoEl: { anio: 1640, mes: 4, dia: 9 } }, s),
    ).toThrow('El último intento es del 10 de abril')
    const renombrado = exigeValida(
      editarHechizo(ejemplo(), HECHIZO.luzDeElbereth, { nombre: 'Luz mayor', estado: 'enEstudio' }, s),
    )
    expect(renombrado.objetos.find((o) => o.id === OBJETO.pergaminoLuz)?.nombre).toBe('Pergamino «Luz mayor»')
  })

  it('un intento consume el pergamino; cambiarlo o borrarlo lo devuelve', () => {
    const s = nuevoSello()
    const datos: DatosIntento = {
      hechizoId: HECHIZO.luzDeElbereth,
      fecha: HOY,
      resultado: 'bueno',
      pergaminoId: PERGAMINO.luzDeElbereth,
      pergaminoConsumido: true,
    }
    const { estado: usado, id } = registrarIntento(ejemplo(), datos, s)
    exigeValida(usado)
    expect(usado.pergaminos[0]).toMatchObject({ estado: 'consumido', consumidoEl: HOY })
    expect(usado.objetos.find((o) => o.id === OBJETO.pergaminoLuz)?.archivado).toBe('consumido')
    expect(editarIntento(usado, id, datos, s)).toBe(usado)
    const sinConsumir = exigeValida(editarIntento(usado, id, { ...datos, pergaminoConsumido: false }, s))
    expect(sinConsumir.pergaminos[0].estado).toBe('poseido')
    const borrado = exigeValida(eliminarIntento(usado, id, s))
    expect(borrado.pergaminos[0].estado).toBe('poseido')
    expect(() => registrarIntento(ejemplo(), { ...datos, fecha: { anio: 1640, mes: 4, dia: 13 } }, s)).toThrow(
      'posterior a hoy',
    )
    expect(() =>
      registrarIntento(ejemplo(), { ...datos, hechizoId: HECHIZO.hablarConLosAnimales }, s),
    ).toThrow('está aprendido')
  })

  it('borrar un hechizo borra sus intentos y deja sus pergaminos sin hechizo', () => {
    const sin = exigeValida(eliminarHechizo(ejemplo(), HECHIZO.pasoSinRastro))
    expect(sin.intentos.some((i) => i.hechizoId === HECHIZO.pasoSinRastro)).toBe(false)
    expect(sin.pergaminos.find((p) => p.id === PERGAMINO.pasoSinRastro)).toMatchObject({ nombre: 'Paso sin rastro' })
  })

  it('pergaminos: comprar, editar, perder y borrar', () => {
    const s = nuevoSello()
    const datos: DatosPergamino = {
      dominioId: DOM.tharan,
      nombre: 'Escudo',
      estado: 'poseido',
      valor: { base: 500000 },
      ubicacion: { tipo: 'encima' },
      compra: { cuentaId: DOM.tharan, fecha: HOY },
    }
    const { estado: creado, id } = crearPergamino(ejemplo(), datos, s)
    exigeValida(creado)
    expect(patrimonioDelPersonaje(creado).neto).toBe(16711800)
    expect(editarPergamino(creado, id, datos, s)).toBe(creado)
    const perdido = exigeValida(editarPergamino(creado, id, { ...datos, estado: 'perdido' }, s))
    expect(patrimonioDelPersonaje(perdido).neto).toBe(16711800 - 500000)
    expect(() => editarPergamino(creado, id, { ...datos, estado: 'consumido' }, s)).toThrow('intento')
    const borrado = exigeValida(eliminarPergamino(creado, id))
    expect(borrado.movimientos).toEqual(ejemplo().movimientos)
    expect(borrado.objetos).toEqual(ejemplo().objetos)
    expect(() => crearPergamino(ejemplo(), { ...datos, nombre: undefined }, s)).toThrow('nombre')
    exigeValida(eliminarPergamino(ejemplo(), PERGAMINO.pasoSinRastro))
  })
})
