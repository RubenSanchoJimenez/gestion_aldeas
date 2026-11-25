import { useState } from 'react'
import type { Fecha } from '../../dominio/calendario/fecha'
import { frecuenciaInicial } from '../../dominio/calendario/formularioFrecuencia'
import type { Recurrencia } from '../../dominio/calendario/recurrencia'
import { vistaPreviaDePago } from '../../dominio/deudas/pago'
import { estadoDeDeuda, interesDelPeriodo } from '../../dominio/deudas/pendiente'
import { formatearOro } from '../../dominio/dinero/formato'
import {
  crearDeuda,
  editarDeuda,
  editarPagoDeuda,
  eliminarDeuda,
  eliminarPagoDeuda,
  registrarPagoDeuda,
} from '../../dominio/edicion/deudas'
import { personaPorNombre } from '../../dominio/edicion/listas'
import type { AplicarPagoA, Deuda, PagoDeuda } from '../../dominio/modelo/deudas'
import { Boton, BotonIcono, Enlace } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CampoFecha } from '../comunes/CampoFecha'
import { CampoFrecuencia } from '../comunes/CampoFrecuencia'
import { CampoImporte } from '../comunes/CampoImporte'
import { leerImporte } from '../comunes/leerImporte'
import { CabeceraPantalla, Nota, Panel } from '../comunes/Panel'
import { Segmentos } from '../comunes/Segmentos'
import { ListaPares, Tabla } from '../comunes/Tabla'
import { CampoCuenta, CampoPersona, NINGUNO } from '../formulario/campos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { decimalDe, fechaCorta, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'

