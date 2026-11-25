import { formatearOro } from '../../dominio/dinero/formato'
import type { Equivalencias } from '../../dominio/dinero/monedas'
import { equivalenciasDesdeOro } from '../../dominio/dinero/textosEquivalencias'
import estilos from './campos.module.css'

export interface PropsResumenOro {
  etiqueta: string
  base: number
  equivalencias: Equivalencias
}

/** Un total en monedas de oro, con las equivalencias al lado. */
export function ResumenOro({ etiqueta, base, equivalencias }: PropsResumenOro) {
  return (
    <div className={estilos.resumen}>
      <span className={estilos.medallon} aria-hidden="true">
        mo
      </span>
      <div>
        <div className={estilos.suave}>{etiqueta} en monedas de oro</div>
        <div className={estilos.cifra}>{formatearOro(base, equivalencias)}</div>
      </div>
      <div className={`${estilos.suave} ${estilos.derecha}`}>
        <div>Equivalencias</div>
        <div>{equivalenciasDesdeOro(equivalencias)}</div>
      </div>
    </div>
  )
}
