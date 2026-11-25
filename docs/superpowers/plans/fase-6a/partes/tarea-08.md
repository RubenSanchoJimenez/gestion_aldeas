### Tarea 8 · Orden de los dominios, nombres y textos de partida

Esta tarea junta dos piezas pequeñas que P0 y el menú necesitan antes de que exista ninguna pantalla: el orden en que se listan los dominios de una partida (D-080) y las validaciones y textos del nombre. `ordenarDominios` corrige un desempate que hoy decide `resumenDePartida` por id, y que da un orden distinto del de las vistas; `textos.ts` añade `errorDeNombre` (el mismo mensaje de J2e que usarán P1, P1b y «Editar partida») y `textoDominios` (la frase «Tharan, Bree y Archet» de la tarjeta de P0). Las dos partes son independientes entre sí, así que se implementan por separado, pero la de `ordenarDominios` toca además un archivo que ya existe, `src/dominio/modelo/resumen.ts`, y es la única excepción a «lo nuevo va en archivos nuevos» que permite el contrato (D-080; la fase 3 no toca ese archivo).

**Reglas de la especificación que implementa:**

- **D-080, el orden de los dominios.** «Los asentamientos salen en el menú y en las tarjetas del selector de partidas por su fecha de alta y, si empatan, en el orden en que los creaste.» Hoy `resumenDePartida` desempata por `id` (`src/dominio/modelo/resumen.ts` L85), y con el ejemplo eso da «Tharan, Archet y Bree»; las vistas dicen «Tharan, Bree y Archet» (mjs L321) y el menú de §5 (espec. L191-201; mjs L241) usa el mismo orden. `DOMINIOS` del ejemplo guarda el orden Tharan, Bree, Archet (`src/dominio/ejemplo/partidaYPersonaje.ts` L62-67), así que el desempate correcto es el orden del propio documento, no el id.
- **El personaje siempre primero (D-080; contrato §5.5).** «El personaje primero; después los asentamientos por su alta y, si empatan, en el orden del documento.» `ordenarDominios` no reordena el personaje: solo hay uno por partida (regla de la fase 2), así que basta con sacarlo antes de ordenar el resto.
- **J2e, el error del nombre (espec. L1452; D-088).** «El nombre de la partida y el del personaje se guardan sin espacios al principio ni al final. Si falta, sale «Escribe un nombre», y el campo no deja pasar de 60 letras.» El límite de 60 es el de `EsquemaNombreLibre` (`comunes.ts` L150, D-014), y `errorDeNombre` es la misma regla que usarán P1, P1b (tarea 27) y «Editar partida» (tarea 29), para no repetirla tres veces.
- **`textoDominios`, la frase de la tarjeta de P0 (mjs L321-322).** «Tharan, Bree y Archet» con tres o más, «Tharan y Bree» con dos, «Aldric, sin asentamientos» con uno (el personaje solo) y nada si la lista llega vacía, caso que no se da en la app (siempre hay al menos el personaje) pero que la función cubre igualmente.

**Archivos:**
- Crear: `src/dominio/partidas/orden.ts`, `src/dominio/partidas/textos.ts`
- Prueba: `src/dominio/partidas/orden.test.ts`, `src/dominio/partidas/textos.test.ts`
- Modificar: `src/dominio/modelo/resumen.ts`, `src/dominio/modelo/resumen.test.ts` (D-080: usa `ordenarDominios` en vez de desempatar por id)

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
cd C:/Proyectos/GA/gestion_aldeas
git status --short
npm test
```

Salida esperada: árbol de trabajo limpio y las pruebas que dejó la tarea 7: **932 pruebas en 87 archivos** (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  87 passed (87)
      Tests  932 passed (932)
   Start at  22:02:00
   Duration  28.00s (transform 34%, import 27%, environment 25%, setup 10%, tests 3%, worker 1%)
```

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +13 pruebas y +2 archivos sobre lo que dejó la tarea 7, no una cifra absoluta.

- [ ] **Paso 2: Escribir las tres pruebas que fallan**

La carpeta `src/dominio/partidas/` es nueva. Se escriben las tres a la vez: `orden.test.ts` y `textos.test.ts` porque no dependen entre sí, y la modificación de `resumen.test.ts` porque es la misma decisión (D-080) que hace fallar la prueba de `orden.test.ts` sobre el ejemplo.

