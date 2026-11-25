import { describe, expect, it } from 'vitest'
import { saldosPorDominio } from '../dominio/dinero/saldo'
import { eliminarPersona, eliminarUbicacion, renombrarDeLista } from '../dominio/edicion/listasPartida'
import { DOM, PERSONA, UBICACION } from '../dominio/ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../dominio/ejemplo/sombraDelEste'
import { idsEnSerie } from '../dominio/motor/ids'
import { validarCopia } from '../dominio/validacion/coherencia'
import { leerCatalogo, sembrarCatalogo } from './catalogos'
import {
  crearOpcion,
  eliminarOpcion,
  eliminarRecurso,
  guardarRecurso,
  renombrarOpcion,
  usosTotales,
} from './gestionCatalogo'
import { baseDePrueba } from './pruebas/baseDePrueba'
import { crearPartida, leerPartida } from './repositorio'

const AHORA = '2026-11-25T10:00:00.000Z'

async function preparar() {
  const db = baseDePrueba(`catalogo-${Math.random()}`)
  await sembrarCatalogo(db)
  await crearPartida(db, documentoDeEjemplo(), AHORA)
  return db
}

describe('gestión de los catálogos (P7)', () => {
  it('crea y renombra sin repetir nombres', async () => {
    const db = await preparar()
    const ids = idsEnSerie('cat')
    const nueva = await crearOpcion(db, 'categorias', { nombre: 'Posadas del camino' }, ids)
    expect(nueva).toMatchObject({ grupo: 'tuyas', propia: true })
    await expect(crearOpcion(db, 'categorias', { nombre: ' posadas del CAMINO ' }, ids)).rejects.toThrow('Ya existe')
    await expect(renombrarOpcion(db, nueva.id, 'A')).rejects.toThrow('2 letras')
  })

  it('al eliminar una categoría en uso, sus registros pasan a otra y los saldos no cambian', async () => {
    const db = await preparar()
    const partida = documentoDeEjemplo()
    const id = 'cat.alojamiento'
    expect(await usosTotales(db, id)).toBeGreaterThan(0)
    await expect(eliminarOpcion(db, id, undefined)).rejects.toThrow('Elige')
    await eliminarOpcion(db, id, 'cat.comida-y-bebida')
    const guardada = (await leerPartida(db, partida.partida.id))!
    expect(await usosTotales(db, id)).toBe(0)
    expect(saldosPorDominio(guardada)).toEqual(saldosPorDominio(partida))
    expect(validarCopia(guardada, catalogosDeEjemplo())).toEqual([])
    expect((await leerCatalogo(db)).opciones.find((o) => o.id === id)?.borrada).toBe(true)
  })

  it('las que pone la app y los recursos en uso no se eliminan', async () => {
    const db = await preparar()
    await expect(eliminarOpcion(db, 'cat.salarios', 'cat.otros')).rejects.toThrow('la pone la app')
    await expect(eliminarRecurso(db, 'recurso.hierro')).rejects.toThrow('se usa')
    await guardarRecurso(db, undefined, { nombre: 'Marfil', unidadSingular: 'pieza', unidadPlural: 'piezas' }, () => 'r.1')
    await eliminarRecurso(db, 'r.1')
  })
})

describe('listas de la partida', () => {
  const sello = { ahora: AHORA, nuevoId: idsEnSerie('x') }

  it('renombrar y eliminar personas y ubicaciones deja la partida válida', () => {
    const partida = documentoDeEjemplo()
    expect(() => eliminarPersona(partida, PERSONA.hobart, undefined)).toThrow('deudas')
    const sinHobart = eliminarPersona(partida, PERSONA.hobart, PERSONA.dalen)
    expect(validarCopia(sinHobart, catalogosDeEjemplo())).toEqual([])
    expect(() => eliminarUbicacion(partida, UBICACION.posada, undefined)).toThrow('objetos')
    const sinPosada = eliminarUbicacion(partida, UBICACION.posada, { tipo: 'caja', dominioId: DOM.bree })
    expect(validarCopia(sinPosada, catalogosDeEjemplo())).toEqual([])
    expect(() => renombrarDeLista(partida, 'personas', PERSONA.hobart, 'Dalen, mercader de Esgaroth', sello)).toThrow(
      'Ya existe',
    )
  })
})
