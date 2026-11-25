### Tarea 13 · Botón, botón de icono y enlace

`Boton` es la pieza que más se repite en toda la interfaz: no tiene entrada propia en §6 de la especificación porque es la base de casi todas las pantallas, y su forma exacta sale de `btn`, `btnIcono` y `enlace` (`design/build-artboards.mjs` L106-119), tres variantes del mismo componente. Esta tarea depende de la 12 (`Icono`, para el icono opcional a la izquierda del texto) y es la base de la que dependen la 18 (`Dialogo`, la x de cabecera es un `BotonIcono` `fantasma`) y la 19 (`ConfirmacionEliminar`, con `Boton` `peligroLleno`).

**Reglas de la especificación que implementa:**

- **El botón principal se desactiva mientras haya errores (espec. L816, §6.4).** «El botón principal se desactiva mientras haya errores, salvo el saldo negativo, que pide confirmación.» `Boton` recibe `desactivado` como una prop de solo lectura: la pantalla que lo usa decide cuándo vale `true`, según el resultado de validar su formulario.
- **La x de cabecera de diálogo equivale a Cancelar (espec. L945).** «Cerrar con la x o Esc equivale a pulsar Cancelar.» Esta tarea no monta ningún diálogo (eso es la tarea 18), pero es quien deja `BotonIcono` `fantasma` listo para que la cabecera del diálogo lo use así.
- **Contrato §6.2, medidas y colores literales (mjs L106-119).** Botón de 44 px de alto, relleno `0 18px`, radio 6, 15 px en peso 600, con las cinco variantes (`principal`, `secundario`, `fantasma`, `peligro`, `peligroLleno`) y sus tres colores (fondo, texto, borde) cada una; `BotonIcono` cuadrado de 44 × 44; `Enlace` sin fondo ni borde, 44 px, relleno `0 12px`, en `oro-oscuro`, con *hover* a `tinta` bajo `@media (hover: hover)` (mjs L96, regla de estados del §3.4 del contrato).
- **Reglas nuevas de la interfaz (§0).** Las pruebas leen `data-variante`, nunca una clase CSS; las funciones de respuesta se llaman `alPulsar`; el `.tsx` solo exporta los tres componentes, sus tipos de props y `VarianteBoton`.

**Archivos:**
- Crear: `src/interfaz/comunes/Boton.tsx`, `src/interfaz/comunes/Boton.module.css`
- Prueba: `src/interfaz/comunes/Boton.test.tsx`

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
cd C:/Proyectos/GA/gestion_aldeas
git status --short
npm test
```

Árbol limpio y **987 pruebas en 95 archivos** (lo que dejó la tarea 12; la hora y la duración varían):

```text
 Test Files  95 passed (95)
      Tests  987 passed (987)
```

- [ ] **Paso 2: Escribir la prueba que falla**

Crea `src/interfaz/comunes/Boton.test.tsx` con este contenido:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Boton, BotonIcono, Enlace, type VarianteBoton } from './Boton'

const VARIANTES: VarianteBoton[] = ['principal', 'secundario', 'fantasma', 'peligro', 'peligroLleno']

describe('Boton', () => {
  it('da nombre accesible al botón', () => {
    render(<Boton>Crear partida</Boton>)
    expect(screen.getByRole('button', { name: 'Crear partida' })).toBeInTheDocument()
  })

  it('marca cada una de las cinco variantes en data-variante', () => {
    for (const variante of VARIANTES) {
      const { unmount } = render(<Boton variante={variante}>Texto</Boton>)
      expect(screen.getByRole('button')).toHaveAttribute('data-variante', variante)
      unmount()
    }
  })

  it('usa secundario por defecto', () => {
    render(<Boton>Texto</Boton>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variante', 'secundario')
  })

  it('desactivado no llama a alPulsar y lleva disabled', async () => {
    const usuario = userEvent.setup()
    const alPulsar = vi.fn()
    render(
      <Boton desactivado alPulsar={alPulsar}>
        Texto
      </Boton>,
    )
    const boton = screen.getByRole('button')
    expect(boton).toBeDisabled()
    await usuario.click(boton)
    expect(alPulsar).not.toHaveBeenCalled()
  })

  it('acepta tipo submit', () => {
    render(<Boton tipo="submit">Texto</Boton>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})

describe('BotonIcono', () => {
  it('tiene como nombre accesible su etiqueta', () => {
    render(<BotonIcono icono="editar" etiqueta="Editar partida" />)
    expect(screen.getByRole('button', { name: 'Editar partida' })).toBeInTheDocument()
  })
})

describe('Enlace', () => {
  it('llama a alPulsar al tocarlo', async () => {
    const usuario = userEvent.setup()
    const alPulsar = vi.fn()
    render(<Enlace alPulsar={alPulsar}>Editar equivalencias</Enlace>)
    await usuario.click(screen.getByRole('button', { name: 'Editar equivalencias' }))
    expect(alPulsar).toHaveBeenCalledOnce()
  })
})
```

