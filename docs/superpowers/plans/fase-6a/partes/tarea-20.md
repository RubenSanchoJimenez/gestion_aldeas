### Tarea 20 · SelectorConBuscador

`SelectorConBuscador` es el componente único de §6.5 que reemplaza todo desplegable con más de un puñado de opciones: categorías, oficios, ubicaciones, monedas… «Componente único, diseñado en J2c, A9b y A12b» (espec. L859). Es, con diferencia, el componente más grande de la fase 6a. Depende de la tarea 6 (`buscarEn`, de `dominio/texto/buscar.ts`, y `normalizarNombre`/`mismoNombre`, ya en `dominio/texto/normalizar.ts` desde la fase 2), de la 15 (mismo patrón de `etiqueta`/`etiquetaOculta`/`ayuda`/`error` que `CampoTexto`, aunque esta tarea no llega a dibujar `ayuda` ni `error`: quedan en la interfaz para cuando un formulario los necesite, sin prueba propia en esta tarea) y de la 18 (`useNivelDialogo`, para no ofrecer el pie de alta dentro de un diálogo ya apilado, y `Boton`/`Enlace` de la tarea 13 para las dos formas del pie).

**Nota de dependencia entre grupos.** Igual que en la tarea 16, tres de las 16 pruebas de esta tarea identifican un icono por `data-nombre` en su `<svg>` (`check` en la opción elegida, y de forma indirecta `buscar`, `x` y `mas` en el buscador y el pie, aunque solo `check` tiene una aserción explícita). Si la tarea 12 (`Icono.tsx`) no lleva ya `data-nombre={props.nombre}` por la tarea 16, añádelo ahora.

**Reglas de la especificación que implementa:**

- **Panel, buscador y contador (espec. L859-861).** «Al tocar el campo se abre un panel bajo él, de 400 px como mínimo… Con más de 12 opciones recibe el foco y sale el teclado. Con 12 o menos se ve sin foco… Sin búsqueda muestra el total («27 categorías»). Con búsqueda, el número de coincidencias («5 de 27»).»
- **Búsqueda también en el detalle (espec. L862).** «Sin distinguir mayúsculas ni tildes, en cualquier parte del texto y también en el dato secundario (buscar «180» encuentra «Piedra · 180 carretadas»).»
- **Resaltado, grupos y opción actual (espec. L863).** «Resalta el texto que coincide, agrupa las opciones por categoría y marca la opción actual.»
- **Recientes (espec. L864).** «Sin búsqueda, arriba aparece el grupo «Recientes», con hasta 5 opciones… Si no hay, no sale el grupo.» La tarea 26 en adelante es quien calculará qué va en `recientes`; esta tarea solo dibuja la lista que le llega.
- **Sin resultados (espec. L866).** «Nada coincide con “…”» y, debajo, «Busca en todas las categorías y grupos.».
- **Modo filtro (espec. L871).** «Primera opción «Todas» o «Todos», sin altas ni pie, solo opciones con datos y su número de registros.»
- **Pie de alta, patrón 1 (espec. L925-938).** Fila de 44 px con fondo papel y filete arriba; sin búsqueda dice «Nueva categoría», con búsqueda «Nueva categoría “posada”» con el texto cortado a 16 caracteres más «…»; con resultados es un enlace en oro oscuro a la izquierda; sin resultados, un botón principal de 44 px; con una coincidencia exacta (`mismoNombre`, tarea 6), sin acción: «“Alojamiento” ya existe». «Al tocar la acción: el panel se cierra sin cambiar el valor del campo… y se abre el patrón que corresponda.» Esta tarea llama a `alPedir(busqueda)` y cierra; abrir el patrón 2, 3 o 4 es cosa de quien reciba esa llamada, en fases posteriores.
- **Pie de alta, dónde no (espec. L925, «Dónde no»).** «En los selectores de un diálogo de alta ya apilado, para no abrir un tercer nivel»: de ahí `useNivelDialogo() < 2` como condición para pintar el pie.
- **Modo filtro no lleva pie de alta (espec. L871 y L925, «Dónde no»).** «En los filtros de las listas: una opción creada para filtrar daría una lista vacía.»

