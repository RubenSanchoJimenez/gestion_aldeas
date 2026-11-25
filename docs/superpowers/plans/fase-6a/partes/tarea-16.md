### Tarea 16 · Aviso

`Aviso` es el bloque de color de §6.6 que avisa de algo sin que el color vaya solo: siempre lleva un icono y un texto. Lo usan, entre otras, la «Editar partida» de la tarea 29 («Solo se pueden cambiar antes del primer avance»), P1 con el icono `calendario` forzado y J2d, de la tarea 19, con el aviso oro `reloj_arena`. Esta tarea depende de la 12 (`Icono` y `NombreIcono`, de `iconos/trazos.ts` e `iconos/Icono.tsx`): el aviso no dibuja nada por sí mismo, delega el trazo en el icono.

**Nota de dependencia entre grupos.** Las pruebas de esta tarea necesitan distinguir qué icono se ha pintado (`alerta`, `reloj`, `reloj_arena`, `calendario`…) sin mirar el trazo SVG, que son cadenas largas y no dicen su nombre. El contrato (§6.1) no lo pide, pero la forma más simple de hacerlo sin tocar clases CSS (regla del §0: «para variantes y tonos se leen atributos `data-*`, nunca clases CSS») es que el `<svg>` de `Icono` lleve `data-nombre={props.nombre}`. **Esto exige que `iconos/Icono.tsx` (tarea 12) incluya ese atributo.** Si la tarea 12 ya está fusionada sin él, añade la línea `data-nombre={props.nombre}` al `<svg>` de `Icono` antes de continuar (es una línea, no cambia ninguna de las 4 pruebas de la tarea 12) y anótalo en el registro de la fase. Las tareas 19 y 20 de este mismo bloque reutilizan esta misma convención.

**Reglas de la especificación que implementa:**

- **El color nunca va solo (§10, espec. L1404).** «Importes alineados a la derecha, con signo y color (bosque o lacre)… El color nunca va solo: los estados críticos llevan icono y texto.» Es la regla completa que `Aviso` implementa: nunca hay un bloque de color sin icono y sin texto.
- **Icono por defecto de cada tono (mjs L185; contrato §6.6).** El generador de vistas asigna `alerta` al tono `lacre` y `reloj` a los demás tonos por defecto; `Aviso` deja forzar otro (`icono` opcional), como hace P1 con `calendario`.
- **Colores de cada tono (contrato §6.6, mjs L22 y `variables.css`, tarea 3).** Los cuatro tonos y sus tres colores (fondo, texto, borde) están fijados en `variables.css`, ya creado por la tarea 3: `--lacre`/`--lacre-tinte`/`--lacre-borde`, `--oro-oscuro`/`--oro-tinte`/`--oro-borde`, `--bosque`/`--bosque-tinte`/`--bosque-borde` y `--pliegue`/`--tinta-suave`/`--neutro-borde` para `neutro`.
- **Reglas nuevas de la interfaz (§0).** El tono se lee en `data-tono`, nunca en una clase CSS, y el `.tsx` solo exporta el componente, el tipo `TonoAviso` y la interfaz de props.

