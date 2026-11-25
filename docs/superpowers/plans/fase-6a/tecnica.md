# Fase 6a · Tecnología de `src/interfaz`

Informe de investigación técnica para la fase 6a (marco PWA, sistema visual, componentes comunes y pantallas P0, P1, P1b y P6). No se ha modificado nada en `C:/Proyectos/GA/gestion_aldeas`: solo lectura del repositorio (`package.json`, `vite.config.ts`, `tsconfig*.json`, `.oxlintrc.json`, `docs/`, `design/artboards/*.dc.html`, `src/`) y `npm view`/documentación (Context7, web) sin instalar nada.

## 0. Punto de partida real del repositorio

- **`package.json`** (leído en el repo): `react` `^19.2.8`, `react-dom` `^19.2.8`, `vite` `^8.3.0`, `@vitejs/plugin-react` `^6.1.1`, `vitest` `^5.0.1`, `typescript` `~6.0.2`, `oxlint` `^1.81.0`, `dexie` `^4.4.6`, `zod` `~4.6.5`. Instalado realmente (`node_modules`): React `19.3.0`, Vite `8.3.0`. Node `24.18.1`.
- **`vite.config.ts`**: un único `test.environment: 'node'` con `include: ['src/**/*.test.ts']` — hoy todo corre en Node porque solo existen `src/dominio` y `src/datos`, comentado explícitamente como «El dominio es TypeScript puro […] sin navegador». Este archivo hay que tocarlo en la 6a para no romper esas pruebas.
- **`tsconfig.app.json`**: `jsx: "react-jsx"` (runtime automático, no hace falta `import React`), `moduleResolution: "bundler"`, `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`, `strict` + `noUnusedLocals/Parameters`. Cualquier código de `src/interfaz` cae bajo `include: ["src"]`, así que no hace falta un tsconfig nuevo.
- **`.oxlintrc.json`**: `plugins: ["react", "typescript", "oxc"]`, con `react/rules-of-hooks` en error. No incluye `jsx-a11y` (ver §7).
- `src/main.tsx` y `src/App.tsx` son todavía el scaffold por defecto de Vite (`<h1>Gestión de Aldeas</h1>`): son los archivos que la 6a sustituye por el marco real.
- No hay carpeta `public/` ni ningún `.png`/`.svg`/`.ico` en el repo: los iconos de la PWA no existen todavía (ver duda D-T5).
- El repositorio de partidas y las copias que P0/P1/P1b/P6 van a usar ya existen: `src/datos/repositorio.ts` (`listarPartidas`, `ultimaPartidaUsada`, `crearPartida`, `abrirPartida`, `leerPartida`, `guardarPartida`, `borrarPartida`) y `src/datos/copia/exportar.ts` (`exportarCopia`) + `src/datos/copia/importar.ts` (`examinarDestino`, `importarCopia`, tipos `ModoImportacion = 'nueva' | 'reemplazar' | 'comoCopia'`). La interfaz de la 6a es capa fina sobre esto, no reimplementa nada.

## 1. vite-plugin-pwa

