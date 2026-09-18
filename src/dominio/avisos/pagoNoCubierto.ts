import { ANIO_MAXIMO, compararFechas, diasEntre, sumarDias, type Fecha } from '../calendario/fecha'
import { formatearDiaCercano } from '../calendario/formatoFecha'
import { siguienteOcurrencia, type Recurrencia } from '../calendario/recurrencia'
import { formatearOro } from '../dinero/formato'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { EstadoPartida } from '../modelo/documento'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { avisoPagoNoCubierto } from '../motor/textos'
import type { AvisoConFecha } from '../motor/tipos'
import { dominioDe } from './dinero'

/** Como mucho, un año vista, igual que un avance (§9 l.1323; D-025). */
const HORIZONTE_MAXIMO = 366

/** El último día que la app sabe representar: la previsión no pasa de ahí (§4, D-001). */
const ULTIMO_DIA: Fecha = { anio: ANIO_MAXIMO, mes: 12, dia: 31 }

/** La fecha del siguiente pago de cada origen: filas, tributos, gastos de J5 activos y pagos programados (D-025). */
function siguientesPagos(estado: EstadoPartida): Fecha[] {
  const hoy = estado.partida.fechaActual
  const recurrencias: Recurrencia[] = [
    ...estado.trabajadores.map((t) => t.recurrencia),
    ...estado.unidadesGuarnicion.map((u) => u.recurrencia),
    ...estado.impuestosRentas.filter((i) => i.sentido === 'tributo').map((i) => i.recurrencia),
    ...estado.recurrentes.filter((r) => r.tipo === 'gasto' && r.activo).map((r) => r.recurrencia),
  ]
  const fechas: Fecha[] = []
  for (const recurrencia of recurrencias) {
    const siguiente = siguienteOcurrencia(recurrencia, hoy)
    if (siguiente !== null) {
      fechas.push(siguiente)
    }
  }
  for (const m of estado.movimientos) {
    if (m.programado && m.tipo === 'gasto' && m.vinculo === undefined) {
      fechas.push(compararFechas(m.fecha, hoy) > 0 ? m.fecha : sumarDias(hoy, 1))
    }
  }
  return fechas
}

/** Un aviso ámbar por origen cuyo siguiente pago, en 366 días o menos, no se cubriría entero (§9; D-025; T16). */
export function avisosDePagoNoCubierto(estado: EstadoPartida, catalogo: CatalogosEnCopia): AvisoConFecha[] {
  const hoy = estado.partida.fechaActual
  const masLejano = siguientesPagos(estado).reduce((maximo, f) => Math.max(maximo, diasEntre(hoy, f)), 0)
  const horizonte = Math.min(HORIZONTE_MAXIMO, diasEntre(hoy, ULTIMO_DIA), masLejano)
  if (horizonte < 1) {
    return []
  }
  const prevision = recorrerDias(estado, sumarDias(hoy, horizonte), {
    avanceId: 'prev',
    nuevoId: idsEnSerie('prev'),
    catalogo,
  })
  const eq = estado.partida.equivalencias
  const vistos = new Set<string>()
  const avisos: AvisoConFecha[] = []
  for (const suceso of prevision.sucesos) {
    if (suceso.tipo !== 'pago') {
      continue
    }
    const clave = `${suceso.origen.tipo}|${suceso.origen.id}`
    if (vistos.has(clave)) {
      continue
    }
    vistos.add(clave)
    if (suceso.pagado >= suceso.debido) {
      continue
    }
    avisos.push({
      tipo: 'pagoNoCubierto',
      color: 'ambar',
      dominioId: suceso.dominioId,
      texto: avisoPagoNoCubierto(
        dominioDe(estado, suceso.dominioId),
        suceso.que,
        formatearOro(suceso.debido, eq),
        formatearDiaCercano(suceso.fecha, hoy),
      ),
      fecha: suceso.fecha,
    })
  }
  return avisos
}
