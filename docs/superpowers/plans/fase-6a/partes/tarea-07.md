### Tarea 7 · Equivalencias en texto

`cadenaDeEquivalencias` y `equivalenciasDesdeOro` convierten las seis proporciones de `Equivalencias` (mithril a oro, oro a plata…) en las dos cadenas que enseñan P1 y P1b: la fila completa «1 mm = 100 mo · …» de «Editar equivalencias» y la conversión acumulada en oro «1 mo = 10 mp = …» de `ResumenOro`. Es dominio puro, en un archivo nuevo, y no depende de ninguna otra tarea de la fase 6a: solo usa `formatearNumero`, que ya existe desde la fase 1 (`src/dominio/dinero/formato.ts`), y los tipos de `monedas.ts`, de la misma fase.

**Reglas de la especificación que implementa:**

- **La cadena de «Editar equivalencias» (mjs L353).** El generador de vistas escribe la fila «1 mm = 100 mo · 1 mo = 10 mp · 1 mp = 10 mb · 1 mb = 10 mc · 1 mc = 10 me · 1 me = 10 mh» debajo del título «Monedas de MERP», con las seis proporciones seguidas y separadas por «·». `cadenaDeEquivalencias` es esa fila, calculada a partir de cualquier `Equivalencias`, no solo la de por defecto.
- **La cadena acumulada de `ResumenOro` (mjs L212-215).** «1 mo = 10 mp = 100 mb = 1.000 mc»: a diferencia de la anterior, cada tramo no es la proporción entre dos monedas consecutivas, sino el valor acumulado desde el oro hasta esa moneda («100 mb» y no «10 mb»). `equivalenciasDesdeOro` es esa segunda forma, limitada a las cuatro monedas que P1b necesita (oro, plata, bronce y cobre): mithril y las inferiores a cobre (estaño y hierro) no aparecen en la bolsa inicial del personaje.
- **Cifras con el punto de los miles (contrato §3, `formatearNumero`).** Las dos funciones usan `formatearNumero(n, 0)` (sin decimales, que es como se escriben estas proporciones enteras) para que un valor de 1.000 o más lleve su punto de miles, como pide el «1.000 mc» del ejemplo de arriba.

**Archivos:**
- Crear: `src/dominio/dinero/textosEquivalencias.ts`
- Prueba: `src/dominio/dinero/textosEquivalencias.test.ts`

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
cd C:/Proyectos/GA/gestion_aldeas
git status --short
npm test
```

Salida esperada: árbol de trabajo limpio y las pruebas que dejó la tarea 6: **927 pruebas en 86 archivos** (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  86 passed (86)
      Tests  927 passed (927)
   Start at  22:01:00
   Duration  28.00s (transform 34%, import 27%, environment 25%, setup 10%, tests 3%, worker 1%)
```

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +5 pruebas y +1 archivo sobre lo que dejó la tarea 6, no una cifra absoluta.

- [ ] **Paso 2: Escribir la prueba que falla**

Crea `src/dominio/dinero/textosEquivalencias.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { EQUIVALENCIAS_POR_DEFECTO } from './monedas'
import { cadenaDeEquivalencias, equivalenciasDesdeOro } from './textosEquivalencias'

describe('textos de las equivalencias', () => {
  it('cadenaDeEquivalencias encadena las seis, con las equivalencias por defecto', () => {
    expect(cadenaDeEquivalencias(EQUIVALENCIAS_POR_DEFECTO)).toBe(
      '1 mm = 100 mo · 1 mo = 10 mp · 1 mp = 10 mb · 1 mb = 10 mc · 1 mc = 10 me · 1 me = 10 mh',
    )
  })

  it('equivalenciasDesdeOro acumula desde el oro hasta el cobre, con las equivalencias por defecto', () => {
    expect(equivalenciasDesdeOro(EQUIVALENCIAS_POR_DEFECTO)).toBe('1 mo = 10 mp = 100 mb = 1.000 mc')
  })

  it('con moEnMp a 12 cambian las dos cadenas', () => {
    const eq = { ...EQUIVALENCIAS_POR_DEFECTO, moEnMp: 12 }
    expect(equivalenciasDesdeOro(eq)).toBe('1 mo = 12 mp = 120 mb = 1.200 mc')
    expect(cadenaDeEquivalencias(eq)).toBe(
      '1 mm = 100 mo · 1 mo = 12 mp · 1 mp = 10 mb · 1 mb = 10 mc · 1 mc = 10 me · 1 me = 10 mh',
    )
  })

  it('pone el punto de los miles desde 1.000, con mmEnMo a 1000', () => {
    const eq = { ...EQUIVALENCIAS_POR_DEFECTO, mmEnMo: 1000 }
    expect(cadenaDeEquivalencias(eq)).toBe(
      '1 mm = 1.000 mo · 1 mo = 10 mp · 1 mp = 10 mb · 1 mb = 10 mc · 1 mc = 10 me · 1 me = 10 mh',
    )
  })
})
```

Son las **4 pruebas** del contrato §5.4: las dos cadenas con las equivalencias por defecto, el cambio de `moEnMp` (que altera las dos, porque `equivalenciasDesdeOro` arrastra el acumulado desde plata) y el punto de los miles.