**Archivos:**
- Crear: `src/interfaz/comunes/SelectorConBuscador.tsx`, `src/interfaz/comunes/SelectorConBuscador.module.css`
- Prueba: `src/interfaz/comunes/SelectorConBuscador.test.tsx`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/interfaz/comunes/SelectorConBuscador.test.tsx` con este contenido:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ContextoNivelDialogo } from './nivelDialogo'
import { SelectorConBuscador, type GrupoSelector, type OpcionSelector } from './SelectorConBuscador'

type Valor = string

const SUSTANTIVO = { singular: 'categoría', plural: 'categorías' }

const GRUPOS: readonly GrupoSelector<Valor>[] = [
  {
    nombre: 'Habituales',
    opciones: [
      { valor: 'alojamiento', texto: 'Alojamiento' },
      { valor: 'comida', texto: 'Comida y bebida' },
      { valor: 'piedra', texto: 'Piedra', detalle: '180 carretadas' },
    ],
  },
  {
    nombre: 'Otras',
    opciones: [
      { valor: 'alamo', texto: 'Álamo' },
      { valor: 'senor', texto: 'Señor' },
    ],
  },
]

function opciones(cantidad: number): OpcionSelector<Valor>[] {
  return Array.from({ length: cantidad }, (_, indice) => ({ valor: `op${indice}`, texto: `Opción ${indice + 1}` }))
}

describe('SelectorConBuscador', () => {
  it('el campo cerrado enseña la opción elegida o textoSinValor', () => {
    const { rerender } = render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor="alojamiento"
        textoSinValor="Elige una categoría"
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
      />,
    )
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveTextContent('Alojamiento')

    rerender(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        textoSinValor="Elige una categoría"
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
      />,
    )
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveTextContent('Elige una categoría')
  })

  it('al tocarlo se abre el listbox con las etiquetas de grupo', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador etiqueta="Categoría" valor={null} grupos={GRUPOS} alCambiar={vi.fn()} sustantivo={SUSTANTIVO} />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    expect(screen.getByRole('listbox', { name: 'Categoría' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Habituales' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Otras' })).toBeInTheDocument()
  })

  it('con 7 opciones el buscador no tiene el foco', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador
        etiqueta="Moneda"
        valor={null}
        grupos={[{ opciones: opciones(7) }]}
        alCambiar={vi.fn()}
        sustantivo={{ singular: 'moneda', plural: 'monedas' }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Moneda' }))
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).not.toHaveFocus()
  })

  it('con 13 opciones sí lo tiene', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador
        etiqueta="Moneda"
        valor={null}
        grupos={[{ opciones: opciones(13) }]}
        alCambiar={vi.fn()}
        sustantivo={{ singular: 'moneda', plural: 'monedas' }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Moneda' }))
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveFocus()
  })

  it('el contador: «7 monedas», «1 moneda» y «5 de 27» al buscar', async () => {
    const usuario = userEvent.setup()
    const veintisiete = [
      ...Array.from({ length: 22 }, (_, indice) => ({ valor: `c${indice}`, texto: `Categoría ${indice + 1}` })),
      ...Array.from({ length: 5 }, (_, indice) => ({ valor: `e${indice}`, texto: `Especial ${indice + 1}` })),
    ]
    const { unmount } = render(
      <SelectorConBuscador
        etiqueta="Moneda"
        valor={null}
        grupos={[{ opciones: opciones(7) }]}
        alCambiar={vi.fn()}
        sustantivo={{ singular: 'moneda', plural: 'monedas' }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Moneda' }))
    expect(screen.getByText('7 monedas')).toBeInTheDocument()
    unmount()

    const segundo = render(
      <SelectorConBuscador
        etiqueta="Moneda"
        valor={null}
        grupos={[{ opciones: opciones(1) }]}
        alCambiar={vi.fn()}
        sustantivo={{ singular: 'moneda', plural: 'monedas' }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Moneda' }))
    expect(screen.getByText('1 moneda')).toBeInTheDocument()
    segundo.unmount()

    render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        grupos={[{ opciones: veintisiete }]}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    expect(screen.getByText('27 categorías')).toBeInTheDocument()
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'esp')
    expect(screen.getByText('5 de 27')).toBeInTheDocument()
  })

  it('la búsqueda no distingue mayúsculas ni tildes y mira también el detalle («180»)', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador etiqueta="Categoría" valor={null} grupos={GRUPOS} alCambiar={vi.fn()} sustantivo={SUSTANTIVO} />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'ALAMO')
    expect(screen.getByRole('option', { name: /Álamo/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Alojamiento/ })).not.toBeInTheDocument()

    await userEvent.setup().clear(screen.getByRole('searchbox', { name: 'Buscar' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), '180')
    expect(screen.getByRole('option', { name: /Piedra/ })).toBeInTheDocument()
  })

  it('resaltado: «ala» sobre «Álamo» deja <strong>Ála</strong>mo', async () => {
    const usuario = userEvent.setup()
    const { container } = render(
      <SelectorConBuscador etiqueta="Categoría" valor={null} grupos={GRUPOS} alCambiar={vi.fn()} sustantivo={SUSTANTIVO} />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'ala')
    const opcion = container.querySelector('[data-valor="alamo"]')
    expect(opcion).not.toBeNull()
    const fuerte = opcion?.querySelector('strong')
    expect(fuerte).toHaveTextContent('Ála')
    expect(fuerte?.nextSibling?.textContent).toBe('mo')
  })

  it('sin resultados salen los dos textos', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador etiqueta="Categoría" valor={null} grupos={GRUPOS} alCambiar={vi.fn()} sustantivo={SUSTANTIVO} />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'zzz')
    expect(screen.getByText('Nada coincide con “zzz”')).toBeInTheDocument()
    expect(screen.getByText('Busca en todas las categorías y grupos.')).toBeInTheDocument()
  })

  it('elegir llama a alCambiar y cierra', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(
      <SelectorConBuscador etiqueta="Categoría" valor={null} grupos={GRUPOS} alCambiar={alCambiar} sustantivo={SUSTANTIVO} />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await usuario.click(screen.getByRole('option', { name: 'Comida y bebida' }))
    expect(alCambiar).toHaveBeenCalledOnce()
    expect(alCambiar).toHaveBeenCalledWith('comida')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('la opción actual está aria-selected y lleva check', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador etiqueta="Categoría" valor="comida" grupos={GRUPOS} alCambiar={vi.fn()} sustantivo={SUSTANTIVO} />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    const elegida = screen.getByRole('option', { name: /Comida y bebida/ })
    expect(elegida).toHaveAttribute('aria-selected', 'true')
    expect(elegida.querySelector('svg')).toHaveAttribute('data-nombre', 'check')
    expect(screen.getByRole('option', { name: 'Alojamiento' })).toHaveAttribute('aria-selected', 'false')
  })

  it('«Recientes» sale arriba (hasta 5) y no con búsqueda', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
        recientes={['senor', 'piedra']}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    const recientes = screen.getByRole('group', { name: 'Recientes' })
    expect(recientes).toBeInTheDocument()
    const opcionesRecientes = recientes.querySelectorAll('[role="option"]')
    expect(opcionesRecientes).toHaveLength(2)
    expect(opcionesRecientes[0]).toHaveTextContent('Señor')
    expect(opcionesRecientes[1]).toHaveTextContent('Piedra')

    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'a')
    expect(screen.queryByRole('group', { name: 'Recientes' })).not.toBeInTheDocument()
  })

  it('el modo filtro pone «Todas» primero y no tiene pie aunque haya alta', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
        filtro={{ todas: { valor: 'todas', texto: 'Todas' } }}
        alta={{ texto: 'Nueva categoría', alPedir: vi.fn() }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    const lista = screen.getByRole('listbox', { name: 'Categoría' })
    const primeraOpcion = lista.querySelector('[role="option"]')
    expect(primeraOpcion).toHaveTextContent('Todas')
    expect(screen.queryByText('Nueva categoría')).not.toBeInTheDocument()
  })

  it('pie: «Nueva categoría», «Nueva categoría “posada”» y el recorte a 16 + «…»; alPedir con la búsqueda y el valor sin cambiar', async () => {
    const usuario = userEvent.setup()
    const alPedir = vi.fn()
    const alCambiar = vi.fn()
    render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        grupos={GRUPOS}
        alCambiar={alCambiar}
        sustantivo={SUSTANTIVO}
        alta={{ texto: 'Nueva categoría', alPedir }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    expect(screen.getByRole('button', { name: 'Nueva categoría' })).toBeInTheDocument()

    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'posada')
    expect(screen.getByRole('button', { name: 'Nueva categoría “posada”' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Nueva categoría “posada”' }))
    expect(alPedir).toHaveBeenCalledOnce()
    expect(alPedir).toHaveBeenCalledWith('posada')
    expect(alCambiar).not.toHaveBeenCalled()

    render(
      <SelectorConBuscador
        etiqueta="Otra"
        valor={null}
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
        alta={{ texto: 'Nueva categoría', alPedir: vi.fn() }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Otra' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'una cadena de mas de dieciseis letras')
    expect(screen.getByText('Nueva categoría “una cadena de ma…”')).toBeInTheDocument()
  })

  it('sin resultados, el pie es un botón principal', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
        alta={{ texto: 'Nueva categoría', alPedir: vi.fn() }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'posada')
    const boton = screen.getByRole('button', { name: 'Nueva categoría “posada”' })
    expect(boton).toHaveAttribute('data-variante', 'principal')
  })

  it('coincidencia exacta: «"Alojamiento" ya existe», sin botón', async () => {
    const usuario = userEvent.setup()
    render(
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={null}
        grupos={GRUPOS}
        alCambiar={vi.fn()}
        sustantivo={SUSTANTIVO}
        alta={{ texto: 'Nueva categoría', alPedir: vi.fn() }}
      />,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'Alojamiento')
    expect(screen.getByText('“Alojamiento” ya existe')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Nueva categoría/ })).not.toBeInTheDocument()
  })

  it('Esc y tocar fuera cierran; dentro de un diálogo apilado (nivel 2) no hay pie', async () => {
    const usuario = userEvent.setup()
    render(
      <>
        <div data-testid="fuera">Fuera</div>
        <SelectorConBuscador etiqueta="Categoría" valor={null} grupos={GRUPOS} alCambiar={vi.fn()} sustantivo={SUSTANTIVO} />
      </>,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveFocus()

    await usuario.click(screen.getByRole('combobox', { name: 'Categoría' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await usuario.click(screen.getByTestId('fuera'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    render(
      <ContextoNivelDialogo.Provider value={2}>
        <SelectorConBuscador
          etiqueta="Segunda"
          valor={null}
          grupos={GRUPOS}
          alCambiar={vi.fn()}
          sustantivo={SUSTANTIVO}
          alta={{ texto: 'Nueva categoría', alPedir: vi.fn() }}
        />
      </ContextoNivelDialogo.Provider>,
    )
    await usuario.click(screen.getByRole('combobox', { name: 'Segunda' }))
    expect(screen.queryByText('Nueva categoría')).not.toBeInTheDocument()
  })
})
```

