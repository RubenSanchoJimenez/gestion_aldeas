import { useState } from 'react'
import { compararFechas } from '../../dominio/calendario/fecha'
import { formatearIntroducido, formatearOro } from '../../dominio/dinero/formato'
import { saldosPorDominio } from '../../dominio/dinero/saldo'
import { crearMovimiento, editarMovimiento, eliminarMovimiento } from '../../dominio/edicion/movimientos'
import { ubicacionPorNombre } from '../../dominio/edicion/listas'
import { eliminarObjeto } from '../../dominio/edicion/objetos'
import { crearTransferencia, editarTransferencia, eliminarTransferencia } from '../../dominio/edicion/transferencias'
import type { Movimiento } from '../../dominio/modelo/movimientos'
import { buscarEn } from '../../dominio/texto/buscar'
import { Aviso } from '../comunes/Aviso'
import { Boton, BotonIcono } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CampoFecha } from '../comunes/CampoFecha'
import { CampoImporte } from '../comunes/CampoImporte'
import { Casilla } from '../comunes/Casilla'
import { leerImporte, type ValorImporte } from '../comunes/leerImporte'
import { CabeceraPantalla, Nota, Panel } from '../comunes/Panel'
import { Segmentos } from '../comunes/Segmentos'
import { Tabla } from '../comunes/Tabla'
import { CampoCategoria, CampoCuenta, CampoOpcion, CampoUbicacion, NUEVA_UBICACION } from '../formulario/campos'
import { ubicacionDeClave } from '../formulario/ubicaciones'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { enteroDe, fechaCorta, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import { DialogoVenta } from '../personaje/DialogoVenta'
import estilos from '../partida/partida.module.css'

/** J2b y J2c: el alta y la edición de un movimiento suelto. */
export function DialogoMovimiento(props: { dominioId: string; movimiento?: Movimiento; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { movimiento, alCerrar } = props
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const [tipo, setTipo] = useState<'gasto' | 'ingreso'>(movimiento?.tipo === 'ingreso' ? 'ingreso' : 'gasto')
  const [dominioId, setDominioId] = useState(movimiento?.dominioId ?? props.dominioId)
  const [importe, setImporte] = useState(valorDe(movimiento?.importe, eq))
  const [concepto, setConcepto] = useState(movimiento?.concepto ?? '')
  const [categoria, setCategoria] = useState(movimiento?.categoriaId ?? '')
  const [fecha, setFecha] = useState(movimiento?.fecha ?? hoy)
  const [alInventario, setAlInventario] = useState(false)
  const [cantidad, setCantidad] = useState('1')
  const [ubicacion, setUbicacion] = useState('encima')
  const [nuevaUbicacion, setNuevaUbicacion] = useState('')
  const [valorUnidad, setValorUnidad] = useState<ValorImporte | null>(null)
  const [quitarObjeto, setQuitarObjeto] = useState(false)
  const objetoComprado = documento.objetos.find((o) => movimiento !== undefined && o.movimientoCompraId === movimiento.id)
  const saldo = saldosPorDominio(documento)[dominioId] ?? 0
  const lectura = leerImporte(importe, eq)
  const programado = compararFechas(fecha, hoy) > 0
  const anterior = movimiento !== undefined && !movimiento.programado && movimiento.dominioId === dominioId ? movimiento.importe.base : 0
  const queda =
    lectura.tipo === 'valido' ? saldo - anterior + (programado ? 0 : tipo === 'gasto' ? -lectura.base : lectura.base) : saldo

  async function guardar(): Promise<void> {
    const total = importeDe(importe, eq)
    if (concepto.trim() === '') {
      throw new Error('Escribe un concepto')
    }
    if (categoria === '') {
      throw new Error('Elige una categoría')
    }
    await editar((doc, sello) => {
      if (movimiento !== undefined) {
        return editarMovimiento(
          doc,
          movimiento.id,
          { dominioId, importe: total, concepto: concepto.trim(), categoriaId: categoria, fecha },
          sello,
        )
      }
      let base = doc
      let inventario
      if (alInventario && tipo === 'gasto') {
        const unidades = enteroDe(cantidad, 'Cantidad')
        let clave = ubicacion
        if (clave === NUEVA_UBICACION) {
          const creada = ubicacionPorNombre(base, nuevaUbicacion, sello)
          base = creada.estado
          clave = `propia|${creada.id}`
        }
        inventario = {
          nombre: concepto.trim().slice(0, 60),
          cantidad: unidades,
          // Propuesto: importe ÷ cantidad; si se escribe otro, manda el escrito (§6.2, J2b).
          valorUnitario:
            valorUnidad === null ? { base: Math.round(total.base / unidades) } : importeDe(valorUnidad, eq, 0),
          ubicacion: ubicacionDeClave(clave),
        }
      }
      return crearMovimiento(
        base,
        { dominioId, tipo, importe: total, concepto: concepto.trim(), categoriaId: categoria, fecha, inventario },
        sello,
      ).estado
    })
  }

  return (
    <DialogoFormulario
      titulo={movimiento === undefined ? 'Nuevo movimiento' : 'Editar movimiento'}
      subtitulo={`Quedará en ${formatearOro(queda, eq)}`}
      alCerrar={alCerrar}
      alGuardar={guardar}
      eliminar={
        movimiento === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${movimiento.concepto}»?`,
              subtitulo: fechaCorta(movimiento.fecha, hoy),
              resumen: [{ etiqueta: 'Importe', valor: formatearOro(movimiento.importe.base, eq, { signo: true }) }],
              alEliminar: () =>
                editar((doc) => {
                  const sinMovimiento = eliminarMovimiento(doc, movimiento.id)
                  return quitarObjeto && objetoComprado !== undefined
                    ? eliminarObjeto(sinMovimiento, objetoComprado.id)
                    : sinMovimiento
                }),
              extra:
                objetoComprado === undefined ? undefined : (
                  <Casilla
                    etiqueta={`Quitar también «${objetoComprado.nombre}» del inventario`}
                    marcada={quitarObjeto}
                    alCambiar={setQuitarObjeto}
                  />
                ),
            }
      }
    >
      {movimiento === undefined && (
        <Segmentos
          etiqueta="Tipo"
          opciones={[
            { valor: 'gasto', texto: 'Gasto' },
            { valor: 'ingreso', texto: 'Ingreso' },
          ]}
          valor={tipo}
          alCambiar={setTipo}
        />
      )}
      {movimiento?.origen === 'avance' && (
        <Aviso tono="oro" icono="reloj_arena">
          Si deshaces ese avance, esta edición se perderá.
        </Aviso>
      )}
      <CampoImporte etiqueta="Importe" valor={importe} alCambiar={setImporte} equivalencias={eq} />
      <CampoTexto etiqueta="Concepto" maximo={120} valor={concepto} alCambiar={setConcepto} />
      <CampoCategoria valor={categoria} alCambiar={setCategoria} />
      <CampoCuenta etiqueta={tipo === 'gasto' ? 'Sale de' : 'Entra en'} valor={dominioId} alCambiar={setDominioId} />
      <CampoFecha
        etiqueta="Fecha"
        valor={fecha}
        alCambiar={(f) => f !== null && setFecha(f)}
        hoy={hoy}
        edad={documento.partida.edad}
        ayuda={programado ? 'Quedará programado y se aplicará al avanzar' : undefined}
      />
      {movimiento === undefined && tipo === 'gasto' && (
        <>
          <Casilla etiqueta="Añadir también al inventario" marcada={alInventario} alCambiar={setAlInventario} />
          {alInventario && (
            <>
              <CampoTexto etiqueta="Cantidad" modoTeclado="numeric" valor={cantidad} alCambiar={setCantidad} />
              <CampoImporte
                etiqueta="Valor por unidad"
                ayuda="Vacío: el importe repartido entre la cantidad"
                valor={valorUnidad ?? { cantidad: '', moneda: importe.moneda }}
                alCambiar={(v) => setValorUnidad(v.cantidad.trim() === '' ? null : v)}
                equivalencias={eq}
              />
              <CampoUbicacion
                valor={ubicacion}
                alCambiar={setUbicacion}
                nombreNueva={nuevaUbicacion}
                alCambiarNombre={setNuevaUbicacion}
              />
            </>
          )}
        </>
      )}
    </DialogoFormulario>
  )
}

/** J2f: pasar dinero entre dos cuentas, con aviso si una queda en negativo. */
export function DialogoTransferencia(props: { dominioId: string; transferenciaId?: string; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const existente = documento.transferencias.find((t) => t.id === props.transferenciaId)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const otra = documento.dominios.find((d) => d.id !== props.dominioId)?.id ?? props.dominioId
  const [saleDeId, setSale] = useState(existente?.saleDeId ?? props.dominioId)
  const [entraEnId, setEntra] = useState(existente?.entraEnId ?? otra)
  const [importe, setImporte] = useState(valorDe(existente?.importe, eq))
  const [fecha, setFecha] = useState(existente?.fecha ?? hoy)
  const lectura = leerImporte(importe, eq)
  const saldos = saldosPorDominio(documento)
  const devuelto = existente !== undefined && existente.saleDeId === saleDeId ? existente.importe.base : 0
  const queda = (saldos[saleDeId] ?? 0) + devuelto - (lectura.tipo === 'valido' ? lectura.base : 0)

  async function guardar(): Promise<void> {
    if (saleDeId === entraEnId) {
      throw new Error('«Sale de» y «Entra en» tienen que ser distintos')
    }
    const datos = { saleDeId, entraEnId, importe: importeDe(importe, eq), fecha }
    await editar((doc, sello) =>
      existente === undefined
        ? crearTransferencia(doc, datos, sello).estado
        : editarTransferencia(doc, existente.id, datos, sello),
    )
  }

  return (
    <DialogoFormulario
      titulo={existente === undefined ? 'Transferencia' : 'Editar transferencia'}
      subtitulo={`La cuenta de origen quedará en ${formatearOro(queda, eq)}`}
      alCerrar={props.alCerrar}
      alGuardar={guardar}
      textoGuardar={queda < 0 ? 'Transferir igualmente' : 'Transferir'}
      eliminar={
        existente === undefined
          ? undefined
          : {
              titulo: '¿Eliminar la transferencia?',
              subtitulo: fechaCorta(existente.fecha, hoy),
              resumen: [{ etiqueta: 'Se borran los dos lados', valor: formatearOro(existente.importe.base, eq) }],
              alEliminar: () => editar((doc) => eliminarTransferencia(doc, existente.id)),
            }
      }
    >
      <CampoImporte etiqueta="Importe" valor={importe} alCambiar={setImporte} equivalencias={eq} />
      <CampoCuenta etiqueta="Sale de" valor={saleDeId} alCambiar={setSale} />
      <CampoCuenta etiqueta="Entra en" valor={entraEnId} alCambiar={setEntra} />
      <CampoFecha
        etiqueta="Fecha"
        valor={fecha}
        alCambiar={(f) => f !== null && setFecha(f)}
        hoy={hoy}
        edad={documento.partida.edad}
      />
      {queda < 0 && (
        <Aviso tono="lacre" icono="alerta">
          La cuenta quedará en negativo. Puedes guardarlo: Inicio lo marcará en rojo hasta que vuelva a 0 o más, y los
          gastos que no se puedan pagar al avanzar días quedarán como impagos.
        </Aviso>
      )}
    </DialogoFormulario>
  )
}

type Abierto = { tipo: 'nuevo' } | { tipo: 'transferencia'; id?: string } | { tipo: 'editar'; movimiento: Movimiento } | { tipo: 'venta'; movimiento: Movimiento }

/** J2 y A2: el libro de una bolsa o de una caja, con lo programado encima (§6.2). */
export function Libro({ dominioId, titulo, enPestana }: { dominioId: string; titulo: string; enPestana?: boolean }) {
  const { documento, catalogo, navegar } = usePartida()
  const [abierto, setAbierto] = useState<Abierto | null>(null)
  const [periodo, setPeriodo] = useState('')
  const [categoria, setCategoria] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const dominio = documento.dominios.find((d) => d.id === dominioId)
  const nombreCategoria = (id: string): string => catalogo.opciones.find((o) => o.id === id)?.nombre ?? ''
  const ultimoAvance = documento.avances[documento.avances.length - 1]

  const todos = documento.movimientos.filter((m) => m.dominioId === dominioId)
  const programados = todos.filter((m) => m.programado).sort((a, b) => compararFechas(a.fecha, b.fecha))
  const filtrados = todos
    .filter((m) => !m.programado)
    .filter((m) => categoria === '' || m.categoriaId === categoria)
    .filter((m) => busqueda.trim() === '' || buscarEn(m.concepto, busqueda) !== null)
    .filter((m) => periodo !== 'avance' || m.avanceId === ultimoAvance?.id)
    .filter((m) => periodo !== 'mes' || (m.fecha.mes === hoy.mes && m.fecha.anio === hoy.anio))
    .sort((a, b) => compararFechas(b.fecha, a.fecha))
  const caja = documento.cajas.find((c) => c.dominioId === dominioId)

  /** El editar de un movimiento vinculado abre su origen (§6.4). */
  function abrir(m: Movimiento): void {
    const vinculo = m.vinculo
    if (vinculo === undefined) {
      setAbierto({ tipo: 'editar', movimiento: m })
    } else if (vinculo.tipo === 'transferencia') {
      setAbierto({ tipo: 'transferencia', id: vinculo.id })
    } else if (vinculo.tipo === 'venta') {
      setAbierto({ tipo: 'venta', movimiento: m })
    } else {
      const esPersonaje = dominio?.tipo === 'personaje'
      const seccion = {
        altaDeuda: esPersonaje ? 'deudas' : 'tesoreria',
        pagoDeuda: esPersonaje ? 'deudas' : 'tesoreria',
        capitalInversion: 'inversiones',
        retiradaInversion: 'inversiones',
        pergamino: 'hechizos',
        obra: 'produccion',
        caravana: 'comercio',
        entradaAlmacen: 'comercio',
      } as const
      navegar({ tipo: 'dominio', dominioId, seccion: seccion[vinculo.tipo] })
    }
  }

  const filas = (lista: readonly Movimiento[]) =>
    lista.map((m) => [
      fechaCorta(m.fecha, hoy),
      <span key="c">
        {m.concepto}
        {m.programado && <span className={estilos.suave}> · Programado</span>}
      </span>,
      nombreCategoria(m.categoriaId),
      <span key="i" className={m.importe.base < 0 ? estilos.negativo : estilos.positivo}>
        {formatearOro(m.importe.base, eq, { signo: true })}
        {m.importe.introducido !== undefined && (
          <span className={estilos.suave}> ({formatearIntroducido(m.importe.introducido)})</span>
        )}
      </span>,
      <BotonIcono key="e" icono="editar" variante="fantasma" etiqueta={`Editar ${m.concepto}`} alPulsar={() => abrir(m)} />,
    ])
  const columnas = [
    { titulo: 'Fecha', ancho: '120px' },
    { titulo: 'Concepto' },
    { titulo: 'Categoría', ancho: '170px' },
    { titulo: 'Importe', derecha: true },
    { titulo: ' ', ancho: '56px' },
  ]
  const venta =
    abierto?.tipo === 'venta' ? documento.ventas.find((v) => v.id === abierto.movimiento.vinculo?.id) : undefined

  const acciones = (
    <div className={estilos.fila}>
      <Boton variante="secundario" icono="cambio" alPulsar={() => setAbierto({ tipo: 'transferencia' })}>
        Transferencia
      </Boton>
      <Boton variante="principal" icono="mas" alPulsar={() => setAbierto({ tipo: 'nuevo' })}>
        Nuevo movimiento
      </Boton>
    </div>
  )

  return (
    <>
      {enPestana ? (
        <div className={estilos.extremos}>
          <strong className={estilos.cifra}>{formatearOro(saldosPorDominio(documento)[dominioId] ?? 0, eq)}</strong>
          {acciones}
        </div>
      ) : (
        <CabeceraPantalla
          titulo={titulo}
          subtitulo={`${dominio?.nombre ?? ''} · ${formatearOro(saldosPorDominio(documento)[dominioId] ?? 0, eq)}`}
          acciones={acciones}
        />
      )}
      <div className={estilos.rejilla3}>
        <CampoOpcion
          etiqueta="Periodo"
          valor={periodo}
          opciones={[
            { valor: '', texto: 'Todo' },
            { valor: 'mes', texto: 'Este mes' },
            { valor: 'avance', texto: 'Último avance' },
          ]}
          alCambiar={setPeriodo}
        />
        <CampoOpcion
          etiqueta="Filtrar por categoría"
          valor={categoria}
          opciones={[
            { valor: '', texto: 'Todas' },
            ...[...new Set(todos.map((m) => m.categoriaId))].map((id) => ({ valor: id, texto: nombreCategoria(id) })),
          ]}
          alCambiar={setCategoria}
        />
        <CampoTexto etiqueta="Buscar" valor={busqueda} alCambiar={setBusqueda} />
      </div>
      {programados.length > 0 && (
        <Panel titulo="Programados">
          <Tabla etiqueta="Programados" columnas={columnas} filas={filas(programados)} />
        </Panel>
      )}
      <Panel titulo="Movimientos">
        {filtrados.length === 0 ? (
          <Nota>No hay movimientos</Nota>
        ) : (
          <Tabla etiqueta="Movimientos" columnas={columnas} filas={filas(filtrados)} />
        )}
        <p className={estilos.suave}>Saldo inicial: {formatearOro(caja?.saldoInicial.base ?? 0, eq)}</p>
      </Panel>
      {abierto?.tipo === 'nuevo' && <DialogoMovimiento dominioId={dominioId} alCerrar={() => setAbierto(null)} />}
      {abierto?.tipo === 'editar' && (
        <DialogoMovimiento dominioId={dominioId} movimiento={abierto.movimiento} alCerrar={() => setAbierto(null)} />
      )}
      {abierto?.tipo === 'transferencia' && (
        <DialogoTransferencia dominioId={dominioId} transferenciaId={abierto.id} alCerrar={() => setAbierto(null)} />
      )}
      {venta !== undefined && <DialogoVenta venta={venta} alCerrar={() => setAbierto(null)} />}
    </>
  )
}
