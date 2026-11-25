import { useMemo, useState } from 'react'
import { sacosPorPersonas } from '../../dominio/almacen/cantidades'
import { DIAS_DE_PREVISION, diasDeReserva, preverAlmacen, resumirFilas } from '../../dominio/almacen/prevision'
import { RECURSO } from '../../dominio/catalogo/inicial'
import { formatearOro } from '../../dominio/dinero/formato'
import { crearEntradaAlmacen, eliminarEntradaAlmacen } from '../../dominio/edicion/entradas'
import { bloqueoAlEliminarFila, editarExistencia, eliminarAjuste, eliminarFila } from '../../dominio/edicion/existencias'
import type { EntradaAlmacen, Existencia } from '../../dominio/modelo/almacen'
import { Boton, BotonIcono } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CampoFecha } from '../comunes/CampoFecha'
import { CampoImporte } from '../comunes/CampoImporte'
import { Nota, Panel } from '../comunes/Panel'
import { Segmentos } from '../comunes/Segmentos'
import { ListaPares } from '../comunes/Tabla'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { decimalDe, enteroDe, fechaCorta, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'
import { CampoRecurso, ListaRegistros } from './comunes'
import { conUnidad, nombreDelRecurso, soloCantidad } from './nombres'

/** A8b y «Añadir existencias»: comprar o recibir sin coste. */
function DialogoEntrada(props: { dominioId: string; viveres: boolean; alCerrar: () => void }) {
  const { documento, catalogo, editar } = usePartida()
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const [recurso, setRecurso] = useState<string>(props.viveres ? RECURSO.viveres : '')
  const [operacion, setOperacion] = useState<EntradaAlmacen['operacion']>('compra')
  const [modo, setModo] = useState<'sacos' | 'personas'>('sacos')
  const [cantidad, setCantidad] = useState('')
  const [personas, setPersonas] = useState('')
  const [durante, setDurante] = useState('1')
  const [precio, setPrecio] = useState(valorDe(undefined, eq))
  const [fecha, setFecha] = useState(hoy)
  const sacos =
    modo === 'personas' && /^\d+$/.test(personas) && /^\d+$/.test(durante)
      ? sacosPorPersonas(Number(personas), Number(durante), 'meses', documento.partida.diasPorSaco)
      : null

  return (
    <DialogoFormulario
      titulo={props.viveres ? 'Añadir víveres' : 'Añadir existencias'}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        if (recurso === '') {
          throw new Error('Elige el recurso')
        }
        const porPersonas =
          modo === 'personas'
            ? { personas: enteroDe(personas, 'Personas'), durante: enteroDe(durante, 'Meses'), periodo: 'meses' as const }
            : undefined
        const datos = {
          dominioId: props.dominioId,
          recursoId: recurso,
          operacion,
          cantidad: sacos ?? decimalDe(cantidad, 'Cantidad', 0.01),
          porPersonas,
          precioUnidad: operacion === 'compra' ? importeDe(precio, eq) : undefined,
          fecha,
        }
        await editar((doc, sello) => crearEntradaAlmacen(doc, datos, sello, catalogo).estado)
      }}
    >
      {!props.viveres && <CampoRecurso valor={recurso} alCambiar={setRecurso} />}
      <Segmentos<EntradaAlmacen['operacion']>
        etiqueta="Operación"
        opciones={[
          { valor: 'compra', texto: 'Comprar' },
          { valor: 'recepcion', texto: 'Recibir sin coste' },
        ]}
        valor={operacion}
        alCambiar={setOperacion}
      />
      {props.viveres && (
        <Segmentos<'sacos' | 'personas'>
          etiqueta="Cómo se cuenta"
          opciones={[
            { valor: 'sacos', texto: 'Sacos' },
            { valor: 'personas', texto: 'Por personas' },
          ]}
          valor={modo}
          alCambiar={setModo}
        />
      )}
      {modo === 'personas' ? (
        <>
          <CampoTexto etiqueta="Personas" modoTeclado="numeric" valor={personas} alCambiar={setPersonas} />
          <CampoTexto etiqueta="Meses" modoTeclado="numeric" valor={durante} alCambiar={setDurante} />
          {sacos !== null && <Nota>Son {sacos} sacos.</Nota>}
        </>
      ) : (
        <CampoTexto etiqueta={props.viveres ? 'Sacos' : 'Cantidad'} modoTeclado="decimal" valor={cantidad} alCambiar={setCantidad} />
      )}
      {operacion === 'compra' && (
        <CampoImporte etiqueta={props.viveres ? 'Precio por saco' : 'Precio por unidad'} valor={precio} alCambiar={setPrecio} equivalencias={eq} />
      )}
      <CampoFecha etiqueta="Fecha" valor={fecha} alCambiar={(f) => f !== null && setFecha(f)} hoy={hoy} edad={documento.partida.edad} />
    </DialogoFormulario>
  )
}

