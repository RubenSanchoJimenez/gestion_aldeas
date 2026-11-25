### Tarea 19 · ConfirmacionEliminar (J2d)

`ConfirmacionEliminar` es J2d, la doble confirmación que exige la especificación para borrar cualquier registro: «El botón «Eliminar» abre el diálogo J2d, que explica qué se borra y qué cambia y exige marcar una casilla antes de activar «Eliminar definitivamente»» (espec. L697). Esta tarea depende de la 14 (`ListaPares`, para la caja de resumen), la 15 (`Casilla`), la 16 (`Aviso`, para el aviso oro opcional) y la 18 (`Dialogo`, sobre el que se monta). Es la última pieza de `comunes/` antes de `SelectorConBuscador` (tarea 20), y la que usará «Editar partida» (tarea 29) y P6 (tarea 31) para borrar una partida (D-090).

**Reglas de la especificación que implementa:**

- **Doble confirmación para eliminar (espec. L695-697).** «**Eliminar**: dentro del formulario de edición, con **doble confirmación**… El botón «Eliminar» abre el diálogo J2d, que explica qué se borra y qué cambia y exige marcar una casilla antes de activar «Eliminar definitivamente». Vale para todas las tablas, del personaje y de los asentamientos.» `ConfirmacionEliminar` es ese diálogo, genérico: quien lo usa le pasa el resumen de lo que se pierde.
- **«Cancelar» no decide si reabre el origen (espec. L221).** «Cancelar el de arriba vuelve al anterior con sus datos» es la regla general de los diálogos apilados, pero J2d **sustituye** al formulario de edición en vez de apilarse sobre él (espec. L221: «J2d sustituye al formulario de edición (no se apila). Su «Cancelar» reabre el formulario con sus datos.»). Por eso `alCancelar` de esta tarea solo avisa: es quien la usa (la tarea 29, con «Editar partida») quien decide reabrir el formulario, no `ConfirmacionEliminar`.
- **Estructura de J2d** (mjs L1798-1813, `PersonajeEliminarMovimiento`; contrato §6.9, crítica C1). Dialogo de 620 px con, en este orden, la caja de resumen (`ListaPares`), un `Aviso` oro opcional, un hueco para notas (`children`), la `Casilla` «Sé que esto no se puede deshacer» y la `Nota` que explica que el botón rojo empieza desactivado.
- **El botón rojo empieza desactivado (espec. L697, ya citada).** «Eliminar definitivamente» no se puede pulsar hasta marcar la casilla, y la casilla vuelve a empezar sin marcar cada vez que el diálogo se abre: si no, un «Cancelar» seguido de un «Eliminar» sin volver a marcarla dejaría el peligro a medio camino.

