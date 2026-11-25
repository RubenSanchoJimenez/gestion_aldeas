# Fase 6a — P0, P1, P1b y P6: pantallas y su conexión con los datos

Encargo: documentar qué muestra cada pantalla, sus campos y validaciones, sus estados vacío/error, sus
confirmaciones, qué funciones reales de `src/datos` y `src/dominio` llama cada una, y la navegación entre
ellas (incluido qué pasa al abrir una partida, cuando la 6b todavía no existe).

**Fuentes.** Especificación `docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md` (§5 líneas 184–241, §6.1
líneas 246–340, §6.4 líneas 652–850, §6.5 líneas 851–920, §10 líneas 1379–1406, §12 líneas 1426–1474). Hoja de
ruta `docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md` (Fase 6, líneas 97–106; Fase 9, líneas 124–133).
Vistas `design/artboards/SelectorPartidas.dc.html` (P0), `NuevaPartida.dc.html` (P1), `NuevaPartidaPersonaje.dc.html`
(P1b) y `Ajustes.dc.html` (P6). Código: `src/datos/repositorio.ts`, `src/datos/catalogos.ts`, `src/datos/ajustes.ts`,
`src/datos/copia/exportar.ts`, `src/datos/copia/importar.ts`, `src/datos/baseDeDatos.ts`, `src/datos/ids.ts`, y el
dominio bajo `src/dominio/modelo`, `src/dominio/copia`, `src/dominio/calendario`, `src/dominio/dinero`,
`src/dominio/texto` y `src/dominio/ejemplo`. No existe todavía `src/interfaz` (carpeta vacía): todo lo de este
informe está por construir en la 6a.

---

## 0. Antes de P0: arranque de la app

Ningún artboard lo dibuja (es una decisión técnica), pero la interfaz necesita, al arrancar, antes de mostrar
cualquier pantalla:

1. Abrir la base: `new BaseDeDatos()` (`src/datos/baseDeDatos.ts:30`).
2. Sembrar el catálogo: `await sembrarCatalogo(db)` (`src/datos/catalogos.ts:38`) — inserta lo que falte del
   catálogo de fábrica y refresca `protegida`/`protegido`; el comentario del código dice explícitamente que
   «la app la llama en cada arranque, no solo al crear la base» (`src/datos/catalogos.ts:14`).
3. Decidir la pantalla inicial: `await ultimaPartidaUsada(db)` (`src/datos/repositorio.ts:17`). Con resultado
   `undefined` (ninguna partida guardada) se muestra **P0 en su estado vacío**. Con una partida existente, la
   especificación dice: «Al abrir, la app muestra la última partida usada. Sin partidas, muestra P0 vacío.»
   (§5, línea 203). Como el marco con Inicio (P2) es de la 6b, esto es una **duda** (§9.1 de este informe):
   qué pantalla se abre en su lugar durante la 6a.

`sembrarCatalogo` no toca P0/P1/P1b/P6 directamente (esas pantallas no crean opciones de catálogo), pero
`importarCopia` sí necesita el catálogo ya sembrado antes de fusionar (si no, un tipo de la copia que coincide
con uno de fábrica no encontraría su fila).

---

## 1. P0 — Selector de partidas

Artboard: `SelectorPartidas.dc.html`. Especificación: §6.1 líneas 250, 263–274; §6.4 líneas 660, 691, 704;
§6.5 fila 31 (línea 909); §12 línea 1442.

### 1.1 Qué muestra y en qué orden

1. Cabecera centrada: emblema, «Gestión de Aldeas» (Cinzel 44px) y el subtítulo en cursiva (artboard líneas
   20–23; colores y tipos exactos del token «papel»/«tinta»/«tinta-suave», §10 líneas 1383–1394).
2. Fila de título «Tus partidas» con, a la derecha, dos botones: **«Importar copia»** y **«Nueva partida»**
   (artboard línea 28). Con **más de 5 partidas** aparece además un buscador (§6.4 línea 824; selector n.º 31,
   línea 909) que filtra por nombre con `normalizarNombre` (`src/dominio/texto/normalizar.ts:15`), el mismo
   criterio que usan los catálogos (sin mayúsculas ni tildes, espacios colapsados).
3. Una tarjeta por partida guardada, **de la sesión más reciente a la más antigua** — ese orden lo da
   `listarPartidas` (`src/datos/repositorio.ts:12`, que ordena `db.resumenes.orderBy('abiertaEl').reverse()`).
   Cada tarjeta (artboard líneas 30–40): emblema, nombre (Cormorant Garamond 28px), fecha en juego formateada,
   línea secundaria «Dominios · Última sesión: fecha», icono de lápiz (**Editar partida**), botón **«Exportar»**
   y un botón principal que es **«Continuar»** (relleno, oro-oscuro) en la primera tarjeta — la de `abiertaEl`
   más reciente, que es justo la que devuelve `ultimaPartidaUsada` — y **«Abrir»** (contorno) en las demás.
4. Pie con el aviso «Tus partidas se guardan solo en esta tablet. Exporta una copia de vez en cuando para no
   perderlas.» (artboard línea 52; icono de información).

Cada tarjeta se rellena con los campos de `ResumenPartida` (`src/dominio/modelo/resumen.ts:9-21`): `nombre`,
`fechaActual` (formateada con `formatearFecha(f, { edad })`, `src/dominio/calendario/formatoFecha.ts:48`),
`dominios: string[]` (el personaje primero y los asentamientos después, ya en ese orden —
`src/dominio/modelo/resumen.ts:38-49`) y `abiertaEl` (para «Última sesión»). `exportadaEl` no se pinta en la
tarjeta (solo en P6).

### 1.2 Estado vacío

Sin partidas (`listarPartidas` devuelve `[]`): «estado vacío con «Nueva partida» e «Importar copia» destacados»
(§6.1 línea 264; anotación de canvas, §12 línea 1442; sin artboard propio). El texto exacto del estado vacío no
está escrito en la especificación — va en **dudas** (§9.2).

### 1.3 Acciones y qué llaman

