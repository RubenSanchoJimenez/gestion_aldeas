### Tarea 6 · Búsqueda sin tildes

`buscarEn` es el algoritmo de búsqueda que usará `SelectorConBuscador` (tarea 20) para resaltar coincidencias y, más adelante, el buscador de P0 (tarea 30, D-084): dado un texto tal como lo ve el jugador y una búsqueda tecleada, dice si coincide y, si coincide, en qué tramo del texto **original** (con sus tildes y mayúsculas intactas), para poder resaltarlo sin desfigurarlo. Es dominio puro, en un archivo nuevo, y no depende de ninguna otra tarea de la fase 6a: solo reutiliza `normalizarNombre`, que ya existe desde la fase 2 (`src/dominio/texto/normalizar.ts`).

**Reglas de la especificación que implementa:**

- **Buscador de un selector (espec. L862).** «Sin distinguir mayúsculas ni tildes, en cualquier parte del texto y también en el dato secundario (buscar «180» encuentra «Piedra · 180 carretadas»).» Es la frase que `buscarEn` implementa entera: el segundo ejemplo de la tabla de pruebas es justo ese («Piedra · 180 carretadas» buscando «180»).
- **Mismo criterio que `normalizarNombre`, con la ñ aparte (contrato §5.3).** La comparación usa exactamente la normalización de la fase 2 (minúsculas, sin tildes ni diéresis, espacios colapsados, ñ que no equivale a n), para que un texto que `normalizarNombre` considera igual también se encuentre con `buscarEn`.
- **El resaltado necesita los índices del texto original (crítica D6a-14).** «El resaltado debe ignorar mayúsculas y tildes igual que la búsqueda (espec. L862), manteniendo los índices del texto original, porque `normalizarNombre` los cambia (quita marcas y junta espacios). Es un riesgo de implementación que merece su propia prueba.» Por eso `buscarEn` no delega sin más en `normalizarNombre(texto).includes(...)`: arma su propio texto normalizado letra a letra, llevando un mapa `[inicio, fin)` de cada carácter hacia el texto tecleado de verdad, y solo al final traduce la posición encontrada a ese texto original.

**Archivos:**
- Crear: `src/dominio/texto/buscar.ts`
- Prueba: `src/dominio/texto/buscar.test.ts`

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
cd C:/Proyectos/GA/gestion_aldeas
git status --short
npm test
```

Salida esperada: árbol de trabajo limpio (ninguna línea de `git status`) y las pruebas que dejaron las tareas 1 a 5. Con el punto de partida de la fase (902 pruebas en 81 archivos, contrato §11 más las 334 pruebas y los 33 archivos que suma la fase 3 ya fusionada) y las tareas 1 a 5 aplicadas, deberían ser **918 pruebas en 85 archivos** (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  85 passed (85)
      Tests  918 passed (918)
   Start at  22:00:00
   Duration  28.00s (transform 34%, import 27%, environment 25%, setup 10%, tests 3%, worker 1%)
```

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +9 pruebas y +1 archivo sobre lo que dejaron las tareas 1 a 5, no una cifra absoluta.

- [ ] **Paso 2: Escribir la prueba que falla**

La carpeta `src/dominio/texto/` ya existe (la creó la tarea 7 de la fase 2, con `normalizar.ts`).

