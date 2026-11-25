import { useState } from 'react'
import { frecuenciaInicial, proximaFecha, TEXTO_TIPO } from '../../dominio/calendario/formularioFrecuencia'
import type { Recurrencia } from '../../dominio/calendario/recurrencia'
import { formatearOro, formatearOroProrrateado } from '../../dominio/dinero/formato'
import { sumarAlMes } from '../../dominio/dinero/prorrateo'
import { eliminarTrabajador, eliminarUnidadGuarnicion } from '../../dominio/edicion/reglas'
import { crearRegistro, editarRegistro, quitarRegistro } from '../../dominio/edicion/simples'
import type { Defensa, ObjetoArmeria, Trabajador, UnidadGuarnicion } from '../../dominio/modelo/asentamiento'
import { buscarEn } from '../../dominio/texto/buscar'
import { Aviso } from '../comunes/Aviso'
import { CampoTexto } from '../comunes/Campo'
import { CampoFrecuencia } from '../comunes/CampoFrecuencia'
import { CampoImporte } from '../comunes/CampoImporte'
import { CabeceraPantalla } from '../comunes/Panel'
import { Segmentos } from '../comunes/Segmentos'
import { CampoOpcion, NINGUNO } from '../formulario/campos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { enteroDe, fechaCorta, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'
import { CampoCatalogo, ListaRegistros } from './comunes'
import { nombreDeOpcion } from './nombres'

/** «Próximo pago» y «Coste al mes» de una plantilla. */
function Cifras({ pagos }: { pagos: { base: number; recurrencia: Recurrencia }[] }) {
  const { documento } = usePartida()
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const fechas = pagos
    .map((p) => proximaFecha(p.recurrencia, hoy))
    .filter((f) => f !== null)
    .sort((a, b) => a.anio - b.anio || a.mes - b.mes || a.dia - b.dia)
  return (
    <div className={estilos.rejilla2}>
      <div className={estilos.tarjeta}>
        <span className={estilos.suave}>Próximo pago</span>
        <span className={estilos.cifra}>{fechas[0] === undefined ? '—' : fechaCorta(fechas[0], hoy)}</span>
      </div>
      <div className={estilos.tarjeta}>
        <span className={estilos.suave}>Coste al mes</span>
        <span className={estilos.cifra}>{formatearOroProrrateado(sumarAlMes(pagos), eq)}</span>
      </div>
    </div>
  )
}

function DialogoTrabajador(props: { dominioId: string; trabajador?: Trabajador; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { trabajador } = props
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const [oficio, setOficio] = useState(trabajador?.oficioId ?? '')
  const [numero, setNumero] = useState(String(trabajador?.numero ?? 1))
  const [salario, setSalario] = useState(valorDe(trabajador?.salario, eq))
  const [recurrencia, setRecurrencia] = useState<Recurrencia>(trabajador?.recurrencia ?? frecuenciaInicial('semanal', hoy))
  const [edificio, setEdificio] = useState(trabajador?.edificioId ?? NINGUNO)
  const edificios = documento.edificios.filter((e) => e.dominioId === props.dominioId)
  return (
    <DialogoFormulario
      titulo={trabajador === undefined ? 'Contratar trabajadores' : 'Editar trabajadores'}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        if (oficio === '') {
          throw new Error('Elige un oficio')
        }
        const datos = {
          dominioId: props.dominioId,
          oficioId: oficio,
          numero: enteroDe(numero, 'Número'),
          salario: importeDe(salario, eq, 0),
          recurrencia,
          edificioId: edificio === NINGUNO ? undefined : edificio,
        }
        await editar((doc, sello) =>
          trabajador === undefined
            ? crearRegistro(doc, 'trabajadores', datos, sello).estado
            : editarRegistro(doc, 'trabajadores', trabajador.id, datos, sello),
        )
      }}
      eliminar={
        trabajador === undefined
          ? undefined
          : {
              titulo: '¿Despedir a estos trabajadores?',
              subtitulo: `${trabajador.numero} trabajadores`,
              resumen: [{ etiqueta: 'Sus pagos pasados', valor: 'Se conservan' }],
              alEliminar: () => editar((doc) => eliminarTrabajador(doc, trabajador.id)),
            }
      }
    >
      <CampoCatalogo lista="oficios" etiqueta="Oficio" valor={oficio} alCambiar={setOficio} />
      <CampoTexto etiqueta="Número" modoTeclado="numeric" valor={numero} alCambiar={setNumero} />
      <CampoImporte etiqueta="Salario por trabajador" valor={salario} alCambiar={setSalario} equivalencias={eq} />
      <CampoFrecuencia etiqueta="Frecuencia" etiquetaFecha="Primer pago" valor={recurrencia} alCambiar={setRecurrencia} hoy={hoy} edad={documento.partida.edad} guardada={trabajador?.recurrencia} />
      <CampoOpcion
        etiqueta="Edificio"
        valor={edificio}
        opciones={[{ valor: NINGUNO, texto: 'Sin edificio' }, ...edificios.map((e) => ({ valor: e.id, texto: e.nombre }))]}
        alCambiar={setEdificio}
      />
    </DialogoFormulario>
  )
}

