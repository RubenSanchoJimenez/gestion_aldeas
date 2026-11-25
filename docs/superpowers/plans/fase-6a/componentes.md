# Componentes comunes de la interfaz · fase 6a

Informe de diseño para implementar en `src/interfaz` los componentes comunes de la fase 6a: botón, panel, tabla,
campo de importe, selector con buscador, segmentos, diálogo y diálogo apilado, confirmación de borrado J2d, aviso,
campo de fecha y campo de frecuencia. **No se ha tocado el repositorio `C:/Proyectos/GA/gestion_aldeas`**: solo se ha
leído.

**Fuentes usadas** (se cita sección/línea o vista en cada dato):

- Especificación: `docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md` (citada como «espec.», con su línea).
- Generador de vistas: `design/build-artboards.mjs` (citado como «mjs», con su línea) — de ahí salen las medidas,
  colores y tipografías exactas, porque cada `.dc.html` de `design/artboards/` es su salida ya renderizada con
  estilos en línea. Cuando la vista aporta un dato que el generador no deja ver directamente (texto compuesto,
  combinación de componentes), cito también el `.dc.html`.
- Plan de fases: `docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md` («Fase 6», líneas 97-106).
- Decisiones: `docs/decisiones.md`.
- Dominio ya construido en `src/dominio/` (fases 1 y 2): cito archivo y función.

**Convenciones del sistema visual** que usan todos los componentes (espec. §10, líneas 1379-1406; tokens de color
en `mjs:11-15` como objeto `C`, tipografías en `mjs:16-20` como objeto `F`):

| Token | Valor | Variable CSS propuesta |
|---|---|---|
| papel | `#F2E8D0` | `--papel` |
| vitela | `#FBF6E9` | `--vitela` |
| pliegue | `#E6D8B8` | `--pliegue` |
| borde | `#D4C29C` | `--borde` |
| campo (fondo de entrada) | `#FFFDF6` | `--campo-fondo` (solo en `mjs:12`, no está en la tabla de la espec.; **duda**, ver más abajo) |
| tinta | `#2B2118` | `--tinta` |
| tinta-suave | `#6B5A45` | `--tinta-suave` |
| lacre | `#8E2A1F` | `--lacre` |
| oro | `#A9812F` | `--oro` |
| oro-oscuro | `#7A5B1F` | `--oro-oscuro` |
| bosque | `#3F5E3A` | `--bosque` |

Además, el generador usa tintes de fondo para las cajas de tono (`mjs:14`, no documentados letra a letra en la
espec. pero derivados de sus propios colores): `lacre-tinte #F4DED6`, `oro-tinte #F1E3BF`, `bosque-tinte #DFE7D5`, y
`TONO` (`mjs:22`) empareja cada tono con su fondo y su texto: `lacre → [lacre-tinte, lacre]`, `oro → [oro-tinte,
oro-oscuro]`, `bosque → [bosque-tinte, bosque]`, `neutro → [pliegue, tinta-suave]`. Se usan en el badge y en el
aviso.

- Tipografías (espec. línea 1394; `mjs:16-20`): títulos *Cormorant Garamond* 600 (`F.titulo`), interfaz y cifras
  *Source Sans 3* con `font-variant-numeric: tabular-nums` en toda cifra (`mjs:21`, constante `num`), *Cinzel* en el
  nombre de la app, de la partida y en las etiquetas de grupo (`F.marca`).
- Tamaños de texto (espec. líneas 1395-1400): lectura 15 px, etiquetas/notas/subtítulos de cifra 14 px, etiquetas
  secundarias y cabeceras de tabla 13 px, marcas del calendario 12 px (única excepción), cifras clave ≥ 28 px.
- Áreas táctiles ≥ 44 px (espec. línea 1401); el interruptor va dentro de un área de 44 px.
- Velos: diálogo 55 % de tinta; segundo velo de un diálogo apilado, 35 % (espec. línea 1402; `mjs:265,277` usan
  literalmente `rgba(43, 33, 24, 0.55)` y `rgba(43, 33, 24, 0.35)`, que es `tinta` en rgb).
- Radio de esquina: 6 px en botones/campos, 8 px en paneles/avisos, 10 px en diálogos y tarjetas (constante en
  todo `mjs`, no está en la espec. como regla general; **duda**, ver más abajo).

---

## 1. Botón (y variantes)

**De dónde sale**: no tiene entrada propia en §6; es la pieza base de casi todas las pantallas. Su forma exacta
sale de la función `btn` (`mjs:106-115`) y de `btnIcono` (`mjs:116-117`) y `enlace` (`mjs:118-119`), que son variantes
del mismo componente.

### Propiedades

- `texto` (string, obligatorio salvo en el botón solo-icono).
- `variante`: `principal | secundario | fantasma | peligro | peligroLleno` (nombres tomados literalmente de
  `mjs:107-113`; en `btnIcono` solo hay `secundario | fantasma`, `mjs:116`).
- `icono`: nombre de icono opcional, a la izquierda del texto (`ic(icono, 18)`, `mjs:114`); el botón solo-icono
  (`btnIcono`) lo lleva a 20 px (`mjs:117`) y ocupa un cuadrado de 44×44 sin texto.
- `ancho`: opcional, fuerza un ancho fijo (`mjs:106,114`, parámetro `ancho`); sin él, el botón se ajusta al
  contenido (`display: inline-flex`).
- `deshabilitado`: no está en el generador (los artboards son estáticos), pero lo exige la espec.: «El botón
  principal se desactiva mientras haya errores» (línea 816) y en varios sitios («Crear y elegir» desactivado, «Eliminar
  definitivamente» desactivado hasta marcar la casilla).
- `onPress`.
- El **enlace** (`enlace`, `mjs:118-119`) es una variante de texto sin fondo ni borde, en oro oscuro, 44 px de alto,
  600 de peso: se usa para acciones secundarias en cabeceras y pies («Editar equivalencias», «Ver almacén», «Ver
  todos (12)»).

### Estados

- Cada variante fija su color de fondo/borde/texto (`mjs:107-113`):
  - `principal`: fondo `oro-oscuro`, texto `vitela`, borde `oro-oscuro`. Es el botón de guardar/confirmar/avanzar.
  - `secundario`: fondo `vitela`, texto `tinta`, borde `borde`. Es el botón por defecto (Cancelar, Abrir…).
  - `fantasma`: transparente, texto `tinta`, borde transparente. Para acciones terciarias (x de cerrar, Cancelar en
    cabeceras).
  - `peligro`: transparente, texto `lacre`, borde `lacre`. «Eliminar» dentro de un formulario de edición.
  - `peligroLleno`: fondo `lacre`, texto `vitela`, borde `lacre`. «Eliminar definitivamente» en J2d (ver §8).
- **Deshabilitado**: no está definido a nivel de píxel en ninguna vista (todas muestran botones activos). La espec.
  solo dice que el principal «se desactiva» (línea 816) sin dar su aspecto. Ver duda D-C1 al final.
- **Foco de teclado**: no hay anotación específica; se sigue la regla general de foco visible con el color `oro`
  (coherente con «oro: … campo activo», línea 1390).

### Comportamiento de teclado y foco

- Todos los botones miden 44 px de alto (área táctil mínima, línea 1401), con `padding: 0 18px` (`mjs:114`).
- El botón principal de un diálogo responde a Intro cuando el formulario es válido (así lo dice el patrón del alta
  rápida: «Intro crea si todo es válido; si falta el grupo, Intro cierra el teclado y lleva al campo Grupo», línea
  958); se aplica igual al resto de diálogos por coherencia, aunque solo está escrito para el alta rápida.
- El botón x de cabecera de diálogo (`btnIcono('x', 'fantasma')`, `mjs:270`) equivale a Cancelar (espec. línea 945).

### Textos literales usados en las vistas de la fase 6a

«Nueva partida», «Importar copia», «Continuar», «Abrir», «Exportar», «Cancelar», «Siguiente: personaje», «Atrás»,
«Crear partida», «Editar equivalencias», «Añadir otra moneda», «Gestionar listas», «Exportar copia», «Importar
copia», «Cambiar de partida», «Borrar partida», «Avanzar días» (`SelectorPartidas.dc.html`, `NuevaPartida.dc.html`,
`NuevaPartidaPersonaje.dc.html`, `Ajustes.dc.html`; `mjs:308-325,331-362,1543-1566,600-640`).

### Validaciones que muestra

El propio botón no valida: refleja el estado de validez del formulario que lo contiene (ver «Campo de importe»,
«Campo de fecha» y «Campo de frecuencia» más abajo) y el patrón general de §6.4 (línea 816): «El botón principal se
desactiva mientras haya errores, salvo el saldo negativo, que pide confirmación» — ese caso especial cambia el
**pie** entero, no el botón (ver §7, «Diálogo»).

### Cómo se ve en las vistas de la fase 6a

- P0 `SelectorPartidas.dc.html`: «Importar copia» (fantasma, icono `subir`) y «Nueva partida» (principal, icono
  `mas`) en la cabecera; por tarjeta, icono editar (`btnIcono` fantasma), «Exportar» (fantasma, icono `bajar`) y
  «Continuar»/«Abrir» (principal en la partida activa, secundario en las demás) (`mjs:319,303-305`).
- P1 `NuevaPartida.dc.html`: «Cancelar» (fantasma, icono `x`) en la cabecera del asistente y «Siguiente: personaje»
  (principal) al pie (`mjs:335,360`).
- P1b `NuevaPartidaPersonaje.dc.html`: «Atrás» (secundario, icono `izquierda`) y «Crear partida» (principal)
  (`mjs:1564`); «Añadir otra moneda» (fantasma, icono `mas`) dentro de la bolsa inicial (`mjs:1561`).
- P6 `Ajustes.dc.html`: «Gestionar listas» (secundario, icono `derecha`), «Exportar copia» (secundario, icono
  `bajar`), «Importar copia» (fantasma, icono `subir`), «Cambiar de partida» (secundario, icono `cambio`), «Borrar
  partida» (**peligro**) (`mjs:625,633,637`).

### Funciones del dominio que usa

Ninguna directamente: es un componente de presentación puro. Su estado `deshabilitado` normalmente refleja el
resultado de validar el formulario que lo envuelve (por ejemplo `validarFecha` o `validarRecurrencia`, ver más
abajo), pero el botón en sí no llama a nada de `src/dominio`.

---

