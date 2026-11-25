# Fase 6a · Contrato del plan

Este contrato fija lo que el plan de la fase 6a tiene que construir: la interfaz base y la PWA, en paralelo con el motor (fases 3 a 5). Quien escriba el plan copia de aquí los tipos, los textos, la configuración y la lista de tareas. Las decisiones están en `decisiones-fase-6a.md` (D-080 a D-099 y las técnicas).

**Fuentes** (se citan así):

- «espec. L…»: `docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md`.
- «mjs L…»: `design/build-artboards.mjs`, el generador de las vistas `.dc.html`.
- Código: la rama de trabajo `diseno/especificacion-y-vistas`, en el commit 3a77322.
- Informes de trabajo: `sistema-visual.md`, `componentes.md`, `tecnica.md`, `pantallas-y-datos.md` y `critica.md` (todos en `scratchpad/fase-6a/`). El `test.md` del encargo no existe: el inventario de pruebas es el de `critica.md` §7, ampliado aquí en el §10.

**Qué ya está comprobado.** La configuración de este contrato se ha probado en una copia de 3a77322 en `scratchpad/fase-6a/verif/` (sin tocar el repositorio):

- dependencias instaladas;
- Vitest con dos proyectos, con pruebas de humo que pasan;
- `npx tsc -b`, `npm run lint` y `npm run build` en verde;
- precaché de 14 entradas con las 6 fuentes `woff2` y los 3 iconos;
- `scripts/iconos.mjs` y `scripts/comprobarPwa.mjs` funcionando.

Punto de partida: **568 pruebas en 48 archivos**.

---

## 0. Reglas de la fase

- **Rama**: `implementacion/fase-6a`, creada desde `diseno/especificacion-y-vistas` (3a77322). **Nunca** desde `implementacion/fase-3`, que está a medias (crítica §5.3).
- **No se tocan** los archivos que el motor va a tocar:
  - `src/dominio/motor/`, `avisos/`, `avance/`, `edicion/`, `poblacion/`, `eventos/` y `locales/`;
  - `src/datos/avances.ts` y `src/datos/ediciones.ts`;
  - ni ninguno de los modificados por la fase 3 (plan de la fase 3, L63-110): `dinero/importe.ts`, `calendario/formatoFecha.ts`, `dinero/prorrateo.ts`, `modelo/documento.ts`, `modelo/movimientos.ts`, `modelo/avance.ts`, `ejemplo/*.ts`, `validacion/coherencia.ts` y `validacion/referencias.ts`.
- **Lo nuevo del dominio y de los datos va en archivos nuevos.** La única excepción es `src/dominio/modelo/resumen.ts` y su prueba (D-080), que la fase 3 no toca.
- **Reglas de las fases anteriores** que siguen valiendo:
  - identificadores en castellano sin tildes ni eñes;
  - sin punto y coma, comillas simples, 2 espacios, comas finales y ancho de unos 120;
  - imports relativos sin extensión y sin archivos barril;
  - JSDoc de una línea que cite la sección;
  - TDD;
  - comandos en Git Bash;
  - commits `feat(interfaz): …` con `Co-Authored-By`.
- **Reglas nuevas de la interfaz**:
  - Las funciones de respuesta de los componentes se llaman `al…` (`alPulsar`, `alCambiar`, `alCancelar`).
  - Un `.tsx` exporta **solo** componentes, tipos y constantes. Contextos, *hooks* y funciones van en un `.ts` aparte; si no, oxlint avisa con `react(only-export-components)`, comprobado. `npm run lint` tiene que acabar sin avisos.
  - Las pruebas buscan por rol y nombre accesible (Testing Library). Para variantes y tonos se leen atributos `data-*`, nunca clases CSS.
  - Cada archivo de estilos es un CSS Module al lado de su componente (`Boton.module.css`) y solo usa las variables del §3.
- **Cada tarea deja en verde** `npm test`, `npx tsc -b`, `npm run build` y `npm run lint`, y termina con su commit.

---

## 1. Dependencias nuevas

Comprobadas con `npm view` el 2026-09-18 e instaladas sin avisos de *peer* en la copia de prueba. Las instala la tarea 2.

| Paquete | Rango | Instalada | Dónde | Para qué |
|---|---|---|---|---|
| `@fontsource/cormorant-garamond` | `^5.3.0` | 5.3.0 | `dependencies` | títulos (§10, espec. L1394) |
| `@fontsource/source-sans-3` | `^5.3.0` | 5.3.0 | `dependencies` | interfaz y cifras |
| `@fontsource/cinzel` | `^5.3.0` | 5.3.0 | `dependencies` | marca y etiquetas de grupo |
| `vite-plugin-pwa` | `^1.3.0` | 1.3.0 | `devDependencies` | manifiesto y *service worker*; *peer* `vite ^8.0.0` |
| `@testing-library/react` | `^16.3.3` | 16.3.3 | `devDependencies` | pruebas de componentes |
| `@testing-library/dom` | `^10.4.2` | 10.4.2 | `devDependencies` | *peer* obligatorio de la anterior (faltaba en `tecnica.md`) |
| `@testing-library/user-event` | `^14.6.7` | 14.6.7 | `devDependencies` | toques y teclado |
| `@testing-library/jest-dom` | `^7.0.1` | 7.0.1 | `devDependencies` | `toBeDisabled`, `toHaveAttribute`… (entrada `/vitest`) |
| `happy-dom` | `^20.14.5` | 20.14.5 | `devDependencies` | DOM del proyecto `interfaz` |

No se añade `@vite-pwa/assets-generator`: los iconos los dibuja un script sin dependencias. Tampoco se añade ninguna biblioteca de rutas, estado, formularios o estilos.

---

## 2. Configuración

### 2.1 `vite.config.ts`

**Tarea 2.** Solo cambia `test`, que pasa a tener dos proyectos:

```ts
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          // El dominio y los datos son TypeScript sin navegador: sus pruebas corren en node.
          name: 'nodo',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/interfaz/**'],
        },
      },
      {
        extends: true,
        test: {
          // La interfaz necesita un DOM: happy-dom, con jest-dom y la limpieza tras cada prueba.
          name: 'interfaz',
          environment: 'happy-dom',
          include: ['src/interfaz/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/interfaz/pruebas/preparar.ts'],
        },
      },
    ],
  },
})
```

Por qué `exclude` y no `include: ['src/dominio/**', 'src/datos/**']`:

- la fase 3 crea carpetas nuevas en `src/dominio` y así ninguna se escapa (crítica §5.2);
- `pureza.test.ts` exige que no exista `window`, así que una prueba del dominio que cayera en happy-dom fallaría y serviría de alarma.

**Tarea 4.** Se añade la PWA. Así queda el archivo entero (comprobado en `verif/`):

```ts
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA instalable y sin conexión (D-098): precachea la app, las 6 fuentes y los iconos del manifiesto.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Gestión de Aldeas',
        short_name: 'Aldeas',
        description: 'La economía de tus dominios en la Tierra Media',
        lang: 'es',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#F2E8D0',
        theme_color: '#FBF6E9',
        icons: [
          { src: 'iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'iconos/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Solo woff2: cada CSS de Fontsource trae también un .woff que Chrome no necesita (crítica §5.1).
        globPatterns: ['**/*.{js,css,html,woff2}'],
      },
    }),
  ],
  test: {
    projects: [
      /* igual que en la tarea 2 */
    ],
  },
})
```

Notas sobre esta configuración:

- `includeAssets` no se pone y `png` no entra en `globPatterns`: el plugin ya añade el manifiesto y sus iconos, y con ellos las entradas salían repetidas (comprobado).
- `injectRegister: 'auto'` inserta `registerSW.js` en el HTML, así que no hace falta importar `virtual:pwa-register` ni añadir tipos.
- El registro usa `'/sw.js'` con `scope: '/'`: la app se sirve desde la raíz. Si se publica en una subruta (D-099), cambian `base`, `start_url` y `scope`.
- Los colores del manifiesto son `papel` y `vitela`, el fondo de la barra superior (mjs L247). Resuelve C23 y D6a-04.

### 2.2 `package.json`

- **Tarea 2**: las nueve dependencias del §1.
- **Tarea 4**: dos *scripts* más:

```json
"iconos": "node scripts/iconos.mjs",
"comprobar:pwa": "node scripts/comprobarPwa.mjs"
```

`build`, `test`, `lint`, `dev` y `preview` no cambian.

### 2.3 `index.html`

**Tareas 3 y 4.** El favicon llega en la 4, con los iconos.

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, interactive-widget=resizes-content" />
    <meta name="theme-color" content="#FBF6E9" />
    <meta name="description" content="La economía de tus dominios en la Tierra Media" />
    <link rel="icon" type="image/png" href="/iconos/icono-192.png" />
    <title>Gestión de Aldeas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`interactive-widget=resizes-content` sirve para que en la fase 9 el «alto visible» con el teclado abierto se resuelva con CSS (espec. L827 y L868; crítica §5.1). Aquí no cuesta nada.

### 2.4 `src/interfaz/pruebas/preparar.ts`

**Tarea 2.** Comprobado:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cada prueba de la interfaz empieza con el documento vacío.
afterEach(() => {
  cleanup()
})
```

No hay *shim* de `<dialog>`: happy-dom 20.14.5 implementa `showModal()`, `close()` y el atributo `open`, también con dos diálogos abiertos a la vez (comprobado; crítica §5.2).

Lo que happy-dom **no** hace:

- la capa superior (*top layer*);
- atrapar el foco;
- el evento `cancel` con Esc: las pruebas lo lanzan con `fireEvent(dialogo, new Event('cancel', { cancelable: true }))`;
- `navigator.storage`, que es `undefined` (comprobado).

Lo que sí funciona (comprobado):

- `userEvent.upload` con `File.text()`;
- `URL.createObjectURL`;
- `structuredClone`;
- `fake-indexeddb` a través de `baseDePrueba()`.

### 2.5 `scripts/iconos.mjs`

**Tarea 4.** Dibuja el emblema de mjs L76-77 sobre `papel`, sin dependencias: rasteriza con 4×4 muestras por píxel y codifica el PNG con `node:zlib` (`deflateSync` y `crc32`, que existen en Node 24). Se ejecuta una vez y los PNG se guardan en el repositorio. Comprobado: da 1,4 kB a 192 px y 4,9 kB a 512 px.

```js
// Dibuja los iconos de la PWA (el emblema de §10 sobre papel) sin dependencias: npm run iconos
import { mkdirSync, writeFileSync } from 'node:fs'
import { crc32, deflateSync } from 'node:zlib'

const PAPEL = [0xf2, 0xe8, 0xd0]
const ORO = [0xa9, 0x81, 0x2f]
// La estrella de cuatro puntas de emblema() en design/build-artboards.mjs (L76-77), en su rejilla de 24.
const ESTRELLA = [[12, 1.5], [14.6, 9.4], [22.5, 12], [14.6, 14.6], [12, 22.5], [9.4, 14.6], [1.5, 12], [9.4, 9.4]]
const TRAZO = 1.4
const RADIO = 2.2
const MUESTRAS = 4

function distanciaASegmento(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function tinta(x, y) {
  if (Math.hypot(x - 12, y - 12) <= RADIO) {
    return true
  }
  return ESTRELLA.some((punto, i) => distanciaASegmento(x, y, punto, ESTRELLA[(i + 1) % ESTRELLA.length]) <= TRAZO / 2)
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, crc])
}