Crea `src/dominio/partidas/orden.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Dominio } from '../modelo/dominios'
import { ordenarDominios } from './orden'

/** Dos asentamientos con la misma alta y uno con una posterior, para comprobar el desempate (D-080). */
const DOMINIOS: Dominio[] = [
  { id: 'dom.personaje', tipo: 'personaje', nombre: 'Aldric' },
  { id: 'dom.zarcero', tipo: 'asentamiento', nombre: 'Zarcero', categoria: 'aldea', alta: { anio: 1640, mes: 1, dia: 1 } },
  { id: 'dom.bree', tipo: 'asentamiento', nombre: 'Bree', categoria: 'pueblo', alta: { anio: 1640, mes: 1, dia: 1 } },
  { id: 'dom.archet', tipo: 'asentamiento', nombre: 'Archet', categoria: 'aldea', alta: { anio: 1640, mes: 2, dia: 20 } },
]

describe('ordenarDominios', () => {
  it('con el ejemplo, da Tharan, Bree y Archet', () => {
    const documento = documentoDeEjemplo()
    expect(ordenarDominios(documento.dominios).map((d) => d.nombre)).toEqual(['Tharan', 'Bree', 'Archet'])
  })

  it('un empate conserva el orden del documento', () => {
    expect(ordenarDominios(DOMINIOS).map((d) => d.nombre)).toEqual(['Aldric', 'Zarcero', 'Bree', 'Archet'])
  })

  it('el alta posterior va después aunque esté antes en el documento', () => {
    const conArchetPrimero: Dominio[] = [DOMINIOS[3], DOMINIOS[1], DOMINIOS[2], DOMINIOS[0]]
    expect(ordenarDominios(conArchetPrimero).map((d) => d.nombre)).toEqual(['Aldric', 'Zarcero', 'Bree', 'Archet'])
  })

  it('no muta la entrada', () => {
    const copia = [...DOMINIOS]
    ordenarDominios(DOMINIOS)
    expect(DOMINIOS).toEqual(copia)
  })
})
```

Crea `src/dominio/partidas/textos.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { errorDeNombre, textoDominios } from './textos'

describe('errorDeNombre', () => {
  it('vacío o solo espacios da «Escribe un nombre»', () => {
    expect(errorDeNombre('')).toBe('Escribe un nombre')
    expect(errorDeNombre('   ')).toBe('Escribe un nombre')
  })

  it('60 letras es válido', () => {
    expect(errorDeNombre('a'.repeat(60))).toBeNull()
  })

  it('61 letras da el error', () => {
    expect(errorDeNombre('a'.repeat(61))).toBe('El nombre no puede pasar de 60 letras')
  })
})

describe('textoDominios', () => {
  it('con 1 nombre', () => {
    expect(textoDominios(['Aldric'])).toBe('Aldric, sin asentamientos')
  })

  it('con 2 nombres', () => {
    expect(textoDominios(['Tharan', 'Bree'])).toBe('Tharan y Bree')
  })

  it('con 3 nombres', () => {
    expect(textoDominios(['Tharan', 'Bree', 'Archet'])).toBe('Tharan, Bree y Archet')
  })

  it('con ninguno', () => {
    expect(textoDominios([])).toBe('')
  })
})
```

En `src/dominio/modelo/resumen.test.ts`, cambia solo estas dos líneas (dentro de `describe('resumenDePartida', ...)`, la primera prueba):

```ts
  it('pone el personaje primero y los asentamientos por su alta y, si empatan, en el orden del documento', () => {
    const resumen = resumenDePartida(DOCUMENTO, { abiertaEl: '2026-09-17T19:00:00.000Z' })
    expect(resumen.dominios).toEqual(['Tharan', 'Zarcero', 'Bree', 'Archet'])
```

(antes decían `'pone el personaje primero y los asentamientos por su alta y, si empatan, por su id'` y `['Tharan', 'Bree', 'Zarcero', 'Archet']`: el documento de prueba trae primero a Zarcero y después a Bree, los dos con la misma `alta`, así que el desempate por id daba Bree antes que Zarcero y el desempate por orden del documento da Zarcero antes que Bree). El resto del archivo no cambia.

Son **13 pruebas nuevas**: las 4 de `orden.test.ts`, las 7 de `textos.test.ts` y las 2 que `pureza.test.ts` suma por los dos módulos nuevos de `src/dominio` (`orden.ts` y `textos.ts`); `resumen.test.ts` no crece, porque solo cambia una prueba que ya existía.