## 2. Panel

**De dónde sale**: `panel` (`mjs:140-146`), con la cabecera `cabecera` (`mjs:133-139`, para el título de pantalla) y
las filas `fila`/`lista` (`mjs:158-160`) y `tabla` (ver §3) para el contenido.

### Propiedades

- `titulo` (string): en *Cormorant Garamond* 600, 23 px, dentro de una cabecera de al menos 56 px con «filete doble»
  (`border-bottom: 3px double borde`, ornamento de §10 línea 1403).
- `accion`: contenido opcional a la derecha de la cabecera (uno o varios botones, un desplegable, segmentos…).
- `pad`: relleno del cuerpo; por defecto `4px 20px 10px` (`mjs:140`), pero cada panel de la fase 6a lo ajusta
  (P6 usa `4px 20px 14px` en «Copias de seguridad», `mjs:635`; P7/Listas usa `0 10px 10px`, `mjs:659` — este último
  fuera de alcance de la 6a, pero confirma que `pad` es una propiedad real, no fija).
- `children`/`cuerpo`: contenido libre.
- Fondo `vitela`, borde 1 px `borde`, radio 8 px (`mjs:140`).

### Estados

- No es interactivo por sí mismo. Puede quedar vacío: la espec. exige un **estado vacío** con «frase breve» y, si
  aplica, «Nada en curso» (línea 820) — no hay panel vacío en las vistas de P0/P1/P1b/P6, pero P4/P5 muestran el
  patrón de grupo con total (ver «Tabla»).

### Comportamiento de teclado y foco

No aplica: es un contenedor. Cuando envuelve una tabla o lista con foco, el foco se mueve dentro de su cuerpo
(`overflow` vertical si hace falta, línea 821: «El contenido principal se desplaza en vertical con la cabecera de
pantalla fija»).

### Textos literales usados en la fase 6a

Títulos de panel en las vistas del alcance: «Monedas», «Listas y catálogos», «Calendario», «Copias de seguridad»,
«Partida» (P6, `mjs:606-637`); «Tus partidas» (P0, encabezado h2 dentro del bloque central, no un `panel()` con
filete — ver duda D-C2).

### Validaciones que muestra

Ninguna propia. Repite las notas/avisos que le pasen como hijos (ver «Aviso»).

### Cómo se ve en las vistas de la fase 6a

- P6 `Ajustes.dc.html`: dos columnas (`columnas('minmax(0, 1.1fr) minmax(0, 1fr)', …)`, `mjs:605`) con los paneles
  «Monedas» + «Listas y catálogos» a la izquierda y «Calendario» + «Copias de seguridad» + «Partida» a la derecha
  (`mjs:600-639`).
- P0 `SelectorPartidas.dc.html` no usa `panel()`: es una página centrada sin marco de partida (`doc(...)` directo,
  `mjs:309`), con un `h2` simple «Tus partidas» y las tarjetas de partida debajo. **El panel como tal no aparece en
  P0**; se documenta aquí porque P6 sí lo usa y porque es la base de la tabla (§3).

### Funciones del dominio que usa

Ninguna directamente; es contenedor de presentación. El **panel «Copias de seguridad»** de P6 sí envuelve
funcionalidad de la fase 2 (`src/datos/copia/`, `src/datos/repositorio.ts`) para exportar/importar, pero eso es
lógica del formulario/pantalla, no del componente panel.

---

## 3. Tabla

**De dónde sale**: `tabla` (`mjs:161-172`) para tablas con cabecera de columnas; `fila`/`lista` (`mjs:158-160`) para
listas de pares etiqueta-valor sin cabecera (la variante que usa P6 para «Monedas» en dos formatos distintos: la
tabla propiamente dicha para «Monedas», y `lista(...)` para «Calendario»).

### Propiedades

- `columnas`: array de `{ t: texto de cabecera, w?: ancho CSS, der?: alinear a la derecha }` (`mjs:161-166`; `der`
  se usa para importes).
- `filas`: array de arrays de celdas (nodos, no solo texto: pueden llevar `dos(...)` para dos líneas o `lineas(...)`
  para varias, `mjs:128-132`).
- `alto`: alto de fila, 44 px por defecto (`mjs:161`); P6 lo fuerza a 44 en «Monedas» (`mjs:619`, tabla de
  equivalencias); P7 usa 56 px porque sus filas llevan dos líneas (`mjs:674`, fuera de alcance de la 6a pero
  confirma que `alto` es configurable).
- `total`: fila final opcional con filete doble encima y negrita (`mjs:163,170` — `esTotal`); no aparece en P0/P1/
  P1b/P6.
- Cabecera de columna: 38 px de alto, 13 px, mayúsculas, `letter-spacing: 0.04em`, color `tinta-suave` (`mjs:164`).
- La **lista de pares** (`fila`/`lista`, usada en «Calendario» y «Última copia exportada» de P6) es una variante sin
  columnas: `izquierda` (con `sub` opcional en 13 px debajo) y `derecha`, con filete simple entre filas salvo la
  última (`mjs:158-160`).

### Estados

- **Editable por fila**: la espec. exige que toda tabla de registros permita añadir/editar/eliminar (línea 693) con
  un botón «editar» de 44 px al final de cada fila (`mjs:759`, `listaEditable`, fuera de P0/P1/P1b/P6 pero
  documentado en §6.4). En P6, la tabla «Monedas» es de **solo lectura** (equivalencias fijas tras crear la
  partida, línea 747), así que sus celdas de la derecha muestran el valor con `campoCorto` (`mjs:599,611-617`), no
  un campo editable.
- **Estado vacío**: «Nada en curso» / cifras a 0 (línea 820); no se da en P0/P1/P1b/P6 con datos de ejemplo, pero
  P0 vacío (sin partidas) es justamente este caso: «estado vacío con “Nueva partida” e “Importar copia” destacados»
  (línea 264).

### Comportamiento de teclado y foco

- Sin edición en línea en el alcance de la 6a (las tablas de P6 son de solo lectura). Cuando la tabla admita
  edición (fases posteriores), el foco entra por el botón «editar» de la fila, que abre el formulario
  correspondiente (patrón general de §6.4).
- Desplazamiento: «Los libros (J2 y A2) se cargan por meses» (línea 823) — no aplica a P6, cuyas tablas son cortas
  y no paginan.

### Textos literales usados en la fase 6a

Cabeceras de «Monedas» (P6): «Moneda», «Abrev.», «Equivale a» (`mjs:609`). Filas: Mithril/mm, Oro/mo, Plata/mp,
Bronce/mb, Cobre/mc, Estaño/me, Hierro/mh (unidad base) (`mjs:611-617`), con las equivalencias por defecto de
`EQUIVALENCIAS_POR_DEFECTO` (`src/dominio/dinero/monedas.ts:26-33`: 1 mm = 100 mo, 1 mo = 10 mp, 1 mp = 10 mb, 1 mb
= 10 mc, 1 mc = 10 me, 1 me = 10 mh). Fila de la lista «Calendario»: «Calendario» / «Actual, con los meses de hoy»;
«Fecha actual» / «Jueves, 12 de abril de 1640 T.E.»; «Ración de víveres» / «1 saco de 30 kg por persona al mes»
(`mjs:628`). «Última copia exportada» / fecha (`mjs:632`).

### Validaciones que muestra

Ninguna en las tablas de solo lectura de P6. Cuando la tabla es editable (fuera de la 6a), las validaciones viven en
el formulario de edición de cada fila, no en la tabla.

### Cómo se ve en las vistas de la fase 6a

- P6 `Ajustes.dc.html`: tabla «Monedas» de 7 filas × 3 columnas con alto de fila 44 px (`mjs:608-620`); lista
  «Calendario» de 3 filas de 40 px (`mjs:628`); fila suelta «Última copia exportada» de 40 px dentro del panel
  «Copias de seguridad» (`mjs:632`).

### Funciones del dominio que usa

- La tabla «Monedas» pinta directamente `EQUIVALENCIAS_POR_DEFECTO` o las equivalencias guardadas en la partida
  (`src/dominio/dinero/monedas.ts:6-33`, `NOMBRE_MONEDA` y `Equivalencias`); no hace cálculos propios.
- La fila «Fecha actual» usa `formatearFecha` (`src/dominio/calendario/formatoFecha.ts:48`, con `{ edad: true,
  diaSemana: true }` para dar «Jueves, 12 de abril de 1640 T.E.», que junta `ABREVIATURA_EDAD` y `NOMBRES_DIA`
  del mismo archivo).
- Cuando la tabla muestre importes (fuera del alcance de solo-lectura de P6, pero como patrón general de cualquier
  tabla de registros), usa `formatearOro` (`src/dominio/dinero/formato.ts:39`) para cada celda de importe.

---

## 4. Campo de importe

**De dónde sale**: espec. §3, líneas 100-119 (comportamiento y cálculo) y línea 101 («Campo de importe (componente
único): cantidad + moneda (selector) + “= X mo” calculado al momento»); generador `importeFila`/`importe`
(`mjs:1377-1383`), usado también en P1b para la bolsa inicial de varias filas (`mjs:1556-1563`).

### Propiedades

- `etiqueta` (string, p. ej. «Importe», «Bolsa inicial»); por defecto «Importe» (`mjs:1383`).
- `cantidad` (string tecleado, no número: admite coma o punto, ver validaciones).
- `moneda`: una de las 7 abreviaturas (`MONEDAS`, `src/dominio/dinero/monedas.ts:4`), mostrada con su nombre y
  abreviatura («Oro · mo») y un selector con buscador (selector n.º 1, sin altas, espec. línea 879).
- `equivalencias` (objeto `Equivalencias`) para calcular el «= X mo».
- `ayuda` (string opcional bajo el campo).
- `multilinea`/`filas`: en la bolsa inicial de P1b el campo admite **varias filas que se suman** (línea 103, «bolsa
  inicial del personaje, que admite varias filas de monedas que se suman»); cada fila tiene su propio botón «quitar»
  (`btnIcono('x', 'fantasma')`, `mjs:1557-1560`) y hay un botón «Añadir otra moneda» al final.
- `extra`: contenido a la derecha de la tercera columna (el botón de quitar en la variante multilínea, `mjs:1377`
  parámetro `extra`).

### Estados

