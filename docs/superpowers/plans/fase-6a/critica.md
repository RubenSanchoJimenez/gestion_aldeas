# Fase 6a · Crítica de completitud de los informes

**Qué se ha leído, entero**: `sistema-visual.md` (376 líneas), `componentes.md` (1.088) y `tecnica.md` (258). El encargo nombra un `test.md` que **no existe** en `scratchpad/fase-6a/`; el cuarto informe de la carpeta es `pantallas-y-datos.md` (635), y es el que se ha leído en su lugar. **No hay ningún informe de pruebas**: el entorno lo trata `tecnica.md` §3, pero nadie propone qué se prueba (se suple en el §7 de este documento).

**Contra qué se ha comprobado**:
- Especificación `docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md` (se cita «espec. L…»).
- Hoja de ruta `docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md` (Fase 6 L97-106, Fase 9 L124-133) y plan de la fase 3 (`2026-09-18-gestion-aldeas-fase-3.md`).
- Generador `design/build-artboards.mjs` (se cita «mjs L…»); las vistas `.dc.html` son su salida.
- Código en dos puntos: la rama en curso `implementacion/fase-3` (b9ceb30) y la rama de trabajo `diseno/especificacion-y-vistas` (3a77322), de la que partiría la 6a.
- `npm view` (vite-plugin-pwa 1.3.0 con *peer* `vite ^8.0.0`; `@testing-library/jest-dom` 7.0.1; `happy-dom` 20.14.5; `@fontsource/*` 5.3.0), unpkg (archivos `latin-*.css` de Fontsource y su `unicode-range`; `HTMLDialogElement` de happy-dom 20) y contrastes WCAG calculados con la fórmula de luminancia relativa.

No se ha tocado `C:/Proyectos/GA/gestion_aldeas`.

---

## 1. Lo más importante

1. **Nadie dice cómo llega la app a la tablet.** Un *service worker* solo se registra en contexto seguro (HTTPS o `localhost`). Abrir `npm run preview` desde la tablet por la IP de la red local (`http://192.168…`) no es contexto seguro: ni se instala ni funciona sin conexión. Además, IndexedDB va ligada al origen: si el jugador empieza a jugar en un origen y luego se cambia a otro, sus partidas se quedan atrás (solo se salvan exportando e importando). Hay que decidir el origen antes de la primera partida de verdad (duda D6a-01). Publicar en GitHub Pages es «publicar el proyecto fuera de su repositorio» y `CLAUDE.md` obliga a preguntar.
2. **Las fuentes no funcionarían sin conexión con la configuración que propone `tecnica.md`.** vite-plugin-pwa (`generateSW`) precachea por defecto solo `**/*.{js,css,html}`; los `.woff2` de Fontsource quedan fuera si no se amplía `workbox.globPatterns`. `tecnica.md` §2 dice que «no hace falta configurar nada en `vite.config.ts`»; `sistema-visual.md` §9.5 sí lo avisa. Lo mismo vale para los iconos y el manifiesto.
3. **J2d sí tiene vista propia**: `PersonajeEliminarMovimiento.dc.html` (espec. §12 L1434; mjs L1798-1813). `componentes.md` §8 afirma que la única captura es la variante P7b y reconstruye J2d quitándole campos. Hay que partir de la vista de J2d.
4. **La rama de la 6a no puede salir de `implementacion/fase-3`.** Varias funciones que citan los informes solo existen ahí (`normalizarCantidad`, `formatearDiaDelAvance`, `enumerar`), y esa rama está a medio hacer. La base correcta es `diseno/especificacion-y-vistas` (3a77322), y la 6a no debería tocar archivos que la fase 3 está cambiando (§5.3).
5. **`componentes.md` recomienda construir ya el alta rápida (J2e) y el teclado en pantalla**, pero la hoja de ruta los asigna a la fase 9: «altas desde los desplegables (§6.6…)» (plan L128) y «estados vacíos, cerrar con cambios sin guardar y teclado en pantalla (§6.4)» (plan L131). En la 6a basta el hueco.
6. **Ninguna función escribe las fechas como las enseñan las vistas de la 6a.** `formatearFecha(f, { edad, diaSemana: true })` da «domingo, 1 de enero de 1640 T.E.» (con coma y en minúscula). La vista P1 pide «domingo 1 de enero de 1640 T.E.» (mjs L348), la P6 «Jueves, 12 de abril de 1640 T.E.» (mjs L628) y la barra superior «Jueves» suelto (mjs L251). La fecha real «8 de septiembre de 2026» (P0 y P6) no la escribe nadie. Es justo el pendiente «Formas de fecha que aún no existen» de `docs/decisiones.md`.
7. **Sin inyectar la base de datos, el reloj y los ids, las pantallas no se pueden probar.** Las pruebas de `src/datos` usan `baseDePrueba()` sobre fake-indexeddb (`src/datos/pruebas/baseDePrueba.ts`). Si la interfaz crea `new BaseDeDatos()` por su cuenta, las pruebas de P0, P1b y P6 no pueden sustituirla. Ningún informe lo prevé.

---

## 2. Contradicciones entre informes y errores frente a las fuentes

