import { useState, type ReactNode } from 'react'
import { Aviso } from './Aviso'
import { Boton } from './Boton'
import { Casilla } from './Casilla'
import { Dialogo } from './Dialogo'
import estilos from './ConfirmacionEliminar.module.css'
import { Nota } from './Panel'
import { ListaPares, type FilaPar } from './Tabla'

export interface PropsConfirmacionEliminar {
  titulo: string
  subtitulo: string
  resumen: readonly FilaPar[]
  avisoAvance?: string
  abierto: boolean
  alCancelar: () => void
  alEliminar: () => void
  children?: ReactNode
}

/** J2d de §6.9: la doble confirmación para borrar, con su casilla y el botón rojo desactivado hasta marcarla. */
export function ConfirmacionEliminar(props: PropsConfirmacionEliminar) {
  const [marcada, establecerMarcada] = useState(false)
  // La casilla empieza sin marcar cada vez que se abre (§6.9): se ajusta durante el render,
  // guardando el último `abierto` visto, en vez de con un efecto (react/set-state-in-effect).
  const [abiertoPrevio, establecerAbiertoPrevio] = useState(props.abierto)
  if (props.abierto !== abiertoPrevio) {
    establecerAbiertoPrevio(props.abierto)
    if (props.abierto) {
      establecerMarcada(false)
    }
  }

  return (
    <Dialogo
      titulo={props.titulo}
      subtitulo={props.subtitulo}
      ancho={620}
      abierto={props.abierto}
      alCancelar={props.alCancelar}
      pieDerecha={
        <>
          <Boton variante="secundario" alPulsar={props.alCancelar}>
            Cancelar
          </Boton>
          <Boton variante="peligroLleno" icono="x" desactivado={!marcada} alPulsar={props.alEliminar}>
            Eliminar definitivamente
          </Boton>
        </>
      }
    >
      <div className={estilos.resumen}>
        <ListaPares filas={props.resumen} altoFila={40} />
      </div>
      {props.avisoAvance ? (
        <Aviso tono="oro" icono="reloj_arena">
          {props.avisoAvance}
        </Aviso>
      ) : null}
      {props.children}
      <Casilla etiqueta="Sé que esto no se puede deshacer" marcada={marcada} alCambiar={establecerMarcada} />
      <Nota>El botón rojo no se activa hasta marcar la casilla.</Nota>
    </Dialogo>
  )
}