- Tres celdas fijas en una rejilla `110px minmax(0, 1fr) 150px` (+ 44 px si hay `extra`) (`mjs:1378`): cantidad
  (alineada a la derecha, campo con fondo `campo` de 48 px), moneda (desplegable con icono abajo) y el resultado en
  mo, sobre **fondo oro claro** (`oro-tinte`) con borde `oro` 1 px, 18 px y 600 de peso, color `oro-oscuro`
  (`mjs:1381`) — así lo pide también §10 línea 1404: «El equivalente en oro de un campo de importe va sobre fondo
  oro claro».
- El «= X mo» se recalcula **al momento**, en cada tecla (línea 119: «al teclear, cantidad × valor de la moneda se
  convierte a entero...»).
- Sin valor: no hay ejemplo vacío en las vistas de la 6a (todas llegan con datos); por la regla general de §6.4
  (línea 814), el error va bajo el campo cuando esté vacío y sea obligatorio.

### Comportamiento de teclado y foco

- Teclado numérico (no está explícito en la espec. para tablet, pero se infiere del tipo de dato; **duda** D-C3 más
  abajo sobre si el teclado numérico se fuerza con `inputmode="decimal"`).
- El selector de moneda es el selector n.º 1 (§6.5, línea 879): sin grupos, sin altas, buscador solo si hace falta
  (7 opciones, por debajo del umbral de 12 que fuerza el foco automático del buscador, línea 860).
- Al añadir una fila en la bolsa inicial, el foco pasa presumiblemente a la cantidad de la fila nueva (no está
  escrito para este caso concreto; se sigue el patrón general «foco al siguiente campo vacío» del alta rápida,
  línea 962).

### Textos literales usados en la fase 6a

«Importe»/etiqueta según el formulario. P1b: filas «38 / Oro · mo / 38 mo», «25 / Plata · mp / 2,5 mo», «40 /
Bronce · mb / 0,4 mo», «18 / Cobre · mc / 0,018 mo», total «40,918 mo» (`mjs:1557-1563`, coincide con espec. línea
280: «bolsa inicial del ejemplo: 38 mo + 25 mp + 40 mb + 18 mc = 40,918 mo»). Ayuda de P1b: «Copia las monedas de la
ficha tal como las tengas; solo se guarda el total en oro. Podrás corregirla después como primera fila del libro.»
(`mjs:1562`).

### Validaciones que muestra

- **Formato de lo tecleado**: `aBase` (`src/dominio/dinero/importe.ts:37`) acepta coma o punto decimal, hasta 6
  decimales, sin signo; si el texto no es un número válido o el resultado no cabe en un entero seguro, lanza
  `Error('Cantidad no válida')` — el campo debe traducir esto a un mensaje bajo el campo (el texto exacto «Cantidad
  no válida» **no está en la espec.**, sale del comentario del código; es razonable reutilizarlo literalmente,
  puesto que sigue el tono breve de los demás mensajes).
- **Redondeo**: al mh más cercano, mitades hacia arriba (línea 121; `redondearMitadArriba`,
  `src/dominio/dinero/importe.ts:16`, y la división en `aBase` usa el mismo criterio con BigInt).
- **Saldo negativo**: el campo de importe no bloquea por sí solo un saldo negativo en una acción manual (línea 805:
  «se permite con aviso»); ese aviso vive en el diálogo, no en el campo (ver «Diálogo»).
- **Existencias/capacidad**: cuando el campo de importe acompaña una cantidad de recursos (fuera del propio
  componente de dinero, pero mismo patrón de validación), el mensaje tipo es «Caben 890 sacos más» (línea 818) — no
  aparece en P0/P1/P1b/P6.

### Cómo se ve en las vistas de la fase 6a

- P1b `NuevaPartidaPersonaje.dc.html`: 4 filas de campo de importe apiladas dentro de «Bolsa inicial», seguidas de
  «Añadir otra moneda» y del resumen `saldoOro('40,918 mo', …)` (`mjs:1556-1563`, ver «Aviso»/resumen aparte no es
  parte de este componente).
- No aparece en P0 ni en P1 (P1 solo tiene la fila informativa de equivalencias, de solo lectura, sin campo de
  importe editable: «1 mm = 100 mo · 1 mo = 10 mp · …», `mjs:353`). Tampoco en P6, cuya tabla de monedas es de solo
  lectura con `campoCorto` (`mjs:599`), una variante mínima (solo el número, sin selector de moneda ni «= X mo»,
  porque ya está expresado en mo por definición).

### Funciones del dominio que usa

- `aBase(cantidadTexto, moneda, eq)` (`src/dominio/dinero/importe.ts:37`) para convertir lo tecleado a hierro (mh).
- `normalizarCantidad(cantidadTexto)` (`src/dominio/dinero/importe.ts:60`) para guardar `introducido.cantidad` tal
  como se tecleó, pero normalizado («,6» → «0,6», «6,» → «6»).
- `importeDesde(cantidadTexto, moneda, eq)` (`src/dominio/dinero/importe.ts:74`) — junta las dos anteriores y es
  probablemente la función que llama el campo al perder el foco o al guardar, porque ya devuelve el `Importe`
  completo (`{ base, introducido }`).
- `formatearOro(base, eq, { signo?, conUnidad? })` (`src/dominio/dinero/formato.ts:39`) para pintar el «= X mo».
- `valorEnBase(moneda, eq)` (`src/dominio/dinero/monedas.ts:51`) si el campo necesita el valor de la moneda elegida
  sin pasar por `aBase` (por ejemplo, para validar en vivo antes de tener un número completo).
- En la bolsa inicial de P1b: `sumarBolsaInicial(filas, eq)` (`src/dominio/dinero/saldo.ts:39`) para el total que
  pinta `saldoOro`.

---

## 5. Selector con buscador (§6.5)

**De dónde sale**: espec. §6.5 completa (líneas 851-919) y §6.6 (líneas 921-1052, patrones de alta). Generador
`selectorAbierto` (`mjs:1394-1412`), con ejemplo completo en `dialogoEditarMovimiento`
(`mjs:1568-1597`, selector de Categoría abierto) y en el alta rápida apilada `personajeNuevaCategoria`
(`mjs:1602-1620`).

**Alcance en la 6a**: el propio texto de la tarea lo dice — «el alta completa es de la fase 9; aquí basta el
hueco». Ninguna pantalla de P0/P1/P1b/P6 abre en realidad un selector con altas (el único selector de estas cuatro
pantallas es el de Moneda dentro del campo de importe de P1b, que la espec. marca explícitamente «Altas: No»,
línea 879). Por eso este apartado describe el componente **genérico**, tal como lo define §6.5/§6.6 para que sirva
a partir de la fase 7, aunque en la 6a no se ejercite con datos reales de catálogo.

### Propiedades

- `etiqueta` (string opcional; con ella el panel flotante empieza a 80 px, sin ella a 54 px, `mjs:1394,1397`).
- `valor` (lo elegido, mostrado en el campo cerrado).
- `busqueda` (string del buscador).
- `placeholder`, por defecto «Buscar» (`mjs:1394`).
- `grupos`: array de `[nombreDeGrupo, opciones[]]`, cada opción `[texto, detalle, seleccionada]` (`mjs:1399-1408`).
  Las etiquetas de grupo van en *Cinzel* 13 px (`etiquetaGrupo`, `mjs:203-204`, coherente con §10 línea 1394).
- `contador` (string ya formado: «27 categorías» sin búsqueda, «5 de 27» con ella, línea 861).
- `crear`: texto de la acción de alta en el pie, o vacío si esa lista no admite altas o el selector está en modo
  filtro o apilado (patrón 1, líneas 925-938).
- `alinear`: `izquierda | derecha`, según si el campo está en la columna derecha del formulario (línea 859).
- `ancho`: mínimo 400 px (línea 859; por defecto `'400px'`, `mjs:1394`).
- `degradado`: boolean, pinta el degradado inferior cuando la lista sigue más allá de lo visible (línea 861).
- `modoFiltro`: variante sin altas ni pie, con «Todas»/«Todos» como primera opción (línea 871) — no está como
  parámetro explícito en `selectorAbierto`, pero es una combinación de `crear: ''` y una opción fija «Todas» al
  principio del primer grupo; **duda** D-C4 sobre si conviene una prop dedicada `modoFiltro` en vez de montarlo a
  mano cada vez.

### Estados

- **Cerrado**: campo de 48 px con borde `oro` de **2 px** (no 1 px como los demás campos: `mjs:1396`, coherente con
  «oro: … campo activo», línea 1390 — aquí el selector cerrado ya lleva el borde de «activo» permanentemente, a
  diferencia de un campo de texto normal).
- **Abierto**: panel flotante bajo el campo, fondo `vitela`, borde `borde`, sombra `0 12px 32px rgba(43,33,24,0.28)`
  (`mjs:1397`).
- **Con más de 12 opciones**: el buscador recibe el foco automáticamente y sale el teclado; con 12 o menos, se ve
  sin foco y el teclado solo sale si se toca (línea 860).
- **Sin búsqueda**: aparece primero el grupo «Recientes» (hasta 5 opciones elegidas al guardar otros registros), si
  las hay (línea 864).
- **Con búsqueda**: se resalta el texto que coincide (`resaltar`, `mjs:1389-1391`, envuelve la coincidencia en
  `<strong>` en `oro-oscuro`).
- **Sin resultados**: «Nada coincide con “…”» + «Busca en todas las categorías y grupos.» (línea 866); en el patrón
  1 de alta, además, la acción de crear pasa de enlace a **botón principal** de 44 px con 8 px de margen a cada
  lado (línea 935).
- **Duplicado exacto**: sin acción de alta; el pie dice «“Alojamiento” ya existe» (línea 936) y la opción sale
  resaltada.
- **Alto con teclado abierto**: el panel mide como mucho «el alto visible bajo el campo menos 8 px»; si baja de 220
  px, el diálogo que lo contiene sube hasta dejar el campo a 88 px o menos del borde superior (línea 868). Los
  artboards J2c, A9b y A12b (fuera del alcance de la 6a) lo dibujan con el teclado cerrado; no hay una vista de la
  6a que lo ejercite.

### Comportamiento de teclado y foco

- Al tocar el campo se abre el panel (línea 859).
- El buscador ocupa 48 px arriba del panel (línea 860).
- Filas de opción de 44 px, desplazamiento dentro del panel a partir de 8 filas (línea 865).
- El pie fijo con la acción de alta sustituye a una última fila de la lista cuando la lista admite altas (línea
  867); buscador y pie quedan fijos, la lista se desplaza entre los dos (línea 868).
