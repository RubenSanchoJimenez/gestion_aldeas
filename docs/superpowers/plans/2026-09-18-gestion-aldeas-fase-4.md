# Gestión de Aldeas · Fase 4 · Motor II: almacén

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para llevar el seguimiento.

**Objetivo:** dar al motor de «Gestión de Aldeas» el almacén completo de un asentamiento — población, consumo, producción de edificios, capacidad y pérdidas, caravanas de compra, venta y traslado, obras, eventos con efectos de producción y de consumo, previsión a 30 días, días de reserva y avisos de faltas y pérdidas — junto con la edición y el borrado de todos esos registros, para que P4, P5 y las pantallas de asentamiento de las fases siguientes tengan datos reales que pintar.

**Arquitectura:**
- **`src/dominio/almacen/`**: cálculo puro de cantidades, producción, progreso, previsión y el entregable de la fase (`cantidades.ts`, `produccion.ts`, `progreso.ts`, `prevision.ts`, `entregable.test.ts`). No dependen del motor salvo `prevision.ts`, que simula con `motor/bucle.ts` sin guardar nada.
- **`src/dominio/motor/`**: el bucle diario gana los pasos 3 (inicio), 4 (producción), 5 (consumo), 6 (obras) y la mercancía del paso 7 (llegada de compras y traslados) en `motor/pasos/`; `motor/almacen.ts` reúne las operaciones sobre una fila del almacén (sumar, consumir, sacar, saber si cabe); `motor/contexto.ts`, `motor/tipos.ts`, `motor/caja.ts`, `motor/cambios.ts`, `motor/simular.ts` y `motor/textos.ts` se amplían para llevar las existencias, los edificios, las obras, las caravanas, los flujos del almacén y sus textos.
- **`src/dominio/avisos/`**: `avisos/almacen.ts` (faltas y pérdidas) y `avisos/pendientes.ts` (obras, caravanas, compras que no pudieron empezar, y edificios terminados) se suman a `avisos/avisos.ts`, que ya existía.
- **`src/dominio/edicion/`**: siete módulos nuevos (`existencias.ts`, `entradas.ts`, `edificios.ts`, `mercados.ts`, `obras.ts`, `caravanas.ts`, `eventos.ts`) con las reglas de creación, edición y borrado de la tabla «Al eliminar» de la especificación, siguiendo el patrón ya establecido en la fase 3 (TC17): funciones puras, `<E extends EstadoPartida>`, la misma referencia si nada cambia.
- **`src/dominio/validacion/referencias.ts`** se relaja (D-055) para que la historia de un avance pueda nombrar registros que ya se han borrado.
- Ninguna pantalla: la interfaz de estas vistas (P4, P5, A4, A7 a A11) es de las fases 6 y 8. El dominio sigue puro: sin Dexie, sin React, sin APIs del navegador.

**Tecnología:** la misma de las fases 1 a 3 (Node 24, Vite 8, React 19, TypeScript 6 estricto, oxlint y Vitest 5). Esta fase **no añade ninguna dependencia nueva**: ni `package.json` ni `package-lock.json` cambian.

**Fuentes** (mandan en este orden):
- El contrato de esta fase, `…/scratchpad/fase-4/contrato.md`: alcance, estructura de archivos, firmas exactas, algoritmos, textos literales, los 13 oráculos numéricos (O1 a O13) y la lista de 29 tareas con sus dependencias y recuentos.
- Las decisiones de la fase, `…/scratchpad/fase-4/decisiones-fase-4.md`: D-044 a D-068 y las técnicas TC1 a TC22.
- Los informes `reglas-almacen.md`, `ejemplo-cifras.md`, `codigo-y-arquitectura.md` y `critica.md`, y la simulación día a día de `…/scratchpad/fase-4/sim/`, que reproduce las cifras del entregable.
- Especificación: `docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md`.
- Hoja de ruta: `docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md», «Fase 4 · Motor II: almacén». Plan y cierre de la fase 3: `docs/superpowers/plans/2026-09-18-gestion-aldeas-fase-3.md`.
- Vistas: `design/build-artboards.mjs` (P4, P5, Inicio, A1, A4, A7, A7b, A8, A9, A10, A10b).
- Código: el clon verificado de la fase 3 (rama `verificacion/fase-3`, **902 pruebas en 81 archivos**), no el repositorio de trabajo. Todas las rutas `src/…` de este plan son relativas a la raíz del proyecto.

**Reglas que valen en todas las tareas** (las mismas de las fases 1 a 3, `CLAUDE.md`):
- Identificadores en castellano, sin tildes ni eñes; los textos que ve el jugador sí llevan tildes.
- TypeScript estricto; sin punto y coma, comillas simples, 2 espacios, comas finales.
- `src/dominio` es puro: sin Dexie, sin React y sin `indexedDB`, `localStorage`, `window`, `document`, `navigator` ni `crypto`.
- Imports relativos sin extensión, sin archivos barril (`index.ts`), JSDoc de una línea en castellano citando la sección de la especificación o del contrato.
- Orden TDD en cada tarea: la prueba que falla (con su fallo literal) → la implementación mínima → la prueba que pasa → `npx tsc -b` y `npm test` con su recuento → el commit.
- Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (el clon de verificación del scratchpad, o `C:/Proyectos/GA/gestion_aldeas` cuando el plan se ejecute de verdad, nunca al revés).
- Coma flotante: nunca `toEqual` sobre cantidades del motor; `toBeCloseTo(x, 3)` o redondear a 3 decimales antes de comparar listas.
- Commits en castellano con el prefijo del tipo (`feat(almacen): …`, `feat(motor): …`, `feat(avisos): …`, `feat(edicion): …`, `fix(validacion): …`, `test(fase-4): …`) y terminados con `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## Qué entra y qué no en esta fase

**Alcance** (hoja de ruta, «Fase 4 · Motor II: almacén», menos lo que ya adelantó la fase 3 por D-019):

- población con cambios fechados (sin paso propio: `habitantesEl` al vuelo);
- consumo de víveres con la ración y de los demás consumos por habitante (la leña sale de la madera), parando en 0;
- producción de edificios: varios productos, factor diario, periodo, acumulado y `ProduccionRealizada` (decisión del usuario del 2026-09-17, «Decisiones tuyas», citada en el plan de la fase 2 como «decisión 1»);
- capacidad y pérdidas;
- paso 3 (inicio de obras, salida de caravanas y compras programadas), paso 6 (fin de obras y su efecto) y la llegada de compras y traslados del paso 7; el cobro de la vuelta de las ventas ya existe (`pasoVueltaDeVentas`, D-019);
- eventos con efectos de producción y de consumo (los de dinero ya están, D-019 y D-026);
- previsión a 30 días, días de reserva, «caben N el día de llegada» y cantidad prevista de la próxima producción (A7 y A7b);
- avisos de faltas, pérdidas, obras y caravanas o compras que no pudieron empezar, edificio terminado y mejora terminada;
- cambios del avance: filas `almacen` y los hechos nuevos de «Qué ha pasado» (D-052);
- edición con reglas: filas del almacén y ajustes, compras y recepciones, edificios y producciones (A7b), obras, caravanas, mercados, precios y rutas, y eventos («Terminar hoy» y borrar), con la tabla «Al eliminar»;
- la validación de copias admite historia que nombra registros borrados (D-055, TC15).

**No entra en esta fase:**
- ninguna pantalla (fases 6 y 8): los rótulos de P4 («día 14, lluvias −20 %»), la frase «Al acabar quedan 93 sacos: …», las marcas del calendario, «eliminado» en la interfaz;
- editar una compra o recepción ya guardada (se borra y se vuelve a crear; la edición «en modo edición» de A8b queda para la fase 8);
- altas y ediciones sin reglas propias (cambio de población, consumo por habitante, evento nuevo, defensa, mercado nuevo): son reemplazos simples que hará la fase 8 con `reemplazarPorId`;
- deudas, intereses y vencimientos (paso 10, fase 5);
- cambios de esquema Zod o de `VERSION_FORMATO`: la fase no crea ni cambia esquemas.

**Entregable** (hoja de ruta): pruebas con las cifras de las vistas — P5 a 7 días (víveres 93, madera 386, piedra 197, cerveza 84 y lana 47 sacos/haces/carretadas/barriles/fardos en Bree), A8 a 30 días (víveres +714 −975 → 49; madera 297; piedra 263; arcilla 157; cerveza 78; lana 95), días de reserva (víveres 11, cerveza 105, madera 85) y el ejemplo de la mina (≈ 8,3 carretadas) — más los oráculos O1 a O13 del contrato (P4, A8, días de reserva, la mina, caben y faltas de A10b, obras y caravanas del ejemplo, avisos, cambios del avance a 7 y 19 días, un año completo y la edición con el ejemplo). La tarea 28 recorre ese camino entero y la tarea 29 lo comprueba punto por punto.

---

## Estructura de archivos de la fase 4

`N` = módulo nuevo con su prueba al lado; `M` = módulo que cambia; `[Tn]` = tarea que lo crea o lo cambia. Cada módulo nuevo de `src/dominio` suma **una** prueba a `pureza.test.ts` sin tocarlo.

```
docs/decisiones.md                          M  sección «Fase 4» con D-044 a D-068 (la escribe el coordinador antes; T1 solo comprueba)  [T1]

src/dominio/calendario/formatoFecha.ts      M  enumerar (exportada) y formatearTramoDelAvance                              [T2]
src/dominio/almacen/cantidades.ts           N  TOLERANCIA, claveExistencia, conEfectoCantidad, formatos de cantidades, caben, sacos por personas  [T3]
src/dominio/validacion/referencias.ts       M  importa claveExistencia [T3]; historia que nombra registros borrados [T20]
src/dominio/eventos/efectos.ts              M  eventosConEfectosEl (sustituye a eventosDeDineroEl), pctDeProduccion, pctDeConsumo  [T4]
src/dominio/motor/bucle.ts                  M  pasoEventos con todos los eventos con efectos [T4]; Recorrido.flujos [T8]; PASOS_DEL_DIA [T14]
src/dominio/almacen/produccion.ts           N  asignados, factor diario, primer día que cuenta, periodo, cantidad, días acumulados  [T5]
src/dominio/almacen/progreso.ts             N  fin y progreso de una obra; vuelta y progreso de una caravana                [T6]
src/dominio/motor/textos.ts                 M  conceptos, hechos, avisos y mensajes del almacén                             [T7]
src/dominio/motor/tipos.ts                  M  FlujoAlmacen, sucesos obraTerminada y llegadaTraslado, ResultadoSimulacion.flujos  [T8]
src/dominio/motor/contexto.ts               M  filas vivas, acumulados, copias de edificios, obras, defensas, entradas y producciones, flujos  [T8]
src/dominio/motor/caja.ts                   M  pagarEntero y pagoProgramado                                                [T8]
src/dominio/motor/almacen.ts                N  filaEn, flujoDe, sumarAlAlmacen, consumirDelAlmacen, hayDeTodo, sacarDelAlmacen  [T8]
src/dominio/motor/cambios.ts                M  ignora los sucesos nuevos [T8]; filas «almacen» y hechos nuevos [T15]
src/dominio/motor/simular.ts                M  devuelve flujos [T8]; avisos con lo ocurrido [T19]
src/dominio/motor/pruebas/constructores.ts  M  conFila, diaDe y recorrerPasos (ayudantes de prueba)                         [T8]
src/dominio/motor/pasos/produccion.ts       N  paso 4                                                                     [T9]
src/dominio/motor/pasos/consumo.ts          N  paso 5                                                                     [T10]
src/dominio/motor/pasos/inicio.ts           N  paso 3                                                                     [T11]
src/dominio/motor/pasos/obras.ts            N  paso 6                                                                     [T12]
src/dominio/motor/pasos/caravanas.ts        M  pasoLlegadaDeCaravanas (paso 7, mercancía)                                  [T13]
src/dominio/almacen/prevision.ts            N  preverAlmacen, resumirFilas, diasDeReserva, cabenElDia, proximasProducciones  [T16]
src/dominio/avisos/almacen.ts               N  faltas y pérdidas, ocurridas y previstas                                    [T17]
src/dominio/avisos/pendientes.ts            N  obras, caravanas y compras que no pudieron empezar; edificio y mejora terminados  [T18]
src/dominio/avisos/avisos.ts                M  avisosEn(estado, catalogo, ocurrido)                                       [T19]
src/dominio/edicion/existencias.ts          N  fila del almacén, ajustes y borrado de la fila                              [T21]
src/dominio/edicion/entradas.ts             N  comprar en el mercado local y recibir sin coste; borrar                     [T22]
src/dominio/edicion/edificios.ts            N  crear, guardar (A7b) y borrar edificios                                     [T23]
src/dominio/edicion/mercados.ts             N  días de viaje, rutas, precios y borrado de mercados                         [T24]
src/dominio/edicion/obras.ts                N  crear, empezar, planificar, editar y borrar obras                           [T25]
src/dominio/edicion/caravanas.ts            N  crear, editar y borrar caravanas                                            [T26]
src/dominio/edicion/eventos.ts              N  «Terminar hoy» y borrar eventos                                             [T27]
src/dominio/almacen/entregable.test.ts      N  (solo prueba) el entregable de la hoja de ruta y la prueba de humo del almacén  [T28]
```

**Sin ciclos de importación**: `almacen/cantidades`, `almacen/produccion` y `almacen/progreso` solo importan `calendario`, `dinero` y `modelo`; `motor/*` importa `almacen/*`; `almacen/prevision` importa `motor/bucle`; `avisos/*` importa `almacen/prevision`; `motor/simular` importa `avisos/avisos`; `motor/bucle` **no** importa `avisos`. Este plan comprueba con un script, al montarlo, que ninguna tarea importa un archivo que crea una tarea posterior; el resultado no encontró ninguna infracción real (dos falsos positivos, por nombres de módulo repetidos en carpetas distintas — `modelo/almacen.ts` de la fase 2 frente a `motor/almacen.ts` de esta fase, y el tipo `QuePago` que `motor/tipos.ts` ya tenía desde la fase 3 — quedaron descartados al revisarlos).

Totales: **18 módulos nuevos** (18 archivos de prueba nuevos) más `almacen/entregable.test.ts`: **19 archivos de prueba nuevos** sobre los 81 de la fase 3, así que la fase cierra con exactamente **100 archivos**. En pruebas, el contrato estimaba unas 1.183; encadenando el recuento real que cada grupo verificó tarea a tarea (§9 de este plan explica cómo), la fase cierra con **1.253 pruebas** — la tarea 29 es quien lo comprueba de verdad con `npm test`.

---

## Índice de las 29 tareas

Recuento encadenado desde el final de la fase 3: **902 pruebas en 81 archivos**. La columna «Pruebas» es lo que añade cada tarea (verificado tarea a tarea, no la estimación del contrato); «Total» y «Archivos» son el acumulado real. El número de archivos coincide en todo momento con el que estimaba el contrato — ninguna tarea crea o quita un archivo de más o de menos —; el de pruebas se desvía a partir de la tarea 3 porque varias tareas necesitaron más casos de los que el contrato agrupaba (§9, aviso 2, lo avisa expresamente). Cada tarea documenta también, en su propio texto, cuánto añade ella sola sobre lo que le deje la anterior, para poder seguir el plan aunque el recuento real de alguna tarea previa cambie.

| # | Tarea | Depende de | Pruebas | Total | Archivos |
|---|---|---|---|---|---|
| — | *(fin de la fase 3)* | — | — | 902 | 81 |
| 1 | Registro de decisiones | — | 0 | 902 | 81 |
| 2 | Días de un tramo del avance | — | 6 | 908 | 81 |
| 3 | Cantidades del almacén | — | 18 | 926 | 82 |
| 4 | Eventos de producción y consumo | — | 5 | 931 | 82 |
| 5 | Producción: factor, periodo y cantidad | — | 19 | 950 | 83 |
| 6 | Progreso de obras y caravanas | — | 13 | 963 | 84 |
| 7 | Textos del almacén | 2, 3 | 21 | 984 | 84 |
| 8 | Contexto, caja y almacén del motor | 3, 5 | 26 | 1010 | 85 |
| 9 | Paso 4: producción | 4, 5, 8 | 12 | 1022 | 86 |
| 10 | Paso 5: consumo | 4, 8 | 10 | 1032 | 87 |
| 11 | Paso 3: inicio de obras, caravanas y compras | 8 | 15 | 1047 | 88 |
| 12 | Paso 6: obras | 6, 8 | 12 | 1059 | 89 |
| 13 | Paso 7: llegada de compras y traslados | 8 | 6 | 1065 | 89 |
| 14 | El bucle con los pasos del almacén | 9, 10, 11, 12, 13 | 4 | 1069 | 89 |
| 15 | Cambios del avance: almacenes y hechos | 7, 14 | 3 | 1072 | 89 |
| 16 | Previsión, días de reserva y próximas producciones | 14 | 17 | 1089 | 90 |
| 17 | Avisos de faltas y pérdidas | 7, 16 | 14 | 1103 | 91 |
| 18 | Avisos de obras, caravanas, compras y edificios | 3, 7 | 10 | 1113 | 92 |
| 19 | Avisos juntos y `simular` | 17, 18 | 2 | 1115 | 92 |
| 20 | Validación: la historia puede nombrar lo borrado | 3 | 5 | 1120 | 92 |
| 21 | Existencias: fila, ajustes y borrado | 7, 20 | 26 | 1146 | 93 |
| 22 | Compras y recepciones del almacén | 21 | 13 | 1159 | 94 |
| 23 | Edificios: crear, guardar y borrar | 5, 21 | 14 | 1173 | 95 |
| 24 | Mercados, precios y rutas | 20 | 13 | 1186 | 96 |
| 25 | Obras: crear, empezar, editar y borrar | 6, 21 | 20 | 1206 | 97 |
| 26 | Caravanas: crear, editar y borrar | 6, 21, 24 | 20 | 1226 | 98 |
| 27 | Eventos: terminar hoy y borrar | 4 | 7 | 1233 | 99 |
| 28 | Entregable de la fase 4 | 16, 19, 25, 26 | 20 | 1253 | 100 |
| 29 | Cierre de la fase | 28 | 0 | 1253 | 100 |

**Sobre este recuento** (nota del ensamblado, no del contrato): el contrato estimaba unas 1.183 pruebas en 100 archivos. Los grupos que escribieron y verificaron cada tarea (algunos en clones aislados, aplicando solo su propio bloque de tareas sobre una base reconstruida a mano) fueron encontrando, tarea a tarea, más casos de los que el contrato agrupaba —`factorDiario` con sus ramas por separado, `editarObra` y `eliminarObra` con una prueba por estado, `bloqueos` de mercados en cuatro `it` en vez de uno, entre otros— y cada `pureza.test.ts` que un módulo nuevo suma de más. Cada tarea de este documento explica, en su propio texto, cuánto añade ella sola (la cifra que de verdad importa para ejecutar el plan) y a partir de qué base debería partir en una ejecución de principio a fin; este índice encadena esas cifras propias desde 902/81 para dar un recuento único y consistente de punta a punta. Si al ejecutar el plan de verdad algún `npm test` da un número distinto del de esta tabla, la regla sigue siendo la del contrato (§9, aviso 2): sigue con el tuyo y anótalo en los «Huecos» de esa tarea; lo único que no puede variar es el número de archivos.

---

### Tarea 1 · Registro de decisiones (0 pruebas)

Antes de escribir código hace falta tener por escrito lo que la fase 4 decide sin preguntar. Eso **lo hace el coordinador antes de esta tarea**: un commit en `docs/decisiones.md` que añade la sección «Fase 4 · Motor del almacén (2026-09-18)» con las 25 decisiones D-044 a D-068 (contrato de la fase, `decisiones-fase-4.md`, apartado (a)). Esta tarea **solo comprueba** que eso está en la rama y que el proyecto arranca en verde: no escribe ni cambia ningún archivo de `src/` y no hace commit.

Si alguna comprobación no da lo esperado, **para**: la rama no parte del punto correcto y los recuentos de las tareas siguientes no cuadrarán.

**Reglas de la especificación que implementa:**

- **Ninguna regla del juego.** Esta tarea no toca `src/` ni la especificación. Lo que comprueba viene de `CLAUDE.md`, «Registro de decisiones»: «Anota **cada** decisión en `docs/decisiones.md` para que el usuario pueda cambiarla luego» — las 25 decisiones de la fase (D-044 a D-068) tienen que estar en una tabla con su identificador, la decisión y el porqué, de la más reciente a la más antigua dentro de su sección.
- **Rama por fase** (`CLAUDE.md`, «Cómo se construye»). «`implementacion/fase-N`, creada desde la rama de trabajo actual».
- **Numeración sin huecos ni pisadas** (contrato de la fase 4, §0 y `decisiones-fase-4.md` l.7). «La numeración sigue en D-044 […]. La tarea 1 del plan comprueba que no se pisa ningún número»: el último número que dejó la fase 3 es D-042 (`docs/decisiones.md`, sección «Fase 3»), así que D-044 no pisa nada y no hay hueco mayor que el de D-043, que el propio contrato reserva para lo que añada la revisión final de la fase 3.

**Archivos:**
- Comprobar, sin cambiarlo: `docs/decisiones.md`

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas` o el clon donde se ejecute el plan).

- [ ] **Paso 1: Comprobar la rama de la fase**

```bash
git branch --show-current
```

Salida esperada:

```text
implementacion/fase-4
```

Si imprime `diseno/especificacion-y-vistas`, la rama de la fase todavía no existe: créala desde ahí con `git switch -c implementacion/fase-4` y vuelve a ejecutar el comando. Si imprime cualquier otra cosa, para: no estás en el punto de partida de la fase 4.

- [ ] **Paso 2: Comprobar que D-044 a D-068 están en el registro, sin pisar la fase 3**

```bash
for n in $(seq 44 68); do grep -q "^| D-0$n |" docs/decisiones.md || echo "falta D-0$n"; done
grep -c "^| D-0\(4[4-9]\|5[0-9]\|6[0-8]\) |" docs/decisiones.md
grep -n "^## " docs/decisiones.md
sed -n '/^## Fase 3/,/^## Fase 4/p' docs/decisiones.md | grep -o "D-0[0-9]\+" | tail -1
```

Salida esperada: el primer bucle no escribe ninguna línea «falta D-0NN» (están las 25), el segundo comando da **25**, la sección «Fase 4 · Motor del almacén (2026-09-18)» aparece entre la de la fase 3 y «Decisiones tuyas», y la última decisión que la sección «Fase 3» menciona antes de «Fase 4» es **D-042** (menor que 44, sin pisar nada):

```text
25
7:## Fase 1 · Dinero y calendario (2026-09-17)
16:## Fase 2 · Modelo de datos y copias de seguridad (2026-09-17 y 18)
35:## Fase 3 · Motor de dinero (2026-09-18)
64:## Fase 4 · Motor del almacén (2026-09-18)
90:## Decisiones tuyas
108:## Pendientes
D-042
```

Los números de línea de las secciones pueden cambiar si el coordinador ha añadido después más contenido; lo que importa es el orden: Fase 1 → Fase 2 → Fase 3 → Fase 4 → Decisiones tuyas → Pendientes.

Si el primer comando escribe alguna línea «falta D-0NN», o si el recuento no da 25, o si «D-042» no es la última decisión de la fase 3, para: pídele al coordinador que complete `docs/decisiones.md` antes de seguir.

- [ ] **Paso 3: Comprobar el punto de partida de las pruebas**

```bash
npx tsc -b
npm test
npm run lint
```

Si `npm test` dice que no encuentra `vitest` (un clon o una copia de trabajo recién creados no traen `node_modules`), ejecuta antes `npm install`, que no cambia `package.json` ni `package-lock.json`.

Salida esperada: `npx tsc -b` no escribe nada, `npm run lint` solo imprime su cabecera (`> gestion-aldeas@0.0.0 lint` y `> oxlint`) y termina sin errores, y `npm test` termina con **902 pruebas en 81 archivos**, las que dejó la fase 3 (la hora y la duración varían; debajo puede salir una nota de Vitest sobre «Transform», que es inofensiva):

```text
 Test Files  81 passed (81)
      Tests  902 passed (902)
```

Esta tarea **no hace commit**: no ha cambiado nada. `git status --short` sigue sin mostrar nada. La tarea 2 parte de estas 902 pruebas.

---

### Tarea 2 · Días de un tramo del avance (6)

Los hechos nuevos de «Qué ha pasado» que trae la fase 4 (una obra terminada, un evento que acaba, una caravana o un traslado que llega) necesitan escribir el tramo de días en el que cae un suceso, no solo un día suelto: «Feria de primavera · 15 al 17» (D-052). Esta tarea añade `formatearTramoDelAvance` a `calendario/formatoFecha.ts`, que ya tiene `formatearDiaDelAvance` (la versión de un solo día) de la fase 3, y exporta `enumerar`, que hasta ahora era privada del archivo y que la tarea 7 (textos del almacén) necesita para «la caravana de Tharbad no vuelve hasta el 25 de abril» y para juntar varias faltas en una frase.

No se crea ningún módulo: `calendario/formatoFecha.ts` ya existe desde la fase 1 y esta tarea solo lo amplía. Por eso no suma ninguna prueba a `pureza.test.ts` (esa cuenta solo módulos **nuevos**).

**Reglas de la especificación que implementa:**

- **Hechos del avance con un tramo de días** (contrato de la fase 4, §3.1 y D-052). «Qué ha pasado» añade las obras terminadas, los eventos que acaban durante el avance con sus días («Feria de primavera · 15 al 17») y las compras y traslados que llegan. El texto del tramo sigue la misma regla que ya usa `formatearDiaDelAvance` para un día suelto (fase 3, T18): con un día, solo el número si el avance cae en un mes; con el mes, si cae en un año; con el año, si cruza de año. `formatearTramoDelAvance` generaliza esa regla a un **rango** de fechas, mirando también si el propio tramo cruza de mes o de año.
- **Enumeración de nombres** (contrato de la fase 4, §3.6, T7). Los avisos de falta con una caravana que tarda («…y la caravana de Tharbad no vuelve hasta el 25 de abril») y los mensajes que juntan varias faltas (`textoFaltan`: «Faltan 20 carretadas de cal y 5 haces de madera») usan la misma forma de enumerar una lista corta («a», «a y b», «a, b y c») que ya tiene `formatoFecha.ts` desde la fase 1 para los meses (`formatearMeses`). Exportarla evita escribirla dos veces.

**Archivos:**
- Modificar: `src/dominio/calendario/formatoFecha.ts`
- Prueba: `src/dominio/calendario/formatoFecha.test.ts`

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

- [ ] **Paso 1: Escribir las pruebas que fallan**

Añade este bloque `describe` al final de `src/dominio/calendario/formatoFecha.test.ts`, y añade `formatearTramoDelAvance` a la lista de símbolos que importa de `./formatoFecha` (junto a `formatearMeses`):

```ts
import {
  ABREVIATURA_EDAD,
  formatearDiaCercano,
  formatearDiaDelAvance,
  formatearDiaMes,
  formatearFecha,
  formatearMeses,
  formatearTramoDelAvance,
  NOMBRES_DIA,
  NOMBRES_MES,
} from './formatoFecha'
```

```ts
describe('formatearTramoDelAvance', () => {
  it('un día (desde = hasta): usa formatearDiaDelAvance, «17»', () => {
    expect(formatearTramoDelAvance(f(1640, 4, 17), f(1640, 4, 17), f(1640, 4, 13), f(1640, 4, 19))).toBe('17')
  })

  it('mismo mes y año en las cuatro fechas: «15 al 17»', () => {
    expect(formatearTramoDelAvance(f(1640, 4, 15), f(1640, 4, 17), f(1640, 4, 13), f(1640, 4, 19))).toBe('15 al 17')
  })

  it('mismo año y mes del tramo, pero el avance cae en varios meses: «15 al 17 de abril»', () => {
    expect(formatearTramoDelAvance(f(1640, 4, 15), f(1640, 4, 17), f(1640, 4, 13), f(1640, 5, 1))).toBe(
      '15 al 17 de abril',
    )
  })

  it('mismo año, meses distintos del tramo: «28 de abril al 2 de mayo»', () => {
    expect(formatearTramoDelAvance(f(1640, 4, 28), f(1640, 5, 2), f(1640, 4, 13), f(1640, 5, 2))).toBe(
      '28 de abril al 2 de mayo',
    )
  })

  it('un tramo que empezó el mes anterior a un avance de un solo mes: «25 de abril al 3 de mayo»', () => {
    expect(formatearTramoDelAvance(f(1640, 4, 25), f(1640, 5, 3), f(1640, 5, 1), f(1640, 5, 31))).toBe(
      '25 de abril al 3 de mayo',
    )
  })

  it('el avance cruza de año: «8 al 21 de abril de 1640» y «28 de diciembre de 1640 al 2 de enero de 1641»', () => {
    expect(formatearTramoDelAvance(f(1640, 4, 8), f(1640, 4, 21), f(1640, 4, 20), f(1641, 4, 20))).toBe(
      '8 al 21 de abril de 1640',
    )
    expect(formatearTramoDelAvance(f(1640, 12, 28), f(1641, 1, 2), f(1640, 4, 20), f(1641, 4, 20))).toBe(
      '28 de diciembre de 1640 al 2 de enero de 1641',
    )
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/calendario/formatoFecha.test.ts
```

Fallo esperado: `formatearTramoDelAvance` no existe todavía en `./formatoFecha`, así que las seis pruebas del bloque nuevo fallan con `TypeError` al llamarla; las 29 pruebas que ya había siguen en verde. La hora, la duración y el corte de las líneas citadas varían:

```text
 ❯ src/dominio/calendario/formatoFecha.test.ts (35 tests | 6 failed) 13ms
   ❯ formatearTramoDelAvance (6)
     × un día (desde = hasta): usa formatearDiaDelAvance, «17» 5ms
     × mismo mes y año en las cuatro fechas: «15 al 17» 1ms
     × mismo año y mes del tramo, pero el avance cae en varios meses: «15 al 17 de abril» 1ms
     × mismo año, meses distintos del tramo: «28 de abril al 2 de mayo» 1ms
     × un tramo que empezó el mes anterior a un avance de un solo mes: «25 de abril al 3 de mayo» 0ms
     × el avance cruza de año: «8 al 21 de abril de 1640» y «28 de diciembre de 1640 al 2 de enero de 1641» 0ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/calendario/formatoFecha.test.ts > formatearTramoDelAvance > un día (desde = hasta): usa formatearDiaDelAvance, «17»
TypeError: formatearTramoDelAvance is not a function
 ❯ src/dominio/calendario/formatoFecha.test.ts:176:12

 Test Files  1 failed (1)
      Tests  6 failed | 29 passed (35)
   Start at  20:03:05
   Duration  422ms (transform 60%, import 24%, tests 10%, worker 6%)
```

- [ ] **Paso 3: Exportar `enumerar` y escribir `formatearTramoDelAvance`**

En `src/dominio/calendario/formatoFecha.ts`, cambia la primera línea del archivo para importar también `compararFechas`:

```ts
import { compararFechas, diaDeLaSemana, type Fecha } from './fecha'
```

Cambia la función `enumerar`, que ya existe, de privada a exportada (solo añade `export`; el cuerpo no cambia):

```ts
/** «a», «a y b», «a, b y c»: una lista escrita como se lee. */
export function enumerar(partes: readonly string[]): string {
  if (partes.length === 0) {
    return ''
  }
  if (partes.length === 1) {
    return partes[0]
  }
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}
```

Añade `formatearTramoDelAvance` al final del archivo, después de `formatearDiaDelAvance`:

```ts
/**
 * Los días de un tramo en un hecho del avance (D-052): si desde = hasta, formatearDiaDelAvance(desde, …). Si el
 * avance y el tramo caen en el mismo mes y año: «15 al 17». Si caen en el mismo año: «15 al 17 de abril» (mismo
 * mes) o «28 de abril al 2 de mayo». Si no: «8 al 21 de abril de 1640» (mismo mes y año del tramo), «28 de abril
 * al 2 de mayo de 1640» (mismo año del tramo) o «28 de diciembre de 1640 al 2 de enero de 1641».
 *
 * «Mismo mes y año» exige que coincidan las cuatro fechas; «mismo año», que coincidan los cuatro años.
 */
export function formatearTramoDelAvance(desde: Fecha, hasta: Fecha, primerDia: Fecha, ultimoDia: Fecha): string {
  if (compararFechas(desde, hasta) === 0) {
    return formatearDiaDelAvance(desde, primerDia, ultimoDia)
  }
  const mismoMesYAnio =
    desde.anio === hasta.anio &&
    desde.anio === primerDia.anio &&
    desde.anio === ultimoDia.anio &&
    desde.mes === hasta.mes &&
    desde.mes === primerDia.mes &&
    desde.mes === ultimoDia.mes
  if (mismoMesYAnio) {
    return `${desde.dia} al ${hasta.dia}`
  }
  const mismoAnio = desde.anio === hasta.anio && desde.anio === primerDia.anio && desde.anio === ultimoDia.anio
  if (mismoAnio) {
    return desde.mes === hasta.mes
      ? `${desde.dia} al ${hasta.dia} de ${NOMBRES_MES[desde.mes - 1]}`
      : `${formatearDiaMes(desde)} al ${formatearDiaMes(hasta)}`
  }
  if (desde.anio === hasta.anio) {
    return desde.mes === hasta.mes
      ? `${desde.dia} al ${hasta.dia} de ${NOMBRES_MES[desde.mes - 1]} de ${desde.anio}`
      : `${formatearDiaMes(desde)} al ${formatearDiaMes(hasta)} de ${desde.anio}`
  }
  return `${formatearFecha(desde)} al ${formatearFecha(hasta)}`
}
```

Nota sobre la última rama: cuando `desde.anio !== hasta.anio`, el tramo cruza de año él mismo (no solo el avance), así que el resultado siempre lleva el año de las dos fechas (por eso usa `formatearFecha`, que ya añade « de 1640»), sin volver a comprobar si coincide con `primerDia`/`ultimoDia`.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/calendario/formatoFecha.test.ts
```

Salida esperada:

```text
 Test Files  1 passed (1)
      Tests  35 passed (35)
```

- [ ] **Paso 5: Comprobar que nada más se quedó usando la `enumerar` privada de otra forma**

```bash
grep -rn "enumerar" src/dominio --include="*.ts" | grep -v ".test.ts"
```

Salida esperada: dos líneas, la definición y la llamada que ya le hacía `formatearMeses` (`motor/textos.ts` la importará en la tarea 7):

```text
src/dominio/calendario/formatoFecha.ts:export function enumerar(partes: readonly string[]): string {
src/dominio/calendario/formatoFecha.ts:  return enumerar(nombres)
```

- [ ] **Paso 6: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **908 pruebas en 81 archivos** (las 902 de la fase 3 más las 6 nuevas; el archivo no es nuevo, así que el recuento de archivos no cambia y no hay fila nueva en `pureza.test.ts`):

```text
 Test Files  81 passed (81)
      Tests  908 passed (908)
```

- [ ] **Paso 7: Comprobar el lint y la compilación**

```bash
npm run lint
npm run build
```

Salida esperada: `npm run lint` solo imprime su cabecera y termina sin errores; `npm run build` termina con `✓ built in …` sin avisos.

- [ ] **Paso 8: Commit**

```bash
git add src/dominio/calendario/formatoFecha.ts src/dominio/calendario/formatoFecha.test.ts
git commit -m "feat(calendario): enumerar exportada y formatearTramoDelAvance para los hechos del almacén" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit y el recuento de líneas varían). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/calendario/formatoFecha.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/calendario/formatoFecha.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-4 789b59b] feat(calendario): enumerar exportada y formatearTramoDelAvance para los hechos del almacén
 2 files changed, 40 insertions(+), 2 deletions(-)
```

---

### Tarea 3 · Cantidades del almacén (18)

Todo lo que la fase 4 dice sobre cantidades de recursos —cómo se escriben («93 sacos», «menos de 1 carretada»), cuánto cabe todavía en una fila, cuántos sacos hacen falta para alimentar a N personas y qué pasa cuando un evento sube o baja una cantidad en %— vive en un módulo nuevo y puro, `almacen/cantidades.ts`, sin ninguna dependencia del motor ni de `modelo/almacen` más allá de dos tipos. Esta tarea también traslada `claveExistencia`, que `validacion/referencias.ts` tenía copiada y privada desde la fase 2, a este módulo nuevo (TC16): a partir de ahora es la única versión y el resto de la fase 4 (el contexto del motor, la previsión, la edición) la importa de aquí.

`conEfectoCantidad` es la hermana de `conEfecto` (dinero, en mh con `BigInt`) pero para cantidades de recursos, que siguen en coma flotante: no se puede reutilizar `conEfecto` porque redondea al entero de hierro (TC6).

**Reglas de la especificación que implementa:**

- **Formato de las cantidades** (esp §3 l.125; D-063). Las cantidades se muestran a la unidad, con las mitades hacia arriba, y «menos de 1» cuando no llegan a la unidad pero no son cero: «93 sacos», «1 saco», «1.148 sacos», «0 sacos», «menos de 1 carretada».
- **Coma flotante con tolerancia** (`decisiones-fase-4.md`, TC1). «`TOLERANCIA = 1e-6` en `almacen/cantidades.ts`: por debajo de ella una falta, una pérdida o un resto cuentan 0». `esCero` es la comprobación que usará el resto del motor.
- **Capacidad y «Caben N más»** (contrato de la fase 4, §3.2, y D-067). `cabenMas` da lo que cabe todavía, hacia abajo y sin bajar de 0; `null` cuando la fila no tiene capacidad (sin límite). `textoCaben` escribe el mensaje de los formularios: «Caben 890 sacos más», «Cabe 1 saco más» (singular con 1) y «El almacén está lleno» cuando no cabe nada.
- **Concordancia en singular** (`decisiones-fase-4.md`, D-051). «Con 1 unidad, el verbo va en singular («faltó 1 saco», «Se perderá 1 fardo»)». `esUnaUnidad` es la comprobación que usarán los textos de avisos de la tarea 7 sobre una cantidad ya escrita con `formatearCantidad`.
- **Víveres por personas** (esp §7 l.1095; contrato de la fase 4, §3.2). «100 personas × 1 mes = 100 sacos». `sacosPorPersonas` redondea hacia arriba con aritmética entera (`Math.floor((personas × dias + diasPorSaco − 1) ÷ diasPorSaco)`), para no arrastrar los restos de la coma flotante que darían, por ejemplo, 99,9999999998 en vez de 100.
- **Efecto de un evento sobre una cantidad** (esp §7 l.1139; `decisiones-fase-4.md`, TC6). `conEfectoCantidad(base, pct) = base × máx(0, 1 + pct ÷ 100)`, nunca negativo aunque la suma de eventos baje de −100 %.
- **`claveExistencia` se muda al almacén** (`decisiones-fase-4.md`, TC16). «`claveExistencia` se mueve a `almacen/cantidades.ts` y `validacion/referencias.ts` la importa» — sin cambiar su forma (`${dominioId}|${recursoId}`), que ya usaban las pruebas de coherencia de la fase 2.

**Archivos:**
- Crear: `src/dominio/almacen/cantidades.ts`
- Modificar: `src/dominio/validacion/referencias.ts` (solo el import: borra su `claveExistencia` privada)
- Prueba: `src/dominio/almacen/cantidades.test.ts`

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/almacen/cantidades.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import {
  cabenMas,
  cantidadDeRecurso,
  claveExistencia,
  conEfectoCantidad,
  esCero,
  esUnaUnidad,
  formatearCantidad,
  sacosPorPersonas,
  textoCaben,
  TOLERANCIA,
} from './cantidades'

const SACOS = { unidadSingular: 'saco', unidadPlural: 'sacos' }
const CARRETADAS = { unidadSingular: 'carretada', unidadPlural: 'carretadas' }

describe('TOLERANCIA', () => {
  it('es 1e-6', () => {
    expect(TOLERANCIA).toBe(1e-6)
  })
})

describe('esCero', () => {
  it('dice que sí por debajo de la tolerancia y que no por encima', () => {
    expect(esCero(0)).toBe(true)
    expect(esCero(5e-7)).toBe(true)
    expect(esCero(-5e-7)).toBe(true)
    expect(esCero(2e-6)).toBe(false)
    expect(esCero(0.444)).toBe(false)
  })
})

describe('claveExistencia', () => {
  it('junta dominioId y recursoId con una barra vertical', () => {
    expect(claveExistencia('dominio.bree', 'recurso.viveres')).toBe('dominio.bree|recurso.viveres')
  })
})

describe('conEfectoCantidad', () => {
  it('aplica el % sobre la base, sin bajar de 0', () => {
    expect(conEfectoCantidad(90, -20)).toBeCloseTo(72, 6)
    expect(conEfectoCantidad(90, -150)).toBe(0)
  })
})

describe('formatearCantidad', () => {
  it('en plural, con el punto de los miles: «93 sacos» y «1.149 sacos»', () => {
    expect(formatearCantidad(92.667, SACOS)).toBe('93 sacos')
    expect(formatearCantidad(1148.67, SACOS)).toBe('1.149 sacos')
  })

  it('en singular con exactamente 1: «1 saco»', () => {
    expect(formatearCantidad(1, SACOS)).toBe('1 saco')
  })

  it('«menos de 1 …» cuando no es 0 pero redondea a 0', () => {
    expect(formatearCantidad(0.444, CARRETADAS)).toBe('menos de 1 carretada')
  })

  it('«0 sacos», en plural, cuando la cantidad es 0', () => {
    expect(formatearCantidad(0, SACOS)).toBe('0 sacos')
  })

  it('redondea las mitades hacia arriba: 2,5 → «3 sacos»', () => {
    expect(formatearCantidad(2.5, SACOS)).toBe('3 sacos')
  })
})

describe('cantidadDeRecurso', () => {
  it('formatearCantidad + « de » + el nombre en minúscula inicial', () => {
    expect(cantidadDeRecurso(20, { nombre: 'Cal', unidadSingular: 'carretada', unidadPlural: 'carretadas' })).toBe(
      '20 carretadas de cal',
    )
    expect(cantidadDeRecurso(12, { nombre: 'Víveres', unidadSingular: 'saco', unidadPlural: 'sacos' })).toBe(
      '12 sacos de víveres',
    )
  })
})

describe('esUnaUnidad', () => {
  it('reconoce «1 …» y «menos de 1 …», y descarta el resto', () => {
    expect(esUnaUnidad('1 saco')).toBe(true)
    expect(esUnaUnidad('menos de 1 saco')).toBe(true)
    expect(esUnaUnidad('2 sacos')).toBe(false)
    expect(esUnaUnidad('11 sacos')).toBe(false)
    expect(esUnaUnidad('1.149 sacos')).toBe(false)
  })
})

describe('cabenMas', () => {
  it('con capacidad: lo que queda hacia abajo', () => {
    expect(cabenMas({ cantidad: 51.333, capacidad: 1200 })).toBe(1148)
  })

  it('sin capacidad: null', () => {
    expect(cabenMas({ cantidad: 51.333, capacidad: undefined })).toBeNull()
  })
})

describe('textoCaben', () => {
  it('«Caben 890 sacos más» en plural', () => {
    expect(textoCaben(890, SACOS)).toBe('Caben 890 sacos más')
  })

  it('«Cabe 1 saco más» en singular', () => {
    expect(textoCaben(1, SACOS)).toBe('Cabe 1 saco más')
  })

  it('«El almacén está lleno» con 0', () => {
    expect(textoCaben(0, SACOS)).toBe('El almacén está lleno')
  })
})

describe('sacosPorPersonas', () => {
  it('redondea hacia arriba sin arrastrar decimales de la coma flotante', () => {
    expect(sacosPorPersonas(100, 1, 'meses', 30)).toBe(100)
    expect(sacosPorPersonas(7, 1, 'semanas', 30)).toBe(2)
    expect(sacosPorPersonas(1, 1, 'dias', 30)).toBe(1)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/almacen/cantidades.test.ts
```

Fallo esperado: `./cantidades` no existe todavía. La hora y la duración varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/almacen/cantidades.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/almacen/cantidades.test.ts [ src/dominio/almacen/cantidades.test.ts ]
Error: Cannot find module './cantidades' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/almacen/cantidades.test.ts
 ❯ src/dominio/almacen/cantidades.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import {
       | ^
      3|   cabenMas,
      4|   cantidadDeRecurso,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  20:03:25
   Duration  361ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `cantidades.ts`**

Crea `src/dominio/almacen/cantidades.ts` con este contenido:

```ts
import { formatearNumero } from '../dinero/formato'
import { redondearMitadArriba } from '../dinero/importe'
import type { Existencia, PeriodoViveres } from '../modelo/almacen'
import type { Id } from '../modelo/comunes'

/** Por debajo, una falta, una pérdida o un resto cuentan 0 (TC1). */
export const TOLERANCIA = 1e-6

/** Cómo se escribe la unidad de un recurso (RecursoEnCopia la tiene). */
export interface UnidadesDeRecurso {
  unidadSingular: string
  unidadPlural: string
}

/** Lo que hace falta para «20 carretadas de cal». */
export interface RecursoConNombre extends UnidadesDeRecurso {
  nombre: string
}

/**
 * El nombre con minúscula inicial, para meterlo dentro de una frase. Es una copia diminuta de la que expone
 * motor/textos.ts (minusculaInicial): este módulo no puede importar de motor/*, así que se repite aquí.
 */
function conMinusculaInicial(texto: string): string {
  return texto.length === 0 ? texto : texto[0].toLowerCase() + texto.slice(1)
}

/** |cantidad| < TOLERANCIA. */
export function esCero(cantidad: number): boolean {
  return Math.abs(cantidad) < TOLERANCIA
}

/** `${dominioId}|${recursoId}`: la clave de una fila del almacén (sale de validacion/referencias.ts, TC16). */
export function claveExistencia(dominioId: Id, recursoId: Id): string {
  return `${dominioId}|${recursoId}`
}

/** base × máx(0, 1 + pct ÷ 100), en coma flotante (TC6; §7 l.1139). */
export function conEfectoCantidad(base: number, pct: number): number {
  return base * Math.max(0, 1 + pct / 100)
}

/**
 * «93 sacos», «1 saco», «1.148 sacos», «0 sacos» y «menos de 1 carretada» (§3 l.125; D-063). Redondea con
 * redondearMitadArriba(cantidad + TOLERANCIA); una cantidad que no es 0 (esCero) y redondea a 0 es «menos de 1».
 */
export function formatearCantidad(cantidad: number, unidades: UnidadesDeRecurso): string {
  const redondeada = redondearMitadArriba(cantidad + TOLERANCIA)
  if (redondeada === 0) {
    return esCero(cantidad) ? `0 ${unidades.unidadPlural}` : `menos de 1 ${unidades.unidadSingular}`
  }
  const unidad = redondeada === 1 ? unidades.unidadSingular : unidades.unidadPlural
  return `${formatearNumero(redondeada, 0)} ${unidad}`
}

/** «20 carretadas de cal», «12 sacos de víveres»: formatearCantidad + « de » + el nombre con minúscula inicial. */
export function cantidadDeRecurso(cantidad: number, recurso: RecursoConNombre): string {
  return `${formatearCantidad(cantidad, recurso)} de ${conMinusculaInicial(recurso.nombre)}`
}

/** Si una cantidad ya escrita va con el verbo en singular: «1 saco» y «menos de 1 saco» sí (D-051). */
export function esUnaUnidad(textoDeCantidad: string): boolean {
  return /^1 /.test(textoDeCantidad) || textoDeCantidad.startsWith('menos de 1 ')
}

/** Lo que cabe todavía, hacia abajo: máx(0, ⌊capacidad − cantidad + TOLERANCIA⌋); null sin capacidad (D-063). */
export function cabenMas(existencia: Pick<Existencia, 'cantidad' | 'capacidad'>): number | null {
  if (existencia.capacidad === undefined) {
    return null
  }
  return Math.max(0, Math.floor(existencia.capacidad - existencia.cantidad + TOLERANCIA))
}

/** «Caben 890 sacos más», «Cabe 1 saco más» y, con 0, «El almacén está lleno» (D-067). */
export function textoCaben(caben: number, unidades: UnidadesDeRecurso): string {
  if (caben === 0) {
    return 'El almacén está lleno'
  }
  const cantidad = formatearCantidad(caben, unidades)
  return `${esUnaUnidad(cantidad) ? 'Cabe' : 'Caben'} ${cantidad} más`
}

/** Días de «Durante» (§7 l.1095): días 1, semanas 7, meses 30, años 365. */
export const DIAS_DEL_PERIODO: Readonly<Record<PeriodoViveres, number>> = {
  dias: 1,
  semanas: 7,
  meses: 30,
  anios: 365,
}

/** ⌈personas × durante × días del periodo ÷ díasPorSaco⌉ en enteros: 100 personas × 1 mes = 100 sacos (§7 l.1095). */
export function sacosPorPersonas(personas: number, durante: number, periodo: PeriodoViveres, diasPorSaco: number): number {
  const dias = durante * DIAS_DEL_PERIODO[periodo]
  return Math.floor((personas * dias + diasPorSaco - 1) / diasPorSaco)
}
```

- [ ] **Paso 4: Cambiar `validacion/referencias.ts` para importar `claveExistencia`**

En `src/dominio/validacion/referencias.ts`, añade el import al principio del archivo:

```ts
import { claveExistencia } from '../almacen/cantidades'
```

Y borra la función privada que hacía lo mismo (busca este bloque, un poco más abajo, y quítalo entero):

```ts
/** Clave de una fila de almacén: un recurso por asentamiento. */
function claveExistencia(dominioId: Id, recursoId: Id): string {
  return `${dominioId}|${recursoId}`
}
```

El resto del archivo no cambia: todo lo que ya llamaba a `claveExistencia` sigue llamando exactamente igual, ahora a la versión importada.

- [ ] **Paso 5: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/almacen/cantidades.test.ts
```

Salida esperada:

```text
 Test Files  1 passed (1)
      Tests  17 passed (17)
```

- [ ] **Paso 6: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada (comprueba en particular que `validacion/referencias.ts` sigue compilando con el import nuevo) y `npm test` termina con **926 pruebas en 82 archivos**: las 908 que dejó la tarea 2, las 17 de `cantidades.test.ts` y **una más** en `pureza.test.ts` (`it.each` sobre los módulos del dominio, que ahora recorre también `almacen/cantidades.ts`, un módulo nuevo). El contrato de la fase estimaba 925: la diferencia de 1 es esa fila extra de `pureza.test.ts`, que la propia fase avisa que puede variar (§9 del contrato, aviso 2).

```text
 Test Files  82 passed (82)
      Tests  926 passed (926)
```

- [ ] **Paso 7: Comprobar el lint y la compilación**

```bash
npm run lint
npm run build
```

Salida esperada: las dos terminan sin errores.

- [ ] **Paso 8: Commit**

```bash
git add src/dominio/almacen/cantidades.ts src/dominio/almacen/cantidades.test.ts src/dominio/validacion/referencias.ts
git commit -m "feat(almacen): cantidades del almacén (formatos, capacidad y sacos por personas)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
warning: in the working copy of 'src/dominio/almacen/cantidades.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/almacen/cantidades.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-4 6e3b2d1] feat(almacen): cantidades del almacén (formatos, capacidad y sacos por personas)
 3 files changed, 217 insertions(+), 5 deletions(-)
 create mode 100644 src/dominio/almacen/cantidades.test.ts
 create mode 100644 src/dominio/almacen/cantidades.ts
```

---

### Tarea 4 · Eventos de producción y consumo (5 nuevas + reescritas)

La fase 3 solo miraba los eventos con efectos de dinero (`eventosDeDineroEl`, paso 1) porque todavía no había producción ni consumo que un evento pudiera cambiar. La fase 4 sí los tiene, así que el paso 1 pasa a coger **todos** los eventos de asentamiento activos con algún efecto, de cualquier ámbito, y cada paso del motor filtra el suyo con la función `pctDe…` que le toca: `pctDeCostes` y `pctDeIngresos` (dinero, fase 3, sin cambios) y las dos nuevas de esta tarea, `pctDeProduccion` y `pctDeConsumo`.

`eventosConEfectosEl` sustituye a `eventosDeDineroEl`, que se borra: no queda ninguna llamada suya en todo `src/`. `Dia.eventos` (el campo que rellena el paso 1) cambia de nombre en el JSDoc pero no de tipo, así que **cuatro pruebas de otros pasos que ya existían** (`caravanas.test.ts`, `cobros.test.ts`, `locales.test.ts`, `pagos.test.ts`), que construían un `Dia` a mano llamando a `eventosDeDineroEl` para rellenar `eventos`, tienen que llamar ahora a `eventosConEfectosEl`: sin este cambio no compilan, porque el símbolo ya no existe.

**Reglas de la especificación que implementa:**

- **Eventos de cualquier ámbito, no solo de dinero** (`decisiones-fase-4.md`, TC5). «`eventosConEfectosEl` sustituye a `eventosDeDineroEl`: `Dia.eventos` lleva todos los eventos de asentamiento activos con algún efecto, y cada paso aplica su `pctDe…`, que ya filtra por ámbito». Un evento de partida sigue sin contar aunque una copia lo trajera con efectos (esp, «un evento de partida no tiene efectos económicos»; ahora, ninguno de ningún ámbito).
- **% de producción de un edificio** (esp §7 l.1116; contrato de la fase 4, §3.3). «Suma de los % de producción de ese asentamiento: los de «todos» y los de ese edificio» — el mismo patrón que ya tienen `pctDeCostes` y `pctDeIngresos` de la fase 3, con `ambito: 'produccion'` y el objetivo `'todos' | edificioId`.
- **% de consumo de un recurso, víveres incluidos** (esp §7 l.1139; contrato de la fase 4, §3.3). «Suma de los % de consumo de ese asentamiento: los de «todos» y los de ese recurso, víveres incluidos» — con `ambito: 'consumo'` y el objetivo `'todos' | recursoId`; los víveres son un recurso más para este cálculo (el paso 5, tarea 10, se lo pasa igual que a cualquier otro).
- **El paso 1 no es «solo dinero»** (esp §9 l.1273; contrato de la fase 4, §3.3). `motor/bucle.ts`: `pasoEventos` pasa a `dia.eventos = eventosConEfectosEl(ctx.estado.eventos, dia.fecha)` y su comentario deja de decir «solo dinero».

**Archivos:**
- Modificar: `src/dominio/eventos/efectos.ts`, `src/dominio/motor/bucle.ts` (solo `pasoEventos` y su import), `src/dominio/motor/contexto.ts` (solo el JSDoc de `Dia.eventos`)
- Prueba: `src/dominio/eventos/efectos.test.ts`, `src/dominio/motor/bucle.test.ts` (se reescriben, tabla de la §7 del contrato); `src/dominio/motor/pasos/caravanas.test.ts`, `src/dominio/motor/pasos/cobros.test.ts`, `src/dominio/motor/pasos/locales.test.ts`, `src/dominio/motor/pasos/pagos.test.ts` (solo el nombre importado, para que compilen)

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

- [ ] **Paso 1: Escribir las pruebas que fallan**

Sustituye el bloque `import` del principio de `src/dominio/eventos/efectos.test.ts` por este (`eventosDeDineroEl` deja de existir; se añaden `eventosConEfectosEl`, `pctDeConsumo` y `pctDeProduccion`):

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM, EVENTO, IMPUESTO } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { EfectoEvento, EventoNarrativo } from '../modelo/eventos'
import {
  conEfecto,
  eventoActivoEl,
  eventosConEfectosEl,
  pctDeCostes,
  pctDeConsumo,
  pctDeIngresos,
  pctDeProduccion,
} from './efectos'
```

Sustituye el bloque `describe('eventosDeDineroEl', …)` (justo debajo de `describe('eventoActivoEl', …)`) por este, con dos pruebas reescritas, una prueba nueva y dos bloques `describe` nuevos al final:

```ts
describe('eventosConEfectosEl', () => {
  it('el 15 de abril cuenta la feria y las lluvias, de cualquier ámbito', () => {
    expect(eventosConEfectosEl(eventosDelEjemplo(), dia(15, 4)).map((e) => e.id)).toEqual([
      EVENTO.lluvias,
      EVENTO.feria,
    ])
  })

  it('el 12 de abril solo las lluvias, y el 22 de marzo los bandidos del peaje', () => {
    expect(eventosConEfectosEl(eventosDelEjemplo(), dia(12, 4)).map((e) => e.id)).toEqual([EVENTO.lluvias])
    expect(eventosConEfectosEl(eventosDelEjemplo(), dia(22, 3)).map((e) => e.id)).toEqual([EVENTO.bandidos])
  })

  it('el mensajero real, sin efectos, nunca cuenta aunque esté activo', () => {
    expect(eventosConEfectosEl(eventosDelEjemplo(), dia(1, 4)).map((e) => e.id)).not.toContain(EVENTO.mensajero)
  })

  it('un evento de partida no cuenta, aunque traiga efectos (EsquemaEventoNarrativo no lo deja guardar)', () => {
    const dePartida: EventoNarrativo = {
      id: 'ev.partida',
      nombre: 'Invierno largo',
      inicio: dia(1, 4),
      duracionDias: 30,
      efectos: [{ ambito: 'costes', objetivo: { tipo: 'todos' }, pct: 50 }],
    }
    expect(eventosConEfectosEl([dePartida], dia(15, 4))).toEqual([])
  })
})

describe('pctDeProduccion', () => {
  it('suma los % de «todos» y los de ese edificio (§7 l.1116)', () => {
    const activos = [
      evento('ev.a', DOM.bree, [{ ambito: 'produccion', objetivo: { tipo: 'todos' }, pct: -10 }]),
      evento('ev.b', DOM.bree, [
        { ambito: 'produccion', objetivo: { tipo: 'edificio', id: 'edificio.granjas' }, pct: -20 },
      ]),
    ]
    expect(pctDeProduccion(activos, DOM.bree, 'edificio.granjas')).toBe(-30)
    expect(pctDeProduccion(activos, DOM.bree, 'edificio.cantera')).toBe(-10)
  })

  it('no suma los efectos de otro asentamiento ni los de consumo', () => {
    const activos = [
      evento('ev.a', DOM.archet, [{ ambito: 'produccion', objetivo: { tipo: 'todos' }, pct: 50 }]),
      evento('ev.b', DOM.bree, [{ ambito: 'consumo', objetivo: { tipo: 'todos' }, pct: 50 }]),
    ]
    expect(pctDeProduccion(activos, DOM.bree, 'edificio.granjas')).toBe(0)
  })
})

describe('pctDeConsumo', () => {
  it('suma los % de «todos» y los de ese recurso, víveres incluidos (§7 l.1139)', () => {
    const activos = [
      evento('ev.a', DOM.bree, [{ ambito: 'consumo', objetivo: { tipo: 'todos' }, pct: -50 }]),
      evento('ev.b', DOM.bree, [{ ambito: 'consumo', objetivo: { tipo: 'recurso', id: 'recurso.viveres' }, pct: 10 }]),
    ]
    expect(pctDeConsumo(activos, DOM.bree, 'recurso.viveres')).toBe(-40)
    expect(pctDeConsumo(activos, DOM.bree, 'recurso.cerveza')).toBe(-50)
  })

  it('no suma los efectos de otro asentamiento ni los de producción', () => {
    const activos = [
      evento('ev.a', DOM.archet, [{ ambito: 'consumo', objetivo: { tipo: 'todos' }, pct: 50 }]),
      evento('ev.b', DOM.bree, [{ ambito: 'produccion', objetivo: { tipo: 'todos' }, pct: 50 }]),
    ]
    expect(pctDeConsumo(activos, DOM.bree, 'recurso.viveres')).toBe(0)
  })
})
```

Los bloques `describe('pctDeIngresos', …)`, `describe('pctDeCostes', …)` y `describe('conEfecto', …)` que ya había, con la función `evento(…)` y el resto del archivo, se quedan exactamente igual.

En `src/dominio/motor/bucle.test.ts`, dentro de `describe('PASOS_DEL_DIA y pasoEventos', …)`, sustituye la segunda prueba (la que llama a `pasoEventos`) por esta:

```ts
it('pone en el día los eventos activos con algún efecto, de cualquier ámbito', () => {
  const estado = estadoDe(documentoDeEjemplo())
  const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 19 }, opciones())
  const diaDe = (fecha: Fecha): Dia => ({ fecha, numero: aNumeroDeDia(fecha), primero: false, eventos: [] })

  const dia15 = diaDe({ anio: 1640, mes: 4, dia: 15 })
  pasoEventos(ctx, dia15)
  expect(dia15.eventos.map((e) => e.id)).toEqual([EVENTO.lluvias, EVENTO.feria])

  const dia22 = diaDe({ anio: 1640, mes: 4, dia: 22 })
  pasoEventos(ctx, dia22)
  expect(dia22.eventos).toEqual([])
})
```

(Antes probaba el día 15, con solo la feria, y el día 18, sin ninguno; ahora prueba el 15, con las lluvias y la feria juntas, y el 22, sin ninguno — el 22 de abril ya no tiene ni lluvias ni feria activas, así que sigue dando `[]`.)

- [ ] **Paso 2: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/eventos/efectos.test.ts src/dominio/motor/bucle.test.ts
```

Fallo esperado: `efectos.test.ts` no encuentra `eventosConEfectosEl` ni `pctDeProduccion` ni `pctDeConsumo` en `./efectos` (siguen sin existir), así que sus ocho pruebas fallan con `TypeError`; `bucle.test.ts` sí compila (llama a `pasoEventos`, que ya existe), pero la prueba reescrita falla porque el paso 1 todavía usa `eventosDeDineroEl` y no incluye las lluvias. La hora, la duración y el corte de las líneas citadas varían:

```text
 ❯ src/dominio/eventos/efectos.test.ts (15 tests | 8 failed) 11ms
   ❯ eventosConEfectosEl (4)
     × el 15 de abril cuenta la feria y las lluvias, de cualquier ámbito 3ms
     × el 12 de abril solo las lluvias, y el 22 de marzo los bandidos del peaje 1ms
     × el mensajero real, sin efectos, nunca cuenta aunque esté activo 1ms
     × un evento de partida no cuenta, aunque traiga efectos (EsquemaEventoNarrativo no lo deja guardar) 0ms
   ❯ pctDeProduccion (2)
     × suma los % de «todos» y los de ese edificio (§7 l.1116) 0ms
     × no suma los efectos de otro asentamiento ni los de consumo 0ms
   ❯ pctDeConsumo (2)
     × suma los % de «todos» y los de ese recurso, víveres incluidos (§7 l.1139) 0ms
     × no suma los efectos de otro asentamiento ni los de producción 0ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/eventos/efectos.test.ts > eventosConEfectosEl > el 15 de abril cuenta la feria y las lluvias, de cualquier ámbito
TypeError: eventosConEfectosEl is not a function
 ❯ src/dominio/eventos/efectos.test.ts:43:12

 Test Files  1 failed (1)
      Tests  8 failed | 7 passed (15)
```

```text
 ❯ src/dominio/motor/bucle.test.ts (7 tests | 1 failed) 24ms
   ❯ PASOS_DEL_DIA y pasoEventos (2)
     × pone en el día los eventos activos con algún efecto, de cualquier ámbito 6ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/bucle.test.ts > PASOS_DEL_DIA y pasoEventos > pone en el día los eventos activos con algún efecto, de cualquier ámbito
AssertionError: expected [ 'ev.feria-de-primavera' ] to deeply equal [ 'ev.lluvias-de-primavera', …(1) ]

- Expected
+ Received

  [
-   "ev.lluvias-de-primavera",
    "ev.feria-de-primavera",
  ]

 ❯ src/dominio/motor/bucle.test.ts:54:44

 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

- [ ] **Paso 3: Sustituir `eventosDeDineroEl` por `eventosConEfectosEl`, y añadir `pctDeProduccion` y `pctDeConsumo`**

En `src/dominio/eventos/efectos.ts`, sustituye la función `eventosDeDineroEl` entera por estas tres (la nueva `eventosConEfectosEl` y las dos funciones `pctDe…` nuevas), justo después de `eventoActivoEl` y antes de `pctDeCostes`, que no cambia:

```ts
/**
 * Los eventos de asentamiento activos ese día con algún efecto, de cualquier ámbito (§9 l.1273; TC5). Sustituye a
 * eventosDeDineroEl, que se borra. Un evento de partida no cuenta aunque una copia lo trajera con efectos.
 */
export function eventosConEfectosEl(eventos: readonly EventoNarrativo[], dia: Fecha): EventoNarrativo[] {
  return eventos.filter((e) => e.dominioId !== undefined && e.efectos.length > 0 && eventoActivoEl(e, dia))
}

/** Suma de los % de producción de ese asentamiento: los de «todos» y los de ese edificio (§7 l.1116). */
export function pctDeProduccion(activos: readonly EventoNarrativo[], dominioId: Id, edificioId: Id): number {
  let pct = 0
  for (const evento of activos) {
    if (evento.dominioId !== dominioId) {
      continue
    }
    for (const efecto of evento.efectos) {
      if (efecto.ambito === 'produccion' && (efecto.objetivo.tipo === 'todos' || efecto.objetivo.id === edificioId)) {
        pct += efecto.pct
      }
    }
  }
  return pct
}

/** Suma de los % de consumo de ese asentamiento: los de «todos» y los de ese recurso, víveres incluidos (§7 l.1139). */
export function pctDeConsumo(activos: readonly EventoNarrativo[], dominioId: Id, recursoId: Id): number {
  let pct = 0
  for (const evento of activos) {
    if (evento.dominioId !== dominioId) {
      continue
    }
    for (const efecto of evento.efectos) {
      if (efecto.ambito === 'consumo' && (efecto.objetivo.tipo === 'todos' || efecto.objetivo.id === recursoId)) {
        pct += efecto.pct
      }
    }
  }
  return pct
}
```

El resto del archivo (`eventoActivoEl` al principio; `pctDeCostes`, `pctDeIngresos` y `conEfecto` al final) no cambia.

- [ ] **Paso 4: Cambiar el paso 1 del motor**

En `src/dominio/motor/bucle.ts`, cambia el import:

```ts
import { eventosConEfectosEl } from '../eventos/efectos'
```

Y `pasoEventos`:

```ts
/** Paso 1: los eventos de asentamiento activos ese día con algún efecto, de cualquier ámbito (§9 l.1273). */
export function pasoEventos(ctx: Contexto, dia: Dia): void {
  dia.eventos = eventosConEfectosEl(ctx.estado.eventos, dia.fecha)
}
```

En `src/dominio/motor/contexto.ts`, dentro de la interfaz `Dia`, cambia solo el comentario del campo `eventos` (el tipo no cambia):

```ts
  /** Los eventos de asentamiento activos ese día con algún efecto; lo rellena el paso 1. */
  eventos: EventoNarrativo[]
```

- [ ] **Paso 5: Arreglar las cuatro pruebas de otros pasos que llamaban a `eventosDeDineroEl`**

`eventosDeDineroEl` ya no existe, así que estas cuatro pruebas no compilan hasta este paso. En cada uno de estos cuatro archivos, cambia el import y la única llamada (mismo patrón en los cuatro):

`src/dominio/motor/pasos/caravanas.test.ts`:

```ts
import { eventosConEfectosEl } from '../../eventos/efectos'
```

```ts
function diaDe(ctx: Contexto, f: Fecha): Dia {
  return {
    fecha: f,
    numero: aNumeroDeDia(f),
    primero: compararFechas(f, ctx.primerDia) === 0,
    eventos: eventosConEfectosEl(ctx.estado.eventos, f),
  }
}
```

`src/dominio/motor/pasos/cobros.test.ts`, `src/dominio/motor/pasos/locales.test.ts` y `src/dominio/motor/pasos/pagos.test.ts`: el mismo cambio, letra por letra (el import y la misma función `diaDe` con la misma forma, ya presente en los cuatro archivos desde la fase 3).

- [ ] **Paso 6: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/eventos/efectos.test.ts src/dominio/motor/bucle.test.ts src/dominio/motor/pasos/caravanas.test.ts src/dominio/motor/pasos/cobros.test.ts src/dominio/motor/pasos/locales.test.ts src/dominio/motor/pasos/pagos.test.ts
```

Salida esperada (seis archivos, todos en verde; el recuento total de pruebas de estos seis archivos varía con lo que ya tuvieran los cuatro que no cambian de comportamiento — no hace falta memorizarlo, solo que no haya fallos):

```text
 Test Files  6 passed (6)
```

- [ ] **Paso 7: Comprobar que `eventosDeDineroEl` no queda en ningún sitio**

```bash
grep -rn "eventosDeDineroEl" src/
```

Salida esperada: una sola línea, dentro del comentario de `eventosConEfectosEl` que explica a qué sustituye (no es una llamada, así que no rompe nada; si aparece en cualquier otro sitio, ese archivo no se ha actualizado):

```text
src/dominio/eventos/efectos.ts: * eventosDeDineroEl, que se borra. Un evento de partida no cuenta aunque una copia lo trajera con efectos.
```

- [ ] **Paso 8: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **931 pruebas en 82 archivos**: las 926 que dejó la tarea 3 más 5 (las cuatro pruebas nuevas de `pctDeProduccion` y `pctDeConsumo`, y una prueba nueva de `eventosConEfectosEl` sobre el mensajero — ninguno de los archivos que cambia esta tarea es nuevo, así que el recuento de archivos no se mueve). El contrato estimaba 4 pruebas nuevas (929 en total); la diferencia de 1 es la prueba del mensajero, que no estaba en la estimación (§9 del contrato, aviso 2).

```text
 Test Files  82 passed (82)
      Tests  931 passed (931)
```

- [ ] **Paso 9: Comprobar el lint y la compilación**

```bash
npm run lint
npm run build
```

Salida esperada: las dos terminan sin errores.

- [ ] **Paso 10: Commit**

```bash
git add src/dominio/eventos/efectos.ts src/dominio/eventos/efectos.test.ts src/dominio/motor/bucle.ts src/dominio/motor/bucle.test.ts src/dominio/motor/contexto.ts src/dominio/motor/pasos/caravanas.test.ts src/dominio/motor/pasos/cobros.test.ts src/dominio/motor/pasos/locales.test.ts src/dominio/motor/pasos/pagos.test.ts
git commit -m "feat(motor): eventosConEfectosEl sustituye a eventosDeDineroEl, y pctDeProduccion y pctDeConsumo" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-4 e31885b] feat(motor): eventosConEfectosEl sustituye a eventosDeDineroEl, y pctDeProduccion y pctDeConsumo
 9 files changed, 116 insertions(+), 34 deletions(-)
```

---

### Tarea 5 · Producción: factor, periodo y cantidad (19)

Esta tarea escribe el cálculo entero de cuánto produce un edificio un día cualquiera, sin tocar todavía el motor ni el almacén: `almacen/produccion.ts` es un módulo puro que, dado un edificio, sus trabajadores asignados y los eventos activos, da el factor del día; y, dada una `RecurrenciaProduccion`, da desde cuándo cuenta el acumulado, cuántos días tiene el periodo que se está cerrando y cuánto produce ese periodo. El paso 4 del motor (tarea 9) es quien llama a estas funciones día a día; aquí solo se prueban sueltas, con fechas y datos de prueba.

La pieza más delicada es `primerDiaQueCuenta`: el acumulado de una producción no debe empezar a contar antes de que la regla exista de verdad. Se calcula como «el día siguiente a la ocurrencia teórica anterior a la primera ocurrencia», y se comprueba con las cuatro cifras que da el contrato, más las dos que ya trae el ejemplo (la arcilla y la piedra de la cantera de Bree), que sirven de oráculo cruzado para `diasAcumulados`.

**Reglas de la especificación que implementa:**

- **Asignados por edificio** (esp §7 l.1115; contrato de la fase 4, §3.4). «Suma de `numero` de los trabajadores con ese edificioId»: la cantera del ejemplo tiene 2 canteros (`TRABAJADOR.canteros`, `numero: 2`) para 3 necesarios.
- **Factor diario** (esp §7 l.1113-1116; §9 l.1316; contrato de la fase 4, §3.4). «Factor diario = estado × trabajadores × eventos: 1 si activo y 0 si no; mín(1, asignados ÷ necesarios) o 1 si necesarios = 0; máx(0, 1 + pctEventos ÷ 100)». Un edificio dañado, inactivo o alquilado no produce nada ese día, tenga los trabajadores que tenga.
- **Desde cuándo cuenta el acumulado** (esp §7 l.1125-1127; contrato de la fase 4, §3.4). «El primer día que cuenta en el acumulado: el siguiente a la ocurrencia teórica anterior a la primera ocurrencia». La primera ocurrencia es `primera` en las cuatro frecuencias que la tienen (cadaNDias, quincenal, cadaNMeses, trimestral) o la primera ocurrencia desde `inicio` en las que no (diaria, semanal, mensual, anual); sin ninguna de las dos, no hay límite (`null`).
- **Días del periodo y cantidad de una ocurrencia** (esp §7 l.1119, l.1123; §9 l.1317; contrato de la fase 4, §3.4). «Días del periodo de una ocurrencia: diasEntre(anteriorOcurrencia(r, ocurrencia), ocurrencia)» y «base × sumaFactores ÷ diasDelPeriodo»: es la fórmula que da 8,333 carretadas en la mina de O5 (`decisiones-fase-4.md`, oráculo O5 del contrato) y 16,667 en la cantera de Bree con 2 de 3 trabajadores (O6).
- **Días acumulados** (contrato de la fase 4, §3.4; A7b, «11 días acumulados»). «máx(0, diasEntre(máx(desde, primerDiaQueCuenta), hoy) + 1)»: el 12 de abril del ejemplo, la arcilla de la cantera (acumulada desde el 2 de abril) lleva 11 días y la piedra (desde el 8 de abril) lleva 5 (contrato de la fase 4, oráculo O6).

**Archivos:**
- Crear: `src/dominio/almacen/produccion.ts`
- Prueba: `src/dominio/almacen/produccion.test.ts`

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/almacen/produccion.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { EDIFICIO } from '../ejemplo/ids'
import { EDIFICIOS } from '../ejemplo/asentamientosAlmacen'
import { TRABAJADORES } from '../ejemplo/asentamientosDinero'
import type { RecurrenciaProduccion } from '../modelo/comunes'
import {
  asignadosPorEdificio,
  cantidadDeOcurrencia,
  diasAcumulados,
  diasDelPeriodo,
  factorDiario,
  primerDiaQueCuenta,
} from './produccion'

/** Atajo para escribir fechas en las pruebas: f(1640, 4, 12) es el 12 de abril de 1640. */
function f(anio: number, mes: number, dia: number): Fecha {
  return { anio, mes, dia }
}

describe('asignadosPorEdificio', () => {
  it('suma numero de los trabajadores con ese edificioId: la cantera del ejemplo tiene 2 canteros', () => {
    const asignados = asignadosPorEdificio(TRABAJADORES)
    expect(asignados.get(EDIFICIO.cantera)).toBe(2)
    expect(asignados.get(EDIFICIO.granjas)).toBe(6)
  })

  it('un trabajador sin edificioId no cuenta en ningún edificio', () => {
    const asignados = asignadosPorEdificio(TRABAJADORES)
    // Los albañiles de Archet no tienen edificioId (obras, no un edificio).
    let total = 0
    for (const numero of asignados.values()) total += numero
    const sumaConEdificio = TRABAJADORES.filter((t) => t.edificioId !== undefined).reduce((s, t) => s + t.numero, 0)
    expect(total).toBe(sumaConEdificio)
  })
})

describe('factorDiario', () => {
  const cantera = EDIFICIOS.find((e) => e.id === EDIFICIO.cantera)!

  it('activo con necesarios > 0: mín(1, asignados / necesarios) — la cantera con 2 de 3 da 2/3', () => {
    expect(factorDiario(cantera, 2, 0)).toBeCloseTo(2 / 3, 6)
  })

  it('dañado, inactivo o alquilado dan 0, aunque haya asignados y eventos favorables', () => {
    expect(factorDiario({ estado: 'daniado', trabajadoresNecesarios: 3 }, 3, 50)).toBe(0)
    expect(factorDiario({ estado: 'inactivo', trabajadoresNecesarios: 3 }, 3, 50)).toBe(0)
    expect(factorDiario({ estado: 'alquilado', trabajadoresNecesarios: 3 }, 3, 50)).toBe(0)
  })

  it('sin necesarios (0), el factor de trabajadores vale 1 aunque no haya nadie asignado', () => {
    expect(factorDiario({ estado: 'activo', trabajadoresNecesarios: 0 }, 0, 0)).toBe(1)
  })

  it('más asignados que necesarios no pasa de 1 (mín(1, …))', () => {
    expect(factorDiario({ estado: 'activo', trabajadoresNecesarios: 2 }, 5, 0)).toBe(1)
  })

  it('los eventos aplican conEfectoCantidad: −20 % da 0,8 y −150 % da 0, nunca negativo', () => {
    expect(factorDiario({ estado: 'activo', trabajadoresNecesarios: 0 }, 0, -20)).toBeCloseTo(0.8, 6)
    expect(factorDiario({ estado: 'activo', trabajadoresNecesarios: 0 }, 0, -150)).toBe(0)
  })
})

describe('primerDiaQueCuenta', () => {
  it('semanal sin inicio: sin primera ocurrencia, null', () => {
    const r: RecurrenciaProduccion = { tipo: 'semanal', diaSemana: 5 }
    expect(primerDiaQueCuenta(r)).toBeNull()
  })

  it('«Cada 2 meses · día 15» con primera el 15 de junio: el día siguiente a la teórica de abril, 16 de abril', () => {
    const r: RecurrenciaProduccion = { tipo: 'cadaNMeses', n: 2, diaMes: 15, primera: f(1640, 6, 15) }
    expect(primerDiaQueCuenta(r)).toEqual(f(1640, 4, 16))
  })

  it('«Mensual · día 1» con inicio el 1 de julio: el día siguiente a la teórica de junio, 2 de junio', () => {
    const r: RecurrenciaProduccion = { tipo: 'mensual', diaMes: 1, inicio: f(1640, 7, 1) }
    expect(primerDiaQueCuenta(r)).toEqual(f(1640, 6, 2))
  })

  it('semanal del ejemplo (sábados) con inicio el 1 de abril: 1 de abril', () => {
    const r: RecurrenciaProduccion = { tipo: 'semanal', diaSemana: 5, inicio: f(1640, 4, 1) }
    expect(primerDiaQueCuenta(r)).toEqual(f(1640, 4, 1))
  })
})

describe('diasDelPeriodo', () => {
  it('mensual: el 1 de mayo cierra un periodo de 30 días (abril)', () => {
    const r: RecurrenciaProduccion = { tipo: 'mensual', diaMes: 1, inicio: f(1640, 4, 1) }
    expect(diasDelPeriodo(r, f(1640, 5, 1))).toBe(30)
  })

  it('semanal: un periodo dura siempre 7 días', () => {
    const r: RecurrenciaProduccion = { tipo: 'semanal', diaSemana: 5, inicio: f(1640, 4, 1) }
    expect(diasDelPeriodo(r, f(1640, 4, 7))).toBe(7)
  })
})

describe('cantidadDeOcurrencia', () => {
  it('la mina de O5: 10 × (15 × 2/3 + 15 × 1) ÷ 30 = 8,333', () => {
    expect(cantidadDeOcurrencia(10, 15 * (2 / 3) + 15 * 1, 30)).toBeCloseTo(8.333, 3)
  })

  it('la cantera con 2 de 3: 25 × (2/3 × 7) ÷ 7 = 16,667', () => {
    expect(cantidadDeOcurrencia(25, (2 / 3) * 7, 7)).toBeCloseTo(16.667, 3)
  })
})

describe('diasAcumulados', () => {
  const cantera = EDIFICIOS.find((e) => e.id === EDIFICIO.cantera)!
  const arcilla = cantera.producciones.find((p) => p.id === 'prod.cantera-arcilla')!
  const piedra = cantera.producciones.find((p) => p.id === 'prod.cantera-piedra')!

  it('el 12 de abril: la arcilla (desde el 2 de abril) lleva 11 días', () => {
    expect(diasAcumulados(arcilla, f(1640, 4, 12))).toBe(11)
  })

  it('el 12 de abril: la piedra (desde el 8 de abril) lleva 5 días', () => {
    expect(diasAcumulados(piedra, f(1640, 4, 12))).toBe(5)
  })

  it('un acumulado recién reiniciado para mañana lleva 0 días hoy', () => {
    const produccion = { recurrencia: piedra.recurrencia, acumulado: { desde: f(1640, 4, 13), sumaFactores: 0 } }
    expect(diasAcumulados(produccion, f(1640, 4, 12))).toBe(0)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/almacen/produccion.test.ts
```

Fallo esperado: `./produccion` no existe todavía. La hora y la duración varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/almacen/produccion.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/almacen/produccion.test.ts [ src/dominio/almacen/produccion.test.ts ]
Error: Cannot find module './produccion' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/almacen/produccion.test.ts
 ❯ src/dominio/almacen/produccion.test.ts:7:1
      5| import { TRABAJADORES } from '../ejemplo/asentamientosDinero'
      6| import type { RecurrenciaProduccion } from '../modelo/comunes'
      7| import {
       | ^
      8|   asignadosPorEdificio,
      9|   cantidadDeOcurrencia,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  20:00:52
   Duration  639ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `produccion.ts`**

Crea `src/dominio/almacen/produccion.ts` con este contenido:

```ts
import { compararFechas, diasEntre, sumarDias, type Fecha } from '../calendario/fecha'
import { anteriorOcurrencia, siguienteOcurrencia, type Recurrencia } from '../calendario/recurrencia'
import type { Id, RecurrenciaProduccion } from '../modelo/comunes'
import type { Edificio, ProduccionEdificio, Trabajador } from '../modelo/asentamiento'
import { conEfectoCantidad } from './cantidades'

/** Asignados por edificio: suma de `numero` de los trabajadores con ese edificioId (§7 l.1115). */
export function asignadosPorEdificio(trabajadores: readonly Trabajador[]): Map<Id, number> {
  const asignados = new Map<Id, number>()
  for (const trabajador of trabajadores) {
    if (trabajador.edificioId === undefined) {
      continue
    }
    asignados.set(trabajador.edificioId, (asignados.get(trabajador.edificioId) ?? 0) + trabajador.numero)
  }
  return asignados
}

/**
 * Factor diario = estado × trabajadores × eventos (§7 l.1113-1116; §9 l.1316): 1 si activo y 0 si no; mín(1,
 * asignados ÷ necesarios) o 1 si necesarios = 0; máx(0, 1 + pctEventos ÷ 100).
 */
export function factorDiario(
  edificio: Pick<Edificio, 'estado' | 'trabajadoresNecesarios'>,
  asignados: number,
  pctEventos: number,
): number {
  const factorEstado = edificio.estado === 'activo' ? 1 : 0
  const factorTrabajadores =
    edificio.trabajadoresNecesarios === 0 ? 1 : Math.min(1, asignados / edificio.trabajadoresNecesarios)
  const factorEventos = conEfectoCantidad(1, pctEventos)
  return factorEstado * factorTrabajadores * factorEventos
}

/** Las cuatro frecuencias de RecurrenciaProduccion que anclan sus ocurrencias con `primera`. */
function tienePrimera(r: RecurrenciaProduccion): r is Extract<RecurrenciaProduccion, { primera: Fecha }> {
  return r.tipo === 'cadaNDias' || r.tipo === 'quincenal' || r.tipo === 'cadaNMeses' || r.tipo === 'trimestral'
}

/**
 * El primer día que cuenta en el acumulado: el siguiente a la ocurrencia teórica anterior a la primera ocurrencia
 * (§7 l.1125-1127). La primera ocurrencia es `primera` (cadaNDias, quincenal, cadaNMeses, trimestral) o la primera
 * ocurrencia desde `inicio` (siguienteOcurrencia(r, víspera de inicio)); null si no tiene ninguna de las dos.
 */
export function primerDiaQueCuenta(r: RecurrenciaProduccion): Fecha | null {
  const primeraOcurrencia = tienePrimera(r)
    ? r.primera
    : r.inicio !== undefined
      ? siguienteOcurrencia(r as Recurrencia, sumarDias(r.inicio, -1))
      : null
  if (primeraOcurrencia === null) {
    return null
  }
  const anterior = anteriorOcurrencia(r as Recurrencia, primeraOcurrencia)
  // anteriorOcurrencia solo da null con 'unica', que RecurrenciaProduccion no admite.
  return sumarDias(anterior as Fecha, 1)
}

/** Días del periodo de una ocurrencia: diasEntre(anteriorOcurrencia(r, ocurrencia), ocurrencia) (§7 l.1123). */
export function diasDelPeriodo(r: RecurrenciaProduccion, ocurrencia: Fecha): number {
  const anterior = anteriorOcurrencia(r as Recurrencia, ocurrencia) as Fecha
  return diasEntre(anterior, ocurrencia)
}

/** base × sumaFactores ÷ diasDelPeriodo (§7 l.1119; §9 l.1317). */
export function cantidadDeOcurrencia(base: number, sumaFactores: number, diasDelPeriodo: number): number {
  return (base * sumaFactores) / diasDelPeriodo
}

/** Días que lleva sumados: máx(0, diasEntre(máx(desde, primerDiaQueCuenta), hoy) + 1) (A7b: «11 días acumulados»). */
export function diasAcumulados(
  produccion: Pick<ProduccionEdificio, 'recurrencia' | 'acumulado'>,
  hoy: Fecha,
): number {
  const primero = primerDiaQueCuenta(produccion.recurrencia)
  const desde =
    primero !== null && compararFechas(primero, produccion.acumulado.desde) > 0 ? primero : produccion.acumulado.desde
  return Math.max(0, diasEntre(desde, hoy) + 1)
}
```

Dos notas sobre `anteriorOcurrencia` y `siguienteOcurrencia`, que este módulo no vuelve a implementar: ninguna de las dos comprueba `inicio` cuando calcula la ocurrencia teórica del periodo anterior (`anteriorOcurrencia` ignora tanto `inicio` como `primera`, a propósito: es la única forma de que la primera ocurrencia de una regla semanal caiga exactamente el día de `inicio`, no una semana después). `RecurrenciaProduccion` no tiene el tipo `'unica'`, así que las conversiones `as Recurrencia` y `as Fecha` son seguras: las dos funciones solo devuelven `null` para ese tipo, que aquí no puede llegar.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/almacen/produccion.test.ts
```

Salida esperada:

```text
 Test Files  1 passed (1)
      Tests  18 passed (18)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas, el lint y la compilación**

```bash
npx tsc -b
npm test
npm run lint
npm run build
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **950 pruebas en 83 archivos**: las 931 que dejó la tarea 4, las 18 de `produccion.test.ts` y **una más** en `pureza.test.ts` (módulo nuevo). El contrato estimaba 15 pruebas nuevas (944 en total); la diferencia de 4 son las pruebas añadidas para cubrir por separado cada rama de `factorDiario` (dañado/inactivo/alquilado en una sola prueba con tres aserciones, necesarios = 0, y más asignados que necesarios) que el contrato agrupaba en una sola descripción (§9 del contrato, aviso 2):

```text
 Test Files  83 passed (83)
      Tests  950 passed (950)
```

`npm run lint` y `npm run build` terminan sin errores.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/almacen/produccion.ts src/dominio/almacen/produccion.test.ts
git commit -m "feat(almacen): producción de edificios (factor, periodo, cantidad y días acumulados)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
warning: in the working copy of 'src/dominio/almacen/produccion.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/almacen/produccion.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-4 3fe2a37] feat(almacen): producción de edificios (factor, periodo, cantidad y días acumulados)
 2 files changed, 205 insertions(+)
 create mode 100644 src/dominio/almacen/produccion.test.ts
 create mode 100644 src/dominio/almacen/produccion.ts
```

---

### Tarea 6 · Progreso de obras y caravanas (13)

Esta tarea crea `src/dominio/almacen/progreso.ts`: cuatro funciones puras que calculan el fin y el progreso de una obra, y la vuelta y el progreso de una caravana. No dependen del motor ni de ningún paso: solo de `calendario/fecha` y de los tipos de `modelo/asentamiento` y `modelo/comercio`. Las usan A9 y A10 (fase 8) para pintar la barra de progreso, y la tarea 12 (paso 6, obras) y la 13 (paso 7, caravanas) del motor para decidir cuándo termina una obra o vuelve una caravana.

No depende de ninguna otra tarea de la fase 4: parte de lo que deje la tarea 5. **Sobre el recuento de `npm test`:** las tareas 6 a 10 (este grupo) se verificaron en un clon aparte, partiendo de las tareas 1 a 5 aplicadas a mano según este mismo contrato (código y pruebas incluidos, tal como los dejaron ese grupo). En ese clon, justo antes de esta tarea, `npm test` daba **937 pruebas en 83 archivos**, no las 944/83 que estima la tabla del contrato ni las 950/83 con las que cerró de verdad el grupo de las tareas 1 a 5 (según su propia verificación, en `tarea-05.md`): la diferencia viene de que, en el clon de este grupo, la tarea 2 no tenía todavía la prueba de `formatearTramoDelAvance` y las tareas 3 y 5 dieron algunos casos más o menos que la estimación. Quien ejecute el plan de un tirón, tarea a tarea, verá el recuento real de las tareas 1 a 5 (950 pruebas en 83 archivos, salvo que esa tarea cambie); esta tarea 6 lo sigue sumando **12 pruebas** (11 de `progreso.test.ts` más 1 que gana `pureza.test.ts` por el módulo nuevo) y **1 archivo**, sea cual sea el punto de partida. Las tareas 7 a 10 hacen la misma cuenta: el número que no cambia es lo que suma cada una, no el total acumulado.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Reglas de la especificación que implementa:**

- **Fin de una obra y progreso** (§9 l.1321; A9, `design/build-artboards.mjs` l.1280-1289). «Obras y caravanas calculan progreso y vuelta desde su fecha real; si la vuelta o el fin ya pasaron, se aplican el primer día del siguiente avance.» La tarjeta de obra de A9 muestra el progreso como «Día 7 de 12 · quedan 5 días» junto a un `58 %` y una barra: `tarjetaObra({ nombre: 'Reparación de la puerta del sur', … pct: 58, progreso: 'Día 7 de 12 · quedan 5 días', … })` y `tarjetaObra({ nombre: 'Nuevo granero', … pct: 8, progreso: 'Día 3 de 40 · quedan 37 días', … })`.
- **Vuelta de una caravana** (§7 l.1151-1159). «Compra: se paga al salir y los recursos entran al volver.» «Venta: los recursos salen al salir y el dinero entra al volver.» «Traslado: … Duración de un traslado = días de viaje de ida.» «Duración de compra y venta = días de viaje de ida y vuelta. Los días de viaje se guardan solo de ida.» «Vender en el mercado local es una caravana con 0 días.»
- **Progreso de una caravana** (A10, `design/build-artboards.mjs` l.1302-1313). El 12 de abril, la venta de cerveza de Fornost (salió el 10, 4 días de viaje) muestra `pct: 25`; la compra de víveres de Tharbad (salió el 1, 12 días de viaje) muestra `pct: 46`: `caravana({ titulo: 'Venta de cerveza', … origen: 'Salió el 10 de abril', destino: 'Fornost y vuelta', pct: 25, llegada: 'Vuelve el 18' })` y `caravana({ titulo: 'Compra de víveres', … origen: 'Salió el 1 de abril', destino: 'Tharbad y vuelta', pct: 46, llegada: 'Vuelve el 25', ultima: true })`.
- **Redondeos** (D-063). «El progreso de una obra es (hoy − inicio + 1) ÷ días y el de una caravana (hoy − salida) ÷ (vuelta − salida), en % con las mitades hacia arriba.»

**Archivos:**
- Crear: `src/dominio/almacen/progreso.ts`
- Prueba: `src/dominio/almacen/progreso.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/almacen/progreso.test.ts` con este contenido exacto:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import type { Obra } from '../modelo/asentamiento'
import type { Caravana } from '../modelo/comercio'
import { finDeObra, progresoDeCaravana, progresoDeObra, vueltaDeCaravana } from './progreso'

function f(anio: number, mes: number, dia: number): Fecha {
  return { anio, mes, dia }
}

describe('finDeObra', () => {
  it('inicio + diasTotales − 1: la puerta (6 abril, 12 días), el granero (10 abril, 40 días) y el molino de Archet (20 marzo, 40 días)', () => {
    expect(finDeObra({ inicio: f(1640, 4, 6), diasTotales: 12 })).toEqual(f(1640, 4, 17))
    expect(finDeObra({ inicio: f(1640, 4, 10), diasTotales: 40 })).toEqual(f(1640, 5, 19))
    expect(finDeObra({ inicio: f(1640, 3, 20), diasTotales: 40 })).toEqual(f(1640, 4, 28))
  })

  it('una obra planificada, sin inicio, no tiene fin', () => {
    expect(finDeObra({ inicio: undefined, diasTotales: 20 })).toBeNull()
  })
})

describe('progresoDeObra', () => {
  it('la puerta del sur: «Día 7 de 12 · quedan 5 días», 58 % el 12 de abril', () => {
    const obra: Pick<Obra, 'estado' | 'inicio' | 'diasTotales'> = {
      estado: 'enCurso',
      inicio: f(1640, 4, 6),
      diasTotales: 12,
    }
    expect(progresoDeObra(obra, f(1640, 4, 12))).toEqual({ dia: 7, dias: 12, quedan: 5, pct: 58 })
  })

  it('el granero: 8 % el 12 de abril y 25 % el 19 de abril (O2)', () => {
    const obra: Pick<Obra, 'estado' | 'inicio' | 'diasTotales'> = {
      estado: 'enCurso',
      inicio: f(1640, 4, 10),
      diasTotales: 40,
    }
    expect(progresoDeObra(obra, f(1640, 4, 12)).pct).toBe(8)
    expect(progresoDeObra(obra, f(1640, 4, 19)).pct).toBe(25)
  })

  it('el molino de Archet: 60 % el 12 de abril y 78 % el 19 de abril (O2)', () => {
    const obra: Pick<Obra, 'estado' | 'inicio' | 'diasTotales'> = {
      estado: 'enCurso',
      inicio: f(1640, 3, 20),
      diasTotales: 40,
    }
    expect(progresoDeObra(obra, f(1640, 4, 12)).pct).toBe(60)
    expect(progresoDeObra(obra, f(1640, 4, 19)).pct).toBe(78)
  })

  it('una obra planificada da día 0 y 0 %', () => {
    const obra: Pick<Obra, 'estado' | 'inicio' | 'diasTotales'> = { estado: 'planificada', diasTotales: 20 }
    expect(progresoDeObra(obra, f(1640, 4, 12))).toEqual({ dia: 0, dias: 20, quedan: 20, pct: 0 })
  })

  it('una obra terminada da el total de días y 100 %, aunque hoy sea mucho después del fin', () => {
    const obra: Pick<Obra, 'estado' | 'inicio' | 'diasTotales'> = {
      estado: 'terminada',
      inicio: f(1640, 4, 6),
      diasTotales: 12,
    }
    expect(progresoDeObra(obra, f(1640, 4, 30))).toEqual({ dia: 12, dias: 12, quedan: 0, pct: 100 })
  })
})

describe('vueltaDeCaravana', () => {
  it('una compra o una venta van y vuelven: salida + 2 × días de viaje (Fornost, 4 días, del 10 al 18)', () => {
    expect(vueltaDeCaravana(f(1640, 4, 10), 4, 'venta')).toEqual(f(1640, 4, 18))
    expect(vueltaDeCaravana(f(1640, 4, 1), 12, 'compra')).toEqual(f(1640, 4, 25))
  })

  it('un traslado solo va una vez: salida + días de viaje, sin doblar', () => {
    expect(vueltaDeCaravana(f(1640, 4, 10), 3, 'traslado')).toEqual(f(1640, 4, 13))
  })

  it('el mercado local, con 0 días de viaje, vuelve el mismo día', () => {
    expect(vueltaDeCaravana(f(1640, 4, 12), 0, 'compra')).toEqual(f(1640, 4, 12))
  })
})

describe('progresoDeCaravana', () => {
  it('la venta de Fornost (10 al 18) y la compra de Tharbad (1 al 25) del ejemplo: 25 % y 46 % el 12 de abril', () => {
    const fornost: Pick<Caravana, 'salida' | 'vuelta'> = { salida: f(1640, 4, 10), vuelta: f(1640, 4, 18) }
    const tharbad: Pick<Caravana, 'salida' | 'vuelta'> = { salida: f(1640, 4, 1), vuelta: f(1640, 4, 25) }
    expect(progresoDeCaravana(fornost, f(1640, 4, 12))).toBe(25)
    expect(progresoDeCaravana(tharbad, f(1640, 4, 12))).toBe(46)
  })

  it('con 0 días de viaje (mercado local): 0 % antes de salir y 100 % desde que sale', () => {
    const local: Pick<Caravana, 'salida' | 'vuelta'> = { salida: f(1640, 4, 12), vuelta: f(1640, 4, 12) }
    expect(progresoDeCaravana(local, f(1640, 4, 11))).toBe(0)
    expect(progresoDeCaravana(local, f(1640, 4, 12))).toBe(100)
    expect(progresoDeCaravana(local, f(1640, 4, 13))).toBe(100)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/almacen/progreso.test.ts
```

Fallo esperado: el módulo `./progreso` no existe todavía. La hora, la duración y el corte de la línea citada pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/almacen/progreso.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/almacen/progreso.test.ts [ src/dominio/almacen/progreso.test.ts ]
Error: Cannot find module './progreso' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/almacen/progreso.test.ts
 ❯ src/dominio/almacen/progreso.test.ts:5:1
      3| import type { Obra } from '../modelo/asentamiento'
      4| import type { Caravana } from '../modelo/comercio'
      5| import { finDeObra, progresoDeCaravana, progresoDeObra, vueltaDeCarava…
       | ^
      6|
      7| function f(anio: number, mes: number, dia: number): Fecha {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  20:00:54
   Duration  548ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Crear `progreso.ts`**

Crea `src/dominio/almacen/progreso.ts` con este contenido exacto:

```ts
import { compararFechas, diasEntre, sumarDias, type Fecha } from '../calendario/fecha'
import { redondearMitadArriba } from '../dinero/importe'
import type { Obra } from '../modelo/asentamiento'
import type { Caravana } from '../modelo/comercio'

/** inicio + diasTotales − 1; null en una obra planificada, que no tiene inicio (§8 l.1250). */
export function finDeObra(obra: Pick<Obra, 'inicio' | 'diasTotales'>): Fecha | null {
  return obra.inicio === undefined ? null : sumarDias(obra.inicio, obra.diasTotales - 1)
}

/** «Día 7 de 12 · quedan 5 días» y el % (D-063). */
export interface ProgresoDeObra {
  dia: number
  dias: number
  quedan: number
  pct: number
}

/**
 * Terminada: dia = dias y 100 %. Sin inicio o antes de él: dia 0 y 0 %. Si no: dia = mín(dias, diasEntre(inicio,
 * hoy) + 1), quedan = dias − dia, pct = redondearMitadArriba(100 × dia ÷ dias) (D-063).
 */
export function progresoDeObra(obra: Pick<Obra, 'estado' | 'inicio' | 'diasTotales'>, hoy: Fecha): ProgresoDeObra {
  const dias = obra.diasTotales
  if (obra.estado === 'terminada') {
    return { dia: dias, dias, quedan: 0, pct: 100 }
  }
  if (obra.inicio === undefined || compararFechas(hoy, obra.inicio) < 0) {
    return { dia: 0, dias, quedan: dias, pct: 0 }
  }
  const dia = Math.min(dias, diasEntre(obra.inicio, hoy) + 1)
  return { dia, dias, quedan: dias - dia, pct: redondearMitadArriba((100 * dia) / dias) }
}

/** salida + diasViaje (traslado) o salida + 2 × diasViaje (compra y venta); con 0 días, la misma salida (§7 l.1154-1157). */
export function vueltaDeCaravana(salida: Fecha, diasViaje: number, operacion: Caravana['operacion']): Fecha {
  return sumarDias(salida, operacion === 'traslado' ? diasViaje : diasViaje * 2)
}

/**
 * redondearMitadArriba(100 × (hoy − salida) ÷ (vuelta − salida)), entre 0 y 100; con vuelta = salida, 0 antes y
 * 100 desde ese día (D-063).
 */
export function progresoDeCaravana(caravana: Pick<Caravana, 'salida' | 'vuelta'>, hoy: Fecha): number {
  const total = diasEntre(caravana.salida, caravana.vuelta)
  if (total === 0) {
    return compararFechas(hoy, caravana.salida) < 0 ? 0 : 100
  }
  const transcurridos = diasEntre(caravana.salida, hoy)
  return Math.max(0, Math.min(100, redondearMitadArriba((100 * transcurridos) / total)))
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/almacen/progreso.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  20:01:11
   Duration  498ms (transform 63%, import 23%, worker 8%, tests 6%)
```

(Son 12 pruebas: los `it` del archivo. `pureza.test.ts` suma una prueba más al ejecutar la suite entera, en el paso siguiente.)

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0; `npm test` añade las 11 de `progreso.test.ts` (la duodécima línea de arriba, «TOLERANCIA» aparte, en realidad son 12 `it`; ver la nota) más 1 de `pureza.test.ts` a las 950 pruebas en 83 archivos que dejaron las tareas 1 a 5:

```text
 Test Files  84 passed (84)
      Tests  963 passed (963)
```

Si tu recuento de partida (al terminar la tarea 5) fue distinto de **950 pruebas en 83 archivos**, la cifra de arriba será la tuya más 13 (12 de `progreso.test.ts` + 1 de `pureza.test.ts`) y el número de archivos, el tuyo más 1. Lo que no cambia es la suma: esta tarea añade 13 pruebas y 1 archivo (en el clon aparte de este grupo, que partió de 937/83 en vez de 950/83, esta misma regla dio 950/84).

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/almacen/progreso.ts src/dominio/almacen/progreso.test.ts
git commit -m "feat(almacen): progreso de obras y caravanas" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía; con `core.autocrlf=true`, `git add` puede avisar `LF will be replaced by CRLF`, inofensivo):

```text
[implementacion/fase-4 b78f9f8] feat(almacen): progreso de obras y caravanas
 2 files changed, 148 insertions(+)
 create mode 100644 src/dominio/almacen/progreso.ts
 create mode 100644 src/dominio/almacen/progreso.test.ts
```

`git status --short` no muestra nada de esta tarea (puede seguir mostrando lo que dejaron sin commitear las tareas 1 a 5, si las ejecutasteis así).

**Avisos que esta tarea deja escritos:**

1. `finDeObra`, `progresoDeObra`, `vueltaDeCaravana` y `progresoDeCaravana` son funciones puras sin acceso al motor: las tareas 12 (paso 6) y 13 (paso 7) las usan para decidir cuándo termina una obra o vuelve una caravana (`fin ≤ día`, `vuelta ≤ día`), y las fases 6 y 8 las usan para pintar A9 y A10. Ningún paso del motor debe reimplementar este cálculo.
2. `progresoDeObra` y `progresoDeCaravana` no dependen del almacén ni del contexto: reciben solo lo que necesitan de `Obra` y `Caravana` con `Pick`, así que las pruebas no tienen que construir un objeto completo.

---

### Tarea 7 · Textos del almacén (21)

Esta tarea añade a `src/dominio/motor/textos.ts` todo lo que necesitan los pasos del motor (tareas 9 a 15) y los avisos (tareas 17 a 19) para escribir sus conceptos, sus hechos y sus avisos: `minusculaInicial`, `recursoDelCatalogo`, `nombreDeFrecuencia`, tres conceptos nuevos (D-066), tres hechos nuevos (D-052), ocho avisos nuevos y `faltaDeDinero` (D-051), y `textoFaltan` para los formularios de edición (D-067). También cambia `conceptoVentaCaravana` para que reutilice `minusculaInicial` sin cambiar su salida.

Depende de las tareas 2 (`enumerar`, exportada) y 3 (`cantidadDeRecurso`, `esUnaUnidad` y `formatearCantidad`). No depende de las tareas 4, 5, 6, 8, 9 ni 10: los textos son puros y no tocan el motor ni el almacén en vivo. Parte de lo que dejen las tareas 1 a 6; esta verificación llegó a la tarea 7 con **963 pruebas en 84 archivos**. Si tu recuento de partida es otro, sigue con el tuyo: esta tarea suma **21 pruebas** (las de los nuevos `describe` de `textos.test.ts`) y **0 archivos** (no crea ningún módulo: `pureza.test.ts` no crece).

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Reglas de la especificación que implementa:**

- **Textos de faltas y pérdidas** (D-051). «Víveres, con las frases del ejemplo: «Los víveres de Bree se agotan el 23 de abril»; en rojo, si una caravana con víveres llega después, se añade «y la caravana de Tharbad no vuelve hasta el 25 de abril» («no llega» si es un traslado). Otros recursos: «Bree se queda sin cerveza el 26 de julio». Lo ocurrido: «Los víveres de Bree se agotaron el 23 de abril: faltaron 2.217 sacos» y «Bree se quedó sin madera el 6 de julio: faltaron 62 haces». Pérdidas: «Se perderán 7 fardos de lana en Bree el 19 de mayo» y «Se perdieron 103 fardos de lana en Bree desde el 19 de mayo» («el 14 de julio» si fue un solo día). Obras y caravanas: «La obra «Horno comunal» no pudo empezar por falta de 20 carretadas de cal y 12 mo en la caja», «La caravana de compra a Fornost no pudo salir por falta de 12 mo en la caja», «La compra de víveres en Bree no pudo hacerse por falta de 12 mo en la caja». Edificios: los de §7 l.1145-1146. Con 1 unidad, el verbo va en singular («faltó 1 saco», «Se perderá 1 fardo»).»
- **Falta de recursos** (§9 l.1297). «El consumo se detiene en cero y genera un aviso rojo con el día y la cantidad que faltó.»
- **Edificio y mejora terminados** (§7 l.1145-1146). «Construir edificio: … Da un aviso ámbar en Inicio: «Horno comunal está terminado: anota su producción y sus trabajadores». … Mejorar edificio: … Al terminar da el aviso ámbar «La mejora de Cantera está terminada: anota su producción» …»
- **Hechos del avance** (D-052). «Qué ha pasado», en el resumen del avance, añade … las obras terminadas («Obra «Reparación de la puerta del sur» terminada · 17»), los eventos que acaban durante el avance, con sus días («Feria de primavera · 15 al 17»), y las compras y los traslados que llegan («Caravana de Tharbad de vuelta · 25», «Caravana de Bree llegada a Archet · 25»).»
- **Conceptos nuevos** (D-066). «Movimientos nuevos: «Obra: nuevo granero» en Obras; «Caravana: compra de víveres en Tharbad» y «Compra de víveres en Bree» en «Víveres del almacén» si son víveres y en Comercio si no (como D-011).»
- **Mensaje de faltas de un formulario** (D-067; §6.3 l.622). «Faltan 20 carretadas de cal», «Falta 1 lingote de hierro», «Faltan 20 carretadas de cal y 5 haces de madera».
- **Concordancia** (§5 del contrato; D-051). «faltaron/faltó», «Se perdieron/Se perdió», «Se perderán/Se perderá», «Faltan/Falta» y «Caben/Cabe» van en singular cuando la cantidad escrita es «1 …» o «menos de 1 …» (`esUnaUnidad`).

**Archivos:**
- Modificar: `src/dominio/motor/textos.ts`
- Prueba: `src/dominio/motor/textos.test.ts`

- [ ] **Paso 1: Escribir las pruebas que fallan**

En `src/dominio/motor/textos.test.ts`, sustituye el bloque de `import` del principio del archivo (desde `import { describe, expect, it } from 'vitest'` hasta el `} from './textos'` que lo cierra, sin tocar la línea `const EQ = …` que sigue):

```ts
import { describe, expect, it } from 'vitest'
import { formatearOro } from '../dinero/formato'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Dominio } from '../modelo/dominios'
import {
  ajustarTexto,
  avisoImpago,
  avisoPagoNoCubierto,
  avisoSaldoNegativo,
  conceptoBeneficio,
  conceptoDiario,
  conceptoLocales,
  conceptoSalarios,
  conceptoSoldadas,
  conceptoVentaCaravana,
  contraparteDeSalarios,
  contraparteDeSoldadas,
  hechoCaravanaDeVuelta,
  hechoLocalesCobrados,
  hechoTributoPagado,
  laCajaDe,
  nombreDeContraparte,
  nombreDeOficio,
  nombreDeRecurso,
} from './textos'
```

por este otro:

```ts
import { describe, expect, it } from 'vitest'
import { RECURSO } from '../catalogo/inicial'
import { formatearOro } from '../dinero/formato'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import type { RecursoEnCopia } from '../modelo/catalogos'
import type { RecurrenciaProduccion } from '../modelo/comunes'
import type { Dominio } from '../modelo/dominios'
import {
  ajustarTexto,
  avisoCaravanaQueNoPudoSalir,
  avisoCompraQueNoPudoHacerse,
  avisoEdificioTerminado,
  avisoFaltaOcurrida,
  avisoFaltaPrevista,
  avisoImpago,
  avisoMejoraTerminada,
  avisoObraQueNoPudoEmpezar,
  avisoPagoNoCubierto,
  avisoPerdidaOcurrida,
  avisoPerdidaPrevista,
  avisoSaldoNegativo,
  conceptoBeneficio,
  conceptoCompraAlmacen,
  conceptoCompraCaravana,
  conceptoDiario,
  conceptoLocales,
  conceptoObra,
  conceptoSalarios,
  conceptoSoldadas,
  conceptoVentaCaravana,
  contraparteDeSalarios,
  contraparteDeSoldadas,
  faltaDeDinero,
  hechoCaravanaDeVuelta,
  hechoEventoTerminado,
  hechoLocalesCobrados,
  hechoObraTerminada,
  hechoTrasladoLlegado,
  hechoTributoPagado,
  laCajaDe,
  minusculaInicial,
  nombreDeContraparte,
  nombreDeFrecuencia,
  nombreDeOficio,
  nombreDeRecurso,
  recursoDelCatalogo,
  textoFaltan,
} from './textos'
```

Añade al final de `src/dominio/motor/textos.test.ts`, después del último `})` y separado por una línea en blanco, este bloque:

```ts

const VIVERES: RecursoEnCopia = { id: RECURSO.viveres, nombre: 'Víveres', unidadSingular: 'saco', unidadPlural: 'sacos', propia: false }
const MADERA: RecursoEnCopia = { id: RECURSO.madera, nombre: 'Madera', unidadSingular: 'haz', unidadPlural: 'haces', propia: false }
const PIEDRA: RecursoEnCopia = { id: RECURSO.piedra, nombre: 'Piedra', unidadSingular: 'carretada', unidadPlural: 'carretadas', propia: false }
const CERVEZA: RecursoEnCopia = { id: RECURSO.cerveza, nombre: 'Cerveza', unidadSingular: 'barril', unidadPlural: 'barriles', propia: false }
const LANA: RecursoEnCopia = { id: RECURSO.lana, nombre: 'Lana', unidadSingular: 'fardo', unidadPlural: 'fardos', propia: false }
const HIERRO: RecursoEnCopia = { id: RECURSO.hierro, nombre: 'Hierro', unidadSingular: 'lingote', unidadPlural: 'lingotes', propia: false }
const CAL: RecursoEnCopia = { id: 'recurso.cal', nombre: 'Cal', unidadSingular: 'carretada', unidadPlural: 'carretadas', propia: true }

describe('minusculaInicial', () => {
  it('«Oro en bruto» → «oro en bruto»; una cadena vacía se queda vacía', () => {
    expect(minusculaInicial('Oro en bruto')).toBe('oro en bruto')
    expect(minusculaInicial('')).toBe('')
  })
})

describe('conceptos del almacén (D-066)', () => {
  it('conceptoObra: «Obra: nuevo granero» y «Obra: reparación de la puerta del sur»', () => {
    expect(conceptoObra('Nuevo granero')).toBe('Obra: nuevo granero')
    expect(conceptoObra('Reparación de la puerta del sur')).toBe('Obra: reparación de la puerta del sur')
  })

  it('conceptoCompraCaravana: «Caravana: compra de víveres en Tharbad»', () => {
    expect(conceptoCompraCaravana('Víveres', 'Tharbad')).toBe('Caravana: compra de víveres en Tharbad')
  })

  it('conceptoCompraAlmacen: «Compra de víveres en Bree»', () => {
    expect(conceptoCompraAlmacen('Víveres', 'Bree')).toBe('Compra de víveres en Bree')
  })
})

describe('hechos del almacén (D-052)', () => {
  it('hechoObraTerminada: «Obra «Reparación de la puerta del sur» terminada · 17»', () => {
    expect(hechoObraTerminada('Reparación de la puerta del sur', '17')).toBe(
      'Obra «Reparación de la puerta del sur» terminada · 17',
    )
  })

  it('hechoEventoTerminado: «Feria de primavera · 15 al 17» y «Lluvias de primavera · 8 al 21 de abril»', () => {
    expect(hechoEventoTerminado('Feria de primavera', '15 al 17')).toBe('Feria de primavera · 15 al 17')
    expect(hechoEventoTerminado('Lluvias de primavera', '8 al 21 de abril')).toBe(
      'Lluvias de primavera · 8 al 21 de abril',
    )
  })

  it('hechoTrasladoLlegado: «Caravana de Bree llegada a Archet · 25»', () => {
    expect(hechoTrasladoLlegado('Bree', 'Archet', '25')).toBe('Caravana de Bree llegada a Archet · 25')
  })
})

describe('avisoFaltaPrevista', () => {
  it('víveres: «Los víveres de Bree se agotan el 23 de abril», y con una caravana que no llega a tiempo', () => {
    expect(avisoFaltaPrevista('Bree', VIVERES, '23 de abril')).toBe('Los víveres de Bree se agotan el 23 de abril')
    expect(
      avisoFaltaPrevista('Bree', VIVERES, '23 de abril', { de: 'Tharbad', operacion: 'compra', fecha: '25 de abril' }),
    ).toBe('Los víveres de Bree se agotan el 23 de abril y la caravana de Tharbad no vuelve hasta el 25 de abril')
    expect(
      avisoFaltaPrevista('Bree', VIVERES, '23 de abril', { de: 'Archet', operacion: 'traslado', fecha: '25 de abril' }),
    ).toBe('Los víveres de Bree se agotan el 23 de abril y la caravana de Archet no llega hasta el 25 de abril')
  })

  it('otro recurso: «Bree se queda sin cerveza el 26 de julio»', () => {
    expect(avisoFaltaPrevista('Bree', CERVEZA, '26 de julio')).toBe('Bree se queda sin cerveza el 26 de julio')
  })
})

describe('avisoFaltaOcurrida', () => {
  it('víveres y madera en plural, y «faltó 1 saco» en singular', () => {
    expect(avisoFaltaOcurrida('Bree', VIVERES, '23 de abril', 2216.667)).toBe(
      'Los víveres de Bree se agotaron el 23 de abril: faltaron 2.217 sacos',
    )
    expect(avisoFaltaOcurrida('Bree', MADERA, '6 de julio', 62.16)).toBe(
      'Bree se quedó sin madera el 6 de julio: faltaron 62 haces',
    )
    expect(avisoFaltaOcurrida('Archet', VIVERES, '9 de julio', 1)).toBe(
      'Los víveres de Archet se agotaron el 9 de julio: faltó 1 saco',
    )
  })
})

describe('avisoPerdidaPrevista', () => {
  it('plural con 7 y singular con 1', () => {
    expect(avisoPerdidaPrevista('Bree', LANA, 7, '19 de mayo')).toBe(
      'Se perderán 7 fardos de lana en Bree el 19 de mayo',
    )
    expect(avisoPerdidaPrevista('Bree', LANA, 1, '19 de mayo')).toBe('Se perderá 1 fardo de lana en Bree el 19 de mayo')
  })
})

describe('avisoPerdidaOcurrida', () => {
  it('«desde el» con varios días y «el» con uno solo', () => {
    expect(avisoPerdidaOcurrida('Bree', LANA, 103, '19 de mayo', true)).toBe(
      'Se perdieron 103 fardos de lana en Bree desde el 19 de mayo',
    )
    expect(avisoPerdidaOcurrida('Bree', PIEDRA, 13.333, '14 de julio', false)).toBe(
      'Se perdieron 13 carretadas de piedra en Bree el 14 de julio',
    )
  })
})

describe('avisoObraQueNoPudoEmpezar', () => {
  it('con faltas y sin faltas', () => {
    expect(avisoObraQueNoPudoEmpezar('Horno comunal', ['20 carretadas de cal', '12 mo en la caja'])).toBe(
      'La obra «Horno comunal» no pudo empezar por falta de 20 carretadas de cal y 12 mo en la caja',
    )
    expect(avisoObraQueNoPudoEmpezar('Horno comunal', [])).toBe('La obra «Horno comunal» no pudo empezar')
  })
})

describe('avisoCaravanaQueNoPudoSalir', () => {
  it('compra, venta y traslado', () => {
    expect(avisoCaravanaQueNoPudoSalir('compra', 'Fornost', ['12 mo en la caja'])).toBe(
      'La caravana de compra a Fornost no pudo salir por falta de 12 mo en la caja',
    )
    expect(avisoCaravanaQueNoPudoSalir('venta', 'Fornost', ['10 barriles de cerveza'])).toBe(
      'La caravana de venta a Fornost no pudo salir por falta de 10 barriles de cerveza',
    )
    expect(avisoCaravanaQueNoPudoSalir('traslado', 'Archet', [])).toBe(
      'La caravana de traslado a Archet no pudo salir',
    )
  })
})

describe('avisoCompraQueNoPudoHacerse', () => {
  it('«La compra de víveres en Bree no pudo hacerse por falta de 12 mo en la caja»', () => {
    expect(avisoCompraQueNoPudoHacerse('Víveres', 'Bree', ['12 mo en la caja'])).toBe(
      'La compra de víveres en Bree no pudo hacerse por falta de 12 mo en la caja',
    )
  })
})

describe('edificio y mejora terminados', () => {
  it('avisoEdificioTerminado: «Horno comunal está terminado: anota su producción y sus trabajadores»', () => {
    expect(avisoEdificioTerminado('Horno comunal')).toBe(
      'Horno comunal está terminado: anota su producción y sus trabajadores',
    )
  })

  it('avisoMejoraTerminada: «La mejora de Cantera está terminada: anota su producción»', () => {
    expect(avisoMejoraTerminada('Cantera')).toBe('La mejora de Cantera está terminada: anota su producción')
  })
})

describe('faltaDeDinero', () => {
  it('«12 mo en la caja»', () => {
    expect(faltaDeDinero('12 mo')).toBe('12 mo en la caja')
  })
})

describe('textoFaltan', () => {
  it('«Faltan 20 carretadas de cal», «Falta 1 lingote de hierro» y las dos juntas', () => {
    expect(textoFaltan([{ cantidad: 20, recurso: CAL }])).toBe('Faltan 20 carretadas de cal')
    expect(textoFaltan([{ cantidad: 1, recurso: HIERRO }])).toBe('Falta 1 lingote de hierro')
    expect(textoFaltan([{ cantidad: 20, recurso: CAL }, { cantidad: 5, recurso: MADERA }])).toBe(
      'Faltan 20 carretadas de cal y 5 haces de madera',
    )
  })
})

describe('nombreDeFrecuencia', () => {
  it('las ocho formas de recurrencia de producción', () => {
    const casos: [RecurrenciaProduccion, string][] = [
      [{ tipo: 'diaria' }, 'cada día'],
      [{ tipo: 'cadaNDias', n: 3, primera: { anio: 1640, mes: 4, dia: 1 } }, 'cada 3 días'],
      [{ tipo: 'semanal', diaSemana: 5 }, 'semanal'],
      [{ tipo: 'quincenal', primera: { anio: 1640, mes: 4, dia: 1 } }, 'cada dos semanas'],
      [{ tipo: 'mensual', diaMes: 1 }, 'mensual'],
      [{ tipo: 'cadaNMeses', n: 2, diaMes: 15, primera: { anio: 1640, mes: 6, dia: 15 } }, 'cada 2 meses'],
      [{ tipo: 'trimestral', diaMes: 1, primera: { anio: 1640, mes: 4, dia: 1 } }, 'trimestral'],
      [{ tipo: 'anual', mes: 4, diaMes: 1 }, 'anual'],
    ]
    for (const [recurrencia, esperado] of casos) {
      expect(nombreDeFrecuencia(recurrencia)).toBe(esperado)
    }
  })
})

describe('recursoDelCatalogo', () => {
  it('el recurso del catálogo, y el genérico «mercancía» con un id que no está', () => {
    const catalogo = catalogosDeEjemplo()
    expect(recursoDelCatalogo(catalogo, RECURSO.viveres)).toMatchObject({
      id: RECURSO.viveres,
      nombre: 'Víveres',
      unidadSingular: 'saco',
      unidadPlural: 'sacos',
    })
    expect(recursoDelCatalogo(catalogo, 'recurso.que-no-existe')).toEqual({
      id: 'recurso.que-no-existe',
      nombre: 'mercancía',
      unidadSingular: 'unidad',
      unidadPlural: 'unidades',
      propia: false,
    })
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/textos.test.ts
```

Fallo esperado: las funciones nuevas todavía no existen en `./textos`, así que las 21 pruebas nuevas fallan y las 20 que ya había siguen pasando (41 en total). La hora y la duración pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/textos.test.ts (41 tests | 21 failed) 18ms
   ❯ minusculaInicial (1)
     × «Oro en bruto» → «oro en bruto»; una cadena vacía se queda vacía 3ms
   ❯ conceptos del almacén (D-066) (3)
     × conceptoObra: «Obra: nuevo granero» y «Obra: reparación de la puerta del sur» 1ms
     × conceptoCompraCaravana: «Caravana: compra de víveres en Tharbad» 1ms
     × conceptoCompraAlmacen: «Compra de víveres en Bree» 0ms
   ❯ hechos del almacén (D-052) (3)
     × hechoObraTerminada: «Obra «Reparación de la puerta del sur» terminada · 17» 0ms
     × hechoEventoTerminado: «Feria de primavera · 15 al 17» y «Lluvias de primavera · 8 al 21 de abril» 0ms
     × hechoTrasladoLlegado: «Caravana de Bree llegada a Archet · 25» 0ms
   ❯ avisoFaltaPrevista (2)
     × víveres: «Los víveres de Bree se agotan el 23 de abril», y con una caravana que no llega a tiempo 0ms
     × otro recurso: «Bree se queda sin cerveza el 26 de julio» 0ms
   ❯ avisoFaltaOcurrida (1)
     × víveres y madera en plural, y «faltó 1 saco» en singular 0ms
   ❯ avisoPerdidaPrevista (1)
     × plural con 7 y singular con 1 0ms
   ❯ avisoPerdidaOcurrida (1)
     × «desde el» con varios días y «el» con uno solo 0ms
   ❯ avisoObraQueNoPudoEmpezar (1)
     × con faltas y sin faltas 0ms
   ❯ avisoCaravanaQueNoPudoSalir (1)
     × compra, venta y traslado 0ms
   ❯ avisoCompraQueNoPudoHacerse (1)
     × «La compra de víveres en Bree no pudo hacerse por falta de 12 mo en la caja» 0ms
   ❯ edificio y mejora terminados (2)
     × avisoEdificioTerminado: «Horno comunal está terminado: anota su producción y sus trabajadores» 0ms
     × avisoMejoraTerminada: «La mejora de Cantera está terminada: anota su producción» 0ms
   ❯ faltaDeDinero (1)
     × «12 mo en la caja» 0ms
   ❯ textoFaltan (1)
     × «Faltan 20 carretadas de cal», «Falta 1 lingote de hierro» y las dos juntas 0ms
   ❯ nombreDeFrecuencia (1)
     × las ocho formas de recurrencia de producción 0ms
   ❯ recursoDelCatalogo (1)
     × el recurso del catálogo, y el genérico «mercancía» con un id que no está 0ms

⎯⎯⎯⎯⎯⎯ Failed Tests 21 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/textos.test.ts > minusculaInicial > «Oro en bruto» → «oro en bruto»; una cadena vacía se queda vacía
TypeError: minusculaInicial is not a function
 ❯ src/dominio/motor/textos.test.ts:250:12
    248| describe('minusculaInicial', () => {
    249|   it('«Oro en bruto» → «oro en bruto»; una cadena vacía se queda vacía…
    250|     expect(minusculaInicial('Oro en bruto')).toBe('oro en bruto')
       |            ^
    251|     expect(minusculaInicial('')).toBe('')
    252|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/21]⎯

 FAIL  src/dominio/motor/textos.test.ts > conceptos del almacén (D-066) > conceptoObra: «Obra: nuevo granero» y «Obra: reparación de la puerta del sur»
TypeError: conceptoObra is not a function
 ❯ src/dominio/motor/textos.test.ts:257:12
    255| describe('conceptos del almacén (D-066)', () => {
    256|   it('conceptoObra: «Obra: nuevo granero» y «Obra: reparación de la pu…

 Test Files  1 failed (1)
      Tests  21 failed | 20 passed (41)
```

(Las demás fallan igual, cada una con `TypeError: <nombre> is not a function`; se omiten aquí por brevedad.)

- [ ] **Paso 3: Sustituir `textos.ts` entero**

`textos.ts` tiene inserciones en varios puntos del archivo (no solo al final), así que el paso más fiable es sustituir el archivo entero. Reemplaza todo el contenido de `src/dominio/motor/textos.ts` por este:

```ts
import { cantidadDeRecurso, esUnaUnidad, formatearCantidad } from '../almacen/cantidades'
import { enumerar, formatearMeses } from '../calendario/formatoFecha'
import { RECURSO } from '../catalogo/inicial'
import type { CatalogosEnCopia, RecursoEnCopia } from '../modelo/catalogos'
import type { Caravana } from '../modelo/comercio'
import type { AnioMes, Id, RecurrenciaProduccion } from '../modelo/comunes'
import type { Dominio } from '../modelo/dominios'
import { esNombreReservado } from '../texto/normalizar'
import type { QuePago } from './tipos'

/** Largo máximo del concepto de un movimiento (EsquemaConcepto). */
const MAXIMO_CONCEPTO = 120

/** Largo máximo del texto de un aviso o de un hecho (EsquemaAvisoAvance y EsquemaCambioAvance). */
const MAXIMO_TEXTO = 200

/** Largo máximo y mínimo del nombre de una persona o entidad (EsquemaNombreLargo). */
const MAXIMO_NOMBRE = 60
const MINIMO_NOMBRE = 2

/** Cómo nombra cada pago un aviso «Pago no cubierto», salvo los que van por su concepto (§9 l.1354, D-025). */
const QUE_SE_PAGA: Readonly<Record<Exclude<QuePago['clase'], 'concepto'>, string>> = {
  tributo: 'el tributo',
  salarios: 'los salarios',
  soldadas: 'la soldada',
}

/** Corta un texto a `maximo` caracteres con «…» al final (T26). */
export function ajustarTexto(texto: string, maximo: number): string {
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo - 1)}…`
}

/** Pega un sufijo que nunca se corta: si no cabe, se corta lo de delante con «…» (T26). */
function conSufijo(texto: string, sufijo: string, maximo: number): string {
  return `${ajustarTexto(texto, maximo - sufijo.length)}${sufijo}`
}

/** «7 noches», «1 noche», «1 día»: con 1, la unidad pierde la «s» final (D-030). */
function cuenta(numero: number, unidad: string): string {
  return numero === 1 && unidad.endsWith('s') ? `1 ${unidad.slice(0, -1)}` : `${numero} ${unidad}`
}

/** « · 7 días» detrás de un pago agrupado diario, o nada si no es diario (D-029). */
function sufijoDeDias(dias?: number): string {
  return dias === undefined ? '' : ` · ${cuenta(dias, 'días')}`
}

/** «Posada El Poney Pisador · 7 noches», «Peaje del camino · 1 día»; corta el concepto, nunca el sufijo (§9 l.1285, D-030). */
export function conceptoDiario(concepto: string, dias: number, unidadDiaria?: string): string {
  return conSufijo(concepto, ` · ${cuenta(dias, unidadDiaria ?? 'días')}`, MAXIMO_CONCEPTO)
}

/** «Salarios de 14 trabajadores», «Salarios de 1 trabajador»; con días: «… · 7 días» (§9 l.1287, D-029, D-031). */
export function conceptoSalarios(trabajadores: number, dias?: number): string {
  const quienes = trabajadores === 1 ? '1 trabajador' : `${trabajadores} trabajadores`
  return `Salarios de ${quienes}${sufijoDeDias(dias)}`
}

/** «Soldada de la guarnición»; con días: «Soldada de la guarnición · 7 días» (gen l.986, D-031). */
export function conceptoSoldadas(dias?: number): string {
  return `Soldada de la guarnición${sufijoDeDias(dias)}`
}

/** «Impuestos de locales · abril (4)», «… · marzo y abril (4)» (§9 l.1288, D-031). */
export function conceptoLocales(meses: readonly AnioMes[], locales: number): string {
  return conSufijo(`Impuestos de locales · ${formatearMeses(meses)}`, ` (${locales})`, MAXIMO_CONCEPTO)
}

/** «Beneficio de Barcaza del Brandivino» (como «Beneficio de El Tonel Dorado» del ejemplo). */
export function conceptoBeneficio(negocio: string): string {
  return ajustarTexto(`Beneficio de ${negocio}`, MAXIMO_CONCEPTO)
}

/** «Oro en bruto» → «oro en bruto» (la usa también conceptoVentaCaravana, T27). */
export function minusculaInicial(texto: string): string {
  return texto.length === 0 ? texto : `${texto.charAt(0).toLowerCase()}${texto.slice(1)}`
}

/** «Caravana: venta de cerveza en Fornost», con el recurso en minúscula inicial (D-031, T27). */
export function conceptoVentaCaravana(recurso: string, mercado: string): string {
  return ajustarTexto(`Caravana: venta de ${minusculaInicial(recurso)} en ${mercado}`, MAXIMO_CONCEPTO)
}

/** «Obra: nuevo granero», con el nombre de la obra en minúscula inicial (D-066). */
export function conceptoObra(obra: string): string {
  return ajustarTexto(`Obra: ${minusculaInicial(obra)}`, MAXIMO_CONCEPTO)
}

/** «Caravana: compra de víveres en Tharbad», con el recurso en minúscula inicial (D-066). */
export function conceptoCompraCaravana(recurso: string, mercado: string): string {
  return ajustarTexto(`Caravana: compra de ${minusculaInicial(recurso)} en ${mercado}`, MAXIMO_CONCEPTO)
}

/** «Compra de víveres en Bree», con el recurso en minúscula inicial (D-066). */
export function conceptoCompraAlmacen(recurso: string, mercado: string): string {
  return ajustarTexto(`Compra de ${minusculaInicial(recurso)} en ${mercado}`, MAXIMO_CONCEPTO)
}

/**
 * El oficio en singular con 1 y en plural con más; «Trabajador(es)» si no está en el catálogo (§6.3 l.579, T28).
 * El catálogo es pequeño y no crece con la partida: buscar en él no depende del tamaño del estado.
 */
export function nombreDeOficio(catalogo: CatalogosEnCopia, oficioId: Id, numero: number): string {
  const oficio = catalogo.opciones.find((o) => o.id === oficioId)
  if (oficio === undefined || oficio.lista !== 'oficios') {
    return numero === 1 ? 'Trabajador' : 'Trabajadores'
  }
  return numero === 1 ? oficio.nombre : oficio.plural
}

/** El nombre de un recurso del catálogo; «mercancía» si no está (T28). */
export function nombreDeRecurso(catalogo: CatalogosEnCopia, recursoId: Id): string {
  return catalogo.recursos.find((r) => r.id === recursoId)?.nombre ?? 'mercancía'
}

/** El recurso del catálogo; si no está: { id, nombre: 'mercancía', unidadSingular: 'unidad', unidadPlural: 'unidades' }. */
export function recursoDelCatalogo(catalogo: CatalogosEnCopia, recursoId: Id): RecursoEnCopia {
  const recurso = catalogo.recursos.find((r) => r.id === recursoId)
  if (recurso !== undefined) {
    return recurso
  }
  return { id: recursoId, nombre: 'mercancía', unidadSingular: 'unidad', unidadPlural: 'unidades', propia: false }
}

/** «cada día», «cada 3 días», «semanal», «cada dos semanas», «mensual», «cada 2 meses», «trimestral», «anual» (D-067). */
export function nombreDeFrecuencia(r: RecurrenciaProduccion): string {
  switch (r.tipo) {
    case 'diaria':
      return 'cada día'
    case 'cadaNDias':
      return `cada ${r.n} días`
    case 'semanal':
      return 'semanal'
    case 'quincenal':
      return 'cada dos semanas'
    case 'mensual':
      return 'mensual'
    case 'cadaNMeses':
      return `cada ${r.n} meses`
    case 'trimestral':
      return 'trimestral'
    case 'anual':
      return 'anual'
  }
}

/** «Trabajadores de Bree» (§9 l.1294). */
export function contraparteDeSalarios(asentamiento: string): string {
  return `Trabajadores de ${asentamiento}`
}

/** «Guarnición de Bree» (§9 l.1294). */
export function contraparteDeSoldadas(asentamiento: string): string {
  return `Guarnición de ${asentamiento}`
}

/** Deja el nombre válido para Personas y entidades: ≤ 60 con «…» y « (impago)» si queda corto o reservado (D-023). */
export function nombreDeContraparte(nombre: string): string {
  const cabe = ajustarTexto(nombre, MAXIMO_NOMBRE)
  return cabe.length < MINIMO_NOMBRE || esNombreReservado(cabe) ? `${cabe} (impago)` : cabe
}

/** «Tributo de Archet pagado · 19» (P5, gen l.586; D-032). Con los nombres de 60 como mucho, cabe en 200. */
export function hechoTributoPagado(asentamiento: string, dia: string): string {
  return `Tributo de ${asentamiento} pagado · ${dia}`
}

/** «Impuestos de locales de Bree cobrados · 1» (D-032). Con los nombres de 60 como mucho, cabe en 200. */
export function hechoLocalesCobrados(asentamiento: string, dia: string): string {
  return `Impuestos de locales de ${asentamiento} cobrados · ${dia}`
}

/** «Caravana de Fornost de vuelta · 18» (P5, gen l.585; D-032). Con los nombres de 60 como mucho, cabe en 200. */
export function hechoCaravanaDeVuelta(mercado: string, dia: string): string {
  return `Caravana de ${mercado} de vuelta · ${dia}`
}

/** «Obra «Reparación de la puerta del sur» terminada · 17» (D-052). */
export function hechoObraTerminada(obra: string, dia: string): string {
  return ajustarTexto(`Obra «${obra}» terminada · ${dia}`, MAXIMO_TEXTO)
}

/** «Feria de primavera · 15 al 17» (D-052); `dias` ya llega escrito (formatearTramoDelAvance). */
export function hechoEventoTerminado(evento: string, dias: string): string {
  return ajustarTexto(`${evento} · ${dias}`, MAXIMO_TEXTO)
}

/** «Caravana de Bree llegada a Archet · 25» (D-052). */
export function hechoTrasladoLlegado(origen: string, destino: string, dia: string): string {
  return ajustarTexto(`Caravana de ${origen} llegada a ${destino} · ${dia}`, MAXIMO_TEXTO)
}

/** «La bolsa de Tharan» o «La caja de Bree»: la bolsa es la del personaje (§6.4 l.808). */
export function laCajaDe(dominio: Dominio): string {
  return dominio.tipo === 'personaje' ? `La bolsa de ${dominio.nombre}` : `La caja de ${dominio.nombre}`
}

/** «La bolsa de Tharan está en negativo: −3,482 mo» (§6.4 l.808). */
export function avisoSaldoNegativo(dominio: Dominio, saldo: string): string {
  return `${laCajaDe(dominio)} está en negativo: ${saldo}`
}

/** «La caja de Bree no pudo pagar a Trabajadores de Bree: 1,2 mo pendientes» (D-024). Cabe en 200. */
export function avisoImpago(dominio: Dominio, contraparte: string, pendiente: string): string {
  return `${laCajaDe(dominio)} no pudo pagar a ${contraparte}: ${pendiente} pendientes`
}

/** «La caja de Archet no cubre el tributo de 60 mo del 19 de julio» (§9 l.1354, D-025); corta el concepto a 200 (T26). */
export function avisoPagoNoCubierto(dominio: Dominio, que: QuePago, importe: string, fecha: string): string {
  const antes = `${laCajaDe(dominio)} no cubre `
  const despues = ` de ${importe} del ${fecha}`
  if (que.clase !== 'concepto') {
    return `${antes}${QUE_SE_PAGA[que.clase]}${despues}`
  }
  const hueco = MAXIMO_TEXTO - antes.length - despues.length - '«»'.length
  return `${antes}«${ajustarTexto(que.concepto, hueco)}»${despues}`
}

/** Una caravana que llega después de que empiece la falta: se añade « y la caravana de X …» (D-051). */
export interface CaravanaQueTarda {
  de: string
  operacion: 'compra' | 'traslado'
  fecha: string
}

/** «Los víveres de Bree se agotan el 23 de abril», con la caravana que tarda si la hay (D-051). */
export function avisoFaltaPrevista(
  asentamiento: string,
  recurso: RecursoEnCopia,
  fecha: string,
  caravana?: CaravanaQueTarda,
): string {
  const base =
    recurso.id === RECURSO.viveres
      ? `Los víveres de ${asentamiento} se agotan el ${fecha}`
      : `${asentamiento} se queda sin ${minusculaInicial(recurso.nombre)} el ${fecha}`
  if (caravana === undefined) {
    return ajustarTexto(base, MAXIMO_TEXTO)
  }
  const verbo = caravana.operacion === 'compra' ? 'no vuelve hasta' : 'no llega hasta'
  return ajustarTexto(`${base} y la caravana de ${caravana.de} ${verbo} el ${caravana.fecha}`, MAXIMO_TEXTO)
}

/** «Los víveres de Bree se agotaron el 23 de abril: faltaron 2.217 sacos» (D-051). */
export function avisoFaltaOcurrida(asentamiento: string, recurso: RecursoEnCopia, fecha: string, faltaron: number): string {
  const cantidad = formatearCantidad(faltaron, recurso)
  const verbo = esUnaUnidad(cantidad) ? 'faltó' : 'faltaron'
  const base =
    recurso.id === RECURSO.viveres
      ? `Los víveres de ${asentamiento} se agotaron el ${fecha}`
      : `${asentamiento} se quedó sin ${minusculaInicial(recurso.nombre)} el ${fecha}`
  return ajustarTexto(`${base}: ${verbo} ${cantidad}`, MAXIMO_TEXTO)
}

/** «Se perderán 7 fardos de lana en Bree el 19 de mayo» (D-051; §7 l.1107). */
export function avisoPerdidaPrevista(asentamiento: string, recurso: RecursoEnCopia, cantidad: number, fecha: string): string {
  const texto = cantidadDeRecurso(cantidad, recurso)
  const verbo = esUnaUnidad(texto) ? 'Se perderá' : 'Se perderán'
  return ajustarTexto(`${verbo} ${texto} en ${asentamiento} el ${fecha}`, MAXIMO_TEXTO)
}

/** «Se perdieron 103 fardos de lana en Bree desde el 19 de mayo» («el 14 de julio» si fue un solo día, D-051). */
export function avisoPerdidaOcurrida(
  asentamiento: string,
  recurso: RecursoEnCopia,
  cantidad: number,
  fecha: string,
  variosDias: boolean,
): string {
  const texto = cantidadDeRecurso(cantidad, recurso)
  const verbo = esUnaUnidad(texto) ? 'Se perdió' : 'Se perdieron'
  const cuando = variosDias ? `desde el ${fecha}` : `el ${fecha}`
  return ajustarTexto(`${verbo} ${texto} en ${asentamiento} ${cuando}`, MAXIMO_TEXTO)
}

/** «La obra «Horno comunal» no pudo empezar por falta de 20 carretadas de cal y 12 mo en la caja» (D-047, D-051). */
export function avisoObraQueNoPudoEmpezar(obra: string, faltas: readonly string[]): string {
  const base = `La obra «${obra}» no pudo empezar`
  return ajustarTexto(faltas.length === 0 ? base : `${base} por falta de ${enumerar(faltas)}`, MAXIMO_TEXTO)
}

/** «La caravana de compra a Fornost no pudo salir por falta de 12 mo en la caja» (D-051). */
export function avisoCaravanaQueNoPudoSalir(
  operacion: Caravana['operacion'],
  destino: string,
  faltas: readonly string[],
): string {
  const base = `La caravana de ${operacion} a ${destino} no pudo salir`
  return ajustarTexto(faltas.length === 0 ? base : `${base} por falta de ${enumerar(faltas)}`, MAXIMO_TEXTO)
}

/** «La compra de víveres en Bree no pudo hacerse por falta de 12 mo en la caja» (D-051). */
export function avisoCompraQueNoPudoHacerse(recurso: string, mercado: string, faltas: readonly string[]): string {
  const base = `La compra de ${minusculaInicial(recurso)} en ${mercado} no pudo hacerse`
  return ajustarTexto(faltas.length === 0 ? base : `${base} por falta de ${enumerar(faltas)}`, MAXIMO_TEXTO)
}

/** «Horno comunal está terminado: anota su producción y sus trabajadores» (§7 l.1145). */
export function avisoEdificioTerminado(edificio: string): string {
  return ajustarTexto(`${edificio} está terminado: anota su producción y sus trabajadores`, MAXIMO_TEXTO)
}

/** «La mejora de Cantera está terminada: anota su producción» (§7 l.1146). */
export function avisoMejoraTerminada(edificio: string): string {
  return ajustarTexto(`La mejora de ${edificio} está terminada: anota su producción`, MAXIMO_TEXTO)
}

/** Lo que falta de dinero en una falta de obra, caravana o compra: «12 mo en la caja». */
export function faltaDeDinero(importe: string): string {
  return `${importe} en la caja`
}

/** «Faltan 20 carretadas de cal», «Falta 1 lingote de hierro», «Faltan 20 carretadas de cal y 5 haces de madera» (D-067). */
export function textoFaltan(faltas: readonly { cantidad: number; recurso: RecursoEnCopia }[]): string {
  const partes = faltas.map((f) => cantidadDeRecurso(f.cantidad, f.recurso))
  const verbo = faltas.length === 1 && esUnaUnidad(partes[0]) ? 'Falta' : 'Faltan'
  return `${verbo} ${enumerar(partes)}`
}
```

Fíjate en dos detalles: `minusculaInicial` sustituye el cálculo que antes tenía dentro `conceptoVentaCaravana` (su salida no cambia, y la prueba «beneficio y vuelta de una venta …» que ya existía en el archivo lo sigue comprobando sin que la hayas tocado), y `recursoDelCatalogo` devuelve el objeto tal cual cuando lo encuentra (no una copia), así que `toMatchObject` en la prueba es suficiente y no hace falta `toBe`.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/textos.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  41 passed (41)
   Start at  20:08:14
   Duration  739ms (transform 57%, import 39%, tests 3%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0; `npm test` añade las 21 pruebas nuevas de `textos.test.ts` a lo que dejó la tarea 6 (963 pruebas en 84 archivos; ningún módulo nuevo, así que `pureza.test.ts` no crece y el número de archivos no cambia):

```text
 Test Files  84 passed (84)
      Tests  984 passed (984)
```

Si tu recuento de partida al llegar aquí fue distinto de 963/84, la cifra de arriba será la tuya más 21 pruebas, con el mismo número de archivos.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/textos.ts src/dominio/motor/textos.test.ts
git commit -m "feat(motor): textos del almacen: conceptos, hechos, avisos y mensajes de edicion" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía; con `core.autocrlf=true`, `git add` puede avisar `LF will be replaced by CRLF`, inofensivo):

```text
[implementacion/fase-4 a2b859c] feat(motor): textos del almacen: conceptos, hechos, avisos y mensajes de edicion
 2 files changed, 392 insertions(+), 5 deletions(-)
```

**Avisos que esta tarea deja escritos:**

1. `avisoFaltaPrevista`, `avisoFaltaOcurrida`, `avisoPerdidaPrevista` y `avisoPerdidaOcurrida` distinguen víveres de cualquier otro recurso comparando `recurso.id === RECURSO.viveres`: quien las llame (tarea 17) debe construir el `RecursoEnCopia` con `recursoDelCatalogo`, que ya trae el `id`.
2. `hechoEventoTerminado` no calcula el tramo de fechas: recibe la cadena ya escrita. Quien la llame (tarea 15) debe llamar antes a `formatearTramoDelAvance` (tarea 2).
3. `avisoObraQueNoPudoEmpezar`, `avisoCaravanaQueNoPudoSalir` y `avisoCompraQueNoPudoHacerse` reciben `faltas` ya formateadas (cada fragmento con `cantidadDeRecurso` o con `faltaDeDinero`, que esta tarea también exporta) y las unen con `enumerar` (tarea 2): quien las llame (tarea 18) arma esa lista antes de pasarla.

---

### Tarea 8 · Contexto, caja y almacén del motor (26)

Esta es la tarea que prepara el motor para los pasos del almacén: añade los tipos nuevos (`FlujoAlmacen`, los sucesos `obraTerminada` y `llegadaTraslado`, y `ResultadoSimulacion.flujos`), los campos nuevos de `Contexto` (existencias, acumulados, asignados, primer día que cuenta, edificios, obras, defensas, entradas del almacén, producciones realizadas y flujos), `estadoFinal` con las seis colecciones nuevas, `pagarEntero` y `pagoProgramado` en `motor/caja.ts`, el módulo nuevo `motor/almacen.ts` (`filaEn`, `flujoDe`, `sumarAlAlmacen`, `consumirDelAlmacen`, `hayDeTodo`, `sacarDelAlmacen`), `Recorrido.flujos` en `motor/bucle.ts`, `flujos` en `motor/simular.ts` y el `else if` que hace falta en `motor/cambios.ts` para que siga compilando con los sucesos nuevos. También añade a `motor/pruebas/constructores.ts` los tres ayudantes de prueba que usarán las tareas 9 y 10 (y las que vengan después): `conFila`, `diaDe` y `recorrerPasos`.

Ninguna tarea posterior puede escribir un paso del motor sin esto: las tareas 9 a 13 (los pasos 3 a 7) llaman a `sumarAlAlmacen`, `consumirDelAlmacen`, `hayDeTodo`, `sacarDelAlmacen`, `pagarEntero` y `pagoProgramado`, y usan `ctx.edificios`, `ctx.acumulados`, `ctx.asignados` y `ctx.primerDiaQueCuenta`; sus pruebas usan `recorrerPasos`, `diaDe` y `conFila`.

Depende de las tareas 3 (`claveExistencia`, `TOLERANCIA`, `almacen/cantidades.ts`) y 5 (`asignadosPorEdificio`, `primerDiaQueCuenta`, `almacen/produccion.ts`). No depende de la 4, pero si la ejecutaste antes (como pide el orden del plan) ya tendrás `eventosConEfectosEl` en `motor/bucle.ts` y el JSDoc de `Dia.eventos` actualizado en `motor/contexto.ts`; los pasos de esta tarea dan por hecho ese estado y no lo vuelven a tocar. Parte de lo que dejen las tareas 1 a 7; esta verificación llegó a la tarea 8 con **984 pruebas en 84 archivos**. Si tu recuento de partida es otro, sigue con el tuyo: esta tarea suma **26 pruebas** (25 de los cuatro archivos de prueba más 1 que gana `pureza.test.ts` por `motor/almacen.ts`) y **1 archivo** (`motor/almacen.test.ts`).

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Reglas de la especificación que implementa:**

- **Orden del motor y pasos nuevos** (§9 l.1272-1282). «3. Inicio de obras programadas, salida de caravanas y compras programadas … 4. Producción de edificios … 5. Consumo de la población. 6. Avance de obras … 7. Llegada de caravanas y traslados.»
- **Registros con fecha pasada o de hoy** (§9 l.1321). «Nunca se aplican hacia atrás. … Obras y caravanas calculan progreso y vuelta desde su fecha real; si la vuelta o el fin ya pasaron, se aplican el primer día del siguiente avance.»
- **Capacidad** (§7 l.1107; §9 l.1314). «Lo que excede la capacidad al producir o al llegar una caravana se pierde, con aviso ámbar («Se perdieron N …»). … Sin capacidad no hay límite.»
- **Falta de recursos** (§9 l.1297). «El consumo se detiene en cero y genera un aviso rojo con el día y la cantidad que faltó.»
- **Falta de dinero (impagos)** (§9 l.1291-1293), adaptada por D-045 al paso 3: «Los pagos se hacen por filas … El motor nunca deja una caja en negativo.» El paso 3 usa `pagarEntero`, que paga todo o nada, en vez de `pagarHasta` (D-045: «el motor lo paga entero o no lo paga: sin pagos a medias ni impagos»).

**Archivos:**
- Modificar: `src/dominio/motor/tipos.ts`
- Modificar: `src/dominio/motor/contexto.ts`
- Modificar: `src/dominio/motor/caja.ts`
- Crear: `src/dominio/motor/almacen.ts`
- Modificar: `src/dominio/motor/bucle.ts`
- Modificar: `src/dominio/motor/simular.ts`
- Modificar: `src/dominio/motor/cambios.ts`
- Modificar: `src/dominio/motor/pruebas/constructores.ts`
- Prueba: `src/dominio/motor/contexto.test.ts`
- Prueba: `src/dominio/motor/caja.test.ts`
- Prueba: `src/dominio/motor/almacen.test.ts`
- Prueba: `src/dominio/motor/pruebas/constructores.test.ts`

- [ ] **Paso 1: Escribir las pruebas que fallan**

En `src/dominio/motor/contexto.test.ts`, sustituye este bloque (dentro de `describe('crearContexto', …)`, la prueba «copia las colecciones que escribe el motor…»):

```ts
  it('copia las colecciones que escribe el motor y empieza sin nada sumado (T29)', () => {
    const estado = ejemplo()
    const ctx = crearContexto(estado, HASTA, opciones())
    expect(ctx.movimientos).toEqual(estado.movimientos)
    expect(ctx.movimientos).not.toBe(estado.movimientos)
    expect(ctx.deudas).not.toBe(estado.deudas)
    expect(ctx.personas).not.toBe(estado.personas)
    expect(ctx.localesComerciales).not.toBe(estado.localesComerciales)
    expect(ctx.caravanas).not.toBe(estado.caravanas)
    expect(ctx.objetos).not.toBe(estado.objetos)
    expect(ctx.caravanas).toEqual(estado.caravanas)
    const posada = estado.movimientos.findIndex((m) => m.id === MOV_THARAN.posada12Abril)
    expect(ctx.indiceMovimiento.get(MOV_THARAN.posada12Abril)).toBe(posada)
    expect(ctx.indiceMovimiento.size).toBe(estado.movimientos.length)
    expect(ctx.programadosPorDia.size).toBe(0)
    expect([ctx.personasNuevas, ctx.sucesos]).toEqual([[], []])
    expect([ctx.diarios.size, ctx.cargosDiarios.size]).toEqual([0, 0])
  })
```

por este otro:

```ts
  it('copia las colecciones que escribe el motor y empieza sin nada sumado (T29)', () => {
    const estado = ejemplo()
    const ctx = crearContexto(estado, HASTA, opciones())
    expect(ctx.movimientos).toEqual(estado.movimientos)
    expect(ctx.movimientos).not.toBe(estado.movimientos)
    expect(ctx.deudas).not.toBe(estado.deudas)
    expect(ctx.personas).not.toBe(estado.personas)
    expect(ctx.localesComerciales).not.toBe(estado.localesComerciales)
    expect(ctx.caravanas).not.toBe(estado.caravanas)
    expect(ctx.objetos).not.toBe(estado.objetos)
    expect(ctx.caravanas).toEqual(estado.caravanas)
    expect(ctx.edificios).not.toBe(estado.edificios)
    expect(ctx.edificios).toEqual(estado.edificios)
    expect(ctx.obras).not.toBe(estado.obras)
    expect(ctx.obras).toEqual(estado.obras)
    expect(ctx.defensas).not.toBe(estado.defensas)
    expect(ctx.defensas).toEqual(estado.defensas)
    expect(ctx.entradasAlmacen).not.toBe(estado.entradasAlmacen)
    expect(ctx.entradasAlmacen).toEqual(estado.entradasAlmacen)
    expect(ctx.produccionesRealizadas).not.toBe(estado.produccionesRealizadas)
    expect(ctx.produccionesRealizadas).toEqual(estado.produccionesRealizadas)
    expect([...ctx.existencias.values()]).toEqual(estado.existencias)
    const posada = estado.movimientos.findIndex((m) => m.id === MOV_THARAN.posada12Abril)
    expect(ctx.indiceMovimiento.get(MOV_THARAN.posada12Abril)).toBe(posada)
    expect(ctx.indiceMovimiento.size).toBe(estado.movimientos.length)
    expect(ctx.programadosPorDia.size).toBe(0)
    expect([ctx.personasNuevas, ctx.sucesos, ctx.flujos]).toEqual([[], [], []])
    expect([ctx.diarios.size, ctx.cargosDiarios.size, ctx.indiceFlujo.size]).toEqual([0, 0, 0])
  })

  it('acumulados y asignados: una copia propia del acumulado de cada producción y los trabajadores por edificio (TC7)', () => {
    const estado = ejemplo()
    const ctx = crearContexto(estado, HASTA, opciones())
    // La cantera tiene dos producciones (piedra y arcilla); sus acumulados son copias, no las del estado.
    const cantera = estado.edificios.find((e) => e.producciones.length === 2)
    if (cantera === undefined) {
      throw new Error('El ejemplo debe tener un edificio con dos producciones')
    }
    for (const produccion of cantera.producciones) {
      expect(ctx.acumulados.get(produccion.id)).toEqual(produccion.acumulado)
      expect(ctx.acumulados.get(produccion.id)).not.toBe(produccion.acumulado)
    }
    // Dos canteros de tres necesarios (§6.3, A5): asignadosPorEdificio ya lo comprueba en almacen/produccion.test.ts.
    expect(ctx.asignados.get(cantera.id)).toBe(2)
  })
```

En el mismo archivo, dentro de `describe('estadoFinal', …)`, sustituye este bloque (la prueba «pone la fecha actual en hasta…»):

```ts
  it('pone la fecha actual en hasta, lleva lo que escribió el motor y comparte el resto con la entrada', () => {
    const estado = ejemplo()
    const ctx = crearContexto(estado, HASTA, opciones())
    anadirMovimiento(ctx, {
      dominioId: DOM.bree,
      fecha: HASTA,
      tipo: 'ingreso',
      importe: { base: 210000 },
      categoriaId: CATEGORIA.impuestos,
      concepto: 'Peaje del camino · 7 días',
    })
    const final = estadoFinal(ctx)
    expect(final.partida).toEqual({ ...estado.partida, fechaActual: HASTA })
    expect(final.movimientos).toBe(ctx.movimientos)
    expect(final.movimientos).toHaveLength(estado.movimientos.length + 1)
    const escritas = ['partida', 'movimientos', 'deudas', 'personas', 'localesComerciales', 'caravanas', 'objetos']
    for (const clave of Object.keys(estado) as (keyof EstadoPartida)[]) {
      if (!escritas.includes(clave)) {
        expect(final[clave]).toBe(estado[clave])
      }
    }
    expect(EsquemaEstadoPartida.safeParse(final).success).toBe(true)
  })
```

por este otro:

```ts
  it('pone la fecha actual en hasta, lleva lo que escribió el motor y comparte el resto con la entrada', () => {
    const estado = ejemplo()
    const ctx = crearContexto(estado, HASTA, opciones())
    anadirMovimiento(ctx, {
      dominioId: DOM.bree,
      fecha: HASTA,
      tipo: 'ingreso',
      importe: { base: 210000 },
      categoriaId: CATEGORIA.impuestos,
      concepto: 'Peaje del camino · 7 días',
    })
    const final = estadoFinal(ctx)
    expect(final.partida).toEqual({ ...estado.partida, fechaActual: HASTA })
    expect(final.movimientos).toBe(ctx.movimientos)
    expect(final.movimientos).toHaveLength(estado.movimientos.length + 1)
    const escritas = [
      'partida',
      'movimientos',
      'deudas',
      'personas',
      'localesComerciales',
      'caravanas',
      'objetos',
      'existencias',
      'edificios',
      'obras',
      'defensas',
      'entradasAlmacen',
      'produccionesRealizadas',
    ]
    for (const clave of Object.keys(estado) as (keyof EstadoPartida)[]) {
      if (!escritas.includes(clave)) {
        expect(final[clave]).toBe(estado[clave])
      }
    }
    expect(final.existencias).toEqual(estado.existencias)
    expect(final.obras).toBe(ctx.obras)
    expect(final.defensas).toBe(ctx.defensas)
    expect(final.entradasAlmacen).toBe(ctx.entradasAlmacen)
    expect(final.produccionesRealizadas).toBe(ctx.produccionesRealizadas)
    expect(EsquemaEstadoPartida.safeParse(final).success).toBe(true)
  })

  it('vuelca en cada edificio el acumulado vivo de ctx.acumulados, no el de la entrada (TC7)', () => {
    const estado = ejemplo()
    const ctx = crearContexto(estado, HASTA, opciones())
    const cantera = estado.edificios.find((e) => e.producciones.length === 2)
    if (cantera === undefined) {
      throw new Error('El ejemplo debe tener un edificio con dos producciones')
    }
    const piedra = cantera.producciones[0]
    ctx.acumulados.set(piedra.id, { desde: { anio: 1640, mes: 4, dia: 20 }, sumaFactores: 99 })
    const final = estadoFinal(ctx)
    const edificioFinal = final.edificios.find((e) => e.id === cantera.id)
    const produccionFinal = edificioFinal?.producciones.find((p) => p.id === piedra.id)
    expect(produccionFinal?.acumulado).toEqual({ desde: { anio: 1640, mes: 4, dia: 20 }, sumaFactores: 99 })
    // El resto del edificio (fuera del acumulado que cambió) no se toca.
    expect(edificioFinal?.nombre).toBe(cantera.nombre)
  })
```

En `src/dominio/motor/caja.test.ts`, cambia la línea de import de `./caja`:

```ts
import { cobrar, pagarHasta } from './caja'
```

por:

```ts
import { cobrar, pagarEntero, pagarHasta, pagoProgramado } from './caja'
```

Justo antes de `describe('cobrar', …)`, añade esta función:

```ts
/** El mismo contexto, con un gasto programado de 4,5 mo (obra) y uno ya aplicado, para pagoProgramado (T8). */
function contextoConProgramados(): Contexto {
  const conBree = conAsentamiento(estadoMinimo(), { id: 'dom.bree', nombre: 'Bree', caja: 300000 })
  const estado = congelar({
    ...conBree,
    movimientos: [
      {
        id: 'mov.obraProgramada',
        dominioId: 'dom.bree',
        fecha: { anio: 1640, mes: 4, dia: 15 },
        tipo: 'gasto' as const,
        importe: { base: -4500000 },
        categoriaId: CATEGORIA.obras,
        concepto: 'Obra: ampliar la cervecería',
        origen: 'avance' as const,
        avanceId: 'av.anterior',
        programado: true,
        vinculo: { tipo: 'obra' as const, id: 'obra.cerveceria' },
      },
      {
        id: 'mov.yaAplicado',
        dominioId: 'dom.bree',
        fecha: { anio: 1640, mes: 4, dia: 10 },
        tipo: 'gasto' as const,
        importe: { base: -100000 },
        categoriaId: CATEGORIA.otros,
        concepto: 'Ya se pagó',
        origen: 'avance' as const,
        avanceId: 'av.anterior',
        programado: false,
      },
    ],
  })
  return crearContexto(estado, HASTA, { avanceId: 'av.prueba', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() })
}
```

Añade al final de `src/dominio/motor/caja.test.ts`, después del último `})` y separado por una línea en blanco, este bloque:

```ts

describe('pagarEntero', () => {
  it('si la caja llega, paga entero y devuelve true (TC8; D-045)', () => {
    const ctx = contexto()
    expect(pagarEntero(ctx, 'dom.bree', 180000)).toBe(true)
    expect(ctx.saldos.get('dom.bree')).toBe(120000)
  })

  it('si no llega, no toca nada y devuelve false: ni pagos a medias ni impagos (D-045)', () => {
    const ctx = contexto()
    expect(pagarEntero(ctx, 'dom.bree', 420000)).toBe(false)
    expect(ctx.saldos.get('dom.bree')).toBe(300000)
  })

  it('con 0 siempre da true, aunque la caja esté en negativo', () => {
    const ctx = contexto()
    expect(pagarEntero(ctx, 'dom.tharan', 0)).toBe(true)
    expect(ctx.saldos.get('dom.tharan')).toBe(-60000)
  })
})

describe('pagoProgramado', () => {
  it('la magnitud en mh del movimiento programado, en positivo', () => {
    const ctx = contextoConProgramados()
    expect(pagoProgramado(ctx, 'mov.obraProgramada')).toBe(4500000)
  })

  it('0 sin id, con un id que no existe o con un movimiento que ya no está programado', () => {
    const ctx = contextoConProgramados()
    expect(pagoProgramado(ctx, undefined)).toBe(0)
    expect(pagoProgramado(ctx, 'mov.inventado')).toBe(0)
    expect(pagoProgramado(ctx, 'mov.yaAplicado')).toBe(0)
  })
})
```

Crea `src/dominio/motor/almacen.test.ts` con este contenido exacto:

```ts
import { describe, expect, it } from 'vitest'
import { RECURSO } from '../catalogo/inicial'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Existencia } from '../modelo/almacen'
import { consumirDelAlmacen, filaEn, flujoDe, hayDeTodo, sacarDelAlmacen, sumarAlAlmacen } from './almacen'
import { crearContexto, type Contexto } from './contexto'
import { idsEnSerie } from './ids'
import { conAsentamiento, conFila, congelar, diaDe, estadoMinimo } from './pruebas/constructores'

const HOY = { anio: 1640, mes: 4, dia: 12 }
const DIA = diaDe({ anio: 1640, mes: 4, dia: 13 }, true)

/** Bree con las filas del almacén que se le pidan (§6.3, A8). */
function contexto(filas: readonly Omit<Existencia, 'dominioId'>[] = []): Contexto {
  let estado = conAsentamiento(estadoMinimo(HOY), { id: 'dom.bree', nombre: 'Bree', caja: 0 })
  for (const fila of filas) {
    estado = conFila(estado, { ...fila, dominioId: 'dom.bree' })
  }
  return crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 19 }, {
    avanceId: 'av.prueba',
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
}

describe('filaEn', () => {
  it('la fila viva; undefined si el almacén no la tiene', () => {
    const ctx = contexto([{ recursoId: RECURSO.viveres, cantidad: 310, capacidad: 1200 }])
    expect(filaEn(ctx, 'dom.bree', RECURSO.viveres)).toEqual({
      dominioId: 'dom.bree',
      recursoId: RECURSO.viveres,
      cantidad: 310,
      capacidad: 1200,
    })
    expect(filaEn(ctx, 'dom.bree', RECURSO.hierro)).toBeUndefined()
  })
})

describe('flujoDe', () => {
  it('crea el flujo la primera vez, con la cantidad de la fila, y devuelve el mismo objeto después', () => {
    const ctx = contexto([{ recursoId: RECURSO.lana, cantidad: 35 }])
    const flujo1 = flujoDe(ctx, DIA, 'dom.bree', RECURSO.lana)
    expect(flujo1).toEqual({
      dominioId: 'dom.bree',
      recursoId: RECURSO.lana,
      fecha: DIA.fecha,
      entradas: 0,
      perdido: 0,
      consumido: 0,
      sacado: 0,
      consumoTeorico: 0,
      cantidad: 35,
    })
    expect(ctx.flujos).toHaveLength(1)
    const flujo2 = flujoDe(ctx, DIA, 'dom.bree', RECURSO.lana)
    expect(flujo2).toBe(flujo1)
    expect(ctx.flujos).toHaveLength(1)
  })

  it('un día distinto crea un flujo distinto para la misma fila (un flujo por día y fila)', () => {
    const ctx = contexto([{ recursoId: RECURSO.lana, cantidad: 35 }])
    flujoDe(ctx, DIA, 'dom.bree', RECURSO.lana)
    const otroDia = diaDe({ anio: 1640, mes: 4, dia: 14 })
    flujoDe(ctx, otroDia, 'dom.bree', RECURSO.lana)
    expect(ctx.flujos).toHaveLength(2)
  })

  it('sin fila, el flujo nace con cantidad 0', () => {
    const ctx = contexto([])
    expect(flujoDe(ctx, DIA, 'dom.bree', RECURSO.hierro).cantidad).toBe(0)
  })
})

describe('sumarAlAlmacen', () => {
  it('con capacidad: lo que no cabe se pierde y la fila queda en la capacidad exacta (lana 95/100 + 12)', () => {
    const ctx = contexto([{ recursoId: RECURSO.lana, cantidad: 95, capacidad: 100 }])
    expect(sumarAlAlmacen(ctx, DIA, 'dom.bree', RECURSO.lana, 12)).toEqual({ entra: 5, perdida: 7 })
    expect(filaEn(ctx, 'dom.bree', RECURSO.lana)?.cantidad).toBe(100)
    expect(flujoDe(ctx, DIA, 'dom.bree', RECURSO.lana)).toMatchObject({ entradas: 5, perdido: 7, cantidad: 100 })
  })

  it('todo perdido si la fila ya está llena', () => {
    const ctx = contexto([{ recursoId: RECURSO.lana, cantidad: 100, capacidad: 100 }])
    expect(sumarAlAlmacen(ctx, DIA, 'dom.bree', RECURSO.lana, 12)).toEqual({ entra: 0, perdida: 12 })
    expect(filaEn(ctx, 'dom.bree', RECURSO.lana)?.cantidad).toBe(100)
  })

  it('sin capacidad no hay límite: entra todo y no se pierde nada', () => {
    const ctx = contexto([{ recursoId: RECURSO.piedra, cantidad: 180 }])
    expect(sumarAlAlmacen(ctx, DIA, 'dom.bree', RECURSO.piedra, 1000)).toEqual({ entra: 1000, perdida: 0 })
    expect(filaEn(ctx, 'dom.bree', RECURSO.piedra)?.cantidad).toBe(1180)
  })

  it('crea la fila si falta, a 0 y sin capacidad (TC10)', () => {
    const ctx = contexto([])
    expect(filaEn(ctx, 'dom.bree', RECURSO.hierro)).toBeUndefined()
    expect(sumarAlAlmacen(ctx, DIA, 'dom.bree', RECURSO.hierro, 20)).toEqual({ entra: 20, perdida: 0 })
    expect(filaEn(ctx, 'dom.bree', RECURSO.hierro)).toEqual({ dominioId: 'dom.bree', recursoId: RECURSO.hierro, cantidad: 20 })
    expect('capacidad' in (filaEn(ctx, 'dom.bree', RECURSO.hierro) ?? {})).toBe(false)
  })
})

describe('consumirDelAlmacen', () => {
  it('sirve lo que haya y para en 0; anota consumoTeorico y consumido', () => {
    const ctx = contexto([{ recursoId: RECURSO.viveres, cantidad: 10 }])
    expect(consumirDelAlmacen(ctx, DIA, 'dom.bree', RECURSO.viveres, 15)).toBe(10)
    expect(filaEn(ctx, 'dom.bree', RECURSO.viveres)?.cantidad).toBe(0)
    expect(flujoDe(ctx, DIA, 'dom.bree', RECURSO.viveres)).toMatchObject({ consumoTeorico: 15, consumido: 10 })
  })

  it('un resto por debajo de TOLERANCIA cuenta servido entero (TC1)', () => {
    const ctx = contexto([{ recursoId: RECURSO.viveres, cantidad: 10 - 1e-13 }])
    expect(consumirDelAlmacen(ctx, DIA, 'dom.bree', RECURSO.viveres, 10)).toBe(10)
    expect(filaEn(ctx, 'dom.bree', RECURSO.viveres)?.cantidad).toBe(0)
  })

  it('sobre una fila que no existe hay 0 y el consumo cuenta como falta entera, sin crearla (TC10)', () => {
    const ctx = contexto([])
    expect(consumirDelAlmacen(ctx, DIA, 'dom.bree', RECURSO.cerveza, 5)).toBe(0)
    expect(filaEn(ctx, 'dom.bree', RECURSO.cerveza)).toBeUndefined()
    expect(flujoDe(ctx, DIA, 'dom.bree', RECURSO.cerveza)).toMatchObject({ consumoTeorico: 5, consumido: 0 })
  })
})

describe('sacarDelAlmacen', () => {
  it('saca entero si hay bastante y anota sacado', () => {
    const ctx = contexto([{ recursoId: RECURSO.madera, cantidad: 360 }])
    expect(sacarDelAlmacen(ctx, DIA, 'dom.bree', RECURSO.madera, 40)).toBe(true)
    expect(filaEn(ctx, 'dom.bree', RECURSO.madera)?.cantidad).toBe(320)
    expect(flujoDe(ctx, DIA, 'dom.bree', RECURSO.madera).sacado).toBe(40)
  })

  it('si no hay bastante, no saca nada y devuelve false', () => {
    const ctx = contexto([{ recursoId: RECURSO.madera, cantidad: 10 }])
    expect(sacarDelAlmacen(ctx, DIA, 'dom.bree', RECURSO.madera, 40)).toBe(false)
    expect(filaEn(ctx, 'dom.bree', RECURSO.madera)?.cantidad).toBe(10)
  })
})

describe('hayDeTodo', () => {
  it('true si hay de cada recurso al menos lo pedido, con tolerancia', () => {
    const ctx = contexto([
      { recursoId: RECURSO.madera, cantidad: 40 },
      { recursoId: RECURSO.piedra, cantidad: 20 },
    ])
    expect(hayDeTodo(ctx, 'dom.bree', { [RECURSO.madera]: 40, [RECURSO.piedra]: 20 })).toBe(true)
    expect(hayDeTodo(ctx, 'dom.bree', { [RECURSO.madera]: 40.0000001 })).toBe(true)
  })

  it('false si a alguno le falta, o si su fila no existe', () => {
    const ctx = contexto([{ recursoId: RECURSO.madera, cantidad: 40 }])
    expect(hayDeTodo(ctx, 'dom.bree', { [RECURSO.madera]: 41 })).toBe(false)
    expect(hayDeTodo(ctx, 'dom.bree', { [RECURSO.hierro]: 1 })).toBe(false)
  })
})
```

En `src/dominio/motor/pruebas/constructores.test.ts`, cambia la línea de import de `./constructores`:

```ts
import { conAsentamiento, congelar, estadoMinimo } from './constructores'
```

por estas tres líneas (añade también el import de `aNumeroDeDia`, que el archivo todavía no usa):

```ts
import { aNumeroDeDia } from '../../calendario/fecha'
import { crearContexto } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, conFila, congelar, diaDe, estadoMinimo, recorrerPasos } from './constructores'
```

(la línea `import { aNumeroDeDia } from '../../calendario/fecha'` va justo debajo de `import { describe, expect, it } from 'vitest'`, antes de `import { RECURSO } from '../../catalogo/inicial'`, para mantener el orden alfabético de los imports).

Añade al final de `src/dominio/motor/pruebas/constructores.test.ts`, después del último `})` y separado por una línea en blanco, este bloque:

```ts

describe('conFila', () => {
  it('añade la fila si no estaba, y la sustituye entera si ya estaba (mismo dominio y recurso)', () => {
    const conBree = conAsentamiento(estadoMinimo(), { id: 'dom.bree', nombre: 'Bree', caja: 0 })
    const conMadera = conFila(conBree, { dominioId: 'dom.bree', recursoId: RECURSO.madera, cantidad: 420, capacidad: 600 })
    expect(conMadera.existencias).toEqual([
      { dominioId: 'dom.bree', recursoId: RECURSO.viveres, cantidad: 0 },
      { dominioId: 'dom.bree', recursoId: RECURSO.madera, cantidad: 420, capacidad: 600 },
    ])
    const sustituida = conFila(conMadera, { dominioId: 'dom.bree', recursoId: RECURSO.viveres, cantidad: 90 })
    expect(sustituida.existencias).toEqual([
      { dominioId: 'dom.bree', recursoId: RECURSO.viveres, cantidad: 90 },
      { dominioId: 'dom.bree', recursoId: RECURSO.madera, cantidad: 420, capacidad: 600 },
    ])
    expect(conBree.existencias).toHaveLength(1)
  })
})

describe('diaDe', () => {
  it('un Dia con numero = aNumeroDeDia(fecha), sin eventos, y primero solo si se pide', () => {
    const fecha = { anio: 1640, mes: 4, dia: 12 }
    expect(diaDe(fecha)).toEqual({ fecha, numero: aNumeroDeDia(fecha), primero: false, eventos: [] })
    expect(diaDe(fecha, true)).toEqual({ fecha, numero: aNumeroDeDia(fecha), primero: true, eventos: [] })
  })
})

describe('recorrerPasos', () => {
  it('llama a cada paso una vez por día, en orden, desde ctx.primerDia', () => {
    const estado = congelar(estadoMinimo())
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 15 }, {
      avanceId: 'av.prueba',
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    const vistos: Array<{ numero: number; primero: boolean; paso: string }> = []
    recorrerPasos(ctx, 3, [
      (_ctx, dia) => vistos.push({ numero: dia.numero, primero: dia.primero, paso: 'a' }),
      (_ctx, dia) => vistos.push({ numero: dia.numero, primero: dia.primero, paso: 'b' }),
    ])
    expect(vistos).toEqual([
      { numero: aNumeroDeDia({ anio: 1640, mes: 4, dia: 13 }), primero: true, paso: 'a' },
      { numero: aNumeroDeDia({ anio: 1640, mes: 4, dia: 13 }), primero: true, paso: 'b' },
      { numero: aNumeroDeDia({ anio: 1640, mes: 4, dia: 14 }), primero: false, paso: 'a' },
      { numero: aNumeroDeDia({ anio: 1640, mes: 4, dia: 14 }), primero: false, paso: 'b' },
      { numero: aNumeroDeDia({ anio: 1640, mes: 4, dia: 15 }), primero: false, paso: 'a' },
      { numero: aNumeroDeDia({ anio: 1640, mes: 4, dia: 15 }), primero: false, paso: 'b' },
    ])
  })
})
```

- [ ] **Paso 2: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/motor/contexto.test.ts src/dominio/motor/caja.test.ts src/dominio/motor/almacen.test.ts src/dominio/motor/pruebas/constructores.test.ts
```

Fallo esperado: `almacen.test.ts` no encuentra el módulo `./almacen` (todavía no existe); las pruebas nuevas de `caja.test.ts` y `constructores.test.ts` fallan porque `pagarEntero`, `pagoProgramado`, `conFila`, `diaDe` y `recorrerPasos` no existen; las de `contexto.test.ts` fallan porque `ctx.edificios`, `ctx.obras`, etc. son `undefined`. 25 pruebas nuevas fallan (las que ya había siguen pasando). La hora, la duración y los objetos completos de la comparación pueden variar; aquí se resume (los volcados largos de `toEqual` se han recortado con `…`):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/almacen.test.ts (0 test)
 ❯ src/dominio/motor/caja.test.ts (10 tests | 5 failed) 19ms
   ❯ pagarEntero (3)
     × si la caja llega, paga entero y devuelve true (TC8; D-045) 5ms
     × si no llega, no toca nada y devuelve false: ni pagos a medias ni impagos (D-045) 1ms
     × con 0 siempre da true, aunque la caja esté en negativo 1ms
   ❯ pagoProgramado (2)
     × la magnitud en mh del movimiento programado, en positivo 1ms
     × 0 sin id, con un id que no existe o con un movimiento que ya no está programado 1ms
 ❯ src/dominio/motor/contexto.test.ts (9 tests | 4 failed) 33ms
   ❯ crearContexto (4)
     × copia las colecciones que escribe el motor y empieza sin nada sumado (T29) 9ms
     × acumulados y asignados: una copia propia del acumulado de cada producción y los trabajadores por edificio (TC7) 2ms
   ❯ estadoFinal (3)
     × pone la fecha actual en hasta, lleva lo que escribió el motor y comparte el resto con la entrada 5ms
     × vuelca en cada edificio el acumulado vivo de ctx.acumulados, no el de la entrada (TC7) 2ms
 ❯ src/dominio/motor/pruebas/constructores.test.ts (6 tests | 3 failed) 19ms
   ❯ conFila (1)
     × añade la fila si no estaba, y la sustituye entera si ya estaba (mismo dominio y recurso) 3ms
   ❯ diaDe (1)
     × un Dia con numero = aNumeroDeDia(fecha), sin eventos, y primero solo si se pide 0ms
   ❯ recorrerPasos (1)
     × llama a cada paso una vez por día, en orden, desde ctx.primerDia 1ms

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/almacen.test.ts [ src/dominio/motor/almacen.test.ts ]
Error: Cannot find module './almacen' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/almacen.test.ts
 ❯ src/dominio/motor/almacen.test.ts:5:1

⎯⎯⎯⎯⎯⎯ Failed Tests 12 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/caja.test.ts > pagarEntero > si la caja llega, paga entero y devuelve true (TC8; D-045)
TypeError: pagarEntero is not a function
 ❯ src/dominio/motor/caja.test.ts:113:12

 FAIL  src/dominio/motor/contexto.test.ts > crearContexto > copia las colecciones que escribe el motor y empieza sin nada sumado (T29)
AssertionError: expected undefined to deeply equal [ …(6) ]
 ❯ src/dominio/motor/contexto.test.ts:73:24
    73|     expect(ctx.edificios).toEqual(estado.edificios)
       |                          ^

 FAIL  src/dominio/motor/pruebas/constructores.test.ts > recorrerPasos > llama a cada paso una vez por día, en orden, desde ctx.primerDia
TypeError: recorrerPasos is not a function
 ❯ src/dominio/motor/pruebas/constructores.test.ts:99:5

(las otras 8 fallan igual: «pagoProgramado is not a function», «conFila is not a function», «diaDe is not a function», y en contexto.test.ts sendos AssertionError de propiedades undefined; se omiten aquí por brevedad)

 Test Files  4 failed (4)
      Tests  12 failed | 13 passed (25)
   Start at  20:40:51
   Duration  1.36s (transform 53%, import 42%, tests 3%, worker 2%)
```

- [ ] **Paso 3: Cambiar `motor/tipos.ts`**

Sustituye este bloque (los imports del principio del archivo):

```ts
import type { Fecha } from '../calendario/fecha'
import type { AvisoAvance, CambioAvance } from '../modelo/avance'
import type { CatalogosEnCopia, PersonaEntidad } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { OrigenImpago } from '../modelo/deudas'
import type { EstadoPartida } from '../modelo/documento'
```

por este otro:

```ts
import type { Fecha } from '../calendario/fecha'
import type { AvisoAvance, CambioAvance } from '../modelo/avance'
import type { CatalogosEnCopia, PersonaEntidad } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { OrigenImpago } from '../modelo/deudas'
import type { EstadoPartida } from '../modelo/documento'

/** Lo que pasó un día en una fila del almacén (TC2). Lo anotan los pasos 3, 4, 5 y 7. */
export interface FlujoAlmacen {
  dominioId: Id
  recursoId: Id
  fecha: Fecha
  /** Producción, llegadas y entradas que entraron de verdad, sin lo perdido. */
  entradas: number
  /** Lo que no cupo por capacidad (§7 l.1107). */
  perdido: number
  /** Consumo de la población servido. */
  consumido: number
  /** Materiales de obras y carga de caravanas que salieron. */
  sacado: number
  /** Consumo de la población que tocaba, con eventos; falta = consumoTeorico − consumido. */
  consumoTeorico: number
  /** Existencias tras lo último que tocó la fila ese día. */
  cantidad: number
}
```

Sustituye este bloque (la unión `Suceso`, en su última línea):

```ts
  | { tipo: 'cobroLocales'; dominioId: Id; fecha: Fecha }
  | { tipo: 'vueltaCaravana'; dominioId: Id; fecha: Fecha; mercadoId: Id }
```

por:

```ts
  | { tipo: 'cobroLocales'; dominioId: Id; fecha: Fecha }
  | { tipo: 'vueltaCaravana'; dominioId: Id; fecha: Fecha; mercadoId: Id }
  | { tipo: 'obraTerminada'; dominioId: Id; fecha: Fecha; nombre: string }
  | { tipo: 'llegadaTraslado'; dominioId: Id; fecha: Fecha; destinoId: Id }
```

Sustituye este bloque (el final de `ResultadoSimulacion`):

```ts
  /** P4: «Se añadirá «Trabajadores de Bree» a Personas y entidades» (§9 l.1295). */
  personasNuevas: PersonaEntidad[]
}
```

por:

```ts
  /** P4: «Se añadirá «Trabajadores de Bree» a Personas y entidades» (§9 l.1295). */
  personasNuevas: PersonaEntidad[]
  /** Lo que pasó cada día en cada fila del almacén: P4, A8 y los avisos de lo ocurrido (TC2). */
  flujos: FlujoAlmacen[]
}
```

- [ ] **Paso 4: Sustituir `motor/contexto.ts` entero**

Los campos nuevos de `Contexto` y de `crearContexto`/`estadoFinal` tocan puntos distintos del archivo; sustituye su contenido entero por este:

```ts
import { claveExistencia } from '../almacen/cantidades'
import { asignadosPorEdificio, primerDiaQueCuenta as primerDiaDeRecurrencia } from '../almacen/produccion'
import { aNumeroDeDia, sumarDias, type Fecha } from '../calendario/fecha'
import { saldosPorDominio } from '../dinero/saldo'
import type { EntradaAlmacen, Existencia, ProduccionRealizada } from '../modelo/almacen'
import type { AcumuladoProduccion, Defensa, Edificio, LocalComercial, Obra } from '../modelo/asentamiento'
import type { PersonaEntidad } from '../modelo/catalogos'
import type { Caravana } from '../modelo/comercio'
import type { Id } from '../modelo/comunes'
import type { Deuda } from '../modelo/deudas'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import type { EventoNarrativo } from '../modelo/eventos'
import type { DetalleTrabajo, Movimiento, ReglaOrigen } from '../modelo/movimientos'
import type { ObjetoInventario } from '../modelo/personaje'
import type { FlujoAlmacen, OpcionesSimulacion, Suceso } from './tipos'

/** Un día del recorrido (§9). */
export interface Dia {
  fecha: Fecha
  /** aNumeroDeDia(fecha). */
  numero: number
  /** El primer día recoge lo que ya había vencido (§9 l.1321, T14). */
  primero: boolean
  /** Los eventos de asentamiento activos ese día con algún efecto; lo rellena el paso 1. */
  eventos: EventoNarrativo[]
}

/** Lo que lleva sumado un concepto diario en este avance (§9 l.1285). */
export interface AcumuladoDiario {
  clase: 'regla' | 'salarios' | 'soldadas'
  regla: ReglaOrigen
  dominioId: Id
  tipo: 'gasto' | 'ingreso'
  categoriaId: Id
  /** El de la regla; en salarios y soldadas se arma al cerrar. */
  concepto: string
  unidadDiaria?: string
  /** Un beneficio «Cada día». */
  inversionId?: Id
  /** Magnitud sumada, en mh. */
  importe: number
  /** Días con importe mayor que 0 (D-021). */
  dias: number
  /** El último día contado (aNumeroDeDia): varias filas de salarios del mismo día cuentan un solo día. */
  ultimoDia: number
  /** Salarios y soldadas diarios, por fila (origenId). */
  detalle: Map<Id, DetalleTrabajo>
}

/** Un cargo de impago que abrió un diario en este avance, para sumarle los días siguientes (D-021). */
export interface CargoAbierto {
  deudaId: Id
  indice: number
}

/** Un movimiento que crea el avance, antes de ponerle id, origen, avanceId y programado. */
export type MovimientoDelAvance = Omit<Movimiento, 'id' | 'origen' | 'avanceId' | 'programado'>

/** El estado de trabajo de una simulación: nunca muta lo que recibe (T29). */
export interface Contexto {
  /** El de entrada, solo lectura: reglas, eventos, poblaciones… */
  readonly estado: EstadoPartida
  readonly opciones: OpcionesSimulacion
  readonly primerDia: Fecha
  readonly hasta: Fecha
  /** saldosPorDominio(estado), calculado una sola vez. */
  readonly saldosAntes: Record<Id, number>
  /** Saldo vivo por dominio. */
  readonly saldos: Map<Id, number>
  /** Copia: los de entrada (los programados aplicados, reemplazados) y los nuevos. */
  readonly movimientos: Movimiento[]
  /** Posición de cada movimiento en `movimientos`. */
  readonly indiceMovimiento: Map<Id, number>
  /** Programados sin vínculo por número de día; los de fecha pasada, en el primer día (T14). */
  readonly programadosPorDia: Map<number, Id[]>
  readonly deudas: Deuda[]
  readonly personas: PersonaEntidad[]
  readonly localesComerciales: LocalComercial[]
  readonly caravanas: Caravana[]
  readonly objetos: ObjetoInventario[]
  readonly personasNuevas: PersonaEntidad[]
  readonly sucesos: Suceso[]
  /** Clave `${regla.tipo}|${regla.id}`. */
  readonly diarios: Map<string, AcumuladoDiario>
  readonly cargosDiarios: Map<string, CargoAbierto>
  /** Filas vivas por claveExistencia, en el orden de estado.existencias; las nuevas, al final (TC7). Nunca se mutan: se sustituyen. */
  readonly existencias: Map<string, Existencia>
  /** Copias propias del acumulado de cada producción, por su id (TC7). */
  readonly acumulados: Map<Id, AcumuladoProduccion>
  /** asignadosPorEdificio(estado.trabajadores): no cambian durante un recorrido. */
  readonly asignados: Map<Id, number>
  /** Caché de aNumeroDeDia(primerDiaQueCuenta(r)) por id de producción; −Infinity si no hay límite. */
  readonly primerDiaQueCuenta: Map<Id, number>
  readonly edificios: Edificio[]
  readonly obras: Obra[]
  readonly defensas: Defensa[]
  readonly entradasAlmacen: EntradaAlmacen[]
  readonly produccionesRealizadas: ProduccionRealizada[]
  readonly flujos: FlujoAlmacen[]
  /** Posición en `flujos` por `${dia.numero}|${clave}`. */
  readonly indiceFlujo: Map<string, number>
}

/** El mismo registro sin las claves que valen undefined: así no llegan a IndexedDB ni a la copia. */
function sinClavesVacias<T extends object>(registro: T): T {
  return Object.fromEntries(Object.entries(registro).filter(([, valor]) => valor !== undefined)) as T
}

/** Prepara el contexto: saldos vivos, copias de lo que escribe el motor e índice de programados (§9). */
export function crearContexto(estado: EstadoPartida, hasta: Fecha, opciones: OpcionesSimulacion): Contexto {
  const primerDia = sumarDias(estado.partida.fechaActual, 1)
  const numeroPrimerDia = aNumeroDeDia(primerDia)
  const numeroHasta = aNumeroDeDia(hasta)
  const saldosAntes = saldosPorDominio(estado)
  const movimientos = [...estado.movimientos]
  const indiceMovimiento = new Map<Id, number>()
  const programadosPorDia = new Map<number, Id[]>()
  movimientos.forEach((m, indice) => {
    indiceMovimiento.set(m.id, indice)
    // Los vinculados (obras, caravanas y compras) los aplican sus propios pasos, en la fase 4.
    if (!m.programado || m.vinculo !== undefined) {
      return
    }
    const numero = Math.max(aNumeroDeDia(m.fecha), numeroPrimerDia)
    if (numero > numeroHasta) {
      return
    }
    const delDia = programadosPorDia.get(numero)
    if (delDia === undefined) {
      programadosPorDia.set(numero, [m.id])
    } else {
      delDia.push(m.id)
    }
  })
  const existencias = new Map<string, Existencia>()
  for (const fila of estado.existencias) {
    existencias.set(claveExistencia(fila.dominioId, fila.recursoId), fila)
  }
  const acumulados = new Map<Id, AcumuladoProduccion>()
  const primerDiaQueCuenta = new Map<Id, number>()
  for (const edificio of estado.edificios) {
    for (const produccion of edificio.producciones) {
      acumulados.set(produccion.id, {
        desde: { ...produccion.acumulado.desde },
        sumaFactores: produccion.acumulado.sumaFactores,
      })
      const primero = primerDiaDeRecurrencia(produccion.recurrencia)
      primerDiaQueCuenta.set(produccion.id, primero === null ? -Infinity : aNumeroDeDia(primero))
    }
  }
  return {
    estado,
    opciones,
    primerDia,
    hasta: { ...hasta },
    saldosAntes,
    saldos: new Map(Object.entries(saldosAntes)),
    movimientos,
    indiceMovimiento,
    programadosPorDia,
    deudas: [...estado.deudas],
    personas: [...estado.personas],
    localesComerciales: [...estado.localesComerciales],
    caravanas: [...estado.caravanas],
    objetos: [...estado.objetos],
    personasNuevas: [],
    sucesos: [],
    diarios: new Map(),
    cargosDiarios: new Map(),
    existencias,
    acumulados,
    asignados: asignadosPorEdificio(estado.trabajadores),
    primerDiaQueCuenta,
    edificios: [...estado.edificios],
    obras: [...estado.obras],
    defensas: [...estado.defensas],
    entradasAlmacen: [...estado.entradasAlmacen],
    produccionesRealizadas: [...estado.produccionesRealizadas],
    flujos: [],
    indiceFlujo: new Map(),
  }
}

/** Añade un movimiento del avance (origen «avance», programado false, avanceId) con un id nuevo; no toca saldos. */
export function anadirMovimiento(ctx: Contexto, datos: MovimientoDelAvance): Id {
  const id = ctx.opciones.nuevoId()
  const movimiento = sinClavesVacias<Movimiento>({
    id,
    ...datos,
    origen: 'avance',
    avanceId: ctx.opciones.avanceId,
    programado: false,
  })
  ctx.indiceMovimiento.set(id, ctx.movimientos.length)
  ctx.movimientos.push(movimiento)
  return id
}

/**
 * Aplica un movimiento programado: programado false, avanceId y los cambios que se pasen (§6.4 l.768).
 * Conserva su id y su origen; una clave que llega con undefined en `cambios` se quita.
 */
export function aplicarProgramado(ctx: Contexto, id: Id, cambios: Partial<Movimiento>): void {
  const indice = ctx.indiceMovimiento.get(id)
  if (indice === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  ctx.movimientos[indice] = sinClavesVacias<Movimiento>({
    ...ctx.movimientos[indice],
    ...cambios,
    programado: false,
    avanceId: ctx.opciones.avanceId,
  })
}

/** Un edificio con el acumulado vivo de ctx.acumulados en cada una de sus producciones (TC7). */
function edificioConAcumulados(ctx: Contexto, edificio: Edificio): Edificio {
  return {
    ...edificio,
    producciones: edificio.producciones.map((produccion) => {
      const acumulado = ctx.acumulados.get(produccion.id)
      return acumulado === undefined ? produccion : { ...produccion, acumulado }
    }),
  }
}

/** El EstadoPartida final: fechaActual = hasta, las colecciones escritas y el resto compartido con la entrada. */
export function estadoFinal(ctx: Contexto): EstadoPartida {
  const entrada = estadoDe(ctx.estado)
  return {
    ...entrada,
    partida: { ...entrada.partida, fechaActual: { ...ctx.hasta } },
    movimientos: ctx.movimientos,
    deudas: ctx.deudas,
    personas: ctx.personas,
    localesComerciales: ctx.localesComerciales,
    caravanas: ctx.caravanas,
    objetos: ctx.objetos,
    existencias: [...ctx.existencias.values()],
    edificios: ctx.edificios.map((edificio) => edificioConAcumulados(ctx, edificio)),
    obras: ctx.obras,
    defensas: ctx.defensas,
    entradasAlmacen: ctx.entradasAlmacen,
    produccionesRealizadas: ctx.produccionesRealizadas,
  }
}
```

- [ ] **Paso 5: Cambiar `motor/caja.ts`**

Añade al final de `src/dominio/motor/caja.ts` (después de `pagarHasta`, que no cambia):

```ts

/** Paga entero si el saldo llega y devuelve true; si no, no toca nada y devuelve false (TC8; D-045). Con 0, true. */
export function pagarEntero(ctx: Contexto, dominioId: Id, importe: number): boolean {
  if (importe === 0) {
    return true
  }
  const saldo = saldoDe(ctx, dominioId)
  if (importe > saldo) {
    return false
  }
  ctx.saldos.set(dominioId, saldo - importe)
  return true
}

/** La magnitud en mh del movimiento programado con ese id, o 0 si no hay id, no existe o ya no está programado. */
export function pagoProgramado(ctx: Contexto, movimientoId: Id | undefined): number {
  if (movimientoId === undefined) {
    return 0
  }
  const indice = ctx.indiceMovimiento.get(movimientoId)
  if (indice === undefined) {
    return 0
  }
  const movimiento = ctx.movimientos[indice]
  return movimiento.programado ? Math.abs(movimiento.importe.base) : 0
}
```

(`saldoDe` ya está definida en la parte de arriba del archivo, sin exportar; `pagarEntero` la reutiliza igual que `pagarHasta`.)

- [ ] **Paso 6: Crear `motor/almacen.ts`**

Crea `src/dominio/motor/almacen.ts` con este contenido exacto:

```ts
import { claveExistencia, TOLERANCIA } from '../almacen/cantidades'
import type { Existencia } from '../modelo/almacen'
import type { Id } from '../modelo/comunes'
import type { Contexto, Dia } from './contexto'
import type { FlujoAlmacen } from './tipos'

/** La fila viva; undefined si el almacén no la tiene. */
export function filaEn(ctx: Contexto, dominioId: Id, recursoId: Id): Existencia | undefined {
  return ctx.existencias.get(claveExistencia(dominioId, recursoId))
}

/** El flujo de ese día y fila; lo crea a 0 (cantidad = la de la fila, o 0) la primera vez. */
export function flujoDe(ctx: Contexto, dia: Dia, dominioId: Id, recursoId: Id): FlujoAlmacen {
  const clave = `${dia.numero}|${claveExistencia(dominioId, recursoId)}`
  const indice = ctx.indiceFlujo.get(clave)
  if (indice !== undefined) {
    return ctx.flujos[indice]
  }
  const flujo: FlujoAlmacen = {
    dominioId,
    recursoId,
    fecha: dia.fecha,
    entradas: 0,
    perdido: 0,
    consumido: 0,
    sacado: 0,
    consumoTeorico: 0,
    cantidad: filaEn(ctx, dominioId, recursoId)?.cantidad ?? 0,
  }
  ctx.indiceFlujo.set(clave, ctx.flujos.length)
  ctx.flujos.push(flujo)
  return flujo
}

/**
 * Suma al almacén con la capacidad (§7 l.1107): crea la fila si falta (0, sin capacidad; TC10); lo que pasa de la
 * capacidad se pierde y la fila queda en la capacidad exacta. Anota entradas y perdido. Devuelve lo que entró y lo
 * perdido.
 */
export function sumarAlAlmacen(
  ctx: Contexto,
  dia: Dia,
  dominioId: Id,
  recursoId: Id,
  cantidad: number,
): { entra: number; perdida: number } {
  const clave = claveExistencia(dominioId, recursoId)
  const fila = ctx.existencias.get(clave)
  const actual = fila?.cantidad ?? 0
  const capacidad = fila?.capacidad
  let entra: number
  let perdida: number
  let nueva: number
  if (capacidad === undefined) {
    entra = cantidad
    perdida = 0
    nueva = actual + cantidad
  } else {
    const hueco = Math.max(0, capacidad - actual)
    if (cantidad <= hueco) {
      entra = cantidad
      perdida = 0
      nueva = actual + cantidad
    } else {
      entra = hueco
      perdida = cantidad - hueco
      nueva = capacidad
    }
  }
  ctx.existencias.set(clave, fila === undefined ? { dominioId, recursoId, cantidad: nueva } : { ...fila, cantidad: nueva })
  const flujo = flujoDe(ctx, dia, dominioId, recursoId)
  flujo.entradas += entra
  flujo.perdido += perdida
  flujo.cantidad = nueva
  return { entra, perdida }
}

/**
 * Consumo de la población (§9 l.1297): sirve lo que haya y para en 0; si lo que falta no llega a TOLERANCIA, cuenta
 * servido entero. Anota consumoTeorico y consumido. No crea la fila. Devuelve lo servido. Precondición: pedido > 0.
 */
export function consumirDelAlmacen(ctx: Contexto, dia: Dia, dominioId: Id, recursoId: Id, pedido: number): number {
  const clave = claveExistencia(dominioId, recursoId)
  const fila = ctx.existencias.get(clave)
  const actual = fila?.cantidad ?? 0
  const servido = pedido - actual < TOLERANCIA ? pedido : actual
  let nueva = actual - servido
  if (Math.abs(nueva) < TOLERANCIA) {
    nueva = 0
  }
  if (fila !== undefined) {
    ctx.existencias.set(clave, { ...fila, cantidad: nueva })
  }
  const flujo = flujoDe(ctx, dia, dominioId, recursoId)
  flujo.consumoTeorico += pedido
  flujo.consumido += servido
  flujo.cantidad = nueva
  return servido
}

/** Si hay de cada recurso al menos lo pedido (menos TOLERANCIA). */
export function hayDeTodo(ctx: Contexto, dominioId: Id, cantidades: Readonly<Record<Id, number>>): boolean {
  return Object.entries(cantidades).every(([recursoId, cantidad]) => {
    const disponible = filaEn(ctx, dominioId, recursoId)?.cantidad ?? 0
    return disponible - cantidad > -TOLERANCIA
  })
}

/** Saca entero (materiales o carga) y anota sacado; si no hay bastante, no saca nada y devuelve false. */
export function sacarDelAlmacen(ctx: Contexto, dia: Dia, dominioId: Id, recursoId: Id, cantidad: number): boolean {
  const clave = claveExistencia(dominioId, recursoId)
  const fila = ctx.existencias.get(clave)
  const actual = fila?.cantidad ?? 0
  if (actual - cantidad < -TOLERANCIA) {
    return false
  }
  let nueva = actual - cantidad
  if (Math.abs(nueva) < TOLERANCIA) {
    nueva = 0
  }
  if (fila !== undefined) {
    ctx.existencias.set(clave, { ...fila, cantidad: nueva })
  }
  const flujo = flujoDe(ctx, dia, dominioId, recursoId)
  flujo.sacado += cantidad
  flujo.cantidad = nueva
  return true
}
```

- [ ] **Paso 7: Cambiar `motor/pruebas/constructores.ts`**

Sustituye el bloque de imports del principio del archivo:

```ts
import type { Fecha } from '../../calendario/fecha'
import { RECURSO } from '../../catalogo/inicial'
import { EQUIVALENCIAS_POR_DEFECTO } from '../../dinero/monedas'
import type { Id } from '../../modelo/comunes'
import type { EstadoPartida } from '../../modelo/documento'
import { VERSION_FORMATO } from '../../modelo/partida'
```

por:

```ts
import { claveExistencia } from '../../almacen/cantidades'
import { aNumeroDeDia, desdeNumeroDeDia, type Fecha } from '../../calendario/fecha'
import { RECURSO } from '../../catalogo/inicial'
import { EQUIVALENCIAS_POR_DEFECTO } from '../../dinero/monedas'
import type { Existencia } from '../../modelo/almacen'
import type { Id } from '../../modelo/comunes'
import type { EstadoPartida } from '../../modelo/documento'
import { VERSION_FORMATO } from '../../modelo/partida'
import type { Contexto, Dia } from '../contexto'
```

Añade al final del archivo, después de `congelar` (que no cambia):

```ts

/** El estado con esa fila (la sustituye si ya estaba). */
export function conFila(estado: EstadoPartida, fila: Existencia): EstadoPartida {
  const clave = claveExistencia(fila.dominioId, fila.recursoId)
  const ya = estado.existencias.some((e) => claveExistencia(e.dominioId, e.recursoId) === clave)
  return {
    ...estado,
    existencias: ya
      ? estado.existencias.map((e) => (claveExistencia(e.dominioId, e.recursoId) === clave ? fila : e))
      : [...estado.existencias, fila],
  }
}

/** Un Dia como los de recorrerDias: { fecha, numero: aNumeroDeDia(fecha), primero, eventos: [] }. */
export function diaDe(fecha: Fecha, primero = false): Dia {
  return { fecha, numero: aNumeroDeDia(fecha), primero, eventos: [] }
}

/** Recorre `dias` días desde ctx.primerDia llamando a esos pasos, como recorrerDias pero con los pasos que se elijan. */
export function recorrerPasos(ctx: Contexto, dias: number, pasos: readonly ((ctx: Contexto, dia: Dia) => void)[]): void {
  const primero = aNumeroDeDia(ctx.primerDia)
  for (let numero = primero; numero < primero + dias; numero++) {
    const dia = diaDe(desdeNumeroDeDia(numero), numero === primero)
    for (const paso of pasos) {
      paso(ctx, dia)
    }
  }
}
```

- [ ] **Paso 8: Cambiar `motor/bucle.ts`**

Cambia la línea de import de `./tipos`:

```ts
import type { OpcionesSimulacion, Suceso } from './tipos'
```

por:

```ts
import type { FlujoAlmacen, OpcionesSimulacion, Suceso } from './tipos'
```

Sustituye la interfaz `Recorrido`:

```ts
/** Lo que deja un recorrido, sin cambios ni avisos. */
export interface Recorrido {
  estadoNuevo: EstadoPartida
  saldosAntes: Record<Id, number>
  saldosDespues: Record<Id, number>
  personasNuevas: PersonaEntidad[]
  sucesos: Suceso[]
}
```

por:

```ts
/** Lo que deja un recorrido, sin cambios ni avisos. */
export interface Recorrido {
  estadoNuevo: EstadoPartida
  saldosAntes: Record<Id, number>
  saldosDespues: Record<Id, number>
  personasNuevas: PersonaEntidad[]
  sucesos: Suceso[]
  flujos: FlujoAlmacen[]
}
```

Y el `return` final de `recorrerDias`:

```ts
  cerrarDiarios(ctx)
  return {
    estadoNuevo: estadoFinal(ctx),
    saldosAntes: ctx.saldosAntes,
    saldosDespues: Object.fromEntries(ctx.saldos),
    personasNuevas: ctx.personasNuevas,
    sucesos: ctx.sucesos,
  }
}
```

por:

```ts
  cerrarDiarios(ctx)
  return {
    estadoNuevo: estadoFinal(ctx),
    saldosAntes: ctx.saldosAntes,
    saldosDespues: Object.fromEntries(ctx.saldos),
    personasNuevas: ctx.personasNuevas,
    sucesos: ctx.sucesos,
    flujos: ctx.flujos,
  }
}
```

- [ ] **Paso 9: Cambiar `motor/simular.ts`**

Sustituye el final de la función `simular`:

```ts
    cambios: cambiosDelAvance(entrada, recorrido, opciones.avanceId, sumarDias(desde, 1), hasta),
    avisos: avisosEn(recorrido.estadoNuevo, opciones.catalogo).map(sinFecha),
    personasNuevas: recorrido.personasNuevas,
  }
}
```

por:

```ts
    cambios: cambiosDelAvance(entrada, recorrido, opciones.avanceId, sumarDias(desde, 1), hasta),
    avisos: avisosEn(recorrido.estadoNuevo, opciones.catalogo).map(sinFecha),
    personasNuevas: recorrido.personasNuevas,
    flujos: recorrido.flujos,
  }
}
```

- [ ] **Paso 10: Cambiar `motor/cambios.ts`**

Sustituye este bloque (dentro de `cambiosDelAvance`, el `if`/`else` que arma el texto del hecho):

```ts
    } else if (suceso.tipo === 'cobroLocales') {
      texto = hechoLocalesCobrados(nombre, dia(suceso.fecha))
    } else {
      texto = hechoCaravanaDeVuelta(mercados.get(suceso.mercadoId) ?? suceso.mercadoId, dia(suceso.fecha))
    }
```

por:

```ts
    } else if (suceso.tipo === 'cobroLocales') {
      texto = hechoLocalesCobrados(nombre, dia(suceso.fecha))
    } else if (suceso.tipo === 'vueltaCaravana') {
      texto = hechoCaravanaDeVuelta(mercados.get(suceso.mercadoId) ?? suceso.mercadoId, dia(suceso.fecha))
    } else {
      // obraTerminada y llegadaTraslado: sus hechos los pinta la T15.
      continue
    }
```

Sin este cambio, `cambios.ts` no compila en cuanto `Suceso` gana `obraTerminada` y `llegadaTraslado` (paso 3): TypeScript no dejaría usar `suceso.mercadoId` en el `else`, porque ya no cubre solo `vueltaCaravana`.

- [ ] **Paso 11: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/motor/contexto.test.ts src/dominio/motor/caja.test.ts src/dominio/motor/almacen.test.ts src/dominio/motor/pruebas/constructores.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  4 passed (4)
      Tests  40 passed (40)
   Start at  20:41:11
   Duration  1.87s (transform 50%, import 45%, tests 4%, worker 1%)
```

- [ ] **Paso 12: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada (comprueba en particular que `cambios.ts` compila con los dos sucesos nuevos); `npm run lint` solo escribe su cabecera y sale con código 0; `npm test` añade las 26 pruebas nuevas (25 de las cuatro pruebas más 1 de `pureza.test.ts` por `motor/almacen.ts`) a lo que dejó la tarea 7 (984 pruebas en 84 archivos):

```text
 Test Files  85 passed (85)
      Tests  1010 passed (1010)
```

Si tu recuento de partida al llegar aquí fue distinto de 984/84, la cifra de arriba será la tuya más 26 pruebas y 1 archivo.

- [ ] **Paso 13: Commit**

```bash
git add src/dominio/motor/tipos.ts src/dominio/motor/contexto.ts src/dominio/motor/contexto.test.ts src/dominio/motor/caja.ts src/dominio/motor/caja.test.ts src/dominio/motor/almacen.ts src/dominio/motor/almacen.test.ts src/dominio/motor/bucle.ts src/dominio/motor/simular.ts src/dominio/motor/cambios.ts src/dominio/motor/pruebas/constructores.ts src/dominio/motor/pruebas/constructores.test.ts
git commit -m "feat(motor): contexto, caja y almacen del motor para la fase 4" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía; con `core.autocrlf=true`, `git add` puede avisar `LF will be replaced by CRLF`, inofensivo):

```text
[implementacion/fase-4 e7dcc21] feat(motor): contexto, caja y almacen del motor para la fase 4
 12 files changed, 631 insertions(+), 14 deletions(-)
 create mode 100644 src/dominio/motor/almacen.test.ts
 create mode 100644 src/dominio/motor/almacen.ts
```

**Avisos que esta tarea deja escritos:**

1. `ctx.edificios` conserva el acumulado **original** de cada producción durante todo el recorrido: quien avance la producción (tarea 9) debe escribir en `ctx.acumulados`, nunca mutar `produccion.acumulado` dentro de `ctx.edificios`. `estadoFinal` es quien junta los dos al final, con `edificioConAcumulados`.
2. `ctx.primerDiaQueCuenta` es una caché de solo lectura calculada una vez en `crearContexto`: ninguna tarea posterior debe recalcularla ni escribirla.
3. `motor/almacen.ts` no crea la fila en `consumirDelAlmacen` ni en `sacarDelAlmacen` (TC10): solo `sumarAlAlmacen` crea filas. Un consumo o una salida sobre una fila que no existe cuenta como falta o como «no hay bastante», sin dejar rastro en `ctx.existencias`.
4. `flujoDe` es la única forma de tocar `ctx.flujos`: crea el flujo la primera vez que se toca esa fila ese día y devuelve el mismo objeto las veces siguientes (por eso `sumarAlAlmacen`, `consumirDelAlmacen` y `sacarDelAlmacen` pueden llamarla varias veces sobre la misma fila y día sin duplicar el flujo).
5. `cambios.ts` todavía no pinta hechos para `obraTerminada` ni `llegadaTraslado` (el `continue` del paso 10): eso lo hace la tarea 15, que sustituirá ese mismo bloque.

---

### Tarea 9 · Paso 4: producción (12)

Esta tarea crea `src/dominio/motor/pasos/produccion.ts`, con `pasoProduccion`: el paso 4 del motor. Por cada edificio de `ctx.edificios` que tenga producciones, calcula un factor diario (una vez por edificio); por cada una de sus producciones, primero suma el día al acumulado (si `dia.numero` llega al máximo entre `acumulado.desde` y `ctx.primerDiaQueCuenta`) y después mira si ese día toca la ocurrencia: si toca, calcula la cantidad con el acumulado ya sumado, la mete en el almacén con `sumarAlAlmacen` y, si no sale a cero, empuja una `ProduccionRealizada`; y siempre, si tocaba la ocurrencia, reinicia el acumulado para el día siguiente. La tarea 14 la engancha a `PASOS_DEL_DIA`; hasta entonces se prueba sola, con `recorrerPasos` y `[pasoEventos, pasoProduccion]`.

Depende de las tareas 4 (`pctDeProduccion`), 5 (`factorDiario`, `cantidadDeOcurrencia`, `diasDelPeriodo`) y 8 (`ctx.edificios`, `ctx.acumulados`, `ctx.asignados`, `ctx.primerDiaQueCuenta`, `sumarAlAlmacen`). Parte de lo que dejen las tareas 1 a 8; esta verificación llegó a la tarea 9 con **1.010 pruebas en 85 archivos**. Si tu recuento de partida es otro, sigue con el tuyo: esta tarea suma **12 pruebas** (11 de `produccion.test.ts` más 1 de `pureza.test.ts`) y **1 archivo**.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Reglas de la especificación que implementa:**

- **Cuándo se suma y capacidad** (§7 l.1131-1132). «Cuándo se suma: el día de la ocurrencia, en el paso de producción del motor (sección 9). … Capacidad: lo que no cabe en el almacén se pierde, con aviso ámbar.»
- **Producción, paso a paso** (§9 l.1298-1302). «Cada día simulado suma el factor diario de cada edificio a sus producciones. Los días anteriores al periodo de la primera ocurrencia de una producción cuentan 0 … El día de una ocurrencia calcula la cantidad, la suma al almacén y reinicia el acumulado. … Producir no gasta recursos: solo extracción.»
- **Fórmulas** (§9 l.1316-1317; el orden «primero se suma, después se mira la ocurrencia» es el del contrato §3.8, no está en la especificación palabra por palabra, pero se deduce de que «cada día simulado suma el factor» y «el día de una ocurrencia calcula la cantidad» son la misma frase, en ese orden). «Factor diario de un edificio = estado × mín(1, asignados ÷ necesarios) × máx(0, 1 + suma de los % de los eventos de producción). Cantidad de una ocurrencia = cantidad base × (suma de los factores diarios del periodo ÷ días del periodo).»
- **Producciones a 0** (D-057). «Una producción que sale a 0 (edificio inactivo, dañado, alquilado, sin trabajadores o con un evento de −100 %) no se anota ni se marca. Si produce pero todo se pierde por falta de sitio, sí se anota, con lo perdido.»

**Archivos:**
- Crear: `src/dominio/motor/pasos/produccion.ts`
- Prueba: `src/dominio/motor/pasos/produccion.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/motor/pasos/produccion.test.ts` con este contenido exacto:

```ts
import { describe, expect, it } from 'vitest'
import { aNumeroDeDia } from '../../calendario/fecha'
import { RECURSO } from '../../catalogo/inicial'
import { DOM, PRODUCCION } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import type { Edificio } from '../../modelo/asentamiento'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import { filaEn } from '../almacen'
import { pasoEventos } from '../bucle'
import { crearContexto } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, conFila, congelar, estadoMinimo, recorrerPasos } from '../pruebas/constructores'
import type { OpcionesSimulacion } from '../tipos'
import { pasoProduccion } from './produccion'

function opciones(): OpcionesSimulacion {
  return { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** El ejemplo el 12 de abril, sin avances y congelado. */
function ejemplo(): EstadoPartida {
  return congelar(estadoDe(documentoDeEjemplo()))
}

/** Un asentamiento nuevo con un solo edificio y su producción (§7 l.1120). */
function conEdificio(edificio: Edificio, fechaInicial = { anio: 1640, mes: 4, dia: 1 }): EstadoPartida {
  const base = conAsentamiento(estadoMinimo(fechaInicial), { id: edificio.dominioId, nombre: 'Prueba', caja: 0 })
  return congelar({ ...base, edificios: [edificio] })
}

describe('pasoProduccion', () => {
  it('el 14 de abril entran las cinco producciones semanales del ejemplo, con su ProduccionRealizada', () => {
    const ctx = crearContexto(ejemplo(), { anio: 1640, mes: 4, dia: 14 }, opciones())
    recorrerPasos(ctx, 2, [pasoEventos, pasoProduccion])
    expect(filaEn(ctx, DOM.bree, RECURSO.viveres)?.cantidad).toBeCloseTo(310 + 72, 3)
    expect(filaEn(ctx, DOM.bree, RECURSO.madera)?.cantidad).toBeCloseTo(420 + 35, 3)
    expect(filaEn(ctx, DOM.bree, RECURSO.cerveza)?.cantidad).toBeCloseTo(90 + 20, 3)
    expect(filaEn(ctx, DOM.bree, RECURSO.piedra)?.cantidad).toBeCloseTo(180 + 16.667, 3)
    expect(filaEn(ctx, DOM.bree, RECURSO.lana)?.cantidad).toBeCloseTo(35 + 12, 3)
    const nuevas = ctx.produccionesRealizadas.filter((p) => p.avanceId === 'sim')
    expect(nuevas).toHaveLength(5)
    for (const realizada of nuevas) {
      expect(realizada.fecha).toEqual({ anio: 1640, mes: 4, dia: 14 })
      expect(realizada.perdida).toBe(0)
    }
    for (const id of [
      PRODUCCION.granjasViveres,
      PRODUCCION.aserraderoMadera,
      PRODUCCION.cerveceriaCerveza,
      PRODUCCION.canteraPiedra,
      PRODUCCION.redilLana,
    ]) {
      expect(ctx.acumulados.get(id)).toEqual({ desde: { anio: 1640, mes: 4, dia: 15 }, sumaFactores: 0 })
    }
  })

  it('los días antes de la primera ocurrencia cuentan 0 (primera el 15 de junio: el 30 de abril lleva 15)', () => {
    const estado = conEdificio({
      id: 'ed.mina',
      dominioId: 'dom.mina',
      tipoId: 'tipoed.mina',
      nombre: 'Mina',
      estado: 'activo',
      trabajadoresNecesarios: 0,
      producciones: [
        {
          id: 'prod.mina',
          recursoId: RECURSO.hierro,
          cantidad: 10,
          recurrencia: { tipo: 'cadaNMeses', n: 2, diaMes: 15, primera: { anio: 1640, mes: 6, dia: 15 } },
          acumulado: { desde: { anio: 1640, mes: 4, dia: 2 }, sumaFactores: 0 },
        },
      ],
    })
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 30 }, opciones())
    // primerDiaQueCuenta de «Cada 2 meses · día 15» con primera el 15 de junio es el 16 de abril (T5).
    expect(ctx.primerDiaQueCuenta.get('prod.mina')).toBe(aNumeroDeDia({ anio: 1640, mes: 4, dia: 16 }))
    recorrerPasos(ctx, 29, [pasoEventos, pasoProduccion])
    // Sin necesarios (factor 1), los 15 días del 16 al 30 son los que cuentan: 15 de sumaFactores.
    expect(ctx.acumulados.get('prod.mina')?.sumaFactores).toBe(15)
    expect(ctx.produccionesRealizadas).toHaveLength(0)
  })

  it('con inicio el 1 de julio no suma nada en abril (primerDiaQueCuenta posterior)', () => {
    const estado = conEdificio({
      id: 'ed.mina',
      dominioId: 'dom.mina',
      tipoId: 'tipoed.mina',
      nombre: 'Mina',
      estado: 'activo',
      trabajadoresNecesarios: 0,
      producciones: [
        {
          id: 'prod.mina',
          recursoId: RECURSO.hierro,
          cantidad: 10,
          recurrencia: { tipo: 'mensual', diaMes: 1, inicio: { anio: 1640, mes: 7, dia: 1 } },
          acumulado: { desde: { anio: 1640, mes: 4, dia: 2 }, sumaFactores: 0 },
        },
      ],
    })
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 30 }, opciones())
    recorrerPasos(ctx, 29, [pasoEventos, pasoProduccion])
    expect(ctx.acumulados.get('prod.mina')?.sumaFactores).toBe(0)
  })

  it('alquilado desde hoy: el 14 entran 90 × 4/7 = 51,429 y el 21 nada ni registro', () => {
    const estado = conEdificio(
      {
        id: 'ed.granja',
        dominioId: 'dom.granja',
        tipoId: 'tipoed.granja',
        nombre: 'Granja',
        estado: 'alquilado',
        trabajadoresNecesarios: 0,
        producciones: [
          {
            id: 'prod.granja',
            recursoId: RECURSO.viveres,
            cantidad: 90,
            recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: { anio: 1640, mes: 4, dia: 1 } },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 4 },
          },
        ],
      },
      { anio: 1640, mes: 4, dia: 10 },
    )
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 21 }, opciones())
    recorrerPasos(ctx, 11, [pasoEventos, pasoProduccion])
    // El 14: sumaFactores sigue en 4 (alquilado da factor 0 todos los días) → 90 × 4/7 = 51,429.
    const el14 = ctx.produccionesRealizadas.find((p) => p.fecha.dia === 14)
    expect(el14?.cantidad).toBeCloseTo(51.429, 3)
    // El 21: el acumulado se reinició a 0 el 14, y sigue en 0 (alquilado): produce 0 y no anota registro.
    const el21 = ctx.produccionesRealizadas.find((p) => p.fecha.dia === 21)
    expect(el21).toBeUndefined()
    expect(ctx.produccionesRealizadas).toHaveLength(1)
    expect(filaEn(ctx, 'dom.granja', RECURSO.viveres)?.cantidad).toBeCloseTo(51.429, 3)
  })

  it('capacidad: lana 95/100 + 12 → entra 5, pierde 7, con {cantidad: 5, perdida: 7}', () => {
    const sinFila = conEdificio(
      {
        id: 'ed.redil',
        dominioId: 'dom.redil',
        tipoId: 'tipoed.redil',
        nombre: 'Redil',
        estado: 'activo',
        trabajadoresNecesarios: 0,
        producciones: [
          {
            id: 'prod.lana',
            recursoId: RECURSO.lana,
            cantidad: 12,
            recurrencia: { tipo: 'diaria' },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 14 }, sumaFactores: 0 },
          },
        ],
      },
      { anio: 1640, mes: 4, dia: 13 },
    )
    const estado = conFila(sinFila, { dominioId: 'dom.redil', recursoId: RECURSO.lana, cantidad: 95, capacidad: 100 })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 14 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoProduccion])
    expect(filaEn(ctx, 'dom.redil', RECURSO.lana)?.cantidad).toBe(100)
    const realizada = ctx.produccionesRealizadas.find((p) => p.produccionId === 'prod.lana')
    expect(realizada).toMatchObject({ cantidad: 5, perdida: 7 })
  })

  it('todo perdido: la fila llena da {cantidad: 0, perdida: 12}', () => {
    const sinFila = conEdificio(
      {
        id: 'ed.redil',
        dominioId: 'dom.redil',
        tipoId: 'tipoed.redil',
        nombre: 'Redil',
        estado: 'activo',
        trabajadoresNecesarios: 0,
        producciones: [
          {
            id: 'prod.lana',
            recursoId: RECURSO.lana,
            cantidad: 12,
            recurrencia: { tipo: 'diaria' },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 14 }, sumaFactores: 0 },
          },
        ],
      },
      { anio: 1640, mes: 4, dia: 13 },
    )
    const estado = conFila(sinFila, { dominioId: 'dom.redil', recursoId: RECURSO.lana, cantidad: 100, capacidad: 100 })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 14 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoProduccion])
    const realizada = ctx.produccionesRealizadas.find((p) => p.produccionId === 'prod.lana')
    expect(realizada).toMatchObject({ cantidad: 0, perdida: 12 })
  })

  it('producción 0 no anota registro y el acumulado se reinicia igual (D-057)', () => {
    const estado = conEdificio(
      {
        id: 'ed.mina',
        dominioId: 'dom.mina',
        tipoId: 'tipoed.mina',
        nombre: 'Mina',
        estado: 'inactivo',
        trabajadoresNecesarios: 0,
        producciones: [
          {
            id: 'prod.mina',
            recursoId: RECURSO.hierro,
            cantidad: 10,
            recurrencia: { tipo: 'diaria' },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 14 }, sumaFactores: 0 },
          },
        ],
      },
      { anio: 1640, mes: 4, dia: 13 },
    )
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 14 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoProduccion])
    expect(ctx.produccionesRealizadas).toHaveLength(0)
    expect(ctx.acumulados.get('prod.mina')).toEqual({ desde: { anio: 1640, mes: 4, dia: 15 }, sumaFactores: 0 })
  })

  it('un evento +50 % de producción da 135 en vez de 90', () => {
    const sinEvento = conEdificio(
      {
        id: 'ed.granja',
        dominioId: 'dom.granja',
        tipoId: 'tipoed.granja',
        nombre: 'Granja',
        estado: 'activo',
        trabajadoresNecesarios: 0,
        producciones: [
          {
            id: 'prod.granja',
            recursoId: RECURSO.viveres,
            cantidad: 90,
            recurrencia: { tipo: 'diaria' },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 14 }, sumaFactores: 0 },
          },
        ],
      },
      { anio: 1640, mes: 4, dia: 13 },
    )
    const estado: EstadoPartida = {
      ...sinEvento,
      eventos: [
        {
          id: 'ev.bendicion',
          dominioId: 'dom.granja',
          nombre: 'Bendición de la cosecha',
          inicio: { anio: 1640, mes: 4, dia: 14 },
          duracionDias: 1,
          efectos: [{ ambito: 'produccion', objetivo: { tipo: 'edificio', id: 'ed.granja' }, pct: 50 }],
        },
      ],
    }
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 14 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoProduccion])
    const realizada = ctx.produccionesRealizadas.find((p) => p.produccionId === 'prod.granja')
    expect(realizada?.cantidad).toBeCloseTo(135, 3)
  })

  it('crea la fila de un recurso sin fila (TC10)', () => {
    const estado = conEdificio(
      {
        id: 'ed.mina',
        dominioId: 'dom.mina',
        tipoId: 'tipoed.mina',
        nombre: 'Mina',
        estado: 'activo',
        trabajadoresNecesarios: 0,
        producciones: [
          {
            id: 'prod.mina',
            recursoId: RECURSO.hierro,
            cantidad: 8.333,
            recurrencia: { tipo: 'diaria' },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 14 }, sumaFactores: 0 },
          },
        ],
      },
      { anio: 1640, mes: 4, dia: 13 },
    )
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 14 }, opciones())
    expect(filaEn(ctx, 'dom.mina', RECURSO.hierro)).toBeUndefined()
    recorrerPasos(ctx, 1, [pasoEventos, pasoProduccion])
    expect(filaEn(ctx, 'dom.mina', RECURSO.hierro)?.cantidad).toBeCloseTo(8.333, 3)
  })

  it('la mina de O5: 10 × (15 × 2/3 + 15 × 1) ÷ 30 = 8,333', () => {
    const base = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 1 }), { id: 'dom.mina', nombre: 'Mina', caja: 0 })
    const conDosMineros: EstadoPartida = {
      ...base,
      trabajadores: [
        {
          id: 'trab.mineros',
          dominioId: 'dom.mina',
          oficioId: 'oficio.minero',
          numero: 2,
          salario: { base: 0 },
          recurrencia: { tipo: 'diaria' },
          edificioId: 'ed.mina',
        },
      ],
      edificios: [
        {
          id: 'ed.mina',
          dominioId: 'dom.mina',
          tipoId: 'tipoed.mina',
          nombre: 'Mina',
          estado: 'activo',
          trabajadoresNecesarios: 3,
          producciones: [
            {
              id: 'prod.mina',
              recursoId: RECURSO.hierro,
              cantidad: 10,
              recurrencia: { tipo: 'mensual', diaMes: 1, inicio: { anio: 1640, mes: 4, dia: 1 } },
              acumulado: { desde: { anio: 1640, mes: 4, dia: 2 }, sumaFactores: 0 },
            },
          ],
        },
      ],
    }
    const ctx = crearContexto(congelar(conDosMineros), { anio: 1640, mes: 5, dia: 1 }, opciones())
    // 15 días (2 al 16 de abril) con 2 mineros de 3 (factor 2/3) y, desde el 17, la fila de mineros pasa a 3
    // (factor 1) hasta el 1 de mayo, la ocurrencia: otros 15 días. 15 × 2/3 + 15 × 1 = 25; 10 × 25 ÷ 30 = 8,333.
    recorrerPasos(ctx, 15, [pasoEventos, pasoProduccion])
    ctx.asignados.set('ed.mina', 3)
    recorrerPasos({ ...ctx, primerDia: { anio: 1640, mes: 4, dia: 17 } }, 15, [pasoEventos, pasoProduccion])
    const realizada = ctx.produccionesRealizadas.find((p) => p.produccionId === 'prod.mina')
    expect(realizada?.cantidad).toBeCloseTo(8.333, 3)
  })

  it('el 0,444 de O6: de semanal a «Mensual · día 1» con 2 de 3 y base 10 da 0,444 el 1 de mayo', () => {
    const base = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 29 }), { id: 'dom.mina', nombre: 'Mina', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      trabajadores: [
        {
          id: 'trab.mineros',
          dominioId: 'dom.mina',
          oficioId: 'oficio.minero',
          numero: 2,
          salario: { base: 0 },
          recurrencia: { tipo: 'diaria' },
          edificioId: 'ed.mina',
        },
      ],
      edificios: [
        {
          id: 'ed.mina',
          dominioId: 'dom.mina',
          tipoId: 'tipoed.mina',
          nombre: 'Mina',
          estado: 'activo',
          trabajadoresNecesarios: 3,
          producciones: [
            {
              id: 'prod.mina',
              recursoId: RECURSO.hierro,
              cantidad: 10,
              recurrencia: { tipo: 'mensual', diaMes: 1, inicio: { anio: 1640, mes: 5, dia: 1 } },
              acumulado: { desde: { anio: 1640, mes: 4, dia: 30 }, sumaFactores: 0 },
            },
          ],
        },
      ],
    }
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 5, dia: 1 }, opciones())
    recorrerPasos(ctx, 2, [pasoEventos, pasoProduccion])
    const realizada = ctx.produccionesRealizadas.find((p) => p.produccionId === 'prod.mina')
    expect(realizada?.cantidad).toBeCloseTo(0.444, 3)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/pasos/produccion.test.ts
```

Fallo esperado: el módulo `./produccion` no existe todavía. La hora, la duración y el corte de la línea citada pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/pasos/produccion.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/pasos/produccion.test.ts [ src/dominio/motor/pasos/produccion.test.ts ]
Error: Cannot find module './produccion' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/pasos/produccion.test.ts
 ❯ src/dominio/motor/pasos/produccion.test.ts:14:1
     12| import { conAsentamiento, conFila, congelar, estadoMinimo, recorrerPas…
     13| import type { OpcionesSimulacion } from '../tipos'
     14| import { pasoProduccion } from './produccion'
       | ^
     15|
     16| function opciones(): OpcionesSimulacion {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  20:45:28
   Duration  1.19s (worker 98%, environment 2%)
```

- [ ] **Paso 3: Crear `produccion.ts`**

Crea `src/dominio/motor/pasos/produccion.ts` con este contenido exacto:

```ts
import { esCero } from '../../almacen/cantidades'
import { cantidadDeOcurrencia, diasDelPeriodo, factorDiario } from '../../almacen/produccion'
import { aNumeroDeDia, sumarDias } from '../../calendario/fecha'
import { ocurreEl } from '../../calendario/recurrencia'
import { pctDeProduccion } from '../../eventos/efectos'
import { sumarAlAlmacen } from '../almacen'
import type { Contexto, Dia } from '../contexto'

/**
 * Paso 4 · producción (§7 l.1110-1138; §9 l.1298-1302). Por cada edificio con producciones, un factor diario;
 * por cada producción, primero se suma el día al acumulado y después se mira la ocurrencia: si toca, se produce
 * con el acumulado ya sumado y el acumulado se reinicia para el día siguiente.
 */
export function pasoProduccion(ctx: Contexto, dia: Dia): void {
  for (const edificio of ctx.edificios) {
    if (edificio.producciones.length === 0) {
      continue
    }
    const factor = factorDiario(
      edificio,
      ctx.asignados.get(edificio.id) ?? 0,
      pctDeProduccion(dia.eventos, edificio.dominioId, edificio.id),
    )
    for (const produccion of edificio.producciones) {
      const acumulado = ctx.acumulados.get(produccion.id)
      if (acumulado === undefined) {
        continue
      }
      const primerDia = ctx.primerDiaQueCuenta.get(produccion.id) ?? -Infinity
      const cuenta = dia.numero >= Math.max(aNumeroDeDia(acumulado.desde), primerDia)
      const sumaFactores = cuenta ? acumulado.sumaFactores + factor : acumulado.sumaFactores
      if (!ocurreEl(produccion.recurrencia, dia.fecha)) {
        if (cuenta) {
          ctx.acumulados.set(produccion.id, { desde: acumulado.desde, sumaFactores })
        }
        continue
      }
      const cantidad = cantidadDeOcurrencia(
        produccion.cantidad,
        sumaFactores,
        diasDelPeriodo(produccion.recurrencia, dia.fecha),
      )
      if (!esCero(cantidad)) {
        const { entra, perdida } = sumarAlAlmacen(ctx, dia, edificio.dominioId, produccion.recursoId, cantidad)
        ctx.produccionesRealizadas.push({
          id: ctx.opciones.nuevoId(),
          fecha: dia.fecha,
          edificioId: edificio.id,
          produccionId: produccion.id,
          recursoId: produccion.recursoId,
          cantidad: entra,
          perdida,
          avanceId: ctx.opciones.avanceId,
        })
      }
      ctx.acumulados.set(produccion.id, { desde: sumarDias(dia.fecha, 1), sumaFactores: 0 })
    }
  }
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/pasos/produccion.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  20:45:38
   Duration  1.96s (transform 54%, import 43%, tests 2%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0; `npm test` añade las 11 pruebas de `produccion.test.ts` más 1 de `pureza.test.ts` a lo que dejó la tarea 8 (1.010 pruebas en 85 archivos):

```text
 Test Files  86 passed (86)
      Tests  1022 passed (1022)
```

Si tu recuento de partida al llegar aquí fue distinto de 1.010/85, la cifra de arriba será la tuya más 12 pruebas y 1 archivo.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/pasos/produccion.ts src/dominio/motor/pasos/produccion.test.ts
git commit -m "feat(motor): paso 4, produccion de edificios" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía; con `core.autocrlf=true`, `git add` puede avisar `LF will be replaced by CRLF`, inofensivo):

```text
[implementacion/fase-4 aa51f28] feat(motor): paso 4, produccion de edificios
 2 files changed, 435 insertions(+)
 create mode 100644 src/dominio/motor/pasos/produccion.test.ts
 create mode 100644 src/dominio/motor/pasos/produccion.ts
```

**Avisos que esta tarea deja escritos:**

1. `pasoProduccion` no está todavía en `PASOS_DEL_DIA` (eso lo hace la tarea 14): quien lo pruebe antes de esa tarea debe llamarlo con `recorrerPasos(ctx, dias, [pasoEventos, pasoProduccion])`, como hacen estas pruebas, porque necesita `dia.eventos` relleno por `pasoEventos`.
2. El reinicio del acumulado (`{ desde: día siguiente, sumaFactores: 0 }`) solo ocurre en el día de una ocurrencia (`ocurreEl` true), no todos los días: en un día normal, si `cuenta` es verdad, el acumulado se sustituye con el mismo `desde` y el `sumaFactores` puesto al día, y si no, no se toca. Cambiar esto a «reiniciar siempre» rompería el ejemplo O5 (la mina), donde el propio día de la ocurrencia suma su factor antes de calcular la cantidad.
3. Cuando `edificio.producciones` está vacío (por ejemplo, el molino alquilado del ejemplo, sin producciones declaradas) el bucle interior no hace nada: no hace falta filtrar antes de llamar a `pasoProduccion`.

---

### Tarea 10 · Paso 5: consumo (10)

Esta tarea crea `src/dominio/motor/pasos/consumo.ts`, con `pasoConsumo`: el paso 5 del motor. Por cada población de `ctx.estado.poblaciones`, si tiene habitantes ese día, pide sus víveres (`habitantes ÷ diasPorSaco`, con el efecto de los eventos de consumo sobre víveres) y, después, cada consumo de `poblacion.consumos` en el orden de la lista (D-060), cada uno con su propio efecto de eventos. Un pedido que sale en 0 no llama a `consumirDelAlmacen` (que exige `pedido > 0`). La tarea 14 la engancha a `PASOS_DEL_DIA`; hasta entonces se prueba sola, con `recorrerPasos` y `[pasoEventos, pasoConsumo]`.

Depende de las tareas 4 (`pctDeConsumo`), 3 (`conEfectoCantidad`) y 8 (`ctx.estado.poblaciones`, `habitantesEl` ya existía desde la fase 1, `consumirDelAlmacen`). Parte de lo que dejen las tareas 1 a 9; esta verificación llegó a la tarea 10 con **1.022 pruebas en 86 archivos**. Si tu recuento de partida es otro, sigue con el tuyo: esta tarea suma **10 pruebas** (9 de `consumo.test.ts` más 1 de `pureza.test.ts`) y **1 archivo**.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Reglas de la especificación que implementa:**

- **Consumo de víveres** (§7 l.1094). «Consumo de la población = habitantes ÷ díasPorSaco sacos al día (1/30 ≈ 0,033 sacos por persona). Se calcula con decimales y los sacos se muestran redondeados a la unidad. Bree, con 1.240 habitantes, come unos 41 sacos al día (41,33) y 289 a la semana.»
- **Reservas del almacén y otros consumos** (§7 l.1099-1100). «Aparte de los víveres, el almacén guarda reservas de cerveza, madera, piedra y arcilla, además de otros recursos como hierro o lana. La cerveza y la leña se consumen aparte de los víveres, con una cantidad por habitante al día. Cada consumo tiene un nombre y el recurso del que descuenta: la leña descuenta de la madera.»
- **Falta de recursos** (§9 l.1297). «El consumo se detiene en cero y genera un aviso rojo con el día y la cantidad que faltó.»
- **Orden de servicio** (D-060). «Si dos consumos por habitante descuentan del mismo recurso y no hay para los dos, se sirven en el orden de la lista de A4.»
- **Habitantes** (§7 l.1098). «Habitantes = habitantes iniciales + cambios de población con fecha hasta ese día.»

**Archivos:**
- Crear: `src/dominio/motor/pasos/consumo.ts`
- Prueba: `src/dominio/motor/pasos/consumo.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/motor/pasos/consumo.test.ts` con este contenido exacto:

```ts
import { describe, expect, it } from 'vitest'
import { RECURSO } from '../../catalogo/inicial'
import { DOM } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import { filaEn, flujoDe } from '../almacen'
import { pasoEventos } from '../bucle'
import { crearContexto } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, conFila, congelar, diaDe, estadoMinimo, recorrerPasos } from '../pruebas/constructores'
import type { OpcionesSimulacion } from '../tipos'
import { pasoConsumo } from './consumo'

function opciones(): OpcionesSimulacion {
  return { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** El ejemplo el 12 de abril, sin avances y congelado. */
function ejemplo(): EstadoPartida {
  return congelar(estadoDe(documentoDeEjemplo()))
}

describe('pasoConsumo', () => {
  it('el 13 de abril: víveres 268,667, cerveza 86,28 y madera 410,08 en Bree; víveres 889,667 en Archet', () => {
    const ctx = crearContexto(ejemplo(), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    expect(filaEn(ctx, DOM.bree, RECURSO.viveres)?.cantidad).toBeCloseTo(268.667, 3)
    expect(filaEn(ctx, DOM.bree, RECURSO.cerveza)?.cantidad).toBeCloseTo(86.28, 3)
    expect(filaEn(ctx, DOM.bree, RECURSO.madera)?.cantidad).toBeCloseTo(410.08, 3)
    expect(filaEn(ctx, DOM.archet, RECURSO.viveres)?.cantidad).toBeCloseTo(889.667, 3)
  })

  it('para en 0 y anota consumoTeorico y consumido: lo que falta es consumoTeorico − consumido', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 300,
    })
    const estado = conFila(conAldea, { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 5 })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    // 300 ÷ 30 = 10 al día; solo hay 5: sirve 5 y para en 0.
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBe(0)
    const flujo = flujoDe(ctx, diaDe({ anio: 1640, mes: 4, dia: 13 }), 'dom.aldea', RECURSO.viveres)
    expect(flujo.consumoTeorico).toBeCloseTo(10, 3)
    expect(flujo.consumido).toBe(5)
  })

  it('un cambio de población de +60 el 20 de abril cuenta desde ese día: 1.300 ÷ 30 = 43,333 al día', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 1240,
    })
    const conCambio: EstadoPartida = {
      ...conAldea,
      poblaciones: [
        {
          ...conAldea.poblaciones[0],
          cambios: [{ id: 'camb.mas60', fecha: { anio: 1640, mes: 4, dia: 20 }, delta: 60, motivo: 'Refugiados' }],
        },
      ],
    }
    const estado = conFila(conCambio, { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 100000 })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 20 }, opciones())
    recorrerPasos(ctx, 8, [pasoEventos, pasoConsumo])
    const antes = 100000 - 7 * (1240 / 30) - 43.333333333333336
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBeCloseTo(antes, 2)
  })

  it('un evento de consumo −50 % sobre los víveres reduce el pedido a la mitad', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 300,
    })
    const estado: EstadoPartida = {
      ...conFila(conAldea, { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 1000 }),
      eventos: [
        {
          id: 'ev.escasez',
          dominioId: 'dom.aldea',
          nombre: 'Racionamiento',
          inicio: { anio: 1640, mes: 4, dia: 13 },
          duracionDias: 1,
          efectos: [{ ambito: 'consumo', objetivo: { tipo: 'recurso', id: RECURSO.viveres }, pct: -50 }],
        },
      ],
    }
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    // 300 ÷ 30 = 10, con −50 % da 5.
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBe(995)
  })

  it('un evento de consumo −50 % sobre «todos» también afecta a los víveres', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 300,
    })
    const estado: EstadoPartida = {
      ...conFila(conAldea, { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 1000 }),
      eventos: [
        {
          id: 'ev.abundancia',
          dominioId: 'dom.aldea',
          nombre: 'Buena cosecha',
          inicio: { anio: 1640, mes: 4, dia: 13 },
          duracionDias: 1,
          efectos: [{ ambito: 'consumo', objetivo: { tipo: 'todos' }, pct: -50 }],
        },
      ],
    }
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBe(995)
  })

  it('dos consumos del mismo recurso se sirven en el orden de la lista (D-060)', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 100,
    })
    const conConsumos: EstadoPartida = {
      ...conAldea,
      poblaciones: [
        {
          ...conAldea.poblaciones[0],
          consumos: [
            { id: 'cons.primero', nombre: 'Primero', recursoId: RECURSO.madera, porHabitante: 0.5 },
            { id: 'cons.segundo', nombre: 'Segundo', recursoId: RECURSO.madera, porHabitante: 0.5 },
          ],
        },
      ],
    }
    // Pide 50 (primero) y 50 (segundo); solo hay 70: el primero se sirve entero y el segundo se queda en 20.
    const estado = conFila(conConsumos, { dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 70 })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.madera)?.cantidad).toBe(0)
    // No hay flujo por consumo individual (un solo flujo por fila y día), pero el consumoTeorico suma los dos pedidos.
    const flujo = flujoDe(ctx, diaDe({ anio: 1640, mes: 4, dia: 13 }), 'dom.aldea', RECURSO.madera)
    expect(flujo.consumoTeorico).toBeCloseTo(100, 3)
    expect(flujo.consumido).toBe(70)
  })

  it('sin habitantes no anota ningún flujo', () => {
    const estado = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
    })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    expect(ctx.flujos).toHaveLength(0)
  })

  it('sobre una fila que no existe hay 0 y el consumo cuenta como falta entera, sin crearla', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 100,
    })
    const estado: EstadoPartida = {
      ...conAldea,
      poblaciones: [
        {
          ...conAldea.poblaciones[0],
          consumos: [{ id: 'cons.cerveza', nombre: 'Cerveza', recursoId: RECURSO.cerveza, porHabitante: 0.003 }],
        },
      ],
    }
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.cerveza)).toBeUndefined()
    const flujo = flujoDe(ctx, diaDe({ anio: 1640, mes: 4, dia: 13 }), 'dom.aldea', RECURSO.cerveza)
    expect(flujo.consumido).toBe(0)
    expect(flujo.consumoTeorico).toBeCloseTo(0.3, 3)
  })

  it('un resto por debajo de TOLERANCIA cuenta servido entero (TC1)', () => {
    const conAldea = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), {
      id: 'dom.aldea',
      nombre: 'Aldea',
      caja: 0,
      habitantes: 300,
    })
    // 300 ÷ 30 = 10 al día; la fila tiene 10 menos 1e-13, muy por debajo de la tolerancia (1e-6).
    const estado = conFila(conAldea, { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 10 - 1e-13 })
    const ctx = crearContexto(congelar(estado), { anio: 1640, mes: 4, dia: 13 }, opciones())
    recorrerPasos(ctx, 1, [pasoEventos, pasoConsumo])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBe(0)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/pasos/consumo.test.ts
```

Fallo esperado: el módulo `./consumo` no existe todavía. La hora, la duración y el corte de la línea citada pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/pasos/consumo.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/pasos/consumo.test.ts [ src/dominio/motor/pasos/consumo.test.ts ]
Error: Cannot find module './consumo' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/pasos/consumo.test.ts
 ❯ src/dominio/motor/pasos/consumo.test.ts:12:1
     10| import { conAsentamiento, conFila, congelar, diaDe, estadoMinimo, reco…
     11| import type { OpcionesSimulacion } from '../tipos'
     12| import { pasoConsumo } from './consumo'
       | ^
     13|
     14| function opciones(): OpcionesSimulacion {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  20:47:19
   Duration  1.20s (worker 98%, environment 2%)
```

- [ ] **Paso 3: Crear `consumo.ts`**

Crea `src/dominio/motor/pasos/consumo.ts` con este contenido exacto:

```ts
import { conEfectoCantidad } from '../../almacen/cantidades'
import { RECURSO } from '../../catalogo/inicial'
import { pctDeConsumo } from '../../eventos/efectos'
import { habitantesEl } from '../../poblacion/habitantes'
import { consumirDelAlmacen } from '../almacen'
import type { Contexto, Dia } from '../contexto'

/**
 * Paso 5 · consumo (§7 l.1094, l.1100; §9 l.1277). Víveres, de la ración; después, cada consumo de la población
 * en su orden (D-060). Un pedido de 0 (o sin habitantes) no anota nada.
 */
export function pasoConsumo(ctx: Contexto, dia: Dia): void {
  for (const poblacion of ctx.estado.poblaciones) {
    const habitantes = habitantesEl(poblacion, dia.fecha)
    if (habitantes === 0) {
      continue
    }
    const pctViveres = pctDeConsumo(dia.eventos, poblacion.dominioId, RECURSO.viveres)
    const pedidoViveres = conEfectoCantidad(habitantes / ctx.estado.partida.diasPorSaco, pctViveres)
    if (pedidoViveres > 0) {
      consumirDelAlmacen(ctx, dia, poblacion.dominioId, RECURSO.viveres, pedidoViveres)
    }
    for (const consumo of poblacion.consumos) {
      const pct = pctDeConsumo(dia.eventos, poblacion.dominioId, consumo.recursoId)
      const pedido = conEfectoCantidad(habitantes * consumo.porHabitante, pct)
      if (pedido > 0) {
        consumirDelAlmacen(ctx, dia, poblacion.dominioId, consumo.recursoId, pedido)
      }
    }
  }
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/pasos/consumo.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  20:47:27
   Duration  976ms (transform 64%, import 34%, tests 1%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0; `npm test` añade las 9 pruebas de `consumo.test.ts` más 1 de `pureza.test.ts` a lo que dejó la tarea 9 (1.022 pruebas en 86 archivos):

```text
 Test Files  87 passed (87)
      Tests  1032 passed (1032)
```

Si tu recuento de partida al llegar aquí fue distinto de 1.022/86, la cifra de arriba será la tuya más 10 pruebas y 1 archivo. Con este recuento se cierra el grupo de tareas 6 a 10.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/pasos/consumo.ts src/dominio/motor/pasos/consumo.test.ts
git commit -m "feat(motor): paso 5, consumo de la poblacion" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía; con `core.autocrlf=true`, `git add` puede avisar `LF will be replaced by CRLF`, inofensivo):

```text
[implementacion/fase-4 84d2083] feat(motor): paso 5, consumo de la poblacion
 2 files changed, 233 insertions(+)
 create mode 100644 src/dominio/motor/pasos/consumo.test.ts
 create mode 100644 src/dominio/motor/pasos/consumo.ts
```

**Avisos que esta tarea deja escritos:**

1. `pasoConsumo` no está todavía en `PASOS_DEL_DIA` (eso lo hace la tarea 14): quien lo pruebe antes de esa tarea debe llamarlo con `recorrerPasos(ctx, dias, [pasoEventos, pasoConsumo])`, porque necesita `dia.eventos` relleno por `pasoEventos`.
2. `pasoConsumo` no crea ninguna fila: si el almacén no tiene la fila de un recurso que se consume, `consumirDelAlmacen` cuenta la falta entera y no la crea (TC10). Un aviso de falta previsto o rojo (tarea 17) tiene que contar con eso.
3. Los víveres siempre se piden con `RECURSO.viveres` antes que el resto de `poblacion.consumos`, tal como dice §7 l.1094 y l.1100 y confirma D-060 solo para los consumos por habitante entre sí; víveres nunca compite por orden con los demás porque sale de una ración, no de la lista de consumos.

---

### Tarea 11 · Paso 3: inicio de obras, salida de caravanas y entrada de compras y recepciones (15)

El paso 3 del motor (§9 l.1275) es el único que hace que una obra empiece, una caravana salga o una compra o recepción del almacén entre, cuando su fecha programada ya llegó. Las tres listas se recorren **en este orden** y cada una en el orden de `ctx.obras` / `ctx.caravanas` / `ctx.entradasAlmacen` (así, si el dinero no alcanza para dos obras del mismo día, gana la primera de la lista):

1. **Obras `programada` con `inicio ≤ día`.** Si `hayDeTodo(ctx, obra.dominioId, obra.materiales)` y `pagarEntero(ctx, obra.dominioId, pagoProgramado(ctx, obra.movimientoId))` (D-045: entero o nada; con `movimientoId` sin definir —coste 0— `pagoProgramado` da 0 y `pagarEntero` siempre deja pasar un 0), se saca cada material con `sacarDelAlmacen`, se aplica el movimiento programado con `aplicarProgramado(ctx, obra.movimientoId, { fecha: dia.fecha })` (solo si tiene `movimientoId`) y la obra queda `{ …, estado: 'enCurso', inicio: dia.fecha }`: su `inicio` pasa a ser el día real en que empezó, no el programado (D-044, TC9). Si falta cualquiera de las dos condiciones, no se toca nada: lo reintenta el día siguiente.
2. **Caravanas `programada` con `salida ≤ día`.** Una compra sale si `pagarEntero(ctx, caravana.dominioId, pagoProgramado(ctx, caravana.movimientoSalidaId))`; una venta o un traslado salen si `sacarDelAlmacen(ctx, dia, caravana.dominioId, carga.recursoId, carga.cantidad)` tiene bastante. Si sale, una compra aplica también su `movimientoSalidaId` con `aplicarProgramado`, y la caravana queda `{ …, estado: 'enRuta', salida: dia.fecha, vuelta: sumarDias(caravana.vuelta, diasEntre(caravana.salida, dia.fecha)) }`: el retraso de la salida se suma entero a la vuelta (D-044).
3. **Entradas del almacén con `aplicada: false`, sin `caravanaId` y `fecha ≤ día`.** Una entrada con `caravanaId` la ignora este paso: la marca aplicada el paso 7 cuando llega su caravana (TC18, tarea 13). Una `compra` paga primero con `pagarEntero(ctx, entrada.dominioId, pagoProgramado(ctx, entrada.movimientoId))`; si no alcanza, no hace nada (se reintenta mañana). Si paga (o si es una `recepcion`, que no paga nada), aplica su `movimientoId` si lo tiene, suma al almacén con `sumarAlAlmacen` (con la pérdida por capacidad de siempre, D-053) y queda `{ …, aplicada: true, fecha: dia.fecha }`.

El paso nunca llama a `pagarHasta` ni a `registrarImpago` (TC8): una obra, una caravana o una compra sin dinero simplemente esperan, sin crear una deuda ni un pago a medias.

**Reglas de la especificación que implementa:**

- **D-044.** «Una obra, una caravana o una compra programada que no puede empezar el día señalado (le falta dinero, materiales o carga) lo vuelve a intentar cada día. El día que por fin empieza pasa a ser su inicio o su salida, y su fin o su vuelta se retrasan lo mismo.»
- **D-045.** «El pago de una obra programada, de una caravana de compra programada o de una compra del mercado local con fecha futura se ve en «Programados» desde que la guardas, y el motor lo paga entero o no lo paga: sin pagos a medias ni impagos. (…) Una obra de coste 0 no crea movimiento.»
- **D-046.** «Programar una obra para más adelante no exige tener ya los materiales: se comprueban el día que empieza.» (La tarea 25 exigirá los materiales al pulsar «Empezar obra» con fecha de hoy; aquí basta con que el motor los compruebe cada día.)
- **D-053.** «Una compra en el mercado local o una recepción sin coste con fecha futura entra sola ese día. Si ese día no cabe entera, lo que sobra se pierde, como en la llegada de una caravana.»
- **TC8.** `pagarEntero` (todo o nada) en `motor/caja.ts`. El paso 3 nunca usa `pagarHasta` ni `registrarImpago`.
- **TC9.** Fechas al empezar tarde: obra `inicio = día`; caravana `salida = día` y `vuelta += retraso`; entrada `fecha = día`; su movimiento programado se aplica con `aplicarProgramado(ctx, id, { fecha: día })`.
- **TC18.** Entradas con `caravanaId`: la fase 4 no las crea; el paso 3 no las toca y el paso 7 las marca `aplicada` cuando llega su caravana.

Usa `hayDeTodo`, `sacarDelAlmacen` y `sumarAlAlmacen` (`motor/almacen.ts`, tarea 8); `pagarEntero` y `pagoProgramado` (`motor/caja.ts`, tarea 8); `aplicarProgramado` (`motor/contexto.ts`, tarea 8); `compararFechas`, `diasEntre` y `sumarDias` (`calendario/fecha.ts`, fase 1).

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/motor/pasos/inicio.ts`
- Prueba: `src/dominio/motor/pasos/inicio.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Qué comprueba cada bloque:
- `pasoInicio: obras`: con el ejemplo, la obra «Ampliar la cervecería» programada el 14 con su gasto programado de 45 mo empieza ese día (madera 360, piedra 150, caja −45 mo, el movimiento aplicado con fecha 14 y la obra `enCurso` desde el 14); sin materiales no empieza y lo reintenta, empezando el día que llegan con ese día de inicio; sin dinero no empieza, sin crear deuda ni tocar el movimiento programado; una obra con fecha ya pasada empieza el primer día del avance; dos obras que compiten por la misma caja el mismo día: gana la primera de la lista.
- `pasoInicio: caravanas`: una compra programada con salida hoy (el 12) sale el 13 y vuelve el 21 en vez del 20; una venta programada saca su carga; una venta sin carga suficiente no sale; un traslado saca la carga del origen (y no toca el destino: eso es de la tarea 13); una compra sin dinero suficiente no sale.
- `pasoInicio: entradas del almacén`: una compra local programada paga y entra; una recepción sin coste entra sin pagar nada; una recepción de 1.000 sacos con solo 890 de hueco entran 890 y se pierden 110; una entrada con `caravanaId` no se toca en este paso (TC18).

Crea `src/dominio/motor/pasos/inicio.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { claveExistencia } from '../../almacen/cantidades'
import { CATEGORIA, RECURSO } from '../../catalogo/inicial'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import { DOM, OBRA } from '../../ejemplo/ids'
import type { Caravana } from '../../modelo/comercio'
import type { EntradaAlmacen, Existencia } from '../../modelo/almacen'
import type { Obra } from '../../modelo/asentamiento'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import type { Fecha } from '../../calendario/fecha'
import { filaEn } from '../almacen'
import { crearContexto, type Contexto } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, diaDe, estadoMinimo, recorrerPasos } from '../pruebas/constructores'
import type { OpcionesSimulacion } from '../tipos'
import { pasoInicio } from './inicio'

/** El 12 de abril de 1640: la fecha actual del ejemplo y de estadoMinimo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

function fecha(dia: number, mes = 4): Fecha {
  return { anio: 1640, mes, dia }
}

/** Opciones de una simulación de prueba: ids en serie «sim.1»… y el catálogo del ejemplo. */
function opciones(): OpcionesSimulacion {
  return { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** Un contexto sobre `estado`, simulando hasta `hasta`. */
function contexto(estado: EstadoPartida, hasta: Fecha): Contexto {
  return crearContexto(estado, hasta, opciones())
}

describe('pasoInicio: obras', () => {
  it('empieza el 14 con sus materiales y su gasto programado: madera 360, piedra 150, caja −45 mo (ejemplo)', () => {
    const base = estadoDe(documentoDeEjemplo())
    const estado: EstadoPartida = {
      ...base,
      obras: base.obras.map((o) =>
        o.id === OBRA.cerveceria
          ? { ...o, estado: 'programada', inicio: fecha(14), movimientoId: 'mov.prueba.cerveceria' }
          : o,
      ),
      movimientos: [
        ...base.movimientos,
        {
          id: 'mov.prueba.cerveceria',
          dominioId: DOM.bree,
          fecha: fecha(14),
          tipo: 'gasto',
          importe: { base: -4500000, introducido: { cantidad: '45', moneda: 'mo' } },
          categoriaId: CATEGORIA.obras,
          concepto: 'Obra: ampliar la cervecería',
          origen: 'manual',
          vinculo: { tipo: 'obra', id: OBRA.cerveceria },
          programado: true,
        },
      ],
    }
    const ctx = contexto(estado, fecha(14))
    const saldoAntes = ctx.saldosAntes[DOM.bree]
    recorrerPasos(ctx, 2, [pasoInicio])
    expect(filaEn(ctx, DOM.bree, RECURSO.madera)?.cantidad).toBe(360)
    expect(filaEn(ctx, DOM.bree, RECURSO.piedra)?.cantidad).toBe(150)
    expect(saldoAntes - (ctx.saldos.get(DOM.bree) ?? 0)).toBe(4500000)
    const movimiento = ctx.movimientos.find((m) => m.id === 'mov.prueba.cerveceria')
    expect(movimiento).toMatchObject({ fecha: fecha(14), programado: false, avanceId: 'sim' })
    const obra = ctx.obras.find((o) => o.id === OBRA.cerveceria)
    expect(obra).toMatchObject({ estado: 'enCurso', inicio: fecha(14) })
  })

  /** Una obra mínima en el dominio dado, con esos materiales y ese coste (0 = sin movimiento, D-045). */
  function obraDePrueba(datos: {
    dominioId: string
    materiales: Record<string, number>
    inicio: Fecha
    coste?: number
    movimientoId?: string
  }): Obra {
    return {
      id: 'obra.prueba',
      dominioId: datos.dominioId,
      nombre: 'Obra de prueba',
      estado: 'programada',
      coste: { base: datos.coste ?? 0 },
      materiales: datos.materiales,
      inicio: datos.inicio,
      diasTotales: 10,
      efecto: { tipo: 'repararEdificio', objetivoId: 'ed.inexistente' },
      movimientoId: datos.movimientoId,
    }
  }

  it('sin materiales no empieza; lo reintenta y empieza el día que llegan, con ese día de inicio', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [obraDePrueba({ dominioId: 'dom.aldea', materiales: { [RECURSO.madera]: 10 }, inicio: fecha(13) })],
    }
    const ctx = contexto(estado, fecha(14))
    pasoInicio(ctx, diaDe(fecha(13)))
    expect(ctx.obras[0].estado).toBe('programada')
    // Los materiales llegan el 14, un día después de lo programado.
    ctx.existencias.set(claveExistencia('dom.aldea', RECURSO.madera), {
      dominioId: 'dom.aldea',
      recursoId: RECURSO.madera,
      cantidad: 10,
    })
    pasoInicio(ctx, diaDe(fecha(14)))
    expect(ctx.obras[0]).toMatchObject({ estado: 'enCurso', inicio: fecha(14) })
    expect(filaEn(ctx, 'dom.aldea', RECURSO.madera)?.cantidad).toBe(0)
  })

  it('sin dinero no empieza, y no crea impago ni deuda', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [
        obraDePrueba({
          dominioId: 'dom.aldea',
          materiales: {},
          inicio: fecha(13),
          coste: 500000,
          movimientoId: 'mov.prueba.obra',
        }),
      ],
      movimientos: [
        {
          id: 'mov.prueba.obra',
          dominioId: 'dom.aldea',
          fecha: fecha(13),
          tipo: 'gasto',
          importe: { base: -500000 },
          categoriaId: CATEGORIA.obras,
          concepto: 'Obra: obra de prueba',
          origen: 'manual',
          vinculo: { tipo: 'obra', id: 'obra.prueba' },
          programado: true,
        },
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.obras[0].estado).toBe('programada')
    expect(ctx.deudas).toEqual([])
    expect(ctx.movimientos.find((m) => m.id === 'mov.prueba.obra')?.programado).toBe(true)
    expect(ctx.saldos.get('dom.aldea')).toBe(0)
  })

  it('una obra programada con fecha ya pasada empieza el primer día del avance', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [obraDePrueba({ dominioId: 'dom.aldea', materiales: {}, inicio: fecha(1) })],
    }
    const ctx = contexto(estado, fecha(20))
    recorrerPasos(ctx, 1, [pasoInicio])
    // ctx.primerDia es el 13 de abril: el día siguiente a la fecha actual (el 12).
    expect(ctx.obras[0]).toMatchObject({ estado: 'enCurso', inicio: fecha(13) })
  })

  it('dos obras compiten por la misma caja el mismo día: gana la primera de la lista', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 500000 })
    const movimiento = (id: string, base: number) => ({
      id,
      dominioId: 'dom.aldea',
      fecha: fecha(13),
      tipo: 'gasto' as const,
      importe: { base },
      categoriaId: CATEGORIA.obras,
      concepto: 'Obra',
      origen: 'manual' as const,
      vinculo: { tipo: 'obra' as const, id },
      programado: true,
    })
    const estado: EstadoPartida = {
      ...base,
      obras: [
        obraDePrueba({ dominioId: 'dom.aldea', materiales: {}, inicio: fecha(13), coste: 500000, movimientoId: 'mov.1' }),
        { ...obraDePrueba({ dominioId: 'dom.aldea', materiales: {}, inicio: fecha(13), coste: 500000, movimientoId: 'mov.2' }), id: 'obra.prueba.2' },
      ].map((o, i) => (i === 0 ? { ...o, id: 'obra.prueba.1' } : o)),
      movimientos: [movimiento('mov.1', -500000), movimiento('mov.2', -500000)],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.obras.find((o) => o.id === 'obra.prueba.1')?.estado).toBe('enCurso')
    expect(ctx.obras.find((o) => o.id === 'obra.prueba.2')?.estado).toBe('programada')
    expect(ctx.saldos.get('dom.aldea')).toBe(0)
  })
})

describe('pasoInicio: caravanas', () => {
  function caravanaDePrueba(datos: Partial<Caravana> & Pick<Caravana, 'operacion' | 'dominioId' | 'carga'>): Caravana {
    return {
      id: 'car.prueba',
      salida: fecha(12),
      vuelta: fecha(20),
      estado: 'programada',
      ...datos,
    }
  }

  it('una compra programada con salida el 12 (hoy) sale el 13 y vuelve el 21, en vez del 20', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 3000000 })
    const estado: EstadoPartida = {
      ...base,
      mercados: [...base.mercados, { id: 'mer.prueba', nombre: 'Fornost', precios: [] }],
      caravanas: [
        caravanaDePrueba({
          operacion: 'compra',
          dominioId: 'dom.aldea',
          carga: { recursoId: RECURSO.madera, cantidad: 100 },
          mercadoId: 'mer.prueba',
          movimientoSalidaId: 'mov.salida',
        }),
      ],
      movimientos: [
        {
          id: 'mov.salida',
          dominioId: 'dom.aldea',
          fecha: fecha(12),
          tipo: 'gasto',
          importe: { base: -3000000 },
          categoriaId: CATEGORIA.comercio,
          concepto: 'Caravana: compra de madera en Fornost',
          origen: 'manual',
          vinculo: { tipo: 'caravana', id: 'car.prueba' },
          programado: true,
        },
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    const caravana = ctx.caravanas[0]
    expect(caravana).toMatchObject({ estado: 'enRuta', salida: fecha(13), vuelta: fecha(21) })
    expect(ctx.movimientos.find((m) => m.id === 'mov.salida')).toMatchObject({ programado: false, fecha: fecha(13) })
    expect(ctx.saldos.get('dom.aldea')).toBe(0)
  })

  it('una venta programada saca su carga del almacén', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.cerveza, cantidad: 90 }],
      caravanas: [
        caravanaDePrueba({
          operacion: 'venta',
          dominioId: 'dom.aldea',
          carga: { recursoId: RECURSO.cerveza, cantidad: 40 },
          salida: fecha(13),
        }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.caravanas[0].estado).toBe('enRuta')
    expect(filaEn(ctx, 'dom.aldea', RECURSO.cerveza)?.cantidad).toBe(50)
  })

  it('una venta sin carga suficiente no sale', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.cerveza, cantidad: 10 }],
      caravanas: [
        caravanaDePrueba({
          operacion: 'venta',
          dominioId: 'dom.aldea',
          carga: { recursoId: RECURSO.cerveza, cantidad: 40 },
          salida: fecha(13),
        }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.caravanas[0].estado).toBe('programada')
    expect(filaEn(ctx, 'dom.aldea', RECURSO.cerveza)?.cantidad).toBe(10)
  })

  it('un traslado saca la carga del asentamiento de origen', () => {
    const base = conAsentamiento(
      conAsentamiento(estadoMinimo(HOY), { id: 'dom.origen', nombre: 'Origen', caja: 0 }),
      { id: 'dom.destino', nombre: 'Destino', caja: 0 },
    )
    const estado: EstadoPartida = {
      ...base,
      existencias: [
        ...base.existencias,
        { dominioId: 'dom.origen', recursoId: RECURSO.madera, cantidad: 50 },
      ],
      caravanas: [
        caravanaDePrueba({
          operacion: 'traslado',
          dominioId: 'dom.origen',
          destinoId: 'dom.destino',
          carga: { recursoId: RECURSO.madera, cantidad: 20 },
          salida: fecha(13),
        }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.caravanas[0].estado).toBe('enRuta')
    expect(filaEn(ctx, 'dom.origen', RECURSO.madera)?.cantidad).toBe(30)
    // El traslado no entra en el destino hasta el paso 7 (T13): sin fila todavía.
    expect(filaEn(ctx, 'dom.destino', RECURSO.madera)).toBeUndefined()
  })

  it('una compra sin dinero suficiente no sale', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      mercados: [...base.mercados, { id: 'mer.prueba', nombre: 'Fornost', precios: [] }],
      caravanas: [
        caravanaDePrueba({
          operacion: 'compra',
          dominioId: 'dom.aldea',
          carga: { recursoId: RECURSO.madera, cantidad: 100 },
          mercadoId: 'mer.prueba',
          movimientoSalidaId: 'mov.salida',
          salida: fecha(13),
        }),
      ],
      movimientos: [
        {
          id: 'mov.salida',
          dominioId: 'dom.aldea',
          fecha: fecha(13),
          tipo: 'gasto',
          importe: { base: -3000000 },
          categoriaId: CATEGORIA.comercio,
          concepto: 'Caravana: compra de madera en Fornost',
          origen: 'manual',
          vinculo: { tipo: 'caravana', id: 'car.prueba' },
          programado: true,
        },
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.caravanas[0].estado).toBe('programada')
    expect(ctx.movimientos.find((m) => m.id === 'mov.salida')?.programado).toBe(true)
  })
})

describe('pasoInicio: entradas del almacén', () => {
  function entradaDePrueba(datos: Partial<EntradaAlmacen> & Pick<EntradaAlmacen, 'dominioId' | 'recursoId' | 'cantidad' | 'operacion'>): EntradaAlmacen {
    return {
      id: 'ea.prueba',
      fecha: fecha(13),
      aplicada: false,
      ...datos,
    }
  }

  it('una compra local programada paga y entra', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 300000 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 0 }],
      entradasAlmacen: [
        entradaDePrueba({
          dominioId: 'dom.aldea',
          recursoId: RECURSO.madera,
          cantidad: 30,
          operacion: 'compra',
          mercadoId: 'mercado.dom.aldea',
          precioUnidad: { base: 10000 },
          movimientoId: 'mov.compra',
        }),
      ],
      movimientos: [
        {
          id: 'mov.compra',
          dominioId: 'dom.aldea',
          fecha: fecha(13),
          tipo: 'gasto',
          importe: { base: -300000 },
          categoriaId: CATEGORIA.viveresDelAlmacen,
          concepto: 'Compra de madera en Aldea',
          origen: 'manual',
          vinculo: { tipo: 'entradaAlmacen', id: 'ea.prueba' },
          programado: true,
        },
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.madera)?.cantidad).toBe(30)
    expect(ctx.entradasAlmacen[0]).toMatchObject({ aplicada: true, fecha: fecha(13) })
    expect(ctx.movimientos.find((m) => m.id === 'mov.compra')).toMatchObject({ programado: false, fecha: fecha(13) })
  })

  it('una recepción sin coste programada entra sin pagar nada', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 0 }],
      entradasAlmacen: [
        entradaDePrueba({ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 30, operacion: 'recepcion' }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.madera)?.cantidad).toBe(30)
    expect(ctx.entradasAlmacen[0]).toMatchObject({ aplicada: true, fecha: fecha(13) })
    expect(ctx.saldos.get('dom.aldea')).toBe(0)
  })

  it('una recepción de 1.000 sacos con solo 890 de hueco: entran 890 y se pierden 110', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const fila: Existencia = { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 310, capacidad: 1200 }
    const estado: EstadoPartida = {
      ...base,
      existencias: [fila],
      entradasAlmacen: [
        entradaDePrueba({ dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 1000, operacion: 'recepcion' }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBe(1200)
    const flujo = ctx.flujos.find((f) => f.dominioId === 'dom.aldea' && f.recursoId === RECURSO.viveres)
    expect(flujo?.entradas).toBeCloseTo(890, 6)
    expect(flujo?.perdido).toBeCloseTo(110, 6)
  })

  it('una entrada con caravanaId no se toca en este paso (TC18)', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 0 }],
      entradasAlmacen: [
        entradaDePrueba({
          dominioId: 'dom.aldea',
          recursoId: RECURSO.viveres,
          cantidad: 100,
          operacion: 'compra',
          caravanaId: 'car.prueba',
        }),
      ],
    }
    const ctx = contexto(estado, fecha(13))
    recorrerPasos(ctx, 1, [pasoInicio])
    expect(ctx.entradasAlmacen[0].aplicada).toBe(false)
    expect(filaEn(ctx, 'dom.aldea', RECURSO.viveres)?.cantidad).toBe(0)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/pasos/inicio.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./inicio`, que todavía no existe. La hora y la duración pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/pasos/inicio.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/pasos/inicio.test.ts [ src/dominio/motor/pasos/inicio.test.ts ]
Error: Cannot find module './inicio' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/pasos/inicio.test.ts
 ❯ src/dominio/motor/pasos/inicio.test.ts:16:1
     14| import { conAsentamiento, diaDe, estadoMinimo, recorrerPasos } from '.…
     15| import type { OpcionesSimulacion } from '../tipos'
     16| import { pasoInicio } from './inicio'
       | ^
     17|
     18| /** El 12 de abril de 1640: la fecha actual del ejemplo y de estadoMin…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  20:18:53
   Duration  0.96s (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `inicio.ts`**

Crea `src/dominio/motor/pasos/inicio.ts` con este contenido:

```ts
import { compararFechas, diasEntre, sumarDias } from '../../calendario/fecha'
import { hayDeTodo, sacarDelAlmacen, sumarAlAlmacen } from '../almacen'
import { pagarEntero, pagoProgramado } from '../caja'
import { aplicarProgramado, type Contexto, type Dia } from '../contexto'

/**
 * Paso 3: inicio de obras, salida de caravanas y entrada de compras y recepciones del almacén (§9 l.1275;
 * D-044, D-045, D-046, D-053). Una obra, una caravana o una compra que no puede empezar hoy no hace nada:
 * lo reintenta mañana, sin `pagarHasta` ni `registrarImpago` (TC8).
 */
export function pasoInicio(ctx: Contexto, dia: Dia): void {
  iniciarObras(ctx, dia)
  salirCaravanas(ctx, dia)
  entrarAlmacen(ctx, dia)
}

/** 1. Obras programadas con inicio ≤ día: con materiales y dinero, empiezan; si no, nada (D-044, D-046). */
function iniciarObras(ctx: Contexto, dia: Dia): void {
  ctx.obras.forEach((obra, indice) => {
    if (obra.estado !== 'programada' || obra.inicio === undefined || compararFechas(obra.inicio, dia.fecha) > 0) {
      return
    }
    if (!hayDeTodo(ctx, obra.dominioId, obra.materiales)) {
      return
    }
    if (!pagarEntero(ctx, obra.dominioId, pagoProgramado(ctx, obra.movimientoId))) {
      return
    }
    for (const [recursoId, cantidad] of Object.entries(obra.materiales)) {
      sacarDelAlmacen(ctx, dia, obra.dominioId, recursoId, cantidad)
    }
    if (obra.movimientoId !== undefined) {
      aplicarProgramado(ctx, obra.movimientoId, { fecha: dia.fecha })
    }
    ctx.obras[indice] = { ...obra, estado: 'enCurso', inicio: dia.fecha }
  })
}

/** 2. Caravanas programadas con salida ≤ día: compra paga; venta y traslado sacan su carga (D-044). */
function salirCaravanas(ctx: Contexto, dia: Dia): void {
  ctx.caravanas.forEach((caravana, indice) => {
    if (caravana.estado !== 'programada' || compararFechas(caravana.salida, dia.fecha) > 0) {
      return
    }
    const sale =
      caravana.operacion === 'compra'
        ? pagarEntero(ctx, caravana.dominioId, pagoProgramado(ctx, caravana.movimientoSalidaId))
        : sacarDelAlmacen(ctx, dia, caravana.dominioId, caravana.carga.recursoId, caravana.carga.cantidad)
    if (!sale) {
      return
    }
    if (caravana.operacion === 'compra' && caravana.movimientoSalidaId !== undefined) {
      aplicarProgramado(ctx, caravana.movimientoSalidaId, { fecha: dia.fecha })
    }
    const retraso = diasEntre(caravana.salida, dia.fecha)
    ctx.caravanas[indice] = {
      ...caravana,
      estado: 'enRuta',
      salida: dia.fecha,
      vuelta: sumarDias(caravana.vuelta, retraso),
    }
  })
}

/** 3. Entradas del almacén sin caravana, con fecha ≤ día y sin aplicar: compra paga; la recepción entra siempre (D-053). */
function entrarAlmacen(ctx: Contexto, dia: Dia): void {
  ctx.entradasAlmacen.forEach((entrada, indice) => {
    if (entrada.aplicada || entrada.caravanaId !== undefined || compararFechas(entrada.fecha, dia.fecha) > 0) {
      return
    }
    if (entrada.operacion === 'compra') {
      if (!pagarEntero(ctx, entrada.dominioId, pagoProgramado(ctx, entrada.movimientoId))) {
        return
      }
      if (entrada.movimientoId !== undefined) {
        aplicarProgramado(ctx, entrada.movimientoId, { fecha: dia.fecha })
      }
    }
    sumarAlAlmacen(ctx, dia, entrada.dominioId, entrada.recursoId, entrada.cantidad)
    ctx.entradasAlmacen[indice] = { ...entrada, aplicada: true, fecha: dia.fecha }
  })
}
```

Tres detalles de la implementación:
- `iniciarObras` comprueba primero `hayDeTodo` y después `pagarEntero`: si faltan materiales, no llega a tocar la caja (aunque hubiera dinero de sobra), y al revés si falta el dinero no se sacan materiales a medias.
- `pagoProgramado(ctx, undefined)` da 0 (definido en la tarea 8), así que una obra de coste 0 (sin `movimientoId`) pasa siempre `pagarEntero(ctx, dominioId, 0)`, que da `true`: la condición no bloquea nada y el `if (obra.movimientoId !== undefined)` de después evita aplicar un movimiento que no existe (D-045).
- El retraso de una caravana (`diasEntre(caravana.salida, dia.fecha)`) se sale de la fecha **programada**, no de la fecha actual de la partida: por eso una compra programada para «hoy» (el 12, antes de que empiece el avance) que sale el 13 vuelve un día más tarde de lo previsto, y no según cuántos días lleve corriendo el avance.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/pasos/inicio.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  20:19:04
   Duration  1.39s (transform 60%, import 37%, tests 2%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0.

**Sobre el recuento de `npm test`:** este grupo verificó las tareas 11 a 14 en un clon aparte, partiendo de las tareas 1 a 10 ya aplicadas (según este mismo contrato) pero **sin sus archivos de prueba propios** (esas pruebas las escriben y las cuentan los grupos que tienen esas tareas). En ese clon, justo antes de esta tarea, `npm test` daba **908 pruebas en 81 archivos** (no las 1.010 en 87 archivos que estima la tabla del contrato: la fase 3 de partida dio realmente 906 pruebas en 81 archivos, 4 más que las 902 que asume el contrato, y las tareas 9 y 10, en este clon de verificación, todavía no tenían sus propias `produccion.test.ts` ni `consumo.test.ts`). Con `inicio.test.ts` (14 pruebas) más el caso que `inicio.ts` suma a `pureza.test.ts` (1), esta tarea deja el clon de verificación en:

```text
 Test Files  82 passed (82)
      Tests  923 passed (923)
```

Cuando esta tarea se ejecute de verdad, después de que las tareas 1 a 10 estén aplicadas con sus propias pruebas, parte de otro número base: suma **15 pruebas y 1 archivo** a lo que deje la tarea 10 (14 de `inicio.test.ts` más 1 de `pureza.test.ts`) y sigue con `npm run lint` y `npm test` para confirmar el total real. Queda anotado en «huecos» del informe de esta fase. En la cadena real de este plan (tareas 1 a 10 tal como quedan escritas aquí), la tarea 10 deja 1.032 pruebas en 87 archivos, así que esta tarea 11 cierra en **1.047 pruebas en 88 archivos**.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/pasos/inicio.ts src/dominio/motor/pasos/inicio.test.ts
git commit -m "feat(motor): paso 3, inicio de obras, salida de caravanas y entrada de compras y recepciones" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF» por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-4 dac3acb] feat(motor): paso 3, inicio de obras, salida de caravanas y entrada de compras y recepciones
 2 files changed, 531 insertions(+)
 create mode 100644 src/dominio/motor/pasos/inicio.test.ts
 create mode 100644 src/dominio/motor/pasos/inicio.ts
```

**Avisos que esta tarea deja escritos:**

1. `entrarAlmacen` y `salirCaravanas` **no** tocan las entradas con `caravanaId`: esas y la mercancía de las caravanas de compra y de traslado las mueve el paso 7 (`pasoLlegadaDeCaravanas`, tarea 13), que también marca `aplicada` esa entrada cuando la caravana llega. No dupliques esa suma aquí.
2. `iniciarObras` dedica un `forEach` con reasignación por índice (`ctx.obras[indice] = …`), el mismo patrón que ya usa `pasoVueltaDeVentas` en `pasos/caravanas.ts` (fase 3): así una obra que empieza en un día concreto queda visible para el paso 6 (`pasoObras`, tarea 12) **ese mismo día**, si su `diasTotales` es 1.
3. El campo `inicio` de una obra y `salida`/`vuelta` de una caravana se sobrescriben siempre con el día real (TC9), aunque coincidan con lo programado: no hay un caso especial para «empezó a tiempo».

---

### Tarea 12 · Paso 6: obras (12)

El paso 6 del motor (§7 l.1144-1150; §9 l.1278) recorre `ctx.obras` y, para cada una `enCurso` cuyo fin ya llegó (`finDeObra(obra) ≤ dia.fecha`, con `finDeObra` de `almacen/progreso.ts`, tarea 6), aplica su efecto, la pasa a `terminada` y empuja un suceso `{ tipo: 'obraTerminada', dominioId, fecha: dia.fecha, nombre: obra.nombre }`. Los seis efectos posibles (`modelo/asentamiento.ts`, `EfectoObra`):

- **`crearEdificio`**: añade un edificio nuevo a `ctx.edificios`: `{ id: nuevoId(), dominioId, tipoId, nombre: obra.nombre, estado: 'inactivo', trabajadoresNecesarios: 0, producciones: [], avisoPendiente: { tipo: 'terminadoSinProduccion', obraId } }`.
- **`mejorarEdificio`**: si el edificio objetivo (`efecto.objetivoId`) sigue existiendo, le pone `avisoPendiente: { tipo: 'mejoraTerminada', obraId }`. Si ya no existe, no hace nada.
- **`ampliarAlmacen`**: si la fila del recurso no existe, la crea con `{ dominioId, recursoId, cantidad: 0 }` **sin capacidad** (D-056: nace igual que cualquier fila que falta al nombrar un recurso). Si la fila existe y **tiene** capacidad, le suma `efecto.valor`. Si la fila existe y **no** tiene capacidad, se queda sin límite: ampliar «sin límite» sigue siendo «sin límite» (D-056).
- **`crearDefensa`**: añade una defensa nueva a `ctx.defensas`: `{ id: nuevoId(), dominioId, tipoId, nombre: obra.nombre, estado: 'buena' }`.
- **`repararDefensa`**: si la defensa objetivo existe, la pasa a `'buena'`. Si no, no hace nada.
- **`repararEdificio`**: si el edificio objetivo existe, lo pasa a `'activo'`. Si no, no hace nada.

Como el paso 3 (tarea 11) ya puede dejar una obra `enCurso` con `inicio: dia.fecha` **en el mismo día** que se recorre, una obra de `diasTotales: 1` que empieza hoy también puede terminar hoy: los dos pasos leen y escriben el mismo `ctx.obras`, así que no hace falta ningún caso especial.

**Reglas de la especificación que implementa:**

- **§7 l.1144-1150.** Describe los seis efectos y su resultado: crear el edificio inactivo con el aviso pendiente, poner el aviso de mejora, ampliar la capacidad, crear la defensa «Buena» y reparar la defensa o el edificio.
- **§9 l.1278.** «6. Obras: las que terminan hoy aplican su efecto.»
- **D-056.** «Al guardar algo que nombra un recurso que el almacén de ese asentamiento no tiene (una producción, un material o la ampliación de una obra, una compra, el destino de un traslado), su fila se crea con 0 y sin capacidad. Ampliar el almacén de un recurso sin capacidad lo deja sin límite.»
- **Objetivo borrado.** «Si su objetivo ya no existe, el efecto no hace nada» (§3.8 del contrato de la fase): sigue la misma pauta que D-055 (borrar no deshace lo que ya pasó ni lo que ya está en marcha).

Usa `finDeObra` (`almacen/progreso.ts`, tarea 6), `claveExistencia` (`almacen/cantidades.ts`, tarea 3) y `ctx.opciones.nuevoId` (`motor/tipos.ts`/`motor/contexto.ts`, tarea 8); no llama a ninguna función de `motor/almacen.ts` porque `ampliarAlmacen` no suma cantidad, solo capacidad, y por eso escribe `ctx.existencias` directamente, igual que hace `sumarAlAlmacen` internamente.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/motor/pasos/obras.ts`
- Prueba: `src/dominio/motor/pasos/obras.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Qué comprueba cada bloque:
- `pasoObras: O8, el ejemplo`: la puerta termina el 17 (la defensa «Puerta del sur» pasa a «buena» y sale el suceso); el granero termina el 19 de mayo (la capacidad de víveres de Bree pasa de 1.200 a 2.000); el molino de Archet termina el 28 de abril (nace el edificio «Molino», inactivo, sin producciones, con el aviso `terminadoSinProduccion`).
- `pasoObras: efectos sueltos`, con obras mínimas de prueba: `mejorarEdificio` pone el aviso `mejoraTerminada` en el edificio objetivo, y no hace nada si ya no existe; `crearDefensa` añade una defensa nueva «buena»; `repararEdificio` pasa el objetivo a «activo»; una obra con fin ya pasado se aplica el primer día del avance; `ampliarAlmacen` en un recurso sin capacidad lo deja sin límite, y sin fila la crea con 0 y sin capacidad; una obra de 1 día que empieza hoy también termina hoy, encadenando `pasoInicio` (tarea 11) y `pasoObras` el mismo día.

Crea `src/dominio/motor/pasos/obras.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { filaEn } from '../almacen'
import { diasEntre, type Fecha } from '../../calendario/fecha'
import { RECURSO } from '../../catalogo/inicial'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import { DEFENSA, DOM, OBRA } from '../../ejemplo/ids'
import type { Obra } from '../../modelo/asentamiento'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import { crearContexto, type Contexto } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, estadoMinimo, recorrerPasos } from '../pruebas/constructores'
import type { OpcionesSimulacion } from '../tipos'
import { pasoInicio } from './inicio'
import { pasoObras } from './obras'

/** El 12 de abril de 1640: la fecha actual del ejemplo y de estadoMinimo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

function fecha(dia: number, mes = 4): Fecha {
  return { anio: 1640, mes, dia }
}

function opciones(): OpcionesSimulacion {
  return { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** Contexto que recorre pasoObras desde el primer día hasta `hasta`, incluido. */
function recorrer(estado: EstadoPartida, hasta: Fecha): Contexto {
  const ctx = crearContexto(estado, hasta, opciones())
  recorrerPasos(ctx, diasEntre(ctx.primerDia, hasta) + 1, [pasoObras])
  return ctx
}

describe('pasoObras: O8, el ejemplo', () => {
  it('la puerta termina el 17: la defensa pasa a buena y se empuja el suceso', () => {
    const ctx = recorrer(estadoDe(documentoDeEjemplo()), fecha(17))
    const puerta = ctx.obras.find((o) => o.id === OBRA.puerta)
    expect(puerta?.estado).toBe('terminada')
    const defensa = ctx.defensas.find((d) => d.id === DEFENSA.puerta)
    expect(defensa?.estado).toBe('buena')
    expect(ctx.sucesos).toContainEqual({
      tipo: 'obraTerminada',
      dominioId: DOM.bree,
      fecha: fecha(17),
      nombre: 'Reparación de la puerta del sur',
    })
  })

  it('el granero termina el 19 de mayo: la capacidad de víveres de Bree pasa de 1.200 a 2.000', () => {
    const ctx = recorrer(estadoDe(documentoDeEjemplo()), fecha(19, 5))
    const granero = ctx.obras.find((o) => o.id === OBRA.granero)
    expect(granero?.estado).toBe('terminada')
    expect(filaEn(ctx, DOM.bree, RECURSO.viveres)?.capacidad).toBe(2000)
  })

  it('el molino de Archet termina el 28 de abril: nace el edificio, inactivo y con el aviso pendiente', () => {
    const ctx = recorrer(estadoDe(documentoDeEjemplo()), fecha(28))
    const molino = ctx.obras.find((o) => o.id === OBRA.molinoArchet)
    expect(molino?.estado).toBe('terminada')
    const nuevo = ctx.edificios.find((e) => e.dominioId === DOM.archet)
    expect(nuevo).toMatchObject({
      dominioId: DOM.archet,
      nombre: 'Molino',
      estado: 'inactivo',
      trabajadoresNecesarios: 0,
      producciones: [],
      avisoPendiente: { tipo: 'terminadoSinProduccion', obraId: OBRA.molinoArchet },
    })
    expect(ctx.sucesos).toContainEqual({
      tipo: 'obraTerminada',
      dominioId: DOM.archet,
      fecha: fecha(28),
      nombre: 'Molino',
    })
  })
})

describe('pasoObras: efectos sueltos', () => {
  function obraDePrueba(datos: Partial<Obra> & Pick<Obra, 'efecto'>): Obra {
    return {
      id: 'obra.prueba',
      dominioId: 'dom.aldea',
      nombre: 'Obra de prueba',
      estado: 'enCurso',
      coste: { base: 0 },
      materiales: {},
      inicio: fecha(13),
      diasTotales: 1,
      ...datos,
    }
  }

  it('mejorarEdificio pone el aviso pendiente «mejoraTerminada» en el edificio objetivo', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      edificios: [
        {
          id: 'ed.prueba',
          dominioId: 'dom.aldea',
          tipoId: 'tipo.prueba',
          nombre: 'Molino',
          estado: 'activo',
          trabajadoresNecesarios: 0,
          producciones: [],
        },
      ],
      obras: [obraDePrueba({ efecto: { tipo: 'mejorarEdificio', objetivoId: 'ed.prueba' } })],
    }
    const ctx = recorrer(estado, fecha(13))
    const edificio = ctx.edificios.find((e) => e.id === 'ed.prueba')
    expect(edificio?.avisoPendiente).toEqual({ tipo: 'mejoraTerminada', obraId: 'obra.prueba' })
  })

  it('mejorarEdificio sobre un edificio que ya no existe no hace nada', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [obraDePrueba({ efecto: { tipo: 'mejorarEdificio', objetivoId: 'ed.inexistente' } })],
    }
    const ctx = recorrer(estado, fecha(13))
    expect(ctx.obras[0].estado).toBe('terminada')
    expect(ctx.edificios).toEqual([])
  })

  it('crearDefensa añade una defensa nueva en estado «buena»', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [obraDePrueba({ nombre: 'Nueva muralla', efecto: { tipo: 'crearDefensa', tipoId: 'tipo.muralla' } })],
    }
    const ctx = recorrer(estado, fecha(13))
    expect(ctx.defensas).toEqual([
      { id: expect.any(String), dominioId: 'dom.aldea', tipoId: 'tipo.muralla', nombre: 'Nueva muralla', estado: 'buena' },
    ])
  })

  it('repararEdificio pasa el edificio objetivo a «activo»', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      edificios: [
        {
          id: 'ed.prueba',
          dominioId: 'dom.aldea',
          tipoId: 'tipo.prueba',
          nombre: 'Molino',
          estado: 'daniado',
          trabajadoresNecesarios: 0,
          producciones: [],
        },
      ],
      obras: [obraDePrueba({ efecto: { tipo: 'repararEdificio', objetivoId: 'ed.prueba' } })],
    }
    const ctx = recorrer(estado, fecha(13))
    expect(ctx.edificios.find((e) => e.id === 'ed.prueba')?.estado).toBe('activo')
  })

  it('una obra en curso con fin ya pasado se aplica el primer día del avance', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [obraDePrueba({ inicio: fecha(1), diasTotales: 3, efecto: { tipo: 'crearDefensa', tipoId: 'tipo.torre' } })],
    }
    const ctx = recorrer(estado, fecha(20))
    // ctx.primerDia es el 13 de abril: el fin (3 de abril) ya había pasado.
    expect(ctx.obras[0].estado).toBe('terminada')
    expect(ctx.sucesos).toContainEqual({ tipo: 'obraTerminada', dominioId: 'dom.aldea', fecha: fecha(13), nombre: 'Obra de prueba' })
  })

  it('ampliarAlmacen en un recurso sin capacidad lo deja sin límite (D-056)', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 40 }],
      obras: [obraDePrueba({ efecto: { tipo: 'ampliarAlmacen', recursoId: RECURSO.madera, valor: 100 } })],
    }
    const ctx = recorrer(estado, fecha(13))
    expect(filaEn(ctx, 'dom.aldea', RECURSO.madera)).toEqual({ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 40 })
  })

  it('ampliarAlmacen de un recurso sin fila la crea con 0 y sin capacidad (D-056)', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [obraDePrueba({ efecto: { tipo: 'ampliarAlmacen', recursoId: RECURSO.piedra, valor: 100 } })],
    }
    const ctx = recorrer(estado, fecha(13))
    expect(filaEn(ctx, 'dom.aldea', RECURSO.piedra)).toEqual({ dominioId: 'dom.aldea', recursoId: RECURSO.piedra, cantidad: 0 })
  })

  it('una obra de 1 día que empieza hoy también termina hoy (pasos 3 y 6 el mismo día)', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      obras: [
        {
          id: 'obra.prueba',
          dominioId: 'dom.aldea',
          nombre: 'Obra rápida',
          estado: 'programada',
          coste: { base: 0 },
          materiales: {},
          inicio: fecha(13),
          diasTotales: 1,
          efecto: { tipo: 'crearDefensa', tipoId: 'tipo.torre' },
        },
      ],
    }
    const ctx = crearContexto(estado, fecha(13), opciones())
    // El paso 3 la empieza hoy (sin materiales ni coste) y el paso 6, en el mismo día, la termina.
    recorrerPasos(ctx, 1, [pasoInicio, pasoObras])
    expect(ctx.obras[0].estado).toBe('terminada')
    expect(ctx.defensas).toHaveLength(1)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/pasos/obras.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./obras`, que todavía no existe. La hora y la duración pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/pasos/obras.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/pasos/obras.test.ts [ src/dominio/motor/pasos/obras.test.ts ]
Error: Cannot find module './obras' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/pasos/obras.test.ts
 ❯ src/dominio/motor/pasos/obras.test.ts:14:1
     12| import type { OpcionesSimulacion } from '../tipos'
     13| import { pasoInicio } from './inicio'
     14| import { pasoObras } from './obras'
       | ^
     15|
     16| /** El 12 de abril de 1640: la fecha actual del ejemplo y de estadoMin…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  20:24:17
   Duration  1.03s (worker 96%, environment 4%)
```

- [ ] **Paso 3: Implementar `obras.ts`**

Crea `src/dominio/motor/pasos/obras.ts` con este contenido:

```ts
import { claveExistencia } from '../../almacen/cantidades'
import { finDeObra } from '../../almacen/progreso'
import { compararFechas } from '../../calendario/fecha'
import type { Obra } from '../../modelo/asentamiento'
import type { Contexto, Dia } from '../contexto'

/**
 * Paso 6: cada obra en curso cuyo fin ya llegó aplica su efecto, pasa a terminada y empuja un suceso
 * `obraTerminada` (§7 l.1144-1150; §9 l.1278). Si el objetivo del efecto ya no existe, no hace nada.
 */
export function pasoObras(ctx: Contexto, dia: Dia): void {
  ctx.obras.forEach((obra, indice) => {
    if (obra.estado !== 'enCurso') {
      return
    }
    const fin = finDeObra(obra)
    if (fin === null || compararFechas(fin, dia.fecha) > 0) {
      return
    }
    aplicarEfecto(ctx, obra)
    ctx.obras[indice] = { ...obra, estado: 'terminada' }
    ctx.sucesos.push({ tipo: 'obraTerminada', dominioId: obra.dominioId, fecha: dia.fecha, nombre: obra.nombre })
  })
}

function aplicarEfecto(ctx: Contexto, obra: Obra): void {
  const efecto = obra.efecto
  switch (efecto.tipo) {
    case 'crearEdificio':
      ctx.edificios.push({
        id: ctx.opciones.nuevoId(),
        dominioId: obra.dominioId,
        tipoId: efecto.tipoId,
        nombre: obra.nombre,
        estado: 'inactivo',
        trabajadoresNecesarios: 0,
        producciones: [],
        avisoPendiente: { tipo: 'terminadoSinProduccion', obraId: obra.id },
      })
      return
    case 'mejorarEdificio': {
      const indice = ctx.edificios.findIndex((e) => e.id === efecto.objetivoId)
      if (indice === -1) {
        return
      }
      ctx.edificios[indice] = { ...ctx.edificios[indice], avisoPendiente: { tipo: 'mejoraTerminada', obraId: obra.id } }
      return
    }
    case 'ampliarAlmacen': {
      // D-056: sin fila, se crea con 0 y sin capacidad; con fila sin capacidad, sigue sin límite.
      const clave = claveExistencia(obra.dominioId, efecto.recursoId)
      const fila = ctx.existencias.get(clave)
      if (fila === undefined) {
        ctx.existencias.set(clave, { dominioId: obra.dominioId, recursoId: efecto.recursoId, cantidad: 0 })
      } else if (fila.capacidad !== undefined) {
        ctx.existencias.set(clave, { ...fila, capacidad: fila.capacidad + efecto.valor })
      }
      return
    }
    case 'crearDefensa':
      ctx.defensas.push({
        id: ctx.opciones.nuevoId(),
        dominioId: obra.dominioId,
        tipoId: efecto.tipoId,
        nombre: obra.nombre,
        estado: 'buena',
      })
      return
    case 'repararDefensa': {
      const indice = ctx.defensas.findIndex((d) => d.id === efecto.objetivoId)
      if (indice === -1) {
        return
      }
      ctx.defensas[indice] = { ...ctx.defensas[indice], estado: 'buena' }
      return
    }
    case 'repararEdificio': {
      const indice = ctx.edificios.findIndex((e) => e.id === efecto.objetivoId)
      if (indice === -1) {
        return
      }
      ctx.edificios[indice] = { ...ctx.edificios[indice], estado: 'activo' }
      return
    }
  }
}
```

Dos detalles de la implementación:
- `aplicarEfecto` recibe `obra`, no `dia`: `finDeObra` ya comprobó que toca hoy, y el efecto no necesita la fecha (ni `crearEdificio`, ni `crearDefensa` ni ninguno de los otros cuatro llevan fecha en su forma).
- El `switch (efecto.tipo)` sobre la unión discriminada `EfectoObra` no necesita una rama `default`: TypeScript comprueba que las seis ramas cubren la unión entera (lo mismo que ya hace `primeraOcurrencia` en `almacen/produccion.ts`, tarea 5).

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/pasos/obras.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  20:24:26
   Duration  1.00s (transform 62%, import 34%, tests 3%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0.

**Sobre el recuento de `npm test`** (mismo aviso que en la tarea 11: ver ese apartado sobre el clon de verificación de este grupo). Esta tarea añade `obras.test.ts` con **11 pruebas** (una más que la estimación de 10 del contrato: este grupo añadió una prueba extra, «mejorarEdificio sobre un edificio que ya no existe no hace nada», que la §3.8 del contrato pide expresamente y que la lista de §8 no contaba aparte; queda anotado en «huecos») más el caso que `obras.ts` suma a `pureza.test.ts` (1): **12 pruebas y 1 archivo** más que lo que deje la tarea 11. En el clon de verificación de este grupo, tras la tarea 11 (923 pruebas, 82 archivos), esta tarea deja:

```text
 Test Files  83 passed (83)
      Tests  935 passed (935)
```

En la cadena real de este plan, la tarea 11 deja 1.047 pruebas en 88 archivos, así que esta tarea 12 cierra en **1.059 pruebas en 89 archivos**.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/pasos/obras.ts src/dominio/motor/pasos/obras.test.ts
git commit -m "feat(motor): paso 6, fin de obras con sus efectos y el suceso obraTerminada" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF» por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-4 58c60cc] feat(motor): paso 6, fin de obras con sus efectos y el suceso obraTerminada
 2 files changed, 302 insertions(+)
 create mode 100644 src/dominio/motor/pasos/obras.test.ts
 create mode 100644 src/dominio/motor/pasos/obras.ts
```

**Avisos que esta tarea deja escritos:**

1. `pasoObras` **no** importa nada de `avisos/*`: el aviso pendiente que deja `mejorarEdificio` o `crearEdificio` en el edificio (`avisoPendiente`) es un dato del propio edificio, no un `AvisoAvance`; lo leerá la fase 8 al mostrar A7/A7b, y la tarea 18 (`avisos/pendientes.ts`) construye sus propios avisos de «edificio terminado» y «mejora terminada» a partir de ese mismo campo, sin que este paso tenga que crear nada más.
2. Como `ampliarAlmacen` escribe `ctx.existencias` directamente (no pasa por `sumarAlAlmacen`), **no** anota ningún `FlujoAlmacen` para esa fila ese día: una ampliación de capacidad no es una entrada ni una pérdida, así que P4 y A8 no tienen por qué verla como un movimiento de cantidad.
3. La prueba «una obra de 1 día que empieza hoy también termina hoy» importa `pasoInicio` de la tarea 11: es la única prueba de esta tarea que depende de otro paso, y demuestra que el orden de `PASOS_DEL_DIA` (que fija la tarea 14) hace posible que una obra nazca y muera el mismo día sin ningún caso especial en el código.

---

### Tarea 13 · Paso 7: llegada de compras y traslados (6)

Añade a `motor/pasos/caravanas.ts`, junto a `pasoVueltaDeVentas` (fase 3, que no cambia), la mitad del paso 7 que le falta: la llegada de la **mercancía** de las caravanas de compra y de traslado (§7 l.1152-1154; §9 l.1279). `pasoVueltaDeVentas` cobra el dinero de las ventas; `pasoLlegadaDeCaravanas` mete en el almacén lo que trae una compra o un traslado. Las dos funciones conviven en el mismo `numero: 7` de `PASOS_DEL_DIA` (tarea 14) porque atienden operaciones disjuntas de `ctx.caravanas` (`venta` una, `compra`/`traslado` la otra) y no se pisan entre sí.

Para cada caravana `enRuta` de `compra` o `traslado` con `vuelta ≤ dia.fecha` (la condición ya recoge, con el `≤`, lo que llegó antes del primer día del avance, como en el resto de pasos nuevos de esta fase — véase §4 del contrato, «Fin y vuelta ya pasados»): `sumarAlAlmacen` entra en `caravana.dominioId` si es una compra (donde vive quien la pidió) o en `caravana.destinoId` si es un traslado (el asentamiento al que iba); la caravana queda `estado: 'terminada'`; cada entrada del almacén con ese `caravanaId` pasa a `aplicada: true` (TC18: esas entradas, que crea la tarea 22 de edición y que el paso 3 nunca toca, son solo el registro histórico de la compra — la cantidad de verdad la lleva `caravana.carga` y la suma este paso); y se empuja un suceso: `vueltaCaravana` con el `mercadoId` de la caravana si es una compra (el mismo suceso que ya da «Caravana de Tharbad de vuelta · 25», TC3), o `llegadaTraslado` con su `destinoId` si es un traslado.

**Reglas de la especificación que implementa:**

- **§7 l.1152-1154.** Al llegar una caravana de compra o traslado, su carga entra en el almacén de destino con la misma regla de capacidad y pérdida que cualquier entrada (§7 l.1107).
- **§9 l.1279.** «7. Llegada de caravanas: entra la mercancía de compras y traslados que llegan hoy.»
- **TC3.** «`obraTerminada` y `llegadaTraslado`; la llegada de una compra reutiliza `vueltaCaravana`, que ya da «Caravana de Tharbad de vuelta · 25».»
- **TC18.** «Entradas con `caravanaId`: la fase 4 no las crea (D-054); el paso 3 no las toca y el paso 7 las marca `aplicada` cuando llega su caravana.»
- **§4, «Fin y vuelta ya pasados».** «En los pasos nuevos basta `fin ≤ día` o `vuelta ≤ día`; el primer día del avance recoge lo que ya había pasado.»

Usa `sumarAlAlmacen` (`motor/almacen.ts`, tarea 8) y `compararFechas` (`calendario/fecha.ts`, fase 1, ya importado en este archivo). Las 6 pruebas de `pasoVueltaDeVentas` de la fase 3 no cambian: esta tarea solo añade una función y su prueba.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Modificar: `src/dominio/motor/pasos/caravanas.ts` (añade `pasoLlegadaDeCaravanas`; `pasoVueltaDeVentas` no cambia)
- Prueba: `src/dominio/motor/pasos/caravanas.test.ts` (6 pruebas nuevas; las 5 de `pasoVueltaDeVentas` no cambian)

- [ ] **Paso 1: Escribir la prueba que falla**

Qué comprueba cada bloque nuevo (`describe('pasoLlegadaDeCaravanas', …)`): la compra de Tharbad llega el 25 (+300 víveres en Bree, terminada, suceso `vueltaCaravana`); llega con el almacén lleno y pierde lo que no cabe; un traslado entra en el destino (creando la fila si falta) con el suceso `llegadaTraslado`; una vuelta ya pasada se cobra el primer día del avance; las ventas no las toca esta función, que sigue esperando a `pasoVueltaDeVentas`; marca `aplicada` la entrada del almacén que esperaba a esta caravana (TC18).

Primero, en `src/dominio/motor/pasos/caravanas.test.ts`, sustituye las líneas de importación:

```ts
import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, compararFechas, type Fecha } from '../../calendario/fecha'
import { CATEGORIA, RECURSO } from '../../catalogo/inicial'
import { eventosDeDineroEl } from '../../eventos/efectos'
import { CARAVANA, DOM, MERCADO } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import type { Caravana } from '../../modelo/comercio'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import type { Movimiento } from '../../modelo/movimientos'
import { crearContexto, type Contexto, type Dia } from '../contexto'
import { idsEnSerie } from '../ids'
import { congelar } from '../pruebas/constructores'
import { pasoVueltaDeVentas } from './caravanas'
```

por esto (añade `filaEn`, `conAsentamiento`, `estadoMinimo` y el import de `pasoLlegadaDeCaravanas`; la importación de `eventosDeDineroEl` no se toca en esta tarea, que no es la que la retira — el aviso 2 de esta tarea explica por qué):

```ts
import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, compararFechas, type Fecha } from '../../calendario/fecha'
import { CATEGORIA, RECURSO } from '../../catalogo/inicial'
import { eventosDeDineroEl } from '../../eventos/efectos'
import { CARAVANA, DOM, MERCADO } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import type { Caravana } from '../../modelo/comercio'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import type { Movimiento } from '../../modelo/movimientos'
import { filaEn } from '../almacen'
import { crearContexto, type Contexto, type Dia } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, congelar, estadoMinimo } from '../pruebas/constructores'
import { pasoLlegadaDeCaravanas, pasoVueltaDeVentas } from './caravanas'
```

Después, añade este bloque **al final** de `caravanas.test.ts` (detrás del `describe('pasoVueltaDeVentas', …)` de la fase 3, que sigue igual):

```ts

describe('pasoLlegadaDeCaravanas', () => {
  it('la compra de Tharbad llega el 25: +300 víveres en Bree, terminada y suceso vueltaCaravana', () => {
    const ctx = contexto(ejemplo(), fecha(25))
    pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(25)))
    expect(filaEn(ctx, DOM.bree, RECURSO.viveres)?.cantidad).toBe(610)
    expect(caravana(ctx, CARAVANA.compraViveresTharbad)?.estado).toBe('terminada')
    expect(ctx.sucesos).toContainEqual({
      tipo: 'vueltaCaravana',
      dominioId: DOM.bree,
      fecha: fecha(25),
      mercadoId: MERCADO.tharbad,
    })
  })

  it('llega con el almacén lleno y pierde lo que no cabe', () => {
    const base = conAsentamiento(estadoMinimo(fecha(12)), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [{ dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 90, capacidad: 100 }],
      caravanas: [
        {
          id: 'car.prueba',
          dominioId: 'dom.aldea',
          operacion: 'compra',
          mercadoId: 'mercado.dom.aldea',
          carga: { recursoId: RECURSO.madera, cantidad: 30 },
          precioUnidad: { base: 10000 },
          importe: { base: 300000 },
          salida: fecha(1),
          vuelta: fecha(13),
          estado: 'enRuta',
        },
      ],
    }
    const ctx = crearContexto(estado, fecha(13), {
      avanceId: AVANCE_PRUEBA,
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(13)))
    expect(filaEn(ctx, 'dom.aldea', RECURSO.madera)?.cantidad).toBe(100)
    const flujo = ctx.flujos.find((f) => f.dominioId === 'dom.aldea' && f.recursoId === RECURSO.madera)
    expect(flujo).toMatchObject({ entradas: 10, perdido: 20 })
  })

  it('un traslado entra en el destino, crea la fila si falta, y empuja llegadaTraslado', () => {
    const base = conAsentamiento(
      conAsentamiento(estadoMinimo(fecha(12)), { id: 'dom.origen', nombre: 'Origen', caja: 0 }),
      { id: 'dom.destino', nombre: 'Destino', caja: 0 },
    )
    const estado: EstadoPartida = {
      ...base,
      caravanas: [
        {
          id: 'car.traslado',
          dominioId: 'dom.origen',
          operacion: 'traslado',
          destinoId: 'dom.destino',
          carga: { recursoId: RECURSO.madera, cantidad: 20 },
          salida: fecha(11),
          vuelta: fecha(13),
          estado: 'enRuta',
        },
      ],
    }
    const ctx = crearContexto(estado, fecha(13), {
      avanceId: AVANCE_PRUEBA,
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    expect(filaEn(ctx, 'dom.destino', RECURSO.madera)).toBeUndefined()
    pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(13)))
    expect(filaEn(ctx, 'dom.destino', RECURSO.madera)?.cantidad).toBe(20)
    expect(caravana(ctx, 'car.traslado')?.estado).toBe('terminada')
    expect(ctx.sucesos).toContainEqual({
      tipo: 'llegadaTraslado',
      dominioId: 'dom.origen',
      fecha: fecha(13),
      destinoId: 'dom.destino',
    })
  })

  it('una vuelta ya pasada se cobra el primer día del avance', () => {
    // La compra de Tharbad vuelve, en este estado, el 10 en vez del 25: ya había pasado cuando arranca el avance.
    const estado: EstadoPartida = {
      ...estadoDe(documentoDeEjemplo()),
      caravanas: estadoDe(documentoDeEjemplo()).caravanas.map((c) =>
        c.id === CARAVANA.compraViveresTharbad ? { ...c, vuelta: fecha(10) } : c,
      ),
    }
    const ctx = contexto(estado, fecha(19))
    pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(13)))
    expect(caravana(ctx, CARAVANA.compraViveresTharbad)?.estado).toBe('terminada')
    const flujo = ctx.flujos.find((f) => f.dominioId === DOM.bree && f.recursoId === RECURSO.viveres)
    expect(flujo?.fecha).toEqual(fecha(13))
  })

  it('las ventas no las toca: sigue esperando a pasoVueltaDeVentas', () => {
    const ctx = contexto(ejemplo(), fecha(19))
    pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(18)))
    expect(caravana(ctx, CARAVANA.ventaCervezaFornost)?.estado).toBe('enRuta')
    expect(ctx.sucesos).toEqual([])
  })

  it('marca aplicada la entrada del almacén que esperaba a esta caravana (TC18)', () => {
    const base = conAsentamiento(estadoMinimo(fecha(12)), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      entradasAlmacen: [
        {
          id: 'ea.prueba',
          dominioId: 'dom.aldea',
          recursoId: RECURSO.madera,
          cantidad: 20,
          operacion: 'compra',
          fecha: fecha(1),
          caravanaId: 'car.prueba',
          aplicada: false,
        },
      ],
      caravanas: [
        {
          id: 'car.prueba',
          dominioId: 'dom.aldea',
          operacion: 'compra',
          mercadoId: 'mercado.dom.aldea',
          carga: { recursoId: RECURSO.madera, cantidad: 20 },
          precioUnidad: { base: 10000 },
          importe: { base: 200000 },
          salida: fecha(1),
          vuelta: fecha(13),
          estado: 'enRuta',
        },
      ],
    }
    const ctx = crearContexto(estado, fecha(13), {
      avanceId: AVANCE_PRUEBA,
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(13)))
    expect(ctx.entradasAlmacen[0].aplicada).toBe(true)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/pasos/caravanas.test.ts
```

Fallo esperado: las 5 pruebas de `pasoVueltaDeVentas` (fase 3) siguen en verde; las 6 nuevas fallan porque `pasoLlegadaDeCaravanas` todavía no existe. La hora y la duración pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/pasos/caravanas.test.ts (11 tests | 6 failed) 32ms
   ❯ pasoLlegadaDeCaravanas (6)
     × la compra de Tharbad llega el 25: +300 víveres en Bree, terminada y suceso vueltaCaravana 6ms
     × llega con el almacén lleno y pierde lo que no cabe 2ms
     × un traslado entra en el destino, crea la fila si falta, y empuja llegadaTraslado 1ms
     × una vuelta ya pasada se cobra el primer día del avance 2ms
     × las ventas no las toca: sigue esperando a pasoVueltaDeVentas 1ms
     × marca aplicada la entrada del almacén que esperaba a esta caravana (TC18) 1ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/pasos/caravanas.test.ts > pasoLlegadaDeCaravanas > la compra de Tharbad llega el 25: +300 víveres en Bree, terminada y suceso vueltaCaravana
TypeError: pasoLlegadaDeCaravanas is not a function
 ❯ src/dominio/motor/pasos/caravanas.test.ts:148:5
    146|   it('la compra de Tharbad llega el 25: +300 víveres en Bree, terminad…
    147|     const ctx = contexto(ejemplo(), fecha(25))
    148|     pasoLlegadaDeCaravanas(ctx, diaDe(ctx, fecha(25)))
       |     ^
    149|     expect(filaEn(ctx, DOM.bree, RECURSO.viveres)?.cantidad).toBe(610)
    150|     expect(caravana(ctx, CARAVANA.compraViveresTharbad)?.estado).toBe(…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

(las otras 5 fallan igual, con «pasoLlegadaDeCaravanas is not a function»)

 Test Files  1 failed (1)
      Tests  6 failed | 5 passed (11)
   Start at  20:25:31
   Duration  1.29s (transform 60%, import 35%, tests 4%, worker 1%)
```

- [ ] **Paso 3: Añadir `pasoLlegadaDeCaravanas` en `caravanas.ts`**

En `src/dominio/motor/pasos/caravanas.ts`, sustituye las líneas de importación:

```ts
import { compararFechas } from '../../calendario/fecha'
import { CATEGORIA, RECURSO } from '../../catalogo/inicial'
import type { Importe } from '../../dinero/importe'
import { cobrar } from '../caja'
import { anadirMovimiento, type Contexto, type Dia } from '../contexto'
import { conceptoVentaCaravana, nombreDeRecurso } from '../textos'
```

por esto, que añade el import de `sumarAlAlmacen`:

```ts
import { compararFechas } from '../../calendario/fecha'
import { CATEGORIA, RECURSO } from '../../catalogo/inicial'
import type { Importe } from '../../dinero/importe'
import { sumarAlAlmacen } from '../almacen'
import { cobrar } from '../caja'
import { anadirMovimiento, type Contexto, type Dia } from '../contexto'
import { conceptoVentaCaravana, nombreDeRecurso } from '../textos'
```

`pasoVueltaDeVentas` no cambia. Añade esta función **al final** del archivo, detrás de `pasoVueltaDeVentas`:

```ts

/**
 * Paso 7, mercancía: una caravana de compra o de traslado en ruta con vuelta ≤ día entra en el almacén de
 * destino y queda terminada (§7 l.1152-1154; §9 l.1279). Las entradas que esperaban a esta caravana (TC18)
 * se marcan aplicadas. Las ventas no las toca esta función: las cobra `pasoVueltaDeVentas`, que no cambia.
 */
export function pasoLlegadaDeCaravanas(ctx: Contexto, dia: Dia): void {
  ctx.caravanas.forEach((caravana, indice) => {
    if (caravana.operacion === 'venta' || caravana.estado !== 'enRuta') {
      return
    }
    if (compararFechas(caravana.vuelta, dia.fecha) > 0) {
      return
    }
    const destino = caravana.operacion === 'compra' ? caravana.dominioId : caravana.destinoId
    if (destino === undefined) {
      throw new Error(`No existe destino para «${caravana.id}»`)
    }
    sumarAlAlmacen(ctx, dia, destino, caravana.carga.recursoId, caravana.carga.cantidad)
    ctx.caravanas[indice] = { ...caravana, estado: 'terminada' }
    ctx.entradasAlmacen.forEach((entrada, indiceEntrada) => {
      if (entrada.caravanaId === caravana.id) {
        ctx.entradasAlmacen[indiceEntrada] = { ...entrada, aplicada: true }
      }
    })
    if (caravana.operacion === 'compra') {
      if (caravana.mercadoId === undefined) {
        throw new Error(`No existe mercado para «${caravana.id}»`)
      }
      ctx.sucesos.push({ tipo: 'vueltaCaravana', dominioId: caravana.dominioId, fecha: dia.fecha, mercadoId: caravana.mercadoId })
    } else {
      ctx.sucesos.push({ tipo: 'llegadaTraslado', dominioId: caravana.dominioId, fecha: dia.fecha, destinoId: destino })
    }
  })
}
```

Dos detalles de la implementación:
- `destino` es `caravana.dominioId` en una compra (el asentamiento que la pidió) y `caravana.destinoId` en un traslado; el esquema `Caravana` exige que un traslado siempre tenga `destinoId` (`modelo/comercio.ts`), así que el `throw` solo saltaría con datos corruptos.
- El `forEach` sobre `ctx.entradasAlmacen` va **dentro** del `forEach` de caravanas, no aparte: así solo se recorren las entradas cuando de verdad llega una caravana de compra o traslado ese día, en vez de mirar las 30 y pico entradas del almacén en cada paso de cada día.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/pasos/caravanas.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  20:25:50
   Duration  0.99s (transform 61%, import 34%, tests 3%, worker 2%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0.

**Sobre el recuento de `npm test`** (mismo aviso que en la tarea 11). Esta tarea modifica un archivo de prueba que ya existía (no crea uno nuevo) y `caravanas.ts` es «M», no «N», así que no suma nada a `pureza.test.ts`: solo añade **6 pruebas y 0 archivos** a lo que deje la tarea 12. En el clon de verificación de este grupo, tras la tarea 12 (935 pruebas, 83 archivos), esta tarea deja:

```text
 Test Files  83 passed (83)
      Tests  941 passed (941)
```

En la cadena real de este plan, la tarea 12 deja 1.059 pruebas en 89 archivos, así que esta tarea 13 cierra en **1.065 pruebas en 89 archivos**.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/pasos/caravanas.ts src/dominio/motor/pasos/caravanas.test.ts
git commit -m "feat(motor): paso 7, llegada de compras y traslados al almacén de destino" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF» por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-4 1f29939] feat(motor): paso 7, llegada de compras y traslados al almacén de destino
 2 files changed, 184 insertions(+), 2 deletions(-)
```

**Avisos que esta tarea deja escritos:**

1. Esta tarea **no** toca `eventosDeDineroEl` ni el resto de `caravanas.test.ts`: ese import sigue tal cual porque lo retira la tarea 4, no esta. Si al ejecutar esta tarea la 4 ya está aplicada, ese import habrá cambiado a `eventosConEfectosEl` en otra parte del archivo (el ayudante local `diaDe`) y no hay que tocar nada por esta tarea: solo asegúrate de que `caravanas.test.ts` sigue compilando y en verde.
2. `pasoLlegadaDeCaravanas` deja `mercadoId` obligatorio para una compra en tiempo de ejecución (el `throw` de la línea final), pero el esquema `Caravana` ya lo exige para toda compra o venta (`modelo/comercio.ts`, `exige(c => c.operacion === 'traslado' || (c.mercadoId !== undefined …))`): en una partida válida ese `throw` no se alcanza nunca, igual que el de `pasoVueltaDeVentas` en la fase 3.
3. La tarea 14 añade `pasoLlegadaDeCaravanas` a `PASOS_DEL_DIA` con `numero: 7`, **después** de `pasoVueltaDeVentas` (también `numero: 7`): el orden entre los dos no importa para el resultado (tocan cada uno su propia mitad de `ctx.caravanas`, sin solaparse), pero mantén ese orden porque es el que fija el contrato (§3.9) y el que comprueban las pruebas de la tarea 14.

---

### Tarea 14 · El bucle con los pasos del almacén (4 nuevas + reescritas)

Esta tarea junta lo que dejaron las tareas 9 a 13 (los pasos 4, 5, 3, 6 y 7 de mercancía) en `PASOS_DEL_DIA`, la lista que `recorrerDias` recorre cada día (`motor/bucle.ts`). El cuerpo de `recorrerDias` **no cambia**: solo la lista y sus importaciones. El orden completo de §9 l.1272-1282 queda:

```
1 eventos → 3 inicio → 4 producción → 5 consumo → 6 obras → 7 vueltaDeVentas → 7 llegadaDeCaravanas → 8 cobros → 9 pagos
```

(el paso 2, población, no tiene entrada propia: `habitantesEl` se calcula al vuelo dentro del paso 5, técnica TC4). Dentro de un mismo día, la producción entra antes del consumo (por eso una caravana que llega el mismo día que se agotan los víveres no evita la falta de ese día) y las dos entradas de mercancía del paso 7 van después de que `pasoVueltaDeVentas` cobre las ventas que vuelven.

Con todos los pasos ya enganchados, esta tarea comprueba tres oráculos del contrato sobre el **ejemplo completo** («La Sombra del Este», 12 de abril de 1640) que hasta ahora ningún paso suelto podía dar por sí solo, porque cruzan producción, consumo, obras y caravanas del mismo avance:

- **O1** (7 días, hasta el 19 de abril): las existencias finales de Bree y Archet.
- **O3** (30 días, del 13 de abril al 12 de mayo): las cantidades finales de esa previsión.
- **O11**, la regresión del avance del 10 al 12 de abril: desde `SNAPSHOT_10_ABRIL` (que ya trae, precalculados, dos días menos de acumulado y de consumo que el estado del 12), `recorrerDias` hasta el 12 tiene que devolver **exactamente** las mismas existencias y los mismos acumulados de producción que trae `ejemplo/asentamientosAlmacen.ts` para ese día — es la comprobación más fuerte de esta tarea, porque no compara contra un número escrito a mano sino contra el propio estado «actual» del ejemplo.

Al entrar la caravana de Tharbad en `PASOS_DEL_DIA` (llega el 25 de abril, dentro del avance de prueba de 19 días que usa `cambios.test.ts`), el hecho «Caravana de Tharbad de vuelta · 25 de abril» empieza a salir en `cambiosDelAvance` entre el tributo de Archet (19) y el de Bree (30): esa prueba de la fase 3 se reescribe aquí (§7 del contrato). La lista completa de los 9 hechos de O11 a 19 días, con las filas `almacen` de `cambios`, la reescribe la tarea 15 (que también añade los hechos `obraTerminada` y `llegadaTraslado`, que `cambios.ts` todavía ignora con su `else { continue }` de la tarea 8).

**Reglas de la especificación que implementa:**

- **§9 l.1272-1282, orden del día.** Fija los nueve pasos y su número; esta tarea es la que por fin los deja todos en la lista, en el orden exacto del contrato (§3.9).
- **TC4.** «`PASOS_DEL_DIA` queda `[1 eventos, 3 inicio, 4 produccion, 5 consumo, 6 obras, 7 vueltaDeVentas, 7 llegadaDeCaravanas, 8 cobros, 9 pagos]`. El paso 2 no tiene entrada (…). `pasoVueltaDeVentas` no se toca; el cuerpo de `recorrerDias` solo añade `flujos` al `Recorrido` (eso ya lo hizo la tarea 8).»
- **§4, «Orden del día».** «En un mismo día la producción entra antes del consumo y lo que llega en caravana entra después (por eso la caravana del 25 no evita la falta del 25 y «Caben 1.148» se mide tras el consumo del 20).»
- **D-052 y TC3** (para el hecho de Tharbad que entra en esta tarea en `cambios.test.ts`): «Qué ha pasado» añade las compras y los traslados que llegan, con la posición de su `dominioId`; el hecho de una compra reutiliza `hechoCaravanaDeVuelta` de la fase 3 porque el suceso reutiliza `vueltaCaravana` (TC3).

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Modificar: `src/dominio/motor/bucle.ts` (solo `PASOS_DEL_DIA` y sus importaciones; el resto no cambia)
- Prueba: `src/dominio/motor/bucle.test.ts` (reescribe la prueba de `PASOS_DEL_DIA`; añade 4 pruebas nuevas)
- Prueba: `src/dominio/motor/cambios.test.ts` (reescribe la lista de hechos de la prueba de 19 días)

- [ ] **Paso 1: Escribir las pruebas que fallan**

Qué comprueba cada bloque nuevo o reescrito de `bucle.test.ts`: `PASOS_DEL_DIA` lleva los nueve pasos, con esos números (que nunca bajan) y esos nombres, en ese orden; el ejemplo a 7 días da las existencias de O1; a 30 días da las cantidades finales de O3; la regresión del 10 al 12 de abril da las existencias y los acumulados de producción de O11, comparados contra `EXISTENCIAS` y `EDIFICIOS` del propio `ejemplo/asentamientosAlmacen.ts`. La prueba de `pasoEventos` (T4) no cambia en esta tarea.

En `src/dominio/motor/bucle.test.ts`, sustituye las líneas de importación:

```ts
import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, sumarDias, type Fecha } from '../calendario/fecha'
import type { Recurrencia } from '../calendario/recurrencia'
import { CATEGORIA } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { AVANCE, EVENTO } from '../ejemplo/ids'
import { SNAPSHOT_10_ABRIL } from '../ejemplo/avances'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import type { RecurrenteDinero } from '../modelo/movimientos'
import { PASOS_DEL_DIA, pasoEventos, recorrerDias } from './bucle'
import { crearContexto, type Dia } from './contexto'
import { idsEnSerie } from './ids'
import { conAsentamiento, congelar, estadoMinimo } from './pruebas/constructores'
import type { OpcionesSimulacion } from './tipos'
```

por esto (añade `RECURSO`, `DOM`, `EDIFICIOS`/`EXISTENCIAS` del ejemplo y el tipo `Existencia`):

```ts
import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, sumarDias, type Fecha } from '../calendario/fecha'
import type { Recurrencia } from '../calendario/recurrencia'
import { CATEGORIA, RECURSO } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { AVANCE, DOM, EVENTO } from '../ejemplo/ids'
import { SNAPSHOT_10_ABRIL } from '../ejemplo/avances'
import { EDIFICIOS, EXISTENCIAS } from '../ejemplo/asentamientosAlmacen'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Existencia } from '../modelo/almacen'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import type { RecurrenteDinero } from '../modelo/movimientos'
import { PASOS_DEL_DIA, pasoEventos, recorrerDias } from './bucle'
import { crearContexto, type Dia } from './contexto'
import { idsEnSerie } from './ids'
import { conAsentamiento, congelar, estadoMinimo } from './pruebas/constructores'
import type { OpcionesSimulacion } from './tipos'
```

Sustituye la primera prueba del `describe('PASOS_DEL_DIA y pasoEventos', …)` (la de los números; la de `pasoEventos`, justo debajo, no se toca):

```ts
  it('lleva los pasos del almacén y del dinero de §9, con los números en orden y sin bajar nunca', () => {
    expect(PASOS_DEL_DIA.map((p) => p.numero)).toEqual([1, 7, 8, 9])
    expect(PASOS_DEL_DIA.map((p) => p.nombre)).toEqual(['eventos', 'vueltaDeVentas', 'cobros', 'pagos'])
  })
```

por esto:

```ts
  it('lleva los pasos del almacén y del dinero de §9, con los números en orden y sin bajar nunca', () => {
    expect(PASOS_DEL_DIA.map((p) => p.numero)).toEqual([1, 3, 4, 5, 6, 7, 7, 8, 9])
    expect(PASOS_DEL_DIA.map((p) => p.nombre)).toEqual([
      'eventos',
      'inicio',
      'produccion',
      'consumo',
      'obras',
      'vueltaDeVentas',
      'llegadaDeCaravanas',
      'cobros',
      'pagos',
    ])
  })
```

Por último, añade este bloque **al final** del `describe('recorrerDias', …)`, justo antes de su llave de cierre `})`:

```ts

  /** La fila de `existencias` de ese dominio y recurso. */
  function filaDe(existencias: readonly Existencia[], dominioId: string, recursoId: string): Existencia | undefined {
    return existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
  }

  it('los números de PASOS_DEL_DIA no bajan nunca', () => {
    const numeros = PASOS_DEL_DIA.map((p) => p.numero)
    for (let i = 1; i < numeros.length; i++) {
      expect(numeros[i]).toBeGreaterThanOrEqual(numeros[i - 1])
    }
  })

  it('el ejemplo a 7 días (12 al 19 de abril) da las existencias de O1', () => {
    const recorrido = recorrerDias(estadoDe(documentoDeEjemplo()), sumarDias(HOY, 7), opciones())
    const existencias = recorrido.estadoNuevo.existencias
    expect(filaDe(existencias, DOM.bree, RECURSO.viveres)?.cantidad).toBeCloseTo(92.667, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.madera)?.cantidad).toBeCloseTo(385.56, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.piedra)?.cantidad).toBeCloseTo(196.667, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.cerveza)?.cantidad).toBeCloseTo(83.96, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.lana)?.cantidad).toBe(47)
    expect(filaDe(existencias, DOM.bree, RECURSO.arcilla)?.cantidad).toBe(150)
    expect(filaDe(existencias, DOM.bree, RECURSO.hierro)?.cantidad).toBe(64)
    expect(filaDe(existencias, DOM.archet, RECURSO.viveres)?.cantidad).toBeCloseTo(827.667, 3)
  })

  it('a 30 días (13 de abril al 12 de mayo), da las cantidades finales de O3', () => {
    const recorrido = recorrerDias(estadoDe(documentoDeEjemplo()), sumarDias(HOY, 30), opciones())
    const existencias = recorrido.estadoNuevo.existencias
    expect(filaDe(existencias, DOM.bree, RECURSO.viveres)?.cantidad).toBeCloseTo(48.667, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.madera)?.cantidad).toBeCloseTo(297.4, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.piedra)?.cantidad).toBeCloseTo(263.333, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.arcilla)?.cantidad).toBeCloseTo(156.667, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.hierro)?.cantidad).toBe(64)
    expect(filaDe(existencias, DOM.bree, RECURSO.cerveza)?.cantidad).toBeCloseTo(78.4, 3)
    expect(filaDe(existencias, DOM.bree, RECURSO.lana)?.cantidad).toBe(95)
    expect(filaDe(existencias, DOM.archet, RECURSO.viveres)?.cantidad).toBeCloseTo(590, 3)
  })

  it('la regresión 10 → 12 de abril da las existencias y los acumulados de O11', () => {
    const entrada = congelar(structuredClone(SNAPSHOT_10_ABRIL))
    const recorrido = recorrerDias(entrada, HOY, opciones())
    const existencias = recorrido.estadoNuevo.existencias
    for (const fila of EXISTENCIAS) {
      expect(filaDe(existencias, fila.dominioId, fila.recursoId)?.cantidad).toBeCloseTo(fila.cantidad, 3)
    }
    const acumulados = new Map(
      recorrido.estadoNuevo.edificios.flatMap((e) => e.producciones.map((p) => [p.id, p.acumulado.sumaFactores])),
    )
    for (const edificio of EDIFICIOS) {
      for (const produccion of edificio.producciones) {
        expect(acumulados.get(produccion.id)).toBeCloseTo(produccion.acumulado.sumaFactores, 6)
      }
    }
  })
```

En `src/dominio/motor/cambios.test.ts`, dentro de `describe('cambiosDelAvance: hechos', …)`, sustituye:

```ts
    expect(hechos(cambiosTras(estadoDe(documentoDeEjemplo()), 19))).toEqual([
      'Caravana de Fornost de vuelta · 18 de abril',
      'Tributo de Archet pagado · 19 de abril',
      'Tributo de Bree pagado · 30 de abril',
      'Impuestos de locales de Bree cobrados · 1 de mayo',
    ])
```

por esto (entra la vuelta de Tharbad entre el tributo de Archet y el de Bree):

```ts
    expect(hechos(cambiosTras(estadoDe(documentoDeEjemplo()), 19))).toEqual([
      'Caravana de Fornost de vuelta · 18 de abril',
      'Tributo de Archet pagado · 19 de abril',
      'Caravana de Tharbad de vuelta · 25 de abril',
      'Tributo de Bree pagado · 30 de abril',
      'Impuestos de locales de Bree cobrados · 1 de mayo',
    ])
```

- [ ] **Paso 2: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/motor/bucle.test.ts src/dominio/motor/cambios.test.ts
```

Fallo esperado: `PASOS_DEL_DIA` sigue con los cuatro pasos de la fase 3 y `recorrerDias` todavía no simula ni el almacén ni las obras ni las caravanas de mercancía, así que las cuatro pruebas nuevas o reescritas de `bucle.test.ts` fallan, y también la de `cambios.test.ts` (la caravana de Tharbad no vuelve porque nada la mueve todavía). Las demás pruebas de los dos archivos siguen en verde. La hora y la duración pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/cambios.test.ts (5 tests | 1 failed) 42ms
   ❯ cambiosDelAvance: hechos (3)
     × escribe el mes si el avance cruza de mes: del 12 de abril al 1 de mayo 10ms
 ❯ src/dominio/motor/bucle.test.ts (11 tests | 4 failed) 41ms
   ❯ PASOS_DEL_DIA y pasoEventos (2)
     × lleva los pasos del almacén y del dinero de §9, con los números en orden y sin bajar nunca 9ms
   ❯ recorrerDias (9)
     × el ejemplo a 7 días (12 al 19 de abril) da las existencias de O1 2ms
     × a 30 días (13 de abril al 12 de mayo), da las cantidades finales de O3 3ms
     × la regresión 10 → 12 de abril da las existencias y los acumulados de O11 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/bucle.test.ts > PASOS_DEL_DIA y pasoEventos > lleva los pasos del almacén y del dinero de §9, con los números en orden y sin bajar nunca
AssertionError: expected [ 1, 7, 8, 9 ] to deeply equal [ 1, 3, 4, 5, 6, 7, 7, 8, 9 ]

- Expected
+ Received

  [
    1,
-   3,
-   4,
-   5,
-   6,
-   7,
    7,
    8,
    9,
  ]

 ❯ src/dominio/motor/bucle.test.ts:45:48

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/5]⎯

 FAIL  src/dominio/motor/bucle.test.ts > recorrerDias > el ejemplo a 7 días (12 al 19 de abril) da las existencias de O1
AssertionError: expected 310 to be close to 92.667, received difference is 217.333, but expected 0.0005
 ❯ src/dominio/motor/bucle.test.ts:191:70

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/5]⎯

 FAIL  src/dominio/motor/bucle.test.ts > recorrerDias > a 30 días (13 de abril al 12 de mayo), da las cantidades finales de O3
AssertionError: expected 310 to be close to 48.667, received difference is 261.333, but expected 0.0005
 ❯ src/dominio/motor/bucle.test.ts:204:70

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/5]⎯

 FAIL  src/dominio/motor/bucle.test.ts > recorrerDias > la regresión 10 → 12 de abril da las existencias y los acumulados de O11
AssertionError: expected 392.6666666666667 to be close to 310, received difference is 82.66666666666669, but expected 0.0005
 ❯ src/dominio/motor/bucle.test.ts:219:77

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/5]⎯

 FAIL  src/dominio/motor/cambios.test.ts > cambiosDelAvance: hechos > escribe el mes si el avance cruza de mes: del 12 de abril al 1 de mayo
AssertionError: expected [ …(4) ] to deeply equal [ …(5) ]

- Expected
+ Received

  [
    "Caravana de Fornost de vuelta · 18 de abril",
    "Tributo de Archet pagado · 19 de abril",
-   "Caravana de Tharbad de vuelta · 25 de abril",
    "Tributo de Bree pagado · 30 de abril",
    "Impuestos de locales de Bree cobrados · 1 de mayo",
  ]

 ❯ src/dominio/motor/cambios.test.ts:70:69

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯


 Test Files  2 failed (2)
      Tests  5 failed | 11 passed (16)
   Start at  20:26:39
   Duration  1.29s (transform 59%, import 34%, tests 6%, worker 1%)
```

- [ ] **Paso 3: Enganchar los pasos del almacén en `PASOS_DEL_DIA`**

En `src/dominio/motor/bucle.ts`, sustituye las líneas de importación:

```ts
import { aNumeroDeDia, desdeNumeroDeDia, type Fecha } from '../calendario/fecha'
import { eventosConEfectosEl } from '../eventos/efectos'
import type { PersonaEntidad } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { crearContexto, estadoFinal, type Contexto, type Dia } from './contexto'
import { cerrarDiarios } from './diarios'
import { pasoVueltaDeVentas } from './pasos/caravanas'
import { pasoCobros } from './pasos/cobros'
import { pasoPagos } from './pasos/pagos'
import type { FlujoAlmacen, OpcionesSimulacion, Suceso } from './tipos'
```

por esto (añade `pasoLlegadaDeCaravanas`, `pasoConsumo`, `pasoInicio`, `pasoObras` y `pasoProduccion`):

```ts
import { aNumeroDeDia, desdeNumeroDeDia, type Fecha } from '../calendario/fecha'
import { eventosConEfectosEl } from '../eventos/efectos'
import type { PersonaEntidad } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { crearContexto, estadoFinal, type Contexto, type Dia } from './contexto'
import { cerrarDiarios } from './diarios'
import { pasoLlegadaDeCaravanas, pasoVueltaDeVentas } from './pasos/caravanas'
import { pasoCobros } from './pasos/cobros'
import { pasoConsumo } from './pasos/consumo'
import { pasoInicio } from './pasos/inicio'
import { pasoObras } from './pasos/obras'
import { pasoPagos } from './pasos/pagos'
import { pasoProduccion } from './pasos/produccion'
import type { FlujoAlmacen, OpcionesSimulacion, Suceso } from './tipos'
```

`pasoEventos` no cambia. Sustituye `PASOS_DEL_DIA`:

```ts
/** Los pasos que ya tiene el motor, en el orden de §9: 1 eventos, 7 vueltaDeVentas, 8 cobros y 9 pagos (T15). */
export const PASOS_DEL_DIA: readonly PasoDelDia[] = [
  { numero: 1, nombre: 'eventos', paso: pasoEventos },
  { numero: 7, nombre: 'vueltaDeVentas', paso: pasoVueltaDeVentas },
  { numero: 8, nombre: 'cobros', paso: pasoCobros },
  { numero: 9, nombre: 'pagos', paso: pasoPagos },
]
```

por esto:

```ts
/** Los pasos del día en el orden de §9 l.1272-1282: eventos, almacén y dinero, todos juntos ya (T9-T13). */
export const PASOS_DEL_DIA: readonly PasoDelDia[] = [
  { numero: 1, nombre: 'eventos', paso: pasoEventos },
  { numero: 3, nombre: 'inicio', paso: pasoInicio },
  { numero: 4, nombre: 'produccion', paso: pasoProduccion },
  { numero: 5, nombre: 'consumo', paso: pasoConsumo },
  { numero: 6, nombre: 'obras', paso: pasoObras },
  { numero: 7, nombre: 'vueltaDeVentas', paso: pasoVueltaDeVentas },
  { numero: 7, nombre: 'llegadaDeCaravanas', paso: pasoLlegadaDeCaravanas },
  { numero: 8, nombre: 'cobros', paso: pasoCobros },
  { numero: 9, nombre: 'pagos', paso: pasoPagos },
]
```

El resto de `bucle.ts` (la interfaz `Recorrido`, que ya trae `flujos` desde la tarea 8, y el cuerpo de `recorrerDias`) no cambia.

- [ ] **Paso 4: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/motor/bucle.test.ts src/dominio/motor/cambios.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  2 passed (2)
      Tests  16 passed (16)
   Start at  20:26:50
   Duration  2.04s (transform 64%, import 31%, tests 4%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas, el lint y el build**

```bash
npx tsc -b
npm test
npm run lint
npm run build
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0; `npm run build` termina con «✓ built in …ms» sin errores (esta tarea cierra el bucle del día completo, así que además de `tsc -b` y `npm test` conviene comprobar aquí que `vite build` sigue empaquetando la app entera).

**Sobre el recuento de `npm test`** (mismo aviso que en la tarea 11). Esta tarea añade 4 pruebas nuevas a `bucle.test.ts` y reescribe (sin añadir ni quitar casos) una prueba de `bucle.test.ts` y otra de `cambios.test.ts`; `bucle.ts` es «M», no «N», así que no suma nada a `pureza.test.ts`: **4 pruebas y 0 archivos** más que lo que deje la tarea 13. En el clon de verificación de este grupo, tras la tarea 13 (941 pruebas, 83 archivos), esta tarea deja:

```text
 Test Files  83 passed (83)
      Tests  945 passed (945)
```

En la cadena real de este plan, la tarea 13 deja 1.065 pruebas en 89 archivos, así que esta tarea 14 cierra en **1.069 pruebas en 89 archivos**.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/bucle.ts src/dominio/motor/bucle.test.ts src/dominio/motor/cambios.test.ts
git commit -m "feat(motor): PASOS_DEL_DIA con inicio, produccion, consumo, obras y llegadaDeCaravanas" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF» por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-4 531bb88] feat(motor): PASOS_DEL_DIA con inicio, produccion, consumo, obras y llegadaDeCaravanas
 3 files changed, 87 insertions(+), 10 deletions(-)
```

**Avisos que esta tarea deja escritos:**

1. `cambios.ts` **no** se toca en esta tarea: los hechos `obraTerminada` y `llegadaTraslado` siguen sin generar una línea en «Qué ha pasado» (el `else { continue }` de la tarea 8 los descarta a propósito) hasta la tarea 15, que también reescribe la lista completa de 9 hechos de O11 a 19 días y las cuatro filas `almacen` de la regresión 10 → 12, con `toBeCloseTo` (310,00000000000006 no es 310, TC1).
2. Los invariantes de `entregable.test.ts` (esquema, `validarCopia`, deshacer) ya estaban en verde antes de esta tarea y siguen en verde después: esta tarea no los toca, pero es la primera que dispara la simulación completa del almacén dentro de ese archivo, así que si algo de las tareas 9 a 13 dejó una fila fuera de la tolerancia (`TOLERANCIA = 1e-6`) o una cantidad por encima de su capacidad exacta (§9 aviso 12: «la capacidad es estricta»), es en el `npm test` de esta tarea donde se vería.
3. La prueba de la regresión 10 → 12 compara contra `EXISTENCIAS` y `EDIFICIOS` de `ejemplo/asentamientosAlmacen.ts` en vez de escribir los números a mano: si una revisión posterior de la fase 3 cambiara esas constantes del ejemplo, esta prueba seguiría siendo válida sin tocarla (compara contra la fuente, no contra una copia).

---

### Tarea 15 · Cambios del avance: almacenes y hechos (3 nuevas + reescritas)

La fase 3 dejó `cambiosDelAvance` devolviendo solo las filas `saldo` y los hechos de dinero (tributo pagado, locales cobrados, caravana de vuelta). Con el almacén ya simulado (tareas 3 a 14), P4 y P5 necesitan además:

- una fila `almacen` por cada recurso cuya cantidad cambió de verdad durante el avance;
- los hechos nuevos de «Qué ha pasado»: obras terminadas, traslados llegados y eventos que acaban dentro del avance.

Esta tarea no toca ningún paso del motor: solo lee lo que los pasos 3 a 14 ya dejaron en `recorrido` (`estadoNuevo.existencias` y los sucesos `obraTerminada` y `llegadaTraslado`) y en `estado.eventos`.

**Reglas de la especificación que implementa:**

- **P5, «Almacenes» y «Qué ha pasado»** (gen l.570-587, `build-artboards.mjs`). La vista del resumen del avance pinta, debajo de los saldos, una lista «Almacenes» («Bree · víveres: 310 → 93 sacos») y una lista «Qué ha pasado» con las obras terminadas, la caravana de vuelta y el tributo pagado, cada una con su día. `cambiosDelAvance` es la función pura que arma esos datos; la fase 6 los pintará.
- **D-052** (`decisiones-fase-4.md`): «"Qué ha pasado", en el resumen del avance, añade a lo de D-032: las obras terminadas (`Obra «Reparación de la puerta del sur» terminada · 17`), los eventos que acaban durante el avance, con sus días (`Feria de primavera · 15 al 17`), y las compras y los traslados que llegan (`Caravana de Tharbad de vuelta · 25`, `Caravana de Bree llegada a Archet · 25`). Van por orden de su primer día.» Son los hechos de P5; «reparada» o «celebrada» obligarían a saber el género de cada nombre del asentamiento.
- **TC11** (`decisiones-fase-4.md`): «Filas `almacen` de `cambios`: detrás de las de saldo y delante de los hechos; solo las que cambian más que la tolerancia; en el orden de los dominios y, dentro, en el de `existencias`; una fila nueva sale con `antes` 0.»
- **TC12**: «Orden de los hechos: por el número de su primer día (el inicio del evento) y la posición del dominio; a igualdad, primero los que salen de sucesos y luego los de eventos (el `sort` es estable).»
- **TC3**: la llegada de una compra reutiliza el suceso `vueltaCaravana` (ya da «Caravana de Tharbad de vuelta · 25», TC3 de la tarea 8); `obraTerminada` y `llegadaTraslado` son los dos sucesos nuevos de la tarea 8 que esta tarea por fin pinta como hechos.
- **§3.10 del contrato** (`contrato.md`): `cambiosDelAvance(estado, recorrido, avanceId, primerDia, hasta)` (misma firma que en la fase 3) devuelve `[...saldos, ...almacenes, ...hechos]`. Almacenes: para cada dominio de `estado.dominios` y, dentro, cada fila de `recorrido.estadoNuevo.existencias` de ese dominio, en su orden: `antes` = la cantidad en `estado.existencias` (0 si no estaba), `despues` = la nueva; solo si `|despues − antes| > TOLERANCIA`. Hechos: los de la fase 3, más `obraTerminada` → `hechoObraTerminada(nombre, dia(fecha))` y `llegadaTraslado` → `hechoTrasladoLlegado(nombre del dominio, nombre del destino, dia(fecha))`, con la posición de su `dominioId`; después, cada evento de `estado.eventos` cuyo fin (`inicio + duracionDias − 1`) cae entre `primerDia` y `hasta` → `hechoEventoTerminado(nombre, formatearTramoDelAvance(inicio, fin, primerDia, hasta))`, con `numero = aNumeroDeDia(inicio)`, la posición de su dominio y, en un evento de partida, **sin** la clave `dominioId`. Todos se ordenan por `numero` y `posicion` con el `sort` estable de siempre.
- **O11** (`contrato.md` §6, con `ejemplo-cifras.md` y `fase-4/sim/`): las cifras exactas de las filas `almacen` y los hechos a 7 y a 19 días, y la regresión del 10 al 12 de abril, que esta tarea reproduce letra por letra en las pruebas.

**Archivos:**
- Modificar: `src/dominio/motor/cambios.ts`
- Prueba: `src/dominio/motor/cambios.test.ts` (se reescribe entero), `src/dominio/motor/entregable.test.ts` (una sola prueba, l.213-241 del clon)

- [ ] **Paso 1: Reescribir `motor/cambios.test.ts` y ver que falla**

Sustituye **todo** el contenido de `src/dominio/motor/cambios.test.ts` por este código:

```ts
import { describe, expect, it } from 'vitest'
import { sumarDias, type Fecha } from '../calendario/fecha'
import type { Recurrencia } from '../calendario/recurrencia'
import { CATEGORIA, RECURSO } from '../catalogo/inicial'
import { AVANCES, SNAPSHOT_10_ABRIL } from '../ejemplo/avances'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Edificio, ImpuestoRenta } from '../modelo/asentamiento'
import type { CambioAvance } from '../modelo/avance'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { recorrerDias } from './bucle'
import { cambiosDelAvance } from './cambios'
import { idsEnSerie } from './ids'
import { conAsentamiento, conFila, estadoMinimo } from './pruebas/constructores'

/** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** Recorre `dias` días desde la fecha actual y devuelve los cambios del avance «sim». */
function cambiosTras(estado: EstadoPartida, dias: number): CambioAvance[] {
  const desde = estado.partida.fechaActual
  const hasta = sumarDias(desde, dias)
  const recorrido = recorrerDias(estado, hasta, {
    avanceId: 'sim',
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
  return cambiosDelAvance(estado, recorrido, 'sim', sumarDias(desde, 1), hasta)
}

/** Solo los textos de los hechos, en su orden. */
function hechos(cambios: readonly CambioAvance[]): string[] {
  return cambios.flatMap((c) => (c.tipo === 'hecho' ? [c.texto] : []))
}

/** Un tributo de 1.000 mh de la aldea de prueba. */
function tributo(id: string, concepto: string, recurrencia: Recurrencia): ImpuestoRenta {
  return {
    id,
    dominioId: 'dom.aldea',
    sentido: 'tributo',
    concepto,
    base: 'fija',
    importe: { base: 1000 },
    categoriaId: CATEGORIA.tributos,
    recurrencia,
  }
}

describe('cambiosDelAvance: filas «saldo»', () => {
  it('da una fila por dominio en el orden de los dominios, también sin movimientos, como AVANCES[3] (T15: y las cuatro filas «almacen»)', () => {
    const cambios = cambiosTras(SNAPSHOT_10_ABRIL, 2)
    const esperados = AVANCES[3].cambios
    const saldos = cambios.filter((c) => c.tipo === 'saldo')
    expect(saldos).toEqual(esperados.filter((c) => c.tipo === 'saldo'))
    expect(saldos.map((c) => (c.tipo === 'saldo' ? c.movimientos : -1))).toEqual([2, 1, 0])
    // Regresión 10 → 12 (O11): las cuatro filas «almacen» vuelven a las cantidades ya guardadas en el ejemplo,
    // con el ruido de coma flotante que avisa TC1 (310,00000000000006 no es 310: toBeCloseTo, no toEqual).
    const almacenes = cambios.filter((c) => c.tipo === 'almacen')
    const almacenesEsperados = esperados.filter((c) => c.tipo === 'almacen')
    expect(almacenes).toHaveLength(almacenesEsperados.length)
    almacenes.forEach((a, i) => {
      if (a.tipo !== 'almacen') return
      const e = almacenesEsperados[i]
      if (e.tipo !== 'almacen') return
      expect(a.dominioId).toBe(e.dominioId)
      expect(a.recursoId).toBe(e.recursoId)
      expect(a.antes).toBeCloseTo(e.antes, 3)
      expect(a.despues).toBeCloseTo(e.despues, 3)
    })
  })

  it('P4: las tres filas «saldo», las cinco filas «almacen» de Bree y de Archet, y los cuatro hechos del 12 al 19 de abril (O1, O11)', () => {
    const cambios = cambiosTras(estadoDe(documentoDeEjemplo()), 7)
    expect(cambios.slice(0, 3)).toEqual([
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4651800, despues: 4717800, movimientos: 3 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 34060000, despues: 38050000, movimientos: 4 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 2500000, movimientos: 1 },
    ])
    const almacenes = cambios.filter((c) => c.tipo === 'almacen')
    expect(almacenes).toHaveLength(6)
    const redondeadas = almacenes.map((a) =>
      a.tipo === 'almacen' ? { dominioId: a.dominioId, recursoId: a.recursoId, antes: a.antes, despues: Math.round(a.despues * 1000) / 1000 } : a,
    )
    expect(redondeadas).toEqual([
      { dominioId: DOM.bree, recursoId: 'recurso.viveres', antes: 310, despues: 92.667 },
      { dominioId: DOM.bree, recursoId: 'recurso.madera', antes: 420, despues: 385.56 },
      { dominioId: DOM.bree, recursoId: 'recurso.piedra', antes: 180, despues: 196.667 },
      { dominioId: DOM.bree, recursoId: 'recurso.cerveza', antes: 90, despues: 83.96 },
      { dominioId: DOM.bree, recursoId: 'recurso.lana', antes: 35, despues: 47 },
      { dominioId: DOM.archet, recursoId: 'recurso.viveres', antes: 900, despues: 827.667 },
    ])
    expect(hechos(cambios)).toEqual([
      'Feria de primavera · 15 al 17',
      'Obra «Reparación de la puerta del sur» terminada · 17',
      'Caravana de Fornost de vuelta · 18',
      'Tributo de Archet pagado · 19',
    ])
  })

  it('una fila nueva del almacén sale con `antes: 0` (TC11, D-056)', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.prueba', nombre: 'Prueba', caja: 0 })
    const edificio: Edificio = {
      id: 'ed.prueba',
      dominioId: 'dom.prueba',
      tipoId: 'tipo.edificio',
      nombre: 'Cantera de prueba',
      estado: 'activo',
      trabajadoresNecesarios: 0,
      producciones: [
        {
          id: 'prod.prueba',
          recursoId: RECURSO.piedra,
          cantidad: 10,
          recurrencia: { tipo: 'diaria' },
          acumulado: { desde: sumarDias(HOY, 1), sumaFactores: 0 },
        },
      ],
    }
    const estado: EstadoPartida = { ...base, edificios: [edificio] }
    const cambios = cambiosTras(estado, 1)
    expect(cambios.filter((c) => c.tipo === 'almacen')).toEqual([
      { tipo: 'almacen', dominioId: 'dom.prueba', recursoId: RECURSO.piedra, antes: 0, despues: 10 },
    ])
  })

  it('solo las filas que cambian, en el orden de dominios y, dentro, de existencias', () => {
    const conA = conAsentamiento(estadoMinimo(HOY), { id: 'dom.a', nombre: 'A', caja: 0 })
    const conB = conAsentamiento(conA, { id: 'dom.b', nombre: 'B', caja: 0 })
    const conVideresDeA = conFila(conB, { dominioId: 'dom.a', recursoId: RECURSO.viveres, cantidad: 100 })
    const estado: EstadoPartida = {
      ...conFila(conFila(conVideresDeA, { dominioId: 'dom.a', recursoId: RECURSO.piedra, cantidad: 5 }), {
        dominioId: 'dom.b',
        recursoId: RECURSO.madera,
        cantidad: 5,
      }),
      poblaciones: [
        { dominioId: 'dom.a', habitantesIniciales: 30, cambios: [], consumos: [] },
        { dominioId: 'dom.b', habitantesIniciales: 0, cambios: [], consumos: [] },
      ],
    }
    // Solo víveres de A cambia (consumo de la ración); la piedra de A y la madera de B se quedan igual.
    const cambios = cambiosTras(estado, 1)
    const almacenes = cambios.filter((c) => c.tipo === 'almacen')
    expect(almacenes).toHaveLength(1)
    expect(almacenes[0]).toMatchObject({ tipo: 'almacen', dominioId: 'dom.a', recursoId: RECURSO.viveres })
  })
})

describe('cambiosDelAvance: hechos', () => {
  it('escribe el mes si el avance cruza de mes: del 12 de abril al 1 de mayo (O11: 19 días, con las obras y la caravana de Tharbad)', () => {
    expect(hechos(cambiosTras(estadoDe(documentoDeEjemplo()), 19))).toEqual([
      'Lluvias de primavera · 8 al 21 de abril',
      'Feria de primavera · 15 al 17 de abril',
      'Obra «Reparación de la puerta del sur» terminada · 17 de abril',
      'Caravana de Fornost de vuelta · 18 de abril',
      'Tributo de Archet pagado · 19 de abril',
      'Caravana de Tharbad de vuelta · 25 de abril',
      'Obra «Molino» terminada · 28 de abril',
      'Tributo de Bree pagado · 30 de abril',
      'Impuestos de locales de Bree cobrados · 1 de mayo',
    ])
  })

  it('escribe el año si el avance cruza de año, y un tributo pagado a medias no es un hecho', () => {
    const delAnio = hechos(cambiosTras(estadoDe(documentoDeEjemplo()), 366))
    expect(delAnio).toContain('Tributo de Archet pagado · 19 de abril de 1640')
    expect(delAnio).toContain('Tributo de Bree pagado · 28 de febrero de 1641')
    expect(delAnio.filter((t) => t.startsWith('Tributo de Archet'))).toEqual([
      'Tributo de Archet pagado · 19 de abril de 1640',
    ])
  })

  it('hechos de traslado y de un evento de partida, este último sin `dominioId` (D-052)', () => {
    const conOrigen = conAsentamiento(estadoMinimo(HOY), { id: 'dom.origen', nombre: 'Origen', caja: 0 })
    const base = conAsentamiento(conOrigen, { id: 'dom.destino', nombre: 'Destino', caja: 0 })
    const manana = sumarDias(HOY, 1)
    const estado: EstadoPartida = {
      ...base,
      caravanas: [
        {
          id: 'car.prueba',
          dominioId: 'dom.origen',
          operacion: 'traslado',
          destinoId: 'dom.destino',
          carga: { recursoId: RECURSO.madera, cantidad: 10 },
          salida: HOY,
          vuelta: manana,
          estado: 'enRuta',
        },
      ],
      eventos: [{ id: 'evt.mensajero', nombre: 'Visita del mensajero real', inicio: manana, duracionDias: 1, efectos: [] }],
    }
    const cambios = cambiosTras(estado, 1)
    expect(hechos(cambios)).toEqual(['Caravana de Origen llegada a Destino · 13', 'Visita del mensajero real · 13'])
    const hechoEvento = cambios.find((c) => c.tipo === 'hecho' && c.texto === 'Visita del mensajero real · 13')
    expect(hechoEvento && 'dominioId' in hechoEvento).toBe(false)
  })

  it('dos tributos del mismo día dan un solo hecho, y un tributo «Cada día» no da ninguno', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 1000000 })
    const estado: EstadoPartida = {
      ...base,
      impuestosRentas: [
        tributo('imp.peaje-al-senor', 'Peaje al señor', { tipo: 'diaria' }),
        tributo('imp.diezmo', 'Diezmo', { tipo: 'semanal', diaSemana: 0 }),
        tributo('imp.censo', 'Censo', { tipo: 'semanal', diaSemana: 0 }),
      ],
    }
    expect(hechos(cambiosTras(estado, 7))).toEqual(['Tributo de Aldea pagado · 16'])
  })
})
```

```bash
npx vitest run src/dominio/motor/cambios.test.ts
```

Fallo esperado (`cambiosDelAvance` todavía no conoce las filas `almacen` ni los sucesos `obraTerminada`/`llegadaTraslado`; 6 de las 8 pruebas fallan, la hora y la duración varían):

```text
 ❯ src/dominio/motor/cambios.test.ts (8 tests | 6 failed) 86ms
   ❯ cambiosDelAvance: filas «saldo» (4)
     × da una fila por dominio en el orden de los dominios, también sin movimientos, como AVANCES[3] (T15: y las cuatro filas «almacen»)
     × P4: las tres filas «saldo», las cinco filas «almacen» de Bree y de Archet, y los cuatro hechos del 12 al 19 de abril (O1, O11)
     × una fila nueva del almacén sale con `antes: 0` (TC11, D-056)
     × solo las filas que cambian, en el orden de dominios y, dentro, de existencias
   ❯ cambiosDelAvance: hechos (4)
     × escribe el mes si el avance cruza de mes: del 12 de abril al 1 de mayo (O11: 19 días, con las obras y la caravana de Tharbad)
     × hechos de traslado y de un evento de partida, este último sin `dominioId` (D-052)

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/cambios.test.ts > cambiosDelAvance: filas «saldo» > da una fila por dominio en el orden de los dominios, también sin movimientos, como AVANCES[3] (T15: y las cuatro filas «almacen»)
AssertionError: expected [] to have a length of 4 but got +0

- Expected
+ Received

- 4
+ 0

 ❯ src/dominio/motor/cambios.test.ts:61:23

 FAIL  src/dominio/motor/cambios.test.ts > cambiosDelAvance: filas «saldo» > P4: las tres filas «saldo», las cinco filas «almacen» de Bree y de Archet, y los cuatro hechos del 12 al 19 de abril (O1, O11)
AssertionError: expected [] to have a length of 6 but got +0

- Expected
+ Received

- 6
+ 0

 ❯ src/dominio/motor/cambios.test.ts:81:23

 FAIL  src/dominio/motor/cambios.test.ts > cambiosDelAvance: filas «saldo» > una fila nueva del almacén sale con `antes: 0` (TC11, D-056)
AssertionError: expected [] to deeply equal [ { tipo: 'almacen', …(4) } ]

 FAIL  src/dominio/motor/cambios.test.ts > cambiosDelAvance: filas «saldo» > solo las filas que cambian, en el orden de dominios y, dentro, de existencias
AssertionError: expected [] to have a length of 1 but got +0

 FAIL  src/dominio/motor/cambios.test.ts > cambiosDelAvance: hechos > escribe el mes si el avance cruza de mes: del 12 de abril al 1 de mayo (O11: 19 días, con las obras y la caravana de Tharbad)
AssertionError: expected [ …(7) ] to deeply equal [ …(9) ]

- Expected
+ Received

  [
-   "Lluvias de primavera · 8 al 21 de abril",
-   "Feria de primavera · 15 al 17 de abril",
-   "Obra «Reparación de la puerta del sur» terminada · 17 de abril",
+   "Caravana de undefined de vuelta · 17 de abril",
    "Caravana de Fornost de vuelta · 18 de abril",
    "Tributo de Archet pagado · 19 de abril",
    "Caravana de Tharbad de vuelta · 25 de abril",
-   "Obra «Molino» terminada · 28 de abril",
+   "Caravana de undefined de vuelta · 28 de abril",
    "Tributo de Bree pagado · 30 de abril",
    "Impuestos de locales de Bree cobrados · 1 de mayo",
  ]

 FAIL  src/dominio/motor/cambios.test.ts > cambiosDelAvance: hechos > hechos de traslado y de un evento de partida, este último sin `dominioId` (D-052)
AssertionError: expected [ Array(1) ] to deeply equal [ …(2) ]

- Expected
+ Received

  [
-   "Caravana de Origen llegada a Destino · 13",
-   "Visita del mensajero real · 13",
+   "Caravana de undefined de vuelta · 13",
  ]

 Test Files  1 failed (1)
      Tests  6 failed | 2 passed (8)
```

La versión de la fase 3 de `cambios.ts` no distingue `obraTerminada` ni `llegadaTraslado` de `vueltaCaravana` (su `else` final los trata a todos igual, TC3), por eso el texto dice «de vuelta» y «undefined»: no hay `mercadoId` en esos dos sucesos y `mercados.get(undefined)` no encuentra nada.

- [ ] **Paso 2: Cambiar la prueba del entregable y ver que también falla**

En `src/dominio/motor/entregable.test.ts`, busca la prueba `'resume el avance con una fila de saldo por dominio y los dos hechos de P5'` (l.213-223 del clon, dentro de `describe('P4: el avance del 12 al 19 de abril de 1640', …)`) y sustitúyela entera por esta:

```ts
  it('resume el avance con una fila de saldo por dominio, las filas «almacen» de P4 y los cuatro hechos de P5 (O1, O11, T15)', () => {
    const resultado = avanzarEjemplo(7)

    expect(resultado.cambios.filter((c) => c.tipo === 'saldo')).toEqual([
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4651800, despues: 4717800, movimientos: 3 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 34060000, despues: 38050000, movimientos: 4 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 2500000, movimientos: 1 },
    ])
    const almacenes = resultado.cambios.filter((c) => c.tipo === 'almacen')
    const redondeadas = almacenes.map((a) =>
      a.tipo === 'almacen'
        ? { dominioId: a.dominioId, recursoId: a.recursoId, antes: a.antes, despues: Math.round(a.despues * 1000) / 1000 }
        : a,
    )
    expect(redondeadas).toEqual([
      { dominioId: DOM.bree, recursoId: 'recurso.viveres', antes: 310, despues: 92.667 },
      { dominioId: DOM.bree, recursoId: 'recurso.madera', antes: 420, despues: 385.56 },
      { dominioId: DOM.bree, recursoId: 'recurso.piedra', antes: 180, despues: 196.667 },
      { dominioId: DOM.bree, recursoId: 'recurso.cerveza', antes: 90, despues: 83.96 },
      { dominioId: DOM.bree, recursoId: 'recurso.lana', antes: 35, despues: 47 },
      { dominioId: DOM.archet, recursoId: 'recurso.viveres', antes: 900, despues: 827.667 },
    ])
    expect(resultado.cambios.filter((c) => c.tipo === 'hecho')).toEqual([
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Feria de primavera · 15 al 17' },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Obra «Reparación de la puerta del sur» terminada · 17' },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Caravana de Fornost de vuelta · 18' },
      { tipo: 'hecho', dominioId: DOM.archet, texto: 'Tributo de Archet pagado · 19' },
    ])
  })
```

```bash
npx vitest run src/dominio/motor/entregable.test.ts -t "resume el avance"
```

Fallo esperado:

```text
 ❯ src/dominio/motor/entregable.test.ts (18 tests | 1 failed | 17 skipped) 29ms
   ❯ P4: el avance del 12 al 19 de abril de 1640 (5)
     × resume el avance con una fila de saldo por dominio, las filas «almacen» de P4 y los cuatro hechos de P5 (O1, O11, T15)

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/entregable.test.ts > P4: el avance del 12 al 19 de abril de 1640 > resume el avance con una fila de saldo por dominio, las filas «almacen» de P4 y los cuatro hechos de P5 (O1, O11, T15)
AssertionError: expected [] to deeply equal [ …(6) ]

- Expected
+ Received

- [
-   { "antes": 310, "despues": 92.667, "dominioId": "dom.bree", "recursoId": "recurso.viveres" },
-   { "antes": 420, "despues": 385.56, "dominioId": "dom.bree", "recursoId": "recurso.madera" },
-   { "antes": 180, "despues": 196.667, "dominioId": "dom.bree", "recursoId": "recurso.piedra" },
-   { "antes": 90, "despues": 83.96, "dominioId": "dom.bree", "recursoId": "recurso.cerveza" },
-   { "antes": 35, "despues": 47, "dominioId": "dom.bree", "recursoId": "recurso.lana" },
-   { "antes": 900, "despues": 827.667, "dominioId": "dom.archet", "recursoId": "recurso.viveres" },
- ]
+ []

 ❯ src/dominio/motor/entregable.test.ts:227:25

 Test Files  1 failed (1)
      Tests  1 failed | 17 skipped (18)
```

- [ ] **Paso 3: Reescribir `motor/cambios.ts`**

Sustituye **todo** el contenido de `src/dominio/motor/cambios.ts` por este código:

```ts
import { claveExistencia, TOLERANCIA } from '../almacen/cantidades'
import { aNumeroDeDia, compararFechas, sumarDias, type Fecha } from '../calendario/fecha'
import { formatearDiaDelAvance, formatearTramoDelAvance } from '../calendario/formatoFecha'
import type { CambioAvance } from '../modelo/avance'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Recorrido } from './bucle'
import {
  hechoCaravanaDeVuelta,
  hechoEventoTerminado,
  hechoLocalesCobrados,
  hechoObraTerminada,
  hechoTrasladoLlegado,
  hechoTributoPagado,
} from './textos'

/** Un hecho con lo que sirve para ordenarlo: el número de su día y la posición de su dominio. */
interface HechoConOrden {
  numero: number
  posicion: number
  cambio: CambioAvance
}

/**
 * Filas «saldo» por dominio (en el orden de estado.dominios), filas «almacen» (TC11) y hechos (D-032, D-052,
 * TC12): en ese orden, [...saldos, ...almacenes, ...hechos] (§3.10).
 */
export function cambiosDelAvance(
  estado: EstadoPartida,
  recorrido: Recorrido,
  avanceId: Id,
  primerDia: Fecha,
  hasta: Fecha,
): CambioAvance[] {
  // «3 · 4 · 1» de P5: los movimientos de cada dominio con este avanceId, nuevos o programados aplicados.
  const movimientosPorDominio = new Map<Id, number>()
  for (const m of recorrido.estadoNuevo.movimientos) {
    if (m.avanceId === avanceId) {
      movimientosPorDominio.set(m.dominioId, (movimientosPorDominio.get(m.dominioId) ?? 0) + 1)
    }
  }
  const saldos: CambioAvance[] = estado.dominios.map((d) => ({
    tipo: 'saldo',
    dominioId: d.id,
    antes: recorrido.saldosAntes[d.id] ?? 0,
    despues: recorrido.saldosDespues[d.id] ?? 0,
    movimientos: movimientosPorDominio.get(d.id) ?? 0,
  }))

  // Almacenes (TC11): para cada dominio y, dentro, cada fila de recorrido.estadoNuevo.existencias de ese
  // dominio, en su orden; solo si |despues − antes| > TOLERANCIA.
  const cantidadesAntes = new Map<string, number>()
  for (const e of estado.existencias) {
    cantidadesAntes.set(claveExistencia(e.dominioId, e.recursoId), e.cantidad)
  }
  const almacenes: CambioAvance[] = []
  for (const dominio of estado.dominios) {
    for (const fila of recorrido.estadoNuevo.existencias) {
      if (fila.dominioId !== dominio.id) {
        continue
      }
      const antes = cantidadesAntes.get(claveExistencia(fila.dominioId, fila.recursoId)) ?? 0
      const despues = fila.cantidad
      if (Math.abs(despues - antes) > TOLERANCIA) {
        almacenes.push({ tipo: 'almacen', dominioId: fila.dominioId, recursoId: fila.recursoId, antes, despues })
      }
    }
  }

  const posiciones = new Map(estado.dominios.map((d, i) => [d.id, i]))
  const nombres = new Map(estado.dominios.map((d) => [d.id, d.nombre]))
  const mercados = new Map(estado.mercados.map((m) => [m.id, m.nombre]))
  const dia = (f: Fecha): string => formatearDiaDelAvance(f, primerDia, hasta)
  const hechos: HechoConOrden[] = []
  const tributosPagados = new Set<string>()
  for (const suceso of recorrido.sucesos) {
    const numero = aNumeroDeDia(suceso.fecha)
    if (suceso.tipo === 'pago') {
      // Solo un tributo que no es «Cada día» y se pagó entero, y uno por asentamiento y día.
      const clave = `${suceso.dominioId}|${numero}`
      const esHecho =
        suceso.que.clase === 'tributo' && !suceso.diario && suceso.pagado === suceso.debido && !tributosPagados.has(clave)
      if (!esHecho) {
        continue
      }
      tributosPagados.add(clave)
      const nombre = nombres.get(suceso.dominioId) ?? suceso.dominioId
      hechos.push({
        numero,
        posicion: posiciones.get(suceso.dominioId) ?? posiciones.size,
        cambio: { tipo: 'hecho', dominioId: suceso.dominioId, texto: hechoTributoPagado(nombre, dia(suceso.fecha)) },
      })
      continue
    }
    if (suceso.tipo === 'cobroLocales') {
      const nombre = nombres.get(suceso.dominioId) ?? suceso.dominioId
      hechos.push({
        numero,
        posicion: posiciones.get(suceso.dominioId) ?? posiciones.size,
        cambio: { tipo: 'hecho', dominioId: suceso.dominioId, texto: hechoLocalesCobrados(nombre, dia(suceso.fecha)) },
      })
      continue
    }
    if (suceso.tipo === 'vueltaCaravana') {
      const mercado = mercados.get(suceso.mercadoId) ?? suceso.mercadoId
      hechos.push({
        numero,
        posicion: posiciones.get(suceso.dominioId) ?? posiciones.size,
        cambio: { tipo: 'hecho', dominioId: suceso.dominioId, texto: hechoCaravanaDeVuelta(mercado, dia(suceso.fecha)) },
      })
      continue
    }
    if (suceso.tipo === 'obraTerminada') {
      hechos.push({
        numero,
        posicion: posiciones.get(suceso.dominioId) ?? posiciones.size,
        cambio: {
          tipo: 'hecho',
          dominioId: suceso.dominioId,
          texto: hechoObraTerminada(suceso.nombre, dia(suceso.fecha)),
        },
      })
      continue
    }
    // suceso.tipo === 'llegadaTraslado'
    const origen = nombres.get(suceso.dominioId) ?? suceso.dominioId
    const destino = nombres.get(suceso.destinoId) ?? suceso.destinoId
    hechos.push({
      numero,
      posicion: posiciones.get(suceso.dominioId) ?? posiciones.size,
      cambio: {
        tipo: 'hecho',
        dominioId: suceso.dominioId,
        texto: hechoTrasladoLlegado(origen, destino, dia(suceso.fecha)),
      },
    })
  }
  // Los eventos que acaban dentro del avance (D-052): fin = inicio + duracionDias − 1, entre primerDia y hasta.
  for (const evento of estado.eventos) {
    const fin = sumarDias(evento.inicio, evento.duracionDias - 1)
    if (compararFechas(fin, primerDia) < 0 || compararFechas(fin, hasta) > 0) {
      continue
    }
    const texto = hechoEventoTerminado(evento.nombre, formatearTramoDelAvance(evento.inicio, fin, primerDia, hasta))
    const cambio: CambioAvance =
      evento.dominioId === undefined
        ? { tipo: 'hecho', texto }
        : { tipo: 'hecho', dominioId: evento.dominioId, texto }
    hechos.push({
      numero: aNumeroDeDia(evento.inicio),
      posicion: evento.dominioId === undefined ? posiciones.size : (posiciones.get(evento.dominioId) ?? posiciones.size),
      cambio,
    })
  }
  // Por fecha y dominio; dentro de un mismo día y dominio, en el orden en que se añadieron (sort es estable).
  hechos.sort((a, b) => a.numero - b.numero || a.posicion - b.posicion)
  return [...saldos, ...almacenes, ...hechos.map((h) => h.cambio)]
}
```

Tres detalles que no se pueden perder al copiarlo:

1. El bloque de `almacenes` va **entre** `saldos` y `hechos` en el `return` final: `[...saldos, ...almacenes, ...hechos.map(…)]` (TC11).
2. El `if` de `suceso.tipo === 'pago'` sigue siendo el único que hace `continue` sin empujar nada cuando `esHecho` es falso; los demás siempre empujan un hecho.
3. El bucle de eventos va **después** del de sucesos y usa `posiciones.size` (no `-1` ni `undefined`) para que un evento de partida quede siempre el último a igualdad de `numero`, y para que la clave `dominioId` no se escriba con `undefined` (aviso 11 del contrato) se arma `cambio` con el operador ternario en vez de con un spread condicional.

- [ ] **Paso 4: Ejecutar las dos pruebas y verlas pasar**

```bash
npx vitest run src/dominio/motor/cambios.test.ts src/dominio/motor/entregable.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 Test Files  2 passed (2)
      Tests  26 passed (26)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas, el lint y la compilación**

```bash
npx tsc -b
npm test
npm run lint
npm run build
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` no escribe nada y sale con código 0; `npm run build` termina con `✓ built in …`.

**Sobre el recuento de `npm test`:** este grupo verificó las tareas 15 a 18 en un clon aparte, reconstruyendo a mano lo que hacía falta de las tareas 1 a 14 (sin sus commits ni sus archivos de prueba propios, que escriben y cuentan los grupos que tienen esas tareas) para poder ejecutar de verdad el código de esta tarea. Por eso el recuento absoluto de ese clon no encadena limpiamente con el de la tabla del contrato. Lo que sí es exacto y no depende de nada más: `cambios.ts` es una modificación, no un módulo nuevo, así que no suma nada a `pureza.test.ts`; esta tarea añade exactamente **3 pruebas** (las 3 nuevas de `cambios.test.ts`; la de `entregable.test.ts` se reescribe sin cambiar el número de pruebas del archivo) y **0 archivos**. Cuando la tarea se ejecute de verdad, después de que las tareas 1 a 14 estén aplicadas con sus propias pruebas: en la cadena real de este plan la tarea 14 deja **1.069 pruebas en 89 archivos**, así que esta tarea 15 cierra en **1.072 pruebas en 89 archivos**. Confírmalo con el `npm test` real antes de seguir, y anota cualquier diferencia en «huecos» del informe de esta fase.

- [ ] **Paso 6: Comprobar que no se ha tocado nada más y hacer el commit**

```bash
git status --short
```

Salida esperada: solo los dos archivos de esta tarea:

```text
 M src/dominio/motor/cambios.test.ts
 M src/dominio/motor/cambios.ts
 M src/dominio/motor/entregable.test.ts
```

```bash
git add src/dominio/motor/cambios.ts src/dominio/motor/cambios.test.ts src/dominio/motor/entregable.test.ts
git commit -m "feat(motor): filas del almacén y hechos de obras, traslados y eventos en los cambios del avance" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía): `git status --short` no muestra nada.

---

### Tarea 16 · Previsión, días de reserva y próximas producciones (17)

A7, A7b y A8 necesitan mirar hacia delante sin tocar la partida: cuánto durarán las existencias («días de reserva»), qué pasará en los próximos 30 días («previsión»), cuánto cabrá en el almacén el día en que vuelva una caravana («Caben N más») y cuánto producirá una producción la próxima vez que ocurra. Los cuatro cálculos comparten la misma herramienta: simular con `recorrerDias` **sin guardar nada**, sobre una copia de `estado` que nadie ve. Esta tarea crea ese módulo entero; las tareas 17 y 18 (avisos) y las de edición de fases posteriores lo usan tal cual.

**Reglas de la especificación que implementa:**

- **Días de reserva y previsión a 30 días** (esp l.1104-1105): «**Días de reserva** de un recurso = días hasta el día en que empieza la falta, según la simulación del motor (producción, consumo y caravanas ya en ruta). Sin consumo: "Sin consumo". Ejemplo de Bree el 12 de abril: víveres 11 (el 23 de abril), cerveza unos 105 días, madera unos 85 días.» y «**Previsión a 30 días** = simulación del motor sobre los 30 días siguientes a la fecha actual, sin guardar (sección 9).»
- **Fecha máxima de las previsiones** (esp l.1106): «los días de reserva, la previsión a 30 días y las previsiones de A7 y A7b se cortan en el 31 de diciembre de 9999: no calculan fechas posteriores.»
- **Capacidad** (esp l.1107-1109): «lo que excede la capacidad al producir o al llegar una caravana se pierde… Las entradas manuales no pueden superar la capacidad (error bajo el campo: "Caben 890 sacos más"). Sin capacidad no hay límite.»
- **Datos de reservas del ejemplo** (esp l.1354-1365, simulación del 13 de abril al 12 de mayo): las cifras exactas de víveres, madera, piedra, arcilla, cerveza y lana de Bree y de víveres de Archet que las pruebas de esta tarea reproducen letra por letra (oráculo O3 del contrato).
- **D-062** (`decisiones-fase-4.md`): «Los días de reserva se buscan hasta un año vista. Si en ese año no llega a faltar, la reserva dice que no falta en un año; "Sin consumo" queda para los recursos que nada consume en ese año. Es el mismo tope de 366 días que ya usan A7 y A7b (D-004).»
- **TC14** (`decisiones-fase-4.md`): «Previsiones con `preverAlmacen(estado, catalogo, dias)` sobre `recorrerDias`, `idsEnSerie('prev')` y `diasQueCaben`; días de reserva con 366 días; `proximasProducciones` hasta la próxima ocurrencia, como mucho 366 días (D-004).»
- **§3.11 del contrato** (`contrato.md`): las firmas exactas de `preverAlmacen`, `resumirFilas`, `diasDeReserva`, `cabenElDia` y `proximasProducciones`, y la nota final: «`proximasProducciones` simula una sola vez hasta la más lejana de sus fechas que quepa en 366 días y lee las `producciones` de la previsión con ese `produccionId` y esa fecha; si no hay ninguna (produjo 0), `cantidad: 0, perdida: 0`.»
- **O3, O4, O6 y O7** (`contrato.md` §6): las cifras exactas de la previsión a 30 días, los días de reserva, la producción de la cantera y «Caben 1.148 más» que reproducen las pruebas de esta tarea.

**Archivos:**
- Crear: `src/dominio/almacen/prevision.ts`, `src/dominio/almacen/prevision.test.ts`

- [ ] **Paso 1: Escribir la prueba y ver que falla**

Crea `src/dominio/almacen/prevision.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { RECURSO } from '../catalogo/inicial'
import { DOM, EDIFICIO } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { cabenElDia, diasDeReserva, preverAlmacen, proximasProducciones, resumirFilas } from './prevision'

/** Fechas de 1640 T.E. escritas cortas: F(19, 4) es el 19 de abril de 1640. */
function F(dia: number, mes: number, anio = 1640): Fecha {
  return { anio, mes, dia }
}

const catalogo = catalogosDeEjemplo()

function estadoEjemplo(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

/** El resumen de una fila del almacén de la previsión, redondeado a 3 decimales. */
function redondeaResumen(estado: EstadoPartida, dias: number, dominioId: string, recursoId: string) {
  const prevision = preverAlmacen(estado, catalogo, dias)
  const resumen = resumirFilas(estado.existencias, prevision.final, prevision.flujos)
  const fila = resumen.find((f) => f.dominioId === dominioId && f.recursoId === recursoId)
  if (fila === undefined) {
    return undefined
  }
  const redondea = (n: number) => Math.round(n * 1000) / 1000
  return {
    inicial: redondea(fila.inicial),
    final: redondea(fila.final),
    entradas: redondea(fila.entradas),
    perdido: redondea(fila.perdido),
    consumido: redondea(fila.consumido),
    consumoTeorico: redondea(fila.consumoTeorico),
    falta: redondea(fila.falta),
    tramosDeFalta: fila.tramosDeFalta,
  }
}

describe('preverAlmacen', () => {
  it('no toca el estado de entrada (una previsión no guarda nada)', () => {
    const estado = estadoEjemplo()
    const antes = JSON.stringify(estado.existencias)
    preverAlmacen(estado, catalogo, 30)
    expect(JSON.stringify(estado.existencias)).toBe(antes)
  })

  it('recorta en el 31 de diciembre de 9999: hasta = hoy si no cabe ningún día', () => {
    const estado = { ...estadoEjemplo(), partida: { ...estadoEjemplo().partida, fechaActual: F(31, 12, 9999) } }
    const prevision = preverAlmacen(estado, catalogo, 30)
    expect(prevision.hasta).toEqual(F(31, 12, 9999))
    expect(prevision.flujos).toEqual([])
  })
})

describe('resumirFilas: O3 (previsión a 30 días, del 13 de abril al 12 de mayo)', () => {
  const estado = estadoEjemplo()
  const prevision = preverAlmacen(estado, catalogo, 30)
  const resumen = resumirFilas(estado.existencias, prevision.final, prevision.flujos)

  it('Bree víveres: 310 inicial, 714 entradas, 975 consumido, 1.240 teórico, 265 de falta, 49 final, dos tramos de falta', () => {
    const fila = resumen.find((f) => f.dominioId === DOM.bree && f.recursoId === RECURSO.viveres)
    expect(fila).toBeDefined()
    expect(fila?.inicial).toBe(310)
    expect(fila?.entradas).toBeCloseTo(714, 3)
    expect(fila?.consumido).toBeCloseTo(975.333, 3)
    expect(fila?.consumoTeorico).toBeCloseTo(1240, 3)
    expect(fila?.falta).toBeCloseTo(264.667, 3)
    expect(fila?.final).toBeCloseTo(48.667, 3)
    expect(fila?.tramosDeFalta.map((t) => `${t.desde.dia}-${t.hasta.dia}`)).toEqual(['23-25', '7-11'])
  })

  it('Bree madera, piedra, arcilla, hierro, cerveza y lana, y Archet víveres (O3)', () => {
    expect(redondeaResumen(estado, 30, DOM.bree, RECURSO.madera)).toMatchObject({
      inicial: 420,
      entradas: 175,
      consumido: 297.6,
      falta: 0,
      final: 297.4,
    })
    expect(redondeaResumen(estado, 30, DOM.bree, RECURSO.piedra)).toMatchObject({
      inicial: 180,
      entradas: 83.333,
      consumido: 0,
      final: 263.333,
    })
    expect(redondeaResumen(estado, 30, DOM.bree, RECURSO.arcilla)).toMatchObject({
      inicial: 150,
      entradas: 6.667,
      final: 156.667,
    })
    expect(redondeaResumen(estado, 30, DOM.bree, RECURSO.hierro)).toMatchObject({ inicial: 64, entradas: 0, final: 64 })
    expect(redondeaResumen(estado, 30, DOM.bree, RECURSO.cerveza)).toMatchObject({
      inicial: 90,
      entradas: 100,
      consumido: 111.6,
      final: 78.4,
    })
    expect(redondeaResumen(estado, 30, DOM.bree, RECURSO.lana)).toMatchObject({ inicial: 35, entradas: 60, final: 95 })
    expect(redondeaResumen(estado, 30, DOM.archet, RECURSO.viveres)).toMatchObject({
      inicial: 900,
      entradas: 0,
      consumido: 310,
      final: 590,
    })
  })

  it('perdido y sacado son 0 en todas las filas del plazo', () => {
    for (const fila of resumen) {
      expect(fila.perdido).toBeCloseTo(0, 3)
      expect(fila.sacado).toBeCloseTo(0, 3)
    }
  })

  it('filas nuevas (D-056) y filas que solo salen en los flujos, detrás de las de `final`', () => {
    const claves = resumen.map((f) => `${f.dominioId}|${f.recursoId}`)
    // Las 8 filas de EXISTENCIAS van primero, en su orden (TC10).
    expect(claves.slice(0, 8)).toEqual([
      'dom.bree|recurso.viveres',
      'dom.bree|recurso.madera',
      'dom.bree|recurso.piedra',
      'dom.bree|recurso.arcilla',
      'dom.bree|recurso.hierro',
      'dom.bree|recurso.cerveza',
      'dom.bree|recurso.lana',
      'dom.archet|recurso.viveres',
    ])
  })
})

describe('diasDeReserva: O4 (12 de abril)', () => {
  const estado = estadoEjemplo()
  const reservas = diasDeReserva(estado, catalogo)
  const de = (dominioId: string, recursoId: string) =>
    reservas.find((r) => r.dominioId === dominioId && r.recursoId === recursoId)?.reserva

  it('Bree víveres 11 días (23 de abril), madera 85 (6 de julio) y cerveza 105 (26 de julio)', () => {
    expect(de(DOM.bree, RECURSO.viveres)).toEqual({ tipo: 'dias', dias: 11, fecha: F(23, 4) })
    expect(de(DOM.bree, RECURSO.madera)).toEqual({ tipo: 'dias', dias: 85, fecha: F(6, 7) })
    expect(de(DOM.bree, RECURSO.cerveza)).toEqual({ tipo: 'dias', dias: 105, fecha: F(26, 7) })
  })

  it('Archet víveres 88 días (9 de julio)', () => {
    expect(de(DOM.archet, RECURSO.viveres)).toEqual({ tipo: 'dias', dias: 88, fecha: F(9, 7) })
  })

  it('piedra, arcilla, hierro y lana: sin consumo', () => {
    expect(de(DOM.bree, RECURSO.piedra)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.bree, RECURSO.arcilla)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.bree, RECURSO.hierro)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.bree, RECURSO.lana)).toEqual({ tipo: 'sinConsumo' })
  })

  it('una fila que se consume pero no llega a faltar en 366 días da «sinFalta»', () => {
    // La cervecería de Bree con un almacén de cerveza sin límite: nunca falta ni se llena.
    const sinLimite: EstadoPartida = {
      ...estado,
      existencias: estado.existencias.map((e) =>
        e.dominioId === DOM.bree && e.recursoId === RECURSO.cerveza ? { ...e, cantidad: 1000000, capacidad: undefined } : e,
      ),
    }
    expect(diasDeReserva(sinLimite, catalogo).find((r) => r.dominioId === DOM.bree && r.recursoId === RECURSO.cerveza)?.reserva).toEqual({
      tipo: 'sinFalta',
    })
  })
})

describe('cabenElDia: O7', () => {
  it('hoy (12 de abril): 890 sacos de víveres caben en Bree', () => {
    const estado = estadoEjemplo()
    expect(cabenElDia(estado, catalogo, DOM.bree, RECURSO.viveres, F(12, 4))).toBe(890)
  })

  it('el 20 de abril, día en que volvería una compra de Fornost salida hoy (4 días de ruta), caben 1.148 sacos (esp l.633)', () => {
    // cabenElDia mira el hueco que quedaría ese día ANTES de la caravana que se está creando en el formulario:
    // se llama sobre el documento tal cual, sin añadir esa caravana todavía.
    const estado = estadoEjemplo()
    expect(cabenElDia(estado, catalogo, DOM.bree, RECURSO.viveres, F(20, 4))).toBe(1148)
  })

  it('sin capacidad, null', () => {
    const estado = estadoEjemplo()
    const sinLimite: EstadoPartida = {
      ...estado,
      existencias: estado.existencias.map((e) => (e.recursoId === RECURSO.hierro ? { ...e, capacidad: undefined } : e)),
    }
    expect(cabenElDia(sinLimite, catalogo, DOM.bree, RECURSO.hierro, F(1, 5))).toBeNull()
  })
})

describe('proximasProducciones: O6 (cantera, 12 de abril)', () => {
  it('piedra el 14 de abril (16,667) y arcilla el 1 de mayo (6,667)', () => {
    const estado = estadoEjemplo()
    const proximas = proximasProducciones(estado, catalogo, EDIFICIO.cantera)
    const piedra = proximas.find((p) => p.recursoId === RECURSO.piedra)
    const arcilla = proximas.find((p) => p.recursoId === RECURSO.arcilla)
    expect(piedra?.fecha).toEqual(F(14, 4))
    expect(piedra?.cantidad).toBeCloseTo(16.667, 3)
    expect(piedra?.perdida).toBeCloseTo(0, 3)
    expect(arcilla?.fecha).toEqual(F(1, 5))
    expect(arcilla?.cantidad).toBeCloseTo(6.667, 3)
  })

  it('un edificio que no existe da una lista vacía', () => {
    const estado = estadoEjemplo()
    expect(proximasProducciones(estado, catalogo, 'ed.no-existe')).toEqual([])
  })

  it('una producción cuya siguiente ocurrencia cae a más de 366 días no lleva cantidad ni pérdida', () => {
    const estado = estadoEjemplo()
    const conProduccionLejana: EstadoPartida = {
      ...estado,
      edificios: estado.edificios.map((e) =>
        e.id === EDIFICIO.redil
          ? {
              ...e,
              producciones: e.producciones.map((p) => ({
                ...p,
                recurrencia: { tipo: 'cadaNMeses', n: 12, diaMes: 1, primera: F(1, 1, 1650) },
                acumulado: { desde: F(1, 1, 1650), sumaFactores: 0 },
              })),
            }
          : e,
      ),
    }
    const proximas = proximasProducciones(conProduccionLejana, catalogo, EDIFICIO.redil)
    expect(proximas).toHaveLength(1)
    expect(proximas[0].fecha).toEqual(F(1, 1, 1650))
    expect('cantidad' in proximas[0]).toBe(false)
    expect('perdida' in proximas[0]).toBe(false)
  })
})
```

```bash
npx vitest run src/dominio/almacen/prevision.test.ts
```

Fallo esperado (`almacen/prevision.ts` todavía no existe):

```text
 ❯ src/dominio/almacen/prevision.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/almacen/prevision.test.ts [ src/dominio/almacen/prevision.test.ts ]
Error: Cannot find module './prevision' imported from .../src/dominio/almacen/prevision.test.ts
 ❯ src/dominio/almacen/prevision.test.ts:7:1
      5| import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/som…
      6| import { estadoDe, type EstadoPartida } from '../modelo/documento'
      7| import { cabenElDia, diasDeReserva, preverAlmacen, proximasProduccione…
       | ^

 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 2: Escribir `almacen/prevision.ts`**

Crea `src/dominio/almacen/prevision.ts` con este contenido:

```ts
import { diasQueCaben } from '../avance/dias'
import { ANIO_MAXIMO, aNumeroDeDia, compararFechas, diasEntre, sumarDias, type Fecha } from '../calendario/fecha'
import { siguienteOcurrencia } from '../calendario/recurrencia'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Existencia, ProduccionRealizada } from '../modelo/almacen'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import type { FlujoAlmacen } from '../motor/tipos'
import { claveExistencia, esCero, TOLERANCIA } from './cantidades'

/** La previsión a 30 días de A8 y de los avisos (§7 l.1105). */
export const DIAS_DE_PREVISION = 30

/** Hasta dónde se buscan los días de reserva (D-062). */
export const HORIZONTE_DE_RESERVA = 366

/** Una simulación sin guardar desde la fecha actual (§9 l.1322; TC14). */
export interface PrevisionAlmacen {
  hoy: Fecha
  /** El último día simulado (hoy si no cabe ninguno). */
  hasta: Fecha
  inicial: Existencia[]
  final: Existencia[]
  flujos: FlujoAlmacen[]
  /** Las producciones que ocurrirían (avanceId 'prev'). */
  producciones: ProduccionRealizada[]
}

/** recorrerDias(estado, hoy + diasQueCaben(hoy, dias), { avanceId: 'prev', nuevoId: idsEnSerie('prev'), catalogo }). */
export function preverAlmacen(estado: EstadoPartida, catalogo: CatalogosEnCopia, dias: number): PrevisionAlmacen {
  const hoy = estado.partida.fechaActual
  const hasta = sumarDias(hoy, diasQueCaben(hoy, dias))
  const recorrido = recorrerDias(estado, hasta, { avanceId: 'prev', nuevoId: idsEnSerie('prev'), catalogo })
  return {
    hoy,
    hasta: recorrido.estadoNuevo.partida.fechaActual,
    inicial: estado.existencias,
    final: recorrido.estadoNuevo.existencias,
    flujos: recorrido.flujos,
    producciones: recorrido.estadoNuevo.produccionesRealizadas.filter((p) => p.avanceId === 'prev'),
  }
}

/** Lo que pasa en una fila durante una previsión o un avance (A8, P4, avisos). */
export interface ResumenFila {
  dominioId: Id
  recursoId: Id
  inicial: number
  final: number
  entradas: number
  perdido: number
  consumido: number
  sacado: number
  consumoTeorico: number
  /** consumoTeorico − consumido; 0 si no llega a TOLERANCIA. */
  falta: number
  /** Días seguidos con falta (> TOLERANCIA), en orden. */
  tramosDeFalta: { desde: Fecha; hasta: Fecha }[]
  primeraPerdida?: { fecha: Fecha; cantidad: number }
  diasConPerdida: number
}

/** Una fila por cada fila de `final`, en su orden, y detrás las que solo salen en los flujos (TC10); inicial/final 0 si faltan. */
export function resumirFilas(
  inicial: readonly Existencia[],
  final: readonly Existencia[],
  flujos: readonly FlujoAlmacen[],
): ResumenFila[] {
  const claves: string[] = []
  const vistos = new Set<string>()
  const idsPorClave = new Map<string, { dominioId: Id; recursoId: Id }>()
  for (const fila of final) {
    const clave = claveExistencia(fila.dominioId, fila.recursoId)
    if (!vistos.has(clave)) {
      vistos.add(clave)
      claves.push(clave)
      idsPorClave.set(clave, { dominioId: fila.dominioId, recursoId: fila.recursoId })
    }
  }
  for (const flujo of flujos) {
    const clave = claveExistencia(flujo.dominioId, flujo.recursoId)
    if (!vistos.has(clave)) {
      vistos.add(clave)
      claves.push(clave)
      idsPorClave.set(clave, { dominioId: flujo.dominioId, recursoId: flujo.recursoId })
    }
  }
  const inicialPorClave = new Map(inicial.map((e) => [claveExistencia(e.dominioId, e.recursoId), e.cantidad]))
  const finalPorClave = new Map(final.map((e) => [claveExistencia(e.dominioId, e.recursoId), e.cantidad]))

  return claves.map((clave) => {
    const { dominioId, recursoId } = idsPorClave.get(clave) as { dominioId: Id; recursoId: Id }
    const filaFlujos = flujos
      .filter((f) => claveExistencia(f.dominioId, f.recursoId) === clave)
      .sort((a, b) => aNumeroDeDia(a.fecha) - aNumeroDeDia(b.fecha))
    let entradas = 0
    let perdido = 0
    let consumido = 0
    let sacado = 0
    let consumoTeorico = 0
    const tramosDeFalta: { desde: Fecha; hasta: Fecha; numeroHasta: number }[] = []
    let primeraPerdida: { fecha: Fecha; cantidad: number } | undefined
    let diasConPerdida = 0
    for (const flujo of filaFlujos) {
      entradas += flujo.entradas
      perdido += flujo.perdido
      consumido += flujo.consumido
      sacado += flujo.sacado
      consumoTeorico += flujo.consumoTeorico
      const numero = aNumeroDeDia(flujo.fecha)
      const faltaDia = flujo.consumoTeorico - flujo.consumido
      if (!esCero(faltaDia)) {
        const ultimo = tramosDeFalta[tramosDeFalta.length - 1]
        if (ultimo !== undefined && numero === ultimo.numeroHasta + 1) {
          ultimo.hasta = flujo.fecha
          ultimo.numeroHasta = numero
        } else {
          tramosDeFalta.push({ desde: flujo.fecha, hasta: flujo.fecha, numeroHasta: numero })
        }
      }
      if (!esCero(flujo.perdido)) {
        diasConPerdida += 1
        if (primeraPerdida === undefined) {
          primeraPerdida = { fecha: flujo.fecha, cantidad: flujo.perdido }
        }
      }
    }
    const falta = consumoTeorico - consumido
    return {
      dominioId,
      recursoId,
      inicial: inicialPorClave.get(clave) ?? 0,
      final: finalPorClave.get(clave) ?? 0,
      entradas,
      perdido,
      consumido,
      sacado,
      consumoTeorico,
      falta: esCero(falta) ? 0 : falta,
      tramosDeFalta: tramosDeFalta.map(({ desde, hasta }) => ({ desde, hasta })),
      primeraPerdida,
      diasConPerdida,
    }
  })
}

export type Reserva = { tipo: 'sinConsumo' } | { tipo: 'sinFalta' } | { tipo: 'dias'; dias: number; fecha: Fecha }
export interface ReservaDeFila {
  dominioId: Id
  recursoId: Id
  reserva: Reserva
}

/** Con una previsión de HORIZONTE_DE_RESERVA: sin consumo teórico → sinConsumo; con falta → días hasta el primer día con falta; si no, sinFalta (§7 l.1104; D-062). */
export function diasDeReserva(estado: EstadoPartida, catalogo: CatalogosEnCopia): ReservaDeFila[] {
  const prevision = preverAlmacen(estado, catalogo, HORIZONTE_DE_RESERVA)
  const resumen = resumirFilas(estado.existencias, prevision.final, prevision.flujos)
  return resumen.map((fila): ReservaDeFila => {
    if (esCero(fila.consumoTeorico)) {
      return { dominioId: fila.dominioId, recursoId: fila.recursoId, reserva: { tipo: 'sinConsumo' } }
    }
    if (fila.tramosDeFalta.length === 0) {
      return { dominioId: fila.dominioId, recursoId: fila.recursoId, reserva: { tipo: 'sinFalta' } }
    }
    const fecha = fila.tramosDeFalta[0].desde
    const dias = diasEntre(estado.partida.fechaActual, fecha)
    return { dominioId: fila.dominioId, recursoId: fila.recursoId, reserva: { tipo: 'dias', dias, fecha } }
  })
}

/** Lo que cabe al acabar ese día (A10b: «Caben 1.148 más el día de llegada»); null sin capacidad. Con fecha ≤ hoy, cabenMas de hoy. */
export function cabenElDia(
  estado: EstadoPartida,
  catalogo: CatalogosEnCopia,
  dominioId: Id,
  recursoId: Id,
  fecha: Fecha,
): number | null {
  const hoy = estado.partida.fechaActual
  if (compararFechas(fecha, hoy) <= 0) {
    const fila = estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
    return cabenMasDe(fila)
  }
  const dias = diasEntre(hoy, fecha)
  const prevision = preverAlmacen(estado, catalogo, dias)
  const fila = prevision.final.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
  return cabenMasDe(fila)
}

function cabenMasDe(fila: Pick<Existencia, 'cantidad' | 'capacidad'> | undefined): number | null {
  if (fila === undefined) {
    return null
  }
  if (fila.capacidad === undefined) {
    return null
  }
  return Math.max(0, Math.floor(fila.capacidad - fila.cantidad + TOLERANCIA))
}

/** La próxima vez de cada producción de un edificio, con lo que produciría y lo que no cabría (A7, A7b; §7 l.1137-1138). */
export interface ProximaProduccion {
  produccionId: Id
  recursoId: Id
  /** siguienteOcurrencia desde hoy; null si pasa del 31 de diciembre de 9999. */
  fecha: Fecha | null
  /** Producido (entra + se pierde); sin la clave si la fecha cae a más de 366 días (D-004). */
  cantidad?: number
  perdida?: number
}

/**
 * Simula una sola vez hasta la más lejana de sus fechas que quepa en 366 días y lee las `producciones` de la
 * previsión con ese `produccionId` y esa fecha; si no hay ninguna (produjo 0), `cantidad: 0, perdida: 0`.
 */
export function proximasProducciones(estado: EstadoPartida, catalogo: CatalogosEnCopia, edificioId: Id): ProximaProduccion[] {
  const edificio = estado.edificios.find((e) => e.id === edificioId)
  if (edificio === undefined) {
    return []
  }
  const hoy = estado.partida.fechaActual
  const fechas = new Map<Id, Fecha | null>()
  let maxDias = 0
  for (const produccion of edificio.producciones) {
    let fecha = siguienteOcurrencia(produccion.recurrencia, hoy)
    if (fecha !== null && fecha.anio > ANIO_MAXIMO) {
      fecha = null
    }
    fechas.set(produccion.id, fecha)
    if (fecha !== null) {
      const dias = diasEntre(hoy, fecha)
      if (dias <= HORIZONTE_DE_RESERVA && dias > maxDias) {
        maxDias = dias
      }
    }
  }
  const prevision = preverAlmacen(estado, catalogo, maxDias)
  return edificio.producciones.map((produccion): ProximaProduccion => {
    const fecha = fechas.get(produccion.id) ?? null
    if (fecha === null) {
      return { produccionId: produccion.id, recursoId: produccion.recursoId, fecha: null }
    }
    const dias = diasEntre(hoy, fecha)
    if (dias > HORIZONTE_DE_RESERVA) {
      return { produccionId: produccion.id, recursoId: produccion.recursoId, fecha }
    }
    const encontrada = prevision.producciones.find(
      (p) => p.produccionId === produccion.id && compararFechas(p.fecha, fecha) === 0,
    )
    return {
      produccionId: produccion.id,
      recursoId: produccion.recursoId,
      fecha,
      cantidad: (encontrada?.cantidad ?? 0) + (encontrada?.perdida ?? 0),
      perdida: encontrada?.perdida ?? 0,
    }
  })
}
```

Cuatro detalles que no se pueden perder al copiarlo:

1. `preverAlmacen` nunca toca `estado`: crea el contexto con `recorrerDias`, que ya copia todo lo que escribe (T8), y su `avanceId` es siempre `'prev'` con `idsEnSerie('prev')`, para que `proximasProducciones` pueda distinguir sus propias `ProduccionRealizada` de las que ya traía la partida (filtro `p.avanceId === 'prev'`).
2. `resumirFilas` calcula los tramos de falta acumulando por **número de día consecutivo** (`numero === ultimo.numeroHasta + 1`), no por índice de la lista: si un día no tiene flujo para esa fila (nadie la tocó), el tramo se corta igual que si el día no tuviera falta.
3. `cabenElDia` con `fecha ≤ hoy` no simula nada: lee `estado.existencias` directamente (`cabenMasDe`). Con `fecha > hoy` simula hasta esa fecha y mira la fila de `prevision.final`, **sin** añadir ninguna caravana nueva: el hueco que calcula es el que habría *antes* de la que se esté creando en el formulario (A10b).
4. En `proximasProducciones`, `cantidad` es lo **producido en total** (`entra + perdida`, la nota del contrato «Producido (entra + se pierde)»), no solo lo que entró; y si la fecha cae a más de 366 días, el objeto no lleva ni `cantidad` ni `perdida` (dos claves menos, no `undefined`: aviso 11 del contrato).

- [ ] **Paso 3: Ejecutar la prueba y verla pasar**

```bash
npx vitest run src/dominio/almacen/prevision.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 Test Files  1 passed (1)
      Tests  16 passed (16)
```

- [ ] **Paso 4: Comprobar los tipos, todas las pruebas, el lint y la compilación**

```bash
npx tsc -b
npm test
npm run lint
npm run build
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` no escribe nada y sale con código 0; `npm run build` termina con `✓ built in …`.

**Sobre el recuento de `npm test`** (mismo aviso que en las tareas 11 y 15). Lo exacto y verificado en este archivo: `prevision.ts` es un módulo nuevo de `src/dominio`, así que además de las **16 pruebas** de `prevision.test.ts` suma **una más** a `pureza.test.ts` (el `it.each` que ahora recorre también `src/dominio/almacen/prevision.ts`): **17 pruebas y 1 archivo** en total. Cuando la tarea se ejecute de verdad, parte de lo que deje la tarea 15 en la cadena real de este plan (**1.072 pruebas y 89 archivos**) y suma esto: **1.089 pruebas en 90 archivos**. Confírmalo con el `npm test` real antes de seguir, y anota cualquier diferencia en «huecos» del informe de esta fase.

- [ ] **Paso 5: Comprobar que no se ha tocado nada más y hacer el commit**

```bash
git status --short
```

Salida esperada: solo los dos archivos nuevos de esta tarea:

```text
?? src/dominio/almacen/prevision.test.ts
?? src/dominio/almacen/prevision.ts
```

```bash
git add src/dominio/almacen/prevision.ts src/dominio/almacen/prevision.test.ts
git commit -m "feat(almacen): previsión sin guardar, días de reserva, hueco del día de llegada y próximas producciones" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía): `git status --short` no muestra nada.

---

### Tarea 17 · Avisos de faltas y pérdidas (14)

Inicio, A1, A4, A8, P4 y P5 avisan cuando un recurso va a faltar o cuando el almacén va a perder lo que no le cabe. Esta tarea escribe `avisosDeAlmacen`, la función que calcula esos dos avisos por fila del almacén a partir de la previsión de la tarea 16 y, si se le pasa, de lo que ya ocurrió en un avance. No se conecta todavía a `avisosEn` (eso es la tarea 19): esta tarea la deja escrita y probada por su cuenta.

**Reglas de la especificación que implementa:**

- **Tabla de avisos** (esp l.1332-1348, la única tabla para Inicio, A1, A4, A8, J1, P4, P5 y la barra superior): «Falta de un recurso · Ocurrida durante un avance, o prevista en 7 días o menos · Rojo · A8» · «Falta prevista · Entre 8 y 30 días · Ámbar · A8» · «Recurso perdido · Lo que excede la capacidad al entrar, ocurrido durante un avance o previsto en 30 días o menos · Ámbar · A8».
- **Datos del ejemplo** (esp l.1349-1352): «El 12 de abril, los víveres de Bree (se agotan el 23, a 11 días) son **ámbar** en Inicio, A1, A4 y A8… En P4, P5 e Inicio del 19: víveres en **rojo** (a 4 días)… La barra superior del 19 dice "Víveres de Bree: se agotan el 23", con icono de alerta.»
- **Capacidad y pérdida** (esp l.1107-1108): «lo que excede la capacidad al producir o al llegar una caravana se pierde, con aviso ámbar ("Se perdieron N …")… El aviso "Recurso perdido" sale si la pérdida ocurrió durante un avance o está prevista en 30 días o menos, en ámbar.»
- **D-048** (`decisiones-fase-4.md`): «Las faltas y pérdidas que ocurren durante un avance se avisan en la vista previa y en el resumen del avance (P4 y P5); Inicio, A1, A4 y A8 avisan de las previstas. Cada fila del almacén da como mucho un aviso de falta y uno de pérdida: el de lo ocurrido si lo hubo y, si no, el previsto.»
- **D-049**: «La falta ocurrida dice el primer día sin servir y lo que faltó en todo el avance; la pérdida prevista, el primer día que no cabe y lo que se pierde ese día; la pérdida ocurrida, lo perdido en todo el avance desde su primer día.»
- **D-050** (diferencia anotada con la especificación y las vistas): «El 19 de abril del ejemplo sale un aviso ámbar más de los que enseñan la especificación y las vistas: "Se perderán 7 fardos de lana en Bree el 19 de mayo". La lana llega a 95 de 100 el 12 de mayo y el 19 no le caben los 12 fardos del sábado, justo a 30 días. Es lo que manda la regla de "Recurso perdido" (§9 l.1347, "en 30 días o menos").»
- **D-051**: los textos exactos de `avisoFaltaPrevista` (con y sin caravana que tarda), `avisoFaltaOcurrida`, `avisoPerdidaPrevista` y `avisoPerdidaOcurrida` (ya escritos en la tarea 7, `motor/textos.ts`); la concordancia en singular con «1 …» o «menos de 1 …».
- **TC1** (`decisiones-fase-4.md`): por debajo de `TOLERANCIA` una falta o una pérdida cuentan 0.
- **§3.12 del contrato** (`contrato.md`): la firma `avisosDeAlmacen(estado, catalogo, ocurrido?)` y sus reglas exactas: falta ocurrida (rojo, `avisoFaltaOcurrida`), falta prevista con `d = diasEntre(hoy, primer día con falta)` (rojo si `d ≤ 7`, con la caravana de vuelta más temprana que tarda; ámbar si `8 ≤ d ≤ 30`, sin caravana), pérdida ocurrida y pérdida prevista, siempre «lo ocurrido manda sobre lo previsto».
- **O10** (`contrato.md` §6): los avisos exactos del 12 de abril, del 19 de abril y de lo ocurrido a 98 días que reproducen las pruebas de esta tarea.

**Archivos:**
- Crear: `src/dominio/avisos/almacen.ts`, `src/dominio/avisos/almacen.test.ts`

- [ ] **Paso 1: Escribir la prueba y ver que falla**

Crea `src/dominio/avisos/almacen.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { RECURSO } from '../catalogo/inicial'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { conAsentamiento, conFila, estadoMinimo } from '../motor/pruebas/constructores'
import { avisosDeAlmacen } from './almacen'

/** El 12 de abril de 1640: la fecha actual del ejemplo y la de `estadoMinimo`. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

function F(dia: number, mes: number, anio = 1640): Fecha {
  return { anio, mes, dia }
}

const catalogo: CatalogosEnCopia = catalogosDeEjemplo()

function estadoEjemplo(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

/** Avanza `dias` días sin guardar y devuelve el estado nuevo y sus flujos («lo ocurrido»). */
function avanzar(estado: EstadoPartida, dias: number, hasta: Fecha) {
  const recorrido = recorrerDias(estado, hasta, { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo })
  void dias
  return recorrido
}

/** Un asentamiento de prueba con `habitantes` personas y `cantidad` sacos de víveres, sin capacidad. */
function estadoConVivres(habitantes: number, cantidad: number): EstadoPartida {
  const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.prueba', nombre: 'Prueba', caja: 0, habitantes })
  return conFila(base, { dominioId: 'dom.prueba', recursoId: RECURSO.viveres, cantidad })
}

describe('avisosDeAlmacen: O10, 12 de abril (previsión a 30 días, sin lo ocurrido)', () => {
  it('un solo aviso ámbar: los víveres de Bree se agotan el 23 de abril', () => {
    expect(avisosDeAlmacen(estadoEjemplo(), catalogo)).toEqual([
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: DOM.bree,
        fecha: F(23, 4),
        texto: 'Los víveres de Bree se agotan el 23 de abril',
      },
    ])
  })
})

describe('avisosDeAlmacen: O10 y D-050, 19 de abril (7 días después, sin guardar)', () => {
  const alos19 = avanzar(estadoEjemplo(), 7, F(19, 4)).estadoNuevo

  it('rojo con la caravana de Tharbad, que no vuelve hasta el 25 (dentro de los 7 días)', () => {
    const avisos = avisosDeAlmacen(alos19, catalogo)
    const falta = avisos.find((a) => a.tipo === 'faltaDeRecurso')
    expect(falta).toEqual({
      tipo: 'faltaDeRecurso',
      color: 'rojo',
      dominioId: DOM.bree,
      fecha: F(23, 4),
      texto: 'Los víveres de Bree se agotan el 23 de abril y la caravana de Tharbad no vuelve hasta el 25 de abril',
    })
  })

  it('ámbar: se perderán 7 fardos de lana en Bree el 19 de mayo (D-050: justo a 30 días de hoy)', () => {
    const avisos = avisosDeAlmacen(alos19, catalogo)
    const perdida = avisos.find((a) => a.dominioId === DOM.bree && a.tipo === 'recursoPerdido')
    expect(perdida).toEqual({
      tipo: 'recursoPerdido',
      color: 'ambar',
      dominioId: DOM.bree,
      fecha: F(19, 5),
      texto: 'Se perderán 7 fardos de lana en Bree el 19 de mayo',
    })
  })
})

describe('avisosDeAlmacen: lo ocurrido manda sobre lo previsto (O10, 19 de julio con simular(…, 98))', () => {
  const al19Julio = avanzar(estadoEjemplo(), 98, F(19, 7))
  const avisos = avisosDeAlmacen(al19Julio.estadoNuevo, catalogo, al19Julio.flujos)

  it('faltas ocurridas: víveres de Bree (2.217 sacos) y de Archet (113 sacos), y madera de Bree (62 haces)', () => {
    const porTexto = avisos.filter((a) => a.tipo === 'faltaDeRecurso').map((a) => a.texto)
    expect(porTexto).toContain('Los víveres de Bree se agotaron el 23 de abril: faltaron 2.217 sacos')
    expect(porTexto).toContain('Los víveres de Archet se agotaron el 9 de julio: faltaron 113 sacos')
    expect(porTexto).toContain('Bree se quedó sin madera el 6 de julio: faltaron 62 haces')
  })

  it('la cerveza de Bree todavía no ha faltado en esos 98 días: sale con la falta prevista, rojo (7 días)', () => {
    const cerveza = avisos.find((a) => a.tipo === 'faltaDeRecurso' && a.texto.includes('cerveza'))
    expect(cerveza?.texto).toBe('Bree se queda sin cerveza el 26 de julio')
  })

  it('como mucho un aviso de falta por fila: la lista no repite Bree víveres', () => {
    const deVideres = avisos.filter((a) => a.tipo === 'faltaDeRecurso' && a.texto.includes('víveres de Bree'))
    expect(deVideres).toHaveLength(1)
  })

  it('pérdidas ocurridas: 103 fardos de lana desde el 19 de mayo y 13 carretadas de piedra el 14 de julio', () => {
    const porTexto = avisos.filter((a) => a.tipo === 'recursoPerdido').map((a) => a.texto)
    expect(porTexto).toContain('Se perdieron 103 fardos de lana en Bree desde el 19 de mayo')
    expect(porTexto).toContain('Se perdieron 13 carretadas de piedra en Bree el 14 de julio')
  })
})

describe('avisosDeAlmacen: rojo con 7 días, ámbar con 8 y 30, nada con 31 o más', () => {
  it('primer día de falta a 7 días: rojo, sin caravana', () => {
    const avisos = avisosDeAlmacen(estadoConVivres(30, 6), catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: F(19, 4),
        texto: 'Los víveres de Prueba se agotan el 19 de abril',
      },
    ])
  })

  it('primer día de falta a 8 días: ámbar', () => {
    const avisos = avisosDeAlmacen(estadoConVivres(30, 7), catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: 'dom.prueba',
        fecha: F(20, 4),
        texto: 'Los víveres de Prueba se agotan el 20 de abril',
      },
    ])
  })

  it('primer día de falta a 30 días: todavía ámbar', () => {
    const avisos = avisosDeAlmacen(estadoConVivres(30, 29), catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: 'dom.prueba',
        fecha: F(12, 5),
        texto: 'Los víveres de Prueba se agotan el 12 de mayo',
      },
    ])
  })

  it('primer día de falta a 31 días, fuera de los 30 de la previsión: sin aviso', () => {
    expect(avisosDeAlmacen(estadoConVivres(30, 30), catalogo)).toEqual([])
  })
})

describe('avisosDeAlmacen: un recurso que no es víveres', () => {
  it('«Prueba se queda sin madera el …», sin «Los … se agotan»', () => {
    // Víveres con existencias de sobra (100.000, nunca falta en 30 días): así el único aviso es el de la madera.
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.prueba', nombre: 'Prueba', caja: 0, habitantes: 1 })
    const poblacion = {
      ...base.poblaciones[0],
      consumos: [{ id: 'cons.madera', nombre: 'Madera', recursoId: RECURSO.madera, porHabitante: 1 }],
    }
    const conConsumo: EstadoPartida = {
      ...conFila(conFila(base, { dominioId: 'dom.prueba', recursoId: RECURSO.viveres, cantidad: 100000 }), {
        dominioId: 'dom.prueba',
        recursoId: RECURSO.madera,
        cantidad: 6,
      }),
      poblaciones: [poblacion],
    }
    const avisos = avisosDeAlmacen(conConsumo, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: F(19, 4),
        texto: 'Prueba se queda sin madera el 19 de abril',
      },
    ])
  })
})

describe('avisosDeAlmacen: la frase de un traslado que llega después dice «no llega»', () => {
  it('caravana de traslado con vuelta posterior a la falta', () => {
    const conOrigen = conAsentamiento(estadoMinimo(HOY), { id: 'dom.origen', nombre: 'Origen', caja: 0, habitantes: 0 })
    const base = conAsentamiento(conOrigen, { id: 'dom.destino', nombre: 'Destino', caja: 0, habitantes: 30 })
    const estado: EstadoPartida = {
      ...conFila(base, { dominioId: 'dom.destino', recursoId: RECURSO.viveres, cantidad: 6 }),
      caravanas: [
        {
          id: 'car.prueba-traslado',
          dominioId: 'dom.origen',
          operacion: 'traslado',
          destinoId: 'dom.destino',
          carga: { recursoId: RECURSO.viveres, cantidad: 50 },
          salida: F(15, 4),
          vuelta: F(26, 4),
          estado: 'enRuta',
        },
      ],
    }
    const avisos = avisosDeAlmacen(estado, catalogo)
    expect(avisos.find((a) => a.tipo === 'faltaDeRecurso')?.texto).toBe(
      'Los víveres de Destino se agotan el 19 de abril y la caravana de Origen no llega hasta el 26 de abril',
    )
  })
})
```

```bash
npx vitest run src/dominio/avisos/almacen.test.ts
```

Fallo esperado (`avisos/almacen.ts` todavía no existe):

```text
 ❯ src/dominio/avisos/almacen.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/avisos/almacen.test.ts [ src/dominio/avisos/almacen.test.ts ]
Error: Cannot find module './almacen' imported from .../src/dominio/avisos/almacen.test.ts
 ❯ src/dominio/avisos/almacen.test.ts:11:1
      9| import { conAsentamiento, conFila, estadoMinimo } from '../motor/prueb…
     10|
     11| import { avisosDeAlmacen } from './almacen'
       | ^

 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 2: Escribir `avisos/almacen.ts`**

Crea `src/dominio/avisos/almacen.ts` con este contenido:

```ts
import { claveExistencia } from '../almacen/cantidades'
import { DIAS_DE_PREVISION, preverAlmacen, resumirFilas, type ResumenFila } from '../almacen/prevision'
import { compararFechas, diasEntre, type Fecha } from '../calendario/fecha'
import { formatearDiaCercano } from '../calendario/formatoFecha'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { AvisoConFecha, FlujoAlmacen } from '../motor/tipos'
import { avisoFaltaOcurrida, avisoFaltaPrevista, avisoPerdidaOcurrida, avisoPerdidaPrevista, recursoDelCatalogo, type CaravanaQueTarda } from '../motor/textos'

/** El primer día de una tanda de faltas ocurridas o previstas (§9, tabla; D-048, D-049, D-051). */
function primerDiaDeFalta(fila: ResumenFila): Fecha | undefined {
  return fila.tramosDeFalta[0]?.desde
}

/**
 * La caravana de vuelta más temprana que llega después del primer día de falta: una compra a este dominio o un
 * traslado a este dominio, del mismo recurso, en ruta o programada (§3.12).
 */
function caravanaQueTarda(
  estado: EstadoPartida,
  dominioId: Id,
  recursoId: Id,
  primerDiaFalta: Fecha,
  hoy: Fecha,
  nombres: ReadonlyMap<Id, string>,
  mercados: ReadonlyMap<Id, string>,
): CaravanaQueTarda | undefined {
  let mejor: { vuelta: Fecha; de: string; operacion: 'compra' | 'traslado' } | undefined
  for (const caravana of estado.caravanas) {
    if (caravana.estado !== 'enRuta' && caravana.estado !== 'programada') {
      continue
    }
    if (caravana.carga.recursoId !== recursoId) {
      continue
    }
    let de: string | undefined
    let operacion: 'compra' | 'traslado' | undefined
    if (caravana.operacion === 'compra' && caravana.dominioId === dominioId) {
      de = caravana.mercadoId === undefined ? undefined : (mercados.get(caravana.mercadoId) ?? caravana.mercadoId)
      operacion = 'compra'
    } else if (caravana.operacion === 'traslado' && caravana.destinoId === dominioId) {
      de = nombres.get(caravana.dominioId) ?? caravana.dominioId
      operacion = 'traslado'
    } else {
      continue
    }
    if (de === undefined || operacion === undefined) {
      continue
    }
    if (compararFechas(caravana.vuelta, primerDiaFalta) <= 0) {
      continue
    }
    if (mejor === undefined || compararFechas(caravana.vuelta, mejor.vuelta) < 0) {
      mejor = { vuelta: caravana.vuelta, de, operacion }
    }
  }
  return mejor === undefined ? undefined : { de: mejor.de, operacion: mejor.operacion, fecha: formatearDiaCercano(mejor.vuelta, hoy) }
}

/**
 * Faltas y pérdidas (§9, tabla; D-048, D-049, D-051): una previsión de DIAS_DE_PREVISION y, si se pasa, lo
 * ocurrido en el avance. Por fila (en el orden de estado.existencias y después las que solo salen en los
 * flujos), como mucho un aviso de falta y uno de pérdida: lo ocurrido manda sobre lo previsto.
 */
export function avisosDeAlmacen(
  estado: EstadoPartida,
  catalogo: CatalogosEnCopia,
  ocurrido?: readonly FlujoAlmacen[],
): AvisoConFecha[] {
  const hoy = estado.partida.fechaActual
  const prevision = preverAlmacen(estado, catalogo, DIAS_DE_PREVISION)
  const previstas = resumirFilas(estado.existencias, prevision.final, prevision.flujos)
  const ocurridas = ocurrido === undefined ? undefined : resumirFilas(estado.existencias, estado.existencias, ocurrido)

  const previstasPorClave = new Map(previstas.map((f) => [claveExistencia(f.dominioId, f.recursoId), f]))
  const ocurridasPorClave = new Map((ocurridas ?? []).map((f) => [claveExistencia(f.dominioId, f.recursoId), f]))
  const claves: string[] = []
  const vistos = new Set<string>()
  for (const fila of previstas) {
    const clave = claveExistencia(fila.dominioId, fila.recursoId)
    vistos.add(clave)
    claves.push(clave)
  }
  for (const fila of ocurridas ?? []) {
    const clave = claveExistencia(fila.dominioId, fila.recursoId)
    if (!vistos.has(clave)) {
      vistos.add(clave)
      claves.push(clave)
    }
  }

  const nombres = new Map(estado.dominios.map((d) => [d.id, d.nombre]))
  const mercados = new Map(estado.mercados.map((m) => [m.id, m.nombre]))
  const avisos: AvisoConFecha[] = []

  for (const clave of claves) {
    const previsto = previstasPorClave.get(clave)
    const ocurrida = ocurridasPorClave.get(clave)
    const referencia = previsto ?? ocurrida
    if (referencia === undefined) {
      continue
    }
    const { dominioId, recursoId } = referencia
    const asentamiento = nombres.get(dominioId) ?? dominioId
    const recurso = recursoDelCatalogo(catalogo, recursoId)

    // Falta: lo ocurrido manda sobre lo previsto.
    const primerDiaOcurrida = ocurrida === undefined ? undefined : primerDiaDeFalta(ocurrida)
    if (ocurrida !== undefined && primerDiaOcurrida !== undefined) {
      avisos.push({
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId,
        fecha: primerDiaOcurrida,
        texto: avisoFaltaOcurrida(asentamiento, recurso, formatearDiaCercano(primerDiaOcurrida, hoy), ocurrida.falta),
      })
    } else if (previsto !== undefined) {
      const primerDiaPrevista = primerDiaDeFalta(previsto)
      if (primerDiaPrevista !== undefined) {
        const d = diasEntre(hoy, primerDiaPrevista)
        if (d <= 7) {
          const caravana = caravanaQueTarda(estado, dominioId, recursoId, primerDiaPrevista, hoy, nombres, mercados)
          avisos.push({
            tipo: 'faltaDeRecurso',
            color: 'rojo',
            dominioId,
            fecha: primerDiaPrevista,
            texto: avisoFaltaPrevista(asentamiento, recurso, formatearDiaCercano(primerDiaPrevista, hoy), caravana),
          })
        } else if (d <= 30) {
          avisos.push({
            tipo: 'faltaPrevista',
            color: 'ambar',
            dominioId,
            fecha: primerDiaPrevista,
            texto: avisoFaltaPrevista(asentamiento, recurso, formatearDiaCercano(primerDiaPrevista, hoy)),
          })
        }
      }
    }

    // Pérdida: lo ocurrido manda sobre lo previsto.
    if (ocurrida !== undefined && ocurrida.primeraPerdida !== undefined) {
      const { fecha } = ocurrida.primeraPerdida
      avisos.push({
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId,
        fecha,
        texto: avisoPerdidaOcurrida(
          asentamiento,
          recurso,
          ocurrida.perdido,
          formatearDiaCercano(fecha, hoy),
          ocurrida.diasConPerdida > 1,
        ),
      })
    } else if (previsto !== undefined && previsto.primeraPerdida !== undefined) {
      const { fecha, cantidad } = previsto.primeraPerdida
      avisos.push({
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId,
        fecha,
        texto: avisoPerdidaPrevista(asentamiento, recurso, cantidad, formatearDiaCercano(fecha, hoy)),
      })
    }
  }
  return avisos
}
```

Tres detalles que no se pueden perder al copiarlo:

1. La lista de `claves` que se recorre es la **unión** de las filas previstas y las ocurridas (primero las previstas, en su orden, y detrás las que solo salen en lo ocurrido): así una fila que ya no aparece en la previsión de 30 días (por ejemplo, un recurso que se agotó del todo) no se pierde si tuvo una falta ocurrida.
2. Cada fila hace como mucho un `avisos.push` de falta y uno de pérdida: los dos `if`/`else if` («lo ocurrido manda sobre lo previsto») son la traducción directa de D-048.
3. `caravanaQueTarda` solo mira caravanas **en ruta o programadas**, del mismo recurso, con `vuelta` **estrictamente posterior** al primer día de falta (`compararFechas(caravana.vuelta, primerDiaFalta) <= 0` descarta las que llegan a tiempo o antes), y de ellas coge la de vuelta más temprana.

- [ ] **Paso 3: Ejecutar la prueba y verla pasar**

```bash
npx vitest run src/dominio/avisos/almacen.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 Test Files  1 passed (1)
      Tests  13 passed (13)
```

- [ ] **Paso 4: Comprobar los tipos, todas las pruebas, el lint y la compilación**

```bash
npx tsc -b
npm test
npm run lint
npm run build
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` no escribe nada y sale con código 0; `npm run build` termina con `✓ built in …`.

**Sobre el recuento de `npm test`** (mismo aviso que en las tareas 11, 15 y 16). Lo exacto y verificado en este archivo: `avisos/almacen.ts` es un módulo nuevo de `src/dominio`, así que además de las **13 pruebas** de `almacen.test.ts` suma **una más** a `pureza.test.ts` (ahora recorre también `src/dominio/avisos/almacen.ts`): **14 pruebas y 1 archivo** en total. Cuando la tarea se ejecute de verdad, parte de lo que deje la tarea 16 en la cadena real de este plan (**1.089 pruebas en 90 archivos**) y suma esto: **1.103 pruebas en 91 archivos**. Confírmalo con el `npm test` real antes de seguir, y anota cualquier diferencia en «huecos» del informe de esta fase.

- [ ] **Paso 5: Comprobar que no se ha tocado nada más y hacer el commit**

```bash
git status --short
```

Salida esperada: solo los dos archivos nuevos de esta tarea:

```text
?? src/dominio/avisos/almacen.test.ts
?? src/dominio/avisos/almacen.ts
```

```bash
git add src/dominio/avisos/almacen.ts src/dominio/avisos/almacen.test.ts
git commit -m "feat(avisos): faltas y pérdidas del almacén, ocurridas y previstas" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía): `git status --short` no muestra nada.

---

### Tarea 18 · Avisos de obras, caravanas, compras y edificios (10)

A7, A9 y A10 avisan cuando una obra o una caravana programada lleva días esperando sin poder empezar (D-044: lo reintenta cada día, pero mientras tanto hay que decírselo al jugador) y cuando un edificio acaba de terminar una obra y todavía no se le ha anotado su producción. Esta tarea escribe `avisosDeObrasYCaravanas` y `avisosDeEdificios`, las dos funciones que leen el estado actual (sin simular nada) para esos cuatro avisos. Como la tarea 17, no se conecta todavía a `avisosEn` (tarea 19).

**Reglas de la especificación que implementa:**

- **Tabla de avisos** (esp l.1339-1343): «Obra que no pudo empezar · Obra programada sin dinero o sin materiales · Rojo · A9» · «Caravana o compra que no pudo salir · Programada sin dinero o sin carga · Rojo · A10 o A8» · «Edificio terminado sin producción · Obra "Construir edificio" terminada, hasta guardar el edificio en A7b por primera vez o eliminarlo · Ámbar · A7» · «Mejora terminada · Obra "Mejorar edificio" terminada, hasta guardar el edificio en A7b · Ámbar · A7».
- **D-044** (`decisiones-fase-4.md`): «Una obra, una caravana o una compra programada que no puede empezar el día señalado (le falta dinero, materiales o carga) lo vuelve a intentar cada día.» Esta tarea no cambia ese comportamiento (lo hicieron las tareas 9 a 13): solo avisa mientras sigue esperando.
- **D-047**: «"Obra que no pudo empezar" y "Caravana o compra que no pudo salir" salen mientras la programada siga esperando con la fecha ya pasada, y dicen lo que falta en ese momento. No se avisa de antemano de las que no podrán empezar. El aviso habla en pasado ("no pudo") y así no hace falta otra simulación»: por eso las dos funciones de esta tarea leen `estado` directamente, sin llamar a `preverAlmacen`.
- **D-051**: los textos exactos de `avisoObraQueNoPudoEmpezar`, `avisoCaravanaQueNoPudoSalir`, `avisoCompraQueNoPudoHacerse`, `avisoEdificioTerminado`, `avisoMejoraTerminada` y `faltaDeDinero` (ya escritos en la tarea 7, `motor/textos.ts`), con sus ejemplos: «La obra "Horno comunal" no pudo empezar por falta de 20 carretadas de cal y 12 mo en la caja», «La caravana de compra a Fornost no pudo salir por falta de 12 mo en la caja», «La compra de víveres en Bree no pudo hacerse por falta de 12 mo en la caja».
- **Edificio terminado y mejora terminada** (esp §7 l.1145-1146, ya citadas en `motor/textos.ts`, tarea 7): «Horno comunal está terminado: anota su producción y sus trabajadores» y «La mejora de Cantera está terminada: anota su producción», con el `avisoPendiente` que dejó el paso 6 (tarea 12) en el edificio.
- **TC13** (`decisiones-fase-4.md`): «Los avisos que se leen del estado (obras, caravanas, compras, edificios) se fechan con la fecha actual para ordenarlos.»
- **§3.12 del contrato** (`contrato.md`): las firmas exactas de `avisosDeObrasYCaravanas(estado, catalogo)` y `avisosDeEdificios(estado)`, y la regla de las faltas: «las faltas son los materiales o la carga que no hay hoy (`cantidadDeRecurso(falta, recurso)`) y, si la caja no llega al pago programado, `faltaDeDinero(formatearOro(importe − saldo, eq))`; `fecha` = la fecha actual; `dominioId` = el del registro.»

**Archivos:**
- Crear: `src/dominio/avisos/pendientes.ts`, `src/dominio/avisos/pendientes.test.ts`

- [ ] **Paso 1: Escribir la prueba y ver que falla**

Crea `src/dominio/avisos/pendientes.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { RECURSO } from '../catalogo/inicial'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Caravana } from '../modelo/comercio'
import type { Edificio, Obra } from '../modelo/asentamiento'
import type { EstadoPartida } from '../modelo/documento'
import { conAsentamiento, conFila, estadoMinimo } from '../motor/pruebas/constructores'
import { avisosDeEdificios, avisosDeObrasYCaravanas } from './pendientes'

/** El 12 de abril de 1640: la fecha actual de `estadoMinimo`. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

function F(dia: number, mes: number, anio = 1640): Fecha {
  return { anio, mes, dia }
}

const catalogo: CatalogosEnCopia = catalogosDeEjemplo()

/** Un asentamiento de prueba con caja y, si se pide, una fila de piedra. */
function base(caja: number, piedra = 0): EstadoPartida {
  const estado = conAsentamiento(estadoMinimo(HOY), { id: 'dom.prueba', nombre: 'Prueba', caja })
  return conFila(estado, { dominioId: 'dom.prueba', recursoId: RECURSO.piedra, cantidad: piedra })
}

function conObra(estado: EstadoPartida, obra: Partial<Obra> & Pick<Obra, 'estado' | 'materiales'>): EstadoPartida {
  const completa: Obra = {
    id: 'obra.prueba',
    dominioId: 'dom.prueba',
    nombre: 'Horno comunal',
    coste: { base: 0 },
    diasTotales: 10,
    efecto: { tipo: 'crearDefensa', tipoId: 'tipo.defensa' },
    ...obra,
  }
  return { ...estado, obras: [...estado.obras, completa] }
}

function conCaravana(estado: EstadoPartida, caravana: Partial<Caravana> & Pick<Caravana, 'operacion' | 'carga' | 'salida' | 'vuelta'>): EstadoPartida {
  const completa: Caravana = {
    id: 'car.prueba',
    dominioId: 'dom.prueba',
    estado: 'programada',
    ...caravana,
  }
  return { ...estado, caravanas: [...estado.caravanas, completa] }
}

describe('avisosDeObrasYCaravanas: obras', () => {
  it('programada con la fecha pasada, sin materiales ni dinero: «por falta de 20 carretadas de cal y 12 mo en la caja»', () => {
    const estado = conObra(base(0, 0), {
      estado: 'programada',
      inicio: F(10, 4),
      materiales: { 'recurso.piedra': 20 },
      movimientoId: 'mov.prueba',
    })
    const conMovimiento: EstadoPartida = {
      ...estado,
      movimientos: [
        {
          id: 'mov.prueba',
          dominioId: 'dom.prueba',
          fecha: F(10, 4),
          tipo: 'gasto',
          importe: { base: -1200000 },
          categoriaId: 'cat.obras',
          concepto: 'Obra: horno comunal',
          origen: 'manual',
          programado: true,
        },
      ],
    }
    const avisos = avisosDeObrasYCaravanas(conMovimiento, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'obraQueNoPudoEmpezar',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La obra «Horno comunal» no pudo empezar por falta de 20 carretadas de piedra y 12 mo en la caja',
      },
    ])
  })

  it('una programada con inicio futuro no avisa', () => {
    const estado = conObra(base(0, 0), { estado: 'programada', inicio: F(20, 4), materiales: {} })
    expect(avisosDeObrasYCaravanas(estado, catalogo)).toEqual([])
  })

  it('sin faltas (dinero y materiales de sobra), sin «por falta de»', () => {
    const estado = conObra(base(10000000, 100), {
      estado: 'programada',
      inicio: F(12, 4),
      materiales: { 'recurso.piedra': 20 },
    })
    const avisos = avisosDeObrasYCaravanas(estado, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'obraQueNoPudoEmpezar',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La obra «Horno comunal» no pudo empezar',
      },
    ])
  })
})

describe('avisosDeObrasYCaravanas: caravanas', () => {
  it('compra programada sin dinero: «no pudo salir por falta de … en la caja»', () => {
    const estado = conCaravana(base(0), {
      operacion: 'compra',
      mercadoId: 'mercado.fornost',
      carga: { recursoId: RECURSO.viveres, cantidad: 100 },
      importe: { base: 3000000 },
      movimientoSalidaId: 'mov.compra',
      salida: F(10, 4),
      vuelta: F(14, 4),
    })
    const estadoConNombre: EstadoPartida = {
      ...estado,
      mercados: [{ id: 'mercado.fornost', nombre: 'Fornost', precios: [] }],
      movimientos: [
        {
          id: 'mov.compra',
          dominioId: 'dom.prueba',
          fecha: F(10, 4),
          tipo: 'gasto',
          importe: { base: -3000000 },
          categoriaId: 'cat.comercio',
          concepto: 'Caravana: compra de víveres en Fornost',
          origen: 'manual',
          programado: true,
        },
      ],
    }
    const avisos = avisosDeObrasYCaravanas(estadoConNombre, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'caravanaQueNoPudoSalir',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La caravana de compra a Fornost no pudo salir por falta de 30 mo en la caja',
      },
    ])
  })

  it('venta programada sin carga: «no pudo salir por falta de … barriles de cerveza»', () => {
    const estado = conCaravana(base(0), {
      operacion: 'venta',
      mercadoId: 'mercado.fornost',
      carga: { recursoId: RECURSO.cerveza, cantidad: 10 },
      importe: { base: 400000 },
      salida: F(10, 4),
      vuelta: F(14, 4),
    })
    const estadoConNombre: EstadoPartida = { ...estado, mercados: [{ id: 'mercado.fornost', nombre: 'Fornost', precios: [] }] }
    const avisos = avisosDeObrasYCaravanas(estadoConNombre, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'caravanaQueNoPudoSalir',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La caravana de venta a Fornost no pudo salir por falta de 10 barriles de cerveza',
      },
    ])
  })

  it('traslado programado sin carga: «no pudo salir por falta de … » con el asentamiento de destino', () => {
    const conDestino = conAsentamiento(base(0), { id: 'dom.destino', nombre: 'Destino', caja: 0 })
    const estado = conCaravana(conDestino, {
      operacion: 'traslado',
      destinoId: 'dom.destino',
      carga: { recursoId: RECURSO.madera, cantidad: 30 },
      salida: F(10, 4),
      vuelta: F(13, 4),
    })
    const avisos = avisosDeObrasYCaravanas(estado, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'caravanaQueNoPudoSalir',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La caravana de traslado a Destino no pudo salir por falta de 30 haces de madera',
      },
    ])
  })

  it('compra del mercado local sin aplicar y sin dinero: avisoCompraQueNoPudoHacerse', () => {
    const estado: EstadoPartida = {
      ...base(0),
      mercados: [{ id: 'mercado.prueba', nombre: 'Prueba', localDe: 'dom.prueba', precios: [] }],
      entradasAlmacen: [
        {
          id: 'entrada.prueba',
          dominioId: 'dom.prueba',
          recursoId: RECURSO.viveres,
          cantidad: 100,
          operacion: 'compra',
          mercadoId: 'mercado.prueba',
          precioUnidad: { base: 40000 },
          movimientoId: 'mov.entrada',
          fecha: F(10, 4),
          aplicada: false,
        },
      ],
      movimientos: [
        {
          id: 'mov.entrada',
          dominioId: 'dom.prueba',
          fecha: F(10, 4),
          tipo: 'gasto',
          importe: { base: -4000000 },
          categoriaId: 'cat.viveres-del-almacen',
          concepto: 'Compra de víveres en Prueba',
          origen: 'manual',
          programado: true,
        },
      ],
    }
    const avisos = avisosDeObrasYCaravanas(estado, catalogo)
    expect(avisos).toEqual([
      {
        tipo: 'caravanaQueNoPudoSalir',
        color: 'rojo',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La compra de víveres en Prueba no pudo hacerse por falta de 40 mo en la caja',
      },
    ])
  })
})

describe('avisosDeEdificios', () => {
  it('edificioTerminadoSinProduccion y mejoraTerminada, ámbar, fecha actual', () => {
    const edificioNuevo: Edificio = {
      id: 'ed.nuevo',
      dominioId: 'dom.prueba',
      tipoId: 'tipo.edificio',
      nombre: 'Molino',
      estado: 'inactivo',
      trabajadoresNecesarios: 0,
      producciones: [],
      avisoPendiente: { tipo: 'terminadoSinProduccion', obraId: 'obra.molino' },
    }
    const edificioMejorado: Edificio = {
      id: 'ed.mejorado',
      dominioId: 'dom.prueba',
      tipoId: 'tipo.edificio',
      nombre: 'Cantera',
      estado: 'activo',
      trabajadoresNecesarios: 3,
      producciones: [],
      avisoPendiente: { tipo: 'mejoraTerminada', obraId: 'obra.cantera' },
    }
    const estado: EstadoPartida = { ...base(0), edificios: [edificioNuevo, edificioMejorado] }
    expect(avisosDeEdificios(estado)).toEqual([
      {
        tipo: 'edificioTerminadoSinProduccion',
        color: 'ambar',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'Molino está terminado: anota su producción y sus trabajadores',
      },
      {
        tipo: 'mejoraTerminada',
        color: 'ambar',
        dominioId: 'dom.prueba',
        fecha: HOY,
        texto: 'La mejora de Cantera está terminada: anota su producción',
      },
    ])
  })

  it('un edificio sin avisoPendiente no avisa', () => {
    const edificio: Edificio = {
      id: 'ed.normal',
      dominioId: 'dom.prueba',
      tipoId: 'tipo.edificio',
      nombre: 'Aserradero',
      estado: 'activo',
      trabajadoresNecesarios: 3,
      producciones: [],
    }
    const estado: EstadoPartida = { ...base(0), edificios: [edificio] }
    expect(avisosDeEdificios(estado)).toEqual([])
  })
})
```

```bash
npx vitest run src/dominio/avisos/pendientes.test.ts
```

Fallo esperado (`avisos/pendientes.ts` todavía no existe):

```text
 ❯ src/dominio/avisos/pendientes.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/avisos/pendientes.test.ts [ src/dominio/avisos/pendientes.test.ts ]
Error: Cannot find module './pendientes' imported from .../src/dominio/avisos/pendientes.test.ts
 ❯ src/dominio/avisos/pendientes.test.ts:10:1
      8| import type { EstadoPartida } from '../modelo/documento'
      9| import { conAsentamiento, conFila, estadoMinimo } from '../motor/prueb…
     10| import { avisosDeEdificios, avisosDeObrasYCaravanas } from './pendient…
       | ^

 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 2: Escribir `avisos/pendientes.ts`**

Crea `src/dominio/avisos/pendientes.ts` con este contenido:

```ts
import { cantidadDeRecurso, TOLERANCIA } from '../almacen/cantidades'
import { compararFechas } from '../calendario/fecha'
import { formatearOro } from '../dinero/formato'
import { redondearMitadArriba } from '../dinero/importe'
import { saldosPorDominio } from '../dinero/saldo'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { EstadoPartida } from '../modelo/documento'
import type { AvisoConFecha } from '../motor/tipos'
import {
  avisoCaravanaQueNoPudoSalir,
  avisoCompraQueNoPudoHacerse,
  avisoEdificioTerminado,
  avisoMejoraTerminada,
  avisoObraQueNoPudoEmpezar,
  faltaDeDinero,
  nombreDeRecurso,
  recursoDelCatalogo,
} from '../motor/textos'

/** Lo que le falta hoy a una fila del almacén de un material o una carga, o null si hay bastante. */
function faltaDeMaterial(
  estado: EstadoPartida,
  catalogo: CatalogosEnCopia,
  dominioId: string,
  recursoId: string,
  cantidad: number,
): string | null {
  const fila = estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
  const disponible = fila?.cantidad ?? 0
  const falta = cantidad - disponible
  if (falta <= TOLERANCIA) {
    return null
  }
  return cantidadDeRecurso(falta, recursoDelCatalogo(catalogo, recursoId))
}

/** Lo que le falta hoy a una caja para un pago: null si el saldo llega o no hace falta pagar nada. */
function faltaDeCaja(estado: EstadoPartida, dominioId: string, importe: number): string | null {
  if (importe <= 0) {
    return null
  }
  const saldo = saldosPorDominio(estado)[dominioId] ?? 0
  if (importe <= saldo) {
    return null
  }
  return faltaDeDinero(formatearOro(importe - saldo, estado.partida.equivalencias))
}

/**
 * Obras programadas con inicio ≤ hoy, caravanas programadas con salida ≤ hoy y compras del mercado local sin
 * aplicar con fecha ≤ hoy, con lo que les falta hoy (D-047). Rojos: obraQueNoPudoEmpezar, caravanaQueNoPudoSalir
 * (también las compras).
 */
export function avisosDeObrasYCaravanas(estado: EstadoPartida, catalogo: CatalogosEnCopia): AvisoConFecha[] {
  const hoy = estado.partida.fechaActual
  const avisos: AvisoConFecha[] = []
  const nombres = new Map(estado.dominios.map((d) => [d.id, d.nombre]))
  const mercados = new Map(estado.mercados.map((m) => [m.id, m.nombre]))

  for (const obra of estado.obras) {
    if (obra.estado !== 'programada' || obra.inicio === undefined || compararFechas(obra.inicio, hoy) > 0) {
      continue
    }
    const faltas: string[] = []
    for (const [recursoId, cantidad] of Object.entries(obra.materiales)) {
      const falta = faltaDeMaterial(estado, catalogo, obra.dominioId, recursoId, cantidad)
      if (falta !== null) {
        faltas.push(falta)
      }
    }
    const importe = pagoDeObra(estado, obra)
    const dineroFalta = faltaDeCaja(estado, obra.dominioId, importe)
    if (dineroFalta !== null) {
      faltas.push(dineroFalta)
    }
    avisos.push({
      tipo: 'obraQueNoPudoEmpezar',
      color: 'rojo',
      dominioId: obra.dominioId,
      fecha: hoy,
      texto: avisoObraQueNoPudoEmpezar(obra.nombre, faltas),
    })
  }

  for (const caravana of estado.caravanas) {
    if (caravana.estado !== 'programada' || compararFechas(caravana.salida, hoy) > 0) {
      continue
    }
    const faltas: string[] = []
    let destino: string
    if (caravana.operacion === 'compra') {
      const importe = caravana.importe?.base ?? 0
      const dineroFalta = faltaDeCaja(estado, caravana.dominioId, importe)
      if (dineroFalta !== null) {
        faltas.push(dineroFalta)
      }
      destino = caravana.mercadoId === undefined ? '' : (mercados.get(caravana.mercadoId) ?? caravana.mercadoId)
    } else if (caravana.operacion === 'venta') {
      const falta = faltaDeMaterial(estado, catalogo, caravana.dominioId, caravana.carga.recursoId, caravana.carga.cantidad)
      if (falta !== null) {
        faltas.push(falta)
      }
      destino = caravana.mercadoId === undefined ? '' : (mercados.get(caravana.mercadoId) ?? caravana.mercadoId)
    } else {
      const falta = faltaDeMaterial(estado, catalogo, caravana.dominioId, caravana.carga.recursoId, caravana.carga.cantidad)
      if (falta !== null) {
        faltas.push(falta)
      }
      destino = caravana.destinoId === undefined ? '' : (nombres.get(caravana.destinoId) ?? caravana.destinoId)
    }
    avisos.push({
      tipo: 'caravanaQueNoPudoSalir',
      color: 'rojo',
      dominioId: caravana.dominioId,
      fecha: hoy,
      texto: avisoCaravanaQueNoPudoSalir(caravana.operacion, destino, faltas),
    })
  }

  for (const entrada of estado.entradasAlmacen) {
    if (
      entrada.operacion !== 'compra' ||
      entrada.aplicada ||
      entrada.caravanaId !== undefined ||
      compararFechas(entrada.fecha, hoy) > 0
    ) {
      continue
    }
    const importe = precioTotal(entrada)
    const dineroFalta = faltaDeCaja(estado, entrada.dominioId, importe)
    if (dineroFalta === null) {
      continue
    }
    const mercado = entrada.mercadoId === undefined ? '' : (mercados.get(entrada.mercadoId) ?? entrada.mercadoId)
    avisos.push({
      tipo: 'caravanaQueNoPudoSalir',
      color: 'rojo',
      dominioId: entrada.dominioId,
      fecha: hoy,
      texto: avisoCompraQueNoPudoHacerse(nombreDeRecurso(catalogo, entrada.recursoId), mercado, [dineroFalta]),
    })
  }

  return avisos
}

/** El importe pendiente de una obra programada: el de su movimiento vinculado si sigue programado, o 0. */
function pagoDeObra(estado: EstadoPartida, obra: EstadoPartida['obras'][number]): number {
  if (obra.movimientoId === undefined) {
    return 0
  }
  const movimiento = estado.movimientos.find((m) => m.id === obra.movimientoId)
  return movimiento !== undefined && movimiento.programado ? Math.abs(movimiento.importe.base) : 0
}

/** El precio de una entrada del almacén (compra): precioUnidad × cantidad, redondeado como en T22. */
function precioTotal(entrada: EstadoPartida['entradasAlmacen'][number]): number {
  if (entrada.precioUnidad === undefined) {
    return 0
  }
  return redondearMitadArriba(entrada.precioUnidad.base * entrada.cantidad)
}

/** Un aviso ámbar por edificio con avisoPendiente (§7 l.1145-1146). */
export function avisosDeEdificios(estado: EstadoPartida): AvisoConFecha[] {
  const hoy = estado.partida.fechaActual
  const avisos: AvisoConFecha[] = []
  for (const edificio of estado.edificios) {
    if (edificio.avisoPendiente === undefined) {
      continue
    }
    const texto =
      edificio.avisoPendiente.tipo === 'terminadoSinProduccion'
        ? avisoEdificioTerminado(edificio.nombre)
        : avisoMejoraTerminada(edificio.nombre)
    avisos.push({
      tipo: edificio.avisoPendiente.tipo === 'terminadoSinProduccion' ? 'edificioTerminadoSinProduccion' : 'mejoraTerminada',
      color: 'ambar',
      dominioId: edificio.dominioId,
      fecha: hoy,
      texto,
    })
  }
  return avisos
}
```

Tres detalles que no se pueden perder al copiarlo:

1. `avisosDeObrasYCaravanas` recorre **obras, después caravanas, después entradas del almacén**, siempre en el orden de la colección del estado (§3.12); dentro de cada una, las faltas van primero los materiales o la carga y, al final, el dinero (así sale «… por falta de 20 carretadas de cal y 12 mo en la caja», nunca al revés).
2. `faltaDeMaterial` y `faltaDeCaja` devuelven `null` cuando no falta nada (por debajo de `TOLERANCIA` o el saldo llega): así una obra o caravana con todo de sobra da el aviso sin «por falta de» (`avisoObraQueNoPudoEmpezar` y `avisoCaravanaQueNoPudoSalir` ya saben pintar la lista vacía, tarea 7).
3. Una entrada del almacén con `caravanaId` (una compra en otro mercado) nunca entra en este bucle (TC18: esas las avisa `avisosDeObrasYCaravanas` a través de la caravana, no de la entrada); solo las compras del mercado local, sin aplicar y con fecha ya pasada.

- [ ] **Paso 3: Ejecutar la prueba y verla pasar**

```bash
npx vitest run src/dominio/avisos/pendientes.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

- [ ] **Paso 4: Comprobar los tipos, todas las pruebas, el lint y la compilación**

```bash
npx tsc -b
npm test
npm run lint
npm run build
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` no escribe nada y sale con código 0; `npm run build` termina con `✓ built in …`.

**Sobre el recuento de `npm test`** (mismo aviso que en las tareas 11 y 15 a 17). Lo exacto y verificado en este archivo: `avisos/pendientes.ts` es un módulo nuevo de `src/dominio`, así que además de las **9 pruebas** de `pendientes.test.ts` suma **una más** a `pureza.test.ts` (ahora recorre también `src/dominio/avisos/pendientes.ts`): **10 pruebas y 1 archivo** en total. Encadenando desde lo que deja la tarea 17 en este mismo plan (**1.103 pruebas en 91 archivos**): **1.113 pruebas en 92 archivos**. Confírmalo con el `npm test` real antes de seguir, y anota cualquier diferencia en «huecos» del informe de esta fase (esta tarea 18 depende de las tareas 3 y 7, no de la 16 ni de la 17: si el coordinador ejecuta los grupos de tareas en paralelo, el número base al llegar aquí puede no ser 1.103).

- [ ] **Paso 5: Comprobar que no se ha tocado nada más y hacer el commit**

```bash
git status --short
```

Salida esperada: solo los dos archivos nuevos de esta tarea:

```text
?? src/dominio/avisos/pendientes.test.ts
?? src/dominio/avisos/pendientes.ts
```

```bash
git add src/dominio/avisos/pendientes.ts src/dominio/avisos/pendientes.test.ts
git commit -m "feat(avisos): obras y caravanas que no pudieron empezar, y edificios con producción o mejora pendiente" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía): `git status --short` no muestra nada.

---

### Tarea 19 · Avisos juntos y `simular` (2 nuevas + reescritas)

**Reglas de la especificación que implementa:**

- **Avisos vigentes, todos juntos (§9, tabla de avisos; l.1269-1378).** `avisosEn` reúne los avisos de dinero de la fase 3 (saldo negativo, impago, pago no cubierto) con los del almacén de las tareas 17 y 18: faltas y pérdidas (`avisosDeAlmacen`), obras y caravanas que no pudieron empezar o salir y compras que no pudieron hacerse (`avisosDeObrasYCaravanas`), y edificios y mejoras terminados (`avisosDeEdificios`); todos pasan por `ordenarAvisos`, que ya ordenaba los de dinero (fase 3) y no cambia.
- **TC13 (`decisiones-fase-4.md`).** «`avisosEn(estado, catalogo, ocurrido = [])`: una previsión de 30 días para faltas y pérdidas además de la de «Pago no cubierto». Los avisos que se leen del estado (obras, caravanas, compras, edificios) se fechan con la fecha actual para ordenarlos.»
- **Lo ocurrido manda sobre lo previsto (D-048; contrato §3.12).** `simular` ya devolvía `flujos` (tarea 8); ahora se los pasa a `avisosEn` como tercer argumento, para que una fila con una falta o una pérdida ya ocurridas en el avance no repita también el aviso de lo que se preveía antes de simular.
- **O10 (contrato §6).** Fija los avisos exactos del ejemplo en tres momentos: el 12 de abril (un aviso ámbar, la falta prevista de víveres de Bree, a 11 días); el 19 de abril, tras `simular` a 7 días, sin lo ocurrido (tres avisos: uno rojo con la caravana de Tharbad, uno ámbar por la lana —D-050— y uno ámbar de pago no cubierto); y el 19 de julio, con y sin lo ocurrido de un avance de 98 días (diez avisos en los dos casos, con textos distintos porque uno cuenta lo que pasó y el otro lo que se prevé).

**Archivos:**
- Modificar: `src/dominio/avisos/avisos.ts`, `src/dominio/motor/simular.ts`
- Prueba: `src/dominio/avisos/avisos.test.ts` (se reescribe entera), `src/dominio/motor/simular.test.ts` (dos pruebas), `src/dominio/motor/entregable.test.ts` (dos pruebas)

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

- [ ] **Paso 1: Reescribir las tres pruebas y ver que fallan**

Abre `src/dominio/avisos/avisos.test.ts` y sustitúyelo **entero** por este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe } from '../modelo/documento'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import type { AvisoConFecha } from '../motor/tipos'
import { avisosEn, ordenarAvisos, sinFecha } from './avisos'

/** Los avisos del ejemplo tras recorrer hasta `hasta`. */
function avisosTras(hasta: Fecha): AvisoConFecha[] {
  const recorrido = recorrerDias(estadoDe(documentoDeEjemplo()), hasta, {
    avanceId: 'sim',
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
  return avisosEn(recorrido.estadoNuevo, catalogosDeEjemplo())
}

/** Un aviso de prueba: solo importan su color, su fecha, su tipo y su dominio. */
function aviso(texto: string, datos: Omit<AvisoConFecha, 'texto'>): AvisoConFecha {
  return { ...datos, texto }
}

describe('avisosEn (O10)', () => {
  it('el 12 de abril: solo la falta prevista de víveres de Bree, en ámbar (a 11 días)', () => {
    expect(avisosEn(estadoDe(documentoDeEjemplo()), catalogosDeEjemplo())).toEqual([
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 23 de abril',
        fecha: { anio: 1640, mes: 4, dia: 23 },
      },
    ])
  })

  it('el 19 de julio, sin lo ocurrido: los diez avisos de O10, por color, fecha, tipo y dominio', () => {
    expect(avisosTras({ anio: 1640, mes: 7, dia: 19 })).toEqual([
      {
        tipo: 'impago',
        color: 'rojo',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no pudo pagar a Corona de Arthedain: 18,8 mo pendientes',
        fecha: { anio: 1640, mes: 7, dia: 19 },
      },
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 20 de julio',
        fecha: { anio: 1640, mes: 7, dia: 20 },
      },
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Bree se queda sin madera el 20 de julio',
        fecha: { anio: 1640, mes: 7, dia: 20 },
      },
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.archet,
        texto: 'Los víveres de Archet se agotan el 20 de julio',
        fecha: { anio: 1640, mes: 7, dia: 20 },
      },
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Bree se queda sin cerveza el 26 de julio',
        fecha: { anio: 1640, mes: 7, dia: 26 },
      },
      {
        tipo: 'edificioTerminadoSinProduccion',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'Molino está terminado: anota su producción y sus trabajadores',
        fecha: { anio: 1640, mes: 7, dia: 19 },
      },
      {
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Se perderán 17 carretadas de piedra en Bree el 21 de julio',
        fecha: { anio: 1640, mes: 7, dia: 21 },
      },
      {
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Se perderán 12 fardos de lana en Bree el 21 de julio',
        fecha: { anio: 1640, mes: 7, dia: 21 },
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre los salarios de 3,2 mo del 26 de julio',
        fecha: { anio: 1640, mes: 7, dia: 26 },
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de octubre',
        fecha: { anio: 1640, mes: 10, dia: 19 },
      },
    ])
  })
})

describe('avisosEn con `ocurrido`', () => {
  it('a 98 días, una fila con falta ocurrida y prevista da un solo aviso (lo ocurrido manda)', () => {
    const recorrido = recorrerDias(estadoDe(documentoDeEjemplo()), { anio: 1640, mes: 7, dia: 19 }, {
      avanceId: 'sim',
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    const avisos = avisosEn(recorrido.estadoNuevo, catalogosDeEjemplo(), recorrido.flujos)
    const deViveresDeBree = avisos.filter((a) => a.dominioId === DOM.bree && a.texto.includes('víveres'))
    expect(deViveresDeBree).toHaveLength(1)
    expect(deViveresDeBree[0].texto).toBe('Los víveres de Bree se agotaron el 23 de abril: faltaron 2.217 sacos')
  })
})

describe('ordenarAvisos y sinFecha', () => {
  it('pone los rojos primero y después ordena por fecha, por tipo (orden de §9) y por dominio (T11)', () => {
    const dominios = documentoDeEjemplo().dominios
    const dia = (d: number): Fecha => ({ anio: 1640, mes: 4, dia: d })
    const desordenados = [
      aviso('ámbar del 20', { tipo: 'pagoNoCubierto', color: 'ambar', dominioId: DOM.bree, fecha: dia(20) }),
      aviso('rojo del 25', { tipo: 'saldoNegativo', color: 'rojo', dominioId: DOM.tharan, fecha: dia(25) }),
      aviso('rojo del 19, Archet', { tipo: 'saldoNegativo', color: 'rojo', dominioId: DOM.archet, fecha: dia(19) }),
      aviso('rojo del 19, Bree', { tipo: 'saldoNegativo', color: 'rojo', dominioId: DOM.bree, fecha: dia(19) }),
      aviso('rojo del 19, impago', { tipo: 'impago', color: 'rojo', dominioId: DOM.archet, fecha: dia(19) }),
      aviso('ámbar del 13', { tipo: 'pagoNoCubierto', color: 'ambar', dominioId: DOM.archet, fecha: dia(13) }),
    ]
    expect(ordenarAvisos(desordenados, dominios).map((a) => a.texto)).toEqual([
      'rojo del 19, impago',
      'rojo del 19, Bree',
      'rojo del 19, Archet',
      'rojo del 25',
      'ámbar del 13',
      'ámbar del 20',
    ])
  })

  it('guarda el aviso sin su fecha, y sin dominioId si no lo tiene (formato 1): los tres avisos de O10 a 19 de abril', () => {
    const fecha: Fecha = { anio: 1640, mes: 7, dia: 19 }
    expect(avisosTras({ anio: 1640, mes: 4, dia: 19 }).map(sinFecha)).toEqual([
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 23 de abril y la caravana de Tharbad no vuelve hasta el 25 de abril',
      },
      {
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Se perderán 7 fardos de lana en Bree el 19 de mayo',
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de julio',
      },
    ])
    const sinDominio = sinFecha({ tipo: 'impago', color: 'rojo', texto: 'Aviso de partida', fecha })
    expect(sinDominio).toEqual({ tipo: 'impago', color: 'rojo', texto: 'Aviso de partida' })
    expect(Object.keys(sinDominio)).toEqual(['tipo', 'color', 'texto'])
  })
})
```

Abre `src/dominio/motor/simular.test.ts` y busca este bloque:

```ts
  it('devuelve los avisos del 19 sin fecha y sin personas nuevas', () => {
    const resultado = simular(documentoDeEjemplo(), 7, opciones())
    expect(resultado.avisos).toEqual([
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de julio',
      },
    ])
    expect(resultado.personasNuevas).toEqual([])
  })
```

Sustitúyelo por este otro (los mismos dos `expect` finales, con la lista de avisos completa) y, justo detrás, añade la prueba nueva de los 98 días:

```ts
  it('devuelve los tres avisos de O10 (19 de abril) sin fecha y sin personas nuevas', () => {
    const resultado = simular(documentoDeEjemplo(), 7, opciones())
    expect(resultado.avisos).toEqual([
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 23 de abril y la caravana de Tharbad no vuelve hasta el 25 de abril',
      },
      {
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Se perderán 7 fardos de lana en Bree el 19 de mayo',
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de julio',
      },
    ])
    expect(resultado.personasNuevas).toEqual([])
  })

  it('a los 105 días añade «Trabajadores de Archet» a Personas y entidades (§9 l.1295)', () => {
    const resultado = simular(documentoDeEjemplo(), 105, opciones())
    expect(resultado.personasNuevas).toEqual([{ id: expect.any(String), nombre: 'Trabajadores de Archet' }])
    expect(resultado.estadoNuevo.personas).toContainEqual(resultado.personasNuevas[0])
  })

  it('a 98 días trae la falta de víveres de Bree del 23 de abril, con lo que faltó (T19)', () => {
    const resultado = simular(documentoDeEjemplo(), 98, opciones())
    expect(resultado.avisos).toContainEqual({
      tipo: 'faltaDeRecurso',
      color: 'rojo',
      dominioId: DOM.bree,
      texto: 'Los víveres de Bree se agotaron el 23 de abril: faltaron 2.217 sacos',
    })
    expect(resultado.flujos.length).toBeGreaterThan(0)
  })
```

**Ojo**: el archivo ya tenía, justo después del bloque sustituido, una prueba «a los 105 días añade…» igual a la de arriba. No la dupliques: al copiar el bloque de reemplazo estás sustituyendo la prueba vieja de «devuelve los avisos…» y dejando la de «a los 105 días» **tal cual estaba**, solo que ahora con la prueba nueva de 98 días detrás. Si tu editor ya tenía esa prueba de 105 días debajo, bórrala del bloque de arriba antes de pegar para no duplicarla.

Por último, abre `src/dominio/motor/entregable.test.ts`. Busca este bloque (dentro de `describe('P4: el avance del 12 al 19 de abril de 1640', …)`, justo después de la prueba que compara `resultado.cambios`):

```ts
  it('el 19 solo avisa de que Archet no cubrirá el tributo de julio, y el 12 no había ningún aviso de dinero', () => {
    const resultado = avanzarEjemplo(7)

    expect(resultado.avisos).toEqual([
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de julio',
      },
    ])
    expect(resultado.personasNuevas).toEqual([])
    expect(avisosEn(estadoDe(documentoDeEjemplo()), catalogosDeEjemplo())).toEqual([])
  })
```

Sustitúyelo por:

```ts
  it('el 19 solo avisa de que Archet no cubrirá el tributo de julio, y el 12 no había ningún aviso de dinero', () => {
    const resultado = avanzarEjemplo(7)

    expect(resultado.avisos).toEqual([
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 23 de abril y la caravana de Tharbad no vuelve hasta el 25 de abril',
      },
      {
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Se perderán 7 fardos de lana en Bree el 19 de mayo',
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de julio',
      },
    ])
    expect(resultado.personasNuevas).toEqual([])
    expect(avisosEn(estadoDe(documentoDeEjemplo()), catalogosDeEjemplo())).toEqual([
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 23 de abril',
        fecha: { anio: 1640, mes: 4, dia: 23 },
      },
    ])
  })
```

Más abajo, dentro de `describe('el impago de Archet que anuncia P4', …)`, busca:

```ts
  it('a 98 días avisa del impago en rojo y, en ámbar, de los salarios del 26 de julio y del tributo de octubre', () => {
    const resultado = avanzarEjemplo(98)

    expect(resultado.avisos).toEqual([
      {
        tipo: 'impago',
        color: 'rojo',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no pudo pagar a Corona de Arthedain: 18,8 mo pendientes',
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre los salarios de 3,2 mo del 26 de julio',
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de octubre',
      },
    ])
  })
```

Sustitúyelo por:

```ts
  it('a 98 días, con lo ocurrido: los diez avisos de O10 (faltas y pérdidas ocurridas, el impago, el molino y los pagos no cubiertos)', () => {
    const resultado = avanzarEjemplo(98)

    expect(resultado.avisos).toEqual([
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotaron el 23 de abril: faltaron 2.217 sacos',
      },
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Bree se quedó sin madera el 6 de julio: faltaron 62 haces',
      },
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.archet,
        texto: 'Los víveres de Archet se agotaron el 9 de julio: faltaron 113 sacos',
      },
      {
        tipo: 'impago',
        color: 'rojo',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no pudo pagar a Corona de Arthedain: 18,8 mo pendientes',
      },
      {
        tipo: 'faltaDeRecurso',
        color: 'rojo',
        dominioId: DOM.bree,
        texto: 'Bree se queda sin cerveza el 26 de julio',
      },
      {
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Se perdieron 103 fardos de lana en Bree desde el 19 de mayo',
      },
      {
        tipo: 'recursoPerdido',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Se perdieron 13 carretadas de piedra en Bree el 14 de julio',
      },
      {
        tipo: 'edificioTerminadoSinProduccion',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'Molino está terminado: anota su producción y sus trabajadores',
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre los salarios de 3,2 mo del 26 de julio',
      },
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de octubre',
      },
    ])
  })
```

Ejecuta las tres pruebas:

```bash
npx vitest run src/dominio/avisos/avisos.test.ts src/dominio/motor/simular.test.ts src/dominio/motor/entregable.test.ts
```

Fallo esperado (con la implementación todavía de la tarea 18: `avisosEn` no junta los avisos del almacén, de las obras ni de los edificios, y no recibe `ocurrido`). Salida real (se cortan solo los detalles de las diferencias; el resumen final es completo):

```text
 ❯ src/dominio/avisos/avisos.test.ts (5 tests | 3 failed)
 ❯ src/dominio/motor/simular.test.ts (8 tests | 1 failed)
 ❯ src/dominio/motor/entregable.test.ts (18 tests | 2 failed)

 FAIL  src/dominio/avisos/avisos.test.ts > avisosEn (O10) > el 12 de abril: solo la falta prevista de víveres de Bree, en ámbar (a 11 días)
AssertionError: expected [] to deeply equal [ { tipo: 'faltaPrevista', …(4) } ]

 FAIL  src/dominio/avisos/avisos.test.ts > avisosEn con `ocurrido` > a 98 días, una fila con falta ocurrida y prevista da un solo aviso (lo ocurrido manda)
AssertionError: expected [] to have a length of 1 but got +0

 FAIL  src/dominio/avisos/avisos.test.ts > ordenarAvisos y sinFecha > guarda el aviso sin su fecha, y sin dominioId si no lo tiene (formato 1): los tres avisos de O10 a 19 de abril
AssertionError: expected [ { tipo: 'pagoNoCubierto', …(3) } ] to deeply equal [ …(3) ]

 FAIL  src/dominio/motor/simular.test.ts > simular: P4 del 12 al 19 de abril > devuelve los tres avisos de O10 (19 de abril) sin fecha y sin personas nuevas
AssertionError: expected [ { tipo: 'pagoNoCubierto', …(3) } ] to deeply equal [ …(3) ]

 FAIL  src/dominio/motor/entregable.test.ts > P4: el avance del 12 al 19 de abril de 1640 > el 19 solo avisa de que Archet no cubrirá el tributo de julio, y el 12 no había ningún aviso de dinero
AssertionError: expected [ { tipo: 'pagoNoCubierto', …(3) } ] to deeply equal [ …(3) ]

 FAIL  src/dominio/motor/entregable.test.ts > el impago de Archet que anuncia P4 > a 98 días, con lo ocurrido: los diez avisos de O10 (faltas y pérdidas ocurridas, el impago, el molino y los pagos no cubiertos)
AssertionError: expected [ { tipo: 'impago', …(3) }, …(2) ] to deeply equal [ …(10) ]

 Test Files  3 failed (3)
      Tests  8 failed | 24 passed (32)
```

Si tu salida no coincide letra por letra en los números de milisegundos o en el orden de los `FAIL`, sigue igual: lo que importa es que fallan exactamente estas 8 pruebas por estas razones (listas de avisos más cortas o distintas de lo esperado), y ninguna otra prueba del archivo.

- [ ] **Paso 2: Implementar `avisosEn` con los avisos del almacén, las obras y los edificios**

Abre `src/dominio/avisos/avisos.ts` y sustitúyelo **entero** por:

```ts
import { compararFechas } from '../calendario/fecha'
import { EsquemaTipoAviso, type AvisoAvance } from '../modelo/avance'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { EstadoPartida } from '../modelo/documento'
import type { Dominio } from '../modelo/dominios'
import type { AvisoConFecha, FlujoAlmacen } from '../motor/tipos'
import { avisosDeAlmacen } from './almacen'
import { avisosDeImpago, avisosDeSaldoNegativo } from './dinero'
import { avisosDePagoNoCubierto } from './pagoNoCubierto'
import { avisosDeEdificios, avisosDeObrasYCaravanas } from './pendientes'

/**
 * Todos los avisos vigentes en la fecha actual, ya ordenados (§9, tabla de avisos); con `ocurrido`, también los
 * de lo que pasó en el avance (TC13).
 */
export function avisosEn(estado: EstadoPartida, catalogo: CatalogosEnCopia, ocurrido?: readonly FlujoAlmacen[]): AvisoConFecha[] {
  return ordenarAvisos(
    [
      ...avisosDeSaldoNegativo(estado),
      ...avisosDeImpago(estado),
      ...avisosDePagoNoCubierto(estado, catalogo),
      ...avisosDeAlmacen(estado, catalogo, ocurrido),
      ...avisosDeObrasYCaravanas(estado, catalogo),
      ...avisosDeEdificios(estado),
    ],
    estado.dominios,
  )
}

/** Rojos primero; después por fecha, por tipo en el orden de EsquemaTipoAviso y por dominio (T11). */
export function ordenarAvisos(avisos: readonly AvisoConFecha[], dominios: readonly Dominio[]): AvisoConFecha[] {
  const tipos: readonly string[] = EsquemaTipoAviso.options
  const posiciones = new Map(dominios.map((d, i) => [d.id, i]))
  const posicion = (a: AvisoConFecha): number =>
    a.dominioId === undefined ? dominios.length : (posiciones.get(a.dominioId) ?? dominios.length)
  const color = (a: AvisoConFecha): number => (a.color === 'rojo' ? 0 : 1)
  return [...avisos].sort(
    (a, b) =>
      color(a) - color(b) ||
      compararFechas(a.fecha, b.fecha) ||
      tipos.indexOf(a.tipo) - tipos.indexOf(b.tipo) ||
      posicion(a) - posicion(b),
  )
}

/** El aviso tal como se guarda en el avance: sin la fecha (formato 1). */
export function sinFecha(aviso: AvisoConFecha): AvisoAvance {
  return aviso.dominioId === undefined
    ? { tipo: aviso.tipo, color: aviso.color, texto: aviso.texto }
    : { tipo: aviso.tipo, color: aviso.color, dominioId: aviso.dominioId, texto: aviso.texto }
}
```

Solo han cambiado dos cosas frente a la versión de la fase 3: los tres `import` nuevos (`avisosDeAlmacen`, `avisosDeEdificios` y `avisosDeObrasYCaravanas`) y el cuerpo de `avisosEn`, que ahora recibe `ocurrido` y junta las tres listas nuevas antes de `ordenarAvisos`. `ordenarAvisos` y `sinFecha` no cambian ni una línea.

- [ ] **Paso 3: Hacer que `simular` pase `recorrido.flujos` como lo ocurrido**

Abre `src/dominio/motor/simular.ts` y busca esta línea:

```ts
    avisos: avisosEn(recorrido.estadoNuevo, opciones.catalogo).map(sinFecha),
```

Sustitúyela por:

```ts
    avisos: avisosEn(recorrido.estadoNuevo, opciones.catalogo, recorrido.flujos).map(sinFecha),
```

Es el único cambio del archivo: `simular` ya calculaba y devolvía `recorrido.flujos` desde la tarea 8: ahora también se lo pasa a `avisosEn`.

- [ ] **Paso 4: Ejecutar las tres pruebas y ver que pasan**

```bash
npx vitest run src/dominio/avisos/avisos.test.ts src/dominio/motor/simular.test.ts src/dominio/motor/entregable.test.ts
```

Salida esperada (la duración varía):

```text
 Test Files  3 passed (3)
      Tests  32 passed (32)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **1.115 pruebas en 92 archivos** (1.113 al cerrar la tarea 18, más las 2 nuevas de esta tarea: «a 98 días, una fila con falta ocurrida y prevista da un solo aviso» en `avisos.test.ts` y «a 98 días trae la falta de víveres de Bree del 23 de abril, con lo que faltó» en `simular.test.ts`; el número de archivos no cambia, porque esta tarea no crea ningún módulo nuevo):

```text
 Test Files  92 passed (92)
      Tests  1115 passed (1115)
```

Si el número que ves no es 1115, sigue con **el tuyo**: lo que esta tarea garantiza es **+2 pruebas** sobre lo que dejó la tarea 18, con los mismos 92 archivos.

- [ ] **Paso 6: Comprobar el estilo y la compilación de producción**

```bash
npm run lint
npm run build
```

Salida esperada: `npm run lint` no escribe nada y `npm run build` termina con `✓ built in …ms` (el tiempo varía), sin errores de TypeScript ni de Vite.

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/avisos/avisos.ts src/dominio/avisos/avisos.test.ts src/dominio/motor/simular.ts src/dominio/motor/simular.test.ts src/dominio/motor/entregable.test.ts
git commit -m "$(cat <<'EOF'
feat(avisos): avisosEn junta también los del almacén, las obras, las caravanas y los edificios, y simular pasa lo ocurrido

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true` verás el aviso habitual de `LF will be replaced by CRLF` por cada archivo; es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-4 xxxxxxx] feat(avisos): avisosEn junta también los del almacén, las obras, las caravanas y los edificios, y simular pasa lo ocurrido
 5 files changed, 193 insertions(+), 13 deletions(-)
```

---

---

### Tarea 20 · Validación: la historia puede nombrar lo borrado (5)

**Reglas de la especificación que implementa:**

- **D-055 (`decisiones-fase-4.md`).** «Borrar un edificio o quitarle una producción, borrar un mercado, una fila del almacén o una obra terminada no borra lo que ya pasó: la producción ya ocurrida sigue en el calendario y se quedan las caravanas y compras terminadas, los ajustes y las obras terminadas. Donde nombraban lo borrado dirán «eliminado».» (La palabra «eliminado» la escribe la fase 6, sobre las vistas; a esta tarea solo le toca que la validación de la copia deje de rechazar esas referencias.)
- **TC15 (`decisiones-fase-4.md`).** «Validación de copias (U12, D-055): pueden apuntar a registros borrados las producciones realizadas, las obras terminadas (su objetivo), las caravanas terminadas (mercado y fila), las entradas aplicadas (mercado y fila), los ajustes (fila) y el aviso pendiente de un edificio (su obra; si existe, sigue exigiéndose terminada). Sin esquemas Zod nuevos y sin subir `VERSION_FORMATO`.»
- **Contrato §3.13.** Fija, punto por punto, qué deja de exigirse y qué se sigue exigiendo:
  - `produccionesRealizadas`: ya no se exige que exista el edificio ni la producción (solo el recurso).
  - `obras` **terminadas**: el `objetivoId` de `mejorarEdificio`, `repararEdificio` y `repararDefensa` puede no existir. En las demás (planificada, programada, en curso), se sigue exigiendo.
  - `caravanas` **terminadas**: `mercadoId` y la fila de origen pueden no existir. En las demás, se sigue exigiendo.
  - `entradasAlmacen` **aplicadas**: `mercadoId` y la fila pueden no existir. En las que no están aplicadas, se sigue exigiendo.
  - `ajustesExistencias`: la fila puede no existir (sin condición: un ajuste no tiene estado).
  - `edificios[].avisoPendiente.obraId`: puede no existir; si existe, tiene que estar terminada (igual que antes, solo que ahora «no existe» deja de ser un error).

**Archivos:**
- Modificar: `src/dominio/validacion/referencias.ts`
- Prueba: `src/dominio/validacion/referencias.test.ts`

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

- [ ] **Paso 1: Escribir las pruebas que fallan**

Abre `src/dominio/validacion/referencias.test.ts`. Busca esta prueba, la última de `describe('validarReferencias', …)` (justo antes del `})` que cierra ese `describe`):

```ts
  it('una producción realizada apunta a una producción que su edificio tiene', () => {
    const documento = documentoMinimo()
    documento.edificios = [
      {
        id: 'ed.granjas',
        dominioId: 'dom.bree',
        tipoId: 'edificio.granja',
        nombre: 'Granjas del oeste',
        estado: 'activo',
        trabajadoresNecesarios: 6,
        producciones: [
          {
            id: 'prod.trigo',
            recursoId: 'recurso.viveres',
            cantidad: 12,
            recurrencia: { tipo: 'mensual', diaMes: 1 },
            acumulado: { desde: { anio: 1640, mes: 4, dia: 1 }, sumaFactores: 0 },
          },
        ],
      },
    ]
    documento.produccionesRealizadas = [
      {
        id: 'pr.1',
        fecha: { anio: 1640, mes: 4, dia: 1 },
        edificioId: 'ed.granjas',
        produccionId: 'prod.cebada',
        recursoId: 'recurso.viveres',
        cantidad: 12,
        perdida: 0,
        avanceId: 'av.1',
      },
    ]
    const catalogos = catalogosMinimos()
    catalogos.opciones.push({
      id: 'edificio.granja',
      nombre: 'Granja',
      propia: false,
      lista: 'tiposEdificio',
      grupo: 'alimentos',
    })
    expect(validarReferencias(documento, catalogos)).toEqual([
      {
        ruta: 'produccionesRealizadas[0].produccionId',
        mensaje: 'El edificio «ed.granjas» no tiene la producción «prod.cebada»',
      },
    ])
  })
})
```

Esta prueba es de la fase 3: comprobaba que `produccionesRealizadas` exigiera el edificio y la producción, justo lo que esta tarea relaja (D-055). Sustitúyela por esta otra, que la reemplaza:

```ts
  it('una producción realizada solo exige que exista el recurso (D-055, T20): el edificio y la producción pueden estar borrados', () => {
    const documento = documentoMinimo()
    documento.produccionesRealizadas = [
      {
        id: 'pr.1',
        fecha: { anio: 1640, mes: 4, dia: 1 },
        edificioId: 'ed.borrado',
        produccionId: 'prod.borrada',
        recursoId: 'recurso.viveres',
        cantidad: 12,
        perdida: 0,
        avanceId: 'av.1',
      },
      {
        id: 'pr.2',
        fecha: { anio: 1640, mes: 4, dia: 1 },
        edificioId: 'ed.borrado',
        produccionId: 'prod.borrada',
        recursoId: 'recurso.borrado',
        cantidad: 12,
        perdida: 0,
        avanceId: 'av.1',
      },
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      { ruta: 'produccionesRealizadas[1].recursoId', mensaje: 'No existe el recurso «recurso.borrado»' },
    ])
  })
})
```

Fíjate en la llave `})` final: sigue cerrando el mismo `describe('validarReferencias', …)`, así que no la toques, solo el cuerpo del `it`.

Ahora ve al final del archivo, dentro de `describe('las deudas de impago de la fase 3 (técnica 5)', …)`, y busca su último `it` (el que empieza por `'sigue exigiendo el dominio y la contraparte de una deuda de impago'`). Justo **después** de su `})` de cierre y **antes** del `})` que cierra ese `describe`, añade el `describe` entero de abajo (así queda como un bloque nuevo, hermano del de las deudas, al final del archivo):

```ts

describe('la historia puede nombrar lo borrado (D-055, TC15, T20)', () => {
  it('una obra terminada puede nombrar en su efecto un edificio o una defensa borrados; una pendiente sigue exigiéndolos', () => {
    const documento = documentoMinimo()
    documento.obras = [
      {
        id: 'obra.mejora',
        dominioId: 'dom.bree',
        nombre: 'Mejora del molino',
        estado: 'terminada',
        coste: { base: 1000000 },
        materiales: {},
        inicio: { anio: 1640, mes: 3, dia: 1 },
        diasTotales: 10,
        efecto: { tipo: 'mejorarEdificio', objetivoId: 'ed.borrado' },
      },
      {
        id: 'obra.reparo',
        dominioId: 'dom.bree',
        nombre: 'Reparación de la torre',
        estado: 'terminada',
        coste: { base: 500000 },
        materiales: {},
        inicio: { anio: 1640, mes: 3, dia: 1 },
        diasTotales: 5,
        efecto: { tipo: 'repararDefensa', objetivoId: 'def.borrada' },
      },
      {
        id: 'obra.pendiente',
        dominioId: 'dom.bree',
        nombre: 'Otra mejora',
        estado: 'programada',
        coste: { base: 1000000 },
        materiales: {},
        inicio: { anio: 1640, mes: 4, dia: 20 },
        diasTotales: 10,
        efecto: { tipo: 'mejorarEdificio', objetivoId: 'ed.borrado' },
      },
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      {
        ruta: 'obras[2].efecto.objetivoId',
        mensaje: 'No existe el edificio «ed.borrado» en este asentamiento',
      },
    ])
  })

  it('una caravana terminada puede nombrar un mercado y una fila de origen borrados; una en ruta sigue exigiéndolos', () => {
    const documento = documentoMinimo()
    documento.caravanas = [
      {
        id: 'car.terminada',
        dominioId: 'dom.bree',
        operacion: 'compra',
        mercadoId: 'mer.borrado',
        carga: { recursoId: 'recurso.borrado', cantidad: 10 },
        precioUnidad: { base: 30000 },
        importe: { base: 300000 },
        salida: { anio: 1640, mes: 3, dia: 1 },
        vuelta: { anio: 1640, mes: 3, dia: 20 },
        estado: 'terminada',
      },
      {
        id: 'car.enRuta',
        dominioId: 'dom.bree',
        operacion: 'compra',
        mercadoId: 'mer.borrado',
        carga: { recursoId: 'recurso.viveres', cantidad: 10 },
        precioUnidad: { base: 30000 },
        importe: { base: 300000 },
        salida: { anio: 1640, mes: 4, dia: 10 },
        vuelta: { anio: 1640, mes: 4, dia: 20 },
        estado: 'enRuta',
      },
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      { ruta: 'caravanas[0].carga.recursoId', mensaje: 'No existe el recurso «recurso.borrado»' },
      { ruta: 'caravanas[1].mercadoId', mensaje: 'No existe el mercado «mer.borrado»' },
    ])
  })

  it('una entrada aplicada puede nombrar un mercado y una fila borrados; una sin aplicar sigue exigiéndolos', () => {
    const documento = documentoMinimo()
    documento.entradasAlmacen = [
      {
        id: 'ent.aplicada',
        dominioId: 'dom.bree',
        recursoId: 'recurso.viveres',
        cantidad: 20,
        operacion: 'compra',
        mercadoId: 'mer.borrado',
        precioUnidad: { base: 40000 },
        fecha: { anio: 1640, mes: 4, dia: 1 },
        aplicada: true,
      },
      {
        id: 'ent.sinAplicar',
        dominioId: 'dom.bree',
        recursoId: 'recurso.viveres',
        cantidad: 20,
        operacion: 'compra',
        mercadoId: 'mer.borrado',
        precioUnidad: { base: 40000 },
        fecha: { anio: 1640, mes: 4, dia: 20 },
        aplicada: false,
      },
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      { ruta: 'entradasAlmacen[1].mercadoId', mensaje: 'No existe el mercado «mer.borrado»' },
    ])
  })

  it('un ajuste de existencias puede nombrar una fila que ya no está', () => {
    const documento = documentoMinimo()
    documento.ajustesExistencias = [
      {
        id: 'aj.1',
        dominioId: 'dom.bree',
        recursoId: 'recurso.borrado',
        fecha: { anio: 1640, mes: 4, dia: 2 },
        delta: -5,
        motivo: 'Haces podridos',
      },
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      { ruta: 'ajustesExistencias[0].recursoId', mensaje: 'No existe el recurso «recurso.borrado»' },
    ])
  })

  it('el aviso pendiente de un edificio puede nombrar una obra borrada; si la obra existe, tiene que estar terminada', () => {
    const documento = documentoMinimo()
    documento.edificios = [
      {
        id: 'ed.a',
        dominioId: 'dom.bree',
        tipoId: 'edificio.x',
        nombre: 'A',
        estado: 'activo',
        trabajadoresNecesarios: 0,
        producciones: [],
        avisoPendiente: { tipo: 'terminadoSinProduccion', obraId: 'obra.borrada' },
      },
      {
        id: 'ed.b',
        dominioId: 'dom.bree',
        tipoId: 'edificio.x',
        nombre: 'B',
        estado: 'activo',
        trabajadoresNecesarios: 0,
        producciones: [],
        avisoPendiente: { tipo: 'mejoraTerminada', obraId: 'obra.sinTerminar' },
      },
    ]
    documento.obras = [
      {
        id: 'obra.sinTerminar',
        dominioId: 'dom.bree',
        nombre: 'Mejora de B',
        estado: 'enCurso',
        coste: { base: 0 },
        materiales: {},
        inicio: { anio: 1640, mes: 4, dia: 1 },
        diasTotales: 30,
        efecto: { tipo: 'mejorarEdificio', objetivoId: 'ed.b' },
      },
    ]
    const catalogos = catalogosMinimos()
    catalogos.opciones.push({ id: 'edificio.x', nombre: 'X', propia: false, lista: 'tiposEdificio', grupo: 'alimentos' })
    expect(validarReferencias(documento, catalogos)).toEqual([
      {
        ruta: 'edificios[1].avisoPendiente.obraId',
        mensaje: 'No existe la obra «obra.sinTerminar»',
      },
    ])
  })
})
```

Ejecuta:

```bash
npx vitest run src/dominio/validacion/referencias.test.ts
```

Fallo esperado (con la validación todavía de la fase 3, que exige edificio y producción en `produccionesRealizadas`, mercado y fila siempre en obras/caravanas/entradas, y la obra siempre existente en `avisoPendiente`):

```text
 ❯ src/dominio/validacion/referencias.test.ts (17 tests | 6 failed)

 FAIL  src/dominio/validacion/referencias.test.ts > validarReferencias > una producción realizada solo exige que exista el recurso (D-055, T20): el edificio y la producción pueden estar borrados
AssertionError: expected [ { …(2) }, { …(2) }, { …(2) } ] to deeply equal [ { …(2) } ]

  [
    {
+     "mensaje": "No existe el edificio «ed.borrado»",
+     "ruta": "produccionesRealizadas[0].edificioId",
+   },
+   {
+     "mensaje": "No existe el edificio «ed.borrado»",
+     "ruta": "produccionesRealizadas[1].edificioId",
+   },
+   {
      "mensaje": "No existe el recurso «recurso.borrado»",
      "ruta": "produccionesRealizadas[1].recursoId",
    },
  ]

 FAIL  src/dominio/validacion/referencias.test.ts > la historia puede nombrar lo borrado (D-055, TC15, T20) > una obra terminada puede nombrar en su efecto un edificio o una defensa borrados; una pendiente sigue exigiéndolos
AssertionError: expected [ { …(2) }, { …(2) }, { …(2) } ] to deeply equal [ { …(2) } ]

 FAIL  src/dominio/validacion/referencias.test.ts > la historia puede nombrar lo borrado (D-055, TC15, T20) > una caravana terminada puede nombrar un mercado y una fila de origen borrados; una en ruta sigue exigiéndolos
AssertionError: expected [ { …(2) }, { …(2) }, { …(2) }, …(1) ] to deeply equal [ { …(2) }, { …(2) } ]

 FAIL  src/dominio/validacion/referencias.test.ts > la historia puede nombrar lo borrado (D-055, TC15, T20) > una entrada aplicada puede nombrar un mercado y una fila borrados; una sin aplicar sigue exigiéndolos
AssertionError: expected [ { …(2) }, { …(2) } ] to deeply equal [ { …(2) } ]

 FAIL  src/dominio/validacion/referencias.test.ts > la historia puede nombrar lo borrado (D-055, TC15, T20) > un ajuste de existencias puede nombrar una fila que ya no está
AssertionError: expected [ { …(2) }, { …(2) } ] to deeply equal [ { …(2) } ]

 FAIL  src/dominio/validacion/referencias.test.ts > la historia puede nombrar lo borrado (D-055, TC15, T20) > el aviso pendiente de un edificio puede nombrar una obra borrada; si la obra existe, tiene que estar terminada
AssertionError: expected [ { …(2) }, { …(2) } ] to deeply equal [ { …(2) } ]

 Test Files  1 failed (1)
      Tests  6 failed | 11 passed (17)
```

- [ ] **Paso 2: Relajar `produccionesRealizadas`**

Abre `src/dominio/validacion/referencias.ts`. Busca:

```ts
  documento.produccionesRealizadas.forEach((p, i) => {
    const r = `produccionesRealizadas[${i}]`
    const edificio = edificios.get(p.edificioId)
    exige(edificio !== undefined, `${r}.edificioId`, `No existe el edificio «${p.edificioId}»`)
    if (edificio !== undefined) {
      exige(
        edificio.producciones.some((q) => q.id === p.produccionId),
        `${r}.produccionId`,
        `El edificio «${p.edificioId}» no tiene la producción «${p.produccionId}»`,
      )
    }
    exige(recursos.has(p.recursoId), `${r}.recursoId`, `No existe el recurso «${p.recursoId}»`)
  })
```

Sustitúyelo por:

```ts
  documento.produccionesRealizadas.forEach((p, i) => {
    // D-055, TC15 (T20): la producción ya ocurrida se queda en el calendario aunque se borre su edificio o su
    // producción; solo el recurso, que nunca se borra, se sigue exigiendo.
    exige(recursos.has(p.recursoId), `produccionesRealizadas[${i}].recursoId`, `No existe el recurso «${p.recursoId}»`)
  })
```

- [ ] **Paso 3: Relajar `ajustesExistencias` y `entradasAlmacen`**

En el mismo archivo, busca:

```ts
  documento.ajustesExistencias.forEach((a, i) => {
    const r = `ajustesExistencias[${i}]`
    exige(asentamientos.has(a.dominioId), `${r}.dominioId`, `No existe el asentamiento «${a.dominioId}»`)
    exige(recursos.has(a.recursoId), `${r}.recursoId`, `No existe el recurso «${a.recursoId}»`)
    exige(
      existencias.has(claveExistencia(a.dominioId, a.recursoId)),
      r,
      `El almacén de «${a.dominioId}» no tiene fila de «${a.recursoId}»`,
    )
  })
  documento.entradasAlmacen.forEach((e, i) => {
    const r = `entradasAlmacen[${i}]`
    exige(asentamientos.has(e.dominioId), `${r}.dominioId`, `No existe el asentamiento «${e.dominioId}»`)
    exige(recursos.has(e.recursoId), `${r}.recursoId`, `No existe el recurso «${e.recursoId}»`)
    exige(
      existencias.has(claveExistencia(e.dominioId, e.recursoId)),
      r,
      `El almacén de «${e.dominioId}» no tiene fila de «${e.recursoId}»`,
    )
    if (e.mercadoId !== undefined) {
      exige(mercados.has(e.mercadoId), `${r}.mercadoId`, `No existe el mercado «${e.mercadoId}»`)
    }
    if (e.movimientoId !== undefined) {
      exige(
        movimientoVinculado(e.movimientoId, 'entradaAlmacen', e.id),
        `${r}.movimientoId`,
        `No existe el movimiento «${e.movimientoId}» de la entrada`,
      )
    }
    if (e.caravanaId !== undefined) {
      exige(caravanas.has(e.caravanaId), `${r}.caravanaId`, `No existe la caravana «${e.caravanaId}»`)
    }
  })
```

Sustitúyelo por:

```ts
  documento.ajustesExistencias.forEach((a, i) => {
    // D-055 (T20): un ajuste puede quedar apuntando a una fila que ya no está en el almacén.
    const r = `ajustesExistencias[${i}]`
    exige(asentamientos.has(a.dominioId), `${r}.dominioId`, `No existe el asentamiento «${a.dominioId}»`)
    exige(recursos.has(a.recursoId), `${r}.recursoId`, `No existe el recurso «${a.recursoId}»`)
  })
  documento.entradasAlmacen.forEach((e, i) => {
    const r = `entradasAlmacen[${i}]`
    exige(asentamientos.has(e.dominioId), `${r}.dominioId`, `No existe el asentamiento «${e.dominioId}»`)
    exige(recursos.has(e.recursoId), `${r}.recursoId`, `No existe el recurso «${e.recursoId}»`)
    // D-055 (T20): una entrada ya aplicada puede nombrar un mercado y una fila que ya no existen.
    if (!e.aplicada) {
      exige(
        existencias.has(claveExistencia(e.dominioId, e.recursoId)),
        r,
        `El almacén de «${e.dominioId}» no tiene fila de «${e.recursoId}»`,
      )
      if (e.mercadoId !== undefined) {
        exige(mercados.has(e.mercadoId), `${r}.mercadoId`, `No existe el mercado «${e.mercadoId}»`)
      }
    }
    if (e.movimientoId !== undefined) {
      exige(
        movimientoVinculado(e.movimientoId, 'entradaAlmacen', e.id),
        `${r}.movimientoId`,
        `No existe el movimiento «${e.movimientoId}» de la entrada`,
      )
    }
    if (e.caravanaId !== undefined) {
      exige(caravanas.has(e.caravanaId), `${r}.caravanaId`, `No existe la caravana «${e.caravanaId}»`)
    }
  })
```

- [ ] **Paso 4: Relajar el `avisoPendiente` de un edificio**

Busca:

```ts
    if (e.avisoPendiente !== undefined) {
      const obra = obras.get(e.avisoPendiente.obraId)
      exige(
        obra !== undefined && obra.estado === 'terminada',
        `${r}.avisoPendiente.obraId`,
        `No existe la obra «${e.avisoPendiente.obraId}»`,
      )
    }
  })
```

Sustitúyelo por:

```ts
    if (e.avisoPendiente !== undefined) {
      // D-055 (T20): el aviso puede nombrar una obra que ya se borró; si sigue ahí, tiene que estar terminada.
      const obra = obras.get(e.avisoPendiente.obraId)
      exige(
        obra === undefined || obra.estado === 'terminada',
        `${r}.avisoPendiente.obraId`,
        `No existe la obra «${e.avisoPendiente.obraId}»`,
      )
    }
  })
```

- [ ] **Paso 5: Relajar el efecto de una obra terminada**

Busca:

```ts
      case 'mejorarEdificio':
      case 'repararEdificio': {
        const e = edificios.get(efecto.objetivoId)
        exige(
          e !== undefined && e.dominioId === o.dominioId,
          `${r}.efecto.objetivoId`,
          `No existe el edificio «${efecto.objetivoId}» en este asentamiento`,
        )
        break
      }
      case 'repararDefensa': {
        const d = defensas.get(efecto.objetivoId)
        exige(
          d !== undefined && d.dominioId === o.dominioId,
          `${r}.efecto.objetivoId`,
          `No existe la defensa «${efecto.objetivoId}» en este asentamiento`,
        )
        break
      }
```

Sustitúyelo por:

```ts
      case 'mejorarEdificio':
      case 'repararEdificio': {
        // D-055 (T20): una obra terminada puede nombrar un edificio ya borrado; las demás lo siguen exigiendo.
        if (o.estado === 'terminada') {
          break
        }
        const e = edificios.get(efecto.objetivoId)
        exige(
          e !== undefined && e.dominioId === o.dominioId,
          `${r}.efecto.objetivoId`,
          `No existe el edificio «${efecto.objetivoId}» en este asentamiento`,
        )
        break
      }
      case 'repararDefensa': {
        // D-055 (T20): igual que con un edificio, una obra terminada puede nombrar una defensa ya borrada.
        if (o.estado === 'terminada') {
          break
        }
        const d = defensas.get(efecto.objetivoId)
        exige(
          d !== undefined && d.dominioId === o.dominioId,
          `${r}.efecto.objetivoId`,
          `No existe la defensa «${efecto.objetivoId}» en este asentamiento`,
        )
        break
      }
```

- [ ] **Paso 6: Relajar el mercado y la fila de origen de una caravana terminada**

Busca:

```ts
  documento.caravanas.forEach((c, i) => {
    const r = `caravanas[${i}]`
    exige(asentamientos.has(c.dominioId), `${r}.dominioId`, `No existe el asentamiento «${c.dominioId}»`)
    if (c.destinoId !== undefined) {
      exige(asentamientos.has(c.destinoId), `${r}.destinoId`, `No existe el asentamiento «${c.destinoId}»`)
    }
    if (c.mercadoId !== undefined) {
      exige(mercados.has(c.mercadoId), `${r}.mercadoId`, `No existe el mercado «${c.mercadoId}»`)
    }
    exige(recursos.has(c.carga.recursoId), `${r}.carga.recursoId`, `No existe el recurso «${c.carga.recursoId}»`)
    exige(
      existencias.has(claveExistencia(c.dominioId, c.carga.recursoId)),
      `${r}.carga`,
      `El almacén de «${c.dominioId}» no tiene fila de «${c.carga.recursoId}»`,
    )
    if (c.movimientoSalidaId !== undefined) {
```

Sustitúyelo por:

```ts
  documento.caravanas.forEach((c, i) => {
    const r = `caravanas[${i}]`
    exige(asentamientos.has(c.dominioId), `${r}.dominioId`, `No existe el asentamiento «${c.dominioId}»`)
    if (c.destinoId !== undefined) {
      exige(asentamientos.has(c.destinoId), `${r}.destinoId`, `No existe el asentamiento «${c.destinoId}»`)
    }
    exige(recursos.has(c.carga.recursoId), `${r}.carga.recursoId`, `No existe el recurso «${c.carga.recursoId}»`)
    // D-055 (T20): una caravana terminada puede nombrar un mercado y una fila de origen que ya no existen.
    if (c.estado !== 'terminada') {
      if (c.mercadoId !== undefined) {
        exige(mercados.has(c.mercadoId), `${r}.mercadoId`, `No existe el mercado «${c.mercadoId}»`)
      }
      exige(
        existencias.has(claveExistencia(c.dominioId, c.carga.recursoId)),
        `${r}.carga`,
        `El almacén de «${c.dominioId}» no tiene fila de «${c.carga.recursoId}»`,
      )
    }
    if (c.movimientoSalidaId !== undefined) {
```

(El resto de la función, desde `if (c.movimientoSalidaId !== undefined) {` hasta el final del `forEach`, no cambia: no lo toques.)

- [ ] **Paso 7: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/validacion/referencias.test.ts
```

Salida esperada (la duración varía):

```text
 Test Files  1 passed (1)
      Tests  17 passed (17)
```

- [ ] **Paso 8: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **1.120 pruebas en 92 archivos** (1.115 al cerrar la tarea 19, más las 5 nuevas de esta tarea: 4 en el `describe` nuevo «la historia puede nombrar lo borrado» —la quinta prueba de ese bloque sustituye, sin sumar, a la de «una producción realizada apunta a una producción que su edificio tiene» de la fase 3— y 1 más porque la prueba sustituida en `describe('validarReferencias', …)` pasa de comprobar un caso a comprobar dos filas de `produccionesRealizadas` con un `it` que ya estaba contado; el número de archivos no cambia):

```text
 Test Files  92 passed (92)
      Tests  1120 passed (1120)
```

Si el número que ves no es 1120, sigue con **el tuyo**: lo que esta tarea garantiza es que, sobre lo que dejó la tarea 19, el archivo `referencias.test.ts` pasa de 12 a 17 pruebas propias (10 pruebas de `validarReferencias` que no tocas, más 1 prueba reescrita, más 1 prueba nueva de las deudas de la fase 3 que tampoco tocas, más los 5 `it` del `describe` nuevo), sin ningún archivo nuevo.

- [ ] **Paso 9: Comprobar el estilo y la compilación de producción**

```bash
npm run lint
npm run build
```

Salida esperada: `npm run lint` no escribe nada y `npm run build` termina con `✓ built in …ms` (el tiempo varía), sin errores.

- [ ] **Paso 10: Commit**

```bash
git add src/dominio/validacion/referencias.ts src/dominio/validacion/referencias.test.ts
git commit -m "$(cat <<'EOF'
fix(validacion): la historia puede nombrar registros ya borrados (D-055)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
[implementacion/fase-4 xxxxxxx] fix(validacion): la historia puede nombrar registros ya borrados (D-055)
 2 files changed, 225 insertions(+), 66 deletions(-)
```

---

---

### Tarea 21 · Existencias: fila, ajustes y borrado (26)

**Reglas de la especificación que implementa:**

- **Formulario «Recurso y ajuste de existencias» (§6.4 l.685).** Deja cambiar la cantidad (con motivo obligatorio, que se guarda como un `AjusteExistencias` con la diferencia) y la capacidad (o quitarla). Contrato §3.14: «`editarExistencia`: cantidad < 0 → «Las existencias no pueden quedar por debajo de 0»; cantidad cambiada sin motivo → «El ajuste necesita un motivo»; si la cantidad nueva pasa de la capacidad (la nueva, o la de antes si no cambia): si cambió la cantidad → `textoCaben(cabenMas(fila de antes))`; si solo bajó la capacidad → «Las existencias no pueden superar la capacidad».»
- **D-056 (`decisiones-fase-4.md`).** «Al guardar algo que nombra un recurso que el almacén de ese asentamiento no tiene…, su fila se crea con 0 y sin capacidad.» Es lo que hace `asegurarFila`, y lo que usan `editarExistencia` y (en la tarea 22) `crearEntradaAlmacen`.
- **D-058 y D-059 (`decisiones-fase-4.md`).** «Borrados que la tabla «Al eliminar» no trae: … un ajuste deshace su cantidad… Devolver los materiales o la carga…, y borrar un ajuste o una compra o recepción, se bloquean si las existencias pasarían de la capacidad («Caben 12 sacos más») o bajarían de 0.» Es lo que hace `eliminarAjuste`.
- **Tabla «Al eliminar» (§6.4 l.791) y D-059.** «El primer motivo, en este orden: víveres, existencias, producción, consumo, obra sin terminar, caravana sin terminar, entrada sin aplicar; o null.» Los siete textos literales están en §5 del contrato y en D-067: «Los víveres no se pueden quitar del almacén», «Solo se quita una fila sin existencias: quedan 64 lingotes», «Cantera produce arcilla» / «Molino produce harina (estado: Alquilado)», «El consumo «Leña» descuenta de esta fila», «La obra «Nuevo granero» necesita esta fila», «La caravana de compra a Fornost necesita esta fila», «La compra o recepción del 20 de abril necesita esta fila».
- **TC17 (`decisiones-fase-4.md`).** Todas las funciones son puras, `<E extends EstadoPartida>`, devuelven la misma referencia si nada cambia, no cuentan el cambio (eso lo hace `guardarEdicion`, fuera de esta fase), ponen `editadoEl = sello.ahora` solo en el registro que se edita, y las que escriben unidades o nombres de recurso reciben `catalogo: CatalogosEnCopia`.
- **O13 (contrato §6), con «La Sombra del Este» el 12 de abril de 1640.** Fija las cifras exactas: víveres de Bree a 300 con motivo «Ratas en el granero» → ajuste con `delta: −10`; a 1.300 → «Caben 890 sacos más»; `eliminarAjuste` del ajuste de la madera podrida → madera 425; los siete bloqueos de `bloqueoAlEliminarFila`, con víveres, hierro (64 lingotes) y arcilla (que produce la cantera) como ejemplos.

**Archivos:**
- Crear: `src/dominio/edicion/existencias.ts`
- Prueba: `src/dominio/edicion/existencias.test.ts`

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

- [ ] **Paso 1: Escribir la prueba que falla**

La carpeta `src/dominio/edicion/` ya existe (trae los módulos de dinero de la fase 3); el archivo `existencias.ts` es nuevo. Crea `src/dominio/edicion/existencias.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { RECURSO } from '../catalogo/inicial'
import { AJUSTE_EXISTENCIAS, DOM, EDIFICIO } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { validarCopia } from '../validacion/coherencia'
import {
  asegurarFila,
  bloqueoAlEliminarFila,
  editarExistencia,
  eliminarAjuste,
  eliminarFila,
} from './existencias'
import type { Sello } from './registros'

function catalogo() {
  return catalogosDeEjemplo()
}

function ejemplo(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

/** Un sello de prueba: ids en serie y una hora fija. */
function sello(): Sello {
  let ultimo = 0
  return { ahora: '2026-09-18T12:00:00.000Z', nuevoId: () => `sim.${(ultimo += 1)}` }
}

function filaDe(estado: EstadoPartida, dominioId: string, recursoId: string) {
  return estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
}

describe('asegurarFila', () => {
  it('crea la fila con 0 y sin capacidad si no está (D-056)', () => {
    const estado = asegurarFila(ejemplo(), DOM.bree, 'recurso.sal')
    const fila = filaDe(estado, DOM.bree, 'recurso.sal')
    expect(fila).toEqual({ dominioId: DOM.bree, recursoId: 'recurso.sal', cantidad: 0 })
  })

  it('la misma referencia si la fila ya estaba', () => {
    const entrada = ejemplo()
    const salida = asegurarFila(entrada, DOM.bree, RECURSO.viveres)
    expect(salida).toBe(entrada)
  })
})

describe('editarExistencia (O13)', () => {
  it('víveres de Bree a 300 con motivo: ajuste con delta −10', () => {
    const estado = editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { cantidad: 300, motivo: 'Ratas en el granero' }, sello(), catalogo())
    expect(filaDe(estado, DOM.bree, RECURSO.viveres)?.cantidad).toBe(300)
    const ajuste = estado.ajustesExistencias.find((a) => a.motivo === 'Ratas en el granero')
    expect(ajuste).toMatchObject({ dominioId: DOM.bree, recursoId: RECURSO.viveres, delta: -10 })
  })

  it('cantidad cambiada sin motivo lanza «El ajuste necesita un motivo»', () => {
    expect(() => editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { cantidad: 300 }, sello(), catalogo())).toThrow(
      'El ajuste necesita un motivo',
    )
  })

  it('por debajo de 0 lanza «Las existencias no pueden quedar por debajo de 0»', () => {
    expect(() =>
      editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { cantidad: -1, motivo: 'x' }, sello(), catalogo()),
    ).toThrow('Las existencias no pueden quedar por debajo de 0')
  })

  it('a 1.300 (capacidad 1.200): «Caben 890 sacos más»', () => {
    expect(() =>
      editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { cantidad: 1300, motivo: 'Cosecha' }, sello(), catalogo()),
    ).toThrow('Caben 890 sacos más')
  })

  it('bajar solo la capacidad por debajo de las existencias: «Las existencias no pueden superar la capacidad»', () => {
    expect(() =>
      editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { capacidad: 100 }, sello(), catalogo()),
    ).toThrow('Las existencias no pueden superar la capacidad')
  })

  it('sin cambios, la misma referencia', () => {
    const entrada = ejemplo()
    const salida = editarExistencia(entrada, DOM.bree, RECURSO.viveres, {}, sello(), catalogo())
    expect(salida).toBe(entrada)
    const salida2 = editarExistencia(entrada, DOM.bree, RECURSO.viveres, { cantidad: 310, capacidad: 1200 }, sello(), catalogo())
    expect(salida2).toBe(entrada)
  })

  it('capacidad a null quita el límite', () => {
    const estado = editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { capacidad: null }, sello(), catalogo())
    expect(filaDe(estado, DOM.bree, RECURSO.viveres)?.capacidad).toBeUndefined()
    expect(estado.ajustesExistencias).toHaveLength(1) // el de la madera podrida, sin uno nuevo (no cambió la cantidad)
  })

  it('asegura la fila si el recurso no la tenía (D-056)', () => {
    const estado = editarExistencia(ejemplo(), DOM.bree, 'recurso.sal', { cantidad: 20, motivo: 'Compra' }, sello(), catalogo())
    expect(filaDe(estado, DOM.bree, 'recurso.sal')?.cantidad).toBe(20)
  })

  it('el resultado pasa validarCopia', () => {
    const estado = editarExistencia(ejemplo(), DOM.bree, RECURSO.viveres, { cantidad: 300, motivo: 'Ratas' }, sello(), catalogo())
    expect(validarCopia({ ...estado, avances: documentoDeEjemplo().avances }, catalogo())).toEqual([])
  })
})

describe('eliminarAjuste (O13)', () => {
  it('deshace la cantidad: madera vuelve a 425', () => {
    const estado = eliminarAjuste(ejemplo(), AJUSTE_EXISTENCIAS.maderaPodrida, catalogo())
    expect(filaDe(estado, DOM.bree, RECURSO.madera)?.cantidad).toBe(425)
    expect(estado.ajustesExistencias.find((a) => a.id === AJUSTE_EXISTENCIAS.maderaPodrida)).toBeUndefined()
  })

  it('bloquea si deshacerlo bajaría de 0 o pasaría de la capacidad', () => {
    const base = ejemplo()
    const conPoco = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.madera ? { ...e, cantidad: 2 } : e)),
    }
    expect(() => eliminarAjuste(conPoco, AJUSTE_EXISTENCIAS.maderaPodrida, catalogo())).not.toThrow()
    const conCasiNada = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.madera ? { ...e, cantidad: 1 } : e)),
      ajustesExistencias: base.ajustesExistencias.map((a) =>
        a.id === AJUSTE_EXISTENCIAS.maderaPodrida ? { ...a, delta: 5 } : a,
      ),
    }
    expect(() => eliminarAjuste(conCasiNada, AJUSTE_EXISTENCIAS.maderaPodrida, catalogo())).toThrow(
      'Las existencias no pueden quedar por debajo de 0',
    )
  })

  it('si la fila ya no existe, solo borra el ajuste', () => {
    const base = ejemplo()
    const sinFila = {
      ...base,
      existencias: base.existencias.filter((e) => e.recursoId !== RECURSO.madera),
    }
    const estado = eliminarAjuste(sinFila, AJUSTE_EXISTENCIAS.maderaPodrida, catalogo())
    expect(estado.ajustesExistencias.find((a) => a.id === AJUSTE_EXISTENCIAS.maderaPodrida)).toBeUndefined()
    expect(filaDe(estado, DOM.bree, RECURSO.madera)).toBeUndefined()
  })
})

describe('bloqueoAlEliminarFila (O13)', () => {
  it('los víveres no se pueden quitar', () => {
    expect(bloqueoAlEliminarFila(ejemplo(), DOM.bree, RECURSO.viveres, catalogo())).toBe(
      'Los víveres no se pueden quitar del almacén',
    )
  })

  it('con existencias, dice cuántas quedan', () => {
    expect(bloqueoAlEliminarFila(ejemplo(), DOM.bree, RECURSO.hierro, catalogo())).toBe(
      'Solo se quita una fila sin existencias: quedan 64 lingotes',
    )
  })

  it('un edificio que la produce lo bloquea, con el estado si no está activo', () => {
    const base = ejemplo()
    // Arcilla a 0 sigue bloqueada porque la cantera la produce.
    const conArcillaA0 = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.arcilla ? { ...e, cantidad: 0 } : e)),
    }
    expect(bloqueoAlEliminarFila(conArcillaA0, DOM.bree, RECURSO.arcilla, catalogo())).toBe('Cantera produce arcilla')
  })

  it('un edificio alquilado añade el estado', () => {
    const base = ejemplo()
    const conHarina = {
      ...base,
      edificios: [
        ...base.edificios,
        {
          id: 'ed.molino2',
          dominioId: DOM.bree,
          tipoId: 'edificio.molino',
          nombre: 'Molino',
          estado: 'alquilado' as const,
          trabajadoresNecesarios: 0,
          producciones: [
            {
              id: 'prod.harina',
              recursoId: 'recurso.harina',
              cantidad: 10,
              recurrencia: { tipo: 'mensual' as const, diaMes: 1 },
              acumulado: { desde: base.partida.fechaActual, sumaFactores: 0 },
            },
          ],
        },
      ],
    }
    const catalogoConHarina = catalogo()
    catalogoConHarina.recursos.push({
      id: 'recurso.harina',
      nombre: 'Harina',
      unidadSingular: 'saco',
      unidadPlural: 'sacos',
      propia: false,
    })
    expect(bloqueoAlEliminarFila(conHarina, DOM.bree, 'recurso.harina', catalogoConHarina)).toBe(
      'Molino produce harina (estado: Alquilado)',
    )
  })

  it('un consumo por habitante lo bloquea (sin el edificio que también la produce)', () => {
    const base = ejemplo()
    const conCervezaA0 = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.cerveza ? { ...e, cantidad: 0 } : e)),
      edificios: base.edificios.filter((e) => e.id !== EDIFICIO.cerveceria),
    }
    expect(bloqueoAlEliminarFila(conCervezaA0, DOM.bree, RECURSO.cerveza, catalogo())).toBe(
      'El consumo «Cerveza» descuenta de esta fila',
    )
  })

  it('una obra sin terminar que necesita el material lo bloquea (sin el edificio que también lo produce)', () => {
    const base = ejemplo()
    const conPiedraA0 = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.piedra ? { ...e, cantidad: 0 } : e)),
      edificios: base.edificios.filter((e) => e.id !== EDIFICIO.cantera),
    }
    expect(bloqueoAlEliminarFila(conPiedraA0, DOM.bree, RECURSO.piedra, catalogo())).toBe(
      'La obra «Nuevo granero» necesita esta fila',
    )
  })

  it('una caravana sin terminar que lleva el recurso lo bloquea', () => {
    const base = ejemplo()
    const conLanaA0 = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.lana ? { ...e, cantidad: 0 } : e)),
      obras: [],
      poblaciones: base.poblaciones.map((p) => ({ ...p, consumos: [] })),
      edificios: base.edificios.filter((e) => e.id !== EDIFICIO.redil),
      caravanas: [
        ...base.caravanas,
        {
          id: 'car.lana',
          dominioId: DOM.bree,
          operacion: 'compra' as const,
          mercadoId: 'mer.fornost',
          carga: { recursoId: RECURSO.lana, cantidad: 20 },
          precioUnidad: { base: 30000 },
          importe: { base: 600000 },
          salida: { anio: 1640, mes: 4, dia: 12 },
          vuelta: { anio: 1640, mes: 4, dia: 20 },
          estado: 'enRuta' as const,
        },
      ],
    }
    expect(bloqueoAlEliminarFila(conLanaA0, DOM.bree, RECURSO.lana, catalogo())).toBe(
      'La caravana de compra a Fornost necesita esta fila',
    )
  })

  it('una entrada sin aplicar lo bloquea (sin las obras que también necesitan el recurso)', () => {
    const base = ejemplo()
    const conEntrada = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.hierro ? { ...e, cantidad: 0 } : e)),
      obras: [],
      entradasAlmacen: [
        {
          id: 'ent.x',
          dominioId: DOM.bree,
          recursoId: RECURSO.hierro,
          cantidad: 10,
          operacion: 'recepcion' as const,
          fecha: { anio: 1640, mes: 4, dia: 20 },
          aplicada: false,
        },
      ],
    }
    expect(bloqueoAlEliminarFila(conEntrada, DOM.bree, RECURSO.hierro, catalogo())).toBe(
      'La compra o recepción del 20 de abril necesita esta fila',
    )
  })

  it('sin ningún motivo, null', () => {
    const base = ejemplo()
    const conHierroA0 = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.hierro ? { ...e, cantidad: 0 } : e)),
      obras: [],
    }
    expect(bloqueoAlEliminarFila(conHierroA0, DOM.bree, RECURSO.hierro, catalogo())).toBeNull()
  })
})

describe('eliminarFila', () => {
  it('quita la fila cuando no hay bloqueo', () => {
    const base = ejemplo()
    const conHierroA0 = {
      ...base,
      existencias: base.existencias.map((e) => (e.recursoId === RECURSO.hierro ? { ...e, cantidad: 0 } : e)),
      obras: [],
    }
    const estado = eliminarFila(conHierroA0, DOM.bree, RECURSO.hierro, catalogo())
    expect(filaDe(estado, DOM.bree, RECURSO.hierro)).toBeUndefined()
  })

  it('lanza el bloqueo si lo hay', () => {
    expect(() => eliminarFila(ejemplo(), DOM.bree, RECURSO.viveres, catalogo())).toThrow(
      'Los víveres no se pueden quitar del almacén',
    )
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/edicion/existencias.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./existencias`, que todavía no existe (la hora, la duración y el corte de las líneas citadas varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/edicion/existencias.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/edicion/existencias.test.ts [ src/dominio/edicion/existencias.test.ts ]
Error: Cannot find module './existencias' imported from .../src/dominio/edicion/existencias.test.ts
 ❯ src/dominio/edicion/existencias.test.ts:7:1
      5| import { estadoDe, type EstadoPartida } from '../modelo/documento'
      6| import { validarCopia } from '../validacion/coherencia'
      7| import {
       | ^
      8|   asegurarFila,

 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Implementar `existencias.ts`**

Crea `src/dominio/edicion/existencias.ts` con este contenido:

```ts
import { cabenMas, esCero, formatearCantidad, textoCaben } from '../almacen/cantidades'
import { formatearDiaCercano } from '../calendario/formatoFecha'
import { RECURSO } from '../catalogo/inicial'
import type { AjusteExistencias, Existencia } from '../modelo/almacen'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { minusculaInicial, recursoDelCatalogo } from '../motor/textos'
import type { Sello } from './registros'

/** Cómo se nombra el estado de un edificio que no está activo, en «Cantera produce piedra (estado: …)». */
const ESTADO_EDIFICIO_TEXTO: Readonly<Record<'daniado' | 'inactivo' | 'alquilado', string>> = {
  daniado: 'Dañado',
  inactivo: 'Inactivo',
  alquilado: 'Alquilado',
}

/** La fila, o undefined si el almacén no la tiene. */
function filaEn(estado: EstadoPartida, dominioId: Id, recursoId: Id): Existencia | undefined {
  return estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
}

/** La fila, creada con cantidad 0 y sin capacidad si no está (D-056); el mismo estado si ya estaba. */
export function asegurarFila<E extends EstadoPartida>(estado: E, dominioId: Id, recursoId: Id): E {
  if (filaEn(estado, dominioId, recursoId) !== undefined) {
    return estado
  }
  return { ...estado, existencias: [...estado.existencias, { dominioId, recursoId, cantidad: 0 }] }
}

/** Lo que cambia el formulario «Recurso y ajuste de existencias» (§6.4 l.685). */
export interface CambiosExistencia {
  /** Si cambia, se anota un AjusteExistencias con la diferencia, la fecha de hoy y el motivo. */
  cantidad?: number
  /** null = sin capacidad. */
  capacidad?: number | null
  motivo?: string
}

/** La fila con los cambios aplicados, sin la clave `capacidad` si queda sin límite (§4). */
function filaConCambios(anterior: Existencia, cantidad: number, capacidad: number | undefined, ahora: string): Existencia {
  const base = { dominioId: anterior.dominioId, recursoId: anterior.recursoId, cantidad, editadoEl: ahora }
  return capacidad === undefined ? base : { ...base, capacidad }
}

/**
 * Cambia la cantidad, la capacidad o el motivo de una fila (asegurándola primero, D-056). cantidad < 0 → «Las
 * existencias no pueden quedar por debajo de 0»; cantidad cambiada sin motivo → «El ajuste necesita un motivo»;
 * si la cantidad nueva pasa de la capacidad (la nueva, o la de antes si no cambia): si cambió la cantidad,
 * textoCaben(cabenMas(fila de antes)); si solo bajó la capacidad, «Las existencias no pueden superar la
 * capacidad». Sin cambios, la misma referencia.
 */
export function editarExistencia<E extends EstadoPartida>(
  estado: E,
  dominioId: Id,
  recursoId: Id,
  cambios: CambiosExistencia,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): E {
  const base = asegurarFila(estado, dominioId, recursoId)
  const anterior = filaEn(base, dominioId, recursoId)
  if (anterior === undefined) {
    throw new Error(`No existe «${dominioId}|${recursoId}»`)
  }

  const cantidadCambia = cambios.cantidad !== undefined && cambios.cantidad !== anterior.cantidad
  const nuevaCantidad = cambios.cantidad ?? anterior.cantidad
  if (nuevaCantidad < 0) {
    throw new Error('Las existencias no pueden quedar por debajo de 0')
  }
  if (cantidadCambia && (cambios.motivo === undefined || cambios.motivo.trim() === '')) {
    throw new Error('El ajuste necesita un motivo')
  }

  const nuevaCapacidad = cambios.capacidad === undefined ? anterior.capacidad : (cambios.capacidad ?? undefined)
  const capacidadCambia = nuevaCapacidad !== anterior.capacidad

  if (nuevaCapacidad !== undefined && nuevaCantidad > nuevaCapacidad) {
    if (cantidadCambia) {
      throw new Error(textoCaben(cabenMas(anterior) ?? 0, recursoDelCatalogo(catalogo, recursoId)))
    }
    throw new Error('Las existencias no pueden superar la capacidad')
  }

  if (!cantidadCambia && !capacidadCambia) {
    return base
  }

  const nuevaFila = filaConCambios(anterior, nuevaCantidad, nuevaCapacidad, sello.ahora)
  const existencias = base.existencias.map((e) => (e.dominioId === dominioId && e.recursoId === recursoId ? nuevaFila : e))

  let ajustesExistencias = base.ajustesExistencias
  if (cantidadCambia) {
    const ajuste: AjusteExistencias = {
      id: sello.nuevoId(),
      dominioId,
      recursoId,
      fecha: base.partida.fechaActual,
      delta: nuevaCantidad - anterior.cantidad,
      motivo: cambios.motivo as string,
    }
    ajustesExistencias = [...ajustesExistencias, ajuste]
  }

  return { ...base, existencias, ajustesExistencias }
}

/** Deshace su cantidad (D-059) con los bloqueos de D-058; si la fila ya no existe, solo borra el ajuste. */
export function eliminarAjuste<E extends EstadoPartida>(estado: E, id: Id, catalogo: CatalogosEnCopia): E {
  const ajuste = estado.ajustesExistencias.find((a) => a.id === id)
  if (ajuste === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  const ajustesExistencias = estado.ajustesExistencias.filter((a) => a.id !== id)
  const fila = filaEn(estado, ajuste.dominioId, ajuste.recursoId)
  if (fila === undefined) {
    return { ...estado, ajustesExistencias }
  }
  const nuevaCantidad = fila.cantidad - ajuste.delta
  if (nuevaCantidad < 0) {
    throw new Error('Las existencias no pueden quedar por debajo de 0')
  }
  if (fila.capacidad !== undefined && nuevaCantidad > fila.capacidad) {
    throw new Error(textoCaben(cabenMas(fila) ?? 0, recursoDelCatalogo(catalogo, ajuste.recursoId)))
  }
  const existencias = estado.existencias.map((e) => (e === fila ? { ...fila, cantidad: nuevaCantidad } : e))
  return { ...estado, existencias, ajustesExistencias }
}

/** El primer motivo, en este orden: víveres, existencias, producción, consumo, obra sin terminar, caravana sin terminar, entrada sin aplicar; o null (§6.4 l.791; D-059). */
export function bloqueoAlEliminarFila(
  estado: EstadoPartida,
  dominioId: Id,
  recursoId: Id,
  catalogo: CatalogosEnCopia,
): string | null {
  if (recursoId === RECURSO.viveres) {
    return 'Los víveres no se pueden quitar del almacén'
  }
  const fila = filaEn(estado, dominioId, recursoId)
  if (fila !== undefined && !esCero(fila.cantidad)) {
    return `Solo se quita una fila sin existencias: quedan ${formatearCantidad(fila.cantidad, recursoDelCatalogo(catalogo, recursoId))}`
  }
  const edificioQueProduce = estado.edificios.find(
    (e) => e.dominioId === dominioId && e.producciones.some((p) => p.recursoId === recursoId),
  )
  if (edificioQueProduce !== undefined) {
    const sufijo =
      edificioQueProduce.estado === 'activo' ? '' : ` (estado: ${ESTADO_EDIFICIO_TEXTO[edificioQueProduce.estado]})`
    const nombreRecurso = minusculaInicial(recursoDelCatalogo(catalogo, recursoId).nombre)
    return `${edificioQueProduce.nombre} produce ${nombreRecurso}${sufijo}`
  }
  for (const poblacion of estado.poblaciones) {
    if (poblacion.dominioId !== dominioId) {
      continue
    }
    const consumo = poblacion.consumos.find((c) => c.recursoId === recursoId)
    if (consumo !== undefined) {
      return `El consumo «${consumo.nombre}» descuenta de esta fila`
    }
  }
  const obraQueNecesita = estado.obras.find(
    (o) =>
      o.dominioId === dominioId &&
      o.estado !== 'terminada' &&
      (Object.hasOwn(o.materiales, recursoId) ||
        (o.efecto.tipo === 'ampliarAlmacen' && o.efecto.recursoId === recursoId)),
  )
  if (obraQueNecesita !== undefined) {
    return `La obra «${obraQueNecesita.nombre}» necesita esta fila`
  }
  const caravanaQueNecesita = estado.caravanas.find(
    (c) =>
      c.estado !== 'terminada' &&
      c.carga.recursoId === recursoId &&
      (c.dominioId === dominioId || c.destinoId === dominioId),
  )
  if (caravanaQueNecesita !== undefined) {
    const destino =
      caravanaQueNecesita.operacion === 'traslado'
        ? (estado.dominios.find((d) => d.id === caravanaQueNecesita.destinoId)?.nombre ?? (caravanaQueNecesita.destinoId ?? ''))
        : (estado.mercados.find((m) => m.id === caravanaQueNecesita.mercadoId)?.nombre ?? (caravanaQueNecesita.mercadoId ?? ''))
    return `La caravana de ${caravanaQueNecesita.operacion} a ${destino} necesita esta fila`
  }
  const entradaQueNecesita = estado.entradasAlmacen.find(
    (e) => !e.aplicada && e.dominioId === dominioId && e.recursoId === recursoId,
  )
  if (entradaQueNecesita !== undefined) {
    return `La compra o recepción del ${formatearDiaCercano(entradaQueNecesita.fecha, estado.partida.fechaActual)} necesita esta fila`
  }
  return null
}

/** Quita la fila si no hay bloqueo (§6.4 l.791); lanza el bloqueo si lo hay. */
export function eliminarFila<E extends EstadoPartida>(estado: E, dominioId: Id, recursoId: Id, catalogo: CatalogosEnCopia): E {
  const bloqueo = bloqueoAlEliminarFila(estado, dominioId, recursoId, catalogo)
  if (bloqueo !== null) {
    throw new Error(bloqueo)
  }
  const existencias = estado.existencias.filter((e) => !(e.dominioId === dominioId && e.recursoId === recursoId))
  return { ...estado, existencias }
}
```

Notas sobre el código:

- `filaConCambios` no escribe la clave `capacidad` cuando queda `undefined`: así una fila sin capacidad no lleva esa clave en el documento, como pide la regla «Claves vacías» del contrato (§4). Igual pasa en `editarExistencia` con `cambios.capacidad ?? undefined`, que convierte el `null` del formulario («sin capacidad») en la ausencia de la clave.
- `cabenMas` devuelve `null` cuando la fila no tiene capacidad (no puede pasar por el `if` que llama a `textoCaben`, porque ese `if` ya exige `nuevaCapacidad !== undefined`, pero **la fila de antes** —con la que se calcula el mensaje— podría no tener capacidad si es la primera vez que se le pone una); el `?? 0` es solo esa salvaguarda de tipos, no cambia ningún caso de O13.
- `bloqueoAlEliminarFila` usa `Object.hasOwn` porque `Obra.materiales` es un `Record<Id, number>`, no un array: para saber si una obra necesita un recurso hay que mirar si su id es una clave del objeto.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/edicion/existencias.test.ts
```

Salida esperada (la duración varía):

```text
 Test Files  1 passed (1)
      Tests  25 passed (25)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **1.146 pruebas en 93 archivos** (1.120 al cerrar la tarea 20, más las 25 de `existencias.test.ts` y 1 más que suma automáticamente `pureza.test.ts` al ver el módulo nuevo; 93 = 92 + 1, por `existencias.ts`):

```text
 Test Files  93 passed (93)
      Tests  1146 passed (1146)
```

Si el número que ves no es 1146, sigue con **el tuyo**: lo que esta tarea garantiza es **+26 pruebas y +1 archivo** sobre lo que dejó la tarea 20.

- [ ] **Paso 6: Comprobar el estilo y la compilación de producción**

```bash
npm run lint
npm run build
```

Salida esperada: `npm run lint` no escribe nada y `npm run build` termina con `✓ built in …ms` (el tiempo varía), sin errores.

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/edicion/existencias.ts src/dominio/edicion/existencias.test.ts
git commit -m "$(cat <<'EOF'
feat(edicion): editar y borrar filas del almacén, con sus ajustes y sus bloqueos

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true` verás el aviso habitual de `LF will be replaced by CRLF` por cada archivo; es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-4 xxxxxxx] feat(edicion): editar y borrar filas del almacén, con sus ajustes y sus bloqueos
 2 files changed, 511 insertions(+)
 create mode 100644 src/dominio/edicion/existencias.test.ts
 create mode 100644 src/dominio/edicion/existencias.ts
```

---

---

### Tarea 22 · Compras y recepciones del almacén (13)

**Reglas de la especificación que implementa:**

- **Comprar y recibir en el almacén (§7 l.1097).** Distingue dos caminos: una compra en el mercado local se paga y entra al momento (o queda programada si es de fecha futura); una recepción sin coste solo entra, sin movimiento de dinero.
- **D-053 (`decisiones-fase-4.md`).** «Una compra en el mercado local o una recepción sin coste con fecha futura entra sola ese día. Si ese día no cabe entera, lo que sobra se pierde, como en la llegada de una caravana.» (Ese reparto lo hace `sumarAlAlmacen`, del paso 3 del motor, tarea 11; esta tarea solo dispara la entrada programada.)
- **D-054 (`decisiones-fase-4.md`).** «Una compra en el mercado local se anota con «Añadir existencias» o «Añadir víveres»… y no como caravana. Una compra en otro mercado se guarda solo como caravana, y se edita y se borra en Comercio.» Es la razón de que `crearEntradaAlmacen` solo acepte compras del mercado local (busca `mercados.find(m => m.localDe === dominioId)`) y de que `eliminarEntradaAlmacen` lance si la entrada tiene `caravanaId` (TC18).
- **Contrato §3.14.** «`crearEntradaAlmacen`: … Asegura la fila. fecha ≤ hoy: entra ya (bloquea con `textoCaben` si no cabe) y la compra crea su gasto vinculado; fecha > hoy: aplicada false y el gasto, programado.» Y el gasto exacto: «`{ id, dominioId, fecha, tipo: 'gasto', importe: { base: −redondearMitadArriba(precio.base × cantidad) }, categoriaId: víveres ? CATEGORIA.viveresDelAlmacen : CATEGORIA.comercio, concepto: conceptoCompraAlmacen(recurso, mercado.nombre), origen: 'manual', vinculo: { tipo: 'entradaAlmacen', id }, programado: fecha > hoy }`» (D-066, D-011).
- **`eliminarEntradaAlmacen` (contrato §3.14; D-058, TC18).** «Aplicada: saca sus unidades (bloquea bajo 0) y borra su movimiento; sin aplicar: la borra con su programado (§6.4 l.792). Con `caravanaId`, lanza.»
- **O13 (contrato §6).** Fija las cifras: compra de hoy de 100 sacos a 0,4 mo → gasto de 4.000.000 mh «Compra de víveres en Bree» en «Víveres del almacén», víveres a 410; «Por personas» 100 × 1 mes → 100 sacos (de la tarea 3, `sacosPorPersonas`); 1.000 sacos hoy → «Caben 890 sacos más» (de la tarea 3, `textoCaben`).

**Archivos:**
- Crear: `src/dominio/edicion/entradas.ts`
- Prueba: `src/dominio/edicion/entradas.test.ts`

Depende de la tarea 21 (`asegurarFila`, que usa D-056 igual que aquí) y usa, de tareas anteriores, `sacosPorPersonas` y `textoCaben` (tarea 3), `conceptoCompraAlmacen` y `recursoDelCatalogo` (tarea 7) y `redondearMitadArriba` (de la fase 1). Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/edicion/entradas.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { sacosPorPersonas } from '../almacen/cantidades'
import { CATEGORIA, RECURSO } from '../catalogo/inicial'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { validarCopia } from '../validacion/coherencia'
import { crearEntradaAlmacen, eliminarEntradaAlmacen, type DatosEntrada } from './entradas'
import type { Sello } from './registros'

function catalogo() {
  return catalogosDeEjemplo()
}

function ejemplo(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

function sello(): Sello {
  let ultimo = 0
  return { ahora: '2026-09-18T12:00:00.000Z', nuevoId: () => `sim.${(ultimo += 1)}` }
}

function filaDe(estado: EstadoPartida, dominioId: string, recursoId: string) {
  return estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
}

describe('crearEntradaAlmacen (O13)', () => {
  it('compra de hoy de 100 sacos a 0,4 mo: gasto de 4.000.000 mh en «Víveres del almacén» y víveres a 410', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 100,
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    const { estado, id } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    expect(filaDe(estado, DOM.bree, RECURSO.viveres)?.cantidad).toBe(410)
    const entrada = estado.entradasAlmacen.find((e) => e.id === id)
    expect(entrada).toMatchObject({ aplicada: true, cantidad: 100, operacion: 'compra' })
    const gasto = estado.movimientos.find((m) => m.vinculo?.tipo === 'entradaAlmacen' && m.vinculo.id === id)
    expect(gasto).toMatchObject({
      dominioId: DOM.bree,
      tipo: 'gasto',
      importe: { base: -4000000 },
      categoriaId: CATEGORIA.viveresDelAlmacen,
      concepto: 'Compra de víveres en Bree',
      programado: false,
    })
    expect(entrada?.movimientoId).toBe(gasto?.id)
  })

  it('«Por personas» 100 × 1 mes: 100 sacos', () => {
    const cantidad = sacosPorPersonas(100, 1, 'meses', 30)
    expect(cantidad).toBe(100)
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad,
      porPersonas: { personas: 100, durante: 1, periodo: 'meses' },
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    const { estado, id } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    const entrada = estado.entradasAlmacen.find((e) => e.id === id)
    expect(entrada).toMatchObject({ cantidad: 100, personas: 100, durante: 1, periodo: 'meses' })
  })

  it('1.000 sacos hoy: «Caben 890 sacos más»', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 1000,
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    expect(() => crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())).toThrow('Caben 890 sacos más')
  })

  it('una recepción de hoy entra sin coste ni movimiento', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'recepcion',
      cantidad: 50,
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    const { estado, id } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    expect(filaDe(estado, DOM.bree, RECURSO.viveres)?.cantidad).toBe(360)
    const entrada = estado.entradasAlmacen.find((e) => e.id === id)
    expect(entrada).toMatchObject({ aplicada: true })
    expect(estado.movimientos.some((m) => m.vinculo?.tipo === 'entradaAlmacen')).toBe(false)
  })

  it('una compra futura queda sin aplicar y con su gasto programado; el motor la aplica el día señalado', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 50,
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 20 },
    }
    const { estado, id } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    const entrada = estado.entradasAlmacen.find((e) => e.id === id)
    expect(entrada?.aplicada).toBe(false)
    const gasto = estado.movimientos.find((m) => m.vinculo?.tipo === 'entradaAlmacen' && m.vinculo.id === id)
    expect(gasto?.programado).toBe(true)
    // El motor la aplica al llegar el día (paso 3, T11): comparado con no tener la entrada, hay 50 sacos más.
    const opciones = { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogo() }
    const recorrido = recorrerDias(estado, { anio: 1640, mes: 4, dia: 21 }, opciones)
    const sinEntrada = recorrerDias(ejemplo(), { anio: 1640, mes: 4, dia: 21 }, opciones)
    const entradaAplicada = recorrido.estadoNuevo.entradasAlmacen.find((e) => e.id === id)
    expect(entradaAplicada).toMatchObject({ aplicada: true, fecha: { anio: 1640, mes: 4, dia: 20 } })
    const conEntrada = filaDe(recorrido.estadoNuevo, DOM.bree, RECURSO.viveres)?.cantidad ?? 0
    const sinEntradaCantidad = filaDe(sinEntrada.estadoNuevo, DOM.bree, RECURSO.viveres)?.cantidad ?? 0
    expect(conEntrada - sinEntradaCantidad).toBeCloseTo(50, 6)
  })

  it('una compra de otro recurso va a Comercio', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.hierro,
      operacion: 'compra',
      cantidad: 10,
      precioUnidad: { base: 100000 },
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    const { estado, id } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    const gasto = estado.movimientos.find((m) => m.vinculo?.tipo === 'entradaAlmacen' && m.vinculo.id === id)
    expect(gasto?.categoriaId).toBe(CATEGORIA.comercio)
    expect(gasto?.concepto).toBe('Compra de hierro en Bree')
  })

  it('crea la fila de un recurso que el almacén no tenía', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: 'recurso.sal',
      operacion: 'recepcion',
      cantidad: 30,
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    const { estado } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    expect(filaDe(estado, DOM.bree, 'recurso.sal')?.cantidad).toBe(30)
  })

  it('el resultado pasa validarCopia', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 100,
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    const { estado } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    expect(validarCopia({ ...estado, avances: documentoDeEjemplo().avances }, catalogo())).toEqual([])
  })
})

describe('eliminarEntradaAlmacen', () => {
  function conEntradaAplicada(): { estado: EstadoPartida; id: string } {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 100,
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 12 },
    }
    return crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
  }

  it('aplicada: saca sus unidades y borra su movimiento', () => {
    const { estado, id } = conEntradaAplicada()
    const gastoAntes = estado.movimientos.find((m) => m.vinculo?.tipo === 'entradaAlmacen' && m.vinculo.id === id)
    expect(gastoAntes).toBeDefined()
    const final = eliminarEntradaAlmacen(estado, id, catalogo())
    expect(filaDe(final, DOM.bree, RECURSO.viveres)?.cantidad).toBe(310)
    expect(final.movimientos.find((m) => m.id === gastoAntes?.id)).toBeUndefined()
    expect(final.entradasAlmacen.find((e) => e.id === id)).toBeUndefined()
  })

  it('aplicada: si bajaría de 0, bloquea', () => {
    const { estado, id } = conEntradaAplicada()
    const conPocosViveres: EstadoPartida = {
      ...estado,
      existencias: estado.existencias.map((e) => (e.recursoId === RECURSO.viveres ? { ...e, cantidad: 50 } : e)),
    }
    expect(() => eliminarEntradaAlmacen(conPocosViveres, id, catalogo())).toThrow(
      'Las existencias no pueden quedar por debajo de 0',
    )
  })

  it('sin aplicar: borra la entrada con su programado', () => {
    const datos: DatosEntrada = {
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      operacion: 'compra',
      cantidad: 50,
      precioUnidad: { base: 40000 },
      fecha: { anio: 1640, mes: 4, dia: 20 },
    }
    const { estado, id } = crearEntradaAlmacen(ejemplo(), datos, sello(), catalogo())
    const gastoAntes = estado.movimientos.find((m) => m.vinculo?.tipo === 'entradaAlmacen' && m.vinculo.id === id)
    const final = eliminarEntradaAlmacen(estado, id, catalogo())
    expect(final.entradasAlmacen.find((e) => e.id === id)).toBeUndefined()
    expect(final.movimientos.find((m) => m.id === gastoAntes?.id)).toBeUndefined()
    expect(filaDe(final, DOM.bree, RECURSO.viveres)?.cantidad).toBe(310)
  })

  it('con caravanaId, lanza «Esta compra se edita desde su caravana»', () => {
    const base = ejemplo()
    const conEntradaDeCaravana: EstadoPartida = {
      ...base,
      entradasAlmacen: [
        {
          id: 'ent.caravana',
          dominioId: DOM.bree,
          recursoId: RECURSO.viveres,
          cantidad: 300,
          operacion: 'compra',
          mercadoId: 'mer.tharbad',
          precioUnidad: { base: 25000 },
          caravanaId: 'car.tharbad',
          fecha: { anio: 1640, mes: 4, dia: 25 },
          aplicada: false,
        },
      ],
    }
    expect(() => eliminarEntradaAlmacen(conEntradaDeCaravana, 'ent.caravana', catalogo())).toThrow(
      'Esta compra se edita desde su caravana',
    )
  })
})
```

Ejecuta:

```bash
npx vitest run src/dominio/edicion/entradas.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./entradas`, que todavía no existe (la hora, la duración y el corte de las líneas citadas varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/edicion/entradas.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/edicion/entradas.test.ts [ src/dominio/edicion/entradas.test.ts ]
Error: Cannot find module './entradas' imported from .../src/dominio/edicion/entradas.test.ts
 ❯ src/dominio/edicion/entradas.test.ts:9:1
      7| import { estadoDe, type EstadoPartida } from '../modelo/documento'
      8| import { validarCopia } from '../validacion/coherencia'
      9| import { crearEntradaAlmacen, eliminarEntradaAlmacen, type DatosEntrada } from './entradas'
       | ^

 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 2: Implementar `entradas.ts`**

Crea `src/dominio/edicion/entradas.ts` con este contenido:

```ts
import { cabenMas, textoCaben } from '../almacen/cantidades'
import { compararFechas, type Fecha } from '../calendario/fecha'
import { CATEGORIA, RECURSO } from '../catalogo/inicial'
import { redondearMitadArriba } from '../dinero/importe'
import type { Importe } from '../dinero/importe'
import type { EntradaAlmacen, PeriodoViveres } from '../modelo/almacen'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { conceptoCompraAlmacen, recursoDelCatalogo } from '../motor/textos'
import { asegurarFila } from './existencias'
import { buscarPorId, quitarPorId, type Creado, type Sello } from './registros'

export interface DatosEntrada {
  dominioId: Id
  recursoId: Id
  operacion: 'compra' | 'recepcion'
  /** Unidades; con «Por personas», las de sacosPorPersonas. */
  cantidad: number
  porPersonas?: { personas: number; durante: number; periodo: PeriodoViveres }
  /** Solo en una compra: precio por unidad en el mercado local. */
  precioUnidad?: Importe
  fecha: Fecha
}

/** La fila viva de un almacén; undefined si no la tiene. */
function filaEn(estado: EstadoPartida, dominioId: Id, recursoId: Id) {
  return estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
}

/**
 * Compra en el mercado local (el de localDe = dominioId) o recepción sin coste (§7 l.1097; D-053, D-054). Asegura
 * la fila. fecha ≤ hoy: entra ya (bloquea con textoCaben si no cabe) y la compra crea su gasto vinculado; fecha
 * > hoy: aplicada false y el gasto, programado.
 */
export function crearEntradaAlmacen<E extends EstadoPartida>(
  estado: E,
  datos: DatosEntrada,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): Creado<E> {
  const conFila = asegurarFila(estado, datos.dominioId, datos.recursoId)
  const id = sello.nuevoId()
  const hoy = conFila.partida.fechaActual
  const entraYa = compararFechas(datos.fecha, hoy) <= 0

  let movimientos = conFila.movimientos
  let movimientoId: Id | undefined
  let mercadoId: Id | undefined
  if (datos.operacion === 'compra') {
    const mercado = conFila.mercados.find((m) => m.localDe === datos.dominioId)
    if (mercado === undefined) {
      throw new Error(`No existe «mercado local de ${datos.dominioId}»`)
    }
    mercadoId = mercado.id
    const precio = datos.precioUnidad as Importe
    const importe = redondearMitadArriba(precio.base * datos.cantidad)
    const recurso = recursoDelCatalogo(catalogo, datos.recursoId)
    movimientoId = sello.nuevoId()
    const gasto: Movimiento = {
      id: movimientoId,
      dominioId: datos.dominioId,
      fecha: datos.fecha,
      tipo: 'gasto',
      importe: { base: -importe },
      categoriaId: datos.recursoId === RECURSO.viveres ? CATEGORIA.viveresDelAlmacen : CATEGORIA.comercio,
      concepto: conceptoCompraAlmacen(recurso.nombre, mercado.nombre),
      origen: 'manual',
      vinculo: { tipo: 'entradaAlmacen', id },
      programado: !entraYa,
    }
    movimientos = [...movimientos, gasto]
  }

  let existencias = conFila.existencias
  let aplicada = false
  if (entraYa) {
    const fila = filaEn(conFila, datos.dominioId, datos.recursoId)
    if (fila === undefined) {
      throw new Error(`No existe «${datos.dominioId}|${datos.recursoId}»`)
    }
    if (fila.capacidad !== undefined) {
      const caben = cabenMas(fila) ?? 0
      if (datos.cantidad > caben) {
        throw new Error(textoCaben(caben, recursoDelCatalogo(catalogo, datos.recursoId)))
      }
    }
    existencias = conFila.existencias.map((e) => (e === fila ? { ...fila, cantidad: fila.cantidad + datos.cantidad } : e))
    aplicada = true
  }

  const entrada: EntradaAlmacen = {
    id,
    dominioId: datos.dominioId,
    recursoId: datos.recursoId,
    cantidad: datos.cantidad,
    operacion: datos.operacion,
    fecha: datos.fecha,
    aplicada,
    ...(mercadoId === undefined ? {} : { mercadoId }),
    ...(datos.precioUnidad === undefined ? {} : { precioUnidad: datos.precioUnidad }),
    ...(movimientoId === undefined ? {} : { movimientoId }),
    ...(datos.porPersonas === undefined
      ? {}
      : { personas: datos.porPersonas.personas, durante: datos.porPersonas.durante, periodo: datos.porPersonas.periodo }),
  }

  return {
    estado: { ...conFila, existencias, movimientos, entradasAlmacen: [...conFila.entradasAlmacen, entrada] },
    id,
  }
}

/**
 * Aplicada: saca sus unidades (bloquea bajo 0) y borra su movimiento; sin aplicar: la borra con su programado
 * (§6.4 l.792). Con caravanaId, lanza.
 */
export function eliminarEntradaAlmacen<E extends EstadoPartida>(estado: E, id: Id, _catalogo: CatalogosEnCopia): E {
  const entrada = buscarPorId(estado.entradasAlmacen, id)
  if (entrada.caravanaId !== undefined) {
    throw new Error('Esta compra se edita desde su caravana')
  }
  const entradasAlmacen = quitarPorId(estado.entradasAlmacen, id)
  const movimientos = entrada.movimientoId === undefined ? estado.movimientos : quitarPorId(estado.movimientos, entrada.movimientoId)

  if (!entrada.aplicada) {
    return { ...estado, entradasAlmacen, movimientos }
  }

  const fila = filaEn(estado, entrada.dominioId, entrada.recursoId)
  const disponible = fila?.cantidad ?? 0
  if (disponible < entrada.cantidad) {
    throw new Error('Las existencias no pueden quedar por debajo de 0')
  }
  const existencias = estado.existencias.map((e) =>
    e === fila ? { ...fila, cantidad: disponible - entrada.cantidad } : e,
  )
  return { ...estado, entradasAlmacen, movimientos, existencias }
}
```

Notas sobre el código:

- El parámetro `_catalogo` de `eliminarEntradaAlmacen` lleva el guion bajo a propósito: el contrato fija esa firma (con `catalogo: CatalogosEnCopia`) por coherencia con el resto de `edicion/*.ts` (TC17: «las que escriben unidades o nombres de recurso reciben `catalogo`»), pero esta función en concreto no escribe ningún texto con el nombre de un recurso —el bloqueo es siempre «Las existencias no pueden quedar por debajo de 0»—, así que no lo usa. Con `noUnusedParameters` activo en `tsconfig.app.json`, un parámetro sin el guion bajo no compila; con él, TypeScript lo permite y la firma pública sigue siendo la del contrato.
- Los tres campos opcionales de `EntradaAlmacen` (`mercadoId`, `precioUnidad`, `movimientoId`) y los tres de «Por personas» (`personas`, `durante`, `periodo`) se añaden con `...(condición ? {} : { … })`: así una recepción, que no tiene mercado ni precio ni movimiento, no guarda esas claves con `undefined` (regla «Claves vacías» del contrato, §4).
- `crearEntradaAlmacen` no comprueba que exista un mercado local si la operación es una recepción: solo busca `mercados.find(m => m.localDe === dominioId)` dentro del `if (datos.operacion === 'compra')`. Toda «La Sombra del Este» tiene mercado local en sus dos asentamientos (lo exige `validarReferencias` desde la fase 2), así que ese `throw` no se llega a probar con el ejemplo; queda como salvaguarda de un estado imposible en una copia válida.

- [ ] **Paso 3: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/edicion/entradas.test.ts
```

Salida esperada (la duración varía):

```text
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

- [ ] **Paso 4: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **1.159 pruebas en 94 archivos** (1.146 al cerrar la tarea 21, más las 12 de `entradas.test.ts` y 1 más que suma automáticamente `pureza.test.ts` al ver el módulo nuevo; 94 = 93 + 1, por `entradas.ts`):

```text
 Test Files  94 passed (94)
      Tests  1159 passed (1159)
```

Si el número que ves no es 1159, sigue con **el tuyo**: lo que esta tarea garantiza es **+13 pruebas y +1 archivo** sobre lo que dejó la tarea 21.

- [ ] **Paso 5: Comprobar el estilo y la compilación de producción**

```bash
npm run lint
npm run build
```

Salida esperada: `npm run lint` no escribe nada y `npm run build` termina con `✓ built in …ms` (el tiempo varía), sin errores.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/edicion/entradas.ts src/dominio/edicion/entradas.test.ts
git commit -m "$(cat <<'EOF'
feat(edicion): comprar en el mercado local o recibir sin coste, y borrar la entrada

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true` verás el aviso habitual de `LF will be replaced by CRLF` por cada archivo; es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-4 xxxxxxx] feat(edicion): comprar en el mercado local o recibir sin coste, y borrar la entrada
 2 files changed, 380 insertions(+)
 create mode 100644 src/dominio/edicion/entradas.test.ts
 create mode 100644 src/dominio/edicion/entradas.ts
```

---

---

### Tarea 23 · Edificios: crear, guardar y borrar (14)

Esta tarea escribe `src/dominio/edicion/edificios.ts` entero: `crearEdificio` («Añadir edificio»), `guardarEdificio` («Guardar cambios» de A7b), `bloqueoAlEliminarEdificio` y `eliminarEdificio`. Depende de la tarea 5 (`almacen/produccion.ts`, que fija el vocabulario de `RecurrenciaProduccion` y `AcumuladoProduccion` que usa `DatosProduccion`) y de la tarea 21 (`edicion/existencias.ts`, de donde importa `asegurarFila`). También usa `edicion/registros.ts` (fase 3, tarea 13: `buscarPorId`, `mismoRegistro`, `quitarPorId`, `reemplazarPorId`, `Creado`, `Sello`) y `motor/textos.ts` de la tarea 7 (`minusculaInicial`, `nombreDeFrecuencia`, `recursoDelCatalogo`).

**Reglas de la especificación que implementa:**

- **Contrato de la fase 4, §3.14** (`edicion/edificios.ts` [T23]): «`crearEdificio`: “Añadir edificio”: todas sus producciones empiezan a 0 con desde = mañana; asegura sus filas.» y «`guardarEdificio`: “Guardar cambios” de A7b (§7 l.1124-1128; §6.4 l.684): una producción con el mismo id, el mismo recurso y la misma frecuencia (mismoRegistro) conserva su acumulado; si cambia el recurso o la frecuencia, o es nueva, pasa a `{ desde: mañana, sumaFactores: 0 }`; las que no vienen se quitan. Quita avisoPendiente. Asegura las filas.» y «`bloqueoAlEliminarEdificio`: “Antes, termina o elimina la obra «X»” si una obra sin terminar lo mejora o lo repara; si no, null (§6.4 l.789).» y «`eliminarEdificio`: Trabajadores sin edificio, efectos de eventos que lo apuntan fuera, renta sin edificioId; la historia se queda (§6.4 l.789; D-055).»
- **D-055** (decisiones-fase-4.md): «Borrar un edificio o quitarle una producción, borrar un mercado, una fila del almacén o una obra terminada no borra lo que ya pasó: la producción ya ocurrida sigue en el calendario […]. Donde nombraban lo borrado dirán «eliminado».» — de ahí que `eliminarEdificio` no toque `produccionesRealizadas`.
- **D-056**: «Al guardar algo que nombra un recurso que el almacén de ese asentamiento no tiene […], su fila se crea con 0 y sin capacidad.» — de ahí `asegurarFila` en `crearEdificio` y `guardarEdificio`.
- **D-067** (mensajes literales): «Ya produce piedra semanal: cambia su cantidad» y «Antes, termina o elimina la obra «Ampliar la cervecería»».
- **TC17** (técnicas, decisiones-fase-4.md): funciones puras `<E extends EstadoPartida>`, la misma referencia si nada cambia, `editadoEl = sello.ahora` solo en el registro que se edita, ids nuevos con `sello.nuevoId()`, `throw new Error(texto)` con los textos de §5, y `catalogo: CatalogosEnCopia` en las que nombran recursos.
- **O13** (contrato §6, con «La Sombra del Este», 12 de abril de 1640): «`guardarEdificio` de la cantera: piedra de 25 a 30 conserva 10/3; arcilla a «Mensual · día 15» → `{ desde: 13 abr, sumaFactores: 0 }`; dos «Piedra · semanal» → «Ya produce piedra semanal: cambia su cantidad». `bloqueoAlEliminarEdificio(cervecería)` → «Antes, termina o elimina la obra «Ampliar la cervecería»». `eliminarEdificio(molino de Bree)` → la renta «Alquiler del molino» pierde `edificioId`; `eliminarEdificio(cantera)` → los canteros pierden `edificioId` y la `ProduccionRealizada` de piedra del 7 de abril se queda.»

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/edicion/edificios.ts`
- Prueba: `src/dominio/edicion/edificios.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/edicion/edificios.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM, EDIFICIO, EVENTO, IMPUESTO, OBRA, PRODUCCION, TRABAJADOR } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { RECURSO, idDeOpcion } from '../catalogo/inicial'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import type { Sello } from './registros'
import { bloqueoAlEliminarEdificio, crearEdificio, eliminarEdificio, guardarEdificio, type DatosEdificio } from './edificios'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** La fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }
const MANANA: Fecha = { anio: 1640, mes: 4, dia: 13 }

/** Un sello nuevo en cada prueba: los ids salen «nuevo.1», «nuevo.2»… */
function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

/** La partida de ejemplo congelada: si una función escribe en su entrada, la prueba falla. */
function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

/** El edificio con ese id, tal y como queda en el estado. */
function edificio(documento: DocumentoPartida, id: Id) {
  const e = documento.edificios.find((x) => x.id === id)
  if (e === undefined) {
    throw new Error(`No está «${id}»`)
  }
  return e
}

const catalogo = catalogosDeEjemplo()

describe('guardarEdificio', () => {
  it('la producción con el mismo id, recurso y frecuencia conserva su acumulado (O13, cantera: piedra 25 → 30)', () => {
    const documento = ejemplo()
    const cantera = edificio(documento, EDIFICIO.cantera)
    const datos = {
      tipoId: cantera.tipoId,
      nombre: cantera.nombre,
      estado: cantera.estado,
      trabajadoresNecesarios: cantera.trabajadoresNecesarios,
      producciones: [
        { id: PRODUCCION.canteraPiedra, recursoId: RECURSO.piedra, cantidad: 30, recurrencia: cantera.producciones[0].recurrencia },
        cantera.producciones[1],
      ],
    }
    const estado = guardarEdificio(documento, EDIFICIO.cantera, datos, sello(), catalogo)
    const nueva = edificio(estado, EDIFICIO.cantera).producciones.find((p) => p.id === PRODUCCION.canteraPiedra)!
    expect(nueva.cantidad).toBe(30)
    expect(nueva.acumulado).toEqual({ desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 10 / 3 })
  })

  it('cambiar la frecuencia reinicia el acumulado a mañana (O13, cantera: arcilla a «Mensual · día 15»)', () => {
    const documento = ejemplo()
    const cantera = edificio(documento, EDIFICIO.cantera)
    const datos = {
      tipoId: cantera.tipoId,
      nombre: cantera.nombre,
      estado: cantera.estado,
      trabajadoresNecesarios: cantera.trabajadoresNecesarios,
      producciones: [
        cantera.producciones[0],
        { id: PRODUCCION.canteraArcilla, recursoId: RECURSO.arcilla, cantidad: 10, recurrencia: { tipo: 'mensual' as const, diaMes: 15 } },
      ],
    }
    const estado = guardarEdificio(documento, EDIFICIO.cantera, datos, sello(), catalogo)
    const nueva = edificio(estado, EDIFICIO.cantera).producciones.find((p) => p.id === PRODUCCION.canteraArcilla)!
    expect(nueva.acumulado).toEqual({ desde: MANANA, sumaFactores: 0 })
  })

  it('dos producciones del mismo recurso y la misma frecuencia lanza «Ya produce piedra semanal: cambia su cantidad»', () => {
    const documento = ejemplo()
    const cantera = edificio(documento, EDIFICIO.cantera)
    const datos = {
      tipoId: cantera.tipoId,
      nombre: cantera.nombre,
      estado: cantera.estado,
      trabajadoresNecesarios: cantera.trabajadoresNecesarios,
      producciones: [
        { recursoId: RECURSO.piedra, cantidad: 25, recurrencia: { tipo: 'semanal' as const, diaSemana: 5 as const, inicio: HOY } },
        { recursoId: RECURSO.piedra, cantidad: 10, recurrencia: { tipo: 'semanal' as const, diaSemana: 5 as const, inicio: HOY } },
      ],
    }
    expect(() => guardarEdificio(documento, EDIFICIO.cantera, datos, sello(), catalogo)).toThrow(
      'Ya produce piedra semanal: cambia su cantidad',
    )
  })

  it('un producto nuevo asegura su fila y arranca a 0 desde mañana', () => {
    const documento = ejemplo()
    const cantera = edificio(documento, EDIFICIO.cantera)
    const datos = {
      tipoId: cantera.tipoId,
      nombre: cantera.nombre,
      estado: cantera.estado,
      trabajadoresNecesarios: cantera.trabajadoresNecesarios,
      producciones: [
        ...cantera.producciones,
        { recursoId: RECURSO.hierro, cantidad: 5, recurrencia: { tipo: 'mensual' as const, diaMes: 1 } },
      ],
    }
    const estado = guardarEdificio(documento, EDIFICIO.cantera, datos, sello(), catalogo)
    const nueva = edificio(estado, EDIFICIO.cantera).producciones.at(-1)!
    expect(nueva.recursoId).toBe(RECURSO.hierro)
    expect(nueva.acumulado).toEqual({ desde: MANANA, sumaFactores: 0 })
    expect(estado.existencias.some((e) => e.dominioId === DOM.bree && e.recursoId === RECURSO.hierro)).toBe(true)
  })

  it('un producto que no viene en los datos se quita', () => {
    const documento = ejemplo()
    const cantera = edificio(documento, EDIFICIO.cantera)
    const datos = {
      tipoId: cantera.tipoId,
      nombre: cantera.nombre,
      estado: cantera.estado,
      trabajadoresNecesarios: cantera.trabajadoresNecesarios,
      producciones: [cantera.producciones[0]],
    }
    const estado = guardarEdificio(documento, EDIFICIO.cantera, datos, sello(), catalogo)
    expect(edificio(estado, EDIFICIO.cantera).producciones).toHaveLength(1)
    expect(edificio(estado, EDIFICIO.cantera).producciones[0].id).toBe(PRODUCCION.canteraPiedra)
  })

  it('sin cambios pero con avisoPendiente, lo quita', () => {
    const documento = ejemplo()
    const conAviso: DocumentoPartida = {
      ...documento,
      edificios: documento.edificios.map((e) =>
        e.id === EDIFICIO.molino ? { ...e, avisoPendiente: { tipo: 'terminadoSinProduccion' as const, obraId: OBRA.molinoArchet } } : e,
      ),
    }
    const molino = edificio(conAviso, EDIFICIO.molino)
    const datos = {
      tipoId: molino.tipoId,
      nombre: molino.nombre,
      estado: molino.estado,
      trabajadoresNecesarios: molino.trabajadoresNecesarios,
      producciones: [],
    }
    const estado = guardarEdificio(conAviso, EDIFICIO.molino, datos, sello(), catalogo)
    expect(edificio(estado, EDIFICIO.molino).avisoPendiente).toBeUndefined()
  })

  it('sin aviso y sin cambios, la misma referencia', () => {
    const documento = ejemplo()
    const molino = edificio(documento, EDIFICIO.molino)
    const datos = {
      tipoId: molino.tipoId,
      nombre: molino.nombre,
      estado: molino.estado,
      trabajadoresNecesarios: molino.trabajadoresNecesarios,
      producciones: [],
    }
    const estado = guardarEdificio(documento, EDIFICIO.molino, datos, sello(), catalogo)
    expect(estado).toBe(documento)
  })
})

describe('crearEdificio', () => {
  it('empieza sus producciones a 0 desde mañana y asegura las filas', () => {
    const documento = ejemplo()
    const datos: DatosEdificio = {
      dominioId: DOM.bree,
      tipoId: idDeOpcion('tiposEdificio', 'Herrería'),
      nombre: 'Forja nueva',
      estado: 'activo',
      trabajadoresNecesarios: 2,
      producciones: [{ recursoId: RECURSO.hierro, cantidad: 8, recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: HOY } }],
    }
    const { estado, id } = crearEdificio(documento, datos, sello(), catalogo)
    expect(id).toBe('nuevo.1')
    const nuevo = edificio(estado, 'nuevo.1')
    expect(nuevo.nombre).toBe('Forja nueva')
    expect(nuevo.producciones[0].acumulado).toEqual({ desde: MANANA, sumaFactores: 0 })
    expect(estado.existencias.some((e) => e.dominioId === DOM.bree && e.recursoId === RECURSO.hierro)).toBe(true)
  })
})

describe('bloqueoAlEliminarEdificio', () => {
  it('«Antes, termina o elimina la obra «Ampliar la cervecería»» (O13)', () => {
    const documento = ejemplo()
    expect(bloqueoAlEliminarEdificio(documento, EDIFICIO.cerveceria)).toBe(
      'Antes, termina o elimina la obra «Ampliar la cervecería»',
    )
  })

  it('null cuando ninguna obra sin terminar lo mejora ni lo repara', () => {
    const documento = ejemplo()
    expect(bloqueoAlEliminarEdificio(documento, EDIFICIO.molino)).toBeNull()
  })
})

describe('eliminarEdificio', () => {
  it('el molino de Bree: la renta «Alquiler del molino» pierde edificioId (O13)', () => {
    const documento = ejemplo()
    const estado = eliminarEdificio(documento, EDIFICIO.molino)
    const renta = estado.impuestosRentas.find((i) => i.id === IMPUESTO.alquilerMolino)!
    expect(renta.edificioId).toBeUndefined()
  })

  it('la cantera: los canteros pierden edificioId y la producción de piedra del 7 de abril se queda (O13)', () => {
    const documento = ejemplo()
    const estado = eliminarEdificio(documento, EDIFICIO.cantera)
    const canteros = estado.trabajadores.find((t) => t.id === TRABAJADOR.canteros)!
    expect(canteros.edificioId).toBeUndefined()
    expect(estado.produccionesRealizadas.some((p) => p.edificioId === EDIFICIO.cantera)).toBe(true)
    expect(estado.edificios.some((e) => e.id === EDIFICIO.cantera)).toBe(false)
  })

  it('quita el efecto de un evento que lo apuntaba (las granjas de las lluvias)', () => {
    const documento = ejemplo()
    const estado = eliminarEdificio(documento, EDIFICIO.granjas)
    const lluvias = estado.eventos.find((e) => e.id === EVENTO.lluvias)
    expect(lluvias?.efectos).toEqual([])
  })

  it('la partida resultante sigue siendo válida (validarCopia, depende de la tarea 20)', () => {
    const documento = ejemplo()
    const estado = eliminarEdificio(documento, EDIFICIO.cantera)
    expect(validarCopia(estado, catalogo)).toEqual([])
  })
})
```

Son **14 pruebas**: 7 de `guardarEdificio`, 1 de `crearEdificio`, 2 de `bloqueoAlEliminarEdificio` y 4 de `eliminarEdificio`.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/edicion/edificios.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./edificios`, que todavía no existe. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/edicion/edificios.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/edicion/edificios.test.ts [ src/dominio/edicion/edificios.test.ts ]
Error: Cannot find module './edificios' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/edicion/edificios.test.ts
 ❯ src/dominio/edicion/edificios.test.ts:12:1
     10| import { validarCopia } from '../validacion/coherencia'
     11| import type { Sello } from './registros'
     12| import { bloqueoAlEliminarEdificio, crearEdificio, eliminarEdificio, g…
       | ^
     13|
     14| /** La hora de las ediciones de estas pruebas. */

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  20:19:52
   Duration  991ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `edificios.ts`**

Crea `src/dominio/edicion/edificios.ts` con este contenido:

```ts
import { sumarDias } from '../calendario/fecha'
import type { AcumuladoProduccion, Edificio, ProduccionEdificio } from '../modelo/asentamiento'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id, RecurrenciaProduccion } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { minusculaInicial, nombreDeFrecuencia, recursoDelCatalogo } from '../motor/textos'
import { asegurarFila } from './existencias'
import { buscarPorId, mismoRegistro, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Una producción del formulario «Edificio» / A7b. */
export interface DatosProduccion {
  id?: Id
  recursoId: Id
  cantidad: number
  recurrencia: RecurrenciaProduccion
}

/** Lo que pide el formulario «Edificio» (§6.4). */
export interface DatosEdificio {
  dominioId: Id
  tipoId: Id
  nombre: string
  estado: Edificio['estado']
  trabajadoresNecesarios: number
  producciones: DatosProduccion[]
}

/** Dos producciones de datos con el mismo recurso y la misma frecuencia → «Ya produce…: cambia su cantidad». */
function exigeSinDuplicados(producciones: readonly DatosProduccion[], catalogo: CatalogosEnCopia): void {
  for (let i = 0; i < producciones.length; i += 1) {
    for (let j = i + 1; j < producciones.length; j += 1) {
      const a = producciones[i]
      const b = producciones[j]
      if (a.recursoId === b.recursoId && mismoRegistro(a.recurrencia, b.recurrencia)) {
        const recurso = minusculaInicial(recursoDelCatalogo(catalogo, a.recursoId).nombre)
        throw new Error(`Ya produce ${recurso} ${nombreDeFrecuencia(a.recurrencia)}: cambia su cantidad`)
      }
    }
  }
}

/** Asegura la fila de cada producción en el almacén de dominioId. */
function asegurarFilasDeProducciones<E extends EstadoPartida>(
  estado: E,
  dominioId: Id,
  producciones: readonly { recursoId: Id }[],
): E {
  return producciones.reduce((acc, p) => asegurarFila(acc, dominioId, p.recursoId), estado)
}

/** «Añadir edificio»: todas sus producciones empiezan a 0 con desde = mañana; asegura sus filas. */
export function crearEdificio<E extends EstadoPartida>(
  estado: E,
  datos: DatosEdificio,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): Creado<E> {
  exigeSinDuplicados(datos.producciones, catalogo)
  const manana = sumarDias(estado.partida.fechaActual, 1)
  const acumuladoInicial: AcumuladoProduccion = { desde: manana, sumaFactores: 0 }
  const id = sello.nuevoId()
  const producciones: ProduccionEdificio[] = datos.producciones.map((p) => ({
    id: sello.nuevoId(),
    recursoId: p.recursoId,
    cantidad: p.cantidad,
    recurrencia: p.recurrencia,
    acumulado: acumuladoInicial,
  }))
  const edificio: Edificio = {
    id,
    dominioId: datos.dominioId,
    tipoId: datos.tipoId,
    nombre: datos.nombre,
    estado: datos.estado,
    trabajadoresNecesarios: datos.trabajadoresNecesarios,
    producciones,
  }
  const conFila = asegurarFilasDeProducciones(estado, datos.dominioId, producciones)
  return { estado: { ...conFila, edificios: [...conFila.edificios, edificio] }, id }
}

/**
 * «Guardar cambios» de A7b: una producción con el mismo id, el mismo recurso y la misma frecuencia
 * (mismoRegistro) conserva su acumulado; si cambia el recurso o la frecuencia, o es nueva, pasa a
 * { desde: mañana, sumaFactores: 0 }; las que no vienen se quitan. Quita avisoPendiente. Asegura las filas.
 */
export function guardarEdificio<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: Omit<DatosEdificio, 'dominioId'>,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): E {
  const anterior = buscarPorId(estado.edificios, id)
  exigeSinDuplicados(datos.producciones, catalogo)
  const manana = sumarDias(estado.partida.fechaActual, 1)
  const producciones: ProduccionEdificio[] = datos.producciones.map((p) => {
    const previa = p.id === undefined ? undefined : anterior.producciones.find((q) => q.id === p.id)
    const conserva =
      previa !== undefined && previa.recursoId === p.recursoId && mismoRegistro(previa.recurrencia, p.recurrencia)
    return {
      id: p.id ?? sello.nuevoId(),
      recursoId: p.recursoId,
      cantidad: p.cantidad,
      recurrencia: p.recurrencia,
      acumulado: conserva ? previa.acumulado : { desde: manana, sumaFactores: 0 },
    }
  })
  const nuevo: Edificio = {
    id: anterior.id,
    dominioId: anterior.dominioId,
    tipoId: datos.tipoId,
    nombre: datos.nombre,
    estado: datos.estado,
    trabajadoresNecesarios: datos.trabajadoresNecesarios,
    producciones,
  }
  const conFila = asegurarFilasDeProducciones(estado, anterior.dominioId, producciones)
  const edificios = reemplazarPorId(conFila.edificios, nuevo, sello.ahora)
  return edificios === conFila.edificios ? conFila : { ...conFila, edificios }
}

/** «Antes, termina o elimina la obra «X»» si una obra sin terminar lo mejora o lo repara; si no, null (§6.4). */
export function bloqueoAlEliminarEdificio(estado: EstadoPartida, id: Id): string | null {
  const obra = estado.obras.find(
    (o) =>
      (o.efecto.tipo === 'mejorarEdificio' || o.efecto.tipo === 'repararEdificio') &&
      o.efecto.objetivoId === id &&
      o.estado !== 'terminada',
  )
  return obra === undefined ? null : `Antes, termina o elimina la obra «${obra.nombre}»`
}

/** Trabajadores sin edificio, efectos de eventos que lo apuntan fuera, renta sin edificioId; la historia se queda. */
export function eliminarEdificio<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.edificios, id)
  const trabajadores = estado.trabajadores.map((t) => {
    if (t.edificioId !== id) {
      return t
    }
    const { edificioId: _edificioId, ...resto } = t
    return resto
  })
  const impuestosRentas = estado.impuestosRentas.map((imp) => {
    if (imp.edificioId !== id) {
      return imp
    }
    const { edificioId: _edificioId, ...resto } = imp
    return resto
  })
  const eventos = estado.eventos.map((ev) => {
    if (!ev.efectos.some((ef) => ef.objetivo.tipo === 'edificio' && ef.objetivo.id === id)) {
      return ev
    }
    return { ...ev, efectos: ev.efectos.filter((ef) => !(ef.objetivo.tipo === 'edificio' && ef.objetivo.id === id)) }
  })
  return {
    ...estado,
    trabajadores,
    impuestosRentas,
    eventos,
    edificios: quitarPorId(estado.edificios, id),
  }
}
```

Por qué `bloqueoAlEliminarEdificio` no se llama dentro de `eliminarEdificio`: a diferencia de `eliminarMercado` (tarea 24) o de `eliminarTipoLocal` (fase 3), que sí llaman a su propio bloqueo, el contrato (§3.14) da aquí las dos funciones sueltas, y esta tarea sigue esa letra: `eliminarEdificio` asume que el bloqueo ya se comprobó antes (el formulario de la fase 8 no ofrece el botón si `bloqueoAlEliminarEdificio` no es `null`). Si una revisión posterior prefiere blindarla también aquí, añadir ese `if` al principio de la función no rompe ninguna prueba de esta tarea.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/edicion/edificios.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  20:08:07
   Duration  881ms (transform 57%, import 37%, tests 5%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **1.173 pruebas en 95 archivos**. La tarea 22 dejó, en la cadena real de este plan, 1.159 pruebas en 94 archivos, y esta tarea trae **14 nuevas** (las 14 de `edificios.test.ts`; `edificios.ts` no suma una prueba aparte a `pureza.test.ts` porque ya la trae ella misma: la nueva línea de `it.each` que recorre los módulos del dominio cuenta el archivo, y ese recuento ya está incluido en el `+14`).

```text
 Test Files  95 passed (95)
      Tests  1173 passed (1173)
```

Si el número que ves no es 1.173, sigue con **el tuyo**: lo que esta tarea garantiza es **+14 pruebas y +1 archivo** sobre lo que dejó la tarea 22. El número de archivos sí es exactamente 95.

- [ ] **Paso 6: Comprobar el estilo**

```bash
npm run lint
```

Salida esperada: sin avisos.

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/edicion/edificios.ts src/dominio/edicion/edificios.test.ts
git commit -m "feat(edicion): crear, guardar y borrar edificios" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/edicion/edificios.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/edicion/edificios.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-4 a1b2c3d] feat(edicion): crear, guardar y borrar edificios
 2 files changed, 254 insertions(+)
 create mode 100644 src/dominio/edicion/edificios.test.ts
 create mode 100644 src/dominio/edicion/edificios.ts
```

---

## Huecos resueltos en esta tarea (grupo 6)

- **Recuento real, no la estimación del contrato**: verificado en un clon aislado (`…/scratchpad/fase-4/replica-g6`), esta tarea añade exactamente **14 pruebas y 1 archivo** sobre el final de la tarea 22. El contrato estimaba la misma cifra (§8: «14 | 1123 | 95») sobre su propia base estimada (1.109/94); en la cadena real de este plan, que arrastra las correcciones de las tareas 3 a 22, la base es **1.159/94** y el resultado de esta tarea es **1.173 pruebas en 95 archivos** (sí hace falta corregir aguas abajo por esas correcciones anteriores, no por esta tarea sola; las tareas 24 y 25 añaden además sus propias diferencias, ver sus «huecos»).
- **`bloqueoAlEliminarEdificio` no se llama dentro de `eliminarEdificio`**: el contrato (§3.14) las da como dos funciones sueltas, a diferencia de `eliminarTipoLocal` (fase 3) o `eliminarMercado` (tarea 24), que sí llaman a su propio bloqueo. Se ha mantenido la letra del contrato: el formulario (fase 8) comprueba el bloqueo antes de ofrecer el botón de borrar. Si una revisión posterior prefiere que `eliminarEdificio` también lance el error por su cuenta, añadir `const bloqueo = bloqueoAlEliminarEdificio(estado, id); if (bloqueo !== null) throw new Error(bloqueo)` al principio de la función no rompe ninguna prueba de esta tarea ni de las que dependen de ella.

---

### Tarea 24 · Mercados, precios y rutas (13)

Esta tarea escribe `src/dominio/edicion/mercados.ts` entero: `diasDeViaje`, `guardarRuta`, `guardarPrecio`, `bloqueoAlEliminarMercado` y `eliminarMercado`. Depende de la tarea 20 (`validacion/referencias.ts` relajado: una caravana terminada puede seguir nombrando un mercado que ya no existe) y de `edicion/registros.ts` (fase 3, tarea 13). No depende de ningún módulo de la tarea 21 ni de la 23: es la única de este bloque que no toca el almacén.

**Reglas de la especificación que implementa:**

- **Contrato de la fase 4, §3.14** (`edicion/mercados.ts` [T24]): «`diasDeViaje`: Días de viaje de ida; entre asentamientos vale en los dos sentidos (§8 l.1257); null si no hay ruta.» · «`guardarRuta`: Crea, cambia (`editadoEl`) o, con `null`, quita la ruta; entre asentamientos la busca en los dos sentidos.» · «`guardarPrecio`: “Guardar como precio de Fornost” (§7 l.1156): crea o cambia el precio del recurso en el mercado.» · «`bloqueoAlEliminarMercado`: El local no se elimina; tampoco con caravanas en ruta o programadas (§6.4 l.793; D-059).» · «`eliminarMercado`: Borra el mercado, con sus precios, y sus rutas; las caravanas y entradas terminadas conservan el mercadoId (D-055).»
- **D-055**: «Borrar […] un mercado […] no borra lo que ya pasó: […] se quedan las caravanas y compras terminadas […]. Donde nombraban lo borrado dirán «eliminado».»
- **D-059**: «Un mercado tampoco se borra con caravanas programadas» (además de las «en ruta», que ya decía §6.4).
- **D-067** (mensajes literales): «El mercado local no se puede eliminar» · «Fornost tiene 1 caravana sin terminar: espera a que vuelva o elimínala antes» · «Fornost tiene 2 caravanas sin terminar: espera a que vuelvan o elimínalas antes» · «Faltan los días de viaje de Bree a Cavada Grande» (D-054, D-067, usado por la tarea 26 al construir una caravana, pero la función que hace posible detectarlo —`diasDeViaje` devolviendo `null`— es de esta tarea).
- **TC17**: funciones puras `<E extends EstadoPartida>`, la misma referencia si nada cambia, `editadoEl = sello.ahora` solo en el registro que se edita, `Error` con el texto literal.
- **O13**: «`bloqueoAlEliminarMercado(Fornost)` → «Fornost tiene 1 caravana sin terminar: espera a que vuelva o elimínala antes».»

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/edicion/mercados.ts`
- Prueba: `src/dominio/edicion/mercados.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/edicion/mercados.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { RECURSO } from '../catalogo/inicial'
import { DOM, MERCADO } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Caravana, Mercado } from '../modelo/comercio'
import type { Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Sello } from './registros'
import { bloqueoAlEliminarMercado, diasDeViaje, eliminarMercado, guardarPrecio, guardarRuta } from './mercados'

const AHORA: Instante = '2026-09-18T10:00:00.000Z'
const catalogo = catalogosDeEjemplo()

function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

/** Un mercado nuevo, sin ruta desde Bree ni caravanas: «Cavada Grande» (D-067, ejemplo de mensaje). */
const CAVADA_GRANDE: Mercado = { id: 'mer.cavada-grande', nombre: 'Cavada Grande', precios: [] }

describe('diasDeViaje', () => {
  it('da los días guardados y null si no hay ruta', () => {
    const documento = ejemplo()
    expect(diasDeViaje(documento, DOM.bree, { tipo: 'mercado', id: MERCADO.fornost })).toBe(4)
    const conCavada: DocumentoPartida = { ...documento, mercados: [...documento.mercados, CAVADA_GRANDE] }
    expect(diasDeViaje(conCavada, DOM.bree, { tipo: 'mercado', id: CAVADA_GRANDE.id })).toBeNull()
  })

  it('entre dos asentamientos vale en los dos sentidos', () => {
    const documento = ejemplo()
    const conRuta = guardarRuta(documento, DOM.bree, { tipo: 'asentamiento', id: DOM.archet }, 6, sello())
    expect(diasDeViaje(conRuta, DOM.bree, { tipo: 'asentamiento', id: DOM.archet })).toBe(6)
    expect(diasDeViaje(conRuta, DOM.archet, { tipo: 'asentamiento', id: DOM.bree })).toBe(6)
  })
})

describe('guardarRuta', () => {
  it('crea una ruta nueva', () => {
    const documento = ejemplo()
    const estado = guardarRuta(documento, DOM.bree, { tipo: 'asentamiento', id: DOM.archet }, 6, sello())
    expect(estado.rutas.at(-1)).toEqual({ origenId: DOM.bree, destino: { tipo: 'asentamiento', id: DOM.archet }, diasViaje: 6 })
  })

  it('cambia los días de una ruta existente y sella editadoEl', () => {
    const documento = ejemplo()
    const estado = guardarRuta(documento, DOM.bree, { tipo: 'mercado', id: MERCADO.fornost }, 5, sello())
    const ruta = estado.rutas.find((r) => r.destino.tipo === 'mercado' && r.destino.id === MERCADO.fornost)!
    expect(ruta.diasViaje).toBe(5)
    expect(ruta.editadoEl).toBe(AHORA)
  })

  it('con diasViaje null quita la ruta', () => {
    const documento = ejemplo()
    const estado = guardarRuta(documento, DOM.bree, { tipo: 'mercado', id: MERCADO.fornost }, null, sello())
    expect(estado.rutas.some((r) => r.destino.tipo === 'mercado' && r.destino.id === MERCADO.fornost)).toBe(false)
  })
})

describe('guardarPrecio', () => {
  it('crea el precio de un recurso que el mercado no tenía', () => {
    const documento = ejemplo()
    const estado = guardarPrecio(documento, MERCADO.archet, RECURSO.viveres, { base: 35000 }, sello())
    const mercado = estado.mercados.find((m) => m.id === MERCADO.archet)!
    expect(mercado.precios).toEqual([{ recursoId: RECURSO.viveres, importe: { base: 35000 } }])
  })

  it('«Guardar como precio de Fornost»: cambia un precio existente', () => {
    const documento = ejemplo()
    const estado = guardarPrecio(documento, MERCADO.fornost, RECURSO.viveres, { base: 32000 }, sello())
    const mercado = estado.mercados.find((m) => m.id === MERCADO.fornost)!
    expect(mercado.precios.find((p) => p.recursoId === RECURSO.viveres)!.importe).toEqual({ base: 32000 })
  })
})

describe('bloqueoAlEliminarMercado', () => {
  it('el mercado local no se puede eliminar', () => {
    const documento = ejemplo()
    expect(bloqueoAlEliminarMercado(documento, MERCADO.bree)).toBe('El mercado local no se puede eliminar')
  })

  it('«Fornost tiene 1 caravana sin terminar…» con una caravana en ruta', () => {
    const documento = ejemplo()
    expect(bloqueoAlEliminarMercado(documento, MERCADO.fornost)).toBe(
      'Fornost tiene 1 caravana sin terminar: espera a que vuelva o elimínala antes',
    )
  })

  it('cuenta también una caravana programada', () => {
    const documento = ejemplo()
    const conCavada: DocumentoPartida = { ...documento, mercados: [...documento.mercados, CAVADA_GRANDE] }
    const programada: Caravana = {
      id: 'car.prueba',
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: CAVADA_GRANDE.id,
      carga: { recursoId: RECURSO.viveres, cantidad: 10 },
      precioUnidad: { base: 28000 },
      importe: { base: 280000 },
      salida: { anio: 1640, mes: 4, dia: 20 },
      vuelta: { anio: 1640, mes: 4, dia: 30 },
      estado: 'programada',
    }
    const conCaravana: DocumentoPartida = { ...conCavada, caravanas: [...conCavada.caravanas, programada] }
    expect(bloqueoAlEliminarMercado(conCaravana, CAVADA_GRANDE.id)).toBe(
      'Cavada Grande tiene 1 caravana sin terminar: espera a que vuelva o elimínala antes',
    )
  })

  it('null si no hay nada pendiente', () => {
    const documento = ejemplo()
    const conCavada: DocumentoPartida = { ...documento, mercados: [...documento.mercados, CAVADA_GRANDE] }
    expect(bloqueoAlEliminarMercado(conCavada, CAVADA_GRANDE.id)).toBeNull()
  })
})

describe('eliminarMercado', () => {
  it('borra el mercado con sus precios y sus rutas', () => {
    const documento = ejemplo()
    const conCavada: DocumentoPartida = { ...documento, mercados: [...documento.mercados, CAVADA_GRANDE] }
    const conRuta = guardarRuta(conCavada, DOM.bree, { tipo: 'mercado', id: CAVADA_GRANDE.id }, 5, sello())
    const estado = eliminarMercado(conRuta, CAVADA_GRANDE.id)
    expect(estado.mercados.some((m) => m.id === CAVADA_GRANDE.id)).toBe(false)
    expect(estado.rutas.some((r) => r.destino.tipo === 'mercado' && r.destino.id === CAVADA_GRANDE.id)).toBe(false)
  })

  it('una caravana terminada conserva su mercadoId aunque el mercado se borre, y la copia sigue siendo válida', () => {
    const documento = ejemplo()
    const terminada: Caravana = {
      id: 'car.terminada-cavada',
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: CAVADA_GRANDE.id,
      carga: { recursoId: RECURSO.viveres, cantidad: 10 },
      precioUnidad: { base: 28000 },
      importe: { base: 280000 },
      salida: { anio: 1640, mes: 3, dia: 1 },
      vuelta: { anio: 1640, mes: 3, dia: 10 },
      estado: 'terminada',
    }
    const conCavada: DocumentoPartida = {
      ...documento,
      mercados: [...documento.mercados, CAVADA_GRANDE],
      caravanas: [...documento.caravanas, terminada],
    }
    const estado = eliminarMercado(conCavada, CAVADA_GRANDE.id)
    expect(estado.mercados.some((m) => m.id === CAVADA_GRANDE.id)).toBe(false)
    expect(estado.caravanas.find((c) => c.id === terminada.id)!.mercadoId).toBe(CAVADA_GRANDE.id)
    expect(validarCopia(estado, catalogo)).toEqual([])
  })
})
```

Son **13 pruebas**: 2 de `diasDeViaje`, 3 de `guardarRuta`, 2 de `guardarPrecio`, 4 de `bloqueoAlEliminarMercado` y 2 de `eliminarMercado`.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/edicion/mercados.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./mercados`, que todavía no existe. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/edicion/mercados.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/edicion/mercados.test.ts [ src/dominio/edicion/mercados.test.ts ]
Error: Cannot find module './mercados' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/edicion/mercados.test.ts
 ❯ src/dominio/edicion/mercados.test.ts:13:1
     11| import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
     12| import type { Sello } from './registros'
     13| import { bloqueoAlEliminarMercado, diasDeViaje, eliminarMercado, guard…
       | ^
     14|
     15| const AHORA: Instante = '2026-09-18T10:00:00.000Z'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  20:20:02
   Duration  1.29s (worker 95%, environment 5%)
```

- [ ] **Paso 3: Implementar `mercados.ts`**

Crea `src/dominio/edicion/mercados.ts` con este contenido:

```ts
import type { Importe } from '../dinero/importe'
import type { DestinoRuta, Mercado, Ruta } from '../modelo/comercio'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { buscarPorId, reemplazarPorId, type Sello } from './registros'

/** El mismo destino de ruta (mismo tipo y mismo id). */
function mismoDestino(a: DestinoRuta, b: DestinoRuta): boolean {
  return a.tipo === b.tipo && a.id === b.id
}

/** El destino «al revés» de un origen y un destino de asentamiento, para buscar la ruta en los dos sentidos. */
function destinoInverso(origenId: Id, destino: DestinoRuta): DestinoRuta | null {
  return destino.tipo === 'asentamiento' ? { tipo: 'asentamiento', id: origenId } : null
}

/** Busca la ruta entre origenId y destino; entre dos asentamientos, también en el sentido contrario. */
function buscarRuta(rutas: readonly Ruta[], origenId: Id, destino: DestinoRuta): Ruta | undefined {
  const directa = rutas.find((r) => r.origenId === origenId && mismoDestino(r.destino, destino))
  if (directa !== undefined) {
    return directa
  }
  const inverso = destinoInverso(origenId, destino)
  if (inverso === null) {
    return undefined
  }
  return rutas.find((r) => r.origenId === destino.id && mismoDestino(r.destino, inverso))
}

/** Días de viaje de ida; entre asentamientos vale en los dos sentidos; null si no hay ruta. */
export function diasDeViaje(estado: EstadoPartida, origenId: Id, destino: DestinoRuta): number | null {
  return buscarRuta(estado.rutas, origenId, destino)?.diasViaje ?? null
}

/** Crea, cambia (editadoEl) o, con null, quita la ruta; entre asentamientos la busca en los dos sentidos. */
export function guardarRuta<E extends EstadoPartida>(
  estado: E,
  origenId: Id,
  destino: DestinoRuta,
  diasViaje: number | null,
  sello: Sello,
): E {
  const existente = buscarRuta(estado.rutas, origenId, destino)
  if (diasViaje === null) {
    if (existente === undefined) {
      return estado
    }
    return { ...estado, rutas: estado.rutas.filter((r) => r !== existente) }
  }
  if (existente === undefined) {
    const ruta: Ruta = { origenId, destino, diasViaje }
    return { ...estado, rutas: [...estado.rutas, ruta] }
  }
  if (existente.diasViaje === diasViaje) {
    return estado
  }
  const rutas = estado.rutas.map((r) => (r === existente ? { ...existente, diasViaje, editadoEl: sello.ahora } : r))
  return { ...estado, rutas }
}

/** «Guardar como precio de Fornost»: crea o cambia el precio del recurso en el mercado. */
export function guardarPrecio<E extends EstadoPartida>(
  estado: E,
  mercadoId: Id,
  recursoId: Id,
  importe: Importe,
  sello: Sello,
): E {
  const mercado = buscarPorId(estado.mercados, mercadoId)
  const precios = mercado.precios.some((p) => p.recursoId === recursoId)
    ? mercado.precios.map((p) => (p.recursoId === recursoId ? { recursoId, importe } : p))
    : [...mercado.precios, { recursoId, importe }]
  const nuevo: Mercado = { ...mercado, precios }
  const mercados = reemplazarPorId(estado.mercados, nuevo, sello.ahora)
  return mercados === estado.mercados ? estado : { ...estado, mercados }
}

/** Caravanas de ese mercado que aún no han terminado (programadas o en ruta). */
function caravanasSinTerminar(estado: EstadoPartida, mercadoId: Id): number {
  return estado.caravanas.filter((c) => c.mercadoId === mercadoId && c.estado !== 'terminada').length
}

/** El local no se elimina; tampoco con caravanas en ruta o programadas (§6.4; D-059). */
export function bloqueoAlEliminarMercado(estado: EstadoPartida, id: Id): string | null {
  const mercado = buscarPorId(estado.mercados, id)
  if (mercado.localDe !== undefined) {
    return 'El mercado local no se puede eliminar'
  }
  const n = caravanasSinTerminar(estado, id)
  if (n === 0) {
    return null
  }
  return n === 1
    ? `${mercado.nombre} tiene 1 caravana sin terminar: espera a que vuelva o elimínala antes`
    : `${mercado.nombre} tiene ${n} caravanas sin terminar: espera a que vuelvan o elimínalas antes`
}

/** Borra el mercado, con sus precios, y sus rutas; las caravanas y entradas terminadas conservan el mercadoId. */
export function eliminarMercado<E extends EstadoPartida>(estado: E, id: Id): E {
  const bloqueo = bloqueoAlEliminarMercado(estado, id)
  if (bloqueo !== null) {
    throw new Error(bloqueo)
  }
  return {
    ...estado,
    mercados: estado.mercados.filter((m) => m.id !== id),
    rutas: estado.rutas.filter((r) => !(r.destino.tipo === 'mercado' && r.destino.id === id)),
  }
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/edicion/mercados.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  20:09:31
   Duration  737ms (transform 54%, import 39%, tests 6%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **1.186 pruebas en 96 archivos**. La tarea 23 dejó, en la cadena real de este plan, 1.173 pruebas en 95 archivos, y esta tarea trae **13 nuevas** (las 13 de `mercados.test.ts`; `mercados.ts` no suma una prueba aparte a `pureza.test.ts` por la misma razón que en la tarea 23: el archivo nuevo ya cuenta dentro de ese `+13` porque `it.each` recorre los `.ts` del dominio en el momento de ejecutar, no antes).

```text
 Test Files  96 passed (96)
      Tests  1186 passed (1186)
```

Si el número que ves no es 1.186, sigue con **el tuyo**: lo que esta tarea garantiza es **+13 pruebas y +1 archivo** sobre lo que dejó la tarea 23. El número de archivos sí es exactamente 96.

- [ ] **Paso 6: Comprobar el estilo**

```bash
npm run lint
```

Salida esperada: sin avisos.

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/edicion/mercados.ts src/dominio/edicion/mercados.test.ts
git commit -m "feat(edicion): mercados, precios y rutas" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
warning: in the working copy of 'src/dominio/edicion/mercados.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/edicion/mercados.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-4 b2c3d4e] feat(edicion): mercados, precios y rutas
 2 files changed, 209 insertions(+)
 create mode 100644 src/dominio/edicion/mercados.test.ts
 create mode 100644 src/dominio/edicion/mercados.ts
```

---

## Huecos resueltos en esta tarea (grupo 6)

- **Recuento real, no la estimación del contrato**: verificado en un clon aislado, esta tarea añade exactamente **13 pruebas y 1 archivo** sobre el final de la tarea 23. El contrato estimaba 12 pruebas sobre su base estimada de 1.123/95 (§8: «24 | … | 12 | 1135 | 96»); la diferencia (+1) viene de que la prueba de `diasDeViaje` «sin ruta null» y la de «Fornost 4» se escribieron como dos aserciones de un mismo `it`, mientras que «bloqueos» se separó en **cuatro** `it` (local, en ruta, programada, sin nada) en vez de agruparlos: eso cuenta una prueba más de las que el contrato daba por hecho que se agruparían. En la cadena real de este plan, que arrastra además las correcciones de las tareas 3 a 22, la base es **1.173/95** y el total correcto desde aquí es **1.186 en 96 archivos**; arrástralo a las tareas 25, 26, 27 y 28.
- **«Cavada Grande»**: el contrato (D-067) usa ese nombre solo como ejemplo de un mercado sin ruta, para el mensaje «Faltan los días de viaje de Bree a Cavada Grande»; no está en los datos de «La Sombra del Este» (`ejemplo/asentamientosAlmacen.ts`), que documenta expresamente que «desde Archet no hay ninguna [ruta], y por eso no ve el mercado de Cavada Grande». Esta tarea construye ese mercado a mano dentro de las pruebas (`CAVADA_GRANDE`, sin `localDe` ni precios) en vez de añadirlo al ejemplo, porque tocar `ejemplo/asentamientosAlmacen.ts` no es parte de esta tarea y cambiaría cifras de otras tareas ya cerradas (T18-20 de la fase 2). La tarea 26 (caravanas) reutiliza el mismo mercado de prueba para su propio caso de Cavada Grande (O9).

---

### Tarea 25 · Obras: crear, empezar, editar y borrar (20)

Esta tarea escribe `src/dominio/edicion/obras.ts` entero: `crearObra`, `empezarObra`, `planificarObra`, `editarObra` y `eliminarObra`. Depende de la tarea 6 (`almacen/progreso.ts`, aunque esta tarea no la importa directamente: fija `finDeObra` y `progresoDeObra`, que sí usan las tareas 16 a 18) y de la tarea 21 (`edicion/existencias.ts`, de donde importa `asegurarFila`). También usa `almacen/cantidades.ts` de la tarea 3 (`TOLERANCIA`, `cabenMas`, `textoCaben`, `RecursoConNombre`), `motor/textos.ts` de la tarea 7 (`conceptoObra`, `recursoDelCatalogo`, `textoFaltan`) y `edicion/registros.ts` (fase 3, tarea 13).

**Reglas de la especificación que implementa:**

- **Contrato de la fase 4, §3.14** (`edicion/obras.ts` [T25]): «`crearObra`: Sin inicio: planificada. Con inicio: como empezarObra. Asegura las filas de materiales y de ampliarAlmacen (D-056).» · «`empezarObra`: “Empezar obra” de una planificada o programada (una programada rehace su programado). inicio > hoy: programada, con su gasto programado si coste > 0 (D-046). inicio ≤ hoy: exige los materiales (textoFaltan), los saca y crea su gasto; la caja puede quedar en negativo (§7 l.1142). Otra obra → “Esta obra ya ha empezado”.» · «`planificarObra`: “Guardar como planificada” de una programada: quita inicio y su gasto programado.» · «`editarObra`: D-065: planificada y programada cambian entera; en curso y terminada, solo lo pendiente; el coste corrige su gasto.» · «`eliminarObra`: §6.4 l.785-786 y D-058, D-059.»
- **El párrafo que sigue a los tipos, §3.14**: «El gasto de una obra: `{ id, dominioId, fecha: inicio, tipo: 'gasto', importe: { base: −coste.base, introducido? }, categoriaId: CATEGORIA.obras, concepto: conceptoObra(nombre), origen: 'manual', vinculo: { tipo: 'obra', id: obraId }, programado: inicio > hoy }`; con coste 0 no hay gasto (D-045). En `editarObra`, el concepto solo se rehace en una programada (en curso o terminada conserva el suyo). `eliminarObra`: planificada, se borra; programada, con su gasto programado; en curso, `devolverCoste` borra su gasto (si no, se queda sin vínculo) y `devolverMateriales` los suma a sus filas con el bloqueo de D-058; terminada, su gasto se queda sin vínculo y su efecto no se deshace.»
- **D-044**: «Una obra […] programada que no puede empezar el día señalado […] lo vuelve a intentar cada día.» (la reintenta el paso 3 del motor, tarea 11; esta tarea solo deja la obra en `programada` con su gasto programado).
- **D-045**: «El pago de una obra programada […] se ve en “Programados” desde que la guardas, y el motor lo paga entero o no lo paga. […] Una obra de coste 0 no crea movimiento.»
- **D-046**: «Programar una obra para más adelante no exige tener ya los materiales: se comprueban el día que empieza. “Empezar obra” con fecha de hoy o anterior sí los exige (“Faltan 20 carretadas de cal”).»
- **D-056**: «Al guardar algo que nombra un recurso que el almacén de ese asentamiento no tiene (una producción, un material o la ampliación de una obra […]), su fila se crea con 0 y sin capacidad.»
- **D-058**: «Devolver los materiales o la carga al borrar una obra o una caravana […] se bloquean si las existencias pasarían de la capacidad (“Caben 12 sacos más”) o bajarían de 0.»
- **D-065**: «Al editar una obra en curso solo cambian el nombre, la duración, el resultado y el coste (que corrige su movimiento); en una terminada, el nombre y el coste. […] Una obra o caravana planificada o programada cambia entera.»
- **D-067** (mensajes literales): «Faltan 20 carretadas de cal» / «Falta 1 lingote de hierro» · «Esta obra ya ha empezado» · «En una obra en curso solo cambian el nombre, la duración, el resultado y el coste» · «En una obra terminada solo cambian el nombre y el coste».
- **TC17**: funciones puras `<E extends EstadoPartida>`, la misma referencia si nada cambia, `editadoEl = sello.ahora` solo en el registro que se edita, `Error` con el texto literal, `catalogo: CatalogosEnCopia` en las que nombran recursos.
- **TC19**: los importes calculados (de una caravana; no aplica directamente a obras, cuyo coste sí conserva lo tecleado).
- **O9** y **O13**: «empezar hoy «Horno comunal» de 35 mo deja la caja de Bree en 305,6 mo (340,6 − 35)» · «`empezarObra(cervecería, 12 abr)` → madera 360, piedra 150, gasto de 4.500.000 mh «Obra: ampliar la cervecería»; con el 20 de abril → programada y su gasto programado. «Horno comunal» con 170 carretadas de arcilla hoy → «Faltan 20 carretadas de arcilla». `eliminarObra(granero, { devolverCoste: true, devolverMateriales: true })` → madera 540, piedra 240 y sin el gasto de 85 mo.»

**Aviso importante sobre esta tarea**: el contrato no fija la forma exacta de detectar, dentro de `editarObra`, cuándo un cambio prohibido en una obra *en curso* o *terminada* debe lanzar el mensaje de D-067 («solo cambian…»); tampoco dice qué pasa si esos campos llegan iguales a los que ya tenía la obra. Esta tarea lo resuelve de la forma más simple que cumple D-065 y dan los pasos de abajo: en `enCurso` se compara `datos.materiales` con los materiales que ya tenía la obra (con `mismoRegistro`, la misma comparación a fondo que ya usa `guardarEdificio`) y, si son distintos, se lanza el error; en `terminada` se comparan `diasTotales`, `efecto` y `materiales`. Queda anotado también al final, en «Huecos».

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/edicion/obras.ts`
- Prueba: `src/dominio/edicion/obras.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/edicion/obras.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { RECURSO, idDeOpcion } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { DOM, EDIFICIO, MOV_BREE, OBRA } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import type { Sello } from './registros'
import {
  crearObra,
  editarObra,
  eliminarObra,
  empezarObra,
  planificarObra,
  type DatosObra,
} from './obras'

const AHORA: Instante = '2026-09-18T10:00:00.000Z'
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }
const catalogo = catalogosDeEjemplo()

function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

function existencia(documento: DocumentoPartida, dominioId: Id, recursoId: Id): number {
  return documento.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)?.cantidad ?? 0
}

function obra(documento: DocumentoPartida, id: Id) {
  const o = documento.obras.find((x) => x.id === id)
  if (o === undefined) {
    throw new Error(`No está «${id}»`)
  }
  return o
}

describe('crearObra', () => {
  it('empezar hoy «Horno comunal» (35 mo, sin materiales) deja la caja de Bree en 305,6 mo (O9)', () => {
    const documento = ejemplo()
    const datos: DatosObra = {
      dominioId: DOM.bree,
      nombre: 'Horno comunal',
      coste: { base: 3500000, introducido: { cantidad: '35', moneda: 'mo' } },
      materiales: {},
      diasTotales: 10,
      efecto: { tipo: 'crearEdificio', tipoId: idDeOpcion('tiposEdificio', 'Horno') },
    }
    const { estado } = crearObra(documento, datos, HOY, sello(), catalogo)
    expect(saldosPorDominio(estado)[DOM.bree]).toBe(30560000)
  })

  it('«Horno comunal» con 170 carretadas de arcilla hoy → «Faltan 20 carretadas de arcilla» (O13)', () => {
    const documento = ejemplo()
    const datos: DatosObra = {
      dominioId: DOM.bree,
      nombre: 'Horno comunal',
      coste: { base: 3500000, introducido: { cantidad: '35', moneda: 'mo' } },
      materiales: { [RECURSO.arcilla]: 170 },
      diasTotales: 10,
      efecto: { tipo: 'crearEdificio', tipoId: idDeOpcion('tiposEdificio', 'Horno') },
    }
    expect(() => crearObra(documento, datos, HOY, sello(), catalogo)).toThrow('Faltan 20 carretadas de arcilla')
  })

  it('sin inicio queda planificada, sin movimiento y con las filas de sus materiales aseguradas', () => {
    const documento = ejemplo()
    const datos: DatosObra = {
      dominioId: DOM.bree,
      nombre: 'Taller nuevo',
      coste: { base: 1000000, introducido: { cantidad: '10', moneda: 'mo' } },
      materiales: { 'recurso.oro-en-bruto': 2 },
      diasTotales: 5,
      efecto: { tipo: 'crearDefensa', tipoId: idDeOpcion('tiposDefensa', 'Empalizada') },
    }
    const { estado, id } = crearObra(documento, datos, undefined, sello(), catalogo)
    expect(obra(estado, id).estado).toBe('planificada')
    expect(obra(estado, id).movimientoId).toBeUndefined()
  })

  it('asegura la fila de un material que el almacén no tenía', () => {
    const documento = ejemplo()
    const datos: DatosObra = {
      dominioId: DOM.bree,
      nombre: 'Taller de vidrio',
      coste: { base: 500000 },
      materiales: { 'recurso.vidrio': 3 },
      diasTotales: 8,
      efecto: { tipo: 'crearDefensa', tipoId: idDeOpcion('tiposDefensa', 'Torre') },
    }
    const { estado } = crearObra(documento, datos, undefined, sello(), catalogo)
    expect(estado.existencias.some((e) => e.dominioId === DOM.bree && e.recursoId === 'recurso.vidrio')).toBe(true)
  })

  it('con fecha futura queda programada sin exigir materiales (D-046), con su gasto programado', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 25 }
    const datos: DatosObra = {
      dominioId: DOM.bree,
      nombre: 'Muralla nueva',
      coste: { base: 2000000, introducido: { cantidad: '20', moneda: 'mo' } },
      materiales: { [RECURSO.piedra]: 9999 },
      diasTotales: 30,
      efecto: { tipo: 'crearDefensa', tipoId: idDeOpcion('tiposDefensa', 'Muralla') },
    }
    const { estado, id } = crearObra(documento, datos, futuro, sello(), catalogo)
    const o = obra(estado, id)
    expect(o.estado).toBe('programada')
    expect(o.inicio).toEqual(futuro)
    const gasto = estado.movimientos.find((m) => m.id === o.movimientoId)!
    expect(gasto.programado).toBe(true)
    expect(gasto.importe.base).toBe(-2000000)
  })
})

describe('empezarObra', () => {
  it('«Empezar obra» de la cervecería el 12 de abril: madera 360, piedra 150, gasto de 4.500.000 mh (O13)', () => {
    const documento = ejemplo()
    const estado = empezarObra(documento, OBRA.cerveceria, HOY, sello(), catalogo)
    expect(existencia(estado, DOM.bree, RECURSO.madera)).toBe(360)
    expect(existencia(estado, DOM.bree, RECURSO.piedra)).toBe(150)
    const o = obra(estado, OBRA.cerveceria)
    const gasto = estado.movimientos.find((m) => m.id === o.movimientoId)!
    expect(gasto.importe.base).toBe(-4500000)
    expect(gasto.concepto).toBe('Obra: ampliar la cervecería')
    expect(o.estado).toBe('enCurso')
  })

  it('con el 20 de abril, la cervecería queda programada con su gasto programado (O13)', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const estado = empezarObra(documento, OBRA.cerveceria, futuro, sello(), catalogo)
    const o = obra(estado, OBRA.cerveceria)
    expect(o.estado).toBe('programada')
    expect(estado.movimientos.find((m) => m.id === o.movimientoId)!.programado).toBe(true)
    // No se tocan los materiales todavía.
    expect(existencia(estado, DOM.bree, RECURSO.madera)).toBe(420)
  })

  it('«Esta obra ya ha empezado» si ya está en curso o terminada', () => {
    const documento = ejemplo()
    expect(() => empezarObra(documento, OBRA.granero, HOY, sello(), catalogo)).toThrow('Esta obra ya ha empezado')
  })
})

describe('planificarObra', () => {
  it('«Guardar como planificada» quita inicio y su gasto programado', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const programada = empezarObra(documento, OBRA.cerveceria, futuro, sello(), catalogo)
    const movimientoId = obra(programada, OBRA.cerveceria).movimientoId!
    const estado = planificarObra(programada, OBRA.cerveceria, sello())
    const o = obra(estado, OBRA.cerveceria)
    expect(o.estado).toBe('planificada')
    expect(o.inicio).toBeUndefined()
    expect(o.movimientoId).toBeUndefined()
    expect(estado.movimientos.some((m) => m.id === movimientoId)).toBe(false)
  })
})

describe('editarObra', () => {
  it('planificada cambia entera', () => {
    const documento = ejemplo()
    const datos: Omit<DatosObra, 'dominioId'> = {
      nombre: 'Ampliar la cervecería (revisado)',
      coste: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
      materiales: { [RECURSO.madera]: 70, [RECURSO.piedra]: 35 },
      diasTotales: 25,
      efecto: { tipo: 'mejorarEdificio' as const, objetivoId: EDIFICIO.cerveceria },
    }
    const estado = editarObra(documento, OBRA.cerveceria, datos, sello(), catalogo)
    expect(obra(estado, OBRA.cerveceria).nombre).toBe('Ampliar la cervecería (revisado)')
    expect(obra(estado, OBRA.cerveceria).diasTotales).toBe(25)
  })

  it('programada cambia entera, incluidos los materiales', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const programada = empezarObra(documento, OBRA.cerveceria, futuro, sello(), catalogo)
    const datos: Omit<DatosObra, 'dominioId'> = {
      nombre: 'Ampliar la cervecería',
      coste: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
      materiales: { [RECURSO.madera]: 80, [RECURSO.piedra]: 40 },
      diasTotales: 22,
      efecto: { tipo: 'mejorarEdificio' as const, objetivoId: EDIFICIO.cerveceria },
    }
    const estado = editarObra(programada, OBRA.cerveceria, datos, sello(), catalogo)
    const o = obra(estado, OBRA.cerveceria)
    expect(o.materiales).toEqual({ [RECURSO.madera]: 80, [RECURSO.piedra]: 40 })
    expect(estado.movimientos.find((m) => m.id === o.movimientoId)!.importe.base).toBe(-5000000)
  })

  it('en curso: nombre, duración, resultado y coste cambian; los materiales no', () => {
    const documento = ejemplo()
    const datos: Omit<DatosObra, 'dominioId'> = {
      nombre: 'Nuevo granero (más grande)',
      coste: { base: 9000000, introducido: { cantidad: '90', moneda: 'mo' } },
      materiales: { [RECURSO.madera]: 120, [RECURSO.piedra]: 60 },
      diasTotales: 45,
      efecto: { tipo: 'ampliarAlmacen' as const, recursoId: RECURSO.viveres, valor: 900 },
    }
    const estado = editarObra(documento, OBRA.granero, datos, sello(), catalogo)
    const o = obra(estado, OBRA.granero)
    expect(o.nombre).toBe('Nuevo granero (más grande)')
    expect(o.diasTotales).toBe(45)
    expect((o.efecto as { valor: number }).valor).toBe(900)
    const gasto = estado.movimientos.find((m) => m.id === o.movimientoId)!
    expect(gasto.importe.base).toBe(-9000000)
  })

  it('en curso: cambiar los materiales lanza «En una obra en curso solo cambian el nombre, la duración, el resultado y el coste»', () => {
    const documento = ejemplo()
    const datos: Omit<DatosObra, 'dominioId'> = {
      nombre: obra(documento, OBRA.granero).nombre,
      coste: obra(documento, OBRA.granero).coste,
      materiales: { [RECURSO.madera]: 999 },
      diasTotales: obra(documento, OBRA.granero).diasTotales,
      efecto: obra(documento, OBRA.granero).efecto,
    }
    expect(() => editarObra(documento, OBRA.granero, datos, sello(), catalogo)).toThrow(
      'En una obra en curso solo cambian el nombre, la duración, el resultado y el coste',
    )
  })

  it('terminada: solo el nombre y el coste cambian', () => {
    const documento = ejemplo()
    const terminada = { ...obra(documento, OBRA.puerta), estado: 'terminada' as const }
    const conTerminada: DocumentoPartida = { ...documento, obras: documento.obras.map((o) => (o.id === terminada.id ? terminada : o)) }
    const datos: Omit<DatosObra, 'dominioId'> = {
      nombre: 'Puerta del sur (reparada)',
      coste: { base: 3200000, introducido: { cantidad: '32', moneda: 'mo' } },
      materiales: terminada.materiales,
      diasTotales: terminada.diasTotales,
      efecto: terminada.efecto,
    }
    const estado = editarObra(conTerminada, OBRA.puerta, datos, sello(), catalogo)
    const o = obra(estado, OBRA.puerta)
    expect(o.nombre).toBe('Puerta del sur (reparada)')
    const gasto = estado.movimientos.find((m) => m.id === o.movimientoId)!
    expect(gasto.importe.base).toBe(-3200000)
  })

  it('terminada: cambiar la duración lanza «En una obra terminada solo cambian el nombre y el coste»', () => {
    const documento = ejemplo()
    const terminada = { ...obra(documento, OBRA.puerta), estado: 'terminada' as const }
    const conTerminada: DocumentoPartida = { ...documento, obras: documento.obras.map((o) => (o.id === terminada.id ? terminada : o)) }
    const datos: Omit<DatosObra, 'dominioId'> = {
      nombre: terminada.nombre,
      coste: terminada.coste,
      materiales: terminada.materiales,
      diasTotales: terminada.diasTotales + 1,
      efecto: terminada.efecto,
    }
    expect(() => editarObra(conTerminada, OBRA.puerta, datos, sello(), catalogo)).toThrow(
      'En una obra terminada solo cambian el nombre y el coste',
    )
  })
})

describe('eliminarObra', () => {
  it('programada: se borra con su movimiento programado', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const programada = empezarObra(documento, OBRA.cerveceria, futuro, sello(), catalogo)
    const movimientoId = obra(programada, OBRA.cerveceria).movimientoId!
    const estado = eliminarObra(programada, OBRA.cerveceria, { devolverCoste: false, devolverMateriales: false }, catalogo)
    expect(estado.obras.some((o) => o.id === OBRA.cerveceria)).toBe(false)
    expect(estado.movimientos.some((m) => m.id === movimientoId)).toBe(false)
  })

  it('en curso sin marcar ninguna casilla: el gasto se queda suelto y los materiales no vuelven', () => {
    const documento = ejemplo()
    const estado = eliminarObra(documento, OBRA.granero, { devolverCoste: false, devolverMateriales: false }, catalogo)
    const gasto = estado.movimientos.find((m) => m.id === MOV_BREE.obraGranero)!
    expect(gasto.vinculo).toBeUndefined()
    expect(existencia(estado, DOM.bree, RECURSO.madera)).toBe(420)
  })

  it('en curso con las dos casillas: madera 540, piedra 240 y sin el gasto de 85 mo (O13)', () => {
    const documento = ejemplo()
    const estado = eliminarObra(documento, OBRA.granero, { devolverCoste: true, devolverMateriales: true }, catalogo)
    expect(existencia(estado, DOM.bree, RECURSO.madera)).toBe(540)
    expect(existencia(estado, DOM.bree, RECURSO.piedra)).toBe(240)
    expect(estado.movimientos.some((m) => m.id === MOV_BREE.obraGranero)).toBe(false)
  })

  it('devolver materiales que no caben: «Caben 10 haces más» con la madera en 590', () => {
    const documento = ejemplo()
    const conMaderaCasiLlena: DocumentoPartida = {
      ...documento,
      existencias: documento.existencias.map((e) => (e.dominioId === DOM.bree && e.recursoId === RECURSO.madera ? { ...e, cantidad: 590 } : e)),
    }
    expect(() => eliminarObra(conMaderaCasiLlena, OBRA.granero, { devolverCoste: false, devolverMateriales: true }, catalogo)).toThrow(
      'Caben 10 haces más',
    )
  })

  it('terminada: el gasto se queda sin vínculo y el efecto no se deshace', () => {
    const documento = ejemplo()
    const terminada = { ...obra(documento, OBRA.puerta), estado: 'terminada' as const }
    const conTerminada: DocumentoPartida = { ...documento, obras: documento.obras.map((o) => (o.id === terminada.id ? terminada : o)) }
    const estado = eliminarObra(conTerminada, OBRA.puerta, { devolverCoste: false, devolverMateriales: false }, catalogo)
    expect(estado.obras.some((o) => o.id === OBRA.puerta)).toBe(false)
    const gasto = estado.movimientos.find((m) => m.id === MOV_BREE.obraPuerta)!
    expect(gasto.vinculo).toBeUndefined()
  })
})
```

Son **20 pruebas**: 5 de `crearObra`, 3 de `empezarObra`, 1 de `planificarObra`, 6 de `editarObra` y 5 de `eliminarObra`.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/edicion/obras.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./obras`, que todavía no existe. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/edicion/obras.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/edicion/obras.test.ts [ src/dominio/edicion/obras.test.ts ]
Error: Cannot find module './obras' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/edicion/obras.test.ts
 ❯ src/dominio/edicion/obras.test.ts:12:1
     10| import { congelar } from '../motor/pruebas/constructores'
     11| import type { Sello } from './registros'
     12| import {
       | ^
     13|   crearObra,
     14|   editarObra,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  20:20:08
   Duration  1.20s (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `obras.ts`**

Crea `src/dominio/edicion/obras.ts` con este contenido:

```ts
import { compararFechas, type Fecha } from '../calendario/fecha'
import { cabenMas, textoCaben, TOLERANCIA, type RecursoConNombre } from '../almacen/cantidades'
import { CATEGORIA } from '../catalogo/inicial'
import type { Importe } from '../dinero/importe'
import type { EfectoObra, Obra } from '../modelo/asentamiento'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Existencia } from '../modelo/almacen'
import type { Movimiento } from '../modelo/movimientos'
import { conceptoObra, recursoDelCatalogo, textoFaltan } from '../motor/textos'
import { asegurarFila } from './existencias'
import { buscarPorId, mismoRegistro, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide el formulario «Obra» (§6.4). */
export interface DatosObra {
  dominioId: Id
  nombre: string
  coste: Importe
  materiales: Record<Id, number>
  diasTotales: number
  efecto: EfectoObra
}

/** La fila del almacén, si existe. */
function filaExistencia(estado: EstadoPartida, dominioId: Id, recursoId: Id): Existencia | undefined {
  return estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
}

/** Asegura las filas de los materiales y, si el efecto amplía el almacén, la de su recurso (D-056). */
function asegurarFilasDeObra<E extends EstadoPartida>(estado: E, dominioId: Id, datos: Pick<DatosObra, 'materiales' | 'efecto'>): E {
  let nuevo = Object.keys(datos.materiales).reduce((acc, recursoId) => asegurarFila(acc, dominioId, recursoId), estado)
  if (datos.efecto.tipo === 'ampliarAlmacen') {
    nuevo = asegurarFila(nuevo, dominioId, datos.efecto.recursoId)
  }
  return nuevo
}

/** Los materiales que faltan para empezar, con su cantidad y su recurso del catálogo. */
function materialesQueFaltan(
  estado: EstadoPartida,
  dominioId: Id,
  materiales: Record<Id, number>,
  catalogo: CatalogosEnCopia,
): { cantidad: number; recurso: RecursoConNombre }[] {
  const faltas: { cantidad: number; recurso: RecursoConNombre }[] = []
  for (const [recursoId, cantidad] of Object.entries(materiales)) {
    const disponible = filaExistencia(estado, dominioId, recursoId)?.cantidad ?? 0
    const falta = cantidad - disponible
    if (falta > TOLERANCIA) {
      faltas.push({ cantidad: falta, recurso: recursoDelCatalogo(catalogo, recursoId) })
    }
  }
  return faltas
}

/** Saca los materiales del almacén (las filas ya están aseguradas). */
function sacarMateriales<E extends EstadoPartida>(estado: E, dominioId: Id, materiales: Record<Id, number>): E {
  return Object.entries(materiales).reduce(
    (acc, [recursoId, cantidad]) => ({
      ...acc,
      existencias: acc.existencias.map((e) =>
        e.dominioId === dominioId && e.recursoId === recursoId ? { ...e, cantidad: e.cantidad - cantidad } : e,
      ),
    }),
    estado,
  )
}

/** «Caben 10 haces más» si algún material no cabe entero al devolverlo (D-058); null si todos caben. */
function bloqueoAlDevolverMateriales(
  estado: EstadoPartida,
  dominioId: Id,
  materiales: Record<Id, number>,
  catalogo: CatalogosEnCopia,
): string | null {
  for (const [recursoId, cantidad] of Object.entries(materiales)) {
    const fila = filaExistencia(estado, dominioId, recursoId)
    if (fila?.capacidad === undefined) {
      continue
    }
    if (fila.cantidad + cantidad > fila.capacidad + TOLERANCIA) {
      return textoCaben(cabenMas(fila) ?? 0, recursoDelCatalogo(catalogo, recursoId))
    }
  }
  return null
}

/** Suma los materiales de vuelta a sus filas. */
function devolverMateriales<E extends EstadoPartida>(estado: E, dominioId: Id, materiales: Record<Id, number>): E {
  return Object.entries(materiales).reduce(
    (acc, [recursoId, cantidad]) => ({
      ...acc,
      existencias: acc.existencias.map((e) =>
        e.dominioId === dominioId && e.recursoId === recursoId ? { ...e, cantidad: e.cantidad + cantidad } : e,
      ),
    }),
    estado,
  )
}

/** El importe con el signo del gasto, conservando lo tecleado si lo había. */
function importeDelGasto(coste: Importe): Importe {
  return coste.introducido === undefined ? { base: -coste.base } : { base: -coste.base, introducido: coste.introducido }
}

/** El gasto de una obra (§3.14): concepto, categoría y vínculo fijos. */
function gastoDeObra(movimientoId: Id, obraId: Id, dominioId: Id, fecha: Fecha, coste: Importe, nombre: string, programado: boolean): Movimiento {
  return {
    id: movimientoId,
    dominioId,
    fecha,
    tipo: 'gasto',
    importe: importeDelGasto(coste),
    categoriaId: CATEGORIA.obras,
    concepto: conceptoObra(nombre),
    origen: 'manual',
    vinculo: { tipo: 'obra', id: obraId },
    programado,
  }
}

function quitarMovimiento<E extends EstadoPartida>(estado: E, movimientoId: Id): E {
  return { ...estado, movimientos: estado.movimientos.filter((m) => m.id !== movimientoId) }
}

/** Deja el movimiento sin vínculo, como un gasto suelto. */
function soltarVinculo<E extends EstadoPartida>(estado: E, movimientoId: Id): E {
  return {
    ...estado,
    movimientos: estado.movimientos.map((m) => {
      if (m.id !== movimientoId) {
        return m
      }
      const { vinculo: _vinculo, ...resto } = m
      return resto
    }),
  }
}

/** Corrige el importe (y, solo en una programada, el concepto) del movimiento de la obra. */
function corregirGastoDeObra<E extends EstadoPartida>(
  estado: E,
  movimientoId: Id,
  coste: Importe,
  nombre: string,
  rehacerConcepto: boolean,
): E {
  return {
    ...estado,
    movimientos: estado.movimientos.map((m) =>
      m.id === movimientoId
        ? { ...m, importe: importeDelGasto(coste), concepto: rehacerConcepto ? conceptoObra(nombre) : m.concepto }
        : m,
    ),
  }
}

/** Sin inicio: planificada. Con inicio: como empezarObra. Asegura las filas de materiales y de ampliarAlmacen. */
export function crearObra<E extends EstadoPartida>(
  estado: E,
  datos: DatosObra,
  inicio: Fecha | undefined,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): Creado<E> {
  const conFilas = asegurarFilasDeObra(estado, datos.dominioId, datos)
  const id = sello.nuevoId()
  const obra: Obra = {
    id,
    dominioId: datos.dominioId,
    nombre: datos.nombre,
    estado: 'planificada',
    coste: datos.coste,
    materiales: datos.materiales,
    diasTotales: datos.diasTotales,
    efecto: datos.efecto,
  }
  const conObra: E = { ...conFilas, obras: [...conFilas.obras, obra] }
  if (inicio === undefined) {
    return { estado: conObra, id }
  }
  return { estado: empezarObra(conObra, id, inicio, sello, catalogo), id }
}

/**
 * «Empezar obra» de una planificada o programada (una programada rehace su programado). inicio > hoy: programada,
 * con su gasto programado si coste > 0. inicio ≤ hoy: exige los materiales, los saca y crea su gasto; la caja
 * puede quedar en negativo. Otra obra → «Esta obra ya ha empezado».
 */
export function empezarObra<E extends EstadoPartida>(
  estado: E,
  id: Id,
  inicio: Fecha,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): E {
  const obra = buscarPorId(estado.obras, id)
  if (obra.estado === 'enCurso' || obra.estado === 'terminada') {
    throw new Error('Esta obra ya ha empezado')
  }
  const sinProgramado = obra.movimientoId === undefined ? estado : quitarMovimiento(estado, obra.movimientoId)
  const hoy = sinProgramado.partida.fechaActual

  if (compararFechas(inicio, hoy) > 0) {
    let nuevoEstado: E = sinProgramado
    let obraNueva: Obra = {
      id: obra.id,
      dominioId: obra.dominioId,
      nombre: obra.nombre,
      estado: 'programada',
      coste: obra.coste,
      materiales: obra.materiales,
      inicio,
      diasTotales: obra.diasTotales,
      efecto: obra.efecto,
    }
    if (obra.coste.base > 0) {
      const movimientoId = sello.nuevoId()
      const gasto = gastoDeObra(movimientoId, obra.id, obra.dominioId, inicio, obra.coste, obra.nombre, true)
      nuevoEstado = { ...nuevoEstado, movimientos: [...nuevoEstado.movimientos, gasto] }
      obraNueva = { ...obraNueva, movimientoId }
    }
    const obras = reemplazarPorId(nuevoEstado.obras, obraNueva, sello.ahora)
    return { ...nuevoEstado, obras }
  }

  const faltas = materialesQueFaltan(sinProgramado, obra.dominioId, obra.materiales, catalogo)
  if (faltas.length > 0) {
    throw new Error(textoFaltan(faltas))
  }
  let nuevoEstado = sacarMateriales(sinProgramado, obra.dominioId, obra.materiales)
  let obraNueva: Obra = {
    id: obra.id,
    dominioId: obra.dominioId,
    nombre: obra.nombre,
    estado: 'enCurso',
    coste: obra.coste,
    materiales: obra.materiales,
    inicio,
    diasTotales: obra.diasTotales,
    efecto: obra.efecto,
  }
  if (obra.coste.base > 0) {
    const movimientoId = sello.nuevoId()
    const gasto = gastoDeObra(movimientoId, obra.id, obra.dominioId, inicio, obra.coste, obra.nombre, false)
    nuevoEstado = { ...nuevoEstado, movimientos: [...nuevoEstado.movimientos, gasto] }
    obraNueva = { ...obraNueva, movimientoId }
  }
  const obras = reemplazarPorId(nuevoEstado.obras, obraNueva, sello.ahora)
  return { ...nuevoEstado, obras }
}

/** «Guardar como planificada» de una programada: quita inicio y su gasto programado. */
export function planificarObra<E extends EstadoPartida>(estado: E, id: Id, sello: Sello): E {
  const obra = buscarPorId(estado.obras, id)
  const sinProgramado = obra.movimientoId === undefined ? estado : quitarMovimiento(estado, obra.movimientoId)
  const obraNueva: Obra = {
    id: obra.id,
    dominioId: obra.dominioId,
    nombre: obra.nombre,
    estado: 'planificada',
    coste: obra.coste,
    materiales: obra.materiales,
    diasTotales: obra.diasTotales,
    efecto: obra.efecto,
  }
  const obras = reemplazarPorId(sinProgramado.obras, obraNueva, sello.ahora)
  return { ...sinProgramado, obras }
}

/**
 * D-065: planificada y programada cambian entera; en curso y terminada, solo lo pendiente; el coste corrige su gasto.
 * `_catalogo` se recibe por la misma firma que crearObra, empezarObra y eliminarObra (TC17), aunque editarObra no
 * necesita nombrar ningún recurso: los mensajes de «solo cambia…» son fijos (huecos, tarea 25).
 */
export function editarObra<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: Omit<DatosObra, 'dominioId'>,
  sello: Sello,
  _catalogo: CatalogosEnCopia,
): E {
  const obra = buscarPorId(estado.obras, id)

  if (obra.estado === 'planificada') {
    const conFilas = asegurarFilasDeObra(estado, obra.dominioId, datos)
    const obraNueva: Obra = {
      id: obra.id,
      dominioId: obra.dominioId,
      nombre: datos.nombre,
      estado: 'planificada',
      coste: datos.coste,
      materiales: datos.materiales,
      diasTotales: datos.diasTotales,
      efecto: datos.efecto,
    }
    const obras = reemplazarPorId(conFilas.obras, obraNueva, sello.ahora)
    return obras === conFilas.obras ? conFilas : { ...conFilas, obras }
  }

  if (obra.estado === 'programada') {
    const conFilas = asegurarFilasDeObra(estado, obra.dominioId, datos)
    let nuevoEstado = conFilas
    let movimientoId = obra.movimientoId
    if (movimientoId !== undefined) {
      nuevoEstado = corregirGastoDeObra(nuevoEstado, movimientoId, datos.coste, datos.nombre, true)
    } else if (datos.coste.base > 0) {
      movimientoId = sello.nuevoId()
      const gasto = gastoDeObra(
        movimientoId,
        obra.id,
        obra.dominioId,
        obra.inicio ?? nuevoEstado.partida.fechaActual,
        datos.coste,
        datos.nombre,
        true,
      )
      nuevoEstado = { ...nuevoEstado, movimientos: [...nuevoEstado.movimientos, gasto] }
    }
    const obraNueva: Obra = {
      id: obra.id,
      dominioId: obra.dominioId,
      nombre: datos.nombre,
      estado: 'programada',
      coste: datos.coste,
      materiales: datos.materiales,
      inicio: obra.inicio,
      diasTotales: datos.diasTotales,
      efecto: datos.efecto,
      ...(movimientoId === undefined ? {} : { movimientoId }),
    }
    const obras = reemplazarPorId(nuevoEstado.obras, obraNueva, sello.ahora)
    return obras === nuevoEstado.obras ? nuevoEstado : { ...nuevoEstado, obras }
  }

  if (obra.estado === 'enCurso') {
    if (!mismoRegistro(datos.materiales, obra.materiales)) {
      throw new Error('En una obra en curso solo cambian el nombre, la duración, el resultado y el coste')
    }
    let nuevoEstado: E = estado
    if (obra.movimientoId !== undefined) {
      nuevoEstado = corregirGastoDeObra(nuevoEstado, obra.movimientoId, datos.coste, datos.nombre, false)
    }
    if (datos.efecto.tipo === 'ampliarAlmacen') {
      nuevoEstado = asegurarFila(nuevoEstado, obra.dominioId, datos.efecto.recursoId)
    }
    const obraNueva: Obra = {
      id: obra.id,
      dominioId: obra.dominioId,
      nombre: datos.nombre,
      estado: 'enCurso',
      coste: datos.coste,
      materiales: obra.materiales,
      inicio: obra.inicio,
      diasTotales: datos.diasTotales,
      efecto: datos.efecto,
      ...(obra.movimientoId === undefined ? {} : { movimientoId: obra.movimientoId }),
    }
    const obras = reemplazarPorId(nuevoEstado.obras, obraNueva, sello.ahora)
    return obras === nuevoEstado.obras ? nuevoEstado : { ...nuevoEstado, obras }
  }

  // terminada: solo el nombre y el coste.
  if (
    datos.diasTotales !== obra.diasTotales ||
    !mismoRegistro(datos.efecto, obra.efecto) ||
    !mismoRegistro(datos.materiales, obra.materiales)
  ) {
    throw new Error('En una obra terminada solo cambian el nombre y el coste')
  }
  let nuevoEstado: E = estado
  if (obra.movimientoId !== undefined) {
    nuevoEstado = corregirGastoDeObra(nuevoEstado, obra.movimientoId, datos.coste, datos.nombre, false)
  }
  const obraNueva: Obra = {
    id: obra.id,
    dominioId: obra.dominioId,
    nombre: datos.nombre,
    estado: 'terminada',
    coste: datos.coste,
    materiales: obra.materiales,
    inicio: obra.inicio,
    diasTotales: obra.diasTotales,
    efecto: obra.efecto,
    ...(obra.movimientoId === undefined ? {} : { movimientoId: obra.movimientoId }),
  }
  const obras = reemplazarPorId(nuevoEstado.obras, obraNueva, sello.ahora)
  return obras === nuevoEstado.obras ? nuevoEstado : { ...nuevoEstado, obras }
}

/** Lo que se hace con el coste y los materiales al eliminar una obra en curso. */
export interface OpcionesAlEliminarObra {
  devolverCoste: boolean
  devolverMateriales: boolean
}

/** §6.4 y D-058, D-059: cada estado de la obra se deshace de una forma distinta. */
export function eliminarObra<E extends EstadoPartida>(
  estado: E,
  id: Id,
  opciones: OpcionesAlEliminarObra,
  catalogo: CatalogosEnCopia,
): E {
  const obra = buscarPorId(estado.obras, id)
  let nuevoEstado: E = estado

  if (obra.estado === 'programada' && obra.movimientoId !== undefined) {
    nuevoEstado = quitarMovimiento(nuevoEstado, obra.movimientoId)
  } else if (obra.estado === 'enCurso') {
    if (opciones.devolverMateriales) {
      const bloqueo = bloqueoAlDevolverMateriales(nuevoEstado, obra.dominioId, obra.materiales, catalogo)
      if (bloqueo !== null) {
        throw new Error(bloqueo)
      }
      nuevoEstado = devolverMateriales(nuevoEstado, obra.dominioId, obra.materiales)
    }
    if (obra.movimientoId !== undefined) {
      nuevoEstado = opciones.devolverCoste
        ? quitarMovimiento(nuevoEstado, obra.movimientoId)
        : soltarVinculo(nuevoEstado, obra.movimientoId)
    }
  } else if (obra.estado === 'terminada' && obra.movimientoId !== undefined) {
    nuevoEstado = soltarVinculo(nuevoEstado, obra.movimientoId)
  }

  return { ...nuevoEstado, obras: quitarPorId(nuevoEstado.obras, id) }
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/edicion/obras.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  20 passed (20)
   Start at  20:12:01
   Duration  805ms (transform 57%, import 36%, tests 6%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **1.206 pruebas en 97 archivos**. La tarea 24 dejó, en la cadena real de este plan, 1.186 pruebas en 96 archivos (ver «Huecos» de la tarea 24), y esta tarea trae **20 nuevas** (las 20 de `obras.test.ts`).

```text
 Test Files  97 passed (97)
      Tests  1206 passed (1206)
```

Si el número que ves no es 1.206, sigue con **el tuyo**: lo que esta tarea garantiza es **+20 pruebas y +1 archivo** sobre lo que dejó la tarea 24. El número de archivos sí es exactamente 97.

- [ ] **Paso 6: Comprobar el estilo**

```bash
npm run lint
```

Salida esperada: sin avisos.

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/edicion/obras.ts src/dominio/edicion/obras.test.ts
git commit -m "feat(edicion): crear, empezar, editar y borrar obras" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
warning: in the working copy of 'src/dominio/edicion/obras.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/edicion/obras.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-4 c3d4e5f] feat(edicion): crear, empezar, editar y borrar obras
 2 files changed, 623 insertions(+)
 create mode 100644 src/dominio/edicion/obras.test.ts
 create mode 100644 src/dominio/edicion/obras.ts
```

---

## Huecos resueltos en esta tarea (grupo 6)

- **Cuándo lanza `editarObra` en «en curso» y en «terminada»**: el contrato fija qué campos se pueden cambiar en cada estado (D-065) y los dos mensajes de error (D-067), pero no dice qué dispara cada mensaje. Se ha resuelto así, con `mismoRegistro` (la comparación a fondo que ya usa `edicion/registros.ts`, ignorando `editadoEl`): en `enCurso`, si `datos.materiales` no es igual a los materiales que ya tenía la obra, se lanza «En una obra en curso solo cambian…»; el nombre, la duración (`diasTotales`), el resultado (`efecto`) y el coste se aplican sin más, porque D-065 los da como los campos permitidos. En `terminada`, si `diasTotales`, `efecto` o `materiales` no son iguales a los que ya tenía, se lanza «En una obra terminada solo cambian…»; solo se aplican el nombre y el coste. Si `datos.efecto` cambia a `ampliarAlmacen` con un recurso sin fila en el almacén de ese asentamiento estando la obra `enCurso` (el «resultado» sí se puede tocar ahí), se asegura su fila con `asegurarFila`, igual que hace `crearObra`/`editarObra` (planificada/programada) con `asegurarFilasDeObra` (D-056).
- **Una versión anterior de este módulo tenía un error aquí**: antes de esta tarea, el borrador de `obras.ts` lanzaba el mensaje «En una obra en curso solo cambian…» dentro de la rama `programada` (con una condición que además comparaba `obra.materiales === datos.materiales` por referencia, que casi nunca es cierto), en vez de dejar que una `programada` cambiara entera como manda D-065. Los pasos de esta tarea ya traen la versión corregida: la rama `programada` no comprueba nada y reemplaza la obra entera; la prueba «programada cambia entera, incluidos los materiales» lo cubre.
- **`_catalogo` sin usar en `editarObra`**: el contrato (§3.14) da la firma exacta de `editarObra` con `catalogo: CatalogosEnCopia` como su último parámetro, a la par que `crearObra`, `empezarObra` y `eliminarObra` (que sí lo necesitan, para nombrar recursos en `textoFaltan` y en `textoCaben`). Con la resolución más simple de arriba, `editarObra` no llega a nombrar ningún recurso (sus dos mensajes son fijos), así que el parámetro no se usa; con `noUnusedParameters` activado (`tsconfig.app.json`), TypeScript no compila un parámetro nombrado y sin usar. Se ha resuelto anteponiéndole un guion bajo (`_catalogo`), la convención habitual de TypeScript para «este parámetro es parte de la firma pública pero esta implementación no lo necesita»; no cambia la posición del argumento, así que ninguna llamada futura (fases 6 y 8) se ve afectada.
- **Recuento real, no la estimación del contrato**: verificado en un clon aislado, esta tarea añade exactamente **20 pruebas y 1 archivo** sobre el final de la tarea 24. El contrato estimaba 16 pruebas sobre una base estimada de 1.135/96 (§8: «25 | … | 16 | 1151 | 97»); en la cadena real de este plan la base es **1.186/96** y el total correcto desde aquí es **1.206 en 97 archivos**. La diferencia viene de que el contrato agrupaba en menos casos lo que aquí son pruebas sueltas por estado de la obra (`editarObra` tiene 6 en vez de 4, `eliminarObra` tiene 5). Arrástralo a las tareas 26, 27 y 28.

---

### Tarea 26 · Caravanas: crear, editar y borrar (20)

Esta tarea escribe `src/dominio/edicion/caravanas.ts` entero: `crearCaravana`, `editarCaravana` y `eliminarCaravana`. Depende de la tarea 6 (`almacen/progreso.ts`, de donde importa `vueltaDeCaravana`), de la tarea 21 (`edicion/existencias.ts`, de donde importa `asegurarFila`) y de la tarea 24 (`edicion/mercados.ts`, de donde importa `diasDeViaje`). También usa `almacen/cantidades.ts` de la tarea 3 (`formatearCantidad`), `motor/textos.ts` de la tarea 7 (`conceptoCompraCaravana`, `conceptoVentaCaravana`, `recursoDelCatalogo`), `avisos/dinero.ts` de la fase 3 (`dominioDe`, para nombrar el asentamiento de origen y de destino en el mensaje de ruta que falta) y `edicion/registros.ts` (fase 3, tarea 13).

**Reglas de la especificación que implementa:**

- **Contrato de la fase 4, §3.14** (`edicion/caravanas.ts` [T26]): «`crearCaravana`: A10b (§7 l.1151-1159): días de la ruta (0 en el mercado local; si no hay ruta, lanza), vuelta con `vueltaDeCaravana`, importe = `redondearMitadArriba(precio × cantidad)` sin introducido (TC19). Asegura la fila de origen y, en un traslado, la de destino. salida > hoy: programada (compra: gasto programado). salida ≤ hoy: compra paga y sale; venta y traslado sacan la carga (bloqueo si no llega); venta en el mercado local cobra al momento y queda terminada.» · «`editarCaravana`: D-065: programada, se rehace entera con el mismo id; en ruta o terminada solo cambia el precio, que corrige su movimiento.» · «`eliminarCaravana`: §6.4 l.787-788 y D-058, D-059: programada con su programado; en ruta, `devolver` devuelve pago o carga; terminada, movimientos sin vínculo. Las entradas con su `caravanaId` la pierden.»
- **El párrafo que sigue a los tipos, §3.14**: «Movimientos de una caravana: pago de compra `{ fecha: salida, tipo: 'gasto', importe: { base: −importe }, categoriaId: D-011 [Comercio], concepto: conceptoCompraCaravana(recurso, mercado), origen: 'manual', vinculo: { tipo: 'caravana', id }, programado: salida > hoy }` en `movimientoSalidaId`; cobro de una venta local `{ fecha: salida, tipo: 'ingreso', importe: { base: importe }, concepto: conceptoVentaCaravana(recurso, mercado), … }` en `movimientoVueltaId`. Una compra en el mercado local lanza «Las compras en el mercado local se anotan con «Añadir existencias»» (D-054).»
- **D-054**: «Una compra en el mercado local se anota con “Añadir existencias” o “Añadir víveres” (se paga y entra al momento) y no como caravana. Una compra en otro mercado se guarda solo como caravana, y se edita y se borra en Comercio.»
- **D-056**: «Al guardar algo que nombra un recurso que el almacén de ese asentamiento no tiene (una producción, un material o la ampliación de una obra, una compra, el destino de un traslado), su fila se crea con 0 y sin capacidad.»
- **D-058**: «Devolver los materiales o la carga al borrar una obra o una caravana […] se bloquean si las existencias pasarían de la capacidad (“Caben 12 sacos más”) o bajarían de 0.»
- **D-065**: «[…] En una caravana en ruta o terminada solo cambia el precio, que corrige su pago o su cobro. Una obra o caravana planificada o programada cambia entera.»
- **D-067** (mensajes literales): «La carga no puede superar las existencias: hay 90 barriles» · «Faltan los días de viaje de Bree a Cavada Grande» · «Las compras en el mercado local se anotan con «Añadir existencias»» · «En una caravana en ruta solo cambia el precio» · «En una caravana terminada solo cambia el precio».
- **TC17**: funciones puras `<E extends EstadoPartida>`, la misma referencia si nada cambia, `editadoEl = sello.ahora` solo en el registro que se edita, `Error` con el texto literal, `catalogo: CatalogosEnCopia` en las que nombran recursos.
- **TC19**: «Importes calculados (caravanas y compras): `redondearMitadArriba(precio.base × cantidad)` en mh, sin `introducido`.»
- **O9** y **O13**: «una caravana de 100 sacos a 0,28 mo en Cavada Grande (5 días) cuesta 28 mo, deja la caja en 312,6 mo y vuelve el 22 de abril» · «`crearCaravana` compra de 100 sacos en Fornost a 0,3 mo con salida hoy → vuelta 20 de abril, gasto de 3.000.000 mh «Caravana: compra de víveres en Fornost»; venta de 10 barriles de cerveza en Bree → cerveza 80, cobro de 400.000 mh «Caravana: venta de cerveza en Bree» en Comercio, terminada; venta de 100 barriles → «La carga no puede superar las existencias: hay 90 barriles». `eliminarCaravana(Tharbad, { devolver: true })` → sin el gasto de 75 mo.»

**Aviso importante sobre esta tarea**: el contrato deja tres decisiones técnicas sin fijar del todo, resueltas aquí (y repetidas al final, en «Huecos»): (1) cómo se comparan las fechas `Fecha` (nunca con `>`/`<` de JavaScript, que compara los objetos por referencia y no por valor: hay que usar `compararFechas`, de `calendario/fecha.ts`, la misma que usan `obras.ts` y `progreso.ts`); (2) qué mercado cuenta como «local» al calcular los días de viaje y el D-054 (el que tiene `localDe === dominioId` de la caravana, no cualquier mercado sin ruta); (3) cómo se recalcula el precio y el pago de una caravana `en ruta` o `terminada` (se corrige el movimiento existente, sin tocar ni la carga ni las fechas).

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/edicion/caravanas.ts`
- Prueba: `src/dominio/edicion/caravanas.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/edicion/caravanas.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { RECURSO } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { CARAVANA, DOM, MERCADO, MOV_BREE } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Mercado } from '../modelo/comercio'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import { guardarRuta } from './mercados'
import type { Sello } from './registros'
import { crearCaravana, editarCaravana, eliminarCaravana, type DatosCaravana } from './caravanas'

const AHORA: Instante = '2026-09-18T10:00:00.000Z'
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }
const catalogo = catalogosDeEjemplo()

function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

function existencia(documento: DocumentoPartida, dominioId: Id, recursoId: Id): number {
  return documento.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)?.cantidad ?? 0
}

function caravana(documento: DocumentoPartida, id: Id) {
  const c = documento.caravanas.find((x) => x.id === id)
  if (c === undefined) {
    throw new Error(`No está «${id}»`)
  }
  return c
}

const CAVADA_GRANDE: Mercado = { id: 'mer.cavada-grande', nombre: 'Cavada Grande', precios: [] }

describe('crearCaravana', () => {
  it('compra de 100 sacos en Fornost a 0,3 mo con salida hoy: vuelta el 20, gasto de 3.000.000 mh (O13)', () => {
    const documento = ejemplo()
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: MERCADO.fornost,
      carga: { recursoId: RECURSO.viveres, cantidad: 100 },
      precioUnidad: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
      salida: HOY,
    }
    const { estado, id } = crearCaravana(documento, datos, sello(), catalogo)
    const c = caravana(estado, id)
    expect(c.vuelta).toEqual({ anio: 1640, mes: 4, dia: 20 })
    expect(c.estado).toBe('enRuta')
    const gasto = estado.movimientos.find((m) => m.id === c.movimientoSalidaId)!
    expect(gasto.importe.base).toBe(-3000000)
    expect(gasto.concepto).toBe('Caravana: compra de víveres en Fornost')
  })

  it('venta de 10 barriles de cerveza en Bree (mercado local): cerveza 80, cobro de 400.000 mh, terminada (O13)', () => {
    const documento = ejemplo()
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'venta',
      mercadoId: MERCADO.bree,
      carga: { recursoId: RECURSO.cerveza, cantidad: 10 },
      precioUnidad: { base: 40000 },
      salida: HOY,
    }
    const { estado, id } = crearCaravana(documento, datos, sello(), catalogo)
    expect(existencia(estado, DOM.bree, RECURSO.cerveza)).toBe(80)
    const c = caravana(estado, id)
    expect(c.estado).toBe('terminada')
    expect(c.vuelta).toEqual(HOY)
    const cobro = estado.movimientos.find((m) => m.id === c.movimientoVueltaId)!
    expect(cobro.importe.base).toBe(400000)
    expect(cobro.concepto).toBe('Caravana: venta de cerveza en Bree')
    expect(cobro.categoriaId).toBe('cat.comercio')
  })

  it('vender 100 barriles → «La carga no puede superar las existencias: hay 90 barriles»', () => {
    const documento = ejemplo()
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'venta',
      mercadoId: MERCADO.bree,
      carga: { recursoId: RECURSO.cerveza, cantidad: 100 },
      precioUnidad: { base: 40000 },
      salida: HOY,
    }
    expect(() => crearCaravana(documento, datos, sello(), catalogo)).toThrow(
      'La carga no puede superar las existencias: hay 90 barriles',
    )
  })

  it('una caravana de 100 sacos a 0,28 mo en Cavada Grande (5 días) cuesta 28 mo, deja la caja en 312,6 mo y vuelve el 22 (O9)', () => {
    const documento = ejemplo()
    const conCavada: DocumentoPartida = { ...documento, mercados: [...documento.mercados, CAVADA_GRANDE] }
    const conRuta = guardarRuta(conCavada, DOM.bree, { tipo: 'mercado', id: CAVADA_GRANDE.id }, 5, sello())
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: CAVADA_GRANDE.id,
      carga: { recursoId: RECURSO.viveres, cantidad: 100 },
      precioUnidad: { base: 28000, introducido: { cantidad: '0,28', moneda: 'mo' } },
      salida: HOY,
    }
    const { estado, id } = crearCaravana(conRuta, datos, sello(), catalogo)
    expect(caravana(estado, id).vuelta).toEqual({ anio: 1640, mes: 4, dia: 22 })
    expect(saldosPorDominio(estado)[DOM.bree]).toBe(31260000)
  })

  it('con salida futura queda programada, con su gasto programado', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: MERCADO.fornost,
      carga: { recursoId: RECURSO.viveres, cantidad: 50 },
      precioUnidad: { base: 30000 },
      salida: futuro,
    }
    const { estado, id } = crearCaravana(documento, datos, sello(), catalogo)
    const c = caravana(estado, id)
    expect(c.estado).toBe('programada')
    expect(estado.movimientos.find((m) => m.id === c.movimientoSalidaId)!.programado).toBe(true)
    expect(existencia(estado, DOM.bree, RECURSO.viveres)).toBe(310)
  })

  it('una venta a un mercado con ruta queda en ruta (no cobra hasta volver)', () => {
    const documento = ejemplo()
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'venta',
      mercadoId: MERCADO.fornost,
      carga: { recursoId: RECURSO.piedra, cantidad: 20 },
      precioUnidad: { base: 15000 },
      salida: HOY,
    }
    const { estado, id } = crearCaravana(documento, datos, sello(), catalogo)
    const c = caravana(estado, id)
    expect(c.estado).toBe('enRuta')
    expect(c.movimientoVueltaId).toBeUndefined()
    expect(existencia(estado, DOM.bree, RECURSO.piedra)).toBe(160)
  })

  it('un traslado, con la ruta Bree–Archet guardada antes, crea la fila de destino y saca la carga de origen', () => {
    const documento = ejemplo()
    const conRuta = guardarRuta(documento, DOM.bree, { tipo: 'asentamiento', id: DOM.archet }, 6, sello())
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'traslado',
      destinoId: DOM.archet,
      carga: { recursoId: RECURSO.piedra, cantidad: 15 },
      salida: HOY,
    }
    const { estado, id } = crearCaravana(conRuta, datos, sello(), catalogo)
    const c = caravana(estado, id)
    expect(c.estado).toBe('enRuta')
    expect(c.vuelta).toEqual({ anio: 1640, mes: 4, dia: 18 })
    expect(existencia(estado, DOM.bree, RECURSO.piedra)).toBe(165)
    expect(estado.existencias.some((e) => e.dominioId === DOM.archet && e.recursoId === RECURSO.piedra)).toBe(true)
  })

  it('una compra en el mercado local lanza «Las compras en el mercado local se anotan con «Añadir existencias»» (D-054)', () => {
    const documento = ejemplo()
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: MERCADO.bree,
      carga: { recursoId: RECURSO.viveres, cantidad: 10 },
      precioUnidad: { base: 40000 },
      salida: HOY,
    }
    expect(() => crearCaravana(documento, datos, sello(), catalogo)).toThrow(
      'Las compras en el mercado local se anotan con «Añadir existencias»',
    )
  })

  it('sin ruta lanza «Faltan los días de viaje de Bree a Cavada Grande»', () => {
    const documento = ejemplo()
    const conCavada: DocumentoPartida = { ...documento, mercados: [...documento.mercados, CAVADA_GRANDE] }
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: CAVADA_GRANDE.id,
      carga: { recursoId: RECURSO.viveres, cantidad: 10 },
      precioUnidad: { base: 30000 },
      salida: HOY,
    }
    expect(() => crearCaravana(conCavada, datos, sello(), catalogo)).toThrow('Faltan los días de viaje de Bree a Cavada Grande')
  })
})

describe('editarCaravana', () => {
  it('programada: se rehace entera con el mismo id', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const { estado: conProgramada, id } = crearCaravana(
      documento,
      {
        dominioId: DOM.bree,
        operacion: 'compra',
        mercadoId: MERCADO.fornost,
        carga: { recursoId: RECURSO.viveres, cantidad: 50 },
        precioUnidad: { base: 30000 },
        salida: futuro,
      },
      sello(),
      catalogo,
    )
    const viejoMovimiento = caravana(conProgramada, id).movimientoSalidaId!
    const nuevos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: MERCADO.tharbad,
      carga: { recursoId: RECURSO.viveres, cantidad: 80 },
      precioUnidad: { base: 25000 },
      salida: futuro,
    }
    const estado = editarCaravana(conProgramada, id, nuevos, sello(), catalogo)
    const c = caravana(estado, id)
    expect(c.id).toBe(id)
    expect(c.mercadoId).toBe(MERCADO.tharbad)
    expect(c.carga.cantidad).toBe(80)
    expect(estado.movimientos.some((m) => m.id === viejoMovimiento)).toBe(false)
    expect(c.editadoEl).toBe(AHORA)
  })

  it('en ruta: solo cambia el precio, que corrige su pago', () => {
    const documento = ejemplo()
    const nuevoPrecio: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: MERCADO.tharbad,
      carga: { recursoId: RECURSO.viveres, cantidad: 300 },
      precioUnidad: { base: 27000, introducido: { cantidad: '0,27', moneda: 'mo' } },
      salida: caravana(documento, CARAVANA.compraViveresTharbad).salida,
    }
    const estado = editarCaravana(documento, CARAVANA.compraViveresTharbad, nuevoPrecio, sello(), catalogo)
    const c = caravana(estado, CARAVANA.compraViveresTharbad)
    expect(c.precioUnidad).toEqual({ base: 27000, introducido: { cantidad: '0,27', moneda: 'mo' } })
    expect(c.importe).toEqual({ base: 8100000 })
    const gasto = estado.movimientos.find((m) => m.id === MOV_BREE.caravanaTharbad)!
    expect(gasto.importe.base).toBe(-8100000)
  })

  it('en ruta: sin precio nuevo lanza «En una caravana en ruta solo cambia el precio»', () => {
    const documento = ejemplo()
    const datos: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'compra',
      mercadoId: MERCADO.tharbad,
      carga: { recursoId: RECURSO.viveres, cantidad: 300 },
      salida: caravana(documento, CARAVANA.compraViveresTharbad).salida,
    }
    expect(() => editarCaravana(documento, CARAVANA.compraViveresTharbad, datos, sello(), catalogo)).toThrow(
      'En una caravana en ruta solo cambia el precio',
    )
  })

  it('terminada: solo cambia el precio, que corrige su cobro', () => {
    const documento = ejemplo()
    const terminada = {
      ...caravana(documento, CARAVANA.ventaCervezaFornost),
      estado: 'terminada' as const,
      movimientoVueltaId: 'mov.cobro-fornost',
    }
    const conMovimiento: DocumentoPartida = {
      ...documento,
      caravanas: documento.caravanas.map((c) => (c.id === terminada.id ? terminada : c)),
      movimientos: [
        ...documento.movimientos,
        {
          id: 'mov.cobro-fornost',
          dominioId: DOM.bree,
          fecha: terminada.vuelta,
          tipo: 'ingreso' as const,
          importe: { base: 2400000 },
          categoriaId: 'cat.comercio',
          concepto: 'Caravana: venta de cerveza en Fornost',
          origen: 'manual' as const,
          vinculo: { tipo: 'caravana' as const, id: terminada.id },
          programado: false,
        },
      ],
    }
    const nuevoPrecio: DatosCaravana = {
      dominioId: DOM.bree,
      operacion: 'venta',
      mercadoId: MERCADO.fornost,
      carga: terminada.carga,
      precioUnidad: { base: 65000 },
      salida: terminada.salida,
    }
    const estado = editarCaravana(conMovimiento, terminada.id, nuevoPrecio, sello(), catalogo)
    const cobro = estado.movimientos.find((m) => m.id === 'mov.cobro-fornost')!
    expect(cobro.importe.base).toBe(2600000)
  })
})

describe('eliminarCaravana', () => {
  it('programada: se borra con su movimiento programado', () => {
    const documento = ejemplo()
    const futuro: Fecha = { anio: 1640, mes: 4, dia: 20 }
    const { estado: conProgramada, id } = crearCaravana(
      documento,
      {
        dominioId: DOM.bree,
        operacion: 'compra',
        mercadoId: MERCADO.fornost,
        carga: { recursoId: RECURSO.viveres, cantidad: 50 },
        precioUnidad: { base: 30000 },
        salida: futuro,
      },
      sello(),
      catalogo,
    )
    const movimientoId = caravana(conProgramada, id).movimientoSalidaId!
    const estado = eliminarCaravana(conProgramada, id, { devolver: false }, catalogo)
    expect(estado.caravanas.some((c) => c.id === id)).toBe(false)
    expect(estado.movimientos.some((m) => m.id === movimientoId)).toBe(false)
  })

  it('en ruta, compra, con devolver: true → sin el gasto de 75 mo (O13, Tharbad)', () => {
    const documento = ejemplo()
    const estado = eliminarCaravana(documento, CARAVANA.compraViveresTharbad, { devolver: true }, catalogo)
    expect(estado.movimientos.some((m) => m.id === MOV_BREE.caravanaTharbad)).toBe(false)
  })

  it('en ruta, compra, con devolver: false → el gasto se queda suelto', () => {
    const documento = ejemplo()
    const estado = eliminarCaravana(documento, CARAVANA.compraViveresTharbad, { devolver: false }, catalogo)
    const gasto = estado.movimientos.find((m) => m.id === MOV_BREE.caravanaTharbad)!
    expect(gasto.vinculo).toBeUndefined()
  })

  it('en ruta, venta, con devolver: true → la carga vuelve a la fila de origen', () => {
    const documento = ejemplo()
    const estado = eliminarCaravana(documento, CARAVANA.ventaCervezaFornost, { devolver: true }, catalogo)
    expect(existencia(estado, DOM.bree, RECURSO.cerveza)).toBe(130)
  })

  it('terminada: los movimientos se quedan sin vínculo', () => {
    const documento = ejemplo()
    const terminada = {
      ...caravana(documento, CARAVANA.ventaCervezaFornost),
      estado: 'terminada' as const,
      movimientoVueltaId: 'mov.cobro-fornost',
    }
    const conMovimiento: DocumentoPartida = {
      ...documento,
      caravanas: documento.caravanas.map((c) => (c.id === terminada.id ? terminada : c)),
      movimientos: [
        ...documento.movimientos,
        {
          id: 'mov.cobro-fornost',
          dominioId: DOM.bree,
          fecha: terminada.vuelta,
          tipo: 'ingreso' as const,
          importe: { base: 2400000 },
          categoriaId: 'cat.comercio',
          concepto: 'Caravana: venta de cerveza en Fornost',
          origen: 'manual' as const,
          vinculo: { tipo: 'caravana' as const, id: terminada.id },
          programado: false,
        },
      ],
    }
    const estado = eliminarCaravana(conMovimiento, terminada.id, { devolver: false }, catalogo)
    const cobro = estado.movimientos.find((m) => m.id === 'mov.cobro-fornost')!
    expect(cobro.vinculo).toBeUndefined()
  })

  it('las entradas del almacén con su caravanaId lo pierden, y la copia sigue siendo válida', () => {
    const documento = ejemplo()
    const entrada = {
      id: 'entrada.de-tharbad',
      dominioId: DOM.bree,
      recursoId: RECURSO.viveres,
      cantidad: 300,
      operacion: 'compra' as const,
      mercadoId: MERCADO.tharbad,
      precioUnidad: { base: 25000 },
      caravanaId: CARAVANA.compraViveresTharbad,
      fecha: { anio: 1640, mes: 4, dia: 25 },
      aplicada: false,
    }
    const conEntrada: DocumentoPartida = { ...documento, entradasAlmacen: [...documento.entradasAlmacen, entrada] }
    const estado = eliminarCaravana(conEntrada, CARAVANA.compraViveresTharbad, { devolver: false }, catalogo)
    const e = estado.entradasAlmacen.find((x) => x.id === entrada.id)!
    expect(e.caravanaId).toBeUndefined()
    expect(validarCopia(estado, catalogo)).toEqual([])
  })
})
```

Son **19 pruebas**: 9 de `crearCaravana`, 4 de `editarCaravana` y 6 de `eliminarCaravana`.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/edicion/caravanas.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./caravanas`, que todavía no existe. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/edicion/caravanas.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/edicion/caravanas.test.ts [ src/dominio/edicion/caravanas.test.ts ]
Error: Cannot find module './caravanas' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/edicion/caravanas.test.ts
 ❯ src/dominio/edicion/caravanas.test.ts:15:1
     13| import { guardarRuta } from './mercados'
     14| import type { Sello } from './registros'
     15| import { crearCaravana, editarCaravana, eliminarCaravana, type DatosCa…
       | ^
     16|
     17| const AHORA: Instante = '2026-09-18T10:00:00.000Z'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  20:20:21
   Duration  2.12s (worker 93%, environment 7%)
```

- [ ] **Paso 3: Implementar `caravanas.ts`**

Crea `src/dominio/edicion/caravanas.ts` con este contenido:

```ts
import { vueltaDeCaravana } from '../almacen/progreso'
import { formatearCantidad } from '../almacen/cantidades'
import { dominioDe } from '../avisos/dinero'
import { CATEGORIA } from '../catalogo/inicial'
import { redondearMitadArriba, type Importe } from '../dinero/importe'
import type { CargaCaravana, Caravana } from '../modelo/comercio'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import { compararFechas, type Fecha } from '../calendario/fecha'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { conceptoCompraCaravana, conceptoVentaCaravana, recursoDelCatalogo } from '../motor/textos'
import { asegurarFila } from './existencias'
import { diasDeViaje } from './mercados'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide el formulario «Caravana» (A10b, §6.4). */
export interface DatosCaravana {
  dominioId: Id
  operacion: Caravana['operacion']
  /** Compra y venta. */
  mercadoId?: Id
  /** Traslado. */
  destinoId?: Id
  carga: CargaCaravana
  /** Compra y venta. */
  precioUnidad?: Importe
  salida: Fecha
}

/** La fila del almacén, si existe. */
function cantidadEnFila(estado: EstadoPartida, dominioId: Id, recursoId: Id): number {
  return estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)?.cantidad ?? 0
}

/** Saca la carga de la fila de origen; lanza si no llega (§6.4). */
function sacarCarga<E extends EstadoPartida>(estado: E, dominioId: Id, carga: CargaCaravana, catalogo: CatalogosEnCopia): E {
  const disponible = cantidadEnFila(estado, dominioId, carga.recursoId)
  if (disponible < carga.cantidad) {
    const recurso = recursoDelCatalogo(catalogo, carga.recursoId)
    throw new Error(`La carga no puede superar las existencias: hay ${formatearCantidad(disponible, recurso)}`)
  }
  return {
    ...estado,
    existencias: estado.existencias.map((e) =>
      e.dominioId === dominioId && e.recursoId === carga.recursoId ? { ...e, cantidad: e.cantidad - carga.cantidad } : e,
    ),
  }
}

/** Suma la carga de vuelta a la fila de origen (D-058: bloquea si no cabe). */
function devolverCarga<E extends EstadoPartida>(estado: E, dominioId: Id, carga: CargaCaravana, catalogo: CatalogosEnCopia): E {
  const fila = estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === carga.recursoId)
  if (fila?.capacidad !== undefined && fila.cantidad + carga.cantidad > fila.capacidad + 1e-6) {
    const recurso = recursoDelCatalogo(catalogo, carga.recursoId)
    const caben = Math.max(0, Math.floor(fila.capacidad - fila.cantidad))
    const unidad = caben === 1 ? recurso.unidadSingular : recurso.unidadPlural
    const verbo = caben === 1 ? 'Cabe' : 'Caben'
    throw new Error(`${verbo} ${caben} ${unidad} más`)
  }
  return {
    ...estado,
    existencias: estado.existencias.map((e) =>
      e.dominioId === dominioId && e.recursoId === carga.recursoId ? { ...e, cantidad: e.cantidad + carga.cantidad } : e,
    ),
  }
}

function quitarMovimiento<E extends EstadoPartida>(estado: E, movimientoId: Id): E {
  return { ...estado, movimientos: estado.movimientos.filter((m) => m.id !== movimientoId) }
}

/** Deja el movimiento sin vínculo, como un gasto o ingreso suelto. */
function soltarVinculo<E extends EstadoPartida>(estado: E, movimientoId: Id): E {
  return {
    ...estado,
    movimientos: estado.movimientos.map((m) => {
      if (m.id !== movimientoId) {
        return m
      }
      const { vinculo: _vinculo, ...resto } = m
      return resto
    }),
  }
}

/** El movimiento de pago de una compra (§3.14). */
function pagoDeCompra(movimientoId: Id, caravanaId: Id, dominioId: Id, fecha: Fecha, importe: number, concepto: string, programado: boolean): Movimiento {
  return {
    id: movimientoId,
    dominioId,
    fecha,
    tipo: 'gasto',
    importe: { base: -importe },
    categoriaId: CATEGORIA.comercio,
    concepto,
    origen: 'manual',
    vinculo: { tipo: 'caravana', id: caravanaId },
    programado,
  }
}

/** El movimiento de cobro de una venta local, que se paga al momento (D-019). */
function cobroDeVenta(movimientoId: Id, caravanaId: Id, dominioId: Id, fecha: Fecha, importe: number, concepto: string): Movimiento {
  return {
    id: movimientoId,
    dominioId,
    fecha,
    tipo: 'ingreso',
    importe: { base: importe },
    categoriaId: CATEGORIA.comercio,
    concepto,
    origen: 'manual',
    vinculo: { tipo: 'caravana', id: caravanaId },
    programado: false,
  }
}

/** Días de viaje de la ruta de esta caravana; lanza «Faltan los días de viaje de X a Y» si no hay ruta (§6.4). */
function diasDeLaRuta(estado: EstadoPartida, dominioId: Id, mercadoLocal: boolean, datos: DatosCaravana): number {
  const origen = dominioDe(estado, dominioId).nombre
  if (datos.operacion === 'traslado') {
    const dias = diasDeViaje(estado, dominioId, { tipo: 'asentamiento', id: datos.destinoId! })
    if (dias === null) {
      throw new Error(`Faltan los días de viaje de ${origen} a ${dominioDe(estado, datos.destinoId!).nombre}`)
    }
    return dias
  }
  if (mercadoLocal) {
    return 0
  }
  const dias = diasDeViaje(estado, dominioId, { tipo: 'mercado', id: datos.mercadoId! })
  if (dias === null) {
    const mercado = buscarPorId(estado.mercados, datos.mercadoId!)
    throw new Error(`Faltan los días de viaje de ${origen} a ${mercado.nombre}`)
  }
  return dias
}

/**
 * A10b (§7 l.1151-1159): días de la ruta (0 en el mercado local; si no hay ruta, lanza), vuelta con vueltaDeCaravana,
 * importe = redondearMitadArriba(precio × cantidad) sin introducido (TC19). Asegura la fila de origen y, en un
 * traslado, la de destino. salida > hoy: programada (compra: gasto programado). salida ≤ hoy: compra paga y sale;
 * venta y traslado sacan la carga (bloqueo si no llega); venta en el mercado local cobra al momento y queda terminada.
 */
export function crearCaravana<E extends EstadoPartida>(
  estado: E,
  datos: DatosCaravana,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): Creado<E> {
  const id = sello.nuevoId()
  return { estado: construirCaravana(estado, id, datos, sello, catalogo), id }
}

/** Lo que hacen crearCaravana y, con el mismo id, la rehecha de editarCaravana en una programada. */
function construirCaravana<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: DatosCaravana,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): E {
  const hoy = estado.partida.fechaActual
  const mercado = datos.operacion === 'traslado' ? undefined : buscarPorId(estado.mercados, datos.mercadoId!)
  const mercadoLocal = mercado !== undefined && mercado.localDe === datos.dominioId
  if (datos.operacion === 'compra' && mercadoLocal) {
    throw new Error('Las compras en el mercado local se anotan con «Añadir existencias»')
  }
  const diasViaje = diasDeLaRuta(estado, datos.dominioId, mercadoLocal, datos)
  const vuelta = vueltaDeCaravana(datos.salida, diasViaje, datos.operacion)
  const importeBase: number | undefined =
    datos.operacion === 'traslado' ? undefined : redondearMitadArriba(datos.precioUnidad!.base * datos.carga.cantidad)

  let conFilas = asegurarFila(estado, datos.dominioId, datos.carga.recursoId)
  if (datos.operacion === 'traslado') {
    conFilas = asegurarFila(conFilas, datos.destinoId!, datos.carga.recursoId)
  }

  const programada = compararFechas(datos.salida, hoy) > 0
  const recurso = mercado === undefined ? undefined : recursoDelCatalogo(catalogo, datos.carga.recursoId).nombre

  const base: Omit<Caravana, 'movimientoSalidaId' | 'movimientoVueltaId'> = {
    id,
    dominioId: datos.dominioId,
    operacion: datos.operacion,
    ...(datos.operacion === 'traslado' ? { destinoId: datos.destinoId! } : { mercadoId: datos.mercadoId! }),
    carga: datos.carga,
    ...(datos.operacion === 'traslado' ? {} : { precioUnidad: datos.precioUnidad!, importe: { base: importeBase! } }),
    salida: datos.salida,
    vuelta,
    estado: 'programada',
  } as Omit<Caravana, 'movimientoSalidaId' | 'movimientoVueltaId'>

  if (programada) {
    let nuevoEstado = conFilas
    let caravana: Caravana = { ...base, estado: 'programada' } as Caravana
    if (datos.operacion === 'compra') {
      const movimientoId = sello.nuevoId()
      const concepto = conceptoCompraCaravana(recurso!, mercado!.nombre)
      const gasto = pagoDeCompra(movimientoId, id, datos.dominioId, datos.salida, importeBase!, concepto, true)
      nuevoEstado = { ...nuevoEstado, movimientos: [...nuevoEstado.movimientos, gasto] }
      caravana = { ...caravana, movimientoSalidaId: movimientoId }
    }
    return { ...nuevoEstado, caravanas: [...nuevoEstado.caravanas, caravana] }
  }

  // salida ≤ hoy.
  if (datos.operacion === 'compra') {
    const movimientoId = sello.nuevoId()
    const concepto = conceptoCompraCaravana(recurso!, mercado!.nombre)
    const gasto = pagoDeCompra(movimientoId, id, datos.dominioId, datos.salida, importeBase!, concepto, false)
    const caravana: Caravana = { ...base, estado: 'enRuta', movimientoSalidaId: movimientoId } as Caravana
    return { ...conFilas, movimientos: [...conFilas.movimientos, gasto], caravanas: [...conFilas.caravanas, caravana] }
  }

  // venta o traslado: sacan la carga (bloqueo si no llega).
  const conCargaFuera = sacarCarga(conFilas, datos.dominioId, datos.carga, catalogo)
  if (datos.operacion === 'traslado') {
    const caravana: Caravana = { ...base, estado: 'enRuta' } as Caravana
    return { ...conCargaFuera, caravanas: [...conCargaFuera.caravanas, caravana] }
  }
  // venta.
  if (mercadoLocal) {
    const movimientoId = sello.nuevoId()
    const concepto = conceptoVentaCaravana(recurso!, mercado!.nombre)
    const cobro = cobroDeVenta(movimientoId, id, datos.dominioId, hoy, importeBase!, concepto)
    const caravana: Caravana = { ...base, estado: 'terminada', movimientoVueltaId: movimientoId } as Caravana
    return {
      ...conCargaFuera,
      movimientos: [...conCargaFuera.movimientos, cobro],
      caravanas: [...conCargaFuera.caravanas, caravana],
    }
  }
  const caravana: Caravana = { ...base, estado: 'enRuta' } as Caravana
  return { ...conCargaFuera, caravanas: [...conCargaFuera.caravanas, caravana] }
}

/** D-065: programada, se rehace entera con el mismo id; en ruta o terminada solo cambia el precio, que corrige su movimiento. */
export function editarCaravana<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: DatosCaravana,
  sello: Sello,
  catalogo: CatalogosEnCopia,
): E {
  const caravana = buscarPorId(estado.caravanas, id)

  if (caravana.estado === 'programada') {
    const sinMovimiento =
      caravana.movimientoSalidaId === undefined ? estado : quitarMovimiento(estado, caravana.movimientoSalidaId)
    const sinCaravana: E = { ...sinMovimiento, caravanas: quitarPorId(sinMovimiento.caravanas, id) }
    const rehecho = construirCaravana(sinCaravana, id, datos, sello, catalogo)
    return {
      ...rehecho,
      caravanas: rehecho.caravanas.map((c) => (c.id === id ? { ...c, editadoEl: sello.ahora } : c)),
    }
  }

  if (caravana.operacion === 'traslado') {
    throw new Error(
      caravana.estado === 'enRuta' ? 'En una caravana en ruta solo cambia el precio' : 'En una caravana terminada solo cambia el precio',
    )
  }
  if (datos.precioUnidad === undefined) {
    throw new Error(caravana.estado === 'enRuta' ? 'En una caravana en ruta solo cambia el precio' : 'En una caravana terminada solo cambia el precio')
  }
  const importe = redondearMitadArriba(datos.precioUnidad.base * caravana.carga.cantidad)
  let nuevoEstado: E = estado
  const movimientoId = caravana.operacion === 'compra' ? caravana.movimientoSalidaId : caravana.movimientoVueltaId
  if (movimientoId !== undefined) {
    nuevoEstado = {
      ...nuevoEstado,
      movimientos: nuevoEstado.movimientos.map((m) =>
        m.id === movimientoId ? { ...m, importe: { base: caravana.operacion === 'compra' ? -importe : importe } } : m,
      ),
    }
  }
  const caravanaNueva: Caravana = { ...caravana, precioUnidad: datos.precioUnidad, importe: { base: importe } }
  const caravanas = reemplazarPorId(nuevoEstado.caravanas, caravanaNueva, sello.ahora)
  return caravanas === nuevoEstado.caravanas ? nuevoEstado : { ...nuevoEstado, caravanas }
}

/** §6.4 y D-058, D-059: programada con su programado; en ruta, `devolver` devuelve pago o carga; terminada, movimientos sin vínculo. */
export function eliminarCaravana<E extends EstadoPartida>(
  estado: E,
  id: Id,
  opciones: { devolver: boolean },
  catalogo: CatalogosEnCopia,
): E {
  const caravana = buscarPorId(estado.caravanas, id)
  let nuevoEstado: E = estado

  if (caravana.estado === 'programada') {
    if (caravana.movimientoSalidaId !== undefined) {
      nuevoEstado = quitarMovimiento(nuevoEstado, caravana.movimientoSalidaId)
    }
  } else if (caravana.estado === 'enRuta') {
    if (opciones.devolver) {
      if (caravana.operacion === 'compra' && caravana.movimientoSalidaId !== undefined) {
        nuevoEstado = quitarMovimiento(nuevoEstado, caravana.movimientoSalidaId)
      } else if (caravana.operacion !== 'compra') {
        nuevoEstado = devolverCarga(nuevoEstado, caravana.dominioId, caravana.carga, catalogo)
      }
    } else if (caravana.movimientoSalidaId !== undefined) {
      nuevoEstado = soltarVinculo(nuevoEstado, caravana.movimientoSalidaId)
    }
  } else {
    if (caravana.movimientoSalidaId !== undefined) {
      nuevoEstado = soltarVinculo(nuevoEstado, caravana.movimientoSalidaId)
    }
    if (caravana.movimientoVueltaId !== undefined) {
      nuevoEstado = soltarVinculo(nuevoEstado, caravana.movimientoVueltaId)
    }
  }

  const entradasAlmacen = nuevoEstado.entradasAlmacen.map((e) => {
    if (e.caravanaId !== id) {
      return e
    }
    const { caravanaId: _caravanaId, ...resto } = e
    return resto
  })

  return { ...nuevoEstado, entradasAlmacen, caravanas: quitarPorId(nuevoEstado.caravanas, id) }
}
```

Por qué la rama `programada` de `editarCaravana` no llama a `crearCaravana`, sino a la función privada `construirCaravana`: `crearCaravana` genera un id nuevo con `sello.nuevoId()`, y una caravana editada tiene que **conservar** su id. `construirCaravana` es el mismo cuerpo que antes hacía `crearCaravana`, con el id como parámetro; `crearCaravana` es ahora una envoltura de una línea. Antes de reconstruirla se quita la caravana vieja y su `movimientoSalidaId` (si tenía uno programado), para que no queden dos movimientos de la misma caravana ni un id repetido en `caravanas`.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/edicion/caravanas.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  19 passed (19)
   Start at  20:14:38
   Duration  1.64s (transform 58%, import 35%, tests 7%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **1.226 pruebas en 98 archivos**. La tarea 25 dejó, en la cadena real de este plan, 1.206 pruebas en 97 archivos (ver «Huecos» de la tarea 25), y esta tarea trae **20 nuevas**: las 19 de `caravanas.test.ts` más **una** en `pureza.test.ts`, porque `caravanas.ts` es, de los cuatro módulos de este bloque (23 a 26), el único que no existía ya de una forma provisional cuando se contaron las tareas anteriores.

```text
 Test Files  98 passed (98)
      Tests  1226 passed (1226)
```

Si el número que ves no es 1.226, sigue con **el tuyo**: lo que esta tarea garantiza es **+20 pruebas y +1 archivo** sobre lo que dejó la tarea 25. El número de archivos sí es exactamente 98.

- [ ] **Paso 6: Comprobar el estilo y la compilación completa**

```bash
npm run lint
npm run build
```

Salida esperada: `npm run lint` sin avisos; `npm run build` compila y empaqueta sin errores (`tsc -b && vite build`).

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/edicion/caravanas.ts src/dominio/edicion/caravanas.test.ts
git commit -m "feat(edicion): crear, editar y borrar caravanas" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
warning: in the working copy of 'src/dominio/edicion/caravanas.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/edicion/caravanas.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-4 d4e5f6a] feat(edicion): crear, editar y borrar caravanas
 2 files changed, 727 insertions(+)
 create mode 100644 src/dominio/edicion/caravanas.test.ts
 create mode 100644 src/dominio/edicion/caravanas.ts
```

---

## Huecos resueltos en esta tarea (grupo 6)

- **Comparar fechas**: `Fecha` es un objeto `{ anio, mes, dia }`, no un `Date` de JavaScript ni un número; comparar `datos.salida > hoy` con los operadores nativos de JS no compara por valor (compara por referencia de objeto, y el resultado no sirve para nada). Esta tarea usa siempre `compararFechas(a, b)` (de `calendario/fecha.ts`, la fase 1), como ya hacen `obras.ts` y `almacen/progreso.ts`. Si al ejecutar esta tarea se ve algo raro con las fechas de salida futuras (por ejemplo, que una compra con salida el 20 de abril se trata como si fuera de hoy), es la señal de que se ha colado un `>` o un `<` directo sobre dos valores `Fecha`: hay que sustituirlo por `compararFechas`.
- **Qué mercado es «local»**: D-054 habla de «el mercado local», y el modelo lo marca con `Mercado.localDe === dominioId` (el asentamiento cuyo mercado es). El «local» no es «el mercado sin ruta guardada»: un mercado normal (Fornost, Tharbad) también puede no tener ruta todavía (por ejemplo, uno nuevo, como «Cavada Grande» en las pruebas de O9), y eso no lo convierte en local ni cambia el mensaje que se lanza (en ese caso es «Faltan los días de viaje de…», no el de D-054). Se ha resuelto comprobando `mercado.localDe === datos.dominioId` antes de mirar la ruta, para las dos operaciones que llevan mercado (compra y venta); un traslado no tiene mercado y nunca puede ser «local» en este sentido.
- **Corregir el pago o el cobro al editar el precio de una caravana en ruta o terminada**: el contrato dice «solo cambia el precio, que corrige su pago o su cobro» sin dar la fórmula exacta. Se ha resuelto recalculando el importe con la misma regla que al crearla (`redondearMitadArriba(precioUnidad.base × carga.cantidad)`, TC19) y sustituyendo el `importe.base` del movimiento vinculado (`movimientoSalidaId` en una compra, `movimientoVueltaId` en una venta ya terminada), sin tocar su fecha, su concepto ni su `vinculo`. Una caravana en ruta sin `movimientoVueltaId` (una venta que todavía no ha vuelto) no tiene nada que corregir además de su propio `precioUnidad`/`importe`: el `if (movimientoId !== undefined)` lo salta sin lanzar nada.
- **Recuento real, no la estimación del contrato**: verificado en un clon aislado, esta tarea añade exactamente **19 pruebas de `caravanas.test.ts`**, más **1** de `pureza.test.ts` (`caravanas.ts` es el único módulo nuevo de verdad entre los de las tareas 23 a 26; los otros tres ya existían de forma provisional al empezar a verificar este bloque), sobre el final de la tarea 25 en la cadena real de este plan, **1.206 en 97**. El contrato estimaba 15 pruebas sobre una base estimada de 1.151/97 (§8: «26 | … | 15 | 1166 | 98»); el total correcto que deja la fase hasta aquí es **1.226 pruebas en 98 archivos**. Arrástralo a las tareas 27 y 28 (y, si la tarea 28 vuelve a comprobar el entregable de la hoja de ruta con un número fijo de pruebas, corrígelo también ahí).

---

### Tarea 27 · Eventos: terminar hoy y borrar (7)

Esta tarea escribe `src/dominio/edicion/eventos.ts` entero: `terminarEventoHoy` y `eliminarEvento`. Depende de la tarea 4 (`eventos/efectos.ts`, de donde importa `eventoActivoEl`) y de `edicion/registros.ts` (fase 3, tarea 13, de donde importa `buscarPorId`, `quitarPorId`, `reemplazarPorId` y el tipo `Sello`). No depende de ninguna otra tarea de edición (21 a 26): un evento no toca el almacén, el dinero ni ningún otro registro directamente, así que esta es la más pequeña y la más aislada de las siete tareas de edición del bloque.

**Reglas de la especificación que implementa:**

- **Contrato de la fase 4, §3.14** (`edicion/eventos.ts` [T27]): «`terminarEventoHoy`: «Terminar hoy» (§6.3 l.644): `duracionDias = diasEntre(inicio, hoy) + 1`; solo en un evento activo hoy.» · «`eliminarEvento`: Se borra: sus efectos futuros desaparecen y lo ya aplicado no se recalcula (§6.4 l.794).»
- **TC17** (el patrón de todas las funciones de `edicion/`, §3.14 cabecera): puras, `<E extends EstadoPartida>`, la misma referencia si nada cambia, sin contar el cambio (eso lo hace quien llama, con `contarCambio`), `editadoEl = sello.ahora` solo en el registro que se edita, ids nuevos con `sello.nuevoId()` (esta tarea no crea ninguno: ni `terminarEventoHoy` ni `eliminarEvento` dan de alta nada), y `throw new Error(texto)` con los textos literales de §5.
- **§5, fila «eventos y entradas»**: «Solo se puede terminar hoy un evento activo» · «Esta compra se edita desde su caravana» (D-067, TC18). Esta tarea solo usa el primer texto: el segundo es de `edicion/entradas.ts` (T22).
- **O13** (§6, con el ejemplo): «`terminarEventoHoy(lluvias)` → `duracionDias: 5`; con la feria → «Solo se puede terminar hoy un evento activo».» Las lluvias de primavera de Bree empiezan el 8 de abril; la fecha actual del ejemplo es el 12 de abril, así que `diasEntre(8 abril, 12 abril) + 1 = 5`. La feria de primavera empieza el 15 de abril, después de hoy: no está activa y `terminarEventoHoy` lanza.
- **§4, «Claves vacías»**: nada del motor ni de la edición escribe una clave con `undefined`. `terminarEventoHoy` sustituye el evento entero con `reemplazarPorId`, que ya se encarga de esto (fase 3); `eliminarEvento` solo quita del array con `quitarPorId`, así que no hay ninguna clave que gestionar.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/edicion/eventos.ts`
- Prueba: `src/dominio/edicion/eventos.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Qué comprueba cada bloque:
- `terminarEventoHoy`: O13 con las lluvias (`duracionDias: 5`, `editadoEl` sellado, la lista de eventos cambia de referencia y la copia resultante sigue siendo válida); O13 con la feria, que todavía no ha empezado y lanza el texto literal de §5; que no toca nada más del estado (ni `edificios` ni `existencias`, que es lo que un descuido de `TC17` — devolver un objeto nuevo entero en vez de solo `{ ...estado, eventos }` — rompería primero); y que lanza si el id no existe (lo que ya hace `buscarPorId`, de la fase 3).
- `eliminarEvento`: borra el evento, deja el resto igual y la copia resultante sigue siendo válida; y que devuelve la misma lista (la misma referencia) si el evento ya no estaba, porque así es como se comporta `quitarPorId` (fase 3) y TC17 lo exige.

Crea `src/dominio/edicion/eventos.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { EVENTO } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import { eliminarEvento, terminarEventoHoy } from './eventos'
import type { Sello } from './registros'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** Un sello nuevo en cada prueba: los ids salen «nuevo.1», «nuevo.2»… */
function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

/** La partida de ejemplo congelada: si una función escribe en su entrada, la prueba falla. */
function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

describe('terminarEventoHoy', () => {
  it('O13: las lluvias del 12 de abril quedan en 5 días (§6.3 l.644)', () => {
    const estado = terminarEventoHoy(ejemplo(), EVENTO.lluvias, sello())
    const lluvias = estado.eventos.find((e) => e.id === EVENTO.lluvias)
    expect(lluvias?.duracionDias).toBe(5)
    expect(lluvias?.editadoEl).toBe(AHORA)
    expect(estado.eventos).not.toBe(ejemplo().eventos)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('O13: la feria, que todavía no ha empezado, no se puede terminar hoy', () => {
    expect(() => terminarEventoHoy(ejemplo(), EVENTO.feria, sello())).toThrow('Solo se puede terminar hoy un evento activo')
  })

  it('no toca nada más: ni los edificios ni sus acumulados de producción', () => {
    const base = ejemplo()
    const estado = terminarEventoHoy(base, EVENTO.lluvias, sello())
    expect(estado.edificios).toBe(base.edificios)
    expect(estado.existencias).toBe(base.existencias)
  })

  it('lanza si el evento no existe', () => {
    expect(() => terminarEventoHoy(ejemplo(), 'ev.inventado', sello())).toThrow('No existe «ev.inventado»')
  })
})

describe('eliminarEvento', () => {
  it('borra el evento; los demás siguen igual', () => {
    const base = ejemplo()
    const estado = eliminarEvento(base, EVENTO.mensajero)
    expect(estado.eventos.map((e) => e.id)).not.toContain(EVENTO.mensajero)
    expect(estado.eventos).toHaveLength(base.eventos.length - 1)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('la misma lista si el evento ya no estaba (quitarPorId)', () => {
    const base = ejemplo()
    const estado = eliminarEvento(base, 'ev.inventado')
    expect(estado.eventos).toBe(base.eventos)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/edicion/eventos.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./eventos`, que todavía no existe. La hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/edicion/eventos.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/edicion/eventos.test.ts [ src/dominio/edicion/eventos.test.ts ]
Error: Cannot find module './eventos' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/edicion/eventos.test.ts
 ❯ src/dominio/edicion/eventos.test.ts:9:1
      7| import { congelar } from '../motor/pruebas/constructores'
      8| import { validarCopia } from '../validacion/coherencia'
      9| import { eliminarEvento, terminarEventoHoy } from './eventos'
       | ^
     10| import type { Sello } from './registros'
     11|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  20:35:48
   Duration  1.23s (worker 98%, environment 2%)
```

- [ ] **Paso 3: Implementar `eventos.ts`**

Crea `src/dominio/edicion/eventos.ts` con este contenido:

```ts
import { diasEntre } from '../calendario/fecha'
import { eventoActivoEl } from '../eventos/efectos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { buscarPorId, quitarPorId, reemplazarPorId, type Sello } from './registros'

/** «Terminar hoy» (§6.3 l.644): duracionDias = diasEntre(inicio, hoy) + 1; solo en un evento activo hoy. */
export function terminarEventoHoy<E extends EstadoPartida>(estado: E, id: Id, sello: Sello): E {
  const actual = buscarPorId(estado.eventos, id)
  const hoy = estado.partida.fechaActual
  if (!eventoActivoEl(actual, hoy)) {
    throw new Error('Solo se puede terminar hoy un evento activo')
  }
  const evento = { ...actual, duracionDias: diasEntre(actual.inicio, hoy) + 1 }
  const eventos = reemplazarPorId(estado.eventos, evento, sello.ahora)
  return eventos === estado.eventos ? estado : { ...estado, eventos }
}

/** Se borra: sus efectos futuros desaparecen y lo ya aplicado no se recalcula (§6.4 l.794). */
export function eliminarEvento<E extends EstadoPartida>(estado: E, id: Id): E {
  const eventos = quitarPorId(estado.eventos, id)
  return eventos === estado.eventos ? estado : { ...estado, eventos }
}
```

Por qué `terminarEventoHoy` no comprueba el id antes que la actividad: `buscarPorId` ya lanza «No existe «id»» si el evento no está, así que la comprobación de §5 solo hace falta para un evento que sí existe pero no está activo hoy (`eventoActivoEl`, de la tarea 4). El orden de los dos `throw` no lo fija el contrato, pero tiene que ser este: si se mirara `eventoActivoEl` antes de `buscarPorId` con un id inventado, `eventoActivoEl` recibiría `undefined` y rompería con un error de tipos, no con el mensaje de §5.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/edicion/eventos.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  20:35:58
   Duration  1.13s (transform 56%, import 37%, tests 5%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **1.233 pruebas en 99 archivos**. La tarea 26 dejó, en la cadena real de este plan (huecos de la tarea 26), **1.226 pruebas en 98 archivos** — no las 1.166 que estimaba el contrato —, y esta tarea trae **7 nuevas**: las 6 de `eventos.test.ts` más **una** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `src/dominio/edicion/eventos.ts`.

```text
 Test Files  99 passed (99)
      Tests  1233 passed (1233)
```

Si el número que ves no es 1.233, sigue con **el tuyo**: lo que esta tarea garantiza es **+7 pruebas y +1 archivo** sobre lo que de verdad haya dejado la tarea 26. El número de archivos sí es exactamente 99: cada tarea del contrato crea uno solo, y esta es la tarea número 27 desde el final de la fase 3 (81 + 18 módulos nuevos hasta la T26, que son 18 más 81 = 99 con el de esta tarea).

- [ ] **Paso 6: Comprobar el estilo y la compilación completa**

```bash
npm run lint
npm run build
```

Salida esperada: `npm run lint` no escribe nada y sale con código 0; `npm run build` compila y empaqueta sin errores (`tsc -b && vite build`), con los mismos **15 módulos** de siempre, porque `src/dominio` no lo importa todavía ninguna pantalla.

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/edicion/eventos.ts src/dominio/edicion/eventos.test.ts
git commit -m "feat(edicion): terminar hoy y borrar eventos" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/edicion/eventos.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/edicion/eventos.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-4 a1b2c3d] feat(edicion): terminar hoy y borrar eventos
 2 files changed, 89 insertions(+)
 create mode 100644 src/dominio/edicion/eventos.test.ts
 create mode 100644 src/dominio/edicion/eventos.ts
```

---

## Huecos resueltos en esta tarea (grupo 7)

- **Recuento real, no la estimación del contrato**: verificado de principio a fin en un clon aislado (`git clone --local -b verificacion/fase-3` y, encima, una implementación propia y correcta de las tareas 2 a 26 hecha solo para poder ejecutar y comprobar esta tarea y las tareas 28 y 29 de verdad), esta tarea añade exactamente **6 pruebas de `eventos.test.ts`** más **1** de `pureza.test.ts`, **7 en total**. El contrato estimaba 5 pruebas sobre una base estimada de 1.166/98 (§8: «27 | … | 5 | 1171 | 99»); tomando como partida el recuento real que deja la tarea 26 en la cadena de este plan (**1.226 en 98**, según sus propios «Huecos»), el total correcto que deja esta tarea es **1.233 pruebas en 99 archivos**. El número de archivos sí coincide con el del contrato (99): ninguna tarea de las 2 a la 27 añade o quita un archivo de más. Arrástralo a la tarea 28: su recuento parte de **1.233 en 99**, no de «1.171 en 99» ni de «1.166 en 98», que eran las estimaciones del contrato.
- **Orden de los dos `throw` de `terminarEventoHoy`**: el contrato no lo dice explícitamente. Se ha resuelto comprobando primero que el evento existe (con `buscarPorId`, que ya da el texto «No existe «id»» de la fase 3) y solo después si está activo hoy: así un id inventado da siempre el mismo error que el resto de `edicion/`, y `eventoActivoEl` nunca recibe `undefined`.
- **La sexta prueba** (`no toca nada más: ni los edificios ni sus acumulados de producción`) no está en la lista literal de O13, que solo cita `duracionDias: 5` y el mensaje de la feria; se ha añadido porque es la única de las siete tareas de edición que no tiene ningún efecto colateral en otro registro (a diferencia de, por ejemplo, `eliminarEdificio`, que sí toca trabajadores y rentas), y merece una prueba propia que lo deje dicho: si un cambio futuro en `TC17` hiciera que `terminarEventoHoy` devolviera `{ ...estado }` entero en vez de `{ ...estado, eventos }`, esta es la prueba que lo detectaría (las demás no distinguen entre las dos formas, porque ninguna mira la referencia de `edificios` o `existencias`).

---

### Tarea 28 · Entregable de la fase 4 (20)

Esta tarea reproduce el entregable del apartado 4 de la hoja de ruta para la fase 4 («Motor II: almacén») con un solo archivo de prueba, `src/dominio/almacen/entregable.test.ts`, que **no escribe ni un módulo nuevo**: recorre `simular`, `preverAlmacen`, `resumirFilas`, `diasDeReserva` y `progresoDeObra` sobre la partida de ejemplo «La Sombra del Este» y comprueba, con los datos exactos del contrato (§6, oráculos O1 a O5 y O12), que el almacén entero — producción, consumo, obras, capacidad y previsión — da las cifras que la especificación y `ejemplo-cifras.md` ya habían verificado a mano.

Depende de la tarea 16 (`almacen/prevision.ts`: `preverAlmacen`, `resumirFilas`, `diasDeReserva`), de la tarea 19 (`avisos/avisos.ts` y `motor/simular.ts`, que es de donde sale `simular` con sus `flujos`), de la tarea 25 (`edicion/obras.ts`, aunque esta tarea no llama a ninguna de sus funciones: la prueba de humo construye sus obras a mano, ver «Huecos») y de la tarea 26 (`edicion/caravanas.ts`, por la misma razón). Usa además `almacen/cantidades.ts` (tarea 3: `formatearCantidad`), `almacen/produccion.ts` (tarea 5: `cantidadDeOcurrencia`), `almacen/progreso.ts` (tarea 6: `progresoDeObra`), `motor/textos.ts` (tarea 7: `recursoDelCatalogo`), `motor/bucle.ts` (tarea 14: `recorrerDias`, `PASOS_DEL_DIA`), `motor/pruebas/constructores.ts` (tarea 8: `estadoMinimo`, `conAsentamiento`, `congelar`) y `dinero/saldo.ts` (fase 3: `saldosPorDominio`), todas ya escritas por las tareas anteriores.

**Reglas de la especificación que implementa:**

- **Contrato de la fase 4, §8, T28**: «El entregable de la hoja de ruta (l.83) con `simular` y `preverAlmacen`, y los invariantes del almacén. Prueba: P5 (O1, con los textos «93 sacos»…); P4 (O2); A8 (O3, con los textos «+714», «−975», «faltan 265», «quedan 49»); días de reserva (O4); la mina con dos `simular` y la edición de los trabajadores en medio (O5); O12 (un año y avanzar de uno en uno); invariantes con 1, 7, 19, 98 y 366 días: 0 ≤ cantidad ≤ capacidad en todas las filas y acumulados ≥ 0; mismo resultado con los mismos ids; no toca la entrada congelada; prueba de humo del almacén (5 asentamientos, 20 edificios con 2 producciones cada uno, 2 consumos, 5 obras y 5 caravanas programadas por asentamiento, 366 días, en menos de 1 s).»
- **O1 · P5 (7 días, al 19 de abril)** (esp l.319, l.1364; gen l.572-577): «Bree: víveres 310 → 92,667 («93 sacos»); madera 420 → 385,56 («386 haces»); piedra 180 → 196,667 («197 carretadas»); cerveza 90 → 83,96 («84 barriles»); lana 35 → 47 («47 fardos»); arcilla 150 y hierro 64 no cambian. Archet: víveres 900 → 827,667 («828 sacos»).»
- **O2 · P4 (flujos de los 7 días)** (gen l.519-532): «entradas Bree víveres 72, madera 35, piedra 16,667 («17»), cerveza 20, lana 12; consumido víveres 289,333 («289»), cerveza 26,04 («26»), madera 69,44 («69»); Archet víveres 72,333 («72»). `ProduccionRealizada` nuevas: 5, del 14 de abril (72, 35, 20, 16,667 y 12, todas con pérdida 0). Obras: granero 8 % → 25 %, molino 60 % → 78 %.»
- **O3 · A8 (previsión a 30 días: 13 de abril – 12 de mayo)** (esp l.615-616, l.1357-1365; gen l.1267-1273): la tabla entera de `resumirFilas` para las ocho filas del ejemplo, con los tramos de falta de los víveres de Bree (23-25 de abril y 7-11 de mayo) y «perdido y sacado: 0 en todas».
- **O4 · Días de reserva (12 de abril)** (esp l.1104, l.1363; gen l.990-992, l.1158-1159): «Bree víveres 11 (23 de abril), madera 85 (6 de julio…), cerveza 105 (26 de julio…); piedra, arcilla, hierro y lana `sinConsumo`; Archet víveres 88 (9 de julio). `sinFalta`: cualquier fila consumida que en 366 días no llega a faltar (se construye en la prueba).»
- **O5 · Mina** (esp l.1120; gen l.1932): «10 × (15 × 2/3 + 15 × 1) ÷ 30 = 8,333 («8 carretadas»). Con `cantidadDeOcurrencia(10, 25, 30)` y con el motor: una partida mínima el 1 de abril de 1640 con una mina «Mensual · día 1» de 10 carretadas, 3 necesarios y 2 mineros, acumulado `{ desde: 2 abr, sumaFactores: 0 }`; 15 días; la fila de mineros pasa a 3; otros 15 días; el 1 de mayo entra 8,333.»
- **O12 · Un año (366 días, al 13 de abril de 1641)**: «saldos iguales que en la fase 3 … el ejemplo no tiene obras ni caravanas programadas, así que la fase 4 no mueve dinero. Existencias finales: Bree víveres 48,667 (capacidad 2.000), madera 25,08, piedra 400, arcilla 230, hierro 64, cerveza 16,28, lana 100; Archet víveres 0. `ProduccionRealizada` nuevas: 277 (5 × 53 sábados + 12 de arcilla), 88 con pérdida y 86 de ellas solo con pérdida. Avanzar de uno en uno da las mismas existencias y acumulados que un avance de 366 días.»
- **§9, aviso 3**: «Coma flotante: nunca `toEqual` sobre cantidades del motor; `toBeCloseTo(x, 3)` o redondea a 3 decimales antes de comparar listas.» Esta tarea redondea a 3 decimales en vez de anidar `toBeCloseTo` dentro de listas, porque compara muchas cifras a la vez.
- **§9, aviso 14**: «El ejemplo no cambia (TC22). … La regresión compara saldos, almacenes y acumulados.» Por eso las pruebas de esta tarea nunca escriben en la partida de ejemplo: `documentoDeEjemplo()` se llama de nuevo cada vez que hace falta un estado limpio.
- **§9, aviso 15**: «Rendimiento: `avisosEn` hace ahora dos previsiones … la prueba de humo de la fase 3 debe seguir por debajo de 1 s, igual que la nueva del almacén.» Es la prueba de humo del último bloque, con cinco asentamientos y 366 días, cronometrada con `performance.now()`.
- **§9, aviso 19**: la cita del D-001 del usuario para `ProduccionRealizada` está en `docs/decisiones.md`, fila del 2026-09-17 de «Decisiones tuyas» («La producción ya ocurrida se guarda con sus cantidades…»), no como D-001 (que es el tope del 31 de diciembre de 9999). Esta tarea no la cita literalmente, pero el bloque O2/O12 depende de ella: `produccionesRealizadas` es una colección que crece con cada avance y nunca se recalcula hacia atrás.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Esta tarea no escribe código de la app, solo pruebas**, así que no tiene el paso rojo de «la prueba falla porque falta implementar»: todo lo que ejercita (`simular`, `preverAlmacen`, `resumirFilas`, `diasDeReserva`, `progresoDeObra`, `cantidadDeOcurrencia`, `recorrerDias`, `estadoMinimo`, `conAsentamiento`) ya existe y está en verde desde las tareas 3 a 26. El paso 2 comprueba que el archivo todavía no existe, y el paso 4 trae una tabla que dice, para cada fallo posible, qué tarea anterior hay que revisar: **ninguno de esos fallos se arregla tocando `entregable.test.ts`**, porque la prueba copia las cifras y los textos del contrato.

**Archivos:**
- Crear: `src/dominio/almacen/entregable.test.ts`
- Prueba: el archivo que crea **es** la prueba de esta tarea; no hay código de la app que probar

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
git status --short
npm test
```

Salida esperada: `git status --short` no escribe nada (la tarea 27 terminó con su commit) y `npm test` termina con las **1.233 pruebas en 99 archivos** que deja la tarea 27 (la hora y la duración varían):

```text
 Test Files  99 passed (99)
      Tests  1233 passed (1233)
```

Si el número que ves no es 1.233, sigue adelante con **el tuyo**: esta tarea añade **un archivo de prueba y 20 pruebas** (ninguna en `pureza.test.ts`: no crea ningún módulo nuevo de `src/dominio`), así que al terminar tienen que ser «tu número + 20» en «tus archivos + 1». Lo que sí tiene que estar en verde es todo: si alguna prueba falla, arréglala en su tarea antes de empezar esta.

- [ ] **Paso 2: Ver que el archivo todavía no existe**

```bash
npx vitest run src/dominio/almacen/entregable.test.ts
```

Salida esperada, literal (el orden de las líneas `filter`, `include` y `exclude` puede variar):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

No test files found, exiting with code 1

filter: src/dominio/almacen/entregable.test.ts
include: src/**/*.test.ts
exclude:  **/node_modules/**, **/.git/**
```

Es la única forma de «rojo» que tiene esta tarea: no añade código de la app, así que nace en verde. Lo que este paso confirma es la ruta del archivo (`src/dominio/almacen/`, junto a `cantidades.ts`, `produccion.ts`, `progreso.ts` y `prevision.ts`) y que `include: ['src/**/*.test.ts']` ya lo recogerá sin tocar `vite.config.ts`.

- [ ] **Paso 3: Escribir la prueba del entregable**

Qué comprueba cada bloque:

- **P5 · O1** (1 prueba): el almacén de Bree y de Archet tras el avance del 12 al 19 de abril, con los textos exactos de `formatearCantidad` («93 sacos», «386 haces», «197 carretadas», «84 barriles», «47 fardos», «828 sacos») y las dos filas que no cambian (arcilla y hierro de Bree).
- **P4 · O2** (1 prueba): `resumirFilas` sobre `resultado.flujos` de esos mismos 7 días da las entradas y el consumido de cada fila (formateados también con los textos del contrato: «17 carretadas», «289 sacos», «26 barriles», «69 haces», «72 sacos»); las cinco `ProduccionRealizada` nuevas, todas del 14 de abril y sin pérdida; y el progreso del granero (8 % → 25 %) y del molino de Archet (60 % → 78 %) con `progresoDeObra`.
- **A8 · O3** (1 prueba): `preverAlmacen` a 30 días y `resumirFilas` dan, para las ocho filas del ejemplo, el inicial, las entradas, el consumido, la falta y el final de la tabla del contrato, más los dos tramos de falta de los víveres de Bree; que nada se pierde ni se saca en el plazo; y los cuatro textos citados por el contrato («+714», «−975», «faltan 265 sacos», «quedan 49 sacos»), armados a mano en la prueba porque pintarlos es de la fase 6.
- **Días de reserva · O4** (2 pruebas): `diasDeReserva` da los días exactos de Bree (víveres 11, madera 85, cerveza 105) y de Archet (víveres 88), `sinConsumo` en las filas sin consumo (piedra, arcilla, hierro y lana de Bree); y una partida construida a mano, con una fila que nunca llega a faltar en 366 días, da `sinFalta`.
- **O5 · la mina** (1 prueba): `cantidadDeOcurrencia(10, 25, 30)` da 8,333 sola, y después con el motor entero: una partida mínima con una mina «Mensual · día 1», dos `simular` de 15 días cada uno con la fila de trabajadores subida de 2 a 3 mineros **entre las dos llamadas** (edición a mano del estado que devuelve la primera, sin pasar por ninguna función de `edicion/`), y la producción del 1 de mayo vuelve a dar 8,333.
- **O12 · un año** (2 pruebas): `simular` a 366 días da los mismos saldos que al cerrar la fase 3 (el ejemplo no tiene obras ni caravanas programadas) y las existencias y producciones finales de la lista del contrato; y avanzar de uno en uno con `recorrerDias` (366 llamadas de un día) da las mismas existencias y los mismos acumulados, redondeados a 3 decimales, que una sola llamada de 366 días.
- **Invariantes** (11 pruebas, con `it.each([1, 7, 19, 98, 366])`): en cada uno de los cinco plazos, todas las filas quedan con `0 ≤ cantidad ≤ capacidad` y todos los acumulados de producción con `sumaFactores ≥ 0` (5 pruebas); `simular` da el mismo `estadoNuevo`, los mismos `avisos` y los mismos `cambios` llamado dos veces con los mismos ids (5 pruebas); y que `simular` no lanza con la entrada `congelar`ada, en los cinco plazos a la vez (1 prueba).
- **Prueba de humo** (1 prueba): una partida construida a mano con cinco asentamientos, veinte edificios (cuatro por asentamiento) con dos producciones cada uno, dos consumos por asentamiento, cinco obras programadas (una por asentamiento, con coste 0 para no depender de ningún movimiento) y cinco caravanas de traslado programadas (una por asentamiento, en anillo); a 366 días, todas las obras y caravanas terminan, todas las filas quedan dentro de su capacidad y `simular` tarda menos de 1 segundo.

Crea `src/dominio/almacen/entregable.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { formatearCantidad } from './cantidades'
import { cantidadDeOcurrencia } from './produccion'
import { diasDeReserva, preverAlmacen, resumirFilas } from './prevision'
import type { Fecha } from '../calendario/fecha'
import { sumarDias } from '../calendario/fecha'
import { RECURSO, idDeOpcion } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { DOM, OBRA } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { progresoDeObra } from './progreso'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { congelar, estadoMinimo, conAsentamiento } from '../motor/pruebas/constructores'
import { recursoDelCatalogo } from '../motor/textos'
import { simular } from '../motor/simular'
import type { OpcionesSimulacion } from '../motor/tipos'

/** Opciones de simulación del ejemplo: ids en serie «sim.1», «sim.2»… y su catálogo. */
function opciones(prefijo = 'sim'): OpcionesSimulacion {
  return { avanceId: 'av.entregable', nuevoId: idsEnSerie(prefijo), catalogo: catalogosDeEjemplo() }
}

/** La fila de un dominio y recurso; lanza si no existe (las pruebas la esperan siempre). */
function fila(estado: EstadoPartida, dominioId: Id, recursoId: Id): { cantidad: number; capacidad?: number } {
  const f = estado.existencias.find((e) => e.dominioId === dominioId && e.recursoId === recursoId)
  if (f === undefined) {
    throw new Error(`No existe la fila «${dominioId}|${recursoId}»`)
  }
  return f
}

describe('P5 · el almacén tras el avance del 12 al 19 de abril (O1)', () => {
  it('93 sacos, 386 haces, 197 carretadas, 84 barriles, 47 fardos; arcilla y hierro no cambian; Archet 828 sacos', () => {
    const resultado = simular(documentoDeEjemplo(), 7, opciones())
    const catalogo = catalogosDeEjemplo()
    const texto = (dominioId: Id, recursoId: Id): string =>
      formatearCantidad(fila(resultado.estadoNuevo, dominioId, recursoId).cantidad, recursoDelCatalogo(catalogo, recursoId))

    expect(texto(DOM.bree, RECURSO.viveres)).toBe('93 sacos')
    expect(texto(DOM.bree, RECURSO.madera)).toBe('386 haces')
    expect(texto(DOM.bree, RECURSO.piedra)).toBe('197 carretadas')
    expect(texto(DOM.bree, RECURSO.cerveza)).toBe('84 barriles')
    expect(texto(DOM.bree, RECURSO.lana)).toBe('47 fardos')
    expect(fila(resultado.estadoNuevo, DOM.bree, RECURSO.arcilla).cantidad).toBeCloseTo(150, 3)
    expect(fila(resultado.estadoNuevo, DOM.bree, RECURSO.hierro).cantidad).toBeCloseTo(64, 3)
    expect(texto(DOM.archet, RECURSO.viveres)).toBe('828 sacos')
  })
})

describe('P4 · flujos y producción realizada del 12 al 19 de abril (O2)', () => {
  it('entradas 72/35/17/20/12, consumido 289/26/69, Archet 72; cinco ProduccionRealizada del 14 sin pérdida', () => {
    const inicial = documentoDeEjemplo()
    const resultado = simular(inicial, 7, opciones())
    const resumen = resumirFilas(inicial.existencias, resultado.estadoNuevo.existencias, resultado.flujos)
    const de = (dominioId: Id, recursoId: Id) => resumen.find((r) => r.dominioId === dominioId && r.recursoId === recursoId)!

    expect(de(DOM.bree, RECURSO.viveres).entradas).toBeCloseTo(72, 3)
    expect(de(DOM.bree, RECURSO.madera).entradas).toBeCloseTo(35, 3)
    expect(de(DOM.bree, RECURSO.piedra).entradas).toBeCloseTo(16.667, 3)
    expect(de(DOM.bree, RECURSO.cerveza).entradas).toBeCloseTo(20, 3)
    expect(de(DOM.bree, RECURSO.lana).entradas).toBeCloseTo(12, 3)
    expect(de(DOM.bree, RECURSO.viveres).consumido).toBeCloseTo(289.333, 3)
    expect(de(DOM.bree, RECURSO.cerveza).consumido).toBeCloseTo(26.04, 3)
    expect(de(DOM.bree, RECURSO.madera).consumido).toBeCloseTo(69.44, 3)
    expect(de(DOM.archet, RECURSO.viveres).consumido).toBeCloseTo(72.333, 3)
    // Formateadas, las mismas cifras del contrato («72», «289», etc.).
    expect(formatearCantidad(de(DOM.bree, RECURSO.piedra).entradas, { unidadSingular: 'carretada', unidadPlural: 'carretadas' })).toBe(
      '17 carretadas',
    )
    expect(formatearCantidad(de(DOM.bree, RECURSO.viveres).consumido, { unidadSingular: 'saco', unidadPlural: 'sacos' })).toBe('289 sacos')
    expect(formatearCantidad(de(DOM.bree, RECURSO.cerveza).consumido, { unidadSingular: 'barril', unidadPlural: 'barriles' })).toBe(
      '26 barriles',
    )
    expect(formatearCantidad(de(DOM.bree, RECURSO.madera).consumido, { unidadSingular: 'haz', unidadPlural: 'haces' })).toBe('69 haces')
    expect(formatearCantidad(de(DOM.archet, RECURSO.viveres).consumido, { unidadSingular: 'saco', unidadPlural: 'sacos' })).toBe(
      '72 sacos',
    )

    const nuevas = resultado.estadoNuevo.produccionesRealizadas.filter((p) => p.avanceId === 'av.entregable')
    expect(nuevas).toHaveLength(5)
    const catorceDeAbril: Fecha = { anio: 1640, mes: 4, dia: 14 }
    for (const p of nuevas) {
      expect(p.fecha).toEqual(catorceDeAbril)
      expect(p.perdida).toBe(0)
    }
    const cantidades = nuevas.map((p) => Math.round(p.cantidad * 1000) / 1000).sort((a, b) => a - b)
    expect(cantidades).toEqual([12, 16.667, 20, 35, 72])

    // Obras: granero 8 % → 25 % y molino 60 % → 78 % (O2, gen l.529-532).
    const graneroAntes = progresoDeObra(inicial.obras.find((o) => o.id === OBRA.granero)!, inicial.partida.fechaActual)
    const graneroDespues = progresoDeObra(resultado.estadoNuevo.obras.find((o) => o.id === OBRA.granero)!, resultado.hasta)
    const molinoAntes = progresoDeObra(inicial.obras.find((o) => o.id === OBRA.molinoArchet)!, inicial.partida.fechaActual)
    const molinoDespues = progresoDeObra(
      resultado.estadoNuevo.obras.find((o) => o.id === OBRA.molinoArchet)!,
      resultado.hasta,
    )
    expect(graneroAntes.pct).toBe(8)
    expect(graneroDespues.pct).toBe(25)
    expect(molinoAntes.pct).toBe(60)
    expect(molinoDespues.pct).toBe(78)
  })
})

describe('A8 · previsión a 30 días, del 13 de abril al 12 de mayo (O3)', () => {
  it('resumirFilas del ejemplo: inicial, entradas, consumido, falta y final de cada fila', () => {
    const catalogo = catalogosDeEjemplo()
    const prevision = preverAlmacen(documentoDeEjemplo(), catalogo, 30)
    const resumen = resumirFilas(prevision.inicial, prevision.final, prevision.flujos)
    const r3 = (n: number): number => Math.round(n * 1000) / 1000
    const de = (dominioId: Id, recursoId: Id) => {
      const f = resumen.find((x) => x.dominioId === dominioId && x.recursoId === recursoId)!
      return { ...f, inicial: r3(f.inicial), entradas: r3(f.entradas), consumido: r3(f.consumido), falta: r3(f.falta), final: r3(f.final) }
    }

    expect(de(DOM.bree, RECURSO.viveres)).toMatchObject({ inicial: 310, entradas: 714, consumido: 975.333, consumoTeorico: 1240, falta: 264.667, final: 48.667 })
    expect(de(DOM.bree, RECURSO.viveres).tramosDeFalta).toEqual([
      { desde: { anio: 1640, mes: 4, dia: 23 }, hasta: { anio: 1640, mes: 4, dia: 25 } },
      { desde: { anio: 1640, mes: 5, dia: 7 }, hasta: { anio: 1640, mes: 5, dia: 11 } },
    ])
    expect(de(DOM.bree, RECURSO.madera)).toMatchObject({ inicial: 420, entradas: 175, consumido: 297.6, falta: 0, final: 297.4 })
    expect(de(DOM.bree, RECURSO.piedra)).toMatchObject({ inicial: 180, entradas: 83.333, consumido: 0, final: 263.333 })
    expect(de(DOM.bree, RECURSO.arcilla)).toMatchObject({ inicial: 150, entradas: 6.667, consumido: 0, final: 156.667 })
    expect(de(DOM.bree, RECURSO.hierro)).toMatchObject({ inicial: 64, entradas: 0, consumido: 0, final: 64 })
    expect(de(DOM.bree, RECURSO.cerveza)).toMatchObject({ inicial: 90, entradas: 100, consumido: 111.6, falta: 0, final: 78.4 })
    expect(de(DOM.bree, RECURSO.lana)).toMatchObject({ inicial: 35, entradas: 60, consumido: 0, final: 95 })
    expect(de(DOM.archet, RECURSO.viveres)).toMatchObject({ inicial: 900, entradas: 0, consumido: 310, consumoTeorico: 310, falta: 0, final: 590 })

    // Nada perdido ni sacado en el plazo, y el mínimo de la madera (11 de mayo) no llega a faltar (§6).
    for (const f of resumen) {
      expect(f.perdido).toBeCloseTo(0, 3)
      expect(f.sacado).toBeCloseTo(0, 3)
    }

    // Los textos que cita el contrato: «+714», «−975», «faltan 265», «quedan 49» (esp l.615-616).
    const viveresBree = de(DOM.bree, RECURSO.viveres)
    const unidadesViveres = { unidadSingular: 'saco', unidadPlural: 'sacos' }
    const conSigno = (n: number): string => `${n >= 0 ? '+' : '−'}${Math.round(Math.abs(n))}`
    expect(conSigno(viveresBree.entradas)).toBe('+714')
    expect(conSigno(-viveresBree.consumido)).toBe('−975')
    expect(`faltan ${formatearCantidad(viveresBree.falta, unidadesViveres)}`).toBe('faltan 265 sacos')
    expect(`quedan ${formatearCantidad(viveresBree.final, unidadesViveres)}`).toBe('quedan 49 sacos')
  })
})

describe('días de reserva (O4)', () => {
  it('Bree: víveres 11, madera 85, cerveza 105; sin consumo las demás; Archet víveres 88', () => {
    const reservas = diasDeReserva(documentoDeEjemplo(), catalogosDeEjemplo())
    const de = (dominioId: Id, recursoId: Id) => reservas.find((r) => r.dominioId === dominioId && r.recursoId === recursoId)!.reserva

    expect(de(DOM.bree, RECURSO.viveres)).toEqual({ tipo: 'dias', dias: 11, fecha: { anio: 1640, mes: 4, dia: 23 } })
    expect(de(DOM.bree, RECURSO.madera)).toEqual({ tipo: 'dias', dias: 85, fecha: { anio: 1640, mes: 7, dia: 6 } })
    expect(de(DOM.bree, RECURSO.cerveza)).toEqual({ tipo: 'dias', dias: 105, fecha: { anio: 1640, mes: 7, dia: 26 } })
    expect(de(DOM.bree, RECURSO.piedra)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.bree, RECURSO.arcilla)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.bree, RECURSO.hierro)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.bree, RECURSO.lana)).toEqual({ tipo: 'sinConsumo' })
    expect(de(DOM.archet, RECURSO.viveres)).toEqual({ tipo: 'dias', dias: 88, fecha: { anio: 1640, mes: 7, dia: 9 } })
  })

  it('sinFalta: una fila consumida que en 366 días no llega a faltar', () => {
    const base = conAsentamiento(estadoMinimo({ anio: 1640, mes: 4, dia: 12 }), { id: 'dom.aldea', nombre: 'Aldea', caja: 0, habitantes: 100 })
    const estado: EstadoPartida = {
      ...base,
      existencias: [
        { dominioId: 'dom.aldea', recursoId: RECURSO.viveres, cantidad: 1000000 },
        { dominioId: 'dom.aldea', recursoId: RECURSO.madera, cantidad: 1000, capacidad: 2000 },
      ],
      edificios: [],
    }
    const reservas = diasDeReserva(estado, catalogosDeEjemplo())
    const viveres = reservas.find((r) => r.dominioId === 'dom.aldea' && r.recursoId === RECURSO.viveres)!.reserva
    expect(viveres).toEqual({ tipo: 'sinFalta' })
  })
})

describe('O5 · la mina: cantidadDeOcurrencia y dos simulaciones con la edición de los trabajadores en medio', () => {
  it('cantidadDeOcurrencia(10, 25, 30) = 8,333; con el motor, subir de 2 a 3 mineros a mitad de camino da 8,333 el 1 de mayo', () => {
    expect(cantidadDeOcurrencia(10, 25, 30)).toBeCloseTo(8.333, 3)

    const primeroDeAbril: Fecha = { anio: 1640, mes: 4, dia: 1 }
    const base = conAsentamiento(estadoMinimo(primeroDeAbril), { id: 'dom.mina', nombre: 'Mina', caja: 0, habitantes: 50 })
    const edificioId = 'ed.mina'
    const produccionId = 'prod.mina'
    const estado0: EstadoPartida = {
      ...base,
      edificios: [
        {
          id: edificioId,
          dominioId: 'dom.mina',
          tipoId: idDeOpcion('tiposEdificio', 'Cantera'),
          nombre: 'Mina',
          estado: 'activo',
          trabajadoresNecesarios: 3,
          producciones: [
            {
              id: produccionId,
              recursoId: RECURSO.piedra,
              cantidad: 10,
              recurrencia: { tipo: 'mensual', diaMes: 1 },
              acumulado: { desde: { anio: 1640, mes: 4, dia: 2 }, sumaFactores: 0 },
            },
          ],
        },
      ],
      trabajadores: [
        {
          id: 'trab.mineros',
          dominioId: 'dom.mina',
          oficioId: idDeOpcion('oficios', 'Minero'),
          numero: 2,
          salario: { base: 1000 },
          recurrencia: { tipo: 'mensual', diaMes: 1 },
          edificioId,
        },
      ],
    }

    const primerTramo = simular(estado0, 15, opciones('mina1'))
    // Mensual · día 1: no hay ocurrencia en los primeros 15 días, así que sigue acumulando desde el 2 de abril.
    const acumuladoTrasQuince = primerTramo.estadoNuevo.edificios.find((e) => e.id === edificioId)?.producciones[0].acumulado
    expect(acumuladoTrasQuince?.desde).toEqual({ anio: 1640, mes: 4, dia: 2 })
    expect(acumuladoTrasQuince?.sumaFactores).toBeCloseTo(10, 3) // 15 días × 2/3
    const conTresMineros: EstadoPartida = {
      ...primerTramo.estadoNuevo,
      trabajadores: primerTramo.estadoNuevo.trabajadores.map((t) => (t.id === 'trab.mineros' ? { ...t, numero: 3 } : t)),
    }
    const segundoTramo = simular(conTresMineros, 15, opciones('mina2'))
    const elUnoDeMayo = segundoTramo.estadoNuevo.produccionesRealizadas.find(
      (p) => p.produccionId === produccionId && p.fecha.mes === 5 && p.fecha.dia === 1,
    )
    expect(elUnoDeMayo).toBeDefined()
    expect(elUnoDeMayo?.cantidad).toBeCloseTo(8.333, 3)
  })
})

describe('O12 · un año entero, 366 días (al 13 de abril de 1641)', () => {
  it('los saldos no cambian (sin obras ni caravanas programadas), y las existencias y producciones finales', () => {
    const resultado = simular(documentoDeEjemplo(), 366, opciones())
    expect(saldosPorDominio(resultado.estadoNuevo)).toEqual({
      [DOM.tharan]: 5659800,
      [DOM.bree]: 23700000,
      [DOM.archet]: 2260000,
    })

    const de = (dominioId: Id, recursoId: Id): number => fila(resultado.estadoNuevo, dominioId, recursoId).cantidad
    expect(de(DOM.bree, RECURSO.viveres)).toBeCloseTo(48.667, 3)
    expect(fila(resultado.estadoNuevo, DOM.bree, RECURSO.viveres).capacidad).toBe(2000)
    expect(de(DOM.bree, RECURSO.madera)).toBeCloseTo(25.08, 3)
    expect(de(DOM.bree, RECURSO.piedra)).toBeCloseTo(400, 3)
    expect(de(DOM.bree, RECURSO.arcilla)).toBeCloseTo(230, 3)
    expect(de(DOM.bree, RECURSO.hierro)).toBeCloseTo(64, 3)
    expect(de(DOM.bree, RECURSO.cerveza)).toBeCloseTo(16.28, 3)
    expect(de(DOM.bree, RECURSO.lana)).toBeCloseTo(100, 3)
    expect(de(DOM.archet, RECURSO.viveres)).toBeCloseTo(0, 3)

    const nuevas = resultado.estadoNuevo.produccionesRealizadas.filter((p) => p.avanceId === 'av.entregable')
    expect(nuevas).toHaveLength(277)
    const conPerdida = nuevas.filter((p) => p.perdida > 0)
    expect(conPerdida).toHaveLength(88)
    expect(conPerdida.filter((p) => p.cantidad === 0)).toHaveLength(86)
  })

  it('avanzar de uno en uno da las mismas existencias y los mismos acumulados que un avance de 366 días', () => {
    const redondearFilas = (estado: EstadoPartida) =>
      estado.existencias
        .map((e) => ({ ...e, cantidad: Math.round(e.cantidad * 1000) / 1000 }))
        .sort((a, b) => `${a.dominioId}|${a.recursoId}`.localeCompare(`${b.dominioId}|${b.recursoId}`))
    const redondearAcumulados = (estado: EstadoPartida) =>
      estado.edificios
        .flatMap((e) => e.producciones.map((p) => ({ id: p.id, desde: p.acumulado.desde, sumaFactores: Math.round(p.acumulado.sumaFactores * 1000) / 1000 })))
        .sort((a, b) => a.id.localeCompare(b.id))

    const deUnaVez = recorrerDias(documentoDeEjemplo(), sumarDias(documentoDeEjemplo().partida.fechaActual, 366), opciones('junto')).estadoNuevo

    let unoAUno: EstadoPartida = documentoDeEjemplo()
    const nuevoId = idsEnSerie('unoAUno')
    for (let dia = 0; dia < 366; dia += 1) {
      unoAUno = recorrerDias(unoAUno, sumarDias(unoAUno.partida.fechaActual, 1), {
        avanceId: 'av.dia',
        nuevoId,
        catalogo: catalogosDeEjemplo(),
      }).estadoNuevo
    }

    expect(redondearFilas(unoAUno)).toEqual(redondearFilas(deUnaVez))
    expect(redondearAcumulados(unoAUno)).toEqual(redondearAcumulados(deUnaVez))
  })
})

describe('invariantes del almacén con 1, 7, 19, 98 y 366 días', () => {
  it.each([1, 7, 19, 98, 366])('a %i días: 0 ≤ cantidad ≤ capacidad en todas las filas, y acumulados ≥ 0', (dias) => {
    const resultado = simular(documentoDeEjemplo(), dias, opciones(`inv${dias}`))
    for (const f of resultado.estadoNuevo.existencias) {
      expect(f.cantidad).toBeGreaterThanOrEqual(0)
      if (f.capacidad !== undefined) {
        expect(f.cantidad).toBeLessThanOrEqual(f.capacidad + 1e-9)
      }
    }
    for (const edificio of resultado.estadoNuevo.edificios) {
      for (const p of edificio.producciones) {
        expect(p.acumulado.sumaFactores).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it.each([1, 7, 19, 98, 366])('a %i días: el mismo resultado con los mismos ids (determinismo)', (dias) => {
    const a = simular(documentoDeEjemplo(), dias, opciones('det'))
    const b = simular(documentoDeEjemplo(), dias, opciones('det'))
    expect(a.estadoNuevo).toEqual(b.estadoNuevo)
    expect(a.avisos).toEqual(b.avisos)
    expect(a.cambios).toEqual(b.cambios)
  })

  it('no toca la entrada congelada, en ningún plazo', () => {
    for (const dias of [1, 7, 19, 98, 366]) {
      expect(() => simular(congelar(documentoDeEjemplo()), dias, opciones(`frozen${dias}`))).not.toThrow()
    }
  })
})

describe('prueba de humo del almacén', () => {
  it('5 asentamientos, 20 edificios con 2 producciones cada uno, 2 consumos, 5 obras y 5 caravanas programadas por asentamiento, 366 días, en menos de 1 s', () => {
    const recursos = [RECURSO.madera, RECURSO.piedra, RECURSO.cerveza, RECURSO.lana] as const
    const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }
    let estado: EstadoPartida = estadoMinimo(HOY)
    const asentamientos = [0, 1, 2, 3, 4].map((i) => `dom.humo${i}`)
    for (const [i, id] of asentamientos.entries()) {
      estado = conAsentamiento(estado, { id, nombre: `Humo ${i}`, caja: 1000000, habitantes: 200 })
    }
    estado = {
      ...estado,
      poblaciones: estado.poblaciones.map((p) =>
        asentamientos.includes(p.dominioId)
          ? {
              ...p,
              consumos: [
                { id: `${p.dominioId}.c1`, nombre: 'Madera', recursoId: RECURSO.madera, porHabitante: 0.005 },
                { id: `${p.dominioId}.c2`, nombre: 'Piedra', recursoId: RECURSO.piedra, porHabitante: 0.002 },
              ],
            }
          : p,
      ),
      existencias: [
        ...estado.existencias,
        ...asentamientos.flatMap((id) => recursos.map((r) => ({ dominioId: id, recursoId: r, cantidad: 500, capacidad: 5000 }))),
      ],
      edificios: asentamientos.flatMap((id, ai) =>
        [0, 1, 2, 3].map((ei) => ({
          id: `${id}.ed${ei}`,
          dominioId: id,
          tipoId: idDeOpcion('tiposEdificio', 'Cantera'),
          nombre: `Edificio ${ai}.${ei}`,
          estado: 'activo' as const,
          trabajadoresNecesarios: 0,
          producciones: [0, 1].map((pi) => ({
            id: `${id}.ed${ei}.p${pi}`,
            recursoId: recursos[(ei + pi) % recursos.length],
            cantidad: 10,
            recurrencia: { tipo: 'semanal' as const, diaSemana: (ei + pi) % 7 },
            acumulado: { desde: sumarDias(HOY, 1), sumaFactores: 0 },
          })),
        })),
      ),
      obras: asentamientos.map((id, ai) => ({
        id: `${id}.obra`,
        dominioId: id,
        nombre: `Obra ${ai}`,
        estado: 'programada' as const,
        coste: { base: 0 },
        materiales: {},
        inicio: sumarDias(HOY, 40),
        diasTotales: 10,
        efecto: { tipo: 'ampliarAlmacen' as const, recursoId: RECURSO.madera, valor: 50 },
      })),
      caravanas: asentamientos.map((id, ai) => ({
        id: `${id}.caravana`,
        dominioId: id,
        operacion: 'traslado' as const,
        destinoId: asentamientos[(ai + 1) % asentamientos.length],
        carga: { recursoId: RECURSO.madera, cantidad: 10 },
        salida: sumarDias(HOY, 50),
        vuelta: sumarDias(HOY, 53),
        estado: 'programada' as const,
      })),
    }

    const inicio = performance.now()
    const resultado = simular(estado, 366, opciones('humo'))
    const duracion = performance.now() - inicio

    expect(resultado.estadoNuevo.edificios).toHaveLength(20)
    expect(resultado.estadoNuevo.edificios.flatMap((e) => e.producciones)).toHaveLength(40)
    expect(resultado.estadoNuevo.obras.every((o) => o.estado === 'terminada')).toBe(true)
    expect(resultado.estadoNuevo.caravanas.every((c) => c.estado === 'terminada')).toBe(true)
    for (const f of resultado.estadoNuevo.existencias) {
      expect(f.cantidad).toBeGreaterThanOrEqual(0)
      if (f.capacidad !== undefined) {
        expect(f.cantidad).toBeLessThanOrEqual(f.capacidad + 1e-9)
      }
    }
    expect(duracion).toBeLessThan(1000)
  })
})
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/almacen/entregable.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  20 passed (20)
   Start at  20:36:33
   Duration  1.65s (transform 46%, tests 34%, import 20%)
```

Si algo falla, esta tabla dice a qué tarea volver. Ninguno de estos fallos se arregla tocando `entregable.test.ts`: la prueba tiene razón, porque copia las cifras y los textos de `ejemplo-cifras.md` y de `critica.md` §1, que ya verificaron el ejemplo a mano y con `fase-4/sim/`.

| Lo que falla | Qué revisar |
|---|---|
| Las cifras de P5 (O1) no dan «93 sacos», «386 haces»… | `almacen/produccion.ts` (tarea 5: `cantidadDeOcurrencia`, `factorDiario`) o `motor/pasos/produccion.ts` y `consumo.ts` (tareas 9 y 10) |
| `ProduccionRealizada` no trae 5 filas del 14 de abril, o alguna con `perdida` distinta de 0 | `motor/pasos/produccion.ts` (tarea 9): revisa el orden «primero se suma el día y después se mira la ocurrencia» y que `entra` salga de `sumarAlAlmacen`, no de una resta aparte |
| El progreso de una obra no da el `%` esperado | `almacen/progreso.ts` (tarea 6: `progresoDeObra`) o `motor/pasos/obras.ts` (tarea 12) |
| `resumirFilas` (O3) no da los tramos de falta, o los da en el orden o las fechas equivocadas | `almacen/prevision.ts` (tarea 16: `resumirFilas`), revisa que agrupa por día consecutivo, no por fila entera |
| `diasDeReserva` (O4) no da los días exactos, o confunde `sinConsumo` con `sinFalta` | `almacen/prevision.ts` (tarea 16: `diasDeReserva`) |
| La mina (O5) no da 8,333 el 1 de mayo tras subir a 3 mineros | `almacen/produccion.ts` (tarea 5: `primerDiaQueCuenta`, con «Mensual · día 1» sin `inicio`) o `motor/contexto.ts` (tarea 8: que `ctx.asignados` se recalcula en cada `simular`, no se arrastra de una llamada a otra) |
| Los saldos de O12 no son `{ 5.659.800, 23.700.000, 2.260.000 }` | esto no debería moverlo la fase 4: si cambia, algo del paso 3 o del paso 6 (obras y caravanas) está tocando dinero cuando no tiene que; revisa `motor/pasos/inicio.ts` (tarea 11) |
| Las existencias finales de O12 no cuadran, o `ProduccionRealizada` no da 277/88/86 | cualquiera de las tareas 8 a 13: es la acumulación de 366 días de todos los pasos a la vez |
| «Avanzar de uno en uno» no da lo mismo que 366 días de golpe | algún paso está usando `dia.primero` o el número de día de forma que depende de dónde empieza el recorrido, no solo de la fecha; revisa `motor/pasos/inicio.ts` y `caravanas.ts` (tareas 11 y 13), que son los que miran «fin o vuelta ya pasados» |
| Alguna fila queda con `cantidad < 0` (el invariante falla) | **este es el fallo más probable si `motor/almacen.ts` (tarea 8) calcula `entra` como `cantidad − perdida`**: con muchas producciones seguidas que llenan la capacidad exacta, la resta de dos operaciones de coma flotante que deberían cancelarse puede dar un resto negativo minúsculo (por ejemplo, `-2.13e-14`). La cantidad que entra de verdad tiene que salir de `nueva − actual` (la fila ya recortada a la capacidad menos la fila de antes), nunca de `cantidad − perdida` |
| Alguna fila queda con `cantidad > capacidad` | `motor/almacen.ts` (tarea 8: `sumarAlAlmacen` no está recortando a `fila.capacidad` exacta) |
| El mismo `simular` con los mismos ids no da el mismo resultado | algo usa `Math.random`, `Date.now()` o el orden de un `Map`/`Set` que no está garantizado; revisa que ningún paso nuevo (tareas 9 a 13) dependa de iterar `Object.keys` de un objeto con claves que no sean siempre las mismas |
| `simular` lanza al recibir la entrada `congelar`ada | algún paso (tareas 9 a 13) muta `ctx.estado` o uno de sus arrays en vez de las copias de `ctx` (`ctx.existencias`, `ctx.edificios`, `ctx.obras`, `ctx.caravanas`, `ctx.entradasAlmacen`) |
| La prueba de humo tarda más de 1 segundo | `avisos/almacen.ts` o `avisos/pendientes.ts` (tareas 17 y 18): revisa que no se recorran todas las obras o caravanas de todos los asentamientos una vez por cada uno (una `previsión` de más dentro de un bucle) |

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es aquí lo que detecta que `EstadoPartida` ha dejado de encajar con lo que espera `simular`, o que `ResumenFila` o `ReservaDeFila` ya no traen exactamente los campos que lee la prueba; `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **1.253 pruebas en 100 archivos**. La tarea 27 dejó, en la cadena real de este plan, **1.233 pruebas en 99 archivos**, y esta tarea trae **20 nuevas**: las de `entregable.test.ts`. `pureza.test.ts` no crece, porque este archivo no añade ningún módulo nuevo de `src/dominio`: solo usa los que ya existen.

```text
 Test Files  100 passed (100)
      Tests  1253 passed (1253)
```

Con esto están los **100 archivos de prueba** de la fase 4: los 81 que dejó la fase 3 y los 19 módulos nuevos (T2 a T27, uno cada uno) más este archivo, que es el número 100. La tarea 29 los cuenta uno a uno. Si el número de pruebas que ves no es 1.253, sigue con **el tuyo**: lo que esta tarea garantiza es **+20 pruebas** sobre lo que de verdad haya dejado la tarea 27, y **100 archivos exactos**.

- [ ] **Paso 6: Comprobar el estilo y la compilación completa**

```bash
npm run lint
npm run build
```

Salida esperada: `npm run lint` no escribe nada y sale con código 0; `npm run build` compila y empaqueta sin errores, con los mismos **15 módulos** de siempre:

```text
> gestion-aldeas@0.0.0 build
> tsc -b && vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 15 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.34 kB │ gzip:  0.24 kB
dist/assets/index-Rsx7aO-5.js  219.63 kB │ gzip: 68.60 kB

✓ built in 195ms
```

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/almacen/entregable.test.ts
git commit -m "test(fase-4): el entregable de la fase con los oráculos del contrato y los invariantes del almacén" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF`, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/almacen/entregable.test.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-4 e5f6a7b] test(fase-4): el entregable de la fase con los oráculos del contrato y los invariantes del almacén
 1 file changed, 406 insertions(+)
 create mode 100644 src/dominio/almacen/entregable.test.ts
```

---

## Huecos resueltos en esta tarea (grupo 7)

- **Recuento real, no la estimación del contrato**: verificado de principio a fin en un clon aislado (con una implementación propia de las tareas 2 a 26 hecha solo para poder ejecutar y comprobar de verdad las tareas 27, 28 y 29), esta tarea añade exactamente **20 pruebas**, todas de `entregable.test.ts` (ninguna en `pureza.test.ts`: no crea ningún módulo de `src/dominio`). El contrato estimaba 12 pruebas sobre una base estimada de 1.171/99 (§8: «28 | … | 12 | 1183 | 100»); tomando como partida el recuento real que deja la tarea 27 en la cadena de este plan (**1.233 en 99**, arrastrado de las tareas 3 a 26), el total correcto que deja esta tarea es **1.253 pruebas en 100 archivos**. El número de archivos sí coincide exactamente con el del contrato (100). Arrástralo a la tarea 29: su `npm test` tiene que dar 1.253, no 1.183 ni 1.203.
- **Por qué la prueba de humo no llama a `crearObra` ni a `crearCaravana` (tareas 25 y 26)**: el contrato pone la tarea 28 después de la 25 y la 26 en la tabla de dependencias, y la forma más directa de leerlo es que la prueba de humo debería construir sus veinticinco obras y veinticinco caravanas con esas funciones. Se ha resuelto **sin** esa dependencia funcional, construyendo las cinco obras y las cinco caravanas de la prueba de humo a mano, como objetos `Obra` y `Caravana` literales: es la forma más simple que cumple lo que pide el contrato (cinco asentamientos, cinco obras y cinco caravanas programadas, 366 días en menos de 1 s) sin atar `entregable.test.ts` a los detalles internos de `crearObra`/`crearCaravana` (que crean movimientos, asignan ids con `sello.nuevoId()` y devuelven `Creado<E>`, cosas que esta prueba no necesita). Las obras de la prueba de humo tienen `coste: { base: 0 }` y `materiales: {}` a propósito (D-045: con coste 0 no hay gasto), así que el paso 3 del motor (tarea 11) las puede empezar sin ningún movimiento de por medio; las caravanas son de `operacion: 'traslado'`, que tampoco mueve dinero. Si se prefiere seguir la dependencia al pie de la letra, la tarea 25 y la 26 quedan disponibles para reescribir ese bloque con `crearObra`/`crearCaravana`, pero el resultado numérico (edificios, obras y caravanas terminadas, filas dentro de su capacidad, menos de 1 s) no cambia.
- **Un error de coma flotante real, encontrado al verificar esta tarea**: la primera versión de `motor/almacen.ts` (tarea 8) calculaba `sumarAlAlmacen`'s `entra` como `cantidad − perdida`. Con la prueba de humo y con O12 (366 días, muchas producciones que llenan la capacidad exacta de una fila), esto dejaba algunas `ProduccionRealizada.cantidad` en valores como `-2.1316282072803006e-14`: matemáticamente cero, pero negativos de verdad en JavaScript, porque las dos restas (`nueva − fila.capacidad` para `perdida` y `cantidad − perdida` para `entra`) no tienen por qué cancelarse bit a bit. `EsquemaCantidadRecurso` exige `≥ 0`, así que la copia dejaba de pasar la validación al aplicarse. La solución, ya incorporada en el código de referencia de esta verificación: calcular `entra` como `nueva − actual` (la cantidad ya recortada a la capacidad, menos la cantidad de antes), que por construcción nunca es negativo. Si al ejecutar el paso 5 de esta tarea (`npm test`) alguna prueba de los invariantes falla con una cantidad ligeramente negativa, es exactamente este caso: revisa `sumarAlAlmacen` en `motor/almacen.ts` (tarea 8) antes de tocar nada de esta tarea.
- **Los textos «+714», «−975», «faltan 265», «quedan 49» (A8, O3)**: el contrato los cita como si fueran la salida de una función, pero ni `almacen/prevision.ts` ni ningún módulo de la fase 4 tiene una función que los produzca: son la forma en que A8 los va a pintar, y pintarlos es de la fase 6 (la vista A8 no se construye hasta entonces). Se ha resuelto comprobando los números que hay detrás con `resumirFilas` (`entradas: 714`, `consumido: 975,333` → `−975` redondeado, `falta: 264,667` → `formatearCantidad` da «265 sacos», `final: 48,667` → «49 sacos») y armando el signo a mano dentro de la prueba con una función `conSigno` de tres líneas, en vez de inventar una función de texto nueva en `almacen/cantidades.ts` o en `motor/textos.ts` que el contrato no pide y que ninguna otra tarea necesitaría.
- **La partida `sinFalta` de los días de reserva (O4)**: el contrato dice «se construye en la prueba» sin dar los números. Se ha resuelto con una fila de víveres de 1.000.000 de sacos y una población de 100 habitantes en un asentamiento mínimo (`estadoMinimo` + `conAsentamiento`, tarea 8): a 30 sacos por día, 1.000.000 de sacos aguantan más de 33.000 días, muy por encima del horizonte de 366 días de `diasDeReserva`, así que la fila nunca entra en un tramo de falta y da `sinFalta`.

---

### Tarea 29 · Cierre de la fase (0)

Comprueba el entregable de la fase 4: todo el almacén (población, consumos, producción, capacidad, obras, caravanas, previsión, avisos y edición) en verde, la app compilando sin errores, el linter sin avisos y cada tarea confirmada en Git. **No escribe código de dominio ni de prueba, y no hace ningún commit**: solo ejecuta comprobaciones y, si alguna falla, dice a qué tarea volver.

Depende de la tarea 28, que es la última que escribe algo. **Esta tarea no fusiona la rama `implementacion/fase-4` en `diseno/especificacion-y-vistas`, no la borra y no la sube**: a diferencia de la T29 de la fase 3, aquí eso lo hace el coordinador de la fase por separado, con la revisión final de todo el trabajo conjunto (las 29 tareas, escritas y verificadas por varios grupos a la vez). Esta tarea deja la rama lista para esa revisión: en verde, sin nada pendiente de commit y con la lista de comprobación de la fase marcada entera.

**Reglas de la especificación que implementa:**

- **Punto de partida del contrato, §0**: «El final de la fase 3, 902 pruebas en 81 archivos, `npx tsc -b`, `npm run lint` y `npm run build` en verde. La fase 4 se planifica y se verifica después de fusionar la fase 3: rama `implementacion/fase-4` desde `diseno/especificacion-y-vistas`.»
- **Qué entra en la fase, contrato §1**: población con cambios fechados; consumo de víveres y por habitante, parando en 0; producción de edificios (factor diario, periodo, acumulado, `ProduccionRealizada`); capacidad y pérdidas; los pasos 3, 6 y 7 del motor; eventos con efectos de producción y de consumo; previsión a 30 días, días de reserva, «caben N» y próxima producción; avisos de faltas, pérdidas, obras y caravanas que no pudieron empezar, edificio y mejora terminados; los cambios del avance (filas `almacen` y hechos nuevos); la edición con sus siete módulos y la tabla «Al eliminar»; y que la validación admite historia que nombra registros borrados. El paso 6 de esta tarea recorre esa lista punto por punto.
- **«Cada fase deja software que funciona» (hoja de ruta, ya citada en el cierre de las fases 1 a 3).** Por eso se comprueban las cuatro órdenes juntas: `npm test`, `npx tsc -b`, `npm run build` y `npm run lint`.
- **§8, cabecera**: «Cada tarea deja el proyecto en verde (`npx tsc -b`, `npm test`, `npm run lint`, `npm run build`) y termina con su commit (salvo la 1 y la 29).» Esta tarea comprueba que las 27 tareas intermedias (2 a 28) cumplieron las dos cosas.
- **§10, «Lo que queda para las fases siguientes»**: la lista que cierra este documento es la del contrato, con lo que la fase 4 deja hecho para quien la recoja.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`), en la rama `implementacion/fase-4`.

**Archivos:** ninguno. Esta tarea solo ejecuta comprobaciones.

- [ ] **Paso 1: Ejecutar todas las pruebas**

```bash
npm test
```

Salida esperada (la hora y la duración varían):

```text
> gestion-aldeas@0.0.0 test
> vitest run


 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  100 passed (100)
      Tests  1253 passed (1253)
```

Vitest 5 puede añadir al final un aviso de rendimiento («persist transforms across runs with `fsModuleCache: true`»). **No es un fallo** y no hay que hacer nada: lo que cuenta es que no haya ni un `failed`.

Si el número no es exactamente 1.253 en 100 archivos, no lo fuerces: recorre las tareas 2 a 28 con `npx vitest run <ruta>` una por una y compara con el recuento que deja cada una en su propio documento (cada tarea que se desvió de la estimación del contrato lo anotó en sus «Huecos», y las tareas 6 a 27 encadenan sus propias correcciones desde 902/81 hasta **1.233 en 99**, antes de que la tarea 28 sume sus 20 pruebas). Lo único que **no puede** variar es el número de archivos: son **100** exactos, uno por cada tarea que crea un módulo o un archivo de prueba nuevo (T2 a T27, diecinueve módulos con su prueba, más `entregable.test.ts` de la T28), sobre los 81 de la fase 3.

- [ ] **Paso 2: Comprobar los tipos de todo el proyecto**

`vitest run` no comprueba tipos: los esquemas Zod, los tipos inferidos con `z.infer` y las firmas exactas de §3 del contrato solo se atan con el compilador.

```bash
npx tsc -b
```

Salida esperada: **ninguna línea**. Si escribe algo, es un error de tipos y hay que arreglarlo en la tarea que escribió el archivo que nombra (el mensaje de `tsc` da la ruta).

- [ ] **Paso 3: Compilar la app**

`npm run build` comprueba antes los tipos de todo `src/` con `tsc -b`, también los de las pruebas, y después empaqueta la app.

```bash
npm run build
```

Salida esperada (el tiempo y el nombre del `.js` varían). Siguen siendo **15 módulos**, los mismos que en las fases 1 a 3: la app todavía no importa `src/dominio/almacen`, `src/dominio/avisos` ni `src/dominio/edicion` desde ninguna pantalla, porque las pantallas empiezan en la fase 6:

```text
> gestion-aldeas@0.0.0 build
> tsc -b && vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 15 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.34 kB │ gzip:  0.24 kB
dist/assets/index-Rsx7aO-5.js  219.63 kB │ gzip: 68.60 kB

✓ built in 195ms
```

- [ ] **Paso 4: Pasar el linter**

```bash
npm run lint
```

Salida esperada: `oxlint` **no escribe nada** y sale con código 0. Si quieres verlo, `echo $?` justo después debe dar `0`:

```text
> gestion-aldeas@0.0.0 lint
> oxlint
```

- [ ] **Paso 5: Comprobar que no queda nada pendiente de commit**

Cada tarea de la fase 4, salvo la 1 y esta, termina con su commit, así que el árbol debe estar limpio y el historial debe tener **27 commits** de esta fase sobre el último commit de la fase 3 (las tareas 2 a 28; ni la 1 ni la 29 hacen ninguno).

```bash
git status --short
git log --oneline -27
```

Salida esperada: `git status --short` no escribe nada (`dist/` y `node_modules/` están en `.gitignore`), y `git log` muestra los 27 commits de la fase, del más reciente al más antiguo (los identificadores varían):

```text
<hash> test(fase-4): el entregable de la fase con los oráculos del contrato y los invariantes del almacén
<hash> feat(edicion): terminar hoy y borrar eventos
<hash> feat(edicion): crear, editar y borrar caravanas
<hash> feat(edicion): crear, empezar, planificar, editar y borrar obras
<hash> feat(edicion): días de viaje, rutas, precios y borrado de mercados
<hash> feat(edicion): crear, guardar y borrar edificios
<hash> feat(edicion): compras y recepciones del almacén
<hash> feat(edicion): existencias, ajustes y borrado de una fila
<hash> fix(validacion): la historia puede nombrar lo borrado
<hash> feat(avisos): avisosEn junta las faltas, pérdidas, obras, caravanas y edificios, con lo ocurrido
<hash> feat(avisos): obras, caravanas y compras que no pudieron empezar, edificio y mejora terminados
<hash> feat(avisos): faltas y pérdidas de almacén, ocurridas y previstas
<hash> feat(almacen): previsión a 30 días, días de reserva y próximas producciones
<hash> feat(motor): cambios del avance con las filas de almacén y los hechos nuevos
<hash> feat(motor): el bucle con los pasos del almacén
<hash> feat(motor): paso 7, llegada de compras y traslados
<hash> feat(motor): paso 6, obras
<hash> feat(motor): paso 3, inicio de obras, caravanas y compras
<hash> feat(motor): paso 5, consumo
<hash> feat(motor): paso 4, producción
<hash> feat(motor): contexto, caja y almacén del motor
<hash> feat(motor): textos del almacén
<hash> feat(almacen): progreso de obras y caravanas
<hash> feat(almacen): producción, factor diario, periodo y cantidad
<hash> feat(eventos): eventosConEfectosEl, pctDeProduccion y pctDeConsumo
<hash> feat(almacen): cantidades del almacén
<hash> feat(calendario): días de un tramo del avance
```

Lo que se comprueba aquí es que hay **un commit por tarea (2 a 28) y ninguno de más**, que cada uno termina con su línea `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` (`git log -27 --format='%B' | grep -c 'Co-Authored-By'` tiene que dar 27) y que el árbol está limpio. El texto exacto de cada mensaje puede no coincidir con el de arriba: **manda el que escribió cada tarea en su propio documento**, no esta lista, que es solo una guía de qué tiene que estar. Si falta alguno o `git status --short` lista algún archivo, la tabla del paso 1 de cada tarea dice qué crea: vuelve a esa tarea, ejecuta su `git add` y su `git commit` tal como están escritos, y repite este paso.

- [ ] **Paso 6: Recorrer la lista de comprobación del entregable**

Esto es lo que la hoja de ruta y el contrato piden de la fase 4 (contrato §1, «Entra»). Cada punto se puede comprobar solo, con el comando de su fila; todos juntos son el `npm test` del paso 1.

- [ ] **Población con cambios fechados, y consumo de víveres y por habitante parando en 0.**

  ```bash
  npx vitest run src/dominio/poblacion src/dominio/motor/pasos/consumo.test.ts
  ```

- [ ] **Producción de edificios: factor diario, periodo, acumulado y `ProduccionRealizada`, con capacidad y pérdidas.**

  ```bash
  npx vitest run src/dominio/almacen/produccion.test.ts src/dominio/motor/pasos/produccion.test.ts src/dominio/motor/almacen.test.ts
  ```

- [ ] **Los pasos 3, 6 y 7 del motor (inicio, obras, llegada de compras y traslados).**

  ```bash
  npx vitest run src/dominio/motor/pasos/inicio.test.ts src/dominio/motor/pasos/obras.test.ts src/dominio/motor/pasos/caravanas.test.ts
  ```

- [ ] **Eventos con efectos de producción y de consumo.**

  ```bash
  npx vitest run src/dominio/eventos/efectos.test.ts
  ```

- [ ] **Previsión a 30 días, días de reserva, «caben N el día de llegada» y próxima producción (A7, A7b, A10b).**

  ```bash
  npx vitest run src/dominio/almacen/prevision.test.ts
  ```

- [ ] **Avisos de faltas, pérdidas, obras y caravanas que no pudieron empezar, edificio y mejora terminados.**

  ```bash
  npx vitest run src/dominio/avisos
  ```

- [ ] **Los cambios del avance: filas `almacen` y los hechos nuevos de «Qué ha pasado» (D-052).**

  ```bash
  npx vitest run src/dominio/motor/cambios.test.ts
  ```

- [ ] **La edición: existencias, entradas, edificios, mercados, obras, caravanas y eventos, con la tabla «Al eliminar».**

  ```bash
  npx vitest run src/dominio/edicion
  ```

- [ ] **La validación admite historia que nombra registros borrados (D-055).**

  ```bash
  npx vitest run src/dominio/validacion/referencias.test.ts
  ```

- [ ] **El entregable entero, con los oráculos del contrato (O1 a O5, O12) y los invariantes del almacén.**

  ```bash
  npx vitest run src/dominio/almacen/entregable.test.ts src/dominio/motor/entregable.test.ts
  ```

- [ ] **El dominio sigue siendo puro.** Ni Dexie, ni React, ni APIs del navegador en ninguno de los módulos nuevos de `src/dominio` (diecinueve módulos: T2 a T27).

  ```bash
  npx vitest run src/dominio/pureza.test.ts
  ```

- [ ] **La configuración no se ha tocado.** `vite.config.ts`, los tres `tsconfig*.json` y `.oxlintrc.json` están igual que al acabar la fase 3; el `package.json` no ganó ninguna dependencia nueva (la fase 4 no añade ninguna librería).

  ```bash
  git diff --stat <primer-commit-de-la-fase>~1 -- vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json .oxlintrc.json
  git diff <primer-commit-de-la-fase>~1 -- package.json
  ```

  `<primer-commit-de-la-fase>~1` es el commit con el que empezó la fase 4, es decir, el último de la fase 3 (el primero de los 27 que lista el paso 5 es el más reciente, así que el primero de la fase es el último de la lista, y su padre es este). El primer comando no escribe nada; el segundo no escribe nada tampoco.

Con la lista entera marcada, **la fase 4 está verificada y lista para la revisión final y la fusión**, que hace el coordinador aparte (no esta tarea): revisión de las 29 tareas en conjunto, fusión en local de `implementacion/fase-4` en `diseno/especificacion-y-vistas`, borrado de la rama y subida sin PR, como hizo la fase 3. Lo siguiente, ya fuera de esta fase, es escribir el plan de la fase 5 («Motor III: deudas e intereses») en `docs/superpowers/plans/`.

---

## Lo que queda para las fases siguientes

La fase 4 deja el almacén completo — población, consumo, producción, capacidad, obras, caravanas, previsión, avisos y su edición —, pero dos pasos del día y toda la interfaz siguen sin escribirse. Esto es lo que queda apuntado, con lo que la fase 4 ya ha dejado hecho para que quien lo recoja no empiece de cero (contrato §10):

1. **Fase 5 (Motor III: deudas e intereses).** El paso 10 (intereses y vencimientos) entra entre el paso 9 (pagos) y el final de `PASOS_DEL_DIA`; `motor/bucle.ts` ya tiene sitio para él, porque `PASOS_DEL_DIA` es una lista ordenable y cada paso nuevo de la fase 4 se añadió del mismo modo, sin tocar los que ya existían.
2. **Fase 6 (interfaz base).** P4 y P5 pueden pintarse ya con `ResultadoSimulacion.flujos`, las `ProduccionRealizada` del avance y `avisos`; las vistas P4, P5 e Inicio del día 19 del ejemplo ganan el aviso de la lana que no estaba en la especificación original (D-050, decidido y anotado como diferencia). Falta: calcular `avisosEn` y las previsiones **una vez por estado** (hoy cada pantalla que los necesite tendría que volver a simular; conviene cachearlo en el nivel de la pantalla, no del dominio, que sigue puro); las marcas del calendario («Sin víveres», producción por asentamiento y día) a partir de los flujos y `produccionesRealizadas`; y pintar «eliminado» donde la historia nombra un registro que ya no está (D-055, que la validación ya admite desde la tarea 20).
3. **Fase 8 (asentamiento).** A4 (población), A7/A7b (con `proximasProducciones` sobre una copia que pase por `guardarEdificio`, para «simular el formulario» antes de guardar de verdad), A8/A8b (falta editar una compra o recepción ya guardada: la fase 4 solo la borra y la vuelve a crear; «Añadir existencias» en un mercado que no es el local tiene que llamar a `crearCaravana`, D-054, no a `crearEntradaAlmacen`), A9/A9b, A10/A10b/A10c (con `cabenElDia` y `resumirFilas` para el texto «Días con falta … de 3 a 0 días»), A11/A11b; y las altas y ediciones sin reglas propias que la fase 4 dejó fuera a propósito (cambio de población, consumo por habitante, evento nuevo, defensa, mercado nuevo): son reemplazos simples con `reemplazarPorId` que no necesitan su propio módulo de `edicion/`.
4. **`docs/decisiones.md` sigue con pendientes abiertos** que no son de esta fase: el interés de una deuda (fase 5), las formas de fecha y ocho casos límite (fase 6), y dos anotaciones del canvas (fase 8).
5. **El almacén no comprueba coherencia con el histórico de producción.** `validarCoherenciaInterna` (fase 2) no cuadra `Existencia.cantidad` con la suma de `ProduccionRealizada`, las entradas, los ajustes y el consumo: es un cálculo del motor, y la fase 2 ya dejó anotado que esa decisión queda para cuando el motor exista. La fase 4 lo deja exactamente igual de abierto: si hace falta, se añade como prueba del motor o como regla nueva de `validarCoherenciaInterna`, y es una decisión de quien la necesite, no de esta fase.
6. **El tamaño de la copia sigue creciendo.** Cada avance añade filas a `produccionesRealizadas` (277 en un año, con el ejemplo) además de los movimientos que ya sumaba la fase 3; el aviso 5 del contrato de la fase 2 sobre el tamaño del `snapshotPrevio` se agrava un poco con cada fase nueva del motor, pero sigue sin ser un problema real para una partida de mesa.

