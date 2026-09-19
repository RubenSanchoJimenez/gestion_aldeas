import { sumarDias } from '../calendario/fecha'
import type { AcumuladoProduccion, Edificio, ProduccionEdificio } from '../modelo/asentamiento'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id, RecurrenciaProduccion } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { minusculaInicial, nombreDeFrecuencia, recursoDelCatalogo } from '../motor/textos'
import { asegurarFila } from './existencias'
import { buscarPorId, mismoRegistro, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Una producción del formulario «Edificio» / A7b. */
export interface DatosProduccion {
  id?: Id
  recursoId: Id
  cantidad: number
  recurrencia: RecurrenciaProduccion
}

/** Lo que pide el formulario «Edificio» (§6.4). */
export interface DatosEdificio {
  dominioId: Id
  tipoId: Id
  nombre: string
  estado: Edificio['estado']
  trabajadoresNecesarios: number
  producciones: DatosProduccion[]
}

/** Dos producciones de datos con el mismo recurso y la misma frecuencia → «Ya produce…: cambia su cantidad». */
function exigeSinDuplicados(producciones: readonly DatosProduccion[], catalogo: CatalogosEnCopia): void {
  for (let i = 0; i < producciones.length; i += 1) {
    for (let j = i + 1; j < producciones.length; j += 1) {
      const a = producciones[i]
      const b = producciones[j]
      if (a.recursoId === b.recursoId && mismoRegistro(a.recurrencia, b.recurrencia)) {
        const recurso = minusculaInicial(recursoDelCatalogo(catalogo, a.recursoId).nombre)
        throw new Error(`Ya produce ${recurso} ${nombreDeFrecuencia(a.recurrencia)}: cambia su cantidad`)
      }
    }
  }
}

/** Asegura la fila de cada producción en el almacén de dominioId. */
function asegurarFilasDeProducciones<E extends EstadoPartida>(
  estado: E,
  dominioId: Id,
  producciones: readonly { recursoId: Id }[],
): E {
  return producciones.reduce((acc, p) => asegurarFila(acc, dominioId, p.recursoId), estado)
}

/** «Añadir edificio»: todas sus producciones empiezan a 0 con desde = mañana; asegura sus filas. */
export function crearEdificio<E extends EstadoPartida>(
  estado: E,
  datos: DatosEdificio,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): Creado<E> {
  exigeSinDuplicados(datos.producciones, catalogo)
  const manana = sumarDias(estado.partida.fechaActual, 1)
  const acumuladoInicial: AcumuladoProduccion = { desde: manana, sumaFactores: 0 }
  const id = sello.nuevoId()
  const producciones: ProduccionEdificio[] = datos.producciones.map((p) => ({
    id: sello.nuevoId(),
    recursoId: p.recursoId,
    cantidad: p.cantidad,
    recurrencia: p.recurrencia,
    acumulado: acumuladoInicial,
  }))
  const edificio: Edificio = {
    id,
    dominioId: datos.dominioId,
    tipoId: datos.tipoId,
    nombre: datos.nombre,
    estado: datos.estado,
    trabajadoresNecesarios: datos.trabajadoresNecesarios,
    producciones,
  }
  const conFila = asegurarFilasDeProducciones(estado, datos.dominioId, producciones)
  return { estado: { ...conFila, edificios: [...conFila.edificios, edificio] }, id }
}

/**
 * «Guardar cambios» de A7b: una producción con el mismo id, el mismo recurso y la misma frecuencia
 * (mismoRegistro) conserva su acumulado; si cambia el recurso o la frecuencia, o es nueva, pasa a
 * { desde: mañana, sumaFactores: 0 }; las que no vienen se quitan. Quita avisoPendiente. Asegura las filas.
 */
export function guardarEdificio<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: Omit<DatosEdificio, 'dominioId'>,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): E {
  const anterior = buscarPorId(estado.edificios, id)
  exigeSinDuplicados(datos.producciones, catalogo)
  const manana = sumarDias(estado.partida.fechaActual, 1)
  const producciones: ProduccionEdificio[] = datos.producciones.map((p) => {
    const previa = p.id === undefined ? undefined : anterior.producciones.find((q) => q.id === p.id)
    const conserva =
      previa !== undefined && previa.recursoId === p.recursoId && mismoRegistro(previa.recurrencia, p.recurrencia)
    return {
      id: p.id ?? sello.nuevoId(),
      recursoId: p.recursoId,
      cantidad: p.cantidad,
      recurrencia: p.recurrencia,
      acumulado: conserva ? previa.acumulado : { desde: manana, sumaFactores: 0 },
    }
  })
  const nuevo: Edificio = {
    id: anterior.id,
    dominioId: anterior.dominioId,
    tipoId: datos.tipoId,
    nombre: datos.nombre,
    estado: datos.estado,
    trabajadoresNecesarios: datos.trabajadoresNecesarios,
    producciones,
  }
  const conFila = asegurarFilasDeProducciones(estado, anterior.dominioId, producciones)
  const edificios = reemplazarPorId(conFila.edificios, nuevo, sello.ahora)
  return edificios === conFila.edificios ? conFila : { ...conFila, edificios }
}

/** «Antes, termina o elimina la obra «X»» si una obra sin terminar lo mejora o lo repara; si no, null (§6.4). */
export function bloqueoAlEliminarEdificio(estado: EstadoPartida, id: Id): string | null {
  const obra = estado.obras.find(
    (o) =>
      (o.efecto.tipo === 'mejorarEdificio' || o.efecto.tipo === 'repararEdificio') &&
      o.efecto.objetivoId === id &&
      o.estado !== 'terminada',
  )
  return obra === undefined ? null : `Antes, termina o elimina la obra «${obra.nombre}»`
}

/** Trabajadores sin edificio, efectos de eventos que lo apuntan fuera, renta sin edificioId; la historia se queda. */
export function eliminarEdificio<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.edificios, id)
  const trabajadores = estado.trabajadores.map((t) => {
    if (t.edificioId !== id) {
      return t
    }
    const { edificioId: _edificioId, ...resto } = t
    return resto
  })
  const impuestosRentas = estado.impuestosRentas.map((imp) => {
    if (imp.edificioId !== id) {
      return imp
    }
    const { edificioId: _edificioId, ...resto } = imp
    return resto
  })
  const eventos = estado.eventos.map((ev) => {
    if (!ev.efectos.some((ef) => ef.objetivo.tipo === 'edificio' && ef.objetivo.id === id)) {
      return ev
    }
    return { ...ev, efectos: ev.efectos.filter((ef) => !(ef.objetivo.tipo === 'edificio' && ef.objetivo.id === id)) }
  })
  return {
    ...estado,
    trabajadores,
    impuestosRentas,
    eventos,
    edificios: quitarPorId(estado.edificios, id),
  }
}