/** PNG RGB de lado × lado con el emblema ocupando `fraccion` del lado. */
function png(lado, fraccion) {
  const escala = (lado * fraccion) / 24
  const margen = (lado - 24 * escala) / 2
  const filas = []
  for (let y = 0; y < lado; y += 1) {
    const fila = Buffer.alloc(1 + lado * 3)
    for (let x = 0; x < lado; x += 1) {
      let cubierto = 0
      for (let sy = 0; sy < MUESTRAS; sy += 1) {
        for (let sx = 0; sx < MUESTRAS; sx += 1) {
          if (tinta((x + (sx + 0.5) / MUESTRAS - margen) / escala, (y + (sy + 0.5) / MUESTRAS - margen) / escala)) {
            cubierto += 1
          }
        }
      }
      const a = cubierto / (MUESTRAS * MUESTRAS)
      for (let c = 0; c < 3; c += 1) {
        fila[1 + x * 3 + c] = Math.round(PAPEL[c] * (1 - a) + ORO[c] * a)
      }
    }
    filas.push(fila)
  }
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(lado, 0)
  cabecera.writeUInt32BE(lado, 4)
  cabecera[8] = 8
  cabecera[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', cabecera),
    trozo('IDAT', deflateSync(Buffer.concat(filas), { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/iconos', { recursive: true })
writeFileSync('public/iconos/icono-192.png', png(192, 0.72))
writeFileSync('public/iconos/icono-512.png', png(512, 0.72))
// El maskable deja el emblema dentro del círculo seguro del 80 %.
writeFileSync('public/iconos/icono-maskable-512.png', png(512, 0.56))
```

### 2.6 `scripts/comprobarPwa.mjs`

**Tarea 4.** Se ejecuta después de `npm run build`. Comprobado: imprime «PWA lista: 14 archivos en el precaché, 6 fuentes y 3 iconos.».

```js
// Tras `npm run build`, comprueba que la app funcionará sin conexión: npm run comprobar:pwa
import { existsSync, readFileSync } from 'node:fs'

const fallos = []
const exige = (condicion, texto) => {
  if (!condicion) {
    fallos.push(texto)
  }
}

const manifiesto = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'))
exige(manifiesto.name === 'Gestión de Aldeas', 'name del manifiesto')
exige(manifiesto.short_name === 'Aldeas', 'short_name del manifiesto')
exige(manifiesto.display === 'standalone', 'display standalone')
exige(manifiesto.orientation === 'landscape', 'orientación horizontal')
exige(manifiesto.lang === 'es', 'idioma es')
for (const [lado, proposito] of [['192x192', undefined], ['512x512', undefined], ['512x512', 'maskable']]) {
  const icono = manifiesto.icons.find((i) => i.sizes === lado && i.purpose === proposito)
  exige(icono !== undefined, `icono ${lado}${proposito ? ` ${proposito}` : ''}`)
  if (icono !== undefined) {
    // En un PNG, el ancho es el entero de 4 bytes que empieza en el byte 16 (cabecera IHDR).
    exige(readFileSync(`dist/${icono.src}`).readUInt32BE(16) === Number(lado.split('x')[0]), `ancho de ${icono.src}`)
  }
}

const precache = [...readFileSync('dist/sw.js', 'utf8').matchAll(/url:"([^"]+)"/g)].map((m) => m[1])
exige(precache.includes('index.html'), 'index.html en el precaché')
exige(precache.includes('manifest.webmanifest'), 'manifiesto en el precaché')
exige(precache.some((u) => /^assets\/index-.*\.js$/.test(u)), 'JavaScript en el precaché')
exige(precache.some((u) => /^assets\/index-.*\.css$/.test(u)), 'CSS en el precaché')
for (const fuente of [
  'cormorant-garamond-latin-600-normal',
  'cormorant-garamond-latin-500-italic',
  'source-sans-3-latin-400-normal',
  'source-sans-3-latin-600-normal',
  'source-sans-3-latin-700-normal',
  'cinzel-latin-600-normal',
]) {
  exige(precache.some((u) => u.startsWith(`assets/${fuente}-`) && u.endsWith('.woff2')), `fuente ${fuente}`)
}
exige(precache.filter((u) => u.endsWith('.woff2')).length === 6, 'exactamente 6 fuentes woff2')
exige(!precache.some((u) => u.endsWith('.woff')), 'sin fuentes woff en el precaché')
exige(new Set(precache).size === precache.length, 'sin entradas repetidas en el precaché')
exige(!readFileSync('dist/index.html', 'utf8').includes('fonts.googleapis'), 'sin Google Fonts')
exige(existsSync('dist/registerSW.js'), 'registro del service worker')

if (fallos.length > 0) {
  console.error(`La PWA no está lista (${fallos.length}):\n- ${fallos.join('\n- ')}`)
  process.exit(1)
}
console.log(`PWA lista: ${precache.length} archivos en el precaché, 6 fuentes y 3 iconos.`)
```

---

## 3. Sistema visual (§10) en CSS

### 3.1 `src/interfaz/estilos/variables.css`

**Tarea 3.** Es literal. Los nombres llevan el mismo token que §10, sin prefijo (D6a-10, recomendación b).

```css
/* Sistema visual «pergamino legible» (§10, espec. L1379-1406; valores de build-artboards.mjs L11-22). */
:root {
  /* Colores de la tabla de §10 */
  --papel: #F2E8D0;
  --vitela: #FBF6E9;
  --pliegue: #E6D8B8;
  --borde: #D4C29C;
  --tinta: #2B2118;
  --tinta-suave: #6B5A45;
  --lacre: #8E2A1F;
  --oro: #A9812F;
  --oro-oscuro: #7A5B1F;
  --bosque: #3F5E3A;

  /* Colores del generador que §10 no nombra (mjs L12-14) */
  --campo: #FFFDF6;
  --lacre-tinte: #F4DED6;
  --oro-tinte: #F1E3BF;
  --bosque-tinte: #DFE7D5;

  /* Borde de avisos: el color del tono al 25 % (mjs L185, «${fg}40»; neutro = tinta-suave) */
  --lacre-borde: #8E2A1F40;
  --oro-borde: #7A5B1F40;
  --bosque-borde: #3F5E3A40;
  --neutro-borde: #6B5A4540;

  /* Tipografía (mjs L16-20; tamaños de §10, espec. L1395-1400) */
  --fuente-titulo: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --fuente-ui: 'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif;
  --fuente-marca: Cinzel, 'Trajan Pro', Georgia, serif;
  --texto-lectura: 15px;
  --texto-etiqueta: 14px;
  --texto-secundario: 13px;
  --texto-calendario: 12px;
  --texto-cifra: 28px;
  --texto-campo: 16px;

  /* Medidas (§10 L1401; mjs L114, L191, L247, L257) */
  --toque: 44px;
  --alto-campo: 48px;
  --alto-barra: 64px;
  --ancho-menu: 232px;
  --radio-control: 6px;
  --radio-panel: 8px;
  --radio-tarjeta: 10px;

  /* Sombras (mjs L266, L278, L1397) y filete doble de las cabeceras (mjs L141, L268; §10 L1403) */
  --sombra-dialogo: 0 24px 60px rgba(43, 33, 24, 0.35);
  --sombra-dialogo-apilado: 0 24px 60px rgba(43, 33, 24, 0.45);
  --sombra-flotante: 0 12px 32px rgba(43, 33, 24, 0.28);
  --filete: 3px double #D4C29C;
}
```

**Velos.** Van literales en `::backdrop`: diálogo `rgba(43, 33, 24, 0.55)` y segundo diálogo `rgba(43, 33, 24, 0.35)` (espec. L1402; mjs L265 y L277). No se usan variables porque `::backdrop` no las hereda en Chrome anteriores al 122 (crítica §5.1).

**Sin modo oscuro** (espec. L1424).

**Tamaños sueltos.** Los que no son *tokens* van en el CSS de su componente, no aquí (crítica H12):

- Cormorant 40 px (título del asistente, mjs L341);
- Cormorant 26 px («Tus partidas», mjs L318);
- Cormorant 28 px (nombre en la tarjeta, mjs L299);
- Cormorant 23 px en cursiva 500 (entradilla de P0, mjs L314);
- Cinzel 44 px con 0.08em (mjs L312);
- Cinzel 15 px con 0.06em (marca del asistente, mjs L335).

### 3.2 `src/interfaz/estilos/global.css`

**Tarea 3.**

```css
/* Base de la app: tamaño mínimo 1024×700 (espec. L826), foco visible y cifras tabulares (§10). */
*,
*::before,
*::after {
  box-sizing: border-box;
}
html,
body,
#root {
  height: 100%;
}
body {
  margin: 0;
  background: var(--papel);
  color: var(--tinta);
  font-family: var(--fuente-ui);
  font-size: var(--texto-lectura);
  -webkit-tap-highlight-color: transparent;
}
#root {
  min-width: 1024px;
  min-height: 700px;
}
button,
input,
textarea {
  font: inherit;
  color: inherit;
}
/* Foco de teclado: oro oscuro, que da 5,15:1 sobre papel; el oro da 2,94:1 (crítica C13). */
:focus-visible {
  outline: 2px solid var(--oro-oscuro);
  outline-offset: 2px;
}
```

### 3.3 `src/interfaz/estilos/fuentes.ts`

**Tarea 3.** Es literal (comprobado). Solo el subconjunto `latin`: cubre `U+0000-00FF`, «» “” … y `U+2212` (crítica C7).

```ts
// Las tres familias de §10 (espec. L1394), servidas con la app y sin Google Fonts: solo el subconjunto latino.
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-500-italic.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-700.css'
import '@fontsource/cinzel/latin-600.css'
```

`src/main.tsx` importa `./interfaz/estilos/fuentes`, `./interfaz/estilos/variables.css` y `./interfaz/estilos/global.css`, en ese orden.

### 3.4 Estados de interacción

Resuelven la duda 2-5 de `sistema-visual.md`, D-C1, D-C5, C12 y C13.

- **Desactivado**: el atributo `disabled` nativo (o `aria-disabled` donde no hay control nativo) con `opacity: 0.6` y `cursor: not-allowed`. Viene de la casilla desactivada (mjs L1372).
- **Foco**: `:focus-visible` global (§3.2), también en segmentos y opciones.
- **Hover**: solo en los enlaces (mjs L96), y dentro de `@media (hover: hover) { … color: var(--tinta) }`.
- **Error de un campo**: borde de 1 px en `var(--lacre)`, `aria-invalid="true"` y un `MensajeError` debajo (D-094).
- **Campo activo** (selector y campo de fecha abiertos): borde de 2 px en `var(--oro)`, con el relleno horizontal de 13 px para que el texto no salte, y la flecha en `oro-oscuro` (mjs L1396; crítica C2).

---

## 4. Estructura de archivos

- `(Tn)` es la tarea que crea el archivo. `M` marca un archivo que ya existía y se modifica.
- Cada módulo lleva su prueba al lado.
- Los `.module.css` van junto a su `.tsx` y no se listan uno a uno: cada componente con estilos tiene el suyo.

```
package.json, package-lock.json          M  9 dependencias (T2); scripts iconos y comprobar:pwa (T4)
vite.config.ts                           M  Vitest en dos proyectos (T2); VitePWA (T4)
index.html                               M  viewport, theme-color y descripción (T3); favicon (T4)
scripts/iconos.mjs                          dibuja los iconos de la PWA sin dependencias (T4)
scripts/comprobarPwa.mjs                    comprueba dist/ tras el build: manifiesto, iconos y precaché (T4)
public/iconos/icono-192.png, icono-512.png, icono-maskable-512.png   generados por iconos.mjs (T4)
src/main.tsx                             M  estilos (T3); servicios, almacenamiento y App (T32)
src/App.tsx                              borrado en T32: lo sustituye src/interfaz/app/App.tsx

src/dominio/calendario/textosFecha.ts       conMayuscula, formatearFechaConDia, nombreDelDia y leerFechaEscrita (T5)
src/dominio/texto/buscar.ts                 buscarEn: coincidencia sin mayúsculas ni tildes, con índices del texto original (T6)
src/dominio/dinero/textosEquivalencias.ts   cadenaDeEquivalencias y equivalenciasDesdeOro (T7)
src/dominio/partidas/orden.ts               ordenarDominios: personaje, luego asentamientos por alta y orden del documento (T8)
src/dominio/partidas/textos.ts              LARGO_MAXIMO_NOMBRE, errorDeNombre y textoDominios (T8)
src/dominio/modelo/resumen.ts            M  resumenDePartida usa ordenarDominios (T8); resumen.test.ts M
src/dominio/partidas/nueva.ts               documentoDePartidaNueva: el documento que crea P1b (T9)
src/dominio/partidas/datos.ts               aplicarDatosDePartida: nombre, fecha inicial y Edad de «Editar partida» (T9)
src/dominio/calendario/formularioFrecuencia.ts   valores iniciales, recálculos, errores y próxima fecha del campo n.º 13 (T10)
src/datos/resumenes.ts                      leerResumen (T11)
src/datos/datosDePartida.ts                 guardarDatosDePartida: aplica, cuenta el cambio y guarda (T11)

src/interfaz/
  pruebas/preparar.ts                       setupFiles: jest-dom y limpieza (T2)
  pruebas/humo.test.tsx                     humo del entorno de la interfaz (T2)
  pruebas/servicios.ts                      serviciosDePrueba, AHORA_DE_PRUEBA y renderConServicios (T24)
  estilos/variables.css                     tokens (T3)
  estilos/global.css                        base, foco y tamaño mínimo (T3)
  estilos/fuentes.ts                        las 6 fuentes (T3)
  estilos/estilos.test.ts                   colores y fuentes literales (T3)
  formato/fechaReal.ts                      Instante → «8 de septiembre de 2026», en la hora de la tablet (T5)
  iconos/trazos.ts                          ICONOS (42 trazos del generador) y NombreIcono (T12)
  iconos/Icono.tsx                          Icono (T12)
  iconos/Emblema.tsx                        Emblema y Filete (T12)
  comunes/Boton.tsx                         Boton, BotonIcono y Enlace (T13)
  comunes/Panel.tsx                         Panel, CabeceraPantalla y Nota (T14)
  comunes/Tabla.tsx                         Tabla y ListaPares (T14)
  comunes/Campo.tsx                         EtiquetaCampo, CampoTexto y MensajeError (T15)
  comunes/tocados.ts                        useTocados: qué campos ya se han tocado (D-094) (T15)
  comunes/Casilla.tsx                       Casilla (T15)
  comunes/Aviso.tsx                         Aviso en sus cuatro tonos (T16)
  comunes/Segmentos.tsx                     Segmentos (T17)
  comunes/nivelDialogo.ts                   ContextoNivelDialogo, useNivelDialogo y MAXIMO_DIALOGOS (T18)
  comunes/Dialogo.tsx                       Dialogo y DialogoMensaje (T18)
  comunes/ConfirmacionEliminar.tsx          J2d (T19)
  comunes/SelectorConBuscador.tsx           selector de §6.5 con pie de alta (T20)
  comunes/leerImporte.ts                    leerImporte: vacío, válido o inválido (T21)
  comunes/CampoImporte.tsx                  FilaImporte y CampoImporte (T21)
  comunes/ResumenOro.tsx                    total en monedas de oro con las equivalencias (T21)
  comunes/CampoFecha.tsx                    selector de fecha n.º 3 (T22)
  comunes/CampoFrecuencia.tsx               campo de frecuencia n.º 13 (T23)
  app/servicios.ts                          Servicios, ContextoServicios y useServicios (T24)
  app/navegador.ts                          descargarArchivo, pedirAlmacenamientoPersistente y leerArchivo (T24)
  app/navegacion.ts                         Vista, Pantalla, secciones del menú y títulos provisionales (T25)
  marco/MarcoPartida.tsx                    rejilla 232 × 64, barra, menú y contenido (T25)
  marco/BarraSuperior.tsx                   barra superior sin aviso ni «Avanzar días» (T25)
  marco/MenuLateral.tsx                     menú de §5 (T25)
  marco/PantallaPendiente.tsx               pantalla provisional de D-081 (T25)
  comunes/fechaInicial.ts                   ValorFechaInicial y leerFechaInicial (T26)
  comunes/CampoFechaInicial.tsx             Día, Mes, Año y Edad (P1 y «Editar partida») (T26)
  comunes/equivalencias.ts                  TextosEquivalencias, textosDe y leerEquivalencias (T26)
  comunes/TablaMonedas.tsx                  tabla de monedas, en lectura (P6) o editable (P1) (T26)
  pantallas/nueva/Asistente.tsx             cabecera del asistente y los dos pasos (T27)
  pantallas/nueva/PasoPartida.tsx           P1 (T27)
  pantallas/nueva/PasoPersonaje.tsx         P1b (T27)
  pantallas/nueva/NuevaPartida.tsx          estado del asistente y «Crear partida» (T27)
  app/copias.ts                             prepararImportacion e importarPreparada (T28)
  app/ImportarCopia.tsx                     botón, selector de archivo y diálogos de importar (T28)
  pantallas/selector/EditarPartida.tsx      «Editar partida» y su J2d (T29)
  pantallas/selector/TarjetaPartida.tsx     tarjeta de una partida (T30)
  pantallas/selector/SelectorPartidas.tsx   P0: lista, buscador, vacío, ejemplo, exportar, importar y editar (T30)
  pantallas/ajustes/Ajustes.tsx             P6 (T31)
  app/App.tsx                               arranque, vistas y navegación (T32)
  entregable.test.tsx                       el entregable recorrido con Testing Library (T33)
```

**Archivos del motor que no se tocan.** Como ya dice el §0: `src/dominio/motor/`, `avisos/`, `avance/`, `edicion/`, `src/datos/avances.ts`, `src/datos/ediciones.ts`, `src/dominio/calendario/formatoFecha.ts` y `src/dominio/dinero/importe.ts`.

---

## 5. Dominio y datos nuevos

Todo es puro salvo `src/datos` e `interfaz/formato/fechaReal.ts`. Cada módulo nuevo de `src/dominio` suma **una** prueba a `pureza.test.ts`; son 8 módulos, así que son +8 pruebas. Ninguno puede contener las palabras `window`, `document`, `navigator`, `crypto`, `fetch`, `localStorage`, `sessionStorage` ni `indexedDB` fuera de los comentarios (`pureza.test.ts` L25).

### 5.1 `src/dominio/calendario/textosFecha.ts` (T5)

```ts
import type { Fecha } from './fecha'
import type { Edad } from './formatoFecha'

/** «jueves» → «Jueves» (vistas: barra superior mjs L251, P6 mjs L628). */
export function conMayuscula(texto: string): string
/** «domingo 1 de enero de 1640 T.E.»: día de la semana sin coma (aviso de P1, mjs L348); sin edad, sin abreviatura. */
export function formatearFechaConDia(f: Fecha, edad?: Edad): string
/** «Jueves»: el día de la semana con mayúscula (barra superior, mjs L251). */
export function nombreDelDia(f: Fecha): string
/** «19/04/1640» o «1/4/1640» → { anio: 1640, mes: 4, dia: 19 }; null si no tiene la forma d/m/a (1-2, 1-2 y 1-4 cifras). No valida: eso es validarFecha. */
export function leerFechaEscrita(texto: string): Fecha | null
```

- Usa `NOMBRES_DIA`, `formatearFecha` y `diaDeLaSemana`, que ya existen. `formatoFecha.ts` **no se modifica**.
- P6 escribe `conMayuscula(formatearFecha(f, { edad, diaSemana: true }))` → «Jueves, 12 de abril de 1640 T.E.».
- Pruebas (7):
  - `formatearFechaConDia({1640,1,1}, 'tercera')` da «domingo 1 de enero de 1640 T.E.»;
  - sin edad da «domingo 1 de enero de 1640»;
  - `nombreDelDia({1640,4,12})` da «Jueves»;
  - `conMayuscula('')` da `''`;
  - la línea de P6 da «Jueves, 12 de abril de 1640 T.E.»;
  - `leerFechaEscrita` con «19/04/1640», « 1/4/1640 », «1/1/25» (año 25) y «31/04/1640», que da `{1640,4,31}` porque no valida;
  - `leerFechaEscrita` devuelve `null` con «19-04-1640», «hola», «» y «1/1/12345».

### 5.2 `src/interfaz/formato/fechaReal.ts` (T5)

```ts
import type { Instante } from '../../dominio/modelo/comunes'
/** «8 de septiembre de 2026»: el día del Instante (ISO en UTC) en la hora de la tablet (D-093; mjs L301 y L632). */
export function fechaReal(instante: Instante): string
/** fechaReal o «Nunca» si no hay (P6 «Última copia exportada», D-093). */
export function fechaRealONunca(instante: Instante | undefined): string
```

- Usa `new Date(instante)` con `getFullYear`, `getMonth` y `getDate` (hora local) y `NOMBRES_MES`.
- Va en la interfaz porque depende de la zona horaria del dispositivo (crítica H7).
- Pruebas (3). Las fechas de prueba se construyen en hora local, con `new Date(2026, 8, 8, 12).toISOString()`, para que el resultado no dependa de la zona de quien ejecuta:
  - «8 de septiembre de 2026»;
  - «1 de enero de 2027»;
  - `fechaRealONunca(undefined)` da «Nunca».

### 5.3 `src/dominio/texto/buscar.ts` (T6)

```ts
/** Tramo [inicio, fin) del texto ORIGINAL que coincide con la búsqueda. */
export interface Coincidencia {
  inicio: number
  fin: number
}
/**
 * Primera coincidencia sin mayúsculas ni tildes y con los espacios colapsados (§6.5, espec. L862; mismo criterio
 * que normalizarNombre, con la ñ aparte). null si no hay, o si la búsqueda queda vacía al normalizarla.
 */
export function buscarEn(texto: string, busqueda: string): Coincidencia | null
```

**Algoritmo.**

1. Normaliza la búsqueda con `normalizarNombre`.
2. Recorre `texto` por unidades UTF-16 y arma su versión normalizada con un mapa de índices:
   - letras: minúscula, `NFD` y sin marcas U+0300-U+036F, salvo ñ y Ñ, que quedan como ñ;
   - espacios: cada tramo es un solo espacio, sin los del principio;
   - marca suelta: si el texto ya viene en `NFD`, se salta y alarga el `fin` del carácter anterior.
3. Busca con `indexOf` y traduce los índices al texto original. Así el resaltado conserva el texto original (crítica D6a-14: «`normalizarNombre` cambia los índices»).

Pruebas (8):

| Texto | Búsqueda | Resultado |
|---|---|---|
| «Álamo» | «ala» | `{0, 3}` |
| «Piedra · 180 carretadas» | «180» | `{9, 12}`; busca también en el dato secundario (espec. L862) |
| «Comida y bebida» | «BEBIDA» | `{9, 15}` |
| «Hobart  Brezal» (dos espacios) | «hobart brezal» | `{0, 14}` |
| «Señor» | «senor» | `null`: la ñ no es n |
| «Señor» | «SEÑ» | `{0, 3}` |
| «Café solo» | «cafe» | `{0, 5}` |
| cualquiera | «   » | `null` |

### 5.4 `src/dominio/dinero/textosEquivalencias.ts` (T7)

```ts
import type { Equivalencias } from './monedas'
/** «1 mm = 100 mo · 1 mo = 10 mp · 1 mp = 10 mb · 1 mb = 10 mc · 1 mc = 10 me · 1 me = 10 mh» (P1, mjs L353). */
export function cadenaDeEquivalencias(eq: Equivalencias): string
/** «1 mo = 10 mp = 100 mb = 1.000 mc»: valores acumulados desde el oro hasta el cobre (P1b, mjs L215). */
export function equivalenciasDesdeOro(eq: Equivalencias): string
```

- Las cifras van con `formatearNumero(n, 0)`, con punto de miles desde 1.000.
- Pruebas (4):
  - las dos cadenas con `EQUIVALENCIAS_POR_DEFECTO`;
  - con `moEnMp: 12` salen «1 mo = 12 mp = 120 mb = 1.200 mc» y «… · 1 mo = 12 mp · …»;
  - los miles con `mmEnMo: 1000` salen como «1 mm = 1.000 mo».

### 5.5 `src/dominio/partidas/orden.ts` y `modelo/resumen.ts` (T8, D-080)

```ts
import type { Dominio } from '../modelo/dominios'
/** El personaje primero; después los asentamientos por su alta y, si empatan, en el orden del documento (D-080, §5). */
export function ordenarDominios(dominios: readonly Dominio[]): Dominio[]
```

- Usa `compararFechas` y `Array.prototype.sort`, que es estable.
- `resumenDePartida` pasa a `dominios: ordenarDominios(documento.dominios).map((d) => d.nombre)` y quita `compararTexto` y `esAsentamiento`, que se quedan sin uso.
- En `resumen.test.ts` cambian dos cosas:
  - el título de la prueba de L65 pasa a «pone el personaje primero y los asentamientos por su alta y, si empatan, en el orden del documento»;
  - la expectativa de L66 pasa a `['Tharan', 'Zarcero', 'Bree', 'Archet']`.
- Pruebas nuevas de `orden.test.ts` (4):
  - el ejemplo da Tharan, Bree, Archet;
  - un empate conserva el orden del documento;
  - el alta posterior va después aunque esté antes en el documento;
  - no muta la entrada.

### 5.6 `src/dominio/partidas/textos.ts` (T8)

```ts
/** Nombre de la partida y del personaje: de 1 a 60 caracteres (EsquemaNombreLibre, comunes.ts L150; D-014). */
export const LARGO_MAXIMO_NOMBRE = 60
/** null o el error del nombre ya recortado: «Escribe un nombre» (J2e, espec. L1452) o «El nombre no puede pasar de 60 letras» (D-088). */
export function errorDeNombre(nombre: string): string | null
/** «Tharan, Bree y Archet»; «Aldric, sin asentamientos»; «Tharan y Bree»; '' si no hay ninguno (P0, mjs L321-322). */
export function textoDominios(nombres: readonly string[]): string
```

Pruebas (7):

- vacío da «Escribe un nombre»;
- solo espacios da «Escribe un nombre»;
- 60 letras da `null`;
- 61 letras da el error;
- `textoDominios` con 1, 2 y 3 nombres, y con `[]`.

### 5.7 `src/dominio/partidas/nueva.ts` (T9)

```ts
import type { Fecha } from '../calendario/fecha'
import type { Edad } from '../calendario/formatoFecha'
import type { FilaMoneda } from '../dinero/saldo'
import type { Equivalencias } from '../dinero/monedas'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'

/** Lo que se escribe en P1 y P1b (§6.1, espec. L251-252). */
export interface DatosPartidaNueva {
  nombre: string
  edad: Edad
  fechaInicial: Fecha
  equivalencias: Equivalencias
  personaje: { nombre: string; descripcion: string }
  /** Solo las filas con cantidad (D-087); las vacías no llegan aquí. */
  bolsa: readonly FilaMoneda[]
}
export interface IdsPartidaNueva {
  partida: Id
  personaje: Id
}
/**
 * El documento de una partida recién creada: sin avances, fechaActual = fechaInicial, el personaje con su bolsa
 * (suma en mh con sumarBolsaInicial, sin «introducido», §3) y las demás colecciones vacías. Lo pasa por
 * EsquemaDocumentoPartida.parse, así que lanza si los datos no son válidos.
 */
export function documentoDePartidaNueva(datos: DatosPartidaNueva, ids: IdsPartidaNueva, ahora: Instante): DocumentoPartida
```

**Qué contiene el documento** (`pantallas-y-datos.md` §5.3; `documento.ts` L43-82):

- `partida`:
  - `id`, `nombre` recortado, `edad` y `equivalencias`;
  - `kgPorSaco: 30` y `diasPorSaco: 30`;
  - `fechaInicial` y `fechaActual` iguales;
  - `creada` y `actualizada` a `ahora`;
  - `versionFormato: VERSION_FORMATO` y `cambiosDesdeUltimoAvance: 0`.
- `dominios`: `[{ id: ids.personaje, tipo: 'personaje', nombre, descripcion? }]`. Si la descripción recortada queda vacía, no se pone.
- `cajas`: `[{ dominioId: ids.personaje, saldoInicial: { base } }]`.
- Las 31 colecciones restantes de `EsquemaEstadoPartida`, vacías.
- `avances: []`.

Las colecciones se escriben **una a una**. Si las fases 4 o 5 añaden alguna a `EsquemaEstadoPartida`, `tsc -b` falla al fusionar, y así debe ser (§12).

Pruebas (5):

- el resultado pasa `EsquemaDocumentoPartida` y `validarCoherenciaInterna` da `[]`;
- 38 mo, 25 mp, 40 mb y 18 mc dan `saldoInicial.base === 4091800` (espec. L280);
- una bolsa vacía da `base 0`;
- los nombres se recortan y una descripción vacía no se guarda;
- `resumenDePartida` del resultado da `dominios ['Tharan']` y `hayAvances false`.

### 5.8 `src/dominio/partidas/datos.ts` (T9, D-089)

```ts
/** Lo que cambia «Editar partida» (§6.1, espec. L266; §6.4 L660). */
export interface DatosDePartida {
  nombre: string
  edad: Edad
  fechaInicial: Fecha
}
export type ResultadoDatosDePartida =
  | { ok: true; documento: DocumentoPartida; cambio: boolean }
  | { ok: false; error: string }
/** Ayuda bajo la fecha y la Edad, y error si se intentan cambiar con avances (D-089). */
export const MENSAJE_SOLO_ANTES_DEL_AVANCE = 'Solo se pueden cambiar antes del primer avance.'
/** La fecha nueva dejaría algún registro fuera de la partida (validarCoherenciaInterna; D-089). */
export const MENSAJE_FECHA_FUERA = 'La fecha inicial no se puede cambiar: algún registro quedaría fuera de la partida'
export function aplicarDatosDePartida(documento: DocumentoPartida, datos: DatosDePartida): ResultadoDatosDePartida
```

**Orden de las comprobaciones.**

1. `errorDeNombre(nombre)`.
2. `validarFecha(fechaInicial)`.
3. Si `hayAvances(partida)` y cambian la fecha o la Edad: `MENSAJE_SOLO_ANTES_DEL_AVANCE`.
4. Si no cambia nada (nombre recortado, fecha y Edad iguales): `{ ok: true, documento }` con **la misma referencia** y `cambio: false`.
5. Si cambia la fecha:
   - `fechaActual` pasa a la nueva fecha inicial;
   - el `alta` de cada asentamiento pasa a la nueva fecha inicial;
   - si `validarCoherenciaInterna(siguiente)` da algún problema: `MENSAJE_FECHA_FUERA`.
6. `{ ok: true, documento: siguiente, cambio: true }`.

No toca `actualizada` ni el contador, porque los pone el guardado (§5.10).

Pruebas (8):

- cambiar solo el nombre;
- nombre con espacios alrededor que queda igual: `cambio false`, misma referencia;
- nombre vacío;
- fecha no válida («Abril de 1640 tiene 30 días»);
- con avances (el ejemplo) cambiar la fecha da el error y cambiar solo el nombre funciona;
- sin avances y con un asentamiento: cambiar la fecha mueve `fechaActual` y `alta`;
- sin avances y con un movimiento del día: cambiar la fecha da `MENSAJE_FECHA_FUERA`;
- nunca muta la entrada.

### 5.9 `src/dominio/calendario/formularioFrecuencia.ts` (T10, D-095, D-096)

```ts
import type { Fecha } from './fecha'
import type { Edad } from './formatoFecha'
import type { Recurrencia } from './recurrencia'

export type TipoRecurrencia = Recurrencia['tipo']
/** Último día que la app sabe representar (§4 «Fecha máxima», D-001). */
export const FECHA_MAXIMA: Fecha = { anio: 9999, mes: 12, dia: 31 }
/** Textos de los tipos (§6.5 n.º 13, espec. L891). */
export const TEXTO_TIPO: Readonly<Record<TipoRecurrencia, string>> = {
  diaria: 'Cada día', cadaNDias: 'Cada N días', semanal: 'Semanal', quincenal: 'Cada dos semanas', mensual: 'Mensual',
  cadaNMeses: 'Cada N meses', trimestral: 'Trimestral', anual: 'Anual', unica: 'Una sola vez',
}
/** Grupos «Habituales · Personalizadas» (§6.5 n.º 13; reparto de D-095). */
export const GRUPOS_TIPO: readonly { nombre: string; tipos: readonly TipoRecurrencia[] }[] = [
  { nombre: 'Habituales', tipos: ['diaria', 'semanal', 'quincenal', 'mensual', 'trimestral', 'anual'] },
  { nombre: 'Personalizadas', tipos: ['cadaNDias', 'cadaNMeses', 'unica'] },
]
/** La fecha, o el 31/12/9999 si lo pasa (D-096). */
export function recortarAFechaMaxima(f: Fecha): Fecha
/** Valor al elegir un tipo (D-095; espec. L832-839); conserva el día del mes (y el mes en anual) de `anterior` si lo tenía. */
export function frecuenciaInicial(tipo: TipoRecurrencia, hoy: Fecha, anterior?: Recurrencia): Recurrencia
/** Cambia N; en Cada N días y Cada N meses recalcula «Primera vez» si N es válido (espec. L833; D-095). */
export function conN(r: Recurrencia, n: number, hoy: Fecha): Recurrencia
/** Cambia el día del mes; en Cada N meses y Trimestral recalcula «Primera vez» (espec. L833-834). */
export function conDiaMes(r: Recurrencia, diaMes: number, hoy: Fecha): Recurrencia
/** Errores por campo; el posterior a hoy solo si no hay `guardada` o si la frecuencia cambió (espec. L841-842). */
export interface ErroresFrecuencia {
  n?: string
  diaSemana?: string
  diaMes?: string
  mes?: string
  fecha?: string
}
export function erroresDeFrecuencia(r: Recurrencia, hoy: Fecha, edad: Edad, guardada?: Recurrencia): ErroresFrecuencia
export function hayErroresDeFrecuencia(e: ErroresFrecuencia): boolean
/** Próxima ocurrencia estrictamente posterior a hoy, o null si no hay, no es válida o pasa del 31/12/9999. */
export function proximaFecha(r: Recurrencia, hoy: Fecha): Fecha | null
```

**Valores de `frecuenciaInicial`** (D-095). Todas las fechas pasan por `recortarAFechaMaxima`. `primeraDelMes(hoy, k, d)` es el día `d` del mes de `sumarMeses(hoy con día 1, k)`, con `diaEnMes`.

| Tipo | Valor inicial |
|---|---|
| `diaria` | sin `inicio` |
| `cadaNDias` | `n: 2`, `primera: hoy + 2` |
| `semanal` | `diaSemana: diaDeLaSemana(hoy)`, sin `inicio` |
| `quincenal` | `primera: hoy + 14` |
| `mensual` | `diaMes` |
| `cadaNMeses` | `n: 2`, `diaMes`, `primera: primeraDelMes(hoy, 2, diaMes)` |
| `trimestral` | `diaMes`, `primera: primeraDelMes(hoy, 3, diaMes)` |
| `anual` | `mes` (el de `anterior` si era anual; si no, `hoy.mes`) y `diaMes` |
| `unica` | `fecha: hoy + 1` |

El `diaMes` es el de `anterior` si lo tenía (mensual, cadaNMeses, trimestral o anual); si no, `hoy.dia`.

**Reparto de los mensajes de `validarRecurrencia`** (`recurrencia.ts` L280-323) por campo:

| El mensaje… | Campo |
|---|---|
| empieza por «N debe ser» | `n` |
| empieza por «El día de la semana» | `diaSemana` |
| empieza por «El día del mes», o termina en «no tiene N días» (anual) | `diaMes` |
| es «El mes debe estar entre 1 y 12» | `mes` en anual; si no, `fecha` |
| cualquier otro (los de `validarFecha` y «La primera vez debe caer…») | `fecha` |

Vale el primer mensaje de cada campo.

**Fecha que se comprueba como posterior**: `primera` (cadaNDias, quincenal, cadaNMeses y trimestral), `inicio` si lo hay (diaria, semanal, mensual y anual) o `fecha` (única). Si no es posterior a `hoy` y el campo `fecha` aún no tiene error: «Tiene que ser posterior al 12 de abril de 1640 T.E.», con `formatearFecha(hoy, { edad })`.

**Pruebas (16).** Casi todas con `hoy` = 12/4/1640:

1. Cada 2 meses con día 15 da el 15/6/1640 (espec. L834).
2. Cada 2 meses con día 31 da el 30/6/1640.
3. Trimestral da el día 12 y el 12/7/1640 (L837).
4. De Trimestral a Cada N meses, con N = 2, conserva el día 12 y da el 12/6/1640.
5. Con hoy = 31/1/1640, Trimestral da el 30/4/1640.
6. Cada N días: N 2 y primera 14/4; `conN(…, 30)` da el 12/5.
7. Cada dos semanas: el 26/4.
8. Semanal da el día 3 (jueves); Mensual da el día 12; Anual da abril y 12; Única da el 13/4.
9. Recorte: con hoy = 28/12/9999, Cada N meses da el 31/12/9999 y el error «La primera vez debe caer el día 28 del mes».
10. «Primera vez» cambiada a mano a un día distinto da `fecha: 'La primera vez debe caer el día 15 del mes'`.
11. N = 13 en Cada N meses da `n: 'N debe ser un número entero de 2 a 12'`.
12. Anual con abril y 31 da `diaMes: 'Abril no tiene 31 días'`.
13. Única el 12/4 (hoy) da `fecha: 'Tiene que ser posterior al 12 de abril de 1640 T.E.'`.
14. La misma regla con `guardada` igual no comprueba el posterior; si cambia `diaMes`, sí.
15. Reparto: una tabla con **todos** los mensajes que puede dar `validarRecurrencia` (los 11 de `recurrencia.ts` más los tres de `validarFecha`) y el campo que toca a cada uno. Si aparece un mensaje nuevo sin campo, la prueba falla (crítica D6a-23).
16. `proximaFecha`:
    - Semanal con día 5 (sábado) da el 14/4;
    - Única ya pasada da `null`;
    - Anual el 31/12 con hoy = 31/12/9999 da `null`.

### 5.10 `src/datos/resumenes.ts` y `src/datos/datosDePartida.ts` (T11)

```ts
/** La fila de P0 de una partida (para «Última copia exportada» en P6 y J2d), o undefined. */
export async function leerResumen(db: BaseDeDatos, id: Id): Promise<ResumenPartida | undefined>

/**
 * «Editar partida»: lee el documento, aplica los datos (aplicarDatosDePartida) y, si algo cambió, suma 1 a
 * cambiosDesdeUltimoAvance (D-038) y guarda con guardarPartida. Sin cambios no escribe nada. Lanza
 * «No hay ninguna partida con el id «…»» si no existe. Al fusionar la fase 3, la 6b lo reescribe sobre guardarEdicion.
 */
export async function guardarDatosDePartida(
  db: BaseDeDatos,
  id: Id,
  datos: DatosDePartida,
  ahora: Instante,
): Promise<ResultadoDatosDePartida>
```

- Pruebas de `resumenes.test.ts` (2): lee el resumen del ejemplo guardado; `undefined` si no existe.
- Pruebas de `datosDePartida.test.ts` (4):
  - renombrar el ejemplo cambia el resumen de P0 y sube el contador a 1;
  - sin cambios no cambia `actualizada`;
  - un error no escribe nada;
  - un id que no existe lanza.

Todas con `baseDePrueba()`, en el proyecto `nodo`.

---

## 6. Componentes comunes

Las medidas salen del generador; se cita la línea en cada caso. Todos usan las variables del §3. Los tipos que se repiten son estos:

```ts
import type { ReactNode } from 'react'
import type { NombreIcono } from '../iconos/trazos'
```

### 6.1 Iconos (T12)

```ts
// iconos/trazos.ts: los 42 trazos de mjs L30-73, literales (casa, calendario, reloj_arena, reloj, usuario, torre,
// monedas, bolsa, balanza, repetir, maletin, libro, pergamino, ajustes, tesoro, gente, ficha, trigo, carro, escudo,
// bandera, alerta, check, abajo, derecha, izquierda, mas, cambio, bajar, subir, x, buscar, sube, baja, deshacer,
// editar, resumen, martillo, info, candado, enlazado, huella). Los informes dicen 41: son 42.
export const ICONOS = { casa: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>', /* … */ } as const
export type NombreIcono = keyof typeof ICONOS

// iconos/Icono.tsx
export interface PropsIcono {
  nombre: NombreIcono
  tamano?: number // 20 (mjs L74)
  color?: string // 'currentColor'
}
export function Icono(props: PropsIcono)

// iconos/Emblema.tsx
export function Emblema(props: { tamano: number }) // estrella y círculo de mjs L76-77, trazo 1.4 en var(--oro)
export function Filete(props: { ancho: number }) // mjs L78-79; solo en P0
```

- El icono es un `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">` con el trazo por `dangerouslySetInnerHTML`: son cadenas constantes de la app.
- Pruebas (4):
  - `ICONOS` tiene 42 claves;
  - el SVG va oculto a la accesibilidad y con 20 px por defecto;
  - `tamano` y `color` se aplican;
  - el Emblema lleva el círculo relleno.

### 6.2 Boton, BotonIcono y Enlace (T13)

```ts
export type VarianteBoton = 'principal' | 'secundario' | 'fantasma' | 'peligro' | 'peligroLleno'
export interface PropsBoton {
  children: ReactNode
  variante?: VarianteBoton // 'secundario', como btn() (mjs L106)
  icono?: NombreIcono // 18 px a la izquierda, con 8 px de hueco (mjs L114)
  alPulsar?: () => void
  desactivado?: boolean
  tipo?: 'button' | 'submit' // 'button'
  ancho?: string // CSS
}
export interface PropsBotonIcono {
  icono: NombreIcono // 20 px (mjs L117)
  etiqueta: string // aria-label
  variante?: 'secundario' | 'fantasma' // 'secundario' (mjs L116)
  alPulsar?: () => void
  desactivado?: boolean
}
export interface PropsEnlace {
  children: ReactNode
  alPulsar: () => void
  icono?: NombreIcono
}
```

**Medidas** (mjs L106-119):

- Botón: `<button>` de 44 px de alto, con relleno `0 18px`, radio 6, 15 px en peso 600, `white-space: nowrap` y `data-variante`.
- Colores por variante:

| Variante | Fondo | Texto | Borde |
|---|---|---|---|
| `principal` | `oro-oscuro` | `vitela` | `oro-oscuro` |
| `secundario` | `vitela` | `tinta` | `borde` |
| `fantasma` | transparente | `tinta` | transparente |
| `peligro` | transparente | `lacre` | `lacre` |
| `peligroLleno` | `lacre` | `vitela` | `lacre` |

- BotonIcono: cuadrado de 44 × 44.
- Enlace: `<button>` sin fondo, de 44 px, relleno `0 12px`, 15 px en peso 600, en `oro-oscuro`; con *hover* pasa a `tinta` (mjs L96).

Pruebas (7):

- nombre accesible;
- las cinco variantes en `data-variante`;
- `secundario` por defecto;
- desactivado no llama a `alPulsar` y lleva `disabled`;
- `tipo='submit'`;
- el BotonIcono tiene como nombre su etiqueta;
- el Enlace llama a `alPulsar`.

### 6.3 Panel, CabeceraPantalla y Nota (T14)

```ts
export interface PropsPanel {
  titulo: string
  accion?: ReactNode
  relleno?: string // '4px 20px 10px' (mjs L140)
  children: ReactNode
}
export interface PropsCabeceraPantalla {
  titulo: string
  subtitulo?: string
  acciones?: ReactNode
}
export interface PropsNota {
  children: ReactNode
  icono?: NombreIcono // 'info'
}
```

**Medidas** (mjs L140-146):

- Panel: `<section aria-labelledby>` en `vitela`, con borde de 1 px `borde` y radio 8.
- Cabecera del panel: mínimo 56 px, relleno `6px 12px 4px 20px` y `border-bottom: var(--filete)`.
- Título del panel: `<h2>` en Cormorant 23 px, peso 600.
- CabeceraPantalla (mjs L133-139): subtítulo de 14 px en `tinta-suave` y `<h1>` en Cormorant 36 px, peso 600, interlineado 1.1; acciones a la derecha, con 10 px de hueco.
- Nota (mjs L187): icono de 16 px y texto de 14 px en `tinta-suave`, con 8 px de hueco.

Pruebas (3):

- el Panel es una región con el nombre de su título y pinta su acción;
- la CabeceraPantalla tiene un `h1` y un subtítulo;
- la Nota lleva `info` por defecto y el icono que se le pase.

### 6.4 Tabla y ListaPares (T14)

```ts
export interface ColumnaTabla {
  titulo: string
  ancho?: string // CSS; sin él, minmax(0, 1fr)
  derecha?: boolean // importes
}
export interface PropsTabla {
  etiqueta: string // aria-label
  columnas: readonly ColumnaTabla[]
  filas: readonly (readonly ReactNode[])[]
  altoFila?: number // 44
  total?: readonly ReactNode[] // fila con filete doble y peso 600
}
export interface FilaPar {
  etiqueta: ReactNode
  valor: ReactNode
  sub?: ReactNode
}
export interface PropsListaPares {
  filas: readonly FilaPar[]
  altoFila?: number // 44; 54 con sub (mjs L158)
}
```

**Medidas** (mjs L161-172):

- `<table>` con la cabecera en `<th scope="col">` de 38 px, 13 px en peso 600, mayúsculas, `letter-spacing: 0.04em` y `tinta-suave`.
- Celdas de 15 px en `tinta`, con separador de 1 px `borde` salvo en la última fila y `font-variant-numeric: tabular-nums`.
- ListaPares (mjs L158-160): un `<dl>` de filas con la etiqueta a la izquierda (y `sub` de 13 px debajo) y el valor a la derecha.

Pruebas (4):

- cabeceras como `columnheader`;
- filas y celdas;
- la columna `derecha` lleva `data-derecha`;
- la fila `total`;
- la ListaPares enseña cada par.

### 6.5 EtiquetaCampo, CampoTexto, MensajeError, useTocados y Casilla (T15)

```ts
export interface PropsEtiquetaCampo {
  etiqueta: string
  idControl?: string // para <label htmlFor>
  ayuda?: string
  error?: string | null
  children: ReactNode
}
export interface PropsCampoTexto {
  etiqueta: string
  valor: string
  alCambiar: (texto: string) => void
  alSalir?: () => void
  ayuda?: string
  error?: string | null // se enseña tal cual (quien lo usa decide si el campo está tocado)
  maximo?: number // maxLength
  modoTeclado?: 'text' | 'numeric' | 'decimal' // inputMode (D-C3)
  desactivado?: boolean
  alinear?: 'izquierda' | 'derecha'
  sufijo?: string // «días», «meses»
  placeholder?: string
  etiquetaOculta?: boolean // la etiqueta sigue siendo el nombre accesible
}
export function MensajeError(props: { id?: string; children: ReactNode })

// comunes/tocados.ts
/** Qué campos ha tocado ya el jugador (D-094): el error solo se enseña en esos. */
export function useTocados<C extends string>(): {
  tocado: (campo: C) => boolean
  tocar: (campo: C) => void
  tocarTodos: (campos: readonly C[]) => void
}

export interface PropsCasilla {
  etiqueta: string
  marcada: boolean
  alCambiar: (marcada: boolean) => void
  desactivada?: boolean
}
```

**Medidas** (mjs L191-194, L1369-1372):

- Etiqueta: 14 px en peso 600, con 6 px de hueco hasta el control.
- Control: 48 px de alto, relleno `0 14px`, fondo `campo`, borde de 1 px `borde`, radio 6 y 16 px.
- Ayuda: 13 px en `tinta-suave`.
- MensajeError: icono `alerta` de 16 px y texto de 14 px en `lacre`, enlazado al control con `aria-describedby`; el control lleva `aria-invalid`.
- Casilla (mjs L1371-1372): `<input type="checkbox">` real, oculto a la vista, y una caja de 24 × 24 con radio 5.
  - Borde de 2 px en `oro-oscuro` si está marcada; si no, en `tinta-suave`, o en `borde` si además está desactivada.
  - Marcada: fondo `oro-oscuro` y `check` de 16 px en `vitela`.
  - Fila de 44 px como mínimo, texto de 15 px.
  - Desactivada: opacidad 0.6.

Pruebas:

- `Campo.test.tsx` (5):
  - la etiqueta da nombre al campo;
  - teclear llama a `alCambiar`;
  - un error da `aria-invalid` y el mensaje con su icono;
  - `maximo` pone `maxLength`;
  - `useTocados` solo enseña el error tras `alSalir`.
- `Casilla.test.tsx` (3):
  - rol `checkbox` con su nombre;
  - tocar cambia el valor;
  - desactivada no cambia.

### 6.6 Aviso (T16)

```ts
export type TonoAviso = 'lacre' | 'oro' | 'bosque' | 'neutro'
export interface PropsAviso {
  tono: TonoAviso
  children: ReactNode
  icono?: NombreIcono // por defecto 'alerta' en lacre y 'reloj' en los demás (mjs L185)
  accion?: ReactNode // un Enlace a la derecha
}
```

**Medidas** (mjs L183-186):

- Mínimo 48 px, relleno `2px 6px 2px 16px`, radio 8, 12 px de hueco, icono de 20 px y texto de 15 px en peso 600.
- Colores de cada tono (fondo, texto y borde), según `TONO` (mjs L22):

| Tono | Fondo | Texto | Borde |
|---|---|---|---|
| `lacre` | `lacre-tinte` | `lacre` | `lacre-borde` |
| `oro` | `oro-tinte` | `oro-oscuro` | `oro-borde` |
| `bosque` | `bosque-tinte` | `bosque` | `bosque-borde` |
| `neutro` | `pliegue` | `tinta-suave` | `neutro-borde` |

- El color nunca va solo: siempre lleva icono y texto (espec. L1404).
- El tono se lee en `data-tono`.

Pruebas (4):

- los cuatro tonos;
- el icono por defecto según el tono;
- el icono forzado (`calendario` en P1);
- la acción.

### 6.7 Segmentos (T17)

```ts
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
```

- Medidas (mjs L1365-1368): contenedor en `pliegue`, con relleno de 4 px, radio 8 y 6 px de hueco. Cada opción tiene `flex: 1`, 44 px, radio 6, 15 px y **peso 600 en todas** (crítica C4).
  - Activa: fondo `vitela`, borde de 1 px `oro` y texto `tinta`.
  - Inactiva: borde transparente y texto `tinta-suave`.
- Accesibilidad: `role="radiogroup"` etiquetado. Cada opción es un `<button role="radio" aria-checked>` con *roving tabindex*: las flechas izquierda y derecha mueven la selección.
- Pruebas (5):
  - `radiogroup` con su nombre;
  - la opción activa está `checked`;
  - tocar llama a `alCambiar`;
  - la flecha derecha pasa a la siguiente y la de la última vuelve a la primera;
  - desactivado no cambia.

### 6.8 Dialogo, diálogo apilado y DialogoMensaje (T18)

```ts
// comunes/nivelDialogo.ts
export const MAXIMO_DIALOGOS = 2 // espec. L219
export const ContextoNivelDialogo: React.Context<number> // 0 fuera de todo diálogo
export function useNivelDialogo(): number

// comunes/Dialogo.tsx
export interface PropsDialogo {
  titulo: string
  subtitulo?: string
  ancho: number // px
  abierto: boolean
  alCancelar: () => void // la x y Esc equivalen a Cancelar (espec. L945)
  pieIzquierda?: ReactNode
  pieDerecha?: ReactNode
  children: ReactNode
}
export interface PropsDialogoMensaje {
  titulo: string
  lineas: readonly string[]
  abierto: boolean
  alAceptar: () => void
}
```

**Comportamiento.**

- Es un `<dialog>` nativo que se muestra solo si `abierto`.
- Al montarse llama a `showModal()` si no está ya `open`, por StrictMode (crítica §5.1). Al desmontarse, `close()`.
- El evento `cancel` hace `preventDefault()` y llama a `alCancelar`.
- Clicar el velo **no** cierra: se perderían los datos.
- Nombre accesible: `aria-labelledby` al título; el subtítulo va en `aria-describedby`.
- Cada Dialogo provee `ContextoNivelDialogo` con su nivel (el de fuera + 1).
  - Nivel 2: lleva `data-apilado="true"` y se ancla a 24 px del borde superior, centrado (mjs L278). Su `::backdrop` es `rgba(43, 33, 24, 0.35)` y su sombra `--sombra-dialogo-apilado`. El de abajo sigue montado con sus datos (espec. L219-220).
  - Nivel 3: lanza `Error('Como mucho hay dos diálogos visibles (§5)')`.
- Alto máximo: `calc(100dvh - 48px)`, con el cuerpo desplazable (espec. L827).

**Medidas** (mjs L265-273):

- Caja en `vitela`, con borde de 1 px `borde`, radio 10, `--sombra-dialogo` y `::backdrop` `rgba(43, 33, 24, 0.55)`.
- Cabecera: relleno `18px 16px 14px 28px` y `border-bottom: var(--filete)`.
  - Título: `<h2>` en Cormorant 32 px, peso 600, interlineado 1.15.
  - Subtítulo: 15 px en `tinta-suave`.
  - BotonIcono `x` en `fantasma` con la etiqueta «Cerrar».
- Pie: relleno `14px 20px 14px 28px`, filete arriba de 1 px `borde` y fondo `papel`; la izquierda a un lado y la derecha con 10 px de hueco.
- DialogoMensaje: 620 px, una línea `<p>` de 15 px por cada una y el pie derecho con `Boton` principal «Aceptar». Su «Cancelar» (la x o Esc) equivale a Aceptar.

**Pruebas (8):**

1. Abre con `open` y con el nombre de su título.
2. La x llama a `alCancelar`.
3. `cancel` (Esc) llama a `alCancelar` y no cierra solo.
4. Con `abierto={false}` no pinta nada.
5. Un Dialogo dentro de otro lleva `data-apilado` y el de abajo no.
6. Al cerrar el de arriba, el de abajo conserva lo escrito en su campo.
7. Un tercer nivel lanza.
8. DialogoMensaje enseña las líneas y «Aceptar» llama a `alAceptar`.

### 6.9 ConfirmacionEliminar, J2d (T19)

```ts
import type { FilaPar } from './Tabla'
export interface PropsConfirmacionEliminar {
  titulo: string // «¿Eliminar «La Sombra del Este»?»
  subtitulo: string // «Partida · 12 de abril de 1640 T.E.»
  resumen: readonly FilaPar[] // caja de resumen (mjs L1384-1385)
  avisoAvance?: string // aviso oro con reloj de arena; la 6a no lo usa (se rellena desde la fase 7)
  abierto: boolean
  alCancelar: () => void
  alEliminar: () => void
  children?: ReactNode // entre el aviso y la casilla: notas y, en fases futuras, casillas de devolución
}
```

**Estructura, según la vista de J2d** (`PersonajeEliminarMovimiento`, mjs L1798-1813; crítica C1):

- Dialogo de 620 px.
- Cuerpo con relleno `18px 28px 20px` y 14 px de hueco:
  1. caja de resumen: ListaPares con filas de 40 px, sobre `papel`, con borde de 1 px `borde`, radio 8 y relleno `0 16px`;
  2. `Aviso` oro con `reloj_arena` (opcional);
  3. `children`;
  4. `Casilla` «Sé que esto no se puede deshacer»;
  5. `Nota` «El botón rojo no se activa hasta marcar la casilla.».
- Pie derecho: `Boton` secundario «Cancelar» y `Boton peligroLleno` con icono `x`, «Eliminar definitivamente», desactivado hasta marcar la casilla (espec. L697).
- La casilla empieza sin marcar cada vez que se abre.
- «Cancelar» solo llama a `alCancelar`: quien lo usa decide si reabre el formulario de origen (espec. L221).

**Pruebas (5):**

1. El título, el subtítulo y el resumen.
2. «Eliminar definitivamente» está desactivado hasta marcar la casilla; después llama a `alEliminar`.
3. «Cancelar» llama a `alCancelar` y no a `alEliminar`.
4. Al reabrirlo, la casilla vuelve a estar sin marcar.
5. Con `avisoAvance`, sale un aviso de `data-tono="oro"`.

### 6.10 SelectorConBuscador (T20)

```ts
export interface OpcionSelector<V extends string> {
  valor: V
  texto: string
  detalle?: string // dato secundario, también buscable (espec. L862)
  tuya?: boolean // marca «tuya» (espec. L870)
}
export interface GrupoSelector<V extends string> {
  nombre?: string // sin nombre, sin etiqueta de grupo
  opciones: readonly OpcionSelector<V>[]
}
export interface AltaSelector {
  texto: string // «Nueva categoría»
  alPedir: (busqueda: string) => void // la 6a no lo conecta a nada (alta rápida y completa: fase 9)
}
export interface PropsSelectorConBuscador<V extends string> {
  etiqueta: string
  etiquetaOculta?: boolean
  valor: V | null
  textoSinValor?: string // «Elige una categoría» (anotación de P7b, mjs L1907)
  grupos: readonly GrupoSelector<V>[]
  alCambiar: (valor: V) => void
  sustantivo: { singular: string; plural: string } // contador: «27 categorías», «1 categoría»
  recientes?: readonly V[] // grupo «Recientes»; la 6a lo deja vacío (fase 9)
  filtro?: { todas: OpcionSelector<V> } // modo filtro (espec. L871; D-C4)
  alta?: AltaSelector
  alinear?: 'izquierda' | 'derecha' // espec. L859
  ayuda?: string
  error?: string | null
  desactivado?: boolean
}
```

**Campo cerrado.**

- Es un `<button type="button" role="combobox" aria-haspopup="listbox" aria-expanded aria-controls aria-labelledby={idEtiqueta}>`.
- Mide 48 px, con fondo `campo`, borde de 1 px `borde`, radio 6, 16 px, el texto de la opción elegida (o `textoSinValor` en `tinta-suave`) y la flecha `abajo` de 18 px en `tinta-suave`.
- Abierto: borde de 2 px `oro` y flecha en `oro-oscuro` (mjs L1396; crítica C2).

**Panel** (mjs L1397-1411; espec. L859-868):

- Posición: `position: absolute`, a 6 px bajo el campo, con `min-width: max(400px, 100%)` y alineado a la izquierda o a la derecha.
- Aspecto: fondo `vitela`, borde de 1 px `borde`, radio 8 y `--sombra-flotante`.
- **Buscador**: `<input type="search" aria-label="Buscar" placeholder="Buscar">` de 48 px, con margen de 8 px, fondo `campo`, borde de 1 px `oro` y radio 6.
  - Lleva el icono `buscar` de 18 px y, a la derecha, el contador en 13 px `tinta-suave` con cifras tabulares. Con búsqueda, además, una x de 16 px con la etiqueta «Borrar la búsqueda».
  - Con **más de 12** opciones recibe el foco al abrir; con 12 o menos, no (espec. L860; se cuentan las opciones sin repetir las de «Recientes»).
- **Contador**: sin búsqueda, «N {plural}» («1 {singular}» si solo hay una); con búsqueda, «M de N» (L861).
- **Lista**: `role="listbox"` con `aria-label` = etiqueta, relleno `0 8px 6px` y un alto máximo de 352 px (8 filas de 44 px, espec. L865) con desplazamiento interno.
  - El degradado del pie se hace solo con CSS: `background: linear-gradient(var(--vitela) 30%, transparent) top, linear-gradient(transparent, var(--vitela) 70%) bottom` con `background-attachment: local, scroll`, o una técnica equivalente sin JavaScript.
- **Grupos**: `role="group"` con `aria-label`; la etiqueta, en Cinzel 13 px, peso 600, `letter-spacing: 0.08em`, `tinta-suave` y relleno `6px 8px 2px` (mjs L1402; crítica C16).
- **Opciones**: `role="option"` con `aria-selected`, mínimo 44 px, relleno `0 10px`, radio 6 y 15 px.
  - El detalle, a la derecha en 13 px `tinta-suave`; con `tuya`, la palabra «tuya» en 13 px `tinta-suave` junto al detalle.
  - La elegida lleva fondo `oro-tinte` y `check` de 16 px en `oro-oscuro` (mjs L1405).
- **Resaltado**: la coincidencia (`buscarEn`, §5.3) va en `<strong>` de peso 700 en `oro-oscuro` (mjs L1389-1391); se busca en `texto` y en `detalle`.
- **Recientes**: sin búsqueda y con `recientes` no vacío, primero un grupo «Recientes» con hasta 5 opciones, en el orden de `recientes`; esas opciones también siguen en su grupo (L864).
- **Sin resultados**: «Nada coincide con “{búsqueda}”» y debajo «Busca en todas las categorías y grupos.» (L866).
- **Modo filtro**: `filtro.todas` va primero, sin grupo, y **no** hay pie de alta aunque llegue `alta` (L871; espec. L928).
- **Pie de alta** (patrón 1, espec. L925-938). Solo si hay `alta`, no hay `filtro` y `useNivelDialogo() < 2` (L222). Es una fila de 44 px a lo ancho, con fondo `papel`, filete de 1 px `borde` arriba e icono `mas` de 16 px.
  - Sin búsqueda: `{texto}`.
  - Con búsqueda: `{texto} “{busqueda recortada}”`. Si la búsqueda tiene más de 16 caracteres, se deja en los 16 primeros más «…» (L933).
  - Con resultados: un enlace en `oro-oscuro`, a la izquierda (L934).
  - Sin resultados: un `Boton` principal de 44 px con 8 px de margen a cada lado (L935).
  - Si una opción coincide exactamente con la búsqueda (`mismoNombre`), no hay acción: el pie dice «“{texto de la opción}” ya existe» y la opción sale resaltada (L936).
  - Al tocar la acción, el panel se cierra **sin** cambiar el valor y se llama a `alPedir(busqueda)` (L938).
- **Cerrar**: elegir una opción llama a `alCambiar` y cierra. Esc o tocar fuera (`pointerdown` en el documento) cierran sin cambiar nada y devuelven el foco al campo.
- **Fuera de la 6a**: el alto con teclado abierto (espec. L868) es de la fase 9, porque su teclado en pantalla también lo es.

**Pruebas (16):**

1. El campo cerrado enseña la opción elegida o `textoSinValor`.
2. Al tocarlo se abre el `listbox` con las etiquetas de grupo.
3. Con 7 opciones el buscador no tiene el foco.
4. Con 13 opciones sí lo tiene.
5. El contador: «7 monedas», «1 moneda» y «5 de 27» al buscar.
6. La búsqueda no distingue mayúsculas ni tildes y mira también el detalle («180»).
7. Resaltado: «ala» sobre «Álamo» deja `<strong>Ála</strong>mo`.
8. Sin resultados salen los dos textos.
9. Elegir llama a `alCambiar` y cierra.
10. La opción actual está `aria-selected` y lleva `check`.
11. «Recientes» sale arriba (hasta 5) y no con búsqueda.
12. El modo filtro pone «Todas» primero y no tiene pie aunque haya `alta`.
13. Pie: «Nueva categoría», «Nueva categoría “posada”» y el recorte a 16 + «…»; `alPedir` con la búsqueda y el valor sin cambiar.
14. Sin resultados, el pie es un botón principal.
15. Coincidencia exacta: «“Alojamiento” ya existe», sin botón.
16. Esc y tocar fuera cierran; dentro de un diálogo apilado (nivel 2) no hay pie.

### 6.11 CampoImporte, FilaImporte y ResumenOro (T21)

```ts
// comunes/leerImporte.ts
import type { Moneda, Equivalencias } from '../../dominio/dinero/monedas'
export interface ValorImporte {
  cantidad: string
  moneda: Moneda
}
export type LecturaImporte =
  | { tipo: 'vacio' }
  | { tipo: 'valido'; base: number }
  | { tipo: 'invalido'; error: string } // «La cantidad tecleada no es válida» (comunes.ts L83)
/** aBase dentro de try/catch: admite coma o punto, hasta 6 decimales y «,6» (importe.ts L37). */
export function leerImporte(v: ValorImporte, eq: Equivalencias): LecturaImporte

// comunes/CampoImporte.tsx
export interface PropsFilaImporte {
  valor: ValorImporte
  alCambiar: (v: ValorImporte) => void
  equivalencias: Equivalencias
  sufijoAccesible?: string // « de la fila 2» → «Cantidad de la fila 2», «Moneda de la fila 2», «Quitar la fila 2»
  alQuitar?: () => void // la x de la bolsa (mjs L1557)
  error?: string | null
}
export interface PropsCampoImporte extends Omit<PropsFilaImporte, 'sufijoAccesible' | 'alQuitar'> {
  etiqueta: string // «Importe» (mjs L1383)
  ayuda?: string
}

// comunes/ResumenOro.tsx
export interface PropsResumenOro {
  etiqueta: string // «Bolsa inicial» → «Bolsa inicial en monedas de oro» (mjs L214)
  base: number
  equivalencias: Equivalencias
}
```

**Fila** (mjs L1377-1382): rejilla `110px minmax(0, 1fr) 150px`, más `44px` si hay `alQuitar`, con 10 px de hueco.

1. **Cantidad**: `<input inputMode="decimal">` de 48 px, alineado a la derecha, con cifras tabulares.
2. **Moneda**: SelectorConBuscador (n.º 1, espec. L879) sin grupos ni altas.
   - Las opciones van de `MONEDAS` con el texto «Oro · mo» (`NOMBRE_MONEDA` · abreviatura; mjs L1557) y como detalle su valor en oro, `formatearOro(valorEnBase(m, eq), eq)` («100 mo», «0,1 mo»; L879).
   - `sustantivo`: moneda y monedas.
3. **Resultado en oro**: 48 px en `oro-tinte`, con borde de 1 px `oro` y radio 6.
   - Lleva «=» en 14 px de peso 400 y la cifra en 18 px de peso 600 en `oro-oscuro`, con `aria-live="polite"`.
   - La cifra es `formatearOro(base, eq)` si es válido y «—» si está vacío o no es válido.
   - Se recalcula en cada tecla (espec. L119).
4. **x**: BotonIcono `fantasma` para quitar.

El error va debajo de la fila.

**ResumenOro** (mjs L210-216):

- Caja en `vitela`, con borde de 1 px `borde`, radio 10 y relleno `12px 22px`.
- Medallón «mo» de 52 px: fondo `oro-tinte`, borde de 1 px `oro`, Cinzel 16 px de peso 600 en `oro-oscuro`.
- «{etiqueta} en monedas de oro» en 14 px `tinta-suave` y la cifra en 36 px de peso 600, interlineado 1.1, tabular.
- A la derecha, «Equivalencias» y `equivalenciasDesdeOro(eq)` en 14 px `tinta-suave`.

**Pruebas.**

- `CampoImporte.test.tsx` (7):
  1. «25» en plata da «= 2,5 mo».
  2. «,6» en oro da «= 0,6 mo».
  3. «1,1234567» da `invalido` (7 decimales).
  4. Vacío da «—» y ningún error.
  5. Cambiar la moneda recalcula.
  6. El selector de moneda tiene 7 opciones con su valor en oro y sin foco en el buscador.
  7. `alQuitar` desde «Quitar la fila 2».
- `ResumenOro.test.tsx` (2):
  - con 4.091.800 mh enseña «40,918 mo»;
  - la cadena «1 mo = 10 mp = 100 mb = 1.000 mc».

### 6.12 CampoFecha (T22, D-097)

```ts
export interface PropsCampoFecha {
  etiqueta: string
  valor: Fecha | null
  alCambiar: (f: Fecha | null) => void
  hoy: Fecha // fecha de la partida: atajos relativos (espec. L829)
  edad: Edad
  minimo?: Fecha
  maximo?: Fecha // FECHA_MAXIMA
  opcional?: boolean // ofrece «Sin fecha» y enseña «Sin fecha» cerrado
  ayuda?: string
  error?: string | null
  desactivado?: boolean
}
```

**Campo cerrado.**

- Es un `<button type="button" aria-haspopup="dialog" aria-expanded aria-labelledby={idEtiqueta}>` de 48 px.
- Enseña `formatearFecha(valor, { edad })` («12 de abril de 1640 T.E.», mjs L1589) o «Sin fecha», con el icono `calendario` de 18 px en `tinta-suave`.
- Abierto: 2 px `oro`.

**Panel** (`role="dialog"` no modal con `aria-label` = etiqueta; a 6 px bajo el campo, 340 px de ancho y el mismo aspecto que el del selector):

1. `CampoTexto` «Escribe la fecha» con `placeholder="19/04/1640"` e `inputMode="numeric"`. Con Intro, `leerFechaEscrita`:
   - si da `null`: «Escribe la fecha como 19/04/1640»;
   - si no, `validarFecha`, cuyo mensaje sale igual;
   - si está fuera de `[minimo, maximo]`: «Tiene que ser posterior al …» (con `minimo − 1`) o «No puede pasar del 31 de diciembre de 9999»;
   - si vale: `alCambiar` y se cierra.
2. Atajos: `Boton` secundario «Hoy», «Mañana» y «+7 días» (`hoy`, `sumarDias(hoy, 1)` y `sumarDias(hoy, 7)`). **No aparecen** los que quedan fuera de `[minimo, maximo ?? FECHA_MAXIMA]` (espec. L829; D-096).
3. Cabecera del mes:
   - BotonIcono «Mes anterior» (`izquierda`);
   - SelectorConBuscador «Mes» (Enero a Diciembre, `nombreDeMesEnMensaje`);
   - `CampoTexto` «Año» numérico de 4 cifras;
   - BotonIcono «Mes siguiente» (`derecha`).
   - No se puede ir antes de enero del año 1 ni después de diciembre de 9999.
4. Rejilla `role="grid"` con `aria-label` «{mes} de {año}» («abril de 1640»):
   - columnas L, M, X, J, V, S y D: la semana empieza en lunes (§4);
   - un `<button>` por día de 44 × 44, con `aria-label` «12 de abril de 1640» y `aria-pressed` en el elegido;
   - los días fuera de rango, desactivados y con opacidad 0.6 (espec. L829).
5. Con `opcional`: `Boton` fantasma «Sin fecha», que llama a `alCambiar(null)`.

Esc o tocar fuera cierran.

**Pruebas (10):**

1. El campo cerrado formatea con la Edad.
2. «Hoy», «Mañana» y «+7 días» sobre el 12/4/1640.
3. Con hoy = 28/12/9999, «+7 días» no aparece y «Mañana» sí.
4. «19/04/1640» e Intro llaman a `alCambiar({1640,4,19})`.
5. «31/04/1640» da «Abril de 1640 tiene 30 días».
6. «hola» da «Escribe la fecha como 19/04/1640».
7. Con `minimo` = 13/4, el día 12 está desactivado.
8. En abril de 1640, el día 1 cae en la columna del domingo (séptima).
9. «Mes siguiente» pasa a mayo de 1640.
10. `opcional`: «Sin fecha» llama a `alCambiar(null)`.

### 6.13 CampoFrecuencia (T23, D-095)

```ts
export interface PropsCampoFrecuencia {
  etiqueta: string // «Frecuencia»
  valor: Recurrencia
  alCambiar: (r: Recurrencia) => void
  hoy: Fecha
  edad: Edad
  guardada?: Recurrencia // al editar una regla (espec. L841)
  sinUnica?: boolean // producción: sin «Una sola vez» (§6.5 n.º 13)
  etiquetaFecha?: string // formularios de dinero: «Primer pago», «Primer cobro»; un solo campo (espec. L843-846)
}
```

**Composición.** Es un `<fieldset>` con `<legend>` = etiqueta y una rejilla de subcampos que salen según el tipo.

- **Tipo**: SelectorConBuscador con `GRUPOS_TIPO` y `TEXTO_TIPO`, 9 opciones y sin foco. Sin «Una sola vez» si `sinUnica`. `sustantivo`: frecuencia y frecuencias. Al cambiar de tipo: `alCambiar(frecuenciaInicial(tipo, hoy, valor))`.
- **N** (Cada N días y Cada N meses): `CampoTexto` «Cada» numérico de 110 px, con sufijo «días» o «meses»; al cambiar, `conN`.
- **Día de la semana** (Semanal): `Segmentos` «Día de la semana» con «Lun», «Mar», «Mié», «Jue», «Vie», «Sáb» y «Dom» (valores 0-6; espec. L830).
- **Día del mes** (Mensual, Cada N meses, Trimestral y Anual): `CampoTexto` «Día del mes» numérico de 110 px; al cambiar, `conDiaMes`.
- **Mes** (Anual): SelectorConBuscador «Mes».
- **Fecha**: `CampoFecha`.
  - Su etiqueta es `etiquetaFecha` si llega; si no, «Primera vez» (cadaNDias, quincenal, cadaNMeses y trimestral), «Fecha de inicio» (diaria, semanal, mensual y anual, con `opcional` y ayuda «Opcional: no antes de esta fecha») o «Fecha» (única).
  - `minimo = sumarDias(hoy, 1)` solo mientras se compruebe lo posterior.
- **Próxima**: una línea de 13 px en `tinta-suave` con «Próxima: {formatearFechaConDia(f, edad)}» o «Próxima: ninguna» (A7b, mjs L1738; D-095).

Los errores salen de `erroresDeFrecuencia`, cada uno bajo su subcampo, y se enseñan en cuanto el subcampo cambia. Quien lo usa llama también a `erroresDeFrecuencia` para desactivar su botón.

**Pruebas (9):**

1. El selector de tipo enseña los grupos «Habituales» y «Personalizadas».
2. Elegir «Cada N meses» y teclear 15 en el día deja la «Primera vez» en «15 de junio de 1640 T.E.».
3. Trimestral enseña el 12 de julio; al pasar a Cada N meses, el 12 de junio.
4. «Primera vez» a otro día da «La primera vez debe caer el día 12 del mes».
5. Única el 12/4 da «Tiene que ser posterior al 12 de abril de 1640 T.E.».
6. Con `guardada` igual no hay error de fecha pasada.
7. Semanal enseña los 7 segmentos y «Próxima: sábado 14 de abril de 1640 T.E.» con el sábado.
8. `sinUnica` quita «Una sola vez».
9. `etiquetaFecha="Primer pago"` sustituye «Primera vez» y «Fecha de inicio».

### 6.14 CampoFechaInicial y TablaMonedas (T26)

```ts
// comunes/fechaInicial.ts
export interface ValorFechaInicial {
  dia: string
  mes: number
  anio: string
  edad: Edad
}
/** Día y año como enteros (/^\d{1,4}$/; si no, NaN) y el mensaje de validarFecha, o null (espec. L277). */
export function leerFechaInicial(v: ValorFechaInicial): { fecha: Fecha; error: string | null }

// comunes/CampoFechaInicial.tsx
export interface PropsCampoFechaInicial {
  valor: ValorFechaInicial
  alCambiar: (v: ValorFechaInicial) => void
  error?: string | null // uno solo, bajo la fila
  desactivado?: boolean // fecha y Edad (D-089)
  ayuda?: string
}

// comunes/equivalencias.ts
export type TextosEquivalencias = Record<keyof Equivalencias, string>
export function textosDe(eq: Equivalencias): TextosEquivalencias
/** Enteros (/^\d+$/; si no, NaN) y los mensajes de validarEquivalencias (monedas.ts L63-80). */
export function leerEquivalencias(t: TextosEquivalencias): { equivalencias: Equivalencias; errores: string[] }

// comunes/TablaMonedas.tsx
export interface PropsTablaMonedas {
  equivalencias: Equivalencias
  edicion?: { textos: TextosEquivalencias; alCambiar: (campo: keyof Equivalencias, texto: string) => void }
}
```

- **CampoFechaInicial** (mjs L343-346): rejilla `110px minmax(0, 1fr) 140px minmax(0, 1.6fr)` con 14 px de hueco, alineada abajo.
  - «Día»: `CampoTexto` numérico de 2 cifras.
  - «Mes»: SelectorConBuscador n.º 2, de Enero a Diciembre (`nombreDeMesEnMensaje`; espec. L880), con `sustantivo` mes y meses y sin foco.
  - «Año»: numérico de 4 cifras.
  - «Edad»: Segmentos «Segunda · Tercera · Cuarta» (espec. L277).
- **TablaMonedas** (mjs L606-622): Tabla «Monedas» con las columnas «Moneda», «Abrev.» (70 px) y «Equivale a» (170 px, a la derecha), en filas de 44 px (espec. L322).
  - De Mithril a Estaño: la cifra en peso 600 y tabular, seguida de la abreviatura siguiente en una caja de 28 px («100» «mo»).
  - Hierro: «Unidad base» en `tinta-suave`.
  - Con `edicion`, la cifra es un `CampoTexto` numérico de 80 px, alineado a la derecha, con la etiqueta oculta «{Moneda} en {abreviatura siguiente}» («Mithril en mo»).
- Pruebas de `CampoFechaInicial.test.tsx` (5):
  - los cuatro controles con sus nombres;
  - `leerFechaInicial` con 1/enero/1640 no da error;
  - con 31/abril da «Abril de 1640 tiene 30 días»;
  - con el año vacío da «El año debe estar entre 1 y 9999»;
  - `desactivado` desactiva el día, el mes, el año y la Edad.
- Pruebas de `TablaMonedas.test.tsx` (4):
  - las 7 filas en lectura;
  - «Unidad base»;
  - en edición, teclear llama a `alCambiar('moEnMp', '12')`;
  - `leerEquivalencias` con «1» en el oro da «La equivalencia de oro debe ser un número entero de 2 o más».

---

## 7. Marco, navegación y servicios

### 7.1 Servicios (T24)

```ts
// app/servicios.ts
export interface ArchivoParaDescargar {
  nombre: string
  texto: string
}
export interface Servicios {
  db: BaseDeDatos
  ahora: () => Instante
  nuevoId: () => Id
  descargar: (archivo: ArchivoParaDescargar) => void
}
export const ContextoServicios: React.Context<Servicios | null>
/** Los servicios del contexto; lanza «Faltan los servicios de la app» si no hay proveedor. */
export function useServicios(): Servicios

// app/navegador.ts
/** Blob application/json, URL.createObjectURL, <a download> y revokeObjectURL (crítica H4). */
export function descargarArchivo(archivo: ArchivoParaDescargar): void
/** navigator.storage?.persist?.(); false si el navegador no lo tiene (D-098; happy-dom no lo tiene). */
export async function pedirAlmacenamientoPersistente(): Promise<boolean>
/** El texto de un File (`archivo.text()`). */
export async function leerArchivo(archivo: File): Promise<string>

// pruebas/servicios.ts (sin JSX: usa createElement para no romper only-export-components)
/** new Date(2026, 8, 18, 12).toISOString(): el 18 de septiembre de 2026 en cualquier zona horaria. */
export const AHORA_DE_PRUEBA: Instante
export function serviciosDePrueba(cambios?: Partial<Servicios>): Servicios & { descargados: ArchivoParaDescargar[] }
// db = baseDePrueba(), ahora = () => AHORA_DE_PRUEBA, nuevoId = 'id-1', 'id-2'…, descargar guarda en `descargados`
export function renderConServicios(ui: ReactElement, servicios?: Servicios): RenderResult & { servicios: Servicios }
```

`main.tsx` (T32):

- crea `{ db: new BaseDeDatos(), ahora: () => new Date().toISOString(), nuevoId, descargar: descargarArchivo }`;
- llama a `void pedirAlmacenamientoPersistente()`;
- monta `<StrictMode><ContextoServicios value={servicios}><App /></ContextoServicios></StrictMode>`.

Pruebas:

- `navegador.test.ts` (3):
  - `descargarArchivo` crea la URL, pulsa un enlace con `download` = nombre y la revoca;
  - `pedirAlmacenamientoPersistente` da `false` sin `navigator.storage`;
  - `leerArchivo`.
- `servicios.test.ts` (2):
  - `useServicios` lanza sin proveedor;
  - `serviciosDePrueba` da ids en serie y el reloj fijo.

### 7.2 Navegación (T25)

```ts
// app/navegacion.ts
export type SeccionPersonaje = 'resumen' | 'bolsa' | 'inventario' | 'deudas' | 'gastos' | 'inversiones' | 'hechizos'
export type SeccionAsentamiento =
  | 'resumen' | 'tesoreria' | 'poblacion' | 'personal' | 'produccion' | 'animales' | 'comercio' | 'eventos'
export type Pantalla =
  | { tipo: 'inicio' }
  | { tipo: 'calendario' }
  | { tipo: 'dominio'; dominioId: Id; seccion: SeccionPersonaje | SeccionAsentamiento }
  | { tipo: 'anadirAsentamiento' }
  | { tipo: 'ajustes' }
  | { tipo: 'listas' } // P7 (fase 9): en el menú se marca «Ajustes y copias» (espec. L325)
export type Vista =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'selector' }
  | { tipo: 'nuevaPartida' }
  | { tipo: 'partida'; documento: DocumentoPartida; pantalla: Pantalla }
/** Secciones del menú, con su texto y su icono (§5, espec. L210-212; mjs L219-223). */
export const SECCIONES_PERSONAJE: readonly { seccion: SeccionPersonaje; texto: string; icono: NombreIcono }[]
export const SECCIONES_ASENTAMIENTO: readonly { seccion: SeccionAsentamiento; texto: string; icono: NombreIcono }[]
/** Título y subtítulo de la pantalla provisional (D-081). */
export function tituloProvisional(p: Pantalla, documento: DocumentoPartida): { titulo: string; subtitulo: string }
```

**Secciones:**

- Personaje: Resumen (`resumen`), Bolsa y movimientos (`monedas`), Inventario (`bolsa`), Deudas y préstamos (`balanza`), Gastos e ingresos (`repetir`), Inversiones (`maletin`) y Hechizos (`libro`).
- Asentamiento: Resumen (`resumen`), Tesorería (`tesoro`), Población (`gente`), Personal (`ficha`), Producción (`trigo`), Animales (`huella`), Comercio (`carro`) y Eventos (`bandera`).

**Títulos provisionales:**

| Pantalla | Título | Subtítulo |
|---|---|---|
| inicio | «Inicio» | nombre de la partida |
| calendario | «Calendario» | nombre de la partida |
| dominio | texto de la sección | nombre del dominio |
| anadirAsentamiento | «Añadir asentamiento» | nombre de la partida |
| listas | «Listas y catálogos» | «Ajustes y copias» |

### 7.3 MarcoPartida, BarraSuperior, MenuLateral y PantallaPendiente (T25)

```ts
export interface PropsMarcoPartida {
  documento: DocumentoPartida
  pantalla: Pantalla
  alNavegar: (p: Pantalla) => void
  children: ReactNode
}
export interface PropsBarraSuperior {
  nombre: string
  fecha: Fecha
  edad: Edad
  extremo?: ReactNode // hueco para la 6b: próximo aviso y «Avanzar días»
}
export interface PropsMenuLateral {
  dominios: readonly Dominio[] // ya ordenados con ordenarDominios (D-080)
  pantalla: Pantalla
  alNavegar: (p: Pantalla) => void
}
export interface PropsPantallaPendiente {
  titulo: string
  subtitulo: string
  alIrAAjustes: () => void
}
```

**Marco** (mjs L256-264):

- Rejilla `var(--ancho-menu) minmax(0, 1fr)` × `var(--alto-barra) minmax(0, 1fr)`, con `height: 100dvh`, fondo `papel`.
- `<main>` en la fila 2 y columna 2: columna flexible con 18 px de hueco, relleno `20px 28px 22px` y `overflow-y: auto`. El contenido se desplaza con la cabecera de pantalla fija (espec. L822; crítica H17).
- Las pantallas se estiran sin ancho máximo (D6a-09).

**Barra superior** (mjs L247-254; espec. L186-207). Es un `<header>` en las dos columnas, en `vitela`, con borde inferior de 1 px `borde`, 20 px de hueco y relleno derecho de 16 px.

1. Marca: 232 px, alto completo, relleno `0 18px`, borde derecho de 1 px `borde`, `Emblema` de 22 px y el nombre en Cinzel 14 px, peso 600, `letter-spacing: 0.05em`, interlineado 1.2.
2. Fecha: `flex: 1`, alineada por la línea base, con 12 px de hueco.
   - `formatearFecha(fecha, { edad })` en Cormorant 28 px, peso 600;
   - `nombreDelDia(fecha)` en 14 px `tinta-suave` (D-093).
3. `extremo`: en la 6a no se pasa nada. Ni aviso ni «Avanzar días» (crítica §4.4).

**Menú lateral** (mjs L224-245; espec. L208-212). Es un `<nav aria-label="Menú de la partida">` en `pliegue`, con borde derecho de 1 px `borde` y relleno `6px 12px 10px`, en columna.

1. Etiqueta de grupo «Partida» (Cinzel 13 px, peso 600, `letter-spacing: 0.1em`, `tinta-suave`, 30 px, alineada abajo; mjs L203-204).
2. «Inicio» (`casa`) y «Calendario» (`calendario`).
3. Un hueco de 6 px.
4. Etiqueta «Dominios».
5. Lista de dominios, que se desplaza sola si hay muchos (L209). Cada dominio es una cabecera de 44 px:
   - `<button aria-expanded>` con relleno `0 10px 0 12px`, 15 px (peso 600 si está desplegado);
   - icono de 18 px (`usuario` para el personaje, `torre` para un asentamiento; en `oro-oscuro` si está desplegado y en `tinta-suave` si no);
   - el nombre;
   - el tipo en 13 px `tinta-suave` («personaje», o la `categoria`: «aldea», «pueblo» o «ciudad»);
   - la flecha `derecha` o `abajo`, de 16 px.
   - Si está desplegado, debajo van sus secciones con sangría de 36 px.
6. «Añadir asentamiento» (`mas`), en `tinta-suave`.
7. Un espaciador flexible.
8. «Ajustes y copias» (`ajustes`).

**Filas** (`itemNav`, mjs L224-225): `<button>` de 44 px, relleno `0 12px`, radio 6, 10 px de hueco, 15 px e icono de 18 px.

- Activa: `aria-current="page"`, fondo `vitela`, borde de 1 px `oro`, peso 600 e icono en `oro-oscuro`.
- Inactiva: borde transparente e icono en `tinta-suave`.

**Comportamiento** (espec. L208):

- Solo está desplegado el dominio de la pantalla actual.
- Tocar un dominio plegado navega a `{ tipo: 'dominio', dominioId, seccion: 'resumen' }`.
- Tocar el que ya está desplegado no hace nada.
- Tocar una sección navega a ella.

**PantallaPendiente** (D-081):

- `CabeceraPantalla` con título y subtítulo;
- `Nota` «Esta pantalla llega en una fase posterior.»;
- `Boton` secundario con icono `ajustes`, «Ir a Ajustes y copias».

**Pruebas:**

- `BarraSuperior.test.tsx` (3):
  - el nombre de la partida;
  - «12 de abril de 1640 T.E.» y «Jueves»;
  - no hay ningún botón «Avanzar días».
- `MenuLateral.test.tsx` (6):
  1. Con el ejemplo, el orden es Tharan, Bree y Archet, con «personaje», «pueblo» y «aldea».
  2. Tocar Bree navega a su Resumen y despliega sus 8 secciones.
  3. Solo se despliega un dominio.
  4. Tocar el dominio desplegado no navega.
  5. La pantalla `ajustes` (y también `listas`) marca «Ajustes y copias» con `aria-current`.
  6. «Añadir asentamiento» navega a `anadirAsentamiento`.
- `PantallaPendiente.test.tsx` (2):
  - enseña el título, el subtítulo y la nota;
  - «Ir a Ajustes y copias» llama a `alIrAAjustes`.

---

## 8. Pantallas y sus funciones de datos

Las firmas que se citan son las reales de 3a77322:

- `listarPartidas(db): Promise<ResumenPartida[]>` (repositorio.ts L12), de la sesión más reciente a la más antigua.
- `ultimaPartidaUsada(db): Promise<ResumenPartida | undefined>` (L17).
- `crearPartida(db, documento, ahora): Promise<ResumenPartida>` (L22). Lanza `«Ya hay una partida con el id «…»»`.
- `abrirPartida(db, id, ahora): Promise<DocumentoPartida | undefined>` (L43).
- `leerPartida(db, id)` (L59).
- `guardarPartida(db, documento, ahora): Promise<DocumentoPartida>` (L64).
- `borrarPartida(db, id): Promise<void>` (L81).
- `sembrarCatalogo(db): Promise<ResumenSiembra>` (catalogos.ts L38).
- `exportarCopia(db, id, exportadaEl): Promise<ArchivoCopia>` (exportar.ts L18), con `{ nombre, texto, sobre }`.
- `analizarCopia(texto): ResultadoAnalisis` (dominio/copia/analizar.ts L31).
- `examinarDestino(db, copia, origen, partidaActualId?): Promise<DestinoImportacion>` (importar.ts L72).
- `importarCopia(db, copia, { modo, ahora, nuevoId, migrada?, desdeVersion? }): Promise<ResumenImportacion>` (L140).
- `nombreDeCopia(nombre, existentes)` (comoCopia.ts L34).
- `documentoDeEjemplo()` (sombraDelEste.ts L55) y `PARTIDA_ID` (ejemplo/ids.ts L4).
- `nuevoId()` (datos/ids.ts).

### 8.1 Importar copia, común a P0 y P6 (T28, D-091, D-092)

```ts
// app/copias.ts
export type Preparacion =
  | { tipo: 'rechazo'; mensaje: string }
  | {
      tipo: 'lista'
      copia: SobreCopia
      migrada: boolean
      desdeVersion: number
      destino: DestinoImportacion
      nombreComoCopia: string
    }
/**
 * analizarCopia → examinarDestino. Rechazo: el mensaje del dominio, con «: detalle» si lo trae (daniada, analizar.ts
 * L19), o el de destino.rechazo («Esta copia es de otra partida»). nombreComoCopia = nombreDeCopia(nombre de la
 * copia, nombres de listarPartidas).
 */
export async function prepararImportacion(
  db: BaseDeDatos,
  texto: string,
  origen: OrigenImportacion,
  partidaActualId?: Id,
): Promise<Preparacion>
/** importarCopia con migrada y desdeVersion de la preparación (crítica C24). */
export async function importarPreparada(
  db: BaseDeDatos,
  preparada: Extract<Preparacion, { tipo: 'lista' }>,
  modo: ModoImportacion,
  ahora: Instante,
  nuevoId: () => Id,
): Promise<ResumenImportacion>

// app/ImportarCopia.tsx
export interface PropsImportarCopia {
  origen: OrigenImportacion
  partidaActualId?: Id
  variante?: VarianteBoton // 'fantasma' (mjs L319 y L633)
  alImportar: (resumen: ResumenImportacion) => void // tras escribir; antes de «Copia importada»
}
```

**Flujo.**

1. `Boton` «Importar copia» con icono `subir`. Abre un `<input type="file" accept=".json,application/json" hidden aria-label="Archivo de la copia">` (crítica H5).
2. `leerArchivo` → `prepararImportacion`.
3. Rechazo: `DialogoMensaje` «No se ha podido importar» con el mensaje.
4. `destino.modos` es `['nueva']`: `importarPreparada(…, 'nueva', …)` → `alImportar` → «Copia importada».
5. `destino.modos` incluye `'reemplazar'`: Dialogo de 620 px.
   - Título: «¿Reemplazar «{destino.nombreExistente}»?».
   - Subtítulo: «Copia exportada el {fechaReal(copia.exportadaEl)}».
   - Cuerpo, en P0 (`comoCopia` en los modos): «Reemplazar cambia tu partida por la de la copia y se pierde lo que hayas hecho después de exportarla. «Importar como copia» la guarda aparte, como «{nombreComoCopia}».».
   - Cuerpo, en P6: «La partida se cambia por la de la copia y se pierde lo que hayas hecho después de exportarla.».
   - Pie derecho: «Cancelar» (secundario), «Importar como copia» (secundario, solo si está en los modos) y «Reemplazar» (`peligroLleno`; espec. L691).
   - Al elegir: `importarPreparada` → `alImportar` → «Copia importada».
6. «Copia importada»: `DialogoMensaje` con `resumen.lineas`.

El input se vacía tras cada lectura para poder elegir el mismo archivo otra vez.

**Pruebas.**

- `copias.test.ts` (5):
  1. Un texto que no es JSON da «Este archivo no es una copia de Gestión de Aldeas».
  2. Una copia dañada da «La copia está dañada: …».
  3. La copia del ejemplo en una base vacía da `lista` con `['nueva']`.
  4. Con el ejemplo ya guardado da `['reemplazar', 'comoCopia']` y «La Sombra del Este (copia)».
  5. Desde `ajustes` con otra partida da «Esta copia es de otra partida».
- `ImportarCopia.test.tsx` (5):
  1. Subir un archivo que no es copia enseña «No se ha podido importar».
  2. Una copia nueva enseña «Copia importada» y «Se ha añadido la partida «La Sombra del Este».».
  3. Una copia que ya existe pregunta, y «Importar como copia» la crea aparte.
  4. «Reemplazar» reemplaza.
  5. En `ajustes` no se ofrece «Importar como copia».

### 8.2 P0 · Selector de partidas (T30, D-082 a D-084)

```ts
export interface PropsTarjetaPartida {
  resumen: ResumenPartida
  principal: boolean
  alEditar: () => void
  alExportar: () => void
  alAbrir: () => void
}
export interface PropsSelectorPartidas {
  alAbrir: (documento: DocumentoPartida) => void
  alNuevaPartida: () => void
}
```

**Vista** (mjs L296-326; espec. L250 y L263-266). Página sin marco, en columna centrada, con relleno `60px 0 40px`.

- **Cabecera** (10 px de hueco):
  - `Emblema` de 44 px;
  - `<h1>` «Gestión de Aldeas» en Cinzel 44 px, peso 600, `letter-spacing: 0.08em`;
  - `Filete` de 280;
  - «La economía de tus dominios en la Tierra Media» en Cormorant 23 px, cursiva, peso 500, `tinta-suave`.
- **Bloque de la lista**: `width: min(780px, 100% - 32px)`, `margin-top: 44px` y 14 px de hueco.
  - Fila de título: `<h2>` «Tus partidas» en Cormorant 26 px, peso 600, y a la derecha `ImportarCopia` (fantasma) y «Nueva partida» (**secundario**, icono `mas`; crítica C3).
  - **Buscador** si hay más de 5 partidas (D-084): `<input type="search" aria-label="Buscar partidas" placeholder="Buscar">` de 48 px con el icono `buscar`, filtrando con `buscarEn(nombre, busqueda)`. Sin resultados: «Nada coincide con “{búsqueda}”».
  - **Tarjetas**, en el orden de `listarPartidas`.
  - `Nota` «Tus partidas se guardan solo en esta tablet. Exporta una copia de vez en cuando para no perderlas.» (mjs L324).
  - Si `PARTIDA_ID` no está en la lista, un `Enlace` «Probar con la partida de ejemplo» (D-082).
- **Tarjeta** (mjs L296-306): `<article aria-label={nombre}>` con `data-principal`, 20 px de hueco y relleno `18px 20px 18px 22px`, en `vitela`, con borde de 1 px (`oro` si es la principal, `borde` si no; crítica H15) y radio 10.
  - Medallón de 56 px en `pliegue` con borde de 1 px `borde` y `Emblema` de 28 px.
  - Nombre en Cormorant 28 px, peso 600, interlineado 1.1.
  - `formatearFecha(fechaActual, { edad })` en 15 px.
  - «{textoDominios(dominios)} · Última sesión: {fechaReal(abiertaEl)}» en 14 px `tinta-suave`.
  - BotonIcono `editar` fantasma, «Editar partida».
  - `Boton` fantasma con `bajar`, «Exportar».
  - `Boton` «Continuar» (principal) en la principal y «Abrir» (secundario) en las demás.
  - La principal es **la primera de `listarPartidas`**, se esté buscando o no.
- **Vacío** (D-083): bajo la cabecera, centrado, «Todavía no tienes ninguna partida.» en 15 px y, en fila con 10 px de hueco, «Nueva partida» (principal, `mas`), `ImportarCopia` (secundario) y «Probar con la partida de ejemplo» (fantasma). Debajo, la misma nota.

**Datos.**

| Acción | Llamada |
|---|---|
| Cargar | `listarPartidas(db)` al montar y tras cada acción |
| Continuar o Abrir | `abrirPartida(db, id, ahora())`; con `undefined`, `DialogoMensaje` «No se ha podido abrir la partida» / «No está guardada en esta tablet.» y recargar; si no, `alAbrir(documento)` |
| Exportar | `exportarCopia(db, id, ahora())` → `descargar({ nombre, texto })` → recargar. Nombre: `gestion-aldeas-la-sombra-del-este-AAAA-MM-DD.json` (sobre.ts L282) |
| Nueva partida | `alNuevaPartida()` |
| Ejemplo | `crearPartida(db, documentoDeEjemplo(), ahora())` → `abrirPartida` → `alAbrir` |
| Importar | `ImportarCopia origen="selector"`, que recarga en `alImportar` |
| Editar | abre `EditarPartida` (§8.3) |

Los errores inesperados salen en `DialogoMensaje` «Algo ha fallado» con `error.message`.

**Pruebas (9):**

1. Con la base vacía: la frase, los tres botones y ninguna tarjeta.
2. Con el ejemplo: la tarjeta dice «La Sombra del Este», «12 de abril de 1640 T.E.» y «Tharan, Bree y Archet · Última sesión: 18 de septiembre de 2026», y el ejemplo ya no se ofrece.
3. Con dos partidas: la última usada es la principal («Continuar», borde oro) y la otra dice «Abrir».
4. «Continuar» llama a `alAbrir` con el documento y anota la sesión.
5. «Exportar» descarga `gestion-aldeas-la-sombra-del-este-${AHORA_DE_PRUEBA.slice(0, 10)}.json` con el texto de la copia. No se escribe la fecha a mano: `nombreDeArchivo` usa la fecha en UTC (sobre.ts L290; crítica H7) y cerca de medianoche depende de la zona horaria.
6. «Probar con la partida de ejemplo» la guarda y llama a `alAbrir`.
7. Con 6 partidas sale el buscador; «som» deja una, y «xyz» da «Nada coincide con “xyz”».
8. Con 5 no hay buscador.
9. «Nueva partida» llama a `alNuevaPartida`.

### 8.3 «Editar partida» y J2d en P0 (T29, D-088 a D-090)

```ts
export interface PropsEditarPartida {
  resumen: ResumenPartida
  abierto: boolean
  alCerrar: () => void
  alGuardada: () => void
  alBorrada: () => void
}
```

**Dialogo** de 700 px, «Editar partida», con el nombre de la partida como subtítulo.

- Cuerpo, con relleno `18px 28px 20px` y 16 px de hueco:
  - `CampoTexto` «Nombre de la partida» (`maximo` 60);
  - `CampoFechaInicial`, prellenado con `resumen.fechaInicial` y `edad`, desactivado si `resumen.hayAvances`, con la ayuda `MENSAJE_SOLO_ANTES_DEL_AVANCE`.
- Pie:
  - izquierda: `Boton peligro` con icono `x`, «Eliminar partida»;
  - derecha: «Cancelar» (secundario) y «Guardar cambios» (principal), desactivado mientras `errorDeNombre` o `leerFechaInicial` den error (D-094).
- «Guardar cambios» llama a `guardarDatosDePartida(db, resumen.id, datos, ahora())`.
  - `ok: false`: el error sale en `lacre`, con icono, en el pie izquierdo, en lugar del botón.
  - `ok: true`: `alGuardada()`.
- **«Eliminar partida»** cierra este diálogo y abre `ConfirmacionEliminar`, que lo **sustituye** (espec. L221):
  - título «¿Eliminar «{nombre}»?»;
  - subtítulo «Partida · {formatearFecha(fechaActual, { edad })}»;
  - resumen: «Dominios» → `textoDominios(dominios)` y «Última copia exportada» → `fechaRealONunca(exportadaEl)`;
  - como hijo, `Nota` con `alerta`: «Se borra todo y se vuelve al selector de partidas.» (espec. L801);
  - su «Cancelar» reabre «Editar partida» **con lo escrito**, porque el estado del formulario vive en `EditarPartida`;
  - «Eliminar definitivamente» llama a `borrarPartida` y luego a `alBorrada()`.

**Pruebas (7).** El componente se monta suelto, con `renderConServicios`:

1. Se abre prellenado.
2. Renombrar y guardar llama a `alGuardada` y deja el nombre nuevo en `leerResumen`.
3. El nombre vacío desactiva «Guardar cambios» tras tocarlo y enseña «Escribe un nombre».
4. El ejemplo (con avances) tiene la fecha y la Edad desactivadas, con la ayuda.
5. Una partida sin avances cambia de fecha y el resumen se actualiza.
6. «Eliminar partida» → «Cancelar» vuelve con el nombre que se estaba escribiendo.
7. «Eliminar partida» → casilla → «Eliminar definitivamente» borra la partida (`leerResumen` da `undefined`) y llama a `alBorrada`.

### 8.4 P1 y P1b · Nueva partida (T27, D-085 a D-088)

```ts
export interface PropsNuevaPartida {
  alCancelar: () => void
  alCrear: (documento: DocumentoPartida) => void
}
export interface PropsAsistente {
  paso: 1 | 2
  alCancelar: () => void
  children: ReactNode
}
// PasoPartida y PasoPersonaje reciben su trozo de estado y alSiguiente, alAtras y alCrear;
// el estado entero vive en NuevaPartida.
```

**Asistente** (mjs L327-336). Página sin marco.

- Barra de 64 px en `vitela`, con borde inferior de 1 px `borde` y relleno `0 16px 0 24px`.
  - A la izquierda, `Emblema` de 22 px y «Gestión de Aldeas» en Cinzel 15 px, peso 600, 0.06em.
  - A la derecha, `Boton` fantasma con `x`, «Cancelar», que llama a `alCancelar` sin preguntar (D-085).
- Cuerpo: `width: min(880px, 100% - 32px)`, centrado, desplazable.
- Indicador de pasos: `pasoAsistente` (mjs L327-330), un `<ol aria-label="Pasos">` con 14 px de hueco y un filete de 1 px entre pasos.
  - Círculo de 34 px: activo con fondo y borde `oro-oscuro` y cifra `vitela`; pendiente en `vitela` con borde `borde` y cifra `tinta-suave`.
  - Texto de 15 px: peso 600 y `tinta` si está activo; `tinta-suave` si no.
  - El activo lleva `aria-current="step"`.
  - Pasos: «Partida y fecha» y «Personaje».

**P1** (mjs L338-361; espec. L251 y L275-279). Relleno superior de 30 px y 22 px de hueco.

1. `<h1>` «Da nombre a tu partida», en Cormorant 40 px, peso 600, interlineado 1.1.
2. `CampoTexto` «Nombre de la partida» (`maximo` 60).
3. `CampoFechaInicial`, que empieza con el día «1», mes 1, año «» y edad `tercera` (D-085).
4. En un bloque con 8 px de hueco:
   - si la fecha es válida, `Aviso` neutro con `calendario`: «La partida empieza el {formatearFechaConDia(fecha, edad)}» (mjs L348);
   - `Nota` «Calendario actual: meses, bisiestos y días de la semana reales del año elegido. No hay festivos predefinidos: los anuncia el máster y los anotas como eventos.» (mjs L349).
5. **Caja de monedas**: `vitela`, borde de 1 px `borde`, radio 8, relleno `12px 12px 12px 18px` y 16 px de hueco (mjs L351-355).
   - Icono `monedas` de 22 px en `oro-oscuro`.
   - «Monedas de MERP · los saldos se muestran en oro» en 15 px, peso 600.
   - Debajo, en 14 px `tinta-suave`: `cadenaDeEquivalencias(eq)` o, si hay errores, la lista de errores en `lacre` con icono.
   - `Enlace` «Editar equivalencias». Al tocarlo desaparece y debajo aparece una `TablaMonedas` en edición (D-086).
6. **Caja de víveres**, del mismo aspecto (mjs L356-359):
   - `trigo`;
   - «Víveres en sacos · ración fija»;
   - «1 saco = 30 kg = víveres para 1 persona durante 1 mes (30 días) · 1 kg al día con margen para pérdidas»;
   - sin enlace (espec. L279).
7. A la derecha, «Siguiente: personaje» (principal). Está desactivado si hay error en el nombre, la fecha o las equivalencias (D-094). Al tocarlo, se tocan todos los campos.

**P1b** (mjs L1543-1566; espec. L252 y L280). Relleno superior de 26 px y 16 px de hueco.

1. `<h1>` «Crea a tu personaje».
2. Rejilla de 2 columnas:
   - `CampoTexto` «Nombre» (`maximo` 60);
   - `CampoTexto` «Descripción» (`maximo` 1000; D-088).
3. `EtiquetaCampo` «Bolsa inicial» con la ayuda «Copia las monedas de la ficha tal como las tengas; solo se guarda el total en oro. Podrás corregirla después como primera fila del libro.» (mjs L1562). Dentro, una columna con 8 px de hueco:
   - una `FilaImporte` por fila, con `sufijoAccesible` « de la fila N» y `alQuitar`;
   - `Boton` fantasma con `mas`, «Añadir otra moneda», que añade `{ cantidad: '', moneda: 'mo' }`;
   - se empieza con una fila `{ '', 'mo' }` (D-087).
4. `ResumenOro` «Bolsa inicial», con la suma de las filas válidas.
5. Pie de dos extremos:
   - «Atrás» (secundario, `izquierda`), que vuelve a P1 conservando todo;
   - «Crear partida» (principal), desactivado si el nombre tiene error o alguna fila es `invalido`.

**Crear partida**: `documentoDePartidaNueva(datos, { partida: nuevoId(), personaje: nuevoId() }, ahora())` → `crearPartida` → `alCrear(documento)`. Un error sale en «Algo ha fallado».

**Pruebas (10):**

1. P1 empieza con día 1, enero, año vacío y «Tercera» marcada; «Siguiente: personaje» está desactivado.
2. Con nombre y 1/enero/1640 sale «La partida empieza el domingo 1 de enero de 1640 T.E.».
3. 31/abril/1640 da «Abril de 1640 tiene 30 días» y bloquea el botón.
4. «Editar equivalencias» con «12» en el oro da la cadena «… · 1 mo = 12 mp · …».
5. Con «1», el botón se bloquea con su mensaje.
6. P1b: las 4 filas del ejemplo suman «40,918 mo» (espec. L280).
7. «Atrás» conserva el nombre de la partida.
8. Una fila «abc» desactiva «Crear partida».
9. «Crear partida» guarda una partida que pasa `EsquemaDocumentoPartida`, con `resumen.dominios` `['Tharan']` y la caja en 4.091.800 mh, y llama a `alCrear`.
10. «Cancelar» llama a `alCancelar` sin guardar nada.

### 8.5 P6 · Ajustes y copias (T31)

```ts
export interface PropsAjustes {
  documento: DocumentoPartida
  alCambiarDocumento: (documento: DocumentoPartida) => void // tras reemplazar con una copia
  alCambiarDePartida: () => void
  alBorrada: () => void
  alGestionarListas: () => void // D-081: pantalla provisional de P7
}
```

**Vista** (mjs L600-641; espec. L257 y L321-324).

- `CabeceraPantalla`: título «Ajustes y copias», subtítulo con el nombre de la partida.
- Rejilla `minmax(0, 1.1fr) minmax(0, 1fr)` con 16 px de hueco, alineada arriba. Cada columna es una pila con 16 px de hueco.
- **Izquierda**:
  - Panel «Monedas»: `TablaMonedas` en lectura y `Nota` «Se fijaron al crear la partida. Todos los importes se muestran en oro.» (con 8 px de margen arriba).
  - Panel «Listas y catálogos»: en una fila entre los extremos, con 14 px de hueco y relleno `10px 0 4px`, «Categorías, oficios, tipos, recursos, ubicaciones y personas» (14 px `tinta-suave`, interlineado 1.4) y el `Boton` secundario con `derecha`, «Gestionar listas», que llama a `alGestionarListas`.
- **Derecha**:
  - Panel «Calendario»: `ListaPares` con filas de 40 px:
    - «Calendario» / «Actual, con los meses de hoy»;
    - «Fecha actual» / `conMayuscula(formatearFecha(fechaActual, { edad, diaSemana: true }))`;
    - «Ración de víveres» / «1 saco de 30 kg por persona al mes».
    - Después, `Nota` «Sin festivos fijos: anótalos como eventos.».
  - Panel «Copias de seguridad», con relleno `4px 20px 14px`:
    - «Tus datos solo están en esta tablet. Exporta una copia para no perderlos si se borra o se cambia de dispositivo.» (15 px, interlineado 1.4);
    - `ListaPares` sin borde: «Última copia exportada» / `fechaRealONunca(resumen.exportadaEl)`;
    - `Boton` secundario con `bajar`, «Exportar copia», e `ImportarCopia origen="ajustes"` (fantasma);
    - `Nota` con `alerta`: «Importar una copia reemplaza la partida actual.» (es una nota, no un aviso: crítica C25).
  - Panel «Partida»: «Cambiar de partida» (secundario, `cambio`) y «Borrar partida» (`peligro`).

**Datos.**

| Acción | Llamada |
|---|---|
| Cargar | `leerResumen(db, id)` para `exportadaEl` |
| Exportar copia | `exportarCopia(db, id, ahora())` → `descargar` → `leerResumen` otra vez |
| Importar copia | `ImportarCopia origen="ajustes" partidaActualId={id}`; en `alImportar`, `leerPartida(db, id)` → `alCambiarDocumento(documento)` |
| Cambiar de partida | `alCambiarDePartida()` |
| Borrar partida | `ConfirmacionEliminar` como en §8.3 (su «Cancelar» solo cierra) → `borrarPartida` → `alBorrada()` |
| Gestionar listas | `alGestionarListas()` |

**Pruebas (8):**

1. La tabla de monedas del ejemplo, en lectura: 7 filas, «100» «mo» y «Unidad base».
2. «Fecha actual» dice «Jueves, 12 de abril de 1640 T.E.».
3. Sin copias exportadas: «Nunca».
4. «Exportar copia» descarga y la fila pasa a «18 de septiembre de 2026».
5. Importar una copia de otra partida da «Esta copia es de otra partida».
6. Importar la copia de la misma partida pregunta «Reemplazar», sin «Importar como copia», y llama a `alCambiarDocumento`.
7. «Borrar partida» → J2d → borrada y `alBorrada`.
8. «Cambiar de partida» y «Gestionar listas» llaman a sus funciones.

### 8.6 App: arranque y vistas (T32)

- **Arranque**, una sola vez con una guarda de `useRef`, por StrictMode:
  1. `await sembrarCatalogo(db)`, en cada arranque (catalogos.ts L14).
  2. `ultimaPartidaUsada(db)`:
     - con una partida: `abrirPartida(db, id, ahora())` → `{ tipo: 'partida', documento, pantalla: { tipo: 'inicio' } }` (espec. L203; D-081);
     - si da `undefined` o no hay ninguna: `{ tipo: 'selector' }`.
  3. Si algo lanza: `{ tipo: 'error', mensaje: error.message }`.
- **Vistas**:

| Vista | Qué se ve |
|---|---|
| `cargando` | fondo `papel` sin texto |
| `error` | `CabeceraPantalla` «No se han podido abrir tus partidas» con la `Nota` `alerta` del mensaje |
| `selector` | `SelectorPartidas`, con `alAbrir` → partida en `inicio` y `alNuevaPartida` → `nuevaPartida` |
| `nuevaPartida` | `NuevaPartida`, con `alCancelar` → selector y `alCrear` → partida en `inicio` |
| `partida` | `MarcoPartida` con `alNavegar` → cambia la pantalla |

- **Contenido del marco en la vista `partida`**: con `ajustes`, `Ajustes` (`alCambiarDePartida` y `alBorrada` → selector; `alGestionarListas` → pantalla `listas`; `alCambiarDocumento` → sustituye el documento). Con cualquier otra pantalla, `PantallaPendiente` con `tituloProvisional` y `alIrAAjustes` → `ajustes`.
- `src/App.tsx` se **borra**, y `main.tsx` importa `./interfaz/app/App` y monta lo del §7.1.

**Pruebas (6):**

1. Con la base vacía se ve el selector vacío y el catálogo queda sembrado: `leerCatalogo` da 145 opciones y 21 recursos (`catalogo/inicial.test.ts` L35-38).
2. Con una partida guardada se abre en el marco, con «Inicio» provisional y la sesión anotada.
3. En el selector, «Nueva partida» y «Cancelar» vuelven.
4. Desde el marco, «Ir a Ajustes y copias» y «Cambiar de partida» vuelven al selector.
5. Crear una partida entra en el marco con su nombre en la barra.
6. Si `sembrarCatalogo` lanza, se ve «No se han podido abrir tus partidas».

### 8.7 El entregable (T33)

`src/interfaz/entregable.test.tsx` recorre la app entera con `renderConServicios(<App />)` sobre una base de prueba vacía. Son 5 pruebas, que siguen el entregable del encargo: «lista las partidas, crea una, abre la de ejemplo y exporta e importa copias».

1. **Lista y abre el ejemplo**: selector vacío → «Probar con la partida de ejemplo» → marco con «La Sombra del Este», «12 de abril de 1640 T.E.», «Jueves» y el menú Tharan, Bree y Archet.
2. **Crea una partida**: vuelve al selector con «Cambiar de partida» → «Nueva partida» → «Aldric», 3/2/2980, «Tercera» → P1b «Aldric» con 12 mo → «Crear partida» → marco → «Cambiar de partida». La lista tiene dos tarjetas: «Aldric, sin asentamientos» (Continuar) y «La Sombra del Este» (Abrir).
3. **Exporta e importa como copia**: exportar el ejemplo desde P0 → subir el mismo texto con «Importar copia» → «¿Reemplazar «La Sombra del Este»?» → «Importar como copia» → «Copia importada» → tres tarjetas, una de ellas «La Sombra del Este (copia)».
4. **Reemplaza desde Ajustes**: abrir el ejemplo → Ajustes → exportar → renombrar la partida con `guardarDatosDePartida` (ayudante de la prueba) → importar el texto exportado → «Reemplazar» → el marco vuelve a «La Sombra del Este».
5. **Borra**: Ajustes → «Borrar partida» → casilla → «Eliminar definitivamente» → selector sin esa partida.

---

## 9. Textos literales

Los textos de la especificación y de las vistas van tal cual. Los nuevos llevan la decisión que los crea.

| Dónde | Texto | Fuente |
|---|---|---|
| P0 cabecera | «Gestión de Aldeas» · «La economía de tus dominios en la Tierra Media» · «Tus partidas» | mjs L312, L314, L318 |
| P0 botones | «Importar copia» · «Nueva partida» · «Exportar» · «Continuar» · «Abrir»; icono «Editar partida» | mjs L303-305, L319; espec. L266 |
| P0 tarjeta | «{dominios} · Última sesión: {fecha real}» | mjs L300 |
| P0 nota | «Tus partidas se guardan solo en esta tablet. Exporta una copia de vez en cuando para no perderlas.» | mjs L324 |
| P0 vacío | «Todavía no tienes ninguna partida.» | D-083 |
| P0 ejemplo | «Probar con la partida de ejemplo» | D-082 |
| P0 buscador | «Buscar» · «Nada coincide con “…”» | espec. L860 y L866; D-084 |
| Dominios | «Tharan, Bree y Archet» · «Aldric, sin asentamientos» | mjs L321-322 |
| Editar partida | «Editar partida» · «Nombre de la partida» · «Eliminar partida» · «Cancelar» · «Guardar cambios» · «Solo se pueden cambiar antes del primer avance.» · «La fecha inicial no se puede cambiar: algún registro quedaría fuera de la partida» | espec. L266; mjs L1741; D-089 |
| J2d partida | «¿Eliminar «{nombre}»?» · «Partida · {fecha}» · «Dominios» · «Última copia exportada» · «Se borra todo y se vuelve al selector de partidas.» · «Sé que esto no se puede deshacer» · «El botón rojo no se activa hasta marcar la casilla.» · «Cancelar» · «Eliminar definitivamente» | mjs L1802-1810; espec. L801; D-090 |
| Asistente | «Gestión de Aldeas» · «Cancelar» · «Partida y fecha» · «Personaje» | mjs L335-339 |
| P1 | «Da nombre a tu partida» · «Nombre de la partida» · «Día» · «Mes» · «Año» · «Edad» · «Segunda» · «Tercera» · «Cuarta» · «Enero»…«Diciembre» | mjs L341-345; espec. L277 |
| P1 aviso | «La partida empieza el {domingo 1 de enero de 1640 T.E.}» | mjs L348 |
| P1 nota | «Calendario actual: meses, bisiestos y días de la semana reales del año elegido. No hay festivos predefinidos: los anuncia el máster y los anotas como eventos.» | mjs L349 |
| P1 monedas | «Monedas de MERP · los saldos se muestran en oro» · «Editar equivalencias» · la cadena de equivalencias | mjs L353-354 |
| P1 víveres | «Víveres en sacos · ración fija» · «1 saco = 30 kg = víveres para 1 persona durante 1 mes (30 días) · 1 kg al día con margen para pérdidas» | mjs L358 |
| P1 pie | «Siguiente: personaje» | mjs L360 |
| P1b | «Crea a tu personaje» · «Nombre» · «Descripción» · «Bolsa inicial» · «Añadir otra moneda» · «Atrás» · «Crear partida» | mjs L1553-1564 |
| P1b ayuda | «Copia las monedas de la ficha tal como las tengas; solo se guarda el total en oro. Podrás corregirla después como primera fila del libro.» | mjs L1562 |
| ResumenOro | «{etiqueta} en monedas de oro» · «Equivalencias» · «1 mo = 10 mp = 100 mb = 1.000 mc» · «mo» | mjs L212-215 |
| Monedas | «Mithril», «Oro», «Plata», «Bronce», «Cobre», «Estaño», «Hierro» · «Oro · mo» · «Moneda» · «Abrev.» · «Equivale a» · «Unidad base» | monedas.ts L6-14; mjs L609-617 y L1557 |
| Errores | «Escribe un nombre» · «El nombre no puede pasar de 60 letras» · «La cantidad tecleada no es válida» · los de `validarFecha`, `validarEquivalencias` y `validarRecurrencia` | espec. L1452; D-088; comunes.ts L83 |
| P6 | «Ajustes y copias» · «Monedas» · «Se fijaron al crear la partida. Todos los importes se muestran en oro.» · «Listas y catálogos» · «Categorías, oficios, tipos, recursos, ubicaciones y personas» · «Gestionar listas» | mjs L603-625 |
| P6 calendario | «Calendario» · «Actual, con los meses de hoy» · «Fecha actual» · «Ración de víveres» · «1 saco de 30 kg por persona al mes» · «Sin festivos fijos: anótalos como eventos.» | mjs L628 |
| P6 copias | «Copias de seguridad» · «Tus datos solo están en esta tablet. Exporta una copia para no perderlos si se borra o se cambia de dispositivo.» · «Última copia exportada» · «Nunca» · «Exportar copia» · «Importar copia» · «Importar una copia reemplaza la partida actual.» | mjs L630-634; D-093 |
| P6 partida | «Partida» · «Cambiar de partida» · «Borrar partida» | mjs L637 |
| Importar | «¿Reemplazar «{nombre}»?» · «Copia exportada el {fecha real}» · los dos cuerpos del §8.1 · «Importar como copia» · «Reemplazar» · «Copia importada» · «No se ha podido importar» · «Aceptar» · «Archivo de la copia» | D-091, D-092 |
| Importar (dominio) | «Este archivo no es una copia de Gestión de Aldeas» · «Esta copia es de una versión más nueva de la app» · «La copia está dañada: {detalle}» · «Esta copia es de otra partida» · las `lineas` de `importarCopia` | analizar.ts L14-20; importar.ts L61 y L119-133 |
| Marco | «Partida» · «Dominios» · «Inicio» · «Calendario» · «Añadir asentamiento» · «Ajustes y copias» · las 7 y 8 secciones · «personaje», «aldea», «pueblo», «ciudad» · «Menú de la partida» | mjs L219-245; espec. L210-212 |
| Provisional | «Esta pantalla llega en una fase posterior.» · «Ir a Ajustes y copias» | D-081 |
| Fallos | «No se ha podido abrir la partida» · «No está guardada en esta tablet.» · «Algo ha fallado» · «No se han podido abrir tus partidas» | D-092 |
| Selector | «Buscar» · «Borrar la búsqueda» · «Recientes» · «Nada coincide con “…”» · «Busca en todas las categorías y grupos.» · «tuya» · «“{x}” ya existe» · «{n} {plural}» · «{m} de {n}» | espec. L860-870 y L932-936 |
| Campo de fecha | «Escribe la fecha» · «19/04/1640» · «Hoy» · «Mañana» · «+7 días» · «Mes anterior» · «Mes siguiente» · «L», «M», «X», «J», «V», «S», «D» · «Sin fecha» · «Escribe la fecha como 19/04/1640» · «No puede pasar del 31 de diciembre de 9999» | espec. L829; D-096; D-097 |
| Campo de frecuencia | los 9 de `TEXTO_TIPO` · «Habituales» · «Personalizadas» · «Cada» · «días» · «meses» · «Día de la semana» · «Lun»…«Dom» · «Día del mes» · «Mes» · «Primera vez» · «Fecha de inicio» · «Opcional: no antes de esta fecha» · «Fecha» · «Próxima: …» · «Próxima: ninguna» · «Tiene que ser posterior al {fecha}» | espec. L830-846 y L891; D-095 |
| Diálogo | «Cerrar» (la x) | espec. L945 |
| PWA | «Gestión de Aldeas» · «Aldeas» · «La economía de tus dominios en la Tierra Media» | D-098 |

---

## 10. Pruebas: entorno y patrones

- **Comandos**: `npm test` ejecuta los dos proyectos; `npx vitest run --project interfaz` o `--project nodo` ejecutan uno solo.
- **El proyecto `nodo`** conserva las 568 pruebas de partida más las nuevas de `src/dominio` y `src/datos` (T5-T11, salvo `fechaReal.test.ts`, que es de la interfaz).
- **Patrón de una prueba de componente** (corrige la crítica C22: `vi` se importa):

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Boton } from './Boton'

describe('Boton', () => {
  it('llama a alPulsar al tocarlo', async () => {
    const usuario = userEvent.setup()
    const alPulsar = vi.fn()
    render(<Boton alPulsar={alPulsar}>Guardar</Boton>)
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(alPulsar).toHaveBeenCalledOnce()
  })
})
```

- **Pantallas**:
  - Se montan con `renderConServicios`.
  - Para guardar el ejemplo: `await crearPartida(servicios.db, documentoDeEjemplo(), AHORA_DE_PRUEBA)`.
  - Para esperar a la base se usa `await screen.findBy…`.
  - Para subir una copia: `await usuario.upload(screen.getByLabelText('Archivo de la copia'), new File([texto], 'copia.json', { type: 'application/json' }))`.
  - Para Esc: `fireEvent(dialogo, new Event('cancel', { cancelable: true }))`.
- **Fechas reales**: siempre a partir de `AHORA_DE_PRUEBA`, que es el 18 de septiembre de 2026 en cualquier zona horaria.
- **Estilos**: `estilos.test.ts` lee `variables.css?raw` y `fuentes.ts?raw` y comprueba los 14 colores y las 6 importaciones literales. Son 2 pruebas: vigilan que nadie cambie un *token* sin querer.
- **Humo** (`pruebas/humo.test.tsx`, 3 pruebas):
  - `render` y `toBeInTheDocument`;
  - `baseDePrueba()` crea y lista el ejemplo dentro de happy-dom;
  - `typeof window !== 'undefined'`, para confirmar el entorno.

---

## 11. Lista de tareas

Cada tarea deja en verde `npm test`, `npx tsc -b`, `npm run build` y `npm run lint` (sin avisos), y termina con su commit. «Nuevas» incluye el caso que cada módulo nuevo del dominio suma a `pureza.test.ts`. **Los recuentos son estimaciones**: al escribir el plan se fijan con lo que imprima Vitest; lo que no puede cambiar es el número de **archivos** de prueba.

| # | Tarea | Depende de | Nuevas | Total | Archivos |
|---|---|---|---|---|---|
| — | *(punto de partida: fases 1 y 2)* | — | — | 568 | 48 |
| 1 | Decisiones y hoja de ruta | — | 0 | 568 | 48 |
| 2 | Dependencias y Vitest en dos proyectos | 1 | 3 | 571 | 49 |
| 3 | Sistema visual: variables, base y fuentes | 2 | 2 | 573 | 50 |
| 4 | PWA: manifiesto, *service worker* e iconos | 3 | 0 | 573 | 50 |
| 5 | Textos de fecha y fecha real | 2 | 11 | 584 | 52 |
| 6 | Búsqueda sin tildes | — | 9 | 593 | 53 |
| 7 | Equivalencias en texto | — | 5 | 598 | 54 |
| 8 | Orden de los dominios, nombres y textos de partida | — | 13 | 611 | 56 |
| 9 | Documento de una partida nueva y «Editar partida» puro | 8 | 15 | 626 | 58 |
| 10 | Formulario de frecuencia, puro | — | 17 | 643 | 59 |
| 11 | Datos: `leerResumen` y `guardarDatosDePartida` | 9 | 6 | 649 | 61 |
| 12 | Iconos, emblema y filete | 2 | 4 | 653 | 62 |
| 13 | Botón, botón de icono y enlace | 12 | 7 | 660 | 63 |
| 14 | Panel, cabecera, nota, tabla y lista de pares | 13 | 7 | 667 | 65 |
| 15 | Campo de texto, error, tocados y casilla | 12 | 8 | 675 | 67 |
| 16 | Aviso | 12 | 4 | 679 | 68 |
| 17 | Segmentos | 15 | 5 | 684 | 69 |
| 18 | Diálogo, diálogo apilado y diálogo de mensaje | 13 | 8 | 692 | 70 |
| 19 | Confirmación J2d | 14, 15, 16, 18 | 5 | 697 | 71 |
| 20 | Selector con buscador | 6, 15, 18 | 16 | 713 | 72 |
| 21 | Campo de importe y resumen en oro | 7, 20 | 9 | 722 | 74 |
| 22 | Campo de fecha | 5, 20 | 10 | 732 | 75 |
| 23 | Campo de frecuencia | 10, 17, 22 | 9 | 741 | 76 |
| 24 | Servicios de la app y ayudantes de prueba | 2 | 5 | 746 | 78 |
| 25 | Marco: barra superior, menú y pantalla provisional | 5, 8, 14, 24 | 11 | 757 | 81 |
| 26 | Fecha inicial y tabla de monedas | 7, 14, 17, 20 | 9 | 766 | 83 |
| 27 | P1 y P1b | 9, 21, 24, 26 | 10 | 776 | 84 |
| 28 | Importar copia (común a P0 y P6) | 5, 18, 24 | 10 | 786 | 86 |
| 29 | «Editar partida» y su J2d | 5, 8, 11, 19, 26 | 7 | 793 | 87 |
| 30 | P0, que monta las dos anteriores | 5, 8, 24, 28, 29 | 9 | 802 | 88 |
| 31 | P6 Ajustes y copias | 11, 19, 25, 26, 28 | 8 | 810 | 89 |
| 32 | App, arranque y `main.tsx` | 25, 27, 30, 31 | 6 | 816 | 90 |
| 33 | Entregable con Testing Library | 32 | 5 | 821 | 91 |
| 34 | Cierre: PWA en Chrome y en la tablet | 33, 4 | 0 | 821 | 91 |
| | **Total de la fase 6a** | | **253** | **821** | **91** |

**Por qué va antes lo de importar y lo de editar.** Importar (T28) y «Editar partida» (T29) no dependen de P0, así que van antes. P0 (T30) ya puede montarlos, y ninguna tarea deja un botón a medio conectar.

### Detalle de cada tarea

**T1 · Decisiones y hoja de ruta.**

- Objetivo: dejar escritas D-080 a D-099 y partir la fase 6 en la hoja de ruta. No hay código.
- Archivos:
  - `docs/decisiones.md`, en una sección nueva «Fase 6a · Interfaz base (2026-09-18)» colocada antes de «## Decisiones tuyas».
    - Lleva las 20 filas de `decisiones-fase-6a.md` (a) y la línea técnica que las agrupa.
    - En «Pendientes»:
      - «Formas de fecha»: quedan solo «viernes 13 de abril», «Abril de 1640 T.E.» y «Del 12 al 19 de abril», para la 6b y la 7;
      - «Ocho casos límite»: quedan las previsiones, para la 6b;
      - pendiente nuevo: «Dónde se publica la app (D-099): se te preguntará antes de jugar de verdad».
  - `docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md`: la «Fase 6» pasa a «Fase 6a · Interfaz base y PWA» (el alcance de este contrato) y «Fase 6b · Pantallas del motor» (Inicio con avisos, P3, P4, P5 y la barra con «Avanzar días» y el próximo aviso, después de la fase 5).
- Prueba: un script que cuente 20 filas `| D-0[89]` nuevas. Recuento: 0.

**T2 · Dependencias y Vitest en dos proyectos.**

- Objetivo: instalar las 9 dependencias y separar los proyectos `nodo` e `interfaz`.
- Archivos: `package.json`, `package-lock.json` y `vite.config.ts` (§2.1, versión de la tarea 2); crea `src/interfaz/pruebas/preparar.ts` y `pruebas/humo.test.tsx`.
- Prueba: el humo (3) y que las 568 de partida siguen en `nodo`.

**T3 · Sistema visual.**

- Archivos: crea `estilos/variables.css`, `estilos/global.css`, `estilos/fuentes.ts` y `estilos/estilos.test.ts`; modifica `src/main.tsx` (tres imports) e `index.html` (§2.3, sin el favicon).
- Prueba: `estilos.test.ts` (2). `npm run build` enseña los 6 `woff2` en `dist/assets`.

**T4 · PWA.**

- Archivos: `vite.config.ts` (VitePWA), `package.json` (2 scripts), `scripts/iconos.mjs`, `scripts/comprobarPwa.mjs`, los 3 PNG generados con `npm run iconos` y el favicon en `index.html`.
- Prueba: `npm run build && npm run comprobar:pwa` imprime «PWA lista: 14 archivos en el precaché, 6 fuentes y 3 iconos.». Recuento: 0.

**T5 · Textos de fecha y fecha real.** `src/dominio/calendario/textosFecha.ts` y `src/interfaz/formato/fechaReal.ts`, con sus pruebas (§5.1 y §5.2).

**T6 · Búsqueda sin tildes.** `src/dominio/texto/buscar.ts` y su prueba (§5.3).

**T7 · Equivalencias en texto.** `src/dominio/dinero/textosEquivalencias.ts` y su prueba (§5.4).

**T8 · Orden y textos de partida.** `partidas/orden.ts` y `partidas/textos.ts` con sus pruebas; modifica `modelo/resumen.ts` y `modelo/resumen.test.ts` (§5.5 y §5.6).

**T9 · Partida nueva y «Editar partida» puro.** `partidas/nueva.ts` y `partidas/datos.ts` con sus pruebas (§5.7 y §5.8).

**T10 · Formulario de frecuencia.** `calendario/formularioFrecuencia.ts` y su prueba (§5.9).

**T11 · Datos.** `src/datos/resumenes.ts` y `src/datos/datosDePartida.ts` con sus pruebas (§5.10).

**T12 a T23 · Componentes.** Cada una crea el `.tsx`, su `.module.css` y su prueba del §6 (6.1 a 6.13), y los `.ts` que se nombran allí (`tocados.ts`, `nivelDialogo.ts`, `leerImporte.ts`).

**T24 · Servicios.** `app/servicios.ts`, `app/navegador.ts`, `pruebas/servicios.ts` y dos pruebas (§7.1).

**T25 · Marco.** `app/navegacion.ts`, `marco/*.tsx` y tres pruebas (§7.2 y §7.3).

**T26 · Fecha inicial y tabla de monedas.** `comunes/fechaInicial.ts`, `CampoFechaInicial.tsx`, `comunes/equivalencias.ts`, `TablaMonedas.tsx` y dos pruebas (§6.14).

**T27 · P1 y P1b.** `pantallas/nueva/*` y `NuevaPartida.test.tsx` (§8.4).

**T28 · Importar copia.** `app/copias.ts`, `app/ImportarCopia.tsx` y sus dos pruebas (§8.1). El componente se prueba suelto, con `origen` `selector` y `ajustes`.

**T29 · «Editar partida».** `pantallas/selector/EditarPartida.tsx` y su prueba (§8.3). Se prueba suelto, con el `ResumenPartida` que devuelve `crearPartida` y `alGuardada`, `alBorrada` y `alCerrar` como `vi.fn()`.

**T30 · P0.** `pantallas/selector/TarjetaPartida.tsx`, `SelectorPartidas.tsx` y su prueba (§8.2). Monta `ImportarCopia` (T28) y `EditarPartida` (T29).

**T31 · P6.** `pantallas/ajustes/Ajustes.tsx` y su prueba (§8.5).

**T32 · App.** `app/App.tsx` y `App.test.tsx`; modifica `src/main.tsx` y **borra** `src/App.tsx` (§8.6).

**T33 · Entregable.** `src/interfaz/entregable.test.tsx` (§8.7).

**T34 · Cierre.**

- Comprobaciones automáticas:
  - `npm test` da 821 pruebas en 91 archivos (o el recuento que el plan haya fijado);
  - `npx tsc -b`, `npm run lint` sin avisos, `npm run build` y `npm run comprobar:pwa`.
- Chrome de escritorio sobre `npm run preview` (`http://localhost:4173`, un contexto seguro):
  - en DevTools → Application, el manifiesto no da errores de instalación y el *service worker* está «activated»;
  - con «Offline» marcado, recargar enseña la app con las fuentes;
  - se puede crear, listar, exportar e importar sin red.
- La tablet queda **a cargo del usuario**, con estas instrucciones para el informe de la fase (D-099):
  1. activar la depuración USB;
  2. `adb reverse tcp:4173 tcp:4173`;
  3. abrir `http://localhost:4173` en Chrome para Android;
  4. menú → «Instalar aplicación»;
  5. modo avión;
  6. abrir desde el icono.
- La revisión final de la fase y el registro de todo lo que se haya decidido durante la ejecución.

---

## 12. Fusión con las fases 3 a 5

La 6a se fusiona **después** de que las fases 3 a 5 cierren. Lo más sencillo es fusionar en la rama de la 6a la rama de trabajo ya con el motor, repetir las cuatro comprobaciones y cerrar después.

**Archivos que pueden chocar al fusionar.**

| Archivo | Quién lo toca | Riesgo | Cómo se resuelve |
|---|---|---|---|
| `docs/decisiones.md` | 6a (sección «Fase 6a» y pendientes); fases 4 y 5 (sus secciones y pendientes) | **Seguro** | Se quedan todas las secciones, en el orden 3, 4, 5, 6a; los pendientes se unen a mano |
| `docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md` | 6a (Fase 6); las fases 4 y 5 pueden tocar las suyas | Bajo: son trozos distintos | Automático o a mano |
| `package.json`, `package-lock.json` | 6a (9 dependencias y 2 scripts). La fase 3 no los toca (plan de la fase 3, L15) | Bajo si las fases 4 y 5 tampoco los tocan | Si chocan: se juntan las dependencias en `package.json` y se regenera el bloqueo con `npm install` |
| `vite.config.ts` | 6a. La fase 3 no lo toca (L63) | Bajo | — |
| `src/dominio/modelo/resumen.ts` y `resumen.test.ts` | 6a (D-080). La fase 3 no lo toca | Bajo | — |
| `index.html`, `src/main.tsx`, `src/App.tsx` (borrado) | 6a | Ninguno: el plan de la fase 3 prohíbe tocarlos hasta la fase 6 (`2026-09-18-gestion-aldeas-fase-3.md` L14815) | — |
| `src/dominio/pureza.test.ts` | Nadie lo edita: crece solo | Ninguno | El recuento final suma los módulos de las dos ramas |

**Choques que no son de texto** (los tiene que revisar la 6b al fusionar):

1. `guardarDatosDePartida` cuenta el cambio a mano. Con la fase 3 fusionada se reescribe sobre `guardarEdicion` (`src/datos/ediciones.ts`), que ya cuenta el cambio, para no contarlo dos veces (D-038).
2. `documentoDePartidaNueva` escribe las 34 claves del estado. Si las fases 4 o 5 añaden una colección, `tsc -b` falla y hay que añadirla. Se puede pasar a `estadoDe` de la fase 3 si conviene.
3. Con la fase 3, `importeDesde` normaliza lo tecleado (`normalizarCantidad`). La 6a no guarda ningún importe tecleado, así que no cambia nada; `leerImporte` usa `aBase`, que no cambia.
4. `ConfirmacionEliminar.avisoAvance` se rellena desde la fase 7 con `formatearDiaDelAvance` de la fase 3.
5. La barra superior tiene el hueco `extremo` para el próximo aviso y «Avanzar días» (6b).
6. Los recuentos de pruebas de la fusión son la suma: los de la rama de trabajo con las fases 3 a 5 más las 253 de la 6a en 43 archivos nuevos. Si algún módulo nuevo del dominio coincidiera en nombre, se renombra el de la 6a.