- [ ] **Paso 3: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/partidas/orden.test.ts src/dominio/partidas/textos.test.ts src/dominio/modelo/resumen.test.ts
```

Fallo esperado: Vitest no encuentra `./orden` ni `./textos`, y `resumen.test.ts` falla por la aserción (todavía devuelve el orden desempatado por id, con `resumenDePartida` sin tocar). La hora y la duración varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |nodo| src/dominio/partidas/textos.test.ts (0 test)
 ❯ |nodo| src/dominio/partidas/orden.test.ts (0 test)
 ❯ |nodo| src/dominio/modelo/resumen.test.ts (2 tests | 1 failed) 12ms
   ❯ resumenDePartida (2)
     × pone el personaje primero y los asentamientos por su alta y, si empatan, en el orden del documento 9ms

⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |nodo| src/dominio/partidas/orden.test.ts [ src/dominio/partidas/orden.test.ts ]
Error: Cannot find module './orden' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/partidas/orden.test.ts
 ❯ src/dominio/partidas/orden.test.ts:4:1
      2| import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
      3| import type { Dominio } from '../modelo/dominios'
      4| import { ordenarDominios } from './orden'
       | ^
      5|
      6| /** Dos asentamientos con la misma alta y uno con una posterior, para …

 FAIL  |nodo| src/dominio/partidas/textos.test.ts [ src/dominio/partidas/textos.test.ts ]
Error: Cannot find module './textos' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/partidas/textos.test.ts
 ❯ src/dominio/partidas/textos.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import { errorDeNombre, textoDominios } from './textos'
       | ^
      3|
      4| describe('errorDeNombre', () => {

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |nodo| src/dominio/modelo/resumen.test.ts > resumenDePartida > pone el personaje primero y los asentamientos por su alta y, si empatan, en el orden del documento
AssertionError: expected [ 'Tharan', 'Bree', 'Zarcero', …(1) ] to deeply equal [ 'Tharan', 'Zarcero', 'Bree', …(1) ]

- Expected
+ Received

  [
    "Tharan",
-   "Zarcero",
    "Bree",
+   "Zarcero",
    "Archet",
  ]

 ❯ src/dominio/modelo/resumen.test.ts:66:30
     64|   it('pone el personaje primero y los asentamientos por su alta y, si …
     65|     const resumen = resumenDePartida(DOCUMENTO, { abiertaEl: '2026-09-…
     66|     expect(resumen.dominios).toEqual(['Tharan', 'Zarcero', 'Bree', 'Ar…
       |                              ^

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯


 Test Files  2 failed | 1 failed (3)
      Tests  1 failed | 1 passed (2)
   Start at  22:02:10
   Duration  0.75s (worker 96%, environment 4%)
```

- [ ] **Paso 4: Implementar `orden.ts`**

Crea `src/dominio/partidas/orden.ts` con este contenido:

```ts
import { compararFechas } from '../calendario/fecha'
import type { Dominio, DominioAsentamiento } from '../modelo/dominios'

/** Separa los asentamientos del personaje sin perder el tipo de cada uno. */
function esAsentamiento(dominio: Dominio): dominio is DominioAsentamiento {
  return dominio.tipo === 'asentamiento'
}

/** El personaje primero; después los asentamientos por su alta y, si empatan, en el orden del documento (D-080, §5). */
export function ordenarDominios(dominios: readonly Dominio[]): Dominio[] {
  const personaje = dominios.filter((d) => !esAsentamiento(d))
  // Array.prototype.sort es estable: dos asentamientos con la misma alta conservan el orden del documento.
  const asentamientos = dominios.filter(esAsentamiento).sort((a, b) => compararFechas(a.alta, b.alta))
  return [...personaje, ...asentamientos]
}
```

`Array.prototype.sort` en Node y en V8 es estable desde hace años (parte del propio estándar ECMAScript desde ES2019), así que dos asentamientos con la misma `alta` conservan el orden en que aparecen en `dominios`: no hace falta ningún desempate explícito por id ni por índice.

- [ ] **Paso 5: Implementar `textos.ts`**

Crea `src/dominio/partidas/textos.ts` con este contenido:

```ts
/** Nombre de la partida y del personaje: de 1 a 60 caracteres (EsquemaNombreLibre, comunes.ts L150; D-014). */
export const LARGO_MAXIMO_NOMBRE = 60

/** null o el error del nombre ya recortado: «Escribe un nombre» (J2e, espec. L1452) o «El nombre no puede pasar de 60 letras» (D-088). */
export function errorDeNombre(nombre: string): string | null {
  const recortado = nombre.trim()
  if (recortado === '') {
    return 'Escribe un nombre'
  }
  if (recortado.length > LARGO_MAXIMO_NOMBRE) {
    return 'El nombre no puede pasar de 60 letras'
  }
  return null
}

/** «Tharan, Bree y Archet»; «Aldric, sin asentamientos»; «Tharan y Bree»; '' si no hay ninguno (P0, mjs L321-322). */
export function textoDominios(nombres: readonly string[]): string {
  if (nombres.length === 0) {
    return ''
  }
  if (nombres.length === 1) {
    return `${nombres[0]}, sin asentamientos`
  }
  const ultimo = nombres[nombres.length - 1]
  const anteriores = nombres.slice(0, -1).join(', ')
  return `${anteriores} y ${ultimo}`
}
```

