import { useState } from 'react'
import {
  crearOpcion,
  eliminarOpcion,
  eliminarRecurso,
  guardarRecurso,
  renombrarOpcion,
  usosEnPartida,
} from '../../datos/gestionCatalogo'
import {
  eliminarPersona,
  eliminarUbicacion,
  renombrarDeLista,
  usosDePersona,
  usosDeUbicacion,
} from '../../dominio/edicion/listasPartida'
import { personaPorNombre, ubicacionPorNombre } from '../../dominio/edicion/listas'
import type { ListaCatalogo, OpcionCatalogo } from '../../dominio/modelo/catalogos'
import { buscarEn } from '../../dominio/texto/buscar'
import { useServicios } from '../app/servicios'
import { Boton } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CabeceraPantalla, Nota } from '../comunes/Panel'
import { ListaRegistros } from '../asentamiento/comunes'
import { CampoOpcion, NINGUNO } from '../formulario/campos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { ubicacionDeClave, ubicaciones } from '../formulario/ubicaciones'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'

type Lista = ListaCatalogo | 'recursos' | 'ubicaciones' | 'personas'

const TITULOS: Record<Lista, string> = {
  categorias: 'Categorías',
  oficios: 'Oficios',
  tiposEdificio: 'Tipos de edificio',
  tiposUnidad: 'Tipos de unidad',
  tiposDefensa: 'Tipos de defensa',
  tiposAnimal: 'Tipos de animal',
  recursos: 'Recursos',
  ubicaciones: 'Ubicaciones',
  personas: 'Personas y entidades',
}

interface Fila {
  id: string
  nombre: string
  detalle: string
  usos: number
  origen: string
}

