import type { ReactNode } from 'react'
import type { ListaCatalogo } from '../../dominio/modelo/catalogos'
import { Boton, BotonIcono } from '../comunes/Boton'
import { Nota, Panel } from '../comunes/Panel'
import { Tabla, type ColumnaTabla } from '../comunes/Tabla'
import { CampoOpcion } from '../formulario/campos'
import { usePartida } from '../partida/contexto'

export interface PropsListaRegistros<T> {
  titulo: string
  textoAlta?: string
  alAnadir?: () => void
  registros: readonly T[]
  columnas: readonly ColumnaTabla[]
  /** Las celdas de un registro, sin la del botón de editar. */
  fila: (registro: T) => ReactNode[]
  alEditar?: (registro: T) => void
  nombreDe: (registro: T) => string
  vacio?: string
  pie?: ReactNode
}

/** Un panel con una tabla de registros, su botón de alta y el de editar de cada fila (§6.4). */
export function ListaRegistros<T>(props: PropsListaRegistros<T>) {
  const { titulo, registros, columnas, fila, alEditar, nombreDe } = props
  const conEditar = alEditar === undefined ? columnas : [...columnas, { titulo: ' ', ancho: '56px' }]
  return (
    <Panel
      titulo={titulo}
      accion={
        props.alAnadir === undefined ? undefined : (
          <Boton variante="secundario" icono="mas" alPulsar={props.alAnadir}>
            {props.textoAlta ?? 'Añadir'}
          </Boton>
        )
      }
    >
      {registros.length === 0 ? (
        <Nota>{props.vacio ?? 'Nada anotado'}</Nota>
      ) : (
        <Tabla
          etiqueta={titulo}
          columnas={conEditar}
          filas={registros.map((r) =>
            alEditar === undefined
              ? fila(r)
              : [
                  ...fila(r),
                  <BotonIcono
                    key="editar"
                    icono="editar"
                    variante="fantasma"
                    etiqueta={`Editar ${nombreDe(r)}`}
                    alPulsar={() => alEditar(r)}
                  />,
                ],
          )}
        />
      )}
      {props.pie}
    </Panel>
  )
}

/** Un selector sobre una lista de los catálogos (oficios, tipos de edificio, de unidad…). */
export function CampoCatalogo(props: {
  lista: ListaCatalogo
  etiqueta: string
  valor: string
  alCambiar: (id: string) => void
}) {
  const { catalogo } = usePartida()
  const opciones = catalogo.opciones
    .filter((o) => o.lista === props.lista && !('borrada' in o && o.borrada === true))
    .map((o) => ({ valor: o.id, texto: o.nombre }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es'))
  return <CampoOpcion etiqueta={props.etiqueta} valor={props.valor} opciones={opciones} alCambiar={props.alCambiar} />
}

/** Selector n.º 18: un recurso del almacén. */
export function CampoRecurso(props: { etiqueta?: string; valor: string; alCambiar: (id: string) => void }) {
  const { catalogo } = usePartida()
  const opciones = catalogo.recursos
    .filter((r) => !('borrada' in r && r.borrada === true))
    .map((r) => ({ valor: r.id, texto: r.nombre, detalle: r.unidadPlural }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es'))
  return (
    <CampoOpcion
      etiqueta={props.etiqueta ?? 'Recurso'}
      valor={props.valor}
      opciones={opciones}
      alCambiar={props.alCambiar}
      singular="recurso"
      plural="recursos"
    />
  )
}
