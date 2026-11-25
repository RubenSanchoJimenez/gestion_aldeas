import { useState } from 'react'
import { formatearOro } from '../../dominio/dinero/formato'
import { personaPorNombre } from '../../dominio/edicion/listas'
import { editarVenta, eliminarVenta, venderObjeto, vistaPreviaDeVenta } from '../../dominio/edicion/ventas'
import type { ObjetoInventario, Venta } from '../../dominio/modelo/personaje'
import { CampoTexto } from '../comunes/Campo'
import { CampoFecha } from '../comunes/CampoFecha'
import { CampoImporte } from '../comunes/CampoImporte'
import { leerImporte } from '../comunes/leerImporte'
import { ListaPares } from '../comunes/Tabla'
import { CampoCuenta, CampoPersona } from '../formulario/campos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { enteroDe, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'

/** J3b: vender unidades de un objeto, o editar una venta desde el libro con sus datos cargados. */
export function DialogoVenta(props: { objeto?: ObjetoInventario; venta?: Venta; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { venta } = props
  const objeto = props.objeto ?? documento.objetos.find((o) => o.id === venta?.objetoId)
  const cobro = documento.movimientos.find((m) => m.id === venta?.movimientoId)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const [cantidad, setCantidad] = useState(String(venta?.cantidad ?? 1))
  const [precio, setPrecio] = useState(valorDe(venta?.precioUnitario ?? objeto?.valorUnitario, eq))
  const [cuenta, setCuenta] = useState(cobro?.dominioId ?? objeto?.dominioId ?? '')
  const [comprador, setComprador] = useState(documento.personas.find((p) => p.id === venta?.compradorId)?.nombre ?? '')
  const [fecha, setFecha] = useState(cobro?.fecha ?? hoy)
  const lectura = leerImporte(precio, eq)
  const unidades = /^\d+$/.test(cantidad) ? Number(cantidad) : 0
  const previa =
    venta === undefined && objeto !== undefined && lectura.tipo === 'valido'
      ? vistaPreviaDeVenta(documento, objeto.id, {
          cantidad: unidades,
          precioUnitario: { base: lectura.base },
          cuentaId: cuenta,
          fecha,
        })
      : null

  async function guardar(): Promise<void> {
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
      if (venta !== undefined) {
        return editarVenta(base, venta.id, { ...datos, compradorId }, sello)
      }
      return venderObjeto(base, objeto!.id, { ...datos, compradorId }, sello).estado
    })
  }

  const nombre = venta?.nombre ?? objeto?.nombre ?? ''
  return (
    <DialogoFormulario
      titulo={venta === undefined ? 'Vender objeto' : 'Editar venta'}
      subtitulo={venta === undefined ? `${nombre} · tienes ${objeto?.cantidad ?? 0}` : nombre}
      alCerrar={props.alCerrar}
      alGuardar={guardar}
      textoGuardar={venta === undefined ? 'Vender' : 'Guardar'}
      eliminar={
        venta === undefined
          ? undefined
          : {
              titulo: `¿Eliminar la venta de «${venta.nombre}»?`,
              subtitulo: 'Se borra su cobro y vuelven las unidades',
              resumen: [{ etiqueta: 'Cobrado', valor: formatearOro(venta.cantidad * venta.precioUnitario.base, eq) }],
              alEliminar: () => editar((doc, sello) => eliminarVenta(doc, venta.id, sello)),
            }
      }
    >
      <CampoTexto etiqueta="Cantidad vendida" modoTeclado="numeric" valor={cantidad} alCambiar={setCantidad} />
      <CampoImporte etiqueta="Precio por unidad" valor={precio} alCambiar={setPrecio} equivalencias={eq} />
      <CampoCuenta etiqueta="Entra en" valor={cuenta} alCambiar={setCuenta} />
      <CampoPersona etiqueta="Comprador (opcional)" valor={comprador} alCambiar={setComprador} />
      <CampoFecha
        etiqueta="Fecha"
        valor={fecha}
        alCambiar={(f) => f !== null && setFecha(f)}
        hoy={hoy}
        edad={documento.partida.edad}
        maximo={hoy}
      />
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
