### Tarea 18 · Dialogo, diálogo apilado y DialogoMensaje

`Dialogo` es la caja modal de §6.8, sobre el `<dialog>` nativo de HTML, que se apila hasta dos niveles (espec. L219-222) y de la que salen tanto J2d (tarea 19) como el asistente de partida nueva, «Editar partida», Ajustes y cualquier alta rápida de fases posteriores. Esta tarea también escribe `nivelDialogo.ts`, el contexto de un solo número (0 fuera de todo diálogo) que un `Dialogo` usa para saber si es el primero o el segundo, y que `SelectorConBuscador` (tarea 20) volverá a leer para no ofrecer su pie de alta dentro de un diálogo ya apilado. Depende de la tarea 13 (`Boton` y `BotonIcono`): la x de la cabecera es un `BotonIcono` `fantasma` y el pie usa `Boton`.

**Reglas de la especificación que implementa:**

- **Como mucho dos diálogos visibles (espec. L219-220, §5).** «Como mucho hay dos diálogos visibles. El de abajo queda atenuado con un segundo velo… Cancelar el de arriba vuelve al anterior con sus datos.» Esto fija tres cosas que la tarea implementa: el límite de dos niveles (un tercero lanza), que el de abajo sigue montado (con sus datos, no se pierde nada) y que cerrar el de arriba no toca el de abajo.
- **La x y Esc equivalen a Cancelar (espec. L945, generalizado a todo diálogo por el contrato §6.8).** En el patrón de alta rápida, «botón x de 44 px, que equivale a Cancelar»; el contrato lo generaliza a todo `Dialogo`: la x llama a `alCancelar` y el evento `cancel` (que dispara Esc en un `<dialog>` nativo) hace `preventDefault()` y también llama a `alCancelar`, para que nunca cierre por sí solo sin que el que lo usa se entere.
- **Clicar el velo no cierra (contrato §6.8).** A diferencia de muchos diálogos web, este no cierra al tocar fuera: se perderían los datos escritos. No hay `onClick` en el `<dialog>` ni en su `::backdrop`.
- **Alto máximo con el cuerpo desplazable (espec. L827).** «Los diálogos tienen un alto máximo igual al alto visible menos 48 px, con el cuerpo desplazable.» De ahí `max-height: calc(100dvh - 48px)` en la caja y `overflow-y: auto` en el cuerpo, no en la caja entera (la cabecera y el pie quedan fijos).
- **Velos literales, no variables (crítica §5.1).** `::backdrop` no hereda las variables CSS en versiones de Chrome anteriores a la 122, así que los dos velos (55 % y 35 % de tinta) van con el `rgba()` literal, no con `var(--algo)`.