function Trabajadores({ dominioId }: { dominioId: string }) {
  const { documento, catalogo } = usePartida()
  const [abierto, setAbierto] = useState<{ trabajador?: Trabajador } | null>(null)
  const eq = documento.partida.equivalencias
  const suyos = documento.trabajadores.filter((t) => t.dominioId === dominioId)
  const edificios = documento.edificios.filter((e) => e.dominioId === dominioId)
  const puestos = edificios.flatMap((e) => {
    const asignados = suyos.filter((t) => t.edificioId === e.id).reduce((s, t) => s + t.numero, 0)
    const diferencia = asignados - e.trabajadoresNecesarios
    if (diferencia === 0) {
      return []
    }
    return [diferencia < 0 ? `${e.nombre}: faltan ${-diferencia}` : `${e.nombre}: sobran ${diferencia}`]
  })
  return (
    <>
      <Cifras pagos={suyos.map((t) => ({ base: t.numero * t.salario.base, recurrencia: t.recurrencia }))} />
      {puestos.map((texto) => (
        <Aviso key={texto} tono="oro" icono="alerta">
          {texto}
        </Aviso>
      ))}
      <ListaRegistros
        titulo="Trabajadores"
        textoAlta="Contratar"
        alAnadir={() => setAbierto({})}
        registros={suyos}
        columnas={[{ titulo: 'Oficio' }, { titulo: 'Número', derecha: true }, { titulo: 'Salario', derecha: true }, { titulo: 'Frecuencia' }, { titulo: 'Edificio' }]}
        nombreDe={(t) => nombreDeOpcion(catalogo, t.oficioId)}
        fila={(t) => [
          nombreDeOpcion(catalogo, t.oficioId),
          t.numero,
          formatearOro(t.salario.base, eq),
          TEXTO_TIPO[t.recurrencia.tipo],
          edificios.find((e) => e.id === t.edificioId)?.nombre ?? '—',
        ]}
        alEditar={(trabajador) => setAbierto({ trabajador })}
      />
      {abierto !== null && <DialogoTrabajador dominioId={dominioId} trabajador={abierto.trabajador} alCerrar={() => setAbierto(null)} />}
    </>
  )
}

