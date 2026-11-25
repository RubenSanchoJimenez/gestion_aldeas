# Fase 6a · Sistema visual «pergamino legible» y marco — informe de extracción

Encargo: extraer de la especificación y de las vistas todos los tokens del sistema visual (§10) y del marco (§5) —barra superior y menú lateral—, y proponer las variables CSS y la carga de fuentes sin Google Fonts.

**Fuentes usadas**:
- Especificación: `docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md` — §2 Restricciones (L73-85), §5 Navegación (L184-241), §10 Sistema visual (L1379-1406), §6.4 patrones transversales (L812-850, donde se citan estados y validación).
- Generador de vistas: `design/build-artboards.mjs` — tokens `C` (L11-15), `F` (L16-20), iconos `I`/`ic` (L29-79), componentes (L105-217), marco `barraSuperior`/`barraLateral`/`marco` (L218-264), diálogos (L265-293).
- Vista renderizada: `design/artboards/Main.dc.html` (Inicio con el marco completo) y `design/artboards/canvas.json` (dimensiones de artboard).
- `CLAUDE.md` del repositorio (reglas de dinero e identificadores) y `docs/decisiones.md` (sin decisiones previas sobre el sistema visual: es la primera fase que lo toca).
- `package.json` y `vite.config.ts`: confirman que `vite-plugin-pwa` y las fuentes aún no están instaladas (fase 6a por empezar).

Todo lo que sigue son valores **literales del generador y de la vista renderizada** (que coinciden entre sí), no inventados. Donde la especificación o las vistas no fijan un valor —sobre todo los estados de interacción `:hover`, `:focus-visible` y `:disabled` de teclado/ratón, que un mockup estático no puede mostrar— lo marco explícitamente como duda con opciones y recomendación.

---

## 1. Colores

Tabla literal de §10 (L1381-1392), con el nombre de variable que usa el generador entre paréntesis:

| Token (§10) | Variable en `build-artboards.mjs` | Valor | Uso (según §10 y su uso real en las vistas) |
|---|---|---|---|
| papel | `C.papel` | `#F2E8D0` | Fondo de la app (el `<body>` y el lienzo de 1180×820) |
| vitela | `C.vitela` | `#FBF6E9` | Tarjetas y paneles; también la barra superior y el fondo de los diálogos |
| pliegue | `C.pliegue` | `#E6D8B8` | Menú lateral y fondos secundarios (fondo de `segmentos`, pista del interruptor apagado, pista de la barra de progreso) |
| borde | `C.borde` | `#D4C29C` | Líneas finas: bordes de panel/campo/tabla, separadores de fila |
| tinta | `C.tinta` | `#2B2118` | Texto principal |
| tinta-suave | `C.suave` | `#6B5A45` | Texto secundario (subtítulos, ayudas, etiquetas de grupo, iconos inactivos) |
| lacre | `C.lacre` | `#8E2A1F` | Avisos urgentes, importes negativos, acción destructiva |
| oro | `C.oro` | `#A9812F` | Borde de selección, ornamentos, barras de progreso, campo activo |
| oro-oscuro | `C.oroOsc` | `#7A5B1F` | Fondo del botón principal (texto vitela; contraste con `#FBF6E9` ≈ 8,4:1, cumple el ≥ 4,5:1 exigido) |
| bosque | `C.bosque` | `#3F5E3A` | Importes positivos, estado correcto |

**Colores adicionales**, presentes en el generador pero no listados en la tabla de §10 (dato del generador, no de la especificación; los cito porque los usa el propio marco y son necesarios para completar el sistema):

| Variable | Valor | Uso | Cita |
|---|---|---|---|
| `C.campo` | `#FFFDF6` | Fondo de los campos de formulario y desplegables (más claro que `vitela`, para distinguir «superficie de tarjeta» de «superficie editable») | `build-artboards.mjs` L12, y en `campo`, `desplegable`, `importeFila`, `selectorAbierto` |
| `C.lacreTinte` | `#F4DED6` | Fondo claro de avisos/badges en tono lacre (p. ej. leyenda «Pagos y avisos», aviso rojo de Inicio) | L14, usado en `TONO.lacre` (L22) y `aviso`/`badge` |
| `C.oroTinte` | `#F1E3BF` | Fondo claro de avisos/badges en tono oro (eventos, opción elegida en un selector, chip activo); también el fondo del campo «equivalente en oro» de un importe (§10: «El equivalente en oro de un campo de importe va sobre fondo oro claro») | L14; `TONO.oro`; `importeFila` L1381; `chip` L197; opción seleccionada de un selector L1405 |
| `C.bosqueTinte` | `#DFE7D5` | Fondo claro de avisos/badges en tono bosque (cobros) | L14; `TONO.bosque` |

Los pares tinte/tono siguen siempre el mismo patrón «fondo claro + texto/borde del color fuerte» (`TONO`, L22): `lacre → [lacreTinte, lacre]`, `oro → [oroTinte, oroOsc]`, `bosque → [bosqueTinte, bosque]`, `neutro → [pliegue, suave]`. Este cuarto tono, **neutro**, no está en la tabla de §10 pero aparece en la leyenda del calendario para «Producción, obras, caravanas y estudio» (fondo `pliegue`, texto `suave`) — lo añado porque sin él la leyenda de cuatro tipos (L1381 de `Main.dc.html`, y `LEYENDA`/`TIPO` en el generador L23, L400) queda incompleta.

**Velos de diálogo** (§10 L1402, confirmado en `dialogo`/`dialogoApilado`, generador L265-280): siempre sobre `tinta` (`#2B2118`), nunca un negro puro.
- Diálogo simple: `rgba(43, 33, 24, 0.55)` (tinta al 55 %).
- Segundo velo de un diálogo apilado: `rgba(43, 33, 24, 0.35)` (tinta al 35 %), sobre el diálogo de abajo ya atenuado.

