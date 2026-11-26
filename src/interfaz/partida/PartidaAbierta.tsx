import { useCallback, useEffect, useMemo, useState } from 'react'
import { leerCatalogo } from '../../datos/catalogos'
import { leerPartida } from '../../datos/repositorio'
import { guardarEdicion } from '../../datos/ediciones'
import { avisosEn } from '../../dominio/avisos/avisos'
import type { CatalogosEnCopia } from '../../dominio/modelo/catalogos'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import { problemaAlGuardar } from '../../dominio/validacion/guardado'
import { tituloProvisional, type Pantalla } from '../app/navegacion'
import { useServicios } from '../app/servicios'
import { Aviso } from '../comunes/Aviso'
import { Boton } from '../comunes/Boton'
import { MarcoPartida, PantallaPendiente } from '../marco/MarcoPartida'
import { Ajustes } from '../pantallas/Ajustes'
import { AvanzarDias, ResumenAvance } from './AvanzarDias'
import { Calendario } from './Calendario'
import { ContextoPartida, type ContextoDePartida } from './contexto'
import { PantallaAsentamiento } from '../asentamiento/PantallaAsentamiento'
import { DialogoAsentamiento } from '../asentamiento/DialogoAsentamiento'
import { Listas } from '../pantallas/Listas'
import { destinoDeAviso } from './destinos'
import { useCopiaAutomatica } from './useCopiaAutomatica'
import { PantallaPersonaje } from '../personaje/PantallaPersonaje'
import { Inicio } from './Inicio'
import estilos from './partida.module.css'

export interface PropsPartidaAbierta {
  inicial: DocumentoPartida
  alSalir: () => void
}

/** La partida abierta: el marco, la pantalla elegida y el diálogo de «Avanzar días» (§5). */
export function PartidaAbierta({ inicial, alSalir }: PropsPartidaAbierta) {
  const { db, ahora, nuevoId } = useServicios()
  const [documento, setDocumento] = useState(inicial)
  const [catalogo, setCatalogo] = useState<CatalogosEnCopia | null>(null)
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: 'inicio' })
  const [dialogo, setDialogo] = useState<'avanzar' | 'resumen' | null>(null)
  const copia = useCopiaAutomatica(documento)

  useEffect(() => {
    void leerCatalogo(db).then(setCatalogo)
  }, [db, documento])

  const editar = useCallback<ContextoDePartida['editar']>(
    async (cambio) => {
      const siguiente = cambio(documento, { ahora: ahora(), nuevoId })
      if (siguiente !== documento) {
        // El catálogo se relee: la propia edición puede acompañar a un alta recién hecha.
        const problema = problemaAlGuardar(siguiente, await leerCatalogo(db))
        if (problema !== null) {
          throw new Error(problema)
        }
      }
      setDocumento(await guardarEdicion(db, documento, siguiente, ahora()))
    },
    [db, ahora, nuevoId, documento],
  )

  const id = documento.partida.id
  const recargar = useCallback(async () => {
    const guardado = await leerPartida(db, id)
    setCatalogo(await leerCatalogo(db))
    if (guardado !== undefined) {
      setDocumento(guardado)
    }
  }, [db, id])

  const contexto = useMemo<ContextoDePartida | null>(
    () =>
      catalogo === null
        ? null
        : { documento, catalogo, reemplazar: setDocumento, recargar, editar, navegar: setPantalla },
    [documento, catalogo, editar, recargar],
  )

  const proximo = useMemo(
    () => (catalogo === null ? undefined : avisosEn(documento, catalogo)[0]),
    [documento, catalogo],
  )

  // «Añadir asentamiento» es un diálogo sobre la pantalla actual: al cerrarlo sin crear, se vuelve a Inicio.
  const cerrarAlta = (): void => setPantalla((p) => (p.tipo === 'anadirAsentamiento' ? { tipo: 'inicio' } : p))

  if (contexto === null) {
    return null
  }

  const extremo = (
    <div className={estilos.barraExtremo}>
      {proximo !== undefined && (
        <button
          type="button"
          className={`${estilos.pulsable} ${estilos.proximo}`}
          onClick={() => setPantalla(destinoDeAviso(documento, proximo.tipo, proximo.dominioId))}
        >
          <Aviso tono={proximo.color === 'rojo' ? 'lacre' : 'oro'} icono="alerta">
            {proximo.texto}
          </Aviso>
        </button>
      )}
      <Boton variante="principal" icono="reloj_arena" alPulsar={() => setDialogo('avanzar')}>
        <span>
          Avanzar<span className={estilos.largo}> días</span>
        </span>
      </Boton>
    </div>
  )

  return (
    <ContextoPartida value={contexto}>
      <MarcoPartida documento={documento} pantalla={pantalla} alNavegar={setPantalla} extremo={extremo}>
        {(copia.estado?.tipo === 'sinPermiso' || copia.estado?.tipo === 'error') && pantalla.tipo !== 'ajustes' && (
          <div className={estilos.copiaParada}>
            <Aviso tono="lacre" icono="alerta">
              La copia automática está parada y el archivo no se está actualizando.
            </Aviso>
            <Boton variante="secundario" alPulsar={() => void copia.reactivar()}>
              Reactivar la copia
            </Boton>
          </div>
        )}
        {pantalla.tipo === 'inicio' || pantalla.tipo === 'anadirAsentamiento' ? (
          <Inicio alVerResumen={documento.avances.length > 0 ? () => setDialogo('resumen') : undefined} />
        ) : pantalla.tipo === 'calendario' ? (
          <Calendario />
        ) : pantalla.tipo === 'dominio' &&
          documento.dominios.find((d) => d.id === pantalla.dominioId)?.tipo === 'personaje' ? (
          <PantallaPersonaje dominioId={pantalla.dominioId} seccion={pantalla.seccion} />
        ) : pantalla.tipo === 'dominio' && documento.dominios.some((d) => d.id === pantalla.dominioId) ? (
          <PantallaAsentamiento dominioId={pantalla.dominioId} seccion={pantalla.seccion} />
        ) : pantalla.tipo === 'listas' ? (
          <Listas />
        ) : pantalla.tipo === 'ajustes' ? (
          <Ajustes
            documento={documento}
            alCambiarDocumento={contexto.reemplazar}
            alCambiarDePartida={alSalir}
            alBorrada={alSalir}
            alGestionarListas={() => setPantalla({ tipo: 'listas' })}
            copiaAutomatica={copia}
          />
        ) : (
          <PantallaPendiente
            {...tituloProvisional(pantalla, documento)}
            alIrAAjustes={() => setPantalla({ tipo: 'ajustes' })}
          />
        )}
      </MarcoPartida>
      {pantalla.tipo === 'anadirAsentamiento' && <DialogoAsentamiento alCerrar={cerrarAlta} />}
      {dialogo === 'avanzar' && (
        <AvanzarDias alCerrar={() => setDialogo(null)} alAvanzado={() => setDialogo('resumen')} />
      )}
      {dialogo === 'resumen' && <ResumenAvance alCerrar={() => setDialogo(null)} />}
    </ContextoPartida>
  )
}