Son **16 pruebas**, las del contrato §6.10. La búsqueda «una cadena de mas de dieciseis letras» tiene, a propósito, más de 16 caracteres: sus 16 primeros son «una cadena de ma» (contando el espacio), así que el pie recortado es «una cadena de ma…», no «una cadena de …» — cuidado al copiar esa cadena, es fácil contar mal a ojo.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/interfaz/comunes/SelectorConBuscador.test.tsx
```

Fallo esperado: Vitest no encuentra el módulo `./SelectorConBuscador`. La hora y la duración varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

Error: Failed to resolve import "./SelectorConBuscador" from "src/interfaz/comunes/SelectorConBuscador.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Proyectos/GA/gestion_aldeas/src/interfaz/comunes/SelectorConBuscador.test.tsx:5:77
  3  |  import { describe, expect, it, vi } from "vitest";
  4  |  import { ContextoNivelDialogo } from "./nivelDialogo";
  5  |  import { SelectorConBuscador } from "./SelectorConBuscador";
     |                                       ^

 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:06:12
   Duration  4.03s (environment 57%, setup 41%, transform 2%)
```

- [ ] **Paso 3: Implementar `SelectorConBuscador.module.css`**

Crea `src/interfaz/comunes/SelectorConBuscador.module.css` con este contenido:

```css
.raiz {
  position: relative;
  display: inline-block;
  width: 100%;
}
.campo {
  height: var(--alto-campo);
  width: 100%;
  padding: 0 16px;
  background: var(--campo);
  border: 1px solid var(--borde);
  border-radius: var(--radio-control);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.campo[aria-expanded='true'] {
  border-width: 2px;
  border-color: var(--oro);
  padding: 0 15px;
}
.panel {
  position: absolute;
  top: calc(100% + 6px);
  min-width: max(400px, 100%);
  background: var(--vitela);
  border: 1px solid var(--borde);
  border-radius: 8px;
  box-shadow: var(--sombra-flotante);
  z-index: 10;
}
.buscador {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px;
  height: 48px;
  padding: 0 10px;
  background: var(--campo);
  border: 1px solid var(--oro);
  border-radius: 6px;
}
.buscador input {
  flex: 1;
  border: none;
  background: none;
  font: inherit;
}
.contador {
  font-size: 13px;
  color: var(--tinta-suave);
  font-variant-numeric: tabular-nums;
}
.lista {
  max-height: 352px;
  overflow-y: auto;
  padding: 0 8px 6px;
}
.nombreGrupo {
  font-family: var(--fuente-marca);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--tinta-suave);
  padding: 6px 8px 2px;
}
.opcion {
  min-height: 44px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.opcion[aria-selected='true'] {
  background: var(--oro-tinte);
}
.detalle {
  font-size: 13px;
  color: var(--tinta-suave);
}
.sinResultados {
  padding: 16px;
}
.pieAlta {
  min-height: 44px;
  padding: 0 12px;
  border-top: 1px solid var(--borde);
  background: var(--papel);
  display: flex;
  align-items: center;
  gap: 8px;
}
.pieAltaBoton {
  padding: 8px;
  border-top: 1px solid var(--borde);
  background: var(--papel);
}
```