function DialogoUnidad(props: { dominioId: string; unidad?: UnidadGuarnicion; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { unidad } = props
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const [nombre, setNombre] = useState(unidad?.nombre ?? '')
  const [tipo, setTipo] = useState(unidad?.tipoId ?? '')
  const [numero, setNumero] = useState(String(unidad?.numero ?? 1))
  const [soldada, setSoldada] = useState(valorDe(unidad?.soldada, eq))
  const [recurrencia, setRecurrencia] = useState<Recurrencia>(unidad?.recurrencia ?? frecuenciaInicial('semanal', hoy))
  return (
    <DialogoFormulario
      titulo={unidad === undefined ? 'Nueva unidad' : 'Editar unidad'}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        const datos = {
          dominioId: props.dominioId,
          tipoId: tipo,
          nombre: nombre.trim(),
          numero: enteroDe(numero, 'Número'),
          soldada: importeDe(soldada, eq, 0),
          recurrencia,
        }
        if (tipo === '') {
          throw new Error('Elige el tipo de unidad')
        }
        await editar((doc, sello) =>
          unidad === undefined
            ? crearRegistro(doc, 'unidadesGuarnicion', datos, sello).estado
            : editarRegistro(doc, 'unidadesGuarnicion', unidad.id, datos, sello),
        )
      }}
      eliminar={
        unidad === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${unidad.nombre}»?`,
              subtitulo: 'Unidad de guarnición',
              resumen: [{ etiqueta: 'Sus pagos pasados', valor: 'Se conservan' }],
              alEliminar: () => editar((doc) => eliminarUnidadGuarnicion(doc, unidad.id)),
            }
      }
    >
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      <CampoCatalogo lista="tiposUnidad" etiqueta="Tipo de unidad" valor={tipo} alCambiar={setTipo} />
      <CampoTexto etiqueta="Número de soldados" modoTeclado="numeric" valor={numero} alCambiar={setNumero} />
      <CampoImporte etiqueta="Soldada por soldado" valor={soldada} alCambiar={setSoldada} equivalencias={eq} />
      <CampoFrecuencia etiqueta="Frecuencia" etiquetaFecha="Primer pago" valor={recurrencia} alCambiar={setRecurrencia} hoy={hoy} edad={documento.partida.edad} guardada={unidad?.recurrencia} />
    </DialogoFormulario>
  )
}

const ESTADOS_DEFENSA: Record<Defensa['estado'], string> = { buena: 'Buena', daniada: 'Dañada', enRuinas: 'En ruinas' }

function DialogoDefensa(props: { dominioId: string; defensa?: Defensa; alCerrar: () => void }) {
  const { editar } = usePartida()
  const { defensa } = props
  const [nombre, setNombre] = useState(defensa?.nombre ?? '')
  const [tipo, setTipo] = useState(defensa?.tipoId ?? '')
  const [estado, setEstado] = useState<Defensa['estado']>(defensa?.estado ?? 'buena')
  return (
    <DialogoFormulario
      titulo={defensa === undefined ? 'Nueva defensa' : 'Editar defensa'}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        if (tipo === '') {
          throw new Error('Elige el tipo de defensa')
        }
        const datos = { dominioId: props.dominioId, tipoId: tipo, nombre: nombre.trim(), estado }
        await editar((doc, sello) =>
          defensa === undefined
            ? crearRegistro(doc, 'defensas', datos, sello).estado
            : editarRegistro(doc, 'defensas', defensa.id, datos, sello),
        )
      }}
      eliminar={
        defensa === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${defensa.nombre}»?`,
              subtitulo: 'Defensa',
              resumen: [],
              alEliminar: () =>
                editar((doc) => {
                  if (doc.obras.some((o) => o.efecto.tipo === 'repararDefensa' && o.efecto.objetivoId === defensa.id)) {
                    throw new Error('Una obra de reparación la tiene como objetivo')
                  }
                  return quitarRegistro(doc, 'defensas', defensa.id)
                }),
            }
      }
    >
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      <CampoCatalogo lista="tiposDefensa" etiqueta="Tipo de defensa" valor={tipo} alCambiar={setTipo} />
      <Segmentos<Defensa['estado']>
        etiqueta="Estado"
        opciones={(Object.keys(ESTADOS_DEFENSA) as Defensa['estado'][]).map((v) => ({ valor: v, texto: ESTADOS_DEFENSA[v] }))}
        valor={estado}
        alCambiar={setEstado}
      />
    </DialogoFormulario>
  )
}

function Guarnicion({ dominioId }: { dominioId: string }) {
  const { documento, catalogo } = usePartida()
  const [abierto, setAbierto] = useState<{ unidad?: UnidadGuarnicion } | { defensa?: Defensa } | null>(null)
  const eq = documento.partida.equivalencias
  const unidades = documento.unidadesGuarnicion.filter((u) => u.dominioId === dominioId)
  return (
    <>
      <Cifras pagos={unidades.map((u) => ({ base: u.numero * u.soldada.base, recurrencia: u.recurrencia }))} />
      <ListaRegistros
        titulo="Unidades"
        textoAlta="Añadir unidad"
        alAnadir={() => setAbierto({ unidad: undefined })}
        registros={unidades}
        columnas={[{ titulo: 'Unidad' }, { titulo: 'Tipo' }, { titulo: 'Soldados', derecha: true }, { titulo: 'Soldada', derecha: true }, { titulo: 'Frecuencia' }]}
        nombreDe={(u) => u.nombre}
        fila={(u) => [u.nombre, nombreDeOpcion(catalogo, u.tipoId), u.numero, formatearOro(u.soldada.base, eq), TEXTO_TIPO[u.recurrencia.tipo]]}
        alEditar={(unidad) => setAbierto({ unidad })}
      />
      <ListaRegistros
        titulo="Defensas"
        textoAlta="Añadir defensa"
        alAnadir={() => setAbierto({ defensa: undefined })}
        registros={documento.defensas.filter((d) => d.dominioId === dominioId)}
        columnas={[{ titulo: 'Defensa' }, { titulo: 'Tipo' }, { titulo: 'Estado' }]}
        nombreDe={(d) => d.nombre}
        fila={(d) => [d.nombre, nombreDeOpcion(catalogo, d.tipoId), ESTADOS_DEFENSA[d.estado]]}
        alEditar={(defensa) => setAbierto({ defensa })}
      />
      {abierto !== null && 'unidad' in abierto && <DialogoUnidad dominioId={dominioId} unidad={abierto.unidad} alCerrar={() => setAbierto(null)} />}
      {abierto !== null && 'defensa' in abierto && <DialogoDefensa dominioId={dominioId} defensa={abierto.defensa} alCerrar={() => setAbierto(null)} />}
    </>
  )
}

