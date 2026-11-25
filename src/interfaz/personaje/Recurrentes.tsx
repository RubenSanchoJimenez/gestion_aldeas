import { useState } from 'react'
import { frecuenciaInicial, proximaFecha, TEXTO_TIPO } from '../../dominio/calendario/formularioFrecuencia'
import type { Recurrencia } from '../../dominio/calendario/recurrencia'
import { formatearOro } from '../../dominio/dinero/formato'
import { crearRecurrente, editarRecurrente } from '../../dominio/edicion/recurrentes'
import { cambiarActivo, eliminarRecurrente } from '../../dominio/edicion/reglas'
import type { RecurrenteDinero } from '../../dominio/modelo/movimientos'
import { Boton, BotonIcono } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CampoFrecuencia } from '../comunes/CampoFrecuencia'
import { CampoImporte } from '../comunes/CampoImporte'
import { Casilla } from '../comunes/Casilla'
import { CabeceraPantalla, Nota, Panel } from '../comunes/Panel'
import { Segmentos } from '../comunes/Segmentos'
import { Tabla } from '../comunes/Tabla'
import { CampoCategoria, CampoCuenta } from '../formulario/campos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { fechaCorta, importeDe, valorDe } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'

function DialogoRecurrente(props: { dominioId: string; regla?: RecurrenteDinero; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const { regla } = props
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const edad = documento.partida.edad
  const [tipo, setTipo] = useState<RecurrenteDinero['tipo']>(regla?.tipo ?? 'gasto')
  const [concepto, setConcepto] = useState(regla?.concepto ?? '')
  const [importe, setImporte] = useState(valorDe(regla?.importe, eq))
  const [categoria, setCategoria] = useState(regla?.categoriaId ?? '')
  const [cuenta, setCuenta] = useState(regla?.cuentaId ?? props.dominioId)
  const [recurrencia, setRecurrencia] = useState<Recurrencia>(regla?.recurrencia ?? frecuenciaInicial('mensual', hoy))
  const [activo, setActivo] = useState(regla?.activo ?? true)

  async function guardar(): Promise<void> {
    if (categoria === '') {
      throw new Error('Elige una categoría')
    }
    const datos = {
      dominioId: regla?.dominioId ?? props.dominioId,
      tipo,
      concepto,
      importe: importeDe(importe, eq),
      categoriaId: categoria,
      cuentaId: cuenta,
      recurrencia,
      activo,
      notas: regla?.notas,
      unidadDiaria: regla?.unidadDiaria,
    }
    await editar((doc, sello) =>
      regla === undefined ? crearRecurrente(doc, datos, sello).estado : editarRecurrente(doc, regla.id, datos, sello),
    )
  }

  return (
    <DialogoFormulario
      titulo={regla === undefined ? 'Añadir gasto o ingreso' : 'Editar gasto o ingreso'}
      subtitulo={regla === undefined ? undefined : 'Cambia esta y las próximas ocurrencias'}
      alCerrar={props.alCerrar}
      alGuardar={guardar}
      eliminar={
        regla === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${regla.concepto}»?`,
              subtitulo: 'Gasto o ingreso recurrente',
              resumen: [{ etiqueta: 'Sus movimientos pasados', valor: 'Se conservan' }],
              alEliminar: () => editar((doc) => eliminarRecurrente(doc, regla.id)),
            }
      }
    >
      <Segmentos<RecurrenteDinero['tipo']>
        etiqueta="Tipo"
        opciones={[
          { valor: 'gasto', texto: 'Gasto' },
          { valor: 'ingreso', texto: 'Ingreso' },
        ]}
        valor={tipo}
        alCambiar={setTipo}
      />
      <CampoTexto etiqueta="Concepto" maximo={120} valor={concepto} alCambiar={setConcepto} />
      <CampoImporte etiqueta="Importe" valor={importe} alCambiar={setImporte} equivalencias={eq} />
      <CampoCategoria valor={categoria} alCambiar={setCategoria} />
      <CampoCuenta etiqueta={tipo === 'gasto' ? 'Sale de' : 'Entra en'} valor={cuenta} alCambiar={setCuenta} />
      <CampoFrecuencia
        etiqueta="Frecuencia"
        etiquetaFecha={tipo === 'gasto' ? 'Primer pago' : 'Primer cobro'}
        valor={recurrencia}
        alCambiar={setRecurrencia}
        hoy={hoy}
        edad={edad}
        guardada={regla?.recurrencia}
      />
      <Casilla etiqueta="Activo" marcada={activo} alCambiar={setActivo} />
    </DialogoFormulario>
  )
}

/** J5: gastos e ingresos recurrentes. */
export function Recurrentes({ dominioId }: { dominioId: string }) {
  const { documento, editar } = usePartida()
  const [abierto, setAbierto] = useState<RecurrenteDinero | 'nuevo' | null>(null)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const reglas = documento.recurrentes.filter((r) => r.dominioId === dominioId)

  return (
    <>
      <CabeceraPantalla
        titulo="Gastos e ingresos recurrentes"
        acciones={
          <Boton variante="principal" icono="mas" alPulsar={() => setAbierto('nuevo')}>
            Añadir gasto o ingreso
          </Boton>
        }
      />
      {(['gasto', 'ingreso'] as const).map((tipo) => {
        const suyas = reglas.filter((r) => r.tipo === tipo)
        return (
          <Panel key={tipo} titulo={tipo === 'gasto' ? 'Gastos' : 'Ingresos'}>
            {suyas.length === 0 ? (
              <Nota>Nada anotado</Nota>
            ) : (
              <Tabla
                etiqueta={tipo === 'gasto' ? 'Gastos' : 'Ingresos'}
                columnas={[
                  { titulo: 'Concepto' },
                  { titulo: 'Importe', derecha: true },
                  { titulo: 'Frecuencia' },
                  { titulo: 'Próximo' },
                  { titulo: 'Estado', ancho: '130px' },
                  { titulo: ' ', ancho: '56px' },
                ]}
                filas={suyas.map((r) => {
                  const proxima = r.activo ? proximaFecha(r.recurrencia, hoy) : null
                  const ultimo = documento.movimientos.filter((m) => m.regla?.id === r.id).at(-1)
                  return [
                    <span key="c">
                      {r.concepto}
                      {ultimo !== undefined && <span className={estilos.suave}> · último {fechaCorta(ultimo.fecha, hoy)}</span>}
                    </span>,
                    formatearOro(r.importe.base, eq),
                    TEXTO_TIPO[r.recurrencia.tipo],
                    proxima === null ? '—' : fechaCorta(proxima, hoy),
                    <Boton
                      key="a"
                      variante="secundario"
                      alPulsar={() => void editar((doc, sello) => cambiarActivo(doc, r.id, !r.activo, sello))}
                    >
                      {r.activo ? 'Activo' : 'En pausa'}
                    </Boton>,
                    <BotonIcono key="e" icono="editar" variante="fantasma" etiqueta={`Editar ${r.concepto}`} alPulsar={() => setAbierto(r)} />,
                  ]
                })}
              />
            )}
          </Panel>
        )
      })}
      {abierto !== null && (
        <DialogoRecurrente dominioId={dominioId} regla={abierto === 'nuevo' ? undefined : abierto} alCerrar={() => setAbierto(null)} />
      )}
    </>
  )
}
