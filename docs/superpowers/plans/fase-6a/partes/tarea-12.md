### Tarea 12 · Iconos, emblema y filete

Esta es la primera tarea de `src/interfaz/` que pinta algo: los 42 trazos SVG que usa el resto de componentes comunes (`Boton` con icono, `Aviso`, `MensajeError`…) y el emblema de oro de la marca, que reaparece en el favicon (tarea 4) y en la cabecera del asistente de partida nueva (tarea 27). Depende solo de la tarea 2 (Vitest con el proyecto `interfaz` y Testing Library instalados): no depende de `variables.css` (tarea 3) porque el color por defecto del icono es `currentColor`, y `Emblema`/`Filete` usan `var(--oro)` directamente, sin necesitar que la variable exista todavía para que `npx tsc -b` compile (una variable CSS sin definir no es un error de TypeScript).

**Nota de dependencia entre grupos.** El `<svg>` de `Icono` lleva el atributo `data-nombre={nombre}`, que no pide ninguna prueba de esta tarea pero que necesitan las tareas 16 (`Aviso`), 19 (`ConfirmacionEliminar`) y 20 (`SelectorConBuscador`) para comprobar, sin mirar el trazo SVG completo, qué icono se ha pintado. Se añade aquí para que esas tareas no tengan que volver a esta.

**Reglas de la especificación que implementa:**

- **El emblema de la app (D-098, `decisiones-fase-6a.md`).** «Su icono es el emblema de oro sobre papel.» `Emblema` dibuja exactamente ese trazo: la estrella de cuatro puntas y el círculo relleno de `design/build-artboards.mjs` L76-77, en `var(--oro)`.
- **Contrato §6.1, firma literal.** Los 42 trazos citados por su nombre («casa, calendario, reloj_arena, reloj, usuario, torre, monedas, bolsa, balanza, repetir, maletin, libro, pergamino, ajustes, tesoro, gente, ficha, trigo, carro, escudo, bandera, alerta, check, abajo, derecha, izquierda, mas, cambio, bajar, subir, x, buscar, sube, baja, deshacer, editar, resumen, martillo, info, candado, enlazado, huella. Los informes dicen 41: son 42.»), con el mismo criterio que el generador: `viewBox="0 0 24 24"`, `strokeWidth={1.75}`, `strokeLinecap="round"`, `strokeLinejoin="round"`, 20 px por defecto (mjs L74).
- **El icono es decorativo (contrato §6.1).** «El icono es un `<svg aria-hidden="true" focusable="false" …>` con el trazo por `dangerouslySetInnerHTML`: son cadenas constantes de la app.» Nunca lleva significado propio fuera del texto que lo acompaña (regla general de accesibilidad de la fase, §10 espec. L1404: «el color nunca va solo»).
- **Reglas nuevas de la interfaz (§0).** `trazos.ts` es un `.ts` (solo exporta `ICONOS` y el tipo `NombreIcono`, ninguno es un componente); `Icono.tsx` exporta solo el componente `Icono` y su interfaz de props; `Emblema.tsx` exporta los dos componentes de presentación `Emblema` y `Filete`. Ninguno de los tres declara un *hook* ni un contexto.

**Archivos:**
- Crear: `src/interfaz/iconos/trazos.ts`, `src/interfaz/iconos/Icono.tsx`, `src/interfaz/iconos/Emblema.tsx`
- Prueba: `src/interfaz/iconos/Icono.test.tsx`

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
cd C:/Proyectos/GA/gestion_aldeas
git status --short
npm test
```

Árbol limpio y **983 pruebas en 94 archivos** (lo que dejó la tarea 11; la hora y la duración varían):

```text
 Test Files  94 passed (94)
      Tests  983 passed (983)
```

- [ ] **Paso 2: Escribir la prueba que falla**

Crea `src/interfaz/iconos/Icono.test.tsx` con este contenido:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Emblema } from './Emblema'
import { Icono } from './Icono'
import { ICONOS } from './trazos'

describe('ICONOS', () => {
  it('tiene 42 claves', () => {
    expect(Object.keys(ICONOS)).toHaveLength(42)
  })
})

describe('Icono', () => {
  it('va oculto a la accesibilidad y con 20 px por defecto', () => {
    const { container } = render(<Icono nombre="casa" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(svg).toHaveAttribute('width', '20')
    expect(svg).toHaveAttribute('height', '20')
  })

  it('aplica tamano y color', () => {
    const { container } = render(<Icono nombre="check" tamano={32} color="red" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '32')
    expect(svg).toHaveAttribute('height', '32')
    expect(svg).toHaveAttribute('stroke', 'red')
  })
})

describe('Emblema', () => {
  it('lleva el círculo relleno', () => {
    const { container } = render(<Emblema tamano={24} />)
    const circulo = container.querySelector('circle')
    expect(circulo).toHaveAttribute('fill', 'var(--oro)')
  })
})
```

