### Tarea 11 · Datos: `leerResumen` y `guardarDatosDePartida`

Esta tarea cierra el hueco entre el dominio puro de la tarea 9 (`aplicarDatosDePartida`, sin IndexedDB) y la pantalla «Editar partida» de la tarea 29: `src/datos/datosDePartida.ts` es quien de verdad lee la partida guardada, la valida, cuenta el cambio y la vuelve a guardar. `src/datos/resumenes.ts` añade `leerResumen`, que necesitan tanto P6 (tarea 31, «Última copia exportada») como J2d (tarea 19, el resumen de lo que se borra). Ninguno de los dos módulos toca `src/dominio`, así que `pureza.test.ts` no crece en esta tarea.

**Reglas de la especificación que implementa:**

- **«Editar partida» cuenta como un cambio (D-089, `decisiones-fase-6a.md`).** «Guardar con algún cambio cuenta como un cambio (D-038)». `guardarDatosDePartida` es la única función de toda la fase 6a que suma a `cambiosDesdeUltimoAvance`: lo hace ella y no `aplicarDatosDePartida` (que es puro y no sabe nada de IndexedDB) porque D-038 exige contar el cambio en el momento de guardar, no en el de calcularlo.
- **Contrato §5.10, la firma literal.** «`guardarDatosDePartida`: lee el documento, aplica los datos (`aplicarDatosDePartida`) y, si algo cambió, suma 1 a `cambiosDesdeUltimoAvance` (D-038) y guarda con `guardarPartida`. Sin cambios no escribe nada. Lanza «No hay ninguna partida con el id «…»» si no existe.» Esta tarea implementa esa frase literalmente, orden incluido.
- **`leerResumen`, la fila de P0 (contrato §5.10).** «La fila de P0 de una partida (para «Última copia exportada» en P6 y J2d), o undefined.» Es una simple lectura de `db.resumenes`, ya indexada por `id` desde la tarea 9 de la fase 2 (`baseDeDatos.ts`).
- **Nota de fusión (contrato §12, punto 1).** «`guardarDatosDePartida` cuenta el cambio a mano. Con la fase 3 fusionada se reescribe sobre `guardarEdicion` (`src/datos/ediciones.ts`), que ya cuenta el cambio, para no contarlo dos veces (D-038).» Esta tarea no toca `src/datos/ediciones.ts` (no existe todavía en esta rama) ni nada de la fase 3: el contador se suma a mano aquí a sabiendas de que la 6b lo reescribirá al fusionar.

**Archivos:**
- Crear: `src/datos/resumenes.ts`, `src/datos/datosDePartida.ts`
- Prueba: `src/datos/resumenes.test.ts`, `src/datos/datosDePartida.test.ts`
- No toca: `src/datos/repositorio.ts`, `src/dominio/partidas/datos.ts` (los usa tal cual los dejó la tarea 9)

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
cd C:/Proyectos/GA/gestion_aldeas
git status --short
npm test
```

Salida esperada: árbol de trabajo limpio (ninguna línea de `git status`) y las pruebas que dejaron las tareas 1 a 10. Con el punto de partida de la fase (902 pruebas en 81 archivos, contrato §11 más las 334 pruebas y los 33 archivos que suma la fase 3 ya fusionada) y las tareas 1 a 10 aplicadas, deberían ser **977 pruebas en 92 archivos** (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  92 passed (92)
      Tests  977 passed (977)
   Start at  22:00:00
   Duration  28.00s (transform 34%, import 27%, environment 25%, setup 10%, tests 3%, worker 1%)
```

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +6 pruebas y +2 archivos sobre lo que dejó la tarea 10, no una cifra absoluta.

- [ ] **Paso 2: Escribir la prueba de `leerResumen` que falla**

Crea `src/datos/resumenes.test.ts` con este contenido:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { documentoDeEjemplo } from '../dominio/ejemplo/sombraDelEste'
import type { Instante } from '../dominio/modelo/comunes'
import type { BaseDeDatos } from './baseDeDatos'
import { baseDePrueba } from './pruebas/baseDePrueba'
import { crearPartida } from './repositorio'
import { leerResumen } from './resumenes'

