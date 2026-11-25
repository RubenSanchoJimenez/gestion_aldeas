import { useState } from 'react'
import { frecuenciaInicial, proximaFecha, TEXTO_TIPO } from '../../dominio/calendario/formularioFrecuencia'
import type { Recurrencia } from '../../dominio/calendario/recurrencia'
import { formatearOro } from '../../dominio/dinero/formato'
import {
  crearInversion,
  editarInversion,
  eliminarInversion,
  reactivarInversion,
  retirarInversion,
} from '../../dominio/edicion/inversiones'
import type { Inversion } from '../../dominio/modelo/personaje'
import { Boton, BotonIcono, Enlace } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CampoFecha } from '../comunes/CampoFecha'
import { CampoFrecuencia } from '../comunes/CampoFrecuencia'
import { CampoImporte } from '../comunes/CampoImporte'
import { CabeceraPantalla, Nota, Panel } from '../comunes/Panel'
import { ListaPares } from '../comunes/Tabla'
import { CampoCuenta, NINGUNO } from '../formulario/campos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { decimalDe, fechaCorta, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'

function DialogoInversion(props: { dominioId: string; inversion?: Inversion; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { inversion } = props
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const [negocio, setNegocio] = useState(inversion?.negocio ?? '')
  const [descripcion, setDescripcion] = useState(inversion?.descripcion ?? '')
  const [capital, setCapital] = useState(valorDe(inversion?.capital, eq))
  const [cuentaCapital, setCuentaCapital] = useState(
    inversion === undefined ? props.dominioId : (inversion.cuentaCapitalId ?? NINGUNO),
  )
  const [participacion, setParticipacion] = useState(String(inversion?.participacionPct ?? 100).replace('.', ','))
  const [beneficio, setBeneficio] = useState(valorDe(inversion?.beneficio, eq))
  const [recurrencia, setRecurrencia] = useState<Recurrencia>(inversion?.recurrencia ?? frecuenciaInicial('mensual', hoy))
  const [cuentaBeneficios, setCuentaBeneficios] = useState(inversion?.cuentaBeneficiosId ?? props.dominioId)

  async function guardar(): Promise<void> {
    if (negocio.trim().length < 2) {
      throw new Error('Escribe el nombre del negocio')
    }
    const datos = {
      negocio: negocio.trim(),
      descripcion: descripcion.trim() === '' ? undefined : descripcion.trim(),
      capital: importeDe(capital, eq),
      participacionPct: decimalDe(participacion, 'Participación', 0, 100),
      beneficio: importeDe(beneficio, eq, 0),
      recurrencia,
      cuentaCapitalId: cuentaCapital === NINGUNO ? undefined : cuentaCapital,
      cuentaBeneficiosId: cuentaBeneficios,
    }
    await editar((doc, sello) =>
      inversion === undefined
        ? crearInversion(doc, { dominioId: props.dominioId, ...datos }, sello).estado
        : editarInversion(doc, inversion.id, datos, sello),
    )
  }

  return (
    <DialogoFormulario
      titulo={inversion === undefined ? 'Nueva inversión' : 'Editar inversión'}
      alCerrar={props.alCerrar}
      alGuardar={guardar}
      eliminar={
        inversion === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${inversion.negocio}»?`,
              subtitulo: 'Inversión',
              resumen: [
                { etiqueta: 'Capital y retirada', valor: 'Se borran sus movimientos' },
                { etiqueta: 'Beneficios cobrados', valor: 'Se conservan' },
              ],
              alEliminar: () => editar((doc) => eliminarInversion(doc, inversion.id)),
            }
      }
    >
      <CampoTexto etiqueta="Negocio" maximo={60} valor={negocio} alCambiar={setNegocio} />
      <CampoTexto etiqueta="Descripción" maximo={1000} valor={descripcion} alCambiar={setDescripcion} />
      <CampoImporte etiqueta="Capital" valor={capital} alCambiar={setCapital} equivalencias={eq} />
      <CampoCuenta etiqueta="El capital sale de" valor={cuentaCapital} alCambiar={setCuentaCapital} ninguno="Ninguno: ya invertido" />
      <CampoTexto etiqueta="Participación %" modoTeclado="decimal" valor={participacion} alCambiar={setParticipacion} />
      <CampoImporte etiqueta="Beneficio" valor={beneficio} alCambiar={setBeneficio} equivalencias={eq} />
      <CampoFrecuencia etiqueta="Frecuencia" etiquetaFecha="Primer cobro" valor={recurrencia} alCambiar={setRecurrencia} hoy={hoy} edad={documento.partida.edad} guardada={inversion?.recurrencia} />
      <CampoCuenta etiqueta="Los beneficios entran en" valor={cuentaBeneficios} alCambiar={setCuentaBeneficios} />
    </DialogoFormulario>
  )
}

function DialogoRetirada({ inversion, alCerrar }: { inversion: Inversion; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const [importe, setImporte] = useState(valorDe(inversion.capital, eq))
  const [cuenta, setCuenta] = useState(inversion.cuentaBeneficiosId)
  const [fecha, setFecha] = useState(hoy)
  return (
    <DialogoFormulario
      titulo="Retirar inversión"
      subtitulo={inversion.negocio}
      alCerrar={alCerrar}
      textoGuardar="Retirar"
      alGuardar={async () => {
        const datos = { importe: importeDe(importe, eq, 0), cuentaId: cuenta, fecha }
        await editar((doc, sello) => retirarInversion(doc, inversion.id, datos, sello))
      }}
    >
      <CampoImporte etiqueta="Importe recuperado" valor={importe} alCambiar={setImporte} equivalencias={eq} />
      <CampoCuenta etiqueta="Entra en" valor={cuenta} alCambiar={setCuenta} />
      <CampoFecha etiqueta="Fecha" valor={fecha} alCambiar={(f) => f !== null && setFecha(f)} hoy={hoy} edad={documento.partida.edad} maximo={hoy} />
    </DialogoFormulario>
  )
}

/** J6: inversiones y negocios. */
export function Inversiones({ dominioId }: { dominioId: string }) {
  const { documento, editar } = usePartida()
  const [abierto, setAbierto] = useState<Inversion | 'nueva' | null>(null)
  const [retirando, setRetirando] = useState<Inversion | null>(null)
  const [verRetiradas, setVerRetiradas] = useState(false)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const suyas = documento.inversiones.filter((i) => i.dominioId === dominioId)
  const activas = suyas.filter((i) => i.estado === 'activa')
  const retiradas = suyas.filter((i) => i.estado === 'retirada')

  const tarjeta = (i: Inversion) => {
    const cobrados = documento.movimientos
      .filter((m) => m.inversionId === i.id && m.regla?.tipo === 'beneficio' && !m.programado)
      .reduce((suma, m) => suma + m.importe.base, 0)
    const proxima = i.estado === 'activa' ? proximaFecha(i.recurrencia, hoy) : null
    return (
      <Panel
        key={i.id}
        titulo={i.negocio}
        accion={
          i.estado === 'activa' ? (
            <span className={estilos.fila}>
              <Boton variante="secundario" alPulsar={() => setRetirando(i)}>
                Retirar
              </Boton>
              <BotonIcono icono="editar" variante="fantasma" etiqueta={`Editar ${i.negocio}`} alPulsar={() => setAbierto(i)} />
            </span>
          ) : (
            <Boton variante="secundario" icono="deshacer" alPulsar={() => void editar((doc, sello) => reactivarInversion(doc, i.id, sello))}>
              Deshacer la retirada
            </Boton>
          )
        }
      >
        {i.descripcion !== undefined && <p className={estilos.suave}>{i.descripcion}</p>}
        <ListaPares
          filas={[
            { etiqueta: 'Participación', valor: `${String(i.participacionPct).replace('.', ',')} %` },
            { etiqueta: 'Capital', valor: formatearOro(i.capital.base, eq) },
            { etiqueta: 'Beneficio', valor: `${formatearOro(i.beneficio.base, eq)} · ${TEXTO_TIPO[i.recurrencia.tipo]}` },
            { etiqueta: 'Próximo cobro', valor: proxima === null ? '—' : fechaCorta(proxima, hoy) },
            { etiqueta: 'Beneficios cobrados', valor: formatearOro(cobrados, eq) },
            ...(i.estado === 'retirada'
              ? [{ etiqueta: 'Retirada', valor: `${formatearOro(i.retirada.importe.base, eq)} · ${fechaCorta(i.retirada.fecha, hoy)}` }]
              : []),
          ]}
        />
      </Panel>
    )
  }

  return (
    <>
      <CabeceraPantalla
        titulo="Inversiones y negocios"
        subtitulo={`Capital invertido: ${formatearOro(activas.reduce((s, i) => s + i.capital.base, 0), eq)}`}
        acciones={
          <Boton variante="principal" icono="mas" alPulsar={() => setAbierto('nueva')}>
            Nueva inversión
          </Boton>
        }
      />
      {activas.length === 0 ? <Nota>Nada en curso</Nota> : <div className={estilos.rejilla2}>{activas.map(tarjeta)}</div>}
      {retiradas.length > 0 && (
        <>
          <div>
            <Enlace alPulsar={() => setVerRetiradas(!verRetiradas)}>
              {verRetiradas ? 'Ocultar retiradas' : `Retiradas (${retiradas.length})`}
            </Enlace>
          </div>
          {verRetiradas && <div className={estilos.rejilla2}>{retiradas.map(tarjeta)}</div>}
        </>
      )}
      {abierto !== null && (
        <DialogoInversion dominioId={dominioId} inversion={abierto === 'nueva' ? undefined : abierto} alCerrar={() => setAbierto(null)} />
      )}
      {retirando !== null && <DialogoRetirada inversion={retirando} alCerrar={() => setRetirando(null)} />}
    </>
  )
}
