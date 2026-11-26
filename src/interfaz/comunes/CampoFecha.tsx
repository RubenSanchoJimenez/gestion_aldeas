import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import {
  compararFechas,
  diaDeLaSemana,
  diasDelMes,
  nombreDeMesEnMensaje,
  sumarDias,
  sumarMeses,
  validarFecha,
  type Fecha,
} from '../../dominio/calendario/fecha'
import { formatearFecha, type Edad } from '../../dominio/calendario/formatoFecha'
import { FECHA_MAXIMA } from '../../dominio/calendario/formularioFrecuencia'
import { conMayuscula, leerFechaEscrita } from '../../dominio/calendario/textosFecha'
import { Icono } from '../iconos/Icono'
import { Boton, BotonIcono } from './Boton'
import { CampoTexto, EtiquetaCampo } from './Campo'
import estilos from './campos.module.css'
import { SelectorConBuscador } from './SelectorConBuscador'

export interface PropsCampoFecha {
  etiqueta: string
  valor: Fecha | null
  alCambiar: (f: Fecha | null) => void
  /** La fecha de la partida: de ella salen los atajos. */
  hoy: Fecha
  edad: Edad
  minimo?: Fecha
  maximo?: Fecha
  opcional?: boolean
  ayuda?: string
  error?: string | null
  desactivado?: boolean
}

const MESES = Array.from({ length: 12 }, (_, i) => ({
  valor: String(i + 1),
  texto: conMayuscula(nombreDeMesEnMensaje(i + 1)),
}))

/** Desplaza lo justo para que el calendario se vea entero. Es estable: solo actúa al abrirse. */
const verEntero = (panel: HTMLElement | null): void => panel?.scrollIntoView?.({ block: 'nearest' })