**Archivos:**
- Crear: `src/interfaz/comunes/ConfirmacionEliminar.tsx`, `src/interfaz/comunes/ConfirmacionEliminar.module.css`
- Prueba: `src/interfaz/comunes/ConfirmacionEliminar.test.tsx`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/interfaz/comunes/ConfirmacionEliminar.test.tsx` con este contenido:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmacionEliminar } from './ConfirmacionEliminar'

const RESUMEN = [
  { etiqueta: 'Partida', valor: 'La Sombra del Este' },
  { etiqueta: 'Dominios', valor: '3' },
]

describe('ConfirmacionEliminar (J2d)', () => {
  it('enseña el título, el subtítulo y el resumen', () => {
    render(
      <ConfirmacionEliminar
        titulo="¿Eliminar «La Sombra del Este»?"
        subtitulo="Partida · 12 de abril de 1640 T.E."
        resumen={RESUMEN}
        abierto
        alCancelar={vi.fn()}
        alEliminar={vi.fn()}
      />,
    )
    expect(screen.getByRole('dialog', { name: '¿Eliminar «La Sombra del Este»?' })).toBeInTheDocument()
    expect(screen.getByText('Partida · 12 de abril de 1640 T.E.')).toBeInTheDocument()
    expect(screen.getByText('La Sombra del Este')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('«Eliminar definitivamente» está desactivado hasta marcar la casilla; después llama a alEliminar', async () => {
    const usuario = userEvent.setup()
    const alEliminar = vi.fn()
    render(
      <ConfirmacionEliminar
        titulo="¿Eliminar «La Sombra del Este»?"
        subtitulo="Partida · 12 de abril de 1640 T.E."
        resumen={RESUMEN}
        abierto
        alCancelar={vi.fn()}
        alEliminar={alEliminar}
      />,
    )
    const boton = screen.getByRole('button', { name: 'Eliminar definitivamente' })
    expect(boton).toBeDisabled()
    await usuario.click(screen.getByRole('checkbox', { name: 'Sé que esto no se puede deshacer' }))
    expect(boton).toBeEnabled()
    await usuario.click(boton)
    expect(alEliminar).toHaveBeenCalledOnce()
  })

  it('«Cancelar» llama a alCancelar y no a alEliminar', async () => {
    const usuario = userEvent.setup()
    const alCancelar = vi.fn()
    const alEliminar = vi.fn()
    render(
      <ConfirmacionEliminar
        titulo="¿Eliminar «La Sombra del Este»?"
        subtitulo="Partida · 12 de abril de 1640 T.E."
        resumen={RESUMEN}
        abierto
        alCancelar={alCancelar}
        alEliminar={alEliminar}
      />,
    )
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(alCancelar).toHaveBeenCalledOnce()
    expect(alEliminar).not.toHaveBeenCalled()
  })

  it('al reabrirlo, la casilla vuelve a estar sin marcar', async () => {
    const usuario = userEvent.setup()

    function Envoltorio() {
      const [abierto, establecerAbierto] = useState(true)
      return (
        <>
          <button type="button" onClick={() => establecerAbierto(true)}>
            Reabrir
          </button>
          <ConfirmacionEliminar
            titulo="¿Eliminar «La Sombra del Este»?"
            subtitulo="Partida · 12 de abril de 1640 T.E."
            resumen={RESUMEN}
            abierto={abierto}
            alCancelar={() => establecerAbierto(false)}
            alEliminar={vi.fn()}
          />
        </>
      )
    }

    render(<Envoltorio />)
    await usuario.click(screen.getByRole('checkbox', { name: 'Sé que esto no se puede deshacer' }))
    expect(screen.getByRole('checkbox', { name: 'Sé que esto no se puede deshacer' })).toBeChecked()
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    await usuario.click(screen.getByRole('button', { name: 'Reabrir' }))
    expect(screen.getByRole('checkbox', { name: 'Sé que esto no se puede deshacer' })).not.toBeChecked()
  })

  it('con avisoAvance sale un aviso de data-tono="oro"', () => {
    render(
      <ConfirmacionEliminar
        titulo="¿Eliminar «Cada día»?"
        subtitulo="Movimiento recurrente"
        resumen={RESUMEN}
        avisoAvance="Hay 2 movimientos programados que no se generarán."
        abierto
        alCancelar={vi.fn()}
        alEliminar={vi.fn()}
      />,
    )
    const aviso = screen.getByText('Hay 2 movimientos programados que no se generarán.').closest('[role="status"]')
    expect(aviso).toHaveAttribute('data-tono', 'oro')
  })
})
```

Son **5 pruebas**, las del contrato §6.9. La cuarta monta un pequeño envoltorio con estado propio porque es la única forma de simular «se cierra y se vuelve a abrir» sin salir del componente: `rerender` con las mismas props no cambia nada, hace falta que `abierto` pase por `false` de verdad.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/interfaz/comunes/ConfirmacionEliminar.test.tsx
```

Fallo esperado: Vitest no encuentra el módulo `./ConfirmacionEliminar`. La hora y la duración varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

Error: Failed to resolve import "./ConfirmacionEliminar" from "src/interfaz/comunes/ConfirmacionEliminar.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Proyectos/GA/gestion_aldeas/src/interfaz/comunes/ConfirmacionEliminar.test.tsx:5:37
  3  |  import { useState } from "react";
  4  |  import { describe, expect, it, vi } from "vitest";
  5  |  import { ConfirmacionEliminar } from "./ConfirmacionEliminar";
     |                                        ^

 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:05:29
   Duration  2.94s (environment 67%, setup 31%, transform 2%)
```

- [ ] **Paso 3: Implementar `ConfirmacionEliminar.module.css`**

Crea `src/interfaz/comunes/ConfirmacionEliminar.module.css` con este contenido:

```css
.resumen {
  background: var(--papel);
  border: 1px solid var(--borde);
  border-radius: 8px;
  padding: 0 16px;
}
```

Es la única regla propia: la caja de la lista de resumen, sobre `papel`, con borde de 1 px `borde` y radio 8 (contrato §6.9, mjs L1798-1813). El resto (filas de 40 px, el `Aviso`, la `Casilla`, la `Nota` y el pie) llega ya con estilos de sus propios componentes (tareas 14, 15, 16 y 18); esta tarea no repite ninguno.

- [ ] **Paso 4: Implementar `ConfirmacionEliminar.tsx`**

Crea `src/interfaz/comunes/ConfirmacionEliminar.tsx` con este contenido:

