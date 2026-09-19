import { claveExistencia } from '../../almacen/cantidades'
import { finDeObra } from '../../almacen/progreso'
import { compararFechas } from '../../calendario/fecha'
import type { Obra } from '../../modelo/asentamiento'
import type { Contexto, Dia } from '../contexto'

/**
 * Paso 6: cada obra en curso cuyo fin ya llegó aplica su efecto, pasa a terminada y empuja un suceso
 * `obraTerminada` (§7 l.1144-1150; §9 l.1278). Si el objetivo del efecto ya no existe, no hace nada.
 */
export function pasoObras(ctx: Contexto, dia: Dia): void {
  ctx.obras.forEach((obra, indice) => {
    if (obra.estado !== 'enCurso') {
      return
    }
    const fin = finDeObra(obra)
    if (fin === null || compararFechas(fin, dia.fecha) > 0) {
      return
    }
    aplicarEfecto(ctx, obra)
    ctx.obras[indice] = { ...obra, estado: 'terminada' }
    ctx.sucesos.push({ tipo: 'obraTerminada', dominioId: obra.dominioId, fecha: dia.fecha, nombre: obra.nombre })
  })
}

function aplicarEfecto(ctx: Contexto, obra: Obra): void {
  const efecto = obra.efecto
  switch (efecto.tipo) {
    case 'crearEdificio':
      ctx.edificios.push({
        id: ctx.opciones.nuevoId(),
        dominioId: obra.dominioId,
        tipoId: efecto.tipoId,
        nombre: obra.nombre,
        estado: 'inactivo',
        trabajadoresNecesarios: 0,
        producciones: [],
        avisoPendiente: { tipo: 'terminadoSinProduccion', obraId: obra.id },
      })
      return
    case 'mejorarEdificio': {
      const indice = ctx.edificios.findIndex((e) => e.id === efecto.objetivoId)
      if (indice === -1) {
        return
      }
      // avisoPendiente es un único campo: si el edificio ya tiene uno sin ver, no se pisa con otro del mismo avance.
      const edificio = ctx.edificios[indice]
      if (edificio.avisoPendiente === undefined) {
        ctx.edificios[indice] = { ...edificio, avisoPendiente: { tipo: 'mejoraTerminada', obraId: obra.id } }
      }
      return
    }
    case 'ampliarAlmacen': {
      // D-056: sin fila, se crea con 0 y sin capacidad; con fila sin capacidad, sigue sin límite.
      const clave = claveExistencia(obra.dominioId, efecto.recursoId)
      const fila = ctx.existencias.get(clave)
      if (fila === undefined) {
        ctx.existencias.set(clave, { dominioId: obra.dominioId, recursoId: efecto.recursoId, cantidad: 0 })
      } else if (fila.capacidad !== undefined) {
        ctx.existencias.set(clave, { ...fila, capacidad: fila.capacidad + efecto.valor })
      }
      return
    }
    case 'crearDefensa':
      ctx.defensas.push({
        id: ctx.opciones.nuevoId(),
        dominioId: obra.dominioId,
        tipoId: efecto.tipoId,
        nombre: obra.nombre,
        estado: 'buena',
      })
      return
    case 'repararDefensa': {
      const indice = ctx.defensas.findIndex((d) => d.id === efecto.objetivoId)
      if (indice === -1) {
        return
      }
      ctx.defensas[indice] = { ...ctx.defensas[indice], estado: 'buena' }
      return
    }
    case 'repararEdificio': {
      const indice = ctx.edificios.findIndex((e) => e.id === efecto.objetivoId)
      if (indice === -1) {
        return
      }
      ctx.edificios[indice] = { ...ctx.edificios[indice], estado: 'activo' }
      return
    }
  }
}