- **Versión**: `1.3.0` (`npm view vite-plugin-pwa dist-tags` → `latest: 1.3.0`; también `1.0.3`, `1.1.0`, `1.2.0`). Sus `peerDependencies` declaran `"vite": "^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0"` — **compatible explícitamente con Vite 8**, que es lo que ya trae el proyecto. `workbox-build` y `workbox-window` (`^7.4.1`) van como `dependencies` normales del plugin además de como peer, así que `npm install -D vite-plugin-pwa` basta; no hace falta instalarlos aparte.
- **Estrategia**: `generateSW` (por defecto) genera el service worker con Workbox a partir de `workbox.globPatterns`; es la opción «zero-config» y encaja con «lo más simple que cumpla las reglas» (CLAUDE.md). `injectManifest` (SW propio) solo aporta algo si se necesita una estrategia de caché a medida — la app no tiene llamadas de red propias (todo vive en IndexedDB), así que no hay nada que cachear en runtime aparte del *app shell*. Recomiendo `generateSW`.
- **Registro**: `registerType: 'autoUpdate'` recarga sola cuando hay una versión nueva del SW; `'prompt'` exige una UI de aviso (`useRegisterSW` de `virtual:pwa-register/react`, con estado `needRefresh`/`offlineReady`) que no está en la lista de componentes de la 6a (§10 y la lista de componentes comunes de la hoja de ruta no incluyen ese aviso). Ver duda D-T1.
- **Manifiesto**: se declara en las opciones del plugin (`manifest: { name, short_name, description, theme_color, background_color, display, orientation, icons }`), y el plugin inyecta `<link rel="manifest">` en `index.html` solo. La especificación ya fija dos campos del manifiesto:
  - `orientation: 'landscape'` — «Orientación horizontal bloqueada» y «Tamaño mínimo 1024×700» (spec §6.4, línea 826, dentro de «Pantalla y teclado»).
  - Colores de `theme_color`/`background_color` con la paleta «pergamino legible» (§10, líneas 1381-1392): `papel` `#F2E8D0` como fondo, `oro-oscuro` `#7A5B1F` como color de tema (es el del botón principal, con contraste ≥4.5:1 ya validado en el propio documento).
- **Iconos**: el manifiesto exige como mínimo 192×192 y 512×512 (`vite-plugin-pwa`, ejemplo de manifiesto mínimo); ninguno existe en el repo. Ver duda D-T5.
- **Sin conexión de verdad**: `devOptions.enabled: true` permite probar el SW en `npm run dev`, pero el service worker con precaché real solo se genera en `vite build`; la comprobación «funcionando sin conexión en Chrome para Android» del entregable se hace sobre `npm run build && npm run preview` (o el artefacto servido), no sobre el dev server. Esto no es una `<dialog>` de pruebas automáticas: ni jsdom ni happy-dom registran un service worker real, así que la verificación de «offline» es manual (DevTools → Application → Service Workers → Offline, y en la tablet Android real), no una prueba de Vitest.
- **Pruebas**: `vite-plugin-pwa` no trae un arnés de test unitario propio — lo que se prueba con Testing Library son los componentes React (por ejemplo, el futuro aviso de actualización de la 6b), no el service worker en sí.

## 2. Fuentes empaquetadas (sin Google Fonts)

Los `design/artboards/*.dc.html` (comprobado en `Main.dc.html`, `NuevaPartida.dc.html`, `Ajustes.dc.html`, `Calendario.dc.html`) cargan hoy:

```
fonts.googleapis.com/css2?family=Cinzel:wght@600
  &family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500
  &family=Source+Sans+3:wght@400;600;700
```

y los `font-family` en línea son `'Cormorant Garamond', Georgia, 'Times New Roman', serif`, `'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif` y `Cinzel, 'Trajan Pro', Georgia, serif`. Eso fija exactamente qué variantes hay que empaquetar (spec §10, línea 1394: «títulos en Cormorant Garamond (600); interfaz y cifras en Source Sans 3 […]; Cinzel en el nombre de la app y de la partida y en etiquetas de grupo»):

