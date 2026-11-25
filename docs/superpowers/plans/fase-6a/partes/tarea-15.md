### Tarea 15 · Campo de texto, error, tocados y casilla

Esta tarea escribe el campo de texto genérico (`CampoTexto`, con su etiqueta y su mensaje de error), la envoltura `EtiquetaCampo` que reutilizarán los campos hechos a medida de tareas posteriores (`CampoFecha` en la 22, `CampoFrecuencia` en la 23), el `useTocados` que decide cuándo se enseña un error (D-094) y `Casilla`. Depende de la 12 (`Icono`, para el icono `alerta` de `MensajeError` y el `check` de `Casilla`); la tarea 17 (`Segmentos`) y la 19 (`ConfirmacionEliminar`) reutilizan la misma técnica de etiqueta oculta a la vista y de casilla que fija aquí.

**Reglas de la especificación que implementa:**

- **El error solo se enseña tras tocar el campo (D-094, `decisiones-fase-6a.md`).** «Un campo de un formulario no enseña su error hasta que lo tocas… Un campo con error lleva además el borde en lacre.» `useTocados` es el *hook* que lleva la cuenta de qué campos ya se tocaron; `CampoTexto` no decide esto por sí mismo (su prop `error` «se enseña tal cual: quien lo usa decide si el campo está tocado», contrato §6.5), así que es la pantalla que lo use quien combina `useTocados` con su propia validación, como hace la prueba de esta misma tarea.
- **Contrato §6.5, medidas literales (mjs L191-194, L1369-1372).** Etiqueta de 14 px peso 600 con 6 px de hueco; control de 48 px de alto, relleno `0 14px`, fondo `campo`, borde 1 px `borde`, radio 6, 16 px; ayuda de 13 px en `tinta-suave`; `MensajeError` con icono `alerta` de 16 px y texto de 14 px en `lacre`, enlazado al control con `aria-describedby`, control con `aria-invalid`; `Casilla` con `<input type="checkbox">` real oculto a la vista y una caja de 24 × 24 con radio 5, borde de 2 px en `oro-oscuro` si está marcada (si no, `tinta-suave`, o `borde` si además está desactivada), fondo `oro-oscuro` y `check` de 16 px en `vitela` cuando está marcada, fila de 44 px mínimo y opacidad 0.6 si está desactivada.
- **Modo de teclado por tipo de campo (D-C3, citada por el contrato §6.5).** `modoTeclado` traslada `inputMode` (`text`, `numeric` o `decimal`) para que la tablet muestre el teclado que toca; esta tarea deja la prop lista, aunque ningún campo de la fase 6a la fuerza a `numeric` o `decimal` todavía (lo harán `CampoImporte`, tarea 21, y `CampoFecha`, tarea 22).
- **Reglas nuevas de la interfaz (§0).** `Campo.tsx` exporta solo `EtiquetaCampo`, `CampoTexto`, `MensajeError` y sus tipos; el *hook* `useTocados` va en `tocados.ts`, un `.ts` aparte, para que `Campo.tsx` no incumpla `react/only-export-components`.

**Archivos:**
- Crear: `src/interfaz/comunes/Campo.tsx`, `src/interfaz/comunes/Campo.module.css`, `src/interfaz/comunes/tocados.ts`, `src/interfaz/comunes/Casilla.tsx`, `src/interfaz/comunes/Casilla.module.css`
- Prueba: `src/interfaz/comunes/Campo.test.tsx`, `src/interfaz/comunes/Casilla.test.tsx`

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
cd C:/Proyectos/GA/gestion_aldeas
git status --short
npm test
```

Árbol limpio y **1.001 pruebas en 98 archivos** (lo que dejó la tarea 14; la hora y la duración varían):

```text
 Test Files  98 passed (98)
      Tests  1001 passed (1001)
