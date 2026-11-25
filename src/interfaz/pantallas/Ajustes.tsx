import { useCallback, useEffect, useState } from 'react'
import { exportarCopia } from '../../datos/copia/exportar'
import { leerResumen } from '../../datos/resumenes'
import { leerPartida } from '../../datos/repositorio'
import { formatearFecha } from '../../dominio/calendario/formatoFecha'
import { conMayuscula } from '../../dominio/calendario/textosFecha'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import type { ResumenPartida } from '../../dominio/modelo/resumen'
import { textoDeError, useServicios } from '../app/servicios'
import { Boton } from '../comunes/Boton'
import { DialogoMensaje } from '../comunes/Dialogo'
import { CabeceraPantalla, Nota, Panel } from '../comunes/Panel'
import { ListaPares } from '../comunes/Tabla'
import { TablaMonedas } from '../comunes/TablaMonedas'
import { fechaRealONunca } from '../formato/fechaReal'
import { BorrarPartida } from './EditarPartida'
import { ImportarCopia } from './ImportarCopia'
import estilos from './pantallas.module.css'

export interface PropsAjustes {
  documento: DocumentoPartida
  /** Tras reemplazar la partida con una copia. */
  alCambiarDocumento: (documento: DocumentoPartida) => void
  alCambiarDePartida: () => void
  alBorrada: () => void
  alGestionarListas: () => void
}

/** P6: ajustes y copias (§6.1). */
export function Ajustes(props: PropsAjustes) {
  const { documento, alCambiarDocumento, alCambiarDePartida, alBorrada, alGestionarListas } = props
  const { db, ahora, descargar } = useServicios()
  const [resumen, setResumen] = useState<ResumenPartida | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const { id, nombre, equivalencias, fechaActual, edad } = documento.partida

  const cargar = useCallback(() => {
    void leerResumen(db, id).then((r) => setResumen(r ?? null))
  }, [db, id])
  useEffect(cargar, [cargar])

  async function exportar(): Promise<void> {
    try {
      const copia = await exportarCopia(db, id, ahora())
      descargar({ nombre: copia.nombre, texto: copia.texto })
      cargar()
    } catch (error) {
      setFallo(textoDeError(error))
    }
  }

  return (
    <>
      <CabeceraPantalla titulo="Ajustes y copias" subtitulo={nombre} />
      <div className={estilos.columnas}>
        <div className={estilos.pila}>
          <Panel titulo="Monedas">
            <TablaMonedas equivalencias={equivalencias} />
            <Nota>Se fijaron al crear la partida. Todos los importes se muestran en oro.</Nota>
          </Panel>
          <Panel titulo="Listas y catálogos">
            <div className={estilos.extremos}>
              <span className={estilos.suave}>Categorías, oficios, tipos, recursos, ubicaciones y personas</span>
              <Boton variante="secundario" icono="derecha" alPulsar={alGestionarListas}>
                Gestionar listas
              </Boton>
            </div>
          </Panel>
        </div>
        <div className={estilos.pila}>
          <Panel titulo="Calendario">
            <ListaPares
              filas={[
                { etiqueta: 'Calendario', valor: 'Actual, con los meses de hoy' },
                {
                  etiqueta: 'Fecha actual',
                  valor: conMayuscula(formatearFecha(fechaActual, { edad, diaSemana: true })),
                },
                { etiqueta: 'Ración de víveres', valor: '1 saco de 30 kg por persona al mes' },
              ]}
            />
            <Nota>Sin festivos fijos: anótalos como eventos.</Nota>
          </Panel>
          <Panel titulo="Copias de seguridad">
            <p>
              Tus datos solo están en esta tablet. Exporta una copia para no perderlos si se borra o se cambia de
              dispositivo.
            </p>
            <ListaPares
              filas={[{ etiqueta: 'Última copia exportada', valor: fechaRealONunca(resumen?.exportadaEl) }]}
            />
            <div className={estilos.fila}>
              <Boton variante="secundario" icono="bajar" alPulsar={() => void exportar()}>
                Exportar copia
              </Boton>
              <ImportarCopia
                origen="ajustes"
                partidaActualId={id}
                alImportar={() => {
                  void leerPartida(db, id).then((d) => {
                    if (d !== undefined) {
                      alCambiarDocumento(d)
                      cargar()
                    }
                  })
                }}
              />
            </div>
            <Nota icono="alerta">Importar una copia reemplaza la partida actual.</Nota>
          </Panel>
          <Panel titulo="Partida">
            <div className={estilos.fila}>
              <Boton variante="secundario" icono="cambio" alPulsar={alCambiarDePartida}>
                Cambiar de partida
              </Boton>
              <Boton variante="peligro" alPulsar={() => setBorrando(true)}>
                Borrar partida
              </Boton>
            </div>
          </Panel>
        </div>
      </div>
      {borrando && resumen !== null && (
        <BorrarPartida resumen={resumen} alCancelar={() => setBorrando(false)} alBorrada={alBorrada} />
      )}
      {fallo !== null && (
        <DialogoMensaje abierto titulo="Algo ha fallado" lineas={[fallo]} alAceptar={() => setFallo(null)} />
      )}
    </>
  )
}
