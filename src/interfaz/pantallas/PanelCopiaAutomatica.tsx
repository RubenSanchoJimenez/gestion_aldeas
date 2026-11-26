import { Boton } from '../comunes/Boton'
import { Nota, Panel } from '../comunes/Panel'
import { ListaPares } from '../comunes/Tabla'
import { fechaRealONunca } from '../formato/fechaReal'
import type { CopiaAutomatica } from '../partida/useCopiaAutomatica'
import estilos from './pantallas.module.css'

/** El archivo del dispositivo que la app reescribe sola con cada cambio. */
export function PanelCopiaAutomatica({ copia }: { copia: CopiaAutomatica }) {
  const { disponible, estado, fallo } = copia
  return (
    <Panel titulo="Copia automática (en pruebas)">
      {!disponible ? (
        <Nota icono="alerta">
          Este navegador no permite que la app actualice un archivo. Usa «Exportar copia» al terminar cada sesión.
        </Nota>
      ) : estado === null ? null : estado.tipo === 'sinArchivo' ? (
        <>
          <p>
            Elige un archivo y la app lo reescribirá con cada cambio de esta partida. Se recupera con «Importar copia».
          </p>
          <div className={estilos.fila}>
            <Boton variante="secundario" icono="bajar" alPulsar={() => void copia.elegir()}>
              Elegir archivo
            </Boton>
          </div>
        </>
      ) : (
        <>
          <ListaPares
            filas={[
              { etiqueta: 'Archivo', valor: estado.nombre },
              {
                etiqueta: 'Estado',
                valor:
                  estado.tipo === 'alDia'
                    ? `Al día · ${fechaRealONunca(estado.cuando)}, ${new Date(estado.cuando).toLocaleTimeString('es-ES')}`
                    : estado.tipo === 'sinPermiso'
                      ? 'Parada: falta tu permiso'
                      : `No se ha podido escribir: ${estado.mensaje}`,
              },
            ]}
          />
          <div className={estilos.fila}>
            {estado.tipo !== 'alDia' && (
              <Boton variante="principal" alPulsar={() => void copia.reactivar()}>
                Reactivar la copia
              </Boton>
            )}
            <Boton variante="secundario" alPulsar={() => void copia.elegir()}>
              Cambiar de archivo
            </Boton>
            <Boton variante="secundario" alPulsar={() => void copia.dejar()}>
              Dejar de actualizarlo
            </Boton>
          </div>
        </>
      )}
      {fallo !== null && <Nota icono="alerta">{fallo}</Nota>}
    </Panel>
  )
}