```

- [ ] **Paso 2: Escribir la prueba de `CampoTexto` y `useTocados` que falla**

Crea `src/interfaz/comunes/Campo.test.tsx` con este contenido:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CampoTexto } from './Campo'
import { useTocados } from './tocados'

describe('CampoTexto', () => {
  it('la etiqueta da nombre al campo', () => {
    render(<CampoTexto etiqueta="Nombre de la partida" valor="" alCambiar={() => {}} />)
    expect(screen.getByRole('textbox', { name: 'Nombre de la partida' })).toBeInTheDocument()
  })

  it('teclear llama a alCambiar', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<CampoTexto etiqueta="Nombre" valor="" alCambiar={alCambiar} />)
    await usuario.type(screen.getByRole('textbox', { name: 'Nombre' }), 'T')
    expect(alCambiar).toHaveBeenCalledWith('T')
  })

  it('un error da aria-invalid y el mensaje con su icono', () => {
    render(<CampoTexto etiqueta="Nombre" valor="" alCambiar={() => {}} error="Escribe un nombre" />)
    const campo = screen.getByRole('textbox', { name: 'Nombre' })
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    const mensaje = screen.getByText('Escribe un nombre')
    expect(mensaje.closest('p')?.querySelector('svg')).toBeInTheDocument()
  })

  it('maximo pone maxLength', () => {
    render(<CampoTexto etiqueta="Nombre" valor="" alCambiar={() => {}} maximo={60} />)
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveAttribute('maxLength', '60')
  })
})

describe('useTocados', () => {
  /** Un nombre vacío con su error, mostrado solo tras salir del campo: el patrón que usan las pantallas. */
  function CampoDePrueba() {
    const [valor, establecerValor] = useState('')
    const { tocado, tocar } = useTocados<'nombre'>()
    const error = valor.trim() === '' ? 'Escribe un nombre' : null
    return (
      <CampoTexto
        etiqueta="Nombre"
        valor={valor}
        alCambiar={establecerValor}
        alSalir={() => tocar('nombre')}
        error={tocado('nombre') ? error : null}
      />
    )
  }

  it('solo enseña el error tras alSalir', async () => {
    const usuario = userEvent.setup()
    render(<CampoDePrueba />)
    const campo = screen.getByRole('textbox', { name: 'Nombre' })
    expect(screen.queryByText('Escribe un nombre')).not.toBeInTheDocument()

    await usuario.click(campo)
    await usuario.tab()
    expect(screen.getByText('Escribe un nombre')).toBeInTheDocument()
  })
})
```

Son las **5 pruebas** de `Campo.test.tsx` del contrato §6.5: nombre accesible, `alCambiar` al teclear, `aria-invalid` con el icono del error, `maximo` como `maxLength` y `useTocados` enseñando el error solo tras `alSalir`.

- [ ] **Paso 3: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/interfaz/comunes/Campo.test.tsx
```

Fallo esperado: Vitest no encuentra el módulo `./Campo`, que todavía no existe (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |interfaz| src/interfaz/comunes/Campo.test.tsx (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |interfaz| src/interfaz/comunes/Campo.test.tsx [ src/interfaz/comunes/Campo.test.tsx ]
Error: Failed to resolve import "./Campo" from "src/interfaz/comunes/Campo.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Proyectos/GA/gestion_aldeas/src/interfaz/comunes/Campo.test.tsx:5:27
  3  |  import { useState } from "react";
  4  |  import { describe, expect, it, vi } from "vitest";
  5  |  import { CampoTexto } from "./Campo";
     |                              ^
  6  |  import { useTocados } from "./tocados";

 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:03:30
   Duration  3.03s (environment 64%, setup 34%, transform 2%)
```

- [ ] **Paso 4: Implementar `Campo.module.css`**

Crea `src/interfaz/comunes/Campo.module.css` con este contenido:

```css
/* Campo de texto y su etiqueta (§6.5, mjs L191-194). */
.etiquetaCampo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--fuente-ui);
  min-width: 0;
}
.etiqueta {
  font-size: 14px;
  font-weight: 600;
  color: var(--tinta);
}
/* Sigue siendo el nombre accesible del campo (etiquetaOculta): solo desaparece de la vista. */
.etiquetaOculta {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.controlConSufijo {
  display: flex;
  align-items: center;
  gap: 8px;
}
.control {
  flex: 1;
  min-width: 0;
  height: var(--alto-campo);
  padding: 0 14px;
  background: var(--campo);
  border: 1px solid var(--borde);
  border-radius: var(--radio-control);
  font-size: var(--texto-campo);
  color: var(--tinta);
}
.control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.control[aria-invalid='true'] {
  border-color: var(--lacre);
}
.alineadoDerecha {
  text-align: right;
}
.sufijo {
  font-size: 14px;
  color: var(--tinta-suave);
  white-space: nowrap;
}
.ayuda {
  margin: 0;
  font-size: 13px;
  color: var(--tinta-suave);
}
.mensajeError {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 14px;
  color: var(--lacre);
}
```

