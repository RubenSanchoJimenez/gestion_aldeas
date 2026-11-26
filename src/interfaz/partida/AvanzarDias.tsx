import { useMemo, useState } from 'react'
import { deshacerAvanceGuardado, guardarAvance } from '../../datos/avances'
import { formatearCantidad } from '../../dominio/almacen/cantidades'
import { cambiosQueSePerderan, puedeDeshacer } from '../../dominio/avance/deshacer'
import { DIAS_CON_AVISO, errorDeDiasDeAvance } from '../../dominio/avance/dias'
import { sumarDias } from '../../dominio/calendario/fecha'
import { formatearFecha } from '../../dominio/calendario/formatoFecha'
import { formatearFechaConDia } from '../../dominio/calendario/textosFecha'
import { formatearOro } from '../../dominio/dinero/formato'
import type { AvisoAvance, CambioAvance } from '../../dominio/modelo/avance'
import type { PersonaEntidad } from '../../dominio/modelo/catalogos'
import { recursoDelCatalogo } from '../../dominio/motor/textos'
import { simular } from '../../dominio/motor/simular'
import { textoDeError, useServicios } from '../app/servicios'
import { Aviso } from '../comunes/Aviso'
import { Boton } from '../comunes/Boton'
import { CampoTexto, MensajeError } from '../comunes/Campo'
import { Dialogo } from '../comunes/Dialogo'
import { Segmentos } from '../comunes/Segmentos'
import { ListaPares, Tabla } from '../comunes/Tabla'
import { usePartida } from './contexto'
import estilos from './partida.module.css'

interface PropsResultado {
  cambios: readonly CambioAvance[]
  avisos: readonly AvisoAvance[]
  personasNuevas?: readonly PersonaEntidad[]
}

/** Lo que cambia en un avance: saldos, almacén y hechos por dominio, y los avisos. Sirve para P4 y para P5. */
function Resultado({ cambios, avisos, personasNuevas = [] }: PropsResultado) {
  const { documento, catalogo } = usePartida()
  const eq = documento.partida.equivalencias
  const nombre = (id: string | undefined): string => documento.dominios.find((d) => d.id === id)?.nombre ?? 'Partida'
  const saldos = cambios.filter((c) => c.tipo === 'saldo')
  const almacen = cambios.filter((c) => c.tipo === 'almacen')
  const hechos = cambios.filter((c) => c.tipo === 'hecho')
  const dominiosConHechos = [...new Set(hechos.map((h) => h.dominioId))]
  return (
    <div className={estilos.pila}>
      {avisos.map((a, i) => (
        <Aviso key={i} tono={a.color === 'rojo' ? 'lacre' : 'oro'} icono="alerta">
          {a.texto}
        </Aviso>
      ))}
      {saldos.length > 0 && (
        <Tabla
          etiqueta="Saldos"
          columnas={[
            { titulo: 'Dominio' },
            { titulo: 'Antes', derecha: true },
            { titulo: 'Después', derecha: true },
            { titulo: 'Cambio', derecha: true },
          ]}
          filas={saldos.map((s) => [
            nombre(s.dominioId),
            formatearOro(s.antes, eq),
            formatearOro(s.despues, eq),
            <span key="c" className={s.despues < s.antes ? estilos.negativo : estilos.positivo}>
              {formatearOro(s.despues - s.antes, eq, { signo: true })}
            </span>,
          ])}
        />
      )}
      {almacen.length > 0 && (
        <Tabla
          etiqueta="Almacén"
          columnas={[{ titulo: 'Recurso' }, { titulo: 'Antes', derecha: true }, { titulo: 'Después', derecha: true }]}
          filas={almacen.map((c) => {
            const recurso = recursoDelCatalogo(catalogo, c.recursoId)
            return [
              `${recurso.nombre} de ${nombre(c.dominioId)}`,
              formatearCantidad(c.antes, recurso),
              formatearCantidad(c.despues, recurso),
            ]
          })}
        />
      )}
      {dominiosConHechos.map((id) => (
        <div key={id ?? 'partida'}>
          <strong>{nombre(id)}</strong>
          <ListaPares
            filas={hechos.filter((h) => h.dominioId === id).map((h) => ({ etiqueta: h.texto, valor: '' }))}
          />
        </div>
      ))}
      {personasNuevas.map((p) => (
        <span key={p.id} className={estilos.suave}>
          Se añadirá «{p.nombre}» a Personas y entidades
        </span>
      ))}
      {cambios.length === 0 && avisos.length === 0 && <span className={estilos.suave}>No cambia nada.</span>}
    </div>
  )
}

