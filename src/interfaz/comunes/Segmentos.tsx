import { useId, type KeyboardEvent } from 'react'
import estilos from './Segmentos.module.css'

/** Una opción de Segmentos, con el valor que se devuelve y el texto que se lee (§6.7). */
export interface OpcionSegmento<V extends string> {
  valor: V
  texto: string
}

export interface PropsSegmentos<V extends string> {
  etiqueta: string
  opciones: readonly OpcionSegmento<V>[]
  valor: V
  alCambiar: (valor: V) => void
  desactivado?: boolean
  etiquetaOculta?: boolean
}

/** Segmentos de §6.7: un radiogroup con roving tabindex y las flechas izquierda y derecha. */
export function Segmentos<V extends string>(props: PropsSegmentos<V>) {
  const idEtiqueta = useId()
  const total = props.opciones.length

  function alPulsarTecla(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    if (props.desactivado) {
      return
    }
    if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') {
      return
    }
    evento.preventDefault()
    const siguiente = evento.key === 'ArrowRight' ? (indice + 1) % total : (indice - 1 + total) % total
    props.alCambiar(props.opciones[siguiente].valor)
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={props.etiquetaOculta ? undefined : idEtiqueta}
      aria-label={props.etiquetaOculta ? props.etiqueta : undefined}
      data-desactivado={props.desactivado || undefined}
      className={estilos.contenedor}
    >
      {!props.etiquetaOculta ? (
        <span id={idEtiqueta} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
          {props.etiqueta}
        </span>
      ) : null}
      {props.opciones.map((opcion, indice) => {
        const activa = opcion.valor === props.valor
        return (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={activa}
            tabIndex={activa ? 0 : -1}
            disabled={props.desactivado}
            onClick={() => props.alCambiar(opcion.valor)}
            onKeyDown={(evento) => alPulsarTecla(evento, indice)}
            className={estilos.opcion}
          >
            {opcion.texto}
          </button>
        )
      })}
    </div>
  )
}