Son las **4 pruebas** del contrato §6.1: `ICONOS` tiene 42 claves, el SVG oculto con 20 px por defecto, `tamano`/`color` se aplican y el Emblema lleva el círculo relleno.

- [ ] **Paso 3: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/interfaz/iconos/Icono.test.tsx
```

Fallo esperado: Vitest no encuentra ninguno de los tres módulos, que todavía no existen (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |interfaz| src/interfaz/iconos/Icono.test.tsx (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |interfaz| src/interfaz/iconos/Icono.test.tsx [ src/interfaz/iconos/Icono.test.tsx ]
Error: Failed to resolve import "./trazos" from "src/interfaz/iconos/Icono.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Proyectos/GA/gestion_aldeas/src/interfaz/iconos/Icono.test.tsx:5:23
  3  |  import { Emblema } from "./Emblema";
  4  |  import { Icono } from "./Icono";
  5  |  import { ICONOS } from "./trazos";
     |                          ^

 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:01:10
   Duration  2.15s (environment 70%, setup 27%, transform 2%)
```

- [ ] **Paso 4: Implementar `trazos.ts`**

Crea `src/interfaz/iconos/trazos.ts` con este contenido:

```ts
// Los 42 trazos de mjs L30-73, literales; el trazo por defecto y el color los pone Icono.tsx.
export const ICONOS = {
  casa: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  reloj_arena: '<path d="M6 2h12M6 22h12"/><path d="M7 2l5 10-5 10M17 2l-5 10 5 10"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  torre: '<path d="M5 21V9l2-1V4h2v2h2V4h2v2h2V4h2v4l2 1v12z"/><path d="M10 21v-5h4v5"/>',
  monedas:
    '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3"/>',
  bolsa: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  balanza: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  repetir: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  maletin: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  libro: '<path d="M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14"/><path d="M9 8h7"/>',
  pergamino: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  ajustes:
    '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  tesoro: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  gente:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2"/>',
  ficha:
    '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.5 16c.7-1.6 2-2.5 3.5-2.5s2.8.9 3.5 2.5M15 10h3M15 14h3"/>',
  trigo:
    '<path d="M12 22V8"/><path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 12c3 0 5-2 5-5-3 0-5 2-5 5zM12 17c-3 0-5-2-5-5 3 0 5 2 5 5zM12 17c3 0 5-2 5-5-3 0-5 2-5 5z"/><path d="M12 8c-1-1.5-1-3.5 0-5 1 1.5 1 3.5 0 5z"/>',
  carro: '<path d="M2 7h13v9H2zM15 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  bandera: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
  alerta: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  abajo: '<path d="M6 9l6 6 6-6"/>',
  derecha: '<path d="M9 6l6 6-6 6"/>',
  izquierda: '<path d="M15 6l-6 6 6 6"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  cambio: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  bajar: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  subir: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  sube: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  baja: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  deshacer: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  resumen:
    '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  martillo: '<path d="M11 3l6 6-3 3-6-6z"/><path d="M11 9l-8 8 3 3 8-8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  enlazado:
    '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  huella:
    '<circle cx="6.5" cy="9.5" r="1.8"/><circle cx="10" cy="5.5" r="1.8"/><circle cx="14" cy="5.5" r="1.8"/><circle cx="17.5" cy="9.5" r="1.8"/><path d="M12 11.5c-3 0-5.5 3.2-5.5 5.8 0 1.6 1.2 2.7 2.8 2.7 1 0 1.8-.5 2.7-.5s1.7.5 2.7.5c1.6 0 2.8-1.1 2.8-2.7 0-2.6-2.5-5.8-5.5-5.8z"/>',
} as const

/** Nombre de uno de los 42 iconos del sistema visual. */
export type NombreIcono = keyof typeof ICONOS
```

