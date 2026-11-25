import type { ReactNode } from 'react'
import { formatearFecha } from '../../dominio/calendario/formatoFecha'
import { nombreDelDia } from '../../dominio/calendario/textosFecha'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import type { Dominio } from '../../dominio/modelo/dominios'
import { ordenarDominios } from '../../dominio/partidas/orden'
import { SECCIONES_ASENTAMIENTO, SECCIONES_PERSONAJE, type Pantalla } from '../app/navegacion'
import { Boton } from '../comunes/Boton'
import { CabeceraPantalla, Nota } from '../comunes/Panel'
import { Emblema } from '../iconos/Emblema'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/trazos'
import estilos from './marco.module.css'

export interface PropsMarcoPartida {
  documento: DocumentoPartida
  pantalla: Pantalla
  alNavegar: (p: Pantalla) => void
  /** Hueco de la barra: próximo aviso y «Avanzar días». */
  extremo?: ReactNode
  children: ReactNode
}

/** Barra superior, menú lateral y contenido (§5). */
export function MarcoPartida({ documento, pantalla, alNavegar, extremo, children }: PropsMarcoPartida) {
  const { nombre, fechaActual, edad } = documento.partida
  return (
    <div className={estilos.marco}>
      <header className={estilos.barra}>
        <div className={estilos.marca}>
          <Emblema tamano={22} />
          <span>{nombre}</span>
        </div>
        <div className={estilos.fecha}>
          <strong>{formatearFecha(fechaActual, { edad })}</strong>
          <span className={estilos.suave}>{nombreDelDia(fechaActual)}</span>
        </div>
        {extremo}
      </header>
      <MenuLateral dominios={ordenarDominios(documento.dominios)} pantalla={pantalla} alNavegar={alNavegar} />
      <main className={estilos.contenido}>{children}</main>
    </div>
  )
}

interface PropsEntrada {
  texto: string
  icono: NombreIcono
  activa: boolean
  alPulsar: () => void
  clase?: string
}

function Entrada({ texto, icono, activa, alPulsar, clase = '' }: PropsEntrada) {
  return (
    <button
      type="button"
      className={`${estilos.item} ${clase}`}
      aria-current={activa ? 'page' : undefined}
      onClick={alPulsar}
    >
      <Icono nombre={icono} tamano={18} />
      <span>{texto}</span>
    </button>
  )
}

interface PropsMenuLateral {
  dominios: readonly Dominio[]
  pantalla: Pantalla
  alNavegar: (p: Pantalla) => void
}

function MenuLateral({ dominios, pantalla, alNavegar }: PropsMenuLateral) {
  const abierto = pantalla.tipo === 'dominio' ? pantalla.dominioId : null
  return (
    <nav className={estilos.menu} aria-label="Menú de la partida">
      <span className={estilos.grupo}>Partida</span>
      <Entrada
        texto="Inicio"
        icono="casa"
        activa={pantalla.tipo === 'inicio'}
        alPulsar={() => alNavegar({ tipo: 'inicio' })}
      />
      <Entrada
        texto="Calendario"
        icono="calendario"
        activa={pantalla.tipo === 'calendario'}
        alPulsar={() => alNavegar({ tipo: 'calendario' })}
      />
      <span className={estilos.grupo}>Dominios</span>
      <div className={estilos.dominios}>
        {dominios.map((d) => {
          const desplegado = d.id === abierto
          const secciones = d.tipo === 'personaje' ? SECCIONES_PERSONAJE : SECCIONES_ASENTAMIENTO
          return (
            <div key={d.id} className={estilos.dominios}>
              <button
                type="button"
                className={`${estilos.item} ${desplegado ? estilos.desplegado : ''}`}
                aria-expanded={desplegado}
                onClick={() => {
                  if (!desplegado) {
                    alNavegar({ tipo: 'dominio', dominioId: d.id, seccion: 'resumen' })
                  }
                }}
              >
                <Icono nombre={d.tipo === 'personaje' ? 'usuario' : 'torre'} tamano={18} />
                <span className={estilos.nombre}>{d.nombre}</span>
                <span className={estilos.suave}>{d.tipo === 'personaje' ? 'personaje' : d.categoria}</span>
                <Icono nombre={desplegado ? 'abajo' : 'derecha'} tamano={16} />
              </button>
              {desplegado &&
                secciones.map((s) => (
                  <Entrada
                    key={s.seccion}
                    clase={estilos.sub}
                    texto={s.texto}
                    icono={s.icono}
                    activa={pantalla.tipo === 'dominio' && pantalla.seccion === s.seccion}
                    alPulsar={() => alNavegar({ tipo: 'dominio', dominioId: d.id, seccion: s.seccion })}
                  />
                ))}
            </div>
          )
        })}
      </div>
      <Entrada
        clase={estilos.apagado}
        texto="Añadir asentamiento"
        icono="mas"
        activa={pantalla.tipo === 'anadirAsentamiento'}
        alPulsar={() => alNavegar({ tipo: 'anadirAsentamiento' })}
      />
      <span className={estilos.hueco} />
      <Entrada
        texto="Ajustes y copias"
        icono="ajustes"
        activa={pantalla.tipo === 'ajustes' || pantalla.tipo === 'listas'}
        alPulsar={() => alNavegar({ tipo: 'ajustes' })}
      />
    </nav>
  )
}

export interface PropsPantallaPendiente {
  titulo: string
  subtitulo: string
  alIrAAjustes: () => void
}

/** La pantalla provisional de las que todavía no existen (D-081). */
export function PantallaPendiente({ titulo, subtitulo, alIrAAjustes }: PropsPantallaPendiente) {
  return (
    <>
      <CabeceraPantalla titulo={titulo} subtitulo={subtitulo} />
      <Nota>Esta pantalla llega en una fase posterior.</Nota>
      <div>
        <Boton variante="secundario" icono="ajustes" alPulsar={alIrAAjustes}>
          Ir a Ajustes y copias
        </Boton>
      </div>
    </>
  )
}
