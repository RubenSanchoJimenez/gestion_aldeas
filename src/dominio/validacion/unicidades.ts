import { RECURSO } from '../catalogo/inicial'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { AnioMes, Id, RecurrenciaProduccion } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { esNombreReservado, normalizarNombre } from '../texto/normalizar'
import type { ProblemaDeCoherencia } from './referencias'

/** Un nombre con la ruta donde está escrito, para las unicidades de nombre de §6.6. */
interface NombreEnRuta {
  ruta: string
  nombre: string
}

/** «1640-04», la clave de un mes anotado en un local. */
function textoDeMes(mes: AnioMes): string {
  return `${mes.anio}-${String(mes.mes).padStart(2, '0')}`
}

/** Clave canónica de una frecuencia de producción: dos producciones del mismo edificio no pueden repetirla (§6.4). */
function claveRecurrencia(r: RecurrenciaProduccion): string {
  const fecha = (f?: { anio: number; mes: number; dia: number }): string =>
    f === undefined ? '' : `${f.anio}-${f.mes}-${f.dia}`
  switch (r.tipo) {
    case 'diaria':
      return `diaria|${fecha(r.inicio)}`
    case 'cadaNDias':
      return `cadaNDias|${r.n}|${fecha(r.primera)}`
    case 'semanal':
      return `semanal|${r.diaSemana}|${fecha(r.inicio)}`
    case 'quincenal':
      return `quincenal|${fecha(r.primera)}`
    case 'mensual':
      return `mensual|${r.diaMes}|${fecha(r.inicio)}`
    case 'cadaNMeses':
      return `cadaNMeses|${r.n}|${r.diaMes}|${fecha(r.primera)}`
    case 'trimestral':
      return `trimestral|${r.diaMes}|${fecha(r.primera)}`
    case 'anual':
      return `anual|${r.mes}|${r.diaMes}|${fecha(r.inicio)}`
  }
}

/** Todos los ids del documento con su ruta, también los de las listas de dentro (decisión propia 24). */
function idsDelDocumento(documento: DocumentoPartida): { ruta: string; id: Id }[] {
  const ids: { ruta: string; id: Id }[] = [{ ruta: 'partida.id', id: documento.partida.id }]
  const anota = (ruta: string, id: Id): void => {
    ids.push({ ruta, id })
  }
  documento.dominios.forEach((d, i) => anota(`dominios[${i}].id`, d.id))
  documento.movimientos.forEach((m, i) => anota(`movimientos[${i}].id`, m.id))
  documento.transferencias.forEach((t, i) => anota(`transferencias[${i}].id`, t.id))
  documento.deudas.forEach((d, i) => {
    anota(`deudas[${i}].id`, d.id)
    d.pagos.forEach((p, j) => anota(`deudas[${i}].pagos[${j}].id`, p.id))
  })
  documento.recurrentes.forEach((r, i) => anota(`recurrentes[${i}].id`, r.id))
  documento.objetos.forEach((o, i) => anota(`objetos[${i}].id`, o.id))
  documento.ventas.forEach((v, i) => anota(`ventas[${i}].id`, v.id))
  documento.inversiones.forEach((inv, i) => anota(`inversiones[${i}].id`, inv.id))
  documento.hechizos.forEach((h, i) => anota(`hechizos[${i}].id`, h.id))
  documento.intentos.forEach((it, i) => anota(`intentos[${i}].id`, it.id))
  documento.pergaminos.forEach((p, i) => anota(`pergaminos[${i}].id`, p.id))
  documento.poblaciones.forEach((p, i) => {
    p.cambios.forEach((c, j) => anota(`poblaciones[${i}].cambios[${j}].id`, c.id))
    p.consumos.forEach((c, j) => anota(`poblaciones[${i}].consumos[${j}].id`, c.id))
  })
  documento.ajustesExistencias.forEach((a, i) => anota(`ajustesExistencias[${i}].id`, a.id))
  documento.entradasAlmacen.forEach((e, i) => anota(`entradasAlmacen[${i}].id`, e.id))
  documento.edificios.forEach((e, i) => {
    anota(`edificios[${i}].id`, e.id)
    e.producciones.forEach((p, j) => anota(`edificios[${i}].producciones[${j}].id`, p.id))
  })
  documento.produccionesRealizadas.forEach((p, i) => anota(`produccionesRealizadas[${i}].id`, p.id))
  documento.trabajadores.forEach((t, i) => anota(`trabajadores[${i}].id`, t.id))
  documento.obras.forEach((o, i) => anota(`obras[${i}].id`, o.id))
  documento.impuestosRentas.forEach((imp, i) => anota(`impuestosRentas[${i}].id`, imp.id))
  documento.tiposLocal.forEach((t, i) => anota(`tiposLocal[${i}].id`, t.id))
  documento.localesComerciales.forEach((l, i) => anota(`localesComerciales[${i}].id`, l.id))
  documento.mercados.forEach((m, i) => anota(`mercados[${i}].id`, m.id))
  documento.caravanas.forEach((c, i) => anota(`caravanas[${i}].id`, c.id))
  documento.unidadesGuarnicion.forEach((u, i) => anota(`unidadesGuarnicion[${i}].id`, u.id))
  documento.defensas.forEach((d, i) => anota(`defensas[${i}].id`, d.id))
  documento.animales.forEach((a, i) => anota(`animales[${i}].id`, a.id))
  documento.armeria.forEach((o, i) => anota(`armeria[${i}].id`, o.id))
  documento.eventos.forEach((e, i) => anota(`eventos[${i}].id`, e.id))
  documento.ubicaciones.forEach((u, i) => anota(`ubicaciones[${i}].id`, u.id))
  documento.personas.forEach((p, i) => anota(`personas[${i}].id`, p.id))
  documento.avances.forEach((a, i) => anota(`avances[${i}].id`, a.id))
  return ids
}