- Al elegir una opción o tocar fuera, el panel se cierra (comportamiento estándar de desplegable; no está detallado
  letra a letra, pero se infiere de «al tocar la acción [de alta], el panel se cierra sin cambiar el valor del
  campo», línea 938, que describe el mismo cierre para el caso de alta).

### Textos literales

«Buscar» (placeholder por defecto, línea 860 y `mjs:1394`); «Nada coincide con “…”» y «Busca en todas las
categorías y grupos.» (línea 866); «“Alojamiento” ya existe» (línea 936, ejemplo); «tuya» en 13 px junto al detalle
de las opciones creadas por el usuario (línea 870); grupo «Recientes» (línea 864); textos de alta, patrón 1: «Nueva
categoría», «Nueva categoría “posada”» con el texto cortado a 16 caracteres con «…» (líneas 932-933).

### Validaciones que muestra

Las del **contenido** elegido, no del selector en sí: por ejemplo, si el campo es obligatorio y no hay opción
elegida, el error va bajo el campo con la regla general de §6.4 (línea 814). El propio panel valida en vivo el
**nombre nuevo** cuando se abre un alta (ver «Las 17 altas», líneas 1029-1052): duplicado, parecido y nombre
reservado, con `normalizarNombre`/`mismoNombre`/`esNombreReservado`.

### Cómo se ve en las vistas

- No hay ninguna vista dentro de P0/P1/P1b/P6 con el panel abierto. La referencia visual más cercana y completa es
  `PersonajeEditarMovimiento.dc.html` (selector de Categoría cerrado, con icono abajo) y
  `PersonajeNuevaCategoria.dc.html` (selector de Categoría **abierto**, con buscador «al», contador «5 de 27», grupos
  «Gastos del personaje»/«Asentamientos» y pie «+ Nueva categoría “al”»), ambas fuera del alcance de esta fase pero
  citadas aquí porque son la única fuente de medidas reales del panel abierto (`mjs:1394-1412,1568-1597`).
- El selector de Moneda del campo de importe (§4) es una instancia **sin grupos, sin altas y sin buscador visible**
  por tener solo 7 opciones (por debajo de las 12 que fuerzan el foco, línea 860); en las vistas de P1b se dibuja
  siempre **cerrado**, como un simple desplegable de 48 px (`importeFila`, `mjs:1380`).

### Funciones del dominio que usa

- `normalizarNombre(nombre)` y `mismoNombre(a, b)` (`src/dominio/texto/normalizar.ts:15,28`) para el duplicado
  exacto («sin mayúsculas, sin tildes ni diéresis, con los espacios colapsados», línea 1024) que decide si el pie
  dice «ya existe» en vez de ofrecer «crear».
- `esNombreReservado(nombre)` (`src/dominio/texto/normalizar.ts:42`) para el caso «Ese nombre lo usa el filtro»
  (línea 1027).
- No usa funciones de dinero ni de calendario por sí mismo; los selectores de Fecha (n.º 3) y Frecuencia (n.º 13)
  son **componentes propios**, no instancias de este selector genérico (ver §10 y §11).

### Duda sobre el alcance del «hueco» (importante para el plan de implementación)

El encargo dice literalmente: «selector con buscador de §6.5 con sus grupos, pie y altas —el alta completa es de
la fase 9; aquí basta el hueco—». La espec. distingue 5 patrones de alta (§6.6): 1 «acción en el pie», 2 «alta
rápida», 3 «alta completa», 4 «nombre nuevo en el campo», 5 «gestión en P7». Ninguna pantalla de la 6a necesita
realmente abrir un alta desde un selector.

- **Opción A** — implementar el componente `SelectorConBuscador` completo (panel, grupos, buscador, pie con
  patrón 1) y dejar el patrón 2 (diálogo de alta rápida) como un componente **aparte** pero también terminado,
  puesto que J2e/`personajeNuevaCategoria` ya es, de hecho, el ejemplo que usa la propia espec. para enseñar el
  «diálogo apilado con teclado en pantalla» que pide la tarea (ver §7). Solo el patrón 3 (alta completa, que
  reutiliza formularios como «Mercado y precios» que no existen hasta fases posteriores) queda como hueco (una
  prop `onCrear` que hoy no se conecta a nada).
- **Opción B** — dejar también el patrón 2 sin conectar en la 6a (el selector expone `crear` como texto, pero
  `onCrear` no abre ningún diálogo todavía) y limitarse a que el componente base (panel, grupos, buscador, resaltado,
  pie) funcione y tenga sus pruebas con Testing Library usando datos de prueba, sin un caso real de la fase 6a que
  lo dispare desde una pantalla.

**Recomendación**: opción A. El «diálogo apilado con teclado en pantalla» es un entregable explícito de esta tarea
(«diálogo y diálogo apilado con teclado en pantalla») y el único ejemplo completo que da la espec. de ese patrón es
precisamente el alta rápida de un selector (`personajeNuevaCategoria`/J2e). Construirlo ya de paso, aunque ninguna
pantalla de P0/P1/P1b/P6 lo abra todavía, evita documentar un componente que luego se vuelve a diseñar en la fase 7
y dota de pruebas reales al patrón de diálogo apilado. Lo que sí queda como hueco puro es el patrón 3 (alta
completa), que si se implementara ahora reutilizaría formularios («Mercado y precios», «Recurso del catálogo»,
«Tipo de local») que la fase 6a no construye.

---

## 6. Segmentos

**De dónde sale**: espec. línea 872 («las elecciones fijas de 2 a 4 opciones excluyentes no son desplegables sino
segmentos») con la lista de qué campos los usan; generador `segmentos` (`mjs:1365-1368`), usado en P1 para la Edad
(`mjs:345`) y en P6/P7 para «Todas · Tuyas» (`mjs:676`, fuera de alcance pero mismo componente).

### Propiedades

- `opciones`: array de 2 a 4 strings (línea 872: «de 2 a 4 opciones excluyentes»; la excepción de 5 opciones es el
  reino de un hechizo, línea 872, fuera del alcance de la 6a).
- `seleccionada`: el valor activo.
- `onChange`.

### Estados

- Fondo del grupo `pliegue`, `padding: 4px`, radio 8 px (`mjs:1366`).
- Cada opción ocupa `flex: 1` y 44 px de alto (área táctil).
- **Activa**: fondo `vitela`, borde `oro` 1 px, texto `tinta` 600 (`mjs:1367`).
- **Inactiva**: sin fondo, borde transparente, texto `tinta-suave` 400.

### Comportamiento de teclado y foco

No hay anotación específica de teclado (es un control táctil de un toque); por analogía con el resto de la app, el
foco visible debería usar el mismo borde `oro` que ya marca la opción activa, así que el estado de foco de teclado
y el de selección pueden confundirse visualmente si no se añade un anillo de foco aparte — **duda** D-C5 más abajo.

### Textos literales usados en la fase 6a

P1: «Segunda · Tercera · Cuarta» para la Edad, con «Tercera» seleccionada por defecto (`mjs:345`, coincide con el
ejemplo de la espec., año 1640 T.E.). Las abreviaturas correspondientes en las fechas son S.E., T.E. y C.E. (línea
277).

### Validaciones que muestra

Ninguna: al ser una elección excluyente con opciones fijas, no puede quedar en un estado inválido salvo que sea
obligatoria y no tenga valor inicial (no es el caso de Edad, que trae «Tercera» por defecto).

### Cómo se ve en las vistas de la fase 6a

- P1 `NuevaPartida.dc.html`: fila de 4 columnas (Día, Mes, Año, Edad) donde Edad es el único campo con segmentos,
  a la derecha de Año (`mjs:344-345`).
- No aparece en P0, P1b ni P6 dentro del alcance de esta tarea (P6 lo usa en el panel de P7 «Todas · Tuyas», que
  está fuera de alcance).

### Funciones del dominio que usa

Ninguna: es un control de presentación puro. La Edad que elige se combina después con la fecha para pasar por
`validarFecha` (`src/dominio/calendario/fecha.ts:55`), pero el propio componente de segmentos no llama a nada del
dominio.

---

## 7. Diálogo y diálogo apilado (con teclado en pantalla)

**De dónde sale**: espec. líneas 217-222 (reglas de navegación de diálogos) y línea 825-828 («Pantalla y teclado»).
Generadores: `dialogo` (`mjs:265-267`), `cabDialogo` (`mjs:268-271`), `pieDialogo` (`mjs:272-273`),
`dialogoApilado` (`mjs:275-280`) y `teclado` (`mjs:282-293`, el teclado en pantalla de la tablet, 380 px de alto,
dibujado solo para comprobar que el alta rápida queda por encima).

### Propiedades del diálogo simple

- `ancho` (px; varía por diálogo: 600 en alta rápida, 620 en J2d/P7b, 700 en «Editar movimiento», 720 en «Nueva
  caravana»…, `mjs:265` recibe el ancho como parámetro libre).
- `titulo`, `subtitulo` (cabecera con filete doble abajo, 3 px, `mjs:268-271`; título en *Cormorant Garamond* 32
  px 600, subtítulo 15 px `tinta-suave`).
- `onCerrar` (la x de 44 px en la cabecera equivale a Cancelar, línea 945).
- `pieIzquierda`/`pieDerecha`: el pie (`pieDialogo`, `mjs:272-273`) separa una acción a la izquierda (p. ej.
  «Eliminar») del grupo principal a la derecha («Cancelar» + el botón principal), con filete simple arriba y fondo
  `papel`.
- `cuerpo`: desplazable, con alto máximo = alto visible − 48 px (línea 827).

### Propiedades del diálogo apilado

- `abajo`: `{ ancho, contenido }` del diálogo de origen, que queda **atenuado con un segundo velo** al 35 % de
  tinta (línea 219, 1402; `mjs:277`).
- `arriba`: `{ ancho, contenido }` del diálogo nuevo, **anclado a 24 px del borde superior y centrado**
  (`mjs:278`: `top: 24px; left: (1180 - anchoArriba) / 2`).
- Reglas de la espec. (líneas 218-222):
  - Como mucho hay dos diálogos visibles.
  - Cancelar el de arriba vuelve al de abajo **con sus datos** (no se pierde lo escrito).
  - **J2d sustituye** al formulario de edición en vez de apilarse: no es un diálogo apilado, es un cambio de
    diálogo (línea 221) — importante para no confundirlo con el resto de altas apiladas.
  - Dentro de un diálogo de alta ya apilado, los selectores **no ofrecen altas**, para no abrir un tercer nivel
    (línea 222 y línea 930).