**Archivos:**
- Crear: `src/interfaz/comunes/nivelDialogo.ts`, `src/interfaz/comunes/Dialogo.tsx`, `src/interfaz/comunes/Dialogo.module.css`
- Prueba: `src/interfaz/comunes/Dialogo.test.tsx`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/interfaz/comunes/Dialogo.test.tsx` con este contenido:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dialogo, DialogoMensaje } from './Dialogo'

describe('Dialogo', () => {
  it('abre con open y con el nombre de su título', () => {
    render(
      <Dialogo titulo="Borrar categoría" ancho={480} abierto alCancelar={vi.fn()}>
        Cuerpo
      </Dialogo>,
    )
    const dialogo = screen.getByRole('dialog', { name: 'Borrar categoría' })
    expect(dialogo).toHaveAttribute('open')
  })

  it('la x llama a alCancelar', async () => {
    const usuario = userEvent.setup()
    const alCancelar = vi.fn()
    render(
      <Dialogo titulo="Borrar categoría" ancho={480} abierto alCancelar={alCancelar}>
        Cuerpo
      </Dialogo>,
    )
    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(alCancelar).toHaveBeenCalledOnce()
  })

  it('cancel (Esc) llama a alCancelar y no cierra solo', () => {
    const alCancelar = vi.fn()
    render(
      <Dialogo titulo="Borrar categoría" ancho={480} abierto alCancelar={alCancelar}>
        Cuerpo
      </Dialogo>,
    )
    const dialogo = screen.getByRole('dialog', { name: 'Borrar categoría' })
    fireEvent(dialogo, new Event('cancel', { cancelable: true }))
    expect(alCancelar).toHaveBeenCalledOnce()
    expect(dialogo).toHaveAttribute('open')
  })

  it('con abierto={false} no pinta nada', () => {
    const { container } = render(
      <Dialogo titulo="Borrar categoría" ancho={480} abierto={false} alCancelar={vi.fn()}>
        Cuerpo
      </Dialogo>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('un Dialogo dentro de otro lleva data-apilado y el de abajo no', () => {
    render(
      <Dialogo titulo="Editar partida" ancho={520} abierto alCancelar={vi.fn()}>
        <Dialogo titulo="¿Eliminar «La Sombra del Este»?" ancho={620} abierto alCancelar={vi.fn()}>
          Confirmación
        </Dialogo>
      </Dialogo>,
    )
    expect(screen.getByRole('dialog', { name: 'Editar partida' })).not.toHaveAttribute('data-apilado')
    expect(screen.getByRole('dialog', { name: '¿Eliminar «La Sombra del Este»?' })).toHaveAttribute(
      'data-apilado',
      'true',
    )
  })

  it('al cerrar el de arriba, el de abajo conserva lo escrito en su campo', async () => {
    const usuario = userEvent.setup()

    function DosNiveles() {
      const [texto, establecerTexto] = useState('')
      const [segundoAbierto, establecerSegundoAbierto] = useState(true)
      return (
        <Dialogo titulo="Editar partida" ancho={520} abierto alCancelar={vi.fn()}>
          <input aria-label="Nombre" value={texto} onChange={(evento) => establecerTexto(evento.target.value)} />
          <Dialogo
            titulo="¿Eliminar «La Sombra del Este»?"
            ancho={620}
            abierto={segundoAbierto}
            alCancelar={() => establecerSegundoAbierto(false)}
          >
            Confirmación
          </Dialogo>
        </Dialogo>
      )
    }

    render(<DosNiveles />)
    await usuario.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Bree')
    const segundo = screen.getByRole('dialog', { name: '¿Eliminar «La Sombra del Este»?' })
    await usuario.click(within(segundo).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: '¿Eliminar «La Sombra del Este»?' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Bree')
  })

  it('un tercer nivel lanza', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <Dialogo titulo="Uno" ancho={480} abierto alCancelar={vi.fn()}>
          <Dialogo titulo="Dos" ancho={480} abierto alCancelar={vi.fn()}>
            <Dialogo titulo="Tres" ancho={480} abierto alCancelar={vi.fn()}>
              Cuerpo
            </Dialogo>
          </Dialogo>
        </Dialogo>,
      ),
    ).toThrow('Como mucho hay dos diálogos visibles (§5)')
    consola.mockRestore()
  })

  it('DialogoMensaje enseña las líneas y Aceptar llama a alAceptar', async () => {
    const usuario = userEvent.setup()
    const alAceptar = vi.fn()
    render(
      <DialogoMensaje
        titulo="Copia importada"
        lineas={['Se añadió Archet.', 'El formato se actualizó.']}
        abierto
        alAceptar={alAceptar}
      />,
    )
    expect(screen.getByText('Se añadió Archet.')).toBeInTheDocument()
    expect(screen.getByText('El formato se actualizó.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(alAceptar).toHaveBeenCalledOnce()
  })
})
```

Son **8 pruebas**, exactamente las del contrato §6.8. La del tercer nivel silencia `console.error` porque React registra un error en consola cuando un componente lanza durante el render; `mockRestore()` al final se lo devuelve a las demás pruebas.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/interfaz/comunes/Dialogo.test.tsx
```

Fallo esperado: Vitest no encuentra el módulo `./Dialogo`. La hora y la duración varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

Error: Failed to resolve import "./Dialogo" from "src/interfaz/comunes/Dialogo.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Proyectos/GA/gestion_aldeas/src/interfaz/comunes/Dialogo.test.tsx:5:40
  3  |  import { useState } from "react";
  4  |  import { describe, expect, it, vi } from "vitest";
  5  |  import { Dialogo, DialogoMensaje } from "./Dialogo";
     |                                           ^

 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:05:06
   Duration  2.10s (environment 75%, setup 22%, transform 2%)
```

- [ ] **Paso 3: Crear `nivelDialogo.ts`**

Crea `src/interfaz/comunes/nivelDialogo.ts` con este contenido:

```ts
import { createContext, useContext } from 'react'

/** Como mucho hay dos diálogos visibles a la vez (espec. L219, §5). */
export const MAXIMO_DIALOGOS = 2

/** Nivel del diálogo que envuelve al componente actual: 0 fuera de todo diálogo (§6.8). */
export const ContextoNivelDialogo = createContext(0)

/** El nivel del Dialogo más cercano, o 0 si no hay ninguno alrededor. */
export function useNivelDialogo(): number {
  return useContext(ContextoNivelDialogo)
}
```

Este módulo no tiene prueba propia: lo comprueban las pruebas 5, 6 y 7 de `Dialogo.test.tsx` (el `data-apilado`, que el de abajo no se desmonta y el tercer nivel), y la tarea 20 lo reutiliza para no ofrecer el pie de alta en un diálogo ya apilado.

- [ ] **Paso 4: Implementar `Dialogo.module.css`**

