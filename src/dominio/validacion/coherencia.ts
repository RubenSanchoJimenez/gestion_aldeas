import type * as z from 'zod'
import { ANIO_MAXIMO, compararFechas, sumarDias, type Fecha } from '../calendario/fecha'
import { aBase, type Importe } from '../dinero/importe'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { AnioMes } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { validarReferencias, type ProblemaDeCoherencia } from './referencias'
import { validarUnicidades } from './unicidades'

/** Número de mes absoluto, para comparar AnioMes. */
function numeroDeMes(mes: AnioMes): number {
  return mes.anio * 12 + mes.mes
}

/** El mes de una fecha. */
function mesDe(fecha: Fecha): AnioMes {
  return { anio: fecha.anio, mes: fecha.mes }
}

/**
 * Recorre el estado y llama a `visitar` en cada Importe con «introducido», con su ruta.
 * Se salta `snapshotPrevio`: validarCopia lo valida aparte, con su propio prefijo (4.6).
 */
function recorrerImportes(valor: unknown, ruta: string, visitar: (ruta: string, importe: Importe) => void): void {
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => recorrerImportes(v, `${ruta}[${i}]`, visitar))
    return
  }
  if (valor === null || typeof valor !== 'object') {
    return
  }
  const objeto = valor as Record<string, unknown>
  if (typeof objeto.base === 'number' && typeof objeto.introducido === 'object' && objeto.introducido !== null) {
    visitar(ruta, objeto as unknown as Importe)
    return
  }
  for (const [clave, v] of Object.entries(objeto)) {
    if (clave === 'snapshotPrevio') {
      continue
    }
    recorrerImportes(v, ruta === '' ? clave : `${ruta}.${clave}`, visitar)
  }
}