| # | Qué dice el informe | Qué dicen las fuentes | Cómo queda |
|---|---|---|---|
| C1 | `componentes.md` §8: la única captura de J2d es `ListasEliminarCategoria` (P7b); «hay que restarle ese campo para obtener el J2d base». | J2d tiene artboard propio: `PersonajeEliminarMovimiento` (espec. §12 L1434; mjs L1798-1813). Diálogo de 620 px con `cabDialogo('¿Eliminar este movimiento?', …)`, `cajaResumen`, aviso oro con reloj de arena (opcional), casilla «Sé que esto no se puede deshacer», nota «El botón rojo no se activa hasta marcar la casilla.» y un pie con «Cancelar» (secundario) y «Eliminar definitivamente» (`peligroLleno`, icono x). | J2d se construye con esa vista. `campoReasignacion` y `notaSaldos` son de P7b y pasan a la fase 9. |
| C2 | `componentes.md` §5, «Cerrado»: el selector cerrado lleva «borde oro de 2 px» permanente. | El selector cerrado es `campo(…, { icono: 'abajo' })`, con borde de 1 px en `borde` (mjs L1586). El borde de 2 px oro solo aparece con el panel abierto (`selectorAbierto`, mjs L1396). Así lo lee `sistema-visual.md` §4.2: «oro · campo activo» (espec. L1390). | Cerrado: 1 px `borde`. Abierto: 2 px `oro` y la flecha en `oro-oscuro`. |
| C3 | `componentes.md` §1: en P0, «Nueva partida» es **principal**. | `btn('Nueva partida', { icono: 'mas' })` no lleva variante, así que usa la de por defecto, `secundario` (mjs L106 y L319). En P0 solo es principal «Continuar» (mjs L305). | «Nueva partida» es secundario. |
| C4 | `componentes.md` §6: una opción de segmentos inactiva va en peso 400. | Todas las opciones van en 600; la inactiva solo cambia el color a `tinta-suave` (mjs L1367). | Peso 600 en todas. |
| C5 | `componentes.md` se contradice: §4 dice que el selector de Moneda lleva buscador «solo si hace falta» y §5 que va «sin buscador visible». | El buscador está siempre arriba del panel; con 12 opciones o menos «se ve sin foco, y el teclado solo sale si se toca» (espec. L860). | Con 7 monedas y 12 meses, el buscador se ve pero sin foco. |
| C6 | `tecnica.md` §2 importa Cormorant Garamond en 500, 600, 700 y 500 cursiva. `sistema-visual.md` §9.4: solo 600 y 500 cursiva. | En el generador Cormorant aparece 20 veces en 600, una en 500 cursiva (entradilla de P0, mjs L314) y una en cursiva sin peso (A11b, mjs L1358, de la fase 8). No hay 500 ni 700 redondos. Source Sans 3 usa 400, 600 y 700 (el 700 solo en `resaltar`, mjs L1391), y Cinzel solo 600. | Vale `sistema-visual.md`. |
| C7 | `sistema-visual.md` §9.3: hace falta `latin-ext` para las tildes y la eñe. `tecnica.md` §2 importa `600.css`, que trae todos los subconjuntos. | El subconjunto `latin` de Fontsource cubre `U+0000-00FF` (tildes, ñ, ü, «») y además `U+2212`, el signo menos (comprobado en `@fontsource/source-sans-3@5.3.0/600.css`). Fontsource publica un CSS por subconjunto (`latin-600.css`, `latin-500-italic.css`…). | Basta `latin`: importar `@fontsource/<familia>/latin-<peso>.css`. Así el precaché no carga cirílico, griego ni vietnamita. |
| C8 | `tecnica.md` §2: Vite copia los `.woff2` y «no hace falta configurar nada en `vite.config.ts`». | Es verdad para el *build*, pero no para el uso sin conexión: `generateSW` precachea por defecto `**/*.{js,css,html}`. | `workbox.globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}']` (o equivalente). Vale `sistema-visual.md` §9.5. |
| C9 | `tecnica.md` D-T5: la espec. «no define [el emblema] como artboard ni da su forma exacta». | La forma exacta está en `emblema()` (mjs L76-77): una estrella de cuatro puntas con círculo central, en `oro`. Así lo recoge `sistema-visual.md` §5. | El icono de la PWA puede salir del emblema en vez de unas iniciales «GA» (duda D6a-03). |
| C10 | `tecnica.md` §5: la 6a «ni siquiera llega… al menú lateral con dominios». | El alcance de la 6a incluye el «menú lateral de §5». `sistema-visual.md` §10.2 y `pantallas-y-datos.md` §7.1 lo construyen entero. | El menú lateral es de la 6a, con sus dominios. |
| C11 | Nombres de las variables CSS: `--ga-papel` (`sistema-visual.md` §8), `--papel` y `--campo-fondo` (`componentes.md`), `--color-papel` (`tecnica.md` §6). | Nada en la espec.; §10 solo da los nombres de los tokens. | Hay que elegir uno (duda D6a-10). |
| C12 | Botón desactivado: opacidad 0,6 (`sistema-visual.md` duda 4) o «p. ej. 45 %» (`componentes.md` D-C1). | La única pieza desactivada del generador es la casilla, con `opacity: 0.6` (mjs L1372). | 0,6 (duda D6a-11). |
| C13 | Foco de teclado: 2 px en `oro` (`sistema-visual.md` duda 3); un anillo de 2 px en `tinta` solo en segmentos (`componentes.md` D-C5). | `oro` sobre `papel` da **2,94:1** y sobre `vitela` 3,32:1: sobre papel no llega al 3:1 que pide WCAG 1.4.11. `oro-oscuro` da 5,15:1 sobre papel y 5,82:1 sobre vitela. | Un anillo único en `oro-oscuro` (duda D6a-11). |
| C14 | `sistema-visual.md` §1: «oro-oscuro… contraste con `#FBF6E9` ≈ 8,4:1». | Da 5,82:1. Cumple el ≥ 4,5:1 de §10 (espec. L1390), pero la cifra está mal. | Dato corregido; no cambia nada. |
| C15 | `sistema-visual.md` §3: el borde de 2 px oro del selector abierto es «el único borde de 2px del sistema». | La casilla también lleva borde de 2 px (en `oro-oscuro`, `suave` o `borde`, mjs L1372). | Dato corregido. |
| C16 | La tabla de `sistema-visual.md` §2 asigna Source Sans 3 a las «etiquetas de grupo del selector» y da `letter-spacing: 0.1em` a todas las etiquetas de grupo. | Van en Cinzel (espec. L1394; mjs L1402). En el menú el espaciado es 0.1em (mjs L204) y en el panel del selector 0.08em (mjs L1402). | Cinzel en las dos, con su espaciado respectivo. |
| C17 | `pantallas-y-datos.md` §3.4 trata «Editar equivalencias» como un «sub-diálogo». | «“Editar equivalencias” vuelve editable la tabla **en el propio paso**» (espec. L278). §6.4 L661 dice lo mismo, aunque la fila está en la tabla de formularios con diálogo. | Duda D6a-18 (recomendado: en línea). |
| C18 | `pantallas-y-datos.md` §3.2 y `componentes.md` §3 dan por hecho que `formatearFecha` produce los textos de P1 y P6. | Produce «domingo, 1 de enero de 1640 T.E.» y «jueves, 12 de abril de 1640 T.E.» (`formatoFecha.ts` L44-58). Las vistas piden «domingo 1 de enero…» sin coma (mjs L348), «Jueves, 12 de abril…» con mayúscula (mjs L628) y «Jueves» suelto (mjs L251). | Faltan formatos (hueco H7, duda D6a-22). |
| C19 | `componentes.md` cita `normalizarCantidad` (`importe.ts:60`), `importeDesde` (`:74`) y `formatearDiaDelAvance` (`formatoFecha.ts:90`). | Son números de línea de la rama `implementacion/fase-3`. En la base de la 6a (3a77322), `importeDesde` está en la L57 y las otras dos no existen: llegaron con los commits 46e2dbb y 3bc6db5 de la fase 3. | La 6a usa `importeDesde` tal como está en la base; lo demás queda fuera (§4). |
| C20 | `componentes.md` §5 recomienda la opción A (construir ya el alta rápida J2e) y afirma que el «diálogo apilado **con teclado en pantalla**» es un entregable explícito. | La Fase 6 dice «diálogo y diálogo apilado» (plan L102). El alta rápida y el teclado en pantalla son de la fase 9 (plan L128 y L131). | Opción B: hueco (duda D6a-14). |
| C21 | `sistema-visual.md` §10.2: los asentamientos van en el menú «en el orden en que se crearon», citando §5. | §5 no fija el orden. `resumenDePartida` los ordena por `alta` y luego por id (`resumen.ts` L41-44). | Mismo orden que P0 (duda D6a-26). |
| C22 | `tecnica.md` §3, ejemplo de prueba: usa `vi.fn()` e importa solo `describe, expect, it`. | Sin `globals: true` (que el propio informe desaconseja), `vi` no existe: falla `tsc -b` y la ejecución. | Importar `vi` de `'vitest'`. |
| C23 | `tecnica.md` §1: `theme_color` = `oro-oscuro`. | Ninguna fuente fija los colores del manifiesto. La barra superior de la app es `vitela` (mjs L247) y el fondo `papel`. | Duda D6a-04. |
| C24 | `pantallas-y-datos.md` §7.4 (Importar en P6) pasa a `importarCopia` solo `{ modo, ahora, nuevoId }`. | `analizarCopia` devuelve `migrada` y `desdeVersion`, y `importarCopia` los necesita para que el resumen diga que la copia se actualizó (`importar.ts` L61-67 y L86-90; espec. «el resumen lo dice», §6.1). | Hay que pasarlos en P0 y en P6. |
| C25 | `componentes.md` I-1 y `pantallas-y-datos.md` §4.5 llaman «aviso» a «Importar una copia reemplaza la partida actual.». | Es una `nota` con icono de alerta (mjs L634), no un `aviso`. | Se queda como nota, fiel a la vista (lo recomienda el propio `componentes.md`). |

