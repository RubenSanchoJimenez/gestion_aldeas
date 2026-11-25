import { useState } from 'react'
import { crearPartida } from '../../datos/repositorio'
import { EQUIVALENCIAS_POR_DEFECTO } from '../../dominio/dinero/monedas'
import { cadenaDeEquivalencias } from '../../dominio/dinero/textosEquivalencias'
import { formatearFechaConDia } from '../../dominio/calendario/textosFecha'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import { documentoDePartidaNueva } from '../../dominio/partidas/nueva'
import { errorDeNombre } from '../../dominio/partidas/textos'
import { textoDeError, useServicios } from '../app/servicios'
import { Aviso } from '../comunes/Aviso'
import { Boton, Enlace } from '../comunes/Boton'
import { CampoTexto, EtiquetaCampo } from '../comunes/Campo'
import { FilaImporte } from '../comunes/CampoImporte'
import { CampoFechaInicial } from '../comunes/CampoFechaInicial'
import { DialogoMensaje } from '../comunes/Dialogo'
import {
  leerEquivalencias,
  leerFechaInicial,
  textosDe,
  type TextosEquivalencias,
  type ValorFechaInicial,
} from '../comunes/fechaInicial'
import { leerImporte, type ValorImporte } from '../comunes/leerImporte'
import { Nota } from '../comunes/Panel'
import { ResumenOro } from '../comunes/ResumenOro'
import { TablaMonedas } from '../comunes/TablaMonedas'
import { useTocados } from '../comunes/tocados'
import { Emblema } from '../iconos/Emblema'
import { Icono } from '../iconos/Icono'
import marco from '../marco/marco.module.css'
import estilos from './pantallas.module.css'

export interface PropsNuevaPartida {
  alCancelar: () => void
  alCrear: (documento: DocumentoPartida) => void
}

type FilaBolsa = ValorImporte & { clave: number }

