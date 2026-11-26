import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { analizarCopia } from '../../dominio/copia/analizar'
import { documentoDeEjemplo } from '../../dominio/ejemplo/sombraDelEste'
import type { BaseDeDatos } from '../baseDeDatos'
import { sembrarCatalogo } from '../catalogos'
import { archivoDePrueba } from '../pruebas/archivoDePrueba'
import { baseDePrueba } from '../pruebas/baseDePrueba'
import { crearPartida, leerPartida } from '../repositorio'
import { actualizarCopiaAutomatica, desvincularArchivo, permitirArchivo, vincularArchivo } from './automatica'

const AHORA = '2026-11-26T10:00:00.000Z'
const PARTIDA = 'p.sombra-del-este'

let db: BaseDeDatos

beforeEach(async () => {
  db = baseDePrueba()
  await sembrarCatalogo(db)
  await crearPartida(db, documentoDeEjemplo(), AHORA)
})

afterEach(() => {
  db.close()
})

describe('copia automática en un archivo del dispositivo', () => {
  it('sin archivo elegido no hace nada', async () => {
    expect(await actualizarCopiaAutomatica(db, PARTIDA, AHORA)).toEqual({ tipo: 'sinArchivo' })
  })

  it('escribe en el archivo una copia que se puede importar', async () => {
    const archivo = archivoDePrueba('mesa.json')
    await vincularArchivo(db, PARTIDA, archivo)
    expect(await actualizarCopiaAutomatica(db, PARTIDA, AHORA)).toEqual({ tipo: 'alDia', nombre: 'mesa.json', cuando: AHORA })
    expect(analizarCopia(archivo.contenido).ok).toBe(true)
  })

  it('cada actualización sustituye el contenido', async () => {
    const archivo = archivoDePrueba('mesa.json')
    await vincularArchivo(db, PARTIDA, archivo)
    await actualizarCopiaAutomatica(db, PARTIDA, AHORA)
    const documento = (await leerPartida(db, PARTIDA))!
    await db.partidas.put({ ...documento, partida: { ...documento.partida, nombre: 'Otro nombre' } })
    await actualizarCopiaAutomatica(db, PARTIDA, AHORA)
    expect(archivo.contenido).toContain('Otro nombre')
    expect(analizarCopia(archivo.contenido).ok).toBe(true)
  })

  it('no cambia la fecha de la última copia exportada a mano', async () => {
    await vincularArchivo(db, PARTIDA, archivoDePrueba('mesa.json'))
    await actualizarCopiaAutomatica(db, PARTIDA, AHORA)
    expect((await db.resumenes.get(PARTIDA))?.exportadaEl).toBeUndefined()
  })

  it('sin permiso no escribe; al concederlo, sí', async () => {
    const archivo = archivoDePrueba('mesa.json', 'prompt')
    await vincularArchivo(db, PARTIDA, archivo)
    expect(await actualizarCopiaAutomatica(db, PARTIDA, AHORA)).toEqual({ tipo: 'sinPermiso', nombre: 'mesa.json' })
    expect(archivo.contenido).toBe('')
    expect(await permitirArchivo(db, PARTIDA)).toBe(true)
    expect((await actualizarCopiaAutomatica(db, PARTIDA, AHORA)).tipo).toBe('alDia')
  })

  it('si falla la escritura, lo cuenta', async () => {
    const archivo = archivoDePrueba('mesa.json')
    archivo.fallo = 'Disco lleno'
    await vincularArchivo(db, PARTIDA, archivo)
    expect(await actualizarCopiaAutomatica(db, PARTIDA, AHORA)).toEqual({ tipo: 'error', nombre: 'mesa.json', mensaje: 'Disco lleno' })
  })

  it('al desvincular deja de escribir', async () => {
    await vincularArchivo(db, PARTIDA, archivoDePrueba('mesa.json'))
    await desvincularArchivo(db, PARTIDA)
    expect(await actualizarCopiaAutomatica(db, PARTIDA, AHORA)).toEqual({ tipo: 'sinArchivo' })
  })

  it('dos actualizaciones a la vez no se pisan', async () => {
    const archivo = archivoDePrueba('mesa.json')
    await vincularArchivo(db, PARTIDA, archivo)
    await Promise.all([actualizarCopiaAutomatica(db, PARTIDA, AHORA), actualizarCopiaAutomatica(db, PARTIDA, AHORA)])
    expect(archivo.maximoAbiertos).toBe(1)
  })
})
