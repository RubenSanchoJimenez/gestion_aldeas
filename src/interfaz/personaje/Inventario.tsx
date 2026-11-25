import { useState } from 'react'
import { formatearOro } from '../../dominio/dinero/formato'
import { personaPorNombre, ubicacionPorNombre } from '../../dominio/edicion/listas'
import { crearObjeto, editarObjeto, eliminarObjeto } from '../../dominio/edicion/objetos'
import { venderObjeto, vistaPreviaDeVenta } from '../../dominio/edicion/ventas'
import type { ObjetoInventario } from '../../dominio/modelo/personaje'
import { buscarEn } from '../../dominio/texto/buscar'
import { Boton, BotonIcono } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CampoFecha } from '../comunes/CampoFecha'
import { CampoImporte } from '../comunes/CampoImporte'
import { leerImporte } from '../comunes/leerImporte'
import { CabeceraPantalla, Nota, Panel } from '../comunes/Panel'
import { ListaPares, Tabla } from '../comunes/Tabla'
import {
  CampoCuenta,
  CampoOpcion,
  CampoPersona,
  CampoUbicacion,
  NUEVA_UBICACION,
} from '../formulario/campos'
import { claveDeUbicacion, ubicacionDeClave, ubicaciones } from '../formulario/ubicaciones'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { enteroDe, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'

function DialogoObjeto({ objeto, dominioId, alCerrar }: { objeto?: ObjetoInventario; dominioId: string; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const eq = documento.partida.equivalencias
  const [nombre, setNombre] = useState(objeto?.nombre ?? '')
  const [cantidad, setCantidad] = useState(String(objeto?.cantidad ?? 1))
  const [valor, setValor] = useState(valorDe(objeto?.valorUnitario, eq))
  const [ubicacion, setUbicacion] = useState(objeto === undefined ? 'encima' : claveDeUbicacion(objeto.ubicacion))
  const [nueva, setNueva] = useState('')
  const [notas, setNotas] = useState(objeto?.notas ?? '')

  async function guardar(): Promise<void> {
    const unidades = enteroDe(cantidad, 'Cantidad', objeto?.archivado === undefined ? 1 : 0)
    const valorUnitario = importeDe(valor, eq, 0)
    await editar((doc, sello) => {
      let base = doc
      let clave = ubicacion
      if (clave === NUEVA_UBICACION) {
        const creada = ubicacionPorNombre(base, nueva, sello)
        base = creada.estado
        clave = `propia|${creada.id}`
      }
      const datos = {
        nombre: nombre.trim(),
        cantidad: unidades,
        valorUnitario,
        ubicacion: ubicacionDeClave(clave),
        notas: notas.trim() === '' ? undefined : notas.trim(),
      }
      return objeto === undefined
        ? crearObjeto(base, { dominioId, ...datos }, sello).estado
        : editarObjeto(base, objeto.id, datos, sello)
    })
  }

  return (
    <DialogoFormulario
      titulo={objeto === undefined ? 'Añadir objeto' : 'Editar objeto'}
      alCerrar={alCerrar}
      alGuardar={guardar}
      eliminar={
        objeto === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${objeto.nombre}»?`,
              subtitulo: 'Objeto del inventario',
              resumen: [
                {
                  etiqueta: 'Sus ventas conservan nombre y valor',
                  valor: documento.pergaminos.some((p) => p.objetoInventarioId === objeto.id)
                    ? 'Se borra también el pergamino'
                    : '',
                },
              ],
              alEliminar: () => editar((doc) => eliminarObjeto(doc, objeto.id)),
            }
      }
    >
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      <CampoTexto etiqueta="Cantidad" modoTeclado="numeric" valor={cantidad} alCambiar={setCantidad} />
      <CampoImporte etiqueta="Valor por unidad" valor={valor} alCambiar={setValor} equivalencias={eq} />
      <CampoUbicacion valor={ubicacion} alCambiar={setUbicacion} nombreNueva={nueva} alCambiarNombre={setNueva} />
      <CampoTexto etiqueta="Notas" maximo={1000} valor={notas} alCambiar={setNotas} />
    </DialogoFormulario>
  )
}

/** J3b: vender unidades de un objeto, viendo lo que cambia. */
function DialogoVenta({ objeto, alCerrar }: { objeto: ObjetoInventario; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const [cantidad, setCantidad] = useState('1')
  const [precio, setPrecio] = useState(valorDe(objeto.valorUnitario, eq))
  const [cuenta, setCuenta] = useState(objeto.dominioId)
  const [comprador, setComprador] = useState('')
  const [fecha, setFecha] = useState(hoy)
  const lectura = leerImporte(precio, eq)
  const unidades = /^\d+$/.test(cantidad) ? Number(cantidad) : 0
  const previa =
    lectura.tipo === 'valido'
      ? vistaPreviaDeVenta(documento, objeto.id, {
          cantidad: unidades,
          precioUnitario: { base: lectura.base },
          cuentaId: cuenta,
          fecha,
        })
      : null

  async function vender(): Promise<void> {
    const datos = {
      cantidad: enteroDe(cantidad, 'Cantidad'),
      precioUnitario: importeDe(precio, eq, 0),
      cuentaId: cuenta,
      fecha,
    }
    await editar((doc, sello) => {
      let base = doc
      let compradorId: string | undefined
      if (comprador.trim() !== '') {
        const persona = personaPorNombre(base, comprador, sello)
        base = persona.estado
        compradorId = persona.id
      }
      return venderObjeto(base, objeto.id, { ...datos, compradorId }, sello).estado
    })
  }

  return (
    <DialogoFormulario titulo="Vender objeto" subtitulo={`${objeto.nombre} · tienes ${objeto.cantidad}`} alCerrar={alCerrar} alGuardar={vender} textoGuardar="Vender">
      <CampoTexto etiqueta="Cantidad" modoTeclado="numeric" valor={cantidad} alCambiar={setCantidad} />
      <CampoImporte etiqueta="Precio por unidad" valor={precio} alCambiar={setPrecio} equivalencias={eq} />
      <CampoCuenta etiqueta="Entra en" valor={cuenta} alCambiar={setCuenta} />
      <CampoPersona etiqueta="Comprador (opcional)" valor={comprador} alCambiar={setComprador} />
      <CampoFecha etiqueta="Fecha" valor={fecha} alCambiar={(f) => f !== null && setFecha(f)} hoy={hoy} edad={documento.partida.edad} maximo={hoy} />
      {previa !== null && (
        <ListaPares
          filas={[
            { etiqueta: 'Se cobra', valor: formatearOro(previa.total, eq) },
            { etiqueta: 'Diferencia con el valor anotado', valor: formatearOro(previa.diferencia, eq, { signo: true }) },
            { etiqueta: 'La cuenta quedará en', valor: formatearOro(previa.saldoDespues, eq) },
            { etiqueta: 'Patrimonio', valor: formatearOro(previa.patrimonioDespues, eq) },
          ]}
        />
      )}
    </DialogoFormulario>
  )
}

/** J3: el inventario valorado. */
export function Inventario({ dominioId }: { dominioId: string }) {
  const { documento } = usePartida()
  const [filtro, setFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<ObjetoInventario | 'nuevo' | null>(null)
  const [vendiendo, setVendiendo] = useState<ObjetoInventario | null>(null)
  const eq = documento.partida.equivalencias
  const lugares = ubicaciones(documento)
  const propios = documento.objetos.filter((o) => o.dominioId === dominioId)
  const activos = propios.filter((o) => o.archivado === undefined)
  const total = activos.reduce((suma, o) => suma + o.cantidad * o.valorUnitario.base, 0)
  const visibles = (filtro === 'vendidos' ? propios.filter((o) => o.archivado === 'vendido') : activos)
    .filter((o) => filtro === '' || filtro === 'vendidos' || claveDeUbicacion(o.ubicacion) === filtro)
    .filter(
      (o) => busqueda.trim() === '' || buscarEn(o.nombre, busqueda) !== null || buscarEn(o.notas ?? '', busqueda) !== null,
    )
  const filtrado = visibles.reduce((suma, o) => suma + o.cantidad * o.valorUnitario.base, 0)

  return (
    <>
      <CabeceraPantalla
        titulo="Inventario"
        subtitulo={`Valor: ${formatearOro(total, eq)}`}
        acciones={
          <Boton variante="principal" icono="mas" alPulsar={() => setEditando('nuevo')}>
            Añadir objeto
          </Boton>
        }
      />
      <div className={estilos.rejilla2}>
        <CampoOpcion
          etiqueta="Filtrar por ubicación"
          valor={filtro}
          opciones={[{ valor: '', texto: 'Todas' }, ...lugares, { valor: 'vendidos', texto: 'Vendidos' }]}
          alCambiar={setFiltro}
        />
        <CampoTexto etiqueta="Buscar" valor={busqueda} alCambiar={setBusqueda} />
      </div>
      <Panel titulo="Objetos">
        {visibles.length === 0 ? (
          <Nota>No hay objetos</Nota>
        ) : (
          <Tabla
            etiqueta="Objetos"
            columnas={[
              { titulo: 'Objeto' },
              { titulo: 'Cantidad', derecha: true },
              { titulo: 'Valor', derecha: true },
              { titulo: 'Total', derecha: true },
              { titulo: 'Ubicación' },
              { titulo: ' ', ancho: '170px' },
            ]}
            filas={visibles.map((o) => [
              <span key="n">
                {o.nombre}
                {o.notas !== undefined && <span className={estilos.suave}> · {o.notas}</span>}
              </span>,
              o.cantidad,
              formatearOro(o.valorUnitario.base, eq),
              formatearOro(o.cantidad * o.valorUnitario.base, eq),
              lugares.find((l) => l.valor === claveDeUbicacion(o.ubicacion))?.texto ?? '',
              o.archivado === undefined ? (
                <span key="a" className={estilos.fila}>
                  <Boton variante="secundario" alPulsar={() => setVendiendo(o)}>
                    Vender
                  </Boton>
                  <BotonIcono icono="editar" variante="fantasma" etiqueta={`Editar ${o.nombre}`} alPulsar={() => setEditando(o)} />
                </span>
              ) : (
                <span key="a" className={estilos.suave}>
                  Vendido
                </span>
              ),
            ])}
          />
        )}
        {filtro !== '' && filtro !== 'vendidos' && (
          <p className={estilos.suave}>
            Valor de lo filtrado: {formatearOro(filtrado, eq)} de {formatearOro(total, eq)}
          </p>
        )}
      </Panel>
      {editando !== null && (
        <DialogoObjeto dominioId={dominioId} objeto={editando === 'nuevo' ? undefined : editando} alCerrar={() => setEditando(null)} />
      )}
      {vendiendo !== null && <DialogoVenta objeto={vendiendo} alCerrar={() => setVendiendo(null)} />}
    </>
  )
}