const AHORA: Instante = '2026-09-17T10:00:00.000Z'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('leerResumen', () => {
  it('lee el resumen del ejemplo guardado', async () => {
    const documento = documentoDeEjemplo()
    await crearPartida(db, documento, AHORA)
    const resumen = await leerResumen(db, documento.partida.id)
    expect(resumen?.nombre).toBe('La Sombra del Este')
    expect(resumen?.dominios).toEqual(['Tharan', 'Bree', 'Archet'])
  })

  it('da undefined si no existe', async () => {
    expect(await leerResumen(db, 'p.no-existe')).toBeUndefined()
  })
})
```

Son las **2 pruebas** del contrato §5.10: el resumen del ejemplo (con el orden Tharan, Bree, Archet de D-080) y el caso sin partida.

- [ ] **Paso 3: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/datos/resumenes.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./resumenes`, que todavía no existe (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |nodo| src/datos/resumenes.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |nodo| src/datos/resumenes.test.ts [ src/datos/resumenes.test.ts ]
Error: Cannot find module './resumenes' imported from C:/Proyectos/GA/gestion_aldeas/src/datos/resumenes.test.ts
 ❯ src/datos/resumenes.test.ts:7:1
      5| import { baseDePrueba } from './pruebas/baseDePrueba'
      6| import { crearPartida } from './repositorio'
      7| import { leerResumen } from './resumenes'
       | ^
      8|
      9| const AHORA: Instante = '2026-09-17T10:00:00.000Z'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:00:10
   Duration  1.31s (worker 98%, environment 2%)
```

- [ ] **Paso 4: Implementar `resumenes.ts`**

Crea `src/datos/resumenes.ts` con este contenido:

```ts
import type { Id } from '../dominio/modelo/comunes'
import type { ResumenPartida } from '../dominio/modelo/resumen'
import type { BaseDeDatos } from './baseDeDatos'

/** La fila de P0 de una partida (para «Última copia exportada» en P6 y J2d), o undefined si no existe (§5.10). */
export async function leerResumen(db: BaseDeDatos, id: Id): Promise<ResumenPartida | undefined> {
  return db.resumenes.get(id)
}
```

- [ ] **Paso 5: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/datos/resumenes.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  22:00:20
   Duration  0.90s (import 60%, transform 30%, tests 6%, worker 4%)
```

- [ ] **Paso 6: Escribir la prueba de `guardarDatosDePartida` que falla**

Crea `src/datos/datosDePartida.test.ts` con este contenido:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { documentoDeEjemplo } from '../dominio/ejemplo/sombraDelEste'
import type { Instante } from '../dominio/modelo/comunes'
import type { BaseDeDatos } from './baseDeDatos'
import { guardarDatosDePartida } from './datosDePartida'
import { baseDePrueba } from './pruebas/baseDePrueba'
import { crearPartida, leerPartida } from './repositorio'
import { leerResumen } from './resumenes'

const AHORA: Instante = '2026-09-17T10:00:00.000Z'
const GUARDADO: Instante = '2026-09-17T11:00:00.000Z'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('guardarDatosDePartida', () => {
  it('renombrar el ejemplo cambia el resumen de P0 y sube el contador a 1', async () => {
    const documento = documentoDeEjemplo()
    await crearPartida(db, documento, AHORA)

    const resultado = await guardarDatosDePartida(
      db,
      documento.partida.id,
      { nombre: 'La Sombra del Este II', edad: documento.partida.edad, fechaInicial: documento.partida.fechaInicial },
      GUARDADO,
    )

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) {
      return
    }
    expect(resultado.cambio).toBe(true)
    expect(resultado.documento.partida.cambiosDesdeUltimoAvance).toBe(1)
    const resumen = await leerResumen(db, documento.partida.id)
    expect(resumen?.nombre).toBe('La Sombra del Este II')
  })

  it('sin cambios no cambia actualizada', async () => {
    const documento = documentoDeEjemplo()
    await crearPartida(db, documento, AHORA)

    const resultado = await guardarDatosDePartida(
      db,
      documento.partida.id,
      { nombre: documento.partida.nombre, edad: documento.partida.edad, fechaInicial: documento.partida.fechaInicial },
      GUARDADO,
    )

    expect(resultado).toEqual({ ok: true, documento, cambio: false })
    const guardado = await leerPartida(db, documento.partida.id)
    expect(guardado?.partida.actualizada).toBe(documento.partida.actualizada)
  })

  it('un error no escribe nada', async () => {
    const documento = documentoDeEjemplo()
    await crearPartida(db, documento, AHORA)

    const resultado = await guardarDatosDePartida(
      db,
      documento.partida.id,
      { nombre: '', edad: documento.partida.edad, fechaInicial: documento.partida.fechaInicial },
      GUARDADO,
    )

    expect(resultado).toEqual({ ok: false, error: 'Escribe un nombre' })
    const resumen = await leerResumen(db, documento.partida.id)
    expect(resumen?.nombre).toBe(documento.partida.nombre)
  })

  it('un id que no existe lanza', async () => {
    await expect(
      guardarDatosDePartida(
        db,
        'p.no-existe',
        { nombre: 'X', edad: 'tercera', fechaInicial: { anio: 1640, mes: 1, dia: 1 } },
        GUARDADO,
      ),
    ).rejects.toThrow('No hay ninguna partida con el id «p.no-existe»')
  })
})
```

Son las **4 pruebas** del contrato §5.10: renombrar suma el contador, sin cambios no toca `actualizada`, un error no escribe nada y un id inexistente lanza. La partida de ejemplo ya tiene avances (su `fechaActual` es posterior a `fechaInicial`), así que la primera prueba solo cambia el nombre: cambiar la fecha con avances daría `MENSAJE_SOLO_ANTES_DEL_AVANCE` (D-089), que ya prueba `aplicarDatosDePartida` en la tarea 9 y esta tarea no repite.

- [ ] **Paso 7: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/datos/datosDePartida.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./datosDePartida` (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |nodo| src/datos/datosDePartida.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |nodo| src/datos/datosDePartida.test.ts [ src/datos/datosDePartida.test.ts ]
Error: Cannot find module './datosDePartida' imported from C:/Proyectos/GA/gestion_aldeas/src/datos/datosDePartida.test.ts
 ❯ src/datos/datosDePartida.test.ts:5:1
      3| import type { Instante } from '../dominio/modelo/comunes'
      4| import type { BaseDeDatos } from './baseDeDatos'
      5| import { guardarDatosDePartida } from './datosDePartida'
       | ^
      6| import { baseDePrueba } from './pruebas/baseDePrueba'
      7| import { crearPartida, leerPartida } from './repositorio'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:00:35
   Duration  1.01s (worker 98%, environment 2%)
```

- [ ] **Paso 8: Implementar `datosDePartida.ts`**

Crea `src/datos/datosDePartida.ts` con este contenido:

```ts
import type { Id, Instante } from '../dominio/modelo/comunes'
import { aplicarDatosDePartida, type DatosDePartida, type ResultadoDatosDePartida } from '../dominio/partidas/datos'
import type { BaseDeDatos } from './baseDeDatos'
import { guardarPartida, leerPartida } from './repositorio'

/**
 * «Editar partida»: lee el documento, aplica los datos (aplicarDatosDePartida) y, si algo cambió, suma 1 a
 * cambiosDesdeUltimoAvance (D-038) y guarda con guardarPartida. Sin cambios no escribe nada. Lanza
 * «No hay ninguna partida con el id «…»» si no existe. Al fusionar la fase 3, la 6b lo reescribe sobre guardarEdicion.
 */
export async function guardarDatosDePartida(
  db: BaseDeDatos,
  id: Id,
  datos: DatosDePartida,
  ahora: Instante,
): Promise<ResultadoDatosDePartida> {
  const documento = await leerPartida(db, id)
  if (documento === undefined) {
    throw new Error(`No hay ninguna partida con el id «${id}»`)
  }
  const resultado = aplicarDatosDePartida(documento, datos)
  if (!resultado.ok || !resultado.cambio) {
    return resultado
  }
  const conContador = {
    ...resultado.documento,
    partida: {
      ...resultado.documento.partida,
      cambiosDesdeUltimoAvance: resultado.documento.partida.cambiosDesdeUltimoAvance + 1,
    },
  }
  const guardado = await guardarPartida(db, conContador, ahora)
  return { ok: true, documento: guardado, cambio: true }
}
```

`guardarPartida` (tarea 10 de la fase 2, `src/datos/repositorio.ts`) ya pone `actualizada = ahora` y reescribe el resumen; por eso `guardarDatosDePartida` no lo hace a mano, solo añade el contador antes de llamarla.

- [ ] **Paso 9: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/datos/resumenes.test.ts src/datos/datosDePartida.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  2 passed (2)
      Tests  6 passed (6)
   Start at  22:00:50
   Duration  1.03s (import 56%, transform 37%, tests 6%, worker 1%)
```

- [ ] **Paso 10: Comprobar los tipos, el lint, todas las pruebas y el build**

```bash
npx tsc -b
npm run lint
npm test
npm run build
```

`npx tsc -b` no escribe nada. `npm run lint` termina sin avisos. Ni `resumenes.ts` ni `datosDePartida.ts` tocan `src/dominio`, así que `pureza.test.ts` no crece: esta tarea suma **+6 pruebas y +2 archivos** sobre lo que dejó la tarea 10. Con las tareas 1 a 11 ya aplicadas, `npm test` debería terminar en **983 pruebas en 94 archivos**:

```text
 Test Files  94 passed (94)
      Tests  983 passed (983)
```

`npm run build` termina con `✓ built in …`.

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +6 pruebas y +2 archivos sobre lo que dejó la tarea 10.

- [ ] **Paso 11: Commit**

```bash
git add src/datos/resumenes.ts src/datos/resumenes.test.ts src/datos/datosDePartida.ts src/datos/datosDePartida.test.ts
git commit -m "feat(datos): leerResumen y guardarDatosDePartida, para P6, J2d y Editar partida" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 2b3c4d5] feat(datos): leerResumen y guardarDatosDePartida, para P6, J2d y Editar partida
 4 files changed, 162 insertions(+)
 create mode 100644 src/datos/datosDePartida.test.ts
 create mode 100644 src/datos/datosDePartida.ts
 create mode 100644 src/datos/resumenes.test.ts
 create mode 100644 src/datos/resumenes.ts
```

`git status --short` no muestra nada.

---