Crea `src/dominio/texto/buscar.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { buscarEn } from './buscar'

describe('buscarEn', () => {
  it('encuentra una palabra sin la tilde del texto', () => {
    expect(buscarEn('Álamo', 'ala')).toEqual({ inicio: 0, fin: 3 })
  })

  it('busca también en el dato secundario, tras el separador', () => {
    expect(buscarEn('Piedra · 180 carretadas', '180')).toEqual({ inicio: 9, fin: 12 })
  })

  it('no distingue mayúsculas', () => {
    expect(buscarEn('Comida y bebida', 'BEBIDA')).toEqual({ inicio: 9, fin: 15 })
  })

  it('colapsa dos espacios del texto en uno solo de la búsqueda', () => {
    expect(buscarEn('Hobart  Brezal', 'hobart brezal')).toEqual({ inicio: 0, fin: 14 })
  })

  it('la ñ no equivale a la n', () => {
    expect(buscarEn('Señor', 'senor')).toBeNull()
  })

  it('encuentra la ñ tal cual', () => {
    expect(buscarEn('Señor', 'SEÑ')).toEqual({ inicio: 0, fin: 3 })
  })

  it('une una marca diacrítica suelta al carácter anterior (texto ya en NFD)', () => {
    expect(buscarEn(`Caf${'é'} solo`, 'cafe')).toEqual({ inicio: 0, fin: 5 })
  })

  it('una búsqueda que queda vacía al normalizarla no encuentra nada', () => {
    expect(buscarEn('cualquiera', '   ')).toBeNull()
  })
})
```

Son las **8 pruebas** de la tabla del contrato §5.3: la tilde, el dato secundario, mayúsculas, espacios dobles, la ñ (que no coincide y que sí se encuentra tal cual), una marca diacrítica suelta (el texto de prueba se escribe con `${'é'}` para forzar que Vitest lo trate como el carácter compuesto U+00E9 y no como `e` + tilde combinada, que es justo lo que mediría mal una implementación ingenua) y una búsqueda que se queda vacía.

- [ ] **Paso 3: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/texto/buscar.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./buscar`, que todavía no existe (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |nodo| src/dominio/texto/buscar.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |nodo| src/dominio/texto/buscar.test.ts [ src/dominio/texto/buscar.test.ts ]
Error: Cannot find module './buscar' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/texto/buscar.test.ts
 ❯ src/dominio/texto/buscar.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import { buscarEn } from './buscar'
       | ^
      3|
      4| describe('buscarEn', () => {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:00:10
   Duration  0.35s (worker 97%, environment 3%)
```

- [ ] **Paso 4: Implementar `buscar.ts`**

Crea `src/dominio/texto/buscar.ts` con este contenido:

```ts
import { normalizarNombre } from './normalizar'

/** Tramo [inicio, fin) del texto ORIGINAL que coincide con la búsqueda. */
export interface Coincidencia {
  inicio: number
  fin: number
}

/** Marcas diacríticas que la descomposición NFD separa de su letra (de U+0300 a U+036F), con escape: un carácter de control invisible en el código fuente es una trampa para quien lo lea o lo copie. */
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g

/** El texto normalizado letra a letra, con el tramo [inicio, fin) del ORIGINAL que corresponde a cada carácter. */
interface TextoNormalizado {
  normalizado: string
  inicios: number[]
  fines: number[]
}

/**
 * Normaliza `texto` con el mismo criterio que normalizarNombre (minúsculas, sin tildes, ñ aparte, espacios
 * colapsados sin los del principio), recorriendo unidad UTF-16 a unidad UTF-16 para poder traducir cada
 * carácter del resultado a su tramo en el texto ORIGINAL. Una marca diacrítica suelta (el texto ya venía en
 * NFD) se salta y alarga el fin del carácter anterior.
 */
function normalizarConIndices(texto: string): TextoNormalizado {
  let normalizado = ''
  const inicios: number[] = []
  const fines: number[] = []
  let enEspacio = true

  for (let i = 0; i < texto.length; i += 1) {
    const original = texto[i]
    if (/\s/.test(original)) {
      enEspacio = true
      continue
    }
    const letra =
      original === 'ñ' || original === 'Ñ'
        ? 'ñ'
        : original.toLowerCase().normalize('NFD').replace(MARCAS_DIACRITICAS, '')
    if (letra === '') {
      // Marca diacrítica suelta: el texto ya venía en NFD. Se pega al carácter anterior.
      if (fines.length > 0) {
        fines[fines.length - 1] = i + 1
      }
      continue
    }
    if (enEspacio && normalizado.length > 0) {
      normalizado += ' '
      inicios.push(i)
      fines.push(i)
    }
    enEspacio = false
    for (const caracter of letra) {
      normalizado += caracter
      inicios.push(i)
      fines.push(i + 1)
    }
  }
  return { normalizado, inicios, fines }
}

/**
 * Primera coincidencia sin mayúsculas ni tildes y con los espacios colapsados (§6.5, espec. L862; mismo criterio
 * que normalizarNombre, con la ñ aparte). null si no hay, o si la búsqueda queda vacía al normalizarla.
 */
export function buscarEn(texto: string, busqueda: string): Coincidencia | null {
  const busquedaNormalizada = normalizarNombre(busqueda)
  if (busquedaNormalizada === '') {
    return null
  }
  const { normalizado, inicios, fines } = normalizarConIndices(texto)
  const posicion = normalizado.indexOf(busquedaNormalizada)
  if (posicion === -1) {
    return null
  }
  return { inicio: inicios[posicion], fin: fines[posicion + busquedaNormalizada.length - 1] }
}
```

