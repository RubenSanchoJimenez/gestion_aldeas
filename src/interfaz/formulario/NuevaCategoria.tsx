import { useState } from 'react'
import { crearOpcion } from '../../datos/gestionCatalogo'
import { useServicios } from '../app/servicios'
import { CampoTexto } from '../comunes/Campo'
import { Nota } from '../comunes/Panel'
import { usePartida } from '../partida/contexto'
import { DialogoFormulario } from './DialogoFormulario'

/** J2e: alta rápida de una categoría desde su desplegable (§6.6, patrón 2). */
export function NuevaCategoria(props: { inicial: string; alCreada: (id: string) => void; alCerrar: () => void }) {
  const { db, nuevoId } = useServicios()
  const { recargar } = usePartida()
  const [nombre, setNombre] = useState(props.inicial)
  return (
    <DialogoFormulario
      titulo="Nueva categoría"
      subtitulo="Se elegirá al crearla."
      textoGuardar="Crear y elegir"
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        const creada = await crearOpcion(db, 'categorias', { nombre }, nuevoId)
        await recargar()
        props.alCreada(creada.id)
      }}
    >
      <CampoTexto etiqueta="Nombre de la categoría" maximo={40} valor={nombre} alCambiar={setNombre} />
      <Nota>Irá a «Tus categorías» y la verás en todas tus partidas.</Nota>
    </DialogoFormulario>
  )
}
