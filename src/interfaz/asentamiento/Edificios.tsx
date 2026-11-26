import { useMemo, useState } from 'react'
import { proximasProducciones } from '../../dominio/almacen/prevision'
import { asignadosPorEdificio } from '../../dominio/almacen/produccion'
import { frecuenciaInicial, TEXTO_TIPO } from '../../dominio/calendario/formularioFrecuencia'
import type { Recurrencia } from '../../dominio/calendario/recurrencia'
import { formatearOro } from '../../dominio/dinero/formato'
import { bloqueoAlEliminarEdificio, crearEdificio, eliminarEdificio, guardarEdificio } from '../../dominio/edicion/edificios'
import type { Edificio } from '../../dominio/modelo/asentamiento'
import type { RecurrenciaProduccion } from '../../dominio/modelo/comunes'
import { Boton } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CampoFrecuencia } from '../comunes/CampoFrecuencia'
import { Segmentos } from '../comunes/Segmentos'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { decimalDe, enteroDe, fechaCorta } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'
import { CampoCatalogo, CampoRecurso, ListaRegistros } from './comunes'
import { conUnidad, nombreDelRecurso, nombreDeOpcion } from './nombres'

const ESTADOS: Record<Edificio['estado'], string> = {
  activo: 'Activo',
  daniado: 'Dañado',
  inactivo: 'Inactivo',
  alquilado: 'Alquilado',
}

interface FilaProduccion {
  id?: string
  recursoId: string
  cantidad: string
  recurrencia: Recurrencia
}

/** A7b: el edificio con sus producciones. */
function DialogoEdificio(props: { dominioId: string; edificio?: Edificio; alCerrar: () => void }) {
  const { documento, catalogo, editar } = usePartida()
  const { edificio } = props
  const hoy = documento.partida.fechaActual
  const [nombre, setNombre] = useState(edificio?.nombre ?? '')
  const [tipo, setTipo] = useState(edificio?.tipoId ?? '')
  const [necesarios, setNecesarios] = useState(String(edificio?.trabajadoresNecesarios ?? 0))
  const [estado, setEstado] = useState<Edificio['estado']>(edificio?.estado ?? 'activo')
  const [filas, setFilas] = useState<FilaProduccion[]>(
    edificio?.producciones.map((p) => ({
      id: p.id,
      recursoId: p.recursoId,
      cantidad: String(p.cantidad).replace('.', ','),
      recurrencia: p.recurrencia,
    })) ?? [],
  )
  const cambiar = (i: number, parche: Partial<FilaProduccion>): void =>
    setFilas(filas.map((f, j) => (j === i ? { ...f, ...parche } : f)))
  const bloqueo = edificio === undefined ? null : bloqueoAlEliminarEdificio(documento, edificio.id)

  return (
    <DialogoFormulario
      titulo={edificio === undefined ? 'Añadir edificio' : 'Editar edificio'}
      alCerrar={props.alCerrar}
      textoGuardar="Guardar cambios"
      alGuardar={async () => {
        if (tipo === '') {
          throw new Error('Elige el tipo de edificio')
        }
        if (nombre.trim() === '') {
          throw new Error('Escribe un nombre')
        }
        const datos = {
          tipoId: tipo,
          nombre: nombre.trim(),
          estado,
          trabajadoresNecesarios: enteroDe(necesarios, 'Trabajadores necesarios', 0, 100000),
          producciones: filas.map((f) => {
            if (f.recursoId === '') {
              throw new Error('Elige el recurso de cada producción')
            }
            return {
              id: f.id,
              recursoId: f.recursoId,
              cantidad: decimalDe(f.cantidad, 'Cantidad producida', 0.01),
              recurrencia: f.recurrencia as RecurrenciaProduccion,
            }
          }),
        }
        await editar((doc, sello) =>
          edificio === undefined
            ? crearEdificio(doc, { dominioId: props.dominioId, ...datos }, sello, catalogo).estado
            : guardarEdificio(doc, edificio.id, datos, sello, catalogo),
        )
      }}
      eliminar={
        edificio === undefined
          ? undefined
          : {
              titulo: `¿Eliminar «${edificio.nombre}»?`,
              subtitulo: bloqueo ?? 'Edificio',
              resumen: [
                { etiqueta: 'Sus trabajadores', valor: 'Quedan sin edificio' },
                { etiqueta: 'Lo acumulado en sus producciones', valor: 'Se pierde' },
              ],
              alEliminar: () => editar((doc) => eliminarEdificio(doc, edificio.id)),
            }
      }
    >
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      <CampoCatalogo lista="tiposEdificio" etiqueta="Tipo de edificio" valor={tipo} alCambiar={setTipo} />
      <CampoTexto etiqueta="Trabajadores necesarios" modoTeclado="numeric" valor={necesarios} alCambiar={setNecesarios} />
      <Segmentos<Edificio['estado']>
        etiqueta="Estado"
        opciones={(Object.keys(ESTADOS) as Edificio['estado'][]).map((v) => ({ valor: v, texto: ESTADOS[v] }))}
        valor={estado}
        alCambiar={setEstado}
      />
      {filas.map((f, i) => (
        <fieldset key={f.id ?? i} className={estilos.grupo}>
          <legend>Producción {i + 1}</legend>
          <CampoRecurso valor={f.recursoId} alCambiar={(recursoId) => cambiar(i, { recursoId })} />
          <CampoTexto etiqueta="Cantidad base" modoTeclado="decimal" valor={f.cantidad} alCambiar={(cantidad) => cambiar(i, { cantidad })} />
          <CampoFrecuencia
            etiqueta="Cada"
            sinUnica
            valor={f.recurrencia}
            alCambiar={(recurrencia) => cambiar(i, { recurrencia })}
            hoy={hoy}
            edad={documento.partida.edad}
            guardada={edificio?.producciones.find((p) => p.id === f.id)?.recurrencia}
          />
          <Boton variante="fantasma" icono="x" alPulsar={() => setFilas(filas.filter((_, j) => j !== i))}>
            Quitar producto
          </Boton>
        </fieldset>
      ))}
      <div>
        <Boton
          variante="secundario"
          icono="mas"
          alPulsar={() => setFilas([...filas, { recursoId: '', cantidad: '', recurrencia: frecuenciaInicial('semanal', hoy) }])}
        >
          Añadir producto
        </Boton>
      </div>
    </DialogoFormulario>
  )
}