/** P4: elegir cuántos días y ver la vista previa antes de avanzar (§6.1; §9). */
export function AvanzarDias({ alCerrar, alAvanzado }: { alCerrar: () => void; alAvanzado: () => void }) {
  const { db, ahora, nuevoId } = useServicios()
  const { documento, catalogo, reemplazar } = usePartida()
  const [opcion, setOpcion] = useState('7')
  const [otros, setOtros] = useState('14')
  const [fallo, setFallo] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const hoy = documento.partida.fechaActual
  const edad = documento.partida.edad
  const dias = opcion === 'otro' ? (/^\d{1,4}$/.test(otros) ? Number(otros) : Number.NaN) : Number(opcion)
  const error = errorDeDiasDeAvance(hoy, dias)
  const previa = useMemo(
    () => (error === null ? simular(documento, dias, { avanceId: nuevoId(), nuevoId, catalogo }) : null),
    [documento, catalogo, dias, error, nuevoId],
  )

  async function avanzar(): Promise<void> {
    if (previa === null) {
      return
    }
    setGuardando(true)
    try {
      reemplazar(await guardarAvance(db, documento, previa, ahora()))
      alAvanzado()
    } catch (e) {
      setGuardando(false)
      setFallo(textoDeError(e))
    }
  }

  return (
    <Dialogo
      abierto
      ancho={760}
      titulo="Avanzar días"
      subtitulo={previa === null ? undefined : `Hasta el ${formatearFechaConDia(sumarDias(hoy, dias), edad)}`}
      alCancelar={alCerrar}
      pieIzquierda={fallo === null ? undefined : <MensajeError>{fallo}</MensajeError>}
      pieDerecha={
        <>
          <Boton variante="secundario" alPulsar={alCerrar}>
            Cancelar
          </Boton>
          <Boton variante="principal" desactivado={previa === null || guardando} alPulsar={() => void avanzar()}>
            Avanzar
          </Boton>
        </>
      }
    >
      <Segmentos
        etiqueta="Días"
        opciones={[
          { valor: '1', texto: '1 día' },
          { valor: '7', texto: '7 días' },
          { valor: '30', texto: '30 días' },
          { valor: 'otro', texto: 'Otro…' },
        ]}
        valor={opcion}
        alCambiar={setOpcion}
      />
      {opcion === 'otro' && (
        <CampoTexto etiqueta="Número de días" modoTeclado="numeric" valor={otros} alCambiar={setOtros} error={error} />
      )}
      {opcion !== 'otro' && error !== null && <MensajeError>{error}</MensajeError>}
      {dias > DIAS_CON_AVISO && error === null && (
        <Aviso tono="oro" icono="alerta">
          Es un avance de más de {DIAS_CON_AVISO} días.
        </Aviso>
      )}
      {previa !== null && (
        <Resultado cambios={previa.cambios} avisos={previa.avisos} personasNuevas={previa.personasNuevas} />
      )}
    </Dialogo>
  )
}

/** P5: el resumen del último avance, con «Deshacer avance» (§6.1; §9). */
export function ResumenAvance({ alCerrar }: { alCerrar: () => void }) {
  const { db, ahora } = useServicios()
  const { documento, reemplazar } = usePartida()
  const [confirmando, setConfirmando] = useState(false)
  const avance = documento.avances[documento.avances.length - 1]
  if (avance === undefined) {
    return null
  }
  const perdidos = cambiosQueSePerderan(documento)
  const edad = documento.partida.edad

  const deshacer = async (): Promise<void> => {
    reemplazar(await deshacerAvanceGuardado(db, documento, ahora()))
    alCerrar()
  }

  if (confirmando) {
    return (
      <Dialogo
        abierto
        ancho={620}
        titulo="¿Deshacer el avance?"
        subtitulo={`Vuelve al ${formatearFecha(avance.desde, { edad })}`}
        alCancelar={() => setConfirmando(false)}
        pieDerecha={
          <>
            <Boton variante="secundario" alPulsar={() => setConfirmando(false)}>
              Cancelar
            </Boton>
            <Boton variante="peligroLleno" alPulsar={() => void deshacer()}>
              Deshacer avance
            </Boton>
          </>
        }
      >
        <p>
          {perdidos === 0
            ? 'La partida vuelve a como estaba antes del avance.'
            : `Se perderán ${perdidos} ${perdidos === 1 ? 'cambio hecho' : 'cambios hechos'} después del avance`}
        </p>
      </Dialogo>
    )
  }
  return (
    <Dialogo
      abierto
      ancho={760}
      titulo="Resumen del avance"
      subtitulo={`Del ${formatearFecha(avance.desde, { edad })} al ${formatearFecha(avance.hasta, { edad })}`}
      alCancelar={alCerrar}
      pieIzquierda={
        puedeDeshacer(documento) ? (
          <Boton variante="peligro" icono="deshacer" alPulsar={() => setConfirmando(true)}>
            Deshacer avance
          </Boton>
        ) : undefined
      }
      pieDerecha={
        <Boton variante="principal" alPulsar={alCerrar}>
          Cerrar
        </Boton>
      }
    >
      <Resultado cambios={avance.cambios} avisos={avance.avisos} />
    </Dialogo>
  )
}
