import type { Id } from '../../dominio/modelo/comunes'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import type { NombreIcono } from '../iconos/trazos'

export type SeccionPersonaje = 'resumen' | 'bolsa' | 'inventario' | 'deudas' | 'gastos' | 'inversiones' | 'hechizos'
export type SeccionAsentamiento =
  | 'resumen'
  | 'tesoreria'
  | 'poblacion'
  | 'personal'
  | 'produccion'
  | 'animales'
  | 'comercio'
  | 'eventos'
export type Seccion = SeccionPersonaje | SeccionAsentamiento

export type Pantalla =
  | { tipo: 'inicio' }
  | { tipo: 'calendario' }
  | { tipo: 'dominio'; dominioId: Id; seccion: Seccion }
  | { tipo: 'anadirAsentamiento' }
  | { tipo: 'ajustes' }
  | { tipo: 'listas' }

export interface EntradaSeccion<S extends Seccion> {
  seccion: S
  texto: string
  icono: NombreIcono
}

export const SECCIONES_PERSONAJE: readonly EntradaSeccion<SeccionPersonaje>[] = [
  { seccion: 'resumen', texto: 'Resumen', icono: 'resumen' },
  { seccion: 'bolsa', texto: 'Bolsa y movimientos', icono: 'monedas' },
  { seccion: 'inventario', texto: 'Inventario', icono: 'bolsa' },
  { seccion: 'deudas', texto: 'Deudas y préstamos', icono: 'balanza' },
  { seccion: 'gastos', texto: 'Gastos e ingresos', icono: 'repetir' },
  { seccion: 'inversiones', texto: 'Inversiones', icono: 'maletin' },
  { seccion: 'hechizos', texto: 'Hechizos', icono: 'libro' },
]

export const SECCIONES_ASENTAMIENTO: readonly EntradaSeccion<SeccionAsentamiento>[] = [
  { seccion: 'resumen', texto: 'Resumen', icono: 'resumen' },
  { seccion: 'tesoreria', texto: 'Tesorería', icono: 'tesoro' },
  { seccion: 'poblacion', texto: 'Población', icono: 'gente' },
  { seccion: 'personal', texto: 'Personal', icono: 'ficha' },
  { seccion: 'produccion', texto: 'Producción', icono: 'trigo' },
  { seccion: 'animales', texto: 'Animales', icono: 'huella' },
  { seccion: 'comercio', texto: 'Comercio', icono: 'carro' },
  { seccion: 'eventos', texto: 'Eventos', icono: 'bandera' },
]

/** Título y subtítulo de la pantalla provisional (D-081). */
export function tituloProvisional(p: Pantalla, documento: DocumentoPartida): { titulo: string; subtitulo: string } {
  const partida = documento.partida.nombre
  switch (p.tipo) {
    case 'inicio':
      return { titulo: 'Inicio', subtitulo: partida }
    case 'calendario':
      return { titulo: 'Calendario', subtitulo: partida }
    case 'anadirAsentamiento':
      return { titulo: 'Añadir asentamiento', subtitulo: partida }
    case 'ajustes':
      return { titulo: 'Ajustes y copias', subtitulo: partida }
    case 'listas':
      return { titulo: 'Listas y catálogos', subtitulo: 'Ajustes y copias' }
    case 'dominio': {
      const dominio = documento.dominios.find((d) => d.id === p.dominioId)
      const secciones = dominio?.tipo === 'personaje' ? SECCIONES_PERSONAJE : SECCIONES_ASENTAMIENTO
      return {
        titulo: secciones.find((s) => s.seccion === p.seccion)?.texto ?? '',
        subtitulo: dominio?.nombre ?? partida,
      }
    }
  }
}
