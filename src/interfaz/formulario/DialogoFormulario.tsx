import { useState, type ReactNode } from 'react'
import { textoDeError } from '../app/servicios'
import { Boton } from '../comunes/Boton'
import { MensajeError } from '../comunes/Campo'
import { ConfirmacionEliminar } from '../comunes/ConfirmacionEliminar'
import { Dialogo } from '../comunes/Dialogo'
import type { FilaPar } from '../comunes/Tabla'
import estilos from './formulario.module.css'

export interface PropsDialogoFormulario {
  titulo: string
  subtitulo?: string
  children: ReactNode
  alCerrar: () => void
  /** Guarda; lo que lance se enseña en el pie y el diálogo sigue abierto. */
  alGuardar: () => Promise<void>
  textoGuardar?: string
  /** Si llega, el formulario es de edición y ofrece «Eliminar» con la doble confirmación J2d. */
  eliminar?: {
    titulo: string
    subtitulo: string
    resumen: readonly FilaPar[]
    alEliminar: () => Promise<void>
  }
}

/** El diálogo de alta y edición de cualquier registro (§6.4). */
export function DialogoFormulario(props: PropsDialogoFormulario) {
  const { titulo, subtitulo, children, alCerrar, alGuardar, textoGuardar = 'Guardar', eliminar } = props
  const [fallo, setFallo] = useState<string | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  async function hacer(accion: () => Promise<void>): Promise<void> {
    setOcupado(true)
    setFallo(null)
    try {
      await accion()
      alCerrar()
    } catch (error) {
      setOcupado(false)
      setBorrando(false)
      setFallo(textoDeError(error))
    }
  }

  return (
    <>
      {/* La confirmación sustituye al formulario, que conserva lo escrito mientras tanto (§5, «Diálogos apilados»). */}
      <Dialogo
        abierto={!borrando}
        ancho={700}
        titulo={titulo}
        subtitulo={subtitulo}
        alCancelar={alCerrar}
        pieIzquierda={
          fallo !== null ? (
            <MensajeError>{fallo}</MensajeError>
          ) : eliminar === undefined ? undefined : (
            <Boton variante="peligro" icono="x" alPulsar={() => setBorrando(true)}>
              Eliminar
            </Boton>
          )
        }
        pieDerecha={
          <>
            <Boton variante="secundario" alPulsar={alCerrar}>
              Cancelar
            </Boton>
            <Boton variante="principal" desactivado={ocupado} alPulsar={() => void hacer(alGuardar)}>
              {textoGuardar}
            </Boton>
          </>
        }
      >
        <div className={estilos.cuerpo} onInput={() => setFallo(null)}>
          {children}
        </div>
      </Dialogo>
      {borrando && eliminar !== undefined && (
        <ConfirmacionEliminar
          abierto
          titulo={eliminar.titulo}
          subtitulo={eliminar.subtitulo}
          resumen={eliminar.resumen}
          alCancelar={() => setBorrando(false)}
          alEliminar={() => void hacer(eliminar.alEliminar)}
        />
      )}
    </>
  )
}
