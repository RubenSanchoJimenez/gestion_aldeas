import { useCallback, useEffect, useState } from 'react'
import { exportarCopia } from '../../datos/copia/exportar'
import { abrirPartida, crearPartida, listarPartidas } from '../../datos/repositorio'
import { formatearFecha } from '../../dominio/calendario/formatoFecha'
import { PARTIDA_ID } from '../../dominio/ejemplo/ids'
import { documentoDeEjemplo } from '../../dominio/ejemplo/sombraDelEste'
import type { Id } from '../../dominio/modelo/comunes'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import type { ResumenPartida } from '../../dominio/modelo/resumen'
import { textoDominios } from '../../dominio/partidas/textos'
import { buscarEn } from '../../dominio/texto/buscar'
import { textoDeError, useServicios } from '../app/servicios'
import { Boton, BotonIcono, Enlace } from '../comunes/Boton'
import { DialogoMensaje } from '../comunes/Dialogo'
import { Nota } from '../comunes/Panel'
import { fechaReal } from '../formato/fechaReal'
import { Emblema, Filete } from '../iconos/Emblema'
import marco from '../marco/marco.module.css'
import { EditarPartida } from './EditarPartida'
import { ImportarCopia } from './ImportarCopia'
import estilos from './pantallas.module.css'

export interface PropsSelectorPartidas {
  alAbrir: (documento: DocumentoPartida) => void
  alNuevaPartida: () => void
}

/** P0: las partidas de la tablet (§6.1; D-082 a D-084). */
export function SelectorPartidas({ alAbrir, alNuevaPartida }: PropsSelectorPartidas) {
  const { db, ahora, descargar } = useServicios()
  const [partidas, setPartidas] = useState<ResumenPartida[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<ResumenPartida | null>(null)
  const [mensaje, setMensaje] = useState<{ titulo: string; lineas: string[] } | null>(null)

  const recargar = useCallback(() => {
    void listarPartidas(db).then(setPartidas)
  }, [db])
  useEffect(recargar, [recargar])

  /** Ejecuta una acción y enseña lo que falle. */
  async function intentar(accion: () => Promise<void>): Promise<void> {
    try {
      await accion()
    } catch (error) {
      setMensaje({ titulo: 'Algo ha fallado', lineas: [textoDeError(error)] })
    }
  }

  const abrir = (id: Id): Promise<void> =>
    intentar(async () => {
      const documento = await abrirPartida(db, id, ahora())
      if (documento === undefined) {
        setMensaje({ titulo: 'No se ha podido abrir la partida', lineas: ['No está guardada en esta tablet.'] })
        recargar()
      } else {
        alAbrir(documento)
      }
    })

  const exportar = (id: Id): Promise<void> =>
    intentar(async () => {
      const copia = await exportarCopia(db, id, ahora())
      descargar({ nombre: copia.nombre, texto: copia.texto })
      recargar()
    })

  const probarEjemplo = (): Promise<void> =>
    intentar(async () => {
      await crearPartida(db, documentoDeEjemplo(), ahora())
      await abrir(PARTIDA_ID)
    })

  if (partidas === null) {
    return null
  }
  const principal = partidas[0]?.id
  const visibles = partidas.filter((p) => busqueda.trim() === '' || buscarEn(p.nombre, busqueda) !== null)
  const hayEjemplo = partidas.some((p) => p.id === PARTIDA_ID)
  const nota = (
    <Nota>
      Tus partidas se guardan solo en esta tablet. Exporta una copia de vez en cuando para no perderlas.
    </Nota>
  )

  return (
    <div className={marco.pagina}>
      <div className={estilos.cabeceraP0}>
        <Emblema tamano={44} />
        <h1>Gestión de Aldeas</h1>
        <Filete ancho={280} />
        <span className={estilos.lema}>La economía de tus dominios en la Tierra Media</span>
      </div>
      {partidas.length === 0 ? (
        <div className={estilos.vacio}>
          <p>Todavía no tienes ninguna partida.</p>
          <div className={estilos.fila}>
            <Boton icono="mas" alPulsar={alNuevaPartida}>
              Nueva partida
            </Boton>
            <ImportarCopia origen="selector" variante="secundario" alImportar={recargar} />
            <Boton variante="fantasma" alPulsar={() => void probarEjemplo()}>
              Probar con la partida de ejemplo
            </Boton>
          </div>
          {nota}
        </div>
      ) : (
        <div className={estilos.lista}>
          <div className={estilos.titulo}>
            <h2>Tus partidas</h2>
            <ImportarCopia origen="selector" alImportar={recargar} />
            <Boton variante="secundario" icono="mas" alPulsar={alNuevaPartida}>
              Nueva partida
            </Boton>
          </div>
          {partidas.length > 5 && (
            <input
              type="search"
              className={estilos.buscador}
              aria-label="Buscar partidas"
              placeholder="Buscar"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          )}
          {visibles.length === 0 && <p>Nada coincide con “{busqueda}”</p>}
          {visibles.map((p) => (
            <article key={p.id} aria-label={p.nombre} className={estilos.tarjeta} data-principal={p.id === principal}>
              <Emblema tamano={28} />
              <div className={estilos.datos}>
                <h3>{p.nombre}</h3>
                <div>{formatearFecha(p.fechaActual, { edad: p.edad })}</div>
                <div className={estilos.suave}>
                  {textoDominios(p.dominios)} · Última sesión: {fechaReal(p.abiertaEl)}
                </div>
              </div>
              <BotonIcono icono="editar" variante="fantasma" etiqueta="Editar partida" alPulsar={() => setEditando(p)} />
              <Boton variante="fantasma" icono="bajar" alPulsar={() => void exportar(p.id)}>
                Exportar
              </Boton>
              <Boton variante={p.id === principal ? 'principal' : 'secundario'} alPulsar={() => void abrir(p.id)}>
                {p.id === principal ? 'Continuar' : 'Abrir'}
              </Boton>
            </article>
          ))}
          {nota}
          {!hayEjemplo && (
            <div>
              <Enlace alPulsar={() => void probarEjemplo()}>Probar con la partida de ejemplo</Enlace>
            </div>
          )}
        </div>
      )}
      {editando !== null && (
        <EditarPartida
          resumen={editando}
          alCerrar={() => setEditando(null)}
          alGuardada={() => {
            setEditando(null)
            recargar()
          }}
          alBorrada={() => {
            setEditando(null)
            recargar()
          }}
        />
      )}
      {mensaje !== null && (
        <DialogoMensaje abierto titulo={mensaje.titulo} lineas={mensaje.lineas} alAceptar={() => setMensaje(null)} />
      )}
    </div>
  )
}