/** A7: los edificios y lo que producirán la próxima vez. */
export function Edificios({ dominioId }: { dominioId: string }) {
  const { documento, catalogo } = usePartida()
  const [abierto, setAbierto] = useState<{ edificio?: Edificio } | null>(null)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const suyos = useMemo(() => documento.edificios.filter((e) => e.dominioId === dominioId), [documento, dominioId])
  const asignados = asignadosPorEdificio(documento.trabajadores)
  const proximas = useMemo(
    () => new Map(suyos.map((e) => [e.id, proximasProducciones(documento, catalogo, e.id)])),
    [documento, catalogo, suyos],
  )
  return (
    <>
      <ListaRegistros
        titulo="Edificios"
        textoAlta="Añadir edificio"
        alAnadir={() => setAbierto({})}
        registros={suyos}
        columnas={[
          { titulo: 'Edificio' },
          { titulo: 'Estado' },
          { titulo: 'Trabajadores', derecha: true },
          { titulo: 'Produce' },
          { titulo: 'Cada' },
        ]}
        nombreDe={(e) => e.nombre}
        fila={(e) => {
          const renta = documento.impuestosRentas.find((r) => r.edificioId === e.id)
          return [
            // El tipo solo se añade si el nombre no lo dice ya.
            e.nombre === nombreDeOpcion(catalogo, e.tipoId)
              ? e.nombre
              : `${e.nombre} · ${nombreDeOpcion(catalogo, e.tipoId)}`,
            `${ESTADOS[e.estado]}${renta === undefined ? '' : ` · renta ${formatearOro(renta.importe.base, eq)}`}`,
            `${asignados.get(e.id) ?? 0} de ${e.trabajadoresNecesarios}`,
            <span key="p">
              {(proximas.get(e.id) ?? []).map((p) => (
                <span key={p.produccionId} style={{ display: 'block' }}>
                  {p.cantidad === undefined
                    ? nombreDelRecurso(catalogo, p.recursoId)
                    : conUnidad(catalogo, p.recursoId, p.cantidad)}
                  {p.fecha === null ? '' : ` el ${fechaCorta(p.fecha, hoy)}`}
                </span>
              ))}
            </span>,
            <span key="c">
              {e.producciones.map((p) => (
                <span key={p.id} style={{ display: 'block' }}>
                  {TEXTO_TIPO[p.recurrencia.tipo]}
                </span>
              ))}
            </span>,
          ]
        }}
        alEditar={(edificio) => setAbierto({ edificio })}
      />
      {abierto !== null && <DialogoEdificio dominioId={dominioId} edificio={abierto.edificio} alCerrar={() => setAbierto(null)} />}
    </>
  )
}