| Acción | Función(es) de datos/dominio | Notas |
|---|---|---|
| Cargar la lista | `listarPartidas(db)` → `ResumenPartida[]` | `src/datos/repositorio.ts:12` |
| **Continuar** / **Abrir** una tarjeta | `abrirPartida(db, id, ahora)` → `DocumentoPartida \| undefined` | `src/datos/repositorio.ts:43`. Anota `resumenes.abiertaEl = ahora` sin tocar el estado (decisión 9, `docs/decisiones.md` línea 24). Con `undefined` (fila de teoría imposible: el resumen existe pero el documento no) se trata como error, ver 1.5. |
| **Nueva partida** | — | Navega a P1 (nada se guarda todavía; ver §5). |
| **Importar copia** | Lee el archivo → `analizarCopia(texto)` (`src/dominio/copia/analizar.ts:31`) → si `ok`, `examinarDestino(db, copia, 'selector')` (`src/datos/copia/importar.ts:34`) → según el resultado, `importarCopia(db, copia, opciones)` (`src/datos/copia/importar.ts:102`) | Ver detalle en §4. |
| **Exportar** (por tarjeta) | `exportarCopia(db, id, exportadaEl)` → `ArchivoCopia { nombre, texto, sobre }` | `src/datos/copia/exportar.ts:18`. Descargar el `texto` con ese `nombre` es código de navegador (fuera de `src/datos`); no anotado en la especificación. |
| Lápiz de una tarjeta (**Editar partida**) | Ver §2 | Abre el diálogo, no navega de pantalla. |

### 1.4 Confirmaciones

P0 en sí no pide confirmación para abrir ni para exportar. Las que le tocan:

- **Importar una partida que ya existe**: «Reemplazar» o «Importar como copia» (§6.1 línea 269; §6.4 línea 691;
  §12 línea 1442). Ver §4.
- **Eliminar partida**, dentro del diálogo «Editar partida»: doble confirmación J2d (§6.4 línea 697). Ver §2.

### 1.5 Estados de error

- `abrirPartida` devuelve `undefined` si el documento no está (aunque el resumen sí): no hay redacción en la
  especificación para este caso (inconsistencia de datos, no debería ocurrir salvo corrupción de IndexedDB). Ver
  duda §9.3.
- Un archivo de «Importar copia» que no es una copia válida: los tres motivos de `analizarCopia` (§4).

### 1.6 Selector con buscador (n.º 31)

La fila de la especificación (§6.5, línea 909) dice: «Lista de partidas; con más de 5 aparece el buscador» —
sin grupos ni altas. No es un desplegable: es el propio listado de P0, que reutiliza el patrón de búsqueda
(contador, resaltado, sin resultados) del componente común, filtrando sobre `ResumenPartida.nombre` con
`normalizarNombre`.

---

## 2. Diálogo «Editar partida» (dentro de P0)

No tiene artboard propio; sigue el patrón estándar de formulario (§6.4, introducción de la sección, línea 654) y
está descrito en la fila de la tabla de formularios (línea 660): «Nombre; fecha inicial y Edad (segmentos),
editables mientras no haya ningún avance; «Eliminar partida» (J2d)».

### 2.1 Campos y validación

| Campo | Tipo | Validación | Mensaje | Editable |
|---|---|---|---|---|
| Nombre | texto | `EsquemaNombreLibre`: 1 a 60 caracteres (`src/dominio/modelo/comunes.ts:150`) | No la trae el dominio (ver duda §9.4) | Siempre |
| Día / Mes / Año | 3 campos (no el «campo de fecha» con panel: ver duda §9.5) | `validarFecha` (`src/dominio/calendario/fecha.ts:55`) | «El año debe estar entre 1 y 9999», «El mes debe estar entre 1 y 12», «Abril de 1640 tiene 30 días» (mismo archivo, líneas 57, 60, 64) | Solo si `!hayAvances` |
| Edad | segmentos: Segunda · Tercera · Cuarta | `EsquemaEdad` (`src/dominio/modelo/comunes.ts:136`) | — | Solo si `!hayAvances` |

`hayAvances` es el campo del mismo nombre en `ResumenPartida` (`src/dominio/modelo/resumen.ts:20`), calculado con
`hayAvances(partida)` (`src/dominio/modelo/partida.ts:41`: `compararFechas(fechaActual, fechaInicial) !== 0`).

**Al guardar** (solo si `!hayAvances`, para no romper el invariante de `EsquemaPartida` de que `fechaActual` no
sea anterior a `fechaInicial`, `src/dominio/modelo/partida.ts:33-36`) hay que fijar también `fechaActual` al
mismo valor que el nuevo `fechaInicial` (si no, `hayAvances` pasaría a `true` sin que haya habido ningún avance
real). La especificación no lo dice explícitamente; es la única forma de mantener el invariante. Ver también la
duda §9.6 sobre si esto debería arrastrar la fecha `alta` de los asentamientos ya creados (en la 6a no puede
darse: P0/P1/P1b/P6 no crean asentamientos).

### 2.2 Qué llama

1. Cargar el documento completo (el resumen no basta para reescribirlo entero): `leerPartida(db, id)`
   (`src/datos/repositorio.ts:59`).
2. Guardar: `guardarPartida(db, documentoModificado, ahora)` (`src/datos/repositorio.ts:64`), que fija
   `partida.actualizada = ahora`, reescribe el documento y recalcula el `ResumenPartida` en la misma transacción,
   conservando `abiertaEl`/`exportadaEl` anteriores.
3. **«Eliminar partida»** abre J2d; al confirmar: `borrarPartida(db, id)` (`src/datos/repositorio.ts:81`), que
   borra documento y resumen en una transacción y no falla si ya no existe. Después: «se borra todo y se vuelve
   a P0» (§6.4 línea 801) — recargar `listarPartidas`.

---

## 3. P1 — Nueva partida · paso 1

Artboard: `NuevaPartida.dc.html`. Especificación: §6.1 líneas 251, 275–279; §6.4 línea 661 (Equivalencias); §3
líneas 86–144 (sistema monetario).

### 3.1 Qué muestra y en qué orden

1. Cabecera de diálogo de pantalla completa: emblema + «Gestión de Aldeas» a la izquierda, **«Cancelar»** a la
   derecha (artboard líneas 19–22).
2. Indicador de pasos: «① Partida y fecha» (activo, círculo oro-oscuro relleno) — «② Personaje» (pendiente,
   círculo con solo borde) (artboard líneas 24–27).
3. Título «Da nombre a tu partida» (Cormorant Garamond 40px).
4. Campo **Nombre de la partida**.
5. Fila de 4 columnas: **Día**, **Mes** (desplegable, selector n.º 2 «Mes», sin altas, opciones enero–diciembre,
   `src/dominio/calendario/formatoFecha.ts:13-26`), **Año**, **Edad** (segmentos).
