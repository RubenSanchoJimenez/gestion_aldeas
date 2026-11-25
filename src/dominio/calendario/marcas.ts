import { enumerar } from './formatoFecha'
import { compararFechas, diasEntre, sumarDias, type Fecha } from './fecha'
import { finDeObra } from '../almacen/progreso'
import { cantidadDeRecurso } from '../almacen/cantidades'
import { diasQueCaben } from '../avance/dias'
import { formatearOro } from '../dinero/formato'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { recursoDelCatalogo } from '../motor/textos'
import { pendienteDe } from '../deudas/pendiente'

/** El grupo de una marca: decide su color y el filtro de tipos del calendario (§4). */
export type TipoMarca = 'pago' | 'cobro' | 'evento' | 'actividad' | 'aviso'

export interface Marca {
  fecha: Fecha
  tipo: TipoMarca
  texto: string
  /** Segunda línea en el detalle del día. */
  detalle?: string
  dominioId?: Id
}

/** Las previsiones no miran a más de un año (§4; D-001). */
const HORIZONTE = 366

/**
 * Las marcas entre `desde` y `hasta`, ambos incluidos. Lo pasado sale de lo registrado y lo futuro, de simular
 * hasta `hasta` sin guardar nada (§4; §9 «Previsiones»). No se marcan los gastos diarios, los movimientos
 * manuales ya registrados ni las transferencias.
 */