Medidas literales del contrato §6.10: campo de 48 px (`--alto-campo`) con borde de 1 px `borde` y, abierto, 2 px `oro` (mjs L1396, crítica C2, compensando el grosor extra con menos relleno horizontal para que el texto no salte); panel a 6 px bajo el campo, `min-width: max(400px, 100%)`, fondo `vitela`, borde 1 px `borde`, radio 8 y `--sombra-flotante`; buscador de 48 px con margen 8 px, fondo `campo` y borde de 1 px `oro`; lista con alto máximo 352 px (8 filas de 44 px) y desplazamiento interno; etiqueta de grupo en Cinzel 13 px, peso 600, `letter-spacing: 0.08em`; opción elegida con fondo `oro-tinte`; pie de alta con filete arriba y fondo `papel`.

- [ ] **Paso 4: Implementar `SelectorConBuscador.tsx`**

Crea `src/interfaz/comunes/SelectorConBuscador.tsx` con este contenido:

```tsx
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { buscarEn } from '../../dominio/texto/buscar'
import { mismoNombre } from '../../dominio/texto/normalizar'
import { Icono } from '../iconos/Icono'
import { Boton, Enlace } from './Boton'
import { useNivelDialogo } from './nivelDialogo'
import estilos from './SelectorConBuscador.module.css'

export interface OpcionSelector<V extends string> {
  valor: V
  texto: string
  detalle?: string
  tuya?: boolean
}

export interface GrupoSelector<V extends string> {
  nombre?: string
  opciones: readonly OpcionSelector<V>[]
}

export interface AltaSelector {
  texto: string
  alPedir: (busqueda: string) => void
}

export interface PropsSelectorConBuscador<V extends string> {
  etiqueta: string
  etiquetaOculta?: boolean
  valor: V | null
  textoSinValor?: string
  grupos: readonly GrupoSelector<V>[]
  alCambiar: (valor: V) => void
  sustantivo: { singular: string; plural: string }
  recientes?: readonly V[]
  filtro?: { todas: OpcionSelector<V> }
  alta?: AltaSelector
  alinear?: 'izquierda' | 'derecha'
  ayuda?: string
  error?: string | null
  desactivado?: boolean
}

/** Recorta una búsqueda a 16 caracteres, con «…» si sobra (espec. L933). */
function recortar(busqueda: string): string {
  return busqueda.length > 16 ? `${busqueda.slice(0, 16)}…` : busqueda
}

/** El texto con la coincidencia de la búsqueda resaltada en `<strong>` (mjs L1389-1391). */
function resaltar(texto: string, busqueda: string): ReactNode {
  const coincidencia = busqueda ? buscarEn(texto, busqueda) : null
  if (!coincidencia) {
    return texto
  }
  return (
    <>
      {texto.slice(0, coincidencia.inicio)}
      <strong>{texto.slice(coincidencia.inicio, coincidencia.fin)}</strong>
      {texto.slice(coincidencia.fin)}
    </>
  )
}

/** Si la opción coincide con la búsqueda, en su texto o en su detalle (espec. L862). */
function coincideOpcion<V extends string>(opcion: OpcionSelector<V>, busqueda: string): boolean {
  if (!busqueda) {
    return true
  }
  if (buscarEn(opcion.texto, busqueda)) {
    return true
  }
  return opcion.detalle ? buscarEn(opcion.detalle, busqueda) !== null : false
}

/** Una fila de la lista: `role="option"`, con su resaltado, su detalle y el `check` de la elegida (§6.10). */
function Fila<V extends string>(props: {
  opcion: OpcionSelector<V>
  elegida: boolean
  busqueda: string
  onElegir: (valor: V) => void
}) {
  return (
    <div
      role="option"
      aria-selected={props.elegida}
      data-valor={props.opcion.valor}
      onClick={() => props.onElegir(props.opcion.valor)}
      className={estilos.opcion}
    >
      <span>{resaltar(props.opcion.texto, props.busqueda)}</span>
      {props.opcion.detalle ? (
        <span className={estilos.detalle}>{resaltar(props.opcion.detalle, props.busqueda)}</span>
      ) : null}
      {props.opcion.tuya ? <span className={estilos.detalle}>tuya</span> : null}
      {props.elegida ? <Icono nombre="check" tamano={16} color="var(--oro-oscuro)" /> : null}
    </div>
  )
}

/**
 * SelectorConBuscador de §6.10: un combobox con buscador, grupos, «Recientes», modo filtro y pie de alta.
 * Con más de 12 opciones el buscador recibe el foco al abrir (espec. L860).
 */
export function SelectorConBuscador<V extends string>(props: PropsSelectorConBuscador<V>) {
  const [abierto, establecerAbierto] = useState(false)
  const [busqueda, establecerBusqueda] = useState('')
  const nivel = useNivelDialogo()
  const idEtiqueta = useId()
  const idLista = useId()
  const referenciaRaiz = useRef<HTMLDivElement>(null)
  const referenciaCampo = useRef<HTMLButtonElement>(null)
  const referenciaBuscador = useRef<HTMLInputElement>(null)

  const todasLasOpciones = useMemo(() => props.grupos.flatMap((grupo) => grupo.opciones), [props.grupos])
  const opcionElegida =
    props.valor === null ? null : (todasLasOpciones.find((opcion) => opcion.valor === props.valor) ?? null)

  function cerrar(devolverFoco: boolean) {
    establecerAbierto(false)
    establecerBusqueda('')
    if (devolverFoco) {
      referenciaCampo.current?.focus()
    }
  }

  function elegir(valor: V) {
    props.alCambiar(valor)
    cerrar(false)
  }

  // Con más de 12 opciones (sin repetir las de Recientes), el buscador recibe el foco al abrir.
  useEffect(() => {
    if (!abierto) {
      return
    }
    const total = todasLasOpciones.length + (props.filtro ? 1 : 0)
    if (total > 12) {
      referenciaBuscador.current?.focus()
    }
    // Solo al abrir: el resto de cambios de esta pasada no repiten el foco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  // Esc y tocar fuera cierran sin cambiar nada, y devuelven el foco al campo.
  useEffect(() => {
    if (!abierto) {
      return
    }
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        cerrar(true)
      }
    }
    function alPulsarFuera(evento: PointerEvent) {
      if (referenciaRaiz.current && !referenciaRaiz.current.contains(evento.target as Node)) {
        cerrar(true)
      }
    }
    document.addEventListener('keydown', alTeclear)
    document.addEventListener('pointerdown', alPulsarFuera)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.removeEventListener('pointerdown', alPulsarFuera)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const grupoRecientes: readonly OpcionSelector<V>[] =
    !busqueda && props.recientes && props.recientes.length > 0
      ? (props.recientes
          .slice(0, 5)
          .map((valor) => todasLasOpciones.find((opcion) => opcion.valor === valor))
          .filter((opcion): opcion is OpcionSelector<V> => opcion !== undefined) as readonly OpcionSelector<V>[])
      : []

  const gruposFiltrados = props.grupos
    .map((grupo) => ({
      nombre: grupo.nombre,
      opciones: grupo.opciones.filter((opcion) => coincideOpcion(opcion, busqueda)),
    }))
    .filter((grupo) => grupo.opciones.length > 0)

  const opcionesFiltradas = gruposFiltrados.flatMap((grupo) => grupo.opciones)
  const sinResultados = busqueda !== '' && opcionesFiltradas.length === 0

  const textoContador = busqueda
    ? `${opcionesFiltradas.length} de ${todasLasOpciones.length}`
    : todasLasOpciones.length === 1
      ? `1 ${props.sustantivo.singular}`
      : `${todasLasOpciones.length} ${props.sustantivo.plural}`

  const mostrarPieAlta = !!props.alta && !props.filtro && nivel < 2
  const coincidenciaExacta = busqueda ? todasLasOpciones.find((opcion) => mismoNombre(opcion.texto, busqueda)) : undefined

  function alPulsarAlta() {
    if (!props.alta) {
      return
    }
    const busquedaActual = busqueda
    cerrar(false)
    props.alta.alPedir(busquedaActual)
  }

  return (
    <div ref={referenciaRaiz} className={estilos.raiz}>
      <span
        id={idEtiqueta}
        style={props.etiquetaOculta ? { position: 'absolute', width: 1, height: 1, overflow: 'hidden' } : undefined}
      >
        {props.etiqueta}
      </span>
      <button
        ref={referenciaCampo}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        aria-labelledby={idEtiqueta}
        disabled={props.desactivado}
        onClick={() => (abierto ? cerrar(false) : establecerAbierto(true))}
        className={estilos.campo}
      >
        <span>{opcionElegida ? opcionElegida.texto : (props.textoSinValor ?? '')}</span>
        <Icono nombre="abajo" tamano={18} color="var(--tinta-suave)" />
      </button>
      {abierto ? (
        <div className={estilos.panel} style={{ [props.alinear === 'derecha' ? 'right' : 'left']: 0 }}>
          <div className={estilos.buscador}>
            <Icono nombre="buscar" tamano={18} />
            <input
              ref={referenciaBuscador}
              type="search"
              aria-label="Buscar"
              placeholder="Buscar"
              value={busqueda}
              onChange={(evento) => establecerBusqueda(evento.target.value)}
            />
            <span className={estilos.contador}>{textoContador}</span>
            {busqueda ? (
              <button type="button" aria-label="Borrar la búsqueda" onClick={() => establecerBusqueda('')}>
                <Icono nombre="x" tamano={16} />
              </button>
            ) : null}
          </div>
          <div role="listbox" id={idLista} aria-label={props.etiqueta} className={estilos.lista}>
            {props.filtro ? (
              <Fila
                opcion={props.filtro.todas}
                elegida={props.valor === props.filtro.todas.valor}
                busqueda=""
                onElegir={elegir}
              />
            ) : null}
            {!props.filtro && grupoRecientes.length > 0 ? (
              <div role="group" aria-label="Recientes">
                <div className={estilos.nombreGrupo}>Recientes</div>
                {grupoRecientes.map((opcion) => (
                  <Fila
                    key={opcion.valor}
                    opcion={opcion}
                    elegida={opcion.valor === props.valor}
                    busqueda={busqueda}
                    onElegir={elegir}
                  />
                ))}
              </div>
            ) : null}
            {gruposFiltrados.map((grupo, indice) =>
              grupo.nombre ? (
                <div key={grupo.nombre} role="group" aria-label={grupo.nombre}>
                  <div className={estilos.nombreGrupo}>{grupo.nombre}</div>
                  {grupo.opciones.map((opcion) => (
                    <Fila
                      key={opcion.valor}
                      opcion={opcion}
                      elegida={opcion.valor === props.valor}
                      busqueda={busqueda}
                      onElegir={elegir}
                    />
                  ))}
                </div>
              ) : (
                <div key={indice}>
                  {grupo.opciones.map((opcion) => (
                    <Fila
                      key={opcion.valor}
                      opcion={opcion}
                      elegida={opcion.valor === props.valor}
                      busqueda={busqueda}
                      onElegir={elegir}
                    />
                  ))}
                </div>
              ),
            )}
          </div>
          {sinResultados ? (
            <div className={estilos.sinResultados}>
              <p>Nada coincide con &ldquo;{busqueda}&rdquo;</p>
              <p>Busca en todas las categorías y grupos.</p>
            </div>
          ) : null}
          {mostrarPieAlta ? (
            coincidenciaExacta ? (
              <div className={estilos.pieAlta}>
                <Icono nombre="mas" tamano={16} />
                <span>&ldquo;{coincidenciaExacta.texto}&rdquo; ya existe</span>
              </div>
            ) : opcionesFiltradas.length > 0 ? (
              <div className={estilos.pieAlta}>
                <Enlace alPulsar={alPulsarAlta} icono="mas">
                  {busqueda ? `${props.alta!.texto} “${recortar(busqueda)}”` : props.alta!.texto}
                </Enlace>
              </div>
            ) : (
              <div className={estilos.pieAltaBoton}>
                <Boton variante="principal" icono="mas" ancho="100%" alPulsar={alPulsarAlta}>
                  {`${props.alta!.texto} “${recortar(busqueda)}”`}
                </Boton>
              </div>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
```