6. Aviso «La partida empieza el domingo 1 de enero de 1640 T.E.» (día de la semana ya calculado) y, debajo, la
   nota sobre el calendario real sin festivos predefinidos (artboard líneas 50–51).
7. Panel «Monedas de MERP · los saldos se muestran en oro», con la cadena de equivalencias por defecto
   («1 mm = 100 mo · …») y el enlace **«Editar equivalencias»** (artboard líneas 53–56).
8. Panel «Víveres en sacos · ración fija», de solo lectura (artboard líneas 58–61): «1 saco = 30 kg = víveres
   para 1 persona durante 1 mes (30 días)». No hay «Cambiar ración» (§6.1 línea 279).
9. Pie: botón **«Siguiente: personaje»** (artboard línea 62).

### 3.2 Campos y validación

| Campo | Domino/validación | Mensaje | Valor inicial |
|---|---|---|---|
| Nombre | `EsquemaNombreLibre` (1–60) (`comunes.ts:150`) | Sin mensaje del dominio (duda §9.4) | vacío |
| Día | entero, parte de `Fecha` | ver `validarFecha` | 1 |
| Mes | entero 1–12 (selector, no error de campo suelto salvo fuera de rango) | ver `validarFecha` | 1 (enero) |
| Año | entero 1–9999 | ver `validarFecha` | año actual sugerido, o el del ejemplo; sin regla en la especificación (duda §9.7) |
| Edad | `EsquemaEdad` | — | «tercera» en el artboard, pero es solo el estado de ejemplo; sin valor por defecto fijado por la especificación |
| Equivalencias | `EsquemaEquivalencias` + `validarEquivalencias` (`src/dominio/dinero/monedas.ts:63`) | por campo: «La equivalencia de &lt;moneda&gt; debe ser un número entero de 2 o más»; combinado: «Con estas equivalencias, 1 mithril vale demasiado hierro (más de 1.000.000.000 mh); reduce alguna equivalencia» | `EQUIVALENCIAS_POR_DEFECTO` (`src/dominio/dinero/monedas.ts:26`: 100/10/10/10/10/10) |

El conjunto `{ día, mes, año }` se valida también como fecha completa con `validarFecha` (`src/dominio/calendario/fecha.ts:55`,
que exige integridad de mes y día del mes, p. ej. «Abril de 1640 tiene 30 días»). El día de la semana mostrado
se calcula con `diaDeLaSemana(fecha)` (`src/dominio/calendario/fecha.ts:127`) y el texto con `formatearFecha(f, { edad, diaSemana: true })`
(`src/dominio/calendario/formatoFecha.ts:48`).

### 3.3 Qué llama (y qué NO llama)

P1 **no escribe nada en la base de datos**. Es puramente estado local del asistente: nombre, `{ día, mes, año }`,
edad y equivalencias (por defecto `EQUIVALENCIAS_POR_DEFECTO`, o las que resulten de «Editar equivalencias») se
guardan en memoria y viajan al paso 2. Solo lee constantes de dominio: `EQUIVALENCIAS_POR_DEFECTO`,
`NOMBRES_MES`, `ABREVIATURA_EDAD`. Las funciones de `formatoFecha.ts` y `fecha.ts` usadas no tocan la base.

### 3.4 Sub-diálogo «Editar equivalencias»

Descrito en la fila de formularios «Equivalencias (P1)» (§6.4, línea 661): «La tabla de P6 editable en el propio
paso: enteros ≥ 2 y, combinadas, 1 mm no puede valer más de 1.000.000.000 mh […]. Fijas después de crear la
partida». Es la misma tabla de 6 filas que P6 muestra de solo lectura (`Ajustes.dc.html`, líneas 53–54), pero
aquí editable. Al abrirse, parte del valor que tenga P1 en memoria (por defecto, `EQUIVALENCIAS_POR_DEFECTO`); al
guardar, solo actualiza el estado local del asistente — sigue sin tocar la base hasta «Crear partida» en P1b.

### 3.5 Navegación

- **Cancelar** → vuelve a P0, descartando todo lo tecleado (nada se había guardado).
- **Siguiente: personaje** (solo si nombre y fecha son válidos) → P1b, conservando el estado.

---

## 4. Copias: analizar, examinar destino e importar (común a P0 y P6)

Aunque no es una pantalla en sí, tanto «Importar copia» (P0) como «Importar copia»/«Exportar copia» (P6) montan
el mismo flujo; se documenta aquí una vez.

### 4.1 Exportar

```
exportarCopia(db: BaseDeDatos, id: Id, exportadaEl: Instante): Promise<ArchivoCopia>
```
(`src/datos/copia/exportar.ts:18`). Internamente: `leerPartida(db, id)` + `leerCatalogo(db)`
(`src/datos/catalogos.ts:102`) dentro de una transacción de solo lectura; arma el sobre con
`armarCopia(documento, catalogo, exportadaEl)` (`src/dominio/copia/sobre.ts:170`, que solo incluye las opciones
y recursos que usan los registros de esa partida) y lo serializa con `serializarCopia(sobre)`
(`src/dominio/copia/sobre.ts:256`, JSON canónico, mismas claves siempre en el mismo orden). El nombre de archivo
sale de `nombreDeArchivo(partida, exportadaEl)` (`src/dominio/copia/sobre.ts:282`): por ejemplo
`gestion-aldeas-la-sombra-del-este-2026-09-17.json`. Exportar anota `resumenes.exportadaEl = exportadaEl` pero no
cuenta como cambio de la partida (decisión 9, `docs/decisiones.md` línea 24). Descargar el archivo (crear el
blob y disparar la descarga) es código de navegador, fuera de `src/datos`.

### 4.2 Analizar un archivo importado

```
analizarCopia(texto: string): ResultadoAnalisis
```
(`src/dominio/copia/analizar.ts:31`). Es dominio puro: recibe el **texto** del archivo (leerlo del `File` con
`FileReader`/`.text()` es cosa de la interfaz). Devuelve `{ ok: true, copia, migrada, desdeVersion }` o
`{ ok: false, motivo, mensaje, detalle? }` con `motivo` uno de:

