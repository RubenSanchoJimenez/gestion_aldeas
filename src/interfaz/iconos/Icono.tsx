import { ICONOS, type NombreIcono } from './trazos'

export interface PropsIcono {
  nombre: NombreIcono
  tamano?: number
  color?: string
}

/** Un trazo de trazos.ts como SVG decorativo, oculto a la accesibilidad (mjs L74). */
export function Icono({ nombre, tamano = 20, color = 'currentColor' }: PropsIcono) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
      data-nombre={nombre}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONOS[nombre] }}
    />
  )
}