La clase `.etiquetaOculta` recorta el `<label>` visualmente sin quitarlo del árbol de accesibilidad: la técnica exacta (`position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0)`) es la que reutilizará `Segmentos` (tarea 17) para su propia etiqueta oculta.

- [ ] **Paso 5: Implementar `Campo.tsx`**

Crea `src/interfaz/comunes/Campo.tsx` con este contenido:

```tsx
import { useId, type ReactNode } from 'react'
import { Icono } from '../iconos/Icono'
import estilos from './Campo.module.css'

export interface PropsEtiquetaCampo {
  etiqueta: string
  idControl?: string
  ayuda?: string
  error?: string | null
  children: ReactNode
}

/** Etiqueta, control y, debajo, la ayuda o el error: la envoltura de los campos hechos a medida (§6.5). */
export function EtiquetaCampo({ etiqueta, idControl, ayuda, error, children }: PropsEtiquetaCampo) {
  const idAyuda = useId()
  return (
    <div className={estilos.etiquetaCampo}>
      <label htmlFor={idControl} className={estilos.etiqueta}>
        {etiqueta}
      </label>
      {children}
      {error != null ? (
        <MensajeError id={idAyuda}>{error}</MensajeError>
      ) : (
        ayuda !== undefined && (
          <span id={idAyuda} className={estilos.ayuda}>
            {ayuda}
          </span>
        )
      )}
    </div>
  )
}

export interface PropsCampoTexto {
  etiqueta: string
  valor: string
  alCambiar: (texto: string) => void
  alSalir?: () => void
  ayuda?: string
  error?: string | null
  maximo?: number
  modoTeclado?: 'text' | 'numeric' | 'decimal'
  desactivado?: boolean
  alinear?: 'izquierda' | 'derecha'
  sufijo?: string
  placeholder?: string
  etiquetaOculta?: boolean
}

/** Campo de texto de una línea, de 48 px de alto, con su etiqueta, ayuda y error (§6.5, mjs L191-194). */
export function CampoTexto({
  etiqueta,
  valor,
  alCambiar,
  alSalir,
  ayuda,
  error,
  maximo,
  modoTeclado = 'text',
  desactivado = false,
  alinear = 'izquierda',
  sufijo,
  placeholder,
  etiquetaOculta = false,
}: PropsCampoTexto) {
  const idControl = useId()
  const idAyuda = useId()
  const tieneAyuda = error != null || ayuda !== undefined

  return (
    <div className={estilos.etiquetaCampo}>
      <label htmlFor={idControl} className={etiquetaOculta ? estilos.etiquetaOculta : estilos.etiqueta}>
        {etiqueta}
      </label>
      <div className={estilos.controlConSufijo}>
        <input
          id={idControl}
          type="text"
          className={`${estilos.control} ${alinear === 'derecha' ? estilos.alineadoDerecha : ''}`}
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
          onBlur={alSalir}
          maxLength={maximo}
          inputMode={modoTeclado}
          disabled={desactivado}
          placeholder={placeholder}
          aria-invalid={error != null ? true : undefined}
          aria-describedby={tieneAyuda ? idAyuda : undefined}
        />
        {sufijo !== undefined && <span className={estilos.sufijo}>{sufijo}</span>}
      </div>
      {error != null ? (
        <MensajeError id={idAyuda}>{error}</MensajeError>
      ) : (
        ayuda !== undefined && (
          <span id={idAyuda} className={estilos.ayuda}>
            {ayuda}
          </span>
        )
      )}
    </div>
  )
}

/** Icono `alerta` y texto en lacre; el control que describe la enlaza con `aria-describedby` (§6.5). */
export function MensajeError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className={estilos.mensajeError}>
      <Icono nombre="alerta" tamano={16} color="var(--lacre)" />
      <span>{children}</span>
    </p>
  )
}
```

`EtiquetaCampo` y `CampoTexto` no comparten código entre sí a propósito: `CampoTexto` es un campo completo y listo, mientras que `EtiquetaCampo` es la envoltura genérica que usarán los campos hechos a medida de tareas posteriores (`CampoFecha`, tarea 22; `CampoFrecuencia`, tarea 23), que necesitan controlar su propio `<div>` interior (un botón que abre un calendario, por ejemplo) y no un simple `<input>`.

- [ ] **Paso 6: Implementar `tocados.ts`**

Crea `src/interfaz/comunes/tocados.ts` con este contenido:

