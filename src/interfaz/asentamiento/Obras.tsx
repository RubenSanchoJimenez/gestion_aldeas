import { useState } from 'react'
import { finDeObra, progresoDeObra } from '../../dominio/almacen/progreso'
import type { Fecha } from '../../dominio/calendario/fecha'
import { formatearOro } from '../../dominio/dinero/formato'
import { crearObra, editarObra, eliminarObra, empezarObra, planificarObra } from '../../dominio/edicion/obras'
import type { EfectoObra, Obra } from '../../dominio/modelo/asentamiento'
import { Boton } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CampoFecha } from '../comunes/CampoFecha'
import { CampoImporte } from '../comunes/CampoImporte'
import { Casilla } from '../comunes/Casilla'
import { Nota } from '../comunes/Panel'
import { Segmentos } from '../comunes/Segmentos'
import { CampoOpcion } from '../formulario/campos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { decimalDe, enteroDe, fechaCorta, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import { CampoCatalogo, CampoRecurso, ListaRegistros } from './comunes'
import { conUnidad, nombreDelRecurso, nombreDeOpcion } from './nombres'

const RESULTADOS: Record<EfectoObra['tipo'], string> = {
  crearEdificio: 'Construir edificio',
  mejorarEdificio: 'Mejorar edificio',
  repararEdificio: 'Reparar edificio',
  ampliarAlmacen: 'Ampliar almacén',
  crearDefensa: 'Construir defensa',
  repararDefensa: 'Reparar defensa',
}

type Inicio = 'planificada' | 'empezar'

