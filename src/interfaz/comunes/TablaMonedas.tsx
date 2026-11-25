import { MONEDAS, NOMBRE_MONEDA, type Equivalencias } from '../../dominio/dinero/monedas'
import { CampoTexto } from './Campo'
import estilos from './campos.module.css'
import type { TextosEquivalencias } from './fechaInicial'
import { Tabla } from './Tabla'

export interface PropsTablaMonedas {
  equivalencias: Equivalencias
  edicion?: { textos: TextosEquivalencias; alCambiar: (campo: keyof Equivalencias, texto: string) => void }
}

const CAMPOS: readonly (keyof Equivalencias)[] = ['mmEnMo', 'moEnMp', 'mpEnMb', 'mbEnMc', 'mcEnMe', 'meEnMh']

/** Las siete monedas y lo que vale cada una en la siguiente, en lectura o editable (§3). */
export function TablaMonedas({ equivalencias, edicion }: PropsTablaMonedas) {
  return (
    <Tabla
      etiqueta="Monedas"
      columnas={[
        { titulo: 'Moneda' },
        { titulo: 'Abrev.', ancho: '70px' },
        { titulo: 'Equivale a', ancho: '170px', derecha: true },
      ]}
      filas={MONEDAS.map((moneda, i) => {
        const siguiente = MONEDAS[i + 1]
        const campo = CAMPOS[i]
        return [
            NOMBRE_MONEDA[moneda],
            moneda,
            siguiente === undefined ? (
              <span key="base" className={estilos.suave}>
                Unidad base
              </span>
            ) : (
              <span key="equivale" className={estilos.equivale}>
                {edicion === undefined ? (
                  equivalencias[campo]
                ) : (
                  <span className={estilos.numero}>
                    <CampoTexto
                      etiqueta={`${NOMBRE_MONEDA[moneda]} en ${siguiente}`}
                      etiquetaOculta
                      modoTeclado="numeric"
                      alinear="derecha"
                      valor={edicion.textos[campo]}
                      alCambiar={(t) => edicion.alCambiar(campo, t)}
                    />
                  </span>
                )}
                <span>{siguiente}</span>
              </span>
            ),
        ]
      })}
    />
  )
}
