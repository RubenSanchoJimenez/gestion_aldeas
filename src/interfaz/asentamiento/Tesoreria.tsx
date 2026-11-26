import { useState } from 'react'
import { frecuenciaInicial, TEXTO_TIPO } from '../../dominio/calendario/formularioFrecuencia'
import type { Recurrencia } from '../../dominio/calendario/recurrencia'
import { NOMBRES_MES } from '../../dominio/calendario/formatoFecha'
import { conMayuscula } from '../../dominio/calendario/textosFecha'
import { balanceMensual } from '../../dominio/dinero/balance'
import { formatearOro, formatearOroProrrateado } from '../../dominio/dinero/formato'
import { personaPorNombre } from '../../dominio/edicion/listas'
import {
  altaDeLocal,
  anotarProduccion,
  bloqueoAlEliminarTipoLocal,
  cambiarEstadoDeLocal,
  eliminarLocalComercial,
  eliminarTipoLocal,
  mesesParaAnotar,
  quitarProduccion,
} from '../../dominio/edicion/locales'
import { eliminarImpuestoRenta } from '../../dominio/edicion/reglas'
import { crearRegistro, editarRegistro } from '../../dominio/edicion/simples'
import { estadoVigenteDelLocal, impuestoDeLocal, produccionDelMes, type EstadoLocal } from '../../dominio/locales/impuesto'
import type { ImpuestoRenta, LocalComercial, TipoLocal } from '../../dominio/modelo/asentamiento'
import { Boton } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CampoFrecuencia } from '../comunes/CampoFrecuencia'
import { CampoImporte } from '../comunes/CampoImporte'
import { CabeceraPantalla, Nota } from '../comunes/Panel'
import { Segmentos } from '../comunes/Segmentos'
import { Deudas } from '../dominio/Deudas'
import { Libro } from '../dominio/Libro'
import { CampoCategoria, CampoOpcion, CampoPersona, NINGUNO } from '../formulario/campos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { decimalDe, enteroDe, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'
import { ListaRegistros } from './comunes'

