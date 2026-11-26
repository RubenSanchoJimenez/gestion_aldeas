import { useMemo, useState } from 'react'
import { compararFechas, diaDeLaSemana, diasDelMes, sumarMeses, type Fecha } from '../../dominio/calendario/fecha'
import { formatearFecha, NOMBRES_MES } from '../../dominio/calendario/formatoFecha'
import { marcasDelCalendario, type TipoMarca } from '../../dominio/calendario/marcas'
import { conMayuscula } from '../../dominio/calendario/textosFecha'
import { Boton, BotonIcono } from '../comunes/Boton'
import { CabeceraPantalla, Nota, Panel } from '../comunes/Panel'
import { SelectorConBuscador } from '../comunes/SelectorConBuscador'
import { ListaPares } from '../comunes/Tabla'
import { usePartida } from './contexto'
import estilos from './partida.module.css'

const LEYENDA: readonly { tipo: TipoMarca; texto: string }[] = [
  { tipo: 'cobro', texto: 'Cobros' },
  { tipo: 'pago', texto: 'Pagos' },
  { tipo: 'evento', texto: 'Eventos' },
  { tipo: 'actividad', texto: 'Producción, obras, caravanas y estudio' },
  { tipo: 'aviso', texto: 'Avisos' },
]

/** P3: el mes con sus marcas y el detalle del día elegido (§4, §6.1). */
export function Calendario() {
  const { documento, catalogo, navegar } = usePartida()
  const hoy = documento.partida.fechaActual
  const edad = documento.partida.edad
  const [mes, setMes] = useState<Fecha>({ ...hoy, dia: 1 })
  const [elegido, setElegido] = useState<Fecha>(hoy)
  const [dominio, setDominio] = useState('')
  const [tipo, setTipo] = useState('')
  const ultimo = diasDelMes(mes.anio, mes.mes)
  const todas = useMemo(
    () => marcasDelCalendario(documento, catalogo, mes, { ...mes, dia: ultimo }),
    [documento, catalogo, mes, ultimo],
  )
  const marcas = todas.filter((m) => (dominio === '' || m.dominioId === dominio) && (tipo === '' || m.tipo === tipo))
  const delDia = marcas.filter((m) => compararFechas(m.fecha, elegido) === 0)
  const huecos = diaDeLaSemana(mes)
  const celdas = [...Array.from({ length: huecos }, () => 0), ...Array.from({ length: ultimo }, (_, i) => i + 1)]
  const semanas = Array.from({ length: Math.ceil(celdas.length / 7) }, (_, i) => celdas.slice(i * 7, i * 7 + 7))

  function mover(meses: number): void {
    const nuevo = sumarMeses(mes, meses)
    if (nuevo.anio >= 1 && nuevo.anio <= 9999) {
      setMes(nuevo)
      setElegido(nuevo)
    }
  }

  return (
    <>
      <CabeceraPantalla
        titulo={`${conMayuscula(NOMBRES_MES[mes.mes - 1])} de ${mes.anio}`}
        subtitulo="Calendario"
        acciones={
          <div className={estilos.fila}>
            <BotonIcono icono="izquierda" etiqueta="Mes anterior" alPulsar={() => mover(-1)} />
            <Boton
              variante="secundario"
              alPulsar={() => {
                setMes({ ...hoy, dia: 1 })
                setElegido(hoy)
              }}
            >
              Hoy
            </Boton>
            <BotonIcono icono="derecha" etiqueta="Mes siguiente" alPulsar={() => mover(1)} />
          </div>
        }
      />
      <div className={estilos.rejilla2}>
        <SelectorConBuscador
          etiqueta="Dominio"
          valor={dominio}
          grupos={[{ opciones: documento.dominios.map((d) => ({ valor: d.id, texto: d.nombre })) }]}
          filtro={{ todas: { valor: '', texto: 'Todos' } }}
          alCambiar={setDominio}
          sustantivo={{ singular: 'dominio', plural: 'dominios' }}
        />
        <SelectorConBuscador
          etiqueta="Tipo"
          valor={tipo}
          grupos={[{ opciones: LEYENDA.map((l) => ({ valor: l.tipo as string, texto: l.texto })) }]}
          filtro={{ todas: { valor: '', texto: 'Todos' } }}
          alCambiar={setTipo}
          sustantivo={{ singular: 'tipo', plural: 'tipos' }}
        />
      </div>
      <table className={estilos.calendario} aria-label="Mes">
        <thead>
          <tr>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana, i) => (
            <tr key={i}>
              {Array.from({ length: 7 }, (_, j) => {
                const dia = semana[j] ?? 0
                if (dia === 0) {
                  return <td key={j} />
                }
                const fecha = { ...mes, dia }
                const suyas = marcas.filter((m) => m.fecha.dia === dia)
                return (
                  <td key={j}>
                    <button
                      type="button"
                      className={estilos.celda}
                      aria-label={formatearFecha(fecha)}
                      aria-pressed={compararFechas(fecha, elegido) === 0}
                      data-hoy={compararFechas(fecha, hoy) === 0}
                      onClick={() => setElegido(fecha)}
                    >
                      <strong>{dia}</strong>
                      {suyas.slice(0, suyas.length > 2 ? 1 : 2).map((m, k) => (
                        <span key={k} className={estilos.marca} data-tipo={m.tipo} title={m.texto}>
                          {m.texto}
                        </span>
                      ))}
                      {suyas.length > 2 && <span className={estilos.suave}>+{suyas.length - 1} más</span>}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={estilos.fila} aria-label="Leyenda">
        {LEYENDA.map((l) => (
          <span key={l.tipo} className={estilos.marca} data-tipo={l.tipo}>
            {l.texto}
          </span>
        ))}
      </div>
      <Panel titulo={conMayuscula(formatearFecha(elegido, { edad, diaSemana: true }))}>
        {delDia.length === 0 ? (
          <Nota>Nada este día</Nota>
        ) : (
          <ListaPares
            filas={delDia.map((m) => ({
              etiqueta: m.texto,
              sub: m.detalle,
              valor:
                m.dominioId === undefined ? (
                  'Partida'
                ) : (
                  <Boton
                    variante="fantasma"
                    icono="derecha"
                    alPulsar={() => navegar({ tipo: 'dominio', dominioId: m.dominioId!, seccion: 'resumen' })}
                  >
                    {documento.dominios.find((d) => d.id === m.dominioId)?.nombre ?? ''}
                  </Boton>
                ),
            }))}
          />
        )}
      </Panel>
    </>
  )
}
