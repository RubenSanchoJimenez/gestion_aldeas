### Tarea 14 · Panel, cabecera, nota, tabla y lista de pares

Esta tarea escribe los dos contenedores que enmarcan casi todo el contenido de la interfaz: `Panel` (con `CabeceraPantalla` y `Nota`) y `Tabla` (con `ListaPares`). Depende de la 13 (`Boton`, porque la acción de un `Panel` suele ser un botón o un enlace, aunque el propio `Panel` no importe nada de `Boton.tsx`: la dependencia es de orden de trabajo, no de código) y la usan, entre otras, la tarea 19 (`ConfirmacionEliminar`, que monta `Nota` y `ListaPares`) y la tarea 26 (`TablaMonedas`, sobre `Tabla`).

**Reglas de la especificación que implementa:**

- **El contenido principal se desplaza con la cabecera fija (espec. L821, §6.4).** «El contenido principal se desplaza en vertical con la cabecera de pantalla fija.» `CabeceraPantalla` es esa cabecera: un `h1` con su subtítulo y las acciones a la derecha, pensada para quedar fuera del área que hace scroll.
- **Estado vacío con frase breve (espec. L820, §6.4).** «Estado vacío… con frase breve.» `Panel` no impone ningún estado vacío propio (lo decide quien lo usa, como hará P0 en la tarea 30), pero es el contenedor sobre el que se construye.
- **Contrato §6.3 y §6.4, medidas literales (mjs L133-172).** `Panel`: `<section aria-labelledby>` en `vitela`, borde 1 px `borde`, radio 8; cabecera de 56 px mínimo con `border-bottom: var(--filete)`; título `<h2>` Cormorant 23 px peso 600. `CabeceraPantalla`: subtítulo 14 px en `tinta-suave`, `<h1>` Cormorant 36 px peso 600 interlineado 1.1. `Nota`: icono 16 px y texto 14 px en `tinta-suave`, 8 px de hueco. `Tabla`: `<th scope="col">` de 38 px, 13 px peso 600 en mayúsculas con `letter-spacing: 0.04em`; celdas de 15 px con `font-variant-numeric: tabular-nums`; fila `total` con filete doble y peso 600. `ListaPares`: filete simple entre filas salvo la última.
- **Reglas nuevas de la interfaz (§0).** La columna `derecha` de `ColumnaTabla` se lee en `data-derecha`, nunca en una clase CSS; `Panel.tsx` exporta los tres componentes de presentación y sus props; `Tabla.tsx` exporta `Tabla`, `ListaPares`, `ColumnaTabla`, `PropsTabla`, `FilaPar` y `PropsListaPares`.

**Archivos:**
- Crear: `src/interfaz/comunes/Panel.tsx`, `src/interfaz/comunes/Panel.module.css`, `src/interfaz/comunes/Tabla.tsx`, `src/interfaz/comunes/Tabla.module.css`
- Prueba: `src/interfaz/comunes/Panel.test.tsx`, `src/interfaz/comunes/Tabla.test.tsx`

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
cd C:/Proyectos/GA/gestion_aldeas
git status --short
npm test
```

Árbol limpio y **994 pruebas en 96 archivos** (lo que dejó la tarea 13; la hora y la duración varían):

```text
 Test Files  96 passed (96)
      Tests  994 passed (994)