/** P1 y P1b: el alta de una partida en dos pasos (§6.1; D-085 a D-088). */
export function NuevaPartida({ alCancelar, alCrear }: PropsNuevaPartida) {
  const { db, ahora, nuevoId } = useServicios()
  const [paso, setPaso] = useState<1 | 2>(1)
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha] = useState<ValorFechaInicial>({ dia: '1', mes: 1, anio: '', edad: 'tercera' })
  const [textos, setTextos] = useState<TextosEquivalencias>(textosDe(EQUIVALENCIAS_POR_DEFECTO))
  const [editarMonedas, setEditarMonedas] = useState(false)
  const [personaje, setPersonaje] = useState({ nombre: '', descripcion: '' })
  const [bolsa, setBolsa] = useState<FilaBolsa[]>([{ clave: 0, cantidad: '', moneda: 'mo' }])
  const [fallo, setFallo] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const { tocado, tocar } = useTocados<'nombre' | 'fecha' | 'personaje'>()

  const leida = leerFechaInicial(fecha)
  const monedas = leerEquivalencias(textos)
  const hayMonedas = monedas.errores.length === 0
  // Con las equivalencias mal escritas, las cuentas siguen con las de por defecto; el botón ya está desactivado.
  const eq = hayMonedas ? monedas.equivalencias : EQUIVALENCIAS_POR_DEFECTO
  const lecturas = bolsa.map((fila) => leerImporte(fila, eq))
  const total = lecturas.reduce((suma, l) => suma + (l.tipo === 'valido' ? l.base : 0), 0)

  async function crear(): Promise<void> {
    setCreando(true)
    try {
      const documento = documentoDePartidaNueva(
        {
          nombre,
          edad: fecha.edad,
          fechaInicial: leida.fecha,
          equivalencias: eq,
          personaje,
          bolsa: bolsa.filter((_, i) => lecturas[i].tipo === 'valido'),
        },
        { partida: nuevoId(), personaje: nuevoId() },
        ahora(),
      )
      await crearPartida(db, documento, ahora())
      alCrear(documento)
    } catch (error) {
      setCreando(false)
      setFallo(textoDeError(error))
    }
  }

  return (
    <div className={marco.pagina}>
      <header className={estilos.barraAsistente}>
        <span className={estilos.marca}>
          <Emblema tamano={22} />
          Gestión de Aldeas
        </span>
        <Boton variante="fantasma" icono="x" alPulsar={alCancelar}>
          Cancelar
        </Boton>
      </header>
      <div className={estilos.asistente}>
        <ol className={estilos.pasos} aria-label="Pasos">
          <li aria-current={paso === 1 ? 'step' : undefined}>1 · Partida y fecha</li>
          <li aria-current={paso === 2 ? 'step' : undefined}>2 · Personaje</li>
        </ol>
        {paso === 1 ? (
          <>
            <h1>Da nombre a tu partida</h1>
            <CampoTexto
              etiqueta="Nombre de la partida"
              maximo={60}
              valor={nombre}
              alCambiar={(t) => {
                setNombre(t)
                tocar('nombre')
              }}
              error={tocado('nombre') ? errorDeNombre(nombre) : null}
            />
            <CampoFechaInicial
              valor={fecha}
              alCambiar={(v) => {
                setFecha(v)
                if (v.anio !== '') {
                  tocar('fecha')
                }
              }}
              error={tocado('fecha') ? leida.error : null}
            />
            {leida.error === null && (
              <Aviso tono="neutro" icono="calendario">
                La partida empieza el {formatearFechaConDia(leida.fecha, fecha.edad)}
              </Aviso>
            )}
            <Nota>
              Calendario actual: meses, bisiestos y días de la semana reales del año elegido. No hay festivos
              predefinidos: los anuncia el máster y los anotas como eventos.
            </Nota>
            <div className={estilos.caja}>
              <Icono nombre="monedas" tamano={22} />
              <div className={estilos.datos}>
                <strong>Monedas de MERP · los saldos se muestran en oro</strong>
                {hayMonedas ? (
                  <div className={estilos.suave}>{cadenaDeEquivalencias(eq)}</div>
                ) : (
                  monedas.errores.map((e) => (
                    <p key={e} className={estilos.error}>
                      {e}
                    </p>
                  ))
                )}
                {editarMonedas && (
                  <TablaMonedas
                    equivalencias={eq}
                    edicion={{ textos, alCambiar: (campo, t) => setTextos({ ...textos, [campo]: t }) }}
                  />
                )}
              </div>
              {!editarMonedas && <Enlace alPulsar={() => setEditarMonedas(true)}>Editar equivalencias</Enlace>}
            </div>
            <div className={estilos.caja}>
              <Icono nombre="trigo" tamano={22} />
              <div>
                <strong>Víveres en sacos · ración fija</strong>
                <div className={estilos.suave}>
                  1 saco = 30 kg = víveres para 1 persona durante 1 mes (30 días) · 1 kg al día con margen para
                  pérdidas
                </div>
              </div>
            </div>
            <div className={estilos.extremos}>
              <span />
              <Boton
                desactivado={errorDeNombre(nombre) !== null || leida.error !== null || !hayMonedas}
                alPulsar={() => setPaso(2)}
              >
                Siguiente: personaje
              </Boton>
            </div>
          </>
        ) : (
          <>
            <h1>Crea a tu personaje</h1>
            <div className={estilos.rejilla2}>
              <CampoTexto
                etiqueta="Nombre"
                maximo={60}
                valor={personaje.nombre}
                alCambiar={(t) => {
                  setPersonaje({ ...personaje, nombre: t })
                  tocar('personaje')
                }}
                error={tocado('personaje') ? errorDeNombre(personaje.nombre) : null}
              />
              <CampoTexto
                etiqueta="Descripción"
                maximo={1000}
                valor={personaje.descripcion}
                alCambiar={(t) => setPersonaje({ ...personaje, descripcion: t })}
              />
            </div>
            <EtiquetaCampo
              etiqueta="Bolsa inicial"
              ayuda="Copia las monedas de la ficha tal como las tengas; solo se guarda el total en oro. Podrás corregirla después como primera fila del libro."
            >
              <div className={estilos.pila}>
                {bolsa.map((fila, i) => (
                  <FilaImporte
                    key={fila.clave}
                    valor={fila}
                    equivalencias={eq}
                    sufijoAccesible={` de la fila ${i + 1}`}
                    alCambiar={(v) => setBolsa(bolsa.map((f) => (f === fila ? { ...v, clave: f.clave } : f)))}
                    alQuitar={() => setBolsa(bolsa.filter((f) => f !== fila))}
                  />
                ))}
                <div>
                  <Boton
                    variante="fantasma"
                    icono="mas"
                    alPulsar={() => {
                      const clave = Math.max(0, ...bolsa.map((f) => f.clave)) + 1
                      setBolsa([...bolsa, { clave, cantidad: '', moneda: 'mo' }])
                    }}
                  >
                    Añadir otra moneda
                  </Boton>
                </div>
              </div>
            </EtiquetaCampo>
            <ResumenOro etiqueta="Bolsa inicial" base={total} equivalencias={eq} />
            <div className={estilos.extremos}>
              <Boton variante="secundario" icono="izquierda" alPulsar={() => setPaso(1)}>
                Atrás
              </Boton>
              <Boton
                desactivado={
                  creando || errorDeNombre(personaje.nombre) !== null || lecturas.some((l) => l.tipo === 'invalido')
                }
                alPulsar={() => void crear()}
              >
                Crear partida
              </Boton>
            </div>
          </>
        )}
      </div>
      {fallo !== null && (
        <DialogoMensaje abierto titulo="Algo ha fallado" lineas={[fallo]} alAceptar={() => setFallo(null)} />
      )}
    </div>
  )
}