| `motivo` | Mensaje exacto | Cuándo |
|---|---|---|
| `noEsCopia` | «Este archivo no es una copia de Gestión de Aldeas» | El texto no es JSON, o no trae `{ app: 'gestion-aldeas', versionFormato }` |
| `versionMasNueva` | «Esta copia es de una versión más nueva de la app» | `versionFormato` de la copia > `VERSION_FORMATO` (1) |
| `daniada` | «La copia está dañada» + `detalle` | Falla el esquema completo, las referencias o las unicidades (`validarCopia`, `src/dominio/validacion/coherencia.ts:321`) |

Si `desdeVersion < VERSION_FORMATO`, migra con `migrar(datos, desdeVersion)` (`src/dominio/copia/migraciones.ts:75`;
hoy `MIGRACIONES` está vacío porque solo existe la versión 1, así que este caso no puede darse todavía).

### 4.3 Examinar el destino y elegir el modo

```
examinarDestino(db, copia: SobreCopia, origen: 'selector' | 'ajustes', partidaActualId?: Id): Promise<DestinoImportacion>
```
(`src/datos/copia/importar.ts:34`). `origen` distingue P0 (`'selector'`) de P6 (`'ajustes'`):

- **P0** (`origen: 'selector'`): si la partida de la copia ya existe → `modos: ['reemplazar', 'comoCopia']` y
  se pregunta «Reemplazar» o «Importar como copia» (§6.1 línea 269); si no existe → `modos: ['nueva']`, se
  añade sin preguntar.
- **P6** (`origen: 'ajustes'`, con `partidaActualId` = la partida abierta): si el id de la copia **no** coincide
  con la partida actual → rechazo con mensaje «Esta copia es de otra partida» (`src/datos/copia/importar.ts:23`,
  contrato §3.1, no redactado por la especificación literal); si coincide → `modos: ['reemplazar']` (§6.1
  línea 270: «Desde P6 reemplaza la partida actual, con confirmación, y solo admite copias de esa partida»).

### 4.4 Importar

```
importarCopia(db, copia: SobreCopia, opciones: OpcionesImportacion): Promise<ResumenImportacion>
```
(`src/datos/copia/importar.ts:102`), con
`OpcionesImportacion = { modo: 'nueva' | 'reemplazar' | 'comoCopia', ahora: Instante, nuevoId: () => Id, migrada?: boolean, desdeVersion?: number }`.
`nuevoId` debe ser `src/datos/ids.ts:8` (`nuevoId(): Id`, usa `crypto.randomUUID()`), porque el dominio no toca
`crypto` (contrato §2.8). Fusiona catálogos (`fusionarCatalogos`, `src/dominio/copia/fusion.ts:134`), remapea ids
(`remapearCatalogos`, línea 393) y, si el modo es `'comoCopia'`, da nombre nuevo con
`comoCopia(documento, nuevoId(), nombreDeCopia(nombre, nombresExistentes))`
(`src/dominio/copia/comoCopia.ts:9` y `:34`: «La Sombra del Este» → «La Sombra del Este (copia)», y
«(copia 2)», «(copia 3)»… si ya existen). Escribe catálogo y partida en una sola transacción y devuelve
`ResumenImportacion.lineas: string[]` ya listas para mostrar (modo, migración si la hubo, y las líneas de fusión
de `lineasDeFusion`, `src/dominio/copia/fusion.ts:407`) — por ejemplo «Se ha añadido la partida «La Sombra del
Este».» o «La categoría «Posadas del camino» de la copia se ha unido a la tuya con el mismo nombre.».

### 4.5 Confirmaciones

- P0, con la partida ya existente: diálogo con «Reemplazar» (acción destructiva, en lacre) o «Importar como
  copia» — «Explican qué se pierde y ofrecen la acción en rojo» (§6.4 línea 691). El texto exacto no está en la
  especificación (duda §9.8).
- P6: «Desde P6 reemplaza la partida actual, con confirmación» (§6.1 línea 270) y, en el propio P6, el aviso fijo
  «Importar una copia reemplaza la partida actual.» (`Ajustes.dc.html` línea 75).

---

## 5. P1b — Nueva partida · paso 2

Artboard: `NuevaPartidaPersonaje.dc.html`. Especificación: §6.1 líneas 252, 280; §3 líneas 101–119 (campo de
importe).

### 5.1 Qué muestra y en qué orden

1. Misma cabecera («Cancelar») e indicador de pasos, ahora con «② Personaje» activo (artboard líneas 19–27).
2. Título «Crea a tu personaje».
3. Fila de 2 columnas: **Nombre**, **Descripción**.
4. **Bolsa inicial**: una fila por moneda tecleada — cantidad (alineada a la derecha), moneda (desplegable,
   selector n.º 1 «Moneda», sin altas), «= X mo» calculado (fondo oro claro) y una `x` para quitar la fila
   (artboard líneas 39–58); debajo, **«Añadir otra moneda»** (línea 59) y la nota «Copia las monedas de la ficha
   tal como las tengas; solo se guarda el total en oro. Podrás corregirla después como primera fila del libro.»
   (línea 60).
5. Panel resumen: «Bolsa inicial en monedas de oro» con el total grande («40,918 mo») y, a la derecha,
   «Equivalencias: 1 mo = 10 mp = 100 mb = 1.000 mc» (artboard líneas 61–67; las equivalencias mostradas son las
   elegidas en P1, ya convertidas a factor acumulado desde mo).
6. Pie: **«Atrás»** (vuelve a P1, conservando los datos) y **«Crear partida»** (línea 68).

### 5.2 Campos y validación

| Campo | Dominio | Mensaje |
|---|---|---|
| Nombre | `EsquemaNombreLibre` (1–60), obligatorio (`EsquemaDominioPersonaje.nombre`, `src/dominio/modelo/dominios.ts:16`) | sin mensaje del dominio (duda §9.4) |
| Descripción | `EsquemaNotas.optional()` (máx. 1.000, opcional) (`src/dominio/modelo/dominios.ts:17`, esquema en `comunes.ts:162`) | — |
| Cada fila de la bolsa: cantidad | texto que debe casar con el patrón de `EsquemaImporte.introducido.cantidad`: `/^\d+(?:[.,]\d{1,6})?$/` (`src/dominio/modelo/comunes.ts:83`) — como mucho 6 decimales | «La cantidad tecleada no es válida» (mismo esquema); de fallar la conversión, `aBase` lanza `Error('Cantidad no válida')` (`src/dominio/dinero/importe.ts:40,45,51`) |
| Cada fila: moneda | `EsquemaMoneda` (`comunes.ts:59`) | — |