**Sombras** (no están en §10; son del generador, `build-artboards.mjs`):
- Diálogo simple: `box-shadow: 0 24px 60px rgba(43, 33, 24, 0.35)` (L266).
- Diálogo apilado (el de arriba, más «levantado»): `box-shadow: 0 24px 60px rgba(43, 33, 24, 0.45)` (L278).
- Panel flotante de un selector con buscador: `box-shadow: 0 12px 32px rgba(43, 33, 24, 0.28)` (L1397).
- (La sombra del teclado en pantalla, `0 1px 0 rgba(0,0,0,0.25)` en L284, es la maqueta del teclado táctil de Android para comprobar solapes, no parte del sistema visual de la app: no la incluyo como token.)

## 2. Tipografía

**Familias** (§10 L1394; pila de *fallback* exacta del generador, `F` en L16-20):

| Token | Variable | Pila CSS | Uso (§10 y vistas) |
|---|---|---|---|
| Cormorant Garamond | `F.titulo` | `'Cormorant Garamond', Georgia, 'Times New Roman', serif` | Títulos (`h1`/`h2` de pantalla y de panel, nombre de dominio en su tarjeta, fecha de la barra superior, cifras de "Próximos 7 días", cabeceras de diálogo) |
| Source Sans 3 | `F.ui` | `'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif` | Interfaz y cifras (todo lo demás: botones, campos, tablas, menú, texto de lectura) |
| Cinzel | `F.marca` | `Cinzel, 'Trajan Pro', Georgia, serif` | Nombre de la app y de la partida, y etiquetas de grupo del menú/selector (§10) |

**Tamaños, pesos e interlineados** — los seis tamaños de §10 (L1395-1400) y, además, los tamaños de las piezas del marco y de los componentes comunes que la vista renderizada fija con exactitud (no están enumerados en §10, que da solo las reglas generales):

| Uso | Familia | Tamaño | Peso | Interlineado | Cita |
|---|---|---|---|---|---|
| Texto de lectura | Source Sans 3 | 15px | 400 (600 si es fuerte) | — | §10 L1396; `fila`/`btn` en el generador |
| Etiquetas de campo, notas, subtítulos de cifras | Source Sans 3 | 14px | 400 (600 la etiqueta del campo) | — | §10 L1397; `campo`, `stat` |
| Etiquetas secundarias, cabeceras de tabla, etiquetas de grupo del selector | Source Sans 3 | 13px | 600 en cabeceras de tabla (con `letter-spacing: 0.04em` y mayúsculas); 400 o 600 en badges/notas «tuya» | — | §10 L1398; `tabla` L164, `badge` L122 |
| Marcas del calendario mensual (única excepción) | Source Sans 3 | 12px | — | — | §10 L1399 (no lo vi en los artboards ya generados: la vista de Calendario detallada la cubre otra tarea; lo anoto como pendiente de confirmar visualmente) |
| Cifras clave | Source Sans 3 | 28px o más | 600 | 1.2 | §10 L1400; `stat` L149 (28px), tarjeta de dominio en Inicio (30px, L`Main.dc.html`), saldo en oro (36px, `saldoOro` L213) |
| Título `h1` de pantalla | Cormorant Garamond | 36px | 600 | 1.1 | `cabecera` L136 |
| Título `h2` de panel | Cormorant Garamond | 23px | 600 | — | `panel` L142 |
| Título de diálogo | Cormorant Garamond | 32px | 600 | 1.15 | `cabDialogo` L269 |
| Nombre de dominio en su tarjeta (Inicio) | Cormorant Garamond | 26px | 600 | — | `tarjetaDominio`, `Main.dc.html` |
| Fecha de la barra superior | Cormorant Garamond | 28px | 600 | — | `barraSuperior` L250 |
| Número del día (calendario / "Próximos 7 días") | Cormorant Garamond | 24px | 600 | 1.1 | `Main.dc.html` |
| Nombre de la app (P0) | Cinzel | 44px | 600 | — · `letter-spacing: 0.08em` | `selectorPartidas` L312 |
| Nombre de la partida (barra superior) | Cinzel | 14px | 600 | 1.2 · `letter-spacing: 0.05em` | `barraSuperior` L248 |
| Etiqueta de grupo del menú/selector | Cinzel | 13px | 600 | — · `letter-spacing: 0.1em` | `etiquetaGrupo` L204 |
| Botón | Source Sans 3 | 15px | 600 | — | `btn` L114 |
| Ítem de menú lateral (activo o no) | Source Sans 3 | 15px | 600 si activo, 400 si no | — | `itemNav` L225 |
| Pestaña | Source Sans 3 | 16px | 600 si activa, 400 si no | — | `pestanas` L173-180 |
| Campo de texto (valor) | Source Sans 3 | 16px | 400 | — | `campo`, `desplegable`, `importeFila` |
| Número tabular (`font-variant-numeric: tabular-nums`) | Source Sans 3 | — | — | — | §10 «cifras en Source Sans 3 con números tabulares»; constante `num` en el generador (L21), aplicada a todo importe, saldo y cifra clave |