---

## 3. Piezas del alcance de la 6a y quién las cubre

| Pieza del alcance | La cubre | Estado |
|---|---|---|
| vite-plugin-pwa: manifiesto, SW y uso sin conexión en Chrome para Android | `tecnica.md` §1 | **Incompleta**: falta el origen HTTPS (H1), el precaché de fuentes e iconos (C8) y los iconos (D6a-03). |
| Fuentes incluidas en la app, sin Google Fonts | `sistema-visual.md` §9, `tecnica.md` §2 | Se contradicen (C6, C7); resuelto arriba. |
| Sistema visual como variables CSS | `sistema-visual.md` §8 | Hecho. Falta unificar los nombres (C11) y la escala no tiene los tamaños de P0 y P1 (H12). |
| Marco: barra superior sin aviso ni «Avanzar días» | `sistema-visual.md` §10.1, `pantallas-y-datos.md` §7.1 | Hecho. §10.1 describe también las zonas 3 y 4, que **no** se construyen (§4). |
| Menú lateral (§5) | `sistema-visual.md` §10.2, `pantallas-y-datos.md` §7.1 | Hecho, salvo el orden (D6a-26) y el destino de las filas sin pantalla (D6a-15). `tecnica.md` lo excluye por error (C10). |
| 11 componentes comunes | `componentes.md` | Hechos, con los errores C1-C5 y C20. Faltan las piezas de apoyo (H11). |
| P0 y «Editar partida» | `pantallas-y-datos.md` §1-2 | Hecho. Faltan el texto de dominios (H9), el borde oro de la tarjeta principal (H15) y cómo se cuenta el cambio (§4). |
| P1 y P1b | `pantallas-y-datos.md` §3 y §5 | Hecho. Faltan la construcción pura del documento (H10), el formato de las equivalencias (H8) y los valores iniciales (D6a-19, D6a-20). |
| P6 | `pantallas-y-datos.md` §7 | Hecho, salvo C24 y los formatos de fecha (H7). |
| Exportar e importar con «Reemplazar» o «Importar como copia» | `pantallas-y-datos.md` §4 | Hecho en datos. Falta la interfaz del resultado y de los errores (H6), el selector de archivo en Android (H5) y la descarga (H4). |
| Pruebas de componentes con Testing Library | `tecnica.md` §3 (solo el entorno) | **Sin inventario de pruebas** (el `test.md` no existe). Se propone en el §7. |
| Entregable: instalable, sin conexión, lista, crea, abre el ejemplo, exporta e importa | Repartido | Faltan el origen (H1), la verificación (H16) y cómo llega el ejemplo (D6a-16). |

**Huecos que no cubre ningún informe**:

- **H1 · Origen HTTPS para la tablet**, y los datos atados al origen: con GitHub Pages bajo `/gestion_aldeas/` hay que fijar `base` en Vite y que `scope` y `start_url` del manifiesto coincidan. Ver §5.1 y D6a-01.
- **H2 · Precaché** de `woff2`, iconos y manifiesto (C8).
- **H3 · Almacenamiento persistente**: llamar a `navigator.storage.persist()` al arrancar, para que Chrome no expulse IndexedDB cuando le falte espacio. Es la única copia de las partidas aparte de las exportaciones (espec. §2: «Local en el dispositivo»). D6a-05.
- **H4 · Poder probar la interfaz**: la base (`baseDePrueba()`), el reloj (`ahora`, que alimenta «Última sesión») y `nuevoId` tienen que llegar a las pantallas por un contexto, no crearse dentro. La descarga (Blob, `URL.createObjectURL` y `<a download>`) va aislada en un módulo que se pueda sustituir en las pruebas.
- **H5 · Selector de archivo en Android**: con `accept="application/json"` solo, algunos gestores de archivos de Android dejan los `.json` en gris porque no conocen el tipo MIME. Mejor `accept=".json,application/json"`, y probarlo en la tablet.
- **H6 · Qué ve el jugador al importar.** `importarCopia` devuelve `lineas` «ya listas para mostrar» (`importar.ts` L79-92), pero nadie dice dónde se enseñan. Tampoco dónde van los rechazos de `analizarCopia` (con `daniada`, la interfaz escribe «La copia está dañada: <detalle>», `analizar.ts` L18-19) ni el «Esta copia es de otra partida» de P6. D6a-17.
- **H7 · Formatos de fecha** (C18):
  - «domingo 1 de enero de 1640 T.E.», sin coma;
  - el día de la semana con mayúscula inicial;
  - la fecha real de un `Instante` en hora local («8 de septiembre de 2026», mjs L301 y L632). `Instante` es ISO en UTC (`z.iso.datetime()`, `comunes.ts` L16), así que pasarlo a la fecha local depende de la zona del dispositivo: esa conversión va en `src/interfaz`, no en el dominio.
  - Aparte: `nombreDeArchivo` usa la fecha UTC (`exportadaEl.slice(0, 10)`, `sobre.ts` L290). Cerca de medianoche, el nombre del archivo y la fecha de P6 pueden diferir en un día. Es de la fase 2 y no se toca en la 6a; solo se anota.
- **H8 · Cadena de equivalencias**: «1 mm = 100 mo · 1 mo = 10 mp · …» (P1, mjs L353) y «1 mo = 10 mp = 100 mb = 1.000 mc» (P1b). En el generador, `saldoOro` la trae escrita a mano (mjs L215). Hace falta una función que la arme desde `Equivalencias` con `valorEnBase` y `formatearNumero`, porque las equivalencias se pueden editar en P1.
- **H9 · Texto de los dominios en la tarjeta de P0**: «Tharan, Bree y Archet» o «Aldric, sin asentamientos» (mjs L321-322). Una partida recién creada en la 6a siempre cae en el segundo caso. `enumerar` es privada y solo existe en la rama de la fase 3 (`formatoFecha.ts`), así que hace falta una ayuda propia.
- **H10 · Documento de una partida nueva, en puro**. `pantallas-y-datos.md` §5.3 lista sus 31 claves vacías, pero no dice dónde se arma. Por la regla del dominio puro (plan: «la interfaz solo lee el estado y llama al dominio») va en un **módulo nuevo** de `src/dominio`, y su prueba lo pasa por `EsquemaDocumentoPartida`. Lo mismo para aplicar «Editar partida» (con `fechaActual = fechaInicial` si no hay avances, `pantallas-y-datos.md` §2.1). Al ser archivos nuevos, no chocan con la fase 3, que no toca `modelo/` (plan fase 3, L63).
- **H11 · Piezas de apoyo que no están en la lista de 11 pero sí usan las pantallas de la 6a**:
  - campos: campo de texto (`campo`, mjs L191), casilla (L1371), etiqueta de campo (L1369);
  - textos y cabeceras: nota (L187), cabecera de pantalla (L133), enlace (L118);
  - listas: lista de pares (`fila` y `lista`, L158-160);
  - asistente y tarjetas: indicador de pasos del asistente (`pasoAsistente`), tarjeta de partida (L296), resumen «en monedas de oro» (`saldoOro`, L210);
  - botones e iconos: botón de icono (L116), los 41 iconos, el emblema y el filete (L29-79).
- **H12 · Tamaños tipográficos de P0 y P1** que faltan en la escala de `sistema-visual.md` §8:
  - título del asistente, Cormorant 40 px (mjs L342);
  - «Tus partidas», Cormorant 26 px (L318);
  - nombre en la tarjeta de partida, 28 px (L299);
  - entradilla de P0, Cormorant 500 cursiva 23 px (L314);
  - marca del asistente, Cinzel 15 px con 0.06em (L334).
  Van como valores del CSS de cada componente, no como *tokens*.
- **H13 · Plan de pruebas** (§7).
- **H14 · Error al abrir la base** (navegador sin IndexedDB, cuota llena): un mensaje genérico en vez de pantalla en blanco.
- **H15 · La tarjeta de la partida principal en P0 lleva borde `oro`** (mjs L296: `border: 1px solid ${principal ? C.oro : C.borde}`). `pantallas-y-datos.md` no lo recoge.
- **H16 · Verificar el entregable sin conexión**:
  - automático: tras `npm run build`, un script lee `dist/sw.js` y `dist/manifest.webmanifest` y comprueba que se precachean `index.html`, el JS, el CSS, los `woff2` y los iconos;
  - Chrome de escritorio sobre `vite preview` (en `localhost` es contexto seguro): pestaña Manifest instalable, SW activo y recarga en modo Offline;
  - la tablet, a cargo del usuario (§5.1).
- **H17 · Contenido que se desplaza con la cabecera fija** (espec. L821) dentro del marco. La vista no lo necesita en P6, pero el marco sí debe permitirlo.