Crea `src/interfaz/comunes/Dialogo.module.css` con este contenido:

```css
.dialogo {
  background: var(--vitela);
  border: 1px solid var(--borde);
  border-radius: 10px;
  box-shadow: var(--sombra-dialogo);
  max-height: calc(100dvh - 48px);
  padding: 0;
  display: flex;
  flex-direction: column;
}
.dialogo::backdrop {
  background: rgba(43, 33, 24, 0.55);
}
.dialogo[data-apilado='true'] {
  box-shadow: var(--sombra-dialogo-apilado);
  margin-top: 24px;
}
.dialogo[data-apilado='true']::backdrop {
  background: rgba(43, 33, 24, 0.35);
}
.cabecera {
  padding: 18px 16px 14px 28px;
  border-bottom: var(--filete);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.titulo {
  font-family: var(--fuente-titulo);
  font-size: 32px;
  font-weight: 600;
  line-height: 1.15;
  margin: 0;
}
.subtitulo {
  font-size: 15px;
  color: var(--tinta-suave);
  margin: 4px 0 0;
}
.cuerpo {
  padding: 18px 28px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pie {
  padding: 14px 20px 14px 28px;
  border-top: var(--filete);
  background: var(--papel);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pieDerecha {
  display: flex;
  gap: 10px;
}
.lineas p {
  font-size: 15px;
  margin: 0;
}
```

Medidas literales del contrato §6.8 (mjs L265-273): caja en `vitela`, borde 1 px `borde`, radio 10, `--sombra-dialogo` (y `--sombra-dialogo-apilado` en el nivel 2, anclado a 24 px con `margin-top`); cabecera con relleno `18px 16px 14px 28px` y `border-bottom: var(--filete)`; título Cormorant 32 px peso 600 interlineado 1.15; subtítulo 15 px `tinta-suave`; pie con relleno `14px 20px 14px 28px`, filete arriba y fondo `papel`.

- [ ] **Paso 5: Implementar `Dialogo.tsx`**

Crea `src/interfaz/comunes/Dialogo.tsx` con este contenido:

```tsx
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Boton, BotonIcono } from './Boton'
import estilos from './Dialogo.module.css'
import { ContextoNivelDialogo, MAXIMO_DIALOGOS, useNivelDialogo } from './nivelDialogo'

export interface PropsDialogo {
  titulo: string
  subtitulo?: string
  ancho: number
  abierto: boolean
  alCancelar: () => void
  pieIzquierda?: ReactNode
  pieDerecha?: ReactNode
  children: ReactNode
}

/**
 * Dialogo de §6.8: un `<dialog>` nativo con `showModal`, que apila hasta dos niveles (espec. L219).
 * La x y Esc equivalen a Cancelar (espec. L945); clicar el velo no cierra, para no perder lo escrito.
 */
export function Dialogo(props: PropsDialogo) {
  const { titulo, subtitulo, ancho, abierto, alCancelar, pieIzquierda, pieDerecha, children } = props
  const nivelExterior = useNivelDialogo()
  const nivel = nivelExterior + 1
  if (nivel > MAXIMO_DIALOGOS) {
    throw new Error('Como mucho hay dos diálogos visibles (§5)')
  }

  const referencia = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  const idSubtitulo = useId()

  useEffect(() => {
    const dialogo = referencia.current
    if (!dialogo) {
      return
    }
    // Antes de showModal se mira dialog.open, por StrictMode (crítica §5.1).
    if (abierto && !dialogo.open) {
      dialogo.showModal()
    }
    if (!abierto && dialogo.open) {
      dialogo.close()
    }
    return () => {
      if (dialogo.open) {
        dialogo.close()
      }
    }
  }, [abierto])

  useEffect(() => {
    const dialogo = referencia.current
    if (!dialogo) {
      return
    }
    function alRecibirCancel(evento: Event) {
      // El evento cancel (Esc) equivale a Cancelar; no cierra por sí solo (espec. L945).
      evento.preventDefault()
      alCancelar()
    }
    dialogo.addEventListener('cancel', alRecibirCancel)
    return () => dialogo.removeEventListener('cancel', alRecibirCancel)
  }, [alCancelar])

  if (!abierto) {
    return null
  }

  return (
    <ContextoNivelDialogo.Provider value={nivel}>
      <dialog
        ref={referencia}
        aria-labelledby={idTitulo}
        aria-describedby={subtitulo ? idSubtitulo : undefined}
        data-apilado={nivel === 2 ? 'true' : undefined}
        style={{ width: ancho }}
        className={estilos.dialogo}
      >
        <div className={estilos.cabecera}>
          <div>
            <h2 id={idTitulo} className={estilos.titulo}>
              {titulo}
            </h2>
            {subtitulo ? (
              <p id={idSubtitulo} className={estilos.subtitulo}>
                {subtitulo}
              </p>
            ) : null}
          </div>
          <BotonIcono icono="x" etiqueta="Cerrar" variante="fantasma" alPulsar={alCancelar} />
        </div>
        <div className={estilos.cuerpo}>{children}</div>
        {pieIzquierda || pieDerecha ? (
          <div className={estilos.pie}>
            <div>{pieIzquierda}</div>
            <div className={estilos.pieDerecha}>{pieDerecha}</div>
          </div>
        ) : null}
      </dialog>
    </ContextoNivelDialogo.Provider>
  )
}

export interface PropsDialogoMensaje {
  titulo: string
  lineas: readonly string[]
  abierto: boolean
  alAceptar: () => void
}

/** DialogoMensaje de §6.8: una línea por mensaje y «Aceptar»; su Cancelar (x o Esc) equivale a Aceptar. */
export function DialogoMensaje(props: PropsDialogoMensaje) {
  return (
    <Dialogo
      titulo={props.titulo}
      ancho={620}
      abierto={props.abierto}
      alCancelar={props.alAceptar}
      pieDerecha={
        <Boton variante="principal" alPulsar={props.alAceptar}>
          Aceptar
        </Boton>
      }
    >
      <div className={estilos.lineas}>
        {props.lineas.map((linea, indice) => (
          <p key={indice}>{linea}</p>
        ))}
      </div>
    </Dialogo>
  )
}
```