```

- [ ] **Paso 2: Escribir la prueba de `Panel` que falla**

Crea `src/interfaz/comunes/Panel.test.tsx` con este contenido:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CabeceraPantalla, Nota, Panel } from './Panel'

describe('Panel', () => {
  it('es una región con el nombre de su título y pinta su acción', () => {
    render(
      <Panel titulo="Monedas" accion={<button type="button">Editar equivalencias</button>}>
        Cuerpo del panel
      </Panel>,
    )
    expect(screen.getByRole('region', { name: 'Monedas' })).toBeInTheDocument()
    expect(screen.getByText('Cuerpo del panel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar equivalencias' })).toBeInTheDocument()
  })
})

describe('CabeceraPantalla', () => {
  it('tiene un h1 y un subtítulo', () => {
    render(<CabeceraPantalla titulo="Ajustes" subtitulo="La Sombra del Este" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument()
    expect(screen.getByText('La Sombra del Este')).toBeInTheDocument()
  })
})

describe('Nota', () => {
  it('lleva info por defecto y el icono que se le pase', () => {
    const { container, rerender } = render(<Nota>Ayuda por defecto</Nota>)
    // el trazo de 'info' (trazos.ts): circle central y el punto de la i
    expect(container.querySelector('svg')?.innerHTML).toContain('M12 11v5M12 8h.01')

    rerender(<Nota icono="calendario">Otra ayuda</Nota>)
    // el trazo de 'calendario': el rectángulo de la hoja
    expect(container.querySelector('svg')?.innerHTML).toContain('width="18" height="16" rx="2"')
  })
})
```

Son las **3 pruebas** del contrato §6.3: el Panel como región con acción, `h1`+subtítulo de `CabeceraPantalla` y el icono por defecto/forzado de `Nota`.

- [ ] **Paso 3: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/interfaz/comunes/Panel.test.tsx
```

Fallo esperado: Vitest no encuentra el módulo `./Panel`, que todavía no existe (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |interfaz| src/interfaz/comunes/Panel.test.tsx (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |interfaz| src/interfaz/comunes/Panel.test.tsx [ src/interfaz/comunes/Panel.test.tsx ]
Error: Failed to resolve import "./Panel" from "src/interfaz/comunes/Panel.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Proyectos/GA/gestion_aldeas/src/interfaz/comunes/Panel.test.tsx:3:46
  1  |  import { render, screen } from "@testing-library/react";
  2  |  import { describe, expect, it } from "vitest";
  3  |  import { CabeceraPantalla, Nota, Panel } from "./Panel";
     |                                                 ^

 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:02:30
   Duration  2.11s (environment 67%, setup 30%, transform 2%)
```

- [ ] **Paso 4: Implementar `Panel.module.css`**

Crea `src/interfaz/comunes/Panel.module.css` con este contenido:

```css
/* Panel y cabecera de pantalla (mjs L133-146). */
.panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--vitela);
  border: 1px solid var(--borde);
  border-radius: var(--radio-panel);
}
.cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 6px 12px 4px 20px;
  border-bottom: var(--filete);
}
.titulo {
  margin: 0;
  font-family: var(--fuente-titulo);
  font-size: 23px;
  font-weight: 600;
  color: var(--tinta);
  white-space: nowrap;
}
.accion {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cuerpo {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.cabeceraPantalla {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.textos {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.subtitulo {
  font-family: var(--fuente-ui);
  font-size: 14px;
  color: var(--tinta-suave);
}
.tituloPantalla {
  margin: 0;
  font-family: var(--fuente-titulo);
  font-size: 36px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--tinta);
}
.acciones {
  display: flex;
  gap: 10px;
  align-items: center;
}

.nota {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-family: var(--fuente-ui);
  font-size: 14px;
  color: var(--tinta-suave);
}
```

- [ ] **Paso 5: Implementar `Panel.tsx`**

Crea `src/interfaz/comunes/Panel.tsx` con este contenido:

```tsx
import { useId, type ReactNode } from 'react'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/trazos'
import estilos from './Panel.module.css'

export interface PropsPanel {
  titulo: string
  accion?: ReactNode
  relleno?: string
  children: ReactNode
}

/** Contenedor con cabecera de filete doble, en vitela (mjs L140-146). */
export function Panel({ titulo, accion, relleno = '4px 20px 10px', children }: PropsPanel) {
  const idTitulo = useId()
  return (
    <section className={estilos.panel} aria-labelledby={idTitulo}>
      <div className={estilos.cabecera}>
        <h2 id={idTitulo} className={estilos.titulo}>
          {titulo}
        </h2>
        {accion !== undefined && <div className={estilos.accion}>{accion}</div>}
      </div>
      <div className={estilos.cuerpo} style={{ padding: relleno }}>
        {children}
      </div>
    </section>
  )
}

export interface PropsCabeceraPantalla {
  titulo: string
  subtitulo?: string
  acciones?: ReactNode
}

/** Cabecera de una pantalla completa: subtítulo, h1 y acciones a la derecha (mjs L133-139). */
export function CabeceraPantalla({ titulo, subtitulo, acciones }: PropsCabeceraPantalla) {
  return (
    <div className={estilos.cabeceraPantalla}>
      <div className={estilos.textos}>
        {subtitulo !== undefined && <span className={estilos.subtitulo}>{subtitulo}</span>}
        <h1 className={estilos.tituloPantalla}>{titulo}</h1>
      </div>
      {acciones !== undefined && <div className={estilos.acciones}>{acciones}</div>}
    </div>
  )
}

export interface PropsNota {
  children: ReactNode
  icono?: NombreIcono
}

/** Texto de ayuda con un icono pequeño, en tinta-suave; el color nunca va solo (mjs L187). */
export function Nota({ children, icono = 'info' }: PropsNota) {
  return (
    <div className={estilos.nota}>
      <Icono nombre={icono} tamano={16} color="var(--tinta-suave)" />
      <span>{children}</span>
    </div>
  )
}
```

- [ ] **Paso 6: Ejecutar la prueba de `Panel` y ver que pasa**

```bash
npx vitest run src/interfaz/comunes/Panel.test.tsx
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  22:02:45
   Duration  2.20s (environment 60%, setup 25%, transform 8%, tests 4%, import 3%)
```

- [ ] **Paso 7: Escribir la prueba de `Tabla` que falla**

Crea `src/interfaz/comunes/Tabla.test.tsx` con este contenido:

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListaPares, Tabla } from './Tabla'

const COLUMNAS = [{ titulo: 'Moneda' }, { titulo: 'Abrev.' }, { titulo: 'Equivale a', derecha: true }]
const FILAS = [
  ['Oro', 'mo', '10 mp'],
  ['Plata', 'mp', '10 mb'],
]

describe('Tabla', () => {
  it('las cabeceras se leen como columnheader', () => {
    render(<Tabla etiqueta="Monedas" columnas={COLUMNAS} filas={FILAS} />)
    expect(screen.getByRole('columnheader', { name: 'Moneda' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Abrev.' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Equivale a' })).toBeInTheDocument()
  })

  it('pinta las filas y sus celdas, con data-derecha en la columna de importes', () => {
    render(<Tabla etiqueta="Monedas" columnas={COLUMNAS} filas={FILAS} />)
    const filas = screen.getAllByRole('row')
    const filaOro = filas[1]
    expect(within(filaOro).getByText('Oro')).toBeInTheDocument()
    expect(within(filaOro).getByText('mo')).toBeInTheDocument()
    expect(within(filaOro).getByText('10 mp')).toHaveAttribute('data-derecha')
  })

  it('pinta la fila total con filete doble', () => {
    render(<Tabla etiqueta="Monedas" columnas={COLUMNAS} filas={FILAS} total={['Total', '', '20 mp']} />)
    const filas = screen.getAllByRole('row')
    const filaTotal = filas[filas.length - 1]
    expect(filaTotal).toHaveAttribute('data-total', 'true')
    expect(within(filaTotal).getByText('Total')).toBeInTheDocument()
  })
})

describe('ListaPares', () => {
  it('enseña cada par', () => {
    render(
      <ListaPares
        filas={[
          { etiqueta: 'Calendario', valor: 'Actual, con los meses de hoy' },
          { etiqueta: 'Fecha actual', valor: 'Jueves, 12 de abril de 1640 T.E.', sub: 'Domingo, 1 de enero' },
        ]}
      />,
    )
    expect(screen.getByText('Calendario')).toBeInTheDocument()
    expect(screen.getByText('Actual, con los meses de hoy')).toBeInTheDocument()
    expect(screen.getByText('Fecha actual')).toBeInTheDocument()
    expect(screen.getByText('Jueves, 12 de abril de 1640 T.E.')).toBeInTheDocument()
    expect(screen.getByText('Domingo, 1 de enero')).toBeInTheDocument()
  })
})
```

Son las **4 pruebas** del contrato §6.4: las cabeceras como `columnheader`, filas y celdas con `data-derecha`, la fila `total` y la `ListaPares` enseñando cada par.

- [ ] **Paso 8: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/interfaz/comunes/Tabla.test.tsx
```