---

## 4. Dependencias del motor y de la fase 3 que se han colado

Ningún informe usa `simular` ni los avisos de §9 para una pieza de la 6a. Lo que sí se ha colado:

1. **J2d con el aviso «Lo creó el avance del 10 al 12 de abril»** (`componentes.md` §8, `avisoAvance`). Lee los avances de los registros y usa `formatearDiaDelAvance`, que es de la fase 3. «Eliminar partida» y «Borrar partida» no lo necesitan: la prop puede existir, pero se rellena en la fase 7.
2. **Contar el cambio al guardar «Editar partida».** D-038 dice que cuenta cada guardado que cambia la partida, y el contador lo sube `guardarEdicion` (`src/datos/ediciones.ts`, tarea 27 de la fase 3, que aún no existe en la base). Si la 6a guarda con `guardarPartida`, renombrar una partida con avances no suma al contador, y «Deshacer avance» lo borraría sin avisar. En la 6a solo pasa con partidas importadas o con la de ejemplo, porque no se puede avanzar. Duda D6a-24.
3. **`normalizarCantidad`** (`componentes.md` §4) es de la fase 3. En la base, `importeDesde` guarda lo tecleado sin normalizar; al fusionar la fase 3 lo normaliza sin que la interfaz cambie. No hace falta tocar nada.
4. **Barra superior**: `sistema-visual.md` §10.1 describe con todo detalle el próximo aviso y «Avanzar días». Se deja el hueco y no se pinta nada: la vista P6 los dibuja (mjs L253-254) porque todas las vistas comparten el estado completo (`pantallas-y-datos.md` §10.2).
5. **Grupo «Recientes» del selector** (espec. L864): necesita guardar lo elegido al guardar registros, y eso llega en la fase 9 («en la fase 9 los “Recientes”», `pantallas-y-datos.md` §7.4). El componente recibe una lista `recientes` opcional y en la 6a va vacía.
6. **Destinos del menú sin pantalla**: Inicio y Calendario son de la 6b; el Resumen de cada dominio, de las fases 7 y 8 (no de la 6b); «Añadir asentamiento» (A0), de la 8; «Gestionar listas» (P7), de la 9. Todo va al mismo relleno (D6a-15).

---

## 5. Riesgos técnicos

### 5.1 PWA sin conexión en Chrome para Android

- **Contexto seguro** (H1). Opciones para la tablet:
  - (a) `adb reverse tcp:4173 tcp:4173` con depuración USB: la tablet abre `http://localhost:4173`, que sí es seguro. Sirve para el entregable, pero ese origen es de desarrollo.
  - (b) GitHub Pages (HTTPS): requiere preguntar al usuario. Si el repositorio es privado, Pages puede exigir plan de pago, y eso también se pregunta.
  - (c) Otro alojamiento HTTPS: también se pregunta.
  - Un certificado autofirmado (`@vitejs/plugin-basic-ssl`) no vale: Chrome para Android no registra un SW con certificado no fiable.
- **Origen y datos**: cambiar de puerto, dominio o ruta es otro origen, con IndexedDB vacía.
- **Precaché** (C8). Además, cada CSS de Fontsource trae `woff2` y `woff`: el patrón solo debe recoger `woff2`.
- **Iconos**: Chrome para Android exige iconos de 192 y 512 px para ofrecer instalar. `@vite-pwa/assets-generator` va por la 2.0.0, pero vite-plugin-pwa 1.3.0 declara `^1.0.0` como *peer* (`tecnica.md`, confirmado con `npm view`). Es más simple generar los PNG una vez, a partir del SVG del emblema, y guardarlos en `public/`.
- **Registro del SW**: `injectRegister: 'auto'` inserta el registro en el HTML sin importar `virtual:pwa-register`. Así se evitan los tipos `vite-plugin-pwa/client` en `tsconfig.app.json` (que hoy solo tiene `types: ["vite/client"]`) y que las pruebas tengan que resolver un módulo virtual. `tecnica.md` §6 propone un `pwa/registrarSW.ts`, que en la 6a no hace falta.
- **Orientación**: `orientation: 'landscape'` del manifiesto solo actúa con la app instalada (`display: 'standalone'`). En una pestaña normal del navegador no se bloquea (espec. L826 y L1423: la vertical queda fuera).
- **`::backdrop` y variables CSS**: solo desde Chrome 122 hereda las propiedades personalizadas del `<dialog>`. Con un Chrome antiguo en la tablet, un velo escrito con `var(--…)` sale transparente. Se evita con el `rgba(43, 33, 24, .55)` literal (espec. L1402).
- **`showModal` en StrictMode**: los efectos se montan dos veces en desarrollo, y llamar a `showModal()` sobre un diálogo ya abierto lanza `InvalidStateError`. Hay que comprobar `dialog.open` y cerrarlo en la limpieza del efecto.
- **Teclado en pantalla** (fase 9, pero se decide en `index.html`): Chrome para Android no encoge el *layout viewport* al abrir el teclado. Añadir ahora `interactive-widget=resizes-content` a la meta `viewport` deja que «alto visible» (espec. L827 y L868) funcione con CSS en la fase 9. No cuesta nada.

### 5.2 Entorno de pruebas

- **happy-dom 20.14.5 sí implementa `showModal()` y `close()`**, y `close` lanza el evento (comprobado en `lib/nodes/html-dialog-element/HTMLDialogElement.js`). El *shim* de `tecnica.md` §3 no hace nada con happy-dom. Lo que no simula es la capa superior, el foco atrapado ni el `cancel` con Esc: esas pruebas lanzan el evento a mano.
- **Proyectos de Vitest**: `tecnica.md` propone el proyecto de nodo con `include: ['src/dominio/**', 'src/datos/**']`. Es más robusto `include: ['src/**/*.test.ts']` con `exclude: ['src/interfaz/**']`, porque la fase 3 crea carpetas nuevas dentro de `src/dominio` y así no se escapa ninguna. `pureza.test.ts` exige `window` indefinido: si una prueba del dominio cae en happy-dom, falla, y eso sirve de alarma.
- **fake-indexeddb dentro de happy-dom**: las pantallas necesitan la base inyectada (H4). Conviene una prueba de humo al montar el entorno: crear, listar y borrar una partida desde una pantalla.
- **`URL.createObjectURL`** y la lectura de `File` en happy-dom: la descarga se aísla (H4). La importación se prueba con `userEvent.upload(input, new File([texto], 'copia.json', { type: 'application/json' }))`.
- **Tipos**: el `import '@testing-library/jest-dom/vitest'` del archivo de preparación ya extiende los tipos, porque ese archivo está en `src` (`tsconfig.app.json` incluye `src`). No hace falta `globals`.

