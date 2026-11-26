import type { ReactNode } from 'react'
import estilos from './Tabla.module.css'

export interface ColumnaTabla {
  titulo: string
  ancho?: string
  derecha?: boolean
}

export interface PropsTabla {
  etiqueta: string
  columnas: readonly ColumnaTabla[]
  filas: readonly (readonly ReactNode[])[]
  altoFila?: number
  total?: readonly ReactNode[]
}

/** Tabla de registros con cabecera de columnas y una fila de total opcional (mjs L161-172). */
export function Tabla({ etiqueta, columnas, filas, altoFila = 44, total }: PropsTabla) {
  return (
    <table aria-label={etiqueta} className={estilos.tabla}>
      <thead>
        <tr>
          {columnas.map((columna) => (
            <th
              key={columna.titulo}
              scope="col"
              className={estilos.cabecera}
              data-derecha={columna.derecha === true ? '' : undefined}
              style={{ width: columna.ancho }}
            >
              {columna.titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((celdas, indiceFila) => (
          // Las filas son datos ya ordenados por quien llama; no traen una clave propia en esta capa de presentación.
          <tr key={indiceFila} style={{ height: altoFila }}>
            {celdas.map((celda, indiceCelda) => (
              <td
                key={columnas[indiceCelda]?.titulo ?? indiceCelda}
                className={estilos.celda}
                data-derecha={columnas[indiceCelda]?.derecha === true ? '' : undefined}
                data-columna={columnas[indiceCelda]?.titulo.trim()}
              >
                {celda}
              </td>
            ))}
          </tr>
        ))}
        {total !== undefined && (
          <tr data-total="true" style={{ height: altoFila }}>
            {total.map((celda, indiceCelda) => (
              <td
                key={columnas[indiceCelda]?.titulo ?? indiceCelda}
                className={estilos.celdaTotal}
                data-derecha={columnas[indiceCelda]?.derecha === true ? '' : undefined}
                data-columna={columnas[indiceCelda]?.titulo.trim()}
              >
                {celda}
              </td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  )
}

export interface FilaPar {
  etiqueta: ReactNode
  valor: ReactNode
  sub?: ReactNode
}

export interface PropsListaPares {
  filas: readonly FilaPar[]
  altoFila?: number
}

/** Lista de pares etiqueta-valor, con filete simple entre filas salvo la última (mjs L158-160). */
export function ListaPares({ filas, altoFila }: PropsListaPares) {
  return (
    <dl className={estilos.listaPares}>
      {filas.map((par, indice) => (
        <div
          key={indice}
          className={estilos.filaPar}
          style={{ minHeight: altoFila ?? (par.sub === undefined ? 44 : 54) }}
          data-ultima={indice === filas.length - 1 ? '' : undefined}
        >
          <dt className={estilos.etiquetaPar}>
            <span>{par.etiqueta}</span>
            {par.sub !== undefined && <span className={estilos.subPar}>{par.sub}</span>}
          </dt>
          <dd className={estilos.valorPar}>{par.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