**Otros datos de §10** (áreas táctiles, ornamento, importes) — literales:
- Áreas táctiles de 44px o más; el interruptor va dentro de un área de 44px (L1401). Cumplido en el generador: filas de menú, botones y filas de tabla miden 44px de alto (`itemNav`, `btn`, `fila`); el interruptor (`interruptor`, L198) mide 46×28px pero su fila (`casilla`/contenedor) tiene `min-height: 44px`.
- Ornamento contenido (L1403): filetes dobles en cabeceras de panel — implementados como borde `border-bottom: 3px double ${C.borde}` en `panel` (L141), `cabDialogo` (L268) y la cabecera de pestañas de Tesorería. §10 no fija el color de este filete; el generador usa **borde** (`#D4C29C`), no **oro**, pese a que el resto de "ornamentos" de la lista de usos de `oro` (§10 L1390: «ornamentos, barras de progreso…») sugeriría oro — lo anoto en la sección 11 como algo a confirmar, no como una contradicción cerrada, porque §10 no llega a nombrar qué color debe llevar el filete. Además hay un emblema (SVG en forma de estrella de cuatro puntas, trazo `oro` de 1,4px, relleno del centro en `oro`) junto al nombre de la partida en la barra superior (`emblema`, L76-77) y junto al nombre de la app en P0, a mayor tamaño (44px frente a 22px).
- Importes alineados a la derecha, con signo y color (`bosque` positivo, `lacre` negativo) — función `imp` (L124-127): el color se decide por el primer carácter del texto (`−` → lacre, `+` → bosque, si no → tinta). El signo negativo debe ser el carácter U+2212 (MINUS SIGN), no un guion, tal y como fija `CLAUDE.md` («signo «−» (U+2212)»); el generador ya usa ese carácter en sus ejemplos (p. ej. «−11,5 mo»).
- «El color nunca va solo: los estados críticos llevan icono y texto» (L1404) — cumplido por `aviso()` y `badge()`, que siempre anteponen un icono al texto coloreado.
- Movimientos vinculados: badge oro con icono en la columna Origen (L1405) — es un uso más de `badge(texto, 'oro', icono)`.

## 3. Espaciados, radios y bordes

**Radios de esquina** (valores exactos usados en el generador; no hay una escala nombrada en §10, así que la extraigo de los componentes):

| Radio | Uso | Cita |
|---|---|---|
| 4px | Barra de progreso (`barra`, pista y relleno) | L182 |
| 5px | Casilla de verificación | L1372 |
| 6px | Botón, ítem de menú, campo, desplegable, botón «Avanzar días», botón de icono | `btn` L114, `itemNav` L225, `campo` L193, `desplegable` L190 |
| 8px | Panel, aviso, tarjeta plegable, resumen de importe (caja), segmentos (contenedor) | `panel` L140, `aviso` L185, `plegable` L202, `segmentos` L1366 |
| 10px | Diálogo, tarjeta de dominio, tarjeta de partida, saldo en oro | `dialogo` L266, `tarjetaDominio`, `tarjetaPartida` L296, `saldoOro` L210 |
| 13px (píldora) | Badge (`border-radius: 13px` con altura 26px → semicírculo) | `badge` L122 |
| 14px (píldora) | Pista del interruptor (altura 28px → semicírculo) | `interruptor` L199 |
| 22px (píldora) | Chip (altura 44px → semicírculo) | `chip` L197 |
| 26px (círculo) | Medallón «mo» del saldo en oro (52×52px) | `saldoOro` L212 |
| 3px | Marca cuadrada de la leyenda (10×10px) | `leyenda` L207 |

**Espaciados** (los más repetidos en el marco y los componentes comunes; no hay una escala de espaciado nombrada en la especificación, la doy como observación empírica de la vista):
- Base táctil: **44px** (filas de menú, botones, campos de importe/desplegable estándar; el buscador de un selector usa 48px).
- Huecos (`gap`) habituales: 6, 8, 10, 12, 14, 16, 18, 20px, según la densidad del grupo (p. ej. 8px entre icono y texto de un botón, 10px entre ítems del menú, 16-18px entre tarjetas/paneles, 20px en la barra superior).
- Relleno del contenido principal (`<main>`): `padding: 20px 28px 22px` (`marco`, L260).
- Relleno de la cabecera de panel: `padding: 6px 12px 4px 20px` (`panel`, L141); altura mínima 56px.
- Relleno de la cabecera de diálogo: `padding: 18px 16px 14px 28px` (`cabDialogo`, L268).
- Relleno del pie de diálogo: `padding: 14px 20px 14px 28px`, fondo `papel` (no `vitela`: el pie se distingue del cuerpo) (`pieDialogo`, L273).
- Ancho fijo del menú lateral: **232px**. Alto fijo de la barra superior: **64px**.

**Bordes**:
- Grosor general: **1px solid `borde`** (paneles, tarjetas, campos, separadores de fila, borde derecho del menú y borde inferior de la barra superior).
- **2px solid `oro`**: borde del campo activo/con el foco dentro de un selector abierto (`selectorAbierto`, L1396) — es el único borde de 2px del sistema y es, además, el candidato más claro a «estado de foco» documentado (ver §5 de estados).
- **3px double `borde`**: filete doble de cabecera de panel/diálogo (el «ornamento contenido» de §10). *Nota*: usa el color **borde** (`#D4C29C`), no oro; ver inconsistencia más abajo.
- Borde de selección/ítem activo del menú: **1px solid `oro`** (`itemNav` con `activo: true`, L225) frente a `1px solid transparent` cuando no está activo (mismo grosor, para que el texto no salte al activarse).
- Avisos/badges: `1px solid ${fg}40` — el sufijo `40` es el canal alfa hexadecimal (25 %) aplicado al color fuerte del tono (p. ej. `#8E2A1F40`), no un color nuevo (`aviso`, L185).

## 4. Estados (hover, foco, desactivado, error)

Las vistas (`.dc.html`) son maquetas **estáticas**: no hay ningún `:hover` ni `:focus` reales, y el generador no produce CSS de interacción salvo en tres puntos muy concretos. Esto es una limitación real de la fuente, no una omisión mía; lo separo en «lo que sí está definido» y «lo que hay que proponer».