/** Las comprobaciones que valen también para un snapshotPrevio, que no tiene lista de avances (4.3, 4.4 y 4.5). */
function problemasDelEstado(documento: DocumentoPartida): ProblemaDeCoherencia[] {
  const problemas: ProblemaDeCoherencia[] = []
  const anota = (ruta: string, mensaje: string): void => {
    problemas.push({ ruta, mensaje })
  }
  const exige = (bien: boolean, ruta: string, mensaje: string): void => {
    if (!bien) {
      anota(ruta, mensaje)
    }
  }
  const partida = documento.partida
  const hoy = partida.fechaActual

  // ---- 4.3 Importes enteros seguros y equivalencias -----------------------
  documento.cajas.forEach((caja, i) => {
    const suma = documento.movimientos.reduce(
      (total, m) => (m.dominioId === caja.dominioId ? total + Math.abs(m.importe.base) : total),
      Math.abs(caja.saldoInicial.base),
    )
    exige(
      suma <= Number.MAX_SAFE_INTEGER,
      `cajas[${i}]`,
      `Los importes de «${caja.dominioId}» se salen del rango entero exacto`,
    )
  })
  recorrerImportes(documento, '', (ruta, importe) => {
    const introducido = importe.introducido
    if (introducido === undefined) {
      return
    }
    let cuadra = false
    try {
      cuadra = aBase(introducido.cantidad, introducido.moneda, partida.equivalencias) === Math.abs(importe.base)
    } catch {
      cuadra = false
    }
    exige(
      cuadra,
      ruta,
      `Lo tecleado («${introducido.cantidad} ${introducido.moneda}») no cuadra con el importe guardado`,
    )
  })

  // ---- 4.4 Fechas (las que no miran la lista de avances) ------------------
  documento.dominios.forEach((d, i) => {
    if (d.tipo !== 'asentamiento') {
      return
    }
    exige(
      compararFechas(d.alta, hoy) <= 0 && compararFechas(d.alta, partida.fechaInicial) >= 0,
      `dominios[${i}].alta`,
      `El alta de «${d.id}» se sale de la partida`,
    )
  })
  documento.movimientos.forEach((m, i) => {
    exige(
      compararFechas(m.fecha, hoy) <= 0 || m.programado,
      `movimientos[${i}].programado`,
      'Un movimiento con fecha futura tiene que estar programado',
    )
  })
  documento.intentos.forEach((it, i) => {
    exige(
      compararFechas(it.fecha, hoy) <= 0,
      `intentos[${i}].fecha`,
      `El intento de «${it.hechizoId}» es posterior a la fecha actual`,
    )
  })
  documento.hechizos.forEach((h, i) => {
    const aprendidoEl = h.aprendidoEl
    if (aprendidoEl === undefined) {
      return
    }
    exige(
      compararFechas(aprendidoEl, hoy) <= 0,
      `hechizos[${i}].aprendidoEl`,
      '«Aprendido el» es posterior a la fecha actual',
    )
    const posterior = documento.intentos.some((it) => it.hechizoId === h.id && compararFechas(it.fecha, aprendidoEl) > 0)
    exige(!posterior, `hechizos[${i}].aprendidoEl`, '«Aprendido el» es anterior al último intento')
  })
  documento.pergaminos.forEach((p, i) => {
    if (p.consumidoEl !== undefined) {
      exige(
        compararFechas(p.consumidoEl, hoy) <= 0,
        `pergaminos[${i}].consumidoEl`,
        `El pergamino «${p.id}» se consumió después de la fecha actual`,
      )
    }
  })
  documento.localesComerciales.forEach((l, i) => {
    const primerTramo = l.cambiosEstado[0]
    const cuadra =
      compararFechas(l.alta, hoy) <= 0 &&
      primerTramo !== undefined &&
      compararFechas(primerTramo.desde, l.alta) >= 0 &&
      compararFechas(primerTramo.desde, hoy) <= 0 &&
      numeroDeMes(l.cobradoHasta) < numeroDeMes(mesDe(hoy)) &&
      numeroDeMes(l.cobradoHasta) >= numeroDeMes(mesDe(l.alta)) - 1
    exige(cuadra, `localesComerciales[${i}]`, `El estado o el cobro de «${l.id}» no cuadran con su alta`)
    l.producciones.forEach((p, j) => {
      exige(
        numeroDeMes(p.mes) <= numeroDeMes(mesDe(hoy)) && numeroDeMes(p.mes) >= numeroDeMes(mesDe(l.alta)),
        `localesComerciales[${i}].producciones[${j}].mes`,
        `El local «${l.id}» anota un mes que no le toca`,
      )
    })
  })
  documento.obras.forEach((o, i) => {
    const inicio = o.inicio
    if (inicio === undefined) {
      return
    }
    const fin = sumarDias(inicio, o.diasTotales - 1)
    let cuadra = fin.anio <= ANIO_MAXIMO
    if (o.estado === 'enCurso') {
      cuadra = cuadra && compararFechas(inicio, hoy) <= 0
    } else if (o.estado === 'terminada') {
      cuadra = cuadra && compararFechas(fin, hoy) <= 0
    }
    exige(cuadra, `obras[${i}]`, `El estado de la obra «${o.id}» no cuadra con sus fechas`)
  })
  documento.caravanas.forEach((c, i) => {
    let cuadra = true
    if (c.estado === 'enRuta') {
      cuadra = compararFechas(c.salida, hoy) <= 0
    } else if (c.estado === 'terminada') {
      cuadra = compararFechas(c.vuelta, hoy) <= 0
    }
    exige(cuadra, `caravanas[${i}]`, `El estado de la caravana «${c.id}» no cuadra con sus fechas`)
  })
  documento.deudas.forEach((d, i) => {
    if (d.estado !== 'vencida') {
      return
    }
    exige(
      d.vencimiento !== undefined && compararFechas(d.vencimiento, hoy) < 0,
      `deudas[${i}].vencimiento`,
      `La deuda con «${d.contraparteId}» está marcada vencida y no ha vencido`,
    )
  })

  // ---- 4.5 Coherencias entre registros ------------------------------------
  const movimientos = new Map(documento.movimientos.map((m) => [m.id, m]))
  const transferencias = new Map(documento.transferencias.map((t) => [t.id, t]))
  documento.movimientos.forEach((m, i) => {
    if (m.tipo !== 'transferencia' || m.vinculo === undefined) {
      return
    }
    const t = transferencias.get(m.vinculo.id)
    exige(
      t !== undefined && (t.movimientoSaleId === m.id || t.movimientoEntraId === m.id),
      `movimientos[${i}].vinculo`,
      `La transferencia «${m.vinculo.id}» y sus movimientos no se apuntan entre sí`,
    )
  })
  documento.transferencias.forEach((t, i) => {
    const sale = movimientos.get(t.movimientoSaleId)
    const entra = movimientos.get(t.movimientoEntraId)
    const cuadra =
      sale !== undefined &&
      entra !== undefined &&
      compararFechas(sale.fecha, t.fecha) === 0 &&
      compararFechas(entra.fecha, t.fecha) === 0 &&
      sale.importe.base === -t.importe.base &&
      entra.importe.base === t.importe.base
    exige(cuadra, `transferencias[${i}]`, `La transferencia «${t.id}» no cuadra con sus movimientos`)
  })
  documento.deudas.forEach((d, i) => {
    const cargos = d.cargos
    if (!d.impago || cargos === undefined) {
      return
    }
    const suma = cargos.reduce((total, c) => total + c.importe.base, 0)
    exige(suma === d.principal.base, `deudas[${i}].principal`, `La deuda de impago «${d.id}» no cuadra con sus cargos`)
  })
  const objetos = new Map(documento.objetos.map((o) => [o.id, o]))
  documento.pergaminos.forEach((p, i) => {
    if (p.objetoInventarioId === undefined) {
      return
    }
    const objeto = objetos.get(p.objetoInventarioId)
    if (objeto === undefined) {
      return
    }
    const ruta = `pergaminos[${i}].objetoInventarioId`
    if (p.estado === 'consumido' || p.estado === 'perdido') {
      exige(objeto.archivado === p.estado, ruta, `El objeto del pergamino «${p.id}» no está archivado`)
    } else if (p.estado === 'vendido') {
      exige(objeto.archivado === 'vendido', ruta, `El objeto del pergamino «${p.id}» no está archivado como vendido`)
    }
    exige(
      objeto.archivado !== undefined || objeto.cantidad === 1,
      ruta,
      `El objeto del pergamino «${p.id}» no tiene 1 unidad`,
    )
  })
  const dominios = new Map(documento.dominios.map((d) => [d.id, d]))
  documento.mercados.forEach((m, i) => {
    const localDe = m.localDe
    if (localDe === undefined) {
      return
    }
    const asentamiento = dominios.get(localDe)
    exige(
      asentamiento !== undefined && asentamiento.nombre === m.nombre,
      `mercados[${i}].nombre`,
      `El mercado local de «${localDe}» no lleva su nombre`,
    )
  })
  documento.edificios.forEach((e, i) => {
    if (e.estado !== 'alquilado') {
      return
    }
    const tiene = documento.impuestosRentas.some(
      (imp) => imp.dominioId === e.dominioId && imp.edificioId === e.id && imp.sentido === 'ingreso',
    )
    exige(tiene, `edificios[${i}]`, `El edificio alquilado «${e.id}» no tiene su renta`)
  })
  documento.movimientos.forEach((m, i) => {
    const regla = m.regla
    if (regla === undefined) {
      return
    }
    if (regla.tipo === 'locales' && m.detalleLocales !== undefined) {
      const suma = m.detalleLocales.reduce((total, d) => total + d.impuesto.base, 0)
      exige(
        suma === m.importe.base,
        `movimientos[${i}].detalleLocales`,
        `El cobro de locales «${m.id}» no cuadra con su detalle`,
      )
    }
    if ((regla.tipo === 'salarios' || regla.tipo === 'soldadas') && m.detalleTrabajo !== undefined) {
      const suma = m.detalleTrabajo.reduce((total, d) => total + d.importe.base, 0)
      exige(
        suma === Math.abs(m.importe.base),
        `movimientos[${i}].detalleTrabajo`,
        `El pago agrupado «${m.id}» no cuadra con su detalle`,
      )
    }
  })

  return problemas
}