export function marcasDelCalendario(
  estado: EstadoPartida,
  catalogo: CatalogosEnCopia,
  desde: Fecha,
  hasta: Fecha,
): Marca[] {
  const hoy = estado.partida.fechaActual
  const eq = estado.partida.equivalencias
  const dias = diasQueCaben(hoy, Math.min(HORIZONTE, Math.max(0, diasEntre(hoy, hasta))))
  const recorrido =
    dias === 0
      ? undefined
      : recorrerDias(estado, sumarDias(hoy, dias), {
          avanceId: 'prevision',
          nuevoId: idsEnSerie('prev'),
          catalogo,
        })
  const futuro = recorrido?.estadoNuevo ?? estado
  const nombres = new Map(estado.dominios.map((d) => [d.id, d.nombre]))
  const marcas: Marca[] = []
  const poner = (marca: Marca): void => {
    if (compararFechas(marca.fecha, desde) >= 0 && compararFechas(marca.fecha, hasta) <= 0) {
      marcas.push(marca)
    }
  }

  // Cobros y pagos: los de reglas que no son diarias, y los programados.
  const diarias = new Set(
    [...estado.recurrentes, ...estado.impuestosRentas]
      .filter((r) => r.recurrencia.tipo === 'diaria')
      .map((r) => r.id),
  )
  const programados = new Set(estado.movimientos.filter((m) => m.programado).map((m) => m.id))
  for (const m of futuro.movimientos) {
    const deRegla = m.regla !== undefined && !diarias.has(m.regla.id)
    if (!deRegla && !programados.has(m.id)) {
      continue
    }
    poner({
      fecha: m.fecha,
      tipo: m.importe.base < 0 ? 'pago' : 'cobro',
      texto: m.regla?.tipo === 'locales' ? 'Impuesto locales' : m.concepto,
      detalle: `${m.concepto} · ${formatearOro(m.importe.base, eq, { signo: true })}`,
      dominioId: m.dominioId,
    })
  }

  // Producción: una marca por asentamiento y día; las «Cada día» no se marcan.
  const edificios = new Map(futuro.edificios.map((e) => [e.id, e]))
  const producciones = new Map<string, { fecha: Fecha; dominioId: Id; lineas: string[] }>()
  for (const p of futuro.produccionesRealizadas) {
    const edificio = edificios.get(p.edificioId)
    const regla = edificio?.producciones.find((x) => x.id === p.produccionId)
    if (edificio === undefined || regla?.recurrencia.tipo === 'diaria' || p.cantidad + p.perdida <= 0) {
      continue
    }
    const clave = `${edificio.dominioId}|${p.fecha.anio}-${p.fecha.mes}-${p.fecha.dia}`
    const grupo = producciones.get(clave) ?? { fecha: p.fecha, dominioId: edificio.dominioId, lineas: [] }
    const cantidad = cantidadDeRecurso(p.cantidad + p.perdida, recursoDelCatalogo(catalogo, p.recursoId))
    grupo.lineas.push(`${edificio.nombre} · ${cantidad}`)
    producciones.set(clave, grupo)
  }
  for (const grupo of producciones.values()) {
    poner({
      fecha: grupo.fecha,
      tipo: 'actividad',
      texto: `Producción de ${nombres.get(grupo.dominioId) ?? ''}`,
      detalle: enumerar(grupo.lineas),
      dominioId: grupo.dominioId,
    })
  }

  for (const obra of futuro.obras) {
    if (obra.inicio === undefined) {
      continue
    }
    poner({ fecha: obra.inicio, tipo: 'actividad', texto: `Empieza ${obra.nombre}`, dominioId: obra.dominioId })
    const fin = finDeObra(obra)
    if (fin !== null) {
      poner({ fecha: fin, tipo: 'actividad', texto: `Fin obra ${obra.nombre}`, dominioId: obra.dominioId })
    }
  }

  const mercados = new Map(futuro.mercados.map((m) => [m.id, m.nombre]))
  for (const c of futuro.caravanas) {
    const destino = (c.mercadoId !== undefined ? mercados.get(c.mercadoId) : nombres.get(c.destinoId ?? '')) ?? ''
    poner({ fecha: c.salida, tipo: 'actividad', texto: `Sale caravana ${destino}`, dominioId: c.dominioId })
    if (compararFechas(c.vuelta, c.salida) !== 0) {
      poner({ fecha: c.vuelta, tipo: 'actividad', texto: `Vuelve caravana ${destino}`, dominioId: c.dominioId })
    }
  }

  const hechizos = new Map(estado.hechizos.map((h) => [h.id, h]))
  for (const intento of estado.intentos) {
    const hechizo = hechizos.get(intento.hechizoId)
    poner({
      fecha: intento.fecha,
      tipo: 'actividad',
      texto: `Estudio: ${hechizo?.nombre ?? ''}`,
      detalle: intento.resultado === 'bueno' ? 'Intento bueno' : 'Intento malo',
      dominioId: hechizo?.dominioId,
    })
  }

  for (const evento of estado.eventos) {
    poner({ fecha: evento.inicio, tipo: 'evento', texto: evento.nombre, dominioId: evento.dominioId })
    if (evento.duracionDias > 1) {
      poner({
        fecha: sumarDias(evento.inicio, evento.duracionDias - 1),
        tipo: 'evento',
        texto: `Fin ${evento.nombre}`,
        dominioId: evento.dominioId,
      })
    }
  }

  const personas = new Map(futuro.personas.map((p) => [p.id, p.nombre]))
  for (const deuda of estado.deudas) {
    if (deuda.vencimiento === undefined || deuda.estado === 'saldada') {
      continue
    }
    poner({
      fecha: deuda.vencimiento,
      tipo: 'aviso',
      texto: `Vence deuda ${personas.get(deuda.contraparteId) ?? ''}`,
      detalle: `Vence · ${formatearOro(pendienteDe(deuda), eq)} pendientes`,
      dominioId: deuda.dominioId,
    })
  }

  // La primera falta prevista de cada fila del almacén.
  const conFalta = new Set<string>()
  for (const flujo of recorrido?.flujos ?? []) {
    const clave = `${flujo.dominioId}|${flujo.recursoId}`
    if (conFalta.has(clave) || flujo.consumoTeorico - flujo.consumido <= 1e-6) {
      continue
    }
    conFalta.add(clave)
    const recurso = recursoDelCatalogo(catalogo, flujo.recursoId)
    poner({
      fecha: flujo.fecha,
      tipo: 'aviso',
      texto: `Sin ${recurso.nombre.toLowerCase()}`,
      detalle: `Falta prevista en ${nombres.get(flujo.dominioId) ?? ''}`,
      dominioId: flujo.dominioId,
    })
  }

  return marcas.sort((a, b) => compararFechas(a.fecha, b.fecha))
}