**Archivos:**
- Crear: `src/interfaz/comunes/Aviso.tsx`, `src/interfaz/comunes/Aviso.module.css`
- Prueba: `src/interfaz/comunes/Aviso.test.tsx`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/interfaz/comunes/Aviso.test.tsx` con este contenido:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Enlace } from './Boton'
import { Aviso } from './Aviso'

describe('Aviso', () => {
  it('lleva su tono en data-tono, en los cuatro (§6.6)', () => {
    render(
      <>
        <Aviso tono="lacre">Uno</Aviso>
        <Aviso tono="oro">Dos</Aviso>
        <Aviso tono="bosque">Tres</Aviso>
        <Aviso tono="neutro">Cuatro</Aviso>
      </>,
    )
    expect(screen.getByText('Uno').closest('[role="status"]')).toHaveAttribute('data-tono', 'lacre')
    expect(screen.getByText('Dos').closest('[role="status"]')).toHaveAttribute('data-tono', 'oro')
    expect(screen.getByText('Tres').closest('[role="status"]')).toHaveAttribute('data-tono', 'bosque')
    expect(screen.getByText('Cuatro').closest('[role="status"]')).toHaveAttribute('data-tono', 'neutro')
  })

  it('lleva el icono alerta en lacre y reloj en los demás tonos, por defecto (mjs L185)', () => {
    render(
      <>
        <Aviso tono="lacre">Uno</Aviso>
        <Aviso tono="oro">Dos</Aviso>
        <Aviso tono="bosque">Tres</Aviso>
        <Aviso tono="neutro">Cuatro</Aviso>
      </>,
    )
    expect(screen.getByText('Uno').closest('[role="status"]')?.querySelector('svg')).toHaveAttribute(
      'data-nombre',
      'alerta',
    )
    expect(screen.getByText('Dos').closest('[role="status"]')?.querySelector('svg')).toHaveAttribute(
      'data-nombre',
      'reloj',
    )
    expect(screen.getByText('Tres').closest('[role="status"]')?.querySelector('svg')).toHaveAttribute(
      'data-nombre',
      'reloj',
    )
    expect(screen.getByText('Cuatro').closest('[role="status"]')?.querySelector('svg')).toHaveAttribute(
      'data-nombre',
      'reloj',
    )
  })

  it('el icono se puede forzar, como el «calendario» de P1', () => {
    render(
      <Aviso tono="oro" icono="calendario">
        La partida empieza el domingo 1 de enero de 1640 T.E.
      </Aviso>,
    )
    expect(screen.getByRole('status').querySelector('svg')).toHaveAttribute('data-nombre', 'calendario')
  })

  it('pinta la acción, a la derecha', async () => {
    const usuario = userEvent.setup()
    const alPulsar = vi.fn()
    render(
      <Aviso tono="neutro" accion={<Enlace alPulsar={alPulsar}>Deshacer</Enlace>}>
        Se ha borrado el movimiento.
      </Aviso>,
    )
    await usuario.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(alPulsar).toHaveBeenCalledOnce()
  })
})
```

Son **4 pruebas**: los cuatro tonos, el icono por defecto, el icono forzado y la acción, exactamente las que fija el contrato §6.6.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/interfaz/comunes/Aviso.test.tsx
```

Fallo esperado: Vitest no encuentra el módulo `./Aviso`, que todavía no existe. La hora y la duración varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |interfaz| src/interfaz/comunes/Aviso.test.tsx (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |interfaz| src/interfaz/comunes/Aviso.test.tsx [ src/interfaz/comunes/Aviso.test.tsx ]
Error: Failed to resolve import "./Aviso" from "src/interfaz/comunes/Aviso.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Proyectos/GA/gestion_aldeas/src/interfaz/comunes/Aviso.test.tsx:5:22
  3  |  import { describe, expect, it, vi } from "vitest";
  4  |  import { Enlace } from "./Boton";
  5  |  import { Aviso } from "./Aviso";
     |                         ^

 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:04:11
   Duration  1.45s (environment 67%, setup 31%, transform 2%)
```

- [ ] **Paso 3: Implementar `Aviso.module.css`**

Crea `src/interfaz/comunes/Aviso.module.css` con este contenido:

```css
.aviso {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 2px 6px 2px 16px;
  border-radius: 8px;
  border-width: 1px;
  border-style: solid;
  font-size: 15px;
  font-weight: 600;
}
.aviso[data-tono='lacre'] {
  background: var(--lacre-tinte);
  color: var(--lacre);
  border-color: var(--lacre-borde);
}
.aviso[data-tono='oro'] {
  background: var(--oro-tinte);
  color: var(--oro-oscuro);
  border-color: var(--oro-borde);
}
.aviso[data-tono='bosque'] {
  background: var(--bosque-tinte);
  color: var(--bosque);
  border-color: var(--bosque-borde);
}
.aviso[data-tono='neutro'] {
  background: var(--pliegue);
  color: var(--tinta-suave);
  border-color: var(--neutro-borde);
}
.texto {
  flex: 1;
}
```