**Definido explícitamente**:
1. **Enlace, `:hover`**: color pasa de `oroOsc` (`#7A5B1F`) a `tinta` (`#2B2118`) — único `:hover` real del sistema (`doc()`, L96: `a:hover { color: ${C.tinta}; }`).
2. **Campo "activo" (foco dentro de un selector con buscador)**: borde `1px solid borde` → `2px solid oro`, y el icono de flecha pasa de `suave` a `oroOsc` (`selectorAbierto`, L1396, comparado con `campo`/`desplegable` en reposo). Esto es literalmente lo que dice §10 L1390: «oro… campo activo».
3. **Casilla de verificación desactivada**: `opacity: 0.6` sobre todo el control, y el borde del cuadrado pasa de `suave` a `borde` cuando está apagada y desactivada (`casilla`, L1371-1372).
4. **Opción seleccionada dentro de un selector abierto**: fondo `oroTinte` + icono de check en `oroOsc` (L1405) — es un estado de "marcado", no de interacción de puntero, pero es el único patrón de "seleccionado" que la vista define.
5. **Pestaña activa**: subrayado de 3px en `oro`, texto 600 `tinta`, frente a texto 400 `suave` sin subrayado (`pestanas`, L173-180).
6. **Segmento/chip activo**: fondo `vitela`/`oroTinte` y borde `oro`, frente a borde transparente y texto `suave` (`segmentos` L1366-1368, `chip` L196-197).

**No definido por la especificación ni por las vistas — dudas** (ver sección 7): estilo de `:hover` de botones y filas de tabla/menú con ratón/lápiz óptico, `:focus-visible` de teclado en campos y botones (distinto del "campo activo" del punto 2, que es *abrir* el selector, no solo tabular hasta él), aspecto de un botón `disabled` (spec dice «El botón principal se desactiva mientras haya errores», §6.4 L816, pero no fija el estilo visual), y el borde/fondo de un campo con error de validación (spec dice «Mensaje en lacre con icono bajo el campo», §6.4 L815, pero no dice si el borde del campo también cambia).

## 5. Iconos

**Cómo se dibujan** (`ic()`, generador L74-75): SVG de **24×24** de rejilla, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"` (o un color explícito), `stroke-width="1.75"`, `stroke-linecap="round"`, `stroke-linejoin="round"`. Tamaño de render habitual: 20px en cabeceras de tarjeta/panel, 18px en botones e ítems de menú, 16px en textos con icono en línea (avisos de la barra superior, notas), 14px en badges. Todos son *line icons* de un solo color (el color lo fija quien los usa, normalmente `currentColor`, `suave` para inactivo u `oroOsc` para activo/principal).

**Excepciones** (no siguen la función `ic()` genérica):
- **Emblema** (`emblema()`, L76-77): mismo *viewBox* 24×24 pero trazo `stroke-width="1.4"`, sin *linecap*, con el centro relleno en `oro`. Es una estrella de cuatro puntas (`M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z`) con un círculo relleno en el centro (`r="2.2"`). Va junto al nombre de la partida (22px) y junto al nombre de la app en P0 (44px).
- **Filete** (`filete(w)`, L78-79): ornamento horizontal de ancho variable, alto fijo 12px: dos líneas horizontales en `oro` (1px) interrumpidas por un rombo (`oro`, 1,25px de trazo) con un punto relleno en el centro. Solo aparece bajo el nombre de la app en P0 (L313); no forma parte del marco.

**Catálogo completo** (41 iconos, `I` en el generador, L30-73) — listo el trazo SVG resumido y su uso más relevante en el marco/sistema visual; el resto se usa en pantallas de otras fases:

| Nombre | Uso relevante al marco/sistema visual |
|---|---|
| `casa` | Ítem de menú «Inicio» |
| `calendario` | Ítem de menú «Calendario»; campo de fecha |
| `reloj_arena` | Botón «Avanzar días» |
| `reloj` | Próximo aviso (sin alerta) en la barra superior |
| `usuario` | Dominio de tipo «personaje» (Tharan) |
| `torre` | Dominio de tipo «pueblo»/«aldea» (Bree, Archet) |
| `ajustes` | Ítem de menú «Ajustes y copias» |
| `alerta` | Próximo aviso (con alerta, en `lacre`); avisos urgentes |
| `mas` | «Añadir asentamiento»; botones «Añadir…» |
| `abajo` / `derecha` / `izquierda` | Desplegable cerrado / dominio del menú plegado / dominio plegado (invertido a `abajo` cuando está desplegado) |
| `check` | Casilla marcada; opción seleccionada en un selector |
| `x` | Cerrar diálogo (`btnIcono('x', 'fantasma')`) |
| `buscar` | Buscador de tabla y de selector |
| `editar` | Botón de editar por fila |
| `candado` | Opción de catálogo bloqueada (P7) |
| (resumen, monedas, bolsa, balanza, repetir, maletin, libro, pergamino, tesoro, gente, ficha, trigo, carro, escudo, bandera, cambio, bajar, subir, sube, baja, deshacer, martillo, info, enlazado, huella) | Iconos de dominio/submenú y de componentes de otras pantallas (fuera del marco propiamente dicho) |

Todos se generan en tiempo de compilación como cadenas SVG inline (no hay una fuente de iconos tipo *icon font* ni un *sprite* SVG externo): para la app real, lo más directo es portar el objeto `I` (los `<path>`/`<circle>` de cada icono) a componentes React que envuelvan el mismo `<svg>` con las mismas props, en vez de depender de una librería de iconos de terceros.

## 6. Tamaño de pantalla de diseño y adaptación a la tablet

