import { useCallback, useEffect, useMemo, useState } from 'react'
import { leerCatalogo } from '../../datos/catalogos'
import { guardarEdicion } from '../../datos/ediciones'
import { avisosEn } from '../../dominio/avisos/avisos'
import type { CatalogosEnCopia } from '../../dominio/modelo/catalogos'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
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
import { destinoDeAviso } from './destinos'
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

  useEffect(() => {
    void leerCatalogo(db).then(setCatalogo)
  }, [db, documento])

  const editar = useCallback<ContextoDePartida['editar']>(
    async (cambio) => {
      const siguiente = cambio(documento, { ahora: ahora(), nuevoId })
      setDocumento(await guardarEdicion(db, documento, siguiente, ahora()))
    },
    [db, ahora, nuevoId, documento],
  )

  const contexto = useMemo<ContextoDePartida | null>(
    () =>
      catalogo === null ? null : { documento, catalogo, reemplazar: setDocumento, editar, navegar: setPantalla },
    [documento, catalogo, editar],
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
        Avanzar días
      </Boton>
    </div>
  )

  return (
    <ContextoPartida value={contexto}>
      <MarcoPartida documento={documento} pantalla={pantalla} alNavegar={setPantalla} extremo={extremo}>
        {pantalla.tipo === 'inicio' || pantalla.tipo === 'anadirAsentamiento' ? (
          <Inicio alVerResumen={documento.avances.length > 0 ? () => setDialogo('resumen') : undefined} />
        ) : pantalla.tipo === 'calendario' ? (
          <Calendario />
        ) : pantalla.tipo === 'dominio' &&
          documento.dominios.find((d) => d.id === pantalla.dominioId)?.tipo === 'personaje' ? (
          <PantallaPersonaje dominioId={pantalla.dominioId} seccion={pantalla.seccion} />
        ) : pantalla.tipo === 'dominio' && documento.dominios.some((d) => d.id === pantalla.dominioId) ? (
          <PantallaAsentamiento dominioId={pantalla.dominioId} seccion={pantalla.seccion} />
        ) : pantalla.tipo === 'ajustes' ? (
          <Ajustes
            documento={documento}
            alCambiarDocumento={contexto.reemplazar}
            alCambiarDePartida={alSalir}
            alBorrada={alSalir}
            alGestionarListas={() => setPantalla({ tipo: 'listas' })}
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
