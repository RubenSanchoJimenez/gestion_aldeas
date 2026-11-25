import { useState } from 'react'
import { formatearOro } from '../../dominio/dinero/formato'
import {
  crearAsentamiento,
  editarAsentamiento,
  eliminarAsentamiento,
  resumenAlEliminarAsentamiento,
} from '../../dominio/edicion/asentamientos'
import type { DominioAsentamiento } from '../../dominio/modelo/dominios'
import { CampoTexto } from '../comunes/Campo'
import { CampoImporte } from '../comunes/CampoImporte'
import { Nota } from '../comunes/Panel'
import { Segmentos } from '../comunes/Segmentos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { enteroDe, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'

/** A0 y «Editar asentamiento». */
export function DialogoAsentamiento({ id, alCerrar }: { id?: string; alCerrar: () => void }) {
  const { documento, catalogo, editar, navegar } = usePartida()
  const actual = documento.dominios.find((d) => d.id === id)
  const asentamiento = actual?.tipo === 'asentamiento' ? actual : undefined
  const eq = documento.partida.equivalencias
  const caja = documento.cajas.find((c) => c.dominioId === id)
  const poblacion = documento.poblaciones.find((p) => p.dominioId === id)
  const [nombre, setNombre] = useState(asentamiento?.nombre ?? '')
  const [categoria, setCategoria] = useState<DominioAsentamiento['categoria']>(asentamiento?.categoria ?? 'aldea')
  const [habitantes, setHabitantes] = useState(String(poblacion?.habitantesIniciales ?? ''))
  const [cajaInicial, setCaja] = useState(valorDe(caja?.saldoInicial, eq))
  const personas = /^\d+$/.test(habitantes) ? Number(habitantes) : 0

  async function guardar(): Promise<void> {
    const datos = {
      nombre,
      categoria,
      habitantes: enteroDe(habitantes, 'Habitantes', 0, 10_000_000),
      cajaInicial: cajaInicial.cantidad.trim() === '' ? { base: 0 } : importeDe(cajaInicial, eq, 0),
    }
    let nuevoId = id
    await editar((doc, sello) => {
      if (id !== undefined) {
        return editarAsentamiento(doc, id, datos, sello)
      }
      const creado = crearAsentamiento(doc, datos, sello)
      nuevoId = creado.id
      return creado.estado
    })
    if (id === undefined && nuevoId !== undefined) {
      navegar({ tipo: 'dominio', dominioId: nuevoId, seccion: 'resumen' })
    }
  }

  return (
    <DialogoFormulario
      titulo={id === undefined ? 'Nuevo asentamiento' : 'Editar asentamiento'}
      alCerrar={alCerrar}
      alGuardar={guardar}
      textoGuardar={id === undefined ? 'Crear asentamiento' : 'Guardar'}
      eliminar={
        asentamiento === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${asentamiento.nombre}»?`,
              subtitulo: 'Se borra todo lo suyo. Tus objetos guardados allí pasan a «Encima».',
              resumen: resumenAlEliminarAsentamiento(documento, asentamiento.id).map((f) => ({
                etiqueta: f.etiqueta,
                valor: String(f.valor),
              })),
              alEliminar: async () => {
                navegar({ tipo: 'inicio' })
                await editar((doc, sello) => eliminarAsentamiento(doc, asentamiento.id, sello, catalogo))
              },
            }
      }
    >
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      <Segmentos<DominioAsentamiento['categoria']>
        etiqueta="Tipo"
        opciones={[
          { valor: 'aldea', texto: 'Aldea' },
          { valor: 'pueblo', texto: 'Pueblo' },
          { valor: 'ciudad', texto: 'Ciudad' },
        ]}
        valor={categoria}
        alCambiar={setCategoria}
      />
      <CampoTexto
        etiqueta={id === undefined ? 'Habitantes' : 'Habitantes iniciales'}
        modoTeclado="numeric"
        valor={habitantes}
        alCambiar={setHabitantes}
      />
      {personas > 0 && <Nota>Comerán {personas} sacos de víveres al mes.</Nota>}
      <CampoImporte etiqueta="Caja inicial" valor={cajaInicial} alCambiar={setCaja} equivalencias={eq} />
      {caja !== undefined && <Nota>Ahora la caja inicial es de {formatearOro(caja.saldoInicial.base, eq)}.</Nota>}
    </DialogoFormulario>
  )
}