/** Selector de fecha de la partida (§6.5, n.º 3; D-097): escrita, con atajos o en el calendario del mes. */
export function CampoFecha(props: PropsCampoFecha) {
  const { etiqueta, valor, alCambiar, hoy, edad, minimo, maximo = FECHA_MAXIMA, opcional, desactivado } = props
  const [abierto, setAbierto] = useState(false)
  const [escrita, setEscrita] = useState('')
  const [errorEscrita, setErrorEscrita] = useState<string | null>(null)
  const [mesVisto, setMesVisto] = useState<Fecha>(valor ?? hoy)
  const caja = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!abierto) {
      return
    }
    const fuera = (e: Event): void => {
      if (!caja.current?.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [abierto])

  const enRango = (f: Fecha): boolean =>
    (minimo === undefined || compararFechas(f, minimo) >= 0) && compararFechas(f, maximo) <= 0

  function abrir(): void {
    setMesVisto(valor ?? hoy)
    setEscrita('')
    setErrorEscrita(null)
    setAbierto(!abierto)
  }

  function elegir(f: Fecha | null): void {
    alCambiar(f)
    setAbierto(false)
  }

  function leer(): void {
    const f = leerFechaEscrita(escrita)
    if (f === null) {
      setErrorEscrita('Escribe la fecha como 19/04/1640')
      return
    }
    const mal = validarFecha(f)
    if (mal !== null) {
      setErrorEscrita(mal)
    } else if (minimo !== undefined && compararFechas(f, minimo) < 0) {
      setErrorEscrita(`Tiene que ser posterior al ${formatearFecha(sumarDias(minimo, -1), { edad })}`)
    } else if (compararFechas(f, maximo) > 0) {
      setErrorEscrita(`No puede pasar del ${formatearFecha(maximo)}`)
    } else {
      elegir(f)
    }
  }

  function teclas(e: KeyboardEvent): void {
    if (e.key === 'Escape' && abierto) {
      e.preventDefault()
      e.stopPropagation()
      setAbierto(false)
    }
  }

  function moverMes(meses: number): void {
    const primero = sumarMeses({ ...mesVisto, dia: 1 }, meses)
    if (primero.anio >= 1 && primero.anio <= 9999) {
      setMesVisto(primero)
    }
  }

  const atajos = [
    { texto: 'Hoy', dias: 0 },
    { texto: 'Mañana', dias: 1 },
    { texto: '+7 días', dias: 7 },
  ]
    .map((a) => ({ texto: a.texto, fecha: sumarDias(hoy, a.dias) }))
    .filter((a) => enRango(a.fecha))

  const huecos = diaDeLaSemana({ anio: mesVisto.anio, mes: mesVisto.mes, dia: 1 })
  const celdas: (number | null)[] = [
    ...Array.from({ length: huecos }, () => null),
    ...Array.from({ length: diasDelMes(mesVisto.anio, mesVisto.mes) }, (_, i) => i + 1),
  ]
  const semanas = Array.from({ length: Math.ceil(celdas.length / 7) }, (_, i) => celdas.slice(i * 7, i * 7 + 7))

  return (
    <EtiquetaCampo etiqueta={etiqueta} idControl={id} ayuda={props.ayuda} error={props.error}>
      <div className={estilos.contenedor} ref={caja} onKeyDown={teclas}>
        <button
          id={id}
          type="button"
          className={estilos.botonFecha}
          aria-haspopup="dialog"
          aria-expanded={abierto}
          disabled={desactivado}
          onClick={abrir}
        >
          <span>{valor === null ? 'Sin fecha' : formatearFecha(valor, { edad })}</span>
          <Icono nombre="calendario" tamano={18} />
        </button>
        {abierto && (
          <div
            className={estilos.panel}
            role="dialog"
            aria-label={etiqueta}
            ref={verEntero}
          >
            <div
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  leer()
                }
              }}
            >
              <CampoTexto
                etiqueta="Escribe la fecha"
                placeholder="19/04/1640"
                modoTeclado="numeric"
                valor={escrita}
                alCambiar={setEscrita}
                error={errorEscrita}
              />
            </div>
            <div className={estilos.linea}>
              {atajos.map((a) => (
                <Boton key={a.texto} variante="secundario" alPulsar={() => elegir(a.fecha)}>
                  {a.texto}
                </Boton>
              ))}
            </div>
            <div className={estilos.linea}>
              <BotonIcono icono="izquierda" etiqueta="Mes anterior" alPulsar={() => moverMes(-1)} />
              <div className={estilos.mes}>
                <SelectorConBuscador
                  etiqueta="Mes"
                  etiquetaOculta
                  valor={String(mesVisto.mes)}
                  grupos={[{ opciones: MESES }]}
                  alCambiar={(m) => setMesVisto({ ...mesVisto, mes: Number(m), dia: 1 })}
                  sustantivo={{ singular: 'mes', plural: 'meses' }}
                />
              </div>
              <div className={estilos.anio}>
                <CampoTexto
                  etiqueta="Año"
                  etiquetaOculta
                  modoTeclado="numeric"
                  maximo={4}
                  valor={String(mesVisto.anio)}
                  alCambiar={(t) => {
                    const anio = Number(t)
                    if (Number.isInteger(anio) && anio >= 1 && anio <= 9999) {
                      setMesVisto({ ...mesVisto, anio, dia: 1 })
                    }
                  }}
                />
              </div>
              <BotonIcono icono="derecha" etiqueta="Mes siguiente" alPulsar={() => moverMes(1)} />
            </div>
            <table
              className={estilos.dias}
              role="grid"
              aria-label={`${nombreDeMesEnMensaje(mesVisto.mes)} de ${mesVisto.anio}`}
            >
              <thead>
                <tr>
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                    <th key={d}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semanas.map((semana, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }, (_, j) => {
                      const dia = semana[j]
                      if (dia === null || dia === undefined) {
                        return <td key={j} />
                      }
                      const f = { anio: mesVisto.anio, mes: mesVisto.mes, dia }
                      return (
                        <td key={j}>
                          <button
                            type="button"
                            className={estilos.dia}
                            aria-label={formatearFecha(f)}
                            aria-pressed={valor !== null && compararFechas(f, valor) === 0}
                            disabled={!enRango(f)}
                            onClick={() => elegir(f)}
                          >
                            {dia}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {opcional && (
              <Boton variante="fantasma" alPulsar={() => elegir(null)}>
                Sin fecha
              </Boton>
            )}
          </div>
        )}
      </div>
    </EtiquetaCampo>
  )
}