Son las **7 pruebas** del contrato §6.2: nombre accesible, las cinco variantes en `data-variante`, `secundario` por defecto, desactivado, `tipo='submit'`, el nombre accesible del `BotonIcono` y `Enlace` llamando a `alPulsar`.

- [ ] **Paso 3: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/interfaz/comunes/Boton.test.tsx
```

Fallo esperado: Vitest no encuentra el módulo `./Boton`, que todavía no existe (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |interfaz| src/interfaz/comunes/Boton.test.tsx (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |interfaz| src/interfaz/comunes/Boton.test.tsx [ src/interfaz/comunes/Boton.test.tsx ]
Error: Failed to resolve import "./Boton" from "src/interfaz/comunes/Boton.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Proyectos/GA/gestion_aldeas/src/interfaz/comunes/Boton.test.tsx:4:62
  2  |  import userEvent from "@testing-library/user-event";
  3  |  import { describe, expect, it, vi } from "vitest";
  4  |  import { Boton, BotonIcono, Enlace } from "./Boton";
     |                                             ^

 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:01:50
   Duration  6.27s (environment 69%, setup 29%, transform 2%)
```

- [ ] **Paso 4: Implementar `Boton.module.css`**

Crea `src/interfaz/comunes/Boton.module.css` con este contenido:

```css
/* Botón, botón de icono y enlace (mjs L106-119): variantes por color, 44 px de alto para el toque. */
.boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: var(--toque);
  padding: 0 18px;
  border-radius: var(--radio-control);
  font-family: var(--fuente-ui);
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.boton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.botonPrincipal {
  background: var(--oro-oscuro);
  color: var(--vitela);
  border: 1px solid var(--oro-oscuro);
}
.botonSecundario {
  background: var(--vitela);
  color: var(--tinta);
  border: 1px solid var(--borde);
}
.botonFantasma {
  background: transparent;
  color: var(--tinta);
  border: 1px solid transparent;
}
.botonPeligro {
  background: transparent;
  color: var(--lacre);
  border: 1px solid var(--lacre);
}
.botonPeligroLleno {
  background: var(--lacre);
  color: var(--vitela);
  border: 1px solid var(--lacre);
}

.botonIcono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--toque);
  height: var(--toque);
  border-radius: var(--radio-control);
  color: var(--tinta);
  cursor: pointer;
}
.botonIcono:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.botonIconoSecundario {
  background: var(--vitela);
  border: 1px solid var(--borde);
}
.botonIconoFantasma {
  background: transparent;
  border: 1px solid transparent;
}

.enlace {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: var(--toque);
  padding: 0 12px;
  background: none;
  border: none;
  font-family: var(--fuente-ui);
  font-size: 15px;
  font-weight: 600;
  color: var(--oro-oscuro);
  white-space: nowrap;
  cursor: pointer;
}
@media (hover: hover) {
  .enlace:hover {
    color: var(--tinta);
  }
}
```

Las clases de variante llevan el nombre completo (`botonPrincipal`, no `principal`) a propósito: `.botonIconoSecundario` y `.botonSecundario` tienen que ser selectores CSS **distintos**, porque un CSS Module solo reescribe cada nombre de clase una vez y da igual dónde aparezca en el archivo. Si `Boton` y `BotonIcono` compartieran literalmente la clase `.secundario`, el navegador acabaría aplicando el mismo par fondo/color/borde a los dos (aquí no se notaría, porque los valores coinciden, pero en `fantasma` sí cambiaría el resultado de forma silenciosa).

- [ ] **Paso 5: Implementar `Boton.tsx`**

Crea `src/interfaz/comunes/Boton.tsx` con este contenido:

```tsx
import type { ReactNode } from 'react'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/trazos'
import estilos from './Boton.module.css'

export type VarianteBoton = 'principal' | 'secundario' | 'fantasma' | 'peligro' | 'peligroLleno'

/** Clase de color de cada variante (mjs L107-113); las pruebas leen `data-variante`, nunca esta clase. */
const CLASE_VARIANTE: Record<VarianteBoton, string> = {
  principal: estilos.botonPrincipal,
  secundario: estilos.botonSecundario,
  fantasma: estilos.botonFantasma,
  peligro: estilos.botonPeligro,
  peligroLleno: estilos.botonPeligroLleno,
}

export interface PropsBoton {
  children: ReactNode
  variante?: VarianteBoton
  icono?: NombreIcono
  alPulsar?: () => void
  desactivado?: boolean
  tipo?: 'button' | 'submit'
  ancho?: string
}

/** Botón de 44 px con sus cinco variantes de color (mjs L106-115). */
export function Boton({
  children,
  variante = 'secundario',
  icono,
  alPulsar,
  desactivado = false,
  tipo = 'button',
  ancho,
}: PropsBoton) {
  return (
    <button
      type={tipo}
      className={`${estilos.boton} ${CLASE_VARIANTE[variante]}`}
      data-variante={variante}
      disabled={desactivado}
      onClick={alPulsar}
      style={ancho === undefined ? undefined : { width: ancho }}
    >
      {icono !== undefined && <Icono nombre={icono} tamano={18} />}
      <span>{children}</span>
    </button>
  )
}

export interface PropsBotonIcono {
  icono: NombreIcono
  etiqueta: string
  variante?: 'secundario' | 'fantasma'
  alPulsar?: () => void
  desactivado?: boolean
}

const CLASE_VARIANTE_ICONO: Record<'secundario' | 'fantasma', string> = {
  secundario: estilos.botonIconoSecundario,
  fantasma: estilos.botonIconoFantasma,
}

/** Botón cuadrado de 44 × 44 con solo un icono; `etiqueta` es su nombre accesible (mjs L116-117). */
export function BotonIcono({
  icono,
  etiqueta,
  variante = 'secundario',
  alPulsar,
  desactivado = false,
}: PropsBotonIcono) {
  return (
    <button
      type="button"
      className={`${estilos.botonIcono} ${CLASE_VARIANTE_ICONO[variante]}`}
      data-variante={variante}
      aria-label={etiqueta}
      disabled={desactivado}
      onClick={alPulsar}
    >
      <Icono nombre={icono} tamano={20} />
    </button>
  )
}

export interface PropsEnlace {
  children: ReactNode
  alPulsar: () => void
  icono?: NombreIcono
}

/** Botón de texto sin fondo ni borde, en oro oscuro, para acciones secundarias (mjs L118-119). */
export function Enlace({ children, alPulsar, icono }: PropsEnlace) {
  return (
    <button type="button" className={estilos.enlace} onClick={alPulsar}>
      {icono !== undefined && <Icono nombre={icono} tamano={16} />}
      {children}
    </button>
  )
}
```

- [ ] **Paso 6: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/interfaz/comunes/Boton.test.tsx
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  22:02:05
   Duration  2.89s (environment 51%, setup 17%, transform 13%, import 12%, tests 7%)
```

- [ ] **Paso 7: Comprobar los tipos, el lint, todas las pruebas y el build**

```bash
npx tsc -b
npm run lint
npm test
npm run build
```

`npx tsc -b` no escribe nada. `npm run lint` termina sin avisos: es el paso que confirma que `CLASE_VARIANTE` y `CLASE_VARIANTE_ICONO`, al no exportarse, no disparan `react/only-export-components`. `Boton.tsx` no toca `src/dominio`, así que `pureza.test.ts` no crece: esta tarea suma **+7 pruebas y +1 archivo** sobre lo que dejó la tarea 12. Con las tareas 1 a 13 ya aplicadas, `npm test` debería terminar en **994 pruebas en 96 archivos**:

```text
 Test Files  96 passed (96)
      Tests  994 passed (994)
```

`npm run build` termina con `✓ built in …`.

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +7 pruebas y +1 archivo sobre lo que dejó la tarea 12.

- [ ] **Paso 8: Commit**

```bash
git add src/interfaz/comunes/Boton.tsx src/interfaz/comunes/Boton.module.css src/interfaz/comunes/Boton.test.tsx
git commit -m "feat(interfaz): Boton, BotonIcono y Enlace, con sus cinco variantes" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 4d5e6f7] feat(interfaz): Boton, BotonIcono y Enlace, con sus cinco variantes
 3 files changed, 252 insertions(+)
 create mode 100644 src/interfaz/comunes/Boton.module.css
 create mode 100644 src/interfaz/comunes/Boton.test.tsx
 create mode 100644 src/interfaz/comunes/Boton.tsx
```

`git status --short` no muestra nada.

---