/** Las comprobaciones que miran la lista de avances (4.4); un snapshotPrevio, que no la tiene, no pasa por aquí. */
function problemasDeLosAvances(documento: DocumentoPartida): ProblemaDeCoherencia[] {
  const problemas: ProblemaDeCoherencia[] = []
  const anota = (ruta: string, mensaje: string): void => {
    problemas.push({ ruta, mensaje })
  }
  const partida = documento.partida
  const avances = documento.avances
  const ultimo = avances[avances.length - 1]
  const esperada = ultimo === undefined ? partida.fechaInicial : ultimo.hasta
  if (compararFechas(partida.fechaActual, esperada) !== 0) {
    anota('partida.fechaActual', 'La fecha actual no cuadra con los avances')
  }
  avances.forEach((a, i) => {
    const anterior = avances[i - 1]
    const enOrden =
      compararFechas(a.desde, a.hasta) < 0 &&
      (anterior === undefined || (compararFechas(anterior.hasta, a.desde) <= 0 && anterior.aplicadoEl <= a.aplicadoEl))
    if (!enOrden) {
      anota(`avances[${i}]`, 'Los avances no van en orden')
    }
    if (a.snapshotPrevio !== undefined && i !== avances.length - 1) {
      anota(`avances[${i}].snapshotPrevio`, 'Solo el último avance guarda la copia de la partida')
    }
  })
  if (avances.length > 0 && compararFechas(avances[0].desde, partida.fechaInicial) < 0) {
    anota('avances[0].desde', 'Un avance empieza antes que la partida')
  }
  return problemas
}