**Cálculo de cada fila y del total**: `aBase(cantidadTexto, moneda, equivalencias)` (`src/dominio/dinero/importe.ts:37`)
da la cifra en mh; se suman todas las filas y el resultado se guarda como `Caja.saldoInicial.base`
(`EsquemaCaja`, `src/dominio/modelo/dominios.ts:35`, tipo `EsquemaImporteMagnitud` — no negativo, sin
`introducido`, porque «la bolsa de varias filas no guarda «introducido»: solo se guarda el total en oro» —
comentario en `src/dominio/ejemplo/partidaYPersonaje.ts:70-71` y §3 línea 141). El «= X mo» de cada fila y el
total se presentan con `formatearOro(base, equivalencias)` (`src/dominio/dinero/formato.ts:39`). El número
mínimo de filas (¿puede la bolsa quedar en 0 filas / 0 mo?) no está fijado por la especificación: ver duda §9.9.

### 5.3 Qué llama al pulsar «Crear partida»

Aquí es donde P1+P1b escriben por primera vez en la base. Hace falta:

1. `nuevoId()` (`src/datos/ids.ts:8`) para `partida.id` y para el `id` del dominio-personaje.
2. Construir el `DocumentoPartida` completo (`src/dominio/modelo/documento.ts:95`, que extiende
   `EsquemaEstadoPartida` con `avances: []`) con:
   - `partida`: `{ id, nombre (de P1), edad (de P1), equivalencias (de P1, por defecto o editadas),
     kgPorSaco: 30, diasPorSaco: 30, fechaInicial: { anio, mes, dia } (de P1), fechaActual: fechaInicial (sin
     avances todavía), creada: ahora, actualizada: ahora, versionFormato: VERSION_FORMATO,
     cambiosDesdeUltimoAvance: 0 }` — esquema y constante en `src/dominio/modelo/partida.ts:17` y `:14`.
   - `dominios`: `[{ id: nuevoId(), tipo: 'personaje', nombre (de P1b), descripcion (de P1b, opcional) }]`
     (`EsquemaDominioPersonaje`, `src/dominio/modelo/dominios.ts:13`). Sin asentamientos todavía (se añaden
     luego, fuera del alcance de la 6a).
   - `cajas`: `[{ dominioId: <id del personaje>, saldoInicial: { base: <suma de la bolsa> } }]`
     (`EsquemaCaja`, `src/dominio/modelo/dominios.ts:35`).
   - Las otras 31 claves de `EstadoPartida` (`src/dominio/modelo/documento.ts:43-82`: `movimientos`,
     `transferencias`, `deudas`, `recurrentes`, `objetos`, `ventas`, `inversiones`, `hechizos`, `intentos`,
     `pergaminos`, `poblaciones`, `existencias`, `ajustesExistencias`, `entradasAlmacen`, `edificios`,
     `produccionesRealizadas`, `trabajadores`, `obras`, `impuestosRentas`, `tiposLocal`, `localesComerciales`,
     `mercados`, `rutas`, `caravanas`, `unidadesGuarnicion`, `defensas`, `animales`, `armeria`, `eventos`,
     `ubicaciones`, `personas`) vacías: `[]`.
   - `avances: []`.
3. `crearPartida(db, documento, ahora)` (`src/datos/repositorio.ts:22`) — guarda documento y resumen en una
   transacción; lanza `Error('Ya hay una partida con el id «…»')` si el id ya existe (colisión de
   `crypto.randomUUID()`, prácticamente imposible salvo con el id fijo del ejemplo — ver §6).
4. Con la partida ya creada, navegar «hacia la 6b, que aún no existe» — ver §7.

### 5.4 Estado vacío / error

No hay artboard de error para P1b; se aplican los patrones transversales de §6.4 (línea 814): mensaje en lacre
bajo el campo, botón principal desactivado mientras haya errores. Con la bolsa vacía (0 filas), el resumen
mostraría «0 mo»: si eso se permite o se exige al menos una fila es la duda §9.9.

---

## 6. Abrir la partida de ejemplo desde P0

El encargo pide explícitamente que la app «abra la de ejemplo». La especificación **no** describe ningún botón
para esto en P0 (el artboard `SelectorPartidas.dc.html` solo dibuja «Nueva partida» e «Importar copia», más una
segunda tarjeta de ejemplo «Los Senderos del Norte» que es solo ilustración del diseño, sin datos de dominio
detrás). Lo que sí existe en el código es:

```
documentoDeEjemplo(): DocumentoPartida
```
(`src/dominio/ejemplo/sombraDelEste.ts:55`) — devuelve «La Sombra del Este» completa (id fijo
`p.sombra-del-este`, `src/dominio/ejemplo/ids.ts:4`), con `structuredClone` en cada llamada para no compartir
referencias entre pruebas. La prueba de la fase 2 (`src/datos/entregable.test.ts:69`, función `guardarEjemplo`)
la guarda exactamente así: `crearPartida(db, documentoDeEjemplo(), ahora)`.

Cómo se ofrece esto en la interfaz (botón dedicado, siembra automática al primer arranque, o import de un JSON
empaquetado) no está definido: es la duda §9.10, con recomendación.

---

## 7. P6 — Ajustes y copias

Artboard: `Ajustes.dc.html`. Especificación: §5 líneas 184–241 (marco); §6.1 líneas 257, 321–324; §6.4 línea 691
(confirmaciones); §12 línea 1461 (`«Deshacer avance» con…`, no aplica a P6).

### 7.1 El marco (a construir en la 6a, sin el aviso ni «Avanzar días»)

El artboard dibuja el marco completo (barra superior de 64px + menú lateral de 232px, §5 líneas 188–201), pero
el encargo de la 6a lo acota: «barra superior sin el aviso ni «Avanzar días» aún». Así que en P6 (y en
cualquier pantalla dentro del marco) la barra superior de la 6a muestra:

- Emblema + nombre de la partida (Cinzel), columna izquierda de 232px (artboard línea 20).
- Fecha actual formateada + día de la semana (`formatearFecha`/`diaDeLaSemana`, ya citados) — esto **no**
  depende del motor, son datos ya guardados en `partida.fechaActual`.
- **Sin** el texto del próximo aviso (`Mañana: salarios de Bree…`, artboard línea 25) ni el botón **«Avanzar
  días»** (línea 26): ambos dependen del motor de avance (fases 3–5) y quedan para la 6b.