Las medidas y los colores son literales del contrato §6.6 (mjs L183-186): mínimo 48 px, relleno `2px 6px 2px 16px`, radio 8, 12 px de hueco, texto 15 px en peso 600, y los cuatro pares fondo/texto/borde de la tabla del contrato, con las variables que ya trae `variables.css` (tarea 3).

- [ ] **Paso 4: Implementar `Aviso.tsx`**

Crea `src/interfaz/comunes/Aviso.tsx` con este contenido:

```tsx
import type { ReactNode } from 'react'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/trazos'
import estilos from './Aviso.module.css'

/** Tono de un Aviso, con su color, texto y borde (§6.6, mjs L22). */
export type TonoAviso = 'lacre' | 'oro' | 'bosque' | 'neutro'

export interface PropsAviso {
  tono: TonoAviso
  children: ReactNode
  icono?: NombreIcono
  accion?: ReactNode
}

/** Icono por defecto de cada tono: alerta en lacre, reloj en los demás (mjs L185). */
function iconoPorDefecto(tono: TonoAviso): NombreIcono {
  return tono === 'lacre' ? 'alerta' : 'reloj'
}

/** Aviso de §6.6: el color nunca va solo, siempre con icono y texto (espec. L1404). */
export function Aviso(props: PropsAviso) {
  return (
    <div role="status" data-tono={props.tono} className={estilos.aviso}>
      <Icono nombre={props.icono ?? iconoPorDefecto(props.tono)} tamano={20} />
      <span className={estilos.texto}>{props.children}</span>
      {props.accion}
    </div>
  )
}
```

`role="status"` no lo pide el contrato, pero es lo que permite a las pruebas encontrar el aviso por su contenedor sin mirar clases CSS, y de paso lo anuncia a un lector de pantalla cuando aparece (razonable para un aviso, aunque no obligatorio): se anota como decisión técnica menor en el registro de la fase.

- [ ] **Paso 5: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/interfaz/comunes/Aviso.test.tsx
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  22:04:20
   Duration  3.16s (environment 48%, setup 28%, transform 10%, import 9%, tests 4%)
```

- [ ] **Paso 6: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

`npx tsc -b` no escribe nada. `npm test` suma las 4 pruebas de esta tarea (ninguna toca `src/dominio`, así que `pureza.test.ts` no cambia) sobre lo que dejó la tarea 15: **+4 pruebas y +1 archivo**. Con el punto de partida de la fase (902 pruebas en 81 archivos, contrato §11 + 334/+33) y las tareas 1 a 15 ya aplicadas, `npm test` debería terminar en **1.013 pruebas en 101 archivos**:

```text
 Test Files  101 passed (101)
      Tests  1013 passed (1013)
```

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +4 pruebas y +1 archivo sobre lo que dejó la tarea 15, no una cifra absoluta (el total depende de que las tareas 1 a 15 hayan terminado con los recuentos que fijó su propio plan).

- [ ] **Paso 7: Commit**

```bash
git add src/interfaz/comunes/Aviso.tsx src/interfaz/comunes/Aviso.module.css src/interfaz/comunes/Aviso.test.tsx
git commit -m "feat(interfaz): Aviso en sus cuatro tonos, con icono y texto siempre juntos" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 1a2b3c4] feat(interfaz): Aviso en sus cuatro tonos, con icono y texto siempre juntos
 3 files changed, 96 insertions(+)
 create mode 100644 src/interfaz/comunes/Aviso.module.css
 create mode 100644 src/interfaz/comunes/Aviso.test.tsx
 create mode 100644 src/interfaz/comunes/Aviso.tsx
```

`git status --short` no muestra nada.

---
