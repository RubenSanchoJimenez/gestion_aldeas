import { useEffect, useRef, useState } from 'react'
import { sembrarCatalogo } from '../../datos/catalogos'
import { abrirPartida, ultimaPartidaUsada } from '../../datos/repositorio'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import { CabeceraPantalla, Nota } from '../comunes/Panel'
import { PartidaAbierta } from '../partida/PartidaAbierta'
import { NuevaPartida } from '../pantallas/NuevaPartida'
import { SelectorPartidas } from '../pantallas/SelectorPartidas'
import { textoDeError, useServicios } from './servicios'

type Vista =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'selector' }
  | { tipo: 'nuevaPartida' }
  | { tipo: 'partida'; documento: DocumentoPartida }

/** El arranque y las vistas de la app (§5; D-081). */
export default function App() {
  const { db, ahora } = useServicios()
  const [vista, setVista] = useState<Vista>({ tipo: 'cargando' })
  const arrancada = useRef(false)

  useEffect(() => {
    // StrictMode monta dos veces: el arranque solo corre una.
    if (arrancada.current) {
      return
    }
    arrancada.current = true
    async function arrancar(): Promise<void> {
      await sembrarCatalogo(db)
      const ultima = await ultimaPartidaUsada(db)
      const documento = ultima === undefined ? undefined : await abrirPartida(db, ultima.id, ahora())
      setVista(
        documento === undefined
          ? { tipo: 'selector' }
          : { tipo: 'partida', documento },
      )
    }
    arrancar().catch((error: unknown) => setVista({ tipo: 'error', mensaje: textoDeError(error) }))
  }, [db, ahora])

  const abrir = (documento: DocumentoPartida): void =>
    setVista({ tipo: 'partida', documento })
  const alSelector = (): void => setVista({ tipo: 'selector' })

  switch (vista.tipo) {
    case 'cargando':
      return null
    case 'error':
      return (
        <main>
          <CabeceraPantalla titulo="No se han podido abrir tus partidas" />
          <Nota icono="alerta">{vista.mensaje}</Nota>
        </main>
      )
    case 'selector':
      return <SelectorPartidas alAbrir={abrir} alNuevaPartida={() => setVista({ tipo: 'nuevaPartida' })} />
    case 'nuevaPartida':
      return <NuevaPartida alCancelar={alSelector} alCrear={abrir} />
    case 'partida':
      return <PartidaAbierta key={vista.documento.partida.id} inicial={vista.documento} alSalir={alSelector} />
  }
}