/** Errores de unicidad: ids repetidos y los nombres únicos de §6.6 (contrato-modelo §4.2). */
export function validarUnicidades(documento: DocumentoPartida, catalogos: CatalogosEnCopia): ProblemaDeCoherencia[] {
  const problemas: ProblemaDeCoherencia[] = []
  const anota = (ruta: string, mensaje: string): void => {
    problemas.push({ ruta, mensaje })
  }

  /** Anota el segundo y siguientes que repiten una clave; `vistas` puede venir con claves ya ocupadas. */
  const sinRepetir = (
    entradas: readonly { ruta: string; clave: string }[],
    mensaje: (entrada: { ruta: string; clave: string }) => string,
    vistas: Set<string> = new Set(),
  ): void => {
    for (const entrada of entradas) {
      if (vistas.has(entrada.clave)) {
        anota(entrada.ruta, mensaje(entrada))
      } else {
        vistas.add(entrada.clave)
      }
    }
  }

  /** Lo mismo, comparando nombres normalizados y escribiendo el nombre tal cual en el mensaje. */
  const nombresUnicos = (
    nombres: readonly NombreEnRuta[],
    mensaje: (nombre: string) => string,
    ocupados: Set<string> = new Set(),
  ): void => {
    for (const n of nombres) {
      const clave = normalizarNombre(n.nombre)
      if (ocupados.has(clave)) {
        anota(n.ruta, mensaje(n.nombre))
      } else {
        ocupados.add(clave)
      }
    }
  }

  // ---- Ids ----------------------------------------------------------------
  sinRepetir(
    idsDelDocumento(documento).map((e) => ({ ruta: e.ruta, clave: e.id })),
    (e) => `El identificador «${e.clave}» está repetido`,
  )
  sinRepetir(
    catalogos.opciones.map((o, i) => ({ ruta: `catalogos.opciones[${i}].id`, clave: o.id })),
    (e) => `El identificador «${e.clave}» está repetido`,
  )
  sinRepetir(
    catalogos.recursos.map((r, i) => ({ ruta: `catalogos.recursos[${i}].id`, clave: r.id })),
    (e) => `El identificador «${e.clave}» está repetido`,
  )

  // ---- Nombres del catálogo ----------------------------------------------
  const nombresDeOpcion: NombreEnRuta[] = []
  catalogos.opciones.forEach((o, i) => {
    nombresDeOpcion.push({ ruta: `catalogos.opciones[${i}].nombre`, nombre: o.nombre })
    if (o.lista === 'oficios') {
      nombresDeOpcion.push({ ruta: `catalogos.opciones[${i}].plural`, nombre: o.plural })
    }
  })
  for (const lista of ['categorias', 'oficios', 'tiposEdificio', 'tiposUnidad', 'tiposDefensa', 'tiposAnimal'] as const) {
    const deLaLista: NombreEnRuta[] = []
    catalogos.opciones.forEach((o, i) => {
      if (o.lista !== lista) {
        return
      }
      deLaLista.push({ ruta: `catalogos.opciones[${i}].nombre`, nombre: o.nombre })
      if (o.lista === 'oficios') {
        deLaLista.push({ ruta: `catalogos.opciones[${i}].plural`, nombre: o.plural })
      }
    })
    nombresUnicos(deLaLista, (nombre) => `Ya existe «${nombre}» en esta lista`)
  }
  nombresUnicos(
    catalogos.recursos.map((r, i) => ({ ruta: `catalogos.recursos[${i}].nombre`, nombre: r.nombre })),
    (nombre) => `Ya existe el recurso «${nombre}»`,
  )
  catalogos.recursos.forEach((r, i) => {
    if (r.id !== RECURSO.viveres && normalizarNombre(r.nombre) === 'viveres') {
      anota(`catalogos.recursos[${i}].nombre`, '«Víveres» lo crea la partida con su ración')
    }
  })

  // ---- Nombres de la partida ---------------------------------------------
  const asentamientos = documento.dominios.filter((d) => d.tipo === 'asentamiento')
  const calculadas = new Set<string>(['encima'])
  for (const a of asentamientos) {
    calculadas.add(normalizarNombre(`caja de ${a.nombre}`))
    calculadas.add(normalizarNombre(`almacen de ${a.nombre}`))
  }
  nombresUnicos(
    documento.ubicaciones.map((u, i) => ({ ruta: `ubicaciones[${i}].nombre`, nombre: u.nombre })),
    (nombre) => `Ya existe la ubicación «${nombre}»`,
    calculadas,
  )
  nombresUnicos(
    documento.personas.map((p, i) => ({ ruta: `personas[${i}].nombre`, nombre: p.nombre })),
    (nombre) => `Ya existe «${nombre}» en Personas y entidades`,
  )
  nombresUnicos(
    documento.hechizos.map((h, i) => ({ ruta: `hechizos[${i}].nombre`, nombre: h.nombre })),
    (nombre) => `Ya tienes el hechizo «${nombre}»`,
  )
  // El mercado local lleva a propósito el nombre de su asentamiento (4.5), así que no choca con él ni con otro local:
  // la unicidad se comprueba sobre los mercados que no son locales, contra los asentamientos y contra los locales.
  const ocupadosPorMercados = new Set<string>()
  for (const a of asentamientos) {
    ocupadosPorMercados.add(normalizarNombre(a.nombre))
  }
  for (const m of documento.mercados) {
    if (m.localDe !== undefined) {
      ocupadosPorMercados.add(normalizarNombre(m.nombre))
    }
  }
  nombresUnicos(
    documento.mercados.flatMap((m, i) =>
      m.localDe === undefined ? [{ ruta: `mercados[${i}].nombre`, nombre: m.nombre }] : [],
    ),
    (nombre) => `Ya existe el mercado «${nombre}»`,
    ocupadosPorMercados,
  )
  for (const dominio of asentamientos) {
    nombresUnicos(
      documento.tiposLocal.flatMap((t, i) =>
        t.dominioId === dominio.id ? [{ ruta: `tiposLocal[${i}].nombre`, nombre: t.nombre }] : [],
      ),
      (nombre) => `Ya existe el tipo de local «${nombre}» en «${dominio.id}»`,
    )
  }

  // ---- Nombres reservados por los filtros (§6.6) --------------------------
  const todosLosNombres: NombreEnRuta[] = [
    ...nombresDeOpcion,
    ...catalogos.recursos.map((r, i) => ({ ruta: `catalogos.recursos[${i}].nombre`, nombre: r.nombre })),
    ...documento.ubicaciones.map((u, i) => ({ ruta: `ubicaciones[${i}].nombre`, nombre: u.nombre })),
    ...documento.personas.map((p, i) => ({ ruta: `personas[${i}].nombre`, nombre: p.nombre })),
    ...documento.hechizos.map((h, i) => ({ ruta: `hechizos[${i}].nombre`, nombre: h.nombre })),
    ...documento.mercados.map((m, i) => ({ ruta: `mercados[${i}].nombre`, nombre: m.nombre })),
    ...documento.tiposLocal.map((t, i) => ({ ruta: `tiposLocal[${i}].nombre`, nombre: t.nombre })),
  ]
  for (const n of todosLosNombres) {
    if (esNombreReservado(n.nombre)) {
      anota(n.ruta, 'Ese nombre lo usa el filtro')
    }
  }

  // ---- Claves repetidas dentro de un registro o de una colección ----------
  documento.mercados.forEach((m, i) => {
    sinRepetir(
      m.precios.map((p, j) => ({ ruta: `mercados[${i}].precios[${j}].recursoId`, clave: p.recursoId })),
      (e) => `El mercado «${m.id}» repite el precio de «${e.clave}»`,
    )
  })
  documento.localesComerciales.forEach((l, i) => {
    sinRepetir(
      l.producciones.map((p, j) => ({
        ruta: `localesComerciales[${i}].producciones[${j}].mes`,
        clave: textoDeMes(p.mes),
      })),
      (e) => `El local «${l.id}» anota dos veces el mes «${e.clave}»`,
    )
  })
  documento.edificios.forEach((e, i) => {
    const vistas = new Set<string>()
    e.producciones.forEach((p, j) => {
      const clave = `${p.recursoId}|${claveRecurrencia(p.recurrencia)}`
      if (vistas.has(clave)) {
        anota(`edificios[${i}].producciones[${j}]`, `«${e.id}» ya produce «${p.recursoId}» con esa misma frecuencia`)
      } else {
        vistas.add(clave)
      }
    })
  })
  const animalesVistos = new Set<string>()
  documento.animales.forEach((a, i) => {
    const clave = `${a.dominioId}|${a.tipoId}|${a.genero}`
    if (animalesVistos.has(clave)) {
      anota(`animales[${i}]`, `«${a.dominioId}» ya tiene una fila de ese tipo y ese género`)
    } else {
      animalesVistos.add(clave)
    }
  })
  const existenciasVistas = new Set<string>()
  documento.existencias.forEach((x, i) => {
    const clave = `${x.dominioId}|${x.recursoId}`
    if (existenciasVistas.has(clave)) {
      anota(`existencias[${i}]`, `El almacén de «${x.dominioId}» repite la fila de «${x.recursoId}»`)
    } else {
      existenciasVistas.add(clave)
    }
  })
  const rutasVistas = new Set<string>()
  documento.rutas.forEach((ru, i) => {
    const ida = `${ru.origenId}|${ru.destino.tipo}|${ru.destino.id}`
    const vuelta = ru.destino.tipo === 'asentamiento' ? `${ru.destino.id}|asentamiento|${ru.origenId}` : ida
    if (rutasVistas.has(ida) || rutasVistas.has(vuelta)) {
      anota(`rutas[${i}]`, `Ya hay una ruta entre «${ru.origenId}» y «${ru.destino.id}»`)
    } else {
      rutasVistas.add(ida)
    }
  })
  sinRepetir(
    documento.deudas.flatMap((d, i) =>
      d.impago && d.estado !== 'saldada' && d.origenImpago !== undefined
        ? [{ ruta: `deudas[${i}]`, clave: `${d.origenImpago.tipo}|${d.origenImpago.id}` }]
        : [],
    ),
    () => 'Hay dos deudas de impago abiertas del mismo origen',
  )

  return problemas
}
