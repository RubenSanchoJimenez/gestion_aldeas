import { useId } from 'react'
import { formatearOro } from '../../dominio/dinero/formato'
import { MONEDAS, NOMBRE_MONEDA, valorEnBase, type Equivalencias, type Moneda } from '../../dominio/dinero/monedas'
import { BotonIcono } from './Boton'
import { MensajeError } from './Campo'
import estilos from './campos.module.css'
import { leerImporte, type ValorImporte } from './leerImporte'
import { SelectorConBuscador } from './SelectorConBuscador'

export interface PropsFilaImporte {
  valor: ValorImporte
  alCambiar: (v: ValorImporte) => void
  equivalencias: Equivalencias
  /** « de la fila 2» → «Cantidad de la fila 2». */
  sufijoAccesible?: string
  alQuitar?: () => void
  error?: string | null
}

/** Cantidad, moneda y su valor en oro, recalculado en cada tecla (§6.5, n.º 1). */
export function FilaImporte(props: PropsFilaImporte) {
  const { valor, alCambiar, equivalencias, sufijoAccesible = '', alQuitar, error } = props
  const idError = useId()
  const lectura = leerImporte(valor, equivalencias)
  const mensaje = error ?? (lectura.tipo === 'invalido' ? lectura.error : null)
  const monedas = MONEDAS.map((m) => ({
    valor: m,
    texto: `${NOMBRE_MONEDA[m]} · ${m}`,
    detalle: formatearOro(valorEnBase(m, equivalencias), equivalencias),
  }))
  return (
    <div>
      <div className={alQuitar === undefined ? estilos.fila : `${estilos.fila} ${estilos.conQuitar}`}>
        <input
          className={estilos.cantidad}
          inputMode="decimal"
          aria-label={`Cantidad${sufijoAccesible}`}
          aria-invalid={mensaje !== null}
          aria-describedby={mensaje === null ? undefined : idError}
          value={valor.cantidad}
          onChange={(e) => alCambiar({ ...valor, cantidad: e.target.value })}
        />
        <SelectorConBuscador<Moneda>
          etiqueta={`Moneda${sufijoAccesible}`}
          etiquetaOculta
          valor={valor.moneda}
          grupos={[{ opciones: monedas }]}
          alCambiar={(moneda) => alCambiar({ ...valor, moneda })}
          sustantivo={{ singular: 'moneda', plural: 'monedas' }}
        />
        <output className={estilos.enOro} aria-live="polite">
          <small>=</small>
          <span>{lectura.tipo === 'valido' ? formatearOro(lectura.base, equivalencias) : '—'}</span>
        </output>
        {alQuitar !== undefined && (
          <BotonIcono icono="x" variante="fantasma" etiqueta={`Quitar${sufijoAccesible.replace(' de', '')}`} alPulsar={alQuitar} />
        )}
      </div>
      {mensaje !== null && <MensajeError id={idError}>{mensaje}</MensajeError>}
    </div>
  )
}

export interface PropsCampoImporte extends Omit<PropsFilaImporte, 'sufijoAccesible' | 'alQuitar'> {
  etiqueta: string
  ayuda?: string
}

export function CampoImporte({ etiqueta, ayuda, ...fila }: PropsCampoImporte) {
  return (
    <fieldset className={estilos.frecuencia}>
      <legend>{etiqueta}</legend>
      <FilaImporte {...fila} />
      {ayuda !== undefined && <span className={estilos.suave}>{ayuda}</span>}
    </fieldset>
  )
}