El menú lateral (§5, líneas 188-201 y artboard líneas 28-38) sí se construye entero: grupo PARTIDA (Inicio,
Calendario), grupo DOMINIOS (una fila por dominio con su icono, tipo y flecha; «Añadir asentamiento»), y
«Ajustes y copias» al fondo, resaltado cuando está activo. Que la mayoría de esas filas naveguen a pantallas que
todavía no existen es la duda §9.11 (comparte causa con la del §8).

### 7.2 Qué muestra y en qué orden (dentro de `<main>`)

1. Cabecera de contenido: «La Sombra del Este» (subtítulo) + «Ajustes y copias» (título, Cormorant Garamond
   36px) (artboard líneas 41-47).
2. Dos columnas de paneles (`grid-template-columns: 1.1fr 1fr`, línea 48):
   - Columna izquierda:
     - **Panel «Monedas»**: tabla de 7 filas (Mithril…Hierro) de solo lectura, con Nombre / Abreviatura /
       «Equivale a» (la fila de Hierro dice «Unidad base» en vez de una cifra) — nota «Se fijaron al crear la
       partida. Todos los importes se muestran en oro.» (artboard líneas 48-54).
     - **Panel «Listas y catálogos»**: texto «Categorías, oficios, tipos, recursos, ubicaciones y personas» +
       botón **«Gestionar listas»** (artboard línea 60) — abre P7, que es de la **fase 9** (hoja de ruta, línea
       129), no de la 6a. Ver duda §9.11.
   - Columna derecha:
     - **Panel «Calendario»**: tres filas de solo lectura — «Calendario: Actual, con los meses de hoy»,
       «Fecha actual: &lt;formateada con día de la semana&gt;», «Ración de víveres: 1 saco de 30 kg por persona
       al mes» — y la nota «Sin festivos fijos: anótalos como eventos.» (artboard líneas 61-66).
     - **Panel «Copias de seguridad»**: párrafo de aviso, fila «Última copia exportada: &lt;fecha&gt;»
       (`ResumenPartida.exportadaEl`, formateada, o vacío/«Nunca» si `undefined` — duda §9.12), botones
       **«Exportar copia»** e **«Importar copia»**, y el aviso «Importar una copia reemplaza la partida
       actual.» (artboard líneas 67-75).
     - **Panel «Partida»**: botones **«Cambiar de partida»** y **«Borrar partida»** (en lacre) (artboard
       líneas 76-81).

### 7.3 Campos y validación

P6 no tiene campos editables propios (todo lo de sus paneles de Monedas y Calendario es de **solo lectura**,
por diseño — §6.4 líneas 747: «Las equivalencias de monedas, que se fijan al crear la partida, y la ración de
víveres, que es fija […] no se pueden cambiar después»). Las únicas acciones con datos son botones.

### 7.4 Qué llama cada acción

| Acción | Función(es) | Notas |
|---|---|---|
| Cargar la pantalla | La partida ya está abierta en memoria (viene de `abrirPartida`, §1.3, o de haberla creado en P1b). `partida.equivalencias`, `partida.fechaActual`, `partida.diasPorSaco/kgPorSaco` y `resumen.exportadaEl` ya están disponibles sin llamadas nuevas. | El panel «Calendario» no necesita `leerAjustes`/`leerAjuste` (`src/datos/ajustes.ts:16,37`): esos ajustes (`versionCatalogo`, y en la fase 9 los «Recientes») son de la app, no de la partida. |
| **Gestionar listas** | — | Navega a P7 (fase 9): ver duda §9.11. |
| **Exportar copia** | `exportarCopia(db, partidaAbiertaId, ahora)` | Igual que en P0 (§4.1); actualiza `exportadaEl` y el propio panel debería refrescarse con la fecha nueva. |
| **Importar copia** | `analizarCopia(texto)` → `examinarDestino(db, copia, 'ajustes', partidaAbiertaId)` → si `modos` incluye `'reemplazar'`, confirmar y `importarCopia(db, copia, { modo: 'reemplazar', ahora, nuevoId })`; si trae `rechazo` (`motivo: 'otraPartida'`), mostrar «Esta copia es de otra partida» y no ofrecer ninguna acción | §4.3-4.4. Tras reemplazar, la partida en memoria queda obsoleta: hay que releerla (`leerPartida`/`abrirPartida`) o navegar de nuevo hacia la pantalla de apertura (§8). |
| **Cambiar de partida** | — | Navega a P0 (`listarPartidas` se vuelve a pedir al llegar). No se guarda ni se cierra nada explícitamente: la partida sigue en la base tal cual estaba. |
| **Borrar partida** | Abre J2d; al confirmar, `borrarPartida(db, id)` (`src/datos/repositorio.ts:81`) | «Se borra todo y se vuelve a P0» (§6.4 línea 801). |

### 7.5 Confirmaciones

- **Importar copia** (reemplaza la actual): confirmación explícita («Desde P6 reemplaza la partida actual, con
  confirmación», §6.1 línea 270) — texto exacto no dado, ver duda §9.8 (comparte redacción con la de P0).
- **Borrar partida**: doble confirmación J2d (§6.4 línea 697), «El botón «Eliminar» abre el diálogo J2d, que
  explica qué se borra y qué cambia y exige marcar una casilla antes de activar «Eliminar definitivamente»».

### 7.6 Estados vacío / error

- Sin «Última copia exportada» (partida recién creada, nunca exportada: `exportadaEl === undefined`): ver duda
  §9.12.
- Importar un archivo no válido: los tres motivos de `analizarCopia` (§4.2), igual que en P0.
- Importar una copia de otra partida: rechazo con «Esta copia es de otra partida» (`src/datos/copia/importar.ts:23`),
  sin ninguna acción ofrecida (`modos: []`).

---

## 8. Navegación entre pantallas y apertura de una partida

```
P0 ── Nueva partida ──▶ P1 ── Siguiente: personaje ──▶ P1b ── Crear partida ──▶ (crearPartida) ──▶ §8.1
P0 ── Continuar/Abrir ──▶ (abrirPartida) ──▶ §8.1
P0 ── Importar copia ──▶ (analizarCopia → examinarDestino → importarCopia) ──▶ recarga P0 (queda en la lista)
P0 ── Exportar (tarjeta) ──▶ (exportarCopia) ──▶ descarga, sigue en P0
P0 ── lápiz de una tarjeta ──▶ diálogo «Editar partida» ──▶ Guardar/Cancelar/Eliminar (J2d) ──▶ vuelve a P0
P6 ── Cambiar de partida ──▶ P0
P6 ── Gestionar listas ──▶ P7 (fase 9, no existe en la 6a: duda §9.11)
P6 ── Borrar partida (J2d) ──▶ P0
P1/P1b ── Cancelar ──▶ P0 (nada se ha guardado)
P1b ── Atrás ──▶ P1 (conservando los datos del asistente)
```

