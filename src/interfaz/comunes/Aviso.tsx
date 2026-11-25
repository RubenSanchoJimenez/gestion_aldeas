import type { ReactNode } from 'react'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/trazos'
import estilos from './Aviso.module.css'

/** Tono de un Aviso, con su color, texto y borde (§6.6, mjs L22). */
export type TonoAviso = 'lacre' | 'oro' | 'bosque' | 'neutro'

export interface PropsAviso {
  tono: TonoAviso
  children: ReactNode
  icono?: NombreIcono
  accion?: ReactNode
}

/** Icono por defecto de cada tono: alerta en lacre, reloj en los demás (mjs L185). */
function iconoPorDefecto(tono: TonoAviso): NombreIcono {
  return tono === 'lacre' ? 'alerta' : 'reloj'
}

/** Aviso de §6.6: el color nunca va solo, siempre con icono y texto (espec. L1404). */
export function Aviso(props: PropsAviso) {
  return (
    <div role="status" data-tono={props.tono} className={estilos.aviso}>
      <Icono nombre={props.icono ?? iconoPorDefecto(props.tono)} tamano={20} />
      <span className={estilos.texto}>{props.children}</span>
      {props.accion}
    </div>
  )
}