### Estados

- **Alta rápida** (patrón 2, líneas 940-965): diálogo de 600 px, apilado, «anclado a 24 px del borde superior y
  centrado»; sin grupo mide ≈335 px (cabe sobre un teclado de 380 px); con grupo, ≈440 px, y con el teclado abierto
  el cuerpo se desplaza ≈50 px (línea 944). Al tocar Grupo, el campo Nombre pierde el foco y el teclado se cierra
  (línea 944).
- **Alta completa** (patrón 3, líneas 967-982): apilado, 40 px más estrecho que el de abajo para que asomen 20 px
  por cada lado (línea 970); se abre **sin foco**, para que el teclado no tape los campos obligatorios ni el
  resumen (línea 971) — al contrario que el alta rápida, que sí arranca con el foco en Nombre.
- **Cerrar con cambios**: el pie pasa a «Hay cambios sin guardar», con «Seguir editando» y «Descartar» (línea 819).
- **Con teclado abierto**: el campo con foco se lleva a la vista (línea 828); si el hueco bajo el campo baja de 220
  px, el diálogo entero sube hasta dejar ese campo a 88 px o menos del borde superior (línea 868, aplicado también
  a formularios en general por la regla de línea 828).

### Comportamiento de teclado y foco

- El teclado en pantalla de la tablet mide 380 px de alto y se dibuja con 3 filas QWERTY más la fila de barra
  espaciadora, gris (`#D5D7DC` de fondo, teclas blancas `#FFFFFF`, teclas especiales `#B9BCC4`) (`mjs:282-293`).
- El diálogo de alta rápida sin grupo (≈335 px) más el margen hasta el teclado deja **80 px** libres antes de los
  380 px del teclado en el ejemplo de J2e (línea 394: «El diálogo acaba en y ≈ 360 y quedan 80 px hasta el
  teclado»), lo que confirma la regla de anclaje a 24 px arriba en vez de centrado vertical: así el diálogo no
  queda tapado por el teclado.
- Intro: crea si el formulario es válido; si falta un campo obligatorio sin teclado (como Grupo, que es un
  selector), Intro cierra el teclado y lleva el foco a ese campo (línea 958).

### Textos literales

Cabecera: título + subtítulo con el patrón «Para «Origen»: se elegirá al crearla.» (línea 945, patrón 1 de alta).
Pie de alta rápida: «Cancelar» y «Crear y elegir» (línea 958). Pie de alta completa: «Cancelar» y «Crear y elegir»
también (línea 978), pero con «Hay cambios sin guardar» si se cancela habiendo escrito algo (línea 981). «Hay
cambios sin guardar» / «Seguir editando» / «Descartar» (línea 819, patrón transversal).

### Validaciones que muestra

- El pie transversal de validación (línea 814-818): mensaje en lacre con icono bajo el campo; el botón principal
  desactivado mientras haya errores, salvo el caso de saldo negativo, que en vez de desactivar el botón cambia
  **el pie entero** a confirmación (línea 807: pie en lacre «La bolsa quedará en −3,482 mo» con «Revisar» y
  «Guardar igualmente»/«Transferir igualmente» según el verbo de la acción).
- Dentro del alcance de la 6a, el único diálogo con validación visible es el de P1 «Nueva partida» (día/mes/año, ver
  «Campo de fecha») y el propio J2d de P0/P6 (ver §8).

### Cómo se ve en las vistas de la fase 6a

- Ninguna de las 4 pantallas del alcance abre un diálogo **apilado** con datos propios (P0, P1 y P1b son
  pantallas completas sin capa de diálogo; P6 tampoco dibuja ninguna capa en su artboard). El único ejemplo íntegro
  de diálogo apilado con teclado, en toda la colección de vistas, es `PersonajeNuevaCategoria.dc.html`
  (`mjs:1602-1620`, citado aquí porque es la referencia de medidas obligatoria para este componente, aunque la
  pantalla base —Bolsa y movimientos— no sea de la 6a).
- El diálogo J2d/P7b (`ListasEliminarCategoria.dc.html`, `mjs:682-702`) es un diálogo **simple** (no apilado) de
  620 px, con la estructura cabecera + cuerpo + pie descrita en §8.
- P6 sí necesitará abrir confirmaciones simples («Borrar partida», «Importar copia») que usan este mismo componente
  de diálogo, aunque el artboard de `Ajustes.dc.html` no las dibuja en capa (son interacciones, no estados
  estáticos del artboard).

### Funciones del dominio que usa

Ninguna directamente: es el contenedor. Las funciones del dominio las usan los campos y validaciones que van
dentro (ver los demás componentes).

---

## 8. Confirmación de borrado J2d (doble confirmación)

**De dónde sale**: espec. línea 349 (fila J2d de la tabla de J1-J8: «el mismo diálogo para todas las tablas de la
app»), línea 697 («doble confirmación… El botón «Eliminar» abre el diálogo J2d… y exige marcar una casilla antes
de activar «Eliminar definitivamente»»), tabla «Al eliminar» completa (líneas 771-801) y el patrón 5 de P7b (líneas
994-1018, con el campo extra «Sus registros pasan a» que **no** es parte del J2d genérico sino de su variante para
catálogos). Vista de referencia: `ListasEliminarCategoria.dc.html` (`mjs:682-702`), que es la única capturada por
el generador; es la variante P7b (con reasignación), así que hay que restarle ese campo para obtener el J2d
«base» que necesitan P0 («Eliminar partida») y P6 («Borrar partida»).

### Propiedades

- `titulo`: patrón «¿Eliminar «X»?» (línea 335 y `mjs:688`).
- `subtitulo`: qué es y dónde se usa («Categoría tuya · se usa en 1 movimiento de Tharan», línea 335); en «Eliminar
  partida» sería, por ejemplo, el nombre y la fecha de la partida (no hay un ejemplo literal en la espec. para este
  caso concreto — **duda** D-C6).
- `resumen`: caja tipo `cajaResumen` (`mjs:1384-1385`) que lista qué se borra y qué cambia, según la fila que le
  toque de la tabla «Al eliminar» (líneas 771-801). Para «Partida» esa fila dice literalmente: «Se borra todo y se
  vuelve a P0» (línea 801); para el asentamiento: «Se borra todo lo suyo (caja, movimientos, registros, deudas,
  mercado local y rutas). …» (línea 800).
- `avisoAvance` (opcional): aviso tono `oro`, icono `reloj_arena`, solo si el registro lo creó el último avance:
  «Lo creó el avance del 10 al 12 de abril. Si lo deshaces, el movimiento desaparece y la categoría sigue
  eliminada.» (línea 694, variante) / «…si lo deshaces, el movimiento volverá a aparecer.» (línea 389, variante
  para un movimiento borrado). No aplica a «Eliminar partida» (una partida no la crea un avance).
- `casillasDevolucion` (opcional): para registros que pueden devolver algo (obra en curso: «Devolver 85 mo a la
  caja» y «Devolver los materiales al almacén», marcadas por defecto, línea 785; caravana en ruta: devolver el pago
  o la carga, línea 787) — no se ejercitan en P0/P1/P1b/P6.
- `campoReasignacion` (opcional, **solo la variante P7b**, fuera del alcance real de la 6a porque P7 no se
  construye en esta fase): selector con buscador sin altas y sin la opción que se borra, obligatorio si algún
  registro necesita la opción, opcional con valor inicial «Dejarlos sin nombre» si el campo del registro es
  opcional (líneas 1003-1005).
- `casillaConfirmacion`: «Sé que esto no se puede deshacer» (línea 339, componente `casilla`, `mjs:1371-1372`).
- `accionPrincipal`: botón `peligroLleno` «Eliminar definitivamente» (línea 339), desactivado hasta que:
  1. la reasignación, si es obligatoria, tenga valor, y
  2. la casilla esté marcada (línea 1009: «se activa al elegir destino (si es obligatorio) y marcar la casilla»).
- `notaSaldos` (opcional): línea en `bosque` con icono check, «Los saldos no cambian: solo cambia la categoría del
  movimiento.» (línea 339) — es específica de la reasignación de catálogo; para «Eliminar partida» no aplica (si
  acaso, todo lo contrario: se pierde todo).

### Estados

- **Sin usos** (J2d normal, sin reasignación): el campo de reasignación no aparece (línea 1006). Este es el caso
  de «Eliminar partida» en P0 (una partida no la «usa» nada más) y probablemente de «Borrar partida» en P6 (mismo
  botón, mismo diálogo).
- **Uso obligatorio**: el campo de reasignación es obligatorio y sin valor inicial (línea 1004) — caso de P7b, fuera
  del alcance real de la 6a.
- **Uso opcional**: valor inicial «Dejarlos sin nombre» (o variante nombrada) (línea 1005) — tampoco en el alcance.
- **Bloqueado**: «Eliminar» sale **desactivado con el motivo debajo**, antes incluso de abrir J2d (línea 1012,
  ejemplos «Herrería tiene 1 local: cámbialo de tipo antes», «Tienda tiene 2 locales: cámbialos de tipo antes» de
  D-041) — esto es un estado del **botón que abre J2d**, no de J2d en sí.
- **Con registros del último avance**: aviso oro adicional (línea 1008).

### Comportamiento de teclado y foco

No hay anotación específica de foco para J2d; por el patrón general, la casilla y el botón principal son los únicos
controles interactivos aparte de un posible selector de reasignación, así que el recorrido de foco es: (resumen,
solo lectura) → aviso (solo lectura) → campo de reasignación si existe → casilla → pie (Cancelar / Eliminar
definitivamente).

### Textos literales usados en el ejemplo capturado (P7b, `ListasEliminarCategoria.dc.html`)

«¿Eliminar «Posadas del camino»?»; «Categoría tuya · se usa en 1 movimiento de Tharan»; caja resumen «Posada El
Poney Pisador · 2 noches» −0,6 mo, «12 de abril · Bolsa de Tharan»; «Partidas afectadas: La Sombra del Este»;
aviso oro «Lo creó el avance del 10 al 12 de abril. Si lo deshaces, el movimiento desaparece y la categoría sigue
eliminada.»; «Sus registros pasan a» con ayuda «Obligatorio: la categoría está en uso. No incluye «Posadas del
camino».»; «Los saldos no cambian: solo cambia la categoría del movimiento.»; «Sé que esto no se puede deshacer»;
«El botón rojo se activa al elegir adónde pasan y marcar la casilla.»; pie «Cancelar» / «Eliminar definitivamente»
(`mjs:687-701`).