/** El formulario de una opción, un recurso, una persona o una ubicación, con su eliminación y reasignación (P7b). */
function DialogoElemento({ lista, id, alCerrar }: { lista: Lista; id?: string; alCerrar: () => void }) {
  const { db, nuevoId } = useServicios()
  const { documento, catalogo, editar, recargar } = usePartida()
  const recurso = catalogo.recursos.find((r) => r.id === id)
  const opciones = catalogo.opciones.filter((o) => o.lista === lista && !('borrada' in o && o.borrada === true))
  const opcion = opciones.find((o) => o.id === id)
  const deLista = lista === 'personas' || lista === 'ubicaciones' ? documento[lista].find((r) => r.id === id) : undefined
  const [nombre, setNombre] = useState(opcion?.nombre ?? recurso?.nombre ?? deLista?.nombre ?? '')
  const [grupo, setGrupo] = useState(opcion !== undefined && 'grupo' in opcion ? opcion.grupo : '')
  const [singular, setSingular] = useState(recurso?.unidadSingular ?? '')
  const [plural, setPlural] = useState(recurso?.unidadPlural ?? '')
  const [reemplazo, setReemplazo] = useState(NINGUNO)

  const grupos = [...new Set(opciones.flatMap((o: Omit<OpcionCatalogo, 'borrada'> | (typeof opciones)[number]) => ('grupo' in o ? [o.grupo as string] : [])))]
  const pideGrupo = id === undefined && grupos.length > 0 && lista !== 'categorias'

  async function guardar(): Promise<void> {
    if (lista === 'personas' || lista === 'ubicaciones') {
      await editar((doc, sello) => {
        if (id !== undefined) {
          return renombrarDeLista(doc, lista, id, nombre, sello)
        }
        const crear = lista === 'personas' ? personaPorNombre : ubicacionPorNombre
        return crear(doc, nombre, sello).estado
      })
      return
    }
    if (lista === 'recursos') {
      await guardarRecurso(db, id, { nombre, unidadSingular: singular, unidadPlural: plural }, nuevoId)
    } else if (id === undefined) {
      if (pideGrupo && grupo === '') {
        throw new Error('Elige el grupo')
      }
      await crearOpcion(db, lista, { nombre, grupo: grupo === '' ? undefined : grupo, plural }, nuevoId)
    } else {
      await renombrarOpcion(db, id, nombre)
    }
    await recargar()
  }

  async function eliminar(): Promise<void> {
    const elegido = reemplazo === NINGUNO ? undefined : reemplazo
    if (lista === 'personas') {
      await editar((doc) => eliminarPersona(doc, id!, elegido))
    } else if (lista === 'ubicaciones') {
      await editar((doc) => eliminarUbicacion(doc, id!, elegido === undefined ? undefined : ubicacionDeClave(elegido)))
    } else {
      if (lista === 'recursos') {
        await eliminarRecurso(db, id!)
      } else {
        await eliminarOpcion(db, id!, elegido)
      }
      await recargar()
    }
  }

  // «Sus registros pasan a»: las otras opciones de la misma lista.
  const destinos =
    lista === 'personas'
      ? documento.personas.filter((p) => p.id !== id).map((p) => ({ valor: p.id, texto: p.nombre }))
      : lista === 'ubicaciones'
        ? ubicaciones(documento)
            .filter((u) => u.valor !== `propia|${id}`)
            .map((u) => ({ valor: u.valor, texto: u.texto }))
        : opciones.filter((o) => o.id !== id).map((o) => ({ valor: o.id, texto: o.nombre }))
  const usos =
    id === undefined
      ? 0
      : lista === 'personas'
        ? usosDePersona(documento, id).obligatorios + usosDePersona(documento, id).opcionales
        : lista === 'ubicaciones'
          ? usosDeUbicacion(documento, id)
          : usosEnPartida(documento, id)

  return (
    <DialogoFormulario
      titulo={id === undefined ? 'Añadir' : 'Editar'}
      subtitulo={TITULOS[lista]}
      alCerrar={alCerrar}
      alGuardar={guardar}
      eliminar={
        id === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${nombre}»?`,
              subtitulo: `Se usa en ${usos} registros de esta partida`,
              resumen: [
                {
                  etiqueta: 'Sus registros pasan a',
                  valor: destinos.find((d) => d.valor === reemplazo)?.texto ?? 'Sin elegir',
                },
              ],
              alEliminar: eliminar,
            }
      }
    >
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      {pideGrupo && (
        <CampoOpcion etiqueta="Grupo" valor={grupo} opciones={grupos.map((g) => ({ valor: g, texto: g }))} alCambiar={setGrupo} />
      )}
      {lista === 'recursos' && (
        <>
          <CampoTexto etiqueta="Unidad en singular" maximo={20} valor={singular} alCambiar={setSingular} />
          <CampoTexto etiqueta="Unidad en plural" maximo={20} valor={plural} alCambiar={setPlural} />
          {recurso !== undefined && <Nota icono="alerta">Si cambias la unidad, las cantidades no se convierten.</Nota>}
        </>
      )}
      {lista === 'oficios' && id === undefined && (
        <CampoTexto etiqueta="Plural" ayuda="Vacío: se añade una «s»" maximo={40} valor={plural} alCambiar={setPlural} />
      )}
      {id !== undefined && lista !== 'recursos' && (
        <CampoOpcion
          etiqueta="Si lo eliminas, sus registros pasan a"
          valor={reemplazo}
          opciones={[{ valor: NINGUNO, texto: 'Sin elegir' }, ...destinos]}
          alCambiar={setReemplazo}
        />
      )}
    </DialogoFormulario>
  )
}

/** P7: los catálogos de la app y las listas de la partida (§6.6, patrón 5). */
export function Listas() {
  const { documento, catalogo, navegar } = usePartida()
  const [lista, setLista] = useState<Lista>('categorias')
  const [abierto, setAbierto] = useState<{ id?: string } | null>(null)
  const [busqueda, setBusqueda] = useState('')

  function filas(): Fila[] {
    if (lista === 'personas') {
      return documento.personas.map((p) => {
        const usos = usosDePersona(documento, p.id)
        return { id: p.id, nombre: p.nombre, detalle: '', usos: usos.obligatorios + usos.opcionales, origen: 'De esta partida' }
      })
    }
    if (lista === 'ubicaciones') {
      return documento.ubicaciones.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        detalle: '',
        usos: usosDeUbicacion(documento, u.id),
        origen: 'De esta partida',
      }))
    }
    const origen = (e: { propia: boolean }): string => (e.propia ? 'Tuya' : 'App')
    const elementos =
      lista === 'recursos'
        ? catalogo.recursos.map((r) => ({ ...r, detalle: r.unidadPlural }))
        : catalogo.opciones.filter((o) => o.lista === lista).map((o) => ({ ...o, detalle: '' }))
    return elementos
      .filter((e) => !('borrada' in e && e.borrada === true))
      .map((e) => ({ id: e.id, nombre: e.nombre, detalle: e.detalle, usos: usosEnPartida(documento, e.id), origen: origen(e) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }
  const todas = filas()

  return (
    <>
      <CabeceraPantalla
        titulo="Listas y catálogos"
        subtitulo="Ajustes y copias · opciones de los desplegables"
        acciones={
          <Boton variante="secundario" icono="izquierda" alPulsar={() => navegar({ tipo: 'ajustes' })}>
            Volver a Ajustes
          </Boton>
        }
      />
      <div className={estilos.rejilla2}>
        <CampoOpcion
          etiqueta="Lista"
          valor={lista}
          opciones={(Object.keys(TITULOS) as Lista[]).map((l) => ({ valor: l, texto: TITULOS[l] }))}
          alCambiar={(l) => {
            setLista(l as Lista)
            setBusqueda('')
          }}
          singular="lista"
          plural="listas"
        />
        <CampoTexto etiqueta="Buscar" valor={busqueda} alCambiar={setBusqueda} />
      </div>
      <ListaRegistros
        titulo={TITULOS[lista]}
        alAnadir={() => setAbierto({})}
        registros={todas.filter((f) => busqueda.trim() === '' || buscarEn(f.nombre, busqueda) !== null)}
        columnas={[{ titulo: 'Nombre' }, { titulo: 'Se usa en' }, { titulo: 'Origen' }]}
        nombreDe={(f) => f.nombre}
        fila={(f) => [
          <span key="n">
            {f.nombre}
            {f.detalle !== '' && <span className={estilos.suave}> · {f.detalle}</span>}
          </span>,
          f.usos === 0 ? '—' : `${f.usos} registros`,
          f.origen,
        ]}
        alEditar={(f) => setAbierto({ id: f.id })}
        pie={<Nota>Mercados, hechizos, negocios y tipos de local: en su pantalla.</Nota>}
      />
      {abierto !== null && <DialogoElemento lista={lista} id={abierto.id} alCerrar={() => setAbierto(null)} />}
    </>
  )
}