/** A9b: la obra y lo que hará al terminar. */
function DialogoObra(props: { dominioId: string; obra?: Obra; alCerrar: () => void }) {
  const { documento, catalogo, editar } = usePartida()
  const { obra } = props
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const efecto = obra?.efecto
  const [resultado, setResultado] = useState<EfectoObra['tipo']>(efecto?.tipo ?? 'crearEdificio')
  const [segundo, setSegundo] = useState(
    efecto === undefined
      ? ''
      : 'tipoId' in efecto
        ? efecto.tipoId
        : 'objetivoId' in efecto
          ? efecto.objetivoId
          : efecto.recursoId,
  )
  const [ampliacion, setAmpliacion] = useState(efecto?.tipo === 'ampliarAlmacen' ? String(efecto.valor) : '')
  const [nombre, setNombre] = useState(obra?.nombre ?? '')
  const [materiales, setMateriales] = useState(
    Object.entries(obra?.materiales ?? {}).map(([recursoId, n]) => ({ recursoId, cantidad: String(n) })),
  )
  const [coste, setCoste] = useState(valorDe(obra?.coste, eq))
  const [dias, setDias] = useState(String(obra?.diasTotales ?? 30))
  const [inicio, setInicio] = useState<Inicio>('empezar')
  const [fecha, setFecha] = useState<Fecha>(obra?.inicio ?? hoy)
  const [devolverCoste, setDevolverCoste] = useState(true)
  const [devolverMateriales, setDevolverMateriales] = useState(true)

  const edificios = documento.edificios.filter((e) => e.dominioId === props.dominioId)
  const defensas = documento.defensas.filter((d) => d.dominioId === props.dominioId)

  function construirEfecto(): EfectoObra {
    if (segundo === '') {
      throw new Error('Completa el resultado de la obra')
    }
    if (resultado === 'ampliarAlmacen') {
      return { tipo: resultado, recursoId: segundo, valor: decimalDe(ampliacion, 'Capacidad que gana', 0.01) }
    }
    return resultado === 'crearEdificio' || resultado === 'crearDefensa'
      ? { tipo: resultado, tipoId: segundo }
      : { tipo: resultado, objetivoId: segundo }
  }

  return (
    <DialogoFormulario
      titulo={obra === undefined ? 'Nueva obra' : 'Editar obra'}
      alCerrar={props.alCerrar}
      textoGuardar={obra !== undefined ? 'Guardar' : inicio === 'empezar' ? 'Empezar obra' : 'Guardar como planificada'}
      alGuardar={async () => {
        if (nombre.trim() === '') {
          throw new Error('Escribe un nombre')
        }
        const datos = {
          nombre: nombre.trim(),
          coste: coste.cantidad.trim() === '' ? { base: 0 } : importeDe(coste, eq, 0),
          materiales: Object.fromEntries(
            materiales.map((m) => [m.recursoId, decimalDe(m.cantidad, 'Cantidad de material', 0.01)]),
          ),
          diasTotales: enteroDe(dias, 'Duración en días', 1, 100000),
          efecto: construirEfecto(),
        }
        await editar((doc, sello) =>
          obra === undefined
            ? crearObra(doc, { dominioId: props.dominioId, ...datos }, inicio === 'empezar' ? fecha : undefined, sello, catalogo).estado
            : editarObra(doc, obra.id, datos, sello, catalogo),
        )
      }}
      eliminar={
        obra === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${obra.nombre}»?`,
              subtitulo:
                obra.estado === 'terminada'
                  ? 'Su efecto no se deshace'
                  : `Devolver el coste: ${devolverCoste ? 'sí' : 'no'} · materiales: ${devolverMateriales ? 'sí' : 'no'}`,
              resumen: [{ etiqueta: 'Coste', valor: formatearOro(obra.coste.base, eq) }],
              alEliminar: () =>
                editar((doc) => eliminarObra(doc, obra.id, { devolverCoste, devolverMateriales }, catalogo)),
            }
      }
    >
      <CampoOpcion
        etiqueta="Resultado"
        valor={resultado}
        opciones={Object.entries(RESULTADOS).map(([valor, texto]) => ({ valor, texto }))}
        alCambiar={(v) => {
          setResultado(v as EfectoObra['tipo'])
          setSegundo('')
        }}
      />
      {resultado === 'crearEdificio' && <CampoCatalogo lista="tiposEdificio" etiqueta="Tipo de edificio" valor={segundo} alCambiar={setSegundo} />}
      {resultado === 'crearDefensa' && <CampoCatalogo lista="tiposDefensa" etiqueta="Tipo de defensa" valor={segundo} alCambiar={setSegundo} />}
      {(resultado === 'mejorarEdificio' || resultado === 'repararEdificio') && (
        <CampoOpcion etiqueta="Edificio" valor={segundo} opciones={edificios.map((e) => ({ valor: e.id, texto: e.nombre }))} alCambiar={setSegundo} />
      )}
      {resultado === 'repararDefensa' && (
        <CampoOpcion etiqueta="Defensa" valor={segundo} opciones={defensas.map((d) => ({ valor: d.id, texto: d.nombre }))} alCambiar={setSegundo} />
      )}
      {resultado === 'ampliarAlmacen' && (
        <>
          <CampoRecurso valor={segundo} alCambiar={setSegundo} />
          <CampoTexto etiqueta="Capacidad que gana" modoTeclado="decimal" valor={ampliacion} alCambiar={setAmpliacion} />
        </>
      )}
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      {materiales.map((m, i) => (
        <div key={i}>
          <CampoRecurso etiqueta={`Material ${i + 1}`} valor={m.recursoId} alCambiar={(recursoId) => setMateriales(materiales.map((x, j) => (j === i ? { ...x, recursoId } : x)))} />
          <CampoTexto etiqueta={`Cantidad del material ${i + 1}`} modoTeclado="decimal" valor={m.cantidad} alCambiar={(cantidad) => setMateriales(materiales.map((x, j) => (j === i ? { ...x, cantidad } : x)))} />
          <Boton variante="fantasma" icono="x" alPulsar={() => setMateriales(materiales.filter((_, j) => j !== i))}>
            Quitar material
          </Boton>
        </div>
      ))}
      <div>
        <Boton variante="fantasma" icono="mas" alPulsar={() => setMateriales([...materiales, { recursoId: '', cantidad: '' }])}>
          Añadir material
        </Boton>
      </div>
      <CampoImporte etiqueta="Coste" valor={coste} alCambiar={setCoste} equivalencias={eq} />
      <CampoTexto etiqueta="Duración en días" modoTeclado="numeric" valor={dias} alCambiar={setDias} />
      {obra === undefined && (
        <>
          <Segmentos<Inicio>
            etiqueta="Inicio"
            opciones={[
              { valor: 'empezar', texto: 'Empezar obra' },
              { valor: 'planificada', texto: 'Planificada' },
            ]}
            valor={inicio}
            alCambiar={setInicio}
          />
          {inicio === 'empezar' && (
            <CampoFecha etiqueta="Fecha de inicio" valor={fecha} alCambiar={(f) => f !== null && setFecha(f)} hoy={hoy} edad={documento.partida.edad} />
          )}
        </>
      )}
      {obra !== undefined && obra.estado !== 'terminada' && (
        <>
          <Casilla etiqueta="Al eliminar, devolver el coste a la caja" marcada={devolverCoste} alCambiar={setDevolverCoste} />
          <Casilla etiqueta="Al eliminar, devolver los materiales al almacén" marcada={devolverMateriales} alCambiar={setDevolverMateriales} />
        </>
      )}
    </DialogoFormulario>
  )
}

/** A9: las obras por estado. */
export function Obras({ dominioId }: { dominioId: string }) {
  const { documento, catalogo, editar } = usePartida()
  const [abierto, setAbierto] = useState<{ obra?: Obra } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const suyas = documento.obras.filter((o) => o.dominioId === dominioId)
  const grupos = [
    { titulo: 'En curso', estado: 'enCurso' },
    { titulo: 'Programadas', estado: 'programada' },
    { titulo: 'Planificadas', estado: 'planificada' },
    { titulo: 'Terminadas', estado: 'terminada' },
  ] as const
  const intentar = (accion: Promise<void>): void => {
    setError(null)
    accion.catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }
  const resultadoDe = (o: Obra): string => {
    const e = o.efecto
    if (e.tipo === 'ampliarAlmacen') {
      return `${RESULTADOS[e.tipo]}: +${e.valor} de ${nombreDelRecurso(catalogo, e.recursoId).toLowerCase()}`
    }
    return 'tipoId' in e ? `${RESULTADOS[e.tipo]}: ${nombreDeOpcion(catalogo, e.tipoId)}` : RESULTADOS[e.tipo]
  }

  return (
    <>
      <div>
        <Boton variante="principal" icono="mas" alPulsar={() => setAbierto({})}>
          Nueva obra
        </Boton>
      </div>
      {error !== null && <Nota icono="alerta">{error}</Nota>}
      {suyas.length === 0 && <Nota>Nada en curso</Nota>}
      {grupos.map((g) => {
        const lista = suyas.filter((o) => o.estado === g.estado)
        return lista.length === 0 ? null : (
          <ListaRegistros
            key={g.estado}
            titulo={g.titulo}
            registros={lista}
            columnas={[{ titulo: 'Obra' }, { titulo: 'Coste y materiales' }, { titulo: 'Fechas' }, { titulo: 'Avance' }, { titulo: ' ', ancho: '170px' }]}
            nombreDe={(o) => o.nombre}
            fila={(o) => {
              const fin = finDeObra(o)
              return [
                `${o.nombre} · ${resultadoDe(o)}`,
                [formatearOro(o.coste.base, eq), ...Object.entries(o.materiales).map(([r, n]) => conUnidad(catalogo, r, n))].join(', '),
                o.inicio === undefined ? '—' : `${fechaCorta(o.inicio, hoy)}${fin === null ? '' : ` – ${fechaCorta(fin, hoy)}`}`,
                `${progresoDeObra(o, hoy).pct} %`,
                o.estado === 'planificada' ? (
                  <Boton key="a" variante="secundario" alPulsar={() => intentar(editar((doc, sello) => empezarObra(doc, o.id, hoy, sello, catalogo)))}>
                    Empezar hoy
                  </Boton>
                ) : o.estado === 'programada' ? (
                  <Boton key="a" variante="secundario" alPulsar={() => intentar(editar((doc, sello) => planificarObra(doc, o.id, sello)))}>
                    Dejar planificada
                  </Boton>
                ) : (
                  ''
                ),
              ]
            }}
            alEditar={(obra) => setAbierto({ obra })}
          />
        )
      })}
      {abierto !== null && <DialogoObra dominioId={dominioId} obra={abierto.obra} alCerrar={() => setAbierto(null)} />}
    </>
  )
}