### 8.1 Qué se muestra al abrir una partida, mientras la 6b no existe

Este es el punto que el encargo pide explícitamente («hacia la 6b, que aún no existe: qué se muestra mientras
tanto»). Tanto **crear** una partida (P1b, «Crear partida») como **abrir** una ya existente (P0, «Continuar»/
«Abrir») terminan en el mismo sitio: la partida queda cargada en memoria y la especificación dice que se entra
en el marco de la partida con Inicio (P2) activo (§5). P2, P3, P4 y P5 son de la **6b** («las pantallas que usan
el motor», que se hacen «al terminar la 5» según el encargo) y no existen todavía en la 6a. Lo único que sí
existe para construir en la 6a es **el marco** (barra superior sin aviso/«Avanzar días» + menú lateral, §7.1) y,
dentro de él, **P6**.

No hay ninguna frase de la especificación que resuelva qué pintar en el hueco de Inicio mientras tanto: es la
duda §9.13, con recomendación.

---

## 9. Dudas (no resueltas por la especificación ni las vistas)

### 9.1 / 8.1 / 0 — Qué se muestra al abrir o crear una partida, sin P2/P3/P4/P5

La especificación da por hecho que existe Inicio (P2): «Al abrir, la app muestra la última partida usada» (§5
línea 203) y «tocar una tarjeta de dominio abre su Resumen» (línea 227), pero en la 6a ni Inicio ni los Resúmenes
existen.

- **A.** Mostrar el marco (barra superior + menú) con un contenido de relleno neutro en el hueco de Inicio (por
  ejemplo, «Inicio llega en la fase 6b», con enlace a Ajustes) y dejar activables solo «Ajustes y copias» en el
  menú; las demás filas del menú (Inicio, Calendario, cada dominio) quedan sin función todavía (o llevan al
  mismo relleno).
- **B.** Nada más crear/abrir una partida, entrar directamente en P6 (que sí existe), sin pasar por ningún hueco.
- **C.** No entrar en el marco todavía: quedarse en P0 y no exponer «Continuar»/«Abrir» como navegación real
  hasta la 6b (rompe el entregable pedido: «crea una, abre la de ejemplo»).

**Recomendación**: A. Es lo más fácil de sustituir después (la 6b solo tiene que reemplazar ese componente de
relleno por el Inicio real) y conserva el marco ya construido en la 6a (barra superior + menú, §7.1) en vez de
descartarlo. Mismo criterio para «al reabrir la app con una partida ya usada» (§0): en vez de forzar el
auto-arranque directo a Inicio, entrar igual en el marco con el mismo relleno.

### 9.2 — Texto del estado vacío de P0

§6.1 (línea 264) solo dice «estado vacío con «Nueva partida» e «Importar copia» destacados», sin redactar el
texto. **Recomendación**: reutilizar el tono de la nota que ya lleva la pantalla con partidas («Tus partidas se
guardan solo en esta tablet. Exporta una copia de vez en cuando para no perderlas.», `SelectorPartidas.dc.html`
línea 52) con una frase corta tipo «Todavía no tienes ninguna partida.» encima de los dos botones destacados,
siguiendo el patrón general de estados vacíos de §6.4 (línea 820: «frase breve y botón de alta centrado»).

### 9.3 — `abrirPartida` devuelve `undefined` con el resumen presente

No debería pasar en uso normal (el resumen y el documento se escriben/borran siempre juntos, en la misma
transacción, en `crearPartida`, `guardarPartida`, `importarCopia` y `borrarPartida`), pero la función lo
contempla como caso posible. **Recomendación**: tratarlo como corrupción de datos y mostrar un aviso genérico
(«No se ha podido abrir esta partida») que vuelva a P0 tras refrescar la lista, en vez de intentar seguir con un
documento inexistente.

### 9.4 — Mensajes de «nombre obligatorio» / «demasiado largo»

`EsquemaNombreLibre` (`src/dominio/modelo/comunes.ts:150`, usado por el nombre de la partida en P1 y el del
personaje en P1b) es `z.string().min(1).max(60)` **sin** `.check()` con mensaje en castellano (a diferencia de
`EsquemaFecha` o `EsquemaEquivalencias`, que sí lo traen). **Recomendación**: reutilizar la redacción que ya usa
la especificación para el mismo caso en otro formulario — «Escribe un nombre» para el campo vacío (§12 línea
1452, estado de J2e) — y algo simétrico para el máximo, «Nombre demasiado largo (máximo 60 caracteres)», para no
inventar un tono distinto.

### 9.5 — Si «Editar partida» usa Día/Mes/Año sueltos (como P1) o el «campo de fecha» con panel

La fila de la tabla de formularios (§6.4, línea 660) lista los selectores de «Editar partida» como «Mes, Fecha»
— «Mes» encaja con el desplegable de mes que ya usa P1, pero «Fecha» sugiere también el componente con panel de
calendario (n.º 3, línea 881), que P1 no usa para la fecha inicial (usa tres campos sueltos + Edad). No hay
artboard de «Editar partida» que lo resuelva. **Recomendación**: replicar exactamente los campos de P1 (Día,
Mes, Año, Edad como en `NuevaPartida.dc.html`), porque el propio texto de la fila dice «fecha inicial y Edad
(segmentos)» — el mismo enunciado que P1 — y mantener un único patrón de «fecha inicial de partida» en toda la
app es lo que menos añade.

### 9.6 — Editar la fecha inicial y la fecha `alta` de asentamientos ya creados

`DominioAsentamiento.alta` se fija «en P1, la fecha inicial» (comentario en `src/dominio/modelo/dominios.ts:20`)
al crear el asentamiento. Si más tarde se edita la fecha inicial de la partida desde P0 (posible mientras
`!hayAvances`, y se puede haber creado ya algún asentamiento sin que eso cuente como avance), la fecha `alta` de
esos asentamientos quedaría desalineada con la nueva fecha inicial. **Fuera del alcance real de la 6a** (crear
asentamientos no es una pantalla de esta fase), así que no bloquea nada ahora. **Recomendación**: dejarlo
anotado para cuando exista «Añadir asentamiento», y decidir entonces si «Editar partida» debe arrastrar las
fechas `alta` ya guardadas o solo avisar.

