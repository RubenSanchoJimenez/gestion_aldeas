import { useState } from 'react'
import { compararFechas, sumarDias } from '../../dominio/calendario/fecha'
import { eliminarEvento, terminarEventoHoy } from '../../dominio/edicion/eventos'
import { crearRegistro, editarRegistro } from '../../dominio/edicion/simples'
import { eventoActivoEl } from '../../dominio/eventos/efectos'
import type { EfectoEvento, EventoNarrativo } from '../../dominio/modelo/eventos'
import { Boton } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CampoFecha } from '../comunes/CampoFecha'
import { CabeceraPantalla, Nota } from '../comunes/Panel'
import { CampoOpcion } from '../formulario/campos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { decimalDe, enteroDe, fechaCorta } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'
import { ListaRegistros } from './comunes'

type Ambito = EfectoEvento['ambito']
const AMBITOS: Record<Ambito, string> = { produccion: 'Producción', consumo: 'Consumo', costes: 'Costes', ingresos: 'Ingresos' }
const COSTES = { salarios: 'Salarios', soldadas: 'Soldadas', tributos: 'Tributos', gastos: 'Gastos' }

/** Un efecto tal como se edita: ámbito, objetivo («todos» o un id) y el porcentaje escrito. */
interface FilaEfecto {
  ambito: Ambito
  objetivo: string
  pct: string
}

function aFila(efecto: EfectoEvento): FilaEfecto {
  const objetivo = efecto.objetivo.tipo === 'todos' ? 'todos' : efecto.objetivo.id
  return { ambito: efecto.ambito, objetivo, pct: String(efecto.pct).replace('.', ',') }
}

function aEfecto(fila: FilaEfecto): EfectoEvento {
  const pct = decimalDe(fila.pct, 'Porcentaje', -100, 1000)
  const tipo = { produccion: 'edificio', consumo: 'recurso', costes: 'categoriaCoste', ingresos: 'impuesto' }[fila.ambito]
  const objetivo = fila.objetivo === 'todos' ? { tipo: 'todos' } : { tipo, id: fila.objetivo }
  return { ambito: fila.ambito, objetivo, pct } as EfectoEvento
}