Puntos que resuelven algo que el contrato deja abierto, de la forma más simple que cumple la especificación:

1. **`aria-selected` en la opción y `check` a la derecha**, no una marca de posición: es literal del contrato («la elegida lleva fondo `oro-tinte` y `check` de 16 px en `oro-oscuro`»), y el color del icono se pasa como `color="var(--oro-oscuro)"` directamente a `Icono`, sin una clase nueva.
2. **Cerrar con Esc o clic fuera usa dos listeners en `document`**, no uno solo en la raíz del selector: un `onKeyDown` en la raíz no vería Esc si el foco está en el buscador pero el evento se detiene antes de llegar arriba (no pasa aquí, pero es más robusto), y «tocar fuera» necesita mirar el documento entero, no solo dentro del propio componente. Los dos efectos llevan `// eslint-disable-next-line react-hooks/exhaustive-deps`: **a propósito**, solo quieren repetirse cuando `abierto` cambia, no en cada tecla que se escribe en el buscador (que cambiaría `cerrar`, una función nueva cada render).
3. **El pie de alta no memoriza `props.alta!.texto`** con el operador `!` porque `mostrarPieAlta` ya garantiza `props.alta` presente (es la condición `!!props.alta && …`); TypeScript no lo deduce solo dentro del JSX condicional, así que el `!` es la forma más simple de decírselo sin reestructurar el árbol de condiciones.
4. **El listbox vive entero dentro de `{abierto ? … : null}`**: al cerrar, todo el panel (buscador, lista, pie) se desmonta, así que la búsqueda vuelve a estar vacía la próxima vez que se abre sin necesidad de un efecto aparte; `cerrar()` ya pone `establecerBusqueda('')` para que el `input` no arrastre el valor mientras dura la animación de cierre del navegador (aunque esta versión no anima nada, es la forma más simple de dejarlo listo si una fase futura añade una transición).

