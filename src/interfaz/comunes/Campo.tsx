import { useId, type ReactNode } from 'react'
import { Icono } from '../iconos/Icono'
import estilos from './Campo.module.css'

export interface PropsEtiquetaCampo {
  etiqueta: string
  idControl?: string
  ayuda?: string
  error?: string | null
  children: ReactNode
}

/** Etiqueta, control y, debajo, la ayuda o el error: la envoltura de los campos hechos a medida (§6.5). */
export function EtiquetaCampo({ etiqueta, idControl, ayuda, error, children }: PropsEtiquetaCampo) {
  const idAyuda = useId()
  return (
    <div className={estilos.etiquetaCampo}>
      <label htmlFor={idControl} className={estilos.etiqueta}>
        {etiqueta}
      </label>
      {children}
      {error != null ? (
        <MensajeError id={idAyuda}>{error}</MensajeError>
      ) : (
        ayuda !== undefined && (
          <span id={idAyuda} className={estilos.ayuda}>
            {ayuda}
          </span>
        )
      )}
    </div>
  )
}

export interface PropsCampoTexto {
  etiqueta: string
  valor: string
  alCambiar: (texto: string) => void
  alSalir?: () => void
  ayuda?: string
  error?: string | null
  maximo?: number
  modoTeclado?: 'text' | 'numeric' | 'decimal'
  desactivado?: boolean
  alinear?: 'izquierda' | 'derecha'
  sufijo?: string
  placeholder?: string
  etiquetaOculta?: boolean
}

/** Campo de texto de una línea, de 48 px de alto, con su etiqueta, ayuda y error (§6.5, mjs L191-194). */
export function CampoTexto({
  etiqueta,
  valor,
  alCambiar,
  alSalir,
  ayuda,
  error,
  maximo,
  modoTeclado = 'text',
  desactivado = false,
  alinear = 'izquierda',
  sufijo,
  placeholder,
  etiquetaOculta = false,
}: PropsCampoTexto) {
  const idControl = useId()
  const idAyuda = useId()
  const tieneAyuda = error != null || ayuda !== undefined

  return (
    <div className={estilos.etiquetaCampo}>
      <label htmlFor={idControl} className={etiquetaOculta ? estilos.etiquetaOculta : estilos.etiqueta}>
        {etiqueta}
      </label>
      <div className={estilos.controlConSufijo}>
        <input
          id={idControl}
          type="text"
          className={`${estilos.control} ${alinear === 'derecha' ? estilos.alineadoDerecha : ''}`}
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
          onBlur={alSalir}
          maxLength={maximo}
          inputMode={modoTeclado}
          disabled={desactivado}
          placeholder={placeholder}
          aria-invalid={error != null ? true : undefined}
          aria-describedby={tieneAyuda ? idAyuda : undefined}
        />
        {sufijo !== undefined && <span className={estilos.sufijo}>{sufijo}</span>}
      </div>
      {error != null ? (
        <MensajeError id={idAyuda}>{error}</MensajeError>
      ) : (
        ayuda !== undefined && (
          <span id={idAyuda} className={estilos.ayuda}>
            {ayuda}
          </span>
        )
      )}
    </div>
  )
}

/** Icono `alerta` y texto en lacre; el control que describe la enlaza con `aria-describedby` (§6.5). */
export function MensajeError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className={estilos.mensajeError}>
      <Icono nombre="alerta" tamano={16} color="var(--lacre)" />
      <span>{children}</span>
    </p>
  )
}