### 5.3 Trabajo en paralelo con la fase 3

- **Rama base**: la fase 3 sigue viva, con un commit nuevo (b9ceb30) mientras se leía. La 6a sale de `diseno/especificacion-y-vistas` (3a77322), no de `implementacion/fase-3`.
- **Archivos compartidos**:
  - La fase 3 no toca `package.json`, `package-lock.json` ni `vite.config.ts` (plan fase 3, L15 y L63). La 6a sí los toca, así que ahí no hay choque.
  - Sí hay riesgo en `src/dominio/calendario/formatoFecha.ts`, que la fase 3 modifica. La 6a no debe editarlo: sus formatos nuevos van en archivos nuevos.
  - `docs/decisiones.md`: las dos fases añaden entradas.
- **Numeración de decisiones**: la fase 3 ya usa hasta D-042. Si la 6a numera por su cuenta, las dos pueden chocar (D-043…). Hay que reservar un bloque o numerar al fusionar (D6a-27).
- **Orden de fusión**: lo más sencillo es que la fase 3 cierre primero. Después la 6a fusiona la rama de trabajo, repite `npm test`, `npx tsc -b`, `npm run build` y `npm run lint`, y cierra ella.

---

## 6. Dudas unificadas

Formato: pregunta · de qué informe sale · opciones · **recomendación**. Salvo D6a-01, D6a-16 y D6a-21, que conviene enseñar al usuario, las demás son técnicas o de presentación. Según `CLAUDE.md`, Claude las decide y las anota en `docs/decisiones.md`.

**Instalación y PWA**

- **D6a-01 · Dónde se sirve la app para la tablet** (nuevo). (a) `adb reverse` a `localhost` para el entregable; (b) GitHub Pages; (c) otro HTTPS. **Recomendación**: (a) para cerrar la 6a. Antes de la primera partida de verdad, preguntar al usuario por (b), avisando de que cambiar de origen obliga a exportar e importar las partidas. Publicar exige su permiso (`CLAUDE.md`).
- **D6a-02 · `registerType`** (`tecnica.md` D-T1). `autoUpdate` o `prompt`. **Recomendación**: `autoUpdate` con `injectRegister: 'auto'`. En la 6a no hay formularios largos que perder; revisarlo en la fase 9, cuando exista «Cerrar con cambios».
- **D6a-03 · Iconos de la PWA** (`tecnica.md` D-T5). (a) Unas iniciales provisionales; (b) el emblema del generador (mjs L76-77) sobre `papel`. **Recomendación**: (b), porque ya está diseñado. PNG de 192 y 512 px más uno `maskable` de 512, rasterizados una vez (Chrome sin cabeza o `npx @vite-pwa/assets-generator`) y guardados en `public/`, sin dependencia nueva.
- **D6a-04 · Campos del manifiesto** (`tecnica.md` §1). **Recomendación**:
  - `name` «Gestión de Aldeas», `short_name` «Aldeas» (el lanzador de Android corta hacia los 12 caracteres), `lang` «es»;
  - `display` «standalone», `orientation` «landscape»;
  - `background_color` `#F2E8D0` (papel) y `theme_color` `#FBF6E9` (vitela, el color de la barra superior; mjs L247). Con `oro-oscuro` la barra del sistema no casaría con la de la app.
- **D6a-05 · Almacenamiento persistente** (nuevo). (a) `navigator.storage.persist()` al arrancar, sin interfaz; (b) nada. **Recomendación**: (a).
- **D6a-06 · Entorno de pruebas** (`tecnica.md` D-T2). **Recomendación**: happy-dom sin *shim* (ya trae `showModal` y `close`), en un proyecto `interfaz` de Vitest, y el proyecto de nodo con `src/**/*.test.ts` menos `src/interfaz/**`.
- **D6a-07 · Enrutado y estilos** (`tecnica.md` D-T3 y D-T4). **Recomendación**: estado de React sin biblioteca de rutas, y CSS Modules con variables CSS, como propone el informe.

**Sistema visual**

- **D6a-08 · Fuentes** (C6, C7). **Recomendación**: `latin-600.css` y `latin-500-italic.css` de Cormorant Garamond; `latin-400`, `latin-600` y `latin-700` de Source Sans 3; `latin-600` de Cinzel. En un solo módulo importado desde `main.tsx`.
- **D6a-09 · Pantallas mayores de 1180×820** (`sistema-visual.md` duda 1). **Recomendación**: estirar con las rejillas `minmax(0, 1fr)`, sin ancho máximo.
- **D6a-10 · Nombres de las variables CSS** (C11). (a) `--ga-*`; (b) los nombres de §10 sin prefijo; (c) `--color-*`. **Recomendación**: (b), porque se leen igual que la tabla de la espec. y la app no carga CSS ajeno con el que chocar:
  - `--papel`, `--vitela`, `--pliegue`, `--borde`, `--tinta`, `--tinta-suave`, `--lacre`, `--oro`, `--oro-oscuro`, `--bosque`;
  - más los del generador: `--campo`, `--lacre-tinte`, `--oro-tinte`, `--bosque-tinte`.