- **Lienzo de diseño**: 1180×820px, fijo en todos los artboards (`canvas.json`, y `width: 1180px; height: 820px` en `marco()`, L257). Confirmado también en §2 (L77: «Artboards de 1180×820»).
- **Tamaño mínimo admitido**: 1024×700px (§2 L77 y §6.4 L826). Por debajo de eso, y en orientación vertical, quedan fuera de alcance (§11, L1423): «Orientación vertical y pantallas menores de 1024×700».
- **Orientación**: horizontal, bloqueada (§2 L77, §6.4 L826) — no hay un layout vertical que diseñar.
- **Cómo se adapta**: la propia rejilla del marco ya es fluida, no un tamaño fijo maquetado a mano:
  - `grid-template-columns: 232px minmax(0, 1fr)` — el menú lateral es de ancho **fijo** (232px); el contenido crece con `minmax(0, 1fr)`.
  - `grid-template-rows: 64px minmax(0, 1fr)` — la barra superior es de alto **fijo** (64px); el contenido ocupa el resto.
  - Dentro del contenido, las rejillas de tarjetas usan `repeat(n, minmax(0, 1fr))` (p. ej. las 3 tarjetas de dominio, los 7 días de "Próximos 7 días"), así que se reparten el ancho disponible en vez de tener un ancho de columna fijo.
  - Los diálogos sí tienen un ancho fijo en px (p. ej. 700px, 620px, 600px…, según el formulario) y se centran; su alto máximo es «el alto visible menos 48px, con el cuerpo desplazable» (§6.4 L827).
- **Lo que no dice la especificación**: qué pasa por encima de 1180×820 (una tablet más grande o esa área de pantalla con más resolución lógica) — si el contenido debe estirarse sin límite, si hay un ancho máximo de lectura, o si se centra con márgenes. Lo dejo como duda (sección 7).

## 7. Dudas — lo que la especificación y las vistas no fijan

1. **Adaptación por encima de 1180×820**. La rejilla es fluida hacia abajo (funciona en 1024×700 con menos aire) pero no hay una regla para tablets mayores.
   - Opciones: (a) estirar todo el contenido sin límite (el menú sigue fijo a 232px, todo lo demás crece); (b) capar el ancho útil del contenido (p. ej. `max-width: 1400px`) y centrarlo con márgenes iguales a los lados; (c) capar también el alto y centrar verticalmente el lienzo de 1180×820 sobre un fondo `papel`.
   - **Recomendación**: (a), estirar sin límite, reutilizando tal cual las rejillas `minmax(0, 1fr)` ya usadas en las vistas — es lo que menos añade y no exige decidir un ancho máximo arbitrario que la especificación no menciona. Si en tablets muy anchas se ve demasiado aireado, se ajusta más adelante con una sola regla (`max-width` en `<main>`), sin tocar el resto del sistema.

2. **`:hover` de botones, filas de menú/tabla y tarjetas**. Solo está definido el `:hover` de un enlace de texto (§3).
   - Opciones: (a) sin `:hover` propio, dejar que el estado "presionado" táctil sea la única realimentación (la app es para tablet, uso con el dedo, no con ratón); (b) oscurecer ligeramente el fondo (mezclar con `tinta` un 4-6 %) en botones/filas/tarjetas interactivas, para cuando se use con lápiz óptico o ratón (Chrome de escritorio en desarrollo); (c) cambiar solo el borde a `oro` en hover, igual que el estado activo del menú.
   - **Recomendación**: (b), un oscurecido sutil del fondo (`filter: brightness(0.97)` o mezcla equivalente) en los elementos con `role="button"`/fila clicable, más notorio en desarrollo con ratón y prácticamente invisible al tacto — no contradice nada de §10 y da una pista visual barata sin inventar un color nuevo.

3. **`:focus-visible` de teclado** (navegación con teclado externo o con el conmutador de accesibilidad de Android), distinto del "campo activo" de un selector abierto (§4, punto 2).
   - Opciones: (a) reusar el mismo tratamiento que el campo activo (borde 2px `oro`) en cualquier control enfocable; (b) un anillo de foco aparte (`outline`) en `oro`, fuera de la caja, para no competir con el borde de error; (c) delegar en el foco por defecto del navegador.
   - **Recomendación**: (a), border/outline de 2px en `oro` en todo lo enfocable (excepto que ya tenga borde de error `lacre`, que manda) — consistente con el único patrón de foco que la vista sí define, y evita crear un segundo lenguaje visual para "foco" y "activo".

4. **Botón `disabled`**. §6.4 (L816) dice que el botón principal se desactiva mientras haya errores, pero ninguna vista muestra su aspecto.
   - Opciones: (a) `opacity: 0.6` sobre el botón entero, igual que la casilla desactivada (§4, punto 3) — reutiliza el único patrón de "desactivado" que sí existe; (b) fondo `pliegue`/texto `suave` sin opacidad; (c) mantener el color pero con `cursor: not-allowed` y sin cambio visual, apoyándose solo en que no reacciona al tacto.
   - **Recomendación**: (a), `opacity: 0.6` + `pointer-events: none` — coherente con la casilla desactivada del propio generador, cero tokens nuevos.

5. **Borde de un campo con error de validación**. §6.4 (L815) fija el mensaje («en lacre con icono bajo el campo») pero no dice si el campo en sí cambia de borde.
   - Opciones: (a) sin cambio en el borde del campo, solo el mensaje bajo él (más fiel a lo literal de la especificación); (b) borde `1px` → `lacre` en el campo con error, igual patrón que el borde `oro` del campo activo; (c) borde `lacre` solo mientras el campo tiene el foco y error a la vez.
   - **Recomendación**: (b), borde `lacre` en el campo con error — es el uso más habitual de un color de "peligro" ya reservado en el sistema (`lacre` es exactamente «avisos urgentes… acción destructiva»), y hace más fácil detectar qué campo falla en una tablet con varios campos por fila.

6. **Marcas del calendario mensual a 12px** (§10 L1399, «única excepción»): no aparece en ninguna vista ya generada de las que he podido inspeccionar en este encargo (la vista `Calendario.dc.html` no formaba parte de mi alcance de lectura detallada). Dejo constancia de que el tamaño está en la tabla de §10 pero no lo he podido verificar contra una vista; **recomiendo** que quien construya P3/el calendario confirme el valor exacto contra `Calendario.dc.html` antes de fijar la variable CSS correspondiente (yo la incluyo en la sección 8 tal cual la da §10).