/** Ajustar existencias o capacidad de una fila. */
function DialogoFila({ fila, alCerrar }: { fila: Existencia; alCerrar: () => void }) {
  const { documento, catalogo, editar } = usePartida()
  const [cantidad, setCantidad] = useState(String(fila.cantidad).replace('.', ','))
  const [capacidad, setCapacidad] = useState(fila.capacidad === undefined ? '' : String(fila.capacidad))
  const [motivo, setMotivo] = useState('')
  const nombre = nombreDelRecurso(catalogo, fila.recursoId)
  const bloqueo = bloqueoAlEliminarFila(documento, fila.dominioId, fila.recursoId, catalogo)
  return (
    <DialogoFormulario
      titulo={`Editar existencias de ${nombre.toLowerCase()}`}
      alCerrar={alCerrar}
      alGuardar={async () => {
        const nueva = decimalDe(cantidad, 'Existencias')
        const cambios = {
          cantidad: Math.abs(nueva - fila.cantidad) < 1e-6 ? undefined : nueva,
          capacidad: capacidad.trim() === '' ? null : decimalDe(capacidad, 'Capacidad', 0.01),
          motivo: motivo.trim(),
        }
        await editar((doc, sello) => editarExistencia(doc, fila.dominioId, fila.recursoId, cambios, sello, catalogo))
      }}
      eliminar={{
        titulo: `¿Eliminar la fila de ${nombre.toLowerCase()}?`,
        subtitulo: bloqueo ?? 'Almacén',
        resumen: [],
        alEliminar: () => editar((doc) => eliminarFila(doc, fila.dominioId, fila.recursoId, catalogo)),
      }}
    >
      <CampoTexto etiqueta="Existencias" modoTeclado="decimal" valor={cantidad} alCambiar={setCantidad} />
      <CampoTexto etiqueta="Motivo del ajuste" maximo={120} ayuda="Obligatorio si cambias las existencias" valor={motivo} alCambiar={setMotivo} />
      <CampoTexto etiqueta="Capacidad" ayuda="Vacía: sin límite" modoTeclado="decimal" valor={capacidad} alCambiar={setCapacidad} />
    </DialogoFormulario>
  )
}