**Para P0/P6, que son las pantallas reales del alcance de la 6a**, la espec. no da un ejemplo literal de textos
para «Eliminar partida» ni «Borrar partida» (no hay artboard con esa capa abierta). Se puede construir con la
misma estructura, quitando el campo de reasignación y adaptando el resumen a la fila «Partida» de la tabla «Al
eliminar» (línea 801: «Se borra todo y se vuelve a P0»). **Duda** D-C6 más abajo.

### Validaciones que muestra

El botón «Eliminar definitivamente» permanece desactivado hasta que se cumplen las condiciones de arriba (línea
1009); no hay más validación (no es un formulario con campos de texto libres, salvo la reasignación).

### Cómo se ve en las vistas de la fase 6a

- La única captura real es `ListasEliminarCategoria.dc.html` (P7b), fuera del alcance de pantallas de la 6a pero
  única fuente de medidas para el componente J2d en sí (`mjs:682-702`): diálogo simple (no apilado) de 620 px.
- P0 y P6 **usan** este componente («Eliminar partida» en P0, línea 266; «Borrar partida» en P6, botón visible en
  `Ajustes.dc.html`, `mjs:637`) pero ninguno de los dos artboards dibuja la capa abierta.

### Funciones del dominio que usa

Ninguna función de `src/dominio` calcula el contenido de J2d por sí sola: el diálogo **lee** el estado ya calculado
de la partida (qué registros usan la opción, qué saldo cambiaría) más que transformarlo. Las funciones relevantes
son las mismas de formateo que el resto de la app:

- `formatearOro` (`src/dominio/dinero/formato.ts:39`) para las cifras del resumen.
- `formatearFecha`/`formatearDiaDelAvance` (`src/dominio/calendario/formatoFecha.ts:48,90`) para citar el avance
  que creó el registro («del 10 al 12 de abril»).
- `normalizarNombre`/`mismoNombre` (`src/dominio/texto/normalizar.ts:15,28`) si el campo de reasignación necesita
  comparar contra la propia opción que se borra (para excluirla de sus opciones, como pide la línea 1003).

---

## 9. Aviso (en sus tonos)

**De dónde sale**: §10 (tabla de tonos, línea 1389 para `lacre`) y §9 (tabla «Avisos», líneas 1332-1347, con la
condición y el color de cada tipo). Generador `aviso` (`mjs:183-186`).

### Propiedades

- `texto` (string, obligatorio, 600 de peso).
- `tono`: `lacre | oro | bosque | neutro` (claves de `TONO`, `mjs:22`); en la práctica, **las vistas solo usan
  `lacre`, `oro` y `neutro`** (ver grep de todas las llamadas a `aviso(...)` en `mjs`); `bosque` está definido en la
  paleta de tonos pero **ningún aviso de las vistas actuales lo usa** — queda como tono disponible para un futuro
  aviso de éxito/confirmación. Ver duda D-C7.
- `icono`: por defecto `alerta` si `tono === 'lacre'`, si no `reloj` (`mjs:185`); se puede forzar otro (`calendario`
  en el aviso neutro de P1, `reloj_arena` en los avisos de «lo creó un avance»).
- `accion` (opcional): un `enlace(...)` a la derecha («Ver almacén», «Ver deudas»).

### Estados

- Fondo = tinte del tono, borde = color del tono al 25 % (`fg + '40'` en hex, `mjs:185`), texto = color del tono,
  alto mínimo 48 px, `padding: 2px 6px 2px 16px` (`mjs:185`).
- El color nunca va solo: siempre lleva icono y texto (línea 1404, regla general también citada para importes).

### Comportamiento de teclado y foco

Si lleva `accion`, esa acción es un enlace normal (44 px de alto) y entra en el orden de foco como cualquier botón;
el resto del aviso es de solo lectura.

### Textos literales usados o citables en la fase 6a

- Aviso neutro de P1 (único aviso real dentro del alcance de la 6a): «La partida empieza el domingo 1 de enero de
  1640 T.E.» (`mjs:348`, con `diaDe(1640, 0, 1)` calculando el día de la semana).
- Aviso oro de «Importar una copia reemplaza la partida actual.» en P6 — **atención**: en el código este texto pasa
  por `nota(...)`, no por `aviso(...)` (`mjs:634`: `nota('Importar una copia reemplaza la partida actual.',
  'alerta')`), es decir, es una **nota con icono de alerta**, no una caja de aviso con fondo de color. Es una
  **inconsistencia leve** entre lo que uno esperaría (un aviso de tono oro o lacre, dado que avisa de que se pierde
  la partida actual) y lo que dibuja el generador (una nota gris, sin fondo de color). Se documenta como
  inconsistencia I-1 al final.
- Avisos rojo/ámbar del catálogo de §9 (tabla, líneas 1334-1347): sus textos concretos («Los víveres de Bree se
  agotan el 23 de abril», «La deuda de 4 mo con Hobart vence el 20 de abril»…) pertenecen a Inicio/P2 y a la barra
  superior, fuera del alcance de componentes comunes puros de la 6a (son contenido de la fase 6b, que usa el
  motor), pero el **componente aviso en sí** —con sus 4 tonos— sí es de la 6a.

### Validaciones que muestra

No es un componente de validación de formulario; es una caja informativa. Cuando se usa dentro de un diálogo para
anunciar saldo negativo, sí forma parte del flujo de validación de esa pantalla (línea 401, aviso en lacre «La
bolsa quedará en negativo…»), pero eso pertenece al formulario que lo contiene, no la fase 6a a través de
P0/P1/P1b/P6.

### Cómo se ve en las vistas de la fase 6a

- P1 `NuevaPartida.dc.html`: aviso `neutro` con icono `calendario`, seguido de una `nota` informativa sobre el
  calendario actual (`mjs:348-349`).
- P6 `Ajustes.dc.html`: solo lleva `nota(...)`, no `aviso(...)` propiamente dicho (ver inconsistencia I-1).
- P0 y P1b no muestran ningún aviso en sus artboards.

### Funciones del dominio que usa

Ninguna directamente. El **contenido** de un aviso de §9 (fechas, cifras) sí sale de funciones del dominio
(`formatearFecha`, `formatearOro`, `siguienteOcurrencia`…), pero eso corresponde a las pantallas de Inicio/barra
superior de la fase 6b, no al componente en sí.

---

## 10. Campo de fecha (con atajos y selector)

**De dónde sale**: espec. §6.5, selector n.º 3 (línea 881) y §6.4, «Selector de fecha» (línea 829). No hay una
función de generador dedicada a un calendario desplegado (ningún `.dc.html` dibuja el panel del selector de fecha
abierto); el campo **cerrado** se ve como un `campo(...)` normal con icono `calendario` (p. ej. en
`dialogoEditarMovimiento`, `mjs:1589`: `campo('Fecha', '12 de abril de 1640 T.E.', { icono: 'calendario' })`).

### Propiedades

- `valor` (una `Fecha` del dominio: `{ anio, mes, dia }`).
- `edad` (opcional: si se muestra con abreviatura de Edad, como en P1).
- `minimo`/`maximo` (opcional, para casos como «posterior a la fecha actual» o el tope del 31 de diciembre de 9999).
- `atajos`: Hoy, Mañana, +7 días (línea 829 y línea 881).
- `admiteTexto`: se puede escribir la fecha directamente («19/04/1640», línea 829 y 881).

### Estados

- **Cerrado**: campo de 48 px con el valor formateado y un icono a la derecha (`calendario` o `abajo` según el
  contexto).
- **Abierto**: panel bajo el campo con mes y año elegibles; días fuera de rango atenuados (línea 829).
- **Atajos limitados**: «Hoy», «Mañana», «+7 días» no ofrecen fechas posteriores al 31 de diciembre de 9999 (línea
  829, y línea 156 en la regla general de «Fecha máxima»).
- **Texto libre**: admite escribir la fecha con formato `DD/MM/AAAA` (línea 829); si no es válida, debe mostrar el
  error de `validarFecha` bajo el campo.

### Comportamiento de teclado y foco

- Al tocar el campo se abre el panel (mismo patrón que el selector con buscador, aunque el contenido es un
  calendario, no una lista).
- Escribir la fecha usa el teclado numérico estándar de la tablet (no hay anotación específica del tipo de teclado
  aquí; ver duda D-C3, común con el campo de importe).

### Textos literales

No hay textos de error literales para fecha en la espec. más allá de los que da `validarFecha` (ver funciones del
dominio). Ejemplo de fecha formateada, usado en varias vistas: «12 de abril de 1640 T.E.» (formato con Edad) y «12
de abril» (sin Edad, en resúmenes).

### Validaciones que muestra

- `El año debe estar entre 1 y 9999` (línea 153 y `src/dominio/calendario/fecha.ts:57`).
- `El mes debe estar entre 1 y 12` (`fecha.ts:60`).
- `Abril de 1640 tiene 30 días` (patrón `"${mes} de ${anio} tiene ${dias} días"`, `fecha.ts:64`; ejemplo de la
  espec. en línea 153 corresponde a este mismo mensaje).
- Reglas de fecha posterior a la actual («Primera vez», fecha de inicio, «Una sola vez»): se comprueban **solo en
  el formulario**, solo al crear la regla o cambiar la frecuencia (línea 841-842) — no es una validación del campo
  de fecha en abstracto, sino del campo de frecuencia que lo envuelve (ver §11).
- Tope de la fecha máxima (31 de diciembre de 9999): los atajos y las previsiones se cortan ahí, no ofrecen fechas
  posteriores (línea 156, línea 829).

### Cómo se ve en las vistas de la fase 6a

