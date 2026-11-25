import type { ReactNode } from 'react'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/trazos'
import estilos from './Boton.module.css'

export type VarianteBoton = 'principal' | 'secundario' | 'fantasma' | 'peligro' | 'peligroLleno'

/** Clase de color de cada variante (mjs L107-113); las pruebas leen `data-variante`, nunca esta clase. */
const CLASE_VARIANTE: Record<VarianteBoton, string> = {
  principal: estilos.botonPrincipal,
  secundario: estilos.botonSecundario,
  fantasma: estilos.botonFantasma,
  peligro: estilos.botonPeligro,
  peligroLleno: estilos.botonPeligroLleno,
}

export interface PropsBoton {
  children: ReactNode
  variante?: VarianteBoton
  icono?: NombreIcono
  alPulsar?: () => void
  desactivado?: boolean
  tipo?: 'button' | 'submit'
  ancho?: string
}

/** Botón de 44 px con sus cinco variantes de color (mjs L106-115). */
export function Boton({
  children,
  variante = 'secundario',
  icono,
  alPulsar,
  desactivado = false,
  tipo = 'button',
  ancho,
}: PropsBoton) {
  return (
    <button
      type={tipo}
      className={`${estilos.boton} ${CLASE_VARIANTE[variante]}`}
      data-variante={variante}
      disabled={desactivado}
      onClick={alPulsar}
      style={ancho === undefined ? undefined : { width: ancho }}
    >
      {icono !== undefined && <Icono nombre={icono} tamano={18} />}
      <span>{children}</span>
    </button>
  )
}

export interface PropsBotonIcono {
  icono: NombreIcono
  etiqueta: string
  variante?: 'secundario' | 'fantasma'
  alPulsar?: () => void
  desactivado?: boolean
}

const CLASE_VARIANTE_ICONO: Record<'secundario' | 'fantasma', string> = {
  secundario: estilos.botonIconoSecundario,
  fantasma: estilos.botonIconoFantasma,
}

/** Botón cuadrado de 44 × 44 con solo un icono; `etiqueta` es su nombre accesible (mjs L116-117). */
export function BotonIcono({
  icono,
  etiqueta,
  variante = 'secundario',
  alPulsar,
  desactivado = false,
}: PropsBotonIcono) {
  return (
    <button
      type="button"
      className={`${estilos.botonIcono} ${CLASE_VARIANTE_ICONO[variante]}`}
      data-variante={variante}
      aria-label={etiqueta}
      disabled={desactivado}
      onClick={alPulsar}
    >
      <Icono nombre={icono} tamano={20} />
    </button>
  )
}

export interface PropsEnlace {
  children: ReactNode
  alPulsar: () => void
  icono?: NombreIcono
}

/** Botón de texto sin fondo ni borde, en oro oscuro, para acciones secundarias (mjs L118-119). */
export function Enlace({ children, alPulsar, icono }: PropsEnlace) {
  return (
    <button type="button" className={estilos.enlace} onClick={alPulsar}>
      {icono !== undefined && <Icono nombre={icono} tamano={16} />}
      {children}
    </button>
  )
}
