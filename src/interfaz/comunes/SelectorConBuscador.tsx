import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { buscarEn } from '../../dominio/texto/buscar'
import { mismoNombre } from '../../dominio/texto/normalizar'
import { Icono } from '../iconos/Icono'
import { Boton, Enlace } from './Boton'
import { useNivelDialogo } from './nivelDialogo'
import estilos from './SelectorConBuscador.module.css'

export interface OpcionSelector<V extends string> {
  valor: V
  texto: string
  detalle?: string
  tuya?: boolean
}

export interface GrupoSelector<V extends string> {
  nombre?: string
  opciones: readonly OpcionSelector<V>[]
}

export interface AltaSelector {
  texto: string
  alPedir: (busqueda: string) => void
}

export interface PropsSelectorConBuscador<V extends string> {
  etiqueta: string
  etiquetaOculta?: boolean
  valor: V | null
  textoSinValor?: string
  grupos: readonly GrupoSelector<V>[]
  alCambiar: (valor: V) => void
  sustantivo: { singular: string; plural: string }
  recientes?: readonly V[]
  filtro?: { todas: OpcionSelector<V> }
  alta?: AltaSelector
  alinear?: 'izquierda' | 'derecha'
  ayuda?: string
  error?: string | null
  desactivado?: boolean
}

/** Recorta una búsqueda a 16 caracteres, con «…» si sobra (espec. L933). */
function recortar(busqueda: string): string {
  return busqueda.length > 16 ? `${busqueda.slice(0, 16)}…` : busqueda
}

/** El texto con la coincidencia de la búsqueda resaltada en `<strong>` (mjs L1389-1391). */
function resaltar(texto: string, busqueda: string): ReactNode {
  const coincidencia = busqueda ? buscarEn(texto, busqueda) : null
  if (!coincidencia) {
    return texto
  }
  return (
    <>
      {texto.slice(0, coincidencia.inicio)}
      <strong>{texto.slice(coincidencia.inicio, coincidencia.fin)}</strong>
      {texto.slice(coincidencia.fin)}
    </>
  )
}

/** Si la opción coincide con la búsqueda, en su texto o en su detalle (espec. L862). */
function coincideOpcion<V extends string>(opcion: OpcionSelector<V>, busqueda: string): boolean {
  if (!busqueda) {
    return true
  }
  if (buscarEn(opcion.texto, busqueda)) {
    return true
  }
  return opcion.detalle ? buscarEn(opcion.detalle, busqueda) !== null : false
}

/** Una fila de la lista: `role="option"`, con su resaltado, su detalle y el `check` de la elegida (§6.10). */
function Fila<V extends string>(props: {
  opcion: OpcionSelector<V>
  elegida: boolean
  busqueda: string
  onElegir: (valor: V) => void
}) {
  return (
    <div
      role="option"
      aria-selected={props.elegida}
      data-valor={props.opcion.valor}
      onClick={() => props.onElegir(props.opcion.valor)}
      className={estilos.opcion}
    >
      <span>{resaltar(props.opcion.texto, props.busqueda)}</span>
      {props.opcion.detalle ? (
        <span className={estilos.detalle}>{resaltar(props.opcion.detalle, props.busqueda)}</span>
      ) : null}
      {props.opcion.tuya ? <span className={estilos.detalle}>tuya</span> : null}
      {props.elegida ? <Icono nombre="check" tamano={16} color="var(--oro-oscuro)" /> : null}
    </div>
  )
}

/**
 * SelectorConBuscador de §6.10: un combobox con buscador, grupos, «Recientes», modo filtro y pie de alta.
 * Con más de 12 opciones el buscador recibe el foco al abrir (espec. L860).
 */
