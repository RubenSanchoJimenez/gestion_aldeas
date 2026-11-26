import { useState } from 'react'
import { progresoDeCaravana } from '../../dominio/almacen/progreso'
import { formatearOro } from '../../dominio/dinero/formato'
import { crearCaravana, editarCaravana, eliminarCaravana } from '../../dominio/edicion/caravanas'
import { bloqueoAlEliminarMercado, diasDeViaje, eliminarMercado, guardarPrecio, guardarRuta } from '../../dominio/edicion/mercados'
import { crearRegistro, editarRegistro } from '../../dominio/edicion/simples'
import type { Caravana, Mercado } from '../../dominio/modelo/comercio'
import { CampoTexto } from '../comunes/Campo'
import { CampoFecha } from '../comunes/CampoFecha'
import { CampoImporte } from '../comunes/CampoImporte'
import { Casilla } from '../comunes/Casilla'
import { CabeceraPantalla, Nota } from '../comunes/Panel'
import { Segmentos } from '../comunes/Segmentos'
import { CampoOpcion } from '../formulario/campos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { decimalDe, enteroDe, fechaCorta, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import { CampoRecurso, ListaRegistros } from './comunes'
import { conUnidad, nombreDelRecurso } from './nombres'

const OPERACIONES: Record<Caravana['operacion'], string> = { compra: 'Compra', venta: 'Venta', traslado: 'Traslado' }

/** A10b. */
function DialogoCaravana(props: { dominioId: string; caravana?: Caravana; alCerrar: () => void }) {
  const { documento, catalogo, editar } = usePartida()
  const { caravana } = props
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const [operacion, setOperacion] = useState<Caravana['operacion']>(caravana?.operacion ?? 'compra')
  const [destino, setDestino] = useState(caravana?.mercadoId ?? caravana?.destinoId ?? '')
  const [recurso, setRecurso] = useState(caravana?.carga.recursoId ?? '')
  const [cantidad, setCantidad] = useState(String(caravana?.carga.cantidad ?? '').replace('.', ','))
  const [precio, setPrecio] = useState(valorDe(caravana?.precioUnidad, eq))
  const [salida, setSalida] = useState(caravana?.salida ?? hoy)
  const [devolver, setDevolver] = useState(true)
  const esTraslado = operacion === 'traslado'
  const dias = destino === '' ? null : diasDeViaje(documento, props.dominioId, { tipo: esTraslado ? 'asentamiento' : 'mercado', id: destino })
  const destinos = esTraslado
    ? documento.dominios.filter((d) => d.tipo === 'asentamiento' && d.id !== props.dominioId)
    : documento.mercados.filter((m) => m.localDe === undefined || m.localDe === props.dominioId)

  /** Al elegir mercado y recurso, se precarga el precio anotado. */
  function precargar(mercadoId: string, recursoId: string): void {
    const anotado = documento.mercados.find((m) => m.id === mercadoId)?.precios.find((p) => p.recursoId === recursoId)
    if (anotado !== undefined) {
      setPrecio(valorDe(anotado.importe, eq))
    }
  }

  return (
    <DialogoFormulario
      titulo={caravana === undefined ? 'Nueva caravana' : 'Editar caravana'}
      subtitulo={dias === null ? undefined : `${dias} días de viaje de ida`}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        if (destino === '' || recurso === '') {
          throw new Error('Elige el destino y el recurso')
        }
        const datos = {
          dominioId: props.dominioId,
          operacion,
          ...(esTraslado ? { destinoId: destino } : { mercadoId: destino, precioUnidad: importeDe(precio, eq) }),
          carga: { recursoId: recurso, cantidad: decimalDe(cantidad, 'Cantidad', 0.01) },
          salida,
        }
        await editar((doc, sello) =>
          caravana === undefined ? crearCaravana(doc, datos, sello, catalogo).estado : editarCaravana(doc, caravana.id, datos, sello, catalogo),
        )
      }}
      eliminar={
        caravana === undefined
          ? undefined
          : {
              titulo: '¿Eliminar la caravana?',
              subtitulo: `${OPERACIONES[caravana.operacion]} · ${nombreDelRecurso(catalogo, caravana.carga.recursoId)}`,
              resumen: [{ etiqueta: 'Devolver el pago o la carga', valor: devolver ? 'Sí' : 'No' }],
              alEliminar: () => editar((doc) => eliminarCaravana(doc, caravana.id, { devolver }, catalogo)),
            }
      }
    >
      <Segmentos<Caravana['operacion']>
        etiqueta="Operación"
        opciones={(Object.keys(OPERACIONES) as Caravana['operacion'][]).map((v) => ({ valor: v, texto: OPERACIONES[v] }))}
        valor={operacion}
        alCambiar={(v) => {
          setOperacion(v)
          setDestino('')
        }}
      />
      <CampoOpcion
        etiqueta={esTraslado ? 'Asentamiento de destino' : 'Mercado'}
        valor={destino}
        opciones={destinos.map((d) => ({ valor: d.id, texto: d.nombre }))}
        alCambiar={(id) => {
          setDestino(id)
          precargar(id, recurso)
        }}
      />
      <CampoRecurso
        valor={recurso}
        alCambiar={(id) => {
          setRecurso(id)
          precargar(destino, id)
        }}
      />
      <CampoTexto etiqueta="Cantidad" modoTeclado="decimal" valor={cantidad} alCambiar={setCantidad} />
      {!esTraslado && <CampoImporte etiqueta="Precio por unidad" valor={precio} alCambiar={setPrecio} equivalencias={eq} />}
      <CampoFecha etiqueta="Salida" valor={salida} alCambiar={(f) => f !== null && setSalida(f)} hoy={hoy} edad={documento.partida.edad} />
      {destino !== '' && dias === null && <Nota icono="alerta">Anota los días de viaje en el mercado antes de enviar la caravana.</Nota>}
      {caravana !== undefined && caravana.estado === 'enRuta' && (
        <Casilla etiqueta="Al eliminar, devolver el pago o la carga" marcada={devolver} alCambiar={setDevolver} />
      )}
    </DialogoFormulario>
  )
}

