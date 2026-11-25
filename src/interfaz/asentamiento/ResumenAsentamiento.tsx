import { useMemo, useState } from 'react'
import { diasDeReserva } from '../../dominio/almacen/prevision'
import { progresoDeCaravana, progresoDeObra } from '../../dominio/almacen/progreso'
import { avisosEn } from '../../dominio/avisos/avisos'
import { diasQueCaben } from '../../dominio/avance/dias'
import { sumarDias } from '../../dominio/calendario/fecha'
import { marcasDelCalendario } from '../../dominio/calendario/marcas'
import { balanceMensual } from '../../dominio/dinero/balance'
import { formatearOro, formatearOroProrrateado } from '../../dominio/dinero/formato'
import { saldosPorDominio } from '../../dominio/dinero/saldo'
import { eventoActivoEl } from '../../dominio/eventos/efectos'
import { habitantesDe } from '../../dominio/poblacion/habitantes'
import { Aviso } from '../comunes/Aviso'
import { Boton } from '../comunes/Boton'
import { CabeceraPantalla, Nota, Panel } from '../comunes/Panel'
import { ListaPares } from '../comunes/Tabla'
import { DialogoTransferencia } from '../dominio/Libro'
import { fechaCorta } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'
import { DialogoAsentamiento } from './DialogoAsentamiento'
import { nombreDelRecurso } from './nombres'

/** A1: el resumen de un asentamiento. */
export function ResumenAsentamiento({ dominioId }: { dominioId: string }) {
  const { documento, catalogo, navegar } = usePartida()
  const [abierto, setAbierto] = useState<'editar' | 'transferir' | null>(null)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const dominio = documento.dominios.find((d) => d.id === dominioId)
  const balance = balanceMensual(documento, dominioId)
  const avisos = useMemo(
    () => avisosEn(documento, catalogo).filter((a) => a.dominioId === dominioId),
    [documento, catalogo, dominioId],
  )
  const proximos = useMemo(() => {
    const dias = diasQueCaben(hoy, 30)
    return dias === 0
      ? []
      : marcasDelCalendario(documento, catalogo, sumarDias(hoy, 1), sumarDias(hoy, dias))
          .filter((m) => m.dominioId === dominioId && (m.tipo === 'pago' || m.tipo === 'cobro'))
          .slice(0, 8)
  }, [documento, catalogo, hoy, dominioId])
  const reservas = useMemo(
    () => diasDeReserva(documento, catalogo).filter((r) => r.dominioId === dominioId && r.reserva.tipo !== 'sinConsumo'),
    [documento, catalogo, dominioId],
  )
  const obras = documento.obras.filter((o) => o.dominioId === dominioId && o.estado === 'enCurso')
  const caravanas = documento.caravanas.filter((c) => c.dominioId === dominioId && c.estado === 'enRuta')
  const eventos = documento.eventos.filter((e) => e.dominioId === dominioId && eventoActivoEl(e, hoy))

  return (
    <>
      <CabeceraPantalla
        titulo={dominio?.nombre ?? ''}
        subtitulo={`${habitantesDe(documento, dominioId, hoy)} habitantes`}
        acciones={
          <span className={estilos.fila}>
            <Boton variante="secundario" icono="editar" alPulsar={() => setAbierto('editar')}>
              Editar
            </Boton>
            <Boton variante="principal" icono="cambio" alPulsar={() => setAbierto('transferir')}>
              Transferir
            </Boton>
          </span>
        }
      />
      {avisos.map((a, i) => (
        <Aviso key={i} tono={a.color === 'rojo' ? 'lacre' : 'oro'} icono="alerta">
          {a.texto}
        </Aviso>
      ))}
      <div className={estilos.rejilla2}>
        <button type="button" className={estilos.tarjeta} onClick={() => navegar({ tipo: 'dominio', dominioId, seccion: 'tesoreria' })}>
          <span className={estilos.suave}>Caja</span>
          <span className={estilos.cifra}>{formatearOro(saldosPorDominio(documento)[dominioId] ?? 0, eq)}</span>
        </button>
        <div className={estilos.tarjeta}>
          <span className={estilos.suave}>Balance mensual</span>
          <span className={`${estilos.cifra} ${balance.balance < 0 ? estilos.negativo : ''}`}>
            {formatearOroProrrateado(balance.balance, eq, { signo: true })}
          </span>
          <span className={estilos.suave}>
            entran {formatearOroProrrateado(balance.entran, eq)} · salen {formatearOroProrrateado(balance.salen, eq)}
          </span>
        </div>
      </div>
      <div className={estilos.rejilla2}>
        <Panel titulo="Obras y caravanas">
          {obras.length + caravanas.length === 0 ? (
            <Nota>Nada en curso</Nota>
          ) : (
            <ListaPares
              filas={[
                ...obras.map((o) => ({ etiqueta: o.nombre, valor: `${progresoDeObra(o, hoy).pct} %` })),
                ...caravanas.map((c) => ({
                  etiqueta: `Caravana de ${c.operacion} · vuelve el ${fechaCorta(c.vuelta, hoy)}`,
                  valor: `${progresoDeCaravana(c, hoy)} %`,
                })),
              ]}
            />
          )}
        </Panel>
        <Panel titulo="Próximos pagos y cobros">
          {proximos.length === 0 ? (
            <Nota>Nada en 30 días</Nota>
          ) : (
            <ListaPares filas={proximos.map((m) => ({ etiqueta: m.texto, sub: fechaCorta(m.fecha, hoy), valor: m.detalle?.split(' · ').at(-1) ?? '' }))} />
          )}
        </Panel>
        <Panel titulo="Almacén">
          {reservas.length === 0 ? (
            <Nota>Sin consumos</Nota>
          ) : (
            <ListaPares
              filas={reservas.map((r) => ({
                etiqueta: nombreDelRecurso(catalogo, r.recursoId),
                valor:
                  r.reserva.tipo === 'dias'
                    ? r.reserva.dias <= 30
                      ? `Se agota el ${fechaCorta(r.reserva.fecha, hoy)}`
                      : `Unos ${r.reserva.dias} días`
                    : 'Más de un año',
              }))}
            />
          )}
        </Panel>
        <Panel titulo="Eventos activos">
          {eventos.length === 0 ? <Nota>Ninguno</Nota> : <ListaPares filas={eventos.map((e) => ({ etiqueta: e.nombre, valor: '' }))} />}
        </Panel>
      </div>
      {abierto === 'editar' && <DialogoAsentamiento id={dominioId} alCerrar={() => setAbierto(null)} />}
      {abierto === 'transferir' && <DialogoTransferencia dominioId={dominioId} alCerrar={() => setAbierto(null)} />}
    </>
  )
}
