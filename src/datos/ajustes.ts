import type { BaseDeDatos } from './baseDeDatos'

/** Ajustes de la app, fuera de toda partida; la fase 9 añadirá los «Recientes» de los selectores (§6.5). */
export interface AjustesApp {
  versionCatalogo: number
}

export type ClaveAjuste = keyof AjustesApp

/** Si el valor guardado es del tipo que la app espera para esa clave; la fase 9 añadirá los «Recientes» (§6.5). */
function esDelTipoEsperado(clave: ClaveAjuste, valor: unknown): boolean {
  return clave === 'versionCatalogo' && typeof valor === 'number'
}

/** Valor de un ajuste, o undefined si nunca se ha guardado o si lo guardado no es del tipo que toca. */
export async function leerAjuste<C extends ClaveAjuste>(
  db: BaseDeDatos,
  clave: C,
): Promise<AjustesApp[C] | undefined> {
  const fila = await db.ajustes.get(clave)
  if (fila === undefined || !esDelTipoEsperado(clave, fila.valor)) {
    return undefined
  }
  return fila.valor as AjustesApp[C]
}

/** Guarda (o reemplaza) el valor de un ajuste. */
export async function guardarAjuste<C extends ClaveAjuste>(
  db: BaseDeDatos,
  clave: C,
  valor: AjustesApp[C],
): Promise<void> {
  await db.ajustes.put({ clave, valor })
}

/** Todos los ajustes guardados, para la pantalla de ajustes (P6). */
export async function leerAjustes(db: BaseDeDatos): Promise<Partial<AjustesApp>> {
  const ajustes: Partial<AjustesApp> = {}
  for (const fila of await db.ajustes.toArray()) {
    if (fila.clave === 'versionCatalogo' && typeof fila.valor === 'number') {
      ajustes.versionCatalogo = fila.valor
    }
  }
  return ajustes
}
