### Tarea 17 · Segmentos

`Segmentos` es el control de §6.7 para elecciones fijas de 2 a 4 opciones excluyentes: Edad, «gasto, ingreso o transferencia», «Por personas o Sacos», el reino de un hechizo… La especificación (§6.5, espec. L871) dice que estas listas «no son desplegables sino segmentos». Esta tarea depende de la 15 (`EtiquetaCampo`, `CampoTexto`, `Casilla`…): no porque `Segmentos` importe nada de `Campo.tsx`, sino porque la tarea 15 es quien deja fijado el patrón de etiqueta accesible y campo oculto a la vista (`etiquetaOculta`) que `Segmentos` reutiliza igual que `CampoTexto`.

**Reglas de la especificación que implementa:**

- **Segmentos, no desplegables (§6.5, espec. L871).** «Las elecciones fijas de 2 a 4 opciones excluyentes no son desplegables sino segmentos: Edad; gasto, ingreso o transferencia…». Esta tarea escribe el control genérico; qué pantalla lo usa con qué opciones es cosa de fases y tareas posteriores (P1 usa Edad en la tarea 27, por ejemplo).
- **Peso 600 en todas las opciones (crítica C4).** El generador de vistas (mjs L1365-1368) pintaba solo la opción activa en negrita; la crítica de la fase señaló que las cuatro tienen que ir en el mismo peso para no dar la impresión de que las inactivas están desactivadas. El contrato (§6.7) ya lo corrige: «Cada opción tiene… 15 px y **peso 600 en todas**».
- **Accesibilidad de un grupo de radios (§6.7).** `role="radiogroup"` etiquetado, cada opción es un `<button role="radio" aria-checked>` y las flechas izquierda y derecha mueven la selección con *roving tabindex*, el patrón WAI-ARIA estándar de un grupo de radios con teclado.
- **Reglas nuevas de la interfaz (§0).** Las funciones de respuesta se llaman `al…` (`alCambiar`), el `.tsx` solo exporta el componente, el tipo `OpcionSegmento` y la interfaz de props, y las pruebas leen `aria-checked`, nunca una clase CSS.

**Archivos:**
- Crear: `src/interfaz/comunes/Segmentos.tsx`, `src/interfaz/comunes/Segmentos.module.css`
- Prueba: `src/interfaz/comunes/Segmentos.test.tsx`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/interfaz/comunes/Segmentos.test.tsx` con este contenido:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Segmentos, type OpcionSegmento } from './Segmentos'

const OPCIONES: readonly OpcionSegmento<'dia' | 'semana' | 'mes'>[] = [
  { valor: 'dia', texto: 'Día' },
  { valor: 'semana', texto: 'Semana' },
  { valor: 'mes', texto: 'Mes' },
]

describe('Segmentos', () => {
  it('es un radiogroup con el nombre de su etiqueta (§6.7)', () => {
    render(<Segmentos etiqueta="Vista" opciones={OPCIONES} valor="dia" alCambiar={vi.fn()} />)
    expect(screen.getByRole('radiogroup', { name: 'Vista' })).toBeInTheDocument()
  })

  it('la opción activa está checked y las demás no', () => {
    render(<Segmentos etiqueta="Vista" opciones={OPCIONES} valor="semana" alCambiar={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'Día' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: 'Semana' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Mes' })).toHaveAttribute('aria-checked', 'false')
  })

  it('tocar una opción llama a alCambiar con su valor', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<Segmentos etiqueta="Vista" opciones={OPCIONES} valor="dia" alCambiar={alCambiar} />)
    await usuario.click(screen.getByRole('radio', { name: 'Mes' }))
    expect(alCambiar).toHaveBeenCalledOnce()
    expect(alCambiar).toHaveBeenCalledWith('mes')
  })

  it('la flecha derecha pasa a la siguiente opción, y de la última vuelve a la primera', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    const primero = render(<Segmentos etiqueta="Vista" opciones={OPCIONES} valor="dia" alCambiar={alCambiar} />)
    screen.getByRole('radio', { name: 'Día' }).focus()
    await usuario.keyboard('{ArrowRight}')
    expect(alCambiar).toHaveBeenLastCalledWith('semana')
    primero.unmount()

    alCambiar.mockClear()
    render(<Segmentos etiqueta="Vista" opciones={OPCIONES} valor="mes" alCambiar={alCambiar} />)
    screen.getByRole('radio', { name: 'Mes' }).focus()
    await usuario.keyboard('{ArrowRight}')
    expect(alCambiar).toHaveBeenLastCalledWith('dia')
  })

  it('desactivado no llama a alCambiar al tocarlo', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<Segmentos etiqueta="Vista" opciones={OPCIONES} valor="dia" alCambiar={alCambiar} desactivado />)
    await usuario.click(screen.getByRole('radio', { name: 'Mes' }))
    expect(alCambiar).not.toHaveBeenCalled()
  })
})
```

Son **5 pruebas**: el `radiogroup`, la opción activa, tocar, la flecha derecha (con el «da la vuelta») y desactivado, exactamente las del contrato §6.7. La flecha derecha se comprueba con dos montajes separados (uno por cada extremo) en vez de reordenar el DOM: es más simple que simular el cambio de `valor` a media prueba.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/interfaz/comunes/Segmentos.test.tsx
```

Fallo esperado: Vitest no encuentra el módulo `./Segmentos`. La hora y la duración varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |interfaz| src/interfaz/comunes/Segmentos.test.tsx (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |interfaz| src/interfaz/comunes/Segmentos.test.tsx [ src/interfaz/comunes/Segmentos.test.tsx ]
Error: Failed to resolve import "./Segmentos" from "src/interfaz/comunes/Segmentos.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Proyectos/GA/gestion_aldeas/src/interfaz/comunes/Segmentos.test.tsx:4:47
  2  |  import userEvent from "@testing-library/user-event";
  3  |  import { describe, expect, it, vi } from "vitest";
  4  |  import { Segmentos } from "./Segmentos";
     |                             ^

 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:04:31
   Duration  1.99s (environment 64%, setup 32%, transform 3%, worker 1%)
```