### 9.7 — Valor inicial del campo Año en P1

Ni la especificación ni el artboard fijan un año por defecto al abrir P1 (el artboard usa el año del estado de
ejemplo, 1640, que es solo ilustrativo). **Opciones**: (A) dejarlo vacío, forzando a teclear; (B) sugerir el año
en curso del calendario real (`new Date().getFullYear()`); (C) repetir el año de la última partida creada.
**Recomendación**: A — dejarlo vacío. Evita dar una fecha con apariencia de «año en curso del mundo real» en una
partida de fantasía medieval, y es lo más fácil de cambiar si luego se prefiere sugerir algo.

### 9.8 — Texto de la confirmación «Reemplazar / Importar como copia» y «reemplaza la partida actual»

§6.4 (línea 691) solo describe el comportamiento («Explican qué se pierde y ofrecen la acción en rojo»), sin dar
la redacción. **Recomendación**: «Ya tienes una partida llamada «&lt;nombre&gt;». ¿Quieres reemplazarla o
importar esta copia como una partida nueva?» para P0, y «Vas a reemplazar «&lt;nombre&gt;» por la copia
importada. Se perderá lo que no esté en el archivo.» para P6 — ambas siguiendo el patrón de «explican qué se
pierde» y con la acción destructiva («Reemplazar») en lacre.

### 9.9 — Bolsa inicial de P1b con 0 filas

`Caja.saldoInicial` solo exige `base >= 0` (`EsquemaImporteMagnitud`); nada impide que sea 0. **Recomendación**:
permitir 0 filas (bolsa vacía → 0 mo), ya que técnicamente es un valor válido y encaja con «lo más simple que
cumpla las reglas del juego»; que el resumen muestre «0 mo» en ese caso, sin bloquear «Crear partida».

### 9.10 — Cómo se abre la partida de ejemplo desde P0

`documentoDeEjemplo()` (`src/dominio/ejemplo/sombraDelEste.ts:55`) existe y ya se usa así en las pruebas de la
fase 2 (`crearPartida(db, documentoDeEjemplo(), ahora)`), pero ningún artboard ni la especificación dibujan un
botón «Abrir partida de ejemplo» en P0.

- **A.** Sembrarla automáticamente la primera vez que la app arranca sin ninguna partida (antes de decidir la
  pantalla inicial, §0), de modo que P0 nunca esté realmente vacía.
- **B.** Botón explícito «Abrir partida de ejemplo» junto a «Nueva partida» / «Importar copia» en el estado
  vacío de P0 (y quizá también con partidas ya guardadas, si «La Sombra del Este» se borró).
- **C.** Empaquetar el JSON de la copia de ejemplo como asset estático e importarlo con el mismo flujo de
  «Importar copia» (§4).

**Recomendación**: B. La A cambia el comportamiento «sin partidas, muestra P0 vacío» que sí está en la
especificación (línea 203); la C duplica en un asset lo que `documentoDeEjemplo()` ya da limpio en código. Con
B, antes de crear, comprobar si `p.sombra-del-este` ya existe (`leerPartida(db, PARTIDA_ID)`) y, si existe,
`abrirPartida` en vez de `crearPartida` (que si no, lanza `Error('Ya hay una partida con el id «p.sombra-del-
este»')` en el segundo toque).

### 9.11 — «Gestionar listas» hacia P7, que es de la fase 9

`Ajustes.dc.html` (línea 60) dibuja el botón «Gestionar listas» con toda naturalidad, pero P7 (Listas y
catálogos) está en el alcance de la **fase 9** (hoja de ruta, línea 129), muy después de la 6a. Mismo problema
con las filas de Inicio, Calendario y cada dominio del menú lateral (§7.1). **Recomendación**: el mismo
componente de relleno de la duda §9.1 sirve aquí; no hace falta deshabilitar visualmente el botón ni las filas
del menú (así no hay que recordar «reactivarlas» en cada fase siguiente): que todas naveguen al mismo hueco
neutro hasta que su pantalla real exista.

### 9.12 — P6 sin «Última copia exportada» (partida recién creada)

`ResumenPartida.exportadaEl` es opcional (`src/dominio/modelo/resumen.ts:19`) y no tiene valor hasta la primera
exportación. **Recomendación**: mostrar «Nunca» en esa fila en vez de dejarla vacía o esconderla, coherente con
el resto de la fila («Ración de víveres: …», siempre con un valor).

### 9.13 — Confirmación al pulsar «Cancelar» en P1/P1b

El patrón «Cerrar con cambios» (§6.4 línea 819) está pensado para diálogos que editan un registro ya existente;
P1/P1b son un asistente de pantalla completa que no ha guardado nada hasta el final. **Recomendación**: sin
confirmación en ninguno de los dos pasos — nada se pierde de la base de datos porque nada se ha escrito todavía;
mantiene la coherencia con «Cancelar» de otros formularios de alta que tampoco piden confirmación antes del
primer guardado.

---

## 10. Inconsistencias detectadas

1. **§6.4, fila «Editar partida» (línea 660)**: la columna «Selectores» dice «Mes, Fecha», pero el propio texto
   de la fila («fecha inicial y Edad (segmentos)») describe los mismos campos que P1 (Día/Mes/Año sueltos +
   Edad), y P1 no usa el selector «Fecha» (n.º 3, con panel de calendario) para su fecha inicial. Ver duda
   §9.5.
2. **`Ajustes.dc.html`** (línea 26) dibuja el botón «Avanzar días» en la barra superior de P6, pero el propio
   encargo de la 6a pide construir esa barra «sin el aviso ni «Avanzar días» aún». No es un error del artboard
   (todas las vistas comparten el mismo estado de ejemplo de la especificación completa, incluida la fase del
   motor), pero conviene no copiar ese botón al construir el marco de la 6a.
3. **`SelectorPartidas.dc.html`** dibuja dos tarjetas de partida («La Sombra del Este» y «Los Senderos del
   Norte»), pero `src/dominio/ejemplo` solo define una («La Sombra del Este», `documentoDeEjemplo()`). «Los
   Senderos del Norte» es únicamente ilustración del diseño (para mostrar cómo se ve una segunda tarjeta con
   «Abrir» en vez de «Continuar»); no hay ninguna función de dominio que la genere ni se pide como parte del
   entregable.