```tsx
import { useState, type ReactNode } from 'react'
import { Aviso } from './Aviso'
import { Boton } from './Boton'
import { Casilla } from './Casilla'
import { Dialogo } from './Dialogo'
import estilos from './ConfirmacionEliminar.module.css'
import { Nota } from './Panel'
import { ListaPares, type FilaPar } from './Tabla'

export interface PropsConfirmacionEliminar {
  titulo: string
  subtitulo: string
  resumen: readonly FilaPar[]
  avisoAvance?: string
  abierto: boolean
  alCancelar: () => void
  alEliminar: () => void
  children?: ReactNode
}

/** J2d de §6.9: la doble confirmación para borrar, con su casilla y el botón rojo desactivado hasta marcarla. */
export function ConfirmacionEliminar(props: PropsConfirmacionEliminar) {
  const [marcada, establecerMarcada] = useState(false)
  // La casilla empieza sin marcar cada vez que se abre (§6.9): se ajusta durante el render,
  // guardando el último `abierto` visto, en vez de con un efecto (react/set-state-in-effect).
  const [abiertoPrevio, establecerAbiertoPrevio] = useState(props.abierto)
  if (props.abierto !== abiertoPrevio) {
    establecerAbiertoPrevio(props.abierto)
    if (props.abierto) {
      establecerMarcada(false)
    }
  }

  return (
    <Dialogo
      titulo={props.titulo}
      subtitulo={props.subtitulo}
      ancho={620}
      abierto={props.abierto}
      alCancelar={props.alCancelar}
      pieDerecha={
        <>
          <Boton variante="secundario" alPulsar={props.alCancelar}>
            Cancelar
          </Boton>
          <Boton variante="peligroLleno" icono="x" desactivado={!marcada} alPulsar={props.alEliminar}>
            Eliminar definitivamente
          </Boton>
        </>
      }
    >
      <div className={estilos.resumen}>
        <ListaPares filas={props.resumen} altoFila={40} />
      </div>
      {props.avisoAvance ? (
        <Aviso tono="oro" icono="reloj_arena">
          {props.avisoAvance}
        </Aviso>
      ) : null}
      {props.children}
      <Casilla etiqueta="Sé que esto no se puede deshacer" marcada={marcada} alCambiar={establecerMarcada} />
      <Nota>El botón rojo no se activa hasta marcar la casilla.</Nota>
    </Dialogo>
  )
}
```

La parte que no es una copia directa del contrato es **cómo se resetea la casilla al reabrir**. La forma obvia (`useEffect(() => { if (props.abierto) establecerMarcada(false) }, [props.abierto])`) compila y pasa las pruebas, pero `npm run lint` la marca con `react(set-state-in-effect)`: llamar a `setState` de forma síncrona dentro de un efecto puede encadenar renders y React recomienda, cuando el estado solo depende de una prop, ajustarlo **durante el render** en vez de después de montar. Por eso se guarda el último `abierto` visto en un segundo estado (`abiertoPrevio`) y, si no coincide con el actual, se corrige ahí mismo: React ve que el estado cambió a mitad de este render y descarta el resultado a medio pintar para repetirlo con el valor correcto, sin pasar por un efecto ni por un commit de más. Es el patrón que React llama «ajustar estado cuando cambia una prop».

- [ ] **Paso 5: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/interfaz/comunes/ConfirmacionEliminar.test.tsx
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  22:05:52
   Duration  8.85s (environment 55%, setup 21%, transform 11%, tests 7%, import 6%)
```

- [ ] **Paso 6: Comprobar los tipos, el lint y todas las pruebas**

```bash
npx tsc -b
npm run lint
npm test
```

`npx tsc -b` no escribe nada. `npm run lint` termina sin avisos: es el paso que confirma que el ajuste de estado durante el render (paso 4) no deja el `react(set-state-in-effect)` que sí daría la versión con `useEffect`. Esta tarea suma **+5 pruebas y +1 archivo** sobre lo que dejó la tarea 18. Con las tareas 1 a 18 ya aplicadas, `npm test` debería terminar en **1.031 pruebas en 104 archivos**:

```text
 Test Files  104 passed (104)
      Tests  1031 passed (1031)
```

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +5 pruebas y +1 archivo sobre lo que dejó la tarea 18.

- [ ] **Paso 7: Commit**

```bash
git add src/interfaz/comunes/ConfirmacionEliminar.tsx src/interfaz/comunes/ConfirmacionEliminar.module.css src/interfaz/comunes/ConfirmacionEliminar.test.tsx
git commit -m "feat(interfaz): ConfirmacionEliminar (J2d), la doble confirmación para borrar" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 4d5e6f7] feat(interfaz): ConfirmacionEliminar (J2d), la doble confirmación para borrar
 3 files changed, 90 insertions(+)
 create mode 100644 src/interfaz/comunes/ConfirmacionEliminar.module.css
 create mode 100644 src/interfaz/comunes/ConfirmacionEliminar.test.tsx
 create mode 100644 src/interfaz/comunes/ConfirmacionEliminar.tsx
```

`git status --short` no muestra nada.

---