Por qué está construido así:

1. `normalizarConIndices` recorre `texto` posición a posición (no con `.normalize('NFD')` de golpe, que perdería la relación 1 a 1 con el original) y arma en paralelo el texto normalizado y dos arrays, `inicios` y `fines`, con el tramo del original que corresponde a cada carácter del normalizado.
2. La ñ se compara aparte (`original === 'ñ' || original === 'Ñ'`) antes de tocar `NFD`, igual que en `normalizarNombre`, para que no se confunda con una n con una marca suelta.
3. Cuando `NFD` + `MARCAS_DIACRITICAS` dejan una cadena vacía (una marca diacrítica que llegó ya separada de su letra, como puede pasar con texto importado), esa unidad no añade un carácter nuevo: alarga el `fin` del carácter anterior, para que ese acento sí quede dentro del resaltado si el anterior formaba parte de la coincidencia.
4. Los espacios se colapsan igual que en `normalizarNombre`, pero aquí cada espacio del normalizado también lleva su propio `[inicio, fin)` (un tramo vacío, en el primer espacio de la unidad de espacios del original), para no desalinear los índices de lo que viene después.
5. `buscarEn` normaliza la búsqueda con la función ya existente (no hace falta llevar sus índices) y usa `indexOf` sobre las dos cadenas normalizadas; el resultado se traduce al original con `inicios[posicion]` y `fines[posicion + longitud - 1]`.

Este módulo solo importa `./normalizar`: la prueba de pureza de la fase 2 lo acepta sin más.

- [ ] **Paso 5: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/texto/buscar.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  22:00:20
   Duration  0.40s (transform 58%, import 27%, worker 9%, tests 6%)
```

- [ ] **Paso 6: Comprobar los tipos, el lint, todas las pruebas y el build**

```bash
npx tsc -b
npm run lint
npm test
npm run build
```

`npx tsc -b` no escribe nada. `npm run lint` termina sin avisos. `buscar.ts` es un módulo nuevo de `src/dominio`, así que `pureza.test.ts` suma una prueba más: esta tarea aporta **+9 pruebas y +1 archivo** (las 8 de `buscar.test.ts` más 1 de `pureza.test.ts`) sobre lo que dejaron las tareas 1 a 5. Con las tareas 1 a 6 ya aplicadas, `npm test` debería terminar en **927 pruebas en 86 archivos**:

```text
 Test Files  86 passed (86)
      Tests  927 passed (927)
```

`npm run build` termina con `✓ built in …`.

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +9 pruebas y +1 archivo sobre lo que dejaron las tareas 1 a 5.

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/texto/buscar.ts src/dominio/texto/buscar.test.ts
git commit -m "feat(dominio): buscarEn, coincidencia sin tildes con los índices del texto original" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 3c4d5e6] feat(dominio): buscarEn, coincidencia sin tildes con los índices del texto original
 2 files changed, 114 insertions(+)
 create mode 100644 src/dominio/texto/buscar.test.ts
 create mode 100644 src/dominio/texto/buscar.ts
```

`git status --short` no muestra nada.

---
