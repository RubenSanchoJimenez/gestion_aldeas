import { useState } from 'react'
import { formatearOro } from '../../dominio/dinero/formato'
import { crearRegistro, editarRegistro, quitarRegistro } from '../../dominio/edicion/simples'
import type { Animal } from '../../dominio/modelo/asentamiento'
import { buscarEn } from '../../dominio/texto/buscar'
import { CampoTexto } from '../comunes/Campo'
import { CampoImporte } from '../comunes/CampoImporte'
import { CabeceraPantalla } from '../comunes/Panel'
import { Segmentos } from '../comunes/Segmentos'
import { CampoOpcion, NINGUNO } from '../formulario/campos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { enteroDe, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'
import { CampoCatalogo, ListaRegistros } from './comunes'
import { nombreDeOpcion } from './nombres'

const GENEROS: Record<Animal['genero'], string> = { hembra: 'Hembra', macho: 'Macho', mixto: 'Grupo mixto' }

function DialogoAnimal(props: { dominioId: string; animal?: Animal; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { animal } = props
  const eq = documento.partida.equivalencias
  const [tipo, setTipo] = useState(animal?.tipoId ?? '')
  const [cantidad, setCantidad] = useState(String(animal?.cantidad ?? 1))
  const [genero, setGenero] = useState<Animal['genero']>(animal?.genero ?? 'mixto')
  const [valor, setValor] = useState(valorDe(animal?.valorUnitario, eq))
  const [notas, setNotas] = useState(animal?.notas ?? '')
  return (
    <DialogoFormulario
      titulo={animal === undefined ? 'Añadir animales' : 'Editar animales'}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        if (tipo === '') {
          throw new Error('Elige el animal')
        }
        const datos = {
          dominioId: props.dominioId,
          tipoId: tipo,
          cantidad: enteroDe(cantidad, 'Cantidad'),
          genero,
          valorUnitario: valor.cantidad.trim() === '' ? undefined : importeDe(valor, eq, 0),
          notas: notas.trim() === '' ? undefined : notas.trim(),
        }
        await editar((doc, sello) => {
          // Tipo y género son únicos en el asentamiento: si ya hay una fila igual, la cantidad se suma.
          const igual = doc.animales.find(
            (a) => a.dominioId === props.dominioId && a.tipoId === tipo && a.genero === genero && a.id !== animal?.id,
          )
          if (animal === undefined) {
            return igual === undefined
              ? crearRegistro(doc, 'animales', datos, sello).estado
              : editarRegistro(doc, 'animales', igual.id, { cantidad: igual.cantidad + datos.cantidad }, sello)
          }
          if (igual !== undefined) {
            throw new Error('Ya hay una fila de ese animal con ese género')
          }
          return editarRegistro(doc, 'animales', animal.id, datos, sello)
        })
      }}
      eliminar={
        animal === undefined
          ? undefined
          : {
              titulo: '¿Eliminar estos animales?',
              subtitulo: `${animal.cantidad} cabezas`,
              resumen: [],
              alEliminar: () => editar((doc) => quitarRegistro(doc, 'animales', animal.id)),
            }
      }
    >
      <CampoCatalogo lista="tiposAnimal" etiqueta="Animal" valor={tipo} alCambiar={setTipo} />
      <CampoTexto etiqueta="Cantidad" modoTeclado="numeric" valor={cantidad} alCambiar={setCantidad} />
      <Segmentos<Animal['genero']>
        etiqueta="Género"
        opciones={(Object.keys(GENEROS) as Animal['genero'][]).map((v) => ({ valor: v, texto: GENEROS[v] }))}
        valor={genero}
        alCambiar={setGenero}
      />
      <CampoImporte etiqueta="Valor por cabeza (opcional)" valor={valor} alCambiar={setValor} equivalencias={eq} />
      <CampoTexto etiqueta="Notas" maximo={1000} valor={notas} alCambiar={setNotas} />
    </DialogoFormulario>
  )
}

/** A12: los animales del asentamiento. */
export function Animales({ dominioId }: { dominioId: string }) {
  const { documento, catalogo } = usePartida()
  const [abierto, setAbierto] = useState<{ animal?: Animal } | null>(null)
  const [genero, setGenero] = useState(NINGUNO)
  const [busqueda, setBusqueda] = useState('')
  const eq = documento.partida.equivalencias
  const suyos = documento.animales.filter((a) => a.dominioId === dominioId)
  const visibles = suyos
    .filter((a) => genero === NINGUNO || a.genero === genero)
    .filter((a) => busqueda.trim() === '' || buscarEn(nombreDeOpcion(catalogo, a.tipoId), busqueda) !== null)
  const cabezas = visibles.reduce((s, a) => s + a.cantidad, 0)
  const valor = visibles.reduce((s, a) => s + a.cantidad * (a.valorUnitario?.base ?? 0), 0)
  return (
    <>
      <CabeceraPantalla titulo="Animales" />
      <div className={estilos.rejilla2}>
        <CampoOpcion
          etiqueta="Filtrar por género"
          valor={genero}
          opciones={[{ valor: NINGUNO, texto: 'Todos' }, ...Object.entries(GENEROS).map(([v, texto]) => ({ valor: v, texto }))]}
          alCambiar={setGenero}
        />
        <CampoTexto etiqueta="Buscar" valor={busqueda} alCambiar={setBusqueda} />
      </div>
      <ListaRegistros
        titulo="Animales"
        textoAlta="Añadir animales"
        alAnadir={() => setAbierto({})}
        registros={visibles}
        columnas={[{ titulo: 'Animal' }, { titulo: 'Cantidad', derecha: true }, { titulo: 'Género' }, { titulo: 'Valor por cabeza', derecha: true }]}
        nombreDe={(a) => nombreDeOpcion(catalogo, a.tipoId)}
        fila={(a) => [
          nombreDeOpcion(catalogo, a.tipoId),
          a.cantidad,
          GENEROS[a.genero],
          a.valorUnitario === undefined ? '—' : formatearOro(a.valorUnitario.base, eq),
        ]}
        alEditar={(animal) => setAbierto({ animal })}
        pie={
          <p className={estilos.suave}>
            {cabezas} cabezas · valor anotado {formatearOro(valor, eq)}
          </p>
        }
      />
      {abierto !== null && <DialogoAnimal dominioId={dominioId} animal={abierto.animal} alCerrar={() => setAbierto(null)} />}
    </>
  )
}