- **D6a-11 · Estados de interacción** (`sistema-visual.md` dudas 2-5, `componentes.md` D-C1 y D-C5; C12 y C13). **Recomendación**:
  - desactivado: atributo `disabled` nativo y `opacity: .6`;
  - foco: `:focus-visible` con `outline: 2px solid var(--oro-oscuro)` y `outline-offset: 2px` en todo lo que recibe foco, segmentos incluidos (así no se confunde con el borde de 1 px oro de la opción elegida);
  - *hover*: sin *hover* propio salvo en los enlaces (mjs L96), porque es una app táctil. Si hiciera falta, bajo `@media (hover: hover)`;
  - error: mensaje en lacre con icono bajo el campo (espec. L815), `aria-invalid`, y el borde del campo de 1 px en `lacre`. Este último no está en la espec., pero es barato y ayuda en formularios de dos columnas.

**Componentes**

- **D6a-12 · Aviso en tono bosque** (`componentes.md` D-C7). **Recomendación**: los cuatro tonos, y se usa ya en el resultado de importar (D6a-17).
- **D6a-13 · P0 sin panel** (`componentes.md` D-C2). **Recomendación**: fiel a la vista: título «Tus partidas» y tarjetas sueltas.
- **D6a-14 · Qué parte de las altas del selector entra en la 6a** (`componentes.md` §5; C20). (a) El componente entero y además el alta rápida J2e; (b) el componente con grupos, buscador, contador, resaltado, «Nada coincide», degradado y modo filtro, y el pie de alta solo como hueco (texto y `onAlta` sin conectar). **Recomendación**: (b). La hoja de ruta pone las altas y el teclado en la fase 9, y ninguna pantalla de la 6a apila diálogos: «Editar partida» → J2d sustituye, no apila (espec. L221). El diálogo apilado se construye y se prueba aislado, con dos niveles como máximo (espec. L219). La prop `modoFiltro` sí, como recomienda D-C4. El resaltado debe ignorar mayúsculas y tildes igual que la búsqueda (espec. L862), manteniendo los índices del texto original, porque `normalizarNombre` los cambia (quita marcas y junta espacios). Es un riesgo de implementación que merece su propia prueba.
- **D6a-15 · Qué se ve al abrir o crear una partida, y en las filas del menú sin pantalla** (`pantallas-y-datos.md` §9.1 y §9.11). **Recomendación**: la opción A de ese informe. El marco con un relleno neutro en el hueco de Inicio y un enlace a «Ajustes y copias». Las filas sin pantalla llevan al mismo relleno, sin desactivarlas. Al arrancar con partidas se abre la última usada en ese relleno (espec. L203; nota del canvas de P0, mjs L1908).
- **D6a-16 · Cómo llega la partida de ejemplo** (`pantallas-y-datos.md` §9.10). (a) Sembrarla sola si no hay partidas, lo que rompe «Sin partidas, muestra P0 vacío» (espec. L203); (b) un botón en P0; (c) un JSON empaquetado que se importa; (d) un acceso oculto de desarrollo. **Recomendación**: (b) solo en el estado vacío de P0, como tercera acción en variante fantasma («Probar con la partida de ejemplo»), que llama a `crearPartida(db, documentoDeEjemplo(), ahora)`. En el estado vacío no puede chocar con el id fijo `p.sombra-del-este`. Añade interfaz que la espec. no dibuja, así que se anota y se le enseña al usuario.
- **D6a-17 · Dónde se enseña el resultado de importar y los errores de copia** (nuevo, H6). **Recomendación**: un diálogo simple «Copia importada» con las `lineas` y «Aceptar». Los rechazos de `analizarCopia` y de `examinarDestino` van en un diálogo simple con el mensaje literal del dominio, y con `daniada` se escribe «La copia está dañada: <detalle>».
- **D6a-18 · «Editar equivalencias»** (C17). (a) En línea, en el propio paso; (b) un diálogo. **Recomendación**: (a), por el texto literal de espec. L278. Es la tabla de P6 con campos numéricos, y la «vista del resultado» es la cadena de equivalencias recalculada al teclear (H8). Los errores son los de `validarEquivalencias` (`monedas.ts` L63-80).
- **D6a-19 · Valores iniciales de P1** (`pantallas-y-datos.md` §9.7, ampliada). **Recomendación**: Día 1, Mes enero, Año vacío, Edad «Tercera» (la que muestra la vista, mjs L345). El aviso «La partida empieza el …» solo sale cuando la fecha es válida.
- **D6a-20 · Bolsa inicial de P1b** (`pantallas-y-datos.md` §9.9, ampliada). **Recomendación**: empieza con una fila vacía en «Oro · mo»; se admiten 0 filas (0 mo); una fila con la cantidad vacía o mal escrita da «La cantidad tecleada no es válida» (`comunes.ts` L83).
- **D6a-21 · Nombres de partida repetidos** (nuevo). (a) Se permiten; (b) aviso; (c) error. **Recomendación**: (a). Los ids las distinguen, e «Importar como copia» ya añade «(copia)» (`comoCopia.ts`).
- **D6a-22 · Formatos de fecha que faltan** (C18, H7; el pendiente de `decisiones.md`). **Recomendación**:
  - funciones puras nuevas en un archivo nuevo, sin tocar `formatoFecha.ts`: «domingo 1 de enero de 1640 T.E.» y la mayúscula inicial;
  - `Instante` → fecha local → «8 de septiembre de 2026» en `src/interfaz`, porque depende de la zona del dispositivo;
  - la barra superior usa «12 de abril de 1640 T.E.» y «Jueves» por separado (mjs L250-251).
