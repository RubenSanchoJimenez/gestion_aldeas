import { nombreDeMesEnMensaje } from '../../dominio/calendario/fecha'
import type { Edad } from '../../dominio/calendario/formatoFecha'
import { conMayuscula } from '../../dominio/calendario/textosFecha'
import { CampoTexto, MensajeError } from './Campo'
import estilos from './campos.module.css'
import type { ValorFechaInicial } from './fechaInicial'
import { Segmentos } from './Segmentos'
import { SelectorConBuscador } from './SelectorConBuscador'

export interface PropsCampoFechaInicial {
  valor: ValorFechaInicial
  alCambiar: (v: ValorFechaInicial) => void
  error?: string | null
  desactivado?: boolean
  ayuda?: string
}

const MESES = Array.from({ length: 12 }, (_, i) => ({
  valor: String(i + 1),
  texto: conMayuscula(nombreDeMesEnMensaje(i + 1)),
}))

/** Día, mes, año y Edad de la fecha inicial (P1 y «Editar partida»). */
export function CampoFechaInicial({ valor, alCambiar, error, desactivado, ayuda }: PropsCampoFechaInicial) {
  return (
    <div>
      <div className={estilos.fechaInicial}>
        <CampoTexto
          etiqueta="Día"
          modoTeclado="numeric"
          maximo={2}
          valor={valor.dia}
          alCambiar={(dia) => alCambiar({ ...valor, dia })}
          desactivado={desactivado}
        />
        <SelectorConBuscador
          etiqueta="Mes"
          valor={String(valor.mes)}
          grupos={[{ opciones: MESES }]}
          alCambiar={(mes) => alCambiar({ ...valor, mes: Number(mes) })}
          sustantivo={{ singular: 'mes', plural: 'meses' }}
          desactivado={desactivado}
        />
        <CampoTexto
          etiqueta="Año"
          modoTeclado="numeric"
          maximo={4}
          valor={valor.anio}
          alCambiar={(anio) => alCambiar({ ...valor, anio })}
          desactivado={desactivado}
        />
        <Segmentos<Edad>
          etiqueta="Edad"
          opciones={[
            { valor: 'segunda', texto: 'Segunda' },
            { valor: 'tercera', texto: 'Tercera' },
            { valor: 'cuarta', texto: 'Cuarta' },
          ]}
          valor={valor.edad}
          alCambiar={(edad) => alCambiar({ ...valor, edad })}
          desactivado={desactivado}
        />
      </div>
      {ayuda !== undefined && <span className={estilos.suave}>{ayuda}</span>}
      {error != null && <MensajeError>{error}</MensajeError>}
    </div>
  )
}