```ts
import { useState } from 'react'

/** Qué campos ha tocado ya el jugador (D-094): el error de un campo solo se enseña en los que ya se tocaron. */
export function useTocados<C extends string>(): {
  tocado: (campo: C) => boolean
  tocar: (campo: C) => void
  tocarTodos: (campos: readonly C[]) => void
} {
  const [tocados, establecerTocados] = useState<ReadonlySet<C>>(new Set())

  function tocado(campo: C): boolean {
    return tocados.has(campo)
  }

  function tocar(campo: C): void {
    if (!tocados.has(campo)) {
      establecerTocados(new Set(tocados).add(campo))
    }
  }

  function tocarTodos(campos: readonly C[]): void {
    establecerTocados(new Set([...tocados, ...campos]))
  }

  return { tocado, tocar, tocarTodos }
}
```

`tocarTodos` no lo ejercita ninguna prueba de esta tarea (lo usará el botón principal de un formulario al intentar guardar con campos sin tocar, en tareas de pantalla posteriores), pero forma parte de la firma que fija el contrato §6.5 y `npx tsc -b` comprobará que existe y tipa bien en cuanto alguna tarea posterior la llame.

- [ ] **Paso 7: Ejecutar la prueba de `CampoTexto` y `useTocados` y ver que pasa**

```bash
npx vitest run src/interfaz/comunes/Campo.test.tsx
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  22:03:50
   Duration  2.10s (environment 55%, setup 22%, import 12%, transform 8%, tests 3%)
```

- [ ] **Paso 8: Escribir la prueba de `Casilla` que falla**

Crea `src/interfaz/comunes/Casilla.test.tsx` con este contenido:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Casilla } from './Casilla'

describe('Casilla', () => {
  it('tiene rol checkbox con su nombre', () => {
    render(<Casilla etiqueta="Entiendo que esto no se puede deshacer" marcada={false} alCambiar={() => {}} />)
    expect(screen.getByRole('checkbox', { name: 'Entiendo que esto no se puede deshacer' })).toBeInTheDocument()
  })

  it('tocar cambia el valor', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<Casilla etiqueta="Casilla" marcada={false} alCambiar={alCambiar} />)
    await usuario.click(screen.getByRole('checkbox', { name: 'Casilla' }))
    expect(alCambiar).toHaveBeenCalledWith(true)
  })

  it('desactivada no cambia', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<Casilla etiqueta="Casilla" marcada={false} alCambiar={alCambiar} desactivada />)
    const casilla = screen.getByRole('checkbox', { name: 'Casilla' })
    expect(casilla).toBeDisabled()
    await usuario.click(casilla)
    expect(alCambiar).not.toHaveBeenCalled()
  })
})
```

Son las **3 pruebas** de `Casilla.test.tsx` del contrato §6.5: rol `checkbox` con su nombre, tocar cambia el valor y desactivada no cambia.

- [ ] **Paso 9: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/interfaz/comunes/Casilla.test.tsx
```