7. **Pesos de Cormorant Garamond a cargar**. El enlace de Google Fonts que usa el generador (`design/build-artboards.mjs` L91, solo para previsualizar las vistas en el navegador) pide los pesos 500/600/700 en redonda y 500 en cursiva, pero en todas las vistas que he inspeccionado solo se usan realmente el 600 redondo (títulos) y el 500 cursivo (la entradilla de P0 y una nota narrativa de evento). No he visto 500 ni 700 redondos en uso.
   - Opciones: (a) autoalojar solo lo evidenciado (600 redondo + 500 cursivo), más ligero; (b) autoalojar los cuatro pesos que pedía el enlace de Google Fonts, por si una pantalla de una fase posterior los usa y aún no la he revisado.
   - **Recomendación**: (a) para arrancar —Fontsource permite añadir un peso más adelante con una sola línea de import si una pantalla nueva lo necesita, así que no hay coste de cambiarlo después— pero lo marco como duda porque no he revisado las ~50 vistas al completo (mi alcance era el marco y el sistema visual, no cada pantalla).

## 8. Variables CSS propuestas

```css
:root {
  /* Colores — superficies */
  --ga-papel: #F2E8D0;
  --ga-vitela: #FBF6E9;
  --ga-pliegue: #E6D8B8;
  --ga-borde: #D4C29C;
  --ga-campo: #FFFDF6;

  /* Colores — texto */
  --ga-tinta: #2B2118;
  --ga-tinta-suave: #6B5A45;

  /* Colores — acento y semántica */
  --ga-lacre: #8E2A1F;
  --ga-lacre-tinte: #F4DED6;
  --ga-oro: #A9812F;
  --ga-oro-oscuro: #7A5B1F;
  --ga-oro-tinte: #F1E3BF;
  --ga-bosque: #3F5E3A;
  --ga-bosque-tinte: #DFE7D5;

  /* Velos de diálogo (sobre --ga-tinta) */
  --ga-velo: rgba(43, 33, 24, 0.55);
  --ga-velo-apilado: rgba(43, 33, 24, 0.35);

  /* Sombras */
  --ga-sombra-dialogo: 0 24px 60px rgba(43, 33, 24, 0.35);
  --ga-sombra-dialogo-apilado: 0 24px 60px rgba(43, 33, 24, 0.45);
  --ga-sombra-flotante: 0 12px 32px rgba(43, 33, 24, 0.28);

  /* Tipografía — familias (con la fuente de sistema como último recurso) */
  --ga-fuente-titulo: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --ga-fuente-ui: 'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif;
  --ga-fuente-marca: 'Cinzel', 'Trajan Pro', Georgia, serif;

  /* Tipografía — escala de tamaño (§10 + observado en las vistas) */
  --ga-texto-lectura: 15px;
  --ga-texto-etiqueta: 14px;
  --ga-texto-secundario: 13px;
  --ga-texto-calendario: 12px; /* única excepción de §10; verificar contra Calendario.dc.html (duda 6) */
  --ga-texto-cifra-clave: 28px;
  --ga-texto-campo: 16px;
  --ga-texto-h2-panel: 23px;
  --ga-texto-h1-pantalla: 36px;
  --ga-texto-h2-dialogo: 32px;
  --ga-texto-marca-app: 44px;   /* nombre "Gestión de Aldeas" en P0 */
  --ga-texto-marca-partida: 14px; /* nombre de la partida en la barra superior */

  /* Pesos */
  --ga-peso-regular: 400;
  --ga-peso-fuerte: 600;
  --ga-peso-resaltado: 700; /* coincidencia resaltada en un buscador de selector */

  /* Radios */
  --ga-radio-sm: 4px;   /* barra de progreso */
  --ga-radio-casilla: 5px;
  --ga-radio-md: 6px;   /* botón, campo, ítem de menú */
  --ga-radio-lg: 8px;   /* panel, aviso, segmentos */
  --ga-radio-xl: 10px;  /* diálogo, tarjeta */
  --ga-radio-pildora: 999px; /* badge, chip, interruptor: altura/2 en cada caso, pero 999px cubre cualquier altura */

  /* Espaciado — base táctil y ritmo del marco */
  --ga-toque-min: 44px;
  --ga-alto-barra-superior: 64px;
  --ga-ancho-menu: 232px;
  --ga-espacio-2: 2px;
  --ga-espacio-4: 4px;
  --ga-espacio-6: 6px;
  --ga-espacio-8: 8px;
  --ga-espacio-10: 10px;
  --ga-espacio-12: 12px;
  --ga-espacio-16: 16px;
  --ga-espacio-18: 18px;
  --ga-espacio-20: 20px;
  --ga-espacio-28: 28px;

  /* Bordes */
  --ga-borde-fino: 1px solid var(--ga-borde);
  --ga-borde-activo: 2px solid var(--ga-oro);
  --ga-borde-error: 1px solid var(--ga-lacre); /* propuesto, duda 5 */
  --ga-filete-doble: 3px double var(--ga-borde);

  /* Pantalla de diseño */
  --ga-lienzo-ancho: 1180px;
  --ga-lienzo-alto: 820px;
  --ga-minimo-ancho: 1024px;
  --ga-minimo-alto: 700px;
}
```

*Nota sobre el modo oscuro*: §11 (L1424) dice explícitamente que el modo oscuro está fuera de alcance («por ahora»). No propongo bloque `@media (prefers-color-scheme: dark)` para estas variables del dominio de la app (solo aplicaría, si acaso, a un posible *shell* de artefacto, que no es este caso: esto es la propia app).

## 9. Carga de las tres fuentes sin Google Fonts

