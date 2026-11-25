import { Icono } from '../iconos/Icono'
import estilos from './Casilla.module.css'

export interface PropsCasilla {
  etiqueta: string
  marcada: boolean
  alCambiar: (marcada: boolean) => void
  desactivada?: boolean
}

/** Casilla con su propia caja de 24 × 24; el `<input>` real queda oculto a la vista (mjs L1371-1372). */
export function Casilla({ etiqueta, marcada, alCambiar, desactivada = false }: PropsCasilla) {
  return (
    <label className={estilos.fila} data-desactivada={desactivada ? '' : undefined}>
      <input
        type="checkbox"
        className={estilos.entrada}
        checked={marcada}
        disabled={desactivada}
        onChange={(evento) => alCambiar(evento.target.checked)}
      />
      <span className={estilos.caja} data-marcada={marcada ? '' : undefined} aria-hidden="true">
        {marcada && <Icono nombre="check" tamano={16} color="var(--vitela)" />}
      </span>
      {etiqueta}
    </label>
  )
}