- P1 `NuevaPartida.dc.html` usa un patrón **distinto**: no es el campo de fecha compuesto de un único control, sino
  tres campos sueltos («Día», «Mes» —éste sí con icono `abajo`, un desplegable de meses (selector n.º 2, línea
  880)— y «Año») más los segmentos de Edad (`mjs:344-345`). Esto es coherente con la espec.: P1 pide «fecha inicial
  (día, mes, año y Edad) con el día de la semana calculado» (línea 251) como **tres campos independientes**, no
  como el campo de fecha único de calendario+atajos que usan el resto de formularios (ese es el selector n.º 3,
  para «movimientos, caravanas, obras, eventos…», línea 881, con el que **P1 no coincide**). Es decir: **P1 no
  ejercita el campo de fecha con atajos**; usa Día/Mes/Año sueltos. Ningún artboard de P0/P1b/P6 usa tampoco el
  campo de fecha con calendario y atajos.
- Por tanto, dentro del alcance real de P0/P1/P1b/P6 **no hay ninguna vista que dibuje el selector de fecha
  abierto**; el componente se documenta igualmente porque la tarea lo pide expresamente y porque lo necesitarán
  P3/P4 en la fase 6b y todos los formularios de dinero de fases posteriores. Se recomienda construirlo ahora con
  pruebas de Testing Library que no dependan de una vista concreta.

### Funciones del dominio que usa

- `validarFecha(f)` (`src/dominio/calendario/fecha.ts:55`) para los tres mensajes de error de arriba.
- `sumarDias(f, dias)` (`fecha.ts:112`) para los atajos «Mañana» (+1) y «+7 días».
- `ANIO_MAXIMO` (`fecha.ts:35`, = 9999) y la fecha `{ 9999, 12, 31 }` como tope de los atajos y del calendario
  desplegado.
- `diaDeLaSemana(f)` (`fecha.ts:127`) para el día de la semana que pide P1 («con el día de la semana calculado»,
  línea 251) y que NOMBRES_DIA/`formatearFecha` (`formatoFecha.ts:29,48`) convierten a texto.
- `diasDelMes(anio, mes)` y `esBisiesto(anio)` (`fecha.ts:47,43`) para pintar el calendario mensual del panel
  (cuántos días tiene el mes elegido).
- `formatearFecha(f, { edad?, diaSemana? })` (`formatoFecha.ts:48`) y `formatearDiaMes(f)` (`formatoFecha.ts:40`)
  para el valor mostrado en el campo cerrado.
- `compararFechas(a, b)` (`fecha.ts:122`) para decidir si una fecha tecleada es «posterior a hoy» quando el
  formulario que lo envuelve lo exige.

---

## 11. Campo de frecuencia (§6.4, con «Primera vez», fecha de inicio y límites)

**De dónde sale**: espec. §6.4 «Campo de frecuencia» (líneas 830-846) y §6.5, selector n.º 13 (línea 891, mismo
contenido resumido). Es un **campo compuesto**, como el campo de importe (línea 830: «compuesto, como el campo de
importe»). No hay artboard en `design/artboards/` que lo dibuje (ninguna pantalla de dinero recurrente está en el
alcance de la 6a ni siquiera fuera de ella entre los `.dc.html` generados — se confirmó que ninguna función del
`mjs` se llama con un patrón de frecuencia completo). Se documenta enteramente a partir del texto de la espec. y de
`src/dominio/calendario/recurrencia.ts`, que sí implementa sus reglas.

**Nota de alcance**: ninguna pantalla de P0/P1/P1b/P6 usa el campo de frecuencia (no hay gastos, salarios, ni
recurrencias en esas 4 pantallas). Se construye igualmente porque lo pide la tarea de forma expresa y porque lo
va a necesitar directamente la fase 7 (J5, J6…) y más adelante A3, A5, A6, A7b. Conviene documentar y probar el
componente ahora, con datos de prueba, tal como ya se hizo para el motor en `src/dominio/calendario/recurrencia.ts`.

### Propiedades

- `tipo`: uno de `diaria | cadaNDias | semanal | quincenal | mensual | cadaNMeses | trimestral | anual | unica`
  (nombres literales del tipo `Recurrencia`, `src/dominio/calendario/recurrencia.ts:21-30`; sus etiquetas visibles
  son «Cada día, Cada N días, Semanal (día), Cada dos semanas, Mensual (día), Cada N meses, Trimestral, Anual, Una
  sola vez», línea 891).
- Según `tipo`, campos adicionales:
  - `cadaNDias`: `n` (entero de 2 a 366) + `primera` (Fecha).
  - `semanal`: `diaSemana` (segmentos, 0 = lunes … 6 = domingo) + `inicio` opcional.
  - `quincenal`: `primera` (Fecha) (sin `n`, siempre 14 días).
  - `mensual`: `diaMes` (1-31) + `inicio` opcional.
  - `cadaNMeses`: `n` (entero de 2 a 12) + `diaMes` + `primera`.
  - `trimestral`: `diaMes` + `primera` (sin `n`, siempre 3 meses).
  - `anual`: `mes` + `diaMes` + `inicio` opcional.
  - `unica`: `fecha` (obligatoria, posterior a hoy).
  - `diaria`: solo `inicio` opcional.
- `etiquetaPrimeraVez`: en los formularios de dinero con un único campo de fecha de primer pago/cobro («Gasto e
  ingreso recurrente», «Ingreso o tributo», «Contratar trabajadores», «Unidad de guarnición», «Inversión» —esta
  última lo llama «Primer cobro»—), ese campo hace de «Primera vez»/fecha de inicio/fecha de «Una sola vez» según
  el tipo, **sin añadir un segundo campo de fecha** (línea 843-846). Es decir, el componente necesita una prop para
  sustituir la etiqueta por defecto («Primera vez») por la que pida el formulario.
- `proximaFecha`: de solo lectura, calculada y no guardada (línea 830 y línea 166); se muestra bajo el campo.

### Estados

- **Cada N días / Cada dos semanas / Cada N meses / Trimestral** añaden el campo «Primera vez» (línea 832).
  - En Cada N días y Cada dos semanas, su valor inicial es «fecha actual + N días» o «+14 días» (línea 832).
  - En Cada N meses y Trimestral, al elegir o cambiar el día del mes (o N), «Primera vez» **se recalcula**: el día
    elegido del mes de «fecha actual + N meses» (o + 3 meses), y del 29 al 31 usa el último día si el mes no lo
    tiene (línea 833-834; ejemplo textual: 12 de abril, «Cada 2 meses · día 15» → 15 de junio; «Cada 2 meses · día
    31» → 30 de junio).
  - Si se cambia «Primera vez» a mano, debe caer en ese día del mes o el error sale bajo el campo: «La primera vez
    debe caer el día 15 del mes» / «…el día 31 del mes o, si no lo tiene, el último» (línea 835).
  - **Valor inicial al elegir el tipo**: el día del mes empieza con el día de la fecha actual, y «Primera vez»
    nunca queda vacía, tampoco al cambiar de tipo conservando el día elegido (líneas 836-837, con el ejemplo
    completo del 12 de abril / 31 de enero).
- **Cada día, Semanal, Mensual, Anual** añaden la fecha de **inicio**, opcional, «no antes de» (línea 838).
- **Una sola vez** pide su propia fecha, posterior a la fecha actual (línea 839, criterio por defecto revisable).
- **Anual**: el día debe existir en el mes en algún año («Abril no tiene 31 días»); el 29 de febrero se admite
  (línea 840).
- **Posterior a la fecha actual**: «Primera vez» y la fecha de inicio deben ser posteriores a hoy, comprobado
  **solo en el formulario**, solo al crear la regla o al cambiar su frecuencia (tipo, N, día, mes, «Primera vez» o
  inicio); editar otros campos de una regla antigua ya vencida no lo vuelve a comprobar (línea 841). Igual para
  «Una sola vez» (línea 842).
- **Límites de N**: `cadaNDias` de 2 a 366, `cadaNMeses` de 2 a 12 (línea 832 y línea 891; también en
  `validarRecurrencia`).

### Comportamiento de teclado y foco

- Al tocar «Grupo»/día del mes, el patrón general del alta rápida dice que el campo anterior pierde el foco y el
  teclado se cierra (línea 944) — aplicable por analogía a cualquier segundo control de un campo compuesto, aunque
  la espec. no lo repite letra a letra para el campo de frecuencia.
- No hay más detalle de foco específico para este campo en la espec.; se sigue el patrón transversal de «al abrir
  el teclado, el campo con el foco se lleva a la vista» (línea 828).

### Textos literales

- «La primera vez debe caer el día 15 del mes» (línea 835/261 en el código).
- «La primera vez debe caer el día 31 del mes o, si no lo tiene, el último» (línea 835/260 en el código).
- «Abril no tiene 31 días» / «Febrero no tiene 30 días» (línea 161 y `errorDiaDelMesAnual`,
  `recurrencia.ts:242-245`).
- «El día del mes debe estar entre 1 y 31» (`recurrencia.ts:235`, no citado letra a letra en la espec., que solo da
  el caso anual; se infiere del código como el mensaje genérico de rango).
- «N debe ser un número entero de 2 a 366» / «…de 2 a 12» (`recurrencia.ts:287,303`, no está como texto literal en
  la espec., que solo da el límite numérico — **duda** D-C8, ver abajo, por si el mensaje exacto debe cambiar en
  castellano más natural, p. ej. «Debe ser un número entero de 2 a 366»).
- «El día de la semana debe estar entre lunes y domingo» (`recurrencia.ts:291`).
- «El mes debe estar entre 1 y 12» (`recurrencia.ts:311`, coincide con el mensaje de fecha).

### Validaciones que muestra

Todas las de arriba proceden literalmente de `validarRecurrencia` (ver funciones del dominio). El campo debe
mostrarlas bajo el control que corresponda (N, día del mes, día de la semana, mes, «Primera vez» o fecha de
inicio), no como un único mensaje genérico, porque `validarRecurrencia` devuelve una **lista** de errores, no uno
solo, y cada string ya identifica de qué campo habla por su contenido (no lleva un código de campo aparte: el
componente tendrá que mapear el texto del error a la posición del campo, o bien pedir que `validarRecurrencia` se
llame una vez por campo tocado — **duda** D-C9, importante para el diseño del componente).

### Cómo se ve en las vistas de la fase 6a

Ninguna: como se explica arriba, ningún artboard generado por `build-artboards.mjs` dibuja el campo de frecuencia
(ni siquiera fuera del alcance de P0/P1/P1b/P6: los formularios de J5, J6, A3, A5, A6, A7b no tienen artboard
propio, según dice explícitamente la cabecera de §6.4, línea 654: «No tienen artboard propio… usan el diálogo
estándar… y los componentes de J2b, J2c, J3b y A9b»). Es, de los 11 componentes de esta tarea, el que menos apoyo
visual directo tiene; su contrato sale entero del texto de §6.4/§6.5 y de la implementación ya probada en
`src/dominio/calendario/recurrencia.ts`.