Las tres familias (Cormorant Garamond, Source Sans 3, Cinzel) están publicadas bajo la **SIL Open Font License 1.1** en Google Fonts (Cormorant Garamond de Catharsis Fonts/Christian Thalmann; Source Sans 3 de Adobe, continuación de Source Sans Pro; Cinzel de Natanael Gama). *Aviso*: esto es conocimiento general mío, no algo que haya podido verificar contra un archivo del repositorio ni contra internet en este encargo (no tengo acceso de red aquí) — quien implemente la fase debe confirmar el texto exacto de la licencia (`OFL.txt`) que acompaña a cada familia al descargarla, antes de incluirla en el repositorio.

**Propuesta**:
1. Autoalojar con los paquetes **Fontsource** (`@fontsource/cormorant-garamond`, `@fontsource/source-sans-3`, `@fontsource/cinzel`): cada paquete trae los `.woff2` ya subconjuntados por *charset* (`latin`, `latin-ext`, etc.) con sus reglas `@font-face` y `unicode-range`, y el `OFL.txt` correspondiente — así no hay que subconjuntar a mano ni depender de la CDN de Google en tiempo de ejecución. Es la vía más simple para «sin depender de Google Fonts» y compatible con el uso sin conexión (`vite-plugin-pwa` puede precachear los `.woff2` como cualquier otro asset).
2. **Formato**: solo `woff2` (el único que hace falta: el público es Chrome para Android, que lo soporta desde hace años; no hace falta `woff` ni `ttf` de repuesto).
3. **Subconjunto**: `latin` + `latin-ext` (Fontsource los separa en dos archivos con `unicode-range`, y el navegador solo descarga el que necesita). `latin-ext` cubre las vocales con tilde y la eñe de los textos visibles en castellano (recuerdo: `CLAUDE.md` exige texto visible con tildes, aunque los identificadores de código no las lleven). Falta comprobar que `latin-ext` cubre también el signo menos U+2212 y las comillas angulares «» que usa la especificación en sus propios ejemplos de texto (`CLAUDE.md`: «signo «−» (U+2212)»); si el subconjunto de Fontsource no los incluye, hay que añadir un `@font-face` adicional con esos codepoints tomado de la fuente completa, o sustituir esos glifos por los de la fuente de música del sistema (`Segoe UI`/`Roboto`) en el *fallback* — lo dejo como verificación técnica para quien instale las fuentes, no como duda de diseño.
4. **Pesos y estilos a instalar** (según el uso real medido en la sección 2, no el que pedía el enlace de Google Fonts del generador — ver duda 7):
   - Cormorant Garamond: **600** normal, **500** cursiva.
   - Source Sans 3: **400**, **600**, **700** normales (los tres se usan: 400 en texto de lectura, 600 en la mayoría de la interfaz, 700 en el resaltado de coincidencias de un buscador).
   - Cinzel: **600** normal (es el único peso que existe en el diseño, y Cinzel en general solo se publica en unos pocos pesos).
5. **Declaración** (ejemplo con Fontsource, en el punto de entrada de la app, p. ej. `src/main.tsx` o un CSS global):
   ```ts
   import '@fontsource/cormorant-garamond/600.css';
   import '@fontsource/cormorant-garamond/500-italic.css';
   import '@fontsource/source-sans-3/400.css';
   import '@fontsource/source-sans-3/600.css';
   import '@fontsource/source-sans-3/700.css';
   import '@fontsource/cinzel/600.css';
   ```
   Cada import añade sus propias reglas `@font-face` con `font-display: swap` (comportamiento por defecto de Fontsource), evitando texto invisible mientras carga la fuente. Como la app funciona sin conexión, conviene que `vite-plugin-pwa` incluya los `.woff2` de `node_modules/@fontsource/*` en el precache (patrón de *glob* típico: `**/*.woff2`), para que no dependan de red ni siquiera en la primera carga tras instalar la PWA.

## 10. El marco: barra superior y menú lateral

Coincide exactamente entre §5 (narrativa) y `Main.dc.html`/`barraSuperior`+`barraLateral` (implementación); cito ambos.

### 10.1 Barra superior (64px de alto, ocupa las dos columnas del grid)

Fondo `vitela`, borde inferior `1px solid borde` (`barraSuperior`, L247). De izquierda a derecha, cuatro zonas en una fila (`display: flex; align-items: center; gap: 20px`):

1. **Zona de marca** (ancho fijo 232px, igual que el menú, con borde derecho `1px solid borde` para alinear visualmente con la columna del menú): emblema (22px) + nombre de la partida en Cinzel 14px/600, `letter-spacing: 0.05em`, color `tinta`. *(«La Sombra del Este» en el ejemplo.)*
2. **Zona de fecha** (`flex: 1`, se lleva el espacio sobrante): fecha completa en Cormorant Garamond 28px/600 color `tinta` («12 de abril de 1640 T.E.») + día de la semana en Source Sans 3 14px color `tinta-suave` («Jueves»), con `gap: 12px` entre ambos.
3. **Próximo aviso** (§5 L204-207, prioridad: 1º el aviso rojo más cercano con icono de alerta, 2º el siguiente elemento del calendario, 3º «Nada previsto esta semana» si no hay nada en 7 días): icono (`alerta` en `lacre` si es una alerta, `reloj` en `suave` si no) + texto 14px, peso 600 y color `lacre` si es alerta, peso 400 y color `suave` si no. *(«Mañana: salarios de Bree» en el ejemplo, sin alerta.)*
4. **Botón «Avanzar días»**: botón variante `principal` (fondo `oro-oscuro`, texto `vitela`, mismo color de borde que el fondo) con icono `reloj_arena` a la izquierda del texto — la única acción global visible en toda pantalla de una partida (§5 L204: «La barra superior es igual en todas las pantallas de una partida»).

*(En la fase 6a esta barra se implementa sin el próximo aviso "vivo" ni "Avanzar días" funcional —dependen del motor de fases 3-5—, pero el hueco, el orden de las cuatro zonas y sus estilos son exactamente los de esta sección; solo cambia qué datos rellenan las zonas 2 y 3 y si el botón 4 hace algo.)*