Fallo esperado: Vitest no encuentra el módulo `./Tabla`, que todavía no existe (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ |interfaz| src/interfaz/comunes/Tabla.test.tsx (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |interfaz| src/interfaz/comunes/Tabla.test.tsx [ src/interfaz/comunes/Tabla.test.tsx ]
Error: Failed to resolve import "./Tabla" from "src/interfaz/comunes/Tabla.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Proyectos/GA/gestion_aldeas/src/interfaz/comunes/Tabla.test.tsx:3:34
  1  |  import { render, screen, within } from "@testing-library/react";
  2  |  import { describe, expect, it } from "vitest";
  3  |  import { ListaPares, Tabla } from "./Tabla";
     |                                     ^

 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:02:58
   Duration  1.97s (environment 66%, setup 31%, transform 3%)
```

- [ ] **Paso 9: Implementar `Tabla.module.css`**

Crea `src/interfaz/comunes/Tabla.module.css` con este contenido:

```css
/* Tabla y lista de pares (mjs L158-172). */
.tabla {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--fuente-ui);
}
.cabecera {
  height: 38px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tinta-suave);
  text-align: left;
}
.cabecera[data-derecha] {
  text-align: right;
}
.celda {
  padding: 0 8px;
  font-size: 15px;
  color: var(--tinta);
  font-variant-numeric: tabular-nums;
  text-align: left;
}
.celda[data-derecha] {
  text-align: right;
}
tbody tr:not(:last-child) .celda {
  border-bottom: 1px solid var(--borde);
}
.celdaTotal {
  padding: 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--tinta);
  font-variant-numeric: tabular-nums;
  border-top: var(--filete);
  text-align: left;
}
.celdaTotal[data-derecha] {
  text-align: right;
}

.listaPares {
  display: flex;
  flex-direction: column;
  margin: 0;
}
.filaPar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--borde);
}
.filaPar[data-ultima] {
  border-bottom: none;
}
.etiquetaPar {
  display: flex;
  flex-direction: column;
  margin: 0;
  font-size: 15px;
  color: var(--tinta);
}
.subPar {
  font-size: 13px;
  color: var(--tinta-suave);
}
.valorPar {
  margin: 0;
  font-size: 15px;
  color: var(--tinta);
}
```

- [ ] **Paso 10: Implementar `Tabla.tsx`**

Crea `src/interfaz/comunes/Tabla.tsx` con este contenido:

```tsx
import type { ReactNode } from 'react'
import estilos from './Tabla.module.css'

export interface ColumnaTabla {
  titulo: string
  ancho?: string
  derecha?: boolean
}

export interface PropsTabla {
  etiqueta: string
  columnas: readonly ColumnaTabla[]
  filas: readonly (readonly ReactNode[])[]
  altoFila?: number
  total?: readonly ReactNode[]
}

