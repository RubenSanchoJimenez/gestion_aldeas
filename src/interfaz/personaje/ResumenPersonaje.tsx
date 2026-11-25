import { useMemo, useState } from 'react'
import { diasQueCaben } from '../../dominio/avance/dias'
import { sumarDias } from '../../dominio/calendario/fecha'
import { marcasDelCalendario } from '../../dominio/calendario/marcas'
import { pendienteDe } from '../../dominio/deudas/pendiente'
import { formatearOro } from '../../dominio/dinero/formato'
import { saldosPorDominio } from '../../dominio/dinero/saldo'
import { conteoDeIntentos } from '../../dominio/edicion/hechizos'
import { editarPersonaje } from '../../dominio/edicion/listas'
import { patrimonioDelPersonaje } from '../../dominio/personaje/patrimonio'
import { Boton, Enlace } from '../comunes/Boton'
import { CampoTexto } from '../comunes/Campo'
import { CabeceraPantalla, Nota, Panel } from '../comunes/Panel'
import { ListaPares } from '../comunes/Tabla'
import { DialogoMovimiento } from '../dominio/Libro'
import { DialogoFormulario } from '../formulario/DialogoFormulario'
import { conteoTexto, fechaCorta } from '../formulario/valores'
import { usePartida } from '../partida/contexto'
import estilos from '../partida/partida.module.css'
import { DialogoIntento } from './Hechizos'

function DialogoPersonaje({ dominioId, alCerrar }: { dominioId: string; alCerrar: () => void }) {
  const { documento, editar } = usePartida()
  const personaje = documento.dominios.find((d) => d.id === dominioId)
  const [nombre, setNombre] = useState(personaje?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(personaje?.tipo === 'personaje' ? (personaje.descripcion ?? '') : '')
  return (
    <DialogoFormulario
      titulo="Editar personaje"
      alCerrar={alCerrar}
      alGuardar={() => editar((doc, sello) => editarPersonaje(doc, dominioId, { nombre, descripcion }, sello))}
    >
      <CampoTexto etiqueta="Nombre" maximo={60} valor={nombre} alCambiar={setNombre} />
      <CampoTexto etiqueta="Descripción" maximo={1000} valor={descripcion} alCambiar={setDescripcion} />
    </DialogoFormulario>
  )
}

/** J1: el resumen del personaje. */
export function ResumenPersonaje({ dominioId }: { dominioId: string }) {
  const { documento, catalogo, navegar } = usePartida()
  const [abierto, setAbierto] = useState<'editar' | 'movimiento' | 'intento' | null>(null)
  const eq = documento.partida.equivalencias
  const hoy = documento.partida.fechaActual
  const personaje = documento.dominios.find((d) => d.id === dominioId)
  const patrimonio = patrimonioDelPersonaje(documento)
  const deudas = documento.deudas.filter((d) => d.dominioId === dominioId && d.estado !== 'saldada' && d.sentido === 'debo')
  const inversiones = documento.inversiones.filter((i) => i.dominioId === dominioId && i.estado === 'activa')
  const proximos = useMemo(() => {
    const dias = diasQueCaben(hoy, 30)
    return dias === 0
      ? []
      : marcasDelCalendario(documento, catalogo, sumarDias(hoy, 1), sumarDias(hoy, dias)).filter(
          (m) => m.dominioId === dominioId,
        )
  }, [documento, catalogo, hoy, dominioId])
  const enEstudio = documento.hechizos.filter((h) => h.dominioId === dominioId && h.estado === 'enEstudio')

  return (
    <>
      <CabeceraPantalla
        titulo={personaje?.nombre ?? ''}
        subtitulo={personaje?.tipo === 'personaje' ? personaje.descripcion : undefined}
        acciones={
          <span className={estilos.fila}>
            <Boton variante="secundario" icono="editar" alPulsar={() => setAbierto('editar')}>
              Editar
            </Boton>
            <Boton variante="principal" icono="mas" alPulsar={() => setAbierto('movimiento')}>
              Nuevo movimiento
            </Boton>
          </span>
        }
      />
      <div className={estilos.rejilla2}>
        {[
          { titulo: 'Bolsa', cifra: saldosPorDominio(documento)[dominioId] ?? 0, destino: 'bolsa' as const },
          { titulo: 'Patrimonio', cifra: patrimonio.neto, destino: 'inventario' as const },
          { titulo: 'Deudas pendientes', cifra: deudas.reduce((s, d) => s + pendienteDe(d), 0), destino: 'deudas' as const },
          { titulo: 'Inversiones', cifra: inversiones.reduce((s, i) => s + i.capital.base, 0), destino: 'inversiones' as const },
        ].map((c) => (
          <button key={c.titulo} type="button" className={estilos.tarjeta} onClick={() => navegar({ tipo: 'dominio', dominioId, seccion: c.destino })}>
            <span className={estilos.suave}>{c.titulo}</span>
            <span className={`${estilos.cifra} ${c.cifra < 0 ? estilos.negativo : ''}`}>{formatearOro(c.cifra, eq)}</span>
          </button>
        ))}
      </div>
      <div className={estilos.rejilla2}>
        <Panel titulo="Desglose del patrimonio">
          <ListaPares
            filas={[
              { etiqueta: 'Bolsa', valor: formatearOro(patrimonio.bolsa, eq) },
              { etiqueta: 'Inventario', valor: formatearOro(patrimonio.inventario, eq) },
              { etiqueta: 'Inversiones', valor: formatearOro(patrimonio.inversiones, eq) },
              { etiqueta: 'Te deben', valor: formatearOro(patrimonio.teDeben, eq, { signo: true }) },
              { etiqueta: 'Deudas', valor: formatearOro(-patrimonio.debes, eq, { signo: true }) },
              { etiqueta: 'Patrimonio neto', valor: <strong>{formatearOro(patrimonio.neto, eq)}</strong> },
            ]}
          />
        </Panel>
        <Panel
          titulo="Estudio de hechizos"
          accion={
            <Boton variante="secundario" alPulsar={() => setAbierto('intento')}>
              Registrar intento
            </Boton>
          }
        >
          {enEstudio.length === 0 ? (
            <Nota>Nada en estudio</Nota>
          ) : (
            <ListaPares
              filas={enEstudio.map((h) => {
                const conteo = conteoDeIntentos(documento, h.id)
                return { etiqueta: h.nombre, valor: conteoTexto(conteo.buenos, conteo.malos) }
              })}
            />
          )}
          <Enlace alPulsar={() => navegar({ tipo: 'dominio', dominioId, seccion: 'hechizos' })}>Ver los hechizos</Enlace>
        </Panel>
      </div>
      <Panel titulo="Próximos 30 días">
        {proximos.length === 0 ? (
          <Nota>Nada en curso</Nota>
        ) : (
          <ListaPares
            filas={proximos.map((m) => ({ etiqueta: m.texto, sub: m.detalle, valor: fechaCorta(m.fecha, hoy) }))}
          />
        )}
      </Panel>
      {abierto === 'editar' && <DialogoPersonaje dominioId={dominioId} alCerrar={() => setAbierto(null)} />}
      {abierto === 'movimiento' && <DialogoMovimiento dominioId={dominioId} alCerrar={() => setAbierto(null)} />}
      {abierto === 'intento' && <DialogoIntento alCerrar={() => setAbierto(null)} />}
    </>
  )
}