- [ ] **Paso 3: Implementar `Segmentos.module.css`**

Crea `src/interfaz/comunes/Segmentos.module.css` con este contenido:

```css
.contenedor {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--pliegue);
  border-radius: 8px;
}
.opcion {
  flex: 1;
  height: 44px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  border: 1px solid transparent;
  background: none;
  color: var(--tinta-suave);
}
.opcion[aria-checked='true'] {
  background: var(--vitela);
  border-color: var(--oro);
  color: var(--tinta);
}
.contenedor[data-desactivado='true'] .opcion {
  opacity: 0.6;
  cursor: not-allowed;
}
```

Medidas literales del contrato §6.7 (mjs L1365-1368): contenedor en `pliegue` con relleno 4 px, radio 8 y 6 px de hueco; cada opción a `flex: 1`, 44 px, radio 6, 15 px y peso 600 en las dos (activa e inactiva); activa con fondo `vitela`, borde de 1 px `oro` y texto `tinta`; inactiva con borde transparente y texto `tinta-suave` (§3.4: desactivado con `opacity: 0.6`).

- [ ] **Paso 4: Implementar `Segmentos.tsx`**

Crea `src/interfaz/comunes/Segmentos.tsx` con este contenido:

```tsx
import { useId, type KeyboardEvent } from 'react'
import estilos from './Segmentos.module.css'

/** Una opción de Segmentos, con el valor que se devuelve y el texto que se lee (§6.7). */
export interface OpcionSegmento<V extends string> {
  valor: V
  texto: string
}

export interface PropsSegmentos<V extends string> {
  etiqueta: string
  opciones: readonly OpcionSegmento<V>[]
  valor: V
  alCambiar: (valor: V) => void
  desactivado?: boolean
  etiquetaOculta?: boolean
}

/** Segmentos de §6.7: un radiogroup con roving tabindex y las flechas izquierda y derecha. */
export function Segmentos<V extends string>(props: PropsSegmentos<V>) {
  const idEtiqueta = useId()
  const total = props.opciones.length

  function alPulsarTecla(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    if (props.desactivado) {
      return
    }
    if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') {
      return
    }
    evento.preventDefault()
    const siguiente = evento.key === 'ArrowRight' ? (indice + 1) % total : (indice - 1 + total) % total
    props.alCambiar(props.opciones[siguiente].valor)
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={props.etiquetaOculta ? undefined : idEtiqueta}
      aria-label={props.etiquetaOculta ? props.etiqueta : undefined}
      data-desactivado={props.desactivado || undefined}
      className={estilos.contenedor}
    >
      {!props.etiquetaOculta ? (
        <span id={idEtiqueta} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
          {props.etiqueta}
        </span>
      ) : null}
      {props.opciones.map((opcion, indice) => {
        const activa = opcion.valor === props.valor
        return (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={activa}
            tabIndex={activa ? 0 : -1}
            disabled={props.desactivado}
            onClick={() => props.alCambiar(opcion.valor)}
            onKeyDown={(evento) => alPulsarTecla(evento, indice)}
            className={estilos.opcion}
          >
            {opcion.texto}
          </button>
        )
      })}
    </div>
  )
}
```

Dos cosas que no están en el contrato al pie de la letra y que resuelve esta tarea, de la forma más simple:

1. **`aria-checked` mueve el `tabIndex`**, no la tecla en sí: la flecha llama a `alCambiar`, que es quien decide el nuevo `valor`, y en el siguiente render la opción activa pasa a `tabIndex={0}`. Es el patrón *roving tabindex* controlado por props, igual que hace `Segmentos` con el click.
2. **La etiqueta oculta a la vista** usa el mismo recorte en línea (`position: absolute; width: 1px; height: 1px; overflow: hidden`) que usará `CampoTexto` (tarea 15) para su propio `etiquetaOculta`: es la técnica más simple sin añadir una clase «solo lectores de pantalla» nueva al sistema visual.

- [ ] **Paso 5: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/interfaz/comunes/Segmentos.test.tsx
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  22:04:43
   Duration  5.08s (environment 50%, setup 27%, import 8%, transform 7%, tests 7%)
```

- [ ] **Paso 6: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

`npx tsc -b` no escribe nada. Esta tarea suma **+5 pruebas y +1 archivo** sobre lo que dejó la tarea 16. Con las tareas 1 a 16 ya aplicadas, `npm test` debería terminar en **1.018 pruebas en 102 archivos**:

```text
 Test Files  102 passed (102)
      Tests  1018 passed (1018)
```

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +5 pruebas y +1 archivo sobre lo que dejó la tarea 16.

- [ ] **Paso 7: Commit**

```bash
git add src/interfaz/comunes/Segmentos.tsx src/interfaz/comunes/Segmentos.module.css src/interfaz/comunes/Segmentos.test.tsx
git commit -m "feat(interfaz): Segmentos, un radiogroup con roving tabindex para las elecciones fijas" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 2b3c4d5] feat(interfaz): Segmentos, un radiogroup con roving tabindex para las elecciones fijas
 3 files changed, 90 insertions(+)
 create mode 100644 src/interfaz/comunes/Segmentos.module.css
 create mode 100644 src/interfaz/comunes/Segmentos.test.tsx
 create mode 100644 src/interfaz/comunes/Segmentos.tsx
```

`git status --short` no muestra nada.

---
