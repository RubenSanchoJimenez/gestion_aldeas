/**
 * Quita las claves con `undefined`: un campo opcional que no se usa no se guarda. Sirve para montar registros a
 * partir de un formulario, donde lo vacío llega como `undefined`.
 */
export function sinVacios<T extends object>(registro: T): T {
  const copia = { ...registro } as Record<string, unknown>
  for (const clave of Object.keys(copia)) {
    if (copia[clave] === undefined) {
      delete copia[clave]
    }
  }
  return copia as T
}