Fallo esperado: Vitest no encuentra el módulo `./Casilla`, que todavía no existe (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |interfaz| src/interfaz/comunes/Casilla.test.tsx (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |interfaz| src/interfaz/comunes/Casilla.test.tsx [ src/interfaz/comunes/Casilla.test.tsx ]
Error: Failed to resolve import "./Casilla" from "src/interfaz/comunes/Casilla.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Proyectos/GA/gestion_aldeas/src/interfaz/comunes/Casilla.test.tsx:4:24
  2  |  import userEvent from "@testing-library/user-event";
  3  |  import { describe, expect, it, vi } from "vitest";
  4  |  import { Casilla } from "./Casilla";
     |                           ^

 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:04:05
   Duration  3.10s (environment 63%, setup 33%, transform 3%)
```

- [ ] **Paso 10: Implementar `Casilla.module.css`**

Crea `src/interfaz/comunes/Casilla.module.css` con este contenido:

```css
/* Casilla de verificación con caja propia; el input real queda oculto a la vista (mjs L1371-1372). */
.fila {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: var(--toque);
  font-family: var(--fuente-ui);
  font-size: 15px;
  color: var(--tinta);
  cursor: pointer;
}
.fila[data-desactivada] {
  opacity: 0.6;
  cursor: not-allowed;
}
.entrada {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.caja {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: 2px solid var(--tinta-suave);
}
.fila[data-desactivada] .caja {
  border-color: var(--borde);
}
.caja[data-marcada] {
  border-color: var(--oro-oscuro);
  background: var(--oro-oscuro);
}
```

- [ ] **Paso 11: Implementar `Casilla.tsx`**

Crea `src/interfaz/comunes/Casilla.tsx` con este contenido:

```tsx
import { Icono } from '../iconos/Icono'
import estilos from './Casilla.module.css'

export interface PropsCasilla {
  etiqueta: string
  marcada: boolean
  alCambiar: (marcada: boolean) => void
  desactivada?: boolean
}

/** Casilla con su propia caja de 24 × 24; el `<input>` real queda oculto a la vista (mjs L1371-1372). */
export function Casilla({ etiqueta, marcada, alCambiar, desactivada = false }: PropsCasilla) {
  return (
    <label className={estilos.fila} data-desactivada={desactivada ? '' : undefined}>
      <input
        type="checkbox"
        className={estilos.entrada}
        checked={marcada}
        disabled={desactivada}
        onChange={(evento) => alCambiar(evento.target.checked)}
      />
      <span className={estilos.caja} data-marcada={marcada ? '' : undefined} aria-hidden="true">
        {marcada && <Icono nombre="check" tamano={16} color="var(--vitela)" />}
      </span>
      {etiqueta}
    </label>
  )
}
```

El `<input>` real va dentro del `<label>` y recortado a un píxel (mismo truco que `.etiquetaOculta`): así el navegador le sigue dando el foco de teclado y el nombre accesible «Casilla» (el texto del propio `<label>`), pero la caja que se ve es el `<span>` dibujado a mano, con su `check` cuando `marcada` es `true`.

- [ ] **Paso 12: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/interfaz/comunes/Campo.test.tsx src/interfaz/comunes/Casilla.test.tsx
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  22:04:15
   Duration  3.29s (environment 56%, setup 20%, import 10%, transform 9%, tests 5%)
```

- [ ] **Paso 13: Comprobar los tipos, el lint, todas las pruebas y el build**

```bash
npx tsc -b
npm run lint
npm test
npm run build
```

`npx tsc -b` no escribe nada. `npm run lint` termina sin avisos. Ninguno de los cinco módulos toca `src/dominio`, así que `pureza.test.ts` no crece: esta tarea suma **+8 pruebas y +2 archivos** sobre lo que dejó la tarea 14. Con las tareas 1 a 15 ya aplicadas, `npm test` debería terminar en **1.009 pruebas en 100 archivos**:

```text
 Test Files  100 passed (100)
      Tests  1009 passed (1009)
```

`npm run build` termina con `✓ built in …`.

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +8 pruebas y +2 archivos sobre lo que dejó la tarea 14.

- [ ] **Paso 14: Commit**

```bash
git add src/interfaz/comunes/Campo.tsx src/interfaz/comunes/Campo.module.css src/interfaz/comunes/Campo.test.tsx src/interfaz/comunes/tocados.ts src/interfaz/comunes/Casilla.tsx src/interfaz/comunes/Casilla.module.css src/interfaz/comunes/Casilla.test.tsx
git commit -m "feat(interfaz): CampoTexto, MensajeError, useTocados y Casilla" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 6f7a8b9] feat(interfaz): CampoTexto, MensajeError, useTocados y Casilla
 7 files changed, 372 insertions(+)
 create mode 100644 src/interfaz/comunes/Campo.module.css
 create mode 100644 src/interfaz/comunes/Campo.test.tsx
 create mode 100644 src/interfaz/comunes/Campo.tsx
 create mode 100644 src/interfaz/comunes/Casilla.module.css
 create mode 100644 src/interfaz/comunes/Casilla.test.tsx
 create mode 100644 src/interfaz/comunes/Casilla.tsx
 create mode 100644 src/interfaz/comunes/tocados.ts
```

`git status --short` no muestra nada.

---

**Fin del bloque de tareas 11 a 15.** Con esta tarea, `src/interfaz/comunes/` tiene ya `Boton.tsx`, `Panel.tsx`, `Tabla.tsx`, `Campo.tsx`, `tocados.ts` y `Casilla.tsx`, y `src/interfaz/iconos/` tiene `trazos.ts`, `Icono.tsx` y `Emblema.tsx`: todo lo que las tareas 16 a 23 (Aviso, Segmentos, Dialogo, ConfirmacionEliminar, SelectorConBuscador, CampoImporte, CampoFecha y CampoFrecuencia) necesitan para seguir construyendo los componentes comunes de la fase.
