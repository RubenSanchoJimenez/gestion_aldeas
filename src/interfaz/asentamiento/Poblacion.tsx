import { useMemo, useState } from 'react'
import { diasDeReserva } from '../../dominio/almacen/prevision'
import { eliminarCambioDePoblacion, eliminarConsumo, guardarCambioDePoblacion, guardarConsumo } from '../../dominio/edicion/asentamientos'
import type { CambioPoblacion, ConsumoPorHabitante } from '../../dominio/modelo/almacen'
import { habitantesDe } from '../../dominio/poblacion/habitantes'
import { CampoTexto } from '../comunes/Campo'
import { CampoFecha } from '../comunes/CampoFecha'
import { CabeceraPantalla, Nota, Panel } from '../comunes/Panel'
import { ListaPares } from '../comunes/Tabla'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { decimalDe, fechaCorta } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import { CampoRecurso, ListaRegistros } from './comunes'
import { nombreDelRecurso } from './nombres'

function DialogoCambio(props: { dominioId: string; cambio?: CambioPoblacion; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { cambio } = props
  const hoy = documento.partida.fechaActual
  const [fecha, setFecha] = useState(cambio?.fecha ?? hoy)
  const [delta, setDelta] = useState(String(cambio?.delta ?? ''))
  const [motivo, setMotivo] = useState(cambio?.motivo ?? '')
  return (
    <DialogoFormulario
      titulo={cambio === undefined ? 'Añadir cambio de población' : 'Editar cambio de población'}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        const numero = /^[+-]?\d+$/.test(delta.trim()) ? Number(delta) : Number.NaN
        await editar((doc, sello) =>
          guardarCambioDePoblacion(doc, props.dominioId, { fecha, delta: numero, motivo: motivo.trim() }, cambio?.id, sello),
        )
      }}
      eliminar={
        cambio === undefined
          ? undefined
          : {
              titulo: '¿Eliminar el cambio?',
              subtitulo: cambio.motivo,
              resumen: [{ etiqueta: 'Habitantes', valor: 'Se recalculan' }],
              alEliminar: () => editar((doc, sello) => eliminarCambioDePoblacion(doc, props.dominioId, cambio.id, sello)),
            }
      }
    >
      <CampoTexto etiqueta="Habitantes que llegan o se van" ayuda="Con signo menos si se van" valor={delta} alCambiar={setDelta} />
      <CampoTexto etiqueta="Motivo" maximo={120} valor={motivo} alCambiar={setMotivo} />
      <CampoFecha etiqueta="Fecha" valor={fecha} alCambiar={(f) => f !== null && setFecha(f)} hoy={hoy} edad={documento.partida.edad} maximo={hoy} />
    </DialogoFormulario>
  )
}

function DialogoConsumo(props: { dominioId: string; consumo?: ConsumoPorHabitante; alCerrar: () => void }) {
  const { editar } = usePartida()
  const { consumo } = props
  const [nombre, setNombre] = useState(consumo?.nombre ?? '')
  const [recurso, setRecurso] = useState(consumo?.recursoId ?? '')
  const [porHabitante, setPor] = useState(String(consumo?.porHabitante ?? '').replace('.', ','))
  return (
    <DialogoFormulario
      titulo={consumo === undefined ? 'Añadir consumo' : 'Editar consumo'}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        const datos = { nombre: nombre.trim(), recursoId: recurso, porHabitante: decimalDe(porHabitante, 'Consumo', 0, 1000) }
        if (datos.nombre === '' || recurso === '') {
          throw new Error('Escribe el nombre y elige el recurso')
        }
        await editar((doc, sello) => guardarConsumo(doc, props.dominioId, datos, consumo?.id, sello))
      }}
      eliminar={
        consumo === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${consumo.nombre}»?`,
              subtitulo: 'Consumo',
              resumen: [],
              alEliminar: () => editar((doc, sello) => eliminarConsumo(doc, props.dominioId, consumo.id, sello)),
            }
      }
    >
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      <CampoRecurso valor={recurso} alCambiar={setRecurso} />
      <CampoTexto etiqueta="Consumo por habitante y día" modoTeclado="decimal" valor={porHabitante} alCambiar={setPor} />
    </DialogoFormulario>
  )
}

/** A4: habitantes, sus cambios y lo que consumen. */
export function Poblacion({ dominioId }: { dominioId: string }) {
  const { documento, catalogo } = usePartida()
  const [abierto, setAbierto] = useState<{ cambio?: CambioPoblacion } | { consumo?: ConsumoPorHabitante } | null>(null)
  const hoy = documento.partida.fechaActual
  const poblacion = documento.poblaciones.find((p) => p.dominioId === dominioId)
  const reservas = useMemo(
    () => diasDeReserva(documento, catalogo).filter((r) => r.dominioId === dominioId && r.reserva.tipo !== 'sinConsumo'),
    [documento, catalogo, dominioId],
  )
  const habitantes = habitantesDe(documento, dominioId, hoy)
  return (
    <>
      <CabeceraPantalla titulo="Población" subtitulo={`${habitantes} habitantes`} />
      <ListaRegistros
        titulo="Cambios de población"
        textoAlta="Añadir cambio"
        alAnadir={() => setAbierto({ cambio: undefined })}
        registros={poblacion?.cambios ?? []}
        columnas={[{ titulo: 'Fecha' }, { titulo: 'Motivo' }, { titulo: 'Cambio', derecha: true }]}
        nombreDe={(c) => c.motivo}
        fila={(c) => [fechaCorta(c.fecha, hoy), c.motivo, c.delta > 0 ? `+${c.delta}` : `−${-c.delta}`]}
        alEditar={(cambio) => setAbierto({ cambio })}
        pie={<Nota>Iniciales: {poblacion?.habitantesIniciales ?? 0}</Nota>}
      />
      <ListaRegistros
        titulo="Consumo diario"
        textoAlta="Añadir consumo"
        alAnadir={() => setAbierto({ consumo: undefined })}
        registros={poblacion?.consumos ?? []}
        columnas={[{ titulo: 'Consumo' }, { titulo: 'Recurso' }, { titulo: 'Por habitante', derecha: true }]}
        nombreDe={(c) => c.nombre}
        fila={(c) => [c.nombre, nombreDelRecurso(catalogo, c.recursoId), String(c.porHabitante).replace('.', ',')]}
        alEditar={(consumo) => setAbierto({ consumo })}
        pie={<Nota>Los víveres usan la ración de la partida: 1 saco por persona al mes.</Nota>}
      />
      <Panel titulo="Días de reserva">
        {reservas.length === 0 ? (
          <Nota>Sin consumos</Nota>
        ) : (
          <ListaPares
            filas={reservas.map((r) => ({
              etiqueta: nombreDelRecurso(catalogo, r.recursoId),
              valor: r.reserva.tipo === 'dias' ? `${r.reserva.dias} días` : 'Más de un año',
            }))}
          />
        )}
      </Panel>
      {abierto !== null && 'cambio' in abierto && (
        <DialogoCambio dominioId={dominioId} cambio={abierto.cambio} alCerrar={() => setAbierto(null)} />
      )}
      {abierto !== null && 'consumo' in abierto && (
        <DialogoConsumo dominioId={dominioId} consumo={abierto.consumo} alCerrar={() => setAbierto(null)} />
      )}
    </>
  )
}