Tres decisiones de implementación, tomadas por ser las más simples que cumplen las reglas de arriba:

1. **`props` se desestructura en la primera línea de `Dialogo`** (`const { titulo, ... } = props`) en vez de leer `props.titulo` en cada sitio. No es una exigencia del contrato, pero evita el aviso `react-hooks(exhaustive-deps)` de oxlint en el segundo efecto: con `props.alCancelar` en el array de dependencias, oxlint no siempre puede probar que no hace falta el objeto `props` entero, y con la variable ya extraída el análisis es directo. Se comprueba en el paso 8: `npm run lint` queda sin avisos.
2. **`dialog.open` se mira antes de llamar a `showModal()`**, y al desmontar se cierra si sigue abierto: es la comprobación que pide la crítica §5.1 para que `StrictMode` (que monta, desmonta y vuelve a montar cada componente en desarrollo) no llame dos veces a `showModal()` sobre un `<dialog>` ya abierto, lo que lanzaría `InvalidStateError`.
3. **El segundo `useEffect` solo registra el listener de `cancel`**, aparte del que abre y cierra: así cambiar `alCancelar` (una función nueva en cada render, si quien usa `Dialogo` no la memoiza) no fuerza a cerrar y reabrir el `<dialog>` nativo, que perdería el foco interno.

- [ ] **Paso 6: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/interfaz/comunes/Dialogo.test.tsx
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  22:05:16
   Duration  4.11s (environment 55%, setup 21%, tests 9%, import 8%, transform 7%)
```

- [ ] **Paso 7: Comprobar los tipos, el lint y todas las pruebas**

```bash
npx tsc -b
npm run lint
npm test
```

`npx tsc -b` no escribe nada. `npm run lint` termina sin avisos (es el paso que confirma la decisión 1 de arriba: sin la desestructuración, oxlint avisaría `react-hooks(exhaustive-deps): React Hook useEffect has a missing dependency: 'props'` en el efecto del `cancel`). Esta tarea suma **+8 pruebas y +1 archivo** sobre lo que dejó la tarea 17 (`nivelDialogo.ts` no tiene prueba propia). Con las tareas 1 a 17 ya aplicadas, `npm test` debería terminar en **1.026 pruebas en 103 archivos**:

```text
 Test Files  103 passed (103)
      Tests  1026 passed (1026)
```

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +8 pruebas y +1 archivo sobre lo que dejó la tarea 17.

- [ ] **Paso 8: Commit**

```bash
git add src/interfaz/comunes/nivelDialogo.ts src/interfaz/comunes/Dialogo.tsx src/interfaz/comunes/Dialogo.module.css src/interfaz/comunes/Dialogo.test.tsx
git commit -m "feat(interfaz): Dialogo sobre <dialog> nativo, apilado a dos niveles, y DialogoMensaje" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 3c4d5e6] feat(interfaz): Dialogo sobre <dialog> nativo, apilado a dos niveles, y DialogoMensaje
 4 files changed, 210 insertions(+)
 create mode 100644 src/interfaz/comunes/Dialogo.module.css
 create mode 100644 src/interfaz/comunes/Dialogo.test.tsx
 create mode 100644 src/interfaz/comunes/Dialogo.tsx
 create mode 100644 src/interfaz/comunes/nivelDialogo.ts
```

`git status --short` no muestra nada.

---
