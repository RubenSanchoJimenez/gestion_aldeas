import { useMemo, useState } from 'react'
import { avisosEn } from '../../dominio/avisos/avisos'
import { diasQueCaben } from '../../dominio/avance/dias'
import { sumarDias } from '../../dominio/calendario/fecha'
import { formatearDiaMes } from '../../dominio/calendario/formatoFecha'
import { marcasDelCalendario } from '../../dominio/calendario/marcas'
import { nombreDelDia } from '../../dominio/calendario/textosFecha'
import { balanceMensual } from '../../dominio/dinero/balance'
import { formatearNumero, formatearOro, formatearOroProrrateado } from '../../dominio/dinero/formato'
import { saldosPorDominio } from '../../dominio/dinero/saldo'
import { ordenarDominios } from '../../dominio/partidas/orden'
import { patrimonioDelPersonaje } from '../../dominio/personaje/patrimonio'
import { habitantesDe } from '../../dominio/poblacion/habitantes'
import { Aviso } from '../comunes/Aviso'
import { Boton, Enlace } from '../comunes/Boton'
import { CabeceraPantalla, Nota, Panel } from '../comunes/Panel'
import { ListaPares } from '../comunes/Tabla'
import { usePartida } from './contexto'
import { destinoDeAviso } from './destinos'
import estilos from './partida.module.css'

/** P2: avisos, una tarjeta por dominio y los próximos 7 días (§6.1). */
export function Inicio({ alVerResumen }: { alVerResumen?: () => void }) {
  const { documento, catalogo, navegar } = usePartida()
  const [todos, setTodos] = useState(false)
  const hoy = documento.partida.fechaActual
  const eq = documento.partida.equivalencias
  const avisos = useMemo(() => avisosEn(documento, catalogo), [documento, catalogo])
  const marcas = useMemo(() => {
    const dias = diasQueCaben(hoy, 7)
    return dias === 0 ? [] : marcasDelCalendario(documento, catalogo, sumarDias(hoy, 1), sumarDias(hoy, dias))
  }, [documento, catalogo, hoy])
  const saldos = saldosPorDominio(documento)
  const visibles = todos ? avisos : avisos.slice(0, 4)

  return (
    <>
      <CabeceraPantalla
        titulo="Inicio"
        subtitulo={documento.partida.nombre}
        acciones={
          alVerResumen === undefined ? undefined : (
            <Boton variante="secundario" icono="reloj_arena" alPulsar={alVerResumen}>
              Resumen del último avance
            </Boton>
          )
        }
      />
      {avisos.length > 0 && (
        <div className={estilos.rejilla2}>
          {visibles.map((a, i) => (
            <button
              key={i}
              type="button"
              className={estilos.pulsable}
              onClick={() => navegar(destinoDeAviso(documento, a.tipo, a.dominioId))}
            >
              <Aviso tono={a.color === 'rojo' ? 'lacre' : 'oro'} icono="alerta">
                {a.texto}
              </Aviso>
            </button>
          ))}
        </div>
      )}
      {avisos.length > 4 && (
        <div>
          <Enlace alPulsar={() => setTodos(!todos)}>{todos ? 'Ver menos' : `Ver todos (${avisos.length})`}</Enlace>
        </div>
      )}
      <div className={estilos.rejilla3}>
        {ordenarDominios(documento.dominios).map((d) => {
          const saldo = saldos[d.id] ?? 0
          const filas =
            d.tipo === 'personaje'
              ? [
                  { etiqueta: 'Patrimonio', valor: formatearOro(patrimonioDelPersonaje(documento).neto, eq) },
                  {
                    etiqueta: 'Hechizos en estudio',
                    valor: String(documento.hechizos.filter((h) => h.estado === 'enEstudio').length),
                  },
                ]
              : [
                  { etiqueta: 'Habitantes', valor: formatearNumero(habitantesDe(documento, d.id, hoy), 0) },
                  {
                    etiqueta: 'Balance mensual',
                    valor: formatearOroProrrateado(balanceMensual(documento, d.id).balance, eq, { signo: true }),
                  },
                ]
          return (
            <button
              key={d.id}
              type="button"
              className={estilos.tarjeta}
              onClick={() => navegar({ tipo: 'dominio', dominioId: d.id, seccion: 'resumen' })}
            >
              <span className={estilos.titulo}>{d.nombre}</span>
              <span className={estilos.suave}>{d.tipo === 'personaje' ? 'Bolsa' : 'Caja'}</span>
              <span className={`${estilos.cifra} ${saldo < 0 ? estilos.negativo : ''}`}>{formatearOro(saldo, eq)}</span>
              <ListaPares filas={filas} />
            </button>
          )
        })}
      </div>
      <Panel titulo="Próximos 7 días">
        {marcas.length === 0 ? (
          <Nota>Nada en curso</Nota>
        ) : (
          <ListaPares
            filas={marcas.map((m) => ({
              etiqueta: `${nombreDelDia(m.fecha)} ${formatearDiaMes(m.fecha)}`,
              valor: <span className={estilos.marca} data-tipo={m.tipo}>{m.texto}</span>,
            }))}
          />
        )}
        <Enlace alPulsar={() => navegar({ tipo: 'calendario' })}>Ver el calendario</Enlace>
      </Panel>
    </>
  )
}
