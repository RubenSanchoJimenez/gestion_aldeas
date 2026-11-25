import { useRef, useState } from 'react'
import { importarCopia, type ModoImportacion, type OrigenImportacion } from '../../datos/copia/importar'
import type { Id } from '../../dominio/modelo/comunes'
import { textoDeError, useServicios } from '../app/servicios'
import { Boton, type VarianteBoton } from '../comunes/Boton'
import { Dialogo, DialogoMensaje } from '../comunes/Dialogo'
import { fechaReal } from '../formato/fechaReal'
import { prepararImportacion, type Preparacion } from './copias'

export interface PropsImportarCopia {
  origen: OrigenImportacion
  partidaActualId?: Id
  variante?: VarianteBoton
  alImportar: (partidaId: Id) => void
}

type Lista = Extract<Preparacion, { tipo: 'lista' }>

/** «Importar copia»: elegir el archivo, preguntar si ya existe y contar lo que se hizo (D-091, D-092). */
export function ImportarCopia({ origen, partidaActualId, variante = 'fantasma', alImportar }: PropsImportarCopia) {
  const { db, ahora, nuevoId } = useServicios()
  const entrada = useRef<HTMLInputElement>(null)
  const [pregunta, setPregunta] = useState<Lista | null>(null)
  const [mensaje, setMensaje] = useState<{ titulo: string; lineas: string[] } | null>(null)

  const fallo = (error: unknown): void =>
    setMensaje({ titulo: 'No se ha podido importar', lineas: [textoDeError(error)] })

  async function importar(preparada: Lista, modo: ModoImportacion): Promise<void> {
    setPregunta(null)
    try {
      const resumen = await importarCopia(db, preparada.copia, {
        modo,
        ahora: ahora(),
        nuevoId,
        migrada: preparada.migrada,
        desdeVersion: preparada.desdeVersion,
      })
      alImportar(resumen.partidaId)
      setMensaje({ titulo: 'Copia importada', lineas: resumen.lineas })
    } catch (error) {
      fallo(error)
    }
  }

  async function leer(archivo: File): Promise<void> {
    try {
      const preparada = await prepararImportacion(db, await archivo.text(), origen, partidaActualId)
      if (preparada.tipo === 'rechazo') {
        setMensaje({ titulo: 'No se ha podido importar', lineas: [preparada.mensaje] })
      } else if (preparada.destino.modos.includes('reemplazar')) {
        setPregunta(preparada)
      } else {
        await importar(preparada, 'nueva')
      }
    } catch (error) {
      fallo(error)
    }
  }

  return (
    <>
      <Boton variante={variante} icono="subir" alPulsar={() => entrada.current?.click()}>
        Importar copia
      </Boton>
      <input
        ref={entrada}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label="Archivo de la copia"
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          e.target.value = ''
          if (archivo !== undefined) {
            void leer(archivo)
          }
        }}
      />
      {pregunta !== null && (
        <Dialogo
          abierto
          ancho={620}
          titulo={`¿Reemplazar «${pregunta.destino.nombreExistente}»?`}
          subtitulo={`Copia exportada el ${fechaReal(pregunta.copia.exportadaEl)}`}
          alCancelar={() => setPregunta(null)}
          pieDerecha={
            <>
              <Boton variante="secundario" alPulsar={() => setPregunta(null)}>
                Cancelar
              </Boton>
              {pregunta.destino.modos.includes('comoCopia') && (
                <Boton variante="secundario" alPulsar={() => void importar(pregunta, 'comoCopia')}>
                  Importar como copia
                </Boton>
              )}
              <Boton variante="peligroLleno" alPulsar={() => void importar(pregunta, 'reemplazar')}>
                Reemplazar
              </Boton>
            </>
          }
        >
          <p>
            {pregunta.destino.modos.includes('comoCopia')
              ? `Reemplazar cambia tu partida por la de la copia y se pierde lo que hayas hecho después de exportarla. «Importar como copia» la guarda aparte, como «${pregunta.nombreComoCopia}».`
              : 'La partida se cambia por la de la copia y se pierde lo que hayas hecho después de exportarla.'}
          </p>
        </Dialogo>
      )}
      {mensaje !== null && (
        <DialogoMensaje abierto titulo={mensaje.titulo} lineas={mensaje.lineas} alAceptar={() => setMensaje(null)} />
      )}
    </>
  )
}