### 10.2 Menú lateral (232px de ancho, columna 1, filas 2+)

Fondo `pliegue`, borde derecho `1px solid borde`, `padding: 6px 12px 10px` (`barraLateral`, L234). Estructura vertical (de arriba abajo), con `display:flex; flex-direction: column`:

1. **Etiqueta de grupo «PARTIDA»** (Cinzel 13px/600, `letter-spacing: 0.1em`, color `suave`, alto 30px).
2. **«Inicio»** — ítem de 44px con icono `casa`.
3. **«Calendario»** — ítem de 44px con icono `calendario`.
4. Separador de 6px de alto (hueco, sin contenido).
5. **Etiqueta de grupo «DOMINIOS»** (mismo estilo que «Partida»).
6. **Un ítem de dominio por cada asentamiento y por el personaje**, en este orden fijo: **personaje** (Tharan) primero, luego los **asentamientos** en el orden en que se crearon (Bree, Archet…) (§5: «Tharan (personaje) ▸ · Bree (pueblo) ▸ · Archet (aldea) ▸»). Cada cabecera de dominio (44px) muestra: icono del dominio (`usuario` si es personaje, `torre` si es asentamiento) + nombre + tipo en 13px `suave` («personaje», «pueblo», «aldea») + un *chevron* que apunta a la derecha (`derecha`) si está plegado o hacia abajo (`abajo`) si está desplegado.
   - **Solo un dominio puede estar desplegado a la vez** (§5 L208). Al desplegarse, sus entradas de submenú aparecen debajo, con sangría (`sangria: true` → `padding-left: 36px` en vez de 12px) y el mismo componente `itemNav` de 44px que «Inicio»/«Calendario», con `activo: true` en la entrada de la sección abierta.
   - Entradas del submenú de **Tharan** (personaje, 7 entradas, §5 L210): Resumen · Bolsa y movimientos · Inventario · Deudas y préstamos · Gastos e ingresos · Inversiones · Hechizos.
   - Entradas del submenú de un **asentamiento** (8 entradas, §5 L211-212): Resumen · Tesorería · Población · Personal · Producción · Animales · Comercio · Eventos.
   - Con muchos asentamientos, la lista de Dominios se desplaza (scroll interno), no el menú entero (§5 L209).
7. **«+ Añadir asentamiento»** — ítem de 44px con icono `mas`, en color `suave` (más apagado que un ítem normal: usa `tenue: true`, que pone el texto en `tinta-suave` en vez de `tinta`, aunque su icono ya iba en `suave` igual que cualquier ítem inactivo) — visualmente se lee como una acción secundaria, no como una entrada de navegación más.
8. **Espaciador flexible** (`flex: 1`) que empuja lo siguiente al fondo del menú.
9. **«Ajustes y copias»** — ítem de 44px con icono `ajustes`, anclado al final.

**Estado activo de un ítem** (`itemNav`, L225): fondo `vitela` + borde `1px solid oro` + texto 600 `tinta` + icono en `oro-oscuro`, frente a fondo transparente + borde transparente + texto 400 `tinta` (o `tinta-suave` si `tenue`) + icono en `tinta-suave` cuando no está activo. El borde transparente en el estado inactivo (en vez de "sin borde") es deliberado: evita que el texto se desplace 1px al activarse.

**Orden fijo de las cinco zonas del menú**: Partida (Inicio, Calendario) → Dominios (personaje, luego asentamientos, luego «Añadir asentamiento») → espaciador → Ajustes y copias. Este orden no cambia entre pantallas; lo único que cambia es qué entrada está marcada como activa y qué dominio, si alguno, está desplegado.

### 10.3 Zona de contenido (`<main>`)

`grid-row: 2; grid-column: 2`, `padding: 20px 28px 22px`, `gap: 18px` entre los bloques verticales que meta cada pantalla (cabecera de pantalla, avisos, tarjetas, paneles…). No es parte del "marco" en sentido estricto —cada pantalla decide su propio contenido— pero fijo su relleno y separación porque son constantes en todas las vistas y las necesitará cualquier pantalla que se monte dentro del marco.

## 11. Inconsistencias encontradas

1. **Pesos de Cormorant Garamond declarados frente a usados**: el enlace de Google Fonts que carga el propio generador para previsualizar (`build-artboards.mjs` L91) pide `ital,wght@0,500;0,600;0,700;1,500` (tres pesos en redonda + uno en cursiva), pero en todas las vistas que he podido revisar en este encargo solo aparecen usados el 600 redondo y el 500 cursivo (sección 2 y duda 7). No es un error que afecte al resultado visual de las vistas (los pesos de más simplemente no se usan), pero si se copia ese enlace tal cual para la app real se cargaría peso de fuente de sobra.
2. **Color del filete doble no fijado por §10**: §10 dice que hay «filetes dobles en cabeceras de panel» dentro del párrafo de «ornamento contenido», en el mismo párrafo que menciona `oro` como color de «ornamentos» en su tabla de colores (L1390), pero el filete que implementa el generador usa el color **borde** (`#D4C29C`), no **oro** (`#A9812F`) (sección 3). No hay contradicción textual explícita —§10 no dice qué color lleva el filete—, pero si alguien lee solo la tabla de colores podría esperar oro; documento el valor real (borde) porque es el que hay que replicar para que coincida con la vista.
3. **Tamaño de las marcas del calendario mensual (12px) sin verificar contra una vista**: está en la tabla de §10 (L1399) pero mi alcance de lectura no cubrió `Calendario.dc.html` en detalle (duda 6); lo doy por válido porque viene literalmente de la especificación, pero no he podido confirmarlo contra la implementación del generador como sí he hecho con el resto de tamaños.