/** Importes enteros seguros, «introducido» que cuadra, fechas, recurrencias y estados (§6.1, decisión 14). */
export function validarCoherenciaInterna(documento: DocumentoPartida): ProblemaDeCoherencia[] {
  return [...problemasDelEstado(documento), ...problemasDeLosAvances(documento)]
}

/** Las tres, sobre el documento y sobre el snapshotPrevio del último avance; es lo que llama analizarCopia (4.6). */
export function validarCopia(documento: DocumentoPartida, catalogos: CatalogosEnCopia): ProblemaDeCoherencia[] {
  const problemas = [
    ...validarReferencias(documento, catalogos),
    ...validarUnicidades(documento, catalogos),
    ...validarCoherenciaInterna(documento),
  ]
  const ultimo = documento.avances.length - 1
  const snapshot = ultimo < 0 ? undefined : documento.avances[ultimo].snapshotPrevio
  if (snapshot === undefined) {
    return problemas
  }
  const comoDocumento: DocumentoPartida = { ...snapshot, avances: [] }
  const delSnapshot = [
    ...validarReferencias(comoDocumento, catalogos),
    ...validarUnicidades(comoDocumento, catalogos),
    ...problemasDelEstado(comoDocumento),
  ]
  return [
    ...problemas,
    // Los catálogos viven en el sobre de la copia, fuera de la partida: ya los valida `problemas` una vez,
    // así que aquí se descartan para no duplicarlos con una ruta «avances[n].snapshotPrevio.catalogos…» imposible.
    ...delSnapshot
      .filter((p) => !p.ruta.startsWith('catalogos.'))
      .map((p) => ({ ruta: `avances[${ultimo}].snapshotPrevio.${p.ruta}`, mensaje: p.mensaje })),
  ]
}

/** La ruta de un error de Zod con la notación de EsquemaEstadoPartida: «partida.movimientos[1].fecha». */
function rutaDeIssue(path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return 'la copia'
  }
  return path.reduce<string>((ruta, tramo) => {
    if (typeof tramo === 'number') {
      return `${ruta}[${tramo}]`
    }
    return ruta === '' ? String(tramo) : `${ruta}.${String(tramo)}`
  }, '')
}

/** Los errores de Zod puestos en la misma forma, para que el detalle se lea igual venga de donde venga. */
export function problemasDeZod(error: z.ZodError): ProblemaDeCoherencia[] {
  return error.issues.map((issue) => ({ ruta: rutaDeIssue(issue.path), mensaje: issue.message }))
}

/** El detalle técnico plegado: «✖ mensaje» y «  → en ruta» por cada problema (decisión propia 29). */
export function detalleDeProblemas(problemas: readonly ProblemaDeCoherencia[]): string {
  return problemas.map((p) => `✖ ${p.mensaje}\n  → en ${p.ruta}`).join('\n')
}
