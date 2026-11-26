import { useState } from 'react'
import type { Fecha } from '../../dominio/calendario/fecha'
import { formatearOro } from '../../dominio/dinero/formato'
import {
  conteoDeIntentos,
  crearHechizo,
  editarHechizo,
  editarIntento,
  eliminarHechizo,
  eliminarIntento,
  registrarIntento,
} from '../../dominio/edicion/hechizos'
import { ubicacionPorNombre } from '../../dominio/edicion/listas'
import { crearPergamino, editarPergamino, eliminarPergamino } from '../../dominio/edicion/pergaminos'
import type { Hechizo, IntentoAprendizaje, Pergamino } from '../../dominio/modelo/personaje'
import { Boton, BotonIcono, Enlace } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CampoFecha } from '../comunes/CampoFecha'
import { CampoImporte } from '../comunes/CampoImporte'
import { Casilla } from '../comunes/Casilla'
import type { ValorImporte } from '../comunes/leerImporte'
import { CabeceraPantalla, Nota, Panel } from '../comunes/Panel'
import { Segmentos } from '../comunes/Segmentos'
import { ListaPares, Tabla } from '../comunes/Tabla'
import {
  CampoCuenta,
  CampoOpcion,
  CampoUbicacion,
  NINGUNO,
  NUEVA_UBICACION,
} from '../formulario/campos'
import { claveDeUbicacion, ubicacionDeClave } from '../formulario/ubicaciones'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { conteoTexto, enteroDe, fechaCorta, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'

type Reino = NonNullable<Hechizo['reino']>
const REINOS: Record<Reino, string> = {
  esencia: 'Esencia',
  canalizacion: 'Canalización',
  mentalismo: 'Mentalismo',
  hibrido: 'Híbrido',
}

/** «Sendas del bosque · Canalización · nivel 2». */
const detalleDe = (h: Hechizo): string =>
  [h.lista, h.reino === undefined ? undefined : REINOS[h.reino], h.nivel === undefined ? undefined : `nivel ${h.nivel}`]
    .filter(Boolean)
    .join(' · ')

function DialogoHechizo(props: { dominioId: string; hechizo?: Hechizo; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { hechizo } = props
  const hoy = documento.partida.fechaActual
  const [nombre, setNombre] = useState(hechizo?.nombre ?? '')
  const [lista, setLista] = useState(hechizo?.lista ?? '')
  const [reino, setReino] = useState<Reino | 'sin'>(hechizo?.reino ?? 'sin')
  const [nivel, setNivel] = useState(hechizo?.nivel === undefined ? '' : String(hechizo.nivel))
  const [estado, setEstado] = useState<Hechizo['estado']>(hechizo?.estado ?? 'enEstudio')
  const [aprendidoEl, setAprendidoEl] = useState<Fecha | null>(hechizo?.aprendidoEl ?? null)
  const [notas, setNotas] = useState(hechizo?.notas ?? '')

  async function guardar(): Promise<void> {
    const datos = {
      nombre,
      lista: lista.trim() === '' ? undefined : lista.trim(),
      reino: reino === 'sin' ? undefined : reino,
      nivel: nivel.trim() === '' ? undefined : enteroDe(nivel, 'Nivel', 1, 50),
      estado,
      aprendidoEl: aprendidoEl ?? undefined,
      notas: notas.trim() === '' ? undefined : notas.trim(),
    }
    await editar((doc, sello) =>
      hechizo === undefined
        ? crearHechizo(doc, { dominioId: props.dominioId, ...datos }, sello).estado
        : editarHechizo(doc, hechizo.id, datos, sello),
    )
  }

  return (
    <DialogoFormulario
      titulo={hechizo === undefined ? 'Añadir hechizo' : 'Editar hechizo'}
      alCerrar={props.alCerrar}
      alGuardar={guardar}
      eliminar={
        hechizo === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${hechizo.nombre}»?`,
              subtitulo: 'Hechizo',
              resumen: [
                { etiqueta: 'Sus intentos', valor: 'Se borran' },
                { etiqueta: 'Sus pergaminos', valor: 'Se conservan, sin hechizo' },
              ],
              alEliminar: () => editar((doc) => eliminarHechizo(doc, hechizo.id)),
            }
      }
    >
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      <CampoTexto etiqueta="Lista (opcional)" maximo={60} valor={lista} alCambiar={setLista} />
      <Segmentos<Reino | 'sin'>
        etiqueta="Reino"
        opciones={[
          { valor: 'sin', texto: 'Sin reino' },
          ...(Object.keys(REINOS) as Reino[]).map((r) => ({ valor: r, texto: REINOS[r] })),
        ]}
        valor={reino}
        alCambiar={setReino}
      />
      <CampoTexto etiqueta="Nivel (opcional)" modoTeclado="numeric" valor={nivel} alCambiar={setNivel} />
      <Segmentos<Hechizo['estado']>
        etiqueta="Estado"
        opciones={[
          { valor: 'enEstudio', texto: 'En estudio' },
          { valor: 'aprendido', texto: 'Aprendido' },
        ]}
        valor={estado}
        alCambiar={setEstado}
      />
      {estado === 'aprendido' && (
        <CampoFecha etiqueta="Aprendido el" valor={aprendidoEl} alCambiar={setAprendidoEl} hoy={hoy} edad={documento.partida.edad} maximo={hoy} />
      )}
      <CampoTexto etiqueta="Notas" maximo={1000} valor={notas} alCambiar={setNotas} />
    </DialogoFormulario>
  )
}

/** J8: registrar o cambiar un intento. */
export function DialogoIntento({ intento, alCerrar }: { intento?: IntentoAprendizaje; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const hoy = documento.partida.fechaActual
  const elegibles = documento.hechizos.filter((h) => h.estado === 'enEstudio' || h.id === intento?.hechizoId)
  const [fecha, setFecha] = useState(intento?.fecha ?? hoy)
  const [hechizoId, setHechizo] = useState(intento?.hechizoId ?? elegibles[0]?.id ?? '')
  const [resultado, setResultado] = useState<IntentoAprendizaje['resultado']>(intento?.resultado ?? 'bueno')
  const [pergaminoId, setPergamino] = useState(intento?.pergaminoId ?? NINGUNO)
  const [consume, setConsume] = useState(intento?.pergaminoConsumido ?? false)
  const [notas, setNotas] = useState(intento?.notas ?? '')
  const conteo = conteoDeIntentos(documento, hechizoId)
  const pergaminos = documento.pergaminos.filter((p) => p.estado === 'poseido' || p.id === intento?.pergaminoId)

  return (
    <DialogoFormulario
      titulo={intento === undefined ? 'Registrar intento' : 'Editar intento'}
      subtitulo={hechizoId === '' ? undefined : `${conteo.buenos} buenos · ${conteo.malos} malos`}
      alCerrar={alCerrar}
      alGuardar={async () => {
        if (hechizoId === '') {
          throw new Error('Elige un hechizo')
        }
        const datos = {
          hechizoId,
          fecha,
          resultado,
          pergaminoId: pergaminoId === NINGUNO ? undefined : pergaminoId,
          pergaminoConsumido: consume && pergaminoId !== NINGUNO,
          notas: notas.trim() === '' ? undefined : notas.trim(),
        }
        await editar((doc, sello) =>
          intento === undefined ? registrarIntento(doc, datos, sello).estado : editarIntento(doc, intento.id, datos, sello),
        )
      }}
      eliminar={
        intento === undefined
          ? undefined
          : {
              titulo: '¿Eliminar el intento?',
              subtitulo: fechaCorta(intento.fecha, hoy),
              resumen: [
                { etiqueta: 'Pergamino consumido', valor: intento.pergaminoConsumido ? 'Vuelve a «poseído»' : 'Ninguno' },
              ],
              alEliminar: () => editar((doc, sello) => eliminarIntento(doc, intento.id, sello)),
            }
      }
    >
      <CampoFecha etiqueta="Fecha" valor={fecha} alCambiar={(f) => f !== null && setFecha(f)} hoy={hoy} edad={documento.partida.edad} maximo={hoy} />
      <CampoOpcion etiqueta="Hechizo" valor={hechizoId} opciones={elegibles.map((h) => ({ valor: h.id, texto: h.nombre }))} alCambiar={setHechizo} singular="hechizo" plural="hechizos" />
      <Segmentos<IntentoAprendizaje['resultado']>
        etiqueta="Resultado"
        opciones={[
          { valor: 'bueno', texto: 'Bueno' },
          { valor: 'malo', texto: 'Malo' },
        ]}
        valor={resultado}
        alCambiar={setResultado}
      />
      <CampoOpcion
        etiqueta="Pergamino usado"
        valor={pergaminoId}
        opciones={[{ valor: NINGUNO, texto: 'Ninguno' }, ...pergaminos.map((p) => ({ valor: p.id, texto: p.nombre }))]}
        alCambiar={setPergamino}
      />
      <Casilla etiqueta="El pergamino se consume" marcada={consume && pergaminoId !== NINGUNO} alCambiar={setConsume} desactivada={pergaminoId === NINGUNO} />
      <CampoTexto etiqueta="Notas" maximo={1000} valor={notas} alCambiar={setNotas} />
      <Nota>Bueno o malo solo suma al conteo. «Aprendido» lo marcas en el hechizo cuando lo decida el máster.</Nota>
    </DialogoFormulario>
  )
}

function DialogoPergamino(props: { dominioId: string; pergamino?: Pergamino; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { pergamino } = props
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const objeto = documento.objetos.find((o) => o.id === pergamino?.objetoInventarioId)
  const compraAnterior = documento.movimientos.find((m) => m.id === pergamino?.movimientoCompraId)
  const [hechizoId, setHechizo] = useState(pergamino?.hechizoId ?? NINGUNO)
  const [nombre, setNombre] = useState(pergamino?.nombre ?? '')
  const [nivel, setNivel] = useState(pergamino?.nivel === undefined ? '' : String(pergamino.nivel))
  const [estado, setEstado] = useState<Pergamino['estado']>(pergamino?.estado ?? 'poseido')
  const [valor, setValor] = useState(valorDe(objeto?.valorUnitario, eq))
  const [ubicacion, setUbicacion] = useState(objeto === undefined ? 'encima' : claveDeUbicacion(objeto.ubicacion))
  const [nueva, setNueva] = useState('')
  const [comprado, setComprado] = useState(compraAnterior !== undefined)
  // Vacío en una compra nueva: lo que pagas se propone igual al valor, pero se escribe aparte.
  const [pagado, setPagado] = useState<ValorImporte | null>(
    compraAnterior === undefined
      ? null
      : valorDe({ ...compraAnterior.importe, base: Math.abs(compraAnterior.importe.base) }, eq),
  )
  const [cuenta, setCuenta] = useState(compraAnterior?.dominioId ?? props.dominioId)
  const [fecha, setFecha] = useState(compraAnterior?.fecha ?? hoy)
  const aMano = estado === 'poseido' || estado === 'perdido'

  async function guardar(): Promise<void> {
    const importe = importeDe(valor, eq, 0)
    const nivelNumero = nivel.trim() === '' ? undefined : enteroDe(nivel, 'Nivel', 1, 50)
    await editar((doc, sello) => {
      let base = doc
      let clave = ubicacion
      if (clave === NUEVA_UBICACION) {
        const creada = ubicacionPorNombre(base, nueva, sello)
        base = creada.estado
        clave = `propia|${creada.id}`
      }
      const datos = {
        hechizoId: hechizoId === NINGUNO ? undefined : hechizoId,
        nombre,
        nivel: nivelNumero,
        valor: importe,
        ubicacion: ubicacionDeClave(clave),
        compra: comprado
          ? { cuentaId: cuenta, fecha, precio: pagado === null ? importe : importeDe(pagado, eq, 0) }
          : undefined,
      }
      if (pergamino === undefined) {
        const aCrear = { ...datos, dominioId: props.dominioId, estado: estado === 'perdido' ? ('perdido' as const) : ('poseido' as const) }
        return crearPergamino(base, aCrear, sello).estado
      }
      return editarPergamino(base, pergamino.id, { ...datos, estado }, sello)
    })
  }

  return (
    <DialogoFormulario
      titulo={pergamino === undefined ? 'Añadir pergamino' : 'Editar pergamino'}
      alCerrar={props.alCerrar}
      alGuardar={guardar}
      eliminar={
        pergamino === undefined
          ? undefined
          : {
              titulo: `¿Eliminar el pergamino «${pergamino.nombre}»?`,
              subtitulo: 'Pergamino',
              resumen: [{ etiqueta: 'Su objeto y su compra', valor: 'Se borran' }],
              alEliminar: () => editar((doc) => eliminarPergamino(doc, pergamino.id)),
            }
      }
    >
      <CampoOpcion
        etiqueta="Hechizo (opcional)"
        valor={hechizoId}
        opciones={[{ valor: NINGUNO, texto: 'Ninguno' }, ...documento.hechizos.map((h) => ({ valor: h.id, texto: h.nombre }))]}
        alCambiar={setHechizo}
      />
      {hechizoId === NINGUNO && <CampoTexto etiqueta="Nombre del pergamino" maximo={60} valor={nombre} alCambiar={setNombre} />}
      <CampoTexto etiqueta="Nivel (opcional)" modoTeclado="numeric" valor={nivel} alCambiar={setNivel} />
      {aMano ? (
        <Segmentos<Pergamino['estado']>
          etiqueta="Estado"
          opciones={[
            { valor: 'poseido', texto: 'Poseído' },
            { valor: 'perdido', texto: 'Perdido' },
          ]}
          valor={estado}
          alCambiar={setEstado}
        />
      ) : (
        <Nota>Está {estado === 'consumido' ? 'consumido' : 'vendido'}.</Nota>
      )}
      <CampoImporte etiqueta="Valor de mercado" valor={valor} alCambiar={setValor} equivalencias={eq} />
      <CampoUbicacion valor={ubicacion} alCambiar={setUbicacion} nombreNueva={nueva} alCambiarNombre={setNueva} />
      <Casilla etiqueta="Lo he comprado" marcada={comprado} alCambiar={setComprado} />
      {comprado && (
        <>
          <CampoImporte
            etiqueta="Precio pagado"
            ayuda="Vacío: has pagado su valor de mercado"
            valor={pagado ?? { cantidad: '', moneda: valor.moneda }}
            alCambiar={(v) => setPagado(v.cantidad.trim() === '' ? null : v)}
            equivalencias={eq}
          />
          <CampoCuenta etiqueta="Sale de" valor={cuenta} alCambiar={setCuenta} />
          <CampoFecha etiqueta="Fecha de la compra" valor={fecha} alCambiar={(f) => f !== null && setFecha(f)} hoy={hoy} edad={documento.partida.edad} maximo={hoy} />
        </>
      )}
    </DialogoFormulario>
  )
}

type Abierto =
  | { tipo: 'hechizo'; hechizo?: Hechizo }
  | { tipo: 'intento'; intento?: IntentoAprendizaje }
  | { tipo: 'pergamino'; pergamino?: Pergamino }

/** J7: hechizos, historial de intentos y pergaminos. */
export function Hechizos({ dominioId }: { dominioId: string }) {
  const { documento, navegar } = usePartida()
  const [abierto, setAbierto] = useState<Abierto | null>(null)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const hechizos = documento.hechizos.filter((h) => h.dominioId === dominioId)
  const intentos = documento.intentos
    .filter((i) => hechizos.some((h) => h.id === i.hechizoId))
    .slice()
    .reverse()
  const pergaminos = documento.pergaminos.filter((p) => p.dominioId === dominioId)
  const enEstudio = hechizos.filter((h) => h.estado === 'enEstudio').length

  return (
    <>
      <CabeceraPantalla
        titulo="Estudio de hechizos"
        subtitulo={`${enEstudio} en estudio · ${hechizos.length - enEstudio} ${hechizos.length - enEstudio === 1 ? 'aprendido' : 'aprendidos'}`}
        acciones={
          <span className={estilos.fila}>
            <Boton variante="secundario" icono="mas" alPulsar={() => setAbierto({ tipo: 'hechizo' })}>
              Añadir hechizo
            </Boton>
            <Boton variante="principal" alPulsar={() => setAbierto({ tipo: 'intento' })}>
              Registrar intento
            </Boton>
          </span>
        }
      />
      <Panel titulo="Hechizos">
        {hechizos.length === 0 ? (
          <Nota>Todavía no hay hechizos</Nota>
        ) : (
          <Tabla
            etiqueta="Hechizos"
            columnas={[{ titulo: 'Hechizo' }, { titulo: 'Estado' }, { titulo: 'Intentos' }, { titulo: 'Último' }, { titulo: ' ', ancho: '56px' }]}
            filas={hechizos.map((h) => {
              const conteo = conteoDeIntentos(documento, h.id)
              return [
                <span key="n">
                  {h.nombre}
                  <span className={estilos.suave}> {detalleDe(h)}</span>
                </span>,
                h.aprendidoEl === undefined ? 'En estudio' : `Aprendido el ${fechaCorta(h.aprendidoEl, hoy)}`,
                conteoTexto(conteo.buenos, conteo.malos),
                conteo.ultimo === undefined ? '—' : fechaCorta(conteo.ultimo, hoy),
                <BotonIcono key="e" icono="editar" variante="fantasma" etiqueta={`Editar ${h.nombre}`} alPulsar={() => setAbierto({ tipo: 'hechizo', hechizo: h })} />,
              ]
            })}
          />
        )}
      </Panel>
      <div className={estilos.rejilla2}>
        <Panel titulo="Historial de intentos">
          {intentos.length === 0 ? (
            <Nota>Sin intentos</Nota>
          ) : (
            <ListaPares
              filas={intentos.map((i) => ({
                etiqueta: `${fechaCorta(i.fecha, hoy)} · ${hechizos.find((h) => h.id === i.hechizoId)?.nombre ?? ''}`,
                sub: [
                  i.resultado,
                  i.pergaminoConsumido ? 'con su pergamino, que se consumió' : undefined,
                  i.pergaminoEliminado ? 'con un pergamino eliminado' : undefined,
                ]
                  .filter(Boolean)
                  .join(' · '),
                valor: <BotonIcono icono="editar" variante="fantasma" etiqueta={`Editar el intento del ${fechaCorta(i.fecha, hoy)}`} alPulsar={() => setAbierto({ tipo: 'intento', intento: i })} />,
              }))}
            />
          )}
        </Panel>
        <Panel
          titulo="Pergaminos"
          accion={
            <Boton variante="secundario" icono="mas" alPulsar={() => setAbierto({ tipo: 'pergamino' })}>
              Añadir
            </Boton>
          }
        >
          {pergaminos.length === 0 ? (
            <Nota>No hay pergaminos</Nota>
          ) : (
            <ListaPares
              filas={pergaminos.map((p) => {
                const hechizo = documento.hechizos.find((h) => h.id === p.hechizoId)
                const objeto = documento.objetos.find((o) => o.id === p.objetoInventarioId)
                return {
                  etiqueta: p.nombre,
                  sub: [
                    p.estado === 'poseido' ? 'poseído' : p.estado,
                    hechizo?.reino === undefined ? undefined : REINOS[hechizo.reino],
                    (p.nivel ?? hechizo?.nivel) === undefined ? undefined : `nivel ${p.nivel ?? hechizo?.nivel}`,
                    p.consumidoEl === undefined
                      ? objeto === undefined
                        ? undefined
                        : formatearOro(objeto.valorUnitario.base, eq)
                      : fechaCorta(p.consumidoEl, hoy),
                  ]
                    .filter(Boolean)
                    .join(' · '),
                  valor: <BotonIcono icono="editar" variante="fantasma" etiqueta={`Editar el pergamino ${p.nombre}`} alPulsar={() => setAbierto({ tipo: 'pergamino', pergamino: p })} />,
                }
              })}
            />
          )}
          <Enlace alPulsar={() => navegar({ tipo: 'dominio', dominioId, seccion: 'inventario' })}>Ver en el inventario</Enlace>
        </Panel>
      </div>
      <Nota>Puedes estudiar varios hechizos a la vez. La app no cuenta días: cada intento guarda su fecha.</Nota>
      {abierto?.tipo === 'hechizo' && <DialogoHechizo dominioId={dominioId} hechizo={abierto.hechizo} alCerrar={() => setAbierto(null)} />}
      {abierto?.tipo === 'intento' && <DialogoIntento intento={abierto.intento} alCerrar={() => setAbierto(null)} />}
      {abierto?.tipo === 'pergamino' && (
        <DialogoPergamino dominioId={dominioId} pergamino={abierto.pergamino} alCerrar={() => setAbierto(null)} />
      )}
    </>
  )
}