- [ ] **Paso 5: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/interfaz/comunes/SelectorConBuscador.test.tsx
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  22:06:24
   Duration  5.34s (tests 52%, environment 26%, setup 11%, transform 7%, import 4%)
```

- [ ] **Paso 6: Comprobar los tipos, el lint, el build y todas las pruebas**

```bash
npx tsc -b
npm run lint
npm test
npm run build
```

`npx tsc -b` no escribe nada. `npm run lint` termina sin avisos (confirma que los dos `eslint-disable-next-line` del paso 4 son los únicos necesarios; si oxlint se queja de alguno más, es que algo del cuerpo del efecto usa una variable de fuera que no está en la lista de exclusión y hay que revisar el efecto, no silenciar el aviso a ciegas). `npm run build` compila sin avisos: esta tarea es la última del bloque de `comunes/` de este plan y no debería dejar nada roto para el resto de la fase. Esta tarea suma **+16 pruebas y +1 archivo** sobre lo que dejó la tarea 19: es, con diferencia, la que más suma de las cinco de este bloque. Con las tareas 1 a 19 ya aplicadas, `npm test` debería terminar en **1.047 pruebas en 105 archivos**:

```text
 Test Files  105 passed (105)
      Tests  1047 passed (1047)
```

Si el número que ves no es ese, sigue con **el tuyo**: lo que esta tarea garantiza es +16 pruebas y +1 archivo sobre lo que dejó la tarea 19.

- [ ] **Paso 7: Commit**

```bash
git add src/interfaz/comunes/SelectorConBuscador.tsx src/interfaz/comunes/SelectorConBuscador.module.css src/interfaz/comunes/SelectorConBuscador.test.tsx
git commit -m "feat(interfaz): SelectorConBuscador, con grupos, recientes, modo filtro y pie de alta" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-6a 5e6f7a8] feat(interfaz): SelectorConBuscador, con grupos, recientes, modo filtro y pie de alta
 3 files changed, 410 insertions(+)
 create mode 100644 src/interfaz/comunes/SelectorConBuscador.module.css
 create mode 100644 src/interfaz/comunes/SelectorConBuscador.test.tsx
 create mode 100644 src/interfaz/comunes/SelectorConBuscador.tsx
```

`git status --short` no muestra nada. Con este commit, el bloque de tareas 16 a 20 queda cerrado: `Aviso`, `Segmentos`, `Dialogo`/`DialogoMensaje`, `ConfirmacionEliminar` (J2d) y `SelectorConBuscador` listos para que la tarea 21 (`CampoImporte`, `FilaImporte` y `ResumenOro`, que depende de esta) y las siguientes los usen.

---