/** Tabla de registros con cabecera de columnas y una fila de total opcional (mjs L161-172). */
export function Tabla({ etiqueta, columnas, filas, altoFila = 44, total }: PropsTabla) {
  return (
    <table aria-label={etiqueta} className={estilos.tabla}>
      <thead>
        <tr>
          {columnas.map((columna) => (
            <th
              key={columna.titulo}
              scope="col"
              className={estilos.cabecera}
              data-derecha={columna.derecha === true ? '' : undefined}
              style={{ width: columna.ancho }}
            >
              {columna.titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((celdas, indiceFila) => (
          // Las filas son datos ya ordenados por quien llama; no traen una clave propia en esta capa de presentación.
          <tr key={indiceFila} style={{ height: altoFila }}>
            {celdas.map((celda, indiceCelda) => (
              <td
                key={columnas[indiceCelda]?.titulo ?? indiceCelda}
                className={estilos.celda}
                data-derecha={columnas[indiceCelda]?.derecha === true ? '' : undefined}
              >
                {celda}
              </td>
            ))}
          </tr>
        ))}
        {total !== undefined && (
          <tr data-total="true" style={{ height: altoFila }}>
            {total.map((celda, indiceCelda) => (
              <td
                key={columnas[indiceCelda]?.titulo ?? indiceCelda}
                className={estilos.celdaTotal}
                data-derecha={columnas[indiceCelda]?.derecha === true ? '' : undefined}
              >
                {celda}
              </td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  )
}

export interface FilaPar {
  etiqueta: ReactNode
  valor: ReactNode
  sub?: ReactNode
}

export interface PropsListaPares {
  filas: readonly FilaPar[]
  altoFila?: number
}

/** Lista de pares etiqueta-valor, con filete simple entre filas salvo la última (mjs L158-160). */
export function ListaPares({ filas, altoFila }: PropsListaPares) {
  return (
    <dl className={estilos.listaPares}>
      {filas.map((par, indice) => (
        <div
          key={indice}
          className={estilos.filaPar}
          style={{ minHeight: altoFila ?? (par.sub === undefined ? 44 : 54) }}
          data-ultima={indice === filas.length - 1 ? '' : undefined}
        >
          <dt className={estilos.etiquetaPar}>
            <span>{par.etiqueta}</span>
            {par.sub !== undefined && <span className={estilos.subPar}>{par.sub}</span>}
          </dt>
          <dd className={estilos.valorPar}>{par.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
```

`FilaPar` y `PropsListaPares` son los tipos que reutilizará la tarea 19 (`ConfirmacionEliminar`, la caja de resumen de J2d) y la tarea 26 (`TablaMonedas`, la fila «Última copia exportada» de P6).

- [ ] **Paso 11: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/interfaz/comunes/Panel.test.tsx src/interfaz/comunes/Tabla.test.tsx
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  2 passed (2)
      Tests  7 passed (7)
   Start at  22:03:12
   Duration  6.02s (environment 61%, setup 28%, transform 7%, tests 2%, import 1%, worker 1%)
```

- [ ] **Paso 12: Comprobar los tipos, el lint, todas las pruebas y el build**

```bash
npx tsc -b
npm run lint
npm test
npm run build
```

`npx tsc -b` no escribe nada. `npm run lint` termina sin avisos. Ninguno de los cuatro módulos toca `src/dominio`, así que `pureza.test.ts` no crece: esta tarea suma **+7 pruebas y +2 archivos** sobre lo que dejó la tarea 13. Con las tareas 1 a 14 ya aplicadas, `npm test` debería terminar en **1.001 pruebas en 98 archivos**:

```text
 Test Files  98 passed (98)
      Tests  1001 passed (1001)
```

`npm run build` termina con `✓ built in …`.

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +7 pruebas y +2 archivos sobre lo que dejó la tarea 13.

- [ ] **Paso 13: Commit**

```bash
git add src/interfaz/comunes/Panel.tsx src/interfaz/comunes/Panel.module.css src/interfaz/comunes/Panel.test.tsx src/interfaz/comunes/Tabla.tsx src/interfaz/comunes/Tabla.module.css src/interfaz/comunes/Tabla.test.tsx
git commit -m "feat(interfaz): Panel, CabeceraPantalla, Nota, Tabla y ListaPares" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 5e6f7a8] feat(interfaz): Panel, CabeceraPantalla, Nota, Tabla y ListaPares
 6 files changed, 407 insertions(+)
 create mode 100644 src/interfaz/comunes/Panel.module.css
 create mode 100644 src/interfaz/comunes/Panel.test.tsx
 create mode 100644 src/interfaz/comunes/Panel.tsx
 create mode 100644 src/interfaz/comunes/Tabla.module.css
 create mode 100644 src/interfaz/comunes/Tabla.test.tsx
 create mode 100644 src/interfaz/comunes/Tabla.tsx
```

`git status --short` no muestra nada.

---
