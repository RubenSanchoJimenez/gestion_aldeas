import { useId, type ReactNode } from 'react'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/trazos'
import estilos from './Panel.module.css'

export interface PropsPanel {
  titulo: string
  accion?: ReactNode
  relleno?: string
  children: ReactNode
}

/** Contenedor con cabecera de filete doble, en vitela (mjs L140-146). */
export function Panel({ titulo, accion, relleno = '4px 20px 10px', children }: PropsPanel) {
  const idTitulo = useId()
  return (
    <section className={estilos.panel} aria-labelledby={idTitulo}>
      <div className={estilos.cabecera}>
        <h2 id={idTitulo} className={estilos.titulo}>
          {titulo}
        </h2>
        {accion !== undefined && <div className={estilos.accion}>{accion}</div>}
      </div>
      <div className={estilos.cuerpo} style={{ padding: relleno }}>
        {children}
      </div>
    </section>
  )
}

export interface PropsCabeceraPantalla {
  titulo: string
  subtitulo?: string
  acciones?: ReactNode
}

/** Cabecera de una pantalla completa: subtítulo, h1 y acciones a la derecha (mjs L133-139). */
export function CabeceraPantalla({ titulo, subtitulo, acciones }: PropsCabeceraPantalla) {
  return (
    <div className={estilos.cabeceraPantalla}>
      <div className={estilos.textos}>
        {subtitulo !== undefined && <span className={estilos.subtitulo}>{subtitulo}</span>}
        <h1 className={estilos.tituloPantalla}>{titulo}</h1>
      </div>
      {acciones !== undefined && <div className={estilos.acciones}>{acciones}</div>}
    </div>
  )
}

export interface PropsNota {
  children: ReactNode
  icono?: NombreIcono
}

/** Texto de ayuda con un icono pequeño, en tinta-suave; el color nunca va solo (mjs L187). */
export function Nota({ children, icono = 'info' }: PropsNota) {
  return (
    <div className={estilos.nota}>
      <Icono nombre={icono} tamano={16} color="var(--tinta-suave)" />
      <span>{children}</span>
    </div>
  )
}
