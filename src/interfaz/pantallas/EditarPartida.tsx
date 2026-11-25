import { useState } from 'react'
import { guardarDatosDePartida } from '../../datos/datosDePartida'
import { borrarPartida } from '../../datos/repositorio'
import { formatearFecha } from '../../dominio/calendario/formatoFecha'
import type { ResumenPartida } from '../../dominio/modelo/resumen'
import { MENSAJE_SOLO_ANTES_DEL_AVANCE } from '../../dominio/partidas/datos'
import { errorDeNombre, textoDominios } from '../../dominio/partidas/textos'
import { textoDeError, useServicios } from '../app/servicios'
import { Boton } from '../comunes/Boton'
import { CampoTexto, MensajeError } from '../comunes/Campo'
import { CampoFechaInicial } from '../comunes/CampoFechaInicial'
import { ConfirmacionEliminar } from '../comunes/ConfirmacionEliminar'
import { Dialogo } from '../comunes/Dialogo'
import { leerFechaInicial, type ValorFechaInicial } from '../comunes/fechaInicial'
import { Nota } from '../comunes/Panel'
import { fechaRealONunca } from '../formato/fechaReal'

export interface PropsEditarPartida {
  resumen: ResumenPartida
  alCerrar: () => void
  alGuardada: () => void
  alBorrada: () => void
}

export interface PropsBorrarPartida {
  resumen: ResumenPartida
  alCancelar: () => void
  alBorrada: () => void
}

/** La doble confirmación J2d para borrar una partida (D-090). */
export function BorrarPartida({ resumen, alCancelar, alBorrada }: PropsBorrarPartida) {
  const { db } = useServicios()
  return (
    <ConfirmacionEliminar
      abierto
      titulo={`¿Eliminar «${resumen.nombre}»?`}
      subtitulo={`Partida · ${formatearFecha(resumen.fechaActual, { edad: resumen.edad })}`}
      resumen={[
        { etiqueta: 'Dominios', valor: textoDominios(resumen.dominios) },
        { etiqueta: 'Última copia exportada', valor: fechaRealONunca(resumen.exportadaEl) },
      ]}
      alCancelar={alCancelar}
      alEliminar={() => void borrarPartida(db, resumen.id).then(alBorrada)}
    >
      <Nota icono="alerta">Se borra todo y se vuelve al selector de partidas.</Nota>
    </ConfirmacionEliminar>
  )
}

/** «Editar partida»: nombre, fecha inicial y Edad, o eliminarla (D-089). */
export function EditarPartida({ resumen, alCerrar, alGuardada, alBorrada }: PropsEditarPartida) {
  const { db, ahora } = useServicios()
  const [nombre, setNombre] = useState(resumen.nombre)
  const [fecha, setFecha] = useState<ValorFechaInicial>({
    dia: String(resumen.fechaInicial.dia),
    mes: resumen.fechaInicial.mes,
    anio: String(resumen.fechaInicial.anio),
    edad: resumen.edad,
  })
  const [error, setError] = useState<string | null>(null)
  const [borrando, setBorrando] = useState(false)
  const leida = leerFechaInicial(fecha)
  const errorNombre = errorDeNombre(nombre)

  async function guardar(): Promise<void> {
    try {
      const datos = { nombre, edad: fecha.edad, fechaInicial: leida.fecha }
      const resultado = await guardarDatosDePartida(db, resumen.id, datos, ahora())
      if (resultado.ok) {
        alGuardada()
      } else {
        setError(resultado.error)
      }
    } catch (e) {
      setError(textoDeError(e))
    }
  }

  // La confirmación sustituye al formulario; el estado se queda aquí, así «Cancelar» vuelve con lo escrito.
  if (borrando) {
    return <BorrarPartida resumen={resumen} alCancelar={() => setBorrando(false)} alBorrada={alBorrada} />
  }
  return (
    <Dialogo
      abierto
      ancho={700}
      titulo="Editar partida"
      subtitulo={resumen.nombre}
      alCancelar={alCerrar}
      pieIzquierda={
        error === null ? (
          <Boton variante="peligro" icono="x" alPulsar={() => setBorrando(true)}>
            Eliminar partida
          </Boton>
        ) : (
          <MensajeError>{error}</MensajeError>
        )
      }
      pieDerecha={
        <>
          <Boton variante="secundario" alPulsar={alCerrar}>
            Cancelar
          </Boton>
          <Boton desactivado={errorNombre !== null || leida.error !== null} alPulsar={() => void guardar()}>
            Guardar cambios
          </Boton>
        </>
      }
    >
      <CampoTexto
        etiqueta="Nombre de la partida"
        maximo={60}
        valor={nombre}
        alCambiar={(t) => {
          setNombre(t)
          setError(null)
        }}
        error={errorNombre}
      />
      <CampoFechaInicial
        valor={fecha}
        alCambiar={(v) => {
          setFecha(v)
          setError(null)
        }}
        desactivado={resumen.hayAvances}
        ayuda={resumen.hayAvances ? MENSAJE_SOLO_ANTES_DEL_AVANCE : undefined}
        error={leida.error}
      />
    </Dialogo>
  )
}