function DialogoArma(props: { dominioId: string; objeto?: ObjetoArmeria; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { objeto } = props
  const eq = documento.partida.equivalencias
  const [nombre, setNombre] = useState(objeto?.nombre ?? '')
  const [cantidad, setCantidad] = useState(String(objeto?.cantidad ?? 1))
  const [valor, setValor] = useState(valorDe(objeto?.valorUnitario, eq))
  return (
    <DialogoFormulario
      titulo={objeto === undefined ? 'Añadir a la armería' : 'Editar'}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        const datos = {
          dominioId: props.dominioId,
          nombre: nombre.trim(),
          cantidad: enteroDe(cantidad, 'Cantidad'),
          valorUnitario: importeDe(valor, eq, 0),
        }
        await editar((doc, sello) =>
          objeto === undefined
            ? crearRegistro(doc, 'armeria', datos, sello).estado
            : editarRegistro(doc, 'armeria', objeto.id, datos, sello),
        )
      }}
      eliminar={
        objeto === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${objeto.nombre}»?`,
              subtitulo: 'Armería',
              resumen: [],
              alEliminar: () => editar((doc) => quitarRegistro(doc, 'armeria', objeto.id)),
            }
      }
    >
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      <CampoTexto etiqueta="Cantidad" modoTeclado="numeric" valor={cantidad} alCambiar={setCantidad} />
      <CampoImporte etiqueta="Valor por unidad" valor={valor} alCambiar={setValor} equivalencias={eq} />
    </DialogoFormulario>
  )
}

function Armeria({ dominioId }: { dominioId: string }) {
  const { documento } = usePartida()
  const [abierto, setAbierto] = useState<{ objeto?: ObjetoArmeria } | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const eq = documento.partida.equivalencias
  const suyos = documento.armeria.filter((o) => o.dominioId === dominioId)
  const total = suyos.reduce((s, o) => s + o.cantidad * o.valorUnitario.base, 0)
  return (
    <>
      <CampoTexto etiqueta="Buscar" valor={busqueda} alCambiar={setBusqueda} />
      <ListaRegistros
        titulo="Armería"
        alAnadir={() => setAbierto({})}
        registros={suyos.filter((o) => busqueda.trim() === '' || buscarEn(o.nombre, busqueda) !== null)}
        columnas={[{ titulo: 'Nombre' }, { titulo: 'Cantidad', derecha: true }, { titulo: 'Valor', derecha: true }, { titulo: 'Valor total', derecha: true }]}
        nombreDe={(o) => o.nombre}
        fila={(o) => [o.nombre, o.cantidad, formatearOro(o.valorUnitario.base, eq), formatearOro(o.cantidad * o.valorUnitario.base, eq)]}
        alEditar={(objeto) => setAbierto({ objeto })}
        pie={<p className={estilos.suave}>Valor total de la armería: {formatearOro(total, eq)}</p>}
      />
      {abierto !== null && <DialogoArma dominioId={dominioId} objeto={abierto.objeto} alCerrar={() => setAbierto(null)} />}
    </>
  )
}

type Pestana = 'trabajadores' | 'guarnicion' | 'armeria'

/** A5, A6 y A6b. */
export function Personal({ dominioId }: { dominioId: string }) {
  const [pestana, setPestana] = useState<Pestana>('trabajadores')
  return (
    <>
      <CabeceraPantalla titulo="Personal" />
      <Segmentos<Pestana>
        etiqueta="Personal"
        etiquetaOculta
        opciones={[
          { valor: 'trabajadores', texto: 'Trabajadores' },
          { valor: 'guarnicion', texto: 'Guarnición' },
          { valor: 'armeria', texto: 'Armería' },
        ]}
        valor={pestana}
        alCambiar={setPestana}
      />
      {pestana === 'trabajadores' && <Trabajadores dominioId={dominioId} />}
      {pestana === 'guarnicion' && <Guarnicion dominioId={dominioId} />}
      {pestana === 'armeria' && <Armeria dominioId={dominioId} />}
    </>
  )
}