### Funciones del dominio que usa

- El tipo `Recurrencia` completo (`src/dominio/calendario/recurrencia.ts:21-30`) como modelo de datos del campo.
- `validarRecurrencia(r)` (`recurrencia.ts:280-323`) para todas las validaciones de arriba salvo la de «posterior a
  la fecha actual», que la función deliberadamente **no** comprueba (lo dice su propio comentario, línea 276-278) y
  que el formulario debe añadir aparte con `compararFechas`.
- `siguienteOcurrencia(r, despuesDe)` (`recurrencia.ts:163`) para calcular y mostrar la «próxima fecha» de solo
  lectura bajo el campo.
- `validarFecha(f)` (`fecha.ts:55`) para «Primera vez», la fecha de inicio y la fecha de «Una sola vez» como
  fechas sueltas, antes de pasar por `validarRecurrencia`.
- `sumarDias(f, n)` y `sumarMeses(f, meses)` (`fecha.ts:112,139`) para los valores iniciales de «Primera vez»
  («fecha actual + N días», «+14 días», «fecha actual + N meses», «+3 meses»).
- `diaEnMes(anio, mes, dia)` (`fecha.ts:134`) para el redondeo al último día del mes cuando el elegido no existe
  (usado también internamente por `validarRecurrencia`/`erroresDiaMesYPrimera`).
- `ANIO_MAXIMO` (`fecha.ts:35`) para cortar el calendario del selector de «Primera vez»/inicio en el 31 de
  diciembre de 9999 (línea 156).
- Para el prorrateo que suele acompañar a una frecuencia en los formularios de dinero (aunque no es parte
  estricta del campo, sí de su contexto habitual): `factorMensual(r)`/`alMes(base, r)`
  (`src/dominio/dinero/prorrateo.ts:29,40`).

---

## Dudas (no resueltas por la especificación ni por las vistas)

1. **D-C1 — Aspecto del botón deshabilitado.** La espec. dice que el botón principal «se desactiva» (línea 816)
   pero ninguna vista dibuja ese estado (todos los artboards muestran formularios ya válidos).
   - Opciones: (a) opacidad reducida (p. ej. 45 %) sobre el mismo color; (b) fondo `pliegue`/texto `tinta-suave`,
     como una variante «inerte» separada de las 5 ya nombradas.
   - Recomendación: (a) opacidad reducida sobre el color de la variante, sin inventar un sexto color: es el
     criterio «lo más simple que cumpla las reglas» de `CLAUDE.md`, y es reversible sin tocar ninguna paleta.

2. **D-C2 — ¿P0 usa el componente Panel?** `SelectorPartidas.dc.html` no envuelve «Tus partidas» en un `panel()`
   con filete doble; es un `h2` suelto sobre el fondo `papel`.
   - Opciones: (a) dejar P0 como página singular sin panel, fiel al artboard; (b) envolver igualmente la lista de
     partidas en un Panel por coherencia de código, aceptando una pequeña diferencia visual con el artboard (el
     filete doble y el fondo `vitela` del panel).
   - Recomendación: (a), fiel al artboard — P0 es, además, la única pantalla sin `marco()` (sin barra superior ni
     menú), así que ya es una excepción visual reconocida por la propia espec. (P0 no tiene el «Cambiar de
     partida» del menú lateral, línea 216).

3. **D-C3 — Teclado numérico en tablet.** Ni la espec. ni el generador dicen si los campos de cantidad (importe,
   N de una frecuencia, día del mes…) deben forzar el teclado numérico del sistema (`inputmode="decimal"` /
   `inputmode="numeric"`) en vez del teclado completo QWERTY que dibuja `teclado()` (`mjs:282-293`).
   - Opciones: (a) forzar `inputmode="decimal"` en cantidad/importe (admite coma) y `inputmode="numeric"` en N/día
     del mes/año (enteros); (b) usar siempre el teclado completo, como en las capturas de diseño (que solo dibujan
     el QWERTY porque ilustran el alta de nombres, no de importes).
   - Recomendación: (a). No contradice ninguna vista (ninguna dibuja un campo numérico con el teclado abierto) y
     mejora la usabilidad táctil sin apartarse de ninguna regla de negocio.

4. **D-C4 — ¿Prop `modoFiltro` dedicada en el selector con buscador?** La espec. describe el modo filtro como una
   combinación de reglas (primera opción «Todas»/«Todos», sin altas, sin pie, solo con datos, línea 871) más que
   como una variante con nombre propio.
   - Opciones: (a) prop booleana `modoFiltro` que aplica las tres reglas a la vez; (b) que cada pantalla monte esas
     tres reglas a mano con las props ya existentes (`crear: ''`, opción «Todas» inyectada por quien lo use).
   - Recomendación: (a), para que las cuatro pantallas de filtro que la fase 6a no toca pero que vendrán después
     (J2, A2, J3, A12) no repitan la misma combinación de props cuatro veces.

5. **D-C5 — Foco de teclado en Segmentos.** El borde `oro` ya marca la opción **seleccionada**; no hay una vista
   con foco de teclado distinto de la selección.
   - Opciones: (a) reutilizar el mismo borde `oro` también como anillo de foco (riesgo: no se distingue «esto está
     enfocado» de «esto está elegido» cuando coinciden en la misma opción, que es el caso normal); (b) añadir un
     anillo de foco adicional (p. ej. `outline` de 2 px en `tinta`) alrededor de la opción con foco de teclado,
     aunque no esté en ninguna vista.
   - Recomendación: (b), por accesibilidad de teclado — es una adición puramente técnica que no cambia ninguna
     regla visual documentada, solo la completa para el caso (foco por teclado) que las vistas, al ser capturas
     estáticas, no pueden mostrar.

6. **D-C6 — Textos literales de J2d para «Eliminar partida» (P0) y «Borrar partida» (P6).** No hay artboard con esa
   capa abierta; solo tenemos la variante P7b (con reasignación de catálogo, que no aplica a una partida entera).
   - Opciones: (a) redactar el texto ahora, siguiendo el patrón «¿Eliminar «X»?» + resumen con la fila «Partida» de
     la tabla «Al eliminar» (línea 801: «Se borra todo y se vuelve a P0»); (b) dejarlo con un texto provisional y
     pedir confirmación de los literales exactos antes de cerrar la fase 6a.
   - Recomendación: (a). La tabla «Al eliminar» ya da el contenido exacto que debe explicar el resumen («Se borra
     todo y se vuelve a P0»); construir el texto con ese contenido no es inventar una regla de juego, es aplicar la
     ya escrita al único hueco que falta (el titular «¿Eliminar la partida «La Sombra del Este»?» con subtítulo
     «Se borrará todo su contenido»).

7. **D-C7 — Tono `bosque` en Aviso.** Está definido en la paleta de tonos (`TONO.bosque`, `mjs:22`) pero ninguna
   llamada real a `aviso(...)` en todo `build-artboards.mjs` lo usa.
   - Opciones: (a) implementar los 4 tonos del componente igualmente, ya que el coste es nulo y la paleta ya lo
     define; (b) implementar solo `lacre`, `oro` y `neutro`, y añadir `bosque` cuando aparezca el primer caso real.
   - Recomendación: (a). El componente ya recibe `tono` como prop tipada; excluir un valor válido de la paleta
     sería una limitación arbitraria sin ahorro real de trabajo.

8. **D-C8/D-C9 — Mensajes y mapeo de errores del campo de frecuencia.** Ya explicados en la sección 11: (a) si los
   mensajes de `n` fuera de rango deben mantenerse literales del código («N debe ser un número entero de 2 a 366»)
   o reescribirse más cerca del tono de los demás mensajes de la espec.; (b) cómo mapear cada string de
   `validarRecurrencia` (que no lleva identificador de campo) al control correspondiente del formulario.
   - Recomendación: mantener los mensajes literales de `validarRecurrencia` sin reescribirlos (evita que el
     mensaje mostrado y el mensaje probado en `recurrencia.test.ts` diverjan) y resolver el mapeo por **coincidencia
     de subcadena** contra una lista fija de patrones por campo (p. ej. si el mensaje empieza por «N debe ser», va
     bajo el campo N); es la solución más simple que no exige tocar `src/dominio`, que la fase 3 en curso no debe
     modificarse desde aquí de todos modos.

## Inconsistencias detectadas

- **I-1**: en P6 (`Ajustes.dc.html`), el texto «Importar una copia reemplaza la partida actual.» se pinta con el
  componente `nota` (icono, sin fondo de color) y no con `aviso` (caja de color), aunque por su contenido —avisa de
  una pérdida de datos— parecería candidato a un aviso en tono `oro` u similar, coherente con cómo la propia espec.
  trata avisos parecidos en otras pantallas (p. ej. la advertencia de saldo negativo, que sí es un `aviso` en
  lacre, línea 401). No es necesariamente un error: puede ser una elección deliberada de que las notas
  informativas de ajustes pesen menos visualmente que los avisos operativos de Inicio/formularios. Se señala para
  que quien construya P6 decida si lo deja como `nota` (fiel al artboard, `mjs:634`) o lo sube a `aviso` (más
  coherente con el resto de la app). Recomendación: dejarlo como `nota`, fiel al artboard, salvo que el usuario
  prefiera lo contrario — el propio `build-artboards.mjs` es la fuente de verdad pixel a pixel según las
  instrucciones del proyecto.
- **I-2**: el token de color `campo` (`#FFFDF6`, fondo de los campos de entrada, `mjs:12`) no aparece en la tabla
  de tokens de §10 (líneas 1381-1392), que solo documenta 10 tokens (papel, vitela, pliegue, borde, tinta,
  tinta-suave, lacre, oro, oro-oscuro, bosque). Es casi idéntico a `vitela` (`#FBF6E9`) pero no es el mismo valor.
  No afecta a ningún componente de esta lista más allá de necesitar una variable CSS adicional no documentada en
  la especificación formal. Recomendación: añadirlo como token `--campo-fondo` (u otro nombre que decida quien
  cierre §10), documentado en el propio código, ya que el generador de vistas es la fuente de verdad de measures y
  colores según las instrucciones de esta tarea.