export function SelectorConBuscador<V extends string>(props: PropsSelectorConBuscador<V>) {
  const [abierto, establecerAbierto] = useState(false)
  const [busqueda, establecerBusqueda] = useState('')
  const nivel = useNivelDialogo()
  const idEtiqueta = useId()
  const idLista = useId()
  const referenciaRaiz = useRef<HTMLDivElement>(null)
  const referenciaCampo = useRef<HTMLButtonElement>(null)
  const referenciaBuscador = useRef<HTMLInputElement>(null)

  const todasLasOpciones = useMemo(() => props.grupos.flatMap((grupo) => grupo.opciones), [props.grupos])
  const opcionElegida =
    props.valor === null
      ? null
      : ([...(props.filtro ? [props.filtro.todas] : []), ...todasLasOpciones].find(
          (opcion) => opcion.valor === props.valor,
        ) ?? null)

  function cerrar(devolverFoco: boolean) {
    establecerAbierto(false)
    establecerBusqueda('')
    if (devolverFoco) {
      referenciaCampo.current?.focus()
    }
  }

  function elegir(valor: V) {
    props.alCambiar(valor)
    cerrar(false)
  }

  // Con más de 12 opciones (sin repetir las de Recientes), el buscador recibe el foco al abrir.
  useEffect(() => {
    if (!abierto) {
      return
    }
    const total = todasLasOpciones.length + (props.filtro ? 1 : 0)
    if (total > 12) {
      referenciaBuscador.current?.focus()
    }
    // Solo al abrir: el resto de cambios de esta pasada no repiten el foco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  // Esc y tocar fuera cierran sin cambiar nada, y devuelven el foco al campo.
  useEffect(() => {
    if (!abierto) {
      return
    }
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        cerrar(true)
      }
    }
    function alPulsarFuera(evento: PointerEvent) {
      if (referenciaRaiz.current && !referenciaRaiz.current.contains(evento.target as Node)) {
        cerrar(true)
      }
    }
    document.addEventListener('keydown', alTeclear)
    document.addEventListener('pointerdown', alPulsarFuera)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.removeEventListener('pointerdown', alPulsarFuera)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const grupoRecientes: readonly OpcionSelector<V>[] =
    !busqueda && props.recientes && props.recientes.length > 0
      ? (props.recientes
          .slice(0, 5)
          .map((valor) => todasLasOpciones.find((opcion) => opcion.valor === valor))
          .filter((opcion): opcion is OpcionSelector<V> => opcion !== undefined) as readonly OpcionSelector<V>[])
      : []

  const gruposFiltrados = props.grupos
    .map((grupo) => ({
      nombre: grupo.nombre,
      opciones: grupo.opciones.filter((opcion) => coincideOpcion(opcion, busqueda)),
    }))
    .filter((grupo) => grupo.opciones.length > 0)

  const opcionesFiltradas = gruposFiltrados.flatMap((grupo) => grupo.opciones)
  const sinResultados = busqueda !== '' && opcionesFiltradas.length === 0

  const textoContador = busqueda
    ? `${opcionesFiltradas.length} de ${todasLasOpciones.length}`
    : todasLasOpciones.length === 1
      ? `1 ${props.sustantivo.singular}`
      : `${todasLasOpciones.length} ${props.sustantivo.plural}`

  const mostrarPieAlta = !!props.alta && !props.filtro && nivel < 2
  const coincidenciaExacta = busqueda ? todasLasOpciones.find((opcion) => mismoNombre(opcion.texto, busqueda)) : undefined

  function alPulsarAlta() {
    if (!props.alta) {
      return
    }
    const busquedaActual = busqueda
    cerrar(false)
    props.alta.alPedir(busquedaActual)
  }

  return (
    <div ref={referenciaRaiz} className={estilos.raiz}>
      <span
        id={idEtiqueta}
        style={props.etiquetaOculta ? { position: 'absolute', width: 1, height: 1, overflow: 'hidden' } : undefined}
      >
        {props.etiqueta}
      </span>
      <button
        ref={referenciaCampo}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        aria-labelledby={idEtiqueta}
        disabled={props.desactivado}
        onClick={() => (abierto ? cerrar(false) : establecerAbierto(true))}
        className={estilos.campo}
      >
        <span>{opcionElegida ? opcionElegida.texto : (props.textoSinValor ?? '')}</span>
        <Icono nombre="abajo" tamano={18} color="var(--tinta-suave)" />
      </button>
      {abierto ? (
        <div className={estilos.panel} style={{ [props.alinear === 'derecha' ? 'right' : 'left']: 0 }}>
          <div className={estilos.buscador}>
            <Icono nombre="buscar" tamano={18} />
            <input
              ref={referenciaBuscador}
              type="search"
              aria-label="Buscar"
              placeholder="Buscar"
              value={busqueda}
              onChange={(evento) => establecerBusqueda(evento.target.value)}
            />
            <span className={estilos.contador}>{textoContador}</span>
            {busqueda ? (
              <button type="button" aria-label="Borrar la búsqueda" onClick={() => establecerBusqueda('')}>
                <Icono nombre="x" tamano={16} />
              </button>
            ) : null}
          </div>
          <div role="listbox" id={idLista} aria-label={props.etiqueta} className={estilos.lista}>
            {props.filtro ? (
              <Fila
                opcion={props.filtro.todas}
                elegida={props.valor === props.filtro.todas.valor}
                busqueda=""
                onElegir={elegir}
              />
            ) : null}
            {!props.filtro && grupoRecientes.length > 0 ? (
              <div role="group" aria-label="Recientes">
                <div className={estilos.nombreGrupo}>Recientes</div>
                {grupoRecientes.map((opcion) => (
                  <Fila
                    key={opcion.valor}
                    opcion={opcion}
                    elegida={opcion.valor === props.valor}
                    busqueda={busqueda}
                    onElegir={elegir}
                  />
                ))}
              </div>
            ) : null}
            {gruposFiltrados.map((grupo, indice) =>
              grupo.nombre ? (
                <div key={grupo.nombre} role="group" aria-label={grupo.nombre}>
                  <div className={estilos.nombreGrupo}>{grupo.nombre}</div>
                  {grupo.opciones.map((opcion) => (
                    <Fila
                      key={opcion.valor}
                      opcion={opcion}
                      elegida={opcion.valor === props.valor}
                      busqueda={busqueda}
                      onElegir={elegir}
                    />
                  ))}
                </div>
              ) : (
                <div key={indice}>
                  {grupo.opciones.map((opcion) => (
                    <Fila
                      key={opcion.valor}
                      opcion={opcion}
                      elegida={opcion.valor === props.valor}
                      busqueda={busqueda}
                      onElegir={elegir}
                    />
                  ))}
                </div>
              ),
            )}
          </div>
          {sinResultados ? (
            <div className={estilos.sinResultados}>
              <p>Nada coincide con &ldquo;{busqueda}&rdquo;</p>
              <p>Busca en todas las categorías y grupos.</p>
            </div>
          ) : null}
          {mostrarPieAlta ? (
            coincidenciaExacta ? (
              <div className={estilos.pieAlta}>
                <Icono nombre="mas" tamano={16} />
                <span>&ldquo;{coincidenciaExacta.texto}&rdquo; ya existe</span>
              </div>
            ) : opcionesFiltradas.length > 0 ? (
              <div className={estilos.pieAlta}>
                <Enlace alPulsar={alPulsarAlta} icono="mas">
                  {busqueda ? `${props.alta!.texto} “${recortar(busqueda)}”` : props.alta!.texto}
                </Enlace>
              </div>
            ) : (
              <div className={estilos.pieAltaBoton}>
                <Boton variante="principal" icono="mas" ancho="100%" alPulsar={alPulsarAlta}>
                  {`${props.alta!.texto} “${recortar(busqueda)}”`}
                </Boton>
              </div>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
