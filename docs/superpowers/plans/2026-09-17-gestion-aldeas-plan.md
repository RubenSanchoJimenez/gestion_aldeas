# Gestión de Aldeas · Plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para llevar el seguimiento.

**Objetivo:** construir la app de tablet «Gestión de Aldeas», descrita en `docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md`. Lleva la economía de una partida individual de MERP: el personaje, sus asentamientos, el calendario con «Avanzar días» y el estudio de hechizos.

**Arquitectura:**
- **Dominio puro en TypeScript** (`src/dominio/`), sin React ni navegador: dinero en enteros de hierro (mh), calendario gregoriano proléptico, recurrencias y el motor `simular(estado, días)`, todo con pruebas unitarias.
- **Guardado**: cada partida es un documento en IndexedDB, con el estado completo y la copia del último avance para deshacerlo.
- **Interfaz**: React en `src/interfaz/`, que solo lee el estado y llama al dominio.
- **Instalación**: web instalable (PWA) que funciona sin conexión en Chrome para Android.

**Tecnología:** Node 24, Vite 8 (plantilla react-ts de create-vite 9.2.1), React 19, TypeScript 6 estricto, oxlint y Vitest 5; más adelante vite-plugin-pwa, Dexie (IndexedDB) y Testing Library.

**Referencias:**
- Especificación: `docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md`.
- Vistas: `design/artboards/*.dc.html`, generadas por `design/build-artboards.mjs`. Todas usan el mismo ejemplo, «La Sombra del Este» el 12 de abril de 1640 T.E., y sus cifras sirven de casos de prueba.

**Decisiones del usuario (2026-09-17):**
- Web instalable con React, TypeScript y Vite.
- Tablet Android.
- Hoja de ruta completa y fase 1 detallada.
- Primero el núcleo probado y después las pantallas.

---

## Hoja de ruta

Cada fase deja software que funciona y se puede probar por sí solo. Solo la fase 1 está detallada. Al empezar cada fase siguiente se escribe su plan detallado (`docs/superpowers/plans/AAAA-MM-DD-gestion-aldeas-fase-N.md`), con lo aprendido en las anteriores.

### Fase 1 · Base y núcleo de valores (detallada abajo)

- **Objetivo**: el proyecto compila y las reglas de dinero y calendario funcionan y están probadas.
- **Alcance**:
  - proyecto Vite + React + TypeScript + Vitest;
  - dinero: monedas y equivalencias, conversión de lo tecleado a hierro, redondeo, porcentajes, formato en oro y prorrateo a 30 días (§3);
  - calendario: fechas gregorianas prolépticas, bisiestos, día de la semana, suma de días y meses, formato «12 de abril de 1640 T.E.» (§4);
  - recurrencias: siguiente y anterior ocurrencia, ocurrencias en un rango y el último día del mes (§4).
- **Entregable**: `npm test` en verde con las cifras del ejemplo (Bree ingresa 44 mo y tiene un balance de −11,5 mo al mes) y `npm run build` sin errores.

### Fase 2 · Modelo y datos locales

- **Objetivo**: guardar, abrir, exportar e importar partidas.
- **Alcance**:
  - tipos del estado completo de una partida (§8): dominios, cajas, movimientos, personaje, asentamientos, catálogos y avances;
  - IndexedDB con Dexie: un documento por partida y catálogos de la app aparte (§6.5, ámbito de las listas);
  - repositorio: listar, crear, abrir, guardar y borrar partidas;
  - datos de ejemplo «La Sombra del Este» construidos con todas las cifras de las vistas;
  - copia JSON con `versionFormato` (§6.1): validación, rechazo de versiones más nuevas, «Reemplazar» o «Importar como copia»;
  - saldo de una caja = inicial + movimientos no programados (§7).
- **Entregable**: pruebas del repositorio con `fake-indexeddb`; la partida de ejemplo se guarda, se exporta, se importa y da la bolsa de Tharan (46,518 mo) y la caja de Bree (340,6 mo).

### Fase 3 · Motor I: dinero

- **Objetivo**: `simular(estado, días)` avanza el tiempo y mueve el dinero como dice §9.
- **Alcance**:
  - bucle día a día con el orden de pasos de §9;
  - movimientos agrupados: diarios por avance; salarios y soldadas por asentamiento y día; locales por asentamiento y día, con su detalle;
  - gastos e ingresos recurrentes (J5), salarios (A5), soldadas (A6), impuestos fijos y por habitante, tributos (A3) e impuestos de locales comerciales (§7), con `cobradoHasta`, estado abierto o cerrado y producción anotada;
  - pagos y cobros programados;
  - adelantado de las fases 4 y 5 para que el entregable cuadre (D-019): los beneficios de las inversiones, los eventos que cambian impuestos, rentas y gastos, y el cobro al volver de las caravanas de venta;
  - impagos con contraparte automática; el motor nunca deja una caja en negativo;
  - avisos de dinero de la tabla de §9;
  - aplicar un avance y deshacer el último (copia completa, avisos de cambios posteriores);
  - balance mensual y resultado fiscal (§7);
  - reglas de edición y borrado de sus registros: movimientos vinculados que se editan desde su origen, transferencias y la tabla «Al eliminar» (§6.4).
- **Entregable**: pruebas que reproducen la vista previa P4 del ejemplo: Tharan +0,66 mo, Bree +39,9 mo, Archet −60 mo y 8 movimientos. También el balance de Bree (−11,5 mo), el resultado fiscal (+19 mo) y el cobro de locales del 1 de mayo (+4,5 mo).

### Fase 4 · Motor II: almacén

- **Objetivo**: recursos, población, producción y comercio en el motor.
- **Alcance**:
  - población con cambios fechados;
  - consumo de víveres con la ración (§7) y otros consumos (la leña sale de la madera), parando en cero;
  - producción de edificios con varios productos, cantidad proporcional al periodo y acumulado (§7, decisiones del 2026-09-17);
  - capacidad y pérdidas;
  - caravanas de compra, venta y traslado (salida, llegada y pago);
  - obras (inicio programado, progreso y efecto tipado);
  - eventos narrativos con efectos en %;
  - previsión a 30 días y días de reserva;
  - avisos de faltas y pérdidas;
  - reglas de edición y borrado de edificios, existencias, obras, caravanas, mercados y eventos («Al eliminar», §6.4).
- **Entregable**: pruebas con las cifras de las vistas: P5 (víveres 93, madera 386, piedra 197, cerveza 84 y lana 47), A8 (víveres +714 −975 → 49; madera 297; piedra 263; arcilla 157; cerveza 78; lana 95), días de reserva (víveres 11, cerveza 105, madera 85) y el ejemplo de la mina (≈ 8,3 carretadas).

### Fase 5 · Motor III: personaje

- **Objetivo**: deudas, inversiones, inventario y estudio con sus reglas.
- **Alcance**:
  - deudas: devengos, pagos con «Se aplica a», vencimiento como aviso e impagos (§7);
  - inversiones: beneficios cobrados y retirada;
  - inventario: valor, ventas y archivado de lo vendido;
  - patrimonio (§7);
  - estudio por hechizo: intentos, conteos y pergaminos (consumir, archivar y restaurar);
  - reglas de edición y borrado de deudas, pagos, inversiones, objetos, ventas, hechizos, intentos y pergaminos («Al eliminar», §6.4).
- **Entregable**: pruebas con J1 (patrimonio 167,118 mo), J4b (pago de 15 mo al Gremio: capital 27 mo, próximo interés 1,35 mo) y J3b (bolsa 57,518 mo y patrimonio 166,118 mo), y los conteos de J7.

### Fase 6 · Interfaz base y PWA

- **Objetivo**: la app se instala en la tablet y muestra la partida con el motor real.
- **Alcance**:
  - vite-plugin-pwa (manifiesto, service worker, uso sin conexión) y fuentes incluidas en la app (Cormorant Garamond, Source Sans 3 y Cinzel), sin depender de Google Fonts;
  - sistema visual «pergamino legible» (§10) como variables CSS;
  - marco: barra superior con el próximo aviso y «Avanzar días», y menú lateral (§5);
  - componentes comunes: botón, panel, tabla, campo de importe, selector con buscador (§6.5), segmentos, diálogo y diálogo apilado, confirmación de borrado J2d, aviso, campo de fecha y campo de frecuencia (§6.4);
  - pantallas P0–P6: selector de partidas, alta en 2 pasos, Inicio, Calendario, vista previa y resumen del avance, y Ajustes.
- **Entregable**: pruebas de componentes con Testing Library y la app instalada en Chrome para Android, funcionando sin conexión con la partida de ejemplo; P4 y P5 coinciden con las vistas.

### Fase 7 · Personaje

- **Objetivo**: todas las pantallas del personaje.
- **Alcance**:
  - J1 a J8 con sus diálogos: J2b–J2f (nuevo, transferencia, editar, alta rápida, eliminar), J3b, J4b y J8;
  - movimientos vinculados que se editan desde su origen (§6.4);
  - saldo negativo con confirmación.
- **Entregable**: flujos del personaje probados con Testing Library y comparados con las vistas de la página Personaje.

### Fase 8 · Asentamiento

- **Objetivo**: todas las pantallas del asentamiento.
- **Alcance**:
  - A0 a A12 con sus pestañas y diálogos: A2b deudas, A3b locales comerciales, A3c producción del mes, A6b armería, A7b editar edificio, A8b víveres, A9b obra, A10b caravana, A10c nuevo mercado, A11b evento y A12b animales.
- **Entregable**: flujos del asentamiento probados y comparados con las vistas de la página Asentamiento.

### Fase 9 · Altas, listas y catálogos, y cierre

- **Objetivo**: completar lo transversal y dejar la app lista para la mesa.
- **Alcance**:
  - altas desde los desplegables (§6.6: alta rápida, alta completa y nombre nuevo en el campo);
  - P7 Listas y catálogos y P7b eliminar con reasignación;
  - copias JSON con los catálogos;
  - estados vacíos, cerrar con cambios sin guardar y teclado en pantalla (§6.4);
  - prueba completa en la tablet Android.
- **Entregable**: lista de aceptación de la especificación recorrida en la tablet y una sesión de juego de prueba con una partida nueva.

---

## Fase 1 · Base y núcleo de valores

**Estructura de archivos de la fase 1**

```
package.json · tsconfig*.json · vite.config.ts · index.html · .gitignore     proyecto (Tarea 1)
src/main.tsx · src/App.tsx                                                   interfaz mínima (Tarea 1)
src/dominio/humo.test.ts                                                     prueba de humo (Tarea 1)
src/dominio/dinero/monedas.ts        monedas, equivalencias y valor en hierro (Tarea 2)
src/dominio/dinero/importe.ts        texto tecleado → hierro, redondeo y porcentajes (Tarea 3)
src/dominio/dinero/formato.ts        números y oro en formato español (Tarea 4)
src/dominio/calendario/fecha.ts      fechas gregorianas prolépticas (Tarea 5)
src/dominio/calendario/formatoFecha.ts  «12 de abril de 1640 T.E.» (Tarea 6)
src/dominio/calendario/recurrencia.ts   ocurrencias de pagos, cobros y producciones (Tarea 7)
src/dominio/dinero/prorrateo.ts      equivalente a 30 días (Tarea 8)
```

Cada módulo de `src/dominio/` es puro: no importa React ni APIs del navegador, y su prueba está al lado (`*.test.ts`).

---

### Tarea 1: Proyecto base

Deja en la raíz del repositorio una aplicación Vite + React + TypeScript estricto que compila, con Vitest listo para las pruebas del dominio. La app vive junto a `design/`, `docs/` y `README.md`, que no se tocan. El `.gitignore` conserva sus líneas y se amplía.

**Archivos:**
- Crear: `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.oxlintrc.json`, `src/main.tsx`, `src/App.tsx`
- Modificar: `.gitignore`
- Prueba: `src/dominio/humo.test.ts`

De la plantilla **no** se copian `README.md`, `.gitignore`, `public/` (logotipos de Vite), `src/assets/`, `src/App.css` ni `src/index.css`: son el ejemplo de la plantilla. El sistema visual y los iconos llegan en la fase 6.

**Versiones instaladas** (comprobadas el 17 de septiembre de 2026 con Node 24.18.1 y npm 11.16.0; salen de `npm ls --depth=0`):

| Paquete | Rango en `package.json` | Versión instalada |
|---|---|---|
| create-vite (solo para generar la plantilla) | — | 9.2.1 |
| react | ^19.2.8 | 19.3.0 |
| react-dom | ^19.2.8 | 19.3.0 |
| vite | ^8.3.0 | 8.3.0 |
| @vitejs/plugin-react | ^6.1.1 | 6.1.1 |
| typescript | ~6.0.2 | 6.0.3 |
| vitest | ^5.0.1 | 5.0.1 |
| oxlint | ^1.81.0 | 1.83.0 |
| @types/react | ^19.2.18 | 19.3.0 |
| @types/react-dom | ^19.2.7 | 19.3.0 |
| @types/node | ^24.13.3 | 24.13.5 |

TypeScript se queda en la serie 6.0, la que fija la plantilla oficial de create-vite 9.2.1 (`~6.0.2`), aunque npm ya publica la 7.0.2.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
cd C:/Proyectos/GA/gestion_aldeas
node -v
npm -v
git status --short
ls -A
```

Salida esperada: `v24.18.1`, `11.16.0`, ninguna línea de `git status` (árbol limpio) y estas entradas:

```text
v24.18.1
11.16.0
.git
.gitignore
README.md
design
docs
```

Si `git status --short` muestra cambios, guárdalos o confírmalos antes de seguir.

- [ ] **Paso 2: Generar la plantilla react-ts en una carpeta temporal**

create-vite no escribe en una carpeta con archivos: sin `--overwrite` cancela, y con `--overwrite` borraría `design/` y `docs/`. Por eso la plantilla se genera en `plantilla-vite/` y después se mueve. `npx --yes` evita la pregunta de instalar create-vite; `--no-interactive` y `--no-immediate` evitan las preguntas de la plantilla y que instale y arranque el servidor.

```bash
npx --yes create-vite@9.2.1 plantilla-vite --template react-ts --no-interactive --no-immediate
ls -A plantilla-vite
```

Salida esperada:

```text
│
◇  Scaffolding project in C:\Proyectos\GA\gestion_aldeas\plantilla-vite...
│
└  Done. Now run:

  cd plantilla-vite
  npm install
  npm run dev

.gitignore
.oxlintrc.json
README.md
index.html
package.json
public
src
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vite.config.ts
```

- [ ] **Paso 3: Llevar a la raíz los archivos de la app y quitar el ejemplo**

```bash
mv plantilla-vite/package.json plantilla-vite/index.html plantilla-vite/vite.config.ts plantilla-vite/tsconfig.json plantilla-vite/tsconfig.app.json plantilla-vite/tsconfig.node.json plantilla-vite/.oxlintrc.json plantilla-vite/src .
rm -rf plantilla-vite
rm -r src/assets src/App.css src/index.css
ls -A
ls -A src
```

Salida esperada (la primera lista es la raíz; la segunda, `src`):

```text
.git
.gitignore
.oxlintrc.json
README.md
design
docs
index.html
package.json
src
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vite.config.ts
App.tsx
main.tsx
```

- [ ] **Paso 4: Ampliar `.gitignore`**

Se añaden las dependencias de npm y la carpeta de compilación, sin tocar las líneas que ya tiene.

```bash
cat >> .gitignore <<'EOF'
# Dependencias instaladas por npm
node_modules
# Compilación de la app (npm run build)
dist
EOF
cat .gitignore
```

Salida esperada:

```text
# Canvas sembrado para Claude Design: se genera a partir de design/artboards (unos 4 MB)
design/gestion-aldeas.html
# Vistas combinadas temporales para medir los artboards
design/.vistas-preview/
# Dependencias instaladas por npm
node_modules
# Compilación de la app (npm run build)
dist
```

- [ ] **Paso 5: Dar nombre al paquete e instalar las dependencias**

La plantilla pone al paquete el nombre de la carpeta temporal (`plantilla-vite`); se cambia antes de instalar para que `package-lock.json` nazca con el nombre bueno.

```bash
npm pkg set name=gestion-aldeas
npm install
npm ls --depth=0
```

Salida esperada (el tiempo varía):

```text
added 27 packages, and audited 28 packages in 8s

9 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
gestion-aldeas@0.0.0 C:\Proyectos\GA\gestion_aldeas
+-- @types/node@24.13.5
+-- @types/react-dom@19.3.0
+-- @types/react@19.3.0
+-- @vitejs/plugin-react@6.1.1
+-- oxlint@1.83.0
+-- react-dom@19.3.0
+-- react@19.3.0
+-- typescript@6.0.3
`-- vite@8.3.0
```

- [ ] **Paso 6: Dejar la página y la app reducidas a un título**

Sustituye todo el contenido de `index.html` por (página en castellano, con el título de la app y sin el favicon de Vite):

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gestión de Aldeas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Sustituye todo el contenido de `src/main.tsx` por (igual que el de la plantilla, sin importar `./index.css`, que se ha borrado):

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Sustituye todo el contenido de `src/App.tsx` por:

```tsx
function App() {
  return <h1>Gestión de Aldeas</h1>
}

export default App
```

- [ ] **Paso 7: Activar TypeScript estricto**

La plantilla no declara `"strict"`. Se declara `"strict": true` en los dos proyectos de TypeScript (la app en `src/` y la configuración de Vite) para que el compilador exija tipos completos y compruebe `null` y `undefined`: el dominio trabaja con importes y fechas, donde un `undefined` inadvertido daría cifras falsas.

Sustituye todo el contenido de `tsconfig.app.json` por:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Comprobaciones estrictas */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

Sustituye todo el contenido de `tsconfig.node.json` por:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "module": "nodenext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Comprobaciones estrictas */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

`tsconfig.json` se queda como lo deja la plantilla (solo referencia a los dos anteriores). Comprueba que el modo estricto está activo en los dos:

```bash
npx tsc -p tsconfig.app.json --showConfig | grep '"strict"'
npx tsc -p tsconfig.node.json --showConfig | grep '"strict"'
```

Salida esperada:

```text
        "strict": true,
        "strict": true,
```

- [ ] **Paso 8: Comprobar que la app compila**

```bash
npm run build
```

Salida esperada (el tiempo y el nombre del `.js` pueden variar):

```text
> gestion-aldeas@0.0.0 build
> tsc -b && vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 15 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.32 kB │ gzip:  0.24 kB
dist/assets/index-Rsx7aO-5.js  219.63 kB │ gzip: 68.60 kB

✓ built in 201ms
```

`dist/` queda ignorada por Git.

- [ ] **Paso 9: Escribir la prueba de humo**

Esta prueba comprueba el entorno de pruebas, no una regla de dominio: que Vitest ejecuta los archivos `*.test.ts` de `src/`, que lo hace en node (el dominio es TypeScript puro, sin navegador) y que `BigInt` multiplica sin redondear, porque el dinero lo necesitará para los productos que pasen de `Number.MAX_SAFE_INTEGER` (§3).

Crea `src/dominio/humo.test.ts` con este contenido:

```ts
import { describe, it, expect } from 'vitest'

describe('prueba de humo del entorno de pruebas', () => {
  it('Vitest ejecuta las pruebas del dominio', () => {
    expect(1 + 1).toBe(2)
  })

  it('las pruebas del dominio se ejecutan en node, sin navegador', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })

  it('BigInt multiplica importes grandes sin perder precisión', () => {
    expect(BigInt(Number.MAX_SAFE_INTEGER) * 10n).toBe(90071992547409910n)
  })
})
```

- [ ] **Paso 10: Ejecutar la prueba y ver que falla**

No uses todavía `npx vitest`: sin Vitest en el proyecto, `npx` lo descargaría aparte y no comprobaría la instalación del proyecto.

```bash
npm test
```

Fallo esperado (todavía no hay ejecutor de pruebas; la ruta del registro varía):

```text
npm error Missing script: "test"
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error A complete log of this run can be found in: …
```

- [ ] **Paso 11: Instalar y configurar Vitest**

```bash
npm install --save-dev vitest@5.0.1
npm pkg set scripts.test="vitest run"
```

Salida esperada del `npm install` (el tiempo varía):

```text
added 22 packages, and audited 50 packages in 2s

13 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

Sustituye todo el contenido de `vite.config.ts` por (la referencia a `vitest/config` añade a los tipos de Vite la clave `test`):

```ts
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // El dominio es TypeScript puro: sus pruebas corren en node, sin navegador.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

Comprueba `package.json`:

```bash
cat package.json
```

Salida esperada:

```json
{
  "name": "gestion-aldeas",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@types/node": "^24.13.3",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^6.1.1",
    "oxlint": "^1.81.0",
    "typescript": "~6.0.2",
    "vite": "^8.3.0",
    "vitest": "^5.0.1"
  }
}
```

- [ ] **Paso 12: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/humo.test.ts
```

Salida esperada (la ruta, la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

Para ver cada prueba por su nombre, añade `--reporter=verbose` al comando: aparecen tres líneas `✓ src/dominio/humo.test.ts > prueba de humo del entorno de pruebas > …`.

- [ ] **Paso 13: Comprobar `npm test`, `npm run build` y el estado del repositorio**

```bash
npm test
npm run build
git status --short
```

Salida esperada: `npm test` termina con `Test Files  1 passed (1)` y `Tests  3 passed (3)`; `npm run build` termina con `✓ built in …` como en el paso 8 (ahora `tsc -b` también comprueba los tipos de la prueba y de `vite.config.ts`); y `git status` muestra solo esto, sin cambios en `design/`, `docs/` ni `README.md`, y sin `node_modules/` ni `dist/`:

```text
 M .gitignore
?? .oxlintrc.json
?? index.html
?? package-lock.json
?? package.json
?? src/
?? tsconfig.app.json
?? tsconfig.json
?? tsconfig.node.json
?? vite.config.ts
```

- [ ] **Paso 14: Commit**

```bash
git add .gitignore .oxlintrc.json package.json package-lock.json index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json src/main.tsx src/App.tsx src/dominio/humo.test.ts
git commit -m "chore: crear el proyecto base con Vite, React, TypeScript estricto y Vitest" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada: con `core.autocrlf=true` (lo normal en Git para Windows), Git avisa `warning: in the working copy of '…', LF will be replaced by CRLF the next time Git touches it` por cada archivo, y es inofensivo. El commit crea los 11 archivos nuevos y modifica `.gitignore` (el identificador del commit varía, y el número de líneas puede variar un poco si npm resuelve otras versiones de parche). `git status --short` no muestra nada:

```text
[diseno/especificacion-y-vistas a60f941] chore: crear el proyecto base con Vite, React, TypeScript estricto y Vitest
 12 files changed, 1805 insertions(+)
 create mode 100644 .oxlintrc.json
 create mode 100644 index.html
 create mode 100644 package-lock.json
 create mode 100644 package.json
 create mode 100644 src/App.tsx
 create mode 100644 src/dominio/humo.test.ts
 create mode 100644 src/main.tsx
 create mode 100644 tsconfig.app.json
 create mode 100644 tsconfig.json
 create mode 100644 tsconfig.node.json
 create mode 100644 vite.config.ts
```

---

### Tarea 2: Monedas y equivalencias

MERP usa siete monedas, del mithril al hierro. Cada partida fija al crearse cuánto vale cada moneda en la siguiente (sus «equivalencias»), y la app guarda todo el dinero como un número entero de la moneda más pequeña, el hierro (mh). Esta tarea define las monedas, las equivalencias por defecto, el valor de cada moneda en hierro y la validación de las equivalencias que el jugador edita al crear la partida.

Reglas de la especificación que implementa:

- **Monedas y equivalencias por defecto (§3).** 1 mm = 100 mo, y cada una de las demás vale 10 de la siguiente: mo, mp, mb, mc, me y mh. Son las de MERP, confirmadas con el usuario.
- **Unidad base (§3, «Cálculo»).** Todos los importes se guardan como enteros de hierro, para que las sumas y los saldos sean exactos. `valorEnBase` multiplica las equivalencias desde la moneda hasta el hierro: 1 mo = 10 × 10 × 10 × 10 × 10 = 100000 mh, y 1 mm = 100 × 100000 = 10000000 mh.
- **Validación en P1 (§6.1, P1).** «Editar equivalencias» solo admite enteros de 2 o más: con 1, dos monedas valdrían lo mismo, y con decimales el valor en hierro dejaría de ser entero. Después de crear la partida las equivalencias quedan fijas (§3), porque cambiarlas alteraría el valor de todo lo registrado. El mensaje nombra la moneda en minúsculas («La equivalencia de mithril…»): el campo `mmEnMo` es la fila del mithril en la tabla de P1.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/dinero/monedas.ts`
- Prueba: `src/dominio/dinero/monedas.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La carpeta `src/dominio/dinero/` es nueva. Las pruebas usan también unas equivalencias personalizadas (1 mm = 50 mo y 1 mo = 12 mp) para comprobar que el código no da por hechas las de por defecto.

Crea `src/dominio/dinero/monedas.test.ts` con este contenido:

```ts
import { describe, it, expect } from 'vitest'
import {
  EQUIVALENCIAS_POR_DEFECTO,
  MONEDAS,
  NOMBRE_MONEDA,
  validarEquivalencias,
  valorEnBase,
  type Equivalencias,
} from './monedas'

/** Equivalencias personalizadas: 1 mm = 50 mo y 1 mo = 12 mp; el resto, por defecto. */
const PERSONALIZADAS: Equivalencias = {
  mmEnMo: 50,
  moEnMp: 12,
  mpEnMb: 10,
  mbEnMc: 10,
  mcEnMe: 10,
  meEnMh: 10,
}

describe('monedas', () => {
  it('ordena las monedas de la más valiosa al hierro', () => {
    expect(MONEDAS).toEqual(['mm', 'mo', 'mp', 'mb', 'mc', 'me', 'mh'])
  })

  it('da el nombre de cada moneda', () => {
    expect(NOMBRE_MONEDA).toEqual({
      mm: 'Mithril',
      mo: 'Oro',
      mp: 'Plata',
      mb: 'Bronce',
      mc: 'Cobre',
      me: 'Estaño',
      mh: 'Hierro',
    })
  })

  it('usa las equivalencias por defecto de la especificación (§3)', () => {
    expect(EQUIVALENCIAS_POR_DEFECTO).toEqual({
      mmEnMo: 100,
      moEnMp: 10,
      mpEnMb: 10,
      mbEnMc: 10,
      mcEnMe: 10,
      meEnMh: 10,
    })
  })
})

describe('valorEnBase', () => {
  it('da el valor de 1 unidad en hierro con las equivalencias por defecto', () => {
    expect(valorEnBase('mm', EQUIVALENCIAS_POR_DEFECTO)).toBe(10000000)
    expect(valorEnBase('mo', EQUIVALENCIAS_POR_DEFECTO)).toBe(100000)
    expect(valorEnBase('mp', EQUIVALENCIAS_POR_DEFECTO)).toBe(10000)
    expect(valorEnBase('mb', EQUIVALENCIAS_POR_DEFECTO)).toBe(1000)
    expect(valorEnBase('mc', EQUIVALENCIAS_POR_DEFECTO)).toBe(100)
    expect(valorEnBase('me', EQUIVALENCIAS_POR_DEFECTO)).toBe(10)
    expect(valorEnBase('mh', EQUIVALENCIAS_POR_DEFECTO)).toBe(1)
  })

  it('multiplica las equivalencias de la partida desde la moneda hasta el hierro', () => {
    expect(valorEnBase('mm', PERSONALIZADAS)).toBe(6000000)
    expect(valorEnBase('mo', PERSONALIZADAS)).toBe(120000)
    expect(valorEnBase('mp', PERSONALIZADAS)).toBe(10000)
    expect(valorEnBase('mh', PERSONALIZADAS)).toBe(1)
  })
})

describe('validarEquivalencias', () => {
  it('acepta las equivalencias por defecto y las personalizadas', () => {
    expect(validarEquivalencias(EQUIVALENCIAS_POR_DEFECTO)).toEqual([])
    expect(validarEquivalencias(PERSONALIZADAS)).toEqual([])
  })

  it('acepta 2, el mínimo', () => {
    expect(
      validarEquivalencias({ mmEnMo: 2, moEnMp: 2, mpEnMb: 2, mbEnMc: 2, mcEnMe: 2, meEnMh: 2 }),
    ).toEqual([])
  })

  it('rechaza una equivalencia menor que 2', () => {
    expect(validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, mmEnMo: 1 })).toEqual([
      'La equivalencia de mithril debe ser un número entero de 2 o más',
    ])
    expect(validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, meEnMh: 0 })).toEqual([
      'La equivalencia de estaño debe ser un número entero de 2 o más',
    ])
    expect(validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, mbEnMc: -10 })).toEqual([
      'La equivalencia de bronce debe ser un número entero de 2 o más',
    ])
  })

  it('rechaza una equivalencia que no es un número entero', () => {
    expect(validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, moEnMp: 2.5 })).toEqual([
      'La equivalencia de oro debe ser un número entero de 2 o más',
    ])
    expect(validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, mpEnMb: Number.NaN })).toEqual([
      'La equivalencia de plata debe ser un número entero de 2 o más',
    ])
    expect(
      validarEquivalencias({ ...EQUIVALENCIAS_POR_DEFECTO, mcEnMe: Number.POSITIVE_INFINITY }),
    ).toEqual(['La equivalencia de cobre debe ser un número entero de 2 o más'])
  })

  it('devuelve todos los errores en el orden de las monedas', () => {
    expect(
      validarEquivalencias({ mmEnMo: 100, moEnMp: 1, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 1.5 }),
    ).toEqual([
      'La equivalencia de oro debe ser un número entero de 2 o más',
      'La equivalencia de estaño debe ser un número entero de 2 o más',
    ])
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/dinero/monedas.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./monedas`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/dinero/monedas.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/dinero/monedas.test.ts [ src/dominio/dinero/monedas.test.ts ]
Error: Cannot find module './monedas' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/dinero/monedas.test.ts
 ❯ src/dominio/dinero/monedas.test.ts:2:1
      1| import { describe, it, expect } from 'vitest'
      2| import {
       | ^
      3|   EQUIVALENCIAS_POR_DEFECTO,
      4|   MONEDAS,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  12:27:00
   Duration  443ms (worker 98%, environment 2%)
```

- [ ] **Paso 3: Implementar `monedas.ts`**

Crea `src/dominio/dinero/monedas.ts` con este contenido:

```ts
/** Abreviaturas de las monedas de MERP, de la más valiosa a la unidad base (§3). */
export type Moneda = 'mm' | 'mo' | 'mp' | 'mb' | 'mc' | 'me' | 'mh'

export const MONEDAS: readonly Moneda[] = ['mm', 'mo', 'mp', 'mb', 'mc', 'me', 'mh']

export const NOMBRE_MONEDA: Record<Moneda, string> = {
  mm: 'Mithril',
  mo: 'Oro',
  mp: 'Plata',
  mb: 'Bronce',
  mc: 'Cobre',
  me: 'Estaño',
  mh: 'Hierro',
}

/** Cuántas unidades de la moneda siguiente vale 1 unidad. El mithril se expresa en oro. */
export interface Equivalencias {
  mmEnMo: number
  moEnMp: number
  mpEnMb: number
  mbEnMc: number
  mcEnMe: number
  meEnMh: number
}

export const EQUIVALENCIAS_POR_DEFECTO: Equivalencias = {
  mmEnMo: 100,
  moEnMp: 10,
  mpEnMb: 10,
  mbEnMc: 10,
  mcEnMe: 10,
  meEnMh: 10,
}

/** Campo de cada moneda, en el orden de MONEDAS: CAMPOS[i] dice cuánto vale MONEDAS[i] en MONEDAS[i + 1]. */
const CAMPOS: readonly (keyof Equivalencias)[] = ['mmEnMo', 'moEnMp', 'mpEnMb', 'mbEnMc', 'mcEnMe', 'meEnMh']

/** Valor de 1 unidad de la moneda en hierro (mh), entero. Por defecto: mo = 100000, mm = 10000000, mh = 1. */
export function valorEnBase(moneda: Moneda, eq: Equivalencias): number {
  let valor = 1
  for (let i = MONEDAS.indexOf(moneda); i < CAMPOS.length; i++) {
    valor *= eq[CAMPOS[i]]
  }
  return valor
}

/** Errores de validación (P1): cada equivalencia es un entero ≥ 2. Lista vacía si todo es válido. */
export function validarEquivalencias(eq: Equivalencias): string[] {
  const errores: string[] = []
  CAMPOS.forEach((campo, i) => {
    const valor = eq[campo]
    if (!Number.isInteger(valor) || valor < 2) {
      const nombre = NOMBRE_MONEDA[MONEDAS[i]].toLowerCase()
      errores.push(`La equivalencia de ${nombre} debe ser un número entero de 2 o más`)
    }
  })
  return errores
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/dinero/monedas.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  12:27:03
   Duration  379ms (transform 50%, import 31%, worker 10%, tests 9%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

Vitest ejecuta las pruebas sin comprobar los tipos; `tsc -b` los comprueba en `src/`, también en las pruebas.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con:

```text
 Test Files  2 passed (2)
      Tests  13 passed (13)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/dinero/monedas.ts src/dominio/dinero/monedas.test.ts
git commit -m "feat(dinero): monedas, equivalencias y valor de cada moneda en hierro" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/dinero/monedas.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/dinero/monedas.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 8758a82] feat(dinero): monedas, equivalencias y valor de cada moneda en hierro
 2 files changed, 171 insertions(+)
 create mode 100644 src/dominio/dinero/monedas.test.ts
 create mode 100644 src/dominio/dinero/monedas.ts
```

### Tarea 3: Importe: de lo tecleado a hierro, redondeo y porcentajes

El jugador teclea cantidades en cualquier moneda («6 mp», «0,5 mo») y la app las guarda en hierro. Esta tarea convierte lo tecleado a hierro, guarda también lo que se tecleó, fija el redondeo de todo el dinero y calcula porcentajes (impuestos e intereses).

Reglas de la especificación que implementa:

- **Conversión al teclear (§3, «Cálculo»).** Cantidad × valor de la moneda se convierte en un entero de hierro, y todas las operaciones se hacen sobre esos enteros, nunca en la moneda tecleada ni en coma flotante. En coma flotante `0.1 + 0.2` da `0.30000000000000004`; en hierro, 10000 + 20000 = 30000 exacto. Por eso `aBase` no convierte el texto en `number`: lee los dígitos, los pasa a millonésimas de la moneda y multiplica con `BigInt`.
- **Redondeo (§3, «Redondeo»).** Lo introducido se redondea al mh más cercano, con las mitades hacia arriba: 0,000015 mo = 1,5 mh → 2 mh. Los porcentajes, los prorrateos y las divisiones siguen el mismo criterio. «Hacia arriba» es hacia +∞, también en negativo: −2,5 → −2. `Math.round` de JavaScript hace justo eso; `redondearMitadArriba` le da nombre a la regla y devuelve 0 en lugar de −0. El truco habitual `Math.floor(x + 0.5)` falla con 0,49999999999999994, que sube a 1.
- **Qué admite el campo de importe (§3, «Campo de importe»).** Una cantidad sin signo: el signo lo pone el tipo de movimiento (gasto o ingreso, §8). Coma o punto decimal, porque el teclado numérico de Android puede dar cualquiera de los dos; por eso «1.234» es 1,234 y no mil doscientos treinta y cuatro. Como mucho 6 decimales. Se aceptan «6,» y «,5»: el campo calcula «= X mo» al momento y el jugador pasa por «6,» al escribir «6,5». Todo lo demás lanza `Error('Cantidad no válida')`, también un resultado mayor que `Number.MAX_SAFE_INTEGER` (9.007.199.254.740.991 mh, unos 90.000 millones de mo), porque un `number` ya no lo guardaría exacto.
- **Lo introducido (§3 y §8, `Importe`).** El movimiento guarda también lo tecleado («6 mp»), que el libro enseña como dato secundario. `importeDesde` lo guarda tal como se tecleó, sin los espacios de alrededor. Es opcional: los importes calculados o agrupados (intereses, movimientos del avance, impuestos por habitante y de locales) solo llevan `base`.
- **Porcentajes (§7, impuestos de locales y deudas).** El impuesto de un local es un porcentaje de su producción, calculado en mh y redondeado al mh con las mitades hacia arriba: la Herrería 1 produce 10 mo y paga el 10 %, 1 mo. Los intereses de las deudas también son porcentajes del capital. `porcentajeDe` calcula con `BigInt` por dos motivos: en coma flotante 375 × 9,2 / 100 da 34,49999999999999 y redondearía a 34 en vez de 35, y base × porcentaje puede pasar de `Number.MAX_SAFE_INTEGER`. Admite porcentajes con hasta 6 decimales (el de un tipo de local lleva como mucho 2).

**Archivos:**
- Crear: `src/dominio/dinero/importe.ts`
- Prueba: `src/dominio/dinero/importe.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/dinero/importe.test.ts` con este contenido:

```ts
import { describe, it, expect } from 'vitest'
import { aBase, importeDesde, porcentajeDe, redondearMitadArriba } from './importe'
import { EQUIVALENCIAS_POR_DEFECTO, type Equivalencias } from './monedas'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** 1 mm = 50 mo y 1 mo = 12 mp: 1 mo vale 120000 mh. */
const PERSONALIZADAS: Equivalencias = {
  mmEnMo: 50,
  moEnMp: 12,
  mpEnMb: 10,
  mbEnMc: 10,
  mcEnMe: 10,
  meEnMh: 10,
}

describe('redondearMitadArriba', () => {
  it('redondea al entero más cercano', () => {
    expect(redondearMitadArriba(2.4)).toBe(2)
    expect(redondearMitadArriba(2.6)).toBe(3)
    expect(redondearMitadArriba(-2.4)).toBe(-2)
    expect(redondearMitadArriba(-2.6)).toBe(-3)
    expect(redondearMitadArriba(1285714.2857142857)).toBe(1285714)
  })

  it('lleva las mitades hacia arriba, también en negativo', () => {
    expect(redondearMitadArriba(2.5)).toBe(3)
    expect(redondearMitadArriba(-2.5)).toBe(-2)
    expect(redondearMitadArriba(0.5)).toBe(1)
  })

  it('no sube el número de coma flotante más cercano a 0,5 por debajo', () => {
    expect(redondearMitadArriba(0.49999999999999994)).toBe(0)
  })

  it('devuelve 0 y no −0', () => {
    expect(redondearMitadArriba(-0.4)).toBe(0)
  })
})

describe('aBase', () => {
  it('convierte lo tecleado en hierro (mh)', () => {
    expect(aBase('6', 'mp', EQ)).toBe(60000)
    expect(aBase('12,345', 'mo', EQ)).toBe(1234500)
    expect(aBase('1', 'mm', EQ)).toBe(10000000)
    expect(aBase('18', 'mc', EQ)).toBe(1800)
    expect(aBase('7', 'mh', EQ)).toBe(7)
  })

  it('admite punto decimal además de coma', () => {
    expect(aBase('12.345', 'mo', EQ)).toBe(1234500)
    expect(aBase('0.6', 'mo', EQ)).toBe(60000)
  })

  it('admite espacios alrededor, un separador sin decimales y decimales sin parte entera', () => {
    expect(aBase(' 6 ', 'mp', EQ)).toBe(60000)
    expect(aBase('6,', 'mp', EQ)).toBe(60000)
    expect(aBase(',5', 'mo', EQ)).toBe(50000)
  })

  it('redondea al mh más cercano, con las mitades hacia arriba', () => {
    expect(aBase('0,000015', 'mo', EQ)).toBe(2)
    expect(aBase('0,000014', 'mo', EQ)).toBe(1)
    expect(aBase('0,5', 'mh', EQ)).toBe(1)
    expect(aBase('0,4', 'mh', EQ)).toBe(0)
  })

  it('admite 6 decimales', () => {
    expect(aBase('1,000001', 'mm', EQ)).toBe(10000010)
    expect(aBase('0,000001', 'mo', EQ)).toBe(0)
  })

  it('suma la bolsa inicial del ejemplo: 38 mo + 25 mp + 40 mb + 18 mc = 4091800 mh', () => {
    const bolsa = aBase('38', 'mo', EQ) + aBase('25', 'mp', EQ) + aBase('40', 'mb', EQ) + aBase('18', 'mc', EQ)
    expect(bolsa).toBe(4091800)
  })

  it('suma sin errores de coma flotante', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(aBase('0,1', 'mo', EQ) + aBase('0,2', 'mo', EQ)).toBe(30000)
  })

  it('usa las equivalencias de la partida', () => {
    expect(aBase('1', 'mo', PERSONALIZADAS)).toBe(120000)
    expect(aBase('0,5', 'mm', PERSONALIZADAS)).toBe(3000000)
  })

  it('llega exacto hasta el mayor entero seguro y rechaza lo que pasa de ahí', () => {
    expect(aBase('90071992547,40991', 'mo', EQ)).toBe(Number.MAX_SAFE_INTEGER)
    expect(() => aBase('90071992547,40992', 'mo', EQ)).toThrow('Cantidad no válida')
  })

  it.each([
    '',
    '   ',
    ',',
    'abc',
    '6 mp',
    '1,2,3',
    '1.234,5',
    '-5',
    '+5',
    '1e3',
    '12,3456789',
    '0,0000001',
  ])('rechaza «%s»', (texto) => {
    expect(() => aBase(texto, 'mo', EQ)).toThrow('Cantidad no válida')
  })
})

describe('importeDesde', () => {
  it('guarda la base en mh y lo introducido', () => {
    expect(importeDesde('6', 'mp', EQ)).toEqual({
      base: 60000,
      introducido: { cantidad: '6', moneda: 'mp' },
    })
  })

  it('guarda la cantidad tal como se tecleó, sin los espacios de alrededor', () => {
    expect(importeDesde(' 0.5 ', 'mo', EQ)).toEqual({
      base: 50000,
      introducido: { cantidad: '0.5', moneda: 'mo' },
    })
  })

  it('lanza el error de aBase si la cantidad no es válida', () => {
    expect(() => importeDesde('seis', 'mp', EQ)).toThrow('Cantidad no válida')
  })
})

describe('porcentajeDe', () => {
  it('calcula el impuesto de la Herrería 1: 10 % de 10 mo = 1 mo', () => {
    expect(porcentajeDe(1000000, 10)).toBe(100000)
  })

  it('calcula el 5 % de 1,5 mo = 0,075 mo', () => {
    expect(porcentajeDe(150000, 5)).toBe(7500)
  })

  it('admite porcentajes con decimales', () => {
    expect(porcentajeDe(1000000, 12.25)).toBe(122500)
    expect(porcentajeDe(100000000, 0.000001)).toBe(1)
  })

  it('redondea al mh con las mitades hacia arriba', () => {
    expect(porcentajeDe(5, 10)).toBe(1)
    expect(porcentajeDe(4, 10)).toBe(0)
    expect(porcentajeDe(-25, 10)).toBe(-2)
  })

  it('es exacto donde la coma flotante falla', () => {
    // 375 × 9,2 % = 34,5 mh, pero en coma flotante da 34,49999999999999.
    expect((375 * 9.2) / 100).not.toBe(34.5)
    expect(porcentajeDe(375, 9.2)).toBe(35)
    // 9007199254740991 × 99,99 % = 9006298534815516,9009 mh.
    expect(porcentajeDe(9007199254740991, 99.99)).toBe(9006298534815517)
  })

  it('devuelve 0 con base 0 o porcentaje 0', () => {
    expect(porcentajeDe(0, 10)).toBe(0)
    expect(porcentajeDe(1000000, 0)).toBe(0)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/dinero/importe.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./importe`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/dinero/importe.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/dinero/importe.test.ts [ src/dominio/dinero/importe.test.ts ]
Error: Cannot find module './importe' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/dinero/importe.test.ts
 ❯ src/dominio/dinero/importe.test.ts:2:1
      1| import { describe, it, expect } from 'vitest'
      2| import { aBase, importeDesde, porcentajeDe, redondearMitadArriba } fro…
       | ^
      3| import { EQUIVALENCIAS_POR_DEFECTO, type Equivalencias } from './moned…
      4|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  12:27:13
   Duration  423ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `importe.ts`**

Crea `src/dominio/dinero/importe.ts` con este contenido:

```ts
import { valorEnBase, type Equivalencias, type Moneda } from './monedas'

/** Importe guardado: base entera en hierro (mh), con signo, y lo que tecleó el jugador, si lo tecleó (§3 y §8). */
export interface Importe {
  base: number
  introducido?: { cantidad: string; moneda: Moneda }
}

/** Decimales que admite una cantidad tecleada. */
const MAX_DECIMALES = 6

/** Parte entera y decimales de una cantidad sin signo, con coma o punto decimal. */
const PATRON_CANTIDAD = /^(\d*)(?:[.,](\d*))?$/

/** Redondeo al entero más cercano; las mitades, hacia arriba (+∞): 2,5 → 3; −2,5 → −2. (§3) */
export function redondearMitadArriba(valor: number): number {
  // Math.round ya lleva las mitades hacia +∞; el `+ 0` convierte −0 en 0.
  return Math.round(valor) + 0
}

/** numerador ÷ denominador (denominador > 0), redondeado al entero más cercano con las mitades hacia arriba (+∞), sin coma flotante. */
function dividirMitadArriba(numerador: bigint, denominador: bigint): bigint {
  const n = 2n * numerador + denominador
  const d = 2n * denominador
  const cociente = n / d
  // La división de BigInt corta hacia 0; con resto negativo, se baja uno para redondear hacia abajo.
  return n % d < 0n ? cociente - 1n : cociente
}

/**
 * Convierte el texto tecleado («6», «0,6», «12,345») en unidades base. Admite coma o punto decimal y como mucho
 * 6 decimales; sin signo; redondea al mh con las mitades hacia arriba. Error si el texto no es un número válido
 * o si el resultado no cabe exacto en un número de JavaScript: lanza Error('Cantidad no válida').
 */
export function aBase(cantidadTexto: string, moneda: Moneda, eq: Equivalencias): number {
  const partes = PATRON_CANTIDAD.exec(cantidadTexto.trim())
  if (partes === null) {
    throw new Error('Cantidad no válida')
  }
  const entera = partes[1]
  const decimales = partes[2] ?? ''
  if (entera.length + decimales.length === 0 || decimales.length > MAX_DECIMALES) {
    throw new Error('Cantidad no válida')
  }
  // «12,345» son 12345000 millonésimas; × valor de la moneda ÷ 1000000 = mh.
  const millonesimas = BigInt(entera + decimales.padEnd(MAX_DECIMALES, '0'))
  const base = dividirMitadArriba(millonesimas * BigInt(valorEnBase(moneda, eq)), 10n ** BigInt(MAX_DECIMALES))
  if (base > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Cantidad no válida')
  }
  return Number(base)
}

/** Importe con la base en mh y lo introducido, con la cantidad tal como se tecleó (sin espacios alrededor). */
export function importeDesde(cantidadTexto: string, moneda: Moneda, eq: Equivalencias): Importe {
  return {
    base: aBase(cantidadTexto, moneda, eq),
    introducido: { cantidad: cantidadTexto.trim(), moneda },
  }
}

/**
 * pct en tanto por ciento (10 = 10 %), con hasta 6 decimales; resultado redondeado al mh con las mitades hacia
 * arriba. (§7, impuestos de locales, intereses)
 */
export function porcentajeDe(base: number, pct: number): number {
  // pct en millonésimas de punto: 12,25 % → 12250000. base × millonésimas ÷ (100 × 1000000).
  const millonesimas = BigInt(Math.round(pct * 1000000))
  return Number(dividirMitadArriba(BigInt(base) * millonesimas, 100000000n))
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/dinero/importe.test.ts
```

Salida esperada (la hora y la duración varían; `it.each` cuenta como una prueba por cada texto rechazado):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  34 passed (34)
   Start at  12:27:16
   Duration  421ms (transform 58%, import 25%, tests 10%, worker 7%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con:

```text
 Test Files  3 passed (3)
      Tests  47 passed (47)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/dinero/importe.ts src/dominio/dinero/importe.test.ts
git commit -m "feat(dinero): convertir lo tecleado a hierro, redondear al mh y calcular porcentajes" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía; los avisos de CRLF son inofensivos, como en la tarea 2). `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/dinero/importe.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/dinero/importe.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 1309ca7] feat(dinero): convertir lo tecleado a hierro, redondear al mh y calcular porcentajes
 2 files changed, 233 insertions(+)
 create mode 100644 src/dominio/dinero/importe.test.ts
 create mode 100644 src/dominio/dinero/importe.ts
```

### Tarea 4: Formato de importes y números

Todo el dinero se ve en monedas de oro y con el formato de número español. Esta tarea convierte los enteros de hierro en el texto que se ve en pantalla, y da formato a lo que tecleó el jugador y a los números que no son dinero.

Reglas de la especificación que implementa:

- **Todo en oro (§3).** Bolsas, cajas, precios y movimientos se muestran en mo con los decimales necesarios y sin ceros finales: «46,518 mo», «0,6 mo». La conversión a mo es solo de presentación: nada se guarda en oro. `formatearOro` muestra los decimales que hacen falta para distinguir 1 mh: con las equivalencias por defecto, 5 (1 mh = 0,00001 mo). Si 1 mh no es un decimal exacto de 1 mo (con 1 mo = 120000 mh, 1 mh = 0,0000083… mo), usa los justos para que dos importes distintos no se vean iguales (6) y redondea el último.
- **Cifras prorrateadas (§3).** El equivalente al mes y el balance mensual se muestran con 1 decimal como mucho: Bree ingresa «+44 mo» al mes y su balance es «−11,5 mo» (§7).
- **Signo.** «+» solo cuando se pide (cambios y balances) y nunca en el cero. Un importe negativo lleva siempre «−», porque una acción manual puede dejar una caja en negativo (§3, «Saldo negativo»). Es el signo menos tipográfico (U+2212), no el guion. Lo que se redondea a 0 se ve «0 mo», sin signo.
- **Formato de número español** (convenciones del proyecto): punto de miles siempre desde 1.000 («1.240») y coma decimal. `formatearNumero` da ese formato a los números que no son dinero (recursos, consumos por habitante).
- **Sin coma flotante.** Dividir `base / 100000` en coma flotante estropea el último decimal de los importes grandes (6907618817547915 mh da 69076188175.47916 en vez de 69076188175.47915), y `toFixed` redondea mal las mitades escritas (`(1.005).toFixed(2)` da «1.00»). Por eso las tres funciones de cifras (`formatearOro`, `formatearOroProrrateado` y `formatearNumero`) comparten una función interna, `formatearFraccion`, que divide y redondea con `BigInt`; `formatearNumero` parte de la cifra que escribe JavaScript («1.005»), no del binario. `formatearIntroducido` no la usa: no redondea, solo agrupa los miles y cambia el separador decimal por la coma. En la presentación, la mitad se redondea sobre la cifra sin signo (1,15 → «1,2» y −1,15 → «−1,2»), para que un ingreso y un gasto del mismo tamaño se vean iguales.
- **Lo introducido (§3).** El libro enseña la cantidad como se tecleó, con su abreviatura: «6 mp». Se conservan sus decimales, también los ceros finales («0,50 mo»), con coma decimal, punto de miles y sin ceros a la izquierda.

**Archivos:**
- Crear: `src/dominio/dinero/formato.ts`
- Prueba: `src/dominio/dinero/formato.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/dinero/formato.test.ts` con este contenido:

```ts
import { describe, it, expect } from 'vitest'
import { formatearIntroducido, formatearNumero, formatearOro, formatearOroProrrateado } from './formato'
import { aBase } from './importe'
import { EQUIVALENCIAS_POR_DEFECTO, type Equivalencias } from './monedas'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** 1 mm = 50 mo y 1 mo = 12 mp: 1 mo vale 120000 mh y 1 mh es 1/120000 mo. */
const PERSONALIZADAS: Equivalencias = {
  mmEnMo: 50,
  moEnMp: 12,
  mpEnMb: 10,
  mbEnMc: 10,
  mcEnMe: 10,
  meEnMh: 10,
}

describe('formatearNumero', () => {
  it('separa los miles con punto siempre desde 1.000', () => {
    expect(formatearNumero(999, 0)).toBe('999')
    expect(formatearNumero(1000, 0)).toBe('1.000')
    expect(formatearNumero(1240, 0)).toBe('1.240')
    expect(formatearNumero(1234567.891, 2)).toBe('1.234.567,89')
  })

  it('usa coma decimal y quita los ceros finales', () => {
    expect(formatearNumero(3.72, 1)).toBe('3,7')
    expect(formatearNumero(2.5, 4)).toBe('2,5')
    expect(formatearNumero(2, 4)).toBe('2')
    expect(formatearNumero(9.99, 1)).toBe('10')
    expect(formatearNumero(41.333, 0)).toBe('41')
  })

  it('usa el signo menos tipográfico (U+2212)', () => {
    expect(formatearNumero(-3.72, 1)).toBe('−3,7')
    expect(formatearNumero(-3.72, 1).codePointAt(0)).toBe(0x2212)
    expect(formatearNumero(-1240, 0)).toBe('−1.240')
  })

  it('no pone signo a lo que se redondea a 0', () => {
    expect(formatearNumero(-0.04, 1)).toBe('0')
    expect(formatearNumero(-0, 1)).toBe('0')
    expect(formatearNumero(0.4, 0)).toBe('0')
  })

  it('redondea las mitades de la cifra escrita hacia arriba, sin errores de coma flotante', () => {
    expect((1.005).toFixed(2)).toBe('1.00')
    expect(formatearNumero(1.005, 2)).toBe('1,01')
    expect(formatearNumero(1.15, 1)).toBe('1,2')
    expect(formatearNumero(-1.15, 1)).toBe('−1,2')
  })

  it('escribe entero lo que JavaScript expresa con exponente', () => {
    expect(formatearNumero(0.0000005, 7)).toBe('0,0000005')
    expect(formatearNumero(1e21, 0)).toBe('1.000.000.000.000.000.000.000')
  })
})

describe('formatearOro', () => {
  it('muestra los importes del ejemplo en oro', () => {
    expect(formatearOro(4651800, EQ)).toBe('46,518 mo')
    expect(formatearOro(120000000, EQ)).toBe('1.200 mo')
    expect(formatearOro(1800000, EQ)).toBe('18 mo')
  })

  it('muestra 6 mp como 0,6 mo', () => {
    expect(formatearOro(aBase('6', 'mp', EQ), EQ)).toBe('0,6 mo')
  })

  it('muestra la bolsa inicial del ejemplo: 40,918 mo', () => {
    const bolsa = aBase('38', 'mo', EQ) + aBase('25', 'mp', EQ) + aBase('40', 'mb', EQ) + aBase('18', 'mc', EQ)
    expect(formatearOro(bolsa, EQ)).toBe('40,918 mo')
  })

  it('muestra todos los decimales hasta el mh', () => {
    expect(formatearOro(1, EQ)).toBe('0,00001 mo')
    expect(formatearOro(4651801, EQ)).toBe('46,51801 mo')
  })

  it('pone signo solo si se pide, y nunca al cero', () => {
    expect(formatearOro(-60000, EQ, { signo: true })).toBe('−0,6 mo')
    expect(formatearOro(1200000, EQ, { signo: true })).toBe('+12 mo')
    expect(formatearOro(0, EQ, { signo: true })).toBe('0 mo')
    expect(formatearOro(1200000, EQ)).toBe('12 mo')
  })

  it('muestra siempre el menos de un importe negativo', () => {
    expect(formatearOro(-60000, EQ)).toBe('−0,6 mo')
  })

  it('omite la unidad si se pide', () => {
    expect(formatearOro(4651800, EQ, { conUnidad: false })).toBe('46,518')
    expect(formatearOro(-60000, EQ, { signo: true, conUnidad: false })).toBe('−0,6')
  })

  it('es exacto con el mayor entero seguro', () => {
    expect(formatearOro(Number.MAX_SAFE_INTEGER, EQ)).toBe('90.071.992.547,40991 mo')
    expect(formatearOro(6907618817547915, EQ)).toBe('69.076.188.175,47915 mo')
  })

  it('con equivalencias en las que 1 mh no es un decimal exacto, usa los decimales que distinguen cada mh', () => {
    expect(formatearOro(60000, PERSONALIZADAS)).toBe('0,5 mo')
    expect(formatearOro(10000, PERSONALIZADAS)).toBe('0,083333 mo')
    expect(formatearOro(1, PERSONALIZADAS)).toBe('0,000008 mo')
    expect(formatearOro(2, PERSONALIZADAS)).toBe('0,000017 mo')
  })
})

describe('formatearOroProrrateado', () => {
  it('muestra las cifras prorrateadas de Bree con 1 decimal como mucho', () => {
    expect(formatearOroProrrateado(1285714, EQ, { signo: true })).toBe('+12,9 mo')
    expect(formatearOroProrrateado(1800000, EQ)).toBe('18 mo')
    expect(formatearOroProrrateado(3925714, EQ)).toBe('39,3 mo')
    expect(formatearOroProrrateado(4395714, EQ, { signo: true })).toBe('+44 mo')
    expect(formatearOroProrrateado(-1147143, EQ, { signo: true })).toBe('−11,5 mo')
  })

  it('redondea las mitades de la cifra hacia arriba, con el mismo tamaño en positivo y en negativo', () => {
    expect(formatearOroProrrateado(115000, EQ)).toBe('1,2 mo')
    expect(formatearOroProrrateado(-115000, EQ)).toBe('−1,2 mo')
  })

  it('no pone signo a lo que se redondea a 0', () => {
    expect(formatearOroProrrateado(4000, EQ, { signo: true })).toBe('0 mo')
    expect(formatearOroProrrateado(-4000, EQ, { signo: true })).toBe('0 mo')
    expect(formatearOroProrrateado(0, EQ, { signo: true })).toBe('0 mo')
  })
})

describe('formatearIntroducido', () => {
  it('muestra la cantidad tecleada y la abreviatura', () => {
    expect(formatearIntroducido({ cantidad: '6', moneda: 'mp' })).toBe('6 mp')
    expect(formatearIntroducido({ cantidad: '0,5', moneda: 'mo' })).toBe('0,5 mo')
    expect(formatearIntroducido({ cantidad: '12,345', moneda: 'mo' })).toBe('12,345 mo')
  })

  it('cambia el punto decimal por coma', () => {
    expect(formatearIntroducido({ cantidad: '0.5', moneda: 'mo' })).toBe('0,5 mo')
  })

  it('conserva los decimales tecleados, también los ceros finales', () => {
    expect(formatearIntroducido({ cantidad: '0,50', moneda: 'mo' })).toBe('0,50 mo')
  })

  it('separa los miles y quita los ceros de la izquierda y el separador sin decimales', () => {
    expect(formatearIntroducido({ cantidad: '1200', moneda: 'mp' })).toBe('1.200 mp')
    expect(formatearIntroducido({ cantidad: '007', moneda: 'mb' })).toBe('7 mb')
    expect(formatearIntroducido({ cantidad: ',5', moneda: 'mo' })).toBe('0,5 mo')
    expect(formatearIntroducido({ cantidad: '6,', moneda: 'mp' })).toBe('6 mp')
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/dinero/formato.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./formato`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/dinero/formato.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/dinero/formato.test.ts [ src/dominio/dinero/formato.test.ts ]
Error: Cannot find module './formato' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/dinero/formato.test.ts
 ❯ src/dominio/dinero/formato.test.ts:2:1
      1| import { describe, it, expect } from 'vitest'
      2| import { formatearIntroducido, formatearNumero, formatearOro, formatea…
       | ^
      3| import { aBase } from './importe'
      4| import { EQUIVALENCIAS_POR_DEFECTO, type Equivalencias } from './moned…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  12:27:25
   Duration  425ms (worker 96%, environment 4%)
```

- [ ] **Paso 3: Implementar `formato.ts`**

Crea `src/dominio/dinero/formato.ts` con este contenido:

```ts
import { valorEnBase, type Equivalencias, type Moneda } from './monedas'

/** Signo menos de presentación (U+2212), no el guion. */
const SIGNO_MENOS = '−'

/** «1240» → «1.240»: separa los miles de una cadena de dígitos con punto, siempre desde 1.000. */
function agruparMiles(digitos: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Presenta numerador ÷ denominador (denominador > 0) con miles, coma decimal, hasta maxDecimales sin ceros finales
 * y «−» si es negativo. Todo en BigInt, sin coma flotante. Redondea la cifra sin signo con las mitades hacia arriba,
 * así +1,15 y −1,15 se ven igual de grandes («1,2» y «−1,2»). Lo que se redondea a 0 no lleva signo.
 */
function formatearFraccion(numerador: bigint, denominador: bigint, maxDecimales: number): string {
  const negativo = numerador < 0n
  const magnitud = negativo ? -numerador : numerador
  const escala = 10n ** BigInt(maxDecimales)
  const escalado = (2n * magnitud * escala + denominador) / (2n * denominador)
  const entera = agruparMiles((escalado / escala).toString())
  const decimales = (escalado % escala).toString().padStart(maxDecimales, '0').replace(/0+$/, '')
  const cifra = decimales === '' ? entera : `${entera},${decimales}`
  return negativo && escalado !== 0n ? `${SIGNO_MENOS}${cifra}` : cifra
}

/** Añade «+» a una cifra positiva; el cero y las negativas se quedan igual. */
function ponerMas(cifra: string, signo: boolean | undefined): string {
  return signo === true && cifra !== '0' && !cifra.startsWith(SIGNO_MENOS) ? `+${cifra}` : cifra
}

/** «46,518 mo», «0,6 mo», «1.200 mo». Todos los decimales necesarios, hasta la precisión del mh, sin ceros finales. Con signo: «+12 mo», «−0,6 mo»; el cero no lleva signo. */
export function formatearOro(
  base: number,
  eq: Equivalencias,
  opciones: { signo?: boolean; conUnidad?: boolean } = {},
): string {
  const valorOro = BigInt(valorEnBase('mo', eq))
  // Decimales para distinguir 1 mh: 100000 mh por mo → 5; 120000 → 6.
  const decimales = (valorOro - 1n).toString().length
  const cifra = ponerMas(formatearFraccion(BigInt(base), valorOro, decimales), opciones.signo)
  return opciones.conUnidad === false ? cifra : `${cifra} mo`
}

/** Cifras prorrateadas (al mes, balance): 1 decimal como mucho y sin ceros finales: «+12,9 mo», «−11,5 mo», «+44 mo». (§3) */
export function formatearOroProrrateado(base: number, eq: Equivalencias, opciones: { signo?: boolean } = {}): string {
  const valorOro = BigInt(valorEnBase('mo', eq))
  return `${ponerMas(formatearFraccion(BigInt(base), valorOro, 1), opciones.signo)} mo`
}

/** «6 mp», «0,5 mo»: la cantidad tal como se tecleó (con coma) y la abreviatura. */
export function formatearIntroducido(introducido: { cantidad: string; moneda: Moneda }): string {
  const [entera, decimales = ''] = introducido.cantidad.trim().split(/[.,]/)
  const enteraSinCeros = entera.replace(/^0+/, '') || '0'
  const cifra = agruparMiles(enteraSinCeros) + (decimales === '' ? '' : `,${decimales}`)
  return `${cifra} ${introducido.moneda}`
}

/**
 * Formato de número español: miles con «.» siempre desde 1.000, decimales con «,», «−» como signo; hasta maxDecimales,
 * sin ceros finales. Es la misma presentación que la de los importes (formatearFraccion), para números que no son dinero.
 */
export function formatearNumero(valor: number, maxDecimales: number): string {
  // Se parte de la cifra que escribe JavaScript («1.005», «5e-7»), no del binario de la coma flotante.
  const [mantisa, exponente = '0'] = Math.abs(valor).toString().split('e')
  const [entera, fraccion = ''] = mantisa.split('.')
  const digitos = BigInt(entera + fraccion) * (valor < 0 ? -1n : 1n)
  const decimalesEscritos = fraccion.length - Number(exponente)
  return decimalesEscritos >= 0
    ? formatearFraccion(digitos, 10n ** BigInt(decimalesEscritos), maxDecimales)
    : formatearFraccion(digitos * 10n ** BigInt(-decimalesEscritos), 1n, maxDecimales)
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/dinero/formato.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  22 passed (22)
   Start at  12:27:28
   Duration  514ms (transform 63%, import 23%, worker 7%, tests 7%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y la compilación**

Con el módulo de dinero completo, se comprueba también que la app sigue compilando.

```bash
npx tsc -b
npm test
npm run build
```

Salida esperada: `npx tsc -b` no escribe nada, `npm test` termina con

```text
 Test Files  4 passed (4)
      Tests  69 passed (69)
```

y `npm run build` termina con `✓ built in …`, como en la tarea 1.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/dinero/formato.ts src/dominio/dinero/formato.test.ts
git commit -m "feat(dinero): formato de importes en oro, de lo introducido y de números" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía; los avisos de CRLF son inofensivos, como en la tarea 2). `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/dinero/formato.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/dinero/formato.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas a66ad72] feat(dinero): formato de importes en oro, de lo introducido y de números
 2 files changed, 223 insertions(+)
 create mode 100644 src/dominio/dinero/formato.test.ts
 create mode 100644 src/dominio/dinero/formato.ts
```

---

### Tarea 5: Fechas del calendario (`fecha.ts`)

Crea el tipo `Fecha` y las operaciones básicas del calendario: bisiestos, días de cada mes, validación, conversión a un número de día, suma de días y de meses, comparación y día de la semana. Las usarán el formato de fechas (tarea 6), las recurrencias (tarea 7) y, más adelante, el motor de «Avanzar días». Depende solo de la tarea 1.

**Reglas de la especificación que implementa (§4):**

- **Calendario gregoriano actual, también hacia atrás.** La partida transcurre en un año de la Tierra Media, pero la especificación decide que ese año se comporta como el año real con el mismo número, calculado con el calendario de hoy y no con el juliano que regía entonces. Por eso el año 1640 tiene los bisiestos y los días de la semana del calendario gregoriano extendido hacia atrás («proléptico»): es bisiesto el año múltiplo de 4, salvo los múltiplos de 100 que no lo son de 400 (1640, 1600 y 2000 sí; 1700 no). Las vistas del ejemplo «La Sombra del Este» dependen de esto: el 1 de enero y el 1 de abril de 1640 son domingo, y el 12 de abril, jueves (§6.1, P1, y §12).
- **Semana de lunes a domingo.** `diaDeLaSemana` devuelve 0 para el lunes y 6 para el domingo, que es el orden en que la app dibuja las semanas.
- **Validación de fechas.** El año es 1 o mayor, y el día se valida según el mes y el bisiesto del año elegido: no existe el 31 de abril ni el 29 de febrero de un año no bisiesto. El error sale bajo el campo del formulario, así que `validarFecha` devuelve una frase corta lista para mostrar («Febrero de 1641 tiene 28 días»). Comprueba primero el año, después el mes y al final el día, porque cuántos días tiene el mes depende del año y del mes.
- **Último día del mes cuando el día elegido no existe.** Un pago «mensual, el día 31» cae el 30 en abril y el 28 o el 29 en febrero. Esto lo resuelven `diaEnMes` y `sumarMeses`. También vale para el día de cobro de los locales (§6.4) y para la producción (§7).
- **La fecha se guarda como año, mes y día** (§4 y §8). Por eso `Fecha` es un objeto `{ anio, mes, dia }` y no un `Date` de JavaScript. `Date` no sirve para el dominio: `new Date(anio, mes, dia)` lee los años 0 a 99 como 1900 a 1999 y depende de la zona horaria de la tablet. El dominio usa aritmética entera propia y la prueba día a día.

**Archivos:**
- Crear: `src/dominio/calendario/fecha.ts`
- Prueba: `src/dominio/calendario/fecha.test.ts`

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

- [ ] **Paso 1: Escribir la prueba que falla**

Qué comprueba cada bloque:
- `esBisiesto`, `diasDelMes` y `validarFecha`: las reglas de los bisiestos con 1640, 1641, 1600, 1700, 1800, 1900 y 2000, y los tres mensajes de error con sus casos límite (día 0, mes 13, año 0, números con decimales).
- `aNumeroDeDia` y `desdeNumeroDeDia`:
  - números de día conocidos, calculados aparte;
  - ida y vuelta en 14 fechas, desde el 1 de enero del año 1 hasta el 31 de diciembre de 9999, con fechas anteriores y posteriores a 1970;
  - un recorrido de todos los días entre el año 1 y el 2401 (876.582 días, unos 70 ms), que compara cada número con la fecha siguiente calculada a mano.
- `diaDeLaSemana`: las fechas del ejemplo y un recorrido de todos los días del año 1 al 2400. `Object.is` detecta un `−0`, que `toBe(0)` y `toEqual` no aceptan como `0`.
- `sumarDias`, `diasEntre`, `compararFechas`, `diaEnMes` y `sumarMeses`: las cifras del ejemplo y los días que no existen en el mes de destino. La última prueba de `sumarMeses` muestra por qué las recurrencias por meses (tarea 7) se calculan siempre desde la primera fecha: si se encadenan los meses acortados, el día elegido se pierde.

Crea `src/dominio/calendario/fecha.test.ts` con este contenido:

```ts
import { describe, it, expect } from 'vitest'
import {
  aNumeroDeDia,
  compararFechas,
  desdeNumeroDeDia,
  diaDeLaSemana,
  diaEnMes,
  diasDelMes,
  diasEntre,
  esBisiesto,
  sumarDias,
  sumarMeses,
  validarFecha,
  type Fecha,
} from './fecha'

/** Atajo para escribir fechas en las pruebas: f(1640, 4, 12) es el 12 de abril de 1640. */
function f(anio: number, mes: number, dia: number): Fecha {
  return { anio, mes, dia }
}

describe('esBisiesto', () => {
  it('1640 es bisiesto y 1641 no (múltiplo de 4 y no de 100)', () => {
    expect(esBisiesto(1640)).toBe(true)
    expect(esBisiesto(1641)).toBe(false)
  })

  it('1700, 1800 y 1900 no son bisiestos (múltiplos de 100 y no de 400)', () => {
    expect(esBisiesto(1700)).toBe(false)
    expect(esBisiesto(1800)).toBe(false)
    expect(esBisiesto(1900)).toBe(false)
  })

  it('1600 y 2000 son bisiestos (múltiplos de 400)', () => {
    expect(esBisiesto(1600)).toBe(true)
    expect(esBisiesto(2000)).toBe(true)
  })

  it('el año 4 es bisiesto y el año 1 no', () => {
    expect(esBisiesto(4)).toBe(true)
    expect(esBisiesto(1)).toBe(false)
  })
})

describe('diasDelMes', () => {
  it('da la duración de los doce meses de 1641, año no bisiesto', () => {
    const duraciones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => diasDelMes(1641, mes))
    expect(duraciones).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])
  })

  it('febrero tiene 29 días en 1640, 1600 y 2000, y 28 en 1700', () => {
    expect(diasDelMes(1640, 2)).toBe(29)
    expect(diasDelMes(1600, 2)).toBe(29)
    expect(diasDelMes(2000, 2)).toBe(29)
    expect(diasDelMes(1700, 2)).toBe(28)
  })
})

describe('validarFecha', () => {
  it('acepta fechas que existen', () => {
    expect(validarFecha(f(1640, 4, 12))).toBeNull()
    expect(validarFecha(f(1640, 4, 30))).toBeNull()
    expect(validarFecha(f(1640, 12, 31))).toBeNull()
    expect(validarFecha(f(1, 1, 1))).toBeNull()
  })

  it('acepta el 29 de febrero de los años bisiestos 1640, 1600 y 2000', () => {
    expect(validarFecha(f(1640, 2, 29))).toBeNull()
    expect(validarFecha(f(1600, 2, 29))).toBeNull()
    expect(validarFecha(f(2000, 2, 29))).toBeNull()
  })

  it('rechaza el 29 de febrero de un año no bisiesto', () => {
    expect(validarFecha(f(1641, 2, 29))).toBe('Febrero de 1641 tiene 28 días')
    expect(validarFecha(f(1700, 2, 29))).toBe('Febrero de 1700 tiene 28 días')
  })

  it('rechaza el 31 de abril y el 30 de febrero', () => {
    expect(validarFecha(f(1640, 4, 31))).toBe('Abril de 1640 tiene 30 días')
    expect(validarFecha(f(1640, 2, 30))).toBe('Febrero de 1640 tiene 29 días')
  })

  it('rechaza el día 0, el 32 y los días con decimales', () => {
    expect(validarFecha(f(1640, 4, 0))).toBe('Abril de 1640 tiene 30 días')
    expect(validarFecha(f(1640, 1, 32))).toBe('Enero de 1640 tiene 31 días')
    expect(validarFecha(f(1640, 4, 12.5))).toBe('Abril de 1640 tiene 30 días')
  })

  it('rechaza el año 0, los años negativos y los años con decimales', () => {
    expect(validarFecha(f(0, 1, 1))).toBe('El año debe ser 1 o más')
    expect(validarFecha(f(-5, 1, 1))).toBe('El año debe ser 1 o más')
    expect(validarFecha(f(1640.5, 1, 1))).toBe('El año debe ser 1 o más')
  })

  it('rechaza el mes 0, el 13 y los meses con decimales', () => {
    expect(validarFecha(f(1640, 0, 1))).toBe('El mes debe estar entre 1 y 12')
    expect(validarFecha(f(1640, 13, 1))).toBe('El mes debe estar entre 1 y 12')
    expect(validarFecha(f(1640, 2.5, 1))).toBe('El mes debe estar entre 1 y 12')
  })

  it('con varios errores, da primero el del año y después el del mes', () => {
    expect(validarFecha(f(0, 13, 40))).toBe('El año debe ser 1 o más')
    expect(validarFecha(f(1640, 13, 40))).toBe('El mes debe estar entre 1 y 12')
  })
})

describe('aNumeroDeDia y desdeNumeroDeDia', () => {
  it('el 1 de enero de 1970 es el día 0 y la víspera, el día −1', () => {
    expect(aNumeroDeDia(f(1970, 1, 1))).toBe(0)
    expect(aNumeroDeDia(f(1969, 12, 31))).toBe(-1)
    expect(desdeNumeroDeDia(0)).toEqual(f(1970, 1, 1))
    expect(desdeNumeroDeDia(-1)).toEqual(f(1969, 12, 31))
  })

  it('da los números de día de fechas conocidas', () => {
    expect(aNumeroDeDia(f(1, 1, 1))).toBe(-719162)
    expect(aNumeroDeDia(f(1600, 2, 29))).toBe(-135081)
    expect(aNumeroDeDia(f(1640, 1, 1))).toBe(-120530)
    expect(aNumeroDeDia(f(1640, 4, 12))).toBe(-120428)
    expect(aNumeroDeDia(f(2000, 3, 1))).toBe(11017)
    expect(aNumeroDeDia(f(9999, 12, 31))).toBe(2932896)
  })

  it.each([
    f(1, 1, 1),
    f(1, 12, 31),
    f(4, 2, 29),
    f(100, 3, 1),
    f(400, 2, 29),
    f(1600, 2, 29),
    f(1640, 1, 1),
    f(1640, 4, 12),
    f(1700, 2, 28),
    f(1700, 3, 1),
    f(1969, 12, 31),
    f(1970, 1, 1),
    f(2000, 2, 29),
    f(9999, 12, 31),
  ])('ida y vuelta: $dia/$mes/$anio', (fecha) => {
    expect(desdeNumeroDeDia(aNumeroDeDia(fecha))).toEqual(fecha)
  })

  it('el día anterior al 1 de enero del año 1 es el 31 de diciembre del año 0, sin romper el cálculo', () => {
    expect(desdeNumeroDeDia(-719163)).toEqual(f(0, 12, 31))
    expect(aNumeroDeDia(f(0, 12, 31))).toBe(-719163)
  })

  it('recorre día a día del 1 de enero del año 1 al 1 de enero de 2401 sin saltos ni repeticiones', () => {
    const inicio = aNumeroDeDia(f(1, 1, 1))
    const fin = aNumeroDeDia(f(2401, 1, 1))
    expect(fin - inicio).toBe(876582) // 6 ciclos de 400 años × 146.097 días

    let esperada = f(1, 1, 1)
    let primerError: string | null = null
    for (let n = inicio; n <= fin; n++) {
      const obtenida = desdeNumeroDeDia(n)
      // Object.is distingue 0 de −0, igual que toEqual.
      const coincide =
        Object.is(obtenida.anio, esperada.anio) &&
        Object.is(obtenida.mes, esperada.mes) &&
        Object.is(obtenida.dia, esperada.dia)
      if (primerError === null && (!coincide || aNumeroDeDia(esperada) !== n)) {
        primerError = `día ${n}: ${JSON.stringify(obtenida)}, se esperaba ${JSON.stringify(esperada)}`
      }
      // Fecha siguiente calculada a mano: día + 1, o primero del mes siguiente, o 1 de enero.
      if (esperada.dia < diasDelMes(esperada.anio, esperada.mes)) {
        esperada = f(esperada.anio, esperada.mes, esperada.dia + 1)
      } else if (esperada.mes < 12) {
        esperada = f(esperada.anio, esperada.mes + 1, 1)
      } else {
        esperada = f(esperada.anio + 1, 1, 1)
      }
    }
    expect(primerError).toBeNull()
  })
})

describe('sumarDias', () => {
  it('12 de abril de 1640 + 7 días = 19 de abril de 1640', () => {
    expect(sumarDias(f(1640, 4, 12), 7)).toEqual(f(1640, 4, 19))
  })

  it('sumar 0 días da la misma fecha', () => {
    expect(sumarDias(f(1640, 4, 12), 0)).toEqual(f(1640, 4, 12))
  })

  it('cruza meses y años, con el 29 de febrero de los bisiestos', () => {
    expect(sumarDias(f(1640, 1, 1), 102)).toEqual(f(1640, 4, 12))
    expect(sumarDias(f(1640, 2, 28), 1)).toEqual(f(1640, 2, 29))
    expect(sumarDias(f(1641, 2, 28), 1)).toEqual(f(1641, 3, 1))
    expect(sumarDias(f(1640, 12, 31), 1)).toEqual(f(1641, 1, 1))
    expect(sumarDias(f(1700, 2, 28), 1)).toEqual(f(1700, 3, 1))
  })

  it('resta días con un número negativo', () => {
    expect(sumarDias(f(1640, 3, 1), -1)).toEqual(f(1640, 2, 29))
    expect(sumarDias(f(1640, 4, 19), -7)).toEqual(f(1640, 4, 12))
  })
})

describe('diasEntre', () => {
  it('del 1 de enero al 12 de abril de 1640 hay 102 días, y al revés −102', () => {
    expect(diasEntre(f(1640, 1, 1), f(1640, 4, 12))).toBe(102)
    expect(diasEntre(f(1640, 4, 12), f(1640, 1, 1))).toBe(-102)
  })

  it('del 1 de abril al 1 de mayo de 1640 hay 30 días', () => {
    expect(diasEntre(f(1640, 4, 1), f(1640, 5, 1))).toBe(30)
  })

  it('1640 tiene 366 días y 1641 tiene 365', () => {
    expect(diasEntre(f(1640, 1, 1), f(1641, 1, 1))).toBe(366)
    expect(diasEntre(f(1641, 1, 1), f(1642, 1, 1))).toBe(365)
  })

  it('entre una fecha y ella misma hay 0 días', () => {
    expect(diasEntre(f(1640, 4, 12), f(1640, 4, 12))).toBe(0)
  })
})

describe('compararFechas', () => {
  it('es negativo si a es anterior, 0 si son iguales y positivo si a es posterior', () => {
    expect(compararFechas(f(1640, 4, 12), f(1640, 4, 19))).toBeLessThan(0)
    expect(compararFechas(f(1640, 4, 12), f(1640, 4, 12))).toBe(0)
    expect(compararFechas(f(1640, 4, 19), f(1640, 4, 12))).toBeGreaterThan(0)
  })

  it('el año pesa más que el mes y el mes más que el día', () => {
    expect(compararFechas(f(1639, 12, 31), f(1640, 1, 1))).toBeLessThan(0)
    expect(compararFechas(f(1640, 3, 31), f(1640, 4, 1))).toBeLessThan(0)
  })

  it('sirve para ordenar fechas con sort', () => {
    const fechas = [f(1640, 4, 19), f(1639, 12, 31), f(1640, 4, 12), f(1640, 1, 1)]
    expect([...fechas].sort(compararFechas)).toEqual([
      f(1639, 12, 31),
      f(1640, 1, 1),
      f(1640, 4, 12),
      f(1640, 4, 19),
    ])
  })
})

describe('diaDeLaSemana (0 = lunes … 6 = domingo)', () => {
  it('el 1 de enero y el 1 de abril de 1640 son domingo', () => {
    expect(diaDeLaSemana(f(1640, 1, 1))).toBe(6)
    expect(diaDeLaSemana(f(1640, 4, 1))).toBe(6)
  })

  it('el 12 y el 19 de abril de 1640 son jueves', () => {
    expect(diaDeLaSemana(f(1640, 4, 12))).toBe(3)
    expect(diaDeLaSemana(f(1640, 4, 19))).toBe(3)
  })

  it('el 2 de abril de 1640 es lunes', () => {
    expect(diaDeLaSemana(f(1640, 4, 2))).toBe(0)
  })

  it('el 1 de enero de 1970 es jueves, el 31 de diciembre de 1969 miércoles y el 1 de enero del año 1 lunes', () => {
    expect(diaDeLaSemana(f(1970, 1, 1))).toBe(3)
    expect(diaDeLaSemana(f(1969, 12, 31))).toBe(2)
    expect(diaDeLaSemana(f(1, 1, 1))).toBe(0)
  })

  it('del año 1 al 2400 avanza de uno en uno y vuelve a 0 tras el domingo, sin salir de 0 a 6', () => {
    const inicio = aNumeroDeDia(f(1, 1, 1))
    const fin = aNumeroDeDia(f(2401, 1, 1))
    let esperado = 0 // el 1 de enero del año 1 fue lunes
    let primerError: string | null = null
    for (let n = inicio; n <= fin; n++) {
      const obtenido = diaDeLaSemana(desdeNumeroDeDia(n))
      // Object.is distingue 0 de −0: un −0 fallaría en las comparaciones de las pruebas.
      if (primerError === null && !Object.is(obtenido, esperado)) {
        primerError = `día ${n}: ${Object.is(obtenido, -0) ? '−0' : obtenido}, se esperaba ${esperado}`
      }
      esperado = (esperado + 1) % 7
    }
    expect(primerError).toBeNull()
  })
})

describe('diaEnMes', () => {
  it('el 31 de abril de 1640 no existe: da el 30', () => {
    expect(diaEnMes(1640, 4, 31)).toEqual(f(1640, 4, 30))
  })

  it('si el día existe, lo deja igual', () => {
    expect(diaEnMes(1640, 4, 12)).toEqual(f(1640, 4, 12))
    expect(diaEnMes(1640, 1, 31)).toEqual(f(1640, 1, 31))
  })

  it('en febrero da el 29 en año bisiesto y el 28 si no lo es', () => {
    expect(diaEnMes(1640, 2, 31)).toEqual(f(1640, 2, 29))
    expect(diaEnMes(1641, 2, 30)).toEqual(f(1641, 2, 28))
    expect(diaEnMes(1641, 2, 29)).toEqual(f(1641, 2, 28))
  })
})

describe('sumarMeses', () => {
  it('31 de enero de 1641 + 1 mes = 28 de febrero de 1641', () => {
    expect(sumarMeses(f(1641, 1, 31), 1)).toEqual(f(1641, 2, 28))
  })

  it('en años bisiestos da el 29 de febrero: 1640, 1600 y 2000, pero no 1700', () => {
    expect(sumarMeses(f(1640, 1, 31), 1)).toEqual(f(1640, 2, 29))
    expect(sumarMeses(f(1600, 1, 31), 1)).toEqual(f(1600, 2, 29))
    expect(sumarMeses(f(2000, 1, 31), 1)).toEqual(f(2000, 2, 29))
    expect(sumarMeses(f(1700, 1, 31), 1)).toEqual(f(1700, 2, 28))
  })

  it('31 de marzo de 1640 + 1 mes = 30 de abril', () => {
    expect(sumarMeses(f(1640, 3, 31), 1)).toEqual(f(1640, 4, 30))
  })

  it('si el día existe, lo conserva, también al cambiar de año', () => {
    expect(sumarMeses(f(1640, 4, 12), 1)).toEqual(f(1640, 5, 12))
    expect(sumarMeses(f(1640, 11, 15), 3)).toEqual(f(1641, 2, 15))
    expect(sumarMeses(f(1640, 12, 31), 2)).toEqual(f(1641, 2, 28))
    expect(sumarMeses(f(1640, 4, 12), 0)).toEqual(f(1640, 4, 12))
  })

  it('29 de febrero de 1640 + 12 meses = 28 de febrero de 1641; + 48 meses = 29 de febrero de 1644', () => {
    expect(sumarMeses(f(1640, 2, 29), 12)).toEqual(f(1641, 2, 28))
    expect(sumarMeses(f(1640, 2, 29), 48)).toEqual(f(1644, 2, 29))
  })

  it('resta meses con un número negativo', () => {
    expect(sumarMeses(f(1641, 3, 31), -1)).toEqual(f(1641, 2, 28))
    expect(sumarMeses(f(1640, 1, 15), -1)).toEqual(f(1639, 12, 15))
    expect(sumarMeses(f(1640, 4, 12), -28)).toEqual(f(1637, 12, 12))
  })

  it('encadenar meses acortados pierde el día elegido; sumar desde la fecha original, no', () => {
    const febrero = sumarMeses(f(1641, 1, 31), 1)
    expect(sumarMeses(febrero, 1)).toEqual(f(1641, 3, 28))
    expect(sumarMeses(f(1641, 1, 31), 2)).toEqual(f(1641, 3, 31))
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/calendario/fecha.test.ts
```

Fallo esperado (todavía no existe `fecha.ts`; la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/calendario/fecha.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/calendario/fecha.test.ts [ src/dominio/calendario/fecha.test.ts ]
Error: Cannot find module './fecha' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/calendario/fecha.test.ts
 ❯ src/dominio/calendario/fecha.test.ts:2:1
      1| import { describe, it, expect } from 'vitest'
      2| import {
       | ^
      3|   aNumeroDeDia,
      4|   compararFechas,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Implementar `fecha.ts`**

Cómo funciona:
- **Número de día.** Cada fecha se convierte en un número entero de días, y así sumar días, restar fechas, compararlas y sacar el día de la semana son simples sumas y restas. El día 0 es el 1 de enero de 1970, como en la hora Unix. Las fechas anteriores dan números negativos (el 12 de abril de 1640 es el −120.428). El número no se guarda ni se muestra: solo sirve para calcular.
- **Algoritmo de Howard Hinnant** (`days_from_civil` y `civil_from_days`, de dominio público). Cuenta el año desde el 1 de marzo, de modo que el 29 de febrero, si existe, es el último día del año y no descoloca los meses siguientes. Trabaja en ciclos de 400 años, que siempre tienen 146.097 días. Algunas constantes:
  - 719.468 son los días del 1 de marzo del año 0 al 1 de enero de 1970;
  - `(153 × mes + 2) / 5` da los días acumulados desde marzo, porque de marzo a enero los meses siguen el patrón 31, 30, 31, 30, 31;
  - 1.460 (días de 4 años menos uno), 36.524 (días de 100 años) y 146.096 (días de 400 años menos uno) corrigen los días bisiestos dentro del ciclo.

  Todas las divisiones usan `Math.floor`, que redondea hacia abajo también con números negativos.
- **Nombres de los meses en el mensaje.** `validarFecha` lleva sus propios nombres con mayúscula inicial, porque el mensaje empieza por el mes. No usa `NOMBRES_MES` de la tarea 6: `formatoFecha.ts` importa de `fecha.ts`, y la importación contraria sería circular.
- **`sumarMeses`.** Cuenta los meses desde el año 0 y luego acota el día con `diaEnMes`.
- **`diaDeLaSemana`.** Suma 3 porque el día 0 fue jueves, y usa `((x % 7) + 7) % 7`: en JavaScript, `%` da restos negativos, y hasta `−0`, con las fechas anteriores a 1970.

Crea `src/dominio/calendario/fecha.ts` con este contenido:

```ts
/** Fecha del calendario gregoriano proléptico (el actual, extendido hacia atrás). mes y dia empiezan en 1. (§4) */
export interface Fecha {
  anio: number
  mes: number
  dia: number
}

/** Nombres de los meses con mayúscula inicial, para empezar el mensaje de error de validarFecha. */
const MESES_EN_MENSAJE = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

/** Días de cada mes en un año no bisiesto; febrero se corrige en diasDelMes. */
const DIAS_POR_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Bisiesto gregoriano: múltiplo de 4, salvo los múltiplos de 100 que no lo son de 400. */
export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
}

export function diasDelMes(anio: number, mes: number): number {
  if (mes === 2 && esBisiesto(anio)) {
    return 29
  }
  return DIAS_POR_MES[mes - 1]
}

/** null si es válida; si no, el mensaje: «El año debe ser 1 o más», «El mes debe estar entre 1 y 12», «Abril de 1640 tiene 30 días». */
export function validarFecha(f: Fecha): string | null {
  if (!Number.isInteger(f.anio) || f.anio < 1) {
    return 'El año debe ser 1 o más'
  }
  if (!Number.isInteger(f.mes) || f.mes < 1 || f.mes > 12) {
    return 'El mes debe estar entre 1 y 12'
  }
  const dias = diasDelMes(f.anio, f.mes)
  if (!Number.isInteger(f.dia) || f.dia < 1 || f.dia > dias) {
    return `${MESES_EN_MENSAJE[f.mes - 1]} de ${f.anio} tiene ${dias} días`
  }
  return null
}

/** Días entre el 1 de marzo del año 0 y el 1 de enero de 1970. */
const DIAS_DESDE_1_MARZO_ANIO_0_A_1970 = 719468
/** Días de un ciclo gregoriano completo de 400 años. */
const DIAS_POR_CICLO_400 = 146097

/** Número de día absoluto (algoritmo days_from_civil de Howard Hinnant); 1 de enero de 1970 = 0. */
export function aNumeroDeDia(f: Fecha): number {
  // El año empieza el 1 de marzo: así el 29 de febrero, si existe, es el último día del año.
  const anio = f.mes <= 2 ? f.anio - 1 : f.anio
  const ciclo = Math.floor(anio / 400)
  const anioDelCiclo = anio - ciclo * 400 // 0 a 399
  const mesDesdeMarzo = f.mes > 2 ? f.mes - 3 : f.mes + 9 // marzo = 0 … febrero = 11
  const diaDelAnio = Math.floor((153 * mesDesdeMarzo + 2) / 5) + f.dia - 1 // 0 a 365
  const diaDelCiclo =
    anioDelCiclo * 365 +
    Math.floor(anioDelCiclo / 4) -
    Math.floor(anioDelCiclo / 100) +
    diaDelAnio // 0 a 146096
  return ciclo * DIAS_POR_CICLO_400 + diaDelCiclo - DIAS_DESDE_1_MARZO_ANIO_0_A_1970
}

/** Inversa de aNumeroDeDia (algoritmo civil_from_days de Howard Hinnant). */
export function desdeNumeroDeDia(n: number): Fecha {
  const z = n + DIAS_DESDE_1_MARZO_ANIO_0_A_1970
  const ciclo = Math.floor(z / DIAS_POR_CICLO_400)
  const diaDelCiclo = z - ciclo * DIAS_POR_CICLO_400 // 0 a 146096
  const anioDelCiclo = Math.floor(
    (diaDelCiclo -
      Math.floor(diaDelCiclo / 1460) +
      Math.floor(diaDelCiclo / 36524) -
      Math.floor(diaDelCiclo / 146096)) /
      365,
  ) // 0 a 399
  const diaDelAnio =
    diaDelCiclo -
    (365 * anioDelCiclo + Math.floor(anioDelCiclo / 4) - Math.floor(anioDelCiclo / 100)) // 0 a 365
  const mesDesdeMarzo = Math.floor((5 * diaDelAnio + 2) / 153) // marzo = 0 … febrero = 11
  const dia = diaDelAnio - Math.floor((153 * mesDesdeMarzo + 2) / 5) + 1
  const mes = mesDesdeMarzo < 10 ? mesDesdeMarzo + 3 : mesDesdeMarzo - 9
  const anio = anioDelCiclo + ciclo * 400 + (mes <= 2 ? 1 : 0)
  return { anio, mes, dia }
}

export function sumarDias(f: Fecha, dias: number): Fecha {
  return desdeNumeroDeDia(aNumeroDeDia(f) + dias)
}

/** hasta − desde, en días. */
export function diasEntre(desde: Fecha, hasta: Fecha): number {
  return aNumeroDeDia(hasta) - aNumeroDeDia(desde)
}

/** Negativo si a es anterior a b, 0 si son la misma fecha y positivo si a es posterior. */
export function compararFechas(a: Fecha, b: Fecha): number {
  return aNumeroDeDia(a) - aNumeroDeDia(b)
}

/** 0 = lunes … 6 = domingo (semana de lunes a domingo, §4). */
export function diaDeLaSemana(f: Fecha): number {
  // El día 0 (1 de enero de 1970) fue jueves, que es el 3. En JavaScript, % da restos negativos
  // (y −0) antes de 1970: sumar 7 y volver a hacer % 7 deja siempre un número de 0 a 6.
  return (((aNumeroDeDia(f) + 3) % 7) + 7) % 7
}

/** El día pedido, o el último del mes si no existe: diaEnMes(1640, 4, 31) → { 1640, 4, 30 }. */
export function diaEnMes(anio: number, mes: number, dia: number): Fecha {
  return { anio, mes, dia: Math.min(dia, diasDelMes(anio, mes)) }
}

/** Suma meses; si el día no existe en el mes destino, usa el último día (§4). */
export function sumarMeses(f: Fecha, meses: number): Fecha {
  const mesesDesdeElAnio0 = f.anio * 12 + (f.mes - 1) + meses
  const anio = Math.floor(mesesDesdeElAnio0 / 12)
  const mes = mesesDesdeElAnio0 - anio * 12 + 1
  return diaEnMes(anio, mes, f.dia)
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/calendario/fecha.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 Test Files  1 passed (1)
      Tests  58 passed (58)
```

Para ver cada prueba por su nombre, añade `--reporter=verbose` al comando. Salen 58 líneas `✓ src/dominio/calendario/fecha.test.ts > …`; las de ida y vuelta se llaman `ida y vuelta: 12/4/1640` y parecidas.

- [ ] **Paso 5: Comprobar los tipos**

Vitest quita los tipos sin comprobarlos. `tsc -b` es la comprobación que hace `npm run build` antes de empaquetar. Revisa en modo estricto la prueba y el código nuevos, y también los archivos de las tareas anteriores.

```bash
npx tsc -b
```

Salida esperada: ninguna línea, y el comando termina sin error.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/calendario/fecha.ts src/dominio/calendario/fecha.test.ts
git commit -m "feat(calendario): fechas gregorianas con bisiestos, validación, número de día y suma de días y meses" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada. El identificador del commit varía. Con `core.autocrlf=true`, Git avisa antes `warning: in the working copy of '…', LF will be replaced by CRLF the next time Git touches it` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
[diseno/especificacion-y-vistas 6d8f30b] feat(calendario): fechas gregorianas con bisiestos, validación, número de día y suma de días y meses
 2 files changed, 467 insertions(+)
 create mode 100644 src/dominio/calendario/fecha.test.ts
 create mode 100644 src/dominio/calendario/fecha.ts
```

### Tarea 6: Formato de fechas (`formatoFecha.ts`)

Escribe las fechas como las muestran todas las vistas: «12 de abril de 1640 T.E.», «jueves, 12 de abril de 1640 T.E.» o, sin año, «12 de abril». Depende de la tarea 5 (`Fecha` y `diaDeLaSemana`).

**Reglas de la especificación que implementa (§4):**

- **La Edad es solo una etiqueta que acompaña al año.** En MERP, la historia de la Tierra Media se divide en Edades, y la partida transcurre en una de ellas. La Edad no cambia ningún cálculo: el año 1640 tiene los mismos días en la Tercera Edad que en la Cuarta. Solo se escribe detrás del año con su abreviatura: **S.E.** (Segunda Edad), **T.E.** (Tercera Edad) y **C.E.** (Cuarta Edad). La partida guarda la Edad como `segunda`, `tercera` o `cuarta` (§8), y el tipo `Edad` usa esos mismos valores.
- **Meses de hoy y semana de lunes a domingo.** Los nombres van en castellano y en minúscula, como se escriben dentro de una frase («12 de abril»). `NOMBRES_DIA` sigue el orden de `diaDeLaSemana`: el índice 0 es el lunes.
- **Formas que usan las vistas:**
  - «domingo, 1 de enero de 1640 T.E.», la fecha inicial del ejemplo (§6.1, P1, y §12);
  - «12 de abril de 1640 T.E.» en los formularios;
  - «Termina el 26 de abril» o «vence el 20 de abril» en las ayudas y los avisos, que solo llevan día y mes (`formatearDiaMes`).
- **El año va sin separador de miles.** La regla de los miles con «.» (1.240) es para cantidades. Un año es un nombre de fecha y se escribe «1640», nunca «1.640».

**Archivos:**
- Crear: `src/dominio/calendario/formatoFecha.ts`
- Prueba: `src/dominio/calendario/formatoFecha.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La prueba cubre:
- las abreviaturas y las listas de nombres completas, con las tildes de «miércoles» y «sábado»;
- las cuatro combinaciones de Edad y día de la semana con el 12 de abril de 1640;
- la fecha inicial del ejemplo;
- las otras dos Edades;
- que el día no lleva cero delante;
- una semana entera de abril de 1640, del lunes 9 al domingo 15, para comprobar que cada nombre cae en su día.

Crea `src/dominio/calendario/formatoFecha.test.ts` con este contenido:

```ts
import { describe, it, expect } from 'vitest'
import type { Fecha } from './fecha'
import {
  ABREVIATURA_EDAD,
  formatearDiaMes,
  formatearFecha,
  NOMBRES_DIA,
  NOMBRES_MES,
} from './formatoFecha'

/** Atajo para escribir fechas en las pruebas: f(1640, 4, 12) es el 12 de abril de 1640. */
function f(anio: number, mes: number, dia: number): Fecha {
  return { anio, mes, dia }
}

describe('nombres y abreviaturas', () => {
  it('abrevia las tres Edades como S.E., T.E. y C.E.', () => {
    expect(ABREVIATURA_EDAD).toEqual({ segunda: 'S.E.', tercera: 'T.E.', cuarta: 'C.E.' })
  })

  it('nombra los doce meses en minúscula, de enero a diciembre', () => {
    expect(NOMBRES_MES).toEqual([
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ])
  })

  it('nombra los siete días en minúscula y con tildes, de lunes a domingo', () => {
    expect(NOMBRES_DIA).toEqual(['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'])
  })
})

describe('formatearFecha', () => {
  it('«12 de abril de 1640 T.E.» con la Edad', () => {
    expect(formatearFecha(f(1640, 4, 12), { edad: 'tercera' })).toBe('12 de abril de 1640 T.E.')
  })

  it('«jueves, 12 de abril de 1640 T.E.» con la Edad y el día de la semana', () => {
    expect(formatearFecha(f(1640, 4, 12), { edad: 'tercera', diaSemana: true })).toBe(
      'jueves, 12 de abril de 1640 T.E.',
    )
  })

  it('«12 de abril de 1640» sin opciones, con opciones vacías o con diaSemana false', () => {
    expect(formatearFecha(f(1640, 4, 12))).toBe('12 de abril de 1640')
    expect(formatearFecha(f(1640, 4, 12), {})).toBe('12 de abril de 1640')
    expect(formatearFecha(f(1640, 4, 12), { diaSemana: false })).toBe('12 de abril de 1640')
  })

  it('«jueves, 12 de abril de 1640» con el día de la semana y sin Edad', () => {
    expect(formatearFecha(f(1640, 4, 12), { diaSemana: true })).toBe('jueves, 12 de abril de 1640')
  })

  it('la fecha inicial del ejemplo: «domingo, 1 de enero de 1640 T.E.»', () => {
    expect(formatearFecha(f(1640, 1, 1), { edad: 'tercera', diaSemana: true })).toBe(
      'domingo, 1 de enero de 1640 T.E.',
    )
  })

  it('usa la abreviatura de la Segunda y de la Cuarta Edad', () => {
    expect(formatearFecha(f(3441, 10, 5), { edad: 'segunda' })).toBe('5 de octubre de 3441 S.E.')
    expect(formatearFecha(f(1, 3, 1), { edad: 'cuarta' })).toBe('1 de marzo de 1 C.E.')
  })

  it('el día va sin cero delante y el año sin separador de miles', () => {
    expect(formatearFecha(f(1640, 5, 1))).toBe('1 de mayo de 1640')
    expect(formatearFecha(f(2000, 2, 29))).toBe('29 de febrero de 2000')
  })

  it.each([
    [9, 'lunes'],
    [10, 'martes'],
    [11, 'miércoles'],
    [12, 'jueves'],
    [13, 'viernes'],
    [14, 'sábado'],
    [15, 'domingo'],
  ])('el %i de abril de 1640 es %s', (dia, nombre) => {
    expect(formatearFecha(f(1640, 4, dia), { diaSemana: true })).toBe(`${nombre}, ${dia} de abril de 1640`)
  })
})

describe('formatearDiaMes', () => {
  it('«12 de abril», sin año ni Edad', () => {
    expect(formatearDiaMes(f(1640, 4, 12))).toBe('12 de abril')
  })

  it('«1 de mayo», «29 de febrero» y «31 de diciembre»', () => {
    expect(formatearDiaMes(f(1640, 5, 1))).toBe('1 de mayo')
    expect(formatearDiaMes(f(1640, 2, 29))).toBe('29 de febrero')
    expect(formatearDiaMes(f(1640, 12, 31))).toBe('31 de diciembre')
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/calendario/formatoFecha.test.ts
```

Fallo esperado (todavía no existe `formatoFecha.ts`; la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/calendario/formatoFecha.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/calendario/formatoFecha.test.ts [ src/dominio/calendario/formatoFecha.test.ts ]
Error: Cannot find module './formatoFecha' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/calendario/formatoFecha.test.ts
 ❯ src/dominio/calendario/formatoFecha.test.ts:3:1
      1| import { describe, it, expect } from 'vitest'
      2| import type { Fecha } from './fecha'
      3| import {
       | ^
      4|   ABREVIATURA_EDAD,
      5|   formatearDiaMes,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Implementar `formatoFecha.ts`**

`formatearFecha` compone la fecha con `formatearDiaMes` y el año. Si se pide, añade la abreviatura de la Edad detrás y el nombre del día de la semana delante, seguido de coma. Las opciones son opcionales: sin ellas sale «12 de abril de 1640».

Crea `src/dominio/calendario/formatoFecha.ts` con este contenido:

```ts
import { diaDeLaSemana, type Fecha } from './fecha'

/** Edad de la partida: solo una etiqueta que acompaña al año (§4). */
export type Edad = 'segunda' | 'tercera' | 'cuarta'

export const ABREVIATURA_EDAD: Record<Edad, string> = {
  segunda: 'S.E.',
  tercera: 'T.E.',
  cuarta: 'C.E.',
}

/** NOMBRES_MES[0] es enero: el índice es mes − 1. */
export const NOMBRES_MES: readonly string[] = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** NOMBRES_DIA[0] es lunes: el índice es el de diaDeLaSemana. */
export const NOMBRES_DIA: readonly string[] = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
]

/** «12 de abril» */
export function formatearDiaMes(f: Fecha): string {
  return `${f.dia} de ${NOMBRES_MES[f.mes - 1]}`
}

/** «12 de abril de 1640 T.E.»; sin edad: «12 de abril de 1640»; con diaSemana: «jueves, 12 de abril de 1640 T.E.». */
export function formatearFecha(f: Fecha, opciones: { edad?: Edad; diaSemana?: boolean } = {}): string {
  // El año va tal cual, sin separador de miles: es un año, no una cantidad.
  let texto = `${formatearDiaMes(f)} de ${f.anio}`
  if (opciones.edad !== undefined) {
    texto = `${texto} ${ABREVIATURA_EDAD[opciones.edad]}`
  }
  if (opciones.diaSemana === true) {
    texto = `${NOMBRES_DIA[diaDeLaSemana(f)]}, ${texto}`
  }
  return texto
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/calendario/formatoFecha.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 Test Files  1 passed (1)
      Tests  19 passed (19)
```

- [ ] **Paso 5: Comprobar los tipos y el calendario completo**

```bash
npx tsc -b
npx vitest run src/dominio/calendario/
```

Salida esperada: `tsc -b` no escribe nada, y Vitest ejecuta los dos archivos del calendario (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 Test Files  2 passed (2)
      Tests  77 passed (77)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/calendario/formatoFecha.ts src/dominio/calendario/formatoFecha.test.ts
git commit -m "feat(calendario): formato de fechas con día de la semana y abreviatura de la Edad" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada. El identificador del commit varía, y Git puede avisar del cambio de LF a CRLF como en la tarea 5. `git status --short` no muestra nada:

```text
[diseno/especificacion-y-vistas 2bea96e] feat(calendario): formato de fechas con día de la semana y abreviatura de la Edad
 2 files changed, 158 insertions(+)
 create mode 100644 src/dominio/calendario/formatoFecha.test.ts
 create mode 100644 src/dominio/calendario/formatoFecha.ts
```

---

### Tarea 7: Recurrencias (`recurrencia.ts`)

Los pagos, los cobros y la producción de la partida se repiten: salarios cada viernes, un impuesto el día 1 de cada mes, una soldada cada dos semanas. Esta tarea define el tipo `Recurrencia` y cuatro preguntas que el motor de «Avanzar días» y las pantallas le harán: si ocurre un día, cuál es la siguiente ocurrencia, cuál fue la anterior y cuáles caen entre dos fechas. Añade también la validación del campo de frecuencia. Depende de la tarea 5 (`fecha.ts`).

**Reglas de la especificación que implementa:**

- **Nueve frecuencias (§4, «Recurrencias», y §6.5, selector n.º 13).** Cada día, cada N días, semanal (un día de la semana), cada dos semanas, mensual (un día del mes), cada N meses, trimestral, anual (un día de un mes) y una sola vez. Son las opciones del campo «Frecuencia» de todos los formularios con dinero o producción recurrente, y el tipo `Recurrencia` guarda los datos de cada una.
- **El día que no existe pasa al último día del mes (§4).** Un cobro «mensual, el día 30» cae el 30 de abril, el 29 de febrero de 1640 (bisiesto) y el 28 de febrero de 1641. Cada fecha se calcula desde el mes y el día elegidos con `diaEnMes` y nunca encadenando la fecha anterior: si no, después del 28 de febrero vendría el 28 de marzo, y el día elegido se perdería (lo muestra la última prueba de `sumarMeses` en la tarea 5).
- **«Primera vez» (§6.4, formulario «Edificio», y §6.5, selector n.º 13).** Cada N días, cada dos semanas, cada N meses y trimestral no se pueden situar solo con un día de la semana o del mes: hace falta una fecha de partida, la «Primera vez», que la especificación pide posterior a la fecha actual. Las ocurrencias son esa fecha y las que resultan de sumarle el periodo, y antes de la primera vez no hay ninguna: `ocurreEl` dice que no, `siguienteOcurrencia` devuelve la primera vez y `ocurrenciasEntre` empieza en ella. Si contaran las fechas anteriores, con fecha actual el 12 de abril y «cada 10 días, primera vez el 20 de mayo», el motor pagaría o produciría el 20 y el 30 de abril y el 10 de mayo. Semanal, mensual y anual no la necesitan, y se repiten sin principio ni fin.
- **La ocurrencia anterior también existe antes de la primera vez (§7, producción, «Periodo y acumulado»).** Una producción suma cada día un poco durante su periodo, que va del día siguiente a la ocurrencia anterior, real o teórica, hasta el día de la ocurrencia. Con «mensual, día 1», el periodo del 1 de mayo va del 2 de abril al 1 de mayo: 30 días. En la primera ocurrencia no hubo una anterior real, y §6.4 y §6.5 dicen que la ocurrencia teórica anterior es «la primera vez menos un periodo». Por eso `anteriorOcurrencia`, y solo ella, sigue contando hacia atrás desde la primera vez: esas fechas teóricas no son ocurrencias para las otras tres funciones. Solo devuelve `null` con «una sola vez», cuando esa fecha aún no ha pasado.
- **Siguiente estrictamente posterior (§6.3, A5).** El 12 de abril, A5 muestra «Próximo pago 4,2 mo · viernes 13 de abril». El motor pregunta cuál es la siguiente ocurrencia después del día en curso, así que `siguienteOcurrencia` nunca devuelve la misma fecha que recibe. Con «una sola vez» ya pasada devuelve `null`: ya no quedan pagos.
- **Límites del campo (§6.4, formulario «Edificio», y §6.5, selector n.º 13).** Cada N días va de 2 a 366 y cada N meses, de 2 a 12. N = 1 sería «cada día» o «mensual», que ya son opciones propias. El día de la semana va de 0 (lunes) a 6 (domingo), el día del mes de 1 a 31, el mes de 1 a 12, y las fechas deben existir (`validarFecha`, tarea 5). Los mensajes salen bajo el campo (§6.4, «Patrones transversales», «Validación»).
- **La primera vez cae en el día del mes elegido.** En cada N meses y trimestral hay dos datos que deben casar: el día del mes y la primera vez. Si no casan (día 15 y primera vez el 12 de abril), la primera vez no sería una ocurrencia, y `siguienteOcurrencia` devolvería antes de ella una fecha en la que no ocurre nada. `validarRecurrencia` lo rechaza con «La primera vez debe caer el día 15 del mes» o, del día 29 al 31, con «La primera vez debe caer el día 31 del mes o, si no lo tiene, el último». El 30 de abril sí casa con el día 31, porque abril no tiene 31. Aviso para la fase 6: el valor inicial de la primera vez es la fecha actual + N meses o + 3 meses (§6.4 y §6.5), que solo casa si el día del mes elegido es el de la fecha actual. El campo de frecuencia debe tomar el día del mes de la primera vez, o recalcular la primera vez al cambiar el día, para que el valor inicial sea válido.

**Cómo funciona `recurrencia.ts`:**

- **Tres casos.** La función interna `patron` reduce las nueve frecuencias a tres casos:
  - **Por días**, cada `cada` días desde un número de día (tarea 5) en que ocurre: diaria (1), cada N días (N) y quincenal (14) desde la primera vez; semanal (7) desde un día con ese día de la semana. El número de día 0, el 1 de enero de 1970, fue jueves (3), así que el día `diaSemana − 3` cae en el día pedido.
  - **Por meses**, cada `cada` meses desde un índice de mes (`anio × 12 + mes − 1`), siempre en el día elegido acotado al mes: mensual (1), cada N meses (N) y trimestral (3) desde el mes de la primera vez; anual (12) desde el mes elegido del año 0.
  - **Una sola vez**, que solo compara con su fecha.
- **Resto siempre positivo.** Todo se decide con el resto de dividir la distancia entre el periodo. En JavaScript, `−3 % 7` da `−3`, y las fechas anteriores a la de partida dan distancias negativas. Por eso la función `modulo` suma el divisor y vuelve a dividir, igual que `diaDeLaSemana` en la tarea 5.
- **Nada antes de la primera vez.** `ocurreEl` y `siguienteOcurrencia` miran primero la primera vez (función `primeraVez`, `null` en los tipos que no la tienen). Antes de ella, `ocurreEl` da `false` y `siguienteOcurrencia` da la primera vez; desde ella, decide el patrón. `anteriorOcurrencia` no la mira, porque la anterior puede ser teórica.
- **`ocurrenciasEntre`** empieza con la siguiente ocurrencia después de la víspera de `desde`, así incluye `desde` si es ocurrencia, y avanza con `siguienteOcurrencia` hasta pasar `hasta`. Como se apoya en `siguienteOcurrencia`, tampoco da nada antes de la primera vez.
- Las cuatro funciones de cálculo suponen una recurrencia válida, sin errores de `validarRecurrencia`: con N = 0, por ejemplo, dividirían entre cero, y con una primera vez que no casa con el día del mes, `siguienteOcurrencia` devolvería una fecha que no es ocurrencia.

**Archivos:**
- Crear: `src/dominio/calendario/recurrencia.ts`
- Prueba: `src/dominio/calendario/recurrencia.test.ts`

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

- [ ] **Paso 1: Escribir la prueba que falla**

Qué comprueba cada bloque:
- `ocurreEl`, `siguienteOcurrencia`, `ocurrenciasEntre` y `anteriorOcurrencia`: las cifras del ejemplo de abril de 1640 (domingos, viernes, quincenal desde el 10 de abril, mensual día 30 y día 1, única ya pasada), la producción semanal de los sábados (§9, «Datos de reservas del ejemplo») y los casos límite de cada tipo: días que no existen en el mes, fechas anteriores a la primera vez y fechas iguales a una ocurrencia.
- Coherencia: para 15 recurrencias, recorre todos los días de 1639 a 1642. Comprueba que `ocurrenciasEntre` da justo los días en que `ocurreEl` dice que sí, y que esos días son las ocurrencias teóricas desde la primera vez. Las teóricas son las de la misma recurrencia con la primera vez muchos periodos antes (`conPrimeraLejana`). Cada día, `siguienteOcurrencia` debe dar la ocurrencia más cercana de la lista real, y `anteriorOcurrencia`, la más cercana de la lista teórica. Si falla, `primerError` dice en qué día.
- `validarRecurrencia`: recurrencias válidas de todos los tipos, cada límite con sus mensajes, las fechas que no existen, la primera vez que no casa con el día del mes y el orden de varios errores.

Crea `src/dominio/calendario/recurrencia.test.ts` con este contenido:

```ts
import { describe, it, expect } from 'vitest'
import { aNumeroDeDia, desdeNumeroDeDia, diaEnMes, diasEntre, sumarDias, type Fecha } from './fecha'
import {
  anteriorOcurrencia,
  ocurreEl,
  ocurrenciasEntre,
  siguienteOcurrencia,
  validarRecurrencia,
  type Recurrencia,
} from './recurrencia'

/** Atajo para escribir fechas en las pruebas: f(1640, 4, 12) es el 12 de abril de 1640. */
function f(anio: number, mes: number, dia: number): Fecha {
  return { anio, mes, dia }
}

const DIARIA: Recurrencia = { tipo: 'diaria' }
const DOMINGOS: Recurrencia = { tipo: 'semanal', diaSemana: 6 }
const VIERNES: Recurrencia = { tipo: 'semanal', diaSemana: 4 }
const SABADOS: Recurrencia = { tipo: 'semanal', diaSemana: 5 }
const CADA_10_DIAS: Recurrencia = { tipo: 'cadaNDias', n: 10, primera: f(1640, 4, 20) }
const QUINCENAL_10_ABRIL: Recurrencia = { tipo: 'quincenal', primera: f(1640, 4, 10) }
const MENSUAL_DIA_1: Recurrencia = { tipo: 'mensual', diaMes: 1 }
const MENSUAL_DIA_30: Recurrencia = { tipo: 'mensual', diaMes: 30 }
const MENSUAL_DIA_31: Recurrencia = { tipo: 'mensual', diaMes: 31 }
/** Día 31 cada 2 meses desde el 31 de enero de 1641: marzo, mayo… Noviembre y septiembre de 1640 solo son anteriores teóricas. */
const CADA_2_MESES_DIA_31: Recurrencia = { tipo: 'cadaNMeses', n: 2, diaMes: 31, primera: f(1641, 1, 31) }
/** Día 31 cada 3 meses desde el 30 de noviembre de 1640 (noviembre no tiene 31). */
const TRIMESTRAL_DIA_31: Recurrencia = { tipo: 'trimestral', diaMes: 31, primera: f(1640, 11, 30) }
const ANUAL_29_FEBRERO: Recurrencia = { tipo: 'anual', mes: 2, diaMes: 29 }
const UNICA_12_ABRIL: Recurrencia = { tipo: 'unica', fecha: f(1640, 4, 12) }

describe('ocurreEl', () => {
  it('diaria: ocurre todos los días', () => {
    expect(ocurreEl(DIARIA, f(1640, 4, 12))).toBe(true)
    expect(ocurreEl(DIARIA, f(1640, 2, 29))).toBe(true)
  })

  it('semanal: ocurre el día de la semana elegido (0 = lunes … 6 = domingo)', () => {
    expect(ocurreEl(DOMINGOS, f(1640, 4, 1))).toBe(true)
    expect(ocurreEl(DOMINGOS, f(1640, 4, 2))).toBe(false)
    expect(ocurreEl(VIERNES, f(1640, 4, 13))).toBe(true)
    expect(ocurreEl(VIERNES, f(1640, 4, 12))).toBe(false)
  })

  it('cada N días y quincenal: en la primera vez y cada periodo después; nunca antes de la primera vez', () => {
    expect(ocurreEl(CADA_10_DIAS, f(1640, 4, 20))).toBe(true)
    expect(ocurreEl(CADA_10_DIAS, f(1640, 4, 30))).toBe(true)
    expect(ocurreEl(CADA_10_DIAS, f(1640, 4, 10))).toBe(false)
    expect(ocurreEl(CADA_10_DIAS, f(1640, 4, 15))).toBe(false)
    expect(ocurreEl(QUINCENAL_10_ABRIL, f(1640, 4, 10))).toBe(true)
    expect(ocurreEl(QUINCENAL_10_ABRIL, f(1640, 4, 24))).toBe(true)
    expect(ocurreEl(QUINCENAL_10_ABRIL, f(1640, 3, 27))).toBe(false)
    expect(ocurreEl(QUINCENAL_10_ABRIL, f(1640, 4, 17))).toBe(false)
  })

  it('mensual día 30: el 30 de abril, el 29 de febrero de 1640 y el 28 de febrero de 1641', () => {
    expect(ocurreEl(MENSUAL_DIA_30, f(1640, 4, 30))).toBe(true)
    expect(ocurreEl(MENSUAL_DIA_30, f(1640, 2, 29))).toBe(true)
    expect(ocurreEl(MENSUAL_DIA_30, f(1641, 2, 28))).toBe(true)
    expect(ocurreEl(MENSUAL_DIA_30, f(1640, 2, 28))).toBe(false)
    expect(ocurreEl(MENSUAL_DIA_30, f(1640, 3, 31))).toBe(false)
  })

  it('cada N meses y trimestral: el día elegido, o el último del mes, en los meses del periodo desde la primera vez', () => {
    expect(ocurreEl(CADA_2_MESES_DIA_31, f(1641, 1, 31))).toBe(true)
    expect(ocurreEl(CADA_2_MESES_DIA_31, f(1641, 3, 31))).toBe(true)
    expect(ocurreEl(CADA_2_MESES_DIA_31, f(1640, 11, 30))).toBe(false)
    expect(ocurreEl(CADA_2_MESES_DIA_31, f(1641, 2, 28))).toBe(false)
    expect(ocurreEl(CADA_2_MESES_DIA_31, f(1641, 3, 30))).toBe(false)
    expect(ocurreEl(TRIMESTRAL_DIA_31, f(1640, 11, 30))).toBe(true)
    expect(ocurreEl(TRIMESTRAL_DIA_31, f(1641, 2, 28))).toBe(true)
    expect(ocurreEl(TRIMESTRAL_DIA_31, f(1641, 5, 31))).toBe(true)
    expect(ocurreEl(TRIMESTRAL_DIA_31, f(1640, 8, 31))).toBe(false)
    expect(ocurreEl(TRIMESTRAL_DIA_31, f(1641, 5, 28))).toBe(false)
  })

  it('anual 29 de febrero: el 29 en los años bisiestos y el 28 en los demás', () => {
    expect(ocurreEl(ANUAL_29_FEBRERO, f(1640, 2, 29))).toBe(true)
    expect(ocurreEl(ANUAL_29_FEBRERO, f(1640, 2, 28))).toBe(false)
    expect(ocurreEl(ANUAL_29_FEBRERO, f(1641, 2, 28))).toBe(true)
    expect(ocurreEl(ANUAL_29_FEBRERO, f(1641, 3, 1))).toBe(false)
  })

  it('una sola vez: solo en su fecha', () => {
    expect(ocurreEl(UNICA_12_ABRIL, f(1640, 4, 12))).toBe(true)
    expect(ocurreEl(UNICA_12_ABRIL, f(1640, 4, 13))).toBe(false)
    expect(ocurreEl(UNICA_12_ABRIL, f(1641, 4, 12))).toBe(false)
  })
})

describe('siguienteOcurrencia', () => {
  it('mensual día 1: después del 12 de abril, el 1 de mayo', () => {
    expect(siguienteOcurrencia(MENSUAL_DIA_1, f(1640, 4, 12))).toEqual(f(1640, 5, 1))
  })

  it('semanal viernes: el 12 de abril, el próximo pago de los salarios de Bree es el viernes 13 (A5)', () => {
    expect(siguienteOcurrencia(VIERNES, f(1640, 4, 12))).toEqual(f(1640, 4, 13))
  })

  it('es estrictamente posterior: después de una ocurrencia da la siguiente', () => {
    expect(siguienteOcurrencia(MENSUAL_DIA_1, f(1640, 4, 1))).toEqual(f(1640, 5, 1))
    expect(siguienteOcurrencia(VIERNES, f(1640, 4, 13))).toEqual(f(1640, 4, 20))
    expect(siguienteOcurrencia(DIARIA, f(1640, 12, 31))).toEqual(f(1641, 1, 1))
  })

  it('mensual día 30 y 31: el último día en los meses cortos, sin perder el día elegido después', () => {
    expect(siguienteOcurrencia(MENSUAL_DIA_30, f(1640, 1, 30))).toEqual(f(1640, 2, 29))
    expect(siguienteOcurrencia(MENSUAL_DIA_30, f(1640, 2, 29))).toEqual(f(1640, 3, 30))
    expect(siguienteOcurrencia(MENSUAL_DIA_30, f(1641, 1, 30))).toEqual(f(1641, 2, 28))
    expect(siguienteOcurrencia(MENSUAL_DIA_31, f(1640, 4, 30))).toEqual(f(1640, 5, 31))
  })

  it('cada N días y quincenal: cuenta desde la primera vez; antes de ella, la siguiente es la primera vez', () => {
    expect(siguienteOcurrencia(CADA_10_DIAS, f(1640, 4, 12))).toEqual(f(1640, 4, 20))
    expect(siguienteOcurrencia(CADA_10_DIAS, f(1640, 4, 1))).toEqual(f(1640, 4, 20))
    expect(siguienteOcurrencia(CADA_10_DIAS, f(1640, 4, 20))).toEqual(f(1640, 4, 30))
    expect(siguienteOcurrencia(QUINCENAL_10_ABRIL, f(1640, 4, 10))).toEqual(f(1640, 4, 24))
    expect(siguienteOcurrencia(QUINCENAL_10_ABRIL, f(1640, 1, 1))).toEqual(f(1640, 4, 10))
  })

  it('cada N meses y trimestral: cada fecha sale de la primera vez, sin encadenar los meses acortados', () => {
    expect(siguienteOcurrencia(CADA_2_MESES_DIA_31, f(1640, 10, 1))).toEqual(f(1641, 1, 31))
    expect(siguienteOcurrencia(CADA_2_MESES_DIA_31, f(1641, 1, 31))).toEqual(f(1641, 3, 31))
    expect(siguienteOcurrencia(CADA_2_MESES_DIA_31, f(1641, 2, 15))).toEqual(f(1641, 3, 31))
    expect(siguienteOcurrencia(TRIMESTRAL_DIA_31, f(1640, 11, 30))).toEqual(f(1641, 2, 28))
    expect(siguienteOcurrencia(TRIMESTRAL_DIA_31, f(1641, 2, 28))).toEqual(f(1641, 5, 31))
  })

  it('anual 29 de febrero: el 28 en los años que no son bisiestos', () => {
    expect(siguienteOcurrencia(ANUAL_29_FEBRERO, f(1640, 4, 12))).toEqual(f(1641, 2, 28))
    expect(siguienteOcurrencia(ANUAL_29_FEBRERO, f(1641, 2, 28))).toEqual(f(1642, 2, 28))
    expect(siguienteOcurrencia(ANUAL_29_FEBRERO, f(1643, 3, 1))).toEqual(f(1644, 2, 29))
  })

  it('una sola vez: su fecha si aún no ha llegado; null si ya pasó o es ese mismo día', () => {
    expect(siguienteOcurrencia(UNICA_12_ABRIL, f(1640, 4, 1))).toEqual(f(1640, 4, 12))
    expect(siguienteOcurrencia(UNICA_12_ABRIL, f(1640, 4, 19))).toBeNull()
    expect(siguienteOcurrencia(UNICA_12_ABRIL, f(1640, 4, 12))).toBeNull()
  })
})

describe('ocurrenciasEntre', () => {
  it('semanal domingo en abril de 1640: 1, 8, 15, 22 y 29', () => {
    expect(ocurrenciasEntre(DOMINGOS, f(1640, 4, 1), f(1640, 4, 30))).toEqual([
      f(1640, 4, 1),
      f(1640, 4, 8),
      f(1640, 4, 15),
      f(1640, 4, 22),
      f(1640, 4, 29),
    ])
  })

  it('semanal viernes en abril de 1640: 6, 13, 20 y 27', () => {
    expect(ocurrenciasEntre(VIERNES, f(1640, 4, 1), f(1640, 4, 30))).toEqual([
      f(1640, 4, 6),
      f(1640, 4, 13),
      f(1640, 4, 20),
      f(1640, 4, 27),
    ])
  })

  it('semanal sábado del 13 de abril al 12 de mayo: 14, 21 y 28 de abril, 5 y 12 de mayo (§9)', () => {
    expect(ocurrenciasEntre(SABADOS, f(1640, 4, 13), f(1640, 5, 12))).toEqual([
      f(1640, 4, 14),
      f(1640, 4, 21),
      f(1640, 4, 28),
      f(1640, 5, 5),
      f(1640, 5, 12),
    ])
  })

  it('quincenal desde el 10 de abril: 10 y 24 de abril y 8 de mayo, y nada antes de la primera vez', () => {
    expect(ocurrenciasEntre(QUINCENAL_10_ABRIL, f(1640, 3, 1), f(1640, 5, 8))).toEqual([
      f(1640, 4, 10),
      f(1640, 4, 24),
      f(1640, 5, 8),
    ])
  })

  it('mensual día 30 de enero de 1640 a marzo de 1641: el 29 y el 28 de febrero, y el 30 los demás meses', () => {
    expect(ocurrenciasEntre(MENSUAL_DIA_30, f(1640, 1, 1), f(1641, 3, 31))).toEqual([
      f(1640, 1, 30),
      f(1640, 2, 29),
      f(1640, 3, 30),
      f(1640, 4, 30),
      f(1640, 5, 30),
      f(1640, 6, 30),
      f(1640, 7, 30),
      f(1640, 8, 30),
      f(1640, 9, 30),
      f(1640, 10, 30),
      f(1640, 11, 30),
      f(1640, 12, 30),
      f(1641, 1, 30),
      f(1641, 2, 28),
      f(1641, 3, 30),
    ])
  })

  it('trimestral día 31 desde el 30 de noviembre de 1640: nada antes; luego 28 de febrero, 31 de mayo y 31 de agosto', () => {
    expect(ocurrenciasEntre(TRIMESTRAL_DIA_31, f(1640, 8, 1), f(1641, 8, 31))).toEqual([
      f(1640, 11, 30),
      f(1641, 2, 28),
      f(1641, 5, 31),
      f(1641, 8, 31),
    ])
  })

  it('incluye las dos fechas límite; lista vacía si no hay ocurrencias o si desde es posterior a hasta', () => {
    expect(ocurrenciasEntre(DIARIA, f(1640, 4, 12), f(1640, 4, 12))).toEqual([f(1640, 4, 12)])
    expect(ocurrenciasEntre(MENSUAL_DIA_1, f(1640, 4, 2), f(1640, 4, 30))).toEqual([])
    expect(ocurrenciasEntre(DIARIA, f(1640, 4, 19), f(1640, 4, 12))).toEqual([])
    expect(ocurrenciasEntre(UNICA_12_ABRIL, f(1640, 4, 1), f(1640, 4, 30))).toEqual([f(1640, 4, 12)])
    expect(ocurrenciasEntre(UNICA_12_ABRIL, f(1640, 4, 13), f(1640, 12, 31))).toEqual([])
  })
})

describe('anteriorOcurrencia', () => {
  it('mensual día 1: antes del 1 de mayo, el 1 de abril; el periodo del 2 de abril al 1 de mayo tiene 30 días (§7)', () => {
    const anterior = anteriorOcurrencia(MENSUAL_DIA_1, f(1640, 5, 1))
    expect(anterior).toEqual(f(1640, 4, 1))
    expect(diasEntre(anterior!, f(1640, 5, 1))).toBe(30)
  })

  it('es estrictamente anterior: antes de una ocurrencia da la anterior', () => {
    expect(anteriorOcurrencia(MENSUAL_DIA_1, f(1640, 4, 12))).toEqual(f(1640, 4, 1))
    expect(anteriorOcurrencia(SABADOS, f(1640, 4, 14))).toEqual(f(1640, 4, 7))
    expect(anteriorOcurrencia(DIARIA, f(1641, 1, 1))).toEqual(f(1640, 12, 31))
  })

  it('cada N días y quincenal: antes de la primera vez sigue hacia atrás (la primera vez menos un periodo)', () => {
    expect(anteriorOcurrencia(CADA_10_DIAS, f(1640, 4, 20))).toEqual(f(1640, 4, 10))
    expect(anteriorOcurrencia(CADA_10_DIAS, f(1640, 4, 10))).toEqual(f(1640, 3, 31))
    expect(anteriorOcurrencia(QUINCENAL_10_ABRIL, f(1640, 4, 10))).toEqual(f(1640, 3, 27))
    expect(anteriorOcurrencia(QUINCENAL_10_ABRIL, f(1640, 1, 3))).toEqual(f(1639, 12, 20))
  })

  it('cada N meses y trimestral: hacia atrás desde la primera vez, sin encadenar los meses acortados', () => {
    expect(anteriorOcurrencia(CADA_2_MESES_DIA_31, f(1641, 1, 31))).toEqual(f(1640, 11, 30))
    expect(anteriorOcurrencia(CADA_2_MESES_DIA_31, f(1640, 11, 30))).toEqual(f(1640, 9, 30))
    expect(anteriorOcurrencia(CADA_2_MESES_DIA_31, f(1640, 9, 30))).toEqual(f(1640, 7, 31))
    expect(anteriorOcurrencia(TRIMESTRAL_DIA_31, f(1640, 11, 30))).toEqual(f(1640, 8, 31))
    expect(anteriorOcurrencia(TRIMESTRAL_DIA_31, f(1640, 5, 31))).toEqual(f(1640, 2, 29))
    expect(anteriorOcurrencia(TRIMESTRAL_DIA_31, f(1640, 2, 29))).toEqual(f(1639, 11, 30))
  })

  it('anual 29 de febrero: el 28 en los años que no son bisiestos', () => {
    expect(anteriorOcurrencia(ANUAL_29_FEBRERO, f(1641, 3, 1))).toEqual(f(1641, 2, 28))
    expect(anteriorOcurrencia(ANUAL_29_FEBRERO, f(1641, 2, 28))).toEqual(f(1640, 2, 29))
  })

  it('una sola vez: su fecha si ya pasó; null si es ese mismo día o aún no ha llegado', () => {
    expect(anteriorOcurrencia(UNICA_12_ABRIL, f(1640, 4, 19))).toEqual(f(1640, 4, 12))
    expect(anteriorOcurrencia(UNICA_12_ABRIL, f(1640, 4, 12))).toBeNull()
    expect(anteriorOcurrencia(UNICA_12_ABRIL, f(1640, 4, 1))).toBeNull()
  })
})

/**
 * La misma recurrencia con la primera vez siglos antes, en una fecha del mismo patrón. De 1639 a 1642 sus ocurrencias
 * son las teóricas de r, también las anteriores a la primera vez. Las recurrencias sin primera vez no cambian.
 */
function conPrimeraLejana(r: Recurrencia): Recurrencia {
  switch (r.tipo) {
    case 'cadaNDias':
      return { ...r, primera: sumarDias(r.primera, -r.n * Math.ceil(100000 / r.n)) }
    case 'quincenal':
      return { ...r, primera: sumarDias(r.primera, -14 * Math.ceil(100000 / 14)) }
    case 'cadaNMeses':
      // 100 × n años son 1.200 × n meses, un número entero de periodos.
      return { ...r, primera: diaEnMes(r.primera.anio - 100 * r.n, r.primera.mes, r.diaMes) }
    case 'trimestral':
      return { ...r, primera: diaEnMes(r.primera.anio - 300, r.primera.mes, r.diaMes) }
    default:
      return r
  }
}

describe('coherencia de las cuatro funciones, día a día de 1639 a 1642', () => {
  const INICIO = f(1639, 1, 1)
  const FIN = f(1642, 12, 31)

  it.each<[string, Recurrencia]>([
    ['diaria', DIARIA],
    ['semanal lunes', { tipo: 'semanal', diaSemana: 0 }],
    ['semanal domingo', DOMINGOS],
    ['cada 10 días', CADA_10_DIAS],
    ['cada 366 días', { tipo: 'cadaNDias', n: 366, primera: f(1640, 2, 29) }],
    ['quincenal', QUINCENAL_10_ABRIL],
    ['mensual día 1', MENSUAL_DIA_1],
    ['mensual día 29', { tipo: 'mensual', diaMes: 29 }],
    ['mensual día 31', MENSUAL_DIA_31],
    ['cada 2 meses día 31', CADA_2_MESES_DIA_31],
    ['cada 12 meses día 29', { tipo: 'cadaNMeses', n: 12, diaMes: 29, primera: f(1641, 2, 28) }],
    ['trimestral día 31', TRIMESTRAL_DIA_31],
    ['anual 29 de febrero', ANUAL_29_FEBRERO],
    ['anual 31 de diciembre', { tipo: 'anual', mes: 12, diaMes: 31 }],
    ['una sola vez', UNICA_12_ABRIL],
  ])('%s', (_nombre, r) => {
    const inicio = aNumeroDeDia(INICIO)
    const fin = aNumeroDeDia(FIN)
    const lejana = conPrimeraLejana(r)

    // Listas de referencia: los números de día en que ocurreEl dice que sí, con r (reales) y con lejana (teóricas).
    const ocurrencias: number[] = []
    const teoricas: number[] = []
    for (let n = inicio; n <= fin; n++) {
      if (ocurreEl(r, desdeNumeroDeDia(n))) {
        ocurrencias.push(n)
      }
      if (ocurreEl(lejana, desdeNumeroDeDia(n))) {
        teoricas.push(n)
      }
    }
    expect(ocurrencias.length).toBeGreaterThan(0)
    expect(ocurrenciasEntre(r, INICIO, FIN)).toEqual(ocurrencias.map(desdeNumeroDeDia))
    // Las reales son las teóricas desde la primera vez: nada antes de ella.
    const primera = 'primera' in r ? aNumeroDeDia(r.primera) : -Infinity
    expect(ocurrencias).toEqual(teoricas.filter((n) => n >= primera))

    let primerError: string | null = null
    let posteriores = 0 // índice en `ocurrencias` de la primera ocurrencia posterior al día n
    let anteriores = 0 // cuántas teóricas son anteriores al día n
    for (let n = inicio; n <= fin && primerError === null; n++) {
      while (posteriores < ocurrencias.length && ocurrencias[posteriores] <= n) {
        posteriores++
      }
      while (anteriores < teoricas.length && teoricas[anteriores] < n) {
        anteriores++
      }
      // La siguiente sale de las reales; la anterior, de las teóricas (§6.4 y §6.5: la primera vez menos un periodo).
      const siguienteEsperada: number | undefined = ocurrencias[posteriores]
      const anteriorEsperada: number | undefined = teoricas[anteriores - 1]

      const dia = desdeNumeroDeDia(n)
      const siguiente = siguienteOcurrencia(r, dia)
      const anterior = anteriorOcurrencia(r, dia)

      // Fuera del rango recorrido no hay lista de referencia: basta con que caiga fuera y sea ocurrencia (teórica, la
      // anterior). Solo «una sola vez» puede no tener siguiente o anterior.
      const siguienteBien =
        siguienteEsperada !== undefined
          ? siguiente !== null && aNumeroDeDia(siguiente) === siguienteEsperada
          : r.tipo === 'unica'
            ? siguiente === null
            : siguiente !== null && aNumeroDeDia(siguiente) > fin && ocurreEl(r, siguiente)
      const anteriorBien =
        anteriorEsperada !== undefined
          ? anterior !== null && aNumeroDeDia(anterior) === anteriorEsperada
          : r.tipo === 'unica'
            ? anterior === null
            : anterior !== null && aNumeroDeDia(anterior) < inicio && ocurreEl(lejana, anterior)

      if (!siguienteBien || !anteriorBien) {
        primerError = `${JSON.stringify(dia)}: siguiente ${JSON.stringify(siguiente)}, anterior ${JSON.stringify(anterior)}`
      }
    }
    expect(primerError).toBeNull()
  })
})

describe('validarRecurrencia', () => {
  it('acepta recurrencias válidas de todos los tipos, con los valores límite', () => {
    const validas: Recurrencia[] = [
      DIARIA,
      { tipo: 'cadaNDias', n: 2, primera: f(1640, 4, 12) },
      { tipo: 'cadaNDias', n: 366, primera: f(1640, 2, 29) },
      { tipo: 'semanal', diaSemana: 0 },
      DOMINGOS,
      QUINCENAL_10_ABRIL,
      MENSUAL_DIA_1,
      MENSUAL_DIA_31,
      CADA_2_MESES_DIA_31,
      { tipo: 'cadaNMeses', n: 12, diaMes: 1, primera: f(1640, 5, 1) },
      TRIMESTRAL_DIA_31,
      { tipo: 'anual', mes: 1, diaMes: 1 },
      { tipo: 'anual', mes: 12, diaMes: 31 },
      UNICA_12_ABRIL,
    ]
    expect(validas.map(validarRecurrencia)).toEqual(validas.map(() => []))
  })

  it('cada N días: N es un número entero de 2 a 366', () => {
    const primera = f(1640, 4, 12)
    const error = ['N debe ser un número entero de 2 a 366']
    expect(validarRecurrencia({ tipo: 'cadaNDias', n: 1, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'cadaNDias', n: 367, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'cadaNDias', n: 2.5, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'cadaNDias', n: Number.NaN, primera })).toEqual(error)
  })

  it('cada N meses: N es un número entero de 2 a 12', () => {
    const primera = f(1640, 5, 1)
    const error = ['N debe ser un número entero de 2 a 12']
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 1, diaMes: 1, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 13, diaMes: 1, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 1.5, diaMes: 1, primera })).toEqual(error)
  })

  it('semanal: el día de la semana es un entero de 0 (lunes) a 6 (domingo)', () => {
    const error = ['El día de la semana debe estar entre lunes y domingo']
    expect(validarRecurrencia({ tipo: 'semanal', diaSemana: -1 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'semanal', diaSemana: 7 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'semanal', diaSemana: 0.5 })).toEqual(error)
  })

  it('mensual, cada N meses, trimestral y anual: el día del mes es un entero de 1 a 31', () => {
    const error = ['El día del mes debe estar entre 1 y 31']
    const primera = f(1640, 4, 12)
    expect(validarRecurrencia({ tipo: 'mensual', diaMes: 0 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'mensual', diaMes: 32 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'mensual', diaMes: 1.5 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 2, diaMes: 32, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'trimestral', diaMes: 0, primera })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'anual', mes: 4, diaMes: 32 })).toEqual(error)
  })

  it('anual: el mes es un entero de 1 a 12', () => {
    const error = ['El mes debe estar entre 1 y 12']
    expect(validarRecurrencia({ tipo: 'anual', mes: 0, diaMes: 1 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'anual', mes: 13, diaMes: 1 })).toEqual(error)
    expect(validarRecurrencia({ tipo: 'anual', mes: 2.5, diaMes: 1 })).toEqual(error)
  })

  it('las fechas deben existir, con el mensaje de validarFecha', () => {
    expect(validarRecurrencia({ tipo: 'cadaNDias', n: 10, primera: f(1640, 4, 31) })).toEqual([
      'Abril de 1640 tiene 30 días',
    ])
    expect(validarRecurrencia({ tipo: 'quincenal', primera: f(0, 4, 10) })).toEqual(['El año debe ser 1 o más'])
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 2, diaMes: 1, primera: f(1640, 13, 1) })).toEqual([
      'El mes debe estar entre 1 y 12',
    ])
    expect(validarRecurrencia({ tipo: 'trimestral', diaMes: 29, primera: f(1641, 2, 29) })).toEqual([
      'Febrero de 1641 tiene 28 días',
    ])
    expect(validarRecurrencia({ tipo: 'unica', fecha: f(1641, 2, 29) })).toEqual(['Febrero de 1641 tiene 28 días'])
  })

  it('cada N meses y trimestral: la primera vez cae en el día del mes elegido o, si el mes no lo tiene, en el último', () => {
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 2, diaMes: 31, primera: f(1640, 4, 30) })).toEqual([])
    expect(validarRecurrencia({ tipo: 'trimestral', diaMes: 30, primera: f(1641, 2, 28) })).toEqual([])
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 2, diaMes: 15, primera: f(1640, 4, 12) })).toEqual([
      'La primera vez debe caer el día 15 del mes',
    ])
    expect(validarRecurrencia({ tipo: 'trimestral', diaMes: 28, primera: f(1641, 2, 27) })).toEqual([
      'La primera vez debe caer el día 28 del mes',
    ])
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 2, diaMes: 29, primera: f(1641, 2, 27) })).toEqual([
      'La primera vez debe caer el día 29 del mes o, si no lo tiene, el último',
    ])
    expect(validarRecurrencia({ tipo: 'trimestral', diaMes: 31, primera: f(1640, 4, 29) })).toEqual([
      'La primera vez debe caer el día 31 del mes o, si no lo tiene, el último',
    ])
  })

  it('da todos los errores en el orden de los campos', () => {
    expect(validarRecurrencia({ tipo: 'cadaNMeses', n: 1, diaMes: 0, primera: f(1640, 4, 31) })).toEqual([
      'N debe ser un número entero de 2 a 12',
      'El día del mes debe estar entre 1 y 31',
      'Abril de 1640 tiene 30 días',
    ])
    expect(validarRecurrencia({ tipo: 'cadaNDias', n: 0, primera: f(0, 1, 1) })).toEqual([
      'N debe ser un número entero de 2 a 366',
      'El año debe ser 1 o más',
    ])
    expect(validarRecurrencia({ tipo: 'anual', mes: 13, diaMes: 0 })).toEqual([
      'El mes debe estar entre 1 y 12',
      'El día del mes debe estar entre 1 y 31',
    ])
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/calendario/recurrencia.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./recurrencia`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/calendario/recurrencia.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/calendario/recurrencia.test.ts [ src/dominio/calendario/recurrencia.test.ts ]
Error: Cannot find module './recurrencia' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/calendario/recurrencia.test.ts
 ❯ src/dominio/calendario/recurrencia.test.ts:3:1
      1| import { describe, it, expect } from 'vitest'
      2| import { aNumeroDeDia, desdeNumeroDeDia, diaEnMes, diasEntre, sumarDia…
      3| import {
       | ^
      4|   anteriorOcurrencia,
      5|   ocurreEl,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Implementar `recurrencia.ts`**

Crea `src/dominio/calendario/recurrencia.ts` con este contenido:

```ts
import { aNumeroDeDia, compararFechas, desdeNumeroDeDia, diaEnMes, sumarDias, validarFecha, type Fecha } from './fecha'

/** Frecuencia de un pago, un cobro o una producción (§4). diaSemana: 0 = lunes … 6 = domingo. */
export type Recurrencia =
  | { tipo: 'diaria' }
  | { tipo: 'cadaNDias'; n: number; primera: Fecha }
  | { tipo: 'semanal'; diaSemana: number } // 0 = lunes
  | { tipo: 'quincenal'; primera: Fecha } // cada 14 días
  | { tipo: 'mensual'; diaMes: number } // 1–31; último día si no existe
  | { tipo: 'cadaNMeses'; n: number; diaMes: number; primera: Fecha }
  | { tipo: 'trimestral'; diaMes: number; primera: Fecha }
  | { tipo: 'anual'; mes: number; diaMes: number }
  | { tipo: 'unica'; fecha: Fecha }

/**
 * Las nueve frecuencias reducidas a tres cálculos, sin mirar la primera vez (eso lo hace primeraVez):
 * - dias: ocurre cada `cada` días; `inicial` es el número de día de una ocurrencia, real o teórica;
 * - meses: ocurre cada `cada` meses, el día `diaMes` o el último del mes; `inicial` es el índice de mes de una ocurrencia;
 * - unica: solo en `fecha`.
 */
type Patron =
  | { clase: 'dias'; cada: number; inicial: number }
  | { clase: 'meses'; cada: number; inicial: number; diaMes: number }
  | { clase: 'unica'; fecha: Fecha }

/** El número de día 0, el 1 de enero de 1970, fue jueves: el 3 en diaDeLaSemana. */
const DIA_SEMANA_DEL_DIA_0 = 3

/** Resto de 0 a divisor − 1, también con dividendos negativos (en JavaScript, −3 % 7 da −3). */
function modulo(dividendo: number, divisor: number): number {
  return ((dividendo % divisor) + divisor) % divisor
}

/** Meses contados desde enero del año 0: anio × 12 + mes − 1. */
function indiceDeMes(f: Fecha): number {
  return f.anio * 12 + f.mes - 1
}

/** El día diaMes del mes con ese índice, o el último día si el mes no lo tiene. */
function fechaDelMes(indice: number, diaMes: number): Fecha {
  const anio = Math.floor(indice / 12)
  return diaEnMes(anio, indice - anio * 12 + 1, diaMes)
}

function patron(r: Recurrencia): Patron {
  switch (r.tipo) {
    case 'diaria':
      return { clase: 'dias', cada: 1, inicial: 0 }
    case 'cadaNDias':
      return { clase: 'dias', cada: r.n, inicial: aNumeroDeDia(r.primera) }
    case 'semanal':
      // El día número diaSemana − 3 cae en ese día de la semana, porque el día 0 fue jueves (3).
      return { clase: 'dias', cada: 7, inicial: r.diaSemana - DIA_SEMANA_DEL_DIA_0 }
    case 'quincenal':
      return { clase: 'dias', cada: 14, inicial: aNumeroDeDia(r.primera) }
    case 'mensual':
      return { clase: 'meses', cada: 1, inicial: 0, diaMes: r.diaMes }
    case 'cadaNMeses':
      return { clase: 'meses', cada: r.n, inicial: indiceDeMes(r.primera), diaMes: r.diaMes }
    case 'trimestral':
      return { clase: 'meses', cada: 3, inicial: indiceDeMes(r.primera), diaMes: r.diaMes }
    case 'anual':
      // El mes elegido del año 0, y de ahí cada 12 meses.
      return { clase: 'meses', cada: 12, inicial: r.mes - 1, diaMes: r.diaMes }
    case 'unica':
      return { clase: 'unica', fecha: r.fecha }
  }
}

/** La primera vez de cadaNDias, quincenal, cadaNMeses y trimestral; null en los tipos que no la tienen. */
function primeraVez(r: Recurrencia): Fecha | null {
  return 'primera' in r ? r.primera : null
}

/**
 * true si la recurrencia ocurre el día f; nunca antes de la primera vez (§6.4 y §6.5).
 * Supone una recurrencia válida (validarRecurrencia sin errores).
 */
export function ocurreEl(r: Recurrencia, f: Fecha): boolean {
  const primera = primeraVez(r)
  if (primera !== null && compararFechas(f, primera) < 0) {
    return false
  }
  const p = patron(r)
  switch (p.clase) {
    case 'dias':
      return modulo(aNumeroDeDia(f) - p.inicial, p.cada) === 0
    case 'meses': {
      const indice = indiceDeMes(f)
      return modulo(indice - p.inicial, p.cada) === 0 && compararFechas(f, fechaDelMes(indice, p.diaMes)) === 0
    }
    case 'unica':
      return compararFechas(f, p.fecha) === 0
  }
}

/** Primera ocurrencia estrictamente posterior a `despuesDe`, o null (única ya pasada). Antes de `primera`, `primera`. */
export function siguienteOcurrencia(r: Recurrencia, despuesDe: Fecha): Fecha | null {
  const primera = primeraVez(r)
  if (primera !== null && compararFechas(despuesDe, primera) < 0) {
    // Nada antes de la primera vez, que es una ocurrencia: validarRecurrencia comprueba que cae en el día del mes.
    return { ...primera }
  }
  const p = patron(r)
  switch (p.clase) {
    case 'dias': {
      const numero = aNumeroDeDia(despuesDe)
      // Lo que falta para completar el periodo en curso; si despuesDe es ocurrencia, un periodo entero.
      return desdeNumeroDeDia(numero + p.cada - modulo(numero - p.inicial, p.cada))
    }
    case 'meses': {
      const indice = indiceDeMes(despuesDe)
      // Último mes del periodo que no es posterior al mes de despuesDe.
      const mes = indice - modulo(indice - p.inicial, p.cada)
      const candidata = fechaDelMes(mes, p.diaMes)
      return compararFechas(candidata, despuesDe) > 0 ? candidata : fechaDelMes(mes + p.cada, p.diaMes)
    }
    case 'unica':
      return compararFechas(p.fecha, despuesDe) > 0 ? { ...p.fecha } : null
  }
}

/** Ocurrencias con desde ≤ fecha ≤ hasta, en orden; ninguna anterior a `primera`. */
export function ocurrenciasEntre(r: Recurrencia, desde: Fecha, hasta: Fecha): Fecha[] {
  const fechas: Fecha[] = []
  // Empezar en la víspera de desde incluye desde si es ocurrencia.
  let fecha = siguienteOcurrencia(r, sumarDias(desde, -1))
  while (fecha !== null && compararFechas(fecha, hasta) <= 0) {
    fechas.push(fecha)
    fecha = siguienteOcurrencia(r, fecha)
  }
  return fechas
}

/**
 * Ocurrencia teórica estrictamente anterior a `antesDe` (puede ser anterior a `primera`, contando hacia atrás: la primera
 * vez menos uno o más periodos, §6.4 y §6.5). null solo con 'unica', si su fecha no es anterior. Sirve para los periodos
 * de producción (§7).
 */
export function anteriorOcurrencia(r: Recurrencia, antesDe: Fecha): Fecha | null {
  const p = patron(r)
  switch (p.clase) {
    case 'dias': {
      // La víspera, o la ocurrencia más reciente antes de ella.
      const vispera = aNumeroDeDia(antesDe) - 1
      return desdeNumeroDeDia(vispera - modulo(vispera - p.inicial, p.cada))
    }
    case 'meses': {
      const indice = indiceDeMes(antesDe)
      const mes = indice - modulo(indice - p.inicial, p.cada)
      const candidata = fechaDelMes(mes, p.diaMes)
      return compararFechas(candidata, antesDe) < 0 ? candidata : fechaDelMes(mes - p.cada, p.diaMes)
    }
    case 'unica':
      return compararFechas(p.fecha, antesDe) < 0 ? { ...p.fecha } : null
  }
}

function esEnteroEntre(valor: number, minimo: number, maximo: number): boolean {
  return Number.isInteger(valor) && valor >= minimo && valor <= maximo
}

function errorDiaMes(diaMes: number): string | null {
  return esEnteroEntre(diaMes, 1, 31) ? null : 'El día del mes debe estar entre 1 y 31'
}

/** Día del mes, primera vez y, si los dos son válidos, que la primera vez caiga en ese día (o el último del mes). */
function erroresDiaMesYPrimera(diaMes: number, primera: Fecha): (string | null)[] {
  const errorDia = errorDiaMes(diaMes)
  const errorPrimera = validarFecha(primera)
  if (errorDia !== null || errorPrimera !== null) {
    return [errorDia, errorPrimera]
  }
  if (primera.dia === diaEnMes(primera.anio, primera.mes, diaMes).dia) {
    return []
  }
  // Todos los meses tienen 28 días; del 29 al 31, algún mes usa el último día.
  return [
    diaMes > 28
      ? `La primera vez debe caer el día ${diaMes} del mes o, si no lo tiene, el último`
      : `La primera vez debe caer el día ${diaMes} del mes`,
  ]
}

/**
 * Errores: n entero ≥ 2 (cadaNDias ≤ 366, cadaNMeses ≤ 12), diaMes 1–31, diaSemana 0–6, mes 1–12, fechas válidas y,
 * en cadaNMeses y trimestral, la primera vez en el día del mes elegido. Lista vacía si todo es válido.
 */
export function validarRecurrencia(r: Recurrencia): string[] {
  let errores: (string | null)[]
  switch (r.tipo) {
    case 'diaria':
      errores = []
      break
    case 'cadaNDias':
      errores = [esEnteroEntre(r.n, 2, 366) ? null : 'N debe ser un número entero de 2 a 366', validarFecha(r.primera)]
      break
    case 'semanal':
      errores = [esEnteroEntre(r.diaSemana, 0, 6) ? null : 'El día de la semana debe estar entre lunes y domingo']
      break
    case 'quincenal':
      errores = [validarFecha(r.primera)]
      break
    case 'mensual':
      errores = [errorDiaMes(r.diaMes)]
      break
    case 'cadaNMeses':
      errores = [
        esEnteroEntre(r.n, 2, 12) ? null : 'N debe ser un número entero de 2 a 12',
        ...erroresDiaMesYPrimera(r.diaMes, r.primera),
      ]
      break
    case 'trimestral':
      errores = erroresDiaMesYPrimera(r.diaMes, r.primera)
      break
    case 'anual':
      errores = [esEnteroEntre(r.mes, 1, 12) ? null : 'El mes debe estar entre 1 y 12', errorDiaMes(r.diaMes)]
      break
    case 'unica':
      errores = [validarFecha(r.fecha)]
      break
  }
  return errores.filter((error): error is string => error !== null)
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/calendario/recurrencia.test.ts
```

Salida esperada (la hora y la duración varían; `it.each` cuenta como una prueba por cada recurrencia del bloque de coherencia):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  52 passed (52)
```

Para ver cada prueba por su nombre, añade `--reporter=verbose` al comando. Las de coherencia salen como `✓ src/dominio/calendario/recurrencia.test.ts > coherencia de las cuatro funciones, día a día de 1639 a 1642 > trimestral día 31` y parecidas, seguidas de la duración.

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

Vitest quita los tipos sin comprobarlos; `tsc -b` los comprueba en modo estricto, también en la prueba.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con (las 146 pruebas de las tareas 1 a 6 y las 52 nuevas):

```text
 Test Files  7 passed (7)
      Tests  198 passed (198)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/calendario/recurrencia.ts src/dominio/calendario/recurrencia.test.ts
git commit -m "feat(calendario): recurrencias con siguiente y anterior ocurrencia, ocurrencias entre fechas y validación" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada. El identificador del commit varía. Con `core.autocrlf=true`, lo normal en Git para Windows, Git avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/calendario/recurrencia.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/calendario/recurrencia.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 08e00be] feat(calendario): recurrencias con siguiente y anterior ocurrencia, ocurrencias entre fechas y validación
 2 files changed, 696 insertions(+)
 create mode 100644 src/dominio/calendario/recurrencia.test.ts
 create mode 100644 src/dominio/calendario/recurrencia.ts
```

### Tarea 8: Prorrateo a 30 días (`prorrateo.ts`)

Las pantallas comparan reglas con frecuencias distintas (un peaje diario, unos salarios semanales, un diezmo mensual) pasándolas todas a lo que suponen en un mes. Esta tarea calcula ese factor y el importe equivalente al mes, y cierra el núcleo de valores con el balance mensual de Bree, el asentamiento del ejemplo. Depende de las tareas 3 (`redondearMitadArriba`), 4 (`formatearOroProrrateado`, en la prueba) y 7 (`Recurrencia`).

**Reglas de la especificación que implementa:**

- **Prorrateo a 30 días (§3, «Prorrateo a 30 días»).** El equivalente mensual (A3, y «Coste al mes» en A5 y A6) y el balance mensual (A1 e Inicio) pasan cada regla a un mes de 30 días con un factor fijo:

  | Frecuencia | Factor |
  |---|---|
  | Cada día | ×30 |
  | Cada N días | ×30/N |
  | Semanal | ×30/7 |
  | Cada dos semanas | ×30/14 |
  | Mensual | ×1 |
  | Cada N meses | ×1/N |
  | Trimestral | ×1/3 |
  | Anual | ×1/12 |
  | Una sola vez | No cuenta |

  El mes es siempre de 30 días, no el mes del calendario: así la cifra no cambia de febrero a marzo. El factor no depende del día de la semana, del día del mes ni de la primera vez. «Una sola vez» no se repite y no suma al mes.
- **Redondeo al mh (§3, «Redondeo»).** Los prorrateos se calculan en mh, con las mitades hacia arriba, como todo el dinero. Cada regla se prorratea y se redondea por separado, y los balances suman esos enteros: 3 mo semanales son 1285714,2857… mh → 1285714 mh.
- **Sin coma flotante (§3, «Cálculo»).** `factorMensual` devuelve un `number` para quien necesite el factor, pero `alMes` no multiplica por él. En coma flotante, 11 mh cada 44 días dan 11 × (30 / 44) = 7,499999999999999 y se redondearían a 7, cuando son 7,5 exactos, que suben a 8. Y base × 30 puede pasar de `Number.MAX_SAFE_INTEGER`. Por eso `alMes` multiplica y divide con `BigInt` la fracción exacta del factor (30/7, 1/3…). Solo pasa a coma flotante la fracción que sobra de la división, un número entre −1 y 1, para que `redondearMitadArriba` (tarea 3) decida si suma o resta 1 mh. Las mitades (±0,5) son exactas en coma flotante, y con denominadores de hasta 366 ninguna otra fracción queda a menos de 1/732 de ellas.
- **Balance mensual de un asentamiento (§7, «Balance mensual», y §6.3, A1 y A3).** Balance = ingresos recurrentes (también los impuestos de locales, con la producción habitual) − gastos recurrentes (salarios, soldadas y tributos), prorrateados a 30 días y mostrados con 1 decimal. No incluye comercio ni movimientos manuales. En Bree:
  - Ingresos: impuesto por hogar 12,4 mo mensual, aranceles 3 mo semanales, alquiler del molino 5 mo mensual y peaje 0,3 mo diario, que suman 3925714 mh. Más los impuestos de los cuatro locales comerciales, que con la producción habitual pagan 1 + 3,2 + 0,3 + 0,2 = 4,7 mo el día 1 de cada mes (A3b). Total: 4395714 mh, «+44 mo».
  - Gastos: salarios 4,2 mo semanales (A5), soldada 5,8 mo cada dos semanas (A6) y el diezmo, un tributo de 25 mo mensual (A3). Total: 5542857 mh, «55,4 mo».
  - Balance: 4395714 − 5542857 = −1147143 mh, «−11,5 mo». A1 lo muestra con «entran 44 · salen 55,4».
  - En A3: «+44 mo al mes» en Ingresos, «−25 mo al mes» en Tributos y «Resultado fiscal: +19 mo al mes» (ingresos menos tributos).

  Calcular el impuesto de cada local (el mayor entre el porcentaje de lo producido y el mínimo) es trabajo del motor, en la fase 3. Aquí la prueba parte de esas cuatro cantidades.

`prorrateo.ts` vive en `src/dominio/dinero/` porque convierte importes. Importa el tipo `Recurrencia` del calendario, que no importa nada del dinero, así que no hay importaciones circulares.

**Archivos:**
- Crear: `src/dominio/dinero/prorrateo.ts`
- Prueba: `src/dominio/dinero/prorrateo.test.ts`

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

- [ ] **Paso 1: Escribir la prueba que falla**

Qué comprueba cada bloque:
- `factorMensual`: la tabla de §3 entera y que el factor no depende del día elegido ni de la primera vez.
- `alMes`: cada regla del ejemplo de Bree con su cifra en mh y, en dos de ellas, su presentación; los tipos por meses y «una sola vez»; el redondeo de las mitades, también en negativo y sin `−0`; y los dos casos en que la coma flotante da un mh de menos o de más.
- Balance mensual de Bree: la suma completa del ejemplo, con las cifras que muestran A1 y A3.

Crea `src/dominio/dinero/prorrateo.test.ts` con este contenido:

```ts
import { describe, it, expect } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import type { Recurrencia } from '../calendario/recurrencia'
import { formatearOroProrrateado } from './formato'
import { aBase } from './importe'
import { EQUIVALENCIAS_POR_DEFECTO } from './monedas'
import { alMes, factorMensual } from './prorrateo'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** Oro tecleado → hierro: mo('4,2') = 420000 mh. */
function mo(cantidad: string): number {
  return aBase(cantidad, 'mo', EQ)
}

/** Fecha para las recurrencias que piden primera vez: el prorrateo no depende de ella. */
const PRIMERA: Fecha = { anio: 1640, mes: 4, dia: 13 }

// Frecuencias de las reglas de Bree. El día elegido no cambia el prorrateo: se usa el viernes de los salarios (A5)
// y el día 1 de los impuestos de locales (A3b).
const CADA_DIA: Recurrencia = { tipo: 'diaria' }
const SEMANAL: Recurrencia = { tipo: 'semanal', diaSemana: 4 }
const CADA_DOS_SEMANAS: Recurrencia = { tipo: 'quincenal', primera: PRIMERA }
const MENSUAL: Recurrencia = { tipo: 'mensual', diaMes: 1 }

describe('factorMensual', () => {
  it('pasa cada frecuencia a 30 días con la tabla de la especificación (§3)', () => {
    expect(factorMensual({ tipo: 'diaria' })).toBe(30)
    expect(factorMensual({ tipo: 'cadaNDias', n: 10, primera: PRIMERA })).toBe(3)
    expect(factorMensual({ tipo: 'cadaNDias', n: 45, primera: PRIMERA })).toBe(30 / 45)
    expect(factorMensual({ tipo: 'semanal', diaSemana: 4 })).toBe(30 / 7)
    expect(factorMensual({ tipo: 'quincenal', primera: PRIMERA })).toBe(30 / 14)
    expect(factorMensual({ tipo: 'mensual', diaMes: 1 })).toBe(1)
    expect(factorMensual({ tipo: 'cadaNMeses', n: 2, diaMes: 13, primera: PRIMERA })).toBe(1 / 2)
    expect(factorMensual({ tipo: 'trimestral', diaMes: 13, primera: PRIMERA })).toBe(1 / 3)
    expect(factorMensual({ tipo: 'anual', mes: 4, diaMes: 13 })).toBe(1 / 12)
    expect(factorMensual({ tipo: 'unica', fecha: PRIMERA })).toBe(0)
  })

  it('no depende del día elegido ni de la primera vez', () => {
    expect(factorMensual({ tipo: 'semanal', diaSemana: 0 })).toBe(30 / 7)
    expect(factorMensual({ tipo: 'mensual', diaMes: 31 })).toBe(1)
    expect(factorMensual({ tipo: 'quincenal', primera: { anio: 1, mes: 1, dia: 1 } })).toBe(30 / 14)
  })
})

describe('alMes', () => {
  it('aranceles de Bree: 3 mo cada semana = 1285714 mh al mes, «+12,9 mo»', () => {
    const aranceles = alMes(mo('3'), SEMANAL)
    expect(aranceles).toBe(1285714)
    expect(formatearOroProrrateado(aranceles, EQ, { signo: true })).toBe('+12,9 mo')
  })

  it('salarios de Bree: 4,2 mo cada semana = 1800000 mh al mes, «18 mo»', () => {
    const salarios = alMes(mo('4,2'), SEMANAL)
    expect(salarios).toBe(1800000)
    expect(formatearOroProrrateado(salarios, EQ)).toBe('18 mo')
  })

  it('soldada de Bree: 5,8 mo cada dos semanas = 1242857 mh al mes', () => {
    expect(alMes(mo('5,8'), CADA_DOS_SEMANAS)).toBe(1242857)
  })

  it('peaje de Bree: 0,3 mo cada día = 900000 mh al mes', () => {
    expect(alMes(mo('0,3'), CADA_DIA)).toBe(900000)
  })

  it('mensual: el mismo importe (impuesto por hogar, alquiler del molino y diezmo de Bree)', () => {
    expect(alMes(mo('12,4'), MENSUAL)).toBe(1240000)
    expect(alMes(mo('5'), MENSUAL)).toBe(500000)
    expect(alMes(mo('25'), MENSUAL)).toBe(2500000)
  })

  it('cada N días, cada N meses, trimestral y anual', () => {
    expect(alMes(mo('2'), { tipo: 'cadaNDias', n: 10, primera: PRIMERA })).toBe(600000)
    expect(alMes(mo('12'), { tipo: 'cadaNMeses', n: 2, diaMes: 13, primera: PRIMERA })).toBe(600000)
    expect(alMes(mo('10'), { tipo: 'trimestral', diaMes: 13, primera: PRIMERA })).toBe(333333)
    expect(alMes(mo('1'), { tipo: 'anual', mes: 4, diaMes: 13 })).toBe(8333)
  })

  it('una sola vez no cuenta: 0', () => {
    expect(alMes(mo('100'), { tipo: 'unica', fecha: PRIMERA })).toBe(0)
  })

  it('redondea al mh con las mitades hacia arriba, también en negativo, y sin −0', () => {
    // 1 mh cada 4 días = 7,5 mh al mes; 18 mh al año = 1,5 mh al mes.
    expect(alMes(1, { tipo: 'cadaNDias', n: 4, primera: PRIMERA })).toBe(8)
    expect(alMes(-1, { tipo: 'cadaNDias', n: 4, primera: PRIMERA })).toBe(-7)
    expect(alMes(18, { tipo: 'anual', mes: 4, diaMes: 13 })).toBe(2)
    expect(alMes(-18, { tipo: 'anual', mes: 4, diaMes: 13 })).toBe(-1)
    // 6 mh cada semana = 25,714… mh al mes.
    expect(alMes(6, SEMANAL)).toBe(26)
    expect(alMes(-6, SEMANAL)).toBe(-26)
    expect(alMes(-mo('3'), SEMANAL)).toBe(-1285714)
    // −1 mh al año = −0,083 mh al mes → 0, y no −0 (toBe distingue 0 de −0).
    expect(alMes(-1, { tipo: 'anual', mes: 4, diaMes: 13 })).toBe(0)
  })

  it('es exacto donde la coma flotante falla', () => {
    // 11 mh cada 44 días = 7,5 mh al mes, pero en coma flotante 11 × (30 / 44) queda por debajo de 7,5.
    expect(11 * (30 / 44)).toBe(7.499999999999999)
    expect(alMes(11, { tipo: 'cadaNDias', n: 44, primera: PRIMERA })).toBe(8)
    // El mayor entero seguro × 30 pasa de Number.MAX_SAFE_INTEGER, y la coma flotante sube 1 mh.
    expect(Math.round((Number.MAX_SAFE_INTEGER * 30) / 90)).toBe(3002399751580331)
    expect(alMes(Number.MAX_SAFE_INTEGER, { tipo: 'cadaNDias', n: 90, primera: PRIMERA })).toBe(3002399751580330)
  })
})

describe('balance mensual de Bree (§7)', () => {
  it('entran 44 · salen 55,4 → balance −11,5 mo', () => {
    // Ingresos recurrentes (A3): impuesto por hogar, aranceles, alquiler del molino y peaje.
    const impuestoPorHogar = alMes(mo('12,4'), MENSUAL)
    const aranceles = alMes(mo('3'), SEMANAL)
    const alquilerDelMolino = alMes(mo('5'), MENSUAL)
    const peaje = alMes(mo('0,3'), CADA_DIA)
    expect([impuestoPorHogar, aranceles, alquilerDelMolino, peaje]).toEqual([1240000, 1285714, 500000, 900000])
    const ingresosSinLocales = impuestoPorHogar + aranceles + alquilerDelMolino + peaje
    expect(ingresosSinLocales).toBe(3925714)

    // Impuestos de los cuatro locales con la producción habitual (A3b): 1 + 3,2 + 0,3 + 0,2 mo el día 1 de cada mes.
    const locales = alMes(mo('1') + mo('3,2') + mo('0,3') + mo('0,2'), MENSUAL)
    expect(locales).toBe(470000)
    const ingresos = ingresosSinLocales + locales
    expect(ingresos).toBe(4395714)

    // Gastos recurrentes: salarios (A5), soldada (A6) y el diezmo, que es un tributo (A3).
    const salarios = alMes(mo('4,2'), SEMANAL)
    const soldada = alMes(mo('5,8'), CADA_DOS_SEMANAS)
    const diezmo = alMes(mo('25'), MENSUAL)
    expect([salarios, soldada, diezmo]).toEqual([1800000, 1242857, 2500000])
    const gastos = salarios + soldada + diezmo
    expect(gastos).toBe(5542857)

    const balance = ingresos - gastos
    expect(balance).toBe(-1147143)

    // A1: balance «−11,5 mo», con «entran 44 · salen 55,4».
    expect(formatearOroProrrateado(ingresos, EQ, { signo: true })).toBe('+44 mo')
    expect(formatearOroProrrateado(gastos, EQ)).toBe('55,4 mo')
    expect(formatearOroProrrateado(balance, EQ, { signo: true })).toBe('−11,5 mo')

    // A3: «−25 mo al mes» en Tributos y «Resultado fiscal: +19 mo al mes» (ingresos menos tributos).
    expect(formatearOroProrrateado(-diezmo, EQ, { signo: true })).toBe('−25 mo')
    expect(formatearOroProrrateado(ingresos - diezmo, EQ, { signo: true })).toBe('+19 mo')
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/dinero/prorrateo.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./prorrateo`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/dinero/prorrateo.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/dinero/prorrateo.test.ts [ src/dominio/dinero/prorrateo.test.ts ]
Error: Cannot find module './prorrateo' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/dinero/prorrateo.test.ts
 ❯ src/dominio/dinero/prorrateo.test.ts:7:1
      5| import { aBase } from './importe'
      6| import { EQUIVALENCIAS_POR_DEFECTO } from './monedas'
      7| import { alMes, factorMensual } from './prorrateo'
       | ^
      8|
      9| const EQ = EQUIVALENCIAS_POR_DEFECTO

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Implementar `prorrateo.ts`**

Crea `src/dominio/dinero/prorrateo.ts` con este contenido:

```ts
import type { Recurrencia } from '../calendario/recurrencia'
import { redondearMitadArriba } from './importe'

/** Factor mensual de §3 como fracción exacta de enteros: numerador ÷ denominador. */
function fraccionMensual(r: Recurrencia): { numerador: number; denominador: number } {
  switch (r.tipo) {
    case 'diaria':
      return { numerador: 30, denominador: 1 }
    case 'cadaNDias':
      return { numerador: 30, denominador: r.n }
    case 'semanal':
      return { numerador: 30, denominador: 7 }
    case 'quincenal':
      return { numerador: 30, denominador: 14 }
    case 'mensual':
      return { numerador: 1, denominador: 1 }
    case 'cadaNMeses':
      return { numerador: 1, denominador: r.n }
    case 'trimestral':
      return { numerador: 1, denominador: 3 }
    case 'anual':
      return { numerador: 1, denominador: 12 }
    case 'unica':
      return { numerador: 0, denominador: 1 }
  }
}

/** Factor para pasar a 30 días (§3): diaria 30; cadaNDias 30/n; semanal 30/7; quincenal 30/14; mensual 1; cadaNMeses 1/n; trimestral 1/3; anual 1/12; unica 0. */
export function factorMensual(r: Recurrencia): number {
  const { numerador, denominador } = fraccionMensual(r)
  return numerador / denominador
}

/**
 * Importe equivalente al mes, en mh, redondeado con redondearMitadArriba: base × factor. Multiplica y divide con
 * BigInt la fracción exacta del factor, sin coma flotante. Supone una recurrencia válida (validarRecurrencia).
 */
export function alMes(base: number, r: Recurrencia): number {
  const { numerador, denominador } = fraccionMensual(r)
  const producto = BigInt(base) * BigInt(numerador)
  const divisor = BigInt(denominador)
  // La división de BigInt corta hacia 0, y el resto lleva el signo del producto: −30 ÷ 4 da −7 y resto −2.
  const entero = producto / divisor
  const resto = producto % divisor
  // resto ÷ denominador está entre −1 y 1, y redondearMitadArriba lo deja en −1, 0 o 1: −2 ÷ 4 = −0,5 → 0, así que
  // −7,5 → −7. Las mitades son exactas en coma flotante.
  return Number(entero) + redondearMitadArriba(Number(resto) / denominador)
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/dinero/prorrateo.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  12 passed (12)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con:

```text
 Test Files  8 passed (8)
      Tests  210 passed (210)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/dinero/prorrateo.ts src/dominio/dinero/prorrateo.test.ts
git commit -m "feat(dinero): prorrateo a 30 días y balance mensual de Bree" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía; los avisos de CRLF son inofensivos, como en la tarea 7). `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/dinero/prorrateo.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/dinero/prorrateo.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 7270acf] feat(dinero): prorrateo a 30 días y balance mensual de Bree
 2 files changed, 194 insertions(+)
 create mode 100644 src/dominio/dinero/prorrateo.test.ts
 create mode 100644 src/dominio/dinero/prorrateo.ts
```

### Tarea 9: Cierre de la fase 1

Comprueba el entregable de la fase 1: todas las pruebas del núcleo de valores en verde, la app compilando sin errores y cada tarea confirmada en Git. No escribe código.

**Archivos:** ninguno. Esta tarea solo ejecuta comprobaciones.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

- [ ] **Paso 1: Ejecutar todas las pruebas**

```bash
npm test
```

Salida esperada (la hora y la duración varían):

```text
> gestion-aldeas@0.0.0 test
> vitest run


 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  8 passed (8)
      Tests  210 passed (210)
```

Las 210 pruebas se reparten así (con `npx vitest run --reporter=verbose` sale una línea `✓` por prueba):

| Archivo de prueba | Tarea | Pruebas |
|---|---|---|
| `src/dominio/humo.test.ts` | 1 | 3 |
| `src/dominio/dinero/monedas.test.ts` | 2 | 10 |
| `src/dominio/dinero/importe.test.ts` | 3 | 34 |
| `src/dominio/dinero/formato.test.ts` | 4 | 22 |
| `src/dominio/calendario/fecha.test.ts` | 5 | 58 |
| `src/dominio/calendario/formatoFecha.test.ts` | 6 | 19 |
| `src/dominio/calendario/recurrencia.test.ts` | 7 | 52 |
| `src/dominio/dinero/prorrateo.test.ts` | 8 | 12 |
| **Total** | | **210** |

- [ ] **Paso 2: Compilar la app**

`npm run build` comprueba antes los tipos de todo `src/` con `tsc -b`, también los de las pruebas, y después empaqueta la app.

```bash
npm run build
```

Salida esperada (el tiempo y el nombre del `.js` pueden variar). Son los mismos 15 módulos de la tarea 1, porque la app todavía no importa el dominio; las pantallas lo usarán a partir de la fase 6:

```text
> gestion-aldeas@0.0.0 build
> tsc -b && vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 15 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.32 kB │ gzip:  0.24 kB
dist/assets/index-Rsx7aO-5.js  219.63 kB │ gzip: 68.60 kB

✓ built in 204ms
```

- [ ] **Paso 3: Comprobar que no queda nada pendiente de commit**

Cada tarea de la fase 1 termina con su commit, así que el árbol debe estar limpio y el historial debe tener un commit por tarea.

```bash
git status --short
git log --oneline -8
```

Salida esperada: `git status --short` no escribe nada (`dist/` y `node_modules/` están en `.gitignore`), y `git log` muestra los ocho commits de la fase, del más reciente al más antiguo (los identificadores varían):

```text
7270acf feat(dinero): prorrateo a 30 días y balance mensual de Bree
08e00be feat(calendario): recurrencias con siguiente y anterior ocurrencia, ocurrencias entre fechas y validación
efcbae6 feat(calendario): formato de fechas con día de la semana y abreviatura de la Edad
77efa86 feat(calendario): fechas gregorianas con bisiestos, validación, número de día y suma de días y meses
b66cf3c feat(dinero): formato de importes en oro, de lo introducido y de números
0ccbd12 feat(dinero): convertir lo tecleado a hierro, redondear al mh y calcular porcentajes
7473e7b feat(dinero): monedas, equivalencias y valor de cada moneda en hierro
a60f941 chore: crear el proyecto base con Vite, React, TypeScript estricto y Vitest
```

Con esa salida, la fase 1 está cerrada y no hace falta ningún commit más. Si `git status --short` lista algún archivo, es que se saltó el último paso de la tarea que lo crea (la tabla del paso 1 dice qué tarea crea cada prueba, y cada archivo de código va con su prueba). Vuelve a ese paso, ejecuta su `git add` y su `git commit` tal como están escritos, y repite este paso.