- **Paquete**: [Fontsource](https://fontsource.org) — confirmado con `npm view`: `@fontsource/cinzel`, `@fontsource/cormorant-garamond` y `@fontsource/source-sans-3`, los tres en `5.3.0`, licencia `OFL-1.1` (SIL Open Font License: permite empaquetar y redistribuir con la app, sin royalties; solo prohíbe vender la fuente suelta). Fontsource es la vía estándar para meter fuentes de Google Fonts como paquete npm servido localmente (justo «sin depender de Google Fonts»); no hay que tocar ninguna licencia especial para uso comercial o personal.
- **Import exacto** (confirmado en la documentación de Fontsource: cada corte de peso/estilo es un archivo CSS propio, `@fontsource/<fuente>/<peso>.css` y `@fontsource/<fuente>/<peso>-italic.css`; el CSS normal **no** incluye la cursiva):

  ```ts
  import '@fontsource/cinzel/600.css'
  import '@fontsource/cormorant-garamond/500.css'
  import '@fontsource/cormorant-garamond/600.css'
  import '@fontsource/cormorant-garamond/700.css'
  import '@fontsource/cormorant-garamond/500-italic.css' // Edad en cursiva, J6 "nuevo", etc. si se usa
  import '@fontsource/source-sans-3/400.css'
  import '@fontsource/source-sans-3/600.css'
  import '@fontsource/source-sans-3/700.css'
  ```

  Esto va en un único módulo (p. ej. `src/interfaz/estilos/fuentes.ts`) importado una vez desde `main.tsx`, y Vite copia los `.woff2` a `dist/assets` automáticamente (son imports CSS normales, no hace falta configurar nada en `vite.config.ts`).
- Existe también `@fontsource-variable/cormorant-garamond` y `@fontsource-variable/source-sans-3` (fuentes variables, un solo archivo con todo el rango de peso): más ligero en número de peticiones, pero el archivo variable pesa más que la suma de 3-4 cortes estáticos sueltos cuando solo se usan pesos concretos como aquí. Con solo 3-4 pesos fijos por familia, los cortes estáticos (`@fontsource/…`) son la opción más simple y la que menos bytes manda para exactamente lo que piden los artboards.

## 3. Pruebas de interfaz: Vitest 5 + Testing Library

- **Problema a resolver**: el dominio (`src/dominio`) y los datos (`src/datos`) ya corren sus pruebas en `environment: 'node'` (comprobado: todos sus `*.test.ts` importan `describe/it/expect` de `'vitest'`, sin `globals: true`). La interfaz necesita DOM. Vitest 5 resolvió esto con `test.projects` (antes `test.workspace`, y antes de eso `environmentMatchGlobs`; la documentación de Vitest muestra literalmente la migración `workspace` → `projects` como el estado actual). `environmentMatchGlobs` sigue funcionando pero es la vía antigua; con Vitest 5 ya instalado (`^5.0.1`), `projects` dentro del mismo `vitest.config.ts`/`vite.config.ts` es la forma recomendada y evita un archivo de workspace aparte:

  ```ts
  // vite.config.ts
  export default defineConfig({
    plugins: [react()],
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'dominio-datos',
            environment: 'node',
            include: ['src/dominio/**/*.test.ts', 'src/datos/**/*.test.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'interfaz',
            environment: 'happy-dom',
            include: ['src/interfaz/**/*.test.{ts,tsx}'],
            setupFiles: ['./src/interfaz/pruebas/configurar.ts'],
          },
        },
      ],
    },
  })
  ```

  (`extends: true` hereda `plugins: [react()]` en ambos proyectos; los `include` de cada proyecto sustituyen al `include` único que hay hoy en la raíz.)
- **jsdom vs happy-dom**: ambos son *peerDependencies* opcionales de Vitest (hay que instalar el que se use como `devDependency`; `npm view` da `happy-dom@20.14.5` y `jsdom@30.1.0`, ambos vigentes). La 6a pide diálogos accesibles con `<dialog>` (J2d, diálogo estándar, diálogo apilado…). Comprobado por búsqueda: **ni jsdom ni happy-dom implementan `HTMLDialogElement` de forma completa**. jsdom tiene abierto desde 2021 el issue de implementar `<dialog>` (`jsdom/jsdom#3294`) sin resolución confirmada — en versiones antiguas `showModal`/`close` ni siquiera existían como métodos. happy-dom sí define `showModal()`/`close()`, pero solo conmuta el atributo `open`, sin capa superior (*top layer*) ni foco atrapado real. Por eso recomiendo **happy-dom** (más rápido, mantenido activamente, y al menos no revienta con «`showModal is not a function`») **más un pequeño *shim* en el `setupFiles`** que sea explícito sobre lo que se simula, en vez de depender de la implementación parcial:

  ```ts
  // src/interfaz/pruebas/configurar.ts
  import '@testing-library/jest-dom/vitest'
  import { afterEach } from 'vitest'
  import { cleanup } from '@testing-library/react'

  afterEach(() => cleanup())

  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
  ```

  Con esto las pruebas de componentes pueden comprobar que el diálogo se abre/cierra (atributo `open`, foco inicial, `aria-*`) sin depender de si el motor de pruebas ya trae o no `showModal`. La comprobación real de accesibilidad nativa (`::backdrop`, bloqueo del resto de la página) queda para pruebas manuales en Chrome — otra vez, no automatizable en jsdom/happy-dom.
- **Paquetes y versiones exactas** (`npm view`, sin instalar nada):
  - `@testing-library/react` → `16.3.3`; `peerDependencies`: `react`/`react-dom` `^18 || ^19`, `@testing-library/dom` `^10.0.0` — compatible con React `19.2.8`/`19.3.0` instalado.
  - `@testing-library/user-event` → `14.6.7`; peer `@testing-library/dom >= 7.21.4`.
  - `@testing-library/jest-dom` → `7.0.1`; peer `vitest >= 0.32` y `@testing-library/dom >=10 <11`. El *entry point* correcto para Vitest (confirmado en la documentación oficial de Testing Library) es el *subpath* `@testing-library/jest-dom/vitest`, que ya llama a `expect.extend(...)` con los matchers (`toBeVisible`, `toHaveAccessibleName`, etc.) sin duplicar el `expect` global — no hace falta `globals: true` (y no conviene activarlo, porque rompería el estilo actual de imports explícitos en `src/dominio`/`src/datos`).
  - `happy-dom` → `20.14.5` (alternativa: `jsdom` → `30.1.0`).
- **Patrón de prueba de componente** (con `user-event`, que es lo que pide la tarea en vez de `fireEvent` a pelo):

  ```tsx
  import { describe, expect, it } from 'vitest'
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { Boton } from './Boton'

  describe('Boton', () => {
    it('llama a onClick al tocarlo', async () => {
      const usuario = userEvent.setup()
      const alClic = vi.fn()
      render(<Boton onClick={alClic}>Guardar</Boton>)
      await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(alClic).toHaveBeenCalledOnce()
    })
  })
  ```
- **Comando**: con `projects`, `npm test` (`vitest run`) ejecuta los dos proyectos a la vez; para lanzar solo uno, `vitest run --project interfaz` (documentado: `--project` filtra por nombre, con comodines y negación).

## 4. React 19: formularios, `useId`, diálogos accesibles

- **`useId`**: React 19 lo sigue recomendando como la forma correcta de enlazar `<label htmlFor>`/`aria-describedby` con un id único y estable entre servidor y cliente (aquí no hay SSR, pero también evita colisiones cuando el mismo componente de formulario se repite, como el «campo de importe» o el «selector con buscador» en varias filas de un formulario). Cada componente común con etiqueta (campo de importe, selector, campo de fecha, campo de frecuencia) debe generar su propio id con `useId()` en vez de un id fijo en el JSX, precisamente porque §6.4/§6.5 los reutiliza muchas veces por pantalla (una fila de «Producción» por producto, filas repetibles, etc.).
- **Diálogo y diálogo apilado con `<dialog>`**: React 19 no añade una API especial para `<dialog>` (sigue siendo el elemento HTML nativo); el patrón es un componente que envuelve una ref a `<dialog>` y llama a `showModal()`/`close()` en un `useEffect` según una prop `abierto`, además de escuchar el evento nativo `cancel` (tecla Esc) y `close`. Esto encaja con la regla de la especificación «Cancelar el de arriba vuelve al anterior con sus datos» (§5, línea 220) y con el límite de dos diálogos visibles a la vez (línea 219): el segundo diálogo apilado es un segundo `<dialog>` con su propio `showModal()`, montado mientras el primero permanece en el DOM (con su velo atenuado al 35 %, línea 219) en vez de reemplazarlo — es decir, hace falta una pila (array) de diálogos abiertos, no un único booleano.
- **Formularios**: la especificación no habla de nada que necesite el actions/`useActionState` de React 19 (no hay servidor: todo es una llamada async local al repositorio de `src/datos`). Lo más simple es seguir con `onSubmit` normal + estado local (`useState`/`useReducer`) para validación por campo (mensaje en lacre bajo el campo, botón principal desactivado con errores — §6.4, «Validación», línea 814); `useActionState`/`<form action={fn}>` no aportan nada aquí porque no hay *progressive enhancement* de servidor que ganar, y complicarían el guardado optimista con IndexedDB. Si en fases posteriores aparecen envíos con estados de «guardando…» explícitos, `useActionState` sigue disponible sin tener que cambiar de librería.
- No hace falta ninguna librería de formularios (`react-hook-form`, etc.): los formularios son de tamaño moderado, con reglas de validación ya descritas campo a campo en la especificación, y el proyecto ya usa `zod` como dependencia — validar con los mismos *schemas* de `zod` que use `src/dominio` (si los hay) o con validadores puros de `src/dominio/validacion` es más consistente con «TypeScript estricto, dominio puro» de CLAUDE.md que añadir una dependencia de formularios nueva.

## 5. Enrutado

**Decisión: no hace falta ninguna biblioteca de enrutado en la 6a; basta con estado de React.** Motivos, todos verificables en la propia especificación:

- La navegación (§5, líneas 184-241) se describe entera como «menú lateral fijo» + «contenido» + diálogos superpuestos; no hay ni una sola mención a URLs, historial del navegador, enlaces profundos o «atrás» en las 1477 líneas de la especificación ni en las 3778 del plan de implementación (comprobado con `grep -inE "url|histor|router|enrutad"` sobre ambos documentos: los únicos resultados son del calendario prolético hacia atrás, «historial de intentos/caravanas/beneficios» como paneles de datos, y «no se aplican hacia atrás» como regla de negocio — nada de navegación).
- Los diálogos son, como mucho, dos a la vez y en pila (§5, línea 218-222): eso es exactamente el modelo de una pila en memoria (`Diálogo[]`), no un conjunto de rutas.
- Solo un dominio del menú tiene el submenú desplegado a la vez (línea 208) y «al entrar en una pantalla con pestañas se abre la primera» (línea 214): otra vez, estado de UI puro, no rutas.
- El alcance de la 6a es solo P0 (selector de partidas, sin partida abierta) y, dentro de una partida, P1/P1b (alta) y P6 (ajustes); ni siquiera llega a P2 (Inicio) ni al menú lateral con dominios. Con tan pocas pantallas, un enrutador añade una dependencia y una capa de configuración (rutas, `loader`s si se usara el modo *data router* de React Router) que no resuelve ningún requisito real de la 6a.

Propuesta técnica: un estado de nivel superior en `App.tsx` con una forma parecida a

```ts
type EstadoApp =
  | { vista: 'selector' }                                   // P0
  | { vista: 'nuevaPartida'; paso: 1 | 2; datosPaso1?: /* … */ } // P1 → P1b
  | { vista: 'partida'; partidaId: Id; pantalla: 'ajustes' /* … en 6b: 'inicio' | 'calendario' | dominio */ }
```

más una pila de diálogos (`DialogoAbierto[]`, máximo 2, con lo que ya exige §5). Esto es fácil de sustituir después por `react-router` si en fase 7/8/9 apareciera un requisito real de URL (por ejemplo, si se quisiera compartir un enlace a una pantalla concreta), sin haber pagado el coste de la dependencia mientras tanto — es la lectura literal de «lo más fácil de cambiar después» del criterio de decisión de `CLAUDE.md`.

Dato de contexto, por si se decide lo contrario más adelante: `react-router` unificó `react-router-dom` desde la v7 (paquete único, sin distinguir DOM); hoy (`npm view`) `react-router` está en `8.4.0` (`latest`) y `react-router-dom` quedó congelado en `7.18.4` como paquete de compatibilidad. Si alguna vez hiciera falta, sería `react-router` (no `react-router-dom`), con peer `react`/`react-dom` `>=18`.

## 6. Estructura de archivos propuesta para `src/interfaz`

Coherente con «dominio puro en `src/dominio`… IndexedDB… en `src/datos`… Interfaz en `src/interfaz`» (CLAUDE.md) y con la práctica ya usada en el repo de poner cada prueba junto a su archivo (`*.test.ts`, aquí `*.test.tsx` para componentes):

```
src/interfaz/
  estilos/
    variables.css          # tokens del §10 como custom properties (--color-papel, --color-tinta, tamaños, radios…)
    fuentes.ts              # los imports de @fontsource/* del §2
    global.css               # reset mínimo, tipografía base, tamaño mínimo 1024×700
  pwa/
    registrarSW.ts          # registerSW() de virtual:pwa-register (o el hook React en 6b si hace falta UI)
  comunes/                   # componentes de la §6.4/§6.5, uno por carpeta con su prueba y su CSS module
    Boton/
      Boton.tsx
      Boton.test.tsx
      Boton.module.css
    Panel/…
    Tabla/…
    CampoImporte/…
    SelectorConBuscador/…    # §6.5: buscador, agrupado, "recientes", pie con alta (patrón 1 de §6.6)
    Segmentos/…
    Dialogo/…                # <dialog> de base + variante "apilado" (segundo velo al 35 %)
    ConfirmacionEliminar/…   # J2d: doble confirmación
    Aviso/…                  # aviso rojo/ámbar/oro con icono + texto (nunca solo color)
    CampoFecha/…              # selector de fecha n.º 3 de §6.5
    CampoFrecuencia/…         # campo compuesto n.º 13 de §6.5
  marco/
    BarraSuperior/…           # sin aviso ni "Avanzar días" todavía (eso es 6b)
    MenuLateral/…             # §5: filas de 44 px, un dominio desplegado a la vez
    MarcoPartida.tsx          # compone BarraSuperior + MenuLateral + contenido
  pantallas/
    SelectorPartidas/         # P0
    NuevaPartida/              # P1
    NuevaPartidaPersonaje/     # P1b
    Ajustes/                   # P6 (equivalencias y ración en solo lectura, panel "Listas y catálogos", exportar/importar, cambiar/borrar partida)
  estado/
    AppEstado.tsx              # el estado de nivel superior del §5 (contexto o prop drilling simple; con 4 pantallas de la 6a no hace falta Redux/Zustand)
    pilaDialogos.ts            # utilidades para la pila de diálogos apilados
  pruebas/
    configurar.ts              # setupFiles de Vitest (jest-dom + cleanup + shim de <dialog>, §3)
    render.tsx                  # opcional: un render() propio que envuelve providers comunes si aparecen
  App.tsx                      # sustituye al App.tsx actual
  main.tsx                     # sustituye al main.tsx actual (monta App + registrarSW + fuentes)
```

Notas sobre esta estructura:
- CSS Modules (`*.module.css`) porque Vite los soporta de fábrica sin dependencias nuevas y encajan con «variables CSS» del propio encargo; una alternativa sería `styled-components`/`vanilla-extract`, pero añaden una dependencia sin que la especificación pida nada dinámico que CSS Modules no resuelva (los únicos "temas" son los tokens fijos del §10; no hay modo oscuro — línea 1424: «Modo oscuro» está explícitamente fuera de alcance).
- Cada componente común lleva su prueba al lado (`Nombre.test.tsx`), igual que el dominio; las pantallas P0/P1/P1b/P6 llevan la suya con Testing Library + `user-event`, montando el componente con datos de la partida de ejemplo (`src/dominio/ejemplo/sombraDelEste.ts`) y una base de datos de pruebas (patrón ya existente en `src/datos/pruebas/baseDePrueba.ts`, visto en `src/datos/*.test.ts`).

## 7. Otras dos piezas de tecnología, menores

- **`oxlint`**: la versión instalada (`^1.81.0`) y la última (`1.83.0`) soportan el plugin `jsx-a11y` (confirmado: `node_modules/oxlint/configuration_schema.json` trae `jsx-a11y/*` como reglas válidas, con 49 apariciones — `alt-text`, `label-has-associated-control`, `aria-role`, `no-autofocus`, etc.). El `.oxlintrc.json` actual solo activa `["react", "typescript", "oxc"]`. Dado que la 6a introduce formularios y diálogos accesibles, añadir `"jsx-a11y"` a `plugins` es una mejora de coherencia técnica barata (una palabra en un array) — lo dejo anotado en vez de tocarlo, porque cambiar `.oxlintrc.json` no es parte de lo que se pidió investigar, y modificar el repo está fuera del encargo de este informe.
- **Generación de iconos**: si se decide partir de una sola imagen/SVG fuente, `@vite-pwa/assets-generator` (`npm view` → `2.0.0`) genera automáticamente los tamaños del manifiesto y el `apple-touch-icon`. Ojo: el `peerDependencies` de `vite-plugin-pwa@1.3.0` declara `"@vite-pwa/assets-generator": "^1.0.0"` pero la última versión publicada es la `2.0.0` — conviene comprobar las notas de la versión 2.x antes de instalarla junto a `vite-plugin-pwa@1.3.0` (posible salto mayor no cubierto por ese rango de peer), o fijar la `1.x` más reciente si da algún aviso.

## 8. Paquetes a añadir (ninguno instalado; solo investigado con `npm view`)

| Paquete | Versión (`npm view … version`/`dist-tags`) | Tipo | Motivo |
|---|---|---|---|
| `vite-plugin-pwa` | `1.3.0` | `devDependencies` | manifiesto + service worker (§1) |
| `@fontsource/cinzel` | `5.3.0` | `dependencies` | fuente empaquetada (§2) |
| `@fontsource/cormorant-garamond` | `5.3.0` | `dependencies` | fuente empaquetada (§2) |
| `@fontsource/source-sans-3` | `5.3.0` | `dependencies` | fuente empaquetada (§2) |
| `@testing-library/react` | `16.3.3` | `devDependencies` | pruebas de componentes (§3) |
| `@testing-library/user-event` | `14.6.7` | `devDependencies` | simular interacción real (§3) |
| `@testing-library/jest-dom` | `7.0.1` | `devDependencies` | matchers de accesibilidad/DOM (§3) |
| `happy-dom` | `20.14.5` | `devDependencies` | entorno DOM del proyecto `interfaz` de Vitest (§3) |

No se propone ninguna librería de enrutado, de formularios ni de gestión de estado global: ver razones en §4-§5.

## Dudas (sin resolver en la especificación; opciones y recomendación)

- **D-T1 · `registerType` del service worker.** La especificación no dice si actualizar la PWA debe ser silencioso o avisar al usuario, y el aviso de actualización (`useRegisterSW`, con su UI de "toast") no está en la lista de componentes comunes de la 6a.
  - Opciones: (a) `registerType: 'autoUpdate'` — recarga sola en cuanto hay SW nuevo, sin componente nuevo; riesgo: podría recargar mientras alguien tiene un diálogo abierto con datos sin guardar («Cerrar con cambios», §6.4 línea 819) y perderlos. (b) `registerType: 'prompt'` — pide un componente de aviso (probablemente el mismo `Aviso` común, reusado) que no estaba previsto en el alcance de la 6a.
  - Recomendación: **(a) `autoUpdate` para la 6a**, porque es lo más simple y porque en esta fase no hay todavía formularios de dinero con estado sin guardar de verdad en juego (P0/P1/P1b/P6 son altas cortas o de solo lectura); revisar en la 6b, cuando ya existan los formularios largos del personaje/asentamiento, si conviene pasar a `'prompt'` con el componente `Aviso`.

- **D-T2 · jsdom o happy-dom para las pruebas de `src/interfaz`.** Ninguno de los dos implementa `<dialog>`/`showModal()` de forma completa (comprobado por búsqueda web, §3); la especificación tampoco dice nada sobre cómo probar diálogos.
  - Opciones: (a) `happy-dom` (más rápido, `showModal()` sí existe aunque solo conmute `open`) + shim explícito para `close()`/eventos si hace falta. (b) `jsdom` (más lento, pero es el que recomienda por defecto la documentación de Testing Library) + shim más grande porque ni siquiera trae los métodos.
  - Recomendación: **(a) `happy-dom`**, con el shim de `src/interfaz/pruebas/configurar.ts` propuesto en §3, y dejar la verificación real de accesibilidad nativa del `<dialog>` (backdrop, bloqueo del resto de la página, foco atrapado) para pruebas manuales en Chrome, ya que ningún entorno de pruebas en Node la reproduce fielmente hoy.

- **D-T3 · Enrutado.** Resuelto con recomendación firme en §5 (ninguna biblioteca), no como duda para decidir después: la especificación no menciona URLs en ningún punto, así que aplicando el criterio de `CLAUDE.md` («lo más simple que cumpla las reglas del juego» → «lo más fácil de cambiar después») no hay margen real de duda. Lo dejo listado aquí solo para que quede explícito que la pregunta del encargo («si hace falta una biblioteca o basta un estado») queda contestada: basta un estado.

- **D-T4 · CSS Modules frente a alguna librería de estilos con estado (styled-components, vanilla-extract, Tailwind).**
  - Opciones: (a) CSS Modules + variables CSS (cero dependencias nuevas, ya soportado por Vite). (b) Una librería de *styling* con soporte de temas.
  - Recomendación: **(a) CSS Modules**, porque el propio §10 pide "variables CSS" explícitamente y el modo oscuro está fuera de alcance (línea 1424): no hay ningún tema dinámico que justificar una dependencia de *styling* adicional.

- **D-T5 · Iconos de la PWA.** No existe ningún `.png`/`.svg`/`.ico` en el repositorio; el manifiesto de `vite-plugin-pwa` exige como mínimo un icono de 192×192 y uno de 512×512 (idealmente también un `maskable`). La especificación menciona un "emblema junto al nombre de la partida" (§10, línea 1403, "ornamento contenido") pero no lo define como artboard ni da su forma exacta.
  - Opciones: (a) diseñar un icono simple ahora mismo (monograma en Cinzel sobre los tokens `papel`/`oro-oscuro`) y generar los tamaños con `@vite-pwa/assets-generator` a partir de un único SVG fuente. (b) usar un marcador de posición (un cuadrado con la inicial "GA") hasta que exista un diseño de icono real, y sustituirlo sin tocar la configuración del manifiesto cuando llegue.
  - Recomendación: **(b)** para no bloquear la 6a con una pieza de diseño que no está en el alcance («componentes comunes» y «pantallas P0/P1/P1b/P6», no «identidad visual de app»); el manifiesto y el `vite-plugin-pwa` no cambian de forma cuando se sustituya el archivo de icono.

## Inconsistencias encontradas

- El `peerDependencies` de `vite-plugin-pwa@1.3.0` pide `"@vite-pwa/assets-generator": "^1.0.0"`, pero la última versión publicada de ese paquete es `2.0.0` (`npm view @vite-pwa/assets-generator version`). No afecta a la instalación de `vite-plugin-pwa` en sí (es peer opcional, `peerDependenciesMeta.optional: true`), solo importa si se usa la generación automática de iconos (D-T5); anotado en §7.
- Ninguna otra inconsistencia entre la especificación, las vistas y la configuración real del proyecto: las versiones de React, Vite y Vitest instaladas son compatibles con todo lo investigado aquí sin necesidad de forzar ninguna versión distinta a la ya fijada en `package.json`.