/** J4b: registrar, cambiar o borrar un pago o un cobro. */
function DialogoPago({ deuda, pago, alCerrar }: { deuda: Deuda; pago?: PagoDeuda; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const cobro = deuda.sentido === 'meDeben'
  const anterior = documento.movimientos.find((m) => m.id === pago?.movimientoId)
  const [importe, setImporte] = useState(valorDe(pago?.importe, eq))
  const [cuenta, setCuenta] = useState(anterior?.dominioId ?? deuda.dominioId)
  const [fecha, setFecha] = useState(pago?.fecha ?? hoy)
  const [aplicarA, setAplicarA] = useState<AplicarPagoA>(pago?.aplicarA ?? 'interesesYCapital')
  const lectura = leerImporte(importe, eq)
  const previa =
    pago === undefined && lectura.tipo === 'valido'
      ? vistaPreviaDePago(documento, deuda.id, { importe: lectura.base, aplicarA, cuentaId: cuenta })
      : null

  return (
    <DialogoFormulario
      titulo={cobro ? 'Registrar cobro' : 'Registrar pago'}
      subtitulo={`Pendiente: ${formatearOro(estadoDeDeuda(deuda).pendiente, eq)}`}
      alCerrar={alCerrar}
      textoGuardar={cobro ? 'Registrar cobro' : 'Registrar pago'}
      alGuardar={async () => {
        const datos = { importe: importeDe(importe, eq), aplicarA, fecha, cuentaId: cuenta }
        await editar((doc, sello) =>
          pago === undefined
            ? registrarPagoDeuda(doc, deuda.id, datos, sello).estado
            : editarPagoDeuda(doc, deuda.id, pago.id, datos, sello),
        )
      }}
      eliminar={
        pago === undefined
          ? undefined
          : {
              titulo: cobro ? '¿Eliminar el cobro?' : '¿Eliminar el pago?',
              subtitulo: fechaCorta(pago.fecha, hoy),
              resumen: [{ etiqueta: 'Se borra su movimiento', valor: formatearOro(pago.importe.base, eq) }],
              alEliminar: () => editar((doc, sello) => eliminarPagoDeuda(doc, deuda.id, pago.id, sello)),
            }
      }
    >
      <CampoImporte etiqueta="Importe" valor={importe} alCambiar={setImporte} equivalencias={eq} />
      <CampoCuenta etiqueta={cobro ? 'Entra en' : 'Sale de'} valor={cuenta} alCambiar={setCuenta} />
      <CampoFecha etiqueta="Fecha" valor={fecha} alCambiar={(f) => f !== null && setFecha(f)} hoy={hoy} edad={documento.partida.edad} maximo={hoy} />
      <Segmentos<AplicarPagoA>
        etiqueta="Se aplica a"
        opciones={[
          { valor: 'interesesYCapital', texto: 'Intereses y capital' },
          { valor: 'soloCapital', texto: 'Solo capital' },
          { valor: 'soloIntereses', texto: 'Solo intereses' },
        ]}
        valor={aplicarA}
        alCambiar={setAplicarA}
      />
      {previa !== null && (
        <ListaPares
          filas={[
            { etiqueta: 'Intereses', valor: `${formatearOro(previa.interesesAntes, eq)} → ${formatearOro(previa.interesesDespues, eq)}` },
            { etiqueta: 'Capital', valor: `${formatearOro(previa.capitalAntes, eq)} → ${formatearOro(previa.capitalDespues, eq)}` },
            { etiqueta: 'La cuenta quedará en', valor: formatearOro(previa.saldoDespues ?? 0, eq) },
            { etiqueta: 'Próximo interés', valor: formatearOro(previa.proximoInteres, eq) },
          ]}
        />
      )}
    </DialogoFormulario>
  )
}

/** El formulario «Deuda o préstamo», con la lista de sus pagos. */
function DialogoDeuda(props: {
  dominioId: string
  deuda?: Deuda
  alPago: (pago: PagoDeuda) => void
  alCerrar: () => void
}) {
  const { documento, editar } = usePartida()
  const { deuda, dominioId } = props
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const edad = documento.partida.edad
  const [sentido, setSentido] = useState<Deuda['sentido']>(deuda?.sentido ?? 'debo')
  const [contraparte, setContraparte] = useState(documento.personas.find((p) => p.id === deuda?.contraparteId)?.nombre ?? '')
  const [fecha, setFecha] = useState(deuda?.fecha ?? hoy)
  const [principal, setPrincipal] = useState(valorDe(deuda?.principal, eq))
  const [cuenta, setCuenta] = useState(dominioId)
  const [interes, setInteres] = useState(String(deuda?.interesPct ?? 0).replace('.', ','))
  const [recurrencia, setRecurrencia] = useState<Recurrencia>(deuda?.recurrenciaInteres ?? frecuenciaInicial('mensual', hoy))
  const [vencimiento, setVencimiento] = useState<Fecha | null>(deuda?.vencimiento ?? null)
  const [notas, setNotas] = useState(deuda?.notas ?? '')
  const conInteres = interes.trim() !== '' && interes.trim() !== '0'

  async function guardar(): Promise<void> {
    const interesPct = interes.trim() === '' ? 0 : decimalDe(interes, 'Interés', 0, 100)
    const total = importeDe(principal, eq)
    await editar((doc, sello) => {
      const persona = personaPorNombre(doc, contraparte, sello)
      const datos = {
        sentido,
        contraparteId: persona.id,
        fecha,
        principal: total,
        interesPct,
        recurrenciaInteres: interesPct > 0 ? recurrencia : undefined,
        vencimiento: vencimiento ?? undefined,
        notas: notas.trim() === '' ? undefined : notas.trim(),
      }
      return deuda === undefined
        ? crearDeuda(persona.estado, { dominioId, ...datos, cuentaId: cuenta === NINGUNO ? undefined : cuenta }, sello).estado
        : editarDeuda(persona.estado, deuda.id, datos, sello)
    })
  }

  return (
    <DialogoFormulario
      titulo={deuda === undefined ? 'Nueva deuda o préstamo' : 'Editar deuda'}
      alCerrar={props.alCerrar}
      alGuardar={guardar}
      eliminar={
        deuda === undefined
          ? undefined
          : {
              titulo: '¿Eliminar la deuda?',
              subtitulo: contraparte,
              resumen: [
                { etiqueta: 'Se borran sus pagos y sus movimientos', valor: `${deuda.pagos.length} pagos` },
              ],
              alEliminar: () => editar((doc) => eliminarDeuda(doc, deuda.id)),
            }
      }
    >
      <Segmentos<Deuda['sentido']>
        etiqueta="Sentido"
        opciones={[
          { valor: 'debo', texto: 'Debo' },
          { valor: 'meDeben', texto: 'Me deben' },
        ]}
        valor={sentido}
        alCambiar={setSentido}
      />
      <CampoPersona etiqueta="Contraparte" valor={contraparte} alCambiar={setContraparte} />
      <CampoFecha etiqueta="Fecha de alta" valor={fecha} alCambiar={(f) => f !== null && setFecha(f)} hoy={hoy} edad={edad} maximo={hoy} />
      <CampoImporte etiqueta="Principal" valor={principal} alCambiar={setPrincipal} equivalencias={eq} />
      {deuda === undefined && (
        <CampoCuenta
          etiqueta={sentido === 'debo' ? 'El dinero entra en' : 'El dinero sale de'}
          valor={cuenta}
          alCambiar={setCuenta}
          ninguno="Ninguno: solo anotar la deuda"
        />
      )}
      <CampoTexto etiqueta="Interés %" modoTeclado="decimal" valor={interes} alCambiar={setInteres} />
      {conInteres && (
        <CampoFrecuencia etiqueta="Frecuencia del interés" valor={recurrencia} alCambiar={setRecurrencia} hoy={hoy} edad={edad} guardada={deuda?.recurrenciaInteres} />
      )}
      <CampoFecha etiqueta="Vencimiento" valor={vencimiento} alCambiar={setVencimiento} hoy={hoy} edad={edad} opcional />
      <CampoTexto etiqueta="Notas" maximo={1000} valor={notas} alCambiar={setNotas} />
      {deuda !== undefined && deuda.pagos.length > 0 && (
        <Tabla
          etiqueta="Pagos"
          columnas={[{ titulo: 'Fecha' }, { titulo: 'Importe', derecha: true }, { titulo: ' ', ancho: '56px' }]}
          filas={deuda.pagos.map((p) => [
            fechaCorta(p.fecha, hoy),
            formatearOro(p.importe.base, eq),
            <BotonIcono key="e" icono="editar" variante="fantasma" etiqueta="Editar el pago" alPulsar={() => props.alPago(p)} />,
          ])}
        />
      )}
    </DialogoFormulario>
  )
}

type Abierto = { tipo: 'deuda'; deuda?: Deuda } | { tipo: 'pago'; deudaId: string; pago?: PagoDeuda }

/** J4 y las deudas de A2b: lo que debes, lo que te deben y las saldadas. */
export function Deudas({ dominioId, conCabecera = true }: { dominioId: string; conCabecera?: boolean }) {
  const { documento } = usePartida()
  const [abierto, setAbierto] = useState<Abierto | null>(null)
  const [verSaldadas, setVerSaldadas] = useState(false)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const suyas = documento.deudas.filter((d) => d.dominioId === dominioId)
  const nombre = (id: string): string => documento.personas.find((p) => p.id === id)?.nombre ?? ''
  const grupos = [
    { titulo: 'Lo que debes', deudas: suyas.filter((d) => d.estado !== 'saldada' && d.sentido === 'debo') },
    { titulo: 'Lo que te deben', deudas: suyas.filter((d) => d.estado !== 'saldada' && d.sentido === 'meDeben') },
  ]
  const saldadas = suyas.filter((d) => d.estado === 'saldada')

  const tarjeta = (d: Deuda) => {
    const cuentas = estadoDeDeuda(d)
    const interes = interesDelPeriodo(d)
    return (
      <div key={d.id} className={estilos.pila}>
        <div className={estilos.extremos}>
          <div>
            <strong>{nombre(d.contraparteId)}</strong>
            <div className={estilos.suave}>
              {[
                d.impago ? 'Impago' : undefined,
                d.estado === 'vencida' ? 'Vencida' : d.estado === 'saldada' ? 'Saldada' : 'Abierta',
                d.interesPct > 0 ? `${String(d.interesPct).replace('.', ',')} % (${formatearOro(interes, eq)})` : 'sin interés',
                d.vencimiento === undefined ? undefined : `vence el ${fechaCorta(d.vencimiento, hoy)}`,
                d.notas,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
          <div className={estilos.fila}>
            {d.estado !== 'saldada' && (
              <Boton variante="secundario" alPulsar={() => setAbierto({ tipo: 'pago', deudaId: d.id })}>
                {d.sentido === 'debo' ? 'Registrar pago' : 'Registrar cobro'}
              </Boton>
            )}
            {!d.impago && (
              <BotonIcono icono="editar" variante="fantasma" etiqueta={`Editar la deuda con ${nombre(d.contraparteId)}`} alPulsar={() => setAbierto({ tipo: 'deuda', deuda: d })} />
            )}
          </div>
        </div>
        <ListaPares
          filas={[
            { etiqueta: 'Principal', valor: formatearOro(d.principal.base, eq) },
            { etiqueta: 'Pagado', valor: formatearOro(cuentas.capitalPagado + cuentas.interesesPagados, eq) },
            { etiqueta: 'Intereses pendientes', valor: formatearOro(cuentas.interesesPendientes, eq) },
            { etiqueta: 'Pendiente', valor: formatearOro(cuentas.pendiente, eq) },
          ]}
        />
      </div>
    )
  }

  // Los diálogos leen la deuda del documento vigente, no la que había al abrirlos.
  const deudaDelPago = abierto?.tipo === 'pago' ? suyas.find((d) => d.id === abierto.deudaId) : undefined
  const nueva = (
    <Boton variante="principal" icono="mas" alPulsar={() => setAbierto({ tipo: 'deuda' })}>
      Nueva deuda o préstamo
    </Boton>
  )

  return (
    <>
      {conCabecera ? <CabeceraPantalla titulo="Deudas y préstamos" acciones={nueva} /> : <div>{nueva}</div>}
      <div className={estilos.rejilla2}>
        {grupos.map((g) => (
          <Panel key={g.titulo} titulo={g.titulo}>
            {g.deudas.length === 0 ? <Nota>Nada pendiente</Nota> : <div className={estilos.pila}>{g.deudas.map(tarjeta)}</div>}
          </Panel>
        ))}
      </div>
      {saldadas.length > 0 && (
        <>
          <div>
            <Enlace alPulsar={() => setVerSaldadas(!verSaldadas)}>
              {verSaldadas ? 'Ocultar saldadas' : `Saldadas (${saldadas.length})`}
            </Enlace>
          </div>
          {verSaldadas && (
            <Panel titulo="Saldadas">
              <div className={estilos.pila}>{saldadas.map(tarjeta)}</div>
            </Panel>
          )}
        </>
      )}
      {abierto?.tipo === 'deuda' && (
        <DialogoDeuda
          dominioId={dominioId}
          deuda={abierto.deuda}
          alPago={(pago) => setAbierto({ tipo: 'pago', deudaId: abierto.deuda!.id, pago })}
          alCerrar={() => setAbierto((a) => (a?.tipo === 'deuda' ? null : a))}
        />
      )}
      {abierto?.tipo === 'pago' && deudaDelPago !== undefined && (
        <DialogoPago deuda={deudaDelPago} pago={abierto.pago} alCerrar={() => setAbierto(null)} />
      )}
    </>
  )
}
