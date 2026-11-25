import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Boton, BotonIcono } from './Boton'
import estilos from './Dialogo.module.css'
import { ContextoNivelDialogo, MAXIMO_DIALOGOS, useNivelDialogo } from './nivelDialogo'

export interface PropsDialogo {
  titulo: string
  subtitulo?: string
  ancho: number
  abierto: boolean
  alCancelar: () => void
  pieIzquierda?: ReactNode
  pieDerecha?: ReactNode
  children: ReactNode
}

/**
 * Dialogo de §6.8: un `<dialog>` nativo con `showModal`, que apila hasta dos niveles (espec. L219).
 * La x y Esc equivalen a Cancelar (espec. L945); clicar el velo no cierra, para no perder lo escrito.
 */
export function Dialogo(props: PropsDialogo) {
  const { titulo, subtitulo, ancho, abierto, alCancelar, pieIzquierda, pieDerecha, children } = props
  const nivelExterior = useNivelDialogo()
  const nivel = nivelExterior + 1
  if (nivel > MAXIMO_DIALOGOS) {
    throw new Error('Como mucho hay dos diálogos visibles (§5)')
  }

  const referencia = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  const idSubtitulo = useId()

  useEffect(() => {
    const dialogo = referencia.current
    if (!dialogo) {
      return
    }
    // Antes de showModal se mira dialog.open, por StrictMode (crítica §5.1).
    if (abierto && !dialogo.open) {
      dialogo.showModal()
    }
    if (!abierto && dialogo.open) {
      dialogo.close()
    }
    return () => {
      if (dialogo.open) {
        dialogo.close()
      }
    }
  }, [abierto])

  useEffect(() => {
    const dialogo = referencia.current
    if (!dialogo) {
      return
    }
    function alRecibirCancel(evento: Event) {
      // El evento cancel (Esc) equivale a Cancelar; no cierra por sí solo (espec. L945).
      evento.preventDefault()
      alCancelar()
    }
    dialogo.addEventListener('cancel', alRecibirCancel)
    return () => dialogo.removeEventListener('cancel', alRecibirCancel)
  }, [alCancelar])

  if (!abierto) {
    return null
  }

  return (
    <ContextoNivelDialogo.Provider value={nivel}>
      <dialog
        ref={referencia}
        aria-labelledby={idTitulo}
        aria-describedby={subtitulo ? idSubtitulo : undefined}
        data-apilado={nivel === 2 ? 'true' : undefined}
        style={{ width: ancho }}
        className={estilos.dialogo}
      >
        <div className={estilos.cabecera}>
          <div>
            <h2 id={idTitulo} className={estilos.titulo}>
              {titulo}
            </h2>
            {subtitulo ? (
              <p id={idSubtitulo} className={estilos.subtitulo}>
                {subtitulo}
              </p>
            ) : null}
          </div>
          <BotonIcono icono="x" etiqueta="Cerrar" variante="fantasma" alPulsar={alCancelar} />
        </div>
        <div className={estilos.cuerpo}>{children}</div>
        {pieIzquierda || pieDerecha ? (
          <div className={estilos.pie}>
            <div>{pieIzquierda}</div>
            <div className={estilos.pieDerecha}>{pieDerecha}</div>
          </div>
        ) : null}
      </dialog>
    </ContextoNivelDialogo.Provider>
  )
}

export interface PropsDialogoMensaje {
  titulo: string
  lineas: readonly string[]
  abierto: boolean
  alAceptar: () => void
}

/** DialogoMensaje de §6.8: una línea por mensaje y «Aceptar»; su Cancelar (x o Esc) equivale a Aceptar. */
export function DialogoMensaje(props: PropsDialogoMensaje) {
  return (
    <Dialogo
      titulo={props.titulo}
      ancho={620}
      abierto={props.abierto}
      alCancelar={props.alAceptar}
      pieDerecha={
        <Boton variante="principal" alPulsar={props.alAceptar}>
          Aceptar
        </Boton>
      }
    >
      <div className={estilos.lineas}>
        {props.lineas.map((linea, indice) => (
          <p key={indice}>{linea}</p>
        ))}
      </div>
    </Dialogo>
  )
}