Cuenta las claves antes de seguir: son exactamente 42 (casa, calendario, reloj_arena, reloj, usuario, torre, monedas, bolsa, balanza, repetir, maletin, libro, pergamino, ajustes, tesoro, gente, ficha, trigo, carro, escudo, bandera, alerta, check, abajo, derecha, izquierda, mas, cambio, bajar, subir, x, buscar, sube, baja, deshacer, editar, resumen, martillo, info, candado, enlazado, huella).

- [ ] **Paso 5: Implementar `Icono.tsx`**

Crea `src/interfaz/iconos/Icono.tsx` con este contenido:

```tsx
import { ICONOS, type NombreIcono } from './trazos'

export interface PropsIcono {
  nombre: NombreIcono
  tamano?: number
  color?: string
}

/** Un trazo de trazos.ts como SVG decorativo, oculto a la accesibilidad (mjs L74). */
export function Icono({ nombre, tamano = 20, color = 'currentColor' }: PropsIcono) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-nombre={nombre}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONOS[nombre] }}
    />
  )
}
```

`data-nombre` no lo pide ninguna prueba de esta tarea (nota de dependencia entre grupos, al principio de este archivo): lo leerán las tareas 16, 19 y 20 para distinguir qué icono se pintó sin analizar el trazo SVG completo.

- [ ] **Paso 6: Implementar `Emblema.tsx`**

Crea `src/interfaz/iconos/Emblema.tsx` con este contenido:

```tsx
/** La estrella de cuatro puntas y el círculo relleno del emblema de la app, en var(--oro) (mjs L76-77; D-098). */
export function Emblema({ tamano }: { tamano: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--oro)"
      strokeWidth={1.4}
      strokeLinejoin="round"
    >
      <path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z" />
      <circle cx="12" cy="12" r="2.2" fill="var(--oro)" stroke="none" />
    </svg>
  )
}

/** El filete doble de las cabeceras de P0: dos trazos y el rombo dorado del centro (mjs L78-79). */
export function Filete({ ancho }: { ancho: number }) {
  const centro = ancho / 2
  return (
    <svg aria-hidden="true" focusable="false" width={ancho} height={12} viewBox={`0 0 ${ancho} 12`} fill="none">
      <path d={`M0 6H${centro - 14}M${centro + 14} 6H${ancho}`} stroke="var(--oro)" strokeWidth={1} />
      <path d={`M${centro} 1l5 5-5 5-5-5z`} stroke="var(--oro)" strokeWidth={1.25} />
      <circle cx={centro} cy={6} r={1.5} fill="var(--oro)" />
    </svg>
  )
}
```

`Filete` no tiene prueba propia en el contrato §6.1 (solo lo usará P0 en la tarea 30), pero va en el mismo archivo que `Emblema` porque el contrato los agrupa: «`iconos/Emblema.tsx` Emblema y Filete (T12)».

- [ ] **Paso 7: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/interfaz/iconos/Icono.test.tsx
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  22:01:25
   Duration  1.67s (environment 69%, setup 23%, transform 5%, tests 2%, import 1%)
```

- [ ] **Paso 8: Comprobar los tipos, el lint, todas las pruebas y el build**

```bash
npx tsc -b
npm run lint
npm test
npm run build
```

`npx tsc -b` no escribe nada. `npm run lint` termina sin avisos. Ninguno de los tres módulos está en `src/dominio`, así que `pureza.test.ts` no crece: esta tarea suma **+4 pruebas y +1 archivo** sobre lo que dejó la tarea 11. Con las tareas 1 a 12 ya aplicadas, `npm test` debería terminar en **987 pruebas en 95 archivos**:

```text
 Test Files  95 passed (95)
      Tests  987 passed (987)
```

`npm run build` termina con `✓ built in …`.

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +4 pruebas y +1 archivo sobre lo que dejó la tarea 11.

- [ ] **Paso 9: Commit**

```bash
git add src/interfaz/iconos/trazos.ts src/interfaz/iconos/Icono.tsx src/interfaz/iconos/Emblema.tsx src/interfaz/iconos/Icono.test.tsx
git commit -m "feat(interfaz): los 42 iconos, el emblema y el filete de P0" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 3c4d5e6] feat(interfaz): los 42 iconos, el emblema y el filete de P0
 4 files changed, 152 insertions(+)
 create mode 100644 src/interfaz/iconos/Emblema.tsx
 create mode 100644 src/interfaz/iconos/Icono.test.tsx
 create mode 100644 src/interfaz/iconos/Icono.tsx
 create mode 100644 src/interfaz/iconos/trazos.ts
```

`git status --short` no muestra nada.

---