/** A8: las reservas, con lo que entra y sale en 30 días. */
export function Almacen({ dominioId }: { dominioId: string }) {
  const { documento, catalogo, editar } = usePartida()
  const [abierto, setAbierto] = useState<{ viveres: boolean } | { fila: Existencia } | null>(null)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const resumen = useMemo(() => {
    const prevision = preverAlmacen(documento, catalogo, DIAS_DE_PREVISION)
    return resumirFilas(documento.existencias, prevision.final, prevision.flujos)
  }, [documento, catalogo])
  const reservas = useMemo(() => diasDeReserva(documento, catalogo), [documento, catalogo])
  const filas = documento.existencias.filter((e) => e.dominioId === dominioId)
  const ajustes = documento.ajustesExistencias.filter((a) => a.dominioId === dominioId)
  const entradas = documento.entradasAlmacen.filter((e) => e.dominioId === dominioId)
  const [error, setError] = useState<string | null>(null)

  const intentar = (accion: Promise<void>): void => {
    setError(null)
    accion.catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }

  return (
    <>
      <div className={estilos.fila}>
        <Boton variante="principal" icono="mas" alPulsar={() => setAbierto({ viveres: true })}>
          Añadir víveres
        </Boton>
        <Boton variante="secundario" icono="mas" alPulsar={() => setAbierto({ viveres: false })}>
          Añadir existencias
        </Boton>
      </div>
      {error !== null && <Nota icono="alerta">{error}</Nota>}
      <ListaRegistros
        titulo="Almacén"
        registros={filas}
        columnas={[
          { titulo: 'Recurso' },
          { titulo: 'Existencias', derecha: true },
          { titulo: 'Entra en 30 días', derecha: true },
          { titulo: 'Sale en 30 días', derecha: true },
          { titulo: 'Previsión', derecha: true },
          { titulo: 'Reserva' },
        ]}
        nombreDe={(e) => nombreDelRecurso(catalogo, e.recursoId)}
        fila={(e) => {
          const r = resumen.find((x) => x.dominioId === dominioId && x.recursoId === e.recursoId)
          const reserva = reservas.find((x) => x.dominioId === dominioId && x.recursoId === e.recursoId)?.reserva
          const cifra = (n: number): string => soloCantidad(catalogo, e.recursoId, n)
          return [
            nombreDelRecurso(catalogo, e.recursoId),
            `${cifra(e.cantidad)}${e.capacidad === undefined ? '' : ` de ${cifra(e.capacidad)}`}`,
            <span key="e">
              +{cifra(r?.entradas ?? 0)}
              {(r?.perdido ?? 0) > 1e-6 && <span className={estilos.suave}> se pierden {cifra(r!.perdido)}</span>}
            </span>,
            (r?.consumido ?? 0) + (r?.sacado ?? 0) > 1e-6 ? `−${cifra((r?.consumido ?? 0) + (r?.sacado ?? 0))}` : '0',
            conUnidad(catalogo, e.recursoId, r?.final ?? e.cantidad),
            reserva === undefined || reserva.tipo === 'sinConsumo'
              ? '—'
              : reserva.tipo === 'sinFalta'
                ? 'Más de un año'
                : `${reserva.dias} días`,
          ]
        }}
        alEditar={(fila) => setAbierto({ fila })}
      />
      <div className={estilos.rejilla2}>
        <Panel titulo="Compras y recepciones">
          {entradas.length === 0 ? (
            <Nota>Ninguna</Nota>
          ) : (
            <ListaPares
              filas={entradas.map((e) => ({
                etiqueta: `${nombreDelRecurso(catalogo, e.recursoId)} · ${conUnidad(catalogo, e.recursoId, e.cantidad)}`,
                sub: `${fechaCorta(e.fecha, hoy)}${e.precioUnidad === undefined ? '' : ` · ${formatearOro(e.precioUnidad.base, eq)} por unidad`}`,
                valor:
                  e.caravanaId === undefined ? (
                    <BotonIcono icono="x" variante="fantasma" etiqueta="Eliminar la entrada" alPulsar={() => intentar(editar((doc) => eliminarEntradaAlmacen(doc, e.id, catalogo)))} />
                  ) : (
                    'De una caravana'
                  ),
              }))}
            />
          )}
        </Panel>
        <Panel titulo="Ajustes">
          {ajustes.length === 0 ? (
            <Nota>Ninguno</Nota>
          ) : (
            <ListaPares
              filas={ajustes.map((a) => ({
                etiqueta: `${nombreDelRecurso(catalogo, a.recursoId)} · ${a.delta > 0 ? '+' : ''}${a.delta}`,
                sub: `${fechaCorta(a.fecha, hoy)} · ${a.motivo}`,
                valor: <BotonIcono icono="x" variante="fantasma" etiqueta="Eliminar el ajuste" alPulsar={() => intentar(editar((doc) => eliminarAjuste(doc, a.id, catalogo)))} />,
              }))}
            />
          )}
        </Panel>
      </div>
      {abierto !== null && 'viveres' in abierto && <DialogoEntrada dominioId={dominioId} viveres={abierto.viveres} alCerrar={() => setAbierto(null)} />}
      {abierto !== null && 'fila' in abierto && <DialogoFila fila={abierto.fila} alCerrar={() => setAbierto(null)} />}
    </>
  )
}