/** A10c y la edición de un mercado: nombre, días de viaje desde aquí y precios. */
function DialogoMercado(props: { dominioId: string; mercado?: Mercado; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { mercado } = props
  const eq = documento.partida.equivalencias
  const local = mercado?.localDe !== undefined
  const guardados = mercado === undefined ? null : diasDeViaje(documento, props.dominioId, { tipo: 'mercado', id: mercado.id })
  const [nombre, setNombre] = useState(mercado?.nombre ?? '')
  const [dias, setDias] = useState(guardados === null ? '' : String(guardados))
  const [recurso, setRecurso] = useState('')
  const [precio, setPrecio] = useState(valorDe(undefined, eq))

  return (
    <DialogoFormulario
      titulo={mercado === undefined ? 'Nuevo mercado' : 'Editar mercado'}
      alCerrar={props.alCerrar}
      alGuardar={async () => {
        if (nombre.trim().length < 2) {
          throw new Error('El nombre tiene que tener de 2 a 60 caracteres')
        }
        const viaje = local || dias.trim() === '' ? null : enteroDe(dias, 'Días de viaje', 1, 365)
        const anotado = recurso === '' ? undefined : { recursoId: recurso, importe: importeDe(precio, eq) }
        await editar((doc, sello) => {
          const repetido = doc.mercados.some((m) => m.id !== mercado?.id && m.nombre.toLowerCase() === nombre.trim().toLowerCase())
          if (repetido) {
            throw new Error(`Ya existe el mercado «${nombre.trim()}»`)
          }
          let estado = doc
          let id = mercado?.id
          if (id === undefined) {
            const creado = crearRegistro(estado, 'mercados', { nombre: nombre.trim(), precios: [] }, sello)
            estado = creado.estado
            id = creado.id
          } else if (!local) {
            estado = editarRegistro(estado, 'mercados', id, { nombre: nombre.trim() }, sello)
          }
          if (viaje !== null) {
            estado = guardarRuta(estado, props.dominioId, { tipo: 'mercado', id }, viaje, sello)
          }
          return anotado === undefined ? estado : guardarPrecio(estado, id, anotado.recursoId, anotado.importe, sello)
        })
      }}
      eliminar={
        mercado === undefined || local
          ? undefined
          : {
              titulo: `¿Eliminar «${mercado.nombre}»?`,
              subtitulo: bloqueoAlEliminarMercado(documento, mercado.id) ?? 'Se borran sus precios y rutas',
              resumen: [],
              alEliminar: () => editar((doc) => eliminarMercado(doc, mercado.id)),
            }
      }
    >
      {local ? (
        <Nota>El mercado local lleva el nombre del asentamiento.</Nota>
      ) : (
        <>
          <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
          <CampoTexto etiqueta="Días de viaje (solo ida) desde aquí" modoTeclado="numeric" valor={dias} alCambiar={setDias} />
        </>
      )}
      <CampoRecurso etiqueta="Anotar el precio de un recurso" valor={recurso} alCambiar={setRecurso} />
      {recurso !== '' && <CampoImporte etiqueta="Precio por unidad" valor={precio} alCambiar={setPrecio} equivalencias={eq} />}
    </DialogoFormulario>
  )
}

/** A10: caravanas y mercados. */
export function Comercio({ dominioId }: { dominioId: string }) {
  const { documento, catalogo } = usePartida()
  const [abierto, setAbierto] = useState<{ caravana?: Caravana } | { mercado?: Mercado } | null>(null)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const suyas = documento.caravanas.filter((c) => c.dominioId === dominioId)
  const destinoDe = (c: Caravana): string =>
    documento.mercados.find((m) => m.id === c.mercadoId)?.nombre ??
    documento.dominios.find((d) => d.id === c.destinoId)?.nombre ??
    ''
  const columnas = [{ titulo: 'Caravana' }, { titulo: 'Carga' }, { titulo: 'Importe', derecha: true }, { titulo: 'Salida y vuelta' }, { titulo: 'Avance' }]
  const fila = (c: Caravana) => [
    `${OPERACIONES[c.operacion]} · ${destinoDe(c)}${c.estado === 'programada' ? ' · programada' : ''}`,
    conUnidad(catalogo, c.carga.recursoId, c.carga.cantidad),
    c.importe === undefined ? '—' : formatearOro(c.importe.base, eq),
    `${fechaCorta(c.salida, hoy)} – ${fechaCorta(c.vuelta, hoy)}`,
    `${progresoDeCaravana(c, hoy)} %`,
  ]
  const nombreDe = (c: Caravana): string => `la caravana a ${destinoDe(c)}`

  return (
    <>
      <CabeceraPantalla titulo="Comercio" />
      <ListaRegistros
        titulo="Caravanas"
        textoAlta="Nueva caravana"
        alAnadir={() => setAbierto({ caravana: undefined })}
        registros={suyas.filter((c) => c.estado !== 'terminada')}
        columnas={columnas}
        fila={fila}
        nombreDe={nombreDe}
        alEditar={(caravana) => setAbierto({ caravana })}
        vacio="Nada en curso"
      />
      <ListaRegistros
        titulo="Historial de caravanas"
        registros={suyas.filter((c) => c.estado === 'terminada')}
        columnas={columnas}
        fila={fila}
        nombreDe={nombreDe}
        alEditar={(caravana) => setAbierto({ caravana })}
      />
      <ListaRegistros
        titulo="Mercados"
        textoAlta="Nuevo mercado"
        alAnadir={() => setAbierto({ mercado: undefined })}
        registros={documento.mercados.filter((m) => m.localDe === undefined || m.localDe === dominioId)}
        columnas={[{ titulo: 'Mercado' }, { titulo: 'Días de viaje' }, { titulo: 'Precios' }]}
        nombreDe={(m) => m.nombre}
        fila={(m) => [
          m.localDe === dominioId ? `${m.nombre} (local)` : m.nombre,
          m.localDe === dominioId ? '0' : (diasDeViaje(documento, dominioId, { tipo: 'mercado', id: m.id }) ?? '—'),
          m.precios.map((p) => `${nombreDelRecurso(catalogo, p.recursoId)} ${formatearOro(p.importe.base, eq)}`).join(', ') || '—',
        ]}
        alEditar={(mercado) => setAbierto({ mercado })}
      />
      {abierto !== null && 'caravana' in abierto && <DialogoCaravana dominioId={dominioId} caravana={abierto.caravana} alCerrar={() => setAbierto(null)} />}
      {abierto !== null && 'mercado' in abierto && <DialogoMercado dominioId={dominioId} mercado={abierto.mercado} alCerrar={() => setAbierto(null)} />}
    </>
  )
}