- [ ] **Paso 3: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/dinero/textosEquivalencias.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./textosEquivalencias`, que todavía no existe (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |nodo| src/dominio/dinero/textosEquivalencias.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |nodo| src/dominio/dinero/textosEquivalencias.test.ts [ src/dominio/dinero/textosEquivalencias.test.ts ]
Error: Cannot find module './textosEquivalencias' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/dinero/textosEquivalencias.test.ts
 ❯ src/dominio/dinero/textosEquivalencias.test.ts:3:1
      1| import { describe, expect, it } from 'vitest'
      2| import { EQUIVALENCIAS_POR_DEFECTO } from './monedas'
      3| import { cadenaDeEquivalencias, equivalenciasDesdeOro } from './textos…
       | ^
      4|
      5| describe('textos de las equivalencias', () => {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:01:10
   Duration  0.39s (worker 97%, environment 3%)
```

- [ ] **Paso 4: Implementar `textosEquivalencias.ts`**

Crea `src/dominio/dinero/textosEquivalencias.ts` con este contenido:

```ts
import { formatearNumero } from './formato'
import { MONEDAS, type Equivalencias, type Moneda } from './monedas'

/** Campo que convierte cada moneda de MONEDAS en la siguiente, en el mismo orden (espejo del privado de monedas.ts). */
const CAMPOS: readonly (keyof Equivalencias)[] = ['mmEnMo', 'moEnMp', 'mpEnMb', 'mbEnMc', 'mcEnMe', 'meEnMh']

/** «1 mm = 100 mo · 1 mo = 10 mp · 1 mp = 10 mb · 1 mb = 10 mc · 1 mc = 10 me · 1 me = 10 mh» (P1, mjs L353). */
export function cadenaDeEquivalencias(eq: Equivalencias): string {
  return CAMPOS.map((campo, i) => `1 ${MONEDAS[i]} = ${formatearNumero(eq[campo], 0)} ${MONEDAS[i + 1]}`).join(' · ')
}

/** Las cuatro monedas de equivalenciasDesdeOro, del oro al cobre. */
const DESDE_ORO: readonly Moneda[] = ['mo', 'mp', 'mb', 'mc']

/** «1 mo = 10 mp = 100 mb = 1.000 mc»: valores acumulados desde el oro hasta el cobre (P1b, mjs L215). */
export function equivalenciasDesdeOro(eq: Equivalencias): string {
  let acumulado = 1
  const partes = [`1 ${DESDE_ORO[0]}`]
  for (let i = 1; i < DESDE_ORO.length; i += 1) {
    acumulado *= eq[CAMPOS[i]]
    partes.push(`${formatearNumero(acumulado, 0)} ${DESDE_ORO[i]}`)
  }
  return partes.join(' = ')
}
```

`CAMPOS` es el mismo orden que `MONEDAS` (`['mm', 'mo', 'mp', 'mb', 'mc', 'me', 'mh']`, ya exportado por `monedas.ts`), así que `CAMPOS[i]` siempre es la proporción entre `MONEDAS[i]` y `MONEDAS[i + 1]`. `equivalenciasDesdeOro` arranca en «1 mo» y multiplica el acumulado por cada `CAMPOS[i]` empezando en `i = 1` (`moEnMp`, que es la proporción de plata sobre oro), porque el primer tramo (`mmEnMo`) queda antes del oro y no entra en esta cadena.

Este módulo solo importa `./formato` y `./monedas`: la prueba de pureza de la fase 1 lo acepta sin más.

- [ ] **Paso 5: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/dinero/textosEquivalencias.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  22:01:20
   Duration  0.35s (transform 55%, import 28%, worker 9%, tests 8%)
```

- [ ] **Paso 6: Comprobar los tipos, el lint, todas las pruebas y el build**

```bash
npx tsc -b
npm run lint
npm test
npm run build
```

`npx tsc -b` no escribe nada. `npm run lint` termina sin avisos. `textosEquivalencias.ts` es un módulo nuevo de `src/dominio`, así que `pureza.test.ts` suma una prueba más: esta tarea aporta **+5 pruebas y +1 archivo** (las 4 de `textosEquivalencias.test.ts` más 1 de `pureza.test.ts`) sobre lo que dejó la tarea 6. Con las tareas 1 a 7 ya aplicadas, `npm test` debería terminar en **932 pruebas en 87 archivos**:

```text
 Test Files  87 passed (87)
      Tests  932 passed (932)
```

`npm run build` termina con `✓ built in …`.

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +5 pruebas y +1 archivo sobre lo que dejó la tarea 6.

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/dinero/textosEquivalencias.ts src/dominio/dinero/textosEquivalencias.test.ts
git commit -m "feat(dominio): cadenaDeEquivalencias y equivalenciasDesdeOro, para P1 y P1b" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 4d5e6f7] feat(dominio): cadenaDeEquivalencias y equivalenciasDesdeOro, para P1 y P1b
 2 files changed, 54 insertions(+)
 create mode 100644 src/dominio/dinero/textosEquivalencias.test.ts
 create mode 100644 src/dominio/dinero/textosEquivalencias.ts
```

`git status --short` no muestra nada.

---
