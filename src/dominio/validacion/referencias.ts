import { RECURSO } from '../catalogo/inicial'
import type { CatalogosEnCopia, ListaCatalogo } from '../modelo/catalogos'
import type { Id, UbicacionObjeto } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import type { Vinculo } from '../modelo/movimientos'

/** Un problema que no es de forma, con la ruta dentro del documento para que el detalle sea útil. */
export interface ProblemaDeCoherencia {
  ruta: string
  mensaje: string
}

/** Los ids de una colección de registros. */
function idsDe(registros: readonly { id: Id }[]): Set<Id> {
  return new Set(registros.map((r) => r.id))
}

/** Clave de una fila de almacén: un recurso por asentamiento. */
function claveExistencia(dominioId: Id, recursoId: Id): string {
  return `${dominioId}|${recursoId}`
}

/** Errores de referencia del documento: uno por id que no apunta a nada (§6.1, contrato-modelo §4.1). */
export function validarReferencias(documento: DocumentoPartida, catalogos: CatalogosEnCopia): ProblemaDeCoherencia[] {
  const problemas: ProblemaDeCoherencia[] = []
  const anota = (ruta: string, mensaje: string): void => {
    problemas.push({ ruta, mensaje })
  }
  const exige = (hay: boolean, ruta: string, mensaje: string): void => {
    if (!hay) {
      anota(ruta, mensaje)
    }
  }

  // ---- Índices ------------------------------------------------------------
  const dominios = idsDe(documento.dominios)
  const asentamientos = new Set(documento.dominios.filter((d) => d.tipo === 'asentamiento').map((d) => d.id))
  const personajes = documento.dominios.filter((d) => d.tipo === 'personaje')
  const personajeId = personajes.length === 1 ? personajes[0].id : undefined
  const opcionesDe = (lista: ListaCatalogo): Set<Id> =>
    new Set(catalogos.opciones.filter((o) => o.lista === lista).map((o) => o.id))
  const categorias = opcionesDe('categorias')
  const oficios = opcionesDe('oficios')
  const tiposEdificio = opcionesDe('tiposEdificio')
  const tiposUnidad = opcionesDe('tiposUnidad')
  const tiposDefensa = opcionesDe('tiposDefensa')
  const tiposAnimal = opcionesDe('tiposAnimal')
  const recursos = new Set(catalogos.recursos.map((r) => r.id))
  const movimientos = new Map(documento.movimientos.map((m) => [m.id, m]))
  const transferencias = idsDe(documento.transferencias)
  const deudas = idsDe(documento.deudas)
  const pagosDeuda = new Set(documento.deudas.flatMap((d) => d.pagos.map((p) => p.id)))
  const recurrentes = idsDe(documento.recurrentes)
  const objetos = idsDe(documento.objetos)
  const ventas = idsDe(documento.ventas)
  const inversiones = idsDe(documento.inversiones)
  const hechizos = idsDe(documento.hechizos)
  const pergaminos = idsDe(documento.pergaminos)
  const existencias = new Set(documento.existencias.map((e) => claveExistencia(e.dominioId, e.recursoId)))
  const entradasAlmacen = idsDe(documento.entradasAlmacen)
  const edificios = new Map(documento.edificios.map((e) => [e.id, e]))
  const trabajadores = idsDe(documento.trabajadores)
  const obras = new Map(documento.obras.map((o) => [o.id, o]))
  const impuestosRentas = new Map(documento.impuestosRentas.map((i) => [i.id, i]))
  const tiposLocal = new Map(documento.tiposLocal.map((t) => [t.id, t]))
  const localesComerciales = idsDe(documento.localesComerciales)
  const mercados = idsDe(documento.mercados)
  const caravanas = idsDe(documento.caravanas)
  const unidadesGuarnicion = idsDe(documento.unidadesGuarnicion)
  const defensas = new Map(documento.defensas.map((d) => [d.id, d]))
  const ubicaciones = idsDe(documento.ubicaciones)
  const personas = idsDe(documento.personas)

  /** El movimiento existe y su vínculo apunta a este registro. */
  const movimientoVinculado = (movimientoId: Id, tipo: Vinculo['tipo'], id: Id): boolean => {
    const m = movimientos.get(movimientoId)
    return m !== undefined && m.vinculo !== undefined && m.vinculo.tipo === tipo && m.vinculo.id === id
  }

  /** Un registro del personaje: el dominio existe y es el del personaje. */
  const exigePersonaje = (dominioId: Id, ruta: string): void => {
    if (!dominios.has(dominioId)) {
      anota(ruta, `No existe el dominio «${dominioId}»`)
    } else if (dominioId !== personajeId) {
      anota(ruta, 'Este registro es del personaje y apunta a otro dominio')
    }
  }

  /** «Encima» no apunta a nada; la caja y el almacén, a un asentamiento; «propia», a una ubicación. */
  const exigeUbicacion = (ubicacion: UbicacionObjeto, ruta: string): void => {
    if (ubicacion.tipo === 'caja' || ubicacion.tipo === 'almacen') {
      exige(
        asentamientos.has(ubicacion.dominioId),
        `${ruta}.dominioId`,
        `No existe el asentamiento «${ubicacion.dominioId}»`,
      )
    } else if (ubicacion.tipo === 'propia') {
      exige(
        ubicaciones.has(ubicacion.ubicacionId),
        `${ruta}.ubicacionId`,
        `No existe la ubicación «${ubicacion.ubicacionId}»`,
      )
    }
  }

  // ---- Dominios y cajas ---------------------------------------------------
  if (personajes.length !== 1) {
    anota('dominios', 'Una partida tiene un solo personaje')
  }
  documento.cajas.forEach((c, i) => {
    exige(dominios.has(c.dominioId), `cajas[${i}].dominioId`, `No existe el dominio «${c.dominioId}»`)
  })
  for (const dominio of documento.dominios) {
    const cuantas = documento.cajas.filter((c) => c.dominioId === dominio.id).length
    if (cuantas === 0) {
      anota('cajas', `Falta la caja de «${dominio.id}»`)
    } else if (cuantas > 1) {
      anota('cajas', `Hay dos cajas de «${dominio.id}»`)
    }
  }

  // ---- Movimientos --------------------------------------------------------
  documento.movimientos.forEach((m, i) => {
    const r = `movimientos[${i}]`
    exige(dominios.has(m.dominioId), `${r}.dominioId`, `No existe el dominio «${m.dominioId}»`)
    exige(categorias.has(m.categoriaId), `${r}.categoriaId`, `No existe la categoría «${m.categoriaId}»`)
    if (m.vinculo !== undefined) {
      const v = m.vinculo
      const ruta = `${r}.vinculo.id`
      switch (v.tipo) {
        case 'transferencia':
          exige(transferencias.has(v.id), ruta, `No existe la transferencia «${v.id}»`)
          break
        case 'venta':
          exige(ventas.has(v.id), ruta, `No existe la venta «${v.id}»`)
          break
        case 'altaDeuda':
          exige(deudas.has(v.id), ruta, `No existe la deuda «${v.id}»`)
          break
        case 'pagoDeuda':
          exige(pagosDeuda.has(v.id), ruta, `No existe el pago de deuda «${v.id}»`)
          break
        case 'capitalInversion':
        case 'retiradaInversion':
          exige(inversiones.has(v.id), ruta, `No existe la inversión «${v.id}»`)
          break
        case 'obra':
          exige(obras.has(v.id), ruta, `No existe la obra «${v.id}»`)
          break
        case 'caravana':
          exige(caravanas.has(v.id), ruta, `No existe la caravana «${v.id}»`)
          break
        case 'entradaAlmacen':
          exige(entradasAlmacen.has(v.id), ruta, `No existe la entrada de almacén «${v.id}»`)
          break
        case 'pergamino':
          exige(pergaminos.has(v.id), ruta, `No existe el pergamino «${v.id}»`)
          break
      }
    }
    if (m.regla !== undefined) {
      const g = m.regla
      const ruta = `${r}.regla.id`
      switch (g.tipo) {
        case 'salarios':
        case 'soldadas':
        case 'locales':
          exige(asentamientos.has(g.id), ruta, `No existe el asentamiento «${g.id}»`)
          break
        case 'tributo':
        case 'impuesto': {
          const impuesto = impuestosRentas.get(g.id)
          const sentido = g.tipo === 'tributo' ? 'tributo' : 'ingreso'
          exige(
            impuesto !== undefined && impuesto.sentido === sentido,
            ruta,
            `No existe el impuesto o tributo «${g.id}»`,
          )
          break
        }
        case 'recurrente':
          exige(recurrentes.has(g.id), ruta, `No existe el gasto o ingreso recurrente «${g.id}»`)
          break
        case 'beneficio':
          exige(inversiones.has(g.id), ruta, `No existe la inversión «${g.id}»`)
          break
      }
    }
    if (m.inversionId !== undefined) {
      exige(inversiones.has(m.inversionId), `${r}.inversionId`, `No existe la inversión «${m.inversionId}»`)
    }
    m.detalleLocales?.forEach((d, j) => {
      if (d.localId !== undefined) {
        exige(
          localesComerciales.has(d.localId),
          `${r}.detalleLocales[${j}].localId`,
          `No existe el local «${d.localId}»`,
        )
      }
    })
    m.detalleTrabajo?.forEach((d, j) => {
      if (d.origenId === undefined) {
        return
      }
      const ruta = `${r}.detalleTrabajo[${j}].origenId`
      if (m.regla !== undefined && m.regla.tipo === 'soldadas') {
        exige(unidadesGuarnicion.has(d.origenId), ruta, `No existe la unidad «${d.origenId}»`)
      } else {
        exige(trabajadores.has(d.origenId), ruta, `No existe el trabajador «${d.origenId}»`)
      }
    })
    if (m.objetoPendiente !== undefined) {
      exigeUbicacion(m.objetoPendiente.ubicacion, `${r}.objetoPendiente.ubicacion`)
    }
  })

  // ---- Transferencias -----------------------------------------------------
  documento.transferencias.forEach((t, i) => {
    const r = `transferencias[${i}]`
    exige(dominios.has(t.saleDeId), `${r}.saleDeId`, `No existe el dominio «${t.saleDeId}»`)
    exige(dominios.has(t.entraEnId), `${r}.entraEnId`, `No existe el dominio «${t.entraEnId}»`)
    const sale = movimientos.get(t.movimientoSaleId)
    exige(
      movimientoVinculado(t.movimientoSaleId, 'transferencia', t.id) &&
        sale !== undefined &&
        sale.dominioId === t.saleDeId,
      `${r}.movimientoSaleId`,
      `No existe el movimiento «${t.movimientoSaleId}» de la transferencia`,
    )
    const entra = movimientos.get(t.movimientoEntraId)
    exige(
      movimientoVinculado(t.movimientoEntraId, 'transferencia', t.id) &&
        entra !== undefined &&
        entra.dominioId === t.entraEnId,
      `${r}.movimientoEntraId`,
      `No existe el movimiento «${t.movimientoEntraId}» de la transferencia`,
    )
  })

  // ---- Deudas -------------------------------------------------------------
  documento.deudas.forEach((d, i) => {
    const r = `deudas[${i}]`
    exige(dominios.has(d.dominioId), `${r}.dominioId`, `No existe el dominio «${d.dominioId}»`)
    exige(personas.has(d.contraparteId), `${r}.contraparteId`, `No existe la persona o entidad «${d.contraparteId}»`)
    if (d.cuentaAltaId !== undefined) {
      exige(dominios.has(d.cuentaAltaId), `${r}.cuentaAltaId`, `No existe el dominio «${d.cuentaAltaId}»`)
    }
    d.pagos.forEach((p, j) => {
      exige(
        movimientoVinculado(p.movimientoId, 'pagoDeuda', p.id),
        `${r}.pagos[${j}].movimientoId`,
        `No existe el movimiento «${p.movimientoId}» del pago`,
      )
    })
    // origenImpago no se comprueba: solo agrupa los impagos de un mismo origen, y ese tributo, gasto recurrente
    // o pago programado puede haberse borrado después (§6.4 l.775 y l.782; técnica 5 de la fase 3).
  })

  // ---- Recurrentes --------------------------------------------------------
  documento.recurrentes.forEach((rec, i) => {
    const r = `recurrentes[${i}]`
    exige(dominios.has(rec.dominioId), `${r}.dominioId`, `No existe el dominio «${rec.dominioId}»`)
    exige(dominios.has(rec.cuentaId), `${r}.cuentaId`, `No existe el dominio «${rec.cuentaId}»`)
    exige(categorias.has(rec.categoriaId), `${r}.categoriaId`, `No existe la categoría «${rec.categoriaId}»`)
  })

  // ---- Personaje: inventario, ventas, inversiones y estudio ---------------
  documento.objetos.forEach((o, i) => {
    const r = `objetos[${i}]`
    exigePersonaje(o.dominioId, `${r}.dominioId`)
    exigeUbicacion(o.ubicacion, `${r}.ubicacion`)
    if (o.movimientoCompraId !== undefined) {
      exige(
        movimientos.has(o.movimientoCompraId),
        `${r}.movimientoCompraId`,
        `No existe el movimiento «${o.movimientoCompraId}»`,
      )
    }
  })
  documento.ventas.forEach((v, i) => {
    const r = `ventas[${i}]`
    if (v.objetoId !== undefined) {
      exige(objetos.has(v.objetoId), `${r}.objetoId`, `No existe el objeto «${v.objetoId}»`)
    }
    if (v.compradorId !== undefined) {
      exige(personas.has(v.compradorId), `${r}.compradorId`, `No existe la persona o entidad «${v.compradorId}»`)
    }
    exige(
      movimientoVinculado(v.movimientoId, 'venta', v.id),
      `${r}.movimientoId`,
      `No existe el movimiento «${v.movimientoId}» de la venta`,
    )
  })
  documento.inversiones.forEach((inv, i) => {
    const r = `inversiones[${i}]`
    exigePersonaje(inv.dominioId, `${r}.dominioId`)
    if (inv.cuentaCapitalId !== undefined) {
      exige(dominios.has(inv.cuentaCapitalId), `${r}.cuentaCapitalId`, `No existe el dominio «${inv.cuentaCapitalId}»`)
    }
    exige(
      dominios.has(inv.cuentaBeneficiosId),
      `${r}.cuentaBeneficiosId`,
      `No existe el dominio «${inv.cuentaBeneficiosId}»`,
    )
    if (inv.estado === 'retirada') {
      exige(
        movimientoVinculado(inv.retirada.movimientoId, 'retiradaInversion', inv.id),
        `${r}.retirada.movimientoId`,
        `No existe el movimiento «${inv.retirada.movimientoId}» de la retirada`,
      )
    }
  })
  documento.hechizos.forEach((h, i) => {
    exigePersonaje(h.dominioId, `hechizos[${i}].dominioId`)
  })
  documento.intentos.forEach((it, i) => {
    const r = `intentos[${i}]`
    exige(hechizos.has(it.hechizoId), `${r}.hechizoId`, `No existe el hechizo «${it.hechizoId}»`)
    if (it.pergaminoId !== undefined) {
      exige(pergaminos.has(it.pergaminoId), `${r}.pergaminoId`, `No existe el pergamino «${it.pergaminoId}»`)
    }
  })
  documento.pergaminos.forEach((p, i) => {
    const r = `pergaminos[${i}]`
    exigePersonaje(p.dominioId, `${r}.dominioId`)
    if (p.hechizoId !== undefined) {
      exige(hechizos.has(p.hechizoId), `${r}.hechizoId`, `No existe el hechizo «${p.hechizoId}»`)
    }
    if (p.objetoInventarioId !== undefined) {
      exige(
        objetos.has(p.objetoInventarioId),
        `${r}.objetoInventarioId`,
        `No existe el objeto «${p.objetoInventarioId}»`,
      )
    }
    if (p.movimientoCompraId !== undefined) {
      exige(
        movimientos.has(p.movimientoCompraId),
        `${r}.movimientoCompraId`,
        `No existe el movimiento «${p.movimientoCompraId}»`,
      )
    }
  })

  // ---- Población y almacén ------------------------------------------------
  documento.poblaciones.forEach((p, i) => {
    const r = `poblaciones[${i}]`
    exige(asentamientos.has(p.dominioId), `${r}.dominioId`, `No existe el asentamiento «${p.dominioId}»`)
    p.consumos.forEach((c, j) => {
      const ruta = `${r}.consumos[${j}].recursoId`
      if (c.recursoId === RECURSO.viveres) {
        anota(ruta, 'El consumo de víveres sale de la ración y no se anota')
      } else {
        exige(recursos.has(c.recursoId), ruta, `No existe el recurso «${c.recursoId}»`)
      }
    })
  })
  for (const id of asentamientos) {
    const cuantas = documento.poblaciones.filter((p) => p.dominioId === id).length
    if (cuantas === 0) {
      anota('poblaciones', `Falta la población de «${id}»`)
    } else if (cuantas > 1) {
      anota('poblaciones', `Hay dos poblaciones de «${id}»`)
    }
    if (!existencias.has(claveExistencia(id, RECURSO.viveres))) {
      anota('existencias', `Falta la fila de víveres del almacén de «${id}»`)
    }
    const locales = documento.mercados.filter((m) => m.localDe === id).length
    if (locales === 0) {
      anota('mercados', `Falta el mercado local de «${id}»`)
    } else if (locales > 1) {
      anota('mercados', `Hay dos mercados locales de «${id}»`)
    }
  }
  documento.existencias.forEach((e, i) => {
    const r = `existencias[${i}]`
    exige(asentamientos.has(e.dominioId), `${r}.dominioId`, `No existe el asentamiento «${e.dominioId}»`)
    exige(recursos.has(e.recursoId), `${r}.recursoId`, `No existe el recurso «${e.recursoId}»`)
  })
  documento.ajustesExistencias.forEach((a, i) => {
    const r = `ajustesExistencias[${i}]`
    exige(asentamientos.has(a.dominioId), `${r}.dominioId`, `No existe el asentamiento «${a.dominioId}»`)
    exige(recursos.has(a.recursoId), `${r}.recursoId`, `No existe el recurso «${a.recursoId}»`)
    exige(
      existencias.has(claveExistencia(a.dominioId, a.recursoId)),
      r,
      `El almacén de «${a.dominioId}» no tiene fila de «${a.recursoId}»`,
    )
  })
  documento.entradasAlmacen.forEach((e, i) => {
    const r = `entradasAlmacen[${i}]`
    exige(asentamientos.has(e.dominioId), `${r}.dominioId`, `No existe el asentamiento «${e.dominioId}»`)
    exige(recursos.has(e.recursoId), `${r}.recursoId`, `No existe el recurso «${e.recursoId}»`)
    exige(
      existencias.has(claveExistencia(e.dominioId, e.recursoId)),
      r,
      `El almacén de «${e.dominioId}» no tiene fila de «${e.recursoId}»`,
    )
    if (e.mercadoId !== undefined) {
      exige(mercados.has(e.mercadoId), `${r}.mercadoId`, `No existe el mercado «${e.mercadoId}»`)
    }
    if (e.movimientoId !== undefined) {
      exige(
        movimientoVinculado(e.movimientoId, 'entradaAlmacen', e.id),
        `${r}.movimientoId`,
        `No existe el movimiento «${e.movimientoId}» de la entrada`,
      )
    }
    if (e.caravanaId !== undefined) {
      exige(caravanas.has(e.caravanaId), `${r}.caravanaId`, `No existe la caravana «${e.caravanaId}»`)
    }
  })

  // ---- Edificios, producción, trabajadores y obras ------------------------
  documento.edificios.forEach((e, i) => {
    const r = `edificios[${i}]`
    exige(asentamientos.has(e.dominioId), `${r}.dominioId`, `No existe el asentamiento «${e.dominioId}»`)
    exige(tiposEdificio.has(e.tipoId), `${r}.tipoId`, `No existe el tipo de edificio «${e.tipoId}»`)
    e.producciones.forEach((p, j) => {
      exige(recursos.has(p.recursoId), `${r}.producciones[${j}].recursoId`, `No existe el recurso «${p.recursoId}»`)
    })
    if (e.avisoPendiente !== undefined) {
      const obra = obras.get(e.avisoPendiente.obraId)
      exige(
        obra !== undefined && obra.estado === 'terminada',
        `${r}.avisoPendiente.obraId`,
        `No existe la obra «${e.avisoPendiente.obraId}»`,
      )
    }
  })
  documento.produccionesRealizadas.forEach((p, i) => {
    const r = `produccionesRealizadas[${i}]`
    const edificio = edificios.get(p.edificioId)
    exige(edificio !== undefined, `${r}.edificioId`, `No existe el edificio «${p.edificioId}»`)
    if (edificio !== undefined) {
      exige(
        edificio.producciones.some((q) => q.id === p.produccionId),
        `${r}.produccionId`,
        `El edificio «${p.edificioId}» no tiene la producción «${p.produccionId}»`,
      )
    }
    exige(recursos.has(p.recursoId), `${r}.recursoId`, `No existe el recurso «${p.recursoId}»`)
  })
  documento.trabajadores.forEach((t, i) => {
    const r = `trabajadores[${i}]`
    exige(asentamientos.has(t.dominioId), `${r}.dominioId`, `No existe el asentamiento «${t.dominioId}»`)
    exige(oficios.has(t.oficioId), `${r}.oficioId`, `No existe el oficio «${t.oficioId}»`)
    if (t.edificioId !== undefined) {
      const e = edificios.get(t.edificioId)
      exige(
        e !== undefined && e.dominioId === t.dominioId,
        `${r}.edificioId`,
        `No existe el edificio «${t.edificioId}» en este asentamiento`,
      )
    }
  })
  documento.obras.forEach((o, i) => {
    const r = `obras[${i}]`
    exige(asentamientos.has(o.dominioId), `${r}.dominioId`, `No existe el asentamiento «${o.dominioId}»`)
    for (const recursoId of Object.keys(o.materiales)) {
      exige(recursos.has(recursoId), `${r}.materiales.${recursoId}`, `No existe el recurso «${recursoId}»`)
    }
    const efecto = o.efecto
    switch (efecto.tipo) {
      case 'crearEdificio':
        exige(
          tiposEdificio.has(efecto.tipoId),
          `${r}.efecto.tipoId`,
          `No existe el tipo de edificio «${efecto.tipoId}»`,
        )
        break
      case 'crearDefensa':
        exige(tiposDefensa.has(efecto.tipoId), `${r}.efecto.tipoId`, `No existe el tipo de defensa «${efecto.tipoId}»`)
        break
      case 'mejorarEdificio':
      case 'repararEdificio': {
        const e = edificios.get(efecto.objetivoId)
        exige(
          e !== undefined && e.dominioId === o.dominioId,
          `${r}.efecto.objetivoId`,
          `No existe el edificio «${efecto.objetivoId}» en este asentamiento`,
        )
        break
      }
      case 'repararDefensa': {
        const d = defensas.get(efecto.objetivoId)
        exige(
          d !== undefined && d.dominioId === o.dominioId,
          `${r}.efecto.objetivoId`,
          `No existe la defensa «${efecto.objetivoId}» en este asentamiento`,
        )
        break
      }
      case 'ampliarAlmacen':
        exige(recursos.has(efecto.recursoId), `${r}.efecto.recursoId`, `No existe el recurso «${efecto.recursoId}»`)
        break
    }
    if (o.movimientoId !== undefined) {
      exige(movimientos.has(o.movimientoId), `${r}.movimientoId`, `No existe el movimiento «${o.movimientoId}»`)
    }
  })

  // ---- Impuestos, tipos de local y locales comerciales --------------------
  documento.impuestosRentas.forEach((imp, i) => {
    const r = `impuestosRentas[${i}]`
    exige(asentamientos.has(imp.dominioId), `${r}.dominioId`, `No existe el asentamiento «${imp.dominioId}»`)
    exige(categorias.has(imp.categoriaId), `${r}.categoriaId`, `No existe la categoría «${imp.categoriaId}»`)
    if (imp.destinatarioId !== undefined) {
      exige(
        personas.has(imp.destinatarioId),
        `${r}.destinatarioId`,
        `No existe la persona o entidad «${imp.destinatarioId}»`,
      )
    }
    if (imp.edificioId !== undefined) {
      const e = edificios.get(imp.edificioId)
      exige(
        e !== undefined && e.dominioId === imp.dominioId,
        `${r}.edificioId`,
        `No existe el edificio «${imp.edificioId}» en este asentamiento`,
      )
    }
  })
  documento.tiposLocal.forEach((t, i) => {
    exige(asentamientos.has(t.dominioId), `tiposLocal[${i}].dominioId`, `No existe el asentamiento «${t.dominioId}»`)
  })
  documento.localesComerciales.forEach((l, i) => {
    const r = `localesComerciales[${i}]`
    exige(asentamientos.has(l.dominioId), `${r}.dominioId`, `No existe el asentamiento «${l.dominioId}»`)
    const tipo = tiposLocal.get(l.tipoId)
    exige(
      tipo !== undefined && tipo.dominioId === l.dominioId,
      `${r}.tipoId`,
      `No existe el tipo de local «${l.tipoId}» en este asentamiento`,
    )
    if (l.titularId !== undefined) {
      exige(personas.has(l.titularId), `${r}.titularId`, `No existe la persona o entidad «${l.titularId}»`)
    }
  })

  // ---- Comercio -----------------------------------------------------------
  documento.mercados.forEach((m, i) => {
    const r = `mercados[${i}]`
    if (m.localDe !== undefined) {
      exige(asentamientos.has(m.localDe), `${r}.localDe`, `No existe el asentamiento «${m.localDe}»`)
    }
    m.precios.forEach((p, j) => {
      exige(recursos.has(p.recursoId), `${r}.precios[${j}].recursoId`, `No existe el recurso «${p.recursoId}»`)
    })
  })
  documento.rutas.forEach((ru, i) => {
    const r = `rutas[${i}]`
    exige(asentamientos.has(ru.origenId), `${r}.origenId`, `No existe el asentamiento «${ru.origenId}»`)
    if (ru.destino.tipo === 'mercado') {
      exige(mercados.has(ru.destino.id), `${r}.destino.id`, `No existe el mercado «${ru.destino.id}»`)
    } else {
      exige(asentamientos.has(ru.destino.id), `${r}.destino.id`, `No existe el asentamiento «${ru.destino.id}»`)
    }
  })
  documento.caravanas.forEach((c, i) => {
    const r = `caravanas[${i}]`
    exige(asentamientos.has(c.dominioId), `${r}.dominioId`, `No existe el asentamiento «${c.dominioId}»`)
    if (c.destinoId !== undefined) {
      exige(asentamientos.has(c.destinoId), `${r}.destinoId`, `No existe el asentamiento «${c.destinoId}»`)
    }
    if (c.mercadoId !== undefined) {
      exige(mercados.has(c.mercadoId), `${r}.mercadoId`, `No existe el mercado «${c.mercadoId}»`)
    }
    exige(recursos.has(c.carga.recursoId), `${r}.carga.recursoId`, `No existe el recurso «${c.carga.recursoId}»`)
    exige(
      existencias.has(claveExistencia(c.dominioId, c.carga.recursoId)),
      `${r}.carga`,
      `El almacén de «${c.dominioId}» no tiene fila de «${c.carga.recursoId}»`,
    )
    if (c.movimientoSalidaId !== undefined) {
      exige(
        movimientoVinculado(c.movimientoSalidaId, 'caravana', c.id),
        `${r}.movimientoSalidaId`,
        `No existe el movimiento «${c.movimientoSalidaId}» de la caravana`,
      )
    }
    if (c.movimientoVueltaId !== undefined) {
      exige(
        movimientoVinculado(c.movimientoVueltaId, 'caravana', c.id),
        `${r}.movimientoVueltaId`,
        `No existe el movimiento «${c.movimientoVueltaId}» de la caravana`,
      )
    }
  })

  // ---- Guarnición, defensas, animales y armería ---------------------------
  documento.unidadesGuarnicion.forEach((u, i) => {
    const r = `unidadesGuarnicion[${i}]`
    exige(asentamientos.has(u.dominioId), `${r}.dominioId`, `No existe el asentamiento «${u.dominioId}»`)
    exige(tiposUnidad.has(u.tipoId), `${r}.tipoId`, `No existe el tipo de unidad «${u.tipoId}»`)
  })
  documento.defensas.forEach((d, i) => {
    const r = `defensas[${i}]`
    exige(asentamientos.has(d.dominioId), `${r}.dominioId`, `No existe el asentamiento «${d.dominioId}»`)
    exige(tiposDefensa.has(d.tipoId), `${r}.tipoId`, `No existe el tipo de defensa «${d.tipoId}»`)
  })
  documento.animales.forEach((a, i) => {
    const r = `animales[${i}]`
    exige(asentamientos.has(a.dominioId), `${r}.dominioId`, `No existe el asentamiento «${a.dominioId}»`)
    exige(tiposAnimal.has(a.tipoId), `${r}.tipoId`, `No existe el tipo de animal «${a.tipoId}»`)
  })
  documento.armeria.forEach((o, i) => {
    exige(asentamientos.has(o.dominioId), `armeria[${i}].dominioId`, `No existe el asentamiento «${o.dominioId}»`)
  })

  // ---- Eventos ------------------------------------------------------------
  documento.eventos.forEach((e, i) => {
    const r = `eventos[${i}]`
    if (e.dominioId !== undefined) {
      exige(asentamientos.has(e.dominioId), `${r}.dominioId`, `No existe el asentamiento «${e.dominioId}»`)
    }
    e.efectos.forEach((ef, j) => {
      const ruta = `${r}.efectos[${j}].objetivo.id`
      const objetivo = ef.objetivo
      if (objetivo.tipo === 'edificio') {
        const ed = edificios.get(objetivo.id)
        exige(
          ed !== undefined && ed.dominioId === e.dominioId,
          ruta,
          `No existe el edificio «${objetivo.id}» en este asentamiento`,
        )
      } else if (objetivo.tipo === 'recurso') {
        exige(recursos.has(objetivo.id), ruta, `No existe el recurso «${objetivo.id}»`)
      } else if (objetivo.tipo === 'impuesto') {
        const imp = impuestosRentas.get(objetivo.id)
        exige(
          imp !== undefined && imp.dominioId === e.dominioId,
          ruta,
          `No existe el impuesto o renta «${objetivo.id}» en este asentamiento`,
        )
      }
    })
  })

  return problemas
}