function DialogoImpuesto(props: {
  dominioId: string
  sentido: ImpuestoRenta['sentido']
  regla?: ImpuestoRenta
  alCerrar: () => void
}) {
  const { documento, editar } = usePartida()
  const { regla, sentido } = props
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const [concepto, setConcepto] = useState(regla?.concepto ?? '')
  const [base, setBase] = useState<ImpuestoRenta['base']>(regla?.base ?? 'fija')
  const [importe, setImporte] = useState(valorDe(regla?.importe, eq))
  const [categoria, setCategoria] = useState(regla?.categoriaId ?? (sentido === 'ingreso' ? 'cat.impuestos' : 'cat.tributos'))
  const [recurrencia, setRecurrencia] = useState<Recurrencia>(regla?.recurrencia ?? frecuenciaInicial('mensual', hoy))
  const [destinatario, setDestinatario] = useState(documento.personas.find((p) => p.id === regla?.destinatarioId)?.nombre ?? '')

  return (
    <DialogoFormulario
      titulo={regla === undefined ? (sentido === 'ingreso' ? 'Añadir ingreso' : 'Añadir tributo') : 'Editar'}
      subtitulo={regla === undefined ? undefined : 'Cambia esta y las próximas ocurrencias'}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        const total = importeDe(importe, eq)
        await editar((doc, sello) => {
          let estado = doc
          let destinatarioId: string | undefined
          if (sentido === 'tributo' && destinatario.trim() !== '') {
            const persona = personaPorNombre(estado, destinatario, sello)
            estado = persona.estado
            destinatarioId = persona.id
          }
          const datos = {
            dominioId: props.dominioId,
            sentido,
            concepto: concepto.trim(),
            base,
            importe: total,
            categoriaId: categoria,
            recurrencia,
            destinatarioId,
            edificioId: regla?.edificioId,
          }
          return regla === undefined
            ? crearRegistro(estado, 'impuestosRentas', datos, sello).estado
            : editarRegistro(estado, 'impuestosRentas', regla.id, datos, sello)
        })
      }}
      eliminar={
        regla === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${regla.concepto}»?`,
              subtitulo: 'Impuesto o renta',
              resumen: [{ etiqueta: 'Sus movimientos pasados', valor: 'Se conservan' }],
              alEliminar: () => editar((doc) => eliminarImpuestoRenta(doc, regla.id)),
            }
      }
    >
      <CampoTexto etiqueta="Concepto" maximo={120} valor={concepto} alCambiar={setConcepto} />
      <Segmentos<ImpuestoRenta['base']>
        etiqueta="Base"
        opciones={[
          { valor: 'fija', texto: 'Fija' },
          { valor: 'porHabitante', texto: 'Por habitante' },
        ]}
        valor={base}
        alCambiar={setBase}
      />
      <CampoImporte etiqueta="Importe" valor={importe} alCambiar={setImporte} equivalencias={eq} />
      <CampoCategoria valor={categoria} alCambiar={setCategoria} />
      {sentido === 'tributo' && <CampoPersona etiqueta="Destinatario (opcional)" valor={destinatario} alCambiar={setDestinatario} />}
      <CampoFrecuencia etiqueta="Frecuencia" etiquetaFecha={sentido === 'ingreso' ? 'Primer cobro' : 'Primer pago'} valor={recurrencia} alCambiar={setRecurrencia} hoy={hoy} edad={documento.partida.edad} guardada={regla?.recurrencia} />
    </DialogoFormulario>
  )
}

function Impuestos({ dominioId }: { dominioId: string }) {
  const { documento } = usePartida()
  const [abierto, setAbierto] = useState<{ sentido: ImpuestoRenta['sentido']; regla?: ImpuestoRenta } | null>(null)
  const eq = documento.partida.equivalencias
  const balance = balanceMensual(documento, dominioId)
  return (
    <>
      {(['ingreso', 'tributo'] as const).map((sentido) => (
        <ListaRegistros
          key={sentido}
          titulo={sentido === 'ingreso' ? 'Ingresos' : 'Tributos'}
          textoAlta={sentido === 'ingreso' ? 'Añadir ingreso' : 'Añadir tributo'}
          alAnadir={() => setAbierto({ sentido })}
          registros={documento.impuestosRentas.filter((r) => r.dominioId === dominioId && r.sentido === sentido)}
          columnas={[{ titulo: 'Concepto' }, { titulo: 'Base' }, { titulo: 'Frecuencia' }, { titulo: 'Importe', derecha: true }]}
          nombreDe={(r) => r.concepto}
          fila={(r) => [
            r.concepto,
            r.base === 'fija' ? 'Fija' : 'Por habitante',
            TEXTO_TIPO[r.recurrencia.tipo],
            formatearOro(r.importe.base, eq),
          ]}
          alEditar={(regla) => setAbierto({ sentido, regla })}
          pie={
            <p className={estilos.suave}>
              {sentido === 'ingreso'
                ? `+${formatearOroProrrateado(balance.entran, eq)} al mes, con los locales comerciales`
                : `−${formatearOroProrrateado(balance.tributos, eq)} al mes`}
            </p>
          }
        />
      ))}
      <Nota>
        Resultado fiscal: {formatearOroProrrateado(balance.resultadoFiscal, eq, { signo: true })} al mes (ingresos menos
        tributos, sin salarios ni guarnición).
      </Nota>
      {abierto !== null && (
        <DialogoImpuesto dominioId={dominioId} sentido={abierto.sentido} regla={abierto.regla} alCerrar={() => setAbierto(null)} />
      )}
    </>
  )
}

function DialogoTipoLocal(props: { dominioId: string; tipo?: TipoLocal; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { tipo } = props
  const eq = documento.partida.equivalencias
  const [nombre, setNombre] = useState(tipo?.nombre ?? '')
  const [pct, setPct] = useState(String(tipo?.pct ?? 5).replace('.', ','))
  const [minimo, setMinimo] = useState(valorDe(tipo?.minimo, eq))
  const [dia, setDia] = useState(String(tipo?.diaCobro ?? 1))
  return (
    <DialogoFormulario
      titulo={tipo === undefined ? 'Nuevo tipo de local' : 'Editar tipo de local'}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        const datos = {
          dominioId: props.dominioId,
          nombre: nombre.trim(),
          pct: decimalDe(pct, 'Impuesto %', 0, 100),
          minimo: minimo.cantidad.trim() === '' ? { base: 0 } : importeDe(minimo, eq, 0),
          diaCobro: enteroDe(dia, 'Día de cobro', 1, 31),
        }
        await editar((doc, sello) =>
          tipo === undefined
            ? crearRegistro(doc, 'tiposLocal', datos, sello).estado
            : editarRegistro(doc, 'tiposLocal', tipo.id, datos, sello),
        )
      }}
      eliminar={
        tipo === undefined
          ? undefined
          : {
              titulo: `¿Eliminar el tipo «${tipo.nombre}»?`,
              subtitulo: bloqueoAlEliminarTipoLocal(documento, tipo.id) ?? 'No tiene locales',
              resumen: [],
              alEliminar: () => editar((doc) => eliminarTipoLocal(doc, tipo.id)),
            }
      }
    >
      <CampoTexto etiqueta="Nombre" maximo={40} valor={nombre} alCambiar={setNombre} />
      <CampoTexto etiqueta="Impuesto %" modoTeclado="decimal" valor={pct} alCambiar={setPct} />
      <CampoImporte etiqueta="Mínimo al mes" valor={minimo} alCambiar={setMinimo} equivalencias={eq} />
      <CampoTexto etiqueta="Día de cobro" modoTeclado="numeric" valor={dia} alCambiar={setDia} />
    </DialogoFormulario>
  )
}

function DialogoLocal(props: { dominioId: string; local?: LocalComercial; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { local } = props
  const eq = documento.partida.equivalencias
  const tipos = documento.tiposLocal.filter((t) => t.dominioId === props.dominioId)
  const [nombre, setNombre] = useState(local?.nombre ?? '')
  const [tipoId, setTipo] = useState(local?.tipoId ?? tipos[0]?.id ?? '')
  const [titular, setTitular] = useState(documento.personas.find((p) => p.id === local?.titularId)?.nombre ?? '')
  const [habitual, setHabitual] = useState(valorDe(local?.produccionHabitual, eq))
  const [estado, setEstado] = useState<EstadoLocal>(local === undefined ? 'abierto' : estadoVigenteDelLocal(local))
  const [notas, setNotas] = useState(local?.notas ?? '')
  return (
    <DialogoFormulario
      titulo={local === undefined ? 'Añadir local' : 'Editar local'}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        if (tipoId === '') {
          throw new Error('Crea antes un tipo de local')
        }
        const produccionHabitual = importeDe(habitual, eq, 0)
        await editar((doc, sello) => {
          let base = doc
          let titularId: string | undefined
          if (titular.trim() !== '') {
            const persona = personaPorNombre(base, titular, sello)
            base = persona.estado
            titularId = persona.id
          }
          const datos = {
            nombre: nombre.trim(),
            tipoId,
            titularId,
            produccionHabitual,
            notas: notas.trim() === '' ? undefined : notas.trim(),
          }
          if (local === undefined) {
            return altaDeLocal(base, { dominioId: props.dominioId, estado, ...datos }, sello).estado
          }
          const editado = editarRegistro(base, 'localesComerciales', local.id, datos, sello)
          return estado === estadoVigenteDelLocal(local) ? editado : cambiarEstadoDeLocal(editado, local.id, estado, sello)
        })
      }}
      eliminar={
        local === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${local.nombre}»?`,
              subtitulo: 'Local comercial',
              resumen: [{ etiqueta: 'Los cobros pasados', valor: 'No cambian' }],
              alEliminar: () => editar((doc) => eliminarLocalComercial(doc, local.id)),
            }
      }
    >
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      <CampoOpcion etiqueta="Tipo de local" valor={tipoId} opciones={tipos.map((t) => ({ valor: t.id, texto: t.nombre }))} alCambiar={setTipo} />
      <CampoPersona etiqueta="Titular (opcional)" valor={titular} alCambiar={setTitular} />
      <CampoImporte etiqueta="Producción habitual al mes" valor={habitual} alCambiar={setHabitual} equivalencias={eq} />
      <Segmentos<EstadoLocal>
        etiqueta="Estado"
        opciones={[
          { valor: 'abierto', texto: 'Abierto' },
          { valor: 'cerrado', texto: 'Cerrado' },
        ]}
        valor={estado}
        alCambiar={setEstado}
      />
      <CampoTexto etiqueta="Notas" maximo={1000} valor={notas} alCambiar={setNotas} />
    </DialogoFormulario>
  )
}

