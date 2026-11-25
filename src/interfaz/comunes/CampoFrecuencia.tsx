import { sumarDias, nombreDeMesEnMensaje, type Fecha } from '../../dominio/calendario/fecha'
import type { Edad } from '../../dominio/calendario/formatoFecha'
import {
  conDiaMes,
  conN,
  erroresDeFrecuencia,
  frecuenciaInicial,
  GRUPOS_TIPO,
  proximaFecha,
  TEXTO_TIPO,
  type TipoRecurrencia,
} from '../../dominio/calendario/formularioFrecuencia'
import type { Recurrencia } from '../../dominio/calendario/recurrencia'
import { conMayuscula, formatearFechaConDia } from '../../dominio/calendario/textosFecha'
import { CampoFecha } from './CampoFecha'
import { CampoTexto } from './Campo'
import estilos from './campos.module.css'
import { Segmentos } from './Segmentos'
import { SelectorConBuscador } from './SelectorConBuscador'

export interface PropsCampoFrecuencia {
  etiqueta: string
  valor: Recurrencia
  alCambiar: (r: Recurrencia) => void
  hoy: Fecha
  edad: Edad
  /** Al editar una regla: si no cambia, no se exige fecha posterior a hoy. */
  guardada?: Recurrencia
  /** La producción no admite «Una sola vez». */
  sinUnica?: boolean
  /** En los formularios de dinero: «Primer pago», «Primer cobro». */
  etiquetaFecha?: string
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((texto, i) => ({ valor: String(i), texto }))

/** Un entero tecleado, o NaN. */
const entero = (texto: string): number => (/^\d{1,3}$/.test(texto) ? Number(texto) : Number.NaN)
const comoTexto = (n: number): string => (Number.isNaN(n) ? '' : String(n))

/** Campo de frecuencia (§6.5, n.º 13; D-095): el tipo y sus datos, con la próxima fecha. */
export function CampoFrecuencia(props: PropsCampoFrecuencia) {
  const { etiqueta, valor, alCambiar, hoy, edad, guardada, sinUnica, etiquetaFecha } = props
  const errores = erroresDeFrecuencia(valor, hoy, edad, guardada)
  const proxima = proximaFecha(valor, hoy)
  const grupos = GRUPOS_TIPO.map((g) => ({
    nombre: g.nombre,
    opciones: g.tipos.filter((t) => !(sinUnica && t === 'unica')).map((t) => ({ valor: t, texto: TEXTO_TIPO[t] })),
  }))
  const conPrimera = 'primera' in valor
  const conInicio = valor.tipo === 'diaria' || valor.tipo === 'semanal' || valor.tipo === 'mensual' || valor.tipo === 'anual'
  const nombreFecha =
    etiquetaFecha ?? (conPrimera ? 'Primera vez' : conInicio ? 'Fecha de inicio' : 'Fecha')
  const fecha = valor.tipo === 'unica' ? valor.fecha : 'primera' in valor ? valor.primera : (valor.inicio ?? null)

  function cambiarFecha(f: Fecha | null): void {
    if (valor.tipo === 'unica') {
      if (f !== null) {
        alCambiar({ ...valor, fecha: f })
      }
    } else if ('primera' in valor) {
      if (f !== null) {
        alCambiar({ ...valor, primera: f })
      }
    } else {
      const nueva = { ...valor }
      if (f === null) {
        delete nueva.inicio
      } else {
        nueva.inicio = f
      }
      alCambiar(nueva)
    }
  }

  return (
    <fieldset className={estilos.frecuencia}>
      <legend>{etiqueta}</legend>
      <SelectorConBuscador<TipoRecurrencia>
        etiqueta="Tipo de frecuencia"
        etiquetaOculta
        valor={valor.tipo}
        grupos={grupos}
        alCambiar={(tipo) => alCambiar(frecuenciaInicial(tipo, hoy, valor))}
        sustantivo={{ singular: 'frecuencia', plural: 'frecuencias' }}
      />
      {(valor.tipo === 'cadaNDias' || valor.tipo === 'cadaNMeses') && (
        <div className={estilos.corto}>
          <CampoTexto
            etiqueta="Cada"
            sufijo={valor.tipo === 'cadaNDias' ? 'días' : 'meses'}
            modoTeclado="numeric"
            valor={comoTexto(valor.n)}
            alCambiar={(t) => alCambiar(conN(valor, entero(t), hoy))}
            error={errores.n}
          />
        </div>
      )}
      {valor.tipo === 'semanal' && (
        <Segmentos
          etiqueta="Día de la semana"
          opciones={DIAS}
          valor={String(valor.diaSemana)}
          alCambiar={(d) => alCambiar({ ...valor, diaSemana: Number(d) })}
        />
      )}
      {valor.tipo === 'anual' && (
        <SelectorConBuscador
          etiqueta="Mes"
          valor={String(valor.mes)}
          grupos={[
            {
              opciones: Array.from({ length: 12 }, (_, i) => ({
                valor: String(i + 1),
                texto: conMayuscula(nombreDeMesEnMensaje(i + 1)),
              })),
            },
          ]}
          alCambiar={(m) => alCambiar({ ...valor, mes: Number(m) })}
          sustantivo={{ singular: 'mes', plural: 'meses' }}
          error={errores.mes}
        />
      )}
      {'diaMes' in valor && (
        <div className={estilos.corto}>
          <CampoTexto
            etiqueta="Día del mes"
            modoTeclado="numeric"
            valor={comoTexto(valor.diaMes)}
            alCambiar={(t) => alCambiar(conDiaMes(valor, entero(t), hoy))}
            error={errores.diaMes}
          />
        </div>
      )}
      <CampoFecha
        etiqueta={nombreFecha}
        valor={fecha}
        alCambiar={cambiarFecha}
        hoy={hoy}
        edad={edad}
        minimo={guardada === undefined ? sumarDias(hoy, hoy.anio === 9999 && hoy.mes === 12 && hoy.dia === 31 ? 0 : 1) : undefined}
        opcional={conInicio}
        ayuda={conInicio ? 'Opcional: no antes de esta fecha' : undefined}
        error={errores.fecha}
      />
      <span className={estilos.suave}>
        Próxima: {proxima === null ? 'ninguna' : formatearFechaConDia(proxima, edad)}
      </span>
    </fieldset>
  )
}