- [ ] **Paso 6: Modificar `resumen.ts` para usar `ordenarDominios`**

Reemplaza el contenido completo de `src/dominio/modelo/resumen.ts` por este:

```ts
import type { Fecha } from '../calendario/fecha'
import type { Edad } from '../calendario/formatoFecha'
import { ordenarDominios } from '../partidas/orden'
import type { Id, Instante } from './comunes'
import type { DocumentoPartida } from './documento'
import { hayAvances } from './partida'

/** Lo que P0 enseña de cada partida sin cargar el documento, más los datos de esta tablet que no viajan (§6.1). */
export interface ResumenPartida {
  id: Id
  nombre: string
  edad: Edad
  fechaInicial: Fecha
  fechaActual: Fecha
  dominios: string[]
  creada: Instante
  actualizada: Instante
  abiertaEl: Instante
  exportadaEl?: Instante
  hayAvances: boolean
}

/** Arma la fila de P0 con el documento y los datos de sesión de esta tablet (§6.1, decisión 9). */
export function resumenDePartida(
  documento: DocumentoPartida,
  sesion: { abiertaEl: Instante; exportadaEl?: Instante },
): ResumenPartida {
  return {
    id: documento.partida.id,
    nombre: documento.partida.nombre,
    edad: documento.partida.edad,
    fechaInicial: documento.partida.fechaInicial,
    fechaActual: documento.partida.fechaActual,
    dominios: ordenarDominios(documento.dominios).map((d) => d.nombre),
    creada: documento.partida.creada,
    actualizada: documento.partida.actualizada,
    abiertaEl: sesion.abiertaEl,
    exportadaEl: sesion.exportadaEl,
    hayAvances: hayAvances(documento.partida),
  }
}
```

Los cambios frente a la versión de la fase 2: se quitan `compararFechas` (ya no hace falta, lo usa `orden.ts`), `compararTexto` y `esAsentamiento` (las dos funciones privadas que hacían el desempate por id, que ahora vive en `ordenarDominios`), y `dominios:` pasa a calcularse con `ordenarDominios(documento.dominios).map((d) => d.nombre)` en vez de armar `personaje`/`asentamientos` a mano.

- [ ] **Paso 7: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/partidas/orden.test.ts src/dominio/partidas/textos.test.ts src/dominio/modelo/resumen.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  3 passed (3)
      Tests  13 passed (13)
   Start at  22:02:30
   Duration  0.55s (transform 52%, import 30%, worker 10%, tests 8%)
```

- [ ] **Paso 8: Comprobar los tipos, el lint, todas las pruebas y el build**

```bash
npx tsc -b
npm run lint
npm test
npm run build
```

`npx tsc -b` no escribe nada. `npm run lint` termina sin avisos. `orden.ts` y `textos.ts` son dos módulos nuevos de `src/dominio`, así que `pureza.test.ts` suma dos pruebas más: esta tarea aporta **+13 pruebas y +2 archivos** (4 de `orden.test.ts`, 7 de `textos.test.ts` y 2 de `pureza.test.ts`; `resumen.test.ts` no suma archivo ni prueba nueva, solo cambia una que ya existía) sobre lo que dejó la tarea 7. Con las tareas 1 a 8 ya aplicadas, `npm test` debería terminar en **945 pruebas en 89 archivos**:

```text
 Test Files  89 passed (89)
      Tests  945 passed (945)
```

`npm run build` termina con `✓ built in …`.

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +13 pruebas y +2 archivos sobre lo que dejó la tarea 7.

- [ ] **Paso 9: Commit**

```bash
git add src/dominio/partidas/orden.ts src/dominio/partidas/orden.test.ts src/dominio/partidas/textos.ts src/dominio/partidas/textos.test.ts src/dominio/modelo/resumen.ts src/dominio/modelo/resumen.test.ts
git commit -m "feat(dominio): orden de los dominios por alta (D-080) y textos de partida" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 5e6f7a8] feat(dominio): orden de los dominios por alta (D-080) y textos de partida
 6 files changed, 111 insertions(+), 25 deletions(-)
 create mode 100644 src/dominio/partidas/orden.test.ts
 create mode 100644 src/dominio/partidas/orden.ts
 create mode 100644 src/dominio/partidas/textos.test.ts
 create mode 100644 src/dominio/partidas/textos.ts
```

`git status --short` no muestra nada.

---