/** A3c: anotar lo que produjo un local en un mes. */
function DialogoProduccionLocal({ local, alCerrar }: { local: LocalComercial; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const eq = documento.partida.equivalencias
  const meses = mesesParaAnotar(local, documento.partida.fechaActual)
  const claveDe = (m: { anio: number; mes: number }): string => `${m.anio}-${m.mes}`
  const [clave, setClave] = useState(meses[0] === undefined ? NINGUNO : claveDe(meses.at(-1)!))
  const mes = meses.find((m) => claveDe(m) === clave)
  const anotada = mes === undefined ? undefined : local.producciones.find((p) => claveDe(p.mes) === clave)
  const [importe, setImporte] = useState(valorDe(anotada?.importe, eq))
  const [nota, setNota] = useState(anotada?.nota ?? '')
  return (
    <DialogoFormulario
      titulo="Producción del mes"
      subtitulo={local.nombre}
      alCerrar={alCerrar}
      alGuardar={async () => {
        if (mes === undefined) {
          throw new Error('No hay meses para anotar')
        }
        const total = importeDe(importe, eq, 0)
        await editar((doc, sello) =>
          anotarProduccion(doc, local.id, { mes, importe: total, nota: nota.trim() === '' ? undefined : nota.trim() }, sello),
        )
      }}
      eliminar={
        anotada === undefined || mes === undefined
          ? undefined
          : {
              titulo: '¿Usar la habitual?',
              subtitulo: local.nombre,
              resumen: [{ etiqueta: 'Producción habitual', valor: formatearOro(local.produccionHabitual.base, eq) }],
              alEliminar: () => editar((doc, sello) => quitarProduccion(doc, local.id, mes, sello)),
            }
      }
    >
      <CampoOpcion
        etiqueta="Mes"
        valor={clave}
        opciones={meses.map((m) => ({ valor: claveDe(m), texto: `${conMayuscula(NOMBRES_MES[m.mes - 1])} de ${m.anio}` }))}
        alCambiar={setClave}
        singular="mes"
        plural="meses"
      />
      <CampoImporte etiqueta="Producción del mes" valor={importe} alCambiar={setImporte} equivalencias={eq} />
      <CampoTexto etiqueta="Nota" maximo={1000} valor={nota} alCambiar={setNota} />
    </DialogoFormulario>
  )
}

function Locales({ dominioId }: { dominioId: string }) {
  const { documento } = usePartida()
  const [abierto, setAbierto] = useState<
    { clase: 'local'; local?: LocalComercial } | { clase: 'tipo'; tipo?: TipoLocal } | { clase: 'produccion'; local: LocalComercial } | null
  >(null)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const mes = { anio: hoy.anio, mes: hoy.mes }
  const tipos = documento.tiposLocal.filter((t) => t.dominioId === dominioId)
  const locales = documento.localesComerciales.filter((l) => l.dominioId === dominioId)
  return (
    <>
      <ListaRegistros
        titulo="Locales"
        textoAlta="Añadir local"
        alAnadir={() => setAbierto({ clase: 'local' })}
        registros={locales}
        columnas={[
          { titulo: 'Local' },
          { titulo: 'Habitual al mes', derecha: true },
          { titulo: 'Este mes', derecha: true },
          { titulo: 'Impuesto', derecha: true },
          { titulo: 'Producción', ancho: '130px' },
        ]}
        nombreDe={(l) => l.nombre}
        fila={(l) => {
          const tipo = tipos.find((t) => t.id === l.tipoId)
          const produccion = produccionDelMes(l, mes)
          const titular = documento.personas.find((p) => p.id === l.titularId)?.nombre ?? 'sin titular'
          return [
            <span key="n">
              {l.nombre}
              <span className={estilos.suave}>
                {' '}
                {tipo?.nombre} · {titular}
                {estadoVigenteDelLocal(l) === 'cerrado' ? ' · cerrado' : ''}
              </span>
            </span>,
            formatearOro(l.produccionHabitual.base, eq),
            `${formatearOro(produccion.importe, eq)}, ${produccion.anotada ? 'anotada' : 'habitual'}`,
            tipo === undefined ? '' : formatearOro(impuestoDeLocal(produccion.importe, tipo), eq),
            <Boton key="p" variante="secundario" alPulsar={() => setAbierto({ clase: 'produccion', local: l })}>
              Anotar
            </Boton>,
          ]
        }}
        alEditar={(local) => setAbierto({ clase: 'local', local })}
      />
      <ListaRegistros
        titulo="Tipos de local"
        alAnadir={() => setAbierto({ clase: 'tipo' })}
        registros={tipos}
        columnas={[{ titulo: 'Tipo' }, { titulo: 'Regla' }]}
        nombreDe={(t) => t.nombre}
        fila={(t) => [t.nombre, `${String(t.pct).replace('.', ',')} %, mínimo ${formatearOro(t.minimo.base, eq)} · día ${t.diaCobro}`]}
        alEditar={(tipo) => setAbierto({ clase: 'tipo', tipo })}
      />
      {abierto?.clase === 'local' && <DialogoLocal dominioId={dominioId} local={abierto.local} alCerrar={() => setAbierto(null)} />}
      {abierto?.clase === 'tipo' && <DialogoTipoLocal dominioId={dominioId} tipo={abierto.tipo} alCerrar={() => setAbierto(null)} />}
      {abierto?.clase === 'produccion' && <DialogoProduccionLocal local={abierto.local} alCerrar={() => setAbierto(null)} />}
    </>
  )
}

type Pestana = 'caja' | 'impuestos' | 'locales' | 'deudas'

/** A2, A2b, A3 y A3b: la tesorería de un asentamiento, en pestañas. */
export function Tesoreria({ dominioId }: { dominioId: string }) {
  const [pestana, setPestana] = useState<Pestana>('caja')
  return (
    <>
      <CabeceraPantalla titulo="Tesorería" />
      <Segmentos<Pestana>
        etiqueta="Tesorería"
        etiquetaOculta
        opciones={[
          { valor: 'caja', texto: 'Caja y movimientos' },
          { valor: 'impuestos', texto: 'Impuestos y rentas' },
          { valor: 'locales', texto: 'Locales comerciales' },
          { valor: 'deudas', texto: 'Deudas' },
        ]}
        valor={pestana}
        alCambiar={setPestana}
      />
      {pestana === 'caja' && <Libro key={dominioId} dominioId={dominioId} titulo="Caja y movimientos" enPestana />}
      {pestana === 'impuestos' && <Impuestos dominioId={dominioId} />}
      {pestana === 'locales' && <Locales dominioId={dominioId} />}
      {pestana === 'deudas' && <Deudas dominioId={dominioId} conCabecera={false} />}
    </>
  )
}