- **D6a-23 · Textos que la espec. no escribe** (`pantallas-y-datos.md` §9.2, §9.4, §9.8 y §9.12; `componentes.md` D-C6 y D-C8). **Recomendación**:
  - estado vacío de P0: «Todavía no tienes ninguna partida.», con los dos botones destacados;
  - nombre vacío: «Escribe un nombre» (espec. L1452), y `maxLength=60` en el campo, para que el caso «demasiado largo» no pueda darse;
  - fecha «posterior a la fecha actual» (espec. L841-842; D-003), que no tiene texto: «Tiene que ser posterior al 12 de abril de 1640 T.E.»;
  - fecha escrita ilegible: «Escribe la fecha como 19/04/1640» (y los mensajes de `validarFecha` si se lee pero no existe);
  - «Última copia exportada» sin valor: «Nunca»;
  - mensajes de `validarRecurrencia`: se dejan literales, y se reparten por campo con una tabla fija de patrones cubierta por una prueba que falle si aparece un mensaje nuevo sin campo;
  - J2d de una partida, siguiendo la vista de J2d (C1): título «¿Eliminar «La Sombra del Este»?»; subtítulo «Partida · 12 de abril de 1640 T.E.»; caja de resumen con los dominios y «Se borra todo y se vuelve al selector de partidas» (espec. L801); la casilla, la nota «El botón rojo no se activa hasta marcar la casilla.» y el pie «Cancelar» / «Eliminar definitivamente»;
  - confirmar la importación en P0: el texto de `pantallas-y-datos.md` §9.8, con el pie «Cancelar» · «Importar como copia» (secundario) · «Reemplazar» (`peligroLleno`, porque «ofrecen la acción en rojo», espec. L691). Es una confirmación simple, no J2d (J2d es solo para borrar, espec. L691).
- **D6a-24 · Guardar «Editar partida»** (`pantallas-y-datos.md` §2 y §9.5; §4.2). **Recomendación**:
  - los mismos campos que P1, y la fecha solo mientras `!hayAvances`, fijando `fechaActual = fechaInicial`;
  - en la 6a, guardar con `guardarPartida`; al fusionar la fase 3, pasar a `guardarEdicion` para que cuente el cambio (D-038). Se anota como tarea de la 6b;
  - sin «Cerrar con cambios», que es de la fase 9 (plan L131).
- **D6a-25 · Buscador de P0 con más de 5 partidas** (`pantallas-y-datos.md` §1.6). **Recomendación**: un campo de búsqueda sobre la lista, con `normalizarNombre` y «Nada coincide con “…”», sin contador ni grupos. No hace falta para el entregable, pero sí para cumplir espec. L824.
- **D6a-26 · Orden de los asentamientos en el menú** (C21). **Recomendación**: el de `resumenDePartida` (por `alta` y luego por id), para que el menú y la tarjeta de P0 coincidan.
- **D6a-27 · Rama y numeración de decisiones** (§5.3). **Recomendación**:
  - rama `implementacion/fase-6a` desde `diseno/especificacion-y-vistas`;
  - no modificar archivos existentes de `src/dominio` ni de `src/datos`, solo crear archivos nuevos;
  - decisiones de la 6a en un bloque reservado (por ejemplo D-100…) o numeradas al fusionar;
  - la fase 3 se fusiona primero.

---

## 7. Pruebas mínimas propuestas (sustituyen al `test.md` que falta)

Con Testing Library y `user-event`, cada prueba al lado de su componente (`*.test.tsx`), escrita antes que el código (TDD, `CLAUDE.md`).

- **Botón**: nombre accesible; las cinco variantes aplican su clase; con `disabled` no llama a `onClick`.
- **Segmentos**: `role="radiogroup"`; al tocar cambia la selección; flechas del teclado.
- **Campo de importe**: «25» en plata da «= 2,5 mo»; «,6» se acepta; «1,1234567» da error; recalcula en cada tecla.
- **Selector con buscador**:
  - 7 opciones: buscador sin foco; 13 opciones: con foco;
  - «al» da «5 de 27» y resalta ignorando tildes («Álamo» con «ala»);
  - sin resultados: «Nada coincide con “…”»;
  - modo filtro: «Todas» primero y sin pie;
  - pie de alta presente, pero sin diálogo.
- **Diálogo**: abre y cierra; Esc y la x equivalen a Cancelar.
- **Diálogo apilado**: el de abajo sigue montado, con sus datos, al cancelar el de arriba; no se puede abrir un tercero.
- **J2d**: «Eliminar definitivamente» desactivado hasta marcar la casilla; «Cancelar» devuelve al formulario de origen con sus datos.
- **Aviso**: cuatro tonos, siempre con icono y texto.
- **Campo de fecha**:
  - atajos relativos a la fecha de la partida; «+7 días» no pasa del 31/12/9999 (D-001);
  - «31/04/1640» da «Abril de 1640 tiene 30 días»;
  - «19/04/1640» se lee bien.
- **Campo de frecuencia**:
  - el 12 de abril, «Cada 2 meses · día 15» da el 15 de junio y «día 31» el 30 de junio (espec. L834);
  - Trimestral da el 12 de julio y, al pasar a N = 2, el 12 de junio (espec. L837);
  - «Primera vez» a mano en otro día da el error de L835;
  - «Una sola vez» en el pasado da error.
- **Marco**: nombre y fecha de la partida; solo un dominio desplegado; «Ajustes y copias» activo en P6; sin «Avanzar días».
- **P0**, con `baseDePrueba()`:
  - vacío: los dos botones y el ejemplo;
  - con ejemplo: la tarjeta dice «Tharan, Bree y Archet» y «12 de abril de 1640 T.E.»;
  - «Continuar» abre el marco;
  - exportar llama a la descarga con `gestion-aldeas-la-sombra-del-este-AAAA-MM-DD.json`;
  - importar la misma copia pregunta «Reemplazar» o «Importar como copia», y «como copia» crea «La Sombra del Este (copia)».
- **P1 → P1b → Crear**:
  - «31/4» bloquea «Siguiente»;
  - la bolsa del ejemplo suma «40,918 mo» (espec. L280);
  - «Crear partida» guarda una partida que pasa `EsquemaDocumentoPartida` y aparece en P0 como «Tharan, sin asentamientos».
- **P6**: tabla de monedas de solo lectura; «Nunca» sin exportar; una copia de otra partida da «Esta copia es de otra partida»; «Borrar partida» con J2d vuelve a P0 sin la partida.
- **Construcción**: un script tras `npm run build` comprueba el precaché de `dist/sw.js` (H16) y el manifiesto.
