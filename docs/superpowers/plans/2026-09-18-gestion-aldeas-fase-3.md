# Gestión de Aldeas · Fase 3 · Motor I: dinero

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para llevar el seguimiento.

**Objetivo:** que «Avanzar días» calcule de verdad el dinero de la partida —salarios, soldadas, tributos, impuestos y rentas, impuestos de locales comerciales, beneficios de inversiones y la vuelta de las caravanas de venta, con sus impagos y sus avisos—, que la vista previa de un avance se pueda aplicar o deshacer, y que los registros de dinero (movimientos sueltos, transferencias, reglas recurrentes y locales comerciales) se puedan crear, editar y borrar.

**Arquitectura:**
- **El motor puro en `src/dominio/motor/`**: `simular(estado, dias, opciones)` recorre del día siguiente a `fechaActual` hasta `fechaActual + dias`, día a día, con los pasos de `PASOS_DEL_DIA` (`motor/bucle.ts`) en el orden de §9: eventos, vuelta de las ventas en ruta, cobros y pagos. Cada paso vive en su propio archivo de `src/dominio/motor/pasos/`. Toda la simulación gira sobre un único `Contexto` (`motor/contexto.ts`), la única pieza mutable de todo el motor: guarda los saldos vivos, los movimientos nuevos y los índices que evitan recorrer arrays dentro del bucle, y se descarta al terminar. `simular` nunca muta su entrada ni toca IndexedDB.
- **Las previsiones reutilizan el mismo bucle**: `recorrerDias` (`motor/bucle.ts`) hace el mismo recorrido sin avisos, y la alimentan tanto el aviso «Pago no cubierto» (`avisos/pagoNoCubierto.ts`) como cualquier vista previa futura.
- **Aplicar y deshacer, puros, en `src/dominio/avance/`**: `aplicarAvance` escribe el estado nuevo, pone el contador de cambios a 0 y guarda la copia del estado anterior solo en el último avance; `deshacerUltimoAvance` la restaura. `src/datos/avances.ts` los guarda con `guardarPartida`, en una sola transacción.
- **La edición de los registros de dinero, pura, en `src/dominio/edicion/`**: crear, editar y eliminar movimientos sueltos, transferencias, reglas recurrentes y locales comerciales, con la tabla «Al eliminar» de §6.4. Todas devuelven la misma referencia si nada cambia, y ninguna cuenta el cambio: lo cuenta `guardarEdicion` (`src/datos/ediciones.ts`), y solo si algo cambió de verdad.
- **No hay esquemas Zod nuevos.** Todo lo que el motor guarda ya cabe en el formato 1 que dejó la fase 2 (`VERSION_FORMATO` no sube). Cambian cuatro comprobaciones de validación y se añade una función, `estadoDe`, que sí es nueva.
- **La fase 3 adelanta una parte de las fases 4 y 5 (D-019)**: los beneficios de las inversiones, los eventos que cambian impuestos, rentas y gastos, y el cobro al volver de las caravanas de venta. Sin eso, el entregable de esta fase no daría las cifras que promete la hoja de ruta. La fase 4 conserva las caravanas «salida y llegada» y los eventos «de producción y consumo»; la fase 5 conserva la «retirada» de una inversión y su «vencimiento como aviso».

**Tecnología:** la misma que las fases 1 y 2 (Node 24, Vite 8, React 19, TypeScript 6 estricto, oxlint y Vitest 5). Esta fase **no instala ninguna dependencia nueva**: ni `package.json` ni `package-lock.json` se tocan.

**Referencias:**
- Especificación: `docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md`.
- Hoja de ruta: `docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md`. Plan de la fase 2: `docs/superpowers/plans/2026-09-17-gestion-aldeas-fase-2.md`.
- Decisiones tomadas sin preguntar: `docs/decisiones.md`, sección «Fase 3 · Motor de dinero (2026-09-18)», D-019 a D-042 (la tarea 1 comprueba que ya están).
- Vistas: `design/artboards/*.dc.html`. El ejemplo de toda la fase es «La Sombra del Este» el 12 de abril de 1640 T.E.; la vista previa P4 (del 12 al 19 de abril) es el caso de prueba de la tarea 28.

**Sobre las citas a «T» y a los informes de trabajo:** varias tareas citan una «técnica Tn» (una decisión técnica, sin efecto en las reglas del juego) o un documento de trabajo (`contrato.md`, `decisiones-fase-3.md`, `motor-y-orden.md`…) con el que se escribió este plan. Son **notas de procedencia**, para saber de dónde sale cada forma: no hay que buscarlas ni consultarlas. Todo lo necesario para ejecutar el plan está en este documento, con el código entero en cada paso.

**Reglas que valen en todas las tareas:**
- Identificadores en castellano, **sin tildes ni eñes** (`anadirObjetoComprado`, `anio`, `pagarHasta`); los textos que ve el jugador sí llevan tildes.
- TypeScript estricto; sin punto y coma, comillas simples, 2 espacios, comas finales, ancho ~120 (el estilo de las fases 1 y 2).
- `src/dominio` es puro: sin Dexie, sin React y sin `indexedDB`, `localStorage`, `window`, `document`, `navigator` ni `crypto`. Zod sí está permitido. `pureza.test.ts` suma un caso por cada módulo nuevo del dominio, también los que solo usan las pruebas (`motor/pruebas/constructores.ts`).
- El dinero se guarda en enteros de hierro (mh), nunca en coma flotante. Los importes de reglas y registros son magnitudes ≥ 0; solo `Movimiento.importe.base` lleva signo, y nunca `−0`.
- Imports relativos sin extensión, sin archivos barril (`index.ts`), JSDoc de una línea en castellano citando la sección de la especificación.
- Orden TDD en cada tarea: la prueba que falla (con su fallo literal) → la implementación mínima → la prueba que pasa → `npx tsc -b` y `npm test` con su recuento → el commit.
- Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`) o el clon donde se ejecute el plan.

---

## Qué entra y qué no en esta fase

**Alcance** (hoja de ruta, «Fase 3 · Motor I: dinero», con el adelanto de D-019):

- bucle día a día con el orden de pasos de §9: eventos, vuelta de las caravanas de venta, cobros y pagos;
- movimientos agrupados: diarios por avance; salarios y soldadas por asentamiento y día; locales por asentamiento y día, con su detalle;
- gastos e ingresos recurrentes (J5), salarios (A5), soldadas (A6), impuestos fijos y por habitante, tributos (A3) e impuestos de locales comerciales (§7), con `cobradoHasta`, estado abierto o cerrado y producción anotada;
- pagos y cobros programados;
- **adelantado de las fases 4 y 5 para que el entregable cuadre (D-019)**: los beneficios de las inversiones, los eventos que cambian impuestos, rentas y gastos, y el cobro al volver de las caravanas de venta;
- impagos con contraparte automática; el motor nunca deja una caja en negativo;
- avisos de dinero de la tabla de §9: saldo negativo, impago y pago no cubierto;
- aplicar un avance y deshacer el último (copia completa, avisos de cambios posteriores);
- balance mensual y resultado fiscal (§7);
- reglas de edición y borrado de los registros de dinero: movimientos vinculados que se editan desde su origen, transferencias y la tabla «Al eliminar» (§6.4) para reglas recurrentes, trabajadores, unidades de la guarnición y locales comerciales.

**Entregable** (hoja de ruta, l.67): «pruebas que reproducen la vista previa P4 del ejemplo: Tharan +0,66 mo, Bree +39,9 mo, Archet −60 mo y 8 movimientos. También el balance de Bree (−11,5 mo), el resultado fiscal (+19 mo) y el cobro de locales del 1 de mayo (+4,5 mo)». La tarea 28 reproduce el apartado entero con la partida de ejemplo y sus invariantes, y la tarea 29 cierra la fase sobre ese resultado.

**Lo que NO entra en esta fase:**
- **Ninguna pantalla**: la interfaz empieza en la fase 6. Los diálogos J2b-J2f, A2b, A3b y A3c que llaman a las funciones de `edicion/` son de las fases 7 y 8.
- **El almacén** (fase 4): población, consumo de recursos, producción de edificios, obras, caravanas de compra y traslado (esta fase solo cobra la **vuelta** de una venta, D-019) y eventos de producción y consumo.
- **Las deudas, las inversiones y el inventario del personaje** (fase 5): el paso 10 de §9 (devengos e intereses), los pagos «Se aplica a», el vencimiento de una deuda como aviso, la **retirada** de una inversión (esta fase solo cobra sus beneficios, D-019), la venta y el archivado del inventario más allá de «Añadir también al inventario» de un pago programado, y el estudio de hechizos.
- **Ningún esquema Zod nuevo** ni cambio de `VERSION_FORMATO`: todo lo que el motor guarda ya cabe en el formato 1.

---

## Estructura de archivos de la fase 3

`M` = módulo que se modifica; `N` = módulo nuevo; `[tarea n]` = la tarea de este plan que lo crea o lo cambia. Cada módulo nuevo lleva su prueba al lado (`*.test.ts`), salvo `motor/tipos.ts`, que solo tiene tipos. `vite.config.ts`, `package.json` y los esquemas de `modelo/` (salvo la comprobación nueva de `movimientos.ts` y el JSDoc de `avance.ts`) **no se tocan**: la fase no instala ninguna dependencia nueva.

```
docs/decisiones.md                          M  sección «Fase 3» con D-019 a D-042; pendientes cerrados o cambiados            [tarea 1]
docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md
                                            M  hoja de ruta: alcance de las fases 3, 4 y 5 según D-019                        [tarea 1]

src/dominio/dinero/importe.ts               M  normalizarCantidad; importeDesde guarda lo tecleado normalizado                [tarea 2]
src/dominio/calendario/formatoFecha.ts      M  formatearMeses, formatearDiaCercano y formatearDiaDelAvance                    [tarea 3]
src/dominio/dinero/prorrateo.ts             M  sumarAlMes: suma exacta al mes con un solo redondeo                            [tarea 4]
src/dominio/modelo/documento.ts             M  estadoDe: las 34 claves del estado sin `avances`                               [tarea 5]
src/dominio/modelo/movimientos.ts           M  un vinculado solo queda programado si es de obra, caravana o compra (D-033)    [tarea 5]
src/dominio/modelo/avance.ts                M  solo el JSDoc de EsquemaAvisoAvance                                            [tarea 5]
src/dominio/ejemplo/asentamientosDinero.ts  M  «Pastor» con 1 en el detalle de salarios del 6 de abril                        [tarea 5]
src/dominio/ejemplo/partidaYPersonaje.ts    M  el beneficio del Tonel lleva introducido «3 mo»                                [tarea 5]
src/dominio/validacion/coherencia.ts        M  detalle = total solo sin editadoEl; fuera «alquilado sin renta»                [tarea 6]
src/dominio/validacion/referencias.ts       M  origenImpago puede apuntar a un registro borrado                              [tarea 6]

src/dominio/poblacion/habitantes.ts         N  habitantes de un día: iniciales + cambios hasta ese día (§7)                   [tarea 7]
src/dominio/eventos/efectos.ts              N  eventos activos y su efecto sobre costes e ingresos (§7, D-026)                [tarea 7]
src/dominio/locales/impuesto.ts             N  reglas puras de los locales: estado, meses por cobrar, impuesto y equivalente  [tarea 8]
src/dominio/dinero/balance.ts               N  balance mensual y resultado fiscal de un asentamiento (§7)                     [tarea 9]
src/dominio/motor/tipos.ts                  N  NuevoId, OpcionesSimulacion, Suceso, AvisoConFecha y ResultadoSimulacion       [tarea 10]
src/dominio/motor/ids.ts                    N  idsEnSerie: ids deterministas para pruebas y previsiones                       [tarea 10]
src/dominio/motor/pruebas/constructores.ts  N  ayudantes de pruebas: estadoMinimo, conAsentamiento y congelar                  [tarea 10]
src/dominio/motor/textos.ts                 N  conceptos, nombres de detalle, contrapartes, hechos y textos de avisos         [tarea 11]
src/dominio/inventario/compra.ts            N  crear o sumar el objeto de un gasto con «Añadir también al inventario»        [tarea 12]
src/dominio/motor/contexto.ts               N  Dia, Contexto, crearContexto, anadirMovimiento y estadoFinal                   [tarea 13]
src/dominio/motor/caja.ts                   N  cobrar y pagarHasta: el saldo vivo nunca baja de 0 por el motor                [tarea 13]
src/dominio/motor/impagos.ts                N  persona de la contraparte y deuda de impago por origen con sus cargos         [tarea 13]
src/dominio/motor/diarios.ts                N  acumular los conceptos diarios y crear su movimiento el último día            [tarea 14]
src/dominio/motor/pasos/cobros.ts           N  paso 8: impuestos y rentas, locales, beneficios, ingresos y cobros programados [tarea 15]
src/dominio/motor/pasos/locales.ts          N  paso 8, locales: un cobro por asentamiento y día con su detalle y cobradoHasta [tarea 16]
src/dominio/motor/pasos/pagos.ts            N  paso 9 por filas: salarios, soldadas, tributos, gastos y pagos programados     [tarea 17]
src/dominio/motor/pasos/caravanas.ts        N  paso 7, solo dinero: la venta que vuelve cobra y queda terminada              [tarea 18]
src/dominio/motor/bucle.ts                  N  pasoEventos, PASOS_DEL_DIA y recorrerDias (sin avisos)                        [tarea 19]
src/dominio/motor/cambios.ts                N  CambioAvance[]: una fila «saldo» por dominio y los hechos                     [tarea 19]
src/dominio/avisos/dinero.ts                N  avisos de saldo negativo e impago, evaluados en la fecha actual               [tarea 20]
src/dominio/avisos/pagoNoCubierto.ts        N  «Pago no cubierto» con una previsión de recorrerDias                          [tarea 20]
src/dominio/avisos/avisos.ts                N  avisosEn, ordenarAvisos y sinFecha                                            [tarea 20]
src/dominio/avance/dias.ts                  N  días válidos, días hasta una fecha y tope del 31/12/9999                      [tarea 21]
src/dominio/motor/simular.ts                N  simular: la API pública del motor                                             [tarea 21]
src/dominio/avance/aplicar.ts               N  aplicarAvance: estado nuevo, contador a 0 y Avance con su copia               [tarea 22]
src/dominio/avance/deshacer.ts              N  puedeDeshacer, cambiosQueSePerderan, deshacerUltimoAvance y avanceDelMovimiento [tarea 22]
src/dominio/edicion/registros.ts            N  Sello, Creado, mismoRegistro, reemplazarPorId, quitarPorId y contarCambio      [tarea 23]
src/dominio/edicion/movimientos.ts          N  crear, editar y eliminar movimientos sueltos; rechazar los vinculados          [tarea 23]
src/dominio/edicion/transferencias.ts       N  crear, editar y eliminar transferencias con sus dos lados                      [tarea 24]
src/dominio/edicion/reglas.ts               N  interruptor de J5 y «Al eliminar» de recurrentes, impuestos, trabajadores y unidades [tarea 25]
src/dominio/edicion/locales.ts              N  alta, estado desde mañana, producción del mes y borrado de locales y tipos     [tarea 26]
src/datos/avances.ts                        N  guardarAvance y deshacerAvanceGuardado                                        [tarea 27]
src/datos/ediciones.ts                      N  guardarEdicion: solo escribe si algo cambió y cuenta el cambio                [tarea 27]
src/dominio/motor/entregable.test.ts        N  el entregable de la hoja con la partida de ejemplo, y los invariantes         [tarea 28]
```

Totales: **31 módulos nuevos** del dominio con su prueba (30 con código de producción y `motor/tipos.ts`, solo de tipos) más `src/datos/avances.ts` y `src/datos/ediciones.ts`; **10 módulos existentes modificados**, sin ninguno nuevo en `modelo/`; y **1 archivo de prueba** sin código de producción propio (`motor/entregable.test.ts`, tarea 28). Con el caso que suma cada módulo nuevo a `pureza.test.ts`, la fase cierra con **902 pruebas en 81 archivos**, partiendo de las **568 en 48** que deja la fase 2.

---

## Índice de las 29 tareas

Cada tarea deja el proyecto en verde (`npx tsc -b`, `npm test`, `npm run lint` y `npm run build`) y termina con su commit (salvo la 1 y la 29, que no cambian código), así que se pueden ejecutar una a una y parar donde haga falta. El orden es el de la tabla: **ninguna tarea usa nada que escriba una posterior** — se ha comprobado con un guion sobre los `import` y los `export` de las 29 tareas.

Los recuentos están **encadenados** y parten de las **568 pruebas en 48 archivos** que deja la fase 2. La columna «Nuevas» incluye el crecimiento de `pureza.test.ts`, que suma una prueba por cada módulo nuevo de `src/dominio` sin que nadie lo toque a mano. La fase cierra con **902 pruebas en 81 archivos**.

| # | Tarea | Depende de | Nuevas | Total de `npm test` | Archivos de prueba |
|---|---|---|---|---|---|
| — | *(punto de partida: fase 2)* | — | — | 568 | 48 |
| 1 | Registro de decisiones y hoja de ruta | — | 0 | 568 | 48 |
| 2 | Lo tecleado, normalizado | — | 6 | 574 | 48 |
| 3 | Formatos de meses y días | — | 10 | 584 | 48 |
| 4 | Suma exacta al mes | — | 5 | 589 | 48 |
| 5 | Modelo y ejemplo | — | 7 | 596 | 48 |
| 6 | Validación que el motor necesita | 5 | 5 | 601 | 48 |
| 7 | Habitantes y efectos de eventos | — | 17 | 618 | 50 |
| 8 | Reglas de los locales | 7 | 15 | 633 | 51 |
| 9 | Balance mensual y resultado fiscal | 4, 7, 8 | 9 | 642 | 52 |
| 10 | Tipos, ids y ayudantes del motor | 5 | 8 | 650 | 54 |
| 11 | Textos del motor | 3 | 21 | 671 | 55 |
| 12 | Objeto de un pago programado | 10 | 7 | 678 | 56 |
| 13 | Contexto, caja e impagos | 5, 10, 11 | 22 | 700 | 59 |
| 14 | Conceptos diarios | 11, 13 | 8 | 708 | 60 |
| 15 | Paso 8: cobros | 7, 13, 14 | 12 | 720 | 61 |
| 16 | Paso 8: locales | 8, 15 | 10 | 730 | 62 |
| 17 | Paso 9: pagos | 7, 12, 13, 14 | 16 | 746 | 63 |
| 18 | Paso 7: vuelta de ventas | 11, 13 | 6 | 752 | 64 |
| 19 | Bucle y cambios | 15, 16, 17, 18 | 14 | 766 | 66 |
| 20 | Avisos de dinero | 11, 19 | 21 | 787 | 69 |
| 21 | `simular` y días de avance | 19, 20 | 18 | 805 | 71 |
| 22 | Aplicar y deshacer | 5, 21 | 15 | 820 | 73 |
| 23 | Movimientos sueltos | 12 | 21 | 841 | 75 |
| 24 | Transferencias | 23 | 10 | 851 | 76 |
| 25 | Reglas: interruptor y «Al eliminar» | 23 | 10 | 861 | 77 |
| 26 | Locales: alta, estado y producción | 8, 23 | 14 | 875 | 78 |
| 27 | Guardar avances y ediciones | 22, 23 | 9 | 884 | 80 |
| 28 | Entregable de la fase 3 | 9, 21, 22 | 18 | 902 | 81 |
| 29 | Cierre de la fase | 28 | 0 | 902 | 81 |
| | **Total de la fase 3** | | **334** | **902** | **81** |

Si al ejecutar una tarea el recuento no es el de su fila, manda lo que imprime Vitest: sigue con **tu** número y comprueba que la diferencia se mantiene constante hasta el final. Lo que no puede cambiar es el número de **archivos**, porque cada uno lo crea una tarea concreta.

---

## Las 29 tareas

### Tarea 1 · Registro de decisiones y hoja de ruta

Antes de escribir código hay que tener por escrito lo que la fase 3 decide sin preguntar. Eso **ya está hecho**: el commit `f8d6aec` («docs: decisiones D-019 a D-042 de la fase 3 y alcance adelantado en la hoja de ruta») añadió a `docs/decisiones.md` la sección «Fase 3 · Motor de dinero (2026-09-18)» con las decisiones D-019 a D-042, cerró los pendientes que la fase resuelve y apuntó en la hoja de ruta que la fase 3 adelanta parte de las fases 4 y 5 (D-019). Esta tarea **solo comprueba** que todo eso está en la rama de la fase y que el proyecto arranca en verde: no escribe pruebas, no cambia ningún archivo y no hace commit.

Si alguna comprobación no da lo esperado, **para**: la rama no parte del punto correcto y las tareas siguientes no cuadrarán.

**Reglas de la especificación que implementa:**

- **Ninguna regla del juego.** Esta tarea no toca `src/` ni la especificación. Lo que comprueba viene de `CLAUDE.md`:
  - **Registro de decisiones.** «Anota **cada** decisión en `docs/decisiones.md` para que el usuario pueda cambiarla luego.» Las 24 decisiones de la fase (D-019 a D-042) están en una tabla con su identificador, la decisión y el porqué, de la más reciente a la más antigua dentro de su fase.
  - **La especificación no se reescribe sin preguntar.** «Sigue preguntando solo en estos casos: […] borrar o reescribir trabajo del usuario (ramas, historial, la especificación, el canvas de diseño)». Por eso las desviaciones de la fase (D-033 restringe fechas, D-035 matiza el «sin regla» de §6.4 l.782 y D-039 matiza el «siempre se puede» de §9 l.1326) viven en `docs/decisiones.md` y **no** en la especificación: el commit `f8d6aec` solo toca `docs/decisiones.md` y la hoja de ruta.
  - **Rama por fase.** «`implementacion/fase-N`, creada desde la rama de trabajo actual.»

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas` o el clon donde se ejecute el plan).

**Archivos:**
- Comprobar, sin cambiarlos: `docs/decisiones.md` y `docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md`

- [ ] **Paso 1: Comprobar la rama de la fase**

```bash
git branch --show-current
```

Salida esperada:

```text
implementacion/fase-3
```

Si imprime `diseno/especificacion-y-vistas`, la rama de la fase todavía no existe: créala desde ahí con `git switch -c implementacion/fase-3` y vuelve a ejecutar el comando. Si imprime cualquier otra cosa, para: no estás en el punto de partida de la fase 3.

- [ ] **Paso 2: Comprobar que la rama contiene el registro de la fase y que no tocó la especificación**

```bash
git merge-base --is-ancestor f8d6aec HEAD && echo "la rama contiene f8d6aec"
git show --stat --format= f8d6aec
git status --short
```

Salida esperada: la primera línea dice que el commit del coordinador está en la rama; el resumen de `f8d6aec` enseña **solo** los dos archivos de documentación (ni la especificación ni nada de `src/`), y `git status --short` no muestra nada:

```text
la rama contiene f8d6aec
 docs/decisiones.md                                 | 33 ++++++++++++++++++++--
 .../plans/2026-09-17-gestion-aldeas-plan.md        |  1 +
 2 files changed, 31 insertions(+), 3 deletions(-)
```

Si no aparece «la rama contiene f8d6aec», para: la rama salió de un punto anterior al registro de la fase 3.

- [ ] **Paso 3: Comprobar que D-019 a D-042 están en el registro**

```bash
for n in $(seq 19 42); do grep -q "^| D-0$n |" docs/decisiones.md || echo "falta D-0$n"; done
grep -c "^| D-0\(19\|2[0-9]\|3[0-9]\|4[0-2]\) |" docs/decisiones.md
grep -n "^## " docs/decisiones.md
```

Salida esperada: el bucle no escribe ninguna línea «falta D-0NN» (están las 24), el recuento es **24** y la sección «Fase 3» está entre la de la fase 2 y «Decisiones tuyas». Los números de línea pueden cambiar si el coordinador ha añadido después más decisiones a la sección de la fase 3; lo que importa es el orden de las secciones:

```text
24
7:## Fase 1 · Dinero y calendario (2026-09-17)
16:## Fase 2 · Modelo de datos y copias de seguridad (2026-09-17 y 18)
35:## Fase 3 · Motor de dinero (2026-09-18)
64:## Decisiones tuyas
82:## Pendientes
```

- [ ] **Paso 4: Comprobar que los pendientes que cierra la fase ya no están en la lista**

D-030 cierra «7 noches o 7 días» y D-037 cierra «Qué pasa con “Primera vez” al reanudar un pago pausado». En la lista de pendientes deben quedar solo los cuatro que siguen abiertos (interés de una deuda, formas de fecha, ocho casos límite y dos anotaciones del canvas), y el de las formas de fecha debe decir que la fase 3 ya añade las listas de meses y el día de un hecho.

```bash
sed -n '/^## Pendientes/,$p' docs/decisiones.md | grep -c "^- \*\*"
sed -n '/^## Pendientes/,$p' docs/decisiones.md | grep -c "noches\|Primera vez"
grep -c "la fase 3 ya añade las listas de meses y el día de un hecho" docs/decisiones.md
```

Salida esperada, una cifra por línea: **4** pendientes, **0** menciones de los dos que se cerraron y **1** nota de la fase 3 en «Formas de fecha»:

```text
4
0
1
```

- [ ] **Paso 5: Comprobar que la hoja de ruta menciona D-019**

```bash
grep -n "D-019" docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md
grep -n "^### Fase 3" docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md
```

Salida esperada: una sola línea con D-019, dentro del alcance de la fase 3 (que empieza en la línea 53):

```text
61:  - adelantado de las fases 4 y 5 para que el entregable cuadre (D-019): los beneficios de las inversiones, los eventos que cambian impuestos, rentas y gastos, y el cobro al volver de las caravanas de venta;
53:### Fase 3 · Motor I: dinero
```

- [ ] **Paso 6: Comprobar el punto de partida de las pruebas**

```bash
npx tsc -b
npm test
npm run lint
```

Si `npm test` dice que no encuentra `vitest` (un clon o una copia de trabajo recién creados no traen `node_modules`), ejecuta antes `npm install`, que no cambia `package.json` ni `package-lock.json`.

Salida esperada: `npx tsc -b` no escribe nada, `npm run lint` solo imprime su cabecera (`> gestion-aldeas@0.0.0 lint` y `> oxlint`) y termina sin errores, y `npm test` termina con **568 pruebas en 48 archivos**, las que dejó la fase 2 (la hora y la duración varían; debajo puede salir una nota de Vitest sobre «Transform», que es inofensiva):

```text
 Test Files  48 passed (48)
      Tests  568 passed (568)
```

Esta tarea **no hace commit**: no ha cambiado nada. `git status --short` sigue sin mostrar nada. La tarea 2 parte de estas 568 pruebas.

---

### Tarea 2 · Lo tecleado, normalizado

`aBase` admite cantidades que el jugador teclea «a medias» —«,6», «.5», «6,», «6.»— y las convierte bien a hierro, pero `EsquemaImporte` (`src/dominio/modelo/comunes.ts` l.83) exige otra forma para lo que se **guarda**: `^\d+(?:[.,]\d{1,6})?$`, es decir, con parte entera y, si hay separador, con decimales detrás. Hoy `importeDesde(',6', 'mo', eq)` guarda `introducido: { cantidad: ',6' }`, y una partida con ese importe dejaría de pasar la validación de su propia copia. Era la «regla pendiente 2» de la fase 2, y la fase 3 es la primera que guarda cosas tecleadas (movimientos, transferencias, reglas y la producción de un local).

Esta tarea escribe `normalizarCantidad` en `src/dominio/dinero/importe.ts` y hace que `importeDesde` guarde su resultado. Arregla **solo** lo que el esquema rechaza (técnica 13): pone el 0 que falta delante de los decimales («,6» → «0,6») y quita un separador sin decimales («6,» → «6»), además de los espacios de alrededor, como ya hacía. **No** cambia el separador que se tecleó («.5» → «0.5», con punto; la prueba que ya existe de `' 0.5 '` → `'0.5'` sigue igual) ni los ceros que se escribieron («007» se queda «007»): `formatearIntroducido` ya los presenta bien.

No hay módulos nuevos del dominio, así que `pureza.test.ts` no crece.

**Reglas de la especificación que implementa:**

- **Lo introducido (§3, l.141).** «el movimiento guarda también lo introducido (por ejemplo «6 mp»), que se enseña como dato secundario en el libro.» Lo que se guarda tiene que poder volver a leerse y validarse: por eso se guarda en la forma que admite `EsquemaImporte`.
- **Redondeo (§3, l.121).** «Lo introducido se redondea al mh más cercano; las mitades, hacia arriba.» La base la sigue calculando `aBase` con lo tecleado tal cual; normalizar no cambia el valor: «,6» y «0,6» dan los mismos 60.000 mh.
- **Técnica 13 (regla pendiente 2 de la fase 2).** «`normalizarCantidad` solo arregla lo que rechaza `EsquemaImporte` (parte entera vacía y separador final)».

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Modificar: `src/dominio/dinero/importe.ts` (nueva `normalizarCantidad`; `importeDesde` la usa)
- Prueba: `src/dominio/dinero/importe.test.ts` (6 pruebas nuevas)

- [ ] **Paso 1: Escribir las pruebas que fallan**

En `src/dominio/dinero/importe.test.ts` hay que hacer tres cambios.

**1.a.** Sustituye las dos primeras líneas del archivo:

```ts
import { describe, it, expect } from 'vitest'
import { aBase, importeDesde, porcentajeDe, redondearMitadArriba } from './importe'
```

por estas tres (se importa `EsquemaImporte` para comprobar que lo guardado pasa el esquema, y `normalizarCantidad`):

```ts
import { describe, it, expect } from 'vitest'
import { EsquemaImporte } from '../modelo/comunes'
import { aBase, importeDesde, normalizarCantidad, porcentajeDe, redondearMitadArriba } from './importe'
```

**1.b.** Justo **antes** de la línea `describe('importeDesde', () => {`, inserta este bloque (con una línea en blanco detrás):

```ts
describe('normalizarCantidad', () => {
  it('pone el 0 que falta delante de los decimales: «,6» → «0,6»', () => {
    expect(normalizarCantidad(',6')).toBe('0,6')
    expect(normalizarCantidad(',25')).toBe('0,25')
  })

  it('quita el separador que no lleva decimales: «6,» → «6» y «6.» → «6»', () => {
    expect(normalizarCantidad('6,')).toBe('6')
    expect(normalizarCantidad('6.')).toBe('6')
  })

  it('respeta el separador que se tecleó: «.5» → «0.5», con punto', () => {
    expect(normalizarCantidad('.5')).toBe('0.5')
  })

  it('quita los espacios de alrededor: « 12,5 » → «12,5»', () => {
    expect(normalizarCantidad(' 12,5 ')).toBe('12,5')
    expect(normalizarCantidad('\t,6 ')).toBe('0,6')
  })

  it('no toca lo que EsquemaImporte ya admite: «0.5», «007», «12,345» y «6»', () => {
    expect(normalizarCantidad('0.5')).toBe('0.5')
    expect(normalizarCantidad('007')).toBe('007')
    expect(normalizarCantidad('12,345')).toBe('12,345')
    expect(normalizarCantidad('6')).toBe('6')
  })
})

```

**1.c.** Dentro de `describe('importeDesde', …)`, justo **antes** de la línea `  it('lanza el error de aBase si la cantidad no es válida', () => {`, inserta esta prueba (con una línea en blanco detrás):

```ts
  it('guarda lo tecleado normalizado, que pasa EsquemaImporte: «,6» → «0,6» y «6,» → «6»', () => {
    const sinParteEntera = importeDesde(',6', 'mo', EQ)
    expect(sinParteEntera).toEqual({ base: 60000, introducido: { cantidad: '0,6', moneda: 'mo' } })
    expect(EsquemaImporte.safeParse(sinParteEntera).success).toBe(true)
    const sinDecimales = importeDesde('6,', 'mp', EQ)
    expect(sinDecimales).toEqual({ base: 60000, introducido: { cantidad: '6', moneda: 'mp' } })
    expect(EsquemaImporte.safeParse(sinDecimales).success).toBe(true)
  })

```

Son **6 pruebas nuevas**: 5 de `normalizarCantidad` y 1 de `importeDesde`. El archivo pasa de 34 a 40 pruebas. La prueba que ya existía, «guarda la cantidad tal como se tecleó, sin los espacios de alrededor» (`' 0.5 '` → `'0.5'`), **no se toca** y tiene que seguir pasando: normalizar no cambia el punto por la coma.

- [ ] **Paso 2: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/dinero/importe.test.ts
```

Fallo esperado: las 5 pruebas de `normalizarCantidad` fallan porque la función todavía no existe (Vitest la importa como `undefined`) y la nueva de `importeDesde` falla porque guarda `',6'` tal cual. Las 34 que ya había pasan. Se muestran el primer bloque de error y el último; los otros cuatro son el mismo `TypeError` en sus líneas. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/dinero/importe.test.ts (40 tests | 6 failed) 30ms
   ❯ normalizarCantidad (5)
     × pone el 0 que falta delante de los decimales: «,6» → «0,6» 5ms
     × quita el separador que no lleva decimales: «6,» → «6» y «6.» → «6» 1ms
     × respeta el separador que se tecleó: «.5» → «0.5», con punto 0ms
     × quita los espacios de alrededor: « 12,5 » → «12,5» 0ms
     × no toca lo que EsquemaImporte ya admite: «0.5», «007», «12,345» y «6» 0ms
   ❯ importeDesde (4)
     × guarda lo tecleado normalizado, que pasa EsquemaImporte: «,6» → «0,6» y «6,» → «6» 7ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/dinero/importe.test.ts > normalizarCantidad > pone el 0 que falta delante de los decimales: «,6» → «0,6»
TypeError: normalizarCantidad is not a function
 ❯ src/dominio/dinero/importe.test.ts:115:12
    113| describe('normalizarCantidad', () => {
    114|   it('pone el 0 que falta delante de los decimales: «,6» → «0,6»', () …
    115|     expect(normalizarCantidad(',6')).toBe('0,6')
       |            ^
    116|     expect(normalizarCantidad(',25')).toBe('0,25')
    117|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

 FAIL  src/dominio/dinero/importe.test.ts > importeDesde > guarda lo tecleado normalizado, que pasa EsquemaImporte: «,6» → «0,6» y «6,» → «6»
AssertionError: expected { base: 60000, introducido: { …(2) } } to deeply equal { base: 60000, introducido: { …(2) } }

- Expected
+ Received

  {
    "base": 60000,
    "introducido": {
-     "cantidad": "0,6",
+     "cantidad": ",6",
      "moneda": "mo",
    },
  }

 ❯ src/dominio/dinero/importe.test.ts:158:28
    156|   it('guarda lo tecleado normalizado, que pasa EsquemaImporte: «,6» → …
    157|     const sinParteEntera = importeDesde(',6', 'mo', EQ)
    158|     expect(sinParteEntera).toEqual({ base: 60000, introducido: { canti…
       |                            ^
    159|     expect(EsquemaImporte.safeParse(sinParteEntera).success).toBe(true)
    160|     const sinDecimales = importeDesde('6,', 'mp', EQ)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/6]⎯


 Test Files  1 failed (1)
      Tests  6 failed | 34 passed (40)
```

- [ ] **Paso 3: Implementar `normalizarCantidad` y usarla en `importeDesde`**

En `src/dominio/dinero/importe.ts`, sustituye el bloque de `importeDesde`:

```ts
/** Importe con la base en mh y lo introducido, con la cantidad tal como se tecleó (sin espacios alrededor). */
export function importeDesde(cantidadTexto: string, moneda: Moneda, eq: Equivalencias): Importe {
  return {
    base: aBase(cantidadTexto, moneda, eq),
    introducido: { cantidad: cantidadTexto.trim(), moneda },
  }
}
```

por este:

```ts
/**
 * Lo tecleado en la forma que admite EsquemaImporte: «,6» → «0,6», «6,» → «6», sin espacios alrededor (§3, T13).
 * No cambia el separador ni los ceros que se escribieron: «0.5» sigue «0.5» y «007» sigue «007».
 */
export function normalizarCantidad(cantidadTexto: string): string {
  let cantidad = cantidadTexto.trim()
  // «,6» y «.5»: aBase los admite, pero EsquemaImporte pide la parte entera; se pone el 0 que no se tecleó.
  if (cantidad.startsWith(',') || cantidad.startsWith('.')) {
    cantidad = `0${cantidad}`
  }
  // «6,» y «6.»: un separador sin decimales no añade nada; se quita.
  if (cantidad.endsWith(',') || cantidad.endsWith('.')) {
    cantidad = cantidad.slice(0, -1)
  }
  return cantidad
}

/** Importe con la base en mh y lo introducido, con la cantidad tecleada normalizada (normalizarCantidad). */
export function importeDesde(cantidadTexto: string, moneda: Moneda, eq: Equivalencias): Importe {
  return {
    base: aBase(cantidadTexto, moneda, eq),
    introducido: { cantidad: normalizarCantidad(cantidadTexto), moneda },
  }
}
```

- `importeDesde` sigue calculando la base con `aBase(cantidadTexto, …)`, con lo tecleado sin normalizar: si el texto no es un número («seis», «,» solo, «1,2,3»), `aBase` lanza «Cantidad no válida» antes de normalizar nada, como hasta ahora.
- Las dos reglas son independientes y se aplican en ese orden: «,6» solo necesita la primera y «6,» solo la segunda. Nada de lo que `aBase` admite puede necesitar las dos a la vez (sería «,» solo, que `aBase` rechaza).
- «T13» en el JSDoc es la técnica 13 de las decisiones técnicas de este plan.

- [ ] **Paso 4: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/dinero/importe.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  40 passed (40)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada, `npm run lint` termina sin errores (solo imprime su cabecera) y `npm test` termina con **574 pruebas en 48 archivos**: las 568 de la tarea 1 y las **6 nuevas** de `importe.test.ts`. No hay archivos de prueba nuevos ni módulos nuevos del dominio, así que `pureza.test.ts` no crece:

```text
 Test Files  48 passed (48)
      Tests  574 passed (574)
```

Si el número que ves no es 574, sigue con **el tuyo**: lo que esta tarea garantiza es **+6 pruebas y +0 archivos** sobre lo que dejó la tarea 1.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/dinero/importe.ts src/dominio/dinero/importe.test.ts
git commit -m "feat(dinero): guardar lo tecleado normalizado («,6» → «0,6» y «6,» → «6»)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Si tu editor guardó las líneas nuevas con LF, `git add` puede avisar `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-3 8c0c24f] feat(dinero): guardar lo tecleado normalizado («,6» → «0,6» y «6,» → «6»)
 2 files changed, 58 insertions(+), 3 deletions(-)
```

---

### Tarea 3 · Formatos de meses y días

El motor escribe tres clases de textos con fechas que la fase 1 todavía no sabía escribir, y esta tarea los añade a `src/dominio/calendario/formatoFecha.ts`, junto a `formatearDiaMes` y `formatearFecha`:

- **`formatearMeses`**, la lista de meses del concepto de un cobro de locales: «Impuestos de locales · **abril** (4)», «… · **marzo y abril** (4)», «… · **enero, febrero y marzo** (2)». Si los meses cruzan de año, cada mes lleva el suyo: «… · **diciembre de 1639 y enero de 1640** (1)». La usará `conceptoLocales` (tarea 11).
- **`formatearDiaCercano`**, la fecha de un aviso «Pago no cubierto»: «La caja de Archet no cubre el tributo de 60 mo del **19 de julio**», con el año solo si no es el de hoy («del **19 de enero de 1641**»). La usará `avisoPagoNoCubierto` (tarea 11).
- **`formatearDiaDelAvance`**, el día de un hecho de «Qué ha pasado» en P5: «Tributo de Archet pagado · **19**» si el avance cae en un mes; «· **19 de mayo**» si cae en un año pero toca varios meses; «· **19 de abril de 1641**» si cruza de año. La usará `cambiosDelAvance` (tarea 19).

Las tres son funciones puras de texto, sin dependencias nuevas. `formatearMeses` recibe `{ anio, mes }`, así que acepta directamente los `AnioMes` del modelo (`modelo/comunes.ts`) sin importarlos: el calendario de la fase 1 no depende del modelo y así sigue.

No hay módulos nuevos del dominio, así que `pureza.test.ts` no crece.

**Reglas de la especificación que implementa:**

- **Concepto de los locales (§9, l.1288).** «Los impuestos de locales que se cobran el mismo día en un asentamiento forman un movimiento, en la categoría Impuestos: «Impuestos de locales · abril (4)». El número entre paréntesis cuenta los locales que pagan. Si se cobran dos meses, «marzo y abril».» Es `formatearMeses` con uno y con dos meses.
- **Textos que la especificación no escribía (D-031).** «Impuestos de locales · enero, febrero y marzo (4)», con el año solo si los meses cruzan de año. Es `formatearMeses` con tres o más meses y con un cambio de año.
- **Aviso de pago no cubierto (§9, l.1354; §6.1, l.286).** «La caja de Archet no cubre el tributo de 60 mo del 19 de julio». D-025 fija la plantilla, y el contrato de la fase dice que la fecha lleva el año solo si no es el de hoy: `formatearDiaCercano`.
- **Hechos de P5 (D-032; `design/build-artboards.mjs` l.585-586).** «Qué ha pasado» enseña «Caravana de Fornost de vuelta · 18» y «Tributo de Archet pagado · 19»: el avance del 12 al 19 de abril cae en un mes y basta con el día. La técnica 18 decide la forma cuando el avance no cae en un mes: `formatearDiaDelAvance`.
- **Lo que NO entra.** Las otras formas de fecha pendientes («viernes 13 de abril», «Abril de 1640 T.E.», «Del 12 al 19 de abril») siguen en «Pendientes» de `docs/decisiones.md`, para la fase 6.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Modificar: `src/dominio/calendario/formatoFecha.ts` (`formatearMeses`, `formatearDiaCercano`, `formatearDiaDelAvance` y la ayuda privada `enumerar`)
- Prueba: `src/dominio/calendario/formatoFecha.test.ts` (10 pruebas nuevas)

- [ ] **Paso 1: Escribir las pruebas que fallan**

En `src/dominio/calendario/formatoFecha.test.ts` hay que hacer dos cambios.

**1.a.** Sustituye el import de `./formatoFecha`:

```ts
import {
  ABREVIATURA_EDAD,
  formatearDiaMes,
  formatearFecha,
  NOMBRES_DIA,
  NOMBRES_MES,
} from './formatoFecha'
```

por este:

```ts
import {
  ABREVIATURA_EDAD,
  formatearDiaCercano,
  formatearDiaDelAvance,
  formatearDiaMes,
  formatearFecha,
  formatearMeses,
  NOMBRES_DIA,
  NOMBRES_MES,
} from './formatoFecha'
```

**1.b.** Añade este bloque **al final del archivo**, después del `describe('formatearDiaMes', …)` (deja una línea en blanco entre los dos). Usa el atajo `f(anio, mes, dia)` que el archivo ya define al principio:

```ts
describe('formatearMeses', () => {
  it('un mes: «abril»', () => {
    expect(formatearMeses([{ anio: 1640, mes: 4 }])).toBe('abril')
  })

  it('dos meses: «marzo y abril» (§9)', () => {
    expect(formatearMeses([{ anio: 1640, mes: 3 }, { anio: 1640, mes: 4 }])).toBe('marzo y abril')
  })

  it('tres o más: «enero, febrero y marzo»', () => {
    const tres = [
      { anio: 1640, mes: 1 },
      { anio: 1640, mes: 2 },
      { anio: 1640, mes: 3 },
    ]
    expect(formatearMeses(tres)).toBe('enero, febrero y marzo')
    expect(formatearMeses([...tres, { anio: 1640, mes: 4 }])).toBe('enero, febrero, marzo y abril')
  })

  it('si cruzan de año, cada mes con el suyo: «diciembre de 1639 y enero de 1640»', () => {
    expect(formatearMeses([{ anio: 1639, mes: 12 }, { anio: 1640, mes: 1 }])).toBe('diciembre de 1639 y enero de 1640')
    expect(
      formatearMeses([
        { anio: 1639, mes: 11 },
        { anio: 1639, mes: 12 },
        { anio: 1640, mes: 1 },
      ]),
    ).toBe('noviembre de 1639, diciembre de 1639 y enero de 1640')
  })

  it('un mes suelto de otro año va sin el año, y sin meses el texto queda vacío', () => {
    expect(formatearMeses([{ anio: 1639, mes: 12 }])).toBe('diciembre')
    expect(formatearMeses([])).toBe('')
  })
})

describe('formatearDiaCercano', () => {
  it('«19 de julio» si es del año de hoy (§9: «del 19 de julio»)', () => {
    expect(formatearDiaCercano(f(1640, 7, 19), f(1640, 4, 12))).toBe('19 de julio')
    expect(formatearDiaCercano(f(1640, 4, 12), f(1640, 4, 12))).toBe('12 de abril')
  })

  it('«19 de enero de 1641» si es de otro año, antes o después', () => {
    expect(formatearDiaCercano(f(1641, 1, 19), f(1640, 4, 12))).toBe('19 de enero de 1641')
    expect(formatearDiaCercano(f(1639, 12, 20), f(1640, 4, 12))).toBe('20 de diciembre de 1639')
  })
})

describe('formatearDiaDelAvance', () => {
  it('si el avance cae en un mes, solo el día: «19» (P5)', () => {
    expect(formatearDiaDelAvance(f(1640, 4, 19), f(1640, 4, 13), f(1640, 4, 19))).toBe('19')
    expect(formatearDiaDelAvance(f(1640, 4, 13), f(1640, 4, 13), f(1640, 4, 19))).toBe('13')
  })

  it('si cae en un año pero en varios meses, el día y el mes: «19 de mayo»', () => {
    expect(formatearDiaDelAvance(f(1640, 5, 19), f(1640, 4, 13), f(1640, 7, 19))).toBe('19 de mayo')
    expect(formatearDiaDelAvance(f(1640, 4, 18), f(1640, 4, 13), f(1640, 5, 1))).toBe('18 de abril')
  })

  it('si cruza de año, con el año: «19 de abril de 1641»', () => {
    expect(formatearDiaDelAvance(f(1641, 4, 19), f(1640, 4, 20), f(1641, 4, 20))).toBe('19 de abril de 1641')
    expect(formatearDiaDelAvance(f(1640, 12, 25), f(1640, 4, 20), f(1641, 4, 20))).toBe('25 de diciembre de 1640')
  })
})
```

Son **10 pruebas nuevas**: 5 de `formatearMeses`, 2 de `formatearDiaCercano` y 3 de `formatearDiaDelAvance`. El archivo pasa de 19 a 29 pruebas. Los avances de las pruebas se nombran por su primer y su último día simulados: del 13 al 19 de abril (P4 desde el 12, un mes), del 13 de abril al 19 de julio (98 días desde el 12, varios meses de un año) y un avance de 366 días desde el 19 de abril, que va del 20 de abril de 1640 al 20 de abril de 1641 (cruza de año).

- [ ] **Paso 2: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/calendario/formatoFecha.test.ts
```

Fallo esperado: las 10 pruebas nuevas fallan porque las tres funciones todavía no existen (Vitest las importa como `undefined`); las 19 que ya había pasan. Se muestran el primer bloque de error y el último; los otros ocho son el mismo `TypeError` con `formatearMeses`, `formatearDiaCercano` o `formatearDiaDelAvance`. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/calendario/formatoFecha.test.ts (29 tests | 10 failed) 13ms
   ❯ formatearMeses (5)
     × un mes: «abril» 3ms
     × dos meses: «marzo y abril» (§9) 0ms
     × tres o más: «enero, febrero y marzo» 0ms
     × si cruzan de año, cada mes con el suyo: «diciembre de 1639 y enero de 1640» 0ms
     × un mes suelto de otro año va sin el año, y sin meses el texto queda vacío 0ms
   ❯ formatearDiaCercano (2)
     × «19 de julio» si es del año de hoy (§9: «del 19 de julio») 0ms
     × «19 de enero de 1641» si es de otro año, antes o después 0ms
   ❯ formatearDiaDelAvance (3)
     × si el avance cae en un mes, solo el día: «19» (P5) 0ms
     × si cae en un año pero en varios meses, el día y el mes: «19 de mayo» 0ms
     × si cruza de año, con el año: «19 de abril de 1641» 0ms

⎯⎯⎯⎯⎯⎯ Failed Tests 10 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/calendario/formatoFecha.test.ts > formatearMeses > un mes: «abril»
TypeError: formatearMeses is not a function
 ❯ src/dominio/calendario/formatoFecha.test.ts:110:12
    108| describe('formatearMeses', () => {
    109|   it('un mes: «abril»', () => {
    110|     expect(formatearMeses([{ anio: 1640, mes: 4 }])).toBe('abril')
       |            ^
    111|   })
    112|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/10]⎯

 FAIL  src/dominio/calendario/formatoFecha.test.ts > formatearDiaDelAvance > si cruza de año, con el año: «19 de abril de 1641»
TypeError: formatearDiaDelAvance is not a function
 ❯ src/dominio/calendario/formatoFecha.test.ts:168:12
    166|
    167|   it('si cruza de año, con el año: «19 de abril de 1641»', () => {
    168|     expect(formatearDiaDelAvance(f(1641, 4, 19), f(1640, 4, 20), f(164…
       |            ^
    169|     expect(formatearDiaDelAvance(f(1640, 12, 25), f(1640, 4, 20), f(16…
    170|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/10]⎯


 Test Files  1 failed (1)
      Tests  10 failed | 19 passed (29)
```

- [ ] **Paso 3: Implementar las tres funciones**

Añade este bloque **al final** de `src/dominio/calendario/formatoFecha.ts`, después de `formatearFecha` (deja una línea en blanco entre los dos). No hace falta ningún import nuevo: `Fecha`, `NOMBRES_MES`, `formatearDiaMes` y `formatearFecha` ya están en el archivo.

```ts
/** «a», «a y b», «a, b y c»: una lista escrita como se lee. */
function enumerar(partes: readonly string[]): string {
  if (partes.length === 0) {
    return ''
  }
  if (partes.length === 1) {
    return partes[0]
  }
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}

/** «abril», «marzo y abril», «enero, febrero y marzo»; si cruzan de año, cada mes con el suyo (§9 l.1288, D-031). */
export function formatearMeses(meses: readonly { anio: number; mes: number }[]): string {
  const cruzanDeAnio = meses.some((m) => m.anio !== meses[0].anio)
  const nombres = meses.map((m) => {
    const nombre = NOMBRES_MES[m.mes - 1]
    return cruzanDeAnio ? `${nombre} de ${m.anio}` : nombre
  })
  return enumerar(nombres)
}

/** «19 de julio», o «19 de enero de 1641» si el año no es el de `hoy` (D-025). */
export function formatearDiaCercano(f: Fecha, hoy: Fecha): string {
  return f.anio === hoy.anio ? formatearDiaMes(f) : formatearFecha(f)
}

/**
 * El día de un hecho: «19» si el avance cae en un mes; «19 de abril» si cae en un año; si no, con el año
 * (D-032, T18). primerDia y ultimoDia son el primer y el último día simulados.
 */
export function formatearDiaDelAvance(f: Fecha, primerDia: Fecha, ultimoDia: Fecha): string {
  if (primerDia.anio !== ultimoDia.anio) {
    return formatearFecha(f)
  }
  if (primerDia.mes !== ultimoDia.mes) {
    return formatearDiaMes(f)
  }
  return String(f.dia)
}
```

- `formatearMeses` pone el año a **todos** los meses en cuanto uno es de otro año, y a ninguno si todos son del mismo: un cobro del 1 de enero de 1641 que solo cobra diciembre dice «diciembre», sin año.
- Los meses llegan en orden (los da `mesesPorCobrar`, tarea 8) y la función no los ordena.
- `formatearDiaDelAvance` decide por el **avance** (su primer y su último día), no por la fecha del hecho: en un avance del 13 de abril al 19 de julio, el hecho del 18 de abril también se escribe «18 de abril».
- «T18» en el JSDoc es la técnica 18 de las decisiones técnicas de este plan.

- [ ] **Paso 4: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/calendario/formatoFecha.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  29 passed (29)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada, `npm run lint` termina sin errores y `npm test` termina con **584 pruebas en 48 archivos**: las 574 de la tarea 2 y las **10 nuevas** de `formatoFecha.test.ts`. `pureza.test.ts` no crece, porque no hay módulos nuevos:

```text
 Test Files  48 passed (48)
      Tests  584 passed (584)
```

Si el número que ves no es 584, sigue con **el tuyo**: lo que esta tarea garantiza es **+10 pruebas y +0 archivos** sobre lo que dejó la tarea 2.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/calendario/formatoFecha.ts src/dominio/calendario/formatoFecha.test.ts
git commit -m "feat(calendario): listas de meses, día cercano y día de un hecho del avance" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía; puede salir el aviso inofensivo `LF will be replaced by CRLF` por cada archivo). `git status --short` no muestra nada:

```text
[implementacion/fase-3 424ef1c] feat(calendario): listas de meses, día cercano y día de un hecho del avance
 2 files changed, 108 insertions(+)
```

---

### Tarea 4 · Suma exacta al mes

El balance mensual de un asentamiento suma muchas partidas prorrateadas a 30 días: cinco filas de salarios semanales, tres unidades de la guarnición cada dos semanas, un tributo mensual… Si cada partida se redondea al mh por separado con `alMes` y después se suman, los redondeos se acumulan: las tres soldadas de Bree dan **1.242.856** fila a fila, pero la cifra exacta es 580.000 × 30 ÷ 14 = 1.242.857,14… → **1.242.857**, y con 1 mh de menos lo que sale de Bree deja de ser el **5.542.857** que escribe la especificación.

La técnica 2 lo resuelve con **un solo redondeo por total mostrado**: `sumarAlMes` junta las fracciones exactas base × factor de todas las partidas sobre un denominador común, con `BigInt`, y redondea solo el total al mh, con las mitades hacia arriba. La tarea 9 (`balanceMensual`) la usará para «entran», «salen» y «tributos». Las columnas «Al mes» de A5 y A6, que enseñan fila a fila, siguen con `alMes`.

`PartidaMensual` es el par que se prorratea: el importe de **una** ocurrencia en mh (`base`, ya multiplicado por el número de trabajadores o de habitantes si hace falta) y su `recurrencia`. Se usa la misma tabla de §3 que `alMes`, con la función privada `fraccionMensual` que ya existe en `prorrateo.ts`.

No hay módulos nuevos del dominio, así que `pureza.test.ts` no crece.

**Reglas de la especificación que implementa:**

- **Balance mensual (§7, l.1057).** «**Balance mensual** de un asentamiento = ingresos recurrentes (también los impuestos de locales, con la producción habitual) − gastos recurrentes (salarios, soldadas, tributos), prorrateados a 30 días con la tabla de la sección 3 y con 1 decimal. […] Bree: entran 44 · salen 55,4 → −11,5 mo (39,2571 + 4,7 − 55,4286 ≈ −11,4714; en mh, 4.395.714 − 5.542.857 = −1.147.143, es decir −11,47143 mo).» El 5.542.857 de «salen» solo sale con un único redondeo.
- **Redondeo (§3, l.122).** «Porcentajes, prorrateos y divisiones se calculan en mh con el mismo criterio»: al mh más cercano, con las mitades hacia arriba.
- **Prorrateo a 30 días (§3, tabla).** Cada día ×30; cada N días ×30/N; semanal ×30/7; cada dos semanas ×30/14; mensual ×1; cada N meses ×1/N; trimestral ×1/3; anual ×1/12; «Una sola vez», no cuenta.
- **Técnica 2.** «fracciones exactas con un solo redondeo por total mostrado (entran, salen y tributos), con las mitades hacia arriba. […] Nueva `sumarAlMes` en `dinero/prorrateo.ts`. Las columnas «Al mes» de A5 y A6 siguen con `alMes` por fila.»

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Modificar: `src/dominio/dinero/prorrateo.ts` (`PartidaMensual`, `sumarAlMes` y las ayudas privadas `mcd` y `redondearFraccion`)
- Prueba: `src/dominio/dinero/prorrateo.test.ts` (5 pruebas nuevas)

- [ ] **Paso 1: Escribir las pruebas que fallan**

En `src/dominio/dinero/prorrateo.test.ts` hay que hacer dos cambios.

**1.a.** Sustituye la línea:

```ts
import { alMes, factorMensual } from './prorrateo'
```

por esta:

```ts
import { alMes, factorMensual, sumarAlMes, type PartidaMensual } from './prorrateo'
```

**1.b.** Justo **antes** de la línea `describe('balance mensual de Bree (§7)', () => {`, inserta este bloque (con una línea en blanco detrás). Usa lo que el archivo ya define al principio: `mo('4,2')` (oro tecleado → mh), `EQ`, `PRIMERA`, `SEMANAL`, `CADA_DOS_SEMANAS` y `MENSUAL`:

```ts
describe('sumarAlMes', () => {
  /** Las tres unidades de la guarnición de Bree (A6): 6 × 0,3 mo, 4 × 0,5 mo y 1 × 2 mo cada dos semanas. */
  const SOLDADAS_BREE: PartidaMensual[] = [
    { base: 6 * mo('0,3'), recurrencia: CADA_DOS_SEMANAS },
    { base: 4 * mo('0,5'), recurrencia: CADA_DOS_SEMANAS },
    { base: 1 * mo('2'), recurrencia: CADA_DOS_SEMANAS },
  ]

  /** Las cinco filas de trabajadores de Bree (A5), cada viernes: 6 × 0,3, 3 × 0,3, 2 × 0,4, 2 × 0,3 y 1 × 0,1 mo. */
  const SALARIOS_BREE: PartidaMensual[] = [
    { base: 6 * mo('0,3'), recurrencia: SEMANAL },
    { base: 3 * mo('0,3'), recurrencia: SEMANAL },
    { base: 2 * mo('0,4'), recurrencia: SEMANAL },
    { base: 2 * mo('0,3'), recurrencia: SEMANAL },
    { base: 1 * mo('0,1'), recurrencia: SEMANAL },
  ]

  /** El diezmo de Bree, su único tributo (A3): 25 mo el día 1 de cada mes. */
  const DIEZMO_BREE: PartidaMensual = { base: mo('25'), recurrencia: MENSUAL }

  it('sin partidas da 0', () => {
    expect(sumarAlMes([])).toBe(0)
  })

  it('con una sola partida da lo mismo que alMes, también con mitades, negativos y sin −0', () => {
    const casos: PartidaMensual[] = [
      { base: mo('3'), recurrencia: SEMANAL },
      { base: mo('5,8'), recurrencia: CADA_DOS_SEMANAS },
      { base: 1, recurrencia: { tipo: 'cadaNDias', n: 4, primera: PRIMERA } },
      { base: -1, recurrencia: { tipo: 'cadaNDias', n: 4, primera: PRIMERA } },
      { base: 11, recurrencia: { tipo: 'cadaNDias', n: 44, primera: PRIMERA } },
      { base: -6, recurrencia: SEMANAL },
      { base: -1, recurrencia: { tipo: 'anual', mes: 4, diaMes: 13 } },
    ]
    for (const partida of casos) {
      expect(sumarAlMes([partida])).toBe(alMes(partida.base, partida.recurrencia))
    }
    expect(sumarAlMes([{ base: -1, recurrencia: { tipo: 'anual', mes: 4, diaMes: 13 } }])).toBe(0)
  })

  it('las tres soldadas de Bree suman 1.242.857 al mes, con un solo redondeo; fila a fila serían 1.242.856', () => {
    expect(sumarAlMes(SOLDADAS_BREE)).toBe(1242857)
    const filaAFila = SOLDADAS_BREE.reduce((suma, p) => suma + alMes(p.base, p.recurrencia), 0)
    expect(filaAFila).toBe(1242856)
  })

  it('lo que sale de Bree al mes: salarios, soldadas y diezmo = 5.542.857, «55,4 mo» (§7)', () => {
    const salen = sumarAlMes([...SALARIOS_BREE, ...SOLDADAS_BREE, DIEZMO_BREE])
    expect(salen).toBe(5542857)
    expect(formatearOroProrrateado(salen, EQ)).toBe('55,4 mo')
    expect(sumarAlMes(SALARIOS_BREE)).toBe(1800000)
    expect(sumarAlMes([DIEZMO_BREE])).toBe(2500000)
  })

  it('«Una sola vez» no cuenta: suma 0', () => {
    const unica: PartidaMensual = { base: mo('100'), recurrencia: { tipo: 'unica', fecha: PRIMERA } }
    expect(sumarAlMes([unica])).toBe(0)
    expect(sumarAlMes([unica, DIEZMO_BREE])).toBe(2500000)
  })
})

```

Son **5 pruebas nuevas**; el archivo pasa de 12 a 17. Cuatro detalles:

- La segunda prueba compara con `alMes` casos que ya cubre su propia prueba: las mitades (1 mh cada 4 días = 7,5 → 8; −7,5 → −7), el caso en que la coma flotante falla (11 mh cada 44 días) y el −0 (−1 mh al año → 0). `toBe` usa `Object.is`, que distingue 0 de −0, así que un −0 no pasaría.
- Las salidas de Bree se escriben con los importes de A5 y A6 tal como los ve el jugador (6 × 0,3 mo…), igual que el `describe('balance mensual de Bree (§7)')` que ya hay en el archivo. No se importa la partida de ejemplo: la tarea 9 lo hará con los datos de verdad.
- El describe que ya existía, `balance mensual de Bree (§7)`, **no se toca**: sigue sumando fila a fila con `alMes` y llega a 5.542.857 por otro camino (1.800.000 + 1.242.857 + 2.500.000, con la soldada ya agrupada en un solo `alMes` de 5,8 mo).
- `1 * mo('2')` lleva el `1 *` a propósito, para que las tres filas se lean igual (número × soldada).

- [ ] **Paso 2: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/dinero/prorrateo.test.ts
```

Fallo esperado: las 5 pruebas nuevas fallan porque `sumarAlMes` todavía no existe (el `type PartidaMensual` del import desaparece al compilar la prueba y no da error en Vitest; sí lo daría `npx tsc -b`, que no se ejecuta en este paso). Las 12 que ya había pasan. Se muestran el primer bloque de error y el último; los otros tres son el mismo `TypeError`. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/dinero/prorrateo.test.ts (17 tests | 5 failed) 12ms
   ❯ sumarAlMes (5)
     × sin partidas da 0 3ms
     × con una sola partida da lo mismo que alMes, también con mitades, negativos y sin −0 1ms
     × las tres soldadas de Bree suman 1.242.857 al mes, con un solo redondeo; fila a fila serían 1.242.856 0ms
     × lo que sale de Bree al mes: salarios, soldadas y diezmo = 5.542.857, «55,4 mo» (§7) 0ms
     × «Una sola vez» no cuenta: suma 0 0ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/dinero/prorrateo.test.ts > sumarAlMes > sin partidas da 0
TypeError: sumarAlMes is not a function
 ❯ src/dominio/dinero/prorrateo.test.ts:130:12
    128|
    129|   it('sin partidas da 0', () => {
    130|     expect(sumarAlMes([])).toBe(0)
       |            ^
    131|   })
    132|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/5]⎯

 FAIL  src/dominio/dinero/prorrateo.test.ts > sumarAlMes > «Una sola vez» no cuenta: suma 0
TypeError: sumarAlMes is not a function
 ❯ src/dominio/dinero/prorrateo.test.ts:165:12
    163|   it('«Una sola vez» no cuenta: suma 0', () => {
    164|     const unica: PartidaMensual = { base: mo('100'), recurrencia: { ti…
    165|     expect(sumarAlMes([unica])).toBe(0)
       |            ^
    166|     expect(sumarAlMes([unica, DIEZMO_BREE])).toBe(2500000)
    167|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯


 Test Files  1 failed (1)
      Tests  5 failed | 12 passed (17)
```

- [ ] **Paso 3: Implementar `sumarAlMes`**

Añade este bloque **al final** de `src/dominio/dinero/prorrateo.ts`, después de `alMes` (deja una línea en blanco entre los dos). No hace falta ningún import nuevo: `Recurrencia` y `fraccionMensual` ya están en el archivo.

```ts
/** Una partida que se prorratea a 30 días: su importe por ocurrencia y su frecuencia (§3). */
export interface PartidaMensual {
  base: number
  recurrencia: Recurrencia
}

/** Máximo común divisor de dos enteros positivos (algoritmo de Euclides). */
function mcd(a: bigint, b: bigint): bigint {
  let x = a
  let y = b
  while (y !== 0n) {
    const resto = x % y
    x = y
    y = resto
  }
  return x
}

/** numerador ÷ denominador (denominador > 0) al entero más cercano, con las mitades hacia arriba (+∞) y sin −0. */
function redondearFraccion(numerador: bigint, denominador: bigint): number {
  const n = 2n * numerador + denominador
  const d = 2n * denominador
  const cociente = n / d
  // La división de BigInt corta hacia 0; con resto negativo, se baja uno para redondear hacia abajo.
  return Number(n % d < 0n ? cociente - 1n : cociente)
}

/**
 * Suma exacta al mes de varias partidas, con un solo redondeo al mh y las mitades hacia arriba (§3, §7 l.1057, T2).
 * Junta las fracciones base × factor de todas las partidas sobre un denominador común y redondea solo el total:
 * fila a fila con alMes, las tres soldadas de Bree darían 1.242.856 en vez de 1.242.857.
 *
 * Precondiciones: cada base es un entero en mh y cada recurrencia es válida (validarRecurrencia).
 */
export function sumarAlMes(partidas: readonly PartidaMensual[]): number {
  let numerador = 0n
  let denominador = 1n
  for (const { base, recurrencia } of partidas) {
    const fraccion = fraccionMensual(recurrencia)
    const suyo = BigInt(fraccion.denominador)
    // El denominador común es el mínimo común múltiplo de los dos: así no crece de más.
    const comun = (denominador / mcd(denominador, suyo)) * suyo
    numerador = numerador * (comun / denominador) + BigInt(base) * BigInt(fraccion.numerador) * (comun / suyo)
    denominador = comun
  }
  return redondearFraccion(numerador, denominador)
}
```

- Redondear n ÷ d con las mitades hacia arriba es tomar el suelo de (2n + d) ÷ 2d. La división de `BigInt` corta hacia 0, así que con un resto negativo se resta 1 para quedarse con el suelo: −7,5 → −7 y −25,7 → −26, como `alMes`. `Number(0n)` es 0, nunca −0.
- El denominador común es el mínimo común múltiplo, y no el producto, para que no crezca con cada partida: con salarios semanales (7), soldadas quincenales (14) y un tributo mensual (1) se queda en 14.
- Es el mismo criterio que `dividirMitadArriba` de `importe.ts`, que es privada; aquí va una copia de cuatro líneas para no cambiar la API de `importe.ts` en esta tarea.
- «T2» en el JSDoc es la técnica 2 de las decisiones técnicas de este plan.

- [ ] **Paso 4: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/dinero/prorrateo.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  17 passed (17)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada, `npm run lint` termina sin errores y `npm test` termina con **589 pruebas en 48 archivos**: las 584 de la tarea 3 y las **5 nuevas** de `prorrateo.test.ts`. `pureza.test.ts` no crece:

```text
 Test Files  48 passed (48)
      Tests  589 passed (589)
```

Si el número que ves no es 589, sigue con **el tuyo**: lo que esta tarea garantiza es **+5 pruebas y +0 archivos** sobre lo que dejó la tarea 3.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/dinero/prorrateo.ts src/dominio/dinero/prorrateo.test.ts
git commit -m "feat(dinero): sumar al mes varias partidas con un solo redondeo" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía; puede salir el aviso inofensivo `LF will be replaced by CRLF` por cada archivo). `git status --short` no muestra nada:

```text
[implementacion/fase-3 c424a1c] feat(dinero): sumar al mes varias partidas con un solo redondeo
 2 files changed, 110 insertions(+), 1 deletion(-)
```

---

### Tarea 5 · Modelo y ejemplo

Cinco retoques pequeños al modelo y a la partida de ejemplo que el motor necesita antes de existir. Ninguno añade un esquema ni sube `VERSION_FORMATO`: todo lo que guarda el motor ya cabe en el formato 1.

1. **`estadoDe`** (`modelo/documento.ts`). Un `DocumentoPartida` es el estado **más** la lista de `avances`, y TypeScript deja pasar un documento donde se pide un `EstadoPartida`. Si alguien saca el estado con `{ ...documento }`, arrastra `avances` —y con ellos el `snapshotPrevio` del último avance— dentro del estado nuevo o dentro de la copia del siguiente avance, sin que el compilador diga nada. `estadoDe` copia **solo** las 34 claves de `EsquemaEstadoPartida`, en el orden del esquema, y comparte las colecciones sin copiarlas. `simular` (tarea 21) la aplica a su entrada y `aplicarAvance` (tarea 22) la usa para la copia (técnica 12).
2. **Vinculados programados** (`modelo/movimientos.ts`). D-033 decide que solo un movimiento suelto puede tener fecha futura; los de obras, caravanas y compras del almacén siguen sus propias reglas (se aplican en los pasos 3 y 7, en la fase 4). `EsquemaMovimiento` gana una comprobación más: un movimiento con `vinculo` solo puede estar `programado` si el vínculo es `obra`, `caravana` o `entradaAlmacen` (técnica 7). Así el motor de la fase 3, que en los pasos 8 y 9 solo aplica los programados **sin** vínculo, nunca se encuentra un programado que no sabe aplicar.
3. **JSDoc de `EsquemaAvisoAvance`** (`modelo/avance.ts`). Decía «Sigue vigente hasta el avance siguiente», y D-024 decide que el aviso de un impago sigue en Inicio mientras quede algo por pagar, aunque haya avances después. Pasa a decir lo que de verdad guarda: los avisos vigentes al terminar el avance, tal como los pinta P5 (técnica 34). Es solo un comentario.
4. **«Pastor»** (`ejemplo/asentamientosDinero.ts`). El detalle de los salarios del 6 de abril nombraba la fila de 1 pastor «Pastores». El motor escribirá el oficio en singular con 1 (`nombreDeOficio`, tarea 11), y el movimiento del ejemplo, que finge haberlo creado un avance anterior, tiene que decir lo mismo (técnica 9).
5. **El beneficio del Tonel con lo tecleado** (`ejemplo/partidaYPersonaje.ts`). El motor copia el `introducido` de la regla cuando el importe es exactamente su base (técnica 8): el beneficio de la Barcaza del 15 de abril saldrá con «1,5 mo». El del Tonel del 1 de abril, que es exactamente los 3 mo de su inversión, pasa a llevar `{ cantidad: '3', moneda: 'mo' }` por la misma regla.

`validarCopia(documentoDeEjemplo(), catalogosDeEjemplo())` tiene que seguir dando `[]`: lo comprueba la prueba que ya existe en `ejemplo/sombraDelEste.test.ts` («no deja ni un problema en las tres validaciones…»), que corre con `npm test`. No hay módulos nuevos del dominio, así que `pureza.test.ts` no crece.

**Reglas de la especificación que implementa:**

- **El motor es puro y guarda una copia (§9, l.1271).** «Es una **función pura**: `simular(estado, días) → { estadoNuevo, cambios[], avisos[] }`. La vista previa (P4) la llama sin guardar; al confirmar se guarda `estadoNuevo` y se crea un `Avance` con la fecha en que se aplica y una copia de la partida completa.» La «partida completa» es el estado sin la lista de avances (§8: `snapshotPrevio` solo lo lleva el último avance): `estadoDe`.
- **Programados (§7, l.1199).** «un movimiento con fecha futura queda programado. No cuenta en el saldo hasta que el avance llega a su fecha: los cobros se aplican en el paso de cobros y los pagos en el de pagos (sección 9), salvo los movimientos vinculados a obras, caravanas y compras, que se aplican en el paso 3 (pago al empezar o al salir) o en el 7 (cobro al volver).» D-033 añade que ningún otro vinculado puede tener fecha futura: «Una transferencia, una venta, un pago o alta de deuda, el capital o la retirada de una inversión y la compra de un pergamino se anotan con fecha de hoy o anterior.»
- **Avisos de P5 (§9, tabla de avisos).** «P5 muestra todos los vigentes al terminar.» Es lo que pasa a decir el JSDoc.
- **Oficio en singular (§6.3, l.579).** «Oficio con su plural cuando el número es mayor que 1.» Con 1, en singular: «Pastor». D-031 lo dice también del detalle de los salarios.
- **Lo introducido (§3, l.141).** «Es **opcional**: queda vacío en los importes calculados o agrupados (intereses, movimientos agrupados del avance, impuestos por habitante e impuestos de locales)». Un beneficio que es exactamente el importe tecleado en su inversión no es calculado ni agrupado: lleva lo tecleado.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Modificar: `src/dominio/modelo/documento.ts` (`estadoDe`)
- Modificar: `src/dominio/modelo/movimientos.ts` (comprobación de vinculados programados)
- Modificar: `src/dominio/modelo/avance.ts` (solo el JSDoc de `EsquemaAvisoAvance`)
- Modificar: `src/dominio/ejemplo/asentamientosDinero.ts` («Pastor»)
- Modificar: `src/dominio/ejemplo/partidaYPersonaje.ts` (el beneficio del Tonel con «3 mo»)
- Prueba: `src/dominio/modelo/documento.test.ts` (2 pruebas nuevas)
- Prueba: `src/dominio/modelo/movimientos.test.ts` (3 pruebas nuevas)
- Prueba: `src/dominio/ejemplo/asentamientosDinero.test.ts` (1 prueba nueva)
- Prueba: `src/dominio/ejemplo/partidaYPersonaje.test.ts` (1 prueba nueva)

- [ ] **Paso 1: Escribir las pruebas de `estadoDe`**

En `src/dominio/modelo/documento.test.ts`:

**1.a.** En el import de `./documento`, añade `estadoDe` detrás de `EsquemaEstadoPartida`. El import queda así:

```ts
import {
  EsquemaAvance,
  EsquemaDocumentoPartida,
  EsquemaEstadoPartida,
  estadoDe,
  type DocumentoPartida,
  type EstadoPartida,
} from './documento'
```

**1.b.** Añade este bloque **al final del archivo**, después del `describe('EsquemaAvance y EsquemaDocumentoPartida', …)` (deja una línea en blanco entre los dos). Usa `ESTADO_VACIO` y `DOCUMENTO`, que el archivo ya define (un documento con dos avances, el último con `snapshotPrevio`):

```ts
describe('estadoDe', () => {
  it('saca del documento las 34 claves del estado, en el orden del esquema y sin avances (§8, §9)', () => {
    const estado = estadoDe(DOCUMENTO)
    expect(Object.keys(estado)).toEqual(Object.keys(EsquemaEstadoPartida.shape))
    expect(Object.keys(estado)).toHaveLength(34)
    expect(estado).not.toHaveProperty('avances')
    expect(EsquemaEstadoPartida.parse(estado)).toEqual(estado)
  })

  it('comparte las colecciones sin copiarlas, y evita la trampa de { ...documento }', () => {
    const estado = estadoDe(DOCUMENTO)
    expect(estado.partida).toBe(DOCUMENTO.partida)
    expect(estado.movimientos).toBe(DOCUMENTO.movimientos)
    expect(estadoDe(ESTADO_VACIO)).toEqual(ESTADO_VACIO)
    // TypeScript acepta el spread como EstadoPartida, pero arrastra los avances con su snapshotPrevio.
    const conSpread: EstadoPartida = { ...DOCUMENTO }
    expect(conSpread).toHaveProperty('avances')
  })
})
```

La última línea de la segunda prueba deja escrita la trampa: `npx tsc -b` acepta `const conSpread: EstadoPartida = { ...DOCUMENTO }` sin error, y el resultado lleva `avances`.

- [ ] **Paso 2: Escribir las pruebas de los vinculados programados**

En `src/dominio/modelo/movimientos.test.ts`:

**2.a.** Justo **antes** de la línea `describe('EsquemaMovimiento', () => {`, inserta estas dos constantes (con una línea en blanco detrás):

```ts
/** Un pago de 15 mo al Gremio el 1 de mayo: un gasto que sale de un pago de deuda, sin programar. */
const PAGO_AL_GREMIO: Movimiento = {
  id: 'mov.pago-gremio.1mayo',
  dominioId: 'dom.tharan',
  fecha: { anio: 1640, mes: 5, dia: 1 },
  tipo: 'gasto',
  importe: { base: -1500000, introducido: { cantidad: '15', moneda: 'mo' } },
  categoriaId: 'cat.prestamos-y-deudas',
  concepto: 'Pago al Gremio de mercaderes de Bree',
  origen: 'manual',
  vinculo: { tipo: 'pagoDeuda', id: 'pago.gremio.3' },
  programado: false,
}

/** El mensaje de la comprobación de D-033: solo obras, caravanas y compras del almacén esperan programadas. */
const SOLO_OBRAS_CARAVANAS_Y_COMPRAS =
  'Un movimiento que sale de otro registro solo queda programado si es de una obra, una caravana o una compra'

```

**2.b.** Dentro de `describe('EsquemaMovimiento', …)`, justo **antes** de la línea `  it('guarda las transferencias y las reglas recurrentes del personaje', () => {`, inserta estas tres pruebas (con una línea en blanco detrás):

```ts
  it('rechaza programado un movimiento que sale de un pago de deuda, una venta o una transferencia (D-033)', () => {
    const pago = EsquemaMovimiento.safeParse({ ...PAGO_AL_GREMIO, programado: true })
    expect(pago.success).toBe(false)
    expect(pago.error?.issues.map((i) => i.message)).toEqual([SOLO_OBRAS_CARAVANAS_Y_COMPRAS])

    const otros = ['venta', 'altaDeuda', 'capitalInversion', 'retiradaInversion', 'pergamino'] as const
    for (const tipo of otros) {
      const programado = { ...PAGO_AL_GREMIO, vinculo: { tipo, id: 'reg.1' }, programado: true }
      expect(EsquemaMovimiento.safeParse(programado).error?.issues.map((i) => i.message)).toEqual([
        SOLO_OBRAS_CARAVANAS_Y_COMPRAS,
      ])
    }

    const transferencia = EsquemaMovimiento.safeParse({
      ...PAGO_AL_GREMIO,
      tipo: 'transferencia',
      vinculo: { tipo: 'transferencia', id: 'trf.1' },
      programado: true,
    })
    expect(transferencia.error?.issues.map((i) => i.message)).toEqual([SOLO_OBRAS_CARAVANAS_Y_COMPRAS])
  })

  it('admite programados los de una obra, una caravana o una compra del almacén (§7)', () => {
    for (const tipo of ['obra', 'caravana', 'entradaAlmacen'] as const) {
      const programado = { ...PAGO_AL_GREMIO, vinculo: { tipo, id: 'reg.1' }, programado: true }
      expect(EsquemaMovimiento.safeParse(programado).success).toBe(true)
    }
  })

  it('admite programado un movimiento suelto, y sin programar uno vinculado de cualquier clase', () => {
    const suelto = { ...PAGO_AL_GREMIO, vinculo: undefined, programado: true }
    expect(EsquemaMovimiento.safeParse(suelto).success).toBe(true)
    expect(EsquemaMovimiento.safeParse(PAGO_AL_GREMIO).success).toBe(true)
    expect(EsquemaMovimiento.parse(PAGO_AL_GREMIO)).toEqual(PAGO_AL_GREMIO)
  })

```

- La primera prueba recorre los siete vínculos que no pueden esperar programados (`pagoDeuda`, los cinco del bucle y `transferencia`) y exige que el **único** mensaje sea el nuevo: así se ve que no choca con las comprobaciones que ya había (la transferencia programada lleva `tipo: 'transferencia'` para no disparar la de «Solo un movimiento de transferencia lleva el vínculo…»).
- Las otras dos son de guarda: **ya pasan** antes de implementar, y tienen que seguir pasando después. Vigilan que la comprobación nueva no rechace de más: los tres vínculos que sí esperan programados, un movimiento suelto programado y un vinculado sin programar.

- [ ] **Paso 3: Escribir las pruebas del ejemplo**

**3.a.** En `src/dominio/ejemplo/asentamientosDinero.test.ts`, dentro de `describe('los libros de los asentamientos', …)`, justo **antes** de la línea `  it('la transferencia del 6 de abril tiene sus dos movimientos, uno en cada dominio (§8)', () => {`, inserta esta prueba (con una línea en blanco detrás):

```ts
  it('el detalle de los salarios nombra el oficio en singular con 1 y en plural con más: «Pastor» (§6.3)', () => {
    const salarios = MOVIMIENTOS_BREE.find((m) => m.id === MOV_BREE.salarios6Abril)
    expect(salarios?.detalleTrabajo?.map((d) => [d.nombre, d.numero])).toEqual([
      ['Granjeros', 6],
      ['Leñadores', 3],
      ['Cerveceros', 2],
      ['Canteros', 2],
      ['Pastor', 1],
    ])
  })

```

`MOVIMIENTOS_BREE` y `MOV_BREE` ya están importados en ese archivo.

**3.b.** En `src/dominio/ejemplo/partidaYPersonaje.test.ts`, justo **después** de la línea `} from '../modelo/personaje'` (el final del import de los esquemas del personaje), añade este import:

```ts
import { INVERSION, MOV_THARAN } from './ids'
```

**3.c.** En el mismo archivo, sustituye el final de `describe('la bolsa de Tharan', …)`, que es el final de la prueba «lo tecleado cuadra con el importe guardado en las equivalencias de la partida (§3)»:

```ts
        expect(aBase(introducido.cantidad, introducido.moneda, PARTIDA.equivalencias)).toBe(
          Math.abs(movimiento.importe.base),
        )
      }
    }
  })
})
```

por este, que añade una prueba al final del mismo `describe`:

```ts
        expect(aBase(introducido.cantidad, introducido.moneda, PARTIDA.equivalencias)).toBe(
          Math.abs(movimiento.importe.base),
        )
      }
    }
  })

  it('el beneficio del Tonel del 1 de abril lleva lo tecleado en su inversión: «3 mo» (§3)', () => {
    const beneficio = MOVIMIENTOS_THARAN.find((m) => m.id === MOV_THARAN.beneficioTonel)
    const tonel = INVERSIONES.find((i) => i.id === INVERSION.tonelDorado)
    expect(beneficio?.importe).toEqual({ base: 300000, introducido: { cantidad: '3', moneda: 'mo' } })
    expect(beneficio?.importe).toEqual(tonel?.beneficio)
  })
})
```

Entre los pasos 1 a 3 son **7 pruebas nuevas**: 2 en `documento.test.ts` (de 3 a 5), 3 en `movimientos.test.ts` (de 7 a 10), 1 en `asentamientosDinero.test.ts` (de 11 a 12) y 1 en `partidaYPersonaje.test.ts` (de 12 a 13).

- [ ] **Paso 4: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/modelo/documento.test.ts src/dominio/modelo/movimientos.test.ts src/dominio/ejemplo/asentamientosDinero.test.ts src/dominio/ejemplo/partidaYPersonaje.test.ts
```

Fallo esperado: **5 fallan** —las dos de `estadoDe`, que todavía no existe; la de rechazo, porque el esquema aún admite el pago programado; «Pastor», y el Tonel— y **35 pasan**, entre ellas las dos de guarda del paso 2. El orden de los archivos y de los bloques, la hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/modelo/movimientos.test.ts (10 tests | 1 failed) 28ms
   ❯ EsquemaMovimiento (10)
     × rechaza programado un movimiento que sale de un pago de deuda, una venta o una transferencia (D-033) 8ms
 ❯ src/dominio/ejemplo/partidaYPersonaje.test.ts (13 tests | 1 failed) 41ms
   ❯ la bolsa de Tharan (5)
     × el beneficio del Tonel del 1 de abril lleva lo tecleado en su inversión: «3 mo» (§3) 8ms
 ❯ src/dominio/ejemplo/asentamientosDinero.test.ts (12 tests | 1 failed) 41ms
   ❯ los libros de los asentamientos (6)
     × el detalle de los salarios nombra el oficio en singular con 1 y en plural con más: «Pastor» (§6.3) 9ms
 ❯ src/dominio/modelo/documento.test.ts (5 tests | 2 failed) 27ms
   ❯ estadoDe (2)
     × saca del documento las 34 claves del estado, en el orden del esquema y sin avances (§8, §9) 4ms
     × comparte las colecciones sin copiarlas, y evita la trampa de { ...documento } 1ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/ejemplo/asentamientosDinero.test.ts > los libros de los asentamientos > el detalle de los salarios nombra el oficio en singular con 1 y en plural con más: «Pastor» (§6.3)
AssertionError: expected [ [ 'Granjeros', 6 ], …(4) ] to deeply equal [ [ 'Granjeros', 6 ], …(4) ]

- Expected
+ Received

@@ -14,9 +14,9 @@
    [
      "Canteros",
      2,
    ],
    [
-     "Pastor",
+     "Pastores",
      1,
    ],
  ]

 ❯ src/dominio/ejemplo/asentamientosDinero.test.ts:104:72
    102|   it('el detalle de los salarios nombra el oficio en singular con 1 y …
    103|     const salarios = MOVIMIENTOS_BREE.find((m) => m.id === MOV_BREE.sa…
    104|     expect(salarios?.detalleTrabajo?.map((d) => [d.nombre, d.numero]))…
       |                                                                        ^
    105|       ['Granjeros', 6],
    106|       ['Leñadores', 3],

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/5]⎯

 FAIL  src/dominio/ejemplo/partidaYPersonaje.test.ts > la bolsa de Tharan > el beneficio del Tonel del 1 de abril lleva lo tecleado en su inversión: «3 mo» (§3)
AssertionError: expected { base: 300000 } to deeply equal { base: 300000, introducido: { …(2) } }

- Expected
+ Received

  {
    "base": 300000,
-   "introducido": {
-     "cantidad": "3",
-     "moneda": "mo",
-   },
  }

 ❯ src/dominio/ejemplo/partidaYPersonaje.test.ts:113:32
    111|     const beneficio = MOVIMIENTOS_THARAN.find((m) => m.id === MOV_THAR…
    112|     const tonel = INVERSIONES.find((i) => i.id === INVERSION.tonelDora…
    113|     expect(beneficio?.importe).toEqual({ base: 300000, introducido: { …
       |                                ^
    114|     expect(beneficio?.importe).toEqual(tonel?.beneficio)
    115|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/5]⎯

 FAIL  src/dominio/modelo/documento.test.ts > estadoDe > saca del documento las 34 claves del estado, en el orden del esquema y sin avances (§8, §9)
TypeError: estadoDe is not a function
 ❯ src/dominio/modelo/documento.test.ts:141:20
    139| describe('estadoDe', () => {
    140|   it('saca del documento las 34 claves del estado, en el orden del esq…
    141|     const estado = estadoDe(DOCUMENTO)
       |                    ^
    142|     expect(Object.keys(estado)).toEqual(Object.keys(EsquemaEstadoParti…
    143|     expect(Object.keys(estado)).toHaveLength(34)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/5]⎯

 FAIL  src/dominio/modelo/documento.test.ts > estadoDe > comparte las colecciones sin copiarlas, y evita la trampa de { ...documento }
TypeError: estadoDe is not a function
 ❯ src/dominio/modelo/documento.test.ts:149:20
    147|
    148|   it('comparte las colecciones sin copiarlas, y evita la trampa de { .…
    149|     const estado = estadoDe(DOCUMENTO)
       |                    ^
    150|     expect(estado.partida).toBe(DOCUMENTO.partida)
    151|     expect(estado.movimientos).toBe(DOCUMENTO.movimientos)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/5]⎯

 FAIL  src/dominio/modelo/movimientos.test.ts > EsquemaMovimiento > rechaza programado un movimiento que sale de un pago de deuda, una venta o una transferencia (D-033)
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ src/dominio/modelo/movimientos.test.ts:135:26
    133|   it('rechaza programado un movimiento que sale de un pago de deuda, u…
    134|     const pago = EsquemaMovimiento.safeParse({ ...PAGO_AL_GREMIO, prog…
    135|     expect(pago.success).toBe(false)
       |                          ^
    136|     expect(pago.error?.issues.map((i) => i.message)).toEqual([SOLO_OBR…
    137|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯


 Test Files  4 failed (4)
      Tests  5 failed | 35 passed (40)
```

- [ ] **Paso 5: Implementar `estadoDe`**

Añade este bloque **al final** de `src/dominio/modelo/documento.ts`, después de `export type DocumentoPartida = …` (deja una línea en blanco entre los dos). No hace falta ningún import nuevo:

```ts
/** Las 34 claves de EstadoPartida, en el orden del esquema. */
const CLAVES_DEL_ESTADO = Object.keys(EsquemaEstadoPartida.shape) as (keyof EstadoPartida)[]

/**
 * Solo las 34 claves de EsquemaEstadoPartida, sin `avances`: lo que recibe simular y copia snapshotPrevio
 * (§8, §9, T12). Comparte las colecciones con el documento, sin copiarlas. Nunca `{ ...documento }`: TypeScript lo
 * acepta como EstadoPartida, pero arrastra `avances` y, con ellos, el snapshotPrevio del último avance.
 */
export function estadoDe(documento: EstadoPartida): EstadoPartida {
  return Object.fromEntries(CLAVES_DEL_ESTADO.map((clave) => [clave, documento[clave]])) as EstadoPartida
}
```

- Las claves salen del esquema (`EsquemaEstadoPartida.shape`), no de una lista escrita a mano: si una fase futura añade una colección al estado, `estadoDe` la recoge sola.
- `Object.fromEntries` respeta el orden de la lista, que es el del esquema y el de la exportación.
- El parámetro se tipa `EstadoPartida`, no `DocumentoPartida`: así sirve para los dos, que es justo el caso que hay que cubrir. El identificador es `documento`, nunca `document`, que `pureza.test.ts` prohíbe como palabra suelta en el dominio.
- «T12» en el JSDoc es la técnica 12 de las decisiones técnicas de este plan.

- [ ] **Paso 6: Añadir la comprobación de los vinculados programados**

En `src/dominio/modelo/movimientos.ts` hay que hacer dos cambios.

**6.a.** Justo **después** de la línea `export type Vinculo = z.infer<typeof EsquemaVinculo>`, añade (con una línea en blanco delante):

```ts
/** Los vínculos cuyo movimiento puede esperar programado: el motor los aplica en los pasos 3 y 7 (§7, D-033). */
const VINCULOS_PROGRAMABLES: readonly Vinculo['tipo'][] = ['obra', 'caravana', 'entradaAlmacen']
```

**6.b.** Sustituye el final de `EsquemaMovimiento`:

```ts
    exige(
      (m) => m.objetoPendiente === undefined || (m.tipo === 'gasto' && m.programado),
      'El objeto pendiente solo va en un gasto programado',
    ),
  )
export type Movimiento = z.infer<typeof EsquemaMovimiento>
```

por este, que añade la comprobación después de la del objeto pendiente:

```ts
    exige(
      (m) => m.objetoPendiente === undefined || (m.tipo === 'gasto' && m.programado),
      'El objeto pendiente solo va en un gasto programado',
    ),
    // D-033: solo un movimiento suelto tiene fecha futura; los de obras, caravanas y compras siguen sus reglas (§7).
    exige(
      (m) => !m.programado || m.vinculo === undefined || VINCULOS_PROGRAMABLES.includes(m.vinculo.tipo),
      'Un movimiento que sale de otro registro solo queda programado si es de una obra, una caravana o una compra',
    ),
  )
export type Movimiento = z.infer<typeof EsquemaMovimiento>
```

- `VINCULOS_PROGRAMABLES` se tipa con `Vinculo['tipo']` para que `includes` acepte `m.vinculo.tipo` sin conversiones y para que `npx tsc -b` avise si algún día se escribe mal uno de los tres nombres.
- La comprobación va en el esquema, no en `validacion/coherencia.ts`, porque no depende de la fecha actual ni de otros registros: es la forma de un movimiento. Una copia importada con un pago de deuda programado se rechaza entera con «La copia está dañada: …», como cualquier otro fallo de forma.
- No se sube `VERSION_FORMATO`: hasta la fase 6 no hay partidas guardadas de verdad, y la partida de ejemplo no tiene ningún movimiento programado.

- [ ] **Paso 7: Corregir el JSDoc de `EsquemaAvisoAvance`**

En `src/dominio/modelo/avance.ts`, sustituye la línea:

```ts
/** Un aviso guardado con el avance, tal como lo pinta P5 (decisión 4). Sigue vigente hasta el avance siguiente. */
```

por esta:

```ts
/** Un aviso guardado con el avance (decisión 4): los avisos vigentes al terminar el avance, tal como los pinta P5. */
```

El esquema de debajo no cambia.

- [ ] **Paso 8: Ajustar la partida de ejemplo**

**8.a.** En `src/dominio/ejemplo/asentamientosDinero.ts`, dentro del movimiento `MOV_BREE.salarios6Abril`, sustituye la línea:

```ts
      { origenId: TRABAJADOR.pastores, nombre: 'Pastores', numero: 1, importe: { base: 10000 } },
```

por esta:

```ts
      { origenId: TRABAJADOR.pastores, nombre: 'Pastor', numero: 1, importe: { base: 10000 } },
```

La copia del 10 de abril (`SNAPSHOT_10_ABRIL`, en `ejemplo/avances.ts`) se arma con el mismo array `MOVIMIENTOS_BREE`, así que recoge el cambio sin tocarla.

**8.b.** En `src/dominio/ejemplo/partidaYPersonaje.ts`, en el movimiento del beneficio del Tonel, sustituye:

```ts
    id: MOV_THARAN.beneficioTonel,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 1 },
    tipo: 'ingreso',
    importe: { base: 300000 },
```

por:

```ts
    id: MOV_THARAN.beneficioTonel,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 1 },
    tipo: 'ingreso',
    importe: { base: 300000, introducido: { cantidad: '3', moneda: 'mo' } },
```

Los 3 mo son exactamente los 300.000 mh de la base, así que la comprobación de `validacion/coherencia.ts` que ata lo tecleado a la base («Lo tecleado («3 mo») no cuadra con el importe guardado») sigue sin quejarse, y la prueba que ya existe «lo tecleado cuadra con el importe guardado en las equivalencias de la partida (§3)» ahora también recorre este movimiento.

- [ ] **Paso 9: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/modelo/documento.test.ts src/dominio/modelo/movimientos.test.ts src/dominio/ejemplo/asentamientosDinero.test.ts src/dominio/ejemplo/partidaYPersonaje.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  4 passed (4)
      Tests  40 passed (40)
```

- [ ] **Paso 10: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada, `npm run lint` termina sin errores y `npm test` termina con **596 pruebas en 48 archivos**: las 589 de la tarea 4 y las **7 nuevas** de esta tarea. `pureza.test.ts` no crece. Entre las 596 está la de `ejemplo/sombraDelEste.test.ts` que exige `validarCopia(documentoDeEjemplo(), catalogosDeEjemplo())` igual a `[]`: la partida de ejemplo sigue siendo una copia válida con «Pastor», con el Tonel en «3 mo» y con la comprobación nueva, y ninguna prueba de las fases 1 y 2 se rompe:

```text
 Test Files  48 passed (48)
      Tests  596 passed (596)
```

Si el número que ves no es 596, sigue con **el tuyo**: lo que esta tarea garantiza es **+7 pruebas y +0 archivos** sobre lo que dejó la tarea 4.

- [ ] **Paso 11: Commit**

```bash
git add src/dominio/modelo/documento.ts src/dominio/modelo/documento.test.ts src/dominio/modelo/movimientos.ts src/dominio/modelo/movimientos.test.ts src/dominio/modelo/avance.ts src/dominio/ejemplo/asentamientosDinero.ts src/dominio/ejemplo/asentamientosDinero.test.ts src/dominio/ejemplo/partidaYPersonaje.ts src/dominio/ejemplo/partidaYPersonaje.test.ts
git commit -m "feat(modelo): estadoDe, vinculados programados solo de obras, caravanas y compras, y ajustes del ejemplo" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía; puede salir el aviso inofensivo `LF will be replaced by CRLF` por cada archivo). `git status --short` no muestra nada:

```text
[implementacion/fase-3 82786ea] feat(modelo): estadoDe, vinculados programados solo de obras, caravanas y compras, y ajustes del ejemplo
 9 files changed, 117 insertions(+), 3 deletions(-)
```

---

### Tarea 6 · Validación que el motor necesita

El motor de las tareas 13 a 21 y las ediciones de las tareas 23 a 26 dejan en la partida tres cosas que la validación de la fase 2 rechaza hoy, aunque la especificación las admite. Si no se cambian antes, `validarCopia` daría problemas con partidas buenas: al importar una copia, en la prueba del entregable (tarea 28) y en cualquier prueba que valide el estado que sale de un avance. Esta tarea cambia solo esas tres comprobaciones; los esquemas Zod no se tocan.

1. **Detalle frente a total (técnica 4 de la fase 3).** En `validacion/coherencia.ts`, la suma del detalle de un cobro de locales o de un pago agrupado de salarios o soldadas solo se compara con el importe si el movimiento **no** lleva `editadoEl`. J2c deja corregir el total de esos movimientos (el detalle se ve en solo lectura), y esa edición pone `editadoEl`. Lo que escribe el motor (sin `editadoEl`, también los pagos a medias de la tarea 17) se sigue vigilando.
2. **Edificio alquilado sin renta (técnica 6; D-036).** Se borra la comprobación «El edificio alquilado … no tiene su renta» de `validacion/coherencia.ts`. A7b ya enseña «Sin renta · Añádela en Impuestos y rentas», y la tarea 25 deja eliminar una renta aunque su edificio siga alquilado.
3. **Origen de impago borrado (técnica 5).** `validacion/referencias.ts` deja de exigir que exista el registro de `origenImpago.id`: ese campo solo sirve para agrupar los impagos de un mismo origen, y la tarea 25 deja borrar el tributo, el gasto recurrente o el pago programado que los causó. La contraparte y el dominio de la deuda se siguen exigiendo, y `unicidades.ts` sigue exigiendo una sola deuda de impago abierta por origen (l.293-300), sin cambios.

Depende de la tarea 5, que deja el modelo y el ejemplo como los necesita la fase 3. Esta tarea no usa nada nuevo de ella, pero parte de las **596 pruebas en 48 archivos** que deja.

**Reglas de la especificación que implementa:**

- **J2c en los movimientos agrupados (§6.2 l.385 y §7 l.1084).** «Cobro agrupado de impuestos de locales …: encima del importe total, el detalle por local en solo lectura («Herrería 1 · abril · 10 mo, habitual · +1 mo»). Solo se edita el importe total.» Y los movimientos de reglas «no son vinculados. Cada ocurrencia se edita suelta con J2c y la regla no cambia» (§6.4 l.765): también los salarios y las soldadas agrupados, con su detalle intacto.
- **Edificio alquilado sin renta (§6.3, A7b, l.609; §6.4 l.789).** «Sin renta enlazada: «Sin renta · Añádela en Impuestos y rentas».» Al eliminar un edificio, «su renta se conserva sin edificio». D-036: «un edificio alquilado puede quedarse sin renta».
- **Borrar el origen de un impago (§6.4 l.782 y §9 l.1296).** Al eliminar un «Gasto o ingreso recurrente, trabajador, unidad, impuesto», «sus movimientos pasados se conservan sueltos, sin regla», y la deuda de impago sigue: «Hay una deuda de impago por origen, sin interés ni vencimiento, que acumula los impagos sucesivos mientras esté abierta».

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Modificar: `src/dominio/validacion/coherencia.ts` (l.256-269)
- Modificar: `src/dominio/validacion/referencias.ts` (l.254-274)
- Prueba: `src/dominio/validacion/coherencia.test.ts` (3 pruebas nuevas al final)
- Prueba: `src/dominio/validacion/referencias.test.ts` (2 pruebas nuevas al final)

- [ ] **Paso 1: Escribir las pruebas que fallan**

Las cinco pruebas usan los ayudantes que ya tienen los dos archivos (`documentoMinimo()`, `movimientoBase()` y `catalogosMinimos()`) y los tipos que ya importan (`Movimiento` y `DocumentoPartida`), así que no hace falta tocar sus `import`. Qué comprueba cada una:
- `coherencia.test.ts`: el detalle que no cuadra sin `editadoEl` sigue dando sus dos problemas (pasa ya hoy: vigila que el cambio no quite de más); con `editadoEl`, el mismo documento no da ninguno; y un edificio alquilado sin renta no da ninguno.
- `referencias.test.ts`: tres deudas de impago cuyo tributo, gasto recurrente y pago programado ya no existen no dan ningún problema; y una deuda de impago con un dominio y una contraparte que no existen sigue dando esos dos (pasa ya hoy, por la misma razón).

Añade al final de `src/dominio/validacion/coherencia.test.ts`, después del último `})` y separado por una línea en blanco, este bloque:

```ts
describe('lo que la fase 3 necesita de la validación (técnicas 4 y 6)', () => {
  /** El cobro de locales del 1 de abril en Bree: 4,7 mo, con dos locales en el detalle que suman eso. */
  function cobroDeLocales(): Movimiento {
    return {
      ...movimientoBase('mov.locales', 'dom.bree'),
      fecha: { anio: 1640, mes: 4, dia: 1 },
      importe: { base: 470000 },
      concepto: 'Impuestos de locales · marzo (2)',
      origen: 'avance',
      avanceId: 'av.1',
      regla: { tipo: 'locales', id: 'dom.bree' },
      detalleLocales: [
        {
          localId: 'loc.herreria',
          nombre: 'Herrería 1',
          mes: { anio: 1640, mes: 3 },
          produccion: { base: 1500000 },
          anotada: false,
          impuesto: { base: 150000 },
        },
        {
          localId: 'loc.posada',
          nombre: 'Posada El Poney Pisador',
          mes: { anio: 1640, mes: 3 },
          produccion: { base: 4000000 },
          anotada: false,
          impuesto: { base: 320000 },
        },
      ],
    }
  }

  /** Los salarios del 6 de abril en Bree: −4,2 mo, con dos filas en el detalle que suman eso. */
  function pagoDeSalarios(): Movimiento {
    return {
      ...movimientoBase('mov.salarios', 'dom.bree'),
      fecha: { anio: 1640, mes: 4, dia: 6 },
      tipo: 'gasto',
      importe: { base: -420000 },
      concepto: 'Salarios de 14 trabajadores',
      origen: 'avance',
      avanceId: 'av.1',
      regla: { tipo: 'salarios', id: 'dom.bree' },
      detalleTrabajo: [
        { origenId: 'trab.granjeros', nombre: 'Granjeros', numero: 6, importe: { base: 180000 } },
        { origenId: 'trab.lenadores', nombre: 'Leñadores', numero: 8, importe: { base: 240000 } },
      ],
    }
  }

  it('sigue pillando el detalle que no cuadra con el total cuando nadie lo ha editado', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      { ...cobroDeLocales(), importe: { base: 500000 } },
      { ...pagoDeSalarios(), importe: { base: -400000 } },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([
      { ruta: 'movimientos[0].detalleLocales', mensaje: 'El cobro de locales «mov.locales» no cuadra con su detalle' },
      { ruta: 'movimientos[1].detalleTrabajo', mensaje: 'El pago agrupado «mov.salarios» no cuadra con su detalle' },
    ])
  })

  it('admite el total corregido con J2c: con editadoEl ya no se compara con el detalle (técnica 4)', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      { ...cobroDeLocales(), importe: { base: 500000 }, editadoEl: '2026-09-18T10:00:00.000Z' },
      { ...pagoDeSalarios(), importe: { base: -400000 }, editadoEl: '2026-09-18T10:05:00.000Z' },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([])
  })

  it('admite un edificio alquilado sin renta: la renta es un ingreso aparte (D-036, técnica 6)', () => {
    const documento = documentoMinimo()
    documento.edificios = [
      {
        id: 'ed.molino',
        dominioId: 'dom.bree',
        tipoId: 'tipoed.molino',
        nombre: 'Molino',
        estado: 'alquilado',
        trabajadoresNecesarios: 0,
        producciones: [],
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([])
  })
})
```

Añade al final de `src/dominio/validacion/referencias.test.ts`, después del último `})` y separado por una línea en blanco, este bloque:

```ts
describe('las deudas de impago de la fase 3 (técnica 5)', () => {
  /** Una deuda de impago de la caja de Bree con un cargo de 1,2 mo del 13 de abril. */
  function deudaDeImpago(
    id: string,
    origenImpago: NonNullable<DocumentoPartida['deudas'][number]['origenImpago']>,
  ): DocumentoPartida['deudas'][number] {
    return {
      id,
      dominioId: 'dom.bree',
      sentido: 'debo',
      contraparteId: 'persona.trabajadores-de-bree',
      fecha: { anio: 1640, mes: 4, dia: 13 },
      principal: { base: 120000 },
      interesPct: 0,
      estado: 'abierta',
      impago: true,
      origenImpago,
      cargos: [{ fecha: { anio: 1640, mes: 4, dia: 13 }, importe: { base: 120000 }, avanceId: 'av.1' }],
      pagos: [],
      devengos: [],
    }
  }

  it('admite una deuda de impago cuyo tributo, gasto recurrente o pago programado ya se borró: el origen solo agrupa', () => {
    const documento = documentoMinimo()
    documento.personas = [{ id: 'persona.trabajadores-de-bree', nombre: 'Trabajadores de Bree' }]
    documento.deudas = [
      deudaDeImpago('deuda.tributo', { tipo: 'tributo', id: 'imp.tributo-borrado' }),
      deudaDeImpago('deuda.recurrente', { tipo: 'recurrente', id: 'rec.posada-borrada' }),
      deudaDeImpago('deuda.programado', { tipo: 'programado', id: 'mov.pago-borrado' }),
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([])
  })

  it('sigue exigiendo el dominio y la contraparte de una deuda de impago', () => {
    const documento = documentoMinimo()
    documento.deudas = [
      { ...deudaDeImpago('deuda.salarios', { tipo: 'salarios', id: 'dom.bree' }), dominioId: 'dom.borrado' },
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      { ruta: 'deudas[0].dominioId', mensaje: 'No existe el dominio «dom.borrado»' },
      {
        ruta: 'deudas[0].contraparteId',
        mensaje: 'No existe la persona o entidad «persona.trabajadores-de-bree»',
      },
    ])
  })
})
```

- [ ] **Paso 2: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/validacion/coherencia.test.ts src/dominio/validacion/referencias.test.ts
```

Fallo esperado: fallan 3 de las 5 pruebas nuevas, cada una con los problemas que la validación de hoy todavía da. Las otras dos pasan, y las 24 que ya había siguen pasando (29 en total). La hora, la duración, el número de línea y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/validacion/referencias.test.ts (12 tests | 1 failed) 31ms
   ❯ las deudas de impago de la fase 3 (técnica 5) (2)
     × admite una deuda de impago cuyo tributo, gasto recurrente o pago programado ya se borró: el origen solo agrupa 13ms
 ❯ src/dominio/validacion/coherencia.test.ts (17 tests | 2 failed) 50ms
   ❯ lo que la fase 3 necesita de la validación (técnicas 4 y 6) (3)
     × admite el total corregido con J2c: con editadoEl ya no se compara con el detalle (técnica 4) 14ms
     × admite un edificio alquilado sin renta: la renta es un ingreso aparte (D-036, técnica 6) 3ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/validacion/coherencia.test.ts > lo que la fase 3 necesita de la validación (técnicas 4 y 6) > admite el total corregido con J2c: con editadoEl ya no se compara con el detalle (técnica 4)
AssertionError: expected [ { …(2) }, { …(2) } ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "mensaje": "El cobro de locales «mov.locales» no cuadra con su detalle",
+     "ruta": "movimientos[0].detalleLocales",
+   },
+   {
+     "mensaje": "El pago agrupado «mov.salarios» no cuadra con su detalle",
+     "ruta": "movimientos[1].detalleTrabajo",
+   },
+ ]

 ❯ src/dominio/validacion/coherencia.test.ts:558:49
    556|       { ...pagoDeSalarios(), importe: { base: -400000 }, editadoEl: '2…
    557|     ]
    558|     expect(validarCoherenciaInterna(documento)).toEqual([])
       |                                                 ^
    559|   })
    560|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  src/dominio/validacion/coherencia.test.ts > lo que la fase 3 necesita de la validación (técnicas 4 y 6) > admite un edificio alquilado sin renta: la renta es un ingreso aparte (D-036, técnica 6)
AssertionError: expected [ { ruta: 'edificios[0]', …(1) } ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "mensaje": "El edificio alquilado «ed.molino» no tiene su renta",
+     "ruta": "edificios[0]",
+   },
+ ]

 ❯ src/dominio/validacion/coherencia.test.ts:574:49
    572|       },
    573|     ]
    574|     expect(validarCoherenciaInterna(documento)).toEqual([])
       |                                                 ^
    575|   })
    576| })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  src/dominio/validacion/referencias.test.ts > las deudas de impago de la fase 3 (técnica 5) > admite una deuda de impago cuyo tributo, gasto recurrente o pago programado ya se borró: el origen solo agrupa
AssertionError: expected [ { …(2) }, { …(2) }, { …(2) } ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "mensaje": "No existe el impuesto o tributo «imp.tributo-borrado»",
+     "ruta": "deudas[0].origenImpago.id",
+   },
+   {
+     "mensaje": "No existe el gasto o ingreso recurrente «rec.posada-borrada»",
+     "ruta": "deudas[1].origenImpago.id",
+   },
+   {
+     "mensaje": "No existe el movimiento «mov.pago-borrado»",
+     "ruta": "deudas[2].origenImpago.id",
+   },
+ ]

 ❯ src/dominio/validacion/referencias.test.ts:399:63
    397|       deudaDeImpago('deuda.programado', { tipo: 'programado', id: 'mov…
    398|     ]
    399|     expect(validarReferencias(documento, catalogosMinimos())).toEqual(…
       |                                                               ^
    400|   })
    401|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯


 Test Files  2 failed (2)
      Tests  3 failed | 26 passed (29)
   Start at  11:42:11
   Duration  1.15s (import 46%, transform 40%, tests 10%, worker 4%)
```

- [ ] **Paso 3: Cambiar `coherencia.ts`**

En `src/dominio/validacion/coherencia.ts`, dentro de `problemasDelEstado`, sustituye este bloque (l.256-269: la comprobación del edificio alquilado y el principio de la del detalle):

```ts
  documento.edificios.forEach((e, i) => {
    if (e.estado !== 'alquilado') {
      return
    }
    const tiene = documento.impuestosRentas.some(
      (imp) => imp.dominioId === e.dominioId && imp.edificioId === e.id && imp.sentido === 'ingreso',
    )
    exige(tiene, `edificios[${i}]`, `El edificio alquilado «${e.id}» no tiene su renta`)
  })
  documento.movimientos.forEach((m, i) => {
    const regla = m.regla
    if (regla === undefined) {
      return
    }
```

por este otro:

```ts
  documento.movimientos.forEach((m, i) => {
    const regla = m.regla
    // Un total corregido con J2c lleva editadoEl y ya no tiene por qué cuadrar con su detalle, que J2c enseña
    // en solo lectura (§6.2 l.385; técnica 4 de la fase 3). Lo que escribe el motor, sin editadoEl, sí se vigila.
    if (regla === undefined || m.editadoEl !== undefined) {
      return
    }
```

El resto de la comprobación del detalle (las dos sumas, desde `if (regla.tipo === 'locales' …` hasta el `})` que cierra el `forEach`) no cambia.

- [ ] **Paso 4: Cambiar `referencias.ts`**

En `src/dominio/validacion/referencias.ts`, dentro del bloque «Deudas» de `validarReferencias`, sustituye estas líneas (l.254-274: el final de los pagos, la comprobación de `origenImpago` y el cierre del `forEach`):

```ts
    })
    if (d.origenImpago !== undefined) {
      const o = d.origenImpago
      const ruta = `${r}.origenImpago.id`
      switch (o.tipo) {
        case 'salarios':
        case 'soldadas':
          exige(asentamientos.has(o.id), ruta, `No existe el asentamiento «${o.id}»`)
          break
        case 'tributo':
          exige(impuestosRentas.has(o.id), ruta, `No existe el impuesto o tributo «${o.id}»`)
          break
        case 'recurrente':
          exige(recurrentes.has(o.id), ruta, `No existe el gasto o ingreso recurrente «${o.id}»`)
          break
        case 'programado':
          exige(movimientos.has(o.id), ruta, `No existe el movimiento «${o.id}»`)
          break
      }
    }
  })
```

por estas:

```ts
    })
    // origenImpago no se comprueba: solo agrupa los impagos de un mismo origen, y ese tributo, gasto recurrente
    // o pago programado puede haberse borrado después (§6.4 l.775 y l.782; técnica 5 de la fase 3).
  })
```

Los índices `asentamientos`, `impuestosRentas`, `recurrentes` y `movimientos` se siguen usando más arriba y más abajo en la función, así que `noUnusedLocals` no protesta.

- [ ] **Paso 5: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/validacion/coherencia.test.ts src/dominio/validacion/referencias.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  2 passed (2)
      Tests  29 passed (29)
   Start at  11:42:16
   Duration  1.21s (import 53%, transform 38%, tests 5%, worker 3%)
```

- [ ] **Paso 6: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **601 pruebas en 48 archivos** (las 596 de la tarea 5 más las 5 nuevas; no hay módulos nuevos, así que `pureza.test.ts` no crece); `npm run lint` solo escribe su cabecera y sale con código 0. Que ninguna otra prueba se rompa confirma que el ejemplo sigue pasando `validarCopia` (lo comprueba `src/dominio/ejemplo/sombraDelEste.test.ts`).

```text
 Test Files  48 passed (48)
      Tests  601 passed (601)
```

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/validacion/coherencia.ts src/dominio/validacion/coherencia.test.ts src/dominio/validacion/referencias.ts src/dominio/validacion/referencias.test.ts
git commit -m "fix(validacion): el detalle solo se compara sin editadoEl, alquilado sin renta y origen de impago borrado" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` puede avisar `LF will be replaced by CRLF` por los archivos tocados, y es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-3 f4daf0d] fix(validacion): el detalle solo se compara sin editadoEl, alquilado sin renta y origen de impago borrado
 4 files changed, 142 insertions(+), 29 deletions(-)
```

**Avisos que esta tarea deja escritos:**

1. La comprobación del detalle sigue viva para todo lo que no lleve `editadoEl`. Por eso los efectos secundarios de un borrado (quitar `localId`, `origenId` o la regla, tareas 25 y 26) **no** ponen `editadoEl`: si lo pusieran, el detalle dejaría de vigilarse (técnica 31).
2. `origenImpago.id` puede apuntar a un registro que ya no existe. Quien lo lea (los avisos de la tarea 20, la fase 5) no puede dar por hecho que lo encontrará: el nombre que se enseña sale de la contraparte de la deuda.

---

### Tarea 7 · Habitantes y efectos de eventos

Dos piezas pequeñas y puras que el motor usa en los cobros y los pagos (tareas 15 a 17), y el balance en la tarea 9:

- **`poblacion/habitantes.ts`**: los habitantes de un asentamiento un día. El impuesto «por habitante» se cobra con los habitantes del día del cobro, y el balance prorratea con los de hoy. La fase 3 no tiene paso 2 del motor («Cambios de población»): como los habitantes no se guardan, basta con sumar los cambios con fecha hasta ese día, y un cambio del mismo día ya cuenta, porque el paso 2 va antes que el 8.
- **`eventos/efectos.ts`**: qué eventos de dinero están activos un día y cuánto cambian un coste o un ingreso. Solo cuentan los eventos de un asentamiento con algún efecto de «costes» o de «ingresos»; los de producción y consumo son de la fase 4. La suma de los porcentajes de todos los eventos activos sobre ese objetivo (el suyo y «todos») se aplica como `base × máx(0, 1 + suma / 100)`, redondeado al mh.

No depende de ninguna tarea anterior de esta fase. De la fase 1 usa `compararFechas` y `aNumeroDeDia` (`calendario/fecha.ts`) y `porcentajeDe` (`dinero/importe.ts`), que ya redondea al mh con las mitades hacia arriba y sin coma flotante. Las pruebas usan la partida de ejemplo (`documentoDeEjemplo()`) y sus ids (`ejemplo/ids.ts`).

**Reglas de la especificación que implementa:**

- **Habitantes (§7 l.1098).** «**Habitantes** = habitantes iniciales + cambios de población con fecha hasta ese día.» El motor los calcula día a día en su paso 2, antes de los cobros (§9 l.1274 y l.1280). Nunca bajan de 0 (técnica 33 del plan de la fase 3).
- **Por habitante (§6.4 l.674, selector n.º 26).** «importe × habitantes el día del cobro». Un asentamiento sin población tiene 0 habitantes, y su impuesto por habitante sale a 0 (D-022: sin movimiento).
- **Efectos de eventos (§7 l.1139 y §9, «Fórmulas»).** «el consumo, los costes y los ingresos afectados = base × máx(0, 1 + suma de los % de los eventos activos sobre ese objetivo). El objetivo de un efecto es todos, un edificio, un recurso, una categoría de coste o un impuesto. Los efectos de eventos no se aplican al impuesto de locales comerciales». «Un evento de partida no tiene efectos».
- **Objetivos (§6.5 n.º 29).** «salarios, soldadas, tributos o gastos (costes); cada impuesto o renta, salvo los locales comerciales (ingresos)».
- **Qué es «gastos» y «todos los ingresos» (D-026).** «Gastos» son los gastos recurrentes que se pagan desde la caja de ese asentamiento, y «todos los ingresos» son sus impuestos y rentas, sin los locales. Los pagos programados, los beneficios y los ingresos recurrentes del personaje nunca cambian con un evento.
- **Días del evento (§8; `modelo/eventos.ts` l.48).** «Fin = inicio + duracionDias − 1»: la feria de primavera (15 de abril, 3 días) está activa del 15 al 17.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/poblacion/habitantes.ts`
- Crear: `src/dominio/eventos/efectos.ts`
- Prueba: `src/dominio/poblacion/habitantes.test.ts`
- Prueba: `src/dominio/eventos/efectos.test.ts`

- [ ] **Paso 1: Escribir las dos pruebas que fallan**

Las carpetas `src/dominio/poblacion/` y `src/dominio/eventos/` son nuevas. Las dos pruebas se escriben a la vez porque ninguna depende de la otra.

Qué comprueba cada bloque:
- `habitantesEl`: Bree del ejemplo (1.214 iniciales; −6 el 14 de febrero, +20 el 2 de marzo y +12 el 1 de abril) tiene 1.240 el 1 y el 12 de abril, 1.228 el 31 de marzo y 1.214 antes del primer cambio; y una población que pierde más de lo que tiene se queda en 0.
- `habitantesDe`: Bree 1.240 y Archet 310 el 12 de abril; Tharan, que no tiene población, 0.
- `eventoActivoEl` y `eventosDeDineroEl`: la feria está activa del 15 al 17; el 15 de abril solo cuenta ella (las lluvias son de producción y el mensajero no tiene efectos); el 12 de abril no cuenta ninguno y el 22 de marzo cuentan los bandidos del peaje; un evento de partida no cuenta nunca.
- `pctDeIngresos` y `pctDeCostes`: suman «todos» y el objetivo concreto, y no suman otra categoría, otro impuesto, otro ámbito ni otro asentamiento.
- `conEfecto`: 3 mo con +500 % son 18 mo (los aranceles del 15 de abril); −100 % y −150 % dan 0; y el redondeo es al mh con las mitades hacia arriba.

Crea `src/dominio/poblacion/habitantes.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Poblacion } from '../modelo/almacen'
import { habitantesDe, habitantesEl } from './habitantes'

/** Atajo para escribir fechas de 1640: dia(12, 4) es el 12 de abril. */
function dia(d: number, m: number): Fecha {
  return { anio: 1640, mes: m, dia: d }
}

/** La población de Bree del ejemplo: 1.214 iniciales, −6 el 14 de febrero, +20 el 2 de marzo y +12 el 1 de abril. */
function poblacionDeBree(): Poblacion {
  const poblacion = documentoDeEjemplo().poblaciones.find((p) => p.dominioId === DOM.bree)
  if (poblacion === undefined) {
    throw new Error('El ejemplo no tiene la población de Bree')
  }
  return poblacion
}

describe('habitantesEl', () => {
  it('Bree tiene 1.240 habitantes el 1 de abril: el cambio de ese mismo día ya cuenta (§7)', () => {
    expect(habitantesEl(poblacionDeBree(), dia(1, 4))).toBe(1240)
    expect(habitantesEl(poblacionDeBree(), dia(12, 4))).toBe(1240)
  })

  it('el 31 de marzo todavía son 1.228, y antes del primer cambio, los 1.214 iniciales', () => {
    expect(habitantesEl(poblacionDeBree(), dia(31, 3))).toBe(1228)
    expect(habitantesEl(poblacionDeBree(), dia(1, 1))).toBe(1214)
  })

  it('nunca baja de 0, aunque los cambios resten más que los iniciales (técnica 33)', () => {
    const poblacion: Poblacion = {
      dominioId: 'dom.aldea',
      habitantesIniciales: 10,
      cambios: [{ id: 'camb.1', fecha: dia(5, 4), delta: -25, motivo: 'Se marchan todos' }],
      consumos: [],
    }
    expect(habitantesEl(poblacion, dia(4, 4))).toBe(10)
    expect(habitantesEl(poblacion, dia(5, 4))).toBe(0)
  })
})

describe('habitantesDe', () => {
  it('busca la población del asentamiento: Bree 1.240 y Archet 310 el 12 de abril', () => {
    const estado = documentoDeEjemplo()
    expect(habitantesDe(estado, DOM.bree, dia(12, 4))).toBe(1240)
    expect(habitantesDe(estado, DOM.archet, dia(12, 4))).toBe(310)
  })

  it('un dominio sin población tiene 0 habitantes: la bolsa de Tharan', () => {
    expect(habitantesDe(documentoDeEjemplo(), DOM.tharan, dia(12, 4))).toBe(0)
  })
})
```

Crea `src/dominio/eventos/efectos.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM, EVENTO, IMPUESTO } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { EfectoEvento, EventoNarrativo } from '../modelo/eventos'
import { conEfecto, eventoActivoEl, eventosDeDineroEl, pctDeCostes, pctDeIngresos } from './efectos'

/** Atajo para escribir fechas de 1640: dia(15, 4) es el 15 de abril. */
function dia(d: number, m: number): Fecha {
  return { anio: 1640, mes: m, dia: d }
}

/** Los cuatro eventos del ejemplo: lluvias (8/4, 14 días), feria (15/4, 3), bandidos (20/3, 5) y mensajero (1/4, 1). */
function eventosDelEjemplo(): EventoNarrativo[] {
  return documentoDeEjemplo().eventos
}

/** Un evento de un asentamiento, activo del 1 al 30 de abril, con los efectos que se le pasen. */
function evento(id: string, dominioId: string, efectos: EfectoEvento[]): EventoNarrativo {
  return { id, dominioId, nombre: 'Evento de prueba', inicio: dia(1, 4), duracionDias: 30, efectos }
}

describe('eventoActivoEl', () => {
  it('la feria de primavera (15 de abril, 3 días) está activa del 15 al 17, y no el 14 ni el 18 (§8)', () => {
    const feria = eventosDelEjemplo().find((e) => e.id === EVENTO.feria)
    if (feria === undefined) {
      throw new Error('El ejemplo no tiene la feria')
    }
    expect([14, 15, 16, 17, 18].map((d) => eventoActivoEl(feria, dia(d, 4)))).toEqual([false, true, true, true, false])
  })
})

describe('eventosDeDineroEl', () => {
  it('el 15 de abril solo cuenta la feria: las lluvias son de producción y el mensajero no tiene efectos', () => {
    expect(eventosDeDineroEl(eventosDelEjemplo(), dia(15, 4)).map((e) => e.id)).toEqual([EVENTO.feria])
  })

  it('el 12 de abril no hay ninguno, y el 22 de marzo estaban los bandidos del peaje', () => {
    expect(eventosDeDineroEl(eventosDelEjemplo(), dia(12, 4))).toEqual([])
    expect(eventosDeDineroEl(eventosDelEjemplo(), dia(22, 3)).map((e) => e.id)).toEqual([EVENTO.bandidos])
  })

  it('un evento de partida no cuenta, aunque traiga efectos (EsquemaEventoNarrativo no lo deja guardar)', () => {
    const dePartida: EventoNarrativo = {
      id: 'ev.partida',
      nombre: 'Invierno largo',
      inicio: dia(1, 4),
      duracionDias: 30,
      efectos: [{ ambito: 'costes', objetivo: { tipo: 'todos' }, pct: 50 }],
    }
    expect(eventosDeDineroEl([dePartida], dia(15, 4))).toEqual([])
  })
})

describe('pctDeIngresos', () => {
  it('suma los % de «todos los ingresos» y los de ese impuesto (§7 l.1139, D-026)', () => {
    const activos = [
      evento('ev.a', DOM.bree, [{ ambito: 'ingresos', objetivo: { tipo: 'todos' }, pct: 10 }]),
      evento('ev.b', DOM.bree, [
        { ambito: 'ingresos', objetivo: { tipo: 'impuesto', id: IMPUESTO.aranceles }, pct: 500 },
      ]),
    ]
    expect(pctDeIngresos(activos, DOM.bree, IMPUESTO.aranceles)).toBe(510)
    expect(pctDeIngresos(activos, DOM.bree, IMPUESTO.peaje)).toBe(10)
  })

  it('no suma los efectos de costes ni los de otro asentamiento', () => {
    const activos = [
      evento('ev.a', DOM.bree, [{ ambito: 'costes', objetivo: { tipo: 'todos' }, pct: 30 }]),
      evento('ev.b', DOM.archet, [{ ambito: 'ingresos', objetivo: { tipo: 'todos' }, pct: -50 }]),
    ]
    expect(pctDeIngresos(activos, DOM.bree, IMPUESTO.aranceles)).toBe(0)
  })
})

describe('pctDeCostes', () => {
  it('suma los % de «todos los costes» y los de esa categoría (§6.5 n.º 29)', () => {
    const activos = [
      evento('ev.a', DOM.bree, [
        { ambito: 'costes', objetivo: { tipo: 'todos' }, pct: -20 },
        { ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'salarios' }, pct: 50 },
      ]),
    ]
    expect(pctDeCostes(activos, DOM.bree, 'salarios')).toBe(30)
    expect(pctDeCostes(activos, DOM.bree, 'soldadas')).toBe(-20)
  })

  it('no suma otra categoría, ni los de otro asentamiento, ni los de ingresos', () => {
    const activos = [
      evento('ev.a', DOM.bree, [{ ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'tributos' }, pct: 40 }]),
      evento('ev.b', DOM.archet, [{ ambito: 'costes', objetivo: { tipo: 'todos' }, pct: 25 }]),
      evento('ev.c', DOM.bree, [{ ambito: 'ingresos', objetivo: { tipo: 'todos' }, pct: 60 }]),
    ]
    expect(pctDeCostes(activos, DOM.bree, 'gastos')).toBe(0)
    expect(pctDeCostes(activos, DOM.bree, 'tributos')).toBe(40)
  })
})

describe('conEfecto', () => {
  it('base × (1 + pct / 100): los aranceles con la feria, 3 mo y +500 %, dan 18 mo (§9)', () => {
    expect(conEfecto(300000, 500)).toBe(1800000)
    expect(conEfecto(420000, -25)).toBe(315000)
    expect(conEfecto(420000, 0)).toBe(420000)
  })

  it('nunca da menos de 0: −100 % y −150 % dejan 0; y redondea al mh con las mitades hacia arriba', () => {
    expect(conEfecto(300000, -100)).toBe(0)
    expect(conEfecto(300000, -150)).toBe(0)
    expect(conEfecto(5, -50)).toBe(3)
  })
})
```

- [ ] **Paso 2: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/poblacion/habitantes.test.ts src/dominio/eventos/efectos.test.ts
```

Fallo esperado: Vitest no encuentra los módulos `./habitantes` y `./efectos`, que todavía no existen. La hora, la duración, el orden de los dos archivos y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/poblacion/habitantes.test.ts (0 test)
 ❯ src/dominio/eventos/efectos.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/eventos/efectos.test.ts [ src/dominio/eventos/efectos.test.ts ]
Error: Cannot find module './efectos' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/eventos/efectos.test.ts
 ❯ src/dominio/eventos/efectos.test.ts:6:1
      4| import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
      5| import type { EfectoEvento, EventoNarrativo } from '../modelo/eventos'
      6| import { conEfecto, eventoActivoEl, eventosDeDineroEl, pctDeCostes, pc…
       | ^
      7|
      8| /** Atajo para escribir fechas de 1640: dia(15, 4) es el 15 de abril. …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  src/dominio/poblacion/habitantes.test.ts [ src/dominio/poblacion/habitantes.test.ts ]
Error: Cannot find module './habitantes' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/poblacion/habitantes.test.ts
 ❯ src/dominio/poblacion/habitantes.test.ts:6:1
      4| import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
      5| import type { Poblacion } from '../modelo/almacen'
      6| import { habitantesDe, habitantesEl } from './habitantes'
       | ^
      7|
      8| /** Atajo para escribir fechas de 1640: dia(12, 4) es el 12 de abril. …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  2 failed (2)
      Tests  no tests
   Start at  11:42:58
   Duration  920ms (worker 96%, environment 4%)
```

- [ ] **Paso 3: Implementar `habitantes.ts`**

Crea `src/dominio/poblacion/habitantes.ts` con este contenido:

```ts
import { compararFechas, type Fecha } from '../calendario/fecha'
import type { Poblacion } from '../modelo/almacen'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'

/**
 * Habitantes de un día: iniciales + cambios con fecha hasta ese día incluido, nunca menos de 0 (§7, técnica 33).
 * Un cambio del mismo día ya cuenta: el paso 2 del motor (población) va antes que el 8 (cobros), §9.
 */
export function habitantesEl(poblacion: Poblacion, dia: Fecha): number {
  const habitantes = poblacion.cambios.reduce(
    (total, cambio) => (compararFechas(cambio.fecha, dia) <= 0 ? total + cambio.delta : total),
    poblacion.habitantesIniciales,
  )
  return Math.max(0, habitantes)
}

/** Habitantes de un asentamiento un día; 0 si no tiene población («habitantes el día del cobro», §6.5 n.º 26). */
export function habitantesDe(estado: EstadoPartida, dominioId: Id, dia: Fecha): number {
  const poblacion = estado.poblaciones.find((p) => p.dominioId === dominioId)
  return poblacion === undefined ? 0 : habitantesEl(poblacion, dia)
}
```

- [ ] **Paso 4: Implementar `efectos.ts`**

Crea `src/dominio/eventos/efectos.ts` con este contenido:

```ts
import { aNumeroDeDia, type Fecha } from '../calendario/fecha'
import { porcentajeDe } from '../dinero/importe'
import type { Id } from '../modelo/comunes'
import type { EventoNarrativo } from '../modelo/eventos'

/** Las cuatro categorías de coste de un efecto (§6.5 n.º 29). */
export type CategoriaCoste = 'salarios' | 'soldadas' | 'tributos' | 'gastos'

/** Si el evento está activo ese día: inicio ≤ día ≤ inicio + duracionDias − 1 (§8; modelo/eventos.ts l.48). */
export function eventoActivoEl(evento: EventoNarrativo, dia: Fecha): boolean {
  const inicio = aNumeroDeDia(evento.inicio)
  const numero = aNumeroDeDia(dia)
  return inicio <= numero && numero <= inicio + evento.duracionDias - 1
}

/**
 * Los eventos de asentamiento activos ese día con algún efecto de costes o de ingresos (§9 l.1273, paso 1).
 * Un evento de partida no tiene efectos económicos (§7 l.1139): aunque una copia lo trajera, no cuenta.
 */
export function eventosDeDineroEl(eventos: readonly EventoNarrativo[], dia: Fecha): EventoNarrativo[] {
  return eventos.filter(
    (e) =>
      e.dominioId !== undefined &&
      e.efectos.some((efecto) => efecto.ambito === 'costes' || efecto.ambito === 'ingresos') &&
      eventoActivoEl(e, dia),
  )
}

/** Suma de los % de costes de un asentamiento sobre una categoría: los de «todos» y los de esa categoría (§7 l.1139). */
export function pctDeCostes(activos: readonly EventoNarrativo[], dominioId: Id, categoria: CategoriaCoste): number {
  let pct = 0
  for (const evento of activos) {
    if (evento.dominioId !== dominioId) {
      continue
    }
    for (const efecto of evento.efectos) {
      if (efecto.ambito === 'costes' && (efecto.objetivo.tipo === 'todos' || efecto.objetivo.id === categoria)) {
        pct += efecto.pct
      }
    }
  }
  return pct
}

/**
 * Suma de los % de ingresos de un asentamiento sobre un impuesto o renta: «todos» y ese impuesto (§7 l.1139, D-026).
 * «Todos los ingresos» son sus impuestos y rentas: los locales no cambian con un evento (§7).
 */
export function pctDeIngresos(activos: readonly EventoNarrativo[], dominioId: Id, impuestoId: Id): number {
  let pct = 0
  for (const evento of activos) {
    if (evento.dominioId !== dominioId) {
      continue
    }
    for (const efecto of evento.efectos) {
      if (efecto.ambito === 'ingresos' && (efecto.objetivo.tipo === 'todos' || efecto.objetivo.id === impuestoId)) {
        pct += efecto.pct
      }
    }
  }
  return pct
}

/**
 * base × máx(0, 1 + pct / 100), redondeado al mh con las mitades hacia arriba: porcentajeDe(base, máx(0, 100 + pct))
 * (§9, «Fórmulas»). La suma de varios eventos puede bajar de −100 %: el importe se queda en 0, nunca negativo.
 */
export function conEfecto(base: number, pct: number): number {
  return porcentajeDe(base, Math.max(0, 100 + pct))
}
```

Los porcentajes de un evento llevan hasta 2 decimales y se suman en coma flotante (10,1 + 20,2 da 30,299999…). No pasa nada: `porcentajeDe` pasa el porcentaje a millonésimas con `Math.round` antes de multiplicar, así que el resultado en mh es exacto.

- [ ] **Paso 5: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/poblacion/habitantes.test.ts src/dominio/eventos/efectos.test.ts
```

Salida esperada (la hora y la duración varían): 5 pruebas de `habitantes.test.ts` y 10 de `efectos.test.ts`.

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  2 passed (2)
      Tests  15 passed (15)
   Start at  11:43:02
   Duration  849ms (import 55%, transform 40%, tests 3%, worker 2%)
```

- [ ] **Paso 6: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **618 pruebas en 50 archivos**; `npm run lint` solo escribe su cabecera y sale con código 0. La tarea 6 dejó 601 pruebas en 48 archivos, y esta trae **17 nuevas**: las 5 de `habitantes.test.ts`, las 10 de `efectos.test.ts` y **dos más** en `pureza.test.ts`, que es un `it.each` sobre los módulos de `src/dominio` y ahora recorre también `poblacion/habitantes.ts` y `eventos/efectos.ts`.

```text
 Test Files  50 passed (50)
      Tests  618 passed (618)
```

- [ ] **Paso 7: Commit**

Dos commits, uno por módulo, con el prefijo de cada uno:

```bash
git add src/dominio/poblacion/habitantes.ts src/dominio/poblacion/habitantes.test.ts
git commit -m "feat(poblacion): habitantes de un día y de un asentamiento" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git add src/dominio/eventos/efectos.ts src/dominio/eventos/efectos.test.ts
git commit -m "feat(eventos): eventos activos y su efecto sobre costes e ingresos" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (los identificadores de los commits varían). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/poblacion/habitantes.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/poblacion/habitantes.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 e923ab8] feat(poblacion): habitantes de un día y de un asentamiento
 2 files changed, 77 insertions(+)
 create mode 100644 src/dominio/poblacion/habitantes.test.ts
 create mode 100644 src/dominio/poblacion/habitantes.ts
warning: in the working copy of 'src/dominio/eventos/efectos.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/eventos/efectos.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 faccfb0] feat(eventos): eventos activos y su efecto sobre costes e ingresos
 2 files changed, 181 insertions(+)
 create mode 100644 src/dominio/eventos/efectos.test.ts
 create mode 100644 src/dominio/eventos/efectos.ts
```

**Avisos que esta tarea deja escritos:**

1. `habitantesDe` busca la población con `find` sobre `estado.poblaciones`: hay una por asentamiento, así que son unas pocas filas. Si algún día el motor la llama muchas veces por día, se puede indexar en el contexto (tarea 13) sin cambiar su firma.
2. `pctDeCostes` y `pctDeIngresos` reciben los eventos **ya activos** (`dia.eventos`, que rellena el paso 1 de la tarea 19): no vuelven a mirar las fechas.
3. Un evento anotado con fecha de hoy o pasada solo cuenta desde mañana porque el motor solo simula días posteriores a la fecha actual (§7 l.1139; lo fija una prueba de la tarea 19), no por nada de este módulo.

---

### Tarea 8 · Reglas de los locales

Todas las reglas puras de los impuestos de locales comerciales, en un solo módulo que usan el cobro del motor (tarea 16), el balance (tarea 9) y las ediciones de A3b y A3c (tarea 26). Aquí no se crea ningún movimiento ni se toca el estado: solo se calcula.

- **Meses** (`mesDe`, `compararMeses`, `mesSiguiente`, `mesAnterior`): el modelo guarda `cobradoHasta` y las producciones anotadas como `AnioMes` (`modelo/comunes.ts` l.20), y los cobros van por meses enteros.
- **Estado** (`estadoDelLocalEl`, `estadoVigenteDelLocal`, `abiertoAlgunDia`): un local guarda tramos de estado con su fecha de inicio (`cambiosEstado`, decisión 13 de la fase 2). El cobro mira el tramo de cada día; el balance y la fila de A3 miran el **último** tramo, el que eligió el jugador, aunque empiece mañana (D-028).
- **Producción e impuesto** (`produccionDelMes`, `impuestoDeLocal`): la producción anotada del mes o, si no hay, la habitual; y `máx(% × producción, mínimo)`, redondeado al mh.
- **Cobro** (`diaDeCobro`, `mesesPorCobrar`): el día de cobro de un tipo (o el último del mes) y los meses que tocan ese día: de `cobradoHasta + 1` al mes anterior, nunca antes del mes del alta.
- **Equivalente mensual** (`equivalenteMensualLocales`): lo que suman los locales abiertos de un asentamiento con la producción habitual. Bree: 470.000 mh, «+4,7 mo».

Depende de la tarea 7 solo por el orden de la tabla: no usa nada suyo. De la fase 1 usa `compararFechas` y `diaEnMes` (`calendario/fecha.ts`) y `porcentajeDe` (`dinero/importe.ts`). Las pruebas usan los locales y los tipos de local del ejemplo (`ejemplo/asentamientosDinero.ts`):

| Local | Tipo (%, mínimo, día) | Habitual | Impuesto con la habitual |
|---|---|---|---|
| Herrería 1 | Herrería (10 %, 2 mp, día 1) | 10 mo | 100.000 mh |
| Posada El Poney Pisador | Posada (8 %, 5 mp, día 1) | 40 mo | 320.000 mh |
| Tienda de telas | Tienda (5 %, 1 mp, día 1) | 6 mo (1,5 mo anotados en abril) | 30.000 mh (10.000 con la anotación) |
| Ultramarinos del camino | Tienda (5 %, 1 mp, día 1) | 4 mo | 20.000 mh |

Los cuatro se dan de alta el 1 de marzo de 1640, abiertos, con `cobradoHasta` en marzo de 1640.

**Reglas de la especificación que implementa:**

- **Tipo de local (§7 l.1065).** «día de cobro (de 1 a 31; si no existe en el mes, el último día)».
- **Producción del mes (§7 l.1067-1068).** «Sin anotación, cuenta la producción habitual. Anotar 0 = no produjo, así que paga el mínimo.»
- **Impuesto (§7 l.1069-1072; §9 l.1319).** «Impuesto de un local en un cobro = máx(porcentaje del tipo × producción del mes, mínimo del tipo). El porcentaje × producción se calcula en mh y se redondea al mh, con las mitades hacia arriba. Después se toma el máximo con el mínimo.» Ejemplo del usuario: «Herrería 1 produce 10 mo → 10 % = 1 mo, que supera el mínimo de 2 mp. Si en abril se anota 1 mo o 0 → 0,1 mo o 0, por debajo del mínimo → paga 2 mp = 0,2 mo».
- **Meses que se cobran (§7 l.1074-1076; §9 l.1304-1306).** «El día de cobro de su tipo actual, el motor cobra los meses del local desde cobradoHasta + 1 hasta el mes anterior, cada uno con su producción, y actualiza cobradoHasta.» «El mes del alta se cobra entero, sin prorratear. Los meses anteriores al alta no se cobran.»
- **Estado (§7 l.1078-1080; §9 l.1308).** «Un cambio de estado cuenta desde el día siguiente a la fecha actual (estadoDesde). Un mes se cobra si el local estuvo Abierto algún día de ese mes, con el mínimo entero y sin prorratear. Si estuvo cerrado todo el mes, no paga.»
- **Equivalente mensual (§7 l.1086-1087).** «Equivalente mensual = suma, por cada local abierto, de máx(% del tipo × habitual, mínimo). Los cerrados cuentan 0. Bree: +4,7 mo al mes (1 + 3,2 + 0,3 + 0,2).» «El equivalente mensual y el balance usan solo la habitual» (§9 l.1322).
- **Qué estado cuenta para el balance (D-028).** «Un local que cierras o abres hoy cuenta así en el balance desde ya, aunque el cambio valga desde mañana para el cobro.»

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/locales/impuesto.ts`
- Prueba: `src/dominio/locales/impuesto.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La carpeta `src/dominio/locales/` es nueva. Qué comprueba cada bloque:
- `meses`: las cuatro operaciones con meses, también cuando diciembre y enero cruzan de año.
- `estado de un local`: cerrado antes del primer tramo y el del último tramo que ya empezó (también el mismo día del cambio); el vigente es el último tramo aunque empiece mañana; un solo día abierto basta para que el mes pague (el último día del mes o solo el día 1); cerrado todo el mes no paga, ni un mes anterior al primer tramo.
- `producción e impuesto`: la tienda de telas usa en abril los 1,5 mo anotados y en marzo la habitual; anotar 0 es «anotada» y paga el mínimo; Herrería 1 paga 1 mo con 10 mo y el mínimo con 1 mo; la tienda con 1,5 mo paga el mínimo (0,1 mo) y la posada 3,2 mo; el redondeo de la mitad sube.
- `cobro`: el día 31 en abril es el 30, en febrero de 1640 (bisiesto) el 29; los meses por cobrar el 1 de mayo son [abril], [marzo, abril] si se cobró hasta febrero, [] si ya se cobró abril y [] antes del día de cobro; un local dado de alta el 20 de abril no cobra nada el 25, cobra abril entero el 1 de mayo y nunca meses anteriores a su alta.
- `equivalenteMensualLocales`: Bree da 470.000 con la habitual (la anotación de abril no cuenta); si la posada cierra desde mañana ya cuenta 0 (150.000); Archet, sin locales, 0.

Crea `src/dominio/locales/impuesto.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM, LOCAL, TIPO_LOCAL } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { LocalComercial, TipoLocal } from '../modelo/asentamiento'
import {
  abiertoAlgunDia,
  compararMeses,
  diaDeCobro,
  equivalenteMensualLocales,
  estadoDelLocalEl,
  estadoVigenteDelLocal,
  impuestoDeLocal,
  mesAnterior,
  mesDe,
  mesesPorCobrar,
  mesSiguiente,
  produccionDelMes,
} from './impuesto'

/** Atajo para escribir fechas de 1640: dia(1, 5) es el 1 de mayo. */
function dia(d: number, m: number): Fecha {
  return { anio: 1640, mes: m, dia: d }
}

/** Un local del ejemplo por su id. */
function localDelEjemplo(id: string): LocalComercial {
  const local = documentoDeEjemplo().localesComerciales.find((l) => l.id === id)
  if (local === undefined) {
    throw new Error(`El ejemplo no tiene el local «${id}»`)
  }
  return local
}

/** Un tipo de local del ejemplo por su id. */
function tipoDelEjemplo(id: string): TipoLocal {
  const tipo = documentoDeEjemplo().tiposLocal.find((t) => t.id === id)
  if (tipo === undefined) {
    throw new Error(`El ejemplo no tiene el tipo «${id}»`)
  }
  return tipo
}

/** La Herrería 1 del ejemplo (alta el 1 de marzo, abierta, cobrada hasta marzo) con otros tramos de estado. */
function herreriaCon(cambiosEstado: LocalComercial['cambiosEstado']): LocalComercial {
  return { ...localDelEjemplo(LOCAL.herreria1), cambiosEstado }
}

describe('meses', () => {
  it('mesDe, compararMeses, mesSiguiente y mesAnterior; diciembre y enero cruzan de año', () => {
    expect(mesDe(dia(12, 4))).toEqual({ anio: 1640, mes: 4 })
    expect(compararMeses({ anio: 1640, mes: 3 }, { anio: 1640, mes: 4 })).toBeLessThan(0)
    expect(compararMeses({ anio: 1640, mes: 4 }, { anio: 1640, mes: 4 })).toBe(0)
    expect(compararMeses({ anio: 1641, mes: 1 }, { anio: 1640, mes: 12 })).toBeGreaterThan(0)
    expect(mesSiguiente({ anio: 1640, mes: 4 })).toEqual({ anio: 1640, mes: 5 })
    expect(mesSiguiente({ anio: 1640, mes: 12 })).toEqual({ anio: 1641, mes: 1 })
    expect(mesAnterior({ anio: 1640, mes: 5 })).toEqual({ anio: 1640, mes: 4 })
    expect(mesAnterior({ anio: 1640, mes: 1 })).toEqual({ anio: 1639, mes: 12 })
  })
})

describe('estado de un local', () => {
  it('estadoDelLocalEl: cerrado antes del primer tramo; después, el del último tramo que ya empezó', () => {
    const herreria = herreriaCon([
      { desde: dia(1, 3), estado: 'abierto' },
      { desde: dia(10, 4), estado: 'cerrado' },
      { desde: dia(20, 4), estado: 'abierto' },
    ])
    expect(estadoDelLocalEl(herreria, dia(28, 2))).toBe('cerrado')
    expect(estadoDelLocalEl(herreria, dia(1, 3))).toBe('abierto')
    expect(estadoDelLocalEl(herreria, dia(9, 4))).toBe('abierto')
    expect(estadoDelLocalEl(herreria, dia(10, 4))).toBe('cerrado')
    expect(estadoDelLocalEl(herreria, dia(19, 4))).toBe('cerrado')
    expect(estadoDelLocalEl(herreria, dia(20, 4))).toBe('abierto')
  })

  it('estadoVigenteDelLocal: el del último tramo, aunque empiece mañana (D-028)', () => {
    const cerradaDesdeManana = herreriaCon([
      { desde: dia(1, 3), estado: 'abierto' },
      { desde: dia(13, 4), estado: 'cerrado' },
    ])
    expect(estadoDelLocalEl(cerradaDesdeManana, dia(12, 4))).toBe('abierto')
    expect(estadoVigenteDelLocal(cerradaDesdeManana)).toBe('cerrado')
    expect(estadoVigenteDelLocal(localDelEjemplo(LOCAL.posada))).toBe('abierto')
  })

  it('abiertoAlgunDia: un solo día abierto basta para que el mes pague (§7, «Estado»)', () => {
    const abreElUltimoDia = herreriaCon([{ desde: dia(30, 4), estado: 'abierto' }])
    expect(abiertoAlgunDia(abreElUltimoDia, { anio: 1640, mes: 4 })).toBe(true)
    const cierraElDia2 = herreriaCon([
      { desde: dia(1, 3), estado: 'abierto' },
      { desde: dia(2, 4), estado: 'cerrado' },
    ])
    expect(abiertoAlgunDia(cierraElDia2, { anio: 1640, mes: 4 })).toBe(true)
  })

  it('abiertoAlgunDia: cerrado todo el mes no paga, ni un mes anterior a su primer tramo', () => {
    const cerradaEnAbril = herreriaCon([
      { desde: dia(1, 3), estado: 'abierto' },
      { desde: dia(31, 3), estado: 'cerrado' },
      { desde: dia(1, 5), estado: 'abierto' },
    ])
    expect(abiertoAlgunDia(cerradaEnAbril, { anio: 1640, mes: 3 })).toBe(true)
    expect(abiertoAlgunDia(cerradaEnAbril, { anio: 1640, mes: 4 })).toBe(false)
    expect(abiertoAlgunDia(cerradaEnAbril, { anio: 1640, mes: 5 })).toBe(true)
    expect(abiertoAlgunDia(cerradaEnAbril, { anio: 1640, mes: 2 })).toBe(false)
  })
})

describe('producción e impuesto', () => {
  it('produccionDelMes: la anotada si la hay; si no, la habitual (§7 l.1067)', () => {
    const tienda = localDelEjemplo(LOCAL.tiendaDeTelas)
    expect(produccionDelMes(tienda, { anio: 1640, mes: 4 })).toEqual({ importe: 150000, anotada: true })
    expect(produccionDelMes(tienda, { anio: 1640, mes: 3 })).toEqual({ importe: 600000, anotada: false })
  })

  it('produccionDelMes: anotar 0 es «no produjo»: cuenta como anotada y paga el mínimo (§7 l.1067)', () => {
    const herreria: LocalComercial = {
      ...localDelEjemplo(LOCAL.herreria1),
      producciones: [{ mes: { anio: 1640, mes: 4 }, importe: { base: 0 } }],
    }
    const produccion = produccionDelMes(herreria, { anio: 1640, mes: 4 })
    expect(produccion).toEqual({ importe: 0, anotada: true })
    expect(impuestoDeLocal(produccion.importe, tipoDelEjemplo(TIPO_LOCAL.herreria))).toBe(20000)
  })

  it('impuestoDeLocal: Herrería 1 con 10 mo paga 1 mo; con 1 mo, el mínimo de 2 mp (§7 l.1069-1072)', () => {
    const herreria = tipoDelEjemplo(TIPO_LOCAL.herreria)
    expect(impuestoDeLocal(1000000, herreria)).toBe(100000)
    expect(impuestoDeLocal(100000, herreria)).toBe(20000)
  })

  it('impuestoDeLocal: la tienda de telas con 1,5 mo anotados paga el mínimo, 0,1 mo; la posada, 3,2 mo', () => {
    expect(impuestoDeLocal(150000, tipoDelEjemplo(TIPO_LOCAL.tienda))).toBe(10000)
    expect(impuestoDeLocal(4000000, tipoDelEjemplo(TIPO_LOCAL.posada))).toBe(320000)
    // 5 % de 250.010 mh = 12.500,5 mh → 12.501, con las mitades hacia arriba.
    expect(impuestoDeLocal(250010, tipoDelEjemplo(TIPO_LOCAL.tienda))).toBe(12501)
  })
})

describe('cobro', () => {
  it('diaDeCobro: el día del tipo o, si el mes no lo tiene, el último (§7 l.1065)', () => {
    const tipo: TipoLocal = { ...tipoDelEjemplo(TIPO_LOCAL.posada), diaCobro: 31 }
    expect(diaDeCobro(tipo, 1640, 4)).toEqual(dia(30, 4))
    expect(diaDeCobro(tipo, 1640, 5)).toEqual(dia(31, 5))
    expect(diaDeCobro(tipo, 1640, 2)).toEqual(dia(29, 2))
    expect(diaDeCobro(tipoDelEjemplo(TIPO_LOCAL.posada), 1640, 5)).toEqual(dia(1, 5))
  })

  it('mesesPorCobrar el 1 de mayo: [abril]; cobrado hasta febrero, [marzo, abril]; ya cobrado, [] (§7 l.1074)', () => {
    const herreria = localDelEjemplo(LOCAL.herreria1)
    expect(mesesPorCobrar(herreria, dia(1, 5))).toEqual([{ anio: 1640, mes: 4 }])
    expect(mesesPorCobrar({ ...herreria, cobradoHasta: { anio: 1640, mes: 2 } }, dia(1, 5))).toEqual([
      { anio: 1640, mes: 3 },
      { anio: 1640, mes: 4 },
    ])
    expect(mesesPorCobrar({ ...herreria, cobradoHasta: { anio: 1640, mes: 4 } }, dia(1, 5))).toEqual([])
    expect(mesesPorCobrar(herreria, dia(15, 4))).toEqual([])
  })

  it('mesesPorCobrar: el mes del alta se cobra entero y los anteriores al alta no (§9 l.1306)', () => {
    const nuevo: LocalComercial = {
      ...localDelEjemplo(LOCAL.herreria1),
      alta: dia(20, 4),
      cambiosEstado: [{ desde: dia(20, 4), estado: 'abierto' }],
      cobradoHasta: { anio: 1640, mes: 3 },
    }
    expect(mesesPorCobrar(nuevo, dia(25, 4))).toEqual([])
    expect(mesesPorCobrar(nuevo, dia(1, 5))).toEqual([{ anio: 1640, mes: 4 }])
    expect(abiertoAlgunDia(nuevo, { anio: 1640, mes: 4 })).toBe(true)
    // Aunque cobradoHasta se hubiera quedado atrás, nunca cobra meses anteriores al alta.
    expect(mesesPorCobrar({ ...nuevo, cobradoHasta: { anio: 1640, mes: 1 } }, dia(1, 5))).toEqual([
      { anio: 1640, mes: 4 },
    ])
  })
})

describe('equivalenteMensualLocales', () => {
  it('Bree: 470.000 mh (+4,7 mo) con la producción habitual, sin la anotación de abril (§7 l.1086)', () => {
    expect(equivalenteMensualLocales(documentoDeEjemplo(), DOM.bree)).toBe(470000)
  })

  it('un local cerrado cuenta 0, aunque cierre mañana; un asentamiento sin locales da 0 (§7 l.1087, D-028)', () => {
    const estado = documentoDeEjemplo()
    estado.localesComerciales = estado.localesComerciales.map((l) =>
      l.id === LOCAL.posada
        ? {
            ...l,
            cambiosEstado: [
              { desde: dia(1, 3), estado: 'abierto' as const },
              { desde: dia(13, 4), estado: 'cerrado' as const },
            ],
          }
        : l,
    )
    expect(equivalenteMensualLocales(estado, DOM.bree)).toBe(150000)
    expect(equivalenteMensualLocales(estado, DOM.archet)).toBe(0)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/locales/impuesto.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./impuesto`, que todavía no existe. La hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/locales/impuesto.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/locales/impuesto.test.ts [ src/dominio/locales/impuesto.test.ts ]
Error: Cannot find module './impuesto' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/locales/impuesto.test.ts
 ❯ src/dominio/locales/impuesto.test.ts:6:1
      4| import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
      5| import type { LocalComercial, TipoLocal } from '../modelo/asentamiento'
      6| import {
       | ^
      7|   abiertoAlgunDia,
      8|   compararMeses,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:43:40
   Duration  1.69s (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `impuesto.ts`**

Crea `src/dominio/locales/impuesto.ts` con este contenido:

```ts
import { compararFechas, diaEnMes, type Fecha } from '../calendario/fecha'
import { porcentajeDe } from '../dinero/importe'
import type { CambioEstadoLocal, LocalComercial, TipoLocal } from '../modelo/asentamiento'
import type { AnioMes, Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'

/** Abierto o cerrado. */
export type EstadoLocal = CambioEstadoLocal['estado']

/** El mes de una fecha. */
export function mesDe(f: Fecha): AnioMes {
  return { anio: f.anio, mes: f.mes }
}

/** Negativo si a es anterior a b, 0 si es el mismo mes y positivo si es posterior. */
export function compararMeses(a: AnioMes, b: AnioMes): number {
  return a.anio * 12 + a.mes - (b.anio * 12 + b.mes)
}

/** El mes siguiente; diciembre pasa a enero del año siguiente. */
export function mesSiguiente(m: AnioMes): AnioMes {
  return m.mes === 12 ? { anio: m.anio + 1, mes: 1 } : { anio: m.anio, mes: m.mes + 1 }
}

/** El mes anterior; enero pasa a diciembre del año anterior. */
export function mesAnterior(m: AnioMes): AnioMes {
  return m.mes === 1 ? { anio: m.anio - 1, mes: 12 } : { anio: m.anio, mes: m.mes - 1 }
}

/**
 * Estado de un local un día: el del último tramo con desde ≤ día; antes del primer tramo, cerrado (§7; decisión 13
 * de la fase 2). Los tramos van en orden de fecha (lo exige EsquemaLocalComercial).
 */
export function estadoDelLocalEl(local: LocalComercial, dia: Fecha): EstadoLocal {
  let estado: EstadoLocal = 'cerrado'
  for (const tramo of local.cambiosEstado) {
    if (compararFechas(tramo.desde, dia) > 0) {
      break
    }
    estado = tramo.estado
  }
  return estado
}

/** El estado que eligió el jugador por última vez: el del último tramo, aunque empiece mañana (D-028). */
export function estadoVigenteDelLocal(local: LocalComercial): EstadoLocal {
  return local.cambiosEstado[local.cambiosEstado.length - 1].estado
}

/** Si el local estuvo abierto algún día de ese mes (§7, «Estado»; §9 l.1308). */
export function abiertoAlgunDia(local: LocalComercial, mes: AnioMes): boolean {
  const primero: Fecha = { anio: mes.anio, mes: mes.mes, dia: 1 }
  const ultimo = diaEnMes(mes.anio, mes.mes, 31)
  if (estadoDelLocalEl(local, primero) === 'abierto') {
    return true
  }
  return local.cambiosEstado.some(
    (tramo) =>
      tramo.estado === 'abierto' && compararFechas(tramo.desde, primero) > 0 && compararFechas(tramo.desde, ultimo) <= 0,
  )
}

/** Producción de un mes: la anotada o, si no hay, la habitual vigente (§7 l.1067 y l.1077). */
export function produccionDelMes(local: LocalComercial, mes: AnioMes): { importe: number; anotada: boolean } {
  const anotacion = local.producciones.find((p) => compararMeses(p.mes, mes) === 0)
  return anotacion === undefined
    ? { importe: local.produccionHabitual.base, anotada: false }
    : { importe: anotacion.importe.base, anotada: true }
}

/** máx(porcentaje × producción redondeado al mh, mínimo) (§7 l.1069-1070; §9 l.1319). */
export function impuestoDeLocal(produccion: number, tipo: TipoLocal): number {
  return Math.max(porcentajeDe(produccion, tipo.pct), tipo.minimo.base)
}

/** El día de cobro de un tipo en un mes: su día o el último del mes (§7 l.1065). */
export function diaDeCobro(tipo: TipoLocal, anio: number, mes: number): Fecha {
  return diaEnMes(anio, mes, tipo.diaCobro)
}

/**
 * Los meses que cobra un local un día de cobro: de cobradoHasta + 1 al mes anterior a ese día (§7 l.1074; §9 l.1304).
 * Nunca antes del mes del alta, que se cobra entero: «los meses anteriores al alta no se cobran» (§9 l.1306).
 */
export function mesesPorCobrar(local: LocalComercial, dia: Fecha): AnioMes[] {
  const desdeCobro = mesSiguiente(local.cobradoHasta)
  const delAlta = mesDe(local.alta)
  const hasta = mesAnterior(mesDe(dia))
  const meses: AnioMes[] = []
  for (
    let mes = compararMeses(desdeCobro, delAlta) >= 0 ? desdeCobro : delAlta;
    compararMeses(mes, hasta) <= 0;
    mes = mesSiguiente(mes)
  ) {
    meses.push(mes)
  }
  return meses
}

/**
 * Σ, por local abierto (último tramo), de máx(% × habitual, mínimo); los cerrados cuentan 0 (§7 l.1086-1087):
 * Bree 470.000. Usa solo la producción habitual, nunca la anotada (§9, «Previsiones»).
 */
export function equivalenteMensualLocales(estado: EstadoPartida, dominioId: Id): number {
  const tipos = new Map(estado.tiposLocal.map((t) => [t.id, t]))
  let total = 0
  for (const local of estado.localesComerciales) {
    if (local.dominioId !== dominioId || estadoVigenteDelLocal(local) !== 'abierto') {
      continue
    }
    const tipo = tipos.get(local.tipoId)
    if (tipo !== undefined) {
      total += impuestoDeLocal(local.produccionHabitual.base, tipo)
    }
  }
  return total
}
```

Dos detalles de la implementación:
- `mesesPorCobrar` empieza en el mayor de `cobradoHasta + 1` y el mes del alta. En una partida válida no cambia nada (`coherencia.ts` exige `cobradoHasta ≥ mes del alta − 1`), pero deja escrita la regla «los meses anteriores al alta no se cobran» en el sitio donde se cobra.
- `equivalenteMensualLocales` busca los tipos en un `Map` una sola vez, y un local cuyo tipo no existiera (lo impide `referencias.ts`) cuenta 0 en vez de romper.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/locales/impuesto.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  11:43:46
   Duration  1.17s (transform 50%, import 42%, tests 6%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **633 pruebas en 51 archivos**; `npm run lint` solo escribe su cabecera y sale con código 0. La tarea 7 dejó 618 pruebas en 50 archivos, y esta trae **15 nuevas**: las 14 de `impuesto.test.ts` y **una más** en `pureza.test.ts`, que ahora recorre también `locales/impuesto.ts`.

```text
 Test Files  51 passed (51)
      Tests  633 passed (633)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/locales/impuesto.ts src/dominio/locales/impuesto.test.ts
git commit -m "feat(locales): estado, meses por cobrar, impuesto y equivalente mensual de los locales" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/locales/impuesto.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/locales/impuesto.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 0bc61ae] feat(locales): estado, meses por cobrar, impuesto y equivalente mensual de los locales
 2 files changed, 316 insertions(+)
 create mode 100644 src/dominio/locales/impuesto.test.ts
 create mode 100644 src/dominio/locales/impuesto.ts
```

**Avisos que esta tarea deja escritos:**

1. `validacion/coherencia.ts` tiene su propia `mesDe` y su `numeroDeMes`, privadas. No se sustituyen por las de aquí para no tocar la validación en esta tarea; hacen lo mismo.
2. `produccionDelMes` devuelve la producción habitual **vigente** (la de hoy), también para meses pasados: es lo que dice §7 l.1077 («la habitual, el porcentaje y el mínimo son los vigentes el día del cobro»).
3. El cobro de la tarea 16 usa `estadoDelLocalEl` y `abiertoAlgunDia` (los tramos por día); el balance de la tarea 9 y la fila de A3 usan `estadoVigenteDelLocal` (el último tramo, D-028). No se deben mezclar.

---

### Tarea 9 · Balance mensual y resultado fiscal

La segunda parte del entregable de la fase (hoja de ruta l.67): el **balance mensual** de un asentamiento, que pintan Inicio y A1, y el **resultado fiscal**, que pinta A3. Es una función pura, `balanceMensual(estado, dominioId)`, que devuelve las cinco cifras en mh; quien las enseña usa `formatearOroProrrateado` (1 decimal, fase 1).

- **Entran**: los impuestos y rentas de ingreso del asentamiento (A3), prorrateados a 30 días, más el equivalente mensual de sus locales con la producción habitual (tarea 8).
- **Salen**: salarios (A5), soldadas (A6) y tributos (A3), prorrateados.
- **Tributos**: solo los tributos, para la cabecera «−25 mo al mes» de A3 y el resultado fiscal.
- **Balance** = entran − salen, y **resultado fiscal** = entran − tributos, restando los totales ya redondeados, como hace §7 («4.395.714 − 5.542.857 = −1.147.143»).

El redondeo es la clave (técnica 2 de la fase 3): cada total se suma **exacto**, como fracción, y se redondea una sola vez al mh con `sumarAlMes` (tarea 4). Si se prorrateara fila a fila con `alMes`, las tres unidades de la guarnición de Bree darían 385.714 + 428.571 + 428.571 = 1.242.856 en vez de 1.242.857, y el balance saldría −1.147.142, que no es la cifra de la especificación. Las columnas «Al mes» de A5 y A6 siguen con `alMes` por fila: esta función no las cambia.

El balance es estructural: no mira los eventos, ni los gastos o ingresos recurrentes del personaje que usan la caja del asentamiento (D-027), y no cambia con un avance (el 12 y el 19 de abril da lo mismo). El impuesto por habitante se prorratea con los habitantes de la fecha actual (tarea 7), y los locales cuentan según su último tramo de estado (D-028, tarea 8).

Depende de la tarea 4 (`sumarAlMes` y `PartidaMensual` en `dinero/prorrateo.ts`), de la tarea 7 (`habitantesDe`) y de la tarea 8 (`equivalenteMensualLocales`).

**Reglas de la especificación que implementa:**

- **Balance mensual (§7 l.1057).** «**Balance mensual** de un asentamiento = ingresos recurrentes (también los impuestos de locales, con la producción habitual) − gastos recurrentes (salarios, soldadas, tributos), prorrateados a 30 días con la tabla de la sección 3 y con 1 decimal. No incluye comercio ni movimientos manuales. Bree: entran 44 · salen 55,4 → −11,5 mo (…; en mh, 4.395.714 − 5.542.857 = −1.147.143, es decir −11,47143 mo).»
- **Resultado fiscal y cabeceras de A3 (§7 l.1060-1062).** «Cabecera del panel Ingresos: «+44 mo al mes» (39,2571 + 4,7 = 43,9571). Cabecera del panel Tributos: «−25 mo al mes». Nota debajo: «Resultado fiscal: +19 mo al mes (ingresos menos tributos, sin salarios ni guarnición).» (43,9571 − 25 = 18,9571).»
- **Prorrateo (§3 l.126-140).** La tabla de factores (cada día ×30, semanal ×30/7, cada dos semanas ×30/14, mensual ×1, trimestral ×1/3…; «Una sola vez» no cuenta) y «Los importes por habitante se prorratean con los habitantes actuales».
- **Locales (§7 l.1086-1087).** «Equivalente mensual y balance: usan solo la producción habitual. … Los cerrados cuentan 0.»
- **Qué no cuenta (D-027).** «El balance mensual y el resultado fiscal no tienen en cuenta los eventos, ni los gastos o ingresos recurrentes del personaje que usan la caja del asentamiento.»
- **Un local que se cierra hoy (D-028).** «cuenta así en el balance desde ya, aunque el cambio valga desde mañana para el cobro».

Las cifras de Bree con el ejemplo, en mh:

| | Cuenta | Al mes |
|---|---|---|
| Impuesto por hogar | 1.000 × 1.240 habitantes, mensual | 1.240.000 |
| Aranceles del mercado | 300.000, semanal: × 30/7 | 1.285.714,29 |
| Alquiler del molino | 500.000, mensual | 500.000 |
| Peaje del camino | 30.000, cada día: × 30 | 900.000 |
| Locales | 100.000 + 320.000 + 30.000 + 20.000 | 470.000 |
| **Entran** | redondeado una vez | **4.395.714** («+44 mo») |
| Salarios | 420.000 (14 trabajadores), semanal: × 30/7 | 1.800.000 |
| Soldadas | 580.000 (11 soldados), cada dos semanas: × 30/14 | 1.242.857,14 |
| Diezmo a Fornost | 2.500.000, mensual | 2.500.000 |
| **Salen** | redondeado una vez | **5.542.857** («55,4 mo») |
| **Balance** | 4.395.714 − 5.542.857 | **−1.147.143** («−11,5 mo») |
| **Resultado fiscal** | 4.395.714 − 2.500.000 | **1.895.714** («+19 mo») |

Archet: rentas 2.580.000 trimestrales (860.000 al mes), tributo 6.000.000 trimestral (2.000.000) y 4 albañiles a 80.000 al mes (320.000): entran 860.000, salen 2.320.000, balance −1.460.000 («−14,6 mo») y resultado fiscal −1.140.000.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/dinero/balance.ts`
- Prueba: `src/dominio/dinero/balance.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Todas las pruebas usan la partida de ejemplo con sus filas de verdad (no los totales tecleados de la prueba de la fase 1 en `prorrateo.test.ts`). Qué comprueba cada una:
- Bree da las cinco cifras de la tabla, y sus textos son «−11,5 mo», «+44 mo», «55,4 mo», «−25 mo» y «+19 mo».
- El contraejemplo del redondeo: fila a fila, las soldadas darían 1.242.856; la función da salen = 1.800.000 + 1.242.857 + 2.500.000.
- Archet da −1.460.000, «−14,6 mo».
- Con la feria activa (el 16 de abril) y un evento de +100 % en todos los costes de Bree sale lo mismo, y el 19 de abril también.
- Un gasto de J5 que se paga desde la caja de Bree no cuenta.
- El impuesto por hogar usa los habitantes de la fecha actual: un cambio de +100 habitantes el 20 de abril no cuenta el 12 y suma 1 mo el 20.
- Si la posada se cierra desde mañana, deja de contar ya: entran y el balance bajan 320.000.

Crea `src/dominio/dinero/balance.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { CATEGORIA } from '../catalogo/inicial'
import { DOM, LOCAL } from '../ejemplo/ids'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { EstadoPartida } from '../modelo/documento'
import { balanceMensual } from './balance'
import { formatearOroProrrateado } from './formato'
import { EQUIVALENCIAS_POR_DEFECTO } from './monedas'
import { alMes } from './prorrateo'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** El balance de Bree del ejemplo el 12 de abril (§7 l.1057-1062; A1 y A3). */
const BREE = {
  entran: 4395714,
  salen: 5542857,
  tributos: 2500000,
  balance: -1147143,
  resultadoFiscal: 1895714,
}

/** El ejemplo con otra fecha actual; el balance solo la usa para contar los habitantes. */
function ejemploEl(dia: number, mes: number): EstadoPartida {
  const estado = documentoDeEjemplo()
  estado.partida = { ...estado.partida, fechaActual: { anio: 1640, mes, dia } }
  return estado
}

describe('balanceMensual', () => {
  it('Bree: entran 4.395.714, salen 5.542.857 y tributos 2.500.000; balance −1.147.143 y resultado +1.895.714', () => {
    expect(balanceMensual(documentoDeEjemplo(), DOM.bree)).toEqual(BREE)
  })

  it('los textos de A1 y A3: «−11,5 mo», «+44 mo», «55,4 mo», «−25 mo» y «+19 mo» (§7 l.1057-1062)', () => {
    const bree = balanceMensual(documentoDeEjemplo(), DOM.bree)
    expect(formatearOroProrrateado(bree.balance, EQ, { signo: true })).toBe('−11,5 mo')
    expect(formatearOroProrrateado(bree.entran, EQ, { signo: true })).toBe('+44 mo')
    expect(formatearOroProrrateado(bree.salen, EQ)).toBe('55,4 mo')
    expect(formatearOroProrrateado(-bree.tributos, EQ, { signo: true })).toBe('−25 mo')
    expect(formatearOroProrrateado(bree.resultadoFiscal, EQ, { signo: true })).toBe('+19 mo')
  })

  it('suma exacta y un solo redondeo: fila a fila con alMes, las soldadas darían 1.242.856 (técnica 2)', () => {
    const estado = documentoDeEjemplo()
    const soldadasFilaAFila = estado.unidadesGuarnicion.reduce(
      (total, u) => total + alMes(u.numero * u.soldada.base, u.recurrencia),
      0,
    )
    expect(soldadasFilaAFila).toBe(1242856)
    // Salarios 1.800.000 + soldadas 1.242.857,14… + diezmo 2.500.000, redondeado una sola vez.
    expect(balanceMensual(estado, DOM.bree).salen).toBe(1800000 + 1242857 + 2500000)
  })

  it('Archet: entran 860.000, salen 2.320.000 y balance −1.460.000, «−14,6 mo»', () => {
    const archet = balanceMensual(documentoDeEjemplo(), DOM.archet)
    expect(archet).toEqual({
      entran: 860000,
      salen: 2320000,
      tributos: 2000000,
      balance: -1460000,
      resultadoFiscal: -1140000,
    })
    expect(formatearOroProrrateado(archet.balance, EQ, { signo: true })).toBe('−14,6 mo')
  })

  it('no mira los eventos: con la feria activa (16 de abril) y un +100 % en los costes, igual; y el 19 también (D-027)', () => {
    const conFeria = ejemploEl(16, 4)
    conFeria.eventos = [
      ...conFeria.eventos,
      {
        id: 'ev.subida',
        dominioId: DOM.bree,
        nombre: 'Subida de jornales',
        inicio: { anio: 1640, mes: 4, dia: 13 },
        duracionDias: 30,
        efectos: [{ ambito: 'costes', objetivo: { tipo: 'todos' }, pct: 100 }],
      },
    ]
    expect(balanceMensual(conFeria, DOM.bree)).toEqual(BREE)
    expect(balanceMensual(ejemploEl(19, 4), DOM.bree)).toEqual(BREE)
  })

  it('un gasto o un ingreso de J5 que usa la caja de Bree no cuenta (D-027)', () => {
    const estado = documentoDeEjemplo()
    estado.recurrentes = [
      ...estado.recurrentes,
      {
        id: 'rec.donativo',
        dominioId: DOM.tharan,
        tipo: 'gasto',
        concepto: 'Donativo al templo',
        importe: { base: 1000000 },
        categoriaId: CATEGORIA.otros,
        cuentaId: DOM.bree,
        recurrencia: { tipo: 'mensual', diaMes: 1 },
        activo: true,
      },
    ]
    expect(balanceMensual(estado, DOM.bree)).toEqual(BREE)
  })

  it('el impuesto por habitante usa los habitantes de la fecha actual, no los de un cambio futuro (§3)', () => {
    const estado = documentoDeEjemplo()
    estado.poblaciones = estado.poblaciones.map((p) =>
      p.dominioId === DOM.bree
        ? {
            ...p,
            cambios: [
              ...p.cambios,
              { id: 'camb.bree.feria', fecha: { anio: 1640, mes: 4, dia: 20 }, delta: 100, motivo: 'Se quedan feriantes' },
            ],
          }
        : p,
    )
    expect(balanceMensual(estado, DOM.bree).entran).toBe(4395714)
    estado.partida = { ...estado.partida, fechaActual: { anio: 1640, mes: 4, dia: 20 } }
    // 100 habitantes más × 0,01 mo al mes = +1 mo.
    expect(balanceMensual(estado, DOM.bree).entran).toBe(4495714)
  })

  it('un local que cierras hoy deja de contar ya, aunque el cierre valga desde mañana (D-028)', () => {
    const estado = documentoDeEjemplo()
    estado.localesComerciales = estado.localesComerciales.map((l) =>
      l.id === LOCAL.posada
        ? {
            ...l,
            cambiosEstado: [...l.cambiosEstado, { desde: { anio: 1640, mes: 4, dia: 13 }, estado: 'cerrado' as const }],
          }
        : l,
    )
    const bree = balanceMensual(estado, DOM.bree)
    expect(bree.entran).toBe(4395714 - 320000)
    expect(bree.balance).toBe(-1147143 - 320000)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/dinero/balance.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./balance`, que todavía no existe. La hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/dinero/balance.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/dinero/balance.test.ts [ src/dominio/dinero/balance.test.ts ]
Error: Cannot find module './balance' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/dinero/balance.test.ts
 ❯ src/dominio/dinero/balance.test.ts:6:1
      4| import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
      5| import type { EstadoPartida } from '../modelo/documento'
      6| import { balanceMensual } from './balance'
       | ^
      7| import { formatearOroProrrateado } from './formato'
      8| import { EQUIVALENCIAS_POR_DEFECTO } from './monedas'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:44:23
   Duration  1.06s (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `balance.ts`**

Crea `src/dominio/dinero/balance.ts` con este contenido:

```ts
import { equivalenteMensualLocales } from '../locales/impuesto'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { habitantesDe } from '../poblacion/habitantes'
import { sumarAlMes, type PartidaMensual } from './prorrateo'

/** Las cifras al mes de un asentamiento, en mh (§7 l.1057-1062). */
export interface BalanceMensual {
  /** Impuestos y rentas de ingreso + locales con la habitual; Bree 4.395.714 («+44 mo»). */
  entran: number
  /** Salarios + soldadas + tributos; Bree 5.542.857 («55,4 mo»). */
  salen: number
  /** Solo los tributos; Bree 2.500.000 («−25 mo al mes», A3). */
  tributos: number
  /** entran − salen; Bree −1.147.143 («−11,5 mo»). */
  balance: number
  /** entran − tributos; Bree 1.895.714 («+19 mo»). */
  resultadoFiscal: number
}

/**
 * Balance y resultado fiscal con los habitantes de la fecha actual, sin eventos ni recurrentes del personaje
 * (§7 l.1057-1062; D-027; técnica 2). Cada total (entran, salen y tributos) es una suma exacta de fracciones con
 * un solo redondeo al mh; balance y resultado se restan con esos totales ya redondeados, como hace §7 l.1057.
 * Los locales entran con su equivalente mensual: la producción habitual y el estado del último tramo (D-028).
 */
export function balanceMensual(estado: EstadoPartida, dominioId: Id): BalanceMensual {
  const habitantes = habitantesDe(estado, dominioId, estado.partida.fechaActual)
  const ingresos: PartidaMensual[] = []
  const tributos: PartidaMensual[] = []
  for (const regla of estado.impuestosRentas) {
    if (regla.dominioId !== dominioId) {
      continue
    }
    const base = regla.base === 'porHabitante' ? regla.importe.base * habitantes : regla.importe.base
    const partida: PartidaMensual = { base, recurrencia: regla.recurrencia }
    if (regla.sentido === 'ingreso') {
      ingresos.push(partida)
    } else {
      tributos.push(partida)
    }
  }
  const pagos: PartidaMensual[] = [
    ...estado.trabajadores
      .filter((t) => t.dominioId === dominioId)
      .map((t) => ({ base: t.numero * t.salario.base, recurrencia: t.recurrencia })),
    ...estado.unidadesGuarnicion
      .filter((u) => u.dominioId === dominioId)
      .map((u) => ({ base: u.numero * u.soldada.base, recurrencia: u.recurrencia })),
    ...tributos,
  ]
  const entran = sumarAlMes(ingresos) + equivalenteMensualLocales(estado, dominioId)
  const salen = sumarAlMes(pagos)
  const deTributos = sumarAlMes(tributos)
  return {
    entran,
    salen,
    tributos: deTributos,
    balance: entran - salen,
    resultadoFiscal: entran - deTributos,
  }
}
```

`dinero/balance.ts` importa de `locales/impuesto.ts` y de `poblacion/habitantes.ts`, y ninguno de los dos importa nada de `balance.ts`, así que no hay ciclos.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/dinero/balance.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  11:44:27
   Duration  820ms (transform 54%, import 41%, tests 3%, worker 2%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **642 pruebas en 52 archivos**; `npm run lint` solo escribe su cabecera y sale con código 0. La tarea 8 dejó 633 pruebas en 51 archivos, y esta trae **9 nuevas**: las 8 de `balance.test.ts` y **una más** en `pureza.test.ts`, que ahora recorre también `dinero/balance.ts`.

```text
 Test Files  52 passed (52)
      Tests  642 passed (642)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/dinero/balance.ts src/dominio/dinero/balance.test.ts
git commit -m "feat(dinero): balance mensual y resultado fiscal de un asentamiento" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/dinero/balance.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/dinero/balance.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 d86a8b8] feat(dinero): balance mensual y resultado fiscal de un asentamiento
 2 files changed, 197 insertions(+)
 create mode 100644 src/dominio/dinero/balance.test.ts
 create mode 100644 src/dominio/dinero/balance.ts
```

**Avisos que esta tarea deja escritos:**

1. `balance` y `resultadoFiscal` se restan con los totales **ya redondeados**, no con las fracciones exactas: así «entran 44 · salen 55,4 → −11,5» cuadra siempre en pantalla. En el ejemplo las dos formas dan lo mismo.
2. La cabecera «−25 mo al mes» de A3 es `−tributos` (el signo lo pone quien la pinta); la de Ingresos, «+44 mo al mes», es `entran`.
3. Un tributo por habitante también se prorratea con los habitantes de hoy. El ejemplo no tiene ninguno.
4. La prueba del entregable (tarea 28) vuelve a comprobar el balance de Bree con la partida de ejemplo el 12 y el 19 de abril.

---

### Tarea 10 · Tipos, ids y ayudantes del motor

Esta tarea abre `src/dominio/motor/`, la carpeta del motor de avance de días (§9). No escribe ningún paso del motor todavía: deja las tres piezas que todas las tareas siguientes (11 a 29) van a importar.

- **`motor/tipos.ts`**: los tipos compartidos que no tienen dueño natural en ningún paso concreto. `NuevoId` es la forma del generador de ids que el motor recibe inyectado —`nuevoId` de `src/datos/ids.ts` en la app (que envuelve `crypto.randomUUID()`, prohibido en `src/dominio`) e `idsEnSerie` en las pruebas y en las previsiones—, y `OpcionesSimulacion` es justo lo que `simular` necesita además del estado: el `avanceId` que llevarán los registros nuevos, el generador de ids y el catálogo en copia. `QuePago` y `Suceso` son los tipos que consumirán los avisos (tarea 20) y los hechos (tarea 19); se escriben ya porque `Suceso['tipo'] === 'pago'` es el mismo suceso que registra un impago (tarea 13) y que después lee `avisoPagoNoCubierto` (tarea 11). `ResultadoSimulacion` es la forma final de `simular` (tarea 21).
- **`motor/ids.ts`**: `idsEnSerie`, un generador de ids en serie y puro (nada de `crypto`), para que las pruebas del motor —y las previsiones de «Pago no cubierto» de la tarea 20, que simulan hacia delante sin guardar nada— tengan ids deterministas y distintos de los que usa el estado de partida.
- **`motor/pruebas/constructores.ts`**: tres ayudantes de prueba, puros. `estadoMinimo` monta un `EstadoPartida` válido con Tharan y la bolsa a 0, con las 34 claves que exige `EsquemaEstadoPartida` (tarea 5) rellenas con listas vacías; sin él, cada prueba de las tareas 11 a 27 tendría que escribir esas 34 claves a mano. `conAsentamiento` añade un asentamiento con lo que la validación exige de todos (§6.1 y `validacion/coherencia.ts`, tarea 6): su caja, su fila de población, su fila de víveres en el almacén y su mercado local. `congelar` congela a fondo (`Object.freeze` recursivo) para que las pruebas del motor puedan pasar una entrada y comprobar después que el motor no la tocó (T29, tarea 13 en adelante): escribir sobre un valor congelado lanza `TypeError` en vez de fallar en silencio.

Esta carpeta vive dentro de `src/dominio` como el resto del modelo y las reglas: no toca Dexie, React ni ninguna API del navegador, así que `pureza.test.ts` (tarea 1) la recorre igual que a cualquier otro módulo del dominio, incluidos `motor/tipos.ts` (solo tipos, sin código en tiempo de ejecución) y `motor/pruebas/constructores.ts` (un ayudante de prueba, no un archivo `*.test.ts`).

Depende de la tarea 5: `estadoMinimo` usa `estadoDe` en espíritu —construye el estado ya en la forma de las 34 claves, sin `avances`— y `VERSION_FORMATO` de `modelo/partida.ts`; `conAsentamiento` usa `RECURSO.viveres` de `catalogo/inicial.ts` (fase 1) para la fila de víveres.

**Reglas de la especificación que implementa:**

- **`simular` es una función pura (§9 l.1271).** «Es una función pura: `simular(estado, días) → { estadoNuevo, cambios[], avisos[] }`.» `NuevoId` y `OpcionesSimulacion` son la forma en la que la pureza se sostiene: en vez de que el motor llame a `crypto.randomUUID()` (prohibido por `pureza.test.ts` l.25 en `src/dominio`), recibe un generador ya elegido por quien lo llama, y las pruebas —y las previsiones de la tarea 20— le pasan `idsEnSerie` en vez del de verdad.
- **Reutilizar la persona con el mismo nombre (§9 l.1295).** «Se reutiliza la persona con el mismo nombre normalizado. Si hay que crearla, P4 avisa «Se añadirá «Trabajadores de Bree» a Personas y entidades» y se crea al confirmar, porque `simular()` no guarda nada.» De ahí `personasNuevas` en `ResultadoSimulacion`: lo que P4 tiene que anunciar, sin haberlo guardado todavía.
- **Deuda de impago por origen (§9 l.1291-1296).** El `origen: OrigenImpago` de `Suceso` («salarios y soldadas: `{ tipo, id: dominioId }`; tributo, recurrente y programado: su id») es la clave con la que la tarea 13 encuentra «la deuda de impago abierta de ese origen» de la que habla la l.1296.

**Archivos:**
- Crear: `src/dominio/motor/tipos.ts`, `src/dominio/motor/ids.ts`, `src/dominio/motor/pruebas/constructores.ts`
- Prueba: `src/dominio/motor/ids.test.ts`, `src/dominio/motor/pruebas/constructores.test.ts`

- [ ] **Paso 1: Escribir las dos pruebas que fallan**

Las carpetas `src/dominio/motor/` y `src/dominio/motor/pruebas/` son nuevas. `ids.test.ts` comprueba que `idsEnSerie` da ids en orden y válidos para `EsquemaId`, y que dos series no comparten contador. `constructores.test.ts` comprueba que `estadoMinimo` es una partida válida de punta a punta (`EsquemaEstadoPartida` y `validarCopia`), que `conAsentamiento` añade las cuatro cosas que promete sin tocar la entrada, y que `congelar` lanza al escribir en cualquier nivel.

Crea `src/dominio/motor/ids.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { EsquemaId } from '../modelo/comunes'
import { idsEnSerie } from './ids'

describe('idsEnSerie', () => {
  it('da «sim.1», «sim.2», «sim.3»… en orden (T1)', () => {
    const nuevoId = idsEnSerie('sim')
    expect([nuevoId(), nuevoId(), nuevoId()]).toEqual(['sim.1', 'sim.2', 'sim.3'])
  })

  it('cada serie lleva su propio contador y sus ids valen para EsquemaId', () => {
    const sim = idsEnSerie('sim')
    const prev = idsEnSerie('prev')
    const ids = [sim(), sim(), prev(), sim(), prev()]
    expect(ids).toEqual(['sim.1', 'sim.2', 'prev.1', 'sim.3', 'prev.2'])
    for (const id of ids) {
      expect(EsquemaId.safeParse(id).success).toBe(true)
    }
  })
})
```

Crea `src/dominio/motor/pruebas/constructores.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { RECURSO } from '../../catalogo/inicial'
import { saldosPorDominio } from '../../dinero/saldo'
import { catalogosDeEjemplo } from '../../ejemplo/sombraDelEste'
import { EsquemaEstadoPartida } from '../../modelo/documento'
import { validarCopia } from '../../validacion/coherencia'
import { conAsentamiento, congelar, estadoMinimo } from './constructores'

describe('estadoMinimo', () => {
  it('es una partida válida: pasa EsquemaEstadoPartida y validarCopia, con la fecha que se le pida', () => {
    const estado = estadoMinimo()
    expect(EsquemaEstadoPartida.safeParse(estado).success).toBe(true)
    expect(validarCopia({ ...estado, avances: [] }, catalogosDeEjemplo())).toEqual([])
    expect(estado.partida.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 12 })
    expect(estado.partida.fechaInicial).toEqual(estado.partida.fechaActual)
    expect(estado.dominios).toEqual([{ id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' }])
    expect(saldosPorDominio(estado)).toEqual({ 'dom.tharan': 0 })

    const alFinal = estadoMinimo({ anio: 9999, mes: 12, dia: 30 })
    expect(alFinal.partida.fechaActual).toEqual({ anio: 9999, mes: 12, dia: 30 })
    expect(alFinal.partida.fechaInicial).toEqual({ anio: 9999, mes: 12, dia: 30 })
    expect(validarCopia({ ...alFinal, avances: [] }, catalogosDeEjemplo())).toEqual([])
  })
})

describe('conAsentamiento', () => {
  it('añade el asentamiento con su caja, su población, sus víveres y su mercado local, sin tocar la entrada', () => {
    const inicial = congelar(estadoMinimo())
    const estado = conAsentamiento(inicial, { id: 'dom.bree', nombre: 'Bree', caja: 300000, habitantes: 1240 })
    expect(estado.dominios.map((d) => d.id)).toEqual(['dom.tharan', 'dom.bree'])
    expect(saldosPorDominio(estado)).toEqual({ 'dom.tharan': 0, 'dom.bree': 300000 })
    expect(estado.poblaciones).toEqual([{ dominioId: 'dom.bree', habitantesIniciales: 1240, cambios: [], consumos: [] }])
    expect(estado.existencias).toEqual([{ dominioId: 'dom.bree', recursoId: RECURSO.viveres, cantidad: 0 }])
    expect(estado.mercados).toEqual([{ id: 'mercado.dom.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }])
    expect(validarCopia({ ...estado, avances: [] }, catalogosDeEjemplo())).toEqual([])
    expect(inicial.dominios).toHaveLength(1)

    const conDos = conAsentamiento(estado, { id: 'dom.archet', nombre: 'Archet', caja: 0 })
    expect(conDos.poblaciones[1].habitantesIniciales).toBe(0)
    expect(validarCopia({ ...conDos, avances: [] }, catalogosDeEjemplo())).toEqual([])
  })
})

describe('congelar', () => {
  it('congela a fondo: cualquier escritura lanza y devuelve el mismo objeto', () => {
    const estado = estadoMinimo()
    const congelado = congelar(estado)
    expect(congelado).toBe(estado)
    expect(() => {
      congelado.partida.fechaActual.dia = 13
    }).toThrow(TypeError)
    expect(() => {
      congelado.movimientos.push(congelado.movimientos[0])
    }).toThrow(TypeError)
    expect(() => {
      congelado.cajas[0].saldoInicial.base = 1
    }).toThrow(TypeError)
    expect(congelar(7)).toBe(7)
  })
})
```

- [ ] **Paso 2: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/motor/ids.test.ts src/dominio/motor/pruebas/constructores.test.ts
```

Fallo esperado: ninguno de los tres módulos existe todavía. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/ids.test.ts (0 test)
 ❯ src/dominio/motor/pruebas/constructores.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/ids.test.ts [ src/dominio/motor/ids.test.ts ]
Error: Cannot find module './ids' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/ids.test.ts
 ❯ src/dominio/motor/ids.test.ts:3:1
      1| import { describe, expect, it } from 'vitest'
      2| import { EsquemaId } from '../modelo/comunes'
      3| import { idsEnSerie } from './ids'
       | ^
      4|
      5| describe('idsEnSerie', () => {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  src/dominio/motor/pruebas/constructores.test.ts [ src/dominio/motor/pruebas/constructores.test.ts ]
Error: Cannot find module './constructores' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/pruebas/constructores.test.ts
 ❯ src/dominio/motor/pruebas/constructores.test.ts:7:1
      5| import { EsquemaEstadoPartida } from '../../modelo/documento'
      6| import { validarCopia } from '../../validacion/coherencia'
      7| import { conAsentamiento, congelar, estadoMinimo } from './constructor…
       | ^
      8|
      9| describe('estadoMinimo', () => {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  2 failed (2)
      Tests  no tests
   Start at  11:48:20
   Duration  842ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `motor/tipos.ts`**

Crea `src/dominio/motor/tipos.ts` con este contenido:

```ts
import type { Fecha } from '../calendario/fecha'
import type { AvisoAvance, CambioAvance } from '../modelo/avance'
import type { CatalogosEnCopia, PersonaEntidad } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { OrigenImpago } from '../modelo/deudas'
import type { EstadoPartida } from '../modelo/documento'

/** Generador de ids nuevos: nuevoId de src/datos/ids.ts en la app; idsEnSerie en pruebas y previsiones (T1). */
export type NuevoId = () => Id

/** Lo que simular necesita además del estado (T1). */
export interface OpcionesSimulacion {
  avanceId: Id
  nuevoId: NuevoId
  catalogo: CatalogosEnCopia
}

/** Qué pago nombra un aviso «Pago no cubierto» (D-025). */
export type QuePago =
  | { clase: 'tributo' }
  | { clase: 'salarios' }
  | { clase: 'soldadas' }
  | { clase: 'concepto'; concepto: string }

/** Lo que pasó durante un recorrido y alimenta los hechos y los avisos (§9). */
export type Suceso =
  | {
      tipo: 'pago'
      /** Salarios y soldadas: { tipo, id: dominioId }; tributo, recurrente y programado: su id. */
      origen: OrigenImpago
      /** La caja que paga. */
      dominioId: Id
      fecha: Fecha
      /** Lo que tocaba pagar ese día, con eventos; mayor que 0. */
      debido: number
      pagado: number
      que: QuePago
      /** Regla «Cada día»: no da hecho (T18). */
      diario: boolean
    }
  | { tipo: 'cobroLocales'; dominioId: Id; fecha: Fecha }
  | { tipo: 'vueltaCaravana'; dominioId: Id; fecha: Fecha; mercadoId: Id }

/** Un aviso en memoria, con la fecha que sirve para ordenarlo; se guarda sin ella (T11). */
export interface AvisoConFecha extends AvisoAvance {
  fecha: Fecha
}

/** Lo que devuelve simular: lo que pide §9 l.1271 y lo que necesitan P4 y aplicarAvance. */
export interface ResultadoSimulacion {
  avanceId: Id
  /** La fechaActual de partida: Avance.desde. */
  desde: Fecha
  /** El último día simulado: Avance.hasta y la fechaActual nueva. */
  hasta: Fecha
  estadoNuevo: EstadoPartida
  cambios: CambioAvance[]
  /** Ya ordenados, sin fecha. */
  avisos: AvisoAvance[]
  /** P4: «Se añadirá «Trabajadores de Bree» a Personas y entidades» (§9 l.1295). */
  personasNuevas: PersonaEntidad[]
}
```

Este módulo no tiene prueba propia: solo declara tipos, `pureza.test.ts` lo recorre igual y `npx tsc -b` es quien comprueba que compila. `AvisoConFecha` y `Suceso` no los usa ningún módulo hasta las tareas 18 a 20; se escriben ya porque el contrato entero del motor se apoya en ellos y así ninguna tarea posterior tiene que volver a tocar `tipos.ts`.

- [ ] **Paso 4: Implementar `motor/ids.ts`**

Crea `src/dominio/motor/ids.ts` con este contenido:

```ts
import type { NuevoId } from './tipos'

/** Ids en serie, válidos para EsquemaId: idsEnSerie('sim') da «sim.1», «sim.2»… (T1). */
export function idsEnSerie(prefijo: string): NuevoId {
  let ultimo = 0
  return () => {
    ultimo += 1
    return `${prefijo}.${ultimo}`
  }
}
```

`EsquemaId` (tarea 2, fase 2) admite letras, cifras, punto, guion y guion bajo: `sim.1` cumple sin más comprobación.

- [ ] **Paso 5: Implementar `motor/pruebas/constructores.ts`**

Crea `src/dominio/motor/pruebas/constructores.ts` con este contenido:

```ts
import type { Fecha } from '../../calendario/fecha'
import { RECURSO } from '../../catalogo/inicial'
import { EQUIVALENCIAS_POR_DEFECTO } from '../../dinero/monedas'
import type { Id } from '../../modelo/comunes'
import type { EstadoPartida } from '../../modelo/documento'
import { VERSION_FORMATO } from '../../modelo/partida'

/** El 12 de abril de 1640 T.E., la fecha actual del ejemplo: la de partida de las pruebas del motor. */
const FECHA_DE_PRUEBA: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** Una partida mínima y válida: Tharan con la bolsa a 0, sin nada más; fechaInicial = fechaActual. */
export function estadoMinimo(fechaActual: Fecha = FECHA_DE_PRUEBA): EstadoPartida {
  return {
    partida: {
      id: 'p.prueba',
      nombre: 'Partida de prueba',
      edad: 'tercera',
      equivalencias: { ...EQUIVALENCIAS_POR_DEFECTO },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { ...fechaActual },
      fechaActual: { ...fechaActual },
      creada: '2026-09-18T08:00:00.000Z',
      actualizada: '2026-09-18T08:00:00.000Z',
      versionFormato: VERSION_FORMATO,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [{ id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' }],
    cajas: [{ dominioId: 'dom.tharan', saldoInicial: { base: 0 } }],
    movimientos: [],
    transferencias: [],
    deudas: [],
    recurrentes: [],
    objetos: [],
    ventas: [],
    inversiones: [],
    hechizos: [],
    intentos: [],
    pergaminos: [],
    poblaciones: [],
    existencias: [],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
  }
}

/**
 * Añade un asentamiento con su caja (saldo inicial en mh, 0 o más) y su población, y lo que la validación exige de
 * cada asentamiento: la fila de víveres del almacén y el mercado local con su nombre. El alta es la fecha inicial.
 */
export function conAsentamiento(
  estado: EstadoPartida,
  datos: { id: Id; nombre: string; caja: number; habitantes?: number },
): EstadoPartida {
  return {
    ...estado,
    dominios: [
      ...estado.dominios,
      { id: datos.id, tipo: 'asentamiento', nombre: datos.nombre, categoria: 'aldea', alta: { ...estado.partida.fechaInicial } },
    ],
    cajas: [...estado.cajas, { dominioId: datos.id, saldoInicial: { base: datos.caja } }],
    poblaciones: [
      ...estado.poblaciones,
      { dominioId: datos.id, habitantesIniciales: datos.habitantes ?? 0, cambios: [], consumos: [] },
    ],
    existencias: [...estado.existencias, { dominioId: datos.id, recursoId: RECURSO.viveres, cantidad: 0 }],
    mercados: [...estado.mercados, { id: `mercado.${datos.id}`, nombre: datos.nombre, localDe: datos.id, precios: [] }],
  }
}

/** Congela a fondo un valor: cualquier escritura lanza (las pruebas del motor congelan la entrada). */
export function congelar<T>(valor: T): T {
  if (typeof valor !== 'object' || valor === null || Object.isFrozen(valor)) {
    return valor
  }
  Object.freeze(valor)
  for (const hijo of Object.values(valor)) {
    congelar(hijo)
  }
  return valor
}
```

Por qué está escrito así:

1. `estadoMinimo` fija las 34 claves de `EsquemaEstadoPartida` con listas vacías: si la tarea 5 añadiera una clave nueva al modelo, `npx tsc -b` rompería aquí antes que en ninguna prueba del motor, porque el objeto literal deja de cumplir el tipo `EstadoPartida`.
2. `categoria: 'aldea'` en `conAsentamiento` es fija a propósito: ninguna prueba de las tareas 11 a 27 necesita distinguir aldea de pueblo o ciudad, y quien sí lo necesite puede construir el dominio a mano.
3. `congelar` recorre `Object.values` sin mirar si es un array: en JavaScript un array es un objeto y `Object.values` de un array da sus elementos, así que `congelar(estado)` también congela cada fila de `estado.movimientos`, `estado.cajas`, etc.
4. `congelar` no vuelve a congelar lo que ya está congelado (`Object.isFrozen`): así una prueba puede llamar a `congelar(conAsentamiento(congelar(estadoMinimo()), …))` sin que el segundo `congelar` falle al recorrer un hijo ya congelado por el primero.

- [ ] **Paso 6: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/motor/ids.test.ts src/dominio/motor/pruebas/constructores.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  2 passed (2)
      Tests  5 passed (5)
   Start at  11:48:24
   Duration  961ms (transform 51%, import 45%, tests 3%, worker 1%)
```

- [ ] **Paso 7: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0; `npm test` termina con **650 pruebas en 54 archivos**. La tarea 9 dejó 642 pruebas en 52 archivos, y esta trae **8 nuevas**: las 2 de `ids.test.ts`, las 3 de `constructores.test.ts` y **3 más** en `pureza.test.ts`, que ahora recorre también `motor/tipos.ts`, `motor/ids.ts` y `motor/pruebas/constructores.ts`.

```text
 Test Files  54 passed (54)
      Tests  650 passed (650)
```

Si el número que ves no es 650, sigue con **el tuyo**: lo que esta tarea garantiza es **+8 pruebas y +2 archivos** sobre lo que dejó la tarea 9.

- [ ] **Paso 8: Commit**

```bash
git add src/dominio/motor
git commit -m "feat(motor): tipos, ids en serie y constructores de prueba del motor" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/motor/ids.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/ids.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/pruebas/constructores.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/pruebas/constructores.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/tipos.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 8cb4edf] feat(motor): tipos, ids en serie y constructores de prueba del motor
 5 files changed, 250 insertions(+)
 create mode 100644 src/dominio/motor/ids.test.ts
 create mode 100644 src/dominio/motor/ids.ts
 create mode 100644 src/dominio/motor/pruebas/constructores.test.ts
 create mode 100644 src/dominio/motor/pruebas/constructores.ts
 create mode 100644 src/dominio/motor/tipos.ts
```

**Avisos que esta tarea deja escritos:**

1. `estadoMinimo` y `conAsentamiento` son **el** camino para montar el estado de entrada de una prueba del motor (tareas 11 a 27): ninguna prueba debe volver a escribir las 34 claves a mano. Cuando una prueba necesita algo que estas dos funciones no ponen (una regla, una deuda, un evento…), lo añade con el spread `{ ...estado, loQueSea: [...] }`, como hace `caja.test.ts` en la tarea 13.
2. `congelar` es recursivo pero no trata los `Map` ni los `Set` de forma especial: `Object.freeze` de un `Map` impide añadirle claves nuevas al propio Map, pero no impide mutar sus entradas si son objetos mutables. Ninguna prueba del motor congela un `Contexto` (que sí tiene `Map`): solo se congela el `EstadoPartida` de entrada, que no lleva ninguno.
3. `idsEnSerie('sim')` es el prefijo que usan todas las pruebas del motor; cuando una prueba encadena dos avances (por ejemplo, un `simular` y después una previsión de «Pago no cubierto», tarea 20), cada uno necesita su propio prefijo (`'sim1'`, `'sim2'`…) para que sus ids no choquen entre sí.

---

### Tarea 11 · Textos del motor

Todos los textos literales que el motor produce —el concepto de un movimiento agrupado, la contraparte automática de un impago, el «qué ha pasado» de un avance y los tres avisos de dinero— salen de un único módulo puro, `motor/textos.ts`, con veintiuna funciones de formato y ninguna dependencia del estado de una partida: cada una recibe ya los datos que necesita (un número, un nombre, unas fechas) y devuelve el texto exacto del apartado 3 del contrato. Separarlas del resto del motor evita que la lógica de negocio (qué se cobra, qué se paga, cuándo hay impago) se mezcle con el formato de lo que se enseña, y hace que estas veintiuna reglas —singular con 1, sufijos que nunca se cortan, nombres que se ajustan a 60 o a 200 caracteres— se prueben de una vez, sin tener que montar un `Contexto` ni una `EstadoPartida` para cada una.

Depende de la tarea 3 (`formatearMeses`, de `calendario/formatoFecha.ts`) para `conceptoLocales`, y de `texto/normalizar.ts` (fase 2, ya existente) para `esNombreReservado` en `nombreDeContraparte`.

**Reglas de la especificación que implementa:**

- **Conceptos diarios (§9 l.1285, D-030).** «Los conceptos diarios forman un movimiento por concepto y avance, fechado el último día («Posada · 7 noches −0,7 mo»).» `conceptoDiario` corta el concepto de la regla a 120 y nunca el sufijo, y con un solo día pierde la «s» final: «1 noche», «1 día» (decisión propia de esta fase, D-030, porque la especificación no fijaba «noches» frente a «días»).
- **Salarios y soldadas agrupados (§9 l.1287, D-029, D-031).** «Los salarios que se pagan el mismo día en un asentamiento se agrupan en uno («Salarios de 14 trabajadores»); igual las soldadas.» `conceptoSalarios(1)` da «Salarios de 1 trabajador» y `conceptoSoldadas` nunca lleva número («Soldada de la guarnición»): la especificación no escribía esos dos casos, y D-031 los fija.
- **Impuestos de locales (§9 l.1288, D-031).** «Los impuestos de locales que se cobran el mismo día en un asentamiento forman un movimiento, en la categoría Impuestos: «Impuestos de locales · abril (4)». El número entre paréntesis cuenta los locales que pagan. Si se cobran dos meses, «marzo y abril».» `conceptoLocales` delega los meses en `formatearMeses` (tarea 3) y añade el número de locales con `conSufijo`, que nunca lo deja cortado aunque los meses no quepan en 120.
- **Contraparte automática (§9 l.1294, D-023).** «Contraparte automática: salarios → «Trabajadores de Bree»; soldadas → «Guarnición de Bree»; tributos → su destinatario o, si no tiene, su concepto; gastos recurrentes y pagos programados → su concepto.» `nombreDeContraparte` aplica la parte que la especificación no fijaba (D-023): «si pasa de 60 caracteres, los primeros 59 y «…»; si queda con menos de 2 caracteres o coincide con un nombre reservado, se añade « (impago)»».
- **Nombre del oficio en el detalle (§6.3 l.579).** «Oficio con su plural cuando el número es mayor que 1.» `nombreDeOficio` da el singular del catálogo con 1 y el plural con más, y «Trabajador»/«Trabajadores» si el oficio ya no está en el catálogo (T28, porque un oficio se puede eliminar después de contratar y el movimiento histórico conserva su origenId).
- **Hechos del avance (D-032).** «Qué ha pasado» cuenta de momento los tributos pagados, los cobros de impuestos de locales y las caravanas de venta que vuelven, con su día: «Tributo de Archet pagado · 19», «Impuestos de locales de Bree cobrados · 1», «Caravana de Fornost de vuelta · 18» (P5). El día ya formateado (`formatearDiaDelAvance`, tarea 3) es un parámetro de estas tres funciones, no algo que calculen ellas.
- **Bolsa y caja en negativo (§6.4 l.808).** «Inicio muestra el aviso rojo «La bolsa de Tharan está en negativo: −3,482 mo» hasta que vuelva a 0 o más.» `laCajaDe` distingue «La bolsa de …» del personaje y «La caja de …» de un asentamiento; `avisoSaldoNegativo` la usa tal cual.
- **Impago (D-024).** «El aviso rojo de un impago dice «La caja de Bree no pudo pagar a Trabajadores de Bree: 1,2 mo pendientes» y sigue en Inicio mientras quede algo por pagar de esa deuda.»
- **Pago no cubierto (§9 l.1354, D-025).** «La caja de Archet no cubre el tributo de 60 mo del 19 de julio.» Los salarios y las soldadas de un día avisan juntos, con «el tributo», «los salarios» o «la soldada»; el resto de reglas avisan con su concepto entre comillas latinas, recortado si hace falta para que el aviso entero quepa en 200.

**Archivos:**
- Crear: `src/dominio/motor/textos.ts`
- Prueba: `src/dominio/motor/textos.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La prueba recorre el apartado 3 del contrato entero, agrupada por sus cinco bloques: conceptos de movimiento, nombres del catálogo, contrapartes, hechos y avisos de dinero. Cada bloque comprueba primero el caso normal con los ejemplos literales del contrato y después los bordes: singular sin «s», un texto que hay que cortar a 120 o a 200, un nombre que no está en el catálogo.

Crea `src/dominio/motor/textos.test.ts` con este contenido:

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

const EQ = EQUIVALENCIAS_POR_DEFECTO

const THARAN: Dominio = { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' }
const BREE: Dominio = {
  id: 'dom.bree',
  tipo: 'asentamiento',
  nombre: 'Bree',
  categoria: 'pueblo',
  alta: { anio: 1640, mes: 1, dia: 1 },
}
const ARCHET: Dominio = { ...BREE, id: 'dom.archet', nombre: 'Archet', categoria: 'aldea' }

describe('ajustarTexto', () => {
  it('deja igual lo que cabe y corta lo que no con «…», justo al máximo (T26)', () => {
    expect(ajustarTexto('Posada', 6)).toBe('Posada')
    expect(ajustarTexto('Posada El Poney Pisador', 10)).toBe('Posada El…')
    expect(ajustarTexto('x'.repeat(130), 120)).toHaveLength(120)
    expect(ajustarTexto('x'.repeat(130), 120).endsWith('x…')).toBe(true)
  })
})

describe('conceptos de los movimientos del avance (apartado 3.1)', () => {
  it('diarios: «· 7 noches» con la unidad de la regla y «· 7 días» sin ella (§9 l.1285, D-030)', () => {
    expect(conceptoDiario('Posada El Poney Pisador', 7, 'noches')).toBe('Posada El Poney Pisador · 7 noches')
    expect(conceptoDiario('Establo del poni', 7)).toBe('Establo del poni · 7 días')
    expect(conceptoDiario('Peaje del camino', 2)).toBe('Peaje del camino · 2 días')
  })

  it('diarios con un solo día: «1 noche» y «1 día», sin la «s» final (D-030)', () => {
    expect(conceptoDiario('Posada El Poney Pisador', 1, 'noches')).toBe('Posada El Poney Pisador · 1 noche')
    expect(conceptoDiario('Peaje del camino', 1)).toBe('Peaje del camino · 1 día')
  })

  it('un diario corta el concepto de la regla a 120 y nunca el sufijo (T26)', () => {
    const concepto = conceptoDiario('P'.repeat(120), 366, 'noches')
    expect(concepto).toHaveLength(120)
    expect(concepto.endsWith('P… · 366 noches')).toBe(true)
  })

  it('salarios: «Salarios de 14 trabajadores», «Salarios de 1 trabajador» y, diarios, con los días (D-029, D-031)', () => {
    expect(conceptoSalarios(14)).toBe('Salarios de 14 trabajadores')
    expect(conceptoSalarios(1)).toBe('Salarios de 1 trabajador')
    expect(conceptoSalarios(3, 7)).toBe('Salarios de 3 trabajadores · 7 días')
    expect(conceptoSalarios(1, 1)).toBe('Salarios de 1 trabajador · 1 día')
  })

  it('soldadas: «Soldada de la guarnición», sin número, y con los días si son diarias (D-031)', () => {
    expect(conceptoSoldadas()).toBe('Soldada de la guarnición')
    expect(conceptoSoldadas(7)).toBe('Soldada de la guarnición · 7 días')
    expect(conceptoSoldadas(1)).toBe('Soldada de la guarnición · 1 día')
  })

  it('locales: los meses cobrados y cuántos locales pagan, con el año solo si cruzan de año (§9 l.1288, D-031)', () => {
    expect(conceptoLocales([{ anio: 1640, mes: 4 }], 4)).toBe('Impuestos de locales · abril (4)')
    const marzoYAbril = [
      { anio: 1640, mes: 3 },
      { anio: 1640, mes: 4 },
    ]
    expect(conceptoLocales(marzoYAbril, 4)).toBe('Impuestos de locales · marzo y abril (4)')
    const primerTrimestre = [
      { anio: 1640, mes: 1 },
      { anio: 1640, mes: 2 },
      { anio: 1640, mes: 3 },
    ]
    expect(conceptoLocales(primerTrimestre, 2)).toBe('Impuestos de locales · enero, febrero y marzo (2)')
    const cruzanDeAnio = [
      { anio: 1639, mes: 12 },
      { anio: 1640, mes: 1 },
    ]
    expect(conceptoLocales(cruzanDeAnio, 1)).toBe('Impuestos de locales · diciembre de 1639 y enero de 1640 (1)')
  })

  it('locales: muchos meses caben en 120 sin cortar el número de locales (T26)', () => {
    // De febrero de 1639 a enero de 1640: doce meses que cruzan de año, cada uno con el suyo.
    const meses = Array.from({ length: 12 }, (_, i) => (i < 11 ? { anio: 1639, mes: i + 2 } : { anio: 1640, mes: 1 }))
    const concepto = conceptoLocales(meses, 3)
    expect(concepto).toHaveLength(120)
    expect(concepto.startsWith('Impuestos de locales · febrero de 1639, marzo de 1639')).toBe(true)
    expect(concepto.endsWith('… (3)')).toBe(true)
  })

  it('beneficio y vuelta de una venta: «Beneficio de …» y «Caravana: venta de cerveza en Fornost» (D-031, T27)', () => {
    expect(conceptoBeneficio('Barcaza del Brandivino')).toBe('Beneficio de Barcaza del Brandivino')
    expect(conceptoVentaCaravana('Cerveza', 'Fornost')).toBe('Caravana: venta de cerveza en Fornost')
    expect(conceptoVentaCaravana('mercancía', 'Tharbad')).toBe('Caravana: venta de mercancía en Tharbad')
    const largo = conceptoVentaCaravana('R'.repeat(40), 'M'.repeat(60))
    expect(largo).toHaveLength(120)
    expect(largo.startsWith('Caravana: venta de rRRR')).toBe(true)
  })
})

describe('nombres del catálogo', () => {
  it('el oficio va en singular con 1 y en plural con más (§6.3 l.579, T9)', () => {
    const catalogo = catalogosDeEjemplo()
    expect(nombreDeOficio(catalogo, 'oficio.pastor', 1)).toBe('Pastor')
    expect(nombreDeOficio(catalogo, 'oficio.pastor', 3)).toBe('Pastores')
    expect(nombreDeOficio(catalogo, 'oficio.granjero', 6)).toBe('Granjeros')
  })

  it('sin la opción en el catálogo: «Trabajador(es)» y «mercancía»; con ella, el nombre del recurso (T28)', () => {
    const catalogo = catalogosDeEjemplo()
    expect(nombreDeOficio(catalogo, 'oficio.inventado', 1)).toBe('Trabajador')
    expect(nombreDeOficio(catalogo, 'oficio.inventado', 2)).toBe('Trabajadores')
    expect(nombreDeOficio(catalogo, 'cat.salarios', 2)).toBe('Trabajadores')
    expect(nombreDeRecurso(catalogo, 'recurso.cerveza')).toBe('Cerveza')
    expect(nombreDeRecurso(catalogo, 'recurso.inventado')).toBe('mercancía')
  })
})

describe('contrapartes de los impagos (apartado 3.2)', () => {
  it('salarios y soldadas: «Trabajadores de Bree» y «Guarnición de Bree» (§9 l.1294)', () => {
    expect(contraparteDeSalarios('Bree')).toBe('Trabajadores de Bree')
    expect(contraparteDeSoldadas('Bree')).toBe('Guarnición de Bree')
  })

  it('un nombre de más de 60 se queda en los primeros 59 y «…»; uno válido no cambia (D-023)', () => {
    const largo = contraparteDeSalarios('A'.repeat(60))
    expect(largo).toHaveLength(76)
    const cortado = nombreDeContraparte(largo)
    expect(cortado).toHaveLength(60)
    expect(cortado).toBe(`Trabajadores de ${'A'.repeat(43)}…`)
    expect(nombreDeContraparte('Corona de Arthedain')).toBe('Corona de Arthedain')
    expect(nombreDeContraparte('Posada El Poney Pisador')).toBe('Posada El Poney Pisador')
  })

  it('uno de una letra o reservado por los filtros gana « (impago)» (D-023)', () => {
    expect(nombreDeContraparte('X')).toBe('X (impago)')
    expect(nombreDeContraparte('Todos')).toBe('Todos (impago)')
    expect(nombreDeContraparte('Todas las categorías')).toBe('Todas las categorías (impago)')
  })
})

describe('hechos del avance (apartado 3.3)', () => {
  it('tributo pagado, locales cobrados y caravana de vuelta, con el día que se les pase (D-032)', () => {
    expect(hechoTributoPagado('Archet', '19')).toBe('Tributo de Archet pagado · 19')
    expect(hechoLocalesCobrados('Bree', '1')).toBe('Impuestos de locales de Bree cobrados · 1')
    expect(hechoCaravanaDeVuelta('Fornost', '18')).toBe('Caravana de Fornost de vuelta · 18')
    expect(hechoTributoPagado('Archet', '19 de abril de 1641')).toBe('Tributo de Archet pagado · 19 de abril de 1641')
  })
})

describe('avisos de dinero (apartado 3.4)', () => {
  it('la bolsa es la del personaje y la caja, la de un asentamiento (§6.4 l.808)', () => {
    expect(laCajaDe(THARAN)).toBe('La bolsa de Tharan')
    expect(laCajaDe(BREE)).toBe('La caja de Bree')
  })

  it('saldo negativo: «La bolsa de Tharan está en negativo: −3,482 mo» (§6.4 l.808)', () => {
    expect(avisoSaldoNegativo(THARAN, formatearOro(-348200, EQ))).toBe('La bolsa de Tharan está en negativo: −3,482 mo')
    expect(avisoSaldoNegativo(BREE, formatearOro(-60000, EQ))).toBe('La caja de Bree está en negativo: −0,6 mo')
  })

  it('impago: «… no pudo pagar a Trabajadores de Bree: 1,2 mo pendientes» (D-024)', () => {
    expect(avisoImpago(BREE, 'Trabajadores de Bree', formatearOro(120000, EQ))).toBe(
      'La caja de Bree no pudo pagar a Trabajadores de Bree: 1,2 mo pendientes',
    )
    expect(avisoImpago(ARCHET, 'Corona de Arthedain', formatearOro(1880000, EQ))).toBe(
      'La caja de Archet no pudo pagar a Corona de Arthedain: 18,8 mo pendientes',
    )
  })

  it('pago no cubierto: el tributo, los salarios, la soldada o «concepto» (§9 l.1354, D-025)', () => {
    expect(avisoPagoNoCubierto(ARCHET, { clase: 'tributo' }, formatearOro(6000000, EQ), '19 de julio')).toBe(
      'La caja de Archet no cubre el tributo de 60 mo del 19 de julio',
    )
    expect(avisoPagoNoCubierto(ARCHET, { clase: 'salarios' }, formatearOro(320000, EQ), '26 de julio')).toBe(
      'La caja de Archet no cubre los salarios de 3,2 mo del 26 de julio',
    )
    expect(avisoPagoNoCubierto(BREE, { clase: 'soldadas' }, formatearOro(420000, EQ), '20 de abril')).toBe(
      'La caja de Bree no cubre la soldada de 4,2 mo del 20 de abril',
    )
    const posada = { clase: 'concepto', concepto: 'Posada El Poney Pisador' } as const
    expect(avisoPagoNoCubierto(THARAN, posada, formatearOro(10000, EQ), '20 de abril')).toBe(
      'La bolsa de Tharan no cubre «Posada El Poney Pisador» de 0,1 mo del 20 de abril',
    )
  })

  it('pago no cubierto: un concepto de 120 se corta para que el aviso quepa en 200 (T26)', () => {
    const texto = avisoPagoNoCubierto(
      { ...BREE, nombre: 'B'.repeat(60) },
      { clase: 'concepto', concepto: 'C'.repeat(120) },
      formatearOro(123456789, EQ),
      '19 de septiembre de 1641',
    )
    expect(texto).toHaveLength(200)
    expect(texto.endsWith('C…» de 1.234,56789 mo del 19 de septiembre de 1641')).toBe(true)
  })
})
```

Son **veinte pruebas**: nueve de conceptos de movimiento (con `ajustarTexto`), dos del catálogo, tres de contrapartes, una de hechos y cinco de avisos.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/textos.test.ts
```

Fallo esperado: `motor/textos.ts` todavía no existe. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/textos.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/textos.test.ts [ src/dominio/motor/textos.test.ts ]
Error: Cannot find module './textos' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/textos.test.ts
 ❯ src/dominio/motor/textos.test.ts:6:1
      4| import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
      5| import type { Dominio } from '../modelo/dominios'
      6| import {
       | ^
      7|   ajustarTexto,
      8|   avisoImpago,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:48:52
   Duration  1.18s (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `motor/textos.ts`**

Crea `src/dominio/motor/textos.ts` con este contenido:

```ts
import { formatearMeses } from '../calendario/formatoFecha'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { AnioMes, Id } from '../modelo/comunes'
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

/** «Caravana: venta de cerveza en Fornost», con el recurso en minúscula inicial (D-031, T27). */
export function conceptoVentaCaravana(recurso: string, mercado: string): string {
  const carga = `${recurso.charAt(0).toLowerCase()}${recurso.slice(1)}`
  return ajustarTexto(`Caravana: venta de ${carga} en ${mercado}`, MAXIMO_CONCEPTO)
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
```

Notas sobre el cuerpo:

1. `conSufijo` es el ayudante que cumple «corta el concepto, nunca el sufijo»: calcula cuánto le queda al texto principal restando el largo del sufijo al máximo, y solo entonces llama a `ajustarTexto`. `conceptoDiario` y `conceptoLocales` lo comparten porque los dos pegan algo que no se puede perder («· 7 noches», « (4)»).
2. `cuenta` es la única regla del singular sin «s»: solo la usan `conceptoDiario` (con la unidad de la regla o «días») y `sufijoDeDias` (siempre «días»). `conceptoSalarios` y `conceptoSoldadas` no la necesitan para el número de trabajadores porque «Salarios de 1 trabajador» cambia la palabra entera, no solo la «s».
3. `avisoPagoNoCubierto` calcula el hueco del concepto restando también el largo de las comillas latinas («»), para que el aviso completo —no solo el concepto— quede dentro de 200 caracteres.
4. `nombreDeOficio` y `nombreDeRecurso` reciben el catálogo ya en copia (`CatalogosEnCopia`, fase 2): no leen `db` ni nada de `src/datos`, así que siguen siendo funciones puras del dominio.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/textos.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  20 passed (20)
   Start at  11:48:57
   Duration  967ms (transform 52%, import 45%, tests 2%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0; `npm test` termina con **671 pruebas en 55 archivos**. La tarea 10 dejó 650 pruebas en 54 archivos, y esta trae **21 nuevas**: las 20 de `textos.test.ts` y **una más** en `pureza.test.ts`, que ahora recorre también `motor/textos.ts`.

```text
 Test Files  55 passed (55)
      Tests  671 passed (671)
```

Si el número que ves no es 671, sigue con **el tuyo**: lo que esta tarea garantiza es **+21 pruebas y +1 archivo** sobre lo que dejó la tarea 10.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/textos.ts src/dominio/motor/textos.test.ts
git commit -m "feat(motor): conceptos, contrapartes, hechos y textos de avisos del motor" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/motor/textos.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/textos.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 0fffa26] feat(motor): conceptos, contrapartes, hechos y textos de avisos del motor
 2 files changed, 364 insertions(+)
 create mode 100644 src/dominio/motor/textos.test.ts
 create mode 100644 src/dominio/motor/textos.ts
```

**Avisos que esta tarea deja escritos:**

1. Ninguna función de este módulo mira el estado ni el contexto: quien las llama (las tareas 15 a 20) ya sabe cuántos trabajadores pagó, cuántos locales pagaron o qué le faltó a quién. Si una tarea futura necesita un texto nuevo, va aquí, no repartido por los pasos del motor.
2. `nombreDeContraparte` se aplica **una vez**, en `impagos.ts` (tarea 13) al crear la deuda: la contraparte guardada ya lleva el ajuste, y `contraparteDeSalarios`/`contraparteDeSoldadas` (sin ajustar) solo se usan para construir el nombre que luego se le pasa.
3. «Aranceles del mercado» no cambia aunque un evento (feria) le suba el importe un 500 % (D-031): el concepto de una regla no diaria y sin vínculo se copia tal cual, sin pasar por ninguna función de este archivo.

---

### Tarea 12 · Objeto de un pago programado

Cuando un gasto se registra con «Añadir también al inventario» (J2b) y tiene fecha futura, el objeto no se crea al teclear el gasto: se crea cuando el avance aplica ese pago programado (§7 l.1173). `EsquemaObjetoPendiente` (fase 2, `modelo/movimientos.ts` l.66-77) ya guarda lo que hace falta —nombre, cantidad, valor por unidad y ubicación— dentro del `Movimiento` programado; esta tarea escribe la única función que falta para usarlo: `anadirObjetoComprado`, que el paso 9 (tarea 17) llamará cada vez que aplique uno de esos movimientos.

La función no sabe nada de movimientos programados ni de pagos parciales: recibe la lista de objetos de un personaje, el `ObjetoPendiente` ya calculado y los tres datos que le faltan para construir la fila (`personajeId`, `movimientoId` y un `nuevoId`), y devuelve la lista con la fila añadida o sumada. Que el pago se haya cubierto entero o solo en parte (D-034) es una decisión de quien la llama, no de esta función: D-034 dice justamente que el objeto se crea igual, «aunque la caja no llegue a pagarlo entero».

Depende de la tarea 10: usa `NuevoId` (`motor/tipos.ts`) para la firma del generador de ids, y sus pruebas usan `idsEnSerie` y `congelar` (`motor/pruebas/constructores.ts`) para comprobar que no muta su entrada.

**Reglas de la especificación que implementa:**

- **«Añadir también al inventario» (§7 l.1173).** «(J2b, solo en gastos) crea una fila nueva, salvo que exista otra con el mismo nombre, ubicación y valor por unidad, que se suma. Valor por unidad = importe ÷ cantidad, editable. Con fecha futura, el objeto se crea al aplicarse el movimiento.» Esta tarea es la parte de «se crea al aplicarse el movimiento»; el cálculo del valor por unidad (importe ÷ cantidad) ya lo hizo el formulario al guardar el `ObjetoPendiente` en el movimiento, así que `anadirObjetoComprado` recibe `valorUnitario` ya hecho.
- **Objeto vinculado, no independiente (§6.4, tabla de vínculos).** «Un movimiento manual con «Añadir también al inventario» tampoco es vinculado. El objeto guarda movimientoCompraId y J2d del movimiento ofrece la casilla «Quitar también las 3 athelas del inventario».» El movimiento sigue sin vínculo (`Movimiento.vinculo` no se toca); es el objeto el que guarda `movimientoCompraId`, y solo en la fila **nueva** que crea: una fila con la que se suma conserva el `movimientoCompraId` que ya tenía.
- **Objeto de un pago que no se cubre entero (D-034).** «Un pago programado con «Añadir también al inventario» crea el objeto al aplicarse aunque la caja no llegue a pagarlo entero; lo que falta queda como impago. Si ya hay una fila con el mismo nombre, ubicación y valor, se suma a ella.»

**Archivos:**
- Crear: `src/dominio/inventario/compra.ts`
- Prueba: `src/dominio/inventario/compra.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La carpeta `src/dominio/inventario/` es nueva. La prueba parte del inventario de Tharan en el ejemplo («La Sombra del Este», fase 2): 7 objetos, entre ellos 3 athelas encima a 20.000 mh cada una (`OBJETO.athelas`, `MOV_THARAN.athelas`). Comprueba la fila nueva (con y sin notas), la suma a una fila igual sin importar mayúsculas ni espacios en el nombre (`mismoNombre`, fase 2), que no se suma a una fila archivada ni con otro valor o ubicación, y que no muta la lista de entrada.

Crea `src/dominio/inventario/compra.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { DOM, MOV_THARAN, OBJETO } from '../ejemplo/ids'
import type { ObjetoPendiente } from '../modelo/movimientos'
import { EsquemaObjetoInventario, type ObjetoInventario } from '../modelo/personaje'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { anadirObjetoComprado } from './compra'

/** Los 7 objetos de Tharan, congelados: la función no puede tocarlos. */
function objetosDeTharan(): ObjetoInventario[] {
  return congelar(documentoDeEjemplo().objetos)
}

/** Lo que el pago programado pide añadir: 2 athelas encima, a 2 mp cada una, como la fila del ejemplo. */
function athelas(cambios: Partial<ObjetoPendiente> = {}): ObjetoPendiente {
  return {
    nombre: 'Athelas',
    cantidad: 2,
    valorUnitario: { base: 20000, introducido: { cantidad: '2', moneda: 'mp' } },
    ubicacion: { tipo: 'encima' },
    ...cambios,
  }
}

const DATOS = { personajeId: DOM.tharan, movimientoId: 'mov.capa' }

describe('anadirObjetoComprado', () => {
  it('crea una fila nueva del personaje con el movimiento que la compró (§7 l.1173, D-034)', () => {
    const objetos = objetosDeTharan()
    const capa: ObjetoPendiente = {
      nombre: 'Capa élfica',
      cantidad: 1,
      valorUnitario: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
      ubicacion: { tipo: 'encima' },
      notas: 'Regalo para Barnabás',
    }
    const resultado = anadirObjetoComprado(objetos, capa, { ...DATOS, nuevoId: idsEnSerie('sim') })
    expect(resultado).toHaveLength(8)
    expect(resultado.slice(0, 7)).toEqual(objetos)
    expect(resultado[7]).toEqual({
      id: 'sim.1',
      dominioId: DOM.tharan,
      nombre: 'Capa élfica',
      cantidad: 1,
      valorUnitario: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
      ubicacion: { tipo: 'encima' },
      notas: 'Regalo para Barnabás',
      movimientoCompraId: 'mov.capa',
    })
    expect(EsquemaObjetoInventario.safeParse(resultado[7]).success).toBe(true)
  })

  it('sin notas, la fila nueva no lleva la clave', () => {
    const resultado = anadirObjetoComprado([], athelas({ ubicacion: { tipo: 'caja', dominioId: DOM.bree } }), {
      ...DATOS,
      nuevoId: idsEnSerie('sim'),
    })
    expect(resultado).toHaveLength(1)
    expect('notas' in resultado[0]).toBe(false)
  })

  it('suma a la fila con el mismo nombre normalizado, ubicación y valor, y conserva su movimientoCompraId (T19)', () => {
    const objetos = objetosDeTharan()
    const nuevoId = idsEnSerie('sim')
    const resultado = anadirObjetoComprado(objetos, athelas({ nombre: '  ATHELAS ' }), { ...DATOS, nuevoId })
    expect(resultado).toHaveLength(7)
    const fila = resultado.find((o) => o.id === OBJETO.athelas)
    expect(fila?.cantidad).toBe(5)
    expect(fila?.nombre).toBe('Athelas')
    expect(fila?.movimientoCompraId).toBe(MOV_THARAN.athelas)
    expect(nuevoId()).toBe('sim.1')
  })

  it('no suma a una fila archivada: crea otra', () => {
    const objetos = objetosDeTharan()
    const pergamino: ObjetoPendiente = {
      nombre: 'Pergamino «Paso sin rastro»',
      cantidad: 1,
      valorUnitario: { base: 736000, introducido: { cantidad: '7,36', moneda: 'mo' } },
      ubicacion: { tipo: 'encima' },
    }
    const resultado = anadirObjetoComprado(objetos, pergamino, { ...DATOS, nuevoId: idsEnSerie('sim') })
    expect(resultado).toHaveLength(8)
    expect(resultado[7].id).toBe('sim.1')
    expect(resultado.find((o) => o.id === OBJETO.pergaminoPaso)?.cantidad).toBe(1)
  })

  it('no suma con otro valor por unidad ni con otra ubicación', () => {
    const objetos = objetosDeTharan()
    const nuevoId = idsEnSerie('sim')
    const otroValor = anadirObjetoComprado(objetos, athelas({ valorUnitario: { base: 25000 } }), { ...DATOS, nuevoId })
    expect(otroValor).toHaveLength(8)
    const otraUbicacion = anadirObjetoComprado(objetos, athelas({ ubicacion: { tipo: 'caja', dominioId: DOM.bree } }), {
      ...DATOS,
      nuevoId,
    })
    expect(otraUbicacion).toHaveLength(8)
    const esmeraldaEnArchet = anadirObjetoComprado(
      objetos,
      {
        nombre: 'Esmeralda tallada',
        cantidad: 1,
        valorUnitario: { base: 1200000 },
        ubicacion: { tipo: 'caja', dominioId: DOM.archet },
      },
      { ...DATOS, nuevoId },
    )
    expect(esmeraldaEnArchet).toHaveLength(8)
    expect(esmeraldaEnArchet.find((o) => o.id === OBJETO.esmeraldas)?.cantidad).toBe(2)
  })

  it('no muta la entrada: devuelve una lista nueva y la fila sumada es otro objeto', () => {
    const objetos = objetosDeTharan()
    const resultado = anadirObjetoComprado(objetos, athelas(), { ...DATOS, nuevoId: idsEnSerie('sim') })
    expect(resultado).not.toBe(objetos)
    expect(objetos.find((o) => o.id === OBJETO.athelas)?.cantidad).toBe(3)
    expect(resultado.find((o) => o.id === OBJETO.athelas)).not.toBe(objetos.find((o) => o.id === OBJETO.athelas))
    expect(resultado.find((o) => o.id === OBJETO.espada)).toBe(objetos.find((o) => o.id === OBJETO.espada))
  })
})
```

Son **seis pruebas**: fila nueva, fila nueva sin notas, suma a una fila igual, no suma a una archivada, no suma con otro valor o ubicación, y que no muta la entrada.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/inventario/compra.test.ts
```

Fallo esperado: `inventario/compra.ts` todavía no existe. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/inventario/compra.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/inventario/compra.test.ts [ src/dominio/inventario/compra.test.ts ]
Error: Cannot find module './compra' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/inventario/compra.test.ts
 ❯ src/dominio/inventario/compra.test.ts:8:1
      6| import { idsEnSerie } from '../motor/ids'
      7| import { congelar } from '../motor/pruebas/constructores'
      8| import { anadirObjetoComprado } from './compra'
       | ^
      9|
     10| /** Los 7 objetos de Tharan, congelados: la función no puede tocarlos.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:49:36
   Duration  1.76s (worker 95%, environment 5%)
```

- [ ] **Paso 3: Implementar `inventario/compra.ts`**

Crea `src/dominio/inventario/compra.ts` con este contenido:

```ts
import type { Id, UbicacionObjeto } from '../modelo/comunes'
import type { ObjetoPendiente } from '../modelo/movimientos'
import type { ObjetoInventario } from '../modelo/personaje'
import type { NuevoId } from '../motor/tipos'
import { mismoNombre } from '../texto/normalizar'

/** Una clave que es igual si y solo si las dos ubicaciones son la misma: «encima», «caja|dom.bree»… */
function claveDeUbicacion(ubicacion: UbicacionObjeto): string {
  switch (ubicacion.tipo) {
    case 'encima':
      return 'encima'
    case 'caja':
    case 'almacen':
      return `${ubicacion.tipo}|${ubicacion.dominioId}`
    case 'propia':
      return `propia|${ubicacion.ubicacionId}`
  }
}

/**
 * Crea el objeto de un gasto con «Añadir también al inventario» o lo suma a una fila igual (§7 l.1173, D-034, T19).
 * Una fila es igual si no está archivada y tiene el mismo nombre normalizado, la misma ubicación y el mismo valor por
 * unidad; la fila sumada conserva su movimientoCompraId. No muta la lista que recibe.
 */
export function anadirObjetoComprado(
  objetos: readonly ObjetoInventario[],
  pendiente: ObjetoPendiente,
  datos: { personajeId: Id; movimientoId: Id; nuevoId: NuevoId },
): ObjetoInventario[] {
  const ubicacion = claveDeUbicacion(pendiente.ubicacion)
  const indice = objetos.findIndex(
    (o) =>
      o.archivado === undefined &&
      mismoNombre(o.nombre, pendiente.nombre) &&
      claveDeUbicacion(o.ubicacion) === ubicacion &&
      o.valorUnitario.base === pendiente.valorUnitario.base,
  )
  if (indice >= 0) {
    return objetos.map((o, i) => (i === indice ? { ...o, cantidad: o.cantidad + pendiente.cantidad } : o))
  }
  const nuevo: ObjetoInventario = {
    id: datos.nuevoId(),
    dominioId: datos.personajeId,
    nombre: pendiente.nombre,
    cantidad: pendiente.cantidad,
    valorUnitario: pendiente.valorUnitario,
    ubicacion: pendiente.ubicacion,
    ...(pendiente.notas === undefined ? {} : { notas: pendiente.notas }),
    movimientoCompraId: datos.movimientoId,
  }
  return [...objetos, nuevo]
}
```

Notas sobre el cuerpo:

1. `claveDeUbicacion` compara `UbicacionObjeto` por su forma, no por referencia: dos objetos «en la caja de Bree» son la misma ubicación aunque vengan de literales distintos. Se usa dos veces (para el objeto candidato y para cada fila existente) en vez de una comparación estructural genérica, porque `UbicacionObjeto` es una unión discriminada de cuatro formas y una clave de texto es más barata de comparar que recorrer las cuatro ramas en el `findIndex`.
2. El valor por unidad se compara con `o.valorUnitario.base === pendiente.valorUnitario.base`: solo la base en mh, nunca `introducido`, porque dos compras del mismo objeto pueden teclearse en monedas distintas y seguir siendo el mismo valor.
3. La fila nueva usa el spread condicional `...(pendiente.notas === undefined ? {} : { notas: pendiente.notas })` en vez de `notas: pendiente.notas`, para que una compra sin notas no deje la clave `notas: undefined` en el objeto: `EsquemaObjetoInventario` la declara opcional, no nulable, y la copia se valida con la forma exacta del esquema.
4. La función no comprueba que `pendiente.cantidad` sea positiva ni que `datos.movimientoId` exista: son invariantes que ya garantiza `EsquemaObjetoPendiente` (fase 2) y quien construye `datos` (la tarea 17), respectivamente.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/inventario/compra.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  11:49:43
   Duration  1.54s (transform 51%, import 44%, tests 4%, worker 2%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0; `npm test` termina con **678 pruebas en 56 archivos**. La tarea 11 dejó 671 pruebas en 55 archivos, y esta trae **7 nuevas**: las 6 de `compra.test.ts` y **una más** en `pureza.test.ts`, que ahora recorre también `inventario/compra.ts`.

```text
 Test Files  56 passed (56)
      Tests  678 passed (678)
```

Si el número que ves no es 678, sigue con **el tuyo**: lo que esta tarea garantiza es **+7 pruebas y +1 archivo** sobre lo que dejó la tarea 11.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/inventario
git commit -m "feat(inventario): objeto de un pago programado con «Añadir también al inventario»" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/inventario/compra.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/inventario/compra.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 0028e1a] feat(inventario): objeto de un pago programado con «Añadir también al inventario»
 2 files changed, 173 insertions(+)
 create mode 100644 src/dominio/inventario/compra.test.ts
 create mode 100644 src/dominio/inventario/compra.ts
```

**Avisos que esta tarea deja escritos:**

1. La tarea 17 llama a `anadirObjetoComprado` **después** de decidir cuánto se pagó de verdad: si la caja no llega y el pago queda parcial, el objeto se crea de todos modos con la cantidad y el valor completos del `ObjetoPendiente` (D-034); lo que falta lo anota `registrarImpago` (tarea 13) como una deuda aparte, no esta función.
2. `movimientoCompraId` solo se escribe en la fila que crea esta función. Si la tarea 23 (edición de movimientos sueltos, fase 9) llega a permitir borrar un movimiento con `movimientoCompraId`, es el objeto quien pierde esa clave, no al revés: `compra.ts` no la lee nunca hacia atrás.

### Tarea 13 · Contexto, caja e impagos

El núcleo del motor: el objeto de trabajo que los pasos 1 y 7 a 10 (tareas 15 a 19) van a leer y escribir, y las dos operaciones de dinero —cobrar y pagar sin bajar de 0— que todos ellos comparten. Tres módulos, escritos en el orden en que uno depende del siguiente:

- **`motor/contexto.ts`**: el `Contexto`, con los saldos vivos (`saldosPorDominio` calculado **una sola vez**, al crearlo: nada de recalcularlo día a día ni dentro del bucle), copias de las seis colecciones que el motor escribe (movimientos, deudas, personas, locales comerciales, caravanas y objetos) y dos índices que evitan búsquedas lineales dentro del bucle: `indiceMovimiento` (posición de cada movimiento por id, para `aplicarProgramado`) y `programadosPorDia` (los movimientos programados sin vínculo, por número de día). `anadirMovimiento` y `aplicarProgramado` son las dos únicas formas de tocar el libro; `estadoFinal` cierra el contexto en un `EstadoPartida` nuevo.
- **`motor/caja.ts`**: `cobrar` y `pagarHasta`, las dos funciones de dos líneas que tocan `ctx.saldos`. Todo lo que el motor paga o cobra pasa por aquí, para que la regla «nunca en negativo» (§9 l.1293) viva en un solo sitio.
- **`motor/impagos.ts`**: qué pasa cuando `pagarHasta` no llega a pagar el importe entero. `personaPara` reutiliza o crea la contraparte; `registrarImpago` abre o suma a la deuda de impago de ese origen; `sumarAlCargo` es lo que un concepto diario (tarea 14) usa para ir sumando el impago de varios días al mismo cargo, en vez de abrir uno nuevo cada día.

Se implementan en ese orden porque `caja.ts` recibe un `Contexto` ya hecho y `impagos.ts` necesita tanto el `Contexto` (para `ctx.deudas`, `ctx.personas` y `ctx.opciones.nuevoId`) como `nombreDeContraparte` de `motor/textos.ts` (tarea 11). Depende también de la tarea 5 (`estadoDe`, para que `estadoFinal` nunca arrastre `avances` aunque reciba un `DocumentoPartida`) y de la tarea 10 (`OpcionesSimulacion`, `idsEnSerie`, `estadoMinimo`, `conAsentamiento` y `congelar` para las tres pruebas).

**Reglas de la especificación que implementa:**

- **`simular` es una función pura (§9 l.1271).** El `Contexto` es la única pieza mutable de todo el motor: vive mientras dura una simulación y se descarta después. `EstadoPartida.estado` que recibe `crearContexto` es de solo lectura (`readonly estado: EstadoPartida`); nada del motor lo muta, y las pruebas lo comprueban pasándole una entrada `congelar`-da.
- **Nunca en negativo (§9 l.1292-1293).** «Los pagos se hacen por filas, en el orden de la tabla. Queda como impago solo lo que no se paga, con aviso rojo. El motor nunca deja una caja en negativo. Si la caja ya está en negativo por una acción manual, sus pagos quedan como impagos.» `pagarHasta` es exactamente esa regla: paga `mín(importe, saldo)`, y si el saldo ya es negativo, `mín` da un número negativo que `Math.max(0, …)` deja en 0.
- **Aplicar un movimiento programado (§6.4 l.768).** «Al aplicarse pasan a programado = false y guardan el avanceId.» `aplicarProgramado` hace justo eso, más los cambios que le pase el paso que lo llama (el importe pagado de verdad, un `objetoPendiente` que ya se creó y hay que quitar de la copia…), sin tocar el id ni el origen del movimiento.
- **Deuda de impago por origen (§9 l.1291, l.1296).** «Hay una deuda de impago por origen, sin interés ni vencimiento, que acumula los impagos sucesivos mientras esté abierta.» `registrarImpago` busca primero una deuda de impago **abierta** (`unicidades.ts` l.293-300, fase 2, ya garantiza que solo puede haber una por origen) del mismo `OrigenImpago`; si la encuentra, le suma un cargo; si no —porque es la primera vez o porque la anterior ya está saldada—, crea una nueva.
- **Reutilizar la persona (§9 l.1295).** «Se reutiliza la persona con el mismo nombre normalizado. Si hay que crearla, (…) se crea al confirmar, porque `simular()` no guarda nada.» `personaPara` busca con `mismoNombre` (fase 2) en `ctx.personas` —que ya incluye las creadas antes en este mismo avance— y, si no la encuentra, la crea y la apunta también en `ctx.personasNuevas`, la lista que P4 usa para el aviso «Se añadirá…».
- **Impago agrupado por avance (D-021).** «Lo que faltó va a la deuda en un solo cargo por avance, con la fecha del primer día sin dinero.» `sumarAlCargo` es la mitad de esta regla: `registrarImpago` abre el cargo el primer día que falta algo, y `sumarAlCargo` lo va engordando los días siguientes del mismo avance sin abrir uno nuevo (la otra mitad, quién decide cuándo sumar en vez de registrar, es de la tarea 14).
- **Programados con fecha pasada (técnica 14, D-033 en sentido inverso).** «Si llega uno al motor (solo desde una copia importada), se aplica el primer día del avance.» `programadosPorDia` indexa cada programado sin vínculo por `máx(aNumeroDeDia(m.fecha), numeroPrimerDia)`: uno con fecha ya pasada cae en la clave del primer día, no en la suya.

**Archivos:**
- Crear: `src/dominio/motor/contexto.ts`, `src/dominio/motor/caja.ts`, `src/dominio/motor/impagos.ts`
- Prueba: `src/dominio/motor/contexto.test.ts`, `src/dominio/motor/caja.test.ts`, `src/dominio/motor/impagos.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla de `contexto.ts`**

La prueba usa la partida de ejemplo (fase 2, `documentoDeEjemplo`/`catalogosDeEjemplo`) para `crearContexto` y `estadoFinal`, y `estadoMinimo`/`conAsentamiento` (tarea 10) para el índice de programados, donde hace falta un estado a medida con movimientos concretos.

Crea `src/dominio/motor/contexto.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, type Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { DOM, MOV_THARAN, RECURRENTE } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { EsquemaEstadoPartida, estadoDe, type EstadoPartida } from '../modelo/documento'
import { EsquemaMovimiento, type Movimiento } from '../modelo/movimientos'
import { anadirMovimiento, aplicarProgramado, crearContexto, estadoFinal } from './contexto'
import { idsEnSerie } from './ids'
import { congelar, estadoMinimo } from './pruebas/constructores'
import type { OpcionesSimulacion } from './tipos'

/** El 19 de abril de 1640: el último día del avance de P4. */
const HASTA: Fecha = { anio: 1640, mes: 4, dia: 19 }

function opciones(): OpcionesSimulacion {
  return { avanceId: 'av.prueba', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** El ejemplo el 12 de abril, sin avances y congelado: el motor no puede tocarlo. */
function ejemplo(): EstadoPartida {
  return congelar(estadoDe(documentoDeEjemplo()))
}

/** Un movimiento manual y programado de la bolsa de Tharan; el signo va en `base`. */
function programado(id: string, fecha: Fecha, base: number, extra: Partial<Movimiento> = {}): Movimiento {
  return {
    id,
    dominioId: DOM.tharan,
    fecha,
    tipo: base < 0 ? 'gasto' : 'ingreso',
    importe: { base },
    categoriaId: CATEGORIA.otros,
    concepto: 'Prueba',
    origen: 'manual',
    programado: true,
    ...extra,
  }
}

describe('crearContexto', () => {
  it('empieza el día siguiente a la fecha actual, con los saldos de saldosPorDominio (§9)', () => {
    const estado = ejemplo()
    const ctx = crearContexto(estado, HASTA, opciones())
    expect(ctx.primerDia).toEqual({ anio: 1640, mes: 4, dia: 13 })
    expect(ctx.hasta).toEqual(HASTA)
    expect(ctx.saldosAntes).toEqual({ [DOM.tharan]: 4651800, [DOM.bree]: 34060000, [DOM.archet]: 8500000 })
    expect(ctx.saldosAntes).toEqual(saldosPorDominio(estado))
    expect(Object.fromEntries(ctx.saldos)).toEqual(ctx.saldosAntes)
    expect(ctx.estado).toBe(estado)
  })

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

  it('indexa por día los programados sin vínculo del avance; los de fecha pasada, en el primer día (T14)', () => {
    const estado = congelar({
      ...estadoMinimo(),
      movimientos: [
        programado('p.dia15', { anio: 1640, mes: 4, dia: 15 }, -10000),
        programado('p.pasado', { anio: 1640, mes: 4, dia: 10 }, -20000),
        programado('p.obra', { anio: 1640, mes: 4, dia: 15 }, -30000, { vinculo: { tipo: 'obra', id: 'obra.x' } }),
        programado('p.hoy', { anio: 1640, mes: 4, dia: 12 }, 40000),
        programado('p.dia15b', { anio: 1640, mes: 4, dia: 15 }, 50000),
        programado('p.aplicado', { anio: 1640, mes: 4, dia: 15 }, 60000, { programado: false }),
        programado('p.despues', { anio: 1640, mes: 4, dia: 20 }, -70000),
      ],
    })
    const ctx = crearContexto(estado, HASTA, opciones())
    expect(ctx.programadosPorDia.size).toBe(2)
    expect(ctx.programadosPorDia.get(aNumeroDeDia({ anio: 1640, mes: 4, dia: 13 }))).toEqual(['p.pasado', 'p.hoy'])
    expect(ctx.programadosPorDia.get(aNumeroDeDia({ anio: 1640, mes: 4, dia: 15 }))).toEqual(['p.dia15', 'p.dia15b'])
    expect(ctx.saldos.get(DOM.tharan)).toBe(60000)
  })
})

describe('anadirMovimiento', () => {
  it('añade un movimiento del avance con un id nuevo, sin claves vacías y sin tocar los saldos', () => {
    const ctx = crearContexto(ejemplo(), HASTA, opciones())
    const id = anadirMovimiento(ctx, {
      dominioId: DOM.tharan,
      fecha: HASTA,
      tipo: 'gasto',
      importe: { base: -70000 },
      categoriaId: 'cat.alojamiento',
      concepto: 'Posada El Poney Pisador · 7 noches',
      regla: { tipo: 'recurrente', id: RECURRENTE.posada },
      inversionId: undefined,
    })
    expect(id).toBe('sim.1')
    const movimiento = ctx.movimientos[ctx.movimientos.length - 1]
    expect(movimiento).toEqual({
      id: 'sim.1',
      dominioId: DOM.tharan,
      fecha: HASTA,
      tipo: 'gasto',
      importe: { base: -70000 },
      categoriaId: 'cat.alojamiento',
      concepto: 'Posada El Poney Pisador · 7 noches',
      regla: { tipo: 'recurrente', id: RECURRENTE.posada },
      origen: 'avance',
      avanceId: 'av.prueba',
      programado: false,
    })
    expect('inversionId' in movimiento).toBe(false)
    expect(EsquemaMovimiento.safeParse(movimiento).success).toBe(true)
    expect(ctx.indiceMovimiento.get('sim.1')).toBe(ctx.movimientos.length - 1)
    expect(Object.fromEntries(ctx.saldos)).toEqual(ctx.saldosAntes)
  })
})

describe('aplicarProgramado', () => {
  it('deja el programado aplicado con el avanceId y los cambios, y quita las claves que llegan vacías (§6.4 l.768)', () => {
    const capa = programado('p.capa', { anio: 1640, mes: 4, dia: 15 }, -1200000, {
      importe: { base: -1200000, introducido: { cantidad: '12', moneda: 'mo' } },
      objetoPendiente: {
        nombre: 'Capa élfica',
        cantidad: 1,
        valorUnitario: { base: 1200000 },
        ubicacion: { tipo: 'encima' },
      },
    })
    const estado = congelar({ ...estadoMinimo(), movimientos: [capa] })
    const ctx = crearContexto(estado, HASTA, opciones())
    aplicarProgramado(ctx, 'p.capa', { importe: { base: -600000 }, objetoPendiente: undefined })
    expect(ctx.movimientos[0]).toEqual({
      id: 'p.capa',
      dominioId: DOM.tharan,
      fecha: { anio: 1640, mes: 4, dia: 15 },
      tipo: 'gasto',
      importe: { base: -600000 },
      categoriaId: CATEGORIA.otros,
      concepto: 'Prueba',
      origen: 'manual',
      programado: false,
      avanceId: 'av.prueba',
    })
    expect('objetoPendiente' in ctx.movimientos[0]).toBe(false)
    expect(EsquemaMovimiento.safeParse(ctx.movimientos[0]).success).toBe(true)
    expect(estado.movimientos[0]).toBe(capa)
    expect(capa.programado).toBe(true)
    expect(() => aplicarProgramado(ctx, 'p.inventado', {})).toThrow('No existe «p.inventado»')
  })
})

describe('estadoFinal', () => {
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

  it('no arrastra los avances aunque reciba un DocumentoPartida (T12)', () => {
    const documento = congelar(documentoDeEjemplo())
    const final = estadoFinal(crearContexto(documento, HASTA, opciones()))
    expect('avances' in final).toBe(false)
    expect(Object.keys(final)).toHaveLength(34)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/contexto.test.ts
```

Fallo esperado: `motor/contexto.ts` todavía no existe. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/contexto.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/contexto.test.ts [ src/dominio/motor/contexto.test.ts ]
Error: Cannot find module './contexto' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/contexto.test.ts
 ❯ src/dominio/motor/contexto.test.ts:9:1
      7| import { EsquemaEstadoPartida, estadoDe, type EstadoPartida } from '..…
      8| import { EsquemaMovimiento, type Movimiento } from '../modelo/movimien…
      9| import { anadirMovimiento, aplicarProgramado, crearContexto, estadoFin…
       | ^
     10| import { idsEnSerie } from './ids'
     11| import { congelar, estadoMinimo } from './pruebas/constructores'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:50:22
   Duration  1.05s (worker 98%, environment 2%)
```

- [ ] **Paso 3: Implementar `motor/contexto.ts`**

Crea `src/dominio/motor/contexto.ts` con este contenido:

```ts
import { aNumeroDeDia, sumarDias, type Fecha } from '../calendario/fecha'
import { saldosPorDominio } from '../dinero/saldo'
import type { LocalComercial } from '../modelo/asentamiento'
import type { PersonaEntidad } from '../modelo/catalogos'
import type { Caravana } from '../modelo/comercio'
import type { Id } from '../modelo/comunes'
import type { Deuda } from '../modelo/deudas'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import type { EventoNarrativo } from '../modelo/eventos'
import type { DetalleTrabajo, Movimiento, ReglaOrigen } from '../modelo/movimientos'
import type { ObjetoInventario } from '../modelo/personaje'
import type { OpcionesSimulacion, Suceso } from './tipos'

/** Un día del recorrido (§9). */
export interface Dia {
  fecha: Fecha
  /** aNumeroDeDia(fecha). */
  numero: number
  /** El primer día recoge lo que ya había vencido (§9 l.1321, T14). */
  primero: boolean
  /** Los eventos de dinero activos ese día; lo rellena el paso 1. */
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
  }
}
```

Notas sobre el cuerpo:

1. `crearContexto` recibe un `EstadoPartida`, pero `estadoFinal` empieza con `estadoDe(ctx.estado)`: así, si `simular` (tarea 21) le pasa un `DocumentoPartida` completo (con `avances`), el resultado nunca los arrastra, sin que `crearContexto` tenga que saber si su entrada llevaba esa clave o no. Es la misma regla que la tarea 5 fijó para `estadoDe`, aplicada en el único sitio del motor donde se construye el estado de salida.
2. `programadosPorDia` se calcula en el mismo `forEach` que construye `indiceMovimiento`, recorriendo los movimientos **una vez**: separar los dos índices en dos bucles sería igual de correcto pero más lento sin ninguna ventaja de claridad.
3. `Math.max(aNumeroDeDia(m.fecha), numeroPrimerDia)` es toda la regla de «fecha pasada, primer día»: no hace falta una rama aparte porque `máx` ya deja el número de un día futuro tal cual y sube el de un día pasado (o el de hoy) al del primer día del avance.
4. `sinClavesVacias` se usa en `anadirMovimiento` y en `aplicarProgramado` porque los dos pueden recibir un objeto con claves opcionales en `undefined` (`inversionId: undefined`, `objetoPendiente: undefined`): sin filtrarlas, `EsquemaMovimiento.safeParse` seguiría pasando —Zod no distingue una clave ausente de una en `undefined` salvo que el esquema lo pida—, pero la copia JSON sí las escribiría, y `coherencia.ts` compara con `'clave' in movimiento`, no con `!== undefined`.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/contexto.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  11:50:27
   Duration  1.02s (transform 56%, import 34%, tests 9%, worker 1%)
```

- [ ] **Paso 5: Escribir la prueba que falla de `caja.ts`**

`caja.test.ts` monta su propio `Contexto` con `crearContexto` sobre un estado a medida: Bree con 3 mo en la caja y la bolsa de Tharan ya en −0,6 mo por un gasto manual (§6.4: en negativo por una acción manual se permite, con aviso; esta tarea no escribe el aviso, solo comprueba que `pagarHasta` no mueve una caja que ya está en negativo).

Crea `src/dominio/motor/caja.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import { cobrar, pagarHasta } from './caja'
import { crearContexto, type Contexto } from './contexto'
import { idsEnSerie } from './ids'
import { conAsentamiento, congelar, estadoMinimo } from './pruebas/constructores'

const HASTA: Fecha = { anio: 1640, mes: 4, dia: 19 }

/** Bree con 3 mo en la caja y la bolsa de Tharan en −0,6 mo por un gasto manual (§6.4: se permite con aviso). */
function contexto(): Contexto {
  const conBree = conAsentamiento(estadoMinimo(), { id: 'dom.bree', nombre: 'Bree', caja: 300000 })
  const estado = congelar({
    ...conBree,
    movimientos: [
      {
        id: 'mov.gasto',
        dominioId: 'dom.tharan',
        fecha: { anio: 1640, mes: 4, dia: 12 },
        tipo: 'gasto' as const,
        importe: { base: -60000 },
        categoriaId: CATEGORIA.otros,
        concepto: 'Gasto manual',
        origen: 'manual' as const,
        programado: false,
      },
    ],
  })
  return crearContexto(estado, HASTA, { avanceId: 'av.prueba', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() })
}

describe('cobrar', () => {
  it('suma el cobro al saldo vivo de su caja, también si estaba en negativo (§9, paso 8)', () => {
    const ctx = contexto()
    cobrar(ctx, 'dom.bree', 150000)
    cobrar(ctx, 'dom.tharan', 100000)
    expect(ctx.saldos.get('dom.bree')).toBe(450000)
    expect(ctx.saldos.get('dom.tharan')).toBe(40000)
  })
})

describe('pagarHasta', () => {
  it('paga entero si la caja llega y devuelve lo pagado', () => {
    const ctx = contexto()
    expect(pagarHasta(ctx, 'dom.bree', 180000)).toBe(180000)
    expect(ctx.saldos.get('dom.bree')).toBe(120000)
  })

  it('paga lo que hay y deja la caja en 0: el resto es impago (§9 l.1292)', () => {
    const ctx = contexto()
    expect(pagarHasta(ctx, 'dom.bree', 420000)).toBe(300000)
    expect(ctx.saldos.get('dom.bree')).toBe(0)
    const nada = pagarHasta(ctx, 'dom.bree', 60000)
    expect(Object.is(nada, 0)).toBe(true)
    expect(Object.is(ctx.saldos.get('dom.bree'), 0)).toBe(true)
  })

  it('con la caja en negativo no paga nada ni la mueve, y nunca da −0 (§9 l.1293)', () => {
    const ctx = contexto()
    const pagado = pagarHasta(ctx, 'dom.tharan', 10000)
    expect(Object.is(pagado, 0)).toBe(true)
    expect(ctx.saldos.get('dom.tharan')).toBe(-60000)
  })

  it('un dominio sin caja es un error de programación: lanza «No existe «…»»', () => {
    const ctx = contexto()
    expect(() => pagarHasta(ctx, 'dom.inventado', 1)).toThrow('No existe «dom.inventado»')
    expect(() => cobrar(ctx, 'dom.inventado', 1)).toThrow('No existe «dom.inventado»')
  })
})
```

- [ ] **Paso 6: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/caja.test.ts
```

Fallo esperado: `motor/caja.ts` todavía no existe. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/caja.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/caja.test.ts [ src/dominio/motor/caja.test.ts ]
Error: Cannot find module './caja' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/caja.test.ts
 ❯ src/dominio/motor/caja.test.ts:5:1
      3| import { CATEGORIA } from '../catalogo/inicial'
      4| import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
      5| import { cobrar, pagarHasta } from './caja'
       | ^
      6| import { crearContexto, type Contexto } from './contexto'
      7| import { idsEnSerie } from './ids'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:50:31
   Duration  998ms (worker 96%, environment 4%)
```

- [ ] **Paso 7: Implementar `motor/caja.ts`**

Crea `src/dominio/motor/caja.ts` con este contenido:

```ts
import type { Id } from '../modelo/comunes'
import type { Contexto } from './contexto'

/** El saldo vivo de una caja; una caja que no existe es un error de programación. */
function saldoDe(ctx: Contexto, dominioId: Id): number {
  const saldo = ctx.saldos.get(dominioId)
  if (saldo === undefined) {
    throw new Error(`No existe «${dominioId}»`)
  }
  return saldo
}

/** Suma un cobro al saldo vivo (§9, paso 8). */
export function cobrar(ctx: Contexto, dominioId: Id, importe: number): void {
  ctx.saldos.set(dominioId, saldoDe(ctx, dominioId) + importe)
}

/** Paga sin bajar de 0 (si ya está en negativo, nada) y devuelve lo pagado (§9 l.1292-1293). */
export function pagarHasta(ctx: Contexto, dominioId: Id, importe: number): number {
  const saldo = saldoDe(ctx, dominioId)
  // Math.max(0, …) devuelve +0 también cuando el mínimo es −0: lo pagado nunca es −0.
  const pagado = Math.max(0, Math.min(importe, saldo))
  ctx.saldos.set(dominioId, saldo - pagado)
  return pagado
}
```

`saldoDe` no está en la lista de exportaciones del contrato porque es un ayudante privado de este archivo: `cobrar` y `pagarHasta` son las dos únicas operaciones que otro módulo necesita.

- [ ] **Paso 8: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/caja.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  11:50:35
   Duration  1.43s (transform 61%, import 37%, tests 1%, worker 1%)
```

- [ ] **Paso 9: Escribir la prueba que falla de `impagos.ts`**

`impagos.test.ts` usa la partida de ejemplo hasta el 26 de julio (98 y 105 días desde el 12 de abril: las mismas cifras del oráculo «Impago natural» del apartado 4.1), con el tributo de Archet del 19/7 (falta 18,8 mo, contraparte `PERSONA.corona` ya existente) y los salarios del 26/7 (falta 3,2 mo, contraparte «Trabajadores de Archet», que todavía no existe).

Crea `src/dominio/motor/impagos.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM, IMPUESTO, PERSONA, RECURRENTE } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { EsquemaDeuda } from '../modelo/deudas'
import { estadoDe } from '../modelo/documento'
import { crearContexto, type Contexto } from './contexto'
import { idsEnSerie } from './ids'
import { personaPara, registrarImpago, sumarAlCargo, type Impago } from './impagos'
import { congelar } from './pruebas/constructores'

const HASTA: Fecha = { anio: 1640, mes: 7, dia: 26 }
const DIA_19_JULIO: Fecha = { anio: 1640, mes: 7, dia: 19 }
const DIA_26_JULIO: Fecha = { anio: 1640, mes: 7, dia: 26 }

/** El ejemplo del 12 de abril, congelado, con un avance hasta el 26 de julio. */
function contexto(): Contexto {
  const estado = congelar(estadoDe(documentoDeEjemplo()))
  return crearContexto(estado, HASTA, { avanceId: 'av.prueba', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() })
}

/** El tributo de Archet del 19 de julio que la caja no cubre: faltan 18,8 mo (apartado 4.1, impago natural). */
const TRIBUTO_19_JULIO: Impago = {
  origen: { tipo: 'tributo', id: IMPUESTO.tributoArchet },
  dominioId: DOM.archet,
  contraparte: 'Corona de Arthedain',
  fecha: DIA_19_JULIO,
  importe: 1880000,
}

/** Los salarios de Archet del 26 de julio, sin nada en la caja: 3,2 mo con «Trabajadores de Archet». */
const SALARIOS_26_JULIO: Impago = {
  origen: { tipo: 'salarios', id: DOM.archet },
  dominioId: DOM.archet,
  contraparte: 'Trabajadores de Archet',
  fecha: DIA_26_JULIO,
  importe: 320000,
}

describe('personaPara', () => {
  it('reutiliza la persona con el mismo nombre normalizado, sin crear ninguna (§9 l.1295)', () => {
    const ctx = contexto()
    expect(personaPara(ctx, '  corona de ARTHÉDAIN ')).toBe(PERSONA.corona)
    expect(ctx.personasNuevas).toEqual([])
    expect(ctx.personas).toHaveLength(6)
  })

  it('crea la que falta, la apunta en personasNuevas y la reutiliza después', () => {
    const ctx = contexto()
    const id = personaPara(ctx, 'Trabajadores de Archet')
    expect(id).toBe('sim.1')
    expect(ctx.personasNuevas).toEqual([{ id: 'sim.1', nombre: 'Trabajadores de Archet' }])
    expect(ctx.personas).toHaveLength(7)
    expect(personaPara(ctx, 'trabajadores de archet')).toBe('sim.1')
    expect(ctx.personasNuevas).toHaveLength(1)
  })
})

describe('registrarImpago', () => {
  it('crea la deuda de impago con los campos de T25 y la contraparte que ya existe', () => {
    const ctx = contexto()
    const cargo = registrarImpago(ctx, TRIBUTO_19_JULIO)
    expect(cargo).toEqual({ deudaId: 'sim.1', indice: 0 })
    const deuda = ctx.deudas[ctx.deudas.length - 1]
    expect(deuda).toEqual({
      id: 'sim.1',
      dominioId: DOM.archet,
      sentido: 'debo',
      contraparteId: PERSONA.corona,
      fecha: DIA_19_JULIO,
      principal: { base: 1880000 },
      interesPct: 0,
      estado: 'abierta',
      impago: true,
      origenImpago: { tipo: 'tributo', id: IMPUESTO.tributoArchet },
      cargos: [{ fecha: DIA_19_JULIO, importe: { base: 1880000 }, avanceId: 'av.prueba' }],
      pagos: [],
      devengos: [],
    })
    expect(EsquemaDeuda.safeParse(deuda).success).toBe(true)
    expect(ctx.personasNuevas).toEqual([])
  })

  it('crea la contraparte que falta, ya ajustada: «Trabajadores de Archet», «Todos (impago)» (§9 l.1295, D-023)', () => {
    const ctx = contexto()
    const cargo = registrarImpago(ctx, SALARIOS_26_JULIO)
    const deuda = ctx.deudas.find((d) => d.id === cargo.deudaId)
    expect(ctx.personasNuevas).toEqual([{ id: deuda?.contraparteId, nombre: 'Trabajadores de Archet' }])
    expect(deuda?.origenImpago).toEqual({ tipo: 'salarios', id: DOM.archet })
    expect(deuda?.principal).toEqual({ base: 320000 })
    registrarImpago(ctx, {
      origen: { tipo: 'recurrente', id: RECURRENTE.escolta },
      dominioId: DOM.tharan,
      contraparte: 'Todos',
      fecha: DIA_19_JULIO,
      importe: 50000,
    })
    expect(ctx.personasNuevas.map((p) => p.nombre)).toEqual(['Trabajadores de Archet', 'Todos (impago)'])
  })

  it('suma el cargo a la deuda abierta del mismo origen, y no a la de otro (§9 l.1296)', () => {
    const ctx = contexto()
    const primero = registrarImpago(ctx, TRIBUTO_19_JULIO)
    registrarImpago(ctx, SALARIOS_26_JULIO)
    const segundo = registrarImpago(ctx, { ...TRIBUTO_19_JULIO, fecha: DIA_26_JULIO, importe: 100000 })
    expect(segundo).toEqual({ deudaId: primero.deudaId, indice: 1 })
    const deImpago = ctx.deudas.filter((d) => d.impago)
    expect(deImpago).toHaveLength(2)
    const tributo = deImpago.find((d) => d.id === primero.deudaId)
    expect(tributo?.fecha).toEqual(DIA_19_JULIO)
    expect(tributo?.principal).toEqual({ base: 1980000 })
    expect(tributo?.cargos).toEqual([
      { fecha: DIA_19_JULIO, importe: { base: 1880000 }, avanceId: 'av.prueba' },
      { fecha: DIA_26_JULIO, importe: { base: 100000 }, avanceId: 'av.prueba' },
    ])
    expect(EsquemaDeuda.safeParse(tributo).success).toBe(true)
  })

  it('una deuda de impago saldada ya no recibe cargos: se abre otra', () => {
    const ctx = contexto()
    const vieja = registrarImpago(ctx, TRIBUTO_19_JULIO)
    const indice = ctx.deudas.findIndex((d) => d.id === vieja.deudaId)
    ctx.deudas[indice] = { ...ctx.deudas[indice], estado: 'saldada' }
    const nueva = registrarImpago(ctx, { ...TRIBUTO_19_JULIO, fecha: DIA_26_JULIO })
    expect(nueva.deudaId).not.toBe(vieja.deudaId)
    expect(nueva.indice).toBe(0)
    expect(ctx.deudas.filter((d) => d.impago)).toHaveLength(2)
  })
})

describe('sumarAlCargo', () => {
  it('suma al cargo que abrió un diario y al principal de su deuda (D-021)', () => {
    const ctx = contexto()
    registrarImpago(ctx, TRIBUTO_19_JULIO)
    const posada = registrarImpago(ctx, {
      origen: { tipo: 'recurrente', id: RECURRENTE.posada },
      dominioId: DOM.tharan,
      contraparte: 'Posada El Poney Pisador',
      fecha: DIA_19_JULIO,
      importe: 10000,
    })
    sumarAlCargo(ctx, posada, 10000)
    sumarAlCargo(ctx, posada, 10000)
    const deuda = ctx.deudas.find((d) => d.id === posada.deudaId)
    expect(deuda?.principal).toEqual({ base: 30000 })
    expect(deuda?.cargos).toEqual([{ fecha: DIA_19_JULIO, importe: { base: 30000 }, avanceId: 'av.prueba' }])
    expect(() => sumarAlCargo(ctx, { deudaId: 'deuda.inventada', indice: 0 }, 1)).toThrow('No existe «deuda.inventada»')
  })
})
```

- [ ] **Paso 10: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/impagos.test.ts
```

Fallo esperado: `motor/impagos.ts` todavía no existe. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/impagos.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/impagos.test.ts [ src/dominio/motor/impagos.test.ts ]
Error: Cannot find module './impagos' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/impagos.test.ts
 ❯ src/dominio/motor/impagos.test.ts:9:1
      7| import { crearContexto, type Contexto } from './contexto'
      8| import { idsEnSerie } from './ids'
      9| import { personaPara, registrarImpago, sumarAlCargo, type Impago } fro…
       | ^
     10| import { congelar } from './pruebas/constructores'
     11|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:50:43
   Duration  1.45s (worker 97%, environment 3%)
```

- [ ] **Paso 11: Implementar `motor/impagos.ts`**

Crea `src/dominio/motor/impagos.ts` con este contenido:

```ts
import type { Fecha } from '../calendario/fecha'
import type { Id } from '../modelo/comunes'
import type { CargoImpago, Deuda, OrigenImpago } from '../modelo/deudas'
import { mismoNombre } from '../texto/normalizar'
import type { CargoAbierto, Contexto } from './contexto'
import { nombreDeContraparte } from './textos'

/** Un impago que hay que anotar (§9 l.1291-1296). */
export interface Impago {
  origen: OrigenImpago
  /** La caja que no llegó (la cuentaId en un gasto de J5). */
  dominioId: Id
  /** Nombre sin ajustar: registrarImpago le pasa nombreDeContraparte. */
  contraparte: string
  fecha: Fecha
  /** Lo que faltó, en mh; mayor que 0. */
  importe: number
}

/**
 * Reutiliza la persona con el mismo nombre normalizado o la crea y la apunta en personasNuevas (§9 l.1295).
 * Solo se llama cuando hay un impago, así que buscar en la lista no pesa en el bucle.
 */
export function personaPara(ctx: Contexto, nombre: string): Id {
  const existente = ctx.personas.find((p) => mismoNombre(p.nombre, nombre))
  if (existente !== undefined) {
    return existente.id
  }
  const persona = { id: ctx.opciones.nuevoId(), nombre }
  ctx.personas.push(persona)
  ctx.personasNuevas.push(persona)
  return persona.id
}

/** Si una deuda es la de impago abierta de ese origen: solo hay una por origen (unicidades.ts). */
function esAbiertaDe(deuda: Deuda, origen: OrigenImpago): boolean {
  return (
    deuda.impago &&
    deuda.estado !== 'saldada' &&
    deuda.origenImpago?.tipo === origen.tipo &&
    deuda.origenImpago.id === origen.id
  )
}

/** Suma un cargo a la deuda de impago abierta de ese origen o la crea (§9 l.1296, T25); devuelve dónde quedó. */
export function registrarImpago(ctx: Contexto, impago: Impago): CargoAbierto {
  const cargo: CargoImpago = {
    fecha: { ...impago.fecha },
    importe: { base: impago.importe },
    avanceId: ctx.opciones.avanceId,
  }
  const indice = ctx.deudas.findIndex((d) => esAbiertaDe(d, impago.origen))
  if (indice >= 0) {
    const abierta = ctx.deudas[indice]
    const cargos = [...(abierta.cargos ?? []), cargo]
    // El principal de una deuda de impago es la suma de sus cargos, sin «introducido» (T25).
    ctx.deudas[indice] = { ...abierta, principal: { base: abierta.principal.base + impago.importe }, cargos }
    return { deudaId: abierta.id, indice: cargos.length - 1 }
  }
  const contraparteId = personaPara(ctx, nombreDeContraparte(impago.contraparte))
  const deuda: Deuda = {
    id: ctx.opciones.nuevoId(),
    dominioId: impago.dominioId,
    sentido: 'debo',
    contraparteId,
    fecha: { ...impago.fecha },
    principal: { base: impago.importe },
    interesPct: 0,
    estado: 'abierta',
    impago: true,
    origenImpago: { ...impago.origen },
    cargos: [cargo],
    pagos: [],
    devengos: [],
  }
  ctx.deudas.push(deuda)
  return { deudaId: deuda.id, indice: 0 }
}

/** Suma más impago a un cargo ya abierto en este avance y al principal de su deuda (D-021). */
export function sumarAlCargo(ctx: Contexto, cargo: CargoAbierto, importe: number): void {
  const indice = ctx.deudas.findIndex((d) => d.id === cargo.deudaId)
  const deuda = ctx.deudas[indice]
  const cargos = deuda?.cargos ?? []
  if (deuda === undefined || cargos[cargo.indice] === undefined) {
    throw new Error(`No existe «${cargo.deudaId}»`)
  }
  ctx.deudas[indice] = {
    ...deuda,
    principal: { base: deuda.principal.base + importe },
    cargos: cargos.map((c, i) => (i === cargo.indice ? { ...c, importe: { base: c.importe.base + importe } } : c)),
  }
}
```

Notas sobre el cuerpo:

1. `personaPara` recibe el nombre **ya ajustado** por `nombreDeContraparte` (tarea 11): `registrarImpago` es quien llama a las dos en cadena, así que un aviso de la tarea 20 que necesite reutilizar la misma persona también le pasa el nombre ya ajustado, y las dos rutas acaban comparando lo mismo.
2. `esAbiertaDe` mira `deuda.impago` antes que nada: una deuda normal (`impago: false`) nunca entra en esta búsqueda, aunque por azar coincidiera su `origenImpago` (que en una deuda normal no existe).
3. El principal de una deuda de impago se recalcula sumando `impago.importe`, no volviendo a sumar los `cargos`: así `registrarImpago` y `sumarAlCargo` hacen el mismo cálculo con la misma forma, y una deuda con muchos cargos no fuerza un `reduce` en cada llamada.
4. `sumarAlCargo` no llama a `personaPara` ni cambia `origenImpago`: solo toca `principal` y el cargo señalado por `cargo.indice`, que ya existe porque lo abrió `registrarImpago` en el mismo avance.

- [ ] **Paso 12: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/impagos.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  11:50:49
   Duration  1.05s (transform 60%, import 36%, tests 4%, worker 1%)
```

- [ ] **Paso 13: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0; `npm test` termina con **700 pruebas en 59 archivos**. La tarea 12 dejó 678 pruebas en 56 archivos, y esta trae **22 nuevas**: las 7 de `contexto.test.ts`, las 5 de `caja.test.ts`, las 7 de `impagos.test.ts` y **3 más** en `pureza.test.ts`, que ahora recorre también `motor/contexto.ts`, `motor/caja.ts` y `motor/impagos.ts`.

```text
 Test Files  59 passed (59)
      Tests  700 passed (700)
```

Si el número que ves no es 700, sigue con **el tuyo**: lo que esta tarea garantiza es **+22 pruebas y +3 archivos** sobre lo que dejó la tarea 12.

- [ ] **Paso 14: Commit**

```bash
git add src/dominio/motor/contexto.ts src/dominio/motor/contexto.test.ts src/dominio/motor/caja.ts src/dominio/motor/caja.test.ts src/dominio/motor/impagos.ts src/dominio/motor/impagos.test.ts
git commit -m "feat(motor): contexto de la simulación, caja que no baja de 0 e impagos" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/motor/caja.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/caja.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/contexto.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/contexto.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/impagos.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/impagos.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 03b7b63] feat(motor): contexto de la simulación, caja que no baja de 0 e impagos
 6 files changed, 716 insertions(+)
 create mode 100644 src/dominio/motor/caja.test.ts
 create mode 100644 src/dominio/motor/caja.ts
 create mode 100644 src/dominio/motor/contexto.test.ts
 create mode 100644 src/dominio/motor/contexto.ts
 create mode 100644 src/dominio/motor/impagos.test.ts
 create mode 100644 src/dominio/motor/impagos.ts
```

**Avisos que esta tarea deja escritos:**

1. `Contexto.diarios` y `Contexto.cargosDiarios` ya están en la forma del `Contexto` (vacíos, `new Map()`), pero **ningún** código de esta tarea los llena ni los lee: son de la tarea 14. Se declaran aquí porque `Contexto` es un solo tipo y no tiene sentido partirlo en dos interfaces que las tareas 13 y 14 extiendan por separado.
2. `estadoFinal` no incluye `ctx.saldos` en el `EstadoPartida`: el saldo de una caja nunca se guarda, siempre se deriva de `saldosPorDominio(movimientos)` (fase 1). Quien necesite el saldo final después de `estadoFinal` vuelve a llamar a `saldosPorDominio`, o lee `ctx.saldos` directamente si todavía tiene el contexto a mano (como hace la tarea 28 para comprobar el invariante `saldosDespues`).
3. `registrarImpago` y `sumarAlCargo` no llaman nunca a `pagarHasta`: quien decide cuánto se pagó y cuánto quedó como impago es cada paso (tarea 17), que primero llama a `pagarHasta` y, con lo que sobra, a `registrarImpago` o a `sumarAlCargo` según si ese cargo del avance ya estaba abierto.
4. `origenImpago` de una deuda de impago no se puede editar ni borrar desde `impagos.ts`: si el recurrente o el tributo que la originó se elimina más adelante (tarea 25), la deuda conserva su `origenImpago` apuntando a un id que ya no existe, y es una comprobación de la tarea 6 (fase ya cerrada) la que decide que eso es válido.

---

### Tarea 14 · Conceptos diarios

La última pieza que le falta al `Contexto` antes de escribir un paso de verdad: cómo se agrupan los gastos y los ingresos de una regla «Cada día» en un solo movimiento por avance (§9 l.1285). Un cobro o un pago diario no crea su movimiento el mismo día que ocurre —eso multiplicaría un avance de 366 días en 366 movimientos de «0,1 mo»—; en vez de eso, cada paso que toca una regla diaria llama a `acumularDiario` día a día, y al terminar todo el recorrido, `cerrarDiarios` (tarea 19, dentro del bucle) convierte cada acumulado en un único movimiento, fechado el último día.

`acumularDiario` y `cerrarDiarios` no saben nada de impuestos, salarios ni posadas: reciben ya calculado cuánto se cobró o se pagó ese día concreto (`EntradaDiaria.importe`) y a qué regla pertenece, y dejan que `motor/textos.ts` (tarea 11) arme el concepto final según la clase (`conceptoDiario`, `conceptoSalarios` o `conceptoSoldadas`). Esto es lo que permite que la tarea 17 (pagos) y la tarea 15 (cobros) compartan el mismo módulo de agrupación sin duplicar la lógica de «un movimiento por concepto y avance».

Depende de la tarea 11 (`conceptoDiario`, `conceptoSalarios`, `conceptoSoldadas`) y de la tarea 13 (`Contexto`, `AcumuladoDiario` y `anadirMovimiento`).

**Reglas de la especificación que implementa:**

- **Agrupación diaria (§9 l.1285).** «Los conceptos diarios forman un movimiento por concepto y avance, fechado el último día («Posada · 7 noches −0,7 mo»).» `cerrarDiarios` recorre `ctx.diarios` y crea un movimiento por cada acumulado, con `fecha: ctx.hasta`.
- **Salarios y soldadas «Cada día» (§9 l.1287, D-029).** «Los salarios y las soldadas que se pagan «Cada día» van en un solo movimiento por avance, como los demás gastos diarios.» `AcumuladoDiario.clase` distingue `'regla'` de `'salarios'`/`'soldadas'` porque estas dos arman su concepto contando trabajadores (`conceptoSalarios`) en vez de repetir el de la regla; el resto del acumulado (importe, días, detalle) se trata igual.
- **Días sin dinero no cuentan (D-021).** «En un gasto diario con impago, «· 7 noches» cuenta solo los días que se pagaron.» `acumularDiario` descarta cualquier entrada con `importe <= 0` antes de sumar nada: ni suma al importe ni cuenta el día.
- **Importe a 0 no crea movimiento (D-022).** «Un cobro o un pago automático que sale a 0 (…) no crea movimiento. Es lo que la especificación ya hace con los locales: «si ningún local paga, no hay movimiento».» `cerrarDiarios` se salta cualquier acumulado con `importe <= 0`: si todas sus entradas dieron 0 (o no llegó ninguna), el acumulado nunca se creó o se quedó en 0 y no genera movimiento.
- **Sin lo tecleado (§9 l.1285, D-022, D-029).** Un movimiento diario suma varios días y, con salarios o soldadas, varias filas: no hay un único «lo que tecleaste» que pegarle, así que `cerrarDiarios` nunca pasa `introducido` (técnica 8, T8; lo comprueba `EsquemaMovimiento` al validar la copia).
- **Detalle por fila de trabajo (§6.3 l.579).** `EntradaDiaria.fila` (un `DetalleTrabajo`) se va sumando por `origenId` en `acumulado.detalle`: es lo mismo que consulta `nombreDeOficio` (tarea 11) para poner «Pastor», «Pastores»… en el detalle del movimiento cerrado.

**Archivos:**
- Crear: `src/dominio/motor/diarios.ts`
- Prueba: `src/dominio/motor/diarios.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La prueba monta su contexto con `estadoMinimo`/`conAsentamiento` (tarea 10) y comprueba, en orden: siete días de posada seguidos («· 7 noches», −70.000, fechado el 19); una regla que solo tiene entradas en los tres últimos días («· 3 días»); días sin dinero en medio que no cuentan ni suman; salarios diarios con el detalle por fila y el total de trabajadores distintos; soldadas diarias con su detalle; el orden de cierre (el orden en que se abrió cada acumulado) y el `inversionId` de un beneficio diario; y que sin nada que acumular, o con todo a 0, no se crea ningún movimiento.

Crea `src/dominio/motor/diarios.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { catalogosDeEjemplo } from '../ejemplo/sombraDelEste'
import { EsquemaMovimiento } from '../modelo/movimientos'
import { crearContexto, type Contexto } from './contexto'
import { acumularDiario, cerrarDiarios, type EntradaDiaria } from './diarios'
import { idsEnSerie } from './ids'
import { conAsentamiento, congelar, estadoMinimo } from './pruebas/constructores'

/** El 19 de abril de 1640: el último día del avance de P4, que se simula del 13 al 19. */
const HASTA: Fecha = { anio: 1640, mes: 4, dia: 19 }

/** El día `dia` de abril de 1640. */
function abril(dia: number): Fecha {
  return { anio: 1640, mes: 4, dia }
}

/** Tharan y Bree, sin reglas: los diarios reciben lo cobrado o pagado ya calculado por los pasos. */
function contexto(): Contexto {
  const estado = congelar(conAsentamiento(estadoMinimo(), { id: 'dom.bree', nombre: 'Bree', caja: 5000000 }))
  return crearContexto(estado, HASTA, { avanceId: 'av.prueba', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() })
}

/** Lo que paga un día la posada de Tharan (0,1 mo por noche). */
function posada(dia: number, importe = 10000): EntradaDiaria {
  return {
    clase: 'regla',
    regla: { tipo: 'recurrente', id: 'rec.posada' },
    dominioId: 'dom.tharan',
    tipo: 'gasto',
    categoriaId: 'cat.alojamiento',
    concepto: 'Posada El Poney Pisador',
    unidadDiaria: 'noches',
    fecha: abril(dia),
    importe,
  }
}

/** Lo que cobra un día el peaje de Bree (0,3 mo). */
function peaje(dia: number): EntradaDiaria {
  return {
    clase: 'regla',
    regla: { tipo: 'impuesto', id: 'imp.peaje' },
    dominioId: 'dom.bree',
    tipo: 'ingreso',
    categoriaId: CATEGORIA.impuestos,
    concepto: 'Peaje del camino',
    fecha: abril(dia),
    importe: 30000,
  }
}

/** Lo pagado un día a una fila de trabajadores diarios de Bree. */
function salario(dia: number, origenId: string, nombre: string, numero: number, importe: number): EntradaDiaria {
  return {
    clase: 'salarios',
    regla: { tipo: 'salarios', id: 'dom.bree' },
    dominioId: 'dom.bree',
    tipo: 'gasto',
    categoriaId: CATEGORIA.salarios,
    concepto: '',
    fecha: abril(dia),
    importe,
    fila: { origenId, nombre, numero, importe: { base: importe } },
  }
}

describe('acumularDiario y cerrarDiarios', () => {
  it('siete noches de posada dan «· 7 noches» por −70.000, fechado el último día y sin introducido (§9 l.1285)', () => {
    const ctx = contexto()
    for (let dia = 13; dia <= 19; dia++) {
      acumularDiario(ctx, posada(dia))
    }
    expect(ctx.movimientos).toHaveLength(0)
    cerrarDiarios(ctx)
    expect(ctx.movimientos).toEqual([
      {
        id: 'sim.1',
        dominioId: 'dom.tharan',
        fecha: HASTA,
        tipo: 'gasto',
        importe: { base: -70000 },
        categoriaId: 'cat.alojamiento',
        concepto: 'Posada El Poney Pisador · 7 noches',
        regla: { tipo: 'recurrente', id: 'rec.posada' },
        origen: 'avance',
        avanceId: 'av.prueba',
        programado: false,
      },
    ])
    expect(EsquemaMovimiento.safeParse(ctx.movimientos[0]).success).toBe(true)
    expect(Object.fromEntries(ctx.saldos)).toEqual(ctx.saldosAntes)
  })

  it('una regla que empieza a mitad del avance cuenta solo sus días: «Peaje del camino · 3 días»', () => {
    const ctx = contexto()
    for (let dia = 17; dia <= 19; dia++) {
      acumularDiario(ctx, peaje(dia))
    }
    cerrarDiarios(ctx)
    expect(ctx.movimientos).toHaveLength(1)
    expect(ctx.movimientos[0].concepto).toBe('Peaje del camino · 3 días')
    expect(ctx.movimientos[0].importe).toEqual({ base: 90000 })
    expect(ctx.movimientos[0].tipo).toBe('ingreso')
  })

  it('los días sin dinero no cuentan ni suman: «· 5 noches» por −50.000 (D-021)', () => {
    const ctx = contexto()
    for (const dia of [13, 14, 15, 18, 19]) {
      acumularDiario(ctx, posada(dia))
    }
    acumularDiario(ctx, posada(16, 0))
    acumularDiario(ctx, posada(17, 0))
    cerrarDiarios(ctx)
    expect(ctx.movimientos.map((m) => [m.concepto, m.importe.base])).toEqual([
      ['Posada El Poney Pisador · 5 noches', -50000],
    ])
  })

  it('salarios diarios: cada día cuenta una vez aunque paguen varias filas, con el detalle por fila (D-029)', () => {
    const ctx = contexto()
    for (let dia = 13; dia <= 19; dia++) {
      acumularDiario(ctx, salario(dia, 'trab.pastores', 'Pastores', 3, 30000))
      if (dia < 19) {
        acumularDiario(ctx, salario(dia, 'trab.granjeros', 'Granjeros', 2, 20000))
      }
    }
    cerrarDiarios(ctx)
    expect(ctx.movimientos).toHaveLength(1)
    const [movimiento] = ctx.movimientos
    expect(movimiento.concepto).toBe('Salarios de 5 trabajadores · 7 días')
    expect(movimiento.importe).toEqual({ base: -(7 * 30000 + 6 * 20000) })
    expect(movimiento.regla).toEqual({ tipo: 'salarios', id: 'dom.bree' })
    expect(movimiento.categoriaId).toBe(CATEGORIA.salarios)
    expect(movimiento.detalleTrabajo).toEqual([
      { origenId: 'trab.pastores', nombre: 'Pastores', numero: 3, importe: { base: 210000 } },
      { origenId: 'trab.granjeros', nombre: 'Granjeros', numero: 2, importe: { base: 120000 } },
    ])
    expect(EsquemaMovimiento.safeParse(movimiento).success).toBe(true)
  })

  it('soldadas diarias: «Soldada de la guarnición · 2 días» con su detalle', () => {
    const ctx = contexto()
    for (const dia of [18, 19]) {
      acumularDiario(ctx, {
        clase: 'soldadas',
        regla: { tipo: 'soldadas', id: 'dom.bree' },
        dominioId: 'dom.bree',
        tipo: 'gasto',
        categoriaId: CATEGORIA.soldadas,
        concepto: '',
        fecha: abril(dia),
        importe: 40000,
        fila: { origenId: 'unidad.guardias', nombre: 'Guardias de la puerta', numero: 4, importe: { base: 40000 } },
      })
    }
    cerrarDiarios(ctx)
    expect(ctx.movimientos[0].concepto).toBe('Soldada de la guarnición · 2 días')
    expect(ctx.movimientos[0].detalleTrabajo).toEqual([
      { origenId: 'unidad.guardias', nombre: 'Guardias de la puerta', numero: 4, importe: { base: 80000 } },
    ])
    expect(EsquemaMovimiento.safeParse(ctx.movimientos[0]).success).toBe(true)
  })

  it('cierra en el orden en que se abrieron, y un beneficio diario lleva su inversionId (T10)', () => {
    const ctx = contexto()
    for (let dia = 13; dia <= 14; dia++) {
      acumularDiario(ctx, {
        clase: 'regla',
        regla: { tipo: 'beneficio', id: 'inv.barcaza' },
        dominioId: 'dom.tharan',
        tipo: 'ingreso',
        categoriaId: CATEGORIA.beneficiosDeInversiones,
        concepto: 'Beneficio de Barcaza del Brandivino',
        inversionId: 'inv.barcaza',
        fecha: abril(dia),
        importe: 5000,
      })
      acumularDiario(ctx, posada(dia))
    }
    cerrarDiarios(ctx)
    expect(ctx.movimientos.map((m) => m.concepto)).toEqual([
      'Beneficio de Barcaza del Brandivino · 2 días',
      'Posada El Poney Pisador · 2 noches',
    ])
    expect(ctx.movimientos[0].inversionId).toBe('inv.barcaza')
    expect('inversionId' in ctx.movimientos[1]).toBe(false)
    expect(EsquemaMovimiento.safeParse(ctx.movimientos[0]).success).toBe(true)
  })

  it('sin nada que acumular, o con todo a 0, no crea ningún movimiento (D-022)', () => {
    const vacio = contexto()
    cerrarDiarios(vacio)
    expect(vacio.movimientos).toEqual([])
    const aCero = contexto()
    acumularDiario(aCero, posada(13, 0))
    cerrarDiarios(aCero)
    expect(aCero.movimientos).toEqual([])
    expect(aCero.diarios.size).toBe(0)
  })
})
```

Son **siete pruebas**, la última con dos comprobaciones (sin nada, y con importe 0).

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/diarios.test.ts
```

Fallo esperado: `motor/diarios.ts` todavía no existe. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/diarios.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/diarios.test.ts [ src/dominio/motor/diarios.test.ts ]
Error: Cannot find module './diarios' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/diarios.test.ts
 ❯ src/dominio/motor/diarios.test.ts:7:1
      5| import { EsquemaMovimiento } from '../modelo/movimientos'
      6| import { crearContexto, type Contexto } from './contexto'
      7| import { acumularDiario, cerrarDiarios, type EntradaDiaria } from './d…
       | ^
      8| import { idsEnSerie } from './ids'
      9| import { conAsentamiento, congelar, estadoMinimo } from './pruebas/con…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:51:20
   Duration  941ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `motor/diarios.ts`**

Crea `src/dominio/motor/diarios.ts` con este contenido:

```ts
import { aNumeroDeDia, type Fecha } from '../calendario/fecha'
import type { Id } from '../modelo/comunes'
import type { DetalleTrabajo, ReglaOrigen } from '../modelo/movimientos'
import { anadirMovimiento, type AcumuladoDiario, type Contexto } from './contexto'
import { conceptoDiario, conceptoSalarios, conceptoSoldadas } from './textos'

/** Lo cobrado o pagado un día por una regla «Cada día» (§9 l.1285). */
export interface EntradaDiaria {
  clase: AcumuladoDiario['clase']
  regla: ReglaOrigen
  dominioId: Id
  tipo: 'gasto' | 'ingreso'
  categoriaId: Id
  concepto: string
  unidadDiaria?: string
  inversionId?: Id
  /** El día del cobro o del pago: varias filas de salarios del mismo día cuentan un solo día. */
  fecha: Fecha
  /** Lo cobrado o pagado de verdad ese día, en mh; con 0 no cuenta. */
  importe: number
  /** Salarios y soldadas: la fila con lo pagado ese día. */
  fila?: DetalleTrabajo
}

/** Suma el día a su acumulado (clave `${regla.tipo}|${regla.id}`) y cuenta el día (§9 l.1285, D-021). */
export function acumularDiario(ctx: Contexto, entrada: EntradaDiaria): void {
  // Un día sin dinero no suma ni cuenta: «· 7 noches» cuenta solo los días que se pagaron (D-021).
  if (entrada.importe <= 0) {
    return
  }
  const clave = `${entrada.regla.tipo}|${entrada.regla.id}`
  let acumulado = ctx.diarios.get(clave)
  if (acumulado === undefined) {
    acumulado = {
      clase: entrada.clase,
      regla: { ...entrada.regla },
      dominioId: entrada.dominioId,
      tipo: entrada.tipo,
      categoriaId: entrada.categoriaId,
      concepto: entrada.concepto,
      unidadDiaria: entrada.unidadDiaria,
      inversionId: entrada.inversionId,
      importe: 0,
      dias: 0,
      ultimoDia: Number.NEGATIVE_INFINITY,
      detalle: new Map(),
    }
    ctx.diarios.set(clave, acumulado)
  }
  acumulado.importe += entrada.importe
  const numero = aNumeroDeDia(entrada.fecha)
  if (numero !== acumulado.ultimoDia) {
    acumulado.dias += 1
    acumulado.ultimoDia = numero
  }
  const fila = entrada.fila
  if (fila !== undefined) {
    const claveFila = fila.origenId ?? fila.nombre
    const anterior = acumulado.detalle.get(claveFila)
    const base = (anterior?.importe.base ?? 0) + fila.importe.base
    acumulado.detalle.set(claveFila, { ...(anterior ?? fila), importe: { base } })
  }
}

/** El concepto del movimiento de un acumulado: «· 7 noches», «Salarios de 5 trabajadores · 7 días»… (D-029, D-030). */
function conceptoDe(acumulado: AcumuladoDiario, detalle: readonly DetalleTrabajo[]): string {
  switch (acumulado.clase) {
    case 'regla':
      return conceptoDiario(acumulado.concepto, acumulado.dias, acumulado.unidadDiaria)
    case 'salarios':
      return conceptoSalarios(detalle.reduce((total, fila) => total + fila.numero, 0), acumulado.dias)
    case 'soldadas':
      return conceptoSoldadas(acumulado.dias)
  }
}

/** Un movimiento por acumulado con importe > 0, fechado el último día, sin introducido (§9 l.1285, D-022, D-029). */
export function cerrarDiarios(ctx: Contexto): void {
  for (const acumulado of ctx.diarios.values()) {
    if (acumulado.importe <= 0) {
      continue
    }
    const detalle = [...acumulado.detalle.values()]
    anadirMovimiento(ctx, {
      dominioId: acumulado.dominioId,
      fecha: { ...ctx.hasta },
      tipo: acumulado.tipo,
      importe: { base: acumulado.tipo === 'gasto' ? -acumulado.importe : acumulado.importe },
      categoriaId: acumulado.categoriaId,
      concepto: conceptoDe(acumulado, detalle),
      regla: acumulado.regla,
      inversionId: acumulado.inversionId,
      detalleTrabajo: detalle.length > 0 ? detalle : undefined,
    })
  }
}
```

Notas sobre el cuerpo:

1. La clave del acumulado es `${regla.tipo}|${regla.id}`, no solo `regla.id`: un impuesto y un recurrente pueden compartir id en teoría (son colecciones distintas del modelo), y separar por `regla.tipo` evita que dos reglas de naturaleza distinta se mezclen en un mismo acumulado.
2. `acumulado.ultimoDia` empieza en `Number.NEGATIVE_INFINITY` para que el primer día siempre cuente como nuevo, sin necesitar un `dias === 0 ? … : …` aparte; comparar por `aNumeroDeDia` (no por el objeto `Fecha`) es la regla general del motor (aviso 8 del contrato): nunca `===` entre fechas.
3. `acumulado.detalle` es un `Map` por `origenId` (o por `nombre` si la fila no tiene `origenId`, que es lo que pasa cuando el trabajador ya no está en la lista de trabajadores): así varias entradas del mismo día y de días distintos para la misma fila se suman en una sola línea del detalle, en el orden en que se vieron por primera vez.
4. `conceptoDe` es un `switch` exhaustivo sobre `AcumuladoDiario['clase']`: si algún día se añadiera una cuarta clase, `npx tsc -b` fallaría aquí con «Function lacks ending return statement», antes que en cualquier prueba.
5. `cerrarDiarios` pasa `detalleTrabajo: detalle.length > 0 ? detalle : undefined`, nunca un array vacío: una regla `'regla'` (un impuesto o un recurrente diario) no lleva detalle, y `EsquemaMovimiento` (fase 2) declara esa clave opcional, no una lista que pueda estar vacía.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/diarios.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  11:51:24
   Duration  1.94s (transform 60%, import 37%, tests 3%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo escribe su cabecera y sale con código 0; `npm test` termina con **708 pruebas en 60 archivos**. La tarea 13 dejó 700 pruebas en 59 archivos, y esta trae **8 nuevas**: las 7 de `diarios.test.ts` y **una más** en `pureza.test.ts`, que ahora recorre también `motor/diarios.ts`.

```text
 Test Files  60 passed (60)
      Tests  708 passed (708)
```

Si el número que ves no es 708, sigue con **el tuyo**: lo que esta tarea garantiza es **+8 pruebas y +1 archivo** sobre lo que dejó la tarea 13.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/diarios.ts src/dominio/motor/diarios.test.ts
git commit -m "feat(motor): conceptos diarios acumulados y cerrados el último día del avance" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía; puede salir el aviso inofensivo `LF will be replaced by CRLF` por cada archivo). `git status --short` no muestra nada:

```text
[implementacion/fase-3 06df696] feat(motor): conceptos diarios acumulados y cerrados el último día del avance
 2 files changed, 298 insertions(+)
 create mode 100644 src/dominio/motor/diarios.test.ts
 create mode 100644 src/dominio/motor/diarios.ts
```

**Avisos que esta tarea deja escritos:**

1. `acumularDiario` y `cerrarDiarios` **no** se llaman entre sí desde ningún otro punto de este módulo: el paso que corresponda (cobros en la tarea 15, pagos en la tarea 17) llama a `acumularDiario` una vez por regla diaria y por día, y el bucle (tarea 19) llama a `cerrarDiarios` **una sola vez**, al final del recorrido completo, no al final de cada día.
2. Un pago diario que solo se cubre a medias (la caja no llega) no pasa por `acumularDiario` con el importe pedido, sino con **lo que de verdad se pagó** (`pagarHasta`, tarea 13): la tarea 17 es quien decide cuánto de un día diario se acumula aquí y cuánto se registra como impago con `sumarAlCargo` (tarea 13), y los dos importes de un mismo día diario pueden no coincidir sin que este módulo lo sepa.
3. `ctx.cargosDiarios` (declarado en la tarea 13, con la clave `${regla.tipo}|${regla.id}`, igual que `ctx.diarios`) sigue sin usarse después de esta tarea: es la tarea 17 quien lo llena, para saber si el impago de una regla diaria ya abrió un cargo este avance o hay que abrir uno con `registrarImpago`.

---

### Tarea 15 · Paso 8: cobros

El paso 8 del motor (§9 l.1280), sin los impuestos de locales, que trae su propio módulo y su hueco aquí en la tarea 16. En el orden de la especificación: impuestos y rentas de ingreso (fijos o por habitante, con los eventos del día), beneficios de las inversiones activas, ingresos recurrentes de J5 y cobros programados sin vínculo. Cada regla que cobra «Cada día» va al acumulado del avance (`acumularDiario`, tarea 14) en vez de crear un movimiento ese mismo día; las demás crean su movimiento con `anadirMovimiento` (tarea 13).

Usa `habitantesDe` y `conEfecto`/`pctDeIngresos` (tarea 7) para los impuestos por habitante y los eventos; `cobrar`, `anadirMovimiento`, `aplicarProgramado` y `Contexto`/`Dia` (tarea 13); `acumularDiario` (tarea 14); y `conceptoBeneficio` (tarea 11). Dos piezas de `cobros.ts` las reutiliza directamente la tarea 17:

- `programadosDelDia(ctx, dia, tipo)`: los movimientos programados de un tipo (`'gasto'` o `'ingreso'`) que tocan ese día, ya en el orden del libro. El índice del contexto (`programadosPorDia`, tarea 13) deja fuera los que llevan vínculo (esperan a la fase 4, técnica 19) y adelanta al primer día del avance los de fecha ya pasada (técnica 14). La usan `cobrarProgramados` aquí y `pagarProgramados` en la tarea 17.
- `ingresoDe(importe, origen, exacto)`: el `Importe` de un cobro con lo tecleado de su origen (`introducido`) solo si el importe final es exactamente la base de ese origen (técnica 8, T8): con eventos, por habitante o pagado a medias, `introducido` se queda vacío.

**Reglas de la especificación que implementa:**

- **Orden del paso 8 (§9 l.1280).** «8. Cobros: impuestos, rentas, impuestos de locales, beneficios, ingresos recurrentes y cobros programados.» Esta tarea deja los locales para la 16: `pasoCobros` cobra impuestos y rentas, después beneficios, ingresos recurrentes y programados, en ese orden (técnica 10).
- **Efectos de eventos (§7 l.1139).** «El consumo, los costes y los ingresos afectados = base × máx(0, 1 + suma de los % de los eventos activos sobre ese objetivo).» Con `conEfecto` y `pctDeIngresos` de la tarea 7.
- **Cobro a 0 no crea movimiento (D-022).** «Un cobro o un pago automático que sale a 0 (por un evento de −100 % o un impuesto por habitante sin habitantes) no crea movimiento.»
- **Beneficios e ingresos recurrentes sin eventos (D-026).** «Los pagos programados, los beneficios de inversiones y los ingresos recurrentes del personaje nunca cambian con un evento.»
- **Ingresos recurrentes en el paso de cobros (§7 l.1200).** «Los ingresos recurrentes se cobran en el paso de cobros.»
- **Agrupación diaria (§9 l.1285).** «Los conceptos diarios forman un movimiento por concepto y avance, fechado el último día.» Aquí solo se acumulan (`acumularDiario`); `cerrarDiarios` (tarea 14) crea el movimiento al terminar el bucle (tarea 19).
- **Lo introducido (§3 l.141; técnica 8).** «Es opcional: queda vacío en los importes calculados o agrupados (…) e impuestos por habitante.» Un beneficio siempre cobra su base exacta, así que siempre lleva lo tecleado (`ingresoDe(importe, inversion.beneficio, true)`); un impuesto o una renta solo si es de base fija y el evento no lo ha tocado.
- **Programados con fecha pasada (técnica 14).** «Si llega uno al motor (…), se aplica el primer día del avance.» Lo resuelve el índice `programadosPorDia` de la tarea 13; `programadosDelDia` solo lo recorre.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/motor/pasos/cobros.ts`
- Prueba: `src/dominio/motor/pasos/cobros.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La carpeta `src/dominio/motor/pasos/` es nueva. Qué comprueba cada bloque:
- `impuestos y rentas`: el impuesto por hogar por habitante (1.000 × 1.240 el 1 de mayo); los aranceles del 15 de abril con la feria (+500 %) cobran 1.800.000 sin lo tecleado; sin evento, el 22 de abril, cobran su base con «3 mo»; un evento de −100 % dejando el impuesto en 0 no crea movimiento ni entrada en el diario (D-022); un impuesto «Cada día» (el peaje) se acumula y no crea movimiento ese día.
- `beneficios e ingresos recurrentes`: el beneficio de la Barcaza del 15 de abril con su regla, su `inversionId` y «1,5 mo»; un ingreso de J5 activo entra en su `cuentaId` aunque la regla sea del personaje; uno en pausa no cobra.
- `cobros programados`: el del día entra entero y se aplica con el `avanceId`, sin tocar su id, su origen ni su importe; uno con fecha ya pasada se aplica el primer día, y el pago programado del mismo estado se queda para el paso 9 (tarea 17).
- `el orden de §9 l.1280`: con una partida mínima y un asentamiento, un impuesto, un beneficio, un ingreso recurrente y un programado que ocurren el mismo día crean los movimientos nuevos en ese orden y aplican el programado en su sitio del libro.

Crea `src/dominio/motor/pasos/cobros.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, compararFechas, type Fecha } from '../../calendario/fecha'
import { CATEGORIA } from '../../catalogo/inicial'
import { eventosDeDineroEl } from '../../eventos/efectos'
import { DOM, IMPUESTO, INVERSION, RECURRENTE } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import type { Movimiento } from '../../modelo/movimientos'
import { crearContexto, type Contexto, type Dia } from '../contexto'
import { idsEnSerie } from '../ids'
import { conAsentamiento, congelar, estadoMinimo } from '../pruebas/constructores'
import { pasoCobros } from './cobros'

/** El avance de prueba: todo lo que crea o aplica lleva este avanceId. */
const AVANCE_PRUEBA = 'av.prueba'

/** Un día de abril de 1640, o del mes que se pida. */
function fecha(dia: number, mes = 4): Fecha {
  return { anio: 1640, mes, dia }
}

/** La partida de ejemplo del 12 de abril, sin la lista de avances. */
function ejemplo(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

/** Un contexto sobre la entrada congelada: si el paso escribiera en ella, la prueba lanzaría. */
function contexto(estado: EstadoPartida, hasta: Fecha): Contexto {
  return crearContexto(congelar(estado), hasta, {
    avanceId: AVANCE_PRUEBA,
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
}

/** El día tal como lo deja el paso 1: con los eventos de dinero activos. */
function diaDe(ctx: Contexto, f: Fecha): Dia {
  return {
    fecha: f,
    numero: aNumeroDeDia(f),
    primero: compararFechas(f, ctx.primerDia) === 0,
    eventos: eventosDeDineroEl(ctx.estado.eventos, f),
  }
}

/** Los movimientos que el avance de prueba ha creado o aplicado. */
function delAvance(ctx: Contexto): Movimiento[] {
  return ctx.movimientos.filter((m) => m.avanceId === AVANCE_PRUEBA)
}

/** El movimiento del avance que sale de una regla. */
function deLaRegla(ctx: Contexto, reglaId: string): Movimiento | undefined {
  return delAvance(ctx).find((m) => m.regla?.id === reglaId)
}

describe('pasoCobros: impuestos y rentas', () => {
  it('un impuesto por habitante cobra 1.000 mh × 1.240 habitantes el 1 de mayo, sin lo introducido', () => {
    const ctx = contexto(ejemplo(), fecha(1, 5))
    pasoCobros(ctx, diaDe(ctx, fecha(1, 5)))
    expect(deLaRegla(ctx, IMPUESTO.hogar)).toEqual({
      id: expect.any(String),
      dominioId: DOM.bree,
      fecha: fecha(1, 5),
      tipo: 'ingreso',
      importe: { base: 1240000 },
      categoriaId: CATEGORIA.impuestos,
      concepto: 'Impuesto por hogar',
      origen: 'avance',
      avanceId: AVANCE_PRUEBA,
      regla: { tipo: 'impuesto', id: IMPUESTO.hogar },
      programado: false,
    })
  })

  it('los aranceles del 15 de abril, con la feria (+500 %), cobran 1.800.000 sin lo introducido y con el concepto de la regla', () => {
    const ctx = contexto(ejemplo(), fecha(15))
    pasoCobros(ctx, diaDe(ctx, fecha(15)))
    const aranceles = deLaRegla(ctx, IMPUESTO.aranceles)
    expect(aranceles?.importe).toEqual({ base: 1800000 })
    expect(aranceles?.concepto).toBe('Aranceles del mercado')
    expect(aranceles?.categoriaId).toBe(CATEGORIA.aranceles)
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000 + 1800000 + 30000)
  })

  it('los aranceles del 22 de abril, sin evento, cobran su base con lo introducido: «3 mo» (T8)', () => {
    const ctx = contexto(ejemplo(), fecha(22))
    pasoCobros(ctx, diaDe(ctx, fecha(22)))
    expect(deLaRegla(ctx, IMPUESTO.aranceles)?.importe).toEqual({
      base: 300000,
      introducido: { cantidad: '3', moneda: 'mo' },
    })
  })

  it('un evento de −100 % sobre todos los ingresos deja los impuestos en 0: ni cobro ni movimiento (D-022)', () => {
    const base = ejemplo()
    const estado: EstadoPartida = {
      ...base,
      eventos: [
        ...base.eventos,
        {
          id: 'ev.prueba.cierre',
          dominioId: DOM.bree,
          nombre: 'Cierre del camino',
          inicio: fecha(22),
          duracionDias: 1,
          efectos: [{ ambito: 'ingresos', objetivo: { tipo: 'todos' }, pct: -100 }],
        },
      ],
    }
    const ctx = contexto(estado, fecha(22))
    pasoCobros(ctx, diaDe(ctx, fecha(22)))
    expect(delAvance(ctx)).toEqual([])
    expect(ctx.diarios.size).toBe(0)
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000)
  })

  it('un impuesto «Cada día» cobra ya, pero va al acumulado del avance y no crea movimiento ese día (§9 l.1285)', () => {
    const ctx = contexto(ejemplo(), fecha(13))
    pasoCobros(ctx, diaDe(ctx, fecha(13)))
    expect(deLaRegla(ctx, IMPUESTO.peaje)).toBeUndefined()
    const peaje = ctx.diarios.get(`impuesto|${IMPUESTO.peaje}`)
    expect(peaje?.importe).toBe(30000)
    expect(peaje?.dias).toBe(1)
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000 + 30000)
  })
})

describe('pasoCobros: beneficios e ingresos recurrentes', () => {
  it('el beneficio de la Barcaza del 15 de abril entra en la bolsa con su regla, su inversionId y «1,5 mo»', () => {
    const ctx = contexto(ejemplo(), fecha(15))
    pasoCobros(ctx, diaDe(ctx, fecha(15)))
    expect(deLaRegla(ctx, INVERSION.barcaza)).toEqual({
      id: expect.any(String),
      dominioId: DOM.tharan,
      fecha: fecha(15),
      tipo: 'ingreso',
      importe: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
      categoriaId: CATEGORIA.beneficiosDeInversiones,
      concepto: 'Beneficio de Barcaza del Brandivino',
      origen: 'avance',
      avanceId: AVANCE_PRUEBA,
      regla: { tipo: 'beneficio', id: INVERSION.barcaza },
      inversionId: INVERSION.barcaza,
      programado: false,
    })
    expect(ctx.saldos.get(DOM.tharan)).toBe(4651800 + 150000)
  })

  it('un ingreso de J5 activo entra en su cuentaId, aunque la regla sea del personaje', () => {
    const base = ejemplo()
    const estado: EstadoPartida = {
      ...base,
      recurrentes: base.recurrentes.map((r) =>
        r.id === RECURRENTE.alquilerCasaArchet ? { ...r, activo: true, cuentaId: DOM.bree } : r,
      ),
    }
    const ctx = contexto(estado, fecha(1, 5))
    pasoCobros(ctx, diaDe(ctx, fecha(1, 5)))
    const alquiler = deLaRegla(ctx, RECURRENTE.alquilerCasaArchet)
    expect(alquiler?.dominioId).toBe(DOM.bree)
    expect(alquiler?.importe).toEqual({ base: 50000, introducido: { cantidad: '0,5', moneda: 'mo' } })
    expect(alquiler?.categoriaId).toBe(CATEGORIA.rentasYAlquileres)
    expect(alquiler?.regla).toEqual({ tipo: 'recurrente', id: RECURRENTE.alquilerCasaArchet })
  })

  it('un ingreso de J5 en pausa no cobra', () => {
    const ctx = contexto(ejemplo(), fecha(1, 5))
    pasoCobros(ctx, diaDe(ctx, fecha(1, 5)))
    expect(deLaRegla(ctx, RECURRENTE.alquilerCasaArchet)).toBeUndefined()
    expect(ctx.saldos.get(DOM.tharan)).toBe(4651800 + 300000)
  })
})

describe('pasoCobros: cobros programados', () => {
  /** El ejemplo con un cobro programado en la bolsa de Tharan y un pago programado el mismo día. */
  function conProgramados(fechaCobro: Fecha): EstadoPartida {
    const base = ejemplo()
    return {
      ...base,
      movimientos: [
        ...base.movimientos,
        {
          id: 'mov.prueba.cobro',
          dominioId: DOM.tharan,
          fecha: fechaCobro,
          tipo: 'ingreso',
          importe: { base: 200000, introducido: { cantidad: '2', moneda: 'mo' } },
          categoriaId: CATEGORIA.otros,
          concepto: 'Pago de Barnabás por la escolta',
          origen: 'manual',
          programado: true,
        },
        {
          id: 'mov.prueba.pago',
          dominioId: DOM.tharan,
          fecha: fecha(13),
          tipo: 'gasto',
          importe: { base: -100000 },
          categoriaId: CATEGORIA.otros,
          concepto: 'Cuerda élfica',
          origen: 'manual',
          programado: true,
        },
      ],
    }
  }

  it('el cobro programado del día entra entero y se aplica con el avanceId, sin cambiar su id, su origen ni su importe', () => {
    const ctx = contexto(conProgramados(fecha(20)), fecha(20))
    pasoCobros(ctx, diaDe(ctx, fecha(20)))
    expect(ctx.movimientos.find((m) => m.id === 'mov.prueba.cobro')).toEqual({
      id: 'mov.prueba.cobro',
      dominioId: DOM.tharan,
      fecha: fecha(20),
      tipo: 'ingreso',
      importe: { base: 200000, introducido: { cantidad: '2', moneda: 'mo' } },
      categoriaId: CATEGORIA.otros,
      concepto: 'Pago de Barnabás por la escolta',
      origen: 'manual',
      avanceId: AVANCE_PRUEBA,
      programado: false,
    })
    expect(ctx.saldos.get(DOM.tharan)).toBe(4651800 + 200000)
  })

  it('un cobro programado con la fecha ya pasada se aplica el primer día; el pago programado se queda para el paso 9 (T14)', () => {
    const ctx = contexto(conProgramados(fecha(10)), fecha(19))
    pasoCobros(ctx, diaDe(ctx, fecha(13)))
    expect(ctx.movimientos.find((m) => m.id === 'mov.prueba.cobro')?.programado).toBe(false)
    expect(ctx.movimientos.find((m) => m.id === 'mov.prueba.pago')?.programado).toBe(true)
    expect(ctx.saldos.get(DOM.tharan)).toBe(4651800 + 200000)
  })
})

describe('pasoCobros: el orden de §9 l.1280', () => {
  it('crea los movimientos en el orden de §9: impuestos y rentas, beneficios e ingresos recurrentes, y aplica los programados (T10)', () => {
    const inicio = fecha(12)
    const base = conAsentamiento(estadoMinimo(inicio), { id: 'dom.aldea', nombre: 'Aldea', caja: 0, habitantes: 50 })
    const tharan = base.dominios[0].id
    const cadaDia20 = { tipo: 'mensual', diaMes: 20 } as const
    const estado: EstadoPartida = {
      ...base,
      movimientos: [
        {
          id: 'mov.prueba.cobro',
          dominioId: tharan,
          fecha: fecha(20),
          tipo: 'ingreso',
          importe: { base: 40000 },
          categoriaId: CATEGORIA.otros,
          concepto: 'Deuda de un amigo',
          origen: 'manual',
          programado: true,
        },
      ],
      recurrentes: [
        {
          id: 'rec.prueba.alquiler',
          dominioId: tharan,
          tipo: 'ingreso',
          concepto: 'Alquiler del establo',
          importe: { base: 30000 },
          categoriaId: CATEGORIA.rentasYAlquileres,
          cuentaId: tharan,
          recurrencia: cadaDia20,
          activo: true,
        },
      ],
      inversiones: [
        {
          id: 'inv.prueba.molino',
          dominioId: tharan,
          negocio: 'Molino del río',
          capital: { base: 1000000 },
          participacionPct: 10,
          beneficio: { base: 20000 },
          recurrencia: cadaDia20,
          cuentaBeneficiosId: tharan,
          estado: 'activa',
        },
      ],
      impuestosRentas: [
        {
          id: 'imp.prueba.mercado',
          dominioId: 'dom.aldea',
          sentido: 'ingreso',
          concepto: 'Puestos del mercado',
          base: 'fija',
          importe: { base: 10000 },
          categoriaId: CATEGORIA.impuestos,
          recurrencia: cadaDia20,
        },
      ],
    }
    const ctx = contexto(estado, fecha(20))
    pasoCobros(ctx, diaDe(ctx, fecha(20)))
    // Los nuevos van al final del libro, en el orden en que se crean; el programado se aplica en su sitio.
    const nuevos = delAvance(ctx).filter((m) => m.origen === 'avance')
    expect(nuevos.map((m) => [m.id, m.concepto])).toEqual([
      ['sim.1', 'Puestos del mercado'],
      ['sim.2', 'Beneficio de Molino del río'],
      ['sim.3', 'Alquiler del establo'],
    ])
    expect(ctx.movimientos[0]).toMatchObject({ id: 'mov.prueba.cobro', programado: false, avanceId: AVANCE_PRUEBA })
    expect(ctx.saldos.get(tharan)).toBe(20000 + 30000 + 40000)
    expect(ctx.saldos.get('dom.aldea')).toBe(10000)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/pasos/cobros.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./cobros`, que todavía no existe. La hora y la duración pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/pasos/cobros.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/pasos/cobros.test.ts [ src/dominio/motor/pasos/cobros.test.ts ]
Error: Cannot find module './cobros' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/pasos/cobros.test.ts
 ❯ src/dominio/motor/pasos/cobros.test.ts:12:1
     10| import { idsEnSerie } from '../ids'
     11| import { conAsentamiento, congelar, estadoMinimo } from '../pruebas/co…
     12| import { pasoCobros } from './cobros'
       | ^
     13|
     14| /** El avance de prueba: todo lo que crea o aplica lleva este avanceId…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:58:09
   Duration  0.74s (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `cobros.ts`**

Crea `src/dominio/motor/pasos/cobros.ts` con este contenido:

```ts
import { ocurreEl } from '../../calendario/recurrencia'
import { CATEGORIA } from '../../catalogo/inicial'
import type { Importe } from '../../dinero/importe'
import { conEfecto, pctDeIngresos } from '../../eventos/efectos'
import type { Movimiento } from '../../modelo/movimientos'
import { habitantesDe } from '../../poblacion/habitantes'
import { cobrar } from '../caja'
import { anadirMovimiento, aplicarProgramado, type Contexto, type Dia } from '../contexto'
import { acumularDiario } from '../diarios'
import { conceptoBeneficio } from '../textos'

/** Paso 8 sin los locales: impuestos y rentas, beneficios, ingresos recurrentes y cobros programados, en ese orden (§9 l.1280). */
export function pasoCobros(ctx: Contexto, dia: Dia): void {
  cobrarImpuestosYRentas(ctx, dia)
  cobrarBeneficios(ctx, dia)
  cobrarIngresosRecurrentes(ctx, dia)
  cobrarProgramados(ctx, dia)
}

/**
 * Los movimientos programados de un tipo que tocan ese día, en el orden del libro. El índice del contexto ya pone
 * los de fecha pasada en el primer día y deja fuera los vinculados, que esperan a la fase 4 (T14). Lo usa también
 * el paso 9.
 */
export function programadosDelDia(ctx: Contexto, dia: Dia, tipo: 'gasto' | 'ingreso'): Movimiento[] {
  const programados: Movimiento[] = []
  for (const id of ctx.programadosPorDia.get(dia.numero) ?? []) {
    const indice = ctx.indiceMovimiento.get(id)
    if (indice === undefined) {
      throw new Error(`No existe «${id}»`)
    }
    const movimiento = ctx.movimientos[indice]
    if (movimiento.programado && movimiento.tipo === tipo) {
      programados.push(movimiento)
    }
  }
  return programados
}

/** El importe de un cobro: con lo introducido de su origen solo si cobra exactamente esa base (T8). */
function ingresoDe(importe: number, origen: Importe, exacto: boolean): Importe {
  return exacto && origen.introducido !== undefined
    ? { base: importe, introducido: { ...origen.introducido } }
    : { base: importe }
}

/** Impuestos y rentas de ingreso: fijos o por habitante, con los eventos de ingresos del día (§7 l.1139; D-022; D-026). */
function cobrarImpuestosYRentas(ctx: Contexto, dia: Dia): void {
  for (const impuesto of ctx.estado.impuestosRentas) {
    if (impuesto.sentido !== 'ingreso' || !ocurreEl(impuesto.recurrencia, dia.fecha)) {
      continue
    }
    const base =
      impuesto.base === 'fija'
        ? impuesto.importe.base
        : impuesto.importe.base * habitantesDe(ctx.estado, impuesto.dominioId, dia.fecha)
    const importe = conEfecto(base, pctDeIngresos(dia.eventos, impuesto.dominioId, impuesto.id))
    if (importe === 0) {
      continue
    }
    cobrar(ctx, impuesto.dominioId, importe)
    const regla = { tipo: 'impuesto', id: impuesto.id } as const
    if (impuesto.recurrencia.tipo === 'diaria') {
      acumularDiario(ctx, {
        clase: 'regla',
        regla,
        dominioId: impuesto.dominioId,
        tipo: 'ingreso',
        categoriaId: impuesto.categoriaId,
        concepto: impuesto.concepto,
        fecha: dia.fecha,
        importe,
      })
      continue
    }
    anadirMovimiento(ctx, {
      dominioId: impuesto.dominioId,
      fecha: dia.fecha,
      tipo: 'ingreso',
      importe: ingresoDe(importe, impuesto.importe, impuesto.base === 'fija' && importe === impuesto.importe.base),
      categoriaId: impuesto.categoriaId,
      concepto: impuesto.concepto,
      regla,
    })
  }
}

/** Beneficios de las inversiones activas, en su cuenta de beneficios y sin eventos (D-019; D-026). */
function cobrarBeneficios(ctx: Contexto, dia: Dia): void {
  for (const inversion of ctx.estado.inversiones) {
    if (inversion.estado !== 'activa' || !ocurreEl(inversion.recurrencia, dia.fecha)) {
      continue
    }
    const importe = inversion.beneficio.base
    if (importe === 0) {
      continue
    }
    cobrar(ctx, inversion.cuentaBeneficiosId, importe)
    const regla = { tipo: 'beneficio', id: inversion.id } as const
    const concepto = conceptoBeneficio(inversion.negocio)
    if (inversion.recurrencia.tipo === 'diaria') {
      acumularDiario(ctx, {
        clase: 'regla',
        regla,
        dominioId: inversion.cuentaBeneficiosId,
        tipo: 'ingreso',
        categoriaId: CATEGORIA.beneficiosDeInversiones,
        concepto,
        inversionId: inversion.id,
        fecha: dia.fecha,
        importe,
      })
      continue
    }
    anadirMovimiento(ctx, {
      dominioId: inversion.cuentaBeneficiosId,
      fecha: dia.fecha,
      tipo: 'ingreso',
      importe: ingresoDe(importe, inversion.beneficio, true),
      categoriaId: CATEGORIA.beneficiosDeInversiones,
      concepto,
      regla,
      inversionId: inversion.id,
    })
  }
}

/** Ingresos recurrentes activos de J5, en su cuentaId y sin eventos (§7 l.1200; D-026). */
function cobrarIngresosRecurrentes(ctx: Contexto, dia: Dia): void {
  for (const recurrente of ctx.estado.recurrentes) {
    if (recurrente.tipo !== 'ingreso' || !recurrente.activo || !ocurreEl(recurrente.recurrencia, dia.fecha)) {
      continue
    }
    const importe = recurrente.importe.base
    if (importe === 0) {
      continue
    }
    cobrar(ctx, recurrente.cuentaId, importe)
    const regla = { tipo: 'recurrente', id: recurrente.id } as const
    if (recurrente.recurrencia.tipo === 'diaria') {
      acumularDiario(ctx, {
        clase: 'regla',
        regla,
        dominioId: recurrente.cuentaId,
        tipo: 'ingreso',
        categoriaId: recurrente.categoriaId,
        concepto: recurrente.concepto,
        unidadDiaria: recurrente.unidadDiaria,
        fecha: dia.fecha,
        importe,
      })
      continue
    }
    anadirMovimiento(ctx, {
      dominioId: recurrente.cuentaId,
      fecha: dia.fecha,
      tipo: 'ingreso',
      importe: ingresoDe(importe, recurrente.importe, true),
      categoriaId: recurrente.categoriaId,
      concepto: recurrente.concepto,
      regla,
    })
  }
}

/** Cobros programados del día: entran enteros y el movimiento se aplica con el avanceId (§6.4 l.768; T14). */
function cobrarProgramados(ctx: Contexto, dia: Dia): void {
  for (const movimiento of programadosDelDia(ctx, dia, 'ingreso')) {
    cobrar(ctx, movimiento.dominioId, movimiento.importe.base)
    aplicarProgramado(ctx, movimiento.id, {})
  }
}
```

Tres detalles de la implementación:
- `cobrarBeneficios` siempre pasa `exacto: true` a `ingresoDe`: un beneficio no tiene parte «por habitante» ni la tocan eventos (D-026), así que cobra siempre su base exacta y siempre lleva lo tecleado.
- `cobrarImpuestosYRentas` y `cobrarIngresosRecurrentes` cortan con `continue` antes de crear nada si `importe === 0` (D-022); no hace falta un `if` que envuelva el resto del cuerpo.
- `programadosDelDia` está exportada porque la tarea 17 la reutiliza tal cual para los pagos programados (`tipo: 'gasto'`), sin repetir la búsqueda en `programadosPorDia`.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/pasos/cobros.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  11:58:17
   Duration  0.79s (transform 60%, import 36%, tests 4%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **720 pruebas en 61 archivos**; `npm run lint` solo escribe su cabecera y sale con código 0. La tarea 14 dejó 708 pruebas en 60 archivos, y esta trae **12 nuevas**: las 11 de `cobros.test.ts` y **una más** en `pureza.test.ts`, que ahora recorre también `motor/pasos/cobros.ts`.

```text
 Test Files  61 passed (61)
      Tests  720 passed (720)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/pasos/cobros.ts src/dominio/motor/pasos/cobros.test.ts
git commit -m "feat(motor): paso 8, cobros de impuestos, beneficios, ingresos recurrentes y programados" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/motor/pasos/cobros.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/pasos/cobros.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 f01e945] feat(motor): paso 8, cobros de impuestos, beneficios, ingresos recurrentes y programados
 2 files changed, 480 insertions(+)
 create mode 100644 src/dominio/motor/pasos/cobros.test.ts
 create mode 100644 src/dominio/motor/pasos/cobros.ts
```

**Avisos que esta tarea deja escritos:**

1. El JSDoc de `pasoCobros` dice «sin los locales»: la tarea 16 lo cambia a la vez que añade `cobrarLocales(ctx, dia)` entre `cobrarImpuestosYRentas` y `cobrarBeneficios`, con una sola línea de import y una de llamada. No toques ese orden aquí.
2. `programadosDelDia` y `ingresoDe`/`gastoDe` (esta última la escribe la tarea 17 en `pagos.ts`, con la misma idea pero restando) son las dos piezas que la tarea 17 reutiliza; `pagos.ts` importará `programadosDelDia` de `./cobros`.
3. La prueba del orden usa una partida mínima (`estadoMinimo` + `conAsentamiento`, tarea 10) en vez del ejemplo completo, para que el orden de los cuatro tipos de cobro no dependa de qué reglas trae Bree o Archet ese día.

---

### Tarea 16 · Paso 8: locales

El cobro de los impuestos de locales comerciales dentro del paso 8, entre los impuestos y rentas y los beneficios (§9 l.1280). Un solo movimiento por asentamiento y día, con el detalle de cada local y mes cobrado, y el hueco de una línea que lo engancha a `pasoCobros` (tarea 15). Usa `abiertoAlgunDia`, `diaDeCobro`, `impuestoDeLocal`, `mesesPorCobrar`, `produccionDelMes` y las operaciones de mes (`compararMeses`, `mesAnterior`, `mesDe`) de `locales/impuesto.ts` (tarea 8, que ya calcula todo esto sin tocar el estado); `cobrar`, `anadirMovimiento` y `Contexto`/`Dia` (tarea 13); y `conceptoLocales` (tarea 11).

`cobrarLocales` recorre primero los **tipos** de local cuyo día de cobro es hoy (`diaDeCobro`, tarea 8): casi todos los días no hay ninguno y la función sale enseguida. Con al menos un tipo que cobra, recorre los asentamientos en el orden de `dominios` y, por cada uno, sus locales en el orden del array: si el tipo del local está entre los que cobran hoy, calcula sus `mesesPorCobrar` y, por cada mes en que estuvo `abiertoAlgunDia` con impuesto > 0, añade una entrada al detalle. El `cobradoHasta` del local avanza al mes anterior al cobro **pague o no** (técnica 30, T30): un local cerrado todo el mes o con impuesto 0 no debe volver a intentar cobrar esos meses. Al final, si el asentamiento tiene detalle, un solo movimiento con el total, el concepto agrupado (`conceptoLocales`, con los meses distintos del detalle en orden) y el `regla: { tipo: 'locales', id: dominioId }`; si ningún local pagó, ni movimiento ni suceso (D-022).

**Reglas de la especificación que implementa:**

- **Meses que se cobran y cobradoHasta (§9 l.1303-1306).** «En el paso de cobros, el día de cobro de su tipo actual, el motor cobra los meses del local desde cobradoHasta + 1 hasta el mes anterior, cada uno con su producción, y actualiza cobradoHasta. Si son dos meses, el concepto dice «marzo y abril».» «Cambiar el tipo de un local o el día de cobro de un tipo no cobra un mes dos veces ni se lo salta.» «El mes del alta se cobra entero, sin prorratear. Los meses anteriores al alta no se cobran.» — esto último ya lo garantiza `mesesPorCobrar` (tarea 8); aquí solo se usa.
- **Producción del mes (§9 l.1307).** «La producción de cada mes es la anotada o, si no hay, la habitual. La habitual, el porcentaje y el mínimo son los vigentes el día del cobro, para todo el mes cobrado y sin prorratear. Lo ya cobrado no cambia.»
- **Estado del local (§9 l.1308).** «Un mes se cobra si el local estuvo Abierto algún día de ese mes (según estadoDesde), con el mínimo entero y sin prorratear. Si estuvo cerrado todo el mes, no paga.»
- **Impuesto 0 y sin movimiento (§9 l.1309).** «Un local con impuesto 0 no cuenta en el cobro. Si ningún local paga ese día, no hay movimiento ni marca «Impuesto locales».»
- **El movimiento agrupado (§9 l.1310).** «El movimiento agrupado lleva `regla: { tipo: locales, id: dominioId }` y `detalleLocales`, con una entrada por local y mes.»
- **Sin efectos de eventos ni impagos (§9 l.1311-1312).** «Los efectos de eventos no se aplican a este impuesto.» «No hay impagos, porque es un cobro.»
- **El concepto agrupado (§9 l.1288).** «Los impuestos de locales que se cobran el mismo día en un asentamiento forman un movimiento, en la categoría Impuestos: «Impuestos de locales · abril (4)». El número entre paréntesis cuenta los locales que pagan. Si se cobran dos meses, «marzo y abril».»
- **`cobradoHasta` nunca retrocede (técnica 30, T30).** «Pasa a máx(cobradoHasta, mes anterior al cobro) en todos los locales cuyo tipo cobra ese día (nunca retrocede); los locales con impuesto 0 o cerrados todo el mes no entran en el detalle ni en el número entre paréntesis.»

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/motor/pasos/locales.ts`
- Modificar: `src/dominio/motor/pasos/cobros.ts` (el hueco: `cobrarLocales` entre los impuestos y los beneficios)
- Prueba: `src/dominio/motor/pasos/locales.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Qué comprueba cada bloque de `locales.test.ts`:
- `cobrarLocales`: el 1 de mayo del ejemplo cobra abril a los cuatro locales de Bree (450.000, con su detalle completo y sus `cobradoHasta` en abril); sin la producción anotada de la Tienda de telas cobra la habitual (470.000); un local cerrado todo abril no entra en el detalle ni en el número, pero su `cobradoHasta` avanza igual; un local con dos meses sin cobrar paga marzo y abril, cada uno con su entrada; un local con impuesto 0 no cuenta en el cobro ni en el número entre paréntesis; si ningún local paga, no hay movimiento ni suceso, y `cobradoHasta` avanza igual; con el día de cobro cambiado al 15 no cobra marzo otra vez el 15 de abril y cobra abril el 15 de mayo; `cobradoHasta` nunca retrocede si ya estaba más adelantado que el cobro.
- `pasoCobros con los locales`: el 1 de mayo cobra los locales después de los impuestos y antes de los beneficios, en el orden de §9 l.1280 — esta prueba es la que obliga a enganchar `cobrarLocales` dentro de `pasoCobros` en el mismo paso.

Crea `src/dominio/motor/pasos/locales.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, compararFechas, type Fecha } from '../../calendario/fecha'
import { CATEGORIA } from '../../catalogo/inicial'
import { eventosDeDineroEl } from '../../eventos/efectos'
import { DOM, IMPUESTO, INVERSION, LOCAL } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import type { LocalComercial, TipoLocal } from '../../modelo/asentamiento'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import type { Movimiento } from '../../modelo/movimientos'
import { crearContexto, type Contexto, type Dia } from '../contexto'
import { idsEnSerie } from '../ids'
import { congelar } from '../pruebas/constructores'
import { pasoCobros } from './cobros'
import { cobrarLocales } from './locales'

/** El avance de prueba: todo lo que crea lleva este avanceId. */
const AVANCE_PRUEBA = 'av.prueba'

/** El 1 de mayo de 1640: el primer cobro de locales después del 12 de abril. */
const PRIMERO_DE_MAYO: Fecha = { anio: 1640, mes: 5, dia: 1 }

/** Un día de 1640. */
function fecha(dia: number, mes: number): Fecha {
  return { anio: 1640, mes, dia }
}

/** La partida de ejemplo del 12 de abril, con los cambios que pida cada prueba en sus locales o en sus tipos. */
function ejemplo(
  cambiarLocal: (local: LocalComercial) => LocalComercial = (local) => local,
  cambiarTipo: (tipo: TipoLocal) => TipoLocal = (tipo) => tipo,
): EstadoPartida {
  const base = estadoDe(documentoDeEjemplo())
  return {
    ...base,
    localesComerciales: base.localesComerciales.map(cambiarLocal),
    tiposLocal: base.tiposLocal.map(cambiarTipo),
  }
}

/** Un contexto sobre la entrada congelada: si el paso escribiera en ella, la prueba lanzaría. */
function contexto(estado: EstadoPartida, hasta: Fecha): Contexto {
  return crearContexto(congelar(estado), hasta, {
    avanceId: AVANCE_PRUEBA,
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
}

/** El día tal como lo deja el paso 1: con los eventos de dinero activos. */
function diaDe(ctx: Contexto, f: Fecha): Dia {
  return {
    fecha: f,
    numero: aNumeroDeDia(f),
    primero: compararFechas(f, ctx.primerDia) === 0,
    eventos: eventosDeDineroEl(ctx.estado.eventos, f),
  }
}

/** Los cobros de locales que ha creado el avance de prueba. */
function cobrosDeLocales(ctx: Contexto): Movimiento[] {
  return ctx.movimientos.filter((m) => m.avanceId === AVANCE_PRUEBA && m.regla?.tipo === 'locales')
}

/** Hasta qué mes está cobrado cada local, en el orden del array. */
function cobradoHasta(ctx: Contexto): string[] {
  return ctx.localesComerciales.map((l) => `${l.cobradoHasta.anio}-${l.cobradoHasta.mes}`)
}

describe('cobrarLocales', () => {
  it('el 1 de mayo cobra abril a los cuatro locales de Bree: +450.000, «Impuestos de locales · abril (4)» y su detalle', () => {
    const ctx = contexto(ejemplo(), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    const abril = { anio: 1640, mes: 4 }
    expect(cobrosDeLocales(ctx)).toEqual([
      {
        id: 'sim.1',
        dominioId: DOM.bree,
        fecha: PRIMERO_DE_MAYO,
        tipo: 'ingreso',
        importe: { base: 450000 },
        categoriaId: CATEGORIA.impuestos,
        concepto: 'Impuestos de locales · abril (4)',
        origen: 'avance',
        avanceId: AVANCE_PRUEBA,
        regla: { tipo: 'locales', id: DOM.bree },
        detalleLocales: [
          {
            localId: LOCAL.herreria1,
            nombre: 'Herrería 1',
            mes: abril,
            produccion: { base: 1000000 },
            anotada: false,
            impuesto: { base: 100000 },
          },
          {
            localId: LOCAL.posada,
            nombre: 'Posada El Poney Pisador',
            mes: abril,
            produccion: { base: 4000000 },
            anotada: false,
            impuesto: { base: 320000 },
          },
          {
            localId: LOCAL.tiendaDeTelas,
            nombre: 'Tienda de telas',
            mes: abril,
            produccion: { base: 150000 },
            anotada: true,
            impuesto: { base: 10000 },
          },
          {
            localId: LOCAL.ultramarinos,
            nombre: 'Ultramarinos del camino',
            mes: abril,
            produccion: { base: 400000 },
            anotada: false,
            impuesto: { base: 20000 },
          },
        ],
        programado: false,
      },
    ])
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000 + 450000)
    expect(cobradoHasta(ctx)).toEqual(['1640-4', '1640-4', '1640-4', '1640-4'])
    expect(ctx.sucesos).toEqual([{ tipo: 'cobroLocales', dominioId: DOM.bree, fecha: PRIMERO_DE_MAYO }])
  })

  it('sin la producción anotada de la Tienda de telas cobra la habitual: 470.000 (§7 l.1067)', () => {
    const ctx = contexto(ejemplo((l) => ({ ...l, producciones: [] })), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    expect(cobrosDeLocales(ctx)[0].importe).toEqual({ base: 470000 })
  })

  it('un local cerrado todo abril no entra en el detalle ni en el número, pero su cobradoHasta avanza igual (T30)', () => {
    const cerrada = (l: LocalComercial): LocalComercial =>
      l.id === LOCAL.herreria1
        ? { ...l, cambiosEstado: [...l.cambiosEstado, { desde: fecha(1, 4), estado: 'cerrado' }] }
        : l
    const ctx = contexto(ejemplo(cerrada), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    const [cobro] = cobrosDeLocales(ctx)
    expect(cobro.importe).toEqual({ base: 350000 })
    expect(cobro.concepto).toBe('Impuestos de locales · abril (3)')
    expect(cobro.detalleLocales?.map((d) => d.localId)).not.toContain(LOCAL.herreria1)
    expect(cobradoHasta(ctx)).toEqual(['1640-4', '1640-4', '1640-4', '1640-4'])
  })

  it('un local con dos meses sin cobrar paga marzo y abril, cada uno con su entrada: «marzo y abril (4)»', () => {
    const atrasada = (l: LocalComercial): LocalComercial =>
      l.id === LOCAL.herreria1 ? { ...l, cobradoHasta: { anio: 1640, mes: 2 } } : l
    const ctx = contexto(ejemplo(atrasada), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    const [cobro] = cobrosDeLocales(ctx)
    expect(cobro.concepto).toBe('Impuestos de locales · marzo y abril (4)')
    expect(cobro.importe).toEqual({ base: 550000 })
    expect(cobro.detalleLocales?.map((d) => `${d.nombre} · ${d.mes.mes}`)).toEqual([
      'Herrería 1 · 3',
      'Herrería 1 · 4',
      'Posada El Poney Pisador · 4',
      'Tienda de telas · 4',
      'Ultramarinos del camino · 4',
    ])
    expect(cobradoHasta(ctx)).toEqual(['1640-4', '1640-4', '1640-4', '1640-4'])
  })

  it('un local con impuesto 0 no cuenta en el cobro ni en el número entre paréntesis (§9 l.1309)', () => {
    const tiendaGratis = (t: TipoLocal): TipoLocal => (t.nombre === 'Tienda' ? { ...t, pct: 0, minimo: { base: 0 } } : t)
    const ctx = contexto(ejemplo(undefined, tiendaGratis), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    const [cobro] = cobrosDeLocales(ctx)
    expect(cobro.concepto).toBe('Impuestos de locales · abril (2)')
    expect(cobro.importe).toEqual({ base: 420000 })
    expect(cobradoHasta(ctx)).toEqual(['1640-4', '1640-4', '1640-4', '1640-4'])
  })

  it('si ningún local paga, no hay movimiento ni suceso, y cobradoHasta avanza igual (§9 l.1309; T30)', () => {
    const gratis = (t: TipoLocal): TipoLocal => ({ ...t, pct: 0, minimo: { base: 0 } })
    const ctx = contexto(ejemplo(undefined, gratis), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    expect(cobrosDeLocales(ctx)).toEqual([])
    expect(ctx.sucesos).toEqual([])
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000)
    expect(cobradoHasta(ctx)).toEqual(['1640-4', '1640-4', '1640-4', '1640-4'])
  })

  it('con el día de cobro cambiado al 15 no cobra marzo otra vez el 15 de abril y cobra abril el 15 de mayo (§9 l.1305)', () => {
    const alQuince = (t: TipoLocal): TipoLocal => ({ ...t, diaCobro: 15 })
    const ctx = contexto(ejemplo(undefined, alQuince), fecha(15, 5))
    cobrarLocales(ctx, diaDe(ctx, fecha(15, 4)))
    expect(cobrosDeLocales(ctx)).toEqual([])
    expect(cobradoHasta(ctx)).toEqual(['1640-3', '1640-3', '1640-3', '1640-3'])
    cobrarLocales(ctx, diaDe(ctx, fecha(15, 5)))
    const [cobro] = cobrosDeLocales(ctx)
    expect(cobro.fecha).toEqual(fecha(15, 5))
    expect(cobro.concepto).toBe('Impuestos de locales · abril (4)')
    expect(cobradoHasta(ctx)).toEqual(['1640-4', '1640-4', '1640-4', '1640-4'])
  })

  it('cobradoHasta nunca retrocede: un local ya cobrado hasta mayo no paga el 1 de mayo y se queda en mayo (aviso 14)', () => {
    const adelantada = (l: LocalComercial): LocalComercial =>
      l.id === LOCAL.herreria1 ? { ...l, cobradoHasta: { anio: 1640, mes: 5 } } : l
    const ctx = contexto(ejemplo(adelantada), PRIMERO_DE_MAYO)
    cobrarLocales(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    const [cobro] = cobrosDeLocales(ctx)
    expect(cobro.concepto).toBe('Impuestos de locales · abril (3)')
    expect(cobradoHasta(ctx)).toEqual(['1640-5', '1640-4', '1640-4', '1640-4'])
  })
})

describe('pasoCobros con los locales', () => {
  it('el 1 de mayo cobra los locales después de los impuestos y antes de los beneficios (§9 l.1280)', () => {
    const ctx = contexto(ejemplo(), PRIMERO_DE_MAYO)
    pasoCobros(ctx, diaDe(ctx, PRIMERO_DE_MAYO))
    expect(
      ctx.movimientos
        .filter((m) => m.avanceId === AVANCE_PRUEBA)
        .map((m) => [m.regla?.tipo, m.regla?.id, m.importe.base]),
    ).toEqual([
      ['impuesto', IMPUESTO.hogar, 1240000],
      ['locales', DOM.bree, 450000],
      ['beneficio', INVERSION.tonelDorado, 300000],
    ])
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/pasos/locales.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./locales`, que todavía no existe. La hora y la duración pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/pasos/locales.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/pasos/locales.test.ts [ src/dominio/motor/pasos/locales.test.ts ]
Error: Cannot find module './locales' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/pasos/locales.test.ts
 ❯ src/dominio/motor/pasos/locales.test.ts:14:1
     12| import { congelar } from '../pruebas/constructores'
     13| import { pasoCobros } from './cobros'
     14| import { cobrarLocales } from './locales'
       | ^
     15|
     16| /** El avance de prueba: todo lo que crea lleva este avanceId. */

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  12:02:37
   Duration  0.72s (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `locales.ts`**

Crea `src/dominio/motor/pasos/locales.ts` con este contenido:

```ts
import { compararFechas } from '../../calendario/fecha'
import { CATEGORIA } from '../../catalogo/inicial'
import {
  abiertoAlgunDia,
  compararMeses,
  diaDeCobro,
  impuestoDeLocal,
  mesAnterior,
  mesDe,
  mesesPorCobrar,
  produccionDelMes,
} from '../../locales/impuesto'
import type { TipoLocal } from '../../modelo/asentamiento'
import type { AnioMes, Id } from '../../modelo/comunes'
import type { DetalleLocal } from '../../modelo/movimientos'
import { cobrar } from '../caja'
import { anadirMovimiento, type Contexto, type Dia } from '../contexto'
import { conceptoLocales } from '../textos'

/** Cobra los locales del día: un movimiento por asentamiento con su detalle, y cobradoHasta al día (§7; §9 l.1303-1313). */
export function cobrarLocales(ctx: Contexto, dia: Dia): void {
  // Los tipos cuyo día de cobro (o el último del mes, si no lo tiene) es hoy; casi todos los días no hay ninguno.
  const tiposQueCobran = new Map<Id, TipoLocal>()
  for (const tipo of ctx.estado.tiposLocal) {
    if (compararFechas(diaDeCobro(tipo, dia.fecha.anio, dia.fecha.mes), dia.fecha) === 0) {
      tiposQueCobran.set(tipo.id, tipo)
    }
  }
  if (tiposQueCobran.size === 0) {
    return
  }
  for (const dominio of ctx.estado.dominios) {
    if (dominio.tipo === 'asentamiento') {
      cobrarLocalesDe(ctx, dia, dominio.id, tiposQueCobran)
    }
  }
}

/** Los locales de un asentamiento cuyo tipo cobra hoy, en el orden del array (§9 l.1303-1313; T30). */
function cobrarLocalesDe(ctx: Contexto, dia: Dia, dominioId: Id, tiposQueCobran: ReadonlyMap<Id, TipoLocal>): void {
  const detalle: DetalleLocal[] = []
  ctx.localesComerciales.forEach((local, indice) => {
    const tipo = tiposQueCobran.get(local.tipoId)
    if (local.dominioId !== dominioId || tipo === undefined) {
      return
    }
    const meses = mesesPorCobrar(local, dia.fecha)
    if (meses.length === 0) {
      return
    }
    for (const mes of meses) {
      if (!abiertoAlgunDia(local, mes)) {
        continue
      }
      const produccion = produccionDelMes(local, mes)
      const impuesto = impuestoDeLocal(produccion.importe, tipo)
      if (impuesto === 0) {
        continue
      }
      detalle.push({
        localId: local.id,
        nombre: local.nombre,
        mes,
        produccion: { base: produccion.importe },
        anotada: produccion.anotada,
        impuesto: { base: impuesto },
      })
    }
    // Pague o no, el mes anterior al cobro queda cobrado; con meses por cobrar, siempre es posterior (T30).
    ctx.localesComerciales[indice] = { ...local, cobradoHasta: mesAnterior(mesDe(dia.fecha)) }
  })
  if (detalle.length === 0) {
    return
  }
  const total = detalle.reduce((suma, entrada) => suma + entrada.impuesto.base, 0)
  const locales = new Set(detalle.map((entrada) => entrada.localId)).size
  cobrar(ctx, dominioId, total)
  anadirMovimiento(ctx, {
    dominioId,
    fecha: dia.fecha,
    tipo: 'ingreso',
    importe: { base: total },
    categoriaId: CATEGORIA.impuestos,
    concepto: conceptoLocales(mesesDelDetalle(detalle), locales),
    regla: { tipo: 'locales', id: dominioId },
    detalleLocales: detalle,
  })
  ctx.sucesos.push({ tipo: 'cobroLocales', dominioId, fecha: dia.fecha })
}

/** Los meses distintos del detalle, de más antiguo a más reciente: «marzo y abril» (§9 l.1288). */
function mesesDelDetalle(detalle: readonly DetalleLocal[]): AnioMes[] {
  const meses: AnioMes[] = []
  for (const entrada of detalle) {
    if (!meses.some((mes) => compararMeses(mes, entrada.mes) === 0)) {
      meses.push(entrada.mes)
    }
  }
  return meses.sort(compararMeses)
}
```

Tres detalles de la implementación:
- `tiposQueCobran` se calcula una sola vez por día, no por local: casi todos los días está vacío y `cobrarLocales` sale en la primera línea sin recorrer nada más.
- El `cobradoHasta` se actualiza **dentro** del `forEach`, antes de mirar si hubo detalle: un local cerrado todo el mes o con impuesto 0 también tiene que quedar cobrado hasta ese mes (T30), aunque no entre en el `detalle` que arma el movimiento.
- `mesesDelDetalle` deduplica con `compararMeses` (no con `===`, porque cada entrada del detalle crea su propio objeto `AnioMes`) y ordena de más antiguo a más reciente para que `conceptoLocales` escriba «marzo y abril», nunca al revés.

- [ ] **Paso 4: Enganchar `cobrarLocales` en `pasoCobros`**

En `src/dominio/motor/pasos/cobros.ts`, sustituye:

```ts
import { ocurreEl } from '../../calendario/recurrencia'
import { CATEGORIA } from '../../catalogo/inicial'
import type { Importe } from '../../dinero/importe'
import { conEfecto, pctDeIngresos } from '../../eventos/efectos'
import type { Movimiento } from '../../modelo/movimientos'
import { habitantesDe } from '../../poblacion/habitantes'
import { cobrar } from '../caja'
import { anadirMovimiento, aplicarProgramado, type Contexto, type Dia } from '../contexto'
import { acumularDiario } from '../diarios'
import { conceptoBeneficio } from '../textos'

/** Paso 8 sin los locales: impuestos y rentas, beneficios, ingresos recurrentes y cobros programados, en ese orden (§9 l.1280). */
export function pasoCobros(ctx: Contexto, dia: Dia): void {
  cobrarImpuestosYRentas(ctx, dia)
  cobrarBeneficios(ctx, dia)
  cobrarIngresosRecurrentes(ctx, dia)
  cobrarProgramados(ctx, dia)
}
```

por esto, que añade el import de `cobrarLocales` y su llamada entre los impuestos y los beneficios:

```ts
import { ocurreEl } from '../../calendario/recurrencia'
import { CATEGORIA } from '../../catalogo/inicial'
import type { Importe } from '../../dinero/importe'
import { conEfecto, pctDeIngresos } from '../../eventos/efectos'
import type { Movimiento } from '../../modelo/movimientos'
import { habitantesDe } from '../../poblacion/habitantes'
import { cobrar } from '../caja'
import { anadirMovimiento, aplicarProgramado, type Contexto, type Dia } from '../contexto'
import { acumularDiario } from '../diarios'
import { conceptoBeneficio } from '../textos'
import { cobrarLocales } from './locales'

/** Paso 8: impuestos y rentas, locales, beneficios, ingresos recurrentes y cobros programados, en ese orden (§9 l.1280). */
export function pasoCobros(ctx: Contexto, dia: Dia): void {
  cobrarImpuestosYRentas(ctx, dia)
  cobrarLocales(ctx, dia)
  cobrarBeneficios(ctx, dia)
  cobrarIngresosRecurrentes(ctx, dia)
  cobrarProgramados(ctx, dia)
}
```

El resto de `cobros.ts` (`programadosDelDia`, `ingresoDe`, `cobrarImpuestosYRentas`, `cobrarBeneficios`, `cobrarIngresosRecurrentes`, `cobrarProgramados`) no cambia.

- [ ] **Paso 5: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/pasos/locales.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  11:59:42
   Duration  0.82s (transform 62%, import 34%, tests 3%, worker 1%)
```

- [ ] **Paso 6: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **730 pruebas en 62 archivos**; `npm run lint` solo escribe su cabecera y sale con código 0. La tarea 15 dejó 720 pruebas en 61 archivos, y esta trae **10 nuevas**: las 9 de `locales.test.ts` (las 8 de `cobrarLocales` y la del orden dentro de `pasoCobros`) y **una más** en `pureza.test.ts`, que ahora recorre también `motor/pasos/locales.ts`. `cobros.test.ts` (tarea 15) sigue pasando sin cambios: la llamada nueva a `cobrarLocales` no altera ninguno de sus días de prueba, porque ninguno coincide con el día de cobro de un tipo de local.

```text
 Test Files  62 passed (62)
      Tests  730 passed (730)
```

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/motor/pasos/cobros.ts src/dominio/motor/pasos/locales.ts src/dominio/motor/pasos/locales.test.ts
git commit -m "feat(motor): paso 8, cobro de los impuestos de locales con su detalle" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo nuevo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/motor/pasos/locales.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/pasos/locales.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 af7d3db] feat(motor): paso 8, cobro de los impuestos de locales con su detalle
 3 files changed, 327 insertions(+), 1 deletion(-)
 create mode 100644 src/dominio/motor/pasos/locales.test.ts
 create mode 100644 src/dominio/motor/pasos/locales.ts
```

**Avisos que esta tarea deja escritos:**

1. `cobrarLocales` no aplica ningún efecto de evento: la especificación lo dice expresamente (§9 l.1311) y `locales/impuesto.ts` (tarea 8) tampoco recibe `dia.eventos`.
2. El orden dentro de `cobrarLocalesDe` es: por local (orden del array) y, dentro de cada uno, por mes (orden de `mesesPorCobrar`, de más antiguo a más reciente); el detalle final se ordena por local primero y no por mes, como muestra la prueba de «marzo y abril» (Herrería 1 · 3, Herrería 1 · 4, Posada · 4, …).
3. La tarea 28 (entregable de la fase) vuelve a comprobar el cobro de locales del 1 de mayo dentro de la simulación completa de 19 días; esta tarea ya lo prueba de forma aislada y a través de `pasoCobros`.

---

### Tarea 17 · Paso 9: pagos

El paso 9 del motor (§9 l.1281): salarios, soldadas, tributos, gastos recurrentes de J5 y pagos programados sin vínculo, en ese orden, sin dejar nunca una caja en negativo. Cada fila (cada trabajador, cada tributo, cada gasto, cada pago programado) hace `debido → pagarHasta → impago = debido − pagado` (tarea 13) y deja un suceso `pago` que alimenta el aviso «Pago no cubierto» de la tarea 20. Salarios y soldadas comparten la misma función `pagarPlantilla`, porque la especificación las trata igual (§9 l.1287): una fila por trabajador o unidad, agrupadas en un solo movimiento por asentamiento y día, con las filas «Cada día» al acumulado del avance (tarea 14) en vez de al movimiento.

Usa `pctDeCostes` y `habitantesDe` (tarea 7); `anadirObjetoComprado` (tarea 12); `pagarHasta`, `anadirMovimiento`, `aplicarProgramado`, `Contexto`/`Dia`, `registrarImpago`/`sumarAlCargo` (tarea 13); `acumularDiario` (tarea 14); `conceptoSalarios`, `conceptoSoldadas`, `contraparteDeSalarios`, `contraparteDeSoldadas` y `nombreDeOficio` (tarea 11); y `programadosDelDia` de `motor/pasos/cobros.ts` (tarea 15), con `tipo: 'gasto'` en vez de `'ingreso'`.

Dos ayudantes locales:
- `gastoDe(pagado, origen, exacto)`: el `Importe` de un pago, en negativo, con lo tecleado de su origen solo si se pagó exactamente esa base (técnica 8, T8) — el mismo criterio que `ingresoDe` en `cobros.ts`, pero restando.
- `anotarImpago(ctx, impago, diario)`: si no hay nada que anotar (`importe <= 0`), no hace nada; si la fila no es diaria, abre un cargo nuevo con `registrarImpago`; si es diaria, reutiliza el cargo que ya se abrió ese mismo avance y origen (`ctx.cargosDiarios`, tarea 13) y le suma con `sumarAlCargo`, para que un gasto diario sin dinero varios días seguidos deje un solo cargo, con la fecha del primer día que faltó (D-021).

**Reglas de la especificación que implementa:**

- **Orden del paso 9 (§9 l.1281).** «9. Pagos: salarios, soldadas, tributos, gastos recurrentes y pagos programados.» (técnica 10.)
- **Pagos por filas e impagos (§9 l.1291-1293).** «Los pagos se hacen por filas, en el orden de la tabla. Queda como impago solo lo que no se paga, con aviso rojo.» «El motor nunca deja una caja en negativo. Si la caja ya está en negativo por una acción manual, sus pagos quedan como impagos.»
- **Contraparte automática (§9 l.1294; D-023).** «Salarios → «Trabajadores de Bree»; soldadas → «Guarnición de Bree»; tributos → su destinatario o, si no tiene, su concepto; gastos recurrentes y pagos programados → su concepto («Posada El Poney Pisador»).»
- **Persona reutilizada (§9 l.1295).** «Se reutiliza la persona con el mismo nombre normalizado. Si hay que crearla, P4 avisa (…) y se crea al confirmar, porque simular() no guarda nada.» Lo resuelve `personaPara`, que llama `registrarImpago` (tarea 13); esta tarea no la llama directamente.
- **Una deuda de impago por origen (§9 l.1296).** «Hay una deuda de impago por origen, sin interés ni vencimiento, que acumula los impagos sucesivos mientras esté abierta.»
- **Pagos parciales (D-020).** «Si una caja no llega para un pago, se paga fila a fila lo que haya y solo lo que falta queda como impago. El movimiento lleva lo que se pagó de verdad; si no se pudo pagar nada, no hay movimiento, salvo en un pago programado, que se queda en el libro aunque sea con 0.»
- **Gastos diarios con impago (D-021).** «En un gasto diario con impago, «· 7 noches» cuenta solo los días que se pagaron, y lo que faltó va a la deuda en un solo cargo por avance, con la fecha del primer día sin dinero.»
- **Gastos de J5 y eventos (D-026).** «Un evento con efecto sobre «gastos» cambia los gastos recurrentes que se pagan desde la caja de ese asentamiento (…). Los pagos programados (…) nunca cambian con un evento.» Un asentamiento no tiene otros gastos recurrentes de J5, así que solo estos comprueban `pctDeCostes`.
- **Objeto pendiente de un pago programado (§7 l.1173; D-034).** «"Añadir también al inventario" (…) crea una fila nueva, salvo que exista otra con el mismo nombre, ubicación y valor por unidad, que se suma (…). Con fecha futura, el objeto se crea al aplicarse el movimiento.» D-034: «(…) crea el objeto al aplicarse aunque la caja no llegue a pagarlo entero; lo que falta queda como impago.»

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/motor/pasos/pagos.ts`
- Prueba: `src/dominio/motor/pasos/pagos.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Qué comprueba cada bloque de `pagos.test.ts`:
- `salarios y soldadas`: los salarios del 13 de abril, un movimiento de −420.000 con las 5 filas y «Salarios de 14 trabajadores», sin impagos; con 3 mo en la caja frente a 4,2 mo, paga las filas por orden, la frontera a medias (Cerveceros con 30.000 de 80.000), y 1,2 mo quedan como impago con «Trabajadores de Bree», que se añade a `personasNuevas`; una caja ya en negativo no paga nada, sin movimiento y todo impago; las soldadas del 24 de abril con «Soldada de la guarnición» y una fila por unidad; las soldadas que no se pagan quedan como impago con «Guarnición de Bree».
- `tributos`: el de Archet del 19 de abril se paga entero, −6.000.000 con «60 mo»; pagado a medias va sin lo tecleado y su impago es con el destinatario, que ya existe (sin persona nueva); un tributo sin destinatario que no se paga tiene por contraparte su concepto, y esa sí crea persona nueva.
- `gastos recurrentes de J5`: un gasto pagado desde la caja de Bree cambia con un evento de «gastos»; el que se paga desde la bolsa del personaje, nunca (D-026); uno que no se paga deja la deuda en su `cuentaId`, con su concepto como contraparte.
- `pagos programados`: uno que se paga entero se aplica con su importe y lo tecleado, igual que estaba; pagado a medias guarda lo pagado sin lo tecleado, y sin nada pagado se queda con 0, nunca `−0` (D-020, con `Object.is`); uno con objeto pendiente crea el objeto aunque no se pague entero, y el movimiento pierde la clave `objetoPendiente` (D-034).
- `por filas y en el orden de la tabla`: con una caja de 5 mo, paga salarios y soldadas enteros, el tributo a medias y nada del gasto de J5, en ese orden y con esos importes exactos (§9 l.1281 y l.1292).
- `gastos diarios sin dinero`: la posada («Cada día») que se queda sin dinero a mitad del avance paga 3 noches de 7 y deja un solo cargo de impago, fechado el primer día sin dinero (D-021).

Crea `src/dominio/motor/pasos/pagos.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { aNumeroDeDia, compararFechas, type Fecha } from '../../calendario/fecha'
import { CATEGORIA } from '../../catalogo/inicial'
import { eventosDeDineroEl } from '../../eventos/efectos'
import { DOM, IMPUESTO, PERSONA, TRABAJADOR, UNIDAD } from '../../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../../ejemplo/sombraDelEste'
import type { Deuda } from '../../modelo/deudas'
import { estadoDe, type EstadoPartida } from '../../modelo/documento'
import type { Movimiento, RecurrenteDinero } from '../../modelo/movimientos'
import { crearContexto, type Contexto, type Dia } from '../contexto'
import { cerrarDiarios } from '../diarios'
import { idsEnSerie } from '../ids'
import { conAsentamiento, congelar, estadoMinimo } from '../pruebas/constructores'
import { pasoPagos } from './pagos'

/** El avance de prueba: todo lo que crea o aplica lleva este avanceId. */
const AVANCE_PRUEBA = 'av.prueba'

/** Un día de abril de 1640. */
function fecha(dia: number): Fecha {
  return { anio: 1640, mes: 4, dia }
}

/** El 12 de abril de 1640, la fecha actual de todas las pruebas. */
const HOY = fecha(12)

/** El id del personaje de una partida mínima: el primer dominio. */
const THARAN = estadoMinimo(HOY).dominios[0].id

/** La partida de ejemplo del 12 de abril, sin la lista de avances. */
function ejemplo(): EstadoPartida {
  return estadoDe(documentoDeEjemplo())
}

/** Un contexto sobre la entrada congelada: si el paso escribiera en ella, la prueba lanzaría. */
function contexto(estado: EstadoPartida, hasta: Fecha): Contexto {
  return crearContexto(congelar(estado), hasta, {
    avanceId: AVANCE_PRUEBA,
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
}

/** El día tal como lo deja el paso 1: con los eventos de dinero activos. */
function diaDe(ctx: Contexto, f: Fecha): Dia {
  return {
    fecha: f,
    numero: aNumeroDeDia(f),
    primero: compararFechas(f, ctx.primerDia) === 0,
    eventos: eventosDeDineroEl(ctx.estado.eventos, f),
  }
}

/** Los movimientos que el avance de prueba ha creado o aplicado. */
function delAvance(ctx: Contexto): Movimiento[] {
  return ctx.movimientos.filter((m) => m.avanceId === AVANCE_PRUEBA)
}

/** Los movimientos del avance que salen de una regla de ese tipo. */
function deLaRegla(ctx: Contexto, tipo: string, id: string): Movimiento[] {
  return delAvance(ctx).filter((m) => m.regla?.tipo === tipo && m.regla.id === id)
}

/** Las deudas de impago que ha creado o tocado el avance de prueba. */
function impagos(ctx: Contexto): Deuda[] {
  return ctx.deudas.filter((d) => d.impago)
}

/** El nombre de la persona o entidad de una deuda. */
function contraparte(ctx: Contexto, deuda: Deuda): string | undefined {
  return ctx.personas.find((p) => p.id === deuda.contraparteId)?.nombre
}

/** Un gasto recurrente de J5 de Tharan, mensual el día 20, que se paga desde `cuentaId`. */
function gastoMensual(id: string, concepto: string, base: number, cuentaId: string): RecurrenteDinero {
  return {
    id,
    dominioId: DOM.tharan,
    tipo: 'gasto',
    concepto,
    importe: { base, introducido: { cantidad: String(base / 100000), moneda: 'mo' } },
    categoriaId: CATEGORIA.otros,
    cuentaId,
    recurrencia: { tipo: 'mensual', diaMes: 20 },
    activo: true,
  }
}

/** Un pago programado suelto de la bolsa del personaje de la partida mínima. */
function pagoProgramado(id: string, concepto: string, base: number, extra: Partial<Movimiento> = {}): Movimiento {
  return {
    id,
    dominioId: THARAN,
    fecha: fecha(20),
    tipo: 'gasto',
    importe: { base: -base, introducido: { cantidad: String(base / 100000), moneda: 'mo' } },
    categoriaId: CATEGORIA.otros,
    concepto,
    origen: 'manual',
    programado: true,
    ...extra,
  }
}

describe('pasoPagos: salarios y soldadas', () => {
  it('los salarios del 13 de abril: un movimiento de −420.000 con las 5 filas y «Salarios de 14 trabajadores»', () => {
    const ctx = contexto(ejemplo(), fecha(13))
    pasoPagos(ctx, diaDe(ctx, fecha(13)))
    expect(deLaRegla(ctx, 'salarios', DOM.bree)).toEqual([
      {
        id: expect.any(String),
        dominioId: DOM.bree,
        fecha: fecha(13),
        tipo: 'gasto',
        importe: { base: -420000 },
        categoriaId: CATEGORIA.salarios,
        concepto: 'Salarios de 14 trabajadores',
        origen: 'avance',
        avanceId: AVANCE_PRUEBA,
        regla: { tipo: 'salarios', id: DOM.bree },
        detalleTrabajo: [
          { origenId: TRABAJADOR.granjeros, nombre: 'Granjeros', numero: 6, importe: { base: 180000 } },
          { origenId: TRABAJADOR.lenadores, nombre: 'Leñadores', numero: 3, importe: { base: 90000 } },
          { origenId: TRABAJADOR.cerveceros, nombre: 'Cerveceros', numero: 2, importe: { base: 80000 } },
          { origenId: TRABAJADOR.canteros, nombre: 'Canteros', numero: 2, importe: { base: 60000 } },
          { origenId: TRABAJADOR.pastores, nombre: 'Pastor', numero: 1, importe: { base: 10000 } },
        ],
        programado: false,
      },
    ])
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000 - 420000)
    expect(ctx.sucesos).toContainEqual({
      tipo: 'pago',
      origen: { tipo: 'salarios', id: DOM.bree },
      dominioId: DOM.bree,
      fecha: fecha(13),
      debido: 420000,
      pagado: 420000,
      que: { clase: 'salarios' },
      diario: false,
    })
    expect(impagos(ctx)).toEqual([])
  })

  it('con 3 mo en la caja frente a 4,2 mo paga las filas por orden, la frontera a medias, y 1,2 mo quedan como impago (§9 l.1292)', () => {
    const ctx = contexto(ejemplo(), fecha(13))
    ctx.saldos.set(DOM.bree, 300000)
    pasoPagos(ctx, diaDe(ctx, fecha(13)))
    const [salarios] = deLaRegla(ctx, 'salarios', DOM.bree)
    expect(salarios.importe).toEqual({ base: -300000 })
    expect(salarios.concepto).toBe('Salarios de 11 trabajadores')
    expect(salarios.detalleTrabajo).toEqual([
      { origenId: TRABAJADOR.granjeros, nombre: 'Granjeros', numero: 6, importe: { base: 180000 } },
      { origenId: TRABAJADOR.lenadores, nombre: 'Leñadores', numero: 3, importe: { base: 90000 } },
      { origenId: TRABAJADOR.cerveceros, nombre: 'Cerveceros', numero: 2, importe: { base: 30000 } },
    ])
    expect(ctx.saldos.get(DOM.bree)).toBe(0)
    const [deuda] = impagos(ctx)
    expect(deuda).toEqual({
      id: expect.any(String),
      dominioId: DOM.bree,
      sentido: 'debo',
      contraparteId: expect.any(String),
      fecha: fecha(13),
      principal: { base: 120000 },
      interesPct: 0,
      estado: 'abierta',
      impago: true,
      origenImpago: { tipo: 'salarios', id: DOM.bree },
      cargos: [{ fecha: fecha(13), importe: { base: 120000 }, avanceId: AVANCE_PRUEBA }],
      pagos: [],
      devengos: [],
    })
    expect(contraparte(ctx, deuda)).toBe('Trabajadores de Bree')
    expect(ctx.personasNuevas.map((p) => p.nombre)).toEqual(['Trabajadores de Bree'])
  })

  it('una caja que ya está en negativo no paga nada: todo es impago y no hay movimiento (§9 l.1293)', () => {
    const ctx = contexto(ejemplo(), fecha(13))
    ctx.saldos.set(DOM.bree, -1000000)
    pasoPagos(ctx, diaDe(ctx, fecha(13)))
    expect(deLaRegla(ctx, 'salarios', DOM.bree)).toEqual([])
    expect(ctx.saldos.get(DOM.bree)).toBe(-1000000)
    expect(impagos(ctx).map((d) => d.principal.base)).toEqual([420000])
    expect(ctx.sucesos).toContainEqual(expect.objectContaining({ tipo: 'pago', debido: 420000, pagado: 0 }))
  })

  it('las soldadas del 24 de abril: «Soldada de la guarnición» con una fila por unidad y su nombre', () => {
    const ctx = contexto(ejemplo(), fecha(24))
    pasoPagos(ctx, diaDe(ctx, fecha(24)))
    const [soldadas] = deLaRegla(ctx, 'soldadas', DOM.bree)
    expect(soldadas.importe).toEqual({ base: -580000 })
    expect(soldadas.concepto).toBe('Soldada de la guarnición')
    expect(soldadas.categoriaId).toBe(CATEGORIA.soldadas)
    expect(soldadas.detalleTrabajo).toEqual([
      { origenId: UNIDAD.guardias, nombre: 'Guardias de la puerta', numero: 6, importe: { base: 180000 } },
      { origenId: UNIDAD.arqueros, nombre: 'Arqueros de la empalizada', numero: 4, importe: { base: 200000 } },
      { origenId: UNIDAD.capitan, nombre: 'Capitán de la guardia', numero: 1, importe: { base: 200000 } },
    ])
  })

  it('las soldadas que no se pagan quedan como impago con «Guarnición de Bree»', () => {
    const ctx = contexto(ejemplo(), fecha(24))
    ctx.saldos.set(DOM.bree, 0)
    pasoPagos(ctx, diaDe(ctx, fecha(24)))
    expect(deLaRegla(ctx, 'soldadas', DOM.bree)).toEqual([])
    const [deuda] = impagos(ctx)
    expect(deuda.origenImpago).toEqual({ tipo: 'soldadas', id: DOM.bree })
    expect(deuda.principal).toEqual({ base: 580000 })
    expect(contraparte(ctx, deuda)).toBe('Guarnición de Bree')
  })
})

describe('pasoPagos: tributos', () => {
  it('el tributo de Archet del 19 de abril se paga entero: −6.000.000 con «60 mo» (T8)', () => {
    const ctx = contexto(ejemplo(), fecha(19))
    pasoPagos(ctx, diaDe(ctx, fecha(19)))
    const [tributo] = deLaRegla(ctx, 'tributo', IMPUESTO.tributoArchet)
    expect(tributo.dominioId).toBe(DOM.archet)
    expect(tributo.importe).toEqual({ base: -6000000, introducido: { cantidad: '60', moneda: 'mo' } })
    expect(tributo.categoriaId).toBe(CATEGORIA.tributos)
    expect(tributo.concepto).toBe('Tributo a la Corona')
    expect(ctx.saldos.get(DOM.archet)).toBe(2500000)
    expect(ctx.sucesos).toContainEqual({
      tipo: 'pago',
      origen: { tipo: 'tributo', id: IMPUESTO.tributoArchet },
      dominioId: DOM.archet,
      fecha: fecha(19),
      debido: 6000000,
      pagado: 6000000,
      que: { clase: 'tributo' },
      diario: false,
    })
  })

  it('un tributo pagado a medias va sin lo introducido y su impago es con el destinatario, que ya existe', () => {
    const ctx = contexto(ejemplo(), fecha(19))
    ctx.saldos.set(DOM.archet, 5000000)
    pasoPagos(ctx, diaDe(ctx, fecha(19)))
    expect(deLaRegla(ctx, 'tributo', IMPUESTO.tributoArchet)[0].importe).toEqual({ base: -5000000 })
    const [deuda] = impagos(ctx)
    expect(deuda.origenImpago).toEqual({ tipo: 'tributo', id: IMPUESTO.tributoArchet })
    expect(deuda.dominioId).toBe(DOM.archet)
    expect(deuda.principal).toEqual({ base: 1000000 })
    expect(deuda.contraparteId).toBe(PERSONA.corona)
    expect(ctx.personasNuevas).toEqual([])
  })

  it('un tributo sin destinatario que no se paga tiene por contraparte su concepto (§9 l.1294)', () => {
    const base = ejemplo()
    const estado: EstadoPartida = {
      ...base,
      impuestosRentas: base.impuestosRentas.map((i) =>
        i.id === IMPUESTO.tributoArchet ? { ...i, destinatarioId: undefined } : i,
      ),
    }
    const ctx = contexto(estado, fecha(19))
    ctx.saldos.set(DOM.archet, 0)
    pasoPagos(ctx, diaDe(ctx, fecha(19)))
    expect(deLaRegla(ctx, 'tributo', IMPUESTO.tributoArchet)).toEqual([])
    const [deuda] = impagos(ctx)
    expect(deuda.principal).toEqual({ base: 6000000 })
    expect(contraparte(ctx, deuda)).toBe('Tributo a la Corona')
    expect(ctx.personasNuevas.map((p) => p.nombre)).toEqual(['Tributo a la Corona'])
  })
})

describe('pasoPagos: gastos recurrentes de J5', () => {
  it('un gasto pagado desde la caja de Bree cambia con un evento de «gastos»; el de la bolsa, nunca (D-026)', () => {
    const base = ejemplo()
    const estado: EstadoPartida = {
      ...base,
      recurrentes: [
        ...base.recurrentes,
        gastoMensual('rec.prueba.forraje', 'Forraje del establo de Bree', 100000, DOM.bree),
        gastoMensual('rec.prueba.herrero', 'Herraduras del poni', 100000, DOM.tharan),
      ],
      eventos: [
        ...base.eventos,
        {
          id: 'ev.prueba.escasez',
          dominioId: DOM.bree,
          nombre: 'Escasez de forraje',
          inicio: fecha(20),
          duracionDias: 1,
          efectos: [{ ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'gastos' }, pct: 50 }],
        },
      ],
    }
    const ctx = contexto(estado, fecha(20))
    pasoPagos(ctx, diaDe(ctx, fecha(20)))
    const [forraje] = deLaRegla(ctx, 'recurrente', 'rec.prueba.forraje')
    expect(forraje.dominioId).toBe(DOM.bree)
    expect(forraje.importe).toEqual({ base: -150000 })
    const [herraduras] = deLaRegla(ctx, 'recurrente', 'rec.prueba.herrero')
    expect(herraduras.dominioId).toBe(DOM.tharan)
    expect(herraduras.importe).toEqual({ base: -100000, introducido: { cantidad: '1', moneda: 'mo' } })
  })

  it('un gasto de J5 que no se paga deja la deuda en su cuentaId, con su concepto como contraparte (T25)', () => {
    const base = ejemplo()
    const estado: EstadoPartida = {
      ...base,
      recurrentes: [...base.recurrentes, gastoMensual('rec.prueba.diezmo', 'Diezmo al templo', 100000, DOM.archet)],
    }
    const ctx = contexto(estado, fecha(20))
    ctx.saldos.set(DOM.archet, 0)
    pasoPagos(ctx, diaDe(ctx, fecha(20)))
    expect(deLaRegla(ctx, 'recurrente', 'rec.prueba.diezmo')).toEqual([])
    const [deuda] = impagos(ctx)
    expect(deuda.dominioId).toBe(DOM.archet)
    expect(deuda.origenImpago).toEqual({ tipo: 'recurrente', id: 'rec.prueba.diezmo' })
    expect(contraparte(ctx, deuda)).toBe('Diezmo al templo')
  })
})

describe('pasoPagos: pagos programados', () => {
  it('un pago programado que se paga entero se aplica con su importe y lo introducido', () => {
    const estado: EstadoPartida = {
      ...estadoMinimo(HOY),
      movimientos: [pagoProgramado('mov.prueba.cuerda', 'Cuerda élfica', 100000)],
    }
    const ctx = contexto(estado, fecha(20))
    ctx.saldos.set(THARAN, 200000)
    pasoPagos(ctx, diaDe(ctx, fecha(20)))
    expect(ctx.movimientos).toEqual([
      { ...pagoProgramado('mov.prueba.cuerda', 'Cuerda élfica', 100000), programado: false, avanceId: AVANCE_PRUEBA },
    ])
    expect(ctx.saldos.get(THARAN)).toBe(100000)
    expect(impagos(ctx)).toEqual([])
  })

  it('pagado a medias guarda lo pagado sin lo introducido; sin nada pagado se queda con 0, nunca −0 (D-020)', () => {
    const estado: EstadoPartida = {
      ...estadoMinimo(HOY),
      movimientos: [
        pagoProgramado('mov.prueba.cuerda', 'Cuerda élfica', 100000),
        pagoProgramado('mov.prueba.botas', 'Botas de viaje', 50000),
      ],
    }
    const ctx = contexto(estado, fecha(20))
    ctx.saldos.set(THARAN, 40000)
    pasoPagos(ctx, diaDe(ctx, fecha(20)))
    const [cuerda, botas] = ctx.movimientos
    expect(cuerda).toMatchObject({ importe: { base: -40000 }, programado: false, avanceId: AVANCE_PRUEBA })
    expect(cuerda.importe.introducido).toBeUndefined()
    expect(botas).toMatchObject({ programado: false, avanceId: AVANCE_PRUEBA })
    expect(Object.is(botas.importe.base, 0)).toBe(true)
    expect(impagos(ctx).map((d) => [d.origenImpago?.id, d.principal.base, contraparte(ctx, d)])).toEqual([
      ['mov.prueba.cuerda', 60000, 'Cuerda élfica'],
      ['mov.prueba.botas', 50000, 'Botas de viaje'],
    ])
  })

  it('un pago programado con objeto pendiente crea el objeto aunque no se pague y el movimiento lo pierde (D-034)', () => {
    const pendiente = {
      nombre: 'Cuerda élfica',
      cantidad: 2,
      valorUnitario: { base: 50000 },
      ubicacion: { tipo: 'encima' as const },
    }
    const estado: EstadoPartida = {
      ...estadoMinimo(HOY),
      movimientos: [pagoProgramado('mov.prueba.cuerda', 'Cuerda élfica', 100000, { objetoPendiente: pendiente })],
    }
    const ctx = contexto(estado, fecha(20))
    pasoPagos(ctx, diaDe(ctx, fecha(20)))
    expect(ctx.objetos).toEqual([
      {
        id: expect.any(String),
        dominioId: THARAN,
        nombre: 'Cuerda élfica',
        cantidad: 2,
        valorUnitario: { base: 50000 },
        ubicacion: { tipo: 'encima' },
        movimientoCompraId: 'mov.prueba.cuerda',
      },
    ])
    const [cuerda] = ctx.movimientos
    expect('objetoPendiente' in cuerda).toBe(false)
    expect(cuerda.programado).toBe(false)
    expect(impagos(ctx).map((d) => d.principal.base)).toEqual([100000])
  })
})

describe('pasoPagos: por filas y en el orden de la tabla', () => {
  it('con 5 mo paga salarios y soldadas, el tributo a medias y nada del gasto de J5 (§9 l.1281 y l.1292)', () => {
    const inicio = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 500000 })
    const dia20 = { tipo: 'mensual', diaMes: 20 } as const
    const estado: EstadoPartida = {
      ...inicio,
      trabajadores: [
        {
          id: 'trab.prueba.albaniles',
          dominioId: 'dom.aldea',
          oficioId: 'oficio.albanil',
          numero: 2,
          salario: { base: 100000 },
          recurrencia: dia20,
        },
      ],
      unidadesGuarnicion: [
        {
          id: 'uni.prueba.guardia',
          dominioId: 'dom.aldea',
          tipoId: 'unidad.guardia',
          nombre: 'Guardia del puente',
          numero: 1,
          soldada: { base: 200000 },
          recurrencia: dia20,
        },
      ],
      impuestosRentas: [
        {
          id: 'imp.prueba.tributo',
          dominioId: 'dom.aldea',
          sentido: 'tributo',
          concepto: 'Tributo al señor',
          base: 'fija',
          importe: { base: 200000 },
          categoriaId: CATEGORIA.tributos,
          recurrencia: dia20,
        },
      ],
      recurrentes: [{ ...gastoMensual('rec.prueba.farol', 'Aceite del farol', 100000, 'dom.aldea'), dominioId: THARAN }],
    }
    const ctx = contexto(estado, fecha(20))
    pasoPagos(ctx, diaDe(ctx, fecha(20)))
    expect(
      ctx.sucesos.map((s) => (s.tipo === 'pago' ? [s.origen.tipo, s.debido, s.pagado] : [s.tipo])),
    ).toEqual([
      ['salarios', 200000, 200000],
      ['soldadas', 200000, 200000],
      ['tributo', 200000, 100000],
      ['recurrente', 100000, 0],
    ])
    expect(delAvance(ctx).map((m) => [m.concepto, m.importe.base])).toEqual([
      ['Salarios de 2 trabajadores', -200000],
      ['Soldada de la guarnición', -200000],
      ['Tributo al señor', -100000],
    ])
    expect(delAvance(ctx)[0].detalleTrabajo?.[0].nombre).toBe('Albañiles')
    expect(ctx.saldos.get('dom.aldea')).toBe(0)
  })
})

describe('pasoPagos: gastos diarios sin dinero', () => {
  it('la posada que se queda sin dinero a mitad: «· 3 noches» con lo pagado y un solo cargo desde el primer día sin dinero (D-021)', () => {
    const estado: EstadoPartida = {
      ...estadoMinimo(HOY),
      recurrentes: [
        {
          id: 'rec.prueba.posada',
          dominioId: THARAN,
          tipo: 'gasto',
          concepto: 'Posada El Poney Pisador',
          importe: { base: 10000, introducido: { cantidad: '1', moneda: 'mp' } },
          categoriaId: CATEGORIA.otros,
          cuentaId: THARAN,
          recurrencia: { tipo: 'diaria' },
          activo: true,
          unidadDiaria: 'noches',
        },
      ],
    }
    const ctx = contexto(estado, fecha(19))
    ctx.saldos.set(THARAN, 25000)
    for (let dia = 13; dia <= 19; dia++) {
      pasoPagos(ctx, diaDe(ctx, fecha(dia)))
    }
    cerrarDiarios(ctx)
    expect(delAvance(ctx)).toEqual([
      {
        id: expect.any(String),
        dominioId: THARAN,
        fecha: fecha(19),
        tipo: 'gasto',
        importe: { base: -25000 },
        categoriaId: CATEGORIA.otros,
        concepto: 'Posada El Poney Pisador · 3 noches',
        origen: 'avance',
        avanceId: AVANCE_PRUEBA,
        regla: { tipo: 'recurrente', id: 'rec.prueba.posada' },
        programado: false,
      },
    ])
    const [deuda] = impagos(ctx)
    expect(deuda.fecha).toEqual(fecha(15))
    expect(deuda.cargos).toEqual([{ fecha: fecha(15), importe: { base: 45000 }, avanceId: AVANCE_PRUEBA }])
    expect(deuda.principal).toEqual({ base: 45000 })
    expect(ctx.saldos.get(THARAN)).toBe(0)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/pasos/pagos.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./pagos`, que todavía no existe. La hora y la duración pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/pasos/pagos.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/pasos/pagos.test.ts [ src/dominio/motor/pasos/pagos.test.ts ]
Error: Cannot find module './pagos' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/pasos/pagos.test.ts
 ❯ src/dominio/motor/pasos/pagos.test.ts:14:1
     12| import { idsEnSerie } from '../ids'
     13| import { conAsentamiento, congelar, estadoMinimo } from '../pruebas/co…
     14| import { pasoPagos } from './pagos'
       | ^
     15|
     16| /** El avance de prueba: todo lo que crea o aplica lleva este avanceId…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:55:18
   Duration  0.70s (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `pagos.ts`**

Crea `src/dominio/motor/pasos/pagos.ts` con este contenido:

```ts
import { ocurreEl, type Recurrencia } from '../../calendario/recurrencia'
import { CATEGORIA } from '../../catalogo/inicial'
import type { Importe } from '../../dinero/importe'
import { conEfecto, pctDeCostes } from '../../eventos/efectos'
import { anadirObjetoComprado } from '../../inventario/compra'
import type { ImpuestoRenta } from '../../modelo/asentamiento'
import type { Id } from '../../modelo/comunes'
import type { DominioAsentamiento } from '../../modelo/dominios'
import type { DetalleTrabajo, Movimiento, ObjetoPendiente } from '../../modelo/movimientos'
import { habitantesDe } from '../../poblacion/habitantes'
import { pagarHasta } from '../caja'
import { anadirMovimiento, aplicarProgramado, type Contexto, type Dia } from '../contexto'
import { acumularDiario } from '../diarios'
import { registrarImpago, sumarAlCargo, type Impago } from '../impagos'
import {
  conceptoSalarios,
  conceptoSoldadas,
  contraparteDeSalarios,
  contraparteDeSoldadas,
  nombreDeOficio,
} from '../textos'
import { programadosDelDia } from './cobros'

/** Paso 9: salarios, soldadas, tributos, gastos recurrentes y pagos programados, por filas y sin dejar cajas en negativo (§9). */
export function pasoPagos(ctx: Contexto, dia: Dia): void {
  const asentamientos = ctx.estado.dominios.filter((d): d is DominioAsentamiento => d.tipo === 'asentamiento')
  const salarios = filasDelDia(ctx.estado.trabajadores, dia)
  for (const asentamiento of asentamientos) {
    const filas = (salarios.get(asentamiento.id) ?? []).map((trabajador) => ({
      id: trabajador.id,
      nombre: nombreDeOficio(ctx.opciones.catalogo, trabajador.oficioId, trabajador.numero),
      numero: trabajador.numero,
      porCabeza: trabajador.salario.base,
      diaria: trabajador.recurrencia.tipo === 'diaria',
    }))
    pagarPlantilla(ctx, dia, asentamiento, 'salarios', filas)
  }
  const soldadas = filasDelDia(ctx.estado.unidadesGuarnicion, dia)
  for (const asentamiento of asentamientos) {
    const filas = (soldadas.get(asentamiento.id) ?? []).map((unidad) => ({
      id: unidad.id,
      nombre: unidad.nombre,
      numero: unidad.numero,
      porCabeza: unidad.soldada.base,
      diaria: unidad.recurrencia.tipo === 'diaria',
    }))
    pagarPlantilla(ctx, dia, asentamiento, 'soldadas', filas)
  }
  pagarTributos(ctx, dia)
  pagarGastosRecurrentes(ctx, dia, new Set(asentamientos.map((asentamiento) => asentamiento.id)))
  pagarProgramados(ctx, dia)
}

/** Una fila de trabajadores o una unidad lista para pagar: lo que cobra cada uno y su nombre en el detalle. */
interface FilaDePlantilla {
  id: Id
  nombre: string
  numero: number
  porCabeza: number
  diaria: boolean
}

/** Las filas que cobran ese día, agrupadas por asentamiento y en el orden del array. */
function filasDelDia<T extends { dominioId: Id; recurrencia: Recurrencia }>(
  filas: readonly T[],
  dia: Dia,
): Map<Id, T[]> {
  const grupos = new Map<Id, T[]>()
  for (const fila of filas) {
    if (!ocurreEl(fila.recurrencia, dia.fecha)) {
      continue
    }
    const grupo = grupos.get(fila.dominioId)
    if (grupo === undefined) {
      grupos.set(fila.dominioId, [fila])
    } else {
      grupo.push(fila)
    }
  }
  return grupos
}

/** El importe de un pago: con lo introducido de su origen solo si se pagó exactamente esa base (T8). */
function gastoDe(pagado: number, origen: Importe, exacto: boolean): Importe {
  return exacto && origen.introducido !== undefined
    ? { base: -pagado, introducido: { ...origen.introducido } }
    : { base: -pagado }
}

/**
 * Anota lo que no se pudo pagar. Un pago que no es diario abre un cargo ese día; los diarios, un solo cargo por
 * avance y origen, con la fecha del primer día sin dinero, al que se suman los días siguientes (§9 l.1296; D-021).
 */
function anotarImpago(ctx: Contexto, impago: Impago, diario: boolean): void {
  if (impago.importe <= 0) {
    return
  }
  if (!diario) {
    registrarImpago(ctx, impago)
    return
  }
  const clave = `${impago.origen.tipo}|${impago.origen.id}`
  const abierto = ctx.cargosDiarios.get(clave)
  if (abierto === undefined) {
    ctx.cargosDiarios.set(clave, registrarImpago(ctx, impago))
  } else {
    sumarAlCargo(ctx, abierto, impago.importe)
  }
}

/**
 * Salarios o soldadas de un asentamiento un día, fila a fila (§9 l.1287 y l.1292). Las filas pagadas que no son
 * diarias forman un movimiento con su detalle; las «Cada día» van al acumulado del avance (D-029). Deja un suceso por
 * asentamiento y día con el total, que es lo que avisa «Pago no cubierto» (T21).
 */
function pagarPlantilla(
  ctx: Contexto,
  dia: Dia,
  asentamiento: DominioAsentamiento,
  clase: 'salarios' | 'soldadas',
  filas: readonly FilaDePlantilla[],
): void {
  const pct = pctDeCostes(dia.eventos, asentamiento.id, clase)
  const regla = { tipo: clase, id: asentamiento.id } as const
  const categoriaId = clase === 'salarios' ? CATEGORIA.salarios : CATEGORIA.soldadas
  const detalle: DetalleTrabajo[] = []
  let debidoTotal = 0
  let pagadoTotal = 0
  let impagoDelDia = 0
  let impagoDiario = 0
  let todasDiarias = true
  for (const fila of filas) {
    const debido = conEfecto(fila.numero * fila.porCabeza, pct)
    if (debido === 0) {
      continue
    }
    const pagado = pagarHasta(ctx, asentamiento.id, debido)
    debidoTotal += debido
    pagadoTotal += pagado
    if (fila.diaria) {
      impagoDiario += debido - pagado
    } else {
      impagoDelDia += debido - pagado
      todasDiarias = false
    }
    if (pagado === 0) {
      continue
    }
    const entrada: DetalleTrabajo = {
      origenId: fila.id,
      nombre: fila.nombre,
      numero: fila.numero,
      importe: { base: pagado },
    }
    if (fila.diaria) {
      acumularDiario(ctx, {
        clase,
        regla,
        dominioId: asentamiento.id,
        tipo: 'gasto',
        categoriaId,
        concepto: clase === 'salarios' ? conceptoSalarios(fila.numero) : conceptoSoldadas(),
        fecha: dia.fecha,
        importe: pagado,
        fila: entrada,
      })
    } else {
      detalle.push(entrada)
    }
  }
  if (debidoTotal === 0) {
    return
  }
  if (detalle.length > 0) {
    const trabajadores = detalle.reduce((suma, entrada) => suma + entrada.numero, 0)
    anadirMovimiento(ctx, {
      dominioId: asentamiento.id,
      fecha: dia.fecha,
      tipo: 'gasto',
      importe: { base: -detalle.reduce((suma, entrada) => suma + entrada.importe.base, 0) },
      categoriaId,
      concepto: clase === 'salarios' ? conceptoSalarios(trabajadores) : conceptoSoldadas(),
      regla,
      detalleTrabajo: detalle,
    })
  }
  const origen = { tipo: clase, id: asentamiento.id } as const
  const contraparte =
    clase === 'salarios' ? contraparteDeSalarios(asentamiento.nombre) : contraparteDeSoldadas(asentamiento.nombre)
  anotarImpago(ctx, { origen, dominioId: asentamiento.id, contraparte, fecha: dia.fecha, importe: impagoDelDia }, false)
  anotarImpago(ctx, { origen, dominioId: asentamiento.id, contraparte, fecha: dia.fecha, importe: impagoDiario }, true)
  ctx.sucesos.push({
    tipo: 'pago',
    origen,
    dominioId: asentamiento.id,
    fecha: dia.fecha,
    debido: debidoTotal,
    pagado: pagadoTotal,
    que: { clase },
    diario: todasDiarias,
  })
}

/** La contraparte de un tributo: su destinatario o, si no tiene, su concepto (§9 l.1294). Solo se busca si hay impago. */
function contraparteDeTributo(ctx: Contexto, tributo: ImpuestoRenta): string {
  const destinatario = ctx.personas.find((persona) => persona.id === tributo.destinatarioId)
  return destinatario === undefined ? tributo.concepto : destinatario.nombre
}

/** Tributos: fijos o por habitante, con los eventos de costes «tributos» (§9 l.1281; §7 l.1139). */
function pagarTributos(ctx: Contexto, dia: Dia): void {
  for (const tributo of ctx.estado.impuestosRentas) {
    if (tributo.sentido !== 'tributo' || !ocurreEl(tributo.recurrencia, dia.fecha)) {
      continue
    }
    const base =
      tributo.base === 'fija'
        ? tributo.importe.base
        : tributo.importe.base * habitantesDe(ctx.estado, tributo.dominioId, dia.fecha)
    const debido = conEfecto(base, pctDeCostes(dia.eventos, tributo.dominioId, 'tributos'))
    if (debido === 0) {
      continue
    }
    const pagado = pagarHasta(ctx, tributo.dominioId, debido)
    const diaria = tributo.recurrencia.tipo === 'diaria'
    const regla = { tipo: 'tributo', id: tributo.id } as const
    if (pagado > 0 && diaria) {
      acumularDiario(ctx, {
        clase: 'regla',
        regla,
        dominioId: tributo.dominioId,
        tipo: 'gasto',
        categoriaId: tributo.categoriaId,
        concepto: tributo.concepto,
        fecha: dia.fecha,
        importe: pagado,
      })
    } else if (pagado > 0) {
      anadirMovimiento(ctx, {
        dominioId: tributo.dominioId,
        fecha: dia.fecha,
        tipo: 'gasto',
        importe: gastoDe(pagado, tributo.importe, tributo.base === 'fija' && pagado === tributo.importe.base),
        categoriaId: tributo.categoriaId,
        concepto: tributo.concepto,
        regla,
      })
    }
    const origen = { tipo: 'tributo', id: tributo.id } as const
    if (pagado < debido) {
      const contraparte = contraparteDeTributo(ctx, tributo)
      const impago = { origen, dominioId: tributo.dominioId, contraparte, fecha: dia.fecha, importe: debido - pagado }
      anotarImpago(ctx, impago, diaria)
    }
    ctx.sucesos.push({
      tipo: 'pago',
      origen,
      dominioId: tributo.dominioId,
      fecha: dia.fecha,
      debido,
      pagado,
      que: { clase: 'tributo' },
      diario: diaria,
    })
  }
}

/**
 * Gastos recurrentes activos de J5, desde su cuentaId. Un evento de costes «gastos» solo los cambia si esa cuenta es
 * la caja de un asentamiento: la bolsa del personaje nunca cambia con un evento (D-026). El impago va a la cuentaId (T25).
 */
function pagarGastosRecurrentes(ctx: Contexto, dia: Dia, asentamientos: ReadonlySet<Id>): void {
  for (const gasto of ctx.estado.recurrentes) {
    if (gasto.tipo !== 'gasto' || !gasto.activo || !ocurreEl(gasto.recurrencia, dia.fecha)) {
      continue
    }
    const pct = asentamientos.has(gasto.cuentaId) ? pctDeCostes(dia.eventos, gasto.cuentaId, 'gastos') : 0
    const debido = conEfecto(gasto.importe.base, pct)
    if (debido === 0) {
      continue
    }
    const pagado = pagarHasta(ctx, gasto.cuentaId, debido)
    const diaria = gasto.recurrencia.tipo === 'diaria'
    const regla = { tipo: 'recurrente', id: gasto.id } as const
    if (pagado > 0 && diaria) {
      acumularDiario(ctx, {
        clase: 'regla',
        regla,
        dominioId: gasto.cuentaId,
        tipo: 'gasto',
        categoriaId: gasto.categoriaId,
        concepto: gasto.concepto,
        unidadDiaria: gasto.unidadDiaria,
        fecha: dia.fecha,
        importe: pagado,
      })
    } else if (pagado > 0) {
      anadirMovimiento(ctx, {
        dominioId: gasto.cuentaId,
        fecha: dia.fecha,
        tipo: 'gasto',
        importe: gastoDe(pagado, gasto.importe, pagado === gasto.importe.base),
        categoriaId: gasto.categoriaId,
        concepto: gasto.concepto,
        regla,
      })
    }
    const origen = { tipo: 'recurrente', id: gasto.id } as const
    const impago = {
      origen,
      dominioId: gasto.cuentaId,
      contraparte: gasto.concepto,
      fecha: dia.fecha,
      importe: debido - pagado,
    }
    anotarImpago(ctx, impago, diaria)
    ctx.sucesos.push({
      tipo: 'pago',
      origen,
      dominioId: gasto.cuentaId,
      fecha: dia.fecha,
      debido,
      pagado,
      que: { clase: 'concepto', concepto: gasto.concepto },
      diario: diaria,
    })
  }
}

/**
 * Pagos programados del día. El movimiento se aplica siempre (D-020): con su importe si se pagó entero y, si no, con
 * lo pagado y sin lo introducido. Si llevaba objeto pendiente, el objeto se crea aunque no se pague entero (D-034).
 */
function pagarProgramados(ctx: Contexto, dia: Dia): void {
  for (const movimiento of programadosDelDia(ctx, dia, 'gasto')) {
    const debido = -movimiento.importe.base
    const pagado = pagarHasta(ctx, movimiento.dominioId, debido)
    if (movimiento.objetoPendiente !== undefined) {
      pasarAlInventario(ctx, movimiento, movimiento.objetoPendiente)
    }
    aplicarProgramado(ctx, movimiento.id, pagado === debido ? {} : { importe: { base: pagado === 0 ? 0 : -pagado } })
    if (debido === 0) {
      continue
    }
    const origen = { tipo: 'programado', id: movimiento.id } as const
    const impago = {
      origen,
      dominioId: movimiento.dominioId,
      contraparte: movimiento.concepto,
      fecha: dia.fecha,
      importe: debido - pagado,
    }
    anotarImpago(ctx, impago, false)
    ctx.sucesos.push({
      tipo: 'pago',
      origen,
      dominioId: movimiento.dominioId,
      fecha: dia.fecha,
      debido,
      pagado,
      que: { clase: 'concepto', concepto: movimiento.concepto },
      diario: false,
    })
  }
}

/** Crea o suma el objeto pendiente en el inventario del personaje y lo quita del movimiento (§7 l.1173; D-034; T19). */
function pasarAlInventario(ctx: Contexto, movimiento: Movimiento, pendiente: ObjetoPendiente): void {
  const personaje = ctx.estado.dominios.find((dominio) => dominio.tipo === 'personaje')
  if (personaje === undefined) {
    throw new Error('No existe «personaje»')
  }
  const indice = ctx.indiceMovimiento.get(movimiento.id)
  if (indice === undefined) {
    throw new Error(`No existe «${movimiento.id}»`)
  }
  const objetos = anadirObjetoComprado(ctx.objetos, pendiente, {
    personajeId: personaje.id,
    movimientoId: movimiento.id,
    nuevoId: ctx.opciones.nuevoId,
  })
  ctx.objetos.splice(0, ctx.objetos.length, ...objetos)
  // Sin la clave: un gasto que deja de estar programado no puede llevar objeto pendiente (movimientos.ts).
  const sinPendiente: Movimiento = { ...movimiento }
  delete sinPendiente.objetoPendiente
  ctx.movimientos[indice] = sinPendiente
}
```

Cuatro detalles de la implementación:
- `pagarPlantilla` cuenta `debidoTotal`, `pagadoTotal`, `impagoDelDia` e `impagoDiario` por separado: una fila diaria y otra no diaria del mismo asentamiento y clase (caso raro, pero el esquema lo permite) no deben mezclar su impago en un solo cargo, porque uno va a un movimiento agrupado por avance y el otro al del día.
- `anadirMovimiento` para salarios y soldadas solo se llama si `detalle.length > 0`: con caja en negativo, todas las filas no diarias se quedan sin pagar y no hay movimiento, aunque `debidoTotal` no sea 0 (D-020).
- El suceso `pago` de `pagarPlantilla` se manda siempre que `debidoTotal > 0`, aunque no se haya pagado nada: es lo que necesita el aviso «Pago no cubierto» (tarea 20) para saber que ese día tocaba pagar.
- `pagarProgramados` llama `pasarAlInventario` **antes** de `aplicarProgramado`, porque `pasarAlInventario` necesita `ctx.indiceMovimiento` con el movimiento todavía como venía (con `objetoPendiente`); después, `aplicarProgramado` escribe el importe final sobre esa misma entrada, ya sin la clave.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/pasos/pagos.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  11:55:27
   Duration  0.96s (transform 64%, import 32%, tests 4%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **746 pruebas en 63 archivos**; `npm run lint` solo escribe su cabecera y sale con código 0. La tarea 16 dejó 730 pruebas en 62 archivos, y esta trae **16 nuevas**: las 15 de `pagos.test.ts` y **una más** en `pureza.test.ts`, que ahora recorre también `motor/pasos/pagos.ts`.

```text
 Test Files  63 passed (63)
      Tests  746 passed (746)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/pasos/pagos.ts src/dominio/motor/pasos/pagos.test.ts
git commit -m "feat(motor): paso 9, pagos de salarios, soldadas, tributos, recurrentes y programados, con impagos" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/motor/pasos/pagos.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/pasos/pagos.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 db8b348] feat(motor): paso 9, pagos de salarios, soldadas, tributos, recurrentes y programados, con impagos
 2 files changed, 880 insertions(+)
 create mode 100644 src/dominio/motor/pasos/pagos.test.ts
 create mode 100644 src/dominio/motor/pasos/pagos.ts
```

**Avisos que esta tarea deja escritos:**

1. `pasoPagos` no incluye la producción, el consumo ni los pasos 3, 4, 6 y 10 de §9: esta fase solo registra los pasos 1, 7, 8 y 9 (técnica 15), como ya fija el contrato.
2. El gasto recurrente de J5 con `cuentaId` igual a la bolsa del personaje (`THARAN`) nunca consulta `pctDeCostes`: el `Set` de asentamientos que recibe `pagarGastosRecurrentes` decide si hay que mirar eventos, y la bolsa nunca está en ese `Set` (D-026).
3. `sumarAlCargo` y `registrarImpago` (tarea 13) no comprueban por sí solas si el importe es `> 0`: es `anotarImpago`, aquí, quien filtra `importe <= 0` antes de llamarlas, para no abrir un cargo de impago vacío cuando una fila se pagó entera.

---

### Tarea 18 · Paso 7: vuelta de ventas

El paso 7 del motor (§9 l.1279), solo la parte de dinero: una caravana de venta que está «en ruta» y cuya vuelta ya llegó cobra su importe en el dominio que la mandó y queda «terminada». Las compras, los traslados y las ventas «programadas» no se tocan: esperan a la fase 4, que es cuando el motor mueve también los recursos del almacén (técnica 27). Es la tarea más pequeña de las cuatro: un solo recorrido, sin agrupar nada ni tocar impagos, porque una venta que vuelve siempre cobra entero (no hay «caja que no llega» en un cobro).

Usa `compararFechas` (fase 1); `cobrar`, `anadirMovimiento` y `Contexto`/`Dia` (tarea 13); y `conceptoVentaCaravana`/`nombreDeRecurso` (tarea 11).

**Reglas de la especificación que implementa:**

- **Venta (§7 l.1153).** «Venta: los recursos salen al salir y el dinero entra al volver. La carga no puede superar las existencias.» Aquí solo se implementa el cobro; la salida de los recursos y el resto de operaciones son de la fase 4 (técnica 27).
- **Vuelta pasada (§7 l.1159).** «Una caravana registrada con salida pasada calcula su vuelta desde la fecha real; si la vuelta ya pasó, se aplica el primer día del siguiente avance.»
- **Registros con fecha pasada o de hoy (§9 l.1321).** «Obras y caravanas calculan progreso y vuelta desde su fecha real; si la vuelta o el fin ya pasaron, se aplican el primer día del siguiente avance.»
- **Paso 7 del bucle (§9 l.1279).** «7. Llegada de caravanas y traslados.»
- **Ya cobra la vuelta de las ventas desde la fase 3 (D-019).** «Desde la fase 3, «Avanzar días» ya cobra los beneficios de las inversiones, aplica los eventos que cambian impuestos, rentas y pagos, y cobra la vuelta de las caravanas de venta. La hoja de ruta lo dejaba para las fases 4 y 5.» Sin esto, P4 (12 → 19 de abril) no llegaría a los 8 movimientos ni a los saldos que promete la fase 3.
- **Categoría según el recurso (D-011).** «Los movimientos de una caravana van a «Víveres del almacén» si llevan víveres y a «Comercio» en los demás casos.»
- **Vuelta de caravanas (técnica 27).** «Categoría según D-011; solo las ventas «enRuta»; las ventas «programadas» y las compras en ruta no se tocan hasta la fase 4. El recurso del concepto va con la primera letra en minúscula.»

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/motor/pasos/caravanas.ts`
- Prueba: `src/dominio/motor/pasos/caravanas.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Qué comprueba cada bloque de `caravanas.test.ts`, todos sobre la caravana de venta de cerveza en Fornost del ejemplo:
- vuelve el 18 de abril: cobra +2.400.000 en Bree con «Caravana: venta de cerveza en Fornost», `cat.comercio`, «24 mo» tecleados, `vinculo` a la caravana, la caravana queda `terminada` con su `movimientoVueltaId`, y un suceso `vueltaCaravana`.
- una venta cuya vuelta ya pasó (salida el 2, vuelta el 10) cobra el primer día del avance, con la fecha de ese día (§7 l.1159).
- antes de su vuelta no cobra nada, y una vuelta pasada solo se cobra el primer día (no todos los días posteriores).
- una venta de víveres va a «Víveres del almacén» y el recurso del concepto va en minúscula: «Caravana: venta de víveres en Fornost» (D-011, técnica 27).
- no toca la compra en ruta de Tharbad (otra operación) ni una venta «programada» (otro estado), aunque su fecha de vuelta ya haya llegado (técnica 27).

Crea `src/dominio/motor/pasos/caravanas.test.ts` con este contenido:

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

/** El avance de prueba: todo lo que crea lleva este avanceId. */
const AVANCE_PRUEBA = 'av.prueba'

/** Un día de abril de 1640. */
function fecha(dia: number): Fecha {
  return { anio: 1640, mes: 4, dia }
}

/** La partida de ejemplo del 12 de abril, con la caravana de Fornost cambiada si la prueba lo pide. */
function ejemplo(cambiarFornost: (caravana: Caravana) => Caravana = (caravana) => caravana): EstadoPartida {
  const base = estadoDe(documentoDeEjemplo())
  return {
    ...base,
    caravanas: base.caravanas.map((c) => (c.id === CARAVANA.ventaCervezaFornost ? cambiarFornost(c) : c)),
  }
}

/** Un contexto sobre la entrada congelada: si el paso escribiera en ella, la prueba lanzaría. */
function contexto(estado: EstadoPartida, hasta: Fecha): Contexto {
  return crearContexto(congelar(estado), hasta, {
    avanceId: AVANCE_PRUEBA,
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
}

/** El día tal como lo deja el paso 1: con los eventos de dinero activos. */
function diaDe(ctx: Contexto, f: Fecha): Dia {
  return {
    fecha: f,
    numero: aNumeroDeDia(f),
    primero: compararFechas(f, ctx.primerDia) === 0,
    eventos: eventosDeDineroEl(ctx.estado.eventos, f),
  }
}

/** Los movimientos que ha creado el avance de prueba. */
function delAvance(ctx: Contexto): Movimiento[] {
  return ctx.movimientos.filter((m) => m.avanceId === AVANCE_PRUEBA)
}

/** La caravana de ese id tal como la deja el paso. */
function caravana(ctx: Contexto, id: string): Caravana | undefined {
  return ctx.caravanas.find((c) => c.id === id)
}

describe('pasoVueltaDeVentas', () => {
  it('la cerveza de Fornost vuelve el 18: cobra +2.400.000 con «24 mo» y la caravana queda terminada', () => {
    const ctx = contexto(ejemplo(), fecha(19))
    pasoVueltaDeVentas(ctx, diaDe(ctx, fecha(18)))
    expect(delAvance(ctx)).toEqual([
      {
        id: 'sim.1',
        dominioId: DOM.bree,
        fecha: fecha(18),
        tipo: 'ingreso',
        importe: { base: 2400000, introducido: { cantidad: '24', moneda: 'mo' } },
        categoriaId: CATEGORIA.comercio,
        concepto: 'Caravana: venta de cerveza en Fornost',
        origen: 'avance',
        avanceId: AVANCE_PRUEBA,
        vinculo: { tipo: 'caravana', id: CARAVANA.ventaCervezaFornost },
        programado: false,
      },
    ])
    expect(caravana(ctx, CARAVANA.ventaCervezaFornost)).toMatchObject({
      estado: 'terminada',
      movimientoVueltaId: 'sim.1',
    })
    expect(ctx.saldos.get(DOM.bree)).toBe(34060000 + 2400000)
    expect(ctx.sucesos).toEqual([
      { tipo: 'vueltaCaravana', dominioId: DOM.bree, fecha: fecha(18), mercadoId: MERCADO.fornost },
    ])
  })

  it('una venta cuya vuelta ya pasó cobra el primer día del avance, con la fecha de ese día (§7 l.1159)', () => {
    const ctx = contexto(
      ejemplo((c) => ({ ...c, salida: fecha(2), vuelta: fecha(10) })),
      fecha(19),
    )
    pasoVueltaDeVentas(ctx, diaDe(ctx, fecha(13)))
    const [vuelta] = delAvance(ctx)
    expect(vuelta.fecha).toEqual(fecha(13))
    expect(vuelta.importe.base).toBe(2400000)
    expect(caravana(ctx, CARAVANA.ventaCervezaFornost)?.estado).toBe('terminada')
  })

  it('antes de su vuelta no cobra, y una vuelta pasada solo se cobra el primer día', () => {
    const aTiempo = contexto(ejemplo(), fecha(19))
    pasoVueltaDeVentas(aTiempo, diaDe(aTiempo, fecha(17)))
    expect(delAvance(aTiempo)).toEqual([])
    expect(caravana(aTiempo, CARAVANA.ventaCervezaFornost)?.estado).toBe('enRuta')

    const atrasada = contexto(
      ejemplo((c) => ({ ...c, salida: fecha(2), vuelta: fecha(10) })),
      fecha(19),
    )
    pasoVueltaDeVentas(atrasada, diaDe(atrasada, fecha(14)))
    expect(delAvance(atrasada)).toEqual([])
  })

  it('una venta de víveres va a «Víveres del almacén» y nombra el recurso en minúscula (D-011, T27)', () => {
    const ctx = contexto(
      ejemplo((c) => ({ ...c, carga: { recursoId: RECURSO.viveres, cantidad: 40 } })),
      fecha(19),
    )
    pasoVueltaDeVentas(ctx, diaDe(ctx, fecha(18)))
    const [vuelta] = delAvance(ctx)
    expect(vuelta.categoriaId).toBe(CATEGORIA.viveresDelAlmacen)
    expect(vuelta.concepto).toBe('Caravana: venta de víveres en Fornost')
  })

  it('no toca la compra en ruta de Tharbad ni una venta programada, aunque llegue su vuelta (T27)', () => {
    const tharbad = contexto(ejemplo(), fecha(25))
    pasoVueltaDeVentas(tharbad, diaDe(tharbad, fecha(25)))
    expect(delAvance(tharbad)).toEqual([])
    expect(caravana(tharbad, CARAVANA.compraViveresTharbad)?.estado).toBe('enRuta')

    const programada = contexto(
      ejemplo((c) => ({ ...c, estado: 'programada' })),
      fecha(19),
    )
    pasoVueltaDeVentas(programada, diaDe(programada, fecha(18)))
    expect(delAvance(programada)).toEqual([])
    expect(caravana(programada, CARAVANA.ventaCervezaFornost)?.estado).toBe('programada')
    expect(programada.saldos.get(DOM.bree)).toBe(34060000)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/pasos/caravanas.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./caravanas`, que todavía no existe. La hora y la duración pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/pasos/caravanas.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/pasos/caravanas.test.ts [ src/dominio/motor/pasos/caravanas.test.ts ]
Error: Cannot find module './caravanas' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/pasos/caravanas.test.ts
 ❯ src/dominio/motor/pasos/caravanas.test.ts:13:1
     11| import { idsEnSerie } from '../ids'
     12| import { congelar } from '../pruebas/constructores'
     13| import { pasoVueltaDeVentas } from './caravanas'
       | ^
     14|
     15| /** El avance de prueba: todo lo que crea lleva este avanceId. */

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:56:26
   Duration  0.75s (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `caravanas.ts`**

Crea `src/dominio/motor/pasos/caravanas.ts` con este contenido:

```ts
import { compararFechas } from '../../calendario/fecha'
import { CATEGORIA, RECURSO } from '../../catalogo/inicial'
import type { Importe } from '../../dinero/importe'
import { cobrar } from '../caja'
import { anadirMovimiento, type Contexto, type Dia } from '../contexto'
import { conceptoVentaCaravana, nombreDeRecurso } from '../textos'

/** Paso 7, solo dinero: una venta en ruta que vuelve (o ya volvió) cobra su importe y queda terminada (§7 l.1153, l.1159; D-019). */
export function pasoVueltaDeVentas(ctx: Contexto, dia: Dia): void {
  ctx.caravanas.forEach((caravana, indice) => {
    // Las compras, los traslados y las ventas programadas esperan a la fase 4 (T27).
    if (caravana.operacion !== 'venta' || caravana.estado !== 'enRuta') {
      return
    }
    if (caravana.importe === undefined || caravana.mercadoId === undefined) {
      return
    }
    // Vuelve hoy o, el primer día del avance, ya había vuelto antes (§7 l.1159; §9 l.1321).
    const vuelta = compararFechas(caravana.vuelta, dia.fecha)
    if (vuelta > 0 || (vuelta < 0 && !dia.primero)) {
      return
    }
    const mercadoId = caravana.mercadoId
    const mercado = ctx.estado.mercados.find((m) => m.id === mercadoId)
    if (mercado === undefined) {
      throw new Error(`No existe «${mercadoId}»`)
    }
    cobrar(ctx, caravana.dominioId, caravana.importe.base)
    const importe: Importe =
      caravana.importe.introducido === undefined
        ? { base: caravana.importe.base }
        : { base: caravana.importe.base, introducido: { ...caravana.importe.introducido } }
    const movimientoId = anadirMovimiento(ctx, {
      dominioId: caravana.dominioId,
      fecha: dia.fecha,
      tipo: 'ingreso',
      importe,
      // D-011: la venta de víveres va a «Víveres del almacén»; la de cualquier otro recurso, a «Comercio».
      categoriaId: caravana.carga.recursoId === RECURSO.viveres ? CATEGORIA.viveresDelAlmacen : CATEGORIA.comercio,
      concepto: conceptoVentaCaravana(nombreDeRecurso(ctx.opciones.catalogo, caravana.carga.recursoId), mercado.nombre),
      vinculo: { tipo: 'caravana', id: caravana.id },
    })
    ctx.caravanas[indice] = { ...caravana, estado: 'terminada', movimientoVueltaId: movimientoId }
    ctx.sucesos.push({ tipo: 'vueltaCaravana', dominioId: caravana.dominioId, fecha: dia.fecha, mercadoId })
  })
}
```

Tres detalles de la implementación:
- La condición de la vuelta cubre los dos casos de §9 l.1321 en una sola línea: `vuelta > 0` es «todavía no ha vuelto» (no cobra) y `vuelta < 0 && !dia.primero` es «ya volvió antes de hoy, pero hoy no es el primer día del avance» (tampoco cobra: ya cobró el primer día). Con `vuelta === 0` o (`vuelta < 0` y `dia.primero`), cobra.
- `caravana.importe` y `caravana.mercadoId` son opcionales en el modelo porque una caravana «programada» todavía no los tiene fijados; la comprobación `=== undefined` los descarta antes de que TypeScript se queje de un posible `undefined` más abajo, y de paso deja fuera cualquier venta que, por lo que sea, no llegara a fijar su importe.
- `ctx.caravanas[indice] = { ...caravana, … }` reemplaza el objeto entero (nunca lo muta), como el resto del contexto (técnica 29); `forEach` con índice es más simple aquí que reconstruir el array con `map`, porque el cuerpo tiene varios `return` tempranos.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/pasos/caravanas.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  11:56:39
   Duration  0.75s (transform 59%, import 38%, tests 2%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **752 pruebas en 64 archivos**; `npm run lint` solo escribe su cabecera y sale con código 0. La tarea 17 dejó 746 pruebas en 63 archivos, y esta trae **6 nuevas**: las 5 de `caravanas.test.ts` y **una más** en `pureza.test.ts`, que ahora recorre también `motor/pasos/caravanas.ts`.

```text
 Test Files  64 passed (64)
      Tests  752 passed (752)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/pasos/caravanas.ts src/dominio/motor/pasos/caravanas.test.ts
git commit -m "feat(motor): paso 7, vuelta de ventas de caravanas y cobro de su importe" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/motor/pasos/caravanas.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/pasos/caravanas.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 63e771e] feat(motor): paso 7, vuelta de ventas de caravanas y cobro de su importe
 2 files changed, 188 insertions(+)
 create mode 100644 src/dominio/motor/pasos/caravanas.test.ts
 create mode 100644 src/dominio/motor/pasos/caravanas.ts
```

**Avisos que esta tarea deja escritos:**

1. Esta tarea no mueve la carga entre almacenes ni descuenta nada al salir: eso son los pasos 3 y 7 completos de la fase 4 (técnica 27; hoja de ruta). Aquí solo se cobra el dinero de una venta que ya estaba «en ruta» cuando empieza el avance.
2. El paso 7 no lleva un suceso `pago` como los pasos 8 y 9: una venta que vuelve siempre cobra entero (nunca hay «caja que no llega» al cobrar), así que no hay ningún aviso «Pago no cubierto» que dependa de una caravana.
3. La tarea 19 (bucle del motor) coloca `pasoVueltaDeVentas` como el paso número 7 de `PASOS_DEL_DIA`, antes de `pasoCobros` (8) y `pasoPagos` (9); esta tarea no toca el bucle, solo la función.

---

### Tarea 19 · Bucle y cambios

Esta tarea junta las piezas de las tareas 13 a 18 en el **bucle día a día** del motor y escribe lo que el avance deja para P5: las filas «saldo» y los hechos. Son dos módulos del dominio:

- **`motor/bucle.ts`**: `pasoEventos` (el paso 1, solo dinero), la lista `PASOS_DEL_DIA` con los pasos que ya existen (1, 7, 8 y 9, con su número de §9) y `recorrerDias`, que crea el contexto, recorre los días del siguiente a la fecha actual hasta `hasta`, llama a cada paso en orden, cierra los diarios y devuelve un `Recorrido`: el estado nuevo, los saldos de antes y de después, las personas nuevas y los sucesos. **No calcula avisos**: así el aviso «Pago no cubierto» de la tarea 20 puede hacer su previsión con `recorrerDias` sin llamarse a sí mismo, y `simular` (tarea 21) junta las dos cosas.
- **`motor/cambios.ts`**: `cambiosDelAvance` convierte un `Recorrido` en los `CambioAvance[]` que guarda el avance: una fila «saldo» por dominio, en el orden de `estado.dominios` y también si no tuvo movimientos, y después los hechos de dinero por fecha y dominio.

Depende de las tareas 15 a 18 (`pasoCobros`, `cobrarLocales`, `pasoPagos` y `pasoVueltaDeVentas`), de la 13 (`crearContexto`, `estadoFinal` y los tipos `Contexto` y `Dia`), de la 14 (`cerrarDiarios`), de la 7 (`eventosDeDineroEl`), de la 11 (los textos de los hechos), de la 3 (`formatearDiaDelAvance`) y de la 10 (`idsEnSerie` y los constructores de prueba). De la fase 1 usa `aNumeroDeDia` y `desdeNumeroDeDia` (`calendario/fecha.ts`): el bucle cuenta días con números y solo crea la `Fecha` de cada día una vez.

**Reglas de la especificación que implementa:**

- **Función pura (§9 l.1271).** «Es una **función pura**: `simular(estado, días) → { estadoNuevo, cambios[], avisos[] }`. La vista previa (P4) la llama sin guardar». `recorrerDias` no toca lo que recibe: el contexto trabaja con copias (tarea 13) y las pruebas congelan la entrada.
- **Día a día y en orden (§9 l.1272-1282).** «Procesa **día a día** y, dentro de cada día, en este orden: 1. Eventos narrativos … 7. Llegada de caravanas y traslados. 8. Cobros … 9. Pagos …». La fase 3 registra los pasos 1, 7, 8 y 9 con su número; las fases 4 y 5 añaden el 2 al 6 y el 10 a la lista sin tocar el bucle (técnica 15).
- **Diarios al final (§9 l.1285).** «Los conceptos diarios forman un movimiento por concepto y avance, fechado el último día». Por eso `cerrarDiarios` va después del último día.
- **Nada hacia atrás (§9 l.1321).** «**Registros con fecha pasada o de hoy**: nunca se aplican hacia atrás. Efectos de eventos, producción y consumo cuentan desde el día siguiente a la fecha actual.» El bucle empieza el día siguiente a la fecha actual; un evento que empezó antes solo cuenta sus días de después (técnica 23).
- **Lo que enseña P5 (§6.1 l.314-320; gen l.581-586).** Los saldos antes y después de cada dominio con su número de movimientos («3 · 4 · 1»), y «Qué ha pasado», con el día de cada hecho: «Caravana de Fornost de vuelta · 18» y «Tributo de Archet pagado · 19». Un hecho lleva su fecha dentro del texto (`modelo/avance.ts` l.5-8).
- **Qué es un hecho de dinero (D-032, técnica 18).** «Qué ha pasado» cuenta los tributos pagados, los cobros de impuestos de locales y las caravanas de venta que vuelven, con su día. Un tributo «Cada día» no da hecho; un tributo pagado a medias, tampoco; y dos tributos del mismo asentamiento el mismo día dan uno solo. El día sale de `formatearDiaDelAvance`: «19» si el avance cae en un mes, «19 de abril» si cae en un año y «19 de abril de 1640» si cruza de año.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/motor/bucle.ts`
- Crear: `src/dominio/motor/cambios.ts`
- Prueba: `src/dominio/motor/bucle.test.ts`
- Prueba: `src/dominio/motor/cambios.test.ts`

- [ ] **Paso 1: Escribir la prueba del bucle, que falla**

Qué comprueba cada bloque:
- `PASOS_DEL_DIA`: los números 1, 7, 8 y 9, en ese orden, con sus nombres.
- `pasoEventos`: el 15 de abril del ejemplo el día lleva la feria de primavera (efecto de ingresos sobre los aranceles); el 18, ninguno, porque las lluvias solo cambian la producción (fase 4).
- `recorrerDias` con una partida mínima (`estadoMinimo` y `conAsentamiento` de la tarea 10):
  - simula del día siguiente a la fecha actual hasta `hasta`, los dos incluidos: de cuatro ingresos de «Una sola vez» (hoy, mañana, el último día y el siguiente) solo cobra los dos del medio;
  - cierra los diarios después del último día (un ingreso diario de 3 días da un solo movimiento «· 3 días» fechado `hasta`) y deja la fecha actual en `hasta`;
  - un evento que empezó hace dos días solo cuenta sus días posteriores a hoy (técnica 23): +100 % el primer día y nada los otros dos.
- La **regresión del avance del 10 al 12 de abril**: desde `SNAPSHOT_10_ABRIL` (congelado), `recorrerDias` hasta el 12 crea los mismos tres movimientos que guarda el ejemplo (la posada, el establo y el peaje, sin mirar `id` ni `avanceId`) y los mismos saldos; `saldosDespues` es igual a `saldosPorDominio` del estado nuevo.
- La entrada no cambia: recorrer 19 días una copia congelada del ejemplo no lanza, la deja igual y crea 18 movimientos.

Crea `src/dominio/motor/bucle.test.ts` con este contenido:

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

/** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** Opciones de una simulación de prueba: ids en serie «sim.1», «sim.2»… y el catálogo del ejemplo. */
function opciones(): OpcionesSimulacion {
  return { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** Un ingreso de J5 de 1.000 mh en la bolsa del personaje de estadoMinimo. */
function ingreso(estado: EstadoPartida, id: string, concepto: string, recurrencia: Recurrencia): RecurrenteDinero {
  const personaje = estado.dominios[0].id
  return {
    id,
    dominioId: personaje,
    tipo: 'ingreso',
    concepto,
    importe: { base: 1000 },
    categoriaId: CATEGORIA.otros,
    cuentaId: personaje,
    recurrencia,
    activo: true,
  }
}

describe('PASOS_DEL_DIA y pasoEventos', () => {
  it('lleva los pasos 1, 7, 8 y 9 de §9, en ese orden', () => {
    expect(PASOS_DEL_DIA.map((p) => p.numero)).toEqual([1, 7, 8, 9])
    expect(PASOS_DEL_DIA.map((p) => p.nombre)).toEqual(['eventos', 'vueltaDeVentas', 'cobros', 'pagos'])
  })

  it('pone en el día los eventos de dinero activos: la feria, y no las lluvias, que son de producción', () => {
    const estado = estadoDe(documentoDeEjemplo())
    const ctx = crearContexto(estado, { anio: 1640, mes: 4, dia: 19 }, opciones())
    const diaDe = (fecha: Fecha): Dia => ({ fecha, numero: aNumeroDeDia(fecha), primero: false, eventos: [] })

    const dia15 = diaDe({ anio: 1640, mes: 4, dia: 15 })
    pasoEventos(ctx, dia15)
    expect(dia15.eventos.map((e) => e.id)).toEqual([EVENTO.feria])

    const dia18 = diaDe({ anio: 1640, mes: 4, dia: 18 })
    pasoEventos(ctx, dia18)
    expect(dia18.eventos).toEqual([])
  })
})

describe('recorrerDias', () => {
  it('simula del día siguiente a la fecha actual hasta `hasta`, los dos incluidos', () => {
    const base = estadoMinimo(HOY)
    const estado: EstadoPartida = {
      ...base,
      recurrentes: [
        ingreso(base, 'rec.hoy', 'Hoy', { tipo: 'unica', fecha: HOY }),
        ingreso(base, 'rec.manana', 'Mañana', { tipo: 'unica', fecha: sumarDias(HOY, 1) }),
        ingreso(base, 'rec.ultimo', 'Último día', { tipo: 'unica', fecha: sumarDias(HOY, 3) }),
        ingreso(base, 'rec.despues', 'Después', { tipo: 'unica', fecha: sumarDias(HOY, 4) }),
      ],
    }
    const recorrido = recorrerDias(estado, sumarDias(HOY, 3), opciones())
    const nuevos = recorrido.estadoNuevo.movimientos
    expect(nuevos.map((m) => [m.concepto, m.fecha.dia])).toEqual([
      ['Mañana', 13],
      ['Último día', 15],
    ])
    expect(recorrido.saldosDespues[base.dominios[0].id]).toBe(2000)
  })

  it('cierra los diarios después del último día y deja la fecha actual en `hasta`', () => {
    const base = estadoMinimo(HOY)
    const estado: EstadoPartida = {
      ...base,
      recurrentes: [ingreso(base, 'rec.paga', 'Paga de la guardia', { tipo: 'diaria' })],
    }
    const hasta = sumarDias(HOY, 3)
    const recorrido = recorrerDias(estado, hasta, opciones())
    expect(recorrido.estadoNuevo.partida.fechaActual).toEqual(hasta)
    expect(recorrido.estadoNuevo.movimientos).toEqual([
      {
        id: expect.any(String),
        dominioId: base.dominios[0].id,
        fecha: hasta,
        tipo: 'ingreso',
        importe: { base: 3000 },
        categoriaId: CATEGORIA.otros,
        concepto: 'Paga de la guardia · 3 días',
        origen: 'avance',
        avanceId: 'sim',
        regla: { tipo: 'recurrente', id: 'rec.paga' },
        programado: false,
      },
    ])
  })

  it('reproduce el avance del 10 al 12 de abril del ejemplo desde su copia (regresión)', () => {
    const entrada = congelar(structuredClone(SNAPSHOT_10_ABRIL))
    const recorrido = recorrerDias(entrada, HOY, opciones())
    const delEjemplo = documentoDeEjemplo().movimientos.filter((m) => m.avanceId === AVANCE.hasta12Abril)
    const nuevos = recorrido.estadoNuevo.movimientos.filter((m) => m.avanceId === 'sim')
    expect(nuevos).toHaveLength(3)
    expect(nuevos).toEqual(
      expect.arrayContaining(delEjemplo.map((m) => ({ ...m, id: expect.any(String), avanceId: 'sim' }))),
    )
    expect(recorrido.saldosAntes).toEqual({ 'dom.tharan': 4675800, 'dom.bree': 34000000, 'dom.archet': 8500000 })
    expect(recorrido.saldosDespues).toEqual({ 'dom.tharan': 4651800, 'dom.bree': 34060000, 'dom.archet': 8500000 })
    expect(recorrido.saldosDespues).toEqual(saldosPorDominio(recorrido.estadoNuevo))
  })

  it('no toca la entrada: recorre una copia congelada del ejemplo durante 19 días', () => {
    const entrada = congelar(structuredClone(estadoDe(documentoDeEjemplo())))
    const recorrido = recorrerDias(entrada, { anio: 1640, mes: 5, dia: 1 }, opciones())
    expect(entrada).toEqual(estadoDe(documentoDeEjemplo()))
    expect(recorrido.estadoNuevo.partida.fechaActual).toEqual({ anio: 1640, mes: 5, dia: 1 })
    expect(recorrido.estadoNuevo.movimientos.filter((m) => m.avanceId === 'sim')).toHaveLength(18)
  })

  it('un evento que empezó antes de hoy solo cuenta sus días posteriores a la fecha actual (T23)', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = {
      ...base,
      impuestosRentas: [
        {
          id: 'imp.portazgo',
          dominioId: 'dom.aldea',
          sentido: 'ingreso',
          concepto: 'Portazgo',
          base: 'fija',
          importe: { base: 1000 },
          categoriaId: CATEGORIA.impuestos,
          recurrencia: { tipo: 'diaria' },
        },
      ],
      eventos: [
        {
          id: 'ev.mercado',
          dominioId: 'dom.aldea',
          nombre: 'Mercado de primavera',
          inicio: sumarDias(HOY, -2),
          duracionDias: 4,
          efectos: [{ ambito: 'ingresos', objetivo: { tipo: 'todos' }, pct: 100 }],
        },
      ],
    }
    const recorrido = recorrerDias(estado, sumarDias(HOY, 3), opciones())
    const portazgo = recorrido.estadoNuevo.movimientos.find((m) => m.regla?.id === 'imp.portazgo')
    expect(portazgo?.concepto).toBe('Portazgo · 3 días')
    expect(portazgo?.importe).toEqual({ base: 2000 + 1000 + 1000 })
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/bucle.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./bucle`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/bucle.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/bucle.test.ts [ src/dominio/motor/bucle.test.ts ]
Error: Cannot find module './bucle' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/bucle.test.ts
 ❯ src/dominio/motor/bucle.test.ts:11:1
      9| import { estadoDe, type EstadoPartida } from '../modelo/documento'
     10| import type { RecurrenteDinero } from '../modelo/movimientos'
     11| import { PASOS_DEL_DIA, pasoEventos, recorrerDias } from './bucle'
       | ^
     12| import { crearContexto, type Dia } from './contexto'
     13| import { idsEnSerie } from './ids'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:52:22
   Duration  1.00s (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `bucle.ts`**

Crea `src/dominio/motor/bucle.ts` con este contenido:

```ts
import { aNumeroDeDia, desdeNumeroDeDia, type Fecha } from '../calendario/fecha'
import { eventosDeDineroEl } from '../eventos/efectos'
import type { PersonaEntidad } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import { crearContexto, estadoFinal, type Contexto, type Dia } from './contexto'
import { cerrarDiarios } from './diarios'
import { pasoVueltaDeVentas } from './pasos/caravanas'
import { pasoCobros } from './pasos/cobros'
import { pasoPagos } from './pasos/pagos'
import type { OpcionesSimulacion, Suceso } from './tipos'

/** Un paso del día con su número en la lista de §9 l.1272-1282. */
export interface PasoDelDia {
  numero: number
  nombre: string
  paso: (ctx: Contexto, dia: Dia) => void
}

/** Paso 1, solo dinero: los eventos de asentamiento activos ese día con efectos de costes o ingresos (§9 l.1273). */
export function pasoEventos(ctx: Contexto, dia: Dia): void {
  dia.eventos = eventosDeDineroEl(ctx.estado.eventos, dia.fecha)
}

/** Los pasos que ya tiene el motor, en el orden de §9: 1 eventos, 7 vueltaDeVentas, 8 cobros y 9 pagos (T15). */
export const PASOS_DEL_DIA: readonly PasoDelDia[] = [
  { numero: 1, nombre: 'eventos', paso: pasoEventos },
  { numero: 7, nombre: 'vueltaDeVentas', paso: pasoVueltaDeVentas },
  { numero: 8, nombre: 'cobros', paso: pasoCobros },
  { numero: 9, nombre: 'pagos', paso: pasoPagos },
]

/** Lo que deja un recorrido, sin cambios ni avisos. */
export interface Recorrido {
  estadoNuevo: EstadoPartida
  saldosAntes: Record<Id, number>
  saldosDespues: Record<Id, number>
  personasNuevas: PersonaEntidad[]
  sucesos: Suceso[]
}

/** Recorre del día siguiente a fechaActual hasta `hasta`, paso a paso; sin avisos, para que las previsiones lo usen (§9, T16). */
export function recorrerDias(estado: EstadoPartida, hasta: Fecha, opciones: OpcionesSimulacion): Recorrido {
  const ctx = crearContexto(estado, hasta, opciones)
  const primero = aNumeroDeDia(ctx.primerDia)
  const ultimo = aNumeroDeDia(hasta)
  for (let numero = primero; numero <= ultimo; numero++) {
    const dia: Dia = { fecha: desdeNumeroDeDia(numero), numero, primero: numero === primero, eventos: [] }
    for (const { paso } of PASOS_DEL_DIA) {
      paso(ctx, dia)
    }
  }
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

`saldosDespues` sale del saldo vivo del contexto (`ctx.saldos`), no de volver a sumar los movimientos: es el mismo número que `saldosPorDominio(estadoNuevo)`, y la prueba de la regresión lo comprueba.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/bucle.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  11:52:26
   Duration  990ms (transform 66%, import 30%, tests 3%, worker 1%)
```

- [ ] **Paso 5: Escribir la prueba de los cambios, que falla**

Qué comprueba cada bloque:
- Las filas «saldo»: del 10 al 12 de abril salen exactamente las tres filas de `AVANCES[3]`, en el orden de los dominios y con Archet a 0 movimientos; del 12 al 19, las tres filas de P5 (Tharan +0,66 mo con 3 movimientos, Bree +39,9 mo con 4 y Archet −60 mo con 1) seguidas de los dos hechos, «Caravana de Fornost de vuelta · 18» (Bree) y «Tributo de Archet pagado · 19» (Archet).
- El día de los hechos: del 12 de abril al 1 de mayo cruza de mes, así que lleva el mes («· 1 de mayo»); en 366 días cruza de año y lleva el año («· 28 de febrero de 1641», el diezmo de Bree del día 30 en febrero).
- Un tributo pagado a medias no es un hecho: en 366 días Archet solo paga entero el tributo del 19 de abril (los de julio, octubre y enero quedan con impago).
- Dos tributos de la misma aldea el mismo lunes dan un solo hecho, y un tributo «Cada día» no da ninguno.

Crea `src/dominio/motor/cambios.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { sumarDias, type Fecha } from '../calendario/fecha'
import type { Recurrencia } from '../calendario/recurrencia'
import { CATEGORIA } from '../catalogo/inicial'
import { AVANCES, SNAPSHOT_10_ABRIL } from '../ejemplo/avances'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { ImpuestoRenta } from '../modelo/asentamiento'
import type { CambioAvance } from '../modelo/avance'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { recorrerDias } from './bucle'
import { cambiosDelAvance } from './cambios'
import { idsEnSerie } from './ids'
import { conAsentamiento, estadoMinimo } from './pruebas/constructores'

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
  it('da una fila por dominio en el orden de los dominios, también sin movimientos, como AVANCES[3]', () => {
    const cambios = cambiosTras(SNAPSHOT_10_ABRIL, 2)
    expect(cambios).toEqual(AVANCES[3].cambios.filter((c) => c.tipo === 'saldo'))
    expect(cambios.map((c) => (c.tipo === 'saldo' ? c.movimientos : -1))).toEqual([2, 1, 0])
  })

  it('P4: las tres filas «saldo» y los dos hechos del 12 al 19 de abril', () => {
    expect(cambiosTras(estadoDe(documentoDeEjemplo()), 7)).toEqual([
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4651800, despues: 4717800, movimientos: 3 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 34060000, despues: 38050000, movimientos: 4 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 2500000, movimientos: 1 },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Caravana de Fornost de vuelta · 18' },
      { tipo: 'hecho', dominioId: DOM.archet, texto: 'Tributo de Archet pagado · 19' },
    ])
  })
})

describe('cambiosDelAvance: hechos', () => {
  it('escribe el mes si el avance cruza de mes: del 12 de abril al 1 de mayo', () => {
    expect(hechos(cambiosTras(estadoDe(documentoDeEjemplo()), 19))).toEqual([
      'Caravana de Fornost de vuelta · 18 de abril',
      'Tributo de Archet pagado · 19 de abril',
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

- [ ] **Paso 6: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/cambios.test.ts
```

Fallo esperado: ahora es `./cambios` el que no existe.

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/cambios.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/cambios.test.ts [ src/dominio/motor/cambios.test.ts ]
Error: Cannot find module './cambios' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/cambios.test.ts
 ❯ src/dominio/motor/cambios.test.ts:12:1
     10| import { estadoDe, type EstadoPartida } from '../modelo/documento'
     11| import { recorrerDias } from './bucle'
     12| import { cambiosDelAvance } from './cambios'
       | ^
     13| import { idsEnSerie } from './ids'
     14| import { conAsentamiento, estadoMinimo } from './pruebas/constructores'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:52:29
   Duration  892ms (worker 97%, environment 3%)
```

- [ ] **Paso 7: Implementar `cambios.ts`**

Crea `src/dominio/motor/cambios.ts` con este contenido:

```ts
import { aNumeroDeDia, type Fecha } from '../calendario/fecha'
import { formatearDiaDelAvance } from '../calendario/formatoFecha'
import type { CambioAvance } from '../modelo/avance'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Recorrido } from './bucle'
import { hechoCaravanaDeVuelta, hechoLocalesCobrados, hechoTributoPagado } from './textos'

/** Un hecho con lo que sirve para ordenarlo: el número de su día y la posición de su dominio. */
interface HechoConOrden {
  numero: number
  posicion: number
  cambio: CambioAvance
}

/** Una fila «saldo» por dominio (en el orden de estado.dominios) y los hechos de dinero por fecha (§6.1 P5; D-032). */
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

  const posiciones = new Map(estado.dominios.map((d, i) => [d.id, i]))
  const nombres = new Map(estado.dominios.map((d) => [d.id, d.nombre]))
  const mercados = new Map(estado.mercados.map((m) => [m.id, m.nombre]))
  const dia = (f: Fecha): string => formatearDiaDelAvance(f, primerDia, hasta)
  const hechos: HechoConOrden[] = []
  const tributosPagados = new Set<string>()
  for (const suceso of recorrido.sucesos) {
    const numero = aNumeroDeDia(suceso.fecha)
    const nombre = nombres.get(suceso.dominioId) ?? suceso.dominioId
    let texto: string
    if (suceso.tipo === 'pago') {
      // Solo un tributo que no es «Cada día» y se pagó entero, y uno por asentamiento y día (T18).
      const clave = `${suceso.dominioId}|${numero}`
      const esHecho =
        suceso.que.clase === 'tributo' && !suceso.diario && suceso.pagado === suceso.debido && !tributosPagados.has(clave)
      if (!esHecho) {
        continue
      }
      tributosPagados.add(clave)
      texto = hechoTributoPagado(nombre, dia(suceso.fecha))
    } else if (suceso.tipo === 'cobroLocales') {
      texto = hechoLocalesCobrados(nombre, dia(suceso.fecha))
    } else {
      texto = hechoCaravanaDeVuelta(mercados.get(suceso.mercadoId) ?? suceso.mercadoId, dia(suceso.fecha))
    }
    hechos.push({
      numero,
      posicion: posiciones.get(suceso.dominioId) ?? posiciones.size,
      cambio: { tipo: 'hecho', dominioId: suceso.dominioId, texto },
    })
  }
  // Por fecha y dominio; dentro de un mismo día y dominio, en el orden en que pasaron (sort es estable).
  hechos.sort((a, b) => a.numero - b.numero || a.posicion - b.posicion)
  return [...saldos, ...hechos.map((h) => h.cambio)]
}
```

- [ ] **Paso 8: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/cambios.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  11:52:32
   Duration  887ms (transform 63%, import 32%, tests 4%, worker 1%)
```

- [ ] **Paso 9: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **766 pruebas en 66 archivos**; `npm run lint` solo escribe su cabecera y sale con código 0. La tarea 18 dejó 752 pruebas en 64 archivos, y esta trae **14 nuevas**: las 7 de `bucle.test.ts`, las 5 de `cambios.test.ts` y **dos más** en `pureza.test.ts`, que es un `it.each` sobre los módulos de `src/dominio` y ahora recorre también `motor/bucle.ts` y `motor/cambios.ts`.

```text
 Test Files  66 passed (66)
      Tests  766 passed (766)
```

- [ ] **Paso 10: Commit**

```bash
git add src/dominio/motor/bucle.ts src/dominio/motor/bucle.test.ts src/dominio/motor/cambios.ts src/dominio/motor/cambios.test.ts
git commit -m "feat(motor): bucle día a día, recorrerDias y cambios del avance" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/motor/bucle.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/bucle.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/cambios.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/cambios.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 f38d3a2] feat(motor): bucle día a día, recorrerDias y cambios del avance
 4 files changed, 396 insertions(+)
 create mode 100644 src/dominio/motor/bucle.test.ts
 create mode 100644 src/dominio/motor/bucle.ts
 create mode 100644 src/dominio/motor/cambios.test.ts
 create mode 100644 src/dominio/motor/cambios.ts
```

**Avisos que esta tarea deja escritos:**

1. `recorrerDias` no valida los días: si `hasta` no es posterior a la fecha actual, no simula ningún día. Los días válidos (de 1 a 366, sin pasar del 31 de diciembre de 9999) los comprueba `simular` en la tarea 21.
2. `pasoEventos` rellena `dia.eventos`, que leen los pasos 8 y 9 (`pctDeIngresos` y `pctDeCostes` de la tarea 7). Un paso que se añada antes del 1 no vería los eventos del día.
3. `cambiosDelAvance` cuenta los movimientos del estado nuevo con el `avanceId` del avance: los nuevos y los programados que el avance aplicó (tarea 13, `aplicarProgramado`).
4. Las pruebas comparan los movimientos por contenido, nunca por posición ni por id: el orden de creación (técnica 10) puede cambiar en las fases 4 y 5 sin romperlas.
5. No se comparan los avisos ni los hechos con los de `AVANCES[3]` (técnica 24): el ejemplo guarda hechos y avisos de las fases 4 y 5.

---

### Tarea 20 · Avisos de dinero

Los tres avisos de dinero que ya puede calcular la fase 3, en el orden de la tabla de §9: **saldo negativo**, **impago** y **pago no cubierto**. Son tres módulos pequeños, cada uno una función pura sobre el `EstadoPartida`, más el módulo que los junta y los ordena:

- **`avisos/dinero.ts`**: `avisosDeSaldoNegativo` (bolsa o caja por debajo de 0 en la fecha actual) y `avisosDeImpago` (una deuda de impago con algo pendiente), y el ayudante `dominioDe` que las dos usan y que también reutiliza `avisos/pagoNoCubierto.ts`, más abajo en esta misma tarea.
- **`avisos/pagoNoCubierto.ts`**: `avisosDePagoNoCubierto`, que mira el siguiente pago de cada regla y de cada pago programado con una sola previsión (`recorrerDias`, sin avisos, así no hay recursión) y avisa de los que no se cubrirían enteros.
- **`avisos/avisos.ts`**: `avisosEn`, que junta los tres; `ordenarAvisos`, que los ordena (rojos primero, después por fecha, por tipo y por dominio); y `sinFecha`, que quita la fecha para guardarlos en el avance (formato 1).

Depende de la tarea 11 (los textos `avisoSaldoNegativo`, `avisoImpago` y `avisoPagoNoCubierto`, y el tipo `AvisoConFecha` de `motor/tipos.ts`) y de la 19 (`recorrerDias`, que la previsión de «Pago no cubierto» reutiliza sin llamarse a sí misma). De la fase 1 usa `formatearOro`, `formatearDiaCercano`, `compararFechas`, `diasEntre` y `siguienteOcurrencia`.

**Reglas de la especificación que implementa:**

- **Tabla de avisos (§9, tabla).** De los doce avisos de la tabla, la fase 3 escribe tres: «Impago … Rojo … A2b o J4», «Pago no cubierto … El saldo previsto no cubre su siguiente vencimiento … Ámbar … Tesorería o J5» y «Saldo negativo … Bolsa o caja por debajo de 0 … Rojo … J2 o A2». Los demás (deudas, recursos, obras, caravanas, edificios) son de las fases 4 y 5.
- **Saldo negativo (§6.4 l.808).** «La bolsa de Tharan está en negativo: −3,482 mo» — «bolsa» para el personaje, «caja» para un asentamiento (`laCajaDe`, tarea 11).
- **Contraparte e impago (§9 l.1291-1298).** «Queda como impago solo lo que no se paga, con aviso rojo… Se reutiliza la persona con el mismo nombre normalizado.» El aviso de impago cuenta lo pendiente de la deuda, no el último cargo suelto (D-024).
- **Pago no cubierto (§9 l.1354, D-025).** «La caja de Archet no cubre el tributo de 60 mo del 19 de julio». Mira el siguiente pago de cada regla y de cada programado, hasta un año vista; «Los salarios y las soldadas de un día avisan juntos» con el total debido ese día.
- **Fecha del aviso (§3, `formatearDiaCercano`).** Con el año si no es el de hoy: «19 de julio» dentro de 1640, «19 de enero de 1641» si cruza de año.
- **Orden de los avisos (§9, tabla; técnica 11).** Rojos primero; dentro de cada color, por fecha, por tipo en el orden de la tabla (impago antes que pago no cubierto antes que saldo negativo… según `EsquemaTipoAviso`) y por dominio. Se guardan en el avance ya ordenados y sin la fecha.
- **Qué guarda el avance (modelo/avance.ts, formato 1).** `AvisoAvance` no lleva fecha: la fecha solo sirve para ordenar en memoria (`AvisoConFecha`, tarea 10) y no se guarda.
- **Horizonte de la previsión (§9 l.1322-1324; D-001).** Como un avance, «como mucho 366 días» y sin pasar del 31 de diciembre de 9999: `avisosDePagoNoCubierto` recorta su horizonte con las mismas dos cotas.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/avisos/dinero.ts`
- Crear: `src/dominio/avisos/pagoNoCubierto.ts`
- Crear: `src/dominio/avisos/avisos.ts`
- Prueba: `src/dominio/avisos/dinero.test.ts`
- Prueba: `src/dominio/avisos/pagoNoCubierto.test.ts`
- Prueba: `src/dominio/avisos/avisos.test.ts`

- [ ] **Paso 1: Escribir la prueba de `dinero.ts`, que falla**

Qué comprueba cada bloque:
- `avisosDeSaldoNegativo`: la bolsa de Tharan a −348.200 avisa con el texto exacto de §6.4, «−3,482 mo»; una caja de asentamiento dice «La caja de»; a 0 o en positivo no avisa, y el ejemplo entero (sin ninguna caja negativa) da [].
- `avisosDeImpago`: la deuda de impago de Archet del 19 de julio avisa mientras quede algo pendiente (D-024), con el nombre de la persona guardada; lo pendiente es principal menos la suma de `pagos`, y la fecha es la del último cargo (T17), no la de la deuda; una deuda saldada, pagada entera o que no es de impago (`impago: false`) no avisa.

Crea `src/dominio/avisos/dinero.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Deuda } from '../modelo/deudas'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { conAsentamiento, estadoMinimo } from '../motor/pruebas/constructores'
import { avisosDeImpago, avisosDeSaldoNegativo } from './dinero'

/** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** Un gasto suelto ya aplicado, para dejar una caja en negativo como lo haría una acción manual (§6.4). */
function gasto(id: string, dominioId: string, base: number): Movimiento {
  return {
    id,
    dominioId,
    fecha: HOY,
    tipo: 'gasto',
    importe: { base: -base },
    categoriaId: CATEGORIA.otros,
    concepto: 'Compra de urgencia',
    origen: 'manual',
    programado: false,
  }
}

/** Una deuda de impago de la aldea de prueba con la persona «Molineros de Aldea». */
function deudaDeImpago(cambios: Partial<Deuda>): Deuda {
  return {
    id: 'deuda.impago',
    dominioId: 'dom.aldea',
    sentido: 'debo',
    contraparteId: 'persona.molineros',
    fecha: { anio: 1640, mes: 4, dia: 5 },
    principal: { base: 300000 },
    interesPct: 0,
    estado: 'abierta',
    impago: true,
    origenImpago: { tipo: 'recurrente', id: 'rec.molienda' },
    cargos: [
      { fecha: { anio: 1640, mes: 4, dia: 5 }, importe: { base: 100000 }, avanceId: 'av.1' },
      { fecha: { anio: 1640, mes: 4, dia: 10 }, importe: { base: 200000 }, avanceId: 'av.2' },
    ],
    pagos: [],
    devengos: [],
    ...cambios,
  }
}

/** La aldea de prueba con la persona de la deuda y la deuda que se pase. */
function conDeuda(deuda: Deuda): EstadoPartida {
  const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 1000000 })
  return { ...base, personas: [{ id: 'persona.molineros', nombre: 'Molineros de Aldea' }], deudas: [deuda] }
}

describe('avisosDeSaldoNegativo', () => {
  it('avisa en rojo de la bolsa en negativo con el texto de §6.4: «−3,482 mo»', () => {
    const base = estadoMinimo(HOY)
    const tharan = base.dominios[0].id
    const estado: EstadoPartida = { ...base, movimientos: [gasto('mov.1', tharan, 348200)] }
    expect(avisosDeSaldoNegativo(estado)).toEqual([
      {
        tipo: 'saldoNegativo',
        color: 'rojo',
        dominioId: tharan,
        texto: 'La bolsa de Tharan está en negativo: −3,482 mo',
        fecha: HOY,
      },
    ])
  })

  it('una caja de asentamiento dice «La caja de»; una caja a 0 o en positivo no avisa', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: 'dom.aldea', nombre: 'Aldea', caja: 0 })
    const estado: EstadoPartida = { ...base, movimientos: [gasto('mov.1', 'dom.aldea', 100000)] }
    expect(avisosDeSaldoNegativo(estado).map((a) => a.texto)).toEqual(['La caja de Aldea está en negativo: −1 mo'])
    expect(avisosDeSaldoNegativo(base)).toEqual([])
    expect(avisosDeSaldoNegativo(estadoDe(documentoDeEjemplo()))).toEqual([])
  })
})

describe('avisosDeImpago', () => {
  it('avisa del impago de Archet del 19 de julio mientras quede algo pendiente (D-024)', () => {
    const recorrido = recorrerDias(estadoDe(documentoDeEjemplo()), { anio: 1640, mes: 7, dia: 19 }, {
      avanceId: 'sim',
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    expect(avisosDeImpago(recorrido.estadoNuevo)).toEqual([
      {
        tipo: 'impago',
        color: 'rojo',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no pudo pagar a Corona de Arthedain: 18,8 mo pendientes',
        fecha: { anio: 1640, mes: 7, dia: 19 },
      },
    ])
  })

  it('lo pendiente es el principal menos lo pagado, y la fecha, la del último cargo (T17)', () => {
    const pago = {
      id: 'pago.1',
      fecha: { anio: 1640, mes: 4, dia: 11 },
      importe: { base: 50000 },
      aplicarA: 'soloCapital' as const,
      movimientoId: 'mov.pago',
    }
    expect(avisosDeImpago(conDeuda(deudaDeImpago({ pagos: [pago] })))).toEqual([
      {
        tipo: 'impago',
        color: 'rojo',
        dominioId: 'dom.aldea',
        texto: 'La caja de Aldea no pudo pagar a Molineros de Aldea: 2,5 mo pendientes',
        fecha: { anio: 1640, mes: 4, dia: 10 },
      },
    ])
  })

  it('no avisa de una deuda de impago saldada, pagada entera o que no es de impago', () => {
    const pagadaEntera = {
      id: 'pago.1',
      fecha: { anio: 1640, mes: 4, dia: 11 },
      importe: { base: 300000 },
      aplicarA: 'soloCapital' as const,
      movimientoId: 'mov.pago',
    }
    expect(avisosDeImpago(conDeuda(deudaDeImpago({ estado: 'saldada' })))).toEqual([])
    expect(avisosDeImpago(conDeuda(deudaDeImpago({ pagos: [pagadaEntera] })))).toEqual([])
    const normal = deudaDeImpago({ impago: false, origenImpago: undefined, cargos: undefined })
    expect(avisosDeImpago(conDeuda(normal))).toEqual([])
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/avisos/dinero.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./dinero`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/avisos/dinero.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/avisos/dinero.test.ts [ src/dominio/avisos/dinero.test.ts ]
Error: Cannot find module './dinero' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/avisos/dinero.test.ts
 ❯ src/dominio/avisos/dinero.test.ts:12:1
     10| import { idsEnSerie } from '../motor/ids'
     11| import { conAsentamiento, estadoMinimo } from '../motor/pruebas/constr…
     12| import { avisosDeImpago, avisosDeSaldoNegativo } from './dinero'
       | ^
     13|
     14| /** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:52:55
   Duration  907ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `dinero.ts`**

Crea `src/dominio/avisos/dinero.ts` con este contenido:

```ts
import { formatearOro } from '../dinero/formato'
import { saldosPorDominio } from '../dinero/saldo'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Dominio } from '../modelo/dominios'
import { avisoImpago, avisoSaldoNegativo } from '../motor/textos'
import type { AvisoConFecha } from '../motor/tipos'

/** El dominio con ese id; si no existe, es un error de programación (la copia ya se validó). */
export function dominioDe(estado: EstadoPartida, id: Id): Dominio {
  const dominio = estado.dominios.find((d) => d.id === id)
  if (dominio === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  return dominio
}

/** Un aviso rojo por bolsa o caja por debajo de 0 en la fecha actual (§9, tabla; §6.4 l.808). */
export function avisosDeSaldoNegativo(estado: EstadoPartida): AvisoConFecha[] {
  const saldos = saldosPorDominio(estado)
  const eq = estado.partida.equivalencias
  const avisos: AvisoConFecha[] = []
  for (const dominio of estado.dominios) {
    const saldo = saldos[dominio.id] ?? 0
    if (saldo < 0) {
      avisos.push({
        tipo: 'saldoNegativo',
        color: 'rojo',
        dominioId: dominio.id,
        texto: avisoSaldoNegativo(dominio, formatearOro(saldo, eq)),
        fecha: estado.partida.fechaActual,
      })
    }
  }
  return avisos
}

/** Un aviso rojo por deuda de impago con algo pendiente; fecha = la del último cargo (§9; D-024; T17). */
export function avisosDeImpago(estado: EstadoPartida): AvisoConFecha[] {
  const eq = estado.partida.equivalencias
  const avisos: AvisoConFecha[] = []
  for (const deuda of estado.deudas) {
    const ultimoCargo = deuda.cargos?.[deuda.cargos.length - 1]
    if (!deuda.impago || deuda.estado === 'saldada' || ultimoCargo === undefined) {
      continue
    }
    const pendiente = deuda.principal.base - deuda.pagos.reduce((total, p) => total + p.importe.base, 0)
    if (pendiente <= 0) {
      continue
    }
    const contraparte = estado.personas.find((p) => p.id === deuda.contraparteId)
    if (contraparte === undefined) {
      throw new Error(`No existe «${deuda.contraparteId}»`)
    }
    avisos.push({
      tipo: 'impago',
      color: 'rojo',
      dominioId: deuda.dominioId,
      texto: avisoImpago(dominioDe(estado, deuda.dominioId), contraparte.nombre, formatearOro(pendiente, eq)),
      fecha: ultimoCargo.fecha,
    })
  }
  return avisos
}
```

`dominioDe` lanza «No existe «{id}»» si el id no está: es un error de programación, porque la copia ya validó las referencias (§3.5 del contrato). `avisos/pagoNoCubierto.ts`, en el paso 7, reutiliza esta misma función.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/avisos/dinero.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  11:52:58
   Duration  998ms (transform 64%, import 33%, tests 2%, worker 1%)
```

- [ ] **Paso 5: Escribir la prueba de `pagoNoCubierto.ts`, que falla**

Qué comprueba cada bloque:
- Con el ejemplo: el 12 de abril no avisa (Archet cubre el tributo del 19 de julio con 85 mo); tras recorrer hasta el 19, avisa exactamente del tributo de Archet del 19 de julio, con el texto literal de §9 l.1354.
- Por origen: los salarios de Bree de un día avisan juntos, con el total debido, «los salarios de 4,2 mo del 20 de abril» (D-025); con la caja justa para el pago entero no avisa; las tres unidades de la guarnición dan «la soldada»; un gasto de J5 en pausa no avisa, activo avisa de su primer día con el concepto entre comillas latinas; un pago programado avisa con su concepto y su fecha.
- Horizonte: mira como mucho 366 días, con el año en la fecha si cae en otro; no pasa del 31 de diciembre de 9999.

Crea `src/dominio/avisos/pagoNoCubierto.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { sumarDias, type Fecha } from '../calendario/fecha'
import type { Recurrencia } from '../calendario/recurrencia'
import { CATEGORIA } from '../catalogo/inicial'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import type { RecurrenteDinero } from '../modelo/movimientos'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { conAsentamiento, estadoMinimo } from '../motor/pruebas/constructores'
import { avisosDePagoNoCubierto } from './pagoNoCubierto'

/** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** La posada de Tharan: 1 mp cada noche desde su bolsa. */
function posada(estado: EstadoPartida, recurrencia: Recurrencia, activo = true): RecurrenteDinero {
  const tharan = estado.dominios[0].id
  return {
    id: 'rec.posada',
    dominioId: tharan,
    tipo: 'gasto',
    concepto: 'Posada El Poney Pisador',
    importe: { base: 10000 },
    categoriaId: CATEGORIA.otros,
    cuentaId: tharan,
    recurrencia,
    activo,
  }
}

/** Los textos de los avisos, para leerlos de un vistazo. */
function textos(estado: EstadoPartida): string[] {
  return avisosDePagoNoCubierto(estado, catalogosDeEjemplo()).map((a) => a.texto)
}

describe('avisosDePagoNoCubierto con el ejemplo', () => {
  it('el 12 de abril no avisa: Archet cubre el tributo del 19 con 85 mo', () => {
    expect(avisosDePagoNoCubierto(estadoDe(documentoDeEjemplo()), catalogosDeEjemplo())).toEqual([])
  })

  it('el 19 de abril avisa del tributo de Archet del 19 de julio (§9 l.1354)', () => {
    const recorrido = recorrerDias(estadoDe(documentoDeEjemplo()), { anio: 1640, mes: 4, dia: 19 }, {
      avanceId: 'sim',
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    expect(avisosDePagoNoCubierto(recorrido.estadoNuevo, catalogosDeEjemplo())).toEqual([
      {
        tipo: 'pagoNoCubierto',
        color: 'ambar',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no cubre el tributo de 60 mo del 19 de julio',
        fecha: { anio: 1640, mes: 7, dia: 19 },
      },
    ])
  })
})

describe('avisosDePagoNoCubierto por origen', () => {
  it('los salarios de un día avisan juntos, con el total: «los salarios de 4,2 mo del 20 de abril» (D-025)', () => {
    const trece: Fecha = { anio: 1640, mes: 4, dia: 13 }
    const base = conAsentamiento(estadoMinimo(trece), { id: DOM.bree, nombre: 'Bree', caja: 300000 })
    const trabajadores = documentoDeEjemplo().trabajadores.filter((t) => t.dominioId === DOM.bree)
    expect(textos({ ...base, trabajadores })).toEqual([
      'La caja de Bree no cubre los salarios de 4,2 mo del 20 de abril',
    ])
  })

  it('con la caja justa para el pago entero no avisa', () => {
    const trece: Fecha = { anio: 1640, mes: 4, dia: 13 }
    const base = conAsentamiento(estadoMinimo(trece), { id: DOM.bree, nombre: 'Bree', caja: 420000 })
    const trabajadores = documentoDeEjemplo().trabajadores.filter((t) => t.dominioId === DOM.bree)
    expect(textos({ ...base, trabajadores })).toEqual([])
  })

  it('las soldadas de las tres unidades dicen «la soldada»', () => {
    const base = conAsentamiento(estadoMinimo(HOY), { id: DOM.bree, nombre: 'Bree', caja: 0 })
    const unidadesGuarnicion = documentoDeEjemplo().unidadesGuarnicion
    expect(textos({ ...base, unidadesGuarnicion })).toEqual([
      'La caja de Bree no cubre la soldada de 5,8 mo del 24 de abril',
    ])
  })

  it('un gasto de J5 en pausa no avisa; activo, avisa de su primer día con el concepto entre comillas', () => {
    const base = estadoMinimo(HOY)
    expect(textos({ ...base, recurrentes: [posada(base, { tipo: 'diaria' }, false)] })).toEqual([])
    expect(textos({ ...base, recurrentes: [posada(base, { tipo: 'diaria' })] })).toEqual([
      'La bolsa de Tharan no cubre «Posada El Poney Pisador» de 0,1 mo del 13 de abril',
    ])
  })

  it('un pago programado que no se cubre avisa con su concepto y su fecha', () => {
    const base = estadoMinimo(HOY)
    const estado: EstadoPartida = {
      ...base,
      movimientos: [
        {
          id: 'mov.capa',
          dominioId: base.dominios[0].id,
          fecha: { anio: 1640, mes: 4, dia: 20 },
          tipo: 'gasto',
          importe: { base: -50000 },
          categoriaId: CATEGORIA.otros,
          concepto: 'Capa élfica',
          origen: 'manual',
          programado: true,
        },
      ],
    }
    expect(textos(estado)).toEqual(['La bolsa de Tharan no cubre «Capa élfica» de 0,5 mo del 20 de abril'])
  })
})

describe('avisosDePagoNoCubierto: horizonte', () => {
  it('mira como mucho 366 días; si el pago cae en otro año, la fecha lleva el año', () => {
    const base = estadoMinimo(HOY)
    const alAnio = { ...base, recurrentes: [posada(base, { tipo: 'unica', fecha: sumarDias(HOY, 366) })] }
    const despues = { ...base, recurrentes: [posada(base, { tipo: 'unica', fecha: sumarDias(HOY, 367) })] }
    expect(textos(alAnio)).toEqual([
      'La bolsa de Tharan no cubre «Posada El Poney Pisador» de 0,1 mo del 13 de abril de 1641',
    ])
    expect(textos(despues)).toEqual([])
  })

  it('no pasa del 31 de diciembre de 9999', () => {
    const vispera = estadoMinimo({ anio: 9999, mes: 12, dia: 30 })
    const ultimo = estadoMinimo({ anio: 9999, mes: 12, dia: 31 })
    expect(textos({ ...vispera, recurrentes: [posada(vispera, { tipo: 'diaria' })] })).toEqual([
      'La bolsa de Tharan no cubre «Posada El Poney Pisador» de 0,1 mo del 31 de diciembre',
    ])
    expect(textos({ ...ultimo, recurrentes: [posada(ultimo, { tipo: 'diaria' })] })).toEqual([])
  })
})
```

- [ ] **Paso 6: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/avisos/pagoNoCubierto.test.ts
```

Fallo esperado: ahora es `./pagoNoCubierto` el que no existe.

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/avisos/pagoNoCubierto.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/avisos/pagoNoCubierto.test.ts [ src/dominio/avisos/pagoNoCubierto.test.ts ]
Error: Cannot find module './pagoNoCubierto' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/avisos/pagoNoCubierto.test.ts
 ❯ src/dominio/avisos/pagoNoCubierto.test.ts:12:1
     10| import { idsEnSerie } from '../motor/ids'
     11| import { conAsentamiento, estadoMinimo } from '../motor/pruebas/constr…
     12| import { avisosDePagoNoCubierto } from './pagoNoCubierto'
       | ^
     13|
     14| /** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:53:01
   Duration  929ms (worker 97%, environment 3%)
```

- [ ] **Paso 7: Implementar `pagoNoCubierto.ts`**

Crea `src/dominio/avisos/pagoNoCubierto.ts` con este contenido:

```ts
import { ANIO_MAXIMO, compararFechas, diasEntre, sumarDias, type Fecha } from '../calendario/fecha'
import { formatearDiaCercano } from '../calendario/formatoFecha'
import { siguienteOcurrencia, type Recurrencia } from '../calendario/recurrencia'
import { formatearOro } from '../dinero/formato'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { EstadoPartida } from '../modelo/documento'
import { recorrerDias } from '../motor/bucle'
import { idsEnSerie } from '../motor/ids'
import { avisoPagoNoCubierto } from '../motor/textos'
import type { AvisoConFecha } from '../motor/tipos'
import { dominioDe } from './dinero'

/** Como mucho, un año vista, igual que un avance (§9 l.1323; D-025). */
const HORIZONTE_MAXIMO = 366

/** El último día que la app sabe representar: la previsión no pasa de ahí (§4, D-001). */
const ULTIMO_DIA: Fecha = { anio: ANIO_MAXIMO, mes: 12, dia: 31 }

/** La fecha del siguiente pago de cada origen: filas, tributos, gastos de J5 activos y pagos programados (D-025). */
function siguientesPagos(estado: EstadoPartida): Fecha[] {
  const hoy = estado.partida.fechaActual
  const recurrencias: Recurrencia[] = [
    ...estado.trabajadores.map((t) => t.recurrencia),
    ...estado.unidadesGuarnicion.map((u) => u.recurrencia),
    ...estado.impuestosRentas.filter((i) => i.sentido === 'tributo').map((i) => i.recurrencia),
    ...estado.recurrentes.filter((r) => r.tipo === 'gasto' && r.activo).map((r) => r.recurrencia),
  ]
  const fechas: Fecha[] = []
  for (const recurrencia of recurrencias) {
    const siguiente = siguienteOcurrencia(recurrencia, hoy)
    if (siguiente !== null) {
      fechas.push(siguiente)
    }
  }
  for (const m of estado.movimientos) {
    if (m.programado && m.tipo === 'gasto' && m.vinculo === undefined) {
      fechas.push(compararFechas(m.fecha, hoy) > 0 ? m.fecha : sumarDias(hoy, 1))
    }
  }
  return fechas
}

/** Un aviso ámbar por origen cuyo siguiente pago, en 366 días o menos, no se cubriría entero (§9; D-025; T16). */
export function avisosDePagoNoCubierto(estado: EstadoPartida, catalogo: CatalogosEnCopia): AvisoConFecha[] {
  const hoy = estado.partida.fechaActual
  const masLejano = siguientesPagos(estado).reduce((maximo, f) => Math.max(maximo, diasEntre(hoy, f)), 0)
  const horizonte = Math.min(HORIZONTE_MAXIMO, diasEntre(hoy, ULTIMO_DIA), masLejano)
  if (horizonte < 1) {
    return []
  }
  const prevision = recorrerDias(estado, sumarDias(hoy, horizonte), {
    avanceId: 'prev',
    nuevoId: idsEnSerie('prev'),
    catalogo,
  })
  const eq = estado.partida.equivalencias
  const vistos = new Set<string>()
  const avisos: AvisoConFecha[] = []
  for (const suceso of prevision.sucesos) {
    if (suceso.tipo !== 'pago') {
      continue
    }
    const clave = `${suceso.origen.tipo}|${suceso.origen.id}`
    if (vistos.has(clave)) {
      continue
    }
    vistos.add(clave)
    if (suceso.pagado >= suceso.debido) {
      continue
    }
    avisos.push({
      tipo: 'pagoNoCubierto',
      color: 'ambar',
      dominioId: suceso.dominioId,
      texto: avisoPagoNoCubierto(
        dominioDe(estado, suceso.dominioId),
        suceso.que,
        formatearOro(suceso.debido, eq),
        formatearDiaCercano(suceso.fecha, hoy),
      ),
      fecha: suceso.fecha,
    })
  }
  return avisos
}
```

`siguientesPagos` reúne la próxima ocurrencia de cada trabajador, cada unidad, cada tributo y cada gasto de J5 activo (`siguienteOcurrencia`, fase 1), más la fecha de cada pago programado sin vínculo (o mañana, si ya venció); `avisosDePagoNoCubierto` recorre una sola vez hasta el más lejano de esos pagos, acotado a 366 días y al 31 de diciembre de 9999 (técnica 16), y de los sucesos de pago se queda con el primero de cada origen (`clave = origen.tipo|origen.id`) que no se cubrió entero.

- [ ] **Paso 8: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/avisos/pagoNoCubierto.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  11:53:04
   Duration  960ms (transform 65%, import 31%, tests 4%, worker 1%)
```

- [ ] **Paso 9: Escribir la prueba de `avisos.ts`, que falla**

Qué comprueba cada bloque:
- `avisosEn`: el 12 de abril el ejemplo no tiene avisos de dinero; recorrido hasta el 19 de julio da, en orden, el impago de Archet y los dos avisos de pago no cubierto (salarios del 26 de julio y tributo del 19 de octubre), por fecha.
- `ordenarAvisos`: con seis avisos desordenados, salen los rojos primero (por fecha y, en el mismo día, por tipo de la tabla y por dominio) y después los ámbar por fecha.
- `sinFecha`: guarda el aviso sin la fecha; sin `dominioId` no lo añade (`Object.keys` da exactamente `['tipo', 'color', 'texto']`, formato 1).

Crea `src/dominio/avisos/avisos.test.ts` con este contenido:

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

describe('avisosEn', () => {
  it('el 12 de abril, el ejemplo no tiene avisos de dinero', () => {
    expect(avisosEn(estadoDe(documentoDeEjemplo()), catalogosDeEjemplo())).toEqual([])
  })

  it('el 19 de julio: el impago en rojo y después los dos pagos no cubiertos, por fecha', () => {
    expect(avisosTras({ anio: 1640, mes: 7, dia: 19 })).toEqual([
      {
        tipo: 'impago',
        color: 'rojo',
        dominioId: DOM.archet,
        texto: 'La caja de Archet no pudo pagar a Corona de Arthedain: 18,8 mo pendientes',
        fecha: { anio: 1640, mes: 7, dia: 19 },
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

  it('guarda el aviso sin su fecha, y sin dominioId si no lo tiene (formato 1)', () => {
    const fecha: Fecha = { anio: 1640, mes: 7, dia: 19 }
    expect(avisosTras({ anio: 1640, mes: 4, dia: 19 }).map(sinFecha)).toEqual([
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

- [ ] **Paso 10: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/avisos/avisos.test.ts
```

Fallo esperado: ahora es `./avisos` el que no existe.

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/avisos/avisos.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/avisos/avisos.test.ts [ src/dominio/avisos/avisos.test.ts ]
Error: Cannot find module './avisos' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/avisos/avisos.test.ts
 ❯ src/dominio/avisos/avisos.test.ts:9:1
      7| import { idsEnSerie } from '../motor/ids'
      8| import type { AvisoConFecha } from '../motor/tipos'
      9| import { avisosEn, ordenarAvisos, sinFecha } from './avisos'
       | ^
     10|
     11| /** Los avisos del ejemplo tras recorrer hasta `hasta`. */

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:53:08
   Duration  853ms (worker 97%, environment 3%)
```

- [ ] **Paso 11: Implementar `avisos.ts`**

Crea `src/dominio/avisos/avisos.ts` con este contenido:

```ts
import { compararFechas } from '../calendario/fecha'
import { EsquemaTipoAviso, type AvisoAvance } from '../modelo/avance'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { EstadoPartida } from '../modelo/documento'
import type { Dominio } from '../modelo/dominios'
import type { AvisoConFecha } from '../motor/tipos'
import { avisosDeImpago, avisosDeSaldoNegativo } from './dinero'
import { avisosDePagoNoCubierto } from './pagoNoCubierto'

/** Los avisos de dinero vigentes en la fecha actual del estado, ya ordenados (§9, tabla de avisos). */
export function avisosEn(estado: EstadoPartida, catalogo: CatalogosEnCopia): AvisoConFecha[] {
  return ordenarAvisos(
    [...avisosDeSaldoNegativo(estado), ...avisosDeImpago(estado), ...avisosDePagoNoCubierto(estado, catalogo)],
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

`ordenarAvisos` usa `EsquemaTipoAviso.options` para el orden de los tipos: así, si la fase 5 añade tipos a ese esquema, el orden de la tabla de §9 se sigue automáticamente sin tocar esta función.

- [ ] **Paso 12: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/avisos/avisos.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  11:53:11
   Duration  919ms (transform 65%, import 31%, tests 3%, worker 1%)
```

- [ ] **Paso 13: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **787 pruebas en 69 archivos**; `npm run lint` solo escribe su cabecera y sale con código 0. La tarea 19 dejó 766 pruebas en 66 archivos, y esta trae **21 nuevas**: las 5 de `dinero.test.ts`, las 9 de `pagoNoCubierto.test.ts`, las 4 de `avisos.test.ts` y **tres más** en `pureza.test.ts`, que ahora recorre también `avisos/dinero.ts`, `avisos/pagoNoCubierto.ts` y `avisos/avisos.ts`.

```text
 Test Files  69 passed (69)
      Tests  787 passed (787)
```

- [ ] **Paso 14: Commit**

```bash
git add src/dominio/avisos
git commit -m "feat(avisos): saldo negativo, impago y pago no cubierto, juntos y ordenados" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/avisos/avisos.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/avisos/avisos.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/avisos/dinero.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/avisos/dinero.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/avisos/pagoNoCubierto.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/avisos/pagoNoCubierto.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 5132214] feat(avisos): saldo negativo, impago y pago no cubierto, juntos y ordenados
 6 files changed, 553 insertions(+)
 create mode 100644 src/dominio/avisos/avisos.test.ts
 create mode 100644 src/dominio/avisos/avisos.ts
 create mode 100644 src/dominio/avisos/dinero.test.ts
 create mode 100644 src/dominio/avisos/dinero.ts
 create mode 100644 src/dominio/avisos/pagoNoCubierto.test.ts
 create mode 100644 src/dominio/avisos/pagoNoCubierto.ts
```

**Avisos que esta tarea deja escritos:**

1. `avisosDeImpago` cuenta lo pendiente con `principal − Σ pagos`, sin mirar `aplicarA`: la fase 5 lo afinará con «Se aplica a» cuando haya pagos parciales que no sean solo capital (técnica 17).
2. La previsión de «Pago no cubierto» usa su propio `avanceId` (`'prev'`) y su propio `nuevoId` (`idsEnSerie('prev')`, aviso 20 del contrato): nada de lo que crea se guarda ni se mezcla con el avance real.
3. `avisosDePagoNoCubierto` solo avisa del **primer** pago no cubierto de cada origen: si un tributo trimestral falla dos veces dentro del horizonte, solo se ve el primero, igual que hace `simular` en la tarea 21 con el ejemplo a 366 días (dos avisos de tributo, no tres).
4. `ordenarAvisos` y `sinFecha` los reutiliza `simular` (tarea 21) tal cual: `simular` llama a `avisosEn` con el estado nuevo y aplica `sinFecha` a cada uno antes de devolverlos en `ResultadoSimulacion.avisos`.
5. No se compara con `AVANCES[3].avisos` del ejemplo (técnica 24): ese avance guarda también el aviso de Hobart, que es de la fase 5.

---

### Tarea 21 · `simular` y días de avance

Esta tarea cierra el motor con su única función pública, `simular`, y las cuatro funciones de días que P4 necesita para el selector «1, 7, 30 u Otro…». Dos módulos:

- **`avance/dias.ts`**: las constantes `DIAS_MAXIMOS_DE_AVANCE` (366), `DIAS_CON_AVISO` (90) y `FECHA_MAXIMA` (31 de diciembre de 9999), y las funciones `errorDeDiasDeAvance`, `diasHasta` y `diasQueCaben`.
- **`motor/simular.ts`**: `simular`, la función pura que promete §9: valida los días con `errorDeDiasDeAvance`, saca el estado de entrada con `estadoDe` (nunca `{ ...estado }`), llama a `recorrerDias` (tarea 19) y junta su resultado con `cambiosDelAvance` (tarea 19) y `avisosEn` + `sinFecha` (tarea 20) en un `ResultadoSimulacion`.

Depende de las tareas 19 (`recorrerDias`, `cambiosDelAvance`) y 20 (`avisosEn`, `sinFecha`). De la fase 1 usa `sumarDias`, `diasEntre`, `compararFechas` y `ANIO_MAXIMO`; del modelo, `estadoDe` y `EsquemaEstadoPartida`.

**Reglas de la especificación que implementa:**

- **`simular`, función pura (§9 l.1271).** «Es una **función pura**: `simular(estado, días) → { estadoNuevo, cambios[], avisos[] }`. La vista previa (P4) la llama sin guardar; al confirmar se guarda `estadoNuevo` y se crea un `Avance`…» La firma real añade las `OpcionesSimulacion` (técnica 1 del contrato): `simular(estado, dias, { avanceId, nuevoId, catalogo })`.
- **Días de avance (§9 l.1323).** «**Días de avance «Otro…»**: de 1 a 366, con aviso ámbar si pasa de 90.» `DIAS_MAXIMOS_DE_AVANCE` y `DIAS_CON_AVISO` son esas dos cifras; el aviso ámbar en sí lo pinta la fase 6.
- **Mensaje de días inválidos (§9 l.1323-1324; D-041).** «Los días de un avance van de 1 a 366» para 0, los negativos, más de 366 o algo que no es un entero de días.
- **Fecha máxima (§9 l.1324; §4, D-001).** «**Fecha máxima del avance**: ningún avance … puede pasar del 31 de diciembre de 9999 … Si la fecha resultante lo pasa, el error «No se puede avanzar más allá del 31 de diciembre de 9999» sale bajo el campo de días…» `simular` lanza ese mismo texto como `RangeError`.
- **«Otro…» con fecha de destino (§6.1 P4; técnica 22).** `diasHasta` da los días desde la fecha actual a una fecha elegida en el calendario; el campo de días sigue validándose con `errorDeDiasDeAvance` sobre ese número.
- **Previsiones cortadas en 9999 (§9 l.1322, «Previsiones»; D-001).** «Estas previsiones y simulaciones se cortan en el 31 de diciembre de 9999: no calculan fechas posteriores.» `diasQueCaben` recorta una previsión (por ejemplo, la de un avance por defecto) sin lanzar.
- **No arrastra `avances` (T12, aviso 4 del contrato).** `simular` construye `ResultadoSimulacion.estadoNuevo` con `estadoDe`, nunca copiando el `DocumentoPartida` entero: si la entrada lo llevaba, `avances` desaparece.
- **Rendimiento (técnica 15).** «440 reglas × 366 días ≈ 31 ms»: una prueba de humo con 5 asentamientos, 300 reglas y 5.000 movimientos durante 366 días comprueba que `simular` sigue por debajo de 1 s.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/avance/dias.ts`
- Crear: `src/dominio/motor/simular.ts`
- Prueba: `src/dominio/avance/dias.test.ts`
- Prueba: `src/dominio/motor/simular.test.ts`

- [ ] **Paso 1: Escribir la prueba de `dias.ts`, que falla**

Qué comprueba cada bloque:
- Las tres constantes: 366, 90 y el 31 de diciembre de 9999.
- `errorDeDiasDeAvance`: admite de 1 a 366; rechaza 0, los negativos y más de 366 con «Los días de un avance van de 1 a 366»; rechaza lo que no es un entero (1,5; `NaN`; `Infinity`) con el mismo texto; el 30 de diciembre de 9999 admite 1 día más y rechaza 2 con el mensaje de la fecha máxima; el 31 de diciembre de 9999 ya no admite ni 1.
- `diasHasta`: los días hasta una fecha de destino (7, 366, 0 con la misma fecha); `diasHasta(HOY, HOY)` da 0, que `errorDeDiasDeAvance` rechaza (0 no es un avance válido).
- `diasQueCaben`: no recorta una previsión que cabe (7, 366); recorta en el 31 de diciembre de 9999 (a 1 día desde la víspera; a 0 desde el último día).

Crea `src/dominio/avance/dias.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import {
  DIAS_CON_AVISO,
  DIAS_MAXIMOS_DE_AVANCE,
  FECHA_MAXIMA,
  diasHasta,
  diasQueCaben,
  errorDeDiasDeAvance,
} from './dias'

/** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** El penúltimo y el último día que la app sabe representar. */
const PENULTIMO: Fecha = { anio: 9999, mes: 12, dia: 30 }
const ULTIMO: Fecha = { anio: 9999, mes: 12, dia: 31 }

describe('constantes de avance/dias', () => {
  it('van de 1 a 366 días, avisan por encima de 90 y acaban el 31 de diciembre de 9999', () => {
    expect(DIAS_MAXIMOS_DE_AVANCE).toBe(366)
    expect(DIAS_CON_AVISO).toBe(90)
    expect(FECHA_MAXIMA).toEqual(ULTIMO)
  })
})

describe('errorDeDiasDeAvance', () => {
  it('admite de 1 a 366 días', () => {
    expect(errorDeDiasDeAvance(HOY, 1)).toBeNull()
    expect(errorDeDiasDeAvance(HOY, 90)).toBeNull()
    expect(errorDeDiasDeAvance(HOY, 366)).toBeNull()
  })

  it('rechaza 0, los negativos y más de 366 (§9 l.1323)', () => {
    for (const dias of [0, -1, 367, 1000]) {
      expect(errorDeDiasDeAvance(HOY, dias)).toBe('Los días de un avance van de 1 a 366')
    }
  })

  it('rechaza lo que no es un número entero de días', () => {
    for (const dias of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(errorDeDiasDeAvance(HOY, dias)).toBe('Los días de un avance van de 1 a 366')
    }
  })

  it('no deja pasar del 31 de diciembre de 9999 (§9 l.1324)', () => {
    expect(errorDeDiasDeAvance(PENULTIMO, 1)).toBeNull()
    expect(errorDeDiasDeAvance(PENULTIMO, 2)).toBe('No se puede avanzar más allá del 31 de diciembre de 9999')
    expect(errorDeDiasDeAvance(ULTIMO, 1)).toBe('No se puede avanzar más allá del 31 de diciembre de 9999')
  })
})

describe('diasHasta y diasQueCaben', () => {
  it('diasHasta da los días hasta la fecha de destino de «Otro…» (T22)', () => {
    expect(diasHasta(HOY, { anio: 1640, mes: 4, dia: 19 })).toBe(7)
    expect(diasHasta(HOY, { anio: 1641, mes: 4, dia: 13 })).toBe(366)
    expect(diasHasta(HOY, HOY)).toBe(0)
    expect(errorDeDiasDeAvance(HOY, diasHasta(HOY, HOY))).toBe('Los días de un avance van de 1 a 366')
  })

  it('diasQueCaben no recorta una previsión que cabe', () => {
    expect(diasQueCaben(HOY, 7)).toBe(7)
    expect(diasQueCaben(HOY, 366)).toBe(366)
  })

  it('diasQueCaben recorta en el 31 de diciembre de 9999 (§9 l.1322)', () => {
    expect(diasQueCaben(PENULTIMO, 366)).toBe(1)
    expect(diasQueCaben(ULTIMO, 7)).toBe(0)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/avance/dias.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./dias`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/avance/dias.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/avance/dias.test.ts [ src/dominio/avance/dias.test.ts ]
Error: Cannot find module './dias' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/avance/dias.test.ts
 ❯ src/dominio/avance/dias.test.ts:3:1
      1| import { describe, expect, it } from 'vitest'
      2| import type { Fecha } from '../calendario/fecha'
      3| import {
       | ^
      4|   DIAS_CON_AVISO,
      5|   DIAS_MAXIMOS_DE_AVANCE,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:53:38
   Duration  522ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `dias.ts`**

Crea `src/dominio/avance/dias.ts` con este contenido:

```ts
import { ANIO_MAXIMO, compararFechas, diasEntre, sumarDias, type Fecha } from '../calendario/fecha'

/** Los días de un avance van de 1 a 366 (§9 l.1323). */
export const DIAS_MAXIMOS_DE_AVANCE = 366

/** Por encima de 90 días, P4 muestra un aviso ámbar (§9 l.1323; lo pinta la fase 6). */
export const DIAS_CON_AVISO = 90

/** El último día que la app sabe representar (§4, D-001). */
export const FECHA_MAXIMA: Fecha = { anio: ANIO_MAXIMO, mes: 12, dia: 31 }

/** El error del campo de días, o null (§9 l.1323-1324; D-041). */
export function errorDeDiasDeAvance(fechaActual: Fecha, dias: number): string | null {
  if (!Number.isInteger(dias) || dias < 1 || dias > DIAS_MAXIMOS_DE_AVANCE) {
    return 'Los días de un avance van de 1 a 366'
  }
  if (compararFechas(sumarDias(fechaActual, dias), FECHA_MAXIMA) > 0) {
    return 'No se puede avanzar más allá del 31 de diciembre de 9999'
  }
  return null
}

/** Días desde la fecha actual hasta una fecha de destino («Otro…», §6.1 P4; T22). */
export function diasHasta(fechaActual: Fecha, destino: Fecha): number {
  return diasEntre(fechaActual, destino)
}

/** Los días de una previsión, recortados para no pasar del 31 de diciembre de 9999 (§9 l.1322; D-001). */
export function diasQueCaben(fechaActual: Fecha, dias: number): number {
  return Math.max(0, Math.min(dias, diasEntre(fechaActual, FECHA_MAXIMA)))
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/avance/dias.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  11:53:43
   Duration  820ms (transform 54%, import 30%, worker 9%, tests 6%, environment 1%)
```

- [ ] **Paso 5: Escribir la prueba de `simular.ts`, que falla**

Qué comprueba cada bloque:
- **P4 del 12 al 19 de abril**: `simular(ejemplo, 7, opciones)` crea los 8 movimientos de la vista previa (gen l.502-542), con `avanceId`, `desde` y `hasta` correctos y `estadoNuevo.partida.fechaActual` en el 19; las tres filas «saldo» de `cambios` son las del apartado 4.1 del contrato.
- Avisos y personas: los avisos del 19 salen sin fecha (el de Archet, formato 1) y `personasNuevas` es []; a 105 días añade «Trabajadores de Archet» (§9 l.1295), presente también en `estadoNuevo.personas`.
- Entrada y días: 0 y 367 días, y el 30 de diciembre de 9999 más 2, lanzan `RangeError` con el mensaje literal de `errorDeDiasDeAvance`; el estado nuevo tiene las 34 claves de `EsquemaEstadoPartida` y nunca `avances` (T12); con los mismos ids da el mismo resultado (T1, `idsEnSerie` es determinista); no toca un documento congelado.
- **Prueba de humo**: 5 asentamientos, 300 reglas y 5.000 movimientos durante 366 días, en menos de 1 segundo (técnica 15).

Crea `src/dominio/motor/simular.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { DOM } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { ImpuestoRenta, Trabajador } from '../modelo/asentamiento'
import { EsquemaEstadoPartida, type EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { idsEnSerie } from './ids'
import { conAsentamiento, congelar, estadoMinimo } from './pruebas/constructores'
import { simular } from './simular'
import type { OpcionesSimulacion } from './tipos'

/** El 12 de abril de 1640, jueves: la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** Opciones de una simulación de prueba: ids en serie «sim.1», «sim.2»… y el catálogo del ejemplo. */
function opciones(): OpcionesSimulacion {
  return { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
}

/** Un día de abril de 1640. */
function abril(dia: number): Fecha {
  return { anio: 1640, mes: 4, dia }
}

/** 5 asentamientos con 60 reglas cada uno (300 en total) y 5.000 movimientos ya aplicados (§9, técnica 15). */
function partidaGrande(): EstadoPartida {
  let estado = estadoMinimo(HOY)
  for (let n = 1; n <= 5; n++) {
    estado = conAsentamiento(estado, { id: `dom.aldea-${n}`, nombre: `Aldea ${n}`, caja: 100000000, habitantes: 500 })
  }
  const trabajadores: Trabajador[] = []
  const impuestosRentas: ImpuestoRenta[] = []
  const movimientos: Movimiento[] = []
  for (let n = 1; n <= 5; n++) {
    const dominioId = `dom.aldea-${n}`
    for (let i = 0; i < 20; i++) {
      trabajadores.push({
        id: `trab.${n}.${i}`,
        dominioId,
        oficioId: 'oficio.granjero',
        numero: 2,
        salario: { base: 1000 },
        recurrencia: { tipo: 'semanal', diaSemana: i % 7 },
      })
      impuestosRentas.push({
        id: `imp.${n}.${i}`,
        dominioId,
        sentido: 'ingreso',
        concepto: `Impuesto ${i}`,
        base: i % 2 === 0 ? 'fija' : 'porHabitante',
        importe: { base: 1000 },
        categoriaId: CATEGORIA.impuestos,
        recurrencia: { tipo: 'diaria' },
      })
      impuestosRentas.push({
        id: `trib.${n}.${i}`,
        dominioId,
        sentido: 'tributo',
        concepto: `Tributo ${i}`,
        base: 'fija',
        importe: { base: 5000 },
        categoriaId: CATEGORIA.tributos,
        recurrencia: { tipo: 'mensual', diaMes: i + 1 },
      })
    }
    for (let i = 0; i < 1000; i++) {
      movimientos.push({
        id: `mov.${n}.${i}`,
        dominioId,
        fecha: HOY,
        tipo: 'ingreso',
        importe: { base: 100 },
        categoriaId: CATEGORIA.otros,
        concepto: 'Venta en el mercado',
        origen: 'manual',
        programado: false,
      })
    }
  }
  return { ...estado, trabajadores, impuestosRentas, movimientos }
}

describe('simular: P4 del 12 al 19 de abril', () => {
  it('avanza 7 días y crea los 8 movimientos de la vista previa (gen l.502-542)', () => {
    const resultado = simular(documentoDeEjemplo(), 7, opciones())
    expect(resultado.avanceId).toBe('sim')
    expect(resultado.desde).toEqual(HOY)
    expect(resultado.hasta).toEqual(abril(19))
    expect(resultado.estadoNuevo.partida.fechaActual).toEqual(abril(19))
    const nuevos = resultado.estadoNuevo.movimientos.filter((m) => m.avanceId === 'sim')
    expect(nuevos).toHaveLength(8)
    expect(nuevos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dominioId: DOM.bree,
          fecha: abril(13),
          importe: { base: -420000 },
          concepto: 'Salarios de 14 trabajadores',
        }),
        expect.objectContaining({
          dominioId: DOM.bree,
          fecha: abril(15),
          importe: { base: 1800000 },
          concepto: 'Aranceles del mercado',
        }),
        expect.objectContaining({
          dominioId: DOM.tharan,
          fecha: abril(15),
          importe: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
          concepto: 'Beneficio de Barcaza del Brandivino',
        }),
        expect.objectContaining({
          dominioId: DOM.bree,
          fecha: abril(18),
          importe: { base: 2400000, introducido: { cantidad: '24', moneda: 'mo' } },
          concepto: 'Caravana: venta de cerveza en Fornost',
        }),
        expect.objectContaining({
          dominioId: DOM.archet,
          fecha: abril(19),
          importe: { base: -6000000, introducido: { cantidad: '60', moneda: 'mo' } },
          concepto: 'Tributo a la Corona',
        }),
        expect.objectContaining({
          dominioId: DOM.bree,
          fecha: abril(19),
          importe: { base: 210000 },
          concepto: 'Peaje del camino · 7 días',
        }),
        expect.objectContaining({
          dominioId: DOM.tharan,
          fecha: abril(19),
          importe: { base: -70000 },
          concepto: 'Posada El Poney Pisador · 7 noches',
        }),
        expect.objectContaining({
          dominioId: DOM.tharan,
          fecha: abril(19),
          importe: { base: -14000 },
          concepto: 'Establo del poni · 7 días',
        }),
      ]),
    )
    expect(resultado.cambios.filter((c) => c.tipo === 'saldo')).toEqual([
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4651800, despues: 4717800, movimientos: 3 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 34060000, despues: 38050000, movimientos: 4 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 2500000, movimientos: 1 },
    ])
  })

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

  it('a los 105 días añade «Trabajadores de Archet» a Personas y entidades (§9 l.1295)', () => {
    const resultado = simular(documentoDeEjemplo(), 105, opciones())
    expect(resultado.personasNuevas).toEqual([{ id: expect.any(String), nombre: 'Trabajadores de Archet' }])
    expect(resultado.estadoNuevo.personas).toContainEqual(resultado.personasNuevas[0])
  })
})

describe('simular: entrada y días', () => {
  it('lanza RangeError con el mensaje del campo de días si no valen (§9 l.1323-1324)', () => {
    const vispera = estadoMinimo({ anio: 9999, mes: 12, dia: 30 })
    const casos: [EstadoPartida, number, string][] = [
      [documentoDeEjemplo(), 0, 'Los días de un avance van de 1 a 366'],
      [documentoDeEjemplo(), 367, 'Los días de un avance van de 1 a 366'],
      [vispera, 2, 'No se puede avanzar más allá del 31 de diciembre de 9999'],
    ]
    for (const [estado, dias, mensaje] of casos) {
      expect(() => simular(estado, dias, opciones())).toThrowError(RangeError)
      expect(() => simular(estado, dias, opciones())).toThrowError(mensaje)
    }
  })

  it('con un DocumentoPartida no arrastra `avances`: el estado nuevo tiene las 34 claves (T12)', () => {
    const resultado = simular(documentoDeEjemplo(), 1, opciones())
    expect(Object.keys(resultado.estadoNuevo).sort()).toEqual(Object.keys(EsquemaEstadoPartida.shape).sort())
    expect('avances' in resultado.estadoNuevo).toBe(false)
  })

  it('con los mismos ids da el mismo resultado (T1)', () => {
    expect(simular(documentoDeEjemplo(), 30, opciones())).toEqual(simular(documentoDeEjemplo(), 30, opciones()))
  })

  it('no toca la entrada: simula sobre un documento congelado (T29)', () => {
    const entrada = congelar(documentoDeEjemplo())
    simular(entrada, 30, opciones())
    expect(entrada).toEqual(documentoDeEjemplo())
  })

  it('prueba de humo: 5 asentamientos, 300 reglas y 5.000 movimientos durante 366 días en menos de 1 s', () => {
    const estado = partidaGrande()
    const inicio = performance.now()
    const resultado = simular(estado, 366, opciones())
    const duracion = performance.now() - inicio
    expect(resultado.hasta).toEqual({ anio: 1641, mes: 4, dia: 13 })
    expect(resultado.estadoNuevo.movimientos.length).toBeGreaterThan(5000)
    expect(duracion).toBeLessThan(1000)
  })
})
```

- [ ] **Paso 6: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/motor/simular.test.ts
```

Fallo esperado: ahora es `./simular` el que no existe.

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/motor/simular.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/motor/simular.test.ts [ src/dominio/motor/simular.test.ts ]
Error: Cannot find module './simular' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/motor/simular.test.ts
 ❯ src/dominio/motor/simular.test.ts:11:1
      9| import { idsEnSerie } from './ids'
     10| import { conAsentamiento, congelar, estadoMinimo } from './pruebas/con…
     11| import { simular } from './simular'
       | ^
     12| import type { OpcionesSimulacion } from './tipos'
     13|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:53:47
   Duration  1.13s (worker 97%, environment 3%)
```

- [ ] **Paso 7: Implementar `simular.ts`**

Crea `src/dominio/motor/simular.ts` con este contenido:

```ts
import { errorDeDiasDeAvance } from '../avance/dias'
import { avisosEn, sinFecha } from '../avisos/avisos'
import { sumarDias } from '../calendario/fecha'
import { estadoDe, type EstadoPartida } from '../modelo/documento'
import { recorrerDias } from './bucle'
import { cambiosDelAvance } from './cambios'
import type { OpcionesSimulacion, ResultadoSimulacion } from './tipos'

/** Avanza `dias` días desde fechaActual sin guardar nada; si los días no valen, lanza RangeError con el texto de errorDeDiasDeAvance (§9). */
export function simular(estado: EstadoPartida, dias: number, opciones: OpcionesSimulacion): ResultadoSimulacion {
  const desde = estado.partida.fechaActual
  const error = errorDeDiasDeAvance(desde, dias)
  if (error !== null) {
    throw new RangeError(error)
  }
  const entrada = estadoDe(estado)
  const hasta = sumarDias(desde, dias)
  const recorrido = recorrerDias(entrada, hasta, opciones)
  return {
    avanceId: opciones.avanceId,
    desde,
    hasta,
    estadoNuevo: recorrido.estadoNuevo,
    cambios: cambiosDelAvance(entrada, recorrido, opciones.avanceId, sumarDias(desde, 1), hasta),
    avisos: avisosEn(recorrido.estadoNuevo, opciones.catalogo).map(sinFecha),
    personasNuevas: recorrido.personasNuevas,
  }
}
```

`simular` es la única función del motor que exporta la API pública: valida antes de tocar nada (`errorDeDiasDeAvance`), y el resto son las piezas ya escritas de las tareas 19 y 20, en el orden que pide §9 (`recorrerDias` → `cambiosDelAvance` y `avisosEn`).

- [ ] **Paso 8: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/simular.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  11:53:51
   Duration  1.07s (transform 57%, import 27%, tests 15%, worker 1%)
```

- [ ] **Paso 9: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **805 pruebas en 71 archivos**; `npm run lint` solo escribe su cabecera y sale con código 0. La tarea 20 dejó 787 pruebas en 69 archivos, y esta trae **18 nuevas**: las 8 de `dias.test.ts`, las 8 de `simular.test.ts` y **dos más** en `pureza.test.ts`, que ahora recorre también `avance/dias.ts` y `motor/simular.ts`.

```text
 Test Files  71 passed (71)
      Tests  805 passed (805)
```

- [ ] **Paso 10: Dos commits, uno por módulo**

`avance/dias.ts` es del paquete `avance` y `motor/simular.ts` del paquete `motor` (§1 del contrato, estructura de archivos), así que van en dos commits separados, cada uno con su prefijo:

```bash
git add src/dominio/avance/dias.ts src/dominio/avance/dias.test.ts
git commit -m "feat(avance): días válidos de un avance y días que caben en una previsión" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` deja ver `motor/simular.ts` y su prueba todavía sin añadir:

```text
warning: in the working copy of 'src/dominio/avance/dias.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/avance/dias.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 8943b31] feat(avance): días válidos de un avance y días que caben en una previsión
 2 files changed, 101 insertions(+)
 create mode 100644 src/dominio/avance/dias.test.ts
 create mode 100644 src/dominio/avance/dias.ts
?? src/dominio/motor/simular.test.ts
?? src/dominio/motor/simular.ts
```

```bash
git add src/dominio/motor/simular.ts src/dominio/motor/simular.test.ts
git commit -m "feat(motor): simular, la API pública del motor" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía):

```text
warning: in the working copy of 'src/dominio/motor/simular.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/motor/simular.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 6db865d] feat(motor): simular, la API pública del motor
 2 files changed, 240 insertions(+)
 create mode 100644 src/dominio/motor/simular.test.ts
 create mode 100644 src/dominio/motor/simular.ts
```

**Avisos que esta tarea deja escritos:**

1. `simular` valida los días **antes** de tocar nada: si `dias` no vale, lanza sin llamar a `estadoDe` ni a `recorrerDias`, así que una llamada inválida nunca gasta ids de `nuevoId`.
2. `errorDeDiasDeAvance` comprueba primero el rango de 1 a 366 y solo después la fecha máxima: con `dias` fuera de rango, el mensaje siempre es el de «1 a 366», nunca el del 31 de diciembre de 9999, aunque las dos cosas fallen a la vez.
3. `diasHasta` no valida nada: puede devolver 0 o un número negativo (una fecha pasada); quien la llama pasa el resultado por `errorDeDiasDeAvance` antes de dejar avanzar (así lo hace la prueba con `HOY, HOY`).
4. `ResultadoSimulacion.avisos` ya está en formato 1 (sin fecha, técnica 11): la tarea 22 lo guarda tal cual en `Avance.avisos`, sin tocarlo.
5. La prueba de humo fija un techo de rendimiento (1 s) sobre esta máquina y esta carga; si `pasoCobros` o `pasoPagos` dejan de usar los índices del contexto (aviso 7 del contrato) y vuelven a una búsqueda lineal, esta prueba lo notará antes que ninguna otra.

---

### Tarea 22 · Aplicar y deshacer

El último paso del motor: **guardar** lo que `simular` calculó y **deshacerlo**. Dos módulos del paquete `avance`:

- **`avance/aplicar.ts`**: `aplicarAvance`, que comprueba que el `ResultadoSimulacion` sigue valiendo para esta partida, arma el `Avance` (con la copia del estado anterior y sin la copia de los avances previos) y devuelve el documento con el estado nuevo y el contador de cambios a 0.
- **`avance/deshacer.ts`**: las cuatro funciones de «Deshacer avance» — `puedeDeshacer`, `cambiosQueSePerderan`, `deshacerUltimoAvance` y `avanceDelMovimiento` —, todas mirando si el último avance de la lista guarda su copia (`snapshotPrevio`).

Depende de la tarea 5 (`estadoDe`, y el `DocumentoPartida` y `Avance` de `modelo/documento.ts`) y de la 21 (`simular` y `ResultadoSimulacion`).

**Reglas de la especificación que implementa:**

- **Confirmar el avance (§9 l.1271).** «al confirmar se guarda `estadoNuevo` y se crea un `Avance` con la fecha en que se aplica y una copia de la partida completa» (`Avance.snapshotPrevio`, sección 8 del modelo).
- **Solo el último, y siempre se puede (§9, «Deshacer avance»).** «Solo el último, y siempre se puede… Restaura `snapshotPrevio` (la partida completa) y descarta lo registrado, editado o eliminado después.» Solo se guarda la copia del avance más reciente (D-039): al aplicar uno nuevo, la copia del anterior se descarta con `sinCopia`.
- **Cambios que se pierden (§9, «Deshacer avance»; P5 l.1446).** «El diálogo avisa «Se perderán 3 cambios hechos después del avance» (con Avance.aplicadoEl y el contador de cambios de la partida).» `cambiosQueSePerderan` es ese contador, `partida.cambiosDesdeUltimoAvance` (D-038).
- **Sin avance que deshacer (D-041).** «No hay ningún avance que deshacer»: `deshacerUltimoAvance` lo lanza si no hay avances o el último ya no guarda su copia.
- **La partida cambió (D-041).** «La partida cambió después de la vista previa: vuelve a calcularla»: `aplicarAvance` lo lanza si `resultado.desde` no es ya la fecha actual del documento, o si el `id` de la partida no coincide (otra partida, o la misma reabierta con datos distintos).
- **Reconstruir el avance anterior sin la copia (aviso 22 del contrato).** El `Avance` que deja de ser el último se reescribe **sin la clave** `snapshotPrevio`, nunca con `snapshotPrevio: undefined`: así no queda un `undefined` que IndexedDB tendría que guardar (D-008, la partida solo lleva un `snapshotPrevio` a la vez).
- **`aplicadoEl` nunca retrocede (aviso 23 del contrato; técnica 12).** Si el reloj de la tablet fuese hacia atrás, `aplicadoEl` se queda con el mayor entre `ahora` y el `aplicadoEl` del avance anterior: los instantes ISO en UTC se comparan como texto.
- **J2c y J2d, quién puede avisar (§9, «Deshacer avance»).** «J2c avisa: «Si deshaces ese avance, esta edición se perderá.» … J2d avisa … «Lo creó el avance del 10 al 12 de abril. Si deshaces ese avance, el movimiento volverá a aparecer.»» `avanceDelMovimiento` es la función que esas dos pantallas (de la fase 5) usarán para decidir si avisar: solo si el movimiento es del último avance y ese avance todavía se puede deshacer.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/avance/aplicar.ts`
- Crear: `src/dominio/avance/deshacer.ts`
- Prueba: `src/dominio/avance/aplicar.test.ts`
- Prueba: `src/dominio/avance/deshacer.test.ts`

- [ ] **Paso 1: Escribir la prueba de `aplicar.ts`, que falla**

Qué comprueba cada bloque:
- Con el ejemplo (4 avances, ninguno con copia) y `simular(ejemplo, 7)`: `aplicarAvance` deja 5 avances, y solo el último lleva `snapshotPrevio` (D-008); los cuatro primeros conservan su `id`; el quinto es exactamente `{ id: 'sim', desde: 12/4, hasta: 19/4, aplicadoEl, cambios, avisos, snapshotPrevio: estadoDe(documentoDeEjemplo()) }`.
- El estado resultante es `estadoDe(resultado.estadoNuevo)` con el contador a 0; la copia guarda el contador de **antes** de aplicar (2, si el documento lo tenía a 2).
- `aplicadoEl` nunca retrocede: aplicado con un reloj anterior al último avance del ejemplo, se queda el del último («2026-09-08T19:45:00.000Z», técnica 12).
- Rechaza un resultado calculado sobre otra fecha (aplicar dos veces el mismo resultado) o sobre otra partida (`partida.id` distinto), con el mensaje literal.
- El documento resultante es válido con `EsquemaDocumentoPartida` y `validarCopia`, con un impago (7 días) y con una persona nueva (105 días).
- Encadena dos avances seguidos, cada uno con su prefijo de ids (para no repetirlos, aviso 9 del contrato): el segundo documento sigue siendo válido, y solo el avance más reciente guarda copia.
- No toca el documento ni el resultado que recibe (congelados).

Crea `src/dominio/avance/aplicar.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { EsquemaDocumentoPartida, estadoDe, type DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { simular } from '../motor/simular'
import type { OpcionesSimulacion } from '../motor/tipos'
import { validarCopia } from '../validacion/coherencia'
import { aplicarAvance } from './aplicar'

/** Un instante posterior al último avance del ejemplo («2026-09-08T19:45:00.000Z»). */
const AHORA = '2026-09-18T12:00:00.000Z'

/** Opciones de una simulación de prueba, con su prefijo: dos avances seguidos no pueden repetir ids. */
function opciones(prefijo = 'sim'): OpcionesSimulacion {
  return { avanceId: prefijo, nuevoId: idsEnSerie(prefijo), catalogo: catalogosDeEjemplo() }
}

/** El ejemplo avanzado `dias` días y aplicado. */
function avanzado(dias: number): DocumentoPartida {
  const documento = documentoDeEjemplo()
  return aplicarAvance(documento, simular(documento, dias, opciones()), AHORA)
}

describe('aplicarAvance', () => {
  it('añade el avance con la copia del estado del 12 y quita la copia del anterior (D-008)', () => {
    const documento = documentoDeEjemplo()
    const resultado = simular(documento, 7, opciones())
    const aplicado = aplicarAvance(documento, resultado, AHORA)
    expect(aplicado.avances).toHaveLength(5)
    expect(aplicado.avances.map((a) => 'snapshotPrevio' in a)).toEqual([false, false, false, false, true])
    expect(aplicado.avances.slice(0, 4).map((a) => a.id)).toEqual(documento.avances.map((a) => a.id))
    expect(aplicado.avances[4]).toEqual({
      id: 'sim',
      desde: { anio: 1640, mes: 4, dia: 12 },
      hasta: { anio: 1640, mes: 4, dia: 19 },
      aplicadoEl: AHORA,
      cambios: resultado.cambios,
      avisos: resultado.avisos,
      snapshotPrevio: estadoDe(documentoDeEjemplo()),
    })
  })

  it('el estado es el de la vista previa con el contador a 0; la copia guarda el contador de antes', () => {
    const documento = documentoDeEjemplo()
    documento.partida.cambiosDesdeUltimoAvance = 2
    const resultado = simular(documento, 7, opciones())
    const aplicado = aplicarAvance(documento, resultado, AHORA)
    expect(estadoDe(aplicado)).toEqual({
      ...resultado.estadoNuevo,
      partida: { ...resultado.estadoNuevo.partida, cambiosDesdeUltimoAvance: 0 },
    })
    expect(aplicado.avances[4].snapshotPrevio?.partida.cambiosDesdeUltimoAvance).toBe(2)
  })

  it('aplicadoEl nunca va hacia atrás: si el reloj marca antes que el último avance, se queda el del último (T12)', () => {
    const documento = documentoDeEjemplo()
    const aplicado = aplicarAvance(documento, simular(documento, 7, opciones()), '2026-09-01T10:00:00.000Z')
    expect(aplicado.avances[4].aplicadoEl).toBe('2026-09-08T19:45:00.000Z')
  })

  it('rechaza un resultado calculado sobre otra fecha o sobre otra partida (D-041)', () => {
    const documento = documentoDeEjemplo()
    const resultado = simular(documento, 7, opciones())
    const yaAplicado = aplicarAvance(documento, resultado, AHORA)
    expect(() => aplicarAvance(yaAplicado, resultado, AHORA)).toThrowError(
      'La partida cambió después de la vista previa: vuelve a calcularla',
    )
    const otra: DocumentoPartida = { ...documento, partida: { ...documento.partida, id: 'p.otra' } }
    expect(() => aplicarAvance(otra, resultado, AHORA)).toThrowError(
      'La partida cambió después de la vista previa: vuelve a calcularla',
    )
  })

  it('deja un documento válido, también con un impago y una persona nueva (7 y 105 días)', () => {
    for (const dias of [7, 105]) {
      const aplicado = avanzado(dias)
      expect(EsquemaDocumentoPartida.safeParse(aplicado).success).toBe(true)
      expect(validarCopia(aplicado, catalogosDeEjemplo())).toEqual([])
    }
  })

  it('encadena dos avances, cada uno con sus ids, y solo el último guarda la copia', () => {
    const primero = avanzado(7)
    const segundo = aplicarAvance(primero, simular(primero, 7, opciones('sim2')), '2026-09-18T12:05:00.000Z')
    expect(segundo.partida.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 26 })
    expect(segundo.avances.map((a) => a.id).slice(-2)).toEqual(['sim', 'sim2'])
    expect(segundo.avances.map((a) => 'snapshotPrevio' in a)).toEqual([false, false, false, false, false, true])
    expect(estadoDe(segundo.avances[5].snapshotPrevio ?? primero)).toEqual(estadoDe(primero))
    expect(validarCopia(segundo, catalogosDeEjemplo())).toEqual([])
  })

  it('no toca el documento ni el resultado que recibe', () => {
    const documento = congelar(documentoDeEjemplo())
    const resultado = congelar(simular(documento, 7, opciones()))
    aplicarAvance(documento, resultado, AHORA)
    expect(documento).toEqual(documentoDeEjemplo())
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/avance/aplicar.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./aplicar`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/avance/aplicar.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/avance/aplicar.test.ts [ src/dominio/avance/aplicar.test.ts ]
Error: Cannot find module './aplicar' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/avance/aplicar.test.ts
 ❯ src/dominio/avance/aplicar.test.ts:9:1
      7| import type { OpcionesSimulacion } from '../motor/tipos'
      8| import { validarCopia } from '../validacion/coherencia'
      9| import { aplicarAvance } from './aplicar'
       | ^
     10|
     11| /** Un instante posterior al último avance del ejemplo («2026-09-08T19…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:54:16
   Duration  1.92s (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `aplicar.ts`**

Crea `src/dominio/avance/aplicar.ts` con este contenido:

```ts
import { compararFechas } from '../calendario/fecha'
import type { Instante } from '../modelo/comunes'
import { estadoDe, type Avance, type DocumentoPartida } from '../modelo/documento'
import type { ResultadoSimulacion } from '../motor/tipos'

/** El avance sin su copia: se rehace sin la clave `snapshotPrevio`, nunca con `undefined`, que IndexedDB guardaría (D-008). */
function sinCopia(avance: Avance): Avance {
  return {
    id: avance.id,
    desde: avance.desde,
    hasta: avance.hasta,
    aplicadoEl: avance.aplicadoEl,
    cambios: avance.cambios,
    avisos: avance.avisos,
  }
}

/** El documento con el resultado aplicado: estado nuevo, contador a 0 y el Avance con la copia del estado anterior (§9; D-008; T12). */
export function aplicarAvance(
  documento: DocumentoPartida,
  resultado: ResultadoSimulacion,
  ahora: Instante,
): DocumentoPartida {
  const partida = documento.partida
  if (compararFechas(resultado.desde, partida.fechaActual) !== 0 || resultado.estadoNuevo.partida.id !== partida.id) {
    throw new Error('La partida cambió después de la vista previa: vuelve a calcularla')
  }
  const anteriores = documento.avances
  const ultimo = anteriores[anteriores.length - 1]
  // Los instantes ISO en UTC se ordenan como texto: si el reloj de la tablet va hacia atrás, se queda el del último (T12).
  const aplicadoEl = ultimo !== undefined && ultimo.aplicadoEl > ahora ? ultimo.aplicadoEl : ahora
  const nuevo: Avance = {
    id: resultado.avanceId,
    desde: resultado.desde,
    hasta: resultado.hasta,
    aplicadoEl,
    cambios: resultado.cambios,
    avisos: resultado.avisos,
    snapshotPrevio: estadoDe(documento),
  }
  const estado = estadoDe(resultado.estadoNuevo)
  return {
    ...estado,
    partida: { ...estado.partida, cambiosDesdeUltimoAvance: 0 },
    avances: [...anteriores.map(sinCopia), nuevo],
  }
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/avance/aplicar.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  11:54:21
   Duration  1.18s (transform 61%, import 26%, tests 12%, worker 1%)
```

- [ ] **Paso 5: Escribir la prueba de `deshacer.ts`, que falla**

Qué comprueba cada bloque:
- `puedeDeshacer`: el ejemplo (con copia en su último avance) da `true`; sin avances o con avances sin copia (los tres primeros del ejemplo, cortados con `.slice(0, 3)`), `false`.
- `cambiosQueSePerderan`: es el contador de la partida, 0 por defecto, lo que se le ponga (3) y 0 tras aplicar un avance nuevo.
- `deshacerUltimoAvance`: sobre el ejemplo congelado, restaura exactamente `SNAPSHOT_10_ABRIL`, deja el contador de cambios en el que tenía la copia (3) y quita el último avance de la lista, sin tocar la entrada; deshacer lo que se acaba de aplicar (12 → 19) devuelve el estado del 12 y los mismos 4 avances de antes, ninguno con copia; después de deshacer ya no se puede deshacer otra vez (D-039), y sin avances lanza «No hay ningún avance que deshacer».
- `avanceDelMovimiento`: el movimiento de la posada del 12 de abril viene del avance `hasta12Abril` (el último, con copia); el de la posada del 10 de abril y uno manual (Athelas) dan `undefined`; tras aplicar un avance nuevo, un movimiento suyo da ese avance y uno del 12 de abril ya da `undefined` (dejó de ser el último).

Crea `src/dominio/avance/deshacer.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { AVANCES, SNAPSHOT_10_ABRIL } from '../ejemplo/avances'
import { AVANCE, MOV_THARAN } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { estadoDe, type DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { simular } from '../motor/simular'
import { aplicarAvance } from './aplicar'
import { avanceDelMovimiento, cambiosQueSePerderan, deshacerUltimoAvance, puedeDeshacer } from './deshacer'

/** Un instante posterior al último avance del ejemplo («2026-09-08T19:45:00.000Z»). */
const AHORA = '2026-09-18T12:00:00.000Z'

/** El ejemplo con el avance del 12 al 19 ya aplicado. */
function avanzadoAl19(): DocumentoPartida {
  const documento = documentoDeEjemplo()
  const opciones = { avanceId: 'sim', nuevoId: idsEnSerie('sim'), catalogo: catalogosDeEjemplo() }
  return aplicarAvance(documento, simular(documento, 7, opciones), AHORA)
}

/** Un movimiento del ejemplo por su id. */
function movimiento(documento: DocumentoPartida, id: string): Movimiento {
  const encontrado = documento.movimientos.find((m) => m.id === id)
  if (encontrado === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  return encontrado
}

describe('puedeDeshacer y cambiosQueSePerderan', () => {
  it('solo se puede deshacer si el último avance guarda su copia (§9 l.1326)', () => {
    expect(puedeDeshacer(documentoDeEjemplo())).toBe(true)
    expect(puedeDeshacer({ ...documentoDeEjemplo(), avances: [] })).toBe(false)
    expect(puedeDeshacer({ ...documentoDeEjemplo(), avances: AVANCES.slice(0, 3) })).toBe(false)
  })

  it('cuenta los cambios hechos después del avance: «Se perderán 3 cambios» (§9 l.1327)', () => {
    const documento = documentoDeEjemplo()
    expect(cambiosQueSePerderan(documento)).toBe(0)
    documento.partida.cambiosDesdeUltimoAvance = 3
    expect(cambiosQueSePerderan(documento)).toBe(3)
    expect(cambiosQueSePerderan(avanzadoAl19())).toBe(0)
  })
})

describe('deshacerUltimoAvance', () => {
  it('restaura la copia del 10 de abril y quita el último avance, sin tocar la entrada', () => {
    const documento = congelar(documentoDeEjemplo())
    const deshecho = deshacerUltimoAvance(documento)
    expect(estadoDe(deshecho)).toEqual(SNAPSHOT_10_ABRIL)
    expect(deshecho.partida.cambiosDesdeUltimoAvance).toBe(3)
    expect(deshecho.avances.map((a) => a.id)).toEqual([AVANCE.hasta31Marzo, AVANCE.hasta6Abril, AVANCE.hasta10Abril])
    expect(documento).toEqual(documentoDeEjemplo())
  })

  it('deshacer lo que se acaba de aplicar devuelve el estado del 12 y los 4 avances de antes', () => {
    const deshecho = deshacerUltimoAvance(avanzadoAl19())
    expect(estadoDe(deshecho)).toEqual(estadoDe(documentoDeEjemplo()))
    expect(deshecho.avances.map((a) => a.id)).toEqual(documentoDeEjemplo().avances.map((a) => a.id))
    expect(deshecho.avances.map((a) => 'snapshotPrevio' in a)).toEqual([false, false, false, false])
  })

  it('después de deshacer ya no se puede deshacer otra vez (D-039), y sin avances lanza', () => {
    const deshecho = deshacerUltimoAvance(documentoDeEjemplo())
    expect(puedeDeshacer(deshecho)).toBe(false)
    expect(() => deshacerUltimoAvance(deshecho)).toThrowError('No hay ningún avance que deshacer')
    expect(() => deshacerUltimoAvance({ ...documentoDeEjemplo(), avances: [] })).toThrowError(
      'No hay ningún avance que deshacer',
    )
  })
})

describe('avanceDelMovimiento', () => {
  it('da el avance que creó el movimiento solo si es el último y se puede deshacer (§9 l.1328-1329)', () => {
    const documento = documentoDeEjemplo()
    expect(avanceDelMovimiento(documento, movimiento(documento, MOV_THARAN.posada12Abril))?.id).toBe(
      AVANCE.hasta12Abril,
    )
    expect(avanceDelMovimiento(documento, movimiento(documento, MOV_THARAN.posada10Abril))).toBeUndefined()
    expect(avanceDelMovimiento(documento, movimiento(documento, MOV_THARAN.athelas))).toBeUndefined()

    const avanzado = avanzadoAl19()
    const delAvance = avanzado.movimientos.find((m) => m.avanceId === 'sim')
    expect(delAvance).toBeDefined()
    expect(avanceDelMovimiento(avanzado, delAvance ?? movimiento(avanzado, MOV_THARAN.athelas))?.id).toBe('sim')
    expect(avanceDelMovimiento(avanzado, movimiento(avanzado, MOV_THARAN.posada12Abril))).toBeUndefined()
  })
})
```

- [ ] **Paso 6: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/avance/deshacer.test.ts
```

Fallo esperado: ahora es `./deshacer` el que no existe.

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/avance/deshacer.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/avance/deshacer.test.ts [ src/dominio/avance/deshacer.test.ts ]
Error: Cannot find module './deshacer' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/avance/deshacer.test.ts
 ❯ src/dominio/avance/deshacer.test.ts:11:1
      9| import { simular } from '../motor/simular'
     10| import { aplicarAvance } from './aplicar'
     11| import { avanceDelMovimiento, cambiosQueSePerderan, deshacerUltimoAvan…
       | ^
     12|
     13| /** Un instante posterior al último avance del ejemplo («2026-09-08T19…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:54:25
   Duration  1.09s (worker 98%, environment 2%)
```

- [ ] **Paso 7: Implementar `deshacer.ts`**

Crea `src/dominio/avance/deshacer.ts` con este contenido:

```ts
import { estadoDe, type Avance, type DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'

/** El último avance, si guarda su copia: el único que se puede deshacer (D-008). */
function ultimoConCopia(documento: DocumentoPartida): Avance | undefined {
  const ultimo = documento.avances[documento.avances.length - 1]
  return ultimo?.snapshotPrevio === undefined ? undefined : ultimo
}

/** Si el último avance guarda su copia y se puede deshacer (§9 l.1326; D-039). */
export function puedeDeshacer(documento: DocumentoPartida): boolean {
  return ultimoConCopia(documento) !== undefined
}

/** Los cambios que se perderán: «Se perderán 3 cambios hechos después del avance» (§9 l.1327; D-038). */
export function cambiosQueSePerderan(documento: DocumentoPartida): number {
  return documento.partida.cambiosDesdeUltimoAvance
}

/** Restaura la copia del último avance y lo quita de la lista; lanza si no se puede (§9 l.1325-1330). */
export function deshacerUltimoAvance(documento: DocumentoPartida): DocumentoPartida {
  const ultimo = ultimoConCopia(documento)
  if (ultimo?.snapshotPrevio === undefined) {
    throw new Error('No hay ningún avance que deshacer')
  }
  return { ...estadoDe(ultimo.snapshotPrevio), avances: documento.avances.slice(0, -1) }
}

/** El avance que creó o aplicó un movimiento, si es el último y se puede deshacer: para los avisos de J2c y J2d (§9 l.1328-1329). */
export function avanceDelMovimiento(documento: DocumentoPartida, movimiento: Movimiento): Avance | undefined {
  const ultimo = ultimoConCopia(documento)
  return ultimo !== undefined && movimiento.avanceId === ultimo.id ? ultimo : undefined
}
```

`ultimoConCopia` es la única función que mira `documento.avances`: las otras tres la reutilizan, así que «solo el último, y siempre que guarde su copia» queda escrito en un solo sitio.

- [ ] **Paso 8: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/avance/deshacer.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  11:54:28
   Duration  1.19s (transform 65%, import 29%, tests 5%, worker 1%)
```

- [ ] **Paso 9: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **820 pruebas en 73 archivos**; `npm run lint` solo escribe su cabecera y sale con código 0. La tarea 21 dejó 805 pruebas en 71 archivos, y esta trae **15 nuevas**: las 7 de `aplicar.test.ts`, las 6 de `deshacer.test.ts` y **dos más** en `pureza.test.ts`, que ahora recorre también `avance/aplicar.ts` y `avance/deshacer.ts`.

```text
 Test Files  73 passed (73)
      Tests  820 passed (820)
```

- [ ] **Paso 10: Commit**

```bash
git add src/dominio/avance/aplicar.ts src/dominio/avance/aplicar.test.ts src/dominio/avance/deshacer.ts src/dominio/avance/deshacer.test.ts
git commit -m "feat(avance): aplicar el avance de la vista previa y deshacer el último" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/avance/aplicar.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/avance/aplicar.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/avance/deshacer.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/avance/deshacer.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 4721bad] feat(avance): aplicar el avance de la vista previa y deshacer el último
 4 files changed, 269 insertions(+)
 create mode 100644 src/dominio/avance/aplicar.test.ts
 create mode 100644 src/dominio/avance/aplicar.ts
 create mode 100644 src/dominio/avance/deshacer.test.ts
 create mode 100644 src/dominio/avance/deshacer.ts
```

**Avisos que esta tarea deja escritos:**

1. `aplicarAvance` no valida el documento con Zod al guardar (técnica 12): lo garantizan las pruebas (`EsquemaDocumentoPartida.safeParse` y `validarCopia` en la propia prueba de esta tarea, y de nuevo en el entregable de la tarea 28). Quien lo llame desde `src/datos` (fase 6) es responsable de pasarlo por Dexie tal cual.
2. `deshacerUltimoAvance` no revalida nada: como restaura una copia que ya fue una partida válida, no hace falta volver a comprobarla.
3. Encadenar avances exige un `avanceId` y un `nuevoId` distintos por avance (aviso 9 del contrato: `idsEnSerie('sim')`, `idsEnSerie('sim2')`…); si dos avances seguidos compartieran prefijo, sus ids se repetirían y `validarUnicidades` fallaría al validar la copia.
4. `avanceDelMovimiento` no dice si el avance en sí se puede deshacer con otro criterio que no sea «es el último y guarda copia»: no hace falta ninguno más, porque D-039 ya dice que solo ese se puede deshacer nunca.
5. Esta tarea cierra el motor de la fase 3: la tarea 28 (entregable) vuelve a comprobar `aplicarAvance` y `deshacerUltimoAvance` como parte de sus invariantes con 1, 7, 19, 98 y 366 días.

---

### Tarea 23 · Movimientos sueltos

Hasta aquí la fase 3 solo ha escrito el motor. Esta tarea abre la carpeta `src/dominio/edicion/`, que guarda las **ediciones que hace el jugador** y que la fase 3 necesita para cerrar dos reglas pendientes de la fase 2 y para que «Deshacer avance» sepa cuántos cambios se pierden. Son funciones puras: reciben el estado, devuelven el estado nuevo y no escriben en IndexedDB; la tarea 27 es la que guarda.

Trae dos módulos:

- `edicion/registros.ts`, lo común a todas las ediciones:
  - `Sello` (la hora y el generador de ids, que el dominio no puede sacar del navegador) y `Creado` (el estado nuevo y el id del registro creado).
  - `mismoRegistro`: igualdad a fondo **sin mirar `editadoEl`**, y con un campo ausente igual a uno `undefined`.
  - `buscarPorId`, `reemplazarPorId` y `quitarPorId`. `reemplazarPorId` devuelve **la misma lista** si el registro no cambió y, si cambió, le pone `editadoEl = ahora`.
  - `contarCambio`, que suma 1 a `cambiosDesdeUltimoAvance`. Lo usa `guardarEdicion` (tarea 27), no las funciones de edición: un guardado es un cambio, toque los registros que toque (D-038).
- `edicion/movimientos.ts`, los movimientos sueltos de J2b, J2c y J2d:
  - `crearMovimiento`: con fecha futura queda programado.
  - `editarMovimiento`: rechaza los vinculados, en un cobro de locales solo deja cambiar el importe y recalcula `programado`; si un programado pasa a hoy o antes, se aplica y crea su objeto pendiente.
  - `eliminarMovimiento`: el objeto que compró se queda sin `movimientoCompraId`.

Cinco ideas que valen para las tareas 23 a 26:

- **La misma referencia si nada cambia** (técnica 13, regla pendiente 1 de la fase 2). Si el jugador pulsa «Guardar» sin tocar nada, la función devuelve **el mismo objeto `estado`** que recibió. Así `guardarEdicion` no escribe y «última modificación» no se mueve sola.
- **`editadoEl` solo en el registro que el jugador edita** (técnica 31). Los efectos de un borrado (quitar `movimientoCompraId`, `regla`, `origenId` o `localId`) no lo ponen. Si lo pusieran, la comprobación de detalle frente a total de la tarea 6 (técnica 4) dejaría de vigilar esos movimientos.
- **Genéricas en `E extends EstadoPartida`**. Funcionan igual con un `DocumentoPartida`: `{ ...estado, movimientos }` conserva `avances`. Las ediciones no tocan la copia del último avance: por eso «Deshacer avance» las pierde (§9 l.1327).
- **Nunca mutan la entrada.** Las pruebas congelan el ejemplo con `congelar` (tarea 10): cualquier escritura lanza.
- **Un id que no existe es un error de programación** y lanza «No existe «id»» (contrato, apartado 3.5). `buscarPorId` es un ayudante más de `registros.ts` que el contrato no nombraba; lo usan las cuatro tareas de edición.

La casilla «Añadir también al inventario» de J2b y la de «Quitar también las 3 athelas del inventario» de J2d son de la fase 5 (técnica 19): aquí `crearMovimiento` no crea objetos. Lo único que esta tarea resuelve del inventario es el objeto pendiente de un programado que se lleva a hoy con J2c (técnica 14), con `anadirObjetoComprado` de la tarea 12.

Depende de la tarea 6 (técnica 4: un movimiento con `editadoEl` ya no tiene que cuadrar su detalle con el total), de la 10 (`NuevoId`, `idsEnSerie` y `congelar`) y de la 12 (`anadirObjetoComprado`). Son **2 módulos nuevos del dominio**, así que `pureza.test.ts` suma 2 pruebas.

**Reglas de la especificación que implementa:**

- **J2b (§6.2, l.347).** «Gasto, ingreso o transferencia (esta abre J2f); campo de importe; concepto, categoría, «Sale de» o «Entra en» y fecha; […] Con fecha futura queda programado y se aplica al avanzar». El signo lo pone el tipo: un gasto se guarda en negativo (decisión 18 de la fase 2).
- **J2c (§6.2, l.348).** «Igual que J2b con los datos cargados, salvo el tipo, que no se cambia (sin segmentos)». Por eso `CambiosMovimiento` es todo menos `tipo`.
- **Vinculados (§6.2, l.384; §6.4, l.751).** «Los movimientos vinculados no se abren con J2c: su editar abre el formulario de su origen (6.4).» Editarlos o eliminarlos aquí lanza «Este movimiento se edita desde su origen» (D-041).
- **Cobro de locales (§6.2, l.385).** «encima del importe total, el detalle por local en solo lectura […]. Solo se edita el importe total.» Cualquier otro cambio lanza «En un cobro de impuestos de locales solo se cambia el importe total» (D-041).
- **Automáticos (§6.4, l.765).** «Los movimientos automáticos de reglas recurrentes […] no son vinculados. Cada ocurrencia se edita suelta con J2c y la regla no cambia.» Un pago agrupado de salarios se edita como uno suelto y su detalle queda en solo lectura (técnica 32).
- **Programados (§6.4, l.768; §7, l.1199).** «el saldo solo suma los movimientos no programados. J2 y A2 muestran un grupo «Programados» […], editables con J2c.» «Un movimiento con fecha futura queda programado. No cuenta en el saldo hasta que el avance llega a su fecha». Editar la fecha recalcula `programado`; si pasa a hoy o antes, se aplica al guardar (técnica 14).
- **Inventario (§7, l.1173).** «Con fecha futura, el objeto se crea al aplicarse el movimiento.» Si se aplica con J2c, el objeto se crea en ese momento (D-034).
- **Al eliminar (§6.4, l.775 y l.767).** «Movimiento suelto | Se borra y se recalcula el saldo». «El objeto guarda movimientoCompraId»: al borrar el movimiento, el objeto se queda y pierde el enlace (técnica 31).

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/edicion/registros.ts`
- Crear: `src/dominio/edicion/movimientos.ts`
- Prueba: `src/dominio/edicion/registros.test.ts` (7 pruebas)
- Prueba: `src/dominio/edicion/movimientos.test.ts` (12 pruebas)

- [ ] **Paso 1: Escribir la prueba de `registros.ts`, que falla**

Qué comprueba cada bloque:
- `mismoRegistro`: no mira `editadoEl`, un campo ausente vale lo mismo que uno `undefined`, y distingue un cambio dentro de un objeto anidado o el orden de una lista.
- `reemplazarPorId`: la misma lista si nada cambia (aunque llegue otro `editadoEl`), `editadoEl = ahora` en la fila que cambia y las demás con la misma referencia, y el error de un id que no existe.
- `quitarPorId` y `buscarPorId`, y `contarCambio`, que no toca los avances ni la entrada.

Crea `src/dominio/edicion/registros.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import { RECURRENTE } from '../ejemplo/ids'
import type { Instante } from '../modelo/comunes'
import type { RecurrenteDinero } from '../modelo/movimientos'
import { congelar } from '../motor/pruebas/constructores'
import { buscarPorId, contarCambio, mismoRegistro, quitarPorId, reemplazarPorId } from './registros'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** Los cuatro recurrentes de Tharan, congelados: ninguna función puede escribir en ellos. */
function recurrentes(): RecurrenteDinero[] {
  return congelar(documentoDeEjemplo().recurrentes)
}

describe('mismoRegistro', () => {
  it('compara a fondo sin mirar editadoEl, y un campo ausente vale lo mismo que uno sin valor', () => {
    const posada = recurrentes()[0]
    expect(mismoRegistro(posada, { ...posada, editadoEl: AHORA })).toBe(true)
    expect(mismoRegistro({ id: 'rec.a', notas: undefined }, { id: 'rec.a' })).toBe(true)
    expect(mismoRegistro(posada, { ...posada, notas: undefined })).toBe(false)
    expect(mismoRegistro(posada, { ...posada, importe: { base: 10000 } })).toBe(false)
    expect(mismoRegistro(posada, { ...posada, recurrencia: { tipo: 'diaria', inicio: { anio: 1640, mes: 4, dia: 2 } } })).toBe(false)
    expect(mismoRegistro([1, 2], [2, 1])).toBe(false)
  })
})

describe('reemplazarPorId', () => {
  it('devuelve la misma lista si el registro no cambia, aunque traiga otro editadoEl', () => {
    const lista = recurrentes()
    expect(reemplazarPorId(lista, { ...lista[1] }, AHORA)).toBe(lista)
    expect(reemplazarPorId(lista, { ...lista[1], editadoEl: '2026-01-01T00:00:00.000Z' }, AHORA)).toBe(lista)
  })

  it('si cambia, sella editadoEl = ahora en esa fila y deja las demás como estaban', () => {
    const lista = recurrentes()
    const nueva = reemplazarPorId(lista, { ...lista[2], activo: true }, AHORA)
    expect(nueva).not.toBe(lista)
    expect(nueva[2]).toEqual({ ...lista[2], activo: true, editadoEl: AHORA })
    expect(nueva[0]).toBe(lista[0])
    expect(nueva[3]).toBe(lista[3])
    expect(lista[2].activo).toBe(false)
  })

  it('lanza si el id no existe: es un error de programación', () => {
    const lista = recurrentes()
    expect(() => reemplazarPorId(lista, { ...lista[0], id: 'rec.no-existe' }, AHORA)).toThrow(
      'No existe «rec.no-existe»',
    )
  })
})

describe('quitarPorId y buscarPorId', () => {
  it('quitarPorId quita la fila y devuelve la misma lista si no estaba', () => {
    const lista = recurrentes()
    expect(quitarPorId(lista, RECURRENTE.escolta).map((r) => r.id)).toEqual([
      RECURRENTE.posada,
      RECURRENTE.establo,
      RECURRENTE.alquilerCasaArchet,
    ])
    expect(quitarPorId(lista, 'rec.no-existe')).toBe(lista)
    expect(lista).toHaveLength(4)
  })

  it('buscarPorId devuelve el registro y lanza si no está', () => {
    const lista = recurrentes()
    expect(buscarPorId(lista, RECURRENTE.establo)).toBe(lista[1])
    expect(() => buscarPorId(lista, 'rec.no-existe')).toThrow('No existe «rec.no-existe»')
  })
})

describe('contarCambio', () => {
  it('suma 1 a cambiosDesdeUltimoAvance, conserva los avances y no toca la entrada (D-038)', () => {
    const documento = congelar(documentoDeEjemplo())
    const una = contarCambio(documento)
    const dos = contarCambio(una)
    expect(una.partida.cambiosDesdeUltimoAvance).toBe(1)
    expect(dos.partida.cambiosDesdeUltimoAvance).toBe(2)
    expect(dos.avances).toBe(documento.avances)
    expect(dos.movimientos).toBe(documento.movimientos)
    expect(documento.partida.cambiosDesdeUltimoAvance).toBe(0)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/edicion/registros.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./registros`, que todavía no existe. La hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/edicion/registros.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/edicion/registros.test.ts [ src/dominio/edicion/registros.test.ts ]
Error: Cannot find module './registros' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/edicion/registros.test.ts
 ❯ src/dominio/edicion/registros.test.ts:7:1
      5| import type { RecurrenteDinero } from '../modelo/movimientos'
      6| import { congelar } from '../motor/pruebas/constructores'
      7| import { buscarPorId, contarCambio, mismoRegistro, quitarPorId, reempl…
       | ^
      8|
      9| /** La hora de las ediciones de estas pruebas. */

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Implementar `registros.ts`**

Crea `src/dominio/edicion/registros.ts` con este contenido:

```ts
import type { Id, Instante } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { NuevoId } from '../motor/tipos'

/** Lo que necesita una edición del mundo exterior: la hora y los ids nuevos (T13). */
export interface Sello {
  ahora: Instante
  nuevoId: NuevoId
}

/** Lo que devuelve un alta: el estado nuevo y el id creado. */
export interface Creado<E> {
  estado: E
  id: Id
}

/**
 * Igualdad a fondo de los valores del documento (objetos, listas y valores sueltos). Un campo que no está y uno
 * con `undefined` cuentan igual, porque un campo opcional puede llegar de las dos formas.
 */
function iguales(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => iguales(v, b[i]))
  }
  const x = a as Record<string, unknown>
  const y = b as Record<string, unknown>
  const claves = new Set([...Object.keys(x), ...Object.keys(y)])
  for (const clave of claves) {
    if (!iguales(x[clave], y[clave])) {
      return false
    }
  }
  return true
}

/** El registro sin su `editadoEl`; lo que no es un objeto, tal cual. */
function sinEditadoEl(valor: unknown): unknown {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return valor
  }
  const copia: Record<string, unknown> = { ...(valor as Record<string, unknown>) }
  delete copia.editadoEl
  return copia
}

/** Si dos registros son iguales sin mirar editadoEl (regla pendiente 1 de la fase 2). */
export function mismoRegistro(a: unknown, b: unknown): boolean {
  return iguales(sinEditadoEl(a), sinEditadoEl(b))
}

/** El registro con ese id; lanza «No existe «id»» si no está, que es un error de programación. */
export function buscarPorId<T extends { id: Id }>(lista: readonly T[], id: Id): T {
  const registro = lista.find((r) => r.id === id)
  if (registro === undefined) {
    throw new Error(`No existe «${id}»`)
  }
  return registro
}

/** Sustituye por id: si no cambia nada devuelve la misma lista; si cambia, sella editadoEl = ahora. */
export function reemplazarPorId<T extends { id: Id; editadoEl?: Instante }>(lista: T[], nuevo: T, ahora: Instante): T[] {
  const anterior = buscarPorId(lista, nuevo.id)
  if (mismoRegistro(anterior, nuevo)) {
    return lista
  }
  return lista.map((r) => (r === anterior ? { ...nuevo, editadoEl: ahora } : r))
}

/** Quita por id; la misma lista si no estaba. */
export function quitarPorId<T extends { id: Id }>(lista: T[], id: Id): T[] {
  return lista.some((r) => r.id === id) ? lista.filter((r) => r.id !== id) : lista
}

/** Suma 1 a cambiosDesdeUltimoAvance: una vez por guardado que cambia algo (D-038). */
export function contarCambio<E extends EstadoPartida>(estado: E): E {
  return {
    ...estado,
    partida: { ...estado.partida, cambiosDesdeUltimoAvance: estado.partida.cambiosDesdeUltimoAvance + 1 },
  }
}
```

- `iguales` compara con `===` los valores sueltos, así que `0` y `−0` cuentan igual; el motor y estas funciones nunca guardan `−0`.
- `reemplazarPorId` sustituye por referencia (`r === anterior`) para no buscar dos veces, y deja las demás filas tal cual.
- `quitarPorId` devuelve la misma lista si el id no estaba: el que quiera un error usa antes `buscarPorId`, como hacen todas las funciones de edición.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/edicion/registros.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  7 passed (7)
```

- [ ] **Paso 5: Escribir la prueba de `movimientos.ts`, que falla**

Todas las pruebas parten de la partida de ejemplo **congelada** (el 12 de abril de 1640, con la bolsa de Tharan en 46,518 mo) y comprueban que el documento resultante sigue pasando `validarCopia`. Qué comprueba cada bloque:
- `crearMovimiento`: la capa élfica de J2b (120 mp) hoy y con fecha futura, el signo según el tipo y un gasto de 0 que no se guarda como −0.
- `editarMovimiento`:
  - guardar sin cambios devuelve el mismo estado;
  - un cambio de importe y concepto sella `editadoEl`;
  - la fecha programa y aplica;
  - el programado con objeto pendiente crea la capa en el inventario;
  - los vinculados no se editan;
  - el cobro de locales solo cambia el total;
  - un pago agrupado de salarios se edita como uno suelto.
- `eliminarMovimiento`: las athelas se quedan en el inventario sin `movimientoCompraId` ni `editadoEl`, un movimiento sin objeto no toca el inventario y un id que no existe lanza.

Crea `src/dominio/edicion/movimientos.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { idDeOpcion } from '../catalogo/inicial'
import { saldosPorDominio } from '../dinero/saldo'
import { DOM, MOV_BREE, MOV_THARAN, OBJETO } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import { crearMovimiento, editarMovimiento, eliminarMovimiento, esVinculado, type DatosMovimiento } from './movimientos'
import type { Sello } from './registros'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** La fecha actual del ejemplo y un día futuro. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }
const DIA_20: Fecha = { anio: 1640, mes: 4, dia: 20 }

/** La bolsa de Tharan el 12 de abril: 46,518 mo. */
const BOLSA_THARAN = 4651800

const CAT_EQUIPO = idDeOpcion('categorias', 'Equipo')

/** Un sello nuevo en cada prueba: los ids salen «nuevo.1», «nuevo.2»… */
function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

/** La partida de ejemplo congelada: si una función escribe en su entrada, la prueba falla. */
function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

/** El movimiento con ese id, si está. */
function movimiento(documento: DocumentoPartida, id: Id): Movimiento | undefined {
  return documento.movimientos.find((m) => m.id === id)
}

/** La capa élfica de J2b: 120 mp = 12 mo de la bolsa de Tharan. */
function capa(fecha: Fecha): DatosMovimiento {
  return {
    dominioId: DOM.tharan,
    tipo: 'gasto',
    importe: { base: 1200000, introducido: { cantidad: '120', moneda: 'mp' } },
    categoriaId: CAT_EQUIPO,
    concepto: 'Capa élfica',
    fecha,
  }
}

describe('crearMovimiento', () => {
  it('un gasto de hoy resta de la bolsa, guarda lo tecleado y no lleva editadoEl (§6.2, J2b)', () => {
    const documento = ejemplo()
    const { estado, id } = crearMovimiento(documento, capa(HOY), sello())
    expect(id).toBe('nuevo.1')
    expect(movimiento(estado, id)).toEqual({
      id: 'nuevo.1',
      dominioId: DOM.tharan,
      fecha: HOY,
      tipo: 'gasto',
      importe: { base: -1200000, introducido: { cantidad: '120', moneda: 'mp' } },
      categoriaId: CAT_EQUIPO,
      concepto: 'Capa élfica',
      origen: 'manual',
      programado: false,
    })
    expect(saldosPorDominio(estado)[DOM.tharan]).toBe(BOLSA_THARAN - 1200000)
    expect(estado.avances).toBe(documento.avances)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('con fecha futura queda programado y no cuenta en el saldo (§7, «Programados»)', () => {
    const { estado, id } = crearMovimiento(ejemplo(), capa(DIA_20), sello())
    expect(movimiento(estado, id)?.programado).toBe(true)
    expect(saldosPorDominio(estado)[DOM.tharan]).toBe(BOLSA_THARAN)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('el signo lo pone el tipo: un ingreso suma y un gasto de 0 guarda 0, nunca −0', () => {
    const ingreso = crearMovimiento(ejemplo(), { ...capa(HOY), tipo: 'ingreso', concepto: 'Venta de pieles' }, sello())
    expect(movimiento(ingreso.estado, ingreso.id)?.importe.base).toBe(1200000)
    const gratis = crearMovimiento(ejemplo(), { ...capa(HOY), importe: { base: 0 } }, sello())
    expect(Object.is(movimiento(gratis.estado, gratis.id)?.importe.base, 0)).toBe(true)
  })
})

describe('editarMovimiento', () => {
  it('guardar sin cambiar nada devuelve el mismo estado (regla pendiente 1)', () => {
    const documento = ejemplo()
    expect(editarMovimiento(documento, MOV_THARAN.recompensa, {}, sello())).toBe(documento)
    const iguales = {
      concepto: 'Recompensa de la guardia de Bree',
      importe: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' as const } },
      fecha: { anio: 1640, mes: 4, dia: 10 },
    }
    expect(editarMovimiento(documento, MOV_THARAN.recompensa, iguales, sello())).toBe(documento)
  })

  it('cambiar el importe y el concepto sella editadoEl y recalcula el saldo (J2c, §7)', () => {
    const documento = ejemplo()
    const estado = editarMovimiento(
      documento,
      MOV_THARAN.recompensa,
      { importe: { base: 1500000, introducido: { cantidad: '15', moneda: 'mo' } }, concepto: 'Recompensa del alcalde' },
      sello(),
    )
    expect(movimiento(estado, MOV_THARAN.recompensa)).toEqual({
      ...movimiento(documento, MOV_THARAN.recompensa),
      importe: { base: 1500000, introducido: { cantidad: '15', moneda: 'mo' } },
      concepto: 'Recompensa del alcalde',
      editadoEl: AHORA,
    })
    expect(saldosPorDominio(estado)[DOM.tharan]).toBe(BOLSA_THARAN + 300000)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('llevarlo a una fecha futura lo programa y devolverlo a hoy lo aplica (T14)', () => {
    const programado = editarMovimiento(ejemplo(), MOV_THARAN.recompensa, { fecha: DIA_20 }, sello())
    expect(movimiento(programado, MOV_THARAN.recompensa)?.programado).toBe(true)
    expect(saldosPorDominio(programado)[DOM.tharan]).toBe(BOLSA_THARAN - 1200000)
    expect(validarCopia(programado, catalogosDeEjemplo())).toEqual([])

    const aplicado = editarMovimiento(programado, MOV_THARAN.recompensa, { fecha: HOY }, sello())
    expect(movimiento(aplicado, MOV_THARAN.recompensa)?.programado).toBe(false)
    expect(saldosPorDominio(aplicado)[DOM.tharan]).toBe(BOLSA_THARAN)
  })

  it('un programado con objeto pendiente que pasa a hoy se aplica y crea el objeto (T14, D-034)', () => {
    const creado = crearMovimiento(ejemplo(), capa(DIA_20), sello())
    const conObjeto: DocumentoPartida = {
      ...creado.estado,
      movimientos: creado.estado.movimientos.map((m) =>
        m.id === creado.id
          ? {
              ...m,
              objetoPendiente: {
                nombre: 'Capa élfica',
                cantidad: 1,
                valorUnitario: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
                ubicacion: { tipo: 'encima' },
              },
            }
          : m,
      ),
    }
    expect(validarCopia(conObjeto, catalogosDeEjemplo())).toEqual([])

    const estado = editarMovimiento(conObjeto, creado.id, { fecha: HOY }, { ahora: AHORA, nuevoId: idsEnSerie('obj') })
    const aplicado = movimiento(estado, creado.id)
    expect(aplicado?.programado).toBe(false)
    expect(aplicado?.editadoEl).toBe(AHORA)
    expect(aplicado).not.toHaveProperty('objetoPendiente')
    expect(estado.objetos).toHaveLength(conObjeto.objetos.length + 1)
    expect(estado.objetos.at(-1)).toEqual({
      id: 'obj.1',
      dominioId: DOM.tharan,
      nombre: 'Capa élfica',
      cantidad: 1,
      valorUnitario: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
      ubicacion: { tipo: 'encima' },
      movimientoCompraId: creado.id,
    })
    expect(saldosPorDominio(estado)[DOM.tharan]).toBe(BOLSA_THARAN - 1200000)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('un movimiento vinculado se edita y se elimina desde su origen (§6.4, «Movimientos vinculados»)', () => {
    const documento = ejemplo()
    const transferencia = movimiento(documento, MOV_BREE.transferencia)
    const recompensa = movimiento(documento, MOV_THARAN.recompensa)
    expect(transferencia !== undefined && esVinculado(transferencia)).toBe(true)
    expect(recompensa !== undefined && esVinculado(recompensa)).toBe(false)
    expect(() => editarMovimiento(documento, MOV_BREE.transferencia, { concepto: 'Otra cosa' }, sello())).toThrow(
      'Este movimiento se edita desde su origen',
    )
    expect(() => eliminarMovimiento(documento, MOV_BREE.obraPuerta)).toThrow('Este movimiento se edita desde su origen')
  })

  it('en un cobro de impuestos de locales solo se cambia el importe total (§6.2, J2c; T4)', () => {
    const documento = ejemplo()
    const estado = editarMovimiento(
      documento,
      MOV_BREE.locales,
      { importe: { base: 480000, introducido: { cantidad: '4,8', moneda: 'mo' } }, concepto: 'Impuestos de locales · marzo (4)' },
      sello(),
    )
    const cobro = movimiento(estado, MOV_BREE.locales)
    expect(cobro?.importe).toEqual({ base: 480000, introducido: { cantidad: '4,8', moneda: 'mo' } })
    expect(cobro?.detalleLocales).toEqual(movimiento(documento, MOV_BREE.locales)?.detalleLocales)
    expect(cobro?.editadoEl).toBe(AHORA)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])

    const error = 'En un cobro de impuestos de locales solo se cambia el importe total'
    expect(() => editarMovimiento(documento, MOV_BREE.locales, { concepto: 'Locales de marzo' }, sello())).toThrow(error)
    expect(() =>
      editarMovimiento(documento, MOV_BREE.locales, { fecha: { anio: 1640, mes: 4, dia: 2 } }, sello()),
    ).toThrow(error)
  })

  it('un pago agrupado de salarios se edita como uno suelto y su detalle no cambia (T32; T4)', () => {
    const documento = ejemplo()
    const estado = editarMovimiento(
      documento,
      MOV_BREE.salarios6Abril,
      { importe: { base: 400000, introducido: { cantidad: '4', moneda: 'mo' } } },
      sello(),
    )
    const salarios = movimiento(estado, MOV_BREE.salarios6Abril)
    expect(salarios?.importe).toEqual({ base: -400000, introducido: { cantidad: '4', moneda: 'mo' } })
    expect(salarios?.regla).toEqual({ tipo: 'salarios', id: DOM.bree })
    expect(salarios?.detalleTrabajo).toEqual(movimiento(documento, MOV_BREE.salarios6Abril)?.detalleTrabajo)
    expect(salarios?.origen).toBe('avance')
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })
})

describe('eliminarMovimiento', () => {
  it('quita el movimiento, recalcula el saldo y su objeto se queda sin movimientoCompraId (§6.4; T31)', () => {
    const documento = ejemplo()
    const estado = eliminarMovimiento(documento, MOV_THARAN.athelas)
    expect(movimiento(estado, MOV_THARAN.athelas)).toBeUndefined()
    expect(saldosPorDominio(estado)[DOM.tharan]).toBe(BOLSA_THARAN + 60000)
    const athelas = estado.objetos.find((o) => o.id === OBJETO.athelas)
    expect(athelas?.cantidad).toBe(3)
    expect(athelas).not.toHaveProperty('movimientoCompraId')
    expect(athelas).not.toHaveProperty('editadoEl')
    expect(estado.objetos[0]).toBe(documento.objetos[0])
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('un movimiento sin objeto no toca el inventario, y un id que no existe lanza', () => {
    const documento = ejemplo()
    const estado = eliminarMovimiento(documento, MOV_THARAN.recompensa)
    expect(estado.movimientos).toHaveLength(documento.movimientos.length - 1)
    expect(estado.objetos).toBe(documento.objetos)
    expect(() => eliminarMovimiento(documento, 'mov.no-existe')).toThrow('No existe «mov.no-existe»')
  })
})
```

- [ ] **Paso 6: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/edicion/movimientos.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./movimientos`. El `import type { Sello } from './registros'` no cuenta: se borra al compilar. La hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/edicion/movimientos.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/edicion/movimientos.test.ts [ src/dominio/edicion/movimientos.test.ts ]
Error: Cannot find module './movimientos' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/edicion/movimientos.test.ts
 ❯ src/dominio/edicion/movimientos.test.ts:13:1
     11| import { congelar } from '../motor/pruebas/constructores'
     12| import { validarCopia } from '../validacion/coherencia'
     13| import { crearMovimiento, editarMovimiento, eliminarMovimiento, esVinc…
       | ^
     14| import type { Sello } from './registros'
     15|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 7: Implementar `movimientos.ts`**

Crea `src/dominio/edicion/movimientos.ts` con este contenido:

```ts
import { compararFechas, type Fecha } from '../calendario/fecha'
import type { Importe } from '../dinero/importe'
import { anadirObjetoComprado } from '../inventario/compra'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import type { ObjetoInventario } from '../modelo/personaje'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide J2b para un gasto o un ingreso suelto (§6.2). El importe es una magnitud: el signo lo pone el tipo. */
export interface DatosMovimiento {
  dominioId: Id
  tipo: 'gasto' | 'ingreso'
  importe: Importe
  categoriaId: Id
  concepto: string
  fecha: Fecha
}

/** Lo que J2c deja cambiar: todo menos el tipo (§6.2 l.348). */
export type CambiosMovimiento = Partial<Omit<DatosMovimiento, 'tipo'>>

/** Si el movimiento sale de otro registro y se edita desde allí (§6.4 l.751). */
export function esVinculado(movimiento: Movimiento): boolean {
  return movimiento.vinculo !== undefined
}

/** El importe con el signo de su tipo (decisión 18); un gasto de 0 guarda 0, nunca −0. */
function conSigno(importe: Importe, tipo: 'gasto' | 'ingreso'): Importe {
  const base = tipo === 'gasto' && importe.base !== 0 ? -importe.base : importe.base
  return importe.introducido === undefined ? { base } : { base, introducido: importe.introducido }
}

/** Con fecha posterior a la fecha actual queda programado (§7, «Programados»). */
function esFutura(estado: EstadoPartida, fecha: Fecha): boolean {
  return compararFechas(fecha, estado.partida.fechaActual) > 0
}

/** El id del personaje: el único dominio de tipo personaje (§8). */
function personajeDe(estado: EstadoPartida): Id {
  const personaje = estado.dominios.find((d) => d.tipo === 'personaje')
  if (personaje === undefined) {
    throw new Error('No existe «personaje»')
  }
  return personaje.id
}

/** Lanza si el movimiento es vinculado: su botón editar abre el formulario de su origen (§6.4 l.751). */
function exigeSuelto(movimiento: Movimiento): void {
  if (esVinculado(movimiento)) {
    throw new Error('Este movimiento se edita desde su origen')
  }
}

/** Si los cambios tocan algo que no es el importe: en un cobro de locales solo se edita el total (§6.2 l.385). */
function cambiaAlgoMasQueElImporte(actual: Movimiento, cambios: CambiosMovimiento): boolean {
  return (
    (cambios.dominioId !== undefined && cambios.dominioId !== actual.dominioId) ||
    (cambios.categoriaId !== undefined && cambios.categoriaId !== actual.categoriaId) ||
    (cambios.concepto !== undefined && cambios.concepto !== actual.concepto) ||
    (cambios.fecha !== undefined && compararFechas(cambios.fecha, actual.fecha) !== 0)
  )
}

/** Crea un movimiento suelto; con fecha futura queda programado (§6.2 J2b; §7 l.1199). */
export function crearMovimiento<E extends EstadoPartida>(estado: E, datos: DatosMovimiento, sello: Sello): Creado<E> {
  const id = sello.nuevoId()
  const movimiento: Movimiento = {
    id,
    dominioId: datos.dominioId,
    fecha: datos.fecha,
    tipo: datos.tipo,
    importe: conSigno(datos.importe, datos.tipo),
    categoriaId: datos.categoriaId,
    concepto: datos.concepto,
    origen: 'manual',
    programado: esFutura(estado, datos.fecha),
  }
  return { estado: { ...estado, movimientos: [...estado.movimientos, movimiento] }, id }
}

/**
 * Edita un movimiento suelto (J2c): recalcula programado y, en un cobro de locales, solo deja el importe
 * (§6.2 l.385; T14; T32). Si un programado pasa a hoy o antes, se aplica al guardar y crea su objeto pendiente.
 */
export function editarMovimiento<E extends EstadoPartida>(estado: E, id: Id, cambios: CambiosMovimiento, sello: Sello): E {
  const actual = buscarPorId(estado.movimientos, id)
  exigeSuelto(actual)
  if (actual.regla?.tipo === 'locales' && cambiaAlgoMasQueElImporte(actual, cambios)) {
    throw new Error('En un cobro de impuestos de locales solo se cambia el importe total')
  }
  const tipo = actual.tipo === 'gasto' ? 'gasto' : 'ingreso'
  const fecha = cambios.fecha ?? actual.fecha
  const editado: Movimiento = {
    ...actual,
    dominioId: cambios.dominioId ?? actual.dominioId,
    fecha,
    importe: cambios.importe === undefined ? actual.importe : conSigno(cambios.importe, tipo),
    categoriaId: cambios.categoriaId ?? actual.categoriaId,
    concepto: cambios.concepto ?? actual.concepto,
    programado: esFutura(estado, fecha),
  }
  let objetos: ObjetoInventario[] = estado.objetos
  if (actual.objetoPendiente !== undefined && !editado.programado) {
    objetos = anadirObjetoComprado(estado.objetos, actual.objetoPendiente, {
      personajeId: personajeDe(estado),
      movimientoId: id,
      nuevoId: sello.nuevoId,
    })
    delete editado.objetoPendiente
  }
  const movimientos = reemplazarPorId(estado.movimientos, editado, sello.ahora)
  if (movimientos === estado.movimientos) {
    return estado
  }
  return { ...estado, movimientos, objetos }
}

/** Elimina un movimiento suelto; su objeto comprado se queda sin movimientoCompraId (§6.4 l.775; T31). */
export function eliminarMovimiento<E extends EstadoPartida>(estado: E, id: Id): E {
  exigeSuelto(buscarPorId(estado.movimientos, id))
  const movimientos = quitarPorId(estado.movimientos, id)
  if (!estado.objetos.some((o) => o.movimientoCompraId === id)) {
    return { ...estado, movimientos }
  }
  const objetos = estado.objetos.map((o) => {
    if (o.movimientoCompraId !== id) {
      return o
    }
    const suelto = { ...o }
    delete suelto.movimientoCompraId
    return suelto
  })
  return { ...estado, movimientos, objetos }
}
```

- `editarMovimiento` mira primero si es vinculado y después si es un cobro de locales: un cambio que no toca nada («el mismo concepto») no lanza, porque `cambiaAlgoMasQueElImporte` compara con lo que ya hay.
- Un movimiento que no es vinculado nunca es de tipo `transferencia` (lo exige `EsquemaMovimiento`), así que `tipo` solo puede ser gasto o ingreso.
- Si el movimiento no cambia, `reemplazarPorId` devuelve la misma lista y la función devuelve **el mismo `estado`**. El objeto pendiente solo se crea cuando un programado deja de estarlo, y eso ya es un cambio.
- `delete editado.objetoPendiente` borra la clave de un objeto recién creado, no del movimiento de entrada; lo mismo `delete suelto.movimientoCompraId`.
- El movimiento creado no lleva `editadoEl`: se estrena al editarlo, como los del ejemplo.

- [ ] **Paso 8: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/edicion/movimientos.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  12 passed (12)
```

- [ ] **Paso 9: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada:
- `npx tsc -b` no escribe nada.
- `npm run lint` solo imprime su cabecera (`> gestion-aldeas@0.0.0 lint` y `> oxlint`) y sale con código 0.
- `npm test` termina con **841 pruebas en 75 archivos**. La tarea 22 dejó 820 pruebas en 73 archivos, y esta trae **21 nuevas**: las 7 de `registros.test.ts`, las 12 de `movimientos.test.ts` y **2 más** en `pureza.test.ts`, que recorre también `edicion/registros.ts` y `edicion/movimientos.ts`.

```text
 Test Files  75 passed (75)
      Tests  841 passed (841)
```

Si el número que ves no es 841, sigue con **el tuyo**: lo que esta tarea garantiza es **+21 pruebas y +2 archivos** sobre lo que dejó la tarea 22.

- [ ] **Paso 10: Commit**

```bash
git add src/dominio/edicion/registros.ts src/dominio/edicion/registros.test.ts src/dominio/edicion/movimientos.ts src/dominio/edicion/movimientos.test.ts
git commit -m "feat(edicion): crear, editar y eliminar movimientos sueltos con la misma referencia si nada cambia" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` puede avisar `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-3 226330f] feat(edicion): crear, editar y eliminar movimientos sueltos con la misma referencia si nada cambia
 4 files changed, 547 insertions(+)
 create mode 100644 src/dominio/edicion/movimientos.test.ts
 create mode 100644 src/dominio/edicion/movimientos.ts
 create mode 100644 src/dominio/edicion/registros.test.ts
 create mode 100644 src/dominio/edicion/registros.ts
```

---

### Tarea 24 · Transferencias

Una transferencia son **tres registros**: la `Transferencia` y sus dos movimientos vinculados, uno negativo en el dominio del que sale y otro positivo en el que entra (§8; decisión 18 de la fase 2). J2f los crea, los cambia y los borra siempre juntos, y la validación de la fase 2 comprueba que cuadran (`coherencia.ts`, «La transferencia … no cuadra con sus movimientos», y `referencias.ts`, que cada lado apunte a la transferencia y esté en su dominio). Esta tarea escribe `src/dominio/edicion/transferencias.ts` con las tres operaciones:

- `crearTransferencia`: los tres registros con los ids del sello, en este orden: la transferencia, el lado que sale y el que entra. Categoría fija «Transferencias» (`CATEGORIA.transferencias`) y conceptos propuestos «Transferencia a Bree» y «Transferencia desde Tharan» si no se escriben otros.
- `editarTransferencia`: cambia los tres a la vez. Si cambia un lado, el concepto del otro se vuelve a proponer, salvo que el jugador lo hubiera escrito a mano.
- `eliminarTransferencia`: borra los tres (§6.4, «Al eliminar»).

Dos reglas se comprueban al crear y al editar:
- **Fecha de hoy o anterior** (D-033): «Una transferencia no puede tener fecha futura». Así una transferencia nunca queda programada y el avance nunca tiene que pagar a medias algo que depende de otro registro.
- **Dos dominios distintos**: ««Sale de» y «Entra en» deben ser distintos», el mismo texto de `EsquemaTransferencia`.

El saldo negativo **no** se bloquea: una acción manual puede dejar la bolsa por debajo de 0 con confirmación (§6.4, l.805), y esa confirmación es de la interfaz (fase 7). La prueba lo comprueba con el ejemplo de J2f, que deja la bolsa de Tharan en −3,482 mo y es válido.

Como en la tarea 23, las funciones devuelven **el mismo estado** si nada cambia (técnica 13), ponen `editadoEl` solo en los registros que cambian y no cuentan el cambio: una transferencia cuenta **un** cambio aunque toque tres registros, y eso lo hace `guardarEdicion` (tarea 27, D-038).

Depende de la tarea 23 (`Sello`, `Creado`, `buscarPorId`, `reemplazarPorId` y `quitarPorId`). Es **1 módulo nuevo del dominio**: `pureza.test.ts` suma 1 prueba.

**Reglas de la especificación que implementa:**

- **J2f (§6.2, l.397-400)**, en cuatro líneas de la especificación:
  - el ejemplo: «transferencia de 50 mo de la bolsa de Tharan a la caja de Bree el 12 de abril»;
  - las reglas: los dos dominios «deben ser distintos» y la categoría es fija, «Transferencias», «como texto, sin selector»;
  - los conceptos: «Concepto propuesto «Transferencia a Bree» (y «Transferencia desde Tharan» en el lado de Bree)»;
  - los saldos: «bolsa −3,482 mo en lacre con icono; caja de Bree 390,6 mo», que son las cifras que da la prueba.
- **Vinculados (§6.4, l.755).** «Transferencia | Dos (sale y entra) | J2f, desde cualquiera de los dos; eliminar borra los dos».
- **Al eliminar (§6.4, l.776).** «Transferencia | Se borran los dos lados».
- **D-033.** «Solo un movimiento suelto puede tener fecha futura. Una transferencia […] se anota con fecha de hoy o anterior.»

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/edicion/transferencias.ts`
- Prueba: `src/dominio/edicion/transferencias.test.ts` (9 pruebas)

- [ ] **Paso 1: Escribir la prueba que falla**

Todas las pruebas parten de la partida de ejemplo **congelada**. Qué comprueba cada bloque:
- `crearTransferencia`:
  - los tres registros exactos del ejemplo de J2f, con sus ids en serie y los saldos «−3,482 mo» y «390,6 mo»;
  - los conceptos escritos a mano;
  - las dos reglas, al crear y al editar, y que una fecha pasada sí vale.
- `editarTransferencia`, sobre la transferencia del 6 de abril (20 mo de Bree a Tharan):
  - los mismos datos devuelven el mismo estado;
  - cambiar el importe cambia los tres registros;
  - cambiar «Sale de» a Archet mueve ese lado y propone «Transferencia desde Archet» en el otro;
  - un concepto escrito a mano se conserva aunque cambie el otro lado.
- `eliminarTransferencia`: se borran los tres y los saldos vuelven; y los ids que no existen lanzan.

Crea `src/dominio/edicion/transferencias.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { formatearOro } from '../dinero/formato'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { saldosPorDominio } from '../dinero/saldo'
import { DOM, MOV_BREE, MOV_THARAN, TRANSFERENCIA } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import type { Sello } from './registros'
import {
  crearTransferencia,
  editarTransferencia,
  eliminarTransferencia,
  type DatosTransferencia,
} from './transferencias'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** La fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** La transferencia del 6 de abril: 20 mo de la caja de Bree a la bolsa de Tharan. */
const SEIS_DE_ABRIL: DatosTransferencia = {
  saleDeId: DOM.bree,
  entraEnId: DOM.tharan,
  importe: { base: 2000000, introducido: { cantidad: '20', moneda: 'mo' } },
  fecha: { anio: 1640, mes: 4, dia: 6 },
}

/** El ejemplo de J2f: 50 mo de la bolsa de Tharan a la caja de Bree el 12 de abril (§6.2). */
const CINCUENTA_A_BREE: DatosTransferencia = {
  saleDeId: DOM.tharan,
  entraEnId: DOM.bree,
  importe: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
  fecha: HOY,
}

/** Un sello nuevo en cada prueba: los ids salen «nuevo.1», «nuevo.2»… */
function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

/** La partida de ejemplo congelada: si una función escribe en su entrada, la prueba falla. */
function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

/** El movimiento con ese id, si está. */
function movimiento(documento: DocumentoPartida, id: Id): Movimiento | undefined {
  return documento.movimientos.find((m) => m.id === id)
}

describe('crearTransferencia', () => {
  it('crea la transferencia y sus dos movimientos, con los conceptos propuestos (§6.2, J2f)', () => {
    const documento = ejemplo()
    const { estado, id } = crearTransferencia(documento, CINCUENTA_A_BREE, sello())
    expect(id).toBe('nuevo.1')
    expect(estado.transferencias.at(-1)).toEqual({
      id: 'nuevo.1',
      fecha: HOY,
      importe: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
      saleDeId: DOM.tharan,
      entraEnId: DOM.bree,
      movimientoSaleId: 'nuevo.2',
      movimientoEntraId: 'nuevo.3',
    })
    expect(estado.movimientos.slice(-2)).toEqual([
      {
        id: 'nuevo.2',
        dominioId: DOM.tharan,
        fecha: HOY,
        tipo: 'transferencia',
        importe: { base: -5000000, introducido: { cantidad: '50', moneda: 'mo' } },
        categoriaId: CATEGORIA.transferencias,
        concepto: 'Transferencia a Bree',
        origen: 'manual',
        vinculo: { tipo: 'transferencia', id: 'nuevo.1' },
        programado: false,
      },
      {
        id: 'nuevo.3',
        dominioId: DOM.bree,
        fecha: HOY,
        tipo: 'transferencia',
        importe: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
        categoriaId: CATEGORIA.transferencias,
        concepto: 'Transferencia desde Tharan',
        origen: 'manual',
        vinculo: { tipo: 'transferencia', id: 'nuevo.1' },
        programado: false,
      },
    ])
    const saldos = saldosPorDominio(estado)
    expect(formatearOro(saldos[DOM.tharan], EQUIVALENCIAS_POR_DEFECTO)).toBe('−3,482 mo')
    expect(formatearOro(saldos[DOM.bree], EQUIVALENCIAS_POR_DEFECTO)).toBe('390,6 mo')
    expect(estado.avances).toBe(documento.avances)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('respeta los conceptos que se escriben a mano', () => {
    const { estado } = crearTransferencia(
      ejemplo(),
      { ...CINCUENTA_A_BREE, conceptoSale: 'Ayuda para el granero', conceptoEntra: 'Ayuda de Tharan' },
      sello(),
    )
    expect(estado.movimientos.slice(-2).map((m) => m.concepto)).toEqual(['Ayuda para el granero', 'Ayuda de Tharan'])
  })

  it('no admite una fecha futura ni el mismo dominio a los dos lados, ni al crear ni al editar (D-033)', () => {
    const documento = ejemplo()
    const manana = { ...CINCUENTA_A_BREE, fecha: { anio: 1640, mes: 4, dia: 13 } }
    const aSiMismo = { ...CINCUENTA_A_BREE, entraEnId: DOM.tharan }
    expect(() => crearTransferencia(documento, manana, sello())).toThrow('Una transferencia no puede tener fecha futura')
    expect(() => crearTransferencia(documento, aSiMismo, sello())).toThrow('«Sale de» y «Entra en» deben ser distintos')
    expect(() => editarTransferencia(documento, TRANSFERENCIA.breeATharan, manana, sello())).toThrow(
      'Una transferencia no puede tener fecha futura',
    )
    expect(() => editarTransferencia(documento, TRANSFERENCIA.breeATharan, aSiMismo, sello())).toThrow(
      '«Sale de» y «Entra en» deben ser distintos',
    )
    const atrasada = crearTransferencia(documento, { ...CINCUENTA_A_BREE, fecha: { anio: 1640, mes: 4, dia: 10 } }, sello())
    expect(validarCopia(atrasada.estado, catalogosDeEjemplo())).toEqual([])
  })
})

describe('editarTransferencia', () => {
  it('guardar los mismos datos devuelve el mismo estado (regla pendiente 1)', () => {
    const documento = ejemplo()
    expect(editarTransferencia(documento, TRANSFERENCIA.breeATharan, SEIS_DE_ABRIL, sello())).toBe(documento)
  })

  it('cambia el importe de la transferencia y de sus dos lados a la vez (§6.4, «Movimientos vinculados»)', () => {
    const documento = ejemplo()
    const veinticinco = { base: 2500000, introducido: { cantidad: '25', moneda: 'mo' as const } }
    const estado = editarTransferencia(documento, TRANSFERENCIA.breeATharan, { ...SEIS_DE_ABRIL, importe: veinticinco }, sello())
    expect(estado.transferencias[0]).toEqual({ ...documento.transferencias[0], importe: veinticinco, editadoEl: AHORA })
    expect(movimiento(estado, MOV_BREE.transferencia)).toEqual({
      ...movimiento(documento, MOV_BREE.transferencia),
      importe: { base: -2500000, introducido: { cantidad: '25', moneda: 'mo' } },
      editadoEl: AHORA,
    })
    expect(movimiento(estado, MOV_THARAN.transferencia)).toEqual({
      ...movimiento(documento, MOV_THARAN.transferencia),
      importe: veinticinco,
      editadoEl: AHORA,
    })
    const saldos = saldosPorDominio(estado)
    expect(saldos[DOM.bree]).toBe(34060000 - 500000)
    expect(saldos[DOM.tharan]).toBe(4651800 + 500000)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('si cambia un lado, mueve su movimiento y vuelve a proponer el concepto del otro', () => {
    const documento = ejemplo()
    const estado = editarTransferencia(documento, TRANSFERENCIA.breeATharan, { ...SEIS_DE_ABRIL, saleDeId: DOM.archet }, sello())
    const sale = movimiento(estado, MOV_BREE.transferencia)
    expect(sale?.dominioId).toBe(DOM.archet)
    expect(sale?.concepto).toBe('Transferencia a Tharan')
    expect(movimiento(estado, MOV_THARAN.transferencia)?.concepto).toBe('Transferencia desde Archet')
    expect(estado.transferencias[0].saleDeId).toBe(DOM.archet)
    const saldos = saldosPorDominio(estado)
    expect(saldos[DOM.bree]).toBe(34060000 + 2000000)
    expect(saldos[DOM.archet]).toBe(8500000 - 2000000)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('un concepto escrito a mano se conserva aunque cambie el otro lado', () => {
    const creada = crearTransferencia(ejemplo(), { ...CINCUENTA_A_BREE, conceptoSale: 'Ayuda para el granero' }, sello())
    const estado = editarTransferencia(creada.estado, creada.id, { ...CINCUENTA_A_BREE, entraEnId: DOM.archet }, sello())
    const [sale, entra] = estado.movimientos.slice(-2)
    expect(sale.concepto).toBe('Ayuda para el granero')
    expect(entra.dominioId).toBe(DOM.archet)
    expect(entra.concepto).toBe('Transferencia desde Tharan')
  })
})

describe('eliminarTransferencia', () => {
  it('borra la transferencia y sus dos movimientos, y los saldos vuelven (§6.4, «Al eliminar»)', () => {
    const documento = ejemplo()
    const estado = eliminarTransferencia(documento, TRANSFERENCIA.breeATharan)
    expect(estado.transferencias).toEqual([])
    expect(movimiento(estado, MOV_BREE.transferencia)).toBeUndefined()
    expect(movimiento(estado, MOV_THARAN.transferencia)).toBeUndefined()
    expect(estado.movimientos).toHaveLength(documento.movimientos.length - 2)
    const saldos = saldosPorDominio(estado)
    expect(saldos[DOM.bree]).toBe(34060000 + 2000000)
    expect(saldos[DOM.tharan]).toBe(4651800 - 2000000)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('editar o eliminar una transferencia que no existe lanza', () => {
    const documento = ejemplo()
    expect(() => eliminarTransferencia(documento, 'tr.no-existe')).toThrow('No existe «tr.no-existe»')
    expect(() => editarTransferencia(documento, 'tr.no-existe', SEIS_DE_ABRIL, sello())).toThrow('No existe «tr.no-existe»')
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/edicion/transferencias.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./transferencias`. La hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/edicion/transferencias.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/edicion/transferencias.test.ts [ src/dominio/edicion/transferencias.test.ts ]
Error: Cannot find module './transferencias' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/edicion/transferencias.test.ts
 ❯ src/dominio/edicion/transferencias.test.ts:16:1
     14| import { validarCopia } from '../validacion/coherencia'
     15| import type { Sello } from './registros'
     16| import {
       | ^
     17|   crearTransferencia,
     18|   editarTransferencia,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Implementar `transferencias.ts`**

Crea `src/dominio/edicion/transferencias.ts` con este contenido:

```ts
import { compararFechas, type Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import type { Importe } from '../dinero/importe'
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Movimiento, Transferencia } from '../modelo/movimientos'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide J2f (§6.2 l.396-402); sin conceptos, se proponen «Transferencia a …» y «Transferencia desde …». */
export interface DatosTransferencia {
  saleDeId: Id
  entraEnId: Id
  importe: Importe
  fecha: Fecha
  conceptoSale?: string
  conceptoEntra?: string
}

/** «Transferencia a Bree»: el concepto propuesto del lado que sale (§6.2, J2f). */
function propuestoSale(estado: EstadoPartida, entraEnId: Id): string {
  return `Transferencia a ${buscarPorId(estado.dominios, entraEnId).nombre}`
}

/** «Transferencia desde Tharan»: el concepto propuesto del lado que entra (§6.2, J2f). */
function propuestoEntra(estado: EstadoPartida, saleDeId: Id): string {
  return `Transferencia desde ${buscarPorId(estado.dominios, saleDeId).nombre}`
}

/** Las dos reglas de J2f: fecha de hoy o anterior (D-033) y dos dominios distintos (EsquemaTransferencia). */
function exigeValida(estado: EstadoPartida, datos: DatosTransferencia): void {
  if (compararFechas(datos.fecha, estado.partida.fechaActual) > 0) {
    throw new Error('Una transferencia no puede tener fecha futura')
  }
  if (datos.saleDeId === datos.entraEnId) {
    throw new Error('«Sale de» y «Entra en» deben ser distintos')
  }
}

/** Lo tecleado con el signo de un lado: negativo el que sale, positivo el que entra; nunca −0. */
function importeDelLado(importe: Importe, sale: boolean): Importe {
  const base = sale && importe.base !== 0 ? -importe.base : importe.base
  return importe.introducido === undefined ? { base } : { base, introducido: importe.introducido }
}

/** Un lado de la transferencia: un movimiento manual vinculado, de la categoría Transferencias (§8). */
function lado(
  id: Id,
  transferenciaId: Id,
  dominioId: Id,
  datos: DatosTransferencia,
  sale: boolean,
  concepto: string,
): Movimiento {
  return {
    id,
    dominioId,
    fecha: datos.fecha,
    tipo: 'transferencia',
    importe: importeDelLado(datos.importe, sale),
    categoriaId: CATEGORIA.transferencias,
    concepto,
    origen: 'manual',
    vinculo: { tipo: 'transferencia', id: transferenciaId },
    programado: false,
  }
}

/**
 * El concepto de un lado al editar: el escrito, si lo hay; si no, el que tenía, salvo que fuera el propuesto
 * para el otro lado de antes, que se vuelve a proponer con el de ahora.
 */
function conceptoAlEditar(escrito: string | undefined, actual: string, propuestoAntes: string, propuestoAhora: string): string {
  if (escrito !== undefined) {
    return escrito
  }
  return actual === propuestoAntes ? propuestoAhora : actual
}

/** Crea la transferencia y sus dos movimientos vinculados, con fecha de hoy o anterior (§6.4 l.755; D-033). */
export function crearTransferencia<E extends EstadoPartida>(estado: E, datos: DatosTransferencia, sello: Sello): Creado<E> {
  exigeValida(estado, datos)
  const id = sello.nuevoId()
  const saleId = sello.nuevoId()
  const entraId = sello.nuevoId()
  const transferencia: Transferencia = {
    id,
    fecha: datos.fecha,
    importe: datos.importe,
    saleDeId: datos.saleDeId,
    entraEnId: datos.entraEnId,
    movimientoSaleId: saleId,
    movimientoEntraId: entraId,
  }
  const sale = lado(saleId, id, datos.saleDeId, datos, true, datos.conceptoSale ?? propuestoSale(estado, datos.entraEnId))
  const entra = lado(entraId, id, datos.entraEnId, datos, false, datos.conceptoEntra ?? propuestoEntra(estado, datos.saleDeId))
  return {
    estado: {
      ...estado,
      movimientos: [...estado.movimientos, sale, entra],
      transferencias: [...estado.transferencias, transferencia],
    },
    id,
  }
}

/** Cambia la transferencia y sus dos lados a la vez (§6.4, tabla de vinculados). */
export function editarTransferencia<E extends EstadoPartida>(
  estado: E,
  id: Id,
  datos: DatosTransferencia,
  sello: Sello,
): E {
  const actual = buscarPorId(estado.transferencias, id)
  exigeValida(estado, datos)
  const saleActual = buscarPorId(estado.movimientos, actual.movimientoSaleId)
  const entraActual = buscarPorId(estado.movimientos, actual.movimientoEntraId)
  const transferencia: Transferencia = {
    ...actual,
    fecha: datos.fecha,
    importe: datos.importe,
    saleDeId: datos.saleDeId,
    entraEnId: datos.entraEnId,
  }
  const conceptoSale = conceptoAlEditar(
    datos.conceptoSale,
    saleActual.concepto,
    propuestoSale(estado, actual.entraEnId),
    propuestoSale(estado, datos.entraEnId),
  )
  const conceptoEntra = conceptoAlEditar(
    datos.conceptoEntra,
    entraActual.concepto,
    propuestoEntra(estado, actual.saleDeId),
    propuestoEntra(estado, datos.saleDeId),
  )
  const sale: Movimiento = { ...saleActual, ...lado(saleActual.id, id, datos.saleDeId, datos, true, conceptoSale) }
  const entra: Movimiento = {
    ...entraActual,
    ...lado(entraActual.id, id, datos.entraEnId, datos, false, conceptoEntra),
  }
  const transferencias = reemplazarPorId(estado.transferencias, transferencia, sello.ahora)
  const movimientos = reemplazarPorId(reemplazarPorId(estado.movimientos, sale, sello.ahora), entra, sello.ahora)
  if (transferencias === estado.transferencias && movimientos === estado.movimientos) {
    return estado
  }
  return { ...estado, movimientos, transferencias }
}

/** Borra la transferencia y sus dos movimientos (§6.4 l.776). */
export function eliminarTransferencia<E extends EstadoPartida>(estado: E, id: Id): E {
  const actual = buscarPorId(estado.transferencias, id)
  return {
    ...estado,
    movimientos: quitarPorId(quitarPorId(estado.movimientos, actual.movimientoSaleId), actual.movimientoEntraId),
    transferencias: quitarPorId(estado.transferencias, id),
  }
}
```

- El importe de la transferencia es una magnitud con lo tecleado (`EsquemaImporteMagnitud`); cada lado copia lo tecleado y pone su signo. Un importe de 0 guarda 0 en los dos lados, nunca −0.
- `conceptoAlEditar` decide el concepto de cada lado al editar:
  - el que se escribe, si se escribe;
  - si no, el que ya tenía, salvo que fuera el propuesto para el otro lado de antes: entonces se propone el de ahora.
  
  Así, cambiar solo el importe conserva los conceptos, y cambiar «Entra en» de Bree a Archet pasa «Transferencia a Bree» a «Transferencia a Archet».
- `editarTransferencia` busca primero la transferencia (un id que no existe lanza «No existe «id»») y después comprueba las dos reglas.
- `lado` rellena todo el movimiento; al editar, se mezcla con el que había (`{ ...saleActual, ...lado(…) }`) para conservar `editadoEl`, y `reemplazarPorId` lo sella solo si algo cambió.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/edicion/transferencias.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  9 passed (9)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada:
- `npx tsc -b` no escribe nada.
- `npm run lint` solo imprime su cabecera (`> gestion-aldeas@0.0.0 lint` y `> oxlint`) y sale con código 0.
- `npm test` termina con **851 pruebas en 76 archivos**. La tarea 23 dejó 841 pruebas en 75 archivos, y esta trae **10 nuevas**: las 9 de `transferencias.test.ts` y **una más** en `pureza.test.ts`, que recorre también `edicion/transferencias.ts`.

```text
 Test Files  76 passed (76)
      Tests  851 passed (851)
```

Si el número que ves no es 851, sigue con **el tuyo**: lo que esta tarea garantiza es **+10 pruebas y +1 archivo** sobre lo que dejó la tarea 23.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/edicion/transferencias.ts src/dominio/edicion/transferencias.test.ts
git commit -m "feat(edicion): crear, editar y eliminar transferencias con sus dos lados" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` puede avisar `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-3 9d04045] feat(edicion): crear, editar y eliminar transferencias con sus dos lados
 2 files changed, 360 insertions(+)
 create mode 100644 src/dominio/edicion/transferencias.test.ts
 create mode 100644 src/dominio/edicion/transferencias.ts
```

---

### Tarea 25 · Reglas: interruptor y «Al eliminar»

Las reglas recurrentes de dinero son las que crean movimientos automáticos: los gastos e ingresos de J5, los impuestos, rentas y tributos de A3, las filas de trabajadores de A5 y las unidades de la guarnición de A6. Esta tarea escribe `src/dominio/edicion/reglas.ts` con lo que la fase 3 necesita de ellas: el interruptor «Activo / En pausa» de J5 y lo que pasa con los movimientos pasados al borrar una regla (§6.4, «Al eliminar»).

Lo que hace cada función:

- **`cambiarActivo`**: guarda al instante con `editadoEl` y devuelve el mismo estado si el interruptor ya estaba así. Al reanudar no se toca la frecuencia: la regla sigue con su calendario desde mañana, sin recuperar lo que se saltó (D-037), y eso ya lo hace el motor, que solo mira los días posteriores a la fecha actual.
- **`eliminarRecurrente`** y **`eliminarImpuestoRenta`**: sus movimientos se quedan como gasto o ingreso suelto, **sin `regla`**. Si no, `referencias.ts` los rechazaría, porque su regla apuntaría a algo que no existe.
- **`eliminarImpuestoRenta`** quita además los efectos de eventos que apuntaban a ese impuesto (el de la feria sobre los aranceles, en el ejemplo). La especificación no lo escribe para los impuestos, pero es lo que hace con un edificio borrado, y sin eso el evento se quedaría apuntando a un impuesto que no existe y la copia saldría dañada. Su deuda de impago, si la tiene, se queda: después de la tarea 6 su origen puede apuntar a una regla borrada (técnica 5).
- **`eliminarTrabajador`** y **`eliminarUnidadGuarnicion`**: el pago agrupado de salarios o soldadas es del asentamiento, no de la fila (D-035). El movimiento conserva su `regla` y su importe, y la entrada del detalle de esa fila se queda con su nombre, su número y lo pagado; solo pierde `origenId`.

Ninguno de estos efectos pone `editadoEl` (técnica 31): no los edita el jugador. Tampoco cuentan el cambio: lo cuenta `guardarEdicion` (tarea 27), uno por guardado (D-038). La renta de un edificio alquilado se puede borrar y el edificio sigue «Alquilado»: después de la tarea 6 eso es válido (D-036, técnica 6).

Depende de la tarea 6 (técnicas 5 y 6), de la 5 (el detalle de salarios del 6 de abril dice «Pastor», técnica 9) y de la 23 (`Sello`, `buscarPorId`, `reemplazarPorId` y `quitarPorId`). Es **1 módulo nuevo del dominio**: `pureza.test.ts` suma 1 prueba.

**Reglas de la especificación que implementa:**

- **Interruptores (§6.4, l.849; §6.2, l.420).** «Interruptores en línea (J5): guardan al instante y cuentan como edición.» «Al reanudar, la próxima fecha se calcula desde hoy.»
- **Al eliminar (§6.4, l.782).** «Gasto o ingreso recurrente, trabajador, unidad, impuesto | Sus movimientos pasados se conservan sueltos, sin regla». D-035 lo matiza para los trabajadores y las unidades: su pago agrupado sigue siendo del asentamiento, con su nombre, y solo pierde el enlace a la fila.
- **Eventos (§6.4, l.789).** Al eliminar un edificio «se quitan los efectos de eventos que lo apuntan». Se hace lo mismo con los que apuntan a un impuesto borrado.
- **D-036.** «La renta de un edificio se sigue cobrando aunque el edificio deje de estar «Alquilado», y un edificio alquilado puede quedarse sin renta.»

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/edicion/reglas.ts`
- Prueba: `src/dominio/edicion/reglas.test.ts` (9 pruebas)

- [ ] **Paso 1: Escribir la prueba que falla**

Todas las pruebas parten de la partida de ejemplo **congelada** y comprueban que el resultado sigue pasando `validarCopia`. Qué comprueba cada bloque:
- `cambiarActivo`: pausar la posada, el mismo estado si ya estaba activa y reanudar la escolta sin tocar su frecuencia.
- `eliminarRecurrente`: los tres movimientos de la posada se quedan sin regla, sin `editadoEl` y con su concepto; los del establo no se tocan y los saldos no cambian.
- `eliminarImpuestoRenta`:
  - el tributo de Archet con una deuda de impago abierta de 18,8 mo, que se arma en la prueba: la deuda se queda y todo es válido (técnica 5);
  - los aranceles: sus dos movimientos sin regla y la feria sin su efecto;
  - la renta del molino: el molino sigue alquilado (D-036).
- `eliminarTrabajador` y `eliminarUnidadGuarnicion`: los pastores del pago del 6 de abril y el capitán del pago del 10 quedan con su nombre y sin `origenId`; un trabajador sin pagos no toca el libro.
- Los cinco lanzan con un id que no existe.

Crea `src/dominio/edicion/reglas.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { saldosPorDominio } from '../dinero/saldo'
import {
  AVANCE,
  DOM,
  EVENTO,
  IMPUESTO,
  MOV_BREE,
  MOV_THARAN,
  PERSONA,
  RECURRENTE,
  TRABAJADOR,
  UNIDAD,
} from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Id, Instante } from '../modelo/comunes'
import type { Deuda } from '../modelo/deudas'
import type { DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import {
  cambiarActivo,
  eliminarImpuestoRenta,
  eliminarRecurrente,
  eliminarTrabajador,
  eliminarUnidadGuarnicion,
} from './reglas'
import type { Sello } from './registros'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** Un sello nuevo en cada prueba. */
function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

/** La partida de ejemplo congelada: si una función escribe en su entrada, la prueba falla. */
function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

/** El movimiento con ese id, si está. */
function movimiento(documento: DocumentoPartida, id: Id): Movimiento | undefined {
  return documento.movimientos.find((m) => m.id === id)
}

describe('cambiarActivo', () => {
  it('el interruptor de J5 guarda al instante con editadoEl, y no cambia nada si ya estaba así (§6.4; D-037)', () => {
    const documento = ejemplo()
    const pausada = cambiarActivo(documento, RECURRENTE.posada, false, sello())
    expect(pausada.recurrentes[0]).toEqual({ ...documento.recurrentes[0], activo: false, editadoEl: AHORA })
    expect(pausada.recurrentes[1]).toBe(documento.recurrentes[1])
    expect(validarCopia(pausada, catalogosDeEjemplo())).toEqual([])

    expect(cambiarActivo(documento, RECURRENTE.posada, true, sello())).toBe(documento)

    const reanudada = cambiarActivo(documento, RECURRENTE.escolta, true, sello())
    expect(reanudada.recurrentes[2].activo).toBe(true)
    expect(reanudada.recurrentes[2].recurrencia).toEqual(documento.recurrentes[2].recurrencia)
  })
})

describe('eliminarRecurrente', () => {
  it('quita la regla y sus movimientos pasados se quedan sueltos, sin regla ni editadoEl (§6.4, «Al eliminar»)', () => {
    const documento = ejemplo()
    const estado = eliminarRecurrente(documento, RECURRENTE.posada)
    expect(estado.recurrentes.map((r) => r.id)).toEqual([
      RECURRENTE.establo,
      RECURRENTE.escolta,
      RECURRENTE.alquilerCasaArchet,
    ])
    for (const id of [MOV_THARAN.posada6Abril, MOV_THARAN.posada10Abril, MOV_THARAN.posada12Abril]) {
      const suelto = movimiento(estado, id)
      expect(suelto).not.toHaveProperty('regla')
      expect(suelto).not.toHaveProperty('editadoEl')
      expect(suelto?.concepto).toBe(movimiento(documento, id)?.concepto)
    }
    expect(movimiento(estado, MOV_THARAN.establo12Abril)).toBe(movimiento(documento, MOV_THARAN.establo12Abril))
    expect(saldosPorDominio(estado)).toEqual(saldosPorDominio(documento))
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })
})

describe('eliminarImpuestoRenta', () => {
  it('eliminar el tributo de Archet deja válida su deuda de impago abierta (T5)', () => {
    const impago: Deuda = {
      id: 'deuda.impago-tributo-archet',
      dominioId: DOM.archet,
      sentido: 'debo',
      contraparteId: PERSONA.corona,
      fecha: { anio: 1640, mes: 4, dia: 12 },
      principal: { base: 1880000 },
      interesPct: 0,
      estado: 'abierta',
      impago: true,
      origenImpago: { tipo: 'tributo', id: IMPUESTO.tributoArchet },
      cargos: [{ fecha: { anio: 1640, mes: 4, dia: 12 }, importe: { base: 1880000 }, avanceId: AVANCE.hasta12Abril }],
      pagos: [],
      devengos: [],
    }
    const documento = congelar({ ...documentoDeEjemplo(), deudas: [...documentoDeEjemplo().deudas, impago] })
    expect(validarCopia(documento, catalogosDeEjemplo())).toEqual([])
    const estado = eliminarImpuestoRenta(documento, IMPUESTO.tributoArchet)
    expect(estado.impuestosRentas.some((i) => i.id === IMPUESTO.tributoArchet)).toBe(false)
    expect(estado.deudas.at(-1)).toBe(impago)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('eliminar los aranceles suelta sus movimientos y quita el efecto de la feria que los apuntaba', () => {
    const documento = ejemplo()
    const estado = eliminarImpuestoRenta(documento, IMPUESTO.aranceles)
    expect(movimiento(estado, MOV_BREE.aranceles1Abril)).not.toHaveProperty('regla')
    expect(movimiento(estado, MOV_BREE.aranceles8Abril)).not.toHaveProperty('regla')
    expect(movimiento(estado, MOV_BREE.peaje12Abril)).toBe(movimiento(documento, MOV_BREE.peaje12Abril))
    const feria = estado.eventos.find((e) => e.id === EVENTO.feria)
    expect(feria?.efectos).toEqual([])
    expect(feria).not.toHaveProperty('editadoEl')
    expect(estado.eventos.find((e) => e.id === EVENTO.bandidos)).toBe(
      documento.eventos.find((e) => e.id === EVENTO.bandidos),
    )
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('eliminar la renta del molino deja el edificio alquilado sin renta, y es válido (D-036)', () => {
    const estado = eliminarImpuestoRenta(ejemplo(), IMPUESTO.alquilerMolino)
    expect(estado.edificios.find((e) => e.nombre === 'Molino')?.estado).toBe('alquilado')
    expect(movimiento(estado, MOV_BREE.alquilerMolino)).not.toHaveProperty('regla')
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })
})

describe('eliminarTrabajador y eliminarUnidadGuarnicion', () => {
  it('eliminar los pastores deja su entrada del pago agrupado con el nombre y sin origenId (D-035)', () => {
    const documento = ejemplo()
    const estado = eliminarTrabajador(documento, TRABAJADOR.pastores)
    expect(estado.trabajadores.some((t) => t.id === TRABAJADOR.pastores)).toBe(false)
    const salarios = movimiento(estado, MOV_BREE.salarios6Abril)
    expect(salarios?.regla).toEqual({ tipo: 'salarios', id: DOM.bree })
    expect(salarios?.importe).toEqual({ base: -420000 })
    expect(salarios).not.toHaveProperty('editadoEl')
    expect(salarios?.detalleTrabajo?.[4]).toEqual({ nombre: 'Pastor', numero: 1, importe: { base: 10000 } })
    expect(salarios?.detalleTrabajo?.slice(0, 4)).toEqual(
      movimiento(documento, MOV_BREE.salarios6Abril)?.detalleTrabajo?.slice(0, 4),
    )
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('eliminar una unidad hace lo mismo con el pago agrupado de soldadas (D-035)', () => {
    const documento = ejemplo()
    const estado = eliminarUnidadGuarnicion(documento, UNIDAD.capitan)
    expect(estado.unidadesGuarnicion.map((u) => u.id)).toEqual([UNIDAD.guardias, UNIDAD.arqueros])
    const soldadas = movimiento(estado, MOV_BREE.soldadas10Abril)
    expect(soldadas?.regla).toEqual({ tipo: 'soldadas', id: DOM.bree })
    expect(soldadas?.detalleTrabajo?.[2]).toEqual({ nombre: 'Capitán de la guardia', numero: 1, importe: { base: 200000 } })
    expect(soldadas?.detalleTrabajo?.[0]).toEqual(movimiento(documento, MOV_BREE.soldadas10Abril)?.detalleTrabajo?.[0])
    expect(movimiento(estado, MOV_BREE.salarios6Abril)).toBe(movimiento(documento, MOV_BREE.salarios6Abril))
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('eliminar un trabajador sin pagos no toca el libro', () => {
    const documento = ejemplo()
    const estado = eliminarTrabajador(documento, TRABAJADOR.albanilesArchet)
    expect(estado.movimientos).toBe(documento.movimientos)
    expect(estado.trabajadores).toHaveLength(documento.trabajadores.length - 1)
  })
})

describe('ids que no existen', () => {
  it('las cinco lanzan «No existe «…»»: es un error de programación', () => {
    const documento = ejemplo()
    expect(() => cambiarActivo(documento, 'rec.no-existe', true, sello())).toThrow('No existe «rec.no-existe»')
    expect(() => eliminarRecurrente(documento, 'rec.no-existe')).toThrow('No existe «rec.no-existe»')
    expect(() => eliminarImpuestoRenta(documento, 'imp.no-existe')).toThrow('No existe «imp.no-existe»')
    expect(() => eliminarTrabajador(documento, 'trab.no-existe')).toThrow('No existe «trab.no-existe»')
    expect(() => eliminarUnidadGuarnicion(documento, 'uni.no-existe')).toThrow('No existe «uni.no-existe»')
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/edicion/reglas.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./reglas`. La hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/edicion/reglas.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/edicion/reglas.test.ts [ src/dominio/edicion/reglas.test.ts ]
Error: Cannot find module './reglas' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/edicion/reglas.test.ts
 ❯ src/dominio/edicion/reglas.test.ts:23:1
     21| import { congelar } from '../motor/pruebas/constructores'
     22| import { validarCopia } from '../validacion/coherencia'
     23| import {
       | ^
     24|   cambiarActivo,
     25|   eliminarImpuestoRenta,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Implementar `reglas.ts`**

Crea `src/dominio/edicion/reglas.ts` con este contenido:

```ts
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { EfectoEvento, EventoNarrativo } from '../modelo/eventos'
import type { DetalleTrabajo, Movimiento, ReglaOrigen } from '../modelo/movimientos'
import { buscarPorId, quitarPorId, reemplazarPorId, type Sello } from './registros'

/**
 * Quita la regla a los movimientos que cumplen `deLaRegla`: quedan como gasto o ingreso suelto (§6.4 l.782).
 * Es un efecto del borrado, así que no pone editadoEl (T31). La misma lista si no había ninguno.
 */
function soltarMovimientos(movimientos: Movimiento[], deLaRegla: (regla: ReglaOrigen) => boolean): Movimiento[] {
  const apunta = (m: Movimiento): boolean => m.regla !== undefined && deLaRegla(m.regla)
  if (!movimientos.some(apunta)) {
    return movimientos
  }
  return movimientos.map((m) => {
    if (!apunta(m)) {
      return m
    }
    const suelto = { ...m }
    delete suelto.regla
    return suelto
  })
}

/**
 * Quita el origenId de la fila borrada en los pagos agrupados de salarios o de soldadas: la entrada conserva su
 * nombre, su número y lo pagado, y el movimiento sigue siendo del asentamiento (D-035; T31, sin editadoEl).
 */
function soltarDetalle(movimientos: Movimiento[], tipo: 'salarios' | 'soldadas', origenId: Id): Movimiento[] {
  const deLaFila = (d: DetalleTrabajo): boolean => d.origenId === origenId
  const apunta = (m: Movimiento): boolean => m.regla?.tipo === tipo && (m.detalleTrabajo ?? []).some(deLaFila)
  if (!movimientos.some(apunta)) {
    return movimientos
  }
  return movimientos.map((m) => {
    if (!apunta(m) || m.detalleTrabajo === undefined) {
      return m
    }
    const detalleTrabajo = m.detalleTrabajo.map((d) => {
      if (!deLaFila(d)) {
        return d
      }
      const sinOrigen = { ...d }
      delete sinOrigen.origenId
      return sinOrigen
    })
    return { ...m, detalleTrabajo }
  })
}

/** Si un efecto de evento apunta a ese impuesto o renta. */
function apuntaAlImpuesto(efecto: EfectoEvento, impuestoId: Id): boolean {
  return efecto.objetivo.tipo === 'impuesto' && efecto.objetivo.id === impuestoId
}

/**
 * Quita de los eventos los efectos que apuntan a un impuesto borrado, como se hace con los de un edificio
 * (§6.4, «Al eliminar»). El evento se queda, con sus demás efectos (T31, sin editadoEl).
 */
function sinEfectosSobre(eventos: EventoNarrativo[], impuestoId: Id): EventoNarrativo[] {
  const apunta = (e: EventoNarrativo): boolean => e.efectos.some((ef) => apuntaAlImpuesto(ef, impuestoId))
  if (!eventos.some(apunta)) {
    return eventos
  }
  return eventos.map((e) =>
    apunta(e) ? { ...e, efectos: e.efectos.filter((ef) => !apuntaAlImpuesto(ef, impuestoId)) } : e,
  )
}

/** Interruptor «Activo / En pausa» de J5: guarda al instante y pone editadoEl (§6.4 l.849; D-037). */
export function cambiarActivo<E extends EstadoPartida>(estado: E, recurrenteId: Id, activo: boolean, sello: Sello): E {
  const actual = buscarPorId(estado.recurrentes, recurrenteId)
  const recurrentes = reemplazarPorId(estado.recurrentes, { ...actual, activo }, sello.ahora)
  return recurrentes === estado.recurrentes ? estado : { ...estado, recurrentes }
}

/** Elimina un gasto o ingreso recurrente: sus movimientos quedan sueltos, sin regla (§6.4 l.782). */
export function eliminarRecurrente<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.recurrentes, id)
  return {
    ...estado,
    movimientos: soltarMovimientos(estado.movimientos, (r) => r.tipo === 'recurrente' && r.id === id),
    recurrentes: quitarPorId(estado.recurrentes, id),
  }
}

/**
 * Elimina un impuesto, renta o tributo: sus movimientos quedan sueltos, sin regla (§6.4 l.782; D-036), y los
 * eventos pierden los efectos que lo apuntaban. Sus deudas de impago se quedan (T5).
 */
export function eliminarImpuestoRenta<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.impuestosRentas, id)
  return {
    ...estado,
    movimientos: soltarMovimientos(
      estado.movimientos,
      (r) => (r.tipo === 'impuesto' || r.tipo === 'tributo') && r.id === id,
    ),
    impuestosRentas: quitarPorId(estado.impuestosRentas, id),
    eventos: sinEfectosSobre(estado.eventos, id),
  }
}

/** Elimina una fila de trabajadores: su entrada en los pagos agrupados pierde origenId y conserva el nombre (D-035). */
export function eliminarTrabajador<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.trabajadores, id)
  return {
    ...estado,
    movimientos: soltarDetalle(estado.movimientos, 'salarios', id),
    trabajadores: quitarPorId(estado.trabajadores, id),
  }
}

/** Elimina una unidad de la guarnición, igual que un trabajador (D-035). */
export function eliminarUnidadGuarnicion<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.unidadesGuarnicion, id)
  return {
    ...estado,
    movimientos: soltarDetalle(estado.movimientos, 'soldadas', id),
    unidadesGuarnicion: quitarPorId(estado.unidadesGuarnicion, id),
  }
}
```

- Los tres ayudantes (`soltarMovimientos`, `soltarDetalle` y `sinEfectosSobre`) devuelven **la misma lista** si no hay nada que soltar, y copian solo los registros que tocan: un borrado no copia el libro entero.
- `eliminarImpuestoRenta` suelta los movimientos con regla `impuesto` o `tributo` y ese id. Los ids son únicos en la partida, así que no hace falta mirar el `sentido`.
- `soltarDetalle` solo mira los pagos de su clase (`salarios` para los trabajadores, `soldadas` para las unidades), como hace `referencias.ts` al validar `origenId`.
- `apuntaAlImpuesto` usa `efecto.objetivo.tipo === 'impuesto'` para que TypeScript sepa que ese objetivo tiene `id`: los efectos de «costes» apuntan a una categoría, no a un registro.
- Todas empiezan con `buscarPorId`, que lanza «No existe «id»» si la regla no existe.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/edicion/reglas.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  9 passed (9)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada:
- `npx tsc -b` no escribe nada.
- `npm run lint` solo imprime su cabecera (`> gestion-aldeas@0.0.0 lint` y `> oxlint`) y sale con código 0.
- `npm test` termina con **861 pruebas en 77 archivos**. La tarea 24 dejó 851 pruebas en 76 archivos, y esta trae **10 nuevas**: las 9 de `reglas.test.ts` y **una más** en `pureza.test.ts`, que recorre también `edicion/reglas.ts`.

```text
 Test Files  77 passed (77)
      Tests  861 passed (861)
```

Si el número que ves no es 861, sigue con **el tuyo**: lo que esta tarea garantiza es **+10 pruebas y +1 archivo** sobre lo que dejó la tarea 24.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/edicion/reglas.ts src/dominio/edicion/reglas.test.ts
git commit -m "feat(edicion): interruptor de J5 y «Al eliminar» de recurrentes, impuestos, trabajadores y unidades" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` puede avisar `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-3 35e7717] feat(edicion): interruptor de J5 y «Al eliminar» de recurrentes, impuestos, trabajadores y unidades
 2 files changed, 303 insertions(+)
 create mode 100644 src/dominio/edicion/reglas.test.ts
 create mode 100644 src/dominio/edicion/reglas.ts
```

---

### Tarea 26 · Locales: alta, estado y producción

Los impuestos de locales son la regla más delicada de la fase: cada local paga cada mes una sola vez, y eso lo sostienen tres datos del local que el jugador no teclea:
- `alta`, la fecha actual al crearlo;
- `cobradoHasta`, que al crearlo es el mes anterior al del alta;
- `cambiosEstado`, los tramos de abierto y cerrado, cada uno desde un día.

El motor (tareas 8 y 16) solo los lee y avanza `cobradoHasta`; esta tarea escribe `src/dominio/edicion/locales.ts`, que es donde nacen y cambian, con las ocho funciones que piden los formularios «Local comercial», «Tipo de local» y A3c:

- **`altaDeLocal`**: `alta` = hoy, `cobradoHasta` = el mes anterior y un primer tramo desde hoy con el estado elegido. Así el mes del alta se cobra entero el siguiente día de cobro y los anteriores no se cobran (§7, l.1076).
- **`cambiarEstadoDeLocal`**: el cambio cuenta **desde mañana**. Se quitan los tramos que empiezan después de hoy; si el estado elegido es el de hoy, no hace falta ningún tramo más, y si no, se añade uno desde mañana. Así cerrar y volver a abrir el mismo día lo deja como estaba, y dos tramos seguidos nunca tienen el mismo estado, que es lo que exige `EsquemaLocalComercial`.
- **`mesesParaAnotar`**: los meses que ofrece el selector de A3c, de `cobradoHasta` + 1 (nunca antes del mes del alta) al mes actual, **el actual primero**.
- **`anotarProduccion`** y **`quitarProduccion`** («Usar la habitual»): solo en esos meses. Un mes ya cobrado no se recalcula (se corrige su movimiento con J2c, tarea 23) y uno futuro no existe todavía: «Ese mes no se puede anotar: ya está cobrado o todavía no ha llegado» (D-041).
- **`eliminarLocalComercial`**: sus producciones se van con él, y sus cobros pasados conservan el nombre del local en el detalle, sin `localId`. El importe no cambia y no se pone `editadoEl` (técnica 31).
- **`bloqueoAlEliminarTipoLocal`** y **`eliminarTipoLocal`**: un tipo con locales no se elimina: «Herrería tiene 1 local: cámbialo de tipo antes» o «Tienda tiene 2 locales: cámbialos de tipo antes» (D-041). `bloqueoAlEliminarTipoLocal` devuelve el texto para que la interfaz lo enseñe antes de pedir confirmación; `eliminarTipoLocal` lanza con ese mismo texto.

Como en las tareas 23 a 25, las funciones que editan devuelven **el mismo estado** si nada cambia y ponen `editadoEl` en el local que cambia; ninguna cuenta el cambio (lo hace `guardarEdicion`, tarea 27). Editar los datos sueltos de un local (nombre, tipo, titular, producción habitual o notas) no necesita regla propia: es `reemplazarPorId` de la tarea 23, y lo usará el formulario de la fase 7.

Depende de la tarea 8 (`mesDe`, `compararMeses`, `mesSiguiente`, `mesAnterior`, `estadoDelLocalEl` y `EstadoLocal` de `locales/impuesto.ts`) y de la 23 (`Sello`, `Creado`, `buscarPorId`, `reemplazarPorId` y `quitarPorId`). Es **1 módulo nuevo del dominio**: `pureza.test.ts` suma 1 prueba.

**Reglas de la especificación que implementa:**

- **Local comercial (§7, l.1066).** «Guarda también su alta (la fecha actual al crearlo), cobradoHasta (año-mes; al crearlo, el mes anterior al del alta) y estadoDesde.» `estadoDesde` es hoy `cambiosEstado`: un tramo por cambio (decisión 13 de la fase 2).
- **Estado (§6.4, l.675; §7, l.1078).** «El cambio de estado cuenta desde el día siguiente a la fecha actual.»
- **Meses de A3c (§6.4, l.677).** «Solo los meses sin cobrar del local: desde cobradoHasta + 1 (nunca antes del mes de su alta) hasta el mes actual, con el actual primero y sin meses futuros».
- **«Usar la habitual» (§6.4, l.677).** «vacío = la habitual; 0 = no produjo, así que paga el mínimo»: quitar la anotación deja el mes con la habitual; anotar 0 es otra cosa y se guarda.
- **Mes ya cobrado (§7, l.1085).** «Anotar la producción de un mes ya cobrado no recalcula el cobro: se corrige su movimiento.»
- **Al eliminar (§6.4, l.783-784).** «Tipo de local | Bloqueado mientras tenga locales («Herrería tiene 1 local: cámbialo de tipo antes»)». «Local comercial | Se borran sus producciones anotadas. Los cobros pasados no cambian y su detalle conserva el nombre del local, sin localId».

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/edicion/locales.ts`
- Prueba: `src/dominio/edicion/locales.test.ts` (13 pruebas)

- [ ] **Paso 1: Escribir la prueba que falla**

Todas las pruebas parten de la partida de ejemplo **congelada**, el 12 de abril de 1640. Sus cuatro locales de Bree se dieron de alta el 1 de marzo y tienen `cobradoHasta` en marzo; la tienda de telas lleva anotada la producción de abril (1,5 mo). Qué comprueba cada bloque:
- `altaDeLocal`: la herrería 2 nueva, completa; sin titular ni notas no guarda esas claves; y en enero `cobradoHasta` es diciembre del año anterior.
- `cambiarEstadoDeLocal`:
  - cerrar hoy la herrería añade un tramo cerrado desde el 13;
  - cerrar y reabrir el mismo día deja los tramos como estaban;
  - abrir un local abierto devuelve el mismo estado;
  - un local dado de alta hoy cerrado se abre desde mañana.
- `mesesParaAnotar`:
  - [abril] el 12 de abril y [mayo, abril] el 1 de mayo;
  - [abril, marzo] con `cobradoHasta` en enero;
  - nunca antes del mes del alta.
- `anotarProduccion` y `quitarProduccion`: anotar abril, cambiar en su sitio la anotación de la tienda, lo mismo devuelve el mismo estado, marzo (cobrado) y mayo (futuro) lanzan, y «Usar la habitual».
- `eliminarLocalComercial`: la tienda de telas sale y su entrada del cobro del 1 de abril se queda sin `localId`.
- Tipos: los dos textos del bloqueo y un tipo sin locales que se elimina.

Crea `src/dominio/edicion/locales.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import { DOM, LOCAL, MOV_BREE, PERSONA, TIPO_LOCAL } from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { LocalComercial } from '../modelo/asentamiento'
import type { Id, Instante } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { idsEnSerie } from '../motor/ids'
import { congelar } from '../motor/pruebas/constructores'
import { validarCopia } from '../validacion/coherencia'
import {
  altaDeLocal,
  anotarProduccion,
  bloqueoAlEliminarTipoLocal,
  cambiarEstadoDeLocal,
  eliminarLocalComercial,
  eliminarTipoLocal,
  mesesParaAnotar,
  quitarProduccion,
  type DatosLocal,
} from './locales'
import type { Sello } from './registros'

/** La hora de las ediciones de estas pruebas. */
const AHORA: Instante = '2026-09-18T10:00:00.000Z'

/** La fecha actual del ejemplo y el día siguiente. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }
const MANANA: Fecha = { anio: 1640, mes: 4, dia: 13 }

/** Los meses que usan estas pruebas. */
const MARZO = { anio: 1640, mes: 3 }
const ABRIL = { anio: 1640, mes: 4 }
const MAYO = { anio: 1640, mes: 5 }

/** Un sello nuevo en cada prueba: los ids salen «nuevo.1», «nuevo.2»… */
function sello(): Sello {
  return { ahora: AHORA, nuevoId: idsEnSerie('nuevo') }
}

/** La partida de ejemplo congelada: si una función escribe en su entrada, la prueba falla. */
function ejemplo(): DocumentoPartida {
  return congelar(documentoDeEjemplo())
}

/** El local con ese id, que tiene que estar. */
function local(documento: DocumentoPartida, id: Id): LocalComercial {
  const encontrado = documento.localesComerciales.find((l) => l.id === id)
  if (encontrado === undefined) {
    throw new Error(`Falta el local ${id}`)
  }
  return encontrado
}

/** Una herrería nueva de Bree, con titular y notas. */
const HERRERIA_2: DatosLocal = {
  dominioId: DOM.bree,
  nombre: 'Herrería 2',
  tipoId: TIPO_LOCAL.herreria,
  titularId: PERSONA.hobart,
  produccionHabitual: { base: 800000, introducido: { cantidad: '8', moneda: 'mo' } },
  estado: 'abierto',
  notas: 'Junto a la puerta del sur',
}

describe('altaDeLocal', () => {
  it('da de alta el local hoy, con cobradoHasta en el mes anterior y el primer tramo desde hoy (§7)', () => {
    const documento = ejemplo()
    const { estado, id } = altaDeLocal(documento, HERRERIA_2, sello())
    expect(id).toBe('nuevo.1')
    expect(local(estado, id)).toEqual({
      id: 'nuevo.1',
      dominioId: DOM.bree,
      nombre: 'Herrería 2',
      tipoId: TIPO_LOCAL.herreria,
      titularId: PERSONA.hobart,
      produccionHabitual: { base: 800000, introducido: { cantidad: '8', moneda: 'mo' } },
      cambiosEstado: [{ desde: HOY, estado: 'abierto' }],
      alta: HOY,
      cobradoHasta: MARZO,
      notas: 'Junto a la puerta del sur',
      producciones: [],
    })
    expect(estado.localesComerciales).toHaveLength(5)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('sin titular ni notas no guarda esos campos, y en enero cobradoHasta es diciembre del año anterior', () => {
    const sinOpcionales: DatosLocal = {
      dominioId: DOM.bree,
      nombre: 'Herrería 2',
      tipoId: TIPO_LOCAL.herreria,
      produccionHabitual: { base: 800000 },
      estado: 'cerrado',
    }
    const { estado, id } = altaDeLocal(ejemplo(), sinOpcionales, sello())
    const nuevo = local(estado, id)
    expect(nuevo).not.toHaveProperty('titularId')
    expect(nuevo).not.toHaveProperty('notas')
    expect(nuevo.cambiosEstado).toEqual([{ desde: HOY, estado: 'cerrado' }])
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])

    const documento = documentoDeEjemplo()
    const enEnero = { ...documento, partida: { ...documento.partida, fechaActual: { anio: 1641, mes: 1, dia: 5 } } }
    const creado = altaDeLocal(enEnero, HERRERIA_2, sello())
    expect(local(creado.estado, creado.id).cobradoHasta).toEqual({ anio: 1640, mes: 12 })
  })
})

describe('cambiarEstadoDeLocal', () => {
  it('cerrar hoy un local abierto añade un tramo cerrado desde mañana (§6.4, «Local comercial»)', () => {
    const documento = ejemplo()
    const estado = cambiarEstadoDeLocal(documento, LOCAL.herreria1, 'cerrado', sello())
    const herreria = local(estado, LOCAL.herreria1)
    expect(herreria.cambiosEstado).toEqual([
      { desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' },
      { desde: MANANA, estado: 'cerrado' },
    ])
    expect(herreria.editadoEl).toBe(AHORA)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('cerrar y reabrir el mismo día lo deja como estaba, y abrir uno abierto no cambia nada', () => {
    const documento = ejemplo()
    const cerrado = cambiarEstadoDeLocal(documento, LOCAL.herreria1, 'cerrado', sello())
    const reabierto = cambiarEstadoDeLocal(cerrado, LOCAL.herreria1, 'abierto', sello())
    expect(local(reabierto, LOCAL.herreria1).cambiosEstado).toEqual(local(documento, LOCAL.herreria1).cambiosEstado)
    expect(validarCopia(reabierto, catalogosDeEjemplo())).toEqual([])
    expect(cambiarEstadoDeLocal(documento, LOCAL.herreria1, 'abierto', sello())).toBe(documento)
  })

  it('un local dado de alta hoy cerrado se abre desde mañana', () => {
    const creado = altaDeLocal(ejemplo(), { ...HERRERIA_2, estado: 'cerrado' }, sello())
    const estado = cambiarEstadoDeLocal(creado.estado, creado.id, 'abierto', sello())
    expect(local(estado, creado.id).cambiosEstado).toEqual([
      { desde: HOY, estado: 'cerrado' },
      { desde: MANANA, estado: 'abierto' },
    ])
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })
})

describe('mesesParaAnotar', () => {
  it('ofrece de cobradoHasta + 1 al mes actual, el actual primero, nunca antes del alta (§7; A3c)', () => {
    const documento = ejemplo()
    const tienda = local(documento, LOCAL.tiendaDeTelas)
    expect(mesesParaAnotar(tienda, HOY)).toEqual([ABRIL])
    expect(mesesParaAnotar(tienda, { anio: 1640, mes: 5, dia: 1 })).toEqual([MAYO, ABRIL])
    expect(mesesParaAnotar({ ...tienda, cobradoHasta: { anio: 1640, mes: 1 } }, HOY)).toEqual([ABRIL, MARZO])
    expect(mesesParaAnotar({ ...tienda, cobradoHasta: { anio: 1640, mes: 1 }, alta: { anio: 1640, mes: 4, dia: 1 } }, HOY)).toEqual([
      ABRIL,
    ])
  })
})

describe('anotarProduccion y quitarProduccion', () => {
  it('anota la producción de abril de la herrería (A3c)', () => {
    const documento = ejemplo()
    const anotacion = { mes: ABRIL, importe: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' as const } } }
    const estado = anotarProduccion(documento, LOCAL.herreria1, anotacion, sello())
    const herreria = local(estado, LOCAL.herreria1)
    expect(herreria.producciones).toEqual([anotacion])
    expect(herreria.editadoEl).toBe(AHORA)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })

  it('cambia en su sitio la anotación de un mes, y anotar lo mismo no cambia nada', () => {
    const documento = ejemplo()
    const cero = { mes: ABRIL, importe: { base: 0, introducido: { cantidad: '0', moneda: 'mo' as const } }, nota: 'Cerró por las lluvias' }
    const estado = anotarProduccion(documento, LOCAL.tiendaDeTelas, cero, sello())
    expect(local(estado, LOCAL.tiendaDeTelas).producciones).toEqual([cero])
    const igual = { ...local(documento, LOCAL.tiendaDeTelas).producciones[0] }
    expect(anotarProduccion(documento, LOCAL.tiendaDeTelas, igual, sello())).toBe(documento)
  })

  it('un mes ya cobrado o que no ha llegado no se anota ni se quita', () => {
    const documento = ejemplo()
    const error = 'Ese mes no se puede anotar: ya está cobrado o todavía no ha llegado'
    const importe = { base: 100000 }
    expect(() => anotarProduccion(documento, LOCAL.herreria1, { mes: MARZO, importe }, sello())).toThrow(error)
    expect(() => anotarProduccion(documento, LOCAL.herreria1, { mes: MAYO, importe }, sello())).toThrow(error)
    expect(() => quitarProduccion(documento, LOCAL.tiendaDeTelas, MARZO, sello())).toThrow(error)
  })

  it('«Usar la habitual» quita la anotación de ese mes, y sin anotación no cambia nada (A3c)', () => {
    const documento = ejemplo()
    const estado = quitarProduccion(documento, LOCAL.tiendaDeTelas, ABRIL, sello())
    const tienda = local(estado, LOCAL.tiendaDeTelas)
    expect(tienda.producciones).toEqual([])
    expect(tienda.editadoEl).toBe(AHORA)
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
    expect(quitarProduccion(documento, LOCAL.herreria1, ABRIL, sello())).toBe(documento)
  })
})

describe('eliminarLocalComercial', () => {
  it('se van sus producciones y su cobro pasado conserva el nombre, sin localId (§6.4, «Al eliminar»)', () => {
    const documento = ejemplo()
    const estado = eliminarLocalComercial(documento, LOCAL.tiendaDeTelas)
    expect(estado.localesComerciales.map((l) => l.id)).toEqual([LOCAL.herreria1, LOCAL.posada, LOCAL.ultramarinos])
    const cobro = estado.movimientos.find((m) => m.id === MOV_BREE.locales)
    const antes = documento.movimientos.find((m) => m.id === MOV_BREE.locales)
    expect(cobro?.detalleLocales?.[2]).toEqual({
      nombre: 'Tienda de telas',
      mes: MARZO,
      produccion: { base: 600000 },
      anotada: false,
      impuesto: { base: 30000 },
    })
    expect(cobro?.detalleLocales?.[0]).toEqual(antes?.detalleLocales?.[0])
    expect(cobro?.importe).toEqual(antes?.importe)
    expect(cobro).not.toHaveProperty('editadoEl')
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })
})

describe('bloqueoAlEliminarTipoLocal y eliminarTipoLocal', () => {
  it('un tipo con locales no se elimina: «cámbialo de tipo antes» (§6.4; D-041)', () => {
    const documento = ejemplo()
    expect(bloqueoAlEliminarTipoLocal(documento, TIPO_LOCAL.herreria)).toBe('Herrería tiene 1 local: cámbialo de tipo antes')
    expect(bloqueoAlEliminarTipoLocal(documento, TIPO_LOCAL.tienda)).toBe('Tienda tiene 2 locales: cámbialos de tipo antes')
    expect(() => eliminarTipoLocal(documento, TIPO_LOCAL.tienda)).toThrow('Tienda tiene 2 locales: cámbialos de tipo antes')
  })

  it('un tipo sin locales no tiene bloqueo y se elimina', () => {
    const sinHerreria = eliminarLocalComercial(ejemplo(), LOCAL.herreria1)
    expect(bloqueoAlEliminarTipoLocal(sinHerreria, TIPO_LOCAL.herreria)).toBeNull()
    const estado = eliminarTipoLocal(sinHerreria, TIPO_LOCAL.herreria)
    expect(estado.tiposLocal.map((t) => t.id)).toEqual([TIPO_LOCAL.posada, TIPO_LOCAL.tienda])
    expect(validarCopia(estado, catalogosDeEjemplo())).toEqual([])
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/edicion/locales.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./locales` (el de esta carpeta, `src/dominio/edicion/locales.ts`; el de la tarea 8 es `src/dominio/locales/impuesto.ts`). La hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/edicion/locales.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/edicion/locales.test.ts [ src/dominio/edicion/locales.test.ts ]
Error: Cannot find module './locales' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/edicion/locales.test.ts
 ❯ src/dominio/edicion/locales.test.ts:11:1
      9| import { congelar } from '../motor/pruebas/constructores'
     10| import { validarCopia } from '../validacion/coherencia'
     11| import {
       | ^
     12|   altaDeLocal,
     13|   anotarProduccion,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Implementar `locales.ts`**

Crea `src/dominio/edicion/locales.ts` con este contenido:

```ts
import { compararFechas, sumarDias, type Fecha } from '../calendario/fecha'
import type { Importe } from '../dinero/importe'
import { compararMeses, estadoDelLocalEl, mesAnterior, mesDe, mesSiguiente, type EstadoLocal } from '../locales/impuesto'
import type { LocalComercial, ProduccionMesLocal } from '../modelo/asentamiento'
import type { AnioMes, Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { DetalleLocal, Movimiento } from '../modelo/movimientos'
import { buscarPorId, quitarPorId, reemplazarPorId, type Creado, type Sello } from './registros'

/** Lo que pide el formulario «Local comercial» (§6.4 l.675). */
export interface DatosLocal {
  dominioId: Id
  nombre: string
  tipoId: Id
  titularId?: Id
  produccionHabitual: Importe
  estado: EstadoLocal
  notas?: string
}

/** Sustituye el local en el estado; el mismo estado si no cambió nada. */
function conLocal<E extends EstadoPartida>(estado: E, local: LocalComercial, sello: Sello): E {
  const localesComerciales = reemplazarPorId(estado.localesComerciales, local, sello.ahora)
  return localesComerciales === estado.localesComerciales ? estado : { ...estado, localesComerciales }
}

/** Lanza si el mes no está entre los que A3c deja anotar (§7 l.1085; D-041). */
function exigeMesAnotable(local: LocalComercial, mes: AnioMes, fechaActual: Fecha): void {
  if (!mesesParaAnotar(local, fechaActual).some((m) => compararMeses(m, mes) === 0)) {
    throw new Error('Ese mes no se puede anotar: ya está cobrado o todavía no ha llegado')
  }
}

/** Alta de un local: alta = hoy, cobradoHasta = mes anterior y primer tramo desde hoy (§7 l.1066). */
export function altaDeLocal<E extends EstadoPartida>(estado: E, datos: DatosLocal, sello: Sello): Creado<E> {
  const hoy = estado.partida.fechaActual
  const id = sello.nuevoId()
  const local: LocalComercial = {
    id,
    dominioId: datos.dominioId,
    nombre: datos.nombre,
    tipoId: datos.tipoId,
    produccionHabitual: datos.produccionHabitual,
    cambiosEstado: [{ desde: hoy, estado: datos.estado }],
    alta: hoy,
    cobradoHasta: mesAnterior(mesDe(hoy)),
    producciones: [],
  }
  if (datos.titularId !== undefined) {
    local.titularId = datos.titularId
  }
  if (datos.notas !== undefined) {
    local.notas = datos.notas
  }
  return { estado: { ...estado, localesComerciales: [...estado.localesComerciales, local] }, id }
}

/**
 * Abre o cierra un local desde mañana: añade, cambia o quita el tramo de mañana (§6.4 l.675). Si el estado
 * elegido es el que tiene hoy, el tramo de mañana sobra y se quita.
 */
export function cambiarEstadoDeLocal<E extends EstadoPartida>(
  estado: E,
  localId: Id,
  nuevo: EstadoLocal,
  sello: Sello,
): E {
  const hoy = estado.partida.fechaActual
  const local = buscarPorId(estado.localesComerciales, localId)
  const hastaHoy = local.cambiosEstado.filter((t) => compararFechas(t.desde, hoy) <= 0)
  const cambiosEstado =
    estadoDelLocalEl(local, hoy) === nuevo ? hastaHoy : [...hastaHoy, { desde: sumarDias(hoy, 1), estado: nuevo }]
  return conLocal(estado, { ...local, cambiosEstado }, sello)
}

/** Meses que A3c deja anotar: de cobradoHasta + 1 (nunca antes del alta) al mes actual, el actual primero (§7 l.1085). */
export function mesesParaAnotar(local: LocalComercial, fechaActual: Fecha): AnioMes[] {
  const siguiente = mesSiguiente(local.cobradoHasta)
  const delAlta = mesDe(local.alta)
  const actual = mesDe(fechaActual)
  const meses: AnioMes[] = []
  let mes = compararMeses(siguiente, delAlta) >= 0 ? siguiente : delAlta
  while (compararMeses(mes, actual) <= 0) {
    meses.unshift(mes)
    mes = mesSiguiente(mes)
  }
  return meses
}

/** Anota o cambia la producción de un mes sin cobrar (A3c; §6.4 l.677). */
export function anotarProduccion<E extends EstadoPartida>(
  estado: E,
  localId: Id,
  anotacion: ProduccionMesLocal,
  sello: Sello,
): E {
  const local = buscarPorId(estado.localesComerciales, localId)
  exigeMesAnotable(local, anotacion.mes, estado.partida.fechaActual)
  const delMes = (p: ProduccionMesLocal): boolean => compararMeses(p.mes, anotacion.mes) === 0
  const producciones = local.producciones.some(delMes)
    ? local.producciones.map((p) => (delMes(p) ? anotacion : p))
    : [...local.producciones, anotacion]
  return conLocal(estado, { ...local, producciones }, sello)
}

/** «Usar la habitual»: quita la anotación de ese mes (A3c; §6.4 l.677). */
export function quitarProduccion<E extends EstadoPartida>(estado: E, localId: Id, mes: AnioMes, sello: Sello): E {
  const local = buscarPorId(estado.localesComerciales, localId)
  exigeMesAnotable(local, mes, estado.partida.fechaActual)
  const producciones = local.producciones.filter((p) => compararMeses(p.mes, mes) !== 0)
  return conLocal(estado, { ...local, producciones }, sello)
}

/** Quita el localId de las entradas de ese local en los cobros de locales; sin editadoEl (§6.4 l.784; T31). */
function soltarDetalle(movimientos: Movimiento[], localId: Id): Movimiento[] {
  const delLocal = (d: DetalleLocal): boolean => d.localId === localId
  const apunta = (m: Movimiento): boolean => (m.detalleLocales ?? []).some(delLocal)
  if (!movimientos.some(apunta)) {
    return movimientos
  }
  return movimientos.map((m) => {
    if (!apunta(m) || m.detalleLocales === undefined) {
      return m
    }
    const detalleLocales = m.detalleLocales.map((d) => {
      if (!delLocal(d)) {
        return d
      }
      const sinLocal = { ...d }
      delete sinLocal.localId
      return sinLocal
    })
    return { ...m, detalleLocales }
  })
}

/** Elimina un local: sus producciones se van con él y sus cobros pasados conservan el nombre, sin localId (§6.4 l.784). */
export function eliminarLocalComercial<E extends EstadoPartida>(estado: E, id: Id): E {
  buscarPorId(estado.localesComerciales, id)
  return {
    ...estado,
    movimientos: soltarDetalle(estado.movimientos, id),
    localesComerciales: quitarPorId(estado.localesComerciales, id),
  }
}

/** «Herrería tiene 1 local: cámbialo de tipo antes», o null si el tipo no tiene locales (§6.4 l.783; D-041). */
export function bloqueoAlEliminarTipoLocal(estado: EstadoPartida, tipoId: Id): string | null {
  const tipo = buscarPorId(estado.tiposLocal, tipoId)
  const locales = estado.localesComerciales.filter((l) => l.tipoId === tipoId).length
  if (locales === 0) {
    return null
  }
  return locales === 1
    ? `${tipo.nombre} tiene 1 local: cámbialo de tipo antes`
    : `${tipo.nombre} tiene ${locales} locales: cámbialos de tipo antes`
}

/** Elimina un tipo de local sin locales; si tiene, lanza el texto del bloqueo (§6.4 l.783). */
export function eliminarTipoLocal<E extends EstadoPartida>(estado: E, tipoId: Id): E {
  const bloqueo = bloqueoAlEliminarTipoLocal(estado, tipoId)
  if (bloqueo !== null) {
    throw new Error(bloqueo)
  }
  return { ...estado, tiposLocal: quitarPorId(estado.tiposLocal, tipoId) }
}
```

- `altaDeLocal` solo añade `titularId` y `notas` si llegan: un local sin titular no guarda la clave vacía.
- `cambiarEstadoDeLocal` usa `estadoDelLocalEl(local, hoy)` de la tarea 8, que es el estado del último tramo que ya empezó. El tramo de mañana, si lo había, no cuenta para decidir: por eso cerrar y reabrir el mismo día lo quita.
- `anotarProduccion` sustituye la anotación de ese mes en su sitio o la añade al final; `quitarProduccion` la filtra. Si el resultado es igual al que había, `reemplazarPorId` devuelve la misma lista y la función, el mismo estado.
- `quitarProduccion` comprueba el mes igual que `anotarProduccion`: A3c solo trabaja con los meses sin cobrar, y la anotación de un mes cobrado se queda como estaba.
- `soltarDetalle` copia solo los cobros que nombran el local: los demás movimientos se quedan con la misma referencia.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/edicion/locales.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  13 passed (13)
```

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada:
- `npx tsc -b` no escribe nada.
- `npm run lint` solo imprime su cabecera (`> gestion-aldeas@0.0.0 lint` y `> oxlint`) y sale con código 0.
- `npm test` termina con **875 pruebas en 78 archivos**. La tarea 25 dejó 861 pruebas en 77 archivos, y esta trae **14 nuevas**: las 13 de `locales.test.ts` y **una más** en `pureza.test.ts`, que recorre también `edicion/locales.ts`.

```text
 Test Files  78 passed (78)
      Tests  875 passed (875)
```

Si el número que ves no es 875, sigue con **el tuyo**: lo que esta tarea garantiza es **+14 pruebas y +1 archivo** sobre lo que dejó la tarea 25.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/edicion/locales.ts src/dominio/edicion/locales.test.ts
git commit -m "feat(edicion): alta, estado desde mañana, producción del mes y borrado de locales y tipos" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` puede avisar `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-3 3edfa19] feat(edicion): alta, estado desde mañana, producción del mes y borrado de locales y tipos
 2 files changed, 398 insertions(+)
 create mode 100644 src/dominio/edicion/locales.test.ts
 create mode 100644 src/dominio/edicion/locales.ts
```

---

### Tarea 27 · Guardar avances y ediciones

Las tareas 22 y 23 a 26 son todas funciones puras: reciben un `DocumentoPartida` y devuelven otro, sin tocar IndexedDB. Esta tarea cierra la fase con la capa que sí escribe: `src/datos/avances.ts` y `src/datos/ediciones.ts`, dos módulos muy pequeños que solo calculan lo puro y se lo pasan a `guardarPartida` (de `src/datos/repositorio.ts`, de la fase 2), que ya abre la transacción de `db.partidas` y `db.resumenes`. Así se cumple la regla de `src/datos`: dentro de `db.transaction` solo va IndexedDB, y lo puro se calcula antes (`exportar.ts` l.16, `importar.ts` l.289).

`src/datos/avances.ts` trae dos funciones:

- **`guardarAvance`**: aplica el resultado de la vista previa con `aplicarAvance` (tarea 22) y guarda lo que salga con `guardarPartida`. Si la vista previa ya no corresponde a la partida (otro cambio de por medio), `aplicarAvance` lanza y no se guarda nada.
- **`deshacerAvanceGuardado`**: restaura el `snapshotPrevio` del último avance con `deshacerUltimoAvance` (tarea 22) y lo guarda. Si no hay avance que deshacer, `deshacerUltimoAvance` lanza «No hay ningún avance que deshacer» (D-039) y tampoco se guarda nada.

Ninguna de las dos pasa por `guardarEdicion`: `aplicarAvance` ya pone `cambiosDesdeUltimoAvance` a 0, y `deshacerUltimoAvance` ya restaura el contador de la copia. Contarlas ahí sumaría un cambio que no es del jugador.

`src/datos/ediciones.ts` trae una función:

- **`guardarEdicion`**: si `siguiente === anterior` (la misma referencia que devuelven las funciones de las tareas 23 a 26 cuando nada cambió), devuelve `anterior` sin escribir nada — ni el documento ni el resumen de P0 se mueven, y «última modificación» no avanza sola (regla pendiente 1 de la fase 2). Si cambió algo, le suma 1 al contador con `contarCambio` (tarea 23) y lo guarda. Un guardado cuenta **un** cambio, toque los registros que toque: una transferencia mueve tres registros y solo suma 1 (D-038).

Depende de la tarea 22 (`aplicarAvance`, `deshacerUltimoAvance` y `cambiosQueSePerderan`, de `src/dominio/avance/`) y de la tarea 23 (`contarCambio` y el tipo `Sello`, de `src/dominio/edicion/registros.ts`). `guardarPartida`, `crearPartida`, `leerPartida`, `listarPartidas`, `sembrarCatalogo`, `exportarCopia`, `importarCopia`, `analizarCopia` y `baseDePrueba` ya existen, de la fase 2.

`src/datos` no es `src/dominio`: **`pureza.test.ts` no crece con esta tarea** (a diferencia de las tareas 23 a 26, que sí añadían módulos a `src/dominio/edicion/`).

**Reglas de la especificación que implementa:**

- **P0, «última sesión» (§6.1, l.250).** «Partidas guardadas (nombre, fecha en juego, dominios, última sesión)…». El resumen (`ResumenPartida`) lleva `actualizada`, que `guardarPartida` pone a `ahora` en cada guardado, y `abiertaEl`, que `guardarAvance` y `guardarEdicion` conservan porque no abren una sesión nueva.
- **Deshacer avance (§9, l.1325-1330).** «Solo el último, y siempre se puede [D-039 lo matiza]. Restaura `snapshotPrevio` (la partida completa) y descarta lo registrado, editado o eliminado después.»
- **D-038.** «“Se perderán N cambios” cuenta cada vez que guardas algo que cambia la partida: una transferencia cuenta 1 aunque toque tres registros, y un interruptor de J5, también 1. Guardar sin cambiar nada no cuenta.»
- **D-039.** «Después de deshacer un avance ya no se puede deshacer el anterior.» (Solo se guarda la copia del último avance, D-008.)
- **Regla de `src/datos` (avisos del contrato, n.º 24).** «Dentro de `db.transaction` solo va IndexedDB: lo puro se calcula antes. `guardarPartida` ya lo cumple.» `guardarAvance`, `deshacerAvanceGuardado` y `guardarEdicion` calculan `aplicarAvance`, `deshacerUltimoAvance` y `contarCambio` **antes** de llamar a `guardarPartida`, que es la única que abre la transacción.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/datos/avances.ts`
- Crear: `src/datos/ediciones.ts`
- Prueba: `src/datos/avances.test.ts` (5 pruebas)
- Prueba: `src/datos/ediciones.test.ts` (4 pruebas)

- [ ] **Paso 1: Escribir la prueba de `avances.ts`, que falla**

Qué comprueba cada bloque, todo con `baseDePrueba()` (IndexedDB en memoria) y la partida de ejemplo guardada primero con `crearPartida`, como hace P1:
- `guardarAvance`: la vista previa de P4 (`simular(estadoDe(documento), 7, …)`, del contrato apartado 4.1) aplicada y guardada — fecha nueva, contador a 0, `actualizada = ahora`, cinco avances y el quinto con su `snapshotPrevio`; el resumen de P0 con la fecha nueva y la misma `abiertaEl`; una segunda vista previa sobre la partida ya avanzada lanza «La partida cambió después de la vista previa: vuelve a calcularla» y no toca lo guardado.
- `deshacerAvanceGuardado`: sobre la partida recién avanzada, restaura el estado del 12 de abril con cuatro avances, lo guarda y ya no se puede deshacer otra vez (D-039).
- La partida avanzada exportada e importada en «otra tablet» da las mismas cifras (saldos, movimientos, avances) y su `snapshotPrevio` conserva el 12 de abril.

Crea `src/datos/avances.test.ts` con este contenido:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { analizarCopia } from '../dominio/copia/analizar'
import { saldosPorDominio } from '../dominio/dinero/saldo'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../dominio/ejemplo/sombraDelEste'
import type { Id, Instante } from '../dominio/modelo/comunes'
import { estadoDe, type DocumentoPartida } from '../dominio/modelo/documento'
import { idsEnSerie } from '../dominio/motor/ids'
import { simular } from '../dominio/motor/simular'
import type { ResultadoSimulacion } from '../dominio/motor/tipos'
import { deshacerAvanceGuardado, guardarAvance } from './avances'
import type { BaseDeDatos } from './baseDeDatos'
import { sembrarCatalogo } from './catalogos'
import { exportarCopia } from './copia/exportar'
import { importarCopia } from './copia/importar'
import { baseDePrueba } from './pruebas/baseDePrueba'
import { crearPartida, leerPartida, listarPartidas } from './repositorio'

/** Instantes fijos y en orden, todos posteriores al último avance del ejemplo: ninguna prueba depende del reloj. */
const SESION: Instante = '2026-09-18T09:00:00.000Z'
const AVANCE_GUARDADO: Instante = '2026-09-18T10:00:00.000Z'
const DESHECHO: Instante = '2026-09-18T11:00:00.000Z'
const MAS_TARDE: Instante = '2026-09-18T12:00:00.000Z'

/** La partida de ejemplo y las fechas del avance de P4. */
const PARTIDA: Id = 'p.sombra-del-este'
const DOCE_DE_ABRIL = { anio: 1640, mes: 4, dia: 12 }
const DIECINUEVE_DE_ABRIL = { anio: 1640, mes: 4, dia: 19 }

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

/** La vista previa de P4: simular sin guardar, con ids en serie y el catálogo del ejemplo (T1). */
function vistaPrevia(documento: DocumentoPartida, dias: number): ResultadoSimulacion {
  return simular(estadoDe(documento), dias, {
    avanceId: 'av.prueba',
    nuevoId: idsEnSerie('sim'),
    catalogo: catalogosDeEjemplo(),
  })
}

/** Guarda la partida de ejemplo, como hace P1 al crearla, y la devuelve. */
async function guardarEjemplo(): Promise<DocumentoPartida> {
  const documento = documentoDeEjemplo()
  await crearPartida(db, documento, SESION)
  return documento
}

describe('guardarAvance', () => {
  it('guarda el documento aplicado: fecha nueva, contador a 0, actualizada = ahora y cinco avances (§9)', async () => {
    const documento = await guardarEjemplo()
    const guardado = await guardarAvance(db, documento, vistaPrevia(documento, 7), AVANCE_GUARDADO)
    expect(guardado.partida.fechaActual).toEqual(DIECINUEVE_DE_ABRIL)
    expect(guardado.partida.actualizada).toBe(AVANCE_GUARDADO)
    expect(guardado.partida.cambiosDesdeUltimoAvance).toBe(0)
    expect(guardado.avances.map((a) => a.id)).toEqual([...documento.avances.map((a) => a.id), 'av.prueba'])
    expect(guardado.avances[4].snapshotPrevio).toEqual(estadoDe(documento))
    expect(guardado.avances[3]).not.toHaveProperty('snapshotPrevio')
    expect(await leerPartida(db, PARTIDA)).toEqual(guardado)
  })

  it('el resumen de P0 pasa a la fecha nueva y conserva la sesión', async () => {
    const documento = await guardarEjemplo()
    await guardarAvance(db, documento, vistaPrevia(documento, 7), AVANCE_GUARDADO)
    const [fila] = await listarPartidas(db)
    expect(fila.fechaActual).toEqual(DIECINUEVE_DE_ABRIL)
    expect(fila.actualizada).toBe(AVANCE_GUARDADO)
    expect(fila.abiertaEl).toBe(SESION)
    expect(fila.hayAvances).toBe(true)
  })

  it('una vista previa que ya no corresponde a la partida no se guarda', async () => {
    const documento = await guardarEjemplo()
    const resultado = vistaPrevia(documento, 7)
    const avanzado = await guardarAvance(db, documento, resultado, AVANCE_GUARDADO)
    await expect(guardarAvance(db, avanzado, resultado, MAS_TARDE)).rejects.toThrow(
      'La partida cambió después de la vista previa: vuelve a calcularla',
    )
    expect((await leerPartida(db, PARTIDA))?.partida.actualizada).toBe(AVANCE_GUARDADO)
  })
})

describe('deshacerAvanceGuardado', () => {
  it('restaura el estado del 12 de abril con cuatro avances, y ya no se puede deshacer otro (§9; D-039)', async () => {
    const documento = await guardarEjemplo()
    const avanzado = await guardarAvance(db, documento, vistaPrevia(documento, 7), AVANCE_GUARDADO)
    const deshecho = await deshacerAvanceGuardado(db, avanzado, DESHECHO)
    expect(estadoDe(deshecho)).toEqual({
      ...estadoDe(documento),
      partida: { ...documento.partida, actualizada: DESHECHO },
    })
    expect(deshecho.avances.map((a) => a.id)).toEqual(documento.avances.map((a) => a.id))
    expect(deshecho.avances[3]).not.toHaveProperty('snapshotPrevio')
    expect(await leerPartida(db, PARTIDA)).toEqual(deshecho)
    expect((await listarPartidas(db))[0].fechaActual).toEqual(DOCE_DE_ABRIL)
    await expect(deshacerAvanceGuardado(db, deshecho, MAS_TARDE)).rejects.toThrow('No hay ningún avance que deshacer')
  })
})

describe('la partida avanzada viaja en una copia', () => {
  it('se exporta, pasa la validación y se importa en otra tablet con las mismas cifras (§6.1)', async () => {
    await sembrarCatalogo(db)
    const documento = await guardarEjemplo()
    const avanzado = await guardarAvance(db, documento, vistaPrevia(documento, 19), AVANCE_GUARDADO)
    const archivo = await exportarCopia(db, PARTIDA, DESHECHO)
    const analisis = analizarCopia(archivo.texto)
    if (!analisis.ok) {
      throw new Error(`${analisis.mensaje}\n${analisis.detalle ?? ''}`)
    }
    const otra = baseDePrueba('gestion-aldeas-otra-tablet')
    try {
      await sembrarCatalogo(otra)
      await importarCopia(otra, analisis.copia, { modo: 'nueva', ahora: MAS_TARDE, nuevoId: idsEnSerie('imp') })
      const importada = await leerPartida(otra, PARTIDA)
      if (importada === undefined) {
        throw new Error(`No hay ninguna partida con el id «${PARTIDA}»`)
      }
      // La copia ordena cada colección por su id (decisión propia 28): se comparan las cifras, no el orden.
      expect(importada.partida.fechaActual).toEqual({ anio: 1640, mes: 5, dia: 1 })
      expect(saldosPorDominio(importada)).toEqual(saldosPorDominio(avanzado))
      expect(importada.movimientos).toHaveLength(avanzado.movimientos.length)
      expect(importada.avances.map((a) => a.id)).toEqual(avanzado.avances.map((a) => a.id))
      expect(importada.avances[4].snapshotPrevio?.partida.fechaActual).toEqual(DOCE_DE_ABRIL)
    } finally {
      otra.close()
    }
  })
})
```

- El resultado de P4 sobre 19 días llega hasta el 1 de mayo, así que la prueba de la copia reutiliza el mismo cálculo del cobro de locales que el apartado 4.1 del contrato («Locales del 1 de mayo»).
- `analizarCopia` puede fallar por un motivo ajeno a esta tarea (una regresión en `exportarCopia`, de la fase 2): si `analisis.ok` es `false`, la prueba lanza con su mensaje en vez de seguir con `analisis.copia` sin comprobar, que daría un error de tipos.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/datos/avances.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./avances`, que todavía no existe. La hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/datos/avances.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/datos/avances.test.ts [ src/datos/avances.test.ts ]
Error: Cannot find module './avances' imported from C:/Proyectos/GA/gestion_aldeas/src/datos/avances.test.ts
 ❯ src/datos/avances.test.ts:10:1
      8| import { simular } from '../dominio/motor/simular'
      9| import type { ResultadoSimulacion } from '../dominio/motor/tipos'
     10| import { deshacerAvanceGuardado, guardarAvance } from './avances'
       | ^
     11| import type { BaseDeDatos } from './baseDeDatos'
     12| import { sembrarCatalogo } from './catalogos'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Implementar `avances.ts`**

Crea `src/datos/avances.ts` con este contenido:

```ts
import { aplicarAvance } from '../dominio/avance/aplicar'
import { deshacerUltimoAvance } from '../dominio/avance/deshacer'
import type { Instante } from '../dominio/modelo/comunes'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import type { ResultadoSimulacion } from '../dominio/motor/tipos'
import type { BaseDeDatos } from './baseDeDatos'
import { guardarPartida } from './repositorio'

/**
 * Guarda el avance de la vista previa: aplicarAvance y guardarPartida, que ya escribe documento y resumen en una
 * transacción (§9). Lo puro se calcula antes, fuera de la transacción; si la vista previa ya no vale, lanza y no
 * escribe nada. No pasa por guardarEdicion: aplicar pone el contador a 0 (D-038).
 */
export async function guardarAvance(
  db: BaseDeDatos,
  documento: DocumentoPartida,
  resultado: ResultadoSimulacion,
  ahora: Instante,
): Promise<DocumentoPartida> {
  const aplicado = aplicarAvance(documento, resultado, ahora)
  return guardarPartida(db, aplicado, ahora)
}

/**
 * Deshace el último avance y lo guarda (§9 l.1325-1330). El contador vuelve al de la copia, así que tampoco pasa
 * por guardarEdicion.
 */
export async function deshacerAvanceGuardado(
  db: BaseDeDatos,
  documento: DocumentoPartida,
  ahora: Instante,
): Promise<DocumentoPartida> {
  const deshecho = deshacerUltimoAvance(documento)
  return guardarPartida(db, deshecho, ahora)
}
```

- `aplicarAvance` y `deshacerUltimoAvance` son puros y ya lanzan sus propios errores («La partida cambió después de la vista previa: vuelve a calcularla» y «No hay ningún avance que deshacer»); estas dos funciones solo encadenan ese cálculo con `guardarPartida`, sin `try/catch`: si lanzan, no llegan a llamarla y no se escribe nada.
- Ninguna de las dos toca `db.transaction` directamente: la única transacción es la de `guardarPartida`.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/datos/avances.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  5 passed (5)
```

- [ ] **Paso 5: Escribir la prueba de `ediciones.ts`, que falla**

Qué comprueba cada bloque, todo con `baseDePrueba()` y la partida de ejemplo guardada primero:
- Guardar sin cambiar nada (`cambiarActivo` sobre una regla ya activa, que devuelve el mismo estado) no escribe: ni `actualizada` del documento ni la fila de P0 se mueven.
- Un cambio (pausar la posada) guarda con `actualizada = ahora` y `cambiosDesdeUltimoAvance = 1`.
- Una transferencia (tres registros) y una edición después cuentan **un** cambio cada una: 1 y luego 2, no 3 y luego 4 (D-038).
- Editar, guardar, avanzar (que pone el contador a 0), editar y guardar otra vez, y deshacer: el contador vuelve al de antes del avance y el movimiento editado antes del avance sigue con su cambio.

Crea `src/datos/ediciones.test.ts` con este contenido:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cambiosQueSePerderan } from '../dominio/avance/deshacer'
import { cambiarActivo } from '../dominio/edicion/reglas'
import { editarMovimiento, eliminarMovimiento } from '../dominio/edicion/movimientos'
import type { Sello } from '../dominio/edicion/registros'
import { crearTransferencia } from '../dominio/edicion/transferencias'
import { DOM, MOV_THARAN, RECURRENTE } from '../dominio/ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../dominio/ejemplo/sombraDelEste'
import type { Id, Instante } from '../dominio/modelo/comunes'
import { estadoDe, type DocumentoPartida } from '../dominio/modelo/documento'
import { idsEnSerie } from '../dominio/motor/ids'
import { simular } from '../dominio/motor/simular'
import { deshacerAvanceGuardado, guardarAvance } from './avances'
import type { BaseDeDatos } from './baseDeDatos'
import { guardarEdicion } from './ediciones'
import { baseDePrueba } from './pruebas/baseDePrueba'
import { crearPartida, leerPartida, listarPartidas } from './repositorio'

/** Instantes fijos y en orden: ninguna prueba depende del reloj. */
const SESION: Instante = '2026-09-18T09:00:00.000Z'
const PRIMERA: Instante = '2026-09-18T10:00:00.000Z'
const SEGUNDA: Instante = '2026-09-18T11:00:00.000Z'
const TERCERA: Instante = '2026-09-18T12:00:00.000Z'
const CUARTA: Instante = '2026-09-18T13:00:00.000Z'

/** La partida de ejemplo, que se guardó por última vez el 8 de septiembre. */
const PARTIDA: Id = 'p.sombra-del-este'
const ACTUALIZADA_DEL_EJEMPLO: Instante = '2026-09-08T19:45:00.000Z'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

/** El sello de una edición hecha en ese instante. */
function sello(ahora: Instante): Sello {
  return { ahora, nuevoId: idsEnSerie('nuevo') }
}

/** Guarda la partida de ejemplo, como hace P1 al crearla, y la devuelve. */
async function guardarEjemplo(): Promise<DocumentoPartida> {
  const documento = documentoDeEjemplo()
  await crearPartida(db, documento, SESION)
  return documento
}

describe('guardarEdicion', () => {
  it('si nada cambió no escribe: ni actualizada ni la fila de P0 se mueven (regla pendiente 1)', async () => {
    const documento = await guardarEjemplo()
    const siguiente = cambiarActivo(documento, RECURRENTE.posada, true, sello(PRIMERA))
    expect(siguiente).toBe(documento)
    expect(await guardarEdicion(db, documento, siguiente, PRIMERA)).toBe(documento)
    expect((await leerPartida(db, PARTIDA))?.partida.actualizada).toBe(ACTUALIZADA_DEL_EJEMPLO)
    expect((await listarPartidas(db))[0].actualizada).toBe(ACTUALIZADA_DEL_EJEMPLO)
  })

  it('con un cambio guarda el documento con actualizada = ahora y suma 1 al contador (D-038)', async () => {
    const documento = await guardarEjemplo()
    const siguiente = cambiarActivo(documento, RECURRENTE.posada, false, sello(PRIMERA))
    const guardado = await guardarEdicion(db, documento, siguiente, PRIMERA)
    expect(guardado.partida.cambiosDesdeUltimoAvance).toBe(1)
    expect(guardado.partida.actualizada).toBe(PRIMERA)
    expect(guardado.recurrentes[0].activo).toBe(false)
    expect(await leerPartida(db, PARTIDA)).toEqual(guardado)
    expect((await listarPartidas(db))[0].actualizada).toBe(PRIMERA)
  })

  it('una transferencia cuenta un cambio aunque toque tres registros, y cada guardado suma uno (D-038)', async () => {
    const documento = await guardarEjemplo()
    const { estado } = crearTransferencia(
      documento,
      {
        saleDeId: DOM.tharan,
        entraEnId: DOM.bree,
        importe: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
        fecha: { anio: 1640, mes: 4, dia: 12 },
      },
      sello(PRIMERA),
    )
    const primero = await guardarEdicion(db, documento, estado, PRIMERA)
    expect(primero.partida.cambiosDesdeUltimoAvance).toBe(1)
    const editado = editarMovimiento(primero, MOV_THARAN.recompensa, { concepto: 'Recompensa del alcalde' }, sello(SEGUNDA))
    const segundo = await guardarEdicion(db, primero, editado, SEGUNDA)
    expect(segundo.partida.cambiosDesdeUltimoAvance).toBe(2)
    expect((await leerPartida(db, PARTIDA))?.partida.cambiosDesdeUltimoAvance).toBe(2)
  })

  it('un avance pone el contador a 0 y deshacerlo pierde lo editado después (§9, «Deshacer avance»)', async () => {
    const documento = await guardarEjemplo()
    const antes = editarMovimiento(documento, MOV_THARAN.athelas, { concepto: 'Compra de athelas (tres)' }, sello(PRIMERA))
    const editado = await guardarEdicion(db, documento, antes, PRIMERA)
    const resultado = simular(estadoDe(editado), 7, {
      avanceId: 'av.prueba',
      nuevoId: idsEnSerie('sim'),
      catalogo: catalogosDeEjemplo(),
    })
    const avanzado = await guardarAvance(db, editado, resultado, SEGUNDA)
    expect(avanzado.partida.cambiosDesdeUltimoAvance).toBe(0)

    const conCambio = await guardarEdicion(db, avanzado, eliminarMovimiento(avanzado, MOV_THARAN.recompensa), TERCERA)
    expect(cambiosQueSePerderan(conCambio)).toBe(1)

    const deshecho = await deshacerAvanceGuardado(db, conCambio, CUARTA)
    expect(deshecho.partida.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 12 })
    expect(deshecho.partida.cambiosDesdeUltimoAvance).toBe(1)
    expect(deshecho.movimientos.find((m) => m.id === MOV_THARAN.athelas)?.concepto).toBe('Compra de athelas (tres)')
    expect(deshecho.movimientos.some((m) => m.id === MOV_THARAN.recompensa)).toBe(true)
  })
})
```

- `ACTUALIZADA_DEL_EJEMPLO` es `partida.actualizada` tal como la deja `documentoDeEjemplo()`: la primera prueba comprueba que **no** cambia.
- La última prueba encadena una edición, un guardado, un avance y otro guardado antes de deshacer, para comprobar que `deshacerAvanceGuardado` (tarea, paso 3) devuelve el contador de la copia (1, el de la edición del athelas) y no el que había justo antes de deshacer.

- [ ] **Paso 6: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/datos/ediciones.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./ediciones`, que todavía no existe (`./avances` ya existe, del paso 3). La hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/datos/ediciones.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/datos/ediciones.test.ts [ src/datos/ediciones.test.ts ]
Error: Cannot find module './ediciones' imported from C:/Proyectos/GA/gestion_aldeas/src/datos/ediciones.test.ts
 ❯ src/datos/ediciones.test.ts:15:1
     13| import { deshacerAvanceGuardado, guardarAvance } from './avances'
     14| import type { BaseDeDatos } from './baseDeDatos'
     15| import { guardarEdicion } from './ediciones'
       | ^
     16| import { baseDePrueba } from './pruebas/baseDePrueba'
     17| import { crearPartida, leerPartida, listarPartidas } from './repositor…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 7: Implementar `ediciones.ts`**

Crea `src/datos/ediciones.ts` con este contenido:

```ts
import { contarCambio } from '../dominio/edicion/registros'
import type { Instante } from '../dominio/modelo/comunes'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import type { BaseDeDatos } from './baseDeDatos'
import { guardarPartida } from './repositorio'

/**
 * Guarda una edición solo si cambió algo (siguiente !== anterior) y la cuenta con contarCambio (regla pendiente 1;
 * D-038). Las funciones de edición devuelven la misma referencia cuando nada cambia, así que «Guardar» sin tocar
 * nada no mueve «última modificación». Un guardado cuenta 1, toque los registros que toque.
 */
export async function guardarEdicion(
  db: BaseDeDatos,
  anterior: DocumentoPartida,
  siguiente: DocumentoPartida,
  ahora: Instante,
): Promise<DocumentoPartida> {
  if (siguiente === anterior) {
    return anterior
  }
  return guardarPartida(db, contarCambio(siguiente), ahora)
}
```

- `siguiente === anterior` es la misma comprobación por referencia que usan `reemplazarPorId` y las funciones de las tareas 23 a 26: no hace falta comparar a fondo otra vez, porque ya la hicieron ellas.
- `contarCambio` se aplica **antes** de `guardarPartida`, así que el documento que se guarda ya lleva el contador sumado, y es el mismo que se devuelve.

- [ ] **Paso 8: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/datos/ediciones.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  4 passed (4)
```

- [ ] **Paso 9: Comprobar los tipos, todas las pruebas y el lint**

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada:
- `npx tsc -b` no escribe nada.
- `npm run lint` solo imprime su cabecera (`> gestion-aldeas@0.0.0 lint` y `> oxlint`) y sale con código 0.
- `npm test` termina con **884 pruebas en 80 archivos**. La tarea 26 dejó 875 pruebas en 78 archivos, y esta trae **9 nuevas**: las 5 de `avances.test.ts` y las 4 de `ediciones.test.ts`. A diferencia de las tareas 23 a 26, `pureza.test.ts` no suma ninguna, porque `src/datos` no es `src/dominio`.

```text
 Test Files  80 passed (80)
      Tests  884 passed (884)
```

Si el número que ves no es 884, sigue con **el tuyo**: lo que esta tarea garantiza es **+9 pruebas y +2 archivos** sobre lo que dejó la tarea 26.

- [ ] **Paso 10: Commit**

```bash
git add src/datos/avances.ts src/datos/avances.test.ts src/datos/ediciones.ts src/datos/ediciones.test.ts
git commit -m "feat(datos): guardar y deshacer avances, y guardar una edición solo si cambió algo" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, `git add` puede avisar `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
[implementacion/fase-3 3bd73da] feat(datos): guardar y deshacer avances, y guardar una edición solo si cambió algo
 4 files changed, 305 insertions(+)
 create mode 100644 src/datos/avances.test.ts
 create mode 100644 src/datos/avances.ts
 create mode 100644 src/datos/ediciones.test.ts
 create mode 100644 src/datos/ediciones.ts
```

Con esto, las tareas 23 a 27 quedan cerradas y `implementacion/fase-3` tiene **884 pruebas en 80 archivos**. La tarea 28 (entregable de la fase) y la 29 (cierre) parten de este número.

---

### Tarea 28 · Entregable de la fase 3

La hoja de ruta pide para la fase 3 un entregable concreto: «pruebas que reproducen la vista previa P4 del ejemplo: Tharan +0,66 mo, Bree +39,9 mo, Archet −60 mo y 8 movimientos. También el balance de Bree (−11,5 mo), el resultado fiscal (+19 mo) y el cobro de locales del 1 de mayo (+4,5 mo)». Las tareas 2 a 27 han escrito cada pieza del motor y la han probado por separado, casi siempre con partidas mínimas; esta las junta en un solo archivo que pasa **«La Sombra del Este» entera** por la API pública, como hará la vista previa de la fase 6: `simular` → `aplicarAvance` → `deshacerUltimoAvance`, más `balanceMensual` y `avisosEn`.

El archivo recoge el apartado 4.1 del contrato de la fase, con las cifras en mh:

- **P4** (7 días, del 12 al 19 de abril): los 8 movimientos por contenido, los tres saldos, las filas de `cambios` con sus dos hechos, el único aviso (Archet) y ninguna persona nueva; la caravana de Fornost terminada y los locales todavía cobrados hasta marzo.
- **Regresión del avance del 10 al 12**, desde `SNAPSHOT_10_ABRIL`: los tres movimientos y las tres filas de saldo que ya guarda el ejemplo.
- **Balance mensual y resultado fiscal** de Bree y de Archet, iguales el 12 y el 19.
- **Locales del 1 de mayo** (19 días): +450.000 con la tienda anotada, +470.000 sin la anotación, y los saldos de ese día.
- **Impago natural de Archet** a 98 días (el tributo del 19 de julio pagado a medias) y a 105 días (los albañiles del 26 de julio, con la persona nueva «Trabajadores de Archet»).
- **Un año entero** (366 días): los saldos, los nueve cargos de impago de Archet y los saldos mínimos **día a día**.
- **Invariantes** con 1, 7, 19, 98 y 366 días: las filas de saldo cuadran con las cajas, ninguna caja acaba por debajo de `mín(0, antes)`, la entrada congelada no cambia, la partida aplicada pasa `EsquemaDocumentoPartida` y `validarCopia`, y deshacer devuelve la partida del 12 de abril.

Depende de la tarea 9 (`balanceMensual`), de la 21 (`simular`) y de la 22 (`aplicarAvance`, `deshacerUltimoAvance` y `puedeDeshacer`), y usa además `sumarAlMes` (tarea 4), `estadoDe` (tarea 5), `idsEnSerie` y `congelar` (tarea 10), `recorrerDias` (tarea 19) y `avisosEn` (tarea 20).

**Esta tarea no escribe código de la app, solo pruebas**, así que no tiene el paso rojo de «la prueba falla porque falta implementar»: todo lo que ejercita ya existe y está en verde. El paso 2 comprueba que el archivo todavía no existe (Vitest contesta «No test files found») y el paso 4 trae una tabla que dice, para cada fallo posible, a qué tarea volver. Si el archivo pasa a la primera, el entregable está cumplido.

Cuatro avisos del contrato (apartado 5) que este archivo respeta y que no hay que «arreglar» al copiarlo:

- **Se compara por contenido, no por posición ni por id** (aviso 11). Los ids salen de `idsEnSerie` y el orden de los movimientos dentro de un día no es una regla del juego (técnica 10), así que la prueba quita el `id` y ordena por fecha, dominio y concepto antes de comparar.
- **No se comprueban las deudas normales** después de sus vencimientos (Hobart el 20/4, el Gremio el 1/5…): el paso 10 es de la fase 5 y siguen «abiertas» sin devengos (aviso 12). La prueba solo mira las deudas **de impago**, que son las que crea el motor.
- **No se compara con `AVANCES[3].avisos` ni con los hechos de los avances del ejemplo** (aviso 13, técnica 24). En la fase 3, P4 solo lleva el aviso de Archet: el de Hobart llega en la fase 5 y el de los víveres en la 4.
- **Cada simulación estrena sus ids** (aviso 9) y `SNAPSHOT_10_ABRIL` se congela **en una copia**, nunca la constante compartida (aviso 5).

**Reglas de la especificación que implementa:**

- **Entregable de la fase 3 (hoja de ruta, l.66).** «Pruebas que reproducen la vista previa P4 del ejemplo: Tharan +0,66 mo, Bree +39,9 mo, Archet −60 mo y 8 movimientos. También el balance de Bree (−11,5 mo), el resultado fiscal (+19 mo) y el cobro de locales del 1 de mayo (+4,5 mo).» En mh: +66.000, +3.990.000, −6.000.000, −1.147.143, +1.895.714 y +450.000.
- **El motor es una función pura (§9, l.1271).** «`simular(estado, días) → { estadoNuevo, cambios[], avisos[] }`. La vista previa (P4) la llama sin guardar; al confirmar se guarda `estadoNuevo` y se crea un `Avance` con la fecha en que se aplica y una copia de la partida completa.» Por eso la prueba congela la entrada y comprueba que no cambia.
- **Agrupación de movimientos (§9, l.1284-1290).** «Los conceptos diarios forman un movimiento por concepto y avance, fechado el último día («Posada · 7 noches −0,7 mo»)» y «Los salarios que se pagan el mismo día en un asentamiento se agrupan en uno («Salarios de 14 trabajadores»)».
- **Impagos (§9, l.1291-1296).** «Queda como impago solo lo que no se paga, con aviso rojo»; «El motor nunca deja una caja en negativo»; «Hay una deuda de impago por origen, sin interés ni vencimiento, que acumula los impagos sucesivos mientras esté abierta».
- **Balance mensual y resultado fiscal (§7, l.1057-1062).** «Bree: entran 44 · salen 55,4 → −11,5 mo (…; en mh, 4.395.714 − 5.542.857 = −1.147.143, es decir −11,47143 mo)» y «Resultado fiscal: +19 mo al mes (ingresos menos tributos, sin salarios ni guarnición).»
- **Impuestos de locales del ejemplo (§9, l.1373).** «El 1 de mayo se cobran **+4,5 mo** por abril, con la producción anotada de la Tienda de telas (1,5 mo, paga el mínimo de 0,1 mo). Con la producción habitual serían +4,7 mo.»
- **Avisos del ejemplo (§9, l.1354).** «En P4, P5 e Inicio del 19: […] Archet en ámbar («La caja de Archet no cubre el tributo de 60 mo del 19 de julio»).»
- **Deshacer avance (§9, l.1325-1327).** «Restaura `snapshotPrevio` (la partida completa)». Tras deshacer ya no se puede deshacer el anterior (D-039).
- **Decisiones que fija esta prueba:** D-019 (beneficios, eventos y vuelta de ventas en la fase 3), D-020 (pago a medias por filas), D-024 y D-025 (textos de los avisos), D-032 (hechos), técnica 2 (un solo redondeo en el balance), técnica 8 (lo introducido) y técnica 12 (`estadoDe`, nunca `{ ...documento }`).

**Archivos:**
- Crear: `src/dominio/motor/entregable.test.ts`
- Prueba: el archivo que crea **es** la prueba de esta tarea; no hay código de la app que probar

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas` o el clon donde se ejecute el plan).

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
git status --short
npm test
```

Salida esperada: `git status --short` no escribe nada (la tarea 27 terminó con su commit) y `npm test` termina con las **884 pruebas en 80 archivos** que deja la tarea 27 (la hora y la duración varían; debajo puede salir una nota de Vitest sobre «Transform», que es inofensiva):

```text
 Test Files  80 passed (80)
      Tests  884 passed (884)
```

Si el número que ves no es 884, sigue adelante con **el tuyo**: esta tarea añade **un archivo de prueba y 18 pruebas**, así que al terminar tienen que ser «tu número + 18» en «tus archivos + 1». Lo que sí tiene que estar en verde es todo: si alguna prueba falla, arréglala en su tarea antes de empezar esta.

- [ ] **Paso 2: Ver que el archivo todavía no existe**

```bash
npx vitest run src/dominio/motor/entregable.test.ts
```

Salida esperada, literal (sale con código 1; el orden de las líneas `filter`, `include` y `exclude` puede variar):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

No test files found, exiting with code 1

filter: src/dominio/motor/entregable.test.ts
include: src/**/*.test.ts
exclude:  **/node_modules/**, **/.git/**
```

Es la única forma de «rojo» que tiene esta tarea: no añade código de la app, así que sus pruebas nacen en verde. Lo que este paso confirma es la ruta (`src/dominio/motor/`, junto a `simular.ts`) y que `include: ['src/**/*.test.ts']` ya la recogerá sin tocar `vite.config.ts`.

- [ ] **Paso 3: Escribir la prueba del entregable**

Qué comprueba cada bloque (18 pruebas):

- **P4** (5 pruebas):
  - los 8 movimientos, campo a campo y sin el id: los salarios del 13 con sus 5 filas de detalle («Pastor» en singular); los aranceles del 15 con la feria (1.800.000, **sin** `introducido`); el beneficio de la Barcaza con su `inversionId` y «1,5 mo»; la vuelta de la caravana con su vínculo y «24 mo»; el tributo de Archet con «60 mo»; y los tres diarios del 19 («· 7 días», «· 7 noches»);
  - los saldos en mh y en oro, y las tres cifras de la hoja («+0,66 mo», «+39,9 mo», «−60 mo»);
  - `cambios` exacto: las tres filas de saldo en el orden de los dominios y los hechos «Caravana de Fornost de vuelta · 18» y «Tributo de Archet pagado · 19»;
  - el único aviso, el de Archet, sin personas nuevas; y el 12 de abril, `avisosEn` vacío;
  - la caravana de Fornost `terminada` con `movimientoVueltaId` = su cobro, la de Tharbad todavía `enRuta` (aviso 16) y los cuatro `cobradoHasta` en marzo.
- **Regresión del 10 al 12** (1 prueba): desde una copia congelada de `SNAPSHOT_10_ABRIL`, los movimientos «Posada … · 2 noches», «Establo del poni · 2 días» y «Peaje del camino · 2 días» son los del ejemplo (salvo `id` y `avanceId`), y las filas de saldo, las de `AVANCES[3]`.
- **Balance** (2 pruebas): Bree con sus cinco cifras y sus textos («+44 mo», «55,4 mo», «−11,5 mo», «+19 mo», «−25 mo»), con el contraejemplo de la técnica 2 (fila a fila, las soldadas darían 1.242.856); Archet «−14,6 mo», y los dos balances iguales el 12 y el 19.
- **Locales del 1 de mayo** (2 pruebas): el movimiento completo con sus 4 entradas de detalle y «4,5 mo», los `cobradoHasta` en abril; los saldos de ese día con 18 movimientos (4 + 12 + 2) y, sin la anotación de la tienda, 470.000.
- **Impago natural** (3 pruebas): a 98 días, el tributo del 19 de julio pagado a medias (−4.120.000, sin `introducido`), la deuda de impago con la Corona (los campos de la técnica 25) y sin persona nueva; los tres avisos en su orden; a 105 días, «Trabajadores de Archet» y su deuda de salarios.
- **Un año** (2 pruebas): los saldos del 13 de abril de 1641 y los 9 cargos en 2 deudas; y el recorrido **día a día** con `recorrerDias`, un día cada vez, que da los saldos mínimos (Tharan 4.585.800, Bree 21.890.000, Archet 0) y llega a las mismas cajas que un solo avance de 366 días.
- **Invariantes** (3 pruebas, cada una con 1, 7, 19, 98 y 366 días): cuadre de las filas de saldo con `recorrerDias` y con `saldosPorDominio`; entrada congelada intacta tras `simular` y `aplicarAvance`; esquema, `validarCopia`, copia del último avance y deshacer.

Crea `src/dominio/motor/entregable.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { aplicarAvance } from '../avance/aplicar'
import { deshacerUltimoAvance, puedeDeshacer } from '../avance/deshacer'
import { avisosEn } from '../avisos/avisos'
import { sumarDias, type Fecha } from '../calendario/fecha'
import { CATEGORIA } from '../catalogo/inicial'
import { balanceMensual } from '../dinero/balance'
import { formatearOro, formatearOroProrrateado } from '../dinero/formato'
import { alMes, sumarAlMes } from '../dinero/prorrateo'
import { saldosPorDominio } from '../dinero/saldo'
import { SNAPSHOT_10_ABRIL } from '../ejemplo/avances'
import {
  CARAVANA,
  DOM,
  IMPUESTO,
  INVERSION,
  LOCAL,
  MOV_BREE,
  MOV_THARAN,
  PERSONA,
  RECURRENTE,
  TRABAJADOR,
} from '../ejemplo/ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from '../ejemplo/sombraDelEste'
import type { Id, Instante } from '../modelo/comunes'
import type { Deuda } from '../modelo/deudas'
import { EsquemaDocumentoPartida, estadoDe, type EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { validarCopia } from '../validacion/coherencia'
import { recorrerDias } from './bucle'
import { idsEnSerie } from './ids'
import { congelar } from './pruebas/constructores'
import { simular } from './simular'
import type { OpcionesSimulacion, ResultadoSimulacion } from './tipos'

/** El id del avance de estas pruebas y la hora en que se aplica: posterior al último avance del ejemplo (aviso 23). */
const AVANCE_ID = 'av.entregable'
const AHORA: Instante = '2026-09-18T12:00:00.000Z'

/** Fechas de 1640 T.E. escritas cortas: F(19, 4) es el 19 de abril de 1640. */
function F(dia: number, mes: number, anio = 1640): Fecha {
  return { anio, mes, dia }
}

/** Opciones nuevas en cada llamada: ids en serie que no se comparten entre simulaciones (aviso 9). */
function opciones(prefijo = 'sim', avanceId: Id = AVANCE_ID): OpcionesSimulacion {
  return { avanceId, nuevoId: idsEnSerie(prefijo), catalogo: catalogosDeEjemplo() }
}

/** `simular` sobre una copia propia de «La Sombra del Este», tal como está el 12 de abril de 1640. */
function avanzarEjemplo(dias: number): ResultadoSimulacion {
  return simular(documentoDeEjemplo(), dias, opciones())
}

/** Los movimientos que creó o aplicó el avance de estas pruebas. */
function delAvance(resultado: ResultadoSimulacion): Movimiento[] {
  return resultado.estadoNuevo.movimientos.filter((m) => m.avanceId === resultado.avanceId)
}

/** El movimiento sin su id, que sale de `nuevoId` y no se compara (aviso 11). */
function sinId(movimiento: Movimiento): Omit<Movimiento, 'id'> {
  const copia: Partial<Movimiento> = { ...movimiento }
  delete copia.id
  return copia as Omit<Movimiento, 'id'>
}

/** Orden de comparación por contenido: fecha, dominio y concepto (aviso 11; técnica 10). */
function porContenido(a: Omit<Movimiento, 'id'>, b: Omit<Movimiento, 'id'>): number {
  const clave = (m: Omit<Movimiento, 'id'>): string =>
    `${m.fecha.anio}-${String(m.fecha.mes).padStart(2, '0')}-${String(m.fecha.dia).padStart(2, '0')}|${m.dominioId}|${m.concepto}`
  return clave(a).localeCompare(clave(b))
}

/** Las deudas de impago del estado, que son las que crea el motor. */
function deudasDeImpago(estado: EstadoPartida): Deuda[] {
  return estado.deudas.filter((d) => d.impago)
}

/** Los ocho movimientos de P4 (contrato, apartado 4.1; gen l.502-542), ya en el orden de `porContenido`. */
const MOVIMIENTOS_P4: Omit<Movimiento, 'id'>[] = [
  {
    dominioId: DOM.bree,
    fecha: F(13, 4),
    tipo: 'gasto',
    importe: { base: -420000 },
    categoriaId: CATEGORIA.salarios,
    concepto: 'Salarios de 14 trabajadores',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'salarios', id: DOM.bree },
    detalleTrabajo: [
      { origenId: TRABAJADOR.granjeros, nombre: 'Granjeros', numero: 6, importe: { base: 180000 } },
      { origenId: TRABAJADOR.lenadores, nombre: 'Leñadores', numero: 3, importe: { base: 90000 } },
      { origenId: TRABAJADOR.cerveceros, nombre: 'Cerveceros', numero: 2, importe: { base: 80000 } },
      { origenId: TRABAJADOR.canteros, nombre: 'Canteros', numero: 2, importe: { base: 60000 } },
      { origenId: TRABAJADOR.pastores, nombre: 'Pastor', numero: 1, importe: { base: 10000 } },
    ],
    programado: false,
  },
  {
    dominioId: DOM.bree,
    fecha: F(15, 4),
    tipo: 'ingreso',
    importe: { base: 1800000 },
    categoriaId: CATEGORIA.aranceles,
    concepto: 'Aranceles del mercado',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'impuesto', id: IMPUESTO.aranceles },
    programado: false,
  },
  {
    dominioId: DOM.tharan,
    fecha: F(15, 4),
    tipo: 'ingreso',
    importe: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
    categoriaId: CATEGORIA.beneficiosDeInversiones,
    concepto: 'Beneficio de Barcaza del Brandivino',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'beneficio', id: INVERSION.barcaza },
    inversionId: INVERSION.barcaza,
    programado: false,
  },
  {
    dominioId: DOM.bree,
    fecha: F(18, 4),
    tipo: 'ingreso',
    importe: { base: 2400000, introducido: { cantidad: '24', moneda: 'mo' } },
    categoriaId: CATEGORIA.comercio,
    concepto: 'Caravana: venta de cerveza en Fornost',
    origen: 'avance',
    avanceId: AVANCE_ID,
    vinculo: { tipo: 'caravana', id: CARAVANA.ventaCervezaFornost },
    programado: false,
  },
  {
    dominioId: DOM.archet,
    fecha: F(19, 4),
    tipo: 'gasto',
    importe: { base: -6000000, introducido: { cantidad: '60', moneda: 'mo' } },
    categoriaId: CATEGORIA.tributos,
    concepto: 'Tributo a la Corona',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'tributo', id: IMPUESTO.tributoArchet },
    programado: false,
  },
  {
    dominioId: DOM.bree,
    fecha: F(19, 4),
    tipo: 'ingreso',
    importe: { base: 210000 },
    categoriaId: CATEGORIA.impuestos,
    concepto: 'Peaje del camino · 7 días',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'impuesto', id: IMPUESTO.peaje },
    programado: false,
  },
  {
    dominioId: DOM.tharan,
    fecha: F(19, 4),
    tipo: 'gasto',
    importe: { base: -14000 },
    categoriaId: 'cat.montura',
    concepto: 'Establo del poni · 7 días',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'recurrente', id: RECURRENTE.establo },
    programado: false,
  },
  {
    dominioId: DOM.tharan,
    fecha: F(19, 4),
    tipo: 'gasto',
    importe: { base: -70000 },
    categoriaId: 'cat.alojamiento',
    concepto: 'Posada El Poney Pisador · 7 noches',
    origen: 'avance',
    avanceId: AVANCE_ID,
    regla: { tipo: 'recurrente', id: RECURRENTE.posada },
    programado: false,
  },
]

describe('P4: el avance del 12 al 19 de abril de 1640', () => {
  it('crea los ocho movimientos de la vista previa, con su fecha, su categoría, su concepto y su origen', () => {
    const resultado = avanzarEjemplo(7)

    const creados = delAvance(resultado).map(sinId).sort(porContenido)
    expect(creados).toEqual([...MOVIMIENTOS_P4].sort(porContenido))
  })

  it('deja la bolsa de Tharan en 47,178 mo, la caja de Bree en 380,5 mo y la de Archet en 25 mo', () => {
    const resultado = avanzarEjemplo(7)
    const eq = resultado.estadoNuevo.partida.equivalencias

    expect(resultado.desde).toEqual(F(12, 4))
    expect(resultado.hasta).toEqual(F(19, 4))
    expect(resultado.estadoNuevo.partida.fechaActual).toEqual(F(19, 4))
    const saldos = saldosPorDominio(resultado.estadoNuevo)
    expect(saldos).toEqual({ [DOM.tharan]: 4717800, [DOM.bree]: 38050000, [DOM.archet]: 2500000 })
    expect(formatearOro(saldos[DOM.tharan], eq)).toBe('47,178 mo')
    expect(formatearOro(saldos[DOM.bree], eq)).toBe('380,5 mo')
    expect(formatearOro(saldos[DOM.archet], eq)).toBe('25 mo')
    // Las tres cifras de la hoja de ruta (l.66): Tharan +0,66 mo, Bree +39,9 mo y Archet −60 mo.
    expect(formatearOro(saldos[DOM.tharan] - 4651800, eq, { signo: true })).toBe('+0,66 mo')
    expect(formatearOro(saldos[DOM.bree] - 34060000, eq, { signo: true })).toBe('+39,9 mo')
    expect(formatearOro(saldos[DOM.archet] - 8500000, eq, { signo: true })).toBe('−60 mo')
  })

  it('resume el avance con una fila de saldo por dominio y los dos hechos de P5', () => {
    const resultado = avanzarEjemplo(7)

    expect(resultado.cambios).toEqual([
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4651800, despues: 4717800, movimientos: 3 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 34060000, despues: 38050000, movimientos: 4 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 2500000, movimientos: 1 },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Caravana de Fornost de vuelta · 18' },
      { tipo: 'hecho', dominioId: DOM.archet, texto: 'Tributo de Archet pagado · 19' },
    ])
  })

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

  it('la caravana de Fornost queda terminada con su cobro y los locales siguen cobrados hasta marzo', () => {
    const resultado = avanzarEjemplo(7)

    const venta = resultado.estadoNuevo.caravanas.find((c) => c.id === CARAVANA.ventaCervezaFornost)
    const cobro = delAvance(resultado).find((m) => m.vinculo?.id === CARAVANA.ventaCervezaFornost)
    expect(venta?.estado).toBe('terminada')
    expect(cobro).toBeDefined()
    expect(venta?.movimientoVueltaId).toBe(cobro?.id)
    // La compra de Tharbad no es una venta: sigue en ruta hasta la fase 4 (aviso 16).
    expect(resultado.estadoNuevo.caravanas.find((c) => c.id === CARAVANA.compraViveresTharbad)?.estado).toBe('enRuta')
    expect(resultado.estadoNuevo.localesComerciales.map((l) => l.cobradoHasta)).toEqual([
      { anio: 1640, mes: 3 },
      { anio: 1640, mes: 3 },
      { anio: 1640, mes: 3 },
      { anio: 1640, mes: 3 },
    ])
  })
})

describe('regresión: el avance del 10 al 12 de abril, desde su copia', () => {
  it('reproduce los tres movimientos y las tres filas de saldo del último avance del ejemplo', () => {
    const ejemplo = documentoDeEjemplo()
    const copia = congelar(structuredClone(SNAPSHOT_10_ABRIL))

    const resultado = simular(copia, 2, opciones())

    const esperados = [MOV_THARAN.posada12Abril, MOV_THARAN.establo12Abril, MOV_BREE.peaje12Abril].map((id) => {
      const movimiento = ejemplo.movimientos.find((m) => m.id === id)
      if (movimiento === undefined) throw new Error(`No existe «${id}»`)
      return sinId({ ...movimiento, avanceId: AVANCE_ID })
    })
    expect(delAvance(resultado).map(sinId).sort(porContenido)).toEqual(esperados.sort(porContenido))
    expect(resultado.hasta).toEqual(F(12, 4))
    expect(resultado.cambios.filter((c) => c.tipo === 'saldo')).toEqual(
      ejemplo.avances[3].cambios.filter((c) => c.tipo === 'saldo'),
    )
  })
})

describe('balance mensual y resultado fiscal (§7)', () => {
  it('Bree: entran 44 mo, salen 55,4 mo, el balance es −11,5 mo y el resultado fiscal +19 mo', () => {
    const estado = estadoDe(documentoDeEjemplo())
    const eq = estado.partida.equivalencias

    const bree = balanceMensual(estado, DOM.bree)
    expect(bree).toEqual({
      entran: 4395714,
      salen: 5542857,
      tributos: 2500000,
      balance: -1147143,
      resultadoFiscal: 1895714,
    })
    expect(formatearOroProrrateado(bree.entran, eq, { signo: true })).toBe('+44 mo')
    expect(formatearOroProrrateado(bree.salen, eq)).toBe('55,4 mo')
    expect(formatearOroProrrateado(bree.balance, eq, { signo: true })).toBe('−11,5 mo')
    expect(formatearOroProrrateado(bree.resultadoFiscal, eq, { signo: true })).toBe('+19 mo')
    expect(formatearOroProrrateado(-bree.tributos, eq, { signo: true })).toBe('−25 mo')
    // Contraejemplo (técnica 2): fila a fila con alMes, las tres soldadas de Bree darían 1 mh menos.
    const soldadas = estado.unidadesGuarnicion
      .filter((u) => u.dominioId === DOM.bree)
      .map((u) => ({ base: u.numero * u.soldada.base, recurrencia: u.recurrencia }))
    expect(soldadas.reduce((suma, p) => suma + alMes(p.base, p.recurrencia), 0)).toBe(1242856)
    expect(sumarAlMes(soldadas)).toBe(1242857)
  })

  it('Archet: el balance es −14,6 mo, y los dos balances son iguales el 12 y el 19', () => {
    const estado = estadoDe(documentoDeEjemplo())
    const eq = estado.partida.equivalencias

    const archet = balanceMensual(estado, DOM.archet)
    expect(archet.entran).toBe(860000)
    expect(archet.salen).toBe(2320000)
    expect(archet.balance).toBe(-1460000)
    expect(formatearOroProrrateado(archet.balance, eq, { signo: true })).toBe('−14,6 mo')
    const dia19 = avanzarEjemplo(7).estadoNuevo
    expect(balanceMensual(dia19, DOM.bree)).toEqual(balanceMensual(estado, DOM.bree))
    expect(balanceMensual(dia19, DOM.archet)).toEqual(archet)
  })
})

describe('el cobro de los impuestos de locales del 1 de mayo', () => {
  it('cobra 4,5 mo con la producción anotada de la tienda y deja los cuatro locales cobrados hasta abril', () => {
    const resultado = avanzarEjemplo(19)

    const cobros = delAvance(resultado).filter((m) => m.regla?.tipo === 'locales')
    expect(cobros.map(sinId)).toEqual([
      {
        dominioId: DOM.bree,
        fecha: F(1, 5),
        tipo: 'ingreso',
        importe: { base: 450000 },
        categoriaId: CATEGORIA.impuestos,
        concepto: 'Impuestos de locales · abril (4)',
        origen: 'avance',
        avanceId: AVANCE_ID,
        regla: { tipo: 'locales', id: DOM.bree },
        detalleLocales: [
          {
            localId: LOCAL.herreria1,
            nombre: 'Herrería 1',
            mes: { anio: 1640, mes: 4 },
            produccion: { base: 1000000 },
            anotada: false,
            impuesto: { base: 100000 },
          },
          {
            localId: LOCAL.posada,
            nombre: 'Posada El Poney Pisador',
            mes: { anio: 1640, mes: 4 },
            produccion: { base: 4000000 },
            anotada: false,
            impuesto: { base: 320000 },
          },
          {
            localId: LOCAL.tiendaDeTelas,
            nombre: 'Tienda de telas',
            mes: { anio: 1640, mes: 4 },
            produccion: { base: 150000 },
            anotada: true,
            impuesto: { base: 10000 },
          },
          {
            localId: LOCAL.ultramarinos,
            nombre: 'Ultramarinos del camino',
            mes: { anio: 1640, mes: 4 },
            produccion: { base: 400000 },
            anotada: false,
            impuesto: { base: 20000 },
          },
        ],
        programado: false,
      },
    ])
    expect(formatearOro(cobros[0].importe.base, resultado.estadoNuevo.partida.equivalencias)).toBe('4,5 mo')
    expect(resultado.estadoNuevo.localesComerciales.map((l) => l.cobradoHasta)).toEqual([
      { anio: 1640, mes: 4 },
      { anio: 1640, mes: 4 },
      { anio: 1640, mes: 4 },
      { anio: 1640, mes: 4 },
    ])
  })

  it('el 1 de mayo las cajas suman 18 movimientos, y sin la anotación de la tienda el cobro sería de 4,7 mo', () => {
    const resultado = avanzarEjemplo(19)

    expect(saldosPorDominio(resultado.estadoNuevo)).toEqual({
      [DOM.tharan]: 4873800,
      [DOM.bree]: 36780000,
      [DOM.archet]: 2180000,
    })
    expect(resultado.cambios.filter((c) => c.tipo === 'saldo').map((c) => c.movimientos)).toEqual([4, 12, 2])
    expect(delAvance(resultado)).toHaveLength(18)

    const sinAnotar = documentoDeEjemplo()
    sinAnotar.localesComerciales = sinAnotar.localesComerciales.map((l) => ({ ...l, producciones: [] }))
    const conLaHabitual = simular(sinAnotar, 19, opciones())
    const cobro = delAvance(conLaHabitual).find((m) => m.regla?.tipo === 'locales')
    expect(cobro?.importe).toEqual({ base: 470000 })
  })
})

describe('el impago de Archet que anuncia P4', () => {
  it('a 98 días, el 19 de julio, Archet paga 41,2 mo del tributo y el resto queda como deuda con la Corona', () => {
    const resultado = avanzarEjemplo(98)

    expect(resultado.hasta).toEqual(F(19, 7))
    expect(saldosPorDominio(resultado.estadoNuevo)).toEqual({
      [DOM.tharan]: 4975800,
      [DOM.bree]: 34270000,
      [DOM.archet]: 0,
    })
    const tributo = delAvance(resultado).find(
      (m) => m.regla?.tipo === 'tributo' && m.regla.id === IMPUESTO.tributoArchet && m.fecha.mes === 7,
    )
    // Pagado a medias: sin «introducido», porque el importe ya no es el de la regla (técnica 8).
    expect(tributo?.importe).toEqual({ base: -4120000 })
    expect(deudasDeImpago(resultado.estadoNuevo)).toEqual([
      {
        id: expect.any(String),
        dominioId: DOM.archet,
        sentido: 'debo',
        contraparteId: PERSONA.corona,
        fecha: F(19, 7),
        principal: { base: 1880000 },
        interesPct: 0,
        estado: 'abierta',
        impago: true,
        origenImpago: { tipo: 'tributo', id: IMPUESTO.tributoArchet },
        cargos: [{ fecha: F(19, 7), importe: { base: 1880000 }, avanceId: AVANCE_ID }],
        pagos: [],
        devengos: [],
      },
    ])
    // La Corona de Arthedain ya existía: no se añade a Personas y entidades.
    expect(resultado.personasNuevas).toEqual([])
  })

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

  it('a 105 días no se pagan los albañiles: nace «Trabajadores de Archet» con su deuda de salarios', () => {
    const resultado = avanzarEjemplo(105)

    expect(resultado.hasta).toEqual(F(26, 7))
    expect(resultado.personasNuevas).toEqual([{ id: expect.any(String), nombre: 'Trabajadores de Archet' }])
    const persona = resultado.personasNuevas[0]
    expect(resultado.estadoNuevo.personas).toContainEqual(persona)
    const salarios = deudasDeImpago(resultado.estadoNuevo).find((d) => d.origenImpago?.tipo === 'salarios')
    expect(salarios).toEqual({
      id: expect.any(String),
      dominioId: DOM.archet,
      sentido: 'debo',
      contraparteId: persona.id,
      fecha: F(26, 7),
      principal: { base: 320000 },
      interesPct: 0,
      estado: 'abierta',
      impago: true,
      origenImpago: { tipo: 'salarios', id: DOM.archet },
      cargos: [{ fecha: F(26, 7), importe: { base: 320000 }, avanceId: AVANCE_ID }],
      pagos: [],
      devengos: [],
    })
    expect(resultado.avisos.filter((a) => a.tipo === 'impago').map((a) => a.texto)).toEqual([
      'La caja de Archet no pudo pagar a Corona de Arthedain: 18,8 mo pendientes',
      'La caja de Archet no pudo pagar a Trabajadores de Archet: 3,2 mo pendientes',
    ])
  })
})

describe('un año entero: 366 días, hasta el 13 de abril de 1641', () => {
  it('solo Archet deja impagos: nueve cargos en dos deudas', () => {
    const resultado = avanzarEjemplo(366)

    expect(resultado.hasta).toEqual(F(13, 4, 1641))
    expect(saldosPorDominio(resultado.estadoNuevo)).toEqual({
      [DOM.tharan]: 5659800,
      [DOM.bree]: 23700000,
      [DOM.archet]: 2260000,
    })
    const deudas = deudasDeImpago(resultado.estadoNuevo)
    expect(deudas.map((d) => d.dominioId)).toEqual([DOM.archet, DOM.archet])
    expect(deudas.flatMap((d) => d.cargos ?? [])).toHaveLength(9)
    const tributo = deudas.find((d) => d.origenImpago?.tipo === 'tributo')
    expect(tributo?.cargos?.map((c) => [c.fecha, c.importe.base])).toEqual([
      [F(19, 7), 1880000],
      [F(19, 10), 3740000],
      [F(19, 1, 1641), 3740000],
    ])
    expect(tributo?.principal).toEqual({ base: 9360000 })
    const salarios = deudas.find((d) => d.origenImpago?.tipo === 'salarios')
    expect(salarios?.cargos?.map((c) => c.importe.base)).toEqual([320000, 320000, 320000, 320000, 320000, 320000])
    expect(salarios?.principal).toEqual({ base: 1920000 })
  })

  it('día a día, Tharan nunca baja de 45,858 mo, Bree de 218,9 mo ni Archet de 0', () => {
    let estado = estadoDe(documentoDeEjemplo())
    const minimos: Record<Id, number> = saldosPorDominio(estado)

    for (let dia = 1; dia <= 366; dia++) {
      const recorrido = recorrerDias(
        estado,
        sumarDias(estado.partida.fechaActual, 1),
        opciones(`dia${dia}`, `av.dia-${dia}`),
      )
      for (const [dominioId, saldo] of Object.entries(recorrido.saldosDespues)) {
        minimos[dominioId] = Math.min(minimos[dominioId], saldo)
      }
      estado = recorrido.estadoNuevo
    }

    expect(minimos).toEqual({ [DOM.tharan]: 4585800, [DOM.bree]: 21890000, [DOM.archet]: 0 })
    // Avanzar de uno en uno llega a las mismas cajas que un solo avance de 366 días.
    expect(saldosPorDominio(estado)).toEqual(saldosPorDominio(avanzarEjemplo(366).estadoNuevo))
  })
})

describe('invariantes con 1, 7, 19, 98 y 366 días', () => {
  const DIAS = [1, 7, 19, 98, 366]

  it('las filas de saldo cuadran con las cajas del estado nuevo y ninguna caja acaba por debajo de mín(0, antes)', () => {
    const inicial = estadoDe(documentoDeEjemplo())
    const antes = saldosPorDominio(inicial)

    for (const dias of DIAS) {
      const resultado = avanzarEjemplo(dias)
      const despues = saldosPorDominio(resultado.estadoNuevo)
      const recorrido = recorrerDias(inicial, resultado.hasta, opciones())
      expect(recorrido.saldosAntes).toEqual(antes)
      expect(recorrido.saldosDespues).toEqual(despues)
      expect(resultado.estadoNuevo.partida.fechaActual).toEqual(sumarDias(F(12, 4), dias))
      for (const cambio of resultado.cambios) {
        if (cambio.tipo !== 'saldo') continue
        expect(cambio.antes).toBe(antes[cambio.dominioId])
        expect(cambio.despues).toBe(despues[cambio.dominioId])
        expect(cambio.movimientos).toBe(delAvance(resultado).filter((m) => m.dominioId === cambio.dominioId).length)
        expect(cambio.despues).toBeGreaterThanOrEqual(Math.min(0, cambio.antes))
      }
    }
  })

  it('no toca la partida que recibe, aunque llegue congelada', () => {
    for (const dias of DIAS) {
      const entrada = congelar(structuredClone(documentoDeEjemplo()))

      const resultado = simular(entrada, dias, opciones())
      aplicarAvance(entrada, resultado, AHORA)

      expect(entrada).toEqual(documentoDeEjemplo())
    }
  })

  it('la partida aplicada pasa el esquema y la validación de copias, y deshacer devuelve la del 12 de abril', () => {
    const catalogos = catalogosDeEjemplo()

    for (const dias of DIAS) {
      const documento = documentoDeEjemplo()
      const resultado = simular(documento, dias, opciones())

      const aplicado = aplicarAvance(documento, resultado, AHORA)
      const forma = EsquemaDocumentoPartida.safeParse(aplicado)
      expect(forma.success ? [] : forma.error.issues).toEqual([])
      expect(validarCopia(aplicado, catalogos)).toEqual([])
      expect(aplicado.avances).toHaveLength(5)
      expect(aplicado.avances.filter((a) => a.snapshotPrevio !== undefined)).toHaveLength(1)
      expect(aplicado.avances[4].snapshotPrevio).toEqual(estadoDe(documento))
      expect(aplicado.partida.cambiosDesdeUltimoAvance).toBe(0)

      const deshecho = deshacerUltimoAvance(aplicado)
      expect(estadoDe(deshecho)).toEqual(estadoDe(documentoDeEjemplo()))
      expect(deshecho.avances).toHaveLength(4)
      expect(deshecho.avances[3]).not.toHaveProperty('snapshotPrevio')
      expect(puedeDeshacer(deshecho)).toBe(false)
    }
  })
})
```

Cuatro detalles del archivo que conviene no cambiar al copiarlo:

- **`sinId` borra la clave con `delete` sobre una copia**, en vez de desestructurar `const { id, ...resto } = m`: así no queda una variable sin usar que el linter pueda marcar, y el movimiento original no se toca.
- **`expect(forma.success ? [] : forma.error.issues).toEqual([])`**: si el esquema rechaza la partida aplicada, Vitest enseña la lista de problemas de Zod con su ruta, en vez de un escueto «expected false to be true».
- **El recorrido día a día usa `recorrerDias`, no `simular`**: `simular` evalúa además los avisos, y «Pago no cubierto» hace su propia previsión de hasta 366 días (técnica 16), así que 366 simulaciones seguidas harían 366 previsiones de más. `recorrerDias` no calcula avisos y cada día cuesta menos de un milisegundo: el recorrido entero ronda los 100 ms. Cada día lleva su prefijo de ids (`dia1`, `dia2`…) y su `avanceId`, para que no se repitan (aviso 9).
- **Las categorías de la posada y del establo van escritas (`'cat.alojamiento'` y `'cat.montura'`)**: no están en `CATEGORIA`, que solo lleva las 16 protegidas, y son las mismas que usa el ejemplo (`idDeOpcion('categorias', 'Alojamiento')` da ese id).

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/motor/entregable.test.ts
```

Salida esperada (la hora y la duración varían; en una terminal interactiva Vitest añade además la línea `✓ src/dominio/motor/entregable.test.ts (18 tests)` con su tiempo):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  18 passed (18)
```

Para ver las 18 pruebas una a una:

```bash
npx vitest run src/dominio/motor/entregable.test.ts --reporter=verbose
```

Salida esperada (una línea por prueba, con su tiempo, que varía; la más lenta es el recorrido día a día, de unos 100 ms):

```text
 ✓ src/dominio/motor/entregable.test.ts > P4: el avance del 12 al 19 de abril de 1640 > crea los ocho movimientos de la vista previa, con su fecha, su categoría, su concepto y su origen
 ✓ src/dominio/motor/entregable.test.ts > P4: el avance del 12 al 19 de abril de 1640 > deja la bolsa de Tharan en 47,178 mo, la caja de Bree en 380,5 mo y la de Archet en 25 mo
 ✓ src/dominio/motor/entregable.test.ts > P4: el avance del 12 al 19 de abril de 1640 > resume el avance con una fila de saldo por dominio y los dos hechos de P5
 ✓ src/dominio/motor/entregable.test.ts > P4: el avance del 12 al 19 de abril de 1640 > el 19 solo avisa de que Archet no cubrirá el tributo de julio, y el 12 no había ningún aviso de dinero
 ✓ src/dominio/motor/entregable.test.ts > P4: el avance del 12 al 19 de abril de 1640 > la caravana de Fornost queda terminada con su cobro y los locales siguen cobrados hasta marzo
 ✓ src/dominio/motor/entregable.test.ts > regresión: el avance del 10 al 12 de abril, desde su copia > reproduce los tres movimientos y las tres filas de saldo del último avance del ejemplo
 ✓ src/dominio/motor/entregable.test.ts > balance mensual y resultado fiscal (§7) > Bree: entran 44 mo, salen 55,4 mo, el balance es −11,5 mo y el resultado fiscal +19 mo
 ✓ src/dominio/motor/entregable.test.ts > balance mensual y resultado fiscal (§7) > Archet: el balance es −14,6 mo, y los dos balances son iguales el 12 y el 19
 ✓ src/dominio/motor/entregable.test.ts > el cobro de los impuestos de locales del 1 de mayo > cobra 4,5 mo con la producción anotada de la tienda y deja los cuatro locales cobrados hasta abril
 ✓ src/dominio/motor/entregable.test.ts > el cobro de los impuestos de locales del 1 de mayo > el 1 de mayo las cajas suman 18 movimientos, y sin la anotación de la tienda el cobro sería de 4,7 mo
 ✓ src/dominio/motor/entregable.test.ts > el impago de Archet que anuncia P4 > a 98 días, el 19 de julio, Archet paga 41,2 mo del tributo y el resto queda como deuda con la Corona
 ✓ src/dominio/motor/entregable.test.ts > el impago de Archet que anuncia P4 > a 98 días avisa del impago en rojo y, en ámbar, de los salarios del 26 de julio y del tributo de octubre
 ✓ src/dominio/motor/entregable.test.ts > el impago de Archet que anuncia P4 > a 105 días no se pagan los albañiles: nace «Trabajadores de Archet» con su deuda de salarios
 ✓ src/dominio/motor/entregable.test.ts > un año entero: 366 días, hasta el 13 de abril de 1641 > solo Archet deja impagos: nueve cargos en dos deudas
 ✓ src/dominio/motor/entregable.test.ts > un año entero: 366 días, hasta el 13 de abril de 1641 > día a día, Tharan nunca baja de 45,858 mo, Bree de 218,9 mo ni Archet de 0
 ✓ src/dominio/motor/entregable.test.ts > invariantes con 1, 7, 19, 98 y 366 días > las filas de saldo cuadran con las cajas del estado nuevo y ninguna caja acaba por debajo de mín(0, antes)
 ✓ src/dominio/motor/entregable.test.ts > invariantes con 1, 7, 19, 98 y 366 días > no toca la partida que recibe, aunque llegue congelada
 ✓ src/dominio/motor/entregable.test.ts > invariantes con 1, 7, 19, 98 y 366 días > la partida aplicada pasa el esquema y la validación de copias, y deshacer devuelve la del 12 de abril

 Test Files  1 passed (1)
      Tests  18 passed (18)
```

Si algo falla, esta tabla dice a qué tarea volver. **Ninguno de estos fallos se arregla tocando `entregable.test.ts`**: la prueba es la que tiene razón, porque copia las cifras y los textos del contrato (apartados 3 y 4.1), que ya se comprobaron a mano y con el código real. Si el fallo es de una regla que el contrato no resuelve, se decide con el criterio de `CLAUDE.md` y se anota en `docs/decisiones.md`.

| Lo que falla | Qué revisar |
|---|---|
| `simular` lanza `RangeError: Los días de un avance van de 1 a 366` con 1 o 366 días | `errorDeDiasDeAvance` (tarea 21): el rango es de 1 a 366, ambos incluidos |
| P4 da 5, 6 o 7 movimientos: faltan la Barcaza, la caravana o los aranceles salen a 300.000 | D-019: beneficios en el paso 8 (tarea 15), vuelta de ventas en el paso 7 (tarea 18) y su sitio en `PASOS_DEL_DIA` (tarea 19); la feria, con `eventosDeDineroEl`, `pctDeIngresos` y `conEfecto` (tarea 7) y `pasoEventos` (tarea 19) |
| Los aranceles del 15 llevan `introducido`, o el beneficio, la caravana o el tributo no lo llevan | técnica 8: solo si el importe es exactamente la base de su origen (tareas 15, 17 y 18) |
| El detalle de los salarios dice «Pastores», o sus filas salen en otro orden | `nombreDeOficio` (tarea 11) y el orden del array en `pasoPagos` (tarea 17) |
| «Posada El Poney Pisador · 7 días», un movimiento por día o un diario fechado el 13 | `conceptoDiario` con `unidadDiaria` (tarea 11) y `cerrarDiarios` (tarea 14): un movimiento por regla, fechado `hasta` |
| Las filas de saldo salen en otro orden, falta la de un dominio o `movimientos` no cuadra | `cambiosDelAvance` (tarea 19): una fila por dominio en el orden de `estado.dominios`, contando los del `avanceId` |
| Un hecho dice «18 de abril» en P4, o sale un hecho de salarios | `formatearDiaDelAvance` (tarea 3) y D-032 en `cambiosDelAvance` (tarea 19) |
| Falta el aviso de Archet, sale también el 12 de abril o dice otra fecha | `avisosDePagoNoCubierto` (tarea 20): siguiente pago de cada origen, horizonte y **primer** suceso de cada origen; `formatearDiaCercano` (tarea 3) |
| La caravana de Fornost sigue `enRuta` o sin `movimientoVueltaId`; la de Tharbad cambia | `pasoVueltaDeVentas` (tarea 18): solo las ventas en ruta |
| La regresión del 10 al 12 da otro importe o fecha | `recorrerDias` empieza en `fechaActual + 1` (tarea 19) y `cerrarDiarios` fecha en `hasta` (tarea 14) |
| El balance de Bree da −1.147.142 o las soldadas 1.242.856 en `sumarAlMes` | `sumarAlMes` con un solo redondeo (tarea 4) y `balanceMensual` sin `alMes` por fila (tarea 9) |
| El balance cambia del 12 al 19 | `balanceMensual` no mira eventos ni recurrentes del personaje (D-027) ni la fecha del avance, salvo los habitantes (tarea 9) |
| El cobro del 1 de mayo da 470.000 con la tienda anotada, o dice «marzo y abril» | `produccionDelMes` y `mesesPorCobrar` (tarea 8); `cobrarLocales` (tarea 16) |
| Los `cobradoHasta` no llegan a abril, o llegan ya el 19 | `cobrarLocales` (tarea 16, técnica 30): se actualizan el día de cobro, pague o no |
| Archet acaba en negativo, o el tributo del 19 de julio sale entero | `pagarHasta` (tarea 13) y `pasoPagos` (tarea 17): el motor nunca deja una caja en negativo |
| La deuda de impago tiene otros campos (`notas`, `vencimiento`, `introducido`…) | `registrarImpago` (tarea 13, técnica 25) |
| «Trabajadores de Archet» no sale, sale dos veces o se crea otra «Corona de Arthedain» | `personaPara` (tarea 13): reutiliza por `mismoNombre` y apunta la nueva en `personasNuevas` |
| Los avisos a 98 días salen en otro orden | `ordenarAvisos` (tarea 20, técnica 11): rojos primero, después por fecha |
| A 366 días hay más de dos deudas de impago | `registrarImpago` (tarea 13): suma el cargo a la deuda abierta del mismo origen |
| Los mínimos día a día no dan 4.585.800 y 21.890.000, o el recorrido de uno en uno acaba en otras cajas | el orden de los pasos dentro del día (cobros antes que pagos, tareas 15, 17 y 19) o un diario que depende de la longitud del avance (tareas 14 y 17) |
| `TypeError: Cannot assign to read only property …` | algún paso escribe en el estado que recibe (tareas 13 a 19) o `aplicarAvance` en el documento (tarea 22): el motor copia lo que escribe (técnica 29) |
| `validarCopia` devuelve problemas | depende del mensaje: «no cuadra con su detalle» → tarea 6 (técnica 4) o el detalle que escribe el paso; «Lo tecleado (…) no cuadra con el importe guardado» → técnica 8; «No existe el impuesto o tributo…» → tarea 6 (técnica 5); «Un movimiento con fecha futura tiene que estar programado» → un movimiento fechado después de `hasta`; «La fecha actual no cuadra con los avances» o «Los avances no van en orden» → `aplicarAvance` (tarea 22) |
| La copia del último avance trae `avances`, o tras deshacer `avances[3]` conserva `snapshotPrevio` | `aplicarAvance` (tarea 22): la copia se saca con `estadoDe` (aviso 4) y el avance anterior se rehace **sin la clave** (aviso 22) |

- [ ] **Paso 5: Comprobar los tipos, todas las pruebas y el linter**

`npx tsc -b` es aquí lo que detecta, por ejemplo, que `Omit<Movimiento, 'id'>` ha dejado de encajar con lo que devuelve `simular` o que `OpcionesSimulacion` ha cambiado de forma; `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
npm run lint
```

Salida esperada: `npx tsc -b` no escribe nada; `npm run lint` solo imprime su cabecera (`> gestion-aldeas@0.0.0 lint` y `> oxlint`) y termina sin errores; y `npm test` termina con **902 pruebas en 81 archivos**. La tarea 27 dejó 884 en 80, y esta trae **18 nuevas**, las de `entregable.test.ts`. `pureza.test.ts` no crece, porque el archivo nuevo es una prueba (`*.test.ts`) y su glob las excluye:

```text
 Test Files  81 passed (81)
      Tests  902 passed (902)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/motor/entregable.test.ts
git commit -m "test(fase-3): el entregable de la fase con la partida de ejemplo y los invariantes del motor" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF`, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/motor/entregable.test.ts', LF will be replaced by CRLF the next time Git touches it
[implementacion/fase-3 282e3b6] test(fase-3): el entregable de la fase con la partida de ejemplo y los invariantes del motor
 1 file changed, 597 insertions(+)
 create mode 100644 src/dominio/motor/entregable.test.ts
```

---

### Tarea 29 · Cierre de la fase

Comprueba el entregable de la fase 3: el motor de dinero, los avisos, aplicar y deshacer, la edición de los registros de dinero y el entregable con la partida de ejemplo, todo en verde; la app compilando sin errores; el linter sin avisos; cada tarea confirmada en Git; una revisión final de toda la fase; y, al final, la rama de la fase fusionada en local y subida a GitHub, como pide `CLAUDE.md`. **No escribe código ni pruebas**: solo ejecuta comprobaciones y, si alguna falla, dice a qué tarea volver. El único cambio de historial es la fusión (en avance rápido, sin commit nuevo) y los `fix(…)` que pida la revisión final.

Depende de la tarea 28, que es la última que escribe algo.

**Reglas de la especificación que implementa:**

- **Entregable de la fase 3 (hoja de ruta, l.66).** «Pruebas que reproducen la vista previa P4 del ejemplo: Tharan +0,66 mo, Bree +39,9 mo, Archet −60 mo y 8 movimientos. También el balance de Bree (−11,5 mo), el resultado fiscal (+19 mo) y el cobro de locales del 1 de mayo (+4,5 mo).» Lo respalda `src/dominio/motor/entregable.test.ts` (tarea 28).
- **Alcance de la fase 3 (hoja de ruta, l.55-65).** Bucle día a día con el orden de §9; movimientos agrupados; recurrentes, salarios, soldadas, impuestos fijos y por habitante, tributos e impuestos de locales; pagos y cobros programados; lo adelantado de las fases 4 y 5 (D-019); impagos; avisos de dinero; aplicar y deshacer; balance y resultado fiscal; reglas de edición y borrado. El paso 6 lo recorre punto por punto.
- **Cierre de fase (`CLAUDE.md`).** «`npm test`, `npx tsc -b`, `npm run build` y `npm run lint` en verde, árbol de trabajo limpio y una revisión final de toda la fase.»
- **Rama por fase (`CLAUDE.md`).** «Al cerrar la fase, fusiónala en local, borra la rama y sube la rama de trabajo a GitHub.» Y: «Subir a GitHub está autorizado […]. Nunca con `--force` ni reescribiendo historial ya subido. Abrir un *pull request* […] sí se pregunta antes.» Esta tarea no abre ningún *pull request*.

**Archivos:** ninguno. Esta tarea solo ejecuta comprobaciones; si la revisión final del paso 7 encuentra algo, se arregla en los archivos de la tarea que lo escribió.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas` o el clon donde se ejecute el plan). Los pasos 1 a 7 se hacen en la rama `implementacion/fase-3`.

- [ ] **Paso 1: Ejecutar todas las pruebas**

```bash
git branch --show-current
npm test
npx vitest list --filesOnly | wc -l
```

Salida esperada: la rama es `implementacion/fase-3`; `npm test` termina en verde con **902 pruebas en 81 archivos** (la hora y la duración varían), y `vitest list --filesOnly` cuenta los mismos **81** archivos, uno por línea:

```text
implementacion/fase-3

> gestion-aldeas@0.0.0 test
> vitest run


 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  81 passed (81)
      Tests  902 passed (902)
81
```

Vitest 5 puede añadir al final una nota de rendimiento («Transform … persist transforms across runs with `fsModuleCache: true`»). **No es un fallo** y no hay que hacer nada: lo que cuenta es que no haya ni un `failed`.

Las 902 pruebas se reparten así. «Pruebas nuevas» incluye las que `pureza.test.ts` suma por cada módulo nuevo de `src/dominio` (una por módulo, 31 en toda la fase), así que la columna no coincide con lo que trae cada archivo nuevo:

| Tarea | Archivos de prueba nuevos | Módulos nuevos del dominio | Pruebas nuevas | Acumulado (pruebas / archivos) |
|---|---|---|---|---|
| Punto de partida (fases 1 y 2) | — | 38 | — | 568 / 48 |
| 1 · Registro y hoja de ruta | — | — | 0 | 568 / 48 |
| 2 · Lo tecleado, normalizado | — (en `dinero/importe.test.ts`) | — | 6 | 574 / 48 |
| 3 · Formatos de meses y días | — (en `calendario/formatoFecha.test.ts`) | — | 10 | 584 / 48 |
| 4 · Suma exacta al mes | — (en `dinero/prorrateo.test.ts`) | — | 5 | 589 / 48 |
| 5 · Modelo y ejemplo | — (en las pruebas de `modelo/` y `ejemplo/`) | — | 7 | 596 / 48 |
| 6 · Validación que el motor necesita | — (en `validacion/`) | — | 5 | 601 / 48 |
| 7 · Habitantes y efectos de eventos | `poblacion/habitantes.test.ts`, `eventos/efectos.test.ts` | 2 | 17 | 618 / 50 |
| 8 · Reglas de los locales | `locales/impuesto.test.ts` | 1 | 15 | 633 / 51 |
| 9 · Balance mensual y resultado fiscal | `dinero/balance.test.ts` | 1 | 9 | 642 / 52 |
| 10 · Tipos, ids y ayudantes del motor | `motor/ids.test.ts`, `motor/pruebas/constructores.test.ts` | 3 | 8 | 650 / 54 |
| 11 · Textos del motor | `motor/textos.test.ts` | 1 | 21 | 671 / 55 |
| 12 · Objeto de un pago programado | `inventario/compra.test.ts` | 1 | 7 | 678 / 56 |
| 13 · Contexto, caja e impagos | `motor/contexto.test.ts`, `motor/caja.test.ts`, `motor/impagos.test.ts` | 3 | 22 | 700 / 59 |
| 14 · Conceptos diarios | `motor/diarios.test.ts` | 1 | 8 | 708 / 60 |
| 15 · Paso 8: cobros | `motor/pasos/cobros.test.ts` | 1 | 12 | 720 / 61 |
| 16 · Paso 8: locales | `motor/pasos/locales.test.ts` | 1 | 10 | 730 / 62 |
| 17 · Paso 9: pagos | `motor/pasos/pagos.test.ts` | 1 | 16 | 746 / 63 |
| 18 · Paso 7: vuelta de ventas | `motor/pasos/caravanas.test.ts` | 1 | 6 | 752 / 64 |
| 19 · Bucle y cambios | `motor/bucle.test.ts`, `motor/cambios.test.ts` | 2 | 14 | 766 / 66 |
| 20 · Avisos de dinero | `avisos/dinero.test.ts`, `avisos/pagoNoCubierto.test.ts`, `avisos/avisos.test.ts` | 3 | 21 | 787 / 69 |
| 21 · simular y días de avance | `avance/dias.test.ts`, `motor/simular.test.ts` | 2 | 18 | 805 / 71 |
| 22 · Aplicar y deshacer | `avance/aplicar.test.ts`, `avance/deshacer.test.ts` | 2 | 15 | 820 / 73 |
| 23 · Movimientos sueltos | `edicion/registros.test.ts`, `edicion/movimientos.test.ts` | 2 | 21 | 841 / 75 |
| 24 · Transferencias | `edicion/transferencias.test.ts` | 1 | 10 | 851 / 76 |
| 25 · Reglas: interruptor y «Al eliminar» | `edicion/reglas.test.ts` | 1 | 10 | 861 / 77 |
| 26 · Locales: alta, estado y producción | `edicion/locales.test.ts` | 1 | 14 | 875 / 78 |
| 27 · Guardar avances y ediciones | `src/datos/avances.test.ts`, `src/datos/ediciones.test.ts` | — (son de `src/datos`) | 9 | 884 / 80 |
| 28 · Entregable de la fase 3 | `motor/entregable.test.ts` | — (es una prueba) | 18 | 902 / 81 |
| **Total de la fase 3** | **33** | **31** | **334** | **902 / 81** |

Las rutas sin prefijo son de `src/dominio/`. Tres cosas que hay que saber leer en esta tabla:

- **`pureza.test.ts` vale ahora por 71 pruebas**: dos fijas más una por cada módulo de `src/dominio` sin contar las pruebas, que son **69** (los 38 de las fases 1 y 2 y los 31 de esta). Cada tarea ya contó las suyas en «Pruebas nuevas»; por eso no hay una fila aparte para `pureza.test.ts`.
- **Lo que manda es lo que imprime Vitest.** Si una tarea acabó con alguna prueba más o menos de las que aquí figuran, el último paso de esa tarea es el que tiene razón: comprueba entonces que el total cuadra con la suma de tus cifras y que están los **81 archivos**. Lo que no puede pasar es que falte un archivo de la tabla, porque eso significa que una tarea se dejó a medias (el paso 5 lo comprueba con Git).
- **No hay ningún archivo de prueba fuera de `src/`.** `include` sigue siendo `['src/**/*.test.ts']` y `vite.config.ts` no se ha tocado en toda la fase (paso 5).

- [ ] **Paso 2: Comprobar los tipos de todo el proyecto**

`vitest run` no comprueba tipos: que `ResultadoSimulacion`, `Contexto` o las funciones de `edicion/` encajen con los tipos que infiere Zod del modelo solo lo dice el compilador.

```bash
npx tsc -b
```

Salida esperada: **ninguna línea**. Si escribe algo, es un error de tipos y hay que arreglarlo en la tarea que escribió el archivo que nombra (la tabla del paso 1 dice qué tarea escribe cada archivo).

- [ ] **Paso 3: Compilar la app**

`npm run build` comprueba antes los tipos de todo `src/` con `tsc -b`, también los de las pruebas, y después empaqueta la app.

```bash
npm run build
```

Salida esperada (el tiempo varía). Siguen siendo **15 módulos** y el mismo `.js` que en las fases 1 y 2: la app todavía no importa ni `src/dominio` ni `src/datos`, porque las pantallas empiezan en la fase 6, así que el motor no engorda el `dist`:

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

✓ built in 233ms
```

Si el número de módulos o el tamaño cambian, alguna tarea ha importado el dominio desde `src/main.tsx` o desde `src/App.tsx`, y eso no toca hasta la fase 6: busca el import con `git diff diseno/especificacion-y-vistas...implementacion/fase-3 -- src/main.tsx src/App.tsx` y quítalo en la tarea que lo añadió.

- [ ] **Paso 4: Pasar el linter**

```bash
npm run lint
echo "salida: $?"
```

Salida esperada: `oxlint` **no escribe nada** además de su cabecera, y sale con código 0:

```text
> gestion-aldeas@0.0.0 lint
> oxlint

salida: 0
```

- [ ] **Paso 5: Comprobar que no queda nada pendiente de commit ni fuera de su sitio**

Cada tarea de la fase 3 que cambia algo termina con su commit (la tarea 1 solo comprueba y no hace ninguno), así que el árbol debe estar limpio y la rama debe tener, **como mínimo, 27 commits**: los de las tareas 2 a 28, uno por tarea. Puede haber más: los `fix(…)` que dejaron las revisiones de cada tarea (`superpowers:subagent-driven-development`) y algún `docs: …` con decisiones nuevas.

```bash
git status --short
git log --oneline diseno/especificacion-y-vistas..implementacion/fase-3 | wc -l
git log --reverse --format='%s' diseno/especificacion-y-vistas..implementacion/fase-3
```

Salida esperada: `git status --short` no escribe nada (`dist/` y `node_modules/` están en `.gitignore`); el recuento es **27 o más**; y la lista, de la más antigua a la más reciente, tiene un commit de cada tarea con el prefijo que le toca (el mensaje exacto está en el último paso de cada tarea; el `Co-Authored-By` va en el cuerpo y no sale con `%s`):

| Tareas | Prefijo del commit |
|---|---|
| 2 y 4 | `feat(dinero): …` |
| 3 | `feat(calendario): …` |
| 5 | `feat(modelo): …` |
| 6 | `fix(validacion): …` |
| 7 | `feat(eventos): …` o `feat(poblacion): …` |
| 8 | `feat(locales): …` |
| 9 | `feat(dinero): …` |
| 10, 11, 13 a 19 | `feat(motor): …` |
| 12 | `feat(inventario): …` |
| 20 | `feat(avisos): …` |
| 21 | `feat(motor): …` o `feat(avance): …` |
| 22 | `feat(avance): …` |
| 23 a 26 | `feat(edicion): …` |
| 27 | `feat(datos): …` |
| 28 | `test(fase-3): el entregable de la fase con la partida de ejemplo y los invariantes del motor` |

Si `git status --short` lista algún archivo, es que se saltó el último paso de la tarea que lo crea: vuelve a esa tarea, ejecuta su `git add` y su `git commit` tal como están escritos, y repite este paso. Si falta el commit de una tarea, esa tarea no se terminó.

Ahora, que están todos los archivos de prueba nuevos y que no se ha tocado nada que la fase no debía tocar:

```bash
git diff --name-only --diff-filter=A diseno/especificacion-y-vistas...implementacion/fase-3 -- '*.test.ts' | wc -l
git diff --name-only --diff-filter=A diseno/especificacion-y-vistas...implementacion/fase-3 -- '*.test.ts'
git diff --stat diseno/especificacion-y-vistas...implementacion/fase-3 -- vite.config.ts package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json .oxlintrc.json
git diff --stat diseno/especificacion-y-vistas...implementacion/fase-3 -- docs/superpowers/specs design
```

Salida esperada: **33** archivos de prueba nuevos, en este orden (el de Git), y los dos últimos comandos **no escriben nada** (ni configuración ni dependencias nuevas, contrato §1; ni la especificación ni las vistas, que no se reescriben sin preguntar):

```text
33
src/datos/avances.test.ts
src/datos/ediciones.test.ts
src/dominio/avance/aplicar.test.ts
src/dominio/avance/deshacer.test.ts
src/dominio/avance/dias.test.ts
src/dominio/avisos/avisos.test.ts
src/dominio/avisos/dinero.test.ts
src/dominio/avisos/pagoNoCubierto.test.ts
src/dominio/dinero/balance.test.ts
src/dominio/edicion/locales.test.ts
src/dominio/edicion/movimientos.test.ts
src/dominio/edicion/registros.test.ts
src/dominio/edicion/reglas.test.ts
src/dominio/edicion/transferencias.test.ts
src/dominio/eventos/efectos.test.ts
src/dominio/inventario/compra.test.ts
src/dominio/locales/impuesto.test.ts
src/dominio/motor/bucle.test.ts
src/dominio/motor/caja.test.ts
src/dominio/motor/cambios.test.ts
src/dominio/motor/contexto.test.ts
src/dominio/motor/diarios.test.ts
src/dominio/motor/entregable.test.ts
src/dominio/motor/ids.test.ts
src/dominio/motor/impagos.test.ts
src/dominio/motor/pasos/caravanas.test.ts
src/dominio/motor/pasos/cobros.test.ts
src/dominio/motor/pasos/locales.test.ts
src/dominio/motor/pasos/pagos.test.ts
src/dominio/motor/pruebas/constructores.test.ts
src/dominio/motor/simular.test.ts
src/dominio/motor/textos.test.ts
src/dominio/poblacion/habitantes.test.ts
```

Si una tarea llamó a su archivo de prueba de otra forma, manda lo que dice el apartado «**Archivos:**» de esa tarea; lo que tiene que cuadrar es el número, 33. Si el tercer comando enseña `package.json` o `package-lock.json`, alguna tarea instaló una dependencia que la fase no necesita: el contrato no añade ninguna.

- [ ] **Paso 6: Recorrer la lista de comprobación del entregable**

Esto es lo que la hoja de ruta pide de la fase 3 (l.55-66). Cada punto se puede comprobar solo, con el comando de su fila; todos juntos son el `npm test` del paso 1. Todos deben terminar con `passed` y ningún `failed`.

- [ ] **Bucle día a día con el orden de pasos de §9** (1 eventos, 7 vuelta de ventas, 8 cobros y 9 pagos; del día siguiente a la fecha actual hasta el último, ambos incluidos; de 1 a 366 días y nunca más allá del 31 de diciembre de 9999).

  ```bash
  npx vitest run src/dominio/motor/bucle.test.ts src/dominio/motor/simular.test.ts src/dominio/avance/dias.test.ts
  ```

- [ ] **Movimientos agrupados**: diarios por avance, fechados el último día («Posada El Poney Pisador · 7 noches»); salarios y soldadas por asentamiento y día, con su detalle por fila; locales por asentamiento y día, con su detalle por local y mes.

  ```bash
  npx vitest run src/dominio/motor/diarios.test.ts src/dominio/motor/pasos src/dominio/motor/textos.test.ts
  ```

- [ ] **Recurrentes de J5, salarios, soldadas, impuestos fijos y por habitante, tributos e impuestos de locales** con `cobradoHasta`, estado abierto o cerrado y producción anotada.

  ```bash
  npx vitest run src/dominio/motor/pasos src/dominio/locales src/dominio/poblacion
  ```

- [ ] **Pagos y cobros programados**, también el objeto pendiente de un gasto programado (D-034).

  ```bash
  npx vitest run src/dominio/motor/pasos/cobros.test.ts src/dominio/motor/pasos/pagos.test.ts src/dominio/inventario src/dominio/motor/contexto.test.ts
  ```

- [ ] **Lo adelantado de las fases 4 y 5 (D-019)**: beneficios de las inversiones, eventos que cambian impuestos, rentas y gastos, y el cobro al volver de las caravanas de venta.

  ```bash
  npx vitest run src/dominio/eventos src/dominio/motor/pasos/cobros.test.ts src/dominio/motor/pasos/caravanas.test.ts
  ```

- [ ] **Impagos con contraparte automática; el motor nunca deja una caja en negativo.** Pago por filas, deuda por origen, persona reutilizada o nueva, nombres cortados o con « (impago)» (D-020, D-021, D-023).

  ```bash
  npx vitest run src/dominio/motor/caja.test.ts src/dominio/motor/impagos.test.ts src/dominio/motor/pasos/pagos.test.ts
  ```

- [ ] **Avisos de dinero de la tabla de §9**: saldo negativo, impago y pago no cubierto, ordenados (D-024, D-025).

  ```bash
  npx vitest run src/dominio/avisos
  ```

- [ ] **Aplicar un avance y deshacer el último**, con la copia completa, el contador de cambios y los avisos de J2c y J2d; y su guardado en IndexedDB.

  ```bash
  npx vitest run src/dominio/avance src/datos/avances.test.ts
  ```

- [ ] **Balance mensual y resultado fiscal (§7)**: Bree −11,5 mo y +19 mo; Archet −14,6 mo.

  ```bash
  npx vitest run src/dominio/dinero/balance.test.ts src/dominio/dinero/prorrateo.test.ts
  ```

- [ ] **Reglas de edición y borrado de sus registros (§6.4)**: movimientos vinculados que se editan desde su origen, transferencias, el interruptor de J5, la tabla «Al eliminar» y los locales; con las dos reglas pendientes de la fase 2 (lo tecleado, normalizado, y guardar solo si algo cambió).

  ```bash
  npx vitest run src/dominio/edicion src/datos/ediciones.test.ts src/dominio/dinero/importe.test.ts src/dominio/validacion src/dominio/modelo
  ```

- [ ] **El entregable entero**, con la partida de ejemplo: P4, balance, locales del 1 de mayo, impago natural, un año entero e invariantes. Son **18** pruebas.

  ```bash
  npx vitest run src/dominio/motor/entregable.test.ts
  ```

- [ ] **El dominio sigue siendo puro.** Ni Dexie, ni React, ni `indexedDB`, `localStorage`, `window`, `document`, `navigator`, `crypto` o `fetch` en los 69 módulos de `src/dominio`; Zod sí. Son **71** pruebas: dos fijas más una por módulo.

  ```bash
  npx vitest run src/dominio/pureza.test.ts
  ```

  Salida esperada (la hora y la duración varían):

  ```text
   Test Files  1 passed (1)
        Tests  71 passed (71)
  ```

- [ ] **Paso 7: Revisión final de toda la fase**

`CLAUDE.md` pide una revisión final de la fase entera, además de las dos revisiones que ya tuvo cada tarea. Se hace con la skill `superpowers:requesting-code-review`, sobre todo lo que la fase cambió. Primero, los dos extremos del cambio:

```bash
BASE_SHA=$(git merge-base diseno/especificacion-y-vistas implementacion/fase-3)
HEAD_SHA=$(git rev-parse implementacion/fase-3)
echo "$BASE_SHA $HEAD_SHA"
git diff --shortstat "$BASE_SHA" "$HEAD_SHA"
```

Salida esperada: dos identificadores de 40 caracteres (varían) y una línea con el tamaño del cambio, del estilo `NN files changed, NNNN insertions(+), NN deletions(-)` (las cifras varían). `BASE_SHA` es el commit de `diseno/especificacion-y-vistas` del que salió la rama.

Invoca la skill `superpowers:requesting-code-review` con esos dos SHA, el plan de la fase (`docs/superpowers/plans/2026-09-18-gestion-aldeas-fase-3.md`) como «lo que se pidió» y esta descripción: «Fase 3 · Motor I: dinero: `simular` puro con los pasos 1, 7, 8 y 9 de §9, avisos de dinero, aplicar y deshacer, edición de los registros de dinero y su guardado en `src/datos`». Pide al revisor que compruebe, además de lo habitual, estos puntos del contrato (apartado 5), que son los que las revisiones por tarea no ven porque cruzan varias tareas:

1. **Pureza**: ninguna función del motor ni de `edicion/` escribe en lo que recibe (técnica 29); el estado se saca con `estadoDe`, nunca con `{ ...documento }` (aviso 4).
2. **Nunca −0** en un importe (aviso 6) y nunca una caja que el motor deje por debajo de 0 (§9 l.1293).
3. **Dentro del bucle**, nada de Zod, ni `saldosPorDominio`, ni búsquedas lineales que se puedan evitar con los índices del contexto (aviso 7); las fechas, con `compararFechas` o `aNumeroDeDia`, nunca con `===` entre objetos (aviso 8).
4. **`introducido`** solo cuando el importe es exactamente la base de su origen (técnica 8); conceptos ≤ 120 y textos ≤ 200 con `ajustarTexto` (técnica 26).
5. **Programados**: los que tienen vínculo de obra, caravana o entrada de almacén no se aplican en los pasos 8 y 9 (aviso 15); los de fecha pasada se aplican el primer día (técnica 14).
6. **`cobradoHasta`** nunca retrocede y avanza aunque ningún local pague (técnica 30).
7. **Los efectos secundarios de un borrado** no ponen `editadoEl` (técnica 31); las ediciones que no cambian nada devuelven la misma referencia y no cuentan (técnica 13, D-038).
8. **`src/datos`**: dentro de `db.transaction` solo va IndexedDB (aviso 24); `guardarAvance` y `deshacerAvanceGuardado` no pasan por `guardarEdicion` (aviso 25).
9. **Textos**: los conceptos, contrapartes, hechos, avisos y errores coinciden **letra a letra** con el apartado 3 del contrato, con «−» (U+2212) y las comillas «».
10. **Registro**: toda decisión que se tomó al ejecutar la fase y no está en D-019 a D-042 está anotada en `docs/decisiones.md`.

Si el entorno donde se ejecuta este paso no tiene una herramienta para despachar un subagente genérico (la que usa `superpowers:requesting-code-review` para el revisor), quien ejecute la fase hace la revisión él mismo, directamente contra los 10 puntos de arriba, con lectura de código y las comprobaciones dirigidas que hagan falta, en vez de despachar un subagente; lo deja anotado en el resultado de este paso.

Qué hacer con lo que encuentre:

- **Crítico o importante**: se arregla ya, en los archivos de la tarea que lo escribió y con TDD (primero una prueba que lo reproduce y falla). Cada arreglo es un commit `fix(<ámbito>): <qué>` terminado en `-m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`. Después se repiten los pasos 1 a 5 de esta tarea: el recuento del paso 1 sube en las pruebas que añadan los arreglos.
- **Una regla que la especificación no resuelve**: no la arregla el revisor. Se decide con el criterio de `CLAUDE.md` («Cómo decidir») y se anota en la sección «Fase 3 · Motor de dinero (2026-09-18)» de `docs/decisiones.md` con el siguiente número libre (D-043, D-044…), en un commit `docs: …` con la misma línea `Co-Authored-By`.
- **Menor**: si no se arregla, se añade a «Lo que queda para las fases siguientes» (al final de este plan), en el mismo commit `docs: …`.

La revisión termina cuando el revisor no deja nada crítico ni importante y los pasos 1 a 5 vuelven a dar verde.

- [ ] **Paso 8: Fusionar la rama de la fase y subirla**

Con todo en verde y la revisión cerrada, la rama de la fase se fusiona en la rama de trabajo, se borra y se sube la rama de trabajo a GitHub (`CLAUDE.md`, «Rama por fase»). La fusión es en avance rápido: `diseno/especificacion-y-vistas` no ha cambiado desde que salió la rama, así que no hace falta commit de fusión.

```bash
git switch diseno/especificacion-y-vistas
git merge --ff-only implementacion/fase-3
git branch -d implementacion/fase-3
git push origin diseno/especificacion-y-vistas
git status -sb
```

Salida esperada (los identificadores varían; `<antes>` es el último commit de `diseno/especificacion-y-vistas` antes de la fase y `<después>`, el commit de la tarea 28 o el último `fix(…)` de la revisión). `git merge` lista además todos los archivos de la fase, uno por línea, entre `Fast-forward` y el resumen. `git push` escribe sus líneas por la salida de errores, y eso es normal:

```text
Switched to branch 'diseno/especificacion-y-vistas'
Your branch is up to date with 'origin/diseno/especificacion-y-vistas'.
Updating <antes>..<después>
Fast-forward
 …
Deleted branch implementacion/fase-3 (was <después>).
To https://github.com/RubenSanchoJimenez/gestion_aldeas.git
   <antes>..<después>  diseno/especificacion-y-vistas -> diseno/especificacion-y-vistas
## diseno/especificacion-y-vistas...origin/diseno/especificacion-y-vistas
```

La última línea, sin `[ahead N]` ni `[behind N]`, dice que la rama de trabajo local y la de GitHub son la misma. Si `git switch` dice `Your branch is ahead of 'origin/diseno/especificacion-y-vistas' by 1 commit.`, es el commit del plan de la fase, que todavía no se había subido: no pasa nada, `git push` lo sube con la fase.

Cuando este paso se ejecuta dentro de un clon de verificación (en el scratchpad, no en `C:/Proyectos/GA/gestion_aldeas`) cuyo remoto `origin` apunta al propio repositorio real, se omiten `git push origin diseno/especificacion-y-vistas` y las dos últimas líneas de la salida esperada (las de `To https://github.com/...` y la del `## diseno/especificacion-y-vistas...origin/diseno/especificacion-y-vistas`), porque subir escribiría en el repositorio real. `git status -sb` puede entonces quedar con `[ahead N]` en vez de la línea sin corchetes. `git switch`, `git merge --ff-only` y `git branch -d` sí se comprueban tal cual, porque no salen del clon; el `git push` real solo se hace al ejecutar la fase de verdad en `C:/Proyectos/GA/gestion_aldeas`.

Si algo no sale así:

| Lo que pasa | Qué hacer |
|---|---|
| `git merge` dice `fatal: Not possible to fast-forward, aborting.` | `diseno/especificacion-y-vistas` recibió commits después de crear la rama. Fusiona con `git merge --no-edit implementacion/fase-3` (crea un commit de fusión), repite los pasos 1 a 4 **en `diseno/especificacion-y-vistas`** y sigue con `git branch -d` y `git push` |
| `git branch -d` dice `error: the branch 'implementacion/fase-3' is not fully merged` | la fusión no se hizo: vuelve a `git merge`. **No** uses `git branch -D` |
| `git push` dice `! [rejected] … (fetch first)` | alguien subió a GitHub después: `git pull --no-rebase origin diseno/especificacion-y-vistas`, repite los pasos 1 a 4 y vuelve a subir. **Nunca** `--force` |
| `git push` pide usuario o contraseña | las credenciales de GitHub de esta máquina no están configuradas: para y pide al usuario que suba él la rama; nunca escribas una contraseña o un token |

Esta tarea **no abre ningún *pull request***: `CLAUDE.md` pide preguntar antes.

Con la rama fusionada y subida, **la fase 3 está cerrada**. Lo siguiente es escribir el plan de la fase 4 («Motor II: almacén») en `docs/superpowers/plans/`, como dice la hoja de ruta, teniendo en cuenta lo que D-019 ya adelantó (ver el punto 1 de la lista siguiente).

---

## Lo que queda para las fases siguientes

La fase 3 deja el motor de dinero entero, puro y probado con la partida de ejemplo, pero todavía **no mueve el almacén, no toca las deudas normales y no tiene pantallas**. Esto es lo que queda apuntado, con lo que la fase 3 ya ha dejado hecho para que quien lo recoja no empiece de cero:

1. **Los planes de las fases 4 y 5 tienen que descontar lo que adelantó D-019.** La hoja de ruta solo dice en la fase 3 que se adelantan los beneficios de las inversiones, los eventos que cambian impuestos, rentas y gastos, y el cobro al volver de las caravanas de venta; el texto de las fases 4 y 5 sigue igual. Al planificarlas:
   - la fase 4 conserva de las caravanas **la salida y la llegada** (la carga que sale del almacén, la compra que entra y los traslados) y de los eventos **los efectos de producción y consumo**; el cobro de una venta al volver ya está en `motor/pasos/caravanas.ts`;
   - la fase 5 conserva de las inversiones **la retirada** y de las deudas **el vencimiento como aviso**, y gana la casilla «Añadir también al inventario» de J2b y «Quitar también … del inventario» de J2d (técnica 19) y el arreglo de «vencida el mismo día» en `validacion/coherencia.ts` (técnica 3). Los beneficios ya se cobran en `motor/pasos/cobros.ts`.
2. **El resto del bucle (fase 4).** `PASOS_DEL_DIA` (`motor/bucle.ts`) tiene los pasos 1, 7, 8 y 9; los pasos 2 a 6 (población con fecha; inicio de obras, salidas de caravanas y compras programadas; producción; consumo; avance de obras) y la llegada de compras y traslados del paso 7 se añaden a la lista con su número, **sin tocar `recorrerDias`** (técnica 15). Ya están hechos:
   - `habitantesEl` y `habitantesDe` (`poblacion/habitantes.ts`), que el consumo de víveres y la ración pueden usar tal cual;
   - `eventoActivoEl` (`eventos/efectos.ts`), para los efectos de producción y consumo;
   - el `Contexto` con sus copias y sus índices, `anadirMovimiento`, `cobrar`, `pagarHasta` y `registrarImpago`, para lo que descuenta dinero al empezar una obra o al salir una caravana;
   - `ordenarAvisos`, que ya sabe ordenar los doce tipos de `EsquemaTipoAviso`: los avisos de faltas, pérdidas y obras solo tienen que devolver `AvisoConFecha`.

   Lo que la fase 3 deja **a propósito sin hacer** y la fase 4 tiene que recoger: los movimientos programados con vínculo de obra, caravana o entrada de almacén no se aplican en los pasos 8 y 9 (aviso 15 del contrato); las compras en ruta y las ventas programadas no se tocan (la caravana de Tharbad sigue «enRuta» después del 25 de abril, y la validación lo admite); el aviso de víveres de P4 («Los víveres de Bree se agotan el 23 de abril») y la fila «Al eliminar» de «Cambio de población» y de «Edificio» (técnica 20).
3. **Deudas e inversiones (fase 5).** Falta el paso 10 (el interés del día y después el vencimiento) y los avisos «Deuda que vence» y «Deuda vencida» (técnica 3). Hasta entonces, un avance que pasa del 20 de abril deja la deuda de Hobart «abierta» y sin devengos, y la validación lo admite (aviso 12): por eso ninguna prueba de la fase 3 mira esas deudas. El pendiente de una deuda de impago es hoy «principal − suma de los pagos» (técnica 17); cuando exista «Se aplica a», la fase 5 lo afinará en `avisos/dinero.ts`. `AVANCES[3].avisos` del ejemplo no lleva el aviso de Hobart (técnica 24): la fase 5 decide si lo añade al ejemplo.
4. **La interfaz del avance (fase 6).** Lo que necesitan P4, P5, J2c, J2d y el diálogo de «Deshacer avance» ya existe:
   - `simular`, que en la app recibe `nuevoId` de `src/datos/ids.ts` y el catálogo de `leerCatalogo(db)` (`CatalogoApp` encaja con `CatalogosEnCopia`);
   - `errorDeDiasDeAvance` (el error bajo el campo de días), `diasHasta` (para «Otro…» con fecha de destino) y `DIAS_CON_AVISO` (el aviso ámbar de más de 90 días);
   - `personasNuevas`, para «Se añadirá «Trabajadores de Bree» a Personas y entidades»;
   - `guardarAvance`, `deshacerAvanceGuardado`, `puedeDeshacer`, `cambiosQueSePerderan` y `avanceDelMovimiento`;
   - `guardarEdicion` y las funciones de `edicion/`, que devuelven la misma referencia si nada cambia.

   Falta lo que arma la pantalla: los rótulos de P4 («con la feria», «(día 15)», «Venta de cerveza en Fornost», técnica 21) y las formas de fecha que siguen pendientes en `docs/decisiones.md` («viernes 13 de abril», «Abril de 1640 T.E.», «Del 12 al 19 de abril»). Y un aviso de rendimiento: `avisosEn` hace una previsión de hasta 366 días cada vez que se llama (técnica 16), así que Inicio, A1, la barra superior y P4 deberían calcularla **una vez por estado** y compartirla.
5. **Las previsiones (fases 4 y 6).** Los próximos 7 días, las marcas futuras del calendario, la previsión a 30 días, los días de reserva y las cantidades previstas de A7 salen de `recorrerDias` (sin avisos), con sus propios ids (`idsEnSerie('prev')`) y con `diasQueCaben` para no pasar del 31 de diciembre de 9999, igual que ya hace «Pago no cubierto».
6. **Reglas repartidas a otras fases (técnica 20).** «Saldo negativo en acciones manuales» (§6.4 l.803) → fase 7. «Contratar el mismo oficio para el mismo edificio y con el mismo salario suma a la fila» (§6.3 l.580) y «Eliminar asentamiento» → fase 8.
7. **El formato 1 sigue igual, y a partir de la fase 6 eso cuesta.** La fase 3 no subió `VERSION_FORMATO` ni añadió esquemas: solo endureció `EsquemaMovimiento` (un movimiento vinculado solo queda programado si es de obra, caravana o compra, técnica 7) y relajó tres comprobaciones de la validación (técnicas 4, 5 y 6). Se pudo porque todavía no hay partidas reales guardadas. Desde que la fase 6 guarde partidas de verdad, cualquier cambio así necesita su migración en `MIGRACIONES` (`copia/migraciones.ts`).
8. **Lo que la validación sigue sin comprobar a propósito.** Que las cajas, los `cobradoHasta` o las deudas de impago cuadren con lo que produciría el motor: validar una copia no ejecuta el motor. Lo vigilan las pruebas del motor y los invariantes de `motor/entregable.test.ts`, que cualquier fase que toque el motor tiene que mantener en verde.
9. **Rendimiento del motor.** La prueba de humo de la tarea 21 (5 asentamientos, 300 reglas y 5.000 movimientos durante 366 días en menos de 1 s) fija el techo de hoy. Si la fase 4, con la producción y el consumo, se acerca a él, el siguiente paso es una agenda por días en vez de preguntar `ocurreEl` a cada regla cada día (técnica 15).
10. **Decisiones.** La fase 3 dejó D-019 a D-042 (más las que añadiera la revisión final); la fase 4 sigue con el siguiente número libre. Siguen abiertos en «Pendientes» de `docs/decisiones.md`: «Interés de una deuda» (fase 5), «Formas de fecha que aún no existen» (fase 6), «Ocho casos límite» (fase 6) y «Dos anotaciones del canvas» (fase 8).