/** A11b, y los eventos de partida (sin efectos). */
export function DialogoEvento(props: { dominioId?: string; evento?: EventoNarrativo; alCerrar: () => void }) {
  const { documento, catalogo, editar } = usePartida()
  const { evento, dominioId } = props
  const hoy = documento.partida.fechaActual
  const [nombre, setNombre] = useState(evento?.nombre ?? '')
  const [inicio, setInicio] = useState(evento?.inicio ?? sumarDias(hoy, 1))
  const [duracion, setDuracion] = useState(String(evento?.duracionDias ?? 7))
  const [efectos, setEfectos] = useState<FilaEfecto[]>(evento?.efectos.map(aFila) ?? [])
  const [notas, setNotas] = useState(evento?.notas ?? '')

  function objetivos(ambito: Ambito): { valor: string; texto: string }[] {
    const especificos =
      ambito === 'produccion'
        ? documento.edificios.filter((e) => e.dominioId === dominioId).map((e) => ({ valor: e.id, texto: e.nombre }))
        : ambito === 'consumo'
          ? catalogo.recursos.map((r) => ({ valor: r.id, texto: r.nombre }))
          : ambito === 'costes'
            ? Object.entries(COSTES).map(([valor, texto]) => ({ valor, texto }))
            : documento.impuestosRentas
                .filter((i) => i.dominioId === dominioId && i.sentido === 'ingreso')
                .map((i) => ({ valor: i.id, texto: i.concepto }))
    return [{ valor: 'todos', texto: 'Todos' }, ...especificos]
  }

  const cambiar = (i: number, parche: Partial<FilaEfecto>): void =>
    setEfectos(efectos.map((f, j) => (j === i ? { ...f, ...parche } : f)))

  return (
    <DialogoFormulario
      titulo={evento === undefined ? 'Nuevo evento' : 'Editar evento'}
      subtitulo={dominioId === undefined ? 'De la partida, sin efectos económicos' : undefined}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        if (nombre.trim() === '') {
          throw new Error('Escribe un nombre')
        }
        const datos = {
          dominioId,
          nombre: nombre.trim(),
          inicio,
          duracionDias: enteroDe(duracion, 'Duración en días', 1, 100000),
          efectos: efectos.map(aEfecto),
          notas: notas.trim() === '' ? undefined : notas.trim(),
        }
        await editar((doc, sello) =>
          evento === undefined
            ? crearRegistro(doc, 'eventos', datos, sello).estado
            : editarRegistro(doc, 'eventos', evento.id, datos, sello),
        )
      }}
      eliminar={
        evento === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${evento.nombre}»?`,
              subtitulo: 'Evento',
              resumen: [{ etiqueta: 'Lo ya aplicado', valor: 'No se recalcula' }],
              alEliminar: () => editar((doc) => eliminarEvento(doc, evento.id)),
            }
      }
    >
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      <CampoFecha etiqueta="Inicio" valor={inicio} alCambiar={(f) => f !== null && setInicio(f)} hoy={hoy} edad={documento.partida.edad} />
      <CampoTexto etiqueta="Duración en días" modoTeclado="numeric" valor={duracion} alCambiar={setDuracion} />
      {dominioId !== undefined && (
        <>
          {efectos.map((f, i) => (
            <div key={i} className={estilos.rejilla3}>
              <CampoOpcion
                etiqueta={`Ámbito del efecto ${i + 1}`}
                valor={f.ambito}
                opciones={Object.entries(AMBITOS).map(([valor, texto]) => ({ valor, texto }))}
                alCambiar={(a) => cambiar(i, { ambito: a as Ambito, objetivo: 'todos' })}
              />
              <CampoOpcion etiqueta={`Objetivo del efecto ${i + 1}`} valor={f.objetivo} opciones={objetivos(f.ambito)} alCambiar={(objetivo) => cambiar(i, { objetivo })} />
              <div>
                <CampoTexto etiqueta={`Porcentaje del efecto ${i + 1}`} sufijo="%" valor={f.pct} alCambiar={(pct) => cambiar(i, { pct })} />
                <Boton variante="fantasma" icono="x" alPulsar={() => setEfectos(efectos.filter((_, j) => j !== i))}>
                  Quitar
                </Boton>
              </div>
            </div>
          ))}
          <div>
            <Boton variante="fantasma" icono="mas" alPulsar={() => setEfectos([...efectos, { ambito: 'produccion', objetivo: 'todos', pct: '-10' }])}>
              Añadir efecto
            </Boton>
          </div>
        </>
      )}
      <CampoTexto etiqueta="Notas" maximo={1000} valor={notas} alCambiar={setNotas} />
    </DialogoFormulario>
  )
}

/** A11: eventos activos, próximos y pasados. */
export function Eventos({ dominioId }: { dominioId: string }) {
  const { documento, editar } = usePartida()
  const [abierto, setAbierto] = useState<{ evento?: EventoNarrativo } | null>(null)
  const hoy = documento.partida.fechaActual
  const suyos = documento.eventos.filter((e) => e.dominioId === dominioId)
  const grupos = [
    { titulo: 'Activos', lista: suyos.filter((e) => eventoActivoEl(e, hoy)) },
    { titulo: 'Próximos', lista: suyos.filter((e) => compararFechas(e.inicio, hoy) > 0) },
    { titulo: 'Pasados', lista: suyos.filter((e) => compararFechas(sumarDias(e.inicio, e.duracionDias - 1), hoy) < 0) },
  ]
  return (
    <>
      <CabeceraPantalla
        titulo="Eventos narrativos"
        acciones={
          <Boton variante="principal" icono="mas" alPulsar={() => setAbierto({})}>
            Nuevo evento
          </Boton>
        }
      />
      {suyos.length === 0 && <Nota>No hay eventos</Nota>}
      {grupos
        .filter((g) => g.lista.length > 0)
        .map((g) => (
          <ListaRegistros
            key={g.titulo}
            titulo={g.titulo}
            registros={g.lista}
            columnas={[{ titulo: 'Evento' }, { titulo: 'Fechas' }, { titulo: 'Efectos' }, { titulo: ' ', ancho: '150px' }]}
            nombreDe={(e) => e.nombre}
            fila={(e) => [
              <span key="n">
                {e.nombre}
                {e.notas !== undefined && <span className={estilos.suave}> · {e.notas}</span>}
              </span>,
              `${fechaCorta(e.inicio, hoy)} – ${fechaCorta(sumarDias(e.inicio, e.duracionDias - 1), hoy)}`,
              e.efectos.map((f) => `${AMBITOS[f.ambito]} ${f.pct > 0 ? '+' : ''}${f.pct} %`).join(', ') || 'Ninguno',
              eventoActivoEl(e, hoy) ? (
                <Boton key="t" variante="secundario" alPulsar={() => void editar((doc, sello) => terminarEventoHoy(doc, e.id, sello))}>
                  Terminar hoy
                </Boton>
              ) : (
                ''
              ),
            ]}
            alEditar={(evento) => setAbierto({ evento })}
          />
        ))}
      {abierto !== null && <DialogoEvento dominioId={dominioId} evento={abierto.evento} alCerrar={() => setAbierto(null)} />}
    </>
  )
}
